// (mocap-trial) Gait maths shared by the analysis and the retarget: velocities, foot contacts (height + speed
// thresholds), strike / toe-off events, cycles, foot slide, heading, pops. Arrays are per frame at `fps`.
import { v3, q4, median, pct, smooth, unwrap, headingOf, R2D } from './math.mjs';

/** Horizontal speed (m/s) per frame, central difference over +-k frames. */
export function hSpeed(p, fps, k = 2) {
  const n = p.length;
  return p.map((_, i) => {
    const a = p[Math.max(0, i - k)], b = p[Math.min(n - 1, i + k)];
    const dt = (Math.min(n - 1, i + k) - Math.max(0, i - k)) / fps;
    return dt > 0 ? v3.distXZ(a, b) / dt : 0;
  });
}

/** Clean a boolean run list: fill gaps shorter than `gap` frames, drop runs shorter than `min` frames. */
export function cleanRuns(flags, gap, min) {
  const f = [...flags];
  const n = f.length;
  // fill short gaps between contacts
  let i = 0;
  while (i < n) {
    if (!f[i]) {
      let j = i;
      while (j < n && !f[j]) j++;
      if (i > 0 && j < n && j - i < gap) for (let k = i; k < j; k++) f[k] = true;
      i = j;
    } else i++;
  }
  // drop short runs
  i = 0;
  while (i < n) {
    if (f[i]) {
      let j = i;
      while (j < n && f[j]) j++;
      if (j - i < min) for (let k = i; k < j; k++) f[k] = false;
      i = j;
    } else i++;
  }
  return f;
}

export function runsOf(flags) {
  const runs = [];
  let i = 0;
  while (i < flags.length) {
    if (flags[i]) {
      let j = i;
      while (j < flags.length && flags[j]) j++;
      runs.push([i, j - 1]);
      i = j;
    } else i++;
  }
  return runs;
}

/**
 * Foot contacts from the ankle (heel) and ball points. Heights are relative to `floor`. A frame is in contact when
 * the heel is low and slow, or the ball is low and slow. Thresholds: low = the foot's 5th-percentile height plus
 * `hHeel` / `hBall`; slow = under `vMax` m/s. Returns flags plus the per-frame heel / ball sub-states.
 */
export function footContacts(ankle, ball, fps, { floor = 0, hHeel = 0.045, hBall = 0.035, vMax = 0.7 } = {}) {
  const ay = ankle.map((p) => p[1] - floor), by = ball.map((p) => p[1] - floor);
  const aRef = pct(ay, 0.05), bRef = pct(by, 0.05);
  const va = hSpeed(ankle, fps), vb = hSpeed(ball, fps);
  const heel = ay.map((y, i) => y < aRef + hHeel && va[i] < vMax);
  const toe = by.map((y, i) => y < bRef + hBall && vb[i] < vMax);
  const raw = heel.map((h, i) => h || toe[i]);
  const flags = cleanRuns(raw, Math.round(0.04 * fps), Math.round(0.05 * fps));
  return { flags, heel, toe, aRef, bRef, va, vb, ay, by };
}

/**
 * Slide of one contact run: the largest horizontal distance a grounded point travels from its rest point: the ankle
 * while the foot is flat (ankle and ball both down), the ball while it is down. Returns metres.
 */
export function runSlide(run, ankle, ball, c, { hHeel = 0.02, hBall = 0.015 } = {}) {
  let worst = 0;
  const parts = [[ankle, c.va, c.ay, c.aRef + hHeel], [ball, c.vb, c.by, c.bRef + hBall]];
  for (const [pts, v, h, lim] of parts) {
    const fr = [];
    // the ankle counts only while the foot is flat (heel rocker motion is not slide); the ball while it is down
    for (let i = run[0]; i <= run[1]; i++) if (h[i] < lim && (pts !== ankle || c.by[i] < c.bRef + hBall)) fr.push(i);
    if (fr.length < 2) continue;
    let best = fr[0];
    for (const i of fr) if (v[i] < v[best]) best = i;
    for (const i of fr) worst = Math.max(worst, v3.distXZ(pts[i], pts[best]));
  }
  return worst;
}

/** Facing heading (radians, 0 = +Z, + right) of a body whose rest forward is +Z, from its world quaternion. */
export const facing = (q) => headingOf(q4.rotate(q, [0, 0, 1]));

/** Unwrapped, smoothed heading track of a quaternion track (smoothing +-w frames). */
export function headingTrack(quats, w) {
  return smooth(unwrap(quats.map(facing)), w);
}

/** Pops: frames where a bone's local angular step jumps far above its neighbourhood. Returns [{frame, deg}]. */
export function pops(local, { minDeg = 8, factor = 4, win = 10 } = {}) {
  const step = [0];
  for (let i = 1; i < local.length; i++) step.push(q4.between(local[i - 1], local[i]) * R2D);
  const out = [];
  for (let i = 1; i < step.length; i++) {
    const nb = [];
    for (let k = Math.max(1, i - win); k <= Math.min(step.length - 1, i + win); k++) if (Math.abs(k - i) > 1) nb.push(step[k]);
    const m = median(nb);
    if (step[i] > Math.max(minDeg, factor * m)) out.push({ frame: i, deg: step[i] });
  }
  return { out, step };
}

/** Jitter: median absolute second difference of a point track (mm per frame^2). */
export function jitter(p) {
  const d = [];
  for (let i = 1; i < p.length - 1; i++) d.push(v3.len(v3.add(v3.sub(p[i + 1], v3.scale(p[i], 2)), p[i - 1])) * 1000);
  return median(d);
}

/** Interpolate a point track at fractional frame f. */
export function samplePos(arr, f) {
  const i = Math.max(0, Math.min(arr.length - 1, Math.floor(f))), j = Math.min(arr.length - 1, i + 1), t = f - i;
  return v3.lerp(arr[i], arr[j], Math.max(0, Math.min(1, t)));
}
export function sampleQuat(arr, f) {
  const i = Math.max(0, Math.min(arr.length - 1, Math.floor(f))), j = Math.min(arr.length - 1, i + 1), t = f - i;
  return q4.slerp(arr[i], arr[j], Math.max(0, Math.min(1, t)));
}
export function sampleNum(arr, f) {
  const i = Math.max(0, Math.min(arr.length - 1, Math.floor(f))), j = Math.min(arr.length - 1, i + 1), t = f - i;
  return arr[i] + (arr[j] - arr[i]) * Math.max(0, Math.min(1, t));
}
