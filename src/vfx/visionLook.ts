/**
 * Thermal and electro vision's looks (step 14; pure, rendering only - gameplay never reads them).
 *
 * Both are branches of the cinematic post shader (`vk` 1 thermal, 2 electro; the phone's grade pass is the same
 * pass), with no extra render target. The scene arrives already lit; what makes a body warm or a device live is a
 * render-only emissive flag on its material (`PatternPlugin`, the per-instance `pattern.w`, set from gameState's
 * render frame): warm bodies and electrical devices are what is bright on screen, then the ramp below colours it.
 * Thermal does not see through walls (A26). The ramps are mirrored in GLSL from the same constants
 * (the `NV_GLSL` pattern).
 */

/** Thermal: input luma (after the 4-tap soften) to a cold blue-grey ramp (the cold scene stays below `hotFrom`, its
 *  shapes readable); heat (bright) goes white-hot. */
export const THERMAL = {
  /** Luma where heat starts / is white-hot. */
  hotFrom: 0.55,
  hotTo: 1.0,
  cold: [0.06, 0.08, 0.12] as const,
  cool: [0.3, 0.37, 0.46] as const,
  hot: [1.0, 0.93, 0.78] as const,
  /** The soften's tap offset (share of screen height). */
  blur: 0.0018,
  /** Emissive added to a warm body's material at full heat (`pattern.w` = 1). */
  bodyEmit: 0.85,
  /** A fresh body cools over this (s). */
  coolTime: 60,
} as const;

/** Electro: a dark desaturated green; live devices (bright) glow a pale green-white; people stay dim. */
export const ELECTRO = {
  /** The scene's luma scaled down by this: only emissive things reach the glow band. */
  dim: 0.55,
  dark: [0.02, 0.05, 0.03] as const,
  tint: [0.12, 0.3, 0.16] as const,
  glow: [0.75, 1.0, 0.8] as const,
  glowFrom: 0.5,
  glowTo: 0.9,
  /** Emissive added to a device's material while electro is on. */
  deviceEmit: 1.2,
} as const;

/**
 * Electro: the interactable kinds that are powered devices and glow (switches, alarm panels, terminals, placed
 * charges). Intel folders, cache crates, extract beacons, hide spots, doors, bodies, VIPs and revives do not.
 */
export const ELECTRO_KINDS: ReadonlySet<string> = new Set(['switch', 'alarm', 'terminal', 'charge']);

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Thermal's colour for a luma 0..1. */
export function thermalColor(l: number, out: [number, number, number] = [0, 0, 0]): [number, number, number] {
  const c = Math.min(1, Math.max(0, l / THERMAL.hotFrom));
  const h = smooth(THERMAL.hotFrom, THERMAL.hotTo, l);
  for (let i = 0; i < 3; i++) {
    const base = THERMAL.cold[i]! + (THERMAL.cool[i]! - THERMAL.cold[i]!) * c;
    out[i] = base + (THERMAL.hot[i]! - base) * h;
  }
  return out;
}

/** Electro's colour for a luma 0..1. */
export function electroColor(l: number, out: [number, number, number] = [0, 0, 0]): [number, number, number] {
  const d = Math.min(1, l * ELECTRO.dim);
  const g = smooth(ELECTRO.glowFrom, ELECTRO.glowTo, l);
  for (let i = 0; i < 3; i++) {
    const base = ELECTRO.dark[i]! + ELECTRO.tint[i]! * d;
    out[i] = base + (ELECTRO.glow[i]! - base) * g;
  }
  return out;
}

const f = (x: number): string => x.toFixed(4);
const v3 = (c: readonly number[]): string => `vec3(${f(c[0]!)}, ${f(c[1]!)}, ${f(c[2]!)})`;

/** GLSL mirror of `thermalColor` / `electroColor`. */
export const VISION_GLSL = `
vec3 thermalColor(float l) {
  float c = clamp(l / ${f(THERMAL.hotFrom)}, 0.0, 1.0);
  float h = smoothstep(${f(THERMAL.hotFrom)}, ${f(THERMAL.hotTo)}, l);
  vec3 base = ${v3(THERMAL.cold)} + (${v3(THERMAL.cool)} - ${v3(THERMAL.cold)}) * c;
  return mix(base, ${v3(THERMAL.hot)}, h);
}
vec3 electroColor(float l) {
  float d = min(l * ${f(ELECTRO.dim)}, 1.0);
  float g = smoothstep(${f(ELECTRO.glowFrom)}, ${f(ELECTRO.glowTo)}, l);
  return mix(${v3(ELECTRO.dark)} + ${v3(ELECTRO.tint)} * d, ${v3(ELECTRO.glow)}, g);
}`;
