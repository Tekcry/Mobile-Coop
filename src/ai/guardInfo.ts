/**
 * (CT prototype PR 3, Michael 2026-10-20 08:40: "Add one in Marlow Yard") What a guard knows that INTERROGATE can pull out
 * of him, Babylon-free. A guard "has information" when his `info` is set; the hold-A list of a held guard shows
 * INTERROGATE only then (`grabMenu.addGrabRows`), and the interrogation spends it: `takeInfo` returns the lines once and
 * clears them, so a guard interrogated once gives no menu again.
 *
 * The data rides on a squad slot (`rooms.SquadSlot.info`), so the host sets it when the slot spawns. Co-op: whether a
 * guard still has it comes from the host (`EnemyState.in`, stealth-pays client intel); a client's puppet takes the
 * lines it says from the course slot it first appears at (`infoAtSpawn`: both sides load the same map), else
 * `HOST_INFO` (the host's feed carries the intel).
 */

import { hyp2 } from '../core/mathx';

/** What a guard tells under interrogation: one or two short lines, spoken in order (radio-length, story.md). */
export interface GuardInfo {
  readonly lines: readonly string[];
}

/** Longest line (characters): the radio rule of docs/story.md section 2. */
export const GUARD_INFO_LINE_MAX = 90;
/** Seconds between a guard's first and second line (the subtitle shows 2.7 s). Starting value. */
export const GUARD_INFO_GAP = 2.6;
/** A puppet takes a slot's information when it first appears within this (m) of the slot. Starting value. */
export const GUARD_INFO_NEAR = 1.5;

/** Something a guard's information can sit on (an `Enemy`, a co-op puppet). */
export interface HasInfo {
  info?: GuardInfo | null;
}

/** (stealth-pays client intel) A co-op client's puppet whose host says he has intel (`EnemyState.in`) while the
 *  client has no lines for him (a Sector Ops slot, a revived or rejoined guard): INTERROGATE is offered, the host
 *  resolves it and its intel reaches the team as feed lines; the puppet says nothing itself. */
export const HOST_INFO: GuardInfo = Object.freeze({ lines: Object.freeze([]) as readonly string[] });

/** The guard has information to give (and has not given it yet). */
export function hasInfo(v: HasInfo): boolean {
  return !!v.info && (v.info.lines.length > 0 || v.info === HOST_INFO);
}

/** The interrogation's yield: the lines, once. The information is gone after (null when he had none, or when the host
 *  holds it: `HOST_INFO`). */
export function takeInfo(v: HasInfo): readonly string[] | null {
  if (!hasInfo(v)) return null;
  const lines = v.info!.lines;
  v.info = null;
  return lines.length > 0 ? lines : null;
}

/** The information of the slot nearest (x, z) within `GUARD_INFO_NEAR`, null when none (the co-op puppet's lookup). */
export function infoAtSpawn(slots: Readonly<Record<string, { x: number; z: number; info?: GuardInfo }>> | undefined, x: number, z: number): GuardInfo | null {
  if (!slots) return null;
  let best: GuardInfo | null = null;
  let bestD = GUARD_INFO_NEAR;
  for (const id in slots) {
    const s = slots[id]!;
    if (!s.info) continue;
    const d = hyp2(s.x - x, s.z - z);
    if (d <= bestD) {
      bestD = d;
      best = s.info;
    }
  }
  return best;
}
