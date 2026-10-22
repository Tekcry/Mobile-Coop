// A4 the Goods Shed: the set's e2e steps for e2e-ctcourse (part 2; set doc `docs/marlow-final/sets/a4GoodsShed.md` section 11). Two pages:
// A = the host (P1), B = the client (P2). The set is entered with the course at A4 (the even set: the lead is P2, so before any press the
// client reads the A lines); the client presses the console and so takes B (the host is A).
//   1. the start (both players still on L3's pad): the step lines, the console and the push bar, the three guards (an armed officer, two loaders),
//      the back aisle and the passage mouth dark, the main aisle, the dock and the room lit and the same on both pages, the three cameras online;
//   2. the lure and the restart: the host cuts the floor circuit (41) with D2 at the desk: both pages dark, D1 walks to the switch; then the
//      host's checkpoint restart: the circuit back on, the squad respawned at its posts, the claim clear;
//   3. the console: with the officer up the client's press is refused on both pages ("Take him out") and claims nothing, the host takes the
//      officer down; the client's press loops the floor cameras on both pages ('looped', the cue hidden, the timer line, LANTERN's line) and
//      claims B; a press while it loops is refused ("already off"); the client stands in C1's frame, unseen, the alarm unchanged;
//   4. the floor: the pass zone needs both west of x 84 (one is not enough); `a4-floor` ticks on both pages;
//   5. the pair: both loaders go down together (the real takedown's pick is the unit test's, the dual counter the host's `takedownDone` as
//      e2e-coop drives it): the DUAL TAKEDOWN banner on both pages;
//   6. the wicket: L4's east door is locked until the client presses the push bar (within reach) on the floor side; then it is unlocked on both
//      pages, `a4-dock` ticks and the closing line shows;
//   7. the loop runs out (60 s after the press): the flag clears, the cameras are back online on both pages, the steps stay ticked, LANTERN's
//      "Cameras back in five" reached the client; a press inside the re-arm is refused ("rebooting"); 20 s later it loops again;
//   8. the medkit in L4, nobody hanging; the runner then puts both on the pad.
// Teleport legs are allowed on the open floor; a door the route opens is opened by `use(P, 'door-<anchor id>')` and asserted open on both pages
// before anyone is moved through it. The two loaders and the officer are made passive (they see and hear nothing) while the players are put
// where a real run would crouch; the lure step runs with them awake. Every press from the client is made within the item's reach + 0.75 m.
export const SET = 'a4GoodsShed';

const OFFICER = 'a4-officer';
const DOCK1 = 'a4-dock1';
const DOCK2 = 'a4-dock2';
const CONSOLE = 'c-a4-console';
const PUSHBAR = 'c-a4-pushbar';
const GATE = 'g-a4-console';
const WICKET = 'g-a4-wicket';
const FLAG = 'a4-loop';
const L4_DOOR = 'L4-near';
const PASSAGE_DOOR = 'A4-passage';
const FLOOR_GROUP = 41;
/** The players' spots (the debug points of the set): behind the officer, the console's standing point, the crouch spots against the two stacks, the push bar. */
const BEHIND = [104.8, 15.8];
const AT_CONSOLE = [105.6, 17.85];
const SPOT_N = [80.4, 36.2];
const SPOT_S = [79.6, 29.8];
const AT_PUSHBAR = [77.6, 34.6];
/** The floor switch on the pier east of the office door, D1's and D2's posts. */
const SWITCH = [79.4, 37.85];
const D1_POST = [80, 34.4];
const D2_POST = [80, 31.6];
/** A body in C1's frame (the main aisle, 11.5 m from the mount). */
const IN_C1 = [100, 39.8];
const LOOP_S = 60;

/** @param {object} t the runner's helpers (scripts/e2e-ctcourse.mjs) @param {number} n the set's number */
export async function walk(t, n) {
  const { A, B, GA, GB, until, assert, waitSim, use, hostDebug, moveHost, moveClient, doorIndex, stepLine } = t;

  // ---- helpers local to the set ----
  const sees = (P, re, what) => until(P, ([src]) => new RegExp(src).test(document.querySelector('.course-hud .ch-step')?.textContent ?? ''), [re.source], 15000, what);
  const ticked = (P, id) => P.evaluate((id) => !!document.querySelector(`.course-hud tr[data-step="${id}"] td.done`), id);
  const lockedOnClient = async (cid) => GB((i) => window.__course.wire.locks.includes(i), await doorIndex(cid));
  /** A page's baked light level for a body of height h at (x, z) (the same field the meter and the guards read). */
  const level = (P, x, z, h = 1.7) => P.evaluate(([x, z, h]) => window.__app.current.world.lightField?.bodyLevel(x, 0, z, h) ?? -1, [x, z, h]);
  const hasFlag = (f) => GA((f) => window.__course.state.hasFlag(f), f);
  const claimed = () => GA(() => window.__course.state.roleClaimed());
  const gateOpen = (id) => GA((id) => window.__course.state.isGateOpen(id), id);
  const gateRearm = () => GA((id) => window.__course.state.gateRearm(id), GATE);
  const noDamage = () => GA(() => { window.__app.current.target.damageMul = 0; });
  /** A guard of the bay by its slot id: where he is and what he is. */
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
  /** A4's three cameras' modes on page P, in the map's order (the debug list holds every camera on the map). */
  const camModes = (P) => P.evaluate(() => window.__ctdev.debug().cams.filter((c) => c.id.startsWith('cam-a4-')).map((c) => c.mode));
  const allCams = (P, mode) => until(P, ([m]) => { const cs = window.__ctdev.debug().cams.filter((c) => c.id.startsWith('cam-a4-')); return cs.length === 3 && cs.every((c) => c.mode === m); }, [mode], 15000, `all three cameras are ${mode}`);
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
  const cueHidden = () => window.__ctdev.debug().cue.every((c) => c.a === 0 && !c.shown && !c.seen);
  /** The lamps of circuit g are all on / all off on page P's registry (the host's own, the client's from the course message). */
  const lampsOn = (P, g, on) => P.evaluate(([g, on]) => { const l = window.__app.current.world.level.lights.lights.filter((x) => x.kind !== 'flashlight' && x.group === g); return l.length > 0 && l.every((x) => x.on === on); }, [g, on]);
  /** Knock a guard out with a melee HitInfo as `CtDevices.touch` builds one (dir -x). */
  const knockOut = (slots) =>
    GA((slots) => {
      const g = window.__app.current;
      const V = g.player.position.constructor;
      for (const s of slots) {
        const e = window.__course.squadOf(s);
        e.knockOut({ amount: 100, point: e.pos.clone(), dir: new V(-1, 0, 0), part: 'body', kind: 'melee', attackerTeam: 'player', attackerId: 'local', sourcePos: g.player.position.clone(), impulse: 0, nonLethal: true });
      }
    }, slots);

  // ---- 1. the start: the step lines, the devices, the guards, the light, the cameras ----
  console.log('  A4: the goods shed, the step lines, the guards, the light');
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) {
    await until(P, () => /Take the duty officer quietly/.test(document.querySelector('.course-hud')?.textContent ?? ''), null, 15000, `the ${tag} sees the shared step line`);
    for (const id of [CONSOLE, PUSHBAR]) assert(await P.evaluate((id) => !!window.__app.current.interactables?.items.find((i) => i.id === id), id), `A4: the ${tag} has the device ${id}`);
  }
  assert(!(await lockedOnClient('L3-far')), 'A4: the L3 far door is open to the client');
  // the lead of the even set is P2: the client reads the A line until somebody claims the B job at the console
  await sees(B, /Take the officer from behind/, 'A4: the client (the lead) reads the A line');
  await sees(A, /Use the console once the officer is down/, 'A4: the host reads the B line');
  assert(!(await claimed()), 'A4: nobody has claimed a job yet');
  const g0 = { officer: await guard(OFFICER), d1: await guard(DOCK1), d2: await guard(DOCK2) };
  assert(!!g0.officer && g0.officer.alive && !g0.officer.passive && g0.officer.kind === 'officer' && Math.hypot(g0.officer.x - 104.8, g0.officer.z - 17.6) < 0.6, `A4: the officer is up at his post, armed (${JSON.stringify(g0.officer)})`);
  assert(!!g0.d1 && g0.d1.alive && !g0.d1.passive && g0.d1.kind === 'grunt' && Math.hypot(g0.d1.x - D1_POST[0], g0.d1.z - D1_POST[1]) < 0.8, `A4: D1 is at his post, armed (${JSON.stringify(g0.d1)})`);
  assert(!!g0.d2 && g0.d2.alive && !g0.d2.passive && g0.d2.kind === 'grunt', `A4: D2 is up, armed (${JSON.stringify(g0.d2)})`);
  // light, the same on both pages: the room, the dock and the main aisle lit; the back aisle, its west end and the passage mouth dark (crouched)
  for (const [x, z, h, lit, what] of [[103.3, 16.3, 1.7, true, 'the room'], [80, 33, 1.7, true, 'the dock between the men'], [92, 39.8, 1.7, true, 'the main aisle'], [90, 25.8, 1.15, false, 'the back aisle'], [84.5, 25.8, 1.15, false, "the back aisle's west end"], [102.5, 24.6, 1.15, false, 'the passage mouth']]) {
    const [la, lb] = [await level(A, x, z, h), await level(B, x, z, h)];
    assert(Math.abs(la - lb) < 0.02 && (lit ? la >= 0.55 : la <= 0.22), `A4: ${what} reads ${lit ? 'lit' : 'dark'} and the same on both pages (host ${la.toFixed(3)}, client ${lb.toFixed(3)})`);
  }
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) {
    const m = await camModes(P);
    assert(m.length === 3 && m.every((x) => x === 'online'), `A4: the three cameras are online on the ${tag} (${JSON.stringify(m)})`);
    for (const g of [40, 41, 42, 43]) assert(await lampsOn(P, g, true), `A4: circuit ${g} is lit on the ${tag}`);
  }
  const hit = (await hostDebug()).gates;
  assert(hit[GATE] === false && hit[WICKET] === false, `A4: both gates start closed (${JSON.stringify(hit)})`);
  assert(await lockedOnClient(L4_DOOR), "A4: L4's east door (the dock wicket) starts locked on the client");

  // ---- 2. the lure and the restart: the floor circuit cut with D2 at the desk, D1 walks to the switch; then the host's checkpoint restart ----
  console.log('  A4: the floor switch lures D1; the restart');
  const sid = await GA(([x, z]) => window.__app.current.interactables.items.find((i) => /^switch-\d+$/.test(i.id) && Math.hypot(i.pos.x - x, i.pos.z - z) < 0.3)?.id ?? null, SWITCH);
  assert(!!sid, 'A4: the floor switch is a map switch on the office pier');
  // both loaders calm at their posts (D2 stands at the desk for his first 17 s): the press picks the nearest calm guard, D1
  await until(A, ([d1, d2]) => { const a = window.__course.squadOf('a4-dock1'); const b = window.__course.squadOf('a4-dock2'); return !!a && !!b && !a.alerted && !b.alerted && Math.hypot(a.pos.x - d1[0], a.pos.z - d1[1]) < 1 && Math.hypot(b.pos.x - d2[0], b.pos.z - d2[1]) < 1; }, [D1_POST, D2_POST], 30000, 'A4: both loaders are calm at their posts');
  const d1a = await guard(DOCK1);
  const d0 = Math.hypot(d1a.x - SWITCH[0], d1a.z - SWITCH[1]);
  assert((await use(A, sid)) === 'ok', 'A4: the host presses the floor switch (the players are in L3, out of every view)');
  await until(A, () => !window.__app.current.stealth.switchOn(41), null, 10000, 'A4: the floor circuit is off on the host');
  await until(B, () => window.__course.wire.lights.groups.some(([g, on]) => g === 41 && !on), null, 15000, "A4: the client's course message has group 41 off");
  assert((await lampsOn(A, FLOOR_GROUP, false)) && (await lampsOn(B, FLOOR_GROUP, false)), 'A4: the eight floor lamps are off on both pages');
  for (const [x, z, what] of [[92, 39.8, 'the main aisle'], [80, 33, 'the dock']]) {
    const [la, lb] = [await level(A, x, z), await level(B, x, z)];
    assert(la <= 0.24 && lb <= 0.24 && Math.abs(la - lb) < 0.02, `A4: ${what} reads dark and the same on both pages with the floor circuit cut (host ${la.toFixed(3)}, client ${lb.toFixed(3)})`);
  }
  // the lured guard (D1: the nearest calm guard within 25 m) walks towards the switch
  await until(A, ([sx, sz, d0]) => { const e = window.__course.squadOf('a4-dock1'); if (!e || !e.alive) return false; const d = Math.hypot(e.pos.x - sx, e.pos.z - sz); return d < 1.6 || d < d0 - 1.2; }, [SWITCH[0], SWITCH[1], d0], 30000, 'A4: D1 walks to the floor switch');
  assert(await GA(() => window.__course.restartCheckpoint()), 'A4: the host restarts at the checkpoint');
  const cp = await GA(() => { const p = window.__course.checkpointPos(); return [p.x, p.z]; });
  await until(B, ([x, z]) => { const p = window.__app.current.player.position; return Math.hypot(p.x - x, p.z - z) < 2.5; }, cp, 15000, 'A4: the restart brings the client back');
  await waitSim(2200);
  await noDamage();
  await until(A, () => window.__app.current.stealth.switchOn(41), null, 10000, 'A4: the restart puts the floor circuit back on (host)');
  await until(B, () => !window.__course.wire.lights.groups.some(([g, on]) => g === 41 && !on), null, 15000, 'A4: the restart puts the floor circuit back on (client)');
  assert((await lampsOn(A, FLOOR_GROUP, true)) && (await lampsOn(B, FLOOR_GROUP, true)), 'A4: the eight floor lamps are lit again on both pages');
  const [ra, rb] = [await level(A, 92, 39.8), await level(B, 92, 39.8)];
  assert(ra >= 0.55 && Math.abs(ra - rb) < 0.02, `A4: the main aisle reads lit again on both pages (host ${ra.toFixed(3)}, client ${rb.toFixed(3)})`);
  assert(!(await claimed()), 'A4: the restart leaves the claim clear');
  await until(A, ([d1]) => { const e = window.__course.squadOf('a4-dock1'); return !!e && e.alive && Math.hypot(e.pos.x - d1[0], e.pos.z - d1[1]) < 1; }, [D1_POST], 15000, 'A4: D1 is back at his post');
  assert(!!(await guard(OFFICER))?.alive, 'A4: the officer is back at his post after the restart');

  // ---- 3. the console: refused while the officer is up (claims nothing), then he goes down and the client loops the cameras ----
  console.log('  A4: the console, the officer, the loop');
  await setPassive([OFFICER, DOCK1, DOCK2], true);
  await openDoor(PASSAGE_DOOR, 'A4 passage');
  await moveHost(BEHIND[0], BEHIND[1], 0.1, 0);
  await moveClient(AT_CONSOLE[0], AT_CONSOLE[1], 0.1, 0);
  assert((await use(B, CONSOLE)) === 'ok', 'A4: the client presses the console with the officer up');
  await until(A, () => /Take him out/.test(window.__course.debug().refusal ?? ''), null, 8000, 'A4: the console refuses while the officer is up (host)');
  await until(B, () => /Take him out/.test(window.__course.debug().refusal ?? ''), null, 8000, 'A4: the client gets the refusal');
  assert(!(await hasFlag(FLAG)) && !(await gateOpen(GATE)), 'A4: the refused press sets no flag and opens no gate');
  assert(!(await claimed()), 'A4: a refused press claims nothing (A4-C9)');
  await sees(B, /Take the officer from behind/, 'A4: the client still reads the A line after the refusal');
  for (const P of [A, B]) assert((await camModes(P)).every((m) => m === 'online'), 'A4: the cameras stay online after the refusal');
  // the host takes the officer down (the takedown itself is the game's; a HitInfo as `CtDevices.touch` builds one, dir -x, toward the desk's west)
  await setPassive([OFFICER], false);
  const info0 = await GA(() => window.__course.squadOf('a4-officer').info?.lines?.length ?? 0);
  assert(info0 === 2, `A4: the officer carries his two interrogation lines (${info0})`);
  await knockOut([OFFICER]);
  assert(await GA(() => !window.__course.squadOf('a4-officer').alive), 'A4: the officer is down');
  // pressed again: the cameras loop on both pages, the cue hides, the timer line shows, LANTERN's line reaches the client, the press claims B
  const alarm0 = (await t.dev(A)).alarm;
  assert((await use(B, CONSOLE)) === 'ok', 'A4: the client presses the console again');
  await until(A, ([f, g]) => window.__course.state.hasFlag(f) && window.__course.debug().gates[g], [FLAG, GATE], 8000, 'A4: the console sets the flag and opens its gate');
  await until(B, (f) => window.__course.wire.s.flags.includes(f), FLAG, 8000, 'A4: the client has the flag');
  await allCams(A, 'looped');
  await allCams(B, 'looped');
  await waitSim(600);
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await until(P, cueHidden, null, 3000, `A4: the camera cues are hidden on the ${tag}`);
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await sees(P, /Cameras back in \d+ s/, `A4: the ${tag} reads the loop timer line`);
  await until(B, () => /Cameras looped/.test(window.__course.wire.rl ?? ''), null, 15000, "A4: LANTERN's line reaches the client");
  assert(await claimed(), 'A4: the press claims the job');
  await sees(B, /Back aisle or mezzanine/, 'A4: the client has the B job (the floor step B line)');
  await sees(A, /Main aisle: move fast/, 'A4: the host has the A job (the floor step A line)');
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) assert(await ticked(P, 'a4-room'), `A4: the ${tag} sees the room step ticked`);
  // a press while it loops: "already off", the window is not reset
  const t0 = await GA((id) => window.__course.state.gateTimer(id), GATE);
  assert((await use(B, CONSOLE)) === 'ok', 'A4: the client presses the console while it loops');
  await until(A, () => /already off/.test(window.__course.debug().refusal ?? ''), null, 8000, 'A4: the console says the cameras are already off (host)');
  await until(B, () => /already off/.test(window.__course.debug().refusal ?? ''), null, 8000, 'A4: the client gets "already off"');
  const t1 = await GA((id) => window.__course.state.gateTimer(id), GATE);
  assert(t1 <= t0 && t1 > 0 && t0 <= LOOP_S, `A4: a press while it loops does not reset the window (${t0.toFixed(1)} -> ${t1.toFixed(1)} s)`);
  // the client stands in C1's frame on the lit main aisle for 3 s: nothing sees it, the cameras stay looped, the alarm is unchanged
  await moveClient(IN_C1[0], IN_C1[1], 0.1, -Math.PI / 2);
  let seen = false;
  let back = false;
  for (let k = 0; k < 10; k++) {
    await waitSim(300);
    for (const P of [A, B]) {
      const d = await t.dev(P);
      if (d.cue.some((c) => c.seen)) seen = true;
      if (d.cams.some((c) => c.mode !== 'looped')) back = true;
    }
  }
  const alarm1 = (await t.dev(A)).alarm;
  assert(!seen && !back && alarm1 === alarm0, `A4: the looped cameras never see the client on the main aisle (seen ${seen}, back on ${back}, alarm ${alarm0} -> ${alarm1})`);

  // ---- 4. the floor: the pass zone needs both players west of x 84 ----
  console.log('  A4: the pass zone, both west of x 84');
  await moveHost(SPOT_N[0], SPOT_N[1], 0.1, Math.PI);
  await waitSim(800);
  assert(!(await hasFlag('a4-west')), 'A4: one player west of x 84 is not enough');
  assert(!(await ticked(A, 'a4-floor')), 'A4: the floor step is not done with one west');
  await moveClient(SPOT_S[0], SPOT_S[1], 0.1, 0);
  await until(A, () => window.__course.state.hasFlag('a4-west'), null, 10000, 'A4: the pass zone sets a4-west with both west');
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await until(P, () => !!document.querySelector('.course-hud tr[data-step="a4-floor"] td.done'), null, 15000, `A4: the ${tag} sees the floor step ticked`);
  await sees(A, /Take the man nearest the office/, 'A4: the host (A) reads the dock step line');
  await sees(B, /Take the man nearest the racking/, 'A4: the client (B) reads the dock step line');

  // ---- 5. the pair goes down together: the dual takedown ----
  console.log('  A4: the dual takedown');
  const duals0 = await GA(() => window.__app.current.net.duals);
  await knockOut([DOCK1, DOCK2]);
  assert(await GA(() => !window.__course.squadOf('a4-dock1').alive && !window.__course.squadOf('a4-dock2').alive), 'A4: both loaders are down');
  const ids = [await GA(() => window.__coop.session.selfId), await GB(() => window.__coop.session.selfId)];
  await GA(([a, c]) => { const net = window.__app.current.net; net['takedownDone'](a); net['takedownDone'](c); }, ids);
  assert((await GA(() => window.__app.current.net.duals)) === duals0 + 1, 'A4: two takedowns together count as a dual takedown');
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await until(P, () => /DUAL TAKEDOWN/.test(document.querySelector('.hud')?.textContent ?? document.body.textContent), null, 6000, `A4: the ${tag} sees the dual takedown banner`);

  // ---- 6. the wicket: the push bar (the client, within reach) opens L4's east door ----
  console.log('  A4: the push bar, the wicket');
  assert(!(await gateOpen(WICKET)) && (await lockedOnClient(L4_DOOR)), "A4: L4's east door is locked before the bar");
  assert(!(await ticked(A, 'a4-dock')), 'A4: the dock step is not done before the bar');
  await moveClient(AT_PUSHBAR[0], AT_PUSHBAR[1], 0.1, -Math.PI / 2);
  assert((await use(B, PUSHBAR)) === 'ok', 'A4: the client pushes the bar');
  await until(A, (g) => window.__course.debug().gates[g], WICKET, 8000, 'A4: the egress gate opens');
  await until(B, (i) => !window.__course.wire.locks.includes(i), await doorIndex(L4_DOOR), 15000, "A4: the client sees L4's east door unlocked");
  await until(A, (i) => !window.__app.current.world.doors.list[i].anchor.locked, await doorIndex(L4_DOOR), 8000, "A4: the host sees L4's east door unlocked");
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await until(P, () => !!document.querySelector('.course-hud tr[data-step="a4-dock"] td.done'), null, 15000, `A4: the ${tag} sees the dock step ticked`);
  await sees(A, /holding room four/, 'A4: the host reads the closing line');
  await sees(B, /holding room four/, 'A4: the client reads the closing line');
  // L4's own side has no release: a second door of the airlock (its far door) is still locked until the airlock cycles
  assert(await lockedOnClient('L4-far'), "A4: L4's far door is still locked");

  // ---- 7. the loop runs out: the cameras come back, the steps stay, the console re-arms ----
  console.log('  A4: the loop runs out, the re-arm');
  await until(B, () => /Cameras back in five/.test(window.__course.wire.rl ?? ''), null, (LOOP_S + 10) * 1000, "A4: LANTERN's five-second warning reaches the client");
  await until(A, (f) => !window.__course.state.hasFlag(f), FLAG, 30000, 'A4: the loop ends (the flag clears)');
  await allCams(A, 'online');
  await allCams(B, 'online');
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) assert(!/Cameras back in/.test(await stepLine(P)), `A4: the ${tag}'s timer line is gone`);
  assert((await ticked(A, 'a4-room')) && (await ticked(A, 'a4-floor')) && (await ticked(A, 'a4-dock')), 'A4: the three steps stay ticked after the cameras come back');
  assert(!(await gateOpen(GATE)) && (await gateRearm()) > 0, `A4: the console is re-arming (${(await gateRearm()).toFixed(1)} s left)`);
  // a press inside the re-arm is refused ("rebooting"), nothing loops
  await moveClient(AT_CONSOLE[0], AT_CONSOLE[1], 0.1, 0);
  assert((await use(B, CONSOLE)) === 'ok', 'A4: the client presses the console inside the re-arm');
  await until(A, () => /rebooting/.test(window.__course.debug().refusal ?? ''), null, 8000, 'A4: the console says it is rebooting (host)');
  await until(B, () => /rebooting/.test(window.__course.debug().refusal ?? ''), null, 8000, 'A4: the client gets "rebooting"');
  assert(!(await hasFlag(FLAG)) && (await camModes(A)).every((m) => m === 'online'), 'A4: the refused press loops nothing');
  // 20 s after the loop ended it takes another press: the cameras loop again on both pages
  await until(A, (id) => window.__course.state.gateRearm(id) === 0, GATE, 30000, 'A4: the console re-arms (20 s)');
  assert((await use(B, CONSOLE)) === 'ok', 'A4: the client presses the re-armed console');
  await until(A, (f) => window.__course.state.hasFlag(f), FLAG, 8000, 'A4: the second loop starts');
  await allCams(A, 'looped');
  await allCams(B, 'looped');

  // ---- 8. L4's medkit, nobody hanging (the runner then puts both on the pad) ----
  console.log('  A4: L4');
  const med = await GA(() => (window.__app.current.world.layout.medkitWalls ?? []).some((m) => m.pos.x > 70 && m.pos.x < 76 && m.pos.z > 30 && m.pos.z < 36));
  assert(med, 'A4: the wall medkit is in holding room four');
  for (const P of [A, B]) await until(P, () => !window.__app.current.traversal.attached, null, 10000, 'A4: nobody is hanging');
}
