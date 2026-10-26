/**
 * (map-ready S3, A9 / A21 / A24) The gate's `audio` step: the weapon sprite's `whenLoaded` (settled by its one decode),
 * the first music cue (`firstCue`: 'caution', decoded once and shared with `mission()`'s loads, no user gesture: an
 * `OfflineAudioContext`), and `gameAudioReady`, which waits for the music and, only when the audio context exists, the
 * sprite; it never rejects.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { App } from '../src/core/app';
import type { AudioEngine } from '../src/audio/audioEngine';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** A decoded buffer stand-in (silence: `alignShift` finds no mark and keeps 0). */
const buffer = (): AudioBuffer => ({ sampleRate: 48000, length: 4800, duration: 0.1, numberOfChannels: 1, getChannelData: () => new Float32Array(4800) }) as unknown as AudioBuffer;

/** An audio engine stand-in: `whenReady` runs at once with a context, else on `start` (the first input). */
function engine(withCtx: boolean, decode: () => Promise<AudioBuffer>) {
  const pending: (() => void)[] = [];
  const decodeAudioData = vi.fn(decode);
  const ctx = { decodeAudioData, currentTime: 0 };
  const a = {
    ctx: withCtx ? ctx : null,
    running: true,
    whenReady(fn: () => void): void {
      if (a.ctx) fn();
      else pending.push(fn);
    },
    start(): void {
      a.ctx = ctx;
      for (const fn of pending.splice(0)) fn();
    },
  };
  return { a, decodeAudioData, asEngine: a as unknown as AudioEngine };
}

/** Settled yet? (after the queued microtasks and a macrotask) */
async function settled(p: Promise<unknown>): Promise<boolean> {
  let done = false;
  void p.then(
    () => (done = true),
    () => (done = true),
  );
  await new Promise((r) => setTimeout(r, 0));
  return done;
}

describe('WeaponAudio.whenLoaded (map-ready S3)', () => {
  it('true after the sprite decodes; a call after it settled resolves at once with the same answer', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new ArrayBuffer(16))));
    const { WeaponAudio } = await import('../src/audio/weapons/weaponAudio');
    const e = engine(true, async () => buffer());
    const wa = new WeaponAudio(e.asEngine);
    expect(await wa.whenLoaded()).toBe(true);
    expect(wa.stats.loaded).toBe(true);
    expect(e.decodeAudioData).toHaveBeenCalledTimes(1);
    expect(await settled(wa.whenLoaded())).toBe(true);
    expect(await wa.whenLoaded()).toBe(true);
  });

  it('false after a failed fetch (stats.failed); never rejects', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('offline'))));
    const { WeaponAudio } = await import('../src/audio/weapons/weaponAudio');
    const e = engine(true, async () => buffer());
    const wa = new WeaponAudio(e.asEngine);
    expect(await wa.whenLoaded()).toBe(false);
    expect(wa.stats.failed).toBe(true);
    expect(e.decodeAudioData).not.toHaveBeenCalled();
  });

  it('with no audio context yet it waits: the decode starts with the context (the first input), as before', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new ArrayBuffer(16))));
    const { WeaponAudio } = await import('../src/audio/weapons/weaponAudio');
    const e = engine(false, async () => buffer());
    const wa = new WeaponAudio(e.asEngine);
    const p = wa.whenLoaded();
    expect(await settled(p)).toBe(false);
    e.a.start();
    expect(await p).toBe(true);
  });
});

describe('GameMusic / Music firstCue (map-ready S3, A24)', () => {
  /** `fetch` and `OfflineAudioContext` stubbed: every fetched url and decode recorded; `fail` urls reject. */
  function stubDecoder(fail: (url: string) => boolean = () => false) {
    const fetched: string[] = [];
    let decodes = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        fetched.push(url);
        if (fail(url)) throw new Error(`missing ${url}`);
        return new Response(new ArrayBuffer(16));
      }),
    );
    vi.stubGlobal(
      'OfflineAudioContext',
      class {
        decodeAudioData(): Promise<AudioBuffer> {
          decodes++;
          return Promise.resolve(buffer());
        }
      },
    );
    return { fetched, decodes: () => decodes };
  }
  const caution = (u: string): boolean => /music-caution(-head)?\.mp3/.test(u);

  it("true: 'caution' decoded (its head and loop), once, even when mission() loads after it", async () => {
    const s = stubDecoder();
    const { GameMusic } = await import('../src/audio/score/game/gameMusic');
    const e = engine(true, async () => buffer());
    const gm = new GameMusic(e.asEngine);
    expect(await gm.firstCue()).toBe(true);
    const first = s.fetched.filter(caution);
    expect(first.length).toBe(2);
    expect(gm.debug.ready).toContain('caution');
    gm.mission();
    // mission() loads caution, alert, spotted, evade in turn: caution is the same decode
    await vi.waitFor(() => expect(s.fetched.some((u) => /music-evade\.mp3/.test(u))).toBe(true));
    expect(s.fetched.filter(caution)).toEqual(first);
    expect(await gm.firstCue()).toBe(true);
    expect(s.fetched.filter(caution)).toEqual(first);
  });

  it('false when the track is missing (its file does not load); never rejects', async () => {
    stubDecoder(caution);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { GameMusic } = await import('../src/audio/score/game/gameMusic');
    const gm = new GameMusic(engine(true, async () => buffer()).asEngine);
    expect(await gm.firstCue()).toBe(false);
    expect(warn).toHaveBeenCalled();
  });

  it('Music.firstCue passes through to the score', async () => {
    stubDecoder();
    const { Music } = await import('../src/audio/music/music');
    const m = new Music(engine(false, async () => buffer()).asEngine);
    // (no audio context needed: the decode runs on an OfflineAudioContext)
    expect(await m.firstCue()).toBe(true);
    expect(m.debug.ready).toContain('caution');
  });
});

describe('gameAudioReady (map-ready S3, A9 / A24)', () => {
  /** A deferred promise. */
  function later<T>() {
    let resolve!: (v: T) => void;
    let reject!: (e: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  }
  function app(ctx: boolean, cue: Promise<boolean>, sprite: Promise<boolean>) {
    const whenLoaded = vi.fn(() => sprite);
    const a = { music: { firstCue: vi.fn(() => cue) }, audio: { ctx: ctx ? {} : null }, weaponAudio: { whenLoaded } };
    return { app: a as unknown as App, whenLoaded };
  }

  it('no audio context: settles once the music cue has, without waiting for the sprite', async () => {
    const { gameAudioReady } = await import('../src/audio/gameAudio');
    const cue = later<boolean>();
    const sprite = later<boolean>(); // never settles
    const a = app(false, cue.promise, sprite.promise);
    const p = gameAudioReady(a.app);
    expect(await settled(p)).toBe(false);
    cue.resolve(true);
    expect(await settled(p)).toBe(true);
    expect(a.whenLoaded).not.toHaveBeenCalled();
  });

  it('with the audio context: waits for the sprite too (decoded or failed)', async () => {
    const { gameAudioReady } = await import('../src/audio/gameAudio');
    const cue = later<boolean>();
    const sprite = later<boolean>();
    const a = app(true, cue.promise, sprite.promise);
    const p = gameAudioReady(a.app);
    cue.resolve(true);
    expect(await settled(p)).toBe(false);
    sprite.resolve(false);
    expect(await settled(p)).toBe(true);
    expect(a.whenLoaded).toHaveBeenCalledTimes(1);
  });

  it('never rejects (a failing music decode or sprite still settles the step)', async () => {
    const { gameAudioReady } = await import('../src/audio/gameAudio');
    const a = app(true, Promise.reject(new Error('cue')), Promise.reject(new Error('sprite')));
    await expect(gameAudioReady(a.app)).resolves.toBeUndefined();
  });
});
