/**
 * Night vision's frame auto-gain (nv-pass fix round, CHECK-S12 fix 2; pure, rendering only - gameplay, the light meter,
 * the ambient grid, the light field and the bake never read it).
 *
 * A real tube's automatic brightness control: the whole frame's mean brightness sets the tube's gain, so a frame lit by
 * a moonlit wall is pulled down before it clips and a near-black frame is lifted until the route reads. `NightBloom`
 * measures the mean on the GPU (the scene before the post passes, reduced to 1 x 1, no readback) and eases it over
 * `ease`; `CinematicPost` scales the tube's input by `nvExposure(mean)` before `nvDrive`. The lamp glare veil
 * (`NightAutoGain`) stays on top.
 *
 * A band, not one target: lit rooms' frame means span about 1.8x (yard-s5 0.105 .. yard-s1 0.188, compressed), so one
 * target would push them all to the same brightness and move each by up to +-30%. Inside the band the gain is 1 (lit
 * rooms keep today's look); below it the frame is lifted to `lo`, above it pulled down to `hi`.
 */
export const NV_EXPOSURE = {
  /** The band on a half-float scene: the frame mean of the compressed luma (`bloomInput`, l / (1 + l)). `lo` sits under
   *  the dimmest lit room (wh-goods-in about 0.075), `hi` over the brightest (yard-s1-bay about 0.19). */
  hdr: { lo: 0.06, hi: 0.25 },
  /** The band on an 8-bit scene (`?gfx=min`: no post stack, the scene is display-encoded, before `postLift`): lit rooms
   *  0.09 .. 0.2 stay at 1 (their lift is `postLift`), a near-black frame is lifted. */
  ldr: { lo: 0.08, hi: 0.5 },
  /** The gain's range. `max` 3 (the brief's 2.5 leaves yard-look at about 27/255 on the CPU model; 30 needs 2.8). */
  min: 0.6,
  max: 3,
  /** The ease's time constant (s): the mean follows the frame with k = 1 - exp(-dt / ease). */
  ease: 0.5,
  /** The measurement's first reduction (texels per side; then 4x per pass down to 1 x 1). */
  size: 64,
} as const;

/** The tube input's gain for a frame mean `m`: 1 inside [lo, hi], lifts to `lo` below, pulls down to `hi` above. */
export function nvExposure(m: number, lo: number, hi: number, min: number = NV_EXPOSURE.min, max: number = NV_EXPOSURE.max): number {
  const x = Math.max(m, 1e-4);
  return Math.min(max, Math.max(min, Math.min(hi, Math.max(lo, x)) / x));
}

/** The ease's blend factor for a frame of `dt` seconds. */
export const exposureK = (dt: number): number => 1 - Math.exp(-Math.max(0, dt) / NV_EXPOSURE.ease);

/** The eased mean after a frame: `prev` moves towards `cur` by `exposureK(dt)`. */
export function easeExposure(prev: number, cur: number, dt: number): number {
  return prev + (cur - prev) * exposureK(dt);
}

/** GLSL mirror of `nvExposure`: e = (lo, hi, min, max); (0, 1e9, 1, 1) turns it off. */
export const EXPOSURE_GLSL = `
float nvExposure(float m, vec4 e) {
  float x = max(m, 0.0001);
  return clamp(clamp(x, e.x, e.y) / x, e.z, e.w);
}`;

type Band = readonly [number, number, number, number];
const HDR_BAND: Band = [NV_EXPOSURE.hdr.lo, NV_EXPOSURE.hdr.hi, NV_EXPOSURE.min, NV_EXPOSURE.max];
const LDR_BAND: Band = [NV_EXPOSURE.ldr.lo, NV_EXPOSURE.ldr.hi, NV_EXPOSURE.min, NV_EXPOSURE.max];

/** The uniform for `EXPOSURE_GLSL` on a half-float (hdr) or 8-bit scene (shared constants: no allocation per frame). */
export const exposureBand = (hdr: boolean): Band => (hdr ? HDR_BAND : LDR_BAND);

/** The band that turns the gain off (1 for any mean): before the first measure. */
export const NO_EXPOSURE: Band = [0, 1e9, 1, 1];
