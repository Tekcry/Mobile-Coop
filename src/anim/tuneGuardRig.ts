/**
 * (marlow-bays item 24, track A) The per-guard window of the guard tables (`tuneGuard.ts`; pure, Babylon-free). Every
 * guard rig (`CharacterRig.guardRows`, set in `buildEnemyRig`) owns one `GuardRigState` (allocated once) and, inside its
 * own `animate`, picks its own row from its own pose (`guardRowOf`), eases its applied joint offsets toward that row of
 * the guard table and opens the joints window on them (`jointsOpen`: the rig's joint hooks then read this guard's
 * offsets, never a Wren row), and steps its own Weight layers (`WeightLayers`, one per guard) on the row's guard weight
 * values. Its planner reads `GUARD_STEP_ROWS` (set with the flag). The window is the guard's alone: Wren's rigs never
 * open it and their windows never read the guard table.
 *
 * Nothing live (an empty guard base table, identity guard rows, nothing still easing): `guardRigBegin` returns false
 * and the rig animates exactly as the untuned rig (bit-identical; `tests/animSkeletonGuardIdentity.test.ts`). No
 * allocation per frame.
 *
 * The Weight layers write the shared `WEIGHT_POSE` (the graph reads it while `on`) for this guard's frame only; it is
 * cleared after (`guardRigEnd`), and the camera signal `WEIGHT_CAM` (the local player's) is put back as it was.
 */
import { jointsEnd, jointsOpen, jointsRigState, JOINT_COUNT, JOINT_EASE_TAU, type JointsRigState } from './tuneJoints';
import { GUARD_ELIVE, GUARD_GEN, GUARD_JOINT_GROUPS, GUARD_QUAT, GUARD_ROW_LIVE, GUARD_STEP_GROUPS, GUARD_WEIGHT_EFF, GUARD_WEIGHT_GROUPS, GUARD_WEIGHT_IDENTITY, GUARD_WEIGHT_IDS, GUARD_WEIGHT_LIVE, guardRowOf, guardStepGaitOf, TUNE_WHO, type GuardPoseIn } from './tuneGuard';
import { TUNE_STATE_BAG } from './tuneRegistry';
import { WEIGHT_CAM, weightFrameIn, WeightLayers, weightPoseClear, type WeightFrameIn, type WeightValues } from './weight';

/** The Weight values' ease time constant (s), as Wren's Weight section. */
const WEIGHT_TAU = 0.1;
const SNAP_EPS = 1e-6;
/** A root jump past this (m) in one frame restarts the layers (a teleport, a respawn). */
const JUMP = 2;

export interface GuardRigState {
  readonly joints: JointsRigState;
  /** The guard table generation the applied offsets were eased under. */
  gen: number;
  /** The guard row picked last (index into `GUARD_ROWS`, -1 none). */
  row: number;
  readonly layers: WeightLayers;
  readonly win: WeightFrameIn;
  /** The eased Weight values this guard's layers read (every field; the guard sliders composed, the rest identity). */
  readonly wcur: WeightValues;
  /** The layers ran last frame (off: they restart from rest when they come on). */
  wOn: boolean;
  /** Last frame's root, yaw and speed (the layers' input), and whether a foot planted. */
  px: number;
  py: number;
  pz: number;
  pyaw: number;
  pspeed: number;
  plant: boolean;
  teleports: number;
}

export function guardRigState(): GuardRigState {
  return {
    joints: jointsRigState(),
    gen: -1,
    row: -1,
    layers: new WeightLayers(),
    win: weightFrameIn(),
    wcur: { ...(GUARD_WEIGHT_IDENTITY as WeightValues) },
    wOn: false,
    px: 0,
    py: 0,
    pz: 0,
    pyaw: 0,
    pspeed: 0,
    plant: false,
    teleports: 0,
  };
}

/** What the window reads from the rig (a `CharacterRig` fits). */
export interface GuardRigIn {
  readonly root: { readonly position: { readonly x: number; readonly y: number; readonly z: number }; readonly rotation: { readonly y: number } };
  readonly planner: { readonly L: { readonly landed: boolean }; readonly R: { readonly landed: boolean } };
}

/** The guard pose fields the layers read beyond the row pick. */
export interface GuardRigPose extends GuardPoseIn {
  grounded: boolean;
  accelFwd?: number;
}

function jointsReset(st: JointsRigState): void {
  const c = st.cur;
  for (let j = 0; j < JOINT_COUNT; j++) {
    const o = j * 4;
    c[o] = c[o + 1] = c[o + 2] = 0;
    c[o + 3] = 1;
    st.live[j] = 0;
  }
  st.any = false;
}

/** Ease this guard's applied offsets toward row `r` (-1: toward none) over `dt` (0: at once). No allocation. */
function easeJoints(st: JointsRigState, r: number, dt: number): void {
  const live = r >= 0 && GUARD_ROW_LIVE[r] === 1;
  if (!st.any && !live) return;
  const CUR = st.cur;
  const k = dt > 0 ? 1 - Math.exp(-dt / JOINT_EASE_TAU) : 1;
  const b = r < 0 ? -1 : r * JOINT_COUNT;
  let any = false;
  for (let j = 0; j < JOINT_COUNT; j++) {
    const o = j * 4;
    let tx = 0;
    let ty = 0;
    let tz = 0;
    let tw = 1;
    if (b >= 0 && GUARD_ELIVE[b + j] === 1) {
      const q = (b + j) * 4;
      tx = GUARD_QUAT[q]!;
      ty = GUARD_QUAT[q + 1]!;
      tz = GUARD_QUAT[q + 2]!;
      tw = GUARD_QUAT[q + 3]!;
    }
    let cx = CUR[o]!;
    let cy = CUR[o + 1]!;
    let cz = CUR[o + 2]!;
    let cw = CUR[o + 3]!;
    if (cx !== tx || cy !== ty || cz !== tz || cw !== tw) {
      if (cx * tx + cy * ty + cz * tz + cw * tw < 0) {
        tx = -tx;
        ty = -ty;
        tz = -tz;
        tw = -tw;
      }
      cx += (tx - cx) * k;
      cy += (ty - cy) * k;
      cz += (tz - cz) * k;
      cw += (tw - cw) * k;
      if (Math.abs(tx - cx) < SNAP_EPS && Math.abs(ty - cy) < SNAP_EPS && Math.abs(tz - cz) < SNAP_EPS && Math.abs(tw - cw) < SNAP_EPS) {
        cx = tx;
        cy = ty;
        cz = tz;
        cw = tw;
      } else {
        const l = Math.sqrt(cx * cx + cy * cy + cz * cz + cw * cw) || 1;
        cx /= l;
        cy /= l;
        cz /= l;
        cw /= l;
      }
      CUR[o] = cx;
      CUR[o + 1] = cy;
      CUR[o + 2] = cz;
      CUR[o + 3] = cw;
    }
    const on = cx === 0 && cy === 0 && cz === 0 && (cw === 1 || cw === -1) ? 0 : 1;
    if (!on) {
      CUR[o] = CUR[o + 1] = CUR[o + 2] = 0;
      CUR[o + 3] = 1;
    }
    st.live[j] = on;
    if (on) any = true;
  }
  st.any = any;
}

/** Ease `cur`'s guard Weight sliders toward `to` over `dt`; true while any is off identity. No allocation. */
function easeWeight(cur: WeightValues, to: Readonly<WeightValues>, dt: number): boolean {
  const c = cur as Record<string, number>;
  const t = to as Record<string, number>;
  const id0 = GUARD_WEIGHT_IDENTITY as Record<string, number>;
  const k = dt > 0 ? 1 - Math.exp(-dt / WEIGHT_TAU) : 1;
  let off = false;
  for (let i = 0; i < GUARD_WEIGHT_IDS.length; i++) {
    const id = GUARD_WEIGHT_IDS[i]!;
    const tv = t[id]!;
    const cv = c[id]!;
    if (cv !== tv) {
      const d = tv - cv;
      c[id] = k >= 1 || Math.abs(d) < SNAP_EPS ? tv : cv + d * k;
    }
    if (c[id] !== id0[id]) off = true;
  }
  return off;
}

const camSave = { lagX: 0, lagY: 0, lagZ: 0, dip: 0 };

/**
 * Before the guard rig's own `animate` frame (after its LOD skip): pick its row, ease and open its joints window, step
 * its Weight layers. Returns true when a window is open: close with `guardRigEnd` in a `finally`. False: nothing live,
 * nothing to close (the untuned frame). No allocation.
 */
export function guardRigBegin(st: GuardRigState, pose: GuardRigPose, rig: GuardRigIn, dt: number): boolean {
  const r = guardRowOf(pose);
  st.row = r;
  // the chamber's guard puppet: the guard sections follow its row
  if (rig === TUNE_WHO.rig) {
    TUNE_STATE_BAG.guardJoint = r < 0 ? '' : GUARD_JOINT_GROUPS[r]!;
    TUNE_STATE_BAG.guardWeight = r < 0 ? '' : GUARD_WEIGHT_GROUPS[r]!;
    TUNE_STATE_BAG.guardStep = r < 0 ? '' : GUARD_STEP_GROUPS[guardStepGaitOf(pose)]!;
  }
  // joints
  const js = st.joints;
  if (st.gen !== GUARD_GEN.joints) {
    st.gen = GUARD_GEN.joints;
    jointsReset(js);
  }
  easeJoints(js, r, dt);
  let open = false;
  if (js.any) {
    jointsOpen(js);
    open = true;
  }
  // weight
  const root = rig.root.position;
  const yaw = rig.root.rotation.y;
  const wantW = GUARD_WEIGHT_LIVE.on || st.wOn;
  if (wantW) {
    const to = r < 0 ? GUARD_WEIGHT_IDENTITY : GUARD_WEIGHT_EFF[r]!;
    const off = easeWeight(st.wcur, to, dt);
    if (!st.wOn) {
      // coming on: from rest at this place
      st.layers.reset();
      st.px = root.x;
      st.py = root.y;
      st.pz = root.z;
      st.pyaw = yaw;
      st.pspeed = pose.speed;
      st.plant = false;
    }
    if (off || st.wOn) {
      const w = st.win;
      const ddx = root.x - st.px;
      const ddz = root.z - st.pz;
      if (ddx * ddx + ddz * ddz > JUMP * JUMP) st.teleports++;
      let dy = yaw - st.pyaw;
      if (dy > Math.PI) dy -= 2 * Math.PI;
      else if (dy < -Math.PI) dy += 2 * Math.PI;
      w.dt = dt;
      w.x = root.x;
      w.y = root.y;
      w.z = root.z;
      w.yaw = yaw;
      w.speed = pose.speed;
      w.accelFwd = pose.accelFwd ?? (dt > 0 ? (pose.speed - st.pspeed) / dt : 0);
      w.yawRate = dt > 0 ? dy / dt : 0;
      w.grounded = pose.grounded;
      w.plant = st.plant;
      w.landings = 0;
      w.fall = 0;
      w.start = st.pspeed < 0.15 && pose.speed >= 0.15;
      w.jump = false;
      w.teleports = st.teleports;
      st.px = root.x;
      st.py = root.y;
      st.pz = root.z;
      st.pyaw = yaw;
      st.pspeed = pose.speed;
      const C = WEIGHT_CAM;
      camSave.lagX = C.lagX;
      camSave.lagY = C.lagY;
      camSave.lagZ = C.lagZ;
      camSave.dip = C.dip;
      st.layers.step(w, st.wcur);
      C.lagX = camSave.lagX;
      C.lagY = camSave.lagY;
      C.lagZ = camSave.lagZ;
      C.dip = camSave.dip;
    }
    st.wOn = off;
    if (off) open = true;
    else weightPoseClear();
  }
  return open;
}

/** After the guard rig's `animate` frame (when `guardRigBegin` returned true): both windows off. */
export function guardRigEnd(st: GuardRigState, rig: GuardRigIn): void {
  jointsEnd();
  if (st.wOn) {
    weightPoseClear();
    st.plant = rig.planner.L.landed || rig.planner.R.landed;
  }
}
