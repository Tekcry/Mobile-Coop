/**
 * (piano-escape S5) The scene music A/B: nine tracks under `src/assets/music/scene/`, one chosen by the dev param
 * `?pianomusic=pixabay|grohl|1|2|3|4|a|b|c` (default `pixabay`, S3's "Investigation Piano"; an unknown value is the default).
 * `scenePiano.ts` takes its URL and its loop start from here (the one seam). Credits: docs/audio-credits.md.
 *
 * Each file is reached by its own dynamic `import()` of its `?url`, so only the chosen one is ever fetched (none is at
 * page load, none is in the offline cache: `PRECACHE_IGNORES`). Nothing here touches the audio context.
 */

export type SceneTrackId = 'pixabay' | 'grohl' | '1' | '2' | '3' | '4' | 'a' | 'b' | 'c';

export interface SceneTrack {
  id: SceneTrackId;
  name: string;
  /** Length (s) as measured (ffprobe); the decoded buffer's own duration is what plays. */
  length: number;
  /** The bundled file's URL, by dynamic import (only now is the file requested). */
  url: () => Promise<string>;
}

/** The default track. */
export const DEFAULT_SCENE_TRACK: SceneTrackId = 'pixabay';
/** The loop jumps back here (s) when the track is long enough (S3's point: the first swell after the intro). */
export const SCENE_LOOP_START = 41;
/** A track at least this long (s) loops from `SCENE_LOOP_START`; a shorter one loops whole, from 0. */
export const MIN_LENGTH_FOR_LOOP_POINT = 120;

export const SCENE_TRACKS: readonly SceneTrack[] = [
  { id: 'pixabay', name: 'Investigation Piano (Leberch, Pixabay)', length: 134.03, url: async () => (await import('../../assets/music/scene/piano-escape.mp3?url')).default },
  { id: 'grohl', name: 'Suspense Thriller (Alex Grohl, Pixabay)', length: 162.04, url: async () => (await import('../../assets/music/scene/alexgrohl-suspense-thriller-552495.mp3?url')).default },
  { id: '1', name: 'Sketch 1: Held Breath (piano, D minor)', length: 83.78, url: async () => (await import('../../assets/music/scene/sketch-1-held-breath.mp3?url')).default },
  { id: '2', name: 'Sketch 2: Thornbeck (piano, A minor)', length: 93.5, url: async () => (await import('../../assets/music/scene/sketch-2-thornbeck.mp3?url')).default },
  { id: '3', name: 'Sketch 3: Last Round (piano, C minor)', length: 78, url: async () => (await import('../../assets/music/scene/sketch-3-last-round.mp3?url')).default },
  { id: '4', name: 'Sketch 4: Pulse (electronic)', length: 96.43, url: async () => (await import('../../assets/music/scene/sketch-4-pulse.mp3?url')).default },
  { id: 'a', name: 'A: Clockwork (Grohl form)', length: 163, url: async () => (await import('../../assets/music/scene/grohl-a-clockwork.mp3?url')).default },
  { id: 'b', name: 'B: Storm Piano (Grohl form)', length: 163, url: async () => (await import('../../assets/music/scene/grohl-b-storm-piano.mp3?url')).default },
  { id: 'c', name: 'C: Heartbeat (Grohl form)', length: 163, url: async () => (await import('../../assets/music/scene/grohl-c-heartbeat.mp3?url')).default },
];

/** The track a `?pianomusic=` value names (case and spaces ignored); null, empty or unknown is the default. */
export function parseSceneTrack(value: string | null | undefined): SceneTrackId {
  const v = (value ?? '').trim().toLowerCase();
  return SCENE_TRACKS.find((t) => t.id === v)?.id ?? DEFAULT_SCENE_TRACK;
}

/** The track a page's query string chose (`?pianomusic=...`). */
export function sceneTrackFromSearch(search: string): SceneTrackId {
  try {
    return parseSceneTrack(new URLSearchParams(search).get('pianomusic'));
  } catch {
    return DEFAULT_SCENE_TRACK;
  }
}

export function sceneTrack(id: SceneTrackId): SceneTrack {
  return SCENE_TRACKS.find((t) => t.id === id) ?? SCENE_TRACKS[0]!;
}

/**
 * Where a track of `length` s loops back to: 41.0 s (with the 2 s cross-fade) when it is long enough to have a body past
 * the intro, else the whole track from 0 (the same 2 s cross-fade, end into start).
 */
export function loopStartFor(length: number): number {
  return Number.isFinite(length) && length >= MIN_LENGTH_FOR_LOOP_POINT ? SCENE_LOOP_START : 0;
}

/** The chosen track's URL (`?pianomusic=`, default S3's track), fetched by its own dynamic import. */
export function sceneTrackUrl(search: string = globalThis.location?.search ?? ''): Promise<string> {
  return sceneTrack(sceneTrackFromSearch(search)).url();
}
