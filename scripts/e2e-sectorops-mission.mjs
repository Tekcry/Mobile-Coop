// (mission-framework EN2) e2e-sectorops part `mission` (run-e2e: `e2e-sectorops:mission`): the campus test mission
// (`src/world/maps/campusMissionTest.ts`) on Saltmarsh Park sections 1-2, solo. The mission is picked by `?mission=`
// (no compass, minimap or blip exists any more, G339). Section 1: the download is the intel step (its Guard AI
// event is raised), a kill breaks No kills (the radio line), the section restarts after the 2 s hold and the step
// goes back; the download again, C1. Section 2: the BMS hack is the exploit (it needs the badge fact), the exit opens,
// and everyone in C2 is the extraction: the op ends cleared. The guards are frozen and the player cannot be hurt (the
// test reads the mission, not the stealth). `?sectorGuards=4` keeps software GL quick.
import { launch, frames, press, BTN, assert } from './e2e-lib.mjs';
import { until } from './e2e-net-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const PARAMS = 'autostart=campusOps&mode=sector&mission=campusMissionTest&missions=1&sectorGuards=4';
let failed = false;
const all = [];

const { browser, page, errors } = await launch({ url, params: PARAMS });
const G = (f, a) => page.evaluate(f, a);
// headless fast-forward (no rendering), in chunks so the page stays responsive
const sim = async (s) => {
  for (let t = 0; t < s; t += 0.5) await G((d) => window.__app.loop.stepHeadless(d), Math.min(0.5, s - t));
  await frames(page, 1);
};
const tp = (x, y, z, yaw = 0) => G(([a, b, c, w]) => { const g = window.__app.current; const P = g.player.position.constructor; g.player.controller.teleport(new P(a, b, c), w); }, [x, y, z, yaw]);
const dbg = () => G(() => window.__sector.debug());
/** Use the live section's objective item as its onUse does (the download starts; the hack is done). */
const useObjective = (id) => G((k) => { const g = window.__app.current; const it = g.interactables.items.find((x) => x.id === k); if (!it || !it.enabled) return false; it.onUse(it, 'local'); return true; }, id);

try {
  await G(() => window.__pad.connect());
  await press(page, BTN.LS);
  await sim(0.6);
  await G(() => {
    const g = window.__app.current;
    g.target.damageMul = 0;
    g.enemyMgr.update = () => {};
    if (g.security) g.security.fixedUpdate = () => {};
    window.__mev = [];
    g.events.on('missionEvent', (e) => window.__mev.push(e));
  });
  const S = await G(() => window.__app.current.world.map.sectors.map((s) => ({ id: s.id, cp: s.connector ? s.connector.checkpoint : null })));
  // (a) the mission is picked by ?mission=, section 1 is its first
  const d0 = await dbg();
  assert(d0.mission && d0.mission.id === 'campusMissionTest' && d0.mission.section === 0 && d0.mission.done === 0 && d0.index === 0, `the test mission runs on section 1 (${JSON.stringify(d0.mission)})`);
  // (mission-rules R8, G343 / HG7) no always-on objective list: the HUD's objective line (`.hud-objective`, not its hint line
  // `.hud-objective-hint`, hud.ts) is the current mission step (missionFeed.ts `MissionFeed`): the badge step's text
  const step = await G(() => {
    const r = window.__mission.runner;
    const sec = r.def.sections[r.section];
    const i = r.def.steps.findIndex((q, k) => q.section === sec && !q.optional && r.isOpen(k));
    return i >= 0 ? r.def.steps[i].text : null;
  });
  assert(!!step && step.includes('courier badge'), `the current mission step is the badge step (${step})`);
  await until(page, (t) => document.querySelector('.hud-objective:not(.hud-objective-hint)')?.textContent === t, step, 8000, 'the objective line is the mission step');
  assert(true, `the objective line reads the mission step: "${step}"`);
  // hints are off by default (Settings > Gameplay > Hints): no hint line under it
  const hint = await G(() => document.querySelector('.hud-objective-hint')?.textContent ?? '');
  assert(hint === '', `no hint line with hints off (${JSON.stringify(hint)})`);
  // (HG8) the field menu (Field Terminal > Objectives, pauseScreen.ts `ObjectivesScreen`): the rules line first (counter
  // "Rule", class `obj-note`), then section 1's steps (the badge step current; later sections are not listed yet)
  await G(() => window.__app.current.pause());
  await until(page, () => !!document.querySelector('.pause-screen [data-key="objectives"]'), null, 8000, 'the pause menu opens');
  await G(() => { const b = document.querySelector('.pause-screen [data-key="objectives"]'); window.__app.nav.focus(b); b.click(); });
  await until(page, () => document.querySelectorAll('.objectives-screen .ms-item').length > 0, null, 8000, 'the Objectives screen opens');
  const rows = await G(() => [...document.querySelectorAll('.objectives-screen .ms-item')].map((b) => ({ cls: [...b.classList].find((c) => c.startsWith('obj-')) ?? '', label: b.querySelector('.btn-label')?.textContent ?? '', ctr: b.querySelector('.ms-ctr')?.textContent ?? '' })));
  assert(rows.length === 2 && rows[0].cls === 'obj-note' && rows[0].ctr === 'Rule' && rows[1].cls === 'obj-current' && rows[1].ctr === 'Current' && rows[1].label === step, `Objectives: the rule first, then the badge step current (${JSON.stringify(rows)})`);
  await G(() => document.querySelector('.objectives-screen [data-legend="back"]').click());
  await until(page, () => !!document.querySelector('.pause-screen [data-key="resume"]') && !document.querySelector('.objectives-screen'), null, 8000, 'back to the pause menu');
  await G(() => document.querySelector('.pause-screen [data-key="resume"]').click());
  await until(page, () => !window.__app.current.paused && !document.querySelector('.pause-screen'), null, 8000, 'the pause menu closes');

  // (b) section 1: the download from the open rear window is the intel step; its Guard AI event goes out
  await tp(20.6, 0, -76, -Math.PI / 2);
  await sim(0.4);
  assert(await useObjective('s1-obj'), 'the gatehouse PC download starts');
  await sim(10.8);
  const d1 = await dbg();
  assert(d1.phase === 'connector' && (d1.mission.done & 1) === 1 && (d1.mission.facts & 1) === 1, `the download is the badge step: done, its fact held, C1 open (${JSON.stringify([d1.phase, d1.mission])})`);
  const ev = await G(() => window.__mev.slice());
  assert(ev.length === 1 && ev[0].name === 'badgeCopied' && ev[0].guardTag === 'c1' && ev[0].postId === 'c1-door', `the badge step raises its Guard AI walk event (${JSON.stringify(ev)})`);

  // (c) a kill breaks No kills: the radio line, then after the 2 s hold the section restarts and the step goes back
  await G(() => {
    const g = window.__app.current;
    const e = g.enemyMgr.enemies.find((q) => q.alive);
    e.applyDamage({ amount: 9999, point: e.pos.clone(), dir: e.pos.clone().normalize(), part: 'head', kind: 'bullet', attackerTeam: 'player', attackerId: 'local', sourcePos: g.player.position.clone(), impulse: 1 });
  });
  await sim(0.5);
  const br = await dbg();
  assert(br.mission.breaks === 1 && br.mission.pending === true && br.mission.line === 'No kills broken. Back to the section checkpoint.' && br.restarts === 0, `a kill breaks No kills: the line, the restart pending (${JSON.stringify([br.mission, br.restarts])})`);
  await sim(2.4);
  const rs = await dbg();
  assert(rs.restarts === 1 && rs.mission.ruleRestarts === 1 && rs.index === 0 && rs.phase === 'objective' && rs.mission.done === 0 && rs.mission.facts === 0 && rs.nearLocked === true, `the section restarts: C1 locked again, the badge step and its fact back (${JSON.stringify([rs.restarts, rs.phase, rs.nearLocked, rs.mission])})`);

  // (d) the download again (after the hold), then C1 into section 2
  await sim(2.2);
  await tp(20.6, 0, -76, -Math.PI / 2);
  await sim(0.4);
  assert(await useObjective('s1-obj'), 'the download starts again after the restart');
  await sim(10.8);
  const d2 = await dbg();
  assert(d2.phase === 'connector' && (d2.mission.done & 1) === 1 && d2.mission.breaks === 1, `the badge step is done again, no new break (${JSON.stringify([d2.phase, d2.mission])})`);
  await G(() => { window.__app.loop.manual = true; });
  await tp(S[0].cp.x, S[0].cp.y, S[0].cp.z, S[0].cp.yaw);
  await sim(1.3);
  await sim(3.7);
  await G(() => { window.__app.loop.manual = false; });
  const d3 = await dbg();
  assert(d3.index === 1 && d3.phase === 'objective' && d3.mission.section === 1, `C1 cycles into section 2, the mission's second section (${JSON.stringify([d3.index, d3.phase, d3.mission])})`);

  // (e) section 2: the BMS hack is the exploit (the badge fact opened it); the section's steps done, C2 opens
  assert(await useObjective('s2-obj'), 'the BMS terminal is hacked');
  await sim(0.4);
  const d4 = await dbg();
  assert(d4.phase === 'connector' && (d4.mission.done & 3) === 3 && d4.mission.finished === false, `the hack is the exploit step: done, C2 open (${JSON.stringify([d4.phase, d4.mission])})`);
  const ev2 = await G(() => window.__mev.map((e) => e.postId));
  assert(JSON.stringify(ev2) === '["c1-door","c1-door","c2-door"]', `the badge event again after the restart, then the hack's (${JSON.stringify(ev2)})`);

  // (f) the extraction: everyone in C2 (it cycles): the mission is done and the op ends cleared
  await G(() => { window.__app.loop.manual = true; });
  await tp(S[1].cp.x, S[1].cp.y, S[1].cp.z, S[1].cp.yaw);
  let fin = null;
  for (let i = 0; i < 20 && !fin?.mission?.finished; i++) {
    await sim(0.5);
    fin = await dbg();
  }
  await G(() => { window.__app.loop.manual = false; });
  assert(fin.mission.finished === true && fin.mission.over === true && (fin.mission.done & 7) === 7, `everyone in C2 is the extraction: the mission is done (${JSON.stringify([fin.conn, fin.mission])})`);
  await sim(4);
  await page.waitForSelector('.results-screen', { timeout: 15000 });
  const res = await G(() => document.querySelector('.results-title')?.textContent ?? '');
  assert(res === 'VICTORY', `the op ends cleared (${res})`);
} catch (e) {
  failed = true;
  console.error(String(e));
  await page.screenshot({ path: process.env.SHOT ?? '/tmp/e2e-sectorops-mission-fail.png' });
} finally {
  all.push(...errors);
  await browser.close();
}

console.log(all.length ? 'console problems:\n' + all.join('\n') : 'no console errors');
process.exit(failed || all.length ? 1 : 0);
