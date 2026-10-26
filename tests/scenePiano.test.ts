/**
 * (piano-escape S3, S5b) The scene's piano: the loop / cross-fade / seek / switch maths, the same-origin check, and the
 * lifecycle (the intro track, then the mission track) on a fake audio context (nothing is fetched or decoded: the tracks
 * arrive through the injected loaders).
 */
import { describe, expect, it } from 'vitest';
import { Music } from '../src/audio/music/music';
import type { AudioEngine } from '../src/audio/audioEngine';
import {
  CROSSFADE,
  EMP_AT,
  LOOP_START,
  MISSION_FADE,
  ScenePiano,
  SKIP_TO,
  TRACK_LENGTH,
  clampSeek,
  equalPowerCurve,
  fadeInGain,
  fadeOutGain,
  isSameOrigin,
  legPlan,
  loopPeriod,
  missionLoopPeriod,
  missionPosition,
  seekAction,
  trackPosition,
  type SceneMusicSource,
} from '../src/audio/music/scenePiano';

describe('scene piano: maths', () => {
  it('uses the planned points', () => {
    expect(TRACK_LENGTH).toBe(134.03);
    expect(SKIP_TO).toBe(38);
    expect(LOOP_START).toBe(41);
    expect(CROSSFADE).toBe(2);
  });

  it('the cross-fade is equal power: in and out squares always sum to 1', () => {
    expect(fadeInGain(0)).toBe(0);
    expect(fadeInGain(1)).toBeCloseTo(1, 12);
    expect(fadeOutGain(0)).toBe(1);
    expect(fadeOutGain(1)).toBeCloseTo(0, 12);
    for (let p = 0; p <= 1.0001; p += 0.05) expect(fadeInGain(p) ** 2 + fadeOutGain(p) ** 2).toBeCloseTo(1, 12);
    expect(fadeInGain(-3)).toBe(0);
    expect(fadeInGain(7)).toBeCloseTo(1, 12);
  });

  it('the fade curves run 0 to 1 and 1 to 0', () => {
    const up = equalPowerCurve(64, 'in');
    const down = equalPowerCurve(64, 'out');
    expect(up.length).toBe(64);
    expect(up[0]).toBe(0);
    expect(up[63]).toBeCloseTo(1, 6);
    expect(down[0]).toBe(1);
    expect(down[63]).toBeCloseTo(0, 6);
    for (let i = 1; i < 64; i++) expect(up[i]!).toBeGreaterThanOrEqual(up[i - 1]!);
  });

  it('a leg from 0 s cross-fades into the loop 2 s before the end', () => {
    const p = legPlan(0);
    expect(p.fade).toBe(2);
    expect(p.fadeAt).toBeCloseTo(TRACK_LENGTH - 2, 9);
    // from the skip point
    expect(legPlan(SKIP_TO).fadeAt).toBeCloseTo(TRACK_LENGTH - 2 - 38, 9);
    // a loop leg lasts (length - 41) s, its cross-fade starting at the period
    expect(legPlan(LOOP_START).fadeAt).toBeCloseTo(loopPeriod(), 9);
    expect(loopPeriod()).toBeCloseTo(91.03, 9);
  });

  it('a leg too near the end gets a shorter cross-fade, never a negative start', () => {
    const p = legPlan(TRACK_LENGTH - 0.5);
    expect(p.fade).toBeCloseTo(0.5, 9);
    expect(p.fadeAt).toBeCloseTo(0, 9);
    expect(legPlan(TRACK_LENGTH + 5)).toEqual({ fade: 0, fadeAt: 0 });
  });

  it('seeks stay inside the track and clear of the loop cross-fade', () => {
    expect(clampSeek(SKIP_TO)).toBe(38);
    expect(clampSeek(-5)).toBe(0);
    expect(clampSeek(Number.NaN)).toBe(0);
    expect(clampSeek(500)).toBeCloseTo(TRACK_LENGTH - CROSSFADE - 1, 9);
    expect(clampSeek(10, 5)).toBe(2);
  });

  it('the playhead runs on from 0 s, jumps to 41 s at the cross-fade and loops', () => {
    expect(trackPosition(0, 0)).toBe(0);
    expect(trackPosition(0, 10)).toBe(10);
    const end = TRACK_LENGTH - CROSSFADE;
    expect(trackPosition(0, end - 0.01)).toBeCloseTo(end - 0.01, 9);
    expect(trackPosition(0, end + 0.5)).toBeCloseTo(LOOP_START + 0.5, 9);
    // a full loop later it is back at the same place
    expect(trackPosition(0, end + 0.5 + loopPeriod())).toBeCloseTo(LOOP_START + 0.5, 9);
    expect(trackPosition(0, end + 0.5 + 5 * loopPeriod())).toBeCloseTo(LOOP_START + 0.5, 6);
    // after the skip
    expect(trackPosition(SKIP_TO, 1)).toBe(39);
    expect(trackPosition(SKIP_TO, 1 + (end - SKIP_TO))).toBeCloseTo(LOOP_START + 1, 9);
    expect(trackPosition(0, -4)).toBe(0);
  });

  it('the EMP press lands on S2s EMP_SEEK (41 s) and cross-fades over the loop cross-fade', () => {
    expect(EMP_AT).toBe(41);
    expect(MISSION_FADE).toBe(CROSSFADE);
  });

  it('the mission track loops whole: its period is its length less the cross-fade (Grohl 162.04 s -> 160.04 s)', () => {
    expect(missionLoopPeriod(162.04)).toBeCloseTo(160.04, 9);
    expect(missionLoopPeriod(83.78)).toBeCloseTo(81.78, 9);
    // a mission leg from 0 starts its cross-fade one period in, into the next leg from 0
    expect(legPlan(0, 162.04).fadeAt).toBeCloseTo(missionLoopPeriod(162.04), 9);
    expect(missionPosition(0, 162.04)).toBe(0);
    expect(missionPosition(10, 162.04)).toBe(10);
    expect(missionPosition(160.04 + 3, 162.04)).toBeCloseTo(3, 9);
    expect(missionPosition(-1, 162.04)).toBe(0);
    expect(missionPosition(5, 1)).toBe(0);
  });

  it('the switch plan: the skip seeks, the press switches (or waits for the track), then nothing goes back', () => {
    // with a mission track
    expect(seekAction(SKIP_TO, true, false, false)).toBe('seek');
    expect(seekAction(EMP_AT, true, true, false)).toBe('switch');
    expect(seekAction(60, true, true, false)).toBe('switch');
    expect(seekAction(EMP_AT, true, false, false)).toBe('wait');
    expect(seekAction(EMP_AT, true, true, true)).toBe('ignore');
    expect(seekAction(SKIP_TO, true, true, true)).toBe('ignore');
    expect(seekAction(Number.NaN, true, true, false)).toBe('seek');
    // none (?pianomusic=pixabay): every seek is a plain seek, as in S3
    expect(seekAction(SKIP_TO, false, false, false)).toBe('seek');
    expect(seekAction(EMP_AT, false, false, false)).toBe('seek');
  });

  it('only a same-origin file is fetched', () => {
    const page = 'https://example.github.io/Mobile-Coop/index.html';
    expect(isSameOrigin('/Mobile-Coop/assets/piano-escape-Ab12.mp3', page)).toBe(true);
    expect(isSameOrigin('assets/piano-escape-Ab12.mp3', page)).toBe(true);
    expect(isSameOrigin('https://cdn.example.com/piano.mp3', page)).toBe(false);
    expect(isSameOrigin('//cdn.example.com/piano.mp3', page)).toBe(false);
    expect(isSameOrigin('data:audio/mpeg;base64,AAAA', page)).toBe(false);
    expect(isSameOrigin('x', 'not a url')).toBe(false);
  });
});

// ------------------------------------------------------------------ a fake audio context

interface FakeParam {
  value: number;
  setValueAtTime(v: number, t: number): void;
  linearRampToValueAtTime(v: number, t: number): void;
  setValueCurveAtTime(c: Float32Array, t: number, d: number): void;
  cancelScheduledValues(t: number): void;
}
class FakeNode {
  connected = true;
  gain: FakeParam = {
    value: 1,
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    setValueCurveAtTime() {},
    cancelScheduledValues() {},
  };
  buffer: unknown = null;
  starts: { at: number; offset: number }[] = [];
  stops = 0;
  onended: (() => void) | null = null;
  connect(): void {}
  disconnect(): void {
    this.connected = false;
  }
  start(at: number, offset: number): void {
    this.starts.push({ at, offset });
  }
  stop(): void {
    this.stops++;
  }
}
function fakeAudio(): { audio: AudioEngine; sources: FakeNode[]; outs: FakeNode[] } {
  const sources: FakeNode[] = [];
  const outs: FakeNode[] = [];
  const ctx = {
    currentTime: 10,
    destination: new FakeNode(),
    createGain: () => new FakeNode(),
    createBufferSource: () => {
      const n = new FakeNode();
      sources.push(n);
      return n;
    },
  };
  const audio = {
    ctx,
    whenReady: (fn: () => void) => fn(),
    out: () => {
      const n = new FakeNode();
      outs.push(n);
      return n;
    },
  } as unknown as AudioEngine;
  return { audio, sources, outs };
}
const buffer = (duration: number = TRACK_LENGTH): AudioBuffer => ({ duration }) as AudioBuffer;
type Load = () => Promise<AudioBuffer | null>;
/** The scene's tracks for a test: the intro loader, and the mission loader (null: S3's behaviour, `?pianomusic=pixabay`). */
const source = (intro: Load, mission: Load | null = null): SceneMusicSource => ({ intro, introLoop: LOOP_START, mission });

describe('scene piano: lifecycle', () => {
  it('fetches nothing until start(), then plays from 0 s with the next leg already scheduled at the loop', async () => {
    const { audio, sources } = fakeAudio();
    let loads = 0;
    const p = new ScenePiano(audio, source(() => {
      loads++;
      return Promise.resolve(buffer());
    }));
    expect(loads).toBe(0);
    expect(p.active).toBe(false);
    await p.start();
    expect(loads).toBe(1);
    expect(p.active).toBe(true);
    expect(sources.length).toBe(2);
    expect(sources[0]!.starts[0]!.offset).toBe(0);
    expect(sources[1]!.starts[0]!.offset).toBe(LOOP_START);
    expect(sources[1]!.starts[0]!.at - sources[0]!.starts[0]!.at).toBeCloseTo(TRACK_LENGTH - CROSSFADE, 9);
  });

  it('a seek before the track has loaded makes start() play from there; a second start() does nothing', async () => {
    const { audio, sources } = fakeAudio();
    const p = new ScenePiano(audio, source(() => Promise.resolve(buffer())));
    const started = p.start();
    p.seek(SKIP_TO);
    await started;
    await p.start();
    expect(sources.length).toBe(2);
    expect(sources[0]!.starts[0]!.offset).toBe(SKIP_TO);
  });

  it('a seek while playing starts a new leg at that point and fades the old ones out', async () => {
    const { audio, sources } = fakeAudio();
    const p = new ScenePiano(audio, source(() => Promise.resolve(buffer())));
    await p.start();
    p.seek(SKIP_TO);
    expect(sources.length).toBe(4);
    expect(sources[2]!.starts[0]!.offset).toBe(SKIP_TO);
    expect(sources[0]!.stops).toBe(1);
    expect(sources[1]!.stops).toBe(1);
  });

  it('when a leg ends the leg after the next one is scheduled, one loop period on', async () => {
    const { audio, sources } = fakeAudio();
    const p = new ScenePiano(audio, source(() => Promise.resolve(buffer())));
    await p.start();
    sources[0]!.onended?.();
    expect(sources.length).toBe(3);
    expect(sources[2]!.starts[0]!.offset).toBe(LOOP_START);
    expect(sources[2]!.starts[0]!.at - sources[1]!.starts[0]!.at).toBeCloseTo(loopPeriod(), 9);
  });

  it('stop() silences everything; a stop while loading means nothing ever plays', async () => {
    const a = fakeAudio();
    const p = new ScenePiano(a.audio, source(() => Promise.resolve(buffer())));
    await p.start();
    p.stop();
    expect(p.active).toBe(false);
    expect(a.sources.every((s) => s.stops === 1)).toBe(true);
    expect(a.outs[0]!.connected).toBe(false);

    const b = fakeAudio();
    const q = new ScenePiano(b.audio, source(() => Promise.resolve(buffer())));
    const started = q.start();
    q.stop();
    await started;
    expect(b.sources.length).toBe(0);
    expect(q.active).toBe(false);
  });

  it('a failed load leaves it off', async () => {
    const { audio, sources } = fakeAudio();
    const p = new ScenePiano(audio, source(() => Promise.resolve(null)));
    await p.start();
    expect(p.active).toBe(false);
    expect(sources.length).toBe(0);
  });
});

describe('scene piano: the intro track, then the mission track (S5b)', () => {
  const GROHL = 162.04;
  const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));
  /** A mission loader the test resolves by hand, counting its calls. */
  function pending(): { load: Load; resolve: (b: AudioBuffer | null) => void; calls: () => number } {
    let calls = 0;
    let resolve: (b: AudioBuffer | null) => void = () => {};
    const load: Load = () => {
      calls++;
      return new Promise((r) => (resolve = r));
    };
    return { load, resolve: (b) => resolve(b), calls: () => calls };
  }

  it('the intro plays from 0 (looping from 41 s); the mission track is fetched only once the intro has started', async () => {
    const { audio, sources } = fakeAudio();
    const m = pending();
    const p = new ScenePiano(audio, source(() => Promise.resolve(buffer()), m.load));
    const started = p.start();
    expect(m.calls()).toBe(0);
    await started;
    expect(m.calls()).toBe(1);
    expect(sources.map((s) => s.starts[0]!.offset)).toEqual([0, LOOP_START]);
    expect(p.onMissionTrack).toBe(false);
  });

  it('the press with the mission track ready cross-fades into it from 0, and it loops whole', async () => {
    const { audio, sources } = fakeAudio();
    const intro = buffer();
    const mission = buffer(GROHL);
    const p = new ScenePiano(audio, source(() => Promise.resolve(intro), () => Promise.resolve(mission)));
    await p.start();
    await flush();
    p.seek(SKIP_TO); // the intro skip: a plain seek
    expect(sources.length).toBe(4);
    expect(p.onMissionTrack).toBe(false);
    p.seek(EMP_AT); // the EMP press
    expect(p.onMissionTrack).toBe(true);
    expect(sources.length).toBe(6);
    const [a, b] = [sources[4]!, sources[5]!];
    expect(a.buffer).toBe(mission);
    expect(a.starts[0]!.offset).toBe(0);
    expect(b.buffer).toBe(mission);
    expect(b.starts[0]!.offset).toBe(0);
    expect(b.starts[0]!.at - a.starts[0]!.at).toBeCloseTo(missionLoopPeriod(GROHL), 9);
    // the intro legs fade out under it (stopped after the cross-fade)
    expect(sources[2]!.stops).toBe(1);
    expect(sources[3]!.stops).toBe(1);
    // the next leg after that: from 0 again, one period on
    a.onended?.();
    expect(sources.length).toBe(7);
    expect(sources[6]!.buffer).toBe(mission);
    expect(sources[6]!.starts[0]!.offset).toBe(0);
    expect(sources[6]!.starts[0]!.at - b.starts[0]!.at).toBeCloseTo(missionLoopPeriod(GROHL), 9);
  });

  it('never goes back: a later seek (a second press, the skip) does nothing', async () => {
    const { audio, sources } = fakeAudio();
    const p = new ScenePiano(audio, source(() => Promise.resolve(buffer()), () => Promise.resolve(buffer(GROHL))));
    await p.start();
    await flush();
    p.seek(EMP_AT);
    const n = sources.length;
    p.seek(EMP_AT);
    p.seek(SKIP_TO);
    p.seek(0);
    expect(sources.length).toBe(n);
    expect(p.onMissionTrack).toBe(true);
  });

  it('a press before the mission track is ready: the intro plays on, then it switches as soon as the track arrives', async () => {
    const { audio, sources } = fakeAudio();
    const m = pending();
    const mission = buffer(GROHL);
    const p = new ScenePiano(audio, source(() => Promise.resolve(buffer()), m.load));
    await p.start();
    p.seek(EMP_AT);
    expect(sources.length).toBe(2); // no seek in the intro track: it plays on
    expect(p.onMissionTrack).toBe(false);
    m.resolve(mission);
    await flush();
    expect(p.onMissionTrack).toBe(true);
    expect(sources.length).toBe(4);
    expect(sources[2]!.buffer).toBe(mission);
    expect(sources[2]!.starts[0]!.offset).toBe(0);
    expect(sources[0]!.stops).toBe(1);
  });

  it('the mission track arriving during the fade-out or after stop() plays nothing', async () => {
    const a = fakeAudio();
    const m1 = pending();
    const p = new ScenePiano(a.audio, source(() => Promise.resolve(buffer()), m1.load));
    await p.start();
    p.seek(EMP_AT);
    p.fadeOut(1);
    m1.resolve(buffer(GROHL));
    await flush();
    expect(a.sources.length).toBe(2);
    expect(p.onMissionTrack).toBe(false);
    p.stop();

    const b = fakeAudio();
    const m2 = pending();
    const q = new ScenePiano(b.audio, source(() => Promise.resolve(buffer()), m2.load));
    await q.start();
    q.seek(EMP_AT);
    q.stop();
    m2.resolve(buffer(GROHL));
    await flush();
    expect(b.sources.length).toBe(2);
    expect(q.active).toBe(false);
  });

  it('a failed mission load leaves the intro track playing', async () => {
    const { audio, sources } = fakeAudio();
    const p = new ScenePiano(audio, source(() => Promise.resolve(buffer()), () => Promise.reject(new Error('x'))));
    await p.start();
    await flush();
    p.seek(EMP_AT);
    expect(sources.length).toBe(2);
    expect(p.active).toBe(true);
    expect(p.onMissionTrack).toBe(false);
  });

  it('stop() frees both tracks: the next start() fetches both again and plays the intro from 0', async () => {
    const { audio, sources } = fakeAudio();
    let intros = 0;
    let missions = 0;
    const p = new ScenePiano(
      audio,
      source(
        () => (intros++, Promise.resolve(buffer())),
        () => (missions++, Promise.resolve(buffer(GROHL))),
      ),
    );
    await p.start();
    await flush();
    p.seek(EMP_AT);
    p.stop();
    expect(p.onMissionTrack).toBe(false);
    expect(sources.every((s) => s.stops >= 1)).toBe(true);
    const before = sources.length;
    await p.start();
    await flush();
    expect([intros, missions]).toEqual([2, 2]);
    expect(sources[before]!.starts[0]!.offset).toBe(0);
    expect(p.onMissionTrack).toBe(false);
  });

  it('?pianomusic=pixabay (no mission track): the press is S3s plain seek to 41 s in the intro track', async () => {
    const { audio, sources } = fakeAudio();
    const p = new ScenePiano(audio, source(() => Promise.resolve(buffer())));
    await p.start();
    p.seek(EMP_AT);
    expect(sources.length).toBe(4);
    expect(sources[2]!.starts[0]!.offset).toBe(41);
    expect(sources[3]!.starts[0]!.offset).toBe(LOOP_START);
    expect(p.onMissionTrack).toBe(false);
  });
});

describe('Music.scene: the director is muted while a scene is on', () => {
  /** A running fake context whose clock the test advances; `whenReady` never fires (no track is fetched). */
  function musicOn(): { music: Music; tick: (awareness: 'calm' | 'caution' | 'alert', seconds: number) => void } {
    const ctx = { currentTime: 0, state: 'running' };
    const audio = { ctx, whenReady: () => {}, unlock: () => {}, out: () => null } as unknown as AudioEngine;
    const music = new Music(audio);
    music.mission();
    return {
      music,
      tick: (awareness, seconds) => {
        for (let t = 0; t < seconds; t += 0.1) {
          ctx.currentTime += 0.1;
          music.update(0.1, awareness);
        }
      },
    };
  }

  it('without a scene the guards being alert moves the director off Calm', () => {
    const { music, tick } = musicOn();
    tick('alert', 20);
    expect(music.state).not.toBe('calm');
  });

  it('with a scene on, alert guards leave it in Calm (silence); it survives a checkpoint calm()', () => {
    const { music, tick } = musicOn();
    music.scene(true);
    expect(music.sceneActive).toBe(true);
    tick('alert', 30);
    expect(music.state).toBe('calm');
    music.calm();
    tick('alert', 30);
    expect(music.state).toBe('calm');
  });

  it('scene(false) hands the score back; leaving (stop / menu) ends a scene too', () => {
    const { music, tick } = musicOn();
    music.scene(true);
    music.scene(false);
    expect(music.sceneActive).toBe(false);
    music.mission();
    tick('alert', 20);
    expect(music.state).not.toBe('calm');
    music.scene(true);
    music.stop();
    expect(music.sceneActive).toBe(false);
    expect(music.piano.active).toBe(false);
  });
});
