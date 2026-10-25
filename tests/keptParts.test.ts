/**
 * (map-ready S9) The kept parts holder (`src/core/keptParts.ts`): the pure part on fake textures (step 1), then two
 * create / hand-over / dispose cycles on a NullEngine (step 5): a figure material's texture and a kit GLB are kept
 * across the release; context loss drops the held textures; flag off is today's blob path and per-load fetch.
 * (map-ready S10) The compiled effects: kept on fakes (one reference, stripped, the budget, context loss, counters, flag
 * off), then on a NullEngine across a scene dispose (the same effect on the same key, nothing left of the old material).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { KEPT_EFFECTS, KEPT_TEXTURE_MB, KeptParts, textureBytes, type KeptEffect, type KeptTex } from '../src/core/keptParts';
import { loadCounters } from '../src/core/mapReadyStats';
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
    expect(k.stats).toEqual({ texReused: 0, texDecoded: 0, filesReused: 0, filesFetched: 0, heldTextures: 0, heldMb: 0, effReused: 0, effCompiled: 0, heldEffects: 0 });
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

/** A fake Observable: what `keepEffects` clears. */
class FakeObs {
  observers = 2;
  clear(): void {
    this.observers = 0;
  }
}

/** A fake Babylon Effect: in the engine's cache under its key, counted as Babylon counts (`effect.pure.js:1170-1193`). */
class FakeEffect implements KeptEffect {
  readonly name = 'fake';
  _refCount = 1;
  isDisposed = false;
  /** dispose() calls without force (one reference each), and with force. */
  drops = 0;
  forced = 0;
  onCompiled: unknown;
  onError: unknown;
  onBind: unknown;
  _fallbacks: unknown;
  _processCodeAfterIncludes: unknown;
  _processFinalCode: unknown;
  onCompileObservable = new FakeObs();
  onErrorObservable = new FakeObs();
  _onBindObservable: FakeObs | null = new FakeObs();
  constructor(
    readonly _key: string,
    private readonly cache: Record<string, KeptEffect>,
    public ready = true,
  ) {
    const owner = { material: _key };
    this.onCompiled = () => owner;
    this.onError = () => owner;
    this.onBind = () => owner;
    this._fallbacks = { mesh: owner };
    this._processCodeAfterIncludes = () => owner;
    this._processFinalCode = () => owner;
    cache[_key] = this;
  }
  isReady(): boolean {
    return this.ready;
  }
  dispose(force = false): void {
    if (force) {
      this.forced++;
      this._refCount = 0;
    } else {
      this.drops++;
      this._refCount--;
    }
    if (this._refCount > 0 || this.isDisposed) return;
    this.isDisposed = true;
    delete this.cache[this._key];
  }
}

function stripped(e: FakeEffect): boolean {
  return e.onCompiled === null && e.onError === null && e.onBind === null && e._fallbacks === null && e._processCodeAfterIncludes === undefined && e._processFinalCode === null && e.onCompileObservable.observers === 0 && e.onErrorObservable.observers === 0 && e._onBindObservable!.observers === 0;
}

describe('KeptParts effects (pure, map-ready S10)', () => {
  it('keepEffects: one reference on each ready effect, once; a not-ready effect is not kept; each kept one is stripped', () => {
    const k = holder();
    const cache: Record<string, KeptEffect> = {};
    const a = new FakeEffect('pbr@A', cache);
    const b = new FakeEffect('pbr@B', cache, false);
    k.keepEffects(cache);
    expect(a._refCount).toBe(2);
    expect(stripped(a)).toBe(true);
    expect(b._refCount).toBe(1);
    expect(stripped(b)).toBe(false);
    expect(k.keptEffectKeys()).toEqual(['pbr@A']);
    expect(k.stats.heldEffects).toBe(1);
    // the scene's dispose gives its reference back: the holder's keeps it alive, in the cache
    a.dispose();
    expect(a.isDisposed).toBe(false);
    expect(cache['pbr@A']).toBe(a);
    // the next match uses it and adds an observer; the next keep strips again but takes no second reference
    a._refCount++;
    k.countEffect(a);
    a.onCompileObservable.observers = 1;
    k.keepEffects(cache);
    expect(a._refCount).toBe(2);
    expect(stripped(a)).toBe(true);
  });

  it('releaseUnkept: every other cached effect is released with force and leaves the cache; the kept stay', () => {
    const k = holder();
    const cache: Record<string, KeptEffect> = {};
    const a = new FakeEffect('A', cache);
    const b = new FakeEffect('B', cache, false);
    k.keepEffects(cache);
    // (C compiled after the keep: not kept either)
    const c = new FakeEffect('C', cache);
    a.dispose();
    k.releaseUnkept(cache);
    expect(Object.keys(cache)).toEqual(['A']);
    expect([a.forced, b.forced, c.forced]).toEqual([0, 1, 1]);
    expect([a.isDisposed, b.isDisposed, c.isDisposed]).toEqual([false, true, true]);
  });

  it('the budget lets the least recently used go, once (KEPT_EFFECTS 400)', () => {
    expect(KEPT_EFFECTS).toBe(400);
    const k = holder();
    k.budgetEffects = 2;
    const cache: Record<string, KeptEffect> = {};
    const a = new FakeEffect('A', cache);
    const b = new FakeEffect('B', cache);
    k.keepEffects(cache);
    a.dispose();
    b.dispose();
    k.releaseUnkept(cache);
    // match 2 gets B back and compiles C; A is not asked for
    b._refCount++;
    k.countEffect(b);
    const c = new FakeEffect('C', cache);
    k.countEffect(c);
    k.keepEffects(cache);
    // three past a budget of two: A (kept longest ago, unused since) goes; B (used now) and C (new) stay
    expect(k.keptEffectKeys().sort()).toEqual(['B', 'C']);
    expect(a.drops).toBe(2);
    expect(a.isDisposed).toBe(true);
    expect(cache['A']).toBeUndefined();
    expect(b.isDisposed || c.isDisposed).toBe(false);
    expect(k.stats.heldEffects).toBe(2);
    // and never again
    k.keepEffects(cache);
    expect(a.drops).toBe(2);
  });

  it('dropEffects (GPU context lost): every kept effect let go once; one the live match uses stays for it', () => {
    const k = holder();
    const cache: Record<string, KeptEffect> = {};
    const a = new FakeEffect('A', cache);
    const b = new FakeEffect('B', cache);
    k.keepEffects(cache);
    a.dispose();
    b.dispose();
    k.releaseUnkept(cache);
    // the live match uses B
    b._refCount++;
    k.dropEffects();
    expect([a.drops, b.drops]).toEqual([2, 2]);
    expect(a.isDisposed).toBe(true);
    expect(cache['A']).toBeUndefined();
    expect(b.isDisposed).toBe(false);
    expect(cache['B']).toBe(b);
    expect(k.keptEffectKeys()).toEqual([]);
    expect(k.stats.heldEffects).toBe(0);
    k.dropEffects();
    expect([a.drops, b.drops]).toEqual([2, 2]);
  });

  it('countEffect: a kept effect counts reused once per match, a new one compiled; S1 loadCounters follow', () => {
    const k = holder();
    const c0 = { ...loadCounters };
    const cache: Record<string, KeptEffect> = {};
    const a = new FakeEffect('A', cache);
    k.countEffect(a);
    k.keepEffects(cache);
    a.dispose();
    a._refCount++;
    k.countEffect(a);
    a._refCount++;
    k.countEffect(a);
    // a new effect, then a second user of it (a cache hit, not kept): compiled once
    const b = new FakeEffect('B', cache);
    k.countEffect(b);
    b._refCount++;
    k.countEffect(b);
    expect([k.stats.effReused, k.stats.effCompiled]).toEqual([1, 2]);
    expect([loadCounters.effReused - c0.effReused, loadCounters.effCompiled - c0.effCompiled]).toEqual([1, 2]);
    // the next match: counted again
    k.keepEffects(cache);
    k.countEffect(a);
    expect(k.stats.effReused).toBe(2);
  });

  it('enabled false: every effect call is a no-op (flag off = today: App calls releaseEffects)', () => {
    const k = new KeptParts();
    const cache: Record<string, KeptEffect> = {};
    const a = new FakeEffect('A', cache);
    const c0 = { ...loadCounters };
    k.keepEffects(cache);
    k.countEffect(a);
    k.releaseUnkept(cache);
    k.dropEffects();
    expect(a._refCount).toBe(1);
    expect(stripped(a)).toBe(false);
    expect([a.drops, a.forced]).toEqual([0, 0]);
    expect(cache['A']).toBe(a);
    expect(k.keptEffectKeys()).toEqual([]);
    expect(loadCounters).toEqual(c0);
  });
});

type BabylonEffect = KeptEffect & {
  _key: string;
  _refCount: number;
  isDisposed: boolean;
  _processCodeAfterIncludes: unknown;
  _processFinalCode: unknown;
  _fallbacks: unknown;
  onCompiled: unknown;
  onError: unknown;
  onBind: unknown;
  onCompileObservable: { hasObservers(): boolean };
  onErrorObservable: { hasObservers(): boolean };
  _onBindObservable: { hasObservers(): boolean } | null;
};

/** Every object reachable from `root` through properties, Map / Set entries and arrays (not through `skip`, the
 *  engine, which lives for the page; not into closures, which a property walk cannot open: the strip nulls those). */
function reachable(root: object, skip: object): Set<object> {
  const seen = new Set<object>();
  const todo: object[] = [root];
  while (todo.length) {
    const o = todo.pop()!;
    if (seen.has(o) || o === skip) continue;
    seen.add(o);
    const next: unknown[] = [];
    if (o instanceof Map) for (const [mk, mv] of o) next.push(mk, mv);
    else if (o instanceof Set) for (const v of o) next.push(v);
    if (!ArrayBuffer.isView(o)) {
      for (const key of Reflect.ownKeys(o)) {
        const d = Object.getOwnPropertyDescriptor(o, key);
        if (d && 'value' in d) next.push(d.value);
      }
    }
    for (const v of next) if (v !== null && (typeof v === 'object' || typeof v === 'function')) todo.push(v);
  }
  return seen;
}

describe('KeptParts effects on a NullEngine (map-ready S10)', () => {
  async function setup() {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const B = await import('../src/core/babylon');
    const { LampPlugin } = await import('../src/world/bakedLamps');
    const { PatternPlugin } = await import('../src/cosmetics/patternPlugin');
    const engine = new NullEngine();
    const k = new KeptParts();
    k.enabled = true;
    // as App's constructor (flag on): the context-loss drop and the createEffect count
    engine.onContextLostObservable.add(() => k.dropEffects());
    const createEffect = engine.createEffect;
    engine.createEffect = (...a: Parameters<typeof engine.createEffect>) => {
      const e = createEffect.apply(engine, a);
      k.countEffect(e as unknown as KeptEffect);
      return e;
    };
    const compiled = (): Record<string, KeptEffect> => (engine as unknown as { _compiledEffects: Record<string, KeptEffect> })._compiledEffects;
    const lamps = { volume: null, doorSlots: 4, atlasPages: 1 } as unknown as ConstructorParameters<typeof LampPlugin>[1];
    /** One match: a plugin material (the 3.1.7 case: its shader's code hook holds it) on a box, compiled. */
    async function cycle() {
      const scene = new B.Scene(engine);
      const mat = new B.PBRMaterial('body', scene);
      new PatternPlugin(mat);
      new LampPlugin(mat, lamps);
      const mesh = B.CreateBox('b', {}, scene);
      mesh.material = mat;
      const sm = mesh.subMeshes[0]!;
      await vi.waitFor(() => expect(mat.isReadyForSubMesh(mesh, sm)).toBe(true));
      return { scene, mat, effect: sm.effect as unknown as BabylonEffect };
    }
    /** App.releaseState's order (S9's hand-over has no textures here). */
    function release(scene: InstanceType<typeof B.Scene>, flagOn = true): void {
      if (flagOn) k.keepEffects(compiled());
      scene.dispose();
      if (flagOn) k.releaseUnkept(compiled());
      // flag off: today's releaseEffects (the NullEngine's own is a no-op, so the Engine one it overrides)
      else (Object.getPrototypeOf(NullEngine.prototype) as { releaseEffects(): void }).releaseEffects.call(engine);
    }
    return { engine, k, compiled, cycle, release };
  }

  it('flag on: the kept effect survives the release and the next scene gets the same one on the same key (no new program)', async () => {
    const { engine, k, compiled, cycle, release } = await setup();
    const c0 = { ...loadCounters };
    const a = await cycle();
    const e = a.effect;
    const key = e._key;
    expect(compiled()[key]).toBe(e);
    // before the keep, its code hook holds the plugin manager (so the material): the 3.1.7 tie
    expect(typeof e._processCodeAfterIncludes).toBe('function');
    expect(loadCounters.effCompiled - c0.effCompiled).toBeGreaterThan(0);
    release(a.scene);
    expect(e.isDisposed).toBe(false);
    expect(e._refCount).toBe(1);
    expect(compiled()[key]).toBe(e);
    expect(k.keptEffectKeys()).toContain(key);
    const keys = Object.keys(compiled()).length;
    const c1 = { ...loadCounters };
    const b = await cycle();
    expect(b.effect).toBe(e);
    expect(e._refCount).toBe(2);
    expect(Object.keys(compiled()).length).toBe(keys);
    expect(loadCounters.effReused - c1.effReused).toBe(keys);
    expect(loadCounters.effCompiled - c1.effCompiled).toBe(0);
    expect(e.isReady()).toBe(true);
    release(b.scene);
    expect(e._refCount).toBe(1);
    engine.dispose();
  });

  it('flag on: no kept effect reaches its old material (the strip leaves no path; the material is collected)', async () => {
    const { engine, k, cycle, release } = await setup();
    setFlagsFromString('--expose-gc');
    const gc = runInNewContext('gc') as () => void;
    let e!: BabylonEffect;
    let refs!: { mat: WeakRef<object>; scene: WeakRef<object> };
    await (async () => {
      const a = await cycle();
      e = a.effect;
      refs = { mat: new WeakRef(a.mat), scene: new WeakRef(a.scene) };
      release(a.scene);
      expect(k.keptEffectKeys()).toContain(e._key);
      expect([e.onCompiled, e.onError, e.onBind, e._fallbacks, e._processFinalCode]).toEqual([null, null, null, null, null]);
      expect(e._processCodeAfterIncludes).toBeUndefined();
      expect(e.onCompileObservable.hasObservers() || e.onErrorObservable.hasObservers() || !!e._onBindObservable?.hasObservers()).toBe(false);
      const seen = reachable(e, engine);
      expect(seen.has(a.mat)).toBe(false);
      expect(seen.has(a.scene)).toBe(false);
    })();
    // a later scene is the engine's last one (Babylon's EngineStore keeps the last created scene)
    const next = await cycle();
    for (let i = 0; i < 3 && (refs.mat.deref() || refs.scene.deref()); i++) {
      await new Promise((r) => setTimeout(r, 0));
      gc();
    }
    expect(refs.mat.deref()).toBeUndefined();
    expect(refs.scene.deref()).toBeUndefined();
    expect(next.effect).toBe(e);
    release(next.scene);
    engine.dispose();
  });

  it('GPU context lost: the kept effects are dropped (freed and out of the cache when no match uses them)', async () => {
    const { engine, k, compiled, cycle, release } = await setup();
    const a = await cycle();
    const e = a.effect;
    release(a.scene);
    expect(k.stats.heldEffects).toBeGreaterThan(0);
    engine.onContextLostObservable.notifyObservers(engine);
    expect(k.keptEffectKeys()).toEqual([]);
    expect(k.stats.heldEffects).toBe(0);
    expect(e.isDisposed).toBe(true);
    expect(compiled()[e._key]).toBeUndefined();
    // the next match compiles it again
    const b = await cycle();
    expect(b.effect).not.toBe(e);
    release(b.scene);
    engine.dispose();
  });

  it('flag off: nothing kept or stripped; releaseEffects frees every effect and the next scene compiles a new one', async () => {
    const { engine, k, compiled, cycle, release } = await setup();
    k.enabled = false;
    const c0 = { ...loadCounters };
    const a = await cycle();
    const e = a.effect;
    release(a.scene, false);
    expect(typeof e._processCodeAfterIncludes).toBe('function');
    expect(e.isDisposed).toBe(true);
    expect(Object.keys(compiled())).toEqual([]);
    const b = await cycle();
    expect(b.effect).not.toBe(e);
    expect(k.keptEffectKeys()).toEqual([]);
    expect(loadCounters).toEqual(c0);
    release(b.scene, false);
    engine.dispose();
  });
});
