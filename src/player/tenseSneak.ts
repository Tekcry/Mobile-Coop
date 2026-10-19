/**
 * (CT prototype G1, audit row 26, G160) Is there an unaware guard close by? The tense sneak's trigger (pure, Babylon-free).
 *
 * The game registers one source (`setTenseSource`): the living, unaware takedown victims (the host's guards, or a co-op
 * client's puppets of them), so the local player and every remote copy ask the same question of the same guards (co-op
 * parity with no wire change). Gameplay reads occupancy only: guard positions and their alert state.
 */
import { TENSE } from '../config/movement';

export interface TenseGuard {
  readonly pos: { readonly x: number; readonly z: number };
  readonly alive: boolean;
  readonly alerted: boolean;
}

let source: (() => readonly TenseGuard[]) | null = null;

/** Register (or clear, `null`) the guard list the tense sneak reads. */
export function setTenseSource(fn: (() => readonly TenseGuard[]) | null): void {
  source = fn;
}

/** A living, unaware guard within `radius` (m, horizontal) of (x, z) in `guards` (allocation-free). */
export function unawareGuardNear(guards: readonly TenseGuard[], x: number, z: number, radius: number = TENSE.radius): boolean {
  const r2 = radius * radius;
  for (let k = 0; k < guards.length; k++) {
    const g = guards[k]!;
    if (!g.alive || g.alerted) continue;
    const dx = g.pos.x - x;
    const dz = g.pos.z - z;
    if (dx * dx + dz * dz < r2) return true;
  }
  return false;
}

/** The registered guards: an unaware one within TENSE.radius of (x, z). */
export function tenseNear(x: number, z: number): boolean {
  return source ? unawareGuardNear(source(), x, z) : false;
}
