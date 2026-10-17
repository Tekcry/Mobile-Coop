/**
 * Device performance tier (3.1, pure): which graphics preset a device starts on when Graphics > Preset is Auto.
 * First the GPU's name (`tierFromRenderer`: unmasked renderer strings of known desktop GPUs); when the name
 * says nothing, a short calibration on the menu stage (`Calibration`): the
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

export function tierFromRenderer(renderer: string): DeviceGuess {
  const r = renderer.trim();
  if (!r) return { tier: null, confident: false, reason: 'renderer hidden' };
  for (const [re, tier, reason] of DESKTOP) if (re.test(r)) return { tier, confident: true, reason };
  return { tier: null, confident: false, reason: /apple gpu/i.test(r) ? 'Apple GPU (model hidden)' : 'unknown GPU' };
}

/** What a detection is for: re-detect when the GPU or the screen changes. (The middle field is the platform the
 *  key carried before the game became desktop only: kept, so saved keys still match.) */
export function deviceKey(renderer: string, w: number, h: number, dpr: number): string {
  const a = Math.max(w, h);
  const b = Math.min(w, h);
  return `${renderer.trim().slice(0, 96)}|desktop|${Math.round(a * dpr)}x${Math.round(b * dpr)}`;
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
