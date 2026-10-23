/**
 * (sector-redesign shadow audit, Michael 2026-10-23 ~14:45; PROTOTYPE, default off) The shadow-accuracy fixes ride the
 * LR13 toggle: on when the baked lamps run the photometric falloff (`lampMath.lampFalloffMode`), unless a test or the
 * boot code sets it explicitly. Read once when a light field, the baked lamps or the light rig is built (like the falloff
 * mode): set it before a map builds. Findings and numbers: `docs/sector-redesign/checks/shadow-audit.md`.
 *
 * What it switches (light parity, bible 5.1: the picture, the meter and guard perception agree):
 * - the ambient fill is read trilinearly by the light field, as the shaders' bilinear `lampAmb` texture reads it
 *   (`LightField`; today the field takes the nearest 1 m cell);
 * - each baked lamp's door list skips the doors whose leaf the lamp cannot see (`lampDoorLists` with a bake sampler), so
 *   the `DOORS_PER_LAMP` slots go to the doors that can cut its light (field and shaders build the one list);
 * - the game's PBR materials (the operator figures, weapons) take the flashlights with the game's range falloff and
 *   cosine cone (`gameLightFalloff`), not Babylon's inverse square and Gaussian cone, which ignore the range;
 * - the light rig gives its shadow maps to the flashlights whose beam a wall cuts first (`torchShadowOrder`);
 * - a body's light for the guards (`EnemyManager`) tests the flashlights against static geometry, as the player's does.
 */
import { lampFalloffMode } from './lampMath';

let override: boolean | null = null;

/** Force the fixes on or off (`null`: follow the LR13 falloff toggle). Tests and the boot code. */
export function setShadowAccuracy(on: boolean | null): void {
  override = on;
}

/** Are the shadow-accuracy fixes on? */
export function shadowAccuracyOn(): boolean {
  return override ?? lampFalloffMode() === 'photometric';
}

/** A material as `gameLightFalloff` reads it (Babylon's PBR materials have the flag; standard materials do not). */
export interface FalloffMaterial {
  usePhysicalLightFalloff?: boolean;
}

/**
 * The game's PBR materials take the real lights (the flashlights) with the light field's falloff: Babylon's standard
 * range falloff `1 - d / range` and cosine cone (`lampMath`), not its default inverse square and Gaussian cone, which
 * ignore the range (so the beam-reach cut never applied to them). True when it changed the material (the caller
 * unfreezes it). Level, voxel, prop and door materials already set it; the operator figures and weapons did not.
 */
export function gameLightFalloff(m: FalloffMaterial, on = shadowAccuracyOn()): boolean {
  if (!on || m.usePhysicalLightFalloff !== true) return false;
  m.usePhysicalLightFalloff = false;
  return true;
}

/** A light as `torchShadowPass` reads it. */
export interface PoolLight {
  kind: string;
  radius: number;
  reach?: number;
}

/**
 * Which pass of the light rig's shadow-map pick a moving light belongs to (lower first, nearest first within a pass).
 * Today: flashlights (0), then the rest (1). With the fixes on: flashlights whose beam a wall cuts short (`reach` under
 * the radius: only a shadow map stops their light at the wall without shortening the falloff) (0), the other
 * flashlights (1), the rest (2). An unshadowed light keeps its range at `reach`.
 */
export function torchShadowPass(l: PoolLight, on = shadowAccuracyOn()): number {
  if (l.kind !== 'flashlight') return on ? 2 : 1;
  if (!on) return 0;
  return l.reach !== undefined && l.reach < l.radius - 0.01 ? 0 : 1;
}

/** One static-geometry ray: the distance from a to b before something stops it (b's distance when nothing does). */
export type StaticHit = (ax: number, ay: number, az: number, bx: number, by: number, bz: number) => number;

/**
 * A light-field occluder (`Occluder`) from one static ray, as `GameState.lightOccluder` tests the player's light: the
 * ray from the light stops 0.25 m short of the point (the body's own volume never counts). For the guards' body-light
 * samples, so a flashlight behind a wall does not light a body for them.
 */
export function rayOccluder(hit: StaticHit): (l: { x: number; y: number; z: number }, x: number, y: number, z: number) => boolean {
  return (l, x, y, z) => {
    const dx = x - l.x;
    const dy = y - l.y;
    const dz = z - l.z;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d < 0.3) return false;
    const k = (d - 0.25) / d;
    return hit(l.x, l.y, l.z, l.x + dx * k, l.y + dy * k, l.z + dz * k) < d - 0.25 - 1e-4;
  };
}
