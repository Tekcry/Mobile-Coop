/**
 * (piano-escape S5, S5b) The scene music slots: `?pianointro=` / `?pianomusic=` parsing and their defaults, the track
 * table against the bundled folder, each track's loop point, and the chosen source reaching `ScenePiano` (nothing is
 * fetched, decoded or played).
 */
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { LOOP_START, sceneMusicSource } from '../src/audio/music/scenePiano';
import {
  DEFAULT_INTRO_TRACK,
  DEFAULT_MISSION_TRACK,
  MISSION_OFF,
  SCENE_LOOP_START,
  SCENE_TRACKS,
  parseMissionTrack,
  parseSlotTrack,
  sceneMusicFromSearch,
  sceneTrack,
} from '../src/audio/music/sceneTracks';

const SCENE_DIR = fileURLToPath(new URL('../src/assets/music/scene/', import.meta.url));

describe('scene tracks: the table', () => {
  it('names three tracks in two slots: Investigation Piano for the intro, Suspense Thriller (default) and Held Breath for the mission', () => {
    expect(SCENE_TRACKS.map((t) => `${t.slot}:${t.id}`)).toEqual(['intro:pixabay', 'mission:grohl', 'mission:1']);
    expect(DEFAULT_INTRO_TRACK).toBe('pixabay');
    expect(DEFAULT_MISSION_TRACK).toBe('grohl');
    expect(sceneTrack('grohl').length).toBe(162.04);
  });

  it('the intro track loops from S3s 41 s, the mission tracks whole', () => {
    expect(SCENE_LOOP_START).toBe(LOOP_START);
    expect(sceneTrack('pixabay').loopFrom).toBe(41);
    expect(sceneTrack('grohl').loopFrom).toBe(0);
    expect(sceneTrack('1').loopFrom).toBe(0);
  });

  it('each track has its own file in the scene folder, and every file there is a track', () => {
    const files = readdirSync(SCENE_DIR).filter((f) => f.endsWith('.mp3')).sort();
    expect(files).toEqual(['alexgrohl-suspense-thriller-552495.mp3', 'piano-escape.mp3', 'sketch-1-held-breath.mp3']);
    expect(readdirSync(SCENE_DIR).some((f) => f.endsWith('.wav'))).toBe(false);
    expect(files.length).toBe(SCENE_TRACKS.length);
  });
});

describe('scene tracks: ?pianointro= and ?pianomusic=', () => {
  it('no params: the Leberch intro, then Suspense Thriller', () => {
    for (const s of ['', '?', '?other=1', '?pianomusic=', '?pianointro=']) {
      expect(sceneMusicFromSearch(s)).toEqual({ intro: 'pixabay', mission: 'grohl' });
    }
  });

  it('?pianomusic= picks the mission track; pixabay is no mission track (S3s behaviour); unknown is the default', () => {
    expect(sceneMusicFromSearch('?pianomusic=grohl').mission).toBe('grohl');
    expect(sceneMusicFromSearch('?x=1&pianomusic=1&y=2').mission).toBe('1');
    expect(sceneMusicFromSearch('?pianomusic=%20GROHL%20').mission).toBe('grohl');
    expect(sceneMusicFromSearch('?pianomusic=pixabay')).toEqual({ intro: 'pixabay', mission: null });
    expect(sceneMusicFromSearch('?pianomusic=PixaBay').mission).toBeNull();
    expect(MISSION_OFF).toBe('pixabay');
    for (const v of ['2', '4', 'a', 'f', 'sketch-1', 'mission-1']) expect(parseMissionTrack(v), v).toBe('grohl');
    expect(parseMissionTrack(null)).toBe('grohl');
    expect(parseMissionTrack(undefined)).toBe('grohl');
  });

  it('?pianointro= picks the intro track; a mission id or unknown is the default', () => {
    expect(sceneMusicFromSearch('?pianointro=pixabay').intro).toBe('pixabay');
    expect(parseSlotTrack('intro', 'grohl')).toBe('pixabay');
    expect(parseSlotTrack('intro', '1')).toBe('pixabay');
    expect(parseSlotTrack('intro', 'intro-1')).toBe('pixabay');
    expect(parseSlotTrack('mission', 'pixabay')).toBe('grohl');
  });
});

describe('scene tracks: the source ScenePiano gets', () => {
  it('default: the intro loops from 41 s and there is a mission loader; pixabay: none', () => {
    const d = sceneMusicSource('');
    expect(d.introLoop).toBe(41);
    expect(d.mission).not.toBeNull();
    const old = sceneMusicSource('?pianomusic=pixabay');
    expect(old.introLoop).toBe(41);
    expect(old.mission).toBeNull();
    expect(sceneMusicSource('?pianomusic=1').mission).not.toBeNull();
  });
});
