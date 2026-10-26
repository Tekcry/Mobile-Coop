/**
 * (mocap-trial) The rollback switch for mocap locomotion (pure, Babylon-free; docs/mocap-trial/BRIEF.md, CLIP-FORMAT.md).
 *
 * Two clip sets in the one keyed format (`keyed.ts`, sampled by the same code): the hand-keyed set (`HAND_KEYED_SET`, the
 * game as it was) and the mocap set (`MOCAP_SET`, `clips/mocap/*`: CMU takes retargeted onto Wren: walk / jog / run from one
 * performer, subject 16; the walking turns, start and stop from subject 16, the turn on the spot from subject 69). `LOCO.set` is the set
 * Wren's graph samples for the holstered standing walk / jog / run and, when filled, the turn / start / stop slots
 * (`MocapSlots`). It is resolved once per change (`applyMocapSwitch`, from `?mocap=0/1` and the "Mocap locomotion"
 * setting); the graph reads the reference every frame (no allocation, no lookup). (A3) A mocap clip with a `feet`
 * channel also places the steps itself: the foot planner's clip feet mode (`MOCAP_FEET`, `FootPlanner.clipFoot`).
 *
 * One switch per machine: every rig drawn here follows it, the local player and the co-op partner alike (a visual
 * choice; nothing goes on the wire, the partner's machine draws by its own setting). Guards never play the keyed sets
 * (`AnimInput.keyedOk` is off for them). The drawn set (gun out), the crouched set, the standing idle and the wall set
 * stay hand-keyed; so do the guards, the studio's keyed loops and every weapon clip. (mocap-trial-2) Except the holstered
 * crouched sneak band's body: the set's `crouchWalk` (CMU 136_09) over the planner's feet (animGraph `crouchSet`, BRIEF A5).
 */
import { GLIDE_SIDE, sideStepAt, TURN_GAIT_MIN } from './motion';
import type { ClipFeetIn } from './footPlanner';
import { layerMul, mirrorKeyed, mixKeyed, mixKeyedArms, newKeyedPose, sampleKeyed, type KeyedClip, type KeyedLayerScale, type KeyedPose } from './keyed';
import { KEYED_WALK } from './clips/keyed/walk';
import { KEYED_JOG } from './clips/keyed/jog';
import { KEYED_RUN } from './clips/keyed/run';
import { MOCAP_WALK } from './clips/mocap/walk';
import { MOCAP_JOG } from './clips/mocap/jog';
import { MOCAP_RUN } from './clips/mocap/run';
import { MOCAP_TURN_IN_PLACE } from './clips/mocap/turn_in_place';
import { MOCAP_TURN_MOVE_L } from './clips/mocap/turn_move_l';
import { MOCAP_TURN_MOVE_R } from './clips/mocap/turn_move_r';
import { MOCAP_START, MOCAP_START_SECONDS } from './clips/mocap/start';
import { MOCAP_STOP, MOCAP_STOP_SECONDS } from './clips/mocap/stop';
import { MOCAP_CROUCH_WALK } from './clips/mocap/crouch_walk';
import { MOCAP_SPRINT } from './clips/mocap/sprint';
import { MOCAP_STRAFE_L } from './clips/mocap/strafe_l';
import { MOCAP_STRAFE_R } from './clips/mocap/strafe_r';
import { noteMoveSources } from './nowPlaying';
import { flags } from '../core/flags'; // (J19 S5) ?mocapraw=1

/**
 * Per-layer scales for the mocap set (one table; the job lead tunes them once the real clips land). Each scales a
 * procedural or tuner layer that would double up with what a capture already holds, only on the mocap set's share of
 * the pose; 1 keeps the layer exactly as it is (the hand-keyed set never reads this table, and with the switch off
 * nothing does). A multiplier layer (identity 1) is moved toward 1 by `1 - s` (`layerMul`); an additive one is scaled.
 * - `armSwing`: the tuner's arm swing gain (`TUNE_CUR.armSwingK`: armSwingMul + armSwingGrow x speed) on the clip's arms
 *   (a capture swings its own arms at its own speed).
 * - `trunkTwist`: the tuner's trunk counter-rotation multiplier (`trunkTwistMul`) on the clip's spine and chest yaw.
 * - `keyLean`: the tuner's forward lean (`leanAdd`) added to the clip's spine (a capture leans with its own speed).
 * - `pelvisFollow`: the hips trailing the chest toward the planted feet standing holstered (`PELVIS_FOLLOW_KEYED`, rig),
 *   on top of the clip's own pelvis yaw.
 * - `weightLoad`: the Weight section's plant / landing pelvis drop (`WEIGHT_POSE.pelY`) on top of the clip's own load dip.
 * - `elbowOut`: the Body tune's elbow-out push on the keyed arms (`TUNE_CUR.elbowOutAdd`, rig keyedArm), on top of the
 *   clip's own elbows (a capture carries its elbows where the performer did).
 * - `stopSettle`: the procedural stop settle clip's weight (`STOP_SETTLE`, remote copies from the derived motion state)
 *   on top of a captured stop.
 * - (anim-natural N2 merge, master 4.61.0, `bodyMotion.ts`) `motionArmGain`: KEY_MOTION's per-clip arm gain on the
 *   clip's arms (the graph's speed set, `armGain`); `motionTrunk`: the layer's pelvis / shoulder yaw swing (hipYaw,
 *   chestYaw); `motionSway`: its pelvis lateral sway (pelX); `motionHead`: the head following the chest's yaw
 *   (headFollow); `motionNod`: the head's nod with the steps (headPitch); `motionArmCap`: the keyed arm speed cap
 *   (armSpeed, the rig's `armCap`: 0 lets it go on the share); `keyPelRate`: the keyed pelvis offset's rate limit
 *   (characterRig KEY_PEL_RATE: 0 lets it go on the share). The layer's parts are scaled in the graph (`bodyMotion`).
 * - (afp-af2, `MOCAP_RUN_POSE`, past a jog only) `pelHeight`: the capture's mean pelvis height (1: the clip's absolute
 *   height on the procedural one, run 6.9 cm and sprint 12.5 cm low: bent knees; 0: the clip's bob about its own mean);
 *   `trunkMean`: the capture's mean pelvis / chest roll and yaw and its chest pitch (1: as captured, the run's -4.5 deg
 *   pelvis roll; 0: roll and yaw off, the pitch the CT carriage's); `bankWipe`: the keyed trunk wiping the graph's turn
 *   bank (1: as before, no bank; 0: the bank over the capture); `armSmooth`: the raw keyed arm points (1: as sampled; 0:
 *   through the arm follower).
 * - `turnStep`: anim-natural N1's turn rules (the turn step, the ball pivot, the held contact) on the mocap set: 1, they
 *   stay (fast turns, starts and stops hand the steps to the planner, which turns them). Not a scale (the planner's
 *   `turnRule` is an on / off opt-out), so nothing reads it.
 * (integration, measured on the headless rig, tests/mocapSwitch.test.ts) Every layer that doubles the capture is off on
 * the mocap share: Michael's Body tune swings the keyed arms 1.7x at the jog and 1.6x at the run (the capture's own swing
 * doubled: elbows 10.3 cm out at the jog, over e2e-anim's 8) and pushes the elbows out 3 cm (the walk's 9.0 cm, over
 * 8.3); the twist, lean, Weight load and stop settle sliders sit at identity today and stay off the capture if moved;
 * the pelvis follow added its own yaw over the capture's (a walking 90 deg turn's pelvis 30.6 deg p2p, 25.3 off).
 * (N2 merge, BRIEF M1 "Mocap, as captured") N2's additive parts double what the capture holds, so they are off on it:
 * the walk arm gain 1.3 (wrist +2.1 cm at 1.4 m/s; the capture swings its own arms at its own speed, as `armSwing`),
 * the trunk counter-rotation (+1.1-1.9 cm at the wrists: the clip's `q` holds the performer's pelvis / shoulder yaw, as
 * `trunkTwist`), the sway (+1.2 cm at the hips: the clip's `pel` holds the performer's lateral weight shift), the head
 * follow and nod (the clip's `head` channel holds the performer's head turn and nod over the look). The two limiters stay
 * (1): under their limits they are identity, and on the capture's own walk / jog / run, walking turns and starts they
 * never engage (0.000 cm with or without); they act only where the clips cross-fade in a frame (a pace jump across the
 * speed bands: the arm cap holds a 29.7 cm wrist jump, KEY_PEL_RATE a 5.3 cm toe / pelvis jump), pops M1 still fixes.
 */
export const MOCAP_LAYERS = {
  armSwing: 0,
  trunkTwist: 0,
  keyLean: 0,
  pelvisFollow: 0,
  weightLoad: 0,
  elbowOut: 0,
  stopSettle: 0,
  motionArmGain: 0,
  motionTrunk: 0,
  motionSway: 0,
  motionHead: 0,
  motionNod: 0,
  motionArmCap: 1,
  keyPelRate: 1,
  turnStep: 1,
  pelHeight: 0,
  trunkMean: 0,
  bankWipe: 0,
  armSmooth: 0,
};
export type MocapLayers = typeof MOCAP_LAYERS;

/**
 * (afp-af2, BRIEF A2: Michael "hands randomly moving around when running, weird pose when running") The run carriage
 * over the capture, by the rig (characterRig `mocapRunPose`) on the mocap share, eased in from `from` to `to` m/s (none
 * walking: the walk, its turns, starts and stops stay as captured). The captures' own means are followed over `tau` s
 * (two first-order stages: the cycle's bob and sway filtered out, a pace change followed within ~0.5 s):
 * - `bob`, `lift` (1.75 m units), eased in from `liftFrom` to `liftTo` m/s: the capture's height swing about its mean is
 *   scaled by `bob` and the whole raised by `lift` (the run's stance knee 59 -> ~34 deg, its hips 2-5 cm over the
 *   hand-keyed run's; at the jog a lift overreached the trailing leg at toe-off: the pelvis drop jerked 3 cm a frame).
 * - `pitch` / `pitchSprint` (rad): the chest's forward pitch in place of the capture's mean on the run share: `pitch`
 *   below `pitchFrom` m/s (J19 S5, R25, G217 "no lean until full speed": upright, the jog's trunk within 1 deg of the
 *   walk's), `pitchSprint` from `pitchTo` on (the full run's CT carriage, run 10-20 deg; the name kept, characterRig reads
 *   it: there is no sprint, G31), linear between. `pitchTo` 3.8 sits under the run's 4.0 m/s less its stride swell
 *   (MOVEMENT.rootDip 2.5 %), so the full run never leaves it.
 * - `bankLag` (s): the graph's pelvis roll (the turn bank, BANK) followed before it goes over the capture.
 * - `armTau` (s), `armLead` (0..1): the keyed arm points (chest frame) through a critically damped follower on the share
 *   (`armSmooth`), the points' own rate fed forward by `armLead` (0: ~5 frames late and 30 % smaller at the run; 0.7: ~2
 *   frames, ~10 %); `elbowRate` (rad/s): keepElbowOut's 15 deg swivel steps eased in and out at most this fast.
 * Undo: the four MOCAP_LAYERS entries `pelHeight`, `trunkMean`, `bankWipe`, `armSmooth` back to 1 (as captured).
 */
export const MOCAP_RUN_POSE = { from: 2.0, to: 2.6, tau: 0.25, bob: 0.35, lift: 0.05, liftFrom: 3.0, liftTo: 4.0, pitch: 0.01, pitchSprint: 0.26, pitchFrom: 3.5, pitchTo: 3.8, bankLag: 0.06, armTau: 0.08, armLead: 0.7, elbowRate: 4 } as const;
// (the sampler reads the three it owns through the keyed format's own interface)
const _LAYERS_FIT: KeyedLayerScale = MOCAP_LAYERS;
void _LAYERS_FIT;

/**
 * (J19 S5, R26 / R27, Q37) The capture as recorded, for the option video only (`?mocapraw=1`, `flags.mocapRaw`; dev
 * compare, default off, owner Night Shift | Player Build; removed at the Q37 walk 2026-10-29 with the option Michael
 * picks): the AF2 corrections off (MOCAP_LAYERS pelHeight / trunkMean / bankWipe / armSmooth at 1, as captured: the
 * R25 chest pitch goes with trunkMean) and the AF3 crouch walk re-pose off (animGraph `crouchSet`: no lean, drop or
 * hips-back, the whole sway). Every source's mocap set shares MOCAP_LAYERS. `on` is read by the graph every frame.
 */
export const MOCAP_RAW = { on: false };
/** The four AF2 corrections as shipped (read once, at load), put back when the compare goes off. */
const AF2_SHIPPED = {
  pelHeight: MOCAP_LAYERS.pelHeight,
  trunkMean: MOCAP_LAYERS.trunkMean,
  bankWipe: MOCAP_LAYERS.bankWipe,
  armSmooth: MOCAP_LAYERS.armSmooth,
};
/** (J19 S5) The `?mocapraw=1` compare on / off (at load from the flag; tests). Once per change, never per frame. */
export function setMocapRaw(on: boolean): void {
  MOCAP_RAW.on = on;
  MOCAP_LAYERS.pelHeight = on ? 1 : AF2_SHIPPED.pelHeight;
  MOCAP_LAYERS.trunkMean = on ? 1 : AF2_SHIPPED.trunkMean;
  MOCAP_LAYERS.bankWipe = on ? 1 : AF2_SHIPPED.bankWipe;
  MOCAP_LAYERS.armSmooth = on ? 1 : AF2_SHIPPED.armSmooth;
}
if (flags.mocapRaw) setMocapRaw(true);

/** A locomotion clip set: the standing holstered speed blend and the optional slots (null: not filled). */
export interface LocoClipSet {
  readonly id: 'keyed' | 'mocap';
  readonly walk: KeyedClip;
  readonly jog: KeyedClip;
  readonly run: KeyedClip;
  /** (mocap-trial-2, sprint) The sprint cycle crossed into past the run (animGraph `speedSet`, BRIEF A6; null: the run is the top). */
  readonly sprint: KeyedClip | null;
  /** A 90 deg turn on the spot to the right (the left plays it mirrored), by the yaw turned. */
  readonly turnInPlace: KeyedClip | null;
  /** 90 deg turns while walking, left and right (an empty side plays the other mirrored), by the yaw turned. */
  readonly turnMoveL: KeyedClip | null;
  readonly turnMoveR: KeyedClip | null;
  /** A start from standing and a stop to standing, one-shots over their seconds. */
  readonly start: KeyedClip | null;
  readonly stop: KeyedClip | null;
  readonly startSeconds: number;
  readonly stopSeconds: number;
  /** The layer scales this set's clips are sampled with (null: the layers as they are). */
  readonly layers: MocapLayers | null;
  /** (mocap-trial-2, crouch) The crouched sneak's cycle in place of the hand-keyed sneak (animGraph `crouchSet`; null: the
   *  hand-keyed sneak). The faster crouched bands stay hand-keyed (BRIEF A5). */
  readonly crouchWalk: KeyedClip | null;
  /** (mocap-trial-2, strafe) The aimed strafe's sideways cycles, left (travel -x) and right (+x), in place of the hand-keyed
   *  glide strafe (animGraph `keyedDrawnSet`), with their side-step (`mocapSideStep`; null: the glide strafe, BRIEF A10). */
  readonly strafeL: KeyedClip | null;
  readonly strafeR: KeyedClip | null;
}

/** The hand-keyed set: the game as it was (no slots: starts, stops and turns stay procedural). */
export const HAND_KEYED_SET: LocoClipSet = {
  id: 'keyed',
  walk: KEYED_WALK,
  jog: KEYED_JOG,
  run: KEYED_RUN,
  sprint: null,
  turnInPlace: null,
  turnMoveL: null,
  turnMoveR: null,
  start: null,
  stop: null,
  startSeconds: 0.6,
  stopSeconds: 0.6,
  layers: null,
  crouchWalk: null,
  strafeL: null,
  strafeR: null,
};

/** The mocap set (`clips/mocap/*`). */
export const MOCAP_SET: LocoClipSet = {
  id: 'mocap',
  walk: MOCAP_WALK,
  jog: MOCAP_JOG,
  run: MOCAP_RUN,
  sprint: MOCAP_SPRINT,
  turnInPlace: MOCAP_TURN_IN_PLACE,
  turnMoveL: MOCAP_TURN_MOVE_L,
  turnMoveR: MOCAP_TURN_MOVE_R,
  start: MOCAP_START,
  stop: MOCAP_STOP,
  startSeconds: MOCAP_START_SECONDS,
  stopSeconds: MOCAP_STOP_SECONDS,
  layers: MOCAP_LAYERS,
  crouchWalk: MOCAP_CROUCH_WALK,
  strafeL: MOCAP_STRAFE_L,
  strafeR: MOCAP_STRAFE_R,
};

// (mixamo-retarget M5) the line's sources before the first switch (the mocap set is the only one with captures)
noteMoveSources(MOCAP_SET);

/** Any slot filled (the graph runs `MocapSlots` only then). */
export function hasSlots(S: LocoClipSet): boolean {
  return S.turnInPlace !== null || S.turnMoveL !== null || S.turnMoveR !== null || S.start !== null || S.stop !== null;
}

/**
 * The switch's state, read by the graph and the rig every frame: `set` the set the holstered standing gait samples,
 * `mocap` whether it is the mocap set, `slots` whether that set has a slot filled. Written only by `setMocapLocomotion`.
 */
export const LOCO: { set: LocoClipSet; mocap: boolean; slots: boolean } = { set: HAND_KEYED_SET, mocap: false, slots: false };

/**
 * (mixamo-retarget I1, PLAN Claims "crouch-walk slot") The mocap set with another crouched walk in its slot (the Mixamo
 * capture under `?mixamo=1`; `mixamo.ts` hands it over, this module never imports that one): a copy of `MOCAP_SET` made
 * once, and the set the switch's ON side uses (`MOCAP_SET` itself, untouched, unless a crouched walk is handed over).
 */
const MOCAP_SET_MX: { -readonly [K in keyof LocoClipSet]: LocoClipSet[K] } = { ...MOCAP_SET };
let mocapActive: LocoClipSet = MOCAP_SET;

/**
 * (mixamo-retarget I6) The mocap set's clip slots a Mixamo capture may take (the set's seconds and layers stay CMU's: a
 * start / stop capture plays by progress over `MOCAP_START_SECONDS` / `MOCAP_STOP_SECONDS`, so the game's timing holds).
 * A new slot (turns, strafes) needs only its name here and its recipe's `slot` (mixamo-clips.json).
 */
export const MX_SLOTS = ['walk', 'jog', 'run', 'sprint', 'start', 'stop', 'crouchWalk', 'turnInPlace', 'turnMoveL', 'turnMoveR', 'strafeL', 'strafeR'] as const;
export type MixamoLocoSlot = (typeof MX_SLOTS)[number];

/** The Mixamo captures handed over per slot (null: the CMU clip); written by `setMocapMixamo` only. */
const MX_TAKEN: Record<MixamoLocoSlot, KeyedClip | null> = {
  walk: null, jog: null, run: null, sprint: null, start: null, stop: null, crouchWalk: null,
  turnInPlace: null, turnMoveL: null, turnMoveR: null, strafeL: null, strafeR: null,
};

/**
 * (mixamo-retarget I1, I6) Hand Mixamo captures to the mocap set's slots (a slot left out keeps what it had; null: the
 * CMU clip back). Rebuilds `MOCAP_SET_MX` from `MOCAP_SET` as it is now (tests swap its clips) and makes it the switch's
 * ON set while any slot is taken, else `MOCAP_SET` itself (untouched). Once per change, never per frame.
 */
export function setMocapMixamo(slots: Partial<Record<MixamoLocoSlot, KeyedClip | null>>): void {
  for (const k of MX_SLOTS) if (slots[k] !== undefined) MX_TAKEN[k] = slots[k] ?? null;
  Object.assign(MOCAP_SET_MX, MOCAP_SET);
  let any = false;
  for (const k of MX_SLOTS) {
    const c = MX_TAKEN[k];
    if (c) { MOCAP_SET_MX[k] = c; any = true; }
  }
  mocapActive = any ? MOCAP_SET_MX : MOCAP_SET;
  if (LOCO.mocap) setMocapLocomotion(true);
}

/** (mixamo-retarget I1) The crouched walk in the mocap set's slot (null: the CMU 136_09 back); once per change. */
export function setMocapCrouchWalk(c: KeyedClip | null): void {
  setMocapMixamo({ crouchWalk: c });
}

/** Switch the clip set (once per change; a toggle mid-stride takes the new set on the next frame). */
export function setMocapLocomotion(on: boolean): void {
  LOCO.mocap = on;
  LOCO.set = on ? mocapActive : HAND_KEYED_SET;
  LOCO.slots = hasSlots(LOCO.set);
  noteMoveSources(LOCO.set); // (mixamo-retarget M5) the Now playing line's source per move (CMU / Mixamo)
}

/**
 * (mocap-trial-2, strafe, BRIEF A10) The mocap strafe's rhythm: `cycle` the captures' cycle (s; 69_59 left 1.000, 69_56 right
 * 0.967: their mean), `height` Wren's (m; the clips' `stride` is in 1.75 m units). At pace v the side-step keeps the
 * capture's rhythm, its cycle scaled by sqrt(clip pace / v): a cycle travels sqrt(v x stride x cycle) (the clips' mean
 * stride 0.49 m at 0.50 m/s: game / clip stride 0.89 at 0.4 m/s, 1.18 at the 0.7 m/s aimed strafe, 1.34 at 0.9).
 */
export const MOCAP_STRAFE = { cycle: 0.983, height: 1.68, strideExp: 0.25 } as const;

/** (mocap-trial-2, strafe) The aimed side-step (m, half a cycle's travel) at pace v with the switch on and a strafe in the
 *  set (motion.ts `GLIDE_SIDE` / `sideStepAt`, read by `stepLength`: the driver's and the graph's gait clocks), else NaN.
 *  No allocation. */
export function mocapSideStep(v: number): number {
  const S = LOCO.set;
  return !LOCO.mocap || S.strafeL === null || S.strafeR === null ? Number.NaN : sideStepAt(v);
}
// the captures' mean stride at Wren's height, their cycle, the stride's pace exponent (the mocap set's strafes)
GLIDE_SIDE.stride = ((MOCAP_STRAFE_L.stride + MOCAP_STRAFE_R.stride) * 0.5 * MOCAP_STRAFE.height) / 1.75;
GLIDE_SIDE.cycle = MOCAP_STRAFE.cycle;
GLIDE_SIDE.exp = MOCAP_STRAFE.strideExp;

/** On or off: the URL flag (`?mocap=1` / `?mocap=0`, null when absent) wins for the page, else the stored setting. */
export function mocapWanted(url: boolean | null, setting: boolean): boolean {
  return url ?? setting;
}

/** Resolve and apply the switch (settings load and every settings change; not per frame). Returns the state. */
export function applyMocapSwitch(url: boolean | null, setting: boolean): boolean {
  const on = mocapWanted(url, setting);
  if (on !== LOCO.mocap || LOCO.set !== (on ? mocapActive : HAND_KEYED_SET)) setMocapLocomotion(on);
  return on;
}

/**
 * When the slots play (the job lead tunes; the retarget never writes these). Parity: every trigger reads what both an
 * owner and a remote copy have (the pace, the forward acceleration: the driver's or `MotionDerive`'s, the yaw rate).
 * - A start: the pace from under `restSpeed` (m/s) to over `moveSpeed`.
 * - A stop: braking along the travel harder than `stopDecel` (m/s^2, as `DERIVE_STOP_DECEL`) from over `stopFrom` m/s.
 * - A turn: the body turning faster than `turnRate` (rad/s, `TURN_GAIT_MIN`), on the spot under `spotSpeed` m/s; 90 deg
 *   of yaw plays the whole clip (a longer spin on the spot replays it); it ends early under half `turnRate`.
 * - Each one-shot fades in over the first `fadeIn` and out over the last `fadeOut` of its progress; `tau` (s) eases the
 *   weight (a cut-off one fades out from where it was).
 * - (integration) The filled slots are walking takes (start, stop, the 90 deg turns on the move): they play only at a
 *   walking pace, up to `walkMax` m/s (a start or a turn on the move cut off past it; a stop braking from over it never
 *   starts). The jog / run turns, the jog stop and the run start are not wired yet (build/mocap/clips/extra).
 * - (fix 1, CHECK decide 3) The start's arms play at most `startArms` of its weight: the take's upper body runs on its
 *   own clock (MOCAP_START_SECONDS), not the gait's, so at full weight the same-side arm and leg swung forward together
 *   (50 / 242 moving frames). Phase-aligning the slot to the gait clock is the later fix.
 * - (fix 2 check) A turn's pass that follows another (a spin on the spot replaying its clip, a spin reversed, a turn
 *   started while the last one still shows) eases in from that one's pose over `easeFrom` s.
 * - (mt2-fixB, CHECK-3 item 3) A turn on the move faster than `turnPlay` rad/s plays at `turnPlay` / its fastest rate of
 *   its weight: the clip runs at the game's turn speed, and at CT's 7.85 rad/s flick its pelvis swing (5 cm out and back,
 *   with the last 25 % fade in 4 frames) moved the hips 2.8-3.0 cm a frame beyond the pace as the flick ended. 4: the
 *   rate the sweeps already passed at. A turn on the move cut off (the yaw rate fell, the pace went past `walkMax`) eases
 *   out over `turnOut` s from its weight (smoothstep), not by `tau`. A turn on the spot as before (fix 2's spin rules).
 * - (mt2-qstop) Not a slot: falling from over `walkMax`, the standing pose's pace (the graph's `mPace`: the procedural
 *   stand and the speed set) falls at most `paceFall` m/s^2 until it meets the pace (a one-frame stop or a hard brake
 *   crossed the speed set's bands in a frame or two: the pelvis 3-10 cm a frame), and a stop's fade to the idle is slower
 *   from over `walkMax` (0.08 s x the pose's pace / walkMax). 4: about the rate of a 5 -> 3 m/s ramp over 0.5 s (effort
 *   pace); 6 left a braked stop from 4 m/s at 2.9 cm a frame. A walking stop poses its own pace (as the hand-keyed set).
 */
export const MOCAP_SLOT = {
  restSpeed: 0.05,
  moveSpeed: 0.1,
  stopDecel: 1.5,
  stopFrom: 0.5,
  turnRate: TURN_GAIT_MIN,
  spotSpeed: 0.5,
  fadeIn: 0.1,
  fadeOut: 0.25,
  tau: 0.06,
  walkMax: 2.2,
  startArms: 0.5,
  easeFrom: 0.2,
  paceFall: 4,
  turnOut: 0.2,
  turnPlay: 4,
};

/** The planner values the slots blend (track half-width, knee pole, duty, lift). */
export interface SlotLegValues {
  half: number;
  kneeOut: number;
  duty: number;
  lift: number;
}

const QUARTER = Math.PI / 2;

/** A one-shot's weight at progress `p`; `holdIn` / `holdOut` skip its fade in / out (a spin on the spot playing on). */
function envelope(p: number, holdIn = false, holdOut = false): number {
  const M = MOCAP_SLOT;
  const a = holdIn ? 1 : p <= 0 ? 0 : p >= M.fadeIn ? 1 : p / M.fadeIn;
  const b = holdOut ? 1 : p >= 1 ? 0 : p <= 1 - M.fadeOut ? 1 : (1 - p) / M.fadeOut;
  const u = a < b ? a : b;
  return u * u * (3 - 2 * u);
}

/**
 * The mocap set's one-shot slots on one graph: their triggers, progress and eased weights (`update`, every frame while
 * the set has a slot filled) and their poses mixed over the standing keyed pose (`apply`). No allocation.
 */
export class MocapSlots {
  /** Progress 0..1 of the start, stop and turn playing (-1: none) and the progress each samples at (held as it fades). */
  startT = -1;
  stopT = -1;
  turnT = -1;
  startP = 0;
  stopP = 0;
  turnP = 0;
  /** The turn's side (1 right, -1 left) and kind (on the spot or on the move), fixed at its start. */
  turnSide = 1;
  turnSpot = false;
  /** The eased weights 0..1. */
  wStart = 0;
  wStop = 0;
  wTurn = 0;
  private still = true;
  /** (fix 2) `still` is seeded from the pace on the first update after a reset (the switch turned on mid-walk, a partner
   *  rig first seen already walking): only a rig that really starts from standing plays the start. */
  private seeded = false;
  private stopArmed = true;
  /** (fix 2) A spin on the spot has passed 90 deg and replays the turn clip (its next pass eases in from the last one's
   *  end pose, at full weight: no dip every 90 deg). */
  private turnWrap = false;
  /** The turn clip `pickTurn` chose and whether it plays mirrored. */
  private tc: KeyedClip | null = null;
  private tm = false;
  /** (fix 2 check) The pose a turn's pass eases in from over `easeFrom` s: clip (null: none), mirrored, progress (a
   *  wrapped spin: the same clip's end; a turn started while the last one still shows, a spin reversed: where it was). */
  private fc: KeyedClip | null = null;
  private fm = false;
  private fp = 0;
  /** (fix 2 check) Seconds since that pass began (it eases in over MOCAP_SLOT.easeFrom). */
  private fromT = 0;
  /** (fix 2) Scratch: the pose a turn's pass eases in from. */
  private readonly tail: KeyedPose = newKeyedPose();
  /** (mt2-fixB) A turn on the move cut off: seconds into its ease out over MOCAP_SLOT.turnOut (-1: none) and its weight
   *  at the cut. */
  private outT = -1;
  private outW = 0;
  /** (mt2-fixB) The fastest yaw rate of this turn pass (rad/s): a turn on the move faster than `turnPlay` plays at
   *  `turnPlay` / it of its weight. */
  private turnPeak = 0;

  reset(): void {
    this.startT = this.stopT = this.turnT = -1;
    this.startP = this.stopP = this.turnP = 0;
    this.wStart = this.wStop = this.wTurn = 0;
    this.still = true;
    this.seeded = false;
    this.stopArmed = true;
    this.turnWrap = false;
    this.fc = null;
    this.outT = -1;
  }

  /** One frame: the pace (m/s), the forward acceleration (m/s^2) and the yaw rate (rad/s, + to the right). */
  update(dt: number, S: LocoClipSet, speed: number, accelFwd: number, yawRate: number): void {
    const M = MOCAP_SLOT;
    // (fix 2) the first frame after a reset: standing only if the pace is at rest now (already walking: no start)
    if (!this.seeded) {
      this.seeded = true;
      this.still = speed < M.restSpeed;
    }
    // a start from standing
    if (speed < M.restSpeed) this.still = true;
    else if (this.still && speed > M.moveSpeed) {
      this.still = false;
      if (S.start !== null) {
        this.startT = 0;
        this.stopT = -1;
      }
    }
    // (integration) a walking start: cut off past a walking pace (a start into a jog or a run keeps the gait's body)
    if (this.startT >= 0 && speed > M.walkMax) this.startT = -1;
    if (this.startT >= 0) {
      this.startT += dt / Math.max(0.05, S.startSeconds);
      this.startP = this.startT;
      if (this.startT >= 1) this.startT = -1;
    }
    // a stop: hard braking from a pace (once per braking: re-armed when the pace stops falling)
    if (accelFwd >= 0) this.stopArmed = true;
    // (integration) braking from over a walking pace never plays the walking stop (not even once it falls through it)
    if (accelFwd < -M.stopDecel && speed > M.walkMax) this.stopArmed = false;
    if (S.stop !== null && this.stopT < 0 && this.stopArmed && speed > M.stopFrom && accelFwd < -M.stopDecel) {
      this.stopT = 0;
      this.startT = -1;
      this.stopArmed = false;
    }
    if (this.stopT >= 0) {
      this.stopT += dt / Math.max(0.05, S.stopSeconds);
      this.stopP = this.stopT;
      // (pushed on again: the stop gives way)
      if (this.stopT >= 1 || accelFwd > M.stopDecel) this.stopT = -1;
    }
    // a turn: by the yaw turned, 90 deg a clip
    const ay = yawRate < 0 ? -yawRate : yawRate;
    const side = yawRate < 0 ? -1 : 1;
    if (this.fromT < M.easeFrom) this.fromT += dt;
    let open = this.turnT < 0;
    if (open) {
      // (none playing)
    } else if (side !== this.turnSide && ay > M.turnRate) {
      // (fix 2 check) turned the other way: the other side's pass starts this frame (a frame cut off dipped the weight)
      this.turnT = -1;
      open = true;
    } else if (ay < M.turnRate * 0.5 || speed > M.walkMax) {
      // (mt2-fixB) a turn on the move cut off eases out over `turnOut` from its weight
      if (!this.turnSpot) {
        this.outT = 0;
        this.outW = this.wTurn;
      }
      this.turnT = -1;
    } else {
      this.turnT += (ay * dt) / QUARTER;
      if (ay > this.turnPeak) this.turnPeak = ay;
      if (this.turnT >= 1) {
        // (fix 2) a spin on the spot replays the clip, the progress carried across the wrap, from the clip's end pose.
        // (fix 2 check) Only still on the spot: walked off, the pass ends and a turn on the move can start
        this.turnWrap = this.turnSpot && speed < M.spotSpeed;
        this.turnT = this.turnWrap ? this.turnT - 1 : -1;
        if (this.turnWrap) {
          this.fc = this.tc;
          this.fm = this.tm;
          this.fp = 1;
          this.fromT = 0;
        }
      }
    }
    if (open && ay > M.turnRate && speed <= M.walkMax) {
      const spot = speed < M.spotSpeed;
      // (fix 2 check) a turn still showing (a spin reversed, one cut off and started again): the new pass eases in from
      // where it was (the clip and side `apply` last posed); a spin reversed on the spot keeps its weight (15.8 deg a
      // frame at 3 rad/s reversed, with a dip to 0.49)
      const fc = this.wTurn > 0 ? this.tc : null;
      const fm = this.tm;
      const hold = fc !== null && spot && this.turnSpot;
      if (this.pickTurn(S, spot, side)) {
        this.turnT = 0;
        this.turnPeak = ay;
        this.turnSide = side;
        this.turnSpot = spot;
        this.turnWrap = hold;
        this.fc = fc;
        this.fm = fm;
        this.fp = this.turnP;
        this.fromT = 0;
      }
    }
    if (this.turnT >= 0) this.turnP = this.turnT;
    const k = 1 - Math.exp(-dt / M.tau);
    this.wStart += ((this.startT >= 0 ? envelope(this.startT) : 0) - this.wStart) * k;
    this.wStop += ((this.stopT >= 0 ? envelope(this.stopT) : 0) - this.wStop) * k;
    // (fix 2) a spin on the spot keeps its full weight: no fade in after a wrap, no fade out while it still spins (a turn
    // that stops is cut off and eases out by `tau`, about as fast as the fade over its last 22 deg at a spin's rate). (fix 2
    // check) While it goes on at all (over half `turnRate`, on the spot: it wraps): a slow spin (0.5-1 rad/s) faded to
    // 0.06 before each wrap
    const spinOn = this.turnSpot && speed < M.spotSpeed;
    if (this.turnT >= 0) this.outT = -1;
    if (this.outT >= 0) {
      this.outT += dt;
      const u = this.outT < M.turnOut ? this.outT / M.turnOut : 1;
      this.wTurn = this.outW * (1 - u * u * (3 - 2 * u));
      if (u >= 1) this.outT = -1;
    } else this.wTurn += ((this.turnT >= 0 ? envelope(this.turnT, this.turnWrap, spinOn) * (this.turnSpot || this.turnPeak <= M.turnPlay ? 1 : M.turnPlay / this.turnPeak) : 0) - this.wTurn) * k;
    if (this.wStart < 1e-4 && this.startT < 0) this.wStart = 0;
    if (this.wStop < 1e-4 && this.stopT < 0) this.wStop = 0;
    if (this.wTurn < 1e-4 && this.turnT < 0) this.wTurn = 0;
  }

  /**
   * Mix the filled slots over `pose` (the standing holstered keyed pose) by their weights, `tmp` a scratch pose; the
   * planner values `v` blend toward each clip's. Returns the slots' share (0..1) of the result. No allocation.
   */
  apply(S: LocoClipSet, pose: KeyedPose, tmp: KeyedPose, v: SlotLegValues): number {
    let share = this.mix(S.start, false, this.wStart, this.startP, S.layers, pose, tmp, v, 0, MOCAP_SLOT.startArms);
    share = this.mix(S.stop, false, this.wStop, this.stopP, S.layers, pose, tmp, v, share, 1);
    if (this.wTurn > 0 && this.pickTurn(S, this.turnSpot, this.turnSide)) {
      // (fix 2) a wrapped spin's new pass eases in from the clip's end pose (fix 2 check: over `easeFrom` s, and
      // any pass with a pose to ease from, `fc`)
      const u = this.fc !== null && this.fromT < MOCAP_SLOT.easeFrom ? this.fromT / MOCAP_SLOT.easeFrom : 1;
      share = this.mix(this.tc, this.tm, this.wTurn, this.turnP, S.layers, pose, tmp, v, share, 1, 1 - u * u * (3 - 2 * u));
    }
    return share;
  }

  /** The turn clip for a kind and side into `tc` / `tm` (false: none filled). */
  private pickTurn(S: LocoClipSet, spot: boolean, side: number): boolean {
    if (spot) {
      this.tc = S.turnInPlace;
      this.tm = side < 0;
    } else if (side > 0) {
      this.tc = S.turnMoveR ?? S.turnMoveL;
      this.tm = S.turnMoveR === null;
    } else {
      this.tc = S.turnMoveL ?? S.turnMoveR;
      this.tm = S.turnMoveL === null;
    }
    return this.tc !== null;
  }

  private mix(c: KeyedClip | null, mirror: boolean, w: number, p: number, L: KeyedLayerScale | null, pose: KeyedPose, tmp: KeyedPose, v: SlotLegValues, share: number, armMax: number, fromEnd = 0): number {
    if (c === null || w <= 0) return share;
    // a one-shot: progress 0..1 over its frames, the last frame held (never wrapping back to the first)
    const q = p <= 0 ? 0 : p >= 1 ? 1 : p;
    sampleKeyed(c, (q * (c.frames - 1)) / c.frames, 1, tmp, L);
    // (fix 2) `fromEnd` of the way back toward its end pose (a wrapped spin's replay easing in; fix 2 check: the pose the
    // turn's pass eases from)
    if (fromEnd > 0) this.easeFrom(tmp, mirror, L, fromEnd);
    if (mirror) mirrorKeyed(tmp);
    // (fix 1) its arms at most `armMax` of the weight: the clip's arms drawn back toward the pose's first
    if (w > armMax) mixKeyedArms(pose, tmp, armMax / w, tmp);
    mixKeyed(pose, tmp, w, pose);
    v.half += (c.half - v.half) * w;
    v.kneeOut += (c.kneeOut - v.kneeOut) * w;
    v.duty += (c.duty - v.duty) * w;
    v.lift += (c.liftH - v.lift) * w;
    return share + (1 - share) * w;
  }

  /** (fix 2 check) `tmp` `k` of the way toward the pose the turn's pass eases from (`fc` at `fp`), on `mirror`'s side. Its
   *  own method: inline, `mix` grew past what V8 inlines into `apply` and its doubles boxed (+16 B a frame, mocapSwitch). */
  private easeFrom(tmp: KeyedPose, mirror: boolean, L: KeyedLayerScale | null, k: number): void {
    const F = this.fc;
    if (F === null) return;
    sampleKeyed(F, (this.fp * (F.frames - 1)) / F.frames, 1, this.tail, L);
    if (this.fm !== mirror) mirrorKeyed(this.tail);
    mixKeyed(tmp, this.tail, k, tmp);
  }
}

/**
 * (A3) Clip feet: a mocap clip with a `feet` channel places Wren's steps itself (`FootPlanner` clip feet mode: the
 * planner only grounds and pins them). When it holds and how the stride maps:
 * - `share`: the mocap share of the keyed pose (`RigTargets.keyMocap`) at or over which new steps follow the clip (under
 *   it: drawn, crouched, at a wall, standing still, they are the planner's);
 * - `turnMax` (rad/s): turning faster hands new steps back to the planner and its turn rules (the turn-step clock, the
 *   twist cap, the band; anim-natural N1's rules once merged); a clip swing already in the air finishes under the clip.
 *   (integration) Or faster, up to what turns the body `twistMax` (rad) over one of the clip's stances (duty x cycle
 *   time): the jog's and the run's short stances keep their clip feet through steering (about 2.5 / 3.6 rad/s). The gait
 *   clock keeps the clip's stance window through a hand-off (animGraph clipFeet), and `pitchRate` (rad/s, the rig) caps
 *   how fast a foot's pitch turns while the switch is on: the two foot models swapped a frame apart (30-40 deg snaps);
 * - `minSpeed` (m/s): slower, the planner's (the start's first steps and the stop's last ones stay planned: the start /
 *   stop slots pose the body, not the feet, in this pass).
 * Stride and cadence: the cadence stays the game's gait clock (`stepLength(speed)`: two steps a cycle, the same on the
 * owner and on a remote copy, footsteps and noise unchanged). The clip's fore-aft foot positions are scaled by the game's
 * stride over the clip's (`speed x cycleTime / clip.stride`), so a planted foot travels back under the body at exactly the
 * root's speed and its pin holds with no slide; sideways and lift scale with the body (height / 1.75). A take whose own
 * speed is near the gait it stands for keeps that scale near 1 (CLIP-FORMAT.md).
 */
export const MOCAP_FEET = { share: 0.5, turnMax: 1.0, twistMax: 0.35, minSpeed: 0.3, pitchRate: 18 };

/** (A3) The graph's clip feet for the rig: the planner input (`ClipFeetIn`) plus whether it is valid this frame. */
export interface ClipFeetFrame extends ClipFeetIn {
  valid: boolean;
}

/** A layer's share-weighted multiplier on the mocap share (1 at scale 1 exactly: the hand-keyed path is untouched). */
export function mocapLayerK(scale: number, share: number): number {
  return scale === 1 || share <= 0 ? 1 : layerMul(scale, share);
}
