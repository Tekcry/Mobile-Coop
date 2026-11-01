// (mixamo-retarget M4) Channel-clip emitter for traversal: a Mixamo take (M1 dump -> M2 adapter `loadMixamoTake`) -> a
// `makeClip` channel module (src/anim/clip.ts `ClipDef`, the channels src/anim/clips/traverse.ts keys), one per traversal
// clip, plus its source row in src/anim/mocapSources.ts (the `@mixamo-trav` marker block) and docs/mixamo-retarget/CHANNELS.md.
//
//   node scripts/mocap/mixamoChannels.mjs            regenerate every module, the rows and CHANNELS.md from the dumps
//   node scripts/mocap/mixamoChannels.mjs <slug>...  only those clips (the rows and CHANNELS.md still list every module)
//   --take=<path>  the M2 adapter to load the dumps with (default ./mixamoTake.mjs); --raw=<dir> the dumps' folder
//
// The body frame is the game's 1.75 m standard body (src/player/proportions.ts): the take is rebuilt on it by forward
// kinematics (the take's pelvis path scaled by the leg ratio, then every segment the take's direction at the standard
// length), so the rig's IK reaches what the clip asks. Channels (traverse.ts, animGraph `writeTargets`, characterRig):
//   hLX..hRZ  palm targets in the root frame; fLX/fLY/fLZ (fR*) the ankle off the traversal stance (x -/+ hipHalf 1.2,
//   z 0.01 +/- 0.04, y the ankle height 0.075); f*Pitch the foot's pitch off its rest (+ toes down); pelX/Y/Z the hip-joint
//   midpoint off (0, 0.915, 0); pelPitch / pelRoll / pelYaw the hips' (+ forward, + up leaning to -x, + facing to +x);
//   spPitch / spRoll / spYaw so the chest lands where the rig puts it (chest = 0.4 pel + sp pitch / yaw, 0.6 pel + sp roll);
//   hdPitch so the head's world pitch (0.4 hdPitch) is the take's; width 1; grip / offGrip / wpPitch as the clip replaced.
// Clocks: `chanLoop` keyed over the traversal cadence (0..1 loop: 0 the right hand starts its reach, 0.5 the left, as
// AttachGrips.cadence; a loop without hand reaches, the hang idle, over its own seconds), in place (the take's travel over
// the cycle taken out); `chanPath` keyed over the climb-up's progress k (CLIMB_UP, 1.3 s: crouched on top at
// CLIMB_UP_CROUCH_K, standing at 1), relative to the game's root path at the same k (attachController CLIMB_UP_PATH from a
// ledge hang, the ladder top-out's rise and step in), time-warped so the take's first hand off lands on CLIMB_UP_HANDS.k0,
// its foot on top on CLIMB_UP's offGrip rise and its crouch on CLIMB_UP_CROUCH_K (an event out of order is dropped).
// Keys: each channel reduced to the fewest keys whose monotone cubic (src/anim/curves.ts, re-implemented here) stays
// within 1 cm / 1 deg of the dense samples.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '../..');
export const OUT_DIR = 'src/anim/clips/mixamo';
export const SOURCES = 'src/anim/mocapSources.ts';
export const DOC = 'docs/mixamo-retarget/CHANNELS.md';
const TAKE_FPS = 120;

/** Error bound of the key reduction: metres for positions, radians for angles (1 cm, 1 deg). */
export const TOL = { pos: 0.01, ang: Math.PI / 180 };

/**
 * The game's numbers this emitter fits (copied, so the generator runs without TypeScript; tests/mixamoChannels.test.ts
 * reads each one back from its source file).
 */
export const GAME = {
  // proportions.ts at 1.75 m
  hipY: 0.915, ankleY: 0.075, hipHalf: 0.09, shoulderHalf: 0.49 / 2 - 0.05 * 1.1, thigh: 0.39, calf: 0.425,
  upperArm: 0.3, forearm: 0.26, trunk: 1.4 - 0.915,
  /** Wrist to the palm target (HANG's hands 2.05 over a straight arm's wrist at 1.96). */
  palm: 0.09,
  /** animGraph writeTargets on a traversal: stance half = hipHalf x 1.2 x width, z 0.01 +/- the 0.04 stagger. */
  stanceHalf: 0.09 * 1.2, footZ: 0.01, stagger: 0.04,
  /** anchors.ts HANG (drop, out); traverse.ts HANG / CLIMB hands (the hand-made clips' grip targets). */
  hang: { drop: 1.9, out: 0.22, hands: [0, 2.05, 0.22] },
  climbHands: [0, 1.6, 0.25],
  /** attachController CLIMB_UP_PATH, CLIMB_UP_TIME; traverse.ts CLIMB_UP_CROUCH_K; moveState.ts CLIMB_UP_HANDS. */
  /** `offGripK`: traverse.ts CLIMB_UP's offGrip rise start (0.56: the hands back to the gun, the foot on top's anchor). */
  climbUp: { lipDrop: 1.2, k1: 0.2, k2: 0.38, fwd0: 0.33, outK: 0.36, out: 0.12, endIn: 0.45, time: 0.85, crouchK: 0.654, handsK0: 0.475, handsSpan: 0.168, offGripK: 0.56 },
  /** attach.ts CLIMB_STANDOFF, attachController LADDER_TOPOUT_IN / _TIME, the ladder's top-out start (len - 0.55 h). */
  ladder: { standoff: 0.32, topIn: 0.4, rise: 0.55 * 1.75, time: 0.85 },
  /** CROUCH_IDLE's pelvis (traverse.ts CLIMB_UP at CLIMB_UP_CROUCH_K): the crouch's hip height off standing. */
  crouchPelY: -0.42,
};

/** Each traversal clip (PLAN "Clip map", M4 rows). */
export const TRAV_RECIPES = [
  { slug: 'hanging_idle', emit: 'chanLoop', family: 'hang', chamber: 'trav:ledge', replaces: 'HANG (traverse.ts)', floor: 'zero' },
  { slug: 'braced_hang_shimmy_left', emit: 'chanLoop', family: 'hang', chamber: 'trav:ledge', replaces: 'the ledge shimmy to the left (HANG)', floor: 'zero' },
  { slug: 'braced_hang_shimmy_right', emit: 'chanLoop', family: 'hang', chamber: 'trav:ledge', replaces: 'the ledge shimmy to the right (HANG)', floor: 'zero' },
  { slug: 'climbing_ladder', emit: 'chanLoop', family: 'ladder', chamber: 'trav:ladder', replaces: 'CLIMB (traverse.ts)', floor: 'zero' },
  { slug: 'crawling_hands_and_knees', emit: 'chanLoop', family: 'crawl', chamber: 'trav:vent', replaces: 'CRAWL (traverse.ts)', floor: 'feet' },
  { slug: 'freehang_climb', emit: 'chanPath', family: 'hang', end: 'stand', chamber: 'trav:ledge', replaces: 'CLIMB_UP from a free hang, to standing', floor: 'zero' },
  { slug: 'braced_hang_to_crouch', emit: 'chanPath', family: 'hang', end: 'crouch', chamber: 'trav:ledge', replaces: 'CLIMB_UP to the crouch', floor: 'zero' },
  { slug: 'climbing_ladder_to_standing', emit: 'chanPath', family: 'ladder', end: 'stand', chamber: 'trav:ladder', replaces: 'the ladder top-out (CLIMB_UP over LADDER_TOPOUT_TIME)', floor: 'zero' },
];

/** The channels a module keys, in pose.ts order; `ang` channels are radians. */
export const CHANNEL_ORDER = ['pelX', 'pelY', 'pelZ', 'pelPitch', 'pelRoll', 'pelYaw', 'spPitch', 'spYaw', 'spRoll', 'hdPitch', 'grip', 'offGrip', 'hLX', 'hLY', 'hLZ', 'hRX', 'hRY', 'hRZ', 'fLX', 'fLZ', 'fLY', 'fLPitch', 'fRX', 'fRZ', 'fRY', 'fRPitch', 'width', 'wpPitch'];
const ANG = new Set(['pelPitch', 'pelRoll', 'pelYaw', 'spPitch', 'spYaw', 'spRoll', 'hdPitch', 'fLPitch', 'fRPitch', 'wpPitch']);
/** Channels copied from the clip replaced (not measured): flat values or keys. */
const FIXED_LOOP = { grip: [0, 0], offGrip: [0, 0], width: [0, 1], wpPitch: [0, -0.9] };
const FIXED_PATH = { grip: [0, 0], offGrip: [0, 0, 0.56, 0, 0.654, 1, 1, 1], width: [0, 1], wpPitch: [0, -0.9, 0.56, -0.8, 0.654, 0, 1, 0] };

// ---------------------------------------------------------------------------------------------------------------------
// curves (a copy of src/anim/curves.ts `curve` / `evalCurve`: monotone cubic Hermite, Fritsch-Carlson tangents)

/** Builds the game's curve from flat [t0, v0, ...]. */
export function curveOf(kv, loop = false, period = 1) {
  const n = kv.length >> 1;
  const t = new Float64Array(n), v = new Float64Array(n), m = new Float64Array(n);
  for (let i = 0; i < n; i++) { t[i] = kv[i * 2]; v[i] = kv[i * 2 + 1]; }
  if (n > 1) {
    const d = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const j = i + 1;
      if (j < n) d[i] = (v[j] - v[i]) / Math.max(1e-9, t[j] - t[i]);
      else d[i] = loop ? (v[0] - v[i]) / Math.max(1e-9, t[0] + period - t[i]) : 0;
    }
    for (let i = 0; i < n; i++) {
      const prev = i > 0 ? d[i - 1] : loop ? d[n - 1] : d[0];
      const next = i < n - 1 || loop ? d[i] : d[n - 2];
      m[i] = prev * next <= 0 ? 0 : (2 * prev * next) / (prev + next);
    }
    if (!loop) { m[0] = 0; m[n - 1] = 0; }
  }
  return { t, v, m, loop, period };
}

const hermite = (p0, m0, p1, m1, h, s) => {
  const s2 = s * s, s3 = s2 * s;
  return (2 * s3 - 3 * s2 + 1) * p0 + (s3 - 2 * s2 + s) * h * m0 + (-2 * s3 + 3 * s2) * p1 + (s3 - s2) * h * m1;
};

/** Evaluates a curve at x (clamped, or wrapped for loops). */
export function evalCurveJs(c, x) {
  const { t, v, m } = c;
  const n = t.length;
  if (n === 0) return 0;
  if (n === 1) return v[0];
  if (c.loop) {
    x = ((x % c.period) + c.period) % c.period;
    if (x < t[0] || x >= t[n - 1]) {
      const h = t[0] + c.period - t[n - 1];
      return hermite(v[n - 1], m[n - 1], v[0], m[0], h, (x < t[0] ? x + c.period - t[n - 1] : x - t[n - 1]) / h);
    }
  } else {
    if (x <= t[0]) return v[0];
    if (x >= t[n - 1]) return v[n - 1];
  }
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (t[mid] <= x) lo = mid; else hi = mid; }
  const h = t[hi] - t[lo];
  return hermite(v[lo], m[lo], v[hi], m[hi], h, (x - t[lo]) / h);
}

const r5 = (x) => Math.round(x * 1e5) / 1e5;
const r4 = (x) => Math.round(x * 1e4) / 1e4;

/**
 * Reduces dense samples (times `ts` ascending, values `vs`) to the fewest keys (greedy: add the worst sample) whose game
 * curve stays within `tol` at every sample, values rounded to 4 decimals and times to 5. Loops: `ts` in [0, period).
 * Returns { kv, err } (flat keys, the largest error at the samples after rounding).
 */
export function reduceKeys(ts, vs, tol, loop = false, period = 1) {
  const n = ts.length;
  let lo = Infinity, hi = -Infinity;
  for (const v of vs) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  const flatV = r4((lo + hi) / 2);
  if (hi - lo <= tol) {
    let err = 0;
    for (const v of vs) err = Math.max(err, Math.abs(v - flatV));
    return { kv: [0, flatV], err };
  }
  const pick = new Set([0]);
  if (!loop) pick.add(n - 1);
  else {
    let w = 1, best = -1;
    for (let i = 1; i < n; i++) { const d = Math.abs(vs[i] - vs[0]); if (d > best) { best = d; w = i; } }
    pick.add(w);
  }
  const build = () => {
    const idx = [...pick].sort((a, b) => a - b);
    const kv = [];
    for (const i of idx) kv.push(r5(ts[i]), r4(vs[i]));
    return kv;
  };
  for (;;) {
    const kv = build();
    const c = curveOf(kv, loop, period);
    let err = 0, at = -1;
    for (let i = 0; i < n; i++) {
      const e = Math.abs(evalCurveJs(c, ts[i]) - vs[i]);
      if (e > err) { err = e; at = i; }
    }
    if (err <= tol || pick.has(at) || pick.size >= n) return { kv, err };
    pick.add(at);
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// clocks

/**
 * A loop's take time (s, in [0, T)) at cadence phase `ph` (0..1): the right hand's reach start `tR` at 0, the left's
 * `tL` at 0.5, linear between (null reach times: the take's own clock, phase 0 at its first frame).
 */
export function loopTime(ph, T, tR, tL) {
  const p = ((ph % 1) + 1) % 1;
  if (tR === null || tL === null) return p * T;
  const gap = (a, b) => ((((b - a) % T) + T) % T) || T;
  const t = p < 0.5 ? tR + (p / 0.5) * gap(tR, tL) : tL + ((p - 0.5) / 0.5) * gap(tL, tR);
  return ((t % T) + T) % T;
}

/**
 * A path's warp: anchors [{ t (take s), k }] strictly increasing in both; returns the take time at progress k (linear
 * between anchors, held past the last).
 */
export function pathTime(k, anchors) {
  const a = anchors;
  if (k <= a[0].k) return a[0].t;
  for (let i = 1; i < a.length; i++) {
    if (k <= a[i].k) return a[i - 1].t + ((k - a[i - 1].k) / (a[i].k - a[i - 1].k)) * (a[i].t - a[i - 1].t);
  }
  return a[a.length - 1].t;
}

/** The inverse of `pathTime`: the progress k a take time lands on (clamped to the anchors' span). */
export function pathK(t, anchors) {
  const a = anchors;
  if (t <= a[0].t) return a[0].k;
  for (let i = 1; i < a.length; i++) {
    if (t <= a[i].t) return a[i - 1].k + ((t - a[i - 1].t) / (a[i].t - a[i - 1].t)) * (a[i].k - a[i - 1].k);
  }
  return a[a.length - 1].k;
}

/** The game progress each climb-up event lands on (PLAN M4): first hand off, foot on top, crouched on top. */
export const EVENT_K = { release: GAME.climbUp.handsK0, onTop: GAME.climbUp.offGripK, crouch: GAME.climbUp.crouchK };

/**
 * The path anchors from the take's events (s; null when not found): start 0, first hand off -> CLIMB_UP_HANDS.k0, foot
 * on top -> CLIMB_UP's offGrip rise, crouch -> CLIMB_UP_CROUCH_K, the end -> 1 (or the crouch, for a clip that ends
 * crouched). An event out of order (its take time not after the anchor before it in k) is dropped and listed (the lower
 * priority goes: on top, then the crouch, then the hand release); a dropped event lands where the warp puts it.
 */
export function pathAnchors(ev, end, endKind) {
  const want = [
    { name: 'start', t: 0, k: 0 },
    { name: 'release', t: ev.release, k: EVENT_K.release },
    { name: 'onTop', t: ev.onTop, k: EVENT_K.onTop },
    endKind === 'crouch' ? { name: 'crouch', t: end, k: EVENT_K.crouch } : { name: 'crouch', t: ev.crouch, k: EVENT_K.crouch },
  ];
  if (endKind !== 'crouch') want.push({ name: 'end', t: end, k: 1 });
  // an event not found is left out; out of order, the lower priority goes (the hand release, then the crouch, then on top)
  const PRI = { start: 9, end: 9, release: 3, crouch: 2, onTop: 1 };
  const dropped = [];
  let out = want.filter((w) => {
    if (w.t === null || w.t === undefined) { dropped.push(`${w.name} (not found)`); return false; }
    return true;
  });
  for (;;) {
    let bad = -1;
    for (let i = 1; i < out.length; i++) if (!(out[i].t > out[i - 1].t + 1e-6)) { bad = i; break; }
    if (bad < 0) break;
    const a = out[bad - 1], b = out[bad];
    const lose = PRI[a.name] < PRI[b.name] ? a : b;
    const other = lose === a ? b : a;
    dropped.push(`${lose.name} (${lose.t.toFixed(3)} s, out of order with ${other.name} ${other.t.toFixed(3)} s)`);
    out = out.filter((w) => w !== lose);
  }
  return { anchors: out, dropped };
}

const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/** The game's root at climb-up progress k (m at 1.75, x right, y up, z toward the wall), from the start root. */
export function gameRoot(family, k) {
  const G = GAME.climbUp;
  if (family === 'ladder') {
    // the top-out over its own progress (the climb-up clip to its crouch: k = ph x CLIMB_UP_CROUCH_K)
    const ph = Math.min(1, k / G.crouchK);
    const L = GAME.ladder;
    return [0, L.rise * smooth(ph / 0.6), (L.standoff + L.topIn) * smooth((ph - 0.45) / 0.55)];
  }
  const top = GAME.hang.drop;
  const mid = top - G.lipDrop;
  const y = k < G.k1 ? mid * smooth(k / G.k1) : mid + (top - mid) * smooth((k - G.k1) / (G.k2 - G.k1));
  const fwdSpan = G.crouchK - G.fwd0;
  const z = (GAME.hang.out + G.endIn) * smooth((k - G.fwd0) / fwdSpan) - G.out * Math.sin(Math.PI * Math.min(1, k / G.outK));
  return [0, y, z];
}

// ---------------------------------------------------------------------------------------------------------------------
// the take on the standard body

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scl = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const len = (a) => Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
const nrm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
/** q [x, y, z, w] rotating v. */
const qrot = (q, v) => {
  const [x, y, z, w] = q;
  const tx = 2 * (y * v[2] - z * v[1]), ty = 2 * (z * v[0] - x * v[2]), tz = 2 * (x * v[1] - y * v[0]);
  return [v[0] + w * tx + (y * tz - z * ty), v[1] + w * ty + (z * tx - x * tz), v[2] + w * tz + (x * ty - y * tx)];
};
const unwrapArr = (a) => { for (let i = 1; i < a.length; i++) { while (a[i] - a[i - 1] > Math.PI) a[i] -= 2 * Math.PI; while (a[i] - a[i - 1] < -Math.PI) a[i] += 2 * Math.PI; } return a; };
/** Pitch (+ forward / toes down), roll (+ up to -x) and yaw (+ forward to +x) of a rotated up / forward pair. */
const pitchOf = (u) => Math.atan2(u[2], u[1]);
const rollOf = (u) => Math.atan2(-u[0], Math.hypot(u[1], u[2]));
const yawOf = (f) => Math.atan2(f[0], f[2]);
/** Yaw (+ forward to +x) of a rotated right (+x) axis: the heading of a segment pitched near or past 90 deg (I2b). */
const yawOfRight = (r) => Math.atan2(-r[2], r[0]);
/**
 * (I2b) A segment pitched past this (rad, 75 deg) at any frame of a take takes its yaw from its right axis for the whole
 * take: its forward points near the vertical there, and as the pitch crosses 90 deg the forward's heading turns half a
 * circle (the crawl's chest at 87-105 deg: spYaw keys -4.72 to -1.42, the shoulder line flipped). The right axis keeps the
 * heading (off by about roll x sin pitch). Below it the forward's heading as before (those clips byte-identical).
 */
export const YAW_FROM_RIGHT = (75 * Math.PI) / 180;

/**
 * A take (M2 `loadMixamoTake` shape) on the 1.75 m standard body, facing +z: per 120 fps frame the standard points
 * (pelvis = hip-joint midpoint, knees, ankles, palms, shoulders) rebuilt by FK at the standard lengths along the take's
 * segment directions, the trunk / head angles and the feet's pitch. Returns { n, T, scale, yaw, P: { name: [[x,y,z]] },
 * A: { name: number[] } }.
 */
export function standardBody(take, facing = null) {
  const n = take.frames;
  const pos = (s) => { const a = take.pos.get(s); if (!a) throw new Error(`take ${take.take}: no slot ${s}`); return a; };
  const quat = (s) => { const a = take.quat.get(s); if (!a) throw new Error(`take ${take.take}: no slot ${s}`); return a; };
  const bl = (s) => take.skel.bones.get(s)?.length ?? 0;
  const scale = (GAME.thigh + GAME.calf) / (bl('lfemur') + bl('ltibia') + bl('rfemur') + bl('rtibia')) * 2;
  // the take's facing: `facing` (a forward in the take's frame, its sign taken from the hips), else the circular mean of
  // the hips' forward heading
  let sx = 0, sz = 0;
  for (let i = 0; i < n; i++) { const f = qrot(quat('root')[i], [0, 0, 1]); sx += f[0]; sz += f[2]; }
  if (facing) {
    const d = facing[0] * sx + facing[2] * sz >= 0 ? 1 : -1;
    sx = facing[0] * d;
    sz = facing[2] * d;
  }
  const yaw = Math.atan2(sx, sz);
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const turn = (v) => [v[0] * c - v[2] * s, v[1], v[0] * s + v[2] * c];
  const at = (slot, i) => turn(pos(slot)[i]);
  // (`gripL/R`: the take's own palm points, scaled: they stay on a grip, where the rebuilt palms move with the body)
  const P = { pel: [], hipL: [], hipR: [], kneeL: [], kneeR: [], ankleL: [], ankleR: [], shL: [], shR: [], palmL: [], palmR: [], gripL: [], gripR: [], soleL: [], soleR: [] };
  const A = { pelPitch: [], pelRoll: [], pelYaw: [], chPitch: [], chRoll: [], chYaw: [], hdPitch: [], footL: [], footR: [] };
  const rightYaw = { pel: [], ch: [] };
  const restFoot = (slot) => { const d = take.skel.bones.get(slot).dir; return Math.atan2(-d[1], d[2]); };
  const rest = { L: restFoot('lfoot'), R: restFoot('rfoot') };
  for (let i = 0; i < n; i++) {
    const hl = at('lhipjoint', i), hr = at('rhipjoint', i);
    const pel = scl(mid(hl, hr), scale);
    const right = nrm(sub(hr, hl));
    P.pel.push(pel);
    for (const [S, sd] of [['L', 'l'], ['R', 'r']]) {
      const sign = S === 'L' ? -1 : 1;
      const hip = add(pel, scl(right, sign * GAME.hipHalf));
      const knee = add(hip, scl(nrm(sub(at(`${sd}femur`, i), at(`${sd}hipjoint`, i))), GAME.thigh));
      const ankle = add(knee, scl(nrm(sub(at(`${sd}tibia`, i), at(`${sd}femur`, i))), GAME.calf));
      P[`hip${S}`].push(hip); P[`knee${S}`].push(knee); P[`ankle${S}`].push(ankle);
      const f = sub(at(`${sd}foot`, i), at(`${sd}tibia`, i));
      A[`foot${S}`].push(Math.atan2(-f[1], f[2]) - rest[S]);
    }
    const shMidT = mid(at('lclavicle', i), at('rclavicle', i));
    const shRight = nrm(sub(at('rclavicle', i), at('lclavicle', i)));
    const shMid = add(pel, scl(nrm(sub(shMidT, mid(hl, hr))), GAME.trunk));
    for (const [S, sd] of [['L', 'l'], ['R', 'r']]) {
      const sh = add(shMid, scl(shRight, (S === 'L' ? -1 : 1) * GAME.shoulderHalf));
      const elbow = add(sh, scl(nrm(sub(at(`${sd}humerus`, i), at(`${sd}clavicle`, i))), GAME.upperArm));
      const wrist = add(elbow, scl(nrm(sub(at(`${sd}radius`, i), at(`${sd}humerus`, i))), GAME.forearm));
      const palm = add(wrist, scl(nrm(sub(at(`${sd}hand`, i), at(`${sd}radius`, i))), GAME.palm));
      P[`sh${S}`].push(sh); P[`palm${S}`].push(palm);
      P[`grip${S}`].push(scl(lerp3(at(`${sd}radius`, i), at(`${sd}hand`, i), 0.6), scale));
      const tb = at(`${sd}foot`, i), tt = at(`${sd}toes`, i);
      P[`sole${S}`].push(scl(tb[1] < tt[1] ? tb : tt, scale));
    }
    const up = (slot) => turn(qrot(quat(slot)[i], [0, 1, 0]));
    const fw = (slot) => turn(qrot(quat(slot)[i], [0, 0, 1]));
    const pu = up('root'), cu = up('thorax'), hu = up('head');
    A.pelPitch.push(pitchOf(pu)); A.pelRoll.push(rollOf(pu)); A.pelYaw.push(yawOf(fw('root')));
    A.chPitch.push(pitchOf(cu)); A.chRoll.push(rollOf(cu)); A.chYaw.push(yawOf(fw('thorax')));
    A.hdPitch.push(pitchOf(hu));
    rightYaw.pel.push(yawOfRight(turn(qrot(quat('root')[i], [1, 0, 0]))));
    rightYaw.ch.push(yawOfRight(turn(qrot(quat('thorax')[i], [1, 0, 0]))));
  }
  for (const k of Object.keys(A)) unwrapArr(A[k]);
  const yawFrom = {};
  for (const seg of ['pel', 'ch']) {
    const steep = A[`${seg}Pitch`].some((p) => Math.abs(p) > YAW_FROM_RIGHT);
    yawFrom[seg] = steep ? 'right' : 'forward';
    if (steep) A[`${seg}Yaw`] = unwrapArr(rightYaw[seg]);
  }
  return { n, T: (n - 1) / TAKE_FPS, scale, yaw, P, A, yawFrom };
}

/** A body's points / angles at fractional frame f (linear). */
function sampleBody(B, f) {
  const i = Math.max(0, Math.min(B.n - 2, Math.floor(f)));
  const t = Math.max(0, Math.min(1, f - i));
  const P = {}, A = {};
  for (const k of Object.keys(B.P)) P[k] = lerp3(B.P[k][i], B.P[k][i + 1], t);
  for (const k of Object.keys(B.A)) A[k] = B.A[k][i] + (B.A[k][i + 1] - B.A[k][i]) * t;
  return { P, A };
}

/** Channel values of a sampled body against a root point `R` (all in the same frame). */
export function channelsOf(P, A, R) {
  const rel = (p) => sub(p, R);
  const pel = rel(P.pel), aL = rel(P.ankleL), aR = rel(P.ankleR), hL = rel(P.palmL), hR = rel(P.palmR);
  const hd = A.hdPitch / 0.4;
  return {
    pelX: pel[0], pelY: pel[1] - GAME.hipY, pelZ: pel[2],
    pelPitch: A.pelPitch, pelRoll: A.pelRoll, pelYaw: A.pelYaw,
    spPitch: A.chPitch - 0.4 * A.pelPitch, spYaw: A.chYaw - 0.4 * A.pelYaw, spRoll: A.chRoll - 0.6 * A.pelRoll,
    hdPitch: Math.max(-2, Math.min(2, hd)),
    hLX: hL[0], hLY: hL[1], hLZ: hL[2], hRX: hR[0], hRY: hR[1], hRZ: hR[2],
    fLX: aL[0] + GAME.stanceHalf, fLZ: aL[2] - GAME.footZ - GAME.stagger, fLY: aL[1] - GAME.ankleY, fLPitch: A.footL,
    fRX: aR[0] - GAME.stanceHalf, fRZ: aR[2] - GAME.footZ + GAME.stagger, fRY: aR[1] - GAME.ankleY, fRPitch: A.footR,
  };
}

/** Runs of `on` frames (circular when `loop`): [[start, end)] in frames, the longest first. */
function runsOf(on, loop) {
  const n = on.length;
  const runs = [];
  let s = -1;
  for (let i = 0; i < n; i++) {
    if (on[i] && s < 0) s = i;
    if (!on[i] && s >= 0) { runs.push([s, i]); s = -1; }
  }
  if (s >= 0) runs.push([s, n]);
  if (loop && runs.length > 1 && runs[0][0] === 0 && runs[runs.length - 1][1] === n) {
    const last = runs.pop();
    runs[0] = [last[0], runs[0][1] + n];
  }
  return runs.sort((a, b) => b[1] - b[0] - (a[1] - a[0]));
}

/** A loop's hand reach starts (s): the start of each palm's longest fast run (over 30 % of its peak speed); null: still. */
export function reachStarts(B) {
  const out = {};
  for (const S of ['L', 'R']) {
    const p = B.P[`grip${S}`];
    const sp = [];
    for (let i = 0; i < B.n - 1; i++) sp.push(len(sub(p[i + 1], p[i])) * TAKE_FPS);
    const peak = Math.max(...sp);
    if (peak < 0.3) { out[S] = null; continue; }
    const r = runsOf(sp.map((v) => v > peak * 0.3), true)[0];
    out[S] = (r[0] % (B.n - 1)) / TAKE_FPS;
  }
  return out;
}

const mean3 = (arr) => { const m = [0, 0, 0]; for (const p of arr) { m[0] += p[0]; m[1] += p[1]; m[2] += p[2]; } return scl(m, 1 / arr.length); };

/** Samples per loop cycle / path progress (the reference the key reduction is held to). */
export const LOOP_SAMPLES = 240;
export const PATH_SAMPLES = 400;

/** A chanLoop: dense channel samples over the cadence phase, the clock and its report. */
export function loopChannels(B, recipe) {
  const T = B.T;
  const travel = sub(B.P.pel[B.n - 1], B.P.pel[0]);
  const reach = reachStarts(B);
  const tR = reach.R, tL = reach.L;
  const warped = tR !== null && tL !== null;
  const N = LOOP_SAMPLES;
  const ts = [], frames = [];
  for (let i = 0; i < N; i++) { ts.push(i / N); frames.push(loopTime(i / N, T, warped ? tR : null, warped ? tL : null) * TAKE_FPS); }
  // root: the take's travel at a steady rate, placed by the family's anchor
  const drift = (f) => scl(travel, f / (B.n - 1));
  const bodies = frames.map((f) => sampleBody(B, f));
  let anchor;
  if (recipe.family === 'crawl') {
    const m = mean3(bodies.map((b, i) => sub(b.P.pel, drift(frames[i]))));
    anchor = [m[0], 0, m[2]];
  } else {
    const target = recipe.family === 'ladder' ? GAME.climbHands : GAME.hang.hands;
    const m = mean3(bodies.map((b, i) => sub(mid(b.P.palmL, b.P.palmR), drift(frames[i]))));
    anchor = sub(m, target);
  }
  const series = {};
  bodies.forEach((b, i) => {
    const ch = channelsOf(b.P, b.A, add(anchor, drift(frames[i])));
    for (const [k, v] of Object.entries(ch)) (series[k] ??= []).push(v);
  });
  return {
    ts, series, fixed: FIXED_LOOP, loop: true,
    events: warped ? { rReach: 0, lReach: 0.5 } : {},
    clock: warped
      ? `the cadence (0..1 loop): the right hand's reach starts at 0 (take ${tR.toFixed(3)} s), the left's at 0.5 (take ${tL.toFixed(3)} s)`
      : `its own seconds (0..1 over ${T.toFixed(3)} s, phase 0 at the take's first frame): no hand reaches`,
    notes: [`cycle ${T.toFixed(3)} s; travel over the cycle taken out (x ${travel[0].toFixed(3)}, y ${travel[1].toFixed(3)}, z ${travel[2].toFixed(3)} m at 1.75 m)`],
    seconds: T,
    travel,
    reach,
  };
}

/** Hand off a grip: this far from where it held at the start, for good (a hanging hand creeps over the lip ~0.2 m). */
export const RELEASE_M = 0.3;

/**
 * A chanPath's events in the take (s from the start used) and its trim: `top` the floor on top (the soles at the end),
 * the start (a hang: the first frame; the ladder top-out: where the hips reach the game's at the top-out's start), on
 * top (a knee or a foot over the lip and on the top, from then to the end), the first hand off (hang: `RELEASE_M` off its
 * start grip for good; ladder: 15 cm in over the rungs), the crouch (after both, the hips up at the crouch's height),
 * the end (standing: both feet planted and the hips settled; else the last frame).
 */
export function pathEvents(B, recipe) {
  const n = B.n;
  const tail = Math.max(1, Math.floor(n * 0.05));
  let sy = 0;
  for (let i = n - tail; i < n; i++) sy += Math.min(B.P.soleL[i][1], B.P.soleR[i][1]);
  const top = sy / tail;
  let i0 = 0;
  if (recipe.family === 'ladder') {
    const need = top - GAME.ladder.rise + GAME.hipY - 0.02;
    while (i0 < n - 1 && B.P.pel[i0][1] < need) i0++;
  }
  const hands0 = mid(B.P.gripL[i0], B.P.gripR[i0]);
  const palms0 = mid(B.P.palmL[i0], B.P.palmR[i0]);
  const lipZ = hands0[2];
  let onTop = null;
  for (const S of ['L', 'R']) {
    let last = -1;
    for (let i = i0; i < n; i++) {
      const k = B.P[`knee${S}`][i], a = B.P[`ankle${S}`][i];
      const on = (k[1] >= top && k[2] >= lipZ) || (a[1] >= top + 0.03 && a[2] >= lipZ - 0.05);
      if (!on) last = i;
    }
    if (last < n - 1) { const f = last + 1; onTop = onTop === null ? f : Math.min(onTop, f); }
  }
  let release = null;
  for (const S of ['L', 'R']) {
    const p = B.P[`grip${S}`];
    let f = null;
    if (recipe.family === 'ladder') {
      for (let i = i0; i < n; i++) if (p[i][2] >= lipZ + 0.15) { f = i; break; }
    } else {
      let last = -1;
      for (let i = i0; i < n; i++) if (len(sub(p[i], p[i0])) <= RELEASE_M) last = i;
      if (last < n - 1) f = last + 1;
    }
    if (f !== null) release = release === null ? f : Math.min(release, f);
  }
  let crouch = null;
  const from = Math.max(onTop ?? i0, release ?? i0);
  const crouchY = top + GAME.ankleY + (GAME.hipY - GAME.ankleY) + GAME.crouchPelY - 0.03;
  for (let i = from + 1; i < n; i++) if (B.P.pel[i][1] >= crouchY) { crouch = i; break; }
  let end = n - 1;
  if (recipe.end === 'stand' && crouch !== null) {
    const finalY = B.P.pel[n - 1][1];
    const planted = (S, i) => B.P[`ankle${S}`][i][1] <= top + GAME.ankleY + 0.03 && len(sub(B.P[`ankle${S}`][Math.min(n - 1, i + 6)], B.P[`ankle${S}`][i])) * 20 < 0.3;
    for (let i = crouch + 1; i < n; i++) if (B.P.pel[i][1] >= finalY - 0.03 && planted('L', i) && planted('R', i)) { end = i; break; }
  }
  const s = (f) => (f === null ? null : (f - i0) / TAKE_FPS);
  return { i0, top, lipZ, hands0, palms0, onTop: s(onTop), release: s(release), crouch: s(crouch), end: (end - i0) / TAKE_FPS, endFrame: end };
}

/**
 * A chanPath: dense channel samples over the climb-up's progress against the game's root path, the warp and its report.
 * Placed in the game's start-root frame by the start: a hang by its palms on the HANG clip's (the climb starts from the
 * game's hang pose), the ladder top-out by its top on the game's and its palms on the CLIMB clip's depth. What is left at
 * the end against the state that follows (the feet on the top; the hips over the root) is taken out: the height over
 * the rise (k 0 - CLIMB_UP_PATH.k2), the pelvis across / along over the hand-off to the end.
 */
export function pathChannels(B, recipe) {
  const ev = pathEvents(B, recipe);
  const { anchors, dropped } = pathAnchors(ev, ev.end, recipe.end);
  const kEnd = anchors[anchors.length - 1].k;
  const off = recipe.family === 'ladder'
    ? [ev.palms0[0], ev.top - GAME.ladder.rise, ev.palms0[2] - GAME.climbHands[2]]
    : sub(ev.palms0, GAME.hang.hands);
  const N = PATH_SAMPLES;
  const ts = [], bodies = [], roots = [];
  for (let i = 0; i <= N; i++) {
    const k = (i / N) * kEnd;
    ts.push(k);
    bodies.push(sampleBody(B, ev.i0 + pathTime(k, anchors) * TAKE_FPS));
    roots.push(add(off, gameRoot(recipe.family, k)));
  }
  const last = channelsOf(bodies[N].P, bodies[N].A, roots[N]);
  const resid = [last.pelX, (last.fLY + last.fRY) / 2, last.pelZ];
  const kRel = GAME.climbUp.handsK0, kTop = GAME.climbUp.k2;
  const series = {};
  bodies.forEach((b, i) => {
    const wy = smooth(ts[i] / kTop);
    const wxz = smooth((ts[i] - kRel) / Math.max(1e-6, kEnd - kRel));
    const ch = channelsOf(b.P, b.A, add(roots[i], [resid[0] * wxz, resid[1] * wy, resid[2] * wxz]));
    for (const [k, v] of Object.entries(ch)) (series[k] ??= []).push(v);
  });
  // every event found, at the progress it lands on (an anchored one exactly on its game constant)
  const events = {};
  const evT = { release: ev.release, onTop: ev.onTop, crouch: recipe.end === 'crouch' ? ev.end : ev.crouch };
  for (const name of ['release', 'onTop', 'crouch']) if (evT[name] !== null) events[name] = r4(pathK(evT[name], anchors));
  const used = anchors[anchors.length - 1].t;
  const gameS = kEnd * (GAME.climbUp.time / GAME.climbUp.crouchK);
  const gripUnderTop = ev.top - ev.hands0[1];
  return {
    ts, series, fixed: FIXED_PATH, loop: false, events,
    clock: `climb-up progress k (0..1 over ${(GAME.climbUp.time / GAME.climbUp.crouchK).toFixed(3)} s, crouched at ${GAME.climbUp.crouchK}); ${recipe.end === 'crouch' ? `the take ends crouched at k ${kEnd} (held after)` : 'standing at 1'}`,
    notes: [
      `take ${(ev.i0 / TAKE_FPS).toFixed(3)}-${((ev.i0 / TAKE_FPS) + used).toFixed(3)} s used (${used.toFixed(3)} s of ${((B.n - 1) / TAKE_FPS).toFixed(3)}) over ${gameS.toFixed(3)} s of game time (x${(used / gameS).toFixed(2)} speed)`,
      `events in the take (s from the start used): on top ${fmt(ev.onTop)}, first hand off ${fmt(ev.release)}, crouch ${recipe.end === 'crouch' ? `${ev.end.toFixed(3)} (the end)` : fmt(ev.crouch)}, end ${ev.end.toFixed(3)}`,
      `anchors (take s -> k): ${anchors.map((a) => `${a.name} ${a.t.toFixed(3)} -> ${a.k}`).join(', ')}`,
      ...(dropped.length ? [`dropped: ${dropped.join('; ')}`] : []),
      `events land on (k; game): ${Object.entries(events).map(([k, v]) => `${k} ${v} (${EVENT_K[k]})`).join(', ')}`,
      `the take's grip ${gripUnderTop.toFixed(3)} m under its top; taken out: height ${resid[1].toFixed(3)} m over k 0-${kTop}, pelvis x ${resid[0].toFixed(3)} / z ${resid[2].toFixed(3)} m over k ${kRel}-${kEnd}`,
    ],
    seconds: used,
    anchors, dropped, resid, ev,
  };
}
const fmt = (x) => (x === null ? 'not found' : x.toFixed(3));

/** Reduces every channel; returns { keys: { ch: kv }, err: { ch: max error }, nKeys }. */
export function reduceAll(res) {
  const keys = {}, err = {};
  let nKeys = 0;
  for (const ch of CHANNEL_ORDER) {
    if (res.fixed[ch]) { keys[ch] = res.fixed[ch]; err[ch] = 0; nKeys += res.fixed[ch].length / 2; continue; }
    const vs = res.series[ch];
    if (!vs) continue;
    const r = reduceKeys(res.ts, vs, ANG.has(ch) ? TOL.ang : TOL.pos, res.loop, 1);
    keys[ch] = r.kv;
    err[ch] = r.err;
    nKeys += r.kv.length / 2;
  }
  return { keys, err, nKeys };
}

// ---------------------------------------------------------------------------------------------------------------------
// output

/** The Mixamo title of a downloaded file (the file name without `.fbx` and any `(...)` note). */
export const titleOf = (file) => file.replace(/\.fbx$/i, '').replace(/\s*\([^)]*\)\s*/g, ' ').trim();
const constName = (slug) => `MOCAP_${slug.toUpperCase()}`;

/** The module source of one clip. */
export function moduleSource(recipe, file, res, red) {
  const C = constName(recipe.slug);
  const lines = [];
  lines.push(`// GENERATED by scripts/mocap/mixamoChannels.mjs from build/mocap/mixamo/raw/${recipe.slug}.json (mixamo-retarget M4). Do not edit:`);
  lines.push('// rerun `node scripts/mocap/mixamoChannels.mjs`. Source: Mixamo (mixamo.com, Adobe), royalty-free for commercial use;');
  lines.push(`// "${titleOf(file)}" (\`${file}\`), on the 1.75 m standard body. docs/mixamo-retarget/CHANNELS.md.`);
  lines.push('/**');
  lines.push(` * ${recipe.emit} channel clip (src/anim/clip.ts), replacing ${recipe.replaces} when the mixamo switch is on (I2).`);
  lines.push(` * Clock: ${res.clock}.`);
  for (const n of res.notes) lines.push(` * ${n}.`);
  lines.push(` * Keys within ${TOL.pos * 100} cm / 1 deg of the dense samples (largest ${maxErr(red).text}).`);
  lines.push(' */');
  lines.push("import { makeClip } from '../../clip';");
  lines.push('');
  lines.push(`/** Seconds of the capture this clip spans (${recipe.emit === 'chanLoop' ? 'one cycle' : 'the climb used'}). */`);
  lines.push(`export const ${C}_SECONDS = ${r4(res.seconds)};`);
  lines.push('');
  lines.push(`export const ${C} = makeClip({`);
  lines.push(`  name: 'mocap_${recipe.slug}',`);
  lines.push('  duration: 1,');
  if (res.loop) lines.push('  loop: true,');
  lines.push('  keys: {');
  for (const ch of CHANNEL_ORDER) {
    const kv = red.keys[ch];
    if (!kv) continue;
    const parts = kv.map((x) => String(x));
    const rows = [];
    for (let i = 0; i < parts.length; i += 24) rows.push(parts.slice(i, i + 24).join(', '));
    if (rows.length === 1) lines.push(`    ${ch}: [${rows[0]}],`);
    else { lines.push(`    ${ch}: [`); for (const r of rows) lines.push(`      ${r},`); lines.push('    ],'); }
  }
  lines.push('  },');
  const ev = Object.entries(res.events);
  if (ev.length) lines.push(`  events: { ${ev.map(([k, v]) => `${k}: ${v}`).join(', ')} },`);
  lines.push('});');
  lines.push('');
  return lines.join('\n');
}

function maxErr(red) {
  let pos = 0, ang = 0;
  for (const [ch, e] of Object.entries(red.err)) { if (ANG.has(ch)) ang = Math.max(ang, e); else pos = Math.max(pos, e); }
  return { pos, ang, text: `${(pos * 100).toFixed(2)} cm, ${(ang * 180 / Math.PI).toFixed(2)} deg` };
}

/** The source row of one clip (one line, the marker block's format). */
export function sourceRow(recipe, file) {
  const q = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  return `  mocap_${recipe.slug}: { source: 'mixamo', title: ${q(titleOf(file))}, take: ${q(file)}, credit: MIXAMO_CREDIT, chamber: { kind: 'trav', loop: ${q(recipe.chamber)} } },`;
}

/** Rewrites the `@mixamo-trav` marker block of the sources table with `rows` (the marker lines kept). */
export function writeRows(text, rows) {
  const nl = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(/\r?\n/);
  const b = lines.findIndex((l) => l.trim().startsWith('// @mixamo-trav-begin'));
  const e = lines.findIndex((l) => l.trim().startsWith('// @mixamo-trav-end'));
  if (b < 0 || e < b) throw new Error(`${SOURCES}: the @mixamo-trav marker block is missing`);
  return [...lines.slice(0, b + 1), ...rows, ...lines.slice(e)].join(nl);
}

function docSection(recipe, file, res, red) {
  const m = maxErr(red);
  const out = [`## ${recipe.slug}`, '', `\`${file}\` -> \`${OUT_DIR}/trav_${recipe.slug}.ts\` (\`mocap_${recipe.slug}\`), ${recipe.emit}, Chamber loop \`${recipe.chamber}\`; replaces ${recipe.replaces}.`, ''];
  out.push(`- Keys: ${red.nKeys} over ${Object.keys(red.keys).length} channels; largest error ${m.text} (bound 1 cm, 1 deg).`);
  out.push(`- Clock: ${res.clock}.`);
  out.push(`- Events: ${Object.keys(res.events).length ? Object.entries(res.events).map(([k, v]) => `${k} at ${v}`).join(', ') : 'none'}.`);
  for (const n of res.notes) out.push(`- ${n}.`);
  out.push('');
  return out.join('\n');
}

/**
 * The facing a clip is turned to (a forward in the take's frame; null: the hips' mean). A loop that travels sideways
 * (a shimmy) faces square to its travel, a crawl along it; a climb-up faces square to its hands' line on the grip at the
 * first frame (the lip or the rungs); the hang idle and the ladder loop by the hips.
 */
export function facingOf(recipe, take) {
  const p = (s, i) => take.pos.get(s)[i];
  const n = take.frames;
  if (recipe.emit === 'chanPath') {
    const r = sub(p('rhand', 0), p('lhand', 0));
    return nrm([-r[2], 0, r[0]]);
  }
  const d = sub(p('root', n - 1), p('root', 0));
  if (Math.hypot(d[0], d[2]) < 0.1) return null;
  if (recipe.family === 'crawl') return nrm([d[0], 0, d[2]]);
  if (recipe.family === 'hang') return nrm([-d[2], 0, d[0]]);
  return null;
}

/** Builds one clip from a loaded take: { source, row, doc, res, red }. */
export function buildClip(recipe, take) {
  const B = standardBody(take, facingOf(recipe, take));
  const res = recipe.emit === 'chanLoop' ? loopChannels(B, recipe) : pathChannels(B, recipe);
  res.notes.unshift(`leg scale x${B.scale.toFixed(3)}; facing turned ${(B.yaw * 180 / Math.PI).toFixed(1)} deg${B.yawFrom.pel === 'right' || B.yawFrom.ch === 'right' ? `; yaw from the right axis (pitched past 75 deg): ${['pel', 'ch'].filter((s) => B.yawFrom[s] === 'right').map((s) => (s === 'pel' ? 'hips' : 'chest')).join(', ')}` : ''}`);
  const red = reduceAll(res);
  const file = take.report?.file ?? `${recipe.slug}.fbx`;
  return { source: moduleSource(recipe, file, res, red), row: sourceRow(recipe, file), doc: docSection(recipe, file, res, red), res, red, file };
}

async function main(argv) {
  const only = argv.filter((a) => !a.startsWith('--'));
  const rawArg = argv.find((a) => a.startsWith('--raw='));
  const rootArg = argv.find((a) => a.startsWith('--root='));
  const root = rootArg ? path.resolve(rootArg.slice(7)) : ROOT;
  const raw = rawArg ? path.resolve(rawArg.slice(6)) : path.join(root, 'build', 'mocap', 'mixamo', 'raw');
  // the M2 take adapter: this folder's (the job branch), else `--take=<path to mixamoTake.mjs>` (a slice branch without it)
  const takeArg = argv.find((a) => a.startsWith('--take='));
  const takeUrl = takeArg ? pathToFileURL(path.resolve(takeArg.slice(7))).href : './mixamoTake.mjs';
  let loadMixamoTake;
  try {
    ({ loadMixamoTake } = await import(takeUrl));
  } catch (e) {
    console.error(`mixamoChannels: needs the M2 take adapter (scripts/mocap/mixamoTake.mjs, or --take=<path>): ${e.message}`);
    process.exit(2);
  }
  const rows = [], docs = [];
  for (const recipe of TRAV_RECIPES) {
    const out = path.join(root, OUT_DIR, `trav_${recipe.slug}.ts`);
    const take = loadMixamoTake(recipe.slug, { dir: raw, floor: recipe.floor });
    const c = buildClip(recipe, take);
    rows.push(c.row);
    docs.push(c.doc);
    if (only.length && !only.includes(recipe.slug)) continue;
    mkdirSync(path.dirname(out), { recursive: true });
    writeFileSync(out, c.source);
    console.info(`${recipe.slug}: ${c.red.nKeys} keys, ${maxErr(c.red).text}; ${c.res.clock}`);
    for (const n of c.res.notes) console.info(`  ${n}`);
  }
  const srcPath = path.join(root, SOURCES);
  writeFileSync(srcPath, writeRows(readFileSync(srcPath, 'utf8'), rows));
  const docPath = path.join(root, DOC);
  const head = [
    '# mixamo-retarget - traversal channel clips (generated)',
    'Owner: Player Build (M4). Status: generated by `node scripts/mocap/mixamoChannels.mjs` (do not edit; rerun it).',
    '',
    'Each Mixamo traversal take as a `makeClip` channel clip on the 1.75 m standard body (method: the generator\'s header).',
    'Loops are keyed over the traversal cadence, in place; climb-ups over the climb-up\'s progress against the game\'s root',
    'path, time-warped onto its events. Keys are held within 1 cm / 1 deg of the dense samples.',
    '',
  ].join('\n');
  writeFileSync(docPath, head + docs.join('\n'));
  if (!existsSync(docPath)) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main(process.argv.slice(2));
}
