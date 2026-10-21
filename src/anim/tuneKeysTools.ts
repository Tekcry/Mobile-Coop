/**
 * (marlow-bays item 30, track A) The Keys tab's key tools, pure and Babylon-free (no imports): Michael "was adjusting the
 * body to twist realistically while running but had to adjust each key manually". `tuneKeys.ts` applies them to the
 * registry (each tool one undo step: the panel settles the history before and after); they bake through the key sliders.
 * - Wave: one key field over every key, a smooth sine over the cycle: value(k) = amount * sin(2 pi (phase_k + timing)).
 * - Apply to keys: the shown key's value of one slider given to all keys or the ticked ones.
 * - Smooth between: the keys between two keys (going forward, wrapping) eased from one key's pose to the other's
 *   (smoothstep in time).
 * - Compare keys: the differences between two keys' poses in one line ("Right forearm twist +12°, Chest turn -3°").
 */

/** A key's wave value: `amount` x sin(2 pi (phase + timing)) (phase and timing in cycles). */
export function keyWaveValue(amount: number, phase: number, timing: number): number {
  const v = amount * Math.sin(2 * Math.PI * (phase + timing));
  // (exact zeros stay zeros: sin(pi) is 1e-16)
  return Math.abs(v) < 1e-9 ? 0 : v;
}

/** The eased blend weight: smoothstep of t (clamped to 0..1). */
export function keySmoothstep(t: number): number {
  const x = t <= 0 ? 0 : t >= 1 ? 1 : t;
  return x * x * (3 - 2 * x);
}

/**
 * The keys strictly between list positions `a` and `b` of a key list in phase order (`n` keys), going forward from `a`
 * (wrapping past the cycle end): their positions in order. a === b or neighbours: none.
 */
export function keysBetween(n: number, a: number, b: number): number[] {
  const out: number[] = [];
  if (n <= 0 || a === b || a < 0 || b < 0 || a >= n || b >= n) return out;
  for (let i = (a + 1) % n; i !== b; i = (i + 1) % n) out.push(i);
  return out;
}

/**
 * Smooth between: the weight (0 at key a, 1 at key b) of a key at phase `p` between keys at phases `pa` and `pb`
 * (cycles; b after a going forward, wrapping), eased.
 */
export function keySmoothWeight(pa: number, pb: number, p: number): number {
  let b = pb;
  let x = p;
  if (b <= pa) b += 1;
  if (x < pa) x += 1;
  return b > pa ? keySmoothstep((x - pa) / (b - pa)) : 0;
}

/** One slider in a compare line: its plain name and unit ('deg', 'cm' or ''). */
export interface KeyDiffField {
  readonly name: string;
  readonly unit: string;
}

/** The smallest difference a compare line shows per unit (deg, cm, plain). */
const DIFF_MIN: Readonly<Record<string, number>> = { deg: 0.5, cm: 0.1, '': 0.02 };

function diffText(v: number, unit: string): string {
  const r = unit === '' ? Math.round(v * 100) / 100 : Math.abs(v) >= 10 ? Math.round(v) : Math.round(v * 10) / 10;
  const s = `${r > 0 ? '+' : r < 0 ? '-' : ''}${Math.abs(r)}`;
  return unit === 'deg' ? `${s}°` : unit === 'cm' ? `${s} cm` : s;
}

/**
 * The compare line: the fields where key `a` differs from key `b` (a - b), the largest first (degrees and plain numbers
 * as they read; a cm counted as 2 degrees), at most `max` named and "+N more". None: `same`.
 */
export function keyDiffLine(fields: readonly KeyDiffField[], a: ArrayLike<number>, b: ArrayLike<number>, max = 4, same = 'Same pose'): string {
  const rows: { i: number; d: number; w: number }[] = [];
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i]!;
    const d = a[i]! - b[i]!;
    if (!Number.isFinite(d) || Math.abs(d) < (DIFF_MIN[f.unit] ?? 0.5)) continue;
    rows.push({ i, d, w: Math.abs(d) * (f.unit === 'cm' ? 2 : f.unit === '' ? 30 : 1) });
  }
  if (!rows.length) return same;
  rows.sort((x, y) => y.w - x.w || x.i - y.i);
  const shown = rows.slice(0, Math.max(1, max)).map((r) => `${fields[r.i]!.name} ${diffText(r.d, fields[r.i]!.unit)}`);
  const more = rows.length - shown.length;
  return more > 0 ? `${shown.join(', ')} (+${more} more)` : shown.join(', ');
}
