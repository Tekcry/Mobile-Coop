/**
 * (guard-models G7b) The guard shader's one packed varying (behaviour identical to G5's two: every heat / flash level
 * decodes to the same values, with interpolation noise), and the level load's guard step (`warmGuardModels`): LOD2 of
 * every guard base in the scene's library and the guard shader compiled before play on hidden meshes whose defines are
 * a real guard's (the later guard gets the very same compiled effect); nothing with the flag off; a failed base does
 * not hold or break the load.
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

  it('flag on: LOD2 of every base in the library before play, the shader compiled on hidden meshes, the later guard on the same effect', async () => {
    const { B, scene, world, render, buildEnemyRig, W, guardLibrary, ENEMIES } = await setup();
    // the level's camera exists at the load (the player's), 100 m away: the guard below shows LOD2
    const cam = new B.FreeCamera('far', new B.Vector3(0, 1.6, 100), scene);
    cam.getViewMatrix(true); // (its global position, before any render)
    scene.activeCamera = cam;
    const bases = W.guardBasesOf(W.guardKinds());
    const n = await W.warmGuardModels(scene, 'testmap');
    expect(n).toBe(bases.length);
    // LOD2 only: never LOD0 / LOD1 on the loading screen
    expect(fetched.every((u) => u.endsWith('-lod2.glb'))).toBe(true);
    expect(guardLibrary(scene).sharedCount).toBe(bases.length);
    const warm = W.guardWarmMeshes(scene);
    expect(warm.length).toBe(bases.length);
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
    warn.mockRestore();
    scene.dispose();
  });
});
