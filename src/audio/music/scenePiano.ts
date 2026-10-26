/**
 * (piano-escape S3) The Piano Escape scene's only score: "Investigation Piano" (docs/audio-credits.md), one 134 s track.
 * It plays from the intro's 0 s; the intro skip seeks to 38 s; when it nears the end it loops back to 41.0 s with a 2 s
 * equal-power cross-fade, again and again until the scene ends (`fadeOut`) or the player leaves (`stop`).
 *
 * The file is bundled and same origin, never in the offline cache (`PRECACHE_IGNORES`): it is fetched through a dynamic
 * `import()` of its URL only when `start()` runs, then decoded (32 kHz, like the director's tracks) and kept until `stop()`.
 * The loop is scheduled on the audio clock (two legs alive at most), so nothing runs per frame. The maths is in the
 * exported pure functions below (unit tests: tests/scenePiano.test.ts).
 */
import type { AudioEngine } from '../audioEngine';

/** The track's length (s), as measured (ffprobe). The decoded buffer's own duration is what plays. */
export const TRACK_LENGTH = 134.03;
/** The intro skip jumps here (s): the first swell. */
export const SKIP_TO = 38;
/** The loop jumps back here (s) when it nears the end. */
export const LOOP_START = 41;
/** The loop's cross-fade (s). */
export const CROSSFADE = 2;
/** A seek mid-play: the old leg fades out and the new one in over this (s). */
export const SEEK_FADE = 0.3;
/** Fade curve resolution (samples per fade). */
const CURVE_N = 64;
/** Decode at 32 kHz: a third less memory than 48 kHz, plenty for this music (as `gameMusic.ts`). */
const DECODE_RATE = 32000;

// ------------------------------------------------------------------ pure maths

/** Equal-power gain of the incoming side of a cross-fade, `p` 0..1 through it. */
export function fadeInGain(p: number): number {
  return Math.sin(Math.min(1, Math.max(0, p)) * Math.PI * 0.5);
}

/** Equal-power gain of the outgoing side: `fadeInGain(p) ** 2 + fadeOutGain(p) ** 2` is always 1. */
export function fadeOutGain(p: number): number {
  return Math.cos(Math.min(1, Math.max(0, p)) * Math.PI * 0.5);
}

/** A fade as a curve for `setValueCurveAtTime`: `n` points, rising (`in`) or falling (`out`). */
export function equalPowerCurve(n: number, dir: 'in' | 'out'): Float32Array {
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const p = n > 1 ? i / (n - 1) : 1;
    c[i] = dir === 'in' ? fadeInGain(p) : fadeOutGain(p);
  }
  return c;
}

/** A seek target (s) kept inside the track and clear of the loop's cross-fade, so a leg always has room to play. */
export function clampSeek(s: number, length: number = TRACK_LENGTH): number {
  if (!Number.isFinite(s)) return 0;
  return Math.min(Math.max(0, s), Math.max(0, length - CROSSFADE - 1));
}

/**
 * A leg that starts at track offset `offset`: its cross-fade into the next leg is `fade` s long and begins `fadeAt` s
 * after the leg's start (so the leg is audible for `fadeAt + fade` s, to the track's end).
 */
export function legPlan(offset: number, length: number = TRACK_LENGTH): { fade: number; fadeAt: number } {
  const left = Math.max(0, length - offset);
  const fade = Math.min(CROSSFADE, left);
  return { fade, fadeAt: left - fade };
}

/** Seconds from the start of one loop leg to the start of the next (the loop's period). */
export function loopPeriod(length: number = TRACK_LENGTH): number {
  return length - CROSSFADE - LOOP_START;
}

/**
 * Where the playhead is in the track `elapsed` s after `start(offset)` (the leg that is fading in once a cross-fade
 * has begun): `offset + elapsed` on the first leg, then looping from `LOOP_START`.
 */
export function trackPosition(offset: number, elapsed: number, length: number = TRACK_LENGTH): number {
  const e = Math.max(0, elapsed);
  const first = legPlan(offset, length).fadeAt;
  if (e < first) return offset + e;
  const period = loopPeriod(length);
  if (period <= 0) return LOOP_START;
  return LOOP_START + ((e - first) % period);
}

/** The scene's file is only ever fetched from the page's own origin (no CDN: hard rule). */
export function isSameOrigin(url: string, base: string): boolean {
  try {
    return new URL(url, base).origin === new URL(base).origin;
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------ playback

interface Leg {
  src: AudioBufferSourceNode;
  gain: GainNode;
  /** Audio-clock time the leg starts. */
  at: number;
  /** Seconds from `at` to the start of the next leg's cross-fade. */
  fadeAt: number;
  fade: number;
}

type State = 'off' | 'loading' | 'playing';

export class ScenePiano {
  private state: State = 'off';
  /** Bumped by every start / seek / stop: callbacks of an older run see it changed and do nothing. */
  private gen = 0;
  private buf: AudioBuffer | null = null;
  private master: GainNode | null = null;
  private legs: Leg[] = [];
  private offset = 0;
  private readonly curveIn = equalPowerCurve(CURVE_N, 'in');
  private readonly curveOut = equalPowerCurve(CURVE_N, 'out');
  private stopTimer: ReturnType<typeof setTimeout> | null = null;

  /** `load` is how the track's bytes arrive: by default the bundled file (a test passes its own). */
  constructor(
    private readonly audio: AudioEngine,
    private readonly load: () => Promise<AudioBuffer | null> = defaultLoad,
  ) {}

  /** Playing, or loading and about to play. */
  get active(): boolean {
    return this.state !== 'off';
  }

  /** Fetch and decode the track (only now), then play from the intro's 0 s (or the last `seek` made while loading). */
  async start(): Promise<void> {
    if (this.state !== 'off') return;
    this.state = 'loading';
    const gen = ++this.gen;
    if (!this.buf) {
      const b = await this.load();
      if (gen !== this.gen) return; // stopped while loading
      if (!b) {
        this.state = 'off';
        return;
      }
      this.buf = b;
    }
    await new Promise<void>((resolve) => this.audio.whenReady(resolve));
    if (gen !== this.gen) return;
    const ctx = this.audio.ctx;
    if (!ctx) {
      this.state = 'off';
      return;
    }
    this.state = 'playing';
    this.master = this.audio.out('music', 1, 0, Infinity);
    this.play(ctx.currentTime + 0.05, this.offset, 0);
  }

  /** Jump to `s` seconds into the track (the intro skip: `SKIP_TO`), with a short cross-fade. */
  seek(s: number): void {
    this.offset = clampSeek(s, this.buf?.duration ?? TRACK_LENGTH);
    if (this.state !== 'playing') return; // while loading: start() plays from here
    const ctx = this.audio.ctx;
    if (!ctx) return;
    this.play(ctx.currentTime + 0.02, this.offset, SEEK_FADE);
  }

  /** The scene ends: fade out over `s` seconds, then stop. */
  fadeOut(s: number): void {
    const ctx = this.audio.ctx;
    const m = this.master;
    if (this.state !== 'playing' || !ctx || !m) {
      this.stop();
      return;
    }
    const dur = Math.max(0.05, s);
    const now = ctx.currentTime;
    m.gain.cancelScheduledValues(now);
    m.gain.setValueAtTime(m.gain.value, now);
    m.gain.linearRampToValueAtTime(0, now + dur);
    this.gen++; // no more legs after this
    if (this.stopTimer) clearTimeout(this.stopTimer);
    this.stopTimer = setTimeout(() => this.stop(), (dur + 0.15) * 1000);
  }

  /** Leave: stop at once and free the decoded track. */
  stop(): void {
    this.gen++;
    this.state = 'off';
    if (this.stopTimer) clearTimeout(this.stopTimer);
    this.stopTimer = null;
    for (const l of this.legs) this.kill(l);
    this.legs.length = 0;
    if (this.master) this.master.disconnect();
    this.master = null;
    this.buf = null;
    this.offset = 0;
  }

  /** Begin playing at `offset` from audio time `at`: any leg alive fades out over `fadeIn` s as the new one fades in. */
  private play(at: number, offset: number, fadeIn: number): void {
    const gen = ++this.gen;
    const old = this.legs;
    this.legs = [];
    const ctx = this.audio.ctx;
    if (!ctx) return;
    if (old.length > 0 && fadeIn > 0 && this.master) {
      // the old legs (each with its own fade curves) go through one new gain that fades them out together
      const sink = ctx.createGain();
      sink.connect(this.master);
      sink.gain.setValueAtTime(1, at);
      sink.gain.linearRampToValueAtTime(0, at + fadeIn);
      for (const l of old) {
        l.src.onended = null;
        l.gain.disconnect();
        l.gain.connect(sink);
        try {
          l.src.stop(at + fadeIn + 0.05);
        } catch {
          // already stopped
        }
      }
      setTimeout(() => sink.disconnect(), (at - ctx.currentTime + fadeIn + 0.3) * 1000);
    } else for (const l of old) this.kill(l);
    const first = this.leg(at, offset, fadeIn);
    this.legs.push(first);
    this.chain(first, gen);
  }

  /** Schedule the leg after `from` (it starts at `from`'s cross-fade); when `from` has ended, the one after that. */
  private chain(from: Leg, gen: number): void {
    const next = this.leg(from.at + from.fadeAt, LOOP_START, from.fade);
    this.legs.push(next);
    this.fadeLegOut(from);
    from.src.onended = () => {
      if (gen !== this.gen) return;
      const i = this.legs.indexOf(from);
      if (i >= 0) this.legs.splice(i, 1);
      from.gain.disconnect();
      this.chain(next, gen);
    };
  }

  private leg(at: number, offset: number, fadeIn: number): Leg {
    const ctx = this.audio.ctx!;
    const buf = this.buf!;
    const { fade, fadeAt } = legPlan(offset, buf.duration);
    const gain = ctx.createGain();
    gain.gain.value = fadeIn > 0 ? 0 : 1;
    if (fadeIn > 0) gain.gain.setValueCurveAtTime(this.curveIn, at, fadeIn);
    gain.connect(this.master ?? ctx.destination);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(gain);
    src.start(at, offset);
    return { src, gain, at, fadeAt, fade };
  }

  private fadeLegOut(l: Leg): void {
    if (l.fade > 0) l.gain.gain.setValueCurveAtTime(this.curveOut, l.at + l.fadeAt, l.fade);
  }

  private kill(l: Leg): void {
    l.src.onended = null;
    try {
      l.src.stop();
    } catch {
      // not started or already stopped
    }
    l.gain.disconnect();
  }
}

/** The bundled file, imported by URL only here, when the scene starts (not at page load). Same origin only. */
async function defaultLoad(): Promise<AudioBuffer | null> {
  try {
    const url = (await import('../../assets/music/scene/piano-escape.mp3?url')).default;
    if (!isSameOrigin(url, location.href)) throw new Error('scene music: not same origin');
    const decoder = new OfflineAudioContext(2, 1, DECODE_RATE);
    return await decoder.decodeAudioData(await (await fetch(url)).arrayBuffer());
  } catch (e) {
    console.warn('scene music', e);
    return null;
  }
}
