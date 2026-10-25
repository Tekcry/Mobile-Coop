// anim-natural N0 audit helper (desktop GPU look, under C:/NightShift/heavy.lock; needs a prior `npm run build`).
// Serves dist/ on 4189, plays Wren's animations and writes, per row, a labelled contact sheet (webp, < 600 KB) under
// docs/archive/anim-natural/audit/ plus the naturalness numbers sampled every 60 Hz step into docs/archive/anim-natural/audit/metrics.json:
//   trunk: pelvis yaw, shoulder-line yaw and their twist (deg, in the root frame), their correlation (< 0 = counter-rotation)
//   sway: pelvis lateral / vertical range (cm), head vertical range (cm), head yaw / pitch range (deg)
//   hands: wrist forward range (cm, root frame) and peak / mean wrist speed (m/s, root frame)
//   feet: planted-foot slide (max cm per contact), the planted foot's yaw against the pelvis (deg: wind-up), contacts
//   draw: draw progress, carry raise and the held gun's world speed (a stall = speed ~0 before the settle)
// Groups: `studio` (Anim Studio loops, ?autostart=studio&gfx=high, on the spot, front 3/4 view), `proving` (scenarios on
// Proving Grounds at ?gfx=high: gait turns with a top-down foot plot, draws, starts / stops, one-shots), `all` (both).
//   E2E_GPU=1 node scripts/anim-natural/audit.mjs <studio|proving|all> [--pass=1|2] [--only=a,b] [--dtmul=2.5]
// `--pass=2` runs only the second pass's rows (AUDIT.md "Pass 2": the rows pass 1 did not capture, the co-op pairs framed
// on the puppets, the hit flinch, the aimed turn in place); no `--pass` runs every row of the group. Each row's metrics
// entry carries `pass` and `row` (the COVERAGE # it covers). (pass 2) Proving cameras sit on the sun side (the theme's
// directional light; NAT_SUN=0 keeps pass 1's sides); the studio pairs move the stage lights onto the puppets.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { launch, waitOperator } from '../e2e-lib.mjs';

// (N0 leftovers) NAT_PORT: 4191 for a software-GL logic check (no E2E_GPU); the GPU sheets stay on 4189
const PORT = Number(process.env.NAT_PORT ?? 4189);
const OUT = 'docs/archive/anim-natural/audit';
const MET = `${OUT}/metrics.json`;
const group = process.argv[2] ?? 'studio';
const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const only = arg('only', '') ? arg('only', '').split(',') : null;
const pass = arg('pass', '') ? Number(arg('pass', '')) : 0;
const dtMul = Number(arg('dtmul', '1')) || 1; // (N3) stretch every scenario's tile spacing (the slower draws span 1.1-1.5 s)
const SUN = process.env.NAT_SUN !== '0';
const KEY = Number(process.env.NAT_KEY ?? 6);
/** A row runs: in `--only` when given, else of the asked pass (none asked: every row). */
const wanted = (e) => (only ? only.includes(e.n) : !pass || (e.pass ?? 1) === pass);
mkdirSync(OUT, { recursive: true });

// ---- the rows ----
// studio: id, frames, interval (s) of real sim time between frames, warm (s), weapon, camera azimuth (rad, + her right)
const STUDIO = [
  { n: 'idle', id: 'state:idle', f: 12, dt: 1.0, warm: 1 },
  { n: 'walk', id: 'state:walk', f: 12, dt: 0.09, warm: 2 },
  { n: 'jog', id: 'state:jog', f: 12, dt: 0.06, warm: 2 },
  { n: 'run', id: 'state:run', f: 12, dt: 0.05, warm: 2 },
  { n: 'crouch-idle', id: 'state:crouchIdle', f: 12, dt: 1.0, warm: 1.5 },
  { n: 'sneak', id: 'state:sneak', f: 12, dt: 0.1, warm: 2 },
  { n: 'crouch-walk', id: 'state:crouchWalk', f: 12, dt: 0.08, warm: 2 },
  { n: 'low-ready-rifle', id: 'state:lowReady', f: 12, dt: 0.6, warm: 1.5, w: 'rifle' },
  { n: 'low-ready-pistol', id: 'state:lowReady', f: 12, dt: 0.6, warm: 1.5, w: 'pistol' },
  { n: 'aim-still-rifle', id: 'state:aimStill', f: 12, dt: 0.5, warm: 1.5, w: 'rifle' },
  { n: 'aim-still-pistol', id: 'state:aimStill', f: 12, dt: 0.5, warm: 1.5, w: 'pistol' },
  { n: 'aim-glide-fwd', id: 'state:aimFwd', f: 12, dt: 0.08, warm: 2, w: 'rifle' },
  { n: 'aim-glide-strafe', id: 'state:aimStrafe', f: 12, dt: 0.08, warm: 2, w: 'rifle' },
  { n: 'aim-glide-back', id: 'state:aimBack', f: 12, dt: 0.08, warm: 2, w: 'rifle' },
  { n: 'crouch-aim-still', id: 'state:crouchAim', f: 12, dt: 0.5, warm: 1.5, w: 'rifle' },
  { n: 'crouch-aim-moving', id: 'state:crouchAimFwd', f: 12, dt: 0.09, warm: 2, w: 'rifle' },
  { n: 'wall-set', id: 'trav:wall', f: 18, dt: 0.32, warm: 0, spot: false, az: -1.2 },
  { n: 'trav-vault', id: 'trav:vault', f: 12, dt: 0.16, warm: 0, spot: false, az: -1.5 },
  { n: 'trav-window', id: 'trav:window', f: 12, dt: 0.15, warm: 0, spot: false, az: -1.5 },
  { n: 'trav-ledge', id: 'trav:ledge', f: 18, dt: 0.31, warm: 0, spot: false, az: -2.6 },
  { n: 'trav-ladder', id: 'trav:ladder', f: 18, dt: 0.48, warm: 0, spot: false, az: -2.4 },
  { n: 'trav-pipeV', id: 'trav:pipeV', f: 18, dt: 0.38, warm: 0, spot: false, az: -2.4 },
  { n: 'trav-pipeH', id: 'trav:pipeH', f: 18, dt: 0.28, warm: 0, spot: false, az: -1.5 },
  { n: 'trav-bar', id: 'trav:bar', f: 18, dt: 0.29, warm: 0, spot: false, az: -1.5 },
  { n: 'trav-vent', id: 'trav:vent', f: 18, dt: 0.7, warm: 0, spot: false, az: -1.5 },
  { n: 'trav-door', id: 'trav:door', f: 12, dt: 0.38, warm: 0, spot: false, az: -1.0 },
  { n: 'trav-rappel', id: 'trav:rappel', f: 18, dt: 0.53, warm: 0, spot: false, az: -2.0 },
  // ---- pass 2 ----
  // (row 12) the crouch run has no state loop: its keyed clip on the spot
  { n: 'crouch-run-keyed', id: 'keyed:crouch_run', f: 12, dt: 0.07, warm: 3, pass: 2, row: 12 },
  // (rows 73-78, 80) the co-op pairs, played in real time (one cycle over the frames) with the camera on the two puppets
  // (their bounds), from the sun side of the station's south face; the stage lights moved onto them. Metrics: role A,
  // role B under `b`. Row 80 (downed) is the revive's role B.
  ...[['boost', 73], ['relay', 74], ['throw', 75], ['hang', 76], ['rope', 77], ['revive', '78, 80']].map(([m, row]) => ({ n: `pair-${m}`, id: `pair:${m}`, f: 18, pair: true, pass: 2, row })),
  // (rows 43-46) the hold pairs: Wren's keyed hold clip and the guard's (studio only: no game code plays these clips)
  ...[['hold_idle', 43], ['hold_back', 44], ['hold_choke', 45], ['hold_knife', 46]].map(([m, row]) => ({ n: `pair-${m}`, id: `pair:${m}`, f: 12, hold: true, az: -Math.PI / 2, far: 3.8, pass: 2, row })),
];

// proving: scenarios as scripts/anim-sheet.mjs (input per t), with a camera mode: `follow` side, `fixed` 3/4 high, `top`
const P0 = { pos: [0, -14], yaw: Math.PI / 2 };
const gearP = (g) => `autostart=proving&gear=${g}&gfx=high`;
const PROVING = [
  // gait turns (the feet): 90 and 180 deg at walk, jog, run; a stick sweep (a curve)
  { n: 'turn90-walk', ...P0, pre: 2.0, warm: { y: 0.5 }, input: (t) => (t < 0 ? { y: 0.5 } : { x: 0.5 }), f: 12, dt: 0.08, cam: 'fixed', top: true },
  { n: 'turn90-jog', ...P0, pre: 1.8, warm: { y: 1 }, input: (t) => (t < 0 ? { y: 1 } : { x: 1 }), f: 12, dt: 0.06, cam: 'fixed', top: true, params: gearP(4) },
  { n: 'turn90-run', ...P0, pre: 1.8, warm: { y: 1 }, input: (t) => (t < 0 ? { y: 1 } : { x: 1 }), f: 12, dt: 0.05, cam: 'fixed', top: true, params: gearP(5) },
  { n: 'turn180-jog', ...P0, pre: 1.8, warm: { y: 1 }, input: () => ({ y: -1 }), f: 12, dt: 0.07, cam: 'fixed', top: true, params: gearP(4) },
  { n: 'turn180-run', ...P0, pre: 1.8, warm: { y: 1 }, input: () => ({ y: -1 }), f: 12, dt: 0.07, cam: 'fixed', top: true, params: gearP(5) },
  { n: 'curve-jog', ...P0, pre: 1.8, warm: { y: 1 }, input: (t) => ({ x: Math.sin(Math.min(1, t / 1.2) * 1.2), y: Math.cos(Math.min(1, t / 1.2) * 1.2) }), f: 12, dt: 0.1, cam: 'fixed', top: true, params: gearP(4), camYawCam: true },
  { n: 'turn-in-place', ...P0, pre: 0.6, input: () => ({ y: -0.3 }), f: 12, dt: 0.08, cam: 'fixed', top: true },
  { n: 'crouch-turn90', ...P0, pre: 2.0, at0: "a.input.state.tap('crouch');", warm: { y: 0.6 }, input: (t) => (t < 0 ? { y: 0.6 } : { x: 0.6 }), f: 12, dt: 0.08, cam: 'fixed', top: true },
  // starts, stops, strafes, back, sprint
  { n: 'start-jog', ...P0, pre: 0.6, input: () => ({ y: 1 }), f: 12, dt: 0.06, cam: 'follow', params: gearP(4) },
  { n: 'stop-jog', ...P0, pre: 2.0, warm: { y: 1 }, input: () => ({}), f: 12, dt: 0.07, cam: 'follow', params: gearP(4) },
  { n: 'stop-run', ...P0, pre: 2.0, warm: { y: 1 }, input: () => ({}), f: 12, dt: 0.07, cam: 'follow', params: gearP(5) },
  { n: 'strafe', ...P0, pre: 1.8, warm: { x: 1 }, input: () => ({ x: 1 }), f: 12, dt: 0.07, cam: 'follow', fixCam: true },
  { n: 'back', ...P0, pre: 1.8, warm: { y: -1 }, input: () => ({ y: -1 }), f: 12, dt: 0.07, cam: 'follow' },
  { n: 'sprint', pos: [-14, -14], yaw: Math.PI / 2, pre: 1.2, warm: { y: 1 }, at0: "a.input.state.tap('dash');", input: () => ({ y: 1 }), f: 12, dt: 0.05, cam: 'follow' },
  // weapons: the draw from holstered (aim press), the low-ready draw (X), holster, swap, reload, ready to aim
  { n: 'draw-rifle', ...P0, pre: 0.8, input: () => ({ ads: true }), f: 18, dt: 1 / 30, cam: 'front34' },
  { n: 'draw-pistol', ...P0, pre: 0.8, weapon: 'pistol', input: () => ({ ads: true }), f: 18, dt: 1 / 30, cam: 'front34' },
  { n: 'draw-lowready-rifle', ...P0, pre: 0.8, input: () => ({}), at: { 0: "a.input.state.tap('draw');" }, f: 18, dt: 1 / 30, cam: 'front34' },
  { n: 'draw-lowready-pistol', ...P0, pre: 0.8, weapon: 'pistol', input: () => ({}), at: { 0: "a.input.state.tap('draw');" }, f: 18, dt: 1 / 30, cam: 'front34' },
  { n: 'holster-rifle', ...P0, pre: 1.4, warm: { ads: true }, input: () => ({}), f: 12, dt: 1 / 30, cam: 'front34' },
  { n: 'holster-pistol', ...P0, pre: 1.4, weapon: 'pistol', warm: { ads: true }, input: () => ({}), f: 12, dt: 1 / 30, cam: 'front34' },
  { n: 'swap-drawn', ...P0, pre: 1.2, warm: { ads: true }, input: () => ({ ads: true }), at: { 0: "a.input.state.tap('swapNext');" }, f: 18, dt: 0.06, cam: 'front34' },
  { n: 'ready-to-aim', ...P0, pre: 1.4, at0: "a.input.state.tap('draw');", input: (t) => ({ ads: t >= 0.1 }), f: 12, dt: 0.05, cam: 'front34' },
  { n: 'reload-rifle', ...P0, pre: 1.2, warm: { ads: true }, input: () => ({ ads: true }), at: { 0: "g.weapons.current.mag = 0; a.input.state.tap('reload');" }, f: 18, dt: 0.15, cam: 'front34' },
  { n: 'reload-pistol', ...P0, pre: 1.2, weapon: 'pistol', warm: { ads: true }, input: () => ({ ads: true }), at: { 0: "g.weapons.current.mag = 0; a.input.state.tap('reload');" }, f: 18, dt: 0.12, cam: 'front34' },
  // one-shots and air
  { n: 'grenade', ...P0, pre: 0.6, input: () => ({}), at: { 0: "a.input.state.tap('grenade');" }, f: 12, dt: 0.1, cam: 'follow' },
  { n: 'drop-land', pos: [0, -14], y: 1.4, yaw: Math.PI / 2, pre: 0.02, input: () => ({}), f: 12, dt: 0.07, cam: 'follow' },
  { n: 'crouch-stand', ...P0, pre: 0.8, input: () => ({}), at: { 0: "a.input.state.tap('crouch');", 0.8: "a.input.state.tap('crouch');" }, f: 12, dt: 0.12, cam: 'follow' },
  { n: 'dash-roll', pos: [0, -18], yaw: Math.PI / 2, pre: 0.6, input: () => ({ y: 1 }), at: { 0.05: "a.input.state.tap('dash');" }, f: 12, dt: 0.08, cam: 'follow' },
  { n: 'hit-flinch', ...P0, pre: 0.6, input: () => ({}), at: { 0: "g.player.rig.hit(1, 0.8);" }, f: 12, dt: 0.05, cam: 'follow' },
  // close quarters (Warehouse, a calm grunt ahead: as anim-sheet G7)
  ...[
    ['grab', 0.4, {}, {}],
    ['hold-walk', 1.8, { 0.4: 'P' }, { y: 1 }],
    ['hold-ko', 1.8, { 0.4: 'P' }, {}, { 0: 'K0' }],
    ['carry-walk', 5.0, { 0.4: 'P', 1.8: 'K2' }, { y: 1 }],
    ['lift', 2.75, { 0.4: 'P', 1.8: 'K2' }, {}],
  ].map(([n, pre, preAt, inp, at]) => ({ n, g7: true, pre, preAt, input: () => inp, at: at ?? (n === 'grab' ? { 0: 'P' } : {}), f: 12, dt: n === 'lift' || n === 'hold-ko' ? 0.2 : 0.1, cam: 'follow' })),
  ...PASS2(),
];

/**
 * Pass 2 (AUDIT.md "Pass 2"): the rows pass 1 did not capture. Input per t as above, plus `cy` (the camera yaw from the
 * start yaw, rad: the aim direction), `fire`, `crouch` and `coop` held; `every` runs code each recorded step (`t` in
 * scope); `find` places her from the level (a free high wall, a wall end, the shed door: as scripts/anim-audit.mjs).
 * Rows 70 and 72 drive `player.pose.slide` / `pose.check` directly: no game code sets them (the graph's SLIDE clip and
 * check sweep are dead channels in play), so the sheet shows what the graph would play.
 */
function PASS2() {
  const J = "a.input.state.tap('jump');";
  const ramp = (t, d) => Math.min(1, Math.max(0, t / d));
  // The wall end as the game has it now (N0 leftovers, 2026-10-22): the lean-out aim and its hand swap are gone by
  // decision (loco M20 Q1 / G52, `wallController.ts` edgeVerbs: "an end holds the body on the wall") and aiming leaves the
  // wall (A3 / loco M25, CT: `gameState.ts` wallStep `i.leave = ... pl.ads || pl.adsWanted`). What is left at an end:
  // the peek (stopped on the end, the stick pushed toward it or the look past it), and at the LEFT end (`end` 1, the b
  // end, edgeL) the peek puts the weapon in the left hand (`wallLeftHand`, rig `openLeft` / `handBlend`): row 29 needs
  // the gun out (low ready, drawn before the entry) to show it. Timeline: enter, slide to the end, stop, peek (stick
  // toward it), release, the camera turns to look past the end (a real player's view round the corner), aim (row 39:
  // she leaves the wall into the aim round the corner, not back toward the wall), release.
  // The stick is `tw` (toward the end, in the world: setInput turns it into the stick from the live camera yaw), so no
  // sign guess: pass 2's fixed `x` (+end, then -end) depended on the segment's winding against the camera frame.
  const wallEdge = (n, end, low, row, drawn) => {
    const segs = [{ d: 0.6, tap: 'cover' }, { d: 1.8, tw: 1 }, { d: 0.4 }, { d: 1.0, tw: 1 }, { d: 0.6 }, { d: 0.8, look: 'ramp' }, { d: 1.2, ads: true, look: 1 }, { d: 0.6, look: 1 }];
    // (the low end's aim used to hold the stick toward the end for the crouched side lean; aiming leaves the wall now, so
    // that stick only walked her off at 1.4 m/s in the logic check: the stick is idle for the aim on both)
    const at = {};
    let t0 = 0;
    for (const s of segs) {
      if (s.tap) at[+t0.toFixed(4)] = `a.input.state.tap('${s.tap}');`;
      t0 += s.d;
    }
    const input = (t) => {
      let u = 0;
      for (const s of segs) {
        if (t < u + s.d) return { tw: s.tw ?? 0, ads: !!s.ads, look: s.look === 'ramp' ? (t - u) / s.d : s.look ?? 0 };
        u += s.d;
      }
      return {};
    };
    const e = { n, pass: 2, row, find: ['end', end, low], pre: drawn ? 1.2 : 0.3, input, at, f: 18, dt: 0.39, cam: 'follow', fixCam: true };
    if (drawn) e.at0 = "a.input.state.tap('draw');";
    return e;
  };
  return [
    // (row 7) the turn on the spot: the player's body only turns standing while aiming (strafe-locked to the aim; held
    // facing otherwise): the aim swung 90 / 180 deg in 0.25 / 0.4 s; low ready the same swing (does the body follow?)
    { n: 'turn-in-place-aim90', pass: 2, row: 7, ...P0, pre: 1.4, warm: { ads: true }, input: (t) => ({ ads: true, cy: ramp(t, 0.25) * (Math.PI / 2) }), f: 12, dt: 0.07, cam: 'fixed', top: true },
    { n: 'turn-in-place-aim180', pass: 2, row: 7, ...P0, pre: 1.4, warm: { ads: true }, input: (t) => ({ ads: true, cy: ramp(t, 0.4) * Math.PI }), f: 12, dt: 0.08, cam: 'fixed', top: true },
    { n: 'turn-in-place-lowready90', pass: 2, row: 7, ...P0, pre: 1.4, at0: "a.input.state.tap('draw');", input: (t) => ({ cy: ramp(t, 0.25) * (Math.PI / 2) }), f: 12, dt: 0.08, cam: 'fixed', top: true },
    // (row 10) the tense sneak (crouched near an unaware guard: `tenseForce` stands in for the guard)
    { n: 'tense-sneak', pass: 2, row: 10, ...P0, pre: 1.8, at0: "a.input.state.tap('crouch'); g.player.controller.tenseForce = true;", warm: { y: 0.45 }, input: () => ({ y: 0.45 }), f: 12, dt: 0.1, cam: 'follow' },
    // (row 12) the crouch run in play (crouched, stick full at the top gear)
    { n: 'crouch-run', pass: 2, row: 12, pos: [-14, -14], yaw: Math.PI / 2, pre: 1.6, at0: "a.input.state.tap('crouch');", warm: { y: 1 }, input: () => ({ y: 1 }), f: 12, dt: 0.06, cam: 'follow', params: gearP(5) },
    // (row 16) low ready (drawn, not aiming) at walk, jog, run
    { n: 'lowready-walk', pass: 2, row: 16, ...P0, pre: 1.8, at0: "a.input.state.tap('draw');", warm: { y: 0.5 }, input: () => ({ y: 0.5 }), f: 12, dt: 0.09, cam: 'follow' },
    { n: 'lowready-jog', pass: 2, row: 16, pos: [-14, -14], yaw: Math.PI / 2, pre: 1.8, at0: "a.input.state.tap('draw');", warm: { y: 1 }, input: () => ({ y: 1 }), f: 12, dt: 0.06, cam: 'follow', params: gearP(4) },
    { n: 'lowready-run', pass: 2, row: 16, pos: [-14, -14], yaw: Math.PI / 2, pre: 1.8, at0: "a.input.state.tap('draw');", warm: { y: 1 }, input: () => ({ y: 1 }), f: 12, dt: 0.05, cam: 'follow', params: gearP(5) },
    // (row 24) wall block: aiming, glide into a high wall (1.3 m out, facing it) and back off
    { n: 'wall-block', pass: 2, row: 24, find: ['wall', 1.3], pre: 1.4, warm: { ads: true }, input: (t) => ({ ads: true, y: t < 1.6 ? 0.35 : -0.35 }), f: 12, dt: 0.2, cam: 'follow', fixCam: true },
    // (row 25) fire and recoil: the rifle held on, the pistol tapped
    { n: 'fire-rifle', pass: 2, row: 25, ...P0, pre: 1.4, warm: { ads: true }, input: (t) => ({ ads: true, fire: t < 1.0 }), f: 18, dt: 1 / 15, cam: 'front34' },
    { n: 'fire-pistol', pass: 2, row: 25, ...P0, pre: 1.4, weapon: 'pistol', warm: { ads: true }, input: (t) => ({ ads: true, fire: t < 1.2 && (t * 4) % 1 < 0.4 }), f: 18, dt: 1 / 15, cam: 'front34' },
    // (rows 29, 39) the wall ends: the gun out, the peek at the left end changes hands, then the aim leaves the wall
    // round the corner; the right end (no swap) and a low wall's end holstered
    wallEdge('wall-edge-left', 1, false, '29, 39', true),
    wallEdge('wall-edge-right', -1, false, 39, true),
    wallEdge('wall-edge-low', 1, true, 39, false),
    // (row 29) the other hand swap in the game: aiming from the left shoulder (the shoulder swap, G17; `gameState.ts`
    // wallStep `openLeft = ... pl.cam.shoulder < 0 && weapons.handSwitchOk`), swapped and swapped back
    { n: 'hand-swap-shoulder', pass: 2, row: 29, ...P0, pre: 1.4, warm: { ads: true }, input: () => ({ ads: true }), at: { 0.2: "a.input.state.tap('shoulderSwap');", 1.6: "a.input.state.tap('shoulderSwap');" }, f: 18, dt: 0.16, cam: 'front34' },
    // (row 30) the knife in hand (`weapons.knife.show`: no knife verb in the game yet), standing then walking
    { n: 'knife-in-hand', pass: 2, row: 30, ...P0, pre: 0.8, at0: 'g.weapons.knife.show(true);', input: (t) => (t < 1.0 ? {} : { y: 0.5 }), f: 12, dt: 0.2, cam: 'front34' },
    // (row 32) the jammer: the pistol aimed, the co-op button held (no pose of its own: the pistol aim)
    { n: 'jammer', pass: 2, row: 32, ...P0, pre: 1.4, weapon: 'pistol', warm: { ads: true }, input: () => ({ ads: true, coop: true }), f: 12, dt: 0.15, cam: 'front34' },
    // (row 40) the door peek: the shed door, a context press cracks it and peeks, a second closes
    // (rerun) the peek starts from the door menu's Stealth open pick (`stealthPick`, gameState.doorMenuPick), not a cover
    // press; the stick pulled back closes it. Camera behind her (the side camera stood inside the shed wall)
    { n: 'door-peek', pass: 2, row: 40, find: ['door'], pre: 0.5, input: (t) => (t >= 2.3 && t < 2.7 ? { y: -0.7 } : {}), at: { 0.3: 'g.stealthPick = true;' }, f: 18, dt: 0.17, cam: 'back' },
    // (row 49) the elbow strike (fire holstered): a whiff on the open yard
    // (row 49) the elbow strike: no whiff in the game (`StrikeController` starts only with a guard in reach), so only the
    // Warehouse row below
    // (row 58) the split jump: two jumps in the corridor, braced, then the drop
    { n: 'split-brace', pass: 2, row: 58, pos: [10, 25.05], yaw: Math.PI / 2, pre: 0.5, input: () => ({}), at: { 0: J, 0.1: J, 2.2: "a.input.state.tap('drop');" }, f: 18, dt: 0.17, cam: 'back' },
    // (rows 61-67) mantle (0.9 m block), step up (0.6 m), climb up (from a ledge hang), drop off a ledge and from a pipe
    // hang, hop (a running gap between the hang blocks' tops), roll (crouch held at the run), wall kick (the 3.3 m block)
    { n: 'mantle', pass: 2, row: 61, pos: [-19.9, -1.2], yaw: -Math.PI / 2, pre: 0.5, input: () => ({}), at: { 0: J }, f: 12, dt: 0.1, cam: 'follow' },
    { n: 'step-up', pass: 2, row: 62, pos: [-19.9, -4.4], yaw: -Math.PI / 2, pre: 0.5, input: () => ({}), at: { 0: J }, f: 12, dt: 0.06, cam: 'follow' },
    { n: 'climb-up', pass: 2, row: 63, pos: [25.45, 16], yaw: Math.PI / 2, pre: 1.4, preAt: { 0.4: J }, input: () => ({}), at: { 0: J }, f: 12, dt: 0.14, cam: 'follow' },
    { n: 'drop-ledge', pass: 2, row: 64, pos: [0, 18.4], y: 2.62, yaw: 0, pre: 0.5, input: () => ({}), at: { 0: J }, f: 12, dt: 0.08, cam: 'follow' },
    { n: 'drop-hang', pass: 2, row: 64, pos: [0.5, 22.7], yaw: 0, pre: 1.4, preAt: { 0.4: J }, input: () => ({}), at: { 0: "a.input.state.tap('drop');" }, f: 12, dt: 0.1, cam: 'follow' },
    { n: 'hop', pass: 2, row: 65, pos: [27.5, 14.7], y: 2.32, yaw: 0, pre: 0.3, input: () => ({ y: 1 }), every: "if (!window.__natHop && g.player.controller.pos.z > 16.85) { a.input.state.tap('jump'); window.__natHop = 1; }", f: 18, dt: 0.09, cam: 'follow', params: gearP(5) },
    { n: 'roll', pass: 2, row: 66, pos: [-14, -14], yaw: Math.PI / 2, pre: 1.6, warm: { y: 1 }, input: (t) => ({ y: 1, crouch: t < 0.5 }), f: 12, dt: 0.07, cam: 'follow', params: gearP(5) },
    { n: 'wall-kick', pass: 2, row: 67, pos: [17.5, 23.3], yaw: 0, pre: 0.5, input: () => ({}), at: { 0: J }, f: 12, dt: 0.1, cam: 'follow' },
    // (row 70) dash slide, driven (dead in play): pose.slide 0..1 over 0.7 s from a run
    { n: 'dash-slide-driven', pass: 2, row: 70, pos: [-14, -14], yaw: Math.PI / 2, pre: 1.6, warm: { y: 1 }, input: (t) => (t < 0.7 ? { y: 1 } : {}), every: 'g.player.pose.slide = t < 0.7 ? t / 0.7 : -1;', f: 12, dt: 0.07, cam: 'follow', params: gearP(5) },
    // (row 72) doorway check sweep, driven (dead in play): pose.check 0..1 over 1.2 s, drawn, at the lane's doorway
    { n: 'door-sweep-driven', pass: 2, row: 72, pos: [-20, 6.6], yaw: 0, pre: 1.2, at0: "a.input.state.tap('draw');", input: () => ({}), every: 'g.player.pose.check = t < 1.2 ? t / 1.2 : -1;', f: 12, dt: 0.12, cam: 'follow' },
    // (row 79) the hit flinch (`CharacterRig.hit` -> the graph's additive `hitReact`): from the right then the left,
    // holstered; and aiming
    { n: 'hit-flinch-2', pass: 2, row: 79, ...P0, pre: 0.6, input: () => ({}), at: { 0: 'g.player.rig.hit(1, 0.8);', 0.5: 'g.player.rig.hit(1, -0.8);' }, f: 18, dt: 0.05, cam: 'front34' },
    { n: 'hit-flinch-aim', pass: 2, row: 79, ...P0, pre: 1.4, warm: { ads: true }, input: () => ({ ads: true }), at: { 0: 'g.player.rig.hit(1, 0.8);' }, f: 12, dt: 0.05, cam: 'front34' },
    // (rows 43, 46, 47, 49) close quarters on the Warehouse (a calm grunt ahead, as above): hold still, the knife kill
    // (pick 1), the interrogation (pick 4; he is given a line to give), the elbow strike landing on him
    ...[
      ['hold-still', 43, { 0.4: 'P' }, {}, {}, 0.25],
      ['knife-kill', 46, { 0.4: 'P' }, {}, { 0: 'K1' }, 0.12],
      ['interrogate', 47, { 0.4: 'P' }, {}, { 0: "g.takedown.menuPick = 'interrogate';" }, 0.3],
      // (N0 leftovers) 'FS' stands her 0.85 m behind the guard where he really stands (the spawn snaps him to a 0.5 m nav
      // cell centre: from the fixed spot he could be ~1.45 m off, past STRIKE.reach 1.3 m; e2e-takedown uses 0.9 m)
      ['elbow-strike-guard', 49, { 1.0: 'FS' }, {}, { 0: "a.input.state.tap('altFire');" }, 0.08],
    ].map(([n, row, preAt, inp, at, dt]) => ({ n, pass: 2, row, g7: true, pre: 1.8, preAt, input: () => inp, at, f: n === 'knife-kill' ? 18 : 12, dt, cam: 'follow' })),
  ];
}

// ---- server ----
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { windowsHide: true, stdio: 'ignore' });
const kill = () => {
  try {
    if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(server.pid), '/T', '/F'], { windowsHide: true });
    else server.kill();
  } catch {
    /* gone */
  }
};
process.on('exit', kill);
await new Promise((r) => setTimeout(r, 4000));
const URL0 = `http://127.0.0.1:${PORT}/`;

// ---- in-page sampler (installed once per page) ----
const SAMPLER = () => {
  const g = () => window.__app.current;
  const ang = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const D = 180 / Math.PI;
  window.__nat = {
    rows: [],
    rowsB: [],
    sample(rig, out) {
      const r = rig ?? g().player.rig;
      const fresh = (n) => n.computeWorldMatrix(true);
      for (const n of [r.root, r.hips, r.spine, r.torso, r.neck, r.headNode, r.shoulderL, r.shoulderR, r.wristL, r.wristR, r.hipL, r.hipR, r.ankleL, r.ankleR]) fresh(n);
      const rm = r.root.getWorldMatrix().m;
      const rx = rm[12];
      const ry = rm[13];
      const rz = rm[14];
      const rootYaw = Math.atan2(rm[8], rm[10]);
      const rr = Math.atan2(rm[2], rm[0]);
      // root frame: right (x), up, forward (z), unit length
      const nx = Math.hypot(rm[0], rm[2]);
      const ax = [rm[0] / nx, rm[2] / nx];
      const nz = Math.hypot(rm[8], rm[10]);
      const az = [rm[8] / nz, rm[10] / nz];
      const P = (n) => { const m = n.getWorldMatrix().m; return [m[12], m[13], m[14]]; };
      const L = (p) => [(p[0] - rx) * ax[0] + (p[2] - rz) * ax[1], p[1] - ry, (p[0] - rx) * az[0] + (p[2] - rz) * az[1]];
      const lineYaw = (a, b) => ang(Math.atan2(b[2] - a[2], b[0] - a[0]) - rr) * D;
      const hipL = P(r.hipL);
      const hipR = P(r.hipR);
      const shL = P(r.shoulderL);
      const shR = P(r.shoulderR);
      const hm = r.headNode.getWorldMatrix().m;
      // (pass 2) the trunk's lean: neck over hips pitch (+ forward) and the shoulder line's roll (+ right shoulder up)
      const nk = L(P(r.neck));
      const hp = L(P(r.hips));
      const torsoPitch = Math.atan2(nk[2] - hp[2], nk[1] - hp[1]) * D;
      const shRoll = Math.atan2(shR[1] - shL[1], Math.hypot(shR[0] - shL[0], shR[2] - shL[2])) * D;
      const toe = (an) => { const m = an.getWorldMatrix().m; const pp = r.p; const lx = 0; const ly = -pp.y.ankle; const lz = pp.foot.len * 0.43; return [lx * m[0] + ly * m[4] + lz * m[8] + m[12], lx * m[1] + ly * m[5] + lz * m[9] + m[13], lx * m[2] + ly * m[6] + lz * m[10] + m[14]]; };
      const heel = (an) => { const m = an.getWorldMatrix().m; const pp = r.p; const ly = -pp.y.ankle; const lz = -pp.foot.len * 0.25; return [ly * m[4] + lz * m[8] + m[12], ly * m[5] + lz * m[9] + m[13], ly * m[6] + lz * m[10] + m[14]]; };
      const tL = toe(r.ankleL); const hL = heel(r.ankleL); const tR = toe(r.ankleR); const hR = heel(r.ankleR);
      const hipsW = Math.atan2(hipR[2] - hipL[2], hipR[0] - hipL[0]);
      const fy = (h, t) => Math.atan2(t[2] - h[2], t[0] - h[0]);
      // a foot's heading against the pelvis heading (both as a forward direction: pelvis forward = L->R line + 90 deg)
      const pelFwd = hipsW + Math.PI / 2;
      const gw = g();
      const wpn = gw.weapons;
      // the current gun's model (its own node: continuous through the slot -> hand travel), and its muzzle pitch (deg)
      let gun = null;
      let gunPitch = 0;
      const md = wpn?.current?.model?.node;
      if (md && !md.isDisposed()) {
        const ch = [];
        for (let q = md; q; q = q.parent) ch.unshift(q);
        for (const q of ch) q.computeWorldMatrix(true);
        const m = md.getWorldMatrix().m;
        gun = [m[12], m[13], m[14]];
        const zl = Math.hypot(m[8], m[9], m[10]) || 1;
        gunPitch = Math.asin(Math.max(-1, Math.min(1, m[9] / zl))) * D;
      }
      (out ?? window.__nat.rows).push({
        t: performance.now(),
        root: [rx, ry, rz], rootYaw: rootYaw * D,
        pel: L(P(r.hips)), pelYaw: lineYaw(hipL, hipR), shYaw: lineYaw(shL, shR),
        head: L(P(r.headNode)), headYaw: ang(Math.atan2(hm[8], hm[10]) - rootYaw) * D, headPitch: Math.asin(Math.max(-1, Math.min(1, hm[9] / Math.hypot(hm[8], hm[9], hm[10])))) * D,
        wL: L(P(r.wristL)), wR: L(P(r.wristR)),
        tL, hL, tR, hR,
        cL: r.planner?.L?.contact ? 1 : 0, cR: r.planner?.R?.contact ? 1 : 0,
        fL: ang(fy(hL, tL) - pelFwd) * D, fR: ang(fy(hR, tR) - pelFwd) * D,
        slide: [r.footSlide?.l ?? 0, r.footSlide?.r ?? 0],
        draw: wpn?.draw ? wpn.draw.progress : -1, raise: gw.player?.carry ? gw.player.carry.raise : -1,
        gun, gunPitch, state: gw.player?.controller?.motion?.state ?? '',
        speed: gw.player?.controller?.speed ?? 0,
        torsoPitch, shRoll, trav: rig ? '' : gw.player?.pose?.wall ? 'wall' : (gw.player?.pose?.traverse ?? ''),
        // (N0 leftovers) did the move run: the wall edge / peek, the weapon hand blend (0 right .. 1 left), the strike
        ev: rig ? null : { edge: gw.wallCore?.active ? gw.wallCore.edge : 0, peek: gw.wallCore?.active ? gw.wallCore.peek : 0, hand: r.handBlend ?? 0, melee: gw.player?.pose?.melee ?? -1, strikes: gw.strike?.count?.started ?? 0, ko: gw.strike?.count?.ko ?? 0, ads: !!gw.player?.ads },
      });
    },
  };
};

// ---- summary maths (node side) ----
const range = (a) => (a.length ? Math.max(...a) - Math.min(...a) : 0);
const corr = (a, b) => {
  const n = a.length;
  if (n < 3) return 0;
  const ma = a.reduce((s, x) => s + x, 0) / n;
  const mb = b.reduce((s, x) => s + x, 0) / n;
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; }
  return saa > 1e-9 && sbb > 1e-9 ? sab / Math.sqrt(saa * sbb) : 0;
};
const r1 = (x, k = 1) => +x.toFixed(k);
function summarise(rows, dtSim) {
  if (!rows.length) return null;
  const col = (f) => rows.map(f);
  const pelYaw = col((r) => r.pelYaw);
  const shYaw = col((r) => r.shYaw);
  const twist = rows.map((r) => r.shYaw - r.pelYaw);
  const spd = (k) => {
    let mx = 0, sum = 0;
    for (let i = 1; i < rows.length; i++) {
      const a = rows[i - 1][k], b = rows[i][k];
      const v = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / dtSim;
      mx = Math.max(mx, v); sum += v;
    }
    return [mx, sum / Math.max(1, rows.length - 1)];
  };
  // planted-foot slide and wind-up per contact (from the toe / heel world points)
  const feet = {};
  for (const s of ['L', 'R']) {
    let start = -1, maxSlide = 0, maxWind = 0, contacts = 0, longest = 0;
    for (let i = 0; i < rows.length; i++) {
      const c = rows[i][`c${s}`];
      if (c && start < 0) { start = i; contacts++; }
      if (c && start >= 0) {
        const a = rows[start][`h${s}`], b = rows[i][`h${s}`];
        const at = rows[start][`t${s}`], bt = rows[i][`t${s}`];
        maxSlide = Math.max(maxSlide, Math.min(Math.hypot(b[0] - a[0], b[2] - a[2]), Math.hypot(bt[0] - at[0], bt[2] - at[2])));
        maxWind = Math.max(maxWind, Math.abs(rows[i][`f${s}`]));
        longest = Math.max(longest, (i - start + 1) * dtSim);
      }
      if (!c) start = -1;
    }
    feet[s] = { contacts, slideCmMax: r1(maxSlide * 100), windDegMax: r1(maxWind), longestPlantS: r1(longest, 2) };
  }
  const [wLmax, wLmean] = spd('wL');
  const [wRmax, wRmean] = spd('wR');
  let gunStall = null;
  const gunRows = rows.filter((r) => r.gun);
  if (gunRows.length > 4) {
    const v = [];
    for (let i = 1; i < gunRows.length; i++) { const a = gunRows[i - 1].gun, b = gunRows[i].gun; v.push(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / dtSim); }
    // a stall: the gun's speed falls under 0.1 m/s and then rises over 0.4 m/s again (a stop before the end)
    let low = -1, stall = null;
    for (let i = 0; i < v.length; i++) {
      if (v[i] < 0.1 && low < 0 && i > 0 && Math.max(...v.slice(0, i)) > 0.4) low = i;
      if (low >= 0 && v[i] > 0.4) { stall = { atS: r1(low * dtSim, 3), forS: r1((i - low) * dtSim, 3) }; break; }
      if (v[i] > 0.1 && low >= 0 && v[i] <= 0.4) { /* creeping */ }
    }
    gunStall = { peak: r1(Math.max(...v), 2), stall, speeds: v.map((x) => r1(x, 2)), pitch: gunRows.map((r) => r1(r.gunPitch, 0)), y: gunRows.map((r) => r1(r.gun[1] - r.root[1], 2)) };
  }
  return {
    n: rows.length,
    trunk: { pelvisYawRange: r1(range(pelYaw)), shoulderYawRange: r1(range(shYaw)), twistRange: r1(range(twist)), counterCorr: r1(corr(pelYaw, shYaw), 2) },
    sway: { pelvisLatCm: r1(range(col((r) => r.pel[0])) * 100), pelvisVertCm: r1(range(col((r) => r.pel[1])) * 100), headVertCm: r1(range(col((r) => r.head[1])) * 100), headLatCm: r1(range(col((r) => r.head[0])) * 100), headYawRange: r1(range(col((r) => r.headYaw))), headPitchRange: r1(range(col((r) => r.headPitch))) },
    hands: { wristFwdRangeCm: [r1(range(col((r) => r.wL[2])) * 100), r1(range(col((r) => r.wR[2])) * 100)], wristLatRangeCm: [r1(range(col((r) => r.wL[0])) * 100), r1(range(col((r) => r.wR[0])) * 100)], wristSpeedMax: [r1(wLmax, 2), r1(wRmax, 2)], wristSpeedMean: [r1(wLmean, 2), r1(wRmean, 2)] },
    feet,
    reportedSlideCmMax: r1(Math.max(...rows.map((r) => Math.max(r.slide[0], r.slide[1]))) * 100),
    gun: gunStall,
    draw: rows.some((r) => r.draw >= 0) ? rows.filter((_, i) => i % 2 === 0).map((r) => [r1(r.draw, 2), r1(r.raise, 2)]) : null,
    // (pass 2) the trunk's lean ranges (deg) and the motion states / traversals seen (did the scenario do its move?)
    lean: { torsoPitchRange: r1(range(col((r) => r.torsoPitch ?? 0))), shoulderRollRange: r1(range(col((r) => r.shRoll ?? 0))) },
    seen: [...new Set(rows.map((r) => (r.state ?? '') + (r.trav && r.trav !== 'none' ? `/${r.trav}` : '')))],
    // (N0 leftovers) the wall edge reached (1 = the b end, the body's left; -1 = a), the peek's peak, the weapon hand
    // blend's peak (1 = the left hand), the strike phase's peak, strikes started / knock-outs over the capture, aimed
    ev: rows.some((r) => r.ev) ? { edges: [...new Set(rows.map((r) => r.ev?.edge ?? 0))], peekMax: r1(Math.max(...rows.map((r) => r.ev?.peek ?? 0)), 2), handMax: r1(Math.max(...rows.map((r) => r.ev?.hand ?? 0)), 2), meleeMax: r1(Math.max(...rows.map((r) => r.ev?.melee ?? -1)), 2), strikes: Math.max(...rows.map((r) => r.ev?.strikes ?? 0)), ko: Math.max(...rows.map((r) => r.ev?.ko ?? 0)), aimed: rows.some((r) => r.ev?.ads) } : null,
  };
}

// ---- sheet composition (in the page) ----
async function compose(page, tiles, labels, title, cols = 6, W = 240, H = 300) {
  return page.evaluate(
    async ({ tiles, labels, title, cols, W, H }) => {
      const rows = Math.ceil(tiles.length / cols);
      const c = document.createElement('canvas');
      c.width = cols * W;
      c.height = rows * H + 20;
      const x2 = c.getContext('2d');
      x2.fillStyle = '#111';
      x2.fillRect(0, 0, c.width, c.height);
      x2.fillStyle = '#fff';
      x2.font = '13px Consolas, monospace';
      x2.fillText(title, 6, 15);
      for (let i = 0; i < tiles.length; i++) {
        const im = new Image();
        im.src = tiles[i];
        await im.decode();
        const x = (i % cols) * W;
        const y = 20 + Math.floor(i / cols) * H;
        const s = Math.max(W / im.width, H / im.height);
        const sw = W / s, sh = H / s;
        x2.drawImage(im, (im.width - sw) / 2, (im.height - sh) / 2, sw, sh, x, y, W, H);
        x2.fillStyle = 'rgba(0,0,0,0.6)';
        x2.fillRect(x, y, W, 16);
        x2.fillStyle = '#fff';
        x2.font = '11px Consolas, monospace';
        x2.fillText(labels[i], x + 4, y + 12);
      }
      let q = 0.8;
      let d = c.toDataURL('image/webp', q);
      while (d.length * 0.75 > 590000 && q > 0.3) { q -= 0.1; d = c.toDataURL('image/webp', q); }
      return d;
    },
    { tiles, labels, title, cols, W, H },
  );
}

/** A top-down plot of the feet over time (heel -> toe per sample, darker = later; planted samples thick). */
async function topPlot(page, rows, title, turnAt) {
  return page.evaluate(
    ({ rows, title, turnAt }) => {
      const xs = rows.flatMap((r) => [r.tL[0], r.tR[0], r.hL[0], r.hR[0], r.root[0]]);
      const zs = rows.flatMap((r) => [r.tL[2], r.tR[2], r.hL[2], r.hR[2], r.root[2]]);
      const x0 = Math.min(...xs) - 0.3, x1 = Math.max(...xs) + 0.3, z0 = Math.min(...zs) - 0.3, z1 = Math.max(...zs) + 0.3;
      const S = Math.min(860 / (x1 - x0), 860 / (z1 - z0));
      const c = document.createElement('canvas');
      c.width = 900;
      c.height = 940;
      const g = c.getContext('2d');
      g.fillStyle = '#f4f1ea';
      g.fillRect(0, 0, 900, 940);
      const X = (x) => 20 + (x - x0) * S;
      const Y = (z) => 60 + (z1 - z) * S;
      // 0.5 m grid
      g.strokeStyle = '#ddd';
      for (let x = Math.ceil(x0 * 2) / 2; x < x1; x += 0.5) { g.beginPath(); g.moveTo(X(x), 60); g.lineTo(X(x), 940); g.stroke(); }
      for (let z = Math.ceil(z0 * 2) / 2; z < z1; z += 0.5) { g.beginPath(); g.moveTo(0, Y(z)); g.lineTo(900, Y(z)); g.stroke(); }
      const n = rows.length;
      rows.forEach((r, i) => {
        const k = i / Math.max(1, n - 1);
        for (const [s, col] of [['L', [40, 90, 200]], ['R', [220, 110, 20]]]) {
          const c0 = r[`c${s}`];
          if (!c0 && i % 2) continue;
          const sh = 0.35 + 0.65 * k;
          g.strokeStyle = `rgba(${col[0] * sh | 0},${col[1] * sh | 0},${col[2] * sh | 0},${c0 ? 0.9 : 0.35})`;
          g.lineWidth = c0 ? 3 : 1;
          g.beginPath();
          g.moveTo(X(r[`h${s}`][0]), Y(r[`h${s}`][2]));
          g.lineTo(X(r[`t${s}`][0]), Y(r[`t${s}`][2]));
          g.stroke();
        }
      });
      g.strokeStyle = '#222';
      g.lineWidth = 1.5;
      g.beginPath();
      rows.forEach((r, i) => (i ? g.lineTo(X(r.root[0]), Y(r.root[2])) : g.moveTo(X(r.root[0]), Y(r.root[2]))));
      g.stroke();
      if (turnAt >= 0 && rows[turnAt]) { g.fillStyle = '#c00'; g.beginPath(); g.arc(X(rows[turnAt].root[0]), Y(rows[turnAt].root[2]), 6, 0, 7); g.fill(); }
      g.fillStyle = '#000';
      g.font = '14px Consolas, monospace';
      g.fillText(title, 10, 20);
      g.fillText('top-down, 0.5 m grid. blue = left foot, orange = right; heel->toe each 1/60 s, thick = planted, darker = later; black = root path; red dot = turn input', 10, 40);
      return c.toDataURL('image/webp', 0.85);
    },
    { rows, title, turnAt },
  );
}

const loadMet = () => (existsSync(MET) ? JSON.parse(readFileSync(MET, 'utf8')) : {});
const saveMet = (k, v) => {
  const m = loadMet();
  m[k] = v;
  writeFileSync(MET, JSON.stringify(m, null, 1));
};
const writeWebp = (name, data) => {
  const file = `${OUT}/${name}.webp`;
  writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
  return [file, statSync(file).size];
};

// ---- (pass 2) placement and light helpers ----
/** In the page: the strongest directional light's azimuth toward the light (Babylon yaw, forward = (sin, cos)); NaN
 *  without one. A camera on that side of the subject sees her lit (pass 1's side cameras were back-lit). */
const SUN_AZ = () => {
  const sc = window.__app.loop?.scene ?? window.__app.current?.world?.scene;
  let best = null;
  for (const l of sc?.lights ?? []) if (l.getClassName?.() === 'DirectionalLight' && l.isEnabled() && (!best || l.intensity > best.intensity)) best = l;
  return best ? Math.atan2(-best.direction.x, -best.direction.z) : Number.NaN;
};
/** Of `base + o` for the offsets `o`, the yaw nearest `sunAz` (rad). */
const pickSide = (base, offs, sunAz) => {
  const d = (a) => Math.abs(Math.atan2(Math.sin(a - sunAz), Math.cos(a - sunAz)));
  return offs.map((o) => base + o).reduce((a, b) => (d(b) < d(a) ? b : a));
};
/** (as scripts/anim-audit.mjs step 11) A free high wall on Proving: segment, plane, start `k` along it. */
const FIND_WALL = () => {
  const g = window.__app.current;
  const V = g.player.position.constructor;
  const clear = (x0, z0, x1, z1, y) => !g.ballistics.ray(new V(x0, y, z0), new V(x1, y, z1), 1).hit;
  const floor = (x, z, y) => g.ballistics.ray(new V(x, y + 1, z), new V(x, y - 0.5, z), 1).hit;
  const segs = g.world.level.coverSegments;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (s.low || Math.abs(s.y) > 0.3 || s.len < 4 || s.len > 14) continue;
    let ok = true;
    for (let k = 0.5; k < s.len && ok; k += 0.5) {
      const x = s.ax + s.tx * k + s.nx * 0.45;
      const z = s.az + s.tz * k + s.nz * 0.45;
      ok = clear(x, z, x + s.nx * 2.5, z + s.nz * 2.5, s.y + 1) && clear(x, z, x + s.nx * 2.5, z + s.nz * 2.5, s.y + 0.3) && floor(x + s.nx * 0.6, z + s.nz * 0.6, s.y);
    }
    if (ok) return { seg: i, ax: s.ax, az: s.az, tx: s.tx, tz: s.tz, nx: s.nx, nz: s.nz, y: s.y, len: s.len, k: s.len / 2 };
  }
  return null;
};
/** (as anim-audit step 12b) A free end (`end` 1: the b end, the body's left; -1: the a end) of a high or low wall, open in
 *  front, the start 0.8 m from that end. */
const FIND_END = ([end, low]) => {
  const g = window.__app.current;
  const V = g.player.position.constructor;
  const L = g.wallCore.links;
  const clear = (x0, z0, x1, z1, y) => !g.ballistics.ray(new V(x0, y, z0), new V(x1, y, z1), 1).hit;
  const segs = g.world.level.coverSegments;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (s.low !== low || Math.abs(s.y) > 0.3 || s.len < 2.5 || s.len > 12 || (end > 0 ? L.kB[i] : L.kA[i]) !== 0) continue;
    const k = end > 0 ? s.len - 0.8 : 0.8;
    const x = s.ax + s.tx * k + s.nx * 0.45;
    const z = s.az + s.tz * k + s.nz * 0.45;
    if (!clear(x, z, x + s.nx * 2.5, z + s.nz * 2.5, s.y + 0.3)) continue;
    return { seg: i, ax: s.ax, az: s.az, tx: s.tx, tz: s.tz, nx: s.nx, nz: s.nz, y: s.y, len: s.len, k, end, low };
  }
  return null;
};
/** (as anim-audit step 13) The Proving shed door: 0.7 m out from the leaf's middle, facing it. */
const FIND_PEEKDOOR = () => {
  const g = window.__app.current;
  const d = g.world.doors.list[0];
  if (!d) return null;
  const a = d.anchor;
  const nx = Math.cos(a.yaw);
  const nz = -Math.sin(a.yaw);
  const tx = Math.sin(a.yaw);
  const tz = Math.cos(a.yaw);
  return { sx: a.hinge.x + tx * a.width * 0.5 + nx * 0.7, sz: a.hinge.z + tz * a.width * 0.5 + nz * 0.7, syaw: Math.atan2(-nx, -nz), y: a.hinge.y };
};

// ---- studio group ----
async function runStudio() {
  const { browser, page, errors } = await launch({ url: URL0, params: 'autostart=studio&gfx=high', viewport: { width: 1200, height: 900 } });
  try {
    await page.waitForFunction(() => !!window.__app?.current?.player && !!window.__studio?.state().active, null, { timeout: 300000 });
    if ((await waitOperator(page)) < 0) throw new Error('Wren LOD0 never reached the screen');
    await page.addStyleTag({ content: 'body > :not(#game), .hud, .screens, .toasts, .toast { display: none !important; }' });
    await page.evaluate(SAMPLER);
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    await page.waitForTimeout(3000);
    const ids = await page.evaluate(() => window.__studio.entries());
    // (pass 2) the sun's azimuth (from her toward the light: the side a camera stands on to see her lit) for the pairs
    const sunAz = await page.evaluate(SUN_AZ);
    for (const e of STUDIO) {
      if (!wanted(e)) continue;
      if (!ids.includes(e.id)) { console.log(`skip ${e.n}: no entry ${e.id}`); continue; }
      const t0 = Date.now();
      // a team pair's camera: from the station's south (the pairs face the block's south face), the sun side's 3/4
      const pairYaw = SUN && Number.isFinite(sunAz) ? pickSide(Math.PI, [-0.75, 0.75], sunAz) : Math.PI + 0.75;
      await page.evaluate(({ id, w, spot, az, far, pair, pairYaw }) => {
        const S = window.__studio;
        if (w) S.weapon(w);
        S.pick(id);
        S.spot(spot !== false);
        S.play();
        // (pass 2) the pairs' puppets take the stage lights at twice the default (they stand further from the lights'
        // frame, which is Wren's); every other loop at the default 1
        if (S.stageLight) S.stageLight(pair ? 2 : 1);
        const g = window.__app.current;
        const p = g.player;
        const c = p.cam;
        if (!c.__natOrig) c.__natOrig = c.update.bind(c);
        window.__natCam = { az: az ?? -0.6, far: far ?? 3.3, pair: !!pair, yaw: pairYaw, fix: null, hips: id.startsWith('keyed:') };
        c.update = (...a) => {
          c.__natOrig(...a);
          const cam = c.camera;
          const r = p.rig.root.position;
          const fy = p.rig.root.rotation.y;
          const m = window.__natCam;
          cam.fov = 0.62;
          // (pass 2) Wren is hidden for a pair but her slung guns are not: they hung in front of the pair camera
          for (const sl of g.weapons?.slots ?? []) {
            const nd = sl.model?.node;
            if (!nd) continue;
            if (m.pair && nd.isEnabled()) { nd.setEnabled(false); nd.__natOff = true; }
            else if (!m.pair && nd.__natOff) { nd.setEnabled(true); nd.__natOff = false; }
          }
          if (m.pair && m.fix) {
            // (pass 2) the puppets: the camera fixed on the bounds of the whole cycle (centre, extent)
            const q = m.fix;
            // the studio room is small: past 7 m the camera stood behind its props, so a big extent widens the view
            const D = Math.min(7, 2.4 + q.ext * 1.6);
            cam.fov = Math.max(0.62, 2 * Math.atan((q.ext * 0.62) / D));
            cam.position.set(q.x + Math.sin(m.yaw) * D, q.y + 0.5, q.z + Math.cos(m.yaw) * D);
            cam.setTarget(new r.constructor(q.x, q.y, q.z));
            return;
          }
          // (pass 2) a keyed clip on the spot can carry her hips off the root: aim at the hips (x, z) for those
          let tx = r.x;
          let tz = r.z;
          if (m.hips) {
            const h = p.rig.hips.getAbsolutePosition();
            tx = h.x;
            tz = h.z;
          }
          cam.position.set(tx + Math.sin(fy + m.az) * m.far, r.y + 1.25, tz + Math.cos(fy + m.az) * m.far);
          cam.setTarget(new r.constructor(tx, r.y + 0.9, tz));
        };
        // (pass 2) the stage lights follow Wren (hidden at the viewing spot for a team pair): moved onto the puppets'
        // middle and made to light their meshes (their materials take the extra lights as the stage's own fit does)
        const st = g.studio;
        if (st && !st.__natLF) {
          st.__natLF = st.lightsFrame.bind(st);
          st.lightsFrame = () => {
            st.__natLF();
            const ps = window.__natCam?.pair ? st.puppets : null;
            if (!ps) return;
            const q = window.__natCam.fix;
            const rr = p.rig.root.position;
            const mx = q ? q.x : (ps[0].rig.root.position.x + ps[1].rig.root.position.x) / 2;
            const mz = q ? q.z : (ps[0].rig.root.position.z + ps[1].rig.root.position.z) / 2;
            const my = q ? q.y - 0.9 : 0;
            for (const l of st.stageLights) {
              l.position.x += mx - rr.x;
              l.position.y += my - rr.y;
              l.position.z += mz - rr.z;
              for (const op of ps) {
                for (const ms of op.rig.root.getChildMeshes(false)) {
                  const s = ms.sourceMesh ?? ms;
                  if (!ms.sourceMesh && !l.includedOnlyMeshes.includes(s)) l.includedOnlyMeshes.push(s); // never a shared part base: it lights every instance in the scene
                  const mat = s.material;
                  if (mat && typeof mat.maxSimultaneousLights === 'number' && !mat.disableLighting && mat.maxSimultaneousLights < s.lightSources.length) {
                    const fr = mat.isFrozen;
                    if (fr) mat.unfreeze();
                    mat.maxSimultaneousLights = s.lightSources.length;
                    if (fr) mat.freeze();
                  }
                }
              }
              if (!l.isEnabled()) l.setEnabled(true);
            }
          };
        }
        window.__nat.rows = [];
        window.__nat.rowsB = [];
      }, { ...e, pairYaw });
      await page.waitForTimeout(1500);
      await page.evaluate(() => { window.__app.loop.manual = true; });
      const tiles = [];
      const labels = [];
      // one 60 Hz step: Wren (a hold pair: and the guard under `rowsB`); a team pair: role A and role B
      const step = (s) => page.evaluate(({ s }) => {
        const n = Math.max(1, Math.round(s * 60));
        const st = window.__app.current.studio;
        for (let i = 0; i < n; i++) {
          window.__app.loop.stepHeadless(1 / 60, 60);
          const ps = window.__natCam?.pair ? st?.puppets : null;
          if (ps) {
            window.__nat.sample(ps[0].rig, window.__nat.rows);
            window.__nat.sample(ps[1].rig, window.__nat.rowsB);
          } else {
            window.__nat.sample();
            if (st?.guard && window.__natCam?.hold) window.__nat.sample(st.guard, window.__nat.rowsB);
          }
        }
      }, { s });
      if (e.hold) await page.evaluate(() => { window.__natCam.hold = true; });
      let cycle = e.pair || e.hold ? await page.evaluate(() => window.__studio.pair().cycle ?? 0) : 0;
      if (e.pair) {
        // the whole cycle's bounds (root, head, wrists, ankles of both puppets) fix the camera
        await page.evaluate(() => { window.__app.loop.stepHeadless(2 / 60, 60); });
        cycle = (await page.evaluate(() => window.__studio.pair().cycle)) || 4;
        const fix = await page.evaluate((cyc) => {
          const ps = window.__app.current.studio.puppets;
          const b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
          for (let i = 0; i < Math.round(cyc * 60); i++) {
            window.__app.loop.stepHeadless(1 / 60, 60);
            for (const op of ps) {
              const r = op.rig;
              for (const n of [r.root, r.headNode, r.wristL, r.wristR, r.ankleL, r.ankleR]) {
                n.computeWorldMatrix(true);
                const v = n.getAbsolutePosition();
                b[0] = Math.min(b[0], v.x); b[1] = Math.min(b[1], v.y); b[2] = Math.min(b[2], v.z);
                b[3] = Math.max(b[3], v.x); b[4] = Math.max(b[4], v.y); b[5] = Math.max(b[5], v.z);
              }
            }
          }
          const fix = { x: (b[0] + b[3]) / 2, y: (b[1] + b[4]) / 2, z: (b[2] + b[5]) / 2, ext: Math.max(1.8, b[3] - b[0], b[4] - b[1], b[5] - b[2]) };
          // no seek back to 0: a jump of the pair clock hid the puppets for ~0.6 s (their figures fade in after a
          // jump); one cycle on, the clock is back where the bounds pass started
          window.__natCam.fix = fix;
          // one frame so the first tile is taken from the fixed camera
          window.__app.loop.stepHeadless(1 / 60, 60);
          return fix;
        }, cycle);
        console.log(`  ${e.n}: cycle ${cycle.toFixed(2)} s, bounds centre ${fix.x.toFixed(2)},${fix.y.toFixed(2)},${fix.z.toFixed(2)} ext ${fix.ext.toFixed(2)} m, camera yaw ${pairYaw.toFixed(2)}`);
      } else if (e.hold) {
        // the hold clips' keyed cycles (studio.ts: hold_idle 4 s, hold_back 2 x 0.28 m / 1.0 m/s, choke 5.5 s, knife 3 s)
        cycle = { hold_idle: 4, hold_back: 0.56, hold_choke: 5.5, hold_knife: 3 }[e.id.split(':')[1]] ?? 4;
      }
      const dt = e.pair || e.hold ? cycle / e.f : e.dt;
      if (e.warm) await step(e.warm);
      await page.evaluate(() => { window.__nat.rows = []; window.__nat.rowsB = []; });
      for (let f = 0; f < e.f; f++) {
        if (f > 0) await step(dt);
        await page.waitForTimeout(120);
        const lab = await page.evaluate(() => {
          const g = window.__app.current;
          const pr = window.__studio.pair();
          if (window.__natCam?.pair) {
            // (rerun) each puppet's figure LOD (-1 = none drawn) and its root's distance to the camera: why they vanish
            const ps = g.studio?.puppets ?? [];
            const cp = g.player.cam.camera.position;
            const lod = (op) => `${op.figure.current}@${Math.hypot(op.rig.root.position.x - cp.x, op.rig.root.position.y - cp.y, op.rig.root.position.z - cp.z).toFixed(1)}`;
            return `A ${pr.aState ?? ''} ${ps[0] ? lod(ps[0]) : ''} / B ${pr.bState ?? ''} ${ps[1] ? lod(ps[1]) : ''}`;
          }
          const r = g.player.rig;
          const c = g.player.controller;
          return `${c.motion?.state ?? ''} ${r.planner?.L?.contact ? 'L' : '-'}${r.planner?.R?.contact ? 'R' : '-'}`;
        });
        const buf = await page.screenshot({ type: 'png' });
        tiles.push(`data:image/png;base64,${buf.toString('base64')}`);
        labels.push(`${(f * dt).toFixed(2)}s ${lab}`);
      }
      // a full cycle of samples at 60 Hz for the numbers (moving loops: 1.6 s; idles: their dt x frames; pairs: one cycle)
      if (e.pair || e.hold) await step(dt);
      let rows = await page.evaluate(() => window.__nat.rows);
      if (!e.pair && !e.hold && rows.length < 90) { await step(1.6); rows = await page.evaluate(() => window.__nat.rows); }
      const rowsB = await page.evaluate(() => window.__nat.rowsB);
      const sum = summarise(rows, 1 / 60);
      const sumB = rowsB.length ? summarise(rowsB, 1 / 60) : null;
      const what = e.pair ? 'Anim Studio pair (camera on both puppets, stage light moved onto them)' : 'Anim Studio, gfx=high, stage light';
      const data = await compose(page, tiles, labels, `${e.n} (${e.id}${e.w ? ', ' + e.w : ''}) - ${what}`, 6, e.pair ? 300 : 240, 300);
      const [file, size] = writeWebp(e.n, data);
      saveMet(`studio:${e.n}`, { id: e.id, weapon: e.w ?? null, file, pass: e.pass ?? 1, row: e.row ?? null, ...(sum ?? {}), ...(sumB ? { b: sumB } : {}) });
      console.log(`${e.n}: ${file} ${size} B ${((Date.now() - t0) / 1000).toFixed(0)} s ${sum ? JSON.stringify({ trunk: sum.trunk, sway: sum.sway, feet: sum.feet }) : ''}${sumB ? ` B: ${JSON.stringify({ trunk: sumB.trunk, lean: sumB.lean })}` : ''}`);
      await page.evaluate(() => { window.__app.loop.manual = false; });
    }
    if (errors.length) console.log('console errors:', errors.slice(0, 5).join(' | '));
  } finally {
    await browser.close();
  }
}

// ---- proving group ----
async function runProving() {
  for (const sc of PROVING) {
    if (!wanted(sc)) continue;
    const t0 = Date.now();
    const params = sc.g7 ? 'autostart=warehouse&mode=clear&gfx=high' : sc.params ?? 'autostart=proving&gfx=high';
    const { browser, page, errors } = await launch({ url: URL0, params, viewport: { width: 1000, height: 800 } });
    try {
      await page.waitForFunction(() => window.__app.current?.player, null, { timeout: 300000 });
      if ((await waitOperator(page)) < 0) throw new Error('Wren LOD0 never reached the screen');
      await page.addStyleTag({ content: 'body > :not(#game), .hud, .screens, .toasts, .toast { display: none !important; }' });
      await page.evaluate(SAMPLER);
      // (pass 2) a placement read from the level (a free high wall, a wall end, the shed door)
      let place = { pos: sc.pos ?? [2, -2.2], yaw: sc.yaw ?? 0, y: sc.y ?? 0 };
      if (sc.find) {
        const [kind, a1, a2] = sc.find;
        let w = null;
        if (kind === 'wall') {
          w = await page.evaluate(FIND_WALL);
          if (w) place = { pos: [w.ax + w.tx * w.k + w.nx * a1, w.az + w.tz * w.k + w.nz * a1], yaw: Math.atan2(-w.nx, -w.nz), y: w.y };
        } else if (kind === 'end') {
          w = await page.evaluate(FIND_END, [a1, a2]);
          if (w) place = { pos: [w.ax + w.tx * w.k + w.nx * 0.75, w.az + w.tz * w.k + w.nz * 0.75], yaw: Math.atan2(-w.nx, -w.nz), y: w.y };
        } else if (kind === 'door') {
          w = await page.evaluate(FIND_PEEKDOOR);
          if (w) place = { pos: [w.sx, w.sz], yaw: w.syaw, y: w.y };
        }
        if (!w) throw new Error(`no ${sc.find.join(' ')} placement on this map`);
        // (N0 leftovers) the wall end's plane for the `tw` / `look` inputs
        if (kind === 'end') await page.evaluate((w) => { window.__natW = w; }, w);
      }
      // (pass 2) the camera on the sun side: of the scenario's two mirror sides, the one nearer the sun's azimuth
      const sunAz = SUN ? await page.evaluate(SUN_AZ) : Number.NaN;
      const natAz0 = Number(process.env.NAT_AZ ?? 0.75);
      const natFaz0 = Number(process.env.NAT_FAZ ?? 0.6);
      const sun = Number.isFinite(sunAz);
      const natAz = sun ? pickSide(place.yaw, [natAz0, -natAz0], sunAz) - place.yaw : natAz0;
      const natFaz = sun ? pickSide(place.yaw, [natFaz0, -natFaz0], sunAz) - place.yaw : natFaz0;
      const sideAz = sun ? pickSide(place.yaw, [-Math.PI / 2, Math.PI / 2], sunAz) - place.yaw : -Math.PI / 2;
      const G7AT0 = "g.target.health.invulnerable = true; g.mode.pending.length = 0; g.enemyMgr.clear(); const V = g.player.position.constructor; const e = g.enemyMgr.spawn('grunt', new V(2, 0, -1), false, 0); e.passive = true; e.info = { lines: ['(audit) the line he gives'] }; window.__natE = e;";
      await page.evaluate(({ pos, yaw, weapon, y0, cam, fixCam, g7, g7at0, natAz, natFaz, sideAz, keyK }) => {
        const a = window.__app;
        const g = a.current;
        const p = g.player;
        a.loop.manual = true;
        if (g7) new Function('a', 'g', g7at0)(a, g);
        const V = p.controller.pos.constructor;
        if (weapon) {
          const W = g.weapons;
          const j = W.slots.findIndex((q) => q.def.class === weapon);
          if (j < 0) throw new Error('no ' + weapon);
          W.index = j;
          p.controller.speedMul = W.current.def.moveSpeedMult;
          p.cam.adsZoom = W.current.stats.adsZoom;
        }
        p.controller.teleport(new V(pos[0], y0 ?? 0, pos[1]), yaw);
        p.controller.clearCrouchToggle?.();
        p.cam.yaw = yaw;
        p.cam.pitch = 0;
        // (rerun, as anim-audit's tp) the game camera snapped to the yaw: unsnapped it eased round from the spawn view, and
        // the stick frame (wall slide, door peek) read that old view
        p.cam.snap?.();
        // (as anim-audit) the camera's own clock from 0: a wall entry reads the camera's view
        p.cam['t'] = 0;
        window.__natYaw0 = yaw;
        const orig = p.cam.update.bind(p.cam);
        const fixed = { x: 0, z: 0, set: false };
        // (pass 2) an audit-only key light from the camera, on her meshes only (as the studio's stage light): in the
        // daylight maps her dark suit renders as a flat black silhouette even from the sun side, so poses read but
        // limbs crossing the body do not. Rendering only (no game state reads it). NAT_KEY=0 turns it off.
        const sceneL = a.loop.scene;
        const sunL = [...(sceneL?.lights ?? [])].find((l) => l.getClassName?.() === 'DirectionalLight');
        const key = keyK > 0 && sunL ? new sunL.constructor('nat-key', sunL.direction.clone(), sceneL) : null;
        if (key) {
          key.intensity = keyK;
          key.diffuse.set(1, 0.97, 0.92);
          key.specular.set(0.25, 0.25, 0.25);
          key.includedOnlyMeshes = [];
          // an empty include list lights everything: off until her meshes are in it
          key.setEnabled(false);
        }
        let keyNext = 0;
        const keyFrame = (cx, cy, cz, r) => {
          if (!key) return;
          const dx = r.x - cx;
          const dz = r.z - cz;
          const h = Math.hypot(dx, dz) || 1;
          key.direction.set(dx / h, -0.55, dz / h);
          const now = performance.now();
          if (now < keyNext) return;
          keyNext = now + 500;
          for (const ms of p.rig.root.getChildMeshes(false)) {
            const s = ms.sourceMesh ?? ms;
            if (!ms.sourceMesh && !key.includedOnlyMeshes.includes(s)) key.includedOnlyMeshes.push(s); // never a shared part base (as above)
            const mat = s.material;
            if (mat && typeof mat.maxSimultaneousLights === 'number' && !mat.disableLighting && mat.maxSimultaneousLights < s.lightSources.length) {
              const fr = mat.isFrozen;
              if (fr) mat.unfreeze();
              mat.maxSimultaneousLights = s.lightSources.length;
              if (fr) mat.freeze();
            }
          }
          if (!key.isEnabled() && key.includedOnlyMeshes.length) key.setEnabled(true);
        };
        p.cam.update = (dt, feet, crouch) => {
          orig(dt, feet, crouch);
          const c = p.cam.camera;
          const r = p.rig.root.position;
          keyFrame(c.position.x, c.position.y, c.position.z, r);
          if (cam === 'fixed') {
            // a 3/4 high camera fixed where she started, looking at her
            // (pass 2) from the teleport spot: on the first update the root was still at the spawn (pass 1's fixed
            // camera stood ~15 m off, behind the cover garden)
            if (!fixed.set) { const fa = yaw + natFaz; fixed.x = pos[0] + Math.sin(yaw) * 1.2 + Math.sin(fa) * 4.6; fixed.z = pos[1] + Math.cos(yaw) * 1.2 + Math.cos(fa) * 4.6; fixed.set = true; }
            c.fov = 0.75;
            c.position.set(fixed.x, r.y + 2.1, fixed.z);
            c.setTarget(new r.constructor(r.x, r.y + 0.6, r.z));
            return;
          }
          const fy = fixCam ? yaw : p.controller.renderYaw;
          // 'back': straight behind her (corridors, doorways), a little higher
          const az = cam === 'front34' ? natAz : cam === 'back' ? Math.PI : sideAz;
          const D = cam === 'front34' ? 2.4 : 3.1;
          c.fov = 0.7;
          c.position.set(r.x + Math.sin(fy + az) * D, r.y + 1.15, r.z + Math.cos(fy + az) * D);
          c.setTarget(new r.constructor(r.x, r.y + (cam === 'front34' ? 1.05 : 0.85), r.z));
        };
        a.loop.stepHeadless(y0 > 0 ? 0.01 : 0.3);
      }, { pos: place.pos, yaw: place.yaw, weapon: sc.weapon ?? null, y0: place.y, cam: sc.cam, fixCam: !!sc.fixCam, g7: !!sc.g7, g7at0: G7AT0, natAz, natFaz, sideAz, keyK: KEY });
      const pick = (k) => `g.grabMenu.sel = ${k}; a.input.state.tap('interact');`;
      // FS: on the line from the guard to her, 0.85 m from him, facing him (body and camera)
      const FS = 'const e = window.__natE; const p = g.player; const q = p.position; let dx = q.x - e.pos.x; let dz = q.z - e.pos.z; const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d; const yw = Math.atan2(-dx, -dz); p.controller.teleport(new q.constructor(e.pos.x + dx * 0.85, e.pos.y, e.pos.z + dz * 0.85), yw); p.cam.yaw = yw; p.cam.snap?.(); window.__natYaw0 = yw; window.__natGap = Math.hypot(p.position.x - e.pos.x, p.position.z - e.pos.z);';
      const CODE = { P: "a.input.state.tap('interact');", K0: pick(0), K1: pick(1), K2: pick(2), K4: pick(4), F: 'const e = window.__natE; const q = g.player.position; g.player.cam.yaw = Math.atan2(e.pos.x - q.x, e.pos.z - q.z);', FS };
      const code = (c) => (c ? CODE[c] ?? c : null);
      // the stick, the held buttons (aim always; fire, crouch, co-op when the row names them), the aim yaw `cy` from the
      // start yaw, a one-off code and the row's `every` code (with `t`)
      const setInput = (inp, c, every, t) => page.evaluate(([inp, c, every, t]) => {
        const a = window.__app;
        const s = a.input.state;
        s.move.x = inp.x ?? 0;
        s.move.y = inp.y ?? 0;
        s.set('nat-ads', 'ads', !!inp.ads);
        for (const b of ['fire', 'crouch', 'coop']) if (b in inp) s.set(`nat-${b}`, b, !!inp[b]);
        if (typeof inp.cy === 'number') a.current.player.cam.yaw = window.__natYaw0 + inp.cy;
        // (N0 leftovers) the wall end rows: `look` 0..1 turns the camera from the start yaw (facing the wall) to look past
        // the end (along the wall, a little out); `tw` pushes the stick toward the end in the world, from the live
        // camera yaw (the inverse of gameState.wallStep's stick frame)
        const w = window.__natW;
        if (w && typeof inp.look === 'number' && inp.look > 0) {
          const ty = Math.atan2(w.end * w.tx + w.nx * 0.35, w.end * w.tz + w.nz * 0.35);
          const d = Math.atan2(Math.sin(ty - window.__natYaw0), Math.cos(ty - window.__natYaw0));
          a.current.player.cam.yaw = window.__natYaw0 + d * Math.min(1, inp.look);
        }
        if (w && inp.tw) {
          const cy = a.current.player.cam.yaw;
          const fx = Math.sin(cy);
          const fz = Math.cos(cy);
          const dx = w.end * w.tx * inp.tw;
          const dz = w.end * w.tz * inp.tw;
          s.move.x = fz * dx - fx * dz;
          s.move.y = fx * dx + fz * dz;
        }
        if (c) new Function('a', 'g', c)(a, a.current);
        if (every) new Function('a', 'g', 't', every)(a, a.current, t);
      }, [inp, c, every ?? null, t ?? 0]);
      const step60 = (k) => page.evaluate((k) => { for (let i = 0; i < k; i++) { window.__app.loop.stepHeadless(1 / 60, 60); window.__nat.sample(); } }, k);
      const warm = (t) => (typeof sc.warm === 'function' ? sc.warm(t) : sc.warm ?? {});
      if (sc.at0) await setInput(warm(0), sc.at0);
      const preAt = sc.preAt ?? {};
      const preN = Math.round(sc.pre * 60);
      for (let i = 0; i < preN; i++) {
        const t = i / 60;
        const k = Object.entries(preAt).find(([q]) => Math.abs(Number(q) - t) < 1 / 120)?.[1];
        await setInput(warm(t), code(k));
        await step60(1);
      }
      // keep the last 0.5 s of warm-up for the top plot's lead-in
      const lead = await page.evaluate(() => window.__nat.rows.slice(-30));
      await page.evaluate(() => { window.__nat.rows = []; });
      const tiles = [];
      const labels = [];
      const at = sc.at ?? {};
      const perFrame = Math.max(1, Math.round(sc.dt * dtMul * 60));
      let t = 0;
      const total = sc.f * perFrame + (sc.top ? 60 : 0);
      for (let i = 0; i <= total; i++) {
        if (i % perFrame === 0 && i / perFrame < sc.f) {
          await page.waitForTimeout(90);
          const lab = await page.evaluate(() => {
            const g = window.__app.current;
            const r = g.player.rig;
            const c = g.player.controller;
            const q = g.player.pose;
            const tv = q.wall ? ' wall' : q.traverse && q.traverse !== 'none' ? ` ${q.traverse}` : '';
            // (N0 leftovers) the peek amount, the weapon in the left hand, the strike phase, when they run
            const w = g.wallCore;
            const ex = `${w?.active && w.peek > 0.01 ? ` pk${w.peek.toFixed(1)}` : ''}${(r.handBlend ?? 0) > 0.01 ? ` hand${r.handBlend.toFixed(1)}` : ''}${q.melee >= 0 ? ` strike${q.melee.toFixed(2)}` : ''}${g.player.ads ? ' aim' : ''}`;
            return `${c.motion?.state ?? ''}${tv} ${c.speed.toFixed(1)} ${r.planner?.L?.contact ? 'L' : '-'}${r.planner?.R?.contact ? 'R' : '-'}${ex}`;
          });
          const buf = await page.screenshot({ type: 'png' });
          tiles.push(`data:image/png;base64,${buf.toString('base64')}`);
          labels.push(`${t.toFixed(2)}s ${lab}`);
        }
        const k = Object.entries(at).find(([q]) => Math.abs(Number(q) - t) < 1 / 120)?.[1];
        await setInput(sc.input(t), code(k), sc.every, t);
        await step60(1);
        t += 1 / 60;
      }
      const rows = await page.evaluate(() => window.__nat.rows);
      // (rerun) NAT_DUMP=<dir>: the raw 60 Hz rows per scenario (for checking a number against the motion)
      if (process.env.NAT_DUMP) writeFileSync(`${process.env.NAT_DUMP}/${sc.n}.json`, JSON.stringify(rows));
      const sum = summarise(rows, 1 / 60);
      const data = await compose(page, tiles, labels, `${sc.n} - ${params}, cam ${sc.cam}${sun ? ' (sun side)' : ''}${KEY > 0 ? ', audit key light on her' : ''}`, 6, sc.cam === 'fixed' ? 300 : 240, 300);
      const [file, size] = writeWebp(sc.n, data);
      let topFile = null;
      if (sc.top) {
        const all = [...lead, ...rows];
        const tp = await topPlot(page, all, `${sc.n}: feet from 0.5 s before the turn input to ${(rows.length / 60).toFixed(1)} s after`, lead.length);
        [topFile] = writeWebp(`${sc.n}-top`, tp);
      }
      // turn numbers: from the turn input, the time each foot keeps its first plant and its wind-up
      let turn = null;
      if (sc.top) {
        const yaw0 = rows[0]?.rootYaw ?? 0;
        const ang = (a) => ((((a + 180) % 360) + 360) % 360) - 180;
        const yawT = rows.map((r) => ang(r.rootYaw - yaw0));
        const firstLift = { L: -1, R: -1 };
        for (const s of ['L', 'R']) { for (let i = 0; i < rows.length; i++) if (!rows[i][`c${s}`]) { firstLift[s] = r1(i / 60, 3); break; } }
        const reach = (deg) => { const i = yawT.findIndex((y) => Math.abs(y) >= deg); return i < 0 ? null : r1(i / 60, 2); };
        turn = { yawAt90pct: reach(Math.abs(yawT[yawT.length - 1]) * 0.9), finalYaw: r1(yawT[yawT.length - 1]), firstLiftS: firstLift, windDegMax: [sum.feet.L.windDegMax, sum.feet.R.windDegMax], plantSlideCm: [sum.feet.L.slideCmMax, sum.feet.R.slideCmMax] };
      }
      saveMet(`proving:${sc.n}`, { params, file, topFile, turn, pass: sc.pass ?? 1, row: sc.row ?? null, ...sum });
      console.log(`${sc.n}: ${file} ${size} B ${((Date.now() - t0) / 1000).toFixed(0)} s ${JSON.stringify({ seen: sum?.seen, trunk: sum?.trunk, lean: sum?.lean, feet: sum?.feet, turn, gun: sum?.gun ? { peak: sum.gun.peak, stall: sum.gun.stall } : null, ev: sum?.ev, gap: await page.evaluate(() => window.__natGap ?? null) })}`);
      const real = errors.filter((x) => !/GPU stall|WebGL|swiftshader|Automatic fallback|AudioContext/i.test(x));
      if (real.length) console.log('  console:', real.slice(0, 3).join(' | '));
    } catch (err) {
      console.log(`${sc.n}: FAILED ${err.message}`);
    } finally {
      await browser.close();
    }
  }
}

try {
  if (group === 'studio' || group === 'all') await runStudio();
  if (group === 'proving' || group === 'all') await runProving();
  if (!['studio', 'proving', 'all'].includes(group)) throw new Error(`unknown group ${group}`);
} finally {
  kill();
}
