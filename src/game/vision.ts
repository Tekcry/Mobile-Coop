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

/** (F1a, G181) The wheel's stack order, top to bottom: night first (CT), then thermal, electro. */
export const VISION_WHEEL: readonly Exclude<VisionMode, 'off'>[] = ['night', 'thermal', 'electro'];

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
  /** (F1a, G181) The mode the wheel picked: what the vision button turns on and off (night first, as in CT). */
  selected: Exclude<VisionMode, 'off'> = 'night';
  /** (F1a, gog-1) What the last change was: the goggle flip belongs to 'on' / 'off' only, never to a 'switch' between modes
   *  (the flip visual itself is not rebuilt in this slice: A5 made every change an instant cut). */
  change: 'none' | 'on' | 'off' | 'switch' = 'none';
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

  /** The vision button (D-pad left / N): the selected mode on, or off. */
  toggle(): VisionMode {
    this.mode = this.mode === 'off' ? this.selected : 'off';
    this.change = this.mode === 'off' ? 'off' : 'on';
    return this.mode;
  }

  /** The wheel picked a mode: it becomes the selected one; if the goggles are on they change to it (a switch, an instant cut). */
  select(m: Exclude<VisionMode, 'off'>): void {
    this.selected = m;
    if (this.mode !== 'off' && this.mode !== m) {
      this.mode = m;
      this.change = 'switch';
    }
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
