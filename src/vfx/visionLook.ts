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
  /** A guard behind a closed door: the silhouette's grey as the thermal pass reads it (display luma; lands low on the
   *  ramp: CT's dim blue, 052901 12.5 s) and range (m). (LR16-6: 0.72 -> 0.62; 0.72 x the pipeline's exposure read
   *  ~0.75, heat ~0.5, teal-green, not dim. `DoorGhosts` divides out the exposure.) */
  doorGhost: 0.62,
  doorRange: 14,
  /** (LR16-6, G102) The silhouette is drawn on the camera side of the shut leaf, this far in front of its centre line
   *  (m; the leaf is `DOOR.thickness` 0.05, so 0.025 a side): each joint slides along its own camera ray, so the figure
   *  looks exactly as the body would and the near wall faces round the frame still cover what spills past the leaf. */
  doorFront: 0.06,
  /** At most this many silhouettes at once (2 draw calls whatever the count: `Silhouettes`). */
  doorMax: 8,
  /** A rig shows through a shut door while its thermal heat is at least this share of `bodyEmit` (live people; a body
   *  for its first half of `coolTime`). */
  doorMinHeat: 0.5,
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
  /** (nv-pass slice 1: 0.035 -> 0.06, with `litNight` 1 -> 0.4: an intensifier's scintillation is strongest where
   *  there is least light; tinted with the phosphor in the post pass) */
  night: 0.06,
  /** Share of the grain left at full output luma (luminance-weighted: hot bodies, live devices and lit phosphor stay
   *  clean enough to read; the cold / dark scene carries the noise). */
  litThermal: 1,
  litElectro: 0.45,
  litNight: 0.4,
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

/**
 * (nv-pass slice 2) The goggle frame: one wide, screen-shaped frame for night, thermal and electro (one goggle).
 * Michael: "expand the goggle outline to be less intrusive and show more of the screen, it feels claustrophobic". Was a
 * round lens (r 0.455-0.5 of screen height, outside it the picture x0.51, a rim at r 0.468) and an eyepiece vignette
 * `mix(0.06, 1, smoothstep(0.8, 0.52, r))`: at 16:9 the clear circle was 56% of the width and the edges sat at x0.06.
 * Now a rounded rectangle the shape of the screen (distances in screen heights, so the band is as wide on the sides as
 * at the top at any aspect): full brightness to `fadeIn` inside the frame line, a soft falloff to `floor` at `fadeOut`
 * outside it (only the corners get there), and a thin, faint rim just inside the line. The settings vignette is
 * separate and unchanged. Rendering only. GLSL mirror: `GOGGLE_GLSL`.
 */
export const GOGGLE_FRAME = {
  /** The frame line's distance outside the screen edge (screen heights; 0 = on the edge midpoints). */
  over: 0,
  /** Corner radius of the frame (screen heights; clamped to the half extents on a narrow screen). */
  radius: 0.32,
  /** Brightness at and past `fadeOut` (the very corners); never near-black (was 0.06). */
  floor: 0.3,
  /** Edge distance (inside +, screen heights) where the falloff starts (full brightness inside it) ... */
  fadeIn: 0.06,
  /** ... and where it reaches `floor` (outside the frame line: only the corners reach it). */
  fadeOut: -0.1,
  /** The rim: a thin line this far inside the frame line, this wide, added in this tint (was 0.05, 0.09, 0.08). */
  rimAt: 0.008,
  rimWidth: 0.004,
  rimTint: [0.03, 0.05, 0.045] as const,
} as const;

/** Signed distance (screen heights, inside +) from the goggle frame line for a screen uv 0..1 (GLSL `goggleEdge`). */
export function goggleEdge(u: number, v: number, aspect: number): number {
  const g = GOGGLE_FRAME;
  const hx = aspect * 0.5 + g.over;
  const hy = 0.5 + g.over;
  const r = Math.min(g.radius, hx, hy);
  const qx = Math.abs((u - 0.5) * aspect) - hx + r;
  const qy = Math.abs(v - 0.5) - hy + r;
  const ox = Math.max(qx, 0);
  const oy = Math.max(qy, 0);
  return -(Math.sqrt(ox * ox + oy * oy) + Math.min(Math.max(qx, qy), 0) - r);
}

/** The frame's brightness factor (`floor`..1) for an edge distance (GLSL `goggleShade`). */
export function goggleShade(e: number): number {
  const g = GOGGLE_FRAME;
  return g.floor + (1 - g.floor) * smooth(g.fadeOut, g.fadeIn, e);
}

/** The rim's weight 0..1 for an edge distance (GLSL `goggleRim`). */
export function goggleRim(e: number): number {
  const g = GOGGLE_FRAME;
  return 1 - smooth(0, g.rimWidth, Math.abs(e - g.rimAt));
}

/** The frame's brightness factor at a screen uv 0..1 (`goggleShade(goggleEdge(u, v, aspect))`). */
export function goggleFrame(u: number, v: number, aspect: number): number {
  return goggleShade(goggleEdge(u, v, aspect));
}

/** GLSL mirror of `goggleEdge` / `goggleShade` / `goggleRim` and the rim tint (the cinematic pass). */
export const GOGGLE_GLSL = `
float goggleEdge(vec2 uv, float aspect) {
  vec2 h = vec2(aspect * 0.5, 0.5) + ${f(GOGGLE_FRAME.over)};
  float r = min(${f(GOGGLE_FRAME.radius)}, min(h.x, h.y));
  vec2 q = abs((uv - 0.5) * vec2(aspect, 1.0)) - h + r;
  return -(length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r);
}
float goggleShade(float e) {
  return mix(${f(GOGGLE_FRAME.floor)}, 1.0, smoothstep(${f(GOGGLE_FRAME.fadeOut)}, ${f(GOGGLE_FRAME.fadeIn)}, e));
}
float goggleRim(float e) {
  // (edge0 < edge1: GLSL leaves smoothstep undefined otherwise)
  return 1.0 - smoothstep(0.0, ${f(GOGGLE_FRAME.rimWidth)}, abs(e - ${f(GOGGLE_FRAME.rimAt)}));
}
const vec3 goggleRimTint = ${v3(GOGGLE_FRAME.rimTint)};`;
