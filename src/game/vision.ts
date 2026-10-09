/**
 * Goggle vision modes (pure), unit-tested. One button cycles off -> night vision -> sonar -> off.
 *
 * Night vision brightens the dark (rendering only; gameplay light is unchanged: being seen still depends on the light
 * on you). (Step 4b fix round 3, Michael 2026-10-09) it does not fade: the goggles flip down (or up) in front of the
 * eyes over `VISION.flip` s, and the image switches at the middle, while the housing covers the view. Sonar pulses every `sonarPeriod` s while on, revealing enemies within `sonarRange`
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
  /** The goggles flipping down / up in front of the eyes (s); night vision switches at the middle. */
  flip: 0.2,
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
  /** Night vision on (1) or off (0): no fade, it switches at the middle of the flip. */
  night = 0;
  /** Time into the goggles' flip (s; `VISION.flip` = done) and its direction (true: flipping down, on). */
  private flipT: number = VISION.flip;
  private flipDown = true;

  /** Sonar available (Perfectionist difficulty has none). */
  sonarAllowed = true;

  /** The vision button: off -> night -> sonar (unless recharging or not allowed) -> off. */
  cycle(): VisionMode {
    if (this.mode === 'off') this.set('night');
    else if (this.mode === 'night') this.set(this.cooldown > 0 || !this.sonarAllowed ? 'off' : 'sonar');
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
    const want = this.mode === 'night' ? 1 : 0;
    if (want !== this.night && this.flipT >= VISION.flip) {
      this.flipT = 0;
      this.flipDown = want === 1;
    }
    if (this.flipT < VISION.flip) {
      this.flipT = Math.min(VISION.flip, this.flipT + dt);
      if (this.flipT >= VISION.flip / 2) this.night = want;
    }
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

  /** The flip in progress: 0..1 (1 = none). */
  get flipPhase(): number {
    return this.flipT / VISION.flip;
  }

  /**
   * The goggles' housing across the view, as the centre of a dark band in screen height (0 bottom, 1 top): flipping
   * down it sweeps from above the screen to below it, flipping up the other way; it covers the whole view at the middle.
   * NaN when no flip is running.
   */
  get flipCentre(): number {
    const t = this.flipPhase;
    if (t >= 1) return NaN;
    return this.flipDown ? 1.7 - 2.4 * t : -0.7 + 2.4 * t;
  }

  /** Sonar marks' opacity 0..1 (full, then fading out over the last third of `sonarShow`). */
  get markAlpha(): number {
    const t = this.sincePulse;
    if (t >= VISION.sonarShow) return 0;
    const fade = VISION.sonarShow * 0.66;
    return t < fade ? 1 : 1 - (t - fade) / (VISION.sonarShow - fade);
  }
}
