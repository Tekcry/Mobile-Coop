/**
 * ON14: mirror, align, evenly space and Array, pure and Babylon-free (tests/editor/arrange.test.ts).
 *
 * Every function takes the campus and a selection (keys) and returns element changes for one commit (one undo step).
 * A selected room brings its own walls (walls lying on its edges, ED3-3a `onLine`, no longer than the edge) with their
 * doors and windows, and what stands inside it: objects, signs, floor holes, stairs, ladders and its lamps. The ED3-3a
 * wall rules are kept: a moved wall landing on an existing wall is dropped and that wall reused (its doors move onto it),
 * a room edge that had walls and has none at the new place gets new ones, a wall shared with a room that does not move
 * stays (a copy is made where needed), and every moved door's `between` is worked out again. Doors keep their hinge
 * mirrored, stairs their climb, objects, ladders, lamps and signs their facing (a sign's left / right arrow swaps).
 */
import type { Change } from './model';
import type { Campus, Coll, Elem, Key, Ladder, Opening, Pt, Rect, Room, Stair, Wall } from './types';
import { keyOf, parseKey } from './types';
import { edgeLine, EDGES, idMaker, missingSpans, onLine, wallLine } from './roomWalls';
import { EPS, fmt, roomsEitherSide, wallDir, wallLen, wallPoint } from './geometry';
import { hangsAtA, leftEnd } from '../world/maps/kestrelDoors';
import type { DoorData } from './openingCatalogue';
import type { SignRecord } from './signs';
import type { LampRecord } from '../world/maps/kestrelLights';

export type Axis = 'x' | 'z';
export type AlignMode = 'left' | 'right' | 'bottom' | 'top' | 'cx' | 'cz';
export const ALIGN_MODES: readonly { id: AlignMode; name: string }[] = [
  { id: 'left', name: 'Align left (west)' },
  { id: 'right', name: 'Align right (east)' },
  { id: 'top', name: 'Align top (north)' },
  { id: 'bottom', name: 'Align bottom (south)' },
  { id: 'cx', name: 'Align centres (x)' },
  { id: 'cz', name: 'Align centres (z)' },
];

export interface ArrangeResult {
  changes: Change[];
  words: string;
  /** The keys of what was made (Array) or moved. */
  keys: Key[];
  why?: string;
}

/** The collections arranging works on (the rest ride along or are left alone). */
const ARR_COLLS = ['rooms', 'walls', 'openings', 'objects', 'signs', 'voids', 'stairs', 'ladders', 'lamps'] as const;
type ArrColl = (typeof ARR_COLLS)[number];
const isArr = (c: Coll): c is ArrColl => (ARR_COLLS as readonly string[]).includes(c);

const r3 = (v: number): number => +v.toFixed(3);
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const list = (d: Campus, c: ArrColl): Elem[] => (d[c] as Elem[] | undefined) ?? [];
const inRect = (r: Rect, x: number, z: number): boolean => x >= r[0] - EPS && x <= r[2] + EPS && z >= r[1] - EPS && z <= r[3] + EPS;
const rectIn = (outer: Rect, r: readonly number[]): boolean => inRect(outer, r[0]!, r[1]!) && inRect(outer, r[2]!, r[3]!);

/** A set of element ids per collection. */
type Members = Map<ArrColl, Set<string>>;
const add = (m: Members, c: ArrColl, id: string): void => {
  let s = m.get(c);
  if (!s) m.set(c, (s = new Set()));
  s.add(id);
};
const has = (m: Members, c: ArrColl, id: string): boolean => !!m.get(c)?.has(id);

/** A wall lying on an edge of the room and no longer than it (the room's own wall). */
export function ownWalls(d: Campus, r: Room): Wall[] {
  return d.walls.filter((w) => {
    const wl = wallLine(w);
    if (!wl) return false;
    return EDGES.some((e) => {
      const l = edgeLine(r.rect, e);
      return onLine(w, r.level, l) && wl.lo >= l.lo - EPS && wl.hi <= l.hi + EPS;
    });
  });
}

/** What a room brings along: its own walls and what stands inside it on its level. */
function roomMembers(d: Campus, r: Room, m: Members): void {
  add(m, 'rooms', r.id);
  for (const w of ownWalls(d, r)) add(m, 'walls', w.id);
  for (const o of (d.objects ?? []) as Elem[]) if ((o as Room).level === r.level && rectIn(r.rect, (o as Room).rect)) add(m, 'objects', o.id);
  for (const v of d.voids) if (v.level === r.level && rectIn(r.rect, v.rect)) add(m, 'voids', v.id);
  for (const s of d.stairs) if (s.from === r.level && rectIn(r.rect, s.rect)) add(m, 'stairs', s.id);
  for (const l of d.ladders) if (l.from === r.level && inRect(r.rect, l.at[0], l.at[1])) add(m, 'ladders', l.id);
  for (const s of d.signs ?? []) if (s.level === r.level && inRect(r.rect, s.at[0], s.at[1])) add(m, 'signs', s.id);
  for (const l of (d.lamps ?? []) as LampRecord[]) if (l.room === r.id) add(m, 'lamps', l.id);
}

/** One thing that moves as a whole (a room with what it brings, or one element), in selection order. */
export interface Unit {
  lead: Key;
  members: Members;
}

/** The units of a selection: a room takes its walls and contents; anything a selected room already takes is not its own unit. */
export function unitsOf(d: Campus, keys: readonly Key[]): Unit[] {
  const units: Unit[] = [];
  const taken: Members = new Map();
  const parsed = keys.map((k) => ({ k, p: parseKey(k) })).filter((x): x is { k: Key; p: { coll: Coll; id: string } } => !!x.p && isArr(x.p.coll));
  for (const { k, p } of parsed) {
    if (p.coll !== 'rooms') continue;
    const r = d.rooms.find((q) => q.id === p.id);
    if (!r) continue;
    const m: Members = new Map();
    roomMembers(d, r, m);
    for (const [c, s] of m) for (const id of s) add(taken, c, id);
    units.push({ lead: k, members: m });
  }
  for (const { k, p } of parsed) {
    const c = p.coll as ArrColl;
    if (c === 'rooms' || has(taken, c, p.id) || !list(d, c).some((e) => e.id === p.id)) continue;
    const m: Members = new Map();
    add(m, c, p.id);
    add(taken, c, p.id);
    units.push({ lead: k, members: m });
  }
  // keep the selection order (the first picked first)
  const order = new Map(keys.map((k, i) => [k, i]));
  return units.sort((a, b) => (order.get(a.lead) ?? 0) - (order.get(b.lead) ?? 0));
}

/** The plan bounds of an element. */
function elemBounds(d: Campus, c: ArrColl, e: Elem): Rect | null {
  if (c === 'rooms' || c === 'objects' || c === 'voids' || c === 'stairs') return (e as Room).rect.slice() as Rect;
  if (c === 'walls') {
    const w = e as Wall;
    return [Math.min(w.a[0], w.b[0]), Math.min(w.a[1], w.b[1]), Math.max(w.a[0], w.b[0]), Math.max(w.a[1], w.b[1])];
  }
  if (c === 'ladders') return [(e as Ladder).at[0], (e as Ladder).at[1], (e as Ladder).at[0], (e as Ladder).at[1]];
  if (c === 'signs') {
    const s = e as SignRecord;
    const h = s.size[0] / 2;
    const along = s.facing % 180 === 0;
    return along ? [s.at[0] - h, s.at[1], s.at[0] + h, s.at[1]] : [s.at[0], s.at[1] - h, s.at[0], s.at[1] + h];
  }
  if (c === 'lamps') {
    const l = e as LampRecord;
    const b = l.b ?? l.at;
    return [Math.min(l.at[0], b[0]), Math.min(l.at[2], b[2]), Math.max(l.at[0], b[0]), Math.max(l.at[2], b[2])];
  }
  if (c === 'openings') {
    const o = e as Opening;
    const w = d.walls.find((q) => q.id === o.wall);
    if (!w) return null;
    const p = wallPoint(w, o.at);
    return [p[0], p[1], p[0], p[1]];
  }
  return null;
}

/** The plan bounds of a unit (a room unit: the room's rect). */
export function unitBounds(d: Campus, u: Unit): Rect {
  const p = parseKey(u.lead);
  if (p?.coll === 'rooms') {
    const r = d.rooms.find((q) => q.id === p.id);
    if (r) return r.rect.slice() as Rect;
  }
  return boundsOf(d, u.members);
}

function boundsOf(d: Campus, m: Members): Rect {
  const b: Rect = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [c, ids] of m)
    for (const id of ids) {
      const e = list(d, c).find((x) => x.id === id);
      const r = e ? elemBounds(d, c, e) : null;
      if (!r) continue;
      b[0] = Math.min(b[0], r[0]);
      b[1] = Math.min(b[1], r[1]);
      b[2] = Math.max(b[2], r[2]);
      b[3] = Math.max(b[3], r[3]);
    }
  return Number.isFinite(b[0]) ? b : [0, 0, 0, 0];
}

// ---------- the transform ----------

/** A plan transform: a mirror (`flip` set) or a move. */
interface Xf {
  p: (q: Pt) => Pt;
  flip: Axis | null;
}
const mirrorXf = (axis: Axis, c: number): Xf => ({ p: (q) => (axis === 'x' ? [r3(2 * c - q[0]), q[1]] : [q[0], r3(2 * c - q[1])]), flip: axis });
const moveXf = (dx: number, dz: number): Xf => ({ p: (q) => [r3(q[0] + dx), r3(q[1] + dz)], flip: null });

const flipYaw = (yaw: number, axis: Axis): number => (((axis === 'x' ? 360 - yaw : 540 - yaw) % 360) + 360) % 360;
const FLIP_DIR: Record<Axis, Record<string, string>> = { x: { E: 'W', W: 'E', N: 'N', S: 'S' }, z: { N: 'S', S: 'N', E: 'E', W: 'W' } };
const flipSide = (v: unknown): unknown => (v === 'left' ? 'right' : v === 'right' ? 'left' : v);

function xfRect(r: Rect, f: Xf): Rect {
  const a = f.p([r[0], r[1]]);
  const b = f.p([r[2], r[3]]);
  return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])];
}

/** One element under a transform (a copy). Openings are handled with their walls. */
function xfElem(c: ArrColl, e: Elem, f: Xf): Elem {
  const o = clone(e) as Elem & Record<string, unknown>;
  if (c === 'rooms' || c === 'voids') o.rect = xfRect((e as Room).rect, f);
  else if (c === 'objects') {
    o.rect = xfRect((e as Room).rect, f);
    if (f.flip && typeof o.yaw === 'number' && o.yaw) o.yaw = flipYaw(o.yaw, f.flip);
  } else if (c === 'stairs') {
    o.rect = xfRect((e as Stair).rect, f);
    if (f.flip) o.up = FLIP_DIR[f.flip][(e as Stair).up] ?? (e as Stair).up;
  } else if (c === 'walls') {
    o.a = f.p((e as Wall).a);
    o.b = f.p((e as Wall).b);
  } else if (c === 'ladders') {
    o.at = f.p((e as Ladder).at);
    if (f.flip && typeof o.facing === 'string') o.facing = FLIP_DIR[f.flip][o.facing] ?? o.facing;
  } else if (c === 'signs') {
    const s = e as SignRecord;
    o.at = f.p(s.at);
    if (f.flip) {
      o.facing = flipYaw(s.facing, f.flip);
      o.arrow = flipSide(s.arrow);
    }
  } else if (c === 'lamps') {
    const l = e as LampRecord;
    const at = f.p([l.at[0], l.at[2]]);
    o.at = [at[0], l.at[1], at[1]];
    if (l.b) {
      const b = f.p([l.b[0], l.b[2]]);
      o.b = [b[0], l.b[1], b[1]];
    }
    if (f.flip && typeof l.yaw === 'number' && l.yaw) o.yaw = flipYaw(l.yaw, f.flip);
    if (f.flip && l.aim) o.aim = [flipYaw(l.aim[0], f.flip), l.aim[1]];
  }
  return o as Elem;
}

/** The worked copy of the collections arranging touches. */
type Work = Record<ArrColl, Elem[]>;
const workOf = (d: Campus): Work => Object.fromEntries(ARR_COLLS.map((c) => [c, clone(list(d, c))])) as Work;

/** Changes between the campus and the worked copy (adds, edits, deletes; deletes keep their index). */
function diff(d: Campus, w: Work): Change[] {
  const out: Change[] = [];
  for (const c of ARR_COLLS) {
    const before = list(d, c);
    const bm = new Map(before.map((e) => [e.id, e]));
    const am = new Map(w[c].map((e) => [e.id, e]));
    for (const [id, a] of am) {
      const b = bm.get(id) ?? null;
      if (!b || JSON.stringify(b) !== JSON.stringify(a)) out.push({ coll: c, id, before: b ? clone(b) : null, after: clone(a) });
    }
    for (const [id, b] of bm) if (!am.has(id)) out.push({ coll: c, id, before: clone(b), after: null, index: before.indexOf(b) });
  }
  return out;
}

/** A door or window that must find a wall again: its world centre and hinge point after the transform. */
interface Rider {
  id: string;
  p: Pt;
  hinge: Pt | null;
}

/** The world point of an opening's hinge end (a door), or null. */
function hingePoint(o: Opening, w: Wall, rooms: readonly Room[]): Pt | null {
  if (!o.door && !['door', 'fire-door', 'glass-door', 'gate', 'hatch'].includes(o.type)) return null;
  const s = hangsAtA(o, w, rooms) ? o.at - o.w / 2 : o.at + o.w / 2;
  return wallPoint(w, s);
}

/** The wall on the level whose line passes through p with room for an opening of width `ow` there. */
function wallThrough(walls: readonly Wall[], level: string, p: Pt, ow: number, skip: ReadonlySet<string>): { w: Wall; s: number } | null {
  for (const w of walls) {
    if (w.level !== level || skip.has(w.id)) continue;
    const d = wallDir(w);
    const s = (p[0] - w.a[0]) * d[0] + (p[1] - w.a[1]) * d[1];
    const off = Math.abs((p[0] - w.a[0]) * -d[1] + (p[1] - w.a[1]) * d[0]);
    if (off <= w.t / 2 + 1e-3 && s >= ow / 2 - 1e-3 && s <= wallLen(w) - ow / 2 + 1e-3) return { w, s: r3(s) };
  }
  return null;
}

/**
 * The shared step: each group of members under its transform, then the ED3-3a wall rules (reuse, fill, re-home doors,
 * `between`). `stay`: walls shared with a room that does not move stay where they are.
 */
function apply(d: Campus, groups: readonly { m: Members; f: Xf }[], stay: boolean): { work: Work; kept: number } {
  const w = workOf(d);
  const moving: Members = new Map();
  for (const g of groups) for (const [c, s] of g.m) for (const id of s) add(moving, c, id);
  const movingRooms = new Set(moving.get('rooms') ?? []);
  const riders: Rider[] = [];
  const wallXf = new Map<string, Xf>();
  const touched = new Set<string>();
  const fillEdges: { room: Room; next: Rect; lines: { axis: 'x' | 'z'; t: number; kind: string; h: number }[] }[] = [];
  for (const g of groups) {
    const f = g.f;
    // walls first: shared ones stay (a copy where the room lands comes from the fill below)
    for (const id of g.m.get('walls') ?? []) {
      const wall = d.walls.find((q) => q.id === id)!;
      if (stay && isShared(d, wall, movingRooms)) {
        touched.add(wall.id);
        continue;
      }
      wallXf.set(id, f);
    }
    // rooms: remember which edges had walls (the fill)
    for (const id of g.m.get('rooms') ?? []) {
      const r = d.rooms.find((q) => q.id === id)!;
      const next = xfRect(r.rect, f);
      const lines: (typeof fillEdges)[number]['lines'] = [];
      for (const e of EDGES) {
        const l = edgeLine(r.rect, e);
        const on = d.walls.find((x) => onLine(x, r.level, l));
        if (!on) continue;
        // the edge's line after the transform
        const t = l.axis === 'x' ? f.p([l.v, l.lo])[0] : f.p([l.lo, l.v])[1];
        lines.push({ axis: l.axis, t, kind: on.kind, h: on.h });
      }
      fillEdges.push({ room: r, next, lines });
    }
    for (const c of ARR_COLLS) {
      if (c === 'walls' || c === 'openings') continue;
      for (const id of g.m.get(c) ?? []) {
        const i = w[c].findIndex((e) => e.id === id);
        if (i >= 0) w[c][i] = xfElem(c, w[c][i]!, f);
      }
    }
  }
  // doors and windows on edges of moving rooms but on walls that do not move: they find a wall again
  const roomsBefore = d.rooms;
  for (const g of groups)
    for (const rid of g.m.get('rooms') ?? []) {
      const r = d.rooms.find((q) => q.id === rid)!;
      for (const o of d.openings) {
        if (wallXf.has(o.wall)) continue;
        const wall = d.walls.find((q) => q.id === o.wall);
        if (!wall || wall.level !== r.level) continue;
        const p = wallPoint(wall, o.at);
        const onEdge = EDGES.some((e) => {
          const l = edgeLine(r.rect, e);
          return onLine(wall, r.level, l) && (l.axis === 'x' ? p[1] > l.lo + EPS && p[1] < l.hi - EPS : p[0] > l.lo + EPS && p[0] < l.hi - EPS);
        });
        if (!onEdge || riders.some((x) => x.id === o.id)) continue;
        const h = hingePoint(o, wall, roomsBefore);
        riders.push({ id: o.id, p: g.f.p(p), hinge: h ? g.f.p(h) : null });
      }
    }
  // selected doors and windows on their own: a mirror flips the hinge in place; a move or a line takes them along
  for (const g of groups)
    for (const id of g.m.get('openings') ?? []) {
      const o = d.openings.find((q) => q.id === id);
      const wall = o ? d.walls.find((q) => q.id === o.wall) : undefined;
      if (!o || !wall || wallXf.has(wall.id) || riders.some((x) => x.id === id)) continue;
      const h = hingePoint(o, wall, roomsBefore);
      riders.push({ id, p: g.f.p(wallPoint(wall, o.at)), hinge: h ? g.f.p(h) : null });
    }
  // moving walls (their doors ride: `at` from a stays right as both ends move; a mirror flips a set hinge side)
  for (const [id, f] of wallXf) {
    const i = w.walls.findIndex((e) => e.id === id);
    w.walls[i] = xfElem('walls', w.walls[i]!, f);
    touched.add(id);
    if (!f.flip) continue;
    for (const o of w.openings as Opening[]) {
      if (o.wall !== id || !o.door) continue;
      const dd = o.door as DoorData;
      if (dd.hinge) dd.hinge = flipSide(dd.hinge) as DoorData['hinge'];
      if (dd.stack) dd.stack = flipSide(dd.stack) as DoorData['stack'];
    }
  }
  // reuse: a moved wall lying on a wall that stays is dropped; its doors move onto that wall
  const walls = w.walls as Wall[];
  for (const id of [...wallXf.keys()]) {
    const mw = walls.find((q) => q.id === id)!;
    const ml = wallLine(mw);
    if (!ml) continue;
    const host = walls.find((x) => x.id !== id && !wallXf.has(x.id) && onLine(x, mw.level, ml) && wallLine(x)!.lo <= ml.lo + EPS && wallLine(x)!.hi >= ml.hi - EPS);
    if (!host) continue;
    for (const o of w.openings as Opening[]) if (o.wall === id) riders.push({ id: o.id, p: wallPoint(mw, o.at), hinge: hingePointOrNull(o, mw, w.rooms as Room[]) });
    w.walls.splice(w.walls.indexOf(mw), 1);
    wallXf.delete(id);
    touched.add(host.id);
  }
  // fill: an edge that had walls and has none at the new place gets them (the room's wall kind and height)
  const ids = idMaker(d.walls.map((x) => x.id));
  for (const fe of fillEdges) {
    for (const e of EDGES) {
      const l = edgeLine(fe.next, e);
      const had = fe.lines.find((q) => q.axis === l.axis && Math.abs(q.t - l.v) < EPS);
      if (!had) continue;
      for (const [a, b] of missingSpans(walls, fe.room.level, l)) {
        const nw: Wall = { id: ids(`W${fe.room.level}-NEW`), level: fe.room.level, a: l.axis === 'x' ? [r3(l.v), r3(a)] : [r3(a), r3(l.v)], b: l.axis === 'x' ? [r3(l.v), r3(b)] : [r3(b), r3(l.v)], t: wallT(d, had.kind), h: had.h, kind: had.kind };
        walls.push(nw);
        touched.add(nw.id);
      }
    }
  }
  // re-home riders onto the wall through their new point
  let kept = 0;
  for (const rd of riders) {
    const o = (w.openings as Opening[]).find((q) => q.id === rd.id);
    if (!o) continue;
    const lv = d.walls.find((q) => q.id === o.wall)?.level ?? (walls.find((q) => q.id === o.wall)?.level ?? '');
    const hit = wallThrough(walls, lv, rd.p, o.w, new Set());
    if (!hit) {
      kept++;
      continue;
    }
    o.wall = hit.w.id;
    o.at = hit.s;
    touched.add(hit.w.id);
    (o as Opening & { _hinge?: Pt | null })._hinge = rd.hinge;
  }
  // between, then the swing and one-way rooms and the hinge side of re-homed doors
  for (const o of w.openings as (Opening & { _hinge?: Pt | null })[]) {
    if (!touched.has(o.wall)) continue;
    const wall = walls.find((q) => q.id === o.wall);
    if (!wall) continue;
    o.between = roomsEitherSide(wall, o.at, w.rooms as Room[]);
    const dd = o.door as DoorData | undefined;
    if (dd?.swing !== undefined && !o.between.includes(dd.swing)) dd.swing = o.between.find((r) => movingRooms.has(r)) ?? o.between[1] ?? '';
    if (dd?.oneWay !== undefined && !o.between.includes(dd.oneWay)) dd.oneWay = o.between.find((r) => r && r !== dd.swing) ?? o.between[0] ?? '';
    if ('_hinge' in o) {
      const h = o._hinge;
      delete o._hinge;
      if (h && o.door) {
        const atA = hyp(wallPoint(wall, o.at - o.w / 2), h) <= hyp(wallPoint(wall, o.at + o.w / 2), h);
        const left = leftEnd(o, wall, w.rooms as Room[]) === 'a';
        (o.door as DoorData).hinge = atA === left ? 'left' : 'right';
      }
    }
  }
  return { work: w, kept };
}

const hyp = (a: Pt, b: Pt): number => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
const hingePointOrNull = (o: Opening, w: Wall, rooms: readonly Room[]): Pt | null => hingePoint(o, w, rooms);
const wallT = (d: Campus, kind: string): number => d.walls.find((q) => q.kind === kind)?.t ?? 0.3;

/** Outside areas (a yard, the lane, a zone, a roof): a wall onto one is the room's own, never shared. */
const OUTSIDE = new Set(['yard', 'lane', 'zone', 'roof']);

/** A wall with a room on either side that does not move (a neighbour keeps it). */
function isShared(d: Campus, w: Wall, moving: ReadonlySet<string>): boolean {
  const L = wallLen(w);
  const inside = d.rooms.filter((r) => !OUTSIDE.has(r.kind));
  for (const s of [L * 0.25, L * 0.5, L * 0.75]) for (const r of roomsEitherSide(w, s, inside)) if (r && !moving.has(r)) return true;
  return false;
}

const NOUN: Record<ArrColl, [string, string]> = { rooms: ['room', 'rooms'], walls: ['wall', 'walls'], openings: ['door or window', 'doors and windows'], objects: ['object', 'objects'], signs: ['sign', 'signs'], voids: ['floor hole', 'floor holes'], stairs: ['stair', 'stairs'], ladders: ['ladder', 'ladders'], lamps: ['lamp', 'lamps'] };
function membersWords(m: Members): string {
  const parts = ARR_COLLS.filter((c) => m.get(c)?.size).map((c) => `${m.get(c)!.size} ${NOUN[c][m.get(c)!.size === 1 ? 0 : 1]}`);
  return parts.length <= 1 ? (parts[0] ?? 'nothing') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}
const keysOf = (m: Members): Key[] => [...m].flatMap(([c, s]) => [...s].map((id) => keyOf(c, id)));

// ---------- mirror (decision 1) ----------

/**
 * Mirror the selection east-west (`axis` 'x': x flips) or north-south ('z') about its own centre, or about the line
 * x = `about` (z = `about`). One commit.
 */
export function mirrorChanges(d: Campus, keys: readonly Key[], axis: Axis, about?: number): ArrangeResult {
  const units = unitsOf(d, keys);
  if (!units.length) return { changes: [], words: '', keys: [], why: 'Select rooms, walls, doors, objects, stairs, ladders, lamps or signs to mirror' };
  const m: Members = new Map();
  for (const u of units) for (const [c, s] of u.members) for (const id of s) add(m, c, id);
  const b = boundsOf(d, m);
  const c = about ?? r3(axis === 'x' ? (b[0] + b[2]) / 2 : (b[1] + b[3]) / 2);
  const { work, kept } = apply(d, [{ m, f: mirrorXf(axis, c) }], about !== undefined);
  const changes = diff(d, work);
  const how = axis === 'x' ? 'east-west' : 'north-south';
  const where = about === undefined ? 'about its centre' : `about ${axis} ${fmt(c)}`;
  const tail = kept ? `; ${kept} door${kept === 1 ? '' : 's'} found no wall and stayed` : '';
  return { changes, words: `Mirrored ${membersWords(m)} ${how} ${where}${tail}`, keys: keysOf(m) };
}

/** A picked line (two points) as the mirror: a line running north-south flips east-west, and the reverse. */
export function lineMirror(a: Pt, b: Pt): { axis: Axis; about: number } {
  return Math.abs(b[0] - a[0]) <= Math.abs(b[1] - a[1]) ? { axis: 'x', about: a[0] } : { axis: 'z', about: a[1] };
}

// ---------- align (decision 2) ----------

const value = (r: Rect, mode: AlignMode): number => (mode === 'left' ? r[0] : mode === 'right' ? r[2] : mode === 'bottom' ? r[1] : mode === 'top' ? r[3] : mode === 'cx' ? (r[0] + r[2]) / 2 : (r[1] + r[3]) / 2);
const snapStep = (v: number, g: number): number => r3(Math.round(v / g) * g);

/** Align two or more things by an edge or centre; `toFirst` lines them up on the first picked instead of the outermost. */
export function alignChanges(d: Campus, keys: readonly Key[], mode: AlignMode, toFirst: boolean, grid: number): ArrangeResult {
  const units = unitsOf(d, keys);
  if (units.length < 2) return { changes: [], words: '', keys: [], why: 'Align needs two or more things selected' };
  const bs = units.map((u) => unitBounds(d, u));
  const all = bs.reduce((a, r) => [Math.min(a[0], r[0]), Math.min(a[1], r[1]), Math.max(a[2], r[2]), Math.max(a[3], r[3])] as Rect, [Infinity, Infinity, -Infinity, -Infinity] as Rect);
  const target = toFirst ? value(bs[0]!, mode) : value(all, mode);
  const xAxis = mode === 'left' || mode === 'right' || mode === 'cx';
  const groups = units.map((u, i) => {
    const dv = snapStep(target - value(bs[i]!, mode), grid);
    return { m: u.members, f: moveXf(xAxis ? dv : 0, xAxis ? 0 : dv), dv };
  });
  const moved = groups.filter((g) => Math.abs(g.dv) > EPS);
  if (!moved.length) return { changes: [], words: '', keys: [], why: 'Already lined up' };
  const { work } = apply(d, moved, true);
  const name = ALIGN_MODES.find((q) => q.id === mode)!.name.replace(/^Align /, '');
  return { changes: diff(d, work), words: `Aligned ${units.length} things: ${name}${toFirst ? ' to the first picked' : ''} (${moved.length} moved)`, keys: units.map((u) => u.lead) };
}

// ---------- evenly space and Array (decision 3) ----------

/** Equal gaps along `axis` between the outer two of three or more (the outer two stay). */
export function distributeChanges(d: Campus, keys: readonly Key[], axis: Axis, grid: number): ArrangeResult {
  const units = unitsOf(d, keys);
  if (units.length < 3) return { changes: [], words: '', keys: [], why: 'Evenly space needs three or more things in a row' };
  const lo = axis === 'x' ? 0 : 1;
  const hi = axis === 'x' ? 2 : 3;
  const items = units.map((u) => ({ u, b: unitBounds(d, u) })).sort((p, q) => p.b[lo] + p.b[hi] - (q.b[lo] + q.b[hi]));
  const first = items[0]!;
  const last = items[items.length - 1]!;
  const sizes = items.reduce((n, it) => n + (it.b[hi] - it.b[lo]), 0);
  const gap = (last.b[hi] - first.b[lo] - sizes) / (items.length - 1);
  if (gap < -EPS) return { changes: [], words: '', keys: [], why: 'They do not fit between the outer two without overlapping' };
  let cur = first.b[hi] + gap;
  const groups: { m: Members; f: Xf }[] = [];
  for (const it of items.slice(1, -1)) {
    const dv = snapStep(cur - it.b[lo], grid);
    if (Math.abs(dv) > EPS) groups.push({ m: it.u.members, f: moveXf(axis === 'x' ? dv : 0, axis === 'x' ? 0 : dv) });
    cur += it.b[hi] - it.b[lo] + gap;
  }
  if (!groups.length) return { changes: [], words: '', keys: [], why: 'Already evenly spaced' };
  const { work } = apply(d, groups, true);
  return { changes: diff(d, work), words: `Evenly spaced ${items.length} things along ${axis}: gaps of ${fmt(gap)} m`, keys: units.map((u) => u.lead) };
}

/** Array: the axis and spacing the dot gives (its offset from the selection's centre along the larger direction, on the grid). */
export function arrayStep(d: Campus, keys: readonly Key[], dot: Pt, grid: number): { axis: Axis; step: number } {
  const units = unitsOf(d, keys);
  const m: Members = new Map();
  for (const u of units) for (const [c, s] of u.members) for (const id of s) add(m, c, id);
  const b = boundsOf(d, m);
  const dx = dot[0] - (b[0] + b[2]) / 2;
  const dz = dot[1] - (b[1] + b[3]) / 2;
  return Math.abs(dx) >= Math.abs(dz) ? { axis: 'x', step: snapStep(dx, grid) } : { axis: 'z', step: snapStep(dz, grid) };
}

/**
 * Array: `n` copies of the selection, each `step` further along `axis` (0.1 m steps). Copies get fresh ids; a copied wall
 * lying on a wall already there is not made (that wall is reused and the copied doors go on it).
 */
export function arrayChanges(d: Campus, keys: readonly Key[], axis: Axis, step: number, n: number): ArrangeResult {
  const units = unitsOf(d, keys);
  if (!units.length) return { changes: [], words: '', keys: [], why: 'Select something to copy' };
  if (n < 1) return { changes: [], words: '', keys: [], why: 'At least one copy' };
  const m: Members = new Map();
  for (const u of units) for (const [c, s] of u.members) for (const id of s) add(m, c, id);
  const b = boundsOf(d, m);
  const size = axis === 'x' ? b[2] - b[0] : b[3] - b[1];
  if (Math.abs(step) < size - 1e-3) return { changes: [], words: '', keys: [], why: `The copies would overlap: the spacing (${fmt(Math.abs(step))} m) is under the size (${fmt(size)} m)` };
  const w = workOf(d);
  const ids = new Map<ArrColl, (prefix: string) => string>(ARR_COLLS.map((c) => [c, idMaker(list(d, c).map((e) => e.id))]));
  const made: Key[] = [];
  const walls = w.walls as Wall[];
  for (let i = 1; i <= n; i++) {
    const f = moveXf(axis === 'x' ? r3(step * i) : 0, axis === 'z' ? r3(step * i) : 0);
    const wallMap = new Map<string, string | null>();
    for (const id of m.get('walls') ?? []) {
      const wall = xfElem('walls', d.walls.find((q) => q.id === id)!, f) as Wall;
      const wl = wallLine(wall);
      const host = wl ? walls.find((x) => onLine(x, wall.level, wl) && wallLine(x)!.lo <= wl.lo + EPS && wallLine(x)!.hi >= wl.hi - EPS) : undefined;
      if (host) {
        wallMap.set(id, null);
        // the copied doors go on the reused wall where nothing is there yet
        for (const o of d.openings.filter((q) => q.wall === id)) {
          const p = f.p(wallPoint(d.walls.find((q) => q.id === id)!, o.at));
          const hit = wallThrough([host], host.level, p, o.w, new Set());
          if (!hit || (w.openings as Opening[]).some((q) => q.wall === host.id && Math.abs(q.at - hit.s) < (q.w + o.w) / 2)) continue;
          const c = { ...clone(o), id: ids.get('openings')!('O-NEW'), wall: host.id, at: hit.s } as Opening;
          w.openings.push(c as Elem);
        }
        continue;
      }
      wall.id = ids.get('walls')!(`W${wall.level}-NEW`);
      wallMap.set(id, wall.id);
      walls.push(wall);
      made.push(keyOf('walls', wall.id));
      for (const o of d.openings.filter((q) => q.wall === id)) w.openings.push({ ...clone(o), id: ids.get('openings')!('O-NEW'), wall: wall.id } as Elem);
    }
    for (const c of ARR_COLLS) {
      if (c === 'walls' || c === 'openings') continue;
      for (const id of m.get(c) ?? []) {
        const src = list(d, c).find((e) => e.id === id);
        if (!src) continue;
        const e = xfElem(c, src, f) as Elem & { level?: string };
        e.id = ids.get(c)!(c === 'rooms' ? `${e.level ?? ''}-NEW` : `${id}-C`);
        if (c === 'rooms' && typeof e.name === 'string' && e.name) e.name = `${e.name} ${i + 1}`;
        if (c === 'lamps') (e as unknown as LampRecord).room = '';
        w[c].push(e);
        made.push(keyOf(c, e.id));
      }
    }
  }
  // lamps follow their copied rooms (a lamp's room is the copy's room under it)
  for (const l of w.lamps as LampRecord[]) {
    if (l.room) continue;
    const r = (w.rooms as Room[]).find((q) => inRect(q.rect, l.at[0], l.at[2]) && made.includes(keyOf('rooms', q.id)));
    l.room = r?.id ?? '';
  }
  for (const o of w.openings as Opening[]) {
    const wall = walls.find((q) => q.id === o.wall);
    if (wall && (made.includes(keyOf('walls', wall.id)) || !d.openings.some((q) => q.id === o.id))) o.between = roomsEitherSide(wall, o.at, w.rooms as Room[]);
  }
  const words = `Array: ${n} cop${n === 1 ? 'y' : 'ies'} of ${membersWords(m)} every ${fmt(Math.abs(step))} m ${axis === 'x' ? (step > 0 ? 'east' : 'west') : step > 0 ? 'north' : 'south'}`;
  return { changes: diff(d, w), words, keys: made };
}

/** The ghost of an Array: each copy's outlines (rooms, objects, holes, stairs as rects; walls as lines). */
export function arrayGhost(d: Campus, keys: readonly Key[], axis: Axis, step: number, n: number): { rects: Rect[]; lines: [Pt, Pt][] } {
  const units = unitsOf(d, keys);
  const m: Members = new Map();
  for (const u of units) for (const [c, s] of u.members) for (const id of s) add(m, c, id);
  const rects: Rect[] = [];
  const lines: [Pt, Pt][] = [];
  for (let i = 1; i <= n; i++) {
    const f = moveXf(axis === 'x' ? step * i : 0, axis === 'z' ? step * i : 0);
    for (const [c, s] of m)
      for (const id of s) {
        const e = list(d, c).find((x) => x.id === id);
        if (!e) continue;
        if (c === 'walls') lines.push([f.p((e as Wall).a), f.p((e as Wall).b)]);
        else {
          const r = elemBounds(d, c, e);
          if (r) rects.push(xfRect(r, f));
        }
      }
  }
  return { rects, lines };
}

/** The mirror's ghost: the outlines after the flip. */
export function mirrorGhost(d: Campus, keys: readonly Key[], axis: Axis, about: number): { rects: Rect[]; lines: [Pt, Pt][] } {
  const units = unitsOf(d, keys);
  const f = mirrorXf(axis, about);
  const rects: Rect[] = [];
  const lines: [Pt, Pt][] = [];
  for (const u of units)
    for (const [c, s] of u.members)
      for (const id of s) {
        const e = list(d, c).find((x) => x.id === id);
        if (!e) continue;
        if (c === 'walls') lines.push([f.p((e as Wall).a), f.p((e as Wall).b)]);
        else {
          const r = elemBounds(d, c, e);
          if (r) rects.push(xfRect(r, f));
        }
      }
  return { rects, lines };
}

