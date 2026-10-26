/**
 * (map-ready S3) Warm later arrivals: per guard kind one hidden copy of what a later spawn builds (`warmGuardSets`),
 * disabled, never pickable, never a shadow caster, its main pass and its depth pass for every shadow generator in the
 * scene compiled on the loading screen; a guard of any kind built afterwards the way `Enemy` builds him (with his gear,
 * the dog's model, the shield, the sniper's parts), and a real `EnemyManager.spawn` of each ctcourse squad kind, add no
 * program to the engine's cache. Nothing with the flag off; a second call builds nothing; a material that never gets
 * ready gives up after WARM_GIVE_UP_MS with one warn, never rejecting; with the guard figures only the dog's model and the
 * sniper's parts. (step 2) The helmet drop and the shield file at load.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AbstractMesh, Effect, Mesh, Scene, ShadowGenerator } from '../src/core/babylon';
import type { EnemyKind } from '../src/ai/enemyDefs';
import type { GearWorld } from '../src/ai/gearParts';
import type { GuardAsset } from '../src/operators/guards/guardAssets';
import type * as GuardAssets from '../src/operators/guards/guardAssets';
import type { GuardManifest } from '../src/operators/guards/gearMask';
import { guardGlb, type GuardTri } from './helpers/guardGlb';

const H = vi.hoisted(() => ({ assets: new Map<string, unknown>(), shield: null as [string, string, string, string] | null }));

vi.mock('../src/operators/guards/guardAssets', async (orig) => {
  const actual = await orig<typeof GuardAssets>();
  return {
    ...actual,
    guardAsset: (base: string) => (H.assets.get(base) as GuardAsset | undefined) ?? actual.guardAsset(base as never),
    shieldUrls: () => H.shield,
  };
});

// (the real spawn's hit volumes need a physics engine: stand-ins, as `consoleNoticeA4.test.ts`)
vi.mock('../src/ai/hitboxes', () => ({
  Hitboxes: class {
    sync(): void {}
    setSolid(): void {}
    dispose(): void {}
  },
}));

/** As `charShadows.ts` hides its tile lights from every mesh. */
const NO_MESH_LAYER = 0x20000000;

let flagsBefore: { mapReady: boolean; guardModels: boolean };

beforeEach(async () => {
  const { flags } = await import('../src/core/flags');
  flagsBefore = { mapReady: flags.mapReady, guardModels: flags.guardModels };
  flags.mapReady = true;
  flags.guardModels = false;
});

afterEach(async () => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  H.assets.clear();
  H.shield = null;
  const { flags } = await import('../src/core/flags');
  flags.mapReady = flagsBefore.mapReady;
  flags.guardModels = flagsBefore.guardModels;
});

type Compiled = { _compiledEffects: Record<string, Effect> };

async function setup() {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const B = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const W = await import('../src/ai/guardWarm');
  const { ENEMIES, ENEMY_KINDS } = await import('../src/ai/enemyDefs');
  const engine = new NullEngine();
  const scene: Scene = new B.Scene(engine);
  const parts = new PartLibrary(scene);
  // the sun's generator and a character-shadow tile's (`charShadows.ts:317`), no guard in either cast list. The sun's
  // list holds one level static from the start, as `World.sunCasters` always does in play: an empty list turns every
  // receiver's shadow defines off (Babylon `PrepareDefinesForLight` skips a generator with nothing to cast), a
  // scene-wide variant that is not a guard's
  const sun = new B.DirectionalLight('sun', new B.Vector3(0, -1, 0.3), scene);
  const sunGen = new B.ShadowGenerator(256, sun);
  const level = B.CreateBox('level-static', { size: 1 }, scene);
  sunGen.getShadowMap()!.renderList = [level];
  const tile = new B.SpotLight('charshadow-0', new B.Vector3(0, -50, 0), new B.Vector3(0, -1, 0), 1, 1, scene);
  tile.includeOnlyWithLayerMask = NO_MESH_LAYER;
  tile.intensity = 0;
  const tileGen = new B.ShadowGenerator(128, tile, true, undefined, true);
  tileGen.bias = 0;
  tileGen.normalBias = 0;
  tileGen.forceBackFacesOnly = true;
  tileGen.transparencyShadow = false;
  tileGen.getShadowMap()!.renderList = [];
  const gens: ShadowGenerator[] = [sunGen, tileGen];
  const casters: AbstractMesh[] = [];
  const map = { id: 'testmap', theme: { faction: 'urban' } };
  // the warm's world: a spy for its shadow list
  const casterSpy = vi.fn((m: AbstractMesh) => void casters.push(m));
  const world = { parts, map, addShadowCaster: casterSpy } as unknown as GearWorld;
  // a spawn's world: its casters go into both cast lists, as `World.addShadowCaster` and the tile's list would
  const playWorld = {
    parts,
    map,
    addShadowCaster: (m: AbstractMesh): void => {
      sunGen.getShadowMap()!.renderList!.push(m);
      tileGen.getShadowMap()!.renderList!.push(m);
    },
  };
  const compiled = (): number => Object.keys((engine as unknown as Compiled)._compiledEffects).length;
  const inst = !!engine.getCaps().instancedArrays;
  /** `ms` ready as the renderer draws them: the main pass (`isReady(true)`, an instance through its source) and both
   *  generators' depth pass under their render pass ids (`guardFigureWarm.test.ts:203-209`). Asking compiles. */
  const readyAll = (ms: readonly AbstractMesh[]): boolean => {
    let ok = true;
    for (const m of ms) {
      if (m.isDisposed() || !m.subMeshes?.length) continue;
      if (!m.isReady(true)) ok = false;
      const viaInst = m instanceof B.InstancedMesh;
      const target = (viaInst ? (m as InstanceType<typeof B.InstancedMesh>).sourceMesh : m) as Mesh;
      for (const g of gens) {
        const sm = g.getShadowMap()!;
        const pass = engine.currentRenderPassId;
        for (const id of sm.renderPassIds) {
          engine.currentRenderPassId = id;
          for (const s of target.subMeshes) if (!g.isReady(s, viaInst && inst, false)) ok = false;
        }
        engine.currentRenderPassId = pass;
      }
    }
    return ok;
  };
  return { B, engine, scene, parts, world, casterSpy, playWorld: playWorld as unknown as GearWorld, casters, gens, compiled, readyAll, W, ENEMIES, ENEMY_KINDS };
}

/** One guard of kind `k` built the way `Enemy`'s constructor builds him (`enemy.ts:649-683`), with his gear
 *  (`enemy.ts:872-889`). */
async function buildLikeEnemy(scene: Scene, world: GearWorld, k: EnemyKind, name: string): Promise<void> {
  const { buildEnemyRig } = await import('../src/ai/enemyRig');
  const { DogModel } = await import('../src/ai/dogModel');
  const G = await import('../src/ai/gearParts');
  const { ENEMIES } = await import('../src/ai/enemyDefs');
  const def = ENEMIES[k];
  const built = buildEnemyRig(scene, world as never, def, name);
  if (def.quadruped) {
    built.rig.root.setEnabled(false);
    built.rig.standIn = true;
    built.gun?.dispose();
    new DogModel(scene, world.parts, def.look.colors.torso, def.look.colors.accent);
  }
  if (k === 'enforcer') G.buildShieldPart(world, built.rig.root, def.scale);
  if (k === 'sniper') {
    world.parts.instance('cyl', '#ff2a1a', 'laser').isVisible = false;
    world.parts.instance('sphere', '#ffffff', 'glint').isVisible = false;
  }
  if (!def.quadruped) {
    G.buildHelmetPart(world, built.rig, G.gearColour(def, world, 'helmet'));
    G.buildArmourParts(world, built.rig, G.gearColour(def, world, 'accent'));
  }
}

describe('map-ready S3: the guard warm sets', () => {
  it('(a) guardKindsFor: none in the sandbox, else every kind once, in kind order (the dog too)', async () => {
    const { W, ENEMY_KINDS } = await setup();
    expect(W.guardKindsFor('warehouse', 'sandbox')).toEqual([]);
    for (const mode of ['mission', 'clear', 'infiltration', 'course', 'sector'] as const) {
      const ks = W.guardKindsFor('ctcourse', mode);
      expect(ks).toEqual([...ENEMY_KINDS]);
      expect(ks).toContain('dog');
      expect(new Set(ks).size).toBe(ks.length);
    }
    // a copy: the caller may keep it
    expect(W.guardKindsFor('ctcourse', 'course')).not.toBe(ENEMY_KINDS);
  });

  it('(b) one set per kind: every mesh disabled and not pickable, no caster added anywhere', async () => {
    const { B, scene, world, casterSpy, casters, gens, W, ENEMY_KINDS } = await setup();
    const { LIVE_RIGS } = await import('../src/player/characterRig');
    const n = await W.warmGuardSets(scene, world, ENEMY_KINDS);
    expect(n).toBe(ENEMY_KINDS.length);
    const roots = W.guardWarmSets(scene);
    expect(roots.map((r) => r.name)).toEqual(ENEMY_KINDS.map((k) => `guard-warm-set-${k}`));
    const names = (k: string): string[] => roots.find((r) => r.name === `guard-warm-set-${k}`)!.getChildMeshes(false).map((m) => m.name);
    for (const r of roots) {
      expect(r.isEnabled(false)).toBe(false);
      const ms = r.getChildMeshes(false);
      expect(ms.length).toBeGreaterThan(0);
      for (const m of ms) {
        expect(m.isEnabled(false)).toBe(false);
        expect(m.isEnabled()).toBe(false);
        expect(m.isPickable).toBe(false);
      }
    }
    // what each set holds: a merged body (hi / low) for every kind, the gear on the humans, the kind's own parts
    for (const k of ENEMY_KINDS) {
      const ns = names(k);
      expect(ns).toContain(`guard-warm-set-${k}-smooth`);
      expect(ns).toContain(`guard-warm-set-${k}-smooth-lod`);
      if (k === 'dog') {
        expect(ns).toContain('dog-part');
        expect(ns).not.toContain('enemy-helmet');
      } else {
        expect(ns).toContain('enemy-helmet');
        expect(ns).toContain('enemy-armour');
      }
    }
    expect(names('enforcer')).toContain('shield');
    expect(names('sniper')).toEqual(expect.arrayContaining(['laser', 'glint']));
    expect(names('grunt')).toContain('guard-warm-set-grunt-gun');
    // never a caster: the world's shadow list untouched, nothing added to either cast list
    expect(casterSpy).not.toHaveBeenCalled();
    expect(casters).toEqual([]);
    expect(gens[0]!.getShadowMap()!.renderList!.map((m) => m.name)).toEqual(['level-static']);
    expect(gens[1]!.getShadowMap()!.renderList!.length).toBe(0);
    // the set rigs are stand-ins (thermal's door figures skip them)
    const setRigs = LIVE_RIGS.filter((r) => r.root.name.startsWith('guard-warm-set-'));
    expect(setRigs.length).toBe(ENEMY_KINDS.length);
    for (const r of setRigs) expect(r.standIn).toBe(true);
    // the sets' own meshes compiled: their main effect is in
    for (const m of scene.meshes) if (m.name.startsWith('guard-warm-set-') && m.name.endsWith('-smooth')) expect((m as Mesh).subMeshes[0]!.effect?.isReady()).toBe(true);
    expect(scene.meshes.some((m) => m instanceof B.InstancedMesh && m.name === 'laser')).toBe(true);
    scene.dispose();
  });

  it('(c) the key test: a guard of every kind built afterwards, gear and all, adds no program (main and both depth passes)', async () => {
    const { scene, world, playWorld, compiled, readyAll, W, ENEMY_KINDS } = await setup();
    await W.warmGuardSets(scene, world, ENEMY_KINDS);
    const before = compiled();
    expect(before).toBeGreaterThan(0);
    const had = new Set(scene.meshes);
    for (const k of ENEMY_KINDS) await buildLikeEnemy(scene, playWorld, k, `g-${k}`);
    const fresh = scene.meshes.filter((m) => !had.has(m));
    expect(fresh.length).toBeGreaterThan(ENEMY_KINDS.length * 4);
    await vi.waitFor(() => expect(readyAll(fresh)).toBe(true), { timeout: 10000, interval: 20 });
    expect(compiled()).toBe(before);
    scene.dispose();
  });

  it('(c) control: without the warm the same guards do compile new programs', async () => {
    const { scene, playWorld, compiled, readyAll, ENEMY_KINDS } = await setup();
    await vi.waitFor(() => expect(readyAll(scene.meshes.slice())).toBe(true), { timeout: 10000, interval: 20 });
    const before = compiled();
    const had = new Set(scene.meshes);
    for (const k of ENEMY_KINDS) await buildLikeEnemy(scene, playWorld, k, `g-${k}`);
    const fresh = scene.meshes.filter((m) => !had.has(m));
    await vi.waitFor(() => expect(readyAll(fresh)).toBe(true), { timeout: 10000, interval: 20 });
    expect(compiled()).toBeGreaterThan(before);
    scene.dispose();
  });

  it('(d) a real EnemyManager.spawn of each ctcourse squad kind on the built level, after the warm: 0 new programs', async () => {
    const { scene, parts, playWorld, compiled, readyAll, W } = await setup();
    const { Vector3 } = await import('../src/core/babylon');
    const { LevelBuilder } = await import('../src/world/levelBuilder');
    const { ctcourse } = await import('../src/world/maps/ctcourse');
    const { runtimeNav } = await import('./helpers/runtimeNav');
    const { EnemyManager } = await import('../src/ai/enemyManager');
    const { DIFFICULTY } = await import('../src/ai/archetypes');
    const { DamageRegistry } = await import('../src/game/damage');
    const b = new LevelBuilder();
    const lay = ctcourse.build(b, 0);
    const nav = runtimeNav(b, lay.playerSpawns[0]!.pos, ctcourse.navLayers ?? 3, lay.navSeeds ?? []);
    const world = { ...playWorld, parts, map: { id: 'ctcourse', theme: { faction: 'urban' } }, level: { lights: b.lights, cover: [], coverSegments: [] }, layout: lay, doors: { list: [] } };
    const noop = <T extends object>(o: T): T => new Proxy(o, { get: (t, k) => (k in t ? (t as Record<string | symbol, unknown>)[k] : () => undefined) });
    const em = new EnemyManager(scene, world as never, nav, new DamageRegistry(), noop({}) as never, noop({}) as never, DIFFICULTY.normal, () => []);
    // the warm on the caster-free path, through the kinds the course reads (every kind, A22)
    const n = await W.warmGuardSets(scene, world as never, W.guardKindsFor('ctcourse', 'course'));
    expect(n).toBe(8);
    const before = compiled();
    const squads = Object.values(lay.course!.squads);
    const kinds = [...new Set(squads.map((s) => s.kind))];
    expect(kinds.length).toBeGreaterThan(0);
    const had = new Set(scene.meshes);
    for (const kind of kinds) {
      const s = squads.find((q) => q.kind === kind)!;
      const e = em.spawn(kind, new Vector3(s.x, s.y ?? Number.NaN, s.z), false, s.yaw);
      expect(e, kind).not.toBeNull();
    }
    const fresh = scene.meshes.filter((m) => !had.has(m));
    expect(fresh.length).toBeGreaterThan(kinds.length * 4);
    await vi.waitFor(() => expect(readyAll(fresh)).toBe(true), { timeout: 10000, interval: 20 });
    expect(compiled()).toBe(before);
    scene.dispose();
  });

  it('(e) flag off: resolves 0 at once, nothing built', async () => {
    const { scene, world, W, ENEMY_KINDS } = await setup();
    const { flags } = await import('../src/core/flags');
    flags.mapReady = false;
    const meshes = scene.meshes.length;
    const nodes = scene.transformNodes.length;
    expect(await W.warmGuardSets(scene, world, ENEMY_KINDS)).toBe(0);
    expect(scene.meshes.length).toBe(meshes);
    expect(scene.transformNodes.length).toBe(nodes);
    expect(W.guardWarmSets(scene)).toEqual([]);
    scene.dispose();
  });

  it('(f) a second call in the same scene builds nothing more', async () => {
    const { scene, world, W, ENEMY_KINDS } = await setup();
    expect(await W.warmGuardSets(scene, world, ENEMY_KINDS)).toBe(ENEMY_KINDS.length);
    const roots = W.guardWarmSets(scene);
    const meshes = scene.meshes.length;
    const nodes = scene.transformNodes.length;
    expect(await W.warmGuardSets(scene, world, ENEMY_KINDS)).toBe(ENEMY_KINDS.length);
    expect(scene.meshes.length).toBe(meshes);
    expect(scene.transformNodes.length).toBe(nodes);
    expect(W.guardWarmSets(scene)).toEqual(roots);
    scene.dispose();
  });

  it('(g) a material that never reports ready: resolves after WARM_GIVE_UP_MS with one warn, never rejects', async () => {
    const { scene, parts, world, W, ENEMY_KINDS } = await setup();
    vi.spyOn(parts.skinMaterial, 'isReadyForSubMesh').mockReturnValue(false);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.useFakeTimers();
    let out: number | 'rejected' | null = null;
    W.warmGuardSets(scene, world, ENEMY_KINDS).then(
      (n) => (out = n),
      () => (out = 'rejected'),
    );
    await vi.advanceTimersByTimeAsync(W.WARM_GIVE_UP_MS - 200);
    expect(out).toBeNull();
    await vi.advanceTimersByTimeAsync(400);
    expect(out).toBe(ENEMY_KINDS.length);
    const mine = warn.mock.calls.filter((c) => String(c[0]).includes('warm sets'));
    expect(mine.length).toBe(1);
    vi.useRealTimers();
    scene.dispose();
  });

  it('(h) with the guard figures: no rig built, only the dog\'s model and the sniper\'s parts', async () => {
    const { scene, world, casterSpy, W, ENEMY_KINDS } = await setup();
    const { flags } = await import('../src/core/flags');
    const { liveGuardBodies } = await import('../src/ai/guardBody');
    flags.guardModels = true;
    const fetched: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      fetched.push(url);
      return new Response(null, { status: 404 });
    });
    await W.warmGuardSets(scene, world, ENEMY_KINDS);
    expect(liveGuardBodies(scene).length).toBe(0);
    expect(scene.meshes.some((m) => m.name.includes('-smooth'))).toBe(false);
    expect(scene.transformNodes.some((t) => t.name.startsWith('guard-warm-set-') && t.name.endsWith('-root'))).toBe(false);
    const all = W.guardWarmSets(scene).flatMap((r) => r.getChildMeshes(false).map((m) => `${r.name}:${m.name}`));
    expect(all.length).toBeGreaterThan(0);
    for (const s of all) expect(s.startsWith('guard-warm-set-dog:') || s.startsWith('guard-warm-set-sniper:'), s).toBe(true);
    expect(all.filter((s) => s.startsWith('guard-warm-set-dog:')).every((s) => s.endsWith(':dog-part'))).toBe(true);
    expect(all.filter((s) => s.startsWith('guard-warm-set-sniper:')).sort()).toEqual(['guard-warm-set-sniper:glint', 'guard-warm-set-sniper:laser']);
    expect(casterSpy).not.toHaveBeenCalled();
    expect(fetched).toEqual([]);
    scene.dispose();
  });
});


// ---- (step 2) the helmet drop and the shield file at load (the `guardHelmetDrop` / `guardShieldShare` mocks) ----

const tris = (pieces: readonly string[]): GuardTri[] =>
  pieces.map((p, i) => ({ piece: i, tint: i % 3, joint: i === 0 ? 'wrL' : p === 'plate_heavy' ? 'chest' : 'head', at: [0.02 * i, 1.6 + 0.01 * i, 0.1] }));
const manifest = (base: 'average' | 'lean' | 'broad', pieces: string[]): GuardManifest => ({
  id: `guard-${base}`, base, urls: ['', `/guard-${base}-lod0.glb`, `/guard-${base}-lod1.glb`, `/guard-${base}-lod2.glb`], pieces, tintSlots: 3, refHeight: 1.77,
});
const AVG = manifest('average', ['average', 'helmet_std', 'vest_soft']);
const BROAD = manifest('broad', ['broad', 'broad-1', 'balaclava', 'helmet_heavy', 'plate_heavy', 'pouch_belt', 'uniform']);
const SHIELD: [string, string, string, string] = ['', '/shield-lod0.glb', '/shield-lod1.glb', '/shield-lod2.glb'];
const SHIELD_TRIS: GuardTri[] = [
  { piece: 0, tint: 0, joint: 'elL', at: [-0.3, 1.1, 0.3] },
  { piece: 0, tint: 0, joint: 'wrL', at: [-0.35, 0.95, 0.3] },
];

/** The files of `ms` (and the shield's) served from memory; every fetch recorded. */
async function serve(ms: readonly GuardManifest[]): Promise<string[]> {
  const bin: Record<string, ArrayBuffer> = {};
  for (const m of ms) for (const l of ['lod0', 'lod1', 'lod2']) bin[`/guard-${m.base}-${l}.glb`] = guardGlb(tris(m.pieces));
  for (const l of ['lod0', 'lod1', 'lod2']) bin[`/shield-${l}.glb`] = guardGlb(SHIELD_TRIS);
  const fetched: string[] = [];
  vi.stubGlobal('fetch', async (url: string) => {
    fetched.push(url);
    return bin[url] ? new Response(bin[url]!.slice(0)) : new Response(null, { status: 404 });
  });
  const { forgetModels } = await import('../src/operators/runtime/figure');
  forgetModels();
  return fetched;
}

describe('map-ready S3: the helmet drop and the shield at load', () => {
  it('helmetDropReady: true with one disabled warm instance; the first drop then takes the same source, no second fetch', async () => {
    H.assets.set('average', { manifest: AVG, standIn: false, problems: [] });
    const fetched = await serve([AVG]);
    const { scene, B } = await setup();
    const G = await import('../src/ai/guardHelmet');
    expect(await G.helmetDropReady(scene)).toBe(true);
    const warm = scene.meshes.filter((m) => m.name === 'helmet-drop-warm');
    expect(warm.length).toBe(1);
    const w = warm[0] as InstanceType<typeof B.InstancedMesh>;
    expect(w).toBeInstanceOf(B.InstancedMesh);
    expect(w.isEnabled(false)).toBe(false);
    expect(w.isPickable).toBe(false);
    const n = fetched.length;
    expect(fetched.filter((u) => u === '/guard-average-lod1.glb').length).toBe(1);
    const src = G.helmetDropSource(scene);
    expect(src).not.toBeNull();
    expect(w.sourceMesh).toBe(src!.mesh);
    // a second call: the same load, the same warm instance
    expect(await G.helmetDropReady(scene)).toBe(true);
    expect(scene.meshes.filter((m) => m.name === 'helmet-drop-warm').length).toBe(1);
    expect(fetched.length).toBe(n);
    scene.dispose();
  });

  it('helmetDropReady: false with no helmet_std file in the build (nothing fetched), false when the load fails', async () => {
    H.assets.set('average', { manifest: { ...AVG, pieces: ['average', 'vest_soft'] }, standIn: false, problems: [] });
    H.assets.set('lean', { manifest: manifest('lean', ['lean']), standIn: true, problems: [] });
    const fetched = await serve([]);
    const a = await setup();
    const G = await import('../src/ai/guardHelmet');
    expect(G.helmetManifest()).toBeNull();
    expect(await G.helmetDropReady(a.scene)).toBe(false);
    expect(fetched).toEqual([]);
    expect(a.scene.meshes.some((m) => m.name === 'helmet-drop-warm')).toBe(false);
    a.scene.dispose();
    // the file named but missing
    H.assets.set('average', { manifest: { ...AVG, urls: ['', '/x0.glb', '/missing-lod1.glb', '/x2.glb'] }, standIn: false, problems: [] });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const b = await setup();
    expect(await G.helmetDropReady(b.scene)).toBe(false);
    expect(G.helmetDropSource(b.scene)).toBeNull();
    expect(warn).toHaveBeenCalled();
    b.scene.dispose();
  });

  it('preloadShield, then the enforcer\'s guardShieldFor: the shield url fetched once in total', async () => {
    const { flags } = await import('../src/core/flags');
    flags.guardModels = true;
    H.assets.set('broad', { manifest: BROAD, standIn: false, problems: [] });
    H.shield = SHIELD;
    const fetched = await serve([BROAD]);
    const { scene, parts, ENEMIES } = await setup();
    const S = await import('../src/ai/guardShield');
    const { buildEnemyRig } = await import('../src/ai/enemyRig');
    expect(await S.preloadShield()).toBe(true);
    expect(fetched.filter((u) => u === '/shield-lod1.glb').length).toBe(1);
    const world = { parts, map: { id: 'testmap', theme: { faction: 'urban' } }, addShadowCaster: () => {} };
    const gb = buildEnemyRig(scene, world as never, ENEMIES.enforcer, 'e1').figure!;
    expect(gb).not.toBeNull();
    const sh = S.guardShieldFor(scene, gb, () => {});
    expect(sh).not.toBeNull();
    await vi.waitFor(() => expect(S.sharedShieldCount(scene)).toBe(1));
    expect(fetched.filter((u) => u === '/shield-lod1.glb').length).toBe(1);
    scene.dispose();
  });

  it('preloadShield: false with no shield files (shieldUrls null), nothing fetched', async () => {
    H.shield = null;
    const fetched = await serve([]);
    const S = await import('../src/ai/guardShield');
    expect(await S.preloadShield()).toBe(false);
    expect(fetched).toEqual([]);
  });
});
