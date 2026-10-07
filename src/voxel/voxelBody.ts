import { Bone, Matrix, Mesh, Quaternion, Skeleton, Vector3, VertexBuffer, VertexData, type AbstractMesh, type Color4, type InstancedMesh, type Material, type Observer, type Scene, type TransformNode } from '../core/babylon';
import { greedyMesh } from './mesher';
import { boundsOf, fillMesh, withApron, type GridSpec } from './meshVoxels';

/**
 * Voxel characters (3.0): a rig's smooth parts (kept, invisible: hit volumes, clearances, the LKP ghost and sonar
 * read them) voxelised at `size` in the world - every part hanging from one joint in one grid in that joint's space
 * (a later part over an earlier one: the balaclava over the head, a pouch over the carrier), meshed per part (greedy,
 * faces between parts culled) - merged into one mesh per character (the head on its own, for the camera's head fade)
 * and skinned rigidly to the joints. Colour, pattern and surface per vertex as the instances had them. A second,
 * coarser pair (`lodSize`) takes over at `lodDistance`.
 */
export interface VoxelBodyOptions {
  size: number;
  lodSize: number;
  lodDistance: number;
}

export interface JointQuads {
  /** Joint-space quads (positions, normals, indices) of every part on a joint, shared by characters of one look. */
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
  /** Per vertex: the position in the joint's voxel grid, half a voxel inside its face (`VoxelBodyPlugin`). */
  vox: Float32Array;
  /** Per vertex: which of the joint's parts (index into its list) the voxel belongs to. */
  slot: Uint8Array;
}

/** Voxelised joints per (parts, voxel size): characters of one look and build share them. */
const CACHE = new Map<string, JointQuads | null>();

const tmpQ = new Quaternion();

function partLocal(part: AbstractMesh): Matrix {
  const q = part.rotationQuaternion ?? Quaternion.FromEulerVectorToRef(part.rotation, tmpQ);
  return Matrix.Compose(part.scaling, q, part.position);
}

/** Voxelise every part on one joint (joint space; `scale` = the joint's world scale, so the voxels are `size` cubes). */
export function jointQuads(parts: readonly AbstractMesh[], scale: number, size: number): JointQuads | null {
  const srcs = parts.map((p) => (p as InstancedMesh).sourceMesh as Mesh | undefined);
  const key = `${size}|${scale.toFixed(4)}|${parts.map((p, i) => `${srcs[i]?.name}:${Array.from(partLocal(p).m, (v) => v.toFixed(4)).join(',')}`).join(';')}`;
  if (CACHE.has(key)) return CACHE.get(key)!;
  // every part's unit mesh in joint space
  const meshes: { pos: Float32Array; idx: ArrayLike<number> }[] = [];
  const v = new Vector3();
  for (let i = 0; i < parts.length; i++) {
    const src = srcs[i];
    const pos = src?.getVerticesData(VertexBuffer.PositionKind);
    const idx = src?.getIndices();
    if (!pos || !idx) {
      meshes.push({ pos: new Float32Array(0), idx: [] });
      continue;
    }
    const m = partLocal(parts[i]!);
    const out = new Float32Array(pos.length);
    for (let k = 0; k < pos.length; k += 3) {
      Vector3.TransformCoordinatesFromFloatsToRef(pos[k]!, pos[k + 1]!, pos[k + 2]!, m, v);
      out[k] = v.x;
      out[k + 1] = v.y;
      out[k + 2] = v.z;
    }
    meshes.push({ pos: out, idx });
  }
  const all = meshes.filter((m) => m.pos.length);
  if (!all.length) {
    CACHE.set(key, null);
    return null;
  }
  const b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (const m of all) {
    const mb = boundsOf(m.pos);
    for (let a = 0; a < 3; a++) {
      b[a] = Math.min(b[a]!, mb[a]!);
      b[a + 3] = Math.max(b[a + 3]!, mb[a + 3]!);
    }
  }
  const cs = size / scale;
  const n = [0, 1, 2].map((a) => Math.max(1, Math.round((b[a + 3]! - b[a]!) / cs)));
  const g: GridSpec = { nx: n[0]!, ny: n[1]!, nz: n[2]!, origin: [0, 1, 2].map((a) => (b[a]! + b[a + 3]!) / 2 - (n[a]! * cs) / 2) as [number, number, number], cell: [cs, cs, cs] };
  const cells = new Uint8Array(g.nx * g.ny * g.nz);
  // later parts over earlier ones (gear over the body); values are slot + 1
  for (let i = 0; i < meshes.length; i++) if (meshes[i]!.pos.length) fillMesh(meshes[i]!.pos, meshes[i]!.idx, g, cells, i + 1);
  const mesh = greedyMesh(withApron(g, cells), g.nx, g.ny, g.nz, [0, 0, 0], 1, true);
  const vox = new Float32Array(mesh.positions.length);
  const slot = new Uint8Array(mesh.positions.length / 3);
  for (let i = 0; i < mesh.positions.length; i++) vox[i] = mesh.positions[i]! - mesh.normals[i]! * 0.5;
  for (let q = 0; q < mesh.quads; q++) slot.fill(mesh.values![q]! - 1, q * 4, q * 4 + 4);
  for (let i = 0; i < mesh.positions.length; i += 3) for (let a = 0; a < 3; a++) mesh.positions[i + a] = g.origin[a]! + mesh.positions[i + a]! * cs;
  const jq = { positions: mesh.positions, normals: mesh.normals, indices: mesh.indices, vox, slot };
  CACHE.set(key, jq);
  return jq;
}

/** Collects voxel quads of part groups into one mesh's vertex data (colour, pattern, `color2`, `vox`, bone). */
export class VoxelSink {
  readonly P: number[] = [];
  readonly N: number[] = [];
  readonly I: number[] = [];
  readonly C: number[] = [];
  readonly PT: number[] = [];
  readonly C2: number[] = [];
  readonly MI: number[] = [];
  readonly VX: number[] = [];
  private verts = new Map<number, number[]>();
  private v = new Vector3();
  private nv = new Vector3();

  /** Append `q` (in the space `m` maps to the mesh's); `list` maps its slots to indices into `parts`. */
  add(q: JointQuads, list: readonly number[], parts: readonly AbstractMesh[], m: Matrix, bone: number, seed: number): void {
    const nm = m.clone();
    nm.setTranslationFromFloats(0, 0, 0);
    const { v, nv } = this;
    const base = this.P.length / 3;
    for (let i = 0; i < q.positions.length; i += 3) {
      const vi = i / 3;
      const pi = list[q.slot[vi]!]!;
      const inst = parts[pi] as InstancedMesh;
      const col = inst.instancedBuffers?.color as Color4 | undefined;
      const pat = inst.instancedBuffers?.pattern as { x: number; y: number; z: number; w: number } | undefined;
      const c2 = inst.instancedBuffers?.color2 as Color4 | undefined;
      Vector3.TransformCoordinatesFromFloatsToRef(q.positions[i]!, q.positions[i + 1]!, q.positions[i + 2]!, m, v);
      Vector3.TransformNormalFromFloatsToRef(q.normals[i]!, q.normals[i + 1]!, q.normals[i + 2]!, nm, nv);
      nv.normalize();
      this.P.push(v.x, v.y, v.z);
      this.N.push(nv.x, nv.y, nv.z);
      this.C.push(col?.r ?? 1, col?.g ?? 1, col?.b ?? 1, 1);
      this.PT.push(pat?.x ?? 0, pat?.y ?? 1, pat?.z ?? 0, pat?.w ?? 0);
      this.C2.push(c2?.r ?? 0, c2?.g ?? 0, c2?.b ?? 0, 1);
      this.MI.push(bone, 0, 0, 0);
      this.VX.push(q.vox[i]! + seed * 131, q.vox[i + 1]!, q.vox[i + 2]! + seed * 71);
      let vl = this.verts.get(pi);
      if (!vl) this.verts.set(pi, (vl = []));
      vl.push(base + vi);
    }
    for (let i = 0; i < q.indices.length; i++) this.I.push(base + q.indices[i]!);
  }

  /** Each part's vertices (lens glow, recolours). */
  partVerts(): Map<number, Uint32Array> {
    return new Map([...this.verts].map(([k, l]) => [k, Uint32Array.from(l)]));
  }

  /** The mesh (skinned rigidly when a skeleton is given), parented to `parent`. */
  mesh(name: string, scene: Scene, material: Material, parent: TransformNode, skeleton: Skeleton | null): Mesh {
    const mesh = new Mesh(name, scene);
    if (this.P.length) {
      const vd = new VertexData();
      vd.positions = this.P;
      vd.normals = this.N;
      vd.indices = this.I;
      vd.colors = this.C;
      if (skeleton) {
        vd.matricesIndices = this.MI;
        vd.matricesWeights = this.MI.map((_, i) => (i % 4 === 0 ? 1 : 0));
      }
      vd.applyToMesh(mesh, true);
      mesh.setVerticesData('pattern', this.PT, false, 4);
      mesh.setVerticesData('color2', this.C2, false, 4);
      mesh.setVerticesData('vox', this.VX, false, 3);
    }
    mesh.parent = parent;
    if (skeleton) {
      mesh.skeleton = skeleton;
      mesh.numBoneInfluencers = 1;
    }
    mesh.material = material;
    mesh.isPickable = false;
    mesh.receiveShadows = true;
    return mesh;
  }
}

export class VoxelBody {
  readonly skeleton: Skeleton;
  /** [body, head] at full size, then the level-of-detail pair (one body and its LOD when the head is not split). */
  readonly meshes: Mesh[] = [];
  /** The nodes the parts hang from and their bones (same order). */
  readonly nodes: TransformNode[] = [];
  readonly bones: Bone[] = [];
  /** Per merged mesh: the vertex colours as built, and each smooth part's vertices (lens glow). */
  private baseColors = new Map<Mesh, Float32Array>();
  private flashColors = new Map<Mesh, Float32Array>();
  private partVerts = new Map<Mesh, Map<number, Uint32Array>>();
  private obs: Observer<Scene> | null;
  private rootInv = new Matrix();

  constructor(
    scene: Scene,
    private root: TransformNode,
    parts: readonly AbstractMesh[],
    headNode: TransformNode,
    material: Material,
    name: string,
    opts: VoxelBodyOptions,
    /** The head on its own mesh (the player: the camera fades it); everyone else is one mesh (3.1: a draw less per pass). */
    splitHead = true,
  ) {
    // one flat bone per node a part hangs from, posed each frame from the node's transform relative to the root (so a
    // ragdoll re-parenting the joints onto physics nodes still drives it)
    this.skeleton = new Skeleton(`${name}-vox`, `${name}-vox`, scene);
    root.computeWorldMatrix(true);
    const toRoot = root.getWorldMatrix().clone().invert();
    const onJoint = new Map<TransformNode, number[]>();
    parts.forEach((part, pi) => {
      const n = part.parent as TransformNode | null;
      if (!n || !(part as InstancedMesh).sourceMesh) return;
      let list = onJoint.get(n);
      if (!list) {
        onJoint.set(n, (list = []));
        n.computeWorldMatrix(true);
        const rel = n.getWorldMatrix().multiply(toRoot);
        this.bones.push(new Bone(`${name}-${n.name}`, this.skeleton, null, rel, null, rel));
        this.nodes.push(n);
      }
      list.push(pi);
    });
    const underHead = (n: TransformNode): boolean => {
      for (let x: TransformNode | null = n; x && x !== root; x = x.parent as TransformNode | null) if (x === headNode) return true;
      return false;
    };
    const build = (size: number, suffix: string): Mesh[] => {
      const out: Mesh[] = [];
      for (const head of splitHead ? [false, true] : [null]) {
        const sink = new VoxelSink();
        this.nodes.forEach((node, bi) => {
          if (head !== null && underHead(node) !== head) return;
          const list = onJoint.get(node)!;
          const w = node.getWorldMatrix().m;
          const q = jointQuads(
            list.map((pi) => parts[pi]!),
            Math.sqrt(w[0]! * w[0]! + w[1]! * w[1]! + w[2]! * w[2]!),
            size,
          );
          // (a per-joint seed keeps neighbouring joints' tones apart)
          if (q) sink.add(q, list, parts, this.bones[bi]!.getBindMatrix(), bi, bi);
        });
        const mesh = sink.mesh(`${name}-vox${head ? '-head' : ''}${suffix}`, scene, material, root, this.skeleton);
        // the skinned bounds move with the rig: never culled away by a stale box
        mesh.alwaysSelectAsActiveMesh = true;
        this.partVerts.set(mesh, sink.partVerts());
        this.baseColors.set(mesh, new Float32Array(sink.C));
        out.push(mesh);
      }
      return out;
    };
    const full = build(opts.size, '');
    const lod = build(opts.lodSize, '-lod');
    full.forEach((m, i) => m.addLODLevel(opts.lodDistance, lod[i]!));
    this.meshes.push(...full, ...lod);
    this.split = splitHead;
    // the smooth parts stay for what reads them, unseen
    for (const p of parts) p.isVisible = false;
    // (the bones read the nodes when the skeleton is prepared, after the parts - created first - updated them)
    this.obs = scene.onBeforeRenderObservable.add(() => this.bones[0]?.markAsDirty());
    this.skeleton.onBeforeComputeObservable.add(() => this.pose());
  }

  /** Each bone = its node's world transform relative to the root (no allocation). */
  private pose(): void {
    this.root.getWorldMatrix().invertToRef(this.rootInv);
    for (let i = 0; i < this.bones.length; i++) this.nodes[i]!.getWorldMatrix().multiplyToRef(this.rootInv, this.bones[i]!.getLocalMatrix());
  }

  /** The head (the camera hides it when it gets too close). */
  setHeadVisible(v: boolean): void {
    if (!this.split) return;
    this.meshes[1]!.isVisible = v;
    this.meshes[3]!.isVisible = v;
  }

  /** The head has its own meshes ([body, head, lod body, lod head]); else [body, lod body]. */
  private split = true;

  /** Tint every vertex towards white (hit feedback), 0..1. */
  setFlash(k: number): void {
    for (const [mesh, base] of this.baseColors) {
      let c = this.flashColors.get(mesh);
      if (!c) this.flashColors.set(mesh, (c = new Float32Array(base.length)));
      for (let i = 0; i < base.length; i += 4) {
        c[i] = base[i]! + (1 - base[i]!) * k;
        c[i + 1] = base[i + 1]! + (0.92 - base[i + 1]!) * k;
        c[i + 2] = base[i + 2]! + (0.85 - base[i + 2]!) * k;
        c[i + 3] = 1;
      }
      mesh.updateVerticesData(VertexBuffer.ColorKind, c);
    }
  }

  /** A smooth part's colour changed (lens glow): its voxels follow (every level of detail). */
  setPartColor(part: number, c: Color4): void {
    for (const [mesh, base] of this.baseColors) {
      const vs = this.partVerts.get(mesh)?.get(part);
      if (!vs) continue;
      for (let i = 0; i < vs.length; i++) {
        const o = vs[i]! * 4;
        base[o] = c.r;
        base[o + 1] = c.g;
        base[o + 2] = c.b;
      }
      mesh.updateVerticesData(VertexBuffer.ColorKind, base);
    }
  }

  dispose(): void {
    this.obs?.remove();
    this.obs = null;
    for (const m of this.meshes) m.dispose();
    this.skeleton.dispose();
  }
}
