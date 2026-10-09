/**
 * Night vision's look (Phase 1 Step 4b fix; pure, rendering only - gameplay never reads it).
 *
 * Michael (2026-10-09): the first night vision was a flat saturated green and lamps did not shine in it. The target
 * is an image intensifier tube: a pale grey-green phosphor, murky but readable shadows, highlights that clip towards
 * white, and lamps that flare into a wide soft glare. The gain itself stays in the lighting (`VISION_GAIN`,
 * `darkCurve.ts`); this module is the tube: the phosphor ramp (mirrored in GLSL from the same constants, the
 * `LAMP_MATH_GLSL` pattern) and the choice of lamps that glare.
 *
 * Glare is drawn from the lamps themselves, not from a blur of the image: the phone look has no bloom chain, and a
 * full-screen blur would cost more than the Phone check allows. Each frame the nearest lamps in view (fixed lights,
 * on, not shot out) are tested for a clear line from the camera, projected, and handed to the post pass as up to
 * `GLARE.max` screen-space sources.
 */

/** The phosphor: input luma (after the lighting's night-vision gain) to the tube's output colour. */
export const NV_TONE = {
  /** Contrast: output = input ^ gamma (the dark band stays murky, the lit band clips). */
  gamma: 1.7,
  /** The phosphor's pale grey-green at full drive (before the clip to white). */
  tint: [0.54, 0.64, 0.49] as const,
  /** The tube never reaches black (its background glow). */
  black: [0.016, 0.022, 0.016] as const,
  /** Clipped highlights. */
  white: [0.96, 1.0, 0.92] as const,
  /** Drive where highlights start to clip towards white. */
  whiteFrom: 0.65,
  /** Auto-gain: the glare in view pulls the rest of the image down by 1 / (1 + veil x this). */
  gainDrop: 0.6,
  /** The light a bright source scatters over the whole tube (x veil). */
  veilLift: 0.07,
  /** Grain (intensifier noise): amplitude in the dark, and how much of it is left at full drive. */
  grain: 0.075,
  grainLit: 0.35,
} as const;

/** Glare sources. */
export const GLARE = {
  /** Sources drawn at once (the shader's array). */
  max: 8,
  /** Farthest lamp that glares (m). */
  range: 45,
  /** The glare's size round a lamp (m), projected to the screen for its radius. */
  size: 3.2,
  /** The glare's profile round the fitting: a blinding core, a halo and a long tail (shader weights). */
  core: 1.4,
  halo: 0.6,
  tail: 0.2,
  /** Glare radius limits, in screen heights. */
  minR: 0.06,
  maxR: 0.7,
  /** A lamp fades in and out of glare over this (s) as it comes into or leaves view. */
  fade: 0.12,
  /** Cosine of the widest angle off the view axis a lamp can be (and still glare into the frame). */
  cosView: 0.35,
  /** Stop the line-of-sight test this short of the lamp (m): the fixture and its ceiling never count. */
  clearance: 0.35,
  /** A fitting this long or longer (m) glares along its length (a strip); shorter is a point. */
  strip: 0.5,
  /** The glowing share of a strip's length (the diffuser, not the end caps). */
  inset: 0.9,
} as const;

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** The tube's drive for an input luma 0..1 (after the auto-gain). */
export function nvDrive(l: number, veil = 0): number {
  const a = Math.min(1, Math.max(0, l / (1 + veil * NV_TONE.gainDrop)));
  return Math.pow(a, NV_TONE.gamma);
}

/** The phosphor colour for a drive (plus glare), 0..1 per channel; grain and the tube's edge are left out. */
export function nvColor(drive: number, veil = 0, out: [number, number, number] = [0, 0, 0]): [number, number, number] {
  const w = smooth(NV_TONE.whiteFrom, 1, drive);
  const d = Math.min(1, drive);
  for (let i = 0; i < 3; i++) {
    const p = NV_TONE.black[i]! + NV_TONE.tint[i]! * d + veil * NV_TONE.veilLift;
    out[i] = Math.min(1, p + (NV_TONE.white[i]! - p) * w);
  }
  return out;
}

/** Rec. 709 luma (the display luminance `e2e-darkness` measures). */
export const luma709 = (c: readonly number[]): number => 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;

const f = (x: number): string => x.toFixed(4);
const v3 = (c: readonly number[]): string => `vec3(${f(c[0]!)}, ${f(c[1]!)}, ${f(c[2]!)})`;

/** GLSL mirror of `nvDrive` / `nvColor` (the post pass; glare is added to the drive before the colour). */
export const NV_GLSL = `
float nvDrive(float l, float veil) {
  return pow(clamp(l / (1.0 + veil * ${f(NV_TONE.gainDrop)}), 0.0, 1.0), ${f(NV_TONE.gamma)});
}
vec3 nvColor(float drive, float veil) {
  float w = smoothstep(${f(NV_TONE.whiteFrom)}, 1.0, drive);
  vec3 p = ${v3(NV_TONE.black)} + ${v3(NV_TONE.tint)} * min(drive, 1.0) + veil * ${f(NV_TONE.veilLift)};
  return min(mix(p, ${v3(NV_TONE.white)}, w), 1.0);
}`;

/** A lamp, as far as the glare needs it (`LightDef`). */
export interface GlareLamp {
  x: number;
  y: number;
  z: number;
  kind: string;
  on: boolean;
  destroyed: boolean;
  intensity: number;
  fixture: { oy: number; sx: number; sz: number } | null;
}

/** Where a lamp glares from: its fixture's centre, or its bulb. */
export const glareY = (l: GlareLamp): number => l.y + (l.fixture ? l.fixture.oy : 0);

/** A lamp's glowing length: a strip fitting (its long side over `GLARE.strip`) glares along its diffuser, inset from the
 *  ends; a bulb or a compact fitting is a point. Writes the two ends (x, y, z, x, y, z) into `out`. */
export function glareEnds(l: GlareLamp, out: Float32Array): Float32Array {
  const f = l.fixture;
  const y = glareY(l);
  let hx = 0;
  let hz = 0;
  if (f && Math.max(f.sx, f.sz) >= GLARE.strip) {
    if (f.sx >= f.sz) hx = (f.sx / 2) * GLARE.inset;
    else hz = (f.sz / 2) * GLARE.inset;
  }
  out[0] = l.x - hx;
  out[1] = y;
  out[2] = l.z - hz;
  out[3] = l.x + hx;
  out[4] = y;
  out[5] = l.z + hz;
  return out;
}

/**
 * The lamps that may glare this frame, best first: fixed lights that are on, within `GLARE.range` and in front of the
 * camera (forward `fx, fy, fz`, unit). Writes up to `out.length` lamp indices into `out` (`score` is scratch of the
 * same length) and returns the count. Allocation-free.
 */
export function pickGlare(
  lamps: readonly GlareLamp[],
  cx: number,
  cy: number,
  cz: number,
  fx: number,
  fy: number,
  fz: number,
  out: Int16Array,
  score: Float32Array,
): number {
  let n = 0;
  const cap = Math.min(out.length, score.length);
  for (let i = 0; i < lamps.length; i++) {
    const l = lamps[i]!;
    if (l.kind === 'flashlight' || !l.on || l.destroyed || l.intensity <= 0) continue;
    const dx = l.x - cx;
    const dy = glareY(l) - cy;
    const dz = l.z - cz;
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 > GLARE.range * GLARE.range || d2 < 1e-4) continue;
    const d = Math.sqrt(d2);
    if ((dx * fx + dy * fy + dz * fz) / d < GLARE.cosView) continue;
    const s = Math.min(1.5, l.intensity) / Math.max(1, d);
    // insertion into the best-first list
    let j = n < cap ? n++ : cap;
    if (j === cap && s <= score[cap - 1]!) continue;
    if (j === cap) j = cap - 1;
    while (j > 0 && score[j - 1]! < s) {
      score[j] = score[j - 1]!;
      out[j] = out[j - 1]!;
      j--;
    }
    score[j] = s;
    out[j] = i;
  }
  return n;
}

/** A glare weight eased towards its target (0 or 1) over `GLARE.fade`. */
export function easeGlare(w: number, target: number, dt: number): number {
  const k = Math.min(1, dt / GLARE.fade);
  return w + Math.max(-k, Math.min(k, target - w));
}

/** A lamp's glare radius in screen heights from its projected size (screen heights), clamped. */
export const glareRadius = (projected: number): number => Math.min(GLARE.maxR, Math.max(GLARE.minR, projected));
