/**
 * (guard-models G7b) The level load's guard step, with `flags.guardModels` on only (PLAN G7 last bullet, PLAN 8 risk):
 * - every game LOD of every guard base the map's guards can use is in the scene's guard library before play ((F59)
 *   LOD2, then LOD0 and LOD1, as a guard loads them; `?gfx=min` LOD2 only), so a guard's figure shows on its first
 *   frame instead of a moment after (the merged body covered that gap before);
 * - the guard shader (the operator PBR material with `GuardFigurePlugin`, GUARDFIG on: G5's plugin variant) and its
 *   shadow-depth variant are compiled on the loading screen, once per base and LOD, not at a guard's first draw;
 * - (F59) with the level's part library given, the merged S1 body's shader too (`partSkinMat`, SMOOTHBODY on): with
 *   figures on, a guard's merged body is disabled before it ever draws, so its program would first compile when it has
 *   to stand in (gm-watchdog: the figure's shader not ready), and D3D11 takes seconds on it.
 *
 * Which bases: every human kind's (`ENEMIES` minus the dog). Reinforcements, response squads and the sector slots
 * can bring any kind into a level, and a base is per kind (G6), so this is the set of bases the map's guards use:
 * three bases at most (while Wren stands in, all three are Wren's files, already loaded for the player).
 *
 * The compile: one hidden mesh per (base, LOD, primitive), built exactly as a guard's (the shared static vertex
 * buffers, a `gvis` buffer, a skeleton with the LOD's bone count, 4 influences, shadows received) so its defines are a
 * guard's, and the engine's effect cache hands every later guard the compiled program; the merged body's is a real
 * `SmoothBody` over one part of the guard part library. The meshes stay in the scene, disabled (never drawn, freed
 * with the scene): their sub-meshes hold the effects, so the engine never releases them before a guard takes them.
 * (F59) The cap (`capMs`, the loading screen's): one deadline for the whole step. Past it the step stops waiting; a
 * load landing later still builds its warm meshes and starts their compile, and a guard drawn before that compile is
 * done shows the merged stand-in (gm-watchdog). Render side only; gameplay reads none of it.
 */
import { Bone, Matrix, Mesh, Skeleton, TransformNode, VertexBuffer, type Scene } from '../core/babylon';
import { flags } from '../core/flags';
import type { GuardBase } from '../operators/guards/gearMask';
import { guardAsset } from '../operators/guards/guardAssets';
import { createVariant, guardVariant } from '../operators/guards/guardVariant';
import { guardLibrary, type GuardLodAsset } from '../operators/runtime/guardFigure';
import { LOD_0, LOD_1, LOD_2, LOD_NAMES } from '../operators/runtime/manifest';
import { pageLeaving } from '../operators/runtime/offline';
import { buildSmoothBody } from '../player/smoothBody';
import type { PartLibrary } from '../world/partLibrary';
import { ENEMIES, ENEMY_KINDS } from './enemyDefs';

/** A warm compile that never gets ready (a shader error) stops polling after this long (ms), unless a cap is given. */
const WARM_GIVE_UP_MS = 20000;

/** (F59) The `WARMED` key of the merged S1 body's warm. */
const S1_KEY = 's1';

/** (F59) The figure LODs a guard loads in play, far first (`GuardBody`: `?gfx=min` LOD2 only, else LOD2, then LOD0
 *  and LOD1 together). */
export function guardGameLods(): readonly number[] {
  return flags.gfx === 'min' ? [LOD_2] : [LOD_2, LOD_0, LOD_1];
}

/** (F59) The level load's options. */
export interface GuardWarmOptions {
  /** The level's part library: the merged S1 body's shader is warmed too (not without it). */
  parts?: Pick<PartLibrary, 'instance'>;
  /** The whole step stops waiting this long after the call (ms): the loading screen's cap. Default `WARM_GIVE_UP_MS`. */
  capMs?: number;
}

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

/** (F59) Per scene: guard bases whose loads are still in flight (their warm meshes not all built yet). */
const PENDING = new WeakMap<Scene, { n: number }>();

/** (F59) Guard bases of `scene` still loading for the warm (0: every warm mesh is built). The map-ready gate reads it
 *  each gate read: no allocation. */
export function guardWarmPending(scene: Scene): number {
  return PENDING.get(scene)?.n ?? 0;
}

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
 * (F59) A hidden merged S1 body built as a guard's (`buildSmoothBody` over one part of the guard part library, on a
 * joint under its own root), both meshes disabled; none when merging is off (`?guardmerge=0`). Load time, allocates.
 * One joint: the bone count is not in the defines where bones live in a texture (every desktop WebGL2).
 */
function smoothWarmMeshes(scene: Scene, parts: Pick<PartLibrary, 'instance'>): Mesh[] {
  const root = new TransformNode('guard-warm-s1-root', scene);
  const joint = new TransformNode('guard-warm-s1-joint', scene);
  joint.parent = root;
  const part = parts.instance('capsule', '#808080', 'enemy-warm');
  part.parent = joint;
  const body = buildSmoothBody(scene, root, [part], 'guard-warm-s1');
  // (the body copied what it needs; the part was only its source)
  part.dispose();
  if (!body) {
    root.dispose();
    return [];
  }
  for (const m of body.meshes) m.setEnabled(false);
  return body.meshes;
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

/** Polls `meshes` until every one is compiled or `WARM_GIVE_UP_MS` passes, then stops waiting (the compile its first
 *  poll started goes on). (F59 check FIX 2) its own give-up, not the loading screen's cap: the cap only ends the
 *  load's wait (`warmGuardModels`' race), so a slow cold compile past the cap is not a console warning. */
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
        // (F59, e2e-desktop:4) info, not a warning: the compile goes on and the merged body stands in until it is ready
        // (gm-watchdog); a slow preset outlasting the give-up is not a fault (e2e counts warnings as errors)
        console.info('[guards] the guard shader did not compile on the loading screen (it compiles at the first draw)');
        return resolve();
      }
      setTimeout(tick, 16);
    };
    tick();
  });
}

/** Builds `a`'s warm meshes now; resolves once they compiled or the cap passed (true), false when the build threw. */
function warmAsset(scene: Scene, a: GuardLodAsset, done: Set<string>): Promise<boolean> {
  if (scene.isDisposed) return Promise.resolve(false);
  if (done.has(a.key)) return Promise.resolve(true);
  done.add(a.key);
  // (G7b check polish 1) a throw while building the warm meshes must not reject the level load
  try {
    return untilWarm(scene, warmMeshes(scene, a)).then(() => true);
  } catch (e: unknown) {
    console.warn(`[guards] ${a.key} shader warm failed (it compiles at the first draw)`, e);
    return Promise.resolve(false);
  }
}

/**
 * (F59) One base: its game LODs loaded as a guard loads them (the far one first; a far load that fails stops there, as
 * the guard's own load does), each LOD's warm meshes built on arrival. Counted in `PENDING` until every load settled.
 * True when every game LOD warmed.
 */
async function warmBase(scene: Scene, id: string, load: (lod: number) => Promise<GuardLodAsset>, done: Set<string>): Promise<boolean> {
  const lods = guardGameLods();
  const waits: Promise<boolean>[] = [];
  let ok = true;
  let pend = PENDING.get(scene);
  if (!pend) PENDING.set(scene, (pend = { n: 0 }));
  pend.n++;
  try {
    for (const batch of [lods.slice(0, 1), lods.slice(1)]) {
      const got = await Promise.all(
        batch.map((lod) =>
          load(lod).catch((e: unknown) => {
            if (!pageLeaving() && !scene.isDisposed) {
              console.warn(lod === LOD_2 ? `[guards] ${id} LOD2 not loaded for the level (the merged body stays)` : `[guards] ${id} ${LOD_NAMES[lod] ?? lod} not loaded for the level (it loads at the spawn)`, e);
            }
            return null;
          }),
        ),
      );
      for (const a of got) {
        if (a) waits.push(warmAsset(scene, a, done));
        else ok = false;
      }
      if (!ok || scene.isDisposed) break;
    }
  } finally {
    pend.n--;
  }
  const res = await Promise.all(waits);
  for (const r of res) if (!r) ok = false;
  return ok && !scene.isDisposed;
}

/**
 * The level load's guard step (`GameState.create`, before play): every game LOD of every base of `kinds` (default:
 * every human kind) loaded into the scene's guard library and the guard shader compiled for each; (F59) with
 * `opts.parts`, the merged S1 body's shader too. Resolves with the number of bases whose every game LOD warmed, at the
 * latest at `opts.capMs` (later loads go on warming without it); never rejects (a failed load is reported and the
 * merged body covers that base, as before). Nothing with the flag off.
 */
export async function warmGuardModels(scene: Scene, mapId = '', kinds: readonly string[] = guardKinds(), opts: GuardWarmOptions = {}): Promise<number> {
  if (!flags.guardModels) return 0;
  const until = Date.now() + (opts.capMs ?? WARM_GIVE_UP_MS);
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
    runs.push(warmBase(scene, m.id, (lod) => lib.load(m, lod), done));
  }
  let s1: Promise<void> | null = null;
  if (opts.parts && !done.has(S1_KEY)) {
    done.add(S1_KEY);
    try {
      s1 = untilWarm(scene, smoothWarmMeshes(scene, opts.parts));
    } catch (e: unknown) {
      console.warn('[guards] the merged body shader warm failed (it compiles at the first draw)', e);
    }
  }
  // (past the cap: stop waiting, counting the bases done by then; the loads and compiles in flight go on)
  const settled: boolean[] = [];
  const all = Promise.all([...runs.map((r) => r.then((b) => void settled.push(b))), s1]);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cap = new Promise<void>((r) => (timer = setTimeout(r, Math.max(0, until - Date.now()))));
  await Promise.race([all, cap]);
  clearTimeout(timer);
  let n = 0;
  for (const b of settled) if (b) n++;
  return n;
}
