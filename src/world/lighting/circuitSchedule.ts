/**
 * Timed lighting circuits (marlow-final, LIGHTING-PLAN.md section 4; pure, Babylon-free).
 *
 * The facility's lighting contactors the instructors wire to each exercise (SPEC section 5 "Services"): a press on any
 * isolator of a circuit cuts it for `seconds`, then the contactor closes again and, after `rearm` seconds, the circuit
 * can be isolated again. Presses while it is cut or re-arming do nothing (no extending a window, SPEC N2). A set restart
 * puts every circuit back to lit and ready (`reset`).
 *
 * The schedule holds timing only. The host's course mode turns its events into `LightRegistry.setGroup` +
 * `StealthSystems.syncGroup` (and the `lightsOut` lure on a cut), so the registry stays the one light state the bake,
 * meter, guards and picture read (light parity). Clients never run it: they mirror the group state from the `course`
 * message's `lights.groups` and the seconds left from the gate timer (`PackedCourse.gates[].t`), no wire change.
 *
 * Allocation-free after construction: typed arrays, no closures, no per-step objects.
 */

/** Phases: lit and ready, cut (dark), lit and re-arming. */
export const CIRCUIT_READY = 0;
export const CIRCUIT_CUT = 1;
export const CIRCUIT_REARM = 2;

/** Event bits, ORed per circuit until `clearEvents`. */
export const EV_CUT = 1;
export const EV_RESTORE = 2;
/** The window has `warn` seconds left (LANTERN: "Lights back in five."). */
export const EV_WARN = 4;
/** Re-armed: the isolators work again. */
export const EV_READY = 8;

/** Default warning before a cut circuit comes back (s). */
export const CIRCUIT_WARN = 5;

export interface CircuitTiming {
  /** Seconds the circuit stays cut. */
  seconds: number;
  /** Seconds after the restore before the isolators work again (0 = at once). */
  rearm: number;
}

export class CircuitSchedule {
  readonly n: number;
  private readonly secs: Float64Array;
  private readonly rearms: Float64Array;
  private readonly ph: Uint8Array;
  private readonly left: Float64Array;
  private readonly ev: Uint8Array;
  /** Circuits with an event since the last `clearEvents` (a cheap "anything to do" test). */
  pending = 0;

  constructor(timings: readonly CircuitTiming[], readonly warn = CIRCUIT_WARN) {
    const n = timings.length;
    this.n = n;
    this.secs = new Float64Array(n);
    this.rearms = new Float64Array(n);
    this.ph = new Uint8Array(n);
    this.left = new Float64Array(n);
    this.ev = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const t = timings[i]!;
      if (!(t.seconds > 0) || !(t.rearm >= 0)) throw new Error(`circuit ${i}: seconds must be > 0 and rearm >= 0`);
      this.secs[i] = t.seconds;
      this.rearms[i] = t.rearm;
    }
  }

  /** A player pressed one of circuit `i`'s isolators. True when it cut the circuit (it was lit and ready). */
  press(i: number): boolean {
    if (i < 0 || i >= this.n || this.ph[i] !== CIRCUIT_READY) return false;
    this.ph[i] = CIRCUIT_CUT;
    this.left[i] = this.secs[i]!;
    this.mark(i, EV_CUT);
    return true;
  }

  /** Advance every circuit by `dt` seconds (the host's fixed step). Returns how many circuits gained an event. */
  step(dt: number): number {
    let n = 0;
    for (let i = 0; i < this.n; i++) {
      const p = this.ph[i]!;
      if (p === CIRCUIT_READY) continue;
      const was = this.left[i]!;
      const t = was - dt;
      const before = this.ev[i]!;
      if (p === CIRCUIT_CUT) {
        if (was > this.warn && t <= this.warn && t > 0) this.mark(i, EV_WARN);
        if (t <= 0) {
          this.mark(i, EV_RESTORE);
          const r = this.rearms[i]!;
          // the overshoot carries into the re-arm, so a long step never loses time
          if (r + t > 0) {
            this.ph[i] = CIRCUIT_REARM;
            this.left[i] = r + t;
          } else {
            this.ph[i] = CIRCUIT_READY;
            this.left[i] = 0;
            this.mark(i, EV_READY);
          }
        } else this.left[i] = t;
      } else if (t <= 0) {
        this.ph[i] = CIRCUIT_READY;
        this.left[i] = 0;
        this.mark(i, EV_READY);
      } else this.left[i] = t;
      if (this.ev[i] !== before) n++;
    }
    return n;
  }

  /** The circuit's lamps should be on (lit or re-arming). */
  lit(i: number): boolean {
    return this.ph[i] !== CIRCUIT_CUT;
  }

  /** An isolator press would cut it now. */
  ready(i: number): boolean {
    return this.ph[i] === CIRCUIT_READY;
  }

  phase(i: number): number {
    return this.ph[i] ?? CIRCUIT_READY;
  }

  /** Seconds left in the current phase (the objective line's "Lights back in 9 s" while cut; 0 when ready). */
  remaining(i: number): number {
    return this.left[i] ?? 0;
  }

  /** The events circuit `i` gained since the last `clearEvents` (`EV_*` bits). */
  events(i: number): number {
    return this.ev[i] ?? 0;
  }

  clearEvents(): void {
    if (this.pending === 0) return;
    this.ev.fill(0);
    this.pending = 0;
  }

  /** A set restart: every circuit lit and ready, no events (the restore itself is the caller's `resetLights`). */
  reset(): void {
    this.ph.fill(CIRCUIT_READY);
    this.left.fill(0);
    this.ev.fill(0);
    this.pending = 0;
  }

  /** Mirror or test hook: put circuit `i` in a phase with `left` seconds to go (no events). */
  setPhase(i: number, phase: number, left: number): void {
    if (i < 0 || i >= this.n) return;
    this.ph[i] = phase === CIRCUIT_CUT || phase === CIRCUIT_REARM ? phase : CIRCUIT_READY;
    this.left[i] = this.ph[i] === CIRCUIT_READY ? 0 : Math.max(0, left);
  }

  private mark(i: number, bit: number): void {
    if (this.ev[i] === 0) this.pending++;
    this.ev[i] = this.ev[i]! | bit;
  }
}
