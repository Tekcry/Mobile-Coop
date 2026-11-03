/**
 * (mixamo-chars, N53) A Mixamo character in the game: the packed model (`scripts/mixamo/pack.mjs`: one GLB per
 * character, every move a glTF animation) loaded once per scene, one instance per body, its moves played directly by
 * Babylon's animation groups and blended by `locomotion.ts`.
 *
 * Slice b: the move set follows the gun in the hands (unarmed, rifle, pistol; a short crossfade), and named nodes of the
 * hand-built rig FOLLOW the Mixamo bones (`follow`): each takes its bone's movement away from the bind pose, so whatever
 * hangs on those nodes (the slung rifle on the chest, the holster on the thigh, pouches on the hips) rides on the Mixamo
 * body. The rig still animates first every frame; the follow overwrites those nodes after Babylon's animation step.
 *
 * Michael's picks (2026-11-02 night): stock Mixamo mannequins for the players (X Bot as Wren, Y Bot as Moth, in the
 * players' colours) and Swat for the guards, ours re-rigged later.
 */
import {
  LoadAssetContainerAsync, Color3, Matrix, PBRMaterial, Quaternion, StandardMaterial, TransformNode, Vector3,
  type AbstractMesh, type AnimationGroup, type AssetContainer, type Observer, type Scene,
} from '../core/babylon';
import { LOCO_N, LOCO_SETS, LOCO_SLOT_SPEED, LOCO_SLOTS, locoBlend, setClip, slotMoves, type LocoIn, type LocoSet, type LocoSlot } from './locomotion';
import { GAIT } from './gait';
import { ACTION_CLIPS, UPPER_CLIPS, type ActionOut } from './actions';
import { reachElbow } from './reach';
import { TUNE_LOCAL } from '../anim/tune';
import { GEARS, MOVEMENT } from '../config/movement';
import xbotUrl from './assets/xbot.glb?url';
import ybotUrl from './assets/ybot.glb?url';
import swatUrl from './assets/swat.glb?url';

export type MixamoModel = 'xbot' | 'ybot' | 'swat';
const URLS: Readonly<Record<MixamoModel, string>> = { xbot: xbotUrl, ybot: ybotUrl, swat: swatUrl };

/** Height of every Mixamo body (m): the player's (G74, 1.68 m), so the camera and capsule fit unchanged. */
export const MIXAMO_HEIGHT = 1.68;
/** Seconds for a move-set change (holster, draw) to crossfade. */
const SET_FADE = 0.2;
/** (slice e) Seconds for an action to fade in over the locomotion, or back out. */
const ACT_FADE = 0.12;
/** (slice h) The play rate of a timed action pinned to its frame (see `update`). */
const PIN_RATE = 1e-3;
/** (slice i) The latest share of a timed clip shown (its last frame wraps to its first). */
const PIN_END = 0.995;
/** (walk-test fix A) Every group's weight is scaled by this, so the total stays just under 1. At a total of exactly 1
 *  Babylon's quaternion blend divides the first two weights by their sum, 0 / 0 when both clips just dropped to 0 in
 *  the same frame (an action fading fully in: the walk and the strafe leave at once): the bones went NaN and the body
 *  vanished (hang, ledge, ladder top, pipe, wall). Under 1 the blend starts from the bind value instead. */
const BLEND_FULL = 0.9999;
/** (walk-test fix A) Each grip climb's grips: shares of its cycle where no hand or foot is reaching (measured in the
 *  game 2026-11-03: the rope climb is free of reaches at 0-0.1, 0.35-0.6 and 0.73-0.83, the ladder at 0-0.03 and
 *  0.13-0.18; provisional). Stopped, the clip runs on to the next one and holds. */
const GRIPS: Readonly<Record<string, readonly number[]>> = { rope_climb: [0.05, 0.47, 0.78], ladder: [0, 0.15], rappel: [0, 0.5] };
/** (walk-test fix B2) Samples per upper-body clip (`UPPER_CLIPS`), evenly over it; between two the pose is slerped. */
const UP_SAMPLES = 48;
/** (walk-test round 1, Michael: legs "skipping", "doesn't seem to match the speed") The moving clips share one clock,
 *  lined up on their left heel strikes, and it runs at the body's speed over the blend's stride, so the planted foot
 *  keeps pace with the ground. Within these shares of the clips' own pace (provisional): past them a clip looks wrong. */
const GAIT_MIN = 0.5;
const GAIT_MAX = 3;
/** (walk-test round 2, Michael: "the feet move too quick compared to movement") The clock's strides are the measured
 *  ones x this: the strides were measured on a 1.68 m body and the game's X Bot stands 1.78 m, and the planted foot was
 *  measured slipping back at 10-14% of the body's speed (walk to run, `scripts/foot-slide.mjs`). Provisional. */
const GAIT_STRIDE_K = 1.1;
/** (walk-test round 2, Michael: "the stops jitter/jump, they should smoothly transition to a stop (instantaneous for
 *  walking, slow transition for jog)") A stop from at or under `STOP_WALK` (m/s, the walk) freezes the gait at once; from
 *  at or over `STOP_JOG` (the jog) the gait's clock runs down over `STOP_EASE` s while the pose eases into the walk's
 *  stride (the jog's flight and lean let go), between them in part. Provisional. */
const STOP_WALK = GEARS.stand[2];
const STOP_JOG = GEARS.stand[3];
const STOP_EASE = 0.35;
/** (walk-test round 2) A held stride's lifted foot is set down on the ground over this (s; the held walk stood on one
 *  leg for 3 s with the other foot in the air). */
const PLANT_IN = 0.12;
/** (walk-test round 2, Michael: "crouching is slightly too low, not believable. hips/pelvis need to be lifted up
 *  slightly") Crouched, the hips are lifted this much (m; the crouch idle's hips sat at 0.53 m, 0.52 of standing; CT
 *  0.48), the legs reaching back to the clip's feet. Provisional. */
const CROUCH_LIFT = 0.06;
/** (walk-test round 2, Michael: "reduce idle swaying by 50%") The share of an idle's own motion kept (about its mean
 *  pose). Provisional. */
const SWAY_KEEP = 0.5;
/** (walk-test round 2) A shifted hip keeps each leg within this share of its full length (the foot stays on the
 *  clip's spot: past it the hips give up the rest of the shift). */
const LEG_REACH = 0.995;
/** (walk-test round 2) Aimed, the hips sit this much under the gait's lowest (m, a slight knee bend): a straight leg has
 *  no room to carry the hips across, and the head jumped back for a frame or two each step. Provisional. */
const AIM_SINK = 0.03;
/** (walk-test round 2, Michael: "rifle should be held closer to body") Drawn, not aimed: the gun and both hands pulled
 *  back toward the body (m, provisional). */
const READY_IN: Readonly<Partial<Record<LocoSet, number>>> = { rifle: 0.08 };
/** (walk-test round 2, Michael: "pistol should be higher, in line with eyes") Aimed, the pistol's sight top sits this
 *  far above the Head bone's joint (m, about the eye; provisional). */
const PISTOL_EYE = 0.09;
/** (walk-test fix A) Faster than this (m/s) a grip climb plays. */
const GRIP_MOVE = 0.05;
/** (walk-test fix A) Actions whose own turn about the vertical is taken out (the game's facing stands): the wall
 *  kick's clip spins round as it jumps off (Michael: "an unnecessary spin"). */
const NO_YAW: ReadonlySet<string> = new Set(['wall_kick']);
/** (walk-test fix A, Michael: "stop mid animation, then after ... around 3 seconds ... an idle position") A player's
 *  gait freezes where it is when the body slows out of it, holds `HOLD_STOP` s, then settles into the idle over
 *  `HOLD_SETTLE` s; moving again it lets go over `HOLD_LEAVE` s. `HOLD_FULL` (m/s): at or above it the gait is fully in
 *  (the locomotion's stand speed plus its fade). Provisional. */
const HOLD_STOP = 3;
const HOLD_SETTLE = 0.5;
const HOLD_LEAVE = 0.15;
const HOLD_FULL = 0.4;
/** (walk-test fix A) At or below this (m/s) the body stands (the locomotion's stand speed). A held stop lets go when
 *  the body speeds up by `HOLD_SPEEDUP` (m/s) over its slowest, or keeps moving `HOLD_SLOW` s (a slow walk, not a
 *  stop: the walk brakes to a stand in about 0.1 s, `MOVEMENT.decelMax`). */
const HOLD_STILL = 0.05;
const HOLD_SPEEDUP = 0.05;
const HOLD_SLOW = 0.25;
/** (slice g) Seconds the spine takes to follow the aim pitch, and the most it bends (rad, provisional). */
const PITCH_EASE = 0.08;
const PITCH_MAX = 1.1;
/** (walk-test fix A3) The most the spine twists to the aim (rad, provisional). */
const YAW_MAX = 1.2;
/** (walk-test fix A3, Michael: "body sways too much while aiming", the head came into the reticle strafing) Aimed, the
 *  upper body holds its set's aimed idle (standing or crouched) in the body's space, whatever the legs play; its bones
 *  top first (the Spine's parent is the Hips). */
const UPPER = ['Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand'] as const;
/** (walk-test round 1, Michael: "the rifle and pistol should remain low ready unless aiming, even while walking") Drawn
 *  and not aimed, the upper body holds the set's low ready idle over any gait (`readyArms`). Seconds the hold takes to
 *  come in or let go. */
const READY_FADE = 0.15;
/** (walk-test round 1, Michael: "the pistol low ready is too high, it should be held down near the waist") Each set's
 *  low ready arms turned down about the body's right axis (rad, provisional); a player's Gun tuner "gun up" (low ready
 *  group, m) lifts them back by that height over `READY_ARM` (m, shoulder to hands). */
const READY_DROP: Readonly<Partial<Record<LocoSet, number>>> = { pistol: 0.35 };
const READY_ARM = 0.55;
/** (walk-test round 1, Michael: "it should remain perfectly still and tight when aiming") Aimed, the gun's spot in its
 *  own aim frame is smoothed twice over this time (s): the walk's chest bob is taken out, the aim's turn is not. */
const GUN_STEADY = 0.12;
/** (walk-test round 1) The aim frame's origin over the feet (m): about the eye standing and crouched. */
const GUN_EYE_STAND = 1.5;
const GUN_EYE_CROUCH = 0.95;
const AIM_SLOT = LOCO_SLOTS.indexOf('aim_idle');
const C_AIM_SLOT = LOCO_SLOTS.indexOf('c_aim_idle');
const IDLE_SLOT = LOCO_SLOTS.indexOf('idle');
const C_IDLE_SLOT = LOCO_SLOTS.indexOf('c_idle');
/** (slice g) The actions whose hands are pinned to the rig's; the climb-up lets go from 0.45 through its next 0.3. */
const ANCHORED: ReadonlySet<string> = new Set(['hang_idle', 'hang_shimmy_l', 'hang_shimmy_r', 'ladder', 'hang_climb_up', 'zipline']);
const ANCHOR_CLIMB_FROM = 0.45;
const ANCHOR_CLIMB_SPAN = 0.3;

const CONTAINERS = new WeakMap<Scene, Map<MixamoModel, Promise<AssetContainer>>>();

/** The scene's loaded model (one fetch and parse per model per scene; disposed with the scene). */
function container(scene: Scene, model: MixamoModel): Promise<AssetContainer> {
  let m = CONTAINERS.get(scene);
  if (!m) {
    m = new Map();
    CONTAINERS.set(scene, m);
    scene.onDisposeObservable.addOnce(() => CONTAINERS.delete(scene));
  }
  let p = m.get(model);
  if (!p) {
    p = LoadAssetContainerAsync(URLS[model], scene, { pluginExtension: '.glb' });
    m.set(model, p);
  }
  return p;
}

export interface MixamoBodyOpts {
  /** Body colour (linear RGB), applied to the model's main surface (players: their goggle colour); none keeps the model's. */
  tint?: readonly [number, number, number];
  /** Each mesh as it loads (shadow casters). */
  casters?: (m: AbstractMesh) => void;
  /** Standing height (m); default `MIXAMO_HEIGHT` (the player's). */
  height?: number;
  /** (walk-test fix A) Stopping freezes the gait mid-stride, then settles into the idle (`HOLD_STOP`; the players). */
  holdStop?: boolean;
}

/** One rig node that follows a Mixamo bone: the node, the bone's name (`Hips`, `Spine2`, ...) and the node's rest
 *  transform in its rig root's space (taken before the rig first animates). */
export interface FollowPair {
  node: TransformNode;
  bone: string;
  rest: Matrix;
}

interface Follow {
  node: TransformNode;
  /** The node's ancestors below the rig root, top first (recomputed before the node is set). */
  chain: TransformNode[];
  rest: Matrix;
  bone: TransformNode;
  /** The bone's ancestors below this body's root, top first, and the bone itself last. */
  boneChain: TransformNode[];
  /** The bone's bind transform in this body's root space. */
  boneRest: Matrix;
}

/** (walk-test fix B2) One Mixamo bone that follows a rig node (the reverse of `Follow`: a dead guard's ragdoll and
 *  carry pose the rig): the node, its rest's inverse in the rig root's space, the bone, the bone's ancestors below this
 *  body's root (top first) and itself, its reference transform in this body's root space, and whether it is the root
 *  bone (it takes the place too; the others only turn, keeping the model's bone lengths). */
interface Lead {
  node: TransformNode;
  restInv: Matrix;
  bone: TransformNode;
  boneChain: TransformNode[];
  boneRest: Matrix;
  root: boolean;
}

/** The ancestors of `n` strictly below `top`, top first (empty when `n`'s parent is `top`). */
function chainBelow(n: TransformNode, top: TransformNode): TransformNode[] {
  const out: TransformNode[] = [];
  for (let p = n.parent; p && p !== top; p = p.parent) if (p instanceof TransformNode) out.unshift(p);
  return out;
}

/**
 * (slice b) How each gun class sits in the Mixamo right hand while its move set plays: the body's right, up and forward
 * seen in the RightHand bone's own axes (measured in the game from the packs' idles, 2026-11-02: Pro Rifle Pack `idle`
 * and `idle aiming` agree within 1 deg; Pistol Pack `pistol idle`), and the grip's spot in the hand (m, the same axes:
 * along the fingers toward the palm). Provisional: tuned by eye from the Test Chamber shots.
 */
export const HOLD_FRAMES = {
  rifle: { right: [0.161, -0.059, -0.985], up: [0.939, 0.316, 0.135], fwd: [-0.303, 0.947, -0.106], palm: [0, 0.07, 0] },
  pistol: { right: [-0.049, 0.209, -0.977], up: [0.998, 0.055, -0.038], fwd: [-0.046, 0.976, 0.211], palm: [0, 0.07, 0] },
} as const;
export type HoldKind = keyof typeof HOLD_FRAMES;

/** (slice i) A gun on its way between its slot and the hands, and its class. */
export interface GunTravel {
  node: TransformNode;
  kind: HoldKind;
}

// scratch (follow runs once per body per frame; no allocation)
const mA = new Matrix(), mB = new Matrix(), mC = new Matrix(), mD = new Matrix();
const vS = new Vector3(), vT = new Vector3(), vT2 = new Vector3();
const qR = new Quaternion();
// (walk-test fix A3) the aim lock and the arms' reach
const mGc = new Matrix(), mGt = new Matrix(), mHr = new Matrix(), mHl = new Matrix();
const vP = new Vector3(), vE = new Vector3(), vW = new Vector3(), vE2 = new Vector3(), vAx = new Vector3(), vF = new Vector3();
const qA = new Quaternion(), qB = new Quaternion(), qC = new Quaternion(), qD = new Quaternion();
const vG = new Vector3(), vR = new Vector3(), vU = new Vector3();
const qG = new Quaternion();
const ONE = Vector3.One();
// (walk-test round 2) the hip shift's feet and offset
const mFl = new Matrix(), mFr = new Matrix();
const vD = new Vector3(), vJ = new Vector3();
const LEG_A = [new Vector3(), new Vector3()];

/**
 * One Mixamo body, parented to `parent` (its feet on the parent's origin, facing the parent's +Z). Loads in the
 * background; `ready` is false until then and `update` does nothing.
 */
export class MixamoBody {
  readonly root: TransformNode;
  ready = false;
  failed = false;
  /** Called once when the model is in and playing (the owner hides what it stood in for). */
  onReady: (() => void) | null = null;
  /** (slice f) The owner's player is down: the body lies (`downed_lie`) over everything else. */
  downed = false;
  /** The move set playing now (the strongest after the crossfade). */
  set: LocoSet = 'unarmed';
  private readonly scene: Scene;
  private meshes: AbstractMesh[] = [];
  private groups: AnimationGroup[] = [];
  /** The distinct clips the sets use: group, seconds per cycle, whether it is a moving clip, (walk-test round 1) its
   *  stride (m per cycle) and its left heel strike (share of the cycle, `gait.ts`). */
  private clips: { g: AnimationGroup; cycle: number; moves: boolean; stride: number; strike: number; hipY: number; hipMin: number }[] = [];
  /** (walk-test round 2) Each clip's weight on the body this frame (its gait share or held stop share, x the share the
   *  action leaves), the held stop's mix (per clip) and, from a jog, the walk's mix it eases into. */
  private effW = new Float64Array(0);
  private heldW = new Float64Array(0);
  private stopWalkW = new Float64Array(0);
  /** (walk-test round 2) Per clip, drawn: the lift (m) that brings its hips to its set's drawn height (`drawHeights`). */
  private drawDy = new Float64Array(0);
  /** (walk-test round 2) Each idle's mean pose (its bones' turns and the hips' place), the sway taken halfway to it. */
  private sway: { ci: number; rot: { b: TransformNode; q: Quaternion }[]; pos: { b: TransformNode; v: Vector3 }[] }[] = [];
  /** (walk-test round 2) The legs (thigh, shin, foot) and the bones above the thigh and the shin, for the hip shift. */
  private legs: { bones: TransformNode[]; chain: TransformNode[]; fore: TransformNode[] }[] = [];
  private readonly legR = new Float64Array(2);
  private readonly footLow = new Float64Array(2);
  /** (walk-test round 2) The toes (left, right), and how far a held stop's lifted foot is set down now (`plantFeet`):
   *  its weight, and its share before the stop hold's own weight (kept while the hold lets go). */
  private toes: TransformNode[] = [];
  private plantW = 0;
  private plantK = 0;
  /** (walk-test round 2) The held gun's span (gun space: stock end z0 .. muzzle z1, bore and top heights), the rig's
   *  live one (`CharacterRig.gunSpan`); null: the butt and sight are not placed. */
  gunSpan: { z0: number; z1: number; bore: number; top: number } | null = null;
  /** (walk-test round 1) The gait's shared clock (share of a cycle, from a left heel strike). */
  private phase = 0;
  /** Per set, per slot: index into `clips` (-1: the model lacks it). */
  private table: Int32Array = new Int32Array(0);
  private readonly setW = new Float64Array(LOCO_SETS.length);
  private clipW = new Float64Array(0);
  private readonly w = new Float64Array(LOCO_N);
  private readonly ratio = new Float64Array(LOCO_N);
  /** (slice e) The action clips by name, the one playing (or fading out) and its weight. */
  private readonly actions = new Map<string, AnimationGroup>();
  private act: AnimationGroup | null = null;
  private actName = '';
  private actW = 0;
  /** (slice g) The spine's aim bend now (rad), and its bones top first (Spine, Spine1, Spine2). */
  private pitch = 0;
  private spine: TransformNode[] = [];
  private spineChains: TransformNode[][] = [];
  /** (slice g) The hand anchors (rig wrists), the body's own hands (LeftHand, RightHand), the anchor's weight now,
   *  whether the body is shifted, and the root's own height (the fit's). */
  private anchors: { l: TransformNode; r: TransformNode } | null = null;
  private hands: (TransformNode | null)[] = [];
  /** (slice g) The nodes to refresh before reading the hands (built on first use, no per-frame allocation). */
  private handChain: TransformNode[] = [];
  private anchorChain: TransformNode[] = [];
  /** (slice i) The rig's tumble node, whether an action turns the body now, and whether it is turned. */
  private tumbleNode: TransformNode | null = null;
  private turnOn = false;
  private turned = false;
  private anchorW = 0;
  private anchored = false;
  private baseY = 0;
  private pendingFollow: { rigRoot: TransformNode; pairs: FollowPair[] } | null = null;
  private follows: Follow[] = [];
  private rigRoot: TransformNode | null = null;
  private followObs: Observer<Scene> | null = null;
  private hold: { pivot: TransformNode; chain: TransformNode[]; grip: Vector3; kind: () => HoldKind | null; hand: TransformNode; handChain: TransformNode[]; travel: (() => GunTravel | null) | null } | null = null;
  /** (slice i) The travelling gun's node and its chain to the rig root (rebuilt only when the node changes). */
  private travelNode: TransformNode | null = null;
  private travelChain: TransformNode[] = [];
  private readonly holdL = new Matrix();
  /** (walk-test fix A) A grip climb: its phase last frame (NaN: just started), whether it holds on a grip, and the
   *  held frame. */
  private gripPh = NaN;
  private gripHeld = false;
  private gripFrame = 0;
  /** (walk-test fix A) The no-yaw actions' hip-line angle at their first frame (rad, in the body's ground plane), and
   *  the thigh bones that measure it. */
  private readonly yaw0 = new Map<string, number>();
  private thighs: (TransformNode | null)[] = [];
  private thighChain: TransformNode[] = [];
  private hipsBone: TransformNode | null = null;
  private hipsChain: TransformNode[] = [];
  /** (walk-test fix A) The stop hold: the last full gait mix (per clip), the crouch and aim it was taken at, whether a
   *  stop is on, how long it has been held (s), its weight now and the speed last frame. */
  private stopW = new Float64Array(0);
  private stopCrouch = 0;
  private stopAim = 0;
  private stopSet: LocoSet = 'unarmed';
  private stopHad = false;
  private stopOn = false;
  private stopT = 0;
  /** The slowest speed since the stop began (m/s) and how long the body has kept moving in it (s). */
  private stopMin = 0;
  private stopMoveT = 0;
  private holdW = 0;
  private prevSpeed = 0;
  /** (walk-test round 2) The held gait's speed (m/s) and clock rate (cycles/s), how long its clock runs down (s), and
   *  its input (the walk mix a jog's stop eases into is blended from it). */
  private stopV = 0;
  private stopCps = 0;
  private stopEase = 0;
  private readonly stopIn: LocoIn = { speed: 0, localX: 0, localZ: 1, crouch: 0, aim: 0 };
  /** (walk-test round 2) The move sets' weights' sum this frame (`mixInto` shares them out). */
  private setSum = 1;
  /** (walk-test fix A3) The owner says each frame whether the rig's gun is in its right hand (the Mixamo body always
   *  holds it in the right): only then do the arms reach for the rig's aimed gun. */
  rightHanded = true;
  /** (walk-test fix A3) The spine's aim twist now (rad); the upper bones (`UPPER`, null: the model lacks one); per
   *  armed set its aimed idle's local rotations standing and crouched (index 0 the Hips, then `UPPER`; null: no track);
   *  the aim lock's weight and crouch now. */
  private yaw = 0;
  private upper: (TransformNode | null)[] = [];
  private readonly aimPose = new Map<LocoSet, { stand: (Quaternion | null)[]; crouch: (Quaternion | null)[] }>();
  /** (walk-test fix A3) Per armed set, the head's spot in this body's root space in its aimed idles (standing,
   *  crouched): aimed, the spine leans so the head keeps it across the ground (the hips' sway in a walk taken out). */
  private readonly aimHead = new Map<LocoSet, { stand: Vector3; crouch: Vector3 }>();
  private headChain: TransformNode[] = [];
  private lockW = 0;
  private lockCrouch = 0;
  /** (walk-test round 1) Per armed set, its low ready idles' arm rotations standing and crouched (as `aimPose`), the
   *  hold's weight now and whether the set is the pistol (its arms drop by the tuner's `lowReadyDrop`). */
  private readonly readyPose = new Map<LocoSet, { stand: (Quaternion | null)[]; crouch: (Quaternion | null)[] }>();
  private readyW = 0;
  /** (walk-test round 1) The aimed gun's smoothed spot in its aim frame (two stages) and whether it is primed. */
  private readonly gunF1 = new Vector3();
  private readonly gunF2 = new Vector3();
  private gunFOk = false;
  /** (walk-test round 1) The aimed gun's spot learnt standing still, standing and crouched (`steadyGun`), and the
   *  body's speed this frame (m/s). */
  private readonly gunStill = [{ v: new Vector3(), ok: false }, { v: new Vector3(), ok: false }];
  private speedNow = 0;
  /** (walk-test fix A3) The rig's own aimed gun (its pivot's world, taken before the follow moves the rig's torso), and
   *  whether it was taken this frame; the arms (upper arm, forearm, hand) and the chains above them. */
  private readonly rigGun = new Matrix();
  private rigGunOk = false;
  private armR: TransformNode[] = [];
  private armL: TransformNode[] = [];
  private armChainR: TransformNode[] = [];
  private armChainL: TransformNode[] = [];
  private foreChainR: TransformNode[] = [];
  private foreChainL: TransformNode[] = [];
  /** (walk-test fix B2) The upper layer: its bones (the Hips, the Spine, then everything above it), each upper clip's
   *  local rotations sampled (`UP_SAMPLES` x bones x 4, NaN: no track), the clip playing (or fading out), how far
   *  through it (a looping one: its own clock) and its weight. */
  private layerBones: TransformNode[] = [];
  private readonly upPoses = new Map<string, Float32Array>();
  private upName = '';
  private upT = 0;
  private upW = 0;
  /** (walk-test fix B2) Each action and upper clip's length (s). */
  private readonly secs = new Map<string, number>();
  /** (walk-test fix B2) The bones that follow rig nodes once it leads (`lead`), the pairs waiting for the model, whether
   *  the rig leads now, and the ancestors of a node being refreshed (reused). */
  private leads: Lead[] = [];
  private pendingLead: { rigRoot: TransformNode; pairs: FollowPair[] } | null = null;
  private leading = false;
  private readonly anc: TransformNode[] = [];
  private disposed = false;

  constructor(scene: Scene, readonly model: MixamoModel, parent: TransformNode, private readonly opts: MixamoBodyOpts = {}) {
    this.scene = scene;
    this.root = new TransformNode(`mixamo-${model}`, scene);
    this.root.parent = parent;
    this.setW[0] = 1;
    container(scene, model).then(
      (c) => this.build(c),
      (e: unknown) => {
        this.failed = true;
        console.error(`mixamo body ${model}: load failed`, e);
      },
    );
  }

  private build(c: AssetContainer): void {
    if (this.disposed) return;
    const inst = c.instantiateModelsToScene((n) => `${this.root.name}:${n}`, true, { doNotInstantiate: true });
    for (const n of inst.rootNodes) n.parent = this.root;
    this.groups = inst.animationGroups;
    for (const n of inst.rootNodes) for (const m of n.getChildMeshes(false)) this.meshes.push(m);
    if (this.opts.tint) this.tint(this.opts.tint);
    for (const m of this.meshes) {
      m.isPickable = false;
      m.receiveShadows = true;
      this.opts.casters?.(m);
    }
    for (const g of this.groups) {
      g.stop();
      g.enableBlending = false;
    }
    // the clip table: every set's clip per slot, each distinct clip one looping group
    const byName = new Map<string, number>();
    this.table = new Int32Array(LOCO_SETS.length * LOCO_N).fill(-1);
    for (let s = 0; s < LOCO_SETS.length; s++)
      for (let k = 0; k < LOCO_N; k++) {
        const name = setClip(LOCO_SETS[s] as LocoSet, k);
        if (!name) continue;
        let ci = byName.get(name);
        if (ci === undefined) {
          const g = this.groups.find((x) => x.name.split(':').pop() === name);
          if (!g) continue;
          const fps = g.targetedAnimations[0]?.animation.framePerSecond ?? 60;
          const cycle = Math.max(1 / fps, (g.to - g.from) / fps);
          const gait = GAIT[name];
          ci = this.clips.length;
          this.clips.push({ g, cycle, moves: slotMoves(k), stride: gait ? gait.stride * GAIT_STRIDE_K : LOCO_SLOT_SPEED[LOCO_SLOTS[k] as LocoSlot] * cycle, strike: gait?.phase ?? 0, hipY: 0, hipMin: 0 });
          byName.set(name, ci);
        }
        this.table[s * LOCO_N + k] = ci;
      }
    this.clipW = new Float64Array(this.clips.length);
    this.stopW = new Float64Array(this.clips.length);
    this.effW = new Float64Array(this.clips.length);
    this.heldW = new Float64Array(this.clips.length);
    this.stopWalkW = new Float64Array(this.clips.length);
    this.drawDy = new Float64Array(this.clips.length);
    for (let i = 0; i < this.clips.length; i++) {
      const c = this.clips[i]!;
      c.g.start(true, 1);
      c.g.weight = i === 0 ? 1 : 0;
    }
    // (slice e) the action clips, looping at weight 0 until an action picks one
    for (const name of ACTION_CLIPS) {
      const g = this.groups.find((x) => x.name.split(':').pop() === name);
      if (!g) continue;
      g.start(true, 1);
      g.weight = 0;
      this.actions.set(name, g);
      this.secs.set(name, this.groupSeconds(g));
    }
    // the reference pose: the idle's first frame, a standing pose like the rig's rest (a model's bind pose can sit its
    // hips on the floor, the Swat's does, and holds a T): the height fit and the follow's bone rests are taken in it
    // (walk-test fix A) each no-yaw action's hip line at its first frame (the idle's frame below resets the pose)
    this.thighs = [this.boneNode('LeftUpLeg'), this.boneNode('RightUpLeg')];
    if (this.thighs[0] && this.thighs[1]) this.thighChain = [...chainBelow(this.thighs[0], this.root), this.thighs[0], this.thighs[1]];
    this.hipsBone = this.boneNode('Hips');
    if (this.hipsBone) this.hipsChain = chainBelow(this.hipsBone, this.root);
    for (const name of NO_YAW) {
      const g = this.actions.get(name);
      if (!g) continue;
      g.goToFrame(g.from);
      this.yaw0.set(name, this.hipYaw());
    }
    const idle = this.clips[0]?.g;
    if (idle) idle.goToFrame(idle.from);
    this.fitHeight();
    this.baseY = this.root.position.y;
    this.hands = [this.boneNode('LeftHand'), this.boneNode('RightHand')];
    this.spine = ['Spine', 'Spine1', 'Spine2'].map((n) => this.boneNode(n)).filter((b): b is TransformNode => !!b);
    this.spineChains = this.spine.map((b) => chainBelow(b, this.root));
    // (walk-test fix A3) the aimed idles' upper body, and the arms the aim reaches with
    this.upper = UPPER.map((n) => this.boneNode(n));
    // (walk-test round 2, Michael: "strafe with rifle fingers open") the fingers too: the held idle's grip on the gun
    for (const h of [this.upper[UPPER.indexOf('LeftHand')], this.upper[UPPER.indexOf('RightHand')]])
      if (h) for (const n of h.getDescendants(false)) if (n instanceof TransformNode && n.rotationQuaternion) this.upper.push(n);
    const head = this.upper[UPPER.indexOf('Head')];
    if (head) this.headChain = [...chainBelow(head, this.root), head];
    for (const s of ['rifle', 'pistol'] as const) {
      const stand = this.poseOf(setClip(s, AIM_SLOT));
      if (!stand) continue;
      const crouch = this.poseOf(setClip(s, C_AIM_SLOT)) ?? stand;
      this.aimPose.set(s, { stand, crouch });
      const hs = this.headIn(setClip(s, AIM_SLOT), stand);
      if (hs) this.aimHead.set(s, { stand: hs, crouch: this.headIn(setClip(s, C_AIM_SLOT), crouch) ?? hs });
      // (walk-test round 1) the low ready idles
      const ready = this.poseOf(setClip(s, IDLE_SLOT));
      if (ready) this.readyPose.set(s, { stand: ready, crouch: this.poseOf(setClip(s, C_IDLE_SLOT)) ?? ready });
    }
    const arm = (side: string): TransformNode[] => [`${side}Arm`, `${side}ForeArm`, `${side}Hand`].map((n) => this.boneNode(n)).filter((b): b is TransformNode => !!b);
    this.armR = arm('Right');
    this.armL = arm('Left');
    if (this.armR.length === 3) this.armChainR = chainBelow(this.armR[0]!, this.root);
    if (this.armL.length === 3) this.armChainL = chainBelow(this.armL[0]!, this.root);
    this.foreChainR = [...this.armChainR, ...this.armR.slice(0, 1)];
    this.foreChainL = [...this.armChainL, ...this.armL.slice(0, 1)];
    // (walk-test round 2) the legs for the hip shift, the idles' mean poses, each clip's hip height
    for (const side of ['Left', 'Right']) {
      const bones = [`${side}UpLeg`, `${side}Leg`, `${side}Foot`].map((n) => this.boneNode(n)).filter((b): b is TransformNode => !!b);
      if (bones.length !== 3) continue;
      const chain = chainBelow(bones[0]!, this.root);
      this.legs.push({ bones, chain, fore: [...chain, bones[0]!] });
    }
    this.toes = ['LeftToeBase', 'RightToeBase'].map((n) => this.boneNode(n)).filter((b): b is TransformNode => !!b);
    this.sampleSway();
    this.drawHeights();
    this.sampleUpper();
    if (this.pendingFollow) this.bindFollow(this.pendingFollow.rigRoot, this.pendingFollow.pairs);
    if (this.pendingLead) this.bindLead(this.pendingLead.rigRoot, this.pendingLead.pairs);
    this.ready = true;
    if (this.leading) this.startLead();
    this.onReady?.();
  }

  /**
   * Scales the body to the game's size (in the reference pose), its feet on the parent's origin (Mixamo models stand on
   * their own origin). With a rig to follow, the Head bone's height above the feet matches the rig's head node at rest
   * (his eye, the camera fade; hips-to-head lengths do not: the two skeletons mark the head at different points); else
   * the model's bounds give `height` (the Swat's unskinned mesh bounds read 1.79x small: the skeleton is the reliable
   * measure).
   */
  private fitHeight(): void {
    this.root.scaling.setAll(1);
    this.root.position.y = 0;
    for (let p: TransformNode | null = this.root; p; p = p.parent instanceof TransformNode ? p.parent : null) p.computeWorldMatrix(true);
    const headPair = (this.pendingFollow ?? this.pendingLead)?.pairs.find((p) => p.bone === 'Head');
    const head = this.boneNode('Head');
    if (headPair && head) {
      for (const n of [...chainBelow(head, this.root), head]) n.computeWorldMatrix(true);
      const have = head.getAbsolutePosition().y - this.root.getAbsolutePosition().y;
      const want = headPair.rest.m[13] as number;
      if (have > 0.1 && want > 0.1) this.root.scaling.setAll(want / have);
      return;
    }
    let minY = Infinity, maxY = -Infinity;
    for (const m of this.meshes) {
      m.computeWorldMatrix(true);
      const b = m.getBoundingInfo().boundingBox;
      minY = Math.min(minY, b.minimumWorld.y);
      maxY = Math.max(maxY, b.maximumWorld.y);
    }
    const h = maxY - minY;
    if (h > 0.1) this.root.scaling.setAll((this.opts.height ?? MIXAMO_HEIGHT) / h);
  }

  /** The model's main surface colour (the mannequins' body; the joints keep theirs). */
  private tint(rgb: readonly [number, number, number]): void {
    const col = new Color3(rgb[0], rgb[1], rgb[2]);
    for (const m of this.meshes) {
      const mat = m.material;
      if (!mat || /joint/i.test(mat.name)) continue;
      if (mat instanceof PBRMaterial) mat.albedoColor = col;
      else if (mat instanceof StandardMaterial) mat.diffuseColor = col;
    }
  }

  /** (walk-test fix B2) A group's length (s). */
  private groupSeconds(g: AnimationGroup): number {
    const fps = g.targetedAnimations[0]?.animation.framePerSecond ?? 60;
    return Math.max(1 / fps, (g.to - g.from) / fps);
  }

  /** (walk-test fix B2) A clip's length (s), 0 when the model lacks it or is still loading. */
  seconds(name: string): number {
    return this.secs.get(name) ?? 0;
  }

  /** (walk-test fix B2) Each upper clip's local rotations of the layer's bones, sampled once at load (the clips never
   *  play as groups: Babylon's blend of a clip on part of the body with the locomotion went 0 / 0 on some weights). */
  private sampleUpper(): void {
    const hips = this.hipsBone, sp = this.boneNode('Spine');
    if (!hips || !sp) return;
    const above = sp.getDescendants(false).filter((n): n is TransformNode => n instanceof TransformNode && !!n.rotationQuaternion);
    this.layerBones = [hips, sp, ...above];
    const nb = this.layerBones.length;
    for (const name of UPPER_CLIPS) {
      const g = this.groups.find((x) => x.name.split(':').pop() === name);
      if (!g) continue;
      const P = new Float32Array(UP_SAMPLES * nb * 4).fill(NaN);
      this.layerBones.forEach((b, k) => {
        const ta = g.targetedAnimations.find((t) => t.target === b && t.animation.targetProperty === 'rotationQuaternion');
        if (!ta) return;
        for (let s = 0; s < UP_SAMPLES; s++) {
          const q: unknown = ta.animation.evaluate(g.from + ((g.to - g.from) * s) / (UP_SAMPLES - 1));
          if (q instanceof Quaternion) P.set([q.x, q.y, q.z, q.w], (s * nb + k) * 4);
        }
      });
      this.upPoses.set(name, P);
      this.secs.set(name, this.groupSeconds(g));
    }
  }

  /** (walk-test round 2) Each idle's mean pose (over 32 samples of its cycle: each bone's turn, the hips' place), for
   *  `calmIdle`, and each clip's mean hip height above the feet (m, its Hips track through the hips' parent now). */
  private sampleSway(): void {
    const hips = this.hipsBone;
    const parent = hips?.parent instanceof TransformNode ? hips.parent : null;
    if (!hips || !parent) return;
    for (const n of chainBelow(hips, this.root)) n.computeWorldMatrix(true);
    const pw = parent.computeWorldMatrix(true);
    const y0 = this.root.getAbsolutePosition().y;
    const restY = Vector3.TransformCoordinates(hips.position, pw).y - y0;
    const N = 32;
    for (let ci = 0; ci < this.clips.length; ci++) {
      const c = this.clips[ci]!;
      const g = c.g;
      const at = (s: number): number => g.from + ((g.to - g.from) * s) / N;
      c.hipY = c.hipMin = restY;
      const rot: { b: TransformNode; q: Quaternion }[] = [];
      const pos: { b: TransformNode; v: Vector3 }[] = [];
      for (const ta of g.targetedAnimations) {
        const b = ta.target;
        if (!(b instanceof TransformNode)) continue;
        if (ta.animation.targetProperty === 'position' && b === hips) {
          const v = new Vector3();
          let y = 0, lo = Infinity;
          for (let s = 0; s < N; s++) {
            const p: unknown = ta.animation.evaluate(at(s));
            if (!(p instanceof Vector3)) continue;
            v.addInPlace(p);
            const h = Vector3.TransformCoordinates(p, pw).y - y0;
            y += h;
            lo = Math.min(lo, h);
          }
          c.hipY = y / N;
          if (lo < Infinity) c.hipMin = lo;
          pos.push({ b, v: v.scaleInPlace(1 / N) });
        } else if (ta.animation.targetProperty === 'rotationQuaternion' && !c.moves) {
          // the mean turn: the samples summed on the first one's side, normalised
          const q = new Quaternion(0, 0, 0, 0);
          let first: Quaternion | null = null;
          for (let s = 0; s < N; s++) {
            const r: unknown = ta.animation.evaluate(at(s));
            if (!(r instanceof Quaternion)) continue;
            first ??= r.clone();
            const sg = Quaternion.Dot(first, r) < 0 ? -1 : 1;
            q.x += r.x * sg;
            q.y += r.y * sg;
            q.z += r.z * sg;
            q.w += r.w * sg;
          }
          if (first) rot.push({ b, q: q.normalize() });
        }
      }
      if (!c.moves) this.sway.push({ ci, rot, pos });
    }
  }

  /** (walk-test round 2, Michael: low ready "idle and walk/jogging height is different, noticeable when returning to
   *  idle. should all maintain same height") Drawn (rifle, pistol), each standing clip's lift to its set's drawn height:
   *  halfway between its low ready idle's hips and its walk's (the walks sit 13 cm lower; the legs reach for the rest). */
  private drawHeights(): void {
    const STAND = ['idle', 'aim_idle', 'walk', 'run', 'sprint', 'back', 'left', 'right'] as const;
    for (const set of ['rifle', 'pistol'] as const) {
      const s = LOCO_SETS.indexOf(set);
      const idle = this.table[s * LOCO_N + IDLE_SLOT] as number;
      const walk = this.table[s * LOCO_N + LOCO_SLOTS.indexOf('walk')] as number;
      if (idle < 0 || walk < 0) continue;
      const ref = (this.clips[idle]!.hipY + this.clips[walk]!.hipY) / 2;
      for (const slot of STAND) {
        const ci = this.table[s * LOCO_N + LOCO_SLOTS.indexOf(slot)] as number;
        if (ci >= 0) this.drawDy[ci] = ref - this.clips[ci]!.hipY;
      }
    }
  }

  /** (walk-test round 2) The idles' sway taken toward their mean poses (`SWAY_KEEP` of it kept), by each idle's weight. */
  private calmIdle(): void {
    const k = 1 - SWAY_KEEP;
    for (const S of this.sway) {
      const w = (this.effW[S.ci] as number) * k;
      if (w <= 1e-3) continue;
      for (const r of S.rot) if (r.b.rotationQuaternion) Quaternion.SlerpToRef(r.b.rotationQuaternion, r.q, w, r.b.rotationQuaternion);
      for (const p of S.pos) Vector3.LerpToRef(p.b.position, p.v, w, p.b.position);
    }
  }

  /** (walk-test fix B2) Sample `k` of upper pose `P` between samples `s0` and `s1` (share `u`) into `out`; false: no track. */
  private upSample(P: Float32Array, s0: number, s1: number, u: number, k: number, out: Quaternion): boolean {
    const nb = this.layerBones.length;
    const a = (s0 * nb + k) * 4, b = (s1 * nb + k) * 4;
    if (Number.isNaN(P[a] as number)) return false;
    out.set(P[a] as number, P[a + 1] as number, P[a + 2] as number, P[a + 3] as number);
    qD.set(P[b] as number, P[b + 1] as number, P[b + 2] as number, P[b + 3] as number);
    Quaternion.SlerpToRef(out, qD, u, out);
    return true;
  }

  /**
   * (walk-test fix B2) The upper clip (a draw, a holster) over the upper body by its weight, the legs keeping the gait:
   * the Spine in the body's space (as `lockUpper`: the Hips' own turn swapped for the clip's), the bones above it as the
   * clip has them.
   */
  private layerUpper(): void {
    const w = this.upW;
    const P = w > 1e-3 ? this.upPoses.get(this.upName) : undefined;
    const hips = this.hipsBone?.rotationQuaternion;
    if (!P || !hips) return;
    const f = Math.min(1, Math.max(0, this.upT)) * (UP_SAMPLES - 1);
    const s0 = Math.floor(f), s1 = Math.min(UP_SAMPLES - 1, s0 + 1), u = f - s0;
    for (let k = 1; k < this.layerBones.length; k++) {
      const r = this.layerBones[k]!.rotationQuaternion;
      if (!r || !this.upSample(P, s0, s1, u, k, qA)) continue;
      if (k === 1) {
        if (!this.upSample(P, s0, s1, u, 0, qB)) continue;
        qB.multiplyToRef(qA, qC);
        hips.conjugateToRef(qB);
        qB.multiplyToRef(qC, qA);
      }
      Quaternion.SlerpToRef(r, qA, w, r);
    }
  }

  /** (walk-test fix A3) Clip `name`'s first-frame local rotations of the Hips and the `UPPER` bones (null: no track),
   *  or null when the model lacks the clip. */
  private poseOf(name: string | null): (Quaternion | null)[] | null {
    const g = name ? this.groups.find((x) => x.name.split(':').pop() === name) : undefined;
    if (!g) return null;
    return [this.hipsBone, ...this.upper].map((b) => {
      const ta = b ? g.targetedAnimations.find((t) => t.target === b && t.animation.targetProperty === 'rotationQuaternion') : undefined;
      const q: unknown = ta?.animation.evaluate(g.from);
      return q instanceof Quaternion ? q.clone() : null;
    });
  }

  /** (walk-test fix A3) The head's spot in this body's root space with the Hips and `UPPER` bones in `pose` (clip
   *  `name`'s first frame, its Hips at that frame's place); the bones are put back after. */
  private headIn(name: string | null, pose: (Quaternion | null)[]): Vector3 | null {
    const g = name ? this.groups.find((x) => x.name.split(':').pop() === name) : undefined;
    const hips = this.hipsBone;
    const head = this.headChain[this.headChain.length - 1];
    if (!g || !hips || !head) return null;
    const bones = [hips, ...this.upper];
    const saved = bones.map((b) => b?.rotationQuaternion?.clone() ?? null);
    const hipsAt = hips.position.clone();
    bones.forEach((b, k) => {
      const q = pose[k];
      if (b?.rotationQuaternion && q) b.rotationQuaternion.copyFrom(q);
    });
    const ta = g.targetedAnimations.find((t) => t.target === hips && t.animation.targetProperty === 'position');
    const p: unknown = ta?.animation.evaluate(g.from);
    if (p instanceof Vector3) hips.position.copyFrom(p);
    for (const n of this.headChain) n.computeWorldMatrix(true);
    const out = Vector3.TransformCoordinates(head.getAbsolutePosition(), this.root.computeWorldMatrix(true).clone().invert());
    bones.forEach((b, k) => {
      const q = saved[k];
      if (b?.rotationQuaternion && q) b.rotationQuaternion.copyFrom(q);
    });
    hips.position.copyFrom(hipsAt);
    for (const n of this.headChain) n.computeWorldMatrix(true);
    return out;
  }

  /** A bone's node by its Mixamo name (`Hips`, `Spine2`, `RightUpLeg`, ...), or null. */
  boneNode(name: string): TransformNode | null {
    const re = new RegExp(`(^|[:_])${name}$`);
    for (const n of this.root.getDescendants(false)) if (n instanceof TransformNode && re.test(n.name)) return n;
    return null;
  }

  /**
   * Makes rig nodes follow Mixamo bones (in hierarchy order: a parent before its children). Call once; before the model
   * loads it waits for it. `rigRoot` is the rig's root (each pair's `rest` is in its space).
   */
  follow(rigRoot: TransformNode, pairs: FollowPair[]): void {
    if (this.ready) this.bindFollow(rigRoot, pairs);
    else this.pendingFollow = { rigRoot, pairs };
  }

  private bindFollow(rigRoot: TransformNode, pairs: FollowPair[]): void {
    this.pendingFollow = null;
    this.rigRoot = rigRoot;
    const rootInv = this.root.computeWorldMatrix(true).clone().invert();
    for (const p of pairs) {
      const bone = this.boneNode(p.bone);
      if (!bone) {
        console.warn(`mixamo body ${this.model}: no bone ${p.bone}`);
        continue;
      }
      const boneChain = [...chainBelow(bone, this.root), bone];
      for (const n of boneChain) n.computeWorldMatrix(true);
      this.follows.push({ node: p.node, chain: chainBelow(p.node, rigRoot), rest: p.rest, bone, boneChain, boneRest: bone.getWorldMatrix().multiply(rootInv) });
    }
    this.followObs ??= this.scene.onAfterAnimationsObservable.add(() => this.applyFollow());
  }

  /**
   * (walk-test fix B2) The rig nodes whose pose the bones take once the rig leads (`lead`): `pairs` as for `follow`
   * (each node's rest in `rigRoot`'s space, taken before the rig first animates), top first. Call once, before the model
   * loads (the bones' reference transforms are taken in the reference pose).
   */
  leadPrep(rigRoot: TransformNode, pairs: FollowPair[]): void {
    if (this.ready) this.bindLead(rigRoot, pairs);
    else this.pendingLead = { rigRoot, pairs };
  }

  private bindLead(rigRoot: TransformNode, pairs: FollowPair[]): void {
    this.pendingLead = null;
    this.rigRoot ??= rigRoot;
    const rootInv = this.root.computeWorldMatrix(true).clone().invert();
    for (const p of pairs) {
      const bone = this.boneNode(p.bone);
      if (!bone) continue;
      const boneChain = [...chainBelow(bone, this.root), bone];
      for (const n of boneChain) n.computeWorldMatrix(true);
      this.leads.push({ node: p.node, restInv: p.rest.clone().invert(), bone, boneChain, boneRest: bone.getWorldMatrix().multiply(rootInv), root: p.bone === 'Hips' });
    }
  }

  /**
   * (walk-test fix B2, Michael: the knocked-out / killed guard keeps his body) From now on the rig leads: the moves stop
   * and each lead bone takes its rig node's movement from its rest (the ragdoll, the carry over the shoulder, the put
   * down), the reverse of `follow`. For good: the follow, the held gun and the hand anchors are let go.
   */
  lead(): void {
    this.leading = true;
    if (this.ready) this.startLead();
  }

  private startLead(): void {
    for (const g of this.groups) g.stop();
    this.act = null;
    this.actW = this.upW = this.anchorW = 0;
    this.follows = [];
    this.hold = null;
    this.anchors = null;
    this.tumbleNode = null;
    this.root.position.set(0, this.baseY, 0);
    this.root.rotationQuaternion?.copyFromFloats(0, 0, 0, 1);
    this.followObs ??= this.scene.onAfterAnimationsObservable.add(() => this.applyFollow());
  }

  /** (walk-test fix B2) `n`'s world now, its ancestors first (the ragdoll re-parents the rig's limbs: no fixed chain). */
  private worldNow(n: TransformNode): Matrix {
    const a = this.anc;
    a.length = 0;
    for (let p: TransformNode | null = n; p; p = p.parent instanceof TransformNode ? p.parent : null) a.push(p);
    for (let i = a.length - 1; i >= 0; i--) a[i]!.computeWorldMatrix(true);
    return n.getWorldMatrix();
  }

  /** (walk-test fix B2) Each lead bone, top first: its reference transform moved as its rig node moved from its rest. */
  private applyLead(rr: TransformNode): void {
    const rigW = this.worldNow(rr);
    rigW.invertToRef(mGc);
    // this body's root in the rig root's space
    this.root.computeWorldMatrix(true).multiplyToRef(mGc, mGt);
    for (const L of this.leads) {
      // the node's move D = rest^-1 x now (rig root space); the bone's target = its reference x D, into the world
      this.worldNow(L.node).multiplyToRef(mGc, mA);
      L.restInv.multiplyToRef(mA, mC);
      L.boneRest.multiplyToRef(mGt, mD);
      mD.multiplyToRef(mC, mA);
      mA.multiplyToRef(rigW, mB);
      const chain = L.boneChain;
      for (let i = 0; i < chain.length - 1; i++) chain[i]!.computeWorldMatrix(true);
      (L.bone.parent as TransformNode).getWorldMatrix().invertToRef(mA);
      mB.multiplyToRef(mA, mD);
      mD.decompose(vS, qR, vT);
      if (!Number.isFinite(qR.w + vT.x + vT.y + vT.z)) continue;
      if (L.root) L.bone.position.copyFrom(vT);
      if (L.bone.rotationQuaternion) L.bone.rotationQuaternion.copyFrom(qR);
      else L.bone.rotationQuaternion = qR.clone();
      L.bone.computeWorldMatrix(true);
    }
  }

  /**
   * (slice g) Bends the spine to the aim pitch: `pitch` (rad, up positive) split over Spine, Spine1 and Spine2, each
   * turned about the body's right axis through its own joint, after the moves are applied. The gun in the right hand
   * and the chest-hung gear follow (the hold and the follow run after this).
   */
  private bendSpine(rr: TransformNode): void {
    const p = this.pitch, y = this.yaw;
    const n = this.spine.length;
    if ((Math.abs(p) < 1e-3 && Math.abs(y) < 1e-3) || n === 0) return;
    const r = rr.computeWorldMatrix(true).m;
    // (walk-test fix A3) first the twist about the body's up (the gun follows the aim round, as the rig's did: it swung
    // up to 20 deg off the reticle while the body caught up with a turn), then the bend about the twisted right axis
    if (Math.abs(y) >= 1e-3) {
      vT.set(r[4] as number, r[5] as number, r[6] as number).normalize();
      for (let si = 0; si < n; si++) this.turnBone(this.spine[si]!, this.spineChains[si]!, vT, y / n);
    }
    if (Math.abs(p) < 1e-3) return;
    const c = Math.cos(y), s = Math.sin(y);
    vT.set((r[0] as number) * c - (r[8] as number) * s, (r[1] as number) * c - (r[9] as number) * s, (r[2] as number) * c - (r[10] as number) * s).normalize();
    for (let si = 0; si < n; si++) this.turnBone(this.spine[si]!, this.spineChains[si]!, vT, -p / n);
  }

  /**
   * (walk-test fix A3) Aimed, the upper body takes its set's aimed idle (blended standing to crouched), by the aim's
   * weight: the Spine in the body's space (the Hips' turn and lean in a strafe or a walk taken back out), the bones above
   * it as the idle has them. The legs keep the gait.
   */
  private lockUpper(): void {
    const w = this.lockW;
    const pose = w > 1e-3 ? this.aimPose.get(this.set) : undefined;
    if (pose) this.holdUpper(pose, w);
  }

  /** (walk-test round 1) `pose` (a set's aimed or low ready idles, `aimPose` / `readyPose`) over the upper body by `w`,
   *  as `lockUpper` says. */
  private holdUpper(pose: { stand: (Quaternion | null)[]; crouch: (Quaternion | null)[] }, w: number): void {
    const c = this.lockCrouch;
    const hips = this.hipsBone?.rotationQuaternion;
    for (let k = 0; k < this.upper.length; k++) {
      const b = this.upper[k];
      const qs = pose.stand[k + 1], r = b?.rotationQuaternion;
      if (!qs || !r) continue;
      Quaternion.SlerpToRef(qs, pose.crouch[k + 1] ?? qs, c, qA);
      if (k === 0) {
        // the Spine's world turn is the Hips' parent's x Hips x Spine: in the pose's, the Hips' own swapped for the pose's
        const hs = pose.stand[0];
        if (!hips || !hs) continue;
        Quaternion.SlerpToRef(hs, pose.crouch[0] ?? hs, c, qB);
        qB.multiplyToRef(qA, qC);
        hips.conjugateToRef(qB);
        qB.multiplyToRef(qC, qA);
      }
      Quaternion.SlerpToRef(r, qA, w, r);
    }
  }

  /** (walk-test round 1) Drawn and not aimed, the upper body takes the set's low ready idle (standing to crouched, as
   *  `lockUpper`: arms-only left the rifle at the thighs in its walk, whose spine hunches) by the hold's weight, then
   *  (`READY_DROP`, the tuner's "gun up") the arms turn down together about the body's right axis: the hands keep their
   *  places on the gun, the muzzle dips with them. */
  private readyArms(): void {
    const w = this.readyW;
    const pose = w > 1e-3 ? this.readyPose.get(this.set) : undefined;
    if (!pose) return;
    this.holdUpper(pose, w);
    const lift = this.opts.holdStop ? TUNE_LOCAL.gunUp / READY_ARM : 0;
    const drop = ((READY_DROP[this.set] ?? 0) - lift) * w;
    const R = this.armR[0], L = this.armL[0], hand = this.armR[2];
    if (Math.abs(drop) < 1e-3 || !R || !L || !hand) return;
    const m = this.root.computeWorldMatrix(true).m;
    vR.set(m[0] as number, m[1] as number, m[2] as number).normalize();
    // the turn that lowers the right hand about its shoulder (the sign read off the hand, not the handedness)
    for (const n of this.armChainR) n.computeWorldMatrix(true);
    R.computeWorldMatrix(true).getTranslationToRef(vP);
    for (const n of this.armR) n.computeWorldMatrix(true);
    hand.getAbsolutePosition().subtractToRef(vP, vG);
    Matrix.RotationAxisToRef(vR, 0.1, mA);
    Vector3.TransformNormalToRef(vG, mA, vU);
    const a = vU.y <= vG.y ? drop : -drop;
    this.turnBone(L, this.armChainL, vR, a);
    this.turnBone(R, this.armChainR, vR, a);
  }

  /**
   * (walk-test round 2) The hips moved, the legs reaching back to the clip's feet and the upper body carried rigid:
   * crouched, up by `CROUCH_LIFT` (Michael: crouching "slightly too low"); drawn, each standing clip to its set's drawn
   * height (`drawHeights`); aimed, the gait's bob taken out and the head held over its aimed idle's spot across the
   * ground (Michael: "upper body should remain stiff when aiming": walk-test fix A3 leant the spine for the head, so the
   * chest and the gun swayed). As far as the legs reach (`LEG_REACH`).
   */
  private shiftHips(): void {
    const hips = this.hipsBone;
    const lL = this.legs[0], lR = this.legs[1];
    const keep = 1 - this.actW;
    if (!hips || !lL || !lR || this.anchored || this.turned || keep <= 1e-3) return;
    let up = CROUCH_LIFT * this.lockCrouch;
    // aimed, the hips' height is held at the mix's steady height: each clip's drawn height, never above its own lowest
    // (the legs cannot stretch for the rest of the bob: a strafe's low point sits ~8 cm under its drawn height)
    let mix = 0, mixW = 0, draw = 0;
    for (let ci = 0; ci < this.clips.length; ci++) {
      const w = this.effW[ci] as number;
      if (w <= 0) continue;
      const c = this.clips[ci]!;
      const dd = this.drawDy[ci] as number;
      draw += w * dd;
      mix += w * (Math.min(c.hipY + dd, c.hipMin) - AIM_SINK);
      mixW += w;
    }
    up += draw * this.readyW;
    const rootW = this.root.computeWorldMatrix(true);
    const m = rootW.m;
    vU.set(m[4] as number, m[5] as number, m[6] as number).normalize();
    vD.setAll(0);
    const lw = this.lockW;
    const at = lw > 1e-3 ? this.aimHead.get(this.set) : undefined;
    const head = this.headChain[this.headChain.length - 1];
    if (at && head && mixW > 0) {
      // the bob: the hips' height now against the steady height
      for (const n of this.hipsChain) n.computeWorldMatrix(true);
      hips.computeWorldMatrix(true).getTranslationToRef(vJ);
      vJ.subtractInPlace(this.root.getAbsolutePosition());
      up += (mix / mixW - Vector3.Dot(vJ, vU)) * lw;
      // the head over its aimed idle's spot (root space, across the ground)
      for (const n of this.headChain) n.computeWorldMatrix(true);
      rootW.invertToRef(mA);
      Vector3.TransformCoordinatesToRef(head.getAbsolutePosition(), mA, vP);
      Vector3.LerpToRef(at.stand, at.crouch, this.lockCrouch, vE);
      vF.set((vE.x - vP.x) * lw, 0, (vE.z - vP.z) * lw);
      Vector3.TransformNormalToRef(vF, rootW, vD);
    }
    vU.scaleInPlace(up * keep);
    if (vD.lengthSquared() + vU.lengthSquared() < 1e-8) return;
    // the feet now and each thigh joint from its foot (`legA`) and its reach (`legR`)
    for (let k = 0; k < 2; k++) {
      const L = this.legs[k]!;
      const [th, sh, ft] = L.bones as [TransformNode, TransformNode, TransformNode];
      for (const n of L.chain) n.computeWorldMatrix(true);
      th.computeWorldMatrix(true).getTranslationToRef(vJ);
      sh.computeWorldMatrix(true).getTranslationToRef(vP);
      ft.computeWorldMatrix(true).getTranslationToRef(vE);
      (k === 0 ? mFl : mFr).copyFrom(ft.getWorldMatrix());
      this.legR[k] = (Vector3.Distance(vJ, vP) + Vector3.Distance(vP, vE)) * LEG_REACH;
      vJ.subtractToRef(vE, LEG_A[k]!);
    }
    // the height first (lowering always fits), then the shift across the ground from there
    vU.scaleInPlace(this.legRoom(vU));
    LEG_A[0]!.addInPlace(vU);
    LEG_A[1]!.addInPlace(vU);
    vD.scaleInPlace(this.legRoom(vD)).addInPlace(vU);
    if (vD.lengthSquared() < 1e-8) return;
    (hips.parent as TransformNode).getWorldMatrix().invertToRef(mA);
    Vector3.TransformNormalToRef(vD, mA, vJ);
    hips.position.addInPlace(vJ);
    hips.computeWorldMatrix(true);
    this.reachArm(lL.bones, lL.chain, lL.fore, mFl);
    this.reachArm(lR.bones, lR.chain, lR.fore, mFr);
  }

  /** (walk-test round 2, Michael: "the stops jitter/jump") A held stride's lifted foot set down (CT: the swinging foot
   *  "ends on the ground in the held split pose"): each foot's lowest point (ankle or toe) brought down to the other's,
   *  by `plantW`, the leg reaching for it. */
  private plantFeet(): void {
    const w = this.plantW;
    const t0 = this.toes[0], t1 = this.toes[1];
    if (w <= 1e-3 || this.legs.length < 2 || !t0 || !t1) return;
    for (let k = 0; k < 2; k++) {
      const L = this.legs[k]!;
      for (const n of L.chain) n.computeWorldMatrix(true);
      for (const n of L.bones) n.computeWorldMatrix(true);
      const ft = L.bones[2]!.getAbsolutePosition().y;
      const to = (k === 0 ? t0 : t1).computeWorldMatrix(true).getTranslationToRef(vP).y;
      this.footLow[k] = Math.min(ft, to);
    }
    const ground = Math.min(this.footLow[0] as number, this.footLow[1] as number);
    for (let k = 0; k < 2; k++) {
      const d = ((this.footLow[k] as number) - ground) * w;
      if (d < 2e-3) continue;
      const L = this.legs[k]!;
      const M = k === 0 ? mFl : mFr;
      M.copyFrom(L.bones[2]!.getWorldMatrix());
      M.getTranslationToRef(vJ);
      vJ.y -= d;
      M.setTranslation(vJ);
      this.reachArm(L.bones, L.chain, L.fore, M);
    }
  }

  /** (walk-test round 2) The share (0..1) of hip shift `D` (world) both legs can take: each thigh joint (`LEG_A`, from
   *  its foot) kept within its reach (`legR`), or within where it is already when the clip has it further. */
  private legRoom(D: Vector3): number {
    const a = D.lengthSquared();
    if (a < 1e-10) return 0;
    let t = 1;
    for (let k = 0; k < 2; k++) {
      const A = LEG_A[k]!;
      const AA = A.lengthSquared();
      const R2 = Math.max((this.legR[k] as number) ** 2, AA);
      const b = 2 * Vector3.Dot(A, D), c = AA - R2;
      if (a + b + c <= 0) continue;
      t = Math.min(t, Math.max(0, (-b + Math.sqrt(Math.max(0, b * b - 4 * a * c))) / (2 * a)));
    }
    return t;
  }

  /** (walk-test round 2, Michael: "rifle should be held closer to body") Drawn and not aimed, the gun's hands come back
   *  toward the body by `READY_IN` (the arms reach; the gun rides the right hand, the left keeps its place on it). */
  private readyHands(): void {
    const d = (READY_IN[this.set] ?? 0) * this.readyW * (1 - this.actW);
    if (d < 1e-3 || this.armR.length !== 3 || this.armL.length !== 3 || !this.rightHanded || !this.hold?.kind()) return;
    const m = this.root.computeWorldMatrix(true).m;
    vD.set(m[8] as number, m[9] as number, m[10] as number).normalize().scaleInPlace(-d);
    for (const n of this.armChainR) n.computeWorldMatrix(true);
    for (const n of this.armR) n.computeWorldMatrix(true);
    for (const n of this.armChainL) n.computeWorldMatrix(true);
    for (const n of this.armL) n.computeWorldMatrix(true);
    mHr.copyFrom(this.armR[2]!.getWorldMatrix());
    mHl.copyFrom(this.armL[2]!.getWorldMatrix());
    mHr.getTranslationToRef(vJ);
    mHr.setTranslation(vJ.addInPlace(vD));
    mHl.getTranslationToRef(vJ);
    mHl.setTranslation(vJ.addInPlace(vD));
    this.reachArm(this.armR, this.armChainR, this.foreChainR, mHr);
    this.reachArm(this.armL, this.armChainL, this.foreChainL, mHl);
  }

  /** (walk-test round 2) Aimed: the rifle's butt where the aimed idle's hands hold it (Michael: "rifle is not held tight
   *  against the shoulder": the rig's aim pocket sat the stock off the Mixamo shoulder; the clip has it in the shoulder),
   *  the pistol's sight top up to the eye (Michael: "pistol should be higher, in line with eyes"); the gun's turn `q`
   *  (the aim) kept, its spot `p` (world) moved. `held`: the gun as the hand holds it now (locked to the aimed idle). */
  private seatGun(k: HoldKind, q: Quaternion, p: Vector3, held: Matrix): void {
    const g = this.gunSpan;
    const head = this.headChain[this.headChain.length - 1];
    if (!g || !head) return;
    Matrix.ComposeToRef(ONE, q, p, mA);
    if (k === 'rifle') {
      Vector3.TransformCoordinatesFromFloatsToRef(0, g.bore, g.z0, held, vJ);
      Vector3.TransformCoordinatesFromFloatsToRef(0, g.bore, g.z0, mA, vG);
      p.addInPlace(vJ.subtractInPlace(vG));
      return;
    }
    for (const n of this.headChain) n.computeWorldMatrix(true);
    Vector3.TransformCoordinatesFromFloatsToRef(0, g.top, (g.z0 + g.z1) * 0.5, mA, vG);
    p.y += head.getAbsolutePosition().y + PISTOL_EYE - vG.y;
  }

  /** (walk-test fix A3) The held gun's pivot world for a hand world `H` (`grip`, its class), and the hand's units per
   *  metre (the bone's world scale is the body's scale x the model's centimetres): `holdL` maps pivot to hand space. */
  private holdFrame(kind: HoldKind, grip: Vector3, H: Matrix): void {
    const F = HOLD_FRAMES[kind];
    const m = H.m;
    const u = 1 / Math.hypot(m[0] as number, m[1] as number, m[2] as number);
    const g = grip;
    const [rx, ry, rz] = F.right, [ux, uy, uz] = F.up, [fx, fy, fz] = F.fwd;
    // the grip point's spot in hand space, then the gun's origin so the grip lands on the palm
    const gx = g.x * rx + g.y * ux + g.z * fx, gy = g.x * ry + g.y * uy + g.z * fy, gz = g.x * rz + g.y * uz + g.z * fz;
    const tx = (F.palm[0] - gx) * u, ty = (F.palm[1] - gy) * u, tz = (F.palm[2] - gz) * u;
    Matrix.FromValuesToRef(rx * u, ry * u, rz * u, 0, ux * u, uy * u, uz * u, 0, fx * u, fy * u, fz * u, 0, tx, ty, tz, 1, this.holdL);
  }

  /** (walk-test fix A3) Before the follow moves the rig's torso: the rig's aimed gun (its pivot), when the arms will
   *  reach for it this frame. */
  private takeRigGun(): void {
    const h = this.hold;
    this.rigGunOk = !!h && this.lockW > 1e-3 && this.rightHanded && this.armR.length === 3 && this.armL.length === 3 && h.kind() !== null;
    if (!h || !this.rigGunOk) {
      this.gunFOk = false;
      return;
    }
    for (const n of h.chain) n.computeWorldMatrix(true);
    this.rigGun.copyFrom(h.pivot.computeWorldMatrix(true));
  }

  /**
   * (walk-test fix A3, Michael: "rifle held too low when aimed") Aimed, the gun goes where the rig aims it (its sight
   * level with the eye, along the aim, `CharacterRig.sightToEye`), by the aim's weight, and the arms reach for it: the
   * right hand takes the grip (its hold frame), the left keeps its place on the gun as the idle has it.
   */
  private reachGun(): void {
    const h = this.hold;
    const k = h && this.rigGunOk ? h.kind() : null;
    if (!h || !k) return;
    for (const n of h.handChain) n.computeWorldMatrix(true);
    const L = this.armL[2]!;
    L.computeWorldMatrix(true);
    // the gun as the hand holds it now (locked and bent), and the target between it and the rig's
    this.holdFrame(k, h.grip, h.hand.getWorldMatrix());
    this.holdL.multiplyToRef(h.hand.getWorldMatrix(), mGc);
    mGc.decompose(vS, qA, vP);
    this.rigGun.decompose(vS, qB, vE);
    this.steadyGun(qB, vE);
    this.seatGun(k, qB, vE, mGc);
    Quaternion.SlerpToRef(qA, qB, this.lockW, qC);
    Vector3.LerpToRef(vP, vE, this.lockW, vW);
    Matrix.ComposeToRef(ONE, qC, vW, mGt);
    // the right hand: the hold frame back off the target; the left: its place on the gun now, on the target
    this.holdL.invertToRef(mA);
    mA.multiplyToRef(mGt, mHr);
    mGc.invertToRef(mA);
    L.getWorldMatrix().multiplyToRef(mA, mB);
    mB.multiplyToRef(mGt, mHl);
    this.reachArm(this.armR, this.armChainR, this.foreChainR, mHr);
    this.reachArm(this.armL, this.armChainL, this.foreChainL, mHl);
  }

  /** (walk-test round 1) The aimed gun at world spot `p`, turned `q` (the aim): its spot from about the eye, in the
   *  gun's own frame. Standing still it is learnt per stance (`gunStill`); moving, the gun keeps the learnt spot (the
   *  rig's gun slid ~10 cm across the view over a second of strafing: its trunk leans into the move), so a turn or a
   *  look up carries the gun at once and the gait never moves it. Smoothed (`GUN_STEADY`, two stages). Writes the
   *  steadied spot back into `p`. */
  private steadyGun(q: Quaternion, p: Vector3): void {
    const dt = this.scene.getEngine().getDeltaTime() / 1000;
    const o = vW.copyFrom(this.root.getAbsolutePosition());
    o.y += GUN_EYE_STAND + (GUN_EYE_CROUCH - GUN_EYE_STAND) * this.lockCrouch;
    p.subtractToRef(o, vU);
    q.conjugateToRef(qG);
    vU.rotateByQuaternionToRef(qG, vG);
    const k = dt > 0 ? 1 - Math.exp(-dt / GUN_STEADY) : 1;
    // learn the still spot (settled stance and aim only; the first one even moving), then use it, blended by the crouch
    const c = this.lockCrouch;
    const s = this.gunStill[c > 0.5 ? 1 : 0]!;
    if ((this.speedNow < HOLD_STILL || !s.ok) && this.lockW > 0.95 && (c < 0.02 || c > 0.98)) {
      if (s.ok) Vector3.LerpToRef(s.v, vG, k, s.v);
      else s.v.copyFrom(vG);
      s.ok = true;
    }
    const a = this.gunStill[0]!, b = this.gunStill[1]!;
    if (a.ok && b.ok) Vector3.LerpToRef(a.v, b.v, c, vG);
    else if (a.ok && c < 0.5) vG.copyFrom(a.v);
    else if (b.ok && c >= 0.5) vG.copyFrom(b.v);
    if (!this.gunFOk) {
      this.gunF1.copyFrom(vG);
      this.gunF2.copyFrom(vG);
      this.gunFOk = true;
    }
    vG.subtractInPlace(this.gunF1);
    this.gunF1.addInPlace(vG.scaleInPlace(k));
    this.gunF1.subtractToRef(this.gunF2, vG);
    this.gunF2.addInPlace(vG.scaleInPlace(k));
    this.gunF2.rotateByQuaternionToRef(q, vG);
    o.addToRef(vG, p);
  }

  /** (walk-test fix A3) Upper arm, forearm and hand (`arm`; the bones above the upper arm `chain`, above the forearm
   *  `foreChain`) reach hand world `target`. */
  private reachArm(arm: TransformNode[], chain: TransformNode[], foreChain: TransformNode[], target: Matrix): void {
    const [up, fore, hand] = arm as [TransformNode, TransformNode, TransformNode];
    for (const n of chain) n.computeWorldMatrix(true);
    up.computeWorldMatrix(true).getTranslationToRef(vP);
    fore.computeWorldMatrix(true).getTranslationToRef(vE);
    hand.computeWorldMatrix(true).getTranslationToRef(vW);
    const t = target.m;
    vF.set(t[12] as number, t[13] as number, t[14] as number);
    if (reachElbow(vP, vE, vF, Vector3.Distance(vP, vE), Vector3.Distance(vE, vW), vE2)) {
      // the upper arm turns its elbow onto the solved one, then the forearm its wrist onto the target
      vE.subtractInPlace(vP);
      vE2.subtractInPlace(vP);
      this.turnFromTo(up, chain, vE, vE2);
      fore.computeWorldMatrix(true).getTranslationToRef(vE);
      hand.computeWorldMatrix(true).getTranslationToRef(vW);
      vW.subtractInPlace(vE);
      vF.subtractInPlace(vE);
      this.turnFromTo(fore, foreChain, vW, vF);
    }
    // the hand turned as the target has it
    fore.computeWorldMatrix(true).invertToRef(mA);
    target.multiplyToRef(mA, mB);
    mB.decompose(vS, qR, vT);
    if (!Number.isFinite(qR.w) || !hand.rotationQuaternion) return;
    hand.rotationQuaternion.copyFrom(qR);
    hand.computeWorldMatrix(true);
  }

  /** Turns bone `b` (its ancestors `chain`) about its joint so world direction `from` lies along `to`. */
  private turnFromTo(b: TransformNode, chain: TransformNode[], from: Vector3, to: Vector3): void {
    Vector3.CrossToRef(from, to, vAx);
    const s = vAx.length();
    const a = Math.atan2(s, Vector3.Dot(from, to));
    if (s < 1e-9 || Math.abs(a) < 1e-5) return;
    vAx.scaleInPlace(1 / s);
    this.turnBone(b, chain, vAx, a);
  }

  /** Turns bone `b` (its ancestors `chain`, top first) by `a` rad about the world axis `axis` through its own joint. */
  private turnBone(b: TransformNode, chain: TransformNode[], axis: Vector3, a: number): void {
    for (const n of chain) n.computeWorldMatrix(true);
    const W = b.computeWorldMatrix(true);
    const px = W.m[12] as number, py = W.m[13] as number, pz = W.m[14] as number;
    // new world = W . move(-joint) . turn(axis, a) . move(joint)
    Matrix.TranslationToRef(-px, -py, -pz, mA);
    W.multiplyToRef(mA, mB);
    Matrix.RotationAxisToRef(axis, a, mC);
    mB.multiplyToRef(mC, mD);
    Matrix.TranslationToRef(px, py, pz, mA);
    mD.multiplyToRef(mA, mB);
    (b.parent as TransformNode).getWorldMatrix().invertToRef(mA);
    mB.multiplyToRef(mA, mC);
    mC.decompose(vS, qR, vT2);
    b.position.copyFrom(vT2);
    if (b.rotationQuaternion) b.rotationQuaternion.copyFrom(qR);
    else b.rotationQuaternion = qR.clone();
    b.scaling.copyFrom(vS);
    b.computeWorldMatrix(true);
  }

  /** (walk-test fix A) The hip line's angle (left thigh to right thigh) in the body root's ground plane (rad). */
  private hipYaw(): number {
    const L = this.thighs[0], R = this.thighs[1];
    if (!L || !R) return 0;
    for (const n of this.thighChain) n.computeWorldMatrix(true);
    const m = this.root.computeWorldMatrix(true).m;
    const l = L.getAbsolutePosition(), r = R.getAbsolutePosition();
    const dx = r.x - l.x, dy = r.y - l.y, dz = r.z - l.z;
    const x = dx * (m[0] as number) + dy * (m[1] as number) + dz * (m[2] as number);
    const z = dx * (m[8] as number) + dy * (m[9] as number) + dz * (m[10] as number);
    return Math.atan2(z, x);
  }

  /** (walk-test fix A) A no-yaw action: the hips turn back about the body's up by the clip's own turn since its first
   *  frame (weighted by the action's weight), so the body keeps the game's facing. */
  private flattenYaw(): void {
    const y0 = this.act ? this.yaw0.get(this.actName) : undefined;
    const hips = this.hipsBone;
    if (y0 === undefined || !hips || this.actW <= 0) return;
    const now = this.hipYaw();
    const d = Math.atan2(Math.sin(now - y0), Math.cos(now - y0));
    const m = this.root.computeWorldMatrix(true).m;
    vT.set(m[4] as number, m[5] as number, m[6] as number).normalize();
    this.turnBone(hips, this.hipsChain, vT, d * this.actW);
  }

  /** After Babylon's animation step: each follower takes its bone's movement from the bind pose. */
  private applyFollow(): void {
    const rr = this.rigRoot;
    if (!rr || !this.ready || !this.root.isEnabled()) return;
    if (this.leading) {
      this.applyLead(rr);
      return;
    }
    this.takeRigGun();
    // (walk-test round 2) the idles' sway halved first: everything after builds on the calmed pose
    this.calmIdle();
    this.anchorBody();
    this.turnBody();
    if (NO_YAW.has(this.actName)) this.flattenYaw();
    this.layerUpper();
    this.lockUpper();
    this.readyArms();
    this.plantFeet();
    this.shiftHips();
    this.readyHands();
    this.bendSpine(rr);
    this.reachGun();
    const rootW = this.root.computeWorldMatrix(true);
    const rigW = rr.computeWorldMatrix(true);
    for (const f of this.follows) {
      for (const n of f.boneChain) n.computeWorldMatrix(true);
      // delta = inverse(bone bind, world now) x bone now: the bone's movement away from its bind pose
      f.boneRest.multiplyToRef(rootW, mA);
      mA.invertToRef(mB);
      mB.multiplyToRef(f.bone.getWorldMatrix(), mC);
      // target = node rest (world now) x delta; local = target x inverse(parent world)
      f.rest.multiplyToRef(rigW, mA);
      mA.multiplyToRef(mC, mD);
      for (const n of f.chain) n.computeWorldMatrix(true);
      const parent = f.node.parent as TransformNode;
      parent.getWorldMatrix().invertToRef(mA);
      mD.multiplyToRef(mA, mB);
      mB.decompose(vS, qR, vT);
      // (walk-test fix A) never a NaN into the rig: its springs keep it for good (the body stayed gone after a wall)
      if (!Number.isFinite(qR.w + vT.x + vT.y + vT.z)) continue;
      f.node.position.copyFrom(vT);
      if (f.node.rotationQuaternion) f.node.rotationQuaternion.copyFrom(qR);
      else f.node.rotationQuaternion = qR.clone();
      f.node.computeWorldMatrix(true);
    }
    this.applyHold();
  }

  /**
   * (slice b) Puts a held gun in the Mixamo right hand: `pivot` (the rig node the held gun sits on at its origin) is set
   * so the gun's grip point (`grip`, gun space, m) lands in the palm with the gun turned by its class's hold frame.
   * `kind` says each frame which class is held in the hands (null: none, or the gun is on its way: the rig places it).
   * (slice i) `travel` gives the gun on its way (drawn or holstered, off the aim pivot) and its class: it too sits in the
   * Mixamo hand until it is seated (the rig's travel follows the hidden rig's hand, so the gun floated beside the body).
   */
  holdGun(rigRoot: TransformNode, pivot: TransformNode, grip: Vector3, kind: () => HoldKind | null, travel: (() => GunTravel | null) | null = null): void {
    const hand = this.ready ? this.boneNode('RightHand') : null;
    if (!this.ready) {
      // the model is still loading: bind once it is
      const o = this.scene.onBeforeRenderObservable.add(() => {
        if (!this.ready && !this.failed) return;
        this.scene.onBeforeRenderObservable.remove(o);
        if (this.ready) this.holdGun(rigRoot, pivot, grip, kind, travel);
      });
      return;
    }
    if (!hand) return;
    this.rigRoot ??= rigRoot;
    this.hold = { pivot, chain: chainBelow(pivot, rigRoot), grip, kind, hand, handChain: [...chainBelow(hand, this.root), hand], travel };
    this.followObs ??= this.scene.onAfterAnimationsObservable.add(() => this.applyFollow());
  }

  private applyHold(): void {
    const h = this.hold;
    if (!h) return;
    let k = h.kind();
    let target = h.pivot;
    let chain = h.chain;
    if (!k) {
      // (slice i) a gun on its way in or out: the gun node itself into the hand
      const t = h.travel?.() ?? null;
      if (!t) return;
      if (t.node !== this.travelNode) {
        this.travelNode = t.node;
        this.travelChain = chainBelow(t.node, this.rigRoot ?? this.root);
      }
      k = t.kind;
      target = t.node;
      chain = this.travelChain;
    }
    for (const n of h.handChain) n.computeWorldMatrix(true);
    const H = h.hand.getWorldMatrix();
    this.holdFrame(k, h.grip, H);
    this.holdL.multiplyToRef(H, mD);
    for (const n of chain) n.computeWorldMatrix(true);
    (target.parent as TransformNode).getWorldMatrix().invertToRef(mA);
    mD.multiplyToRef(mA, mB);
    mB.decompose(vS, qR, vT);
    target.position.copyFrom(vT);
    if (target.rotationQuaternion) target.rotationQuaternion.copyFrom(qR);
    else target.rotationQuaternion = qR.clone();
    target.computeWorldMatrix(true);
  }

  /**
   * One frame of locomotion in move set `set` (`dt` s), and (slice e) the action `act` over it, if any. Moving clips
   * share one cycle clock so the feet agree while they blend; a set change crossfades over `SET_FADE`.
   */
  update(i: LocoIn, set: LocoSet, dt: number, act?: ActionOut): void {
    if (!this.ready || this.leading) return;
    if (set !== this.set) for (const s of this.gunStill) s.ok = false;
    this.set = set;
    this.speedNow = Math.max(0, i.speed);
    // (slice g) the spine bends to the aim pitch while a gun is up (no action playing), eased
    const armed = (set === 'rifle' || set === 'pistol') && !act?.clip;
    const pitchWant = armed ? (i.aimPitch ?? 0) * Math.min(1, Math.max(0, i.aim ?? 0)) : 0;
    const k = dt > 0 ? Math.min(1, dt / PITCH_EASE) : 1;
    this.pitch += (Math.max(-PITCH_MAX, Math.min(PITCH_MAX, pitchWant)) - this.pitch) * k;
    // (walk-test fix A3) the twist as it comes (the body's facing steps as it catches up with the aim: eased, the upper
    // body would swing by the step); the aim lock by the raise
    this.yaw = armed ? Math.max(-YAW_MAX, Math.min(YAW_MAX, i.aimYaw ?? 0)) : 0;
    this.lockW = armed ? Math.min(1, Math.max(0, i.aim ?? 0)) : 0;
    this.lockCrouch = Math.min(1, Math.max(0, i.crouch));
    const step = dt > 0 ? dt / SET_FADE : 1;
    let sum = 0;
    for (let s = 0; s < LOCO_SETS.length; s++) {
      const want = LOCO_SETS[s] === set ? 1 : 0;
      const v = this.setW[s] as number;
      const n = want > v ? Math.min(want, v + step) : Math.max(want, v - step);
      this.setW[s] = n;
      sum += n;
    }
    this.setSum = sum;
    const cps = this.mixInto(i, this.clipW);
    // (slice e) an action fades over the locomotion (ACT_FADE); a new action takes over at once
    const want = act?.clip ? (this.actions.get(act.clip) ?? null) : null;
    if (want && want !== this.act) {
      if (this.act) this.act.weight = 0;
      this.act = want;
      this.actName = act?.clip ?? '';
      want.speedRatio = 1;
      this.gripPh = NaN;
      this.gripHeld = false;
    }
    const aStep = dt > 0 ? dt / ACT_FADE : 1;
    this.actW = want ? Math.min(1, this.actW + aStep) : Math.max(0, this.actW - aStep);
    // (walk-test fix B2) the upper clip fades like an action; fading out it holds its last frame
    const up = act?.upper && this.upPoses.has(act.upper) ? act.upper : null;
    if (up) {
      const ut = act?.upperT ?? 0;
      if (Number.isNaN(ut)) {
        // a looping one (the grab's hold) runs on its own clock, from its start when it comes in
        const len = this.seconds(up);
        this.upT = up !== this.upName ? 0 : len > 0 ? (this.upT + dt / len) % 1 : 0;
      } else this.upT = ut;
      this.upName = up;
    }
    this.upW = up ? Math.min(1, this.upW + aStep) : Math.max(0, this.upW - aStep);
    // (walk-test round 1) drawn, not aimed and no upper clip: the arms hold the low ready
    const readyWant = armed && !up ? 1 - this.lockW : 0;
    const rStep = dt > 0 ? dt / READY_FADE : 1;
    this.readyW = readyWant > this.readyW ? Math.min(readyWant, this.readyW + rStep) : Math.max(readyWant, this.readyW - rStep);
    const keep = 1 - this.actW;
    const h = this.opts.holdStop ? this.stopHold(i, set, dt, cps) : 0;
    // (walk-test fix A) the stop hold freezes the clock; (walk-test round 2) from a jog it runs down first, the pose easing
    // from the jog's mix into the walk's
    let holdRate = 0;
    const ease = this.stopOn && this.stopEase > 0 ? Math.min(1, this.stopT / this.stopEase) : 1;
    if (this.stopOn && this.stopEase > 0) holdRate = this.stopCps * (1 - ease);
    const u = this.stopOn && this.stopEase > 0 ? ease * ease * (3 - 2 * ease) : 0;
    for (let ci = 0; ci < this.clips.length; ci++) this.heldW[ci] = (this.stopW[ci] as number) + ((this.stopWalkW[ci] as number) - (this.stopW[ci] as number)) * u;
    if (dt > 0) this.phase = (this.phase + (cps * (1 - h) + holdRate * h) * dt) % 1;
    // (walk-test round 2) the held stride's lifted foot comes down once the clock has stopped
    if (this.stopOn) this.plantK = Math.min(1, this.stopT / PLANT_IN) * (this.stopEase > 0 ? u : 1);
    this.plantW = this.plantK * h * keep;
    for (let ci = 0; ci < this.clips.length; ci++) {
      const c = this.clips[ci]!;
      const wt = ((this.clipW[ci] as number) * (1 - h) + (this.heldW[ci] as number) * h) * keep;
      this.effW[ci] = wt;
      c.g.weight = wt * BLEND_FULL;
      // idles keep their own clock; (walk-test round 1) moving clips are pinned to the shared one, each from its own
      // left heel strike (pinned like a timed action)
      if (!c.moves) {
        c.g.speedRatio = 1;
        continue;
      }
      c.g.speedRatio = PIN_RATE;
      if (wt > 0) c.g.goToFrame(c.g.from + ((this.phase + c.strike) % 1) * (c.g.to - c.g.from));
    }
    const a = this.act;
    if (a) {
      a.weight = this.actW * BLEND_FULL;
      // a timed action is pinned to the game's progress; a looping one runs on its own clock. (slice h) Pinned at a
      // near-zero rate, not 0: at 0 Babylon's next animation step puts the frame back (a jump is timed by the rate), so
      // the clip stood on one frame
      if (want && act && !Number.isNaN(act.t)) {
        a.speedRatio = PIN_RATE;
        // (slice i) just short of the last frame: the clip loops, so its end is its first frame again
        a.goToFrame(a.from + Math.min(act.t, PIN_END) * (a.to - a.from));
      } else if (want && act?.grip) this.gripStep(a, i.speed);
      else a.speedRatio = 1;
      if (this.actW <= 0) this.act = null;
    }
    // (slice g) hanging, shimmying, on a ladder and early in a climb-up the body is placed by its hands on the rig's
    const an = a ? this.actName : '';
    const climb = an === 'hang_climb_up' && act && !Number.isNaN(act.t) ? 1 - Math.min(1, Math.max(0, (act.t - ANCHOR_CLIMB_FROM) / ANCHOR_CLIMB_SPAN)) : 1;
    this.anchorW = a && ANCHORED.has(an) ? this.actW * climb : 0;
    this.turnOn = !!act?.turn && !!a;
  }

  /** (walk-test round 2) Each clip's share (into `out`) of input `i` over the move sets' weights now, and the gait's
   *  clock rate (cycles a second). */
  private mixInto(i: LocoIn, out: Float64Array): number {
    locoBlend(i, this.w, this.ratio);
    out.fill(0);
    let pace = 0, stride = 0, mw = 0;
    for (let s = 0; s < LOCO_SETS.length; s++) {
      const sw = (this.setW[s] as number) / (this.setSum || 1);
      if (sw <= 0) continue;
      for (let k = 0; k < LOCO_N; k++) {
        const wk = sw * (this.w[k] as number);
        const ci = this.table[s * LOCO_N + k] as number;
        if (wk <= 0 || ci < 0) continue;
        out[ci] = (out[ci] as number) + wk;
        const c = this.clips[ci]!;
        if (!c.moves) continue;
        pace += wk / c.cycle;
        stride += wk * c.stride;
        mw += wk;
      }
    }
    // (walk-test round 1) cycles a second: the body's speed over the blend's stride, within the clips' own pace limits
    if (mw <= 0 || stride <= 0) return 0;
    pace /= mw;
    return Math.max(pace * GAIT_MIN, Math.min(pace * GAIT_MAX, Math.max(0, i.speed) / (stride / mw)));
  }

  /**
   * (walk-test fix A) The stop hold's weight this frame (0..1): the gait's last full mix (`stopW`) holds while the body
   * slows out of it and stands, for `HOLD_STOP` s, then eases into the idle. Moving off again (not slowing, not still)
   * or a crouch, aim or move-set change (a draw, a holster) lets it go. (walk-test round 2, Michael: "the stops
   * jitter/jump") It takes hold as the body starts braking (`LocoIn.motion` 'stop'), on the gait's mix from before the
   * brake: held from under 0.4 m/s, the braking blend had already turned a jog into a walk in two or three frames.
   */
  private stopHold(i: LocoIn, set: LocoSet, dt: number, cps: number): number {
    const s = i.speed > 0 ? i.speed : 0;
    const aim = i.aim ?? 0;
    const braking = i.motion === 'stop';
    if (s >= HOLD_FULL && !braking) {
      this.stopW.set(this.clipW);
      this.stopCrouch = i.crouch;
      this.stopAim = aim;
      this.stopSet = set;
      this.stopHad = true;
      this.stopOn = false;
      this.stopV = s;
      this.stopCps = cps;
      const si = this.stopIn;
      si.localX = i.localX;
      si.localZ = i.localZ;
      si.crouch = i.crouch;
      si.aim = aim;
    } else if (!this.stopOn && this.stopHad && (braking || s < this.prevSpeed)) {
      this.stopOn = true;
      this.stopT = 0;
      this.stopMin = s;
      this.stopMoveT = 0;
      this.holdW = 1;
      // (walk-test round 2) from a jog the clock runs down and the pose eases into the walk's stride at the same heading
      this.stopEase = STOP_EASE * Math.min(1, Math.max(0, (this.stopV - STOP_WALK) / (STOP_JOG - STOP_WALK)));
      if (this.stopEase > 0) {
        this.stopIn.speed = Math.min(this.stopV, MOVEMENT.walkSpeed);
        this.mixInto(this.stopIn, this.stopWalkW);
      }
    }
    if (this.stopOn) {
      this.stopT += dt;
      // (the speed changes in the game's fixed steps: frames between them read level, so "not slowing" is not a let-go)
      this.stopMin = Math.min(this.stopMin, s);
      // (walk-test round 2) braking is not moving on
      this.stopMoveT = s > HOLD_STILL && !braking ? this.stopMoveT + dt : 0;
      const off = s > this.stopMin + HOLD_SPEEDUP || this.stopMoveT > HOLD_SLOW;
      if (off || set !== this.stopSet || Math.abs(i.crouch - this.stopCrouch) > 0.3 || Math.abs(aim - this.stopAim) > 0.3) {
        this.stopOn = false;
        this.stopHad = false;
      }
    }
    this.prevSpeed = s;
    const goal = this.stopOn && this.stopT < HOLD_STOP ? 1 : 0;
    if (goal >= this.holdW) this.holdW = goal;
    else this.holdW = Math.max(goal, this.holdW - (dt > 0 ? dt / (this.stopOn ? HOLD_SETTLE : HOLD_LEAVE) : 1));
    if (this.stopOn && this.holdW <= 0) {
      this.stopOn = false;
      this.stopHad = false;
    }
    return this.holdW;
  }

  /** (walk-test fix A) A grip climb's clock: it plays while the body moves; stopped, it runs on to its next grip and
   *  holds there (pinned like a timed action) until the body moves again. */
  private gripStep(a: AnimationGroup, speed: number): void {
    const grips = GRIPS[this.actName];
    const len = a.to - a.from;
    if (!grips || len <= 0) {
      a.speedRatio = 1;
      return;
    }
    const moving = speed > GRIP_MOVE;
    if (moving) this.gripHeld = false;
    if (this.gripHeld) {
      a.speedRatio = PIN_RATE;
      a.goToFrame(this.gripFrame);
      return;
    }
    a.speedRatio = 1;
    const fr = a.animatables[0]?.masterFrame ?? a.from;
    const ph = ((((fr - a.from) / len) % 1) + 1) % 1;
    const was = this.gripPh;
    this.gripPh = ph;
    if (moving) return;
    for (const g of grips) {
      // the clock passed grip g since last frame (or, just started, sits on it)
      const hit = Number.isNaN(was) ? Math.abs(ph - g) < 0.03 : was <= ph ? was < g && g <= ph : g > was || g <= ph;
      if (!hit) continue;
      this.gripHeld = true;
      this.gripFrame = a.from + g * len;
      a.speedRatio = PIN_RATE;
      a.goToFrame(this.gripFrame);
      return;
    }
  }

  /**
   * (slice g) Rig hand nodes (the wrists) the body's hands are pinned to while an anchored action plays (hang, shimmy,
   * ladder, early climb-up): the whole body shifts up or down so its hands' midpoint meets theirs in height (the rig's hands are on the lip /
   * rungs; a Mixamo clip's own hands are wherever its take had them).
   */
  /** (slice i) The rig node that tumbles the body (its `body`, about the hips): the Mixamo body turns with it while an
   *  action asks (`ActionOut.turn`: legs up / inverted on a pipe). */
  tumbleWith(node: TransformNode): void {
    this.tumbleNode = node;
  }

  /** (slice i) Turns the body about the rig's tumble pivot as the rig's body node is turned, or back upright. */
  private turnBody(): void {
    const n = this.tumbleNode;
    if (!n || (!this.turnOn && !this.turned)) return;
    const q = this.root.rotationQuaternion ?? (this.root.rotationQuaternion = new Quaternion());
    if (!this.turnOn || !n.rotationQuaternion) {
      q.copyFromFloats(0, 0, 0, 1);
      this.root.position.set(0, this.baseY, 0);
      this.turned = false;
      this.root.computeWorldMatrix(true);
      return;
    }
    // the root (at the feet) turned about the pivot P (the rig body node's spot): P + R (root - P)
    const P = n.position;
    q.copyFrom(n.rotationQuaternion);
    vT2.set(-P.x, this.baseY - P.y, -P.z);
    vT2.rotateByQuaternionToRef(q, vS);
    this.root.position.set(P.x + vS.x, P.y + vS.y, P.z + vS.z);
    this.turned = true;
    this.root.computeWorldMatrix(true);
  }

  anchorHands(left: TransformNode, right: TransformNode): void {
    this.anchors = { l: left, r: right };
  }

  private anchorBody(): void {
    const a = this.anchors;
    const w = this.anchorW;
    if (!a || (w <= 1e-3 && !this.anchored)) return;
    this.root.position.x = 0;
    this.root.position.z = 0;
    this.root.position.y = this.baseY;
    this.anchored = w > 1e-3;
    if (!this.anchored) return;
    for (let p: TransformNode | null = this.root; p; p = p.parent instanceof TransformNode ? p.parent : null) p.computeWorldMatrix(true);
    const L = this.hands[0], R = this.hands[1];
    if (!L || !R) return;
    if (this.handChain.length === 0) this.handChain = [...chainBelow(L, this.root), L, R];
    if (this.anchorChain.length === 0) this.anchorChain = [...chainBelow(a.l, this.rigRoot ?? this.root), a.l, a.r];
    for (const n of this.handChain) n.computeWorldMatrix(true);
    for (const n of this.anchorChain) n.computeWorldMatrix(true);
    const ml = L.getAbsolutePosition(), mr = R.getAbsolutePosition();
    const rl = a.l.getAbsolutePosition(), rrp = a.r.getAbsolutePosition();
    // the height gap (rig hands' midpoint - body hands' midpoint), into the parent's frame, weighted; height only: the
    // rig's hands rest on top of the lip, inside the wall's footprint, and the body keeps its own distance from the wall
    vT2.set(0, (rl.y + rrp.y - ml.y - mr.y) * 0.5 * w, 0);
    (this.root.parent as TransformNode).getWorldMatrix().invertToRef(mA);
    Vector3.TransformNormalToRef(vT2, mA, vS);
    this.root.position.addInPlace(vS);
    this.root.computeWorldMatrix(true);
  }

  /** The weight each clip plays at now, by name (tests and the e2e read it; an action's weight beside the locomotion's). */
  weights(): Record<string, number> {
    const out: Record<string, number> = {};
    const keep = 1 - this.actW;
    // (walk-test fix A2) with the stop hold's share
    const h = this.opts.holdStop ? this.holdW : 0;
    for (let ci = 0; ci < this.clips.length; ci++) out[this.clips[ci]!.g.name.split(':').pop() ?? ''] = ((this.clipW[ci] as number) * (1 - h) + (this.heldW[ci] as number) * h) * keep;
    if (this.act) out[this.act.name.split(':').pop() ?? ''] = this.actW;
    // (walk-test fix B2) the upper clip beside them (it plays over the upper body only)
    if (this.upW > 0) out[this.upName] = this.upW;
    return out;
  }

  /** The first mesh (an owner's visibility checks watch it), or null before the model is in. */
  get firstMesh(): AbstractMesh | null {
    return this.meshes[0] ?? null;
  }

  setEnabled(on: boolean): void {
    this.root.setEnabled(on);
  }

  dispose(): void {
    this.disposed = true;
    if (this.followObs) this.scene.onAfterAnimationsObservable.remove(this.followObs);
    for (const g of this.groups) g.dispose();
    this.root.dispose(false, true);
  }
}
