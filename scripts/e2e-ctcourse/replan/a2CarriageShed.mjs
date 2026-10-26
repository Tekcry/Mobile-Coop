// J14 re-plan walk for a2CarriageShed (e2e-ctcourse parts 5-8, map ctcourseReplan; G-A2). NOT RUN by the builder: pending PC run.
// Two pages: A = the host (P1), B = the client (P2). The set is entered with the course at A2 (stations 3, 4, 5 of the route):
//   0. the start: station 3 is live on both pages, the roller door is shut (locked) on both, one guard (the shunter) at his post;
//   1. station 3, a spotted retry: the client steps into the lit neck in front of the shunter; a station retry (not a set restart):
//      `restarts` + 1, `lastRetry` = { st 3, cause 'seen' } on both pages, both back on station 3's marks, LANTERN's line on both,
//      the shunter fresh at his post, the roller door shut, station 3 still live and no earlier station's flag undone;
//   2. station 3, the shutter: the host holds the roller door at the stores face, the client takes the hold from the lane side, the
//      host goes under, the client lets go: both in the lane sets `a2-lane`, station 4 is live, the hold gate shuts and the roller
//      door stays unlocked on both pages (its latch `g-a2-shutter-open`, station 4's stand-in: open for good);
//   3. station 4, a neck timer retry: the client walks back under the latched roller door and through the stores bay into the cabin,
//      presses cabinet one (dark, 15 s), the host stands in the neck until the
//      lights come back: `restarts` + 1, `lastRetry` = { st 4, cause 'timer' } on both pages, both back on station 4's marks, the timer
//      line on both, the neck lit, the isolator ready again, the roller door still latched;
//   4. station 4, the drill: cabinet one, the host crosses the dark neck inside the window (no retry); the lights come back with the
//      neck empty (no retry); cabinet two by the pit (63.5, 11.6), the client crosses: `a2-east`, station 5 is live;
//   5. station 5, the walkway stand-in: open on both pages as the station goes live (and through the walk), both players cross the pit
//      by it to the far landing at the L2 door: `a2-across`, no station left.
// Teleport legs are allowed on open floor; a door the route opens is opened by `use(P, 'door-<anchor id>')` and asserted open on both
// pages before anyone is moved through it. The unit tests (`tests/ctcourse/replan/a2CarriageShed.test.ts`) pin the closures, the pit and
// the marks; the pit's hop and mantle limits are theirs too.
export const SET = 'a2CarriageShed';

const GATE_NECK = 'g-a2-neck';
const GATE_SHUTTER = 'g-a2-shutter';
const GATE_LATCH = 'g-a2-shutter-open';
const GATE_WALKWAY = 'g-a2-walkway';
const DOOR_SHUTTER = 'A2-shutter';
const DOOR_WALKWAY = 'A2-walkway';
const DOOR_CABIN = 'A2-cabin';
const ISO1 = 'c-a2-iso-1';
const ISO2 = 'c-a2-iso-2';
const HOLD = 'c-a2-shutter-hold';
const NECK_GROUP = 21;
const FLAG_LANE = 'a2-lane';
const FLAG_EAST = 'a2-east';
const FLAG_ACROSS = 'a2-across';
/** Station marks (STATIONS section 7) and the places the walk uses. */
const MARK3 = [[31.0, 11.5], [31.0, 13.0]];
const MARK4 = [[30.5, 2.5], [45.5, 12.5]];
const MARK5 = [[65.5, 12.0], [65.5, 13.0]];
/** The hold point's standing spots either side of the roller door (within the 1.4 m reach). */
const HOLD_STORES = [32.2, 10.6];
const HOLD_LANE = [33.8, 10.6];
const CAB1 = [30.6, 2.6];
/** The walk back from the lane to the cabin (lead answer 3: no teleport through the roller door): the lane side of the opening, the
 *  stores side, the cabin's north door (x 30.4-31.6 on z 5) from the bay, then inside. */
const UNDER_LANE = [34.0, 12.5];
const UNDER_STORES = [32.0, 12.5];
const CABIN_OUT = [31.0, 6.0];
const CABIN_IN = [31.0, 4.0];
const CAB2_FRONT = [63.5, 12.3];
/** In front of the shunter (post (51, 10), facing east): a body in the lit neck is seen. */
const SEEN = [54, 10];
const CROSS = [51, 12.5];
const WALKWAY_MID = [67.5, 12.0];
const LANDING = [69.4, 10.0];

/** @param {object} t the runner's helpers (scripts/e2e-ctcourse.mjs) @param {number} n the set's number */
export async function walk(t, n) {
  const { A, B, GA, GB, until, assert, waitSim, use, moveHost, moveClient, doorIndex, stepLine } = t;

  // ---- helpers local to the set ----
  const station = (P) => P.evaluate(() => (typeof window.__course.station === 'function' ? window.__course.station() : -1));
  const restarts = (P) => P.evaluate(() => window.__course.restarts);
  const lastRetry = (P) => P.evaluate(() => window.__course.lastRetry);
  const lockedOnClient = async (cid) => GB((i) => window.__course.wire.locks.includes(i), await doorIndex(cid));
  const gateOpen = (id) => GA((id) => window.__course.state.isGateOpen(id), id);
  const hasShared = (f) => GA((f) => window.__course.state.hasShared(f), f);
  const shunter = () => GA(() => { const e = window.__app.current.enemyMgr.enemies.find((x) => x.alive); return e ? { x: e.pos.x, z: e.pos.z, alerted: !!e.alerted, passive: !!e.passive } : null; });
  const noDamage = () => GA(() => { window.__app.current.target.damageMul = 0; });
  const neckLamps = (P, on) => P.evaluate(([g, on]) => { const l = window.__app.current.world.level.lights.lights.filter((x) => x.kind !== 'flashlight' && x.group === g); return l.length === 4 && l.every((x) => x.on === on); }, [NECK_GROUP, on]);
  /** Open the door `cid` by hand on page P (as a player would) and see it open on both pages; a door the course left open is not touched. */
  async function openDoor(P, cid, what) {
    const i = await doorIndex(cid);
    const aid = await GA((cid) => window.__app.current.world.layout.course.doors[cid], cid);
    const open = (Q) => Q.evaluate((i) => window.__app.current.world.doors.list[i].open > 0.5, i);
    if (!(await open(A))) {
      assert((await use(P, `door-${aid}`)) === 'ok', `${what}: opens the door ${cid}`);
      await until(A, (i) => window.__app.current.world.doors.list[i].open > 0.5, i, 8000, `${what}: the door ${cid} opens (host)`);
    }
    await until(B, (i) => window.__app.current.world.doors.list[i].open > 0.5, i, 15000, `${what}: the client sees the door ${cid} open`);
  }
  const sees = (P, re, what) => until(P, ([src]) => new RegExp(src).test(document.querySelector('.course-hud .ch-step')?.textContent ?? ''), [re.source], 15000, what);
  /** A retry: the counter went up once on both pages, it names the station and cause, both are back on the marks. */
  async function assertRetry(what, r0, st, cause, marks) {
    await until(A, ([r0]) => window.__course.restarts === r0 + 1, [r0], 45000, `${what}: the host counts the retry`);
    await until(B, ([r0]) => window.__course.restarts === r0 + 1, [r0], 15000, `${what}: the client counts the retry`);
    for (const [P, tag] of [[A, 'host'], [B, 'client']]) {
      const lr = await lastRetry(P);
      assert(!!lr && lr.st === st && lr.cause === cause, `${what}: the ${tag}'s last retry is station ${st} / ${cause} (${JSON.stringify(lr)})`);
      assert((await station(P)) === st, `${what}: the ${tag} still has station ${st} live`);
    }
    await until(A, ([m]) => {
      const f = window.__course.state.feet;
      const near = (x, z) => [0, 1].some((p) => Math.hypot(f[p * 3] - x, f[p * 3 + 2] - z) < 1.2);
      return m.every(([x, z]) => near(x, z));
    }, [marks], 20000, `${what}: the retry puts both players on station ${st}'s marks`);
    await waitSim(1500);
    await noDamage();
  }

  // ---- 0. the start: station 3, the roller door shut, one calm guard ----
  console.log('  A2 (re-plan): the stores bay, station 3');
  await moveHost(MARK3[0][0], MARK3[0][1], 0.1, Math.PI / 2);
  await moveClient(MARK3[1][0], MARK3[1][1], 0.1, Math.PI / 2);
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) {
    await until(P, () => window.__course.station() === 3, null, 15000, `A2: the ${tag} has station 3 live`);
    await sees(P, /roller door/i, `A2: the ${tag} reads the roller door line`);
  }
  assert(!(await gateOpen(GATE_SHUTTER)) && (await GA((d) => window.__course.state.locked(d), DOOR_SHUTTER)), 'A2: the roller door is shut and locked on the host');
  assert(await lockedOnClient(DOOR_SHUTTER), 'A2: the roller door is locked on the client');
  const gs = await GA(() => window.__app.current.enemyMgr.enemies.filter((q) => q.alive).length);
  assert(gs === 1, `A2: one guard on the re-plan (${gs})`);
  const g0 = await shunter();
  assert(!!g0 && !g0.alerted && Math.hypot(g0.x - 51, g0.z - 10) < 2.5, `A2: the shunter is calm at his post (${JSON.stringify(g0)})`);
  await noDamage();

  // ---- 1. station 3: a spotted retry (no set restart, nothing earlier undone) ----
  console.log('  A2 (re-plan): seen in the lit neck, a station 3 retry');
  const flags = ['a1-top1', 'a1-top'];
  const before = await Promise.all(flags.map((f) => hasShared(f)));
  const r0 = await restarts(A);
  await moveClient(SEEN[0], SEEN[1], 0.1, -Math.PI / 2);
  await assertRetry('A2 station 3', r0, 3, 'seen', MARK3);
  const after = await Promise.all(flags.map((f) => hasShared(f)));
  assert(JSON.stringify(before) === JSON.stringify(after), `A2: the retry undid no earlier station (${JSON.stringify(before)} -> ${JSON.stringify(after)})`);
  await until(A, () => /Seen at the roller door/.test(window.__course.radioLine ?? ''), null, 15000, "A2: LANTERN's station 3 line on the host");
  await until(B, () => /Seen at the roller door/.test(window.__course.wire.rl ?? ''), null, 15000, "A2: LANTERN's station 3 line reaches the client");
  await until(A, () => { const e = window.__app.current.enemyMgr.enemies.find((q) => q.alive); return !!e && !e.alerted && Math.hypot(e.pos.x - 51, e.pos.z - 10) < 2.5; }, null, 15000, 'A2: the shunter is fresh at his post after the retry');
  assert(!(await gateOpen(GATE_SHUTTER)) && (await lockedOnClient(DOOR_SHUTTER)), 'A2: the roller door is shut again after the retry');

  // ---- 2. station 3: the shutter (one holds, the other goes under) ----
  console.log('  A2 (re-plan): the roller door');
  await moveHost(HOLD_STORES[0], HOLD_STORES[1], 0.1, Math.PI / 2);
  assert((await use(A, HOLD)) === 'ok', 'A2: the host holds the roller door up at the stores face');
  await until(A, (id) => window.__course.state.isGateOpen(id), GATE_SHUTTER, 10000, 'A2: the shutter gate opens on the host while held');
  await until(B, (i) => !window.__course.wire.locks.includes(i), await doorIndex(DOOR_SHUTTER), 15000, 'A2: the roller door unlocks on the client');
  await openDoor(A, DOOR_SHUTTER, 'A2 shutter');
  // the other goes under: the client to the lane side of the opening and takes the hold there; the host lets go and goes under
  await moveClient(HOLD_LANE[0], HOLD_LANE[1], 0.1, Math.PI / 2);
  assert((await use(B, HOLD)) === 'ok', 'A2: the client takes the hold from the lane side');
  await waitSim(400);
  await moveHost(38, 12.5, 0.1, Math.PI / 2);
  await waitSim(800);
  assert(await gateOpen(GATE_SHUTTER), 'A2: the client alone keeps the roller door up (the host let go)');
  // the client lets go (walks into the lane): the door shuts behind both and station 3 is done
  await moveClient(40, 12.5, 0.1, Math.PI / 2);
  await until(A, (f) => window.__course.state.hasShared(f), FLAG_LANE, 10000, 'A2: both in the lane set a2-lane');
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await until(P, () => window.__course.station() === 4, null, 15000, `A2: the ${tag} has station 4 live`);
  await until(A, (id) => !window.__course.state.isGateOpen(id), GATE_SHUTTER, 10000, 'A2: the hold gate shuts once nobody holds');
  // the latch (lead answer 3): station 4's stand-in opens as it goes live, so the roller door stays unlocked with nobody holding
  await until(A, (id) => window.__course.state.isGateOpen(id), GATE_LATCH, 10000, 'A2: the roller door latches open on the host');
  assert(!(await GA((d) => window.__course.state.locked(d), DOOR_SHUTTER)), 'A2: the roller door is unlocked on the host with nobody holding');
  await until(B, (i) => !window.__course.wire.locks.includes(i), await doorIndex(DOOR_SHUTTER), 15000, 'A2: the roller door stays unlocked on the client');

  // ---- 3. station 4: a neck timer retry (the lights come back with a player in the neck) ----
  console.log('  A2 (re-plan): the neck, a station 4 timer retry');
  // the client walks back under the latched roller door (open on both pages first), across the stores bay and into the cabin
  await openDoor(B, DOOR_SHUTTER, 'A2 shutter (latched)');
  await moveClient(UNDER_LANE[0], UNDER_LANE[1], 0.1, -Math.PI / 2);
  await moveClient(UNDER_STORES[0], UNDER_STORES[1], 0.1, -Math.PI / 2);
  await moveClient(CABIN_OUT[0], CABIN_OUT[1], 0.1, Math.PI);
  await openDoor(B, DOOR_CABIN, 'A2 cabin');
  await moveClient(CABIN_IN[0], CABIN_IN[1], 0.1, Math.PI);
  await moveClient(CAB1[0], CAB1[1], 0.1, Math.PI);
  await moveHost(MARK4[1][0], MARK4[1][1], 0.1, Math.PI / 2);
  await noDamage();
  assert((await use(B, ISO1)) === 'ok', 'A2: the client presses cabinet one');
  await until(A, (id) => window.__course.state.isGateOpen(id), GATE_NECK, 15000, 'A2: the neck isolator opens');
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await until(P, ([g]) => window.__app.current.world.level.lights.lights.filter((x) => x.kind !== 'flashlight' && x.group === g).every((x) => !x.on), [NECK_GROUP], 15000, `A2: the ${tag} sees the neck dark`);
  const r1 = await restarts(A);
  await moveHost(CROSS[0], CROSS[1], 0.1, Math.PI / 2);
  // stays in the neck: the window ends (15 s) with a player in it
  await assertRetry('A2 station 4 timer', r1, 4, 'timer', MARK4);
  await until(A, () => /Lights came back with you in the neck/.test(window.__course.radioLine ?? ''), null, 15000, "A2: LANTERN's timer line on the host");
  await until(B, () => /Lights came back with you in the neck/.test(window.__course.wire.rl ?? ''), null, 15000, "A2: LANTERN's timer line reaches the client");
  assert((await neckLamps(A, true)) && !(await gateOpen(GATE_NECK)), 'A2: the neck is lit and the isolator closed after the retry');
  await until(A, (id) => window.__course.state.gateRearm(id) === 0, GATE_NECK, 10000, 'A2: the isolator is ready again');
  assert((await gateOpen(GATE_LATCH)) && !(await lockedOnClient(DOOR_SHUTTER)), 'A2: the roller door stays latched through the station 4 retry');

  // ---- 4. station 4: the drill, two crossings, one window each ----
  console.log('  A2 (re-plan): the neck, two crossings');
  const r2 = await restarts(A);
  assert((await use(B, ISO1)) === 'ok', 'A2: the client presses cabinet one again');
  await until(A, (id) => window.__course.state.isGateOpen(id), GATE_NECK, 15000, 'A2: the isolator opens (first crossing)');
  await moveHost(CROSS[0], CROSS[1], 0.1, Math.PI / 2);
  await waitSim(500);
  await moveHost(58, 12.5, 0.1, Math.PI / 2);
  // out of the neck before the window ends: the lights come back with nobody in it, no retry
  await until(A, (id) => !window.__course.state.isGateOpen(id), GATE_NECK, 30000, 'A2: the first window ends');
  await waitSim(600);
  assert((await restarts(A)) === r2, 'A2: the first crossing inside its window is no retry');
  await until(A, (id) => window.__course.state.gateRearm(id) === 0, GATE_NECK, 10000, 'A2: the isolator re-arms');
  // the second crossing: the host at cabinet two by the pit, the client crosses
  await moveHost(CAB2_FRONT[0], CAB2_FRONT[1], 0.1, -Math.PI / 2);
  await moveClient(MARK4[1][0], MARK4[1][1], 0.1, Math.PI / 2);
  assert((await use(A, ISO2)) === 'ok', 'A2: the host presses cabinet two by the pit');
  await until(A, (id) => window.__course.state.isGateOpen(id), GATE_NECK, 15000, 'A2: the isolator opens (second crossing)');
  await moveClient(CROSS[0], CROSS[1], 0.1, Math.PI / 2);
  await waitSim(500);
  await moveClient(58, 12.5, 0.1, Math.PI / 2);
  await until(A, (f) => window.__course.state.hasShared(f), FLAG_EAST, 10000, 'A2: both east of the neck set a2-east');
  await until(A, (id) => !window.__course.state.isGateOpen(id), GATE_NECK, 30000, 'A2: the second window ends');
  await waitSim(600);
  assert((await restarts(A)) === r2, 'A2: the second crossing inside its window is no retry either');
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await until(P, () => window.__course.station() === 5, null, 15000, `A2: the ${tag} has station 5 live`);

  // ---- 5. station 5: the walkway stand-in over the pit ----
  console.log('  A2 (re-plan): the pit and the walkway');
  await moveHost(MARK5[0][0], MARK5[0][1], 0.1, Math.PI / 2);
  await moveClient(MARK5[1][0], MARK5[1][1], 0.1, Math.PI / 2);
  await until(A, (id) => window.__course.state.isGateOpen(id), GATE_WALKWAY, 10000, 'A2: the walkway stand-in is open on the host as station 5 goes live');
  await until(B, (i) => !window.__course.wire.locks.includes(i), await doorIndex(DOOR_WALKWAY), 15000, 'A2: the walkway door is unlocked on the client');
  await openDoor(A, DOOR_WALKWAY, 'A2 walkway');
  await moveHost(WALKWAY_MID[0], WALKWAY_MID[1], 0.1, Math.PI / 2);
  await moveClient(WALKWAY_MID[0] - 0.8, WALKWAY_MID[1], 0.1, Math.PI / 2);
  await moveHost(LANDING[0], LANDING[1], 0.1, Math.PI / 2);
  await moveClient(LANDING[0], LANDING[1] + 0.5, 0.1, Math.PI / 2);
  await until(A, (f) => window.__course.state.hasShared(f), FLAG_ACROSS, 10000, 'A2: both on the far landing set a2-across');
  assert(await gateOpen(GATE_WALKWAY), 'A2: the walkway stays open');
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) {
    await until(P, () => window.__course.station() === 0, null, 15000, `A2: the ${tag} has no station left`);
    await sees(P, /holding room two/i, `A2: the ${tag} reads the closing line`);
  }
  assert(!(await lockedOnClient('L2-near')), 'A2: the L2 near door is open to the client');
  for (const P of [A, B]) await until(P, () => !window.__app.current.traversal.attached, null, 10000, 'A2: nobody is hanging');
  console.log(`  A2 (re-plan): done (${(await stepLine(A)).slice(0, 60)})`);
}
