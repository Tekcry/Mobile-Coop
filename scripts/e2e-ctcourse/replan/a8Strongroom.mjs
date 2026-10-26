// J14 re-plan walk for A8 the Strongroom (e2e-ctcourse parts 5-8, map ctcourseReplan; slice G-A8, STATIONS.md sections 3, 5, 6, 8, 9).
// Two pages: A = the host (P1), B = the client (P2). Three guards (the night clerk, the hall patrol, the officer), every step `caught`
// (a guard holding combat for 2 s retries that step; suspicion, search and a short combat play out as on a mission). The walk:
//   1. the start: station 18 live on both pages, the three guards up, the vestibule lit (circuit 85) and the same on both pages;
//   2. a short sighting that breaks off: the officer in combat for 1 s, then down: no retry, station 18 still live;
//   3. station 18, a caught retry: the night clerk held in combat until the 2 s hold ends: `restarts` + 1, `lastRetry` = { st 18, cause 'caught' }
//      on both pages, both back on station 18's marks (the vestibule), LANTERN's line on both, the clerk calm at his post and the officer up
//      again (the guards that station reset), no earlier step undone;
//   4. station 18, the run: the client jams C2 from behind the counters (118, 67.2), the host crosses the gallery's last 9 m and opens the
//      office door, steps inside: `a8-office-in` set, station 19 live on both pages;
//   5. station 19, the console: the host takes the officer down and presses it: `a8-loop` set, the three cameras looped, station 20 live;
//   6. station 20, a board timer retry: both night guards down (nobody can be caught), the client presses the board and waits it out at
//      the jam spot: the dark ends with nobody through the grille: `lastRetry` = { st 20, cause 'timer' }, both back on station 20's marks,
//      LANTERN's timer line, the circuit lit again and the isolator closed;
//   7. station 20 then 21: once the console's loop has run out the client presses the board again, opens the grille and steps through:
//      `a8-grille-in` set, station 21 goes live from 20 with the loop already over and retries at once (`lastRetry` = { st 21, cause 'timer' },
//      both on station 21's marks); a retry with the loop off waits for the next press (no second retry);
//   8. station 21: the host presses the console again (a new 60 s), the client is on the inner side of the beams (teleport), both hack the
//      time locks inside the 1.5 s window: `a8-sync` set, station 0, the closing line, no further retry.
// Teleport legs are allowed on open floor (the unit test holds the geometry: tests/ctcourse/replan/a8Strongroom.test.ts); the doors, the
// jam, the console, the board and the hacks are the real controls. The guards stay awake until a step needs them down. Written for the
// laptop queue: pending its first PC run.
export const SET = 'a8Strongroom';

const N1 = 'a8-night1';
const N2 = 'a8-night2';
const OFFICER = 'a8-officer';
const CAMS = ['a8-cam1', 'a8-cam2', 'a8-cam3'];
const C2 = 'a8-cam2';
const SCAN = 'sc-a8';
const BOARD = 'c-a8-board';
const CONSOLE = 'c-a8-console';
const T1 = 'c-a8-t1';
const T2 = 'c-a8-t2';
const NIGHT_GATE = 'g-a8-night';
const CONSOLE_GATE = 'g-a8-console';
const LOOP_FLAG = 'a8-loop';
const NIGHT_GROUP = 81;
const VESTIBULE_GROUP = 85;
const DOORS = { office: 'A8-office', grille: 'A8-grille' };
/** Stations 18-21's marks (STATIONS section 3): A then B. */
const ST18 = [[107.5, 64.0, 0, Math.PI / 2], [107.5, 65.5, 0, Math.PI / 2]];
const ST19 = [[135.0, 76.5, 4.4, Math.PI / 2], [126.5, 76.5, 0, 0]];
const ST20 = [[137.5, 76.5, 4.4, Math.PI / 2], [126.5, 76.5, 0, 0]];
const ST21 = [[137.5, 76.5, 4.4, Math.PI / 2], [135.5, 66.5, 0, Math.PI / 2]];
/** The jam spot behind the main counter and C2's lens, the pier, the office door's approach and the spot inside it, the console's standing point. */
const JAM = [118.0, 67.2];
const C2_LENS = [133.75, 7.4, 73.0];
const PIER = [125.0, 76.4];
const OFFICE_DOOR_AT = [133.2, 76.6];
const INSIDE_OFFICE = [135.4, 76.6];
const AT_CONSOLE = [142.5, 74.7];
const BOARD_WEST = [126.4, 76.5];
const GRILLE_AT = [133.0, 62.0];
const INSIDE_GRILLE = [135.4, 62.0];
const SPOT1 = [137.0, 67.15];
const SPOT2 = [145.15, 59.6];
const LANDING = [142.0, 62.0];
const EAST = Math.PI / 2;

/** @param {object} t the runner's helpers (scripts/e2e-ctcourse.mjs) @param {number} n the set's number */
export async function walk(t, n) {
  const { A, B, GA, GB, until, assert, waitSim, use, moveHost, moveClient, doorIndex, dev, drawPistol, holster, aimAt, lt } = t;
  void n;

  // ---- helpers local to the set ----
  const sees = (P, re, what) => until(P, ([src]) => new RegExp(src).test(document.querySelector('.course-hud .ch-step')?.textContent ?? ''), [re.source], 15000, what);
  const seesTicked = (P, id, what) => until(P, (id) => !!document.querySelector(`.course-hud tr[data-step="${id}"] td.done`), id, 15000, what);
  /** Station `k` is live on page P (the host's state, the client's course wire). */
  const stationLive = (P, k, what) => (P === A ? until(A, (k) => window.__course.state.station() === k, k, 20000, what) : until(B, (k) => window.__course.wire?.s?.st === k, k, 20000, what));
  const restarts = (P) => P.evaluate(() => window.__course.restarts);
  const lastRetry = (P) => P.evaluate(() => window.__course.lastRetry);
  const hasFlag = (f) => GA((f) => window.__course.state.hasFlag(f), f);
  const gateOpen = (id) => GA((id) => window.__course.state.isGateOpen(id), id);
  const noDamage = () => GA(() => { window.__app.current.target.damageMul = 0; });
  const guard = (slot) => GA((s) => { const e = window.__course.squadOf(s); return e ? { alive: e.alive, alerted: !!e.alerted, x: e.pos.x, z: e.pos.z } : null; }, slot);
  const level = (P, x, y, z, h = 1.7) => P.evaluate(([x, y, z, h]) => window.__app.current.world.lightField?.bodyLevel(x, y, z, h) ?? -1, [x, y, z, h]);
  const lampsOn = (P, g, on) => P.evaluate(([g, on]) => { const l = window.__app.current.world.level.lights.lights.filter((x) => x.kind !== 'flashlight' && x.group === g); return l.length > 0 && l.every((x) => x.on === on); }, [g, on]);
  const camModes = (P) => P.evaluate((ids) => ids.map((id) => window.__ctdev.debug().cams.find((c) => c.id === id)?.mode ?? 'missing'), CAMS);
  const allCams = (P, mode) => until(P, ([ids, m]) => ids.every((id) => window.__ctdev.debug().cams.find((c) => c.id === id)?.mode === m), [CAMS, mode], 15000, `all three A8 cameras are ${mode}`);
  /** The guards `slots` down (a knock-out, as the built walk's). */
  const knockOut = (slots) =>
    GA((slots) => {
      const g = window.__app.current;
      const V = g.player.position.constructor;
      for (const s of slots) {
        const e = window.__course.squadOf(s);
        if (e && e.alive) e.knockOut({ amount: 100, point: e.pos.clone(), dir: new V(-1, 0, 0), part: 'body', kind: 'melee', attackerTeam: 'player', attackerId: 'local', sourcePos: g.player.position.clone(), impulse: 0, nonLethal: true });
      }
    }, slots);
  /** Open course door `cid` on page P (that player stands next to it) and see it open on both pages. */
  async function openDoor(P, cid, what) {
    const i = await doorIndex(cid);
    const aid = await GA((cid) => window.__app.current.world.layout.course.doors[cid], cid);
    if (!(await A.evaluate((i) => window.__app.current.world.doors.list[i].open > 0.5, i))) assert((await use(P, `door-${aid}`)) === 'ok', `${what}: opens ${cid}`);
    await until(A, (i) => window.__app.current.world.doors.list[i].open > 0.5, i, 10000, `${what}: ${cid} opens (host)`);
    await until(B, (i) => window.__app.current.world.doors.list[i].open > 0.5, i, 15000, `${what}: the client sees ${cid} open`);
  }
  /** `who` (0 the host, 1 the client) holds the jammer on camera C2 until it is blind and frozen on both pages. */
  async function jamC2(who, what) {
    const P = who === 0 ? A : B;
    await drawPistol(P);
    await lt(P, true);
    await aimAt(P, ...C2_LENS);
    await until(A, (w) => window.__ctdev.debug().jam[w] === 'a8-cam2', who, 25000, `${what}: the ${who === 0 ? 'host' : 'client'} jams C2`);
    for (const [Q, tag] of [[A, 'host'], [B, 'client']]) await until(Q, () => { const c = window.__ctdev.debug().cams.find((x) => x.id === 'a8-cam2'); return !!c && c.mode === 'off' && c.frozen; }, null, 20000, `${what}: the ${tag} page sees C2 blind and frozen`);
  }
  /** Keep guard `slot` in combat (`alert()` is a no-op while he is) until the host counts a retry or `ms` runs out. */
  async function holdCombat(slot, r0, ms) {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      if ((await restarts(A)) > r0) return;
      await GA((s) => { const e = window.__course.squadOf(s); if (e && e.alive) e.alert(); }, slot);
      await waitSim(150);
    }
  }
  /** A retry: the counter went up once on both pages, it names the station and cause, both are back on the marks, LANTERN's line (`re`) is out. */
  async function assertRetry(what, r0, st, cause, marks, re) {
    await until(A, ([r0]) => window.__course.restarts === r0 + 1, [r0], 60000, `${what}: the host counts the retry`);
    await until(B, ([r0]) => window.__course.restarts === r0 + 1, [r0], 15000, `${what}: the client counts the retry`);
    for (const [P, tag] of [[A, 'host'], [B, 'client']]) {
      const lr = await lastRetry(P);
      assert(!!lr && lr.st === st && lr.cause === cause, `${what}: the ${tag}'s last retry is station ${st} / ${cause} (${JSON.stringify(lr)})`);
      await stationLive(P, st, `${what}: the ${tag} still has station ${st} live`);
    }
    await until(A, ([m]) => {
      const f = window.__course.state.feet;
      const near = (x, z) => [0, 1].some((p) => Math.hypot(f[p * 3] - x, f[p * 3 + 2] - z) < 1.2);
      return m.every(([x, z]) => near(x, z));
    }, [marks], 20000, `${what}: the retry puts both players on station ${st}'s marks`);
    await until(A, ([src]) => new RegExp(src).test(window.__course.radioLine ?? ''), [re.source], 15000, `${what}: LANTERN's line on the host`);
    await until(B, ([src]) => new RegExp(src).test(window.__course.wire.rl ?? ''), [re.source], 15000, `${what}: LANTERN's line reaches the client`);
    await waitSim(1500);
    await noDamage();
  }

  // ---- 1. the start: station 18, three guards up, the vestibule lit ----
  console.log('  A8 (re-plan): the vestibule, station 18');
  await moveHost(ST18[0][0], ST18[0][1], 0.1, ST18[0][3]);
  await moveClient(ST18[1][0], ST18[1][1], 0.1, ST18[1][3]);
  await noDamage();
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) {
    await stationLive(P, 18, `A8: the ${tag} has station 18 live`);
    await sees(P, /Take the boost up to the gallery|Boost your partner up/, `A8: the ${tag} reads its split job line`);
    assert((await camModes(P)).every((m) => m === 'online'), `A8: the three cameras are online on the ${tag}`);
    assert(await lampsOn(P, VESTIBULE_GROUP, true) && await lampsOn(P, NIGHT_GROUP, true), `A8: the vestibule and the night circuits are lit on the ${tag}`);
  }
  for (const slot of [N1, N2, OFFICER]) {
    const g = await guard(slot);
    assert(!!g && g.alive && !g.alerted, `A8: ${slot} is up and calm (${JSON.stringify(g)})`);
  }
  assert((await GA(() => window.__app.current.enemyMgr.enemies.filter((e) => e.alive).length)) === 3, 'A8: three guards on the re-plan');
  const [lv1, lv2] = [await level(A, 107.6, 0, 64.5), await level(B, 107.6, 0, 64.5)];
  assert(lv1 >= 0.4 && Math.abs(lv1 - lv2) < 0.02, `A8: the vestibule reads lit and the same on both pages (host ${lv1.toFixed(3)}, client ${lv2.toFixed(3)})`);

  // ---- 2. a short sighting that breaks off: the officer in combat for 1 s, then down: no retry ----
  console.log('  A8 (re-plan): a sighting that breaks off');
  const r0 = await restarts(A);
  await GA((s) => window.__course.squadOf(s).alert(), OFFICER);
  await waitSim(1000);
  await knockOut([OFFICER]);
  await waitSim(3000);
  assert((await restarts(A)) === r0 && (await restarts(B)) === r0, `A8: a sighting shorter than the 2 s hold is no retry (${await restarts(A)} of ${r0})`);
  await stationLive(A, 18, 'A8: station 18 is still live after the short sighting');

  // ---- 3. station 18: caught, a retry in place (the guards that step reset, nothing earlier undone) ----
  console.log('  A8 (re-plan): caught in the banking hall, a station 18 retry');
  await holdCombat(N1, r0, 20000);
  await assertRetry('A8 station 18', r0, 18, 'caught', ST18, /Caught in the banking hall/);
  await until(A, ([slot]) => { const e = window.__course.squadOf(slot); return !!e && e.alive && !e.alerted && Math.hypot(e.pos.x - 128.5, e.pos.z - 71.6) < 2.5; }, [N1], 20000, 'A8: the night clerk is calm at his post after the retry');
  assert((await guard(OFFICER)).alive, 'A8: the officer is up again after the retry (his knock-out was this step\'s)');

  // ---- 4. station 18: C2 jammed from behind the counters, the host crosses and opens the office door ----
  console.log('  A8 (re-plan): the jam on C2, the gallery run');
  await moveClient(JAM[0], JAM[1], 0.1, Math.atan2(C2_LENS[0] - JAM[0], C2_LENS[2] - JAM[1]));
  await moveHost(PIER[0], PIER[1], 4.5, EAST);
  const alarm0 = (await dev(A)).alarm;
  await jamC2(1, 'A8');
  await moveHost(OFFICE_DOOR_AT[0], OFFICE_DOOR_AT[1], 4.5, EAST);
  await openDoor(A, DOORS.office, 'A8 office door');
  await moveHost(INSIDE_OFFICE[0], INSIDE_OFFICE[1], 4.5, EAST);
  assert((await dev(A)).alarm === alarm0, 'A8: no alarm stage after the hop under C2');
  await until(A, (f) => window.__course.state.hasShared(f), 'a8-office-in', 10000, 'A8: the office pass zone sets a8-office-in');
  for (const P of [A, B]) await stationLive(P, 19, 'A8: station 19 is live on both pages');
  await until(A, () => window.__ctdev.debug().jam[1] === '', null, 12000, "A8: the 5 s cap ends the client's held jam");
  await lt(B, false);
  await holster(B);

  // ---- 5. station 19: the officer down, the console loops the cameras ----
  console.log('  A8 (re-plan): the console, the loop');
  await moveClient(ST19[1][0], ST19[1][1], 0.1, ST19[1][3]);
  await moveHost(AT_CONSOLE[0], AT_CONSOLE[1], 4.5, EAST);
  await knockOut([OFFICER]);
  assert((await use(A, CONSOLE)) === 'ok', 'A8: the host presses the console');
  await until(A, ([f, g]) => window.__course.state.hasFlag(f) && window.__course.debug().gates[g], [LOOP_FLAG, CONSOLE_GATE], 8000, 'A8: the console sets the loop flag and opens its gate');
  await allCams(A, 'looped');
  await allCams(B, 'looped');
  for (const P of [A, B]) await stationLive(P, 20, 'A8: station 20 is live on both pages (the loop is set)');
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await seesTicked(P, 'a8-office', `A8: the ${tag} sees the office step ticked`);

  // ---- 6. station 20: a board timer retry (the dark runs out with nobody through the grille) ----
  console.log('  A8 (re-plan): the board, a station 20 timer retry');
  await knockOut([N1, N2]);
  await moveClient(BOARD_WEST[0], BOARD_WEST[1], 0.1, 0);
  const r1 = await restarts(A);
  assert((await use(B, BOARD)) === 'ok', 'A8: the client presses the lighting board');
  await until(A, (g) => window.__course.debug().gates[g], NIGHT_GATE, 8000, 'A8: the isolator opens (the circuit is cut)');
  await until(A, ([g, on]) => { const l = window.__app.current.world.level.lights.lights.filter((x) => x.kind !== 'flashlight' && x.group === g); return l.length > 0 && l.every((x) => x.on === on); }, [NIGHT_GROUP, false], 10000, 'A8: the night lamps go out');
  await moveClient(JAM[0], JAM[1], 0.1, EAST);
  await assertRetry('A8 station 20', r1, 20, 'timer', ST20, /The hall lights came back/);
  assert(!(await gateOpen(NIGHT_GATE)) && (await lampsOn(A, NIGHT_GROUP, true)) && (await lampsOn(B, NIGHT_GROUP, true)), 'A8: the isolator is closed and the hall lit again after the timer retry');
  assert(!(await hasFlag('a8-grille-in')) && (await hasFlag('a8-office-in')), 'A8: the retry undid no earlier step (the office is still done, nobody is through the grille)');

  // ---- 7. station 20 passed with the loop already over: 21 goes live and retries at once ----
  console.log('  A8 (re-plan): through the grille, station 21 with the loop over');
  await knockOut([N1, N2]);
  await until(A, (f) => !window.__course.state.hasFlag(f), LOOP_FLAG, 90000, "A8: the console's 60 s loop runs out");
  await moveClient(BOARD_WEST[0], BOARD_WEST[1], 0.1, 0);
  const r2 = await restarts(A);
  assert((await use(B, BOARD)) === 'ok', 'A8: the client presses the board again');
  await until(A, (g) => window.__course.debug().gates[g], NIGHT_GATE, 8000, 'A8: the isolator opens again');
  await until(B, (i) => !window.__course.wire.locks.includes(i), await doorIndex(DOORS.grille), 15000, 'A8: the client sees the grille unlocked');
  await moveClient(GRILLE_AT[0], GRILLE_AT[1], 0.1, EAST);
  await openDoor(B, DOORS.grille, 'A8 grille');
  await moveClient(INSIDE_GRILLE[0], INSIDE_GRILLE[1], 0.1, EAST);
  await assertRetry('A8 station 21 (loop over)', r2, 21, 'timer', ST21, /The cameras came back/);
  assert(await hasFlag('a8-grille-in'), 'A8: a8-grille-in stays set through the station 21 retry');
  await waitSim(4000);
  assert((await restarts(A)) === r2 + 1, `A8: with the loop off a station 21 retry waits for the next press (${await restarts(A)} of ${r2 + 1})`);

  // ---- 8. station 21: the console again, the client on the inner side, both hack the time locks inside the window ----
  console.log('  A8 (re-plan): the loop again, the paired hack');
  await moveHost(AT_CONSOLE[0], AT_CONSOLE[1], 4.5, EAST);
  assert((await use(A, CONSOLE)) === 'ok', 'A8: the host presses the console again');
  await until(A, (f) => window.__course.state.hasFlag(f), LOOP_FLAG, 8000, 'A8: the loop is set again');
  await moveClient(LANDING[0], LANDING[1], 0.1, EAST);
  await moveHost(SPOT1[0], SPOT1[1], 0.1, 0);
  await moveClient(SPOT2[0], SPOT2[1], 0.1, EAST);
  await until(A, (id) => window.__ctdev.debug().scans.find((s) => s.id === id)?.ready, SCAN, 8000, 'A8: both at their time locks light the ready lamps');
  assert((await use(A, T1)) === 'ok', 'A8: the host starts the hack at time lock one');
  await until(A, (id) => { const s = window.__ctdev.debug().scans.find((q) => q.id === id); return s.ph[0] === 'hacking' && s.t[0] >= 0.5; }, SCAN, 8000, 'A8: the host hack has run 0.5 s');
  assert((await use(B, T2)) === 'ok', 'A8: the client starts about 0.5 s after the host');
  await until(A, (f) => window.__course.state.hasFlag(f), 'a8-sync', 15000, 'A8: both hacks inside the window set a8-sync');
  await until(A, () => window.__course.state.station() === 0, null, 15000, 'A8: no station is live after the sync (host)');
  await until(B, () => window.__course.wire?.s?.st === 0, null, 15000, 'A8: no station is live after the sync (client)');
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) {
    await seesTicked(P, 'a8-sync', `A8: the ${tag} sees the sync step ticked`);
    await sees(P, /Both out to the cash dock/, `A8: the ${tag} reads the closing line`);
  }
  assert((await restarts(A)) === r2 + 1, 'A8: the whole station 21 run after its one retry counted no other');
}
