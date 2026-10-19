/**
 * (CT prototype G7, AUDIT-WALLS rows 6-8) The carried body's poses on its own fresh rig, Babylon-side but world-free
 * (unit-tested on a NullEngine): lying straight on the floor where the corpse lay, over the carrier's right shoulder (the
 * carry socket in the carrier's chest frame), the hoist between them, and sliding off the shoulder for the put down.
 * No allocation per frame: module scratch only.
 */
import { Quaternion, Vector3, type TransformNode } from '../core/babylon';
import type { CharacterRig } from '../player/characterRig';
import { hyp2 } from '../core/mathx';

/** Carried over the shoulder: torso down the back, legs down the front, arms hanging (joint Euler x). */
/** (G7 fix round) The torso's lean off vertical in the carrier's chest frame (rad, back): the chest is already bent
 *  forward `CQ.carryBend` 0.38 under the weight, so 0.08 here hangs it ~0.3 rad behind vertical in the world (0.35 laid
 *  it out near flat behind her). */
export const CARRY_TILT = 0.08;
export const CARRY_HIP = 2.37;
export const CARRY_KNEE = 0.6;
export const CARRY_SHOULDER = 2.79;

const tq = new Quaternion();
const tq2 = new Quaternion();
const tv = new Vector3();
const FWD = new Vector3(0, 0, 1);
const UP = new Vector3(0, 1, 0);
const tv2 = new Vector3();
const tq3 = new Quaternion();
const tq4 = new Quaternion();

/** (G7 fix round) The carried body faces the carrier (yaw PI in his chest frame): its belly over his shoulder, torso
 *  down his back, the hips flexed so the legs hang down his front (the 3.2.0 pose faced away and bent the hips 136 deg
 *  backward: a back-bend over the shoulder). */
export const SOCKET_YAW = Math.PI;

/** The carry socket in the carrier's chest frame: the root's Euler x (with `SOCKET_YAW`) and local position (the hips
 *  on the shoulder). */
export function socketLocal(rig: CharacterRig, shoulderX: number, shoulderY: number, out: { th: number; x: number; y: number; z: number }): void {
  const th = Math.PI - CARRY_TILT;
  const hy = rig.p.y.hip;
  out.th = th;
  out.x = shoulderX;
  // the body's up in the chest frame (yaw PI after the pitch): (0, cos th, -sin th); the root (feet) is the hips less it
  out.y = shoulderY - hy * Math.cos(th);
  out.z = hy * Math.sin(th);
}

function pitchJoint(n: TransformNode, x: number): void {
  Quaternion.RotationYawPitchRollToRef(0, x, 0, n.rotationQuaternion!);
}

/** The carry joints at share `k` (0 straight, 1 draped over the shoulder). */
export function carryJoints(rig: CharacterRig, k: number): void {
  pitchJoint(rig.hipL, -CARRY_HIP * k);
  pitchJoint(rig.hipR, -(CARRY_HIP - 0.12) * k);
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
  r.rotation.set(s.th, SOCKET_YAW, 0);
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

const JOINTS = new WeakMap<CharacterRig, TransformNode[]>();

/** (G7 fix round) The joints a hoist poses, parents first (the captured floor pose blends from these); cached per rig. */
export function hoistJoints(rig: CharacterRig): TransformNode[] {
  let j = JOINTS.get(rig);
  if (!j) {
    j = [rig.spine, rig.torso, rig.neck, rig.headNode, rig.shoulderL, rig.elbowL, rig.wristL, rig.shoulderR, rig.elbowR, rig.wristR, rig.hipL, rig.kneeL, rig.ankleL, rig.hipR, rig.kneeR, rig.ankleR];
    JOINTS.set(rig, j);
  }
  return j;
}

/** The hanging pose half way up (joint Euler x per `hoistJoints` index): arms and legs hanging, head dropped. */
const HANG_X = [0.1, 0.1, 0.4, 0, 0, 0, 0, 0, 0, 0, 0.15, 0.2, 0, 0.1, 0.25, 0];
/** The carry pose (as `carryJoints`) per `hoistJoints` index. */
const CARRY_X = [0, 0, 0.35, 0, CARRY_SHOULDER, 0, 0, CARRY_SHOULDER + 0.1, 0, 0, -CARRY_HIP, CARRY_KNEE, 0, -(CARRY_HIP - 0.12), CARRY_KNEE + 0.1, 0];

/**
 * (G7 fix round: the hoist began with the corpse straightened in one frame) The lying start of a hoist copied from the
 * corpse `src` (its ragdoll pose, world space) onto the fresh rig `dst`: the root where the corpse's pelvis lies and
 * turned as it is, every joint as it lies. Writes the root's world rotation into `outQ`, its position into `outPos`
 * and the joints' local rotations into `outJ` (`hoistJoints` order). Babylon: world = parent * local.
 */
export function captureLying(src: CharacterRig, dst: CharacterRig, outQ: Quaternion, outPos: Vector3, outJ: Quaternion[]): void {
  src.hips.computeWorldMatrix(true);
  const r = dst.root;
  r.parent = null;
  outQ.copyFrom(src.hips.absoluteRotationQuaternion).normalize();
  r.rotationQuaternion = (r.rotationQuaternion ?? new Quaternion()).copyFrom(outQ);
  UP.rotateByQuaternionToRef(outQ, tv2);
  const hp = src.hips.getAbsolutePosition();
  const hy = dst.p.y.hip;
  outPos.set(hp.x - tv2.x * hy, hp.y - tv2.y * hy, hp.z - tv2.z * hy);
  r.position.copyFrom(outPos);
  r.computeWorldMatrix(true);
  dst.body.computeWorldMatrix(true);
  dst.hips.computeWorldMatrix(true);
  const sj = hoistJoints(src);
  const dj = hoistJoints(dst);
  for (let i = 0; i < dj.length; i++) {
    const d = dj[i]!;
    const s = sj[i]!;
    s.computeWorldMatrix(true);
    const parent = d.parent as TransformNode;
    parent.computeWorldMatrix(true);
    Quaternion.InverseToRef(parent.absoluteRotationQuaternion, tq);
    tq.multiplyToRef(s.absoluteRotationQuaternion, d.rotationQuaternion!);
    d.rotationQuaternion!.normalize();
    outJ[i]!.copyFrom(d.rotationQuaternion!);
    d.computeWorldMatrix(true);
  }
}

/**
 * The hoist at `k` (G7 fix round, two halves): 0-0.5 the body is drawn up off the floor from how it lay to hanging
 * upright against the carrier's front on the carry side, legs down; 0.5-1 it tips over his shoulder, the hips onto the
 * carry socket, the legs folding down his front as the torso goes over (CT 110936 @ 41.8-42.6). `from` / `fromQ` /
 * `fromJ`: the captured lying pose (`captureLying`); `socket` a node on the carrier's chest at the socket; `side` 1 right
 * shoulder, -1 left.
 */
export function hoistAt(rig: CharacterRig, from: Vector3, fromQ: Quaternion, fromJ: Quaternion[], socket: TransformNode, side: number, k: number): void {
  socket.computeWorldMatrix(true);
  const sp = socket.getAbsolutePosition();
  socket.absoluteRotationQuaternion.normalizeToRef(tq2);
  const r = rig.root;
  const hy = rig.p.y.hip;
  const e = k < 0 ? 0 : k > 1 ? 1 : k;
  const chest = socket.parent as TransformNode | null;
  if (chest) chest.getDirectionToRef(FWD, tv);
  else tv.set(0, 0, 1);
  const fl = hyp2(tv.x, tv.z) || 1;
  const fx = tv.x / fl;
  const fz = tv.z / fl;
  // the carrier's right (fz, -fx)
  const rx = fz * side;
  const rz = -fx * side;
  // the socket's hips (world)
  UP.rotateByQuaternionToRef(tq2, tv2);
  const tx = sp.x + tv2.x * hy;
  const ty = sp.y + tv2.y * hy;
  const tz = sp.z + tv2.z * hy;
  // half way: upright against his front on the carry side, leaning onto him, the pelvis a little under the shoulder
  const mx = tx + fx * 0.32 + rx * 0.12;
  const my = ty - 0.4;
  UP.rotateByQuaternionToRef(fromQ, tv2);
  const fromUpY = tv2.y;
  const mz = tz + fz * 0.32 + rz * 0.12;
  Quaternion.RotationYawPitchRollToRef(Math.atan2(fx, fz) + Math.PI, 0.3, 0, tq3);
  let hx: number;
  let hyw: number;
  let hz: number;
  const J = hoistJoints(rig);
  if (e < 0.5) {
    const a = smooth(e / 0.5);
    UP.rotateByQuaternionToRef(fromQ, tv2);
    const fhx = from.x + tv2.x * hy;
    const fhy = from.y + tv2.y * hy;
    const fhz = from.z + tv2.z * hy;
    // up first, in second
    const upK = 1 - (1 - a) * (1 - a);
    const inK = a * a;
    hx = fhx + (mx - fhx) * inK;
    hyw = fhy + (my - fhy) * upK;
    hz = fhz + (mz - fhz) * inK;
    Quaternion.SlerpToRef(fromQ, tq3, a, tq);
    for (let i = 0; i < J.length; i++) {
      Quaternion.RotationYawPitchRollToRef(0, HANG_X[i]!, 0, tq4);
      Quaternion.SlerpToRef(fromJ[i]!, tq4, a, J[i]!.rotationQuaternion!);
    }
  } else {
    const b = smooth((e - 0.5) / 0.5);
    // over the shoulder: a bow up and out to the side mid-way, so the torso clears his head
    const bow = Math.sin(Math.PI * b);
    hx = mx + (tx - mx) * b + rx * 0.14 * bow;
    hyw = my + (ty - my) * b + 0.12 * bow;
    hz = mz + (tz - mz) * b + rz * 0.14 * bow;
    Quaternion.SlerpToRef(tq3, tq2, b, tq);
    for (let i = 0; i < J.length; i++) {
      Quaternion.RotationYawPitchRollToRef(0, HANG_X[i]! + (CARRY_X[i]! - HANG_X[i]!) * b, 0, J[i]!.rotationQuaternion!);
    }
  }
  UP.rotateByQuaternionToRef(tq, tv2);
  // the feet never through the floor (the floor: where the corpse's pelvis lay, less its lying height): the legs hang
  // about a hip height below the pelvis along its down
  const floorY = from.y + fromUpY * hy - 0.12;
  const minY = floorY + 0.04 + hy * Math.max(0, tv2.y) * 0.95;
  if (hyw < minY) hyw = minY;
  r.position.set(hx - tv2.x * hy, hyw - tv2.y * hy, hz - tv2.z * hy);
  r.rotationQuaternion = (r.rotationQuaternion ?? new Quaternion()).copyFrom(tq);
  // (exact: the posed feet, knees, hands and head over the floor, the root lifted by any shortfall)
  let low = 9;
  for (let i = 0; i < FEET.length; i++) {
    const n = FEET[i]!(rig);
    worldOf(n);
    low = Math.min(low, n.getAbsolutePosition().y);
  }
  if (low < floorY + 0.03) r.position.y += floorY + 0.03 - low;
}

function smooth(x: number): number {
  const e = x < 0 ? 0 : x > 1 ? 1 : x;
  return e * e * (3 - 2 * e);
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
  r.rotation.set(s0.th, SOCKET_YAW, 0.25 * e * side);
  tv.set(s0.x + 0.32 * e * side, s0.y - 0.2 * e, s0.z + 0.1 * e);
  r.position.copyFrom(tv);
  // (fix round) the legs stay folded over the shoulder as it slips (unfolding them swung them out level in front)
  carryJoints(rig, 1);
}

const FEET: ((r: CharacterRig) => TransformNode)[] = [(r) => r.ankleL, (r) => r.ankleR, (r) => r.kneeL, (r) => r.kneeR, (r) => r.wristL, (r) => r.wristR, (r) => r.headNode];

/** The node's world matrix fresh from the root down. */
function worldOf(n: TransformNode): void {
  const chain = WORLD_CHAIN;
  chain.length = 0;
  for (let q: TransformNode | null = n; q; q = q.parent as TransformNode | null) chain.push(q);
  for (let i = chain.length - 1; i >= 0; i--) chain[i]!.computeWorldMatrix(true);
}
const WORLD_CHAIN: TransformNode[] = [];
