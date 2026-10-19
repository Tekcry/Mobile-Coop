/**
 * (CT prototype G7, AUDIT-WALLS rows 6-8) The carried body's poses on its own fresh rig, Babylon-side but world-free
 * (unit-tested on a NullEngine): lying straight on the floor where the corpse lay, over the carrier's right shoulder (the
 * carry socket in the carrier's chest frame), the hoist between them, and sliding off the shoulder for the put down.
 * No allocation per frame: module scratch only.
 */
import { Quaternion, Vector3, type TransformNode } from '../core/babylon';
import type { CharacterRig } from '../player/characterRig';

/** Carried over the shoulder: torso down the back, legs down the front, arms hanging (joint Euler x). */
export const CARRY_TILT = 0.35;
export const CARRY_HIP = 2.37;
export const CARRY_KNEE = 0.6;
export const CARRY_SHOULDER = 2.79;

const tq = new Quaternion();
const tq2 = new Quaternion();
const tv = new Vector3();
const FWD = new Vector3(0, 0, 1);
const UP = new Vector3(0, 1, 0);
const tv2 = new Vector3();
/** (G7) How far the hoist bows out in front of the carrier at its middle (m). */
const HOIST_BOW = 0.3;

/** The carry socket in the carrier's chest frame: the root's Euler x and local position (the hips on the shoulder). */
export function socketLocal(rig: CharacterRig, shoulderX: number, shoulderY: number, out: { th: number; x: number; y: number; z: number }): void {
  const th = Math.PI + CARRY_TILT;
  const hy = rig.p.y.hip;
  out.th = th;
  out.x = shoulderX;
  out.y = shoulderY - hy * Math.cos(th);
  out.z = -hy * Math.sin(th);
}

function pitchJoint(n: TransformNode, x: number): void {
  Quaternion.RotationYawPitchRollToRef(0, x, 0, n.rotationQuaternion!);
}

/** The carry joints at share `k` (0 straight, 1 draped over the shoulder). */
export function carryJoints(rig: CharacterRig, k: number): void {
  pitchJoint(rig.hipL, CARRY_HIP * k);
  pitchJoint(rig.hipR, (CARRY_HIP - 0.12) * k);
  pitchJoint(rig.kneeL, CARRY_KNEE * k);
  pitchJoint(rig.kneeR, (CARRY_KNEE + 0.1) * k);
  pitchJoint(rig.shoulderL, CARRY_SHOULDER * k);
  pitchJoint(rig.shoulderR, (CARRY_SHOULDER + 0.1) * k);
  pitchJoint(rig.neck, 0.35 * k);
}

const sock = { th: 0, x: 0, y: 0, z: 0 };

/** On the shoulder: parented to the carrier's chest at the socket (the 3.2.0 carry pose). */
export function attachToShoulder(rig: CharacterRig, chest: TransformNode, shoulderX: number, shoulderY: number): void {
  const s = sock;
  socketLocal(rig, shoulderX, shoulderY, s);
  const r = rig.root;
  r.parent = chest;
  r.rotationQuaternion = null;
  r.rotation.set(s.th, 0, 0);
  r.position.set(s.x, s.y, s.z);
  carryJoints(rig, 1);
}

/**
 * The lying start of a hoist (world space, no parent): straight on the back with the hips at (hx, hy, hz) and the head
 * toward `headYaw` (rad, 0 = +Z), joints straight. Writes the root's world rotation into `outQ`.
 */
export function layAt(rig: CharacterRig, hx: number, hy: number, hz: number, headYaw: number, outQ: Quaternion): void {
  const r = rig.root;
  r.parent = null;
  // lying: the body's up turns to -Z by the pitch, then the yaw turns -Z to the head's way (yaw + PI)
  Quaternion.RotationYawPitchRollToRef(headYaw + Math.PI, -Math.PI / 2, 0, outQ);
  r.rotationQuaternion = (r.rotationQuaternion ?? new Quaternion()).copyFrom(outQ);
  const up = rig.p.y.hip;
  r.position.set(hx - Math.sin(headYaw) * up, hy, hz - Math.cos(headYaw) * up);
  carryJoints(rig, 0);
}

/**
 * The hoist at `k` (0 lying at `from` / `fromQ`, 1 on the socket `socket`, a node parented to the carrier's chest at
 * the socket's local transform): position up first and in second (an arc, no path through the carrier's legs),
 * rotation slerped, the joints from straight to draped.
 */
export function hoistAt(rig: CharacterRig, from: Vector3, fromQ: Quaternion, socket: TransformNode, k: number): void {
  socket.computeWorldMatrix(true);
  const sp = socket.getAbsolutePosition();
  socket.absoluteRotationQuaternion.normalizeToRef(tq2);
  const r = rig.root;
  const hy = rig.p.y.hip;
  const e = k < 0 ? 0 : k > 1 ? 1 : k;
  const up = 1 - (1 - e) * (1 - e);
  const s = e * e * (3 - 2 * e);
  const along = s * s;
  // the hips (the pivot on the shoulder) travel, the root (feet) follows from the slerped turn: lerping the feet swung
  // the chest through the carrier's; bowed out in front of him mid-way
  UP.rotateByQuaternionToRef(fromQ, tv2);
  const fx = from.x + tv2.x * hy;
  const fy = from.y + tv2.y * hy;
  const fz = from.z + tv2.z * hy;
  UP.rotateByQuaternionToRef(tq2, tv2);
  const tx = sp.x + tv2.x * hy;
  const ty = sp.y + tv2.y * hy;
  const tz = sp.z + tv2.z * hy;
  const bow = HOIST_BOW * Math.sin(Math.PI * e);
  const chest = socket.parent as TransformNode | null;
  if (chest) chest.getDirectionToRef(FWD, tv);
  else tv.set(0, 0, 0);
  Quaternion.SlerpToRef(fromQ, tq2, s, tq);
  UP.rotateByQuaternionToRef(tq, tv2);
  r.position.set(fx + (tx - fx) * along + tv.x * bow - tv2.x * hy, fy + (ty - fy) * up - tv2.y * hy, fz + (tz - fz) * along + tv.z * bow - tv2.z * hy);
  r.rotationQuaternion = (r.rotationQuaternion ?? new Quaternion()).copyFrom(tq);
  carryJoints(rig, s);
}

/**
 * Sliding off the shoulder (the put down, row 8) at `k` 0..1, still on the chest: rolled forward off the shoulder and
 * lowered to the carrier's right side, the legs straightening.
 */
export function slideAt(rig: CharacterRig, shoulderX: number, shoulderY: number, k: number): void {
  const s0 = sock;
  socketLocal(rig, shoulderX, shoulderY, s0);
  const e = k < 0 ? 0 : k > 1 ? 1 : k;
  const r = rig.root;
  r.rotationQuaternion = null;
  // (render check: rolling it off on the pitch threw the legs up and out) it slips down off the shoulder to his side,
  // turning a little toward lying; the ragdoll then lets it fall the rest beside his feet. A left-shoulder carry
  // (`shoulderX` < 0) mirrored
  const side = shoulderX < 0 ? -1 : 1;
  r.rotation.set(s0.th, 0, 0.25 * e * side);
  tv.set(s0.x + 0.32 * e * side, s0.y - 0.2 * e, s0.z + 0.1 * e);
  r.position.copyFrom(tv);
  carryJoints(rig, 1 - 0.25 * e);
}
