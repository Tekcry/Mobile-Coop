/**
 * Bodies (pure maths), unit-tested: how readily an enemy notices a downed body. A body in a lamp pool is
 * seen from far off; one dragged into shadow is only found by someone almost tripping over it (Blacklist:
 * hide bodies in the dark). Non-lethal victims wake only when found.
 */
import { fieldFactor, lightFactor } from './perception';

export const BODY = {
  /** Furthest a body can be noticed (m). */
  range: 20,
  /** Closer than this a body is found whatever the light (m). */
  close: 2.5,
  /** Notice score needed (checked at each think with line of sight). */
  threshold: 0.12,
  /** Bodies kept in the world (oldest found / hidden ones go first). */
  max: 12,
  /** Seconds a finder spends reviving a knocked-out victim. */
  reviveTime: 3,
  /** Carrying: speed cap (m/s). */
  carrySpeed: 2.2,
  /** Interact reach to pick a body up (m). */
  reach: 1.4,
} as const;

const rangeOut = [0];

/**
 * How noticeable a body is: field of view x light x distance falloff; >= `BODY.threshold` means noticed
 * (given line of sight). Within `BODY.close` it is always noticed.
 */
export function bodyNotice(dist: number, angle: number, light: number): number {
  if (dist >= BODY.range) return 0;
  if (dist < BODY.close) return 1;
  const field = fieldFactor(angle, rangeOut);
  if (field <= 0 || dist >= rangeOut[0]!) return 0;
  return field * lightFactor(light) * Math.pow(1 - dist / BODY.range, 1.2);
}

export function bodyNoticed(dist: number, angle: number, light: number): boolean {
  return bodyNotice(dist, angle, light) >= BODY.threshold;
}
