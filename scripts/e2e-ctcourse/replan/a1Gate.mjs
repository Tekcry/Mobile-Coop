// J14 re-plan walk for A1 the Gate (e2e-ctcourse part 5, map ctcourseReplan; slice G-A1A7, STATIONS.md sections 3 and 8). Two
// pages: A = the host (P1), B = the client (P2). Stations 1 (boost) and 2 (human ladder) cannot fail; the wicket is a way back
// only (a flag gate on `a1-top` joins the yard-side bolt).
//   1. both in the lounge: station 1 live, the boost line on both pages, the passive checker at his desk, the wicket locked;
//   2. the wicket before the ladder: the host (put in the yard) unbolts it from the yard side; the bolt opens, the door stays
//      locked on both pages (nobody has been on the wall top), and the host is put back on the apron;
//   3. the client on the striped mark claims A (the booster) and boosts the host onto the apron-face lip; the host pulls up
//      onto the wall top: `a1-top1`, station 2 live, the boost step ticked on both pages; the wicket still locked;
//   4. the human ladder: the host on the top lowers into a hang on the apron face, offers the relay, the client climbs him
//      and both pull up onto the top: `a1-top`, no station live, the ladder step ticked, the wicket unlocked on both pages;
//   5. both drop into the yard (no fall damage); the client opens the wicket and walks back to the apron and in again (the
//      way back); both to the L1 door (the runner then puts them on the pad).
// The leg-up, the relay and the moves between legs are the runner's helpers; the drops are real.
export const SET = 'a1Gate';

const WICKET_GATE = 'g-a1-wicket';
const WICKET_DOOR = 'A1-wicket';
const MARK = [10.8, 6];
/** The wall top's yard and apron edges (the lips are at 12.3 and 11.7). */
const EDGE_YARD = 12.1;
const EDGE_APRON = 11.9;

/** @param {object} t the runner's helpers (scripts/e2e-ctcourse.mjs) @param {number} n the set's number */
export async function walk(t, n) {
  const { A, B, GA, GB, until, assert, waitSim, use, moveHost, moveClient, doorIndex, legUp, pullUp, holdUntil, padReady, RB } = t;

  const sees = (P, re, what) => until(P, ([src]) => new RegExp(src).test(document.querySelector('.course-hud .ch-step')?.textContent ?? ''), [re.source], 15000, what);
  const ticked = (P, id) => until(P, (id) => !!document.querySelector(`.course-hud tr[data-step="${id}"] td.done`), id, 15000, `the ${P === A ? 'host' : 'client'} sees ${id} ticked`);
  const station = () => GA(() => window.__course.station());
  const hasFlag = (f) => GA((f) => window.__course.state.hasFlag(f), f);
  const lockedOnHost = () => GA((cid) => window.__course.state.locked(cid), WICKET_DOOR);
  const lockedOnClient = async () => GB((i) => window.__course.wire.locks.includes(i), await doorIndex(WICKET_DOOR));
  const hp = (P) => P.evaluate(() => window.__app.current.target.health.hp);
  const setDamage = (P, v) => P.evaluate((v) => { window.__app.current.target.damageMul = v; }, v);
  const hanging = (P) => P.evaluate(() => { const a = window.__app.current.traversal.attach.anchor; return a ? { kind: a.kind, nx: a.nx, top: a.top, id: a.id } : null; });

  /** On the wall top at the edge `x` facing `yaw`, hold drop: lowered into a hang on that face's lip. */
  async function lowerIntoHang(P, move, x, z, yaw, what) {
    await move(x, z, 4.5, yaw);
    await P.evaluate((yaw) => { const c = window.__app.current.player.cam; c.yaw = yaw; c.pitch = 0; }, yaw);
    await padReady(P);
    await until(P, () => window.__app.current.player.controller.grounded, null, 10000, `${what}: stands on the wall top`);
    await holdUntil(P, 1, () => window.__app.current.traversal.attached, `${what}: holding drop lowers into a hang`, null, 20000);
    await until(P, () => window.__app.current.traversal.attach.phase === 'on', null, 10000, `${what}: the hang has settled`);
  }
  /** Hang off the yard face and let go: feet on the yard floor, no health lost. */
  async function dropIntoYard(P, move, z, what) {
    await lowerIntoHang(P, move, EDGE_YARD, z, Math.PI / 2, what);
    const a = await hanging(P);
    assert(!!a && a.kind === 'ledge' && a.nx > 0.9, `${what}: hangs on the yard-face lip (${JSON.stringify(a)})`);
    await waitSim(300);
    await holdUntil(P, 1, () => !window.__app.current.traversal.attached, `${what}: lets go`, null, 10000);
    await until(P, () => { const c = window.__app.current.player.controller; return !window.__app.current.traversal.attached && c.grounded && c.pos.y < 0.3; }, null, 6000, `${what}: lands in the yard`);
  }

  // ---- 1. the start ----
  console.log('  A1 (re-plan): the lounge, station 1, the checker');
  await moveHost(2, 10, 0.1, Math.PI / 2);
  await moveClient(2, 12, 0.1, Math.PI / 2);
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await until(P, () => /Boost at the striped mark/.test(document.querySelector('.course-hud')?.textContent ?? ''), null, 15000, `A1: the ${tag} sees the boost step`);
  assert((await station()) === 1, 'A1: station 1 is live');
  const checker = await GA(() => { const e = window.__app.current.enemyMgr.enemies.find((x) => x.alive); return e ? { passive: !!e.passive, x: e.pos.x, z: e.pos.z } : null; });
  assert(!!checker && checker.passive && Math.hypot(checker.x - 9.0, checker.z - 16.5) < 0.6, `A1: the checker is passive at his desk (${JSON.stringify(checker)})`);
  assert((await lockedOnHost()) && (await lockedOnClient()), 'A1: the wicket starts locked on both pages');

  // ---- 2. the wicket before anyone has been on the top: unbolted, still locked ----
  console.log('  A1 (re-plan): the wicket is a way back only');
  await moveHost(13.2, 11, 0.1, -Math.PI / 2);
  assert((await use(A, `c-${WICKET_GATE}`)) === 'ok', 'A1: the host unbolts the wicket from the yard side');
  await until(A, (id) => !!window.__course.debug().gates[id], WICKET_GATE, 8000, 'A1: the bolt gate opens');
  await waitSim(1500);
  assert(await lockedOnHost(), 'A1: the unbolted wicket stays locked on the host (a1-top not set)');
  assert(await lockedOnClient(), 'A1: and on the client');
  await moveHost(9.5, 6, 0.1, Math.PI / 2);

  // ---- 3. station 1: the boost ----
  console.log('  A1 (re-plan): station 1, the boost');
  await moveClient(MARK[0], MARK[1]);
  await sees(B, /Crouch on the striped mark/, 'A1: the client on the mark reads the booster line');
  await legUp(MARK[0], MARK[1], 'A1 boost');
  await pullUp(A, 'A1 boost host');
  await until(A, () => window.__course.state.hasFlag('a1-top1'), null, 10000, 'A1: one player on the wall top sets a1-top1');
  assert(!(await hasFlag('a1-top')), 'A1: a1-top waits for both');
  await until(A, () => window.__course.station() === 2, null, 8000, 'A1: station 2 is live');
  for (const P of [A, B]) await ticked(P, 'a1-boost');
  assert(await lockedOnClient(), 'A1: the wicket is still locked on the client');

  // ---- 4. station 2: the human ladder ----
  console.log('  A1 (re-plan): station 2, the human ladder');
  await lowerIntoHang(A, moveHost, EDGE_APRON, 6, -Math.PI / 2, 'A1 ladder host');
  const lip = await hanging(A);
  assert(!!lip && lip.nx < -0.9 && Math.abs(lip.top - 4.4) < 0.1, `A1: the host hangs on the apron-face lip over the mark (${JSON.stringify(lip)})`);
  await moveClient(MARK[0] - 0.4, MARK[1]);
  await padReady(B);
  await waitSim(400);
  await holdUntil(A, RB, () => window.__app.current.team.state === 'relayOffer', 'A1 ladder: the hanging host offers the ladder');
  await until(B, () => !!window.__app.current.team.offer?.relay, null, 8000, 'A1 ladder: the client is offered the ladder');
  await holdUntil(B, RB, () => window.__app.current.team.count.ladders >= 1, 'A1 ladder: the client climbs the host');
  await until(B, (id) => window.__app.current.traversal.attach.phase === 'on' && window.__app.current.traversal.attach.anchor?.id === id, lip.id, 40000, 'A1 ladder: the client hangs on the same lip');
  await pullUp(B, 'A1 ladder client');
  await pullUp(A, 'A1 ladder host');
  await until(A, () => window.__course.state.hasFlag('a1-top'), null, 10000, 'A1: both on the wall top set a1-top');
  await until(A, () => window.__course.station() === 0, null, 8000, 'A1: no station live after the ladder');
  for (const P of [A, B]) await ticked(P, 'a1-ladder');
  await until(A, (cid) => !window.__course.state.locked(cid), WICKET_DOOR, 8000, 'A1: the wicket unlocks on the host');
  await until(B, (i) => !window.__course.wire.locks.includes(i), await doorIndex(WICKET_DOOR), 15000, 'A1: the client sees the wicket unlocked');

  // ---- 5. both into the yard, the wicket as the way back, on to L1 ----
  console.log('  A1 (re-plan): the drop, the way back, to L1');
  await setDamage(A, 1);
  const h0 = [await hp(A), await hp(B)];
  await dropIntoYard(A, moveHost, 7, 'A1 host');
  await dropIntoYard(B, moveClient, 9, 'A1 client');
  assert((await hp(A)) === h0[0] && (await hp(B)) === h0[1], 'A1: both drops cost no health');
  await setDamage(A, 0);
  for (const P of [A, B]) await sees(P, /holding room one/, 'A1: the closing line');
  await moveClient(13.2, 11, 0.1, -Math.PI / 2);
  const aid = await GA((cid) => window.__app.current.world.layout.course.doors[cid], WICKET_DOOR);
  assert((await use(B, `door-${aid}`)) === 'ok', 'A1: the client opens the wicket');
  const wi = await doorIndex(WICKET_DOOR);
  await until(A, (i) => window.__app.current.world.doors.list[i].open > 0.5, wi, 8000, 'A1: the wicket opens (host)');
  await until(B, (i) => window.__app.current.world.doors.list[i].open > 0.5, wi, 15000, 'A1: the client sees the wicket open');
  await moveClient(10.8, 11, 0.1, -Math.PI / 2);
  await moveClient(13.2, 11.4, 0.1, Math.PI / 2);
  await moveHost(20.6, 10.4, 0.1, Math.PI / 2);
  await moveClient(20.6, 11.6, 0.1, Math.PI / 2);
  assert(!(await GB((i) => window.__course.wire.locks.includes(i), await doorIndex('L1-near'))), 'A1: the L1 near door is open to the client');
  for (const P of [A, B]) await until(P, () => !window.__app.current.traversal.attached, null, 10000, 'A1: nobody is hanging');
}
