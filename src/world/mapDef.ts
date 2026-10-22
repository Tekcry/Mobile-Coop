import type { Vector3 } from '../core/babylon';
import type { LevelBuilder } from './levelBuilder';
import type { PropKind } from './props';
import type { RoomDef } from './rooms';
import type { Surface } from './surfaces';
import type { VoxelArt } from '../voxel/levelVoxels';
import type { SecurityData } from '../security/data';
import type { LaserDef } from '../game/jammer';
import type { LaserPanelDef } from '../game/laserPanels';
import type { PassZone } from '../game/ctDevices';
import type { ScannerDef } from '../game/scanners';
import type { CourseLayout } from '../game/course/courseDef';
import type { SectorDef } from '../game/sectors';
import type { GuardAiLayout } from '../ai/guardAiData';
import type { CamSize, CamSpace } from './camSpaces';

/** 3.0 weather choice (visual only): clear, rain (wet floors under the open sky, roofs keep it out), fog (light shafts). */
export type WeatherChoice = 'clear' | 'rain' | 'fog';
export const WEATHER_CHOICES: readonly WeatherChoice[] = ['clear', 'rain', 'fog'];

export interface MapTheme {
  sky: string;
  horizon: string;
  ground: string;
  fogStart: number;
  fogEnd: number;
  sunDir: [number, number, number];
  sunIntensity: number;
  ambient: number;
  /** Gameplay light level everywhere before any lamp (0 pitch dark .. 1; default 0.75, daylight): the
   *  light meter and enemy perception read it (`LightRegistry.ambient`). */
  lightLevel?: number;
  /** Floor surface where none is marked (default concrete). */
  floor?: Surface;
  /** Enemy faction colourway (default urban). */
  faction?: Faction;
  /** Weather (3.0, visual only; `vfx/weather.ts`): rain + wet floors, blown dust, heat haze. */
  weather?: 'rain' | 'dust' | 'haze';
  /** Colour grade (cinematic post): tint multiplier, saturation, contrast (defaults 1). */
  grade?: { tint?: [number, number, number]; saturation?: number; contrast?: number };
}

export type Faction = 'urban' | 'desert' | 'maritime';

export interface PropPlacement {
  kind: PropKind;
  pos: Vector3;
  yaw?: number;
}

/** Output of a map's procedural build: everything gameplay needs besides geometry. */
export interface MapLayout {
  playerSpawns: { pos: Vector3; yaw: number }[];
  enemySpawns: Vector3[];
  props: PropPlacement[];
  /** Mission objective sites (terminals, caches, extraction). */
  objectives: { id: string; pos: Vector3; kind: 'terminal' | 'cache' | 'extract' }[];
  /** Supply crates (ammo / health pickups). */
  pickups: { pos: Vector3; kind: 'ammo' }[];
  /** Wall medkit stations (G20 / G98; test maps so far): hold to heal, single use. `yaw` faces the room. */
  medkitWalls?: { pos: Vector3; yaw: number }[];
  /** Tagged rooms (HUD room tag, Clear mode, enemies holding rooms). */
  rooms?: RoomDef[];
  /** Light switches on walls (facing `yaw`): each turns a lamp circuit (`group`) on / off. */
  switches?: { pos: Vector3; yaw: number; group: number }[];
  /** Alarm panels on walls: an alerted enemy who reaches one calls reinforcements. `section` (Sector Ops): the panel
   *  works only while that section is live. */
  alarms?: { pos: Vector3; yaw: number; section?: number }[];
  /** Where a carried body can be hidden (in front of a container / locker). */
  hideSpots?: { pos: Vector3 }[];
  /** Where reinforcement squads come in. */
  reinforce?: Vector3[];
  /** (guard-ai) Zones, noisy things, reinforcement entries and squads; none = the whole map is one section. */
  guardAi?: GuardAiLayout;
  /**
   * Extra nav flood seeds (feet points): parts of the level joined to the spawn only by routes the nav grid does not
   * model (ropes, locked doors, one-way drops) are kept walkable. None: the spawn's region alone.
   */
  navSeeds?: Vector3[];
  /** Debug-menu teleport points (greybox maps): grouped, labelled, with the feet position and facing. */
  debugPoints?: { group: string; id: string; label: string; pos: Vector3; yaw: number }[];
  /** Security devices (Kestrel S0-S3): the match builds a `SecuritySystem` when present (cameras so far). */
  security?: SecurityData;
  /** (CT prototype B3) Laser devices: a break raises the alarm, never damage (sector-fixes C); infrared, drawn only in night vision; the held jammer switches one off. */
  lasers?: LaserDef[];
  /** (sector-fixes P) The lasers' power panels: each laser has exactly one; jamming a panel cuts every laser it powers
   *  (`game/laserPanels.ts`; `checkPanels` in the map tests). */
  laserPanels?: LaserPanelDef[];
  /** (CT prototype B3) Zones both players must fill to set a course flag (the camera pocket). */
  passZones?: PassZone[];
  /** (CT prototype B6) Paired scanners: both hacks in sync set a course flag. */
  scanners?: ScannerDef[];
  /** Training course (course mode): the definition and its ids on this level. */
  course?: CourseLayout;
  /** (G3) Camera spaces: the explore camera's open (2.8 m) or tight (1.8 m) framing by floor box, over the map default
   *  `camSize`; neither given: the camera's probes decide (`world/camSpaces.ts`). Local only. */
  camSpaces?: CamSpace[];
  camSize?: CamSize;
}

export interface MapDef {
  id: string;
  name: string;
  description: string;
  theme: MapTheme;
  /** Modes this map supports. */
  modes: ('mission' | 'sandbox' | 'clear' | 'infiltration' | 'course' | 'sector')[];
  /** Sector Ops (feature/sector-ops): the sectors in play order (maps that run the `sector` mode). */
  sectors?: readonly SectorDef[];
  build(b: LevelBuilder, seed: number): MapLayout;
  /** 3.0: the voxel art layer (what the pieces' voxels look like, visual-only dressing); none = plain voxels. */
  art?: VoxelArt;
  /** 3.0: weather the Play screen / lobby offers on this map (none: the theme's own). */
  weathers?: readonly WeatherChoice[];
  /** Walkable surfaces the nav grid keeps per column (default 3). Maps that stack more storeys raise it. */
  navLayers?: number;
  /**
   * ON0b: false turns the detail pass off (no generated skirting, conduits, junction boxes, vents, signs or floor
   * clutter at any tier, and none in the light-bake shapes, so light parity holds): everything on a wall is placed on
   * purpose. Default true.
   */
  detail?: boolean;
}
