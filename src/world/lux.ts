/**
 * (light-realism L0, BRIEF A2) The one curve between the engine's light level (the field the meter and guards read,
 * 0..1, `LightField.levelAt`) and real illuminance in lux:
 *
 *   level = 0.28 + 0.32 x log10(lux), clamped 0..1;   lux = 10 ^ ((level - 0.28) / 0.32)
 *
 * anchored at 1 lx = `LIGHT.shadow` (0.28, the meter's dark line) and 10 lx = `LIGHT.lit` (0.60). Lamps still add
 * linearly in the engine; the curve only labels a level in lux (the measure adds lamps in lux: `sumLux`), so the picture, the meter and guard perception
 * are unchanged by it (light parity holds by construction). Measurement only: imported by scripts and tests (and the
 * level validator, J12), never by gameplay or rendering (`tests/lux.test.ts` greps for it). Pure, Babylon-free.
 * Why a log curve, the night-floor check and the reference test: `docs/light-realism/research/bands.md` section 2 and
 * `docs/light-realism/measure/calibration.md`.
 */

/** The two anchors (BRIEF A2). Change them here only, then re-run the measures (PLAN L0). */
export const LUX_ANCHORS = {
  lo: { lux: 1, level: 0.28 },
  hi: { lux: 10, level: 0.6 },
} as const;

/** Level per decade of lux (0.32). */
export const LUX_SLOPE = (LUX_ANCHORS.hi.level - LUX_ANCHORS.lo.level) / Math.log10(LUX_ANCHORS.hi.lux / LUX_ANCHORS.lo.lux);
/** The level of 1 lx (0.28). */
export const LUX_OFFSET = LUX_ANCHORS.lo.level - LUX_SLOPE * Math.log10(LUX_ANCHORS.lo.lux);

/** Lux to engine level on the curve, clamped 0..1 (0 lux or less: 0). */
export function luxToLevel(lux: number): number {
  if (!(lux > 0)) return 0;
  const v = LUX_OFFSET + LUX_SLOPE * Math.log10(lux);
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Engine level to lux on the curve (the level clamped 0..1 first, so the answer lies in `LUX_FLOOR`..`LUX_CEIL`). */
export function levelToLux(level: number): number {
  const v = level < 0 ? 0 : level > 1 ? 1 : level;
  return Math.pow(10, (v - LUX_OFFSET) / LUX_SLOPE);
}

/** The lux of level 0 (~0.13 lx) and of level 1 (~178 lx): the curve's ends. Brighter than `LUX_CEIL` reads fully lit. */
export const LUX_FLOOR = levelToLux(0);
export const LUX_CEIL = levelToLux(1);

/**
 * (L0 check, lead note 1) Lamps add in lux, not in level. The engine sums lamp levels linearly and the curve is a log,
 * so reading a summed level on the curve over-reads overlapping lamps: two S1 columns each reading 5.6 lx alone sum
 * to level 0.796, which the curve reads as ~41 lx, against ~10.5 lx real. The measure therefore reads each lamp on its
 * own and adds the lux: one lamp's lux is what the curve gives it alone over the reference test's night floor
 * (`LAMP_LUX_BASE`, the campus open ground the curve was set against: `calibrate.ts` `FLOOR_LEVEL`, tied by a test),
 * minus that floor's own lux; the cell's lux is its non-lamp part (ambient, moon, bounce) on the curve plus the lamps'
 * lux. One lamp alone over the reference floor reads exactly as before. The engine (picture, meter, guards) still adds
 * levels: this is the measure's correction, not a light change (parity untouched). The engine change that would make
 * the two agree is written in PLAN L1 (BRIEF A14).
 */
export const LAMP_LUX_BASE = 0.244;

/** One lamp's lux from its level contribution `dLevel` at a point (0 or less: 0; capped where the curve tops out). */
export function lampLux(dLevel: number): number {
  if (!(dLevel > 0)) return 0;
  return levelToLux(LAMP_LUX_BASE + dLevel) - levelToLux(LAMP_LUX_BASE);
}

/**
 * A point's lux with its lamps added in lux: `base` is the level without the lamps (ambient + moon + bounce), `lamps`
 * each lamp's level contribution there. Allocation-free over the array.
 */
export function sumLux(base: number, lamps: ArrayLike<number>, count: number = lamps.length): number {
  let e = levelToLux(base);
  for (let i = 0; i < count; i++) e += lampLux(lamps[i]!);
  return e;
}

/**
 * A space's band (BRIEF A4): the standard's maintained average as the floor of the space's mean lux, up to `maxFactor`
 * (2.5) x it, plus the standard's point minimum and / or uniformity (U0 = min / mean) where it gives one.
 */
export interface LuxBand {
  /** Maintained average (lx): the floor of the space's mean. */
  avg: number;
  /** Point minimum (lx), if the standard gives one. */
  min?: number;
  /** Uniformity U0 = min / mean, if the standard gives one. */
  u0?: number;
  /** The mean's ceiling as a multiple of `avg` (default 2.5). */
  maxFactor?: number;
}

export const BAND_MAX_FACTOR = 2.5;

export interface BandResult {
  n: number;
  meanLevel: number;
  /** Mean of the cells' lux (the standards average illuminance, not level). */
  meanLux: number;
  minLux: number;
  maxLux: number;
  /** min / mean, in lux. */
  u0: number;
  /** The mean's floor and ceiling (lx) the check used. */
  floorLux: number;
  ceilLux: number;
  /** The band's average is above the curve's top (`LUX_CEIL`): its floor is the curve's top, met only where every
   *  cell reads fully lit (level 1). */
  saturated: boolean;
  passMean: boolean;
  passMax: boolean;
  passMin: boolean;
  passU0: boolean;
  pass: boolean;
}

/**
 * Check a space's cell levels (open cells at its plane; solids left out by the caller) against its band. `lux`, when
 * given (one value per level, e.g. `sumLux` per cell), is what the band is checked on; otherwise each level is read on
 * the curve. A band above the curve's top (`saturated`) needs a mean of at least `LUX_CEIL`: with levels alone that is
 * every cell at level 1; with lamps added in lux it is the mean (L0 check note 2, open for L1 / L2: PLAN L1).
 */
export function bandCheck(levels: readonly number[], band: LuxBand, lux?: readonly number[]): BandResult {
  const n = levels.length;
  if (lux && lux.length !== n) throw new Error(`bandCheck: ${n} levels but ${lux.length} lux values`);
  let sumL = 0;
  let sumLux = 0;
  let minLux = Infinity;
  let maxLux = 0;
  for (let i = 0; i < n; i++) {
    const v = levels[i]!;
    const lx = lux ? lux[i]! : levelToLux(v);
    sumL += v;
    sumLux += lx;
    if (lx < minLux) minLux = lx;
    if (lx > maxLux) maxLux = lx;
  }
  if (n === 0) minLux = 0;
  const meanLevel = n ? sumL / n : 0;
  const meanLux = n ? sumLux / n : 0;
  const u0 = meanLux > 0 ? minLux / meanLux : 0;
  const saturated = band.avg > LUX_CEIL;
  const floorLux = saturated ? LUX_CEIL : band.avg;
  const ceilLux = band.avg * (band.maxFactor ?? BAND_MAX_FACTOR);
  // (1e-9: a mean of cells all at level 1 equals LUX_CEIL up to rounding)
  const passMean = n > 0 && meanLux >= floorLux * (1 - 1e-9);
  const passMax = saturated || meanLux <= ceilLux;
  const passMin = band.min === undefined || (n > 0 && minLux >= band.min);
  const passU0 = band.u0 === undefined || (n > 0 && u0 >= band.u0);
  return { n, meanLevel, meanLux, minLux, maxLux, u0, floorLux, ceilLux, saturated, passMean, passMax, passMin, passU0, pass: passMean && passMax && passMin && passU0 };
}
