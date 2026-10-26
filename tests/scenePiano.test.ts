/**
 * (piano-escape S3) The scene's piano: the loop / cross-fade / seek maths, the same-origin check, and the lifecycle on a
 * fake audio context (nothing is fetched or decoded: the track arrives through the injected loader).
 */
import { describe, expect, it } from 'vitest';
import type { AudioEngine } from '../src/audio/audioEngine';
import {
  CROSSFADE,
  LOOP_START,
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
  trackPosition,
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
const buffer = (): AudioBuffer => ({ duration: TRACK_LENGTH }) as AudioBuffer;

describe('scene piano: lifecycle', () => {
  it('fetches nothing until start(), then plays from 0 s with the next leg already scheduled at the loop', async () => {
    const { audio, sources } = fakeAudio();
    let loads = 0;
    const p = new ScenePiano(audio, () => {
      loads++;
      return Promise.resolve(buffer());
    });
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
    const p = new ScenePiano(audio, () => Promise.resolve(buffer()));
    const started = p.start();
    p.seek(SKIP_TO);
    await started;
    await p.start();
    expect(sources.length).toBe(2);
    expect(sources[0]!.starts[0]!.offset).toBe(SKIP_TO);
  });

  it('a seek while playing starts a new leg at that point and fades the old ones out', async () => {
    const { audio, sources } = fakeAudio();
    const p = new ScenePiano(audio, () => Promise.resolve(buffer()));
    await p.start();
    p.seek(SKIP_TO);
    expect(sources.length).toBe(4);
    expect(sources[2]!.starts[0]!.offset).toBe(SKIP_TO);
    expect(sources[0]!.stops).toBe(1);
    expect(sources[1]!.stops).toBe(1);
  });

  it('when a leg ends the leg after the next one is scheduled, one loop period on', async () => {
    const { audio, sources } = fakeAudio();
    const p = new ScenePiano(audio, () => Promise.resolve(buffer()));
    await p.start();
    sources[0]!.onended?.();
    expect(sources.length).toBe(3);
    expect(sources[2]!.starts[0]!.offset).toBe(LOOP_START);
    expect(sources[2]!.starts[0]!.at - sources[1]!.starts[0]!.at).toBeCloseTo(loopPeriod(), 9);
  });

  it('stop() silences everything; a stop while loading means nothing ever plays', async () => {
    const a = fakeAudio();
    const p = new ScenePiano(a.audio, () => Promise.resolve(buffer()));
    await p.start();
    p.stop();
    expect(p.active).toBe(false);
    expect(a.sources.every((s) => s.stops === 1)).toBe(true);
    expect(a.outs[0]!.connected).toBe(false);

    const b = fakeAudio();
    const q = new ScenePiano(b.audio, () => Promise.resolve(buffer()));
    const started = q.start();
    q.stop();
    await started;
    expect(b.sources.length).toBe(0);
    expect(q.active).toBe(false);
  });

  it('a failed load leaves it off', async () => {
    const { audio, sources } = fakeAudio();
    const p = new ScenePiano(audio, () => Promise.resolve(null));
    await p.start();
    expect(p.active).toBe(false);
    expect(sources.length).toBe(0);
  });
});
