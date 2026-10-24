/**
 * (guard-ai S22, Michael's walk of 4.72 G6: "if i turn it off while hes distracted, he should notice when he sees it and
 * turn it back on also.") A security console switched off is a fault, as a breaker cut is (S15, `breaker.ts`): the guard
 * who next SEES it off (in his sight field, a clear line, not through walls; a guard busy with a distraction, a check or
 * a search notices only once he is calm and free again) walks over at patrol pace and turns it back on through the
 * console's own toggle path. A second switch-off noticed inside `BREAKER.repeatT` s of the last is tampering: the S2
 * light-style check at the console (1-2 go, the ring, the radio); once that check is over, the next guard who sees it
 * still off turns it back on.
 *
 * Reuse, not a copy: a console rides the breaker walk and the board's `breaker` / `light` incidents as a pseudo circuit
 * (`CONSOLE_GROUP` + its index); `EnemyManager.breakerOff` / `breakerReset` route those groups to the `ConsoleHost`. This
 * file holds only what differs: the console table (`ConsoleFaults`), the sight rule (`consoleInView`) and the verdict
 * (`notice`). Pure (no Babylon / DOM), allocation-free after registration, unit-tested (`tests/consoleFault.test.ts`).
 */
import { BREAKER } from './gear';
import { lightInView } from './incidents';
import { PERCEPTION } from './perception';

/** The game's consoles as the guards use them (`CourseMode` implements it after marlow-final, `slices/S22.md`). */
export interface ConsoleHost {
  /** Turn console `id` back on through its own toggle path (the cameras come back, the co-op sync follows); false: it
   *  was not off (or cannot be). The game also calls `EnemyManager.consoleState(id, .., true)` as for any toggle. */
  reset(id: string): boolean;
}

/**
 * The console fault's numbers (starting values, G4). `range`: he notices it in his focused cone within this many m;
 * `near`: within this many m his peripheral field counts too (a dark screen beside him); `screenY`: the screens' height
 * above the console's floor (the point he looks at); `retry`: s before the same console may be noticed again after a
 * notice (the board had nobody to send, the walk was dropped); `enabled` false: consoles are ignored.
 */
export const CONSOLE_FAULT = { enabled: true, range: 12, near: 4, screenY: 1.1, retry: 3 } as const;

/** Pseudo circuit groups of consoles (`CONSOLE_GROUP` + index): far above any map's light group. */
export const CONSOLE_GROUP = 50000;

/** Is breaker group `g` a console (`CONSOLE_GROUP` + index)? */
export function isConsoleGroup(g: number): boolean {
  return g >= CONSOLE_GROUP;
}

/** A notice's verdict: the reset walk, or tampering (the S2 light-style check). */
export const V_FAULT = 1;
export const V_TAMPER = 2;

/**
 * Is a console's screen point (cx, cy, cz) in the sight field of a guard whose eye is at (ex, ey, ez), facing `yaw`?
 * The focused cone to `CONSOLE_FAULT.range`, the peripheral field to `CONSOLE_FAULT.near`. The line of sight is the
 * caller's (one ray). No allocation.
 */
export function consoleInView(ex: number, ey: number, ez: number, yaw: number, cx: number, cy: number, cz: number): boolean {
  const P = PERCEPTION;
  return lightInView(ex, ey, ez, yaw, cx, cy, cz, P.focusHalf, CONSOLE_FAULT.range, P.periphHalf, CONSOLE_FAULT.near);
}

/**
 * The consoles of a match by id (registered on their first `set`; a handful). Per console: its floor point, on / off,
 * the count of its switch-offs (`cut`), the cut the guards first noticed (`noticed`: its verdict is decided once), the
 * board time of the last noticed cut (`lastFault`, the tampering clock), the incident reported for it (`inc`) and the
 * time before which it is not noticed again (`holdT`).
 */
export class ConsoleFaults {
  readonly ids: string[] = [];
  x = new Float32Array(4);
  y = new Float32Array(4);
  z = new Float32Array(4);
  on = new Uint8Array(4);
  cut = new Int32Array(4);
  noticed = new Int32Array(4);
  lastFault = new Float64Array(4);
  inc = new Int32Array(4);
  holdT = new Float64Array(4);
  n = 0;
  /** The last `set` switched its console off (a new cut). */
  fresh = false;

  /** Forget every console (a section load, a restart: the game reports each again on its next toggle). */
  clear(): void {
    this.ids.length = 0;
    this.n = 0;
  }

  /** Index of console `id`, -1. No allocation. */
  indexOf(id: string): number {
    const ids = this.ids;
    for (let i = 0; i < this.n; i++) if (ids[i] === id) return i;
    return -1;
  }

  /** The console of pseudo circuit group `g`, -1. */
  ofGroup(g: number): number {
    const i = g - CONSOLE_GROUP;
    return i >= 0 && i < this.n ? i : -1;
  }

  /** Console `i`'s pseudo circuit group. */
  group(i: number): number {
    return CONSOLE_GROUP + i;
  }

  private grow(): void {
    const c = this.x.length * 2;
    const f32 = (a: Float32Array) => {
      const b = new Float32Array(c);
      b.set(a);
      return b;
    };
    const i32 = (a: Int32Array) => {
      const b = new Int32Array(c);
      b.set(a);
      return b;
    };
    const f64 = (a: Float64Array) => {
      const b = new Float64Array(c);
      b.set(a);
      return b;
    };
    this.x = f32(this.x);
    this.y = f32(this.y);
    this.z = f32(this.z);
    const on = new Uint8Array(c);
    on.set(this.on);
    this.on = on;
    this.cut = i32(this.cut);
    this.noticed = i32(this.noticed);
    this.lastFault = f64(this.lastFault);
    this.inc = i32(this.inc);
    this.holdT = f64(this.holdT);
  }

  /**
   * Console `id` at (x, y floor, z) is now `on` (the game reports every toggle). Returns its index; `fresh` (read
   * after the call) is true when this call switched it off (a new cut). A console first seen off counts as a cut.
   */
  set(id: string, x: number, y: number, z: number, on: boolean): number {
    let i = this.indexOf(id);
    this.fresh = false;
    if (i < 0) {
      if (this.n >= this.x.length) this.grow();
      i = this.n++;
      this.ids[i] = id;
      this.on[i] = 1;
      this.cut[i] = 0;
      this.noticed[i] = 0;
      this.lastFault[i] = -Infinity;
      this.inc[i] = -1;
      this.holdT[i] = -Infinity;
    }
    this.x[i] = x;
    this.y[i] = y;
    this.z[i] = z;
    const was = this.on[i] === 1;
    this.on[i] = on ? 1 : 0;
    if (was && !on) {
      this.cut[i] = this.cut[i]! + 1;
      this.holdT[i] = -Infinity;
      this.inc[i] = -1;
      this.fresh = true;
    }
    return i;
  }

  /** Console `i` is off. */
  isOff(i: number): boolean {
    return i >= 0 && i < this.n && this.on[i] === 0;
  }

  /** Console `i` may be noticed now: off, past its hold, and nobody is on it (`busy`: a guard walking to it, its check
   *  incident still open; the caller's). */
  pending(i: number, now: number, busy: boolean): boolean {
    return this.on[i] === 0 && now >= this.holdT[i]! && !busy;
  }

  /**
   * A guard noticed console `i` off at board time `now`: the verdict. The first notice of a cut decides it: another
   * cut noticed inside `BREAKER.repeatT` s of the last noticed one is tampering (`V_TAMPER`), else a fault (`V_FAULT`);
   * the same cut noticed again (its check is over, the walk was dropped, nobody was free) is the reset walk. Holds
   * further notices `CONSOLE_FAULT.retry` s.
   */
  notice(i: number, now: number): number {
    this.holdT[i] = now + CONSOLE_FAULT.retry;
    const cut = this.cut[i]!;
    if (this.noticed[i] === cut) return V_FAULT;
    this.noticed[i] = cut;
    const tamper = now - this.lastFault[i]! < BREAKER.repeatT;
    this.lastFault[i] = now;
    return tamper ? V_TAMPER : V_FAULT;
  }
}
