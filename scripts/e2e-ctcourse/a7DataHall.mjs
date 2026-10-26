// A7 the Data Hall: the set's e2e steps for e2e-ctcourse (part 4; set doc `docs/marlow-final/sets/a7DataHall.md` section 11).
// Two pages: A = the host (P1), B = the client (P2). The set is odd: the lead is P1, so before any claim the host reads the A
// (hall) line; the first player into the plant corridor takes B.
//   1. the start in the lobby: the step lines (host A, client B), both terminals, the technician armed, both cameras, the cage
//      doors and the L7 near door locked on both pages, T1's spot and the corridor lit and the same on both pages;
//   2. the claim swap: the host opens the plant door and steps into the corridor first: the host reads B, the client A, on
//      both pages; then the host's checkpoint restart clears the claim;
//   3. the split: the client opens the plant door (in reach) and steps in: the client is B on both pages;
//   4. the corridor in cam2's blind windows (the sweep read from `__ctdev.debug().cams`; teleport legs between the cooling
//      units' lees): no camera stage, no alarm; the pod door opened in the 220 deg window; the client into the pod: `a7-pod`
//      set, `a7-split` ticks on both pages, the hack lines show;
//   5. the hall: the host opens the hall door while the technician stands at R0 (his back to it), waits for him to leave R0 (route index
//      0 -> 1, read on the host) and to walk west behind row 1, then to T1's spot; both at their terminals light the ready
//      lamps on both pages (the glow colour changes);
//   6. the fail check: the client starts 2.0 s late (on its own frame that sees T1 ready): no flag, the client loses 10 HP
//      (never below 1), both terminals idle again; then the synced hack (the client starts 0.5 s after the host): `a7-sync`
//      set, both panels done on both pages, no HP cost;
//   7. the doors: both cage doors and the L7 near door unlock on both pages, `a7-sync` ticks, the closing line; the host
//      opens the west cage door, crosses the cage, opens the east door into the pod; both to the pod's east door (L7 near),
//      nobody hanging (the runner then puts both on the L7 pad).
// Unit cases (the cage closed but for the sync, the terminals' spacing and reach, the cameras and the jam lines) are in
// `tests/ctcourse/a7DataHall.test.ts`. A door the route opens is opened by `use(P, 'door-<anchor id>')` with that player next
// to it and asserted open on both pages before anyone is moved through it. Adapted from the old station 6 scanner steps (git
// 5920cce5, `station6`).
export const SET = 'a7DataHall';

const SCAN = 'sc-a7';
const T1 = 'c-a7-t1';
const T2 = 'c-a7-t2';
const SPOT1 = [85.35, 61.5];
/** (S-e2e-fix2) R0, the technician's stop at the cage front (A7_TECH_ROUTE[0], facing east). */
const A7_R0 = [84.4, 60.6];
const SPOT2 = [96.65, 61.5];
/** The cooling units' west lees (hidden from cam2 by their unit), the corridor's mid point, the lobby. */
const LEE1 = [83.7, 55.2];
const LEE2 = [91.75, 55.2];
const CORRIDOR = [80, 53.9];
const CAM2 = 'a7-cam2';
/** cam2's sweep (220-320 deg, 15 deg/s, 2 s pauses): one cycle (s). The pause at 220 starts each cycle. */
const CAM2_CYCLE = 4 + 2 * (100 / 15);
const DOORS = { hall: 'A7-hall', plant: 'A7-plant', pod: 'A7-pod-s', cageW: 'A7-cage-w', cageE: 'A7-cage-e', east: 'L7-near' };

/** @param {object} t the runner's helpers (scripts/e2e-ctcourse.mjs) @param {number} n the set's number */
export async function walk(t, n) {
  const { A, B, GA, GB, until, assert, waitSim, use, moveHost, moveClient, doorIndex, stepLine } = t;

  // ---- helpers local to the set ----
  const sees = (P, re, what) => until(P, ([src]) => new RegExp(src).test(document.querySelector('.course-hud .ch-step')?.textContent ?? ''), [re.source], 15000, what);
  const ticked = (P, id) => P.evaluate((id) => !!document.querySelector(`.course-hud tr[data-step="${id}"] td.done`), id);
  const lockedOnClient = async (cid) => GB((i) => window.__course.wire.locks.includes(i), await doorIndex(cid));
  const lockedOnHost = (cid) => GA((cid) => window.__course.state.locked(cid), cid);
  /** A page's baked light level for a standing body at (x, z) (the same field the meter and the guards read). */
  const level = (P, x, z) => P.evaluate(([x, z]) => window.__app.current.world.lightField?.bodyLevel(x, 0, z, 1.7) ?? -1, [x, z]);
  const hasFlag = (f) => GA((f) => window.__course.state.hasFlag(f), f);
  const claimed = () => GA(() => window.__course.state.roleClaimed());
  const roles = () => GA(() => [window.__course.state.roleOf(0), window.__course.state.roleOf(1)]);
  const tech = () => GA(() => { const e = window.__app.current.enemyMgr.enemies.find((x) => x.alive); return e ? { x: e.pos.x, z: e.pos.z, idx: e.walker?.idx ?? -1, alerted: !!e.alerted, passive: !!e.passive } : null; });
  /** (S-e2e-fix2) The live guard's brain and walk on the host (for a timeout): place, velocity, alert level, meter, the heard spot, the
   *  investigate spot, the A* route, the walker (index, wait), the nav cell and the players' feet. */
  const npcDiag = () =>
    GA(() => {
      const g = window.__app.current;
      const e = g.enemyMgr?.enemies.find((q) => q.alive);
      if (!e) return 'no live guard';
      const f = (n) => (typeof n === 'number' ? +n.toFixed(2) : n);
      const w = e.walker;
      return JSON.stringify({ t: f(g.time), pos: [f(e.pos.x), f(e.pos.z)], vel: [f(e.vel.x), f(e.vel.z)], lvl: e.aware?.level, st: e.state, meter: f(e.meter), al: !!e.alerted, pas: !!e.passive, taken: !!e.taken, link: !!e.link, stim: e.hasStimulus ? [f(e.stimulus[0]), f(e.stimulus[1])] : null, spot: [f(e.spot[0]), f(e.spot[1])], route: (e.routePath ?? []).slice(0, 4).map((p) => [f(p[0]), f(p[1])]), idx: w?.idx, wait: f(w?.waitT), look: f(w?.lookYaw), cell: e.navCell, walk: g.nav ? g.nav.isWalkable(e.navCell) : null, turn: f(e.turnT), n: g.enemyMgr.enemies.length, feet: g.playerRefs().map((r) => [f(r.feet.x), f(r.feet.z)]) });
    });
  /** (S-e2e-fix2) Wait on `wait` while the guard is sampled every 1.5 s; on a timeout the trace is printed with the error. */
  async function traced(what, wait) {
    const trace = [];
    let on = true;
    const sampler = (async () => {
      while (on) {
        trace.push(await npcDiag().catch((e) => String(e)));
        if (trace.length > 30) trace.shift();
        await new Promise((r) => setTimeout(r, 1500));
      }
    })();
    try {
      await wait;
    } catch (e) {
      on = false;
      await sampler;
      console.error(`${what}: guard trace (host)\n    ${trace.join('\n    ')}`);
      throw e;
    } finally {
      on = false;
    }
    await sampler;
  }
  const scan = (P) => P.evaluate((id) => window.__ctdev?.debug().scans.find((s) => s.id === id) ?? null, SCAN);
  /** The ready lamps' glow colours on this page (instanced colour of each panel's ready glow). */
  const readyGlow = (P) => P.evaluate((id) => { const sc = window.__ctdev?.scans.find((s) => s.def.id === id); return sc ? sc.ready.map((m) => { const c = m.instancedBuffers.color; return [c.r, c.g, c.b].map((v) => Math.round(v * 100) / 100).join(','); }) : null; }, SCAN);
  const cam2 = () => GA((id) => { const d = window.__ctdev.debug(); const c = d.cams.find((q) => q.id === id); return { yaw: c.yaw, clock: c.clock, frozen: c.frozen, stage: Math.max(0, ...c.stage), alarm: d.alarm }; }, CAM2);
  const hp = () => GB(() => window.__app.current.target.health.hp);
  const noDamage = () => GA(() => { window.__app.current.target.damageMul = 0; });
  /** Open course door `cid` on page P (that player stands next to it: a client's use is taken within reach) and see it open on both pages. */
  async function openDoor(P, cid, what) {
    const i = await doorIndex(cid);
    const aid = await GA((cid) => window.__app.current.world.layout.course.doors[cid], cid);
    if (!(await A.evaluate((i) => window.__app.current.world.doors.list[i].open > 0.5, i))) {
      assert((await use(P, `door-${aid}`)) === 'ok', `${what}: opens ${cid}`);
    }
    await until(A, (i) => window.__app.current.world.doors.list[i].open > 0.5, i, 10000, `${what}: ${cid} opens (host)`);
    await until(B, (i) => window.__app.current.world.doors.list[i].open > 0.5, i, 15000, `${what}: the client sees ${cid} open`);
  }
  /** Wait until cam2 looks away from the corridor's axis (west, 270 deg): its frame (70 deg) off the corridor. */
  const blindCorridor = (what) =>
    until(A, (id) => { const c = window.__ctdev.debug().cams.find((q) => q.id === id); const deg = ((c.yaw * 180) / Math.PI + 360) % 360; return !c.frozen && Math.abs(deg - 270) > 38; }, CAM2, 40000, `${what}: cam2 looks away from the corridor`);
  /** Wait for the start of cam2's pause at 220 deg (4.5 s before its frame comes back over the pod door). */
  const pauseAt220 = (what) =>
    until(A, ([id, cyc]) => { const c = window.__ctdev.debug().cams.find((q) => q.id === id); const u = ((c.clock % cyc) + cyc) % cyc; return !c.frozen && u < 0.4; }, [CAM2, CAM2_CYCLE], 40000, `${what}: cam2 at the start of its 220 deg pause`);

  // ---- 1. the start: the lobby, the step lines, the devices, the locks, the light ----
  console.log('  A7: the lobby, the step lines, the terminals, the locks');
  await moveHost(72.5, 61.4, 0.1, Math.PI / 2);
  await moveClient(72.5, 62.6, 0.1, Math.PI / 2);
  await noDamage();
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) {
    await until(P, () => /Split up: hall and plant corridor/.test(document.querySelector('.course-hud')?.textContent ?? ''), null, 15000, `A7: the ${tag} sees the shared step line`);
    for (const id of [T1, T2]) assert(await P.evaluate((id) => !!window.__app.current.interactables?.items.find((i) => i.id === id), id), `A7: the ${tag} has the terminal ${id}`);
    const sc = await scan(P);
    assert(!!sc && sc.flag === 'a7-sync' && sc.ph.every((p) => p === 'idle'), `A7: the ${tag} has the scanner pair sc-a7, idle (${JSON.stringify(sc)})`);
  }
  // the odd set's lead is the host: the A (hall) line until somebody claims
  await sees(A, /Slip past the technicians in the hall/, 'A7: the host (the lead) reads the A line');
  await sees(B, /Creep past the camera on the grating/, 'A7: the client reads the B line');
  assert(!(await claimed()), 'A7: nobody has claimed a path yet');
  const g0 = await tech();
  assert(!!g0 && !g0.passive && g0.idx >= 0, `A7: the technician is alive, armed and on his loop (${JSON.stringify(g0)})`);
  const cams = await GA(() => window.__ctdev.debug().cams.map((c) => c.id));
  assert(cams.includes('a7-cam1') && cams.includes(CAM2), `A7: both cameras are live (${JSON.stringify(cams)})`);
  for (const cid of [DOORS.cageW, DOORS.cageE, DOORS.east]) {
    assert(await lockedOnHost(cid), `A7: ${cid} starts locked on the host`);
    assert(await lockedOnClient(cid), `A7: ${cid} starts locked on the client`);
  }
  for (const cid of [DOORS.hall, DOORS.plant, DOORS.pod]) assert(!(await lockedOnClient(cid)), `A7: ${cid} is never locked`);
  for (const [x, z, floor, what] of [[SPOT1[0], SPOT1[1], 0.55, "T1's spot"], [CORRIDOR[0], CORRIDOR[1], 0.4, 'the corridor'], [73.5, 62, 0.4, 'the lobby']]) {
    const [la, lb] = [await level(A, x, z), await level(B, x, z)];
    assert(la >= floor && Math.abs(la - lb) < 0.01, `A7: ${what} reads lit and the same on both pages (host ${la.toFixed(3)}, client ${lb.toFixed(3)})`);
  }
  const alarm0 = (await cam2()).alarm;

  // ---- 2. the claim swap: the host into the corridor first is B on both pages; then the restart clears it ----
  console.log('  A7: the claim swap (the host takes the corridor), the restart');
  await moveHost(72.8, 56.5, 0.1, Math.PI);
  await openDoor(A, DOORS.plant, 'A7 claim swap');
  await moveHost(72.8, 54.0, 0.1, Math.PI / 2);
  await until(A, () => window.__course.state.roleClaimed() && window.__course.state.roleOf(0) === 'b', null, 10000, 'A7 claim swap: the host in the corridor first takes B');
  await sees(A, /Creep past the camera on the grating/, 'A7 claim swap: the host reads the B line');
  await sees(B, /Slip past the technicians in the hall/, 'A7 claim swap: the client reads the A line');
  assert(await GA(() => window.__course.restartCheckpoint()), 'A7: the host restarts at the checkpoint');
  const cp = await GA(() => { const p = window.__course.checkpointPos(); return [p.x, p.z]; });
  await until(B, ([x, z]) => { const p = window.__app.current.player.position; return Math.hypot(p.x - x, p.z - z) < 2.5; }, cp, 15000, 'A7: the restart brings the client back');
  await waitSim(2200);
  await noDamage();
  assert(!(await claimed()), 'A7: the restart clears the claim');
  await sees(A, /Slip past the technicians in the hall/, 'A7: after the restart the host (the lead) reads the A line again');
  for (const cid of [DOORS.cageW, DOORS.cageE, DOORS.east]) assert(await lockedOnClient(cid), `A7: ${cid} is still locked after the restart`);

  // ---- 3. the split: the client through the plant door takes B ----
  console.log('  A7: the split (the client takes the corridor)');
  await moveHost(75.3, 60.5, 0.1, Math.PI / 2);
  await moveClient(72.8, 56.5, 0.1, Math.PI);
  await openDoor(B, DOORS.plant, 'A7');
  await moveClient(72.8, 54.0, 0.1, Math.PI / 2);
  await until(A, () => window.__course.state.roleClaimed() && window.__course.state.roleOf(1) === 'b', null, 10000, 'A7: the client in the corridor takes B');
  const r = await roles();
  assert(r[0] === 'a' && r[1] === 'b', `A7: the host is A, the client B (${r})`);
  await sees(B, /Creep past the camera on the grating/, 'A7: the client reads the B line');
  await sees(A, /Slip past the technicians in the hall/, 'A7: the host reads the A line');

  // ---- 4. the corridor: lee to lee in cam2's blind windows, the pod door in the 220 window, into the pod ----
  console.log('  A7: the corridor in the blind windows, the pod');
  await moveClient(LEE1[0], LEE1[1], 0.1, Math.PI / 2);
  await blindCorridor('A7 grating');
  await moveClient(LEE2[0], LEE2[1], 0.1, Math.PI / 2);
  await pauseAt220('A7 pod door');
  await moveClient(97.0, 55.1, 0.1, Math.PI / 2);
  await openDoor(B, DOORS.pod, 'A7 pod door');
  await moveClient(98.0, 57.5, 0.1, 0);
  await until(A, () => window.__course.state.hasFlag('a7-pod'), null, 10000, 'A7: the pod pass zone sets a7-pod');
  await moveClient(SPOT2[0], SPOT2[1], 0.1, -Math.PI / 2);
  const c2 = await cam2();
  assert(c2.stage === 0 && c2.alarm === alarm0, `A7: cam2 never saw the client cross (${JSON.stringify(c2)})`);
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await until(P, () => !!document.querySelector('.course-hud tr[data-step="a7-split"] td.done'), null, 15000, `A7: the ${tag} sees the split ticked`);
  await sees(B, /Hack terminal two on your partner's count/, 'A7: the client (B) reads the hack line');
  await sees(A, /Hack terminal one on your partner's count/, 'A7: the host (A) reads the hack line');
  assert(!(await ticked(A, 'a7-sync')), 'A7: the hack is not done yet');

  // ---- 5. the hall: the hall door on his R0 leg, he leaves R0, west behind row 1; the host to T1; the ready lamps ----
  console.log('  A7: the hall, the technician, terminal one');
  const glow0 = [await readyGlow(A), await readyGlow(B)];
  // (S-e2e-fix2) the door opens while he stands AT R0 reading the rack screen (facing east, the door 8.4 m behind him), not
  // anywhere on the R0 leg: walking south from R4 the open door is inside his notice cone (DOOR_NOTICE_COS 0.2, 9 m) between
  // z 63.5 (row 2 stops hiding it) and 63.3, and a guard that notices a door a player opened comes to look (desktop trace:
  // noticed at (84.4, 62.9), investigated the door, back on his loop at R3 / R4, R0 not left in 30 s)
  await until(A, ([x, z]) => { const e = window.__app.current.enemyMgr.enemies.find((q) => q.alive); return !!e && !e.alerted && e.walker?.idx === 0 && Math.hypot(e.pos.x - x, e.pos.z - z) < 0.45 && e.aware.level !== 'investigating' && e.aware.level !== 'searching'; }, A7_R0, 60000, 'A7: the technician stands at R0 (index 0, facing the rack screen)');
  await openDoor(A, DOORS.hall, 'A7 hall door');
  await traced('A7 R0', until(A, () => { const e = window.__app.current.enemyMgr.enemies.find((x) => x.alive); return !!e && e.walker?.idx === 1; }, null, 30000, 'A7: the technician leaves R0 (index 0 -> 1)'));
  await traced('A7 row 1', until(A, () => { const e = window.__app.current.enemyMgr.enemies.find((x) => x.alive); return !!e && e.walker?.idx === 2 && e.pos.x < 83; }, null, 20000, 'A7: the technician walks west behind row 1'));
  // (S-e2e-fix2) the host shuts the door again before the technician reaches the west cross aisle, where row 1
  // stops hiding the doorway (from x 78.8 the open door is 4-5 m ahead of him)
  const hallAid = await GA((cid) => window.__app.current.world.layout.course.doors[cid], DOORS.hall);
  assert((await use(A, `door-${hallAid}`)) === 'ok', 'A7: the host shuts the hall door again');
  await until(A, (i) => window.__app.current.world.doors.list[i].target === 0, await doorIndex(DOORS.hall), 5000, 'A7: the hall door shuts (host)');
  await moveHost(SPOT1[0], SPOT1[1], 0.1, Math.PI / 2);
  await until(A, (id) => window.__ctdev.debug().scans.find((s) => s.id === id)?.ready, SCAN, 8000, 'A7: both at their terminals light the ready lamps (host)');
  await until(B, (id) => window.__ctdev.debug().scans.find((s) => s.id === id)?.occ === 3, SCAN, 8000, 'A7: the client page shows both at their terminals');
  const glow1 = [await readyGlow(A), await readyGlow(B)];
  assert(!!glow0[0] && !!glow0[1] && glow1[0].join() !== glow0[0].join() && glow1[1].join() !== glow0[1].join(), `A7: the ready lamps light on both pages (${JSON.stringify(glow0)} -> ${JSON.stringify(glow1)})`);

  // ---- 6. the fail check (the client 2 s late), then the synced hack ----
  console.log('  A7: a late hack fails, then the synced hack');
  const hp0 = await hp();
  assert(hp0 > 10, `A7: the client has health to lose (${hp0})`);
  assert((await use(A, T1)) === 'ok', 'A7: the host starts the hack at terminal one');
  await until(B, (id) => window.__ctdev.debug().scans.find((s) => s.id === id)?.ph[0] === 'hacking', SCAN, 8000, 'A7: the client page sees terminal one hacking');
  // the late press goes in on the client's own frame that first sees terminal one ready (about 2.0 s after the host's start)
  await GB(([id, item]) => {
    window.__a7 = { ready: false, use: '' };
    const f = () => {
      if (window.__ctdev?.debug().scans.find((s) => s.id === id)?.ph[0] === 'ready') {
        window.__a7.ready = true;
        const it = window.__app.current.interactables?.items.find((i) => i.id === item);
        window.__a7.use = !it ? 'missing' : !it.enabled ? 'disabled' : (it.onUse(it), 'ok');
      } else requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  }, [SCAN, T2]);
  await until(A, (id) => window.__ctdev.debug().scans.find((s) => s.id === id)?.ph[0] === 'ready', SCAN, 15000, 'A7: the host hack finishes (ready)');
  await until(B, () => window.__a7.ready, null, 8000, 'A7: the client page sees terminal one ready');
  assert((await GB(() => window.__a7.use)) === 'ok', 'A7: the client starts late');
  await until(B, (h) => window.__app.current.target.health.hp < h, hp0, 20000, 'A7: the late hack costs the client health');
  const hp1 = await hp();
  const d1 = await scan(A);
  assert(d1.fails >= 1 && !(await hasFlag('a7-sync')), `A7: out of sync, no flag (${d1.last})`);
  assert(hp1 >= 1 && hp0 - hp1 >= 9 && hp0 - hp1 <= 10, `A7: the failed hack cost ${hp0 - hp1} HP (${hp0} -> ${hp1}), never below 1`);
  assert(await lockedOnClient(DOORS.cageW), 'A7: the failed sync leaves the cage locked');
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await until(P, (id) => { const s = window.__ctdev.debug().scans.find((q) => q.id === id); return s.ph[0] === 'idle' && s.ph[1] === 'idle'; }, SCAN, 8000, `A7: both terminals ready again (${tag})`);
  // the synced hack: the client starts once the host's hack is 0.5 s in. (S-e2e-fix2) Timed on the host's clock: the client's
  // mirror of the pair carries the host's hack time only in the `course` message, sent on a phase change or every
  // COURSE_SEND (2 s), and does not run it on between them, so a client-frame trigger on t >= 0.5 fired at whatever time the
  // next message carried (1.6 s on the desktop, past the window). The start the host takes is read on its own step.
  const startKey = await t.onHostStep(A, (g, id) => { const s = window.__ctdev?.debug().scans.find((q) => q.id === id); return s && s.ph[1] === 'hacking' ? { at: s.t[0] } : null; }, SCAN);
  assert((await use(A, T1)) === 'ok', 'A7: the host starts the synced hack at terminal one');
  await until(A, (id) => { const s = window.__ctdev.debug().scans.find((q) => q.id === id); return !!s && s.ph[0] === 'hacking' && s.t[0] >= 0.5; }, SCAN, 10000, "A7: the host's hack is 0.5 s in");
  assert((await use(B, T2)) === 'ok', 'A7: the client starts on the count');
  const at = await t.hostStepResult(A, startKey, 8000, "A7: the host takes the client's hack start");
  assert(at.at >= 0.5 && at.at < 1.5, `A7: the client starts 0.5 s after the host, inside the window (${JSON.stringify(at)})`);
  await until(A, () => window.__course.state.hasFlag('a7-sync'), null, 15000, 'A7: both hacks inside the window set a7-sync');
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await until(P, (id) => { const s = window.__ctdev.debug().scans.find((q) => q.id === id); return s.ph[0] === 'done' && s.ph[1] === 'done'; }, SCAN, 8000, `A7: the ${tag} page sees both terminals done`);
  assert((await hp()) >= hp1, 'A7: the synced hack cost nothing');

  // ---- 7. the doors open on the sync; the host through the cage into the pod; both to the L7 door ----
  console.log('  A7: the cage opens, through the cage, to L7');
  for (const cid of [DOORS.cageW, DOORS.cageE, DOORS.east]) {
    await until(B, (i) => !window.__course.wire.locks.includes(i), await doorIndex(cid), 15000, `A7: the client sees ${cid} unlocked`);
    assert(!(await lockedOnHost(cid)), `A7: ${cid} is unlocked on the host`);
  }
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await until(P, () => !!document.querySelector('.course-hud tr[data-step="a7-sync"] td.done'), null, 15000, `A7: the ${tag} sees the hack ticked`);
  await sees(A, /holding room seven/, 'A7: the host reads the closing line');
  await sees(B, /holding room seven/, 'A7: the client reads the closing line');
  await moveHost(85.2, 63.3, 0.1, Math.PI / 2);
  await openDoor(A, DOORS.cageW, 'A7 cage');
  await moveHost(87.0, 64.5, 0.1, Math.PI / 2);
  await moveHost(95.2, 63.3, 0.1, Math.PI / 2);
  await openDoor(A, DOORS.cageE, 'A7 cage');
  await moveHost(97.2, 64.5, 0.1, Math.PI);
  await moveHost(99.0, 59.4, 0.1, Math.PI / 2);
  await moveClient(99.0, 60.6, 0.1, Math.PI / 2);
  assert(!(await lockedOnClient(DOORS.east)), 'A7: the L7 near door (the pod\'s east door) is open to the client');
  assert(!/Hack terminal/.test(await stepLine(A)), 'A7: the host is past the hack line');
  for (const P of [A, B]) await until(P, () => !window.__app.current.traversal.attached, null, 10000, 'A7: nobody is hanging');
}
