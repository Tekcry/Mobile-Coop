import { BUTTON_ACTIONS, type ButtonAction, type ButtonState, type Vec2 } from './actions';
import { hyp2 } from '../core/mathx';

/**
 * Aggregated action state. Each source sets its own contribution per action;
 * an action is down if any source holds it. Edges latch until consumed so a
 * press is never lost on a frame that ran zero fixed steps.
 */
export class InputState {
  readonly buttons = {} as Record<ButtonAction, ButtonState>;
  private holders = {} as Record<ButtonAction, Set<string>>;
  /** Actions held during releaseAll(): ignored until every source lets go once. */
  private blocked = new Set<ButtonAction>();
  /** Move vector, x right, y forward, magnitude <= 1. Max across sources. */
  readonly move: Vec2 = { x: 0, y: 0 };
  /** Touch swipe on the cover button (stick space: x right, y up), consumed by the cover system. */
  readonly coverSwipe: Vec2 = { x: 0, y: 0 };
  private moveBySource = new Map<string, Vec2>();
  /** Accumulated look delta in radians (yaw, pitch). Consumed per render frame. */
  readonly look: Vec2 = { x: 0, y: 0 };
  /** Analogue triggers 0..1 (gamepad), used for haptics/partial ADS if wanted. */
  fireAnalog = 0;

  constructor() {
    for (const a of BUTTON_ACTIONS) {
      this.buttons[a] = { down: false, pressed: false, released: false };
      this.holders[a] = new Set();
    }
  }

  set(source: string, action: ButtonAction, down: boolean): void {
    if (this.blocked.has(action)) {
      if (!down) this.blocked.delete(action);
      return;
    }
    const holders = this.holders[action];
    const had = holders.size > 0;
    if (down) holders.add(source);
    else holders.delete(source);
    const has = holders.size > 0;
    const b = this.buttons[action];
    b.down = has;
    if (has && !had) b.pressed = true;
    if (!has && had) b.released = true;
  }

  /** Momentary tap (down+up in one go), e.g. a UI swipe or keyboard repeat. */
  tap(action: ButtonAction): void {
    this.buttons[action].pressed = true;
  }

  setMove(source: string, x: number, y: number): void {
    if (x === 0 && y === 0) this.moveBySource.delete(source);
    else this.moveBySource.set(source, { x, y });
    let bx = 0;
    let by = 0;
    let best = 0;
    for (const v of this.moveBySource.values()) {
      const m = v.x * v.x + v.y * v.y;
      if (m > best) {
        best = m;
        bx = v.x;
        by = v.y;
      }
    }
    const len = hyp2(bx, by);
    if (len > 1) {
      bx /= len;
      by /= len;
    }
    this.move.x = bx;
    this.move.y = by;
  }

  addLook(dx: number, dy: number): void {
    this.look.x += dx;
    this.look.y += dy;
  }

  private consumed: Vec2 = { x: 0, y: 0 };

  /** Take the accumulated look delta (the returned object is reused: read it before the next call). */
  consumeLook(): Vec2 {
    const v = this.consumed;
    v.x = this.look.x;
    v.y = this.look.y;
    this.look.x = 0;
    this.look.y = 0;
    return v;
  }

  pressed(a: ButtonAction): boolean {
    return this.buttons[a].pressed;
  }

  down(a: ButtonAction): boolean {
    return this.buttons[a].down;
  }

  /** Clear edges after the simulation (or UI) has seen them. */
  consumeEdges(): void {
    for (const a of BUTTON_ACTIONS) {
      const b = this.buttons[a];
      b.pressed = false;
      b.released = false;
    }
  }

  /** Drop all held state for a source (e.g. gamepad disconnected, touch layer hidden). */
  releaseSource(source: string): void {
    for (const a of BUTTON_ACTIONS) if (this.holders[a].has(source)) this.set(source, a, false);
    this.setMove(source, 0, 0);
  }

  releaseAll(): void {
    for (const a of BUTTON_ACTIONS) {
      if (this.holders[a].size > 0) this.blocked.add(a);
      this.holders[a].clear();
      this.buttons[a].down = false;
    }
    this.moveBySource.clear();
    this.move.x = 0;
    this.move.y = 0;
  }
}
