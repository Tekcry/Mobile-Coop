/**
 * (piano-escape S5) The scene music: two slots, each a list of bundled tracks under `src/assets/music/scene/`.
 * - intro: the track the intro plays from 0 (the skip seeks to 38 s). Dev param `?pianointro=`, default `pixabay`
 *   ("Investigation Piano", Leberch).
 * - mission: the track the EMP press cross-fades into, then loops whole. Dev param `?pianomusic=`, default `grohl`
 *   ("Suspense Thriller", Alex Grohl); `1` is "Held Breath"; `pixabay` (`MISSION_OFF`) is S3's behaviour, no mission track:
 *   the intro track plays on through the press and loops from its own loop point.
 * An unknown value is the slot's default. A new track for a slot is one more row in `SCENE_TRACKS` (its id joins
 * `SceneTrackId`). `scenePiano.ts` takes its loaders and loop points from here (the one seam). Credits:
 * docs/audio-credits.md.
 *
 * Each file is reached by its own dynamic `import()` of its `?url`, so only the chosen ones are ever fetched (none is at
 * page load, none is in the offline cache: `PRECACHE_IGNORES`). Nothing here touches the audio context.
 */

export type SceneSlot = 'intro' | 'mission';
export type SceneTrackId = 'pixabay' | 'grohl' | '1';

export interface SceneTrack {
  id: SceneTrackId;
  slot: SceneSlot;
  name: string;
  /** Length (s) as measured (ffprobe); the decoded buffer's own duration is what plays. */
  length: number;
  /** Where the track loops back to (s) when it nears its end (with the 2 s cross-fade); 0 = it loops whole. */
  loopFrom: number;
  /** The bundled file's URL, by dynamic import (only now is the file requested). */
  url: () => Promise<string>;
}

/** The intro's default track (S3's "Investigation Piano"). */
export const DEFAULT_INTRO_TRACK: SceneTrackId = 'pixabay';
/** The mission's default track (Michael ~21:50: "suspense thriller once in the mission"). */
export const DEFAULT_MISSION_TRACK: SceneTrackId = 'grohl';
/** `?pianomusic=` value for no mission track: the intro track plays on through the EMP press (S3's behaviour, for A/B). */
export const MISSION_OFF = 'pixabay';
/** S3's loop point in "Investigation Piano" (s): the first swell after the intro. */
export const SCENE_LOOP_START = 41;

export const SCENE_TRACKS: readonly SceneTrack[] = [
  { id: 'pixabay', slot: 'intro', name: 'Investigation Piano (Leberch, Pixabay)', length: 134.03, loopFrom: SCENE_LOOP_START, url: async () => (await import('../../assets/music/scene/piano-escape.mp3?url')).default },
  { id: 'grohl', slot: 'mission', name: 'Suspense Thriller (Alex Grohl, Pixabay)', length: 162.04, loopFrom: 0, url: async () => (await import('../../assets/music/scene/alexgrohl-suspense-thriller-552495.mp3?url')).default },
  { id: '1', slot: 'mission', name: 'Sketch 1: Held Breath (piano, D minor)', length: 83.78, loopFrom: 0, url: async () => (await import('../../assets/music/scene/sketch-1-held-breath.mp3?url')).default },
];

const clean = (value: string | null | undefined): string => (value ?? '').trim().toLowerCase();

/** The slot's track a param value names (case and spaces ignored); null, empty, unknown or another slot's id is the default. */
export function parseSlotTrack(slot: SceneSlot, value: string | null | undefined): SceneTrackId {
  const v = clean(value);
  return SCENE_TRACKS.find((t) => t.slot === slot && t.id === v)?.id ?? (slot === 'intro' ? DEFAULT_INTRO_TRACK : DEFAULT_MISSION_TRACK);
}

/** The mission track a `?pianomusic=` value names, or null for `MISSION_OFF` (the intro track plays on). */
export function parseMissionTrack(value: string | null | undefined): SceneTrackId | null {
  return clean(value) === MISSION_OFF ? null : parseSlotTrack('mission', value);
}

/** What a page's query string chose: `?pianointro=` and `?pianomusic=`. */
export function sceneMusicFromSearch(search: string): { intro: SceneTrackId; mission: SceneTrackId | null } {
  try {
    const q = new URLSearchParams(search);
    return { intro: parseSlotTrack('intro', q.get('pianointro')), mission: parseMissionTrack(q.get('pianomusic')) };
  } catch {
    return { intro: DEFAULT_INTRO_TRACK, mission: DEFAULT_MISSION_TRACK };
  }
}

export function sceneTrack(id: SceneTrackId): SceneTrack {
  return SCENE_TRACKS.find((t) => t.id === id) ?? SCENE_TRACKS[0]!;
}
