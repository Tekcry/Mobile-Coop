/**
 * Kestrel campus file shapes (docs/kestrel/kestrel.campus.blocks.json) as the level editor sees them. Only the fields the
 * editor reads or writes are typed; every other field rides along untouched (the index signatures).
 */
import type { RoofData } from '../world/maps/kestrelRoofs';

export type Pt = [number, number];
/** A roof (ON10, schema.md section 2 `roofs[]`); the geometry is src/world/maps/kestrelRoofs.ts. */
export type Roof = RoofData;
/** [x0, z0, x1, z1] in metres; x east, z north. */
export type Rect = [number, number, number, number];

export interface Level {
  id: string;
  name: string;
  floor: number;
  height: number;
  [k: string]: unknown;
}

export interface Room {
  id: string;
  level: string;
  name?: string;
  kind: string;
  rect: Rect;
  ring?: number;
  building?: string;
  [k: string]: unknown;
}

export interface Wall {
  id: string;
  level: string;
  a: Pt;
  b: Pt;
  t: number;
  h: number;
  kind: string;
  [k: string]: unknown;
}

export interface Opening {
  id: string;
  wall: string;
  /** Centre, metres along the wall from a. */
  at: number;
  w: number;
  h: number;
  sill: number;
  type: string;
  between?: string[];
  [k: string]: unknown;
}

export interface Stair {
  id: string;
  name?: string;
  kind: string;
  from: string;
  to: string;
  rect: Rect;
  up: 'N' | 'S' | 'E' | 'W';
  width?: number;
  risers?: number;
  layout?: string;
  [k: string]: unknown;
}

export interface Ladder {
  id: string;
  name?: string;
  room?: string;
  at: Pt;
  from: string;
  to: string;
  facing?: string;
  [k: string]: unknown;
}

export interface Void {
  id: string;
  name?: string;
  level: string;
  rect: Rect;
  kind: string;
  [k: string]: unknown;
}

/** A placed object (schema.md section 2 `objects`); ON4: the Object tool places them from src/editor/catalogue.ts. */
export interface Obj {
  id: string;
  level: string;
  name?: string;
  /** Footprint, axis-aligned on the object grid. */
  rect: Rect;
  /** Height of the top above `y`; `y` is the base above the floor. */
  h: number;
  y: number;
  noLedge?: boolean;
  /** ON4: catalogue id, quarter turn (90 and 270 swap the preset's w and d), mesh / chair / glass (no cover). */
  preset?: string;
  yaw?: number;
  seeThrough?: boolean;
  reason?: string;
  [k: string]: unknown;
}

export interface Service {
  id: string;
  kind: string;
  /** [x, y, z] points; y is the centre height. */
  path: [number, number, number][];
  size: [number, number];
  [k: string]: unknown;
}

export interface Building {
  id: string;
  name?: string;
  footprint: Rect;
}

export interface Campus {
  meta: { id: string; grid?: number; objectGrid?: number; site?: Rect; buildings?: Building[]; [k: string]: unknown };
  levels: Level[];
  rooms: Room[];
  walls: Wall[];
  openings: Opening[];
  stairs: Stair[];
  ladders: Ladder[];
  voids: Void[];
  services?: Service[];
  /** ON10: absent until the first roof is drawn (a file without roofs saves byte-identical). */
  roofs?: Roof[];
  /** ON4: placed objects (the campus file has the list, empty until the first object). */
  objects?: Obj[];
  [k: string]: unknown;
}

/**
 * The collections the editor can change. `levels` and `buildings` (meta.buildings) change through the Levels tab only
 * (ON2; ON4 made `objects` an element); they are not in COLLS (nothing picks or draws them as elements), so a key of theirs parses to null.
 */
export type Coll = 'rooms' | 'walls' | 'openings' | 'stairs' | 'ladders' | 'voids' | 'roofs' | 'levels' | 'buildings' | 'objects';
export type Elem = Room | Wall | Opening | Stair | Ladder | Void | Roof | Level | Obj | (Building & { [k: string]: unknown });
export const COLLS: readonly Coll[] = ['rooms', 'walls', 'openings', 'stairs', 'ladders', 'voids', 'roofs', 'objects'];

/** A reference to one element: `rooms:G-FRONT`. */
export type Key = `${Coll}:${string}`;
export const keyOf = (coll: Coll, id: string): Key => `${coll}:${id}`;
export function parseKey(key: string): { coll: Coll; id: string } | null {
  const i = key.indexOf(':');
  const coll = key.slice(0, i) as Coll;
  return i > 0 && COLLS.includes(coll) ? { coll, id: key.slice(i + 1) } : null;
}
