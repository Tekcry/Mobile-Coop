/**
 * Goggle vision modes (pure), unit-tested. One button cycles off -> thermal -> electro -> night -> off (CT order,
 * G100; prototype A5: an instant cut, no flip, no transition).
 *
 * Every mode is rendering only: gameplay never reads it (being seen still depends on the light on you; the light
 * meter, perception and the wire never see `VisionState`, D8). Night vision is a gain in the lighting; thermal and
 * electro are branches of the cinematic post shader (`vk`) plus render-only emissive flags on warm bodies and
 * electrical devices.
 */

export type VisionMode = 'off' | 'night' | 'thermal' | 'electro';

/** The button's cycle order (CT: thermal, electro, night, off). */
export const VISION_CYCLE: readonly VisionMode[] = ['off', 'thermal', 'electro', 'night'];

/** The post shader's mode index (`CinematicPost` uniform `vk`): 0 off / night, 1 thermal, 2 electro. */
export function visionKind(m: VisionMode): number {
  return m === 'thermal' ? 1 : m === 'electro' ? 2 : 0;
}

/** The HUD label for a mode ('' = off). */
export function visionLabel(m: VisionMode): string {
  return m === 'night' ? 'NV' : m === 'thermal' ? 'THERMAL' : m === 'electro' ? 'ELECTRO' : '';
}

export class VisionState {
  /** The mode the button chose; the image is that mode at once. */
  mode: VisionMode = 'off';

  /** The mode on screen (always the chosen one: no flip). */
  get shown(): VisionMode {
    return this.mode;
  }

  /** Night vision on screen (1) or not (0). */
  get night(): number {
    return this.mode === 'night' ? 1 : 0;
  }

  /** The vision button: off -> thermal -> electro -> night -> off (an instant cut). */
  cycle(): VisionMode {
    const i = VISION_CYCLE.indexOf(this.mode);
    this.mode = VISION_CYCLE[(i + 1) % VISION_CYCLE.length]!;
    return this.mode;
  }

  set(m: VisionMode): void {
    this.mode = m;
  }

  /** Goggles up at once (respawn, a new match). */
  reset(): void {
    this.mode = 'off';
  }

  /** The post shader's mode index for the image on screen. */
  get kind(): number {
    return visionKind(this.mode);
  }
}
