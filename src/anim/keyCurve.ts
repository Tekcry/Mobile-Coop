/**
 * (anim-skeleton S4b) Blender's keyframe curve, as `scripts/anim-keys/py/key_clip.py` keys a clip in the pinned Blender
 * 5.2.2: BEZIER interpolation, AUTO_CLAMPED handles, the F-curve's auto smoothing at the factory default (Continuous
 * Acceleration, `CONT_ACCEL`), a CYCLES modifier first and the first key repeated one period later. Pure, Babylon-free,
 * no allocation after `newKeyCurve`: the live key preview can spread a key's edit over the frames with the curve the
 * bake gives Blender (BRIEF item 30(e)).
 *
 * The handles (Blender `BKE_fcurve_handles_recalc` with the cycle on, then `BKE_nurb_handle_smooth_fcurve`):
 * - neighbours wrap (the first key's previous is the last one a period earlier), so the curve is periodic;
 * - every handle reaches a third of its gap in time (smoothing on), so the curve's time is linear in its parameter;
 * - auto clamped: a key at or beyond both neighbours' values (an extreme, ties included) is locked with flat handles;
 * - the free keys between two locked ones get the handles that make the curve's second derivative continuous through
 *   them (a tridiagonal system, Blender `bezier_eq_continuous`), each handle kept between its key's and the neighbour's
 *   value (`bezier_clamp`): an overshooting handle is locked at its limit and the system solved again, a locked one
 *   released (at most twice) when it pulls back inside (`tridiagonal_solve_with_limits`).
 * Blender works in float, this in double: the two agree to float noise (tests/keyCurve.test.ts, a Blender fixture).
 */

/** One curve's knots and solved handles (`newKeyCurve` allocates; `keyCurveSet` and `keyCurveAt` never do). */
export interface KeyCurve {
  /** Knots set, the period (knot times within [t[0], t[0] + period)). */
  n: number;
  period: number;
  readonly cap: number;
  readonly t: Float64Array;
  readonly y: Float64Array;
  /** The left / right handle heights (value offsets from the knot; in time a third of the gap each way). */
  readonly hl: Float64Array;
  readonly hr: Float64Array;
  /** 1 = an extreme (flat, locked). */
  readonly lock: Uint8Array;
  // the solver's scratch (one sequence of free keys at a time, its two locked ends included)
  readonly dx: Float64Array;
  readonly dy: Float64Array;
  readonly l: Float64Array;
  readonly a: Float64Array;
  readonly b: Float64Array;
  readonly c: Float64Array;
  readonly d: Float64Array;
  readonly a0: Float64Array;
  readonly b0: Float64Array;
  readonly c0: Float64Array;
  readonly d0: Float64Array;
  readonly h: Float64Array;
  readonly hmin: Float64Array;
  readonly hmax: Float64Array;
  readonly cp: Float64Array;
  readonly dp: Float64Array;
  readonly held: Uint8Array;
  readonly unlocks: Uint8Array;
}

/** A curve for up to `cap` knots (setup time). */
export function newKeyCurve(cap = 64): KeyCurve {
  const s = cap + 2;
  const f = (): Float64Array => new Float64Array(s);
  return {
    n: 0,
    period: 1,
    cap,
    t: new Float64Array(cap),
    y: new Float64Array(cap),
    hl: new Float64Array(cap),
    hr: new Float64Array(cap),
    lock: new Uint8Array(cap),
    dx: f(),
    dy: f(),
    l: f(),
    a: f(),
    b: f(),
    c: f(),
    d: f(),
    a0: f(),
    b0: f(),
    c0: f(),
    d0: f(),
    h: f(),
    hmin: f(),
    hmax: f(),
    cp: f(),
    dp: f(),
    held: new Uint8Array(s),
    unlocks: new Uint8Array(s),
  };
}

/** Knot `i` (any integer: wraps) of curve `k`: time, value. */
function tAt(k: KeyCurve, i: number): number {
  const w = Math.floor(i / k.n);
  return k.t[i - w * k.n]! + w * k.period;
}
function yAt(k: KeyCurve, i: number): number {
  return k.y[i - Math.floor(i / k.n) * k.n]!;
}

/**
 * Set curve `k` to `n` knots: times t[0 .. n-1] ascending within one `period` (the bake: frames of 48, or phases of 1),
 * values v[o + i * stride] (plus add[o + i * stride] when `add` is given, so base + edit needs no copy), and solve its
 * handles. No allocation.
 */
export function keyCurveSet(k: KeyCurve, t: ArrayLike<number>, v: ArrayLike<number>, n: number, stride: number, o: number, period: number, add: ArrayLike<number> | null = null): KeyCurve {
  if (n > k.cap) throw new Error(`keyCurveSet: ${n} knots, capacity ${k.cap}`);
  k.n = n;
  k.period = period;
  for (let i = 0; i < n; i++) {
    const s = o + i * stride;
    k.t[i] = t[i]!;
    k.y[i] = add ? v[s]! + add[s]! : v[s]!;
    k.hl[i] = 0;
    k.hr[i] = 0;
  }
  if (n < 2) return k;
  let first = -1;
  for (let i = 0; i < n; i++) {
    const y1 = k.y[i]!;
    const d1 = yAt(k, i - 1) - y1;
    const d2 = yAt(k, i + 1) - y1;
    const ex = (d1 <= 0 && d2 <= 0) || (d1 >= 0 && d2 >= 0);
    k.lock[i] = ex ? 1 : 0;
    if (ex && first < 0) first = i;
    if (!ex) firstPass(k, i);
  }
  // a periodic curve always has a locked maximum and minimum; with none (float ties) the first-pass handles stand
  if (first < 0) return k;
  // each run of free keys between two locked ones (wrapping), solved for continuous acceleration
  let i0 = first;
  for (let guard = 0; guard < n; guard++) {
    let i1 = i0 + 1;
    while (!k.lock[i1 % n]) i1++;
    if (i1 - i0 >= 2) solveRun(k, i0, i1);
    if (i1 >= first + n) break;
    i0 = i1;
  }
  return k;
}

/**
 * The first pass for a free key (Blender `calchandleNurb_intern`, smoothing on: the handles along the neighbours' slope
 * sum, a handle past its neighbour's value cut to it and the other realigned). The run solve below replaces them; they
 * stand only for a curve with no locked key.
 */
function firstPass(k: KeyCurve, i: number): void {
  let la = tAt(k, i) - tAt(k, i - 1);
  let lb = tAt(k, i + 1) - tAt(k, i);
  if (la === 0) la = 1;
  if (lb === 0) lb = 1;
  const y0 = yAt(k, i - 1);
  const y1 = k.y[i]!;
  const y2 = yAt(k, i + 1);
  const m = (y1 - y0) / la + (y2 - y1) / lb;
  let hl = (-m * la) / 6;
  let hr = (m * lb) / 6;
  const rising = y0 - y1 <= 0;
  let left = false;
  let right = false;
  if (rising ? y0 > y1 + hl : y0 < y1 + hl) {
    hl = y0 - y1;
    left = true;
  }
  if (rising ? y2 < y1 + hr : y2 > y1 + hr) {
    hr = y2 - y1;
    right = true;
  }
  if (left) hr = (-hl * lb) / la;
  else if (right) hl = (-hr * la) / lb;
  k.hl[i] = hl;
  k.hr[i] = hr;
}

/** Blender `bezier_clamp`, both flags on (auto clamped): the handle height h[i] kept between 0 and dy. */
function clampRange(k: KeyCurve, i: number, dy: number): void {
  if (dy > 0) {
    if (k.hmax[i]! > dy) k.hmax[i] = dy;
    k.hmin[i] = 0;
  } else if (dy < 0) {
    k.hmax[i] = 0;
    if (k.hmin[i]! < dy) k.hmin[i] = dy;
  } else {
    k.hmax[i] = 0;
    k.hmin[i] = 0;
  }
}

/** The free keys strictly between locked knots i0 < i1 (unwrapped indices): continuous acceleration, clamped. */
function solveRun(k: KeyCurve, i0: number, i1: number): void {
  const cnt = i1 - i0 + 1;
  const { dx, dy, l, a, b, c, d, h, hmin, hmax } = k;
  for (let j = 1; j < cnt; j++) {
    dx[j] = tAt(k, i0 + j) - tAt(k, i0 + j - 1);
    dy[j] = yAt(k, i0 + j) - yAt(k, i0 + j - 1);
  }
  l[0] = 1;
  l[cnt - 1] = 1;
  for (let j = 1; j < cnt - 1; j++) l[j] = dx[j + 1]! / dx[j]!;
  for (let j = 0; j < cnt; j++) {
    hmax[j] = Infinity;
    hmin[j] = -Infinity;
  }
  for (let j = 1; j < cnt; j++) {
    clampRange(k, j - 1, dy[j]!);
    clampRange(k, j, dy[j]! * l[j]!);
  }
  // the locked ends: their flat handles (height 0)
  lockEq(k, 0, 0);
  lockEq(k, cnt - 1, 0);
  for (let j = 1; j < cnt - 1; j++) {
    const lj = l[j]!;
    a[j] = lj * lj;
    b[j] = 2 * (lj + 1);
    c[j] = 1 / l[j + 1]!;
    d[j] = dy[j]! * lj * lj + dy[j + 1]!;
  }
  solveLimits(k, cnt);
  for (let j = 1; j < cnt - 1; j++) {
    const m = (i0 + j) % k.n;
    k.hr[m] = h[j]!;
    k.hl[m] = -h[j]! / l[j]!;
  }
}

function lockEq(k: KeyCurve, i: number, value: number): void {
  k.a[i] = 0;
  k.c[i] = 0;
  k.b[i] = 1;
  k.d[i] = value;
}

/** Thomas algorithm (the run's system is plain tridiagonal: its ends are locked). False on a zero pivot. */
function thomas(k: KeyCurve, n: number): boolean {
  const { a, b, c, d, h, cp, dp } = k;
  let den = b[0]!;
  if (den === 0) return false;
  cp[0] = c[0]! / den;
  dp[0] = d[0]! / den;
  for (let i = 1; i < n; i++) {
    den = b[i]! - a[i]! * cp[i - 1]!;
    if (den === 0) return false;
    cp[i] = c[i]! / den;
    dp[i] = (d[i]! - a[i]! * dp[i - 1]!) / den;
  }
  h[n - 1] = dp[n - 1]!;
  for (let i = n - 2; i >= 0; i--) h[i] = dp[i]! - cp[i]! * h[i + 1]!;
  return true;
}

/**
 * Blender `tridiagonal_solve_with_limits`: solve; lock every handle past its range at its limit (those with a non-zero
 * target first, all of them when none has one) and solve again; with none past, release a locked handle (at most twice
 * each) whose equation pulls it back inside, and solve again. The ends stay locked (their equations are locks).
 */
function solveLimits(k: KeyCurve, n: number): void {
  const { a, b, c, d, a0, b0, c0, d0, h, hmin, hmax, held, unlocks } = k;
  for (let i = 0; i < n; i++) {
    a0[i] = a[i]!;
    b0[i] = b[i]!;
    c0[i] = c[i]!;
    d0[i] = d[i]!;
    held[i] = 0;
    unlocks[i] = 0;
  }
  for (let it = 0; it < 4 * n + 8; it++) {
    if (!thomas(k, n)) return;
    let over = false;
    let locked = false;
    for (let pass = 0; pass < 2 && !locked; pass++) {
      over = false;
      for (let i = 0; i < n; i++) {
        const v = h[i]!;
        if (v >= hmin[i]! && v <= hmax[i]!) continue;
        over = true;
        const target = v > hmax[i]! ? hmax[i]! : hmin[i]!;
        if (target !== 0 || pass === 1) {
          held[i] = 1;
          lockEq(k, i, target);
          locked = true;
        }
      }
      if (!over) break;
    }
    let released = false;
    if (!locked) {
      for (let i = 0; i < n; i++) {
        if (!held[i] || unlocks[i]! >= 2) continue;
        const ip = (i + n - 1) % n;
        const inx = (i + 1) % n;
        const state = a0[i]! * h[ip]! + b0[i]! * h[i]! + c0[i]! * h[inx]! - d0[i]!;
        const relax = -state * b0[i]!;
        if ((relax > 0 && h[i]! < hmax[i]!) || (relax < 0 && h[i]! > hmin[i]!)) {
          a[i] = a0[i]!;
          b[i] = b0[i]!;
          c[i] = c0[i]!;
          d[i] = d0[i]!;
          held[i] = 0;
          unlocks[i] = unlocks[i]! + 1;
          released = true;
        }
      }
    }
    if (!over && !released) return;
  }
}

/**
 * A key edit's spread over a clip's `N` frames as the rebake makes it: out[f * os + oo] = curve(base + d)(f / N) -
 * curve(base)(f / N) for field `j` of `n` knots (phases t[0 .. n-1] in [0, 1), values at j + i * stride), so an edited
 * key's in-betweens follow the Bezier Blender evaluates (its clamped handles depend on the keys' values, hence the base).
 * `base` null: the curve of `d` alone (each edited key then an extreme with flat handles: an approximation when the key
 * file's values are not at hand). `kc` / `kb` are scratch curves. No allocation.
 */
export function keyCurveSpread(kc: KeyCurve, kb: KeyCurve, t: ArrayLike<number>, base: ArrayLike<number> | null, d: ArrayLike<number>, n: number, stride: number, j: number, N: number, out: Float64Array | Float32Array, os: number, oo: number): void {
  if (base) {
    keyCurveSet(kc, t, base, n, stride, j, 1, d);
    keyCurveSet(kb, t, base, n, stride, j, 1);
    for (let f = 0; f < N; f++) out[f * os + oo] = keyCurveAt(kc, f / N) - keyCurveAt(kb, f / N);
  } else {
    keyCurveSet(kc, t, d, n, stride, j, 1);
    for (let f = 0; f < N; f++) out[f * os + oo] = keyCurveAt(kc, f / N);
  }
}

/** Curve `k` at `x` (any real: wraps by its period). No allocation. */
export function keyCurveAt(k: KeyCurve, x: number): number {
  const n = k.n;
  if (n <= 0) return 0;
  if (n === 1) return k.y[0]!;
  const t0 = k.t[0]!;
  let p = x - Math.floor((x - t0) / k.period) * k.period;
  if (p < t0) p = t0;
  let ia = n - 1;
  for (let i = 0; i < n; i++) if (k.t[i]! <= p) ia = i;
  const ib = (ia + 1) % n;
  const xa = k.t[ia]!;
  const xb = tAt(k, ia + 1);
  const ya = k.y[ia]!;
  const yb = k.y[ib]!;
  const y1 = ya + k.hr[ia]!;
  const y2 = yb + k.hl[ib]!;
  const s = xb > xa ? (p - xa) / (xb - xa) : 0; // the handles at a third: time is linear in the parameter
  const u = 1 - s;
  return u * u * u * ya + 3 * u * u * s * y1 + 3 * u * s * s * y2 + s * s * s * yb;
}
