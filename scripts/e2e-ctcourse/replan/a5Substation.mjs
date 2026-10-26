// J14 re-plan walk for A5 the Substation (e2e-ctcourse parts 5-8, map ctcourseReplan; slice G-A5, STATIONS.md sections 3, 5, 6, 8, 9).
// Two pages: A = the host (P1), B = the client (P2). Stations 11 (chimney pair), 12 (swing pass) and 13 (the throw); two guards (the patrol
// and the static kiosk watcher). Pending its first PC run (written on a cloud builder, never run). The walk:
//   1. the start: station 11 live on both pages, the wicket stand-in opened by the base (unlocked on both pages), the footbridge, the plates
//      and the switchroom's back door locked, two live guards (the patrol and the watcher at (46.0, 31.0)), the L5 door locked;
//   2. station 11: both through the wicket onto the apron's east strip: `a5-apron-e`, the wall step ticked, station 12 live; then the
//      wall's fixed access ladder: the host climbs it down from the wall top (the ladder down);
//   3. station 12: the footbridge stand-in opened as 12 went live (the plates stay bolted); both over the footbridge to the west strip:
//      `a5-apron-w`, the trench step ticked, station 13 live on both pages;
//   4. station 13, the throw: both wait behind the inner wall's south run until the patrol's back is turned, the host throws the client
//      over the beams onto the landing (the client claims B), no beam touched;
//   5. one flood-timer retry: the host jams the flood (dark), lets go, the flood comes back before the release: station 13 retries (cause
//      `timer`), LANTERN's line reaches the client, both land on station 13's marks (A (59, 36), B in the lee (56, 36)), 11 and 12 stay done;
//   6. one beam-trip retry: the host steps into the beam line: station 13 retries (cause `seen`), the same marks, 11 and 12 still done;
//   7. the throw with the flood jammed and the release: when the patrol is off the kiosk the host jams the flood through the gateway, the
//      client crosses the dark strip to the kiosk and keys the release: `a5-release`, the beams off, the flood coming back is no retry, the
//      L5 door unlocked, both read the closing line; both to the L5 door.
// Teleport legs are allowed on open floor (the unit test holds the geometry: tests/ctcourse/replan/a5Substation.test.ts); every device
// press is from within reach.
import { teamLog, watchTeam } from '../../e2e-net-lib.mjs';

export const SET = 'a5Substation';

const LASER_ID = 'laser-a5';
const RELEASE = 'c-sw-a5-release';
const FLAG = 'a5-release';
const WICKET_DOOR = 'A5-wicket';
const FOOTBRIDGE_DOOR = 'A5-footbridge';
const PLATES_DOOR = 'A5-plates';
const BACK_DOOR = 'A5-back';
/** Station marks (STATIONS section 3): 11 in the gap, 12 on the east strip, 13 on the west strip (A) and in the lee (B). */
const ST11 = [[69.0, 32.0], [69.0, 34.0]];
const ST12 = [[67.0, 33.0], [67.0, 34.5]];
const ST13 = [[59.0, 36.0], [56.0, 36.0]];
/** The ladder's foot and the wall top (the ladder head), the footbridge's two ends, the west strip. */
const LADDER = [67.7, 31.0];
const WALLTOP = [68.1, 31.6];
const BRIDGE_E = [66.8, 37.0];
const BRIDGE_W = [61.0, 37.0];
const WEST_STRIP = [60.5, 37.0];
/** The helper's marks: the thrower, the runner's start, the landing, the kiosk's press spot (`a5Substation.ts`). */
const THROW = [59.2, 36];
const RUNNER = [60.2, 36];
const LANDING = [56, 36];
const PRESS = [47.6, 33.0];
/** The floodlit strip's centre, the flood lamp, the jam spot, the hide spot behind the inner wall's south run. */
const STRIP = [50.5, 33.5];
const FLOOD = [44.5, 4.2, 35.6];
const FLOOD_JAM = [60, 36];
const HIDE = [59.0, 25.4];
/** The patrol's stops K (the kiosk) and R4 (the gateway's north tower), the watcher's post, the beam line. */
const K = [47.9, 33.4];
const R4 = [56.5, 37.6];
const WATCHER = [46.0, 31.0];
const BEAM_X = 58;
const WEST = -Math.PI / 2;

/** @param {object} t the runner's helpers (scripts/e2e-ctcourse.mjs) @param {number} n the set's number */
export async function walk(t, n) {
  const { A, B, GA, GB, until, assert, waitSim, use, moveHost, moveClient, doorIndex, padReady, holdUntil, RB, dev, drawPistol, holster, aimAt, lt, stepLine } = t;
  void n;

  // ---- helpers local to the set ----
  const sees = (P, re, what) => until(P, ([src]) => new RegExp(src).test(document.querySelector('.course-hud .ch-step')?.textContent ?? ''), [re.source], 15000, what);
  const tickedOn = (P, id, what) => until(P, (id) => !!document.querySelector(`.course-hud tr[data-step="${id}"] td.done`), id, 15000, what);
  const lockedOnClient = async (cid) => GB((i) => window.__course.wire.locks.includes(i), await doorIndex(cid));
  const lockedOnHost = (cid) => GA((cid) => window.__course.state.locked(cid), cid);
  const hasFlag = (f) => GA((f) => window.__course.state.hasFlag(f), f);
  const roleOf = (p) => GA((p) => window.__course.state.roleOf(p), p);
  const retries = () => GA(() => window.__course.state.restarts);
  /** Station `k` is live on page P (the host's state, the client's course wire). */
  const stationLive = (P, k, what) => (P === A ? until(A, (k) => window.__course.state.station() === k, k, 15000, what) : until(B, (k) => window.__course.wire?.s?.st === k, k, 15000, what));
  const level = (P, x, z) => P.evaluate(([x, z]) => window.__app.current.world.lightField?.bodyLevel(x, 0, z, 1.7) ?? -1, [x, z]);
  const laserOn = (P) => P.evaluate((id) => window.__ctdev.debug().lasers.find((l) => l.id === id)?.on, LASER_ID);
  const guards = () => GA(() => window.__app.current.enemyMgr.enemies.filter((q) => q.alive && q.pos.x > 40 && q.pos.x < 70 && q.pos.z > 24 && q.pos.z < 48).map((e) => ({ x: e.pos.x, z: e.pos.z, idx: e.walker?.route ? e.walker.idx : -1, alerted: !!e.alerted, passive: !!e.passive })));
  /** The patrol (the guard whose walker has a route: every guard has a walker, the watcher's route is null) has left the kiosk for pen 1 (route index 1) and is `d` m off it. */
  const leftKiosk = (what, d = 1.5) => until(A, ([kx, kz, d]) => { const e = window.__app.current.enemyMgr.enemies.find((q) => q.alive && q.walker?.route && q.pos.x > 40 && q.pos.x < 70 && q.pos.z > 24 && q.pos.z < 48); return !!e && !e.alerted && e.walker.idx === 1 && Math.hypot(e.pos.x - kx, e.pos.z - kz) > d; }, [K[0], K[1], d], 90000, what);
  /** His back to the gateway: walking R4 -> K (index 0, off both stops) or K -> R2 / at R2 (index 1). */
  const backTurned = (what) =>
    until(A, ([kx, kz, rx, rz]) => {
      const e = window.__app.current.enemyMgr.enemies.find((q) => q.alive && q.walker?.route && q.pos.x > 40 && q.pos.x < 70 && q.pos.z > 24 && q.pos.z < 48);
      if (!e || e.alerted) return false;
      const i = e.walker.idx;
      return i === 1 || (i === 0 && Math.hypot(e.pos.x - kx, e.pos.z - kz) > 3 && Math.hypot(e.pos.x - rx, e.pos.z - rz) > 1);
    }, [K[0], K[1], R4[0], R4[1]], 90000, what);
  const noDamage = async () => {
    await GA(() => { window.__app.current.target.damageMul = 0; });
    await GB(() => { window.__app.current.target.damageMul = 0; });
    await GA(() => { for (const r of window.__app.current.net.remotes.values()) { r.damageMul = 0; r.protectT = 0; } });
  };
  async function beamsAre(on, what) {
    await until(A, ([id, on]) => window.__ctdev.debug().lasers.find((l) => l.id === id)?.on === on, [LASER_ID, on], 10000, `${what} (host)`);
    await until(B, ([id, on]) => window.__ctdev.debug().lasers.find((l) => l.id === id)?.on === on, [LASER_ID, on], 15000, `${what} (client)`);
  }
  /** Open a shut course door by hand (`use` on the door): the stand-in doors are unlocked by the base, not open. */
  async function openDoor(P, cid, what) {
    const aid = await GA((cid) => window.__app.current.world.layout.course.doors[cid], cid);
    assert((await use(P, `door-${aid}`)) === 'ok', `${what}: opens ${cid}`);
    await until(B, (i) => window.__app.current.world.doors.list[i].open > 0.5, await doorIndex(cid), 15000, `${what}: the client sees ${cid} open`);
  }
  /** Both players stand on station 13's marks (the roles decide who is on which) on the host's state and the client's page. */
  async function onStation13Marks(what) {
    const roleA = (await roleOf(0)) === 'a' ? 0 : 1;
    const want = roleA === 0 ? [ST13[0], ST13[1]] : [ST13[1], ST13[0]];
    await until(A, (w) => { const f = window.__course.state.feet; return Math.hypot(f[0] - w[0][0], f[2] - w[0][1]) < 0.6 && Math.hypot(f[3] - w[1][0], f[5] - w[1][1]) < 0.6; }, want, 20000, `${what}: the host sees both players on station 13's marks`);
    await until(B, (w) => { const p = window.__app.current.player.position; return Math.hypot(p.x - w[0], p.z - w[1]) < 0.6; }, want[1], 15000, `${what}: the client page stands on its mark`);
    await waitSim(3500);
  }
  /** A retry of station 13 with `cause` landed: counted, 13 live again, 11 and 12 still done, the beams on, the guards reset. */
  async function retried(cause, r0, line, what) {
    await until(A, (r) => window.__course.state.restarts > r && window.__course.state.lastRetry?.st === 13, r0, 60000, `${what}: station 13 retries`);
    assert((await GA(() => window.__course.state.lastRetry.cause)) === cause, `${what}: the retry's cause is ${cause}`);
    await until(B, ([src]) => new RegExp(src).test(window.__course.wire.rl ?? ''), [line.source], 30000, `${what}: LANTERN's retry line reaches the client`);
    await onStation13Marks(what);
    assert((await retries()) === r0 + 1, `${what}: one retry counted (${await retries()} of ${r0})`);
    assert((await hasFlag('a5-apron-e')) && (await hasFlag('a5-apron-w')), `${what}: stations 11 and 12 stay done`);
    assert((await GA(() => window.__course.state.station())) === 13 && (await GB(() => window.__course.wire?.s?.st)) === 13, `${what}: station 13 is live again on both pages`);
    assert(!(await hasFlag(FLAG)), `${what}: no release yet`);
    await beamsAre(true, `${what}: the beams are on`);
    assert(!(await lockedOnHost(WICKET_DOOR)) && !(await lockedOnHost(FOOTBRIDGE_DOOR)), `${what}: the stand-in doors stay unlocked`);
  }

  /** The host on the mark offers the partner throw, the client runs in and is thrown over the beams onto the landing. */
  async function throwClient(what) {
    await moveHost(THROW[0], THROW[1], 0.1, WEST);
    await moveClient(RUNNER[0], RUNNER[1], 0.1, WEST);
    await waitSim(500);
    await padReady(A);
    await padReady(B);
    const d0 = await dev(A);
    await watchTeam(A);
    await watchTeam(B);
    const dump = async (e) => {
      console.error('    host:', await teamLog(A));
      console.error('    client:', await teamLog(B));
      throw e;
    };
    await holdUntil(A, RB, () => window.__app.current.team.state === 'throwOffer', `${what}: the standing host offers the throw`).catch(dump);
    await until(B, () => !!window.__app.current.team.offer?.toss, null, 8000, `${what}: the client is offered the throw`).catch(dump);
    const host = await GA(() => { const c = window.__app.current.player.controller; return [c.pos.x, c.pos.z, c.yaw]; });
    await until(B, ([hx, hz, hy]) => {
      const g = window.__app.current;
      const c = g.player.controller;
      const m = g.team.offer?.toss ? g.team.offer.mate : null;
      return !!m && Math.hypot(m.pos.x - hx, m.pos.z - hz) < 0.1 && Math.abs(Math.atan2(Math.sin(m.yaw - hy), Math.cos(m.yaw - hy))) < 0.05 && c.grounded && !c.override && !g.traversal.attached;
    }, host, 8000, `${what}: the client's view of the offering host has settled`).catch(dump);
    await holdUntil(B, RB, () => window.__app.current.team.count.throws >= 1, `${what}: the client is thrown`).catch(dump);
    const t0 = Date.now();
    const s0 = await GB(() => window.__app.current.time);
    for (;;) {
      const [own, st] = await GB(() => { const g = window.__app.current; const c = g.player.controller; return [[c.pos.x, c.pos.y], g.team.state]; });
      if (st === 'none' && own[0] < BEAM_X - 1) break;
      if ((await GB(() => window.__app.current.time)) - s0 > 20 || Date.now() - t0 > 200000) throw new Error(`${what}: the throw did not land (${st}, ${own})`);
      await waitSim(30);
    }
    await until(B, () => window.__app.current.player.controller.grounded, null, 8000, `${what}: the client lands on its feet`);
    const land = await GB(() => { const c = window.__app.current.player.controller; return { x: c.pos.x, y: c.pos.y, z: c.pos.z }; });
    assert(Math.hypot(land.x - LANDING[0], land.z - LANDING[1]) <= 0.5 && Math.abs(land.y) < 0.3, `${what}: the client lands within 0.5 m of the landing (${JSON.stringify(land)})`);
    await waitSim(600);
    const d1 = await dev(A);
    assert(d1.hits === d0.hits && d1.alarm === d0.alarm, `${what}: the thrown client touched no beam (hits ${d0.hits} -> ${d1.hits}, alarm ${d0.alarm} -> ${d1.alarm})`);
    await until(A, () => window.__app.current.team.state === 'none', null, 8000, `${what}: the thrower is free again`);
  }
  /** The host jams the flood through the gateway from the jam spot. */
  async function jamFlood(floodId, what) {
    await moveHost(FLOOD_JAM[0], FLOOD_JAM[1], 0.1, WEST);
    await drawPistol(A);
    await lt(A, true);
    await aimAt(A, ...FLOOD);
    await until(A, (id) => window.__ctdev.debug().jam[0] === id, floodId, 20000, `${what}: the host jams the flood`);
  }
  const letGo = async (what) => {
    await lt(A, false);
    await until(A, () => window.__ctdev.debug().jam[0] === '', null, 8000, `${what}: the host lets go of the flood`);
    await holster(A);
  };

  // ---- 1. the start: station 11 in the gap, the wicket open (the base's stand-in), the rest shut, two guards ----
  console.log('  A5 (re-plan): the gap, station 11, the guards');
  await moveHost(ST11[0][0], ST11[0][1], 0.1, WEST);
  await moveClient(ST11[1][0], ST11[1][1], 0.1, WEST);
  await noDamage();
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) {
    await stationLive(P, 11, `A5: station 11 is live on the ${tag} page`);
    await sees(P, /wicket door in the wall/, `A5: the ${tag} reads station 11's step line`);
  }
  assert(!(await lockedOnHost(WICKET_DOOR)) && !(await lockedOnClient(WICKET_DOOR)), 'A5: the wicket stand-in is unlocked on both pages (the base opened it)');
  for (const id of [FOOTBRIDGE_DOOR, PLATES_DOOR, BACK_DOOR]) {
    assert(await lockedOnHost(id), `A5: ${id} is locked on the host`);
    assert(await lockedOnClient(id), `A5: ${id} is locked on the client`);
  }
  assert(await lockedOnClient('L5-near'), 'A5: the L5 near door is locked until the release');
  const g0 = await guards();
  assert(g0.length === 2 && g0.every((g) => !g.passive), `A5: two live armed guards in the set (${JSON.stringify(g0)})`);
  assert(g0.some((g) => Math.hypot(g.x - WATCHER[0], g.z - WATCHER[1]) < 0.6 && g.idx === -1), `A5: the watcher stands at his post (${JSON.stringify(g0)})`);
  assert((await laserOn(A)) === true && (await laserOn(B)) === true, 'A5: the beams are on on both pages');
  const [pa, pb] = [await level(A, LANDING[0], LANDING[1]), await level(B, LANDING[0], LANDING[1])];
  assert(pa <= 0.24 && Math.abs(pa - pb) < 0.01, `A5: the landing reads dark and the same on both pages (host ${pa.toFixed(3)}, client ${pb.toFixed(3)})`);
  const r0 = await retries();

  // ---- 2. station 11: through the wicket, then the ladder down ----
  console.log('  A5 (re-plan): the wicket, the ladder');
  await padReady(A);
  await moveHost(68.9, 33.0, 0.1, WEST);
  await openDoor(A, WICKET_DOOR, 'A5');
  await moveHost(ST12[0][0], ST12[0][1], 0.1, WEST);
  await moveClient(ST12[1][0], ST12[1][1], 0.1, WEST);
  await until(A, (f) => window.__course.state.hasFlag(f), 'a5-apron-e', 15000, 'A5: the pass zone sets a5-apron-e (both on the east strip)');
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) {
    await tickedOn(P, 'a5-wall', `A5: the ${tag} sees the wall step ticked`);
    await stationLive(P, 12, `A5: station 12 is live on the ${tag} page`);
  }
  // the ladder down: the host on the wall top at the ladder's head holds the traverse button, climbs down, and is on the floor again
  await moveHost(WALLTOP[0], WALLTOP[1], 6.1, WEST);
  await padReady(A);
  await holdUntil(A, 1, () => { const a = window.__app.current.traversal.attach.anchor; return window.__app.current.traversal.attached && a?.kind === 'ladder'; }, "A5: the host takes the wall's access ladder at its head", null, 20000);
  await A.evaluate(() => window.__pad.axis(1, 1));
  try {
    await until(A, () => { const c = window.__app.current.player.controller; return !window.__app.current.traversal.attached && c.grounded && c.pos.y < 0.3; }, null, 60000, 'A5: the host climbs the ladder down to the apron');
  } finally {
    await A.evaluate(() => window.__pad.axis(1, 0));
  }
  const foot = await GA(() => { const p = window.__app.current.player.position; return [p.x, p.z]; });
  assert(Math.hypot(foot[0] - LADDER[0], foot[1] - LADDER[1]) < 1.5, `A5: the host stands at the ladder's foot (${foot})`);
  assert((await retries()) === r0, 'A5: stations 11 and 12 cost no retry');

  // ---- 3. station 12: the footbridge stand-in, to the west strip ----
  console.log('  A5 (re-plan): the footbridge, station 12');
  assert(!(await lockedOnHost(FOOTBRIDGE_DOOR)) && !(await lockedOnClient(FOOTBRIDGE_DOOR)), 'A5: the footbridge stand-in is unlocked on both pages as 12 went live');
  assert((await lockedOnHost(PLATES_DOOR)) && (await lockedOnClient(PLATES_DOOR)), 'A5: the trench plates stay bolted');
  await moveHost(BRIDGE_E[0], BRIDGE_E[1], 0.1, WEST);
  await openDoor(A, FOOTBRIDGE_DOOR, 'A5');
  await moveHost(BRIDGE_W[0], BRIDGE_W[1], 0.1, WEST);
  await moveClient(WEST_STRIP[0], WEST_STRIP[1], 0.1, WEST);
  await until(A, (f) => window.__course.state.hasFlag(f), 'a5-apron-w', 15000, 'A5: the pass zone sets a5-apron-w (both on the west strip)');
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) {
    await tickedOn(P, 'a5-trench', `A5: the ${tag} sees the trench step ticked`);
    await stationLive(P, 13, `A5: station 13 is live on the ${tag} page`);
    await sees(P, /Throw one of you over the beams/, `A5: the ${tag} reads station 13's step line`);
  }

  // ---- 4. station 13: wait for his back, the throw ----
  console.log('  A5 (re-plan): the throw');
  await moveHost(HIDE[0], HIDE[1], 0.1, 0);
  await moveClient(HIDE[0], HIDE[1] + 1.0, 0.1, 0);
  await backTurned('A5: the patrol has his back to the gateway');
  await throwClient('A5');
  await until(A, (f) => window.__course.state.hasFlag(f), 'a5-in1', 10000, 'A5: the landing sets a5-in1 (one player in the inner zone)');
  assert((await roleOf(1)) === 'b' && (await roleOf(0)) === 'a', 'A5: the thrown client has claimed B (the host A)');
  assert((await retries()) === r0, 'A5: the throw cost no retry');

  // ---- 5. a flood-timer retry: the jam ends and the flood comes back before the release ----
  console.log('  A5 (re-plan): the flood-timer retry');
  await leftKiosk('A5: the patrol leaves the kiosk for pen 1');
  const floodId = await GA(([x, y, z]) => window.__ctdev.debug().lights.find((l) => Math.abs(l.x - x) < 0.05 && Math.abs(l.y - y) < 0.05 && Math.abs(l.z - z) < 0.05)?.id, FLOOD);
  assert(!!floodId, 'A5: the flood is a jam target');
  const reg = Number(floodId.slice(3));
  await jamFlood(floodId, 'A5 timer');
  await until(A, (i) => !window.__app.current.world.level.lights.get(i).on, reg, 3000, 'A5 timer: the flood goes out (the window opens)');
  await until(B, ([x, z]) => (window.__app.current.world.lightField?.bodyLevel(x, 0, z, 1.7) ?? 1) <= 0.24, STRIP, 3000, 'A5 timer: the strip reads dark on the client');
  await letGo('A5 timer');
  await retried('timer', r0, /floodlight came back/, 'A5 timer');

  // ---- 6. a beam-trip retry: the host steps into the beam line ----
  console.log('  A5 (re-plan): the beam-trip retry');
  await noDamage();
  const r1 = await retries();
  await moveHost(BEAM_X, 36, 0.1, WEST);
  await retried('seen', r1, /Seen in the floodlight/, 'A5 beam');

  // ---- 7. the throw with the flood jammed, the release ----
  console.log('  A5 (re-plan): the jam and the release');
  await noDamage();
  await leftKiosk('A5 release: the patrol leaves the kiosk for pen 1');
  await jamFlood(floodId, 'A5 release');
  await until(A, (i) => !window.__app.current.world.level.lights.get(i).on, reg, 3000, 'A5 release: the flood goes out');
  await moveClient(PRESS[0], PRESS[1], 0.1, WEST);
  assert((await use(B, RELEASE)) === 'ok', 'A5 release: the client keys the release at the kiosk');
  await until(A, (f) => window.__course.state.hasFlag(f), FLAG, 10000, 'A5 release: the release sets a5-release');
  await beamsAre(false, 'A5 release: the beams go off for good');
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) {
    await tickedOn(P, 'a5-throw', `A5: the ${tag} sees the throw step ticked`);
    await sees(P, /holding room five/, `A5: the ${tag} reads the closing line`);
  }
  await until(B, (i) => !window.__course.wire.locks.includes(i), await doorIndex('L5-near'), 15000, 'A5: the client sees the L5 near door unlocked');
  const r2 = await retries();
  await letGo('A5 release');
  // the flood flickers back on after the release: no retry (the window is spent with the station)
  await until(A, (i) => window.__app.current.world.level.lights.get(i).on, reg, 20000, 'A5: the flood is back on after the jam');
  await waitSim(2000);
  assert((await retries()) === r2, 'A5: the flood coming back after the release is no retry');
  assert((await GA(() => window.__course.state.station())) === 0, 'A5: no station left in the bay');

  // ---- to the L5 door (the runner then puts both on the pad) ----
  console.log('  A5 (re-plan): to the L5 door');
  await moveClient(54, 47, 0.1, 0);
  await moveHost(53.6, 47.0, 0.1, 0);
  await moveClient(52.4, 47.0, 0.1, 0);
  assert(!(await lockedOnClient('L5-near')), 'A5: the L5 near door is open to the client');
  for (const P of [A, B]) await until(P, () => !window.__app.current.traversal.attached, null, 10000, 'A5: nobody is attached');
  assert(/holding room five/.test(await stepLine(A)), 'A5: the host still reads the closing line');
}
