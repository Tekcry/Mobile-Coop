/**
 * (mixamo-retarget M5) Where every motion-capture clip comes from: one table, clip name -> source row (pure, no runtime
 * imports, Babylon-free). Read by the Now playing line (`nowPlaying.ts`: "motion-capture (CMU) walk", "motion-capture
 * (Mixamo) hang"), the Anim Studio's "motion capture" group (`studio.ts`: every row whose module exists gets a loop) and
 * the source tests (`tests/mocapSources.test.ts`: every clip module under `clips/mocap/` and `clips/mixamo/` has a row,
 * every row its module, every Mixamo row its `docs/art-credits.md` row with the URL and the licence).
 *
 * Adding a capture: commit its module (`src/anim/clips/mixamo/<slug>.ts`, a keyed clip named `mocap_<slug>`, or
 * `trav_<slug>.ts`, a channel clip named `mocap_<slug>`), its art-credits row and its row here; nothing else. The Studio
 * picks the module up by its clip name (`import.meta.glob`), the line by the row. The CMU rows are written by hand; the
 * Mixamo rows only inside the marker blocks below, M3's (keyed) and M4's (channel), each written by its generator, one
 * row a line, e.g. (a keyed loop and a channel clip):
 *   mocap_standing_idle: { source: 'mixamo', title: 'Standing Idle', take: 'Standing Idle.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'idle', cycle: 8 } },
 *   mocap_hanging_idle: { source: 'mixamo', title: 'Hanging Idle', take: 'Hanging Idle.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'trav', loop: 'trav:ledge' } },
 */
import type { BodyGroup } from './tune';

/** A capture's source. */
export type MocapSourceId = 'cmu' | 'mixamo';

/** The plain word of each source in the Now playing line and the Studio's labels. */
export const MOCAP_SOURCE_WORD: Readonly<Record<MocapSourceId, string>> = { cmu: 'CMU', mixamo: 'Mixamo' };

/** The credit lines (the art-credits sections the rows are listed in). */
export const CMU_CREDIT = 'CMU Graphics Lab Motion Capture Database (mocap.cs.cmu.edu); docs/art-credits.md "Motion capture (CMU exception, mocap-trial)"';
export const MIXAMO_CREDIT = 'Mixamo (mixamo.com, Adobe), royalty-free for commercial use; docs/art-credits.md "Motion capture (Mixamo, mixamo-retarget)"';

/**
 * How the Anim Studio plays a capture.
 * - `keyed`: on the loop player's drive (`studio.ts` `keyed()`), in place: `body` the tuner state the Studio pins while it
 *   plays (the state the game plays it in, so Body > Joints, Hands & feet and Limb reach show that state's rows),
 *   `cycle` seconds per loop (a one-shot: its length), `move` the treadmill's travel (the pace is the clip's own stride
 *   over the cycle), the stance and gun flags as `keyed()` takes them.
 * - `trav`: a channel clip (`clip.ts`) plays through the game's own traversal on a Studio prop: `loop` the traversal loop
 *   (`studioTraversal.ts` TRAV_ENTRIES id) whose act plays it.
 */
export type MocapStudio =
  | { kind: 'keyed'; body: BodyGroup; cycle: number; move?: 'none' | 'fwd' | 'back' | 'side'; crouch?: boolean; drawn?: boolean; aim?: boolean; circle?: boolean }
  | { kind: 'trav'; loop: string };

/** One capture's row. */
export interface MocapSource {
  source: MocapSourceId;
  /** CMU: what the take shows; Mixamo: the title as the site names it (the file as downloaded, without `.fbx`). */
  title: string;
  /** CMU: the take and the seconds used; Mixamo: the file as downloaded. */
  take?: string;
  /** The credit line (`CMU_CREDIT` / `MIXAMO_CREDIT`). */
  credit: string;
  studio: MocapStudio;
}

const CMU = 'cmu' as const;

/**
 * Every capture by its clip name (`KeyedClip.name` / `Clip.name`, always `mocap_<name>`). The CMU rows by hand from the
 * clip modules' headers (`src/anim/clips/mocap/*.ts`); one-shots loop over their own length (`ONESHOT_FPS` 40 frames a
 * second, `scripts/mocap/emit.mjs`).
 */
export const MOCAP_SOURCES: Readonly<Record<string, MocapSource>> = {
  mocap_walk: { source: CMU, title: 'walk (subject 16)', take: '16_15, 0.525-1.675 s', credit: CMU_CREDIT, studio: { kind: 'keyed', body: 'walk', cycle: 1.15, move: 'fwd', circle: true } },
  mocap_jog: { source: CMU, title: 'jog (subject 16)', take: '16_36, 0.3-1.092 s', credit: CMU_CREDIT, studio: { kind: 'keyed', body: 'jog', cycle: 0.792, move: 'fwd', circle: true } },
  mocap_run: { source: CMU, title: 'run (subject 16)', take: '16_46, 0.158-0.85 s', credit: CMU_CREDIT, studio: { kind: 'keyed', body: 'run', cycle: 0.692, move: 'fwd', circle: true } },
  mocap_sprint: { source: CMU, title: 'sprint (subject 127)', take: '127_07, 0.325-1.008 s', credit: CMU_CREDIT, studio: { kind: 'keyed', body: 'run', cycle: 0.683, move: 'fwd', circle: true } },
  mocap_start: { source: CMU, title: 'walk start from standing (subject 16)', take: '16_31, 0-2.183 s', credit: CMU_CREDIT, studio: { kind: 'keyed', body: 'walk', cycle: 1.95 } },
  mocap_stop: { source: CMU, title: 'walk stop to standing (subject 16)', take: '16_34, 0.458-2.883 s', credit: CMU_CREDIT, studio: { kind: 'keyed', body: 'walk', cycle: 2.1 } },
  mocap_turn_in_place: { source: CMU, title: 'turn on the spot (subject 69)', take: '69_13, 15.5-19.058 s', credit: CMU_CREDIT, studio: { kind: 'keyed', body: 'idle', cycle: 47 / 40 } },
  mocap_turn_move_l: { source: CMU, title: 'walking 90 deg turn left (subject 16)', take: '16_18, 1.692-4.05 s', credit: CMU_CREDIT, studio: { kind: 'keyed', body: 'walk', cycle: 56 / 40 } },
  mocap_turn_move_r: { source: CMU, title: 'walking 90 deg turn right (subject 16)', take: '16_19, 1.242-3.408 s', credit: CMU_CREDIT, studio: { kind: 'keyed', body: 'walk', cycle: 47 / 40 } },
  mocap_crouch_walk: { source: CMU, title: 'crouched sneak (subject 136)', take: '136_09, 4.233-5.508 s', credit: CMU_CREDIT, studio: { kind: 'keyed', body: 'sneak', cycle: 1.275, move: 'fwd', crouch: true, circle: true } },
  // the strafes travel sideways: the right one on the treadmill; the left in place (the treadmill only runs to the right)
  mocap_strafe_l: { source: CMU, title: 'aimed strafe left (subject 69)', take: '69_59, 4.625-5.625 s', credit: CMU_CREDIT, studio: { kind: 'keyed', body: 'aim', cycle: 1.0, drawn: true, aim: true } },
  mocap_strafe_r: { source: CMU, title: 'aimed strafe right (subject 69)', take: '69_56, 1.317-2.275 s', credit: CMU_CREDIT, studio: { kind: 'keyed', body: 'aim', cycle: 0.958, move: 'side', drawn: true, aim: true } },
  // @mixamo-keyed-begin (M3, scripts/mocap/mixamoEmit.mjs: one row per src/anim/clips/mixamo/<slug>.ts; generated, do not edit)
  mocap_aa_cover_to_stand: { source: 'mixamo', title: 'Action Adventure Pack: cover to stand', take: 'pack-action-adventure/cover to stand.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'wallIdle', cycle: 1.5 } },
  mocap_aa_cover_to_stand_2: { source: 'mixamo', title: 'Action Adventure Pack: cover to stand (2)', take: 'pack-action-adventure/cover to stand (2).fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'wallIdle', cycle: 1.133 } },
  mocap_aa_crouched_sneaking_left: { source: 'mixamo', title: 'Action Adventure Pack: crouched sneaking left', take: 'pack-action-adventure/crouched sneaking left.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'sneak', cycle: 1.267, crouch: true } },
  mocap_aa_crouched_sneaking_right: { source: 'mixamo', title: 'Action Adventure Pack: crouched sneaking right', take: 'pack-action-adventure/crouched sneaking right.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'sneak', cycle: 1.067, move: 'side', crouch: true } },
  mocap_aa_idle: { source: 'mixamo', title: 'Action Adventure Pack: idle', take: 'pack-action-adventure/idle.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'idle', cycle: 3.867 } },
  mocap_aa_idle_2: { source: 'mixamo', title: 'Action Adventure Pack: idle (2)', take: 'pack-action-adventure/idle (2).fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'idle', cycle: 10 } },
  mocap_aa_idle_3: { source: 'mixamo', title: 'Action Adventure Pack: idle (3)', take: 'pack-action-adventure/idle (3).fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'idle', cycle: 3.267 } },
  mocap_aa_idle_4: { source: 'mixamo', title: 'Action Adventure Pack: idle (4)', take: 'pack-action-adventure/idle (4).fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'idle', cycle: 2.567 } },
  mocap_aa_idle_5: { source: 'mixamo', title: 'Action Adventure Pack: idle (5)', take: 'pack-action-adventure/idle (5).fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'idle', cycle: 2.267 } },
  mocap_aa_jumping_up: { source: 'mixamo', title: 'Action Adventure Pack: jumping up', take: 'pack-action-adventure/jumping up.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'idle', cycle: 0.233 } },
  mocap_aa_left_cover_sneak: { source: 'mixamo', title: 'Action Adventure Pack: left cover sneak', take: 'pack-action-adventure/left cover sneak.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'wallSlide', cycle: 1.133 } },
  mocap_aa_left_turn: { source: 'mixamo', title: 'Action Adventure Pack: left turn', take: 'pack-action-adventure/left turn.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'idle', cycle: 1.033 } },
  mocap_aa_right_cover_sneak: { source: 'mixamo', title: 'Action Adventure Pack: right cover sneak', take: 'pack-action-adventure/right cover sneak.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'wallSlide', cycle: 1.133, move: 'side' } },
  mocap_aa_right_turn: { source: 'mixamo', title: 'Action Adventure Pack: right turn', take: 'pack-action-adventure/right turn.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'idle', cycle: 1 } },
  mocap_aa_run_to_stop: { source: 'mixamo', title: 'Action Adventure Pack: run to stop', take: 'pack-action-adventure/run to stop.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'run', cycle: 0.9 } },
  mocap_aa_running: { source: 'mixamo', title: 'Action Adventure Pack: running', take: 'pack-action-adventure/running.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'run', cycle: 0.7, move: 'fwd', circle: true } },
  mocap_aa_stand_to_cover: { source: 'mixamo', title: 'Action Adventure Pack: stand to cover', take: 'pack-action-adventure/stand to cover.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'wallIdle', cycle: 1.067 } },
  mocap_aa_stand_to_cover_2: { source: 'mixamo', title: 'Action Adventure Pack: stand to cover (2)', take: 'pack-action-adventure/stand to cover (2).fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'wallIdle', cycle: 1.1 } },
  mocap_aa_walking: { source: 'mixamo', title: 'Action Adventure Pack: walking', take: 'pack-action-adventure/walking.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'walk', cycle: 1.033, move: 'fwd', circle: true } },
  mocap_breathing_idle: { source: 'mixamo', title: 'Breathing Idle', take: 'Breathing Idle.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'idle', cycle: 9.933 } },
  mocap_carry_body_idle: { source: 'mixamo', title: 'Carry Body Idle', take: 'Carry Body Idle.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'carry', cycle: 10 } },
  mocap_carry_body_walking: { source: 'mixamo', title: 'Carry Body Walking', take: 'Carry Body Walking.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'carry', cycle: 2.867, move: 'fwd', circle: true } },
  mocap_cover_idle: { source: 'mixamo', title: 'Cover Idle', take: 'Cover Idle (standing cover against object).fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'wallIdle', cycle: 2.267 } },
  mocap_crawling_prone: { source: 'mixamo', title: 'Crawling Prone', take: 'Crawling Prone.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'crawl', cycle: 2.333, move: 'fwd' } },
  mocap_cross_punch: { source: 'mixamo', title: 'Cross Punch', take: 'Cross Punch.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'idle', cycle: 0.867 } },
  mocap_crouch_look_around_corner: { source: 'mixamo', title: 'Crouch Look Around Corner', take: 'Crouch Look Around Corner.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'wallCrouchPeek', cycle: 3, crouch: true } },
  mocap_crouch_to_stand: { source: 'mixamo', title: 'Crouch To Stand', take: 'Crouch To Stand.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'crouchIdle', cycle: 0.9 } },
  mocap_crouched_sneaking_left: { source: 'mixamo', title: 'Crouched Sneaking Left', take: 'Crouched Sneaking Left.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'sneak', cycle: 1.267, crouch: true } },
  mocap_crouched_sneaking_right: { source: 'mixamo', title: 'Crouched Sneaking Right', take: 'Crouched Sneaking Right.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'sneak', cycle: 1.1, move: 'side', crouch: true } },
  mocap_crouched_walking: { source: 'mixamo', title: 'Crouched Walking', take: 'Crouched Walking.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'sneak', cycle: 1.133, move: 'fwd', crouch: true, circle: true } },
  mocap_dying: { source: 'mixamo', title: 'Dying', take: 'Dying.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'idle', cycle: 2.917 } },
  mocap_elbow_strike: { source: 'mixamo', title: 'Elbow Strike', take: 'Elbow Strike.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'idle', cycle: 1.667 } },
  mocap_falling_back_death: { source: 'mixamo', title: 'Falling Back Death', take: 'Falling Back Death.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'idle', cycle: 1.933 } },
  mocap_falling_forward_death: { source: 'mixamo', title: 'Falling Forward Death', take: 'Falling Forward Death.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'idle', cycle: 1.933 } },
  mocap_fast_run: { source: 'mixamo', title: 'Fast Run', take: 'Fast Run.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'run', cycle: 0.533, move: 'fwd', circle: true } },
  mocap_jogging: { source: 'mixamo', title: 'Jogging', take: 'Jogging.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'jog', cycle: 0.85, move: 'fwd', circle: true } },
  mocap_kneel_down: { source: 'mixamo', title: 'Kneel Down', take: 'Kneel Down (lay body).fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'carry', cycle: 2.117 } },
  mocap_kneeling_pull_up: { source: 'mixamo', title: 'Kneeling Pull Up', take: 'Kneeling Pull Up (partner haul).fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'crouchIdle', cycle: 4.483 } },
  mocap_left_strafe_walking: { source: 'mixamo', title: 'Left Strafe Walking', take: 'Left Strafe Walking.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'aim', cycle: 1.033, drawn: true, aim: true } },
  mocap_left_turn: { source: 'mixamo', title: 'Left Turn', take: 'Left Turn.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'idle', cycle: 0.767 } },
  mocap_lifting_heavy_object: { source: 'mixamo', title: 'Lifting Heavy Object', take: 'Lifting Heavy Object (shutter).fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'idle', cycle: 9.617 } },
  mocap_looking_around: { source: 'mixamo', title: 'Looking Around', take: 'Looking Around.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'idle', cycle: 6.333 } },
  mocap_pistol_idle: { source: 'mixamo', title: 'Pistol/Handgun Locomotion Pack: pistol idle', take: 'pack-pistol/pistol idle.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'lowReady', cycle: 1.333, drawn: true } },
  mocap_pistol_jump: { source: 'mixamo', title: 'Pistol/Handgun Locomotion Pack: pistol jump', take: 'pack-pistol/pistol jump.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'idle', cycle: 2, drawn: true } },
  mocap_pistol_jump_2: { source: 'mixamo', title: 'Pistol/Handgun Locomotion Pack: pistol jump (2)', take: 'pack-pistol/pistol jump (2).fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'idle', cycle: 0.8, drawn: true } },
  mocap_pistol_kneel_to_stand: { source: 'mixamo', title: 'Pistol/Handgun Locomotion Pack: pistol kneel to stand', take: 'pack-pistol/pistol kneel to stand.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'crouchIdle', cycle: 0.85, crouch: true, drawn: true } },
  mocap_pistol_kneeling_idle: { source: 'mixamo', title: 'Pistol/Handgun Locomotion Pack: pistol kneeling idle', take: 'pack-pistol/pistol kneeling idle.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'crouchIdle', cycle: 3.8, crouch: true, drawn: true } },
  mocap_pistol_run: { source: 'mixamo', title: 'Pistol/Handgun Locomotion Pack: pistol run', take: 'pack-pistol/pistol run.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'jog', cycle: 0.5, move: 'fwd', drawn: true, circle: true } },
  mocap_pistol_run_arc: { source: 'mixamo', title: 'Pistol/Handgun Locomotion Pack: pistol run arc', take: 'pack-pistol/pistol run arc.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'jog', cycle: 0.6, drawn: true } },
  mocap_pistol_run_arc_2: { source: 'mixamo', title: 'Pistol/Handgun Locomotion Pack: pistol run arc (2)', take: 'pack-pistol/pistol run arc (2).fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'jog', cycle: 0.633, move: 'fwd', drawn: true } },
  mocap_pistol_run_backward: { source: 'mixamo', title: 'Pistol/Handgun Locomotion Pack: pistol run backward', take: 'pack-pistol/pistol run backward.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'aim', cycle: 0.533, drawn: true, aim: true } },
  mocap_pistol_run_backward_arc: { source: 'mixamo', title: 'Pistol/Handgun Locomotion Pack: pistol run backward arc', take: 'pack-pistol/pistol run backward arc.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'aim', cycle: 0.5, drawn: true, aim: true } },
  mocap_pistol_run_backward_arc_2: { source: 'mixamo', title: 'Pistol/Handgun Locomotion Pack: pistol run backward arc (2)', take: 'pack-pistol/pistol run backward arc (2).fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'aim', cycle: 0.5, drawn: true, aim: true } },
  mocap_pistol_stand_to_kneel: { source: 'mixamo', title: 'Pistol/Handgun Locomotion Pack: pistol stand to kneel', take: 'pack-pistol/pistol stand to kneel.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'crouchIdle', cycle: 0.817, crouch: true, drawn: true } },
  mocap_pistol_strafe: { source: 'mixamo', title: 'Pistol/Handgun Locomotion Pack: pistol strafe', take: 'pack-pistol/pistol strafe.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'aim', cycle: 0.567, drawn: true, aim: true } },
  mocap_pistol_strafe_2: { source: 'mixamo', title: 'Pistol/Handgun Locomotion Pack: pistol strafe (2)', take: 'pack-pistol/pistol strafe (2).fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'aim', cycle: 0.6, move: 'side', drawn: true, aim: true } },
  mocap_pistol_walk: { source: 'mixamo', title: 'Pistol/Handgun Locomotion Pack: pistol walk', take: 'pack-pistol/pistol walk.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'walk', cycle: 0.8, move: 'fwd', drawn: true, circle: true } },
  mocap_pistol_walk_arc: { source: 'mixamo', title: 'Pistol/Handgun Locomotion Pack: pistol walk arc', take: 'pack-pistol/pistol walk arc.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'walk', cycle: 0.733, move: 'fwd', drawn: true } },
  mocap_pistol_walk_arc_2: { source: 'mixamo', title: 'Pistol/Handgun Locomotion Pack: pistol walk arc (2)', take: 'pack-pistol/pistol walk arc (2).fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'walk', cycle: 0.767, move: 'fwd', drawn: true } },
  mocap_pistol_walk_backward: { source: 'mixamo', title: 'Pistol/Handgun Locomotion Pack: pistol walk backward', take: 'pack-pistol/pistol walk backward.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'aim', cycle: 1.033, drawn: true, aim: true } },
  mocap_pistol_walk_backward_arc: { source: 'mixamo', title: 'Pistol/Handgun Locomotion Pack: pistol walk backward arc', take: 'pack-pistol/pistol walk backward arc.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'aim', cycle: 0.6, move: 'back', drawn: true, aim: true } },
  mocap_pistol_walk_backward_arc_2: { source: 'mixamo', title: 'Pistol/Handgun Locomotion Pack: pistol walk backward arc (2)', take: 'pack-pistol/pistol walk backward arc (2).fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'aim', cycle: 0.6, move: 'back', drawn: true, aim: true } },
  mocap_pulling_up_to_a_ledge: { source: 'mixamo', title: 'Pulling Up To A Ledge', take: 'Pulling Up To A Ledge.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'ledge', cycle: 3.817 } },
  mocap_rifle_crouching_turn_90_left: { source: 'mixamo', title: 'Pro Rifle Pack: crouching turn 90 left', take: 'pack-rifle/crouching turn 90 left.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'crouchIdle', cycle: 1, crouch: true, drawn: true } },
  mocap_rifle_crouching_turn_90_right: { source: 'mixamo', title: 'Pro Rifle Pack: crouching turn 90 right', take: 'pack-rifle/crouching turn 90 right.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'crouchIdle', cycle: 1.2, crouch: true, drawn: true } },
  mocap_rifle_death_crouching_headshot_front: { source: 'mixamo', title: 'Pro Rifle Pack: death crouching headshot front', take: 'pack-rifle/death crouching headshot front.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'crouchIdle', cycle: 1.833, crouch: true, drawn: true } },
  mocap_rifle_death_from_back_headshot: { source: 'mixamo', title: 'Pro Rifle Pack: death from back headshot', take: 'pack-rifle/death from back headshot.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'idle', cycle: 3.35, drawn: true } },
  mocap_rifle_death_from_front_headshot: { source: 'mixamo', title: 'Pro Rifle Pack: death from front headshot', take: 'pack-rifle/death from front headshot.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'idle', cycle: 2.7, drawn: true } },
  mocap_rifle_death_from_right: { source: 'mixamo', title: 'Pro Rifle Pack: death from right', take: 'pack-rifle/death from right.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'idle', cycle: 2.533, drawn: true } },
  mocap_rifle_death_from_the_back: { source: 'mixamo', title: 'Pro Rifle Pack: death from the back', take: 'pack-rifle/death from the back.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'idle', cycle: 2.867, drawn: true } },
  mocap_rifle_death_from_the_front: { source: 'mixamo', title: 'Pro Rifle Pack: death from the front', take: 'pack-rifle/death from the front.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'idle', cycle: 2.65, drawn: true } },
  mocap_rifle_idle: { source: 'mixamo', title: 'Pro Rifle Pack: idle', take: 'pack-rifle/idle.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'lowReady', cycle: 2.033, drawn: true } },
  mocap_rifle_idle_aiming: { source: 'mixamo', title: 'Pro Rifle Pack: idle aiming', take: 'pack-rifle/idle aiming.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'aimStill', cycle: 2.1, drawn: true, aim: true } },
  mocap_rifle_idle_crouching: { source: 'mixamo', title: 'Pro Rifle Pack: idle crouching', take: 'pack-rifle/idle crouching.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'crouchIdle', cycle: 2.067, crouch: true, drawn: true } },
  mocap_rifle_idle_crouching_aiming: { source: 'mixamo', title: 'Pro Rifle Pack: idle crouching aiming', take: 'pack-rifle/idle crouching aiming.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'aimCrouch', cycle: 2.1, crouch: true, drawn: true, aim: true } },
  mocap_rifle_jump_down: { source: 'mixamo', title: 'Pro Rifle Pack: jump down', take: 'pack-rifle/jump down.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'idle', cycle: 0.667, drawn: true } },
  mocap_rifle_jump_loop: { source: 'mixamo', title: 'Pro Rifle Pack: jump loop', take: 'pack-rifle/jump loop.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'idle', cycle: 0.933, drawn: true } },
  mocap_rifle_jump_up: { source: 'mixamo', title: 'Pro Rifle Pack: jump up', take: 'pack-rifle/jump up.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'idle', cycle: 0.533, drawn: true } },
  mocap_rifle_run_backward: { source: 'mixamo', title: 'Pro Rifle Pack: run backward', take: 'pack-rifle/run backward.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'jog', cycle: 0.5, drawn: true } },
  mocap_rifle_run_backward_left: { source: 'mixamo', title: 'Pro Rifle Pack: run backward left', take: 'pack-rifle/run backward left.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'jog', cycle: 0.5, drawn: true } },
  mocap_rifle_run_backward_right: { source: 'mixamo', title: 'Pro Rifle Pack: run backward right', take: 'pack-rifle/run backward right.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'jog', cycle: 0.5, drawn: true } },
  mocap_rifle_run_forward: { source: 'mixamo', title: 'Pro Rifle Pack: run forward', take: 'pack-rifle/run forward.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'jog', cycle: 0.5, move: 'fwd', drawn: true, circle: true } },
  mocap_rifle_run_forward_left: { source: 'mixamo', title: 'Pro Rifle Pack: run forward left', take: 'pack-rifle/run forward left.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'jog', cycle: 0.5, drawn: true } },
  mocap_rifle_run_forward_right: { source: 'mixamo', title: 'Pro Rifle Pack: run forward right', take: 'pack-rifle/run forward right.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'jog', cycle: 0.5, move: 'fwd', drawn: true } },
  mocap_rifle_run_left: { source: 'mixamo', title: 'Pro Rifle Pack: run left', take: 'pack-rifle/run left.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'jog', cycle: 0.5, drawn: true } },
  mocap_rifle_run_right: { source: 'mixamo', title: 'Pro Rifle Pack: run right', take: 'pack-rifle/run right.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'jog', cycle: 0.5, move: 'side', drawn: true } },
  mocap_rifle_sprint_backward: { source: 'mixamo', title: 'Pro Rifle Pack: sprint backward', take: 'pack-rifle/sprint backward.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'run', cycle: 0.5, drawn: true } },
  mocap_rifle_sprint_backward_left: { source: 'mixamo', title: 'Pro Rifle Pack: sprint backward left', take: 'pack-rifle/sprint backward left.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'run', cycle: 0.5, drawn: true } },
  mocap_rifle_sprint_backward_right: { source: 'mixamo', title: 'Pro Rifle Pack: sprint backward right', take: 'pack-rifle/sprint backward right.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'run', cycle: 0.5, drawn: true } },
  mocap_rifle_sprint_forward: { source: 'mixamo', title: 'Pro Rifle Pack: sprint forward', take: 'pack-rifle/sprint forward.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'run', cycle: 0.5, move: 'fwd', drawn: true, circle: true } },
  mocap_rifle_sprint_forward_left: { source: 'mixamo', title: 'Pro Rifle Pack: sprint forward left', take: 'pack-rifle/sprint forward left.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'run', cycle: 0.5, drawn: true } },
  mocap_rifle_sprint_forward_right: { source: 'mixamo', title: 'Pro Rifle Pack: sprint forward right', take: 'pack-rifle/sprint forward right.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'run', cycle: 0.5, move: 'fwd', drawn: true } },
  mocap_rifle_sprint_left: { source: 'mixamo', title: 'Pro Rifle Pack: sprint left', take: 'pack-rifle/sprint left.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'run', cycle: 0.5, drawn: true } },
  mocap_rifle_sprint_right: { source: 'mixamo', title: 'Pro Rifle Pack: sprint right', take: 'pack-rifle/sprint right.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'run', cycle: 0.5, move: 'side', drawn: true } },
  mocap_rifle_turn_90_left: { source: 'mixamo', title: 'Pro Rifle Pack: turn 90 left', take: 'pack-rifle/turn 90 left.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'lowReady', cycle: 0.983, drawn: true } },
  mocap_rifle_turn_90_right: { source: 'mixamo', title: 'Pro Rifle Pack: turn 90 right', take: 'pack-rifle/turn 90 right.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'lowReady', cycle: 0.933, drawn: true } },
  mocap_rifle_walk_backward: { source: 'mixamo', title: 'Pro Rifle Pack: walk backward', take: 'pack-rifle/walk backward.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'aim', cycle: 0.967, drawn: true, aim: true } },
  mocap_rifle_walk_backward_left: { source: 'mixamo', title: 'Pro Rifle Pack: walk backward left', take: 'pack-rifle/walk backward left.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'aim', cycle: 1, drawn: true, aim: true } },
  mocap_rifle_walk_backward_right: { source: 'mixamo', title: 'Pro Rifle Pack: walk backward right', take: 'pack-rifle/walk backward right.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'aim', cycle: 1, drawn: true, aim: true } },
  mocap_rifle_walk_crouching_backward: { source: 'mixamo', title: 'Pro Rifle Pack: walk crouching backward', take: 'pack-rifle/walk crouching backward.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'aimCrouchMove', cycle: 1, crouch: true, drawn: true, aim: true } },
  mocap_rifle_walk_crouching_backward_left: { source: 'mixamo', title: 'Pro Rifle Pack: walk crouching backward left', take: 'pack-rifle/walk crouching backward left.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'aimCrouchMove', cycle: 1, crouch: true, drawn: true, aim: true } },
  mocap_rifle_walk_crouching_backward_right: { source: 'mixamo', title: 'Pro Rifle Pack: walk crouching backward right', take: 'pack-rifle/walk crouching backward right.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'aimCrouchMove', cycle: 1, crouch: true, drawn: true, aim: true } },
  mocap_rifle_walk_crouching_forward: { source: 'mixamo', title: 'Pro Rifle Pack: walk crouching forward', take: 'pack-rifle/walk crouching forward.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'sneak', cycle: 1, move: 'fwd', crouch: true, drawn: true } },
  mocap_rifle_walk_crouching_forward_left: { source: 'mixamo', title: 'Pro Rifle Pack: walk crouching forward left', take: 'pack-rifle/walk crouching forward left.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'sneak', cycle: 1, crouch: true, drawn: true } },
  mocap_rifle_walk_crouching_forward_right: { source: 'mixamo', title: 'Pro Rifle Pack: walk crouching forward right', take: 'pack-rifle/walk crouching forward right.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'sneak', cycle: 1, move: 'fwd', crouch: true, drawn: true } },
  mocap_rifle_walk_crouching_left: { source: 'mixamo', title: 'Pro Rifle Pack: walk crouching left', take: 'pack-rifle/walk crouching left.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'aimCrouchMove', cycle: 1, crouch: true, drawn: true, aim: true } },
  mocap_rifle_walk_crouching_right: { source: 'mixamo', title: 'Pro Rifle Pack: walk crouching right', take: 'pack-rifle/walk crouching right.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'aimCrouchMove', cycle: 1, move: 'side', crouch: true, drawn: true, aim: true } },
  mocap_rifle_walk_forward: { source: 'mixamo', title: 'Pro Rifle Pack: walk forward', take: 'pack-rifle/walk forward.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'walk', cycle: 1, move: 'fwd', drawn: true, circle: true } },
  mocap_rifle_walk_forward_left: { source: 'mixamo', title: 'Pro Rifle Pack: walk forward left', take: 'pack-rifle/walk forward left.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'walk', cycle: 1, drawn: true } },
  mocap_rifle_walk_forward_right: { source: 'mixamo', title: 'Pro Rifle Pack: walk forward right', take: 'pack-rifle/walk forward right.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'walk', cycle: 1, move: 'fwd', drawn: true } },
  mocap_rifle_walk_left: { source: 'mixamo', title: 'Pro Rifle Pack: walk left', take: 'pack-rifle/walk left.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'aim', cycle: 1, drawn: true, aim: true } },
  mocap_rifle_walk_right: { source: 'mixamo', title: 'Pro Rifle Pack: walk right', take: 'pack-rifle/walk right.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'aim', cycle: 1, move: 'side', drawn: true, aim: true } },
  mocap_right_strafe_walking: { source: 'mixamo', title: 'Right Strafe Walking', take: 'Right Strafe Walking.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'aim', cycle: 1.033, move: 'side', drawn: true, aim: true } },
  mocap_right_turn: { source: 'mixamo', title: 'Right Turn', take: 'Right Turn.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'idle', cycle: 0.767 } },
  mocap_run_backwards: { source: 'mixamo', title: 'Run Backwards', take: 'Run Backwards.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'run', cycle: 1.5 } },
  mocap_run_to_stop: { source: 'mixamo', title: 'Run To Stop', take: 'Run To Stop.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'run', cycle: 0.9 } },
  mocap_running: { source: 'mixamo', title: 'Running', take: 'Running.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'run', cycle: 0.633, move: 'fwd', circle: true } },
  mocap_shooter_firing_rifle: { source: 'mixamo', title: 'Shooter Pack: firing rifle', take: 'pack-shooter/firing rifle.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'aimStill', cycle: 1.133, drawn: true, aim: true } },
  mocap_shooter_jump_backward: { source: 'mixamo', title: 'Shooter Pack: jump backward', take: 'pack-shooter/jump backward.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'idle', cycle: 0.9, drawn: true } },
  mocap_shooter_jump_forward: { source: 'mixamo', title: 'Shooter Pack: jump forward', take: 'pack-shooter/jump forward.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'idle', cycle: 0.9, drawn: true } },
  mocap_shooter_rifle_aiming_idle: { source: 'mixamo', title: 'Shooter Pack: rifle aiming idle', take: 'pack-shooter/rifle aiming idle.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'aimStill', cycle: 3, drawn: true, aim: true } },
  mocap_shooter_rifle_run: { source: 'mixamo', title: 'Shooter Pack: rifle run', take: 'pack-shooter/rifle run.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'jog', cycle: 0.733, move: 'fwd', drawn: true, circle: true } },
  mocap_shooter_run_backwards: { source: 'mixamo', title: 'Shooter Pack: run backwards', take: 'pack-shooter/run backwards.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'jog', cycle: 0.533, drawn: true } },
  mocap_shooter_start_walking: { source: 'mixamo', title: 'Shooter Pack: start walking', take: 'pack-shooter/start walking.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'walk', cycle: 1.333, drawn: true } },
  mocap_shooter_start_walking_backwards: { source: 'mixamo', title: 'Shooter Pack: start walking backwards', take: 'pack-shooter/start walking backwards.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'aim', cycle: 2.017, drawn: true, aim: true } },
  mocap_shooter_stop_walking: { source: 'mixamo', title: 'Shooter Pack: stop walking', take: 'pack-shooter/stop walking.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'walk', cycle: 2.467, drawn: true } },
  mocap_shooter_strafe: { source: 'mixamo', title: 'Shooter Pack: strafe', take: 'pack-shooter/strafe.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'aim', cycle: 0.667, move: 'side', drawn: true, aim: true } },
  mocap_shooter_strafe_2: { source: 'mixamo', title: 'Shooter Pack: strafe (2)', take: 'pack-shooter/strafe (2).fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'aim', cycle: 0.533, drawn: true, aim: true } },
  mocap_shooter_walk_backwards_stop: { source: 'mixamo', title: 'Shooter Pack: walk backwards stop', take: 'pack-shooter/walk backwards stop.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'aim', cycle: 1.267, drawn: true, aim: true } },
  mocap_shooter_walking: { source: 'mixamo', title: 'Shooter Pack: walking', take: 'pack-shooter/walking.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'walk', cycle: 1.367, move: 'fwd', drawn: true, circle: true } },
  mocap_shooter_walking_backwards: { source: 'mixamo', title: 'Shooter Pack: walking backwards', take: 'pack-shooter/walking backwards.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'aim', cycle: 1.367, drawn: true, aim: true } },
  mocap_shooter_walking_to_dying: { source: 'mixamo', title: 'Shooter Pack: walking to dying', take: 'pack-shooter/walking to dying.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'walk', cycle: 2.533, drawn: true } },
  mocap_stabbing: { source: 'mixamo', title: 'Stabbing', take: 'Stabbing.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'idle', cycle: 2.633 } },
  mocap_stand_cover_to_look: { source: 'mixamo', title: 'Stand Cover To Look', take: 'Stand Cover To Look.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'wallPeek', cycle: 1.483 } },
  mocap_stand_to_crouch: { source: 'mixamo', title: 'Stand To Crouch', take: 'Stand To Crouch.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'crouchIdle', cycle: 0.55 } },
  mocap_standing_idle: { source: 'mixamo', title: 'Standing Idle', take: 'Standing Idle.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'idle', cycle: 6 } },
  mocap_standing_melee_attack_downward: { source: 'mixamo', title: 'Standing Melee Attack Downward', take: 'Standing Melee Attack Downward.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'idle', cycle: 2.133 } },
  mocap_start_walking: { source: 'mixamo', title: 'Start Walking', take: 'Start Walking.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'walk', cycle: 1.383 } },
  mocap_stop_walking: { source: 'mixamo', title: 'Stop Walking', take: 'Stop Walking.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'walk', cycle: 2.25 } },
  mocap_taking_cover_idle: { source: 'mixamo', title: 'Taking Cover Idle', take: 'Taking Cover Idle (rifle).fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'wallIdle', cycle: 2.267, drawn: true } },
  mocap_walking: { source: 'mixamo', title: 'Walking', take: 'Walking.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'walk', cycle: 1.033, move: 'fwd', circle: true } },
  mocap_walking_backwards: { source: 'mixamo', title: 'Walking Backwards', take: 'Walking Backwards.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'walk', cycle: 0.967 } },
  mocap_walking_left_turn: { source: 'mixamo', title: 'Walking Left Turn', take: 'Walking Left Turn.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'walk', cycle: 1.1 } },
  mocap_walking_left_turn_mirror: { source: 'mixamo', title: 'Walking Left Turn (Mirror = right turn)', take: 'Walking Left Turn (Mirror = right turn).fbx', credit: MIXAMO_CREDIT, studio: { kind: 'keyed', body: 'walk', cycle: 1.083 } },
  // @mixamo-keyed-end
  // @mixamo-trav-begin (M4, scripts/mocap/mixamoChannels.mjs: one row per src/anim/clips/mixamo/trav_<slug>.ts; generated, do not edit)
  mocap_hanging_idle: { source: 'mixamo', title: 'Hanging Idle', take: 'Hanging Idle.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'trav', loop: 'trav:ledge' } },
  mocap_braced_hang_shimmy_left: { source: 'mixamo', title: 'Braced Hang Shimmy Left', take: 'Braced Hang Shimmy Left.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'trav', loop: 'trav:ledge' } },
  mocap_braced_hang_shimmy_right: { source: 'mixamo', title: 'Braced Hang Shimmy Right', take: 'Braced Hang Shimmy Right.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'trav', loop: 'trav:ledge' } },
  mocap_climbing_ladder: { source: 'mixamo', title: 'Climbing Ladder', take: 'Climbing Ladder.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'trav', loop: 'trav:ladder' } },
  mocap_crawling_hands_and_knees: { source: 'mixamo', title: 'Crawling Hands And Knees', take: 'Crawling Hands And Knees.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'trav', loop: 'trav:vent' } },
  mocap_freehang_climb: { source: 'mixamo', title: 'Freehang Climb', take: 'Freehang Climb.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'trav', loop: 'trav:ledge' } },
  mocap_braced_hang_to_crouch: { source: 'mixamo', title: 'Braced Hang To Crouch', take: 'Braced Hang To Crouch.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'trav', loop: 'trav:ledge' } },
  mocap_climbing_ladder_to_standing: { source: 'mixamo', title: 'Climbing Ladder To Standing', take: 'Climbing Ladder To Standing.fbx', credit: MIXAMO_CREDIT, studio: { kind: 'trav', loop: 'trav:ladder' } },
  // @mixamo-trav-end
};

/** The clip names with a row, in table order (CMU first, then the Mixamo blocks). */
export const MOCAP_SOURCE_NAMES: readonly string[] = Object.keys(MOCAP_SOURCES);

const BY_NAME = new Map<string, MocapSource>(Object.entries(MOCAP_SOURCES));

/** A clip's row (null: not a capture, a hand-made clip). No allocation. */
export function mocapSource(name: string): MocapSource | null {
  return BY_NAME.get(name) ?? null;
}

/** A clip's source tag for packed keys: 0 not a capture, 1 CMU, 2 Mixamo. No allocation. */
export function mocapSourceTag(name: string): number {
  const r = BY_NAME.get(name);
  return r === undefined ? 0 : r.source === 'cmu' ? 1 : 2;
}

/** The source word of a tag (`mocapSourceTag`): '' none, 'CMU', 'Mixamo'. */
export function mocapSourceTagWord(tag: number): string {
  return tag === 1 ? MOCAP_SOURCE_WORD.cmu : tag === 2 ? MOCAP_SOURCE_WORD.mixamo : '';
}
