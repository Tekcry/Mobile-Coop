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
    // (sector-marks, G290) no exit beacon: the exit item is there (its zone) with nothing drawn
    const ex = await G((id) => { const it = window.__app.current.interactables.items.find((x) => x.id === `${id}-exit`); return it ? { parts: it.parts.length, light: it.light !== null } : null; }, s.id);
    assert(ex !== null && ex.parts === 0 && !ex.light, `section ${i + 1} (${s.id}): the exit has no beacon (${JSON.stringify(ex)})`);
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
    await sim(3.7);
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
      // (guard-ai S6 stack-tip fix) the panel path only: his contact call is cut at once, so nothing gets through and no
      // command call is owed (S6 A29: contact cut first = no radio alarm); else the command call (callIn + report, ~6.5 s
      // x reaction) beats his run to the panel. He stays in combat and is still the panel runner.
      em.radioNet.cut(best.num);
    });
    // (guard-ai S27 triage, S27-SEC1-TRIAGE.md) radio silence for the whole race: every call any guard opens is cut
    // within 0.5 s (a call holds >= 1.75 s: callIn 2.5 s x the fastest reaction 0.7), so no contact gets through and no
    // command call is owed. Since S24 (A149) a guard in combat with no intruder who then sees the player calls the
    // contact again, and S27 (A161) walks open-waiting role guards to cover after 3 s: a squadmate the runner's shout
    // joined can come into the player's view and his call beats the panel run. Both are wanted; this scenario is the
    // panel path only (the panel-vs-radio race is e2e-stealth-ai 'alarm'). The callers cut are in the asserts.
    const cutBy = {};
    const hush = () =>
      G((acc) => {
        const em = window.__app.current.enemyMgr;
        for (const e of em.enemies) {
          if (!e.alive) continue;
          const n = em.radioNet.cut(e.num);
          if (n > 0) acc[e.id] = (acc[e.id] ?? 0) + n;
        }
        return acc;
      }, cutBy).then((acc) => Object.assign(cutBy, acc));
    let runner = null;
    for (let k = 0; k < 12 && !runner; k++) {
      await sim(0.5);
      await hush();
      runner = await G(() => { const e = window.__app.current.enemyMgr.enemies.find((q) => q.alive && q.alarm); return e ? { id: e.id, panel: e.alarm.id, s: e.alarm.section } : null; });
    }
    assert(runner && runner.s === 1, `${tag}: an alerted guard runs to section 2's panel (${JSON.stringify(runner)})`);
    let raised = false;
    for (let k = 0; k < 80 && !raised; k++) {
      await sim(0.5);
      await hush();
      raised = await G(() => window.__app.current.enemyMgr.alarmRaised);
    }
    const d = await G(() => window.__sector.debug());
    // (guard-ai S6 stack merge) the stage rises through the panel, not the radio command call (S6: a contact call that
    // gets through also raises the alarm, ~6.5 s after the sighting), so the path this scenario names is asserted
    const by = await G(() => window.__app.current.enemyMgr.alarmBy);
    assert(raised && d.stage === st0 + 1, `${tag}: the panel raises the alarm stage (${st0} -> ${d.stage}, raised ${raised}; calls cut ${JSON.stringify(cutBy)})`);
    assert(by === 'panel', `${tag}: raised by the panel, not the radio (alarmBy '${by}'; calls cut ${JSON.stringify(cutBy)})`);
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
  // through a wall) puts him in combat, so the suppressed check above could fail.
  // (s1-shot-fix) Part 1 runs the live rAF loop: real-time frames in every gap (the spot read, `tp`, `sim`, the shot)
  // walk the guard on along his route, and through a wall his combat reach is only 0.45 q (~3.2 m) against the 0.35 q
  // (~2.5 m) spot. So `loop.manual` from here to the read (only `sim` steps the sim; restored in the read), and the
  // shot re-pins the report 0.35 q behind him where he stands at the shot.
  await G(() => { window.__app.loop.manual = true; });
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
  // (deflake) seeded Math.random from here to the read: the think cadence and the reaction draw on it, and real-time
  // frames before this left it anywhere; restored in the read below so later blocks are unaffected
  await G(() => {
    window.__rnd0 = Math.random;
    let sd = 0x5eed1;
    Math.random = () => {
      sd = (sd + 0x6d2b79f5) | 0;
      let q = Math.imul(sd ^ (sd >>> 15), 1 | sd);
      q = (q + Math.imul(q ^ (q >>> 7), 61 | q)) ^ q;
      return ((q ^ (q >>> 14)) >>> 0) / 4294967296;
    };
  });
  // facing the way he faces: away from him
  await tp(G, near.x, near.y, near.z, near.yaw);
  await sim(0.3);
  const fire = await G((id) => {
    const g = window.__app.current;
    const em = g.enemyMgr;
    const e = em.enemies.find((q) => q.id === id);
    const q = g.constructor.NOISE.shot * Math.pow(10, -em.hearingTable.combatDb / 20);
    const p0 = g.player.position;
    const before = Math.hypot(p0.x - e.pos.x, p0.y - e.pos.y, p0.z - e.pos.z);
    // the report from 0.35 q behind him where he stands now (he walked on during the settle), nav-snapped as above
    const x = e.pos.x - Math.sin(e.yaw) * 0.35 * q;
    const z = e.pos.z - Math.cos(e.yaw) * 0.35 * q;
    const c = g.nav.nearestWalkable(x, z, 2, e.pos.y);
    if (c >= 0) g.player.controller.teleport(new p0.constructor(g.nav.center(c)[0], g.nav.height[c], g.nav.center(c)[1]), e.yaw);
    const p = g.player.position;
    const s = g.weapons.current.stats;
    const n0 = s.noise;
    s.noise = 1;
    g.weapons.lastShotNoise = 1; // (sd-rounds) onShot reads the fired round's noise
    // the report only (no round towards him: a hit would alert him without hearing anything)
    g.weapons.events.onShot(g.weapons.current.def);
    s.noise = n0;
    return { before: +before.toFixed(2), d: +Math.hypot(p.x - e.pos.x, p.y - e.pos.y, p.z - e.pos.z).toFixed(2), q: +q.toFixed(2), level: e.level };
  }, spot.nearest);
  assert(fire.d < fire.q * 0.45, `the report is inside the nearest guard's combat reach through a wall at the shot (${JSON.stringify(fire)})`);
  // read after ~1 s (think cadence 0.22-0.3 s plus his reaction), not 0.5 s
  await sim(1.0);
  const ctl = await G((id) => {
    if (window.__rnd0) { Math.random = window.__rnd0; delete window.__rnd0; }
    window.__app.loop.manual = false;
    const em = window.__app.current.enemyMgr;
    const e = em.enemies.find((q) => q.id === id);
    return { nearest: e ? e.alerted : null, level: e ? e.level : null, alerted: em.enemies.filter((q) => q.alive && q.alerted).length };
  }, spot.nearest);
  assert(ctl.nearest === true, `control: a loud shot inside the combat reach alerts the nearest guard (${JSON.stringify(ctl)}, shot ${JSON.stringify(fire)})`);
});

// (E9-crate, A101-A105) the between-section weapons crate, solo, on the Warehouse: one per section, only the current
// section's live; a use tops every gun up to the starting loadout (guns only), once; a restart gives it back.
console.log('sector ops: the weapons crate (solo)');
await run(PARAMS, async ({ page, G, sim }) => {
  await G(() => { const g = window.__app.current; g.target.damageMul = 0; g.enemyMgr.update = () => {}; if (g.security) g.security.fixedUpdate = () => {}; });
  await sim(0.5);
  const crates = () => G(() => window.__sector.debug().crates);
  const c0 = await crates();
  assert(c0.length === 3 && c0.filter((c) => c.live).map((c) => c.id).join() === 'service-crate', `three crates, only service-crate live (${JSON.stringify(c0)})`);
  const kit = () => G(() => {
    const w = window.__app.current.weapons;
    return { slots: w.slots.map((s) => ({ mag: s.mag, res: s.reserve, size: s.stats.magSize, start: s.stats.magSize + s.def.reserve })), gad: JSON.stringify(w.gadgets.counts) };
  });
  const k0 = await kit();
  const drain = () => G(() => { for (const s of window.__app.current.weapons.slots) { s.mag = Math.min(3, s.stats.magSize); s.reserve = 0; } });
  const stand = (id) => G((id) => {
    const g = window.__app.current;
    const it = g.interactables.items.find((x) => x.id === id);
    const y = it.node.rotation.y;
    const P = g.player.position.constructor;
    g.player.controller.teleport(new P(it.pos.x + Math.sin(y) * 0.9, it.pos.y, it.pos.z + Math.cos(y) * 0.9), y + Math.PI);
  }, id);
  const near = () => G(() => window.__app.current.interactables.nearest(window.__app.current.player.position)?.id ?? null);
  const use = (id) => G((id) => { const g = window.__app.current; const it = g.interactables.items.find((x) => x.id === id); it.onUse(it, 'local'); }, id);
  await drain();
  await stand('service-crate');
  await sim(0.3);
  assert((await near()) === 'service-crate', 'the crate is offered at its start');
  await use('service-crate');
  const k1 = await kit();
  assert(k1.slots.every((s) => s.mag + s.res === s.start), `every gun is topped up to the starting loadout (${JSON.stringify(k1.slots)})`);
  assert(k1.slots.every((s, i) => s.mag === Math.min(3, k0.slots[i].size)), 'the magazines are not touched');
  assert(k1.gad === k0.gad, `the gadgets are unchanged (${k1.gad} / ${k0.gad})`);
  assert((await near()) === null, 'after the use the prompt is gone');
  await drain();
  await use('service-crate');
  const k2 = await kit();
  assert(k2.slots.every((s) => s.res === 0), `a second use does nothing (${JSON.stringify(k2.slots)})`);
  // the restart: the crate is offered again; the guns are the kit the section began with
  assert(await G(() => window.__sector.restartCheckpoint()), 'the checkpoint restart runs');
  await sim(1.5);
  const k3 = await kit();
  assert(k3.slots.every((s, i) => s.mag === k0.slots[i].mag && s.res === k0.slots[i].res), `the restart gives back the checkpoint kit (${JSON.stringify(k3.slots)})`);
  assert((await crates())[0].used.length === 0, 'the restart clears the crate ledger');
  await stand('service-crate');
  await sim(0.3);
  assert((await near()) === 'service-crate', 'after the restart the crate is offered again');
  // through section 1's objective and connector: section 2's crate goes live, section 1's off
  await G(() => { const m = window.__sector; m.run.downloading = true; m.run.download(999); });
  await sim(0.3);
  const S = await sections(G);
  await tp(G, S[0].cp.x, S[0].cp.y, S[0].cp.z, S[0].cp.yaw);
  await sim(4.6);
  const c1 = await crates();
  assert(c1.filter((c) => c.live).map((c) => c.id).join() === 'racking-crate', `after connector 1 only racking-crate is live (${JSON.stringify(c1)})`);
  await drain();
  await stand('racking-crate');
  await sim(0.3);
  assert((await near()) === 'racking-crate', 'section 2: its crate is offered at the checkpoint');
  await use('racking-crate');
  assert((await kit()).slots.every((s) => s.mag + s.res === s.start), 'section 2: one use tops up');
});

console.log('sector ops: nav (M8 routes, sealed sections)');
await run(PARAMS, async ({ G, sim }) => {
  await sim(0.3);
  const out = await G(() => {
    const g = window.__app.current;
    const nav = g.nav;
    const S = g.world.map.sectors;
    // (guard-ai S28) a locked shut door is shut on the guards' grid: this level read unlocks the doors for its queries and locks them back in the same evaluate (no frame between) (the connectors' near, far and seal doors are locked at load: sectorMode.findDoors)
    const held = g.world.doors.list.filter((d) => d.anchor.locked); for (const d of held) g.world.doors.setLocked(d, false);
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
    for (const d of held) g.world.doors.setLocked(d, true);
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
    // (sector-redesign slice L, protocol 31) light state: the host throws a wall switch; that circuit's lamps go dark on
    // the client too (the `lamps` message), and both pages' light fields read the same level under a lamp (the meter
    // and the guards read that field); switched back on, they come back on the client
    const sw = await GA(() => {
      const g = window.__app.current;
      const it = g.interactables.items.find((x) => x.id === 'switch-0');
      const grp = g.world.layout.switches[0].group;
      const l = g.world.level.lights.lights.find((q) => q.group === grp && q.kind !== 'flashlight');
      it.onUse(it, 'local');
      return { id: l.id, x: l.x, y: l.y, z: l.z, on: l.on };
    });
    assert(sw.on === false, 'the host switch puts its circuit out (host)');
    await until(B, (id) => { const l = window.__app.current.world.level.lights.lights[id]; return !l.on && !l.destroyed; }, sw.id, 8000, 'the host-switched lamp is dark on the client');
    const lvl = (P) => P.evaluate((p) => window.__app.current.world.lightField.levelAt(p.x, p.y - 2, p.z), sw);
    const [la, lb] = [await lvl(A), await lvl(B)];
    assert(Math.abs(la - lb) < 1e-3, `the light under the switched lamp agrees on both pages (host ${la}, client ${lb})`);
    // (guard-ai S15) a section guard who saw the cut may have turned it back on already (the breaker walk): press only while off
    await GA(() => { const g = window.__app.current; const it = g.interactables.items.find((x) => x.id === 'switch-0'); if (!g.stealth.switchOn(g.world.layout.switches[0].group)) it.onUse(it, 'local'); });
    await until(B, (id) => window.__app.current.world.level.lights.lights[id].on, sw.id, 8000, 'switched back on, the lamp is lit on the client');
    // (walk 4.72 S2) the client shoots a live lamp out: its round goes to the host (`shot` at `lt-<id>`), the host checks
    // and shoots it out, and the client sees it dark from the next `lamps`; both pages' light fields agree under it. The
    // lamp: a lit, shootable one near the client with a clear line from its chest (the host's own physics decides it)
    {
      const cp = await GB(() => { const p = window.__app.current.player.position; return { x: p.x, y: p.y, z: p.z }; });
      const lp = await GA((c) => {
        const g = window.__app.current;
        const V = g.player.position.constructor;
        const o = new V(c.x, c.y + 1.45, c.z);
        let best = null;
        for (const l of g.world.level.lights.lights) {
          if (l.kind === 'flashlight' || !l.on || l.destroyed || !l.destructible) continue;
          const dy = l.y - o.y;
          const h = Math.hypot(l.x - o.x, l.z - o.z);
          if (dy < 0.5 || dy > 7 || h > 14) continue;
          const b = new V(l.x, l.y, l.z);
          const d = V.Distance(o, b);
          if (g.ballistics.hitDistance(o, b, 1) < d - 0.05) continue;
          if (!best || d < best.d) best = { id: l.id, x: l.x, y: l.y, z: l.z, d };
        }
        return best;
      }, cp);
      assert(!!lp, `a lit, shootable lamp in clear sight of the client (${JSON.stringify(cp)})`);
      // the client aims (drawn: the host takes no hip fire) and its round runs from its chest through the lamp
      await GB(() => { window.__app.current.player.forceAds = true; });
      await until(A, () => [...window.__app.current.net.remotes.values()].some((r) => r.state?.mv?.dw === 2), null, 8000, 'the host sees the client drawn');
      await GA(() => {
        const n = window.__app.current.net;
        if (n.__lampLog) return;
        n.__lampLog = [];
        const f = n.onLampShot.bind(n);
        n.onLampShot = (r, m) => { const sh0 = window.__app.current.stealth.lightsShot; f(r, m); n.__lampLog.push({ target: m.target, o: [m.ox, m.oy, m.oz].map((v) => +v.toFixed(2)), d: [m.dx, m.dy, m.dz].map((v) => +v.toFixed(3)), dist: +m.dist.toFixed(2), w: m.w, dw: r.state?.mv?.dw, feet: [r.feet.x, r.feet.y, r.feet.z].map((v) => +v.toFixed(2)), shot: window.__app.current.stealth.lightsShot > sh0 }); };
      });
      // the client aims its camera at the lamp (the spring rig settles between passes) and fires its gun's own round
      // (`shoot()`: the real ray from the muzzle, the real `onRay` segment); its `lampRay` calls are logged
      await GB(() => {
        const n = window.__app.current.net;
        if (n.__rayLog) return;
        n.__rayLog = [];
        const f = n.lampRay.bind(n);
        n.lampRay = (a, b) => { n.__rayLog.push({ a: [a.x, a.y, a.z].map((v) => +v.toFixed(2)), b: [b.x, b.y, b.z].map((v) => +v.toFixed(2)) }); f(a, b); };
      });
      for (let i = 0; i < 6; i++) {
        await GB((l) => {
          const cam = window.__app.current.player.cam;
          const cp = cam.camera.position;
          const dx = l.x - cp.x, dy = l.y - cp.y, dz = l.z - cp.z;
          cam.yaw = Math.atan2(dx, dz);
          cam.pitch = Math.atan2(dy, Math.hypot(dx, dz));
          cam.snap();
        }, lp);
        await waitSim(120);
      }
      const sent = await GB((l) => {
        const g = window.__app.current;
        const on = g.world.level.lights.lights[l.id].on;
        const w = g.weapons;
        const m0 = w.current.mag;
        w.shoot();
        const ls = w.lastShot;
        return { on, fired: m0 - w.current.mag, last: ls && { o: [ls.origin.x, ls.origin.y, ls.origin.z].map((v) => +v.toFixed(2)), hit: [ls.hit.x, ls.hit.y, ls.hit.z].map((v) => +v.toFixed(2)), target: ls.target }, rays: window.__app.current.net.__rayLog };
      }, lp);
      console.log('  client round', JSON.stringify(sent), 'lamp', JSON.stringify(lp));
      assert(sent.on, `the client's lamp is lit before its round lands (${JSON.stringify(sent)})`);
      const outA = await until(A, (id) => window.__app.current.world.level.lights.lights[id].destroyed, lp.id, 8000, 'the client\'s round shoots the host\'s lamp out').then(() => true, () => false);
      if (!outA) console.error('  host lamp-shot log', JSON.stringify(await GA(() => window.__app.current.net.__lampLog)), 'lamp', JSON.stringify(lp));
      assert(outA, `the client's round shoots the lamp out on the host (lamp ${lp.id})`);
      await until(B, (id) => { const l = window.__app.current.world.level.lights.lights[id]; return l.destroyed && !l.on; }, lp.id, 8000, 'the client sees its shot lamp dark');
      const lvS = (P) => P.evaluate((p) => window.__app.current.world.lightField.levelAt(p.x, p.y - 2, p.z), lp);
      const [sa, sb] = [await lvS(A), await lvS(B)];
      assert(Math.abs(sa - sb) < 1e-3, `the light under the client-shot lamp agrees on both pages (host ${sa}, client ${sb})`);
      await GB(() => { window.__app.current.player.forceAds = false; });
    }
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
    // (E9-crate, A101-A106) the weapons crate on two pages: section 2's crate is live; the client mirrors it, drains and
    // uses it (topped up to its loadout, its prompt gone); the host's prompt stays; a second use after a drain does
    // nothing; the host's ledger lists the client; the host's restart brings the client's prompt back.
    {
      const cr = await GA(() => {
        const g = window.__app.current;
        const it = g.interactables.items.find((x) => x.id === 'racking-crate');
        return { live: it.enabled, x: it.pos.x, y: it.pos.y, z: it.pos.z, yaw: it.node.rotation.y, who: [...g.net.remotes.keys()][0] };
      });
      assert(cr.live, 'the host has section 2\'s crate live');
      await until(B, () => { const it = window.__app.current.interactables.items.find((x) => x.id === 'racking-crate'); return !!it && it.enabled && it.kind === 'crate'; }, null, 15000, 'the client mirrors the live weapons crate');
      const at = (P, dz) => P.evaluate((c) => { const g = window.__app.current; const k = g.player.position.constructor; g.player.controller.teleport(new k(c.x + Math.sin(c.yaw) * 0.9, c.y, c.z + Math.cos(c.yaw) * 0.9 + c.dz), c.yaw + Math.PI); }, { ...cr, dz });
      await GA(() => { for (const r of window.__app.current.net.remotes.values()) r.allowTeleport(3); });
      await at(B, 0);
      await at(A, 0.8);
      await until(A, (c) => { const r = [...window.__app.current.net.remotes.values()][0]; return Math.hypot(r.feet.x - c.x, r.feet.z - c.z) < 1.6; }, cr, 15000, 'the host sees the client at the crate');
      const drain = (P) => P.evaluate(() => { for (const s of window.__app.current.weapons.slots) { s.mag = Math.min(3, s.stats.magSize); s.reserve = 0; } });
      const tot = (P) => P.evaluate(() => { const w = window.__app.current.weapons; return { eq: w.slots.every((s) => s.mag + s.reserve === s.stats.magSize + s.def.reserve), dry: w.slots.every((s) => s.reserve === 0), full: w.atLoadout() }; });
      // (crate-client-fix) the crate's prompt only: the stand points are 1.27 m (client) and 0.57 m (host) from the C2 far
      // door's item (reach 1.4, unlocked by the cycle), so once the client has used the crate its nearest item is that
      // door, never null (tests/weaponsCrate.test.ts pins the geometry)
      const nearId = (P) => P.evaluate(() => window.__app.current.interactables.nearest(window.__app.current.player.position, undefined, 'crate')?.id ?? null);
      const useB = () => GB(() => { const it = window.__app.current.interactables.items.find((x) => x.id === 'racking-crate'); it.onUse(it); });
      await drain(B);
      assert((await nearId(B)) === 'racking-crate', 'the client is offered the crate');
      await useB();
      await until(B, () => window.__app.current.weapons.atLoadout(), null, 10000, 'the client\'s guns are topped up to its loadout');
      assert((await tot(B)).eq, 'the client totals equal its loadout');
      await until(B, () => { const g = window.__app.current; const it = g.interactables.items.find((x) => x.id === 'racking-crate'); return it?.spent === true && g.interactables.nearest(g.player.position, undefined, 'crate') === null; }, null, 5000, 'the client\'s crate prompt is gone');
      assert((await nearId(A)) === 'racking-crate', 'the host is still offered the crate');
      const dbg = await GA(() => window.__sector.debug().crates.find((c) => c.id === 'racking-crate'));
      assert(dbg.used.includes(cr.who) && !dbg.used.includes('local') && dbg.live, `the host ledger lists the client (${JSON.stringify(dbg)})`);
      await drain(B);
      await useB();
      await new Promise((r) => setTimeout(r, 1500));
      const again = await tot(B);
      assert(again.dry && !again.full, `a second use after a drain does nothing (${JSON.stringify(again)})`);
      await GA(() => window.__sector.restartCheckpoint());
      await until(B, () => { const it = window.__app.current.interactables.items.find((x) => x.id === 'racking-crate'); return !!it && !it.spent; }, null, 15000, 'after the host\'s restart the client\'s crate prompt is back');
    }
  } catch (e) {
    failed = true;
    console.error(String(e));
  } finally {
    clearInterval(pump);
    all.push(...eA, ...eB);
    await browser.close();
  }
}

// (walk 4.72 S2) Saltmarsh Park's street lamps: the head sits on top of its 6 m pole, so a round aimed at it from the
// ground lands on the pole just under the head (`LAMP_MOUNT_REACH`). The client's real round (camera aimed, the gun's own
// `shoot()`) at the lane lamp goes to the host and both pages go dark there; the host's own round does the same to a
// car-park lamp. Before the fix neither page's round broke either lamp (the probe on 4.72's code: 0 of 13).
console.log('sector ops: co-op street lamps on Saltmarsh Park (client and host rounds)');
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
          const loop = () => { window.__raf++; requestAnimationFrame(loop); };
          requestAnimationFrame(loop);
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
  /** Page P stands at `s`, aims (drawn) at lamp `l` and fires one round; true when it fired. */
  const fireAt = async (P, s, l, headless) => {
    await P.evaluate(([s, l]) => { const g = window.__app.current; g.player.forceAds = true; g.player.controller.teleport(new g.player.position.constructor(s[0], s[1], s[2]), Math.atan2(l.x - s[0], l.z - s[2])); }, [s, l]);
    await waitSim(900);
    for (let i = 0; i < 6; i++) {
      await P.evaluate(([l, h]) => {
        const cam = window.__app.current.player.cam;
        const cp = cam.camera.position;
        const dx = l.x - cp.x, dy = l.y - cp.y, dz = l.z - cp.z;
        cam.yaw = Math.atan2(dx, dz);
        cam.pitch = Math.atan2(dy, Math.hypot(dx, dz));
        cam.snap();
        if (h) window.__app.loop.stepHeadless(0.1);
      }, [l, headless]);
      if (!headless) await waitSim(100);
    }
    return P.evaluate(() => { const w = window.__app.current.weapons; const m0 = w.current.mag; w.shoot(); const ls = w.lastShot; return { fired: m0 - w.current.mag, hit: ls && [ls.hit.x, ls.hit.y, ls.hit.z].map((v) => +v.toFixed(2)), target: ls?.target }; });
  };
  const lampAt = (P, x, z) => P.evaluate(([x, z]) => { const l = window.__app.current.world.level.lights.lights.find((q) => q.kind !== 'flashlight' && Math.abs(q.x - x) < 0.01 && Math.abs(q.z - z) < 0.01 && q.y > 5); return l && { id: l.id, x: l.x, y: l.y, z: l.z, on: l.on, destroyed: l.destroyed, destructible: l.destructible }; }, [x, z]);
  try {
    await startMode('sector', 'campusOps');
    await until(B, () => !!window.__app.current?.net && window.__app.current.world.level.lights.lights.length > 0, null, 15000, 'the client is in the match');
    // the lane lamp (9, 6, -66) and a car-park lamp (-34, 6, -62): lit and shootable on both pages, the same ids
    const [la, lb] = [await lampAt(A, 9, -66), await lampAt(B, 9, -66)];
    const [pa, pb] = [await lampAt(A, -34, -62), await lampAt(B, -34, -62)];
    assert(!!la && !!lb && la.id === lb.id && la.on && lb.on && la.destructible && !!pa && !!pb && pa.id === pb.id && pa.on, `the street lamps are lit, shootable and the same on both pages (${JSON.stringify([la, lb, pa, pb])})`);
    // the client: 3 m east of the lane lamp, its real round
    await until(A, () => [...window.__app.current.net.remotes.values()].length > 0, null, 8000, 'the host has the client');
    await GB(() => { window.__app.current.player.forceAds = true; });
    await until(A, () => [...window.__app.current.net.remotes.values()].some((r) => r.state?.mv?.dw === 2), null, 8000, 'the host sees the client drawn');
    const cs = await fireAt(B, [12, 0.02, -66], lb, false);
    assert(cs.fired === 1, `the client fires one round at the lane lamp (${JSON.stringify(cs)})`);
    const outA = await until(A, (id) => window.__app.current.world.level.lights.lights[id].destroyed, la.id, 8000, 'host lamp out').then(() => true, () => false);
    assert(outA, `the client's round on the lane lamp's pole top shoots it out on the host (${JSON.stringify(cs)}, lamp ${JSON.stringify(la)})`);
    await until(B, (id) => { const l = window.__app.current.world.level.lights.lights[id]; return l.destroyed && !l.on; }, lb.id, 8000, 'the client sees the lane lamp dark');
    const lv = (P, l) => P.evaluate((p) => window.__app.current.world.lightField.levelAt(p.x, 0.9, p.z), l);
    const [va, vb] = [await lv(A, la), await lv(B, la)];
    assert(Math.abs(va - vb) < 1e-3, `the light under the lane lamp agrees on both pages (host ${va}, client ${vb})`);
    await GB(() => { window.__app.current.player.forceAds = false; });
    // the host: 3 m east of the car-park lamp, its own round
    const hs = await fireAt(A, [-31, 0.02, -62], pa, true);
    const hOut = await GA((id) => window.__app.current.world.level.lights.lights[id].destroyed, pa.id);
    assert(hs.fired === 1 && hOut, `the host's round on the car-park lamp's pole top shoots it out (${JSON.stringify(hs)})`);
    await until(B, (id) => window.__app.current.world.level.lights.lights[id].destroyed, pb.id, 8000, 'the client sees the car-park lamp dark');
    await GA(() => { window.__app.current.player.forceAds = false; });
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
// (sector-fixes-r RE) Slice R: the co-op-only routes and the team doors (docs/archive/sector-fixes/r/R1.md, R2.md, R3.md, RT.md;
// report docs/archive/sector-fixes/r/RE.md). Yaw 0 faces +z, PI / 2 faces +x.
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
          // (sector-fixes-r2 nav) the guards' nav grid: the bolted doorway is shut (its centre cell blocked, no short
          // path through), so a guard re-routes instead of stalling at the locked door. (sector-redesign fix) `line` is
          // the guards' own path from 1.2 m in front to 1.2 m behind (findPath, as a guard plans it), through the doorway
          // when it is no longer than the straight 2.4 m + 1 m: a straight lineClear there is no measure, its ends land in
          // furniture-blocked cells (the mess worktop, door 0; the lobby side, door 2) and the door centre sits on a cell
          // boundary, so it was false with the doorway open
          const navThrough = () => G(([ax, az, sx, sz, door]) => {
            const g = window.__app.current;
            const n = g.nav;
            const y = g.world.doors.list[door].anchor.hinge.y;
            const a = [ax - sx * 1.2, az - sz * 1.2];
            const p = n.findPath(a, [ax + sx * 1.2, az + sz * 1.2], 20000, y, y);
            let len = p ? 0 : -1;
            let px = a[0];
            let pz = a[1];
            for (const w of p ?? []) { const wx = w.x ?? w[0]; const wz = w.z ?? w[1]; len += Math.hypot(wx - px, wz - pz); px = wx; pz = wz; }
            return { open: n.isWalkable(n.cellOf(ax, az, y)), line: len >= 0 && len <= 3.4, len: +len.toFixed(2) };
          }, [ax, az, sx, sz, b.door]);
          const n0 = await navThrough();
          assert(!n0.open && !n0.line, `${tag}: bolted, the doorway is shut on the guards' nav grid (${JSON.stringify(n0)})`);
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
          const n1 = await navThrough();
          assert(n1.open && n1.line, `${tag}: unbolted, the doorway is open on the guards' nav grid (${JSON.stringify(n1)})`);
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
          const n2 = await navThrough();
          assert(!n2.open && !n2.line, `${tag}: re-bolted, the doorway is shut on the nav grid again (${JSON.stringify(n2)})`);
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
  /** A tap of the pad's A on page P (interact: the context menu's row runs on the release). */
  const tapA = async (P) => {
    await P.evaluate(() => window.__pad.set(0, 1));
    await waitSim(250);
    await P.evaluate(() => window.__pad.set(0, 0));
    await waitSim(400);
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
        return { mirrored: !!it, on: it?.enabled ?? null, nearest: n?.id ?? null, rows: g.ctxMenu.opts.slice(0, g.ctxMenu.count).map((o) => o.label) };
      }, b.id);
      assert(near.mirrored && near.on === true && near.nearest !== b.id && !near.rows.includes('Unbolt'), `${tag}: the client mirrors the Unbolt but is not offered it on the near side, no Unbolt row (${JSON.stringify(near)})`);
      // (walk 4.72 S3) the real A on the near side does not draw it; nor does the item's use sent from there by hand
      await tapA(B);
      await GB((id) => { const it = window.__app.current.interactables.items.find((q) => q.id === id); if (it) it.onUse(it); }, b.id);
      await waitSim(1500);
      const still = (await GA(() => window.__sector.boltInfo())).find((q) => q.id === b.id);
      const cl0 = await GB((d) => window.__app.current.world.doors.list[d].anchor.locked, b.door);
      assert(still.shut && still.locked === true && cl0 === true, `${tag}: the client's use from the near side is refused, locked on both pages (${JSON.stringify(still)}, client ${cl0})`);
      // far side: the client is offered "Unbolt" and uses it
      await moveClient(ax + sx * 0.8, az + sz * 0.8, Math.atan2(-sx, -sz));
      await waitSim(800);
      const far = await GB(() => { const g = window.__app.current; const n = g.interactables.nearest(g.player.position); return { nearest: n?.id ?? null, label: n?.label ?? null, rows: g.ctxMenu.opts.slice(0, g.ctxMenu.count).map((o) => o.label) }; });
      assert(far.nearest === b.id && far.label === 'Unbolt' && far.rows.includes('Unbolt'), `${tag}: the client on the far side is offered "Unbolt" (${JSON.stringify(far)})`);
      // (walk 4.72 S3) the client presses A (the real button: its context menu row), not a scripted use
      await tapA(B);
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

// ---------------------------------------------------------------------------------------------------------------------
// (sector-redesign slice 1, `--part=6`) Saltmarsh Park (campusOps), part 1: section 1, the gatehouse, car park and
// forecourt (docs/sector-redesign/SPEC.md "S1", PLAN slice 1). Solo: (a) the map boots with eight guards and no console
// errors, (b) a scripted nav walk verge -> rear window -> download -> C1 -> the connector seals -> the S2 stub loads, (c)
// the feeder board cuts s1-park-w and the meter at a west-row point reads under the shadow line, (d) two CR1 solo probes
// (a running jump at the canopy's east lip from the kerb, a wall jump from the bin-store / plant-room walls) never stand on
// the canopy or the plant roof. Skipped (PLAN's bonus list, logged in docs/sector-redesign/checks/slice1-build.md): the
// co-op legs (leg-up onto the canopy, the drop takedown), the verge vantage and cam-walk coverage, the revive on the roof.
// (slice 2) Section 2, the HQ atrium and offices (SPEC "S2"): in the same first run (a) S2 loads with 12 guards (3 G, 6 L1, 3 L2) and its
// three cameras, (b) the stealth route C1 far door -> post room -> SW stair -> L1 north open plan -> facilities office, the 3 s BMS hack
// opens C2's card door, (d) the reception panel board (LR16-4, untimed) cuts s2-atrium and #1 walks to it; in the probe run (c) the CR2 nose is never held
// alone (cafe floor, cafe table, feature stair, a wall jump off the hall's east wall). Skipped: the co-op leg-up + human ladder at CR2 (this
// part has no co-op helper), the balustrade probe (the balustrade is on L1: a solo up there is already on the slab).
const CAMPUS = 'autostart=campusOps&mode=sector';

if (want(6)) {
  console.log('campus ops (S1, S2): boots with eight guards; a nav walk verge -> rear window -> download -> C1 -> S2 (12 guards), the stealth walk to the BMS hack, the reception panel');
  await run(CAMPUS, async ({ page, G, sim }) => {
    await sim(0.6);
    // (a) the map boots: eight guards in, five sections, the run starts on section 1's download, every door into a later section locked
    const alive = await G(() => window.__app.current.enemyMgr.alive);
    assert(alive === 8, `campusOps section 1 has 8 guards in (${alive})`);
    await G(() => { const g = window.__app.current; g.target.damageMul = 0; g.enemyMgr.update = () => {}; if (g.security) g.security.fixedUpdate = () => {}; });
    const S = await sections(G);
    assert(S.length === 5 && S[0].id === 's1' && S[0].kind === 'download' && S[0].guards === 8 && S[1].id === 's2' && S[1].kind === 'hack' && S[1].guards === 12 && S[2].id === 's3' && S[2].guards === 16 && S[3].id === 's4' && S[3].guards === 20 && S[4].id === 's5' && S[4].guards === 24, `five sections, section 1 a download with 8 guards, section 2 a hack with 12, section 3 built with 16, section 4 built with 20, section 5 built with 24 (${JSON.stringify(S.map((s) => [s.id, s.guards]))})`);
    const d0 = await G(() => window.__sector.debug());
    assert(d0.index === 0 && d0.phase === 'objective' && d0.nearLocked === true && d0.farLocked === true && d0.live === 0, `the run starts on section 1's objective, C1 locked (${JSON.stringify([d0.index, d0.phase, d0.nearLocked, d0.farLocked, d0.live])})`);
    // (E9-crate) section 1's weapons crate is the only live one at the start
    const cr0 = await G(() => window.__sector.debug().crates);
    assert(cr0.filter((c) => c.live).map((c) => c.id).join() === 's1-crate', `S1's weapons crate is live at the start, no other (${JSON.stringify(cr0)})`);
    const cams = await G(() => window.__ctdev.debug().cams.map((c) => [c.id, c.live]));
    assert(cams.length === 13 && JSON.stringify(cams.filter((c) => c[1]).map((c) => c[0])) === '["cam-gate","cam-walk"]', `13 cameras on the map (S1 2, S2 3, S3 2, S4 3, S5 3), cam-gate and cam-walk live in section 1 (${JSON.stringify(cams)})`);
    // nav: every walked leg of the three routes has a path on the guards' real grid (the climbs are the ladder and the drop)
    const nv = await G(() => {
      const g = window.__app.current;
      const fails = [];
      let legs = 0;
      // (guard-ai S28) a locked shut door is shut on the guards' grid: this level read unlocks the doors for its queries and locks them back in the same evaluate (no frame between)
      const held = g.world.doors.list.filter((d) => d.anchor.locked); for (const d of held) g.world.doors.setLocked(d, false);
      for (const r of g.world.map.sectors[0].routes) {
        for (let i = 0; i + 1 < r.pts.length; i++) {
          if ((r.climbs ?? []).includes(i)) continue;
          const a = r.pts[i];
          const c = r.pts[i + 1];
          legs++;
          if (!g.nav.findPath([a[0], a[1]], [c[0], c[1]], 60000, a[2] ?? 0, c[2] ?? 0)) fails.push(`${r.name} leg ${i}`);
        }
      }
      for (const d of held) g.world.doors.setLocked(d, true);
      return { legs, fails };
    });
    console.log(`  ${nv.legs} route legs checked`);
    assert(nv.fails.length === 0, `every walked route leg has a nav path (${nv.fails.join('; ')})`);
    // (b) the walk: the stealth route to the rear window, the download from outside it, then C1
    const route = await G(() => window.__app.current.world.map.sectors[0].routes[0].pts);
    await tp(G, route[1][0], 0, route[1][1], -Math.PI / 2);
    await sim(0.3);
    // at the open window: 1.15 m from the PC
    await tp(G, 20.6, 0, -76, -Math.PI / 2);
    await sim(0.4);
    const near = await G(() => { const g = window.__app.current; const it = g.interactables.items.find((x) => x.id === 's1-obj'); return it ? Math.hypot(it.pos.x - g.player.position.x, it.pos.z - g.player.position.z) : -1; });
    assert(near > 0 && near < 1.8, `the PC is inside the interact reach from the open window (${near.toFixed(2)} m)`);
    await press(page, BTN.A);
    await sim(10.8);
    const dl = await G(() => window.__sector.debug());
    assert(dl.phase === 'connector' && dl.nearLocked === false && dl.farLocked === true, `the 10 s download from the verge opens C1 (${JSON.stringify([dl.phase, dl.nearLocked, dl.farLocked])})`);
    // the rest of the stealth route to the door (teleported leg by leg, the legs themselves are the nav check above), then into C1
    for (let i = 2; i < route.length - 2; i++) {
      await tp(G, route[i][0], 0, route[i][1], 0);
      await sim(0.1);
    }
    // (s6-c1-fix) this part runs the live rAF loop beside `sim`: every real frame between the evaluates steps up to 0.1 s
    // more, so the 1.3 s check (hold 1.0 + cycle 0.3, the load at cycle 1.5) had 1.2 s of slack; a busy laptop GPU run
    // used it and caught section 2 already in (["locked",true,12,1]). Only `sim` steps the sim through the cycle.
    await G(() => { window.__app.loop.manual = true; });
    await tp(G, S[0].cp.x, S[0].cp.y, S[0].cp.z, S[0].cp.yaw);
    await sim(1.3);
    const cyc = await G(() => ({ d: window.__sector.debug(), n: window.__app.current.enemyMgr.enemies.length }));
    assert(cyc.d.conn === 'cycling' && cyc.d.nearLocked === true && cyc.n === 0 && cyc.d.live === -1, `C1 cycles: the near door locks, section 1 unloads (${JSON.stringify([cyc.d.conn, cyc.d.nearLocked, cyc.n, cyc.d.live])})`);
    await sim(3.2);
    const nx = await G(() => ({ d: window.__sector.debug(), obj: !!window.__app.current.interactables.items.find((x) => x.id === 's2-obj'), alive: window.__app.current.enemyMgr.alive }));
    await G(() => { window.__app.loop.manual = false; });
    assert(nx.d.index === 1 && nx.d.id === 's2' && nx.d.phase === 'objective' && nx.d.live === 1, `section 2 loads behind the far door (${JSON.stringify([nx.d.index, nx.d.id, nx.d.phase, nx.d.live])})`);
    assert(nx.d.doors[0].far === false && nx.d.doors[0].seal.length === 1 && nx.d.doors[0].seal.every((x) => x === false), `C1's far door and the dock door unlocked (${JSON.stringify(nx.d.doors[0])})`);
    assert(nx.obj && nx.alive === 12, `section 2 loads with its objective and its 12 guards (${JSON.stringify([nx.obj, nx.alive])})`);
    assert(Math.abs(nx.d.checkpoint.x - S[0].cp.x) < 0.01 && Math.abs(nx.d.checkpoint.z - S[0].cp.z) < 0.01, 'C1 is the checkpoint');
    // (E9-crate) after C1 the S2 crate is live (S1's is off); one use tops the guns up to the loadout
    const cr1 = await G(() => window.__sector.debug().crates);
    assert(cr1.filter((c) => c.live).map((c) => c.id).join() === 's2-crate', `after C1 only S2's weapons crate is live (${JSON.stringify(cr1)})`);
    const cu = await G(() => {
      const g = window.__app.current;
      const w = g.weapons;
      const gad = JSON.stringify(w.gadgets.counts);
      for (const s of w.slots) { s.mag = Math.min(3, s.stats.magSize); s.reserve = 0; }
      const it = g.interactables.items.find((x) => x.id === 's2-crate');
      const y = it.node.rotation.y;
      const P = g.player.position.constructor;
      g.player.controller.teleport(new P(it.pos.x + Math.sin(y) * 0.9, it.pos.y, it.pos.z + Math.cos(y) * 0.9), y + Math.PI);
      const offered = g.interactables.nearest(g.player.position)?.id ?? null;
      it.onUse(it, 'local');
      return { offered, eq: w.slots.every((s) => s.mag + s.reserve === s.stats.magSize + s.def.reserve), gad: JSON.stringify(w.gadgets.counts) === gad, gone: g.interactables.nearest(g.player.position) === null };
    });
    assert(cu.offered === 's2-crate' && cu.eq && cu.gad && cu.gone, `S2's crate tops the guns up to the loadout once and the prompt goes (${JSON.stringify(cu)})`);
    // ---- (slice 2) section 2, the HQ atrium and offices (docs/sector-redesign/SPEC.md "S2"): 12 armed guards over three floors, cam-turnstile / cam-lift / cam-bridge live, C2 locked
    const s2 = await G(() => {
      const g = window.__app.current;
      const es = g.enemyMgr.enemies.filter((q) => q.alive);
      const per = [0, 0, 0];
      for (const q of es) per[q.pos.y < 2 ? 0 : q.pos.y < 6 ? 1 : 2]++;
      return { per, cams: window.__ctdev.debug().cams.filter((c) => c.live).map((c) => c.id) };
    });
    assert(JSON.stringify(s2.per) === '[3,6,3]', `section 2 has 3 guards on G, 6 on L1 and 3 on L2 (${JSON.stringify(s2.per)})`);
    assert(JSON.stringify(s2.cams) === '["cam-turnstile","cam-lift","cam-bridge"]', `the three S2 cameras are live, the S1 pair is not (${JSON.stringify(s2.cams)})`);
    assert(nx.d.nearLocked === true && nx.d.farLocked === true, `C2's doors start locked (${JSON.stringify([nx.d.nearLocked, nx.d.farLocked])})`);
    // nav: every walked leg of the three S2 routes (the stealth walk through the SW stair, the roof route, the loud route by the feature stair) has a path on the guards' real grid
    const nv2 = await G(() => {
      const g = window.__app.current;
      const fails = [];
      let legs = 0;
      // (guard-ai S28) a locked shut door is shut on the guards' grid: this level read unlocks the doors for its queries and locks them back in the same evaluate (no frame between)
      const held = g.world.doors.list.filter((d) => d.anchor.locked); for (const d of held) g.world.doors.setLocked(d, false);
      for (const r of g.world.map.sectors[1].routes) {
        for (let i = 0; i + 1 < r.pts.length; i++) {
          const a = r.pts[i];
          const c = r.pts[i + 1];
          legs++;
          if (!g.nav.findPath([a[0], a[1]], [c[0], c[1]], 200000, a[2] ?? 0, c[2] ?? 0)) fails.push(`${r.name} leg ${i}`);
        }
      }
      for (const d of held) g.world.doors.setLocked(d, true);
      return { legs, fails };
    });
    console.log(`  ${nv2.legs} S2 route legs checked`);
    assert(nv2.fails.length === 0, `every S2 route leg has a nav path (${nv2.fails.join('; ')})`);
    // (b) the stealth walk C1 far door -> post room -> SW stair -> L1 north open plan -> facilities office (teleported point by point, the legs are the nav check above), then the 3 s hack at the BMS terminal
    const r2 = await G(() => window.__app.current.world.map.sectors[1].routes[0].pts);
    const objI = await G(() => window.__app.current.world.map.sectors[1].routes[0].obj);
    // #7, the facilities officer, spawns at (-6.5, 2.9) on L1: the very spot the hacker stands on, and the guards are frozen
    // here. A player hacks while he is at his patrol's other stop (-2.5, 4.2; waits 28 / 6), so put him there; left on the
    // spot he is a takedown offer ("Grab character", row 1 of the context menu above the hack) and the hold grabs him.
    const op7 = await G(() => {
      const g = window.__app.current;
      const e = g.enemyMgr.enemies.find((q) => q.alive && q.pos.y > 2 && Math.hypot(q.pos.x + 6.5, q.pos.z - 2.9) < 0.6);
      if (!e) return false;
      e.pos.set(-2.5, e.pos.y, 4.2);
      e.yaw = 0;
      return true;
    });
    assert(op7, 'S2 #7 (the facilities officer) stands at the BMS desk on load');
    for (let i = 0; i <= objI; i++) {
      await tp(G, r2[i][0], r2[i][2] ?? 0, r2[i][1], 0);
      await sim(0.1);
    }
    await sim(0.3);
    const near2 = await G(() => { const g = window.__app.current; const it = g.interactables.items.find((x) => x.id === 's2-obj'); return it ? Math.hypot(it.pos.x - g.player.position.x, it.pos.z - g.player.position.z) : -1; });
    assert(near2 > 0 && near2 < 1.8, `the BMS terminal is inside the interact reach from the desk's south side (${near2.toFixed(2)} m)`);
    const row1 = await G(() => { const g = window.__app.current; return { offer: !!g.takedown.offer, rows: g.ctxMenu.opts.slice(0, g.ctxMenu.count).map((o) => o.label) }; });
    assert(!row1.offer && row1.rows[0] === 'Hack', `the hack is row 1 of the context menu, no takedown on offer (${JSON.stringify(row1)})`);
    await G(() => window.__pad.set(0, 1));
    await sim(3.4);
    await G(() => window.__pad.set(0, 0));
    await sim(0.3);
    const hk = await G(() => window.__sector.debug());
    assert(hk.phase === 'connector' && hk.nearLocked === false && hk.farLocked === true, `the 3 s hack opens C2's card door (${JSON.stringify([hk.phase, hk.nearLocked, hk.farLocked])})`);
    // (d) the reception panel (LR16-4: an untimed breaker board, `board-<k>`): the cut takes s2-atrium (the three pendants and the reception downlight: #1 sees his own room go dark) and #1 walks to it (the guards run again; the player waits in the dark plant room)
    await G(() => { const g = window.__app.current; delete g.enemyMgr.update; const P = g.player.position.constructor; g.player.controller.teleport(new P(2.5, 0, -24), 0); });
    await sim(0.5);
    const pn = await G(() => {
      const g = window.__app.current;
      const bds = g.world.layout.boards;
      const k = bds.findIndex((q) => q.groups.includes(50) && !q.window);
      const onGroup = g.world.layout.switches.filter((q) => q.group === 50).length;
      const es = g.enemyMgr.enemies;
      let idx = -1;
      let bd = 1e9;
      es.forEach((q, i) => { if (!q.alive || q.pos.y > 2) return; const d = Math.hypot(q.pos.x + 20, q.pos.z + 24.9); if (d < bd) { bd = d; idx = i; } });
      const e = es[idx];
      return { k, idx, d0: Math.hypot(e.pos.x - bds[k].pos.x, e.pos.z - bds[k].pos.z), onGroup, on: g.world.level.lights.lights.filter((l) => l.group === 50 && l.on).length };
    });
    assert(pn.k >= 0 && pn.onGroup === 0 && pn.on === 4 && pn.d0 > 9, `the reception panel is an untimed breaker board on s2-atrium, no switch on it (3 pendants and the reception downlight lit), #1 stands ${pn.d0.toFixed(1)} m off it (${JSON.stringify(pn)})`);
    await G((k) => { const g = window.__app.current; const it = g.interactables.items.find((x) => x.id === `board-${k}`); it.onUse(it, 'local'); }, pn.k);
    // (guard-ai S15, A42; laptop fix 884b89c0) the cut is a breaker fault: #1, the witness nearest the panel by path, walks
    // to it at his patrol pace and turns s2-atrium back on (master's light check sent a pair and left it dark): his
    // nearest approach and the relight over 25 s of sim, half-second steps
    const pa = await G(([k, idx]) => {
      const g = window.__app.current;
      const sw = g.world.layout.boards[k];
      const e = g.enemyMgr.enemies[idx];
      const lit = () => g.world.level.lights.lights.filter((l) => l.group === 50 && l.on).length;
      const off = lit();
      let task = -1;
      let dMin = 1e9;
      let back = -1;
      let cut1 = -1;
      for (let t = 0.5; t <= 25; t += 0.5) {
        window.__app.loop.stepHeadless(0.5);
        if (t === 0.5) task = e.breakerGroup;
        dMin = Math.min(dMin, Math.hypot(e.pos.x - sw.pos.x, e.pos.z - sw.pos.z));
        if (back < 0 && lit() === 4) back = t;
      }
      cut1 = g.stealth.boards.cut[k];
      return { off, task, dMin, back, cut1, alive: e.alive, on: lit() };
    }, [pn.k, pn.idx]);
    await sim(0.1);
    assert(pa.off === 0 && pa.task === 50, `the panel cut s2-atrium (lamps on ${pa.off}) and sends #1 to reset it (breaker task, circuit ${pa.task})`);
    assert(pa.alive && pa.dMin < 2 && pa.back > 0 && pa.on === 4 && pa.cut1 === 0, `#1 walked to the board and switched s2-atrium back on (board cut ${pa.cut1}, ${pn.d0.toFixed(1)} m -> ${pa.dMin.toFixed(1)} m, relit at ${pa.back} s, lamps on ${pa.on})`);
  });

  console.log('campus ops (S1): the feeder pillar board cuts s1-park-w; the west half goes dark');
  await run(CAMPUS, async ({ G, sim }) => {
    await G(() => { const g = window.__app.current; g.target.damageMul = 0; g.enemyMgr.update = () => {}; if (g.security) g.security.fixedUpdate = () => {}; });
    // the light field bakes after the load: wait for it
    for (let k = 0; k < 120 && !(await G(() => !!window.__app.current.world.lightField)); k++) await sim(0.5);
    await sim(0.5);
    const W = [-28, -58.75];
    const meter = () => G(([x, z]) => window.__app.current.world.lightField.bodyLevel(x, 0, z, 1.7), W);
    const lit = await meter();
    const sw = await G(() => {
      const g = window.__app.current;
      const sws = g.world.layout.switches;
      const k = sws.findIndex((s) => s.group === 40);
      return { k, group: sws[k]?.group ?? -1, n: g.world.level.lights.lights.filter((l) => l.group === 40).length, e: g.world.level.lights.lights.filter((l) => l.group === 41 && l.on).length };
    });
    assert(sw.k >= 0 && sw.n === 8 && sw.e === 6, `the feeder board has the west (8 columns) and east (6) breakers (${JSON.stringify(sw)})`);
    await G((k) => { const g = window.__app.current; const it = g.interactables.items.find((x) => x.id === `switch-${k}`); it.onUse(it, 'local'); }, sw.k);
    await sim(0.5);
    const dark = await meter();
    const st = await G(() => ({ w: window.__app.current.world.level.lights.lights.filter((l) => l.group === 40 && l.on).length, e: window.__app.current.world.level.lights.lights.filter((l) => l.group === 41 && l.on).length }));
    assert(st.w === 0 && st.e === 6, `the west breaker cuts only s1-park-w (${JSON.stringify(st)})`);
    assert(dark < 0.28, `the light meter at the west row (${W}) reads under the shadow line 0.28 once the circuit is cut (${dark.toFixed(3)}, lit ${lit.toFixed(3)})`);
    assert(lit > dark + 0.08, `the same point reads brighter with the columns on (${lit.toFixed(3)} against ${dark.toFixed(3)})`);
  });

  console.log('campus ops (S1, CR1; S2, CR2): solo probes at the canopy lip, the plant room and the cafe nose never stand on the canopy or the L1 slab');
  await run(CAMPUS, async ({ G }) => {
    await G(() => {
      const g = window.__app.current;
      g.target.damageMul = 0;
      g.enemyMgr.update = () => {};
      if (g.security) g.security.fixedUpdate = () => {};
      if (window.__ctdev) window.__ctdev.fixedUpdate = () => {};
      window.__app.settings.update((d) => { d.gamepad.curve = 'linear'; d.gamepad.deadzoneLeft = 0; });
      const H = {
        st: () => window.__app.current,
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
          const grip = !a ? null : a.kind === 'ledge' ? a.top : a.kind === 'pipeH' ? a.hangHeight : null;
          const r = (v) => Math.round(v * 100) / 100;
          return { x: r(c.pos.x), y: r(c.pos.y), z: r(c.pos.z), grounded: c.grounded, attached: ac.active, grip };
        },
      };
      window.__re = H;
      window.__app.loop.manual = true;
    });
    const step = (s, sx = 0, sy = 0, btns = []) => G(([s, sx, sy, b]) => window.__re.step(s, sx, sy, b), [s, sx, sy, btns]);
    const tap = (b) => G((b) => window.__re.tap(b), b);
    const put = (x, y, z, yaw) => G(([x, y, z, w]) => window.__re.tp(x, y, z, w), [x, y, z, yaw]);
    const info = () => G(() => window.__re.info());
    await step(0.5);
    /** One solo try: standing at `spot` facing `yaw` (the traverse button there), then a run-up from `runFrom` at the top gear with the button pressed at the face and through the flight. */
    const probe = async (name, spot, yaw, runFrom, y0 = 0) => {
      let max = 0;
      let topY = 0;
      const track = (i) => {
        if (i.attached && i.grip !== null) max = Math.max(max, i.grip);
        if (i.grounded) topY = Math.max(topY, i.y);
      };
      await put(spot[0], y0, spot[1], yaw);
      await step(0.4);
      await tap(BTN.Y);
      for (let k = 0; k < 15; k++) {
        await step(0.1);
        track(await info());
      }
      const [rx, rz] = runFrom;
      const ry = Math.atan2(spot[0] - rx, spot[1] - rz);
      const fx = Math.sin(ry);
      const fz = Math.cos(ry);
      await put(rx, y0, rz, ry);
      await G(() => { const gs = window.__app.current.player.controller.gears; if (gs) gs.gear = 5; });
      let jumped = -1;
      for (let k = 0; k < 60; k++) {
        const i = await info();
        const d = (spot[0] - i.x) * fx + (spot[1] - i.z) * fz;
        if (jumped < 0 && (d < 0.3 || k === 40)) jumped = k;
        await step(0.05, 0, 1, jumped >= 0 && (k - jumped) % 2 === 0 ? [BTN.Y] : []);
        track(await info());
      }
      await step(1.0);
      track(await info());
      const fin = await info();
      assert(max < BAND_LO && topY < BAND_LO && fin.y < BAND_LO, `${name}: alone, never holds a 4.25+ grip nor stands that high (held ${max}, stood ${topY}, ends y ${fin.y})`);
    };
    // CR1: the kerb at the canopy's east lip (x -14, z -40..-34), a running jump from 5 m out; and the south lip from the forecourt
    await probe('CR1 east lip from the kerb', [-13.5, -38], -PI / 2, [-8.5, -38]);
    await probe('CR1 south lip from the forecourt', [-20, -40.6], 0, [-20, -45]);
    // the wall jump: the plant room's south wall (4.2, a 1.1 parapet over its 4.4 roof) from the delivery yard, off the bin store's north wall side
    await probe('plant room south wall (parapet) from the yard', [-34, -40.6], 0, [-34, -44.4]);
    // the bin store's north wall (3.0, the wall-jump corner) from inside the store, run north at it: alone it gets the wall top at most, never the plant roof 4.4 beyond the yard (5 m)
    await probe('bin store north wall corner towards the plant roof', [-38.4, -45.6], PI / 2, [-38.4, -49]);
    // CR2 (slice 2): the L1 slab nose over the dark cafe (x -10, z -11..-5, 4.4): alone, from the cafe floor, from a cafe table (0.75), from the feature stair and off the hall's east wall (a wall jump), the nose is never held nor stood on
    await probe('CR2 nose from the cafe floor', [-10.6, -8], PI / 2, [-16, -8]);
    await probe('CR2 nose from a cafe table', [-12.6, -9], PI / 2, [-13.3, -9], 0.75);
    await probe('CR2 nose from the feature stair', [-17.2, -17], PI / 2, [-18.2, -17], 2.8);
    await probe('CR2 nose, wall jump off the hall east wall', [-8.4, -8], PI / 2, [-13, -8]);
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// (sector-redesign slice 3, `--part=6`) Saltmarsh Park, section 3: the lab block (docs/sector-redesign/SPEC.md "S3",
// PLAN slice 3). A self-contained block, run only when the page's section 3 is the built one (16 guards): S1 and the S2
// stub are told done and their connectors cycled, then (a) 16 guards, cam-view / cam-dock and both lasers with their
// panels are live; (b) the high-bay switch bank cuts `s3-hb-1` and draws #16 (the crane-bay sentry) towards it; (c) the
// solo stealth route (every walked leg on the real nav grid, teleported leg by leg): las-store's panel jammed from the
// store's near side, a crouch through the beams sets off nothing, the grab opens C3; (d) unjammed, the beams trip the
// alarm; (e) on through the dock into C3: the cycle loads the S4 stub. Skipped (slice 3 build sheet): the CR3 solo and
// co-op probes in the browser (the unit test covers the reach rules), the walkway overwatch.
/** Section 3 of the campus run on one page (`run`'s page): the checks above. */
async function campusS3Part(page) {
  const G = (f, a) => page.evaluate(f, a);
  const sim = async (s) => { for (let t = 0; t < s; t += 0.5) await G((d) => window.__app.loop.stepHeadless(d), Math.min(0.5, s - t)); await frames(page, 1); };
  const S = await sections(G);
  if (!(S.length >= 3 && S[2].id === 's3' && S[2].guards === 16)) {
    console.log(`  campus ops (S3): section 3 is not the built one here (${JSON.stringify(S.map((s) => [s.id, s.guards]))}), skipped`);
    return;
  }
  // frozen AI and no damage on the way in (the AI comes back on for the lure)
  await G(() => { const g = window.__app.current; g.target.damageMul = 0; g.enemyMgr.update = () => {}; if (g.security) g.security.fixedUpdate = () => {}; });
  await sim(0.5);
  for (let i = 0; i < 2; i++) {
    await G(() => { const m = window.__sector; if (m.run.current.objective.kind === 'download') { m.run.downloading = true; m.run.download(999); } else m.run.objectiveDone(); });
    await sim(0.3);
    await tp(G, S[i].cp.x, S[i].cp.y, S[i].cp.z, S[i].cp.yaw);
    await sim(4.6);
  }
  // (a) section 3 is live
  const d3 = await G(() => ({ d: window.__sector.debug(), alive: window.__app.current.enemyMgr.alive, ct: window.__ctdev.debug() }));
  assert(d3.d.index === 2 && d3.d.id === 's3' && d3.d.phase === 'objective', `the run reaches section 3 (${JSON.stringify([d3.d.index, d3.d.id, d3.d.phase])})`);
  assert(d3.alive === 16, `section 3 has 16 guards in (${d3.alive})`);
  const live3 = d3.ct.cams.filter((c) => c.live).map((c) => c.id).sort();
  assert(JSON.stringify(live3) === JSON.stringify(['cam-dock', 'cam-view']), `cam-view and cam-dock are the live cameras (${JSON.stringify(live3)})`);
  // (sector-redesign E8, A95) cam-view is bulletproof: a round down its axis through the housing ricochets, it stays live
  const pv = await G(() => {
    const g = window.__app.current;
    const c = g.security.camera('cam-view');
    const sx = Math.sin(c.yaw);
    const sz = Math.cos(c.yaw);
    // shotRay reads x / y / z only: plain points stand in for the Vector3s
    const down = g.security.shotRay({ x: c.x + sx * 3, y: c.y, z: c.z + sz * 3 }, { x: c.x - sx * 3, y: c.y, z: c.z - sz * 3 });
    return { down, mode: c.mode, live: window.__ctdev.debug().cams.find((k) => k.id === 'cam-view').live };
  });
  assert(pv.down === null && pv.mode === 'online' && pv.live, `a round on bulletproof cam-view ricochets and leaves it live (${JSON.stringify(pv)})`);
  const las = d3.ct.lasers.filter((l) => l.live);
  assert(las.length === 2 && las.every((l) => l.on && l.panel !== ''), `las-gown and las-store are live, each with its panel (${JSON.stringify(las)})`);
  // the route legs on the guards' real grid (the ladder legs are the routes' climbs)
  const nv = await G(() => {
    const g = window.__app.current;
    const fails = [];
    let legs = 0;
    // (guard-ai S28) a locked shut door is shut on the guards' grid: this level read unlocks the doors for its queries and locks them back in the same evaluate (no frame between)
    const held = g.world.doors.list.filter((d) => d.anchor.locked); for (const d of held) g.world.doors.setLocked(d, false);
    for (const r of g.world.map.sectors[2].routes) {
      for (let i = 0; i + 1 < r.pts.length; i++) {
        if ((r.climbs ?? []).includes(i)) continue;
        const a = r.pts[i];
        const c = r.pts[i + 1];
        legs++;
        if (!g.nav.findPath([a[0], a[1]], [c[0], c[1]], 60000, a[2] ?? 0, c[2] ?? 0)) fails.push(`${r.name} leg ${i}`);
      }
    }
    for (const d of held) g.world.doors.setLocked(d, true);
    return { legs, fails };
  });
  console.log(`  S3: ${nv.legs} route legs checked`);
  assert(nv.fails.length === 0, `every walked S3 route leg has a nav path (${nv.fails.join('; ')})`);

  // (b) the lure: the player out of sight in the closed east annex, the AI on, the switch bank's row-1 breaker thrown
  // ((guard-ai S15) a breaker fault: #16, the witness nearest the switch by path, walks to it and turns it back on)
  await tp(G, 58, 0, -20, 0);
  const lure = await G(() => {
    const g = window.__app.current;
    delete g.enemyMgr.update;
    const sws = g.world.layout.switches;
    const k = sws.findIndex((s) => s.group === 60);
    const sw = sws[k];
    // #16: the guard nearest his sweep post (25, -19) on the ground
    let best = null;
    let bd = 1e9;
    for (const e of g.enemyMgr.enemies) {
      const d = Math.hypot(e.pos.x - 25, e.pos.z + 18) + (e.pos.y > 1 ? 100 : 0);
      if (e.alive && d < bd) { bd = d; best = e; }
    }
    window.__s3sentry = best;
    const it = g.interactables.items.find((x) => x.id === `switch-${k}`);
    it.onUse(it, 'local');
    return { k, d0: Math.hypot(best.pos.x - sw.pos.x, best.pos.z - sw.pos.z), sw: [sw.pos.x, sw.pos.z], on: g.world.level.lights.lights.filter((l) => l.group === 60 && l.on).length, other: g.world.level.lights.lights.filter((l) => l.group === 61 && l.on).length };
  });
  assert(lure.k >= 0 && lure.on === 0 && lure.other === 3, `the switch bank's row-1 breaker cuts s3-hb-1 only (${JSON.stringify(lure)})`);
  await sim(8);
  const moved = await G((sw) => { const e = window.__s3sentry; return { d: Math.hypot(e.pos.x - sw[0], e.pos.z - sw[1]), alerted: !!e.alerted }; }, lure.sw);
  assert(moved.d < lure.d0 - 1 || moved.d < 2, `the cut draws #16 towards the switch bank (${lure.d0.toFixed(1)} m -> ${moved.d.toFixed(1)} m)`);
  await G(() => { const g = window.__app.current; g.enemyMgr.update = () => {}; });

  // (c) the stealth route to the store, the jammed beams crossed crouched, the grab
  const route = await G(() => window.__app.current.world.map.sectors[2].routes[0]);
  const obj = route.obj;
  for (let i = 1; i < obj - 1; i++) {
    const p = route.pts[i];
    await tp(G, p[0], p[2] ?? 0, p[1], Math.PI / 2);
    await sim(0.1);
  }
  // at the store's near side (inside the back door): the panel is in view; jam it (the intent forced, as part 1 does)
  const near = route.pts[obj - 1];
  await tp(G, near[0], near[2], near[1], Math.PI / 2);
  await sim(0.2);
  await G(() => {
    const d = window.__ctdev;
    d.__forceJam = 'panel-store';
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
  const storeOn = () => G(() => window.__ctdev.debug().lasers.find((l) => l.id === 'las-store').on);
  for (let k = 0; k < 40 && (await storeOn()); k++) await sim(0.1);
  assert((await storeOn()) === false, 'jamming the store panel from the near side cuts las-store');
  const before = await G(() => ({ hits: window.__ctdev.debug().hits, stage: window.__sector.debug().stage }));
  // a crouch across the beam line (x 48.5) at the aisle
  for (let x = 47.8; x <= 49.6; x += 0.2) {
    await G(([px]) => { const c = window.__app.current.player.controller; c.teleport(new c.pos.constructor(px, 4.5, -4.0), Math.PI / 2); c.setCrouchToggle(); }, [x]);
    await sim(0.1);
  }
  const after = await G(() => ({ hits: window.__ctdev.debug().hits, stage: window.__sector.debug().stage, crouched: window.__app.current.player.controller.crouched }));
  assert(after.hits === before.hits && after.stage === before.stage, `a crouch through the jammed beams sets off nothing (${JSON.stringify([before, after])})`);
  await G(() => { window.__ctdev.__forceJam = ''; window.__app.current.player.controller.clearCrouchToggle(); });
  // the grab at the shelf
  const at = route.pts[obj];
  await tp(G, at[0], at[2], at[1], Math.PI / 2);
  await sim(0.4);
  const reach = await G(() => { const g = window.__app.current; const it = g.interactables.items.find((x) => x.id === 's3-obj'); return it ? Math.hypot(it.pos.x - g.player.position.x, it.pos.z - g.player.position.z) : -1; });
  assert(reach > 0 && reach < 1.8, `the prototype shelf is inside the interact reach (${reach.toFixed(2)} m)`);
  await press(page, BTN.A);
  await sim(0.4);
  const grab = await G(() => window.__sector.debug());
  assert(grab.phase === 'connector' && grab.nearLocked === false && grab.farLocked === true, `the grab opens C3 (${JSON.stringify([grab.phase, grab.nearLocked, grab.farLocked])})`);

  // (d) unjammed (after its reboot) the beams trip the alarm: a stand on the beam line
  for (let k = 0; k < 60 && !(await storeOn()); k++) await sim(0.1);
  assert((await storeOn()) === true, 'after the jam and its reboot las-store is back');
  const h0 = await G(() => window.__ctdev.debug().hits);
  await tp(G, 48.5, 4.5, -4.0, -Math.PI / 2);
  await sim(0.4);
  const h1 = await G(() => window.__ctdev.debug().hits);
  assert(h1 > h0, `standing in the live beams trips las-store (${h0} -> ${h1})`);

  // (e) out by the back corridor, the north stair and the dock into C3: the cycle loads the S4 stub
  for (let i = obj + 1; i < route.pts.length - 1; i++) {
    const p = route.pts[i];
    await tp(G, p[0], p[2] ?? 0, p[1], 0);
    await sim(0.1);
  }
  await tp(G, S[2].cp.x, S[2].cp.y, S[2].cp.z, S[2].cp.yaw);
  await sim(1.3);
  const cyc = await G(() => ({ d: window.__sector.debug(), n: window.__app.current.enemyMgr.enemies.length }));
  assert(cyc.d.conn === 'cycling' && cyc.d.nearLocked === true && cyc.n === 0, `C3 cycles: the dock door locks, section 3 unloads (${JSON.stringify([cyc.d.conn, cyc.d.nearLocked, cyc.n])})`);
  await sim(3.2);
  const s4 = await G(() => window.__sector.debug());
  assert(s4.index === 3 && s4.id === 's4' && s4.phase === 'objective', `the S4 stub loads behind C3 (${JSON.stringify([s4.index, s4.id, s4.phase])})`);
}

if (want(6)) {
  console.log('campus ops (S3): the lab block - the switch-bank lure, the jammed store beams, the stealth grab, C3');
  await run(CAMPUS, async ({ page }) => campusS3Part(page));
}

// (guard-ai S5, goal 7, M1, A10, A12) Posts. No live map has a posted guard yet (Course Ready fills K1-K4), so the test
// hook spawns guards on an open stretch of section 1 and gives them posts with `em.placeSlot` (no map data edited). The
// section's own guards go, the cameras are held, the player stands far off in the dark. (a) A vault-door guard (leash 3,
// high security) hears a bottle 8 m off: he turns, walks to his leash edge (never past it), looks toward it >= 5 s
// (sweep <= +-0.6 rad), walks back and faces his post; a free guard who heard it too is the one sent. (b) Told to search
// a spot 15 m off (a body, a radio check), he searches only inside his leash. (c) A normal post (no high security) is
// sent to a noise like any guard and walks out past 3 m.
if (want(1)) {
  console.log('posts (guard-ai S5): a vault-door guard is lured to his leash edge and back; never searches outside it; a normal post is sent');
  await run(PARAMS, async ({ G, sim }) => {
    await G(() => { const g = window.__app.current; g.target.damageMul = 0; if (g.security) g.security.fixedUpdate = () => {}; if (window.__ctdev) window.__ctdev.fixedUpdate = () => {}; });
    await sim(0.5);
    const S = await sections(G);
    // an open stretch near section 1's objective: clear 9 m east and 5 m north of the noise point
    // (fix round: the ring search within 30 m of the objective found none on the laptop; scan every walkable cell on
    // the grid instead, nearest to the objective first, and print what each check rejected)
    const site = await G((o) => {
      const em = window.__app.current.enemyMgr;
      const nav = em.nav;
      const cells = [];
      for (let c = 0; c < nav.walk.length; c++) {
        if (!nav.walk[c]) continue;
        const [x, z] = nav.center(c);
        const y = nav.height[c];
        if (Math.abs(y - o[1]) > 1.5) continue;
        cells.push([Math.hypot(x - o[0], z - o[2]), x, y, z]);
      }
      cells.sort((a, b) => a[0] - b[0]);
      const fail = [0, 0, 0, 0, 0];
      for (const [, x, y, z] of cells) {
        const P = (dx, dz) => [x + dx, z + dz];
        const ok = [nav.lineClear([x, z], P(9, 0), y, y), nav.lineClear([x, z], P(-3.5, 0), y, y), nav.lineClear(P(8, 0), P(8, 5), y, y), nav.lineClear([x, z], P(0, 3.5), y, y), nav.lineClear([x, z], P(0, -3.5), y, y)];
        const k = ok.indexOf(false);
        if (k < 0) return { at: [x, y, z], cells: cells.length };
        fail[k]++;
      }
      return { at: null, cells: cells.length, fail };
    }, S[0].obj);
    assert(site.at !== null, `posts: an open stretch on section 1's storey for the test guards (${site.cells} cells, rejected by east / west / north lane / north / south: ${site.fail})`);
    console.log(`  posts site ${site.at.map((v) => v.toFixed(1))} (${site.cells} cells on the storey)`);
    const r = await G(([cx, cy, cz]) => {
      const g = window.__app.current;
      const em = g.enemyMgr;
      const V = g.player.position.constructor;
      for (const e of [...em.enemies]) em.despawn(e);
      // the player far off, in the dark
      g['updateLight'] = () => (g.localRef.light = g.lightLevel = 0);
      g.player.controller.teleport(new V(cx - 40, cy, cz - 40), 0);
      const step = (s) => window.__app.loop.stepHeadless(s);
      const out = {};
      const rank = { unaware: 0, cooldown: 0, suspicious: 1, investigating: 2, searching: 3, alert: 4 };
      const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
      // (a) the lure
      const A = em.spawn('grunt', new V(cx, cy, cz), false, 0);
      em.placeSlot(A, { yaw: 0, post: { leash: 3, highSecurity: true, guards: 'vault door' } }, 0);
      const F = em.spawn('grunt', new V(cx + 8, cy, cz + 4), false, Math.PI);
      step(0.6);
      const px = A.pos.x;
      const pz = A.pos.z;
      const N = new V(cx + 8, cy, cz);
      em.hear(N, 18, 'distraction');
      step(0.1);
      out.aSent = A.incident;
      out.fSent = F.incident;
      const phases = [];
      let maxD = 0;
      let lookT = 0;
      let lookDev = 0;
      let worst = 'unaware';
      for (let k = 0; k < 400 && A.lurePhase !== 5; k++) {
        step(0.1);
        if (phases[phases.length - 1] !== A.lurePhase) phases.push(A.lurePhase);
        maxD = Math.max(maxD, Math.hypot(A.pos.x - px, A.pos.z - pz));
        if (rank[A.level] > rank[worst]) worst = A.level;
        if (A.lurePhase === 2) {
          lookT += 0.1;
          const b = Math.atan2(N.x - A.lureLook[0], N.z - A.lureLook[1]);
          // the first 0.5 s is his turn settling from the walk
          if (lookT > 0.5) lookDev = Math.max(lookDev, Math.abs(wrap(A.yaw - b)));
        }
      }
      // done: back on the post; the calm turn (60 deg/s) brings him round to his post yaw within ~2 s
      let yawMin = Math.PI;
      for (let k = 0; k < 25; k++) {
        step(0.1);
        yawMin = Math.min(yawMin, Math.abs(wrap(A.yaw)));
      }
      Object.assign(out, { phases, maxD, lookT, lookDev, worst, back: Math.hypot(A.pos.x - px, A.pos.z - pz), yaw: yawMin, aInc: A.incident });
      // (b) a search 15 m off: he looks from inside his leash
      A.searchAt(px + 15, pz, null);
      let sMax = 0;
      let searched = false;
      for (let k = 0; k < 250; k++) {
        step(0.1);
        if (A.level === 'searching') searched = true;
        sMax = Math.max(sMax, Math.hypot(A.pos.x - px, A.pos.z - pz));
      }
      Object.assign(out, { searched, sMax });
      em.despawn(A);
      em.despawn(F);
      // (c) a normal post is sent like any guard
      const B = em.spawn('grunt', new V(cx, cy, cz), false, 0);
      em.placeSlot(B, { yaw: 0, post: { leash: 3, guards: 'gate' } }, 0);
      step(0.6);
      const bx = B.pos.x;
      const bz = B.pos.z;
      em.hear(new V(cx + 8, cy, cz), 18);
      step(0.1);
      out.bSent = B.incident;
      let bMax = 0;
      for (let k = 0; k < 200; k++) {
        step(0.1);
        bMax = Math.max(bMax, Math.hypot(B.pos.x - bx, B.pos.z - bz));
      }
      out.bMax = bMax;
      g['updateLight'] = Object.getPrototypeOf(g)['updateLight'];
      return out;
    }, site.at);
    const f2 = (v) => v.toFixed(2);
    assert(r.aSent === -1 && r.fSent >= 0, `posts: the board sends the free guard, never the vault-door guard (vault ${r.aSent}, free ${r.fSent})`);
    assert(JSON.stringify(r.phases.slice(0, 3)) === '[1,2,3]' && r.phases[r.phases.length - 1] === 5, `posts: the vault-door guard walks out, looks, walks back, done (phases ${JSON.stringify(r.phases)})`);
    assert(r.maxD <= 3 + 0.35 && r.maxD >= 2.5, `posts: he reaches his leash edge, never past it (${f2(r.maxD)} m, leash 3)`);
    assert(r.lookT >= 5 - 0.05, `posts: he looks toward the lure >= 5 s (A12: ${f2(r.lookT)} s)`);
    assert(r.lookDev <= 0.6 + 0.15, `posts: his sweep stays within +-0.6 rad of the lure (A12: ${f2(r.lookDev)} rad)`);
    assert(r.worst === 'unaware' || r.worst === 'suspicious' || r.worst === 'cooldown', `posts: a lure never makes him investigate (${r.worst})`);
    assert(r.back < 0.6 && r.yaw < 0.2, `posts: back on his post facing it (${f2(r.back)} m, yaw off by ${f2(r.yaw)} rad)`);
    assert(r.searched && r.sMax <= 3 + 0.4, `posts: a search 15 m off is searched from inside his leash (${r.searched}, ${f2(r.sMax)} m)`);
    assert(r.bSent >= 0 && r.bMax > 3.5, `posts: a normal post is sent and walks out past his 3 m leash (sent ${r.bSent}, ${f2(r.bMax)} m)`);
  });
}

// (guard-ai S5b, ENGINE.md section 7) The sector tags, on guards built with the test hook (spawn + placeSlot with a
// stand-in section list; no map data edited). (a) `squad`: a squad of 3; one is knocked out unseen (the other two face
// away, > BODY.close off); nobody knows until the next radio check, which misses him: the other two are sent as a pair
// (a `missing` incident), reach where he went down and find him. (b) `handler`: a dog placed beside a squad mate (the old
// "nearest of its squad" rule would heel on him) heels on its handler instead and stays with him as he walks his round;
// the handler knocked out, the dog stays by him.
if (want(1)) {
  console.log('sector tags (guard-ai S5b): a squad of 3, one taken out, the radio check sends the other two; a dog stays at its handler');
  await run(PARAMS, async ({ G, sim }) => {
    await G(() => { const g = window.__app.current; g.target.damageMul = 0; if (g.security) g.security.fixedUpdate = () => {}; if (window.__ctdev) window.__ctdev.fixedUpdate = () => {}; });
    await sim(0.5);
    const S = await sections(G);
    // the posts block's open stretch: clear 9 m east and 5 m north at x + 8 (nearest the objective first)
    const site = await G((o) => {
      const nav = window.__app.current.enemyMgr.nav;
      const cells = [];
      for (let c = 0; c < nav.walk.length; c++) {
        if (!nav.walk[c]) continue;
        const [x, z] = nav.center(c);
        const y = nav.height[c];
        if (Math.abs(y - o[1]) > 1.5) continue;
        cells.push([Math.hypot(x - o[0], z - o[2]), x, y, z]);
      }
      cells.sort((a, b) => a[0] - b[0]);
      for (const [, x, y, z] of cells) {
        const P = (dx, dz) => [x + dx, z + dz];
        if (nav.lineClear([x, z], P(9, 0), y, y) && nav.lineClear(P(8, 0), P(8, 5), y, y) && nav.lineClear([x, z], P(8, 4), y, y)) return { at: [x, y, z] };
      }
      return { at: null, cells: cells.length };
    }, S[0].obj);
    assert(site.at !== null, `sector tags: an open stretch on section 1's storey (${site.cells} cells)`);
    const r = await G(([cx, cy, cz]) => {
      const g = window.__app.current;
      const em = g.enemyMgr;
      const V = g.player.position.constructor;
      for (const e of [...em.enemies]) em.despawn(e);
      g['updateLight'] = () => (g.localRef.light = g.lightLevel = 0);
      g.player.controller.teleport(new V(cx - 40, cy, cz - 40), 0);
      const step = (s) => window.__app.loop.stepHeadless(s);
      const hit = (e) => ({ amount: 9999, point: e.pos.clone(), dir: new V(0, 0, 1), part: 'body', kind: 'melee', attackerTeam: 'player', attackerId: 'local', sourcePos: e.pos.clone(), impulse: 1 });
      const out = {};
      // (a) a squad of 3 (squad 0 of section 0); B and C face away from A (yaw PI/2 = +x)
      const slotsA = [
        { kind: 'grunt', x: cx, z: cz, yaw: Math.PI / 2, squad: 0, role: 'patrol' },
        { kind: 'grunt', x: cx + 5, z: cz, yaw: Math.PI / 2, squad: 0, role: 'patrol' },
        { kind: 'grunt', x: cx + 8, z: cz + 4, yaw: Math.PI / 2, squad: 0, role: 'patrol' },
      ];
      const [A, B, C] = slotsA.map((s, i) => {
        const e = em.spawn(s.kind, new V(s.x, cy, s.z), false, s.yaw);
        em.placeSlot(e, s, 0, slotsA, i);
        return e;
      });
      out.squads = [A.squad, B.squad, C.squad];
      step(1);
      const ax = A.pos.x;
      const az = A.pos.z;
      A.knockOut(hit(A));
      step(2);
      out.before = { b: B.incident, c: C.incident, bl: B.level, cl: C.level, misses: em.radioMisses };
      em.radioCheckNow();
      step(0.1);
      out.misses = em.radioMisses - out.before.misses;
      out.inc = [B.incident, C.incident];
      out.kind = B.incident >= 0 ? em.board.kindOf(B.incident) : null;
      let close = 99;
      let found = false;
      let light = 0;
      for (let k = 0; k < 400 && !found; k++) {
        step(0.1);
        close = Math.min(close, Math.hypot(B.pos.x - ax, B.pos.z - az), Math.hypot(C.pos.x - ax, C.pos.z - az));
        const b = em.bodies.find((q) => q.enemyId === A.id);
        if (b) light = b.light;
        found = !b || b.found;
      }
      // (stack-tip fix) the game's find range for that body: sight in focus at its light (BODY.close at the least)
      Object.assign(out, { close, found, light, reach: em.bodyNoticeRange(light) });
      for (const e of [...em.enemies]) em.despawn(e);
      // (b) the dog: handler H walks a round; a squad mate D stands beside the dog's spawn
      const slotsB = [
        { kind: 'grunt', x: cx, z: cz, yaw: Math.PI / 2, squad: 1, role: 'handler', route: [[cx, cz], [cx + 8, cz]], wait: 1 },
        { kind: 'grunt', x: cx + 8, z: cz + 4, yaw: Math.PI / 2, squad: 1, role: 'gate' },
        { kind: 'dog', x: cx + 7, z: cz + 3, yaw: 0, handler: 0 },
      ];
      const [H, D, K] = slotsB.map((s, i) => {
        const e = em.spawn(s.kind, new V(s.x, cy, s.z), false, s.yaw);
        if (s.route) e.setPatrol({ points: s.route, wait: s.wait });
        em.placeSlot(e, s, 0, slotsB, i);
        return e;
      });
      out.bound = K.handler === H && K.squad === H.squad;
      let far = 0;
      let hMove = 0;
      const h0x = H.pos.x;
      for (let k = 0; k < 250; k++) {
        step(0.1);
        hMove = Math.max(hMove, Math.hypot(H.pos.x - h0x, H.pos.z - cz));
        // after 6 s to reach him
        if (k >= 60) far = Math.max(far, Math.hypot(K.pos.x - H.pos.x, K.pos.z - H.pos.z));
      }
      Object.assign(out, { far, hMove, leader: K.leader === H, decoy: Math.hypot(D.pos.x - K.pos.x, D.pos.z - K.pos.z) });
      // the handler knocked out: the dog stays by him
      const hx = H.pos.x;
      const hz = H.pos.z;
      H.knockOut(hit(H));
      let stay = 0;
      for (let k = 0; k < 150; k++) {
        step(0.1);
        if (k >= 50) stay = Math.max(stay, Math.hypot(K.pos.x - hx, K.pos.z - hz));
      }
      Object.assign(out, { stay, dogLevel: K.level, dogAlive: K.alive });
      for (const e of [...em.enemies]) em.despawn(e);
      g['updateLight'] = Object.getPrototypeOf(g)['updateLight'];
      return out;
    }, site.at);
    const f2 = (v) => v.toFixed(2);
    console.log(`  squad ${JSON.stringify(r.squads)}, before ${JSON.stringify(r.before)}, incident ${r.inc} (${r.kind}), closest ${f2(r.close)} m (find range ${f2(r.reach)} m at light ${f2(r.light)}), found ${r.found}; dog far ${f2(r.far)} m (handler moved ${f2(r.hMove)} m; the squad mate ${f2(r.decoy)} m off at the end), stay ${f2(r.stay)} m (${r.dogLevel})`);
    assert(r.squads[0] === r.squads[1] && r.squads[1] === r.squads[2] && r.squads[0] >= 0, `sector tags: the three join one squad (${r.squads})`);
    assert(r.before.b === -1 && r.before.c === -1, `sector tags: nobody knows before the radio check (incidents ${r.before.b} / ${r.before.c}, ${r.before.bl} / ${r.before.cl})`);
    assert(r.misses === 1, `sector tags: the radio check misses him (${r.misses})`);
    assert(r.inc[0] >= 0 && r.inc[0] === r.inc[1] && r.kind === 'missing', `sector tags: the other two are sent as a pair to a missing incident (${r.inc}, ${r.kind})`);
    // (stack-tip fix) found by sight, not only inside BODY.close (2.5 m, the old bound): a guard notices a body at up to
    // `bodyNoticeRange(light)` m straight ahead (BODY.range x the falloff at BODY.threshold, BODY.close at the least);
    // + 0.5 m for the think interval (0.22-0.3 s) and the body's 1 Hz light sample. The laptop run found him at 3.93 m.
    assert(r.close < r.reach + 0.5 && r.found, `sector tags: they reach where he went down and find him (${f2(r.close)} m, find range ${f2(r.reach)} m, found ${r.found})`);
    assert(r.bound && r.leader, `sector tags: the dog is bound to its handler, in his squad (${r.bound}, leader ${r.leader})`);
    assert(r.hMove > 6 && r.far < 3.5, `sector tags: the dog stays at its handler on his round (${f2(r.far)} m off; he walked ${f2(r.hMove)} m)`);
    // (stack-tip fix) the handler down, the dog searches round him (`handlerDown` -> `searchAt` on his spot), on the search
    // rings (patrol.ts `searchPoint`: PATROL.searchR0 2 m, then + searchStep 2.5 m): in the 5-15 s window it reaches the
    // second ring at most (4.5 m) + 0.5 m for the walk past a point. The old 3.5 m cut the second ring (3.72 m seen).
    assert(r.dogAlive && r.stay < 5, `sector tags: the handler down, the dog stays by him (${f2(r.stay)} m, ${r.dogLevel})`);
  });
}

// (guard-ai S10, GA2, the `pair` tag) Talking pairs, on guards built with the test hook (spawn + a timed loop + placeSlot
// with a stand-in section list naming each other as `pair`; no map data edited). Two lanes 1.2 m apart (z and z + 1.2):
// A walks the south lane from x + 3.2, B the north lane from x; both stop at x + 5 (their meet stops, 1.2 m apart) on a
// 40 s master clock. (a) Both up: they meet, face each other, say two lines (one each, over the speaker on the HUD), then
// split on their schedule. (b) B knocked out at his first stop before the window (3.4 m behind A's back, unseen): `grace`
// s after the window opens A is sent (a `missing` incident, the lead) to B's last stop, reaches it and finds him.
if (want(1)) {
  console.log('talking pairs (guard-ai S10): a pair meets, talks, splits; take one before the meeting and the other searches');
  await run(PARAMS, async ({ G, sim }) => {
    await G(() => { const g = window.__app.current; g.target.damageMul = 0; if (g.security) g.security.fixedUpdate = () => {}; if (window.__ctdev) window.__ctdev.fixedUpdate = () => {}; });
    await sim(0.5);
    const S = await sections(G);
    // two clear lanes 9 m east, 1.2 m apart, nearest section 1's objective first
    const site = await G((o) => {
      const nav = window.__app.current.enemyMgr.nav;
      const cells = [];
      for (let c = 0; c < nav.walk.length; c++) {
        if (!nav.walk[c]) continue;
        const [x, z] = nav.center(c);
        const y = nav.height[c];
        if (Math.abs(y - o[1]) > 1.5) continue;
        cells.push([Math.hypot(x - o[0], z - o[2]), x, y, z]);
      }
      cells.sort((a, b) => a[0] - b[0]);
      for (const [, x, y, z] of cells) {
        if (nav.lineClear([x, z], [x + 9, z], y, y) && nav.lineClear([x, z + 1.2], [x + 9, z + 1.2], y, y) && nav.lineClear([x + 5, z], [x + 5, z + 1.2], y, y)) return { at: [x, y, z] };
      }
      return { at: null, cells: cells.length };
    }, S[0].obj);
    assert(site.at !== null, `talking pairs: two open lanes on section 1's storey (${site.cells} cells)`);
    const r = await G(([cx, cy, cz]) => {
      const g = window.__app.current;
      const em = g.enemyMgr;
      const V = g.player.position.constructor;
      for (const e of [...em.enemies]) em.despawn(e);
      g['updateLight'] = () => (g.localRef.light = g.lightLevel = 0);
      g.player.controller.teleport(new V(cx - 40, cy, cz - 40), 0);
      // no squad radio check in the middle of it (the pair's own miss is under test)
      em['radioT'] = 1e9;
      const step = (s) => window.__app.loop.stepHeadless(s);
      const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
      const hit = (e) => ({ amount: 9999, point: e.pos.clone(), dir: new V(0, 0, 1), part: 'body', kind: 'melee', attackerTeam: 'player', attackerId: 'local', sourcePos: e.pos.clone(), impulse: 1 });
      const said = [];
      const prevBark = em.onBark;
      em.onBark = (e, line, radio) => {
        prevBark?.(e, line, radio);
        said.push({ id: e.id, line, radio, hud: g.hud.barks.shown.includes(line) });
      };
      const slots = [
        { kind: 'grunt', x: cx + 3.2, z: cz, yaw: Math.PI / 2, pair: 1, route: [[cx + 3.2, cz], [cx + 5, cz], [cx + 8, cz]], loop: { period: 40, leave: [3, 18, 30], t0: 0 } },
        { kind: 'grunt', x: cx, z: cz + 1.2, yaw: Math.PI / 2, pair: 0, route: [[cx, cz + 1.2], [cx + 5, cz + 1.2], [cx + 8.5, cz + 1.2]], loop: { period: 40, leave: [1, 18, 30], t0: 0 } },
      ];
      const make = () =>
        slots.map((s, i) => {
          const e = em.spawn(s.kind, new V(s.x, cy, s.z), false, s.yaw);
          e.setPatrol({ points: s.route, loop: s.loop });
          em.placeSlot(e, s, 0, slots, i);
          return e;
        });
      const out = {};
      // (a) both up
      const [A, B] = make();
      const p = em.pairs[0];
      out.built = { n: em.pairs.length, skips: em.pairSkips.slice(), open: p ? p.pm.def.open : -1, close: p ? p.pm.def.close : -1 };
      let faceA = 9;
      let faceB = 9;
      let atA = 99;
      let met = -1;
      for (let k = 0; k < 250; k++) {
        step(0.1);
        if (p && p.pm.state === 'meeting') {
          if (met < 0) met = (k + 1) * 0.1;
          // after the calm turn has had a second
          if ((k + 1) * 0.1 > met + 1.5) {
            faceA = Math.min(faceA, Math.abs(wrap(A.yaw - Math.atan2(B.pos.x - A.pos.x, B.pos.z - A.pos.z))));
            faceB = Math.min(faceB, Math.abs(wrap(B.yaw - Math.atan2(A.pos.x - B.pos.x, A.pos.z - B.pos.z))));
            atA = Math.min(atA, Math.hypot(A.pos.x - (cx + 5), A.pos.z - cz));
          }
        }
      }
      const pairSaid = said.filter((s) => s.id === A.id || s.id === B.id);
      out.a = { met, faceA, faceB, atA, lines: em.pairLines, said: pairSaid, levels: [A.level, B.level], state: p ? p.pm.state : null, split: Math.hypot(A.pos.x - (cx + 5), A.pos.z - cz) };
      for (const e of [...em.enemies]) em.despawn(e);
      // (b) B knocked out at his first stop before the window, behind A's back
      said.length = 0;
      const lines0 = em.pairLines;
      const [A2, B2] = make();
      const p2 = em.pairs[0];
      step(0.5);
      B2.knockOut(hit(B2));
      const bx = B2.pos.x;
      const bz = B2.pos.z;
      let sentT = -1;
      let kind = null;
      let close = 99;
      let found = false;
      let light = 0;
      for (let k = 0; k < 500 && !found; k++) {
        step(0.1);
        const t = 0.5 + (k + 1) * 0.1;
        if (sentT < 0 && em.pairMisses > 0) {
          sentT = t;
          kind = A2.incident >= 0 ? em.board.kindOf(A2.incident) : null;
        }
        if (sentT >= 0) close = Math.min(close, Math.hypot(A2.pos.x - bx, A2.pos.z - bz));
        const b = em.bodies.find((q) => q.enemyId === B2.id);
        if (b) light = b.light;
        found = !b || b.found;
      }
      // (stack-tip fix) the game's find range for that body (as the sector tags block)
      out.b = { open: p2 ? p2.pm.def.open : -1, sentT, kind, close, found, light, reach: em.bodyNoticeRange(light), misses: em.pairMisses, lines: em.pairLines - lines0, radioMisses: em.radioMisses, witnessed: em.lastWitnesses };
      for (const e of [...em.enemies]) em.despawn(e);
      em.onBark = prevBark;
      g['updateLight'] = Object.getPrototypeOf(g)['updateLight'];
      return out;
    }, site.at);
    const f2 = (v) => v.toFixed(2);
    console.log(`  built ${JSON.stringify(r.built)}; met at ${f2(r.a.met)} s, facing off ${f2(r.a.faceA)} / ${f2(r.a.faceB)} rad, ${f2(r.a.atA)} m from his stop, lines ${r.a.lines} ${JSON.stringify(r.a.said.map((s) => s.line))}, then ${r.a.state}, ${f2(r.a.split)} m off; missing: open ${f2(r.b.open)} s, sent at ${f2(r.b.sentT)} s (${r.b.kind}), closest ${f2(r.b.close)} m (find range ${f2(r.b.reach)} m at light ${f2(r.b.light)}), found ${r.b.found}, lines ${r.b.lines}`);
    assert(r.built.n === 1 && r.built.skips.length === 0, `talking pairs: the pair is built (${r.built.n}, skips ${JSON.stringify(r.built.skips)})`);
    assert(r.a.met > 0 && r.a.met < 18, `talking pairs: they meet inside the window (${f2(r.a.met)} s, window ${f2(r.built.open)}..${f2(r.built.close)})`);
    assert(r.a.faceA < 0.35 && r.a.faceB < 0.35 && r.a.atA < 0.8, `talking pairs: they stand at their stops facing each other (${f2(r.a.faceA)} / ${f2(r.a.faceB)} rad, ${f2(r.a.atA)} m)`);
    assert(r.a.lines === 2 && r.a.said.length === 2 && r.a.said[0].id !== r.a.said[1].id, `talking pairs: two lines, one each (${r.a.lines}, ${JSON.stringify(r.a.said)})`);
    assert(r.a.said.every((s) => !s.radio && s.hud), `talking pairs: spoken (not radio) and shown over the speaker (${JSON.stringify(r.a.said)})`);
    assert(r.a.levels.every((l) => l === 'unaware') && r.a.split > 2, `talking pairs: calm throughout, then they split on their schedule (${r.a.levels}, ${f2(r.a.split)} m off his stop)`);
    assert(r.b.lines === 0 && r.b.misses === 1, `talking pairs: no talk with one down; one missing request (${r.b.lines} lines, ${r.b.misses})`);
    // (S10 check) the pair clock steps 0.2 s at a time and may lead the walkers by up to one step, and the grace counts
    // from the step the window opens: the request lands 5.6 .. 6.0 s after the window opens, read at 0.1 s
    assert(r.b.sentT >= r.b.open + 6 - 0.45 && r.b.sentT <= r.b.open + 6 + 0.5, `talking pairs: the request ${f2(r.b.sentT)} s, grace 6 s after the window opens (${f2(r.b.open)} s)`);
    assert(r.b.kind === 'missing', `talking pairs: the other is sent on a missing incident (${r.b.kind})`);
    // (stack-tip fix) found by sight within the game's find range, not only inside BODY.close (see the sector tags block;
    // the laptop run found him at 4.44 m). `lines` 0 above is right: part (b) has no meeting (B is down before the window)
    assert(r.b.close < r.b.reach + 0.5 && r.b.found, `talking pairs: he searches at his partner's stop and finds him (${f2(r.b.close)} m, find range ${f2(r.b.reach)} m, found ${r.b.found})`);
  });
}

// (guard-ai S7, design 9, M6) A camera sees a knocked-out guard (IR: the light does not matter, G240) and the desk sends
// the nearest calm guard: within ~5 s of the knockout a guard is on his way (`Enemy.camBody`), and he wakes the victim
// (the body-found path: `EnemyManager.onRevived`). The player is not this check's: the cameras' player think is held
// (no alarm) and the guards are blind to the player; the body pass and the guards' AI run. Numbers from the tables.
if (want(1)) {
console.log('sector ops: a camera sees a knocked-out guard, a guard is sent and wakes him (guard-ai S7)');
await run(PARAMS, async ({ G, sim }) => {
  await sim(0.5);
  // a floor point a live camera sees at the middle of its sweep (probed with a stand-in body through the real pass),
  // the victim put there (passive, no route: he stands), and a calm helper within reach (no route: he stands, facing away)
  const set = await G(() => {
    const g = window.__app.current;
    const em = g.enemyMgr;
    const sec = g.security;
    const nav = g.nav;
    g.target.damageMul = 0;
    sec.think = () => {};
    for (const e of em.enemies) Object.defineProperty(e, 'perceptionMul', { get: () => 0 });
    const live = sec.cameras.filter((c) => c.sees && !c.frozen);
    const prevSrc = sec.bodySrc;
    const prevOn = sec.onBody;
    const probe = [{ id: 'probe', pos: { x: 0, y: 0, z: 0 }, lethal: false, carried: false, hidden: false, present: true }];
    let hit = null;
    sec.setBodySource(() => probe);
    sec.onBody = (ev) => { hit = ev; };
    let pick = null;
    for (const c of live) {
      const mid = c.def.sweep ? ((c.def.sweep[0] + c.def.sweep[1]) / 2) * (Math.PI / 180) : c.yaw;
      for (const d of [c.def.aim ?? 6, 4, 5, 7, 3, 8]) {
        const x = c.x + Math.sin(mid) * d;
        const z = c.z + Math.cos(mid) * d;
        const cell = nav.nearestWalkable(x, z, 2, c.y - 2);
        if (cell < 0) continue;
        const [cx, cz] = nav.center(cell);
        const fy = nav.height[cell];
        probe[0].pos = { x: cx, y: fy + 0.15, z: cz };
        const keep = c.yaw;
        c.yaw = mid;
        hit = null;
        sec.bodyPass();
        sec.clearBodyReports();
        c.yaw = keep;
        if (hit && hit.camera === c.def.id) {
          pick = { cam: c.def.id, mid, x: cx, y: fy, z: cz };
          break;
        }
      }
      if (pick) break;
    }
    sec.setBodySource(prevSrc);
    sec.onBody = prevOn;
    if (!pick) return { pick: null, cams: live.map((c) => c.def.id) };
    const alive = em.enemies.filter((e) => e.alive && !e.def.melee && !e.dog);
    const place = (e, x, z, yaw) => {
      e.pos.set(x, nav.heightAt(x, z, pick.y), z);
      e['prevPos'].copyFrom(e.pos);
      e['post'] = [x, z];
      e.setPatrol(null);
      e.yaw = yaw;
    };
    const victim = alive[0];
    victim.passive = true;
    place(victim, pick.x, pick.z, 0);
    // the helper: a calm guard on a walkable spot ~10 m from it with a clear nav line, facing away
    const helper = alive[1];
    let hp = null;
    for (let k = 0; k < 16 && !hp; k++) {
      const a = (k / 16) * Math.PI * 2;
      const cell = nav.nearestWalkable(pick.x + Math.sin(a) * 10, pick.z + Math.cos(a) * 10, 2, pick.y);
      if (cell < 0) continue;
      const [hx, hz] = nav.center(cell);
      if (Math.hypot(hx - pick.x, hz - pick.z) < 6 || !nav.lineClear([hx, hz], [pick.x, pick.z], nav.height[cell], pick.y)) continue;
      hp = [hx, hz];
    }
    if (!helper || !hp) return { pick, helper: !!helper, hp };
    place(helper, hp[0], hp[1], Math.atan2(hp[0] - pick.x, hp[1] - pick.z));
    // records: the camera's report, the revive
    window.__s7 = { reports: [], revived: [] };
    const on = sec.onBody;
    sec.onBody = (ev) => { window.__s7.reports.push({ ...ev, t: g.time ?? 0 }); on(ev); };
    const rv = em.onRevived;
    em.onRevived = (e, b) => { window.__s7.revived.push(b.id); rv?.(e, b); };
    return { pick, victim: victim.id, helper: helper.id, hp, callR: em.incidentTable.callR, bodyWalk: em.incidentTable.bodyWalk };
  });
  assert(set.pick && set.hp, `a floor point a live camera sees, a helper spot within reach (${JSON.stringify(set)})`);
  // the camera comes round to the spot (its sweep), then the victim goes down there
  await sim(0.3);
  let covers = false;
  for (let t = 0; t < 16 && !covers; t += 0.25) {
    covers = await G(([id, x, y, z]) => window.__app.current.security.camera(id).covers(x, y + 0.15, z), [set.pick.cam, set.pick.x, set.pick.y, set.pick.z]);
    if (!covers) await sim(0.25);
  }
  assert(covers, `the camera's sweep reaches the spot (${set.pick.cam})`);
  const body = await G((vid) => {
    const g = window.__app.current;
    const e = g.enemyMgr.enemies.find((q) => q.id === vid);
    e.knockOut({ amount: 9999, point: e.pos.clone(), dir: e.pos.clone().normalize(), part: 'body', kind: 'melee', attackerTeam: 'player', attackerId: 'local', sourcePos: g.player.position.clone(), impulse: 1 });
    const b = g.enemyMgr.bodies.find((q) => q.enemyId === vid);
    return b ? { id: b.id, lethal: b.lethal, x: b.pos.x, z: b.pos.z } : null;
  }, set.victim);
  assert(body && body.lethal === false, `the victim lies knocked out on the spot (${JSON.stringify(body)})`);
  // within ~5 s: the camera reports it and a guard is sent (no guard found it himself first)
  const read = () =>
    G((bid) => {
      const g = window.__app.current;
      const em = g.enemyMgr;
      const b = em.bodies.find((q) => q.id === bid);
      const sent = em.enemies.filter((e) => e.alive && e.camBody && e.camBody.id === bid).map((e) => ({ id: e.id, level: e.level, d: +Math.hypot(e.pos.x - (b?.pos.x ?? 0), e.pos.z - (b?.pos.z ?? 0)).toFixed(1) }));
      return { reports: window.__s7.reports.filter((r) => r.bodyId === bid).length, sent, found: b?.found ?? null, present: b?.present ?? null, revived: window.__s7.revived.includes(bid), camReports: em.camReports, camIgnored: em.camIgnored, opened: em.board.opened };
    }, body.id);
  let st = await read();
  let t = 0;
  for (; t < 5 && !st.sent.length; t += 0.25) {
    await sim(0.25);
    st = await read();
  }
  assert(st.reports >= 1 && st.camReports >= 1 && st.sent.length >= 1, `within 5 s the camera reports the body and a guard is sent (${t.toFixed(2)} s: ${JSON.stringify(st)})`);
  assert(st.sent.length === 1, `a knocked-out guard: one guard goes (${JSON.stringify(st.sent)})`);
  // he walks over and wakes him (the walk is bounded by the table; the revive takes a few seconds more)
  for (t = 0; t < set.bodyWalk + 10 && !st.revived; t += 0.5) {
    await sim(0.5);
    st = await read();
  }
  assert(st.revived, `the sent guard wakes the victim (${t.toFixed(1)} s: ${JSON.stringify(st)})`);
});
}

// ---------------------------------------------------------------------------------------------------------------------
// (sector-redesign slice 4, `--part=6`) Saltmarsh Park, section 4: the data hall (docs/sector-redesign/briefs/SLICE4.md).
// Written, not run (the build sheet lists it). Run only when the page's section 4 is the built one (20 guards): S1-S3 are
// told done and their connectors cycled, then (a) 20 guards, the three cameras and las-tray with its panel are live, (b) the
// dock board gives the codes and both keypads open, (c) every walked route leg has a path on the real grid, (d) the desk
// refuses while #5 stands and loops the cameras once he is down, (e) one player cannot open the cage's pair gate, (f) the
// stealth route to the cage download opens C4, (g) the hall panel's lure draws a guard, (h) C4 cycles into section 5, and
// solo probes at CR4 never hold or stand on a basket. Skipped (log): the co-op leg-up, jam-and-pass, the pair gate opening for two.
/** Section 4 of the campus run on one page (`run`'s page): the checks above. */
async function campusS4Part(page) {
  const G = (f, a) => page.evaluate(f, a);
  const sim = async (s) => { for (let t = 0; t < s; t += 0.5) await G((d) => window.__app.loop.stepHeadless(d), Math.min(0.5, s - t)); await frames(page, 1); };
  const S = await sections(G);
  if (!(S.length >= 4 && S[3].id === 's4' && S[3].guards === 20)) {
    console.log(`  campus ops (S4): section 4 is not the built one here (${JSON.stringify(S.map((s) => [s.id, s.guards]))}), skipped`);
    return;
  }
  // frozen AI and no damage on the way in (the AI comes back on for the lure)
  await G(() => { const g = window.__app.current; g.target.damageMul = 0; g.enemyMgr.update = () => {}; if (g.security) g.security.fixedUpdate = () => {}; });
  await sim(0.5);
  for (let i = 0; i < 3; i++) {
    await G(() => { const m = window.__sector; if (m.run.current.objective.kind === 'download') { m.run.downloading = true; m.run.download(999); } else m.run.objectiveDone(); });
    await sim(0.3);
    await tp(G, S[i].cp.x, S[i].cp.y, S[i].cp.z, S[i].cp.yaw);
    await sim(4.6);
  }
  // (a) section 4 is live
  const d4 = await G(() => ({ d: window.__sector.debug(), alive: window.__app.current.enemyMgr.alive, ct: window.__ctdev.debug(), items: window.__app.current.interactables.items.length, live: window.__app.current.interactables.scopedCount(), scope: window.__app.current.interactables.scope }));
  assert(d4.d.index === 3 && d4.d.id === 's4' && d4.d.phase === 'objective', `the run reaches section 4 (${JSON.stringify([d4.d.index, d4.d.id, d4.d.phase])})`);
  assert(d4.alive === 20, `section 4 has 20 guards in (${d4.alive})`);
  const live4 = d4.ct.cams.filter((c) => c.live).map((c) => c.id).sort();
  assert(JSON.stringify(live4) === JSON.stringify(['cam-cage', 'cam-dock4', 'cam-mantrap']), `the three S4 cameras are the live ones (${JSON.stringify(live4)})`);
  const las = d4.ct.lasers.filter((l) => l.live);
  assert(las.length === 1 && las[0].id === 'las-tray' && las[0].on && las[0].panel !== '', `las-tray is live with its panel (${JSON.stringify(las)})`);
  // (cap fix) every section's items stay registered on the host; co-op mirrors the live section's plus the untagged
  // ones (MAX_ITEMS 128 holds for that set, with headroom for E9's crates and the revives)
  assert(d4.scope === 3 && d4.live < d4.items && d4.live <= 100, `the mirrored (live) interactables stay under the cap (${d4.live} of ${d4.items}, scope ${d4.scope})`);

  // (a2) (stealth-pays S2) an interrogation's code flag reaches the team's codes through the mode hook `revealIntel`
  // calls (`g.mode.onIntelCode`): kp-batt's prompt turns to "Enter code" (not opened here: (b) opens it). The real
  // grab-and-interrogate chain is e2e-takedown's `grab-interrogate-intel`.
  const ic = await G(() => {
    const m = window.__sector;
    const q = m.keyIts.find((x) => x.sec === 3 && x.k === 0);
    const before = { has: m.codes.has('s4-codes'), label: q?.it.label ?? null };
    m.onIntelCode('s4-codes');
    m.onIntelCode('s4-codes');
    const after = { has: m.codes.has('s4-codes'), label: q?.it.label ?? null };
    return { before, after };
  });
  assert(
    ic.before.has === false && ic.before.label === 'Keypad - code needed' && ic.after.has === true && ic.after.label === 'Enter code',
    `S2: an interrogation code readies kp-batt (${JSON.stringify(ic)})`,
  );

  // (b) the dock board gives the codes: both keypads open
  const codes = await G(() => {
    const g = window.__app.current;
    const it = g.interactables.items.find((x) => x.id === 'c-sintel-3-0');
    if (!it) return { board: false };
    it.onUse(it, 'local');
    return { board: true, a: window.__sector.useKeypad(3, 0), b: window.__sector.useKeypad(3, 1) };
  });
  assert(codes.board && codes.a === true && codes.b === true, `the dock board opens kp-batt and kp-deck (${JSON.stringify(codes)})`);

  // (c) the route legs on the guards' real grid (the basket and ladder legs are the routes' climbs)
  const nv = await G(() => {
    const g = window.__app.current;
    const fails = [];
    let legs = 0;
    // (guard-ai S28) a locked shut door is shut on the guards' grid: this level read unlocks the doors for its queries and locks them back in the same evaluate (no frame between)
    const held = g.world.doors.list.filter((d) => d.anchor.locked); for (const d of held) g.world.doors.setLocked(d, false);
    for (const r of g.world.map.sectors[3].routes) {
      for (let i = 0; i + 1 < r.pts.length; i++) {
        if ((r.climbs ?? []).includes(i)) continue;
        const a = r.pts[i];
        const c = r.pts[i + 1];
        legs++;
        if (!g.nav.findPath([a[0], a[1]], [c[0], c[1]], 200000, a[2] ?? 0, c[2] ?? 0)) fails.push(`${r.name} leg ${i}`);
      }
    }
    for (const d of held) g.world.doors.setLocked(d, true);
    return { legs, fails };
  });
  console.log(`  S4: ${nv.legs} route legs checked`);
  assert(nv.fails.length === 0, `every walked S4 route leg has a nav path (${nv.fails.join('; ')})`);

  // (d) the desk: refused while #5 (the guard nearest (-2.5, 44.6)) stands, then he is knocked out and the console loops the cameras
  const refused = await G(() => window.__sector.useDesk(0));
  assert(refused < 0, `the desk is refused while the operator stands (${refused})`);
  await G(() => {
    const g = window.__app.current;
    let best = null;
    let bd = 1e9;
    for (const e of g.enemyMgr.enemies) {
      const d = Math.hypot(e.pos.x + 2.5, e.pos.z - 44.6);
      if (e.alive && d < bd) { bd = d; best = e; }
    }
    best.knockOut({ amount: 9999, point: best.pos.clone(), dir: best.pos.clone().normalize(), part: 'body', kind: 'melee', attackerTeam: 'player', attackerId: 'local', sourcePos: g.player.position.clone(), impulse: 1 });
  });
  await sim(0.3);
  const used = await G(() => ({ r: window.__sector.useDesk(0), mode: window.__sector.debug().desks[0] }));
  assert(used.r === 1 && used.mode === 1, `the console loops the cameras once #5 is down (${JSON.stringify(used)})`);

  // (e) one player cannot open the cage's rear gate
  const pg = await G(() => { const m = window.__sector; const a = m.turnKey(3, 0, true); const c = m.turnKey(3, 0, false); return { a, c, open: m.debug().pairGates[3][0] }; });
  assert(pg.c === 'wait' && pg.open === false, `one player alone cannot open pg-cage (${JSON.stringify(pg)})`);

  // (f) the stealth route to the cage terminal, the download, C4's near door opens
  const route = await G(() => window.__app.current.world.map.sectors[3].routes[0]);
  for (let i = 1; i < route.obj; i++) {
    const p = route.pts[i];
    await tp(G, p[0], p[2] ?? 0, p[1], Math.PI / 2);
    await sim(0.1);
  }
  const at = route.pts[route.obj];
  await tp(G, at[0], at[2] ?? 0, at[1], Math.PI);
  await sim(0.4);
  await press(page, BTN.A);
  await sim(10.8);
  const dl = await G(() => window.__sector.debug());
  assert(dl.phase === 'connector' && dl.nearLocked === false, `the download opens C4's near door (${JSON.stringify([dl.phase, dl.nearLocked])})`);

  // (g) the lure: the player hidden in the riser, the AI on, the hall panel's group-70 switch used
  await tp(G, 32.2, 0, 46.5, 0);
  const lure = await G(() => {
    const g = window.__app.current;
    delete g.enemyMgr.update;
    const sws = g.world.layout.switches;
    const k = sws.findIndex((s) => s.group === 70);
    const sw = sws[k];
    window.__s4before = g.enemyMgr.enemies.filter((e) => e.alive).map((e) => ({ e, d: Math.hypot(e.pos.x - sw.pos.x, e.pos.z - sw.pos.z) }));
    const it = g.interactables.items.find((x) => x.id === `switch-${k}`);
    it.onUse(it, 'local');
    return { k, sw: [sw.pos.x, sw.pos.z] };
  });
  await sim(15);
  const lured = await G((sw) => {
    const g = window.__app.current;
    let best = 0;
    for (const q of window.__s4before) best = Math.max(best, q.d - Math.hypot(q.e.pos.x - sw[0], q.e.pos.z - sw[1]));
    return { best, on: g.world.level.lights.lights.filter((l) => l.group === 70 && l.on).length };
  }, lure.sw);
  assert(lured.on === 0 && lured.best >= 4, `the cut s4-cold-1 draws a guard >= 4 m closer to the hall panel within 15 s (${JSON.stringify(lured)})`);
  await G(() => { const g = window.__app.current; g.enemyMgr.update = () => {}; });

  // (h) the exit legs, C4's checkpoint, the cycle, section 5 loads
  for (let i = route.obj + 1; i < route.pts.length; i++) {
    const p = route.pts[i];
    await tp(G, p[0], p[2] ?? 0, p[1], -Math.PI / 2);
    await sim(0.1);
  }
  await tp(G, S[3].cp.x, S[3].cp.y, S[3].cp.z, S[3].cp.yaw);
  await sim(1.3);
  const cyc = await G(() => ({ d: window.__sector.debug(), n: window.__app.current.enemyMgr.enemies.length }));
  assert(cyc.d.conn === 'cycling' && cyc.d.nearLocked === true && cyc.n === 0, `C4 cycles: the colonnade door locks, section 4 unloads (${JSON.stringify([cyc.d.conn, cyc.d.nearLocked, cyc.n])})`);
  await sim(3.2);
  const s5 = await G(() => window.__sector.debug());
  assert(s5.index === 4 && s5.id === 's5', `section 5 loads behind C4 (${JSON.stringify([s5.index, s5.id])})`);
}

if (want(6)) {
  console.log('campus ops (S4): the data hall - the dock board codes, the desk, the pair gate, the hall panel lure, the cage download, C4');
  await run(CAMPUS, async ({ page }) => campusS4Part(page));

  console.log('campus ops (S4, CR4): solo probes at the cable basket B1 never hold or stand on a basket');
  await run(CAMPUS, async ({ G }) => {
    await G(() => {
      const g = window.__app.current;
      g.target.damageMul = 0;
      g.enemyMgr.update = () => {};
      if (g.security) g.security.fixedUpdate = () => {};
      if (window.__ctdev) window.__ctdev.fixedUpdate = () => {};
      window.__app.settings.update((d) => { d.gamepad.curve = 'linear'; d.gamepad.deadzoneLeft = 0; });
      const H = {
        st: () => window.__app.current,
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
          const grip = !a ? null : a.kind === 'ledge' ? a.top : a.kind === 'pipeH' ? a.hangHeight : null;
          const r = (v) => Math.round(v * 100) / 100;
          return { x: r(c.pos.x), y: r(c.pos.y), z: r(c.pos.z), grounded: c.grounded, attached: ac.active, grip };
        },
      };
      window.__re = H;
      window.__app.loop.manual = true;
    });
    const step = (s, sx = 0, sy = 0, btns = []) => G(([s, sx, sy, b]) => window.__re.step(s, sx, sy, b), [s, sx, sy, btns]);
    const tap = (b) => G((b) => window.__re.tap(b), b);
    const put = (x, y, z, yaw) => G(([x, y, z, w]) => window.__re.tp(x, y, z, w), [x, y, z, yaw]);
    const info = () => G(() => window.__re.info());
    await step(0.5);
    const probe = async (name, spot, yaw, runFrom, y0 = 0) => {
      let max = 0;
      let topY = 0;
      const track = (i) => {
        if (i.attached && i.grip !== null) max = Math.max(max, i.grip);
        if (i.grounded) topY = Math.max(topY, i.y);
      };
      await put(spot[0], y0, spot[1], yaw);
      await step(0.4);
      await tap(BTN.Y);
      for (let k = 0; k < 15; k++) {
        await step(0.1);
        track(await info());
      }
      const [rx, rz] = runFrom;
      const ry = Math.atan2(spot[0] - rx, spot[1] - rz);
      const fx = Math.sin(ry);
      const fz = Math.cos(ry);
      await put(rx, y0, rz, ry);
      await G(() => { const gs = window.__app.current.player.controller.gears; if (gs) gs.gear = 5; });
      let jumped = -1;
      for (let k = 0; k < 60; k++) {
        const i = await info();
        const d = (spot[0] - i.x) * fx + (spot[1] - i.z) * fz;
        if (jumped < 0 && (d < 0.3 || k === 40)) jumped = k;
        await step(0.05, 0, 1, jumped >= 0 && (k - jumped) % 2 === 0 ? [BTN.Y] : []);
        track(await info());
      }
      await step(1.0);
      track(await info());
      const fin = await info();
      assert(max < BAND_LO && topY < BAND_LO && fin.y < BAND_LO, `${name}: alone, never holds a 4.25+ grip nor stands that high (held ${max}, stood ${topY}, ends y ${fin.y})`);
    };
    await probe('CR4 east face from the floor at (5.6, 34)', [5.6, 34.0], -PI / 2, [10.6, 34.0]);
    await probe('CR4-west face from the floor at (1.6, 34)', [1.6, 34.0], PI / 2, [-3.4, 34.0]);
    await probe('CR4 wall jump off the pod P2 west face', [4.2, 30.0], PI / 2, [2.9, 30.0]);
  });
}

// (guard-ai S16, `--part=6`) guards hold fire at armour: written, not run (the slice brief). The NOC pair (S4 #14-15, on
// the mezzanine at z 43, y 3.6) watch the hall through arm-noc, the armoured clear window (x -3.5..7.5, z 42, sill 4.6).
// Seeded Math.random, sim-time steps. The player stands on the hall floor in front of the window, the pair are told
// straight to combat: one of them sees him through the pane (sight is MASK.SIGHT, which clear armour passes), the fire
// gate casts and finds the pane, and neither fires a round while he stands in the NOC over 10 s; each then repositions
// (leaves the NOC by the stairs, or a cover spot with a clear line) or holds there (a leash), still alerted.
if (want(6)) {
  console.log('campus ops (S4, guard-ai S16): guards hold fire at armour (the NOC pair, arm-noc)');
  await run(CAMPUS, async ({ G, sim }) => {
    const S = await sections(G);
    if (!(S.length >= 4 && S[3].id === 's4' && S[3].guards === 20)) {
      console.log(`  guard-ai S16: section 4 is not the built one here (${JSON.stringify(S.map((s) => [s.id, s.guards]))}), skipped`);
      return;
    }
    // seeded Math.random (mulberry32): the bursts, pauses and cover rolls replay
    await G(() => {
      let a = 0x516;
      Math.random = () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    });
    // frozen AI and no damage on the way in (campusS4Part's walk to section 4)
    await G(() => { const g = window.__app.current; g.target.damageMul = 0; g.enemyMgr.update = () => {}; if (g.security) g.security.fixedUpdate = () => {}; if (window.__ctdev) window.__ctdev.fixedUpdate = () => {}; });
    await sim(0.5);
    for (let i = 0; i < 3; i++) {
      await G(() => { const m = window.__sector; if (m.run.current.objective.kind === 'download') { m.run.downloading = true; m.run.download(999); } else m.run.objectiveDone(); });
      await sim(0.3);
      await tp(G, S[i].cp.x, S[i].cp.y, S[i].cp.z, S[i].cp.yaw);
      await sim(4.6);
    }
    const d4 = await G(() => window.__sector.debug());
    assert(d4.index === 3 && d4.id === 's4', `the run reaches section 4 (${JSON.stringify([d4.index, d4.id])})`);
    // in the NOC: on the mezzanine behind the window (x -4..8, z 42..48, y 3.6)
    await G(() => { window.__s16noc = (e) => e.pos.y > 3 && e.pos.z > 41.8 && e.pos.z < 48 && e.pos.x > -4 && e.pos.x < 8; });
    const noc = await G(() => window.__app.current.enemyMgr.enemies.filter((e) => e.alive && window.__s16noc(e)).map((e) => e.id));
    assert(noc.length >= 1, `the NOC pair stand in the NOC (${JSON.stringify(noc)})`);
    // (S16 fix round, A88) the player on the hall floor in front of the window, picked with the AI still frozen so the pair
    // stay at the window while spots are tried (alerted without sight they head for the stairs, and from the back of the NOC
    // the sill hides the floor): each NOC guard runs his own sight pass (Enemy.perceive, the one update calls) and the first
    // spot either sees him from is kept. The spots are the west aisle of the hall, clear of pod P1's roof (x -1..2.6, z
    // 24..32, top 3.0) and the baskets B1 / B-N, far enough out that the sill (4.6) does not hide them; every line from the
    // NOC to the hall floor crosses arm-noc, the only opening (tests/campusS4NocSight.test.ts pins the spots and the pane).
    let spot = null;
    for (const [x, z] of [[-2.5, 30], [-2, 31], [-1.5, 32], [-2.5, 29]]) {
      await tp(G, x, 0, z, 0);
      await sim(0.4);
      const seen = await G((ids) => window.__app.current.enemyMgr.enemies.filter((e) => e.alive && ids.includes(e.id) && window.__s16noc(e)).map((e) => { e.perceive(); return e.los; }), noc);
      if (seen.some(Boolean)) {
        spot = [x, z];
        break;
      }
    }
    const me = await G(() => { const p = window.__app.current.player.position; return { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2) }; });
    assert(spot && me.y < 0.5 && me.z < 41, `a NOC guard at the window has a sight line to the player on the hall floor (Enemy.perceive; ${JSON.stringify([spot, me.x, me.y, me.z])})`);
    // (S16 fix 2, A89) sim time only from here: the loop in manual mode (rAF frames render, never step the sim), so the
    // steps below are the only sim time (1.5 s + 10 s, under `ALERT.lostSight` 12 s) and the seeded rolls replay. Without
    // it every page round trip let rAF step the sim on in real time: on the first GPU run (2e51e7e6) the pair, out of
    // sight in their cover, timed out of combat (lostSight) inside a nominal ~11 s.
    await G(() => { window.__app.loop.manual = true; });
    // the AI on, the pair straight to combat
    await G((ids) => { const g = window.__app.current; delete g.enemyMgr.update; for (const e of g.enemyMgr.enemies) if (ids.includes(e.id)) e.alert(); }, noc);
    const look = (ids) =>
      G((ids) =>
        window.__app.current.enemyMgr.enemies
          .filter((e) => ids.includes(e.id))
          .map((e) => ({ id: e.id, alive: e.alive, alerted: e.alerted, los: e.los, blocked: e.fireGate.blocked, casts: e.fireGate.casts, held: e.fireGate.heldTicks, rounds: e.roundsFired, noc: window.__s16noc(e), x: e.pos.x, z: e.pos.z, y: e.pos.y, state: e.state, level: e.level, t: +e.aware.t.toFixed(2), since: +e.sinceSeen.toFixed(2) })),
      ids);
    // alerted, through the update path: a guard still in the NOC sees him through the pane within 1.5 s
    let sees = false;
    for (let k = 0; k < 15 && !sees; k++) {
      await G(() => window.__app.loop.stepHeadless(0.1));
      sees = (await look(noc)).some((s) => s.noc && s.los);
    }
    assert(sees, `a NOC guard sees the player on the hall floor through the armoured window (sight passes clear armour; from ${spot})`);
    const start = await look(noc);
    const prev = Object.fromEntries(start.map((s) => [s.id, s.rounds]));
    const at0 = Object.fromEntries(start.map((s) => [s.id, [s.x, s.z, s.y]]));
    let intoGlass = 0;
    let sawBlocked = false;
    for (let k = 0; k < 100; k++) {
      await G(() => window.__app.loop.stepHeadless(0.1));
      for (const s of await look(noc)) {
        if (s.noc && s.rounds > prev[s.id]) intoGlass += s.rounds - prev[s.id];
        prev[s.id] = s.rounds;
        if (s.blocked) sawBlocked = true;
      }
    }
    const end = await look(noc);
    assert(sawBlocked && end.some((s) => s.casts > 0 && s.held > 0), `the fire gate cast the line and held on the pane (${JSON.stringify(end.map((s) => [s.id, s.casts, s.held]))})`);
    assert(intoGlass === 0, `no round into the armoured window from the NOC in 10 s (${intoGlass})`);
    assert(end.every((s) => !s.alive || s.alerted), `the pair stay in combat: sight and the alert level unchanged (${JSON.stringify(end.map((s) => [s.id, s.alerted, s.level, `t ${s.t}`, `unseen ${s.since}`]))})`);
    const how = end.map((s) => {
      const a = at0[s.id];
      const d = Math.hypot(s.x - a[0], s.z - a[1]);
      return `${s.id}: ${!s.noc ? 'left the NOC' : d > 1.5 ? `moved ${d.toFixed(1)} m` : 'held'} (${s.state}, rounds ${s.rounds})`;
    });
    console.log(`  guard-ai S16: from (${spot}) ${how.join('; ')}`);
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// (sector-redesign slice 5, `--part=6`) Saltmarsh Park, section 5: the Old House and the extraction
// (docs/sector-redesign/briefs/SLICE5.md). A self-contained block, run only when the page's section 5 is the built one (24
// guards): sections 1-4 are told done and their connectors cycled, then (a) index 4, 24 guards, the three cameras, las-shaft
// with its panel, the item cap; (b) the keyholders stand at their posts; (c) the rota board gives the archive code and
// kp-arch opens; (d) every walked leg of the three routes has a nav path; (e) one player cannot turn the pair gate's keys;
// (f) the garden board cuts group 84 and it returns after its window; (g) the stealth route to the token and the grab
// opens the extraction; (h) the alarm to stage 2 locks a door; (i) the jetty ends the run. Skipped (written, not run; the
// slice 5 build sheet): CR6 with two players, the CR7 rope, the dual takedown.
async function campusS5Part(page) {
  const G = (f, a) => page.evaluate(f, a);
  const sim = async (s) => { for (let t = 0; t < s; t += 0.5) await G((d) => window.__app.loop.stepHeadless(d), Math.min(0.5, s - t)); await frames(page, 1); };
  const S = await sections(G);
  if (!(S.length === 5 && S[4].id === 's5' && S[4].guards === 24)) {
    console.log(`  campus ops (S5): section 5 is not the built one here (${JSON.stringify(S.map((s) => [s.id, s.guards]))}), skipped`);
    return;
  }
  // frozen AI and no damage on the way in
  await G(() => { const g = window.__app.current; g.target.damageMul = 0; g.enemyMgr.update = () => {}; if (g.security) g.security.fixedUpdate = () => {}; });
  await sim(0.5);
  for (let i = 0; i < 4; i++) {
    await G(() => { const m = window.__sector; if (m.run.current.objective.kind === 'download') { m.run.downloading = true; m.run.download(999); } else m.run.objectiveDone(); });
    await sim(0.3);
    await tp(G, S[i].cp.x, S[i].cp.y, S[i].cp.z, S[i].cp.yaw);
    await sim(4.6);
  }
  // (a) section 5 is live
  const d5 = await G(() => ({ d: window.__sector.debug(), alive: window.__app.current.enemyMgr.alive, ct: window.__ctdev.debug(), items: window.__app.current.interactables.items.length, live: window.__app.current.interactables.scopedCount(), scope: window.__app.current.interactables.scope }));
  assert(d5.d.index === 4 && d5.d.id === 's5' && d5.d.phase === 'objective', `the run reaches section 5 (${JSON.stringify([d5.d.index, d5.d.id, d5.d.phase])})`);
  assert(d5.alive === 24, `section 5 has 24 guards in (${d5.alive})`);
  const live5 = d5.ct.cams.filter((c) => c.live).map((c) => c.id).sort();
  assert(JSON.stringify(live5) === JSON.stringify(['cam-gallery', 'cam-hall', 'cam-terrace']), `the three S5 cameras are the live ones (${JSON.stringify(live5)})`);
  const las5 = d5.ct.lasers.filter((l) => l.live);
  assert(las5.length === 1 && las5[0].id === 'las-shaft' && las5[0].panel !== '', `las-shaft is live with its panel (${JSON.stringify(las5)})`);
  assert(d5.scope === 4 && d5.live < d5.items && d5.live <= 100, `the mirrored (live) interactable list stays under the cap (${d5.live} of ${d5.items}, scope ${d5.scope})`);

  // (b) the keyholders stand at their posts
  const keys = await G(() => {
    const es = window.__app.current.enemyMgr.enemies.filter((e) => e.alive);
    const near = (x, z) => es.reduce((a, e) => { const d = Math.hypot(e.pos.x - x, e.pos.z - z); return d < a ? d : a; }, 1e9);
    return [near(-44, 34), near(-42, 34)];
  });
  assert(keys[0] < 0.5 && keys[1] < 0.5, `the two keyholders stand at (-44, 34) and (-42, 34) (${keys.map((k) => k.toFixed(2))})`);

  // (c) the rota board gives the archive code; kp-arch opens
  await tp(G, -27.5, 0, 37, -Math.PI / 2);
  await sim(0.3);
  const code = await G(() => {
    const g = window.__app.current;
    const it = g.interactables.items.find((x) => x.id === 'c-sintel-4-0');
    if (!it) return { found: false };
    it.onUse(it, 'local');
    return { found: true, open: window.__sector.useKeypad(4, 0) };
  });
  assert(code.found && code.open === true, `the rota board gives the code and kp-arch opens (${JSON.stringify(code)})`);

  // (d) every walked route leg has a path on the real grid
  const nv = await G(() => {
    const g = window.__app.current;
    const fails = [];
    let legs = 0;
    // (guard-ai S28) a locked shut door is shut on the guards' grid: this level read unlocks the doors for its queries and locks them back in the same evaluate (no frame between)
    const held = g.world.doors.list.filter((d) => d.anchor.locked); for (const d of held) g.world.doors.setLocked(d, false);
    for (const r of g.world.map.sectors[4].routes) {
      for (let i = 0; i + 1 < r.pts.length; i++) {
        if ((r.climbs ?? []).includes(i)) continue;
        const a = r.pts[i];
        const c = r.pts[i + 1];
        legs++;
        if (!g.nav.findPath([a[0], a[1]], [c[0], c[1]], 200000, a[2] ?? 0, c[2] ?? 0)) fails.push(`${r.name} leg ${i}`);
      }
    }
    for (const d of held) g.world.doors.setLocked(d, true);
    return { legs, fails };
  });
  console.log(`  S5: ${nv.legs} route legs checked`);
  assert(nv.fails.length === 0, `every walked S5 route leg has a nav path (${nv.fails.join('; ')})`);

  // (e) one player alone: the pair gate's key turned, then the other, never opens it
  const k1 = await G(() => window.__sector.turnKey(4, 0, true));
  const k2 = await G(() => window.__sector.turnKey(4, 0, false));
  assert(k1 === 'wait' && k2 === 'wait', `one player cannot open the pair gate (${k1}, ${k2})`);

  // (f) the garden board: group 84 off, back after its 20 s window
  const lampsOn = () => G(() => window.__app.current.world.level.lights.lights.filter((l) => l.group === 84 && l.on).length);
  const n84 = await lampsOn();
  await tp(G, -30.5, 0, 40, Math.PI / 2);
  await sim(0.2);
  await G(() => { const g = window.__app.current; const it = g.interactables.items.find((x) => x.id === 'board-1'); it.onUse(it, 'local'); });
  await sim(0.2);
  const off84 = await lampsOn();
  assert(off84 === 0 && n84 === 10, `the garden board cuts the ten lamps of group 84 (${n84} -> ${off84})`);
  await sim(21);
  assert((await lampsOn()) === n84, 'the garden circuit comes back after the window');

  // (g) the stealth route to the token, the grab opens the extraction
  const route = await G(() => window.__app.current.world.map.sectors[4].routes[0]);
  for (let i = 1; i < route.obj; i++) {
    const p = route.pts[i];
    await tp(G, p[0], p[2] ?? 0, p[1], 0);
    await sim(0.1);
  }
  const at = route.pts[route.obj];
  await tp(G, at[0], at[2] ?? 0, at[1], 0);
  await sim(0.4);
  await press(page, BTN.A);
  await sim(0.4);
  const grab = await G(() => window.__sector.debug());
  assert(grab.phase === 'extract', `the token grab opens the extraction (${JSON.stringify([grab.phase])})`);

  // (h) the alarm to stage 2 locks a lockdown door (when the mode lets the test raise it)
  const lock = await G(() => { const m = window.__sector; if (typeof m.onAlarm !== 'function') return null; m.onAlarm(); m.onAlarm(); return m.debug(); });
  if (lock) assert(lock.stage === 2 && lock.lockdown === 1, `alarm stage 2 locks the garden door (${JSON.stringify([lock.stage, lock.lockdown])})`);
  else console.log('  S5: no way to raise the alarm from here, the lockdown check skipped');

  // (i) the jetty ends the run
  await tp(G, -45, 0.4, 63, 0);
  await sim(1);
  const end = await G(() => window.__sector.debug());
  assert(end.phase === 'done', `standing on the jetty ends the run (${end.phase})`);
}

if (want(6)) {
  console.log('campus ops (S5): the Old House - the rota board, the garden board, the stealth grab, the jetty');
  await run(CAMPUS, async ({ page }) => campusS5Part(page));
}

// (guard-ai S6, design 7, M4, M1) The alarm by radio. The section's guards go, the live panel is off (the radio path
// only), the cameras are held, the player stands far off in the dark. (a) A guard forced into combat is knocked out
// during his contact call: no command call, no alarm stage, nobody comes. (b) Another one's contact gets through: he
// holds the command call (RADIO.report x reaction), the stage rises by radio and the section's perStage reinforcements
// come in at its entry points (`SectorDef.entries`, else its reinforce points): aggressive, in combat on the last known
// position at once, closing on it fast, never calm. Numbers from the tables.
if (want(1)) {
  console.log('sector ops: the alarm by radio; the caller cut first stops it; aggressive reinforcements (guard-ai S6)');
  await run(PARAMS, async ({ G, sim }) => {
    await G(() => { const g = window.__app.current; g.target.damageMul = 0; if (g.security) g.security.fixedUpdate = () => {}; if (window.__ctdev) window.__ctdev.fixedUpdate = () => {}; });
    await sim(0.5);
    const S = await sections(G);
    const r = await G((o) => {
      const g = window.__app.current;
      const em = g.enemyMgr;
      const nav = em.nav;
      const V = g.player.position.constructor;
      const step = (s) => window.__app.loop.stepHeadless(s);
      const dbg = () => window.__sector.debug();
      // (guard-ai S10, S6 close-on fix) seeded Math.random for the block (the think cadence and the shout / radio
      // delays still draw on it), restored at the end; every step below is sim time
      const rnd0 = Math.random;
      let sd = 0x5eed6;
      Math.random = () => {
        sd = (sd + 0x6d2b79f5) | 0;
        let q = Math.imul(sd ^ (sd >>> 15), 1 | sd);
        q = (q + Math.imul(q ^ (q >>> 7), 61 | q)) ^ q;
        return ((q ^ (q >>> 14)) >>> 0) / 4294967296;
      };
      for (const e of [...em.enemies]) em.despawn(e);
      for (const p of em.alarms) p.disabled = true;
      g['updateLight'] = () => (g.localRef.light = g.lightLevel = 0);
      g.player.controller.teleport(new V(o[0] - 40, o[1], o[2] - 40), 0);
      const c = nav.nearestWalkable(o[0], o[2], 6, o[1]);
      const [x, z] = nav.center(c);
      const y = nav.height[c];
      const out = { R: em.radioTable.report, react: em.diff.reaction };
      const hit = (e) => ({ amount: 9999, point: e.pos.clone(), dir: new V(0, 0, 1), part: 'body', kind: 'melee', attackerTeam: 'player', attackerId: 'local', sourcePos: e.pos.clone(), impulse: 0 });
      // (a) cut during the contact call
      const d0 = dbg();
      const s0 = em.command.started;
      const A = em.spawn('grunt', new V(x, y, z), false, 0);
      em.placeSlot(A, { yaw: 0 }, 0);
      step(0.3);
      A.alert();
      step(0.5);
      out.aLeft = em.radioLeft(A);
      A.knockOut(hit(A));
      step(12);
      const d1 = dbg();
      Object.assign(out, { aStarted: em.command.started - s0, aRaised: em.alarmRaised, aStage: [d0.stage, d1.stage], aSent: d1.reinforced - d0.reinforced });
      em.despawn(A);
      // (b) the call gets through
      // (guard-ai S24, A146/A148) one last known position per player, and a guard with none for his intruder never
      // walks to the real feet: the player was seen here (his slot, the mirrored lkp), B hunts him (told before he goes
      // to combat), so B's contact names him and the reinforcements come for that spot (the old direct `em.lkp` write
      // gave no guard an intruder: they stood at the entry)
      const slot = em.ctx.reportSighting({ id: g.localRef.id, feet: new V(x, y, z), spotted: false });
      const B = em.spawn('grunt', new V(x, y, z), false, 0);
      em.placeSlot(B, { yaw: 0 }, 0);
      step(0.3);
      B.tell(slot);
      B.alert();
      out.bHunt = [slot, B.hunt, em.lkpValid];
      let t = 0;
      let tCmd = -1;
      while (!em.alarmRaised && t < 15) {
        step(0.1);
        t += 0.1;
        if (tCmd < 0 && em.command.caller === B.num) tCmd = t;
      }
      const d2 = dbg();
      const sec = g.world.map.sectors[0];
      const pts = (sec.entries ?? []).length ? sec.entries.map((q) => q.at) : sec.reinforce;
      const reinf = em.enemies.filter((e) => e.alive && e.profile === 'aggressive');
      const atEntry = reinf.map((e) => Math.min(...pts.map((p) => Math.hypot(e.pos.x - p[0], e.pos.z - p[1]))));
      // (S6 close-on fix) the distance they close is the route's (the flow field to the LKP, the way they go): the
      // office's only way in is ~20 m round by the workshop door, and along it the straight line stays at 6.5-7.5 m
      // from 4 to 10 m in (tests/s6CloseOn.test.ts)
      const fd = nav.flowField([[x, z]], undefined, [y]);
      const rd = (e) => {
        let c = nav.cellOf(e.pos.x, e.pos.z, e.pos.y);
        if (!(fd[c] < Infinity)) c = nav.nearestWalkable(e.pos.x, e.pos.z, 3, e.pos.y);
        return c >= 0 ? fd[c] * nav.cell : Infinity;
      };
      const toLkp = () => reinf.map((e) => Math.hypot(e.pos.x - x, e.pos.z - z));
      const toLkpRoute = () => reinf.map(rd);
      const dl0 = toLkp();
      const rl0 = toLkpRoute();
      step(1);
      const lv1 = reinf.map((e) => e.level);
      step(7);
      const dl1 = toLkp();
      const rl1 = toLkpRoute();
      step(30);
      const lv2 = reinf.map((e) => (e.alive ? e.level : 'down'));
      g['updateLight'] = Object.getPrototypeOf(g)['updateLight'];
      Math.random = rnd0;
      Object.assign(out, { tCmd, tAl: t, by: em.alarmBy, stage: [d1.stage, d2.stage], sent: d2.reinforced - d1.reinforced, perStage: sec.perStage, n: reinf.length, atEntry, lv1, dl0, dl1, rl0, rl1, lv2, walk: reinf[0]?.def.walkSpeed ?? 0, run: reinf[0]?.def.runSpeed ?? 0 });
      return out;
    }, S[0].obj);
    const f2 = (v) => v.toFixed(2);
    assert(r.aLeft > 0.3 && r.aStarted === 0 && !r.aRaised && r.aStage[1] === r.aStage[0] && r.aSent === 0, `S6: the caller knocked out during his call (${f2(r.aLeft)} s left): no command call, no alarm, nobody comes (${JSON.stringify(r)})`);
    assert(r.bHunt[0] >= 0 && r.bHunt[1] === r.bHunt[0] && r.bHunt[2], `S6: B hunts the player seen at the spot (slot, hunt, lkpValid ${JSON.stringify(r.bHunt)})`);
    assert(r.tCmd > 0 && r.by === 'radio' && Math.abs(r.tAl - r.tCmd - r.R * r.react) < 0.35, `S6: his contact gets through, he calls command, and ${f2(r.R * r.react)} s later the alarm goes off by radio (command at ${f2(r.tCmd)} s, alarm at ${f2(r.tAl)} s, '${r.by}')`);
    assert(r.stage[1] === r.stage[0] + 1 && r.sent === r.perStage && r.n === r.perStage, `S6: the stage rises and the section's ${r.perStage} reinforcements come in, aggressive (${r.stage}, sent ${r.sent}, aggressive ${r.n})`);
    assert(r.atEntry.every((d) => d < 4), `S6: they come in at the section's entry points (${r.atEntry.map(f2)} m)`);
    assert(r.lv1.every((l) => l === 'alert'), `S6: in combat at once, on the last known position (${r.lv1})`);
    // (S6 close-on fix) along the route, by the design: the point (aggressive) bounds and walks the last stretch at the
    // aggressive pace (run x AGGRESSIVE_JOG 0.75, enemy.ts) for the 8 s from the spawn, less 1 s to be told by command
    // and get a role (think + the 2 Hz roles tick), one advanceHold (0.8 s, BEHAVIOUR.aggressive) and two 0.7 s door
    // checks (Enemy.perceive); half of that run (starts, stops, turns). The flank goes sideways by design (one closes).
    const minClose = 0.5 * r.run * 0.75 * (8 - 1 - 0.8 - 2 * 0.7);
    const closed = r.rl0.map((d, i) => d - r.rl1[i]);
    assert(r.rl1.every((d) => d < 4) || closed.some((d) => d > minClose), `S6: they close on it along the route (${r.rl0.map(f2)} -> ${r.rl1.map(f2)} m in 8 s, need ${f2(minClose)} m; straight ${r.dl0.map(f2)} -> ${r.dl1.map(f2)} m; walk ${r.walk}, run ${r.run})`);
    assert(r.lv2.every((l) => l === 'alert' || l === 'searching' || l === 'down'), `S6: still hunting 38 s on (never calm: alertState pins the endless search) (${r.lv2})`);
  });
}

// (guard-ai S13, stealth over shooting items 3, 4, 11; A37-A39) Response teams. Section 1 with its loaded guards, the
// live panel off, the cameras held (their own clock: this checks the stage changes none of them), the player far off in
// the dark (no damage), a last known position set in the section. Three alarms by the mode's own path (`onAlarm`):
// stage 2 -> every living guard wears armour, stage 3 -> a helmet too; each stage's team leads with a shield guard
// (`enforcer`, helmeted), perStage strong; the camera count and states never change. Then hide: after the search of the
// last known position (`ALERT.searchTime`) the first team sweeps (it switches to the sweep and looks at sweep points),
// and at 120 s every member is still hunting (searching or in combat), none calm. Sim-time steps only; Math.random
// seeded (as e2e-stealth-ai 'lkp').
if (want(1)) {
  console.log('sector ops: response teams: stage gear, shield-led teams, the sweep after the search (guard-ai S13)');
  await run(PARAMS, async ({ G, sim }) => {
    await G(() => { const g = window.__app.current; g.target.damageMul = 0; if (g.security) g.security.fixedUpdate = () => {}; if (window.__ctdev) window.__ctdev.fixedUpdate = () => {}; });
    await sim(0.5);
    const S = await sections(G);
    const r = await G((o) => {
      const g = window.__app.current;
      const em = g.enemyMgr;
      const m = window.__sector;
      const nav = em.nav;
      const V = g.player.position.constructor;
      const step = (s) => window.__app.loop.stepHeadless(s);
      window.__s13rnd = Math.random;
      let seed = 1313;
      Math.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (const p of em.alarms) p.disabled = true;
      g['updateLight'] = () => (g.localRef.light = g.lightLevel = 0);
      g.player.controller.teleport(new V(o[0] - 40, o[1], o[2] - 40), 0);
      const c = nav.nearestWalkable(o[0], o[2], 6, o[1]);
      const [x, z] = nav.center(c);
      em.lkp.set(x, nav.height[c], z);
      em.lkpValid = true;
      em.sightT = 0;
      const ct = m.ct;
      const cams = () => JSON.stringify(ct.cams.map((k) => [k.def.id, k.mode, k.range, k.frozen, ct.live(k.def.id)]));
      const cam0 = { n: ct.cams.length, s: cams() };
      const living = () => em.enemies.filter((e) => e.alive && !e.dog);
      const out = { stage0: m.run.alarm, perStage: g.world.map.sectors[0].perStage, cam0: cam0.n };
      // (guard-ai S27, A164) the section's own guards before the stage rises, read as the `e2e-guard-carry` suite reads the
      // carry (`carry.holstered` / `carry.drawn`); `em.alarmRaised` is the guards' own alarm (a panel / command call), which
      // the mode's `onAlarm()` does not set: this is the camera / laser case, a stage and nothing else
      const own = living();
      out.carryN = own.length;
      out.holst0 = own.filter((e) => e.carry.holstered).length;
      out.raised0 = em.alarmRaised;
      m.onAlarm();
      step(0.6);
      out.stage1 = m.run.alarm;
      out.holst1 = own.filter((e) => e.alive && e.carry.holstered).length;
      out.gear1 = living().map((e) => [e.helmet, e.armour]);
      m.onAlarm();
      step(0.6);
      out.stage2 = m.run.alarm;
      out.armour2 = living().map((e) => e.armour);
      m.onAlarm();
      step(0.6);
      out.stage3 = m.run.alarm;
      // (S27) 1.8 s after the first stage rise (inside the 2 s the draw is owed in; the longest draw clip is 0.7 s)
      out.drawn3 = own.filter((e) => e.alive).map((e) => e.carry.drawn);
      out.raised3 = em.alarmRaised;
      out.both3 = living().map((e) => e.helmet && e.armour);
      out.teams = em.teams.map((t) => t.members.map((e) => e.def.kind));
      out.shieldHelmet = em.teams.map((t) => t.members[0]?.helmet === true);
      out.camN = ct.cams.length;
      out.camSame = cams() === cam0.s;
      out.ctAlarm = ct.alarm;
      window.__s13 = { x, z, t: 1.8, firstSweep: -1, maxVisited: 0, maxLooked: 0, lead0: null, moved: 0 };
      return out;
    }, S[0].obj);
    // (the warehouse sections set no `gear` default and no slot tags: only the stage gives armour)
    assert(r.stage1 === r.stage0 + 1 && r.gear1.every(([, a]) => !a), `S13: stage 1 brings a team, no stage armour yet (${JSON.stringify(r.gear1)})`);
    // (guard-ai S27, A164) a stage without the guards' own alarm (`em.alarmRaised` false: the camera / laser case) ends the
    // calm area: every guard of the live section has his weapon drawn within 2 s (none holstered 0.6 s on)
    assert(r.carryN > 0 && r.holst0 > 0 && !r.raised0, `S27: the section's guards start calm, some holstered, no guard alarm (${r.holst0} of ${r.carryN} holstered, alarmRaised ${r.raised0})`);
    assert(!r.raised3 && r.holst1 === 0 && r.drawn3.length === r.carryN && r.drawn3.every(Boolean), `S27: after the stage rise (the guards' own alarm still ${r.raised3 ? 'raised' : 'off'}) none is holstered 0.6 s on (${r.holst1}) and all ${r.carryN} have the weapon drawn within 2 s (${r.drawn3})`);
    assert(r.stage2 === r.stage0 + 2 && r.armour2.every(Boolean), `S13: stage 2: every living guard wears armour (${r.armour2})`);
    assert(r.stage3 === r.stage0 + 3 && r.both3.every(Boolean), `S13: stage 3: every living guard wears armour and a helmet (${r.both3})`);
    assert(r.teams.length === 3 && r.teams.every((t) => t[0] === 'enforcer' && t.length === r.perStage && t.slice(1).every((k) => k === 'grunt')), `S13: each stage's team leads with a shield guard, perStage ${r.perStage} strong (${JSON.stringify(r.teams)})`);
    assert(r.shieldHelmet.every(Boolean), `S13: the shield guard always wears a helmet (${r.shieldHelmet})`);
    assert(r.camN === r.cam0 && r.camSame && r.ctAlarm === r.stage3, `S13: no camera added, woken or retuned across the stages (${r.cam0} -> ${r.camN}, same states ${r.camSame}; devices show stage ${r.ctAlarm})`);
    // hide: 10 s chunks to 120 s after the first alarm, the first team watched
    let w = null;
    for (let k = 0; k < 12; k++) {
      w = await G(() => {
        const em = window.__app.current.enemyMgr;
        const s = window.__s13;
        const t = em.teams[0];
        for (let i = 0; i < 20; i++) {
          window.__app.loop.stepHeadless(0.5);
          s.t += 0.5;
          if (t.sweeping && s.firstSweep < 0) s.firstSweep = s.t;
          s.maxVisited = Math.max(s.maxVisited, t.visited);
          // (guard-ai sweep fix round) looked at = visited less the points given up after two stalls (`SweepTeam.skipped`)
          s.maxLooked = Math.max(s.maxLooked, t.visited - t.skipped);
          const L = t.leader;
          if (L && t.sweeping) {
            if (!s.lead0) s.lead0 = [L.pos.x, L.pos.z];
            s.moved = Math.max(s.moved, Math.hypot(L.pos.x - s.lead0[0], L.pos.z - s.lead0[1]));
          }
        }
        const all = em.teams.flatMap((q) => q.members);
        const L = t.leader;
        return { t: s.t, firstSweep: s.firstSweep, visited: s.maxVisited, looked: s.maxLooked, skipped: t.skipped, stallN: t.stallN, leadAt: L ? [Math.round(L.pos.x * 100) / 100, Math.round(L.pos.z * 100) / 100, em.nav.isWalkable(em.nav.cellOf(L.pos.x, L.pos.z, L.pos.y))] : null, moved: s.moved, switches: t.switches, count: t.count, lv: all.map((e) => (e.alive ? e.level : 'down')), lead: t.members[0]?.def.kind };
      });
    }
    // (guard-ai S28, train 45) no sweep point looked at: where each team stands (its point, the leader, the members, the
    // locked shut doors on the grid) for the log
    console.log(`  S13 sweep: looked at ${w.looked}, visited ${w.visited}, skipped ${w.skipped}, stalls ${w.stallN}, leader at ${JSON.stringify(w.leadAt)}`);
    if (!(w.looked >= 1 && w.moved > 2)) {
      const diag = await G(() => {
        const g = window.__app.current;
        const em = g.enemyMgr;
        const f1 = (v) => Math.round(v * 10) / 10;
        const teams = em.teams.map((t) => ({ i: t.index, pt: t.point, at: t.point >= 0 ? [t.pts[2 * t.point], t.pts[2 * t.point + 1]] : null, n: t.count, visited: t.visited, dwell: f1(t.dwellT), sweeping: t.sweeping, pts: t.pts.slice(0, 2 * t.count).map(f1), m: t.members.map((e) => [f1(e.pos.x), f1(e.pos.z), e.alive ? e.level : 'down', em.nav.isWalkable(em.nav.cellOf(e.pos.x, e.pos.z, e.pos.y)), e.routePath.length]), lead: t.leader ? t.members.indexOf(t.leader) : -1, stallN: t.stallN, skipped: t.skipped }));
        const shut = g.world.doors.list.filter((d) => d.anchor.locked && d.target === 0).map((d) => [d.index, f1(d.cx), f1(d.cz)]);
        return { lkp: [f1(em.lkp.x), f1(em.lkp.z), em.lkpValid], teams, shut, ver: em.nav.version };
      });
      console.log(`  S13 diag: ${JSON.stringify(diag)}`);
    }
    await G(() => {
      const g = window.__app.current;
      g['updateLight'] = Object.getPrototypeOf(g)['updateLight'];
      if (window.__s13rnd) Math.random = window.__s13rnd;
    });
    const searchT = 60;
    assert(w.count > 0 && w.firstSweep >= searchT, `S13: the team sweeps only after its search of the last known position (${searchT} s; first sweep at ${w.firstSweep} s, ${w.count} points)`);
    assert(w.looked >= 1 && w.moved > 2, `S13: the team moves between sweep points (looked at ${w.looked}, skipped ${w.skipped}, the leader moved ${w.moved.toFixed(1)} m; switches ${w.switches})`);
    assert(w.t >= 120 && w.lv.every((l) => l === 'searching' || l === 'alert' || l === 'down') && !w.lv.includes('cooldown') && !w.lv.includes('unaware'), `S13: still hunting at ${w.t} s, none calm (${w.lv})`);
    assert(w.lead === 'enforcer', `S13: the shield guard still first in the team (${w.lead})`);
  });
}

console.log(all.length ? 'console problems:\n' + all.join('\n') : 'no console errors');
process.exit(failed || all.length ? 1 : 0);
