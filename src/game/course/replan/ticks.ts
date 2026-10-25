/**
 * (J14 R1 fix round, lead decision a) The re-planned yard's per-set station code: drill windows and beam trips run as a
 * set's own tick, never as an automatic timer from a gate opening. `CourseMode` (host only, map `ctcourseReplan`) calls
 * the live bay's tick once per fixed step with one `StationHooks` object made at the course start. A tick must not
 * allocate (no closures, arrays or vectors per call): keep its state in module-level numbers and its zones as constants.
 *
 * Ownership: R1 owns this file and the eight registrations below. Each set slice fills only its own stub
 * (`replan/a<n>Ticks.ts`) and never edits this file or another set's tick.
 */
import { a1Tick } from './a1Ticks';
import { a2Tick } from './a2Ticks';
import { a3Tick } from './a3Ticks';
import { a4Tick } from './a4Ticks';
import { a5Tick } from './a5Ticks';
import { a6Tick } from './a6Ticks';
import { a7Tick } from './a7Ticks';
import { a8Tick } from './a8Ticks';

/** A plan box `[minX, minZ, maxX, maxZ]` (m), optionally with a band of feet heights `[..., minY, maxY]`. */
export type TickZone = readonly [number, number, number, number] | readonly [number, number, number, number, number, number];

/** What a set's tick may read and do (host). */
export interface StationHooks {
  /** Is course flag `id` set globally (`CourseState.hasShared`: a pass zone, a gate's shared flag)? No allocation. */
  flag(id: string): boolean;
  /** The live station's number (0: none). */
  live(): number;
  /** Retry station `n` (`CourseMode.stationRetry`): only while `n` is live, its retry on and no retry under way. */
  retry(n: number, cause: 'timer' | 'seen'): boolean;
  /** How many players stand in `zone` (their feet; a downed player counts). */
  playersIn(zone: TickZone): number;
  /** The course clock (s since the course started; `CourseState.clock`). */
  now(): number;
  /**
   * (fix round 2, STATIONS section 5 "gate window") Is gate `id` open now (`CourseState.isGateOpen`)? An isolator's open
   * is its dark (`g-a2-neck`, `g-a8-night`), a console pickup's its loop (`g-a4-console`, `g-a8-console`). No allocation.
   */
  gate(id: string): boolean;
  /**
   * (fix round 2, "pair window") Is squad slot `slotId`'s guard down: knocked out, dead or gone (not up in the guard
   * manager; once a squadmate wakes him he is up again)? False for a slot the current bay's squad does not have. No
   * allocation.
   */
  down(slotId: string): boolean;
  /**
   * (fix round 2, "jam window") Is a jammer held on jam target `targetId` now (either player; the host's `CtDevices` jam
   * list)? Target ids: a camera's id (`cam-a3-hall`), a laser power panel's id, a lamp `lt-<light registry id>`. Held
   * only: a device's reboot or a lamp's off time after the jam ends is the tick's own timing. No allocation.
   */
  jammed(targetId: string): boolean;
  /**
   * (fix round 2, OQ4) Was laser `laserId` broken (a player in its beam: the same break that raises `CtDevices`' alarm)
   * while the current live station was live and since the last `epoch()` change? A break inside the hold after a retry
   * or a bay restart (the players still where they stood) does not count. Never an automatic retry: the tick decides
   * (`retry(n, 'seen')`). No allocation.
   */
  tripped(laserId: string): boolean;
  /**
   * (fix round 2) A number that rises on every station retry, bay restart and course start, and differs from every
   * earlier match's (a module counter, never reset). A tick keeps its window state in module-level numbers: it resets
   * them when this changes.
   */
  epoch(): number;
}

/** One set's station code, called each fixed step while its bay is the current one. */
export type StationTick = (h: StationHooks, dt: number) => void;

/** The re-plan's ticks by bay id (`A1`-`A8`). Static: each set slice fills its own stub file, not this map. */
export const REPLAN_TICKS: Readonly<Record<string, StationTick>> = {
  A1: a1Tick,
  A2: a2Tick,
  A3: a3Tick,
  A4: a4Tick,
  A5: a5Tick,
  A6: a6Tick,
  A7: a7Tick,
  A8: a8Tick,
};
