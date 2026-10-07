import type { Engine } from './babylon';
import { applyRenderScale } from './engine';
import { forPlatform, GRAPHICS_PRESETS, MIN_FEATURES, pvpFeatures, qualityLevel, type FixedPreset, type QualityLevel } from './quality';
import { adaptiveAt, FULL, Governor, type Adaptive } from './governor';
import { flags } from './flags';
import { emptySnapshot, FrameStats, RefreshDetector, ResolutionScaler, type PacingSnapshot } from './pacing';
import type { SettingsStore } from './settings';
import type { GameLoop } from './loop';

/** Something that can take quality changes live (the game state, the menu stage). */
export interface QualityTarget {
  applyQuality(level: QualityLevel): void;
  /** The frame governor's detail (3.1; cheap at run time: no recompiles). */
  applyAdaptive?(a: Readonly<Adaptive>, level: QualityLevel): void;
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
  /** The benchmark's per-run preset / render scale (never saved; `?gfx=` pages keep their level). */
  private ov: { preset: FixedPreset | null; scale: number | null } | null = null;

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
    if (!simulating) return;
    if (this.adaptiveOn) {
      this.governor.display(this.hz, this.mobile);
      if (this.governor.frame(intervalMs, this.budgetMs)) this.applyAdaptive();
      return;
    }
    if (!this.auto) return;
    if (this.res.push(intervalMs, cpuMs, this.budgetMs, intervalMs / 1000)) this.applyScale();
  }

  /** 3.1 frame governor: steps detail down / up in a match to hold the frame rate. */
  readonly governor = new Governor();
  private adaptive: Adaptive = { ...FULL };

  /** The governor runs: Adaptive detail on, in a match, not on a `?gfx=` test page or a benchmark run. */
  get adaptiveOn(): boolean {
    return this.settings.get().video.adaptive && !flags.gfx && !this.ov;
  }

  /** The governor's current detail. */
  get detail(): Readonly<Adaptive> {
    return this.adaptive;
  }

  private applyAdaptive(): void {
    adaptiveAt(this.adaptiveOn ? this.governor.level : 0, this.adaptive);
    if (this.pvp) {
      // (PvP: lighting, shadows and effects stay the shared look)
      this.adaptive.shadowEvery = 1;
      this.adaptive.lights = 1;
      this.adaptive.effects = 1;
    }
    this.applyScale();
    this.target?.applyAdaptive?.(this.adaptive, this._level);
  }

  private resetGovernor(): void {
    this.governor.reset();
    adaptiveAt(0, this.adaptive);
  }

  private build(): QualityLevel {
    const v = this.settings.get().video;
    // tests: `?gfx=` overrides for this page only
    if (flags.gfx === 'min') return qualityLevel('custom', MIN_FEATURES, true);
    const up = this.taau ? (this.ov?.scale ?? v.renderScale) : 1;
    const pick = flags.gfx ? { name: flags.gfx, f: GRAPHICS_PRESETS[flags.gfx] } : this.ov?.preset ? { name: this.ov.preset, f: GRAPHICS_PRESETS[this.ov.preset] } : { name: v.preset, f: v.gfx };
    // phones: no Epic, no ray-traced reflections
    const p = forPlatform(pick.name, pick.f, this.mobile);
    // PvP: the shared look for what decides how visible a player is
    const f = this.pvp ? pvpFeatures(p.features) : p.features;
    return qualityLevel(p.name, f, false, up, this.pvp ? 0 : v.panini);
  }

  /** A PvP match (3.1): no Panini (everyone sees the same projection). */
  private pvp = false;
  setPvp(on: boolean): void {
    if (on === this.pvp) return;
    this.pvp = on;
    this.apply();
  }

  /** The device is a phone / tablet (Epic and ray tracing are PC only). */
  private mobile = false;
  setMobile(m: boolean): void {
    if (m === this.mobile) return;
    this.mobile = m;
    this.apply();
  }

  /** TAAU upscaling: on, with a render scale under 1 (the canvas stays at the display's resolution). */
  private get taau(): boolean {
    const v = this.settings.get().video;
    return flags.gfx !== 'min' && v.upscaler === 'taau' && (this.ov?.scale ?? v.renderScale) < 0.999;
  }

  private configure(): void {
    const v = this.settings.get().video;
    this.loop.fpsCap = v.fpsCap;
    const key = JSON.stringify(v.gfx) + v.preset + (this.taau ? v.renderScale : 1) + v.panini;
    if (!this.auto) this.res.reset();
    this.applyScale();
    if (key === this.key) return;
    this.key = key;
    this._level = this.build();
    this.resetGovernor();
    this.target?.applyQuality(this._level);
    this.target?.applyAdaptive?.(this.adaptive, this._level);
    this.onChange?.(this._level);
  }

  /** Benchmark runs: a preset and / or render scale for now only (null: back to the settings). */
  setOverride(o: { preset: FixedPreset | null; scale: number | null } | null): void {
    this.ov = o;
    this.apply();
  }

  setTarget(t: QualityTarget | null): void {
    this.target = t;
    this.res.reset();
    this.resetGovernor();
    this.apply();
  }

  apply(): void {
    this._level = this.build();
    const v = this.settings.get().video;
    this.key = JSON.stringify(v.gfx) + v.preset + (this.taau ? v.renderScale : 1) + v.panini;
    this.applyScale();
    this.target?.applyQuality(this._level);
    this.target?.applyAdaptive?.(this.adaptive, this._level);
    this.onChange?.(this._level);
  }

  /** Render resolution: native (no DPR cap) x the render scale x dynamic resolution. */
  private applyScale(): void {
    // (`?gfx=min`: DPR 1, as the phone-era tests ran)
    if (flags.gfx === 'min') applyRenderScale(this.engine, this.ov?.scale ?? 1, 1);
    // TAAU: the canvas at native resolution (x dynamic resolution); the post stack renders the scene smaller
    // (the governor's scale: on the canvas without TAAU, on the TAAU input with it - `applyAdaptive`)
    else applyRenderScale(this.engine, (this.taau ? 1 : (this.ov?.scale ?? this.settings.get().video.renderScale) * (this.adaptiveOn ? this.adaptive.scale : 1)) * (this.adaptiveOn ? 1 : this.res.scale), Infinity);
  }
}
