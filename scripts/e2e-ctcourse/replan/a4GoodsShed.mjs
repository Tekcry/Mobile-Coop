// J14 re-plan walk for A4 the Goods Shed (e2e-ctcourse parts 5-8, map ctcourseReplan; slice G-A4, STATIONS.md sections 3, 5, 6, 8, 9).
// Two pages: A = the host (P1), B = the client (P2). Stations 9 (the lift grille, stand-in), 8 (the camera loop, 60 s) and 10 (the synced
// takedown, 1.5 s) in that order; three guards (the officer, two loaders: the second stands at the desk), three cameras on the loop flag.
// The guards are made passive (they see and hear nothing) while the players are put where a real run would stand; a station retry puts them
// back on their posts (R1), so the walk makes them passive again after each one. The walk:
//   1. the start: station 9 live on both pages, the stand-in has the grille unlocked on both, the dispatch office locked for good, the
//      back aisle's three strips and the office panel lit, D2 at the desk (80.0, 31.6) and not moving;
//   2. station 9: both under the grille in the back aisle (the passage door and the grille opened by hand): `a4-grille` set, `a4-s9` ticks,
//      station 8 live on both pages;
//   3. station 8, one loop-timer retry: the officer goes down, the host presses the console (it claims B), then both stay in the room;
//      the 60 s loop ends with `a4-west` not reached: the station retries (cause timer), both land on station 8's marks (A (104.5, 14.0),
//      B (105.5, 14.0)), station 9 stays done and its grille open, LANTERN's timer line reaches the client, the officer is back up;
//   4. station 8 again: the officer down, the console pressed, both cross the cross aisle and the main aisle to the dock inside the loop
//      (no retry, the cameras never see them): `a4-west` set, `a4-s8` ticks, station 10 live;
//   5. station 10, one takedown retry: one loader taken alone, 1.5 s later the station retries (cause timer): both on station 10's marks
//      (A (80.5, 36.5), B (79.5, 29.5)), both loaders back up (D2 at the desk), stations 9 and 8 still done, LANTERN's timer line;
//   6. the synced takedown: both loaders down inside one step: no retry, the dual takedown counts; both at the wicket (`a4-wicket`), the
//      client pushes the bar (L4's east door unlocks on both pages), `a4-s10` ticks, the closing line shows.
// Teleport legs are allowed on the open floor (the unit test holds the route, the closed aisles and the cameras:
// tests/ctcourse/replan/a4GoodsShed.test.ts); doors the route opens are opened by `use(P, 'door-<anchor id>')`. Written for the laptop
// queue: pending its first PC run.
export const SET = 'a4GoodsShed';

const OFFICER = 'a4-officer';
const DOCK1 = 'a4-dock1';
const DOCK2 = 'a4-dock2';
const CONSOLE = 'c-a4-console';
const PUSHBAR = 'c-a4-pushbar';
const GATE = 'g-a4-console';
const WICKET = 'g-a4-wicket';
const LOOP_FLAG = 'a4-loop';
const L4_DOOR = 'L4-near';
const PASSAGE_DOOR = 'A4-passage';
const GRILLE_DOOR = 'A4-grille';
const GRILLE_MOTOR_GATE = 'g-a4-grille-motor';
const OFFICE_DOOR = 'A4-office';
/** Station 8's marks are in the security room, station 10's behind the two stacks (STATIONS section 3): A then B. */
const ST8 = [[104.5, 14.0], [105.5, 14.0]];
const ST10 = [[80.5, 36.5], [79.5, 29.5]];
/** Behind the officer, the console's standing point, the push bar. */
const BEHIND = [104.8, 15.8];
const AT_CONSOLE = [105.6, 17.85];
const AT_PUSHBAR = [77.6, 34.6];
/** Under the grille in the back aisle (the a4-grille zone [98.5, 24.3, 104.5, 27.2]), the cross aisle, the main aisle's middle. */
const UNDER = [[100.5, 25.6], [103.0, 25.6]];
const CROSS = [96.75, 31.4];
const AISLE = [92.0, 39.8];
/** The two loaders' posts: D1 at the desk's north side, D2 at its south side (the kettle loop is out: he stays). */
const D1_POST = [80.0, 34.4];
const D2_POST = [80.0, 31.6];
/** The wicket zone [76.3, 33, 78, 36]: the host's spot (the client stands at the push bar, also inside it). */
const WICKET_AT = [77.2, 34.0];
const LOOP_S = 60;
/** The back aisle's lit middle (group 49). */
const BACK_AISLE = [100, 25.8];

/** @param {object} t the runner's helpers (scripts/e2e-ctcourse.mjs) @param {number} n the set's number */
export async function walk(t, n) {
  const { A, B, GA, GB, until, assert, waitSim, use, hostDebug, moveHost, moveClient, doorIndex, stepLine } = t;
  void n;

  // ---- helpers local to the set ----
  const sees = (P, re, what) => until(P, ([src]) => new RegExp(src).test(document.querySelector('.course-hud .ch-step')?.textContent ?? ''), [re.source], 15000, what);
  const ticked = (P, id) => P.evaluate((id) => !!document.querySelector(`.course-hud tr[data-step="${id}"] td.done`), id);
  const stepTicked = (P, id, what) => until(P, (id) => !!document.querySelector(`.course-hud tr[data-step="${id}"] td.done`), id, 15000, what);
  const lockedOnClient = async (cid) => GB((i) => window.__course.wire.locks.includes(i), await doorIndex(cid));
  const lockedOnHost = (cid) => GA((cid) => window.__course.state.locked(cid), cid);
  const level = (P, x, z, h = 1.7) => P.evaluate(([x, z, h]) => window.__app.current.world.lightField?.bodyLevel(x, 0, z, h) ?? -1, [x, z, h]);
  const lampsOn = (P, g, on) => P.evaluate(([g, on]) => { const l = window.__app.current.world.level.lights.lights.filter((x) => x.kind !== 'flashlight' && x.group === g); return l.length > 0 && l.every((x) => x.on === on); }, [g, on]);
  const lampCount = (P, g) => P.evaluate((g) => window.__app.current.world.level.lights.lights.filter((x) => x.kind !== 'flashlight' && x.group === g).length, g);
  const hasFlag = (f) => GA((f) => window.__course.state.hasFlag(f), f);
  const roleOf = (p) => GA((p) => window.__course.state.roleOf(p), p);
  const claimed = () => GA(() => window.__course.state.roleClaimed());
  const gateOpen = (id) => GA((id) => window.__course.state.isGateOpen(id), id);
  const retries = () => GA(() => window.__course.state.restarts);
  const noDamage = (P) => P.evaluate(() => { window.__app.current.target.damageMul = 0; });
  /** Station `k` is live on page P (the host's state, the client's course wire). */
  const stationLive = (P, k, what) => (P === A ? until(A, (k) => window.__course.state.station() === k, k, 15000, what) : until(B, (k) => window.__course.wire?.s?.st === k, k, 15000, what));
  const feet = () => GA(() => { const f = window.__course.state.feet; return [[f[0], f[2]], [f[3], f[5]]]; });
  /** A guard of the bay by its slot id. */
  const guard = (slot) =>
    GA((s) => {
      const e = window.__course.squadOf(s);
      return e ? { alive: e.alive, ko: !!e.ko, passive: !!e.passive, alerted: !!e.alerted, kind: e.def.kind, x: e.pos.x, z: e.pos.z } : null;
    }, slot);
  const setPassive = (slots, on) =>
    GA(([slots, on]) => {
      for (const s of slots) {
        const e = window.__course.squadOf(s);
        if (e) e.passive = on;
      }
    }, [slots, on]);
  const knockOut = (slots) =>
    GA((slots) => {
      const g = window.__app.current;
      const V = g.player.position.constructor;
      for (const s of slots) {
        const e = window.__course.squadOf(s);
        e.knockOut({ amount: 100, point: e.pos.clone(), dir: new V(-1, 0, 0), part: 'body', kind: 'melee', attackerTeam: 'player', attackerId: 'local', sourcePos: g.player.position.clone(), impulse: 0, nonLethal: true });
      }
    }, slots);
  const camModes = (P) => P.evaluate(() => window.__ctdev.debug().cams.filter((c) => c.id.startsWith('cam-a4-')).map((c) => c.mode));
  const allCams = (P, mode) => until(P, ([m]) => { const cs = window.__ctdev.debug().cams.filter((c) => c.id.startsWith('cam-a4-')); return cs.length === 3 && cs.every((c) => c.mode === m); }, [mode], 15000, `all three cameras are ${mode}`);
  /** No A4 camera holds anything on either player (the meters and stages the debug list carries). */
  async function camerasHold(what) {
    for (const P of [A, B]) {
      const d = await t.dev(P);
      for (const c of d.cams.filter((x) => x.id.startsWith('cam-a4-'))) assert(c.meter.every((m) => m === 0) && c.stage.every((s) => s === 0), `${what}: ${c.id} holds nothing (meters ${JSON.stringify(c.meter)}, stages ${JSON.stringify(c.stage)})`);
    }
  }
  /** Open a course door by hand on the host (as a player would) and see it open on both pages. */
  async function openDoor(cid, what) {
    const i = await doorIndex(cid);
    const aid = await GA((cid) => window.__app.current.world.layout.course.doors[cid], cid);
    if (!(await A.evaluate((i) => window.__app.current.world.doors.list[i].open > 0.5, i))) {
      assert((await use(A, `door-${aid}`)) === 'ok', `${what}: the host opens ${cid}`);
      await until(A, (i) => window.__app.current.world.doors.list[i].open > 0.5, i, 8000, `${what}: ${cid} opens (host)`);
    }
    await until(B, (i) => window.__app.current.world.doors.list[i].open > 0.5, i, 15000, `${what}: the client sees ${cid} open`);
  }
  /** The two players on a station's two marks (A then B; the host's and the client's by the claimed roles), standing there on both pages. */
  async function onMarks(marks, what) {
    const roleA = (await roleOf(0)) === 'a' ? 0 : 1;
    const want = roleA === 0 ? [marks[0], marks[1]] : [marks[1], marks[0]];
    await until(A, (w) => { const f = window.__course.state.feet; return Math.hypot(f[0] - w[0][0], f[2] - w[0][1]) < 0.6 && Math.hypot(f[3] - w[1][0], f[5] - w[1][1]) < 0.6; }, want, 20000, `${what}: the host sees both players on the marks`).catch(async (e) => {
      console.error(`${what}: feet ${JSON.stringify(await feet())}, want ${JSON.stringify(want)}`);
      throw e;
    });
    await until(B, (w) => { const p = window.__app.current.player.position; return Math.hypot(p.x - w[0], p.z - w[1]) < 0.6; }, want[1], 15000, `${what}: the client page stands on its mark`);
  }
  /** The officer is back up at his post and the loaders at theirs (D2 at the desk) after a retry's reset. */
  async function guardsReset(what) {
    const o = await guard(OFFICER);
    const d1 = await guard(DOCK1);
    const d2 = await guard(DOCK2);
    assert(!!o && o.alive && Math.hypot(o.x - 104.8, o.z - 17.6) < 0.8, `${what}: the officer is up at his post (${JSON.stringify(o)})`);
    assert(!!d1 && d1.alive && Math.hypot(d1.x - D1_POST[0], d1.z - D1_POST[1]) < 0.8, `${what}: D1 is up at his post (${JSON.stringify(d1)})`);
    assert(!!d2 && d2.alive && Math.hypot(d2.x - D2_POST[0], d2.z - D2_POST[1]) < 0.8, `${what}: D2 is up at the desk (${JSON.stringify(d2)})`);
  }
  /** The officer goes down with the client behind him and the host at the console; the host's press loops the cameras on both pages. */
  async function loopTheCameras(what) {
    await setPassive([OFFICER, DOCK1, DOCK2], true);
    await moveClient(BEHIND[0], BEHIND[1], 0.1, 0);
    await moveHost(AT_CONSOLE[0], AT_CONSOLE[1], 0.1, 0);
    await knockOut([OFFICER]);
    assert(await GA(() => !window.__course.squadOf('a4-officer').alive), `${what}: the officer is down`);
    await until(A, (id) => window.__course.state.gateRearm(id) === 0, GATE, 30000, `${what}: the console is armed`);
    assert((await use(A, CONSOLE)) === 'ok', `${what}: the host presses the console`);
    await until(A, ([f, g]) => window.__course.state.hasFlag(f) && window.__course.debug().gates[g], [LOOP_FLAG, GATE], 8000, `${what}: the console sets the flag and opens its gate`);
    await until(B, (f) => window.__course.wire.s.flags.includes(f), LOOP_FLAG, 8000, `${what}: the client has the flag`);
    await allCams(A, 'looped');
    await allCams(B, 'looped');
  }

  // ---- 1. the start: station 9, the grille's stand-in, the office locked, the lamps, D2 at the desk ----
  console.log('  A4 (re-plan): the start, station 9');
  await noDamage(A);
  await GA(() => { for (const r of window.__app.current.net.remotes.values()) { r.damageMul = 0; r.protectT = 0; } });
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) {
    await stationLive(P, 9, `A4: station 9 is live on the ${tag} page`);
    await sees(P, /lift grille/, `A4: the ${tag} reads station 9's step line`);
    const m = await camModes(P);
    assert(m.length === 3 && m.every((x) => x === 'online'), `A4: the three cameras are online on the ${tag} (${JSON.stringify(m)})`);
    assert((await lampCount(P, 49)) === 3 && (await lampCount(P, 44)) === 1, `A4: the ${tag} has the three back aisle strips (49) and the office panel (44)`);
    for (const g of [40, 41, 42, 43, 49, 44]) assert(await lampsOn(P, g, true), `A4: circuit ${g} is lit on the ${tag}`);
  }
  assert(!(await lockedOnClient(GRILLE_DOOR)) && !(await lockedOnHost(GRILLE_DOOR)), 'A4: the stand-in has the grille unlocked on both pages as station 9 goes live');
  const gates0 = (await hostDebug()).gates;
  assert(gates0[GRILLE_MOTOR_GATE] === true, `A4: the stand-in gate is open (${JSON.stringify(gates0)})`);
  assert((await lockedOnClient(OFFICE_DOOR)) && (await lockedOnHost(OFFICE_DOOR)), 'A4: the dispatch office is locked on both pages');
  assert(await lockedOnClient(L4_DOOR), "A4: L4's east door (the dock wicket) starts locked on the client");
  const [la, lb] = [await level(A, BACK_AISLE[0], BACK_AISLE[1]), await level(B, BACK_AISLE[0], BACK_AISLE[1])];
  assert(la >= 0.4 && Math.abs(la - lb) < 0.02, `A4: the back aisle reads lit and the same on both pages (host ${la.toFixed(3)}, client ${lb.toFixed(3)})`);
  const d2a = await guard(DOCK2);
  assert(!!d2a && d2a.alive && Math.hypot(d2a.x - D2_POST[0], d2a.z - D2_POST[1]) < 0.8, `A4: D2 is at the desk (${JSON.stringify(d2a)})`);
  await waitSim(6000);
  const d2b = await guard(DOCK2);
  assert(Math.hypot(d2b.x - d2a.x, d2b.z - d2a.z) < 0.3, `A4: D2 stays at the desk, no kettle loop (${JSON.stringify(d2a)} -> ${JSON.stringify(d2b)})`);
  assert(!(await claimed()), 'A4: nobody has claimed a job yet');

  // ---- 2. station 9: both under the grille (the stand-in opened it) ----
  console.log('  A4 (re-plan): the lift grille');
  await setPassive([OFFICER, DOCK1, DOCK2], true);
  await openDoor(PASSAGE_DOOR, 'A4 passage');
  await openDoor(GRILLE_DOOR, 'A4 grille');
  const r0 = await retries();
  await moveHost(UNDER[0][0], UNDER[0][1], 0.1, 0);
  await waitSim(500);
  assert(!(await hasFlag('a4-grille')), 'A4: one player under the grille is not enough');
  await moveClient(UNDER[1][0], UNDER[1][1], 0.1, 0);
  await until(A, () => window.__course.state.hasFlag('a4-grille'), null, 10000, 'A4: the pass zone sets a4-grille with both under the grille');
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) {
    await stepTicked(P, 'a4-s9', `A4: the ${tag} sees station 9's step ticked`);
    await stationLive(P, 8, `A4: station 8 is live on the ${tag} page`);
    await sees(P, /security console/, `A4: the ${tag} reads station 8's step line`);
  }
  assert((await retries()) === r0, 'A4: the grille cost no retry');
  await camerasHold('A4 back aisle');

  // ---- 3. station 8, one loop-timer retry: the loop ends with both still in the room ----
  console.log('  A4 (re-plan): the camera loop that runs out');
  await loopTheCameras('A4 loop 1');
  const roles = () => GA(() => [window.__course.state.roleOf(0), window.__course.state.roleOf(1)]);
  assert(JSON.stringify(await roles()) === '["b","a"]', `A4: the host pressed first: host B, client A (${JSON.stringify(await roles())})`);
  const r1 = await retries();
  const rln0 = await GB(() => window.__course.wire.rln ?? 0);
  for (const P of [A, B]) await sees(P, /Cameras back in \d+ s/, 'A4: the loop timer line shows');
  await until(A, ([r]) => window.__course.state.restarts > r && window.__course.state.lastRetry?.st === 8, [r1], (LOOP_S + 40) * 1000, 'A4: the loop ends before a4-west: station 8 retries');
  assert((await GA(() => window.__course.state.lastRetry.cause)) === 'timer', 'A4: the retry cause is timer');
  await until(B, (n0) => (window.__course.wire.rln ?? 0) > n0 && /The cameras came back/.test(window.__course.wire.rl ?? ''), rln0, 30000, "A4: LANTERN's station 8 timer line reaches the client");
  await onMarks(ST8, 'A4 loop retry');
  assert(await hasFlag('a4-grille'), 'A4: station 9 is still done (a4-grille set)');
  assert(!(await lockedOnHost(GRILLE_DOOR)) && !(await lockedOnClient(GRILLE_DOOR)), 'A4: the grille stays open through the retry');
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) {
    await stationLive(P, 8, `A4: station 8 is live again on the ${tag} page`);
    assert(await ticked(P, 'a4-s9'), `A4: the ${tag} still sees station 9's step ticked`);
  }
  assert(!(await hasFlag(LOOP_FLAG)), 'A4: the loop flag is clear after the retry');
  await allCams(A, 'online');
  await allCams(B, 'online');
  await guardsReset('A4 loop retry');
  // the retry's placement hold ends before anyone is moved
  await waitSim(3500);

  // ---- 4. station 8 again: press, cross the cross aisle and the main aisle to the dock inside the loop ----
  console.log('  A4 (re-plan): the loop, the crossing');
  await noDamage(A);
  await loopTheCameras('A4 loop 2');
  const r2 = await retries();
  await moveHost(CROSS[0], CROSS[1], 0.1, 0);
  await moveClient(CROSS[0], CROSS[1] + 1.0, 0.1, 0);
  await waitSim(400);
  await moveHost(AISLE[0], AISLE[1], 0.1, -Math.PI / 2);
  await moveClient(AISLE[0] + 1.0, AISLE[1], 0.1, -Math.PI / 2);
  await waitSim(400);
  await camerasHold('A4 crossing');
  // the host pressed first (B: the south crouch spot), the client is A (the north spot)
  await moveClient(ST10[0][0], ST10[0][1], 0.1, Math.PI);
  await waitSim(600);
  assert(!(await hasFlag('a4-west')), 'A4: one player west of x 84 is not enough');
  await moveHost(ST10[1][0], ST10[1][1], 0.1, 0);
  await until(A, () => window.__course.state.hasFlag('a4-west'), null, 10000, 'A4: the pass zone sets a4-west with both west');
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) {
    await stepTicked(P, 'a4-s8', `A4: the ${tag} sees station 8's step ticked`);
    await stationLive(P, 10, `A4: station 10 is live on the ${tag} page`);
    await sees(P, /loaders/, `A4: the ${tag} reads station 10's step line`);
  }
  assert((await retries()) === r2, 'A4: the crossing inside the loop cost no retry');
  await camerasHold('A4 dock');

  // ---- 5. station 10, one takedown retry: one loader taken alone ----
  console.log('  A4 (re-plan): one loader taken alone');
  await noDamage(A);
  const rln1 = await GB(() => window.__course.wire.rln ?? 0);
  const r3 = await retries();
  await knockOut([DOCK1]);
  assert(await GA(() => !window.__course.squadOf('a4-dock1').alive), 'A4: D1 is down alone');
  await until(A, ([r]) => window.__course.state.restarts > r && window.__course.state.lastRetry?.st === 10, [r3], 20000, 'A4: the second loader is not down 1.5 s later: station 10 retries');
  assert((await GA(() => window.__course.state.lastRetry.cause)) === 'timer', 'A4: the retry cause is timer');
  await until(B, (n0) => (window.__course.wire.rln ?? 0) > n0 && /Both loaders at once/.test(window.__course.wire.rl ?? ''), rln1, 30000, "A4: LANTERN's station 10 timer line reaches the client");
  await onMarks(ST10, 'A4 takedown retry');
  assert((await hasFlag('a4-grille')) && (await hasFlag('a4-west')), 'A4: stations 9 and 8 are still done');
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await stationLive(P, 10, `A4: station 10 is live again on the ${tag} page`);
  const d1r = await guard(DOCK1);
  assert(!!d1r && d1r.alive && Math.hypot(d1r.x - D1_POST[0], d1r.z - D1_POST[1]) < 0.8, `A4: D1 is back at his post (${JSON.stringify(d1r)})`);
  const d2r = await guard(DOCK2);
  assert(!!d2r && d2r.alive && Math.hypot(d2r.x - D2_POST[0], d2r.z - D2_POST[1]) < 0.8, `A4: D2 is at the desk (${JSON.stringify(d2r)})`);
  assert(!(await hasFlag('a4-wicket')), 'A4: the wicket step is not done');
  await waitSim(3500);

  // ---- 6. the synced takedown, the wicket ----
  console.log('  A4 (re-plan): the synced takedown, the wicket');
  await noDamage(A);
  await setPassive([DOCK1, DOCK2], true);
  const duals0 = await GA(() => window.__app.current.net.duals);
  const r4 = await retries();
  await knockOut([DOCK1, DOCK2]);
  assert(await GA(() => !window.__course.squadOf('a4-dock1').alive && !window.__course.squadOf('a4-dock2').alive), 'A4: both loaders are down');
  const ids = [await GA(() => window.__coop.session.selfId), await GB(() => window.__coop.session.selfId)];
  await GA(([a, c]) => { const net = window.__app.current.net; net['takedownDone'](a); net['takedownDone'](c); }, ids);
  assert((await GA(() => window.__app.current.net.duals)) === duals0 + 1, 'A4: two takedowns together count as a dual takedown');
  await waitSim(3000);
  assert((await retries()) === r4, 'A4: both loaders down inside the window is no retry');
  assert(!(await gateOpen(WICKET)) && (await lockedOnClient(L4_DOOR)), "A4: L4's east door is locked before the bar");
  await moveHost(WICKET_AT[0], WICKET_AT[1], 0.1, -Math.PI / 2);
  await moveClient(AT_PUSHBAR[0], AT_PUSHBAR[1], 0.1, -Math.PI / 2);
  await until(A, () => window.__course.state.hasFlag('a4-wicket'), null, 10000, 'A4: the pass zone sets a4-wicket with both at the wicket').catch(async (e) => {
    console.error(`A4 wicket: feet ${JSON.stringify(await feet())}`);
    throw e;
  });
  assert((await use(B, PUSHBAR)) === 'ok', 'A4: the client pushes the bar');
  await until(A, (g) => window.__course.debug().gates[g], WICKET, 8000, 'A4: the egress gate opens');
  await until(B, (i) => !window.__course.wire.locks.includes(i), await doorIndex(L4_DOOR), 15000, "A4: the client sees L4's east door unlocked");
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) {
    await stepTicked(P, 'a4-s10', `A4: the ${tag} sees station 10's step ticked`);
    await sees(P, /holding room four/, `A4: the ${tag} reads the closing line`);
  }
  assert((await GA(() => window.__course.state.station())) === 0, 'A4: no station left in the bay');
  for (const P of [A, B]) await until(P, () => !window.__app.current.traversal.attached, null, 10000, 'A4: nobody is hanging');
  assert(/holding room four/.test(await stepLine(A)), 'A4: the host still reads the closing line');
}
