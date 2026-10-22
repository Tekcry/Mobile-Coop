// A1 the Gate: the set's e2e steps for e2e-ctcourse (part 1; set doc `docs/marlow-final/sets/a1Gate.md` section 11). Two pages:
// A = the host (P1), B = the client (P2). The set's role claim swaps the lead once: the client takes A on the striped mark.
//   1. both in the lounge: the step line (shared row, host A line, client B line), the lounge door, the passive checker;
//   2. the client on the mark claims A (the lines swap);
//   3. the client crouches and offers, the host is boosted onto the apron-face lip (normal -x, 4.4 m) and climbs onto the wall;
//   4. the host lowers into a hang on the yard face and lets go: health unchanged, feet on the yard floor;
//   5. the client's bolt press from the apron side is refused, the host's from the yard side opens the wicket, `a1-over` ticks;
//   6. the client through the wicket, both to the L1 door (the runner then puts them on the pad);
//   7. the relay variant after a checkpoint restart (the claim resets): the host boosts, the client hangs and offers the relay,
//      the host climbs the client, both drop; `a1-yard` ticks the step with the wicket still locked;
//   8. light: both pages read the wicket lit and the same; the yard switch (cut from the client) darkens the yard on both pages;
//   9. the checker (e2e-coop's bay-1 guard): alive and passive on the host page.
// Dropping is real (the hang from the wall top and the let go); the leg-up, the relay and the bolt are the runner's helpers.
export const SET = 'a1Gate';

const WICKET_GATE = 'g-a1-wicket';
const WICKET_DOOR = 'A1-wicket';
const MARK = [10.8, 6];

/** The wall top's yard edge: the player stands at x 12.1 (the lip is at 12.3) facing the yard. */
const EDGE_X = 12.1;
/** (S-switch) Inside the cabin by the yard switch (7.7, 15.15): the host only takes a client's `use` within the item's reach
 *  + 0.75 m (`inUseReach`, 2.05 m for a switch), so the client presses from here, not from the yard. */
const SWITCH_STAND = [7.7, 15.8];

/** @param {object} t the runner's helpers (scripts/e2e-ctcourse.mjs) @param {number} n the set's number */
export async function walk(t, n) {
  const { A, B, GA, GB, until, assert, waitSim, use, hostDebug, moveHost, moveClient, doorIndex, legUp, pullUp, holdUntil, padReady, crouch, RB } = t;

  // ---- helpers local to the set ----
  const sees = (P, re, what) => until(P, ([src]) => new RegExp(src).test(document.querySelector('.course-hud .ch-step')?.textContent ?? ''), [re.source], 15000, what);
  const stepTicked = (P) => P.evaluate(() => !!document.querySelector('.course-hud tr[data-step="a1-over"] td.done'));
  const hp = (P) => P.evaluate(() => window.__app.current.target.health.hp);
  const setDamage = (P, v) => P.evaluate((v) => { window.__app.current.target.damageMul = v; }, v);
  const gateOpen = async () => !!(await hostDebug()).gates[WICKET_GATE];
  const lockedOnClient = async (cid) => GB((i) => window.__course.wire.locks.includes(i), await doorIndex(cid));
  /** A page's baked light level for a standing body at (x, z) (the same field the meter and the guards read). */
  const level = (P, x, z) => P.evaluate(([x, z]) => window.__app.current.world.lightField?.bodyLevel(x, 0, z, 1.7) ?? -1, [x, z]);
  /** The anchor the player on P hangs from. */
  const hanging = (P) => P.evaluate(() => { const a = window.__app.current.traversal.attach.anchor; return a ? { kind: a.kind, nx: a.nx, nz: a.nz, top: a.top, id: a.id } : null; });

  /** Put the player on the wall top at the yard edge (z), hold drop: lowered into a hang on the yard face; a tap lets go. */
  async function lowerAndDrop(P, move, z, what) {
    await move(EDGE_X, z, 4.5, Math.PI / 2);
    await P.evaluate(() => { const c = window.__app.current.player.cam; c.yaw = Math.PI / 2; c.pitch = 0; });
    await padReady(P);
    await until(P, () => window.__app.current.player.controller.grounded, null, 10000, `${what}: stands on the wall top`);
    await holdUntil(P, 1, () => window.__app.current.traversal.attached, `${what}: holding drop lowers into a hang on the yard face`, null, 20000);
    const a = await hanging(P);
    assert(!!a && a.kind === 'ledge' && a.nx > 0.9 && a.top >= 4.3 && a.top <= 4.5, `${what}: hangs from the yard-face lip, normal +x, 4.4 m (${JSON.stringify(a)})`);
    // the let-go is a drop PRESS (an edge) read only once the hang has settled ('on'): a press during the lowering is
    // spent there, and holding B gives no new edge
    await until(P, () => window.__app.current.traversal.attach.phase === 'on', null, 10000, `${what}: the hang has settled`);
    await waitSim(300);
    await holdUntil(P, 1, () => !window.__app.current.traversal.attached, `${what}: lets go`, null, 10000);
    const t0 = await P.evaluate(() => window.__app.current.time);
    // (S-e2e-fix) the landing, not the first `grounded`: the hang's kinematic override reads grounded, and a read on the
    // let-go's own step or a body caught on the way down both show the hang height; a 2.5 m fall takes about 0.7 s
    const landed = () => { const c = window.__app.current.player.controller; return !window.__app.current.traversal.attached && c.grounded && c.pos.y < 0.3; };
    await until(P, landed, null, 6000, `${what}: lands in the yard`).catch(async (e) => {
      console.error(`${what}: drop diag ${await dropDiag(P)}`);
      throw e;
    });
    const t1 = await P.evaluate(() => window.__app.current.time);
    const at = await P.evaluate(() => { const p = window.__app.current.player.controller.pos; return [p.x, p.y, p.z]; });
    // (the pass zone starts at x 12.6, A1-C1: a body just off the 12.3 face is in the yard but not yet in the zone)
    assert(at[0] > 12.3 && at[1] < 0.3, `${what}: feet on the yard floor past the wall (${at.map((v) => v.toFixed(2))})`);
    assert(t1 - t0 < 2, `${what}: the drop lands within 2 s of the let-go (${(t1 - t0).toFixed(2)} s of game time)`);
  }

  /** (S-e2e-fix) Why a let-go did not land: the body, its support, the attach and team state, the partner on this page. */
  const dropDiag = (P) =>
    P.evaluate(() => {
      const g = window.__app.current;
      const c = g.player.controller;
      const r = g.net?.remotes ? [...g.net.remotes.values()][0] : null;
      const av = g.net?.avatars ? [...g.net.avatars.values()][0] : null;
      const f = (v) => (v ? [v.x, v.y, v.z].map((n) => +n.toFixed(2)) : null);
      return JSON.stringify({
        pos: f(c.pos), grounded: c.grounded, crouched: c.crouched, override: c.override ? Object.keys(c.override) : null, support: c.support?.supportedState ?? null,
        attached: g.traversal.attached, phase: g.traversal.attach.phase, kind: g.traversal.kind, team: g.team.state,
        partner: f(r?.feet ?? av?.feet ?? null), time: +g.time.toFixed(2),
      });
    });

  /** The host crouches on the mark and offers, the client takes the leg-up and hangs on the apron-face lip (the booster's own helper is the client's). */
  async function hostBoostsClient(what) {
    await moveHost(MARK[0], MARK[1]);
    await moveClient(MARK[0] - 0.8, MARK[1]);
    await waitSim(500);
    await padReady(A);
    await padReady(B);
    await crouch(A);
    await holdUntil(A, RB, () => window.__app.current.team.state === 'offer', `${what}: the host offers a leg-up`);
    await until(B, () => !!window.__app.current.team.offer?.boost, null, 8000, `${what}: the client is offered the leg-up`);
    const boosts0 = await GB(() => window.__app.current.team.count.boosts);
    await holdUntil(B, RB, (n) => window.__app.current.team.count.boosts > n, `${what}: the client takes the leg-up`, boosts0);
    await until(B, () => window.__app.current.traversal.attach.phase === 'on' && window.__app.current.traversal.attach.anchor?.kind === 'ledge', null, 12000, `${what}: the client hangs on the ledge`);
    const a = await hanging(B);
    assert(a.top >= 4.3 && a.top <= 4.5 && a.nx < -0.9, `${what}: the client hangs on the apron-face lip, normal -x, 4.4 m (${JSON.stringify(a)})`);
    await until(A, () => window.__app.current.team.state === 'none', null, 20000, `${what}: the booster is free again`);
  }

  // ---- 1. the start: both in the lounge ----
  console.log('  A1: the lounge, the step lines, the checker');
  await moveHost(2, 10, 0.1, Math.PI / 2);
  await moveClient(2, 12, 0.1, Math.PI / 2);
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) {
    await until(P, () => /Get over the yard wall together/.test(document.querySelector('.course-hud')?.textContent ?? ''), null, 15000, `the ${tag} sees the shared step line`);
  }
  // nobody has claimed: the lead (the host) has the A job
  await sees(A, /Crouch at the striped mark/, 'the host (the lead) reads the A line');
  await sees(B, /Take the leg-up/, 'the client reads the B line');
  assert(!(await lockedOnClient('A1-lounge')), 'the lounge door is open to both');
  assert(await lockedOnClient(WICKET_DOOR), 'the wicket starts locked on the client');
  const checker = await GA(() => { const e = window.__app.current.enemyMgr.enemies.find((x) => x.alive); return e ? { passive: !!e.passive, x: e.pos.x, z: e.pos.z } : null; });
  assert(!!checker && checker.passive && Math.hypot(checker.x - 9.0, checker.z - 16.5) < 0.6, `the gate checker is alive, passive, at his desk (${JSON.stringify(checker)})`);

  // ---- 2. the client on the striped mark claims A ----
  console.log('  A1: the client takes the mark (the claim)');
  await moveClient(MARK[0], MARK[1]);
  await sees(B, /Crouch at the striped mark/, 'the client on the mark reads the A line');
  await sees(A, /Take the leg-up/, 'the host reads the B line');

  // ---- 3. the leg-up: the client boosts the host onto the apron-face lip, the host climbs onto the wall ----
  console.log('  A1: the leg-up');
  await legUp(MARK[0], MARK[1], 'A1');
  const lip = await hanging(A);
  assert(lip.kind === 'ledge' && lip.nx < -0.9 && Math.abs(lip.top - 4.4) < 0.1, `A1: the host hangs on the apron-face lip (a1-wall-near, normal -x) (${JSON.stringify(lip)})`);
  await pullUp(A, 'A1 host');
  const topY = await GA(() => window.__app.current.player.controller.pos.y);
  assert(topY > 4.2, `A1: the host stands on the wall top (${topY.toFixed(2)})`);

  // ---- 4. the hang-drop into the yard: no fall damage ----
  console.log('  A1: the hang-drop into the yard');
  const hp0 = await hp(A);
  await setDamage(A, 1);
  await lowerAndDrop(A, moveHost, 7, 'A1 host');
  const hp1 = await hp(A);
  await setDamage(A, 0);
  assert(hp1 === hp0, `A1: the hang-drop cost no health (${hp0} -> ${hp1})`);

  // ---- 5. the bolt: refused from the apron side, opened from the yard side ----
  console.log('  A1: the wicket bolt');
  await moveClient(11.2, 11, 0.1, Math.PI / 2);
  assert((await use(B, `c-${WICKET_GATE}`)) === 'ok', 'A1: the client tries the bolt from the apron side');
  await waitSim(800);
  assert(!(await gateOpen()), 'A1: the bolt refuses a press from the apron side');
  assert(await lockedOnClient(WICKET_DOOR), 'A1: the wicket stays locked on the client');
  assert(!(await stepTicked(A)), 'A1: the step is not done yet');
  await moveHost(13.2, 11, 0.1, -Math.PI / 2);
  assert((await use(A, `c-${WICKET_GATE}`)) === 'ok', 'A1: the host unbolts the wicket from the yard side');
  await until(A, () => window.__course.debug().gates['g-a1-wicket'], null, 8000, 'A1: the bolt gate opens');
  await until(B, (i) => !window.__course.wire.locks.includes(i), await doorIndex(WICKET_DOOR), 15000, 'A1: the client sees the wicket unlocked');
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await until(P, () => !!document.querySelector('.course-hud tr[data-step="a1-over"] td.done'), null, 15000, `A1: the ${tag} sees the handshake step ticked`);
  await sees(A, /holding room one/, 'A1: the host reads the closing line');
  await sees(B, /holding room one/, 'A1: the client reads the closing line');

  // ---- 6. through the wicket, on to the L1 door (the runner puts both on the pad) ----
  console.log('  A1: through the wicket to L1');
  // (S1 check) the wicket really opens: the host, who unbolted it, opens it by hand; both pages see it swing
  const wi = await doorIndex(WICKET_DOOR);
  assert((await use(A, `door-${await GA((cid) => window.__app.current.world.layout.course.doors[cid], WICKET_DOOR)}`)) === 'ok', 'A1: the host opens the unbolted wicket');
  await until(A, (i) => window.__app.current.world.doors.list[i].open > 0.5, wi, 8000, 'A1: the wicket opens (host)');
  await until(B, (i) => window.__app.current.world.doors.list[i].open > 0.5, wi, 15000, 'A1: the client sees the wicket open');
  await moveClient(13.2, 11.4, 0.1, Math.PI / 2);
  await moveHost(20.6, 10.4, 0.1, Math.PI / 2);
  await moveClient(20.6, 11.6, 0.1, Math.PI / 2);
  assert(!(await lockedOnClient('L1-near')), 'A1: the L1 near door is open to the client');

  // ---- 7. the relay variant after a restart: the claim resets, the host boosts, the client hangs and offers, the host climbs ----
  console.log('  A1: the relay variant');
  assert(await GA(() => window.__course.restartCheckpoint()), 'A1: the host restarts at the checkpoint');
  const cp = await GA(() => { const p = window.__course.checkpointPos(); return [p.x, p.z]; });
  await until(B, ([x, z]) => { const p = window.__app.current.player.position; return Math.hypot(p.x - x, p.z - z) < 2.5; }, cp, 15000, 'A1: the restart brings the client back');
  await waitSim(2200);
  await setDamage(A, 0);
  assert(!(await gateOpen()) && !(await stepTicked(A)), 'A1: the restart shuts the bolt and clears the step');
  assert(await lockedOnClient(WICKET_DOOR), 'A1: the restart locks the wicket again');
  await sees(A, /Crouch at the striped mark/, 'A1: the claim is clear after the restart (the host reads the A line)');
  await sees(B, /Take the leg-up/, 'A1: the client reads the B line');
  await hostBoostsClient('A1 variant');
  const lipId = (await hanging(B)).id;
  await waitSim(400);
  await holdUntil(B, RB, () => window.__app.current.team.state === 'relayOffer', 'A1 variant: the hanging client offers the relay');
  await until(A, () => !!window.__app.current.team.offer?.relay, null, 8000, 'A1 variant: the host is offered the relay');
  await holdUntil(A, RB, () => window.__app.current.team.count.ladders >= 1, 'A1 variant: the host climbs the relay');
  await until(A, (id) => window.__app.current.traversal.attach.phase === 'on' && window.__app.current.traversal.attach.anchor?.id === id, lipId, 40000, 'A1 variant: the host hangs on the same lip');
  await until(B, () => window.__app.current.team.state === 'none' && window.__app.current.traversal.attached, null, 8000, 'A1 variant: the client is free and still hanging');
  await pullUp(B, 'A1 variant client');
  await pullUp(A, 'A1 variant host');
  await setDamage(A, 1);
  const h0 = [await hp(A), await hp(B)];
  await lowerAndDrop(A, moveHost, 7, 'A1 variant host');
  await lowerAndDrop(B, moveClient, 9, 'A1 variant client');
  assert((await hp(A)) === h0[0] && (await hp(B)) === h0[1], 'A1 variant: both drops cost no health');
  await setDamage(A, 0);
  await moveHost(14, 7);
  await moveClient(14, 9);
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await until(P, () => !!document.querySelector('.course-hud tr[data-step="a1-over"] td.done'), null, 20000, `A1 variant: the ${tag} sees the step ticked with both in the yard`);
  assert(!(await gateOpen()), 'A1 variant: the wicket is still bolted');
  assert(await lockedOnClient(WICKET_DOOR), 'A1 variant: the wicket is still locked on the client');

  // ---- 8. light parity: the wicket lit, the yard switch from the client ----
  console.log('  A1: light');
  for (const [x, z] of [[11.2, 11], [12.8, 11]]) {
    const [la, lb] = [await level(A, x, z), await level(B, x, z)];
    assert(la >= 0.55 && Math.abs(la - lb) < 0.01, `A1: the wicket at (${x}, ${z}) reads lit and the same on both pages (host ${la.toFixed(3)}, client ${lb.toFixed(3)})`);
  }
  const [y0a, y0b] = [await level(A, 17, 11), await level(B, 17, 11)];
  assert(y0a >= 0.4 && Math.abs(y0a - y0b) < 0.01, `A1: the yard reads lit and the same (host ${y0a.toFixed(3)}, client ${y0b.toFixed(3)})`);
  const sw = await GA(() => { const it = window.__app.current.interactables.items.find((i) => i.id === 'switch-0'); return it ? [it.pos.x, it.pos.z] : null; });
  assert(!!sw && Math.hypot(sw[0] - 7.7, sw[1] - 15.15) < 0.3, `A1: the first wall switch is the yard switch in the cabin (${JSON.stringify(sw)})`);
  await moveClient(SWITCH_STAND[0], SWITCH_STAND[1]);
  assert((await use(B, 'switch-0')) === 'ok', 'A1: the client turns the yard switch off');
  await until(B, () => window.__course.wire.lights.groups.some(([g, on]) => g === 12 && !on), null, 15000, 'A1: the client sees the yard group off');
  await until(A, () => !window.__app.current.stealth.switchOn(12), null, 15000, 'A1: the host sees the yard group off');
  const [y1a, y1b] = [await level(A, 17, 11), await level(B, 17, 11)];
  assert(y1a <= 0.28 && y1b <= 0.28 && Math.abs(y1a - y1b) < 0.02, `A1: the yard reads dark and the same on both pages (host ${y1a.toFixed(3)}, client ${y1b.toFixed(3)})`);
  assert((await use(B, 'switch-0')) === 'ok', 'A1: the client turns the yard switch on again');
  await until(A, () => window.__app.current.stealth.switchOn(12), null, 15000, 'A1: the yard group is back on');
  // (S-e2e-fix) the client's lamps follow the host's next `course` message: read once the client has it (as the off case)
  await until(B, () => window.__course.wire.lights.groups.some(([g, on]) => g === 12 && on), null, 15000, 'A1: the client sees the yard group on again');
  const [y2a, y2b] = [await level(A, 17, 11), await level(B, 17, 11)];
  assert(y2a >= 0.4 && Math.abs(y2a - y2b) < 0.01, `A1: the yard reads lit again (host ${y2a.toFixed(3)}, client ${y2b.toFixed(3)})`);
  await moveClient(14, 9);

  // ---- 9. the checker survived the restart (the squad respawns): alive, passive ----
  const again = await GA(() => { const e = window.__app.current.enemyMgr.enemies.find((x) => x.alive); return e ? { passive: !!e.passive, x: e.pos.x, z: e.pos.z } : null; });
  assert(!!again && again.passive && Math.hypot(again.x - 9.0, again.z - 16.5) < 0.6, `A1: the checker is back at his desk, passive (${JSON.stringify(again)})`);
  // both players are free (nobody hanging) for the runner to put them on the L1 pad
  for (const P of [A, B]) await until(P, () => !window.__app.current.traversal.attached, null, 10000, 'A1: nobody is hanging');
}
