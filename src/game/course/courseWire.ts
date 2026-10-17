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
  /** LANTERN's last radio line as the host said it (the client says it when `rln` moves on). */
  rl?: string;
  /** Radio line counter (0 = none yet this match). */
  rln?: number;
}

/**
 * Verbs only the client can see (gear, sprint, stance, vision, ping, aim, fire, reload, swap, dark, and `gadget` for a
 * placed gadget: a sticky cam or mine never reaches the host): derived by `DrillDetect` on the client and sent as
 * `ctick` (C10). Everything else the host derives from what it sees: movement modes, team moves, takedowns (`td`),
 * thrown gadgets (`gadget`: gadget and throw) and doors (`use`) resolve on the host (DECISIONS A23).
 */
export const CLIENT_VERBS = ['gear', 'sprint', 'stance', 'vision', 'ping', 'aim', 'fire', 'reload', 'swap', 'dark', 'gadget'] as const;
export type ClientVerb = (typeof CLIENT_VERBS)[number];
/** Is `v` a client-reported verb (allocation-free)? */
export function isClientVerb(v: string): v is ClientVerb {
  for (let i = 0; i < CLIENT_VERBS.length; i++) if (CLIENT_VERBS[i] === v) return true;
  return false;
}
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
