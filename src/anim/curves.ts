/**
 * Keyframed scalar curves (pure). Keys are (time, value) pairs; evaluation is monotone cubic Hermite
 * (Fritsch-Carlson tangents), so curves ease through keys without overshooting between them. Looping
 * curves wrap their tangents across the end. Allocation-free evaluation.
 */
export interface Curve {
  t: Float64Array;
  v: Float64Array;
  m: Float64Array;
  loop: boolean;
  /** Period for looping curves (keys should span [0, period)). */
  period: number;
}

/** Build a curve from flat [t0, v0, t1, v1, ...] (times ascending). */
export function curve(kv: readonly number[], loop = false, period = 1): Curve {
  const n = kv.length >> 1;
  const t = new Float64Array(n);
  const v = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    t[i] = kv[i * 2]!;
    v[i] = kv[i * 2 + 1]!;
  }
  const m = new Float64Array(n);
  if (n > 1) {
    // secant slopes (wrapping for loops)
    const d = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const j = i + 1;
      if (j < n) d[i] = (v[j]! - v[i]!) / Math.max(1e-9, t[j]! - t[i]!);
      else d[i] = loop ? (v[0]! - v[i]!) / Math.max(1e-9, t[0]! + period - t[i]!) : 0;
    }
    for (let i = 0; i < n; i++) {
      const prev = i > 0 ? d[i - 1]! : loop ? d[n - 1]! : d[0]!;
      const next = i < n - 1 || loop ? d[i]! : d[n - 2]!;
      // monotone: flat at local extrema, harmonic-style mean otherwise
      m[i] = prev * next <= 0 ? 0 : (2 * prev * next) / (prev + next);
    }
    if (!loop) {
      m[0] = 0;
      m[n - 1] = 0;
    }
  }
  return { t, v, m, loop, period };
}

/** Constant curve. */
export function flat(value: number): Curve {
  return curve([0, value]);
}

function hermite(p0: number, m0: number, p1: number, m1: number, h: number, s: number): number {
  const s2 = s * s;
  const s3 = s2 * s;
  return (2 * s3 - 3 * s2 + 1) * p0 + (s3 - 2 * s2 + s) * h * m0 + (-2 * s3 + 3 * s2) * p1 + (s3 - s2) * h * m1;
}

/** Evaluate at time `x` (clamped, or wrapped for loops). */
export function evalCurve(c: Curve, x: number): number {
  const { t, v, m } = c;
  const n = t.length;
  if (n === 0) return 0;
  if (n === 1) return v[0]!;
  if (c.loop) {
    x = ((x % c.period) + c.period) % c.period;
    if (x < t[0]!) {
      // between the last key and the first key of the next period
      const h = t[0]! + c.period - t[n - 1]!;
      return hermite(v[n - 1]!, m[n - 1]!, v[0]!, m[0]!, h, (x + c.period - t[n - 1]!) / h);
    }
    if (x >= t[n - 1]!) {
      const h = t[0]! + c.period - t[n - 1]!;
      return hermite(v[n - 1]!, m[n - 1]!, v[0]!, m[0]!, h, (x - t[n - 1]!) / h);
    }
  } else {
    if (x <= t[0]!) return v[0]!;
    if (x >= t[n - 1]!) return v[n - 1]!;
  }
  // binary search for the segment
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (t[mid]! <= x) lo = mid;
    else hi = mid;
  }
  const h = t[hi]! - t[lo]!;
  return hermite(v[lo]!, m[lo]!, v[hi]!, m[hi]!, h, (x - t[lo]!) / h);
}

/** Critically damped decay of an offset (inertialization): value and velocity after dt. */
export function dampOffset(x: number, v: number, omega: number, dt: number): [number, number] {
  const e = Math.exp(-omega * dt);
  const t1 = (v + omega * x) * dt;
  return [(x + t1) * e, (v - omega * t1) * e];
}
