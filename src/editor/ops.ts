/**
 * Editor operations on the campus data: new elements with sensible defaults, deletes that take dependent openings with
 * them, and the plain-English description of any change (the review log). Babylon-free (tests/editor/ops.test.ts).
 */
import { roofType } from './roofGeometry';
import { EPS, fmt, moveWords, roomsEitherSide, wallLen } from './geometry';
import type { Change, EditorModel } from './model';
import { WALL_T } from './roomWalls';
import type { Campus, Coll, Elem, Ext, Opening, Rect, Room, Wall } from './types';
import { pieceOf } from './climbCatalogue';
import { hyp2 } from '../core/mathx';
import { CATALOGUE, settingsChangeWords, typeDefaults } from './openingCatalogue';
import { fittingOf } from './lightCatalogue';
import type { CircuitRecord, LampRecord } from '../world/maps/kestrelLights';

/** Door and window sizes by type, from the ON9 catalogue (openingCatalogue.ts: the scale sheet's door facts or typical products). */
export const OPENING_DEFAULTS: Record<string, { w: number; h: number; sill: number }> = Object.fromEntries(CATALOGUE.map((c) => [c.id, { w: c.w, h: c.h, sill: c.sill }]));
export const OPENING_TYPES = CATALOGUE.map((c) => c.id);
/** schema.md section 2: wall kinds (ON9: `glass`, a glass partition). */
export const WALL_KINDS = ['interior', 'exterior', 'boundary', 'parapet', 'balustrade', 'glass'];
/** Plain names of the opening types (the Openings tab, ghosts, the selection card). */
export const DOOR_NAMES: Record<string, string> = Object.fromEntries(CATALOGUE.map((c) => [c.id, c.name]));

/** The door type under the tool bar's Door slot: "Single", "Double", "Fire door" (ED3-pad1). */
export function slotDoorName(type: string): string {
  if (type === 'door') return 'Single';
  if (type === 'double') return 'Double';
  return DOOR_NAMES[type] ?? type;
}


/** The selection card's words (ED3-pad1): a plain title (the name, else the kind) and one size line. The id is shown apart, small. */
export function cardWords(coll: Coll, e: Elem): { title: string; size: string } {
  const name = typeof e.name === 'string' && e.name ? e.name : '';
  if (coll === 'walls') {
    const w = e as Wall;
    return { title: name || `${capital(w.kind)} wall`, size: `${fmt(wallLen(w))} m long, ${fmt(w.t)} m thick` };
  }
  if (coll === 'openings') {
    const o = e as Opening;
    return { title: name || (DOOR_NAMES[o.type] ?? capital(o.type)), size: `${fmt(o.w)} m wide, ${fmt(o.h)} m high` };
  }
  if (coll === 'lamps') {
    // ON6: the fitting, its height and reach
    const l = e as LampRecord;
    return { title: name || (fittingOf(l.fixture)?.name ?? 'Lamp'), size: `${fmt(l.at[1])} m up, reach ${fmt(l.params.radius)} m, circuit ${l.circuit || 'none'}` };
  }
  if (coll === 'circuits') {
    const c = e as CircuitRecord;
    return { title: name || (c.switch ? 'Wall switch' : 'Circuit'), size: `${c.lamps.length} lamp${c.lamps.length === 1 ? '' : 's'}${c.switch ? ` on ${c.switch.wall}` : c.unswitchable ? `: ${c.unswitchable}` : ''}` };
  }
  if (coll === 'exterior') {
    // ON5: a climb piece: its kind, height and length
    const x = e as Ext;
    const kind = pieceOf(x.kind)?.name ?? capital(x.kind);
    const len = hyp2(x.b[0] - x.a[0], x.b[1] - x.a[1]);
    const dims = `${fmt(x.y1 - x.y0)} m high${len > EPS ? `, ${fmt(len)} m long` : ''}, top ${fmt(x.y1)} m`;
    return { title: name || kind, size: name ? `${kind}, ${dims}` : dims };
  }
  if ('rect' in e && Array.isArray(e.rect)) {
    const r = e.rect as Rect;
    const dims = `${fmt(r[2] - r[0])} x ${fmt(r[3] - r[1])} m`;
    if (coll === 'rooms') {
      const kind = capital((e as Room).kind);
      return { title: name || kind, size: name ? `${kind}, ${dims}` : dims };
    }
    const kind = coll === 'stairs' ? 'Stair' : coll === 'roofs' ? `${roofType((e as { type: string }).type).name} roof` : coll === 'objects' ? 'Object' : 'Floor hole';
    return { title: name || kind, size: name ? `${kind}, ${dims}` : dims };
  }
  const at = (e as { at?: unknown }).at;
  const where = Array.isArray(at) ? `at x ${fmt(at[0] as number)}, z ${fmt(at[1] as number)}` : '';
  return { title: name || (coll === 'ladders' ? 'Ladder' : capital(coll)), size: where };
}

/** schema.md: room kinds. */
export const ROOM_KINDS = ['room', 'corridor', 'stair', 'shaft', 'plant', 'yard', 'lane', 'roof', 'zone'];

const levelName = (d: Campus, id: string): string => d.levels.find((l) => l.id === id)?.name ?? id;

/** "Data Hall (B-GHALL, Ground)". */
export function label(d: Campus, coll: Coll, e: Elem): string {
  const name = typeof e.name === 'string' && e.name ? `${e.name} ` : '';
  const lvlId = 'level' in e && typeof e.level === 'string' ? e.level : coll === 'openings' ? d.walls.find((w) => w.id === (e as Opening).wall)?.level : coll === 'stairs' || coll === 'ladders' ? (e as { from: string }).from : undefined;
  const lvl = lvlId ? `, ${levelName(d, lvlId)}` : '';
  const kind = coll === 'lamps' ? `lamp ${String((e as { fixture?: string }).fixture ?? '')} ` : coll === 'circuits' ? 'circuit ' : coll === 'walls' ? `${(e as Wall).kind} wall ` : coll === 'openings' ? `${(e as Opening).type} ` : coll === 'roofs' ? `${(e as { type: string }).type} roof ` : coll === 'exterior' ? `${(pieceOf((e as Ext).kind)?.name ?? (e as Ext).kind).toLowerCase()} ` : '';
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
    else if (k === 'at' && Array.isArray(va) && va.length === 3) {
      // ON6: a lamp's [x, y, z]: moved on the plan, or its height
      const p = va as number[];
      const q = vb as number[];
      if (Math.abs(q[0]! - p[0]!) > EPS || Math.abs(q[2]! - p[2]!) > EPS) parts.push(`moved ${moveWords(q[0]! - p[0]!, q[2]! - p[2]!)}`);
      if (Math.abs(q[1]! - p[1]!) > EPS) parts.push(`height ${fmt(p[1]!)} to ${fmt(q[1]!)} m`);
    } else if (k === 'at' && Array.isArray(va)) parts.push(`moved ${moveWords((vb as number[])[0]! - (va as number[])[0]!, (vb as number[])[1]! - (va as number[])[1]!)}`);
    else if (k === 'params' || (k === 'b' && c.coll === 'lamps')) continue;
    else if (k === 'between' || k === 'index') continue;
    else parts.push(fieldWords(c.coll, k, va, vb));
  }
  if (c.coll === 'walls' || c.coll === 'exterior') {
    const wa = a as unknown as Wall;
    const wb = b as unknown as Wall;
    const da = [wb.a[0] - wa.a[0], wb.a[1] - wa.a[1]] as const;
    const db = [wb.b[0] - wa.b[0], wb.b[1] - wa.b[1]] as const;
    const movedA = Math.abs(da[0]) > EPS || Math.abs(da[1]) > EPS;
    const movedB = Math.abs(db[0]) > EPS || Math.abs(db[1]) > EPS;
    const la = wallLen(wa);
    const lb = wallLen(wb);
    const turn = la > EPS && lb > EPS ? turnDegrees(wa, wb) : 0;
    if (movedA && movedB && Math.abs(da[0] - db[0]) < EPS && Math.abs(da[1] - db[1]) < EPS) parts.unshift(`moved ${moveWords(da[0], da[1])}`);
    else if (turn !== 0 && Math.abs(la - lb) < EPS) {
      // same length, new direction: a turn (RB while grabbing), and a move if its middle moved too
      const mx = (wb.a[0] + wb.b[0] - wa.a[0] - wa.b[0]) / 2;
      const mz = (wb.a[1] + wb.b[1] - wa.a[1] - wa.b[1]) / 2;
      parts.unshift(Math.abs(mx) > EPS || Math.abs(mz) > EPS ? `turned ${turn} degrees and moved ${moveWords(mx, mz)}` : `turned ${turn} degrees`);
    } else {
      if (movedA) parts.unshift(`moved its start ${moveWords(da[0], da[1])}`);
      if (movedB) parts.unshift(`moved its end ${moveWords(db[0], db[1])}`);
      if ((movedA || movedB) && Math.abs(la - lb) > EPS) parts.push(`now ${fmt(lb)} m long`);
    }
  }
  const name = (c.before as Elem).id === (c.after as Elem).id ? label(d, c.coll, c.after as Elem) : label(d, c.coll, c.before as Elem);
  return `${capital(parts.join('; ') || 'changed')}: ${name}`;
}

const capital = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** Field names in words; metre fields carry "m". */
const FIELD_WORDS: Record<string, string> = { h: 'height', t: 'thickness', w: 'width', sill: 'sill', ceiling: 'ceiling', ring: 'access level', minShort: 'shortest side', risers: 'risers', width: 'width', floor: 'floor', height: 'height', key: 'key', reason: 'reason', finish: 'floor finish', y0: 'bottom', y1: 'top', depth: 'depth', climbable: 'climbable', override: 'set by hand', size: 'size', building: 'building', up: 'climbs', facing: 'facing', name: 'name' };
const METRES = new Set(['h', 't', 'w', 'sill', 'ceiling', 'minShort', 'width', 'floor', 'height', 'y0', 'y1', 'depth']);

/** One field change in plain words (ED3-3a decision 19): no raw JSON. */
function fieldWords(coll: Coll, k: string, va: unknown, vb: unknown): string {
  if (k === 'kind' || (k === 'type' && coll === 'openings')) {
    const v = String(vb ?? '');
    if (coll === 'walls') return v === 'glass' ? 'changed to glass partition' : `changed to ${v} wall`;
    if (coll === 'openings') return `changed to ${(DOOR_NAMES[v] ?? v).toLowerCase()}`;
    return `changed to ${v}`;
  }
  if (k === 'locked') return vb ? 'now locked' : 'now unlocked';
  if (k === 'door' || k === 'glass') return `${k === 'door' ? 'door' : 'glass'} settings: ${settingsChangeWords(va, vb) || 'changed'}`;
  if (typeof vb === 'boolean') return `${FIELD_WORDS[k] ?? k} ${vb ? 'on' : 'off'}`;
  const word = capital(FIELD_WORDS[k] ?? k);
  if (typeof va === 'number' && typeof vb === 'number') return METRES.has(k) ? `${word} ${fmt(va)} m to ${fmt(vb)} m` : `${word} ${fmt(va)} to ${fmt(vb)}`;
  if ((typeof va === 'string' || va === undefined) && typeof vb === 'string') return va ? `${word} "${va}" to "${vb}"` : `${word} set to "${vb}"`;
  if (vb === undefined || vb === null) return `${word} cleared`;
  return `${word} changed`;
}

/** The angle between a wall's old and new direction, whole degrees, 0 when parallel (either way round). */
function turnDegrees(wa: Wall, wb: Wall): number {
  const a = Math.atan2(wa.b[1] - wa.a[1], wa.b[0] - wa.a[0]);
  const b = Math.atan2(wb.b[1] - wb.a[1], wb.b[0] - wb.a[0]);
  let deg = Math.round((Math.abs(b - a) * 180) / Math.PI) % 360;
  if (deg > 180) deg = 360 - deg;
  return deg === 180 || deg === 0 ? 0 : deg;
}

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
  return { id: m.freshId('walls', `W${level}-NEW`), level, a, b, t: like?.t ?? WALL_T.interior, h: like?.h ?? lvl?.height ?? 3, kind: like?.kind ?? 'interior' };
}

export function newOpening(m: EditorModel, w: Wall, at: number, type: string): Opening {
  const def = OPENING_DEFAULTS[type] ?? OPENING_DEFAULTS.door!;
  const L = wallLen(w);
  const width = Math.min(def.w, L);
  const c = Math.max(width / 2, Math.min(L - width / 2, at));
  const rooms = m.list('rooms') as Room[];
  const between = roomsEitherSide(w, c, rooms);
  // ON9: the type's realistic settings (fire doors one-way out and self-closing, card doors locked at the room's level)
  const set = typeDefaults(type, between, rooms);
  const o: Opening = {
    id: m.freshId('openings', 'O-NEW'),
    wall: w.id,
    at: +c.toFixed(3),
    w: width,
    h: Math.min(def.h, w.h - def.sill),
    sill: def.sill,
    type,
    between,
    locked: set.locked ?? false,
    reason: 'Added in the level editor',
  };
  if (set.door) o.door = set.door;
  if (set.glass) o.glass = set.glass;
  return o;
}

/** An opening's `between` after it moved (the rooms either side at its new centre). */
export function withBetween(m: EditorModel, o: Opening): Opening {
  const w = m.get<Wall>('walls', o.wall);
  return w ? { ...o, between: roomsEitherSide(w, o.at, m.list('rooms') as Room[]) } : o;
}
