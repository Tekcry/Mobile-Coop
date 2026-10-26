/**
 * (piano-escape S3, S5b) The Piano Escape scene's score, two tracks (`sceneTracks.ts`, credits in docs/audio-credits.md):
 * - the intro track ("Investigation Piano", `?pianointro=`) plays from the intro's 0 s; the intro skip seeks to 38 s;
 * - the EMP press (`seek(s)` with s >= `EMP_AT`) cross-fades (equal power, 2 s) into the mission track ("Suspense
 *   Thriller", `?pianomusic=`) from its 0 s, which then loops whole (end into start, the same 2 s cross-fade) until the
 *   scene ends (`fadeOut`) or the player leaves (`stop`). A checkpoint restart does not touch it: it plays on, never back
 *   to the intro track.
 * The mission track is fetched and decoded in the background once the intro plays; if it is not ready at the press, the
 * intro track plays on and the switch happens as soon as it is. `?pianomusic=pixabay` (no mission track) is S3's
 * behaviour, for A/B: the intro track plays on through the press, seeks to 41 s and loops from there.
 *
 * The files are bundled and same origin, never in the offline cache (`PRECACHE_IGNORES`): each is fetched through a
 * dynamic `import()` of its URL only when needed, decoded (32 kHz, like the director's tracks) and kept until `stop()`
 * (the intro track is let go once the mission track takes over). Legs are scheduled on the audio clock (a few alive at
 * most), so nothing runs per frame. The maths is in the exported pure functions below (tests/scenePiano.test.ts).
 */
import type { AudioEngine } from '../audioEngine';
import { sceneMusicFromSearch, sceneTrack, type SceneTrack } from './sceneTracks';

/** The intro track's length (s), as measured (ffprobe). The decoded buffer's own duration is what plays. */
export const TRACK_LENGTH = 134.03;
/** The intro skip jumps here (s): the first swell. */
export const SKIP_TO = 38;
/** The intro track loops back here (s) when it nears the end (S3; with no mission track, or while the mission one loads). */
export const LOOP_START = 41;
/**
 * A seek to this (s) or later is the EMP press: S2's `EMP_SEEK` (`pianoIntro.ts`, `piano.seek(EMP_SEEK)` at the press)
 * lands here. With a mission track it switches to that track; with none (`?pianomusic=pixabay`) it is a plain seek.
 */
export const EMP_AT = 41;
/** The loop's cross-fade (s), and the intro-to-mission cross-fade at the EMP press. */
export const CROSSFADE = 2;
/** The EMP press: the intro leg fades out and the mission track in over this (s), equal power. */
export const MISSION_FADE = CROSSFADE;
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

/** Seconds from the start of one intro-track loop leg to the start of the next (S3's loop from 41 s). */
export function loopPeriod(length: number = TRACK_LENGTH): number {
  return length - CROSSFADE - LOOP_START;
}

/**
 * Seconds from the start of one mission-track leg to the start of the next: it loops whole, so this is its length less
 * the cross-fade (the lightning period; "Suspense Thriller" 162.04 s -> 160.04 s).
 */
export function missionLoopPeriod(length: number): number {
  return length - CROSSFADE;
}

/** Where the playhead is in the mission track `elapsed` s after the switch began (0 at the switch, looping whole). */
export function missionPosition(elapsed: number, length: number): number {
  const period = missionLoopPeriod(length);
  const e = Math.max(0, elapsed);
  return period > 0 ? e % period : 0;
}

/**
 * Where the playhead is in the intro track `elapsed` s after `start(offset)` with no mission track (the leg that is
 * fading in once a cross-fade has begun): `offset + elapsed` on the first leg, then looping from `LOOP_START`.
 */
export function trackPosition(offset: number, elapsed: number, length: number = TRACK_LENGTH): number {
  const e = Math.max(0, elapsed);
  const first = legPlan(offset, length).fadeAt;
  if (e < first) return offset + e;
  const period = loopPeriod(length);
  if (period <= 0) return LOOP_START;
  return LOOP_START + ((e - first) % period);
}

/**
 * What `seek(s)` does (the switch plan):
 * - `seek`: a plain seek in the intro track (the skip; or any seek with no mission track, S3's behaviour);
 * - `switch`: the EMP press, the mission track decoded: cross-fade into it now;
 * - `wait`: the EMP press, the mission track still loading: the intro track plays on, the switch comes when it is ready;
 * - `ignore`: the press has happened: the music never goes back to the intro track.
 */
export function seekAction(s: number, hasMission: boolean, missionReady: boolean, pressed: boolean): 'seek' | 'switch' | 'wait' | 'ignore' {
  if (!hasMission) return 'seek';
  if (pressed) return 'ignore';
  if (!(s >= EMP_AT)) return 'seek';
  return missionReady ? 'switch' : 'wait';
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

/** Where the scene's two tracks come from (default: the bundled files `?pianointro=` / `?pianomusic=` chose). */
export interface SceneMusicSource {
  intro: () => Promise<AudioBuffer | null>;
  /** Where the intro track loops back to (s) if it nears its end (0 = whole). */
  introLoop: number;
  /** The mission track the EMP press switches to; null = none (the intro track plays on, `?pianomusic=pixabay`). */
  mission: (() => Promise<AudioBuffer | null>) | null;
}

interface Leg {
  src: AudioBufferSourceNode;
  gain: GainNode;
  /** The track this leg plays, and where its next leg starts in it (s). */
  buf: AudioBuffer;
  loop: number;
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
  /** Bumped only by `stop`: a mission preload of an older run sees it changed and drops its buffer. */
  private life = 0;
  private intro: AudioBuffer | null = null;
  private mission: AudioBuffer | null = null;
  private missionLoading = false;
  /** The EMP press has happened (with a mission track): the music never goes back to the intro track. */
  private pressed = false;
  private onMission = false;
  private master: GainNode | null = null;
  private legs: Leg[] = [];
  private offset = 0;
  private readonly curveIn = equalPowerCurve(CURVE_N, 'in');
  private readonly curveOut = equalPowerCurve(CURVE_N, 'out');
  private stopTimer: ReturnType<typeof setTimeout> | null = null;

  /** `src` is how the tracks' bytes arrive: by default the bundled files (a test or the Music Lab passes its own). */
  constructor(
    private readonly audio: AudioEngine,
    private readonly src: SceneMusicSource = sceneMusicSource(),
  ) {}

  /** Playing, or loading and about to play. */
  get active(): boolean {
    return this.state !== 'off';
  }

  /** A `fadeOut` is running (the scene is over; the piano stops by itself when it ends). */
  get fadingOut(): boolean {
    return this.stopTimer !== null;
  }

  /** The mission track has taken over (tests, debug). */
  get onMissionTrack(): boolean {
    return this.onMission;
  }

  /** Fetch and decode the intro track (only now), play it from 0 s (or the last `seek` made while loading), then preload the mission track. */
  async start(): Promise<void> {
    if (this.state !== 'off') return;
    this.state = 'loading';
    const gen = ++this.gen;
    const intro = this.intro ?? (await this.src.intro());
    if (gen !== this.gen) return; // stopped while loading
    if (!intro) {
      this.state = 'off';
      return;
    }
    this.intro = intro;
    await new Promise<void>((resolve) => this.audio.whenReady(resolve));
    if (gen !== this.gen) return;
    const ctx = this.audio.ctx;
    if (!ctx) {
      this.state = 'off';
      return;
    }
    this.state = 'playing';
    this.master = this.audio.out('music', 1, 0, Infinity);
    const at = ctx.currentTime + 0.05;
    if (this.pressed && this.mission) this.toMission(at, 0);
    else this.play(at, intro, this.offset, 0, this.src.introLoop);
    this.preloadMission();
  }

  /** Jump to `s` seconds into the intro track (the skip: `SKIP_TO`); `s >= EMP_AT` is the EMP press (`seekAction`). */
  seek(s: number): void {
    const act = seekAction(s, this.src.mission !== null, this.mission !== null, this.pressed);
    if (act === 'ignore') return;
    this.offset = clampSeek(s, this.intro?.duration ?? TRACK_LENGTH);
    if (act !== 'seek') this.pressed = true;
    if (this.state !== 'playing') return; // while loading: start() plays from here (or the mission track)
    const ctx = this.audio.ctx;
    if (!ctx) return;
    if (act === 'switch') this.toMission(ctx.currentTime + 0.02, MISSION_FADE);
    else if (act === 'seek' && this.intro) this.play(ctx.currentTime + 0.02, this.intro, this.offset, SEEK_FADE, this.src.introLoop);
    // 'wait': the intro track plays on; the preload's arrival switches
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

  /** Leave: stop at once and free both decoded tracks. */
  stop(): void {
    this.gen++;
    this.life++;
    this.state = 'off';
    if (this.stopTimer) clearTimeout(this.stopTimer);
    this.stopTimer = null;
    for (const l of this.legs) this.kill(l);
    this.legs.length = 0;
    if (this.master) this.master.disconnect();
    this.master = null;
    this.intro = null;
    this.mission = null;
    this.missionLoading = false;
    this.pressed = false;
    this.onMission = false;
    this.offset = 0;
  }

  /** Fetch and decode the mission track in the background (once per run); a press waiting for it switches on arrival. */
  private preloadMission(): void {
    const load = this.src.mission;
    if (!load || this.mission || this.missionLoading) return;
    this.missionLoading = true;
    const life = this.life;
    void load()
      .catch(() => null)
      .then((b) => {
        if (life !== this.life) return; // stopped meanwhile: drop it
        this.missionLoading = false;
        this.mission = b;
        const ctx = this.audio.ctx;
        if (!b || !ctx || !this.pressed || this.onMission || this.state !== 'playing' || this.fadingOut) return;
        this.toMission(ctx.currentTime + 0.02, MISSION_FADE);
      });
  }

  /** The EMP press: cross-fade into the mission track from its 0 s; it loops whole. The intro track is let go. */
  private toMission(at: number, fade: number): void {
    const b = this.mission;
    if (!b) return;
    this.onMission = true;
    this.play(at, b, 0, fade, 0);
    this.intro = null; // the fading legs keep their own reference until they stop
  }

  /** Begin playing `buf` at `offset` from audio time `at`: any leg alive fades out over `fadeIn` s as the new one fades in. */
  private play(at: number, buf: AudioBuffer, offset: number, fadeIn: number, loop: number): void {
    const gen = ++this.gen;
    const old = this.legs;
    this.legs = [];
    const ctx = this.audio.ctx;
    if (!ctx) return;
    if (old.length > 0 && fadeIn > 0 && this.master) {
      // the old legs (each with its own fade curves) go through one new gain that fades them out together, equal power
      const sink = ctx.createGain();
      sink.connect(this.master);
      sink.gain.value = 1;
      sink.gain.setValueCurveAtTime(this.curveOut, at, fadeIn);
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
    const first = this.leg(at, buf, offset, fadeIn, loop);
    this.legs.push(first);
    this.chain(first, gen);
  }

  /** Schedule the leg after `from` (it starts at `from`'s cross-fade, at `from`'s loop point); when `from` has ended, the one after that. */
  private chain(from: Leg, gen: number): void {
    const next = this.leg(from.at + from.fadeAt, from.buf, from.loop, from.fade, from.loop);
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

  private leg(at: number, buf: AudioBuffer, offset: number, fadeIn: number, loop: number): Leg {
    const ctx = this.audio.ctx!;
    const { fade, fadeAt } = legPlan(offset, buf.duration);
    const gain = ctx.createGain();
    gain.gain.value = fadeIn > 0 ? 0 : 1;
    if (fadeIn > 0) gain.gain.setValueCurveAtTime(this.curveIn, at, fadeIn);
    gain.connect(this.master ?? ctx.destination);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(gain);
    src.start(at, offset);
    return { src, gain, buf, loop, at, fadeAt, fade };
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

/**
 * The scene's tracks as `?pianointro=` / `?pianomusic=` chose them (default "Investigation Piano", then "Suspense
 * Thriller"). Nothing is fetched here: each loader imports its file's URL only when called (not at page load).
 */
export function sceneMusicSource(search: string = globalThis.location?.search ?? ''): SceneMusicSource {
  const pick = sceneMusicFromSearch(search);
  const intro = sceneTrack(pick.intro);
  const mission = pick.mission === null ? null : sceneTrack(pick.mission);
  return {
    intro: () => loadTrack(intro),
    introLoop: intro.loopFrom,
    mission: mission ? () => loadTrack(mission) : null,
  };
}

/** One bundled track, fetched and decoded; null if it fails. */
export async function loadTrack(t: SceneTrack): Promise<AudioBuffer | null> {
  try {
    return await loadSceneTrack(await t.url());
  } catch (e) {
    console.warn('scene music', e);
    return null;
  }
}

/** Fetch and decode one bundled track by its URL. Same origin only. */
export async function loadSceneTrack(url: string): Promise<AudioBuffer | null> {
  try {
    if (!isSameOrigin(url, location.href)) throw new Error('scene music: not same origin');
    const decoder = new OfflineAudioContext(2, 1, DECODE_RATE);
    return await decoder.decodeAudioData(await (await fetch(url)).arrayBuffer());
  } catch (e) {
    console.warn('scene music', e);
    return null;
  }
}
