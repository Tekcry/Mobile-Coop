// A2 the Carriage Shed: the set's e2e steps for e2e-ctcourse (part 1; set doc `docs/marlow-final/sets/a2CarriageShed.md` section 11).
// Two pages: A = the host (P1), B = the client (P2). The set is entered with the course at A2 (the even set: the lead is P2, so
// before any press the client reads the A lines); the client presses cabinet one and so takes A (the claim).
//   1. the start: both step lines, both cabinets and the cabin door exist, the neck and the vantage read lit and the same on both pages;
//   2. the restart check: the client presses cabinet one mid-run (the neck dark, the timer line on both pages, the shunter lured),
//      then the host's checkpoint restart: the neck lit again and the gate ready on both pages, the claim cleared, three fresh calm guards
//      (the shunter at his post, the two overwatch guards on the staging deck, high-security posts);
//   2b. spotted (walk482 X2): the client stands in the lit neck at (51, 12.5): a guard alerts, the set restarts (host `mode.restarts` + 1,
//      the "Spotted" line on both pages, the client back at the set start on both pages, three fresh calm guards again);
//   3. the taught route: the host opens the cabin door; the client at cabinet one, the host waiting in the west gap 2/3 (x 41, z 12.5, out of the
//      watchers' sight); with the shunter within 25 m the client presses cabinet one: the neck group dark on both pages, "Lights back in" on
//      both, the claim (client A), a host press on cabinet two does nothing (the timer is not reset), the crossing line (z 12.5) reads dark;
//   4. the crossing in the dark: the host crosses the neck along gap 2/3 to x 57 inside the window: `a2-neck` ticks on both pages and the
//      step lines swap to the way back; no set restart and no watcher alerted;
//   5. the light comes back on both pages when the window ends; a press during the re-arm is refused ("The isolator is re-arming") and the
//      lights stay on; once it re-arms the host presses cabinet two (the mirror): dark again on both pages, the calm shunter heads for it;
//   6. the client crosses the dark neck behind (gap 2/3 again): `a2-east` and `a2-back` tick on both pages, the closing line shows, restarts
//      still unchanged and the watchers calm, both go to L2's door.
// The takedown at cabinet one and the staging leg-up (Route 2) are not walked here: the lip, the boost search and the solo-jump check are the
// unit tests' (`tests/ctcourse/a2CarriageShed.test.ts`). Teleport legs are allowed on the open floor; a door the route opens is opened by
// `use(P, 'door-<anchor id>')` and asserted open on both pages before anyone is moved through it.
export const SET = 'a2CarriageShed';

const GATE = 'g-a2-neck';
const ISO1 = 'c-a2-iso-1';
const ISO2 = 'c-a2-iso-2';
const CAB1 = [30.6, 1.6];
const CAB2 = [69.4, 13.4];
const CABIN_DOOR = 'A2-cabin';
const NECK_GROUP = 21;
/** The neck's crossing line (gap 2/3, z 12.5, the taught crossing under the two watchers' lit view; the cess and the north walkway are closed) and its middle. */
const CROSS = [51, 12.5];
const MID = [51, 10];
/** The taught wait in the west gap 2/3 (B's spot while A isolates): the vans hide it from both watchers. */
const WAIT = [41, 12.5];
/** The overwatch guards' posts on the staging deck (y 4.4). */
const WATCH = [[48, 17.9], [54, 17.9]];
/** The lure reaches 25 m (`EnemyManager.lightsOut`): press with him inside 24.5. */
const LURE = 24.5;

/** @param {object} t the runner's helpers (scripts/e2e-ctcourse.mjs) @param {number} n the set's number */
export async function walk(t, n) {
  const { A, B, GA, GB, until, assert, waitSim, use, moveHost, moveClient, doorIndex, stepLine } = t;

  // ---- helpers local to the set ----
  const sees = (P, re, what) => until(P, ([src]) => new RegExp(src).test(document.querySelector('.course-hud .ch-step')?.textContent ?? ''), [re.source], 15000, what);
  const ticked = (P, id) => P.evaluate((id) => !!document.querySelector(`.course-hud tr[data-step="${id}"] td.done`), id);
  const lockedOnClient = async (cid) => GB((i) => window.__course.wire.locks.includes(i), await doorIndex(cid));
  /** A page's baked light level for a standing body at (x, z) (the same field the meter and the guards read). */
  const level = (P, x, z) => P.evaluate(([x, z]) => window.__app.current.world.lightField?.bodyLevel(x, 0, z, 1.7) ?? -1, [x, z]);
  /** (train 45 / 46 flake) Wait up to 6 s for (x, z) to read dark (<= 0.24) and the same on both pages. A guard's torch
   *  sweeping the spot on the host before the client mirrors it (or the field settling after the cut) reads high for a
   *  moment; on a miss the host's baked and dynamic levels and lit torches are in the message. */
  async function darkOnBoth(x, z, what, sameToo) {
    let ca = -1, cb = -1;
    for (let i = 0; i < 30; i++) {
      [ca, cb] = [await level(A, x, z), await level(B, x, z)];
      if (ca <= 0.24 && cb <= 0.24 && (!sameToo || Math.abs(ca - cb) < 0.02)) return;
      await new Promise((r) => setTimeout(r, 200));
    }
    const why = await GA(([x, z]) => { const f = window.__app.current.world.lightField; return { baked: f?.levelAt(x, 1.02, z), dynamic: f?.dynamicAt(x, 1.02, z), torches: window.__app.current.enemyMgr?.torchesOn }; }, [x, z]);
    // a lit guard torch on the host but not the client is the known parity gap (torch state is not on the wire; ROADMAP
    // Later: "Co-op client never draws guards' flashlights"): name it rather than a bare timeout
    const gap = why.torches > 0 && why.dynamic > 0 ? " - KNOWN PARITY GAP: a guard torch lights the host only (co-op client never draws guards' flashlights, ROADMAP Later)" : "";
    assert(false, `${what} (host ${ca.toFixed(3)}, client ${cb.toFixed(3)}; host ${JSON.stringify(why)})${gap}`);
  }
  /** Every lamp of the neck circuit is on, on this page's registry (the host's own, the client's from the course message). */
  const neckLit = (P) => P.evaluate((g) => { const l = window.__app.current.world.level.lights.lights.filter((x) => x.kind !== 'flashlight' && x.group === g); return l.length === 4 && l.every((x) => x.on); }, NECK_GROUP);
  const neckDark = (P) => P.evaluate((g) => { const l = window.__app.current.world.level.lights.lights.filter((x) => x.kind !== 'flashlight' && x.group === g); return l.length === 4 && l.every((x) => !x.on); }, NECK_GROUP);
  const gateOpen = () => GA((id) => window.__course.state.isGateOpen(id), GATE);
  const gateTimer = () => GA((id) => window.__course.state.gateTimer(id), GATE);
  const gateRearm = () => GA((id) => window.__course.state.gateRearm(id), GATE);
  const hasFlag = (f) => GA((f) => window.__course.state.hasFlag(f), f);
  const claimed = () => GA(() => window.__course.state.roleClaimed());
  const shunter = () => GA(() => { const e = window.__app.current.enemyMgr.enemies.find((x) => x.alive); return e ? { x: e.pos.x, z: e.pos.z, alerted: !!e.alerted, passive: !!e.passive } : null; });
  const noDamage = () => GA(() => { window.__app.current.target.damageMul = 0; });
  /** Every live guard on the host in squad order (the shunter first): where, calm or alerted, posted (`secure`), and the squad's shared caution. */
  const guards = () => GA(() => { const em = window.__app.current.enemyMgr; return { bodies: em.bodies.length, list: em.enemies.filter((q) => q.alive).map((e) => ({ x: e.pos.x, y: e.pos.y, z: e.pos.z, alerted: !!e.alerted, passive: !!e.passive, secure: !!e.secure, caution: em.cautionOf(e) })) }; });
  const restarts = () => GA(() => window.__app.current.mode.restarts);
  /** Three fresh calm guards: the shunter at his post, the two watchers posted on the staging deck, no body. */
  async function assertFreshGuards(what) {
    const gs = await guards();
    const [s, w1, w2] = gs.list;
    const calm = gs.list.every((e) => !e.alerted && !e.passive && e.caution === 0);
    assert(gs.list.length === 3 && gs.bodies === 0 && calm, `${what}: three fresh calm armed guards and no body (${JSON.stringify(gs)})`);
    assert(!s.secure && Math.hypot(s.x - 51, s.z - 10) < 2.5 && s.y < 1, `${what}: the shunter first, back at his post (${JSON.stringify(s)})`);
    for (const [e, [x, z]] of [[w1, WATCH[0]], [w2, WATCH[1]]]) assert(e.secure && e.y > 4 && Math.hypot(e.x - x, e.z - z) < 1.0, `${what}: a posted watcher on the staging deck at (${x}, ${z}) (${JSON.stringify(e)})`);
  }
  /** After a dark crossing: the set was not restarted (`restarts` as at `r0`) and no watcher is alerted. */
  async function assertNotSpotted(what, r0) {
    const [r, gs] = [await restarts(), await guards()];
    assert(r === r0 && gs.list.slice(1).every((e) => e.secure && !e.alerted), `${what}: the dark crossing was not seen (restarts ${r0} -> ${r}, ${JSON.stringify(gs.list.slice(1))})`);
  }
  /** Open the cabin door by hand on the host (as a player would) and see it open on both pages. */
  async function openCabinDoor(what) {
    const i = await doorIndex(CABIN_DOOR);
    const aid = await GA((cid) => window.__app.current.world.layout.course.doors[cid], CABIN_DOOR);
    const open = (P) => P.evaluate((i) => window.__app.current.world.doors.list[i].open > 0.5, i);
    if (!(await open(A))) {
      assert((await use(A, `door-${aid}`)) === 'ok', `${what}: the host opens the cabin door`);
      await until(A, (i) => window.__app.current.world.doors.list[i].open > 0.5, i, 8000, `${what}: the cabin door opens (host)`);
    }
    await until(B, (i) => window.__app.current.world.doors.list[i].open > 0.5, i, 15000, `${what}: the client sees the cabin door open`);
  }
  /** Wait for the shunter to be calm and within the lure range of cabinet one. */
  const waitForLure = (what) =>
    until(A, ([x, z, r]) => { const e = window.__app.current.enemyMgr.enemies.find((q) => q.alive); return !!e && !e.alerted && Math.hypot(e.pos.x - x, e.pos.z - z) < r; }, [CAB1[0], CAB1[1], LURE], 60000, `${what}: the shunter is calm and within ${LURE} m of cabinet one`);
  /** The client presses cabinet one: the neck goes dark on both pages with the timer line, the claim and the dark crossing. */
  async function cutFromClient(what) {
    const d0 = await shunter();
    assert((await use(B, ISO1)) === 'ok', `${what}: the client presses cabinet one`);
    await until(A, (id) => window.__course.state.isGateOpen(id), GATE, 15000, `${what}: the isolator opens on the host`);
    for (const [P, tag] of [[A, 'host'], [B, 'client']]) {
      await until(P, (g) => window.__app.current.world.level.lights.lights.filter((x) => x.kind !== 'flashlight' && x.group === g).every((x) => !x.on), NECK_GROUP, 15000, `${what}: the ${tag} sees the neck lamps off`);
      await sees(P, /Lights back in \d+ s/, `${what}: the ${tag} reads the timer line`);
    }
    await until(B, (g) => window.__course.wire.lights.groups.some(([q, on]) => q === g && !on), NECK_GROUP, 15000, `${what}: the client's course message has group ${NECK_GROUP} off`);
    assert(await claimed(), `${what}: the press claims the A job`);
    await sees(B, /Isolate the neck lights at cabinet one|Cross the neck behind the shunter|Isolate at cabinet two/, `${what}: the client reads an A or B line`);
    await darkOnBoth(CROSS[0], CROSS[1], `${what}: the crossing line reads dark and the same on both pages`, true);
    await darkOnBoth(MID[0], MID[1], `${what}: the neck's middle reads dark on both pages`, false);
    return d0;
  }

  // ---- 1. the start: the step lines, the devices, the light ----
  console.log('  A2: the siding, the step lines, the cabinets');
  await moveHost(30.5, 11, 0.1, Math.PI / 2);
  await moveClient(30.5, 12, 0.1, Math.PI / 2);
  assert(!(await lockedOnClient('L1-far')), 'A2: the L1 far door is open to the client');
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) {
    await until(P, () => /Cut the neck lights and cross/.test(document.querySelector('.course-hud')?.textContent ?? ''), null, 15000, `the ${tag} sees the shared step line`);
    for (const id of [ISO1, ISO2]) assert(await P.evaluate((id) => !!window.__app.current.interactables?.items.find((i) => i.id === id), id), `A2: the ${tag} has the push station ${id}`);
  }
  // the lead of the even set is P2: the client reads the A line until somebody claims it
  await sees(B, /Isolate the neck lights at cabinet one/, 'A2: the client (the lead) reads the A line');
  await sees(A, /Wait at the van ends/, 'A2: the host reads the B line');
  assert(!(await claimed()), 'A2: nobody has claimed a job yet');
  const g0 = await shunter();
  assert(!!g0 && !g0.passive, `A2: the shunter is alive and armed (${JSON.stringify(g0)})`);
  for (const [x, z, floor, what] of [[CROSS[0], CROSS[1], 0.55, 'the crossing line'], [MID[0], MID[1], 0.55, "the neck's middle"], [33.5, 12.5, 0.4, 'the vantage'], [41, 12.5, 0.4, 'the rake gap']]) {
    const [la, lb] = [await level(A, x, z), await level(B, x, z)];
    assert(la >= floor && Math.abs(la - lb) < 0.01, `A2: ${what} reads lit and the same on both pages (host ${la.toFixed(3)}, client ${lb.toFixed(3)})`);
  }
  assert((await neckLit(A)) && (await neckLit(B)), 'A2: the neck lamps are on at the start on both pages');

  // ---- 2. the restart check: a press, then the host's checkpoint restart ----
  console.log('  A2: the restart mid-cut');
  await moveClient(31.0, 6.4, 0.1, Math.PI);
  await moveHost(33, 7.5, 0.1, Math.PI / 2);
  await openCabinDoor('A2');
  await moveClient(30.6, 2.6, 0.1, Math.PI);
  await moveHost(WAIT[0], WAIT[1], 0.1, Math.PI / 2);
  await waitForLure('A2 restart check');
  const d0 = await cutFromClient('A2 restart check');
  await until(A, ([x, z, d0]) => { const e = window.__app.current.enemyMgr.enemies.find((q) => q.alive); return !!e && Math.hypot(e.pos.x - x, e.pos.z - z) < d0 - 3; }, [CAB1[0], CAB1[1], Math.hypot(d0.x - CAB1[0], d0.z - CAB1[1])], 20000, 'A2: the lured shunter walks toward cabinet one');
  assert(await GA(() => window.__course.restartCheckpoint()), 'A2: the host restarts at the checkpoint');
  const cp = await GA(() => { const p = window.__course.checkpointPos(); return [p.x, p.z]; });
  await until(B, ([x, z]) => { const p = window.__app.current.player.position; return Math.hypot(p.x - x, p.z - z) < 2.5; }, cp, 15000, 'A2: the restart brings the client back');
  await waitSim(2200);
  await noDamage();
  assert(!(await gateOpen()) && (await gateRearm()) === 0, 'A2: the restart leaves the isolator closed and ready');
  await until(A, (g) => window.__app.current.world.level.lights.lights.filter((x) => x.kind !== 'flashlight' && x.group === g).every((x) => x.on), NECK_GROUP, 10000, 'A2: the neck is lit again on the host');
  await until(B, (g) => window.__app.current.world.level.lights.lights.filter((x) => x.kind !== 'flashlight' && x.group === g).every((x) => x.on), NECK_GROUP, 15000, 'A2: the neck is lit again on the client');
  const [ra, rb] = [await level(A, CROSS[0], CROSS[1]), await level(B, CROSS[0], CROSS[1])];
  assert(ra >= 0.55 && Math.abs(ra - rb) < 0.02, `A2: the crossing reads lit again on both pages (host ${ra.toFixed(3)}, client ${rb.toFixed(3)})`);
  assert(!(await claimed()), 'A2: the restart clears the claim');
  await until(A, ([x, z]) => { const e = window.__app.current.enemyMgr.enemies.find((q) => q.alive); return !!e && Math.hypot(e.pos.x - x, e.pos.z - z) < 2.5; }, [51, 10], 10000, 'A2: the shunter is back at his post');
  // (S10, walk M2 / M3) a full reset: the cabin door the host opened is shut again on both pages (as at the set start), the shunter
  // fresh (calm, not cautious) and no body or old guard left
  const ci = await doorIndex(CABIN_DOOR);
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await until(P, (i) => window.__app.current.world.doors.list[i].open < 0.05, ci, 15000, `A2: the restart shuts the cabin door again (${tag})`);
  const doors = await GA(() => window.__course.lastDoors);
  assert(doors >= 1, `A2: the restart puts the doors back (${doors})`);
  await assertFreshGuards('A2 restart');

  // ---- 2b. spotted (walk482 X2): a guard sees the client standing in the lit neck: the set restarts, both back at the set start ----
  // (J14 S0) the re-plan yard drops A2's spotted rule (ctcourse.ts SPOT_FAIL, !replan): no spot restart to walk there
  if (t.replan) {
    assert(!(await GA(() => window.__course.state.currentBay.spotFail)), 'A2 (re-plan): the set has no spotted rule');
    console.log('  A2: spotted in the lit neck - skipped on the re-plan (no spotted rule)');
  } else {
  console.log('  A2: spotted in the lit neck');
  await noDamage();
  const spot0 = await restarts();
  await moveHost(WAIT[0], WAIT[1], 0.1, Math.PI / 2);
  await moveClient(CROSS[0], CROSS[1], 0.1, Math.PI);
  await until(A, (r0) => window.__app.current.mode.restarts === r0 + 1, spot0, 45000, 'A2: being spotted in the lit neck restarts the set (host restarts + 1)');
  assert((await restarts()) === spot0 + 1, 'A2: exactly one set restart for the spot');
  const cp2 = await GA(() => { const p = window.__course.checkpointPos(); return [p.x, p.z]; });
  await until(B, ([x, z]) => { const p = window.__app.current.player.position; return Math.hypot(p.x - x, p.z - z) < 2.5; }, cp2, 15000, 'A2: the spot sends the client back to the set start (client page)');
  await until(A, ([x, z]) => { const r = window.__app.current.net.remotes.values().next().value; return !!r && Math.hypot(r.feet.x - x, r.feet.z - z) < 3.5; }, cp2, 15000, 'A2: the spot sends the client back to the set start (host page)');
  await until(A, () => /Spotted/.test(window.__course.radioLine ?? ''), null, 15000, "A2: LANTERN's 'Spotted' line on the host");
  await until(B, () => /Spotted/.test(window.__course.wire.rl ?? ''), null, 15000, "A2: LANTERN's 'Spotted' line reaches the client");
  await waitSim(2200);
  await noDamage();
  await assertFreshGuards('A2 after the spot');
  assert((await restarts()) === spot0 + 1, 'A2: the fresh guards did not spot anyone again');
  }

  // ---- 3. the taught route: the press at cabinet one with the shunter near, the host crosses the dark neck ----
  console.log('  A2: cabinet one, the dark neck');
  await moveClient(31.0, 6.4, 0.1, Math.PI);
  await moveHost(33, 7.5, 0.1, Math.PI / 2);
  await openCabinDoor('A2 route');
  await moveClient(30.6, 2.6, 0.1, Math.PI);
  await moveHost(WAIT[0], WAIT[1], 0.1, Math.PI / 2);
  await waitForLure('A2 route');
  await cutFromClient('A2');
  // the client read the A line from the press on; the host (B) reads its line
  await sees(B, /Isolate the neck lights at cabinet one/, 'A2: the client has the A job (cabinet one)');
  await sees(A, /Wait at the van ends/, 'A2: the host has the B job');
  // a press at the other cabinet while the circuit is cut does nothing: the window keeps running (it is not reset)
  const r0 = await restarts();
  const t0 = await gateTimer();
  assert((await use(A, ISO2)) === 'ok', 'A2: the host tries cabinet two while the neck is dark');
  await waitSim(400);
  const t1 = await gateTimer();
  assert((await gateOpen()) && t1 <= t0 && t1 > 0, `A2: a press while dark does nothing (the window ${t0.toFixed(1)} -> ${t1.toFixed(1)} s)`);
  // the host crosses the dark neck along gap 2/3 (under the watchers, who cannot see in the dark), inside the window
  await moveHost(CROSS[0], CROSS[1], 0.1, Math.PI / 2);
  await waitSim(500);
  await moveHost(57, CROSS[1], 0.1, Math.PI / 2);
  await until(A, () => window.__course.state.hasFlag('a2-east1'), null, 10000, 'A2: the pass zone sets a2-east1');
  assert((await gateOpen()) && (await gateTimer()) > 0, `A2: the crossing was inside the window (${(await gateTimer()).toFixed(1)} s left)`);
  await assertNotSpotted('A2 host crossing', r0);
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await until(P, () => !!document.querySelector('.course-hud tr[data-step="a2-neck"] td.done'), null, 15000, `A2: the ${tag} sees the neck step ticked`);
  // the way back: the A job crosses behind, the B job isolates at cabinet two
  await sees(B, /Cross the neck behind the shunter while your partner isolates/, 'A2: the client (A) reads the way-back line');
  await sees(A, /Isolate at cabinet two so your partner can cross/, 'A2: the host (B) reads the way-back line');
  assert(!(await ticked(A, 'a2-back')), 'A2: the way back is not done yet');

  // ---- 4. the light comes back; a press in the re-arm is refused; the mirror cut ----
  console.log('  A2: lights back, the re-arm, cabinet two');
  await moveHost(68.8, 13.4, 0.1, -Math.PI / 2);
  await until(A, (id) => !window.__course.state.isGateOpen(id), GATE, 30000, 'A2: the window ends on the host');
  // a press inside the re-arm (3 s) is refused: tried at once in the page (so the 3 s are not spent on polling); a miss is cut again and retried
  let refusal = null;
  for (let k = 0; k < 3 && !refusal; k++) {
    const r = await GA(([id, item]) => {
      const st = window.__course.state;
      const left = st.gateRearm(id);
      if (left < 0.3) return { left, refusal: null };
      const it = window.__app.current.interactables.items.find((i) => i.id === item);
      it.onUse(it, 'local');
      return { left, refusal: window.__course.debug().refusal, open: st.isGateOpen(id) };
    }, [GATE, ISO2]);
    if (r.refusal) {
      assert(/re-arming/.test(r.refusal) && !r.open, `A2: a press while the isolator re-arms is refused (${JSON.stringify(r)})`);
      refusal = r;
      break;
    }
    // missed the re-arm: wait for ready, cut once more, wait for the end and try again
    await until(A, (id) => window.__course.state.gateRearm(id) === 0, GATE, 10000, 'A2: the isolator is ready again');
    assert((await use(A, ISO2)) === 'ok', 'A2: the host cuts again to retry the refusal');
    await until(A, (id) => !window.__course.state.isGateOpen(id), GATE, 30000, 'A2: the retry window ends');
  }
  assert(!!refusal, 'A2: a refusal was seen inside the re-arm');
  assert(!(await gateOpen()) && (await neckLit(A)), 'A2: the refused press left the lights on');
  // the light is back on both pages (the window ended), the timer line gone
  await until(B, (g) => window.__app.current.world.level.lights.lights.filter((x) => x.kind !== 'flashlight' && x.group === g).every((x) => x.on), NECK_GROUP, 15000, 'A2: the client sees the neck lamps back on');
  const [la, lb] = [await level(A, CROSS[0], CROSS[1]), await level(B, CROSS[0], CROSS[1])];
  assert(la >= 0.55 && Math.abs(la - lb) < 0.02, `A2: the crossing reads lit again on both pages (host ${la.toFixed(3)}, client ${lb.toFixed(3)})`);
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) assert(!/Lights back in/.test(await stepLine(P)), `A2: the ${tag}'s timer line is gone`);
  // ready again after the re-arm: the host cuts at cabinet two (the mirror pass); the shunter, calm, is lured toward it
  await until(A, (id) => window.__course.state.gateRearm(id) === 0 && !window.__course.state.isGateOpen(id), GATE, 10000, 'A2: the isolator re-arms (3 s)');
  const s0 = await shunter();
  const toCab2 = (s) => Math.hypot(s.x - CAB2[0], s.z - CAB2[1]);
  assert((await use(A, ISO2)) === 'ok', 'A2: the host presses cabinet two');
  await until(A, (id) => window.__course.state.isGateOpen(id), GATE, 10000, 'A2: the second cut opens the isolator');
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) {
    await until(P, (g) => window.__app.current.world.level.lights.lights.filter((x) => x.kind !== 'flashlight' && x.group === g).every((x) => !x.on), NECK_GROUP, 15000, `A2: the ${tag} sees the neck dark again`);
    await sees(P, /Lights back in \d+ s/, `A2: the ${tag} reads the timer line again`);
  }
  assert(await neckDark(A), 'A2: the neck is dark on the host for the mirror cut');
  const [da, db] = [await level(A, CROSS[0], CROSS[1]), await level(B, CROSS[0], CROSS[1])];
  assert(da <= 0.24 && db <= 0.24, `A2: the crossing reads dark on both pages for the mirror (${da.toFixed(3)}, ${db.toFixed(3)})`);
  // the first claim stands: the client is still A (the crosser)
  await sees(B, /Cross the neck behind the shunter while your partner isolates/, 'A2: the claim stands (the client crosses)');

  // ---- 5. the client crosses the dark neck: both east, the way back ticks, the closing line ----
  console.log('  A2: the mirror crossing, both east');
  await moveClient(CROSS[0], CROSS[1], 0.1, Math.PI / 2);
  await waitSim(500);
  await moveClient(57, CROSS[1], 0.1, Math.PI / 2);
  await until(A, () => window.__course.state.hasFlag('a2-east'), null, 10000, 'A2: the pass zone sets a2-east (both east of x 56)');
  assert(await gateOpen(), 'A2: the second crossing was inside the window');
  await assertNotSpotted('A2 client crossing', r0);
  // route 1b: cabinet two lures the calm shunter from anywhere on his loop (all within 25 m): he walks toward it
  // (S2 check) only when the 25 m lure reaches him from where he stood (still lured to cabinet one he may be ~36 m off)
  if (!s0.alerted && toCab2(s0) < 24.5) await until(A, ([x, z, d]) => { const e = window.__app.current.enemyMgr.enemies.find((q) => q.alive); return !!e && (Math.hypot(e.pos.x - x, e.pos.z - z) < d - 2 || Math.hypot(e.pos.x - x, e.pos.z - z) < 4); }, [CAB2[0], CAB2[1], toCab2(s0)], 15000, `A2: the shunter heads for cabinet two (from ${toCab2(s0).toFixed(1)} m)`);
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await until(P, () => !!document.querySelector('.course-hud tr[data-step="a2-back"] td.done'), null, 15000, `A2: the ${tag} sees the way back ticked`);
  await sees(A, /holding room two/, 'A2: the host reads the closing line');
  await sees(B, /holding room two/, 'A2: the client reads the closing line');
  assert((await hasFlag('a2-east1')) && (await hasFlag('a2-east')), 'A2: both pass flags are set');

  // ---- 6. to the L2 door (the runner then puts both on the pad) ----
  console.log('  A2: to the L2 door');
  await moveHost(67.6, 9.0, 0.1, Math.PI / 2);
  await moveClient(67.6, 11.0, 0.1, Math.PI / 2);
  assert(!(await lockedOnClient('L2-near')), 'A2: the L2 near door is open to the client');
  for (const P of [A, B]) await until(P, () => !window.__app.current.traversal.attached, null, 10000, 'A2: nobody is hanging');
}
