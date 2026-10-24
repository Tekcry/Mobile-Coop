/**
 * (guard-models G7) The enforcer's riot shield with the guard figures: shield_riot's own GLB (G3 builds it in the
 * broad base's bind pose, skinned on `elL` / `wrL`; G4 exports three LODs) drawn on the figure's own skeleton, so it
 * rides the left forearm exactly as the body does (the joints are matched by name). One mesh: +1 draw per enforcer
 * (PLAN section 5). The prototype draws the shield's LOD1 at every distance (300 tris) and keeps it always active (at
 * most a few enforcers). Until the shield's files and a real broad base are in the build, the enforcer keeps the
 * placeholder part (`buildShieldPart`): `guardShieldFor` returns null. Render only: the block (`shieldBlocks`) is
 * gameplay and reads the guard's yaw, never this mesh.
 *
 * (G7b) Shared per scene, as the figures' (base, LOD) data: the shield's materials (one set for every enforcer: the
 * shield has no tint, so no per-instance colour is needed), its static vertex buffers, and per (base, figure LOD) the
 * bone indices into that LOD's skeleton (every guard of a base has the same joint order per LOD). Per enforcer: one
 * mesh per figure LOD, made the first time he shows that LOD (at most three), then only enabled / disabled: a LOD
 * switch allocates nothing.
 */
import { GpuBuffer, Mesh, VertexBuffer, type PBRMaterial, type Scene, type Skeleton } from '../core/babylon';
import type { GlbModel } from '../operators/lab/glb';
import { loadModel, operatorMaterial } from '../operators/runtime/figure';
import { LOD_1 } from '../operators/runtime/manifest';
import { shieldUrls } from '../operators/guards/guardAssets';
import type { GuardManifest } from '../operators/guards/gearMask';
import type { GuardFigure } from '../operators/runtime/guardFigure';
import type { GuardBody } from './guardBody';

/** One static vertex buffer of a shield primitive (shared by every enforcer in the scene). */
interface StaticVb {
  kind: string;
  size: number;
  buf: GpuBuffer;
}

/** The shield file's shared side in one scene. */
interface ShieldShared {
  model: GlbModel;
  materials: PBRMaterial[];
  /** Per primitive: position, normal, uv, weights. */
  vbs: StaticVb[][];
  /** Per figure base (its manifest), per figure LOD, per primitive: the bone indices into that LOD's skeleton. */
  bones: Map<GuardManifest, (GpuBuffer[] | undefined)[]>;
}

const SHARED = new WeakMap<Scene, Map<GlbModel, ShieldShared>>();

/** The scene's shared side of shield file `model` (made on the first enforcer's build; freed with the scene). */
function sharedOf(scene: Scene, model: GlbModel): ShieldShared {
  let byModel = SHARED.get(scene);
  if (!byModel) {
    const map = new Map<GlbModel, ShieldShared>();
    byModel = map;
    SHARED.set(scene, map);
    scene.onDisposeObservable.addOnce(() => {
      for (const s of map.values()) {
        for (const p of s.vbs) for (const vb of p) vb.buf.dispose();
        for (const lods of s.bones.values()) for (const l of lods) if (l) for (const b of l) b.dispose();
        // (the materials are the scene's: it disposes them)
      }
      map.clear();
      SHARED.delete(scene);
    });
  }
  let s = byModel.get(model);
  if (!s) {
    const engine = scene.getEngine();
    const materials = model.materials.map((m) => operatorMaterial(scene, m, 'shield_riot'));
    const vbs = model.meshes.map((g, i) => {
      const n = g.positions.length / 3;
      const data: [string, Float32Array, number][] = [
        [VertexBuffer.PositionKind, g.positions, 3],
        [VertexBuffer.NormalKind, g.normals, 3],
        [VertexBuffer.UVKind, g.uvs, 2],
        [VertexBuffer.MatricesWeightsKind, g.weights.length === n * 4 ? g.weights : new Float32Array(n * 4), 4],
      ];
      return data.map(([kind, d, size]) => ({ kind, size, buf: new GpuBuffer(engine, d, false, size, false, false, false, undefined, `shield_riot-${i}-${kind}`) }));
    });
    s = { model, materials, vbs, bones: new Map() };
    byModel.set(model, s);
  }
  return s;
}

/** (tests) How many shield files have a shared side in `scene`. */
export function sharedShieldCount(scene: Scene): number {
  return SHARED.get(scene)?.size ?? 0;
}

/** The figure-skinned shield of one enforcer. */
export class GuardShield {
  /** Per figure LOD (index = LOD), this enforcer's shield meshes on that LOD's skeleton (null: not shown yet). */
  private readonly byLod: (Mesh[] | null)[] = [null, null, null, null];
  private shared: ShieldShared | null = null;
  private lod = -1;
  private disposed = false;
  /** Built (its file is in and the figure showed a LOD). */
  ready = false;

  constructor(
    private readonly scene: Scene,
    private readonly figure: GuardFigure,
    url: string,
    private readonly casters: (m: Mesh) => void,
  ) {
    loadModel(url)
      .then((model) => {
        if (!this.disposed && !scene.isDisposed) {
          this.shared = sharedOf(scene, model);
          this.follow();
        }
      })
      .catch((e: unknown) => console.warn('[guards] shield failed to load', e));
  }

  /** This enforcer's meshes for figure LOD `lod` on `skel` (made once per LOD: load / first-show time, allocates). */
  private meshesFor(lod: number, skel: Skeleton): Mesh[] {
    const have = this.byLod[lod];
    if (have) return have;
    const s = this.shared!;
    const f = this.figure;
    const engine = this.scene.getEngine();
    let perLod = s.bones.get(f.manifest);
    if (!perLod) {
      perLod = [];
      s.bones.set(f.manifest, perLod);
    }
    let bones = perLod[lod];
    if (!bones) {
      bones = s.model.meshes.map((_, i) => new GpuBuffer(engine, shieldBoneIndices(s.model, i, skel), false, 4, false, false, false, undefined, `shield_riot-${i}-bones-${lod}`));
      perLod[lod] = bones;
    }
    const out: Mesh[] = [];
    for (let i = 0; i < s.model.meshes.length; i++) {
      const g = s.model.meshes[i]!;
      const mesh = new Mesh(`${f.name}-shield-${i}-${lod}`, this.scene);
      for (const vb of s.vbs[i]!) {
        mesh.setVerticesBuffer(new VertexBuffer(engine, vb.buf, vb.kind, { updatable: false, stride: vb.size, size: vb.size, takeBufferOwnership: false }));
      }
      mesh.setVerticesBuffer(new VertexBuffer(engine, bones[i]!, VertexBuffer.MatricesIndicesKind, { updatable: false, stride: 4, size: 4, takeBufferOwnership: false }));
      mesh.setIndices(g.indices, g.positions.length / 3);
      mesh.skeleton = skel;
      mesh.numBoneInfluencers = 4;
      mesh.material = s.materials[g.material] ?? s.materials[0] ?? null;
      mesh.isPickable = false;
      mesh.receiveShadows = true;
      mesh.alwaysSelectAsActiveMesh = true;
      mesh.setEnabled(false);
      out.push(mesh);
      this.casters(mesh);
    }
    this.byLod[lod] = out;
    return out;
  }

  /**
   * Per render after the figure's update: the shown LOD's shield on its skeleton and root (a LOD switch enables the
   * other LOD's meshes). No allocation once each LOD has been shown.
   */
  follow(): void {
    if (this.disposed || !this.shared) return;
    const f = this.figure;
    if (f.current === this.lod) return;
    const old = this.lod >= 0 ? this.byLod[this.lod] : null;
    const skel = f.current >= 0 ? f.lodSkeleton(f.current) : null;
    const host = f.current >= 0 ? f.lodMeshes(f.current)[0] : undefined;
    if (old) for (let i = 0; i < old.length; i++) old[i]!.setEnabled(false);
    this.lod = f.current;
    if (!skel || !host) return;
    const now = this.meshesFor(this.lod, skel);
    for (let i = 0; i < now.length; i++) {
      const m = now[i]!;
      if (m.parent !== host.parent) m.parent = host.parent;
      m.setEnabled(true);
    }
    this.ready = true;
  }

  /** The shown LOD's meshes (tests). */
  get renderMeshes(): readonly Mesh[] {
    return (this.lod >= 0 ? this.byLod[this.lod] : null) ?? [];
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    // (the shared buffers and materials stay for the scene's other enforcers)
    for (let l = 0; l < this.byLod.length; l++) {
      const ms = this.byLod[l];
      if (ms) for (const m of ms) m.dispose(false, false);
      this.byLod[l] = null;
    }
  }
}

/**
 * The shield primitive `prim`'s per-vertex bone indices into `skel` (a figure LOD's skeleton), matched by joint name
 * (a joint the skeleton lacks: bone 0). Once per (base, LOD) per scene (allocates).
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
