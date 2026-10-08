/** Feature flags. URL params override defaults: ?coop=1&debug=1 */
export interface Flags {
  coop: boolean;
  debug: boolean;
  /** Skip menus and boot straight into a map (dev convenience). */
  autostart: string | null;
  /** Mode for autostart: sandbox | wave | mission. */
  mode: 'sandbox' | 'wave' | 'mission' | 'clear' | 'infiltration' | 'training' | null;
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
  /** Graphics override for this page (tests; not saved): 'min' = everything off at DPR 1, or a preset. */
  gfx: 'min' | 'low' | 'medium' | 'high' | 'ultra' | 'epic' | null;
  /** 3.0 voxel world (`?voxels=0`: the blockout's boxes, for comparisons). */
  voxels: boolean;
  /** 3.2 baked lamps (`?baked=0`: real lights and shadow maps, for comparisons). */
  baked: boolean;
  /** 3.6 Phase 1 Step 3, under evaluation: `?fill=grid` - desktop fill from the ambient grid (gameplay's) instead of
   *  the sky bake. */
  fillGrid: boolean;
  /** 3.3 phones: `?lampvol=0` the exact per-lamp loop instead of the light volume (comparisons). */
  lampVolume: boolean;
  /** Autostart weather (clear | rain | fog). */
  weather: 'clear' | 'rain' | 'fog' | null;
  /** 3.1: Auto graphics detection also under automation (`?detect=1`; tests otherwise keep their settings). */
  detect: boolean;
  /** Tests: the GPU name detection sees (`?renderer=Apple%20GPU`). */
  renderer: string | null;
  /** Tests: the speed gear at spawn and respawn (`?gear=1..6`; else the default, 3). */
  gear: number | null;
  /** 3.5 (`?legacy=1`, URL only, never saved): the parked Blacklist-era modes and the economy are shown (`core/legacy.ts`). */
  legacy: boolean;
}

function readParams(): URLSearchParams {
  try {
    return new URLSearchParams(globalThis.location?.search ?? '');
  } catch {
    return new URLSearchParams();
  }
}

const params = readParams();

export const flags: Flags = {
  coop: params.get('coop') !== '0',
  debug: params.get('debug') === '1',
  autostart: params.get('autostart'),
  // Hunter is the 2.0 name for Clear (both work)
  mode: params.get('mode') === 'hunter' ? 'clear' : ((['sandbox', 'wave', 'mission', 'clear', 'infiltration', 'training'] as const).find((m) => m === params.get('mode')) ?? null),
  mission: params.get('mission'),
  loadout: params.get('loadout')?.split(',').filter(Boolean) ?? null,
  insertion: params.get('insertion'),
  difficulty: params.get('difficulty'),
  room: params.get('room'),
  net: params.get('net') === 'local' ? 'local' : 'webrtc',
  gfx: (['min', 'low', 'medium', 'high', 'ultra', 'epic'] as const).find((g) => g === params.get('gfx')) ?? null,
  voxels: params.get('voxels') !== '0',
  baked: params.get('baked') !== '0',
  fillGrid: params.get('fill') === 'grid',
  lampVolume: params.get('lampvol') !== '0',
  weather: (['clear', 'rain', 'fog'] as const).find((w) => w === params.get('weather')) ?? null,
  detect: params.get('detect') === '1',
  renderer: params.get('renderer')?.slice(0, 96) ?? null,
  gear: /^[1-6]$/.test(params.get('gear') ?? '') ? Number(params.get('gear')) : null,
  legacy: params.get('legacy') === '1',
};
