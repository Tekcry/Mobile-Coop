// J14 re-plan walk for A7 the Data Hall (e2e-ctcourse part 8, map ctcourseReplan; slice G-A1A7, STATIONS.md sections 3, 6, 9).
// Two pages: A = the host (P1), B = the client (P2). Station 17 (`a7-split`, retry 'station'): the split, two technicians with
// two-way cover through the cage mesh, the synced hack; seen = back to the station's marks in the entry lobby.
//   1. the start in the lobby: station 17 live, both technicians alive and armed (a7-tech west of the cage on his rows 1-2
//      loop, a7-tech2 on the north apron), both cameras, the cage doors and L7 near locked on both pages, the lobby lit and
//      the same on both pages (the glazed screen lets the hall's light in);
//   2. the split: the client opens the plant door and steps into the corridor (B on both pages), the host stays A (the hall);
//   3. one seen retry: the client is put in the pod at T2's spot while a7-tech2 waits at his look stop over the cage's
//      north-east corner (route index 1): he sees the client through the mesh; LANTERN's retry line, `lastRetry` 17 / seen,
//      both players land on station 17's marks in the lobby (A the host at (74, 62), B the client at (72.5, 57)), the
//      claim and the split cleared, both technicians reset;
//   4. the split again: the client to the pod through the corridor in cam2's blind windows while a7-tech2 reads the pod panel
//      (route index 0, facing the pod's solid north wall); the host into the hall while a7-tech stands at R0 facing the rack
//      screen, then to T1 once he walks west behind row 1; both at their terminals light the ready lamps;
//   5. the synced hack (the client starts 0.5 s after the host, on the host's clock): `a7-sync`, no station live, the doors
//      open on both pages; the host through the cage into the pod; both to the L7 door (the runner then puts them on the pad).
// Unit cases (the screen, the round in the hall boxes, the sightlines (a) and (b)) are `tests/ctcourse/replan/a7DataHall.test.ts`.
export const SET = 'a7DataHall';

const SCAN = 'sc-a7';
const T1 = 'c-a7-t1';
const T2 = 'c-a7-t2';
const SPOT1 = [85.35, 61.5];
const SPOT2 = [96.65, 61.5];
const R0 = [84.4, 60.6];
/** a7-tech2's stops: the pod panel (index 0) and the look stop over the cage's north-east corner (index 1). */
const TECH2_PANEL = [98.5, 70.5];
const TECH2_LOOK = [94.0, 68.5];
/** Station 17's marks (A the hall leg, B the plant corridor leg). */
const MARK_A = [74.0, 62.0];
const MARK_B = [72.5, 57.0];
const LEE1 = [83.7, 55.2];
const LEE2 = [91.75, 55.2];
const CAM2 = 'a7-cam2';
const CAM2_CYCLE = 4 + 2 * (100 / 15);
const DOORS = { hall: 'A7-hall', plant: 'A7-plant', pod: 'A7-pod-s', cageW: 'A7-cage-w', cageE: 'A7-cage-e', east: 'L7-near' };

/** @param {object} t the runner's helpers (scripts/e2e-ctcourse.mjs) */
export async function walk(t) {
  const { A, B, GA, GB, until, assert, waitSim, use, moveHost, moveClient, doorIndex } = t;

  const sees = (P, re, what) => until(P, ([src]) => new RegExp(src).test(document.querySelector('.course-hud .ch-step')?.textContent ?? ''), [re.source], 15000, what);
  const lockedOnClient = async (cid) => GB((i) => window.__course.wire.locks.includes(i), await doorIndex(cid));
  const lockedOnHost = (cid) => GA((cid) => window.__course.state.locked(cid), cid);
  const level = (P, x, z) => P.evaluate(([x, z]) => window.__app.current.world.lightField?.bodyLevel(x, 0, z, 1.7) ?? -1, [x, z]);
  /** The two technicians on the host: a7-tech west of the cage (x < 90), a7-tech2 on the north apron's east half. */
  const techs = () =>
    GA(() => {
      const list = window.__app.current.enemyMgr.enemies.filter((e) => e.alive).map((e) => ({ x: e.pos.x, z: e.pos.z, idx: e.walker?.idx ?? -1, alerted: !!e.alerted, passive: !!e.passive, combat: e.aware?.level === 'combat' }));
      return { tech: list.find((e) => e.x < 90) ?? null, tech2: list.find((e) => e.x >= 90) ?? null, n: list.length };
    });
  const feetNear = (i, [x, z], r = 0.8) => GA(([i, x, z, r]) => { const f = window.__course.state.feet; return Math.hypot(f[i * 3] - x, f[i * 3 + 2] - z) < r; }, [i, x, z, r]);
  async function openDoor(P, cid, what) {
    const i = await doorIndex(cid);
    const aid = await GA((cid) => window.__app.current.world.layout.course.doors[cid], cid);
    if (!(await A.evaluate((i) => window.__app.current.world.doors.list[i].open > 0.5, i))) assert((await use(P, `door-${aid}`)) === 'ok', `${what}: opens ${cid}`);
    await until(A, (i) => window.__app.current.world.doors.list[i].open > 0.5, i, 10000, `${what}: ${cid} opens (host)`);
    await until(B, (i) => window.__app.current.world.doors.list[i].open > 0.5, i, 15000, `${what}: the client sees ${cid} open`);
  }
  const blindCorridor = (what) =>
    until(A, (id) => { const c = window.__ctdev.debug().cams.find((q) => q.id === id); const deg = ((c.yaw * 180) / Math.PI + 360) % 360; return !c.frozen && Math.abs(deg - 270) > 38; }, CAM2, 40000, `${what}: cam2 looks away from the corridor`);
  const pauseAt220 = (what) =>
    until(A, ([id, cyc]) => { const c = window.__ctdev.debug().cams.find((q) => q.id === id); const u = ((c.clock % cyc) + cyc) % cyc; return !c.frozen && u < 0.4; }, [CAM2, CAM2_CYCLE], 40000, `${what}: cam2 at the start of its 220 deg pause`);
  /** a7-tech2 waiting at route stop `idx` (not alerted). */
  const tech2At = (idx, [x, z], what, timeout = 60000) =>
    until(A, ([idx, x, z]) => { const e = window.__app.current.enemyMgr.enemies.find((q) => q.alive && q.pos.x >= 90); return !!e && !e.alerted && e.walker?.idx === idx && Math.hypot(e.pos.x - x, e.pos.z - z) < 0.5; }, [idx, x, z], timeout, what);
  /** The client through the corridor into the pod (lee to lee in cam2's blind windows, the pod door in the 220 window). */
  async function clientToPod(what) {
    await moveClient(72.8, 56.5, 0.1, Math.PI);
    await openDoor(B, DOORS.plant, what);
    await moveClient(72.8, 54.0, 0.1, Math.PI / 2);
    await until(A, () => window.__course.state.roleClaimed() && window.__course.state.roleOf(1) === 'b', null, 10000, `${what}: the client in the corridor takes B`);
    await moveClient(LEE1[0], LEE1[1], 0.1, Math.PI / 2);
    await blindCorridor(what);
    await moveClient(LEE2[0], LEE2[1], 0.1, Math.PI / 2);
    await pauseAt220(what);
    await moveClient(97.0, 55.1, 0.1, Math.PI / 2);
    await openDoor(B, DOORS.pod, what);
    // the pod's south-west corner: behind the pod's solid west wall, out of a7-tech2's look through the mesh
    await moveClient(96.6, 56.6, 0.1, 0);
    await until(A, () => window.__course.state.hasFlag('a7-pod'), null, 10000, `${what}: the pod pass zone sets a7-pod`);
  }

  // ---- 1. the start ----
  console.log('  A7 (re-plan): the lobby, station 17, two technicians');
  await moveHost(72.5, 61.4, 0.1, Math.PI / 2);
  await moveClient(72.5, 62.6, 0.1, Math.PI / 2);
  await GA(() => { window.__app.current.target.damageMul = 0; });
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await until(P, () => /Split up: one through the hall/.test(document.querySelector('.course-hud')?.textContent ?? ''), null, 15000, `A7: the ${tag} sees the split step`);
  assert((await GA(() => window.__course.station())) === 17, 'A7: station 17 is live');
  const g0 = await techs();
  assert(g0.n === 2 && !!g0.tech && !!g0.tech2 && !g0.tech.passive && !g0.tech2.passive, `A7: both technicians alive and armed (${JSON.stringify(g0)})`);
  assert(g0.tech2.z > 68 && g0.tech2.x > 93, `A7: a7-tech2 is on the north apron (${JSON.stringify(g0.tech2)})`);
  for (const cid of [DOORS.cageW, DOORS.cageE, DOORS.east]) assert((await lockedOnHost(cid)) && (await lockedOnClient(cid)), `A7: ${cid} starts locked on both pages`);
  const [la, lb] = [await level(A, 73.5, 62), await level(B, 73.5, 62)];
  assert(la >= 0.4 && Math.abs(la - lb) < 0.01, `A7: the lobby reads lit and the same on both pages (host ${la.toFixed(3)}, client ${lb.toFixed(3)})`);

  // ---- 2. the split: the client takes the corridor (B) ----
  console.log('  A7 (re-plan): the split');
  await moveHost(75.3, 60.5, 0.1, Math.PI / 2);
  await clientToPod('A7 split');

  // ---- 3. one seen retry: a7-tech2 at his look stop sees the client at T2's spot through the mesh ----
  console.log('  A7 (re-plan): a7-tech2 sees the pod leg: the station retry');
  const r0 = await GA(() => window.__course.restarts);
  await tech2At(1, TECH2_LOOK, 'A7 retry: a7-tech2 waits at his look stop');
  await moveClient(SPOT2[0], SPOT2[1], 0.1, -Math.PI / 2);
  await until(A, (n0) => window.__course.restarts > n0 && window.__course.lastRetry?.st === 17 && window.__course.lastRetry?.cause === 'seen', r0, 20000, 'A7 retry: a7-tech2 sees the client: station 17 retries (seen)');
  await until(A, ([ax, az, bx, bz]) => { const f = window.__course.state.feet; return Math.hypot(f[0] - ax, f[2] - az) < 0.8 && Math.hypot(f[3] - bx, f[5] - bz) < 0.8; }, [...MARK_A, ...MARK_B], 15000, 'A7 retry: both land on station 17\'s marks in the lobby');
  assert((await feetNear(0, MARK_A)) && (await feetNear(1, MARK_B)), 'A7 retry: the host (A) at (74, 62), the client (B) at (72.5, 57)');
  assert((await GA(() => window.__course.station())) === 17, 'A7 retry: station 17 is still live');
  assert(!(await GA(() => window.__course.state.hasFlag('a7-pod'))), 'A7 retry: the split is cleared');
  await until(A, () => window.__app.current.enemyMgr.enemies.filter((e) => e.alive && !e.alerted).length === 2, null, 15000, 'A7 retry: both technicians are back on their rounds, unalerted');
  for (const cid of [DOORS.cageW, DOORS.cageE, DOORS.east]) assert(await lockedOnClient(cid), `A7 retry: ${cid} still locked`);

  // ---- 4. the split again, each leg covered: the pod while a7-tech2 reads the panel, the hall while a7-tech is at R0 ----
  console.log('  A7 (re-plan): the split again, the terminals');
  await clientToPod('A7 split 2');
  await until(A, ([x, z]) => { const e = window.__app.current.enemyMgr.enemies.find((q) => q.alive && q.pos.x < 90); return !!e && !e.alerted && e.walker?.idx === 0 && Math.hypot(e.pos.x - x, e.pos.z - z) < 0.45; }, R0, 60000, 'A7: a7-tech stands at R0 (facing the rack screen)');
  await openDoor(A, DOORS.hall, 'A7 hall door');
  await until(A, () => { const e = window.__app.current.enemyMgr.enemies.find((x) => x.alive && x.pos.x < 90); return !!e && e.walker?.idx === 2 && e.pos.x < 83; }, null, 30000, 'A7: a7-tech walks west behind row 1');
  await tech2At(0, TECH2_PANEL, 'A7: a7-tech2 reads the pod panel (his back to the cage)');
  await moveHost(SPOT1[0], SPOT1[1], 0.1, Math.PI / 2);
  await moveClient(SPOT2[0], SPOT2[1], 0.1, -Math.PI / 2);
  await until(A, (id) => window.__ctdev.debug().scans.find((s) => s.id === id)?.ready, SCAN, 8000, 'A7: both at their terminals light the ready lamps');

  // ---- 5. the synced hack and the way on ----
  console.log('  A7 (re-plan): the synced hack, the cage, L7');
  const startKey = await t.onHostStep(A, (g, id) => { const s = window.__ctdev?.debug().scans.find((q) => q.id === id); return s && s.ph[1] === 'hacking' ? { at: s.t[0] } : null; }, SCAN);
  assert((await use(A, T1)) === 'ok', 'A7: the host starts the hack at terminal one');
  await until(A, (id) => { const s = window.__ctdev.debug().scans.find((q) => q.id === id); return !!s && s.ph[0] === 'hacking' && s.t[0] >= 0.5; }, SCAN, 10000, "A7: the host's hack is 0.5 s in");
  assert((await use(B, T2)) === 'ok', 'A7: the client starts on the count');
  const at = await t.hostStepResult(A, startKey, 8000, "A7: the host takes the client's hack start");
  assert(at.at >= 0.5 && at.at < 1.5, `A7: the client starts inside the window (${JSON.stringify(at)})`);
  await until(A, () => window.__course.state.hasFlag('a7-sync'), null, 15000, 'A7: both hacks inside the window set a7-sync');
  await until(A, () => window.__course.station() === 0, null, 8000, 'A7: no station live after the sync');
  for (const cid of [DOORS.cageW, DOORS.cageE, DOORS.east]) await until(B, (i) => !window.__course.wire.locks.includes(i), await doorIndex(cid), 15000, `A7: the client sees ${cid} unlocked`);
  for (const P of [A, B]) await sees(P, /holding room seven/, 'A7: the closing line');
  await moveHost(85.2, 63.3, 0.1, Math.PI / 2);
  await openDoor(A, DOORS.cageW, 'A7 cage');
  await moveHost(87.0, 64.5, 0.1, Math.PI / 2);
  await moveHost(95.2, 63.3, 0.1, Math.PI / 2);
  await openDoor(A, DOORS.cageE, 'A7 cage');
  await moveHost(97.2, 64.5, 0.1, Math.PI);
  await moveHost(99.0, 59.4, 0.1, Math.PI / 2);
  await moveClient(99.0, 60.6, 0.1, Math.PI / 2);
  assert(!(await lockedOnClient(DOORS.east)), "A7: the L7 near door (the pod's east door) is open to the client");
  await waitSim(200);
  for (const P of [A, B]) await until(P, () => !window.__app.current.traversal.attached, null, 10000, 'A7: nobody is hanging');
}
