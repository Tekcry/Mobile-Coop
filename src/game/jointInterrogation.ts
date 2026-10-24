/**
 * (joint-interrogation, G148, bible 5.4) The co-op joint interrogation, pure and Babylon-free. CT: both players question
 * the same captive, and some intel comes only this way. The holder reads the guard's face (the existing INTERROGATE);
 * the partner beside the hold bluffs (the BLUFF row, speech only). When the holder's read ends while a bluff on that guard
 * is live (started at most `JOINT.window` s ago, the bluffer alive and within `JOINT.reach` m of him), the guard also
 * gives his joint-only lines (`GuardIntel.joint`). The host owns the bluffs (`CoopHost.bluffs`); nothing here runs per
 * frame and nothing allocates in the checks.
 *
 * Assumption A1 (PLAN.md): one chance. A solo read spends all of a guard's information, the joint part included
 * (`takeInfo` clears `info`), so `hasJoint` is false after any read.
 */
import { GUARD_INFO_LINE_MAX, type GuardInfo, type HasInfo } from '../ai/guardInfo';
import type { GuardIntel } from './intel';

/** The bluff's window (s, from its start to the read's end) and the bluffer's reach to the guard (m, = `TD_REACH`).
 *  Starting values (A7). */
export const JOINT = { window: 6, reach: 3 } as const;
/** The context menu row kind of the bluff (one row, opt 'bluff'). */
export const JOINT_KIND = 'joint';
export const JOINT_BLUFF_LABEL = 'Bluff';
/** The feed line both players see when the host accepts a bluff. */
export const JOINT_BLUFF_FEED = 'Bluff on. Read his face now.';

/** A guard's joint-only information: lines given only to a joint read, and an optional course flag it sets. */
export interface JointIntel {
  readonly lines: readonly string[];
  readonly flag?: string;
}

/** A live bluff on the host: the guard's id and the host time (s) it started. */
export interface Bluff {
  eid: string;
  t0: number;
}

/** The joint part of a guard's information (null: none, or spent). */
export function jointOf(info: GuardInfo | null | undefined): JointIntel | null {
  return (info as GuardIntel | null | undefined)?.joint ?? null;
}

/** The guard still has joint lines to give (a field read: the menu step calls it every step). */
export function hasJoint(v: HasInfo): boolean {
  const j = jointOf(v.info);
  return !!j && j.lines.length > 0;
}

/** Bluff `b` counts for a read of guard `eid` ending at host time `now`, the bluffer `d` m from him. */
export function bluffLive(b: Bluff, eid: string, now: number, d: number): boolean {
  return b.eid === eid && now >= b.t0 && now - b.t0 <= JOINT.window && d <= JOINT.reach;
}

/**
 * The bluffer whose bluff counts for the read of guard `eid` by `holder` ending at `now` (null: none). The holder's own
 * entry never counts (one read never pays twice: the holder is not his own partner). `dist(id)` is the bluffer's distance
 * to the guard (Infinity: gone or down; bound once by the caller, no closure per call). Stale entries are dropped.
 */
export function jointBluffer(bluffs: Map<string, Bluff>, eid: string, holder: string, now: number, dist: (id: string) => number): string | null {
  let hit: string | null = null;
  for (const [id, b] of bluffs) {
    if (now - b.t0 > JOINT.window) {
      bluffs.delete(id);
      continue;
    }
    if (hit === null && id !== holder && bluffLive(b, eid, now, dist(id))) hit = id;
  }
  return hit;
}

/** The lines a joint read shows, each capped at the radio length `GUARD_INFO_LINE_MAX` (spoken lines, as the guard's
 *  own; not `INTEL.lineMax`, the derived feed lines' 60, which would cut the authored A8 lines). */
export function jointLines(j: JointIntel | null): string[] {
  const out: string[] = [];
  if (!j) return out;
  for (const l of j.lines) out.push(l.length > GUARD_INFO_LINE_MAX ? l.slice(0, GUARD_INFO_LINE_MAX) : l);
  return out;
}

/** Content check: at least one line, each within the radio length (`GUARD_INFO_LINE_MAX`) with no dashes; a flag, when
 *  set, not empty. */
export function checkJoint(j: JointIntel): string[] {
  const errs: string[] = [];
  if (j.lines.length === 0) errs.push('joint intel with no lines');
  for (const l of j.lines) {
    if (l.length === 0) errs.push('joint intel: empty line');
    if (l.length > GUARD_INFO_LINE_MAX) errs.push(`joint intel line over ${GUARD_INFO_LINE_MAX} characters: ${l}`);
    if (/[–—]/.test(l)) errs.push(`joint intel line with a dash: ${l}`);
  }
  if (j.flag !== undefined && j.flag.length === 0) errs.push('joint intel with an empty flag');
  return errs;
}
