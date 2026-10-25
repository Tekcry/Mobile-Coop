/**
 * (mixamo-retarget I2) The Mixamo traversal captures on Wren: which capture plays in each traversal slot. Pure data and
 * set-up code (no per-frame work): `setMixamo` (the `?mixamo=0/1` flag, `flags.mixamo`, default off) and
 * `setMixamoStudio` (the Anim Studio's pick) rebuild `WREN_TRAV` once per change; the graph (`animGraph.ts`, Wren rigs
 * only: `wrenReady`) reads it by reference every frame. A null slot is the hand-made clip (`clips/traverse.ts`), and with
 * every slot null (`any` false) the graph takes the hand-made path untouched (byte-identical: tests/mixamoTraverse.test.ts).
 * Guards share the hand-made `TRAVERSE_CLIP` table (`enemy.ts` climb) and never read this one.
 *
 * Slots (docs/mixamo-retarget/PLAN.md "Clip map", rows 1-5 and 9; clocks: CHANNELS.md):
 * - `hangIdle`: hanging still (the hand-made HANG over the pendulum); the capture on its own clock (1 / 4.7 s a second).
 * - `shimmyL` / `shimmyR`: moving along a lip, by the direction the hips trail (the pendulum's sign); their clock is the
 *   distance moved over the capture's travel a cycle (`SHIMMY_TRAVEL`). The rig's reach / plant IK keeps the hands on
 *   the grips, as on the hand-made clip.
 * - `climbUpCrouch`: the lip climb-up (from a ledge hang) to the crouch on top (k 0 - `CLIMB_UP_CROUCH_K`);
 *   `climbUpStand`: its stand-up end (past the crouch, the stick held), faded in over `STAND_FADE` of k.
 * - `ladder`: the rung cycle on the hand cadence; `ladderTop`: the ladder's top-out (to its crouch).
 * - `crawl`: the vent crawl on the hand cadence.
 */
import type { Clip } from './clip';
import { flags } from '../core/flags';
import { MOCAP_HANGING_IDLE, MOCAP_HANGING_IDLE_SECONDS } from './clips/mixamo/trav_hanging_idle';
import { MOCAP_BRACED_HANG_SHIMMY_LEFT } from './clips/mixamo/trav_braced_hang_shimmy_left';
import { MOCAP_BRACED_HANG_SHIMMY_RIGHT } from './clips/mixamo/trav_braced_hang_shimmy_right';
import { MOCAP_FREEHANG_CLIMB } from './clips/mixamo/trav_freehang_climb';
import { MOCAP_BRACED_HANG_TO_CROUCH } from './clips/mixamo/trav_braced_hang_to_crouch';
import { MOCAP_CLIMBING_LADDER } from './clips/mixamo/trav_climbing_ladder';
import { MOCAP_CLIMBING_LADDER_TO_STANDING } from './clips/mixamo/trav_climbing_ladder_to_standing';
import { MOCAP_CRAWLING_HANDS_AND_KNEES } from './clips/mixamo/trav_crawling_hands_and_knees';

/** A Wren traversal slot (above). */
export type MixamoTravSlot = 'hangIdle' | 'shimmyL' | 'shimmyR' | 'climbUpCrouch' | 'climbUpStand' | 'ladder' | 'ladderTop' | 'crawl';

/** The resolved table: each slot's capture, or null (the hand-made clip). `any`: a slot is filled. */
export type WrenTravTable = { any: boolean } & Record<MixamoTravSlot, Clip | null>;

/** Every traversal capture by its slug (the module `clips/mixamo/trav_<slug>.ts`), its clip and its slot. */
export const MIXAMO_TRAV: Readonly<Record<string, { clip: Clip; slot: MixamoTravSlot }>> = {
  hanging_idle: { clip: MOCAP_HANGING_IDLE, slot: 'hangIdle' },
  braced_hang_shimmy_left: { clip: MOCAP_BRACED_HANG_SHIMMY_LEFT, slot: 'shimmyL' },
  braced_hang_shimmy_right: { clip: MOCAP_BRACED_HANG_SHIMMY_RIGHT, slot: 'shimmyR' },
  braced_hang_to_crouch: { clip: MOCAP_BRACED_HANG_TO_CROUCH, slot: 'climbUpCrouch' },
  freehang_climb: { clip: MOCAP_FREEHANG_CLIMB, slot: 'climbUpStand' },
  climbing_ladder: { clip: MOCAP_CLIMBING_LADDER, slot: 'ladder' },
  climbing_ladder_to_standing: { clip: MOCAP_CLIMBING_LADDER_TO_STANDING, slot: 'ladderTop' },
  crawling_hands_and_knees: { clip: MOCAP_CRAWLING_HANDS_AND_KNEES, slot: 'crawl' },
};

/**
 * Per capture: whether it plays in the game with the flag on (PLAN "Switch-on": a clip that passes A8 and the checker).
 * The Studio's pick plays its capture whatever this says.
 */
export const MIXAMO_ON: Record<string, boolean> = {
  hanging_idle: true,
  braced_hang_shimmy_left: true,
  braced_hang_shimmy_right: true,
  braced_hang_to_crouch: true,
  freehang_climb: true,
  climbing_ladder: true,
  climbing_ladder_to_standing: true,
  crawling_hands_and_knees: true,
};

/** The hanging idle's clock: its capture seconds a cycle (CHANNELS.md: "its own seconds"). */
export const HANG_IDLE_SECONDS = MOCAP_HANGING_IDLE_SECONDS;
/** The shimmies' travel a cycle along the lip (m at 1.75 m; CHANNELS.md "travel over the cycle taken out"). */
export const SHIMMY_TRAVEL = 0.578;
/** Moving along a hang from this pace (m/s; the lip's attach pace is 0.5) the shimmy fades in (`SHIMMY_FADE` s). */
export const SHIMMY_SPEED = { on: 0.15, fade: 0.12, dirFade: 0.1, swing: 0.01 } as const;
/** The climb-up's stand-up end fades in over this much k past the crouch (about 0.1 s of the 1.3 s exit). */
export const STAND_FADE = 0.08;

/** The switch's state: `on` the flag, `studio` the Studio's capture slug ('' none). Written by the setters only. */
export const MIXAMO: { on: boolean; studio: string } = { on: false, studio: '' };

/** The resolved Wren table the graph reads (the same object always: fields rewritten once per change). */
export const WREN_TRAV: WrenTravTable = { any: false, hangIdle: null, shimmyL: null, shimmyR: null, climbUpCrouch: null, climbUpStand: null, ladder: null, ladderTop: null, crawl: null };

const SLOTS: readonly MixamoTravSlot[] = ['hangIdle', 'shimmyL', 'shimmyR', 'climbUpCrouch', 'climbUpStand', 'ladder', 'ladderTop', 'crawl'];

/** Rebuild `WREN_TRAV` from the flag, `MIXAMO_ON` and the Studio's pick (once per change; not per frame). */
export function resolveMixamo(): void {
  const T = WREN_TRAV;
  for (const s of SLOTS) T[s] = null;
  if (MIXAMO.on) for (const [slug, r] of Object.entries(MIXAMO_TRAV)) if (MIXAMO_ON[slug]) T[r.slot] = r.clip;
  const pick = MIXAMO_TRAV[MIXAMO.studio];
  if (pick) {
    T[pick.slot] = pick.clip;
    // the free-hang climb is a whole climb-up (hang to standing): picked, it plays the crouch part too
    if (pick.slot === 'climbUpStand') T.climbUpCrouch = pick.clip;
  }
  T.any = SLOTS.some((s) => T[s] !== null);
}

/** The flag (`?mixamo=1`): the captures on Wren's traversal (those `MIXAMO_ON` lets play). */
export function setMixamo(on: boolean): void {
  MIXAMO.on = on;
  resolveMixamo();
}

/** The Anim Studio's pick: a traversal capture's slug (it plays on the Studio rig whatever the flag says), '' none. */
export function setMixamoStudio(slug: string): void {
  MIXAMO.studio = MIXAMO_TRAV[slug] ? slug : '';
  resolveMixamo();
}

/**
 * The Studio's loop list entry id -> the pick: a capture's loop `trav:<loop>/<slug>` (studio.ts `captureEntries`) picks
 * that capture; any other entry (or leaving the Studio: '') clears it. Called on a change of entry only.
 */
export function mixamoStudioEntry(id: string): void {
  const m = /^trav:[^/]+\/(.+)$/.exec(id);
  const slug = m && MIXAMO_TRAV[m[1]!] ? m[1]! : '';
  if (slug !== MIXAMO.studio) setMixamoStudio(slug);
}

setMixamo(flags.mixamo === true);
