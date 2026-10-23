/**
 * Marlow Yard light targets (marlow-final, LIGHTING-PLAN.md section 2; pure, Babylon-free).
 *
 * The facility is lit by default and the players cut the light (BRIEF M6). These are the targets in the light field's
 * own units (`LightField.bodyLevel`: ambient grid + lamps x `LAMP_LEVEL_GAIN` x formula x baked visibility), read
 * against the meter's thresholds (`LIGHT.shadow` 0.28, `LIGHT.lit` 0.6, bible L6), the course's dark drill band
 * (`COURSE_DARK` 0.25), the perception floor (`visibilityFromLight` is flat below `LIGHT.shadow` x 0.5 = 0.14) and the
 * guards' torch rule (`TORCH_DARK` 0.35). Every number here is a design target the per-set light tests assert; none is a
 * tuning table the game reads at run time.
 *
 * Design-time helpers (`lampLevel`, `poolIntensity`, `coveRow`, `spillsPast`, `lampsPerColumn`) estimate a lamp
 * layout before the bake; the bake test is the authority. The per-query helpers are allocation-free.
 */
import { LAMP_CONE_COS, LAMP_EXP, LAMP_LEVEL_GAIN, lampTerm } from '../lampMath';
import { LIGHT } from '../lights';

/** The light levels the plan designs to (light-field units, a standing body's `bodyLevel` unless said). */
export const MARLOW_LEVEL = {
  /** A set's standby fill (`ambientZone` per set): the facility's maintained emergency and standby lighting. Equal to
   *  the perception floor (`LIGHT.shadow` x 0.5): below it a body is no harder to see, above it slightly easier. */
  standby: 0.14,
  /** The lounge, holding rooms and cash dock (the theme's `lightLevel`, G225). */
  house: 0.3,
  /** Most a body may read inside a cut circuit's area (circuit off, every other circuit as at the set's start):
   *  under `COURSE_DARK` 0.25 and the meter's 0.28 shadow line, with 0.04 for spill from neighbouring circuits. */
  cutMax: 0.24,
  /** Most a crouched body may read in a permanent dark pocket (mixed zone, vantage pocket). */
  pocketMax: 0.22,
  /** Least a standing body reads on a set's lit walkable floor at its start (mid band: surfaces read, L5 0.40). */
  readMin: 0.4,
  /** Least a standing body reads at the centre of a lit pool a route must cross (the meter's lit band). */
  poolMin: LIGHT.lit,
  /** An investigating guard takes his torch where the static light at his head is below this (`TORCH_DARK`,
   *  archetypes.ts): a lure into a cut circuit brings a torch, one into a lit room does not. */
  torchDark: 0.35,
} as const;

/** Body sample heights `LightField.bodyLevel` uses for a standing operator (height 1.7): chest 0.6, head 0.95. */
export const BODY_HEIGHT = 1.7;
export const CHEST_Y = BODY_HEIGHT * 0.6;
export const HEAD_Y = BODY_HEIGHT * 0.95;

/** The meter band a level falls in (as `darkCurve.ts` `bandOf`). */
export function meterBand(level: number): 'dark' | 'mid' | 'lit' {
  return level < LIGHT.shadow ? 'dark' : level < LIGHT.lit ? 'mid' : 'lit';
}

/** A fixed downward lamp (no cone) for the estimates: position, radius, intensity. */
export interface LampSpec {
  x: number;
  y: number;
  z: number;
  radius: number;
  intensity: number;
}

/** One downward lamp's gameplay term at a point, visibility 1 (the open-room estimate). Allocation-free. */
export function lampLevel(l: LampSpec, x: number, y: number, z: number): number {
  return LAMP_LEVEL_GAIN * l.intensity * lampTerm(x - l.x, y - l.y, z - l.z, l.radius, 0, -1, 0, LAMP_CONE_COS, LAMP_EXP);
}

/** Estimated standing-body level at a plan point: ambient + every lamp at the brighter of chest and head, visibility 1.
 *  Allocation-free. */
export function bodyEstimate(lamps: readonly LampSpec[], ambient: number, x: number, floorY: number, z: number): number {
  let chest = ambient;
  let head = ambient;
  for (let i = 0; i < lamps.length; i++) {
    const l = lamps[i]!;
    chest += lampLevel(l, x, floorY + CHEST_Y, z);
    head += lampLevel(l, x, floorY + HEAD_Y, z);
  }
  const v = chest > head ? chest : head;
  return v > 1 ? 1 : v;
}

/**
 * The intensity a single lamp at `drop` metres above a standing head needs for a body straight under it to read
 * `target` on `ambient` fill (the pool's centre, visibility 1). Infinity when the radius does not reach the head.
 */
export function poolIntensity(target: number, ambient: number, drop: number, radius: number): number {
  const f = radius > 0 && drop < radius ? 1 - drop / radius : 0;
  if (f <= 0) return Infinity;
  return Math.max(0, target - ambient) / (LAMP_LEVEL_GAIN * f);
}

/**
 * A cove or slot row: lamp centres along (x0, z0) -> (x1, z1) at most `spacing` apart, inset half a gap from each end
 * (the kit's `ledSlot` places one lamp per <= 2.4 m segment the same way). Build time only.
 */
export function coveRow(x0: number, z0: number, x1: number, z1: number, spacing: number): [number, number][] {
  const len = Math.sqrt((x1 - x0) * (x1 - x0) + (z1 - z0) * (z1 - z0));
  const n = Math.max(1, Math.ceil(len / spacing - 1e-6));
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    out.push([x0 + (x1 - x0) * t, z0 + (z1 - z0) * t]);
  }
  return out;
}

/**
 * Does a lamp's light cross a vertical plane (`axis` x or z at `at`) onto the far side? The gallery rule: a lamp behind
 * a glazing plane that passes light (the kit's collision-only glass is out of the light shapes, G45) must stop short of
 * it, so no gallery light reaches a set and no set light reaches the gallery, in the bake and the picture alike.
 * `margin` keeps the falloff's zero that far before the plane.
 */
export function spillsPast(l: LampSpec, axis: 'x' | 'z', at: number, margin = 0.3): boolean {
  const d = Math.abs((axis === 'x' ? l.x : l.z) - at);
  return l.radius + margin > d;
}

/**
 * Most lamps whose plan reach touches one `grid`-metre bake column over the box [x0, z0, x1, z1] (the downward-lamp
 * case of `lampBake.ts` `lampColumnDist`: plan reach = radius). The shaders hold `LAMP_GRID_SLOTS` 8 per column; the
 * plan keeps every set at 8 or fewer before the bake test (`lampGridLossless.test.ts`) checks the real grid.
 */
export function lampsPerColumn(lamps: readonly LampSpec[], box: readonly [number, number, number, number], grid = 2): number {
  let worst = 0;
  for (let cx = Math.floor(box[0] / grid) * grid; cx < box[2]; cx += grid) {
    for (let cz = Math.floor(box[1] / grid) * grid; cz < box[3]; cz += grid) {
      let n = 0;
      for (let i = 0; i < lamps.length; i++) {
        const l = lamps[i]!;
        const dx = Math.max(cx - l.x, 0, l.x - (cx + grid));
        const dz = Math.max(cz - l.z, 0, l.z - (cz + grid));
        if (Math.sqrt(dx * dx + dz * dz) < l.radius) n++;
      }
      if (n > worst) worst = n;
    }
  }
  return worst;
}
