/**
 * Kestrel campus file shapes (docs/kestrel/kestrel.campus.blocks.json) as the level editor sees them. Only the fields the
 * editor reads or writes are typed; every other field rides along untouched (the index signatures).
 */
import type { RoofData } from '../world/maps/kestrelRoofs';
import type { CircuitRecord, LampRecord } from '../world/maps/kestrelLights';
import type { Ceiling, CrawlRecord } from './ceilings';
import type { SignRecord } from './signs';
import type { Checkpoint, Extraction, Guard, Hide, Objective, Spawn } from './mission';

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
  /** Floor finish (ON5: src/editor/finishes.ts); '' for none. */
  finish?: string;
  /** ON13: ceiling height (0 = none), type and hatch centres (src/editor/ceilings.ts). */
  ceiling?: number;
  ceilingType?: string;
  hatches?: Pt[];
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
  /** ON5: climb pieces and exterior features (the campus file has the list, empty until the first piece). */
  exterior?: Ext[];
  /** ON6: the play file's lamps and circuits, joined in while editing (src/editor/playFile.ts); never in the campus file. */
  lamps?: LampRecord[];
  circuits?: CircuitRecord[];
  /** ON8: the play file's guards and mission markers, joined in the same way (src/editor/mission.ts). */
  guards?: Guard[];
  objectives?: Objective[];
  hides?: Hide[];
  checkpoints?: Checkpoint[];
  spawns?: Spawn[];
  extraction?: Extraction[];
  /** ON12: the security file's devices (src/editor/security.ts), joined in while editing. */
  devices?: { id: string; kind: string; level: string; [k: string]: unknown }[];
  /** ON13: crawl spaces (absent until the first is drawn: a file without them saves byte-identical). */
  crawls?: CrawlRecord[];
  /** ON14: wayfinding and safety signs (src/editor/signs.ts; absent until the first is placed). */
  signs?: SignRecord[];
  [k: string]: unknown;
}

/**
 * ON5: a climb piece or exterior feature (schema.md `exterior`): plan points `a`, `b` (equal for a point piece) and the
 * absolute bottom and top `y0`, `y1` (ground floor = 0). `climbable` comes from the reach rules (src/editor/climb.ts)
 * unless `override` says it was set by hand (`reason` says why).
 */
export interface Ext {
  id: string;
  kind: string;
  a: Pt;
  b: Pt;
  y0: number;
  y1: number;
  climbable: boolean;
  reason: string;
  /** ON5: the level it was placed from (the floor under it), the wall it backs onto, the way a climber faces. */
  level?: string;
  name?: string;
  wall?: string;
  facing?: string;
  /** Ledge, sill and coping: how far it stands out across its line. */
  depth?: number;
  /** Vent: width x height; duct: the clear section, width x height; fire escape: [width, 0]. */
  size?: [number, number];
  override?: boolean;
  [k: string]: unknown;
}

/**
 * The collections the editor can change. `levels` and `buildings` (meta.buildings) change through the Levels tab only
 * (ON2; ON4 made `objects` an element); they are not in COLLS (nothing picks or draws them as elements), so a key of theirs parses to null.
 */
export type Coll = 'rooms' | 'walls' | 'openings' | 'stairs' | 'ladders' | 'voids' | 'roofs' | 'levels' | 'buildings' | 'objects' | 'exterior' | 'lamps' | 'circuits' | 'guards' | 'objectives' | 'hides' | 'checkpoints' | 'spawns' | 'extraction' | 'devices' | 'ceilings' | 'crawls' | 'signs';
export type Elem = Room | Wall | Opening | Stair | Ladder | Void | Roof | Level | Obj | Ext | LampRecord | CircuitRecord | Guard | Objective | Hide | Checkpoint | Spawn | Extraction | Ceiling | CrawlRecord | SignRecord | (Building & { [k: string]: unknown });
/** ON6: `lamps` and `circuits` are the play file's (a circuit is picked by its wall switch); ON8: so are the mission ones; ON12: `devices` are the security file's; ON13: `ceilings` are the rooms' ceiling fields (model.ts). */
export const COLLS: readonly Coll[] = ['rooms', 'walls', 'openings', 'stairs', 'ladders', 'voids', 'roofs', 'objects', 'exterior', 'lamps', 'circuits', 'guards', 'objectives', 'hides', 'checkpoints', 'spawns', 'extraction', 'devices', 'ceilings', 'crawls', 'signs'];

/** A reference to one element: `rooms:G-FRONT`. */
export type Key = `${Coll}:${string}`;
export const keyOf = (coll: Coll, id: string): Key => `${coll}:${id}`;
export function parseKey(key: string): { coll: Coll; id: string } | null {
  const i = key.indexOf(':');
  const coll = key.slice(0, i) as Coll;
  return i > 0 && COLLS.includes(coll) ? { coll, id: key.slice(i + 1) } : null;
}
