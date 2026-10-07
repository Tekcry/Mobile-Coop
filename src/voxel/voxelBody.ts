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

interface JointQuads {
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
function jointQuads(parts: readonly AbstractMesh[], scale: number, size: number): JointQuads | null {
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

export class VoxelBody {
  readonly skeleton: Skeleton;
  /** [body, head] at full size, then the level-of-detail pair. */
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
    const build = (size: number, suffix: string): [Mesh, Mesh] => {
      const out: Mesh[] = [];
      for (const head of [false, true]) {
        const P: number[] = [];
        const N: number[] = [];
        const I: number[] = [];
        const C: number[] = [];
        const PT: number[] = [];
        const C2: number[] = [];
        const MI: number[] = [];
        const MW: number[] = [];
        const VX: number[] = [];
        const verts = new Map<number, number[]>();
        const v = new Vector3();
        const nv = new Vector3();
        this.nodes.forEach((node, bi) => {
          if (underHead(node) !== head) return;
          const list = onJoint.get(node)!;
          const w = node.getWorldMatrix().m;
          const q = jointQuads(
            list.map((pi) => parts[pi]!),
            Math.sqrt(w[0]! * w[0]! + w[1]! * w[1]! + w[2]! * w[2]!),
            size,
          );
          if (!q) return;
          const bind = this.bones[bi]!.getBindMatrix();
          const nm = bind.clone();
          nm.setTranslationFromFloats(0, 0, 0);
          const base = P.length / 3;
          for (let i = 0; i < q.positions.length; i += 3) {
            const vi = i / 3;
            const pi = list[q.slot[vi]!]!;
            const inst = parts[pi] as InstancedMesh;
            const col = inst.instancedBuffers?.color as Color4 | undefined;
            const pat = inst.instancedBuffers?.pattern as { x: number; y: number; z: number; w: number } | undefined;
            const c2 = inst.instancedBuffers?.color2 as Color4 | undefined;
            Vector3.TransformCoordinatesFromFloatsToRef(q.positions[i]!, q.positions[i + 1]!, q.positions[i + 2]!, bind, v);
            Vector3.TransformNormalFromFloatsToRef(q.normals[i]!, q.normals[i + 1]!, q.normals[i + 2]!, nm, nv);
            nv.normalize();
            P.push(v.x, v.y, v.z);
            N.push(nv.x, nv.y, nv.z);
            C.push(col?.r ?? 1, col?.g ?? 1, col?.b ?? 1, 1);
            PT.push(pat?.x ?? 0, pat?.y ?? 1, pat?.z ?? 0, pat?.w ?? 0);
            C2.push(c2?.r ?? 0, c2?.g ?? 0, c2?.b ?? 0, 1);
            MI.push(bi, 0, 0, 0);
            MW.push(1, 0, 0, 0);
            // (a per-joint seed keeps neighbouring joints' tones apart)
            VX.push(q.vox[i]! + bi * 131, q.vox[i + 1]!, q.vox[i + 2]! + bi * 71);
            let vl = verts.get(pi);
            if (!vl) verts.set(pi, (vl = []));
            vl.push(base + vi);
          }
          for (let i = 0; i < q.indices.length; i++) I.push(base + q.indices[i]!);
        });
        const mesh = new Mesh(`${name}-vox${head ? '-head' : ''}${suffix}`, scene);
        if (P.length) {
          const vd = new VertexData();
          vd.positions = P;
          vd.normals = N;
          vd.indices = I;
          vd.colors = C;
          vd.matricesIndices = MI;
          vd.matricesWeights = MW;
          vd.applyToMesh(mesh, true);
          mesh.setVerticesData('pattern', PT, false, 4);
          mesh.setVerticesData('color2', C2, false, 4);
          mesh.setVerticesData('vox', VX, false, 3);
        }
        mesh.parent = root;
        mesh.skeleton = this.skeleton;
        mesh.numBoneInfluencers = 1;
        mesh.material = material;
        mesh.isPickable = false;
        mesh.receiveShadows = true;
        // the skinned bounds move with the rig: never culled away by a stale box
        mesh.alwaysSelectAsActiveMesh = true;
        this.partVerts.set(mesh, new Map([...verts].map(([k, l]) => [k, Uint32Array.from(l)])));
        this.baseColors.set(mesh, new Float32Array(C));
        out.push(mesh);
      }
      return [out[0]!, out[1]!];
    };
    const [body, head] = build(opts.size, '');
    const [lodBody, lodHead] = build(opts.lodSize, '-lod');
    body.addLODLevel(opts.lodDistance, lodBody);
    head.addLODLevel(opts.lodDistance, lodHead);
    this.meshes.push(body, head, lodBody, lodHead);
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
    this.meshes[1]!.isVisible = v;
    this.meshes[3]!.isVisible = v;
  }

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
