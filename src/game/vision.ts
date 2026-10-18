/**
 * Goggle vision modes (pure), unit-tested. One button cycles off -> night -> thermal -> electro -> off (bible 5.5,
 * step 14).
 *
 * Every mode is rendering only: gameplay never reads it (being seen still depends on the light on you; the light
 * meter, perception and the wire never see `VisionState`, D8). Night vision is a gain in the lighting; thermal and
 * electro are branches of the cinematic post shader (`vk`) plus render-only emissive flags on warm bodies and
 * electrical devices. (Step 4b fix round 3, Michael 2026-10-09) nothing fades: the goggles flip down (or up) in front
 * of the eyes over `VISION.flip` s, and the image switches at the middle, while the housing covers the view.
 */

export type VisionMode = 'off' | 'night' | 'thermal' | 'electro';

/** The button's cycle order. */
export const VISION_CYCLE: readonly VisionMode[] = ['off', 'night', 'thermal', 'electro'];

export const VISION = {
  /** The goggles flipping down / up in front of the eyes (s); the image switches at the middle. */
  flip: 0.2,
} as const;

/** The post shader's mode index (`CinematicPost` uniform `vk`): 0 off / night, 1 thermal, 2 electro. */
export function visionKind(m: VisionMode): number {
  return m === 'thermal' ? 1 : m === 'electro' ? 2 : 0;
}

/** The HUD label for a mode ('' = off). */
export function visionLabel(m: VisionMode): string {
  return m === 'night' ? 'NV' : m === 'thermal' ? 'THERMAL' : m === 'electro' ? 'ELECTRO' : '';
}

export class VisionState {
  /** The mode the button chose (the image follows at the middle of the flip: `shown`). */
  mode: VisionMode = 'off';
  /** The mode on screen. */
  shown: VisionMode = 'off';
  /** Night vision on screen (1) or not (0): no fade, it switches at the middle of the flip. */
  night = 0;
  /** Time into the goggles' flip (s; `VISION.flip` = done), its direction (true: flipping down) and its target. */
  private flipT: number = VISION.flip;
  private flipDown = true;
  private flipTo: VisionMode = 'off';

  /** The vision button: off -> night -> thermal -> electro -> off. */
  cycle(): VisionMode {
    const i = VISION_CYCLE.indexOf(this.mode);
    this.mode = VISION_CYCLE[(i + 1) % VISION_CYCLE.length]!;
    return this.mode;
  }

  set(m: VisionMode): void {
    this.mode = m;
  }

  /** Goggles up at once, no flip (respawn, a new match). */
  reset(): void {
    this.mode = this.shown = this.flipTo = 'off';
    this.night = 0;
    this.flipT = VISION.flip;
  }

  /** The post shader's mode index for the image on screen. */
  get kind(): number {
    return visionKind(this.shown);
  }

  /** Advance the goggles' flip: each switch is one flip, the image changing at its middle. */
  step(dt: number): void {
    if (this.mode !== this.shown && this.flipT >= VISION.flip) {
      this.flipT = 0;
      this.flipTo = this.mode;
      // off -> a mode: flip down; a mode -> off: flip up; mode -> mode: the housing passes down again
      this.flipDown = this.mode !== 'off';
    }
    if (this.flipT < VISION.flip) {
      this.flipT = Math.min(VISION.flip, this.flipT + dt);
      if (this.flipT >= VISION.flip / 2) {
        this.shown = this.flipTo;
        this.night = this.shown === 'night' ? 1 : 0;
      }
    }
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
}
