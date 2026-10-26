/**
 * (guard-models G7b) The guard shader's one packed varying (behaviour identical to G5's two: every heat / flash level
 * decodes to the same values, with interpolation noise), and the level load's guard step (`warmGuardModels`): every
 * game LOD ((F59) LOD2 first, then LOD0 and LOD1) of every guard base in the scene's library and the guard shader
 * compiled before play on hidden meshes whose defines are a real guard's (the later guard gets the very same compiled
 * effect at each LOD); (F59) the merged S1 body's too; the cap stops the wait, not the warm; nothing with the flag off;
 * a failed base does not hold or break the load.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Scene } from '../src/core/babylon';
import type { GuardManifest } from '../src/operators/guards/gearMask';
import type { GuardAsset } from '../src/operators/guards/guardAssets';
import type * as GuardAssets from '../src/operators/guards/guardAssets';
import { guardGlb, type GuardTri } from './helpers/guardGlb';

const H = vi.hoisted(() => ({ assets: new Map<string, unknown>() }));

vi.mock('../src/operators/guards/guardAssets', async (orig) => {
  const actual = await orig<typeof GuardAssets>();
  return {
    ...actual,
    guardAsset: (base: string) => (H.assets.get(base) as GuardAsset | undefined) ?? actual.guardAsset(base as never),
    shieldUrls: () => null,
  };
});

const tris = (pieces: readonly string[]): GuardTri[] =>
  pieces.map((_, i) => ({ piece: i, tint: i % 3, joint: i === 0 ? 'wrL' : 'head', at: [0.01 * i, 1.2 + 0.01 * i, 0.1] }));
const manifest = (base: 'average' | 'lean' | 'broad', pieces: string[]): GuardManifest => ({
  id: `guard-${base}`, base, urls: ['', `/guard-${base}-lod0.glb`, `/guard-${base}-lod1.glb`, `/guard-${base}-lod2.glb`], pieces, tintSlots: 3, refHeight: 1.77,
});
const AVG = manifest('average', ['average', 'helmet_std', 'vest_soft']);
const LEAN = manifest('lean', ['lean', 'helmet_std']);
const BROAD = manifest('broad', ['broad', 'helmet_heavy', 'plate_heavy']);
let fetched: string[] = [];

beforeEach(async () => {
  H.assets.set('average', { manifest: AVG, standIn: false, problems: [] });
  H.assets.set('lean', { manifest: LEAN, standIn: false, problems: [] });
  H.assets.set('broad', { manifest: BROAD, standIn: false, problems: [] });
  const bin: Record<string, ArrayBuffer> = {};
  for (const m of [AVG, LEAN, BROAD]) for (const l of ['lod0', 'lod1', 'lod2']) bin[`/guard-${m.base}-${l}.glb`] = guardGlb(tris(m.pieces));
  fetched = [];
  vi.stubGlobal('fetch', async (url: string) => {
    fetched.push(url);
    return bin[url] ? new Response(bin[url]!.slice(0)) : new Response(null, { status: 404 });
  });
  const { forgetModels } = await import('../src/operators/runtime/figure');
  forgetModels();
  const { flags } = await import('../src/core/flags');
  flags.guardModels = true;
});

afterEach(async () => {
  vi.unstubAllGlobals();
  const { flags } = await import('../src/core/flags');
  flags.guardModels = false;
});

/** The vertex shader's packing and the fragment's split, as GLSL computes them (floats). */
const packW = (a: number): number => {
  const gFx = Math.floor((1 - a) * 255 + 0.5);
  const gHeat = Math.floor(gFx / 16);
  return gHeat + (gFx - gHeat * 16) / 16;
};
const splitW = (w: number): [number, number] => {
  const h = Math.floor(w + 0.5 / 16);
  return [Math.floor((w - h) * 16 + 0.5) / 15, h / 15];
};
/** G5's two varyings (the reference). */
const oldFx = (a: number): [number, number] => {
  const gFx = Math.floor((1 - a) * 255 + 0.5);
  const gHeat = Math.floor(gFx / 16);
  return [(gFx - gHeat * 16) / 15, gHeat / 15];
};

describe('the packed varying (G5 polish 1)', () => {
  it('every visible alpha byte decodes to G5\'s (flash, heat), also with interpolation noise of 1/64', () => {
    let n = 0;
    for (let byte = 1; byte <= 255; byte++) {
      const a = byte / 255;
      const ref = oldFx(a);
      for (const noise of [0, 1 / 64, -1 / 64, 1e-4, -1e-4]) {
        const got = splitW(Math.fround(packW(a)) + noise);
        expect(got[0]).toBeCloseTo(ref[0], 9);
        expect(got[1]).toBeCloseTo(ref[1], 9);
        n++;
      }
    }
    expect(n).toBe(255 * 5);
  });

  it('the PBR effect of a gvis mesh declares ONE guard varying, a vec4; the tint and the fx read through it', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const B = await import('../src/core/babylon');
    const { GuardFigurePlugin } = await import('../src/operators/runtime/guardFigurePlugin');
    const scene = new B.Scene(new NullEngine());
    const mat = new B.PBRMaterial('m', scene);
    new GuardFigurePlugin(mat);
    const mesh = B.CreateBox('b', {}, scene);
    mesh.setVerticesBuffer(new B.VertexBuffer(scene.getEngine(), new Uint8Array(mesh.getTotalVertices() * 4), 'gvis', { updatable: true, stride: 4, size: 4, type: B.VertexBuffer.UNSIGNED_BYTE, normalized: true }));
    mesh.material = mat;
    const sm = mesh.subMeshes[0]!;
    await vi.waitFor(() => expect(mat.isReadyForSubMesh(mesh, sm)).toBe(true));
    const fx = sm.effect! as unknown as { _vertexSourceCode: string; _fragmentSourceCode: string };
    const decl = /\b(?:varying|out|in)\s+(vec\d)\s+(vG\w+)\s*;/g;
    expect([...fx._vertexSourceCode.matchAll(decl)].map((m) => `${m[1]} ${m[2]}`)).toEqual(['vec4 vGfig']);
    expect([...fx._fragmentSourceCode.matchAll(decl)].map((m) => `${m[1]} ${m[2]}`)).toEqual(['vec4 vGfig']);
    expect(fx._vertexSourceCode).toContain('vGfig = vec4(gvis.rgb, gHeat + (gFx - gHeat * 16.0) / 16.0);');
    expect(fx._fragmentSourceCode).toContain('#define vGvis vGfig.rgb');
    expect(fx._fragmentSourceCode).toContain('#define vGfx guardFx(vGfig.w)');
    scene.dispose();
  });
});

async function setup() {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const B = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { buildEnemyRig } = await import('../src/ai/enemyRig');
  const W = await import('../src/ai/guardWarm');
  const { guardLibrary } = await import('../src/operators/runtime/guardFigure');
  const { ENEMIES } = await import('../src/ai/enemyDefs');
  const scene: Scene = new B.Scene(new NullEngine());
  const parts = new PartLibrary(scene);
  const world = { parts, map: { id: 'testmap', theme: { faction: 'urban' } }, addShadowCaster: () => {} };
  const render = (): void => void scene.onBeforeRenderObservable.notifyObservers(scene);
  return { B, scene, world, render, buildEnemyRig, W, guardLibrary, ENEMIES };
}

describe('the level load\'s guard step (warmGuardModels)', () => {
  it('the bases: every human kind\'s, each once; the dog none', async () => {
    const { W } = await setup();
    const V = await import('../src/operators/guards/guardVariant');
    const kinds = W.guardKinds();
    expect(kinds).not.toContain('dog');
    expect(kinds).toContain('grunt');
    const bases = W.guardBasesOf(kinds);
    const v = V.createVariant();
    for (const k of kinds) expect(bases).toContain(V.guardVariant(0, k, '', v).base);
    expect(new Set(bases).size).toBe(bases.length);
  });

  it('flag on: every game LOD of every base in the library before play, the shader compiled on hidden meshes, the later guard on the same effect', async () => {
    const { B, scene, world, render, buildEnemyRig, W, guardLibrary, ENEMIES } = await setup();
    // the level's camera exists at the load (the player's), 100 m away: the guard below shows LOD2
    const cam = new B.FreeCamera('far', new B.Vector3(0, 1.6, 100), scene);
    cam.getViewMatrix(true); // (its global position, before any render)
    scene.activeCamera = cam;
    const bases = W.guardBasesOf(W.guardKinds());
    const n = await W.warmGuardModels(scene, 'testmap');
    expect(n).toBe(bases.length);
    // (F59) LOD2, LOD0 and LOD1 of each base, its LOD2 first (as a guard loads them)
    for (const b of bases) {
      const at = (l: string): number => fetched.indexOf(`/guard-${b}-${l}.glb`);
      expect(at('lod2')).toBeGreaterThanOrEqual(0);
      expect(at('lod0')).toBeGreaterThan(at('lod2'));
      expect(at('lod1')).toBeGreaterThan(at('lod2'));
    }
    expect(fetched.length).toBe(bases.length * 3);
    expect(guardLibrary(scene).sharedCount).toBe(bases.length * 3);
    expect(W.guardWarmPending(scene)).toBe(0);
    const warm = W.guardWarmMeshes(scene);
    expect(warm.length).toBe(bases.length * 3);
    for (const m of warm) {
      expect(m.isEnabled(false)).toBe(false); // never drawn
      expect(m.isVerticesDataPresent('gvis')).toBe(true);
      const fx = m.subMeshes[0]!.effect as unknown as { defines: string } | null;
      expect(fx?.defines).toContain('#define GUARDFIG');
    }
    // a second call (a restart in the same scene) builds nothing more
    expect(await W.warmGuardModels(scene, 'testmap')).toBe(bases.length);
    expect(W.guardWarmMeshes(scene).length).toBe(warm.length);
    // the first guard: his LOD2 is in on spawn (no new fetch), and his draw takes the warmed program
    const before = fetched.length;
    const gb = buildEnemyRig(scene, world as never, ENEMIES.grunt, 'g1').figure!;
    await vi.waitFor(() => expect(gb.shown).toBe(true));
    render();
    expect(gb.figure.current).toBe(3);
    expect(fetched.slice(before).some((u) => u.endsWith('-lod2.glb'))).toBe(false);
    const gm = gb.figure.lodMeshes(3)[0]!;
    const gsm = gm.subMeshes[0]!;
    await vi.waitFor(() => expect(gm.material!.isReadyForSubMesh(gm, gsm)).toBe(true));
    const own = warm.find((m) => m.material === gm.material)!;
    expect(own).toBeDefined();
    expect(gsm.effect).toBe(own.subMeshes[0]!.effect);
    // (F59) closer: LOD1 at 15 m, then LOD0 at 3 m, each on its warmed program; nothing fetched (the warm loaded them)
    for (const [z, lod] of [[15, 2], [3, 1]] as const) {
      cam.position.set(0, 1.6, z);
      cam.getViewMatrix(true);
      await vi.waitFor(() => {
        render();
        expect(gb.figure.current).toBe(lod);
      });
      const m = gb.figure.lodMeshes(lod)[0]!;
      const sm = m.subMeshes[0]!;
      await vi.waitFor(() => expect(m.material!.isReadyForSubMesh(m, sm)).toBe(true));
      const w = warm.find((x) => x.material === m.material)!;
      expect(w).toBeDefined();
      expect(sm.effect).toBe(w.subMeshes[0]!.effect);
    }
    expect(fetched.length).toBe(before);
    scene.dispose();
  });

  it('the shadow-depth variant too: a generator whose cast list does not hold the warm mesh still compiles it, for the later guard', async () => {
    const { B, scene, world, render, buildEnemyRig, W, ENEMIES } = await setup();
    const cam = new B.FreeCamera('far', new B.Vector3(0, 1.6, 100), scene);
    cam.getViewMatrix(true);
    scene.activeCamera = cam;
    const sun = new B.DirectionalLight('sun', new B.Vector3(0, -1, 0.3), scene);
    const gen = new B.ShadowGenerator(256, sun);
    gen.getShadowMap()!.renderList!.length = 0;
    await W.warmGuardModels(scene, 'testmap');
    const map = gen.getShadowMap()!;
    type Wrapped = { _getDrawWrapper(id: number): { effect: unknown } | undefined };
    const depthFx = (sm: unknown): unknown => (sm as Wrapped)._getDrawWrapper(map.renderPassId)?.effect ?? null;
    const warm = W.guardWarmMeshes(scene);
    expect(warm.length).toBeGreaterThan(0);
    for (const m of warm) expect(depthFx(m.subMeshes[0])).not.toBeNull();
    const gb = buildEnemyRig(scene, world as never, ENEMIES.grunt, 'g1').figure!;
    await vi.waitFor(() => expect(gb.shown).toBe(true));
    render();
    const gm = gb.figure.lodMeshes(3)[0]!;
    // (the shadow pass, as the renderer runs it: under the shadow map's render pass id)
    const engine = scene.getEngine();
    const depthReady = (): boolean => {
      const pass = engine.currentRenderPassId;
      engine.currentRenderPassId = map.renderPassId;
      const ok = gen.isReady(gm.subMeshes[0]!, false, false);
      engine.currentRenderPassId = pass;
      return ok;
    };
    await vi.waitFor(() => expect(depthReady()).toBe(true));
    const own = warm.find((m) => m.material === gm.material)!;
    expect(depthFx(gm.subMeshes[0])).toBe(depthFx(own.subMeshes[0]));
    scene.dispose();
  });

  it('flag off: nothing loaded, nothing built', async () => {
    const { scene, W, guardLibrary } = await setup();
    const { flags } = await import('../src/core/flags');
    flags.guardModels = false;
    expect(await W.warmGuardModels(scene, 'testmap')).toBe(0);
    expect(fetched).toEqual([]);
    expect(guardLibrary(scene).sharedCount).toBe(0);
    expect(W.guardWarmMeshes(scene).length).toBe(0);
    scene.dispose();
  });

  it('a base whose LOD2 fails is reported and skipped; the others warm; it never rejects', async () => {
    const { scene, W } = await setup();
    H.assets.set('broad', { manifest: { ...BROAD, id: 'guard-broken', urls: ['', '/x0.glb', '/x1.glb', '/missing-lod2.glb'] }, standIn: false, problems: [] });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const bases = W.guardBasesOf(W.guardKinds());
    const n = await W.warmGuardModels(scene, 'testmap');
    expect(n).toBe(bases.filter((b) => b !== 'broad').length);
    expect(warn).toHaveBeenCalled();
    // (F59) its far load failed: its near ones are not tried (as the guard's own load), and nothing stays pending
    expect(fetched).not.toContain('/x0.glb');
    expect(fetched).not.toContain('/x1.glb');
    expect(W.guardWarmPending(scene)).toBe(0);
    warn.mockRestore();
    scene.dispose();
  });
});

describe('(F59) LOD0 / LOD1, the merged S1 body and the cap', () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    const { flags } = await import('../src/core/flags');
    flags.gfx = null;
  });

  /** Bones in a float texture, as every desktop WebGL2 (NullEngine reports none): a mesh's bone count then stays out
   *  of its defines, so the one-joint warm body and a guard's ~20-joint merged body share one program. */
  const boneTexture = (scene: Scene): void => {
    const caps = scene.getEngine().getCaps() as { textureFloat: boolean; maxVertexTextureImageUnits: number };
    caps.textureFloat = true;
    caps.maxVertexTextureImageUnits = Math.max(caps.maxVertexTextureImageUnits, 16);
  };

  it('?gfx=min: LOD2 only, as a guard loads there', async () => {
    const { scene, W } = await setup();
    const { flags } = await import('../src/core/flags');
    flags.gfx = 'min';
    const bases = W.guardBasesOf(W.guardKinds());
    expect(await W.warmGuardModels(scene, 'testmap')).toBe(bases.length);
    expect(fetched.length).toBe(bases.length);
    expect(fetched.every((u) => u.endsWith('-lod2.glb'))).toBe(true);
    expect(W.guardWarmMeshes(scene).length).toBe(bases.length);
    scene.dispose();
  });

  it('the merged S1 body: a hidden smooth body compiled at the load; a later guard\'s merged body takes its program', async () => {
    const { scene, world, buildEnemyRig, W, ENEMIES } = await setup();
    boneTexture(scene);
    const bases = W.guardBasesOf(W.guardKinds());
    expect(await W.warmGuardModels(scene, 'testmap', undefined, { parts: world.parts })).toBe(bases.length);
    const s1 = W.guardWarmMeshes(scene).filter((m) => m.name.startsWith('guard-warm-s1-'));
    expect(s1.map((m) => m.name).sort()).toEqual(['guard-warm-s1-smooth', 'guard-warm-s1-smooth-lod']);
    for (const m of s1) {
      expect(m.isEnabled(false)).toBe(false); // never drawn
      expect(m.material).toBe(world.parts.skinMaterial);
      const fx = m.subMeshes[0]!.effect as unknown as { defines: string; isReady(): boolean } | null;
      expect(fx?.defines).toContain('#define SMOOTHBODY');
      expect(fx?.isReady()).toBe(true);
    }
    // a second call builds no second body
    await W.warmGuardModels(scene, 'testmap', undefined, { parts: world.parts });
    expect(W.guardWarmMeshes(scene).filter((m) => m.name.startsWith('guard-warm-s1-')).length).toBe(2);
    // the guard's merged body (the gm-watchdog stand-in): its first ask is answered from the warmed program
    const gb = buildEnemyRig(scene, world as never, ENEMIES.grunt, 'g1').figure!;
    const body = gb.rig.voxel!.meshes[0]!;
    const sm = body.subMeshes[0]!;
    expect(body.material!.isReadyForSubMesh(body, sm, false)).toBe(true);
    expect(sm.effect).toBe(s1[0]!.subMeshes[0]!.effect);
    scene.dispose();
  });

  it('the cap: compiles that never finish stop the wait at `capMs`; every warm mesh is still built, nothing left pending', async () => {
    const { B, scene, world, W } = await setup();
    const never = (): boolean => false;
    vi.spyOn(B.PBRMaterial.prototype, 'isReadyForSubMesh').mockImplementation(never);
    vi.spyOn(B.StandardMaterial.prototype, 'isReadyForSubMesh').mockImplementation(never);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const bases = W.guardBasesOf(W.guardKinds());
    const t0 = Date.now();
    const n = await W.warmGuardModels(scene, 'testmap', undefined, { parts: world.parts, capMs: 200 });
    const ms = Date.now() - t0;
    expect(ms).toBeGreaterThanOrEqual(190);
    expect(ms).toBeLessThan(2000);
    expect(n).toBe(0);
    // (each poll stops at its next tick past the cap, with the existing line)
    await vi.waitFor(() => expect(warn.mock.calls.some((c) => String(c[0]).includes('did not compile on the loading screen'))).toBe(true));
    expect(W.guardWarmMeshes(scene).length).toBe(bases.length * 3 + 2);
    expect(W.guardWarmPending(scene)).toBe(0);
    scene.dispose();
  });

  it('the cap: a load landing after it is not waited for, still builds its warm meshes (their compile starts), pending meanwhile', async () => {
    const { scene, W } = await setup();
    const plain = globalThis.fetch;
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => (release = r));
    vi.stubGlobal('fetch', async (url: string) => {
      if (url.endsWith('-lod0.glb')) await gate;
      return plain(url);
    });
    const bases = W.guardBasesOf(W.guardKinds());
    const t0 = Date.now();
    const p = W.warmGuardModels(scene, 'testmap', undefined, { capMs: 200 });
    expect(W.guardWarmPending(scene)).toBe(bases.length);
    expect(await p).toBe(0); // (no base has every LOD by the cap)
    expect(Date.now() - t0).toBeLessThan(2000);
    expect(W.guardWarmPending(scene)).toBe(bases.length);
    expect(W.guardWarmMeshes(scene).filter((m) => m.name.includes(':1-')).length).toBe(0);
    release();
    await vi.waitFor(() => expect(W.guardWarmPending(scene)).toBe(0));
    const late = W.guardWarmMeshes(scene).filter((m) => m.name.includes(':1-'));
    expect(late.length).toBe(bases.length);
    for (const m of late) expect(m.subMeshes[0]!.effect).not.toBeNull();
    scene.dispose();
  });
});
