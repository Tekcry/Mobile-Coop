/**
 * (storm-recording) The storm mill's real rain and thunder: one rain-on-a-roof loop and three thunder clips, bundled
 * under `src/assets/sfx/storm/` (credits: docs/audio-credits.md). Each file is reached by a dynamic `import()` of its
 * `?url`, so nothing is fetched at page load; none is in the offline cache (`PRECACHE_IGNORES`, `storm-*.mp3`). The
 * files load when the scene's storm starts (same origin, fetch + decodeAudioData, never a CDN). Any file that fails
 * stays null and `sceneStorm.ts` runs its WebAudio synthesis for that part (the rain bed, the thunder roll).
 */

/** The decoded recordings: `rain` null or a `thunder` slot null means "use the synthesis for it". */
export interface StormClips {
  rain: AudioBuffer | null;
  thunder: (AudioBuffer | null)[];
}

/** How many thunder clips are bundled (the pick in `sceneStorm.ts` is over this many). */
export const THUNDER_CLIP_COUNT = 3;

/** Decode at 32 kHz: plenty for rain and thunder, a third less memory than 48 kHz (as the scene music). */
const DECODE_RATE = 32000;

const RAIN_URL = async (): Promise<string> => (await import('../assets/sfx/storm/storm-rain-roof-loop.mp3?url')).default;
const THUNDER_URLS: readonly (() => Promise<string>)[] = [
  async () => (await import('../assets/sfx/storm/storm-thunder-1.mp3?url')).default,
  async () => (await import('../assets/sfx/storm/storm-thunder-2.mp3?url')).default,
  async () => (await import('../assets/sfx/storm/storm-thunder-3.mp3?url')).default,
];

/** The bundled file's URL is only fetched from the page's own origin. */
function sameOrigin(url: string): boolean {
  try {
    return new URL(url, location.href).origin === new URL(location.href).origin;
  } catch {
    return false;
  }
}

/** One bundled file, fetched and decoded; null if anything fails. */
async function load(url: () => Promise<string>): Promise<AudioBuffer | null> {
  try {
    const u = await url();
    if (!sameOrigin(u)) throw new Error('storm clip: not same origin');
    const res = await fetch(u);
    if (!res.ok) throw new Error(`storm clip: HTTP ${res.status}`);
    return await new OfflineAudioContext(1, 1, DECODE_RATE).decodeAudioData(await res.arrayBuffer());
  } catch (e) {
    console.warn('storm clip', e);
    return null;
  }
}

/** Fetch and decode the rain loop and the thunder clips (in parallel). Never rejects. */
export async function loadStormClips(): Promise<StormClips> {
  const [rain, ...thunder] = await Promise.all([load(RAIN_URL), ...THUNDER_URLS.map((u) => load(u))]);
  return { rain, thunder };
}
