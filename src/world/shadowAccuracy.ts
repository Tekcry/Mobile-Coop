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
 * - a body's light for the guards (`EnemyManager`) tests the flashlights against static geometry, as the player's does;
 * - (LR15) each baked lamp tests 8 doors, not 4 (`lightField.lampDoorSlots`: a second door texel in the shaders);
 * - (LR15) the flashlights without a shadow map are drawn by the baked lamps' shader with the light field's own formula
 *   (`lampMath.lampTerm`: linear falloff over the torch's radius, cos^2 cone) x a cut at the beam's reach
 *   (`torchDrawTerm`), not as Babylon lights whose range is the reach (the beam dimmed towards the wall it lands on).
 */
import { LAMP_CONE_COS, LAMP_EXP, lampFalloffMode, lampTerm, LIGHT_GAIN, SPOT_EXP, type LampFalloff } from './lampMath';
import { hyp3 } from '../core/mathx';

let override: boolean | null = null;

/** Force the fixes on or off (`null`: follow the LR13 falloff toggle). Tests and the boot code. */
export function setShadowAccuracy(on: boolean | null): void {
  override = on;
}

/** The match's switch from its resolved falloff (`lampMath.matchLampFalloff`: host, URL, setting): on exactly in
 *  Realistic. `GameState.create` sets it with `setLampFalloff`, before the map builds; never mid-match. */
export function matchShadowAccuracy(mode: LampFalloff): boolean {
  return mode === 'photometric';
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

/** (LR15) Flashlights the baked lamps' shader can draw itself (`torches.FLASHLIGHTS`). */
export const TORCH_DRAW_SLOTS = 4;
/** Floats per drawn torch (three vec4): position + cut (the beam's reach; 0: slot empty), axis + cos cut, colour x
 *  intensity x `LIGHT_GAIN` + radius. */
export const TORCH_DRAW_STRIDE = 12;
/** The cut ramps to 0 over this much (m) before the reach: past the wall the beam lands on (`beamReach` adds 0.4 m). */
export const TORCH_CUT_SOFT = 0.2;

/** A flashlight as `writeTorchDraw` / `torchDrawTerm` read it (`LightDef` fits). */
export interface DrawTorch {
  x: number;
  y: number;
  z: number;
  radius: number;
  intensity: number;
  color: readonly number[];
  cone?: { dx: number; dy: number; dz: number; cosOuter: number } | null;
  /** Rendering only: where the beam stops at a wall (`torches.beamReach`); the radius when unset. */
  reach?: number;
}

/** The beam's cut at distance `d` (1 inside the reach, 0 past it, a short ramp before it). */
export function torchCut(d: number, cut: number): number {
  if (d >= cut) return 0;
  const t = (cut - d) / TORCH_CUT_SOFT;
  return t >= 1 ? 1 : t;
}

/**
 * A drawn torch's light at a point, without colour and N.L: the light field's per-torch term (`lampMath.lampTerm` over
 * the torch's radius, as `LightField.dynamicInto` sums it) x the cut at its beam's reach. What `TORCH_DRAW_GLSL` draws.
 * Allocation-free.
 */
export function torchDrawTerm(l: DrawTorch, x: number, y: number, z: number): number {
  const c = l.cone;
  const vx = x - l.x;
  const vy = y - l.y;
  const vz = z - l.z;
  const t = lampTerm(vx, vy, vz, l.radius, c ? c.dx : 0, c ? c.dy : -1, c ? c.dz : 0, c ? c.cosOuter : LAMP_CONE_COS, c ? SPOT_EXP : LAMP_EXP);
  if (t <= 0) return 0;
  return t * torchCut(hyp3(vx, vy, vz), Math.min(l.reach ?? l.radius, l.radius));
}

/** Write torch slot `slot` of the shader's torch uniforms (`null`, off or shot out: the slot empty). Allocation-free. */
export function writeTorchDraw(out: Float32Array, slot: number, l: (DrawTorch & { on?: boolean; destroyed?: boolean }) | null): void {
  const o = slot * TORCH_DRAW_STRIDE;
  if (!l || l.on === false || l.destroyed) {
    for (let k = 0; k < TORCH_DRAW_STRIDE; k++) out[o + k] = 0;
    return;
  }
  const c = l.cone;
  out[o] = l.x;
  out[o + 1] = l.y;
  out[o + 2] = l.z;
  out[o + 3] = Math.min(l.reach ?? l.radius, l.radius);
  out[o + 4] = c ? c.dx : 0;
  out[o + 5] = c ? c.dy : -1;
  out[o + 6] = c ? c.dz : 0;
  out[o + 7] = c ? c.cosOuter : LAMP_CONE_COS;
  const k = l.intensity * LIGHT_GAIN;
  out[o + 8] = (l.color[0] ?? 0) * k;
  out[o + 9] = (l.color[1] ?? 0) * k;
  out[o + 10] = (l.color[2] ?? 0) * k;
  out[o + 11] = l.radius;
}

/**
 * `torchDrawTerm` in GLSL x colour x N.L, summed over the slots (uniform `lampTorch`, three vec4 a slot). The torch's
 * falloff is the linear `lampTerm` in either LR13 mode (the photometric falloff is the baked lamps' only), its cone
 * cos^2 cut at the outer angle (flashlights are cone lights: `SPOT_EXP`; a cone-less light is never drawn here).
 */
export const TORCH_DRAW_GLSL = `
vec3 nsTorches(vec3 p, vec3 n) {
  vec3 s = vec3(0.0);
  for (int c = 0; c < ${TORCH_DRAW_SLOTS}; c++) {
    vec4 ta = lampTorch[c * 3];
    if (ta.w <= 0.0) continue;
    vec4 tc = lampTorch[c * 3 + 2];
    vec3 L = ta.xyz - p;
    float d = length(L);
    if (d >= ta.w || d >= tc.w) continue;
    L /= max(d, 1e-4);
    vec4 tb = lampTorch[c * 3 + 1];
    float ca = d < 1e-4 ? 1.0 : dot(-L, tb.xyz);
    if (ca < tb.w) continue;
    float ndl = dot(n, L);
    if (ndl <= 0.0) continue;
    ca = max(ca, 1e-4);
    s += tc.rgb * ((1.0 - d / tc.w) * ca * ca * min(1.0, (ta.w - d) / ${TORCH_CUT_SOFT.toFixed(2)}) * ndl);
  }
  return s;
}
`;
