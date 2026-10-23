// A6 the Pump House: the set's e2e steps for e2e-ctcourse (part 3; set doc `docs/marlow-final/sets/a6PumpHouse.md` section 11).
// Two pages: A = the host (P1), B = the client (P2). A6 is an even set: the lead is P2, so before any claim the client reads the
// A lines; the first player onto the motor gallery or the bridge takes B (the hanger).
//   1. the start: both step lines, the drive panel and the exit release exist on both pages, the cage door and the outfall
//      door (L6 near) locked on the client, the attendant alive and armed; the dark west end and the lit desk, the same on both pages;
//   2. pass 1, the taught route: while the attendant is east of x 55 the host boosts the client onto the open span (the client
//      claims B), the client drops the rescue line from the rope spot and the host climbs it: `a6-gal`, `a6-up` ticks on both pages;
//   3. both on the bridge: the host holds at the striped spot, the client is lowered head-first through the gland plate until the
//      drive panel is its nearest item; the hold-noise check: with the attendant within 4.5 m of the panel the client holds the key
//      for about 1 s and lets go: the pulse reaches the host and the attendant's meter rises, the flag stays unset;
//   4. with the attendant back at his desk (over 6 m) the client holds the key 3 s: `a6-drive`, `a6-hang` ticks on both pages, the
//      outfall door unlocks on the client, the attendant stays calm; the client is pulled back up;
//   5. the gallery switch from the client at the stair head: group 61 off on both pages, the holder's spot dark on both, the
//      attendant lured toward it; on again;
//   6. both to the L6 door while the attendant is west of x 50;
//   7. pass 2 (the host's checkpoint restart: the flag cleared, both doors locked again, the claim cleared; the client damage-proof on the host
//      and every attendant-sensitive step waited on: the cage-face loop and the floor hold while he is at his desk, the drop while he is east): the client outside the
//      cage cannot reach either device (its own prompt never offers them; a forced press from the west face is refused by the host);
//      the host claims B, is lowered and let go: lands in the cage, holds the panel 3 s from the floor (`a6-drive`), presses the exit
//      release (the cage door unlocks on both pages), opens the door by hand and walks out; both to the L6 door.
// The ledge relay (Route 2) and the staff stair (Route 3) are not walked here: the lip, the boost search, the rope's room and the
// solo-jump check are the unit tests' (`tests/ctcourse/a6PumpHouse.test.ts`). Teleport legs are allowed on the open floor and inside
// the gallery zone; a door the route opens is opened by `use(P, 'door-<anchor id>')` and asserted open on both pages; a client press
// is made within reach (the host takes a client's `use` within the item's reach + 0.75 m); the hang's let-go is the holder's B press
// read once the hanger's hang has settled.
export const SET = 'a6PumpHouse';

const PANEL = 'c-sw-a6-panel';
const EXIT = 'c-sw-a6-exit';
const CAGE_DOOR = 'A6-cage';
const OUTFALL = 'L6-near';
const DRIVE = 'a6-drive';
const GAL = 'a6-gal';
const DECK_Y = 4.4;
/** The leg-up mark (0.5 m off the open edge), the rope spot on the gallery and its foot on the floor. */
const MARK = [43.05, 69.1];
const ROPE = [43.15, 70.2];
const RUNNER = [43.15, 69.0];
/** The holder's striped spot on the bridge (facing south over the plate), the drive panel, the attendant's desk post. */
const HOLDER = [51.5, 65.6];
const PANEL_AT = [51.5, 64.42];
const POST = [61.5, 67.1];
/** The cage's plan box and the gallery switch (61) at the stair head with the deck spot a client presses it from. */
const CAGE = [49.4, 62.0, 53.6, 66.2];
const GAL_SWITCH = [56.4, 71.7];
const GAL_SWITCH_STAND = [55.5, 71.0];
const GALLERY_GROUP = 61;

/** @param {object} t the runner's helpers (scripts/e2e-ctcourse.mjs) @param {number} n the set's number */
export async function walk(t, n) {
  const { A, B, GA, GB, until, assert, waitSim, use, moveHost, moveClient, doorIndex, holdUntil, padReady, crouch, pullUp, RB } = t;

  // ---- helpers local to the set ----
  const sees = (P, re, what) => until(P, ([src]) => new RegExp(src).test(document.querySelector('.course-hud .ch-step')?.textContent ?? ''), [re.source], 15000, what);
  const ticked = (P, id) => P.evaluate((id) => !!document.querySelector(`.course-hud tr[data-step="${id}"] td.done`), id);
  const seesTicked = (P, id, what) => until(P, (id) => !!document.querySelector(`.course-hud tr[data-step="${id}"] td.done`), id, 15000, what);
  const lockedOnClient = async (cid) => GB((i) => window.__course.wire.locks.includes(i), await doorIndex(cid));
  const hasFlag = (f) => GA((f) => window.__course.state.hasFlag(f), f);
  const claimed = () => GA(() => window.__course.state.roleClaimed());
  /** A page's baked light level for a standing body at (x, y, z) (the same field the meter and the guards read). */
  const level = (P, x, y, z) => P.evaluate(([x, y, z]) => window.__app.current.world.lightField?.bodyLevel(x, y, z, 1.7) ?? -1, [x, y, z]);
  /** The attendant on the host (the one live guard in the set box): place, alert state, awareness meter. */
  const attendant = () =>
    GA(() => {
      const e = window.__app.current.enemyMgr.enemies.find((q) => q.alive && q.pos.x > 40 && q.pos.x < 64 && q.pos.z > 54 && q.pos.z < 72);
      return e ? { x: e.pos.x, z: e.pos.z, alerted: !!e.alerted, passive: !!e.passive, meter: e.meter } : null;
    });
  /** Wait on the host until the attendant is calm and inside `c`: `minX` / `maxX` (his x), `near` [x, z, r] (within r m of a
   *  point), `meterMax` (his awareness meter under it). */
  const waitAttendant = (c, timeout, what) =>
    until(A, (c) => {
      const e = window.__app.current.enemyMgr.enemies.find((q) => q.alive && q.pos.x > 40 && q.pos.x < 64 && q.pos.z > 54 && q.pos.z < 72);
      if (!e || e.alerted) return false;
      if (c.minX !== undefined && !(e.pos.x > c.minX)) return false;
      if (c.maxX !== undefined && !(e.pos.x < c.maxX)) return false;
      if (c.near && !(Math.hypot(e.pos.x - c.near[0], e.pos.z - c.near[1]) < c.near[2])) return false;
      return c.meterMax === undefined || e.meter < c.meterMax;
    }, c, timeout, what);
  /** The anchor the player on P hangs from. */
  const hanging = (P) => P.evaluate(() => { const a = window.__app.current.traversal.attach.anchor; return a ? { kind: a.kind, nx: a.nx, nz: a.nz, top: a.top } : null; });
  const nearestId = (P) => P.evaluate(() => { const g = window.__app.current; return g.interactables?.nearest(g.player.position)?.id ?? ''; });
  const feet = (P) => P.evaluate(() => { const p = window.__app.current.player.controller.pos; return [p.x, p.y, p.z]; });
  const inCage = (p) => p[0] > CAGE[0] && p[0] < CAGE[2] && p[2] > CAGE[1] && p[2] < CAGE[3];
  /** Hold the interact button (pad A) on P until `cond` holds on the host, then let go. */
  const holdA = (P, cond, arg, what, timeout = 12000) =>
    (async () => {
      await P.evaluate(() => window.__pad.set(0, 1));
      try {
        await until(A, cond, arg, timeout, what);
      } finally {
        await P.evaluate(() => window.__pad.set(0, 0));
      }
    })();
  /** (S-e2e-fix2) A real tap of A on a press row (no hold time): A down until P's context list is open on item `id`, then A up.
   *  The list runs a press row when A is let go (G5, `contextMenu.ts`), so `holdA` (A held until the result) never runs one. */
  async function tapA(P, id, what) {
    await P.evaluate(() => window.__pad.set(0, 1));
    try {
      await until(P, (id) => { const g = window.__app.current; return g.ctxMenu.state === 'active' && g.ctxMenu.sel === 0 && g.interactTarget?.id === id; }, id, 5000, what);
    } finally {
      await P.evaluate(() => window.__pad.set(0, 0));
    }
  }

  /** The host crouches on the mark and offers; the client takes the leg-up and hangs on the open edge (normal -z, 4.4 m). */
  async function hostBoostsClient(what) {
    await moveHost(MARK[0], MARK[1], 0.1, 0);
    await moveClient(MARK[0], MARK[1] - 0.8, 0.1, 0);
    await waitSim(500);
    await padReady(A);
    await padReady(B);
    await crouch(A);
    await holdUntil(A, RB, () => window.__app.current.team.state === 'offer', `${what}: the host offers a leg-up`);
    await until(B, () => !!window.__app.current.team.offer?.boost, null, 8000, `${what}: the client is offered the leg-up`);
    const boosts0 = await GB(() => window.__app.current.team.count.boosts);
    await holdUntil(B, RB, (k) => window.__app.current.team.count.boosts > k, `${what}: the client takes the leg-up`, boosts0);
    await until(B, () => window.__app.current.traversal.attach.phase === 'on' && window.__app.current.traversal.attach.anchor?.kind === 'ledge', null, 12000, `${what}: the client hangs on the ledge`);
    const a = await hanging(B);
    assert(a.top >= 4.3 && a.top <= 4.5 && a.nz < -0.9, `${what}: the client hangs on the gallery's open edge, normal -z, 4.4 m (${JSON.stringify(a)})`);
    await until(A, () => window.__app.current.team.state === 'none', null, 20000, `${what}: the booster is free again`);
  }

  /** The holder (on `H`) crouches at the striped spot and offers the hang-down; the hanger (on `G`) takes it and is lowered until
   *  the drive panel is its nearest item. */
  async function lowerToPanel(H, G, what) {
    await padReady(H);
    await padReady(G);
    await crouch(H);
    await holdUntil(H, RB, () => window.__app.current.team.state === 'hangOffer', `${what}: the holder offers the hang-down over the plate`).catch(async (e) => {
      console.error(await H.evaluate(() => { const g = window.__app.current; const c = g.player.controller; return JSON.stringify({ prompt: g.team.prompt, st: g.team.state, crouched: c.crouched, yaw: c.yaw, pos: [c.pos.x, c.pos.y, c.pos.z] }); }));
      throw e;
    });
    await until(G, () => !!window.__app.current.team.offer?.hang, null, 8000, `${what}: the hanger is offered the hang-down`);
    const hangs0 = await G.evaluate(() => window.__app.current.team.count.hangs);
    await holdUntil(G, RB, (k) => window.__app.current.team.count.hangs > k, `${what}: the hanger takes the hang-down`, hangs0);
    await until(G, () => window.__app.current.team.state === 'hanging', null, 15000, `${what}: the hanger hangs head-first in the plate`);
    await until(H, () => window.__app.current.team.state === 'hangHold', null, 8000, `${what}: the holder holds`);
    const hi = await G.evaluate(() => { const g = window.__app.current; return { y: g.player.controller.pos.y, tumble: g.player.pose.tumble, near: g.interactables?.nearest(g.player.position)?.id ?? '' }; });
    assert(hi.y > 1.5 && hi.y < DECK_Y && hi.tumble > 3, `${what}: the hanger hangs head-first under the bridge (root y ${hi.y.toFixed(2)}, tumble ${hi.tumble.toFixed(2)})`);
    assert(hi.near !== PANEL, `${what}: the panel is out of reach at the starting depth`);
    // the holder's stick lowers the partner (stick down)
    await H.evaluate(() => window.__pad.axis(1, 1));
    try {
      await until(G, (id) => window.__app.current.interactables?.nearest(window.__app.current.player.position)?.id === id, PANEL, 20000, `${what}: the holder lowers the hanger to the drive panel`);
    } finally {
      await H.evaluate(() => window.__pad.axis(1, 0));
    }
    const d = await H.evaluate(() => window.__app.current.team.hang.depth);
    assert(d > 1.5 && d <= 2.5 + 1e-6, `${what}: lowered ${d.toFixed(2)} m under the edge`);
  }

  // ---- 1. the start: the step lines, the devices, the locks, the attendant, the light ----
  console.log('  A6: the sump bay, the step lines, the drive panel');
  await moveHost(53, 55.5, 0.1, 0);
  await moveClient(52, 55.5, 0.1, 0);
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) {
    await until(P, () => /Get both of you onto the motor gallery/.test(document.querySelector('.course-hud')?.textContent ?? ''), null, 15000, `the ${tag} sees the shared step line`);
    for (const id of [PANEL, EXIT]) assert(await P.evaluate((id) => !!window.__app.current.interactables?.items.find((i) => i.id === id), id), `A6: the ${tag} has the device ${id}`);
  }
  await sees(B, /Boost your partner up/, 'A6: the client (the lead) reads the A line');
  await sees(A, /Drop the rescue line/, 'A6: the host reads the B line');
  assert(!(await claimed()), 'A6: nobody has claimed a job yet');
  assert(await lockedOnClient(OUTFALL), 'A6: the outfall door (L6 near) starts locked on the client');
  // (marlow-polish P3-1) the interlock lamp beside the L6 door starts red (its device off) on both pages
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) {
    const fl = await P.evaluate(() => JSON.stringify(window.__ctdev.debug().flagLamps));
    assert(fl === JSON.stringify([{ id: 'a6-interlock', on: false }]), `A6: the ${tag}'s interlock lamp starts red (${fl})`);
  }
  assert(await lockedOnClient(CAGE_DOOR), 'A6: the cage door starts locked on the client');
  const g0 = await attendant();
  assert(!!g0 && !g0.passive && !g0.alerted, `A6: the attendant is alive, armed and calm (${JSON.stringify(g0)})`);
  for (const [x, y, z, what] of [[MARK[0], 0, MARK[1], 'the leg-up mark'], [ROPE[0], DECK_Y, ROPE[1], 'the rope spot on the gallery']]) {
    const [la, lb] = [await level(A, x, y, z), await level(B, x, y, z)];
    assert(la >= 0 && la <= 0.24 && Math.abs(la - lb) < 0.02, `A6: ${what} reads dark and the same on both pages (host ${la.toFixed(3)}, client ${lb.toFixed(3)})`);
  }
  const [da, db] = [await level(A, 62.5, 0, 69.5), await level(B, 62.5, 0, 69.5)];
  assert(da >= 0.55 && Math.abs(da - db) < 0.02, `A6: the desk and stair foot read lit and the same on both pages (host ${da.toFixed(3)}, client ${db.toFixed(3)})`);

  // ---- 2. pass 1: the leg-up (the client claims B), the rescue line ----
  console.log('  A6: the leg-up and the rescue line');
  await waitAttendant({ minX: 55 }, 90000, 'A6: the attendant is east of x 55');
  await hostBoostsClient('A6');
  await pullUp(B, 'A6 client');
  const up = await feet(B);
  assert(up[1] > 4.2, `A6: the client stands on the gallery (y ${up[1].toFixed(2)})`);
  await until(A, () => window.__course.state.roleClaimed(), null, 10000, 'A6: the client on the gallery claims a job');
  await sees(B, /Drop the rescue line/, 'A6: the client (B, the hanger) reads the B line');
  await sees(A, /Boost your partner up/, 'A6: the host reads the A line');
  assert(!(await hasFlag(GAL)), 'A6: one player up does not set a6-gal');
  // the client holds the rope at the rope spot facing the edge; the host takes it at the foot and climbs
  await moveClient(ROPE[0], ROPE[1], DECK_Y + 0.1, Math.PI);
  await moveHost(RUNNER[0], RUNNER[1], 0.1, 0);
  await waitSim(500);
  await padReady(A);
  await padReady(B);
  await holdUntil(B, RB, () => window.__app.current.team.state === 'ropeOffer', 'A6: the client drops the rescue line').catch(async (e) => {
    console.error(await GB(() => { const g = window.__app.current; const c = g.player.controller; return JSON.stringify({ prompt: g.team.prompt, st: g.team.state, crouched: c.crouched, grounded: c.grounded, yaw: c.yaw, pos: [c.pos.x, c.pos.y, c.pos.z] }); }));
    throw e;
  });
  await until(A, () => !!window.__app.current.team.offer?.rope, null, 8000, 'A6: the host is offered the rope');
  const ropes0 = await GA(() => window.__app.current.team.count.ropes);
  await holdUntil(A, RB, (k) => window.__app.current.team.count.ropes > k, 'A6: the host takes the rope', ropes0);
  await until(B, () => window.__app.current.team.state === 'ropeHold', null, 8000, 'A6: the client holds the rope');
  const prompt = await GA(() => window.__app.current.team.prompt);
  assert(/rope/i.test(prompt ?? ''), `A6: the climber's prompt names the rope (${prompt})`);
  // (test-speed, as the old station 7) the stick lets go on the step the climber tops out
  await A.evaluate(() => {
    const st = window.__app.current;
    const t0 = st.team.count.tops;
    const orig = st.fixedUpdate.bind(st);
    st.fixedUpdate = (dt) => {
      orig(dt);
      if (st.team.count.tops > t0) {
        window.__pad.axis(1, 0);
        st.fixedUpdate = orig;
      }
    };
    window.__pad.axis(1, -1);
  });
  try {
    await until(A, () => window.__app.current.team.count.tops >= 1, null, 40000, 'A6: the host climbs the rescue line and tops out');
  } finally {
    await A.evaluate(() => window.__pad.axis(1, 0));
  }
  await until(B, () => window.__app.current.team.state === 'none', null, 8000, 'A6: the rope holder is free once the partner is up');
  await until(A, () => window.__app.current.player.controller.grounded && window.__app.current.player.controller.pos.y > 4.2, null, 10000, 'A6: the host stands on the gallery');
  await until(A, (f) => window.__course.state.hasFlag(f), GAL, 10000, 'A6: both on the gallery set a6-gal');
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await seesTicked(P, 'a6-up', `A6: the ${tag} sees the climb ticked`);
  await sees(B, /Hold the isolate key/, 'A6: the client (B) reads the hang line');
  await sees(A, /Hold your partner over the drive cabinet/, 'A6: the host (A) reads the holder line');

  // ---- 3. the bridge, the hang-down, the hold-noise check ----
  console.log('  A6: the hang-down, the buzzer');
  await moveHost(HOLDER[0], HOLDER[1], DECK_Y + 0.1, Math.PI);
  await moveClient(HOLDER[0], HOLDER[1] + 1.0, DECK_Y + 0.1, Math.PI);
  await waitSim(500);
  assert(await lockedOnClient(OUTFALL), 'A6: the outfall door is still locked');
  await lowerToPanel(A, B, 'A6');
  // with the attendant on the west half of his loop (within 4.5 m of the panel) the client holds the key about a second and lets go
  await waitAttendant({ near: [PANEL_AT[0], PANEL_AT[1], 4.5], meterMax: 0.05 }, 120000, 'A6: the attendant is within 4.5 m of the panel, calm');
  const clientId = await GB(() => window.__coop.session.selfId);
  const pulse0 = await GA((id) => window.__app.current.net.holdPulseAt?.get(id) ?? null, clientId);
  await B.evaluate(() => window.__pad.set(0, 1));
  try {
    await until(B, (id) => (window.__app.current.interactables?.items.find((i) => i.id === id)?.progress ?? 0) >= 0.9, PANEL, 8000, 'A6: the client holds the isolate key for about a second');
  } finally {
    await B.evaluate(() => window.__pad.set(0, 0));
  }
  await until(A, ([id, t0]) => { const t = window.__app.current.net.holdPulseAt?.get(id); return t !== undefined && t !== t0; }, [clientId, pulse0], 5000, "A6: the client's hold pulse reaches the host (accepted in reach)");
  await until(A, () => { const e = window.__app.current.enemyMgr.enemies.find((q) => q.alive && q.pos.x > 40 && q.pos.x < 64 && q.pos.z > 54 && q.pos.z < 72); return !!e && (e.meter > 0.1 || e.alerted); }, null, 5000, 'A6: the buzzer makes the attendant suspicious (heard on the host)');
  assert(!(await hasFlag(DRIVE)), 'A6: a one-second hold does not isolate the drive');

  // ---- 4. the hold with the attendant at his desk: a6-drive, the outfall door unlocks; pulled back up ----
  console.log('  A6: the isolate key with the attendant at his desk');
  await waitAttendant({ near: [POST[0], POST[1], 1.2], meterMax: 0.1 }, 150000, 'A6: the attendant is back at his desk and calm');
  assert((await nearestId(B)) === PANEL, 'A6: the hanging client is still at the panel');
  await holdA(B, (f) => window.__course.state.hasFlag(f), DRIVE, 'A6: the client holds the isolate key 3 s: a6-drive');
  const g1 = await attendant();
  assert(!!g1 && !g1.alerted && g1.meter < 0.1 && Math.hypot(g1.x - PANEL_AT[0], g1.z - PANEL_AT[1]) > 6, `A6: the attendant, over 6 m off, stays calm (${JSON.stringify(g1)})`);
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await seesTicked(P, 'a6-hang', `A6: the ${tag} sees the hang ticked`);
  await until(B, (i) => !window.__course.wire.locks.includes(i), await doorIndex(OUTFALL), 15000, 'A6: the client sees the outfall door unlocked');
  // (P3-1) the interlock lamp turns green on both pages
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await until(P, () => JSON.stringify(window.__ctdev.debug().flagLamps) === JSON.stringify([{ id: 'a6-interlock', on: true }]), null, 15000, `A6: the ${tag}'s interlock lamp turns green`);
  await sees(A, /interlock is green/i, 'A6: the host reads the closing line');
  await sees(B, /interlock is green/i, 'A6: the client reads the closing line');
  const pulls0 = await GB(() => window.__app.current.team.count.pulls);
  await holdUntil(B, RB, (k) => window.__app.current.team.count.pulls > k, 'A6: the client is pulled back up', pulls0);
  await until(A, () => window.__app.current.team.state === 'none', null, 8000, 'A6: the holder is free');
  await until(B, () => window.__app.current.team.state === 'none' && window.__app.current.player.controller.pos.y > 4.2 && window.__app.current.player.pose.tumble === 0, null, 10000, 'A6: the client is back on the bridge, upright');

  // ---- 5. the gallery switch from the client: 61 off on both pages, the holder's spot dark, the attendant lured ----
  console.log('  A6: the gallery switch');
  const swId = await GA(([x, z]) => { const it = window.__app.current.interactables.items.find((i) => i.kind === 'switch' && Math.hypot(i.pos.x - x, i.pos.z - z) < 0.3); return it ? it.id : null; }, GAL_SWITCH);
  assert(!!swId && swId.startsWith('switch-'), `A6: the gallery switch is a map switch at the stair head (${swId})`);
  const [h0a, h0b] = [await level(A, HOLDER[0], DECK_Y, HOLDER[1]), await level(B, HOLDER[0], DECK_Y, HOLDER[1])];
  assert(h0a >= 0.4 && Math.abs(h0a - h0b) < 0.02, `A6: the holder's spot reads lit on both pages (host ${h0a.toFixed(3)}, client ${h0b.toFixed(3)})`);
  await moveClient(GAL_SWITCH_STAND[0], GAL_SWITCH_STAND[1], DECK_Y + 0.1, Math.PI);
  const s0 = await attendant();
  const toSwitch = (s) => Math.hypot(s.x - GAL_SWITCH[0], s.z - GAL_SWITCH[1]);
  assert((await use(B, swId)) === 'ok', 'A6: the client turns the gallery switch off');
  await until(B, (g) => window.__course.wire.lights.groups.some(([q, on]) => q === g && !on), GALLERY_GROUP, 15000, 'A6: the client sees the gallery group off');
  await until(A, (g) => !window.__app.current.stealth.switchOn(g), GALLERY_GROUP, 15000, 'A6: the host sees the gallery group off');
  const [h1a, h1b] = [await level(A, HOLDER[0], DECK_Y, HOLDER[1]), await level(B, HOLDER[0], DECK_Y, HOLDER[1])];
  assert(h1a <= 0.24 && h1b <= 0.24 && Math.abs(h1a - h1b) < 0.02, `A6: the holder's spot reads dark on both pages (host ${h1a.toFixed(3)}, client ${h1b.toFixed(3)})`);
  if (s0 && !s0.alerted) await waitAttendant({ near: [GAL_SWITCH[0], GAL_SWITCH[1], Math.max(2, toSwitch(s0) - 2)] }, 20000, `A6: the attendant is lured toward the gallery switch (from ${toSwitch(s0).toFixed(1)} m)`);
  assert((await use(B, swId)) === 'ok', 'A6: the client turns the gallery switch on again');
  await until(A, (g) => window.__app.current.stealth.switchOn(g), GALLERY_GROUP, 15000, 'A6: the gallery group is back on');
  // (S-e2e-fix) the client's lamps follow the host's next `course` message (sent on the host's next fixed step after the
  // switch): read the levels once the client has it, as the off case above does (the host's switch state alone races it)
  await until(B, (g) => window.__course.wire.lights.groups.some(([q, on]) => q === g && on), GALLERY_GROUP, 15000, 'A6: the client sees the gallery group on again');
  const [h2a, h2b] = [await level(A, HOLDER[0], DECK_Y, HOLDER[1]), await level(B, HOLDER[0], DECK_Y, HOLDER[1])];
  assert(h2a >= 0.4 && Math.abs(h2a - h2b) < 0.02, `A6: the holder's spot reads lit again (host ${h2a.toFixed(3)}, client ${h2b.toFixed(3)})`);

  // ---- 6. pass 1 out: down to the L6 door while the attendant is west of x 50 ----
  console.log('  A6: out by the outfall door');
  await waitAttendant({ maxX: 50 }, 120000, 'A6: the attendant is west of x 50 (pump 3)');
  await moveHost(62.6, 61.4, 0.1, Math.PI / 2);
  await moveClient(62.6, 62.6, 0.1, Math.PI / 2);
  assert(!(await lockedOnClient(OUTFALL)), 'A6: the outfall door is open to the client');

  // ---- 7. pass 2: the restart, the cage from outside, the dropped hanger (the host) ----
  console.log('  A6: the restart and the fallback (the host drops into the cage)');
  assert(await GA(() => window.__course.restartCheckpoint()), 'A6: the host restarts at the checkpoint');
  const cp = await GA(() => { const p = window.__course.checkpointPos(); return [p.x, p.z]; });
  await until(B, ([x, z]) => { const p = window.__app.current.player.position; return Math.hypot(p.x - x, p.z - z) < 2.5; }, cp, 15000, 'A6: the restart brings the client back');
  await waitSim(2200);
  await GA(() => { window.__app.current.target.damageMul = 0; });
  assert(!(await hasFlag(DRIVE)) && !(await hasFlag(GAL)), 'A6: the restart clears a6-drive and a6-gal');
  await until(B, (i) => window.__course.wire.locks.includes(i), await doorIndex(OUTFALL), 15000, 'A6: the restart locks the outfall door again on the client');
  assert(await lockedOnClient(CAGE_DOOR), 'A6: the cage door is locked again');
  assert(!(await claimed()) && !(await ticked(A, 'a6-up')), 'A6: the restart clears the claim and the steps');
  // the client is kept unhurt on the host too (its remote body, whose spawn protection the restart just ran out), and the attendant is waited on:
  // the cage-face loop below stands the client 0.45 m off his path along z 61.2, so it starts while he is at his desk (D 4 s, then 12 s from the cage)
  await GA((id) => { const r = window.__app.current.net.remotes.get(id); r.damageMul = 0; r.protectT = 0; }, clientId);
  await waitAttendant({ near: [POST[0], POST[1], 1.5], meterMax: 0.1 }, 150000, 'A6 pass 2: the attendant is at his desk, calm, before the client walks the cage faces');
  // the client outside the cage: its own prompt never offers the devices; a forced press from the west face is refused by the host
  for (const [x, z] of [[CAGE[0] - 0.35, 64.1], [51.5, CAGE[1] - 0.35], [51.5, CAGE[3] + 0.35], [CAGE[2] + 0.35, 64.1]]) {
    await moveClient(x, z, 0.1, 0);
    await waitSim(300);
    const near = await nearestId(B);
    assert(near !== PANEL && near !== EXIT, `A6: outside the cage at (${x}, ${z}) the client is offered neither device (${near})`);
  }
  await moveClient(CAGE[0] - 0.35, 64.1, 0.1, Math.PI / 2);
  for (const id of [PANEL, EXIT]) assert((await use(B, id)) === 'ok', `A6: the client forces a press on ${id} from the west face`);
  await waitSim(1500);
  assert(!(await hasFlag(DRIVE)), 'A6: a press from outside the cage does not isolate the drive');
  assert(await lockedOnClient(CAGE_DOOR), 'A6: a press from outside the cage does not free the cage door');
  // the host claims B (first onto the gallery), the client follows; both onto the bridge, the client holds
  await moveHost(47, 70.6, DECK_Y + 0.1, Math.PI / 2);
  await until(A, () => window.__course.state.roleClaimed(), null, 10000, 'A6 pass 2: the host on the gallery claims a job');
  await sees(A, /Drop the rescue line/, 'A6 pass 2: the host reads the B line (the hanger)');
  await moveClient(48, 70.6, DECK_Y + 0.1, Math.PI / 2);
  await until(A, (f) => window.__course.state.hasFlag(f), GAL, 10000, 'A6 pass 2: both on the gallery set a6-gal');
  await moveClient(HOLDER[0], HOLDER[1], DECK_Y + 0.1, Math.PI);
  await moveHost(HOLDER[0], HOLDER[1] + 1.0, DECK_Y + 0.1, Math.PI);
  await waitSim(500);
  await lowerToPanel(B, A, 'A6 pass 2');
  await waitAttendant({ minX: 55 }, 150000, 'A6 pass 2: the attendant is east of x 55 before the drop');
  // the holder lets go (B): the host drops into the cage; the let-go is read once the hang has settled at the panel
  await waitSim(300);
  const drops0 = await GB(() => window.__app.current.team.count.drops);
  await holdUntil(B, 1, (k) => window.__app.current.team.count.drops > k || window.__app.current.team.state === 'none', 'A6 pass 2: the client lets go of the host', drops0);
  await until(A, () => window.__app.current.team.state === 'none' && window.__app.current.player.controller.grounded && window.__app.current.player.controller.pos.y < 0.3, null, 15000, 'A6 pass 2: the host lands on the cage floor');
  const land = await feet(A);
  assert(inCage(land), `A6 pass 2: the host is inside the cage (${land.map((v) => v.toFixed(2))})`);
  // the hold from the floor
  await until(A, (id) => { const g = window.__app.current; return g.interactables?.nearest(g.player.position)?.id === id; }, PANEL, 10000, 'A6 pass 2: the drive panel is in reach from the cage floor');
  // the 3 s hold buzzes to 6 m: from the floor it starts only while he is at his desk (as pass 1's)
  await waitAttendant({ near: [POST[0], POST[1], 1.2], meterMax: 0.1 }, 150000, 'A6 pass 2: the attendant is at his desk and calm before the hold from the cage floor');
  await padReady(A);
  await holdA(A, (f) => window.__course.state.hasFlag(f), DRIVE, 'A6 pass 2: the host holds the isolate key 3 s from the floor: a6-drive');
  await until(B, (i) => !window.__course.wire.locks.includes(i), await doorIndex(OUTFALL), 15000, 'A6 pass 2: the client sees the outfall door unlocked');
  // the exit release on the cabinet's back, then the door by hand, then out
  await moveHost(51.5, 62.9, 0.1, 0);
  await until(A, (id) => { const g = window.__app.current; return g.interactables?.nearest(g.player.position)?.id === id; }, EXIT, 10000, "A6 pass 2: the exit release on the cabinet's back is the host's nearest item");
  // (S-e2e-fix2) the release is a press row, not a hold row: the context list runs a press row when A is let go, so A goes
  // down, the list opens on the release, and A comes up (holding A until the unlock never ran it)
  await padReady(A);
  await tapA(A, EXIT, "A6 pass 2: the host's list opens on the exit release");
  await until(A, (cid) => !window.__course.state.locked(cid), CAGE_DOOR, 8000, 'A6 pass 2: the host presses the exit release: the cage door unlocks').catch(async (e) => {
    console.error(`A6 exit release diag ${await GA((cid) => { const g = window.__app.current; const m = g.ctxMenu; return JSON.stringify({ near: g.interactables?.nearest(g.player.position)?.id ?? null, ctx: { state: m.state, sel: m.sel, rows: m.opts.slice(0, m.count).map((o) => o.label) }, locked: window.__course.state.locked(cid), last: g.mode?.lastPress ?? null, team: g.team.state, feet: [g.player.position.x, g.player.position.z].map((n) => +n.toFixed(2)) }); }, CAGE_DOOR)}`);
    throw e;
  });
  await until(B, (i) => !window.__course.wire.locks.includes(i), await doorIndex(CAGE_DOOR), 15000, 'A6 pass 2: the client sees the cage door unlocked');
  const ci = await doorIndex(CAGE_DOOR);
  const aid = await GA((cid) => window.__app.current.world.layout.course.doors[cid], CAGE_DOOR);
  assert((await use(A, `door-${aid}`)) === 'ok', 'A6 pass 2: the host opens the cage door');
  await until(A, (i) => window.__app.current.world.doors.list[i].open > 0.5, ci, 8000, 'A6 pass 2: the cage door opens (host)');
  await until(B, (i) => window.__app.current.world.doors.list[i].open > 0.5, ci, 15000, 'A6 pass 2: the client sees the cage door open');
  await moveHost(51.5, 61.0, 0.1, Math.PI);
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await seesTicked(P, 'a6-hang', `A6 pass 2: the ${tag} sees the hang ticked`);

  // ---- to the L6 door (the runner then puts both on the pad) ----
  await moveHost(62.6, 61.4, 0.1, Math.PI / 2);
  await moveClient(62.6, 62.6, 0.1, Math.PI / 2);
  assert(!(await lockedOnClient(OUTFALL)), 'A6: the outfall door is open to the client at the end');
  for (const P of [A, B]) await until(P, () => !window.__app.current.traversal.attached && window.__app.current.team.state === 'none', null, 10000, 'A6: nobody is hanging or holding');
}
