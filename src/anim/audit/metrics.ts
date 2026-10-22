/**
 * Animation audit metrics (bible 5.12.2, 5.12.4.2, 5.17 D2 / D5). Pure functions over plain arrays recorded by
 * the anim-audit harness (`scripts/anim-audit.mjs`): the page only records, node computes with these.
 * engine-free (no renderer imports) and offline (not a hot path). Streams are flat: a vector stream holds x, y, z per frame (stride 3),
 * a quaternion stream x, y, z, w (stride 4). Every metric returns `{ worst, frame, pass }` (frame = index of the
 * worst sample, -1 when nothing was measured) plus metric-specific extras.
 */
import {
  BACKSTEP,
  BALANCE_MARGIN,
  BLEND_MAX,
  BLEND_MIN,
  CAMERA_P2P,
  FOOT_BACK,
  FOOT_FLOAT,
  FOOT_SINK,
  FOOT_SLIDE,
  FOOT_TOL,
  HAND_GRIP,
  GRIP_IK_ON,
  HEAD_ANGLE_P2P,
  JOINT_DEG_PER_S,
  LANDING_DIPS,
  LANDING_REBOUND,
  OVERSHOOT_RATIO,
  PELVIS_HYST,
  ROM,
  SEGMENT_COM,
  SEGMENT_MASS,
  SETTLE_EPS,
  SETTLE_REBOUND_S,
  SETTLE_TIME,
  TELEPORT_DIST,
} from './limits';

export interface Result {
  worst: number;
  frame: number;
  pass: boolean;
}
type Arr = ArrayLike<number>;
const DEG = 180 / Math.PI;

function result(worst: number, frame: number, pass: boolean): Result {
  return { worst, frame, pass };
}
const sq = (v: number): number => v * v;
const len3 = (x: number, y: number, z: number): number => Math.sqrt(x * x + y * y + z * z);
const finite = (v: number | undefined): v is number => v !== undefined && Number.isFinite(v);
const at = (a: Arr, i: number): number => a[i] ?? NaN;
const masked = (mask: Arr | undefined, i: number): boolean => !!mask && !!mask[i];

// ------------------------------------------------------------------ helpers

/** Least-squares line fit residuals (detrend). */
export function detrend(x: Arr): number[] {
  const n = x.length;
  let st = 0;
  let sx = 0;
  let stt = 0;
  let stx = 0;
  let m = 0;
  for (let i = 0; i < n; i++) {
    const v = at(x, i);
    if (!finite(v)) continue;
    st += i;
    sx += v;
    stt += i * i;
    stx += i * v;
    m++;
  }
  const den = m * stt - st * st;
  const b = m > 1 && den !== 0 ? (m * stx - st * sx) / den : 0;
  const a = m > 0 ? (sx - b * st) / m : 0;
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(at(x, i) - (a + b * i));
  return out;
}

/** Centred moving average over `w` samples (edges use the samples available). */
export function smooth(x: Arr, w: number): number[] {
  const n = x.length;
  const h = Math.max(0, Math.floor(w / 2));
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    let s = 0;
    let c = 0;
    for (let j = Math.max(0, i - h); j <= Math.min(n - 1, i + h); j++) {
      const v = at(x, j);
      if (finite(v)) {
        s += v;
        c++;
      }
    }
    out.push(c ? s / c : NaN);
  }
  return out;
}

/** Local linear fit over `w` samples centred on each sample (edges use the samples available, unbiased on a line). */
export function localLinear(x: Arr, w: number): number[] {
  const n = x.length;
  const h = Math.max(1, Math.floor(w / 2));
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    let m = 0;
    let st = 0;
    let sv = 0;
    let stt = 0;
    let stv = 0;
    for (let j = Math.max(0, i - h); j <= Math.min(n - 1, i + h); j++) {
      const v = at(x, j);
      if (!finite(v)) continue;
      const t = j - i;
      m++;
      st += t;
      sv += v;
      stt += t * t;
      stv += t * v;
    }
    const den = m * stt - st * st;
    const b = m > 1 && den !== 0 ? (m * stv - st * sv) / den : 0;
    out.push(m ? (sv - b * st) / m : NaN);
  }
  return out;
}

/** Component `k` (0..stride-1) of a strided stream. */
export function channel(x: Arr, stride: number, k: number): number[] {
  const out: number[] = [];
  for (let i = k; i < x.length; i += stride) out.push(at(x, i));
  return out;
}

/** Angle between two unit quaternions (deg). */
export function quatAngle(q: Arr, i: number, r: Arr, j: number): number {
  const d = Math.abs(at(q, i) * at(r, j) + at(q, i + 1) * at(r, j + 1) + at(q, i + 2) * at(r, j + 2) + at(q, i + 3) * at(r, j + 3));
  return 2 * Math.acos(Math.min(1, d)) * DEG;
}

/** Rotate a vector by quaternion (x, y, z, w) at `q[i]`. */
export function quatRotate(q: Arr, i: number, vx: number, vy: number, vz: number): [number, number, number] {
  const x = at(q, i);
  const y = at(q, i + 1);
  const z = at(q, i + 2);
  const w = at(q, i + 3);
  const tx = 2 * (y * vz - z * vy);
  const ty = 2 * (z * vx - x * vz);
  const tz = 2 * (x * vy - y * vx);
  return [vx + w * tx + (y * tz - z * ty), vy + w * ty + (z * tx - x * tz), vz + w * tz + (x * ty - y * tx)];
}

/** Pitch (nose up +) and roll (deg) of the +Z-forward, +Y-up frame of quaternion `q[i]`. */
export function pitchRoll(q: Arr, i: number): [number, number] {
  const f = quatRotate(q, i, 0, 0, 1);
  const r = quatRotate(q, i, 1, 0, 0);
  return [Math.asin(Math.max(-1, Math.min(1, f[1]))) * DEG, Math.asin(Math.max(-1, Math.min(1, r[1]))) * DEG];
}

/** Horizontal heading (rad, atan2(x, z)) of the +Z axis of quaternion `q[i]`. */
export function heading(q: Arr, i: number): number {
  const f = quatRotate(q, i, 0, 0, 1);
  return Math.atan2(f[0], f[2]);
}

/** Wrap an angle to [-PI, PI]. */
export function wrapPi(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

/** Relative rotation conj(p[i]) * c[j] (child in the parent's frame), x, y, z, w. */
export function relQuat(p: Arr, i: number, c: Arr, j: number): [number, number, number, number] {
  const px = -at(p, i);
  const py = -at(p, i + 1);
  const pz = -at(p, i + 2);
  const pw = at(p, i + 3);
  const cx = at(c, j);
  const cy = at(c, j + 1);
  const cz = at(c, j + 2);
  const cw = at(c, j + 3);
  return [pw * cx + px * cw + py * cz - pz * cy, pw * cy - px * cz + py * cw + pz * cx, pw * cz + px * cy - py * cx + pz * cw, pw * cw - px * cx - py * cy - pz * cz];
}

/**
 * :813 wrist flex / side angles (deg) of child `c[j]` relative to parent `p[i]` (both world quats), for a bone along
 * the local Y axis, measured as the change from `neutral` (the relative rotation recorded in the neutral low-ready
 * grip at harness start: the rig's constant grip convention offset, characterRig.ts solveArm, reads 0). The change
 * is split into a twist about Y (pronation, not limited here) and a swing; the swing's axis-angle gives
 * flex = angle x axis X, side = angle x axis Z.
 */
export function relFlexSide(p: Arr, i: number, c: Arr, j: number, neutral: Arr = [0, 0, 0, 1]): [number, number] {
  const r = relQuat(p, i, c, j);
  // d = conj(neutral) * r
  const [x, y, z, w] = relQuat(neutral, 0, r, 0);
  // twist t = normalize(0, y, 0, w); swing s = d * conj(t)
  const tn = Math.sqrt(y * y + w * w);
  const ty = tn > 1e-9 ? y / tn : 0;
  const tw = tn > 1e-9 ? w / tn : 1;
  let sw = w * tw + y * ty;
  let sx = x * tw + z * ty;
  let sz = z * tw - x * ty;
  if (sw < 0) [sw, sx, sz] = [-sw, -sx, -sz];
  const sn = Math.sqrt(sx * sx + sz * sz);
  if (sn < 1e-12) return [0, 0];
  const ang = 2 * Math.atan2(sn, sw) * DEG;
  return [(ang * sx) / sn, (ang * sz) / sn];
}

/** Hysteresis turning points: alternating extrema (index, +1 high / -1 low) confirmed once the signal leaves them by `h`. */
export function turningPoints(x: Arr, h: number): { i: number; k: 1 | -1 }[] {
  const out: { i: number; k: 1 | -1 }[] = [];
  let dir = 0;
  let ci = -1;
  let cv = 0;
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < x.length; i++) {
    const v = at(x, i);
    if (!finite(v)) continue;
    if (dir === 0) {
      if (v < lo) lo = v;
      if (v > hi) hi = v;
      // (the start of the signal is not a turning point: only the direction is found here)
      if (v - lo > h) [dir, ci, cv] = [1, i, v];
      else if (hi - v > h) [dir, ci, cv] = [-1, i, v];
      continue;
    }
    if (dir === 1) {
      if (v > cv) [ci, cv] = [i, v];
      else if (cv - v > h) {
        out.push({ i: ci, k: 1 });
        [dir, ci, cv] = [-1, i, v];
      }
    } else if (v < cv) [ci, cv] = [i, v];
    else if (v - cv > h) {
      out.push({ i: ci, k: -1 });
      [dir, ci, cv] = [1, i, v];
    }
  }
  return out;
}

/** Whole-body centre of mass (Winter 2009 Table 4.1 masses) from joint positions. */
export interface BodyPoints {
  hips: [number, number, number];
  neck: [number, number, number];
  head: [number, number, number];
  shoulderL: [number, number, number];
  shoulderR: [number, number, number];
  elbowL: [number, number, number];
  elbowR: [number, number, number];
  wristL: [number, number, number];
  wristR: [number, number, number];
  hipL: [number, number, number];
  hipR: [number, number, number];
  kneeL: [number, number, number];
  kneeR: [number, number, number];
  ankleL: [number, number, number];
  ankleR: [number, number, number];
}
export function centerOfMass(b: BodyPoints): [number, number, number] {
  const M = SEGMENT_MASS;
  const C = SEGMENT_COM;
  const acc = [0, 0, 0];
  let m = 0;
  const seg = (a: number[], c: number[], f: number, mass: number): void => {
    for (let k = 0; k < 3; k++) acc[k]! += mass * ((a[k] ?? 0) + ((c[k] ?? 0) - (a[k] ?? 0)) * f);
    m += mass;
  };
  seg(b.hips, b.neck, C.trunk, M.trunk);
  seg(b.head, b.head, 0, M.headNeck);
  for (const [sh, el, wr, hp, kn, an] of [
    [b.shoulderL, b.elbowL, b.wristL, b.hipL, b.kneeL, b.ankleL],
    [b.shoulderR, b.elbowR, b.wristR, b.hipR, b.kneeR, b.ankleR],
  ] as const) {
    seg(sh, el, C.upperArm, M.upperArm);
    seg(el, wr, C.forearm, M.forearm);
    seg(wr, wr, 0, M.hand);
    seg(hp, kn, C.thigh, M.thigh);
    seg(kn, an, C.shank, M.shank);
    seg(an, an, 0, M.foot);
  }
  return [acc[0]! / m, acc[1]! / m, acc[2]! / m];
}

// ------------------------------------------------------------------ metrics

/**
 * :794 joint rotation per frame. `q` = world quats (stride 4), `hz` = sample rate. Limit 1500 deg/s, i.e. 25 deg
 * per 60 Hz frame, 12.5 deg per 120 Hz frame. `exempt[i]` skips the step into frame i (hits, impacts, teleports).
 * `dt[i]` (remote poses, real-time frames): the measured frame time into frame i; each step is then scaled to a
 * nominal 1 / `hz` frame (step x (1 / hz) / dt[i]), so the limit scales with the measured dt. `over` = frames over
 * the limit (pops).
 */
export function jointRate(q: Arr, hz: number, exempt?: Arr, degPerS = JOINT_DEG_PER_S, dt?: Arr): Result & { limit: number; over: number } {
  const limit = degPerS / hz;
  let worst = 0;
  let frame = -1;
  let over = 0;
  for (let i = 1; i * 4 + 3 < q.length; i++) {
    if (masked(exempt, i)) continue;
    const d = quatAngle(q, (i - 1) * 4, q, i * 4) * dtScale(dt, i, hz);
    if (d > limit) over++;
    if (d > worst || frame < 0) [worst, frame] = [d, i];
  }
  return { ...result(worst, frame, worst <= limit), limit, over };
}

/** (1 / hz) / dt[i]: a measured frame time `dt[i]` scaled to the nominal frame (1 without `dt` or a bad dt). */
export function dtScale(dt: Arr | undefined, i: number, hz: number): number {
  const d = dt ? at(dt, i) : NaN;
  return d > 0 && Number.isFinite(d) ? 1 / (hz * d) : 1;
}

/** Per-frame local rotation stream conj(parent) * child (stride 4) for a local-frame `jointRate`. */
export function localQuats(parent: Arr, child: Arr): Float64Array {
  const n = Math.floor(Math.min(parent.length, child.length) / 4);
  const out = new Float64Array(n * 4);
  for (let i = 0; i < n; i++) out.set(relQuat(parent, i * 4, child, i * 4), i * 4);
  return out;
}

/** :795 pelvis displacement per frame vs `limit` (= gear cap x dt + 2 cm); `dt` / `hz` as `jointRate` (measured frame times). */
export function pelvisJump(p: Arr, limit: number, exempt?: Arr, dt?: Arr, hz = 60): Result & { over: number } {
  let worst = 0;
  let frame = -1;
  let over = 0;
  for (let i = 1; i * 3 + 2 < p.length; i++) {
    if (masked(exempt, i)) continue;
    const d = len3(at(p, i * 3) - at(p, i * 3 - 3), at(p, i * 3 + 1) - at(p, i * 3 - 2), at(p, i * 3 + 2) - at(p, i * 3 - 1)) * dtScale(dt, i, hz);
    if (d > limit) over++;
    if (d > worst || frame < 0) [worst, frame] = [d, i];
  }
  return { ...result(worst, frame, worst <= limit), over };
}

/** :796 teleports: frames whose root / pelvis moves more than `dist` (0.5 m). worst = count. */
export function teleports(p: Arr, exempt?: Arr, dist = TELEPORT_DIST): Result & { maxJump: number } {
  let count = 0;
  let frame = -1;
  let maxJump = 0;
  for (let i = 1; i * 3 + 2 < p.length; i++) {
    if (masked(exempt, i)) continue;
    const d = len3(at(p, i * 3) - at(p, i * 3 - 3), at(p, i * 3 + 1) - at(p, i * 3 - 2), at(p, i * 3 + 2) - at(p, i * 3 - 1));
    if (d > maxJump) maxJump = d;
    if (d > dist) {
      count++;
      if (frame < 0) frame = i;
    }
  }
  return { ...result(count, frame, count === 0), maxJump };
}

/** :797 blend times: after each change of `state`, the time until `weight` reaches 0.999 must be within 0.1-0.25 s. */
export function blendTimes(state: Arr, weight: Arr, dt: number, min = BLEND_MIN, max = BLEND_MAX): Result & { blends: number } {
  let worst = 0;
  let worstOff = -1;
  let frame = -1;
  let blends = 0;
  let pass = true;
  for (let i = 1; i < state.length; i++) {
    if (at(state, i) === at(state, i - 1)) continue;
    let j = i;
    while (j < weight.length && at(weight, j) < 0.999 && at(state, j) === at(state, i)) j++;
    if (j >= weight.length || at(state, j) !== at(state, i)) continue; // interrupted / ran out: not a full blend
    blends++;
    const t = (j - i + 1) * dt;
    const off = t < min ? min - t : t > max ? t - max : 0;
    if (off > 0) pass = false;
    if (off > worstOff) [worstOff, worst, frame] = [off, t, i];
  }
  return { ...result(worst, frame, pass), blends };
}

/**
 * :801 planted foot. While `contact[i]`, the ankle's horizontal move from where it planted is slide; its height
 * above the ground (`groundY`) minus the rest ankle height `ref` is float (+) or sink (-). With `sole` (the lowest
 * sole point's world y per frame, `soleLowY`) the height is `sole - groundY` instead (`ref` then unused): a foot
 * on its toes reads its toe, not its raised ankle. Float / sink compare with a `tol` (1e-4 m) margin.
 */
export function footContact(
  ankle: Arr,
  groundY: Arr,
  contact: Arr,
  ref: number,
  lim = { slide: FOOT_SLIDE, float: FOOT_FLOAT, sink: FOOT_SINK },
  sole?: Arr,
  tol = FOOT_TOL,
): Result & { float: Result; sink: Result; plants: number } {
  let slide = 0;
  let slideF = -1;
  let fl = 0;
  let flF = -1;
  let sk = 0;
  let skF = -1;
  let lx = NaN;
  let lz = NaN;
  let plants = 0;
  for (let i = 0; i < contact.length; i++) {
    if (!at(contact, i)) {
      lx = NaN;
      continue;
    }
    const x = at(ankle, i * 3);
    const z = at(ankle, i * 3 + 2);
    if (Number.isNaN(lx)) {
      [lx, lz] = [x, z];
      plants++;
    }
    const s = Math.sqrt(sq(x - lx) + sq(z - lz));
    if (s > slide) [slide, slideF] = [s, i];
    const h = sole ? at(sole, i) - at(groundY, i) : at(ankle, i * 3 + 1) - at(groundY, i) - ref;
    if (h > fl) [fl, flF] = [h, i];
    if (-h > sk) [sk, skF] = [-h, i];
  }
  return {
    ...result(slide, slideF, slide < lim.slide),
    float: result(fl, flF, fl <= lim.float + tol),
    sink: result(sk, skF, sk <= lim.sink + tol),
    plants,
  };
}

/**
 * The heel and toe offsets of a foot in its ankle's local frame: the heel `back` x `len` behind the ankle, the toe
 * (1 - back) x `len` ahead, both `depth` below it along the foot's own `fwd` / `up` axes (calibrated on a flat rest
 * stance). Returned as [heel, toe]; the harness ray-casts the ground under each (soleLowY `ground`).
 */
export function solePoints(fwd: Arr, up: Arr, len: number, back: number, depth: number): [[number, number, number], [number, number, number]] {
  const pt = (a: number): [number, number, number] => [at(fwd, 0) * a - at(up, 0) * depth, at(fwd, 1) * a - at(up, 1) * depth, at(fwd, 2) * a - at(up, 2) * depth];
  return [pt(-back * len), pt((1 - back) * len)];
}

/**
 * Lowest sole point (world y per frame) of a foot: the heel and the toe (`solePoints`), along the foot's own axes.
 * `fwd` / `up` are the foot's forward and up axes in the ankle's local frame (calibrated on a flat rest stance),
 * `q` = ankle world quats. With `ground` (the world ground y under the heel and under the toe, each ray-cast at that
 * point's own x / z) the result is instead the lowest clearance, min(heel y - heel ground, toe y - toe ground): on a
 * slope or a stair nosing each point is read against its own ground (pass 0 as footContact's `groundY`). A point
 * with no ground hit (NaN) is skipped; no hit at either point gives NaN (frame not measured).
 */
export function soleLowY(
  ankle: Arr,
  q: Arr,
  fwd: Arr,
  up: Arr,
  len: number,
  back: number,
  depth: number,
  ground?: { heel: Arr; toe: Arr },
): Float64Array {
  const n = Math.floor(ankle.length / 3);
  const out = new Float64Array(n);
  const pts = solePoints(fwd, up, len, back, depth);
  for (let i = 0; i < n; i++) {
    let low = Infinity;
    for (let k = 0; k < 2; k++) {
      const o = pts[k] as [number, number, number];
      const v = quatRotate(q, i * 4, o[0], o[1], o[2]);
      const g = ground ? at(k === 0 ? ground.heel : ground.toe, i) : 0;
      const h = v[1] - g;
      if (finite(h) && h < low) low = h;
    }
    out[i] = low === Infinity ? NaN : at(ankle, i * 3 + 1) + low;
  }
  return out;
}

/**
 * :802 hand on its grip: the absolute wrist-to-target distance (`target` = the grip / foregrip point plus the
 * weapon-space wrist offsets, as e2e-weapons-carry), on frames whose grip IK weight `weight[i]` > 0.5 (NaN targets
 * skipped). Pass <= 2 cm.
 */
export function handContact(wrist: Arr, target: Arr, weight?: Arr, limit = HAND_GRIP): Result & { frames: number } {
  let worst = 0;
  let frame = -1;
  let frames = 0;
  for (let i = 0; i * 3 + 2 < wrist.length; i++) {
    if (weight && !(at(weight, i) > GRIP_IK_ON)) continue;
    const v = len3(at(wrist, i * 3) - at(target, i * 3), at(wrist, i * 3 + 1) - at(target, i * 3 + 1), at(wrist, i * 3 + 2) - at(target, i * 3 + 2));
    if (!finite(v)) continue;
    frames++;
    if (v > worst || frame < 0) [worst, frame] = [v, i];
  }
  return { ...result(worst, frame, worst <= limit), frames };
}

/** Flexion (deg) at joint b of the chain a-b-c: 0 = straight. */
export function flexion(a: Arr, b: Arr, c: Arr, i: number): number {
  const ux = at(a, i * 3) - at(b, i * 3);
  const uy = at(a, i * 3 + 1) - at(b, i * 3 + 1);
  const uz = at(a, i * 3 + 2) - at(b, i * 3 + 2);
  const vx = at(c, i * 3) - at(b, i * 3);
  const vy = at(c, i * 3 + 1) - at(b, i * 3 + 1);
  const vz = at(c, i * 3 + 2) - at(b, i * 3 + 2);
  const cos = (ux * vx + uy * vy + uz * vz) / (len3(ux, uy, uz) * len3(vx, vy, vz) || 1);
  return 180 - Math.acos(Math.max(-1, Math.min(1, cos))) * DEG;
}

/**
 * :812-815 range of motion. Three-point form (knee: hip-knee-ankle, elbow: shoulder-elbow-wrist): flexion <= 150 deg;
 * with `bend` (stride 3, the direction the joint must bulge toward: body forward for a knee, back for an elbow) a
 * bulge the other way is hyperextension (<= 5 deg). Angle form: `romLimit` below.
 */
export function romAngles(a: Arr, b: Arr, c: Arr, bend?: Arr, flexMax: number = ROM.flexMax, hyperMax: number = ROM.hyperMax): Result & { hyper: Result } {
  let worst = 0;
  let frame = -1;
  let hyper = 0;
  let hyperF = -1;
  for (let i = 0; i * 3 + 2 < b.length; i++) {
    const f = flexion(a, b, c, i);
    if (!finite(f)) continue;
    let signed = f;
    if (bend) {
      // which side of the a-c line the joint is on
      const mx = (at(a, i * 3) + at(c, i * 3)) / 2;
      const mz = (at(a, i * 3 + 2) + at(c, i * 3 + 2)) / 2;
      const s = (at(b, i * 3) - mx) * at(bend, i * 3) + (at(b, i * 3 + 2) - mz) * at(bend, i * 3 + 2);
      if (s < 0) signed = -f;
    }
    if (signed > worst || frame < 0) [worst, frame] = [signed, i];
    if (-signed > hyper) [hyper, hyperF] = [-signed, i];
  }
  return { ...result(worst, frame, worst <= flexMax && hyper <= hyperMax), hyper: result(hyper, hyperF, hyper <= hyperMax) };
}

/**
 * (locomotion step 21) Three-point flexion (deg) held inside [min, max] (ready-hands elbows): worst = the furthest any
 * frame falls outside the band (0 inside), with the range seen.
 */
export function flexBand(a: Arr, b: Arr, c: Arr, min: number, max: number): Result & { min: number; max: number } {
  let worst = 0;
  let frame = -1;
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i * 3 + 2 < b.length; i++) {
    const f = flexion(a, b, c, i);
    if (!finite(f)) continue;
    lo = Math.min(lo, f);
    hi = Math.max(hi, f);
    const out = f < min ? min - f : f > max ? f - max : 0;
    if (out > worst || frame < 0) [worst, frame] = [out, i];
  }
  return { ...result(worst, frame, worst <= 0), min: lo, max: hi };
}

/** :812-815 angle form of ROM (wrist flex / side, neck twist, spine twist): |angle| <= limit (deg). */
export function romLimit(angles: Arr, limit: number): Result {
  let worst = 0;
  let frame = -1;
  for (let i = 0; i < angles.length; i++) {
    const v = Math.abs(at(angles, i));
    if (finite(v) && (v > worst || frame < 0)) [worst, frame] = [v, i];
  }
  return result(worst, frame, worst <= limit);
}

/** Convex hull (xz pairs, flat) by monotone chain; counter-clockwise, no repeated end point. */
export function convexHull2(pts: number[]): number[] {
  const n = pts.length >> 1;
  const idx = Array.from({ length: n }, (_, k) => k).sort((a, b) => pts[a * 2]! - pts[b * 2]! || pts[a * 2 + 1]! - pts[b * 2 + 1]!);
  const cross = (o: number, a: number, b: number): number =>
    (pts[a * 2]! - pts[o * 2]!) * (pts[b * 2 + 1]! - pts[o * 2 + 1]!) - (pts[a * 2 + 1]! - pts[o * 2 + 1]!) * (pts[b * 2]! - pts[o * 2]!);
  const lo: number[] = [];
  for (const k of idx) {
    while (lo.length >= 2 && cross(lo[lo.length - 2]!, lo[lo.length - 1]!, k) <= 0) lo.pop();
    lo.push(k);
  }
  const hi: number[] = [];
  for (let m = idx.length - 1; m >= 0; m--) {
    const k = idx[m]!;
    while (hi.length >= 2 && cross(hi[hi.length - 2]!, hi[hi.length - 1]!, k) <= 0) hi.pop();
    hi.push(k);
  }
  const h = lo.slice(0, -1).concat(hi.slice(0, -1));
  return h.flatMap((k) => [pts[k * 2]!, pts[k * 2 + 1]!]);
}

/** Distance of (px, pz) outside a convex polygon (flat xz, counter-clockwise); 0 inside. */
export function outsidePolygon(px: number, pz: number, poly: number[]): number {
  const n = poly.length >> 1;
  if (n === 0) return NaN;
  if (n === 1) return Math.sqrt(sq(px - poly[0]!) + sq(pz - poly[1]!));
  let inside = n >= 3;
  let best = Infinity;
  for (let k = 0; k < n; k++) {
    const ax = poly[k * 2]!;
    const az = poly[k * 2 + 1]!;
    const bx = poly[((k + 1) % n) * 2]!;
    const bz = poly[((k + 1) % n) * 2 + 1]!;
    if ((bx - ax) * (pz - az) - (bz - az) * (px - ax) < 0) inside = false;
    const dx = bx - ax;
    const dz = bz - az;
    const l2 = dx * dx + dz * dz;
    const t = l2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2)) : 0;
    best = Math.min(best, Math.sqrt(sq(px - ax - dx * t) + sq(pz - az - dz * t)));
  }
  return inside ? 0 : best;
}

/** Foot sole rectangle corners (flat xz) for an ankle at (x, z) with yaw (forward = (sin, cos)). */
export function footPolygon(x: number, z: number, yaw: number, len: number, width: number, back = FOOT_BACK): number[] {
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  const out: number[] = [];
  for (const [a, l] of [
    [-back * len, -width / 2],
    [-back * len, width / 2],
    [(1 - back) * len, width / 2],
    [(1 - back) * len, -width / 2],
  ] as const)
    out.push(x + fx * a + fz * l, z + fz * a - fx * l);
  return out;
}

/**
 * :818 balance: horizontal distance of the COM (`com` xz, stride 2) outside the convex hull of the planted foot
 * soles (`feet` = Lx, Lz, Lyaw, Rx, Rz, Ryaw per frame, stride 6: ankle point and foot yaw; each sole a `len` x
 * `width` rectangle reaching `FOOT_BACK` x len behind the ankle; `contact` = L, R per frame, stride 2). Frames
 * with no planted foot or `exempt` are skipped. Pass while the distance <= 10 cm.
 */
export function balanceMargin(com: Arr, feet: Arr, contact: Arr, foot: { len: number; width: number }, exempt?: Arr, margin = BALANCE_MARGIN): Result {
  let worst = 0;
  let frame = -1;
  for (let i = 0; i * 2 + 1 < com.length; i++) {
    if (masked(exempt, i)) continue;
    const pts: number[] = [];
    for (let s = 0; s < 2; s++)
      if (at(contact, i * 2 + s)) pts.push(...footPolygon(at(feet, i * 6 + s * 3), at(feet, i * 6 + s * 3 + 1), at(feet, i * 6 + s * 3 + 2), foot.len, foot.width));
    if (!pts.length) continue;
    const d = outsidePolygon(at(com, i * 2), at(com, i * 2 + 1), convexHull2(pts));
    if (finite(d) && (d > worst || frame < 0)) [worst, frame] = [d, i];
  }
  return result(worst, frame, worst <= margin);
}

/** Closest distance between segments p0-p1 and q0-q1 (3D). */
export function segSegDistance(p0: number[], p1: number[], q0: number[], q1: number[]): number {
  const d1 = [p1[0]! - p0[0]!, p1[1]! - p0[1]!, p1[2]! - p0[2]!];
  const d2 = [q1[0]! - q0[0]!, q1[1]! - q0[1]!, q1[2]! - q0[2]!];
  const r = [p0[0]! - q0[0]!, p0[1]! - q0[1]!, p0[2]! - q0[2]!];
  const dot = (u: number[], v: number[]): number => u[0]! * v[0]! + u[1]! * v[1]! + u[2]! * v[2]!;
  const a = dot(d1, d1);
  const e = dot(d2, d2);
  const f = dot(d2, r);
  let s = 0;
  let t = 0;
  if (a <= 1e-12 && e <= 1e-12) return Math.sqrt(dot(r, r));
  if (a <= 1e-12) t = Math.max(0, Math.min(1, f / e));
  else {
    const c = dot(d1, r);
    if (e <= 1e-12) s = Math.max(0, Math.min(1, -c / a));
    else {
      const b = dot(d1, d2);
      const den = a * e - b * b;
      s = den > 1e-12 ? Math.max(0, Math.min(1, (b * f - c * e) / den)) : 0;
      t = (b * s + f) / e;
      if (t < 0) [t, s] = [0, Math.max(0, Math.min(1, -c / a))];
      else if (t > 1) [t, s] = [1, Math.max(0, Math.min(1, (b - c) / a))];
    }
  }
  const dx = r[0]! + d1[0]! * s - d2[0]! * t;
  const dy = r[1]! + d1[1]! * s - d2[1]! * t;
  const dz = r[2]! + d1[2]! * s - d2[2]! * t;
  return len3(dx, dy, dz);
}

/** :807 self-intersection: penetration of two limb capsules (radii sum `radii`) per frame; pass <= 2 cm. */
export function segmentDistance(a0: Arr, a1: Arr, b0: Arr, b1: Arr, radii: number, limit: number): Result {
  let worst = -Infinity;
  let frame = -1;
  const p = (s: Arr, i: number): number[] => [at(s, i * 3), at(s, i * 3 + 1), at(s, i * 3 + 2)];
  for (let i = 0; i * 3 + 2 < a0.length; i++) {
    const pen = radii - segSegDistance(p(a0, i), p(a1, i), p(b0, i), p(b1, i));
    if (finite(pen) && pen > worst) [worst, frame] = [pen, i];
  }
  if (frame < 0) worst = 0;
  return result(Math.max(0, worst), frame, worst <= limit);
}

/**
 * :1253 D2 pelvis per stride. `y` = pelvis height (detrended / capsule-relative), `strikes[i]` = a heel strike in
 * frame i (either foot: one step between two strikes, a stride = two steps). worst = the largest peak-to-peak over
 * a stride; every step must hold exactly one low and one high (turning points with `hyst` hysteresis).
 */
export function pelvisPerStride(y: Arr, strikes: Arr, limit: number, hyst = PELVIS_HYST): Result & { steps: number; badSteps: number; firstBad: number } {
  const s: number[] = [];
  for (let i = 0; i < strikes.length; i++) if (at(strikes, i)) s.push(i);
  const tp = turningPoints(y, hyst);
  let steps = 0;
  let badSteps = 0;
  let firstBad = -1;
  for (let k = 0; k + 1 < s.length; k++) {
    let lo = 0;
    let hi = 0;
    for (const t of tp)
      if (t.i >= s[k]! && t.i < s[k + 1]!) {
        if (t.k < 0) lo++;
        else hi++;
      }
    steps++;
    if (lo !== 1 || hi !== 1) {
      badSteps++;
      if (firstBad < 0) firstBad = s[k]!;
    }
  }
  let worst = 0;
  let frame = -1;
  for (let k = 0; k + 2 < s.length; k++) {
    let mn = Infinity;
    let mx = -Infinity;
    let mi = -1;
    for (let i = s[k]!; i <= s[k + 2]!; i++) {
      const v = at(y, i);
      if (!finite(v)) continue;
      if (v < mn) mn = v;
      if (v > mx) [mx, mi] = [v, i];
    }
    if (mx - mn > worst) [worst, frame] = [mx - mn, mi];
  }
  if (s.length < 3) {
    // fewer than one stride: p2p over the window
    const r = oscP2P(y, limit);
    [worst, frame] = [r.worst, r.frame];
  }
  return { ...result(worst, frame, worst <= limit && badSteps === 0 && steps > 0), steps, badSteps, firstBad };
}

/** Peak-to-peak of a signal after removing a linear fit; frame = the largest residual. */
export function oscP2P(x: Arr, limit: number): Result {
  const r = detrend(x);
  let mn = Infinity;
  let mx = -Infinity;
  let frame = -1;
  let big = -1;
  for (let i = 0; i < r.length; i++) {
    const v = r[i]!;
    if (!finite(v)) continue;
    mn = Math.min(mn, v);
    mx = Math.max(mx, v);
    if (Math.abs(v) > big) [big, frame] = [Math.abs(v), i];
  }
  const worst = frame < 0 ? 0 : mx - mn;
  return result(worst, frame, worst <= limit);
}

/**
 * :1255 lateral pelvis sway: pelvis offset from the capsule across the heading (`yaw` per frame, forward =
 * (sin, cos)), detrended peak-to-peak.
 */
export function lateralSway(pelvis: Arr, capsule: Arr, yaw: Arr, limit: number): Result {
  const lat: number[] = [];
  for (let i = 0; i < yaw.length; i++) {
    const y = at(yaw, i);
    lat.push((at(pelvis, i * 3) - at(capsule, i * 3)) * Math.cos(y) - (at(pelvis, i * 3 + 2) - at(capsule, i * 3 + 2)) * Math.sin(y));
  }
  return oscP2P(lat, limit);
}

/** :1254 head: vertical travel (detrended p2p) <= the pelvis's; pitch and roll p2p (deg) <= 2. */
export function headVsPelvis(headY: Arr, pelvisY: Arr, pitch: Arr, roll: Arr, angleMax = HEAD_ANGLE_P2P): Result & { pelvis: number; pitch: Result; roll: Result } {
  const h = oscP2P(headY, Infinity);
  const p = oscP2P(pelvisY, Infinity);
  const pr = oscP2P(pitch, angleMax);
  const rr = oscP2P(roll, angleMax);
  // (1 mm slack: two flat signals are equal within float noise)
  return { ...result(h.worst, h.frame, h.worst <= p.worst + 0.001 && pr.pass && rr.pass), pelvis: p.worst, pitch: pr, roll: rr };
}

/**
 * :1257 settle: from `start`, the time until |x - final| stays within `eps` (final = mean of the last 20%, or
 * given), and whether it left the band again (a second excursion) after first entering it. With `breathWin` > 0
 * (samples), the second-excursion check runs, from the first entry on, on x minus its local linear fit over
 * `breathWin` samples: the slow breathing drift is filtered out, a sway rebound stays. From `start`, any rise > `eps`
 * within `reboundS` (0.25 s; whole window when `breathWin` <= 0) after the first decline is a second excursion too.
 */
export function settleTime(x: Arr, start: number, dt: number, limit = SETTLE_TIME, eps = SETTLE_EPS, final?: number, breathWin = 0, reboundS = SETTLE_REBOUND_S): Result & { second: boolean } {
  const n = x.length;
  let fin = final;
  if (fin === undefined) {
    let s = 0;
    let c = 0;
    for (let i = Math.floor(n * 0.8); i < n; i++)
      if (finite(at(x, i))) {
        s += at(x, i);
        c++;
      }
    fin = c ? s / c : 0;
  }
  let last = -1;
  let entry = -1;
  let second = false;
  for (let i = start; i < n; i++) {
    const out = Math.abs(at(x, i) - fin) > eps;
    if (out) {
      last = i;
      if (entry >= 0 && breathWin <= 0) second = true;
    } else if (entry < 0) entry = i;
  }
  // a rebound, counted from the stop (not only after the first band entry): a rise > eps above an earlier sample
  // that came after a decline (below its running peak), within `reboundS` (a breathing drift rises slower)
  const w = breathWin > 0 ? Math.max(1, Math.round(reboundS / dt)) : n;
  let peak = -Infinity;
  let first = -1;
  for (let i = start; i < n && !second; i++) {
    const v = at(x, i);
    if (!finite(v)) continue;
    if (first < 0) {
      if (v >= peak) peak = v;
      else first = i;
    }
    if (first < 0) continue;
    for (let j = Math.max(first, i - w); j < i; j++) if (v - at(x, j) > eps) second = true;
  }
  if (entry >= 0 && breathWin > 0) {
    const seg: number[] = [];
    for (let i = entry; i < n; i++) seg.push(at(x, i));
    const slow = localLinear(seg, breathWin);
    for (let k = 0; k < seg.length; k++) if (Math.abs(seg[k]! - slow[k]!) > eps) second = true;
  }
  const t = last < 0 ? 0 : (last - start + 1) * dt;
  return { ...result(t, last, t <= limit && !second), second };
}

/**
 * :1256 landing: count of dips (hysteresis minima below the final level) and the rebound above it after the first
 * dip. Pass when `minDips` <= dips <= LANDING_DIPS and the rebound <= 2 mm (A35: camera 0 or 1 dips, pelvis exactly
 * 1, the D5.3 compression).
 */
export function landingDip(y: Arr, start: number, minDips = 1, rebound = LANDING_REBOUND, hyst = PELVIS_HYST): Result & { dips: number } {
  const seg: number[] = [];
  for (let i = start; i < y.length; i++) seg.push(at(y, i));
  const n = seg.length;
  let s = 0;
  let c = 0;
  for (let i = Math.floor(n * 0.8); i < n; i++)
    if (finite(seg[i])) {
      s += seg[i]!;
      c++;
    }
  const fin = c ? s / c : 0;
  const tp = turningPoints(seg, hyst);
  const lows = tp.filter((t) => t.k < 0 && seg[t.i]! < fin - hyst);
  let worst = 0;
  let frame = -1;
  if (lows.length) for (let i = lows[0]!.i; i < n; i++) if (seg[i]! - fin > worst) [worst, frame] = [seg[i]! - fin, start + i];
  return { ...result(worst, frame, lows.length >= minDips && lows.length <= LANDING_DIPS && worst <= rebound), dips: lows.length };
}

/**
 * :1271 D5 root overshoot: speed never above target x 1.01 while the stick is held (frames `from`..`stop`-1, the
 * acceleration included), and after the stop (`stop`) no backward move against the travel direction (dirX, dirZ)
 * beyond 1 mm. `target` = the commanded speed (one value, the gear cap) or a per-frame target (frames whose target
 * is below 5 cm/s are skipped). worst = max speed / target.
 */
export function rootOvershoot(speed: Arr, target: number | Arr, pos?: Arr, from = 0, stop = -1, dirX = 0, dirZ = 0): Result & { backstep: number } {
  const end = stop < 0 ? speed.length : stop;
  let worst = 0;
  let frame = -1;
  for (let i = from; i < end; i++) {
    const tg = typeof target === 'number' ? target : at(target, i);
    if (!(tg > 0.05)) continue;
    const r = at(speed, i) / tg;
    if (finite(r) && r > worst) [worst, frame] = [r, i];
  }
  let back = 0;
  if (pos && stop >= 0 && stop * 3 + 2 < pos.length) {
    const x0 = at(pos, stop * 3);
    const z0 = at(pos, stop * 3 + 2);
    let fx = x0;
    let fz = z0;
    for (let i = stop; i * 3 + 2 < pos.length; i++) {
      // backward = the furthest point reached minus where it ends up, along the travel direction
      const d = (at(pos, i * 3) - x0) * dirX + (at(pos, i * 3 + 2) - z0) * dirZ;
      const best = (fx - x0) * dirX + (fz - z0) * dirZ;
      if (d > best) [fx, fz] = [at(pos, i * 3), at(pos, i * 3 + 2)];
      back = Math.max(back, best - d);
    }
  }
  return { ...result(worst, frame, worst <= OVERSHOOT_RATIO && back <= BACKSTEP), backstep: back };
}

/** :1279 D5 stairs: the largest per-frame pelvis height change; pass within the continuity limit. */
export function stairsPelvisDrop(pelvisY: Arr, limit: number): Result {
  let worst = 0;
  let frame = -1;
  for (let i = 1; i < pelvisY.length; i++) {
    const d = Math.abs(at(pelvisY, i) - at(pelvisY, i - 1));
    if (finite(d) && d > worst) [worst, frame] = [d, i];
  }
  return result(worst, frame, worst <= limit);
}

/** :824-834 duration of the first on-span of `flag` (s); pass when >= `min`. Never on: worst 0, fail. */
export function durationOf(flag: Arr, dt: number, min: number): Result {
  let on = -1;
  let off = -1;
  for (let i = 0; i < flag.length; i++) {
    if (at(flag, i) && on < 0) on = i;
    else if (!at(flag, i) && on >= 0) {
      off = i;
      break;
    }
  }
  if (on < 0) return result(0, -1, false);
  if (off < 0) off = flag.length;
  const t = (off - on) * dt;
  return result(t, on, t >= min);
}

/**
 * :824-830 action time: from frame `from` (the last frame before the input) until `x` first comes within `tol` of
 * `target` (s); pass when >= `min`. Never reached: worst = the time to the end, fail. `step` > 0 (a signal updated
 * at the sim rate, sampled faster): the time rounds up to the end of its sim step (120 Hz frames sample each step
 * twice).
 */
export function reachTime(x: Arr, from: number, dt: number, min: number, target: number, tol: number, step = 0): Result & { reached: boolean } {
  const q = (t: number): number => (step > 0 ? Math.ceil(t / step - 1e-6) * step : t);
  for (let i = from + 1; i < x.length; i++)
    if (Math.abs(at(x, i) - target) <= tol) {
      const t = q((i - from) * dt);
      return { ...result(t, i, t >= min - 1e-9), reached: true };
    }
  return { ...result(Math.max(0, x.length - 1 - from) * dt, -1, false), reached: false };
}

/** Camera steady oscillation: :1256 shorthand for `oscP2P` with the 0.5 cm limit. */
export function cameraOsc(camYRel: Arr, limit = CAMERA_P2P): Result {
  return oscP2P(camYRel, limit);
}

// ------------------------------------------------------------------ anti-crab (anim-metrics, anim-rework BRIEF 5)

/** The pelvis frame at frame `i`: the horizontal unit axis from the left hip joint to the right one (`ux`, `uz`), the
 *  midpoint between them (`mx`, `mz`) and their horizontal distance (`width`). Null when the hips coincide. */
export function pelvisFrame(hipL: Arr, hipR: Arr, i: number): { ux: number; uz: number; mx: number; mz: number; width: number } | null {
  const k = i * 3;
  const dx = at(hipR, k) - at(hipL, k);
  const dz = at(hipR, k + 2) - at(hipL, k + 2);
  const w = Math.sqrt(dx * dx + dz * dz);
  if (!(w > 1e-6)) return null;
  return { ux: dx / w, uz: dz / w, mx: (at(hipL, k) + at(hipR, k)) / 2, mz: (at(hipL, k + 2) + at(hipR, k + 2)) / 2, width: w };
}

/** A point's lateral offset from the pelvis midline along the hip axis (m; + = toward the right hip). */
function lateral(p: Arr, i: number, f: { ux: number; uz: number; mx: number; mz: number }): number {
  return (at(p, i * 3) - f.mx) * f.ux + (at(p, i * 3 + 2) - f.mz) * f.uz;
}

export interface Range extends Result {
  min: number;
  max: number;
  mean: number;
  frames: number;
}
function range(vals: number[], idx: number[], pass: (min: number, max: number) => boolean, worstOf: 'max' | 'min' = 'max'): Range {
  if (!vals.length) return { worst: NaN, frame: -1, pass: true, min: NaN, max: NaN, mean: NaN, frames: 0 };
  let lo = 0;
  let hi = 0;
  let sum = 0;
  for (let j = 0; j < vals.length; j++) {
    sum += vals[j]!;
    if (vals[j]! < vals[lo]!) lo = j;
    if (vals[j]! > vals[hi]!) hi = j;
  }
  const min = vals[lo]!;
  const max = vals[hi]!;
  const w = worstOf === 'max' ? hi : lo;
  return { worst: vals[w]!, frame: idx[w]!, pass: pass(min, max), min, max, mean: sum / vals.length, frames: vals.length };
}

/**
 * Knee separation: the knees' lateral distance over the hip joints' distance, per frame (ratio). Within `[lo, hi]`
 * (CRAB.kneeSep) the knees track over the feet; well past `hi` they bow out (the crab). Frames in `exempt` are skipped.
 */
export function kneeSeparation(hipL: Arr, hipR: Arr, kneeL: Arr, kneeR: Arr, lo: number, hi: number, exempt?: Arr): Range {
  const vals: number[] = [];
  const idx: number[] = [];
  const n = Math.floor(hipL.length / 3);
  for (let i = 0; i < n; i++) {
    if (masked(exempt, i)) continue;
    const f = pelvisFrame(hipL, hipR, i);
    if (!f) continue;
    const r = (lateral(kneeR, i, f) - lateral(kneeL, i, f)) / f.width;
    if (!finite(r)) continue;
    vals.push(r);
    idx.push(i);
  }
  return range(vals, idx, (min, max) => min >= lo && max <= hi);
}

/**
 * Foot track: each planted foot's centre (its ankle) from the line under the hips, sampled on the frames that foot is
 * planted (`contactL` / `contactR`; every frame when none given). Positive = on its own side, negative = crossed over
 * the line. Pass when every sample is within `limit` (CRAB.trackHalf) of the line.
 */
export function footTrack(hipL: Arr, hipR: Arr, ankleL: Arr, ankleR: Arr, limit: number, contactL?: Arr, contactR?: Arr): Range {
  const vals: number[] = [];
  const idx: number[] = [];
  const n = Math.floor(hipL.length / 3);
  for (let i = 0; i < n; i++) {
    const f = pelvisFrame(hipL, hipR, i);
    if (!f) continue;
    if (!contactL || contactL[i]) {
      vals.push(-lateral(ankleL, i, f));
      idx.push(i);
    }
    if (!contactR || contactR[i]) {
      vals.push(lateral(ankleR, i, f));
      idx.push(i);
    }
  }
  return range(vals, idx, (min, max) => Math.abs(min) <= limit && Math.abs(max) <= limit);
}

/** Knee over the toes: how far each knee sits outside its own ankle (m, + = out, away from the midline), per frame. Pass
 *  when no knee is more than `limit` (CRAB.kneeBow) outside. */
export function kneeBow(hipL: Arr, hipR: Arr, kneeL: Arr, kneeR: Arr, ankleL: Arr, ankleR: Arr, limit: number, exempt?: Arr): Range {
  const vals: number[] = [];
  const idx: number[] = [];
  const n = Math.floor(hipL.length / 3);
  for (let i = 0; i < n; i++) {
    if (masked(exempt, i)) continue;
    const f = pelvisFrame(hipL, hipR, i);
    if (!f) continue;
    vals.push(lateral(ankleL, i, f) - lateral(kneeL, i, f), lateral(kneeR, i, f) - lateral(ankleR, i, f));
    idx.push(i, i);
  }
  return range(vals, idx, (_min, max) => max <= limit);
}

/** Planted-foot slide: a foot's horizontal travel from where it planted, while it stays planted (m); the largest over
 *  every plant. Pass when under `limit` (CRAB.slide, 1 cm). `plants` counts the plants seen. */
export function plantedSlide(ankle: Arr, contact: Arr, limit: number): Result & { plants: number } {
  let worst = 0;
  let frame = -1;
  let plants = 0;
  let px = NaN;
  let pz = NaN;
  const n = Math.floor(ankle.length / 3);
  for (let i = 0; i < n; i++) {
    if (!contact[i]) {
      px = NaN;
      continue;
    }
    const x = at(ankle, i * 3);
    const z = at(ankle, i * 3 + 2);
    if (Number.isNaN(px)) {
      px = x;
      pz = z;
      plants++;
      continue;
    }
    const d = Math.sqrt(sq(x - px) + sq(z - pz));
    if (d > worst) {
      worst = d;
      frame = i;
    }
  }
  return { ...result(worst, frame, worst < limit), plants };
}

/**
 * (anim-natural N1, decision 1) Contact-point slide: per plant, how far the foot's contact on the floor travels from where
 * it planted (m, the largest over every plant). The contact is read as the ball's spot: the ball point itself while the
 * ball is down (flat or the heel up, as a foot turning on its ball), and while only the heel is down (the ball more than
 * `ballUp` m above it: a heel-first landing) the heel point moved `lever` m on along the foot (heel to ball, footGeom
 * HEEL_BACK + TOE_BALL). The ankle's own travel (`plantedSlide`) reads a foot rolling on its heel or ball as slide; this
 * reads what moves on the floor. `heel` / `ball`: world points per frame (stride 3). `plants` counts the plants seen.
 */
export function contactSlide(heel: Arr, ball: Arr, contact: Arr, limit: number, lever: number, ballUp = 0.005): Result & { plants: number } {
  let worst = 0;
  let frame = -1;
  let plants = 0;
  let px = NaN;
  let pz = NaN;
  const n = Math.floor(Math.min(heel.length, ball.length) / 3);
  for (let i = 0; i < n; i++) {
    if (!contact[i]) {
      px = NaN;
      continue;
    }
    const hx = at(heel, i * 3);
    const hz = at(heel, i * 3 + 2);
    let x = at(ball, i * 3);
    let z = at(ball, i * 3 + 2);
    if (at(ball, i * 3 + 1) - at(heel, i * 3 + 1) > ballUp) {
      const dx = x - hx;
      const dz = z - hz;
      const l = Math.sqrt(dx * dx + dz * dz);
      if (l > 1e-6) {
        x = hx + (dx / l) * lever;
        z = hz + (dz / l) * lever;
      }
    }
    if (Number.isNaN(px)) {
      px = x;
      pz = z;
      plants++;
      continue;
    }
    const d = Math.sqrt(sq(x - px) + sq(z - pz));
    if (d > worst) {
      worst = d;
      frame = i;
    }
  }
  return { ...result(worst, frame, worst < limit), plants };
}

/**
 * (anim-natural N1, decisions 1 / 2) A planted foot's slide, per plant by how the planner holds it: a plant the planner
 * anchors (`anchored` on its first frame: the foot keeps its heel or ball on the floor while the ankle rolls round it)
 * reads its contact point (`contactSlide`), any other the ankle (`plantedSlide`, as before). Worst over the plants (m).
 */
export function footSlide(ankle: Arr, heel: Arr, ball: Arr, contact: Arr, anchored: Arr, limit: number, lever: number): Result & { plants: number; contactPlants: number } {
  let worst = 0;
  let frame = -1;
  let plants = 0;
  let contactPlants = 0;
  const n = contact.length;
  for (let i = 0; i < n; i++) {
    if (!contact[i] || (i > 0 && contact[i - 1])) continue;
    let j = i;
    while (j < n && contact[j]) j++;
    plants++;
    const useContact = !!anchored[i];
    if (useContact) contactPlants++;
    const r = useContact
      ? contactSlide(Array.prototype.slice.call(heel, i * 3, j * 3) as number[], Array.prototype.slice.call(ball, i * 3, j * 3) as number[], new Array<number>(j - i).fill(1), limit, lever)
      : plantedSlide(Array.prototype.slice.call(ankle, i * 3, j * 3) as number[], new Array<number>(j - i).fill(1), limit);
    if (r.worst > worst) {
      worst = r.worst;
      frame = i + r.frame;
    }
  }
  return { ...result(worst, frame, worst < limit), plants, contactPlants };
}

/** Elbow wing: how far each elbow sits outside its own shoulder along the shoulder line (m, + = out), per frame. Pass
 *  when no elbow is more than `limit` (CRAB.elbowWing) outside. */
export function elbowWing(shoulderL: Arr, shoulderR: Arr, elbowL: Arr, elbowR: Arr, limit: number, exempt?: Arr): Range {
  const vals: number[] = [];
  const idx: number[] = [];
  const n = Math.floor(shoulderL.length / 3);
  for (let i = 0; i < n; i++) {
    if (masked(exempt, i)) continue;
    const f = pelvisFrame(shoulderL, shoulderR, i);
    if (!f) continue;
    vals.push(lateral(shoulderL, i, f) - lateral(elbowL, i, f), lateral(elbowR, i, f) - lateral(shoulderR, i, f));
    idx.push(i, i);
  }
  return range(vals, idx, (_min, max) => max <= limit);
}

/** One frame of the crab metrics (`crabFrame`): filled in place. */
export interface CrabNow {
  /** Knees' lateral distance over the hip joints' (ratio). */
  kneeSep: number;
  /** Each ankle from the line under the hips (m, + = on its own side). */
  trackL: number;
  trackR: number;
  /** Each knee outside its own ankle (m, + = out). */
  bowL: number;
  bowR: number;
  /** Each elbow outside its own shoulder (m, + = out). */
  wingL: number;
  wingR: number;
  /** Hip joints' horizontal distance (m); 0 = no pelvis frame this frame (the other fields are left as they were). */
  hipWidth: number;
}
/** `crabFrame` joint order in its flat buffer (x, y, z each). */
export const CRAB_JOINTS = ['hipL', 'hipR', 'kneeL', 'kneeR', 'ankleL', 'ankleR', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR'] as const;

/**
 * The crab metrics of one frame from a flat buffer of world positions in `CRAB_JOINTS` order (30 numbers), into `out`.
 * Allocation-free (the debug overlay's live readout calls it every frame); the same maths as the stream metrics above.
 */
export function crabFrame(j: Arr, out: CrabNow): CrabNow {
  const dx = at(j, 3) - at(j, 0);
  const dz = at(j, 5) - at(j, 2);
  const w = Math.sqrt(dx * dx + dz * dz);
  if (!(w > 1e-6)) {
    out.hipWidth = 0;
    return out;
  }
  const ux = dx / w;
  const uz = dz / w;
  const mx = (at(j, 0) + at(j, 3)) / 2;
  const mz = (at(j, 2) + at(j, 5)) / 2;
  // (no closures: the overlay calls this every frame)
  const kL = (at(j, 6) - mx) * ux + (at(j, 8) - mz) * uz;
  const kR = (at(j, 9) - mx) * ux + (at(j, 11) - mz) * uz;
  const aL = (at(j, 12) - mx) * ux + (at(j, 14) - mz) * uz;
  const aR = (at(j, 15) - mx) * ux + (at(j, 17) - mz) * uz;
  out.hipWidth = w;
  out.kneeSep = (kR - kL) / w;
  out.trackL = -aL;
  out.trackR = aR;
  out.bowL = aL - kL;
  out.bowR = kR - aR;
  // the elbows against the shoulder line (its own frame: the shoulders may turn against the hips)
  const sx = at(j, 21) - at(j, 18);
  const sz = at(j, 23) - at(j, 20);
  const sw = Math.sqrt(sx * sx + sz * sz);
  if (sw > 1e-6) {
    const vx = sx / sw;
    const vz = sz / sw;
    out.wingL = at(j, 18) * vx + at(j, 20) * vz - (at(j, 24) * vx + at(j, 26) * vz);
    out.wingR = at(j, 27) * vx + at(j, 29) * vz - (at(j, 21) * vx + at(j, 23) * vz);
  }
  return out;
}
