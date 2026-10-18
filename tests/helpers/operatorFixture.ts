/** Step 11d test fixture: an operator-like skeleton (game frame), shared by the operator runtime tests. */
import type { GlbNode, Quat, V3 } from '../../src/operators/lab/glb';

/** An operator-like skeleton in the game frame: A-pose arms, a container node, a hero finger and a hand helper. */
export function operatorNodes(): { nodes: GlbNode[]; joints: number[] } {
  const I: Quat = [0, 0, 0, 1];
  const list: [string, string | null, V3, Quat?][] = [
    ['rig', null, [0, 0, 0]],
    ['root', 'rig', [0, 0, 0]],
    ['body', 'root', [0, 0.55, 0]],
    ['pelvis', 'body', [0, 0.33, 0]],
    ['spine', 'pelvis', [0, 0.12, 0]],
    ['chest', 'spine', [0, 0.14, 0]],
    ['neck', 'chest', [0, 0.25, 0.01]],
    ['head', 'neck', [0, 0.12, 0.01]],
    ['shL', 'chest', [-0.18, 0.2, -0.01]],
    ['elL', 'shL', [-0.2, -0.17, 0]],
    ['wrL', 'elL', [-0.18, -0.15, 0]],
    ['handL', 'wrL', [-0.06, -0.05, 0]],
    ['fingerL_1_1', 'wrL', [-0.07, -0.07, 0.02]],
    ['shR', 'chest', [0.18, 0.2, -0.01]],
    ['elR', 'shR', [0.2, -0.17, 0]],
    ['wrR', 'elR', [0.18, -0.15, 0]],
    ['hipL', 'pelvis', [-0.09, -0.03, 0]],
    ['knL', 'hipL', [0, -0.42, 0]],
    ['anL', 'knL', [0, -0.41, 0]],
    ['toeL', 'anL', [0, -0.05, 0.13]],
    ['hipR', 'pelvis', [0.09, -0.03, 0]],
    ['knR', 'hipR', [0, -0.42, 0]],
    ['anR', 'knR', [0, -0.41, 0]],
  ];
  const idx = new Map(list.map((l, i) => [l[0], i] as const));
  const nodes: GlbNode[] = list.map(([name, parent, t, r]) => ({ name, parent: parent ? idx.get(parent)! : -1, t, r: r ?? I }));
  // a slight bind twist on the left elbow, as a real export has
  nodes[idx.get('elL')!]!.r = [0, Math.sin(0.1), 0, Math.cos(0.1)];
  const joints = list.map((_, i) => i).filter((i) => i > 0);
  return { nodes, joints };
}

