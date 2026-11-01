/**
 * (anim-tuner) Live animation tuning table (pure, Babylon-free, no DOM): a dev aid behind the F3 overlay so Michael can
 * fix crab-looking animation while moving. Every tunable is a multiplier (default 1) or an offset (default 0) on a value
 * that already exists in code, per state group (walk, crouch walk, back to wall, ladder, ...) and, for the gun hold, per
 * weapon x state (rifle / pistol x low ready / aim / crouched aim).
 *
 * Hot paths read plain preallocated objects: `TUNE_CUR.<field>` (the local player's active group, copied in by
 * `tuneBegin` around the local player's `rig.animate`, identity at every other time, so guards, remote copies and every
 * other rig are untouched), or `TUNE_LOCAL.<field>` (the local player's last selected values, for code that runs outside
 * that window: the wall push, the root offset, the motion driver's stride). No Map lookups, closures or allocation on
 * those paths. A transition between groups may pop: it is a dev aid. The values never go on the wire.
 *
 * The panel (`ui/animTunePanel.ts`) edits the table, saves it to its own IndexedDB store (`save/animTuneStore.ts`) and
 * exports the changed values with a timestamped change log (`tuneExport`).
 *
 * (tuner-camera) A third set, the follow camera per camera state (`CAM_GROUPS`): offsets and multipliers on the values
 * in `config/camera.ts`, read by `player/shoulderCamera.ts` through `TUNE_CAM_CUR` (the current camera group's values,
 * eased in by `tuneCamStep` once per render frame). Visual only: the collision still applies after them.
 */
import { CH } from './pose';
import { ANIM_BASE } from './animBase';
import { ATTACH_FRAMING, CAMERA, WALL_CAMERA } from '../config/camera';
import { registerTuneSection, TUNE_STATE_BAG, tuneSectionEase } from './tuneRegistry';
import { copyPlaying, NOW_PLAYING, type GraphPlaying } from './nowPlaying'; // (tuner-clarity S1)

export const BODY_GROUPS = [
  'idle',
  'walk',
  'jog',
  'run',
  'crouchIdle',
  'sneak',
  'crouchWalk',
  'lowReady',
  'aim',
  'aimCrouch',
  'wallIdle',
  'wallSlide',
  'wallPeek',
  'ladder',
  'pipe',
  'ledge',
  'vent',
  'crawl',
  'hang',
  'hold',
  // (marlow-bays T1a, COVERAGE gap 3) states that shared a row get their own (tuneRows.ts migrates old saves)
  'crouchRun',
  'aimStill',
  'aimCrouchMove',
  'wallCrouchIdle',
  'wallCrouchSlide',
  'wallCrouchPeek',
  'carry',
] as const;
export type BodyGroup = (typeof BODY_GROUPS)[number];

export const GUN_GROUPS = ['rifle.lowReady', 'rifle.aim', 'rifle.aimCrouch', 'pistol.lowReady', 'pistol.aim', 'pistol.aimCrouch'] as const;
export type GunGroup = (typeof GUN_GROUPS)[number];
/** (tuner-camera) The camera states (`selectCamGroup`). */
export const CAM_GROUPS = [
  'cam.explore',
  'cam.exploreCrouch',
  'cam.lowReady',
  'cam.aimRifle',
  'cam.aimPistol',
  'cam.wall',
  'cam.peek',
  'cam.climb',
  'cam.vent',
  'cam.hold',
] as const;
export type CamGroup = (typeof CAM_GROUPS)[number];
export type TuneGroup = BodyGroup | GunGroup | CamGroup;
export const ALL_GROUPS: readonly TuneGroup[] = [...BODY_GROUPS, ...GUN_GROUPS, ...CAM_GROUPS];

export const BODY_FIELDS = [
  'kneeFlexAdd',
  'trunkTwistMul',
  'trackMul',
  'kneeOutMul',
  'kneeLiftMul',
  'strideMul',
  'pelvisYAdd',
  'leanAdd',
  'armSwingMul',
  'armSwingGrow',
  'elbowOutAdd',
  'elbowPoleMul',
  'headTurnMul',
  'peekLeanMul',
  'wallGapAdd',
  'bodyFwdAdd',
  'bodyUpAdd',
  'handUpAdd',
  'handFwdAdd',
  'handOutAdd',
  'footUpAdd',
  'footFwdAdd',
  'footOutAdd',
  'guardGapAdd',
  'guardSideAdd',
] as const;
export type BodyField = (typeof BODY_FIELDS)[number];

export const GUN_FIELDS = ['gunFwd', 'gunUp', 'gunSide', 'gunPitch', 'gunYaw', 'gunCant', 'sightYAdd', 'headDropMul', 'tuckMul', 'glideTwistMul', 'recoilMul', 'swapDropMul'] as const;
export type GunField = (typeof GUN_FIELDS)[number];
export const CAM_FIELDS = ['camBoomAdd', 'camHeightAdd', 'camSideAdd', 'camPivotAdd', 'camFovAdd', 'camZoomMul', 'camBlendMul', 'camFollowMul', 'camBoomRateMul', 'camPadAdd'] as const;
export type CamField = (typeof CAM_FIELDS)[number];
export type TuneField = BodyField | GunField | CamField;
export type CamValues = Record<CamField, number>;

export type BodyValues = Record<BodyField, number>;
export type GunValues = Record<GunField, number>;
/** The active values: body and gun fields plus `armSwingK` (derived each frame: armSwingMul + armSwingGrow x speed). */
export type CurValues = BodyValues & GunValues & { armSwingK: number };

export interface Tunable {
  id: TuneField;
  label: string;
  kind: 'mul' | 'add';
  def: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  groups: readonly TuneGroup[];
  /** What code value it scales or offsets (for the report and the panel tooltip). */
  hook: string;
}

// (T1a) the new rows sit beside the rows they shared (aimCrouch is the still crouched aim now, aimCrouchMove the moving)
const FOOT: readonly BodyGroup[] = ['idle', 'walk', 'jog', 'run', 'crouchIdle', 'sneak', 'crouchWalk', 'crouchRun', 'lowReady', 'aimStill', 'aim', 'aimCrouch', 'aimCrouchMove', 'wallIdle', 'wallSlide', 'wallPeek', 'wallCrouchIdle', 'wallCrouchSlide', 'wallCrouchPeek', 'hold', 'carry'];
const MOVING: readonly BodyGroup[] = ['walk', 'jog', 'run', 'sneak', 'crouchWalk', 'crouchRun', 'aim', 'aimCrouch', 'aimCrouchMove', 'wallSlide', 'wallCrouchSlide', 'hold', 'carry'];
const SWING: readonly BodyGroup[] = ['walk', 'jog', 'run', 'sneak', 'crouchWalk', 'crouchRun'];
const KEYED: readonly BodyGroup[] = ['idle', 'walk', 'jog', 'run'];
const WALL: readonly BodyGroup[] = ['wallIdle', 'wallSlide', 'wallPeek', 'wallCrouchIdle', 'wallCrouchSlide', 'wallCrouchPeek'];
const HOLDS: readonly BodyGroup[] = ['hold', 'carry'];
const ATTACHED: readonly BodyGroup[] = ['ladder', 'pipe', 'ledge', 'vent', 'crawl', 'hang'];
const ALL_BODY: readonly BodyGroup[] = BODY_GROUPS;
const ALL_GUN: readonly GunGroup[] = GUN_GROUPS;
const AIM_GUN: readonly GunGroup[] = ['rifle.aim', 'rifle.aimCrouch', 'pistol.aim', 'pistol.aimCrouch'];
const ALL_CAM: readonly CamGroup[] = CAM_GROUPS;
const CAM_AIM: readonly CamGroup[] = ['cam.aimRifle', 'cam.aimPistol'];
/** Every camera state with a blend of its own (the hold uses the explore camera's). */
const CAM_BLEND: readonly CamGroup[] = CAM_GROUPS.filter((g) => g !== 'cam.hold');

/** The registry: every slider. Defaults are identity (mul 1, add 0): nothing changes until a slider moves. */
export const TUNABLES: readonly Tunable[] = [
  { id: 'armSwingMul', label: 'arm swing amplitude', kind: 'mul', def: 1, min: 0, max: 2.5, step: 0.05, unit: 'x', groups: SWING, hook: 'keyed.ts sampleKeyed: arm points about the clip mean; animGraph READY_HANDS swingT' },
  { id: 'kneeFlexAdd', label: 'stance knee flex', kind: 'add', def: 0, min: -0.03, max: 0.15, step: 0.002, unit: 'm', groups: ['idle', 'walk', 'jog', 'run'], hook: 'characterRig: the planted leg soft-knee length legLen (SOFT_KNEE_STAND) shortened: the knees bend at contact and in stance' },
  { id: 'trunkTwistMul', label: 'trunk / shoulder counter-rotation', kind: 'mul', def: 1, min: 0, max: 3, step: 0.05, unit: 'x', groups: ['walk', 'jog', 'run'], hook: 'keyed.ts: the keyed spine and chest yaw about the clip mean; animGraph: the gait clip spine yaw (spYaw twist)' },
  { id: 'strideMul', label: 'step length (cadence at the same speed)', kind: 'mul', def: 1, min: 0.6, max: 1.6, step: 0.01, unit: 'x', groups: MOVING, hook: 'motion.ts stepLength (the cadence drops as the step grows; the speed stays)' },
  { id: 'trackMul', label: 'foot width / track', kind: 'mul', def: 1, min: 0.3, max: 2, step: 0.01, unit: 'x', groups: FOOT, hook: 'animGraph writeTargets: the stance half-width `half` (keyed track `half` / hip width)' },
  { id: 'kneeOutMul', label: 'knee out (pole)', kind: 'mul', def: 1, min: 0, max: 3, step: 0.05, unit: 'x', groups: ALL_BODY, hook: 'characterRig: KNEE_OUT / keyed kneeOut (kneeOutNow), climbing CLIMB_KNEE_OUT' },
  { id: 'kneeLiftMul', label: 'knee / foot lift', kind: 'mul', def: 1, min: 0.3, max: 2.5, step: 0.05, unit: 'x', groups: [...MOVING, 'ladder', 'pipe'], hook: 'animGraph: gait liftH; climbing CLIMB_KNEE_UP (characterRig solveLegWorld)' },
  { id: 'pelvisYAdd', label: 'pelvis height / crouch depth', kind: 'add', def: 0, min: -0.25, max: 0.1, step: 0.005, unit: 'm', groups: ALL_BODY, hook: 'animGraph writeTargets: pelvis.y' },
  { id: 'leanAdd', label: 'forward lean', kind: 'add', def: 0, min: -0.4, max: 0.4, step: 0.01, unit: 'rad', groups: ALL_BODY, hook: 'animGraph writeTargets: spine.pitch; keyed clips: the keyed spine (keyed.ts sampleKeyed)' },
  { id: 'armSwingGrow', label: 'arm swing growth / speed', kind: 'add', def: 0, min: -0.5, max: 0.5, step: 0.01, unit: 'x per m/s', groups: SWING, hook: 'adds to the arm swing multiplier per m/s of speed' },
  { id: 'elbowOutAdd', label: 'elbow out (keyed arms)', kind: 'add', def: 0, min: -0.1, max: 0.15, step: 0.005, unit: 'm', groups: KEYED, hook: 'characterRig keyedArm: the keyed elbow point x' },
  { id: 'elbowPoleMul', label: 'elbow out (IK pole)', kind: 'mul', def: 1, min: 0, max: 2.5, step: 0.05, unit: 'x', groups: ALL_BODY, hook: 'characterRig solveArm: the elbow pole outward share ELBOW_POLE_OUT (0.55)' },
  { id: 'headTurnMul', label: 'head turn', kind: 'mul', def: 1, min: 0, max: 2, step: 0.05, unit: 'x', groups: ALL_BODY, hook: 'RigPose.lookYaw (the head glance / wall head turn)' },
  { id: 'peekLeanMul', label: 'peek lean', kind: 'mul', def: 1, min: 0, max: 2.5, step: 0.05, unit: 'x', groups: ['wallPeek', 'wallCrouchPeek'], hook: 'RigPose.lean (WALL.peekLean on the rig)' },
  { id: 'wallGapAdd', label: 'gap to wall', kind: 'add', def: 0, min: -0.1, max: 0.15, step: 0.005, unit: 'm', groups: WALL, hook: 'player.ts: wallRootPush (the rig root pushed onto the face)' },
  { id: 'bodyFwdAdd', label: 'body fwd (to wall / pipe / guard)', kind: 'add', def: 0, min: -0.25, max: 0.25, step: 0.005, unit: 'm', groups: [...ATTACHED, ...HOLDS], hook: 'player.ts: the rig root along the facing (visual only)' },
  { id: 'bodyUpAdd', label: 'body up', kind: 'add', def: 0, min: -0.25, max: 0.25, step: 0.005, unit: 'm', groups: ATTACHED, hook: 'player.ts: the rig root height (visual only)' },
  { id: 'handUpAdd', label: 'hand reach up', kind: 'add', def: 0, min: -0.2, max: 0.2, step: 0.005, unit: 'm', groups: [...ATTACHED, ...HOLDS], hook: 'rig.reachL / reachR world grip targets (rungs, pipe, lip, hold hands)' },
  { id: 'handFwdAdd', label: 'hand reach fwd', kind: 'add', def: 0, min: -0.2, max: 0.2, step: 0.005, unit: 'm', groups: [...ATTACHED, ...HOLDS], hook: 'rig.reachL / reachR along the facing' },
  { id: 'handOutAdd', label: 'hand spacing (out)', kind: 'add', def: 0, min: -0.2, max: 0.2, step: 0.005, unit: 'm', groups: [...ATTACHED, ...HOLDS], hook: 'rig.reachL / reachR outward (the shimmy hand spacing)' },
  { id: 'footUpAdd', label: 'foot reach up', kind: 'add', def: 0, min: -0.2, max: 0.2, step: 0.005, unit: 'm', groups: ATTACHED, hook: 'rig.plantL / plantR (rungs, wall pads)' },
  { id: 'footFwdAdd', label: 'foot reach fwd', kind: 'add', def: 0, min: -0.2, max: 0.2, step: 0.005, unit: 'm', groups: ATTACHED, hook: 'rig.plantL / plantR along the facing' },
  { id: 'footOutAdd', label: 'foot spacing (out)', kind: 'add', def: 0, min: -0.2, max: 0.2, step: 0.005, unit: 'm', groups: ATTACHED, hook: 'rig.plantL / plantR outward' },
  { id: 'guardGapAdd', label: 'gap to guard (visual)', kind: 'add', def: 0, min: -0.15, max: 0.25, step: 0.005, unit: 'm', groups: ['hold'], hook: 'player.ts tuneRoot: her rig root back along her facing (+ = more gap); GRAB.hold and the guard stay put' },
  { id: 'guardSideAdd', label: 'guard side offset (visual)', kind: 'add', def: 0, min: -0.2, max: 0.2, step: 0.005, unit: 'm', groups: ['hold'], hook: 'player.ts tuneRoot: her rig root the other way (+ = the guard further to her right); GRAB.side stays' },
  { id: 'gunFwd', label: 'gun fwd / stock depth', kind: 'add', def: 0, min: -0.2, max: 0.2, step: 0.005, unit: 'm', groups: ALL_GUN, hook: 'characterRig: weaponPivot z (AIM_POCKET.z + pose)' },
  { id: 'gunUp', label: 'gun up (low ready; aimed the sight is held at the eye)', kind: 'add', def: 0, min: -0.2, max: 0.2, step: 0.005, unit: 'm', groups: ALL_GUN, hook: 'characterRig: weaponPivot y' },
  { id: 'gunSide', label: 'gun side (out)', kind: 'add', def: 0, min: -0.2, max: 0.2, step: 0.005, unit: 'm', groups: ALL_GUN, hook: 'characterRig: weaponPivot x (mirrored with the hand)' },
  { id: 'gunPitch', label: 'muzzle pitch (+ down)', kind: 'add', def: 0, min: -0.8, max: 0.8, step: 0.01, unit: 'rad', groups: ALL_GUN, hook: 'characterRig: the weapon pitch' },
  { id: 'gunYaw', label: 'muzzle yaw (+ out)', kind: 'add', def: 0, min: -0.5, max: 0.5, step: 0.01, unit: 'rad', groups: ALL_GUN, hook: 'characterRig: the weapon yaw (mirrored)' },
  { id: 'gunCant', label: 'cant (roll)', kind: 'add', def: 0, min: -0.8, max: 0.8, step: 0.01, unit: 'rad', groups: ALL_GUN, hook: 'characterRig: the weapon roll (mirrored)' },
  { id: 'sightYAdd', label: 'sight height vs eye', kind: 'add', def: 0, min: -0.1, max: 0.1, step: 0.002, unit: 'm', groups: AIM_GUN, hook: 'characterRig sightToEye: SIGHT_EYE' },
  { id: 'headDropMul', label: 'head drop to sights', kind: 'mul', def: 1, min: 0, max: 3, step: 0.05, unit: 'x', groups: AIM_GUN, hook: 'characterRig: NECK_WELD (the neck flexes onto the stock)' },
  { id: 'tuckMul', label: 'elbow tuck (aim / low ready)', kind: 'mul', def: 1, min: 0, max: 1.6, step: 0.05, unit: 'x', groups: ALL_GUN, hook: 'characterRig solveArm: AIM_ELBOW_TUCK / READY_ELBOW_TUCK x WREN_TUCK (per gun state)' },
  { id: 'glideTwistMul', label: 'glide hip twist cut', kind: 'mul', def: 1, min: 0, max: 1.5, step: 0.05, unit: 'x', groups: AIM_GUN, hook: 'animGraph: GLIDE.yawCut (aimed glide: the hips twist less)' },
  // (anim-n3b, PASS2 row 25) the per-shot body kick (gun back and up, muzzle rise, chest give); visual only
  { id: 'recoilMul', label: 'recoil kick per shot (gun, hands, chest)', kind: 'mul', def: 1, min: 0, max: 3, step: 0.05, unit: 'x', groups: AIM_GUN, hook: 'recoil.ts BodyRecoil: WREN_RECOIL_RIFLE / WREN_RECOIL_PISTOL amounts' },
  // (anim-n4c, AUDIT row 29) changing hands aimed (the shoulder swap): how far the gun drops and comes forward mid-swap
  { id: 'swapDropMul', label: 'hand swap drop (gun under the chin mid-swap)', kind: 'mul', def: 1, min: 0, max: 2, step: 0.05, unit: 'x', groups: AIM_GUN, hook: 'handSwapPath.ts HAND_SWAP.drop / fwd (characterRig aim pocket)' },
  // (tuner-camera) the follow camera per state: visual only, the collision still applies after them
  { id: 'camBoomAdd', label: 'distance behind', kind: 'add', def: 0, min: -2, max: 3, step: 0.01, unit: 'm', groups: ALL_CAM, hook: 'shoulderCamera.update: the framing boom (framing() / ATTACH_FRAMING / WALL_CAMERA.peek.boom), before the min boom and the casts' },
  { id: 'camHeightAdd', label: 'height (over the look-at)', kind: 'add', def: 0, min: -1, max: 1.5, step: 0.01, unit: 'm', groups: ALL_CAM, hook: 'shoulderCamera.update: CAMERA.height (the shoulder point over the pivot)' },
  { id: 'camSideAdd', label: 'shoulder side offset', kind: 'add', def: 0, min: -0.6, max: 0.8, step: 0.005, unit: 'm', groups: ALL_CAM, hook: 'shoulderCamera.update: the framing shoulder (CAMERA.shoulderHip / shoulderAds, the preset shoulder, WALL_CAMERA.peek.shoulder); mirrors with the shoulder swap' },
  { id: 'camPivotAdd', label: 'look-at height', kind: 'add', def: 0, min: -1, max: 1, step: 0.01, unit: 'm', groups: ALL_CAM, hook: 'shoulderCamera.update: the framing pivot (CAMERA.pivotStand / pivotCrouch / aimEyeDrop / openDrop, the preset pivot)' },
  { id: 'camFovAdd', label: 'FOV (horizontal at 16:9)', kind: 'add', def: 0, min: -40, max: 30, step: 0.5, unit: 'deg', groups: ALL_CAM, hook: 'shoulderCamera.update: baseFovDeg (the video.fovH setting, CAMERA.fov 86)' },
  { id: 'camZoomMul', label: 'aim zoom (FOV at full aim)', kind: 'mul', def: 1, min: 0.3, max: 1.3, step: 0.01, unit: 'x', groups: CAM_AIM, hook: 'shoulderCamera.update: adsZoom (1: no zoom, G29; a marksman scope sets it lower)' },
  { id: 'camBlendMul', label: 'transition blend time', kind: 'mul', def: 1, min: 0.2, max: 4, step: 0.05, unit: 'x', groups: CAM_BLEND, hook: 'shoulderCamera.update: every camera blend while in this state (aim in adsInTime / adsInWall, aim out adsOutRate, open / tight toTight / toOpen, the preset blend, WALL_CAMERA.peek blend / out)' },
  { id: 'camFollowMul', label: 'follow damping (vertical rate)', kind: 'mul', def: 1, min: 0.1, max: 4, step: 0.05, unit: 'x', groups: ALL_CAM, hook: 'shoulderCamera.update: CAMERA.stairRate (the feet height low-pass; XZ is rigid, G159)' },
  { id: 'camBoomRateMul', label: 'boom pull-in / ease-out rate', kind: 'mul', def: 1, min: 0.1, max: 4, step: 0.05, unit: 'x', groups: ALL_CAM, hook: 'shoulderCamera.update: CAMERA.boomIn / boomOut (the cast still clamps the boom the same frame)' },
  { id: 'camPadAdd', label: 'collision pull-in margin', kind: 'add', def: 0, min: -0.04, max: 0.4, step: 0.005, unit: 'm', groups: ALL_CAM, hook: 'shoulderCamera.update: CAMERA.castPad (the gap kept after a sphere hit; never below 0)' },
];

const n2 = (v: number): string => String(Number(v.toFixed(2)));
const AF = ATTACH_FRAMING;
const PK = WALL_CAMERA.peek;
const CAM_COMMON: Partial<Record<CamField, string>> = {
  camHeightAdd: `${CAMERA.height} m`,
  camFovAdd: `${CAMERA.fov} deg (setting video.fovH)`,
  camFollowMul: `stairRate ${CAMERA.stairRate} 1/s (XZ rigid)`,
  camBoomRateMul: `in ${CAMERA.boomIn} / out ${CAMERA.boomOut} 1/s`,
  camPadAdd: `castPad ${CAMERA.castPad} m (sphere ${CAMERA.castRadius})`,
};
function exploreToday(crouch: boolean): Partial<Record<CamField, string>> {
  const pv = crouch ? CAMERA.pivotCrouch : CAMERA.pivotStand;
  return {
    ...CAM_COMMON,
    camBoomAdd: `${CAMERA.boomHip} tight / ${crouch ? CAMERA.boomCrouchOpen : CAMERA.boomOpen} open m`,
    camSideAdd: `${CAMERA.shoulderHip} m`,
    camPivotAdd: `${n2(pv)} m (open ${n2(pv - CAMERA.openDrop)})`,
    camBlendMul: `space toTight ${CAMERA.toTight} / toOpen ${CAMERA.toOpen} 1/s`,
  };
}
const AIM_TODAY: Partial<Record<CamField, string>> = {
  ...CAM_COMMON,
  camBoomAdd: `${CAMERA.boomAds} m`,
  camSideAdd: `${CAMERA.shoulderAds} m`,
  camPivotAdd: `${n2(CAMERA.pivotStand - CAMERA.aimEyeDrop)} m (head top - ${CAMERA.aimEyeDrop})`,
  camZoomMul: 'x1 (no zoom, G29)',
  camBlendMul: `adsInTime ${CAMERA.adsInTime} s (the weapon sets it), off a wall ${CAMERA.adsInWall} s`,
};
interface PresetLike {
  boom: number;
  shoulder: number;
  pivot: number;
  blend: number;
}
function presetToday(names: string, ...ps: PresetLike[]): Partial<Record<CamField, string>> {
  const join = (f: (p: PresetLike) => number): string => ps.map(f).join(' / ');
  const pre = names ? `${names}: ` : '';
  return {
    ...CAM_COMMON,
    camBoomAdd: `${pre}${join((p) => p.boom)} m`,
    camSideAdd: `${pre}${join((p) => p.shoulder)} m`,
    camPivotAdd: `${pre}${join((p) => p.pivot)} m`,
    camBlendMul: `${pre}${join((p) => p.blend)} s`,
  };
}
const HOLD_TODAY = exploreToday(false);
delete HOLD_TODAY.camBlendMul;

/** (tuner-camera) The value the game uses today under each camera slider (from `config/camera.ts`; text only). */
export const CAM_TODAY: Record<CamGroup, Partial<Record<CamField, string>>> = {
  'cam.explore': exploreToday(false),
  'cam.exploreCrouch': exploreToday(true),
  'cam.lowReady': { ...exploreToday(false), camBlendMul: `aim out adsOutRate ${CAMERA.adsOutRate} 1/s` },
  'cam.aimRifle': AIM_TODAY,
  'cam.aimPistol': AIM_TODAY,
  'cam.wall': presetToday('', AF.wall),
  'cam.peek': {
    ...CAM_COMMON,
    camBoomAdd: `${PK.boom} m (at full peek)`,
    camSideAdd: `${PK.shoulder} m (at full peek)`,
    camPivotAdd: `${AF.wall.pivot} m (+${PK.offset} m out to the edge)`,
    camBlendMul: `in ${PK.blend} / out ${PK.out} s`,
  },
  'cam.climb': presetToday('hang / ladder / pipe', AF.hang, AF.ladder, AF.pipe),
  'cam.vent': presetToday('', AF.duct),
  'cam.hold': HOLD_TODAY,
};

/** The game's value today under a camera slider, or ''. */
export function tuneToday(group: TuneGroup, id: TuneField): string {
  return (CAM_TODAY as Partial<Record<string, Partial<Record<string, string>>>>)[group]?.[id] ?? '';
}

/**
 * (pass 3) Real-world targets shown under the matching sliders (walk / jog / run; CT Core's reference numbers), so the
 * tuning has somewhere to aim. Text only: no default follows them (every default stays identity).
 */
export const TUNE_HINTS: Partial<Record<BodyGroup, Partial<Record<TuneField, string>>>> = {
  walk: {
    armSwingMul: 'target at 1.4 m/s: shoulder swing +15/-18 deg, elbow 20-40 deg',
    kneeFlexAdd: 'target at 1.4 m/s: stance knee (loading) 15-18 deg',
    kneeLiftMul: 'target at 1.4 m/s: swing knee peak ~60 deg',
    trunkTwistMul: 'target at 1.4 m/s: pelvis yaw / thorax counter-rotation ±4/∓3 deg',
    pelvisYAdd: 'target at 1.4 m/s: vertical bob 3.5-4 cm',
    strideMul: 'target at 1.4 m/s: step 0.72 m at 115/min'
  },
  jog: {
    armSwingMul: 'target at 3.0 m/s: shoulder swing +25/-35 deg, elbow 75-95 deg',
    kneeFlexAdd: 'target at 3.0 m/s: stance knee (loading) 35-40 deg',
    kneeLiftMul: 'target at 3.0 m/s: swing knee peak ~95 deg',
    trunkTwistMul: 'target at 3.0 m/s: pelvis yaw / thorax counter-rotation ±6/∓4 deg',
    pelvisYAdd: 'target at 3.0 m/s: vertical bob 6-8 cm',
    strideMul: 'target at 3.0 m/s: step 1.10 m at 165/min'
  },
  run: {
    armSwingMul: 'target at 4.0 m/s: shoulder swing +35/-45 deg, elbow 80-100 deg',
    kneeFlexAdd: 'target at 4.0 m/s: stance knee (loading) 40-45 deg',
    kneeLiftMul: 'target at 4.0 m/s: swing knee peak ~115 deg',
    trunkTwistMul: 'target at 4.0 m/s: pelvis yaw / thorax counter-rotation ±7/∓5 deg',
    pelvisYAdd: 'target at 4.0 m/s: vertical bob 7-9 cm',
    strideMul: 'target at 4.0 m/s: step 1.35 m at 178/min'
  }
};

/** The target hint for a slider of a group, or ''. */
export function tuneHint(group: TuneGroup, id: TuneField): string {
  return (TUNE_HINTS as Partial<Record<string, Partial<Record<TuneField, string>>>>)[group]?.[id] ?? '';
}

const TUNABLE_BY_ID = new Map<TuneField, Tunable>(TUNABLES.map((t) => [t.id, t]));

/** A built-in slider by id (Body, Gun and Camera ids are unique across the three). */
export function tunable(id: TuneField): Tunable {
  return TUNABLE_BY_ID.get(id)!;
}

export function isGunGroup(g: string): g is GunGroup {
  return (GUN_GROUPS as readonly string[]).includes(g);
}

export function isCamGroup(g: string): g is CamGroup {
  return (CAM_GROUPS as readonly string[]).includes(g);
}

function defCur(): CurValues {
  const o = { armSwingK: 1 } as CurValues;
  for (const f of BODY_FIELDS) o[f] = tunable(f).def;
  for (const f of GUN_FIELDS) o[f] = tunable(f).def;
  return o;
}

/** The identity values (never written). */
export const TUNE_IDENTITY: Readonly<CurValues> = Object.freeze(defCur());
/** The active values the rig and graph read: the local player's group inside `tuneBegin` .. `tuneEnd`, else identity. */
export const TUNE_CUR: CurValues = defCur();
/** The local player's last selected values (kept after `tuneEnd`): for code outside the animate window. */
export const TUNE_LOCAL: CurValues = defCur();
/** What the local player is doing now (the panel's auto-follow); '' = no group (a vault, a ladder top-out, ...). The
 *  registry's state bag (a new section may add its own key). */
export const TUNE_STATE = TUNE_STATE_BAG as { body: BodyGroup | ''; gun: GunGroup | ''; cam: CamGroup | '' } & Record<string, string>;
/**
 * (marlow-bays item 29, tuner v3: "with Keyed ticked the Body sliders do nothing") The body state the local player's rig
 * tunes with, pinned ('' none: chosen from the pose by `selectBodyGroup`). The Test Chamber pins a keyed clip's own state
 * while it plays: a clip on the spot has no speed, so the pose alone picked `idle` and the jog's sliders never reached
 * the keyed jog (nor her Joints, Hands & feet and Limb reach rows: `tuneJointsRig` reads the pin too). Only `rig` (her
 * rig) is pinned. Written by the chamber stage only (cleared when it leaves).
 */
export const TUNE_PIN: { body: BodyGroup | ''; rig: unknown } = { body: '', rig: null };

/** The body state for a rig's pose: the pin for the pinned rig, else `selectBodyGroup`. */
export function tuneBodyGroup(p: TunePoseIn, ledge: boolean, armed: boolean, rig: unknown): BodyGroup | null {
  return TUNE_PIN.body !== '' && rig === TUNE_PIN.rig ? TUNE_PIN.body : selectBodyGroup(p, ledge, armed);
}

const inSection = (groups: readonly string[]): Tunable[] => TUNABLES.filter((t) => t.groups.every((g) => groups.includes(g)));
const EMPTY: readonly string[] = [];

/** (pass 2) The Body and Gun sections' ease on a state change (s). */
export const BODY_TAU = 0.1;

/** (tuner-camera) The three built-in sections, in panel order: Body, Gun, Camera (`tuneRegistry.ts`). */
export const BODY_SECTION = registerTuneSection<BodyValues>({
  id: 'body',
  label: 'Body state',
  // (pass 2) a state change eases in (0.1 s) instead of popping
  tau: BODY_TAU,
  groups: BODY_GROUPS,
  tunables: inSection(BODY_GROUPS),
  select: (s) => s.body || null,
  notes: (g, id) => {
    const h = tuneHint(g as TuneGroup, id as TuneField);
    return h ? [h] : EMPTY;
  },
});
export const GUN_SECTION = registerTuneSection<GunValues>({
  id: 'gun',
  label: 'Gun hold (weapon x state)',
  tau: BODY_TAU,
  groups: GUN_GROUPS,
  tunables: inSection(GUN_GROUPS),
  select: (s) => s.gun || null,
});
export const CAM_SECTION = registerTuneSection<CamValues>({
  id: 'cam',
  label: 'Camera (state)',
  tau: 1 / 8,
  groups: CAM_GROUPS,
  tunables: inSection(CAM_GROUPS),
  select: (s) => s.cam || null,
  notes: (g, id) => {
    const t = tuneToday(g as TuneGroup, id as TuneField);
    return t ? [`today: ${t}`] : EMPTY;
  },
});

/** The live values per body group (preallocated; the registry's). */
export const TUNE_BODY = BODY_SECTION.values as Record<BodyGroup, BodyValues>;
/** The live values per weapon x state (preallocated). */
export const TUNE_GUN = GUN_SECTION.values as Record<GunGroup, GunValues>;
/** (tuner-camera) The live values per camera state (preallocated). */
export const TUNE_CAM = CAM_SECTION.values as Record<CamGroup, CamValues>;
/** The camera identity values (never written). */
export const TUNE_CAM_IDENTITY: Readonly<CamValues> = CAM_SECTION.identity;
/** The values the follow camera reads: the current camera group's, eased in (`tuneCamStep`); identity at default. */
export const TUNE_CAM_CUR: CamValues = CAM_SECTION.cur;

/** Gait-clip pose channel of the spine yaw (pose.ts CH.spYaw). */
const SP_YAW = CH.spYaw;

/**
 * The trunk counter-rotation on the procedural gait clips' blend (the locomotion pose before it is mixed in): its spine
 * yaw times `TUNE_CUR.trunkTwistMul` (the twist curves swing about 0). Returns the pose. No allocation.
 */
export function tuneMoveTwist<P extends { [i: number]: number }>(pose: P): P {
  const k = TUNE_CUR.trunkTwistMul;
  if (k !== 1) pose[SP_YAW] = pose[SP_YAW]! * k;
  return pose;
}

const BODY_KEYS: readonly BodyField[] = BODY_FIELDS;
const GUN_KEYS: readonly GunField[] = GUN_FIELDS;

// ------------------------------------------------------------------------------------------
// State selection
// ------------------------------------------------------------------------------------------

/** The RigPose fields the selection reads (and the few it scales). */
export interface TunePoseIn {
  speed: number;
  crouch: number;
  aim: number;
  wall?: boolean;
  lean?: number;
  traverse?: string;
  bend?: number;
  bendDrop?: number;
  weight?: number;
  lookYaw?: number;
  /** (T1a) A body lifted, carried or put down (not a held guard): the bend selects `carry`, else `hold`. */
  carryBody?: boolean;
  /** (anim-bake-targets) False in the air off a traversal (a fall, a jump): no group, so a landing roll starts untuned. */
  grounded?: boolean;
}

/** Speed bands (m/s), the same as the F3 crab readout's gait label; (T1a) `crouchRun` from the crouch's 4th gear down. */
export const TUNE_BANDS = { idle: 0.15, walk: 2.2, jog: 3.7, sneak: 1.2, crouchRun: 2.0 } as const;

/** The body group for a pose (`ledge`: the hands hook a lip; `armed`: a weapon in hand). Null: no group (identity). */
export function selectBodyGroup(p: TunePoseIn, ledge: boolean, armed: boolean): BodyGroup | null {
  const tr = p.traverse ?? 'none';
  // (N4b train-8 fix) a team holder's brace bends too (clips/team.ts `applyB`: the boost, throw, hang-down and rope
  // holder, traverse 'brace'): not a hold or a carry, so no hold rows and no hold camera on it (as animGraph's `cqOn`);
  // the brace has no group of its own (null, as before the team pose)
  if (((p.bend ?? 0) > 0 || (p.bendDrop ?? 0) > 0) && tr !== 'brace') return p.carryBody ? 'carry' : 'hold';
  // (anim-bake-targets) in the air (a fall or a jump, speed ~0) the stance rows would read as `idle`: its narrow stance
  // (Michael's trackMul 0.05) carried into the landing roll's first frames (e2e-clip: the feet 2.1 cm apart); the air
  // has no group, so the values ease back to the untuned ones over the fall (BODY_TAU)
  if (p.grounded === false && tr === 'none') return null;
  if (tr !== 'none') {
    switch (tr) {
      case 'climb':
        return 'ladder';
      case 'pipeClimb':
      case 'pipeLegs':
      case 'pipeInv':
        return 'pipe';
      case 'hang':
        return ledge ? 'ledge' : 'hang';
      case 'crawl':
        return 'crawl';
      case 'crawlOut':
      case 'ventDrop':
        return 'vent';
      default:
        return null;
    }
  }
  const s = p.speed;
  const crouched = p.crouch > 0.5;
  const still = s < TUNE_BANDS.idle;
  if (p.wall) {
    if (crouched) return (p.lean ?? 0) !== 0 ? 'wallCrouchPeek' : s > TUNE_BANDS.idle ? 'wallCrouchSlide' : 'wallCrouchIdle';
    return (p.lean ?? 0) !== 0 ? 'wallPeek' : s > TUNE_BANDS.idle ? 'wallSlide' : 'wallIdle';
  }
  // (T1a) aiming still and moving apart: `aim` is the glides, `aimCrouch` the still crouched aim
  if (p.aim > 0.5) return crouched ? (still ? 'aimCrouch' : 'aimCrouchMove') : still ? 'aimStill' : 'aim';
  if (crouched) return still ? 'crouchIdle' : s < TUNE_BANDS.sneak ? 'sneak' : s < TUNE_BANDS.crouchRun ? 'crouchWalk' : 'crouchRun';
  if (armed && s < TUNE_BANDS.idle) return 'lowReady';
  return s < TUNE_BANDS.idle ? 'idle' : s < TUNE_BANDS.walk ? 'walk' : s < TUNE_BANDS.jog ? 'jog' : 'run';
}

/** The gun group: the weapon by its mass (a pistol 0.7, rifles 1) x low ready / aim / crouched aim. Null unarmed. */
export function selectGunGroup(p: TunePoseIn, armed: boolean): GunGroup | null {
  if (!armed) return null;
  const pistol = (p.weight ?? 1) < 0.8;
  if (p.aim > 0.5) {
    if (p.crouch > 0.5) return pistol ? 'pistol.aimCrouch' : 'rifle.aimCrouch';
    return pistol ? 'pistol.aim' : 'rifle.aim';
  }
  return pistol ? 'pistol.lowReady' : 'rifle.lowReady';
}

// ------------------------------------------------------------------------------------------
// The animate window (hot path: no allocation)
// ------------------------------------------------------------------------------------------

/** A world grip target on the rig (characterRig WorldTarget). */
export interface TuneTarget {
  x: number;
  y: number;
  z: number;
  w: number;
  hook?: number;
  cx?: number;
  cy?: number;
  cz?: number;
}

/** The rig fields `tuneBegin` / `tuneEnd` touch. */
export interface TuneRigIn {
  heldWeapon: unknown;
  reachL: TuneTarget;
  reachR: TuneTarget;
  plantL: TuneTarget;
  plantR: TuneTarget;
  root: { rotation: { y: number } };
  /** (tuner-clarity S1) The rig's animation graph: `tuneEnd` copies what it played into NOW_PLAYING (the panel's line). */
  graph?: { readonly playing: Readonly<GraphPlaying> };
}

/** Saved grip targets (x y z cx cy cz) x 4, restored by `tuneEnd`. */
const SAVED_GRIPS = new Float64Array(24);
let shifted = false;

function copyBody(src: BodyValues, dst: CurValues): void {
  for (let i = 0; i < BODY_KEYS.length; i++) {
    const k = BODY_KEYS[i]!;
    dst[k] = src[k];
  }
}
function copyGun(src: Readonly<GunValues>, dst: CurValues): void {
  for (let i = 0; i < GUN_KEYS.length; i++) {
    const k = GUN_KEYS[i]!;
    dst[k] = src[k];
  }
}

function shiftTarget(t: TuneTarget, slot: number, dx: number, dy: number, dz: number, saved: Float64Array = SAVED_GRIPS): void {
  const o = slot * 6;
  saved[o] = t.x;
  saved[o + 1] = t.y;
  saved[o + 2] = t.z;
  saved[o + 3] = t.cx ?? NaN;
  saved[o + 4] = t.cy ?? NaN;
  saved[o + 5] = t.cz ?? NaN;
  t.x += dx;
  t.y += dy;
  t.z += dz;
  if (t.cx !== undefined) t.cx += dx;
  if (t.cy !== undefined) t.cy += dy;
  if (t.cz !== undefined) t.cz += dz;
}

function restoreTarget(t: TuneTarget, slot: number, saved: Float64Array = SAVED_GRIPS): void {
  const o = slot * 6;
  t.x = saved[o]!;
  t.y = saved[o + 1]!;
  t.z = saved[o + 2]!;
  if (t.cx !== undefined && !Number.isNaN(saved[o + 3]!)) t.cx = saved[o + 3]!;
  if (t.cy !== undefined && !Number.isNaN(saved[o + 4]!)) t.cy = saved[o + 4]!;
  if (t.cz !== undefined && !Number.isNaN(saved[o + 5]!)) t.cz = saved[o + 5]!;
}

/**
 * Before the LOCAL player's `rig.animate`: select its groups, ease their values in over `dt` (s; 0 = at once) and load
 * them into `TUNE_CUR` (and `TUNE_LOCAL`),
 * scale the pose's head turn and peek lean, and offset the world grip targets (restored by `tuneEnd`). No allocation.
 */
export function tuneBegin(p: TunePoseIn, rig: TuneRigIn, dt = 0): void {
  const armed = rig.heldWeapon !== null && rig.heldWeapon !== undefined;
  const ledge = rig.reachL.hook === 1 || rig.reachR.hook === 1;
  const bg = tuneBodyGroup(p, ledge, armed, rig);
  const gg = selectGunGroup(p, armed);
  TUNE_OWNER.rig = rig; // (anim-bake-targets) this rig's Body base also lands in TUNE_LOCAL (bodyRigBegin)
  TUNE_STATE.body = bg ?? '';
  TUNE_STATE.gun = gg ?? '';
  const cur = TUNE_CUR;
  // (pass 2) the sections' eased values (`dt` 0: at once; the bypass held: identity)
  tuneSectionEase(BODY_SECTION, bg, dt);
  tuneSectionEase(GUN_SECTION, gg, dt);
  copyBody(BODY_SECTION.cur, cur);
  copyGun(GUN_SECTION.cur, cur);
  cur.armSwingK = Math.max(0, cur.armSwingMul + cur.armSwingGrow * Math.max(0, p.speed));
  copyBody(cur, TUNE_LOCAL);
  copyGun(cur, TUNE_LOCAL);
  TUNE_LOCAL.armSwingK = cur.armSwingK;
  if (p.lookYaw !== undefined) p.lookYaw *= cur.headTurnMul;
  if (p.lean !== undefined && p.lean !== 0) p.lean = Math.max(-1.5, Math.min(1.5, p.lean * cur.peekLeanMul));
  // grip targets: hands and feet in the body frame (x right, z forward)
  const hu = cur.handUpAdd;
  const hf = cur.handFwdAdd;
  const ho = cur.handOutAdd;
  const fu = cur.footUpAdd;
  const ff = cur.footFwdAdd;
  const fo = cur.footOutAdd;
  shifted = hu !== 0 || hf !== 0 || ho !== 0 || fu !== 0 || ff !== 0 || fo !== 0;
  if (!shifted) return;
  const yaw = rig.root.rotation.y;
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  // the body's right is (fz, -fx)
  shiftTarget(rig.reachL, 0, fx * hf - fz * ho, hu, fz * hf + fx * ho);
  shiftTarget(rig.reachR, 1, fx * hf + fz * ho, hu, fz * hf - fx * ho);
  shiftTarget(rig.plantL, 2, fx * ff - fz * fo, fu, fz * ff + fx * fo);
  shiftTarget(rig.plantR, 3, fx * ff + fz * fo, fu, fz * ff - fx * fo);
}

/**
 * After the local player's `rig.animate`: the grip targets back, `TUNE_CUR` back to identity, and (tuner-clarity S1) what
 * its graph played this frame into NOW_PLAYING (the only writer: display only). No allocation.
 */
export function tuneEnd(rig: TuneRigIn): void {
  const g = rig.graph;
  if (g !== undefined) copyPlaying(g.playing, NOW_PLAYING);
  if (shifted) {
    restoreTarget(rig.reachL, 0);
    restoreTarget(rig.reachR, 1);
    restoreTarget(rig.plantL, 2);
    restoreTarget(rig.plantR, 3);
    shifted = false;
  }
  copyBody(TUNE_IDENTITY, TUNE_CUR);
  copyGun(TUNE_IDENTITY, TUNE_CUR);
  TUNE_CUR.armSwingK = 1;
  TUNE_OWNER.rig = null;
}

// ------------------------------------------------------------------------------------------
// (anim-bake-targets, BT-A1 / A3) The Body base table: the base table's `body` key, per rig
// ------------------------------------------------------------------------------------------

/**
 * The Body sliders that bake into the base table's `body` key (`animBase.ts`): every Body slider but the two with a code
 * value of their own (peekLeanMul: WALL.peekLean) or that act on the local player only (strideMul: its motion step,
 * `tuneSim`; (anim-bake-all, BA-A2) it bakes per state into the base table's generic `sections.body`, which the registry
 * composes into the Body section's effective values). kneeOutMul / kneeLiftMul keep their climb constants for ladder
 * and pipe (CLIMB_KNEE_OUT / CLIMB_KNEE_UP) and bake here for every other state.
 */
export const BODY_BASE_FIELDS: readonly BodyField[] = BODY_FIELDS.filter((f) => f !== 'strideMul' && f !== 'peekLeanMul');
const NBF = BODY_BASE_FIELDS.length;
const NBG = BODY_GROUPS.length;
/** Per base field: 1 = a mul slider (multiplies), 0 = an add slider (adds). */
const BB_MUL = new Uint8Array(BODY_BASE_FIELDS.map((f) => (tunable(f).kind === 'mul' ? 1 : 0)));
/** Per base field: its identity (1 or 0). */
const BB_ID = new Float64Array(BODY_BASE_FIELDS.map((f) => tunable(f).def));
const BB_INDEX = Object.fromEntries(BODY_BASE_FIELDS.map((f, i) => [f, i])) as Record<string, number>;
const BG_INDEX = Object.fromEntries(BODY_GROUPS.map((g, i) => [g, i])) as Record<string, number>;
const bbi = (f: BodyField): number => BB_INDEX[f]!;
const BB_HEAD = bbi('headTurnMul');
const BB_HU = bbi('handUpAdd');
const BB_HF = bbi('handFwdAdd');
const BB_HO = bbi('handOutAdd');
const BB_FU = bbi('footUpAdd');
const BB_FF = bbi('footFwdAdd');
const BB_FO = bbi('footOutAdd');
// (pose-parity) the root offsets and the wall gap a partner's rig reads from its own applied base (`bodyRigRoot`)
const BB_BF = bbi('bodyFwdAdd');
const BB_BU = bbi('bodyUpAdd');
const BB_GG = bbi('guardGapAdd');
const BB_GS = bbi('guardSideAdd');
const BB_WG = bbi('wallGapAdd');
/** The table in use: [body group][base field], identity where the base has no value. */
const BODY_BASE = new Float64Array(NBG * NBF);
for (let g = 0; g < NBG; g++) BODY_BASE.set(BB_ID, g * NBF);
/** Any base value off identity (false: no rig composes anything, bit-identical to the untuned rig). */
const BODY_BASE_LIVE = { on: false };

/** The rig whose `tuneBegin` window is open (the local player): its composed Body values also go to TUNE_LOCAL. */
export const TUNE_OWNER: { rig: unknown } = { rig: null };

/** Compose a Body base value with a tuner value (mul multiplies, add adds); the bake composes the same way. */
export function bodyCompose(id: BodyField, base: number, delta: number): number {
  return tunable(id).kind === 'mul' ? base * delta : base + delta;
}

/**
 * Load the base table's `body` key (row = a Body group id, param = a slider id of BODY_BASE_FIELDS). Every rig eases to
 * it from its applied values. Returns the names it skipped (`<row>.<param>`).
 */
export function bodyBaseLoad(t: Readonly<Record<string, Readonly<Record<string, number>>>> | undefined): string[] {
  const skipped: string[] = [];
  for (let g = 0; g < NBG; g++) BODY_BASE.set(BB_ID, g * NBF);
  let live = false;
  for (const [row, ps] of Object.entries(t ?? {})) {
    const g = BG_INDEX[row];
    for (const [id, v] of Object.entries(ps ?? {})) {
      const i = BB_INDEX[id];
      if (g === undefined || i === undefined || typeof v !== 'number' || !Number.isFinite(v)) {
        skipped.push(`${row}.${id}`);
        continue;
      }
      BODY_BASE[g * NBF + i] = v;
      if (v !== BB_ID[i]) live = true;
    }
  }
  BODY_BASE_LIVE.on = live;
  return skipped;
}

{
  // the generated table at start (the dev hook `__animBase` may replace it until a reload)
  const bad = bodyBaseLoad(ANIM_BASE.body);
  if (bad.length) console.warn(`animBase: unknown Body rows / params skipped: ${bad.join(', ')}`);
}

/** A base value (identity where unset), for the tests and the dev hooks. */
export function bodyBaseGet(row: BodyGroup, id: BodyField): number {
  const i = BB_INDEX[id];
  return i === undefined ? tunable(id).def : BODY_BASE[BG_INDEX[row]! * NBF + i]!;
}

/** One Wren rig's Body base state (allocated once per rig, `TuneRigState.bodyBase`). */
export interface BodyRigState {
  /** The applied base values per base field (eased toward the rig's row over BODY_TAU). */
  readonly applied: Float64Array;
  /** Any applied value off identity. */
  live: boolean;
  /** TUNE_CUR's values before the window (put back by `bodyRigEnd`); [last] = armSwingK. */
  readonly saved: Float64Array;
  /** The grip targets before the window's shift. */
  readonly grips: Float64Array;
  shifted: boolean;
  /** The pose's lookYaw before the window (NaN: not changed). */
  look: number;
}

export function bodyRigState(): BodyRigState {
  return { applied: new Float64Array(BB_ID), live: false, saved: new Float64Array(NBF + 1), grips: new Float64Array(24), shifted: false, look: NaN };
}

let bodyOpen: BodyRigState | null = null;
let bodyPose: TunePoseIn | null = null;
let bodyRig: TuneRigIn | null = null;

/**
 * Inside a Wren rig's own `animate` (`tuneRigBegin`; for the local player inside its `tuneBegin` window): ease the rig's
 * applied Body base toward row `gi` (a BODY_GROUPS index; -1 none = identity) over `dt` (0: at once) and compose it onto
 * TUNE_CUR (the local player's tuner values; identity for every other rig), the pose's head turn and the grip targets,
 * all put back by `bodyRigEnd`. The local player's rig (TUNE_OWNER) also gets the composed values in TUNE_LOCAL (the wall
 * gap and the root offset read them outside the window). Nothing live: returns at once (bit-identical). No allocation.
 * (crouch-pops, CP-A2) `gi2` / `w`: mid-crouch (0 < w < 1) the target is row `gi` (the standing row) blended toward row
 * `gi2` (the crouched row) by the crouch amount `w`, so a row change follows the crouch's own eased curve instead of
 * switching at 0.5 (Michael's trackMul 0.05 stepped the stance width's velocity mid-crouch: e2e-anim's two crouch pops).
 * Without them (w 0) as before.
 */
export function bodyRigBegin(st: BodyRigState, gi: number, p: TunePoseIn, rig: TuneRigIn, dt: number, gi2 = -1, w = 0): void {
  if (!BODY_BASE_LIVE.on && !st.live) return;
  const a = st.applied;
  const row = gi >= 0 && gi < NBG ? gi * NBF : -1;
  const blend = w > 0 && w < 1 && gi2 !== gi;
  const row2 = blend && gi2 >= 0 && gi2 < NBG ? gi2 * NBF : -1;
  const k = dt > 0 ? 1 - Math.exp(-dt / BODY_TAU) : 1;
  let live = false;
  for (let i = 0; i < NBF; i++) {
    const t0 = row >= 0 ? BODY_BASE[row + i]! : BB_ID[i]!;
    const t = blend ? t0 + ((row2 >= 0 ? BODY_BASE[row2 + i]! : BB_ID[i]!) - t0) * w : t0;
    const d = t - a[i]!;
    const v = k === 1 || (d > -1e-6 && d < 1e-6) ? t : a[i]! + d * k;
    a[i] = v;
    if (v !== BB_ID[i]) live = true;
  }
  st.live = live;
  if (!live) return;
  const cur = TUNE_CUR;
  const sv = st.saved;
  for (let i = 0; i < NBF; i++) {
    const f = BODY_BASE_FIELDS[i]!;
    sv[i] = cur[f];
    cur[f] = BB_MUL[i] === 1 ? a[i]! * cur[f] : a[i]! + cur[f];
  }
  sv[NBF] = cur.armSwingK;
  cur.armSwingK = Math.max(0, cur.armSwingMul + cur.armSwingGrow * Math.max(0, p.speed));
  if (TUNE_OWNER.rig === rig) {
    const l = TUNE_LOCAL;
    for (let i = 0; i < NBF; i++) {
      const f = BODY_BASE_FIELDS[i]!;
      l[f] = cur[f];
    }
    l.armSwingK = cur.armSwingK;
  }
  bodyOpen = st;
  bodyPose = p;
  bodyRig = rig;
  st.look = NaN;
  if (p.lookYaw !== undefined && a[BB_HEAD] !== 1) {
    st.look = p.lookYaw;
    p.lookYaw *= a[BB_HEAD]!;
  }
  const hu = a[BB_HU]!;
  const hf = a[BB_HF]!;
  const ho = a[BB_HO]!;
  const fu = a[BB_FU]!;
  const ff = a[BB_FF]!;
  const fo = a[BB_FO]!;
  st.shifted = hu !== 0 || hf !== 0 || ho !== 0 || fu !== 0 || ff !== 0 || fo !== 0;
  if (!st.shifted) return;
  const yaw = rig.root.rotation.y;
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  const b = st.grips;
  shiftTarget(rig.reachL, 0, fx * hf - fz * ho, hu, fz * hf + fx * ho, b);
  shiftTarget(rig.reachR, 1, fx * hf + fz * ho, hu, fz * hf - fx * ho, b);
  shiftTarget(rig.plantL, 2, fx * ff - fz * fo, fu, fz * ff + fx * fo, b);
  shiftTarget(rig.plantR, 3, fx * ff + fz * fo, fu, fz * ff - fx * fo, b);
}

/** After the rig's `animate` frame (`tuneRigEnd`, in a `finally`): TUNE_CUR, the head turn and the grips put back. */
export function bodyRigEnd(): void {
  const st = bodyOpen;
  if (st === null) return;
  bodyOpen = null;
  const cur = TUNE_CUR;
  const sv = st.saved;
  for (let i = 0; i < NBF; i++) cur[BODY_BASE_FIELDS[i]!] = sv[i]!;
  cur.armSwingK = sv[NBF]!;
  const p = bodyPose;
  const rig = bodyRig;
  bodyPose = null;
  bodyRig = null;
  if (p !== null && !Number.isNaN(st.look)) p.lookYaw = st.look;
  if (rig !== null && st.shifted) {
    const b = st.grips;
    restoreTarget(rig.reachL, 0, b);
    restoreTarget(rig.reachR, 1, b);
    restoreTarget(rig.plantL, 2, b);
    restoreTarget(rig.plantR, 3, b);
    st.shifted = false;
  }
}

/** Around the local player's motion driver step: its step length (stride) from the last selected group. */
export function tuneSim(on: boolean): void {
  TUNE_CUR.strideMul = on ? TUNE_LOCAL.strideMul : 1;
}

/**
 * The local rig root's visual offset from the last selected group: body fwd / up, and in the hold the gap to the guard
 * (back along her facing) and the guard's side offset (her rig the other way). Visual only: the capsule, the guard and
 * GRAB stay where gameplay puts them. No allocation.
 */
export function tuneRoot(pos: { x: number; y: number; z: number }, yaw: number): void {
  const f = TUNE_LOCAL.bodyFwdAdd - TUNE_LOCAL.guardGapAdd;
  const r = -TUNE_LOCAL.guardSideAdd;
  const u = TUNE_LOCAL.bodyUpAdd;
  if (f === 0 && u === 0 && r === 0) return;
  const s = Math.sin(yaw);
  const c = Math.cos(yaw);
  // forward (s, c), right (c, -s)
  pos.x += s * f + c * r;
  pos.z += c * f - s * r;
  pos.y += u;
}

/**
 * (pose-parity) `tuneRoot` for a Wren rig that is not the local player (the co-op partner): the root offset from the
 * rig's OWN applied Body base (its last `bodyRigBegin`, as the owner's TUNE_LOCAL is its last frame's), never the
 * tuner's live values (the local player's own). Not live: nothing (bit-identical). No allocation.
 */
export function bodyRigRoot(st: BodyRigState, pos: { x: number; y: number; z: number }, yaw: number): void {
  if (!st.live) return;
  const a = st.applied;
  const f = a[BB_BF]! - a[BB_GG]!;
  const r = -a[BB_GS]!;
  const u = a[BB_BU]!;
  if (f === 0 && u === 0 && r === 0) return;
  const s = Math.sin(yaw);
  const c = Math.cos(yaw);
  pos.x += s * f + c * r;
  pos.z += c * f - s * r;
  pos.y += u;
}

/** (pose-parity) The rig's applied Body base wall gap (m, the owner's `TUNE_LOCAL.wallGapAdd` without the tuner). */
export function bodyRigWallGap(st: BodyRigState): number {
  return st.live ? st.applied[BB_WG]! : 0;
}

/**
 * The forward lean on a sampled keyed pose's spine (local quaternion at offset 4 of `q`, x y z w): times a pitch of
 * `TUNE_CUR.leanAdd` about its x axis (positive leans forward, as the graph's spine pitch). (mocap-trial) `scale` scales
 * it for the mocap set (MOCAP_LAYERS.keyLean; 1: exactly the slider's). No allocation.
 */
export function tuneKeyedLean(q: Float64Array, scale = 1): void {
  const a = scale === 1 ? TUNE_CUR.leanAdd : TUNE_CUR.leanAdd * scale;
  if (a === 0) return;
  const rx = Math.sin(a * 0.5);
  const rw = Math.cos(a * 0.5);
  const x = q[4]!;
  const y = q[5]!;
  const z = q[6]!;
  const w = q[7]!;
  q[4] = w * rx + x * rw;
  q[5] = y * rw + z * rx;
  q[6] = z * rw - y * rx;
  q[7] = w * rw - x * rx;
}

const tq = new Float64Array(4);
const td = new Float64Array(4);

/** a * b (Hamilton, x y z w) into out (out may not alias a or b). */
function qmul(ax: number, ay: number, az: number, aw: number, bx: number, by: number, bz: number, bw: number, out: Float64Array): void {
  out[0] = aw * bx + ax * bw + ay * bz - az * by;
  out[1] = aw * by - ax * bz + ay * bw + az * bx;
  out[2] = aw * bz + ax * by - ay * bx + az * bw;
  out[3] = aw * bw - ax * bx - ay * by - az * bz;
}

/** One keyed joint (`q` at offset `s`): its deviation from the mean, its yaw (twist about y) scaled by `k`. */
function twistAbout(q: Float64Array, m: Float32Array, s: number, k: number): void {
  const mx = m[s]!;
  const my = m[s + 1]!;
  const mz = m[s + 2]!;
  const mw = m[s + 3]!;
  // d = q * conj(m)
  qmul(q[s]!, q[s + 1]!, q[s + 2]!, q[s + 3]!, -mx, -my, -mz, mw, td);
  if (td[3]! < 0) for (let c = 0; c < 4; c++) td[c] = -td[c]!;
  const tl = Math.sqrt(td[1]! * td[1]! + td[3]! * td[3]!);
  if (tl < 1e-9) return;
  const ty = td[1]! / tl;
  const tw = td[3]! / tl;
  // swing = d * conj(twist); d' = swing * twist^k; q' = d' * m
  qmul(td[0]!, td[1]!, td[2]!, td[3]!, 0, -ty, 0, tw, tq);
  const th = 2 * Math.atan2(ty, tw) * k;
  qmul(tq[0]!, tq[1]!, tq[2]!, tq[3]!, 0, Math.sin(th * 0.5), 0, Math.cos(th * 0.5), td);
  qmul(td[0]!, td[1]!, td[2]!, td[3]!, mx, my, mz, mw, tq);
  const l = Math.sqrt(tq[0]! * tq[0]! + tq[1]! * tq[1]! + tq[2]! * tq[2]! + tq[3]! * tq[3]!) || 1;
  for (let c = 0; c < 4; c++) q[s + c] = tq[c]! / l;
}

/**
 * The trunk counter-rotation on a sampled keyed pose: the spine (offset 4) and chest (offset 8) yaw about the clip's mean
 * (`mean`, KeyedClip.meanQ) times `TUNE_CUR.trunkTwistMul`. Identity at 1. (mocap-trial) `scale` moves the multiplier
 * toward 1 for the mocap set (MOCAP_LAYERS.trunkTwist; 1: exactly the slider's). No allocation.
 */
export function tuneKeyedTwist(q: Float64Array, mean: Float32Array, scale = 1): void {
  const k0 = TUNE_CUR.trunkTwistMul;
  const k = scale === 1 ? k0 : 1 + (k0 - 1) * scale;
  if (k === 1) return;
  twistAbout(q, mean, 4, k);
  twistAbout(q, mean, 8, k);
}

// ------------------------------------------------------------------------------------------
// (tuner-camera) The camera state and its values (hot path: no allocation)
// ------------------------------------------------------------------------------------------

/**
 * The camera group: the attach preset first (`wall`: the peek while sliding past an edge; `duct`: vent; any other:
 * climb), then the body's hold / crawl / climb, the aim (by the held weapon), crouched, armed (low ready), else explore.
 * `attach`: the camera's preset; `peek`: the wall peek (0..1); `ads`: the aim target (0 / 1); `body` / `gun`: TUNE_STATE.
 */
export function selectCamGroup(attach: string | null, peek: number, ads: number, crouch: number, body: string, gun: string): CamGroup {
  if (attach) {
    if (attach === 'wall') return peek > 0 ? 'cam.peek' : 'cam.wall';
    if (attach === 'duct') return 'cam.vent';
    return 'cam.climb';
  }
  if (body === 'hold' || body === 'carry') return 'cam.hold';
  if (body === 'crawl' || body === 'vent') return 'cam.vent';
  if (body === 'ladder' || body === 'pipe' || body === 'ledge' || body === 'hang') return 'cam.climb';
  if (ads > 0) return gun.startsWith('pistol') ? 'cam.aimPistol' : 'cam.aimRifle';
  if (crouch > 0.5) return 'cam.exploreCrouch';
  if (gun !== '') return 'cam.lowReady';
  return 'cam.explore';
}

/** The rate (1/s) the camera's values ease to a new group's (or a moved slider's): about 0.4 s, so a state change glides
 *  (the Camera section's `tau` is 1 / CAM_EASE). */
export const CAM_EASE = 8;

/**
 * Once per render frame, from the follow camera: select the camera group (TUNE_STATE.cam) and ease `TUNE_CAM_CUR` toward
 * its values. At identity everywhere `TUNE_CAM_CUR` never moves (exact 0 / 1). No allocation.
 */
export function tuneCamStep(attach: string | null, peek: number, ads: number, crouch: number, dt: number): void {
  const g = selectCamGroup(attach, peek, ads, crouch, TUNE_STATE.body, TUNE_STATE.gun);
  TUNE_STATE.cam = g;
  // (pass 2) through the registry: dt 0 (the tuner's freeze, the pause menu) applies at once, the bypass reads identity
  tuneSectionEase(CAM_SECTION, g, dt);
}

// ------------------------------------------------------------------------------------------
// Edit, reset, change log, export, save: the registry's (tuneRegistry.ts), re-exported for the older callers
// ------------------------------------------------------------------------------------------

export {
  TUNE_EXPORT_MAGIC,
  TUNE_FLAGS,
  tuneImport,
  tuneMax,
  tuneMin,
  tuneSectionEase,
  type TuneImportResult,
  TUNE_HOOKS,
  TUNE_LOG,
  hasTunable,
  isTuneGroup,
  tunablesFor,
  tuneChanged,
  tuneClearLog,
  tuneExport,
  tuneExportName,
  tuneGet,
  tuneGroupChanged,
  tuneLoad,
  tuneNotes,
  tuneReset,
  tuneResetAll,
  tuneResetGroup,
  tuneSet,
  tuneSnapshot,
  type TuneChange,
  type TuneExport,
  type TuneSnapshot,
  type TuneValue,
} from './tuneRegistry';
