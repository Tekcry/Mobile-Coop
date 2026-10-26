/**
 * (map-ready S9) The kept parts holder (`src/core/keptParts.ts`): the pure part on fake textures (step 1), then two
 * create / hand-over / dispose cycles on a NullEngine (step 5): a figure material's texture and a kit GLB are kept
 * across the release; context loss drops the held textures; flag off is today's blob path and per-load fetch.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { KEPT_TEXTURE_MB, KeptParts, textureBytes, type KeptTex } from '../src/core/keptParts';
import type { GlbMaterial } from '../src/operators/lab/glb';

/** A fake InternalTexture: counts references and disposes (as Babylon's: released at 0). */
class FakeTex implements KeptTex {
  _references = 1;
  disposed = 0;
  constructor(readonly width = 4, readonly height = 4) {}
  incrementReferences(): void {
    this._references++;
  }
  dispose(): void {
    this._references--;
    this.disposed++;
  }
}

const MB = 1024 * 1024;

function holder(): KeptParts {
  const k = new KeptParts();
  k.enabled = true;
  return k;
}

describe('KeptParts (pure)', () => {
  it('a hand-over holds one reference per texture, once (not per hand-over)', () => {
    const k = holder();
    const t = new FakeTex();
    const s1 = {};
    k.useTexture(s1, 'glb-img:1', t, false, 100);
    expect(t._references).toBe(1);
    k.handOver(s1);
    expect(t._references).toBe(2);
    // the scene's own Texture goes with its dispose: the held reference keeps it alive
    t.dispose();
    expect(t._references).toBe(1);
    // the next scene gets it from the engine cache (Babylon increments), uses it, hands over: no second hold
    const s2 = {};
    t.incrementReferences();
    k.useTexture(s2, 'glb-img:1', t, true, 100);
    k.handOver(s2);
    expect(t._references).toBe(2);
    expect(k.stats.heldTextures).toBe(1);
    expect(k.stats.texReused).toBe(1);
    expect(k.stats.texDecoded).toBe(1);
  });

  it('a texture unused in two consecutive hand-overs is disposed once', () => {
    const k = holder();
    const a = new FakeTex();
    const b = new FakeTex();
    const s1 = {};
    k.useTexture(s1, 'a', a, false, 10);
    k.useTexture(s1, 'b', b, false, 10);
    k.handOver(s1);
    // s2 uses only b; a was used by the hand-over before: kept
    const s2 = {};
    k.useTexture(s2, 'b', b, true, 10);
    k.handOver(s2);
    expect(a.disposed).toBe(0);
    expect(k.heldKeys().sort()).toEqual(['a', 'b']);
    // s3 uses only b: a is unused in two consecutive hand-overs (s2, s3): released once
    const s3 = {};
    k.useTexture(s3, 'b', b, true, 10);
    k.handOver(s3);
    expect(a.disposed).toBe(1);
    expect(k.heldKeys()).toEqual(['b']);
    // and never again
    k.handOver({});
    k.handOver({});
    expect(a.disposed).toBe(1);
    expect(b.disposed).toBe(1);
    expect(k.stats.heldTextures).toBe(0);
  });

  it('the byte budget drops the least recently used first', () => {
    const k = holder();
    k.budgetBytes = 3 * MB;
    const t = [new FakeTex(), new FakeTex(), new FakeTex(), new FakeTex()];
    const s1 = {};
    // used in order 0, 1, 2, 3; then 0 again (most recent)
    for (let i = 0; i < 4; i++) k.useTexture(s1, `t${i}`, t[i]!, false, MB);
    k.useTexture(s1, 't0', t[0]!, false, MB);
    k.handOver(s1);
    // 4 MB over 3 MB: t1 (the least recently used) goes
    expect(t[1]!.disposed).toBe(1);
    expect(t[0]!.disposed + t[2]!.disposed + t[3]!.disposed).toBe(0);
    expect(k.heldKeys().sort()).toEqual(['t0', 't2', 't3']);
    expect(k.stats.heldMb).toBe(3);
    expect(KEPT_TEXTURE_MB).toBe(256);
  });

  it('dropTextures disposes every held one once', () => {
    const k = holder();
    const a = new FakeTex();
    const b = new FakeTex();
    const s = {};
    k.useTexture(s, 'a', a, false, 1);
    k.useTexture(s, 'b', b, false, 1);
    k.handOver(s);
    k.dropTextures();
    expect([a.disposed, b.disposed]).toEqual([1, 1]);
    expect(k.stats.heldTextures).toBe(0);
    k.dropTextures();
    k.handOver({});
    expect([a.disposed, b.disposed]).toEqual([1, 1]);
  });

  it('a released texture is never held again; a new one under a held key replaces it', () => {
    const k = holder();
    const gone = new FakeTex();
    gone._references = 0;
    const s1 = {};
    k.useTexture(s1, 'x', gone, false, 1);
    k.handOver(s1);
    expect(gone._references).toBe(0);
    expect(k.stats.heldTextures).toBe(0);
    const a = new FakeTex();
    const s2 = {};
    k.useTexture(s2, 'y', a, false, 1);
    k.handOver(s2);
    const a2 = new FakeTex();
    const s3 = {};
    k.useTexture(s3, 'y', a2, false, 1);
    k.handOver(s3);
    expect(a.disposed).toBe(1);
    expect(a2._references).toBe(2);
    expect(k.heldKeys()).toEqual(['y']);
  });

  it('files unused in two consecutive hand-overs are forgotten (kit, props, art)', () => {
    const k = holder();
    const forgot: string[] = [];
    k.forgetFile = (u) => forgot.push(u);
    const s1 = {};
    k.useFile(s1, '/kit.glb', false);
    k.useFile(s1, '/props.glb', false);
    k.handOver(s1);
    const s2 = {};
    k.useFile(s2, '/kit.glb', true);
    k.handOver(s2);
    expect(forgot).toEqual([]);
    const s3 = {};
    k.useFile(s3, '/kit.glb', true);
    k.handOver(s3);
    expect(forgot).toEqual(['/props.glb']);
    expect(k.stats.filesFetched).toBe(2);
    expect(k.stats.filesReused).toBe(2);
  });

  it('enabled false: every call is a no-op (flag off = today)', () => {
    const k = new KeptParts();
    const t = new FakeTex();
    const forgot: string[] = [];
    k.forgetFile = (u) => forgot.push(u);
    const s = {};
    k.useTexture(s, 'a', t, false, 1);
    k.useFile(s, '/kit.glb', false);
    k.handOver(s);
    k.handOver({});
    k.handOver({});
    k.dropTextures();
    expect(t._references).toBe(1);
    expect(t.disposed).toBe(0);
    expect(forgot).toEqual([]);
    expect(k.stats).toEqual({ texReused: 0, texDecoded: 0, filesReused: 0, filesFetched: 0, heldTextures: 0, heldMb: 0 });
  });

  it('textureBytes: RGBA8 or KTX2, with the mip chain', () => {
    expect(textureBytes(1024, 1024, false)).toBe(Math.round((1024 * 1024 * 16) / 3));
    expect(textureBytes(1024, 1024, true)).toBe(Math.round((1024 * 1024 * 4) / 3));
  });
});

/** A PNG's signature and IHDR (2 x 2): enough for the header read; a NullEngine never decodes it. */
function tinyPng(): Uint8Array {
  const b = new Uint8Array(33);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  const dv = new DataView(b.buffer);
  dv.setUint32(16, 2);
  dv.setUint32(20, 2);
  b[24] = 8;
  b[25] = 6;
  return b;
}

const KIT_GLB = path.resolve(__dirname, '../src/world/kit/assets/facility-kit.glb');

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('KeptParts on a NullEngine (two match cycles)', () => {
  async function setup() {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const B = await import('../src/core/babylon');
    const { flags } = await import('../src/core/flags');
    const { kept } = await import('../src/core/keptParts');
    const fig = await import('../src/operators/runtime/figure');
    const { KitRender } = await import('../src/world/kit/kitRender');
    const { LightRegistry } = await import('../src/world/lights');
    const engine = new NullEngine();
    // a real engine drops a released internal texture from its cache (thinEngine `_releaseTexture`); the NullEngine's is
    // a no-op, so without this a released texture would come back from the cache and the hold would prove nothing
    const cache = engine.getLoadedTexturesCache();
    (engine as unknown as { _releaseTexture: (t: unknown) => void })._releaseTexture = (t) => {
      const i = cache.indexOf(t as (typeof cache)[number]);
      if (i >= 0) cache.splice(i, 1);
    };
    const kitBytes = readFileSync(KIT_GLB);
    const fetched: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      fetched.push(url);
      return new Response(kitBytes.buffer.slice(kitBytes.byteOffset, kitBytes.byteOffset + kitBytes.byteLength) as ArrayBuffer);
    });
    fig.forgetModels();
    const mat: GlbMaterial = { name: 'cloth', base: [1, 1, 1], roughness: 0.8, metallic: 0, emissive: [0, 0, 0], baseTex: { mime: 'image/png', name: 'wren-test-albedo', data: tinyPng() } };
    /** One match: a figure material, the kit; then App.releaseState's order (hand-over, then the scene's dispose). */
    async function cycle(keep = true) {
      const scene = new B.Scene(engine);
      const p = fig.operatorMaterial(scene, mat, 'wren-test', keep);
      const tex = p.albedoTexture as InstanceType<typeof B.Texture>;
      const internal = tex.getInternalTexture();
      await KitRender.create(scene, { instances: [], doors: [] }, [], new LightRegistry(), () => {});
      return { scene, tex, internal, release: () => { kept.handOver(scene); scene.dispose(); } };
    }
    const was = { flag: flags.mapReady, enabled: kept.enabled };
    const restore = (): void => {
      kept.dropTextures();
      flags.mapReady = was.flag;
      kept.enabled = was.enabled;
      fig.forgetModels();
    };
    return { engine, flags, kept, fetched, cycle, restore, kitUrl: (await import('../src/world/kit/kitRender')).kitUrl };
  }

  it('flag on: the second scene gets the same internal texture (reused, nothing decoded) and the kit GLB is fetched once', async () => {
    const { engine, flags, kept, fetched, cycle, restore, kitUrl } = await setup();
    try {
      flags.mapReady = true;
      kept.enabled = flags.mapReady; // as App's constructor
      engine.onContextLostObservable.add(() => kept.dropTextures()); // as App's constructor
      const s0 = { ...kept.stats };
      const a = await cycle();
      expect(a.tex.url!.startsWith('data:glb-img:')).toBe(true);
      expect(kept.stats.texDecoded - s0.texDecoded).toBe(1);
      expect(kept.stats.filesFetched - s0.filesFetched).toBe(1);
      a.release();
      expect(kept.stats.heldTextures).toBe(1);
      expect(kept.stats.heldMb).toBeGreaterThan(0);
      // the hold keeps the internal texture alive (and in the engine cache) after the scene's dispose
      expect(engine.getLoadedTexturesCache()).toContain(a.internal);
      const decoded = kept.stats.texDecoded;
      const b = await cycle();
      expect(b.internal).toBe(a.internal);
      expect(kept.stats.texReused - s0.texReused).toBeGreaterThan(0);
      expect(kept.stats.texDecoded).toBe(decoded);
      expect(kept.stats.filesReused - s0.filesReused).toBe(1);
      expect(fetched).toEqual([kitUrl()]);
      b.release();
      expect(kept.stats.heldTextures).toBe(1);
      // GPU context lost: every held texture released, and it leaves the engine cache
      engine.onContextLostObservable.notifyObservers(engine);
      expect(kept.stats.heldTextures).toBe(0);
      expect(engine.getLoadedTexturesCache()).not.toContain(a.internal);
    } finally {
      restore();
    }
  });

  it('flag on, the hero (keep false): the blob path, never held', async () => {
    const { flags, kept, cycle, restore } = await setup();
    try {
      flags.mapReady = true;
      kept.enabled = true;
      const a = await cycle(false);
      expect(a.tex.url!.startsWith('blob:')).toBe(true);
      a.release();
      expect(kept.stats.heldTextures).toBe(0);
    } finally {
      restore();
    }
  });

  it('flag off: no hold, the blob path, the kit fetched per load', async () => {
    const { engine, flags, kept, fetched, cycle, restore, kitUrl } = await setup();
    try {
      flags.mapReady = false;
      kept.enabled = false;
      const s0 = { ...kept.stats };
      const a = await cycle();
      expect(a.tex.url!.startsWith('blob:')).toBe(true);
      a.release();
      expect(engine.getLoadedTexturesCache()).not.toContain(a.internal);
      const b = await cycle();
      expect(b.internal).not.toBe(a.internal);
      b.release();
      expect(fetched).toEqual([kitUrl(), kitUrl()]);
      expect(kept.stats).toEqual(s0);
    } finally {
      restore();
    }
  });
});
