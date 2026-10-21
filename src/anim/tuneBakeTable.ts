/**
 * (anim-bake) The bake table: where each animation tuner slider's value goes in the code defaults
 * (`scripts/anim-tune-bake.mjs`, logic in `tuneBake.ts`, `docs/anim-tuner/BAKE.md`). Pure data, no imports, so plain
 * Node can load it.
 *
 * A rule bakes one slider over a set of state groups into one or more code values (a file, a const name and a property
 * path such as `MOVEMENT.adsSpeed`, `GEARS.stand[2]`, `ATTACH_FRAMING.wall.boom`, and an op). Its `groups` are the
 * groups that read those code values: one group is a per-state target; more than one is a shared target, baked only
 * when every group has the same value (or, with `--allow-shared`, when exactly one group changed). A group may be in
 * several rules of one slider (the explore camera reads `boomHip` and `boomOpen`); a value is baked only when every rule
 * of its slider and group bakes, so a slider never ends up half in the code and half in the tuner.
 *
 * Ops: a `mul` slider's value `v` multiplies (`mul`) or divides (`div`, a rate when the slider scales a time) the code
 * value; an `add` slider's value times `scale` (unit conversion, default 1) is added (`add`) or subtracted (`sub`).
 *
 * A manual entry has no code value to bake into (the reason says why); its changed values are listed for a person.
 * A new section (PR #71's `moveTune.ts`: `team_*`, `trav`) needs only its rules or manual entries here, plus its module
 * in `BAKE_CATALOGUE_MODULES` (or a `DECLARED_SECTIONS` entry when plain Node cannot load it).
 */

export type BakeOp = 'mul' | 'div' | 'add' | 'sub';

export interface BakeEdit {
  /** Repo-relative path under `src/` (or the key JSONs, which only the Keys section writes). */
  readonly file: string;
  /** `CONST.prop.sub[index]`: the const declared once in the file, then object keys and array indexes. */
  readonly path: string;
  readonly op: BakeOp;
  /** `add` / `sub` only: the slider value times this, in the code's unit (deg -> rad: Math.PI / 180). Default 1. */
  readonly scale?: number;
}

export interface BakeRule {
  /** Registry section id (`body`, `gun`, `cam`, `speed`, `joint`, `hand`, `ik`, `weapon`, `step`, `weight`). */
  readonly section: string;
  /** The slider id. */
  readonly id: string;
  /** The groups that read these code values (one: per state; more: a shared target). */
  readonly groups: readonly string[];
  readonly edits: readonly BakeEdit[];
  /** Shown in the report (where the bake is only close, what else moves with it). */
  readonly note?: string;
}

export interface ManualRule {
  readonly section: string;
  readonly id: string;
  /** The groups it covers; absent: every group of the slider no rule covers. */
  readonly groups?: readonly string[];
  readonly reason: string;
}

/** A slider as the catalogue knows it (the registry's `TuneTunable`, flattened per section). */
export interface DeclaredTunable {
  readonly id: string;
  readonly kind: 'mul' | 'add';
  readonly def: number;
  readonly min: number;
  readonly max: number;
  readonly groups: readonly string[];
}
export interface DeclaredSection {
  readonly id: string;
  readonly tunables: readonly DeclaredTunable[];
}

// ------------------------------------------------------------------------------------------
// Files and groups
// ------------------------------------------------------------------------------------------

const MOV = 'src/config/movement.ts';
const CAM = 'src/config/camera.ts';
const RIG = 'src/player/characterRig.ts';
const GRAPH = 'src/anim/animGraph.ts';
const MOTION = 'src/anim/motion.ts';
const WALLC = 'src/player/wallController.ts';
const ATT = 'src/player/attach.ts';
const PLAN = 'src/anim/footPlanner.ts';
const WEIGHT = 'src/anim/weight.ts';

const MOVING = ['walk', 'jog', 'run', 'sneak', 'crouchWalk', 'crouchRun', 'aim', 'aimCrouch', 'aimCrouchMove', 'wallSlide', 'wallCrouchSlide', 'hold', 'carry'];
const RIFLE_AIM = ['rifle.aim', 'rifle.aimCrouch'];
const PISTOL_AIM = ['pistol.aim', 'pistol.aimCrouch'];
const AIM_GUN = [...RIFLE_AIM, ...PISTOL_AIM];
const ALL_GUN = ['rifle.lowReady', 'rifle.aim', 'rifle.aimCrouch', 'pistol.lowReady', 'pistol.aim', 'pistol.aimCrouch'];
const ALL_CAM = ['cam.explore', 'cam.exploreCrouch', 'cam.lowReady', 'cam.aimRifle', 'cam.aimPistol', 'cam.wall', 'cam.peek', 'cam.climb', 'cam.vent', 'cam.hold'];
/** Groups on the hip (explore) framing: `boomHip`, `shoulderHip`. */
const CAM_HIP = ['cam.explore', 'cam.exploreCrouch', 'cam.lowReady', 'cam.hold'];
const CAM_STAND = ['cam.explore', 'cam.lowReady', 'cam.hold'];
const CAM_AIM = ['cam.aimRifle', 'cam.aimPistol'];
const CAM_WALL = ['cam.wall', 'cam.peek'];
/** Every attach preset `selectCamGroup` files under `cam.climb` (any attach but the wall and the duct). */
const CLIMB_PRESETS = ['hang', 'ladder', 'pipe', 'pipeH', 'zipline', 'split', 'pipeLegs', 'inverted', 'rappel', 'fence'];
/** The moving gaits (twistCap and the band run only while moving, so the idle lock does nothing). */
const STEP_MOVING = ['step.walk', 'step.jog', 'step.run', 'step.crouchWalk', 'step.crouchRun'];
const WEIGHT_ALL = ['weight.walk', 'weight.jog', 'weight.run', 'weight.crouch', 'weight.drawn'];

const e = (file: string, path: string, op: BakeOp, scale?: number): BakeEdit => (scale === undefined ? { file, path, op } : { file, path, op, scale });
const rule = (section: string, id: string, groups: readonly string[], edits: readonly BakeEdit[], note?: string): BakeRule => (note ? { section, id, groups, edits, note } : { section, id, groups, edits });
const manual = (section: string, id: string, reason: string, groups?: readonly string[]): ManualRule => (groups ? { section, id, groups, reason } : { section, id, reason });

const rules: BakeRule[] = [];
const manuals: ManualRule[] = [];

// ------------------------------------------------------------------------------------------
// Body (tune.ts). The constants are the shared character rig's: every rig reads them (the partner, guards).
// ------------------------------------------------------------------------------------------

const RIG_NOTE = 'shared rig constant: every rig reads it (the partner and guards too)';
rules.push(
  rule('body', 'strideMul', MOVING, [
    e(MOV, 'MOVEMENT.stepLen0', 'mul'),
    e(MOV, 'MOVEMENT.stepLenK', 'mul'),
    e(MOV, 'MOVEMENT.stepLenMax', 'mul'),
    e(MOTION, 'CROUCH_STEP.k', 'mul'),
    e(MOTION, 'CROUCH_STEP.max', 'mul'),
    e(MOTION, 'WALK_STEP.k', 'mul'),
    e(MOV, 'TENSE.step', 'mul'),
    e(MOTION, 'GLIDE_STEP.lat0', 'mul'),
    e(MOTION, 'GLIDE_STEP.latK', 'mul'),
    e(MOTION, 'GLIDE_STEP.fwd0', 'mul'),
    e(MOTION, 'GLIDE_STEP.fwdK', 'mul'),
  ], 'stepLength is linear in these lengths: exact when every moving state has the same value; the player\'s motion only (guards use ENEMY_MOTION)'),
  rule('body', 'kneeOutMul', ['ladder', 'pipe'], [e(RIG, 'CLIMB_KNEE_OUT', 'mul')], `close: the climb pole is max(stance knee-out, CLIMB_KNEE_OUT); ${RIG_NOTE}`),
  rule('body', 'kneeLiftMul', ['ladder', 'pipe'], [e(RIG, 'CLIMB_KNEE_UP', 'mul')], RIG_NOTE),
  rule('body', 'peekLeanMul', ['wallPeek', 'wallCrouchPeek'], [e(WALLC, 'WALL.peekLean', 'mul')], 'the remote copy reads the same WALL.peekLean'),
);
manuals.push(
  manual('body', 'armSwingMul', 'no code value: the keyed clips\' arm data (Keys section) and the READY_HANDS swing / pump terms together'),
  manual('body', 'armSwingGrow', 'no code value: a term the tuner adds (arm swing per m/s)'),
  manual('body', 'kneeFlexAdd', 'no code value in metres: SOFT_KNEE_STAND is a ratio of each character\'s leg length'),
  manual('body', 'trunkTwistMul', 'clip data: the keyed spine / chest yaw and the gait clips\' spine yaw curves (Keys section)'),
  manual('body', 'trackMul', 'no code value: the hip width (proportions) blended with each keyed clip\'s track `half`'),
  manual('body', 'kneeOutMul', 'mostly the keyed clips\' own kneeOut (key JSON, needs a rebake) blended with KNEE_OUT / KNEEL_KNEE_OUT'),
  manual('body', 'kneeLiftMul', 'gait liftH comes from the keyed clips\' liftH and the gait clips (clip data)'),
  manual('body', 'pelvisYAdd', 'clip data: the pose channel pelY (procedural and keyed clips)'),
  manual('body', 'leanAdd', 'clip data: the spine pitch channel and the keyed spine'),
  manual('body', 'elbowOutAdd', 'clip data: the keyed elbow point'),
  manual('body', 'elbowPoleMul', 'an inline literal (0.55 in characterRig solveArm), no named constant'),
  manual('body', 'headTurnMul', 'no code value: RigPose.lookYaw is computed by several systems'),
  manual('body', 'wallGapAdd', 'no named constant: wallRootPush max(0, standoff - reach - 0.015)'),
  manual('body', 'bodyFwdAdd', 'no code value: a visual root offset the tuner adds'),
  manual('body', 'bodyUpAdd', 'no code value: a visual root offset the tuner adds'),
  manual('body', 'handUpAdd', 'no code value: the grip targets come from the anchors / level data'),
  manual('body', 'handFwdAdd', 'no code value: the grip targets come from the anchors / level data'),
  manual('body', 'handOutAdd', 'no code value: the grip targets come from the anchors / level data'),
  manual('body', 'footUpAdd', 'no code value: the foot targets come from the anchors / level data'),
  manual('body', 'footFwdAdd', 'no code value: the foot targets come from the anchors / level data'),
  manual('body', 'footOutAdd', 'no code value: the foot targets come from the anchors / level data'),
  manual('body', 'guardGapAdd', 'no code value: a visual root offset (GRAB.hold is gameplay and stays)'),
  manual('body', 'guardSideAdd', 'no code value: a visual root offset (GRAB.side is gameplay and stays)'),
);

// ------------------------------------------------------------------------------------------
// Gun (tune.ts): the weapon pose offsets (animGraph) on the rig's weaponPivot; same units (m, rad)
// ------------------------------------------------------------------------------------------

const GUN_AXIS: readonly [string, string][] = [
  ['gunFwd', 'z'],
  ['gunUp', 'y'],
  ['gunSide', 'x'],
  ['gunPitch', 'pitch'],
  ['gunYaw', 'yaw'],
  ['gunCant', 'roll'],
];
for (const [id, f] of GUN_AXIS) {
  rules.push(
    // (anim-bake-1022) Wren's own copies: a bake never touches the guards' READY_POSES.low / PISTOL_READY
    rule('gun', id, ['rifle.lowReady'], [e(GRAPH, `WREN_READY_LOW.${f}`, 'add')], 'close: the open-ground low carry; the high / compressed carries and the wall tuck keep theirs'),
    rule('gun', id, ['pistol.lowReady'], [e(GRAPH, `WREN_PISTOL_READY.${f}`, 'add')]),
  );
}
for (const [id, f] of [
  ['gunFwd', 'z'],
  ['gunSide', 'x'],
] as const) {
  rules.push(
    rule('gun', id, RIFLE_AIM, [e(GRAPH, `SIGHT_RAISE.${f}`, 'add'), e(GRAPH, `PISTOL_REACH.${f}`, 'sub')], 'the pistol\'s reach takes the opposite so the pistol aim stays'),
    rule('gun', id, PISTOL_AIM, [e(GRAPH, `PISTOL_REACH.${f}`, 'add')]),
  );
}
for (const id of ['gunUp', 'gunPitch', 'gunYaw', 'gunCant']) {
  manuals.push(manual('gun', id, id === 'gunUp' ? 'aimed, the sight-to-eye solve holds the sight at the eye (tune sightYAdd); PISTOL_REACH.y is also the sight drop' : 'no code value: aimed, the weapon rotation follows the aim (the ready poses are weighted out)', AIM_GUN));
}
rules.push(
  rule('gun', 'sightYAdd', AIM_GUN, [e(RIG, 'SIGHT_EYE', 'add')], RIG_NOTE),
  rule('gun', 'headDropMul', AIM_GUN, [e(RIG, 'NECK_WELD', 'mul')], RIG_NOTE),
  // (fix round B1) every gun state reads max(aim tuck, ready tuck) x tuckMul: one rule over all six, exact when they agree
  rule('gun', 'tuckMul', ALL_GUN, [e(RIG, 'READY_ELBOW_TUCK', 'mul'), e(RIG, 'READY_ELBOW_TUCK_CROUCH', 'mul'), e(GRAPH, 'AIM_ELBOW_TUCK', 'mul')], `max(a m, b m) = m max(a, b): exact when all six gun states agree; ${RIG_NOTE}`),
  rule('gun', 'glideTwistMul', AIM_GUN, [e(GRAPH, 'GLIDE.yawCut', 'mul')], RIG_NOTE),
);

// ------------------------------------------------------------------------------------------
// Camera (tune.ts): config/camera.ts, same units (m, s, 1/s)
// ------------------------------------------------------------------------------------------

const BLEND_OUT = "close: the blend-in only is exact; the preset's blend-out after leaving the state ran under the next state's slider and now follows this value";
/** One field of every climb preset. */
const climb = (field: string, op: BakeOp): BakeEdit[] => CLIMB_PRESETS.map((p) => e(CAM, `ATTACH_FRAMING.${p}.${field}`, op));
for (const [id, hip, open, crouchOpen, ads, peek, field] of [
  ['camBoomAdd', 'boomHip', 'boomOpen', 'boomCrouchOpen', 'boomAds', 'boom', 'boom'],
  ['camSideAdd', 'shoulderHip', '', '', 'shoulderAds', 'shoulder', 'shoulder'],
] as const) {
  rules.push(rule('cam', id, CAM_HIP, [e(CAM, `CAMERA.${hip}`, 'add')]));
  if (open) rules.push(rule('cam', id, CAM_STAND, [e(CAM, `CAMERA.${open}`, 'add')]));
  if (crouchOpen) rules.push(rule('cam', id, ['cam.exploreCrouch'], [e(CAM, `CAMERA.${crouchOpen}`, 'add')]));
  rules.push(
    rule('cam', id, CAM_AIM, [e(CAM, `CAMERA.${ads}`, 'add')]),
    rule('cam', id, CAM_WALL, [e(CAM, `ATTACH_FRAMING.wall.${field}`, 'add')]),
    rule('cam', id, ['cam.peek'], [e(CAM, `WALL_CAMERA.peek.${peek}`, 'add')]),
    rule('cam', id, ['cam.climb'], climb(field, 'add'), 'every attach preset filed under cam.climb'),
    rule('cam', id, ['cam.vent'], [e(CAM, `ATTACH_FRAMING.duct.${field}`, 'add')]),
  );
}
rules.push(
  rule('cam', 'camPivotAdd', CAM_STAND, [e(CAM, 'CAMERA.pivotStand', 'add'), e(CAM, 'CAMERA.aimEyeDrop', 'add')], 'close: aimEyeDrop takes it back so the standing aim stays; the crouched aim moves by -aimCrouchShare of it'),
  rule('cam', 'camPivotAdd', ['cam.exploreCrouch'], [e(CAM, 'CAMERA.pivotCrouch', 'add')], 'close: the crouched aim moves by aimCrouchShare of it'),
  rule('cam', 'camPivotAdd', CAM_AIM, [e(CAM, 'CAMERA.aimEyeDrop', 'sub')]),
  rule('cam', 'camPivotAdd', CAM_WALL, [e(CAM, 'ATTACH_FRAMING.wall.pivot', 'add')]),
  rule('cam', 'camPivotAdd', ['cam.climb'], climb('pivot', 'add'), 'every attach preset filed under cam.climb'),
  rule('cam', 'camPivotAdd', ['cam.vent'], [e(CAM, 'ATTACH_FRAMING.duct.pivot', 'add')]),
  rule('cam', 'camHeightAdd', ALL_CAM, [e(CAM, 'CAMERA.height', 'add')], 'also the low-space reference height: low spaces shift slightly'),
  // a blend time x m is its rate / m. (fix round S1) A blend that runs after its state ends (the preset blend-out keeps
  // the preset, shoulderCamera.ts:335) was timed by the next state's slider: these bake the state's own side and say so.
  rule('cam', 'camBlendMul', ['cam.explore', 'cam.exploreCrouch', 'cam.lowReady'], [e(CAM, 'CAMERA.toTight', 'div'), e(CAM, 'CAMERA.toOpen', 'div')], 'close: cam.hold (no blend slider) runs the same open / tight blend'),
  rule('cam', 'camBlendMul', ['cam.lowReady'], [e(CAM, 'CAMERA.adsOutRate', 'div')], "close: an aim release at a wall runs under cam.wall's slider"),
  rule('cam', 'camBlendMul', CAM_WALL, [e(CAM, 'ATTACH_FRAMING.wall.blend', 'mul')], BLEND_OUT),
  rule('cam', 'camBlendMul', ['cam.peek'], [e(CAM, 'WALL_CAMERA.peek.blend', 'mul'), e(CAM, 'WALL_CAMERA.peek.out', 'mul')], 'close: the peek-out can finish after the group is back to cam.wall'),
  rule('cam', 'camBlendMul', ['cam.climb'], climb('blend', 'mul'), `every attach preset filed under cam.climb; ${BLEND_OUT}`),
  rule('cam', 'camBlendMul', ['cam.vent'], [e(CAM, 'ATTACH_FRAMING.duct.blend', 'mul')], BLEND_OUT),
  rule('cam', 'camFollowMul', ALL_CAM, [e(CAM, 'CAMERA.stairRate', 'mul')]),
  rule('cam', 'camBoomRateMul', ALL_CAM, [e(CAM, 'CAMERA.boomIn', 'mul'), e(CAM, 'CAMERA.boomOut', 'mul')]),
  rule('cam', 'camPadAdd', ALL_CAM, [e(CAM, 'CAMERA.castPad', 'add')], 'the pad is clamped at 0 in code'),
);
manuals.push(
  manual('cam', 'camFovAdd', 'a player setting (video.fovH); CAMERA.fov is only the settings default'),
  manual('cam', 'camZoomMul', 'no code value: the aim zoom is 1 without a scope (a scope\'s adsZoom is weapon data)'),
  manual('cam', 'camBlendMul', 'the aim-in time comes from the weapon\'s draw time (playerWeapons), not a camera constant', CAM_AIM),
);

// ------------------------------------------------------------------------------------------
// Speed (speedTune.ts): gameplay speeds, per state
// ------------------------------------------------------------------------------------------

const PACE_IDS = ['creepMul', 'sneakMul', 'walkMul', 'jogMul', 'runMul'];
/** (fix round S2) What else moves with a GEARS point. */
const GEARS_NOTE =
  'exact at the speed point (between points the stick curve interpolates the new points). GAMEPLAY: the point also moves the gait clip mix (effort), the integer gear bands (roll, fence rattle, wire pace), the stepping gait bands and the weapon moving-spread speed';
PACE_IDS.forEach((id, i) => {
  rules.push(
    rule('speed', id, ['spd.stand'], [e(MOV, `GEARS.stand[${i}]`, 'mul')], GEARS_NOTE),
    rule('speed', id, ['spd.crouch'], [e(MOV, `GEARS.crouch[${i}]`, 'mul')], GEARS_NOTE),
  );
});
// (fix round B2) the tuned glide is min(v, adsSpeed) x (fwd f + x strafe s + back backM k) / w: f scales the whole glide
manuals.push(manual('speed', 'glideFwdMul', 'the tuner scales the whole aimed glide; adsSpeed only caps it, so below the cap the forward speed would lose it and the strafe / back shares would drop by 1/f'));
rules.push(
  rule('speed', 'glideStrafeMul', ['spd.aim'], [e(MOV, 'MOVEMENT.strafeMult', 'mul')]),
  rule('speed', 'glideBackMul', ['spd.aim'], [e(MOV, 'MOVEMENT.backMult', 'mul')]),
  rule('speed', 'slideStandMul', ['spd.wall'], [e(WALLC, 'WALL.slideStand', 'mul')]),
  rule('speed', 'slideCrouchMul', ['spd.wall'], [e(WALLC, 'WALL.slideCrouch', 'mul')]),
  rule('speed', 'ladderMul', ['spd.climb'], [e(ATT, 'ATTACH.ladder.speed', 'mul')], 'the climb animation keeps LADDER_RUNG_RATE'),
  rule('speed', 'pipeMul', ['spd.climb'], [e(ATT, 'ATTACH.pipeV.speed', 'mul'), e(ATT, 'ATTACH.pipeH.speed', 'mul')], 'also the pipeH legs mode, which read the base speed without the tuner'),
  rule('speed', 'shimmyMul', ['spd.climb'], [e(ATT, 'ATTACH.ledge.speed', 'mul')]),
  rule('speed', 'crawlMul', ['spd.climb'], [e(ATT, 'ATTACH.duct.speed', 'mul')]),
);

// ------------------------------------------------------------------------------------------
// Stepping (tuneStep.ts): multipliers on the foot planner's constants; every planner (player, remotes, guards) reads them
// ------------------------------------------------------------------------------------------

rules.push(
  rule('step', 'lift', ['step.idle'], [e(PLAN, 'PLANNER.idleLift', 'mul')], 'the idle and stop-close steps'),
  rule('step', 'lock', STEP_MOVING, [e(PLAN, 'TURN_FOLLOW.twistFree', 'mul'), e(PLAN, 'TURN_FOLLOW.twistMax', 'mul'), e(PLAN, 'TURN_FOLLOW.scrubSpeed', 'div')], 'close: the touchdown twist cap reads twistFree too'),
);
manuals.push(
  manual('step', 'lift', 'the moving gaits\' lift is the gait liftH (clip data)'),
  manual('step', 'lock', 'no effect while still (the plant lock runs only while moving)', ['step.idle']),
  manual('step', 'dur', 'no single constant: the step duration comes from several planner terms'),
  manual('step', 'slide', 'inline literals (footPlanner holdOrStep reach, + 0.3)'),
  manual('step', 'stride0', 'no per-pace constant (LAND_AHEAD is one share for every pace)'),
  manual('step', 'stride1', 'no per-pace constant (LAND_AHEAD is one share for every pace)'),
  manual('step', 'stride2', 'no per-pace constant (LAND_AHEAD is one share for every pace)'),
  manual('step', 'toeOff', 'HEEL_RAISE plus an inline literal (the swing toe-off 0.45)'),
  manual('step', 'heel', 'HEEL_ROLL.pitch plus an inline literal (the pre-landing toe up 0.22)'),
  manual('step', 'replant', 'inline literals (reach x 0.92, the idle error > 1)'),
);

// ------------------------------------------------------------------------------------------
// Weight (weight.ts / weightTune.ts)
// ------------------------------------------------------------------------------------------

rules.push(
  rule('weight', 'startMul', WEIGHT_ALL, [e(MOV, 'CT.startTime', 'mul')], 'gameplay'),
  rule('weight', 'stopMul', WEIGHT_ALL, [e(MOV, 'CT.stopTime', 'mul')], 'gameplay'),
  rule('weight', 'turnMul', WEIGHT_ALL, [e(MOV, 'CT.turnRate', 'mul')], 'gameplay'),
  rule('weight', 'turnRunMul', WEIGHT_ALL, [e(MOV, 'CT.turnRateRun', 'mul')], 'gameplay'),
  rule('weight', 'plantTimeMul', WEIGHT_ALL, [e(WEIGHT, 'WEIGHT_BASE.plantTime', 'mul')]),
  rule('weight', 'landTimeMul', WEIGHT_ALL, [e(WEIGHT, 'WEIGHT_BASE.landTime', 'mul'), e(WEIGHT, 'WEIGHT_BASE.landTimePerM', 'mul')]),
  rule('weight', 'chestHzMul', WEIGHT_ALL, [e(WEIGHT, 'WEIGHT_BASE.chestHz', 'mul')]),
  rule('weight', 'headHzMul', WEIGHT_ALL, [e(WEIGHT, 'WEIGHT_BASE.headHz', 'mul')]),
  rule('weight', 'armHzMul', WEIGHT_ALL, [e(WEIGHT, 'WEIGHT_BASE.armHz', 'mul')]),
  rule('weight', 'gearHzMul', WEIGHT_ALL, [e(WEIGHT, 'WEIGHT_BASE.gearHz', 'mul')]),
  rule('weight', 'antTimeMul', WEIGHT_ALL, [e(WEIGHT, 'WEIGHT_BASE.antTime', 'mul')]),
);
for (const id of ['chestDampMul', 'headDampMul', 'armDampMul', 'gearDampMul']) manuals.push(manual('weight', id, 'WEIGHT_BASE.zeta is one value for all four springs'));
for (const id of ['stopSettle', 'accelLean', 'stopLean', 'bank', 'plantDrop', 'landDepth', 'chestLag', 'headLag', 'armLag', 'gearLag', 'antStart', 'antJump', 'camLag', 'camDip']) {
  manuals.push(manual('weight', id, 'no code value: the layer\'s amount is the slider (identity 0 = off); a per-state default table is a later job'));
}

// ------------------------------------------------------------------------------------------
// (clip-speed, track A) Clip speed (tuneClipSpeed.ts): a speed divides a duration or multiplies a rate. The every-clip
// slider (`all`) edits every target; with a clip's own slider too both apply (the product, as in the game).
// ------------------------------------------------------------------------------------------

const DRAW = 'src/weapons/drawState.ts';
const WPN = 'src/weapons/playerWeapons.ts';
const ACT = 'src/anim/clips/actions.ts';
const CLIP_EDITS: Readonly<Record<string, BakeEdit>> = {
  rifleDraw: e(DRAW, 'DRAW_TIME_PRIMARY', 'div'),
  pistolDraw: e(DRAW, 'DRAW_TIME_SIDEARM', 'div'),
  holster: e(DRAW, 'HOLSTER_TIME', 'div'),
  swap: e(WPN, 'SWAP_TIME', 'div'),
  grenade: e(WPN, 'GRENADE_TIME', 'div'),
  startShift: e(ACT, 'CLIP_RATE.startShift', 'mul'),
  stopSettle: e(ACT, 'CLIP_RATE.stopSettle', 'mul'),
  land: e(ACT, 'CLIP_RATE.land', 'mul'),
};
const CLIP_BODY_IDS = ['startShift', 'stopSettle', 'land'];
for (const [id, edit] of Object.entries(CLIP_EDITS)) {
  const body = CLIP_BODY_IDS.includes(id);
  const note = id === 'rifleDraw' || id === 'pistolDraw' ? 'gameplay: the draw state gates fireReady over the same time' : body ? 'every rig reads it (guards too)' : undefined;
  rules.push(rule('clip', id, [body ? 'clip.body' : 'clip.gun'], [edit], note));
}
rules.push(rule('clip', 'all', ['clip.all'], Object.values(CLIP_EDITS), 'every clip of the section (with a clip\'s own slider: both apply)'));

// ------------------------------------------------------------------------------------------
// Joints, Hands & feet, IK strength, Weapon (tuneV2Sections.ts): (anim-joints J1) the generated base table
// ------------------------------------------------------------------------------------------

/**
 * Every slider and row of these four sections bakes into the generated base table `src/anim/animBase.ts`, which every
 * Wren rig reads (`tuneBakeBase.ts`: `BAKE_BASE_FILE`, `BAKE_BASE_SECTIONS`; composed by the A1 rules, keyed by row id,
 * joint name and param id). They need no rule here; only the panel option stays manual.
 */
manuals.push(manual('joint', 'mirror', 'a panel option (the mirror lock), nothing to bake', ['joint.options']));

/**
 * (anim-studio-2, src/anim/moveTune.ts) The co-op role / contact sections and the Traversal moves section: every slider
 * is a visual offset on the local rig (root, grips, plants, tumble, crouch, the one-shot clip clock), never a code
 * value; the moves' paths and timing come from TEAM / the attach data and stay. Folding them in needs per-move base
 * offsets every rig reads (a later job).
 */
export const TEAM_MOVE_IDS = ['boost', 'relay', 'throw', 'hang', 'rope', 'revive'] as const;
export const TRAV_KIND_IDS = ['vault', 'mantle', 'step', 'climbUp', 'windowVault', 'rappel', 'drop', 'hop', 'roll', 'wallKick', 'split'] as const;
const MOVE_REASON = 'no code value: a visual offset on the local rig (root, grips, plants, lean, crouch, clip clock); per-move base offsets every rig reads are a later job';
for (const m of TEAM_MOVE_IDS) manuals.push(manual(`team_${m}`, '*', MOVE_REASON));
manuals.push(manual('trav', '*', MOVE_REASON));

export const BAKE_RULES: readonly BakeRule[] = rules;
export const BAKE_MANUAL: readonly ManualRule[] = manuals;

/** Repo-relative path prefixes the bake may write (`src/config/` is under `src/`). */
export const BAKE_WRITE_ROOTS: readonly string[] = ['src/', 'scripts/anim-keys/keys/'];
/** The ledger of baked exports (a re-run of the same export is a no-op). */
export const BAKE_LEDGER = 'src/anim/tuneBakeLog.json';
/** Where the Keys section's key JSONs live. */
export const BAKE_KEYS_DIR = 'scripts/anim-keys/keys/';

/** Modules plain Node can load that register sections (the script imports them for the catalogue). */
export const BAKE_CATALOGUE_MODULES: readonly string[] = ['src/anim/tune.ts', 'src/anim/tuneV2Sections.ts', 'src/anim/tuneClipSpeed.ts']; // (clip-speed, track A) tuneClipSpeed
/**
 * (fix round S4) Every other file that registers a section, and how the catalogue gets it: `declared`
 * (DECLARED_SECTIONS), `weight` (weight.ts's WEIGHT_TUNABLES) or `keys` (built in). The coverage test fails for a file
 * that calls registerTuneSection and is in neither list, and checks every registered section's sliders.
 */
export const BAKE_OTHER_SECTION_FILES: Readonly<Record<string, 'declared' | 'weight' | 'keys'>> = {
  'src/player/speedTune.ts': 'declared',
  'src/player/weightTune.ts': 'weight',
  'src/anim/tuneKeys.ts': 'keys',
  'src/anim/moveTune.ts': 'declared',
};

/**
 * Sections plain Node cannot load (speedTune imports the wall controller, which uses TypeScript syntax Node's type
 * stripping refuses), declared here; `tests/animTuneBake.test.ts` checks them against the registry.
 */
const mulSpeed = (id: string, groups: readonly string[]): DeclaredTunable => ({ id, kind: 'mul', def: 1, min: 0.3, max: 2, groups });
const addT = (id: string, min: number, max: number, groups: readonly string[]): DeclaredTunable => ({ id, kind: 'add', def: 0, min, max, groups });
/** moveTune.ts roleSliders: the body / limb offsets every role and traversal group has, plus `time` on the one-shots. */
function roleDeclared(groups: readonly string[], timed: readonly string[]): DeclaredTunable[] {
  const out: DeclaredTunable[] = [
    addT('bodyFwd', -0.6, 0.6, groups), addT('bodyUp', -0.6, 0.6, groups), addT('bodySide', -0.6, 0.6, groups),
    addT('yaw', -60, 60, groups), addT('lean', -60, 60, groups), addT('crouch', -1, 1, groups),
    addT('handUp', -0.4, 0.4, groups), addT('handFwd', -0.4, 0.4, groups), addT('handOut', -0.4, 0.4, groups),
    addT('footUp', -0.4, 0.4, groups), addT('footFwd', -0.4, 0.4, groups), addT('footOut', -0.4, 0.4, groups),
  ];
  if (timed.length > 0) out.push({ id: 'time', kind: 'mul', def: 1, min: 0.5, max: 2, groups: timed });
  return out;
}
export const DECLARED_SECTIONS: readonly DeclaredSection[] = [
  {
    id: 'speed',
    tunables: [
      ...PACE_IDS.map((id) => mulSpeed(id, ['spd.stand', 'spd.crouch'])),
      mulSpeed('glideFwdMul', ['spd.aim']),
      mulSpeed('glideStrafeMul', ['spd.aim']),
      mulSpeed('glideBackMul', ['spd.aim']),
      mulSpeed('slideStandMul', ['spd.wall']),
      mulSpeed('slideCrouchMul', ['spd.wall']),
      mulSpeed('ladderMul', ['spd.climb']),
      mulSpeed('pipeMul', ['spd.climb']),
      mulSpeed('shimmyMul', ['spd.climb']),
      mulSpeed('crawlMul', ['spd.climb']),
    ],
  },
  // (anim-studio-2) moveTune.ts imports speedTune, so plain Node cannot load it either: its sections, as registered
  ...TEAM_MOVE_IDS.map((m): DeclaredSection => {
    const a = `team.${m}.a`;
    const b = `team.${m}.b`;
    const timed = m === 'boost' || m === 'relay' || m === 'throw' ? [a] : [];
    return { id: `team_${m}`, tunables: [...roleDeclared([a, b], timed), ...['cFwd', 'cUp', 'cSide'].map((id) => addT(id, -0.6, 0.6, [`team.${m}.contact`]))] };
  }),
  {
    id: 'trav',
    tunables: roleDeclared(
      TRAV_KIND_IDS.map((k) => `trav.${k}`),
      TRAV_KIND_IDS.filter((k) => k !== 'rappel' && k !== 'split').map((k) => `trav.${k}`),
    ),
  },
];
