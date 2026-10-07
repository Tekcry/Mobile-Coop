import { Mesh, VertexData, type Material, type Scene, type TransformNode } from '../core/babylon';
import type { BodyMesh } from './voxelModelBuilder';
import { SkinnedVoxels } from './voxelBody';

/**
 * A character skin built by `VoxelModelBuilder` (3.2): one continuous smooth mesh, skinned to the rig's joints with
 * up to four weighted joints per vertex, so the body bends smoothly. One mesh per character (the head on its own for
 * the player's camera fade) on the shared skin material: one draw per mesh and pass. Colour and surface per vertex
 * from the palette.
 */
export interface FigurePalette {
  /** Per colour value: colour (linear for PBR materials), 0..1. */
  rgb: readonly (readonly [number, number, number])[];
  /** Per colour value: the procedural surface id (`pattern.z`). */
  surface: readonly number[];
}

interface Arrays {
  P: Float32Array;
  N: Float32Array;
  I: Uint32Array;
  C: Float32Array;
  PT: Float32Array;
  C2: Float32Array;
  MI: Float32Array;
  MW: Float32Array;
}

/** Vertex data per (model key, mesh): built once, shared by every character wearing the model. */
const CACHE = new Map<string, Arrays>();

/** The triangles whose three vertices `keep` takes, with the vertices they use (renumbered). */
function split(body: BodyMesh, keep: (v: number) => boolean, pal: FigurePalette): Arrays {
  const remap = new Int32Array(body.positions.length / 3).fill(-1);
  const tri: number[] = [];
  for (let t = 0; t < body.indices.length; t += 3) {
    const a = body.indices[t]!;
    const b = body.indices[t + 1]!;
    const c = body.indices[t + 2]!;
    if (keep(a) && keep(b) && keep(c)) tri.push(a, b, c);
  }
  let n = 0;
  for (const v of tri) if (remap[v] === -1) remap[v] = n++;
  const a: Arrays = {
    P: new Float32Array(n * 3),
    N: new Float32Array(n * 3),
    I: Uint32Array.from(tri, (v) => remap[v]!),
    C: new Float32Array(n * 4),
    PT: new Float32Array(n * 4),
    C2: new Float32Array(n * 4),
    MI: new Float32Array(n * 4),
    MW: new Float32Array(n * 4),
  };
  for (let v = 0; v < remap.length; v++) {
    const o = remap[v]!;
    if (o < 0) continue;
    for (let i = 0; i < 3; i++) {
      a.P[o * 3 + i] = body.positions[v * 3 + i]!;
      a.N[o * 3 + i] = body.normals[v * 3 + i]!;
    }
    const val = body.colors[v]!;
    const c = pal.rgb[val] ?? [1, 1, 1];
    a.C.set([c[0], c[1], c[2], 1], o * 4);
    a.PT.set([0, 1, pal.surface[val] ?? 0, 0], o * 4);
    a.C2.set([0, 0, 0, 1], o * 4);
    for (let i = 0; i < 4; i++) {
      a.MI[o * 4 + i] = body.boneIdx[v * 4 + i]!;
      a.MW[o * 4 + i] = body.boneW[v * 4 + i]!;
    }
  }
  return a;
}

export class VoxelFigure extends SkinnedVoxels {
  constructor(
    scene: Scene,
    root: TransformNode,
    /** The joints in the body's bone order, posed in the bind pose the body was built in. */
    joints: readonly TransformNode[],
    body: BodyMesh,
    material: Material,
    name: string,
    palette: FigurePalette,
    /** Cache key of the model (body + palette): characters wearing it share the vertex data. */
    key: string,
    /** Bone index of the head (split figures put the triangles bound to it on their own mesh). */
    headBone: number,
    splitHead = true,
  ) {
    super(scene, root, name);
    for (const j of joints) this.boneFor(j, name);
    for (const head of splitHead ? [false, true] : [null]) {
      const ck = `${key}|${head}`;
      let a = CACHE.get(ck);
      if (!a) CACHE.set(ck, (a = split(body, head === null ? () => true : (v) => (body.dominant[v] === headBone) === head, palette)));
      const mesh = new Mesh(`${name}-skin${head ? '-head' : ''}`, scene);
      const vd = new VertexData();
      vd.positions = a.P;
      vd.normals = a.N;
      vd.indices = a.I;
      vd.colors = a.C;
      vd.matricesIndices = a.MI;
      vd.matricesWeights = a.MW;
      vd.applyToMesh(mesh, true);
      mesh.setVerticesData('pattern', a.PT, false, 4);
      mesh.setVerticesData('color2', a.C2, false, 4);
      mesh.parent = root;
      mesh.skeleton = this.skeleton;
      mesh.numBoneInfluencers = 4;
      mesh.material = material;
      mesh.isPickable = false;
      mesh.receiveShadows = true;
      // the skinned bounds move with the rig: never culled away by a stale box
      mesh.alwaysSelectAsActiveMesh = true;
      this.meshes.push(mesh);
      this.baseColors.set(mesh, new Float32Array(a.C));
    }
    this.split = splitHead;
  }

  /** Triangles over the figure's meshes. */
  get triangles(): number {
    let n = 0;
    for (const m of this.meshes) n += (m.getTotalIndices() / 3) | 0;
    return n;
  }
}
