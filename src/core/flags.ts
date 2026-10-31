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
  /** Tests (`?net=local` only, `&autojoin=1`): the `autoLocalCourse` tab joins the room as a client and never hosts. */
  autojoin: boolean;
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
  /** (piano SO5) Dev / hand checks (`?lightning=1`): any map plays the fixed demo lightning loop (`DEMO_LIGHTNING`)
   *  through its baked sky visibility. A map's own `lightning` data wins. Nothing changes without it. */
  lightning: boolean;
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
  /** (piano SO3) Dev and the GPU check (`?torchSlots=8`): the map's guard torch slots over its `MapDef.torchSlots`
   *  (`torches.torchSlotCount`: 4 or 8); null when absent. A co-op client needs the same parameter as its host. */
  torchSlots: number | null;
  /** (piano SO3) Dev and the GPU check (`?torchShadows=N`): only the first N torch slots get a shadow map, over
   *  `MapDef.torchShadows`; null when absent. A co-op client needs the same parameter as its host. */
  torchShadows: number | null;
  /** (piano SO3) Dev and the GPU check (`?torches=all`): every human guard's torch forced on at spawn
   *  (`Enemy.torchOverride`; a dog carries none). */
  torchesAll: boolean;
  /** (mocap-trial) `?mocap=1` / `?mocap=0`: the mocap locomotion clips on / off for this page, over the stored setting
   *  (Settings > Gameplay > "Mocap locomotion"); null when the page names none. */
  mocap: boolean | null;
  /** (mixamo-retarget I2) `?mixamo=1` / `?mixamo=0`: the Mixamo traversal captures on Wren (hang, shimmy, climb-up, ladder,
   *  vent crawl; `src/anim/mixamo.ts`); null when the page names none =
   *  off, on /preview/ on (preview-flags: `setMixamo(flags.mixamo ?? PREVIEW_ON)`). */
  mixamo: boolean | null;
  /** (mixamo-retarget Toggle) `?anim=hand|cmu|mixamo`: the Animation source for this page over the stored setting
   *  (Options > Gameplay > "Animation source", `src/anim/animSource.ts`); null when the page names none. */
  anim: 'hand' | 'cmu' | 'mixamo' | null;
  /** (guard-render S1) Guards draw as one merged smooth mesh each (`SmoothBody`); `?guardmerge=0`: the parts, for comparisons. */
  guardMerge: boolean;
  /** (guard-models G7, A10) Guards draw as the operator-pipeline figure (`src/ai/guardBody.ts`); `?guardmodels=0` keeps
   *  the merged S1 body (comparisons, and the fallback while a guard's files load). Default ON everywhere since gm-flip
   *  (the G8 gate passed after gm-perf, the gm-look fixes are baked; Michael ~23:55 2026-10-26 "Just switch them on"). */
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
  /** (guard-rules S6, A10, A11) Pairs that walk together check on each other at once; posted pairs talk and check.
   *  `?guardpairs=1`. DEFAULT OFF until walk item 5 (owner Guard AI Build, switch-on target 2026-10-29). On /preview/
   *  default on (preview-flags). */
  guardPairs: boolean;
  /** (guard-rules S7, A9) Lookout posts: never sent, never leave, radio a sighting. `?lookouts=1`. DEFAULT OFF until
   *  walk item 6 (owner Guard AI Build, switch-on target 2026-10-29). On /preview/ default on (preview-flags). */
  lookouts: boolean;
  /** (guard-rules S8, A12) Alarm stage dogs leave the heel for the last known position. `?dogrelease=1`. DEFAULT OFF
   *  until walk item 7 (owner Guard AI Build, switch-on target 2026-10-29). On /preview/ default on (preview-flags). */
  dogRelease: boolean;
  /** (J14 Marlow re-plan, owner Marlow Build, switch-on 2026-10-29) `?marlowreplan=1`: a host's room opens on the re-planned
   *  yard (map `ctcourseReplan`); the client loads whatever map the host names. Default off: `ctcourse` is unchanged.
   *  On /preview/ default on (preview-flags). */
  marlowReplan: boolean;
  /** (piano-escape, owner Campaign Build, review 2026-11-02) `?piano=1`: the piano escape scene (map `thornbeckMill`, `scene:
   *  'piano'`) joins `MAPS` and the main menu. Default off; on /preview/ default on (preview-flags). */
  pianoEscape: boolean;
  /** (guard-ai mill-hunt, owner Guard AI Build; switched on when Michael accepts it on his walk) `?millhunt=1`: the storm
   *  mill's guards hunt from the EMP (`src/ai/millHunt.ts`: searching for good, slow, groups of 2 at most, room by room
   *  along the players' route) instead of GA6's calm sweep. Default off; on /preview/ default on (preview-flags). */
  millHunt: boolean;
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
  /** (mission-framework, owner Campaign Build) Missions on Sector Ops maps (`?mission=<id>` picks one) and the Hints
   *  setting; `?missions=1` on. Switch-on: Michael's walk of Three Grey Coats / Two-Key Ledger, target 2026-10-27; then
   *  the default flips to `!== '0'`. Tests set `flags.missions` (a plain object) in `beforeAll` and restore it. On
   *  /preview/ default on (preview-flags). */
  missions: boolean;
  /** (mission-framework, owner Campaign Build) The co-op kit's new moves (pull-up, shutter, any later kit kind);
   *  `?coopkit=1` on, `?coopkit=0` off. Off keeps Marlow Yard as it is (M1). Switch-on: Michael's walk of the kit with
   *  Player Build's clips, target 2026-10-28. Tests set `flags.coopKit` in `beforeAll` and restore it. (coop-kit A1,
   *  BRIEF A8) Still the gate its readers use and a plain writable field; only its load value folds into `kitMoves`:
   *  on when `kitMoves` holds `pull` or `shutter` (so /preview/ turns it on through `KIT_BUILT`; `readCoopKit`).
   *  Campaign moves its readers onto the ids and removes this field in its own PR. */
  coopKit: boolean;
  /** (coop-kit A1, BRIEF A8; owner Player Build) The co-op kit moves switched on, by id (`KIT_BUILT`):
   *  `?kitmoves=descent,pull` exactly those, `all` every built id, `0` / `none` none; an id not built is dropped.
   *  Default: `KIT_MOVES_ON` (none) in the live game, every built id on /preview/ (preview-flags). `?coopkit=1` / `0`
   *  adds / removes `pull` and `shutter`. The host's rules and each page's offers read it (`has()` allocates nothing).
   *  Tests set `flags.kitMoves` in `beforeAll` and restore it. */
  kitMoves: ReadonlySet<string>;
  /** (context-prompts, `docs/context-prompts/PLAN.md` section 7; owner Night Shift | Player Build, switch-on at Michael's
   *  walk, target 2026-10-31) The context prompts: one button per action on the thing it acts on (tap / hold), in place
   *  of the hold-A list. `?ctxprompts=1` on, `?ctxprompts=0` off; default off. On /preview/ default on (preview-flags). */
  contextPrompts: boolean;
  /** (campaign-mode J22, BRIEF A10; owner Night Shift | Campaign Build, switch-on at Michael's walk of Mission 1) The
   *  campaign's front door and record: the lobby's Mission row (prologue, Mission 1), the briefing, the 0-100% rating,
   *  the `campaign:progress` / `campaign:save` records and Continue. `?campaign=1` on, `?campaign=0` off; default off.
   *  On /preview/ default on (preview-flags). The Mission 1 entries also need `flags.missions`. */
  campaign: boolean;
}

/** (coop-kit A1, BRIEF A8) Every kit move id that exists in the game (each slice adds its id in the PR that makes the
 *  move playable): A1's rope descent, Campaign's pull-up and shutter (PR #578, folded in from `coopKit`), (coop-kit K3)
 *  Chimney Pair (`chimneyPair`), K4's Swing Pass (`swingPass`), K1's Deadweight (`deadweight`), (coop-kit K5b) Plank
 *  Bridge (`plankBridge`). */
export const KIT_BUILT: readonly string[] = ['descent', 'pull', 'shutter', 'chimneyPair', 'swingPass', 'deadweight', 'plankBridge'];

/** (coop-kit A1) The kit ids on in the live game: an id joins this list when Michael accepts its walk (switch-on). */
export const KIT_MOVES_ON: readonly string[] = [];

/** (coop-kit A1) The ids `?coopkit=1` / `0` add / remove (Campaign's kit before the fold). */
const COOPKIT_IDS: readonly string[] = ['pull', 'shutter'];

/**
 * (coop-kit A1, BRIEF A8) `?kitmoves=` as the set of kit move ids on: a comma list (each matched to `KIT_BUILT` ignoring
 * case; an id not built is dropped), `all` every built id, `0` / `none` none. Absent or unreadable: every `KIT_BUILT` id
 * on /preview/ (`preview`), else `KIT_MOVES_ON`. `coopkit` (`?coopkit=`): `1` adds `pull` and `shutter`, `0` removes
 * them. Load time only (allocates).
 */
export function readKitMoves(v: string | null, preview = false, coopkit: string | null = null): ReadonlySet<string> {
  let ids: readonly string[];
  const low = v?.toLowerCase() ?? '';
  if (v === null || !/^[a-z0-9]+(,[a-z0-9]+)*$/.test(low)) ids = preview ? KIT_BUILT : KIT_MOVES_ON;
  else if (low === '0' || low === 'none') ids = [];
  else if (low === 'all') ids = KIT_BUILT;
  else {
    const want = low.split(',');
    ids = KIT_BUILT.filter((id) => want.includes(id.toLowerCase()));
  }
  const out = new Set(ids.filter((id) => KIT_BUILT.includes(id)));
  if (coopkit === '1') for (const id of COOPKIT_IDS) out.add(id);
  else if (coopkit === '0') for (const id of COOPKIT_IDS) out.delete(id);
  return out;
}

/** (coop-kit A1) `flags.coopKit`'s load value: `?coopkit=1` on, `0` off, else on when the kit set holds `pull` or
 *  `shutter`. */
export function readCoopKit(v: string | null, kit: ReadonlySet<string>): boolean {
  return v === '1' || (v !== '0' && (kit.has('pull') || kit.has('shutter')));
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
/** (coop-kit A1) The kit set, read once (`flags.kitMoves`; `flags.coopKit` loads from it). */
const kitMovesAtLoad = readKitMoves(params.get('kitmoves'), PREVIEW_ON, params.get('coopkit'));

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
  autojoin: params.get('net') === 'local' && params.get('autojoin') === '1',
  phone: readPhone(),
  gfx: (['min', 'low', 'medium', 'high', 'ultra', 'epic'] as const).find((g) => g === params.get('gfx')) ?? (readPhone() ? 'low' : null),
  baked: params.get('baked') !== '0',
  weather: (['clear', 'rain', 'fog'] as const).find((w) => w === params.get('weather')) ?? null,
  detect: params.get('detect') === '1',
  renderer: params.get('renderer')?.slice(0, 96) ?? null,
  gear: /^[1-5]$/.test(params.get('gear') ?? '') ? Number(params.get('gear')) : null,
  legacy: params.get('legacy') === '1',
  fullbright: params.get('fullbright') === '1',
  lightning: params.get('lightning') === '1',
  // (the DEV test first: the production build drops the parameter name and the whole read)
  devDraft: import.meta.env.DEV && params.get('editorDraft') === '1',
  spawn: import.meta.env.DEV ? readSpawn(params.get('spawn')) : null,
  sectorStart: /^[1-9]$/.test(params.get('sectorStart') ?? '') ? Number(params.get('sectorStart')) : null,
  musicLab: params.get('musiclab') === '1',
  foleyLab: params.get('foleylab') === '1',
  weaponLab: params.get('weaponlab') === '1',
  sectorGuards: /^\d{1,2}$/.test(params.get('sectorGuards') ?? '') ? Number(params.get('sectorGuards')) : null,
  torchSlots: /^\d{1,2}$/.test(params.get('torchSlots') ?? '') ? Number(params.get('torchSlots')) : null,
  torchShadows: /^\d{1,2}$/.test(params.get('torchShadows') ?? '') ? Number(params.get('torchShadows')) : null,
  torchesAll: params.get('torches') === 'all',
  mocap: onOffFlag(params.get('mocap')),
  mixamo: onOffFlag(params.get('mixamo')),
  anim: ((v) => (v === 'hand' || v === 'cmu' || v === 'mixamo' ? v : null))(params.get('anim')),
  guardMerge: params.get('guardmerge') !== '0',
  // (guard-models G7, gm-flip) default on: `?guardmodels=0` keeps the merged S1 body
  guardModels: params.get('guardmodels') !== '0',
  animTier: params.get('animtier') !== '0',
  animShadow: params.get('animshadow') !== '0',
  animOff: Number(params.get('animoff')) | 0,
  guardSun: params.get('guardsun') !== '0',
  guardFreeze: params.get('guardfreeze') !== '0',
  // (mission-framework FLG) dark until Michael's walks: `?missions=1` / `?coopkit=1` on; on /preview/ on (preview-flags)
  missions: darkFlag(params.get('missions'), PREVIEW_ON),
  // (coop-kit A1) the kit's list flag; `coopKit` stays Campaign's gate, its load value read from the list
  coopKit: readCoopKit(params.get('coopkit'), kitMovesAtLoad),
  kitMoves: kitMovesAtLoad,
  // (guard-rules F0) dark until their walk items are accepted (PLAN "Flags"): `=1` turns each on, /preview/ too
  guardPairs: darkFlag(params.get('guardpairs'), PREVIEW_ON),
  lookouts: darkFlag(params.get('lookouts'), PREVIEW_ON),
  dogRelease: darkFlag(params.get('dogrelease'), PREVIEW_ON),
  marlowReplan: darkFlag(params.get('marlowreplan'), PREVIEW_ON),
  pianoEscape: darkFlag(params.get('piano'), PREVIEW_ON),
  millHunt: darkFlag(params.get('millhunt'), PREVIEW_ON),
  charShadowLight: darkFlag(params.get('charlight'), PREVIEW_ON),
  mapReady: darkFlag(params.get('mapready'), PREVIEW_ON),
  campusV2: readCampusV2(params.get('campusv2'), PREVIEW_ON),
  contextPrompts: darkFlag(params.get('ctxprompts'), PREVIEW_ON),
  // (campaign-mode A10) dark until Michael's walk of Mission 1: `?campaign=1` on; on /preview/ on (preview-flags)
  campaign: darkFlag(params.get('campaign'), PREVIEW_ON),
};
