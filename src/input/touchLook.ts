/**
 * (marlow-bays item 29, Michael's touch scope "Menus + camera") Touch in the game outside the tuner, the pure part (no
 * DOM; unit-tested in `tests/tunerV3.test.ts`): one finger dragged on the game view looks around (the camera only: no
 * touch movement, fire or aim; M21 stays for play), and whether the last input was a touch (the on-screen pause button
 * shows only then). The DOM wiring is `InputManager`'s. Allocation-free.
 */

/** Look per px of finger travel (rad), before the mouse sensitivity (a 400 px swipe turns about 115 degrees at 1x). */
export const TOUCH_LOOK_RAD_PER_PX = 0.005;

/** One finger's drag on the game view: the first finger down owns it; a second is ignored until it lifts. */
export class TouchLook {
  /** The last move's travel (px). */
  dx = 0;
  dy = 0;
  private id = -1;
  private x = 0;
  private y = 0;

  get active(): boolean {
    return this.id >= 0;
  }

  /** A finger went down on the game view. False: another finger already drags. */
  down(id: number, x: number, y: number): boolean {
    if (this.id >= 0) return false;
    this.id = id;
    this.x = x;
    this.y = y;
    this.dx = this.dy = 0;
    return true;
  }

  /** A finger moved. True (with `dx`, `dy`) when it is the dragging finger and it moved. */
  move(id: number, x: number, y: number): boolean {
    if (id !== this.id) return false;
    this.dx = x - this.x;
    this.dy = y - this.y;
    this.x = x;
    this.y = y;
    return this.dx !== 0 || this.dy !== 0;
  }

  /** A finger lifted (or the gesture was cancelled). */
  up(id: number): void {
    if (id === this.id) this.id = -1;
  }

  /** Every finger dropped (a menu opened, the window lost focus). */
  reset(): void {
    this.id = -1;
    this.dx = this.dy = 0;
  }
}

/**
 * The last input after a press: a touch sets it, a mouse press, a key or the pad clears it ('' : this press says nothing,
 * a pen keeps what it was).
 */
export function lastTouchAfter(was: boolean, pointerType: string): boolean {
  if (pointerType === 'touch') return true;
  if (pointerType === 'mouse') return false;
  return was;
}

/** The look (yaw, pitch rad) of a drag (`dx`, `dy` px), at the mouse sensitivity and invert setting. */
export function touchLookDelta(dx: number, dy: number, sensitivity: number, invertY: boolean, out: { yaw: number; pitch: number }): { yaw: number; pitch: number } {
  const k = TOUCH_LOOK_RAD_PER_PX * sensitivity;
  out.yaw = dx * k;
  out.pitch = (invertY ? 1 : -1) * dy * k;
  return out;
}
