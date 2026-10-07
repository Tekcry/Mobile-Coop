import type { Engine } from './babylon';
import { applyRenderScale } from './engine';
import { GRAPHICS_PRESETS, MIN_FEATURES, qualityLevel, type QualityLevel } from './quality';
import { flags } from './flags';
import { emptySnapshot, FrameStats, RefreshDetector, ResolutionScaler, type PacingSnapshot } from './pacing';
import type { SettingsStore } from './settings';
import type { GameLoop } from './loop';

/** Something that can take quality changes live (the game state, the menu stage). */
export interface QualityTarget {
  applyQuality(level: QualityLevel): void;
}

/**
 * Applies the graphics settings (3.0: one renderer for every device, PC presets), detects the display refresh rate,
 * keeps frame pacing statistics, runs the frame limiter and - only when the player turns it on - dynamic resolution.
 */
export class QualityManager {
  private target: QualityTarget | null = null;
  readonly refresh = new RefreshDetector();
  readonly stats = new FrameStats(240);
  readonly res = new ResolutionScaler({ min: 0.5, max: 1, step: 0.1, downAfter: 1.2, upAfter: 6, cooldown: 1.5 });
  private snap = emptySnapshot();
  private simulating = false;
  private key = '';
  private _level: QualityLevel;
  onChange: ((l: QualityLevel) => void) | null = null;

  constructor(
    private engine: Engine,
    private settings: SettingsStore,
    private loop: GameLoop,
  ) {
    this._level = this.build();
    settings.subscribe(() => this.configure());
    this.configure();
  }

  get level(): QualityLevel {
    return this._level;
  }

  /** Dynamic resolution on. */
  get auto(): boolean {
    return this.settings.get().video.dynamicRes;
  }

  /** Detected display refresh rate (60 until known). */
  get hz(): number {
    return this.refresh.hz || 60;
  }

  /** Frame budget: the cap's interval when capped below the display, else the display's. */
  get budgetMs(): number {
    const cap = this.settings.get().video.fpsCap;
    return 1000 / (cap > 0 ? Math.min(cap, this.hz) : this.hz);
  }

  /** Pacing percentiles over the last 240 frames (reuses one object). */
  pacing(): PacingSnapshot {
    return this.stats.snapshot(1000 / this.budgetMs, this.snap);
  }

  /** Every rendered frame (menus included); dynamic resolution only while simulating. */
  frame(intervalMs: number, cpuMs: number, simulating: boolean, rafMs = intervalMs): void {
    if (this.refresh.push(rafMs)) this.loop.displayMs = 1000 / this.hz;
    if (simulating !== this.simulating) {
      this.simulating = simulating;
      this.stats.clear();
    }
    this.stats.push(intervalMs, cpuMs);
    if (!simulating || !this.auto) return;
    if (this.res.push(intervalMs, cpuMs, this.budgetMs, intervalMs / 1000)) this.applyScale();
  }

  private build(): QualityLevel {
    const v = this.settings.get().video;
    // tests: `?gfx=` overrides for this page only
    if (flags.gfx === 'min') return qualityLevel('custom', MIN_FEATURES, true);
    if (flags.gfx) return qualityLevel(flags.gfx, GRAPHICS_PRESETS[flags.gfx]);
    return qualityLevel(v.preset, v.gfx);
  }

  private configure(): void {
    const v = this.settings.get().video;
    this.loop.fpsCap = v.fpsCap;
    const key = JSON.stringify(v.gfx) + v.preset;
    if (!this.auto) this.res.reset();
    this.applyScale();
    if (key === this.key) return;
    this.key = key;
    this._level = this.build();
    this.target?.applyQuality(this._level);
    this.onChange?.(this._level);
  }

  setTarget(t: QualityTarget | null): void {
    this.target = t;
    this.res.reset();
    this.apply();
  }

  apply(): void {
    this._level = this.build();
    this.key = JSON.stringify(this.settings.get().video.gfx) + this.settings.get().video.preset;
    this.applyScale();
    this.target?.applyQuality(this._level);
    this.onChange?.(this._level);
  }

  /** Render resolution: native (no DPR cap) x the render scale x dynamic resolution. */
  private applyScale(): void {
    // (`?gfx=min`: DPR 1, as the phone-era tests ran)
    if (flags.gfx === 'min') applyRenderScale(this.engine, 1, 1);
    else applyRenderScale(this.engine, this.settings.get().video.renderScale * this.res.scale, Infinity);
  }
}
