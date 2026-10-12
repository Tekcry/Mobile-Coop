/**
 * ON3 multi-select (ED2 Part D Should 8): the box pick, moving the set as one edit, copying and pasting it (to the dot
 * or one level up), and its words. Babylon- and DOM-free (tests/editor/ease.test.ts).
 */
import type { Change } from './model';
import type { Campus, Coll, Elem, Key, Ladder, Opening, Pt, Rect, Room, Wall } from './types';
import { keyOf, parseKey } from './types';
import { moveWords } from './geometry';

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const r3 = (v: number): number => +v.toFixed(3);
const EPS = 1e-6;

/** What a box takes: whole elements on the editing level (doors and windows ride with their walls). */
export const GROUP_COLLS: readonly Coll[] = ['rooms', 'walls', 'voids', 'stairs', 'ladders'];
/** What Copy takes from a set (as single Copy: rooms, walls and floor holes; the walls bring their doors and windows). */
export const COPY_COLLS: readonly Coll[] = ['rooms', 'walls', 'voids'];

const inBox = (b: Rect, x: number, z: number): boolean => x >= b[0] - EPS && x <= b[2] + EPS && z >= b[1] - EPS && z <= b[3] + EPS;
const rectIn = (b: Rect, r: readonly number[]): boolean => inBox(b, r[0]!, r[1]!) && inBox(b, r[2]!, r[3]!);

/** The two corners as a rect (any order). */
export const boxOf = (a: Pt, b: Pt): Rect => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])];

/** Every element on `level` lying wholly inside the box, in GROUP_COLLS order. */
export function boxPick(d: Campus, level: string, box: Rect): Key[] {
  const out: Key[] = [];
  for (const r of d.rooms) if (r.level === level && rectIn(box, r.rect)) out.push(keyOf('rooms', r.id));
  for (const w of d.walls) if (w.level === level && inBox(box, w.a[0], w.a[1]) && inBox(box, w.b[0], w.b[1])) out.push(keyOf('walls', w.id));
  for (const v of d.voids) if (v.level === level && rectIn(box, v.rect)) out.push(keyOf('voids', v.id));
  for (const s of d.stairs) if (s.from === level && rectIn(box, s.rect)) out.push(keyOf('stairs', s.id));
  for (const l of d.ladders) if (l.from === level && inBox(box, l.at[0], l.at[1])) out.push(keyOf('ladders', l.id));
  return out;
}

function get(d: Campus, coll: Coll, id: string): Elem | undefined {
  return ((d[coll] as Elem[] | undefined) ?? []).find((e) => e.id === id);
}

/** An element moved by (dx, dz); doors and windows keep their place on their wall. */
export function movedElem(coll: Coll, e: Elem, dx: number, dz: number): Elem {
  const out = clone(e) as Elem & Record<string, unknown>;
  if (Array.isArray(out.rect)) out.rect = (out.rect as number[]).map((v, i) => r3(v + (i % 2 ? dz : dx))) as Rect;
  if (coll === 'walls') {
    const w = out as unknown as Wall;
    w.a = [r3(w.a[0] + dx), r3(w.a[1] + dz)];
    w.b = [r3(w.b[0] + dx), r3(w.b[1] + dz)];
  }
  if (coll === 'ladders') {
    const l = out as unknown as Ladder;
    l.at = [r3(l.at[0] + dx), r3(l.at[1] + dz)];
  }
  return out;
}

/** The changes that move every member of the set by (dx, dz), from `before` snapshots (one edit). */
export function moveSetChanges(before: ReadonlyMap<Key, Elem>, dx: number, dz: number): Change[] {
  const out: Change[] = [];
  for (const [k, e] of before) {
    const p = parseKey(k);
    if (p) out.push({ coll: p.coll, id: p.id, before: clone(e), after: movedElem(p.coll, e, dx, dz) });
  }
  return out;
}

/** The set's centre on the plan (the middle of its bounds). */
export function groupCentre(d: Campus, keys: readonly Key[]): Pt {
  const items: ClipItem[] = [];
  for (const k of keys) {
    const p = parseKey(k);
    const e = p ? get(d, p.coll, p.id) : undefined;
    if (p && e) items.push({ coll: p.coll, e });
  }
  return itemsCentre(items);
}

/** The middle of the bounds of some elements (doors and windows are left out: they sit on their walls). */
export function itemsCentre(items: readonly ClipItem[]): Pt {
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
  for (const { coll, e } of items) {
    if ('rect' in e && Array.isArray((e as Room).rect)) {
      const r = (e as Room).rect;
      add(r[0], r[1]);
      add(r[2], r[3]);
    } else if (coll === 'walls') {
      add(...(e as Wall).a);
      add(...(e as Wall).b);
    } else if (coll === 'ladders') add(...(e as Ladder).at);
  }
  return Number.isFinite(x0) ? [(x0 + x1) / 2, (z0 + z1) / 2] : [0, 0];
}

const NOUNS: Partial<Record<Coll, [string, string]>> = { rooms: ['room', 'rooms'], walls: ['wall', 'walls'], voids: ['floor hole', 'floor holes'], stairs: ['stair', 'stairs'], ladders: ['ladder', 'ladders'], openings: ['door or window', 'doors and windows'], roofs: ['roof', 'roofs'] };

/** "2 rooms and 8 walls" for a set of keys (or of copied items). */
export function groupWords(keys: readonly Key[]): string {
  const n = new Map<Coll, number>();
  for (const k of keys) {
    const p = parseKey(k);
    if (p) n.set(p.coll, (n.get(p.coll) ?? 0) + 1);
  }
  const parts = [...n].map(([c, k]) => `${k} ${(NOUNS[c] ?? [c, c])[k === 1 ? 0 : 1]}`);
  return parts.length <= 1 ? (parts[0] ?? 'nothing') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/** The words of a set move: "Moved 2 rooms and 8 walls 3 m east". */
export const groupMoveWords = (keys: readonly Key[], dx: number, dz: number): string => `Moved ${groupWords(keys)} ${moveWords(dx, dz)}`;

/** One copied element. */
export interface ClipItem {
  coll: Coll;
  e: Elem;
}

/** The copy of a set: its rooms, walls and floor holes, and the doors and windows on the copied walls. */
export function copyItems(d: Campus, keys: readonly Key[]): ClipItem[] {
  const out: ClipItem[] = [];
  const walls = new Set<string>();
  for (const k of keys) {
    const p = parseKey(k);
    const e = p ? get(d, p.coll, p.id) : undefined;
    if (!p || !e || !COPY_COLLS.includes(p.coll)) continue;
    out.push({ coll: p.coll, e: clone(e) });
    if (p.coll === 'walls') walls.add(p.id);
  }
  for (const o of d.openings) if (walls.has(o.wall)) out.push({ coll: 'openings', e: clone(o) });
  return out;
}

/**
 * Pasting copied items as one edit: moved by (dx, dz), on `levelOf(old level)`, with fresh ids (rooms `<level>-NEW`,
 * walls `W<level>-NEW`, doors and windows `O-NEW`, floor holes `<id>-COPY`); a copied door or window follows its copied
 * wall. Returns the changes and the new keys, or null when a level is missing.
 */
export function pasteChanges(d: Campus, items: readonly ClipItem[], levelOf: (level: string) => string | null, dx: number, dz: number): { changes: Change[]; keys: Key[] } | null {
  const used = new Map<Coll, Set<string>>();
  const fresh = (coll: Coll, prefix: string): string => {
    let s = used.get(coll);
    if (!s) used.set(coll, (s = new Set(((d[coll] as Elem[] | undefined) ?? []).map((e) => e.id))));
    for (let n = 1; ; n++) {
      const id = `${prefix}${n}`;
      if (!s.has(id)) {
        s.add(id);
        return id;
      }
    }
  };
  const wallIds = new Map<string, string>();
  const changes: Change[] = [];
  const keys: Key[] = [];
  for (const it of items) {
    if (it.coll === 'openings') continue;
    const e = movedElem(it.coll, it.e, dx, dz) as Elem & { level: string };
    const lv = levelOf(e.level);
    if (!lv) return null;
    e.level = lv;
    const old = e.id;
    e.id = fresh(it.coll, it.coll === 'rooms' ? `${lv}-NEW` : it.coll === 'walls' ? `W${lv}-NEW` : `${old}-COPY`);
    if (it.coll === 'walls') wallIds.set(old, e.id);
    changes.push({ coll: it.coll, id: e.id, before: null, after: e });
    keys.push(keyOf(it.coll, e.id));
  }
  for (const it of items) {
    if (it.coll !== 'openings') continue;
    const o = clone(it.e) as Opening;
    const w = wallIds.get(o.wall);
    if (!w) continue;
    o.wall = w;
    o.id = fresh('openings', 'O-NEW');
    changes.push({ coll: 'openings', id: o.id, before: null, after: o });
  }
  return { changes, keys };
}

/** The level above `id` (by floor height), or null. */
export function levelAbove(d: Campus, id: string): string | null {
  const ls = d.levels.slice().sort((a, b) => a.floor - b.floor);
  const i = ls.findIndex((l) => l.id === id);
  return i >= 0 ? (ls[i + 1]?.id ?? null) : null;
}
