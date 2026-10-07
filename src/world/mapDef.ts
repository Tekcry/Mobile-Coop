import type { Vector3 } from '../core/babylon';
import type { LevelBuilder } from './levelBuilder';
import type { PropKind } from './props';
import type { RoomDef } from './rooms';
import type { Surface } from './surfaces';
import type { VoxelArt } from '../voxel/levelVoxels';

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
  pickups: { pos: Vector3; kind: 'ammo' | 'health' }[];
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
}

export interface MapDef {
  id: string;
  name: string;
  description: string;
  theme: MapTheme;
  /** Modes this map supports. */
  modes: ('wave' | 'mission' | 'sandbox' | 'clear' | 'infiltration' | 'tdm' | 'ffa' | 'training')[];
  build(b: LevelBuilder, seed: number): MapLayout;
  /** 3.0: the voxel art layer (what the pieces' voxels look like, visual-only dressing); none = plain voxels. */
  art?: VoxelArt;
}
