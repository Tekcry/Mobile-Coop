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
 *
 * (map-ready S3) The warm sets (`warmGuardSets`, with `flags.mapReady`; the merged-body path): per guard kind one hidden
 * copy of what a later spawn builds (the rig with its merged body and merged gun, the dog's model, the shield, the
 * sniper's laser and glint, the helmet and armour parts) with its main pass and its depth pass for every shadow
 * generator in the scene compiled on the loading screen, so a guard arriving after the reveal (a course bay's squad, a
 * reinforcement, a sector slot inside 7 m) compiles nothing. Same rule as above: the sets stay disabled for the
 * scene's life (their sub-meshes hold the effects; course mode despawns every guard between sets).
 */
import { Bone, InstancedMesh, Matrix, Mesh, Skeleton, TransformNode, VertexBuffer, type Light, type Scene } from '../core/babylon';
import { flags } from '../core/flags';
import type { ModeId } from '../game/modes/gameMode';
import type { GuardBase } from '../operators/guards/gearMask';
import { guardAsset } from '../operators/guards/guardAssets';
import { createVariant, guardVariant } from '../operators/guards/guardVariant';
import { guardLibrary, type GuardLodAsset } from '../operators/runtime/guardFigure';
import { LOD_2 } from '../operators/runtime/manifest';
import { pageLeaving } from '../operators/runtime/offline';
import type { World } from '../world/world';
import { DogModel } from './dogModel';
import { ENEMIES, ENEMY_KINDS, type EnemyKind } from './enemyDefs';
import { buildEnemyRig } from './enemyRig';
import { buildArmourParts, buildHelmetPart, buildShieldPart, gearColour, type GearWorld } from './gearParts';

/** A warm compile that never gets ready (a shader error) stops polling after this long (ms). */
export const WARM_GIVE_UP_MS = 20000;

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
 * The main pass and the depth pass of every shadow generator of `lights` are compiled for `m` (whatever their cast
 * lists: a guard joins them at spawn), each sub-mesh, with instances when `inst` (a source drawn through instances).
 * Mirrors `Mesh.isReady(true)` minus the render-list filter. (map-ready S3) Generalised from the figure warm's: its
 * meshes pass their own `lightSources` and no instances, one sub-mesh each, so it compiles what it did.
 */
function warmReady(m: Mesh, lights: readonly Light[], inst: boolean): boolean {
  const sms = m.subMeshes;
  const mat = m.material;
  if (!sms?.length || !mat) return true;
  let ok = true;
  for (let s = 0; s < sms.length; s++) if (!mat.isReadyForSubMesh(m, sms[s]!, inst)) ok = false;
  // (as `Mesh.isReady`; no generator in the game sets `enableSoftTransparentShadow`, the one define it changes)
  const alpha = mat.needAlphaBlendingForMesh(m);
  const engine = m.getEngine();
  const pass = engine.currentRenderPassId;
  for (const light of lights) {
    const gens = light.getShadowGenerators();
    if (!gens) continue;
    for (const g of gens.values()) {
      const map = g?.getShadowMap();
      if (!map) continue;
      const ids = map.renderPassIds ?? [pass];
      for (let p = 0; p < ids.length; p++) {
        engine.currentRenderPassId = ids[p]!;
        for (let s = 0; s < sms.length; s++) if (!g.isReady(sms[s]!, inst, alpha)) ok = false;
      }
      engine.currentRenderPassId = pass;
    }
  }
  return ok;
}

/** Polls `ready` every 16 ms (it asks every mesh each time: their programs compile in parallel) until it holds, the
 *  scene goes, or WARM_GIVE_UP_MS passes (then `warn`, once). Rejects only when `ready` throws. Load time. */
function untilWarm(scene: Scene, ready: () => boolean, warn: string): Promise<void> {
  const until = Date.now() + WARM_GIVE_UP_MS;
  return new Promise((resolve, reject) => {
    const tick = (): void => {
      if (scene.isDisposed) return resolve();
      let done: boolean;
      try {
        done = ready();
      } catch (e: unknown) {
        return reject(e);
      }
      if (done) return resolve();
      if (Date.now() > until) {
        console.warn(warn);
        return resolve();
      }
      setTimeout(tick, 16);
    };
    tick();
  });
}

/** The figure warm's compile: each warm mesh on the lights that reach it. */
function figureWarm(scene: Scene, meshes: readonly Mesh[]): Promise<void> {
  return untilWarm(
    scene,
    () => {
      let all = true;
      for (let i = 0; i < meshes.length; i++) if (!warmReady(meshes[i]!, meshes[i]!.lightSources, false)) all = false;
      return all;
    },
    '[guards] the guard shader did not compile on the loading screen (it compiles at the first draw)',
  );
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
              await figureWarm(scene, warmMeshes(scene, a));
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

// ---- (map-ready S3) the warm sets: one hidden copy per guard kind of what a later spawn builds ----

/** The warm sets' node names (`<prefix><kind>`; the rig inside is named the same, its nodes `<prefix><kind>-*`). */
const WARM_SET = 'guard-warm-set-';
/** Where the sets sit (m): far under every map, out of every gameplay and render range (they are disabled anyway). */
const WARM_SET_Y = -1000;

/** Per scene: each warmed kind's root, and the compiles started (a second call waits on them, builds nothing). */
interface WarmSets {
  roots: Map<EnemyKind, TransformNode>;
  runs: Promise<void>[];
}
const SETS = new WeakMap<Scene, WarmSets>();

/** The builders' shadow-list hook on a warm set: nothing (a warm set is never a caster: not in `charCasters`, not in
 *  `sunMoving`). */
function noCaster(): void {}

/** (map-ready S3, A22) The guard kinds a run of `mode` can spawn: none in the sandbox, else every kind (ENEMY_KINDS,
 *  the dog too). S11's lobby preload reads it. */
export function guardKindsFor(mapId: string, mode: ModeId): EnemyKind[] {
  // (every map alike today: the alarm and the response team bring kinds beyond a map's own guards, A22)
  void mapId;
  return mode === 'sandbox' ? [] : [...ENEMY_KINDS];
}

/** (tests) The warm sets' root nodes in `scene`. */
export function guardWarmSets(scene: Scene): TransformNode[] {
  const s = SETS.get(scene);
  return s ? [...s.roots.values()] : [];
}

/**
 * One kind's warm set under its own disabled root, built by the spawn's own builders as `Enemy`'s constructor calls
 * them (`enemy.ts:649-683`) plus the gear a guard can be given later (`buildHelmetPart` / `buildArmourParts` with
 * `gearColour`'s colours, `enemy.ts:872-889`), on a view of `world` with no shadow list. No `Enemy`, no brain, no hit
 * volumes, no audio, nothing in `enemyMgr`. With `flags.guardModels` the dog's model and the sniper's parts only: the
 * rig would make a live `GuardBody`, and the figure's programs are `warmGuardModels`' (A23). Load time (allocates).
 */
function buildWarmSet(scene: Scene, world: GearWorld, k: EnemyKind): TransformNode {
  const def = ENEMIES[k];
  const root = new TransformNode(WARM_SET + k, scene);
  root.position.y = WARM_SET_Y;
  const parts = world.parts;
  const view: GearWorld = { parts, map: world.map, addShadowCaster: noCaster };
  if (!flags.guardModels) {
    // (`enemyRig.ts:21-41`: with `flags.guardModels` off `buildEnemyRig` reads only `world.parts`,
    // `world.map.theme.faction` and `world.addShadowCaster`, the three fields of the view)
    const built = buildEnemyRig(scene, view as World, def, WARM_SET + k);
    const rig = built.rig;
    rig.root.parent = root;
    // (render passes that walk `LIVE_RIGS`, thermal's door figures, skip a stand-in: this rig is never drawn)
    rig.standIn = true;
    if (def.quadruped) built.gun?.dispose();
    else {
      if (k === 'enforcer') buildShieldPart(view, rig.root, def.scale);
      buildHelmetPart(view, rig, gearColour(def, view, 'helmet'));
      buildArmourParts(view, rig, gearColour(def, view, 'accent'));
    }
  }
  if (def.quadruped) new DogModel(scene, parts, def.look.colors.torso, def.look.colors.accent).root.parent = root;
  if (k === 'sniper') {
    const laser = parts.instance('cyl', '#ff2a1a', 'laser');
    const glint = parts.instance('sphere', '#ffffff', 'glint');
    laser.isVisible = false;
    glint.isVisible = false;
    laser.parent = root;
    glint.parent = root;
  }
  root.setEnabled(false);
  for (const m of root.getChildMeshes(false)) {
    m.setEnabled(false);
    m.isPickable = false;
  }
  return root;
}

/** `m` and its LOD meshes into `out` (each once). */
function addWithLods(out: Set<Mesh>, m: Mesh): void {
  out.add(m);
  for (const l of m.getLODLevels()) if (l.mesh) out.add(l.mesh);
}

/**
 * (map-ready S3) With `flags.mapReady`: per kind in `kinds`, one hidden copy of what a later spawn builds (below),
 * disabled, never pickable, never drawn, kept for the scene's life; its main pass and its depth pass for every shadow
 * generator in the scene compiled. Resolves with the number of kinds warmed once all are compiled (or after
 * WARM_GIVE_UP_MS with one warn); never rejects; a second call in the same scene builds nothing. Nothing with the flag off.
 *
 * The compile asks the sets' own meshes (the merged bodies, hi and low) and, for every instance in a set, its source
 * mesh and the source's LOD meshes with instances (a part base, the merged gun, the helmet part: a later guard's
 * instances draw through those very sub-meshes), against every light of `scene.lights` (the character and torch
 * shadow tiles reach no mesh by light, only by their own cast lists). Load time.
 */
export async function warmGuardSets(scene: Scene, world: GearWorld, kinds: readonly EnemyKind[]): Promise<number> {
  if (!flags.mapReady) return 0;
  let sets = SETS.get(scene);
  if (!sets) {
    sets = { roots: new Map(), runs: [] };
    SETS.set(scene, sets);
  }
  const built: TransformNode[] = [];
  for (const k of kinds) {
    if (sets.roots.has(k)) continue;
    try {
      const r = buildWarmSet(scene, world, k);
      sets.roots.set(k, r);
      built.push(r);
    } catch (e: unknown) {
      console.warn(`[guards] the ${k} warm set was not built (its first spawn compiles)`, e);
    }
  }
  if (built.length) {
    const own = new Set<Mesh>();
    const viaInstances = new Set<Mesh>();
    for (const r of built) {
      for (const m of r.getChildMeshes(false)) {
        if (m instanceof InstancedMesh) addWithLods(viaInstances, m.sourceMesh);
        else if (m instanceof Mesh) addWithLods(own, m);
      }
    }
    // (instances draw instanced where the engine can: as `Mesh.isReady` decides it)
    const inst = !!scene.getEngine().getCaps().instancedArrays;
    const meshes = [...own];
    const sources = [...viaInstances];
    const lights = scene.lights;
    const ready = (): boolean => {
      let all = true;
      for (let i = 0; i < meshes.length; i++) if (!warmReady(meshes[i]!, lights, false)) all = false;
      for (let i = 0; i < sources.length; i++) if (!warmReady(sources[i]!, lights, inst)) all = false;
      return all;
    };
    sets.runs.push(
      untilWarm(scene, ready, '[guards] the guard warm sets did not compile on the loading screen (a later guard compiles at its first draw)').catch((e: unknown) => {
        console.warn('[guards] the guard warm sets\' compile stopped', e);
      }),
    );
  }
  await Promise.all(sets.runs);
  let n = 0;
  for (const k of kinds) if (sets.roots.has(k)) n++;
  return n;
}
