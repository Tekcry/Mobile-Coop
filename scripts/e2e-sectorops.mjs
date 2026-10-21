// Sector Ops (feature/sector-ops slice 2): the Warehouse in three sections (A12). One solo walk through every section
// (objective, connector cycle, the next section loading behind the far door) to the extraction and a Ghost result; an
// alarm with its reinforcements and a kill that breaks the Ghost; everyone down restarting the section at its
// checkpoint (M7); and the nav check (M8): every route leg is walkable for the guards' nav grid, and a section is
// reached only through its connector. `?sectorGuards=4` keeps software GL quick (4 guards per section).
import { launch, frames, press, BTN, assert } from './e2e-lib.mjs';
import { until, hostAndJoin } from './e2e-net-lib.mjs';

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
      seals: (s.connector?.sealUnlocks ?? []).length,
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
  // shot's reach, so a loud gun here would alert it; no point of any guard's path has a line of sight to the spot.
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
  const s0 = await G(() => ({ stage: window.__sector.debug().stage, raised: window.__app.current.enemyMgr.alarmRaised }));
  const shot = await G(() => {
    const w = window.__app.current.weapons;
    const s = w.current;
    const m0 = s.mag;
    // the gun's own shot (the round, the impact, the shot noise through GameState's onShot hook)
    w.shoot();
    return { fired: m0 - s.mag, noise: s.stats.noise, id: s.def.id };
  });
  assert(shot.fired === 1 && shot.noise <= 0.6, `one suppressed shot fired (${JSON.stringify(shot)}) at ${JSON.stringify(spot)}`);
  await sim(4);
  const after = await G(() => {
    const em = window.__app.current.enemyMgr;
    const gs = em.enemies.filter((e) => e.alive);
    return { alerted: gs.filter((e) => e.alerted).length, levels: gs.map((e) => e.level), stage: window.__sector.debug().stage, raised: em.alarmRaised, lkp: em.lkpValid, music: window.__app.music.state };
  });
  assert(after.alerted === 0 && !after.lkp, `no guard is alerted by the suppressed shot (${JSON.stringify(after.levels)})`);
  assert(after.stage === s0.stage && after.raised === s0.raised, `the alarm stage is unchanged (${s0.stage} -> ${after.stage})`);
  assert(after.music !== 'alert', `the music stays out of Alert (${after.music})`);
  // the control: the same gun at the same spot with its suppression off (noise 1, the loud path) does alert the nearest
  // guard, so the check above could fail
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
  const ctl = await G((id) => {
    const em = window.__app.current.enemyMgr;
    const e = em.enemies.find((q) => q.id === id);
    return { nearest: e ? e.alerted : null, alerted: em.enemies.filter((q) => q.alive && q.alerted).length, lkp: em.lkpValid };
  }, spot.nearest);
  // (not lkp: with no sighting since the restart and nobody hunting yet, EnemyManager.update forgets it on the next tick)
  assert(ctl.nearest === true, `control: the same shot unsuppressed alerts the nearest guard (${JSON.stringify(ctl)}, noise back to ${loud})`);
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

console.log(all.length ? 'console problems:\n' + all.join('\n') : 'no console errors');
process.exit(failed || all.length ? 1 : 0);
