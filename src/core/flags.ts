/** Feature flags. URL params override defaults: ?coop=1&debug=1 */
export interface Flags {
  coop: boolean;
  debug: boolean;
  /** Skip menus and boot straight into a map (dev convenience). */
  autostart: string | null;
  /** Mode for autostart. `course` with `?net=local` hosts / joins a same-device co-op room (`autoLocalCourse`). */
  mode: 'sandbox' | 'mission' | 'clear' | 'infiltration' | 'course' | 'sector' | null;
  /** Infiltration: mission id and insertion id for autostart. */
  mission: string | null;
  insertion: string | null;
  /** Autostart loadout (comma-separated weapon ids; tests). */
  loadout: string[] | null;
  /** Difficulty for autostart (rookie | normal | realistic | perfectionist). */
  difficulty: string | null;
  /** Coop room code from a share link (?room=CODE). */
  room: string | null;
  /** Coop transport: 'local' = BroadcastChannel between tabs (tests), default WebRTC. */
  net: 'local' | 'webrtc';
  /** Graphics override for this page (tests; not saved): 'min' = everything off at DPR 1, or a preset. A phone gets
   *  'min' unless the page names one (G182). */
  gfx: 'min' | 'low' | 'medium' | 'high' | 'ultra' | 'epic' | null;
  /** (G182) A phone or tablet (touch as the main pointer): testing only; minimum settings, a small-screen UI scale. */
  phone: boolean;
  /** Voxel world, characters and weapons (smooth-world: off by default, the blockout's pieces draw smooth in PBR with
   *  the surface atlas; `?voxels=1` turns the 3.0 voxel look on for comparisons, `?voxels=0` stays off). */
  voxels: boolean;
  /** 3.2 baked lamps (`?baked=0`: real lights and shadow maps, for comparisons). */
  baked: boolean;
  /** Autostart weather (clear | rain | fog). */
  weather: 'clear' | 'rain' | 'fog' | null;
  /** 3.1: Auto graphics detection also under automation (`?detect=1`; tests otherwise keep their settings). */
  detect: boolean;
  /** Tests: the GPU name detection sees (`?renderer=Apple%20GPU`). */
  renderer: string | null;
  /** Tests: the internal speed cap at spawn and respawn (`?gear=1..5`; else 5, no cap: anim-rework S1). */
  gear: number | null;
  /** 3.5 (`?legacy=1`, URL only, never saved): the parked Blacklist-era modes and the economy are shown (`core/legacy.ts`). */
  legacy: boolean;
  /** Dev / hand checks (`?fullbright=1`): the map is lit like day (theme light level, hemisphere, sun, gameplay light). Nothing changes without it. */
  fullbright: boolean;
  /** Dev only (the level editor's walk test, `?editorDraft=1`): build the Kestrel map from the editor's unsaved campus. Always false in production. */
  devDraft: boolean;
  /** Dev only (`?spawn=x,z,level,yaw`, yaw in radians): where the editor's walk test starts the player. */
  spawn: { x: number; z: number; level: string; yaw: number } | null;
  /** Music project: `?musiclab=1` opens the music lab (a debug screen) after boot. */
  musicLab: boolean;
  /** `?foleylab=1` opens the foley lab (movement sounds, a debug screen) after boot. */
  foleyLab: boolean;
  /** `?weaponlab=1` opens the weapon lab (gun sounds, a debug screen) after boot. */
  weaponLab: boolean;
  /** Sector Ops, dev and tests (`?sectorGuards=N`): at most N guards per section spawn (alarm reinforcements on top). */
  sectorGuards: number | null;
}

function readParams(): URLSearchParams {
  try {
    return new URLSearchParams(globalThis.location?.search ?? '');
  } catch {
    return new URLSearchParams();
  }
}

const params = readParams();

/** (G182) A phone or tablet: a touch screen as the main pointer. Launch for testing only: the Low preset at native
 * resolution, a 1.0 render scale and a 60 fps cap (phone-min: basic lamp light and shadows, kept cool). */
function readPhone(): boolean {
  try {
    return (globalThis.navigator?.maxTouchPoints ?? 0) > 0 && globalThis.matchMedia?.('(pointer: coarse)').matches === true;
  } catch {
    return false;
  }
}

function readSpawn(v: string | null): Flags['spawn'] {
  const p = v?.split(',') ?? [];
  if (p.length !== 4) return null;
  const [x, z, yaw] = [Number(p[0]), Number(p[1]), Number(p[3])];
  return Number.isFinite(x) && Number.isFinite(z) && Number.isFinite(yaw) && /^[A-Za-z0-9_-]{1,8}$/.test(p[2]!) ? { x, z, level: p[2]!, yaw } : null;
}

export const flags: Flags = {
  coop: params.get('coop') !== '0',
  debug: params.get('debug') === '1',
  autostart: params.get('autostart'),
  // Hunter is the 2.0 name for Clear (both work)
  mode: params.get('mode') === 'hunter' ? 'clear' : ((['sandbox', 'mission', 'clear', 'infiltration', 'course', 'sector'] as const).find((m) => m === params.get('mode')) ?? null),
  mission: params.get('mission'),
  loadout: params.get('loadout')?.split(',').filter(Boolean) ?? null,
  insertion: params.get('insertion'),
  difficulty: params.get('difficulty'),
  room: params.get('room'),
  net: params.get('net') === 'local' ? 'local' : 'webrtc',
  phone: readPhone(),
  gfx: (['min', 'low', 'medium', 'high', 'ultra', 'epic'] as const).find((g) => g === params.get('gfx')) ?? (readPhone() ? 'low' : null),
  voxels: params.get('voxels') === '1',
  baked: params.get('baked') !== '0',
  weather: (['clear', 'rain', 'fog'] as const).find((w) => w === params.get('weather')) ?? null,
  detect: params.get('detect') === '1',
  renderer: params.get('renderer')?.slice(0, 96) ?? null,
  gear: /^[1-5]$/.test(params.get('gear') ?? '') ? Number(params.get('gear')) : null,
  legacy: params.get('legacy') === '1',
  fullbright: params.get('fullbright') === '1',
  // (the DEV test first: the production build drops the parameter name and the whole read)
  devDraft: import.meta.env.DEV && params.get('editorDraft') === '1',
  spawn: import.meta.env.DEV ? readSpawn(params.get('spawn')) : null,
  musicLab: params.get('musiclab') === '1',
  foleyLab: params.get('foleylab') === '1',
  weaponLab: params.get('weaponlab') === '1',
  sectorGuards: /^\d{1,2}$/.test(params.get('sectorGuards') ?? '') ? Number(params.get('sectorGuards')) : null,
};
