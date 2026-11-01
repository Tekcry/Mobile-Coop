/**
 * Operator skeleton from the game rig, per frame, without allocating (step 11d, pure, no Babylon). The rig stays the
 * pose authority (SPEC 6.3): every frame its joints' local transforms go in, the operator joints' local transforms
 * come out and are copied into the TransformNodes the operator's bones are linked to (Bone.linkTransformNode).
 *
 * Same maths as the old Operator Lab's retarget (kept as tests/helpers/retargetReference.ts), rewritten on flat typed arrays and in
 * the rig root's space (the operator's root node sits under `rig.root`, so position and yaw come for free):
 * - each operator joint takes the root-space rotation of its rig joint (or of the nearest mapped ancestor: fingers,
 *   toes, hands) as a delta from the rig's rest (identity), after the A-pose arm chain is swung down to hang (D13);
 * - positions come from forward kinematics over the operator's own bind offsets, so her proportions hold;
 * - a mapped joint also takes its rig joint's translation away from rest (the pelvis drop, crouch, climb), rotated
 *   into root space: the rig's local delta, so a body tumble or a pelvis drop is never counted twice.
 * - (anim-skeleton S2) the clavicles are rig joints too (`clavL` / `clavR`, appended after the pre-T3 joints, parent the
 *   chest): an identity clavicle passes the chest's rotation through unchanged (copied, not multiplied), so every
 *   pre-T3 joint's output is bit-identical to before (A5). Per slot an extra rotation in the bind frame (`extraQ`,
 *   `extraOn`), chained down joints that share a driver (`chain`: the finger segments), and a move (`extraT`, the
 *   driver's frame): the finger curls and the goggle's gear offset. Slots with no extra take the old path exactly.
 */
import { hyp3 } from '../../core/mathx';
import { bindWorld, type GlbNode } from '../lab/glb';

/** Rig joints in a fixed order (CharacterRig node names) and each one's parent in this list. */
export const RIG_JOINTS = [
  'root', 'body', 'pelvis', 'spine', 'chest', 'neck', 'head', 'shL', 'elL', 'wrL', 'shR', 'elR', 'wrR',
  'hipL', 'knL', 'anL', 'hipR', 'knR', 'anR', 'toeL', 'toeR', 'clavL', 'clavR',
] as const;
export type RigJointName = (typeof RIG_JOINTS)[number];
/** (anim-rig) toeL / toeR (the ball of each foot, under the ankles) drive the LODs' skinned toe joints. */
export const RIG_PARENT: readonly number[] = [-1, 0, 1, 2, 3, 4, 5, 4, 7, 8, 4, 10, 11, 2, 13, 14, 2, 16, 17, 15, 18, 4, 4];
/** (anim-skeleton S2) The first rig joint added by T3 (the clavicles): the ones before it are the pre-T3 rig. */
export const RIG_T3 = 21;
/** Floats per joint in the rig input and the operator output: px py pz qx qy qz qw. */
export const TRS = 7;

/** Immutable per-file data, shared by every body that uses the file (co-op: both players are Wren). */
export interface PoserSetup {
  /** Node index of each slot (joints only, parents first). */
  node: Int32Array;
  names: string[];
  /** Slot of the nearest joint ancestor, -1 for a top joint. */
  parent: Int32Array;
  /** Rig joint index driving each slot (-1: none). */
  driver: Int32Array;
  /** 1 when the slot is the mapped joint itself (takes the rig's translation delta), else 0. Never for root. */
  self: Uint8Array;
  /** Bind world (= skeleton space) position (3) and rotation (4) per slot. */
  bindPos: Float64Array;
  bindRot: Float64Array;
  /** A-pose -> hanging correction per slot (identity outside the arms). */
  hang: Float64Array;
  /** Bind local transform per slot (TRS), relative to the parent slot: the bones' rest matrices. */
  bindLocal: Float64Array;
  /** (S2) The parent slot an extra rotation chains from (same driver, the parent not the driver's own joint), else -1. */
  chain: Int32Array;
}

const RIG_INDEX: Readonly<Record<string, number>> = Object.fromEntries(RIG_JOINTS.map((n, i) => [n, i]));
/** Scratch quaternion for the extra rotations (module level: no allocation in solve). */
const T4 = new Float64Array(4);

// ---- quaternion helpers on flat arrays (no allocation) ----

/** out[o..o+4] = a[ao] * b[bo]; out may alias neither input range. */
function qmulA(a: Float64Array, ao: number, b: Float64Array, bo: number, out: Float64Array, o: number): void {
  const ax = a[ao]!, ay = a[ao + 1]!, az = a[ao + 2]!, aw = a[ao + 3]!;
  const bx = b[bo]!, by = b[bo + 1]!, bz = b[bo + 2]!, bw = b[bo + 3]!;
  out[o] = aw * bx + ax * bw + ay * bz - az * by;
  out[o + 1] = aw * by - ax * bz + ay * bw + az * bx;
  out[o + 2] = aw * bz + ax * by - ay * bx + az * bw;
  out[o + 3] = aw * bw - ax * bx - ay * by - az * bz;
}

/** Rotates (x, y, z) by q[qo] (or its inverse) into out[o..o+3]. */
function qrotA(q: Float64Array, qo: number, inv: boolean, x: number, y: number, z: number, out: Float64Array, o: number): void {
  const s = inv ? -1 : 1;
  const qx = q[qo]! * s, qy = q[qo + 1]! * s, qz = q[qo + 2]! * s, qw = q[qo + 3]!;
  const tx = 2 * (qy * z - qz * y);
  const ty = 2 * (qz * x - qx * z);
  const tz = 2 * (qx * y - qy * x);
  out[o] = x + qw * tx + (qy * tz - qz * ty);
  out[o + 1] = y + qw * ty + (qz * tx - qx * tz);
  out[o + 2] = z + qw * tz + (qx * ty - qy * tx);
}

/** Shortest-arc rotation from direction a to b, written into out[o..o+4]. */
function arcA(ax: number, ay: number, az: number, bx: number, by: number, bz: number, out: Float64Array, o: number): void {
  const la = hyp3(ax, ay, az), lb = hyp3(bx, by, bz);
  const x = ax / la, y = ay / la, z = az / la, u = bx / lb, v = by / lb, w = bz / lb;
  const d = x * u + y * v + z * w;
  if (d < -0.999999) {
    out[o] = 0; out[o + 1] = 0; out[o + 2] = 1; out[o + 3] = 0;
    return;
  }
  const qx = y * w - z * v, qy = z * u - x * w, qz = x * v - y * u, qw = 1 + d;
  const n = Math.sqrt(qx * qx + qy * qy + qz * qz + qw * qw);
  out[o] = qx / n; out[o + 1] = qy / n; out[o + 2] = qz / n; out[o + 3] = qw / n;
}

/** Builds the shared setup from a parsed LOD file's node tree and skin (load time). */
export function poserSetup(nodes: readonly GlbNode[], joints: readonly number[]): PoserSetup {
  const isJoint = new Set(joints);
  const order: number[] = [];
  const seen = new Set<number>();
  const visit = (i: number): void => {
    if (seen.has(i)) return;
    const p = nodes[i]!.parent;
    if (p >= 0) visit(p);
    seen.add(i);
    if (isJoint.has(i)) order.push(i);
  };
  for (const j of joints) visit(j);
  const n = order.length;
  const slotOf = new Map(order.map((nd, s) => [nd, s] as const));
  const w = bindWorld(nodes);
  const node = Int32Array.from(order);
  const names = order.map((i) => nodes[i]!.name);
  const parent = new Int32Array(n);
  const driver = new Int32Array(n);
  const self = new Uint8Array(n);
  const bindPos = new Float64Array(n * 3);
  const bindRot = new Float64Array(n * 4);
  const hang = new Float64Array(n * 4);
  for (let s = 0; s < n; s++) {
    const i = order[s]!;
    let p = nodes[i]!.parent;
    while (p >= 0 && !isJoint.has(p)) p = nodes[p]!.parent;
    parent[s] = p >= 0 ? slotOf.get(p)! : -1;
    let k = i;
    while (k >= 0 && RIG_INDEX[nodes[k]!.name] === undefined) k = nodes[k]!.parent;
    driver[s] = k >= 0 ? RIG_INDEX[nodes[k]!.name]! : -1;
    self[s] = k === i && nodes[i]!.name !== 'root' ? 1 : 0;
    const bp = w.pos[i]!, br = w.rot[i]!;
    bindPos.set(bp, s * 3);
    bindRot.set(br, s * 4);
    hang[s * 4 + 3] = 1;
  }
  // the A-pose arms swung down to hang along -Y, as the rig's arms rest: the upper arm by its own direction and
  // (feature/weapons) the forearm chain by the forearm's, so the bind pose's bent elbow (about 35 degrees on Wren) is
  // straightened as the rig's rest arm is and her wrists land on the rig's (they missed it by 16 cm: hands off the grip)
  const down = (a: number, b: number, q: Float64Array): void =>
    arcA(bindPos[b * 3]! - bindPos[a * 3]!, bindPos[b * 3 + 1]! - bindPos[a * 3 + 1]!, bindPos[b * 3 + 2]! - bindPos[a * 3 + 2]!, 0, -1, 0, q, 0);
  for (const side of ['L', 'R']) {
    const sh = names.indexOf(`sh${side}`);
    const el = names.indexOf(`el${side}`);
    const wr = names.indexOf(`wr${side}`);
    if (sh < 0 || el < 0) continue;
    const qu = new Float64Array(4);
    down(sh, el, qu);
    const qf = new Float64Array(4);
    if (wr >= 0) down(el, wr, qf);
    else qf.set(qu);
    for (let s = 0; s < n; s++) {
      const nm = names[s]!;
      if (nm === `sh${side}`) hang.set(qu, s * 4);
      else if (nm === `el${side}` || nm === `wr${side}` || nm === `hand${side}` || nm.startsWith(`finger${side}_`)) hang.set(qf, s * 4);
    }
  }
  const bindLocal = new Float64Array(n * TRS);
  for (let s = 0; s < n; s++) localOf(parent[s]!, s, bindPos, bindRot, bindLocal);
  const chain = new Int32Array(n).fill(-1);
  for (let s = 0; s < n; s++) {
    const p = parent[s]!;
    if (p >= 0 && driver[s]! >= 0 && driver[p] === driver[s] && !self[p]) chain[s] = p;
  }
  return { node, names, parent, driver, self, bindPos, bindRot, hang, bindLocal, chain };
}

/** Local TRS of slot s under slot p (or root space when p < 0) from world positions / rotations, into out. */
function localOf(p: number, s: number, pos: Float64Array, rot: Float64Array, out: Float64Array): void {
  const o = s * TRS;
  if (p < 0) {
    out[o] = pos[s * 3]!; out[o + 1] = pos[s * 3 + 1]!; out[o + 2] = pos[s * 3 + 2]!;
    out[o + 3] = rot[s * 4]!; out[o + 4] = rot[s * 4 + 1]!; out[o + 5] = rot[s * 4 + 2]!; out[o + 6] = rot[s * 4 + 3]!;
    return;
  }
  qrotA(rot, p * 4, true, pos[s * 3]! - pos[p * 3]!, pos[s * 3 + 1]! - pos[p * 3 + 1]!, pos[s * 3 + 2]! - pos[p * 3 + 2]!, out, o);
  // inverse(parent) * child
  const px = -rot[p * 4]!, py = -rot[p * 4 + 1]!, pz = -rot[p * 4 + 2]!, pw = rot[p * 4 + 3]!;
  const bx = rot[s * 4]!, by = rot[s * 4 + 1]!, bz = rot[s * 4 + 2]!, bw = rot[s * 4 + 3]!;
  out[o + 3] = pw * bx + px * bw + py * bz - pz * by;
  out[o + 4] = pw * by - px * bz + py * bw + pz * bx;
  out[o + 5] = pw * bz + px * by - py * bx + pz * bw;
  out[o + 6] = pw * bw - px * bx - py * by - pz * bz;
}

/** One body's poser: its own work buffers over a shared setup. `solve` allocates nothing. */
export class OperatorPoser {
  /** Output: local TRS per slot (copy into the linked TransformNodes). */
  readonly out: Float64Array;
  private readonly rigRest = new Float64Array(RIG_JOINTS.length * 3);
  private readonly rigRot = new Float64Array(RIG_JOINTS.length * 4);
  private readonly rigMove = new Float64Array(RIG_JOINTS.length * 3);
  private readonly posing: Float64Array;
  private readonly pos: Float64Array;
  private readonly rot: Float64Array;
  private readonly tmp = new Float64Array(3);
  private hasRest = false;
  /**
   * (anim-skeleton S2) Per slot: a rotation in the bind frame about the joint (identity: 0 0 0 1), applied under the
   * rig's drive and chained down `setup.chain` (a finger's segments), and a move (m) in the driver's frame. Only slots
   * with `extraOn` (or a chained parent with it) use them; the caller sets them before `solve`.
   */
  readonly extraQ: Float64Array;
  readonly extraT: Float64Array;
  readonly extraOn: Uint8Array;
  /** Whether each slot took an extra this solve, and its chained bind-frame rotation. */
  private readonly act: Uint8Array;
  private readonly chainQ: Float64Array;

  constructor(readonly setup: PoserSetup) {
    const n = setup.node.length;
    this.out = new Float64Array(setup.bindLocal);
    this.posing = new Float64Array(n * 4);
    this.pos = new Float64Array(n * 3);
    this.rot = new Float64Array(n * 4);
    this.extraQ = new Float64Array(n * 4);
    for (let s = 0; s < n; s++) this.extraQ[s * 4 + 3] = 1;
    this.extraT = new Float64Array(n * 3);
    this.extraOn = new Uint8Array(n);
    this.act = new Uint8Array(n);
    this.chainQ = new Float64Array(n * 4);
  }

  /** The rig's rest translations (its local positions when built, before any pose): translation deltas start here. */
  setRest(rig: Float64Array): void {
    for (let j = 0; j < RIG_JOINTS.length; j++) {
      this.rigRest[j * 3] = rig[j * TRS]!;
      this.rigRest[j * 3 + 1] = rig[j * TRS + 1]!;
      this.rigRest[j * 3 + 2] = rig[j * TRS + 2]!;
    }
    this.hasRest = true;
  }

  /** Poses every slot from the rig's local transforms (RIG_JOINTS order, TRS each). */
  solve(rig: Float64Array): Float64Array {
    if (!this.hasRest) this.setRest(rig);
    const R = this.rigRot, M = this.rigMove, rest = this.rigRest, t = this.tmp;
    // rig: root-space rotations by FK (root itself = identity: the operator's root node sits under rig.root)
    R[0] = 0; R[1] = 0; R[2] = 0; R[3] = 1;
    M[0] = 0; M[1] = 0; M[2] = 0;
    for (let j = 1; j < RIG_JOINTS.length; j++) {
      const p = RIG_PARENT[j]!;
      const o = j * TRS + 3;
      // (S2) a T3 joint at identity (an untouched clavicle) passes its parent's rotation through exactly
      if (j >= RIG_T3 && rig[o] === 0 && rig[o + 1] === 0 && rig[o + 2] === 0 && rig[o + 3] === 1) {
        R[j * 4] = R[p * 4]!; R[j * 4 + 1] = R[p * 4 + 1]!; R[j * 4 + 2] = R[p * 4 + 2]!; R[j * 4 + 3] = R[p * 4 + 3]!;
      } else qmulA(R, p * 4, rig, o, R, j * 4);
      // the joint's translation away from rest, in root space (parent's rotation)
      qrotA(R, p * 4, false, rig[j * TRS]! - rest[j * 3]!, rig[j * TRS + 1]! - rest[j * 3 + 1]!, rig[j * TRS + 2]! - rest[j * 3 + 2]!, M, j * 3);
    }
    const S = this.setup, P = this.posing, pos = this.pos, rot = this.rot;
    const n = S.node.length;
    const XQ = this.extraQ, XT = this.extraT, on = this.extraOn, act = this.act, C = this.chainQ;
    for (let s = 0; s < n; s++) {
      const k = S.driver[s]!;
      if (k >= 0) qmulA(R, k * 4, S.hang, s * 4, P, s * 4);
      else { P[s * 4] = S.hang[s * 4]!; P[s * 4 + 1] = S.hang[s * 4 + 1]!; P[s * 4 + 2] = S.hang[s * 4 + 2]!; P[s * 4 + 3] = S.hang[s * 4 + 3]!; }
      // (S2) an extra rotation (bind frame), chained from the parent's: posing = drive x chain
      const c = S.chain[s]!;
      const up = c >= 0 && act[c] === 1;
      act[s] = on[s] === 1 || up ? 1 : 0;
      if (act[s] === 1) {
        if (!up) { C[s * 4] = XQ[s * 4]!; C[s * 4 + 1] = XQ[s * 4 + 1]!; C[s * 4 + 2] = XQ[s * 4 + 2]!; C[s * 4 + 3] = XQ[s * 4 + 3]!; }
        else if (on[s] === 1) qmulA(C, c * 4, XQ, s * 4, C, s * 4);
        else { C[s * 4] = C[c * 4]!; C[s * 4 + 1] = C[c * 4 + 1]!; C[s * 4 + 2] = C[c * 4 + 2]!; C[s * 4 + 3] = C[c * 4 + 3]!; }
        qmulA(P, s * 4, C, s * 4, T4, 0);
        P[s * 4] = T4[0]!; P[s * 4 + 1] = T4[1]!; P[s * 4 + 2] = T4[2]!; P[s * 4 + 3] = T4[3]!;
      }
      qmulA(P, s * 4, S.bindRot, s * 4, rot, s * 4);
      const p = S.parent[s]!;
      if (p < 0) {
        pos[s * 3] = S.bindPos[s * 3]!; pos[s * 3 + 1] = S.bindPos[s * 3 + 1]!; pos[s * 3 + 2] = S.bindPos[s * 3 + 2]!;
      } else {
        qrotA(P, p * 4, false, S.bindPos[s * 3]! - S.bindPos[p * 3]!, S.bindPos[s * 3 + 1]! - S.bindPos[p * 3 + 1]!, S.bindPos[s * 3 + 2]! - S.bindPos[p * 3 + 2]!, t, 0);
        pos[s * 3] = pos[p * 3]! + t[0]!; pos[s * 3 + 1] = pos[p * 3 + 1]! + t[1]!; pos[s * 3 + 2] = pos[p * 3 + 2]! + t[2]!;
      }
      if (S.self[s] && k >= 0) {
        pos[s * 3] = pos[s * 3]! + M[k * 3]!; pos[s * 3 + 1] = pos[s * 3 + 1]! + M[k * 3 + 1]!; pos[s * 3 + 2] = pos[s * 3 + 2]! + M[k * 3 + 2]!;
      }
      if (on[s] === 1 && k >= 0 && (XT[s * 3] !== 0 || XT[s * 3 + 1] !== 0 || XT[s * 3 + 2] !== 0)) {
        qrotA(R, k * 4, false, XT[s * 3]!, XT[s * 3 + 1]!, XT[s * 3 + 2]!, t, 0);
        pos[s * 3] = pos[s * 3]! + t[0]!; pos[s * 3 + 1] = pos[s * 3 + 1]! + t[1]!; pos[s * 3 + 2] = pos[s * 3 + 2]! + t[2]!;
      }
    }
    for (let s = 0; s < n; s++) localOf(S.parent[s]!, s, pos, rot, this.out);
    return this.out;
  }

  /** Root-space position of a slot after the last solve (tests, attachment points). */
  worldPos(slot: number, out: [number, number, number]): [number, number, number] {
    out[0] = this.pos[slot * 3]!; out[1] = this.pos[slot * 3 + 1]!; out[2] = this.pos[slot * 3 + 2]!;
    return out;
  }
}
