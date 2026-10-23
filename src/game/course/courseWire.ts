/**
 * The `course` message body (host -> all, pure): the packed course state plus what clients apply to their own world:
 * locked door indices (`Doors.list` index), locked anchor ids, light groups on / off and destroyed lamp ids. And the
 * client-reported drill verbs (DECISIONS C10) with their rate limit.
 */
import type { PackedCourse } from './courseState';
import type { SecWire } from '../ctDevices';
import type { SectorRatingWire } from '../sectors';

/** (marlow-final S10, M2) The host's set-restart banner: the co-op client runs its own `checkpointReset` on it (an
 *  existing `banner` event: no wire change). */
export const COURSE_RESTART_TITLE = 'RESTART';

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
  /** (CT prototype B3) The cameras' clock, who jams what, the charges and the alarm stage. */
  sec?: SecWire;
  /** (section-rating S6, protocol 42) The last rated set: `sec` its bay index (-1 none yet), the marks, synced and the
   *  grant the client's own kit takes (zero for the course's last set, rated at the finish). */
  rt?: SectorRatingWire;
  /** (section-rating S6 fix, inside protocol 42) Every set's rating so far, by bay (`packRated`): a late joiner or a
   *  reloaded rejoiner rebuilds its results lines from it (no grant). */
  rh?: number[];
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

/** (S6 fix) The most bays `rh` carries. */
export const RH_MAX = 64;
/** (S6 fix) One `rh` entry: -1 an unrated set (or not rated yet), else marks (0-15) + 16 x synced. */
export const RH_HI = 15 + 16 * 99;

/** (S6 fix) Pack every bay's rating for the course message: `marks[i]` -1 unrated, else marks + 16 x `synced[i]`. */
export function packRated(marks: readonly number[], synced: readonly number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < marks.length && i < RH_MAX; i++) {
    const m = marks[i]!;
    out.push(m < 0 ? -1 : (m & 15) + 16 * Math.max(0, Math.min(99, synced[i] ?? 0)));
  }
  return out;
}

/** (S6 fix) One packed `rh` entry back: null for an unrated set. */
export function unpackRated(v: number): { marks: number; synced: number } | null {
  if (!(v >= 0)) return null;
  return { marks: v & 15, synced: Math.floor(v / 16) };
}
