/**
 * (guard-models G7) The enforcer's riot shield with the guard figures: shield_riot's own GLB (G3 builds it in the
 * broad base's bind pose, skinned on `elL` / `wrL`; G4 exports three LODs) drawn on the figure's own skeleton, so it
 * rides the left forearm exactly as the body does (the joints are matched by name). One mesh: +1 draw per enforcer
 * (PLAN section 5). The prototype draws the shield's LOD1 at every distance (300 tris) and keeps it always active (at
 * most a few enforcers). Until the shield's files and a real broad base are in the build, the enforcer keeps the
 * placeholder part (`buildShieldPart`): `guardShieldFor` returns null. Render only: the block (`shieldBlocks`) is
 * gameplay and reads the guard's yaw, never this mesh.
 */
import { Mesh, VertexBuffer, VertexData, type PBRMaterial, type Scene, type Skeleton } from '../core/babylon';
import type { GlbModel } from '../operators/lab/glb';
import { loadModel, operatorMaterial } from '../operators/runtime/figure';
import { LOD_1 } from '../operators/runtime/manifest';
import { shieldUrls } from '../operators/guards/guardAssets';
import type { GuardFigure } from '../operators/runtime/guardFigure';
import type { GuardBody } from './guardBody';

/** The figure-skinned shield of one enforcer. */
export class GuardShield {
  private meshes: Mesh[] = [];
  private materials: PBRMaterial[] = [];
  private lod = -1;
  private disposed = false;
  /** Built (its file is in). */
  ready = false;

  constructor(
    private readonly scene: Scene,
    private readonly figure: GuardFigure,
    url: string,
    private readonly casters: (m: Mesh) => void,
  ) {
    loadModel(url)
      .then((model) => {
        if (!this.disposed && !scene.isDisposed) this.build(model);
      })
      .catch((e: unknown) => console.warn('[guards] shield failed to load', e));
  }

  /** Builds the shield's meshes from its file once the figure has a skeleton to put them on (load time). */
  private build(model: GlbModel): void {
    this.model = model;
    this.tryBuild();
  }

  private model: GlbModel | null = null;

  private tryBuild(): void {
    const model = this.model;
    const f = this.figure;
    if (!model || this.ready || f.current < 0) return;
    const skel = f.lodSkeleton(f.current);
    if (!skel) return;
    this.materials = model.materials.map((m) => operatorMaterial(this.scene, m, 'shield_riot'));
    for (let i = 0; i < model.meshes.length; i++) {
      const g = model.meshes[i]!;
      const n = g.positions.length / 3;
      const mesh = new Mesh(`${f.name}-shield-${i}`, this.scene);
      const vd = new VertexData();
      vd.positions = g.positions;
      vd.normals = g.normals;
      vd.uvs = g.uvs;
      vd.indices = g.indices;
      vd.applyToMesh(mesh, false);
      mesh.setVerticesData(VertexBuffer.MatricesIndicesKind, shieldBoneIndices(model, i, skel), false, 4);
      mesh.setVerticesData(VertexBuffer.MatricesWeightsKind, g.weights.length === n * 4 ? g.weights : new Float32Array(n * 4), false, 4);
      mesh.numBoneInfluencers = 4;
      mesh.material = this.materials[g.material] ?? this.materials[0] ?? null;
      mesh.isPickable = false;
      mesh.receiveShadows = true;
      mesh.alwaysSelectAsActiveMesh = true;
      this.meshes.push(mesh);
      this.casters(mesh);
    }
    this.ready = true;
    this.lod = -1;
    this.follow();
  }

  /** Per render after the figure's update: on the shown LOD's skeleton and root (a LOD switch moves it). No allocation. */
  follow(): void {
    if (this.disposed) return;
    const f = this.figure;
    if (!this.ready) {
      if (this.model) this.tryBuild();
      return;
    }
    if (f.current === this.lod) return;
    this.lod = f.current;
    const skel = this.lod >= 0 ? f.lodSkeleton(this.lod) : null;
    const host = this.lod >= 0 ? f.lodMeshes(this.lod)[0] : undefined;
    for (let i = 0; i < this.meshes.length; i++) {
      const m = this.meshes[i]!;
      if (skel && host) {
        // every LOD's skeleton has the 23 rig joints (elL, wrL among them) in its own order: indices by name again
        m.skeleton = skel;
        m.setVerticesData(VertexBuffer.MatricesIndicesKind, this.model ? shieldBoneIndices(this.model, i, skel) : new Float32Array(0), false, 4);
        m.parent = host.parent;
        m.setEnabled(true);
      } else m.setEnabled(false);
    }
  }

  /** The meshes (tests). */
  get renderMeshes(): readonly Mesh[] {
    return this.meshes;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const m of this.meshes) m.dispose(false, false);
    for (const m of this.materials) m.dispose(false, true);
    this.meshes = [];
    this.materials = [];
  }
}

/**
 * The shield primitive `prim`'s per-vertex bone indices into `skel` (the figure LOD's skeleton), matched by joint name
 * (a joint the skeleton lacks: bone 0). Load / LOD switch time (allocates).
 */
export function shieldBoneIndices(model: GlbModel, prim: number, skel: Skeleton): Float32Array {
  const g = model.meshes[prim]!;
  const boneOf = model.joints.map((nd) => {
    const b = skel.getBoneIndexByName(model.nodes[nd]?.name ?? '');
    return b >= 0 ? b : 0;
  });
  const out = new Float32Array(g.joints.length);
  for (let i = 0; i < out.length; i++) out[i] = g.weights[i]! > 0 ? boneOf[g.joints[i]!] ?? 0 : 0;
  return out;
}

/**
 * The enforcer's figure shield for guard body `gb` (null: no shield files in the build, or Wren stands in for his base:
 * the placeholder part then). The shield's LOD1 (`shieldUrls`).
 */
export function guardShieldFor(scene: Scene, gb: GuardBody, casters: (m: Mesh) => void): GuardShield | null {
  const urls = shieldUrls();
  const url = urls?.[LOD_1];
  if (!url || gb.standIn || gb.def.kind !== 'enforcer') return null;
  return new GuardShield(scene, gb.figure, url, casters);
}
