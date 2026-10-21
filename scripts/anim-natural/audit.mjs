// anim-natural N0 audit helper (desktop GPU look, under C:/NightShift/heavy.lock; needs a prior `npm run build`).
// Serves dist/ on 4189, plays Wren's animations and writes, per row, a labelled contact sheet (webp, < 600 KB) under
// docs/anim-natural/audit/ plus the naturalness numbers sampled every 60 Hz step into docs/anim-natural/audit/metrics.json:
//   trunk: pelvis yaw, shoulder-line yaw and their twist (deg, in the root frame), their correlation (< 0 = counter-rotation)
//   sway: pelvis lateral / vertical range (cm), head vertical range (cm), head yaw / pitch range (deg)
//   hands: wrist forward range (cm, root frame) and peak / mean wrist speed (m/s, root frame)
//   feet: planted-foot slide (max cm per contact), the planted foot's yaw against the pelvis (deg: wind-up), contacts
//   draw: draw progress, carry raise and the held gun's world speed (a stall = speed ~0 before the settle)
// Groups: `studio` (Anim Studio loops, ?autostart=studio&gfx=high, on the spot, front 3/4 view), `proving` (scenarios on
// Proving Grounds at ?gfx=high: gait turns with a top-down foot plot, draws, starts / stops, one-shots).
//   E2E_GPU=1 node scripts/anim-natural/audit.mjs <studio|proving> [--only=a,b] [--frames=12]
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { launch, waitOperator } from '../e2e-lib.mjs';

const PORT = 4189;
const OUT = 'docs/anim-natural/audit';
const MET = `${OUT}/metrics.json`;
const group = process.argv[2] ?? 'studio';
const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const only = arg('only', '') ? arg('only', '').split(',') : null;
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
  // co-op pairs and holds: scrubbed (seek) over the cycle
  ...['boost', 'relay', 'throw', 'hang', 'rope', 'revive'].map((m) => ({ n: `pair-${m}`, id: `pair:${m}`, f: 12, seek: true, az: -1.4, far: 4.6 })),
  ...['hold_idle', 'hold_fwd', 'hold_choke', 'hold_knife'].map((m) => ({ n: `pair-${m}`, id: `pair:${m}`, f: 12, seek: true, az: -1.0, far: 3.6 })),
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
];

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
    sample(rig) {
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
      window.__nat.rows.push({
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
    for (const e of STUDIO) {
      if (only && !only.includes(e.n)) continue;
      if (e.seek && !only && !process.env.NAT_PAIRS) continue;
      if (!ids.includes(e.id)) { console.log(`skip ${e.n}: no entry ${e.id}`); continue; }
      const t0 = Date.now();
      await page.evaluate(({ id, w, spot, az, far }) => {
        const S = window.__studio;
        if (w) S.weapon(w);
        S.pick(id);
        S.spot(spot !== false);
        S.play();
        const p = window.__app.current.player;
        const c = p.cam;
        if (!c.__natOrig) c.__natOrig = c.update.bind(c);
        window.__natCam = { az: az ?? -0.6, far: far ?? 3.3 };
        c.update = (...a) => {
          c.__natOrig(...a);
          const cam = c.camera;
          const r = p.rig.root.position;
          const fy = p.rig.root.rotation.y;
          const m = window.__natCam;
          cam.fov = 0.62;
          cam.position.set(r.x + Math.sin(fy + m.az) * m.far, r.y + 1.25, r.z + Math.cos(fy + m.az) * m.far);
          cam.setTarget(new r.constructor(r.x, r.y + 0.9, r.z));
        };
        window.__nat.rows = [];
      }, e);
      await page.waitForTimeout(1500);
      await page.evaluate(() => { window.__app.loop.manual = true; });
      const tiles = [];
      const labels = [];
      const step = (s) => page.evaluate(({ s }) => {
        const n = Math.max(1, Math.round(s * 60));
        for (let i = 0; i < n; i++) { window.__app.loop.stepHeadless(1 / 60, 60); window.__nat.sample(); }
      }, { s });
      if (e.warm) await step(e.warm);
      await page.evaluate(() => { window.__nat.rows = []; });
      let cycle = 0;
      if (e.seek) cycle = await page.evaluate(() => window.__studio.pair().cycle ?? 0);
      for (let f = 0; f < e.f; f++) {
        if (e.seek) {
          await page.evaluate((v) => window.__studio.seek(v), f / e.f);
          await page.evaluate(() => { for (let i = 0; i < 3; i++) window.__app.loop.stepHeadless(1 / 60, 60); });
        } else if (f > 0) await step(e.dt);
        await page.waitForTimeout(120);
        const lab = await page.evaluate(() => { const g = window.__app.current; const r = g.player.rig; const c = g.player.controller; return `${c.motion?.state ?? ''} ${r.planner?.L?.contact ? 'L' : '-'}${r.planner?.R?.contact ? 'R' : '-'}`; });
        const buf = await page.screenshot({ type: 'png' });
        tiles.push(`data:image/png;base64,${buf.toString('base64')}`);
        labels.push(`${e.seek ? `${(f / e.f * cycle).toFixed(2)}s` : `${(f * e.dt).toFixed(2)}s`} ${lab}`);
      }
      // a full cycle of samples at 60 Hz for the numbers (moving loops: 1.6 s; idles: their dt x frames)
      let rows = await page.evaluate(() => window.__nat.rows);
      if (!e.seek && rows.length < 90) { await step(1.6); rows = await page.evaluate(() => window.__nat.rows); }
      const sum = e.seek ? null : summarise(rows, 1 / 60);
      const data = await compose(page, tiles, labels, `${e.n} (${e.id}${e.w ? ', ' + e.w : ''}) - Anim Studio, gfx=high, stage light`, 6, 240, 300);
      const [file, size] = writeWebp(e.n, data);
      saveMet(`studio:${e.n}`, { id: e.id, weapon: e.w ?? null, file, ...(sum ?? {}) });
      console.log(`${e.n}: ${file} ${size} B ${((Date.now() - t0) / 1000).toFixed(0)} s ${sum ? JSON.stringify({ trunk: sum.trunk, sway: sum.sway, feet: sum.feet }) : ''}`);
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
    if (only && !only.includes(sc.n)) continue;
    const t0 = Date.now();
    const params = sc.g7 ? 'autostart=warehouse&mode=clear&gfx=high' : sc.params ?? 'autostart=proving&gfx=high';
    const { browser, page, errors } = await launch({ url: URL0, params, viewport: { width: 1000, height: 800 } });
    try {
      await page.waitForFunction(() => window.__app.current?.player, null, { timeout: 300000 });
      if ((await waitOperator(page)) < 0) throw new Error('Wren LOD0 never reached the screen');
      await page.addStyleTag({ content: 'body > :not(#game), .hud, .screens, .toasts, .toast { display: none !important; }' });
      await page.evaluate(SAMPLER);
      const G7AT0 = "g.target.health.invulnerable = true; g.mode.pending.length = 0; g.enemyMgr.clear(); const V = g.player.position.constructor; const e = g.enemyMgr.spawn('grunt', new V(2, 0, -1), false, 0); e.passive = true;";
      await page.evaluate(({ pos, yaw, weapon, y0, cam, fixCam, g7, g7at0, natAz, natFaz }) => {
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
        p.cam.yaw = yaw;
        p.cam.pitch = 0;
        const orig = p.cam.update.bind(p.cam);
        const fixed = { x: 0, z: 0, set: false };
        p.cam.update = (dt, feet, crouch) => {
          orig(dt, feet, crouch);
          const c = p.cam.camera;
          const r = p.rig.root.position;
          if (cam === 'fixed') {
            // a 3/4 high camera fixed where she started, looking at her
            if (!fixed.set) { const fa = yaw + natFaz; fixed.x = r.x + Math.sin(yaw) * 1.2 + Math.sin(fa) * 4.6; fixed.z = r.z + Math.cos(yaw) * 1.2 + Math.cos(fa) * 4.6; fixed.set = true; }
            c.fov = 0.75;
            c.position.set(fixed.x, r.y + 2.1, fixed.z);
            c.setTarget(new r.constructor(r.x, r.y + 0.6, r.z));
            return;
          }
          const fy = fixCam ? yaw : p.controller.renderYaw;
          const az = cam === 'front34' ? natAz : -Math.PI / 2;
          const D = cam === 'front34' ? 2.4 : 3.1;
          c.fov = 0.7;
          c.position.set(r.x + Math.sin(fy + az) * D, r.y + 1.15, r.z + Math.cos(fy + az) * D);
          c.setTarget(new r.constructor(r.x, r.y + (cam === 'front34' ? 1.05 : 0.85), r.z));
        };
        a.loop.stepHeadless(y0 > 0 ? 0.01 : 0.3);
      }, { pos: sc.pos ?? [2, -2.2], yaw: sc.yaw ?? 0, weapon: sc.weapon ?? null, y0: sc.y ?? 0, cam: sc.cam, fixCam: !!sc.fixCam, g7: !!sc.g7, g7at0: G7AT0, natAz: Number(process.env.NAT_AZ ?? 0.75), natFaz: Number(process.env.NAT_FAZ ?? 0.6) });
      const CODE = { P: "a.input.state.tap('interact');", K0: "g.grabMenu.sel = 0; a.input.state.tap('interact');", K2: "g.grabMenu.sel = 2; a.input.state.tap('interact');" };
      const code = (c) => (c ? CODE[c] ?? c : null);
      const setInput = (inp, c) => page.evaluate(([inp, c]) => {
        const a = window.__app;
        const s = a.input.state;
        s.move.x = inp.x ?? 0;
        s.move.y = inp.y ?? 0;
        s.set('nat-ads', 'ads', !!inp.ads);
        if (c) new Function('a', 'g', c)(a, a.current);
      }, [inp, c]);
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
      const perFrame = Math.max(1, Math.round(sc.dt * 60));
      let t = 0;
      const total = sc.f * perFrame + (sc.top ? 60 : 0);
      for (let i = 0; i <= total; i++) {
        if (i % perFrame === 0 && i / perFrame < sc.f) {
          await page.waitForTimeout(90);
          const lab = await page.evaluate(() => { const g = window.__app.current; const r = g.player.rig; const c = g.player.controller; return `${c.motion?.state ?? ''} ${c.speed.toFixed(1)} ${r.planner?.L?.contact ? 'L' : '-'}${r.planner?.R?.contact ? 'R' : '-'}`; });
          const buf = await page.screenshot({ type: 'png' });
          tiles.push(`data:image/png;base64,${buf.toString('base64')}`);
          labels.push(`${t.toFixed(2)}s ${lab}`);
        }
        const k = Object.entries(at).find(([q]) => Math.abs(Number(q) - t) < 1 / 120)?.[1];
        await setInput(sc.input(t), code(k));
        await step60(1);
        t += 1 / 60;
      }
      const rows = await page.evaluate(() => window.__nat.rows);
      const sum = summarise(rows, 1 / 60);
      const data = await compose(page, tiles, labels, `${sc.n} - ${params}, cam ${sc.cam}`, 6, sc.cam === 'fixed' ? 300 : 240, 300);
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
      saveMet(`proving:${sc.n}`, { params, file, topFile, turn, ...sum });
      console.log(`${sc.n}: ${file} ${size} B ${((Date.now() - t0) / 1000).toFixed(0)} s ${JSON.stringify({ trunk: sum?.trunk, feet: sum?.feet, turn, gun: sum?.gun ? { peak: sum.gun.peak, stall: sum.gun.stall } : null })}`);
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
  if (group === 'studio') await runStudio();
  else if (group === 'proving') await runProving();
  else throw new Error(`unknown group ${group}`);
} finally {
  kill();
}
