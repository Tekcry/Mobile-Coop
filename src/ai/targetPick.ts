/**
 * (guard-ai S23) Co-op perception: which player a guard perceives as his target (pure: no Babylon / DOM), unit-tested.
 *
 * Each think a guard looks at every live player (`Enemy.perceive`, at most `MAX_INTRUDERS`): `mayBeSeen` says, without
 * a ray, when a player cannot be seen at all (a calm guard casts nothing for him), and `pickTarget` picks the one he
 * perceives: calm, the best seen (the highest sight rate); in combat, the one he is fighting while he still sees him.
 * A143 / A144: one meter per guard, filled at the chosen player's rate (two in view do not add up).
 */
import { fieldFactor, motionFactor, PERCEPTION } from './perception';

/** Up to this many players are perceived (= MAX_PLAYERS in src/net/protocol.ts; src/ai must not import src/net). */
export const MAX_INTRUDERS = 2;

/** `all` false: the nearest player only (today). `sticky` false: in combat the best-seen player each think. */
export const TARGETS = { all: true, sticky: true } as const;

/**
 * (guard-ai polish C1, A169) A calm guard keeps the player he perceives (`cur`, alive and seen: rate > 0) until another
 * player's sight rate beats his by this factor (1.25: 25% more), so two players in view at near-equal rates do not swap
 * his target every think. A separate const so `TARGETS`' shape stays. Undo: `CALM_KEEP = 1` (the highest rate each
 * think, ties the nearer, as before).
 */
export const CALM_KEEP = 1.25;

/** `fieldFactor`'s range out (one call at a time; nothing allocated per call). */
const rangeOut = [0];

/**
 * Could `sightRate` be above 0 for this player (no rays needed to say no)? Mirrors sightRate's two terms exactly:
 * inside the field (fieldFactor(angle) > 0 and dist < its range) or felt close by (dist < closeRange, speed > 0.15;
 * outside the field only at a pace sightRate feels from behind, motion > 0.8). Alerted guards and dogs always pass
 * (combat sight is the rays alone; dogs smell).
 */
export function mayBeSeen(dist: number, angle: number, speed: number, alerted: boolean, dog: boolean): boolean {
  if (alerted || dog) return true;
  const field = fieldFactor(angle, rangeOut);
  if (field > 0 && dist < rangeOut[0]!) return true;
  return dist < PERCEPTION.closeRange && speed > 0.15 && (field > 0 || motionFactor(speed) > 0.8);
}

/** Index of the nearest live player (`dist` finite), -1 none; ties: the lower index. `TARGETS.all` false. */
export function nearestTarget(n: number, dist: Float64Array): number {
  let k = -1;
  for (let i = 0; i < n; i++) {
    const d = dist[i]!;
    if (d < Infinity && (k < 0 || d < dist[k]!)) k = i;
  }
  return k;
}

/** Player `i` is in the list and alive. */
function live(i: number, n: number, dist: Float64Array): boolean {
  return i >= 0 && i < n && dist[i]! < Infinity;
}

/**
 * Index of the player to perceive as the target, -1 none. `n` players; `dist` Infinity = dead / skipped.
 * Calm (not alerted): the highest `rate` (> 0), but `cur` (alive, rate > 0) is kept unless the best beats his rate by
 * `CALM_KEEP` (A169); none seen: the nearest. Alerted: `cur` while `los[cur]`; else the nearest with `los`; else `hunt`
 * (S24 passes his intruder's index; S23 passes -1) when alive; else `cur` when alive; else the nearest. Ties: the
 * nearer, then the lower index. No allocation.
 */
export function pickTarget(n: number, alerted: boolean, cur: number, hunt: number, los: Uint8Array, rate: Float64Array, dist: Float64Array): number {
  if (!alerted) {
    let k = -1;
    for (let i = 0; i < n; i++) {
      const d = dist[i]!;
      const r = rate[i]!;
      if (!(d < Infinity) || !(r > 0)) continue;
      if (k < 0 || r > rate[k]! || (r === rate[k]! && d < dist[k]!)) k = i;
    }
    // (A169) hysteresis: his current target stays until another is clearly better seen
    if (k >= 0 && k !== cur && CALM_KEEP > 1 && live(cur, n, dist) && rate[cur]! > 0 && !(rate[k]! > rate[cur]! * CALM_KEEP)) return cur;
    return k >= 0 ? k : nearestTarget(n, dist);
  }
  if (live(cur, n, dist) && los[cur]) return cur;
  let k = -1;
  for (let i = 0; i < n; i++) {
    const d = dist[i]!;
    if (d < Infinity && los[i] && (k < 0 || d < dist[k]!)) k = i;
  }
  if (k >= 0) return k;
  if (live(hunt, n, dist)) return hunt;
  if (live(cur, n, dist)) return cur;
  return nearestTarget(n, dist);
}

/**
 * (coop4 AI2, A181) The sight-ray budget per guard per think: `perceive` starts a player's rays (3 calm: chest, head,
 * hips; 2 alerted: chest, head; 0 when `mayBeSeen` says no) only while the think's total stays <= `maxRays`. Only at
 * `COOP4.from` (3) players or more; 1-2 players cost at most 6 and walk the list in index order as before. 4 alerted
 * players cost 8 (never capped); 4 calm in one field: 3 started per think, the one who waits rotates. Undo: `maxRays:
 * Infinity`.
 */
export const PERCEIVE: { readonly maxRays: number } = { maxRays: 9 };

/**
 * (coop4 AI2) The order `perceive` starts players in under the ray budget: `cur` (the one he perceives now), then
 * `hunt` (his intruder's player), then every other live player nearest first (ties: the lower index), that tail
 * rotated left by `rr` (the guard's think counter) so a different one waits each think. Dead players (`dist`
 * Infinity) are left out; `cur` / `hunt` out of range or dead are skipped. Writes indices into `out` and returns how
 * many. No allocation (insertion sort and an in-place rotation over at most `MAX_INTRUDERS`).
 */
export function perceiveOrder(n: number, cur: number, hunt: number, dist: Float64Array, rr: number, out: Int8Array): number {
  let m = 0;
  if (live(cur, n, dist)) out[m++] = cur;
  if (hunt !== cur && live(hunt, n, dist)) out[m++] = hunt;
  const head = m;
  for (let i = 0; i < n; i++) {
    if (i === cur || i === hunt) continue;
    const d = dist[i]!;
    if (!(d < Infinity)) continue;
    // insertion by distance (stable: an equal distance stays after the lower index)
    let j = m;
    while (j > head && dist[out[j - 1]!]! > d) {
      out[j] = out[j - 1]!;
      j--;
    }
    out[j] = i;
    m++;
  }
  const tail = m - head;
  const r = tail > 1 ? ((rr % tail) + tail) % tail : 0;
  if (r > 0) {
    // rotate out[head..m) left by r: three reversals
    reverse(out, head, head + r - 1);
    reverse(out, head + r, m - 1);
    reverse(out, head, m - 1);
  }
  return m;
}

function reverse(a: Int8Array, lo: number, hi: number): void {
  while (lo < hi) {
    const t = a[lo]!;
    a[lo] = a[hi]!;
    a[hi] = t;
    lo++;
    hi--;
  }
}
