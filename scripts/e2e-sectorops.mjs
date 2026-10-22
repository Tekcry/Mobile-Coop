// Sector Ops (feature/sector-ops slice 2): the Warehouse in three sections (A12). One solo walk through every section
// (objective, connector cycle, the next section loading behind the far door) to the extraction and a Ghost result; an
// alarm with its reinforcements and a kill that breaks the Ghost; everyone down restarting the section at its
// checkpoint (M7); and the nav check (M8): every route leg is walkable for the guards' nav grid, and a section is
// reached only through its connector. `?sectorGuards=4` keeps software GL quick (4 guards per section).
import { launch, frames, press, BTN, assert } from './e2e-lib.mjs';
import { until, hostAndJoin, waitSim, teamLog } from './e2e-net-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const PARAMS = 'autostart=warehouseOps&mode=sector&sectorGuards=4';
// (sector-fixes-r RE) `--part=N` runs one group (the runner runs them as parallel jobs, like e2e-ctcourse): 1 the
// sections, alarms, restarts, nav and the co-op mirror (the suite before slice R); 2 solo: the co-op lips out of reach
// alone, the engine links the routes rely on (pipe jumps, crouch-walk, climb-ups), the ways down alone, every team door;
// 3-5 two pages: section 1, 2, 3's co-op routes walked by host and client (leg-up, relay / rope) and its team door
// unbolted by the client for both pages, re-bolted by a restart. Named alone the suite runs every part in sequence.
const PART = Number(process.argv.find((a) => a.startsWith('--part='))?.slice(7) ?? 0);
const want = (n) => PART === 0 || PART === n;
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
      seals: (s.connector?.sealUnlocks ?? []).length,
    })),
  );

/** Teleport the local player (x, y, z). */
const tp = (G, x, y, z, yaw = 0) => G(([a, b, c, w]) => { const g = window.__app.current; const P = g.player.position.constructor; g.player.controller.teleport(new P(a, b, c), w); }, [x, y, z, yaw]);

if (want(1)) {
console.log('sector ops: every section, ghost');
await run(PARAMS, async ({ page, G, sim }) => {
  await G(() => { const g = window.__app.current; g.target.damageMul = 0; g.enemyMgr.update = () => {}; if (g.security) g.security.fixedUpdate = () => {}; });
  await sim(0.5);
  const S = await sections(G);
  assert(S.length === 3, `the Warehouse has three sections (${S.length})`);
  const d0 = await G(() => window.__sector.debug());
  assert(d0.index === 0 && d0.phase === 'objective' && d0.live === 0, `the run starts on section 1's objective, its devices live (${JSON.stringify(d0)})`);
  assert(d0.doors.every((k) => k.near === null || (k.near === true && k.far === true)) && d0.doors[1].seal.length > 0 && d0.doors[1].seal.every((x) => x === true), `every door into a later section starts locked (${JSON.stringify(d0.doors)})`);
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
    // (fix round) a knocked-out guard leaves a body, so the unload below really removes one (a KO keeps the Ghost, A4)
    await G(() => { const g = window.__app.current; const e = g.enemyMgr.enemies.find((q) => q.alive); e.knockOut({ amount: 9999, point: e.pos.clone(), dir: e.pos.clone().normalize(), part: 'body', kind: 'melee', attackerTeam: 'player', attackerId: 'local', sourcePos: g.player.position.clone(), impulse: 1 }); });
    await sim(0.2);
    const nb = await G(() => window.__app.current.enemyMgr.bodies.length);
    assert(nb >= 1, `section ${i + 1}: a knocked-out guard lies there before the cycle (${nb} bodies)`);
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
    assert(nx.d.doors[i].far === false && nx.d.doors[i].seal.length === s.seals && nx.d.doors[i].seal.every((x) => x === false), `section ${i + 1}: the far door (and its side door) unlocked (${JSON.stringify(nx.d.doors[i])})`);
    assert(nx.alive === 4 && !nx.ids.some((id) => before.includes(id)), `section ${i + 2}'s guards are in, none of section ${i + 1}'s (${nx.alive})`);
    assert(Math.abs(nx.d.checkpoint.x - s.cp.x) < 0.01 && Math.abs(nx.d.checkpoint.z - s.cp.z) < 0.01, 'the connector is the checkpoint');
    const cams = await G(() => window.__ctdev.debug().cams);
    assert(cams.filter((c) => c.live).length > 0 && cams.filter((c) => !c.live).every((c) => c.mode === 'off'), `only the live section's cameras work (${JSON.stringify(cams.map((c) => [c.id, c.live, c.mode]))})`);
  }
  await sim(6);
  await page.waitForSelector('.results-screen', { timeout: 15000 });
  const res = await G(() => ({ t: document.querySelector('.results-title')?.textContent, s: document.querySelector('.results-sub')?.textContent ?? '' }));
  assert(res.t === 'VICTORY' && /Time \d+:\d\d/.test(res.s) && /Kills 0/.test(res.s) && /Spotted 0/.test(res.s) && /GHOST/.test(res.s), `the result: time, kills, spotted, Ghost ("${res.s}")`);
  // (step 3, M7) the run's difficulty star is saved (kv `sector:ops`) with a best time, and the op list shows it filled
  const diff = await G(() => window.__app.current.opts.difficulty ?? 'normal');
  const di = ['rookie', 'normal', 'realistic', 'perfectionist'].indexOf(diff);
  const readRec = () => G(() => new Promise((ok) => {
    const r = indexedDB.open('shoulder-strike');
    r.onsuccess = () => {
      try {
        const q = r.result.transaction('kv').objectStore('kv').get('sector:ops');
        q.onsuccess = () => ok(q.result?.ops?.warehouseOps ?? null);
        q.onerror = () => ok(null);
      } catch {
        ok(null);
      }
    };
    r.onerror = () => ok(null);
  }));
  let rec = null;
  for (let k = 0; k < 20 && !rec?.done?.includes(diff); k++) {
    rec = await readRec();
    if (!rec?.done?.includes(diff)) await new Promise((r) => setTimeout(r, 250));
  }
  assert(di >= 0 && rec?.done?.includes(diff) && rec.best?.[diff] > 0, `the op's ${diff} star is saved with a best time (${JSON.stringify(rec)})`);
  await G(() => document.querySelector('.results-screen [data-key="quit"]').click());
  await page.waitForSelector('.main-menu [data-key="sectorops"]', { timeout: 30000 });
  await G(() => document.querySelector('.main-menu [data-key="sectorops"]').click());
  await page.waitForSelector('.sectorops-screen [data-op="warehouseOps"]');
  let op = null;
  for (let k = 0; k < 20 && op?.stars?.[di] !== '1'; k++) {
    await frames(page, 2);
    op = await G(() => { const b = document.querySelector('.sectorops-screen [data-op="warehouseOps"]'); return { stars: b.dataset.stars, ctr: b.querySelector('.ms-ctr')?.textContent ?? '', ctx: b.dataset.ctx ?? '' }; });
  }
  assert(op.stars[di] === '1' && op.ctr[di] === '★' && /best \d+:\d\d/.test(op.ctx), `the op list shows the ${diff} star filled and its best time (${JSON.stringify(op)})`);
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

// (fix round, checker item 1) the AI on in section 2: a guard forced alerted runs to the live section's alarm panel (the
// only one working) and the stage rises through the panel (not a direct onAlarm call); after a restart the panel and
// the alarm are armed again and a second panel alarm works.
console.log('sector ops: a guard raises the live section\'s alarm panel, again after a restart');
await run(PARAMS, async ({ page, G, sim }) => {
  await G(() => { const g = window.__app.current; g.target.damageMul = 0; if (g.security) g.security.fixedUpdate = () => {}; if (window.__ctdev) window.__ctdev.fixedUpdate = () => {}; });
  await sim(0.5);
  const S = await sections(G);
  await G(() => { const m = window.__sector; m.run.downloading = true; m.run.download(999); });
  await sim(0.3);
  await tp(G, S[0].cp.x, S[0].cp.y, S[0].cp.z, S[0].cp.yaw);
  await sim(4.6);
  const d1 = await G(() => window.__sector.debug());
  assert(d1.index === 1 && d1.phase === 'objective', `into section 2 (${JSON.stringify(d1)})`);
  const panels = () => G(() => window.__app.current.enemyMgr.alarms.map((p) => ({ id: p.id, s: p.section, off: p.disabled })));
  const p1 = await panels();
  assert(p1.length === 3 && p1.every((p) => (p.s === 1 ? !p.off : p.off)), `only section 2's panel works (${JSON.stringify(p1)})`);
  const panelAlarm = async (tag) => {
    const st0 = await G(() => window.__sector.debug().stage);
    const raised0 = await G(() => window.__app.current.enemyMgr.alarmRaised);
    assert(raised0 === false, `${tag}: the panel alarm is armed`);
    // the guard nearest the live panel is forced alerted (the e2e-stealth-ai way)
    await G(() => {
      const em = window.__app.current.enemyMgr;
      const p = em.alarms.find((q) => q.section === 1);
      let best = null;
      let bd = 1e9;
      for (const e of em.enemies) {
        if (!e.alive) continue;
        const d = Math.hypot(e.pos.x - p.x, e.pos.z - p.z);
        if (d < bd) {
          bd = d;
          best = e;
        }
      }
      best.alert();
    });
    let runner = null;
    for (let k = 0; k < 12 && !runner; k++) {
      await sim(0.5);
      runner = await G(() => { const e = window.__app.current.enemyMgr.enemies.find((q) => q.alive && q.alarm); return e ? { id: e.id, panel: e.alarm.id, s: e.alarm.section } : null; });
    }
    assert(runner && runner.s === 1, `${tag}: an alerted guard runs to section 2's panel (${JSON.stringify(runner)})`);
    let raised = false;
    for (let k = 0; k < 80 && !raised; k++) {
      await sim(0.5);
      raised = await G(() => window.__app.current.enemyMgr.alarmRaised);
    }
    const d = await G(() => window.__sector.debug());
    assert(raised && d.stage === st0 + 1, `${tag}: the panel raises the alarm stage (${st0} -> ${d.stage}, raised ${raised})`);
  };
  await panelAlarm('section 2');
  // (marlow-bays item 3) the restart from the pause menu: "Restart at checkpoint", a confirm opening on Stay, then Restart
  await G(() => window.__app.current.pause());
  await frames(page, 3);
  const prow = await G(() => { const b = document.querySelector('.pause-screen [data-key="restart-checkpoint"]'); return b ? { blocked: b.classList.contains('blocked') } : null; });
  assert(!!prow && !prow.blocked, `solo Sector Ops pause has a live "Restart at checkpoint" (${JSON.stringify(prow)})`);
  await G(() => { const b = document.querySelector('.pause-screen [data-key="restart-checkpoint"]'); window.__app.nav.focus(b); b.click(); });
  await frames(page, 3);
  const dlg = await G(() => ({ top: !!window.__app.screens.top?.el.classList.contains('dialog-screen'), f: window.__app.nav.focused?.textContent ?? '' }));
  assert(dlg.top && /Stay/.test(dlg.f), `the restart confirm opens on Stay (${JSON.stringify(dlg)})`);
  await G(() => [...document.querySelectorAll('.dialog-buttons .btn')].find((b) => /Restart/.test(b.textContent)).click());
  await frames(page, 3);
  assert(await G(() => !window.__app.current.paused && !document.querySelector('.pause-screen')), 'Restart closes the pause menu');
  await sim(1.5);
  const d2 = await G(() => ({ d: window.__sector.debug(), raised: window.__app.current.enemyMgr.alarmRaised }));
  assert(d2.d.index === 1 && d2.d.restarts === 1 && d2.raised === false, `the restart re-arms the panel alarm (${JSON.stringify(d2)})`);
  const p2 = await panels();
  assert(p2.every((p) => (p.s === 1 ? !p.off : p.off)), `after the restart only section 2's panel works (${JSON.stringify(p2)})`);
  await panelAlarm('after the restart');
});

// (sector-restart, M9) a checkpoint restart is a clean start. Section 1 goes wrong (every guard alerted, an alarm and its
// reinforcements, the alert music, the guns nearly empty, the gadgets used, the player hurt, then down); after the
// restart every guard is calm with the manager's memory clear, the guns are full and suppressed, health is full and the
// music is Calm. Then one suppressed shot far from the guards (> 15 m, no line of sight) alerts nobody and leaves the
// alarm stage where it was. The cameras are held (their alarms are not this check's); the AI runs.
console.log('sector ops: a restart is a clean start; a suppressed shot after it alerts nobody');
await run(PARAMS, async ({ G, sim }) => {
  await G(() => { const g = window.__app.current; if (g.security) g.security.fixedUpdate = () => {}; if (window.__ctdev) window.__ctdev.fixedUpdate = () => {}; });
  await sim(0.5);
  const kit = () =>
    G(() => {
      const g = window.__app.current;
      const w = g.weapons;
      return {
        slots: w.slots.map((s) => ({ id: s.def.id, size: s.stats.magSize, mag: s.mag, res: s.reserve, noise: s.stats.noise })),
        cur: w.current.stats.noise,
        gad: { ...w.gadgets.counts },
        hp: g.target.health.hp,
        max: g.target.health.maxHp,
        alive: g.target.alive,
        music: window.__app.music.state,
      };
    });
  const k0 = await kit();
  assert(k0.slots.length >= 1 && k0.slots.every((s) => s.mag === s.size), `the kit starts with full magazines (${JSON.stringify(k0.slots)})`);
  assert(k0.slots.every((s) => s.noise <= 0.6), `every gun of the Sector Ops kit is suppressed, the rifle too (A2) (${JSON.stringify(k0.slots)})`);
  // the section goes wrong
  const bad = await G(() => {
    const g = window.__app.current;
    for (const e of g.enemyMgr.enemies) if (e.alive) e.alert();
    window.__sector.onAlarm();
    const m = window.__app.music;
    m.score.director.update((window.__app.audio.ctx?.currentTime ?? 0) + 0.5, 'alert');
    for (const s of g.weapons.slots) {
      s.mag = 1;
      s.reserve = 2;
    }
    const gc = g.weapons.gadgets.counts;
    for (const id of Object.keys(gc)) gc[id] = 0;
    g.target.damageMul = 1;
    const P = g.player.position.constructor;
    g.target.applyDamage({ amount: 30, point: g.player.position.clone(), dir: new P(0, 0, 1), part: 'body', kind: 'bullet', attackerTeam: 'enemy', attackerId: 'test', sourcePos: g.player.position.clone(), impulse: 1 });
    return { music: m.state, alerted: g.enemyMgr.enemies.filter((e) => e.alive && e.alerted).length, hp: g.target.health.hp, stage: window.__sector.debug().stage };
  });
  assert(bad.music === 'alert' && bad.alerted >= 4 && bad.stage === 1 && bad.hp < k0.max, `before the restart: guards alerted, alarm 1, alert music, the player hurt (${JSON.stringify(bad)})`);
  // the guards hunt a moment (sightings, the last known position), then the player goes down
  await sim(1);
  await G(() => { const g = window.__app.current; const P = g.player.position.constructor; g.target.applyDamage({ amount: 99999, point: g.player.position.clone(), dir: new P(0, 0, 1), part: 'body', kind: 'bullet', attackerTeam: 'enemy', attackerId: 'test', sourcePos: g.player.position.clone(), impulse: 1 }); });
  await sim(0.5);
  assert((await G(() => window.__app.current.target.alive)) === false, 'the solo player is down');
  // the restart (2.5 s after the down): stepped finely so the guards are read as they load
  let r = null;
  for (let k = 0; k < 40 && !r; k++) {
    await G(() => window.__app.loop.stepHeadless(0.1));
    r = await G(() => {
      const d = window.__sector.debug();
      if (d.restarts < 1) return null;
      const em = window.__app.current.enemyMgr;
      const gs = em.enemies.filter((e) => e.alive);
      return {
        d,
        n: gs.length,
        levels: gs.map((e) => e.level),
        fought: gs.filter((e) => e.aware.fought).length,
        lkp: em.lkpValid,
        raised: em.alarmRaised,
        flanker: em.flanker !== null,
        hunting: em.hunting,
        bodies: em.bodies.length,
      };
    });
  }
  assert(r, 'the section restarts');
  assert(r.n === 4 && r.levels.every((l) => l === 'unaware') && r.fought === 0, `every guard loads unaware on its route (${JSON.stringify(r.levels)}, fought ${r.fought})`);
  assert(!r.lkp && !r.raised && !r.flanker && !r.hunting && r.bodies === 0 && r.d.stage === 0 && r.d.pending === 0, `the guards' memory is clear: no last known position, no alarm, stage 0, no reinforcements (${JSON.stringify(r)})`);
  await sim(0.6);
  const k1 = await kit();
  assert(k1.alive && k1.hp === k1.max, `the player is back at full health (${k1.hp} / ${k1.max})`);
  assert(k1.slots.every((s, i) => s.mag === s.size && s.res === k0.slots[i].res), `every gun is reloaded, its reserve as the section began (${JSON.stringify(k1.slots)})`);
  assert(k1.cur <= 0.6, `the gun in hand is suppressed (noise ${k1.cur})`);
  assert(JSON.stringify(k1.gad) === JSON.stringify(k0.gad), `the gadgets are back (${JSON.stringify(k1.gad)})`);
  assert(k1.music === 'calm', `the music is Calm again (${k1.music})`);
  // (check fix, polish 2 and 3) the shot spot discriminates: every guard's whole path (its post, its route's segments
  // and where it stands now) stays beyond a suppressed shot's reach, and the nearest guard's whole path inside a loud
  // shot's reach (guard-ai S1: within earshot, but beyond the loud shot's combat reach, so it alerts nobody either; the
  // control below fires it close to the guard); no point of any guard's path has a line of sight to the spot.
  // The reaches come from the game's table (`GameState.NOISE`): suppressed at most shot x suppressed (16.8 m), loud
  // shot x 1 (28 m); the band keeps a margin each side.
  const spot = await G(() => {
    const g = window.__app.current;
    const N = g.constructor.NOISE;
    const lo = N.shot * N.suppressed + 1.2;
    const hi = N.shot - 2;
    const P = g.player.position.constructor;
    const nav = g.nav;
    const gs = g.enemyMgr.enemies.filter((e) => e.alive);
    const slots = g.world.map.sectors[0].guards.slice(0, gs.length);
    // each guard's path: its route (or its post) as segments, plus where it stands now
    const paths = slots.map((s, i) => {
      const pts = (s.route && s.route.length ? s.route : [[s.x, s.z]]).map((p) => [p[0], p[1]]);
      const e = gs[i];
      if (e) pts.push([e.pos.x, e.pos.z]);
      return pts;
    });
    const segDist = (x, z, a, b) => {
      const dx = b[0] - a[0];
      const dz = b[1] - a[1];
      const l2 = dx * dx + dz * dz;
      const t = l2 > 0 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2)) : 0;
      return Math.hypot(a[0] + dx * t - x, a[1] + dz * t - z);
    };
    // nearest and farthest distance from (x, z) to a path (the farthest is at a vertex)
    const near = (x, z, pts) => {
      let d = Math.hypot(pts[0][0] - x, pts[0][1] - z);
      for (let k = 0; k + 1 < pts.length; k++) d = Math.min(d, segDist(x, z, pts[k], pts[k + 1]));
      for (const p of pts) d = Math.min(d, Math.hypot(p[0] - x, p[1] - z));
      return d;
    };
    const far = (x, z, pts) => Math.max(...pts.map((p) => Math.hypot(p[0] - x, p[1] - z)));
    // sight samples along every path, every 1 m, at a guard's eye height
    const samples = [];
    for (const pts of paths) {
      for (let k = 0; k < pts.length; k++) {
        const a = pts[k];
        const b = pts[k + 1] ?? a;
        const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])));
        for (let j = 0; j <= n; j++) samples.push([a[0] + ((b[0] - a[0]) * j) / n, a[1] + ((b[1] - a[1]) * j) / n]);
      }
    }
    const looker = gs[0];
    const eye = new P();
    const to = new P();
    for (let c = 0; c < nav.walk.length; c++) {
      if (!nav.isWalkable(c) || Math.abs(nav.height[c]) > 0.3) continue;
      const [x, z] = nav.center(c);
      let ni = -1;
      let nd = 1e9;
      let ok = true;
      for (let i = 0; i < paths.length && ok; i++) {
        const d = near(x, z, paths[i]);
        if (d < lo) ok = false;
        else if (d < nd) {
          nd = d;
          ni = i;
        }
      }
      if (!ok || ni < 0 || far(x, z, paths[ni]) > hi) continue;
      to.set(x, nav.height[c] + 1.4, z);
      let seen = false;
      for (const s of samples) {
        eye.set(s[0], 1.6, s[1]);
        if (looker.losTo(eye, to, 0.3)) {
          seen = true;
          break;
        }
      }
      if (seen) continue;
      return { x, y: nav.height[c], z, nearest: gs[ni].id, near: nd, far: far(x, z, paths[ni]), lo, hi };
    }
    return null;
  });
  assert(spot, 'a spot exists with the nearest guard\'s path between the suppressed and the loud reach, out of every guard\'s sight');
  await tp(G, spot.x, spot.y, spot.z, 0);
  await sim(0.5);
  const s0 = await G(() => ({ stage: window.__sector.debug().stage, raised: window.__app.current.enemyMgr.alarmRaised, calm: window.__app.current.enemyMgr.enemies.filter((e) => e.alive && !e.turning && (e.level === 'unaware' || e.level === 'cooldown')).map((e) => e.id) }));
  const shot = await G(() => {
    const w = window.__app.current.weapons;
    const s = w.current;
    const m0 = s.mag;
    // the gun's own shot (the round, the impact, the shot noise through GameState's onShot hook)
    w.shoot();
    return { fired: m0 - s.mag, noise: s.stats.noise, id: s.def.id };
  });
  assert(shot.fired === 1 && shot.noise <= 0.6, `one suppressed shot fired (${JSON.stringify(shot)}) at ${JSON.stringify(spot)}`);
  // (guard-ai S1 check fix 3) the spot is beyond the suppressed reach of every guard's path: no guard calm before the
  // shot even turns to it (alerting nobody is not enough: the loud shot below alerts nobody either), so this pins the
  // suppressed reach on its own
  await sim(0.3);
  const turned = await G((calm) => {
    const em = window.__app.current.enemyMgr;
    return em.enemies.filter((e) => e.alive && calm.includes(e.id) && (e.turning || e.level === 'suspicious' || e.level === 'investigating')).map((e) => `${e.id} ${e.level}`);
  }, s0.calm);
  assert(turned.length === 0, `no guard turns to the suppressed shot (${JSON.stringify(turned)}; ${s0.calm.length} calm before it)`);
  await sim(3.7);
  const after = await G(() => {
    const em = window.__app.current.enemyMgr;
    const gs = em.enemies.filter((e) => e.alive);
    return { alerted: gs.filter((e) => e.alerted).length, levels: gs.map((e) => e.level), stage: window.__sector.debug().stage, raised: em.alarmRaised, lkp: em.lkpValid, music: window.__app.music.state };
  });
  assert(after.alerted === 0 && !after.lkp, `no guard is alerted by the suppressed shot (${JSON.stringify(after.levels)})`);
  assert(after.stage === s0.stage && after.raised === s0.raised, `the alarm stage is unchanged (${s0.stage} -> ${after.stage})`);
  assert(after.music !== 'alert', `the music stays out of Alert (${after.music})`);
  // (guard-ai S1) hearing tiers: loud gunfire is combat only inside a quarter of its reach (`HEARING.combatDb`, 28 m ->
  // ~7 m), farther it sends one guard to look or only turns heads. So the same gun unsuppressed at this spot (every
  // guard's path beyond the suppressed reach, out of sight) alerts nobody either...
  const loud = await G(() => {
    const w = window.__app.current.weapons;
    const s = w.current;
    const n0 = s.stats.noise;
    s.stats.noise = 1;
    w.shoot();
    s.stats.noise = n0;
    return n0;
  });
  await sim(0.5);
  const farShot = await G(() => {
    const em = window.__app.current.enemyMgr;
    const gs = em.enemies.filter((q) => q.alive);
    return { alerted: gs.filter((q) => q.alerted).length, levels: gs.map((q) => q.level) };
  });
  assert(farShot.alerted === 0, `a loud shot this far off (>= ${spot.lo.toFixed(1)} m) alerts nobody: it is out of combat reach (${JSON.stringify(farShot.levels)}, noise back to ${loud})`);
  // ...and the control: the loud report from just behind the nearest guard (0.35 of the combat reach: combat even
  // through a wall) puts him in combat, so the suppressed check above could fail
  const near = await G((id) => {
    const g = window.__app.current;
    const em = g.enemyMgr;
    const e = em.enemies.find((q) => q.id === id);
    if (!e) return null;
    const q = g.constructor.NOISE.shot * Math.pow(10, -em.hearingTable.combatDb / 20);
    const d = 0.35 * q;
    const x = e.pos.x - Math.sin(e.yaw) * d;
    const z = e.pos.z - Math.cos(e.yaw) * d;
    const c = g.nav.nearestWalkable(x, z, 2, e.pos.y);
    const cx = c >= 0 ? g.nav.center(c)[0] : x;
    const cz = c >= 0 ? g.nav.center(c)[1] : z;
    return { x: cx, y: c >= 0 ? g.nav.height[c] : e.pos.y, z: cz, yaw: e.yaw, d: Math.hypot(cx - e.pos.x, cz - e.pos.z), q };
  }, spot.nearest);
  assert(near && near.d < near.q * 0.45, `a spot just behind the nearest guard, inside the combat reach through a wall (${JSON.stringify(near)})`);
  // facing the way he faces: away from him
  await tp(G, near.x, near.y, near.z, near.yaw);
  await sim(0.3);
  await G(() => {
    const g = window.__app.current;
    const s = g.weapons.current.stats;
    const n0 = s.noise;
    s.noise = 1;
    // the report only (no round towards him: a hit would alert him without hearing anything)
    g.weapons.events.onShot(g.weapons.current.def);
    s.noise = n0;
  });
  await sim(0.5);
  const ctl = await G((id) => {
    const em = window.__app.current.enemyMgr;
    const e = em.enemies.find((q) => q.id === id);
    return { nearest: e ? e.alerted : null, level: e ? e.level : null, alerted: em.enemies.filter((q) => q.alive && q.alerted).length };
  }, spot.nearest);
  assert(ctl.nearest === true, `control: a loud shot inside the combat reach alerts the nearest guard (${JSON.stringify(ctl)})`);
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

// (optional, `SECTOR_SHOTS=<dir>`) layout shots for Michael: section 1's start (the yard's south-west corner), C2 (the fire lobby) from inside, section 3 from the deck.
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
    await shot('s1-start', -20, 0, -24.6, 0.5, 0.05);
    await shot('c2-inside', -14.5, 0, -7.6, 0, 0.1);
    // through sections 1 and 2 (the objectives told done, the connectors cycled) onto the deck
    for (let i = 0; i < 2; i++) {
      await G(() => { const m = window.__sector; if (m.run.current.objective.kind === 'download') { m.run.downloading = true; m.run.download(999); } else m.run.objectiveDone(); });
      await sim(0.3);
      await tp(G, S[i].cp.x, S[i].cp.y, S[i].cp.z, S[i].cp.yaw);
      await sim(4.6);
    }
    await shot('s3-deck', 16.8, 3.3, 12.6, Math.PI, 0.3);
  });
}

// (step 3, A9) co-op on two pages over ?net=local: the client mirrors the live section's devices only, the door locks
// and the host's mode line with the syringes; after the connector (both players inside) the client's section-2 devices
// are live. The host page is pumped headless while the client page is in front (the e2e-ctcourse pattern).
console.log('sector ops: co-op client mirrors the live section');
{
  const { browser, A, B, errors: [eA, eB], startMode } = await hostAndJoin(url, 2, { params: 'net=local&sectorGuards=4' });
  let pumping = false;
  const pump = setInterval(async () => {
    if (pumping) return;
    pumping = true;
    try {
      await A.evaluate(() => {
        if (window.__raf === undefined) {
          window.__raf = 0;
          const f = () => { window.__raf++; requestAnimationFrame(f); };
          requestAnimationFrame(f);
        }
        const now = performance.now();
        const last = window.__pumpT ?? now;
        const idle = window.__pumpRaf === window.__raf;
        window.__pumpT = now;
        window.__pumpRaf = window.__raf;
        if (idle && window.__app.current) window.__app.loop.stepHeadless(Math.min(0.1, Math.max(1 / 60, (now - last) / 1000)));
      });
    } catch {}
    pumping = false;
  }, 40);
  const GA = (f, a) => A.evaluate(f, a);
  const GB = (f, a) => B.evaluate(f, a);
  // the client's devices: every camera / laser of a section that is not live is off, the live ones on (none jammed)
  const devOk = (P, sec) => P.evaluate((sec) => {
    const d = window.__ctdev?.debug();
    if (!d || d.live !== sec) return false;
    return d.cams.every((c) => (c.live ? c.mode === 'online' : c.mode === 'off')) && d.lasers.every((l) => l.on === l.live) && d.cams.some((c) => c.live);
  }, sec);
  try {
    await startMode('sector', 'warehouseOps');
    await GA(() => { const g = window.__app.current; g.enemyMgr.update = () => {}; if (g.security) g.security.fixedUpdate = () => {}; });
    await until(B, () => !!window.__ctdev && window.__ctdev.debug().role === 'client', null, 15000, 'the client builds its device mirror');
    await until(B, () => window.__ctdev.debug().live === 0, null, 15000, 'the client knows section 1 is live');
    assert(await devOk(B, 0), `the client: only section 1's devices work (${JSON.stringify(await GB(() => window.__ctdev.debug().cams.map((c) => [c.id, c.live, c.mode])))})`);
    // (sector-fixes P) the lasers' power panels: every laser has one; a dead section's panel is dark. The host, on the
    // workshop catwalk (the panel's vantage), jams the workshop panel: the workshop band goes off on both pages for the
    // jam and its reboot, then comes back. The host's intent is forced (the trigger's aim and line of sight are the
    // unit test's and e2e-ctcourse station 4's); the jam rules, the wire and the client mirror run as in play.
    const pan = await GB(() => window.__ctdev.debug());
    assert(pan.lasers.every((l) => l.panel !== '') && pan.panels.length === 4, `every laser has its power panel (${JSON.stringify(pan.lasers)})`);
    assert(pan.panels.every((p) => (p.live ? p.led === 1 : p.led === 0)), `live panels are lit, dead ones dark (${JSON.stringify(pan.panels)})`);
    assert(!(await GA(() => window.__ctdev.targets.some((t) => t.id.startsWith('laser-')))), 'the beams are no jam targets (the panels are)');
    await GA(() => {
      const g = window.__app.current;
      g.player.controller.teleport(new g.player.position.constructor(10.5, 3.0, -9.55), -Math.PI / 2);
      const d = window.__ctdev;
      d.__forceJam = 'panel-workshop';
      if (!d.__jamHook) {
        d.__jamHook = true;
        const step = d.localStep.bind(d);
        d.localStep = (dt, held) => {
          step(dt, held);
          if (d.__forceJam) {
            d.want[0] = d.__forceJam;
            d.wantAt[0] = d.time;
          }
        };
      }
    });
    const ws = (P) => P.evaluate(() => { const d = window.__ctdev.debug(); return [d.lasers.find((l) => l.id === 'laser-workshop').on, d.panels.find((p) => p.id === 'panel-workshop').ph]; });
    await until(A, () => window.__ctdev.debug().jam[0] === 'panel-workshop', null, 15000, 'the host jams the workshop panel from the catwalk');
    await until(A, () => !window.__ctdev.debug().lasers.find((l) => l.id === 'laser-workshop').on, null, 8000, 'the panel jam cuts the workshop band (host)');
    await until(B, () => { const d = window.__ctdev.debug(); return !d.lasers.find((l) => l.id === 'laser-workshop').on && d.panels.find((p) => p.id === 'panel-workshop').ph === 1; }, null, 8000, 'the client sees the panel jammed and the band off');
    assert((await ws(B))[0] === false && (await GB(() => window.__ctdev.debug().lasers.find((l) => l.id === 'laser-deck').on)) === true, 'the plant deck band (its own panel) stays on');
    await GA(() => { window.__ctdev.__forceJam = ''; });
    await until(A, () => window.__ctdev.debug().lasers.find((l) => l.id === 'laser-workshop').on, null, 10000, 'after the reboot the workshop band is back (host)');
    await until(B, () => window.__ctdev.debug().lasers.find((l) => l.id === 'laser-workshop').on, null, 10000, 'after the reboot the workshop band is back (client)');
    const locks = () => GA(() => window.__app.current.world.doors.list.filter((d) => d.anchor.locked).map((d) => d.index).join(','));
    const lk0 = await locks();
    await until(B, (k) => window.__app.current.world.doors.list.filter((d) => d.anchor.locked).map((d) => d.index).join(',') === k, lk0, 15000, 'the client mirrors the locked doors');
    const sy = await GA(() => window.__app.current.net.revivesLeft());
    assert(sy === 2, `Normal: 2 revive syringes (${sy})`);
    await until(B, () => /Syringes\s*2/.test(document.querySelector('.hud-mode')?.textContent ?? ''), null, 15000, 'the client HUD shows the syringes');
    // section 1 done (the download told done), both players into C2: the cycle loads section 2
    await GA(() => { const m = window.__sector; m.run.downloading = true; m.run.download(999); });
    const cp = await GA(() => window.__app.current.world.map.sectors[0].connector.checkpoint);
    await GA(() => { for (const r of window.__app.current.net.remotes.values()) r.allowTeleport(3); });
    await GB((p) => { const g = window.__app.current; g.player.controller.teleport(new g.player.position.constructor(p.x + 0.6, p.y, p.z), p.yaw); }, cp);
    await GA((p) => { const g = window.__app.current; g.player.controller.teleport(new g.player.position.constructor(p.x - 0.6, p.y, p.z), p.yaw); }, cp);
    await until(A, () => window.__sector.debug().index === 1, null, 20000, 'both inside: the connector cycles into section 2');
    await until(B, () => window.__ctdev.debug().live === 1, null, 15000, 'the client knows section 2 is live');
    assert(await devOk(B, 1), `the client: section 2's devices are live, section 1's off (${JSON.stringify(await GB(() => window.__ctdev.debug().cams.map((c) => [c.id, c.live, c.mode])))})`);
    const lk1 = await locks();
    assert(lk1 !== lk0, `the cycle changed the host's door locks (${lk0} -> ${lk1})`);
    await until(B, (k) => window.__app.current.world.doors.list.filter((d) => d.anchor.locked).map((d) => d.index).join(',') === k, lk1, 15000, 'the client mirrors the unlocked far door');
  } catch (e) {
    failed = true;
    console.error(String(e));
  } finally {
    clearInterval(pump);
    all.push(...eA, ...eB);
    await browser.close();
  }
}
} // part 1

// ---------------------------------------------------------------------------------------------------------------------
// (sector-fixes-r RE) Slice R: the co-op-only routes and the team doors (docs/sector-fixes/r/R1.md, R2.md, R3.md, RT.md;
// report docs/sector-fixes/r/RE.md). Yaw 0 faces +z, PI / 2 faces +x.
const PI = Math.PI;
/** Each co-op lip: the booster's spot on the floor (y 0) facing it, the lip (or pipe) grip, a run-up start for the solo try. */
const COOP = [
  { id: 'S1 C1 plant-room sill', sec: 0, spot: [-2.6, -18.9], yaw: 0, kind: 'ledge', lip: [-2.6, 4.4, -18.15], runFrom: [-2.6, -22.4] },
  { id: 'S1 C2 hoist monorail', sec: 0, spot: [-11.0, -16.6], yaw: 0, kind: 'pipeH', lip: [-11.0, 4.4, -16.6], runFrom: [-14.0, -16.6] },
  { id: 'S2 C1b high bay R3S from the gangway', sec: 1, spot: [-7.7, 2.2], yaw: -PI / 2, kind: 'ledge', lip: [-8.2, 4.4, 2.2], runFrom: [-5.2, 2.2] },
  // (sector-fixes-r e2e fix, Michael M1 "Add another") S2 C2: the dispatch mezzanine's landing on the x -4 wall
  { id: 'S2 C2 dispatch landing', sec: 1, spot: [-6.9, 2.65], yaw: PI / 2, kind: 'ledge', lip: [-6.4, 4.4, 2.65], runFrom: [-7.6, -1.2] },
  { id: 'S3 C1 valve platform', sec: 2, spot: [18.0, 6.1], yaw: PI, kind: 'ledge', lip: [18.0, 4.4, 5.5], runFrom: [18.0, 9.1] },
  { id: 'S3 C2 crane drive platform', sec: 2, spot: [11.8, 6.6], yaw: PI, kind: 'ledge', lip: [11.8, 4.4, 6.0], runFrom: [11.8, 9.6] },
];
// (sector-fixes-r fix) S2 C1a (R3S from A3) and C2 (R3N from A3) are gone: a top-gear running jump off the R2 rack tops
// (3.0 m across A3) caught their lips alone. R3's A3 face is lipless; the leg-up there finds nothing (boost targets).
const route = (id) => COOP.find((c) => c.id.startsWith(id));
/** Grip heights at or over this are a co-op lip (the 4.3-4.5 band, LD 11.3); a solo try must never hold one. */
const BAND_LO = 4.25;

if (want(2)) {
  console.log('sector ops (R): solo - the co-op lips refuse one player, the engine links, the ways down, the team doors');
  await run(PARAMS, async ({ G }) => {
    await G(() => {
      const g = window.__app.current;
      g.target.damageMul = 0;
      g.enemyMgr.update = () => {};
      if (g.security) g.security.fixedUpdate = () => {};
      if (window.__ctdev) window.__ctdev.fixedUpdate = () => {};
      window.__app.settings.update((d) => { d.gamepad.curve = 'linear'; d.gamepad.deadzoneLeft = 0; });
      // the e2e-ct-warehouse / e2e-traverse pattern: the loop stepped by hand at 120 Hz, the pad driven per step
      const H = {
        st: () => window.__app.current,
        grip: (a) => (!a ? null : a.kind === 'ledge' ? a.top : a.kind === 'pipeH' ? a.hangHeight : null),
        step(s, sx = 0, sy = 0, btns = []) {
          const pad = window.__pad;
          pad.axis(0, sx);
          pad.axis(1, -sy);
          for (const b of btns) pad.set(b, 1);
          window.__app.loop.stepHeadless(s, 120);
          pad.axis(0, 0);
          pad.axis(1, 0);
          for (const b of btns) pad.set(b, 0);
        },
        tap(b) {
          window.__pad.set(b, 1);
          window.__app.loop.stepHeadless(2 / 60, 120);
          window.__pad.set(b, 0);
          window.__app.loop.stepHeadless(2 / 60, 120);
        },
        tp(x, y, z, yaw) {
          const st = H.st();
          st.team.end(true);
          st.traversal.reset();
          const c = st.player.controller;
          c.clearCrouchToggle();
          c.teleport(new c.pos.constructor(x, y, z), yaw);
          st.player.cam.yaw = yaw;
          st.player.cam.pitch = 0;
          H.step(0.3);
        },
        info() {
          const st = H.st();
          const c = st.player.controller;
          const ac = st.traversal.attachCtl;
          const a = ac.active ? ac.m.anchor : null;
          const h = ac.hint ?? ac.lower;
          const r = (v) => Math.round(v * 100) / 100;
          return {
            x: r(c.pos.x), y: r(c.pos.y), z: r(c.pos.z), grounded: c.grounded, crouched: c.crouched, alive: st.player.alive,
            attached: ac.active, kind: a?.kind ?? null, id: a?.id ?? -1, grip: H.grip(a), phase: ac.m.phase, canClimb: !!ac.canClimb,
            along: a && a.kind === 'pipeH' ? (Math.abs(a.a.x - a.b.x) < 0.1 ? 'z' : Math.abs(a.a.z - a.b.z) < 0.1 ? 'x' : 'xz') : null,
            hint: h ? `${h.anchor.kind}:${h.entry}` : null, hintGrip: h ? H.grip(h.anchor) : null, geo: st.traversal.hint?.kind ?? null, jump: ac.jump ? `${ac.jump.anchor.kind}@${r(ac.jump.grip.y)}` : null,
          };
        },
        /** The anchor of `kind` whose grip is at `y` nearest (x, z) in plan, and the distance along it. */
        find(kind, x, y, z, rad = 0.7) {
          let best = null;
          let bd = rad;
          for (const a of H.st().world.level.anchors.all) {
            if (a.kind !== kind || Math.abs(H.grip(a) - y) > 0.25) continue;
            const dx = a.b.x - a.a.x;
            const dz = a.b.z - a.a.z;
            const L = Math.hypot(dx, dz);
            const s = Math.max(0, Math.min(L, ((x - a.a.x) * dx + (z - a.a.z) * dz) / L));
            const d = Math.hypot(a.a.x + (dx * s) / L - x, a.a.z + (dz * s) / L - z);
            if (d < bd) {
              bd = d;
              best = { a, s, d };
            }
          }
          return best;
        },
        /** Take hold of that anchor from where the body is (the test way in, e2e-ct-warehouse), then 1 s to settle. */
        attach(kind, x, y, z) {
          const f = H.find(kind, x, y, z);
          if (!f) return { found: false };
          const ok = H.st().traversal.attachCtl.attachTo(f.a, f.s, 'below', 1);
          H.step(1.0);
          return { found: true, ok, aid: f.a.id, ...H.info() };
        },
      };
      window.__re = H;
      window.__app.loop.manual = true;
    });
    const step = (s, sx = 0, sy = 0, btns = []) => G(([s, sx, sy, b]) => window.__re.step(s, sx, sy, b), [s, sx, sy, btns]);
    const tap = (b) => G((b) => window.__re.tap(b), b);
    const put = (x, y, z, yaw) => G(([x, y, z, w]) => window.__re.tp(x, y, z, w), [x, y, z, yaw]);
    const info = () => G(() => window.__re.info());
    const face = (yaw) => G((w) => { window.__re.st().player.cam.yaw = w; }, yaw);
    const attach = (kind, x, y, z) => G(([k, x, y, z]) => window.__re.attach(k, x, y, z), [kind, x, y, z]);
    /** The stick forward (camera at `yaw`) in 0.1 s steps until `stop(info)` or `max` s; `btns` pressed each step. */
    const walk = async (yaw, max, stop, btns = []) => {
      await face(yaw);
      let i = await info();
      for (let t = 0; t < max && !stop(i); t += 0.1) {
        await step(0.1, 0, 1, btns);
        i = await info();
      }
      return i;
    };
    /**
     * The stick pointing the world way `yaw` faces, then the traverse button: a jump from a hang where the stick points.
     * (sector-fixes-r e2e fix) The stick is set against the camera's real yaw: hanging on a lip the camera stays within
     * the hang's cone (`ATTACH_FRAMING.hang.cone` 2.2 rad) of the body's facing, so it never looks straight out from the
     * wall; the stick forward then pointed 0.6 rad off (from the valve platform's west lip: north-west, onto the branch).
     */
    const hangJump = async (yaw) => {
      await face(yaw);
      const wx = Math.sin(yaw);
      const wz = Math.cos(yaw);
      const stick = async (s, b = []) => {
        const c = await G(() => window.__re.st().player.cam.yaw);
        await step(s, wx * Math.cos(c) - wz * Math.sin(c), wx * Math.sin(c) + wz * Math.cos(c), b);
      };
      for (let k = 0; k < 3; k++) await stick(0.1);
      await stick(0.1, [BTN.Y]);
      await step(1.0);
      return info();
    };
    const check = async (name, f) => {
      try {
        await f();
      } catch (e) {
        failed = true;
        console.error(`  CHECK FAIL - ${name}: ${String(e)}`);
        try {
          console.error('  at', JSON.stringify(await info()));
        } catch {}
      }
    };
    await step(0.5);

    // ---- the boost search (the game's own, `TeamController.boostTarget`) finds each planned lip from its spot; a
    // spot along R3's faces with no planned lip finds none (R2 leg 4)
    await check('boost targets', async () => {
      for (const c of COOP) {
        const t = await G(([x, z, yaw]) => {
          const g = window.__app.current;
          const V = g.player.position.constructor;
          const r = g.team['boostTarget']({ id: 'm', pos: new V(x, 0, z), yaw, mode: 'brace' });
          return r && { kind: r.anchor.kind, x: +r.grip.x.toFixed(2), y: +r.grip.y.toFixed(2), z: +r.grip.z.toFixed(2) };
        }, [c.spot[0], c.spot[1], c.yaw]);
        assert(!!t && t.kind === c.kind && Math.abs(t.y - c.lip[1]) < 0.1 && Math.hypot(t.x - c.lip[0], t.z - c.lip[2]) < 1.0, `${c.id}: a leg-up from (${c.spot}) reaches the planned ${c.kind} at 4.4 (${JSON.stringify(t)})`);
      }
      // (sector-fixes-r fix) R3N's east face, and A3's side of R3S and R3N (the old C1a / C2 spots): no lip, nothing found
      for (const [x, z, yaw, what] of [[-7.7, 10.0, -PI / 2, "R3N's east face"], [-11.0, 1.8, PI / 2, "R3S's A3 face (old C1a)"], [-11.0, 10.0, PI / 2, "R3N's A3 face (old C2)"]]) {
        const none = await G(([x, z, yaw]) => {
          const g = window.__app.current;
          const r = g.team['boostTarget']({ id: 'm', pos: new g.player.position.constructor(x, 0, z), yaw, mode: 'brace' });
          return r ? { kind: r.anchor.kind, y: r.grip.y, x: r.grip.x, z: r.grip.z } : null;
        }, [x, z, yaw]);
        assert(none === null, `S2: a leg-up at ${what} (${x}, ${z}), no planned lip there, finds nothing (${JSON.stringify(none)})`);
      }
    });

    // ---- solo refusal: one player alone at each co-op lip (standing under it, the traverse button there: a grab, a wall
    // jump or a jump; and a running jump at it, pressed at the face and again in the air) never holds the lip or stands on top
    for (const c of COOP) {
      await check(`${c.id}: solo refusal`, async () => {
        const [x, z] = c.spot;
        let max = 0;
        let topY = 0;
        const track = (i) => {
          if (i.attached && i.grip !== null) max = Math.max(max, i.grip);
          if (i.grounded) topY = Math.max(topY, i.y);
        };
        await put(x, 0, z, c.yaw);
        await step(0.4);
        const i0 = await info();
        await tap(BTN.Y);
        for (let k = 0; k < 15; k++) {
          await step(0.1);
          track(await info());
        }
        const stand = { max, topY };
        // the run-up: from `runFrom` at the spot, at the top gear; the traverse button at the spot, then every other 50 ms
        // ((sector-fixes-r fix) the top gear is 5, the spawn gear: 4.0 m/s, `GEARS.stand`; 3 was the 2.1 m/s walk)
        const [rx, rz] = c.runFrom;
        const ry = Math.atan2(x - rx, z - rz);
        const fx = Math.sin(ry);
        const fz = Math.cos(ry);
        await put(rx, 0, rz, ry);
        await G(() => { const gs = window.__app.current.player.controller.gears; if (gs) gs.gear = 5; });
        let jumped = -1;
        for (let k = 0; k < 60; k++) {
          const i = await info();
          const d = (x - i.x) * fx + (z - i.z) * fz;
          if (jumped < 0 && (d < 0.3 || k === 40)) jumped = k;
          await step(0.05, 0, 1, jumped >= 0 && (k - jumped) % 2 === 0 ? [BTN.Y] : []);
          track(await info());
        }
        await step(1.0);
        track(await info());
        const fin = await info();
        assert(!(i0.hintGrip >= BAND_LO), `${c.id}: alone under it the traverse button offers no 4.4 m grip (hint ${i0.hint} at ${i0.hintGrip})`);
        assert(stand.max < BAND_LO && stand.topY < BAND_LO, `${c.id}: alone, the traverse button at the spot (grab / wall jump / jump) never holds the lip (held ${stand.max}, stood ${stand.topY})`);
        assert(max < BAND_LO && topY < BAND_LO && fin.y < BAND_LO, `${c.id}: alone, a running jump at it (pressed at the face and in the air) never holds the lip (held ${max}, stood ${topY}, ends y ${fin.y})`);
      });
    }

    // ---- (R2 leg 4; sector-fixes-r fix) solo running jumps off the solo tops nearest a co-op grip, at the top gear (5,
    // 4.0 m/s): R2N's and R2S's 4.0 tops at R3N's and R3S's A3 faces (3.0 m across A3; their lips are gone), and the S1 east
    // lane at the monorail (4.4): off the single pallet (1.0) and from the floor, at the two 2.0 noLedge stacks by its end
    // (neither may be stood on: `standMax`). Take-offs 0.6, 0.3 and 0.05 m before the edge and a plain run off it, the
    // traverse button pressed through the flight: no grip at 4.25 or over is ever held.
    // `from` the start, `yaw` the run, `ax` the axis run along (0 x, 2 z), `edge` the top's edge (or the stack's face) on it.
    const TOPS = [
      { id: 'S2 R2N to R3N', from: [-15.4, 4.05, 10.0], yaw: PI / 2, ax: 0, edge: -13.5 },
      { id: 'S2 R2S to R3S', from: [-15.4, 4.05, 1.8], yaw: PI / 2, ax: 0, edge: -13.5 },
      // (sector-fixes-r e2e fix) the single pallet is an empty one (0.15): off 1.0 the jump rode up over the stacks' edge.
      // Off 0.15 there is no run off (a step down, never airborne) and from the floor the body stops at the stacks' face
      // (z -13.3) with its centre at -12.96: the take-offs there are measured from that stop (`edge` -12.95)
      { id: 'S1 E-lane single pallet (0.15) over the stacks to the monorail', from: [-11.0, 0.2, -11.2], yaw: PI, ax: 2, edge: -12.1, standMax: 1.9, offs: [0.6, 0.3, 0.05] },
      // (sector-fixes-r e2e fix) S2 C2: the nearest solo top to the landing's lip, the empty-pallet stack (2.0), north at it
      { id: 'S2 empty-pallet stack (2.0) to the landing (C2)', from: [-6.0, 2.05, -3.2], yaw: 0, ax: 2, edge: -2.2 },
      { id: 'S1 E-lane floor at the stacks (2.0) and the monorail', from: [-10.45, 0.05, -10.6], yaw: PI, ax: 2, edge: -12.95, standMax: 1.9, offs: [0.6, 0.3, 0.05] },
    ];
    for (const t of TOPS) {
      await check(`${t.id}: solo running jump refused`, async () => {
        const sg = t.ax === 0 ? Math.sign(Math.sin(t.yaw)) : Math.sign(Math.cos(t.yaw));
        const along = (i) => sg * (t.ax === 0 ? i.x : i.z);
        const edge = sg * t.edge;
        for (const off of t.offs ?? [0.6, 0.3, 0.05, null]) {
          await put(t.from[0], t.from[1], t.from[2], t.yaw);
          await G(() => { const gs = window.__app.current.player.controller.gears; if (gs) gs.gear = 5; });
          const top0 = (await info()).y;
          let max = 0;
          let topY = 0;
          let jumped = -1;
          let at = null;
          let speed = 0;
          for (let k = 0; k < 70; k++) {
            const i = await info();
            if (jumped < 0 && off !== null && along(i) > edge - off) {
              jumped = k;
              at = [i.x, i.z];
              speed = await G(() => { const v = window.__app.current.player.controller.vel; return Math.round(Math.hypot(v.x, v.z) * 100) / 100; });
            }
            if (off === null && jumped < 0 && !i.grounded) jumped = k;
            await step(0.05, 0, 1, jumped >= 0 && (k - jumped) % 2 === 0 ? [BTN.Y] : []);
            const j = await info();
            if (j.attached && j.grip !== null) max = Math.max(max, j.grip);
            if (j.grounded && along(j) > edge + 0.5) topY = Math.max(topY, j.y);
          }
          await step(1.0);
          const fin = await info();
          assert(Math.abs(top0 - (t.from[1] - 0.05)) < 0.15 && jumped >= 0, `${t.id}: on the top (y ${top0}) and off its edge (${off === null ? 'run off' : `take-off at ${at} at ${speed} m/s`})`);
          assert(max < BAND_LO && topY < (t.standMax ?? BAND_LO) && !(fin.y > BAND_LO), `${t.id}: alone, the ${off === null ? 'run off' : `running jump (${off} m before the edge, ${speed} m/s)`} never holds a co-op grip (held ${max}, stood ${topY}, ends ${JSON.stringify([fin.x, fin.y, fin.z, fin.attached ? fin.grip : null])})`);
        }
      });
    }

    // ---- section 1, C2: the monorail (4.4) up to the bay main (5.0) where it crosses 0.6 m under it, hand over hand
    // east, then let go onto the plant deck (3.3); and the monorail's way down alone (north end, let go)
    await check('S1 C2 monorail to the bay main', async () => {
      await put(-11.0, 0, -17.0, 0);
      const a = await attach('pipeH', -11.0, 4.4, -17.0);
      assert(a.found && a.attached && a.kind === 'pipeH' && Math.abs(a.grip - 4.4) < 0.05, `S1 C2: hanging on the monorail at z -17.0 (${JSON.stringify(a)})`);
      const i = await hangJump(PI / 2);
      assert(i.attached && i.kind === 'pipeH' && i.id !== a.id && Math.abs(i.grip - 5.0) < 0.05 && i.along === 'x', `S1 C2: stick east + traverse: the jump up 0.6 m from the monorail onto the bay main (${JSON.stringify(i)})`);
      const e = await walk(PI / 2, 15, (q) => q.x >= -7.6 || !q.attached);
      assert(e.attached && e.x >= -7.6, `S1 C2: hand over hand east along the main over the plant deck (x ${e.x})`);
      await tap(BTN.B);
      await step(1.5);
      const d = await info();
      assert(!d.attached && d.grounded && Math.abs(d.y - 3.3) < 0.15, `S1 C2: let go over the deck: feet on the plant deck at 3.3 (${JSON.stringify([d.x, d.y, d.z])})`);
    });
    await check('S1 C2 way down', async () => {
      await put(-11.0, 0, -17.0, 0);
      const a = await attach('pipeH', -11.0, 4.4, -17.0);
      assert(a.attached && a.kind === 'pipeH', 'S1 C2: on the monorail again');
      // (sector-fixes-r e2e fix) the hands stop 0.45 m short of the pipe's end (`attachRange`): z -16.05, 0.7 m from the
      // checker's stop (-11.2, -15.4), inside the drop takedown's 1.0
      const e = await walk(0, 8, (q) => q.z >= -16.1 || !q.attached);
      assert(e.attached && e.z >= -16.1, `S1 C2: hand over hand north to the monorail's end by the checker's stop (z ${e.z})`);
      await tap(BTN.B);
      await step(1.5);
      const d = await info();
      assert(!d.attached && d.grounded && d.y < 0.2 && Math.hypot(d.x + 11.0, d.z + 16.05) < 0.6, `S1 C2: way down alone: let go, feet on the bay floor at (-11.0, -16.05) (${JSON.stringify([d.x, d.y, d.z])})`);
    });

    // ---- section 1, C1: the climb-up onto the sill (the hood leaves standing room), the crouch-walk under the 1.4 m
    // clearance onto the deck; the way back alone: the 1.1 m mantle onto the sill, lower onto its outer lip, drop
    await check('S1 C1 sill and deck', async () => {
      await put(-2.6, 0, -18.7, 0);
      const a = await attach('ledge', -2.6, 4.4, -18.15);
      assert(a.attached && a.kind === 'ledge' && Math.abs(a.grip - 4.4) < 0.05, `S1 C1: hanging on the sill lip (${JSON.stringify(a)})`);
      await tap(BTN.Y);
      await step(1.6);
      const s = await info();
      assert(!s.attached && s.grounded && Math.abs(s.y - 4.4) < 0.1, `S1 C1: the climb-up stands on the sill (canClimb ${a.canClimb}, ${JSON.stringify([s.x, s.y, s.z])})`);
      if (!s.crouched) await tap(BTN.B);
      const d = await walk(0, 5, (q) => q.grounded && q.y < 3.5 && q.z > -17.3);
      assert(d.grounded && Math.abs(d.y - 3.3) < 0.1 && d.z > -17.3, `S1 C1: crouch-walk north under the 1.4 m clearance from the sill onto the deck (${JSON.stringify([d.x, d.y, d.z, d.crouched])})`);
      await step(0.6, 0, 1);
      // back: face the sill, walk to it, the traverse button mantles onto it
      const w = await walk(PI, 1.2, () => false);
      await step(0.3);
      const pre = await info();
      await tap(BTN.Y);
      await step(1.6);
      let m = await info();
      for (let k = 0; k < 2 && !(m.grounded && m.y > 4.3); k++) {
        await walk(PI, 0.4, () => false);
        await tap(BTN.Y);
        await step(1.6);
        m = await info();
      }
      assert(m.grounded && Math.abs(m.y - 4.4) < 0.1, `S1 C1: way back: from the deck the 1.1 m mantle onto the sill (at ${JSON.stringify([w.x, w.y, w.z])}, offered ${pre.geo ?? pre.hint}; ends ${JSON.stringify([m.x, m.y, m.z])})`);
      // lower onto the outer lip (drop held at the edge), then let go into the yard
      let h = await info();
      for (let k = 0; k < 4 && !h.attached; k++) {
        await face(PI);
        await step(0.6, 0, 0, [BTN.B]);
        await step(0.8);
        h = await info();
        if (!h.attached) {
          await walk(PI, 0.2, () => false);
          h = await info();
        }
      }
      assert(h.attached && h.kind === 'ledge' && Math.abs(h.grip - 4.4) < 0.05, `S1 C1: holding drop at the sill's edge lowers into the hang (${JSON.stringify(h)})`);
      await tap(BTN.B);
      await step(1.5);
      const y = await info();
      assert(!y.attached && y.grounded && y.y < 0.2 && y.z < -18.3, `S1 C1: way down alone: let go, feet in the yard (${JSON.stringify([y.x, y.y, y.z])})`);
    });

    // ---- section 2: the climb-up onto each high-bay top; the ways down alone (R3S walk off the west edge; R3N along
    // the top, crouched under the roof-sheet band, to the north end and off it by the wrapped stack)
    // ((sector-fixes-r fix) C1 is the east gangway lip only; R3N has no lip, so no C2 climb-up)
    await check('S2 C1 top and way down', async () => {
      await put(-7.7, 0, 2.2, -PI / 2);
      const a = await attach('ledge', -8.2, 4.4, 2.2);
      assert(a.attached && Math.abs(a.grip - 4.4) < 0.05, `S2 C1: hanging on R3S's east lip (${JSON.stringify(a)})`);
      await tap(BTN.Y);
      await step(1.6);
      const s = await info();
      assert(s.grounded && Math.abs(s.y - 4.4) < 0.1, `S2 C1: the climb-up onto R3S's top (${JSON.stringify([s.x, s.y, s.z])})`);
      let d = await walk(-PI / 2, 3, (q) => q.grounded && q.y < 0.3);
      if (!(d.y < 0.3)) {
        await tap(BTN.Y);
        d = await walk(-PI / 2, 3, (q) => q.grounded && q.y < 0.3);
      }
      assert(d.grounded && d.y < 0.3 && d.alive, `S2 C1: way down alone: off the west edge to the A3 floor (${JSON.stringify([d.x, d.y, d.z])})`);
    });
    // ---- (sector-fixes-r e2e fix) section 2, C2: the climb-up onto the landing and the way down alone (let go of the lip)
    await check('S2 C2 landing climb-up and way down', async () => {
      const c = route('S2 C2');
      await put(c.spot[0], 0, c.spot[1], c.yaw);
      const a = await attach('ledge', c.lip[0], 4.4, c.lip[2]);
      assert(a.attached && a.kind === 'ledge' && Math.abs(a.grip - 4.4) < 0.05 && a.canClimb, `S2 C2: hanging on the landing's west lip, the climb-up offered (${JSON.stringify(a)})`);
      await tap(BTN.Y);
      await step(1.6);
      const s = await info();
      assert(!s.attached && s.grounded && Math.abs(s.y - 4.4) < 0.1 && s.x > -6.4, `S2 C2: the climb-up onto the landing (${JSON.stringify([s.x, s.y, s.z])})`);
      await put(c.spot[0], 0, c.spot[1], c.yaw);
      const h = await attach('ledge', c.lip[0], 4.4, c.lip[2]);
      assert(h.attached, 'S2 C2: on the lip again');
      await tap(BTN.B);
      await step(1.5);
      const d = await info();
      assert(!d.attached && d.grounded && d.y < 0.2 && d.alive, `S2 C2: way down alone: let go, feet on the gangway floor (${JSON.stringify([d.x, d.y, d.z])})`);
    });
    // ---- section 3: the climb-up onto each hung platform (ending crouched; (sector-fixes-r e2e fix) standing room under the
    // hood, 1.9 m), the lip to the main (5.0)
    // and back, the branch to the main, the ways down alone (let go of the north lip)
    for (const c of [route('S3 C1'), route('S3 C2')]) {
      await check(`${c.id}: climb-up and way down`, async () => {
        await put(c.spot[0], 0, c.spot[1], c.yaw);
        const a = await attach('ledge', c.lip[0], 4.4, c.lip[2]);
        assert(a.attached && Math.abs(a.grip - 4.4) < 0.05, `${c.id}: hanging on the north lip (${JSON.stringify(a)})`);
        await tap(BTN.Y);
        await step(1.6);
        const s = await info();
        assert(!s.attached && s.grounded && Math.abs(s.y - 4.4) < 0.1 && s.crouched, `${c.id}: the climb-up onto the platform under its hood ends crouched (canClimb ${a.canClimb}; ends ${JSON.stringify(s)})`);
      });
      await check(`${c.id}: way down`, async () => {
        await put(c.spot[0], 0, c.spot[1], c.yaw);
        const a = await attach('ledge', c.lip[0], 4.4, c.lip[2]);
        assert(a.attached, `${c.id}: on the north lip`);
        await tap(BTN.B);
        await step(1.5);
        const d = await info();
        assert(!d.attached && d.grounded && d.y < 0.2, `${c.id}: way down alone: let go of the north lip, feet on the floor (${JSON.stringify([d.x, d.y, d.z])})`);
      });
    }
    await check('S3 C1 lip to the main and back', async () => {
      await put(16.9, 0, 4.75, PI / 2);
      const a = await attach('ledge', 17.4, 4.4, 4.75);
      assert(a.attached && a.kind === 'ledge' && Math.abs(a.grip - 4.4) < 0.05, `S3 C1: hanging on the valve platform's west lip (${JSON.stringify(a)})`);
      // (sector-fixes-r e2e fix) the main is 0.18 m out from the hanging body, almost straight over it: a jump along the
      // stick away from the wall never takes it (`findJumpTarget` wants it 0.3 m off to the side; it took the branch), the
      // stick into the wall is the jump up and takes it
      const i = await hangJump(PI / 2);
      assert(i.attached && i.kind === 'pipeH' && Math.abs(i.grip - 5.0) < 0.05 && i.along === 'z', `S3 C1: from the west lip the jump up 0.6 m onto the hall main (${JSON.stringify(i)})`);
      // (sector-fixes-r e2e fix) the hands stop 0.45 m short of the main's end (z 12.6): 12.15, 0.3 m over the deck's edge
      const e = await walk(0, 16, (q) => q.z >= 12.1 || !q.attached);
      assert(e.attached && e.z >= 12.1, `S3 C1: hand over hand north along the main to its end over the deck (z 12.15) (${JSON.stringify([e.x, e.y, e.z])})`);
      await tap(BTN.B);
      await step(1.5);
      const d = await info();
      assert(!d.attached && d.grounded && Math.abs(d.y - 3.3) < 0.15, `S3 C1: let go: feet on the deck strip at 3.3 (${JSON.stringify([d.x, d.y, d.z])})`);
      // and back: from the main the drop-across onto the west lip
      await put(16.4, 0, 4.75, PI / 2);
      const m = await attach('pipeH', 17.0, 5.0, 4.75);
      assert(m.attached && m.kind === 'pipeH' && Math.abs(m.grip - 5.0) < 0.05, `S3 C1: on the main beside the platform (${JSON.stringify(m)})`);
      const b = await hangJump(PI / 2);
      assert(b.attached && b.kind === 'ledge' && Math.abs(b.grip - 4.4) < 0.05 && b.x > 16.8, `S3 C1: the drop-across from the main back onto the west lip (${JSON.stringify(b)})`);
    });
    await check('S3 C2 lip to the branch and the main', async () => {
      await put(12.8, 0, 4.9, -PI / 2);
      const a = await attach('ledge', 12.3, 4.4, 4.9);
      assert(a.attached && a.kind === 'ledge' && Math.abs(a.grip - 4.4) < 0.05, `S3 C2: hanging on the drive platform's east lip (${JSON.stringify(a)})`);
      const i = await hangJump(PI / 2);
      assert(i.attached && i.kind === 'pipeH' && Math.abs(i.grip - 5.0) < 0.05 && i.along === 'x', `S3 C2: from the east lip the jump up onto the sprinkler branch (${JSON.stringify(i)})`);
      // (sector-fixes-r e2e fix) the hands stop 0.45 m short of the branch's end at the main (x 17.0): 16.55
      const e = await walk(PI / 2, 10, (q) => q.x >= 16.5 || !q.attached);
      assert(e.attached && e.x >= 16.5, `S3 C2: hand over hand east along the branch to the main (${JSON.stringify([e.x, e.y, e.z])})`);
      const m = await hangJump(0);
      assert(m.attached && m.kind === 'pipeH' && Math.abs(m.grip - 5.0) < 0.05 && m.along === 'z', `S3 C2: from the branch's end onto the hall main (${JSON.stringify(m)})`);
    });

    // ---- the team doors, section by section (each live in turn): bolted at the start; the near side gets no Unbolt,
    // useBolt is refused and the door stays shut (the stick into it goes nowhere); the far side's Unbolt opens it and the
    // partner walks through from the near side; a checkpoint restart bolts it again
    for (let sec = 0; sec < 3; sec++) {
      await check(`section ${sec + 1} team door`, async () => {
        const bs = (await G(() => window.__sector.boltInfo())).filter((b) => b.sec === sec);
        assert(bs.length >= 1 && (await G(() => window.__sector.debug().index)) === sec, `section ${sec + 1} is live and has a team door (${bs.length})`);
        for (const b of bs) {
          const tag = `section ${sec + 1} team door ${b.k} (${b.at})`;
          assert(b.shut && b.locked === true && b.door >= 0, `${tag}: bolted and locked at the start (${JSON.stringify(b)})`);
          const [ax, az] = b.at;
          const [sx, sz] = b.side;
          const past = (i) => (i.x - ax) * sx + (i.z - az) * sz;
          await put(ax - sx * 0.8, 0, az - sz * 0.8, Math.atan2(sx, sz));
          const near = await G(([sec, k, door, id]) => {
            const g = window.__app.current;
            const n = g.interactables.nearest(g.player.position);
            const used = window.__sector.useBolt(sec, k);
            const opened = g.world.doors.open(g.world.doors.list[door], 'quiet');
            return { nearest: n?.id ?? null, used, opened, it: g.interactables.items.find((q) => q.id === id)?.enabled ?? null };
          }, [sec, b.k, b.door, b.id]);
          assert(near.nearest !== b.id && near.used === false && near.opened === false && near.it === true, `${tag}: the near side gets no Unbolt, the bolt and the door refuse (${JSON.stringify(near)})`);
          const pushed = await walk(Math.atan2(sx, sz), 1.5, () => false);
          const nb = (await G(() => window.__sector.boltInfo())).find((q) => q.id === b.id);
          assert(past(pushed) < 0 && nb.shut && nb.locked === true, `${tag}: walking into it from the near side goes nowhere, it stays locked (${past(pushed).toFixed(2)} past the plane)`);
          await put(ax + sx * 0.8, 0, az + sz * 0.8, Math.atan2(-sx, -sz));
          const far = await G(([id]) => {
            const g = window.__app.current;
            const n = g.interactables.nearest(g.player.position);
            const ok = n && n.id === id;
            if (ok) n.onUse(n, 'local');
            return { nearest: n?.id ?? null, label: n?.label ?? null, it: g.interactables.items.find((q) => q.id === id)?.enabled ?? null };
          }, [b.id]);
          const ub = (await G(() => window.__sector.boltInfo())).find((q) => q.id === b.id);
          assert(far.nearest === b.id && far.label === 'Unbolt' && far.it === false && !ub.shut && ub.locked === false, `${tag}: the far side's Unbolt opens the bolt and the door's lock (${JSON.stringify(far)}, ${JSON.stringify(ub)})`);
          const op = await G((door) => { const d = window.__app.current.world.doors; return d.open(d.list[door], 'quiet'); }, b.door);
          await step(1.5);
          assert(op === true, `${tag}: the door opens now`);
          await put(ax - sx * 0.8, 0, az - sz * 0.8, Math.atan2(sx, sz));
          const thr = await walk(Math.atan2(sx, sz), 4, (q) => past(q) > 1.2);
          assert(past(thr) > 1.2, `${tag}: the partner walks through from the near side (${past(thr).toFixed(2)} m past)`);
          assert(await G(() => window.__sector.restartCheckpoint()), `${tag}: the checkpoint restart runs`);
          await step(1.0);
          const rb = (await G(() => window.__sector.boltInfo())).find((q) => q.id === b.id);
          const rs = await G(([door, id]) => { const g = window.__app.current; return { target: g.world.doors.list[door].target, it: g.interactables.items.find((q) => q.id === id)?.enabled ?? null }; }, [b.door, b.id]);
          assert(rb.shut && rb.locked === true && rs.it === true && rs.target === 0, `${tag}: the restart bolts it again, shut, its Unbolt back (${JSON.stringify(rb)}, ${JSON.stringify(rs)})`);
        }
        if (sec < 2) {
          // on into the next section: its objective told done, the connector cycled
          await G(() => { const m = window.__sector; if (m.run.current.objective.kind === 'download') { m.run.downloading = true; m.run.download(999); } else m.run.objectiveDone(); });
          await step(0.3);
          const cp = await G((s) => window.__app.current.world.map.sectors[s].connector.checkpoint, sec);
          await put(cp.x, cp.y, cp.z, cp.yaw);
          await step(4.8);
          const d = await G(() => window.__sector.debug());
          assert(d.index === sec + 1, `on into section ${sec + 2} (${d.index}, ${d.phase})`);
        }
      });
    }
  });
}

/**
 * Two pages over ?net=local in Sector Ops (the host page pumped headless while the client page is in front, the
 * e2e-ctcourse pattern); `fn` gets the leg helpers. Each route runs on its own: a failed one is reported and the next
 * still runs.
 */
async function coop(title, fn) {
  console.log(title);
  const { browser, A, B, errors: [eA, eB], startMode } = await hostAndJoin(url, 2, { params: 'net=local&sectorGuards=4' });
  let pumping = false;
  const pump = setInterval(async () => {
    if (pumping) return;
    pumping = true;
    try {
      await A.evaluate(() => {
        if (window.__raf === undefined) {
          window.__raf = 0;
          const f = () => { window.__raf++; requestAnimationFrame(f); };
          requestAnimationFrame(f);
        }
        const now = performance.now();
        const last = window.__pumpT ?? now;
        const idle = window.__pumpRaf === window.__raf;
        window.__pumpT = now;
        window.__pumpRaf = window.__raf;
        if (idle && window.__app.current) window.__app.loop.stepHeadless(Math.min(0.1, Math.max(1 / 60, (now - last) / 1000)));
      });
    } catch {}
    pumping = false;
  }, 40);
  const GA = (f, a) => A.evaluate(f, a);
  const GB = (f, a) => B.evaluate(f, a);
  const RB = BTN.RB;
  const holdUntil = async (P, btn, cond, what, arg, timeout = 20000) => {
    await P.evaluate((b) => window.__pad.set(b, 1), btn);
    try {
      await until(P, cond, arg, timeout, what);
    } finally {
      await P.evaluate((b) => window.__pad.set(b, 0), btn);
    }
  };
  const padReady = (P) => P.evaluate(() => { window.__pad.connect(); for (let i = 0; i < 4; i++) window.__pad.axis(i, 0); for (let i = 0; i < 17; i++) window.__pad.set(i, 0); window.__app.current.player.controller.clearCrouchToggle(); });
  const crouch = async (P) => {
    await until(P, () => !window.__app.current.player.controller.crouched, null, 3000, 'stands before the crouch').catch(() => {});
    await holdUntil(P, BTN.B, () => window.__app.current.player.controller.crouched, 'crouches');
    await waitSim(150);
  };
  const place = (P, x, y, z, yaw) => P.evaluate(([x, y, z, w]) => { const g = window.__app.current; g.team.end(true); g.traversal.reset(); g.player.controller.teleport(new g.player.position.constructor(x, y, z), w); g.player.cam.yaw = w; g.player.cam.pitch = 0; }, [x, y, z, yaw]);
  const moveHost = async (x, z, yaw, y = 0.1) => {
    await place(A, x, y, z, yaw);
    await until(A, ([x, z]) => { const p = window.__app.current.player.controller.pos; return Math.hypot(p.x - x, p.z - z) < 0.4; }, [x, z], 15000, `the host at ${x}, ${z}`);
  };
  const moveClient = async (x, z, yaw, y = 0.1) => {
    await GA(() => { for (const r of window.__app.current.net.remotes.values()) r.allowTeleport(3); });
    await place(B, x, y, z, yaw);
    await until(A, ([x, z]) => { const r = window.__app.current.net.remotes.values().next().value; return Math.hypot(r.feet.x - x, r.feet.z - z) < 0.4; }, [x, z], 15000, `the host sees the client at ${x}, ${z}`);
  };
  const hostFeet = () => GA(() => { const p = window.__app.current.player.controller.pos; return [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)]; });
  const clientFeet = () => GA(() => { const r = window.__app.current.net.remotes.values().next().value; return [+r.feet.x.toFixed(2), +r.feet.y.toFixed(2), +r.feet.z.toFixed(2)]; });
  /** The stick forward (camera at `yaw`) until `cond` on that page. */
  const walkP = async (P, yaw, cond, arg, what, timeout = 20000) => {
    await P.evaluate((w) => { window.__app.current.player.cam.yaw = w; window.__pad.axis(0, 0); window.__pad.axis(1, -1); }, yaw);
    try {
      await until(P, cond, arg, timeout, what);
    } finally {
      await P.evaluate(() => window.__pad.axis(1, 0));
    }
  };
  /** The client crouches at the route's spot facing the lip and offers; the host behind it takes the leg-up. */
  const legUp = async (c) => {
    const [x, z] = c.spot;
    const fx = Math.sin(c.yaw);
    const fz = Math.cos(c.yaw);
    await moveClient(x, z, c.yaw);
    await moveHost(x - fx * 0.8, z - fz * 0.8, c.yaw);
    await waitSim(500);
    await padReady(B);
    await padReady(A);
    await crouch(B);
    await holdUntil(B, RB, () => window.__app.current.team.state === 'offer', `${c.id}: the client offers a leg-up`);
    await until(A, () => !!window.__app.current.team.offer?.boost, null, 8000, `${c.id}: the host is offered the leg-up (a lip in the boost band)`);
    const b0 = await GA(() => window.__app.current.team.count.boosts);
    await holdUntil(A, RB, (n) => window.__app.current.team.count.boosts > n, `${c.id}: the host takes the leg-up`, b0);
    await until(A, (k) => { const t = window.__app.current.traversal; return t.attach.phase === 'on' && t.attach.anchor?.kind === k; }, c.kind, 12000, `${c.id}: the host hangs on the ${c.kind === 'pipeH' ? 'monorail' : 'lip'}`);
    const a = await GA(() => { const an = window.__app.current.traversal.attach.anchor; return { id: an.id, grip: an.kind === 'ledge' ? an.top : an.hangHeight }; });
    assert(Math.abs(a.grip - 4.4) < 0.1, `${c.id}: the client's leg-up puts the host on the 4.4 m ${c.kind === 'pipeH' ? 'monorail' : 'lip'} (${a.grip}, host ${JSON.stringify(await hostFeet())})`);
    await until(B, () => window.__app.current.team.state === 'none', null, 20000, `${c.id}: the booster is free again`);
    return a;
  };
  /** The hanging host offers the relay; the client at `foot` climbs it onto the same lip. */
  const relay = async (c, lipId, foot) => {
    await moveClient(foot[0], foot[1], c.yaw);
    await waitSim(400);
    const n0 = await GB(() => window.__app.current.team.count.ladders);
    await holdUntil(A, RB, () => window.__app.current.team.state === 'relayOffer', `${c.id}: the hanging host offers the relay`);
    await until(B, () => !!window.__app.current.team.offer?.relay, null, 8000, `${c.id}: the client is offered the relay`);
    await holdUntil(B, RB, (n) => window.__app.current.team.count.ladders > n, `${c.id}: the client climbs the relay`, n0);
    await until(B, (id) => window.__app.current.traversal.attach.phase === 'on' && window.__app.current.traversal.attach.anchor?.id === id, lipId, 40000, `${c.id}: the client hangs on the same lip`);
    await until(A, () => window.__app.current.team.state === 'none' && window.__app.current.traversal.attached, null, 8000, `${c.id}: the host is free and still hanging`);
    assert(true, `${c.id}: the relay: the client climbed the hanging host onto the lip`);
  };
  const pullUp = async (P, what) => {
    await holdUntil(P, BTN.Y, () => !window.__app.current.traversal.attached, `${what}: pulls up`);
    await until(P, () => window.__app.current.player.controller.grounded, null, 30000, `${what}: stands on top`);
  };
  /** The host on top at `top` [x, z, yaw] (facing the drop) drops the rope; the client at `foot` climbs it to the top. */
  const rope = async (c, top, foot) => {
    const y0 = (await hostFeet())[1];
    await GA(([x, y, z, w]) => { const g = window.__app.current; g.player.controller.teleport(new g.player.position.constructor(x, y, z), w); g.player.cam.yaw = w; }, [top[0], y0 + 0.02, top[1], top[2]]);
    await until(A, ([x, z]) => { const p = window.__app.current.player.controller.pos; return Math.hypot(p.x - x, p.z - z) < 0.4 && p.y > 4.2; }, [top[0], top[1]], 15000, `${c.id}: the host on the top facing the drop`);
    await moveClient(foot[0], foot[1], c.yaw);
    await waitSim(500);
    await padReady(A);
    await padReady(B);
    await holdUntil(A, RB, () => window.__app.current.team.state === 'ropeOffer', `${c.id}: the host drops the rope`);
    await until(B, () => !!window.__app.current.team.offer?.rope, null, 8000, `${c.id}: the client is offered the rope`);
    const n0 = await GB(() => window.__app.current.team.count.ropes);
    await holdUntil(B, RB, (n) => window.__app.current.team.count.ropes > n, `${c.id}: the client takes the rope`, n0);
    await until(A, () => window.__app.current.team.state === 'ropeHold', null, 8000, `${c.id}: the host holds the rope`);
    // the stick up until the climber tops out (let go on the step it does, as e2e-ctcourse station 7)
    const t0 = await GB(() => window.__app.current.team.count.tops);
    await GB((t0) => {
      const st = window.__app.current;
      const orig = st.fixedUpdate.bind(st);
      st.fixedUpdate = (dt) => {
        orig(dt);
        if (st.team.count.tops > t0) {
          window.__pad.axis(1, 0);
          st.fixedUpdate = orig;
        }
      };
      window.__pad.axis(1, -1);
    }, t0);
    try {
      await until(B, (t) => window.__app.current.team.count.tops > t, t0, 40000, `${c.id}: the client climbs the rope and tops out`);
    } finally {
      await GB(() => window.__pad.axis(1, 0));
    }
    await until(A, () => window.__app.current.team.state === 'none', null, 8000, `${c.id}: the holder is free once the partner is up`);
    await waitSim(400);
  };
  /** Both players on the top (4.4): each page's own feet and the host's view of the client. */
  const bothOnTop = async (c) => {
    await until(B, () => { const c = window.__app.current.player.controller; return c.grounded && c.pos.y > 4.25; }, null, 8000, `${c.id}: the client stands on the top`);
    await until(A, () => { const r = window.__app.current.net.remotes.values().next().value; return r.feet.y > 4.25; }, null, 8000, `${c.id}: the host sees the client on the top`);
    const h = await hostFeet();
    const cl = await clientFeet();
    const cr = await GB(() => window.__app.current.player.controller.crouched);
    assert(h[1] > 4.3 && h[1] < 4.5 && cl[1] > 4.3 && cl[1] < 4.5, `${c.id}: both players on the 4.4 m top (host ${JSON.stringify(h)}, client ${JSON.stringify(cl)}, client crouched ${cr})`);
  };
  /** On into the next section (its objective told done, both players into the connector). */
  const advance = async (i) => {
    await GA(() => { const m = window.__sector; if (m.run.current.objective.kind === 'download') { m.run.downloading = true; m.run.download(999); } else m.run.objectiveDone(); });
    const cp = await GA((i) => window.__app.current.world.map.sectors[i].connector.checkpoint, i);
    await moveClient(cp.x + 0.6, cp.z, cp.yaw, cp.y);
    await moveHost(cp.x - 0.6, cp.z, cp.yaw, cp.y);
    await until(A, (n) => window.__sector.debug().index === n, i + 1, 20000, `both inside connector ${i + 1}: section ${i + 2} loads`);
    await GA(() => { window.__app.current.target.damageMul = 0; for (const r of window.__app.current.net.remotes.values()) r.damageMul = 0; });
  };
  /** The section's team door with two players: the client unbolts it from the far side for both pages; a restart re-bolts it. */
  const teamDoor = async (sec) => {
    const bs = (await GA(() => window.__sector.boltInfo())).filter((q) => q.sec === sec);
    assert(bs.length >= 1 && (await GA(() => window.__sector.debug().index)) === sec, `co-op: section ${sec + 1} is live and has a team door`);
    for (const b of bs) {
      const tag = `co-op section ${sec + 1} team door ${b.k}`;
      assert(b.shut && b.locked === true, `${tag}: bolted at the start (${JSON.stringify(b)})`);
      await until(B, (d) => window.__app.current.world.doors.list[d].anchor.locked === true, b.door, 8000, `${tag}: the client's door is locked`);
      const [ax, az] = b.at;
      const [sx, sz] = b.side;
      // near side: no Unbolt on the client; its use sent from there by hand is refused by the host (the side test)
      await moveClient(ax - sx * 0.8, az - sz * 0.8, Math.atan2(sx, sz));
      await waitSim(800);
      const near = await GB((id) => {
        const g = window.__app.current;
        const n = g.interactables.nearest(g.player.position);
        const it = g.interactables.items.find((q) => q.id === id);
        if (it) it.onUse(it);
        return { mirrored: !!it, on: it?.enabled ?? null, nearest: n?.id ?? null };
      }, b.id);
      assert(near.mirrored && near.on === true && near.nearest !== b.id, `${tag}: the client mirrors the Unbolt but is not offered it on the near side (${JSON.stringify(near)})`);
      await waitSim(1500);
      const still = (await GA(() => window.__sector.boltInfo())).find((q) => q.id === b.id);
      const cl0 = await GB((d) => window.__app.current.world.doors.list[d].anchor.locked, b.door);
      assert(still.shut && still.locked === true && cl0 === true, `${tag}: the client's use from the near side is refused, locked on both pages (${JSON.stringify(still)}, client ${cl0})`);
      // far side: the client is offered "Unbolt" and uses it
      await moveClient(ax + sx * 0.8, az + sz * 0.8, Math.atan2(-sx, -sz));
      await waitSim(800);
      const far = await GB(() => { const g = window.__app.current; const n = g.interactables.nearest(g.player.position); return { nearest: n?.id ?? null, label: n?.label ?? null }; });
      assert(far.nearest === b.id && far.label === 'Unbolt', `${tag}: the client on the far side is offered "Unbolt" (${JSON.stringify(far)})`);
      await GB((id) => { const it = window.__app.current.interactables.items.find((q) => q.id === id); it.onUse(it); }, b.id);
      await until(A, (id) => { const q = window.__sector.boltInfo().find((r) => r.id === id); return !q.shut && q.locked === false; }, b.id, 8000, `${tag}: the host unbolts it for the client`);
      await until(B, (d) => window.__app.current.world.doors.list[d].anchor.locked === false, b.door, 8000, `${tag}: the client's door unlocks`);
      await until(B, (id) => window.__app.current.interactables.items.find((q) => q.id === id)?.enabled === false, b.id, 8000, `${tag}: the client's Unbolt goes off`);
      assert(true, `${tag}: the client's Unbolt from the far side opens it on both pages`);
      // a checkpoint restart bolts it again on both pages
      assert(await GA(() => window.__sector.restartCheckpoint()), `${tag}: the host's checkpoint restart runs`);
      await until(A, (id) => { const q = window.__sector.boltInfo().find((r) => r.id === id); return q.shut && q.locked === true; }, b.id, 8000, `${tag}: the restart bolts it again (host)`);
      await until(B, (d) => window.__app.current.world.doors.list[d].anchor.locked === true, b.door, 8000, `${tag}: the client's door is locked again`);
      await until(B, (id) => window.__app.current.interactables.items.find((q) => q.id === id)?.enabled === true, b.id, 8000, `${tag}: the client's Unbolt is back`);
      assert(true, `${tag}: the restart re-bolts it on both pages`);
    }
  };
  const leg = async (name, f) => {
    try {
      await f();
    } catch (e) {
      failed = true;
      console.error(`  ROUTE FAIL - ${name}: ${String(e)}`);
      try {
        console.error('  host', await teamLog(A));
        console.error('  client', await teamLog(B));
      } catch {}
    } finally {
      for (const P of [A, B]) await P.evaluate(() => { for (let i = 0; i < 4; i++) window.__pad.axis(i, 0); for (let i = 0; i < 17; i++) window.__pad.set(i, 0); const g = window.__app.current; g.team.end(true); g.traversal.reset(); }).catch(() => {});
    }
  };
  try {
    await startMode('sector', 'warehouseOps');
    await GA(() => { const g = window.__app.current; g.enemyMgr.update = () => {}; if (g.security) g.security.fixedUpdate = () => {}; });
    await until(B, () => !!window.__app.current?.player && !!window.__ctdev, null, 15000, 'the client is in the match');
    await fn({ A, B, GA, GB, legUp, relay, pullUp, rope, bothOnTop, advance, teamDoor, leg, walkP, holdUntil, hostFeet, clientFeet, moveClient, moveHost });
  } catch (e) {
    failed = true;
    console.error(String(e));
  } finally {
    clearInterval(pump);
    all.push(...eA, ...eB);
    await browser.close();
  }
}

if (want(3)) {
  await coop('sector ops (R): co-op section 1 - the sill (leg-up, relay, onto the deck), the monorail, the mess door', async (h) => {
    const { A, B, legUp, relay, pullUp, bothOnTop, teamDoor, leg, walkP, holdUntil, hostFeet, clientFeet } = h;
    await leg('S1 C1', async () => {
      const c = route('S1 C1');
      const a = await legUp(c);
      await relay(c, a.id, [-2.6, -18.6]);
      await pullUp(A, `${c.id} host`);
      await pullUp(B, `${c.id} client`);
      await bothOnTop(c);
      // the destination: both crouch-walk north under the 1.4 m clearance onto the plant deck (3.3)
      const deck = () => { const p = window.__app.current.player.controller; return p.grounded && p.pos.y < 3.5 && p.pos.z > -17.4; };
      await walkP(A, 0, deck, null, `${c.id}: the host crouch-walks onto the deck`);
      await walkP(B, 0, deck, null, `${c.id}: the client crouch-walks onto the deck`);
      const hf = await hostFeet();
      const cf = await clientFeet();
      assert(Math.abs(hf[1] - 3.3) < 0.1 && Math.abs(cf[1] - 3.3) < 0.15, `${c.id}: both on the plant deck at 3.3 (host ${JSON.stringify(hf)}, client ${JSON.stringify(cf)})`);
    });
    await leg('S1 C2', async () => {
      const c = route('S1 C2');
      await legUp(c);
      // over the checker's stop: hand over hand north to the monorail's end, then let go (the way down alone)
      // (sector-fixes-r e2e fix) the hands stop 0.45 m short of the pipe's end (z -16.05; the checker's stop is 0.7 m off)
      await walkP(A, 0, () => { const t = window.__app.current.traversal; return !t.attached || window.__app.current.player.controller.pos.z >= -16.1; }, null, `${c.id}: the host goes hand over hand north`);
      const at = await hostFeet();
      assert(at[2] >= -16.15, `${c.id}: the host over the checker's stop at the monorail's north end (${JSON.stringify(at)})`);
      await holdUntil(A, BTN.B, () => !window.__app.current.traversal.attached, `${c.id}: the host lets go`);
      await until(A, () => { const p = window.__app.current.player.controller; return p.grounded && p.pos.y < 0.3; }, null, 8000, `${c.id}: the host lands on the bay floor`);
      const d = await hostFeet();
      assert(d[1] < 0.3 && Math.hypot(d[0] + 11.0, d[2] + 16.05) < 0.7, `${c.id}: way down alone: let go onto the bay floor by (-11.0, -16.05) (${JSON.stringify(d)})`);
    });
    await leg('S1 team door', () => teamDoor(0));
  });
}

if (want(4)) {
  // (sector-fixes-r fix) R3N's C2 is gone: R3S's C1b is walked twice, by the rope and by the relay
  await coop('sector ops (R): co-op section 2 - R3S by the rope and by the relay, the landing (C2) by the relay, the VNA gate', async (h) => {
    const { A, B, legUp, relay, pullUp, rope, bothOnTop, advance, teamDoor, leg } = h;
    await advance(0);
    await leg('S2 C1b', async () => {
      const c = route('S2 C1b');
      await legUp(c);
      await pullUp(A, `${c.id} host`);
      await rope(c, [-8.5, 2.2, PI / 2], [-7.6, 2.2]);
      await bothOnTop(c);
    });
    await leg('S2 C1b relay', async () => {
      const c = route('S2 C1b');
      const a = await legUp(c);
      await relay(c, a.id, [-7.7, 2.2]);
      await pullUp(A, `${c.id} host`);
      await pullUp(B, `${c.id} client`);
      await bothOnTop(c);
    });
    // (sector-fixes-r e2e fix, Michael M1 "Add another") C2: the landing on the x -4 wall, leg-up and relay
    await leg('S2 C2', async () => {
      const c = route('S2 C2');
      const a = await legUp(c);
      await relay(c, a.id, [-7.0, 2.65]);
      await pullUp(A, `${c.id} host`);
      await pullUp(B, `${c.id} client`);
      await bothOnTop(c);
    });
    await leg('S2 team door', () => teamDoor(1));
  });
}

if (want(5)) {
  await coop('sector ops (R): co-op section 3 - the valve platform by the relay, the drive platform by the rope, the lobby door', async (h) => {
    const { A, B, legUp, relay, pullUp, rope, bothOnTop, advance, teamDoor, leg } = h;
    await advance(0);
    await advance(1);
    await leg('S3 C1', async () => {
      const c = route('S3 C1');
      const a = await legUp(c);
      await relay(c, a.id, [18.0, 5.9]);
      await pullUp(A, `${c.id} host`);
      await pullUp(B, `${c.id} client`);
      await bothOnTop(c);
    });
    await leg('S3 C2', async () => {
      const c = route('S3 C2');
      await legUp(c);
      await pullUp(A, `${c.id} host`);
      await rope(c, [11.8, 5.8, 0], [11.8, 6.5]);
      await bothOnTop(c);
    });
    await leg('S3 team door', () => teamDoor(2));
  });
}

console.log(all.length ? 'console problems:\n' + all.join('\n') : 'no console errors');
process.exit(failed || all.length ? 1 : 0);
