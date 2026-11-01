/**
 * (Test reference: the removed Operator Lab's retarget, kept so tests/operatorsRuntime.test.ts can check the runtime
 * poser, src/operators/runtime/pose.ts, against an independent implementation.)
 * Drives the operator skeleton from the game's CharacterRig (pure maths, no Babylon). The rig stands with its arms
 * hanging; the operator is bound in an A-pose (D13). Each mapped joint takes the rig node's world rotation as a delta
 * from the rig's rest (identity) after the A-pose arm chain has been swung down to hang (`hang`); unmapped joints
 * (fingers, toes, hero end points) follow their nearest mapped ancestor. Positions come from forward kinematics over
 * the bind offsets, so the operator's own proportions hold; only root, body and pelvis take the rig's translation.
 */
import { qinv, qmul, rotate, type GlbNode, type Quat, type V3 } from '../../src/operators/lab/glb';

/** Operator joint name to the rig node (the names `CharacterRig` gives its nodes, without the rig prefix). */
export const JOINT_TO_RIG: Readonly<Record<string, string>> = {
  root: 'root', body: 'body', pelvis: 'pelvis', spine: 'spine', chest: 'chest', neck: 'neck', head: 'head',
  shL: 'shL', elL: 'elL', wrL: 'wrL', shR: 'shR', elR: 'elR', wrR: 'wrR',
  hipL: 'hipL', knL: 'knL', anL: 'anL', hipR: 'hipR', knR: 'knR', anR: 'anR',
};

const IDENT: Quat = [0, 0, 0, 1];

/** Shortest-arc rotation taking direction `a` to direction `b` (both non-zero). */
export function arc(a: V3, b: V3): Quat {
  const la = Math.hypot(a[0], a[1], a[2]);
  const lb = Math.hypot(b[0], b[1], b[2]);
  const x = a[0] / la, y = a[1] / la, z = a[2] / la;
  const u = b[0] / lb, v = b[1] / lb, w = b[2] / lb;
  const d = x * u + y * v + z * w;
  if (d < -0.999999) return [0, 0, 1, 0];
  const q: Quat = [y * w - z * v, z * u - x * w, x * v - y * u, 1 + d];
  const n = Math.hypot(q[0], q[1], q[2], q[3]);
  return [q[0] / n, q[1] / n, q[2] / n, q[3] / n];
}

export interface Retarget {
  /** Joint node indices, parents first. */
  order: number[];
  /** Per node: the nearest mapped ancestor-or-self name (a key of JOINT_TO_RIG), or '' for none. */
  driver: string[];
  /** Per node: the A-pose to hanging correction (identity outside the arms). */
  hang: Quat[];
}

export function buildRetarget(nodes: readonly GlbNode[], bindPos: readonly V3[], jointNodes: readonly number[]): Retarget {
  const set = new Set(jointNodes);
  const order: number[] = [];
  const seen = new Set<number>();
  const visit = (i: number): void => {
    if (seen.has(i)) return;
    const p = nodes[i]!.parent;
    if (p >= 0) visit(p);
    seen.add(i);
    if (set.has(i)) order.push(i);
  };
  for (const j of jointNodes) visit(j);
  const driver = nodes.map((_, i) => {
    let k = i;
    while (k >= 0 && !(nodes[k]!.name in JOINT_TO_RIG)) k = nodes[k]!.parent;
    return k >= 0 ? nodes[k]!.name : '';
  });
  const byName = new Map(nodes.map((n, i) => [n.name, i] as const));
  const hang: Quat[] = nodes.map(() => IDENT);
  for (const s of ['L', 'R']) {
    const sh = byName.get(`sh${s}`);
    const el = byName.get(`el${s}`);
    if (sh === undefined || el === undefined) continue;
    const a = bindPos[sh]!;
    const b = bindPos[el]!;
    const q = arc([b[0] - a[0], b[1] - a[1], b[2] - a[2]], [0, -1, 0]);
    // (feature/weapons) the forearm chain by the forearm's own direction: the bind pose's bent elbow straightened
    const wr = byName.get(`wr${s}`);
    const c = wr !== undefined ? bindPos[wr]! : null;
    const qf = c ? arc([c[0] - b[0], c[1] - b[1], c[2] - b[2]], [0, -1, 0]) : q;
    nodes.forEach((n, i) => {
      const nm = n.name;
      if (nm === `sh${s}`) hang[i] = q;
      else if (nm === `el${s}` || nm === `wr${s}` || nm === `hand${s}` || nm.startsWith(`finger${s}_`)) hang[i] = qf;
    });
  }
  return { order, driver, hang };
}

/** What the rig says about one of its nodes: world rotation, and for root / body / pelvis the move away from rest. */
export interface RigJoint {
  rot: Quat;
  move: V3;
}

/** The posed world rotation and position of every joint node; `rig` looks a rig node up by name. */
export function poseSkeleton(
  nodes: readonly GlbNode[], bindPos: readonly V3[], bindRot: readonly Quat[], rt: Retarget,
  rig: (name: string) => RigJoint | null, outPos: V3[], outRot: Quat[],
): void {
  const posing: Quat[] = [];
  for (const i of rt.order) {
    const key = rt.driver[i]!;
    const d = key ? rig(JOINT_TO_RIG[key]!) : null;
    const q = d ? qmul(d.rot, rt.hang[i]!) : rt.hang[i]!;
    posing[i] = q;
    outRot[i] = qmul(q, bindRot[i]!);
    const p = nodes[i]!.parent;
    const bp = bindPos[i]!;
    if (p < 0 || posing[p] === undefined) {
      outPos[i] = [bp[0], bp[1], bp[2]];
    } else {
      const pp = bindPos[p]!;
      const off = rotate(posing[p]!, [bp[0] - pp[0], bp[1] - pp[1], bp[2] - pp[2]]);
      const o = outPos[p]!;
      outPos[i] = [o[0] + off[0], o[1] + off[1], o[2] + off[2]];
    }
    if (d && (key === 'root' || key === 'body' || key === 'pelvis')) {
      const o = outPos[i]!;
      outPos[i] = [o[0] + d.move[0], o[1] + d.move[1], o[2] + d.move[2]];
    }
  }
}

/** Local rotation and translation of node `i` under its parent, from posed world values (for TransformNodes). */
export function toLocal(parentPos: V3, parentRot: Quat, pos: V3, rot: Quat): { t: V3; r: Quat } {
  const inv = qinv(parentRot);
  return { t: rotate(inv, [pos[0] - parentPos[0], pos[1] - parentPos[1], pos[2] - parentPos[2]]), r: qmul(inv, rot) };
}
