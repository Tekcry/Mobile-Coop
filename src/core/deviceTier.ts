/**
 * Device performance tier (3.1, pure): which graphics preset a device starts on when Graphics > Preset is Auto.
 * First the GPU's name (`tierFromRenderer`: unmasked renderer strings of known desktop and phone GPUs); when the name
 * says nothing (iOS reports "Apple GPU" for every iPhone), a short calibration on the menu stage (`Calibration`): the
 * presets from the top down, each rendered at its own resolution x `CALIBRATION.load` (the menu stage costs far less
 * than a match; more pixels stand in for the difference) until one holds the frame budget. The frame governor adapts
 * from there in a match.
 */
import type { FixedPreset } from './quality';

export interface DeviceGuess {
  /** The preset (null: unknown - calibrate). */
  tier: FixedPreset | null;
  /** The name alone is enough (no calibration). */
  confident: boolean;
  reason: string;
}

type Rule = readonly [RegExp, FixedPreset, string];

/** Desktop / laptop GPUs (first match wins). */
const DESKTOP: readonly Rule[] = [
  [/swiftshader|llvmpipe|softpipe|software|basic render/i, 'low', 'software renderer'],
  [/rtx\s*(50|40)\d\d/i, 'epic', 'RTX 40 / 50'],
  [/rtx\s*30[6-9]\d|rtx\s*a\d{4}/i, 'ultra', 'RTX 30'],
  [/rtx\s*(20\d\d|30[0-5]\d)|gtx\s*16\d\d/i, 'high', 'RTX 20 / GTX 16'],
  [/gtx\s*(10|9)\d\d|mx\s*\d{3}/i, 'medium', 'GTX 10 / MX'],
  [/rx\s*(9|7)\d{3}/i, 'epic', 'Radeon RX 7000 / 9000'],
  [/rx\s*6[6-9]\d\d/i, 'ultra', 'Radeon RX 6600+'],
  [/rx\s*(6[0-5]\d\d|5\d{3})/i, 'high', 'Radeon RX 5000 / 6500'],
  [/rx\s*(4|5)\d0\b|vega/i, 'medium', 'Radeon RX 400 / 500 / Vega'],
  [/radeon.*(8[89]0m|780m)/i, 'high', 'Radeon 780M / 880M'],
  [/arc(\(tm\))?\s*(a7|a5|b5|b7)/i, 'ultra', 'Arc A5 / A7 / B'],
  [/apple m\d (max|ultra)/i, 'ultra', 'Apple M Max / Ultra'],
  [/apple m\d pro/i, 'high', 'Apple M Pro'],
  [/apple m\d/i, 'high', 'Apple M'],
  [/iris.*xe|\barc(\(tm\))?\s+graphics|radeon(\(tm\))? graphics|radeon 7[0-6]0m/i, 'medium', 'integrated (Xe / Arc / Radeon)'],
  [/intel.*(uhd|hd) graphics|intel.*iris/i, 'low', 'older integrated'],
];

/** Phone / tablet GPUs. */
const MOBILE: readonly Rule[] = [
  [/swiftshader|llvmpipe|software/i, 'low', 'software renderer'],
  [/adreno.*\b(8[3-9]\d|7[5-9]\d)\b/i, 'ultra', 'Adreno 750+'],
  [/adreno.*\b(7[34]\d)\b/i, 'high', 'Adreno 730 / 740'],
  [/adreno.*\b(7[0-2]\d|6[4-9]\d)\b/i, 'medium', 'Adreno 640 - 725'],
  [/adreno/i, 'low', 'older Adreno'],
  [/immortalis|mali-g9\d\d/i, 'ultra', 'Immortalis / Mali G9xx'],
  [/mali-g7[1-9]\d/i, 'high', 'Mali G710+'],
  [/mali-g(5[7-9]|6\d|7\d)\b/i, 'medium', 'Mali G57 - G78'],
  [/mali/i, 'low', 'older Mali'],
  [/xclipse\s*9\d\d/i, 'high', 'Xclipse 900'],
  [/powervr|maleoon|xclipse/i, 'low', 'other mobile GPU'],
  [/apple m\d/i, 'ultra', 'Apple M (iPad)'],
];

export function tierFromRenderer(renderer: string, mobile: boolean): DeviceGuess {
  const r = renderer.trim();
  if (!r) return { tier: null, confident: false, reason: 'renderer hidden' };
  for (const [re, tier, reason] of mobile ? MOBILE : DESKTOP) {
    // (an M-series chip on a "mobile" iPad keeps its own rule; Epic stays PC only)
    if (re.test(r)) return { tier: mobile && tier === 'epic' ? 'ultra' : tier, confident: true, reason };
  }
  return { tier: null, confident: false, reason: /apple gpu/i.test(r) ? 'Apple GPU (model hidden)' : 'unknown GPU' };
}

/** What a detection is for: re-detect when the GPU, the platform or the screen changes. */
export function deviceKey(renderer: string, platform: string, w: number, h: number, dpr: number): string {
  const a = Math.max(w, h);
  const b = Math.min(w, h);
  return `${renderer.trim().slice(0, 96)}|${platform}|${Math.round(a * dpr)}x${Math.round(b * dpr)}`;
}

export const CALIBRATION = {
  /** Seconds per preset not counted (shader compiles, shadow maps settling), then measured. */
  warmup: 0.6,
  measure: 1.2,
  /** Pixels x this per axis while measuring (a match costs about twice the menu stage). */
  load: 1.4,
  /** A preset holds when the 90th percentile frame interval is within this of the budget. */
  slack: 1.12,
  /** The longest a calibration may take (s): past it the next lower preset is taken without measuring. */
  maxSeconds: 6,
};

/**
 * The calibration staircase: `ladder` from the top preset down. Feed every rendered frame's interval; `preset` is the
 * one to render now; `done` with `result` once one holds the budget (or the bottom / the time limit is reached).
 */
export class Calibration {
  private i = 0;
  private t = 0;
  private total = 0;
  private samples: number[] = [];
  done = false;
  result: FixedPreset;
  /** Per preset tried: its p90 interval (ms). */
  readonly tried: { preset: FixedPreset; p90: number }[] = [];

  constructor(
    private ladder: readonly FixedPreset[],
    private budgetMs: number,
  ) {
    this.result = ladder[ladder.length - 1] ?? 'low';
    if (!ladder.length) this.done = true;
  }

  get preset(): FixedPreset {
    return this.ladder[Math.min(this.i, this.ladder.length - 1)]!;
  }

  /** One rendered frame: its interval (ms). Returns true when the preset to render changed (or it finished). */
  push(intervalMs: number): boolean {
    if (this.done) return false;
    const dt = Math.min(0.25, Math.max(0, intervalMs / 1000));
    this.t += dt;
    this.total += dt;
    if (this.t > CALIBRATION.warmup) this.samples.push(intervalMs);
    if (this.t < CALIBRATION.warmup + CALIBRATION.measure) {
      if (this.total < CALIBRATION.maxSeconds) return false;
      // out of time: settle on the next one down without measuring it
      this.result = this.ladder[Math.min(this.i + 1, this.ladder.length - 1)]!;
      this.done = true;
      return true;
    }
    const p90 = percentile(this.samples, 0.9);
    this.tried.push({ preset: this.preset, p90 });
    if (p90 <= this.budgetMs * CALIBRATION.slack || this.i >= this.ladder.length - 1) {
      this.result = this.preset;
      this.done = true;
      return true;
    }
    this.i++;
    this.t = 0;
    this.samples = [];
    return true;
  }
}

function percentile(xs: readonly number[], q: number): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))]!;
}
