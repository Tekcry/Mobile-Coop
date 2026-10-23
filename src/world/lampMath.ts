/**
 * The one lamp formula (3.6, pure; bible 5.1): range falloff x cone, the same constants for gameplay (`LightField`),
 * the lamp volume's mix and the desktop's exact path (`bakedLamps.ts` builds its GLSL from `LAMP_MATH_GLSL` below,
 * so the two cannot drift). Baked lamps: the photometric falloff (`photoFalloff`, LR13; the only lamp model since
 * LR16a); flashlights: a linear range falloff (`lampTerm`). Both x a cosine cone (fixed lamps: the hemisphere below
 * them; spots: their beam, squared, cut at the outer angle). Gameplay adds intensity x baked visibility; rendering
 * adds colour x `LIGHT_GAIN` and N.L.
 */
import type { MapTheme } from './mapDef';

/** Fixed lamps without a cone light everything below them through this cone (rad). */
export const LAMP_CONE = Math.PI * 0.97;
/** ... as a cosine cut (the cone's half angle). */
export const LAMP_CONE_COS = Math.cos(LAMP_CONE / 2);
/** Cone exponents: a lamp's light falls off with the cosine from straight down; a spot's with its square. */
export const LAMP_EXP = 1;
export const SPOT_EXP = 2;
/**
 * (LR16b, Michael 2026-10-23 ~18:08 "the edge of lights should diffuse against walls/floors/etc unless something directly
 * cuts off the light ray"; ~18:20 guard torches "also need to be diffused and not so sharp") The cone's edge is a
 * smoothstep, not a step: the cone factor rises from 0 at the cut over this fraction of (1 - cos cut), then follows
 * the cosine. A feather in angle, so the soft band on a wall widens with its distance from the lamp. Fixed lamps
 * (`LAMP_EXP`): the hemisphere cut at cos 0.047 ramps to cos 0.428 (87.3 -> 64.6 degrees from straight down: a
 * fitting's housing; floor under a 3 m lamp keeps >= 0.94 of its light out to 6 m), so the cut meets a wall as a
 * gradient, not an arch. Spots and flashlights (`SPOT_EXP`): 0.65 puts the ramp's inner end at the torch's authored
 * inner angle (`TORCH`: outer 0.34, inner 0.2 rad: cos 0.943 -> 0.980).
 */
export const LAMP_FEATHER = 0.4;
export const SPOT_FEATHER = 0.65;
/** The feather of a cone with exponent `exp` (fixed lamps: `LAMP_FEATHER`, spots: `SPOT_FEATHER`). */
export function coneFeather(exp: number): number {
  return exp < 1.5 ? LAMP_FEATHER : SPOT_FEATHER;
}
/** Rendering only: map lights were Babylon lights at this x their gameplay intensity. */
export const LIGHT_GAIN = 1.6;
/**
 * Gameplay only: a lamp adds this x intensity x formula x visibility to the light level (3.6). With the shaders'
 * formula the bible's thresholds (`LIGHT` 0.28 / 0.6, L6) keep the most Warehouse floor in its 3.5 band at 1.2
 * (91.1%, against 85.6% at 1). The screen is unchanged; a level maps to `LIGHT_GAIN / LAMP_LEVEL_GAIN` on screen.
 */
export const LAMP_LEVEL_GAIN = 1.2;

/** Linear range falloff: 1 at the light, 0 at (and beyond) `r`. The flashlights' (`lampTerm`); baked lamps: `photoFalloff`. */
export function lampFalloff(d: number, r: number): number {
  return r <= 0 || d >= r ? 0 : 1 - d / r;
}

/**
 * (lightrev LR13; the only baked-lamp falloff since LR16a, Michael 2026-10-23 ~18:12 "Disable returning to original
 * lighting system, focus on only the one new system") Inverse square as a real fitting gives it, with a smooth near
 * term (LR16b): `(ref^2 + near^2) / (d^2 + near^2)` (1 at `ref`, as before; LR13's `ref^2 / max(d, near)^2` was a flat
 * 9x plateau inside 1 m with a kink at its rim, which turned the cone's step on a wall near a lamp into a hard bright
 * arch), windowed to 0 at the reach (glTF / Babylon `FALLOFF_GLTF`: `(1 - (d / R)^4)^2`). A lamp's
 * intensity is its level on axis at `ref` m, and its reach is its authored radius x `reach` (`lampReach`, applied once
 * when the registry adds a fixed light, so the bake boxes, the 2 m column lists, the field and the shaders all read the
 * same reach). Gameplay (`LightField.lampInto`) and the picture (`LAMP_MATH_GLSL`) run the same terms: light parity.
 * Flashlights and the unbaked path keep `lampTerm` (linear).
 */
export const PHOTO = { ref: 3, near: 1, reach: 1.6 } as const;
/** A fixed (baked) lamp's reach from its authored radius. */
export function lampReach(radius: number): number {
  return radius * PHOTO.reach;
}
/** Photometric falloff at distance `d` of a lamp of reach `r` (0 at and beyond it). */
export function photoFalloff(d: number, r: number): number {
  if (r <= 0 || d >= r) return 0;
  const q = (d * d) / (r * r);
  const w = 1 - q * q;
  return (PHOTO_NUM / (d * d + PHOTO_NEAR2)) * w * w;
}
/** `photoFalloff`'s numerator (`ref^2 + near^2`) and `near^2`. */
export const PHOTO_NUM = PHOTO.ref * PHOTO.ref + PHOTO.near * PHOTO.near;
export const PHOTO_NEAR2 = PHOTO.near * PHOTO.near;

/**
 * Cone factor from the cosine between the cone's axis and the direction to the point: 0 at and outside the cut, a
 * smoothstep over the feather band (`coneFeather`), times the cosine to the exponent. Continuous with a bounded
 * derivative (LR16b: no step).
 */
export function lampCone(cosA: number, cosCut: number, exp: number): number {
  if (cosA <= cosCut) return 0;
  const c = cosA > 1e-4 ? cosA : 1e-4;
  const p = exp === 1 ? c : exp === 2 ? c * c : Math.pow(c, exp);
  const band = coneFeather(exp) * (1 - cosCut);
  const t = band > 1e-6 ? (cosA - cosCut) / band : 1;
  return t >= 1 ? p : p * t * t * (3 - 2 * t);
}

/**
 * (LR16b) A baked lamp's falloff x cone towards offset (vx, vy, vz) (point - light): `photoFalloff` x `lampCone`, the
 * reference that `LightField.lampInto` writes out by hand and `LAMP_MATH_GLSL` runs. No intensity, visibility or N.L.
 */
export function photoTerm(vx: number, vy: number, vz: number, r: number, dx: number, dy: number, dz: number, cosCut: number, exp: number): number {
  if (vx > r || vx < -r || vy > r || vy < -r || vz > r || vz < -r) return 0;
  const d = Math.sqrt(vx * vx + vy * vy + vz * vz);
  const f = photoFalloff(d, r);
  if (f <= 0 || d < 1e-4) return f;
  return f * lampCone((vx * dx + vy * dy + vz * dz) / d, cosCut, exp);
}

/**
 * Falloff x cone of a light at the origin towards offset (vx, vy, vz) (point - light), reach `r`, cone axis
 * (dx, dy, dz) (unit), cut and exponent, with the linear falloff (flashlights). No intensity, visibility or N.L.
 * Allocation-free. (`LightField` writes the baked lamps' photometric version out by hand - a returned double would be
 * boxed there; change both together.)
 */
export function lampTerm(vx: number, vy: number, vz: number, r: number, dx: number, dy: number, dz: number, cosCut: number, exp: number): number {
  if (vx > r || vx < -r || vy > r || vy < -r || vz > r || vz < -r) return 0;
  const d = Math.sqrt(vx * vx + vy * vy + vz * vz);
  const f = lampFalloff(d, r);
  if (f <= 0) return f;
  // (at the light itself: full)
  if (d < 1e-4) return f;
  return f * lampCone((vx * dx + vy * dy + vz * dz) / d, cosCut, exp);
}

/** The cone of a light as the formula reads it: cone lights by their cone, others the lamp hemisphere. */
export function coneParams(cone: { dx: number; dy: number; dz: number; cosOuter: number } | null, out: Float64Array | number[]): void {
  if (cone) {
    out[0] = cone.dx;
    out[1] = cone.dy;
    out[2] = cone.dz;
    out[3] = cone.cosOuter;
    out[4] = SPOT_EXP;
  } else {
    out[0] = 0;
    out[1] = -1;
    out[2] = 0;
    out[3] = LAMP_CONE_COS;
    out[4] = LAMP_EXP;
  }
}

/**
 * The moon's gameplay share of a map's open-sky level (3.6): the theme's moon (sun) light against its sky fill, as
 * the screen balances them. Out in the open the level is `lightLevel` as before; in the moon's baked shadow it drops
 * by this much (a building's shadow in the yard hides you as well as it looks).
 */
export function moonLight(theme: Pick<MapTheme, 'lightLevel' | 'ambient' | 'sunIntensity'>): number {
  const level = theme.lightLevel ?? 0.75;
  const sum = theme.ambient + theme.sunIntensity;
  return sum > 0 ? (level * theme.sunIntensity) / sum : 0;
}

const glf = (v: number): string => (Number.isInteger(v) ? `${v}.0` : `${v}`);
/**
 * The baked lamps' formula in GLSL (`photoFalloff`, `lampCone`; names prefixed: Babylon's macros must not clash),
 * generated from the constants above (never typed twice; `tests/lampFalloff.test.ts` runs it against the TS). The guard
 * torches' draw (`shadowAccuracy.TORCH_DRAW_GLSL`) calls `nsLampCone` too.
 */
export const LAMP_MATH_GLSL = `
float nsLampFalloff(float d, float r) { float nsQ = d * d / (r * r); float nsW = max(0.0, 1.0 - nsQ * nsQ); return ${glf(PHOTO_NUM)} / (d * d + ${glf(PHOTO_NEAR2)}) * nsW * nsW; }
float nsLampCone(float ca, float cut, float e) { float nsB = (e < 1.5 ? ${glf(LAMP_FEATHER)} : ${glf(SPOT_FEATHER)}) * (1.0 - cut); float nsT = nsB > 1e-6 ? clamp((ca - cut) / nsB, 0.0, 1.0) : 1.0; return ca <= cut ? 0.0 : pow(max(ca, 1e-4), e) * nsT * nsT * (3.0 - 2.0 * nsT); }
`;
