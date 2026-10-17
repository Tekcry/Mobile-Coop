import type { Vector3 } from '../core/babylon';
import type { LevelBuilder } from './levelBuilder';
import type { PropKind } from './props';
import type { RoomDef } from './rooms';
import type { Surface } from './surfaces';
import type { VoxelArt } from '../voxel/levelVoxels';
import type { SecurityData } from '../security/data';
import type { CourseLayout } from '../game/course/courseDef';

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
  pickups: { pos: Vector3; kind: 'ammo' | 'medkit' }[];
  /** (locomotion step 15) Wall medkit stations (test maps): hold to take one kit, single use. `yaw` faces the room. */
  medkitWalls?: { pos: Vector3; yaw: number }[];
  /** Tagged rooms (HUD room tag, Clear mode, enemies holding rooms). */
  rooms?: RoomDef[];
  /** Light switches on walls (facing `yaw`): each turns a lamp circuit (`group`) on / off. */
  switches?: { pos: Vector3; yaw: number; group: number }[];
  /** Alarm panels on walls: an alerted enemy who reaches one calls reinforcements. */
  alarms?: { pos: Vector3; yaw: number }[];
  /** Where a carried body can be hidden (in front of a container / locker). */
  hideSpots?: { pos: Vector3 }[];
  /** Where reinforcement squads come in. */
  reinforce?: Vector3[];
  /**
   * Extra nav flood seeds (feet points): parts of the level joined to the spawn only by routes the nav grid does not
   * model (ropes, locked doors, one-way drops) are kept walkable. None: the spawn's region alone.
   */
  navSeeds?: Vector3[];
  /** Debug-menu teleport points (greybox maps): grouped, labelled, with the feet position and facing. */
  debugPoints?: { group: string; id: string; label: string; pos: Vector3; yaw: number }[];
  /** Security devices (Kestrel S0-S3): the match builds a `SecuritySystem` when present (cameras so far). */
  security?: SecurityData;
  /** Training course (course mode): the definition and its ids on this level. */
  course?: CourseLayout;
}

export interface MapDef {
  id: string;
  name: string;
  description: string;
  theme: MapTheme;
  /** Modes this map supports. */
  modes: ('mission' | 'sandbox' | 'clear' | 'infiltration' | 'course')[];
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
