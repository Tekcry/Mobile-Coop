import type { Engine } from './babylon';
import { applyRenderScale } from './engine';
import { forPlatform, GRAPHICS_PRESETS, MIN_FEATURES, NO_CUTS, PHONE_CUTS, PHONE_FEATURES, PHONE_FLOOR, PHONE_FPS, PHONE_FPS_FALLBACK, PHONE_SCALES, PHONE_VOXEL_FEATURES, qualityLevel, type FixedPreset, type GraphicsFeatures, type PhoneCuts, type PhoneLook, type QualityLevel } from './quality';
import { adaptiveAt, FULL, Governor, phoneAdaptiveAt, type Adaptive } from './governor';
import { flags } from './flags';
import { emptySnapshot, FrameStats, RefreshDetector, ResolutionScaler, type PacingSnapshot } from './pacing';
import type { SettingsStore } from './settings';
import type { GameLoop } from './loop';

/** A benchmark run's settings for that run only. */
export interface QualityOverride {
  preset: FixedPreset | null;
  scale: number | null;
  gfx?: Partial<GraphicsFeatures>;
  /** 3.3 Phone check: a phone cut put back. */
  cuts?: Partial<PhoneCuts>;
  /** 3.3.2: a frame cap for the run (phone runs: 0 = uncapped). */
  cap?: number;
  /** 3.4 Phone check: the look for the run (default the light look). */
  look?: PhoneLook;
}

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
  /** The benchmark's per-run preset / render scale (never saved; `?gfx=` pages keep their level); a Phone check run's
   *  cuts put back (3.3). */
  private ov: QualityOverride | null = null;

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

  /**
   * Dynamic resolution (3.0) - retired in 3.1.7: with Adaptive detail off it lowered the render resolution unasked (a
   * blurry desktop at 120 Hz). The frame governor (Adaptive detail) is the one thing that may change it in a match.
   */
  get auto(): boolean {
    return false;
  }

  /** Detected display refresh rate (60 until known). */
  get hz(): number {
    return this.refresh.hz || 60;
  }

  /** Frame budget: the cap's interval when capped below the display, else the display's. */
  get budgetMs(): number {
    const cap = this.loop.fpsCap;
    return 1000 / (cap > 0 ? Math.min(cap, this.hz) : this.hz);
  }

  /** 3.3: the fixed phone look applies (a phone, not a `?gfx=` test page). */
  get phone(): boolean {
    return this.mobile && !flags.gfx;
  }

  /** 3.4: the phone's look - the light renderer, or the 3.3 voxel look for a Phone check run. */
  get phoneLook(): PhoneLook {
    return this.ov?.look ?? 'lite';
  }

  /** The phone cuts made when a map loads (none off phones or in the light look; a Phone check run may put one back). */
  get phoneCuts(): PhoneCuts {
    if (!this.phone || this.phoneLook === 'lite') return NO_CUTS;
    const c = { ...PHONE_CUTS, ...(this.ov?.cuts ?? {}) };
    if (!flags.lampVolume) c.lampVolume = false;
    return c;
  }

  /** The frame cap now: phones 60, or 30 at the governor's last level (3.3); a phone benchmark run is uncapped (it
   *  measures the headroom); else the setting. */
  private capNow(): number {
    if (!this.phone) return this.settings.get().video.fpsCap;
    if (this.ov) return this.ov.cap ?? 0;
    return this.governor.level > PHONE_SCALES.length - 1 ? PHONE_FPS_FALLBACK : PHONE_FPS;
  }

  /** Pacing percentiles over the last 240 frames (reuses one object). */
  pacing(): PacingSnapshot {
    return this.stats.snapshot(1000 / this.budgetMs, this.snap);
  }

  /** Every rendered frame (menus included); dynamic resolution only while simulating. */
  frame(intervalMs: number, cpuMs: number, simulating: boolean, rafMs = intervalMs): void {
    // (in a match the frames may be GPU-bound: the detected rate only rises there; the menu can lower it)
    if (this.refresh.push(rafMs, !simulating)) this.loop.displayMs = 1000 / this.hz;
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

  /** The governor runs: Adaptive detail on (always on phones), in a match, not on a `?gfx=` test page or a benchmark run. */
  get adaptiveOn(): boolean {
    return (this.phone || this.settings.get().video.adaptive) && !flags.gfx && !this.ov;
  }

  /** The governor's current detail. */
  get detail(): Readonly<Adaptive> {
    return this.adaptive;
  }

  private applyAdaptive(): void {
    if (this.phone) {
      // (phones: the resolution ladder from the match's base, then 30 fps at the floor)
      phoneAdaptiveAt(this.adaptiveOn ? this.governor.level : this.phoneStart, PHONE_SCALES, this.phoneScale, this.adaptive);
      this.loop.fpsCap = this.capNow();
    } else adaptiveAt(this.adaptiveOn ? this.governor.level : 0, this.adaptive);
    this.applyScale();
    this.target?.applyAdaptive?.(this.adaptive, this._level);
  }

  private resetGovernor(): void {
    // (phones: four resolution steps and the 30 fps level; a match starts at its base - 3.4 native, the voxel look the
    // 75% floor - and steps down / up with the frame rate)
    this.governor.max = this.phone ? PHONE_SCALES.length : 10;
    this.governor.reset(this.phone ? this.phoneStart : 0);
    if (this.phone) {
      phoneAdaptiveAt(this.phoneStart, PHONE_SCALES, this.phoneScale, this.adaptive);
      this.loop.fpsCap = this.capNow();
    } else adaptiveAt(0, this.adaptive);
  }

  /** Phones' base render scale: native (the voxel look: the floor, TAAU to native), or a Phone check run's. */
  private get phoneScale(): number {
    return this.ov?.scale ?? (this.phoneLook === 'lite' ? 1 : PHONE_FLOOR);
  }

  /** The governor's level a phone match starts at: the step of the ladder at the base scale. */
  private get phoneStart(): number {
    const s = this.phoneScale;
    let l = 0;
    while (l < PHONE_SCALES.length - 1 && PHONE_SCALES[l]! > s + 1e-6) l++;
    return l;
  }

  private build(): QualityLevel {
    const v = this.settings.get().video;
    // tests: `?gfx=` overrides for this page only
    if (flags.gfx === 'min') return qualityLevel('custom', MIN_FEATURES, true);
    // 3.3 phones: the fixed look (a Phone check run may change a feature or take the 3.3 voxel look), no preset
    if (this.phone) {
      const lite = this.phoneLook === 'lite';
      return qualityLevel('custom', { ...(lite ? PHONE_FEATURES : PHONE_VOXEL_FEATURES), ...(this.ov?.gfx ?? {}) }, false, this.taau ? this.phoneScale : 1, 0, true, true, lite);
    }
    const up = this.taau ? (this.ov?.scale ?? v.renderScale) : 1;
    const pick = flags.gfx ? { name: flags.gfx, f: GRAPHICS_PRESETS[flags.gfx] } : this.ov?.preset ? { name: this.ov.preset, f: GRAPHICS_PRESETS[this.ov.preset] } : { name: v.preset, f: v.gfx };
    // (Feature costs: one feature changed for a benchmark run)
    if (!flags.gfx && this.ov?.gfx) pick.f = { ...pick.f, ...this.ov.gfx };
    // phones: no Epic, none of the passes in `MOBILE_OFF`, no Panini (a phone's field of view is never that wide)
    const p = forPlatform(pick.name, pick.f, this.mobile);
    return qualityLevel(p.name, p.features, false, up, this.mobile ? 0 : v.panini, this.mobile);
  }

  /** The device is a phone / tablet (Epic and ray tracing are PC only). */
  private mobile = false;
  setMobile(m: boolean): void {
    if (m === this.mobile) return;
    this.mobile = m;
    this.resetGovernor();
    this.loop.fpsCap = this.capNow();
    this.apply();
  }

  /** TAAU upscaling: on, with a render scale under 1 (the canvas stays at the display's resolution); phones only in
   *  the voxel look (the light look has no post stack: the canvas itself scales). */
  private get taau(): boolean {
    const v = this.settings.get().video;
    if (this.phone) return this.phoneLook === 'voxel' && this.phoneScale < 0.999;
    return flags.gfx !== 'min' && v.upscaler === 'taau' && (this.ov?.scale ?? v.renderScale) < 0.999;
  }

  private keyOf(): string {
    const v = this.settings.get().video;
    return this.phone ? `phone:${this.phoneLook}` : JSON.stringify(v.gfx) + v.preset + (this.taau ? v.renderScale : 1) + v.panini;
  }

  private configure(): void {
    this.loop.fpsCap = this.capNow();
    const key = this.keyOf();
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

  /**
   * Benchmark runs: a preset and / or render scale for now only (null: back to the settings). `apply` false only
   * stores it: the next target (a run's own match, 3.1.4) builds with it.
   */
  setOverride(o: QualityOverride | null, apply = true): void {
    this.ov = o;
    this.loop.fpsCap = this.capNow();
    if (apply) this.apply();
    else this._level = this.build();
  }

  /** The override in force (a benchmark run). */
  get override(): Readonly<QualityOverride> | null {
    return this.ov;
  }

  setTarget(t: QualityTarget | null): void {
    this.target = t;
    this.res.reset();
    this.resetGovernor();
    this.apply();
  }

  apply(): void {
    this._level = this.build();
    this.key = this.keyOf();
    this.applyScale();
    this.target?.applyQuality(this._level);
    this.target?.applyAdaptive?.(this.adaptive, this._level);
    this.onChange?.(this._level);
  }

  /** Render resolution: native (phones: up to `video.phoneOutput`) x the render scale x dynamic resolution. */
  private applyScale(): void {
    // (`?gfx=min`: DPR 1, as the phone-era tests ran)
    if (flags.gfx === 'min') applyRenderScale(this.engine, this.ov?.scale ?? 1, 1);
    // (phones: the voxel look - the canvas native, the scene at the governor's step of it through TAAU; the light look
    // - the canvas at the governor's step, `adaptive.scale` being relative to the base)
    else if (this.phone) applyRenderScale(this.engine, this.taau ? 1 : this.phoneScale * (this.adaptiveOn ? this.adaptive.scale : 1), Infinity);
    // TAAU: the canvas at native resolution (x dynamic resolution); the post stack renders the scene smaller
    // (the governor's scale: on the canvas without TAAU, on the TAAU input with it - `applyAdaptive`)
    else applyRenderScale(this.engine, (this.taau ? 1 : (this.ov?.scale ?? this.settings.get().video.renderScale) * (this.adaptiveOn ? this.adaptive.scale : 1)) * (this.adaptiveOn ? 1 : this.res.scale), this.mobile ? this.settings.get().video.phoneOutput || Infinity : Infinity);
  }
}
