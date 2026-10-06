/**
 * Goggle vision modes (pure), unit-tested. One button cycles off -> night vision -> sonar -> off.
 *
 * Night vision brightens the dark (a post-process; gameplay light is unchanged: being seen still depends on
 * the light on you). Sonar pulses every `sonarPeriod` s while on, revealing enemies within `sonarRange`
 * through walls for `sonarShow` s each; it runs for `sonarMax` s, then needs `sonarCooldown` s to recharge
 * (the cycle skips it meanwhile).
 */

export type VisionMode = 'off' | 'night' | 'sonar';

export const VISION = {
  sonarPeriod: 6,
  sonarShow: 2.5,
  sonarRange: 30,
  /** Longest sonar run (s; three pulses) and the recharge after it. */
  sonarMax: 18,
  sonarCooldown: 12,
  /** Night vision fade in / out (s). */
  nightFade: 0.25,
} as const;

export class VisionState {
  mode: VisionMode = 'off';
  /** Seconds to the next sonar pulse (sonar on). */
  private nextPulse = 0;
  /** Seconds sonar has been on this run. */
  private sonarT = 0;
  /** Recharge left (s). */
  cooldown = 0;
  /** Seconds since the last pulse (marks fade over `sonarShow`). */
  sincePulse = 99;
  pulses = 0;
  /** Night vision blend 0..1 (eased). */
  night = 0;

  /** The vision button: off -> night -> sonar (unless recharging) -> off. */
  cycle(): VisionMode {
    if (this.mode === 'off') this.set('night');
    else if (this.mode === 'night') this.set(this.cooldown > 0 ? 'off' : 'sonar');
    else this.set('off');
    return this.mode;
  }

  set(m: VisionMode): void {
    if (m === this.mode) return;
    if (this.mode === 'sonar' && this.sonarT > 0) this.cooldown = VISION.sonarCooldown * Math.min(1, this.sonarT / VISION.sonarMax);
    this.mode = m;
    if (m === 'sonar') {
      this.sonarT = 0;
      this.nextPulse = 0;
    }
  }

  /** Advance; returns true when a sonar pulse goes out this step. */
  step(dt: number): boolean {
    this.sincePulse += dt;
    const nt = this.mode === 'night' ? 1 : 0;
    const k = Math.min(1, dt / VISION.nightFade);
    this.night += Math.max(-k, Math.min(k, nt - this.night));
    if (this.mode !== 'sonar') {
      this.cooldown = Math.max(0, this.cooldown - dt);
      return false;
    }
    this.sonarT += dt;
    if (this.sonarT >= VISION.sonarMax) {
      this.cooldown = VISION.sonarCooldown;
      this.sonarT = 0;
      this.mode = 'off';
      return false;
    }
    this.nextPulse -= dt;
    if (this.nextPulse > 0) return false;
    this.nextPulse = VISION.sonarPeriod;
    this.sincePulse = 0;
    this.pulses++;
    return true;
  }

  /** Sonar marks' opacity 0..1 (full, then fading out over the last third of `sonarShow`). */
  get markAlpha(): number {
    const t = this.sincePulse;
    if (t >= VISION.sonarShow) return 0;
    const fade = VISION.sonarShow * 0.66;
    return t < fade ? 1 : 1 - (t - fade) / (VISION.sonarShow - fade);
  }
}
