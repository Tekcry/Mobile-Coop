/**
 * light-realism L0: the reference test (Q3 "one test that matches the game's brightness to real light units"; PLAN L0,
 * BRIEF A13). One real 6 m single-arm LED car-park column, from its maker's published photometric data (numbers only,
 * the file never committed: `REFERENCE`), against the same column in the engine's lamp terms on open ground:
 *
 *   real:   horizontal lux at the ground (y 0) at 0, 3, 6, 9, 12 m from the column's foot along the arm's axis
 *           (iso-lux diagram, or E = I(theta) x cos^3(theta) / h^2 from the candela table), plus the night floor's lux
 *   engine: night floor (moon 0.104 + standby fill 0.14) + `LAMP_LEVEL_GAIN` x intensity x `photoTerm` of one fixed
 *           lamp at y 6.0 on a 0.8 m arm with the S1 columns' cone and reach; visibility 1 (no bake)
 *
 * The one free number is the intensity that stands for the fitting's output; it is solved by least squares on level
 * with the A2 curve fixed (real lux -> level by `luxToLevel`). Pass ("measured"): RMS level error <= 0.03 and every
 * point within 0.05. Otherwise, or with no usable published data, the anchors are "chosen, not measured" (A13).
 * Beside it, the free best fit (the 10 lx anchor + intensity, the 1 lx anchor held) on the same points. Pure; imported by `tests/lux.test.ts`, its
 * result written up in `docs/light-realism/measure/calibration.md` (print it: `node scripts/light-realism/lux-grid.mjs
 * --calibrate`).
 */
import { LAMP_LEVEL_GAIN, SPOT_EXP, lampReach, photoTerm } from '../../src/world/lampMath';
import { levelToLux, luxToLevel, LUX_ANCHORS } from '../../src/world/lux';

/** The engine column (the S1 car-park columns, `campusS1.ts` column block: radius 12, cone 1.15 rad, intensity 0.9). */
export const ENGINE_COLUMN = { y: 6.0, arm: 0.8, radius: 12, coneRad: 1.15, s1Intensity: 0.9 } as const;
/** The campus night floor on open ground (research/bands.md section 2): the theme's moon and the standby fill. */
export const NIGHT_FLOOR = { moon: 0.104, fill: 0.14 } as const;
export const FLOOR_LEVEL = NIGHT_FLOOR.moon + NIGHT_FLOOR.fill;
/** Ground distances from the column's foot along the arm's axis (m). */
export const DISTANCES = [0, 3, 6, 9, 12] as const;
/** The pass line (PLAN L0). */
export const PASS = { rms: 0.03, point: 0.05 } as const;

/** One real fitting's published data (numbers only), as derived by the lead. */
export interface ReferenceFitting {
  maker: string;
  model: string;
  /** The page the numbers were read from, and when / by whom. */
  source: string;
  read: string;
  lumens: number;
  /** Mounting height and arm (outreach) the lux values are for (m). */
  mountH: number;
  arm: number;
  /** 'isolux' (read off the diagram) or 'candela' (E = I cos^3 / h^2 from the table). */
  method: 'isolux' | 'candela';
  /** Real horizontal lux on the ground at `DISTANCES` from the column's foot, the fitting alone (no moon, no sky). */
  lux: readonly number[];
}

/**
 * The reference fitting (Michael's pick, 2026-10-25 ~21:00: "Yes, numbers only (Recommended)"): RAB Lighting ALEDS3T,
 * 80 W 5000 K Type III area light, IES test DLF2207109-4a (Deliver Co., 2022-07-29), from the maker's published
 * photometric file https://www.rablighting.com/downloads/ies/aleds3t-80w-5k-dlf2207109-4a.ies (product page
 * https://www.rablighting.com/product/ALEDS3T). Numbers only, file not committed: the maker's terms bar commercial use
 * and copying of the file, so only these five derived ground readings are used (credited in `docs/art-credits.md`); no
 * IES file is committed, bundled or copied into the repo. Derived by the lead from the candela table (linear
 * interpolation on the vertical angle, C0 forward): E = I(theta) x cos(theta) / d^2 on the ground, 6 m mount, 0.8 m
 * arm toward the points.
 */
export const REFERENCE: ReferenceFitting | null = {
  maker: 'RAB Lighting',
  model: 'ALEDS3T 80 W 5000 K Type III (IES test DLF2207109-4a)',
  source: 'https://www.rablighting.com/downloads/ies/aleds3t-80w-5k-dlf2207109-4a.ies (numbers only, file not committed)',
  read: '2026-10-25, Night Shift | Sector Ops Build; Michael picked "Yes, numbers only (Recommended)"',
  lumens: 10742,
  mountH: 6.0,
  arm: 0.8,
  method: 'candela',
  lux: [32.1, 53.9, 47.7, 25.4, 11.2],
};

/** The engine's falloff x cone of the column at ground distance `d` from its foot (no intensity, gain or floor). */
export function engineShape(d: number, arm: number = ENGINE_COLUMN.arm): number {
  const C = ENGINE_COLUMN;
  return photoTerm(d - arm, 0 - C.y, 0, lampReach(C.radius), 0, -1, 0, Math.cos(C.coneRad), SPOT_EXP);
}

/** The engine level at ground distance `d` for a column of `intensity`, on the night floor (clamped 0..1). */
export function engineLevel(d: number, intensity: number, arm: number = ENGINE_COLUMN.arm): number {
  const v = FLOOR_LEVEL + LAMP_LEVEL_GAIN * intensity * engineShape(d, arm);
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** The S1 column today (intensity 0.9) at the 5 distances: level and lux on the A2 curve. The engine side of the test. */
export function engineProfile(intensity: number = ENGINE_COLUMN.s1Intensity): { d: number; shape: number; level: number; lux: number }[] {
  return DISTANCES.map((d) => {
    const level = engineLevel(d, intensity);
    return { d, shape: engineShape(d), level, lux: levelToLux(level) };
  });
}

export interface FitPoint {
  d: number;
  realLux: number;
  /** Real lux + the night floor's lux, on the A2 curve. */
  realLevel: number;
  engineLevel: number;
  engineLux: number;
  errLevel: number;
  /** (engine lux - real lux) / real lux, both with the floor. */
  errLuxPct: number;
}

export interface FitResult {
  intensity: number;
  /** Engine intensity per 1,000 lm of the fitting's output. */
  intensityPerKlm: number;
  points: FitPoint[];
  rms: number;
  maxAbs: number;
  verdict: 'measured' | 'chosen, not measured';
  /** The free best fit: the level at 10 lx and the intensity solved on the 5 points, the level at 1 lx held (`freeFit`). */
  free: { level1: number; level10: number; intensity: number; rms: number; edge: boolean };
}

/**
 * The A2 fit: one intensity by least squares on level, the curve fixed. `lux`: the fitting alone at `DISTANCES`; `arm`:
 * its outreach (the engine lamp hangs at the same point).
 */
export function fitReference(lux: readonly number[], lumens: number, arm: number = ENGINE_COLUMN.arm): FitResult {
  if (lux.length !== DISTANCES.length) throw new Error(`need ${DISTANCES.length} lux values, got ${lux.length}`);
  const floorLux = levelToLux(FLOOR_LEVEL);
  const f = DISTANCES.map((d) => LAMP_LEVEL_GAIN * engineShape(d, arm));
  const target = lux.map((e) => luxToLevel(e + floorLux));
  let num = 0;
  let den = 0;
  for (let i = 0; i < f.length; i++) {
    num += f[i]! * (target[i]! - FLOOR_LEVEL);
    den += f[i]! * f[i]!;
  }
  const intensity = den > 0 ? num / den : 0;
  const points = DISTANCES.map((d, i) => {
    const el = engineLevel(d, intensity, arm);
    const elux = levelToLux(el);
    const real = lux[i]! + floorLux;
    return { d, realLux: lux[i]!, realLevel: target[i]!, engineLevel: el, engineLux: elux, errLevel: el - target[i]!, errLuxPct: ((elux - real) / real) * 100 };
  });
  const rms = Math.sqrt(points.reduce((p, q) => p + q.errLevel * q.errLevel, 0) / points.length);
  const maxAbs = Math.max(...points.map((q) => Math.abs(q.errLevel)));
  const verdict = rms <= PASS.rms && maxAbs <= PASS.point ? 'measured' : 'chosen, not measured';
  return { intensity, intensityPerKlm: intensity / (lumens / 1000), points, rms, maxAbs, verdict, free: freeFit(lux, f) };
}

/**
 * The free fit beside A2: the curve's slope and the intensity both solved on the 5 points, the 1 lx anchor held at
 * `LIGHT.shadow` (0.28). Both anchors and the intensity cannot be solved together from one fitting: when the engine's
 * shape matches the real one, any anchor pair with a matching intensity fits equally (the family a + b x log10(floor
 * lux) = floor level), so one anchor has to be held. Minimises sum (floor + k f_i - a - b log10(E_i + E_floor(b)))^2,
 * the floor's lux read on the curve being tried: for each slope b the best k is closed form, and b is searched over
 * `FREE_SLOPE` (a 0.005 grid, then golden section). (The L0 build's fixed-point version wandered off on the real fitting
 * and stopped at a worse point than A2 itself; the search cannot.) `edge`: the best slope sits on the range's end, so
 * the shapes disagree too much for a slope to mean anything.
 */
export const FREE_SLOPE = { lo: 0.05, hi: 1.0 } as const;
function freeFit(lux: readonly number[], f: readonly number[]): FitResult['free'] {
  const a: number = LUX_ANCHORS.lo.level;
  let ff = 0;
  for (const q of f) ff += q * q;
  let k = 0;
  const sqAt = (b: number): number => {
    const floorLux = Math.pow(10, (FLOOR_LEVEL - a) / b);
    let num = 0;
    for (let i = 0; i < lux.length; i++) num += f[i]! * (a + b * Math.log10(lux[i]! + floorLux) - FLOOR_LEVEL);
    k = ff > 0 ? num / ff : 0;
    let sq = 0;
    for (let i = 0; i < lux.length; i++) {
      const r = FLOOR_LEVEL + k * f[i]! - (a + b * Math.log10(lux[i]! + floorLux));
      sq += r * r;
    }
    return sq;
  };
  const STEP = 0.005;
  let best = FREE_SLOPE.lo;
  let bestSq = Infinity;
  for (let b = FREE_SLOPE.lo; b <= FREE_SLOPE.hi + 1e-12; b += STEP) {
    const sq = sqAt(b);
    if (sq < bestSq) {
      bestSq = sq;
      best = b;
    }
  }
  // golden section on the grid point's neighbours
  let lo = Math.max(FREE_SLOPE.lo, best - STEP);
  let hi = Math.min(FREE_SLOPE.hi, best + STEP);
  const g = (Math.sqrt(5) - 1) / 2;
  for (let it = 0; it < 80; it++) {
    const m1 = hi - g * (hi - lo);
    const m2 = lo + g * (hi - lo);
    if (sqAt(m1) <= sqAt(m2)) hi = m2;
    else lo = m1;
  }
  const b = (lo + hi) / 2;
  const sq = sqAt(b);
  const edge = b - FREE_SLOPE.lo < STEP || FREE_SLOPE.hi - b < STEP;
  return { level1: a, level10: a + b, intensity: k, rms: Math.sqrt(sq / lux.length), edge };
}

export interface Calibration {
  verdict: 'measured' | 'chosen, not measured';
  reason: string;
  engine: ReturnType<typeof engineProfile>;
  reference: ReferenceFitting | null;
  fit: FitResult | null;
}

/** The whole test: the engine profile always; the fit and verdict when a reference is set. */
export function runCalibration(ref: ReferenceFitting | null = REFERENCE): Calibration {
  const engine = engineProfile();
  if (!ref) return { verdict: 'chosen, not measured', reason: 'no published photometric data usable without a download (A13)', engine, reference: null, fit: null };
  // (the engine column hangs at 6.0 m; a fitting's data for another height is not this test)
  if (Math.abs(ref.mountH - ENGINE_COLUMN.y) > 0.05) throw new Error(`reference mounted at ${ref.mountH} m; the test is for ${ENGINE_COLUMN.y} m`);
  const fit = fitReference(ref.lux, ref.lumens, ref.arm);
  return {
    verdict: fit.verdict,
    reason: fit.verdict === 'measured' ? `RMS level error ${fit.rms.toFixed(3)} <= ${PASS.rms}, every point within ${PASS.point}` : `fit missed: RMS ${fit.rms.toFixed(3)}, worst point ${fit.maxAbs.toFixed(3)}`,
    engine,
    reference: ref,
    fit,
  };
}
