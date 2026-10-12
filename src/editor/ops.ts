/**
 * Editor operations on the campus data: new elements with sensible defaults, deletes that take dependent openings with
 * them, and the plain-English description of any change (the review log). Babylon-free (tests/editor/ops.test.ts).
 */
import { EPS, fmt, moveWords, roomsEitherSide, wallLen } from './geometry';
import type { Change, EditorModel } from './model';
import type { Campus, Coll, Elem, Opening, Rect, Room, Wall } from './types';

/** Door and window defaults (docs/kestrel scale sheet: door.singleWidth 1.2 x 2.1, double 1.8; windows are editor defaults). */
export const OPENING_DEFAULTS: Record<string, { w: number; h: number; sill: number }> = {
  door: { w: 1.2, h: 2.1, sill: 0 },
  'fire-door': { w: 1.2, h: 2.1, sill: 0 },
  double: { w: 1.8, h: 2.1, sill: 0 },
  roller: { w: 3, h: 3, sill: 0 },
  gate: { w: 1.2, h: 2.4, sill: 0 },
  window: { w: 1.2, h: 1.2, sill: 0.9 },
};
export const OPENING_TYPES = Object.keys(OPENING_DEFAULTS);
/** schema.md section 2: wall kinds. */
export const WALL_KINDS = ['interior', 'exterior', 'boundary', 'parapet', 'balustrade'];
/** schema.md: room kinds. */
export const ROOM_KINDS = ['room', 'corridor', 'stair', 'shaft', 'plant', 'yard', 'lane', 'roof', 'zone'];

const levelName = (d: Campus, id: string): string => d.levels.find((l) => l.id === id)?.name ?? id;

/** "Data Hall (B-GHALL, Ground)". */
export function label(d: Campus, coll: Coll, e: Elem): string {
  const name = typeof e.name === 'string' && e.name ? `${e.name} ` : '';
  const lvlId = 'level' in e && typeof e.level === 'string' ? e.level : coll === 'openings' ? d.walls.find((w) => w.id === (e as Opening).wall)?.level : coll === 'stairs' || coll === 'ladders' ? (e as { from: string }).from : undefined;
  const lvl = lvlId ? `, ${levelName(d, lvlId)}` : '';
  const kind = coll === 'walls' ? `${(e as Wall).kind} wall ` : coll === 'openings' ? `${(e as Opening).type} ` : '';
  return `${kind}${name}(${e.id}${lvl})`;
}

const sameRectSize = (a: Rect, b: Rect): boolean => Math.abs(a[2] - a[0] - (b[2] - b[0])) < EPS && Math.abs(a[3] - a[1] - (b[3] - b[1])) < EPS;

function rectWords(a: Rect, b: Rect): string {
  if (sameRectSize(a, b)) return `moved ${moveWords(b[0] - a[0], b[1] - a[1])}`;
  const edges: string[] = [];
  const names = ['west', 'south', 'east', 'north'];
  for (let i = 0; i < 4; i++) if (Math.abs(a[i]! - b[i]!) > EPS) edges.push(`${names[i]} edge ${fmt(a[i]!)} to ${fmt(b[i]!)}`);
  return `resized (${edges.join(', ')}; now ${fmt(b[2] - b[0])} x ${fmt(b[3] - b[1])} m)`;
}

/** One change in words. */
export function describeChange(d: Campus, c: Change): string {
  if (!c.before && c.after) return `Added ${label(d, c.coll, c.after)}`;
  if (c.before && !c.after) return `Deleted ${label(d, c.coll, c.before)}`;
  const a = c.before as Elem & Record<string, unknown>;
  const b = c.after as Elem & Record<string, unknown>;
  const parts: string[] = [];
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const va = a[k];
    const vb = b[k];
    if (JSON.stringify(va) === JSON.stringify(vb)) continue;
    if (k === 'rect') parts.push(rectWords(va as Rect, vb as Rect));
    else if (k === 'a' || k === 'b') continue; // walls: below
    else if (k === 'at' && c.coll === 'openings') parts.push(`moved ${fmt(Math.abs((vb as number) - (va as number)))} m along its wall`);
    else if (k === 'at' && Array.isArray(va)) parts.push(`moved ${moveWords((vb as number[])[0]! - (va as number[])[0]!, (vb as number[])[1]! - (va as number[])[1]!)}`);
    else if (k === 'between' || k === 'index') continue;
    else parts.push(`${k} ${JSON.stringify(va ?? null)} to ${JSON.stringify(vb ?? null)}`);
  }
  if (c.coll === 'walls') {
    const wa = a as unknown as Wall;
    const wb = b as unknown as Wall;
    const da = [wb.a[0] - wa.a[0], wb.a[1] - wa.a[1]] as const;
    const db = [wb.b[0] - wa.b[0], wb.b[1] - wa.b[1]] as const;
    const movedA = Math.abs(da[0]) > EPS || Math.abs(da[1]) > EPS;
    const movedB = Math.abs(db[0]) > EPS || Math.abs(db[1]) > EPS;
    if (movedA && movedB && Math.abs(da[0] - db[0]) < EPS && Math.abs(da[1] - db[1]) < EPS) parts.unshift(`moved ${moveWords(da[0], da[1])}`);
    else {
      if (movedA) parts.unshift(`moved its start ${moveWords(da[0], da[1])}`);
      if (movedB) parts.unshift(`moved its end ${moveWords(db[0], db[1])}`);
      if (movedA || movedB) parts.push(`now ${fmt(wallLen(wb))} m long`);
    }
  }
  const name = (c.before as Elem).id === (c.after as Elem).id ? label(d, c.coll, c.after as Elem) : label(d, c.coll, c.before as Elem);
  return `${capital(parts.join('; ') || 'changed')}: ${name}`;
}

const capital = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** All of an edit's changes in words; an edit that also removed openings with a wall says so once. */
export function describeEdit(d: Campus, changes: readonly Change[]): string {
  if (!changes.length) return '';
  const first = describeChange(d, changes[0]!);
  const rest = changes.length - 1;
  if (!rest) return first;
  const deletes = changes.slice(1).filter((c) => !c.after);
  if (deletes.length === rest) return `${first} (and ${rest} opening${rest > 1 ? 's' : ''} in it)`;
  return `${first} (+${rest} more: ${changes.slice(1).map((c) => describeChange(d, c)).join('; ')})`;
}

/** Deleting an element; a wall takes its openings with it. */
export function deleteChanges(m: EditorModel, coll: Coll, id: string): Change[] {
  const e = m.snapshot(coll, id);
  if (!e) return [];
  const out: Change[] = [{ coll, id, before: e, after: null }];
  if (coll === 'walls') for (const o of m.list('openings') as Opening[]) if (o.wall === id) out.push({ coll: 'openings', id: o.id, before: m.snapshot('openings', o.id), after: null });
  return out;
}

/** The building whose footprint holds (x, z), if any. */
function buildingAt(d: Campus, x: number, z: number): string | undefined {
  for (const b of d.meta.buildings ?? []) if (x > b.footprint[0] && x < b.footprint[2] && z > b.footprint[1] && z < b.footprint[3]) return b.id;
  return undefined;
}

export function newRoom(m: EditorModel, level: string, rect: Rect): Room {
  const id = m.freshId('rooms', `${level}-NEW`);
  const building = buildingAt(m.data, (rect[0] + rect[2]) / 2, (rect[1] + rect[3]) / 2);
  const r: Room = { id, level, name: 'New Room', kind: 'zone', rect, ceiling: 0, finish: '', minShort: 3, open: [], ring: 2 };
  if (building) r.building = building;
  return r;
}

export function newWall(m: EditorModel, level: string, a: [number, number], b: [number, number], like?: Wall): Wall {
  const lvl = m.data.levels.find((l) => l.id === level);
  return { id: m.freshId('walls', `W${level}-NEW`), level, a, b, t: like?.t ?? 0.3, h: like?.h ?? lvl?.height ?? 3, kind: like?.kind ?? 'interior' };
}

export function newOpening(m: EditorModel, w: Wall, at: number, type: string): Opening {
  const def = OPENING_DEFAULTS[type] ?? OPENING_DEFAULTS.door!;
  const L = wallLen(w);
  const width = Math.min(def.w, L);
  const c = Math.max(width / 2, Math.min(L - width / 2, at));
  return {
    id: m.freshId('openings', 'O-NEW'),
    wall: w.id,
    at: +c.toFixed(3),
    w: width,
    h: Math.min(def.h, w.h - def.sill),
    sill: def.sill,
    type,
    between: roomsEitherSide(w, c, m.list('rooms') as Room[]),
    locked: false,
    reason: 'Added in the level editor',
  };
}

/** An opening's `between` after it moved (the rooms either side at its new centre). */
export function withBetween(m: EditorModel, o: Opening): Opening {
  const w = m.get<Wall>('walls', o.wall);
  return w ? { ...o, between: roomsEitherSide(w, o.at, m.list('rooms') as Room[]) } : o;
}
