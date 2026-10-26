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
  /** (campus-greybox A28) Sector Ops, dev and walk links (`?sectorStart=N`, N 1-9): every run on the page starts at section
   *  N as its connectors leave it, a practice run (nothing saved); null when absent. The co-op host's link wins. */
  sectorStart: number | null;
  /** Music project: `?musiclab=1` opens the music lab (a debug screen) after boot. */
  musicLab: boolean;
  /** `?foleylab=1` opens the foley lab (movement sounds, a debug screen) after boot. */
  foleyLab: boolean;
  /** `?weaponlab=1` opens the weapon lab (gun sounds, a debug screen) after boot. */
  weaponLab: boolean;
  /** Sector Ops, dev and tests (`?sectorGuards=N`): at most N guards per section spawn (alarm reinforcements on top). */
  sectorGuards: number | null;
  /** (mocap-trial) `?mocap=1` / `?mocap=0`: the mocap locomotion clips on / off for this page, over the stored setting
   *  (Settings > Gameplay > "Mocap locomotion"); null when the page names none. */
  mocap: boolean | null;
  /** (mixamo-retarget I2) `?mixamo=1` / `?mixamo=0`: the Mixamo traversal captures on Wren (hang, shimmy, climb-up, ladder,
   *  vent crawl; `src/anim/mixamo.ts`); null when the page names none =
   *  off, on /preview/ on (preview-flags: `setMixamo(flags.mixamo ?? PREVIEW_ON)`). */
  mixamo: boolean | null;
  /** (guard-render S1) Guards draw as one merged smooth mesh each (`SmoothBody`); `?guardmerge=0`: the parts, for comparisons. */
  guardMerge: boolean;
  /** (guard-models G7, A10) Guards draw as the operator-pipeline figure (`src/ai/guardBody.ts`); `?guardmodels=0` keeps
   *  the merged S1 body (comparisons, and the fallback while a guard's files load). DEFAULT OFF on the guard-models
   *  branch until G8 measures (`?guardmodels=1` turns it on); G8 flips the default. On /preview/ default on
   *  (preview-flags). */
  guardModels: boolean;
  /** (guard-render S4) Guard anim tiers (off-screen every `ANIM_TIER_OFFSCREEN` th frame, far every 2nd:
   *  `src/ai/animTier.ts`); `?animtier=0` off. */
  animTier: boolean;
  /** (guard-cap T1-SHADOW, A195) Shadow-in-view counts as seen: a guard out of view whose shadow can fall in it animates
   *  at full rate (`src/ai/animTierView.ts`); `?animshadow=0` off, for A/B. */
  animShadow: boolean;
  /** (guard-cap T1-SHADOW) Dev A/B: the off-screen tier's period, `?animoff=N` (0 = `ANIM_TIER_OFFSCREEN`). */
  animOff: number;
  /** (guard-render S6) Per-cascade sun caster lists and the guards' sun reach; `?guardsun=0`: off, for comparisons. */
  guardSun: boolean;
  /** (sector-redesign perf) Sector Ops guards whose body and shadows cannot reach the screen skip the render
   *  (`sectorGuardFreeze.ts`); `?guardfreeze=0`: off, for comparisons. */
  guardFreeze: boolean;
  /** (J14 Marlow re-plan, owner Marlow Build, switch-on 2026-10-29) `?marlowreplan=1`: a host's room opens on the re-planned
   *  yard (map `ctcourseReplan`); the client loads whatever map the host names. Default off: `ctcourse` is unchanged.
   *  On /preview/ default on (preview-flags). */
  marlowReplan: boolean;
  /** (char-shadow-meter, J16) Character shadows in the light meter and the guards' light (`world/charOccluders.ts`);
   *  `?charlight=1` on. DEFAULT OFF until Michael's walk (owner Sector Ops Build; switch-on: BRIEF A9). On /preview/
   *  default on (preview-flags). */
  charShadowLight: boolean;
  /** (map-ready, `docs/map-ready/PLAN.md`; owner Night Shift | Sector Ops Build; switch-on after Michael's Sector Ops
   *  and Marlow Yard walks, target 2026-11-01) The loading screen waits for a built and warmed map, the campus lamps
   *  ship pre-built, the costly parts are kept between matches, the lobby preloads. `?mapready=1` on; default off.
   *  On /preview/ default on (preview-flags). */
  mapReady: boolean;
  /** (campus-greybox; owner Sector Ops Build) The Saltmarsh Park sections (1-5) built from their v2 layouts
   *  (`src/world/maps/campusV2/`) instead of the live ones. Default `CAMPUS_V2_ON` (none: production unchanged); a
   *  section joins it when Michael accepts its walk. `?campusv2=1,3`: exactly those sections; `?campusv2=0`: none. Every
   *  co-op peer must open the same link (the layout is not on the wire).
   *  On /preview/ every section (preview-flags). */
  campusV2: readonly number[];
}

/** (campus-greybox) The campus sections switched on to their v2 layouts by default: a section number joins this list
 *  when Michael accepts that section's walk (switch-on; the date goes in the PR body and the ROADMAP). */
export const CAMPUS_V2_ON: readonly number[] = [];

/** (campus-greybox) `?campusv2=` as a sorted section list (1-5); absent or unreadable: the default. "0" means none.
 *  On /preview/ (preview-flags) the default is every section. */
export function readCampusV2(v: string | null, preview = false): readonly number[] {
  if (v === null || !/^[0-5](,[0-5])*$/.test(v)) return preview ? CAMPUS_V2_ALL : CAMPUS_V2_ON;
  return [...new Set(v.split(',').map(Number))].filter((n) => n > 0).sort((a, b) => a - b);
}

/** (mocap-trial) An on / off URL value: "1" true, "0" false, anything else (or absent) null. */
export function onOffFlag(v: string | null): boolean | null {
  return v === '1' ? true : v === '0' ? false : null;
}

/** (preview-flags, Michael 2026-10-26 ~13:55 "All on in preview") The /preview/ build: every dark feature flag
 *  defaults on there (a URL `=0` still turns one off). Not the named slots (`/ct/`), the live game, dev or tests
 *  (vitest defines neither constant). New feature flags read through `darkFlag(params.get(...), PREVIEW_ON)`. */
export const PREVIEW_ON: boolean =
  typeof __PREVIEW__ !== 'undefined' && __PREVIEW__ && (typeof __PREVIEW_ID__ === 'undefined' || __PREVIEW_ID__ === '');

/** (preview-flags) A dark feature flag's URL value: "1" on, "0" off, else the build's default (`preview`: on). */
export function darkFlag(v: string | null, preview: boolean): boolean {
  return v === '1' || (v !== '0' && preview);
}

/** (preview-flags) Every campus section, the /preview/ default for `campusV2`. */
export const CAMPUS_V2_ALL: readonly number[] = [1, 2, 3, 4, 5];

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
  sectorStart: /^[1-9]$/.test(params.get('sectorStart') ?? '') ? Number(params.get('sectorStart')) : null,
  musicLab: params.get('musiclab') === '1',
  foleyLab: params.get('foleylab') === '1',
  weaponLab: params.get('weaponlab') === '1',
  sectorGuards: /^\d{1,2}$/.test(params.get('sectorGuards') ?? '') ? Number(params.get('sectorGuards')) : null,
  mocap: onOffFlag(params.get('mocap')),
  mixamo: onOffFlag(params.get('mixamo')),
  guardMerge: params.get('guardmerge') !== '0',
  // (guard-models G7) default off until G8's budget run: `?guardmodels=1` on; G8 makes it `!== '0'`
  guardModels: darkFlag(params.get('guardmodels'), PREVIEW_ON),
  animTier: params.get('animtier') !== '0',
  animShadow: params.get('animshadow') !== '0',
  animOff: Number(params.get('animoff')) | 0,
  guardSun: params.get('guardsun') !== '0',
  guardFreeze: params.get('guardfreeze') !== '0',
  marlowReplan: darkFlag(params.get('marlowreplan'), PREVIEW_ON),
  charShadowLight: darkFlag(params.get('charlight'), PREVIEW_ON),
  mapReady: darkFlag(params.get('mapready'), PREVIEW_ON),
  campusV2: readCampusV2(params.get('campusv2'), PREVIEW_ON),
};
