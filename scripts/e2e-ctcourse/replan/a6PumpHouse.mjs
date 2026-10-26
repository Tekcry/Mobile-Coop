// J14 re-plan walk for A6 the Pump House (e2e-ctcourse part 7, map ctcourseReplan; slice G-A6, STATIONS.md sections 3, 6, 8, 9).
// Two pages: A = the host (P1), B = the client (P2). A6 is an even set: before any claim the client (the lead) reads the A lines; the
// first player onto the motor gallery takes B (the hanger). Stations 14 (`a6-rope`), 15 (`a6-hangdown`), 16 (`a6-dropcatch`), all
// retry 'station' on the attendant's sight; one guard (the attendant, re-routed north of the outfall housing).
//   1. the start in the sump bay: station 14 live, the attendant alive and armed, the cage door and the outfall door (L6 near)
//      locked on the client, the stand-in ladder `a6-pit-ladder` locked on both pages, the loading edge's lip `a6-gallery-lip` open
//      on both pages, the sump bay lit by circuit 69 (Q2) and the same on both pages;
//   2. station 14: while the attendant is east of x 55 the host boosts the client onto the open span (the client claims B); the
//      self-closing edge gate `g-a6-edge` shuts (`a6-gal1`: the lip locked on both pages); the client drops the rescue line and
//      the host climbs it: `a6-gal`, station 15 live;
//   3. station 15, one seen retry: the host holds at the striped spot on the bridge, the client stands on the pump floor in front
//      of the attendant at his desk: he sees it, LANTERN's retry line, `lastRetry` 15 / seen, both players land on station 15's
//      marks at the bridge's north end (A the host at (50.5, 68.5), B the client at (52.5, 68.5)), station 14 still done
//      (`a6-gal` set, station 15 live), the attendant reset;
//   4. station 15 again: the client lowered through the gland plate to the drive panel and, with the attendant at his desk, holds
//      the isolate key 3 s: `a6-drive`, the outfall door unlocks on the client, station 16 live, the client pulled back up;
//   5. station 16, the stand-in (dropCatch is not playable): the ladder unlocks on both pages as the station goes live; both
//      players into the drive pit (the catcher's mark and the opening's foot; the ladder is the way down): `a6-pit`, no station
//      live, the closing line names the outfall culvert;
//   6. out through the outfall: from the pit up the culvert's ramp under its housing to the L6 door, unlocked on the client (the
//      runner then puts them on the pad).
// Unit cases (the pit, the housing, the closed stair on the nav, the drop opening and the 6 m fall, the devices' reach, circuit
// 69, the noise case) are `tests/ctcourse/replan/a6PumpHouse.test.ts`.
export const SET = 'a6PumpHouse';

const PANEL = 'c-sw-a6-panel';
const CAGE_DOOR = 'A6-cage';
const OUTFALL = 'L6-near';
const DRIVE = 'a6-drive';
const GAL = 'a6-gal';
const PIT = 'a6-pit';
const LADDER = 'a6-pit-ladder';
/** The loading edge's lip and the flag that locks it (the self-closing edge gate `g-a6-edge`: one player on the gallery). */
const LIP = 'a6-gallery-lip';
const GAL1 = 'a6-gal1';
const DECK_Y = 4.4;
const PIT_Y = -1.6;
/** The leg-up mark, the rope spot on the gallery and its foot on the floor. */
const MARK = [43.05, 69.1];
const ROPE = [43.15, 70.2];
const RUNNER = [43.15, 69.0];
/** The holder's striped spot on the bridge (facing south over the plate), the drive panel, the attendant's desk post. */
const HOLDER = [51.5, 65.6];
const POST = [61.5, 67.1];
/** Station 15's marks (A the holder, B the hanger) and station 16's (A on the bridge by the opening, B on the pit floor). */
const MARK15_A = [50.5, 68.5];
const MARK15_B = [52.5, 68.5];
const MARK16_B = [51.5, 63.5];
/** The drop opening's foot on the pit floor, the culvert's ramp and the L6 door's face inside the housing. */
const OPENING_FOOT = [52.5, 65.0];
const CULVERT = [57.5, 63.1];
const L6_FACE = [[62.8, 61.6], [62.8, 62.6]];
/** In front of the attendant's desk on the pump floor, lit by the floor high-bays (the seen retry). */
const SEEN_AT = [61.5, 64.9];

/** @param {object} t the runner's helpers (scripts/e2e-ctcourse.mjs) */
export async function walk(t) {
  const { A, B, GA, GB, until, assert, waitSim, moveHost, moveClient, doorIndex, holdUntil, padReady, crouch, pullUp, RB } = t;

  const sees = (P, re, what) => until(P, ([src]) => new RegExp(src).test(document.querySelector('.course-hud .ch-step')?.textContent ?? ''), [re.source], 15000, what);
  const lockedOnClient = async (cid) => GB((i) => window.__course.wire.locks.includes(i), await doorIndex(cid));
  const hasFlag = (f) => GA((f) => window.__course.state.hasFlag(f), f);
  const station = () => GA(() => window.__course.station());
  const level = (P, x, y, z) => P.evaluate(([x, y, z]) => window.__app.current.world.lightField?.bodyLevel(x, y, z, 1.7) ?? -1, [x, y, z]);
  const ladderId = await GA((name) => window.__app.current.world.layout.course.anchors?.[name] ?? -1, LADDER);
  /** Is the stand-in ladder locked: on the host (the course state), on the client (the course wire's disabled anchors)? */
  const ladderLocked = async () => [await GA((name) => window.__course.state.anchorLocked(name), LADDER), await GB((id) => window.__course.wire.anchors.includes(id), ladderId)];
  const lipId = await GA((name) => window.__app.current.world.layout.course.anchors?.[name] ?? -1, LIP);
  /** Is the loading edge's lip locked: on the host, on the client? */
  const lipLocked = async () => [await GA((name) => window.__course.state.anchorLocked(name), LIP), await GB((id) => window.__course.wire.anchors.includes(id), lipId)];
  /** The attendant on the host (the one live guard in the set box): place, alert state, awareness meter, his route stop. */
  const attendant = () =>
    GA(() => {
      const e = window.__app.current.enemyMgr.enemies.find((q) => q.alive && q.pos.x > 40 && q.pos.x < 64 && q.pos.z > 54 && q.pos.z < 72);
      return e ? { x: e.pos.x, z: e.pos.z, alerted: !!e.alerted, passive: !!e.passive, meter: e.meter, idx: e.walker?.idx ?? -1 } : null;
    });
  const waitAttendant = (c, timeout, what) =>
    until(A, (c) => {
      const e = window.__app.current.enemyMgr.enemies.find((q) => q.alive && q.pos.x > 40 && q.pos.x < 64 && q.pos.z > 54 && q.pos.z < 72);
      if (!e || e.alerted) return false;
      if (c.minX !== undefined && !(e.pos.x > c.minX)) return false;
      if (c.near && !(Math.hypot(e.pos.x - c.near[0], e.pos.z - c.near[1]) < c.near[2])) return false;
      return c.meterMax === undefined || e.meter < c.meterMax;
    }, c, timeout, what);
  const feetNear = (i, [x, z], r = 0.8) => GA(([i, x, z, r]) => { const f = window.__course.state.feet; return Math.hypot(f[i * 3] - x, f[i * 3 + 2] - z) < r; }, [i, x, z, r]);
  /** Hold the interact button (pad A) on P until `cond` holds on the host, then let go. */
  async function holdA(P, cond, arg, what, timeout = 12000) {
    await P.evaluate(() => window.__pad.set(0, 1));
    try {
      await until(A, cond, arg, timeout, what);
    } finally {
      await P.evaluate(() => window.__pad.set(0, 0));
    }
  }
  /** The host crouches on the mark and offers; the client takes the leg-up, hangs on the open edge and pulls up. */
  async function hostBoostsClient(what) {
    await moveHost(MARK[0], MARK[1], 0.1, 0);
    await moveClient(MARK[0], MARK[1] - 0.8, 0.1, 0);
    await waitSim(500);
    await padReady(A);
    await padReady(B);
    await crouch(A);
    await holdUntil(A, RB, () => window.__app.current.team.state === 'offer', `${what}: the host offers a leg-up`);
    await until(B, () => !!window.__app.current.team.offer?.boost, null, 8000, `${what}: the client is offered the leg-up`);
    const boosts0 = await GB(() => window.__app.current.team.count.boosts);
    await holdUntil(B, RB, (k) => window.__app.current.team.count.boosts > k, `${what}: the client takes the leg-up`, boosts0);
    await until(B, () => window.__app.current.traversal.attach.phase === 'on' && window.__app.current.traversal.attach.anchor?.kind === 'ledge', null, 12000, `${what}: the client hangs on the ledge`);
    await until(A, () => window.__app.current.team.state === 'none', null, 20000, `${what}: the booster is free again`);
    await pullUp(B, `${what} client`);
  }

  /** The client holds the rescue line at the rope spot; the host takes it at the foot and climbs to the gallery. */
  async function hostClimbsRope(what) {
    await moveClient(ROPE[0], ROPE[1], DECK_Y + 0.1, Math.PI);
    await moveHost(RUNNER[0], RUNNER[1], 0.1, 0);
    await waitSim(500);
    await padReady(A);
    await padReady(B);
    await holdUntil(B, RB, () => window.__app.current.team.state === 'ropeOffer', `${what}: the client drops the rescue line`);
    await until(A, () => !!window.__app.current.team.offer?.rope, null, 8000, `${what}: the host is offered the rope`);
    const ropes0 = await GA(() => window.__app.current.team.count.ropes);
    await holdUntil(A, RB, (k) => window.__app.current.team.count.ropes > k, `${what}: the host takes the rope`, ropes0);
    await until(B, () => window.__app.current.team.state === 'ropeHold', null, 8000, `${what}: the client holds the rope`);
    // the stick lets go on the step the climber tops out (the built walk's test-speed hook)
    await A.evaluate(() => {
      const st = window.__app.current;
      const t0 = st.team.count.tops;
      const orig = st.fixedUpdate.bind(st);
      st.fixedUpdate = (dt) => {
        orig(dt);
        if (st.team.count.tops > t0) {
          window.__pad.axis(1, 0);
          st.fixedUpdate = orig;
        }
      };
      window.__pad.axis(1, -1);
    });
    try {
      await until(A, () => window.__app.current.team.count.tops >= 1, null, 40000, `${what}: the host climbs the rescue line and tops out`);
    } finally {
      await A.evaluate(() => window.__pad.axis(1, 0));
    }
    await until(B, () => window.__app.current.team.state === 'none', null, 8000, `${what}: the rope holder is free once the partner is up`);
  }

  /** The holder (host) crouches at the striped spot and offers the hang-down; the hanger (client) takes it and is lowered until
   *  the drive panel is its nearest item. */
  async function lowerToPanel(what) {
    await moveHost(HOLDER[0], HOLDER[1], DECK_Y + 0.1, Math.PI);
    await moveClient(HOLDER[0], HOLDER[1] + 1.0, DECK_Y + 0.1, Math.PI);
    await waitSim(500);
    await padReady(A);
    await padReady(B);
    await crouch(A);
    await holdUntil(A, RB, () => window.__app.current.team.state === 'hangOffer', `${what}: the holder offers the hang-down over the plate`);
    await until(B, () => !!window.__app.current.team.offer?.hang, null, 8000, `${what}: the hanger is offered the hang-down`);
    const hangs0 = await GB(() => window.__app.current.team.count.hangs);
    await holdUntil(B, RB, (k) => window.__app.current.team.count.hangs > k, `${what}: the hanger takes the hang-down`, hangs0);
    await until(B, () => window.__app.current.team.state === 'hanging', null, 15000, `${what}: the hanger hangs head-first in the plate`);
    await A.evaluate(() => window.__pad.axis(1, 1));
    try {
      await until(B, (id) => window.__app.current.interactables?.nearest(window.__app.current.player.position)?.id === id, PANEL, 20000, `${what}: the holder lowers the hanger to the drive panel`);
    } finally {
      await A.evaluate(() => window.__pad.axis(1, 0));
    }
  }

  // ---- 1. the start ----
  console.log('  A6 (re-plan): the sump bay, station 14, the attendant, circuit 69');
  await moveHost(53, 55.5, 0.1, 0);
  await moveClient(52, 55.5, 0.1, 0);
  await GA(() => { window.__app.current.target.damageMul = 0; });
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await until(P, () => /onto the motor gallery at the west end/.test(document.querySelector('.course-hud')?.textContent ?? ''), null, 15000, `A6: the ${tag} sees the gallery step`);
  assert((await station()) === 14, 'A6: station 14 is live');
  const g0 = await attendant();
  assert(!!g0 && !g0.passive && !g0.alerted, `A6: the attendant is alive, armed and calm (${JSON.stringify(g0)})`);
  assert((await GA(() => window.__app.current.enemyMgr.enemies.filter((e) => e.alive && e.pos.x > 40 && e.pos.x < 64 && e.pos.z > 54 && e.pos.z < 72).length)) === 1, 'A6: one guard in the set');
  for (const cid of [CAGE_DOOR, OUTFALL]) assert(await lockedOnClient(cid), `A6: ${cid} starts locked on the client`);
  assert(ladderId >= 0, `A6: the stand-in ladder is a named anchor (${ladderId})`);
  const [lh0, lc0] = await ladderLocked();
  assert(lh0 && lc0, `A6: the stand-in ladder starts locked on both pages (host ${lh0}, client ${lc0})`);
  assert(lipId >= 0, 'A6: the loading edge lip is named in the layout');
  const [eh0, ec0] = await lipLocked();
  assert(!eh0 && !ec0, `A6: the loading edge lip starts open on both pages (host ${eh0}, client ${ec0})`);
  const [sa, sb] = [await level(A, 51.0, 0, 56.6), await level(B, 51.0, 0, 56.6)];
  assert(sa >= 0.4 && Math.abs(sa - sb) < 0.02, `A6: the sump bay reads lit (circuit 69) and the same on both pages (host ${sa.toFixed(3)}, client ${sb.toFixed(3)})`);

  // ---- 2. station 14: the leg-up and the rescue line ----
  console.log('  A6 (re-plan): station 14, the leg-up and the rescue line');
  await waitAttendant({ minX: 55 }, 90000, 'A6: the attendant is east of x 55');
  await hostBoostsClient('A6 station 14');
  await until(A, () => window.__course.state.roleClaimed() && window.__course.state.roleOf(1) === 'b', null, 10000, 'A6: the client on the gallery takes B');
  assert(!(await hasFlag(GAL)), 'A6: one player up does not set a6-gal');
  await until(A, (f) => window.__course.state.hasFlag(f), GAL1, 10000, 'A6: one player on the gallery sets a6-gal1 (the edge gate shuts)');
  await until(A, (name) => window.__course.state.anchorLocked(name), LIP, 8000, 'A6: the loading edge lip locks on the host');
  await until(B, (id) => window.__course.wire.anchors.includes(id), lipId, 15000, 'A6: the client sees the loading edge lip locked');
  await hostClimbsRope('A6 station 14');
  await until(A, (f) => window.__course.state.hasFlag(f), GAL, 10000, 'A6: both on the gallery set a6-gal');
  await until(A, () => window.__course.station() === 15, null, 8000, 'A6: station 15 is live');

  // ---- 3. station 15: one seen retry (the client in front of the attendant at his desk) ----
  console.log('  A6 (re-plan): station 15, the attendant sees the client: the station retry');
  await moveHost(HOLDER[0], HOLDER[1], DECK_Y + 0.1, Math.PI);
  // he faces the client only while he stops at the desk (4 s, facing south, of a ~53 s round): catch him on the leg in (round
  // index 0, W to D, not yet arrived), so the whole stop faces her; a wait that caught him leaving put him 40 s away (triage 4)
  await until(A, ([px, pz]) => {
    const e = window.__app.current.enemyMgr.enemies.find((q) => q.alive && q.pos.x > 40 && q.pos.x < 64 && q.pos.z > 54 && q.pos.z < 72);
    if (!e || e.alerted || (e.walker?.idx ?? -1) !== 0) return false;
    const d = Math.hypot(e.pos.x - px, e.pos.z - pz);
    return d > 0.6 && d < 1.6;
  }, POST, 150000, 'A6 retry: the attendant walks in to his desk');
  const r0 = await GA(() => window.__course.restarts);
  await moveClient(SEEN_AT[0], SEEN_AT[1], 0.1, 0);
  await padReady(B);
  await until(A, (n0) => window.__course.restarts > n0 && window.__course.lastRetry?.st === 15 && window.__course.lastRetry?.cause === 'seen', r0, 60000, 'A6 retry: the attendant sees the client: station 15 retries (seen)');
  await until(A, ([ax, az, bx, bz]) => { const f = window.__course.state.feet; return Math.hypot(f[0] - ax, f[2] - az) < 0.8 && Math.hypot(f[3] - bx, f[5] - bz) < 0.8; }, [...MARK15_A, ...MARK15_B], 15000, "A6 retry: both land on station 15's marks at the bridge's north end");
  assert((await feetNear(0, MARK15_A)) && (await feetNear(1, MARK15_B)), 'A6 retry: the host (A) at (50.5, 68.5), the client (B) at (52.5, 68.5)');
  for (const P of [A, B]) assert((await P.evaluate(() => window.__app.current.player.controller.pos.y)) > 4.2, 'A6 retry: both on the bridge deck');
  for (const P of [A, B]) await sees(P, /Hold your partner over the drive cabinet|Hold the isolate key/, 'A6 retry: the retry line, then the hang step');
  assert((await station()) === 15, 'A6 retry: station 15 is still live');
  assert(await hasFlag(GAL), 'A6 retry: station 14 stays done (a6-gal set)');
  assert((await lipLocked())[0], "A6 retry: the loading edge lip stays locked (station 15's retry does not list the edge gate)");
  assert(!(await hasFlag(DRIVE)), 'A6 retry: a6-drive is not set');
  await until(A, () => window.__app.current.enemyMgr.enemies.some((e) => e.alive && !e.alerted && e.pos.x > 40 && e.pos.x < 64 && e.pos.z > 54 && e.pos.z < 72), null, 15000, 'A6 retry: the attendant is back on his round, unalerted');

  // ---- 4. station 15 again: the hang-down, the isolate key with the attendant at his desk ----
  console.log('  A6 (re-plan): station 15, the hang-down');
  await lowerToPanel('A6 station 15');
  await waitAttendant({ near: [POST[0], POST[1], 1.2], meterMax: 0.1 }, 150000, 'A6: the attendant is at his desk and calm');
  await holdA(B, (f) => window.__course.state.hasFlag(f), DRIVE, 'A6: the client holds the isolate key 3 s: a6-drive');
  await until(B, (i) => !window.__course.wire.locks.includes(i), await doorIndex(OUTFALL), 15000, 'A6: the client sees the outfall door unlocked');
  await until(A, () => window.__course.station() === 16, null, 8000, 'A6: station 16 is live');
  const pulls0 = await GB(() => window.__app.current.team.count.pulls);
  await holdUntil(B, RB, (k) => window.__app.current.team.count.pulls > k, 'A6: the client is pulled back up', pulls0);
  await until(B, () => window.__app.current.team.state === 'none' && window.__app.current.player.controller.pos.y > 4.2, null, 10000, 'A6: the client is back on the bridge');

  // ---- 5. station 16: the stand-in ladder opens (dropCatch not playable), both into the drive pit ----
  console.log('  A6 (re-plan): station 16, the stand-in ladder, the drive pit');
  await until(A, (name) => !window.__course.state.anchorLocked(name), LADDER, 8000, 'A6: the stand-in ladder unlocks on the host as station 16 goes live');
  await until(B, (id) => !window.__course.wire.anchors.includes(id), ladderId, 15000, 'A6: the client sees the stand-in ladder unlocked');
  // the ladder is the way down (its climb is the traversal suites'): both put on the pit floor, the catcher's mark and the opening's foot
  await moveClient(MARK16_B[0], MARK16_B[1], PIT_Y + 0.1, 0);
  assert(!(await hasFlag(PIT)), 'A6: one player in the pit does not set a6-pit');
  await moveHost(OPENING_FOOT[0], OPENING_FOOT[1], PIT_Y + 0.1, Math.PI);
  await until(A, (f) => window.__course.state.hasFlag(f), PIT, 10000, 'A6: both in the drive pit set a6-pit');
  await until(A, () => window.__course.station() === 0, null, 8000, 'A6: no station live after station 16');
  for (const P of [A, B]) await sees(P, /outfall culvert/, 'A6: the closing line names the outfall culvert');
  assert(await lockedOnClient(CAGE_DOOR), 'A6: the cage door stays locked (the pit leaves by the outfall)');

  // ---- 6. out through the outfall culvert to the L6 door ----
  console.log('  A6 (re-plan): out through the outfall culvert');
  await moveHost(CULVERT[0], CULVERT[1], -0.7, Math.PI / 2);
  await moveClient(CULVERT[0] - 1.0, CULVERT[1], -0.9, Math.PI / 2);
  for (const P of [A, B]) assert((await P.evaluate(() => window.__app.current.player.controller.pos.y)) < 0, 'A6: in the culvert, under the floor line');
  await moveHost(L6_FACE[0][0], L6_FACE[0][1], 0.1, Math.PI / 2);
  await moveClient(L6_FACE[1][0], L6_FACE[1][1], 0.1, Math.PI / 2);
  assert(!(await lockedOnClient(OUTFALL)), 'A6: the outfall door is open to the client');
  await waitSim(200);
  for (const P of [A, B]) await until(P, () => !window.__app.current.traversal.attached, null, 10000, 'A6: nobody is hanging');
}
