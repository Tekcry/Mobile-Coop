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
