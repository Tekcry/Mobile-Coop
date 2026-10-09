/**
 * Night vision's look (Phase 1 Step 4b fix; pure, rendering only - gameplay never reads it).
 *
 * Michael (2026-10-09): the first night vision was a flat saturated green and lamps did not shine in it. The target
 * is an image intensifier tube: a pale grey-green phosphor, murky but readable shadows, highlights that clip towards
 * white, and lamps that glare. The gain itself stays in the lighting (`VISION_GAIN`,
 * `darkCurve.ts`); this module is the tube: the phosphor ramp (mirrored in GLSL from the same constants, the
 * `LAMP_MATH_GLSL` pattern) and the choice of lamps that glare.
 *
 * Glare is drawn from the lamps themselves, not from a blur of the image: the phone look has no bloom chain, and a
 * full-screen blur would cost more than the Phone check allows. Each frame the nearest lamps in view (fixed lights,
 * on, not shot out) are tested for a clear line from the camera, projected, and handed to the post pass as up to
 * `GLARE.max` screen-space sources.
 *
 * (Round 3, Michael 2026-10-09: the glare blinded half the screen.) Real tubes (research:
 * `docs/research/night-vision-and-lamps.md`): a light's halo is made inside the tube (the gap between photocathode and
 * microchannel plate), so it is the same size anywhere on the screen and at any distance, about 1.8 degrees, a near-uniform
 * disc round the light's own image; it does not grow as you walk up to a lamp (the lamp's own image does). What does
 * blind you is the automatic brightness control: with a bright light in view the tube turns its gain down after a short
 * delay, and the dark parts of the scene sink. So the halo is a fixed angle round the fitting's glowing length, and the
 * blinding is the auto-gain, eased with an attack and a release.

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
  /** Auto-gain: the bright light in view pulls the rest of the image down by 1 / (1 + veil x this). */
  gainDrop: 0.6,
  /** The light a bright source scatters over the whole tube (x veil). */
  veilLift: 0.02,
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
  /** The halo's angular radius round the light's image (deg): the same at any distance (measured: about 1.8 deg
   *  across on Gen III tubes; a little larger here so it reads on a phone). */
  haloDeg: 1.5,
  /** The halo's profile (shader weights): a near-uniform disc that softens at its edge, and a faint scatter beyond. */
  disc: 0.8,
  scatter: 0.22,
  /** A lamp at this distance (m) or nearer is at full brightness in the tube; farther, its halo dims with the square of
   *  the distance, down to `farDim`. */
  refDist: 10,
  farDim: 0.35,
  /** The auto-gain's response (s): it turns down this fast with a bright light in view, and recovers this fast. */
  abcAttack: 0.25,
  abcRelease: 0.6,
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

/** The halo's radius in screen heights for a camera whose projection's [1][1] is `m5` (1 / tan(vertical fov / 2)). */
export const glareRadius = (m5: number): number => (Math.tan((GLARE.haloDeg * Math.PI) / 180) * m5) / 2;

/** A lamp's brightness in the tube at distance `d`: full within `GLARE.refDist`, then the inverse square, floored. */
export function glareBrightness(d: number, intensity: number): number {
  const k = d <= GLARE.refDist ? 1 : (GLARE.refDist * GLARE.refDist) / (d * d);
  return Math.min(1, intensity) * Math.max(GLARE.farDim, k);
}

/** How much a lamp at distance `d` turns the tube's gain down (the auto-gain's input): a near lamp more than a far one. */
export function abcWeight(d: number, intensity: number): number {
  return Math.min(1, intensity) * Math.min(1, (GLARE.refDist * 0.5) / Math.max(1, d));
}

/** The auto-gain's veil eased towards its target: `abcAttack` rising, `abcRelease` falling. */
export function easeVeil(v: number, target: number, dt: number): number {
  const tau = target > v ? GLARE.abcAttack : GLARE.abcRelease;
  return v + (target - v) * (1 - Math.exp(-dt / tau));
}
