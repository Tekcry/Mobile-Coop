/**
 * (guard-models G7b) The level load's guard step, with `flags.guardModels` on only (PLAN G7 last bullet, PLAN 8 risk):
 * - LOD2 of every guard base the map's guards can use is in the scene's guard library before play, so a guard's
 *   figure shows on its first frame instead of a moment after (the merged body covered that gap before);
 * - the guard shader (the operator PBR material with `GuardFigurePlugin`, GUARDFIG on: G5's plugin variant) and its
 *   shadow-depth variant are compiled on the loading screen, once per base, not on the first guard's first draw.
 *
 * Which bases: every human kind's (`ENEMIES` minus the dog). Reinforcements, response squads and the sector slots
 * can bring any kind into a level, and a base is per kind (G6), so this is the set of bases the map's guards use:
 * three LOD2 files at most (while Wren stands in, all three are Wren's LOD2, already loaded for the player).
 *
 * The compile: one hidden mesh per (base, LOD2 primitive), built exactly as a guard's (the shared static vertex
 * buffers, a `gvis` buffer, a skeleton with the LOD's bone count, 4 influences, shadows received) so its defines are a
 * guard's, and the engine's effect cache hands every later guard the compiled program. The mesh stays in the scene,
 * disabled (never drawn, freed with the scene): its sub-mesh holds the effects, so the engine never releases them
 * before the first guard takes them. Render side only; gameplay reads none of it.
 */
import { Bone, Matrix, Mesh, Skeleton, VertexBuffer, type Scene } from '../core/babylon';
import { flags } from '../core/flags';
import type { GuardBase } from '../operators/guards/gearMask';
import { guardAsset } from '../operators/guards/guardAssets';
import { createVariant, guardVariant } from '../operators/guards/guardVariant';
import { guardLibrary, type GuardLodAsset } from '../operators/runtime/guardFigure';
import { LOD_2 } from '../operators/runtime/manifest';
import { pageLeaving } from '../operators/runtime/offline';
import { ENEMIES, ENEMY_KINDS } from './enemyDefs';

/** A warm compile that never gets ready (a shader error) stops polling after this long (ms). */
const WARM_GIVE_UP_MS = 20000;

/** The human kinds (the dog keeps its own model). */
export function guardKinds(): string[] {
  return ENEMY_KINDS.filter((k) => !ENEMIES[k].quadruped);
}

/** The guard bases `kinds` draw on (each once, in kind order). */
export function guardBasesOf(kinds: readonly string[], mapId = ''): GuardBase[] {
  const v = createVariant();
  const out: GuardBase[] = [];
  for (const k of kinds) {
    const b = guardVariant(0, k, mapId, v).base;
    if (!out.includes(b)) out.push(b);
  }
  return out;
}

/** Asset keys warmed per scene (a second call warms nothing twice). */
const WARMED = new WeakMap<Scene, Set<string>>();

/** (tests) The hidden warm meshes of `scene`. */
export function guardWarmMeshes(scene: Scene): Mesh[] {
  return scene.meshes.filter((m) => m.name.startsWith('guard-warm-')) as Mesh[];
}

/** A hidden mesh with a guard's attributes and skeleton for each primitive of `a` (load time, allocates). */
function warmMeshes(scene: Scene, a: GuardLodAsset): Mesh[] {
  const engine = scene.getEngine();
  const skeleton = new Skeleton(`guard-warm-${a.key}-skel`, `guard-warm-${a.key}-skel`, scene);
  for (let s = 0; s < a.setup.node.length; s++) new Bone(`b${s}`, skeleton, null, Matrix.Identity());
  return a.prims.map((prim, i) => {
    const m = new Mesh(`guard-warm-${a.key}-${i}`, scene);
    for (const vb of prim.vbs) {
      m.setVerticesBuffer(new VertexBuffer(engine, vb.buf, vb.kind, { updatable: false, stride: vb.size, size: vb.size, takeBufferOwnership: false }));
    }
    const gvis = new Uint8Array(prim.vertexCount * 4).fill(255);
    m.setVerticesBuffer(new VertexBuffer(engine, gvis, 'gvis', { updatable: true, stride: 4, size: 4, type: VertexBuffer.UNSIGNED_BYTE, normalized: true }));
    // (indexed, with the guard's index width: vertex pulling's defines read the index buffer)
    m.setIndices(prim.groups.indices, prim.vertexCount);
    m.skeleton = skeleton;
    m.numBoneInfluencers = 4;
    m.material = prim.material;
    m.isPickable = false;
    m.receiveShadows = true;
    m.setEnabled(false);
    return m;
  });
}

/**
 * The main pass (the guard material) and every shadow generator of the mesh's lights are compiled for `m` (whatever
 * their cast lists: a guard joins them at spawn). Mirrors `Mesh.isReady(true)` minus the render-list filter.
 */
function warmReady(m: Mesh): boolean {
  const sm = m.subMeshes?.[0];
  const mat = m.material;
  if (!sm || !mat) return true;
  let ok = mat.isReadyForSubMesh(m, sm, false);
  const engine = m.getEngine();
  const pass = engine.currentRenderPassId;
  for (const light of m.lightSources) {
    const gens = light.getShadowGenerators();
    if (!gens) continue;
    for (const g of gens.values()) {
      const map = g?.getShadowMap();
      if (!map) continue;
      const ids = map.renderPassIds ?? [pass];
      for (let p = 0; p < ids.length; p++) {
        engine.currentRenderPassId = ids[p]!;
        if (!g.isReady(sm, false, false)) ok = false;
      }
      engine.currentRenderPassId = pass;
    }
  }
  return ok;
}

function untilWarm(scene: Scene, meshes: readonly Mesh[]): Promise<void> {
  const until = Date.now() + WARM_GIVE_UP_MS;
  return new Promise((resolve) => {
    const tick = (): void => {
      // (every mesh asked each tick: their programs compile in parallel)
      if (scene.isDisposed) return resolve();
      let all = true;
      for (let i = 0; i < meshes.length; i++) if (!warmReady(meshes[i]!)) all = false;
      if (all) return resolve();
      if (Date.now() > until) {
        console.warn('[guards] the guard shader did not compile on the loading screen (it compiles at the first draw)');
        return resolve();
      }
      setTimeout(tick, 16);
    };
    tick();
  });
}

/**
 * The level load's guard step (`GameState.create`, before play): LOD2 of every base of `kinds` (default: every human
 * kind) loaded into the scene's guard library and the guard shader compiled for each. Resolves with the number of
 * bases warmed; never rejects (a failed load is reported and the merged body covers that base, as before). Nothing
 * with the flag off.
 */
export async function warmGuardModels(scene: Scene, mapId = '', kinds: readonly string[] = guardKinds()): Promise<number> {
  if (!flags.guardModels) return 0;
  let done = WARMED.get(scene);
  if (!done) {
    done = new Set();
    WARMED.set(scene, done);
  }
  const lib = guardLibrary(scene);
  const seen = new Set<string>();
  const runs: Promise<boolean>[] = [];
  for (const base of guardBasesOf(kinds, mapId)) {
    const m = guardAsset(base).manifest;
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    const warmed = done;
    runs.push(
      lib.load(m, LOD_2).then(
        async (a) => {
          if (scene.isDisposed) return false;
          if (!warmed.has(a.key)) {
            warmed.add(a.key);
            // (G7b check polish 1) a throw while building the warm meshes must not reject the level load
            try {
              await untilWarm(scene, warmMeshes(scene, a));
            } catch (e: unknown) {
              console.warn(`[guards] ${m.id} shader warm failed (it compiles at the first draw)`, e);
              return false;
            }
          }
          return true;
        },
        (e: unknown) => {
          if (!pageLeaving() && !scene.isDisposed) console.warn(`[guards] ${m.id} LOD2 not loaded for the level (the merged body stays)`, e);
          return false;
        },
      ),
    );
  }
  const ok = await Promise.all(runs);
  let n = 0;
  for (const b of ok) if (b) n++;
  return n;
}
