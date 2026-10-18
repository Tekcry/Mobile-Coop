/**
 * Levels, renaming and building outlines in the level editor (ON2, ED2 Part E), pure: add a level above or below, duplicate
 * a level one storey up, delete a level with everything on it, change a storey height (the levels above move, matching
 * walls may stretch, stairs get the rule's risers), rename any id with every reference, and the building footprints with
 * the RULES 2 caps. Each returns the changes of one undo step; the editor commits them with its own words. Babylon- and
 * DOM-free (tests/editor/levels.test.ts).
 */
import facts from '../../scripts/kestrel/facts.json';
import { EPS, fmt } from './geometry';
import type { Change } from './model';
import { STAIR_FACTS } from './vertical';
import type { Building, Campus, Coll, Elem, Level, Opening, Rect, Stair } from './types';

const F = facts as unknown as Record<string, Record<string, { value: number }>>;
const rule = (k: string): number => {
  const f = F.rules?.[k];
  if (!f) throw new Error(`facts.json: rules.${k} is needed`);
  return f.value;
};
/** RULES 2 caps (facts.json `rules`): site 110 x 80, each building 48 x 30. Warned, never enforced. */
export const CAPS = { siteX: rule('siteMaxX'), siteZ: rule('siteMaxZ'), buildingX: rule('footprintMaxX'), buildingZ: rule('footprintMaxZ') };

/** The name list for a new or renamed level (ON2 decision 7); "Type a name..." gives any other. */
export const LEVEL_NAMES = ['Ground', 'First', 'Second', 'Third', 'Roof', 'Basement', 'Mezzanine'];

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const r3 = (x: number): number => +x.toFixed(3);
const byFloor = (d: Campus): Level[] => d.levels.slice().sort((a, b) => a.floor - b.floor);

/** A free level id in the file's style (one capital): the name's letters in order, then A-Z, then L1, L2 ... */
export function levelIdFor(d: Campus, name: string): string {
  const used = new Set(d.levels.map((l) => l.id));
  for (const ch of `${name.toUpperCase().replace(/[^A-Z]/g, '')}ABCDEFGHIJKLMNOPQRSTUVWXYZ`) if (!used.has(ch)) return ch;
  for (let n = 1; ; n++) if (!used.has(`L${n}`)) return `L${n}`;
}

/** The index a level of floor `floor` takes in the (floor-ordered) levels list. */
function levelIndex(levels: readonly Level[], floor: number, skip?: string): number {
  const i = levels.filter((l) => l.id !== skip).findIndex((l) => l.floor > floor + EPS);
  return i < 0 ? levels.length : i;
}

export interface LevelEdit {
  changes: Change[];
  words: string;
  /** The new level's id (add, duplicate). */
  id?: string;
}

/**
 * Add a level above or below `ref` (ON2 decision 7): its storey height is ref's; above, it starts where ref's storey ends and
 * every level at or above that moves up by its height; below, it ends at ref's floor and every level under ref moves down.
 * It covers ref's footprint.
 */
export function addLevel(d: Campus, ref: string, where: 'above' | 'below', name: string): LevelEdit | null {
  const r = d.levels.find((l) => l.id === ref);
  if (!r) return null;
  const h = r.height;
  const floor = r3(where === 'above' ? r.floor + r.height : r.floor - h);
  const changes: Change[] = [];
  let moved = 0;
  for (const l of d.levels) {
    const move = where === 'above' ? l.floor >= floor - EPS : l.floor < r.floor - EPS;
    if (!move) continue;
    moved++;
    changes.push({ coll: 'levels', id: l.id, before: clone(l), after: { ...clone(l), floor: r3(l.floor + (where === 'above' ? h : -h)) } });
  }
  const id = levelIdFor(d, name);
  const lvl: Level = { id, name, floor, height: h };
  if (r.footprint !== undefined) lvl.footprint = clone(r.footprint);
  // the add goes in floor order after the moves
  const after = d.levels.map((l) => (changes.find((c) => c.id === l.id)?.after as Level | undefined) ?? l);
  changes.push({ coll: 'levels', id, before: null, after: lvl, index: levelIndex(after, floor) });
  const words = `Added level ${name} (${id}) ${where} ${r.name} at ${fmt(floor)} m, storey ${fmt(h)} m${moved ? `; ${moved} level${moved === 1 ? '' : 's'} ${where === 'above' ? 'above moved up' : 'below moved down'} ${fmt(h)} m` : ''}`;
  return { changes, words, id };
}

/** Everything on a level: rooms, walls (with their openings), objects and floor holes on it, stairs and ladders from or to it. */
export function levelContents(d: Campus, id: string): { coll: Coll; e: Elem }[] {
  const out: { coll: Coll; e: Elem }[] = [];
  const walls = new Set(d.walls.filter((w) => w.level === id).map((w) => w.id));
  for (const o of d.openings) if (walls.has(o.wall)) out.push({ coll: 'openings', e: o });
  for (const w of d.walls) if (w.level === id) out.push({ coll: 'walls', e: w });
  for (const r of d.rooms) if (r.level === id) out.push({ coll: 'rooms', e: r });
  for (const s of d.stairs) if (s.from === id || s.to === id) out.push({ coll: 'stairs', e: s });
  for (const l of d.ladders) if (l.from === id || l.to === id) out.push({ coll: 'ladders', e: l });
  for (const v of d.voids) if (v.level === id) out.push({ coll: 'voids', e: v });
  // ON10: the roofs drawn on it
  for (const r of d.roofs ?? []) if (r.level === id) out.push({ coll: 'roofs', e: r });
  for (const o of (d.objects as Elem[] | undefined) ?? []) if ((o as { level?: string }).level === id) out.push({ coll: 'objects', e: o });
  return out;
}

const COLL_WORDS: Record<string, [string, string]> = {
  rooms: ['room', 'rooms'], walls: ['wall', 'walls'], openings: ['door or window', 'doors and windows'], stairs: ['stair', 'stairs'],
  ladders: ['ladder', 'ladders'], voids: ['floor hole', 'floor holes'], roofs: ['roof', 'roofs'], objects: ['object', 'objects'],
};
/** "12 rooms, 40 walls, 3 doors and windows". */
export function countWords(items: readonly { coll: Coll }[]): string {
  const n = new Map<string, number>();
  for (const i of items) n.set(i.coll, (n.get(i.coll) ?? 0) + 1);
  return [...n].map(([c, k]) => `${k} ${COLL_WORDS[c]?.[k === 1 ? 0 : 1] ?? c}`).join(', ') || 'nothing on it';
}

/** Delete a level and everything on it (one undo step). The levels above keep their floors. */
export function deleteLevel(d: Campus, id: string): LevelEdit | null {
  const l = d.levels.find((q) => q.id === id);
  if (!l) return null;
  const items = levelContents(d, id);
  const changes: Change[] = items.map((i) => ({ coll: i.coll, id: i.e.id, before: clone(i.e), after: null }));
  // a stair from this level has its well on the level above: it goes too (the model's stair link would add it anyway)
  for (const s of d.stairs.filter((q) => q.from === id)) {
    const well = d.voids.find((v) => v.kind === 'stairwell' && v.level === s.to && v.rect.every((x, k) => Math.abs(x - s.rect[k]!) < EPS));
    if (well && !changes.some((c) => c.coll === 'voids' && c.id === well.id)) changes.push({ coll: 'voids', id: well.id, before: clone(well), after: null });
  }
  changes.push({ coll: 'levels', id, before: clone(l), after: null });
  return { changes, words: `Deleted level ${l.name} (${id}) with ${countWords(items)}` };
}

/**
 * A copy of an id for the level copy: the level id swapped where it stands as its own part ("G-FRONT" to "S-FRONT",
 * "WG003" to "WS003", "VG-NEW1" to "VS-NEW1"), else "-<new level>" added; a number on the end when taken.
 */
export function copyId(old: string, from: string, to: string, used: Set<string>): string {
  const esc = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let id = old.replace(new RegExp(`^${esc}(?=-|\\d|$)`), to);
  if (id === old) id = old.replace(new RegExp(`^([WV])${esc}(?=-|\\d)`), `$1${to}`);
  if (id === old) id = `${old}-${to}`;
  let out = id;
  for (let n = 2; used.has(out); n++) out = `${id}-${n}`;
  used.add(out);
  return out;
}

/**
 * Duplicate a level one storey up (ON2 decision 7): a new level above it (as addLevel), and its rooms, walls, openings,
 * objects and floor holes copied there with new ids (openings keep their walls and rooms, by the new ids).
 */
export function duplicateLevel(d: Campus, id: string, name: string): LevelEdit | null {
  const src = d.levels.find((l) => l.id === id);
  const add = addLevel(d, id, 'above', name);
  if (!src || !add?.id) return null;
  const to = add.id;
  const used = new Set<string>([...d.rooms, ...d.walls, ...d.openings, ...d.voids, ...((d.objects as Elem[] | undefined) ?? [])].map((e) => e.id));
  const map = new Map<string, string>();
  const out: Change[] = [...add.changes];
  const copy = (coll: Coll, e: Elem, extra: Record<string, unknown>): void => {
    const nid = copyId(e.id, id, to, used);
    map.set(`${coll}:${e.id}`, nid);
    out.push({ coll, id: nid, before: null, after: { ...clone(e), id: nid, ...extra } as Elem });
  };
  for (const r of d.rooms) if (r.level === id) copy('rooms', r, { level: to });
  for (const w of d.walls) if (w.level === id) copy('walls', w, { level: to });
  for (const v of d.voids) if (v.level === id) copy('voids', v, { level: to });
  for (const o of (d.objects as Elem[] | undefined) ?? []) if ((o as { level?: string }).level === id) copy('objects', o, { level: to });
  let openings = 0;
  for (const o of d.openings) {
    const wall = map.get(`walls:${o.wall}`);
    if (!wall) continue;
    openings++;
    const between = o.between?.map((r) => map.get(`rooms:${r}`) ?? r);
    copy('openings', o, { wall, ...(between ? { between } : {}) });
  }
  const n = out.length - add.changes.length;
  return { changes: out, id: to, words: `Duplicated ${src.name} (${id}) one storey up as ${name} (${to}): ${n} copied (${openings} doors and windows)` };
}

/** Walls on a level whose height equals `h` (the storey height question: "47 walls were 4.2 m"). */
export function wallsAtHeight(d: Campus, id: string, h: number): number {
  return d.walls.filter((w) => w.level === id && Math.abs(w.h - h) < EPS).length;
}

/**
 * A storey height change (ON2 decision 8): the level's height, every level that started at or above its old storey top
 * moves by the difference, and with `stretch` the level's walls that were exactly the old height take the new one. Stairs
 * whose rise changes get the rule's riser count.
 */
export function storeyChange(d: Campus, id: string, height: number, stretch: boolean): LevelEdit | null {
  const l = d.levels.find((q) => q.id === id);
  if (!l || height <= 0 || Math.abs(height - l.height) < EPS) return null;
  const diff = r3(height - l.height);
  const top = l.floor + l.height;
  const changes: Change[] = [{ coll: 'levels', id, before: clone(l), after: { ...clone(l), height: r3(height) } }];
  const floors = new Map(d.levels.map((q) => [q.id, q.floor]));
  let moved = 0;
  for (const q of d.levels) {
    if (q.id === id || q.floor < top - EPS) continue;
    moved++;
    floors.set(q.id, r3(q.floor + diff));
    changes.push({ coll: 'levels', id: q.id, before: clone(q), after: { ...clone(q), floor: r3(q.floor + diff) } });
  }
  let walls = 0;
  if (stretch) {
    for (const w of d.walls) {
      if (w.level !== id || Math.abs(w.h - l.height) >= EPS) continue;
      walls++;
      changes.push({ coll: 'walls', id: w.id, before: clone(w), after: { ...clone(w), h: r3(height) } });
    }
  }
  let stairs = 0;
  for (const s of d.stairs) {
    const rise = (floors.get(s.to) ?? 0) - (floors.get(s.from) ?? 0);
    const risers = Math.max(2, Math.round(rise / STAIR_FACTS.riserHeight));
    if (rise <= 0 || risers === s.risers) continue;
    stairs++;
    changes.push({ coll: 'stairs', id: s.id, before: clone(s), after: { ...clone(s), risers } as Stair });
  }
  const parts = [`Storey height of ${l.name} ${fmt(l.height)} m to ${fmt(height)} m`];
  if (moved) parts.push(`${moved} level${moved === 1 ? '' : 's'} above moved ${diff > 0 ? 'up' : 'down'} ${fmt(Math.abs(diff))} m`);
  if (walls) parts.push(`${walls} wall${walls === 1 ? '' : 's'} stretched to ${fmt(height)} m`);
  if (stairs) parts.push(`${stairs} stair${stairs === 1 ? '' : 's'} given the rule's risers`);
  return { changes, words: parts.join('; ') };
}

// ---------- renaming ids (ON2 decision 10) ----------
/** Every element that refers to `coll:id`, with the fields that do. */
export function references(d: Campus, coll: Coll, id: string): { coll: Coll; e: Elem; fields: string[] }[] {
  const out: { coll: Coll; e: Elem; fields: string[] }[] = [];
  const add = (c: Coll, e: Elem, f: string[]): void => {
    if (f.length) out.push({ coll: c, e, fields: f });
  };
  if (coll === 'walls') for (const o of d.openings) add('openings', o, o.wall === id ? ['wall'] : []);
  // ON5: a climb piece names the wall it backs onto and the level it was placed from
  if (coll === 'walls') for (const x of (d.exterior as Elem[] | undefined) ?? []) add('exterior', x, (x as { wall?: string }).wall === id ? ['wall'] : []);
  // ON14: a wall sign names its wall; a sign is on a level
  if (coll === 'walls') for (const x of d.signs ?? []) add('signs', x, x.wall === id ? ['wall'] : []);
  if (coll === 'rooms') {
    for (const o of d.openings) add('openings', o, o.between?.includes(id) ? ['between'] : []);
    for (const l of d.ladders) add('ladders', l, l.room === id ? ['room'] : []);
  }
  if (coll === 'levels') {
    for (const k of ['rooms', 'walls', 'voids'] as const) for (const e of d[k]) add(k, e, e.level === id ? ['level'] : []);
    for (const e of d.roofs ?? []) add('roofs', e, e.level === id ? ['level'] : []);
    for (const k of ['stairs', 'ladders'] as const) for (const e of d[k]) add(k, e, [e.from === id ? 'from' : '', e.to === id ? 'to' : ''].filter(Boolean));
    for (const o of (d.objects as Elem[] | undefined) ?? []) add('objects', o, (o as { level?: string }).level === id ? ['level'] : []);
    for (const x of (d.exterior as Elem[] | undefined) ?? []) add('exterior', x, (x as { level?: string }).level === id ? ['level'] : []);
    // ON13: a crawl space is on a level
    for (const x of d.crawls ?? []) add('crawls', x, x.level === id ? ['level'] : []);
    for (const x of d.signs ?? []) add('signs', x, x.level === id ? ['level'] : []);
  }
  return out;
}

/** How many references `coll:id` has (fields, so an opening between a room and itself counts twice). */
export function refCount(d: Campus, coll: Coll, id: string): number {
  let n = 0;
  for (const r of references(d, coll, id)) {
    for (const f of r.fields) n += f === 'between' ? ((r.e as Opening).between ?? []).filter((x) => x === id).length : 1;
  }
  return n;
}

const list = (d: Campus, coll: Coll): Elem[] => (coll === 'buildings' ? ((d.meta.buildings ?? []) as Elem[]) : ((d[coll] as Elem[] | undefined) ?? []));

/** Why an id cannot be used (blocking: empty or taken), else a style warning or ''. */
export function idProblem(d: Campus, coll: Coll, old: string, id: string): { block: boolean; text: string } {
  if (!id.trim()) return { block: true, text: 'An id cannot be empty' };
  if (id !== old && list(d, coll).some((e) => e.id === id)) return { block: true, text: `${id} is already used` };
  const style = coll === 'levels' ? /^[A-Z][A-Z0-9]?$/ : /^[A-Z0-9]+(-[A-Z0-9]+)*$/;
  if (!style.test(id)) return { block: false, text: coll === 'levels' ? `${id} is not in the file's style (one capital letter, like G or F)` : `${id} is not in the file's style (capitals, digits and hyphens, like WG015 or G-FRONT)` };
  return { block: false, text: '' };
}

/** The rename of `coll:old` to `id` and every reference to it, as one edit. */
export function renameChanges(d: Campus, coll: Coll, old: string, id: string): Change[] {
  const e = list(d, coll).find((q) => q.id === old);
  if (!e || id === old) return [];
  const changes: Change[] = [{ coll, id: old, before: clone(e), after: { ...clone(e), id } as Elem }];
  for (const r of references(d, coll, old)) {
    const a = clone(r.e) as Elem & Record<string, unknown>;
    for (const f of r.fields) {
      if (f === 'between') a.between = ((a.between as string[] | undefined) ?? []).map((x) => (x === old ? id : x));
      else a[f] = id;
    }
    changes.push({ coll: r.coll, id: r.e.id, before: clone(r.e), after: a });
  }
  return changes;
}

// ---------- building outlines (ON2 decision 9) ----------
const EDGE_INDEX: Record<string, number> = { W: 0, S: 1, E: 2, N: 3 };

/** One edge of a building's footprint moved by `delta` metres (at least one step wide). */
export function moveBuildingEdge(d: Campus, id: string, edge: 'W' | 'S' | 'E' | 'N', delta: number, step: number): Change[] {
  const b = d.meta.buildings?.find((q) => q.id === id);
  if (!b) return [];
  const r = b.footprint.slice() as Rect;
  const i = EDGE_INDEX[edge]!;
  r[i] = r3(r[i]! + delta);
  if (r[2] - r[0] < step - EPS || r[3] - r[1] < step - EPS) return [];
  const before = clone(b) as Building & Elem;
  return [{ coll: 'buildings', id, before, after: { ...clone(b), footprint: r } as Building & Elem }];
}

/** The RULES 2 caps as warnings (never blocking): building and site sizes, a building outside the site, two overlapping. */
export function outlineWarnings(d: Campus): string[] {
  const out: string[] = [];
  const site = d.meta.site;
  if (site && (site[2] - site[0] > CAPS.siteX + EPS || site[3] - site[1] > CAPS.siteZ + EPS)) out.push(`Site is ${fmt(site[2] - site[0])} x ${fmt(site[3] - site[1])} m, over the ${CAPS.siteX} x ${CAPS.siteZ} m limit`);
  const bs = d.meta.buildings ?? [];
  for (const b of bs) {
    const [x0, z0, x1, z1] = b.footprint;
    if (x1 - x0 > CAPS.buildingX + EPS || z1 - z0 > CAPS.buildingZ + EPS) out.push(`Building ${b.id} is ${fmt(x1 - x0)} x ${fmt(z1 - z0)} m, over the ${CAPS.buildingX} x ${CAPS.buildingZ} m limit`);
    if (site && (x0 < site[0] - EPS || z0 < site[1] - EPS || x1 > site[2] + EPS || z1 > site[3] + EPS)) out.push(`Building ${b.id} reaches outside the site`);
  }
  for (let i = 0; i < bs.length; i++)
    for (let j = i + 1; j < bs.length; j++) {
      const a = bs[i]!.footprint;
      const c = bs[j]!.footprint;
      if (a[0] < c[2] - EPS && c[0] < a[2] - EPS && a[1] < c[3] - EPS && c[1] < a[3] - EPS) out.push(`Buildings ${bs[i]!.id} and ${bs[j]!.id} overlap`);
    }
  return out;
}

/** A level list in floor order (the Levels tab). */
export const levelsByFloor = byFloor;
