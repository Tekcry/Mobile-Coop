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
 *
 * nv-pass slice 1 (Michael 2026-10-20: "the night vision is so poor. I cant see properly at night, and the bodies are
 * very bright. It needs work to make it look more realistic"; A1 modern green phosphor): a softer drive gamma (1.7 ->
 * 1.3) so the shadows read, a clearly green phosphor (was a pale grey-green), the white clip later (0.65 -> 0.85), a
 * dim green floor, grain strongest in the dark (`SENSOR_GRAIN`), and a bloom measured on the HDR scene (compressed)
 * that only bright sources clear. The lighting's gain is lower and flatter (`darkCurve.ts` `VISION_GAIN`,
 * `VISION_FLOOR`), and bodies' flat fill is capped (`BODY_FILL`).
 */

/** The phosphor: input luma (after the lighting's night-vision gain) to the tube's output colour. */
export const NV_TONE = {
  /** Contrast: output = input ^ gamma (slice 1: 1.7 -> 1.3; the dark band reads, not a murk). */
  gamma: 1.3,
  /** The phosphor's green at full drive, before the clip to white (slice 1, A1 modern green phosphor; was a pale
   *  grey-green [0.54, 0.64, 0.49]). Undo A1 (white phosphor): a near-neutral tint here. */
  tint: [0.35, 0.85, 0.3] as const,
  /** The tube never reaches black (its background glow; slice 1: a dim green, was [0.016, 0.022, 0.016]). */
  black: [0.014, 0.04, 0.014] as const,
  /** Clipped highlights: a pale green-white (slice 1; was [0.96, 1.0, 0.92]). */
  white: [0.86, 1.0, 0.8] as const,
  /** Drive where highlights start to clip towards white (slice 1: 0.65 -> 0.85). */
  whiteFrom: 0.85,
  /** (slice 1) Without baked lamps (`?gfx=min`, the cheap path) the lighting has no night-vision gain: the tube lifts
   *  its input by this instead, so night vision is never darker than the goggles off. (fix round: 2 -> 3. The frame
   *  auto-gain leaves min's lit rooms at 1 - their 8-bit means sit in `NV_EXPOSURE.ldr` - so it cannot cover them;
   *  at 2 yard-s1-bay read 37.6 vs 40.3 off and yard-s5-backroom 40.9 vs 45.8.) */
  postLift: 3,
  /** Auto-gain: the bright light in view pulls the rest of the image down by 1 / (1 + veil x this); the highlights
   *  (from `gainKeep` up to white) keep their drive: a lamp stays white while the room round it sinks. */
  gainDrop: 0.6,
  /** The light a bright source scatters over the whole tube (x veil). */
  veilLift: 0.02,
  gainKeep: 0.75,
  // Grain (intensifier noise) and the tube's softening: `SENSOR_GRAIN` in visionLook.ts (step 21v, shared with thermal
  // and electro; the night grain was 0.075, 0.35 left at full drive).
} as const;

/** The bloom (`NightBloom`): the scene's bright parts, blurred at low resolution, join the tube's drive. */
export const BLOOM = {
  /** The glow's resolution (a share of the scene's). */
  scale: 0.25,
  /** The bright pass. Its source is the scene before TAA and tone mapping: linear light in a half-float target where
   *  the GPU renders one (it runs far past 1 under the gain), else 8-bit linear 0..1. (slice 1) A half-float source is
   *  compressed first (`bloomInput`: l / (1 + l)) and `threshold` applies to that, so only what is far past a lit wall
   *  glows (compressed 0.8 = linear 4: the lamps' fixtures, `NV_BULB`); an 8-bit source keeps `ldrThreshold` on its
   *  raw luma. A soft knee round the threshold; `strength` scales the glow into the drive (slice 1: 1.4 -> 0.6, the
   *  glow is now 0..1). */
  bright: { threshold: 0.8, ldrThreshold: 0.85, knee: 0.1, strength: 0.6 },
  /** Blur passes (each horizontal then vertical, a 9-tap Gaussian) and the tap spacing in glow pixels. */
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

/** The tube's drive for an input luma 0..1 (after the auto-gain). `lift` multiplies the input first (`postLift` without
 *  baked lamps; the post pass passes `l * lift` to its GLSL `nvDrive`). */
export function nvDrive(l: number, veil = 0, lift = 1): number {
  const x = l * lift;
  const a = Math.min(1, Math.max(0, x / (1 + veil * NV_TONE.gainDrop * (1 - smooth(NV_TONE.gainKeep, 1, x)))));
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
 * `threshold + knee`, smooth between. A mask, not the excess over the threshold: `l` is either the compressed luma of a
 * half-float scene (`bloomInput`, under 1) or an 8-bit scene's (it stops at 1), so there is no excess to give; the whole
 * bright pixel glows.
 */
export function brightShare(l: number, threshold: number, knee: number): number {
  return smooth(threshold - knee, threshold + knee, l);
}

/** (slice 1) A half-float scene's linear luma compressed to 0..1 for the bright pass (Reinhard: a lit wall at 2 gives
 *  0.67, a lamp's fixture at 8 gives 0.89). The pass compresses the colour by the same factor, so a tap is under 1. */
export function bloomInput(l: number): number {
  const x = Math.max(0, l);
  return x / (1 + x);
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

/** GLSL mirror of `brightShare` and `bloomInput` (the bloom's bright pass). */
export const BRIGHT_GLSL = `
float brightShare(float l, float threshold, float knee) {
  return smoothstep(threshold - knee, threshold + knee, l);
}
float bloomInput(float l) {
  float x = max(l, 0.0);
  return x / (1.0 + x);
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
  /** (LR16-5) The live flicker multiplier (`LightDef.flicker`): 0 in a drop-out, 1 steady. */
  flicker: number;
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
    if (l.kind === 'flashlight' || !l.on || l.destroyed || l.intensity <= 0 || l.flicker <= 0) continue;
    const dx = l.x - cx;
    const dy = glareY(l) - cy;
    const dz = l.z - cz;
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 > GLARE.range * GLARE.range || d2 < 1e-4) continue;
    const d = Math.sqrt(d2);
    if ((dx * fx + dy * fy + dz * fz) / d < GLARE.cosView) continue;
    const s = Math.min(1.5, l.intensity * l.flicker) / Math.max(1, d);
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

/** (LR16-polish) A lamp's glare target: 0 when its light is blocked, else its live flicker (a tube in a drop-out loses its glare). */
export const glareTarget = (blocked: boolean, flicker: number): number => (blocked ? 0 : flicker);

/** A lamp's weight eased towards its target (0 to 1) over `GLARE.fade`. */
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
