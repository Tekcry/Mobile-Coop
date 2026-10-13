/**
 * The `course` message body (host -> all, pure): the packed course state plus what clients apply to their own world:
 * locked door indices (`Doors.list` index), locked anchor ids, light groups on / off and destroyed lamp ids. And the
 * client-reported drill verbs (DECISIONS C10) with their rate limit.
 */
import type { PackedCourse } from './courseState';

export interface CourseWire {
  s: PackedCourse;
  locks: number[];
  anchors: number[];
  lights: { groups: [number, boolean][]; dead: number[] };
  /** The last refusal P2's own press got (an airlock or a gate), shown on the client when `rn` moves on. */
  ref: string;
  /** Refusal counter (0 = none yet this match). */
  rn: number;
}

/** Verbs only the client can see (gear, stance, vision, ping, aim, reload, swap): sent as `ctick` (C10). */
export const CLIENT_VERBS = ['gear', 'stance', 'vision', 'ping', 'aim', 'reload', 'swap'] as const;
export type ClientVerb = (typeof CLIENT_VERBS)[number];
/** `ctick` messages a client may send per second (the host drops the rest). */
export const CTICK_RATE = 4;

/** Token bucket: `CTICK_RATE` a second (burst `CTICK_RATE`). */
export class TickLimiter {
  private tokens = CTICK_RATE;
  private last = 0;
  take(now: number): boolean {
    this.tokens = Math.min(CTICK_RATE, this.tokens + (now - this.last) * CTICK_RATE);
    this.last = now;
    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return true;
  }
}

/**
 * Rising edges of the stance, aim, reload and weapon-swap verbs (C10), one fixed step at a time. The first step only
 * primes (a match start is not a swap). Writes into `out` (cleared first): no allocation per step.
 */
export class VerbEdges {
  private crouch = false;
  private ads = false;
  private reload = false;
  private weapon = '';
  private primed = false;

  step(crouch: boolean, ads: boolean, reload: boolean, weapon: string, out: ClientVerb[]): void {
    out.length = 0;
    if (this.primed) {
      if (crouch !== this.crouch) out.push('stance');
      if (ads && !this.ads) out.push('aim');
      if (reload && !this.reload) out.push('reload');
      if (weapon !== this.weapon) out.push('swap');
    }
    this.primed = true;
    this.crouch = crouch;
    this.ads = ads;
    this.reload = reload;
    this.weapon = weapon;
  }
}
