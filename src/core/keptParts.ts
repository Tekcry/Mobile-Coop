/**
 * (map-ready S9, BRIEF A18: Michael's Q3 pick, option 1) The kept parts: the costly shared parts of a match that stay
 * alive on the App between matches, so a repeat load fetches, parses and decodes nothing again. Each match still gets a
 * fresh scene; only textures and parsed model files are held here, never a material, mesh or scene (the 3.1.7 leak).
 *
 * - Textures: `figure.ts` `texture()` creates each GLB image under a stable key, so Babylon's engine texture cache
 *   (`_getFromCache(url)`) hands the next scene the same internal texture. `handOver(scene)` (App.releaseState, before the
 *   scene is disposed) holds one reference on every kept texture that scene used, so the scene's dispose does not free
 *   it. A texture unused in the last two hand-overs is released; past `KEPT_TEXTURE_MB` the least recently used go first.
 * - Files: kit, props and campus art read their GLB through `figure.ts` `loadModel` (parse once per URL); a file unused
 *   in the last two hand-overs is forgotten (`forgetFile`, set by figure.ts to `forgetModel`).
 * - `dropTextures()`: GPU context lost, or the Textures setting changed: every held texture is released.
 *
 * Pure: no Babylon import; Babylon's InternalTexture reaches it as `KeptTex`. Scenes are keys of a WeakMap only, so a
 * scene that is never handed over (disposed by `setState`) is not kept alive by this holder. Load-time code, not a hot
 * path. `enabled` false (the `mapReady` flag off): every call is a no-op (today's behaviour).
 */

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
  readonly stats: KeptStats = { texReused: 0, texDecoded: 0, filesReused: 0, filesFetched: 0, heldTextures: 0, heldMb: 0 };
  /** Budget in bytes (tests lower it). */
  budgetBytes = KEPT_TEXTURE_MB * MB;

  private readonly scenes = new WeakMap<object, SceneUse>();
  private readonly held = new Map<string, Held>();
  /** Kit / props / art file URL -> the hand-over that last used it. */
  private readonly files = new Map<string, number>();
  private gen = 0;
  private clock = 0;

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

  private count(bytes: number): void {
    this.stats.heldTextures = this.held.size;
    this.stats.heldMb = bytes / MB;
  }
}

/** The one holder; `App.kept` points at it. */
export const kept = new KeptParts();
