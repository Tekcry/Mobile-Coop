/**
 * Night vision's built-in IR illuminator (nv-illuminator; pure, picture only - gameplay never reads it).
 *
 * Michael (2026-10-27, the storm mill after the EMP): "night vision doesnt work at all in the piano map, i cant see
 * anything". Night vision is a gain (`VISION_GAIN`, the tube's auto-gain): with no light at all there is nothing to
 * amplify. Real goggles carry an infrared lamp for that: a soft beam from the wearer's head, invisible to the eye.
 *
 * Here it is a term in the lit materials' shader (`LampPlugin`, `bakedLamps.ts`), never a scene light: a soft cone from
 * the local operator's head along the camera's view, a wide dim fill round it and a low flat floor, added to the pixel's
 * static light as if it were a static light of level `nvIllumLevel(...)`, so it goes through the same darkness curve
 * and night-vision gain and reads like a dim lamp under the goggles. It fades out where the baked light is already
 * lit (`litFrom` .. `litTo`), so lamp pools keep their look, and is zero with the goggles off.
 *
 * Picture only: the light field, the bake, the light meter, guard perception and the wire never see it (they never read
 * the shader; `tests/nvIlluminator.test.ts` checks the sources). Local only: the origin and direction are the local
 * camera's and operator's, set per render frame by `GameState`; a partner's goggles light only their own picture.
 * Not on `?gfx=min` (no baked lamps, no plugin: night vision there is the post lift).
 *
 * Cost: one branch on a uniform per lit pixel, and while night vision is on about 30 ALU ops (a length, three dots,
 * five smoothsteps); no texture, no target, no pass. CPU: one direction from the camera per frame, no allocation.
 *
 * GLSL mirror: `ILLUM_GLSL` (the `NV_GLSL` pattern).
 */
export const NV_ILLUM = {
  /** The beam's level at its centre, near the head (a gameplay light level: 0.12 is a dark room, 0.4 mid, 0.7 lit). */
  peak: 0.16,
  /** Reach (m): the beam fades out by here, (1 - (d / reach)^2)^2 - about half at 7 m, a quarter at 10 m. */
  reach: 14,
  /** The beam starts this far from the head (m): nothing on the operator's own body, full from `nearTo`. */
  nearFrom: 0.3,
  nearTo: 1.0,
  /** The bright centre: full inside `coneIn` (cosine of the angle off the view axis), the wide fill outside `coneOut`. */
  coneIn: Math.cos((12 * Math.PI) / 180),
  coneOut: Math.cos((35 * Math.PI) / 180),
  /** The wide fill round the centre, as a share of the peak (covers the whole screen) ... */
  wide: 0.4,
  /** ... out to `edgeIn` off the axis, gone by `edgeOut` (behind the head: nothing). */
  edgeIn: Math.cos((70 * Math.PI) / 180),
  edgeOut: Math.cos((88 * Math.PI) / 180),
  /** A low flat floor of light (level) everywhere within `floorReach` (m), cone or not: shapes always read. */
  floor: 0.025,
  floorReach: 30,
  /** Wrapped N.L: a face at grazing angles (a floor ahead) still catches some (0: plain N.L). */
  wrap: 0.5,
  /** The baked light's level where the illuminator starts to fade, and where it is gone (lit areas keep their look). */
  litFrom: 0.08,
  litTo: 0.35,
  /** The origin: this far ahead of the operator's eye along the view (m). */
  headFwd: 0.15,
} as const;

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** The beam's distance falloff 0..1 at `d` m (soft window, 0 at `reach`; the near cut separate). */
export function illumFalloff(d: number): number {
  const q = Math.min(1, Math.max(0, d / NV_ILLUM.reach));
  const w = 1 - q * q;
  return w * w;
}

/** The near cut 0..1: nothing within `nearFrom` of the head. */
export function illumNear(d: number): number {
  return smooth(NV_ILLUM.nearFrom, NV_ILLUM.nearTo, d);
}

/** The beam's angular shape 0..1 for the cosine off the view axis: 1 in the centre, `wide` round it, 0 behind. */
export function illumCone(cosA: number): number {
  const i = NV_ILLUM;
  return smooth(i.edgeOut, i.edgeIn, cosA) * (i.wide + (1 - i.wide) * smooth(i.coneOut, i.coneIn, cosA));
}

/** Wrapped N.L 0..1 (`ndl` the cosine between the surface normal and the direction to the head). */
export function illumWrap(ndl: number): number {
  return Math.max(0, (ndl + NV_ILLUM.wrap) / (1 + NV_ILLUM.wrap));
}

/** The share left where the baked light is already `s` (a gameplay level): 1 in the dark, 0 in lit areas. */
export function illumLitFade(s: number): number {
  return 1 - smooth(NV_ILLUM.litFrom, NV_ILLUM.litTo, s);
}

/** The floor's reach 0..1 at `d` m. */
export function illumFloorReach(d: number): number {
  return 1 - smooth(NV_ILLUM.floorReach * 0.6, NV_ILLUM.floorReach, d);
}

/**
 * The illuminator's light at a surface, as a gameplay light level: `k` night vision 0..1, `d` the distance from the
 * origin (m), `cosA` the cosine off the view axis, `ndl` the normal against the direction to the origin, `s` the baked
 * level there. GLSL mirror: `nvIllum`.
 */
export function nvIllumLevel(k: number, d: number, cosA: number, ndl: number, s: number): number {
  if (k <= 0) return 0;
  const i = NV_ILLUM;
  const beam = i.peak * illumFalloff(d) * illumNear(d) * illumCone(cosA);
  const base = i.floor * illumFloorReach(d) * illumNear(d);
  return Math.min(1, k) * illumLitFade(s) * illumWrap(ndl) * (beam + base);
}

const f = (x: number): string => x.toFixed(4);

/** GLSL mirror of `nvIllumLevel`: `o` = origin xyz + night vision k, `dir` = view axis xyz (unit). */
export const ILLUM_GLSL = `
float nvIllum(vec3 p, vec3 n, float s, vec4 o, vec4 dir) {
  vec3 v = p - o.xyz;
  float d = length(v);
  if (d < ${f(NV_ILLUM.nearFrom)}) return 0.0;
  v /= d;
  float cosA = dot(v, dir.xyz);
  float q = clamp(d / ${f(NV_ILLUM.reach)}, 0.0, 1.0);
  float w = 1.0 - q * q;
  float cone = smoothstep(${f(NV_ILLUM.edgeOut)}, ${f(NV_ILLUM.edgeIn)}, cosA) * (${f(NV_ILLUM.wide)} + ${f(1 - NV_ILLUM.wide)} * smoothstep(${f(NV_ILLUM.coneOut)}, ${f(NV_ILLUM.coneIn)}, cosA));
  float beam = ${f(NV_ILLUM.peak)} * w * w * cone;
  float base = ${f(NV_ILLUM.floor)} * (1.0 - smoothstep(${f(NV_ILLUM.floorReach * 0.6)}, ${f(NV_ILLUM.floorReach)}, d));
  float wrap = max(0.0, (dot(n, -v) + ${f(NV_ILLUM.wrap)}) / ${f(1 + NV_ILLUM.wrap)});
  float lit = 1.0 - smoothstep(${f(NV_ILLUM.litFrom)}, ${f(NV_ILLUM.litTo)}, s);
  return min(o.w, 1.0) * lit * wrap * smoothstep(${f(NV_ILLUM.nearFrom)}, ${f(NV_ILLUM.nearTo)}, d) * (beam + base);
}`;
