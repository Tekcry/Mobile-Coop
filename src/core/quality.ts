/** Quality levels (index 0 = lowest). */
export interface QualityLevel {
  name: 'potato' | 'low' | 'medium' | 'high';
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
];

export const PRESET_INDEX = { low: 1, medium: 2, high: 3 } as const;

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
  private cooldown = 0;

  constructor(
    public level: number,
    public readonly min = 0,
    public max = QUALITY_LEVELS.length - 1,
    private tune: AdaptiveTuning = DEFAULT_TUNING,
  ) {}

  reset(): void {
    this.t = 0;
    this.slowT = 0;
    this.fastT = 0;
    this.windowMs.length = 0;
  }

  /** @param frameMs frame time in ms, @param dt seconds since last sample. */
  push(frameMs: number, dt: number): number | null {
    this.t += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.t < this.tune.warmup) return null;
    this.windowMs.push(frameMs);
    if (this.windowMs.length > 60) this.windowMs.shift();
    const n = this.windowMs.length;
    if (n < 20) return null;
    const avg = this.windowMs.reduce((a, b) => a + b, 0) / n;
    const slowShare = this.windowMs.filter((v) => v > this.tune.slowMs).length / n;
    if (avg > this.tune.slowMs || slowShare > 0.35) {
      this.slowT += dt;
      this.fastT = 0;
    } else if (avg < this.tune.fastMs && slowShare < 0.05) {
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
    this.cooldown = cooldown;
  }
}
