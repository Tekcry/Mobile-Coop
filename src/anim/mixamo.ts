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
import { CH, type Channel } from './pose';
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
 * The Studio's pick plays its capture whatever this says. Measured headless on Wren's rig (tests/mixamoTraverse.test.ts,
 * docs/mixamo-retarget/I2-REPORT.md, I2B-REPORT.md): Michael 2026-10-26, the capture wins where it covers the same move
 * unless it is visibly broken in play (a spin, a pop, hands far off the grips); a worse number alone is tuned in the
 * Anim Studio. Hands on the lip stay a hard requirement where the game relies on grips (tests/climbHands.test.ts).
 */
export const MIXAMO_ON: Record<string, boolean> = {
  hanging_idle: true,
  braced_hang_shimmy_left: true,
  braced_hang_shimmy_right: true,
  // off (visibly broken, I2b): the palms leave the lip 58 cm and the shoulders 0.85 m from it (arm 0.54) before the foot is
  // on top (climbHands harness; hand-made 0.0 cm / 0.49 m)
  braced_hang_to_crouch: false,
  // off (visibly broken, I2b): its stand-up end turns the hips 86 deg (pelYaw to 1.5 rad) and snaps the trunk 19.7 cm and
  // the wrists 11.1 cm velocity change in a frame (k 0.85; limits 9.6 / 3; climbHands harness)
  freehang_climb: false,
  // on (I2b, capture wins unless visibly broken): palms 0.00 cm (hand-made 0.00); soles 38 cm vs 32 on held plants, both the
  // rig's climb foot cap (I2-REPORT "Known gaps"), not contact
  climbing_ladder: true,
  climbing_ladder_to_standing: true,
  // on (I2b): the M4 chest yaw fixed (from the right axis past 75 deg pitch: spYaw -0.10 to 0.15, was -4.72 to -1.42); the
  // joints step 3.4 cm a frame, 1.7 cm velocity change (hand-made 0.5 / 0.1; was 13.8 / 24.9 with the flip)
  crawling_hands_and_knees: true,
};

/** The hanging idle's clock: its capture seconds a cycle (CHANNELS.md: "its own seconds"). */
export const HANG_IDLE_SECONDS = MOCAP_HANGING_IDLE_SECONDS;
/** The shimmies' travel a cycle along the lip (m at 1.75 m; CHANNELS.md "travel over the cycle taken out"). */
export const SHIMMY_TRAVEL = 0.578;
/** Moving along a hang from this pace (m/s; the lip's attach pace is 0.5) the shimmy fades in (time constant `fade` s). */
export const SHIMMY_SPEED = { on: 0.15, fade: 0.12, dirFade: 0.1, swing: 0.01 } as const;
/** The climb-up's stand-up end fades in over this much k past the crouch (about 0.1 s of the 1.3 s exit). */
export const STAND_FADE = 0.08;

/** A traversal move a capture plays in (the hang family, the ladder, the vent crawl, the lip climb-up, the top-out). */
export type MixamoMove = 'hang' | 'climb' | 'crawl' | 'climbUp' | 'topOut';

/**
 * Per move: the channels the hand-made clip keeps over the capture. The game puts the root against the anchor for its
 * own clips (`attachPose`, `CLIMB_UP_PATH`) and the rig's reach / plant IK puts the hands and feet on the grips: a
 * capture's own pelvis placement can take the shoulders out of reach of the grips (bible 5.12.2 #2, hands within 1 cm),
 * so these stay the hand-made clip's (tests/mixamoTraverse.test.ts, tests/climbHands.test.ts measure it). Measured
 * (Wren rig, AttachGrips): with the capture's own pelvis offset the palms missed their grips by 4-6 cm on the shimmies and
 * 3.5 cm on the ladder; with the hand-made pelvis offset (its rotations, trunk, head and legs the capture's) 0.0 cm, and
 * the ladder top-out 4.2 cm (hand-made 11.8). In the vent the body's height is the duct's (1.0 m inside).
 */
const PEL_AT: Channel[] = ['pelX', 'pelY', 'pelZ'];
export const MIXAMO_KEEP: Record<MixamoMove, Channel[]> = { hang: PEL_AT, climb: PEL_AT, crawl: PEL_AT, climbUp: PEL_AT, topOut: PEL_AT };
/** `MIXAMO_KEEP` as channel indices (rebuilt by `resolveMixamo`; the graph reads them). */
export const KEEP_CH: Record<MixamoMove, number[]> = { hang: [], climb: [], crawl: [], climbUp: [], topOut: [] };

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
  for (const m of Object.keys(MIXAMO_KEEP) as MixamoMove[]) {
    const out = KEEP_CH[m];
    out.length = 0;
    for (const c of MIXAMO_KEEP[m]) out.push(CH[c]);
  }
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
