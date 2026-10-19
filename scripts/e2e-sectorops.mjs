// Sector Ops (feature/sector-ops slice 2): the Warehouse in three sections (A12). One solo walk through every section
// (objective, connector cycle, the next section loading behind the far door) to the extraction and a Ghost result; an
// alarm with its reinforcements and a kill that breaks the Ghost; everyone down restarting the section at its
// checkpoint (M7); and the nav check (M8): every route leg is walkable for the guards' nav grid, and a section is
// reached only through its connector. `?sectorGuards=4` keeps software GL quick (4 guards per section).
import { launch, frames, press, BTN, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const PARAMS = 'autostart=warehouseOps&mode=sector&sectorGuards=4';
let failed = false;
const all = [];
async function run(params, fn) {
  const { browser, page, errors } = await launch({ url, params });
  const G = (f, a) => page.evaluate(f, a);
  // headless fast-forward (no rendering), in chunks so the page stays responsive
  const sim = async (s) => { for (let t = 0; t < s; t += 0.5) await G((d) => window.__app.loop.stepHeadless(d), Math.min(0.5, s - t)); await frames(page, 1); };
  try {
    await G(() => window.__pad.connect());
    await press(page, BTN.LS);
    await fn({ page, G, sim });
  } catch (e) {
    failed = true;
    console.error(String(e));
    await page.screenshot({ path: process.env.SHOT ?? '/tmp/e2e-sectorops-fail.png' });
  } finally {
    all.push(...errors);
    await browser.close();
  }
}

/** The sections as the page sees them (ids, kinds, exit boxes, the connectors' checkpoints). */
const sections = (G) =>
  G(() =>
    window.__app.current.world.map.sectors.map((s) => ({
      id: s.id,
      kind: s.objective.kind,
      obj: [s.objective.x, s.objective.y, s.objective.z],
      exit: (s.connector ?? s.extract).box,
      cp: s.connector ? s.connector.checkpoint : null,
      guards: s.guards.length,
    })),
  );

/** Teleport the local player (x, y, z). */
const tp = (G, x, y, z, yaw = 0) => G(([a, b, c, w]) => { const g = window.__app.current; const P = g.player.position.constructor; g.player.controller.teleport(new P(a, b, c), w); }, [x, y, z, yaw]);

console.log('sector ops: every section, ghost');
await run(PARAMS, async ({ page, G, sim }) => {
  await G(() => { const g = window.__app.current; g.target.damageMul = 0; g.enemyMgr.update = () => {}; if (g.security) g.security.fixedUpdate = () => {}; });
  await sim(0.5);
  const S = await sections(G);
  assert(S.length === 3, `the Warehouse has three sections (${S.length})`);
  const d0 = await G(() => window.__sector.debug());
  assert(d0.index === 0 && d0.phase === 'objective' && d0.live === 0, `the run starts on section 1's objective, its devices live (${JSON.stringify(d0)})`);
  assert(d0.doors.every((k) => k.near === null || (k.near === true && k.far === true)) && d0.doors[1].seal.every((x) => x === true), `every door into a later section starts locked (${JSON.stringify(d0.doors)})`);
  const cap = await G(() => window.__app.current.enemyMgr.maxAlive);
  assert(cap === 32, `Sector Ops raises the live cap (${cap})`);
  const alive0 = await G(() => window.__app.current.enemyMgr.alive);
  assert(alive0 === 4, `?sectorGuards=4: section 1 has 4 guards in (${alive0})`);
  for (let i = 0; i < S.length; i++) {
    const s = S[i];
    const last = i + 1 === S.length;
    // the exit does nothing before the objective (and the near door is locked)
    await tp(G, (s.exit[0] + s.exit[2]) / 2, 0, (s.exit[1] + s.exit[3]) / 2);
    await sim(1);
    const pre = await G(() => window.__sector.debug());
    assert(pre.index === i && pre.phase === 'objective', `section ${i + 1}: the exit does nothing before the objective`);
    if (!last) assert(pre.nearLocked === true, `section ${i + 1}: the near door is locked before the objective`);
    await G((id) => { const g = window.__app.current; const it = g.interactables.items.find((x) => x.id === `${id}-obj`); const p = it.pos.clone(); p.x += 0.9; g.player.controller.teleport(p, 0); }, s.id);
    await sim(0.4);
    if (s.kind === 'hack') {
      await G(() => window.__pad.set(0, 1));
      await sim(3.4);
      await G(() => window.__pad.set(0, 0));
    } else {
      await press(page, BTN.A);
      if (s.kind === 'download') await sim(10.5);
    }
    await sim(0.3);
    const ph = await G(() => window.__sector.debug());
    assert(ph.phase === (last ? 'extract' : 'connector'), `section ${i + 1} (${s.id}): the ${s.kind} opens the connector or the extraction (${ph.phase})`);
    if (last) {
      await tp(G, (s.exit[0] + s.exit[2]) / 2, 0, (s.exit[1] + s.exit[3]) / 2);
      await sim(1);
      assert((await G(() => window.__sector.debug().phase)) === 'done', 'the extraction ends the run');
      break;
    }
    assert(ph.nearLocked === false && ph.farLocked === true, `section ${i + 1}: the objective unlocks the near door only (${JSON.stringify(ph)})`);
    const before = await G(() => window.__app.current.enemyMgr.enemies.map((e) => e.id));
    // into the connector room: 1 s with everyone inside, the near door locks, the section unloads
    await tp(G, s.cp.x, s.cp.y, s.cp.z, s.cp.yaw);
    await sim(1.3);
    const cyc = await G(() => ({ d: window.__sector.debug(), n: window.__app.current.enemyMgr.enemies.length, b: window.__app.current.enemyMgr.bodies.length }));
    assert(cyc.d.conn === 'cycling' && cyc.d.nearLocked === true && cyc.n === 0 && cyc.b === 0 && cyc.d.live === -1, `section ${i + 1}: the cycle locks the near door and unloads guards, bodies and devices (${JSON.stringify(cyc)})`);
    // the cycle loads the next section and opens the far door (the cycle runs SECTOR.connectorCycle 3 s from the lock)
    await sim(3.2);
    const nx = await G(() => ({ d: window.__sector.debug(), ids: window.__app.current.enemyMgr.enemies.map((e) => e.id), alive: window.__app.current.enemyMgr.alive }));
    assert(nx.d.index === i + 1 && nx.d.phase === 'objective' && nx.d.live === i + 1, `section ${i + 2} starts at the connector (${JSON.stringify(nx.d)})`);
    assert(nx.d.doors[i].far === false && nx.d.doors[i].seal.every((x) => x === false), `section ${i + 1}: the far door (and its side door) unlocked (${JSON.stringify(nx.d.doors[i])})`);
    assert(nx.alive === 4 && !nx.ids.some((id) => before.includes(id)), `section ${i + 2}'s guards are in, none of section ${i + 1}'s (${nx.alive})`);
    assert(Math.abs(nx.d.checkpoint.x - s.cp.x) < 0.01 && Math.abs(nx.d.checkpoint.z - s.cp.z) < 0.01, 'the connector is the checkpoint');
    const cams = await G(() => window.__ctdev.debug().cams);
    assert(cams.filter((c) => c.live).length > 0 && cams.filter((c) => !c.live).every((c) => c.mode === 'off'), `only the live section's cameras work (${JSON.stringify(cams.map((c) => [c.id, c.live, c.mode]))})`);
  }
  await sim(6);
  await page.waitForSelector('.results-screen', { timeout: 15000 });
  const res = await G(() => ({ t: document.querySelector('.results-title')?.textContent, s: document.querySelector('.results-sub')?.textContent ?? '' }));
  assert(res.t === 'VICTORY' && /Time \d+:\d\d/.test(res.s) && /Kills 0/.test(res.s) && /Spotted 0/.test(res.s) && /GHOST/.test(res.s), `the result: time, kills, spotted, Ghost ("${res.s}")`);
});

console.log('sector ops: alarm and no ghost');
await run(PARAMS, async ({ G, sim }) => {
  await G(() => { window.__app.current.target.damageMul = 0; });
  await sim(0.5);
  const a = await G(() => { const m = window.__sector; m.onAlarm(); return m.debug(); });
  assert(a.stage === 1 && a.reinforced === 2, `an alarm raises the stage and sends the section's guards in (${JSON.stringify(a)})`);
  await sim(1);
  const hunting = await G(() => window.__app.current.enemyMgr.enemies.filter((e) => e.alive && e.alerted).length);
  assert(hunting >= 2, `the reinforcements come in hunting (${hunting})`);
  const k = await G(() => { const g = window.__app.current; const e = g.enemyMgr.enemies.find((q) => q.alive); e.applyDamage({ amount: 9999, point: e.pos.clone(), dir: e.pos.clone().normalize(), part: 'head', kind: 'bullet', attackerTeam: 'player', attackerId: 'local', sourcePos: g.player.position.clone(), impulse: 1 }); return window.__sector.debug(); });
  assert(k.ghost === false && /Kills 1/.test(k.line), `a kill breaks the ghost (${k.line})`);
});

console.log('sector ops: down in section 2 restarts it at the checkpoint');
await run(PARAMS, async ({ page, G, sim }) => {
  await G(() => { const g = window.__app.current; g.target.damageMul = 0; g.enemyMgr.update = () => {}; if (g.security) g.security.fixedUpdate = () => {}; });
  await sim(0.5);
  const S = await sections(G);
  // section 1: its objective (cut short: the run is told it is done) and its connector
  await G(() => { const m = window.__sector; m.run.downloading = true; m.run.download(999); });
  await sim(0.3);
  await tp(G, S[0].cp.x, S[0].cp.y, S[0].cp.z, S[0].cp.yaw);
  await sim(4.6);
  const d1 = await G(() => window.__sector.debug());
  assert(d1.index === 1 && d1.phase === 'objective', `into section 2 (${JSON.stringify(d1)})`);
  const startIds = await G(() => window.__app.current.enemyMgr.enemies.map((e) => e.id));
  // section 2: an alarm, the objective taken, a guard knocked out; then the player goes down
  await G(() => window.__sector.onAlarm());
  await G((id) => { const g = window.__app.current; const it = g.interactables.items.find((x) => x.id === `${id}-obj`); const p = it.pos.clone(); p.x += 0.9; g.player.controller.teleport(p, 0); }, S[1].id);
  await sim(0.4);
  await press(page, BTN.A);
  await sim(0.4);
  const mid = await G(() => window.__sector.debug());
  assert(mid.phase === 'connector' && mid.stage === 1 && mid.nearLocked === false, `section 2: objective done, alarm 1, near door open (${JSON.stringify(mid)})`);
  await G(() => { const g = window.__app.current; g.target.damageMul = 1; g.target.applyDamage({ amount: 99999, point: g.player.position.clone(), dir: new g.player.position.constructor(0, 0, 1), part: 'body', kind: 'bullet', attackerTeam: 'enemy', attackerId: 'test', sourcePos: g.player.position.clone(), impulse: 1 }); });
  await sim(0.5);
  assert((await G(() => window.__app.current.target.alive)) === false, 'the solo player is down');
  await sim(3.5);
  const r = await G(() => {
    const g = window.__app.current;
    const it = g.interactables.items.find((x) => x.id === 'racking-obj');
    return { d: window.__sector.debug(), alive: g.target.alive, at: [g.player.position.x, g.player.position.z], ids: g.enemyMgr.enemies.map((e) => e.id), n: g.enemyMgr.alive, obj: !!it && it.enabled && !it.done };
  });
  assert(r.d.restarts === 1 && r.d.index === 1 && r.d.phase === 'objective', `the run restarts section 2 (${JSON.stringify(r.d)})`);
  assert(r.alive && Math.hypot(r.at[0] - S[0].cp.x, r.at[1] - S[0].cp.z) < 1.5, `the player respawns at C2's checkpoint (${r.at})`);
  assert(r.d.stage === 0 && r.d.nearLocked === true, `the alarm is back to the section's start, the near door locked again (${r.d.stage}, ${r.d.nearLocked})`);
  assert(r.obj, 'the objective is open again');
  assert(r.n === 4 && !r.ids.some((id) => startIds.includes(id)), `the section's guards are reset to its set (${r.n})`);
});

console.log('sector ops: nav (M8 routes, sealed sections)');
await run(PARAMS, async ({ G, sim }) => {
  await sim(0.3);
  const out = await G(() => {
    const g = window.__app.current;
    const nav = g.nav;
    const S = g.world.map.sectors;
    const legs = [];
    const fails = [];
    // (a nav waypoint is an [x, z] pair)
    const len = (from, wps) => { let l = 0; let p = from; for (const w of wps) { l += Math.hypot(w[0] - p[0], w[1] - p[1]); p = [w[0], w[1]]; } return l; };
    for (const s of S) {
      for (const r of s.routes) {
        for (let i = 0; i + 1 < r.pts.length; i++) {
          if ((r.climbs ?? []).includes(i)) continue;
          const a = r.pts[i];
          const b = r.pts[i + 1];
          const ay = a[2] ?? 0;
          const by = b[2] ?? 0;
          const p = nav.findPath([a[0], a[1]], [b[0], b[1]], 40000, ay, by);
          const straight = Math.hypot(b[0] - a[0], b[1] - a[1]);
          legs.push(1);
          if (!p) fails.push(`${s.id} / ${r.name} leg ${i}: no path ${JSON.stringify(a)} -> ${JSON.stringify(b)}`);
          else if (len([a[0], a[1]], p) > straight * 2.5 + 6) fails.push(`${s.id} / ${r.name} leg ${i}: a detour (${len([a[0], a[1]], p).toFixed(1)} m for ${straight.toFixed(1)} m)`);
        }
      }
    }
    // sealed: the only way into a section is its connector room. A path from a section's start to the next section's
    // objective exists; with the connector room's cells made unwalkable (every layer) none is left (any leak would
    // show: a gap, a window, a ladder or drop link, a way round through the yard)
    const seals = [];
    for (let i = 0; i + 1 < S.length; i++) {
      const a = S[i].start;
      const o = S[i + 1].objective;
      const open = nav.findPath([a.x, a.z], [o.x, o.z], 200000, a.y, o.y);
      const bx = S[i].connector.box;
      const [x0, z0, x1, z1] = [Math.min(bx[0], bx[2]) - 0.2, Math.min(bx[1], bx[3]) - 0.2, Math.max(bx[0], bx[2]) + 0.2, Math.max(bx[1], bx[3]) + 0.2];
      const saved = [];
      for (let c = 0; c < nav.walk.length; c++) {
        const [x, z] = nav.center(c);
        if (x >= x0 && x <= x1 && z >= z0 && z <= z1 && nav.walk[c]) {
          saved.push(c);
          nav.walk[c] = 0;
        }
      }
      // (the start may stand in the previous connector, never in this one)
      const shut = nav.findPath([a.x, a.z], [o.x, o.z], 200000, a.y, o.y);
      for (const c of saved) nav.walk[c] = 1;
      seals.push({ from: S[i].id, to: S[i + 1].id, path: !!open, blocked: saved.length, leak: shut ? shut.map((w) => `${w[0]},${w[1]}`).join(' ') : null });
    }
    // and each section's objective and exit from its start
    const reach = S.map((s) => {
      const ex = (s.connector ?? s.extract).box;
      const toObj = nav.findPath([s.start.x, s.start.z], [s.objective.x, s.objective.z], 60000, s.start.y, s.objective.y);
      const toExit = nav.findPath([s.objective.x, s.objective.z], [(ex[0] + ex[2]) / 2, (ex[1] + ex[3]) / 2], 60000, s.objective.y, 0);
      return { id: s.id, obj: !!toObj, exit: !!toExit };
    });
    return { legs: legs.length, fails, seals, reach };
  });
  console.log(`  ${out.legs} route legs checked`);
  for (const f of out.fails) console.log(`  ${f}`);
  assert(out.fails.length === 0, `every walked route leg has a nav path (${out.fails.length} failed)`);
  assert(out.reach.every((r) => r.obj && r.exit), `each section's objective and exit are reachable from its start (${JSON.stringify(out.reach)})`);
  assert(out.seals.every((s) => s.path && s.blocked > 0 && s.leak === null), `a section is reached only through its connector (${JSON.stringify(out.seals)})`);
});

// (optional, `SECTOR_SHOTS=<dir>`) layout shots for Michael: section 1's start, C2 from inside, section 3 from the deck.
// Software GL: layout only, never a visual verdict.
if (process.env.SECTOR_SHOTS) {
  console.log('sector ops: layout shots');
  await run(PARAMS, async ({ page, G, sim }) => {
    const dir = process.env.SECTOR_SHOTS;
    await G(() => { const g = window.__app.current; g.target.damageMul = 0; g.enemyMgr.update = () => {}; if (g.security) g.security.fixedUpdate = () => {}; });
    await sim(0.5);
    const S = await sections(G);
    const shot = async (name, x, y, z, yaw, pitch) => {
      await tp(G, x, y, z, yaw);
      await G(([w, p]) => { const c = window.__app.current.player.cam; c.yaw = w; c.pitch = p; }, [yaw, pitch]);
      await sim(0.3);
      await frames(page, 12);
      await page.screenshot({ path: `${dir}/step2-${name}.jpg`, type: 'jpeg', quality: 80 });
    };
    await shot('s1-start', -14.5, 0, -24, 0.35, 0.05);
    await shot('c2-inside', -14.5, 0, -7.6, 0, 0.1);
    // through sections 1 and 2 (the objectives told done, the connectors cycled) onto the deck
    for (let i = 0; i < 2; i++) {
      await G(() => { const m = window.__sector; if (m.run.current.objective.kind === 'download') { m.run.downloading = true; m.run.download(999); } else m.run.objectiveDone(); });
      await sim(0.3);
      await tp(G, S[i].cp.x, S[i].cp.y, S[i].cp.z, S[i].cp.yaw);
      await sim(4.6);
    }
    await shot('s3-deck', 16, 2.6, 13.4, Math.PI, 0.3);
  });
}

console.log(all.length ? 'console problems:\n' + all.join('\n') : 'no console errors');
process.exit(failed || all.length ? 1 : 0);
