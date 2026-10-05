/** Quality levels (index 0 = lowest). */
export interface QualityLevel {
  name: 'potato' | 'low' | 'medium' | 'high' | 'ultra';
  renderScale: number;
  dprCap: number;
  shadows: boolean;
  /** Shadow map refresh: 1 = every frame, 2 = every other frame. */
  shadowRefresh: number;
  vfxDensity: number;
}

export const QUALITY_LEVELS: readonly QualityLevel[] = [
  { name: 'potato', renderScale: 0.6, dprCap: 1, shadows: false, shadowRefresh: 2, vfxDensity: 0.4 },
  { name: 'low', renderScale: 0.75, dprCap: 1.25, shadows: false, shadowRefresh: 2, vfxDensity: 0.6 },
  { name: 'medium', renderScale: 0.9, dprCap: 1.5, shadows: true, shadowRefresh: 2, vfxDensity: 0.85 },
  { name: 'high', renderScale: 1, dprCap: 1.75, shadows: true, shadowRefresh: 1, vfxDensity: 1 },
  /** "Ultra 120": top phones on 120 Hz displays (native-ish resolution, everything on). */
  { name: 'ultra', renderScale: 1, dprCap: 3, shadows: true, shadowRefresh: 1, vfxDensity: 1 },
];

export const PRESET_INDEX = { low: 1, medium: 2, high: 3, ultra: 4 } as const;
/** Highest level auto may pick: Ultra only on high-refresh displays. */
export function autoMaxLevel(hz: number): number {
  return hz >= 100 ? 4 : 3;
}

export interface AdaptiveTuning {
  /** Frame time (ms) above which frames count as slow. ~50 fps. */
  slowMs: number;
  /** Average frame time (ms) under which there is headroom to upgrade. ~70+ fps capacity. */
  fastMs: number;
  /** Seconds of sustained slow frames before stepping down. */
  downAfter: number;
  /** Seconds of sustained headroom before stepping up. */
  upAfter: number;
  /** Ignore samples for this long after (re)starting (shader compiles, loading hitches). */
  warmup: number;
}

export const DEFAULT_TUNING: AdaptiveTuning = { slowMs: 20, fastMs: 12.5, downAfter: 2, upAfter: 12, warmup: 3 };

/** Thresholds scaled to the display's frame budget (60 Hz gives DEFAULT_TUNING). */
export function tuningFor(hz: number): AdaptiveTuning {
  const budget = 1000 / (hz > 0 ? hz : 60);
  return { ...DEFAULT_TUNING, slowMs: budget * 1.2, fastMs: budget * 0.75 };
}

/**
 * Pure adaptive-quality controller. Feed it frame times; it returns a new level index when it
 * decides to step. Uses windowed averages and the share of slow frames so single hitches never
 * trigger a change, and alternates are prevented by cooldowns.
 */
export class AdaptiveController {
  private t = 0;
  private slowT = 0;
  private fastT = 0;
  private windowMs: number[] = [];
  private windowLoad: number[] = [];
  private cooldown = 0;

  constructor(
    public level: number,
    public readonly min = 0,
    public max = QUALITY_LEVELS.length - 1,
    public tune: AdaptiveTuning = DEFAULT_TUNING,
  ) {}

  reset(): void {
    this.t = 0;
    this.slowT = 0;
    this.fastT = 0;
    this.windowMs.length = 0;
    this.windowLoad.length = 0;
  }

  /**
   * @param frameMs frame interval in ms, @param dt seconds since last sample, @param loadMs work time
   * of the frame (CPU); with vsync the interval never drops under the budget, so headroom is judged on
   * the work time when given.
   */
  push(frameMs: number, dt: number, loadMs = frameMs): number | null {
    this.t += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.t < this.tune.warmup) return null;
    this.windowMs.push(frameMs);
    this.windowLoad.push(loadMs);
    if (this.windowMs.length > 60) {
      this.windowMs.shift();
      this.windowLoad.shift();
    }
    const n = this.windowMs.length;
    if (n < 20) return null;
    let sum = 0;
    let load = 0;
    let slow = 0;
    for (let i = 0; i < n; i++) {
      const v = this.windowMs[i]!;
      sum += v;
      load += this.windowLoad[i]!;
      if (v > this.tune.slowMs) slow++;
    }
    const avg = sum / n;
    const avgLoad = load / n;
    const slowShare = slow / n;
    if (avg > this.tune.slowMs || slowShare > 0.35) {
      this.slowT += dt;
      this.fastT = 0;
    } else if (avgLoad < this.tune.fastMs && slowShare < 0.05) {
      this.fastT += dt;
      this.slowT = 0;
    } else {
      this.slowT = Math.max(0, this.slowT - dt);
      this.fastT = Math.max(0, this.fastT - dt * 0.5);
    }
    if (this.cooldown > 0) return null;
    if (this.slowT >= this.tune.downAfter && this.level > this.min) {
      this.level--;
      this.afterChange(3);
      return this.level;
    }
    if (this.fastT >= this.tune.upAfter && this.level < this.max) {
      this.level++;
      this.afterChange(10);
      return this.level;
    }
    return null;
  }

  private afterChange(cooldown: number): void {
    this.slowT = 0;
    this.fastT = 0;
    this.windowMs.length = 0;
    this.windowLoad.length = 0;
    this.cooldown = cooldown;
  }
}
