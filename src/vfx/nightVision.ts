/**
 * Night vision's look (Phase 1 Step 4b fix; pure, rendering only - gameplay never reads it).
 *
 * Michael (2026-10-09): night vision should look like Chaos Theory's (the optical look only, no UI art): a pale
 * grey-green phosphor, murky but readable shadows, highlights that clip to white, and light that blooms - a lamp, a lit
 * window or a blown-out wall spills a soft glow over its surroundings. The gain stays in the lighting (`VISION_GAIN`,
 * `darkCurve.ts`); this module is the tube: the phosphor ramp (mirrored in GLSL from the same constants, the
 * `LAMP_MATH_GLSL` pattern), the bloom's settings (`NightBloom` blurs the scene's bright parts) and the auto-gain.
 *
 * History: round 1 drew a glare per lamp (analytic, sized by distance: it blinded half the screen up close); round 3
 * matched a real tube's fixed-angle halo (correct, but a thin ring round the fitting looked odd). Round 4 blooms the
 * image itself, as the reference does: what glows is what is bright on screen, so nothing glows through a wall and a
 * strip glows along its length.
 *
 * The auto-gain: real tubes turn their gain down after a short delay with a bright light in view, and the dark parts of
 * the scene sink. The nearest lamps in view with a clear line from the camera drive it (`NightAutoGain`), eased.
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
  /** Auto-gain: the bright light in view pulls the rest of the image down by 1 / (1 + veil x this); the highlights
   *  (from `gainKeep` up to white) keep their drive: a lamp stays white while the room round it sinks. */
  gainDrop: 0.6,
  /** The light a bright source scatters over the whole tube (x veil). */
  veilLift: 0.02,
  gainKeep: 0.75,
  /** Grain (intensifier noise): amplitude in the dark, and how much of it is left at full drive. */
  grain: 0.075,
  grainLit: 0.35,
} as const;

/** The bloom (`NightBloom`): the scene's bright parts, blurred at low resolution, join the tube's drive. */
export const BLOOM = {
  /** The glow's resolution (a share of the scene's). */
  scale: 0.25,
  /** Bright pass per look: the phone's image is gamma-space 0..1; the desktop's linear 0..1 (an 8-bit target before
   *  TAA and tone mapping: linear 0.5 shows as gamma 0.73). A soft knee round the threshold; `strength` scales the
   *  glow into the drive. */
  phone: { threshold: 0.88, knee: 0.08, strength: 1.4 },
  desktop: { threshold: 0.85, knee: 0.1, strength: 1.4 },
  /** Blur passes (each horizontal then vertical, a 9-tap Gaussian) and the tap spacing in glow pixels: about 4% of the
   *  screen height of soft glow on the phone. */
  passes: 3,
  spread: 1.3,
  /** The glow is stored in 8 bits when the GPU cannot render half floats: divided by this, multiplied back after. */
  range: 4,
} as const;

/** The auto-gain's inputs. */
export const GLARE = {
  /** Lamps considered at once. */
  max: 8,
  /** Farthest lamp that counts (m). */
  range: 45,
  /** A lamp this near (m) turns the gain down fully; farther, less (`abcWeight`). */
  refDist: 10,
  /** The auto-gain's response (s): it turns down this fast with a bright light in view, and recovers this fast. */
  abcAttack: 0.25,
  abcRelease: 0.6,
  /** A lamp's weight fades in and out over this (s) as it comes into or leaves view. */
  fade: 0.12,
  /** Cosine of the widest angle off the view axis a lamp can be (and still count). */
  cosView: 0.35,
  /** Stop the line-of-sight test this short of the lamp (m): the fixture and its ceiling never count. */
  clearance: 0.35,
} as const;

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** The tube's drive for an input luma 0..1 (after the auto-gain). */
export function nvDrive(l: number, veil = 0): number {
  const a = Math.min(1, Math.max(0, l / (1 + veil * NV_TONE.gainDrop * (1 - smooth(NV_TONE.gainKeep, 1, l)))));
  return Math.pow(a, NV_TONE.gamma);
}

/** The phosphor colour for a drive (plus glow), 0..1 per channel; grain and the tube's edge are left out. */
export function nvColor(drive: number, veil = 0, out: [number, number, number] = [0, 0, 0]): [number, number, number] {
  const w = smooth(NV_TONE.whiteFrom, 1, drive);
  const d = Math.min(1, drive);
  for (let i = 0; i < 3; i++) {
    const p = NV_TONE.black[i]! + NV_TONE.tint[i]! * d + veil * NV_TONE.veilLift;
    out[i] = Math.min(1, p + (NV_TONE.white[i]! - p) * w);
  }
  return out;
}

/**
 * The bright pass: how much of a pixel of luma `l` glows (0..1 of it): none below `threshold - knee`, all of it above
 * `threshold + knee`, smooth between. A mask, not the excess over the threshold: both looks' scene targets are 8-bit
 * (they stop at 1), so a white lamp and a blown-out wall have no excess to give; the whole near-white pixel glows.
 */
export function brightShare(l: number, threshold: number, knee: number): number {
  return smooth(threshold - knee, threshold + knee, l);
}

/** Rec. 709 luma (the display luminance `e2e-darkness` measures). */
export const luma709 = (c: readonly number[]): number => 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;

const f = (x: number): string => x.toFixed(4);
const v3 = (c: readonly number[]): string => `vec3(${f(c[0]!)}, ${f(c[1]!)}, ${f(c[2]!)})`;

/** GLSL mirror of `nvDrive` / `nvColor` (the post pass; the glow is added to the drive before the colour). */
export const NV_GLSL = `
float nvDrive(float l, float veil) {
  return pow(clamp(l / (1.0 + veil * ${f(NV_TONE.gainDrop)} * (1.0 - smoothstep(${f(NV_TONE.gainKeep)}, 1.0, l))), 0.0, 1.0), ${f(NV_TONE.gamma)});
}
vec3 nvColor(float drive, float veil) {
  float w = smoothstep(${f(NV_TONE.whiteFrom)}, 1.0, drive);
  vec3 p = ${v3(NV_TONE.black)} + ${v3(NV_TONE.tint)} * min(drive, 1.0) + veil * ${f(NV_TONE.veilLift)};
  return min(mix(p, ${v3(NV_TONE.white)}, w), 1.0);
}`;

/** GLSL mirror of `brightShare` (the bloom's bright pass). */
export const BRIGHT_GLSL = `
float brightShare(float l, float threshold, float knee) {
  return smoothstep(threshold - knee, threshold + knee, l);
}`;

/** A lamp, as far as the auto-gain needs it (`LightDef`). */
export interface GlareLamp {
  x: number;
  y: number;
  z: number;
  kind: string;
  on: boolean;
  destroyed: boolean;
  intensity: number;
  fixture: { oy: number } | null;
}

/** Where a lamp shines from: its fixture's centre, or its bulb. */
export const glareY = (l: GlareLamp): number => l.y + (l.fixture ? l.fixture.oy : 0);

/**
 * The lamps that may count this frame, best first: fixed lights that are on, within `GLARE.range` and in front of the
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

/** A lamp's weight eased towards its target (0 or 1) over `GLARE.fade`. */
export function easeGlare(w: number, target: number, dt: number): number {
  const k = Math.min(1, dt / GLARE.fade);
  return w + Math.max(-k, Math.min(k, target - w));
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
