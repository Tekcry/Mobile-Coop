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
  // on (I2b, under its hold `MIXAMO_HOLD`): palms 0.0 cm on the lip, shoulders 0.49 m (arm 0.54), wrists' velocity change
  // 2.8 cm a frame at the release (cap 3.0; hand-made 2.8), trunk 8.6 / 2.8 cm (caps 9.6 / 3.1): tests/climbHands.test.ts
  braced_hang_to_crouch: true,
  // on (I2b, its stand-up `MIXAMO_STAND`: the hip turn kept at 0.15, the clock slowed mid-way): trunk 8.9 / 3.07 cm a frame
  // (caps 9.6 / 3.1; was 15.7 / 5.1 as captured), arms 12.2 / 9.8 (caps 16.2 / 23.5): tests/climbHands.test.ts
  freehang_climb: true,
  // on (I2b): palms 0.00 cm (hand-made 0.00); soles 38 cm vs 32 (the rig's climb foot cap, not contact); into the top-out
  // the first frame moves the right ankle 19.9 cm (hand-made 15.7; 23.5 before the capture-to-capture trigger, animGraph)
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

/**
 * (I2b) Per lip climb-up capture: the hand-made climb-up (CLIMB_UP) plays under it while the hands hold the lip and the
 * capture blends in once the grips have mostly let go (smoothstep over k `k0` .. `k0 + span`; the grips: the game's
 * `CLIMB_UP_HANDS`, k 0.475 - 0.643, moveState.ts), its clock from the take's k `from` at `k0` to the crouch, then the
 * hand-made stand-up fades in over `stand` of k. The braced take pulls up with its feet on the wall and its trunk upright:
 * played from k 0 its shoulders went 0.85 m from the lip (arm 0.54) and the palms 58 cm off it before the right foot was
 * on the top (k 0.59, the game needs it by the release, 0.475: tests/climbHands.test.ts). Blended in with the grips (k0
 * 0.475) its lower shoulders put the lip grips out of the arms' reach over k 0.53 - 0.59 and the wrists snapped back as
 * the grips let go (3.5 - 3.7 cm velocity change a frame, cap 3.0); from k 0.58 the grips are past that and the wrists are
 * the hand-made climb-up's (2.8 cm). The capture's share peaks about 0.7 near k 0.75 (the stand-up fades in from 0.654).
 */
export const MIXAMO_HOLD: Readonly<Record<string, { k0: number; span: number; from: number; stand: number; ease: number }>> = {
  braced_hang_to_crouch: { k0: 0.58, span: 0.2, from: 0.56, stand: 0.34, ease: 0 },
};
/** The resolved hold of the `climbUpCrouch` slot's capture, by the `HOLD_*` slots (`k0` -1: none, the capture from k 0;
 *  `stand` its stand-up fade, k: `STAND_FADE` without a hold). The graph reads it: typed, so no double it reads is boxed
 *  (an object's double fields boxed 16 B a frame on the hold's path: tests/mixamoTraverse.test.ts "no allocation"). */
export const WREN_HOLD = new Float64Array(5);
export const HOLD_K0 = 0;
export const HOLD_SPAN = 1;
export const HOLD_FROM = 2;
export const HOLD_STAND = 3;
export const HOLD_EASE = 4;
/**
 * (I2b) Under a hold the feet stay the hand-made climb-up's to the crouch (the stand-up's capture fades its own in): the
 * braced take's right foot steps onto the top at k 0.53 - 0.6 (fRY up to 0.18 m over its crouch height), the game has it
 * on the top by the release (k 0.475).
 */
export const HOLD_FEET_CH: readonly number[] = (['fLX', 'fLZ', 'fLY', 'fLPitch', 'fRX', 'fRZ', 'fRY', 'fRPitch'] as const).map((c) => CH[c]);

/**
 * (I2b) Per stand-up capture (the `climbUpStand` slot, past the crouch): its clock runs the same take from the crouch to
 * its end but slowed through the middle and quicker at the ends (game x 0..1 over the crouch to the end, the take's
 * x + slow sin(2 pi x) / 2 pi: speed 1 - slow mid-way, 1 + slow at the ends), and its yaw turn (`STAND_YAW_CH`) is kept at
 * `yaw` of the take's over the hand-made climb-up's. The free-hang take (x2.85, M4) turns the hips 86 deg (pelYaw to 1.5
 * rad, still 0.89 at its end) and pitches the chest back up 1.2 rad in 0.08 s as it stands: played as captured the trunk
 * stepped 15.7 cm and changed velocity 5.1 cm in a frame (caps 9.6 / 3.1, tests/climbHands.test.ts). Swept (to the take's
 * end; cut short at k 0.85 - 0.92 every reading was worse): yaw 0 slow 0.4 - 0.5 trunk 8.6 / 3.06; yaw 0.15 slow 0.45
 * 8.9 / 3.07, the arms 12.2 / 9.8 (caps 16.2 / 23.5); yaw 0.3 the trunk 10.0.
 */
export const MIXAMO_STAND: Readonly<Record<string, { yaw: number; slow: number }>> = {
  freehang_climb: { yaw: 0.15, slow: 0.45 },
};
/** The resolved stand-up of the `climbUpStand` slot's capture, by the `STAND_*` slots (typed: no double boxed; none:
 *  yaw 1, slow 0, the take as captured). */
export const WREN_STAND = new Float64Array(2);
export const STAND_YAW = 0;
export const STAND_SLOW = 1;
/** The stand-up capture's yaw channels `STAND_YAW` scales toward the hand-made climb-up's. */
export const STAND_YAW_CH: readonly number[] = (['pelYaw', 'spYaw'] as const).map((c) => CH[c]);

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
  WREN_HOLD[HOLD_K0] = -1;
  WREN_HOLD[HOLD_SPAN] = 1;
  WREN_HOLD[HOLD_STAND] = STAND_FADE;
  WREN_HOLD[HOLD_EASE] = 0;
  WREN_HOLD[HOLD_FROM] = 0;
  for (const [slug, r] of Object.entries(MIXAMO_TRAV)) {
    const h = MIXAMO_HOLD[slug];
    if (h && T.climbUpCrouch === r.clip) {
      WREN_HOLD[HOLD_K0] = h.k0;
      WREN_HOLD[HOLD_SPAN] = h.span;
      WREN_HOLD[HOLD_STAND] = h.stand;
      WREN_HOLD[HOLD_EASE] = h.ease;
      WREN_HOLD[HOLD_FROM] = h.from;
    }
  }
  WREN_STAND[STAND_YAW] = 1;
  WREN_STAND[STAND_SLOW] = 0;
  for (const [slug, r] of Object.entries(MIXAMO_TRAV)) {
    const s = MIXAMO_STAND[slug];
    if (s && T.climbUpStand === r.clip) {
      WREN_STAND[STAND_YAW] = s.yaw;
      WREN_STAND[STAND_SLOW] = s.slow;
    }
  }
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
