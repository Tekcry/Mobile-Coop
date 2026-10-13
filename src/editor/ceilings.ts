/**
 * ON13: ceilings, ceiling voids, hatches and crawl spaces in the editor (pure, Babylon-free; tests/editor/ceilings.test.ts).
 * A room's ceiling is a piece of its own: the element `ceilings:<room id>` is the room's ceiling fields (`ceiling`,
 * `ceilingType`, `hatches`), read and written back by model.ts (`ceilingOf`, `applyCeiling`). The void over a ceiling
 * runs to the underside of the slab above; its clear height is checked against the crawl rule (facts `duct.crouchHeight`,
 * F32). Crawl spaces are `crawls[]` records (schema.md section 2). The types, hatch sizes and the walk test's boxes are
 * src/world/maps/kestrelCeilings.ts (shared with the game).
 */
import facts from '../../scripts/kestrel/facts.json';
import { hyp2 } from '../core/mathx';
import { CEILING_TYPE_IDS, CEILING_TYPES, ceilingType, crawlLength, hatchSize } from '../world/maps/kestrelCeilings';
import type { CeilingType, CeilingTypeDef, CrawlEnd, CrawlRecord } from '../world/maps/kestrelCeilings';
import { fmt } from './geometry';
import type { Campus, Pt, Rect, Room } from './types';

export type { CrawlRecord, CrawlEnd } from '../world/maps/kestrelCeilings';

/** The crawl rule (F32): a crawl space is at least this clear inside. */
export const CRAWL_RULE = facts.duct.crouchHeight.value;
const SLAB = facts.room.slab.value;
const ROOM_CEILING = facts.room.ceiling.value;
const CORRIDOR = facts.ceiling.corridor.value;
const MIN = facts.ceiling.min.value;
const END_REACH = facts.ceiling.endReach.value;
export const CRAWL_W_MIN = facts.crawl.widthMin.value;
export const CRAWL_W_MAX = facts.crawl.widthMax.value;
export const CRAWL_W_DEFAULT = facts.crawl.widthDefault.value;
const CROUCH = facts.player.crouchHeight.value;
const MANTLE = facts.traverse.mantleMax.value;
const GRAB = facts.reach.grabMax.value;
const JUMP_GRAB = facts.reach.jumpGrab.value;
const EPS = 1e-6;
const r3 = (v: number): number => +v.toFixed(3);

/** Green when a void or crawl space meets the crawl rule, red when not. */
export const RULE_OK = '#2f9e44';
export const RULE_BAD = '#e03131';
export const ruleColour = (clear: number): string => (clear >= CRAWL_RULE - EPS ? RULE_OK : RULE_BAD);

// ---------- the ceiling piece ----------
/** A room's ceiling as an element (`ceilings:<room id>`): the room's ceiling fields plus what drawing and words need. */
export interface Ceiling {
  id: string;
  level: string;
  name?: string;
  kind: string;
  rect: Rect;
  ceiling: number;
  ceilingType?: string;
  hatches?: Pt[];
  [k: string]: unknown;
}

/** The ceiling element of a room (only its own fields; `ceilingType` and `hatches` stay absent when the room has none). */
export function ceilingOf(r: Room): Ceiling {
  const c: Ceiling = { id: r.id, level: r.level, kind: r.kind, rect: r.rect, ceiling: typeof r.ceiling === 'number' ? r.ceiling : 0 };
  if (typeof r.name === 'string') c.name = r.name;
  if (typeof r.ceilingType === 'string') c.ceilingType = r.ceilingType;
  if (Array.isArray(r.hatches)) c.hatches = (r.hatches as Pt[]).map((h): Pt => [h[0], h[1]]);
  return c;
}

/** Writes a ceiling element back into its room (absent fields are taken off the room). */
export function applyCeiling(r: Room, c: Ceiling): void {
  if (r.ceiling !== c.ceiling) r.ceiling = c.ceiling;
  if (typeof c.ceilingType === 'string') r.ceilingType = c.ceilingType;
  else delete r.ceilingType;
  if (Array.isArray(c.hatches) && c.hatches.length) r.hatches = c.hatches.map((h): Pt => [h[0], h[1]]);
  else delete r.hatches;
}

export const typeOf = (c: Pick<Ceiling, 'kind' | 'ceiling' | 'ceilingType'>): CeilingTypeDef => ceilingType(c);

type Lv = Pick<Campus, 'levels' | 'rooms'>;
const within = (r: Rect | readonly number[], x: number, z: number): boolean => x > r[0]! - EPS && x < r[2]! + EPS && z > r[1]! - EPS && z < r[3]! + EPS;

/**
 * The underside of what is over a room, above its floor: the slab under the lowest level above whose rooms cover the
 * room's middle (that level's floor less facts `room.slab`), else the top of its own level less a slab (the roof).
 */
export function soffitOver(d: Lv, r: Pick<Room, 'level' | 'rect'>): { soffit: number; above: string } {
  const L = d.levels.find((l) => l.id === r.level);
  if (!L) return { soffit: 0, above: '' };
  const mx = (r.rect[0] + r.rect[2]) / 2;
  const mz = (r.rect[1] + r.rect[3]) / 2;
  const ups = d.levels.filter((l) => l.floor > L.floor + EPS).sort((a, b) => a.floor - b.floor);
  for (const u of ups) if (d.rooms.some((q) => q.level === u.id && within(q.rect, mx, mz))) return { soffit: r3(u.floor - SLAB - L.floor), above: u.id };
  return { soffit: r3(L.height - SLAB), above: '' };
}

/** The void over a ceiling: from the ceiling's top to the slab's underside (above the floor), its clear height and the rule. */
export interface VoidInfo {
  y0: number;
  y1: number;
  clear: number;
  ok: boolean;
  colour: string;
  words: string;
}

/** The void over a room's ceiling (decision 2), or null where there is none (open, an exposed slab, no height). */
export function voidOf(d: Lv, r: Pick<Ceiling, 'level' | 'rect' | 'kind' | 'ceiling' | 'ceilingType'>): VoidInfo | null {
  const t = ceilingType(r);
  if (t.id === 'open' || t.id === 'slab' || !(r.ceiling > 0)) return null;
  const { soffit } = soffitOver(d, r);
  const y0 = r3(r.ceiling + t.thick);
  const clear = r3(soffit - y0);
  if (clear <= EPS) return null;
  const ok = clear >= CRAWL_RULE - EPS;
  const words = `Void ${fmt(clear)} m clear (slab underside ${fmt(soffit)} m less the ${t.name.toLowerCase()} at ${fmt(r.ceiling)} m, ${fmt(t.thick * 1000)} mm): ${ok ? 'meets' : `${fmt(CRAWL_RULE - clear)} m under`} the ${fmt(CRAWL_RULE)} m crawl rule (F32)`;
  return { y0, y1: soffit, clear, ok, colour: ok ? RULE_OK : RULE_BAD, words };
}

/** What the player can do at a hatch at this height (the game's mantle and grab reach, facts `traverse` and `reach`). */
export function hatchReach(top: number): string {
  if (top <= MANTLE + EPS) return `climb up through it (mantle, up to ${fmt(MANTLE)} m)`;
  if (top <= GRAB + EPS) return `reach up, grab the edge and climb through (grab up to ${fmt(GRAB)} m)`;
  if (top <= JUMP_GRAB + EPS) return `jump, grab the edge and climb through (jump grab up to ${fmt(JUMP_GRAB)} m)`;
  return `out of reach from the floor (jump grab ${fmt(JUMP_GRAB)} m): needs a ladder or something to stand on`;
}

/**
 * A hatch at `p` in this ceiling (decision 4): on a grid ceiling the tile under it (tiles laid from the room's south-west
 * corner, a whole tile inside the room); elsewhere an access hatch centred on `p` on the 0.1 m grid, kept inside the room.
 */
export function snapHatch(c: Pick<Ceiling, 'rect' | 'kind' | 'ceiling' | 'ceilingType'>, p: Pt): Pt {
  const t = ceilingType(c);
  const s = hatchSize(t);
  const [x0, z0, x1, z1] = c.rect;
  if (t.anyTile) {
    const along = (v: number, a: number, b: number): number => {
      const n = Math.floor((b - a) / s + EPS);
      if (n < 1) return r3((a + b) / 2);
      const i = Math.min(n - 1, Math.max(0, Math.floor((v - a) / s)));
      return r3(a + (i + 0.5) * s);
    };
    return [along(p[0], x0, x1), along(p[1], z0, z1)];
  }
  const keep = (v: number, a: number, b: number): number => (b - a < s ? r3((a + b) / 2) : Math.min(r3(b - s / 2), Math.max(r3(a + s / 2), Math.round(v * 10) / 10)));
  return [keep(p[0], x0, x1), keep(p[1], z0, z1)];
}

/** The ceiling with a hatch at `p` (snapped; null when there is no ceiling or a hatch is already there). */
export function addHatch(c: Ceiling, p: Pt): Ceiling | null {
  const t = ceilingType(c);
  if (t.id === 'open') return null;
  const h = snapHatch(c, p);
  const s = hatchSize(t);
  if ((c.hatches ?? []).some((q) => Math.abs(q[0] - h[0]) < s - EPS && Math.abs(q[1] - h[1]) < s - EPS)) return null;
  return { ...c, hatches: [...(c.hatches ?? []), h] };
}

/** The hatch of this ceiling within reach of `p`, if any. */
export function hatchNear(c: Pick<Ceiling, 'hatches'>, p: Pt, reach = END_REACH): Pt | null {
  let best: Pt | null = null;
  let bd = reach + EPS;
  for (const h of c.hatches ?? []) {
    const dd = hyp2(h[0] - p[0], h[1] - p[1]);
    if (dd < bd) {
      bd = dd;
      best = h;
    }
  }
  return best;
}

/** The default height a ceiling of this room takes when it is given one (a corridor: the voided corridor's 2.4). */
const defaultHeight = (d: Lv, c: Ceiling): number => Math.min(c.kind === 'corridor' ? CORRIDOR : ROOM_CEILING, soffitOver(d, c).soffit);

/** The ceiling with this type (open takes the height and hatches away; from open the default height comes back). */
export function withCeilingType(d: Lv, c: Ceiling, id: CeilingType): Ceiling {
  const a: Ceiling = { ...c };
  if (id === 'open') {
    a.ceiling = 0;
    delete a.ceilingType;
    delete a.hatches;
    return a;
  }
  if (!(a.ceiling > 0)) a.ceiling = defaultHeight(d, c);
  a.ceilingType = id;
  return a;
}

/** The ceiling card's rows (decision 1): type, height, hatches. */
export function ceilingRows(c: Ceiling): { id: string; label: string; value: string; kind: 'list' | 'len' }[] {
  const t = ceilingType(c);
  const n = (c.hatches ?? []).length;
  return [
    { id: 'type', label: 'Type', value: t.name, kind: 'list' },
    { id: 'height', label: 'Height', value: c.ceiling > 0 ? `${fmt(c.ceiling)} m` : 'none', kind: 'len' },
    { id: 'hatches', label: 'Hatches', value: t.id === 'open' ? '-' : t.anyTile ? `${n} marked (any tile lifts)` : `${n}`, kind: 'list' },
  ];
}

/**
 * One step of a ceiling card row: Type through the types; Height by `step` from facts `ceiling.min` to the slab's
 * underside (below the minimum: none; from none: the default); Hatches right adds one at `dot` (in the room, else its
 * middle), left takes the last off. Null when nothing changes.
 */
export function stepCeiling(d: Lv, c: Ceiling, row: string, dir: 1 | -1, step: number, dot?: Pt): Ceiling | null {
  if (row === 'type') {
    const cur = ceilingType(c).id;
    const ids = CEILING_TYPE_IDS;
    return withCeilingType(d, c, ids[(ids.indexOf(cur) + dir + ids.length) % ids.length]!);
  }
  if (row === 'height') {
    const max = soffitOver(d, c).soffit;
    if (!(c.ceiling > 0)) return dir > 0 ? withCeilingType(d, c, ceilingType({ ...c, ceiling: 1 }).id) : null;
    const v = r3(c.ceiling + dir * step);
    if (v < MIN - EPS) return withCeilingType(d, c, 'open');
    const h = Math.min(max, v);
    return h === c.ceiling ? null : { ...c, ceiling: h };
  }
  if (row === 'hatches') {
    if (dir < 0) return c.hatches?.length ? { ...c, hatches: c.hatches.slice(0, -1) } : null;
    const p: Pt = dot && within(c.rect, dot[0], dot[1]) ? dot : [(c.rect[0] + c.rect[2]) / 2, (c.rect[1] + c.rect[3]) / 2];
    return addHatch(c, p);
  }
  return null;
}

/** The ceiling's words for the card's foot: what it is, the void and the rule, the hatches and what the player can do. */
export function ceilingWords(d: Lv, c: Ceiling): string {
  const t = ceilingType(c);
  if (t.id === 'open') return 'No ceiling: the slab above shows. Type or Height gives it one.';
  const v = voidOf(d, c);
  const hs = c.hatches ?? [];
  const top = r3(c.ceiling + t.thick);
  const walk = t.stand ? 'the player can stand on it' : t.collide ? 'solid from below (one-sided collision is not available: the walk test lets a player stand on it; crawl boards are the route)' : 'tiles do not hold the player (a crawl space has boards)';
  const hatch = t.anyTile ? `any tile lifts (${hs.length} marked)` : hs.length ? `${hs.length} access hatch${hs.length === 1 ? '' : 'es'}` : 'no access hatch (only placed hatches open)';
  const pos = hs.length ? `: ${hs.map((h) => `x ${fmt(h[0])} z ${fmt(h[1])}`).join('; ')}` : '';
  return `${t.name} at ${fmt(c.ceiling)} m; ${walk}. ${v ? `${v.words}. ` : t.id === 'slab' ? 'No void (the slab is the ceiling). ' : ''}Hatches: ${hatch}${pos}; from below ${hatchReach(top)}. Guards never enter voids.`;
}

// ---------- crawl spaces ----------
/** A fresh crawl id: CR1, CR2 ... */
export function crawlId(d: { crawls?: { id: string }[] }): string {
  const used = new Set((d.crawls ?? []).map((c) => c.id));
  for (let i = 1; ; i++) if (!used.has(`CR${i}`)) return `CR${i}`;
}

type CrawlData = Pick<Campus, 'levels' | 'rooms' | 'exterior'>;

/** The room on `level` whose rect holds `p` and has a ceiling (the smallest, so a corridor wins over a zone round it). */
function ceilingRoomAt(d: CrawlData, level: string, p: Pt): Room | undefined {
  let best: Room | undefined;
  for (const r of d.rooms) {
    if (r.level !== level || !within(r.rect, p[0], p[1]) || ceilingType(r).id === 'open') continue;
    if (!best || (r.rect[2] - r.rect[0]) * (r.rect[3] - r.rect[1]) < (best.rect[2] - best.rect[0]) * (best.rect[3] - best.rect[1])) best = r;
  }
  return best;
}

/**
 * What a crawl end at `p` takes (decision 3): a vent (an ON5 vent piece within facts `ceiling.endReach`), else a hatch
 * in the ceiling over `p` (a hatch already there, else a new one at the tile or the point), else an open end.
 */
export function crawlEnd(d: CrawlData, level: string, p: Pt): CrawlEnd {
  let vent: { id: string; a: Pt } | null = null;
  let vd = END_REACH + EPS;
  for (const e of d.exterior ?? []) {
    if (e.kind !== 'vent' || (e.level && e.level !== level)) continue;
    const dd = hyp2(e.a[0] - p[0], e.a[1] - p[1]);
    if (dd < vd) {
      vd = dd;
      vent = { id: e.id, a: e.a };
    }
  }
  if (vent) return { kind: 'vent', ref: vent.id, at: [vent.a[0], vent.a[1]] };
  const r = ceilingRoomAt(d, level, p);
  if (r) {
    const c = ceilingOf(r);
    return { kind: 'hatch', ref: r.id, at: hatchNear(c, p) ?? snapHatch(c, p) };
  }
  return { kind: 'open', ref: '', at: [r3(p[0]), r3(p[1])] };
}

/** The heights of a crawl at `p` (decision 3, default inside a ceiling void): the void's, else the floor up to the ceiling or the slab. */
export function crawlHeights(d: CrawlData, level: string, p: Pt): { y0: number; y1: number; inVoid: boolean } {
  const r = ceilingRoomAt(d, level, p);
  const v = r ? voidOf(d, ceilingOf(r)) : null;
  if (v) return { y0: v.y0, y1: v.y1, inVoid: true };
  const L = d.levels.find((l) => l.id === level);
  const top = (r?.ceiling ?? 0) > 0 ? (r?.ceiling ?? 0) : (L?.height ?? 0) - SLAB;
  return { y0: 0, y1: r3(Math.max(0, top)), inVoid: false };
}

/** A new crawl space from `a` to `b` (ends taken at hatches or vents, heights from the void at the route's middle). */
export function newCrawl(d: CrawlData, id: string, level: string, a: Pt, b: Pt, width = CRAWL_W_DEFAULT): CrawlRecord {
  const e0 = crawlEnd(d, level, a);
  const e1 = crawlEnd(d, level, b);
  const p0: Pt = e0.kind === 'open' ? a : e0.at;
  const p1: Pt = e1.kind === 'open' ? b : e1.at;
  const h = crawlHeights(d, level, [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2]);
  return { id, level, path: [[r3(p0[0]), r3(p0[1])], [r3(p1[0]), r3(p1[1])]], width, y0: h.y0, y1: h.y1, ends: [e0, e1] };
}

/** The crawl with its last point moved to `p` (the leg being drawn); the end is taken again. */
export function dragCrawl(d: CrawlData, c: CrawlRecord, p: Pt): CrawlRecord {
  const e = crawlEnd(d, c.level, p);
  const path = c.path.slice(0, -1);
  path.push(e.kind === 'open' ? [r3(p[0]), r3(p[1])] : e.at);
  const ends = [c.ends[0] ?? crawlEnd(d, c.level, path[0]!), e];
  // a fresh route takes its heights from its middle (a route being extended keeps them)
  if (path.length === 2) {
    const h = crawlHeights(d, c.level, [(path[0]![0] + path[1]![0]) / 2, (path[0]![1] + path[1]![1]) / 2]);
    return { ...c, path, ends, y0: h.y0, y1: h.y1 };
  }
  return { ...c, path, ends };
}

/** The crawl with one more point at its end (the next leg, drawn from the last point). */
export function extendCrawl(c: CrawlRecord): CrawlRecord {
  const last = c.path[c.path.length - 1]!;
  return { ...c, path: [...c.path, [last[0], last[1]]] };
}

/** The crawl moved by (dx, dz): every point and its ends' points (a hatch or vent end stays named; the next drop takes them again). */
export function moveCrawl(c: CrawlRecord, dx: number, dz: number): CrawlRecord {
  const mv = (p: Pt): Pt => [r3(p[0] + dx), r3(p[1] + dz)];
  return { ...c, path: c.path.map(mv), ends: c.ends.map((e) => ({ ...e, at: mv(e.at) })) };
}

/** A drawn or moved crawl on the drop: legs shorter than `minLeg` merged away; the ends taken again. Null when too short. */
export function settleCrawl(d: CrawlData, c: CrawlRecord, minLeg: number): CrawlRecord | null {
  const path: Pt[] = [];
  for (const p of c.path) if (!path.length || hyp2(p[0] - path[path.length - 1]![0], p[1] - path[path.length - 1]![1]) >= minLeg - EPS) path.push(p);
  if (path.length < 2) return null;
  const e0 = crawlEnd(d, c.level, path[0]!);
  const e1 = crawlEnd(d, c.level, path[path.length - 1]!);
  if (e0.kind !== 'open') path[0] = e0.at;
  if (e1.kind !== 'open') path[path.length - 1] = e1.at;
  return { ...c, path, ends: [e0, e1] };
}

/** The hatches a crawl's ends need that their ceilings do not have yet (decision 4: placed with the crawl). */
export function hatchesFor(d: CrawlData, c: CrawlRecord): { room: Room; after: Ceiling }[] {
  const out: { room: Room; after: Ceiling }[] = [];
  for (const e of c.ends) {
    if (e.kind !== 'hatch') continue;
    const r = d.rooms.find((q) => q.id === e.ref);
    if (!r) continue;
    const prev = out.find((o) => o.room.id === r.id);
    const c0 = prev ? prev.after : ceilingOf(r);
    if (hatchNear(c0, e.at, 0.01)) continue;
    const a = addHatch(c0, e.at);
    if (!a) continue;
    if (prev) prev.after = a;
    else out.push({ room: r, after: a });
  }
  return out;
}

const endName = (d: CrawlData, e: CrawlEnd): string => (e.kind === 'vent' ? `vent ${e.ref}` : e.kind === 'hatch' ? `a hatch in ${d.rooms.find((r) => r.id === e.ref)?.name || e.ref}` : `an open end at x ${fmt(e.at[0])} z ${fmt(e.at[1])}`);

/** A crawl's words: its size and rule, its ends, what the player does in it (decision 5) and the guards (decision 7). */
export function crawlWords(d: CrawlData, c: CrawlRecord): string {
  const clear = r3(c.y1 - c.y0);
  const ok = clear >= CRAWL_RULE - EPS;
  const narrow = c.width < CRAWL_W_MAX - EPS ? `; narrower than the ${fmt(CRAWL_W_MAX)} m crouch width (F32)` : '';
  const ends = c.ends.length >= 2 ? `From ${endName(d, c.ends[0]!)} to ${endName(d, c.ends[c.ends.length - 1]!)}. ` : '';
  const room = c.ends.find((e) => e.kind === 'hatch');
  const r = room ? d.rooms.find((q) => q.id === room.ref) : undefined;
  const reach = r ? ` Hatch from below: ${hatchReach(r3((r.ceiling ?? 0) + ceilingType(r).thick))}.` : '';
  return `${fmt(crawlLength(c))} m crawl space, ${fmt(c.width)} m wide, ${fmt(clear)} m clear: ${ok ? 'meets' : `${fmt(CRAWL_RULE - clear)} m under`} the ${fmt(CRAWL_RULE)} m crawl rule${narrow}. ${ends}A crouch space: the player crouch-moves through it (crouch height ${fmt(CROUCH)} m${clear >= CROUCH - EPS ? ' fits' : ' does not fit'}); the game's duct move is for the Climb tab's Duct crawl, not used here.${reach} Guards never enter voids.`;
}

/** The crawl card's rows: name, width, floor height, clear height, the two ends, id. */
export function crawlRows(c: CrawlRecord): { id: string; label: string; value: string; kind: 'list' | 'len' | 'name' | 'id' }[] {
  const e = (i: number): string => {
    const x = c.ends[i];
    return x ? (x.kind === 'vent' ? `Vent ${x.ref}` : x.kind === 'hatch' ? `Hatch in ${x.ref}` : 'Open') : '-';
  };
  return [
    { id: 'name', label: 'Name', value: c.name || '(none)', kind: 'name' },
    { id: 'width', label: 'Width', value: `${fmt(c.width)} m`, kind: 'len' },
    { id: 'y0', label: 'Floor height', value: `${fmt(c.y0)} m`, kind: 'len' },
    { id: 'clear', label: 'Clear height', value: `${fmt(c.y1 - c.y0)} m`, kind: 'len' },
    { id: 'start', label: 'Start', value: e(0), kind: 'list' },
    { id: 'end', label: 'End', value: e(c.ends.length - 1), kind: 'list' },
    { id: 'id', label: 'Id', value: c.id, kind: 'id' },
  ];
}

/** One step of a crawl card row: width (facts `crawl.widthMin`-`widthMax`), floor height (the top keeps its height), clear height. */
export function stepCrawl(c: CrawlRecord, row: string, dir: 1 | -1, step: number): CrawlRecord | null {
  if (row === 'width') {
    const w = Math.min(CRAWL_W_MAX, Math.max(CRAWL_W_MIN, r3(c.width + dir * step)));
    return w === c.width ? null : { ...c, width: w };
  }
  if (row === 'y0') {
    const y0 = Math.max(0, r3(c.y0 + dir * step));
    return y0 === c.y0 || c.y1 - y0 < step - EPS ? null : { ...c, y0 };
  }
  if (row === 'clear') {
    const y1 = r3(c.y1 + dir * step);
    return y1 - c.y0 < step - EPS ? null : { ...c, y1 };
  }
  return null;
}

export { CEILING_TYPES };
