import { Matrix, type AbstractMesh, type Color4, type InstancedMesh, type Material, type Mesh, type Scene, type TransformNode } from '../core/babylon';
import { jointQuads, VoxelSink } from './voxelBody';

/**
 * Voxel weapons / gadgets (3.0): smooth parts hanging from one node (a weapon, a grenade, a drone) merged into one
 * rigid voxel mesh under that node - the parts at `size` (1 cm for weapons), parts thinner than `small` (sights, pins,
 * the trigger, an ejection port) on their own grid at `fineSize` (5 mm) - with a coarser copy (`lodSize`) past
 * `lodDistance`. The smooth parts stay, unseen (extents, grips, muzzles read them).
 */
export interface VoxelGroupOptions {
  size: number;
  fineSize: number;
  lodSize: number;
  lodDistance: number;
  /** Parts whose thinnest side is under this (m) go on the fine grid. */
  small: number;
}

export class VoxelGroup {
  /** The full-size mesh, then its level of detail. */
  readonly meshes: Mesh[] = [];
  private baseColors = new Map<Mesh, Float32Array>();
  private partVerts = new Map<Mesh, Map<number, Uint32Array>>();

  constructor(scene: Scene, node: TransformNode, parts: readonly AbstractMesh[], material: Material, name: string, opts: VoxelGroupOptions) {
    node.computeWorldMatrix(true);
    const w = node.getWorldMatrix().m;
    const scale = Math.sqrt(w[0]! * w[0]! + w[1]! * w[1]! + w[2]! * w[2]!) || 1;
    const big: number[] = [];
    const small: number[] = [];
    parts.forEach((p, i) => {
      if (p.parent !== node) return;
      const thin = Math.min(Math.abs(p.scaling.x), Math.abs(p.scaling.y), Math.abs(p.scaling.z)) * scale;
      (thin < opts.small ? small : big).push(i);
    });
    const build = (size: number, fine: number, suffix: string): Mesh => {
      const sink = new VoxelSink();
      const id = Matrix.Identity();
      const qb = big.length ? jointQuads(big.map((i) => parts[i]!), scale, size) : null;
      if (qb) sink.add(qb, big, parts, id, 0, 0);
      const qs = small.length ? jointQuads(small.map((i) => parts[i]!), scale, fine) : null;
      if (qs) sink.add(qs, small, parts, id, 0, 1);
      const mesh = sink.mesh(`${name}-vox${suffix}`, scene, material, node, null);
      this.partVerts.set(mesh, sink.partVerts());
      this.baseColors.set(mesh, new Float32Array(sink.C));
      return mesh;
    };
    const full = build(opts.size, opts.fineSize, '');
    const lod = build(opts.lodSize, opts.size, '-lod');
    full.addLODLevel(opts.lodDistance, lod);
    this.meshes.push(full, lod);
    for (const p of parts) p.isVisible = false;
  }

  /** A smooth part's colour changed: its voxels follow. */
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
      mesh.updateVerticesData('color', base);
    }
  }

  dispose(): void {
    for (const m of this.meshes) m.dispose();
  }
}

/** 3.0 voxel props / gadgets (null: the smooth parts render, e.g. `?gfx=min`). */
let VOXEL_PROPS: VoxelGroupOptions | null = null;
export function setVoxelProps(o: VoxelGroupOptions | null): void {
  VOXEL_PROPS = o;
}

/** Voxelise `parts` under `node` with the current prop settings (null when voxels are off). */
export function voxeliseParts(scene: Scene, node: TransformNode, parts: readonly AbstractMesh[], name: string): VoxelGroup | null {
  const skin = ((parts[0] as InstancedMesh | undefined)?.sourceMesh?.metadata as { skinMaterial?: Material } | null | undefined)?.skinMaterial;
  return VOXEL_PROPS && skin ? new VoxelGroup(scene, node, parts, skin, name, VOXEL_PROPS) : null;
}
