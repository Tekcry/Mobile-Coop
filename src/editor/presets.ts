/**
 * ON11 room presets (pure data and logic, Babylon- and DOM-free; tests/editor/presets.test.ts): a group of rooms, walls,
 * doors and windows, objects, stairs, floor holes and ladders relative to an origin (its south-west corner at 0,0), with
 * a name, a footprint and `src`. Three sources: the start set below (sizes from facts.json, the module kit and typical
 * products), the module kit (scripts/kestrel/modules.json, expanded by expand.mjs on the editor server: `kitPreset`), and
 * Michael's own saved groups (docs/kestrel/editor-presets.json: `readMine`, `mineText`).
 *
 * Records are the campus file's own (rooms, walls, openings as ON9, objects as ON4); levels are relative: `+0` is the
 * level stamped on, `+1` the one above. Lamps and circuits join when the light records exist (ON6 has not run yet).
 * Stamping (`stampChanges`) turns and moves the group, gives fresh ids, reuses walls already on the same lines (the
 * ED3-3a rules: never doubled) and returns one change list; `fitProblems` names what the rules would refuse.
 */
import facts from '../../scripts/kestrel/facts.json';
import { PRESETS as OBJECTS } from './catalogue';
import type { Preset as ObjPreset } from './catalogue';
import { EPS, fmt, roomsEitherSide, wallLen } from './geometry';
import type { Change } from './model';
import { newObject, sizeFor } from './objects';
import { catEntry, typeDefaults } from './openingCatalogue';
import { edgeLine, EDGES, missingSpans, onLine, wallLine, WALL_T } from './roomWalls';
import type { Line } from './roomWalls';
import type { Building, Campus, Coll, Elem, Key, Ladder, Obj, Opening, Pt, Rect, Room, Stair, Void, Wall } from './types';
import { keyOf, parseKey } from './types';
import { buildingAt } from './visibility';

const r3 = (v: number): number => +v.toFixed(3);
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export type PresetFrom = 'start' | 'kit' | 'mine';
export const PRESET_FROMS: readonly { id: PresetFrom; name: string }[] = [
  { id: 'start', name: 'Start set' },
  { id: 'kit', name: 'Module kit' },
  { id: 'mine', name: 'Mine' },
];

/** The records of a preset; every level field is relative (`+0`, `+1` ...). */
export interface PresetItems {
  rooms: Room[];
  walls: Wall[];
  openings: Opening[];
  objects: Obj[];
  stairs: Stair[];
  voids: Void[];
  ladders: Ladder[];
}

export interface RoomPreset {
  id: string;
  name: string;
  from: PresetFrom;
  /** Footprint [x, z] at no turn. */
  size: [number, number];
  src: string;
  items: PresetItems;
}

export const emptyItems = (): PresetItems => ({ rooms: [], walls: [], openings: [], objects: [], stairs: [], voids: [], ladders: [] });
const ITEM_COLLS = ['rooms', 'walls', 'openings', 'objects', 'stairs', 'voids', 'ladders'] as const;

// ---------------------------------------------------------------- building the start set

const DOOR_W = facts.door.singleWidth.value;
const STAIR_W = facts.stair.fireWidth.value;
const TYP = 'editor default: typical product';
type EdgeId = 'W' | 'S' | 'E' | 'N';
interface RoomDef {
  name: string;
  rect: Rect;
  finish: string;
  kind?: string;
  /** Levels the room stands on (default [0]). */
  levels?: number[];
}
/** A door: room index, edge, centre offset from the edge's west or south end, catalogue type. */
type DoorDef = [number, EdgeId, number, string];
/** A catalogue object: id, south-west corner x, z, turn. */
type CatDef = [string, number, number, number?];
/** A fixture with no catalogue entry (sizes from the module kit): name, rect, height, y, see-through. */
interface FixDef {
  name: string;
  rect: Rect;
  h: number;
  y?: number;
  seeThrough?: boolean;
}
interface PresetDef {
  id: string;
  name: string;
  src: string;
  rooms: RoomDef[];
  doors: DoorDef[];
  objects: (CatDef | FixDef)[];
  /** Footprint edges whose walls are outside walls (goods-in faces the yard). */
  outer?: EdgeId[];
  stair?: Omit<Stair, 'id' | 'from' | 'to'>;
}

const objOf = (id: string): ObjPreset => {
  const p = OBJECTS.find((q) => q.id === id);
  if (!p) throw new Error(`presets.ts: no object preset ${id}`);
  return p;
};

/** Every room edge as a wall: one wall per joined run of edges on a line, per level (shared edges become one wall). */
function edgeWalls(rooms: readonly Room[], foot: Rect, outer: readonly EdgeId[]): Wall[] {
  const lines = new Map<string, { level: string; axis: 'x' | 'z'; v: number; spans: [number, number][] }>();
  for (const r of rooms)
    for (const e of EDGES) {
      const l = edgeLine(r.rect, e);
      const k = `${r.level}|${l.axis}|${l.v}`;
      const g = lines.get(k) ?? { level: r.level, axis: l.axis, v: l.v, spans: [] };
      g.spans.push([l.lo, l.hi]);
      lines.set(k, g);
    }
  const out: Wall[] = [];
  for (const g of lines.values()) {
    g.spans.sort((a, b) => a[0] - b[0]);
    const runs: [number, number][] = [];
    for (const s of g.spans) {
      const last = runs[runs.length - 1];
      if (last && s[0] <= last[1] + EPS) last[1] = Math.max(last[1], s[1]);
      else runs.push([s[0], s[1]]);
    }
    const onOuter = outer.some((e) => {
      const fl = edgeLine(foot, e);
      return fl.axis === g.axis && Math.abs(fl.v - g.v) < EPS;
    });
    for (const [lo, hi] of runs) {
      const a: Pt = g.axis === 'x' ? [g.v, lo] : [lo, g.v];
      const b: Pt = g.axis === 'x' ? [g.v, hi] : [hi, g.v];
      out.push({ id: `W${out.length + 1}`, level: g.level, a, b, t: onOuter ? WALL_T.exterior : WALL_T.interior, h: 0, kind: onOuter ? 'exterior' : 'interior' });
    }
  }
  return out;
}

const rel = (n: number): string => `+${n}`;

/** A start-set preset from its compact definition. */
function build(def: PresetDef): RoomPreset {
  const it = emptyItems();
  def.rooms.forEach((rd, i) => {
    for (const n of rd.levels ?? [0]) it.rooms.push({ id: `R${i + 1}${n ? `.${n}` : ''}`, level: rel(n), name: rd.name, kind: rd.kind ?? 'zone', rect: [...rd.rect] as Rect, ceiling: 0, finish: rd.finish, minShort: 3, open: [], ring: 2 });
  });
  let x1 = 0;
  let z1 = 0;
  for (const r of it.rooms) {
    x1 = Math.max(x1, r.rect[2]);
    z1 = Math.max(z1, r.rect[3]);
  }
  const foot: Rect = [0, 0, x1, z1];
  it.walls = edgeWalls(it.rooms, foot, def.outer ?? []);
  for (const [ri, edge, off, type] of def.doors) {
    const rd = def.rooms[ri]!;
    for (const n of rd.levels ?? [0]) {
      const l = edgeLine(rd.rect, edge);
      const s = l.lo + off;
      const w = it.walls.find((q) => q.level === rel(n) && onLine(q, rel(n), { ...l, lo: s - 0.01, hi: s + 0.01 }));
      if (!w) throw new Error(`presets.ts ${def.id}: no wall for a door`);
      const at = r3(Math.abs(wallLine(w)!.lo - s) < EPS ? 0 : s - wallLine(w)!.lo);
      const c = catEntry(type);
      const between = roomsEitherSide(w, at, it.rooms);
      const set = typeDefaults(type, between, it.rooms);
      const o: Opening = { id: `D${it.openings.length + 1}`, wall: w.id, at, w: c.w, h: c.h, sill: c.sill, type, between, locked: set.locked ?? false, reason: 'Preset door' };
      if (set.door) o.door = set.door;
      if (set.glass) o.glass = set.glass;
      it.openings.push(o);
    }
  }
  for (const od of def.objects) {
    const id = `O${String(it.objects.length + 1).padStart(3, '0')}`;
    if (Array.isArray(od)) {
      const [pid, x, z, yaw = 0] = od;
      const p = objOf(pid);
      const [w, d] = p.draw ? [0, 0] : sizeFor(p, yaw);
      it.objects.push(newObject(id, '+0', p, [x, z, r3(x + w), r3(z + d)], yaw));
    } else if ('pid' in od) {
      // a drawn row (rack row, containment): the Object tool's own record
      it.objects.push(newObject(id, '+0', objOf((od as { pid: string }).pid), od.rect, 0));
    } else {
      const o: Obj = { id, level: '+0', name: od.name, rect: od.rect, h: od.h, y: od.y ?? 0 };
      o.noLedge = false;
      if (od.seeThrough) o.seeThrough = true;
      o.reason = 'Preset fixture';
      it.objects.push(o);
    }
  }
  if (def.stair) it.stairs.push({ ...clone(def.stair), id: 'S1', from: '+0', to: '+1' } as Stair);
  return { id: `start.${def.id}`, name: def.name, from: 'start', size: [x1, z1], src: def.src, items: it };
}

/** A drawn row placed by its rect (rack rows, containment): same record as the Object tool's drawn rows. */
const row = (pid: string, rect: Rect): FixDef & { pid: string } => ({ pid, name: objOf(pid).name, rect, h: objOf(pid).h, y: objOf(pid).y });

const DEFS: PresetDef[] = [
  {
    id: 'office-4', name: '4-desk office', src: `6 x 5 m for 4 desks of 1.6 x 0.8 (about 7 m2 a person): ${TYP}; door facts door.singleWidth (${DOOR_W})`,
    rooms: [{ name: 'Office', rect: [0, 0, 6, 5], finish: 'carpet' }],
    doors: [[0, 'S', 1.5, 'door']],
    objects: [['desk-pod', 1.4, 2.0], ['office-chair', 1.6, 1.25], ['office-chair', 3.2, 1.25], ['office-chair', 1.6, 3.7], ['office-chair', 3.2, 3.7], ['filing-cabinet', 5.2, 2.2, 90], ['filing-cabinet', 5.2, 2.7, 90], ['whiteboard', 0.15, 1.8, 90]],
  },
  {
    id: 'office-8', name: '8-desk open office', src: `10 x 7 m for 8 desks in two pods: ${TYP}`,
    rooms: [{ name: 'Open office', rect: [0, 0, 10, 7], finish: 'carpet' }],
    doors: [[0, 'S', 2, 'door']],
    objects: [['desk-pod', 1.5, 2.5], ['desk-pod', 5.5, 2.5], ...[2.0, 3.6, 6.0, 7.6].flatMap((x): CatDef[] => [['office-chair', x, 1.75], ['office-chair', x, 4.2]]), ['copier', 9.1, 0.5], ['tall-cupboard', 5.0, 6.4], ['pot-plant', 0.3, 6.2], ['filing-cabinet', 1.0, 6.2], ['filing-cabinet', 1.5, 6.2]],
  },
  {
    id: 'meeting-8', name: 'Meeting room (8)', src: `7 x 4.5 m: two 2.4 m tables end to end seat 8: ${TYP}`,
    rooms: [{ name: 'Meeting room', rect: [0, 0, 7, 4.5], finish: 'carpet' }],
    doors: [[0, 'S', 1.2, 'door']],
    objects: [['meeting-table', 1.1, 1.65], ['meeting-table', 3.5, 1.65], ...[1.3, 2.5, 3.7, 4.9].flatMap((x): CatDef[] => [['office-chair', x, 0.95], ['office-chair', x, 2.9]]), ['whiteboard', 6.8, 1.35, 90]],
  },
  {
    id: 'manager', name: "Manager's office", src: `4 x 4 m single office: ${TYP}`,
    rooms: [{ name: "Manager's office", rect: [0, 0, 4, 4], finish: 'carpet' }],
    doors: [[0, 'S', 1.0, 'door']],
    objects: [['desk', 1.2, 2.4], ['office-chair', 1.65, 3.2], ['office-chair', 1.2, 1.4], ['office-chair', 2.1, 1.4], ['filing-cabinet', 3.3, 3.2], ['tall-cupboard', 0.15, 0.6, 90]],
  },
  {
    id: 'wc-block', name: 'WC block (male, female, accessible)', src: 'fixture sizes: module kit staff-wc and visitor-wc (modules.json); accessible WC 2.2 m clear (UK Approved Document M: 1.5 x 2.2 minimum)',
    rooms: [
      { name: 'Male WC', rect: [0, 0, 3.5, 4.5], finish: 'ceramic' },
      { name: 'Female WC', rect: [3.5, 0, 7, 4.5], finish: 'ceramic' },
      { name: 'Accessible WC', rect: [7, 0, 9.5, 2.5], finish: 'ceramic' },
    ],
    doors: [[0, 'S', 1.0, 'door'], [1, 'S', 1.0, 'door'], [2, 'S', 1.25, 'door']],
    objects: [
      { name: 'WC cubicle', rect: [0.15, 2.85, 1.05, 4.35], h: 1.8 },
      { name: 'WC cubicle', rect: [1.05, 2.85, 1.95, 4.35], h: 1.8 },
      { name: 'Urinal', rect: [3.0, 3.0, 3.35, 3.4], h: 1.0, y: 0.5 },
      { name: 'Urinal', rect: [3.0, 3.6, 3.35, 4.0], h: 1.0, y: 0.5 },
      { name: 'Wash basin', rect: [2.95, 0.6, 3.35, 1.1], h: 0.85 },
      { name: 'Wash basin', rect: [2.95, 1.2, 3.35, 1.7], h: 0.85 },
      { name: 'WC cubicle', rect: [3.65, 2.85, 4.55, 4.35], h: 1.8 },
      { name: 'WC cubicle', rect: [4.55, 2.85, 5.45, 4.35], h: 1.8 },
      { name: 'WC cubicle', rect: [5.45, 2.85, 6.35, 4.35], h: 1.8 },
      { name: 'Wash basin', rect: [6.45, 0.6, 6.85, 1.1], h: 0.85 },
      { name: 'Wash basin', rect: [6.45, 1.2, 6.85, 1.7], h: 0.85 },
      { name: 'WC pan and cistern', rect: [8.6, 1.65, 9.0, 2.35], h: 0.8 },
      { name: 'Wash basin', rect: [7.25, 1.95, 7.75, 2.35], h: 0.85 },
    ],
  },
  {
    id: 'kitchenette', name: 'Kitchenette', src: `3.5 x 3 m tea point: ${TYP}`,
    rooms: [{ name: 'Kitchenette', rect: [0, 0, 3.5, 3], finish: 'vinyl' }],
    doors: [[0, 'S', 1.0, 'door']],
    objects: [['kitchenette', 0.15, 2.25], ['fridge', 2.6, 2.2], ['water-cooler', 2.9, 0.3]],
  },
  {
    id: 'security-control', name: 'Security control room', src: `6 x 5 m: desk, video wall, lockers: ${TYP}`,
    rooms: [{ name: 'Security control room', rect: [0, 0, 6, 5], finish: 'vinyl' }],
    doors: [[0, 'S', 1.0, 'door']],
    objects: [['security-desk', 1.8, 2.6], ['office-chair', 2.1, 1.85], ['office-chair', 3.3, 1.85], ['video-wall', 1.2, 4.55], ['lockers', 5.35, 0.6, 90], ['lockers', 5.35, 1.5, 90]],
  },
  {
    id: 'reception', name: 'Reception (counter, lounge)', src: `9 x 7 m: module kit lobby size (modules.json lobby); double entrance facts door.doubleWidthA; furniture: ${TYP}`,
    rooms: [{ name: 'Reception', rect: [0, 0, 9, 7], finish: 'ceramic' }],
    doors: [[0, 'S', 4.5, 'double'], [0, 'N', 2.0, 'door']],
    objects: [['reception-counter', 1.0, 4.6], ['sofa', 5.8, 0.5], ['sofa', 5.8, 2.6, 180], ['water-cooler', 8.4, 6.3], ['pot-plant', 0.3, 0.3], ['pot-plant', 8.3, 0.3]],
  },
  {
    id: 'locker-room', name: 'Locker room', src: `5 x 4 m: ${TYP}; bench 1.8 x 0.4 x 0.45`,
    rooms: [{ name: 'Locker room', rect: [0, 0, 5, 4], finish: 'vinyl' }],
    doors: [[0, 'S', 1.0, 'door']],
    objects: [['lockers', 0.6, 3.35], ['lockers', 1.5, 3.35], ['lockers', 2.4, 3.35], ['lockers', 3.3, 3.35], ['lockers', 4.35, 0.8, 90], ['lockers', 4.35, 1.7, 90], { name: 'Bench', rect: [1.5, 2.0, 3.3, 2.4], h: 0.45 }],
  },
  {
    id: 'comms-room', name: 'Comms room (2 racks)', src: `4 x 4 m: two racks (facts rules.rackWidth ${facts.rules.rackWidth.value}) with a 1.2 m front aisle: ${TYP}`,
    rooms: [{ name: 'Comms room', rect: [0, 0, 4, 4], finish: 'raised' }],
    doors: [[0, 'S', 1.0, 'door']],
    objects: [['server-rack', 1.9, 2.5], ['server-rack', 2.5, 2.5], ['pdu-cabinet', 3.0, 0.3]],
  },
  {
    id: 'store', name: 'Store', src: `3 x 3 m: shelving bays: ${TYP}`,
    rooms: [{ name: 'Store', rect: [0, 0, 3, 3], finish: 'concrete' }],
    doors: [[0, 'S', 1.0, 'door']],
    objects: [['shelving', 0.6, 2.25], ['shelving', 2.25, 0.3, 90]],
  },
  {
    id: 'plant-room', name: 'Plant room (UPS and batteries)', src: `8 x 6 m: UPS cabinets, battery racks, LV sections: ${TYP}; double door facts door.doubleWidthA`,
    rooms: [{ name: 'Plant room', rect: [0, 0, 8, 6], finish: 'concrete' }],
    doors: [[0, 'S', 1.5, 'double']],
    objects: [['ups', 0.6, 4.95], ['ups', 1.8, 4.95], ['battery-rack', 4.2, 5.0], ['battery-rack', 5.7, 5.0], ['battery-rack', 4.2, 2.6], ['battery-rack', 5.7, 2.6], ['lv-section', 0.3, 2.0], ['lv-section', 0.3, 2.8]],
  },
  {
    id: 'stair-core', name: 'Stair core (main dogleg)', src: `module kit main-stair (modules.json): 6.5 x 4 core, two ${STAIR_W} m flights (facts stair.fireWidth); its well in the floor above`,
    rooms: [{ name: 'Stair core', rect: [0, 0, 6.5, 4], finish: 'vinyl', kind: 'stair', levels: [0, 1] }],
    doors: [[0, 'S', 1.2, 'fire-door']],
    objects: [],
    stair: { name: 'Stair core', kind: 'main', layout: 'dogleg', rect: [0, 0, 6.5, 4], up: 'E', width: STAIR_W, risers: 0 },
  },
  {
    id: 'lift-lobby', name: 'Lift lobby', src: `6 x 4 m lobby with a 2.5 m lift shaft (module kit lift-shaft size): ${TYP}`,
    rooms: [
      { name: 'Lift lobby', rect: [0, 0, 6, 4], finish: 'ceramic' },
      { name: 'Lift shaft', rect: [1.75, 4, 4.25, 6.5], finish: '', kind: 'shaft' },
    ],
    doors: [[0, 'S', 3.0, 'double'], [1, 'S', 1.25, 'slide']],
    objects: [['pot-plant', 0.3, 3.2]],
  },
  {
    id: 'data-hall-bay', name: 'Data hall bay (two rack rows)', src: `12 x 9.5 m: two rows of 10 racks (facts rules.rackWidth), a ${facts.rules.aisleMin.value} m contained cold aisle (facts rules.aisleMin), two CRAH units: ${TYP}`,
    rooms: [{ name: 'Data hall bay', rect: [0, 0, 12, 9.5], finish: 'raised' }],
    doors: [[0, 'S', 1.5, 'double']],
    objects: [
      row('rack-row', [2.0, 2.4, 8.0, 3.6]),
      row('rack-row', [2.0, 5.4, 8.0, 6.6]),
      row('containment-roof', [2.0, 3.6, 8.0, 5.4]),
      ['containment-door', 1.9, 3.9, 90],
      ['containment-door', 8.0, 3.9, 90],
      ['crah', 1.0, 8.45],
      ['crah', 8.0, 8.45],
    ],
  },
  {
    id: 'goods-in', name: 'Goods-in bay', src: `10 x 8 m (module kit loading-bay size); roller shutter facts door.rollerWidth to the yard: ${TYP}`,
    rooms: [{ name: 'Goods-in bay', rect: [0, 0, 10, 8], finish: 'concrete' }],
    doors: [[0, 'S', 5.0, 'roller'], [0, 'N', 1.5, 'door']],
    outer: ['S'],
    objects: [['pallet-stack', 0.5, 6.5], ['pallet-stack', 1.8, 6.5], ['packing-bench', 7.5, 7.0], ['roll-cage', 9.0, 4.0], ['roll-cage', 9.0, 4.8], ['pallet-jack', 3.5, 4.0], ['boxed-equipment', 0.5, 4.5]],
  },
];

/** The start set (decision 1). */
export const START_PRESETS: readonly RoomPreset[] = DEFS.map(build);

// ---------------------------------------------------------------- the module kit (decision 2)

/** The editor server's expansion of one module at the origin: expand.mjs's arch for a layout with that one placement. */
export interface KitArch {
  levels: { id: string; floor: number }[];
  rooms: Room[];
  walls: Wall[];
  openings: Opening[];
  objects?: Obj[];
  stairs: Stair[];
  voids: Void[];
  ladders: Ladder[];
}

/** The levels the server expands a module on: the base, the next, a roof (span "roof" stairs). */
export const KIT_LEVELS = [
  { id: 'P0', name: 'Base', floor: 0, height: facts.room.storey.value },
  { id: 'P1', name: 'Next', floor: facts.room.storey.value, height: facts.room.storey.value },
  { id: 'R', name: 'Roof', floor: 2 * facts.room.storey.value, height: 1 },
];

/** A module kit preset from its expansion (read from modules.json every time the editor loads; never copied). */
export function kitPreset(m: { id: string; name: string; source?: string; category?: string }, arch: KitArch): RoomPreset {
  const order = arch.levels.slice().sort((a, b) => a.floor - b.floor).map((l) => l.id);
  const lv = (id: string): string => rel(Math.max(0, order.indexOf(id)));
  const strip = <T extends Elem>(e: T): T => {
    const o = clone(e) as T & Record<string, unknown>;
    delete o.gen;
    return o;
  };
  const it = emptyItems();
  it.rooms = arch.rooms.map((r) => ({ ...strip(r), level: lv(r.level) }));
  it.walls = arch.walls.map((w) => ({ ...strip(w), level: lv(w.level) }));
  it.openings = arch.openings.map((o) => strip(o));
  it.objects = (arch.objects ?? []).map((o) => ({ ...strip(o), level: lv(o.level) }));
  it.stairs = arch.stairs.map((s) => ({ ...strip(s), from: lv(s.from), to: lv(s.to) }));
  it.voids = arch.voids.map((v) => ({ ...strip(v), level: lv(v.level) }));
  it.ladders = arch.ladders.map((l) => ({ ...strip(l), from: lv(l.from), to: lv(l.to) }));
  const b = itemsBounds(it);
  return { id: `kit.${m.id}`, name: m.name, from: 'kit', size: [r3(b[2] - b[0]), r3(b[3] - b[1])], src: `module kit ${m.id} (scripts/kestrel/modules.json, expand.mjs)${m.source ? `: ${m.source}` : ''}`, items: it };
}

// ---------------------------------------------------------------- geometry of a group

/** The plan bounds of a group (rooms, walls, stairs, holes, ladders, objects). */
export function itemsBounds(it: PresetItems): Rect {
  let x0 = Infinity;
  let z0 = Infinity;
  let x1 = -Infinity;
  let z1 = -Infinity;
  const add = (x: number, z: number): void => {
    x0 = Math.min(x0, x);
    z0 = Math.min(z0, z);
    x1 = Math.max(x1, x);
    z1 = Math.max(z1, z);
  };
  for (const r of [...it.rooms, ...it.stairs, ...it.voids, ...it.objects]) {
    add(r.rect[0], r.rect[1]);
    add(r.rect[2], r.rect[3]);
  }
  for (const w of it.walls) {
    add(...w.a);
    add(...w.b);
  }
  for (const l of it.ladders) add(...l.at);
  return Number.isFinite(x0) ? [x0, z0, x1, z1] : [0, 0, 0, 0];
}

const DIR_CW: Record<string, string> = { N: 'E', E: 'S', S: 'W', W: 'N' };

/** The group turned a quarter clockwise on the plan (north up), its south-west corner kept at 0,0. */
function turnOnce(it: PresetItems, size: [number, number]): PresetItems {
  const W = size[0];
  const p = (q: Pt): Pt => [r3(q[1]), r3(W - q[0])];
  const rect = (r: Rect): Rect => [r3(r[1]), r3(W - r[2]), r3(r[3]), r3(W - r[0])];
  const out = clone(it);
  for (const r of out.rooms) r.rect = rect(r.rect);
  for (const v of out.voids) v.rect = rect(v.rect);
  for (const s of out.stairs) {
    s.rect = rect(s.rect);
    s.up = DIR_CW[s.up] as Stair['up'];
  }
  for (const o of out.objects) {
    o.rect = rect(o.rect);
    const yaw = ((o.yaw ?? 0) + 90) % 360;
    if (yaw) o.yaw = yaw;
    else delete o.yaw;
  }
  for (const w of out.walls) {
    w.a = p(w.a);
    w.b = p(w.b);
  }
  for (const l of out.ladders) {
    l.at = p(l.at);
    if (typeof l.facing === 'string' && DIR_CW[l.facing]) l.facing = DIR_CW[l.facing];
  }
  return out;
}

/** The group turned by `turns` quarters (clockwise) and moved so its south-west corner is at `origin`. */
export function placedItems(pr: RoomPreset, origin: Pt, turns: number): { items: PresetItems; size: [number, number] } {
  let it = clone(pr.items);
  let size: [number, number] = [...pr.size];
  for (let i = 0; i < ((turns % 4) + 4) % 4; i++) {
    it = turnOnce(it, size);
    size = [size[1], size[0]];
  }
  const [dx, dz] = origin;
  const mv = (r: Rect): Rect => [r3(r[0] + dx), r3(r[1] + dz), r3(r[2] + dx), r3(r[3] + dz)];
  for (const r of [...it.rooms, ...it.voids, ...it.stairs, ...it.objects]) r.rect = mv(r.rect);
  for (const w of it.walls) {
    w.a = [r3(w.a[0] + dx), r3(w.a[1] + dz)];
    w.b = [r3(w.b[0] + dx), r3(w.b[1] + dz)];
  }
  for (const l of it.ladders) l.at = [r3(l.at[0] + dx), r3(l.at[1] + dz)];
  return { items: it, size };
}

/** The south-west corner that centres a footprint on the dot, on the grid (half an odd size rounds down, never a tie). */
export function originAt(size: [number, number], x: number, z: number, grid: number): Pt {
  if (!(grid > 0)) return [r3(x - size[0] / 2), r3(z - size[1] / 2)];
  const half = (v: number): number => Math.floor(v / 2 / grid + EPS) * grid;
  return [r3(Math.round(x / grid) * grid - half(size[0])), r3(Math.round(z / grid) * grid - half(size[1]))];
}

/** `+n` to a level id: the n-th level above `base` by floor height, or null. */
export function levelMap(d: Campus, base: string): (rel: string) => string | null {
  const ls = d.levels.slice().sort((a, b) => a.floor - b.floor);
  const i0 = ls.findIndex((l) => l.id === base);
  return (r) => {
    const n = Number(r.replace('+', ''));
    return i0 >= 0 && Number.isInteger(n) ? (ls[i0 + n]?.id ?? null) : null;
  };
}

// ---------------------------------------------------------------- the fit check (decision 4)

export interface FitProblem {
  words: string;
  level: string;
  rect: Rect;
}

const roomName = (r: Room): string => (typeof r.name === 'string' && r.name ? r.name : r.id);
const OUTSIDE = new Set(['yard', 'lane', 'roof']);

/**
 * What the rules would refuse: a stamped room overlapping a room already there (sharing an edge is fine; a yard, lane or
 * roof area is outside ground, so building on it is fine), or a wall already there running through a stamped room.
 */
export function fitProblems(d: Campus, it: PresetItems, levelOf: (rel: string) => string | null): FitProblem[] {
  const out: FitProblem[] = [];
  for (const r of it.rooms) {
    const lv = levelOf(r.level);
    if (!lv) continue;
    const a = r.rect;
    for (const q of d.rooms) {
      if (q.level !== lv || OUTSIDE.has(q.kind)) continue;
      const b = q.rect;
      const w = Math.min(a[2], b[2]) - Math.max(a[0], b[0]);
      const h = Math.min(a[3], b[3]) - Math.max(a[1], b[1]);
      if (w > EPS * 10 && h > EPS * 10) out.push({ words: `overlaps ${roomName(q)} by ${fmt(Math.min(w, h))} m`, level: lv, rect: [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])] });
    }
    for (const w of d.walls) {
      if (w.level !== lv) continue;
      const l = wallLine(w);
      if (!l) continue;
      // the part of the wall's centre line strictly inside the room (its edges are fine: that wall is reused)
      const inside = l.axis === 'x' ? l.v > a[0] + w.t / 2 + EPS && l.v < a[2] - w.t / 2 - EPS : l.v > a[1] + w.t / 2 + EPS && l.v < a[3] - w.t / 2 - EPS;
      if (!inside) continue;
      const lo = Math.max(l.lo, l.axis === 'x' ? a[1] : a[0]);
      const hi = Math.min(l.hi, l.axis === 'x' ? a[3] : a[2]);
      if (hi - lo > 0.05) {
        out.push({ words: `wall ${w.id} runs through ${roomName(r)} for ${fmt(hi - lo)} m`, level: lv, rect: l.axis === 'x' ? [l.v - w.t / 2, lo, l.v + w.t / 2, hi] : [lo, l.v - w.t / 2, hi, l.v + w.t / 2] });
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------- stamping (decision 3)

export interface StampResult {
  changes: Change[];
  keys: Key[];
  words: string;
  reused: number;
  skippedDoors: number;
}

/**
 * The changes that stamp a placed group on `level` as one edit: fresh ids (rooms `<level>-NEW`, walls `W<level>-NEW`,
 * doors `O-NEW`, objects `O001`, stairs `V-STAIR`, holes `V<level>-NEW`, ladders `LD-NEW`), walls only where no wall is
 * already on the line (an existing wall is reused and the door moves onto it), walls as high as their level, rooms in the
 * building under them. A stair's well comes from the model's stairwell link (vertical.ts), so the group's own well is
 * dropped. Returns `{ why }` when a level is missing or the fit check refuses.
 */
export function stampChanges(d: Campus, pr: RoomPreset, it: PresetItems, level: string): StampResult | { why: string } {
  const levelOf = levelMap(d, level);
  for (const lvRel of new Set([...it.rooms.map((r) => r.level), ...it.walls.map((w) => w.level), ...it.stairs.flatMap((s) => [s.from, s.to]), ...it.voids.map((v) => v.level), ...it.objects.map((o) => o.level)]))
    if (!levelOf(lvRel)) return { why: `${pr.name} needs ${lvRel === '+1' ? 'a level above this one' : `${lvRel.slice(1)} levels above this one`}` };
  const bad = fitProblems(d, it, levelOf);
  if (bad.length) return { why: `Cannot stamp ${pr.name} here: ${bad[0]!.words}${bad.length > 1 ? ` (and ${bad.length - 1} more)` : ''}` };
  const lv = (r: string): string => levelOf(r)!;
  const taken = new Map<Coll, Set<string>>();
  const fresh = (coll: Coll, prefix: string, pad = 0): string => {
    let s = taken.get(coll);
    if (!s) taken.set(coll, (s = new Set(((d[coll] as Elem[] | undefined) ?? []).map((e) => e.id))));
    for (let n = 1; ; n++) {
      const id = `${prefix}${pad ? String(n).padStart(pad, '0') : n}`;
      if (!s.has(id)) {
        s.add(id);
        return id;
      }
    }
  };
  const changes: Change[] = [];
  const keys: Key[] = [];
  const add = (coll: Coll, e: Elem): void => {
    changes.push({ coll, id: e.id, before: null, after: e });
    keys.push(keyOf(coll, e.id));
  };
  const height = (l: string): number => d.levels.find((q) => q.id === l)?.height ?? 3;
  // rooms
  const roomIds = new Map<string, string>();
  const newRooms: Room[] = [];
  for (const r0 of it.rooms) {
    const r = clone(r0);
    r.level = lv(r0.level);
    r.id = fresh('rooms', `${r.level}-NEW`);
    roomIds.set(r0.id, r.id);
    delete r.building;
    const b = buildingAt(d.meta.buildings as Building[] | undefined, (r.rect[0] + r.rect[2]) / 2, (r.rect[1] + r.rect[3]) / 2);
    if (b !== 'site') r.building = b;
    newRooms.push(r);
    add('rooms', r);
  }
  // walls: only the spans no wall covers; remember which new or existing wall carries each point of a group wall
  const allWalls: Wall[] = [...d.walls];
  const carriers = new Map<string, { line: Line; level: string; mine: Wall[] }>();
  let reused = 0;
  for (const w0 of it.walls) {
    const l = wallLine(w0);
    if (!l) continue;
    const level = lv(w0.level);
    const spans = missingSpans(allWalls, level, l);
    const mine: Wall[] = [];
    for (const [a, b] of spans) {
      const w = clone(w0);
      w.id = fresh('walls', `W${level}-NEW`);
      w.level = level;
      w.a = l.axis === 'x' ? [l.v, r3(a)] : [r3(a), l.v];
      w.b = l.axis === 'x' ? [l.v, r3(b)] : [r3(b), l.v];
      w.h = height(level);
      mine.push(w);
      allWalls.push(w);
      add('walls', w);
    }
    const covered = spans.reduce((s, [a, b]) => s + b - a, 0);
    if (covered < l.hi - l.lo - EPS) reused++;
    carriers.set(w0.id, { line: l, level, mine });
  }
  // doors and windows: onto the wall now carrying their span (a reused wall keeps its own doors: an overlap skips the new one)
  const rooms = [...d.rooms, ...newRooms];
  const doorsOn = (wid: string): Opening[] => [...d.openings, ...changes.filter((c) => c.coll === 'openings').map((c) => c.after as Opening)].filter((o) => o.wall === wid);
  let skippedDoors = 0;
  for (const o0 of it.openings) {
    const w0 = it.walls.find((w) => w.id === o0.wall);
    const c = carriers.get(o0.wall);
    if (!w0 || !c) continue;
    const dir = wallLen(w0) > EPS ? [(w0.b[0] - w0.a[0]) / wallLen(w0), (w0.b[1] - w0.a[1]) / wallLen(w0)] : [1, 0];
    const centre: Pt = [w0.a[0] + dir[0]! * o0.at, w0.a[1] + dir[1]! * o0.at];
    const s = c.line.axis === 'x' ? centre[1] : centre[0];
    const lo = s - o0.w / 2;
    const hi = s + o0.w / 2;
    const fits = (w: Wall): boolean => {
      const l = wallLine(w);
      return !!l && w.level === c.level && l.axis === c.line.axis && Math.abs(l.v - c.line.v) <= w.t / 2 + EPS && l.lo <= lo + EPS && l.hi >= hi - EPS;
    };
    const host = c.mine.find(fits) ?? d.walls.find(fits);
    if (!host) {
      skippedDoors++;
      continue;
    }
    const hl = wallLine(host)!;
    const hostA = host.a[c.line.axis === 'x' ? 1 : 0];
    const at = r3(hostA <= hl.lo + EPS ? s - hl.lo : hl.hi - s);
    const clash = doorsOn(host.id).some((q) => Math.abs(q.at - at) < (q.w + o0.w) / 2 - EPS);
    if (clash) {
      skippedDoors++;
      continue;
    }
    let text = JSON.stringify(o0);
    for (const [a, b] of roomIds) text = text.split(`"${a}"`).join(`"${b}"`);
    const o = JSON.parse(text) as Opening;
    o.id = fresh('openings', 'O-NEW');
    o.wall = host.id;
    o.at = at;
    o.h = Math.min(o.h, host.h - o.sill);
    o.between = roomsEitherSide(host, at, rooms);
    add('openings', o);
  }
  // stairs (risers from the rule for the real rise), their wells come from the stairwell link
  const stairOf = new Set<string>();
  for (const s0 of it.stairs) {
    const s = clone(s0);
    s.id = fresh('stairs', 'V-STAIR');
    s.from = lv(s0.from);
    s.to = lv(s0.to);
    const rise = (d.levels.find((q) => q.id === s.to)?.floor ?? 0) - (d.levels.find((q) => q.id === s.from)?.floor ?? 0);
    s.risers = Math.max(1, Math.ceil(rise / facts.stair.riserHeight.value - EPS));
    stairOf.add(`${s.to}|${s.rect.join()}`);
    add('stairs', s);
  }
  for (const v0 of it.voids) {
    const v = clone(v0);
    v.level = lv(v0.level);
    if (v.kind === 'stairwell' && stairOf.has(`${v.level}|${v.rect.join()}`)) continue;
    v.id = fresh('voids', `V${v.level}-NEW`);
    add('voids', v);
  }
  for (const l0 of it.ladders) {
    const l = clone(l0);
    l.id = fresh('ladders', 'LD-NEW');
    l.from = lv(l0.from);
    l.to = lv(l0.to);
    if (typeof l.room === 'string' && roomIds.has(l.room)) l.room = roomIds.get(l.room);
    add('ladders', l);
  }
  for (const o0 of it.objects) {
    const o = clone(o0);
    o.id = fresh('objects', 'O', 3);
    o.level = lv(o0.level);
    add('objects', o);
  }
  const n = (k: number, one: string, many: string): string => `${k} ${k === 1 ? one : many}`;
  const parts = [n(newRooms.length, 'room', 'rooms'), `${n(changes.filter((c) => c.coll === 'walls').length, 'new wall', 'new walls')}${reused ? ` (${n(reused, 'wall', 'walls')} reused)` : ''}`];
  const doors = changes.filter((c) => c.coll === 'openings').length;
  if (doors) parts.push(n(doors, 'door or window', 'doors and windows'));
  if (it.objects.length) parts.push(n(it.objects.length, 'object', 'objects'));
  if (it.stairs.length) parts.push(n(it.stairs.length, 'stair', 'stairs'));
  return { changes, keys, words: `Stamped ${pr.name}: ${parts.join(', ')}${skippedDoors ? `; ${n(skippedDoors, 'door', 'doors')} left out (a door is already there)` : ''}`, reused, skippedDoors };
}

// ---------------------------------------------------------------- your own presets (decision 5)

/**
 * A preset from a selection on `level`: the selected rooms, walls, holes, stairs and ladders, the doors and windows on
 * the selected walls (or, with no wall selected, walls made along the selected rooms' edges carrying the doors already
 * there), and every object standing wholly inside a selected room. Moved to the origin; levels made relative.
 */
export function presetFromSelection(d: Campus, keys: readonly Key[], level: string, name: string, id: string): RoomPreset | null {
  const ls = d.levels.slice().sort((a, b) => a.floor - b.floor);
  const i0 = ls.findIndex((l) => l.id === level);
  const relOf = (l: string): string => rel(Math.max(0, ls.findIndex((q) => q.id === l) - i0));
  const it = emptyItems();
  const get = <T extends Elem>(coll: Coll, k: string): T | undefined => ((d[coll] as Elem[] | undefined) ?? []).find((e) => e.id === k) as T | undefined;
  for (const k of keys) {
    const p = parseKey(k);
    const e = p ? get(p.coll, p.id) : undefined;
    if (!p || !e) continue;
    if (p.coll === 'rooms' || p.coll === 'walls' || p.coll === 'voids' || p.coll === 'objects') (it[p.coll] as Elem[]).push(clone(e));
    else if (p.coll === 'stairs' || p.coll === 'ladders') (it[p.coll] as Elem[]).push(clone(e));
  }
  if (!it.rooms.length && !it.walls.length && !it.objects.length) return null;
  if (it.walls.length) {
    const ids = new Set(it.walls.map((w) => w.id));
    it.openings = d.openings.filter((o) => ids.has(o.wall)).map((o) => clone(o));
  } else if (it.rooms.length) {
    // one room picked: its edges become walls of the preset, with the doors and windows on those edges
    const made = edgeWalls(it.rooms, itemsBounds(it), []);
    for (const w of made) {
      const l = wallLine(w)!;
      const like = d.walls.find((q) => onLine(q, w.level, l));
      if (like) {
        w.t = like.t;
        w.kind = like.kind;
      }
      w.id = `PW-${w.id}`;
      for (const o of d.openings) {
        const host = d.walls.find((q) => q.id === o.wall);
        const hl = host && host.level === w.level ? wallLine(host) : null;
        if (!host || !hl || hl.axis !== l.axis || Math.abs(hl.v - l.v) > host.t / 2 + EPS) continue;
        const s = host.a[l.axis === 'x' ? 1 : 0] <= hl.lo + EPS ? hl.lo + o.at : hl.hi - o.at;
        if (s - o.w / 2 < l.lo - EPS || s + o.w / 2 > l.hi + EPS) continue;
        it.openings.push({ ...clone(o), wall: w.id, at: r3(s - l.lo) });
      }
    }
    it.walls = made;
  }
  const roomRects = it.rooms.map((r) => [r.level, r.rect] as const);
  const inRoom = (o: Obj): boolean => roomRects.some(([l, r]) => l === o.level && o.rect[0] >= r[0] - EPS && o.rect[1] >= r[1] - EPS && o.rect[2] <= r[2] + EPS && o.rect[3] <= r[3] + EPS);
  for (const o of d.objects ?? []) if (!it.objects.some((q) => q.id === o.id) && inRoom(o)) it.objects.push(clone(o));
  const b = itemsBounds(it);
  const moved: PresetItems = placedItems({ id, name, from: 'mine', size: [0, 0], src: '', items: it }, [-b[0], -b[1]], 0).items;
  for (const r of moved.rooms) {
    r.level = relOf(r.level);
    delete r.building;
  }
  for (const w of moved.walls) w.level = relOf(w.level);
  for (const v of moved.voids) v.level = relOf(v.level);
  for (const o of moved.objects) o.level = relOf(o.level);
  for (const s of moved.stairs) {
    s.from = relOf(s.from);
    s.to = relOf(s.to);
  }
  for (const l of moved.ladders) {
    l.from = relOf(l.from);
    l.to = relOf(l.to);
  }
  return { id, name, from: 'mine', size: [r3(b[2] - b[0]), r3(b[3] - b[1])], src: `saved in the level editor from ${level}`, items: moved };
}

/** A fresh id for an own preset: mine.1, mine.2 ... */
export function mineId(list: readonly RoomPreset[]): string {
  const used = new Set(list.map((p) => p.id));
  for (let n = 1; ; n++) if (!used.has(`mine.${n}`)) return `mine.${n}`;
}

export const MINE_FILE = 'docs/kestrel/editor-presets.json';

/** The own-presets file text (schema.md section 2, "Own presets"). */
export function mineText(list: readonly RoomPreset[]): string {
  return JSON.stringify({ about: 'Level editor presets saved by Michael (Selected > Save as preset). Format: docs/kestrel/schema.md, own presets.', presets: list }, null, 1) + '\n';
}

/** The own presets from the file text (a missing or broken file is an empty list; bad entries are left out). */
export function readMine(text: string): RoomPreset[] {
  try {
    const raw = JSON.parse(text) as { presets?: unknown };
    if (!Array.isArray(raw.presets)) return [];
    return raw.presets
      .filter((p): p is RoomPreset => !!p && typeof p === 'object' && typeof (p as RoomPreset).id === 'string' && typeof (p as RoomPreset).name === 'string' && !!(p as RoomPreset).items)
      .map((p) => {
        const items = emptyItems();
        for (const c of ITEM_COLLS) if (Array.isArray(p.items[c])) (items[c] as Elem[]) = p.items[c] as Elem[];
        return { ...p, from: 'mine' as const, items };
      });
  } catch {
    return [];
  }
}

/** "3 rooms, 9 walls, 12 objects" for the tile's second line. */
export function presetWords(p: RoomPreset): string {
  const it = p.items;
  // fix-up 2026-10-14: tile words, short: the size, then the objects (or the rooms, or the stair)
  const parts: string[] = [`${fmt(p.size[0])} x ${fmt(p.size[1])} m`];
  if (it.objects.length) parts.push(`${it.objects.length} object${it.objects.length === 1 ? '' : 's'}`);
  else if (it.rooms.length > 1) parts.push(`${it.rooms.length} rooms`);
  else if (it.stairs.length) parts.push('stair');
  else parts.push('empty room');
  return parts.join(', ');
}
