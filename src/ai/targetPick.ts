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
export const MAX_INTRUDERS = 4;

/** `all` false: the nearest player only (today). `sticky` false: in combat the best-seen player each think. */
export const TARGETS = { all: true, sticky: true } as const;

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
 * Calm (not alerted): the highest `rate` (> 0); none: the nearest. Alerted: `cur` while `los[cur]`; else the nearest
 * with `los`; else `hunt` (S24 passes his intruder's index; S23 passes -1) when alive; else `cur` when alive; else the
 * nearest. Ties: the nearer, then the lower index. No allocation.
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
