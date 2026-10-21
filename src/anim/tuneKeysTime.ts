/**
 * (marlow-bays item 23) Key timing (pure, Babylon-free, no imports): a key slid earlier or later in its clip.
 *
 * Times are bake frames: the bake keys at round(phase * 48) of a 48-frame span (key_clip.py `SPAN`), so a retimed key
 * lands on that grid exactly and its phase in the key file is frame / 48. The tuner stores a key's move as the slider
 * `time` (bake frames, + later) in the key's own group; this module turns the moves into key positions, clamps them and
 * maps a phase of the retimed clip to the phase of the baked clip (the live preview).
 *
 * Rules (`keyTimeSolve`):
 * - Keys never cross or coincide: they keep their order, at least one bake frame apart.
 * - The first key (phase 0: the cycle start, the left heel strike of a gait, the start of a one-shot) is fixed.
 * - The last key stays before the cycle end (the bake loops the first key at frame 48).
 * - A mirrored clip with its Mirror box on: only its own keys move, each mirrored key moves with its own key (the
 *   half-cycle relation kept), so an own key stays before the half cycle (the mirror of the first key at 24).
 *   Mirror off: every key on its own, in the full cycle.
 */

/** The bake's span (bake frames a cycle; key_clip.py `SPAN`). */
export const KEY_SPAN = 48;
/** The tuner slider of a key's move (bake frames, + later). */
export const KEY_TIME_ID = 'time';
/** The slider's range (the live clamp is tighter: `keyTimeSolve`). */
export const KEY_TIME_MAX = KEY_SPAN - 1;

/** What the timing needs of a clip: its own keys' phases (sorted, the first 0) and whether the bake mirrors them. */
export interface KeyTimeClip {
  readonly phases: readonly number[];
  readonly mirror: boolean;
}

/** Every key the bake poses (a mirrored clip: twice its own keys). */
export const keyTimeCount = (c: KeyTimeClip): number => (c.mirror ? c.phases.length * 2 : c.phases.length);

/** Key `k`'s baked position in bake frames (a mirrored-half key: its own key's plus half the span). */
export function keyBasePos(c: KeyTimeClip, k: number): number {
  const n = c.phases.length;
  const p = k < n ? c.phases[k]! : c.phases[k - n]! + 0.5;
  return Math.round(p * KEY_SPAN) % KEY_SPAN;
}

/** Whose `time` value moves key `k`: with the Mirror box on, a mirrored-half key's own key; else `k` itself. */
export function keyTimeOwner(c: KeyTimeClip, k: number, mirrorOn: boolean): number {
  const n = c.phases.length;
  return c.mirror && mirrorOn && k >= n ? k - n : k;
}

/**
 * The key positions (bake frames, every key the bake poses) from the moves `offs` (bake frames by key index; with the
 * Mirror box on a mirrored clip's second half is ignored), clamped by the rules above, into `out`. True when any key
 * sits off its baked position. A non-finite move counts as 0; a fractional one is rounded. No allocation.
 */
export function keyTimeSolve(c: KeyTimeClip, offs: ArrayLike<number>, mirrorOn: boolean, out: { [i: number]: number }): boolean {
  const n = c.phases.length;
  const linked = c.mirror && mirrorOn;
  const m = linked ? n : keyTimeCount(c);
  const U = linked ? KEY_SPAN / 2 : KEY_SPAN;
  let moved = false;
  for (let i = 0; i < m; i++) {
    const b = keyBasePos(c, i);
    let p = b;
    if (i > 0) {
      p = want(c, offs, i);
      // never past where the next key wants to be, room left for the keys after it, never onto the key before
      let hi = U - (m - i);
      if (i + 1 < m) hi = Math.min(hi, want(c, offs, i + 1) - 1);
      if (p > hi) p = hi;
      const lo = out[i - 1]! + 1;
      if (p < lo) p = lo;
    }
    out[i] = p;
    if (p !== b) moved = true;
  }
  if (linked) for (let i = 0; i < n; i++) out[n + i] = out[i]! + U;
  return moved;
}

/** Where key `i` (not the first) asks to be: its baked position plus its move (a non-finite move is 0, a fraction rounds). */
function want(c: KeyTimeClip, offs: ArrayLike<number>, i: number): number {
  const o = offs[i] ?? 0;
  return keyBasePos(c, i) + (Number.isFinite(o) ? Math.round(o) : 0);
}

export interface KeyRetimeRange {
  /** The key whose `time` value moves (`keyTimeOwner`). */
  owner: number;
  /** The owner's position now and its baked position (bake frames). */
  pos: number;
  base: number;
  /** The furthest the owner can move now: earliest and latest position (bake frames; both `pos` when fixed). */
  lo: number;
  hi: number;
  /** The first key (fixed). */
  fixed: boolean;
}

/** Where key `k` can move, given the solved positions `pos` (`keyTimeSolve`). */
export function keyRetimeRange(c: KeyTimeClip, pos: ArrayLike<number>, mirrorOn: boolean, k: number): KeyRetimeRange {
  const o = keyTimeOwner(c, k, mirrorOn);
  const linked = c.mirror && mirrorOn;
  const m = linked ? c.phases.length : keyTimeCount(c);
  const U = linked ? KEY_SPAN / 2 : KEY_SPAN;
  const p = pos[o]!;
  const base = keyBasePos(c, o);
  if (o === 0) return { owner: o, pos: p, base, lo: p, hi: p, fixed: true };
  const lo = pos[o - 1]! + 1;
  const hi = o === m - 1 ? U - 1 : pos[o + 1]! - 1;
  return { owner: o, pos: p, base, lo, hi, fixed: false };
}

/**
 * The phase of the baked clip to sample for `phase` of the retimed clip: piecewise linear between the keys (the key
 * positions `newPos` -> `oldPos`, bake frames, `n` keys in order, the first at 0; the cycle end maps to itself). At a
 * key exactly its baked pose; between keys the baked in-between stretched or squeezed. No allocation.
 */
export function keyWarpPhase(newPos: ArrayLike<number>, oldPos: ArrayLike<number>, n: number, phase: number): number {
  const x = (phase - Math.floor(phase)) * KEY_SPAN;
  let i = n - 1;
  for (let s = 1; s < n; s++) {
    if (newPos[s]! > x) {
      i = s - 1;
      break;
    }
  }
  const a = newPos[i]!;
  const b = i + 1 < n ? newPos[i + 1]! : KEY_SPAN;
  const oa = oldPos[i]!;
  const ob = i + 1 < n ? oldPos[i + 1]! : KEY_SPAN;
  const y = b > a ? oa + ((x - a) * (ob - oa)) / (b - a) : oa;
  return y / KEY_SPAN;
}

/**
 * The live key positions per clip name (bake frames, every key the bake poses), written by `tuneKeys` when a clip has a
 * timing edit; no entry: the clip's keys sit where they were baked. `keyTimeline.keyPhase` reads it.
 */
export const KEY_TIMES = new Map<string, Int16Array>();
