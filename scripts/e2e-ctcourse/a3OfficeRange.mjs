// A3 the Office Range: the set's e2e steps for e2e-ctcourse (part 2; set doc `docs/marlow-final/sets/a3OfficeRange.md` section 11).
// Two pages: A = the host (P1, the lead of the odd set: before any claim it reads the A lines), B = the client (P2). The client takes the B
// job by walking into the corridor first (the zone claim); a jam is the pistol's RB held while aiming (LT), see `t.lt` / `t.aimAt`.
//   1. the start: both step lines, the cleaner alive and armed, the camera online, the corridor and the offices lit and the same on both pages;
//   2. the send-back: the client stands in the corridor unjammed: the camera has it (stage 2), the host sends it back to (77.8, 10.75) on both
//      pages, LANTERN's line reaches the client, the claim made the client B (the host A, the lines swap);
//   3. the dark case: the host switches the corridor off (a3-sw-corr): the corridor reads dark on both pages and the client is sent back again
//      (the camera sees in the dark, G240); the switch back on. The switch is a lights-out lure: the host works it from the L2 holding
//      room, the client joins it after its send-back and the L2 far door is shut until the cleaner is back on his loop;
//   4. the window miss: the host jams from the west post; the camera is blind and frozen on both pages, the client in the corridor in plain view
//      is not seen (meter and stage 0, no send-back) for as long as the window lasts; when the jam ends and the camera reboots it has the client:
//      sent back (the third send-back);
//   5. the relay (steps 5-7 of the doc): the host jams from (78.5, 10.75), the client goes to the recess (88.6, 8.5), the 5 s cap ends the jam, the
//      camera is back online and does not see the client in the recess (nobody sent back, meters empty), the host's cooldown ends, the second jam,
//      the client to the east lobby: `a3-far1` and `a3-in` tick, the lines swap to the swap step;
//   6. the swap: the client jams from the east post (98.0, 10.75) (the host is the one who walks): the host to the recess, the second jam, the host
//      to the east lobby: `a3-far` and `a3-swap` tick, both read the closing line;
//   7. the lure (LIGHTING-PLAN 5): with the cleaner calm in office 2, heading west, the host turns office 1's switch off: office 1 reads dark on
//      both pages, he takes the dark office (breaker walk or light check) and walks toward the switch; the switch back on (by him or the host);
//   8. both to the L3 door, nobody hanging, the pistols holstered.
// Teleport legs are allowed on the open floor (the walks are proved by the unit tests: every hop is inside one blind window); a door the route
// opens is opened by `use(P, 'door-<anchor id>')`. The offices route (one jam, the cleaner's loop) and the takedown at the far desk are not
// walked here: the door-to-lobby exposure and the geometry are `tests/ctcourse/a3OfficeRange.test.ts`'s.
export const SET = 'a3OfficeRange';

const CAM_ID = 'cam-a3-hall';
/** The lens (the jam target) and the two posts (feet, facing along the corridor), the hide spot and the send-back spot. */
const CAM = [96.6, 2.8, 10.75];
const POST_W = [78.5, 10.75];
const POST_E = [98.0, 10.75];
const HIDE = [88.6, 8.5];
const BACK = [77.8, 10.75];
/** A corridor spot in the camera's plain view (9.6 m from the lens, inside its 14 m range) and the corridor's middle (the light spot). */
const SEEN = [87.0, 10.75];
const MID = [88.25, 10.75];
/** The office middles the light checks read, office 1's switch and the cleaner's lure target by it. */
const OFFICE1 = [82.5, 4.3];
const OFFICE2 = [88.3, 4.3];
const SW_CORR = [78.6, 12.7];
const SW_OFF1 = [79.7, 6.0];
/** (S-e2e-fix2) Two spots in the L2 holding room (x 70-76, z 7-13), clear of its far door's doorway (x 76, z 10): out of the
 *  cleaner's sight while the corridor switch lures him to the west lobby. */
const L2_HIDE = [[72.5, 8.5], [72.5, 11.5]];

/** @param {object} t the runner's helpers (scripts/e2e-ctcourse.mjs) @param {number} n the set's number */
export async function walk(t, n) {
  const { A, B, GA, GB, until, assert, waitSim, use, moveHost, moveClient, doorIndex, stepLine, dev, drawPistol, holster, aimAt, lt } = t;

  // ---- helpers local to the set ----
  const sees = (P, re, what) => until(P, ([src]) => new RegExp(src).test(document.querySelector('.course-hud .ch-step')?.textContent ?? ''), [re.source], 15000, what);
  const ticked = (P, id) => P.evaluate((id) => !!document.querySelector(`.course-hud tr[data-step="${id}"] td.done`), id);
  const lockedOnClient = async (cid) => GB((i) => window.__course.wire.locks.includes(i), await doorIndex(cid));
  /** A page's baked light level for a standing body at (x, z) (the same field the meter and the guards read). */
  const level = (P, x, z) => P.evaluate(([x, z]) => window.__app.current.world.lightField?.bodyLevel(x, 0, z, 1.7) ?? -1, [x, z]);
  const hasFlag = (f) => GA((f) => window.__course.state.hasFlag(f), f);
  const roleOf = (p) => GA((p) => window.__course.state.roleOf(p), p);
  const claimed = () => GA(() => window.__course.state.roleClaimed());
  const noDamage = (P) => P.evaluate(() => { window.__app.current.target.damageMul = 0; });
  const backs = () => GA(() => window.__ctdev.debug().sendBacks);
  const cam = async (P) => (await dev(P)).cams.find((c) => c.id === CAM_ID);
  const cleaner = () => GA(() => { const e = window.__app.current.enemyMgr.enemies.find((x) => x.alive); return e ? { x: e.pos.x, z: e.pos.z, alerted: !!e.alerted, passive: !!e.passive } : null; });
  /** (S-e2e-fix2) The live guard's brain and walk on the host (for a timeout): place, velocity, alert level, meter, the heard spot, the
   *  investigate spot, the A* route, the walker (index, wait), the nav cell and the players' feet. */
  const npcDiag = () =>
    GA(() => {
      const g = window.__app.current;
      const e = g.enemyMgr?.enemies.find((q) => q.alive);
      if (!e) return 'no live guard';
      const f = (n) => (typeof n === 'number' ? +n.toFixed(2) : n);
      const w = e.walker;
      return JSON.stringify({ t: f(g.time), pos: [f(e.pos.x), f(e.pos.z)], vel: [f(e.vel.x), f(e.vel.z)], lvl: e.aware?.level, st: e.state, meter: f(e.meter), al: !!e.alerted, pas: !!e.passive, taken: !!e.taken, link: !!e.link, stim: e.hasStimulus ? [f(e.stimulus[0]), f(e.stimulus[1])] : null, spot: [f(e.spot[0]), f(e.spot[1])], route: (e.routePath ?? []).slice(0, 4).map((p) => [f(p[0]), f(p[1])]), idx: w?.idx, wait: f(w?.waitT), look: f(w?.lookYaw), cell: e.navCell, walk: g.nav ? g.nav.isWalkable(e.navCell) : null, turn: f(e.turnT), n: g.enemyMgr.enemies.length, feet: g.playerRefs().map((r) => [f(r.feet.x), f(r.feet.z)]), ids: g.playerRefs().map((r) => r.id), tg: e.target?.id ?? null, los: !!e.los, sees: typeof e.seesIndex === 'function' ? [e.seesIndex(0), e.seesIndex(1)] : null, inc: e.incident, im: e.incMode, devs: g.enemyMgr.deviceAlerts, ss: f(e.sinceSeen) });
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
  /** The wall switch item near (x, z): `switch-<n>` in the map's order, found by where it is. */
  const switchId = (x, z) => GA(([x, z]) => window.__app.current.interactables.items.find((i) => /^switch-/.test(i.id) && Math.hypot(i.pos.x - x, i.pos.z - z) < 0.7)?.id ?? null, [x, z]);
  const groupOn = (P, g) => P.evaluate((g) => window.__app.current.world.level.lights.lights.filter((x) => x.kind !== 'flashlight' && x.group === g).every((x) => x.on), g);
  /** The client is back at the send-back spot on both pages. */
  async function sentBack(what, n0) {
    await until(A, (n0) => window.__ctdev.debug().sendBacks > n0, n0, 90000, `${what}: the camera has the client and it is sent back`);
    await until(B, ([x, z]) => { const p = window.__app.current.player.position; return Math.hypot(p.x - x, p.z - z) < 0.6; }, BACK, 15000, `${what}: the client page stands at the send-back spot`);
    await until(A, ([x, z]) => { const r = window.__app.current.net.remotes.values().next().value; return Math.hypot(r.feet.x - x, r.feet.z - z) < 0.8; }, BACK, 15000, `${what}: the host sees the client at the send-back spot`);
  }
  /**
   * (S-e2e-fix) Settle the aim on the camera itself: every fixed electric lamp is a jam target too and the pick is the target
   * nearest the aim, and from the west post the corridor panel at x 96 (0.6 m in front of the lens, 0.15 m higher) is 0.6 deg
   * from the lens. Aim from the game camera's own eye (what the pick reads) a few thousandths of a radian under the lens (the
   * panel is above it; 0.003 rad is 5 cm at the west post), lower on each retry, until this page's pick is the camera.
   */
  async function aimPick(P, what) {
    let pick = '';
    for (let k = 0; k < 10; k++) {
      const under = 0.003 * (1 + Math.min(k, 4));
      await P.evaluate(([x, y, z, under]) => {
        const c = window.__app.current.player.cam;
        const p = c.gamePos;
        const dx = x - p.x, dy = y - p.y, dz = z - p.z;
        c.yaw = Math.atan2(dx, dz);
        c.pitch = Math.atan2(dy, Math.hypot(dx, dz)) - under;
      }, [...CAM, under]);
      await waitSim(120);
      pick = await P.evaluate(() => window.__ctdev?.localPick ?? '');
      if (pick === CAM_ID) return;
    }
    throw new Error(`${what}: the aim settles on the camera (pick ${pick || 'none'}; ${await jamDiag(P, P === A ? 0 : 1)})`);
  }
  /** (S-e2e-fix) The jam state for a timeout: the host's jam / cooldown / device phase, the page's pick, eye and aim. */
  const jamDiag = (P, who) =>
    Promise.all([
      GA((w) => { const g = window.__app.current; const d = window.__ctdev.debug(); const c = d.cams.find((x) => x.id === 'cam-a3-hall'); const e = g.enemyMgr?.enemies.find((q) => q.alive); return { jam: d.jam, cool: d.cool, cam: c ? { mode: c.mode, jam: c.jam, frozen: c.frozen } : null, who: w, restarts: g.mode?.restarts ?? null, hp: g.playerRefs().map((r) => r.target.health?.hp ?? null), cleaner: e ? { x: +e.pos.x.toFixed(2), z: +e.pos.z.toFixed(2), alerted: !!e.alerted } : null }; }, who),
      P.evaluate(() => {
        const g = window.__app.current;
        const c = g.player.cam;
        const f = (v) => [v.x, v.y, v.z].map((n) => +n.toFixed(3));
        const st = g.player.stance;
        const pad = navigator.getGamepads?.()?.[0];
        return {
          pick: window.__ctdev?.localPick ?? null, eye: f(c.gamePos), fwd: f(c.forward), feet: f(g.player.controller.pos), ads: g.player.ads, adsWanted: g.player.adsWanted, draw: g.weapons.drawPhase, team: g.team.state,
          stance: st ? { state: st.state, base: st.base, latch: st.aimLatch, block: st.aimBlock, susp: st.suspended } : null, adsDown: window.__app.input?.state?.down?.('ads') ?? null,
          lt: pad?.buttons?.[6]?.value ?? null, rb: pad?.buttons?.[5]?.value ?? null, wheel: g.gadgets?.wheelOpen ?? null, ctx: g.ctxMenu?.state ?? null, blank: g.player.inputBlank, landT: g.player.controller.landT, traverse: g.player.pose.traverse, susp: g.player.weaponSuspend, time: +g.time.toFixed(2),
        };
      }),
    ]).then((x) => JSON.stringify(x));
  /** (S-e2e-fix) The pass zones' state for a timeout: each A3 zone's hallway state per player, both players' feet on the host, the flags, the camera. */
  const zoneDiag = () =>
    GA(() => {
      const g = window.__app.current;
      const d = window.__ctdev.debug();
      const zs = window.__ctdev.zones ?? [];
      const f = (v) => [v.x, v.y, v.z].map((n) => +n.toFixed(2));
      const refs = g.playerRefs();
      const c = d.cams.find((x) => x.id === 'cam-a3-hall');
      const zones = zs.map((z, i) => ({ z, i })).filter(({ z }) => z.id.startsWith('a3-')).map(({ z, i }) => ({ id: z.id, hall: [d.hall[i * 2], d.hall[i * 2 + 1]], hold: [d.hallHold[i * 2], d.hallHold[i * 2 + 1]], set: window.__course.state.hasFlag(z.flag) }));
      const e = g.enemyMgr?.enemies.find((q) => q.alive);
      return JSON.stringify({ zones, feet: refs.map((r) => f(r.feet)), alive: refs.map((r) => r.target.alive), hp: refs.map((r) => r.target.health?.hp ?? null), restarts: g.mode?.restarts ?? null, cleaner: e ? { at: f(e.pos), alerted: !!e.alerted, meter: e.meter } : null, cam: c ? { mode: c.mode, stage: c.stage, meter: c.meter } : null, jam: d.jam, backs: d.sendBacks, t: +g.time.toFixed(2) });
    });
  /** The host or the client holds the jammer on the camera from its post (the pistol is drawn). `who` 0 = the host, 1 = the client. */
  async function jamOn(who, what) {
    const P = who === 0 ? A : B;
    await lt(P, true);
    await aimAt(P, ...CAM);
    await aimPick(P, what);
    await until(A, (w) => window.__ctdev.debug().jam[w] === 'cam-a3-hall', who, 25000, `${what}: the ${who === 0 ? 'host' : 'client'} jams the camera`).catch(async (e) => {
      console.error(`${what}: jam diag ${await jamDiag(P, who)}`);
      throw e;
    });
    for (const [Q, tag] of [[A, 'host'], [B, 'client']]) await until(Q, () => { const c = window.__ctdev.debug().cams.find((x) => x.id === 'cam-a3-hall'); return !!c && c.mode === 'off' && c.frozen; }, null, 20000, `${what}: the ${tag} page sees the camera blind and frozen`);
  }
  /** Let go of the jammer: RB off first, then LT. */
  const unjam = (who) => lt(who === 0 ? A : B, false);
  /** Wait until the camera is back online (the jam ended, the 1.5 s reboot over) on the host. */
  const cameraBack = (what) => until(A, () => { const c = window.__ctdev.debug().cams.find((x) => x.id === 'cam-a3-hall'); return !!c && c.mode === 'online'; }, null, 30000, `${what}: the camera is back online`);
  /** No camera meter holds anything (nobody is seen), and the send-back count is `n0`. */
  async function unseen(what, n0) {
    const c = await cam(A);
    assert(c.meter.every((m) => m === 0) && c.stage.every((s) => s === 0), `${what}: the camera holds nothing on either player (meters ${JSON.stringify(c.meter)}, stages ${JSON.stringify(c.stage)})`);
    assert((await backs()) === n0, `${what}: nobody was sent back (${await backs()} of ${n0})`);
  }

  // ---- 1. the start: the step lines, the cleaner, the camera, the light ----
  console.log('  A3: the lobby, the step lines, the camera, the cleaner');
  await moveHost(77.2, 9.6, 0.1, Math.PI / 2);
  await moveClient(77.2, 11.6, 0.1, Math.PI / 2);
  assert(!(await lockedOnClient('L2-far')), 'A3: the L2 far door is open to the client');
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) {
    await until(P, () => /Jam the camera for each other/.test(document.querySelector('.course-hud')?.textContent ?? ''), null, 15000, `the ${tag} sees the shared step line`);
    assert(!!(await cam(P)), `A3: the ${tag} has the corridor camera ${CAM_ID}`);
  }
  // nobody has claimed: the lead of the odd set (the host) reads the A line, the client the B line
  await sees(A, /Hold the jammer on the camera/, 'A3: the host (the lead) reads the A line');
  await sees(B, /Move on the jam/, 'A3: the client reads the B line');
  assert(!(await claimed()), 'A3: nobody has claimed a job yet');
  const c0 = await cleaner();
  assert(!!c0 && !c0.passive && c0.z < 8.7 && c0.x > 79.6 && c0.x < 97, `A3: the cleaner is alive, armed and in the offices (${JSON.stringify(c0)})`);
  const cam0 = await cam(A);
  assert(cam0.mode === 'online' && cam0.range === 14, `A3: the camera is online with its 14 m range (${cam0.mode}, ${cam0.range})`);
  for (const [x, z, floor, what] of [[MID[0], MID[1], 0.6, 'the corridor'], [OFFICE1[0], OFFICE1[1], 0.4, 'office 1'], [OFFICE2[0], OFFICE2[1], 0.4, 'office 2'], [BACK[0], BACK[1], 0.4, 'the west lobby']]) {
    const [la, lb] = [await level(A, x, z), await level(B, x, z)];
    assert(la >= floor && Math.abs(la - lb) < 0.01, `A3: ${what} reads lit and the same on both pages (host ${la.toFixed(3)}, client ${lb.toFixed(3)})`);
  }
  // ---- 1b. (S10, walk M1 / M2) the hall camera is bulletproof; a restart after a kill is a full reset ----
  console.log('  A3: the armoured camera, the restart after a kill');
  const shots = await GA((id) => {
    const g = window.__app.current;
    const c = g.security.cameras.find((q) => q.def.id === id);
    const V = g.player.position.constructor;
    // two rounds along the camera's axis through its housing (the host's camera kill path)
    for (let i = 0; i < 2; i++) g.security.shotRay(new V(c.x - 6, c.y, c.z), new V(c.x + 1, c.y, c.z));
    return { mode: c.mode, ric: g.security.ricochets };
  }, CAM_ID);
  assert(shots.mode === 'online' && shots.ric >= 2, `A3: the hall camera survives two shots (ricochets) (${JSON.stringify(shots)})`);
  await GA(() => {
    const g = window.__app.current;
    const e = g.enemyMgr.enemies.find((q) => q.alive);
    const V = g.player.position.constructor;
    e.applyDamage({ amount: 99999, point: e.pos.clone(), dir: new V(0, 0, 1), part: 'body', kind: 'bullet', attackerTeam: 'player', attackerId: 'test', sourcePos: e.pos.clone(), impulse: 1 });
    // a camera broken some other way comes back with the restart too
    g.security.cameras.find((q) => q.def.id === 'cam-a3-hall').destroy();
  });
  await until(A, () => window.__app.current.enemyMgr.bodies.length > 0 && !window.__app.current.enemyMgr.enemies.some((q) => q.alive), null, 10000, 'A3: the cleaner is down, his body on the floor');
  assert(await GA(() => window.__course.restartCheckpoint()), 'A3: the host restarts at the checkpoint after the kill');
  const cpA3 = await GA(() => { const p = window.__course.checkpointPos(); return [p.x, p.z]; });
  await until(B, ([x, z]) => { const p = window.__app.current.player.position; return Math.hypot(p.x - x, p.z - z) < 2.5; }, cpA3, 15000, 'A3: the restart brings the client back');
  await waitSim(3000);
  // the respawn's 2 s spawn protection ends on a wall-clock timer (it sets damageMul back to 1): let it pass before `noDamage` below
  await new Promise((r) => setTimeout(r, 2300));
  const fresh = await GA(() => {
    const em = window.__app.current.enemyMgr;
    const live = em.enemies.filter((q) => q.alive);
    return { live: live.length, all: em.enemies.length, bodies: em.bodies.length, alerted: live.some((q) => q.alerted), caution: live.map((q) => em.cautionOf(q)), cam: window.__app.current.security.cameras.find((q) => q.def.id === 'cam-a3-hall').mode };
  });
  assert(fresh.live === 1 && fresh.all === 1 && fresh.bodies === 0, `A3: the restart leaves one fresh cleaner and no body (${JSON.stringify(fresh)})`);
  assert(!fresh.alerted && fresh.caution.every((c) => c === 0), `A3: the new cleaner is calm, not cautious (${JSON.stringify(fresh)})`);
  assert(fresh.cam === 'online', `A3: the restart repairs the camera (${fresh.cam})`);
  // the client: the old body gone (its kept ragdolls) and one guard drawn (CoopClient's private maps, read by the test)
  await until(B, () => { const n = window.__app.current.net; return !!n && n.kept.size === 0 && n.puppets.size === 1; }, null, 15000, 'A3: the client has no old body and one guard');
  await moveHost(77.2, 9.6, 0.1, Math.PI / 2);
  await moveClient(77.2, 11.6, 0.1, Math.PI / 2);
  // (S-e2e-fix) both players unhurt for the set. The runner's `damageMul = 0` at the match start does not hold for a part
  // that starts at set 3: the bay-N start respawns the host after it, and the respawn's 2 s spawn protection ends on a
  // wall-clock timer at damageMul 1 (`gameState.ts` respawn). Step 3's corridor switch is a lights-out lure: the armed
  // cleaner walks through office 1's lobby door to the switch in the west lobby, meets the host at the west post and
  // shoots; the downed host cannot aim (relay jam 1 timed out), and once out of revive time the bay restarts at L2
  // (desktop runs: both players back in the L2 room, every A3 flag cleared, at "the pass zone sets a3-far"). The client's
  // copy on the host is kept unhurt as in A6.
  await noDamage(A);
  await GA(() => { for (const r of window.__app.current.net.remotes.values()) { r.damageMul = 0; r.protectT = 0; } });
  // (S-e2e-fix) a host-step watch for the first hurt / downed player in the set (read at a pass-zone timeout)
  const hurtKey = await t.onHostStep(A, (g) => {
    const refs = g.playerRefs();
    const i = refs.findIndex((r) => !r.target.alive || (r.target.health?.hp ?? 100) < 100);
    if (i < 0) return null;
    const e = g.enemyMgr?.enemies.find((q) => q.alive);
    const f = (v) => [v.x, v.y, v.z].map((n) => +n.toFixed(2));
    return { who: i, hp: refs.map((r) => r.target.health?.hp ?? null), alive: refs.map((r) => r.target.alive), feet: refs.map((r) => f(r.feet)), cleaner: e ? { at: f(e.pos), alerted: !!e.alerted } : null, t: +g.time.toFixed(2) };
  });
  const hurt = () => GA((k) => JSON.stringify(window.__hostStep?.res?.[k] ?? 'nobody hurt'), hurtKey);
  await drawPistol(A);
  await drawPistol(B);

  // ---- 2. the send-back: the client unjammed in the corridor ----
  console.log('  A3: the camera sends an unjammed player back');
  let n0 = await backs();
  await moveClient(SEEN[0], SEEN[1], 0.1, Math.PI / 2);
  await sentBack('A3 send-back', n0);
  await until(B, () => /The camera had you/.test(window.__course.wire.rl ?? ''), null, 90000, "A3: LANTERN's send-back line reaches the client");
  assert(await claimed(), 'A3: walking into the corridor first claimed a job');
  assert((await roleOf(1)) === 'b' && (await roleOf(0)) === 'a', 'A3: the client is B (the first into the corridor), the host A');
  await sees(B, /Move on the jam/, 'A3: the client reads the B line');
  await sees(A, /Hold the jammer on the camera/, 'A3: the host reads the A line');

  // ---- 3. the dark case: the corridor off, the camera still sees ----
  console.log('  A3: the dark corridor does not hide a player from the camera');
  const swCorr = await switchId(SW_CORR[0], SW_CORR[1]);
  assert(!!swCorr, `A3: the corridor switch is a map switch item (${swCorr})`);
  // (S-e2e-fix2) the switch off is a lights-out lure: the cleaner walks to the switch in the west lobby (about 14 s from his
  // loop). Players left standing there were seen: on the desktop he went to combat with the host at (77.2, 9.6) and the client
  // at the send-back spot and stayed in a fight / search loop for the whole 150 s step-4 wait (his `alerted` flag is the
  // combat level only, so a passing check read his searches as calm and step 7's lure could fall on a search, which ignores
  // a heard lure: the laptop's "the cleaner walks toward office 1's switch" timeout). The host works the switch from the L2
  // holding room (a test use, no reach), the client follows after its send-back, and the L2 far door is shut behind them
  // until he is back on his loop.
  await moveHost(L2_HIDE[0][0], L2_HIDE[0][1], 0.1, Math.PI / 2);
  assert((await use(A, swCorr)) === 'ok', 'A3: the host turns the corridor switch off');
  await until(A, () => !window.__app.current.stealth.switchOn(30), null, 15000, 'A3: the host sees group 30 off');
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) {
    await until(P, (g) => window.__app.current.world.level.lights.lights.filter((x) => x.kind !== 'flashlight' && x.group === g).every((x) => !x.on), 30, 15000, `A3: the ${tag} sees the corridor lamps off`);
    const l = await level(P, MID[0], MID[1]);
    assert(l <= 0.24, `A3: the corridor reads dark on the ${tag} page (${l.toFixed(3)})`);
  }
  n0 = await backs();
  await waitSim(3500);
  await moveClient(SEEN[0], SEEN[1], 0.1, Math.PI / 2);
  await sentBack('A3 dark send-back', n0);
  assert((await level(B, SEEN[0], SEEN[1])) <= 0.24, 'A3: the client was sent back from a dark corridor (the camera sees in the dark)');
  await moveClient(L2_HIDE[1][0], L2_HIDE[1][1], 0.1, Math.PI / 2);
  const l2Far = await doorIndex('L2-far');
  const l2Aid = await GA((cid) => window.__app.current.world.layout.course.doors[cid], 'L2-far');
  // (a motorised far door may already have shut by itself: only an open one is closed)
  if (await GA((i) => window.__app.current.world.doors.list[i].target !== 0, l2Far)) assert((await use(A, `door-${l2Aid}`)) === 'ok', 'A3: the host shuts the L2 far door on both players');
  await until(A, (i) => { const d = window.__app.current.world.doors.list[i]; return d.target === 0 && d.open < 0.05; }, l2Far, 5000, 'A3: the L2 far door is shut (host)').catch(async (e) => {
    console.error(`A3 L2 door diag ${await GA((i) => { const g = window.__app.current; const d = g.world.doors.list[i]; return JSON.stringify({ target: d.target, open: d.open, locked: d.anchor.locked, leaf: d.anchor.leaf, by: d.by, feet: g.playerRefs().map((r) => [r.feet.x, r.feet.z].map((n) => +n.toFixed(2))) }); }, l2Far)}`);
    throw e;
  });
  assert((await use(A, swCorr)) === 'ok', 'A3: the host turns the corridor switch on again');
  await until(A, () => window.__app.current.stealth.switchOn(30), null, 15000, 'A3: group 30 is back on');
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await until(P, (g) => window.__app.current.world.level.lights.lights.filter((x) => x.kind !== 'flashlight' && x.group === g).every((x) => x.on), 30, 15000, `A3: the ${tag} sees the corridor lamps on`);

  // ---- 4. the window miss: blind while jammed, seen once the camera is back ----
  console.log('  A3: a jam window that runs out');
  await waitSim(3500);
  // (S-e2e-fix) the corridor switch lured the cleaner to the west lobby (lights out): the jam posts wait until he is calm and
  // back on his office loop
  // (S-e2e-fix2) calm = back on his loop (unaware or cooldown): `alerted` is the combat level only, so a guard still searching
  // (60 s, ALERT.searchTime) or investigating read as calm
  await traced('A3 calm', until(A, () => { const e = window.__app.current.enemyMgr.enemies.find((q) => q.alive); return !e || ((e.aware.level === 'unaware' || e.aware.level === 'cooldown') && e.pos.x > 79.6 && e.pos.z < 8.7); }, null, 150000, 'A3: the cleaner is calm and back in the offices after the corridor lure'));
  // (the start's damage-off can be undone by the bay-N respawn's wall-clock 2 s timer: set again, seconds later)
  await noDamage(A);
  assert((await GA(() => window.__app.current.target.health.hp)) === 100, 'A3: the host is unhurt before the jam posts');
  // (guard-ai S23 A3 triage) the cleaner's first combat from here on: where he is, who he targets and sees, both players
  const alertKey = await t.onHostStep(A, (g) => {
    const e = g.enemyMgr?.enemies.find((q) => q.alive);
    if (!e || !e.alerted) return null;
    const f = (n) => +n.toFixed(2);
    return { t: f(g.time), pos: [f(e.pos.x), f(e.pos.z)], yaw: f(e.yaw), ids: g.playerRefs().map((r) => r.id), feet: g.playerRefs().map((r) => [f(r.feet.x), f(r.feet.z)]), tg: e.target?.id ?? null, los: !!e.los, sees: typeof e.seesIndex === 'function' ? [e.seesIndex(0), e.seesIndex(1)] : null, inc: e.incident, im: e.incMode, devs: g.enemyMgr.deviceAlerts };
  });
  await moveHost(POST_W[0], POST_W[1], 0.1, Math.PI / 2);
  await waitSim(500);
  n0 = await backs();
  await jamOn(0, 'A3 window miss');
  await moveClient(MID[0], MID[1], 0.1, Math.PI / 2);
  await waitSim(600);
  const dj = await cam(A);
  assert(dj.mode === 'off' && dj.frozen && dj.jam >= 1, `A3: the jam blinds and freezes the camera (${dj.mode}, jam phase ${dj.jam})`);
  await unseen('A3 jammed', n0);
  assert((await cam(B)).mode === 'off', 'A3: the client page sees the blind camera too');
  // the cap ends the held jam, the camera reboots and then has the client standing in the corridor
  await until(A, () => window.__ctdev.debug().jam[0] === '', null, 12000, "A3: the 5 s cap ends the host's held jam");
  await unjam(0);
  await cameraBack('A3 window miss');
  await sentBack('A3 window miss', n0);

  // ---- 5. the relay: jam, the client to the recess, jam again, the client to the far lobby ----
  console.log('  A3: the relay');
  await until(A, () => window.__ctdev.debug().cool[0] === 0, null, 20000, "A3: the host's cooldown is over");
  // the client's 3 s send-back hold from step 4 ends before the relay moves it (S34-check should-fix 2)
  await waitSim(3500);
  n0 = await backs();
  await jamOn(0, 'A3 relay jam 1');
  await moveClient(HIDE[0], HIDE[1], 0.1, Math.PI);
  await waitSim(400);
  await unseen('A3 relay jam 1', n0);
  await until(A, () => window.__ctdev.debug().jam[0] === '', null, 12000, "A3: the 5 s cap ends the host's jam");
  await unjam(0);
  await cameraBack('A3 relay');
  // the camera is live again with the client in the recess and the host cooling down: it holds nothing on either player
  await waitSim(2000);
  await unseen('A3 relay recess', n0);
  assert((await cam(A)).mode === 'online', 'A3: the camera is live while the client waits in the recess');
  await until(A, () => window.__ctdev.debug().cool[0] === 0, null, 20000, "A3: the host's cooldown ends");
  await jamOn(0, 'A3 relay jam 2');
  await moveClient(POST_E[0] + 0.5, 8.5, 0.1, -Math.PI / 2);
  await until(A, (f) => window.__course.state.hasFlag(f), 'a3-far1', 15000, 'A3: the pass zone sets a3-far1 (one player in the east lobby)').catch(async (e) => {
    console.error(`A3 a3-far1: zone diag ${await zoneDiag()}; hurt ${await hurt()}`);
    throw e;
  });
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await until(P, () => !!document.querySelector('.course-hud tr[data-step="a3-in"] td.done'), null, 15000, `A3: the ${tag} sees the relay step ticked`);
  assert((await backs()) === n0, 'A3: the relay cost no send-back');
  // (guard-ai S23 A3 triage) the guard trace on a timeout: who he targets and sees, his incident
  await traced('A3 swap line', until(B, () => /Good\. Now the other way round/.test(window.__course.wire.rl ?? ''), null, 90000, "A3: LANTERN's 'the other way round' line reaches the client")).catch(async (e) => {
    console.error(`A3 swap line: first alert since step 4 ${await GA((k) => JSON.stringify(window.__hostStep?.res?.[k] ?? 'none'), alertKey)}`);
    throw e;
  });
  await t.offHostStep(A, alertKey);
  await sees(B, /Jam the camera from the far lobby/, 'A3: the client (B) reads the swap line');
  await sees(A, /Move on your partner's jam/, 'A3: the host (A) reads the swap line');
  assert(!(await ticked(A, 'a3-swap')), 'A3: the swap is not done yet');
  await until(A, () => window.__ctdev.debug().jam[0] === '', null, 12000, "A3: the host's second jam ends");
  await unjam(0);
  await cameraBack('A3 relay end');

  // ---- 6. the swap: the client jams from the east post, the host walks ----
  console.log('  A3: the swap');
  await moveHost(POST_W[0], POST_W[1], 0.1, Math.PI / 2);
  await moveClient(POST_E[0], POST_E[1], 0.1, -Math.PI / 2);
  await until(A, () => window.__ctdev.debug().cool[1] === 0, null, 30000, "A3: the client's cooldown is clear");
  n0 = await backs();
  await jamOn(1, 'A3 swap jam 1');
  await moveHost(HIDE[0], HIDE[1], 0.1, Math.PI);
  await waitSim(400);
  await unseen('A3 swap jam 1', n0);
  await until(A, () => window.__ctdev.debug().jam[1] === '', null, 12000, "A3: the 5 s cap ends the client's jam");
  await unjam(1);
  await cameraBack('A3 swap');
  await waitSim(2000);
  await unseen('A3 swap recess', n0);
  await until(A, () => window.__ctdev.debug().cool[1] === 0, null, 20000, "A3: the client's cooldown ends");
  await jamOn(1, 'A3 swap jam 2');
  await moveHost(POST_E[0] + 0.5, 6.0, 0.1, -Math.PI / 2);
  await until(A, (f) => window.__course.state.hasFlag(f), 'a3-far', 15000, 'A3: the pass zone sets a3-far (both in the east lobby)').catch(async (e) => {
    console.error(`A3 a3-far: zone diag ${await zoneDiag()}; hurt ${await hurt()}`);
    throw e;
  });
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) {
    await until(P, () => !!document.querySelector('.course-hud tr[data-step="a3-swap"] td.done'), null, 15000, `A3: the ${tag} sees the swap step ticked`);
    await sees(P, /holding room three/, `A3: the ${tag} reads the closing line`);
  }
  assert((await backs()) === n0, 'A3: the swap cost no send-back');
  assert((await hasFlag('a3-far1')) && (await hasFlag('a3-far')), 'A3: both pass flags are set');
  await until(A, () => window.__ctdev.debug().jam[1] === '', null, 12000, "A3: the client's second jam ends");
  await unjam(1);
  await holster(A);
  await holster(B);

  // ---- 7. the lure: office 1's switch off with the cleaner calm in office 2 ----
  console.log('  A3: the office switch lures the cleaner');
  const sw1 = await switchId(SW_OFF1[0], SW_OFF1[1]);
  assert(!!sw1, `A3: office 1's switch is a map switch item (${sw1})`);
  // (S-e2e-fix2) on his loop (unaware or cooldown), not merely out of combat: a searching guard ignores a heard lure
  // (`alertState.ts`: 'searching' only times out; `heard` moves him from unaware, cooldown, suspicious and investigating)
  // (fix 4b, after train/30) and on his loop's leg back west (walker index 6: office 3 -> office 2 -> office 1), so office 1's lamps
  // come into his view: the coordinated lights-out (guard-ai S2) lures only a guard who saw the lamps go, and a calm guard finds a dark
  // fixture later only in his focused cone (guard-ai S15 late discovery). The position-only wait took him on the laptop as he came
  // back into office 2 through the recess door from a look at the east post, facing south: he saw nothing and walked on east.
  await traced('A3 office 2', until(A, () => { const e = window.__app.current.enemyMgr.enemies.find((q) => q.alive); return !!e && (e.aware.level === 'unaware' || e.aware.level === 'cooldown') && e.incident < 0 && e.breakerGroup < 0 && e.walker?.idx === 6 && e.pos.x > 85.8 && e.pos.x < 90.8 && e.pos.z < 8.5; }, null, 150000, 'A3: the cleaner is calm in office 2, heading west'));
  const d0 = await cleaner();
  const dist = (e) => Math.hypot(e.x - SW_OFF1[0], e.z - SW_OFF1[1]);
  assert((await use(A, sw1)) === 'ok', 'A3: the host turns office 1\'s switch off');
  await until(A, () => !window.__app.current.stealth.switchOn(31), null, 15000, 'A3: group 31 is off on the host');
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) {
    await until(P, (g) => window.__app.current.world.level.lights.lights.filter((x) => x.kind !== 'flashlight' && x.group === g).every((x) => !x.on), 31, 15000, `A3: the ${tag} sees office 1's lamps off`);
    const l = await level(P, OFFICE1[0], OFFICE1[1]);
    assert(l <= 0.24, `A3: office 1 reads dark on the ${tag} page (${l.toFixed(3)})`);
  }
  const lit2 = [await level(A, OFFICE2[0], OFFICE2[1]), await level(B, OFFICE2[0], OFFICE2[1])];
  assert(lit2.every((l) => l >= 0.4), `A3: office 2 stays lit on both pages (${lit2.map((l) => l.toFixed(2))})`);
  // (fix 4b) the lure itself, not only his loop: he takes the dark office (the breaker walk to its switch, or a light check) and
  // closes on the switch; a reset he finishes first (the circuit back on by his hand) counts
  await GA(() => { window.__a3Lure = false; });
  await traced('A3 lure', until(A, ([x, z, d]) => { const g = window.__app.current; const e = g.enemyMgr.enemies.find((q) => q.alive); if (!e) return false; if (e.breakerGroup === 31 || e.incident >= 0) window.__a3Lure = true; const r = Math.hypot(e.pos.x - x, e.pos.z - z); return window.__a3Lure && (r < d - 3 || r < 3 || g.stealth.switchOn(31)); }, [SW_OFF1[0], SW_OFF1[1], dist(d0)], 45000, `A3: the cleaner takes office 1's dark lamps and walks toward its switch (from ${dist(d0).toFixed(1)} m)`));
  // (fix 4b) he may have turned it back on himself (the breaker walk); else the host does
  if (!(await GA(() => window.__app.current.stealth.switchOn(31)))) assert((await use(A, sw1)) === 'ok', 'A3: the host turns office 1\'s switch on again');
  await until(A, () => window.__app.current.stealth.switchOn(31), null, 15000, 'A3: group 31 is back on');
  await until(B, (g) => window.__app.current.world.level.lights.lights.filter((x) => x.kind !== 'flashlight' && x.group === g).every((x) => x.on), 31, 15000, "A3: the client sees office 1's lamps on");

  // ---- 8. to the L3 door (the runner then puts both on the pad) ----
  console.log('  A3: to the L3 door');
  await noDamage(A);
  await moveHost(98.6, 9.0, 0.1, Math.PI / 2);
  await moveClient(98.6, 11.0, 0.1, Math.PI / 2);
  assert(!(await lockedOnClient('L3-near')), 'A3: the L3 near door is open to the client');
  for (const P of [A, B]) await until(P, () => !window.__app.current.traversal.attached, null, 10000, 'A3: nobody is hanging');
  assert(/holding room three/.test(await stepLine(A)), 'A3: the host still reads the closing line');
  await t.offHostStep(A, hurtKey);
}
