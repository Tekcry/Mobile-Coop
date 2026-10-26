/**
 * (map-ready S14, cut A; SHORTEN section 2) The load gate's compile groups and when each starts. `parallel` (the default):
 * every group starts as soon as its inputs are in, in priority order, and none waits for another to settle, so the
 * browser's parallel compile (`KHR_parallel_shader_compile`) overlaps the long variants: the level and the guards at
 * quality + content, the player's own body and weapons once they have loaded too, the rest once those three started.
 * `serial` (`?compileorder=serial`, the A/B on one build): S2's order, each group only after the one before settled.
 * Pure: `GameState.gateRead` asks each read (a number, no allocation).
 */

/** The player's body and weapons. */
export const GROUP_OWN = 1;
/** The level, the kit, the facility props and the campus art. */
export const GROUP_LEVEL = 2;
/** Every guard's body, nearest first. */
export const GROUP_GUARDS = 4;
/** Every other mesh in the scene. */
export const GROUP_REST = 8;
export const GROUP_ALL = 15;

export interface CompileDueInput {
  quality: boolean;
  content: boolean;
  bodies: boolean;
  /** Groups already started (bits). */
  started: number;
  /** Groups whose compile has settled (bits). */
  settled: number;
}

const FIRST_THREE = GROUP_OWN | GROUP_LEVEL | GROUP_GUARDS;

/** The groups to start now (bits never already in `started`). parallel: LEVEL and GUARDS once quality && content,
 *  OWN once bodies && quality && content, REST once OWN, LEVEL and GUARDS have started; nothing waits for a group to
 *  settle. serial: S2's order: OWN once bodies && quality && content, then each next group only when the previous one
 *  has settled. */
export function compileGroupsDue(i: CompileDueInput, order: 'parallel' | 'serial'): number {
  if (!i.quality || !i.content) return 0;
  const s = i.started;
  let due = 0;
  if (order === 'parallel') {
    due = GROUP_LEVEL | GROUP_GUARDS;
    if (i.bodies) due |= GROUP_OWN;
    if ((s & FIRST_THREE) === FIRST_THREE) due |= GROUP_REST;
  } else {
    if (i.bodies) due |= GROUP_OWN;
    if (i.settled & GROUP_OWN) due |= GROUP_LEVEL;
    if (i.settled & GROUP_LEVEL) due |= GROUP_GUARDS;
    if (i.settled & GROUP_GUARDS) due |= GROUP_REST;
  }
  return due & ~s;
}

/** `?compileorder=serial` -> 'serial'; anything else -> 'parallel'. */
export function compileOrderOf(search: string): 'parallel' | 'serial' {
  return new URLSearchParams(search).get('compileorder') === 'serial' ? 'serial' : 'parallel';
}
