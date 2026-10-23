// A8 the Strongroom: the set's e2e steps for e2e-ctcourse (part 4; set doc `docs/marlow-final/sets/a8Strongroom.md` section 11). Two pages:
// A = the host (P1), B = the client (P2). A8 is an even set: the lead is P2, so before the claim the client reads the A (gallery) line; the first
// player onto the gallery takes A. Pass 1: the host is A (the client boosts it), the client B; pass 2 (after a checkpoint restart) the client takes
// the boost first and is A.
//   1. the start (both in L7 until put at the vestibule): the step lines (the client reads A), the five devices, the three guards (armed grunts),
//      the three cameras online, the grille / stair foot / vault locked and the office doors not, the front and the grille approach lit, the
//      vestibule, the leg-up mark and the jam spot dark, all the same on both pages;
//   2. the leg-up: the client crouches on the mark (109.5, 68.25) and offers, the host takes it and hangs on the return's open loading edge (normal
//      +x, 4.4 m), pulls up: `a8-gal1` set, `a8-split` ticks, the host is A on both pages;
//   3. the cross-level jam: the client at the jam spot (118, 67.2) holds the jammer on C2 (a camera over the gallery level): blind and frozen on
//      both pages; the host on the pier and at the office door in the window is not seen (no meter, no alarm change); the host opens the office door;
//   4. the console: refused with the officer up (and claims nothing), the host takes the officer, presses it: `a8-loop` set, the three cameras
//      'looped' on both pages, the timer line, `a8-office` ticks; a press while it loops does nothing;
//   5. the board: at N2's grille stop (route index 2, read on the host) the client presses the board: group 81 off on both pages (the lamps, the
//      front and the grille approach dark), the grille unlocked, a second press does nothing (the window never rises), the client goes to the lane
//      (132.25, 66.0) while N1 walks towards the board;
//   6. the grille: once N2 walks away from it (route index 4) the client opens it, steps in and closes it; the host (stair door, push bar on the
//      stair side, foot door) comes down: `a8-lobby` set, `a8-grille` ticks;
//   7. the throw: the host on the mark, the client on the runner's spot; the client lands within 0.5 m of (142, 62) over the beams: no beam
//      touched, no alarm stage, `a8-inner1`, `a8-beams` ticks;
//   8. the sync: both at their time locks; the host starts, the client starts 0.5 s on: `a8-sync`, `laser-a8` off and the vault door unlocked on both
//      pages, `a8-sync` ticks, the loop still running (the HUD seconds above 0); a late client fails (10 HP) first;
//   9. both through the vault door into the vault (the runner's finale then walks the dock's exit zone);
//  10. pass 2 (the checkpoint restart): the claim and the gates reset; the client takes the boost first and is A on both pages; the host (B) presses
//      the board (once N2 walks away from the grille), opens the grille, steps through and leaves it open: after the 25 s the group is lit again, the
//      gate locked, the door still open (the relock never shuts a door); it is closed by hand, shut and locked; the request-to-exit does nothing from
//      the hall side (a client press at (133.4, 57.0), over the host's reach) and opens the grille for good from the lobby side.
// Teleport legs are allowed (the open floor); a door the route opens is opened by `use(P, 'door-<anchor id>')` with that player next to it and
// asserted open on both pages before anyone is moved through it; a client's press is made within the item's reach (1.4 m) + 0.75 m. The guards
// stay awake (the lure, N2's stops and the officer's takedown need them); the host takes no damage (`damageMul` 0).
import { teamLog, watchTeam } from '../e2e-net-lib.mjs';

export const SET = 'a8Strongroom';

const N1 = 'a8-night1';
const N2 = 'a8-night2';
const OFFICER = 'a8-officer';
const CAMS = ['a8-cam1', 'a8-cam2', 'a8-cam3'];
const C2 = 'a8-cam2';
const SCAN = 'sc-a8';
const LASER = 'laser-a8';
const BOARD = 'c-a8-board';
const CONSOLE = 'c-a8-console';
const BAR = 'c-a8-stair-bar';
const RTE = 'c-a8-rte';
const T1 = 'c-a8-t1';
const T2 = 'c-a8-t2';
const NIGHT_GATE = 'g-a8-night';
const CONSOLE_GATE = 'g-a8-console';
const LOOP_FLAG = 'a8-loop';
const NIGHT_GROUP = 81;
const DOORS = { office: 'A8-office', top: 'A8-stair-top', foot: 'A8-stair-foot', grille: 'A8-grille', vault: 'A8-vault' };
/** The marks (feet): the leg-up mark and the booster's partner behind it (the lip is west, x 109), the jam spot and C2's lens, the pier, the
 *  office door's approach, the console's standing point, the board's west side, the grille approach, the lobby spots, the throw marks, the
 *  time-lock hack spots. */
const MARK = [109.5, 68.25];
const BEHIND = [110.3, 68.25];
const JAM = [118.0, 67.2];
const C2_LENS = [133.75, 7.4, 73.0];
const PIER = [125.0, 76.4];
const OFFICE_DOOR_AT = [133.2, 76.6];
const AT_CONSOLE = [142.5, 74.7];
const BOARD_WEST = [126.4, 76.5];
const GRILLE_AT = [133.0, 62.0];
const INSIDE = [135.4, 62.0];
const THROW = [138.8, 62];
const RUNNER = [137.8, 62];
const LANDING = [142.0, 62];
const SPOT1 = [137.0, 67.15];
const SPOT2 = [145.15, 59.6];
const BEAM_X = 140;
const EAST = Math.PI / 2;
const WEST = -Math.PI / 2;

/** @param {object} t the runner's helpers (scripts/e2e-ctcourse.mjs) @param {number} n the set's number */
export async function walk(t, n) {
  const { A, B, GA, GB, until, assert, waitSim, use, hostDebug, moveHost, moveClient, doorIndex, point, RB, holdUntil, padReady, crouch, pullUp, dev, drawPistol, holster, aimAt, lt } = t;

  // ---- helpers local to the set ----
  const sees = (P, re, what) => until(P, ([src]) => new RegExp(src).test(document.querySelector('.course-hud .ch-step')?.textContent ?? ''), [re.source], 15000, what);
  const seesTicked = (P, id, what) => until(P, (id) => !!document.querySelector(`.course-hud tr[data-step="${id}"] td.done`), id, 15000, what);
  const lockedOnClient = async (cid) => GB((i) => window.__course.wire.locks.includes(i), await doorIndex(cid));
  const lockedOnHost = (cid) => GA((cid) => window.__course.state.locked(cid), cid);
  const hasFlag = (f) => GA((f) => window.__course.state.hasFlag(f), f);
  const roleOf = (p) => GA((p) => window.__course.state.roleOf(p), p);
  const claimed = () => GA(() => window.__course.state.roleClaimed());
  const noDamage = () => GA(() => { window.__app.current.target.damageMul = 0; });
  /** A page's baked light level for a body of height h at (x, y, z) (the same field the meter and the guards read). */
  const level = (P, x, y, z, h = 1.7) => P.evaluate(([x, y, z, h]) => window.__app.current.world.lightField?.bodyLevel(x, y, z, h) ?? -1, [x, y, z, h]);
  /** The lamps of circuit g are all on / all off on page P's registry. */
  const lampsOn = (P, g, on) => P.evaluate(([g, on]) => { const l = window.__app.current.world.level.lights.lights.filter((x) => x.kind !== 'flashlight' && x.group === g); return l.length > 0 && l.every((x) => x.on === on); }, [g, on]);
  const guard = (slot) => GA((s) => { const e = window.__course.squadOf(s); return e ? { alive: e.alive, passive: !!e.passive, alerted: !!e.alerted, kind: e.def.kind, x: e.pos.x, z: e.pos.z, idx: e.walker?.idx ?? -1 } : null; }, slot);
  /** The three cameras' modes on page P by id (the set's cameras only). */
  const camModes = (P) => P.evaluate((ids) => ids.map((id) => window.__ctdev.debug().cams.find((c) => c.id === id)?.mode ?? 'missing'), CAMS);
  const allCams = (P, mode) => until(P, ([ids, m]) => ids.every((id) => window.__ctdev.debug().cams.find((c) => c.id === id)?.mode === m), [CAMS, mode], 15000, `all three A8 cameras are ${mode}`);
  const camOf = async (P, id) => (await dev(P)).cams.find((c) => c.id === id);
  const gateTimer = (id) => GA((id) => window.__course.state.gateTimer(id), id);
  const gateOpen = (id) => GA((id) => window.__course.state.isGateOpen(id), id);
  const doorOpen = (P, cid) => doorIndex(cid).then((i) => P.evaluate((i) => window.__app.current.world.doors.list[i].open, i));
  const doorAid = (cid) => GA((cid) => window.__app.current.world.layout.course.doors[cid], cid);
  /** Open course door `cid` on page P (that player stands next to it: a client's use is taken within reach) and see it open on both pages. */
  async function openDoor(P, cid, what) {
    const i = await doorIndex(cid);
    const aid = await doorAid(cid);
    if (!(await A.evaluate((i) => window.__app.current.world.doors.list[i].open > 0.5, i))) assert((await use(P, `door-${aid}`)) === 'ok', `${what}: opens ${cid}`);
    await until(A, (i) => window.__app.current.world.doors.list[i].open > 0.5, i, 10000, `${what}: ${cid} opens (host)`);
    await until(B, (i) => window.__app.current.world.doors.list[i].open > 0.5, i, 15000, `${what}: the client sees ${cid} open`);
  }
  /** Close an open door by hand (the door menu's use) and see it shut on both pages. */
  async function closeDoor(P, cid, what) {
    const i = await doorIndex(cid);
    const aid = await doorAid(cid);
    assert((await use(P, `door-${aid}`)) === 'ok', `${what}: closes ${cid}`);
    await until(A, (i) => window.__app.current.world.doors.list[i].open < 0.1, i, 10000, `${what}: ${cid} shuts (host)`);
    await until(B, (i) => window.__app.current.world.doors.list[i].open < 0.1, i, 15000, `${what}: the client sees ${cid} shut`);
  }
  const knockOut = (slots) =>
    GA((slots) => {
      const g = window.__app.current;
      const V = g.player.position.constructor;
      for (const s of slots) {
        const e = window.__course.squadOf(s);
        e.knockOut({ amount: 100, point: e.pos.clone(), dir: new V(-1, 0, 0), part: 'body', kind: 'melee', attackerTeam: 'player', attackerId: 'local', sourcePos: g.player.position.clone(), impulse: 0, nonLethal: true });
      }
    }, slots);
  /** The booster crouches on the mark facing the lip, the climber stands behind; the climber hangs on the open edge (normal +x, 4.4 m). */
  async function legUp(booster, climber, what) {
    const [cx, cz] = booster === B ? MARK : BEHIND;
    const [hx, hz] = booster === A ? MARK : BEHIND;
    await moveClient(cx, cz, 0.1, WEST);
    await moveHost(hx, hz, 0.1, WEST);
    await waitSim(500);
    await padReady(A);
    await padReady(B);
    await crouch(booster);
    await holdUntil(booster, RB, () => window.__app.current.team.state === 'offer', `${what}: the booster offers a leg-up`);
    await until(climber, () => !!window.__app.current.team.offer?.boost, null, 8000, `${what}: the climber is offered the leg-up`);
    const boosts0 = await climber.evaluate(() => window.__app.current.team.count.boosts);
    await holdUntil(climber, RB, (k) => window.__app.current.team.count.boosts > k, `${what}: the climber takes the leg-up`, boosts0);
    await until(climber, () => window.__app.current.traversal.attach.phase === 'on' && window.__app.current.traversal.attach.anchor?.kind === 'ledge', null, 12000, `${what}: the climber hangs on the ledge`);
    const a = await climber.evaluate(() => { const l = window.__app.current.traversal.attach.anchor; return { top: l.top, nx: l.nx }; });
    assert(a.top >= 4.3 && a.top <= 4.5 && a.nx > 0.9, `${what}: the climber hangs on the gallery's open edge, normal +x, 4.4 m (${JSON.stringify(a)})`);
    await until(booster, () => window.__app.current.team.state === 'none', null, 20000, `${what}: the booster is free again`);
    await pullUp(climber, `${what} climber`);
    const up = await climber.evaluate(() => window.__app.current.player.controller.pos.y);
    assert(up > 4.2, `${what}: the climber stands on the gallery (y ${up.toFixed(2)})`);
  }
  /** The holder on `H` (the jammer) holds the jammer on camera C2 until it is blind and frozen on both pages. */
  async function jamC2(who, what) {
    const P = who === 0 ? A : B;
    await drawPistol(P);
    await lt(P, true);
    await aimAt(P, ...C2_LENS);
    await until(A, (w) => window.__ctdev.debug().jam[w] === 'a8-cam2', who, 25000, `${what}: the ${who === 0 ? 'host' : 'client'} jams C2`);
    for (const [Q, tag] of [[A, 'host'], [B, 'client']]) await until(Q, () => { const c = window.__ctdev.debug().cams.find((x) => x.id === 'a8-cam2'); return !!c && c.mode === 'off' && c.frozen; }, null, 20000, `${what}: the ${tag} page sees C2 blind and frozen`);
  }
  /** The host on the mark offers the partner throw over the beams, the client runs in and is thrown onto the landing (A5's helper, facing east). */
  async function throwClient(what) {
    await moveHost(THROW[0], THROW[1], 0.1, EAST);
    await moveClient(RUNNER[0], RUNNER[1], 0.1, EAST);
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
    assert((await GA(() => window.__app.current.team.state)) === 'throwOffer', `${what}: the host still offers the throw at the press`);
    await holdUntil(B, RB, () => window.__app.current.team.count.throws >= 1, `${what}: the client is thrown`).catch(dump);
    let ownMax = 0;
    const t0 = Date.now();
    const s0 = await GB(() => window.__app.current.time);
    for (;;) {
      const [own, st] = await GB(() => { const g = window.__app.current; const c = g.player.controller; return [[c.pos.x, c.pos.y], g.team.state]; });
      if (Math.abs(own[0] - BEAM_X) < 0.3) ownMax = Math.max(ownMax, own[1]);
      if (st === 'none' && own[0] > BEAM_X + 1) break;
      if ((await GB(() => window.__app.current.time)) - s0 > 20 || Date.now() - t0 > 200000) throw new Error(`${what}: the throw did not land (${st}, ${own})`);
      await waitSim(30);
    }
    await until(B, () => window.__app.current.player.controller.grounded, null, 8000, `${what}: the client lands on its feet`);
    const land = await GB(() => { const c = window.__app.current.player.controller; return { x: c.pos.x, y: c.pos.y, z: c.pos.z }; });
    assert(Math.hypot(land.x - LANDING[0], land.z - LANDING[1]) <= 0.5 && Math.abs(land.y) < 0.3, `${what}: the client lands within 0.5 m of the landing (${JSON.stringify(land)})`);
    assert(ownMax > 1.45 || ownMax === 0, `${what}: the client's arc clears the top beam at the line (${ownMax.toFixed(2)})`);
    await waitSim(600);
    const d1 = await dev(A);
    assert(d1.hits === d0.hits && d1.alarm === d0.alarm, `${what}: the thrown client touched no beam (hits ${d0.hits} -> ${d1.hits}, alarm ${d0.alarm} -> ${d1.alarm})`);
    await until(A, () => window.__app.current.team.state === 'none', null, 8000, `${what}: the thrower is free again`);
  }

  // ---- 1. the start: the step lines, the devices, the guards, the cameras, the locks, the light ----
  console.log('  A8: the vestibule, the step lines, the guards, the cameras, the light');
  const entry = await point('A8-entry');
  assert(!!entry, 'A8: the map has A8-entry');
  await moveHost(entry[0], entry[2], 0.1, entry[3]);
  await moveClient(entry[0] + 0.1, entry[2] + 1.2, 0.1, entry[3]);
  await noDamage();
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) {
    await until(P, () => /Split up: one onto the gallery/.test(document.querySelector('.course-hud')?.textContent ?? ''), null, 15000, `A8: the ${tag} sees the shared step line`);
    for (const id of [BOARD, CONSOLE, BAR, T1, T2]) assert(await P.evaluate((id) => !!window.__app.current.interactables?.items.find((i) => i.id === id), id), `A8: the ${tag} has the device ${id}`);
    const sc = await P.evaluate((id) => window.__ctdev?.debug().scans.find((s) => s.id === id) ?? null, SCAN);
    assert(!!sc && sc.flag === 'a8-sync' && sc.ph.every((p) => p === 'idle'), `A8: the ${tag} has the scanner pair sc-a8, idle (${JSON.stringify(sc)})`);
    const lz = await P.evaluate((id) => window.__ctdev.debug().lasers.find((l) => l.id === id) ?? null, LASER);
    assert(!!lz && lz.on === true && lz.panel === 'panel-a8', `A8: the ${tag} has the beam curtain on, powered by panel-a8 (${JSON.stringify(lz)})`);
    assert((await camModes(P)).every((m) => m === 'online'), `A8: the three cameras are online on the ${tag} (${JSON.stringify(await camModes(P))})`);
    assert(await lampsOn(P, NIGHT_GROUP, true), `A8: the night circuit is lit on the ${tag}`);
  }
  // the lead of the even set is P2: the client reads the A (gallery) line until somebody claims
  await sees(B, /Take the boost to the gallery/, 'A8: the client (the lead) reads the A line');
  await sees(A, /Boost your partner up/, 'A8: the host reads the B line');
  assert(!(await claimed()), 'A8: nobody has claimed a job yet');
  for (const [slot, kind] of [[N1, 'grunt'], [N2, 'grunt'], [OFFICER, 'grunt']]) {
    const g = await guard(slot);
    assert(!!g && g.alive && !g.passive && g.kind === kind, `A8: ${slot} is up and armed (${JSON.stringify(g)})`);
  }
  for (const cid of [DOORS.grille, DOORS.foot, DOORS.vault]) {
    assert(await lockedOnClient(cid), `A8: ${cid} starts locked on the client`);
    assert(await lockedOnHost(cid), `A8: ${cid} starts locked on the host`);
  }
  for (const cid of [DOORS.office, DOORS.top]) assert(!(await lockedOnClient(cid)), `A8: ${cid} is never locked`);
  const gates0 = (await hostDebug()).gates;
  assert(gates0[NIGHT_GATE] === false && gates0[CONSOLE_GATE] === false, `A8: the board and the console start ready (${JSON.stringify(gates0)})`);
  // light, the same on both pages: the front and the grille approach lit; the vestibule, the leg-up mark and the jam spot dark (crouched)
  for (const [x, z, h, lit, what] of [[128, 66.5, 1.7, true, 'the front'], [GRILLE_AT[0], GRILLE_AT[1], 1.7, true, 'the grille approach'], [107.6, 64.5, 1.15, false, 'the vestibule'], [MARK[0], MARK[1], 1.15, false, 'the leg-up mark'], [JAM[0], JAM[1], 1.15, false, 'the jam spot']]) {
    const [la, lb] = [await level(A, x, 0, z, h), await level(B, x, 0, z, h)];
    assert(Math.abs(la - lb) < 0.02 && (lit ? la >= 0.55 : la <= 0.22), `A8: ${what} reads ${lit ? 'lit' : 'dark'} and the same on both pages (host ${la.toFixed(3)}, client ${lb.toFixed(3)})`);
  }

  // ---- 2. the leg-up: the client boosts the host onto the return's open edge (the host is A) ----
  console.log('  A8: the leg-up split');
  await legUp(B, A, 'A8');
  await until(A, (f) => window.__course.state.hasFlag(f), 'a8-gal1', 10000, 'A8: the gallery pass zone sets a8-gal1');
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await seesTicked(P, 'a8-split', `A8: the ${tag} sees the split step ticked`);
  assert((await claimed()) && (await roleOf(0)) === 'a' && (await roleOf(1)) === 'b', 'A8: the first player onto the gallery (the host) has claimed A, the client B');
  await sees(A, /Reach the office on your partner's jam/, 'A8: the host (A) reads the office line');
  await sees(B, /Jam the gallery camera from the floor/, 'A8: the client (B) reads the jam line');

  // ---- 3. the cross-level jam: C2 blind while the host crosses the gallery's last 9 m and opens the office door ----
  console.log('  A8: the cross-level jam on C2');
  await moveClient(JAM[0], JAM[1], 0.1, Math.atan2(C2_LENS[0] - JAM[0], C2_LENS[2] - JAM[1]));
  const alarm0 = (await dev(A)).alarm;
  await jamC2(1, 'A8');
  await moveHost(PIER[0], PIER[1], 4.5, EAST);
  await waitSim(500);
  const seen = await camOf(A, C2);
  assert(seen.meter.every((m) => m === 0) && seen.stage.every((s) => s === 0), `A8: blind C2 holds nothing on the host on the pier (meters ${JSON.stringify(seen.meter)})`);
  await moveHost(OFFICE_DOOR_AT[0], OFFICE_DOOR_AT[1], 4.5, EAST);
  await openDoor(A, DOORS.office, 'A8 office door');
  await moveHost(136.0, 76.6, 4.5, EAST);
  assert((await dev(A)).alarm === alarm0, 'A8: no alarm stage after the hop under C2');
  await until(A, () => window.__ctdev.debug().jam[1] === '', null, 12000, "A8: the 5 s cap ends the client's held jam");
  await lt(B, false);
  await holster(B);

  // ---- 4. the console: refused while the officer is up; he goes down, the host loops the cameras ----
  console.log('  A8: the console, the officer, the loop');
  await moveHost(AT_CONSOLE[0], AT_CONSOLE[1], 4.5, EAST);
  const lines = await GA(() => window.__course.squadOf('a8-officer').info?.lines?.length ?? 0);
  assert(lines === 2, `A8: the officer carries his two interrogation lines (${lines})`);
  assert((await use(A, CONSOLE)) === 'ok', 'A8: the host presses the console with the officer up');
  await until(A, () => /Take him out/.test(window.__course.debug().refusal ?? ''), null, 8000, 'A8: the console refuses while the officer is up');
  assert(!(await hasFlag(LOOP_FLAG)) && !(await gateOpen(CONSOLE_GATE)), 'A8: the refused press sets no flag and opens no gate');
  await knockOut([OFFICER]);
  assert(await GA(() => !window.__course.squadOf('a8-officer').alive), 'A8: the officer is down');
  // the press goes in as N2 leaves the talk for the grille (route index 0 -> 1): the board is then about 11 s off (the doc's step 7)
  await until(A, () => { const e = window.__course.squadOf('a8-night2'); return !!e && !e.alerted && e.walker?.idx === 1; }, null, 60000, 'A8: N2 leaves the talk (route index 0 -> 1)');
  assert((await use(A, CONSOLE)) === 'ok', 'A8: the host presses the console again');
  await until(A, ([f, g]) => window.__course.state.hasFlag(f) && window.__course.debug().gates[g], [LOOP_FLAG, CONSOLE_GATE], 8000, 'A8: the console sets the flag and opens its gate');
  await until(B, (f) => window.__course.wire.s.flags.includes(f), LOOP_FLAG, 8000, 'A8: the client has the flag');
  await allCams(A, 'looped');
  await allCams(B, 'looped');
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await sees(P, /Cameras back in \d+ s/, `A8: the ${tag} reads the loop timer line`);
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await seesTicked(P, 'a8-office', `A8: the ${tag} sees the office step ticked`);
  const timer0 = await gateTimer(CONSOLE_GATE);
  assert(timer0 > 0 && timer0 <= 60, `A8: the loop runs (${timer0.toFixed(1)} s left)`);

  // ---- 5. the board: at N2's grille stop the client presses it; the hall goes dark, the grille unlocks, N1 walks to the board ----
  console.log('  A8: the lighting board, the lure');
  // (S-e2e-fix3c) 60 s: N2's cycle is 39.5 s, and when the loop checks above outlast his 16 s to the grille and back off it, the next stop is a
  // full cycle away (40 s timed out at the edge)
  // (marlow-polish flake) the client waits in the dark at the jam spot (where step 3 left him) and goes to the board only once N2 is at the stop,
  // his back to the hall: waiting at the board's west side (<= 0.40 lit, standing) put the client dead ahead of N2's W2 -> TALK leg whenever that
  // full cycle came round (the loaded runs), so N2 looked, investigated, went alert and never reached the stop
  await until(A, ([gx, gz]) => { const e = window.__course.squadOf('a8-night2'); return !!e && !e.alerted && e.walker?.idx === 2 && Math.hypot(e.pos.x - gx, e.pos.z - gz) < 1.3; }, [133.2, 62.0], 60000, 'A8: N2 is at the grille stop (route index 2)').catch(async (err) => {
    const s = await GA(() => { const e = window.__course.squadOf('a8-night2'); return e && { idx: e.walker?.idx, level: e.level, alerted: e.alerted, x: +e.pos.x.toFixed(2), z: +e.pos.z.toFixed(2) }; });
    throw new Error(`${err.message} (N2 ${JSON.stringify(s)})`);
  });
  await moveClient(BOARD_WEST[0], BOARD_WEST[1], 0.1, 0);
  const n1a = await guard(N1);
  const board = await GA(() => { const d = window.__app.current.world.layout.course.devices['a8-board']; return [d.x, d.z]; });
  const d0 = Math.hypot(n1a.x - board[0], n1a.z - board[1]);
  assert((await use(B, BOARD)) === 'ok', 'A8: the client presses the lighting board');
  await until(A, (g) => window.__course.debug().gates[g], NIGHT_GATE, 8000, 'A8: the isolator opens (the circuit is cut)');
  // a second press at once, still at the board: the window keeps running (it must not rise back to 25 s)
  const left0 = await gateTimer(NIGHT_GATE);
  assert((await use(B, BOARD)) === 'ok', 'A8: the client presses the lighting board a second time');
  await waitSim(500);
  const left1 = await gateTimer(NIGHT_GATE);
  assert(left1 > 10 && left1 <= left0 + 0.05, `A8: a second press does nothing (the window ${left0.toFixed(1)} s -> ${left1.toFixed(1)} s, it never rises)`);
  // off the board at once, back to the jam spot behind the main counter (dark, `a8-west`): the client is not left at the board while N1 walks
  // at it, and not put at the grille while N2 stands there (he waits 5 s facing the gate). (S-e2e-fix3c) Not the lane at (132.25, 66): N2 saw
  // the lamps go out and turns to look at the board (the light incident's look), straight over that lane 3.4 m away while the circuit fades
  await moveClient(JAM[0], JAM[1], 0.1, EAST);
  // (S-e2e-fix3) the host's registry, not `stealth.switchOn`: that reads the wall switches, and circuit 81 has none (the board is its only
  // control: an isolator, `CourseMode.isolatorEdge` -> `StealthSystems.isolate`), so `switchOn(81)` is true whatever the lamps do
  await until(A, ([g, on]) => { const l = window.__app.current.world.level.lights.lights.filter((x) => x.kind !== 'flashlight' && x.group === g); return l.length > 0 && l.every((x) => x.on === on); }, [NIGHT_GROUP, false], 10000, 'A8: the night circuit is off on the host');
  await until(B, (g) => window.__course.wire.lights.groups.some(([k, on]) => k === g && !on), NIGHT_GROUP, 15000, "A8: the client's course message has group 81 off");
  assert((await lampsOn(A, NIGHT_GROUP, false)) && (await lampsOn(B, NIGHT_GROUP, false)), 'A8: the seven night lamps are off on both pages');
  for (const [x, z, what] of [[128, 66.5, 'the front'], [GRILLE_AT[0], GRILLE_AT[1], 'the grille approach']]) {
    const [la, lb] = [await level(A, x, 0, z), await level(B, x, 0, z)];
    assert(la <= 0.24 && lb <= 0.24 && Math.abs(la - lb) < 0.02, `A8: ${what} reads dark and the same on both pages with the circuit cut (host ${la.toFixed(3)}, client ${lb.toFixed(3)})`);
  }
  await until(A, (cid) => !window.__course.state.locked(cid), DOORS.grille, 5000, 'A8: the grille is unlocked on the host (the mains gate reads the circuit)');
  await until(B, (i) => !window.__course.wire.locks.includes(i), await doorIndex(DOORS.grille), 15000, 'A8: the client sees the grille unlocked');
  await until(A, ([bx, bz, d0]) => { const e = window.__course.squadOf('a8-night1'); if (!e || !e.alive) return false; const d = Math.hypot(e.pos.x - bx, e.pos.z - bz); return d < 1.8 || d < d0 - 1.2; }, [board[0], board[1], d0], 30000, 'A8: N1 walks towards the board');
  // N2 leaves the grille: his target is the south-east point, then W2 (route index 4: the SE -> W2 leg with his back to the gate), about 10 s after the press
  await until(A, () => { const e = window.__course.squadOf('a8-night2'); return !!e && !e.alerted && e.walker?.idx === 4; }, null, 30000, 'A8: N2 walks away from the grille (route index 4)');

  // ---- 6. the grille and the office stair: the client slips through and shuts it; the host comes down ----
  console.log('  A8: through the grille, down the office stair');
  await moveClient(GRILLE_AT[0], GRILLE_AT[1], 0.1, EAST);
  await openDoor(B, DOORS.grille, 'A8 grille');
  await moveClient(INSIDE[0], INSIDE[1], 0.1, EAST);
  await closeDoor(B, DOORS.grille, 'A8 grille');
  await moveHost(143.2, 72.4, 4.5, Math.PI);
  await openDoor(A, DOORS.top, 'A8 stair top door');
  await moveHost(143.2, 70.5, 4.5, Math.PI);
  assert(await lockedOnClient(DOORS.foot), 'A8: the foot door is locked until the push bar');
  await moveHost(135.5, 70.6, 0.5, EAST);
  assert((await use(A, BAR)) === 'ok', 'A8: the host pushes the bar on the stair side');
  await until(B, (i) => !window.__course.wire.locks.includes(i), await doorIndex(DOORS.foot), 15000, 'A8: the client sees the foot door unlocked');
  await moveHost(134.8, 68.8, 0.1, Math.PI);
  await openDoor(A, DOORS.foot, 'A8 stair foot door');
  await moveHost(135.3, 65.6, 0.1, EAST);
  await until(A, (f) => window.__course.state.hasFlag(f), 'a8-lobby', 10000, 'A8: both in the vault lobby set a8-lobby');
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await seesTicked(P, 'a8-grille', `A8: the ${tag} sees the grille step ticked`);
  assert((await gateTimer(CONSOLE_GATE)) > 0, 'A8: the loop is still running');

  // ---- 7. the throw over the beams ----
  console.log('  A8: the partner throw');
  await sees(A, /Throw your partner over the beams/, 'A8: the host (A) reads the throw line');
  await sees(B, /Land by the vault door and take time lock two/, 'A8: the client (B) reads the landing line');
  await throwClient('A8');
  await until(A, (f) => window.__course.state.hasFlag(f), 'a8-inner1', 10000, 'A8: the landing sets a8-inner1');
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await seesTicked(P, 'a8-beams', `A8: the ${tag} sees the beams step ticked`);
  assert((await GA((id) => window.__ctdev.debug().lasers.find((l) => l.id === id).on, LASER)) === true, 'A8: the beams are still on: the thrower is stranded');

  // ---- 8. the sync: a late hack fails, then both inside 1.5 s ----
  console.log('  A8: the paired hack');
  await moveHost(SPOT1[0], SPOT1[1], 0.1, 0);
  await moveClient(SPOT2[0], SPOT2[1], 0.1, EAST);
  await until(A, (id) => window.__ctdev.debug().scans.find((s) => s.id === id)?.ready, SCAN, 8000, 'A8: both at their time locks light the ready lamps (host)');
  await until(B, (id) => window.__ctdev.debug().scans.find((s) => s.id === id)?.occ === 3, SCAN, 8000, 'A8: the client page shows both at their time locks');
  await sees(A, /Hack time lock one on your partner's count/, 'A8: the host (A) reads the hack line');
  await sees(B, /Hack time lock two on your partner's count/, 'A8: the client (B) reads the hack line');
  const hp = () => GB(() => window.__app.current.target.health.hp);
  const hp0 = await hp();
  assert(hp0 > 10, `A8: the client has health to lose (${hp0})`);
  assert((await use(A, T1)) === 'ok', 'A8: the host starts the hack at time lock one');
  await until(B, (id) => window.__ctdev.debug().scans.find((s) => s.id === id)?.ph[0] === 'hacking', SCAN, 8000, 'A8: the client page sees time lock one hacking');
  await GB(([id, item]) => {
    window.__a8 = { ready: false, use: '' };
    const f = () => {
      if (window.__ctdev?.debug().scans.find((s) => s.id === id)?.ph[0] === 'ready') {
        window.__a8.ready = true;
        const it = window.__app.current.interactables?.items.find((i) => i.id === item);
        window.__a8.use = !it ? 'missing' : !it.enabled ? 'disabled' : (it.onUse(it), 'ok');
      } else requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  }, [SCAN, T2]);
  await until(A, (id) => window.__ctdev.debug().scans.find((s) => s.id === id)?.ph[0] === 'ready', SCAN, 15000, 'A8: the host hack finishes (ready)');
  await until(B, () => window.__a8.ready, null, 8000, 'A8: the client page sees time lock one ready');
  assert((await GB(() => window.__a8.use)) === 'ok', 'A8: the client starts late');
  await until(B, (h) => window.__app.current.target.health.hp < h, hp0, 20000, 'A8: the late hack costs the client health');
  const hp1 = await hp();
  const sc1 = await dev(A);
  assert(!(await hasFlag('a8-sync')) && hp1 >= 1 && hp0 - hp1 >= 9 && hp0 - hp1 <= 10, `A8: out of sync: no flag, the client lost ${hp0 - hp1} HP (${hp0} -> ${hp1})`);
  assert(sc1.scans.find((s) => s.id === SCAN).fails >= 1, 'A8: the failed sync is counted');
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await until(P, (id) => { const s = window.__ctdev.debug().scans.find((q) => q.id === id); return s.ph[0] === 'idle' && s.ph[1] === 'idle'; }, SCAN, 8000, `A8: both time locks are ready again (${tag})`);
  assert((await gateTimer(CONSOLE_GATE)) > 0, 'A8: the loop is still running at the second try');
  // (S-e2e-fix3c) the count on the host's clock: the client page mirrors the host's hack 1.4-1.7 s late (course snapshots), so a start
  // timed from the client's mirror lands at the window's edge; the client presses once the host's hack has run 0.5 s, and the gap is read
  // on the host (where the window is judged)
  assert((await use(A, T1)) === 'ok', 'A8: the host starts the synced hack at time lock one');
  await until(A, (id) => { const s = window.__ctdev.debug().scans.find((q) => q.id === id); return s.ph[0] === 'hacking' && s.t[0] >= 0.5; }, SCAN, 8000, 'A8: the host hack has run 0.5 s');
  const use2 = await use(B, T2);
  await until(A, (id) => window.__ctdev.debug().scans.find((q) => q.id === id).ph[1] !== 'idle', SCAN, 8000, 'A8: the host sees the client start time lock two');
  const gap = await GA((id) => { const s = window.__ctdev.debug().scans.find((q) => q.id === id); return s.t[0] - s.t[1]; }, SCAN);
  assert(use2 === 'ok' && gap >= 0.3 && gap < 1.5, `A8: the client starts about 0.5 s after the host, inside the window (${use2}, gap ${gap.toFixed(2)} s on the host)`);
  await until(A, () => window.__course.state.hasFlag('a8-sync'), null, 15000, 'A8: both hacks inside the window set a8-sync');
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await until(P, (id) => { const s = window.__ctdev.debug().scans.find((q) => q.id === id); return s.ph[0] === 'done' && s.ph[1] === 'done'; }, SCAN, 8000, `A8: the ${tag} page sees both time locks done`);
  assert((await hp()) >= hp1, 'A8: the synced hack cost nothing');
  await beamsOff();
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await seesTicked(P, 'a8-sync', `A8: the ${tag} sees the sync step ticked`);
  assert(!(await lockedOnHost(DOORS.vault)), 'A8: the vault door is unlocked on the host');
  await until(B, (i) => !window.__course.wire.locks.includes(i), await doorIndex(DOORS.vault), 15000, 'A8: the client sees the vault door unlocked');
  assert((await gateTimer(CONSOLE_GATE)) > 0, 'A8: the loop is still running after the sync');
  async function beamsOff() {
    await until(A, (id) => window.__ctdev.debug().lasers.find((l) => l.id === id)?.on === false, LASER, 10000, 'A8: the beams drop with the time lock (host)');
    await until(B, (id) => window.__ctdev.debug().lasers.find((l) => l.id === id)?.on === false, LASER, 15000, 'A8: the beams drop with the time lock (client)');
  }

  // ---- 9. through the vault ----
  console.log('  A8: the vault');
  await moveHost(145.0, 62.0, 0.1, EAST);
  await openDoor(A, DOORS.vault, 'A8 vault door');
  await sees(A, /The vault is open/, 'A8: the host reads the closing line');
  await sees(B, /The vault is open/, 'A8: the client reads the closing line');
  await moveHost(147.5, 61.6, 0.1, EAST);
  await moveClient(148.5, 62.4, 0.1, EAST);
  for (const P of [A, B]) await until(P, () => !window.__app.current.traversal.attached, null, 10000, 'A8: nobody is hanging');

  // ---- 10. pass 2: the checkpoint restart; the client takes the boost first; the grille relocks with the host inside ----
  console.log('  A8: pass 2, the restart, the claim swap, the relock');
  assert(await GA(() => window.__course.restartCheckpoint()), 'A8: the host restarts at the checkpoint');
  const cp = await GA(() => { const p = window.__course.checkpointPos(); return [p.x, p.z]; });
  await until(B, ([x, z]) => { const p = window.__app.current.player.position; return Math.hypot(p.x - x, p.z - z) < 2.5; }, cp, 15000, 'A8: the restart brings the client back');
  await waitSim(2200);
  await noDamage();
  assert(!(await claimed()) && !(await hasFlag('a8-sync')) && !(await hasFlag(LOOP_FLAG)), 'A8: the restart clears the claim and the flags');
  await allCams(A, 'online');
  await allCams(B, 'online');
  for (const cid of [DOORS.grille, DOORS.foot, DOORS.vault]) assert(await lockedOnClient(cid), `A8: ${cid} is locked again after the restart`);
  assert(await lampsOn(A, NIGHT_GROUP, true) && await lampsOn(B, NIGHT_GROUP, true), 'A8: the restart puts the night circuit back on');
  assert((await GA((id) => window.__ctdev.debug().lasers.find((l) => l.id === id).on, LASER)) === true, 'A8: the restart turns the beams back on');
  await sees(B, /Take the boost to the gallery/, 'A8: after the restart the client (the lead) reads the A line again');
  // the host boosts the client: the client is the first on the gallery and takes A
  await legUp(A, B, 'A8 pass 2');
  await until(A, () => window.__course.state.roleClaimed(), null, 10000, 'A8 pass 2: the client on the gallery claims a job');
  assert((await roleOf(1)) === 'a' && (await roleOf(0)) === 'b', 'A8 pass 2: the client is A, the host B');
  await sees(A, /Jam the gallery camera from the floor/, 'A8 pass 2: the host (B) reads the jam line');
  await sees(B, /Reach the office on your partner's jam/, 'A8 pass 2: the client (A) reads the office line');
  // the host (B) presses the board, slips through the grille and leaves it open; 25 s later the circuit is back, the gate locked, the door still open
  await moveHost(BOARD_WEST[0], BOARD_WEST[1], 0.1, 0);
  // the board goes in once N2 walks away from the grille (route index 4), so the host reaches the gate behind his back
  await until(A, () => { const e = window.__course.squadOf('a8-night2'); return !!e && !e.alerted && e.walker?.idx === 4; }, null, 60000, 'A8 pass 2: N2 walks away from the grille (route index 4)');
  assert((await use(A, BOARD)) === 'ok', 'A8 pass 2: the host presses the board');
  await until(A, (g) => window.__course.debug().gates[g], NIGHT_GATE, 8000, 'A8 pass 2: the isolator opens');
  await moveHost(GRILLE_AT[0], GRILLE_AT[1], 0.1, EAST);
  await openDoor(A, DOORS.grille, 'A8 pass 2 grille');
  await moveHost(INSIDE[0], INSIDE[1], 0.1, EAST);
  await until(A, (g) => !window.__course.debug().gates[g], NIGHT_GATE, 40000, 'A8 pass 2: the 25 s window ends');
  // (S-e2e-fix3) the host's registry (circuit 81 has no wall switch, see step 5)
  await until(A, ([g, on]) => { const l = window.__app.current.world.level.lights.lights.filter((x) => x.kind !== 'flashlight' && x.group === g); return l.length > 0 && l.every((x) => x.on === on); }, [NIGHT_GROUP, true], 10000, 'A8 pass 2: the night circuit is back on (host)');
  await until(B, (g) => !window.__course.wire.lights.groups.some(([k, on]) => k === g && !on), NIGHT_GROUP, 15000, 'A8 pass 2: the night circuit is back on (client)');
  assert(await lockedOnHost(DOORS.grille), 'A8 pass 2: the grille is locked again on the host');
  await until(B, (i) => window.__course.wire.locks.includes(i), await doorIndex(DOORS.grille), 15000, 'A8 pass 2: the client sees the grille locked');
  assert((await doorOpen(A, DOORS.grille)) > 0.5, 'A8 pass 2: the relock never shuts the door: it stays open (ENGINE-ANSWERS Q9)');
  await closeDoor(A, DOORS.grille, 'A8 pass 2 grille');
  const aid = await doorAid(DOORS.grille);
  assert((await use(A, `door-${aid}`)) === 'disabled', 'A8 pass 2: shut and locked, the grille cannot be opened from inside by hand');
  // the request-to-exit (A8_RTE_GATE_ON, on since 2e58f265: an open egress gate releases the door on its own): the device stands on the lobby's south
  // wall (136.3, 1.1, 56.15). A client press from the hall side (133.4, 57.0), 3.0 m off and over the host's reach (the host's own `use` skips reach),
  // must leave the grille locked; from the lobby side (136.3, 57.0) the host's press opens it for good
  assert(await A.evaluate((id) => !!window.__app.current.interactables?.items.find((i) => i.id === id), RTE), 'A8 pass 2: the request-to-exit is in the build');
  await moveClient(133.4, 57.0, 0.1, EAST);
  assert((await use(B, RTE)) === 'ok', 'A8 pass 2: the client presses the request-to-exit from the hall side');
  await waitSim(1000);
  assert(await lockedOnHost(DOORS.grille), 'A8 pass 2: a press from the hall side leaves the grille locked (out of reach)');
  await moveHost(136.3, 57.0, 0.1, 0);
  assert((await use(A, RTE)) === 'ok', 'A8 pass 2: the host presses the request-to-exit from the lobby side');
  await until(A, (cid) => !window.__course.state.locked(cid), DOORS.grille, 5000, 'A8 pass 2: the request-to-exit unlocks the grille for good');
  await until(B, (i) => !window.__course.wire.locks.includes(i), await doorIndex(DOORS.grille), 15000, 'A8 pass 2: the client sees the grille unlocked');
  for (const P of [A, B]) await until(P, () => !window.__app.current.traversal.attached, null, 10000, 'A8: nobody is hanging');
  // the runner's finale then puts both in the cash dock (teleports: no door is in the way)
}
