/**
 * Kestrel campus file shapes (docs/kestrel/kestrel.campus.blocks.json) as the level editor sees them. Only the fields the
 * editor reads or writes are typed; every other field rides along untouched (the index signatures).
 */
export type Pt = [number, number];
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

/** A placed object (schema.md section 2 `objects`); the editor only copies, moves with a level and renames its level (ON2). */
export interface Obj {
  id: string;
  level: string;
  name?: string;
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
  [k: string]: unknown;
}

/**
 * The collections the editor can change. `levels`, `objects` and `buildings` (meta.buildings) change through the Levels tab only
 * (ON2); they are not in COLLS (nothing picks or draws them as elements), so a key of theirs parses to null.
 */
export type Coll = 'rooms' | 'walls' | 'openings' | 'stairs' | 'ladders' | 'voids' | 'levels' | 'buildings' | 'objects';
export type Elem = Room | Wall | Opening | Stair | Ladder | Void | Level | Obj | (Building & { [k: string]: unknown });
export const COLLS: readonly Coll[] = ['rooms', 'walls', 'openings', 'stairs', 'ladders', 'voids'];

/** A reference to one element: `rooms:G-FRONT`. */
export type Key = `${Coll}:${string}`;
export const keyOf = (coll: Coll, id: string): Key => `${coll}:${id}`;
export function parseKey(key: string): { coll: Coll; id: string } | null {
  const i = key.indexOf(':');
  const coll = key.slice(0, i) as Coll;
  return i > 0 && COLLS.includes(coll) ? { coll, id: key.slice(i + 1) } : null;
}
