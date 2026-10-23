// A5 the Substation: the set's e2e steps for e2e-ctcourse (part 3; set doc `docs/marlow-final/sets/a5Substation.md` section 11).
// Two pages: A = the host (P1), B = the client (P2). A5 is an odd set: the lead (the host) reads A. The client is thrown and takes B
// by the inner-zone claim (the swap rule's own answer, now claimed: the assert is that the claim holds after the throw).
//   1. the start at L4's far door: the step line (host A, client B), the beams on and IR (night vision only), the L5 door locked
//      (the flag gate), the patrol armed, the floodlit strip lit and the same on both pages;
//   2. both wait behind the inner wall's south run (out of his sight) until the patrol leaves R4 heading west (route index 3 -> 0);
//   3. the throw: the host on the mark, the client on the runner's spot; the client lands within 0.5 m of (56, 36) in the dark
//      pocket: `a5-in1` set, `a5-throw` ticked on both pages, the claim (client B), no beam touched, no alarm stage;
//   4. once he leaves the kiosk (index 0 -> 1) the host jams the flood through the gateway: the lamp off on both pages, the strip
//      dark on both pages, the patrol not lured;
//   5. the client at the kiosk keys the release: `a5-release`, the beams off on both pages, `a5-kiosk` ticked, the L5 door open;
//   6. the client to the trench path; with his back to the gateway the host walks through the beam line (no touch) and north;
//   7. the variant after a checkpoint restart: the beams, the claim and the L5 lock reset; the host jams the beam panel, the
//      client walks through on the beam line with no break, takes B, keys the kiosk; both to the L5 door (the runner then puts
//      both on the pad).
// Teleport legs are allowed on the open floor; every device press is from within reach (the host takes a client's press only
// within the item's reach + 0.75 m).
import { teamLog, watchTeam } from '../e2e-net-lib.mjs';

export const SET = 'a5Substation';

const LASER_ID = 'laser-a5';
const PANEL_ID = 'panel-a5';
const RELEASE = 'c-sw-a5-release';
const FLAG = 'a5-release';
const IN1 = 'a5-in1';
/** The helper's marks: the thrower, the runner's start, the landing, the kiosk's press spot (`a5Substation.ts`). */
const THROW = [59.2, 36];
const RUNNER = [60.2, 36];
const LANDING = [56, 36];
const PRESS = [47.6, 33.0];
/** The floodlit strip's centre, the flood lamp, the jam spots (traced in `tests/ctcourse/a5Substation.test.ts`). */
const STRIP = [50.5, 33.5];
const FLOOD = [44.5, 4.2, 35.6];
const FLOOD_JAM = [60, 36];
const PANEL_JAM = [60.5, 35.0];
/** Behind the inner wall's south run: out of sight from every point of his loop (tested). */
const HIDE = [59.0, 25.4];
/** The patrol's stops K (the kiosk) and R4 (the gateway's north tower), the beam line. */
const K = [47.9, 33.4];
const R4 = [56.5, 37.6];
const BEAM_X = 58;
const WEST = -Math.PI / 2;

/** @param {object} t the runner's helpers (scripts/e2e-ctcourse.mjs) @param {number} n the set's number */
export async function walk(t, n) {
  const { A, B, GA, GB, until, assert, waitSim, use, moveHost, moveClient, doorIndex, padReady, holdUntil, RB, crouch, dev, drawPistol, holster, aimAt, lt } = t;

  // ---- helpers local to the set ----
  const sees = (P, re, what) => until(P, ([src]) => new RegExp(src).test(document.querySelector('.course-hud .ch-step')?.textContent ?? ''), [re.source], 15000, what);
  const tickedOn = (P, id, what) => until(P, (id) => !!document.querySelector(`.course-hud tr[data-step="${id}"] td.done`), id, 15000, what);
  const lockedOnClient = async (cid) => GB((i) => window.__course.wire.locks.includes(i), await doorIndex(cid));
  /** A page's baked light level for a standing body at (x, z) (the same field the meter and the guards read). */
  const level = (P, x, z) => P.evaluate(([x, z]) => window.__app.current.world.lightField?.bodyLevel(x, 0, z, 1.7) ?? -1, [x, z]);
  const laserOn = (P) => P.evaluate((id) => window.__ctdev.debug().lasers.find((l) => l.id === id)?.on, LASER_ID);
  const hasFlag = (f) => GA((f) => window.__course.state.hasFlag(f), f);
  const roleOf = (p) => GA((p) => window.__course.state.roleOf(p), p);
  const claimed = () => GA(() => window.__course.state.roleClaimed());
  const patrol = () => GA(() => { const e = window.__app.current.enemyMgr.enemies.find((q) => q.alive && q.pos.x > 40 && q.pos.x < 70 && q.pos.z > 24 && q.pos.z < 48); return e ? { x: e.pos.x, z: e.pos.z, idx: e.walker?.idx ?? -1, level: e.level, alerted: !!e.alerted, passive: !!e.passive } : null; });
  /** The patrol has left the kiosk for pen 1 (route index 1) and is `d` m off it: his back to the strip and the gateway. */
  const leftKiosk = (what, d = 1.5) => until(A, ([kx, kz, d]) => { const e = window.__app.current.enemyMgr.enemies.find((q) => q.alive && q.pos.x > 40 && q.pos.x < 70 && q.pos.z > 24 && q.pos.z < 48); return !!e && !e.alerted && e.walker?.idx === 1 && Math.hypot(e.pos.x - kx, e.pos.z - kz) > d; }, [K[0], K[1], d], 90000, what);
  /** His back to the gateway: walking R4 -> K (index 0, off both stops) or K -> R2 / at R2 (index 1). */
  const backTurned = (what) =>
    until(A, ([kx, kz, rx, rz]) => {
      const e = window.__app.current.enemyMgr.enemies.find((q) => q.alive && q.pos.x > 40 && q.pos.x < 70 && q.pos.z > 24 && q.pos.z < 48);
      if (!e || e.alerted) return false;
      const i = e.walker?.idx;
      return i === 1 || (i === 0 && Math.hypot(e.pos.x - kx, e.pos.z - kz) > 3 && Math.hypot(e.pos.x - rx, e.pos.z - rz) > 1);
    }, [K[0], K[1], R4[0], R4[1]], 90000, what);
  const noDamage = () => GA(() => { window.__app.current.target.damageMul = 0; });
  /** The client damage-proof: its own target on its page and its remote on the host (the host's guard shoots the remote; `scripts/e2e-coop.mjs`). */
  const noDamageClient = async () => {
    await GB(() => { window.__app.current.target.damageMul = 0; });
    await GA(() => { for (const r of window.__app.current.net.remotes.values()) r.damageMul = 0; });
  };
  /** Both pages see the beams `on` (true / false). */
  async function beamsAre(on, what) {
    await until(A, ([id, on]) => window.__ctdev.debug().lasers.find((l) => l.id === id)?.on === on, [LASER_ID, on], 10000, `${what} (host)`);
    await until(B, ([id, on]) => window.__ctdev.debug().lasers.find((l) => l.id === id)?.on === on, [LASER_ID, on], 15000, `${what} (client)`);
  }

  /** The host on the mark offers the partner throw, the client runs in and is thrown over the beams onto the landing. */
  async function throwClient(what) {
    await moveHost(THROW[0], THROW[1], 0.1, WEST);
    await moveClient(RUNNER[0], RUNNER[1], 0.1, WEST);
    await waitSim(500);
    await padReady(A);
    await padReady(B);
    const d0 = await dev(A);
    // both pages' team states are recorded and printed with both views on a failure (the old bunker throw's load flake)
    await watchTeam(A);
    await watchTeam(B);
    const dump = async (e) => {
      console.error('    host:', await teamLog(A));
      console.error('    client:', await teamLog(B));
      throw e;
    };
    await holdUntil(A, RB, () => window.__app.current.team.state === 'throwOffer', `${what}: the standing host offers the throw`).catch(dump);
    await until(B, () => !!window.__app.current.team.offer?.toss, null, 8000, `${what}: the client is offered the throw`).catch(dump);
    const prompt = await GB(() => window.__app.current.team.prompt);
    assert(/throw/i.test(prompt ?? ''), `${what}: the prompt names the move (${prompt})`);
    // the press goes in once the client's view of the offering host has settled (its yaw too: the landing is measured from it)
    const host = await GA(() => { const c = window.__app.current.player.controller; return [c.pos.x, c.pos.z, c.yaw]; });
    await until(B, ([hx, hz, hy]) => {
      const g = window.__app.current;
      const c = g.player.controller;
      const m = g.team.offer?.toss ? g.team.offer.mate : null;
      return !!m && Math.hypot(m.pos.x - hx, m.pos.z - hz) < 0.1 && Math.abs(Math.atan2(Math.sin(m.yaw - hy), Math.cos(m.yaw - hy))) < 0.05 && c.grounded && !c.override && !g.traversal.attached;
    }, host, 8000, `${what}: the client's view of the offering host has settled`).catch(dump);
    assert((await GA(() => window.__app.current.team.state)) === 'throwOffer', `${what}: the host still offers the throw at the press`);
    await holdUntil(B, RB, () => window.__app.current.team.count.throws >= 1, `${what}: the client is thrown`).catch(dump);
    // the client's own arc over the beam line (feet over the top beam while within its touch band), to the landing: the samples inside
    // the band are counted (an arc that was never sampled there must fail, not pass), and the height at the crossing is interpolated
    let ownMax = 0;
    let bandSamples = 0;
    let prev = null;
    const t0 = Date.now();
    const s0 = await GB(() => window.__app.current.time);
    for (;;) {
      const [own, st] = await GB(() => { const g = window.__app.current; const c = g.player.controller; return [[c.pos.x, c.pos.y], g.team.state]; });
      if (Math.abs(own[0] - BEAM_X) < 0.3) {
        bandSamples++;
        ownMax = Math.max(ownMax, own[1]);
      }
      if (prev && (prev[0] - BEAM_X) * (own[0] - BEAM_X) < 0 && prev[0] !== own[0]) ownMax = Math.max(ownMax, prev[1] + ((own[1] - prev[1]) * (prev[0] - BEAM_X)) / (prev[0] - own[0]));
      prev = own;
      if (st === 'none' && own[0] < BEAM_X - 1) break;
      if ((await GB(() => window.__app.current.time)) - s0 > 20 || Date.now() - t0 > 200000) throw new Error(`${what}: the throw did not land (${st}, ${own})`);
      await waitSim(30);
    }
    await until(B, () => window.__app.current.player.controller.grounded, null, 8000, `${what}: the client lands on its feet`);
    const land = await GB(() => { const c = window.__app.current.player.controller; return { x: c.pos.x, y: c.pos.y, z: c.pos.z, crouched: c.crouched }; });
    assert(Math.hypot(land.x - LANDING[0], land.z - LANDING[1]) <= 0.5 && Math.abs(land.y) < 0.3, `${what}: the client lands within 0.5 m of the landing (${JSON.stringify(land)})`);
    assert(ownMax > 1.45, `${what}: the client's arc clears the top beam at the line (${ownMax.toFixed(2)} over ${bandSamples} samples)`);
    await waitSim(600);
    const d1 = await dev(A);
    assert(d1.hits === d0.hits && d1.alarm === d0.alarm, `${what}: the thrown client touched no beam (hits ${d0.hits} -> ${d1.hits}, alarm ${d0.alarm} -> ${d1.alarm})`);
    await until(A, () => window.__app.current.team.state === 'none', null, 8000, `${what}: the thrower is free again`);
  }

  // ---- 1. the start: both in at L4's far door ----
  console.log('  A5: the apron, the step lines, the beams');
  await moveHost(67.5, 32.4, 0.1, WEST);
  await moveClient(67.5, 33.6, 0.1, WEST);
  await noDamage();
  assert(!(await lockedOnClient('L4-far')), 'A5: the L4 far door is open to the client');
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) {
    await until(P, () => /Throw one of you over the beams/.test(document.querySelector('.course-hud')?.textContent ?? ''), null, 15000, `A5: the ${tag} sees the shared step line`);
    assert(await P.evaluate((id) => !!window.__app.current.interactables?.items.find((i) => i.id === id), RELEASE), `A5: the ${tag} has the kiosk release`);
  }
  // the lead of the odd set is P1: the host reads the A line until somebody claims
  await sees(A, /Stand by the drums at the gateway/, 'A5: the host (the lead) reads the A line');
  await sees(B, /Land in the dark behind the transformer/, 'A5: the client reads the B line');
  assert(!(await claimed()), 'A5: nobody has claimed a job yet');
  assert((await laserOn(A)) === true && (await laserOn(B)) === true, 'A5: the beams are on on both pages');
  assert(await lockedOnClient('L5-near'), 'A5: the L5 near door is locked until the release (the flag gate)');
  const g0 = await patrol();
  assert(!!g0 && !g0.passive, `A5: the patrol is alive and armed (${JSON.stringify(g0)})`);
  const d0 = await dev(A);
  assert(d0.alarm === 0, `A5: no alarm stage at the start (${d0.alarm})`);
  // IR: the beams are drawn only in night vision (render only, local)
  const beams = (P) => P.evaluate((id) => window.__ctdev.lasers.find((l) => l.def.id === id).meshes.map((m) => m.isEnabled(false)), LASER_ID);
  assert((await beams(B)).every((v) => !v), 'A5: the beams are invisible in normal vision');
  await B.evaluate(() => window.__app.current.vision.set('night'));
  await until(B, (id) => window.__ctdev.lasers.find((l) => l.def.id === id).meshes.every((m) => m.isEnabled(false)), LASER_ID, 3000, 'A5: night vision shows the beams');
  await B.evaluate(() => window.__app.current.vision.set('off'));
  for (const [x, z, floor, what] of [[STRIP[0], STRIP[1], 0.55, 'the floodlit strip'], [PRESS[0], PRESS[1], 0.55, "the kiosk's press spot"], [66, 36, 0.4, 'the apron']]) {
    const [la, lb] = [await level(A, x, z), await level(B, x, z)];
    assert(la >= floor && Math.abs(la - lb) < 0.01, `A5: ${what} reads lit and the same on both pages (host ${la.toFixed(3)}, client ${lb.toFixed(3)})`);
  }
  const [pa, pb] = [await level(A, LANDING[0], LANDING[1]), await level(B, LANDING[0], LANDING[1])];
  assert(pa <= 0.24 && Math.abs(pa - pb) < 0.01, `A5: the landing reads dark and the same on both pages (host ${pa.toFixed(3)}, client ${pb.toFixed(3)})`);

  // ---- 2. wait out of sight for his back: he leaves R4 heading west ----
  console.log('  A5: the patrol leaves the gateway');
  await moveHost(HIDE[0], HIDE[1], 0.1, 0);
  await moveClient(HIDE[0], HIDE[1] + 1.0, 0.1, 0);
  await until(A,([kx, kz, rx, rz]) => { const e = window.__app.current.enemyMgr.enemies.find((q) => q.alive && q.pos.x > 40 && q.pos.x < 70 && q.pos.z > 24 && q.pos.z < 48); return !!e && !e.alerted && e.walker?.idx === 0 && Math.hypot(e.pos.x - kx, e.pos.z - kz) > 3 && Math.hypot(e.pos.x - rx, e.pos.z - rz) > 1; }, [K[0], K[1], R4[0], R4[1]], 90000, 'A5: the patrol has left R4 heading west (route index 3 -> 0)');

  // ---- 3. the throw over the beams onto the dark landing ----
  console.log('  A5: the partner throw');
  await throwClient('A5');
  await until(A, (f) => window.__course.state.hasFlag(f), IN1, 10000, 'A5: the landing sets a5-in1 (one player in the inner zone)');
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await tickedOn(P, 'a5-throw', `A5: the ${tag} sees the throw step ticked`);
  assert((await claimed()) && (await roleOf(1)) === 'b' && (await roleOf(0)) === 'a', 'A5: the thrown client has claimed B (the host A)');
  await sees(A, /Jam the floodlight through the gateway/, 'A5: the host (A) reads the jam line');
  await sees(B, /Cross under the jam and key the release/, 'A5: the client (B) reads the kiosk line');
  assert((await laserOn(A)) === true && (await laserOn(B)) === true, 'A5: the beams are still on: the thrower is stranded');
  assert((await dev(A)).alarm === 0, 'A5: no alarm stage after the throw');

  // ---- 4. he leaves the kiosk: the host jams the flood through the gateway ----
  console.log('  A5: the flood jam');
  await leftKiosk('A5: the patrol leaves the kiosk for pen 1 (route index 0 -> 1)');
  const floodId = await GA(([x, y, z]) => window.__ctdev.debug().lights.find((l) => Math.abs(l.x - x) < 0.05 && Math.abs(l.y - y) < 0.05 && Math.abs(l.z - z) < 0.05)?.id, FLOOD);
  assert(!!floodId, 'A5: the flood is a jam target');
  const reg = Number(floodId.slice(3));
  const lit = (P) => P.evaluate((i) => window.__app.current.world.level.lights.get(i).on, reg);
  assert((await lit(A)) && (await lit(B)), 'A5: the flood is on on both pages before the jam');
  await moveHost(FLOOD_JAM[0], FLOOD_JAM[1], 0.1, WEST);
  await drawPistol(A);
  await lt(A, true);
  await aimAt(A, ...FLOOD);
  await until(A, (id) => window.__ctdev.debug().jam[0] === id, floodId, 20000, 'A5: the host jams the flood');
  await until(A, (i) => !window.__app.current.world.level.lights.get(i).on, reg, 2000, 'A5: the flood goes out on the host (after its flicker)');
  await until(B, (i) => !window.__app.current.world.level.lights.get(i).on, reg, 3000, 'A5: the flood goes out on the client');
  await until(A, ([x, z]) => (window.__app.current.world.lightField?.bodyLevel(x, 0, z, 1.7) ?? 1) <= 0.24, STRIP, 1000, 'A5: the strip reads dark on the host within 1 s');
  await until(B, ([x, z]) => (window.__app.current.world.lightField?.bodyLevel(x, 0, z, 1.7) ?? 1) <= 0.24, STRIP, 1000, 'A5: the strip reads dark on the client within 1 s');
  const [sa, sb] = [await level(A, STRIP[0], STRIP[1]), await level(B, STRIP[0], STRIP[1])];
  assert(sa <= 0.24 && sb <= 0.24 && Math.abs(sa - sb) < 0.02, `A5: the jammed strip reads dark and the same on both pages (host ${sa.toFixed(3)}, client ${sb.toFixed(3)})`);
  const g1 = await patrol();
  assert(!!g1 && !g1.alerted && g1.level !== 'investigating' && g1.level !== 'searching', `A5: a jammed flood lures nobody (${JSON.stringify(g1)})`);

  // ---- 5. the client keys the release at the kiosk ----
  console.log('  A5: the release');
  await moveClient(PRESS[0], PRESS[1], 0.1, WEST);
  assert((await use(B, RELEASE)) === 'ok', 'A5: the client keys the release at the kiosk');
  await until(A, (f) => window.__course.state.hasFlag(f), FLAG, 10000, 'A5: the release sets a5-release');
  await beamsAre(false, 'A5: the beams go off for good');
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await tickedOn(P, 'a5-kiosk', `A5: the ${tag} sees the kiosk step ticked`);
  await until(B, (i) => !window.__course.wire.locks.includes(i), await doorIndex('L5-near'), 15000, 'A5: the client sees the L5 near door unlocked');
  await sees(A, /holding room five/, 'A5: the host reads the closing line');
  await sees(B, /holding room five/, 'A5: the client reads the closing line');
  await lt(A, false);
  await until(A, () => window.__ctdev.debug().jam[0] === '', null, 8000, 'A5: the host lets go of the flood');
  await holster(A);
  // the client off the strip to the trench path behind pen 2 (crouched, still), the host back behind the wall's south run
  await moveClient(54, 47, 0.1, 0);
  await padReady(B);
  await crouch(B);
  await moveHost(HIDE[0], HIDE[1], 0.1, 0);
  await until(A, (i) => window.__app.current.world.level.lights.get(i).on, reg, 15000, 'A5: the flood flickers back on (host)');
  await until(B, (i) => window.__app.current.world.level.lights.get(i).on, reg, 15000, 'A5: the flood is back on on the client');

  // ---- 6. the host through the dead beams with his back to the gateway ----
  console.log('  A5: the thrower walks through');
  await backTurned('A5: the patrol has his back to the gateway');
  const h0 = await dev(A);
  await moveHost(BEAM_X, 36, 0.1, WEST);
  await waitSim(1500);
  const h1 = await dev(A);
  assert(h1.hits === h0.hits && h1.alarm === h0.alarm, `A5: the host walks the released beam line without a touch (hits ${h0.hits} -> ${h1.hits})`);
  await moveHost(57, 46.5, 0.1, 0);

  // ---- 7. the variant: a checkpoint restart, the beam panel jam, the walk-through, the release ----
  console.log('  A5: the panel jam variant');
  assert(await GA(() => window.__course.restartCheckpoint()), 'A5: the host restarts at the checkpoint');
  const cp = await GA(() => { const p = window.__course.checkpointPos(); return [p.x, p.z]; });
  await until(B, ([x, z]) => { const p = window.__app.current.player.position; return Math.hypot(p.x - x, p.z - z) < 2.5; }, cp, 15000, 'A5: the restart brings the client back');
  await waitSim(2200);
  await noDamage();
  assert(!(await hasFlag(FLAG)) && !(await hasFlag(IN1)) && !(await claimed()), 'A5: the restart clears the release, the zone flag and the claim');
  await beamsAre(true, 'A5: the restart turns the beams back on');
  assert(await lockedOnClient('L5-near'), 'A5: the restart locks the L5 near door again');
  await until(A, ([kx, kz]) => { const e = window.__app.current.enemyMgr.enemies.find((q) => q.alive && q.pos.x > 40 && q.pos.x < 70 && q.pos.z > 24 && q.pos.z < 48); return !!e && Math.hypot(e.pos.x - kx, e.pos.z - kz) < 2.5; }, [K[0], K[1]], 10000, 'A5: the patrol is back at the kiosk');
  // out of sight behind the wall, the pistol drawn; when he leaves the kiosk the host jams the panel through the gateway
  await moveHost(HIDE[0], HIDE[1], 0.1, 0);
  await moveClient(HIDE[0], HIDE[1] + 1.0, 0.1, 0);
  const panel = await GA((id) => window.__ctdev.debug().panels.find((p) => p.id === id), PANEL_ID);
  assert(!!panel && panel.lasers.includes(LASER_ID) && panel.led === 1, `A5: the beams' power panel is panel-a5, powered (${JSON.stringify(panel)})`);
  assert((await dev(A)).lasers.find((l) => l.id === LASER_ID).panel === PANEL_ID, 'A5: the panel is the beams\' jam target');
  await drawPistol(A);
  await leftKiosk('A5 variant: the patrol leaves the kiosk for pen 1');
  await moveHost(PANEL_JAM[0], PANEL_JAM[1], 0.1, WEST);
  await moveClient(59.0, 35.6, 0.1, WEST);
  await lt(A, true);
  await aimAt(A, panel.at[0], panel.at[1], panel.at[2]);
  await until(A, (id) => window.__ctdev.debug().jam[0] === id, PANEL_ID, 20000, 'A5 variant: the host jams the beam panel');
  await beamsAre(false, 'A5 variant: the panel jam cuts the beams');
  await until(B, (id) => window.__ctdev.debug().panels.find((p) => p.id === id)?.ph === 1, PANEL_ID, 8000, 'A5 variant: the client sees the panel jammed');
  const v0 = await dev(A);
  await moveClient(BEAM_X, 35.6, 0.1, WEST);
  await waitSim(800);
  await moveClient(LANDING[0], LANDING[1], 0.1, WEST);
  const v1 = await dev(A);
  assert(v1.hits === v0.hits && v1.alarm === v0.alarm, `A5 variant: the client walks the beam line with no break (hits ${v0.hits} -> ${v1.hits}, alarm ${v0.alarm} -> ${v1.alarm})`);
  await until(A, (f) => window.__course.state.hasFlag(f), IN1, 10000, 'A5 variant: the client in the inner zone sets a5-in1');
  assert((await roleOf(1)) === 'b', 'A5 variant: the client who walked through has claimed B');
  // the client keys the kiosk while he walks to pen 1 (his back to it): wait for his K -> R2 leg (walker index 1, not yet off it: if he has
  // walked on, the client waits at the landing for the next cycle) and make the client damage-proof, so a sighting under load cannot down it;
  // the host lets go, the beams would come back after the reboot
  await noDamageClient();
  await leftKiosk('A5 variant: the patrol is on his K -> R2 leg before the press');
  await moveClient(PRESS[0], PRESS[1], 0.1, WEST);
  assert((await use(B, RELEASE)) === 'ok', 'A5 variant: the client keys the release');
  await until(A, (f) => window.__course.state.hasFlag(f), FLAG, 10000, 'A5 variant: the release sets a5-release');
  await lt(A, false);
  await until(A, () => window.__ctdev.debug().jam[0] === '', null, 8000, 'A5 variant: the host lets go of the panel');
  await holster(A);
  await waitSim(2000);
  await beamsAre(false, 'A5 variant: after the panel reboots the beams stay off (released for good)');
  await until(B, (i) => !window.__course.wire.locks.includes(i), await doorIndex('L5-near'), 15000, 'A5 variant: the client sees the L5 near door unlocked');
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await tickedOn(P, 'a5-kiosk', `A5 variant: the ${tag} sees the kiosk step ticked`);

  // ---- to the L5 door (the runner then puts both on the pad) ----
  console.log('  A5: to the L5 door');
  await moveClient(54, 47, 0.1, 0);
  await moveHost(BEAM_X, 36, 0.1, WEST);
  await moveHost(57, 46.5, 0.1, 0);
  await moveHost(53.6, 47.0, 0.1, 0);
  await moveClient(52.4, 47.0, 0.1, 0);
  assert(!(await lockedOnClient('L5-near')), 'A5: the L5 near door is open to the client');
  for (const P of [A, B]) await until(P, () => !window.__app.current.traversal.attached, null, 10000, 'A5: nobody is hanging');
}
