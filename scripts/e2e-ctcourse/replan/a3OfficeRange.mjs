// J14 re-plan walk for A3 the Office Range (e2e-ctcourse parts 5-8, map ctcourseReplan; slice G-A3, STATIONS.md sections 3, 6, 8).
// Two pages: A = the host (P1), B = the client (P2). No guard in the set; one camera (cam-a3-hall, IR, 14 m). The walk:
//   1. the start: station 6 live on both pages, the cleaner gone (no live guard), the offices' doors locked on both pages, the fire door
//      locked, the camera online with its 14 m range, the station 6 step line on both pages;
//   2. station 6, the vent unlock: the host waits at the fire door (mark B, the west lobby); the client stands at the riser cupboard's
//      grille (mark A), opens it (Y, then A held: the quiet unscrew) and crawls the services crawl (the duct, stick forward) out by the
//      corridor's grille: the camera never has it (meters empty), the client claims B (the first into the corridor); the host's press on
//      the fire door's bolt from the lobby is refused, the client's from the corridor opens it on both pages; the host comes through:
//      `a3-fire` set, `a3-vent` ticks, station 7 live on both pages;
//   3. one camera retry: the client steps unjammed into the camera's view: the station retries (LANTERN's retry line reaches the client),
//      both players land on station 7's marks on both pages (A at (80.0, 10.0), B at (80.0, 11.5)), station 6 stays done (`a3-fire` still
//      set), station 7 live again, the fire door still unbolted (it is station 6's gate);
//   4. station 7, the jam relay: the host jams from the corridor's west end (80.0, 10.75), the client to the recess, the second jam, the
//      client to the east lobby (`a3-far1`); the swap: the client jams from the east post, the host to the recess and on to the east lobby:
//      `a3-far` set, `a3-jam` ticks, no retry on the way, both read the closing line;
//   5. both to the L3 door, nobody attached (the runner then puts them on the pad).
// Teleport legs are allowed on open floor (the unit test holds the geometry: tests/ctcourse/replan/a3OfficeRange.test.ts); the crawl is the
// real vent and duct controls on the client page. Written for the laptop queue: pending its first PC run.
export const SET = 'a3OfficeRange';

const CAM_ID = 'cam-a3-hall';
/** The lens (the jam target), the jam posts (the corridor's west end inside the fire door, the east lobby), the hide spot. */
const CAM = [96.6, 2.8, 10.75];
const POST_W = [80.0, 10.75];
const POST_E = [98.0, 10.75];
const HIDE = [88.6, 8.5];
/** A corridor spot in the camera's plain view (9.6 m from the lens) and the corridor's middle (the light spot). */
const SEEN = [87.0, 10.75];
const MID = [88.25, 10.75];
/** Station 6's and 7's marks (STATIONS section 3): A then B. */
const ST6 = [[77.5, 2.0, Math.PI], [78.5, 10.5, Math.PI / 2]];
const ST7 = [[80.0, 10.0], [80.0, 11.5]];
/** The fire door and its bolt gate, the offices' doors (locked for good). */
const FIRE_DOOR = 'A3-fire';
const FIRE_GATE = 'g-a3-fire';
const OFFICE_DOORS = ['A3-office1', 'A3-comm1', 'A3-comm2', 'A3-recess', 'A3-office3'];
/** Through the fire door: a spot in the a3-fire zone [79.6, 9.2, 82, 12.3] past the door's swing. */
const INSIDE = [80.6, 11.6];

/** @param {object} t the runner's helpers (scripts/e2e-ctcourse.mjs) @param {number} n the set's number */
export async function walk(t, n) {
  const { A, B, GA, GB, until, assert, waitSim, use, moveHost, moveClient, doorIndex, stepLine, dev, drawPistol, holster, aimAt, lt, padReady, P5 } = t;
  void n;

  // ---- helpers local to the set ----
  const sees = (P, re, what) => until(P, ([src]) => new RegExp(src).test(document.querySelector('.course-hud .ch-step')?.textContent ?? ''), [re.source], 15000, what);
  const stepTicked = (P, id, what) => until(P, (id) => !!document.querySelector(`.course-hud tr[data-step="${id}"] td.done`), id, 15000, what);
  const lockedOnClient = async (cid) => GB((i) => window.__course.wire.locks.includes(i), await doorIndex(cid));
  const lockedOnHost = async (cid) => GA((i) => window.__app.current.world.doors.list[i].anchor.locked, await doorIndex(cid));
  const hasFlag = (f) => GA((f) => window.__course.state.hasFlag(f), f);
  const roleOf = (p) => GA((p) => window.__course.state.roleOf(p), p);
  const stationOn = (P) => (P === A ? GA(() => window.__course.state.station()) : GB(() => window.__course.wire?.s?.st ?? -1));
  /** Station `k` is live on page P (the host's state, the client's course wire). */
  const stationLive = (P, k, what) => (P === A ? until(A, (k) => window.__course.state.station() === k, k, 15000, what) : until(B, (k) => window.__course.wire?.s?.st === k, k, 15000, what));
  const level = (P, x, z) => P.evaluate(([x, z]) => window.__app.current.world.lightField?.bodyLevel(x, 0, z, 1.7) ?? -1, [x, z]);
  const cam = async (P) => (await dev(P)).cams.find((c) => c.id === CAM_ID);
  const noDamage = (P) => P.evaluate(() => { window.__app.current.target.damageMul = 0; });
  const retries = () => GA(() => window.__course.state.restarts);
  /** The host's view of both players' feet ([x, z] each). */
  const feet = () => GA(() => { const f = window.__course.state.feet; return [[f[0], f[2]], [f[3], f[5]]]; });
  /** The client's crawl state for a timeout: attached, the anchor kind, the vent's progress, its feet, the grate. */
  const crawlDiag = () =>
    GB(() => {
      const g = window.__app.current;
      const c = g.traversal.attachCtl;
      const p = g.player.position;
      const d = g.world.level.anchors.ducts.find((q) => Math.abs(q.entry.pos.x - 77.5) < 0.1 && Math.abs(q.entry.pos.z - 1.4) < 0.1);
      return JSON.stringify({ att: g.traversal.attached, kind: c.m?.anchor?.kind ?? null, phase: c.m?.phase ?? null, vent: c.vent ? +c.vent.progress.toFixed(2) : null, feet: [p.x, p.y, p.z].map((v) => +v.toFixed(2)), grate: d ? g.world.breakables?.isOpen(`grate:${d.id}:entry`) : 'no duct', t: +g.time.toFixed(2) });
    });
  /**
   * Settle the aim on the camera itself, straight at the lens, until this page's pick is the camera. (marlow-play C1) The corridor
   * panel at x 96 sits 0.6 m in front of the lens inside the jammer's cone; a camera in the cone now wins over a light, so the
   * old aim a few thousandths of a radian under the lens is gone (the pick must be the camera aimed dead on).
   */
  async function aimPick(P, what) {
    let pick = '';
    for (let k = 0; k < 10; k++) {
      const under = 0;
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
    throw new Error(`${what}: the aim settles on the camera (pick ${pick || 'none'})`);
  }
  /** `who` (0 the host, 1 the client) holds the jammer on the camera (the pistol drawn): blind and frozen on both pages. */
  async function jamOn(who, what) {
    const P = who === 0 ? A : B;
    await lt(P, true);
    await aimAt(P, ...CAM);
    await aimPick(P, what);
    await until(A, (w) => window.__ctdev.debug().jam[w] === 'cam-a3-hall', who, 25000, `${what}: the ${who === 0 ? 'host' : 'client'} jams the camera`);
    for (const [Q, tag] of [[A, 'host'], [B, 'client']]) await until(Q, () => { const c = window.__ctdev.debug().cams.find((x) => x.id === 'cam-a3-hall'); return !!c && c.mode === 'off' && c.frozen; }, null, 20000, `${what}: the ${tag} page sees the camera blind and frozen`);
  }
  const unjam = (who) => lt(who === 0 ? A : B, false);
  const cameraBack = (what) => until(A, () => { const c = window.__ctdev.debug().cams.find((x) => x.id === 'cam-a3-hall'); return !!c && c.mode === 'online'; }, null, 30000, `${what}: the camera is back online`);
  /** The camera holds nothing on either player and no retry was counted since `r0`. */
  async function unseen(what, r0) {
    const c = await cam(A);
    assert(c.meter.every((m) => m === 0) && c.stage.every((s) => s === 0), `${what}: the camera holds nothing on either player (meters ${JSON.stringify(c.meter)}, stages ${JSON.stringify(c.stage)})`);
    assert((await retries()) === r0, `${what}: no station retry (${await retries()} of ${r0})`);
  }
  /** One jam window: `who` jams, the other (teleported) to (x, z) facing `yaw`; the cap ends it, the camera reboots. */
  async function hop(who, x, z, yaw, what, r0) {
    await until(A, (w) => window.__ctdev.debug().cool[w] === 0, who, 30000, `${what}: the jammer's cooldown is clear`);
    await jamOn(who, what);
    if (who === 0) await moveClient(x, z, 0.1, yaw);
    else await moveHost(x, z, 0.1, yaw);
    await waitSim(400);
    await unseen(what, r0);
    await until(A, (w) => window.__ctdev.debug().jam[w] === '', who, 12000, `${what}: the 5 s cap ends the jam`);
    await unjam(who);
    await cameraBack(what);
  }

  // ---- 1. the start: station 6, no guard, the offices and the fire door locked, the camera ----
  console.log('  A3 (re-plan): the start, station 6');
  await moveHost(ST6[1][0], ST6[1][1], 0.1, ST6[1][2]);
  await moveClient(ST6[0][0], ST6[0][1], 0.1, ST6[0][2]);
  await noDamage(A);
  await GA(() => { for (const r of window.__app.current.net.remotes.values()) { r.damageMul = 0; r.protectT = 0; } });
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) {
    await stationLive(P, 6, `A3: station 6 is live on the ${tag} page`);
    await sees(P, /Crawl through to open the fire door/, `A3: the ${tag} reads station 6's step line`);
    assert(!!(await cam(P)), `A3: the ${tag} has the corridor camera ${CAM_ID}`);
  }
  assert((await GA(() => window.__app.current.enemyMgr.enemies.filter((e) => e.alive).length)) === 0, 'A3: no guard in the set (the cleaner is gone)');
  for (const id of [...OFFICE_DOORS, FIRE_DOOR]) {
    assert(await lockedOnHost(id), `A3: ${id} is locked on the host`);
    assert(await lockedOnClient(id), `A3: ${id} is locked on the client`);
  }
  const cam0 = await cam(A);
  assert(cam0.mode === 'online' && cam0.range === 14, `A3: the camera is online with its 14 m range (${cam0.mode}, ${cam0.range})`);
  for (const [x, z, floor, what] of [[MID[0], MID[1], 0.6, 'the corridor'], [ST6[1][0], ST6[1][1], 0.4, 'the west lobby at the fire door']]) {
    const [la, lb] = [await level(A, x, z), await level(B, x, z)];
    assert(la >= floor && Math.abs(la - lb) < 0.01, `A3: ${what} reads lit and the same on both pages (host ${la.toFixed(3)}, client ${lb.toFixed(3)})`);
  }
  const r0 = await retries();

  // ---- 2. station 6: the client crawls, opens the fire door from the corridor side; the host comes through ----
  console.log('  A3 (re-plan): the vent unlock (the client crawls)');
  await padReady(B);
  await waitSim(300);
  // the grille: Y starts the vent, A held unscrews it (quiet), then the client is in the duct
  await P5(B, 3, 1);
  await P5(B, 0, 1);
  await waitSim(120);
  await P5(B, 3, 0);
  try {
    await until(B, () => { const c = window.__app.current.traversal.attachCtl; return window.__app.current.traversal.attached && c.m?.anchor?.kind === 'duct'; }, null, 12000, 'A3: the client unscrews the riser cupboard\'s grille and is in the crawl');
  } catch (e) {
    console.error(`A3 crawl in: ${await crawlDiag()}`);
    throw e;
  } finally {
    await P5(B, 0, 0);
  }
  // crawl (stick forward) until out of the corridor's grille, on its feet in the corridor's west end
  await B.evaluate(() => window.__pad.axis(1, -1));
  try {
    await until(B, () => { const g = window.__app.current; const p = g.player.position; return !g.traversal.attached && p.z > 9.2 && p.x > 79.7 && p.x < 82; }, null, 60000, 'A3: the client crawls out of the corridor\'s grille');
  } catch (e) {
    console.error(`A3 crawl out: ${await crawlDiag()}`);
    throw e;
  } finally {
    await B.evaluate(() => window.__pad.axis(1, 0));
  }
  await until(A, () => { const f = window.__course.state.feet; return f[5] > 9.2 && f[3] > 79.7 && f[3] < 82; }, null, 15000, 'A3: the host sees the client in the corridor\'s west end');
  await unseen('A3 crawl', r0);
  assert((await roleOf(1)) === 'b' && (await roleOf(0)) === 'a', 'A3: the crawler (the first into the corridor) is B, the partner A');
  // the bolt: refused from the lobby, opened from the corridor
  assert((await use(A, `c-${FIRE_GATE}`)) === 'ok', 'A3: the host tries the fire door\'s bolt from the lobby');
  await waitSim(300);
  assert(!(await GA((g) => window.__course.debug().gates[g], FIRE_GATE)), 'A3: the push bar refuses a press from the lobby side');
  assert(await lockedOnClient(FIRE_DOOR), 'A3: the fire door stays locked on the client');
  assert((await use(B, `c-${FIRE_GATE}`)) === 'ok', 'A3: the client presses the fire door\'s push bar from the corridor');
  await until(A, (g) => window.__course.debug().gates[g], FIRE_GATE, 8000, 'A3: the bolt gate opens');
  await until(B, (i) => !window.__course.wire.locks.includes(i), await doorIndex(FIRE_DOOR), 15000, 'A3: the client sees the fire door unlocked');
  const fireAid = await GA((cid) => window.__app.current.world.layout.course.doors[cid], FIRE_DOOR);
  assert((await use(A, `door-${fireAid}`)) === 'ok', 'A3: the host opens the fire door');
  await until(B, (i) => window.__app.current.world.doors.list[i].open > 0.5, await doorIndex(FIRE_DOOR), 15000, 'A3: the client sees the fire door open');
  await moveHost(INSIDE[0], INSIDE[1], 0.1, Math.PI / 2);
  await until(A, () => window.__course.state.hasFlag('a3-fire'), null, 15000, 'A3: the pass zone sets a3-fire (both through the fire door)');
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) {
    await stepTicked(P, 'a3-vent', `A3: the ${tag} sees station 6's step ticked`);
    await stationLive(P, 7, `A3: station 7 is live on the ${tag} page`);
  }
  assert((await retries()) === r0, 'A3: the vent unlock cost no retry');

  // ---- 3. one camera retry: both land on station 7's marks, station 6 still done ----
  console.log('  A3 (re-plan): a camera retry at station 7');
  await moveClient(SEEN[0], SEEN[1], 0.1, Math.PI / 2);
  await until(A, (r) => window.__course.state.restarts > r && window.__course.state.lastRetry?.st === 7, r0, 90000, 'A3: the camera has the client: station 7 retries');
  assert((await GA(() => window.__course.state.lastRetry.cause)) === 'seen', 'A3: the retry\'s cause is seen');
  await until(B, () => /Back to the corridor's west end/.test(window.__course.wire.rl ?? ''), null, 30000, "A3: LANTERN's station 7 retry line reaches the client");
  const roleA = (await roleOf(0)) === 'a' ? 0 : 1;
  const want = roleA === 0 ? [ST7[0], ST7[1]] : [ST7[1], ST7[0]];
  await until(A, (w) => { const f = window.__course.state.feet; return Math.hypot(f[0] - w[0][0], f[2] - w[0][1]) < 0.6 && Math.hypot(f[3] - w[1][0], f[5] - w[1][1]) < 0.6; }, want, 20000, 'A3: the host sees both players on station 7\'s marks').catch(async (e) => {
    console.error(`A3 retry marks: feet ${JSON.stringify(await feet())}, want ${JSON.stringify(want)}`);
    throw e;
  });
  await until(B, (w) => { const p = window.__app.current.player.position; return Math.hypot(p.x - w[0], p.z - w[1]) < 0.6; }, want[1], 15000, 'A3: the client page stands on its station 7 mark');
  assert(await hasFlag('a3-fire'), 'A3: station 6 is still done (a3-fire set)');
  assert((await GA(() => window.__course.state.station())) === 7 && (await stationOn(B)) === 7, 'A3: station 7 is live again on both pages');
  assert(await GA((g) => window.__course.debug().gates[g], FIRE_GATE), 'A3: the fire door stays unbolted (station 6\'s gate)');
  await cameraBack('A3 retry');
  // the retry's placement hold ends before the relay moves anyone
  await waitSim(3500);

  // ---- 4. station 7: the jam relay to the east lobby, then the swap ----
  console.log('  A3 (re-plan): the jam relay');
  await noDamage(A);
  await drawPistol(A);
  await drawPistol(B);
  await moveHost(POST_W[0], POST_W[1], 0.1, Math.PI / 2);
  await moveClient(ST7[1][0], ST7[1][1], 0.1, Math.PI / 2);
  const r1 = await retries();
  await hop(0, HIDE[0], HIDE[1], Math.PI, 'A3 relay jam 1', r1);
  await waitSim(2000);
  await unseen('A3 relay recess', r1);
  await jamOn(0, 'A3 relay jam 2');
  await moveClient(POST_E[0] + 0.5, 8.5, 0.1, -Math.PI / 2);
  await until(A, (f) => window.__course.state.hasFlag(f), 'a3-far1', 15000, 'A3: the pass zone sets a3-far1 (one player in the east lobby)');
  await until(A, () => window.__ctdev.debug().jam[0] === '', null, 12000, "A3: the host's second jam ends");
  await unjam(0);
  await cameraBack('A3 relay end');
  console.log('  A3 (re-plan): the swap');
  await moveClient(POST_E[0], POST_E[1], 0.1, -Math.PI / 2);
  await hop(1, HIDE[0], HIDE[1], Math.PI, 'A3 swap jam 1', r1);
  await waitSim(2000);
  await unseen('A3 swap recess', r1);
  await until(A, () => window.__ctdev.debug().cool[1] === 0, null, 20000, "A3: the client's cooldown ends");
  await jamOn(1, 'A3 swap jam 2');
  await moveHost(POST_E[0] + 0.5, 6.0, 0.1, -Math.PI / 2);
  await until(A, (f) => window.__course.state.hasFlag(f), 'a3-far', 15000, 'A3: the pass zone sets a3-far (both in the east lobby)');
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) {
    await stepTicked(P, 'a3-jam', `A3: the ${tag} sees station 7's step ticked`);
    await sees(P, /holding room three/, `A3: the ${tag} reads the closing line`);
  }
  assert((await retries()) === r1, 'A3: the relay and the swap cost no retry');
  assert((await GA(() => window.__course.state.station())) === 0, 'A3: no station left in the bay');
  await until(A, () => window.__ctdev.debug().jam[1] === '', null, 12000, "A3: the client's second jam ends");
  await unjam(1);
  await holster(A);
  await holster(B);

  // ---- 5. to the L3 door (the runner then puts both on the pad) ----
  console.log('  A3 (re-plan): to the L3 door');
  await moveHost(98.6, 9.0, 0.1, Math.PI / 2);
  await moveClient(98.6, 11.0, 0.1, Math.PI / 2);
  assert(!(await lockedOnClient('L3-near')), 'A3: the L3 near door is open to the client');
  for (const P of [A, B]) await until(P, () => !window.__app.current.traversal.attached, null, 10000, 'A3: nobody is attached');
  assert(/holding room three/.test(await stepLine(A)), 'A3: the host still reads the closing line');
}
