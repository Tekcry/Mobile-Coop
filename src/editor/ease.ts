/**
 * ON3 ease of use, pure: which element a check line names (clickable problems), the save summary's net changes in plain
 * words, the Find list and its filter, and the camera bookmarks store. Babylon- and DOM-free (tests/editor/ease.test.ts).
 */
import { familyOf } from './openingCatalogue';
import type { CamPose } from './orbit';
import type { Campus, Coll, Elem, Pt, Rect } from './types';

// ---------- problems you can click ----------

/** The collections a check line may name, in the order a tie is settled. */
const NAMED: readonly Coll[] = ['rooms', 'walls', 'openings', 'stairs', 'ladders', 'voids', 'roofs'];

/** What a line that names no element says (ON3 decision 1). */
export const NO_PLACE = 'no place to go';

/** Every element id to its collection (ids are unique per collection; a clash keeps the first in NAMED order). */
export function idIndex(d: Campus): Map<string, Coll> {
  const m = new Map<string, Coll>();
  for (const c of NAMED) for (const e of (d[c] as Elem[] | undefined) ?? []) if (!m.has(e.id)) m.set(e.id, c);
  return m;
}

/**
 * The first element a check line names (ids are words of letters, digits and hyphens), or null. "RA14 on WR003 (5, 54)"
 * names the opening RA14; "Gap 0.04 m: WG001 end b to WG002" names the wall WG001.
 */
export function problemTarget(text: string, index: ReadonlyMap<string, Coll>): { coll: Coll; id: string } | null {
  for (const w of text.split(/[^A-Za-z0-9-]+/)) {
    if (!w) continue;
    const c = index.get(w);
    if (c) return { coll: c, id: w };
  }
  return null;
}

// ---------- save summary ----------

/** One group of the save summary: "3 rooms added". */
export interface SummaryGroup {
  noun: string;
  plural: string;
  verb: string;
  n: number;
}

const SUMMARY_COLLS: readonly (Coll | 'objects')[] = ['levels', 'rooms', 'walls', 'openings', 'stairs', 'ladders', 'voids', 'roofs', 'objects', 'exterior'];
const NOUN: Record<string, [string, string]> = {
  levels: ['level', 'levels'],
  rooms: ['room', 'rooms'],
  walls: ['wall', 'walls'],
  door: ['door', 'doors'],
  window: ['window', 'windows'],
  stairs: ['stair', 'stairs'],
  ladders: ['ladder', 'ladders'],
  voids: ['floor hole', 'floor holes'],
  roofs: ['roof', 'roofs'],
  objects: ['object', 'objects'],
  exterior: ['climb piece', 'climb pieces'],
  buildings: ['building outline', 'building outlines'],
};
const VERBS = ['added', 'removed', 'renamed', 'moved', 'resized', 'type changed', 'name changed', 'settings changed', 'changed'] as const;
type Verb = (typeof VERBS)[number];
const PLACE = new Set(['rect', 'a', 'b', 'at', 'path', 'footprint']);
const TYPE = new Set(['type', 'kind']);
const SIZE = new Set(['w', 'h', 't', 'width', 'height', 'risers', 'sill', 'base', 'pitch']);

const json = (v: unknown): string => JSON.stringify(v);
const withoutId = (e: Elem): string => {
  const { id: _id, ...rest } = e as Elem & Record<string, unknown>;
  return json(rest);
};

/** The span of a rect or a wall, to tell a move from a resize. */
function span(e: Record<string, unknown>): string {
  if (Array.isArray(e.rect)) {
    const r = e.rect as Rect;
    return `${(r[2] - r[0]).toFixed(3)}|${(r[3] - r[1]).toFixed(3)}`;
  }
  if (Array.isArray(e.a) && Array.isArray(e.b)) {
    const a = e.a as Pt;
    const b = e.b as Pt;
    return `${(b[0] - a[0]).toFixed(3)}|${(b[1] - a[1]).toFixed(3)}`;
  }
  if (Array.isArray(e.footprint)) return span({ rect: e.footprint });
  return '';
}

/** What happened to one element kept under its id. */
function changeVerb(a: Record<string, unknown>, b: Record<string, unknown>): Verb | null {
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => json(a[k]) !== json(b[k]) && k !== 'between');
  if (!keys.length) return null;
  if (keys.every((k) => TYPE.has(k))) return 'type changed';
  if (keys.every((k) => k === 'name')) return 'name changed';
  if (keys.every((k) => k === 'door' || k === 'glass' || k === 'locked')) return 'settings changed';
  if (keys.every((k) => PLACE.has(k) || SIZE.has(k))) return keys.some((k) => SIZE.has(k)) || span(a) !== span(b) ? 'resized' : 'moved';
  return 'changed';
}

function nounOf(coll: string, e: Elem): string {
  return coll === 'openings' ? familyOf(String((e as Elem & { type?: string }).type ?? '')) : coll;
}

/**
 * The net changes between the file as saved and the data now, grouped by kind and what happened, in a fixed order. An
 * element whose id changed but nothing else counts as renamed; doors and windows are told apart by their type.
 */
export function netChanges(saved: Campus, now: Campus): SummaryGroup[] {
  const counts = new Map<string, number>();
  const bump = (noun: string, verb: Verb): void => void counts.set(`${noun}|${verb}`, (counts.get(`${noun}|${verb}`) ?? 0) + 1);
  const lists: [string, Elem[], Elem[]][] = SUMMARY_COLLS.map((c) => [c, ((saved[c] as Elem[] | undefined) ?? []), ((now[c] as Elem[] | undefined) ?? [])]);
  lists.push(['buildings', (saved.meta.buildings ?? []) as Elem[], (now.meta.buildings ?? []) as Elem[]]);
  for (const [coll, before, after] of lists) {
    const old = new Map(before.map((e) => [e.id, e]));
    const cur = new Map(after.map((e) => [e.id, e]));
    const added = after.filter((e) => !old.has(e.id));
    const removed = before.filter((e) => !cur.has(e.id));
    // a rename: the same element under a new id
    const gone = new Map<string, Elem[]>();
    for (const e of removed) gone.set(withoutId(e), [...(gone.get(withoutId(e)) ?? []), e]);
    for (const e of added) {
      const twin = gone.get(withoutId(e))?.pop();
      if (twin) {
        removed.splice(removed.indexOf(twin), 1);
        bump(nounOf(coll, e), 'renamed');
      } else bump(nounOf(coll, e), 'added');
    }
    for (const e of removed) bump(nounOf(coll, e), 'removed');
    for (const e of after) {
      const o = old.get(e.id);
      if (!o) continue;
      const v = changeVerb(o as Record<string, unknown>, e as Record<string, unknown>);
      if (v) bump(nounOf(coll, e), v);
    }
  }
  const order = ['levels', 'rooms', 'walls', 'door', 'window', 'stairs', 'ladders', 'voids', 'roofs', 'objects', 'exterior', 'buildings'];
  const out: SummaryGroup[] = [];
  for (const noun of order)
    for (const verb of VERBS) {
      const n = counts.get(`${noun}|${verb}`);
      if (n) out.push({ noun: NOUN[noun]![0], plural: NOUN[noun]![1], verb, n });
    }
  return out;
}

/** "3 rooms added, 12 walls moved, 1 door type changed" (or "no changes to the building"). */
export function summaryWords(groups: readonly SummaryGroup[]): string {
  if (!groups.length) return 'no changes to the building';
  return groups.map((g) => `${g.n} ${g.n === 1 ? g.noun : g.plural} ${g.verb}`).join(', ');
}

/** The new check problems in words for the summary. */
export const problemWords = (n: number): string => (n ? `${n} new check problem${n === 1 ? '' : 's'} (red in Checks)` : 'No new check problems');

// ---------- search ----------

/** One thing Find can go to: a room, a stair or a named object. */
export interface FindItem {
  coll: 'rooms' | 'stairs' | 'objects';
  id: string;
  name: string;
  level: string;
  levelName: string;
  at: Pt;
}

const centre = (r: Rect): Pt => [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2];

/** Everything Find lists, by name (rooms, stairs, objects with a name). */
export function findItems(d: Campus): FindItem[] {
  const lv = new Map(d.levels.map((l) => [l.id, l.name]));
  const out: FindItem[] = [];
  for (const r of d.rooms) out.push({ coll: 'rooms', id: r.id, name: r.name || r.id, level: r.level, levelName: lv.get(r.level) ?? r.level, at: centre(r.rect) });
  for (const s of d.stairs) out.push({ coll: 'stairs', id: s.id, name: s.name || s.id, level: s.from, levelName: lv.get(s.from) ?? s.from, at: centre(s.rect) });
  for (const o of (d.objects as (Elem & { level: string; name?: string; rect?: Rect })[] | undefined) ?? [])
    if (o.name && Array.isArray(o.rect)) out.push({ coll: 'objects', id: o.id, name: o.name, level: o.level, levelName: lv.get(o.level) ?? o.level, at: centre(o.rect) });
  return out.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

/**
 * The items matching a query: every word of it in the name or the id (any case). Names that start with the query come
 * first, then names with a word starting with it, then the rest; at most `max`.
 */
export function filterFind(items: readonly FindItem[], query: string, max = 12): FindItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items.slice(0, max);
  const words = q.split(/\s+/);
  const rank = (it: FindItem): number => {
    const n = it.name.toLowerCase();
    if (n.startsWith(q) || it.id.toLowerCase().startsWith(q)) return 0;
    return n.split(/[^a-z0-9]+/).some((w) => w.startsWith(words[0]!)) ? 1 : 2;
  };
  return items
    .filter((it) => {
      const hay = `${it.name} ${it.id}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    })
    .map((it) => ({ it, r: rank(it) }))
    .sort((a, b) => a.r - b.r)
    .slice(0, max)
    .map((x) => x.it);
}

// ---------- bookmarks ----------

/** A saved camera (a view preference in browser storage, never in the file). */
export interface Bookmark {
  slot: number;
  name: string;
  level: string;
  pose: CamPose;
  /** When it was saved (ms), so a full set replaces the oldest. */
  at: number;
}

export const BOOKMARK_SLOTS = 9;
/** Names offered before the room names (Hub > View > Save this view). */
export const BOOKMARK_NAMES = ['Overview', 'Gatehouse view', 'Yard', 'Front', 'Roof', 'Loading bay', 'Data hall', 'Stair core'];

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Reads stored bookmarks, keeping only whole, valid ones (one per slot, slots 1-9). */
export function readBookmarks(raw: unknown): Bookmark[] {
  if (!Array.isArray(raw)) return [];
  const out: Bookmark[] = [];
  for (const r of raw as Record<string, unknown>[]) {
    const p = r?.pose as Record<string, unknown> | undefined;
    const pos = p?.pos;
    if (!r || !num(r.slot) || r.slot < 1 || r.slot > BOOKMARK_SLOTS || Math.round(r.slot) !== r.slot) continue;
    if (typeof r.name !== 'string' || typeof r.level !== 'string' || !p || !Array.isArray(pos) || pos.length !== 3 || !pos.every(num)) continue;
    if (!num(p.yaw) || !num(p.pitch) || !num(p.fov)) continue;
    if (out.some((b) => b.slot === r.slot)) continue;
    out.push({ slot: r.slot, name: r.name, level: r.level, pose: { pos: [pos[0] as number, pos[1] as number, pos[2] as number], yaw: p.yaw, pitch: p.pitch, fov: p.fov }, at: num(r.at) ? r.at : 0 });
  }
  return out.sort((a, b) => a.slot - b.slot);
}

/** The slot a new bookmark takes: the first free one, else the oldest. */
export function freeSlot(list: readonly Bookmark[]): number {
  for (let s = 1; s <= BOOKMARK_SLOTS; s++) if (!list.some((b) => b.slot === s)) return s;
  return list.slice().sort((a, b) => a.at - b.at)[0]?.slot ?? 1;
}

/** The list with `b` in its slot (replacing what was there). */
export function putBookmark(list: readonly Bookmark[], b: Bookmark): Bookmark[] {
  return [...list.filter((x) => x.slot !== b.slot), b].sort((x, y) => x.slot - y.slot);
}
