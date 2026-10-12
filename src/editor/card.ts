/**
 * The selection card on the D-pad (ON0a decision 4), pure: the editable rows of a selected element (Type first, then
 * its own fields) and one step of a row. Up / down picks a row, left / right steps it: lengths by the fine grid
 * (meta.objectGrid, 0.1 m), lists by one entry (wrapping), flags on / off. Babylon- and DOM-free
 * (tests/editor/card.test.ts); padControl.ts commits the result (quick steps on one row merge into one undo step).
 */
import { fmt, normRect, wallLen } from './geometry';
import { DOOR_NAMES, OPENING_TYPES, ROOM_KINDS, WALL_KINDS } from './ops';
import type { Coll, Elem, Ladder, Opening, Rect, Room, Stair, Wall } from './types';

/** Room access rings (schema.md: `ring`), shown as words. */
export const RING_NAMES = ['Perimeter (yard, public lane)', 'Level 1 - reception, goods-in', 'Level 2 - staff', 'Level 3 - higher card', 'Level 4 - data hall, tunnels', 'Level 5 - meet-me, riser'];
const DIRS = ['N', 'E', 'S', 'W'];
const DIR_WORDS: Record<string, string> = { N: 'North', E: 'East', S: 'South', W: 'West' };

export type CardKind = 'list' | 'len' | 'flag' | 'name';
export interface CardRow {
  id: string;
  label: string;
  value: string;
  kind: CardKind;
}

/** Consecutive steps on one row within this many seconds are one undo step. */
export const CARD_MERGE_S = 1;

const cap = (s: string): string => (s ? s[0]!.toUpperCase() + s.slice(1) : s);
const m = (v: number): string => `${fmt(v)} m`;
const nameRow = (e: Elem): CardRow => ({ id: 'name', label: 'Name', value: typeof e.name === 'string' && e.name ? e.name : '(none)', kind: 'name' });
const sizeRows = (r: Rect): CardRow[] => [
  { id: 'width', label: 'Width', value: m(r[2] - r[0]), kind: 'len' },
  { id: 'depth', label: 'Depth', value: m(r[3] - r[1]), kind: 'len' },
];

/** The card's rows for an element, Type first where the element has a type. */
export function cardRows(coll: Coll, e: Elem): CardRow[] {
  if (coll === 'openings') {
    const o = e as Opening;
    return [
      { id: 'type', label: 'Type', value: DOOR_NAMES[o.type] ?? o.type, kind: 'list' },
      nameRow(e),
      { id: 'w', label: 'Width', value: m(o.w), kind: 'len' },
      { id: 'h', label: 'Height', value: m(o.h), kind: 'len' },
      { id: 'sill', label: 'Sill', value: m(o.sill), kind: 'len' },
      { id: 'at', label: 'Along wall', value: m(o.at), kind: 'len' },
      { id: 'locked', label: 'Locked', value: o.locked === true ? 'yes' : 'no', kind: 'flag' },
    ];
  }
  if (coll === 'walls') {
    const w = e as Wall;
    return [
      { id: 'type', label: 'Type', value: `${cap(w.kind)} wall`, kind: 'list' },
      nameRow(e),
      { id: 't', label: 'Thickness', value: m(w.t), kind: 'len' },
      { id: 'h', label: 'Height', value: m(w.h), kind: 'len' },
      { id: 'len', label: 'Length', value: m(wallLen(w)), kind: 'len' },
    ];
  }
  if (coll === 'rooms') {
    const r = e as Room;
    return [
      { id: 'type', label: 'Type', value: cap(r.kind), kind: 'list' },
      nameRow(e),
      ...sizeRows(r.rect),
      { id: 'ring', label: 'Access', value: RING_NAMES[r.ring ?? 0] ?? String(r.ring), kind: 'list' },
    ];
  }
  if (coll === 'stairs') return [nameRow(e), ...sizeRows((e as Stair).rect), { id: 'up', label: 'Climbs', value: DIR_WORDS[(e as Stair).up] ?? (e as Stair).up, kind: 'list' }];
  if (coll === 'voids') return [nameRow(e), ...sizeRows((e as { rect: Rect }).rect)];
  return [nameRow(e), { id: 'facing', label: 'Facing', value: DIR_WORDS[(e as Ladder).facing ?? 'N'] ?? '', kind: 'list' }];
}

const wrap = <T>(list: readonly T[], cur: T, dir: number): T => list[(Math.max(0, list.indexOf(cur)) + dir + list.length) % list.length]!;
const r3 = (v: number): number => +v.toFixed(3);

export interface StepCtx {
  /** Length step (meta.objectGrid). */
  step: number;
  /** The opening's wall length (openings only), to keep it on its wall. */
  wallLen?: number;
}

/**
 * One step of a row: the element after it, or null when nothing changes (a name row, a length at its limit). Lengths
 * never go below one step; an opening stays on its wall; a wall's length moves its end b.
 */
export function stepCard(coll: Coll, e: Elem, row: string, dir: 1 | -1, c: StepCtx): Elem | null {
  const a = JSON.parse(JSON.stringify(e)) as Elem & Record<string, unknown>;
  const len = (v: number): number => Math.max(c.step, r3(v + dir * c.step));
  if (row === 'type') {
    if (coll === 'openings') a.type = wrap(OPENING_TYPES, (e as Opening).type, dir);
    else if (coll === 'walls') a.kind = wrap(WALL_KINDS, (e as Wall).kind, dir);
    else if (coll === 'rooms') a.kind = wrap(ROOM_KINDS, (e as Room).kind, dir);
    else return null;
  } else if (row === 'locked') a.locked = !(e as Opening).locked;
  else if (row === 'ring') a.ring = (((e as Room).ring ?? 0) + dir + RING_NAMES.length) % RING_NAMES.length;
  else if (row === 'up') a.up = wrap(DIRS, (e as Stair).up, dir);
  else if (row === 'facing') a.facing = wrap(DIRS, (e as Ladder).facing ?? 'N', dir);
  else if (coll === 'openings' && (row === 'w' || row === 'h' || row === 'sill' || row === 'at')) {
    const o = a as unknown as Opening;
    const L = c.wallLen ?? Infinity;
    if (row === 'sill') o.sill = Math.max(0, r3(o.sill + dir * c.step));
    else if (row === 'h') o.h = len(o.h);
    else if (row === 'w') {
      o.w = Math.min(len(o.w), r3(Math.min(o.at, L - o.at) * 2));
      if (o.w < c.step) return null;
    } else o.at = Math.min(r3(L - o.w / 2), Math.max(r3(o.w / 2), r3(o.at + dir * c.step)));
  } else if (coll === 'walls' && (row === 't' || row === 'h' || row === 'len')) {
    const w = a as unknown as Wall;
    if (row === 't') w.t = len(w.t);
    else if (row === 'h') w.h = len(w.h);
    else {
      const L0 = wallLen(e as Wall);
      if (L0 <= 0) return null;
      const L1 = len(L0);
      const k = L1 / L0;
      w.b = [r3(w.a[0] + (w.b[0] - w.a[0]) * k), r3(w.a[1] + (w.b[1] - w.a[1]) * k)];
    }
  } else if ((row === 'width' || row === 'depth') && Array.isArray(a.rect)) {
    const r = (a.rect as Rect).slice() as Rect;
    if (row === 'width') r[2] = r3(r[0] + len(r[2] - r[0]));
    else r[3] = r3(r[1] + len(r[3] - r[1]));
    a.rect = normRect(r);
  } else return null;
  return JSON.stringify(a) === JSON.stringify(e) ? null : (a as Elem);
}

/** The on-screen keyboard (A on the card's Name row), ten keys a row. */
export const KEYBOARD: readonly string[] = [...'ABCDEFGHIJ', ...'KLMNOPQRST', ...'UVWXYZ-()/', ...'0123456789', 'Space', 'Delete', 'Clear', 'Done'];
export const KEYBOARD_COLS = 10;

/** A key typed into a name: letters are capitals at the start of a word, small letters elsewhere. 'Done' is the caller's. */
export function typeKey(text: string, key: string): string {
  if (key === 'Space') return text.endsWith(' ') || !text ? text : `${text} `;
  if (key === 'Delete') return text.slice(0, -1);
  if (key === 'Clear') return '';
  if (key.length !== 1) return text;
  const start = !text || text.endsWith(' ') || text.endsWith('-') || text.endsWith('(') || text.endsWith('/');
  return text + (/[A-Z]/.test(key) && !start ? key.toLowerCase() : key);
}

/** The name list for an element kind: the names already used in that collection (sorted, no repeats). */
export function nameList(elems: readonly Elem[]): string[] {
  return [...new Set(elems.map((e) => (typeof e.name === 'string' ? e.name.trim() : '')).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}
