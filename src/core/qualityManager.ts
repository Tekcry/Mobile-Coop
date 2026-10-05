import type { Engine } from './babylon';
import { applyRenderScale } from './engine';
import { AdaptiveController, autoMaxLevel, PRESET_INDEX, QUALITY_LEVELS, tuningFor, type QualityLevel } from './quality';
import { emptySnapshot, FrameStats, RefreshDetector, ResolutionScaler, type PacingSnapshot } from './pacing';
import type { SettingsStore } from './settings';

/** Something that can take quality changes live (the game state). */
export interface QualityTarget {
  applyQuality(level: QualityLevel, userShadows: boolean): void;
}

/**
 * Applies the chosen/adaptive quality level, detects the display refresh rate (budget 1000/Hz: 8.33 ms
 * at 120 Hz), keeps frame pacing statistics and runs dynamic resolution within the level in auto mode.
 */
export class QualityManager {
  private ctl = new AdaptiveController(2, 0, autoMaxLevel(60));
  private target: QualityTarget | null = null;
  readonly refresh = new RefreshDetector();
  readonly stats = new FrameStats(240);
  readonly res = new ResolutionScaler();
  private snap = emptySnapshot();
  private simulating = false;
  onChange: ((l: QualityLevel) => void) | null = null;

  constructor(
    private engine: Engine,
    private settings: SettingsStore,
  ) {
    settings.subscribe(() => this.configure());
    this.configure();
  }

  get level(): QualityLevel {
    return QUALITY_LEVELS[this.ctl.level]!;
  }

  get auto(): boolean {
    return this.settings.get().video.quality === 'auto';
  }

  /** Detected display refresh rate (60 until known). */
  get hz(): number {
    return this.refresh.hz || 60;
  }

  get budgetMs(): number {
    return 1000 / this.hz;
  }

  /** Pacing percentiles over the last 240 frames (reuses one object). */
  pacing(): PacingSnapshot {
    return this.stats.snapshot(this.hz, this.snap);
  }

  /** Every real frame (menus included, for refresh detection); adapts only while simulating. */
  frame(intervalMs: number, cpuMs: number, simulating: boolean): void {
    if (this.refresh.push(intervalMs)) {
      this.ctl.tune = tuningFor(this.hz);
      this.ctl.max = autoMaxLevel(this.hz);
      if (this.ctl.level > this.ctl.max) this.ctl.level = this.ctl.max;
    }
    if (simulating !== this.simulating) {
      this.simulating = simulating;
      this.stats.clear();
    }
    this.stats.push(intervalMs, cpuMs);
    if (!simulating || !this.auto || !this.target) return;
    const dt = intervalMs / 1000;
    if (this.ctl.push(intervalMs, dt, cpuMs) !== null) {
      this.res.reset();
      this.apply();
    } else if (this.res.push(intervalMs, cpuMs, this.budgetMs, dt)) this.applyScale();
  }

  private configure(): void {
    const q = this.settings.get().video.quality;
    if (q !== 'auto') this.ctl.level = PRESET_INDEX[q];
    this.apply();
  }

  setTarget(t: QualityTarget | null): void {
    this.target = t;
    this.ctl.reset();
    this.apply();
  }

  apply(): void {
    const l = this.level;
    const v = this.settings.get().video;
    if (!this.auto) this.res.reset();
    this.applyScale();
    this.target?.applyQuality(l, v.shadows);
    this.onChange?.(l);
  }

  /** Render resolution only (dynamic resolution steps; no material / shadow changes). */
  private applyScale(): void {
    const l = this.level;
    applyRenderScale(this.engine, l.renderScale * this.settings.get().video.renderScale * this.res.scale, l.dprCap);
  }
}
