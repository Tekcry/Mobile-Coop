import type { Engine } from './babylon';
import { applyRenderScale } from './engine';
import { AdaptiveController, PRESET_INDEX, QUALITY_LEVELS, type QualityLevel } from './quality';
import type { SettingsStore } from './settings';

/** Something that can take quality changes live (the game state). */
export interface QualityTarget {
  applyQuality(level: QualityLevel, userShadows: boolean): void;
}

/** Applies the chosen/adaptive quality level and samples frame times during gameplay. */
export class QualityManager {
  private ctl = new AdaptiveController(2);
  private target: QualityTarget | null = null;
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

  /** Feed every rendered frame while in gameplay. */
  sample(dtMs: number): void {
    if (!this.auto || !this.target) return;
    const r = this.ctl.push(dtMs, dtMs / 1000);
    if (r !== null) this.apply();
  }

  apply(): void {
    const l = this.level;
    const v = this.settings.get().video;
    applyRenderScale(this.engine, l.renderScale * v.renderScale, l.dprCap);
    this.target?.applyQuality(l, v.shadows);
    this.onChange?.(l);
  }
}
