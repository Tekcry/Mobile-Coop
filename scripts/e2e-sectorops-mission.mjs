// (mission-framework EN2) e2e-sectorops part `mission` (run-e2e: `e2e-sectorops:mission`): the campus test mission
// (`src/world/maps/campusMissionTest.ts`) on Saltmarsh Park sections 1-2, solo. The mission is picked by `?mission=`;
// no compass / minimap objective blip while it runs (A10). Section 1: the download is the intel step (its Guard AI
// event is raised), a kill breaks No kills (the radio line), the section restarts after the 2 s hold and the step
// goes back; the download again, C1. Section 2: the BMS hack is the exploit (it needs the badge fact), the exit opens,
// and everyone in C2 is the extraction: the op ends cleared. The guards are frozen and the player cannot be hurt (the
// test reads the mission, not the stealth). `?sectorGuards=4` keeps software GL quick.
import { launch, frames, press, BTN, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const PARAMS = 'autostart=campusOps&mode=sector&mission=campusMissionTest&sectorGuards=4';
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
  // (a) the mission is picked by ?mission=, section 1 is its first; no objective blip while it runs (A10)
  const d0 = await dbg();
  assert(d0.mission && d0.mission.id === 'campusMissionTest' && d0.mission.section === 0 && d0.mission.done === 0 && d0.index === 0, `the test mission runs on section 1 (${JSON.stringify(d0.mission)})`);
  const blips = await G(() => window.__sector.blips().length);
  assert(blips === 0, `no objective blip while a mission runs (${blips})`);
  // (EN4) the objective list is on the HUD: visible, with section 1's rows (the badge step open)
  await frames(page, 3);
  const mh = await G(() => {
    const el = document.querySelector('.mission-hud');
    const rows = el ? [...el.querySelectorAll('.mh-row')].map((r) => r.textContent ?? '') : [];
    return { shown: !!el && !el.hidden && el.getBoundingClientRect().width > 0, rows };
  });
  assert(mh.shown && mh.rows.length >= 1 && mh.rows.some((t) => t.includes('courier badge')), `the mission HUD shows its objective rows (${JSON.stringify(mh)})`);

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
