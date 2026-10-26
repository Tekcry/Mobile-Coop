/**
 * (piano-escape S5) The scene music A/B: `?pianomusic=` parsing and its default, the loop rule per track length, the
 * track table against the bundled folder, and the loop start reaching `ScenePiano` (on a fake audio context; nothing is
 * fetched, decoded or played).
 */
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { AudioEngine } from '../src/audio/audioEngine';
import { CROSSFADE, LOOP_START, ScenePiano } from '../src/audio/music/scenePiano';
import {
  DEFAULT_SCENE_TRACK,
  MIN_LENGTH_FOR_LOOP_POINT,
  SCENE_LOOP_START,
  SCENE_TRACKS,
  loopStartFor,
  parseSceneTrack,
  sceneTrack,
  sceneTrackFromSearch,
  type SceneTrackId,
} from '../src/audio/music/sceneTracks';

const SCENE_DIR = fileURLToPath(new URL('../src/assets/music/scene/', import.meta.url));

describe('scene tracks: ?pianomusic=', () => {
  it('names nine tracks; the default is the Pixabay one (S3)', () => {
    expect(SCENE_TRACKS.map((t) => t.id)).toEqual(['pixabay', 'grohl', '1', '2', '3', '4', 'a', 'b', 'c']);
    expect(DEFAULT_SCENE_TRACK).toBe('pixabay');
  });

  it('reads every value', () => {
    for (const t of SCENE_TRACKS) expect(sceneTrackFromSearch(`?pianomusic=${t.id}`)).toBe(t.id);
    expect(sceneTrackFromSearch('?x=1&pianomusic=grohl&y=2')).toBe('grohl');
    expect(sceneTrackFromSearch('?pianomusic=B')).toBe('b');
    expect(sceneTrackFromSearch('?pianomusic=%20PIXABAY%20')).toBe('pixabay');
  });

  it('no param, empty or unknown is the default', () => {
    for (const s of ['', '?', '?other=1', '?pianomusic=', '?pianomusic=5', '?pianomusic=d', '?pianomusic=sketch-1']) {
      expect(sceneTrackFromSearch(s)).toBe('pixabay');
    }
    expect(parseSceneTrack(null)).toBe('pixabay');
    expect(parseSceneTrack(undefined)).toBe('pixabay');
    expect(sceneTrack('4').id).toBe('4');
  });

  it('each track has its own file in the scene folder, and every file there is a track', () => {
    const files = readdirSync(SCENE_DIR).filter((f) => f.endsWith('.mp3')).sort();
    expect(files).toEqual([
      'alexgrohl-suspense-thriller-552495.mp3',
      'grohl-a-clockwork.mp3',
      'grohl-b-storm-piano.mp3',
      'grohl-c-heartbeat.mp3',
      'piano-escape.mp3',
      'sketch-1-held-breath.mp3',
      'sketch-2-thornbeck.mp3',
      'sketch-3-last-round.mp3',
      'sketch-4-pulse.mp3',
    ]);
    expect(readdirSync(SCENE_DIR).some((f) => f.endsWith('.wav'))).toBe(false);
    expect(files.length).toBe(SCENE_TRACKS.length);
  });
});

describe('scene tracks: loop rule', () => {
  it('uses the same 41 s point as S3', () => {
    expect(SCENE_LOOP_START).toBe(LOOP_START);
  });

  it('a long track loops from 41 s, a short one whole from 0', () => {
    expect(loopStartFor(134.03)).toBe(41);
    expect(loopStartFor(162.04)).toBe(41);
    expect(loopStartFor(163)).toBe(41);
    expect(loopStartFor(MIN_LENGTH_FOR_LOOP_POINT)).toBe(41);
    expect(loopStartFor(MIN_LENGTH_FOR_LOOP_POINT - 0.01)).toBe(0);
    expect(loopStartFor(96.43)).toBe(0);
    expect(loopStartFor(93.5)).toBe(0);
    expect(loopStartFor(83.78)).toBe(0);
    expect(loopStartFor(78)).toBe(0);
    expect(loopStartFor(0)).toBe(0);
    expect(loopStartFor(Number.NaN)).toBe(0);
  });

  it('per track, from its measured length', () => {
    const want: Record<SceneTrackId, number> = { pixabay: 41, grohl: 41, '1': 0, '2': 0, '3': 0, '4': 0, a: 41, b: 41, c: 41 };
    for (const t of SCENE_TRACKS) expect(loopStartFor(t.length), t.id).toBe(want[t.id]);
  });
});

// ------------------------------------------------------------------ the seam in ScenePiano

class FakeNode {
  gain = { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, setValueCurveAtTime() {}, cancelScheduledValues() {} };
  buffer: unknown = null;
  starts: { at: number; offset: number }[] = [];
  onended: (() => void) | null = null;
  connect(): void {}
  disconnect(): void {}
  start(at: number, offset: number): void {
    this.starts.push({ at, offset });
  }
  stop(): void {}
}
function fakeAudio(): { audio: AudioEngine; sources: FakeNode[] } {
  const sources: FakeNode[] = [];
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
  const audio = { ctx, whenReady: (fn: () => void) => fn(), out: () => new FakeNode() } as unknown as AudioEngine;
  return { audio, sources };
}

describe('scene tracks: the loop start reaches the player', () => {
  it('a 162 s track loops back to 41 s, a 78 s track to 0', async () => {
    for (const [length, start] of [[162, 41], [78, 0]] as const) {
      const { audio, sources } = fakeAudio();
      const p = new ScenePiano(audio, () => Promise.resolve({ duration: length } as AudioBuffer));
      await p.start();
      expect(sources[0]!.starts[0]!.offset).toBe(0);
      expect(sources[1]!.starts[0]!.offset).toBe(start);
      expect(sources[1]!.starts[0]!.at - sources[0]!.starts[0]!.at).toBeCloseTo(length - CROSSFADE, 9);
      p.stop();
    }
  });
});
