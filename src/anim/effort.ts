/**
 * (locomotion step 22, D5.1, A88) The effort curve (pure, allocation-free): a pace (m/s) read as an effort by its
 * place between the stance's speed gear caps (`GEARS`), returned as the pace at the same place between the caps the
 * gait clips were authored at (`GAIT_REF`). The graph poses the gait (clip mix, pelvis, lean, arm swing) at the
 * effort pace; the stride length and the gait clock stay on the real pace, so the feet still match the capsule.
 * Under gear 1 and over gear 6 the ratio of the end caps applies.
 */
import { GAIT_REF, GEARS } from '../config/movement';

function mapCaps(speed: number, caps: readonly number[], ref: readonly number[]): number {
  if (!(speed > 0)) return 0;
  const n = caps.length;
  if (speed <= caps[0]!) return speed * (ref[0]! / caps[0]!);
  for (let g = 1; g < n; g++) {
    const b = caps[g]!;
    if (speed <= b) {
      const a = caps[g - 1]!;
      const k = (speed - a) / (b - a);
      return ref[g - 1]! + (ref[g]! - ref[g - 1]!) * k;
    }
  }
  return speed * (ref[n - 1]! / caps[n - 1]!);
}

/** The effort pace (m/s, in `GAIT_REF` units) of a real pace in a stance. */
export function effortSpeed(speed: number, crouched: boolean): number {
  return crouched ? mapCaps(speed, GEARS.crouch, GAIT_REF.crouch) : mapCaps(speed, GEARS.stand, GAIT_REF.stand);
}

/** Effort 0..1 of a real pace in a stance: 0 standing still, 1 at the stance's top gear (the sprint standing). */
export function effortLevel(speed: number, crouched: boolean): number {
  const top = crouched ? GAIT_REF.crouch[GAIT_REF.crouch.length - 1]! : GAIT_REF.stand[GAIT_REF.stand.length - 1]!;
  return Math.max(0, Math.min(1, effortSpeed(speed, crouched) / top));
}
