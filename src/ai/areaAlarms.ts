/**
 * Per-area alarm stages (pure: no Babylon / DOM, no flag read, no `src/game` import), unit-tested
 * (guard-ai-mission-hooks S3, D6, A9, A10; flag `areaAlarms`, read by the manager only).
 *
 * A mission may split a section into up to two alarm areas (Campaign Build's track shape, C5: plan boxes and an optional
 * height band). A guard's area is the area holding the point he was placed at (A10: his spawn point; a reinforcement's
 * entry point), fixed for the section; no box holds it: -1, the site only.
 *
 * The stages nest under the site stage (A9): a panel raises the site stage as today; a guard's radio command call
 * raises his area's stage only. A guard reads max(site, his area) for gear and calm rules (`AreaStages.stageFor`).
 *
 * Each area has its own repeat lock and count on J15 S5's rule (`ALARM_REPEAT`, `EnemyManager.repeatStep`): after an
 * area alarm the next in that area may be raised once its response is in (a member of a team it brought is searching)
 * or `ALARM_REPEAT.rearm` s after it, at most `ALARM_REPEAT.max` per area per section load. One area's alarm never
 * shuts the other's lock, and the site lock (the panels') is the manager's own, independent of both (S3-c). This module
 * holds the state; the manager applies the rule (who raises, team search, command calls).
 *
 * Allocation-free: `AreaStages` is sized once (typed arrays of `AREAS.max`) and no method allocates. `areaOf` runs at
 * placement and `setAreas` only, never per step.
 */
import { ALARM_REPEAT } from './alarm';

/** An alarm area (Campaign Build's track shape, C5): plan boxes [minX, minZ, maxX, maxZ] and an optional height
 *  band [lo, hi] (m). */
export interface AreaBox {
  boxes: readonly (readonly [number, number, number, number])[];
  y?: readonly [number, number];
}

/** (S3-g) At most two alarm areas per section; a third area and later are ignored. */
export const AREAS = { max: 2 } as const;

/** The site (no area; a panel alarm). */
export const SITE = -1;

/**
 * (A10) The alarm area holding a point: the first area `i < AREAS.max` with a box holding (x, z) (edges included) and,
 * when it has a height band, `lo <= y <= hi`; else `SITE` (-1). `null` / `[]`: -1. Placement time only.
 */
export function areaOf(areas: readonly AreaBox[] | null, x: number, z: number, y: number): number {
  if (!areas) return SITE;
  const n = areas.length < AREAS.max ? areas.length : AREAS.max;
  for (let i = 0; i < n; i++) {
    const a = areas[i]!;
    const band = a.y;
    if (band && (y < band[0] || y > band[1])) continue;
    const bs = a.boxes;
    for (let j = 0; j < bs.length; j++) {
      const b = bs[j]!;
      if (x >= b[0] && x <= b[2] && z >= b[1] && z <= b[3]) return i;
    }
  }
  return SITE;
}

/**
 * (A9, S3-a / S3-c) The site stage over two area stages, and one repeat lock and count per area (J15 S5's rule). Fixed
 * typed arrays sized `AREAS.max`; methods take an area index 0..`AREAS.max - 1` (the manager checks the range, except
 * `stageFor`, which reads any index). No method allocates.
 */
export class AreaStages {
  /** The site stage (mirrored from `EnemyManager.setAlarmStage`). */
  site = 0;
  /** Each area's own stage (`EnemyManager.setAreaStage`, C5). */
  readonly stage = new Int8Array(AREAS.max);

  // The lock per area (J15 S5's site fields, one per area)
  /** An area alarm was raised since the load (1). */
  readonly raised = new Uint8Array(AREAS.max);
  /** The lock opened again since the last raise (1): its response is in, or `ALARM_REPEAT.rearm` s passed. */
  readonly rearmed = new Uint8Array(AREAS.max);
  /** Area alarms raised this load. */
  readonly count = new Uint8Array(AREAS.max);
  /** Seconds since the area's last raise (counted while it waits to rearm). */
  readonly ago = new Float32Array(AREAS.max);
  /** The response teams the area's last alarm brought: `teams[team0]` up to, not including, `teams[teamN]`. */
  readonly team0 = new Int32Array(AREAS.max);
  readonly teamN = new Int32Array(AREAS.max);

  /** A guard's stage: max(site, his area's stage); an area outside 0..`AREAS.max - 1` (-1: site only) reads the site. */
  stageFor(area: number): number {
    if (area < 0 || area >= AREAS.max) return this.site;
    const s = this.stage[area]!;
    return s > this.site ? s : this.site;
  }

  /** May an alarm be raised in area `a` now: none raised since the load, or its lock opened since the last. */
  open(a: number): boolean {
    return this.raised[a] === 0 || this.rearmed[a] === 1;
  }

  /** An area alarm (either area) was raised since the load. */
  any(): boolean {
    for (let a = 0; a < AREAS.max; a++) if (this.raised[a] === 1) return true;
    return false;
  }

  /** Area `a` raised its alarm: the lock shuts, its clock and count start. `teams`: the manager's team count now (the
   *  first team this alarm may bring); the manager sets `teamN[a]` after `onAlarm`, as J15 does for the site. */
  raise(a: number, teams: number): void {
    this.raised[a] = 1;
    this.rearmed[a] = 0;
    this.ago[a] = 0;
    this.count[a] = this.count[a]! + 1;
    this.team0[a] = teams;
    this.teamN[a] = teams;
  }

  /** Area `a` waits for its lock to open: repeats on (`repeatOn`: the manager's `alarmRepeat`, and
   *  `ALARM_REPEAT.enabled`), raised and not rearmed, and fewer than `ALARM_REPEAT.max` raised this load. */
  waiting(a: number, repeatOn: boolean): boolean {
    if (!repeatOn || !ALARM_REPEAT.enabled || this.raised[a] !== 1 || this.rearmed[a] !== 0) return false;
    const n = this.count[a]!;
    return n >= 1 && n < ALARM_REPEAT.max;
  }

  /** Per step while `waiting`: the clock runs; true once `ALARM_REPEAT.rearm` s have passed since the raise. */
  tick(a: number, dt: number): boolean {
    const t = this.ago[a]! + dt;
    this.ago[a] = t;
    return t >= ALARM_REPEAT.rearm;
  }

  /** Area `a`'s lock opens (its response is in, or the rearm time passed). */
  rearm(a: number): void {
    this.rearmed[a] = 1;
  }

  /** Every section load / restart (with J15's `resetAlarm`): every lock, clock, count and team range back to 0. The
   *  stages stay (the mission's, S3-e). */
  resetLocks(): void {
    this.raised.fill(0);
    this.rearmed.fill(0);
    this.count.fill(0);
    this.ago.fill(0);
    this.team0.fill(0);
    this.teamN.fill(0);
  }

  /** The site and area stages back to 0 (`EnemyManager.setAreas`). The locks stay. */
  clearStages(): void {
    this.site = 0;
    this.stage.fill(0);
  }
}
