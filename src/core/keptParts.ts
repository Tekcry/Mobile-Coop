/**
 * (map-ready S9, BRIEF A18: Michael's Q3 pick, option 1) The kept parts: the costly shared parts of a match that stay
 * alive on the App between matches, so a repeat load fetches, parses and decodes nothing again. Each match still gets a
 * fresh scene; only textures, parsed model files and (S10) compiled effects cut loose from their scene are held here,
 * never a material, mesh or scene (the 3.1.7 leak).
 *
 * - Textures: `figure.ts` `texture()` creates each GLB image under a stable key, so Babylon's engine texture cache
 *   (`_getFromCache(url)`) hands the next scene the same internal texture. `handOver(scene)` (App.releaseState, before the
 *   scene is disposed) holds one reference on every kept texture that scene used, so the scene's dispose does not free
 *   it. A texture unused in the last two hand-overs is released; past `KEPT_TEXTURE_MB` the least recently used go first.
 * - Files: kit, props and campus art read their GLB through `figure.ts` `loadModel` (parse once per URL); a file unused
 *   in the last two hand-overs is forgotten (`forgetFile`, set by figure.ts to `forgetModel`).
 * - `dropTextures()`: GPU context lost, or the Textures setting changed: every held texture is released.
 * - (S10) Compiled shaders: Babylon caches each effect under shader name + defines (`thinEngine.pure.js:1683`), and a
 *   plugin's code depends only on its defines and module constants (the S10 audit), so the next match asks for the
 *   same keys. `keepEffects` (App.releaseState, before the scene is disposed) holds one reference on every ready
 *   effect and strips each of what ties it to the old scene (its callbacks, fallbacks, code hooks and observers: the
 *   3.1.7 leak was a cached effect holding its material); past `KEPT_EFFECTS` the least recently used go. The next
 *   match's `createEffect` returns the kept effect: no new program. `dropEffects()` on a GPU context loss.
 *
 * Pure: no Babylon import; Babylon's InternalTexture reaches it as `KeptTex`. Scenes are keys of a WeakMap only, so a
 * scene that is never handed over (disposed by `setState`) is not kept alive by this holder. Load-time code, not a hot
 * path. `enabled` false (the `mapReady` flag off): every call is a no-op (today's behaviour).
 */

import { loadCounters } from './mapReadyStats';

/** The InternalTexture fields the holder uses (Babylon 9.29 `InternalTexture` satisfies it structurally). */
export interface KeptTex {
  incrementReferences(): void;
  dispose(): void;
  readonly width: number;
  readonly height: number;
  /** Babylon's reference count: 0 = already released by the engine (never held again). */
  readonly _references?: number;
}

/** The held textures' GPU budget in MB (estimated bytes, mip chain included): a starting value (G10). */
export const KEPT_TEXTURE_MB = 256;
const MB = 1024 * 1024;

/** (S10) The most compiled effects held between matches: a starting value (G10). */
export const KEPT_EFFECTS = 400;

/** The shape of a Babylon Effect the holder needs (pure code stays Babylon-free; App casts `_compiledEffects`). */
export interface KeptEffect {
  readonly name: unknown;
  isReady(): boolean;
  dispose(force?: boolean): void;
  /** Babylon's cache key (shader name + defines). */
  readonly _key?: string;
  /** Babylon's reference count (`createEffect` adds one per user, `dispose()` takes one). */
  _refCount?: number;
  readonly isDisposed?: boolean;
}

/** What `keepEffects` strips (Babylon 9.29 `effect.pure.js:67-90, 148-163`; some are private there, so written as data). */
interface EffectTies {
  onCompiled: unknown;
  onError: unknown;
  onBind: unknown;
  _fallbacks: unknown;
  _processCodeAfterIncludes: unknown;
  _processFinalCode: unknown;
  onCompileObservable?: { clear(): void } | null;
  onErrorObservable?: { clear(): void } | null;
  /** Read as the field, never through the `onBindObservable` getter (it creates one). */
  _onBindObservable?: { clear(): void } | null;
}

interface HeldEffect {
  eff: KeptEffect;
  /** The holder's clock at the last keep that found it in use (least recently used goes first past the budget). */
  touch: number;
  /** A `createEffect` returned it since the last keep (counted reused once). */
  used: boolean;
}

export interface KeptStats {
  /** Textures a scene got from the engine cache (no decode). */
  texReused: number;
  /** Textures a scene had to decode / transcode. */
  texDecoded: number;
  /** Model files a match read from the parsed-file cache. */
  filesReused: number;
  /** Model files a match had to fetch and parse. */
  filesFetched: number;
  /** Textures held now. */
  heldTextures: number;
  /** Their estimated GPU MB. */
  heldMb: number;
  /** (S10) Kept effects a match's `createEffect` got back (once per effect per match): programs not compiled again. */
  effReused: number;
  /** (S10) Effects `createEffect` made new (a program compiled). */
  effCompiled: number;
  /** (S10) Effects held now. */
  heldEffects: number;
}

interface TexUse {
  tex: KeptTex;
  bytes: number;
  /** The holder's clock at the last use (least recently used goes first past the budget). */
  touch: number;
}

interface SceneUse {
  tex: Map<string, TexUse>;
  files: Set<string>;
}

interface Held {
  tex: KeptTex;
  bytes: number;
  touch: number;
  /** The hand-over that last used it. */
  gen: number;
}

/** GPU bytes estimate of a decoded image: RGBA8 (4 bytes a texel) or a KTX2 transcode (about 1), plus mips (x 4/3). */
export function textureBytes(width: number, height: number, ktx2: boolean): number {
  return Math.round((width * height * (ktx2 ? 1 : 4) * 4) / 3);
}

export class KeptParts {
  /** = flags.mapReady (App sets it). */
  enabled = false;
  /** Drops one parsed model file (figure.ts sets it to `forgetModel`). */
  forgetFile: (url: string) => void = () => {};
  readonly stats: KeptStats = { texReused: 0, texDecoded: 0, filesReused: 0, filesFetched: 0, heldTextures: 0, heldMb: 0, effReused: 0, effCompiled: 0, heldEffects: 0 };
  /** Budget in bytes (tests lower it). */
  budgetBytes = KEPT_TEXTURE_MB * MB;
  /** (S10) Budget in effects (tests lower it). */
  budgetEffects = KEPT_EFFECTS;

  private readonly scenes = new WeakMap<object, SceneUse>();
  private readonly held = new Map<string, Held>();
  /** Kit / props / art file URL -> the hand-over that last used it. */
  private readonly files = new Map<string, number>();
  private gen = 0;
  private clock = 0;
  /** (S10) Kept effects by cache key. */
  private readonly effects = new Map<string, HeldEffect>();
  private effClock = 0;

  private use(scene: object): SceneUse {
    let u = this.scenes.get(scene);
    if (!u) this.scenes.set(scene, (u = { tex: new Map(), files: new Set() }));
    return u;
  }

  /** A texture made for `scene` under a stable key (figure.ts `texture()`): counted reused when the engine cache hit. */
  useTexture(scene: object, key: string, tex: KeptTex, reused: boolean, bytes: number): void {
    if (!this.enabled) return;
    if (reused) this.stats.texReused++;
    else this.stats.texDecoded++;
    const u = this.use(scene);
    const was = u.tex.get(key);
    const b = bytes > 0 ? bytes : (was?.bytes ?? 0);
    u.tex.set(key, { tex, bytes: b, touch: ++this.clock });
  }

  /** A model file a match read through `loadModel` (kit, props, campus art): counted reused when it was parsed already. */
  useFile(scene: object, url: string, reused: boolean): void {
    if (!this.enabled) return;
    if (reused) this.stats.filesReused++;
    else this.stats.filesFetched++;
    this.use(scene).files.add(url);
  }

  /**
   * `app.releaseState`, before the scene is disposed: hold one reference on every kept texture this scene used, then
   * drop what the last two hand-overs did not use, then the least recently used past the byte budget.
   */
  handOver(scene: object): void {
    if (!this.enabled) return;
    const gen = ++this.gen;
    const u = this.scenes.get(scene);
    if (u) {
      this.scenes.delete(scene);
      for (const [key, t] of u.tex) {
        const h = this.held.get(key);
        if (h && h.tex === t.tex) {
          h.gen = gen;
          h.touch = t.touch;
          if (t.bytes > 0) h.bytes = t.bytes;
          continue;
        }
        // released by the engine already (its last Texture went before the hand-over): nothing to keep
        if (t.tex._references === 0) continue;
        // a new internal texture under a held key (the cache missed): the old one is let go, the new one held
        if (h) h.tex.dispose();
        t.tex.incrementReferences();
        this.held.set(key, { tex: t.tex, bytes: t.bytes, touch: t.touch, gen });
      }
      for (const url of u.files) this.files.set(url, gen);
    }
    for (const [key, h] of this.held) {
      if (h.gen > gen - 2) continue;
      this.held.delete(key);
      h.tex.dispose();
    }
    for (const [url, g] of this.files) {
      if (g > gen - 2) continue;
      this.files.delete(url);
      this.forgetFile(url);
    }
    let total = 0;
    for (const h of this.held.values()) total += h.bytes;
    while (total > this.budgetBytes && this.held.size) {
      let oldKey = '';
      let old: Held | null = null;
      for (const [key, h] of this.held) {
        if (!old || h.touch < old.touch) {
          old = h;
          oldKey = key;
        }
      }
      this.held.delete(oldKey);
      old!.tex.dispose();
      total -= old!.bytes;
    }
    this.count(total);
  }

  /** GPU context lost, or the Textures setting changed: release every held texture. */
  dropTextures(): void {
    if (!this.enabled) return;
    for (const h of this.held.values()) h.tex.dispose();
    this.held.clear();
    this.count(0);
  }

  /** Held texture keys (tests, the debug readout). */
  heldKeys(): string[] {
    return [...this.held.keys()];
  }

  /**
   * (S10) `app.releaseState` with the flag on, before the scene is disposed: one reference on every ready compiled
   * effect (`engine._compiledEffects`), each stripped of what ties it to the old scene; past `budgetEffects` the least
   * recently used are let go (one `dispose()`; `releaseUnkept` then frees them). An effect that is not ready is not
   * kept. A held effect the ending match got back from `createEffect` (`countEffect`) counts as used now; one that left
   * the cache is forgotten.
   */
  keepEffects(compiled: Record<string, KeptEffect>): void {
    if (!this.enabled) return;
    const now = ++this.effClock;
    for (const [key, h] of this.effects) {
      if (compiled[key] === h.eff) continue;
      this.effects.delete(key);
      if (!h.eff.isDisposed) h.eff.dispose();
    }
    for (const key in compiled) {
      const eff = compiled[key]!;
      const h = this.effects.get(key);
      if (h) {
        // (`used`, not the reference count: Babylon's `DrawWrapper.setEffect` never gives one back, so counts drift up)
        if (h.used) h.touch = now;
        h.used = false;
        // (the ending match may have added observers to a kept effect too)
        stripEffect(eff);
        continue;
      }
      if (eff.isDisposed || !eff.isReady()) continue;
      if (eff._refCount !== undefined) eff._refCount++;
      stripEffect(eff);
      this.effects.set(key, { eff, touch: now, used: false });
    }
    const over = this.effects.size - this.budgetEffects;
    if (over > 0) {
      // the least recently used first (a stable sort: within one keep, the cache's order)
      const old = [...this.effects].sort((a, b) => a[1].touch - b[1].touch);
      for (let i = 0; i < over; i++) {
        const [key, h] = old[i]!;
        this.effects.delete(key);
        h.eff.dispose();
      }
    }
    this.stats.heldEffects = this.effects.size;
  }

  /**
   * (S10) `app.releaseState` with the flag on, after the scene's dispose, in place of `engine.releaseEffects()`: every
   * cached effect the holder does not keep is released with force and leaves the cache, as `releaseEffects` releases
   * it (its `onReleaseEffectsObservable` disposes every effect with force).
   */
  releaseUnkept(compiled: Record<string, KeptEffect>): void {
    if (!this.enabled) return;
    for (const key in compiled) {
      const eff = compiled[key]!;
      if (this.effects.get(key)?.eff === eff) continue;
      eff.dispose(true);
      delete compiled[key];
    }
  }

  /**
   * (S10) GPU context lost: every kept effect is released (the holder's reference goes). One the live match uses stays
   * for it (Babylon rebuilds it from its code on the restore); the rest are freed and leave the cache.
   */
  dropEffects(): void {
    if (!this.enabled) return;
    for (const h of this.effects.values()) if (!h.eff.isDisposed) h.eff.dispose();
    this.effects.clear();
    this.stats.heldEffects = 0;
  }

  /**
   * (S10) Every `engine.createEffect` result (App wraps it with the flag on): a kept effect's first return since its
   * keep counts reused (a program not compiled again); a new effect (one reference: its caller's) counts compiled.
   * Both go into S1's `loadCounters`, whose deltas the load record copies at the reveal.
   */
  countEffect(eff: KeptEffect): void {
    if (!this.enabled) return;
    const h = eff._key === undefined ? undefined : this.effects.get(eff._key);
    if (h && h.eff === eff) {
      if (h.used) return;
      h.used = true;
      this.stats.effReused++;
      loadCounters.effReused++;
      return;
    }
    if (eff._refCount === 1) {
      this.stats.effCompiled++;
      loadCounters.effCompiled++;
    }
  }

  /** Kept effect keys (tests, the debug readout). */
  keptEffectKeys(): string[] {
    return [...this.effects.keys()];
  }

  private count(bytes: number): void {
    this.stats.heldTextures = this.held.size;
    this.stats.heldMb = bytes / MB;
  }
}

/** (S10) Cut a kept effect loose from the scene that compiled it: its callbacks, fallbacks and code hooks (closures over
 *  the material, its mesh, the plugin manager) and its observers. What is left is the program, its code and its
 *  uniform / sampler tables, enough to bind it for the next match's material and to rebuild it after a context loss. */
function stripEffect(eff: KeptEffect): void {
  const t = eff as unknown as EffectTies;
  t.onCompiled = null;
  t.onError = null;
  t.onBind = null;
  t._fallbacks = null;
  t._processCodeAfterIncludes = undefined;
  t._processFinalCode = null;
  t.onCompileObservable?.clear();
  t.onErrorObservable?.clear();
  t._onBindObservable?.clear();
}

/** The one holder; `App.kept` points at it. */
export const kept = new KeptParts();
