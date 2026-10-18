/**
 * Thermal and electro vision's looks (step 14; pure, rendering only - gameplay never reads them).
 *
 * Both are branches of the cinematic post shader (`vk` 1 thermal, 2 electro), with no extra render
 * target. The scene arrives already lit; what makes a body warm or a device live is a
 * render-only emissive flag on its material (`PatternPlugin`, the per-instance `pattern.w`, set from gameState's
 * render frame): warm bodies and electrical devices are what is bright on screen, then the ramp below colours it.
 * Thermal does not see through walls (A26). The ramps are mirrored in GLSL from the same constants
 * (the `NV_GLSL` pattern).
 */

/**
 * Thermal (prototype A5, G102): CT's false-colour ramp (ct-measure doc, sampled sRGB: indigo background, blue rim, cyan,
 * teal, green, yellow-green, yellow, red core). The input luma (after the 4-tap soften) goes through `heatOf`: the whole
 * cold scene (luma under `coldTo`) stays at the flat indigo with a faint `world` trace of geometry, so the room is nearly
 * invisible; bodies (emissive flag) and the dim door silhouette climb the ramp. Every number is a starting value.
 */
export const THERMAL = {
  /** Luma under this is cold background; heat runs from here to `hotTo`. */
  coldTo: 0.5,
  hotTo: 1.0,
  /** Share of the cold luma that still shows as geometry in the indigo (CT: almost none). */
  world: 0.05,
  /** The ramp: position 0..1 then linear RGB (CT samples, sRGB / 255). */
  stops: [
    [0.0, 0.13, 0.035, 0.25],
    [0.12, 0.01, 0.05, 0.87],
    [0.28, 0.01, 0.09, 0.98],
    [0.42, 0.22, 0.59, 1.0],
    [0.55, 0.05, 0.5, 0.43],
    [0.67, 0.0, 0.42, 0.16],
    [0.8, 0.63, 0.83, 0.04],
    [0.9, 0.84, 1.0, 0.12],
    [1.0, 1.0, 0.2, 0.05],
  ] as readonly (readonly [number, number, number, number])[],
  /** The soften's tap offset (share of screen height). */
  blur: 0.0025,
  /** Emissive added to a warm body's material at full heat (`pattern.w` = 1). */
  bodyEmit: 0.85,
  /** A fresh body cools over this (s). */
  coolTime: 60,
  /** A guard behind a closed door: the silhouette's emissive grey (lands low on the ramp: dim blue) and range (m). */
  doorGhost: 0.62,
  doorRange: 14,
} as const;

/** Electro (CT): a flat dark navy, no grain; live devices (bright) glow white; people stay dim. */
export const ELECTRO = {
  /** The scene's luma scaled down by this: only emissive things reach the glow band. */
  dim: 0.55,
  dark: [0.055, 0.13, 0.225] as const,
  tint: [0.0, 0.02, 0.04] as const,
  glow: [1.0, 1.0, 1.0] as const,
  glowFrom: 0.5,
  glowTo: 0.9,
  /** Emissive added to a device's material while electro is on. */
  deviceEmit: 1.2,
} as const;

/**
 * (Step 21v, M14 N7, A87) the goggles' sensor grain and softening: thermal, electro and night vision read as a
 * sensor image, not a clean render. Grain strength is a constant here, no setting (Michael: "cycling through thermal
 * vision is too clear, should be a bit more grainy"). Rendering only: perception, the light meter and the wire never
 * read it. All of it runs inside the cinematic pass: a sine-free hash per cell,
 * no texture, no extra target; the soften is a few taps of the scene the pass already samples.
 */
export const SENSOR_GRAIN = {
  /** Noise cells per screen height (width = height x aspect): the grain's size is the same at any resolution. */
  cells: 640,
  /** A new noise field this many times a second (every second frame at 60 Hz, every fourth at 120). */
  rate: 30,
  /** Peak-to-peak grain in output colour at black, per mode (step 14 had 0.04 thermal / electro, 0.075 night). */
  thermal: 0.26,
  electro: 0,
  night: 0.035,
  /** Share of the grain left at full output luma (luminance-weighted: hot bodies, live devices and lit phosphor stay
   *  clean enough to read; the cold / dark scene carries the noise). */
  litThermal: 1,
  litElectro: 0.45,
  litNight: 1,
  /** Electro's grain is tinted with the phosphor (a grey grain over the green read as dirt). */
  electroTint: [0.7, 0.85, 1.0] as const,
  /** Softening: the share of the tap average mixed into the pixel's luma (thermal keeps step 14's 0.6). Night uses
   *  two diagonal taps, thermal and electro four, all at `THERMAL.blur`. */
  softThermal: 0.6,
  softElectro: 0.35,
  softNight: 0.3,
} as const;

/** The grain's amplitude (peak to peak) for a mode's output luma 0..1 (GLSL mirror: `sensorAmp`). */
export function sensorGrainAmp(mode: 'thermal' | 'electro' | 'night', l: number): number {
  const g = SENSOR_GRAIN;
  const amp = mode === 'thermal' ? g.thermal : mode === 'electro' ? g.electro : g.night;
  const lit = mode === 'thermal' ? g.litThermal : mode === 'electro' ? g.litElectro : g.litNight;
  return amp * (1 - (1 - lit) * Math.min(1, Math.max(0, l)));
}

/**
 * Electro: the interactable kinds that are powered devices and glow (switches, alarm panels, terminals, placed
 * charges). Intel folders, cache crates, extract beacons, hide spots, doors, bodies, VIPs and revives do not.
 */
export const ELECTRO_KINDS: ReadonlySet<string> = new Set(['switch', 'alarm', 'terminal', 'charge']);

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Thermal's heat 0..1 for an input luma: 0 under `coldTo` (flat indigo), 1 at `hotTo`. */
export function heatOf(l: number): number {
  return smooth(THERMAL.coldTo, THERMAL.hotTo, l);
}

/** Thermal's grain amplitude for a heat 0..1: strong on warm areas, nearly none on the cold background (G101). */
export function thermalGrainAmp(h: number): number {
  return SENSOR_GRAIN.thermal * (0.04 + 0.96 * smooth(0.08, 0.4, h));
}

/** Thermal's colour for a luma 0..1 (CT ramp). */
export function thermalColor(l: number, out: [number, number, number] = [0, 0, 0]): [number, number, number] {
  const h = heatOf(l);
  const st = THERMAL.stops;
  let k = 1;
  while (k < st.length - 1 && h > st[k]![0]) k++;
  const a = st[k - 1]!;
  const b = st[k]!;
  const t = Math.min(1, Math.max(0, (h - a[0]) / (b[0] - a[0])));
  // the cold scene keeps a faint trace of geometry (luma under coldTo) so the room is nearly, not wholly, gone
  const w = THERMAL.world * Math.min(1, l / THERMAL.coldTo) * (1 - h);
  for (let i = 0; i < 3; i++) out[i] = a[i + 1]! + (b[i + 1]! - a[i + 1]!) * t + w;
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
float heatOf(float l) {
  return smoothstep(${f(THERMAL.coldTo)}, ${f(THERMAL.hotTo)}, l);
}
float thermalGrain(float h) {
  return ${f(SENSOR_GRAIN.thermal)} * (0.04 + 0.96 * smoothstep(0.08, 0.4, h));
}
vec3 thermalColor(float l) {
  float h = heatOf(l);
  float w = ${f(THERMAL.world)} * min(1.0, l / ${f(THERMAL.coldTo)}) * (1.0 - h);
  vec3 c = ${v3(THERMAL.stops[0]!.slice(1))};
${THERMAL.stops.slice(1).map((st, i) => `  c = mix(c, ${v3(st.slice(1))}, clamp((h - ${f(THERMAL.stops[i]![0])}) / ${f(st[0] - THERMAL.stops[i]![0])}, 0.0, 1.0));`).join('\n')}
  return c + w;
}
vec3 electroColor(float l) {
  float d = min(l * ${f(ELECTRO.dim)}, 1.0);
  float g = smoothstep(${f(ELECTRO.glowFrom)}, ${f(ELECTRO.glowTo)}, l);
  return mix(${v3(ELECTRO.dark)} + ${v3(ELECTRO.tint)} * d, ${v3(ELECTRO.glow)}, g);
}
// (step 21v) the sensor grain: -0.5..0.5 per cell, a new field 'rate' times a second ('time' runs at 24 / s);
// the frame index wraps at 61 so the hash input stays small (precision)
float sensorNoise(highp vec2 uv, highp float aspect, highp float time) {
  highp vec2 p = floor(uv * vec2(aspect, 1.0) * ${f(SENSOR_GRAIN.cells)})
    + mod(floor(time * ${f(SENSOR_GRAIN.rate / 24)}), 61.0) * vec2(37.0, 17.0);
  highp vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z) - 0.5;
}
float sensorAmp(float amp, float lit, float l) {
  return amp * (1.0 - (1.0 - lit) * clamp(l, 0.0, 1.0));
}`;
