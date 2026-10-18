/**
 * Stairs, ladders and floor holes in the level editor (ON2, ED2 Part E), pure: the stair the Stair tool proposes (the
 * smallest legal one, sized by the shared A11 function in src/world/maps/stairs.ts), whether a stair fits its rect and
 * by how much it does not, Fit, the stairwell kept in step with its stair, the ladder the Ladder tool places, and new
 * floor holes. Every number comes from scripts/kestrel/facts.json. Babylon- and DOM-free (tests/editor/vertical.test.ts).
 */
import facts from '../../scripts/kestrel/facts.json';
import { kindWidth, stairSize } from '../world/maps/stairs';
import type { StairFacts, StairSize } from '../world/maps/stairs';
import { EPS, fmt, nearestWall, projectOnWall, snap, wallDir } from './geometry';
import type { Change } from './model';
import type { Campus, Ladder, Level, Pt, Rect, Room, Stair, Void, Wall } from './types';

const v = (g: Record<string, { value: number }>, k: string): number => {
  const f = g[k];
  if (!f) throw new Error(`facts.json: ${k} is needed`);
  return f.value;
};
const F = facts as unknown as Record<string, Record<string, { value: number }>>;

/** The stair facts (facts.json group `stair`). */
export const STAIR_FACTS: StairFacts = {
  riserHeight: v(F.stair!, 'riserHeight'),
  going: v(F.stair!, 'going'),
  maxRisersPerFlight: v(F.stair!, 'maxRisersPerFlight'),
  midLanding: v(F.stair!, 'midLanding'),
  fireLanding: v(F.stair!, 'fireLanding'),
  fireWidth: v(F.stair!, 'fireWidth'),
  mainWidth: v(F.stair!, 'mainWidth'),
  featureWidth: v(F.stair!, 'featureWidth'),
};
/** Reach limits (facts.json `reach`: F05, F06) and the ladder's own sizes (`ladder`). */
export const REACH = { grabMax: v(F.reach!, 'grabMax'), jumpGrab: v(F.reach!, 'jumpGrab') };
const LADDER_WIDTH = v(F.ladder!, 'width');

/** The Stair tool's types (D-pad left / right with the tool; the Build tab's Stair tiles; the card's Type row). */
export const STAIR_TYPES = [
  { id: 'main-dogleg', name: 'Main dogleg', kind: 'main', layout: 'dogleg' },
  { id: 'fire-dogleg', name: 'Fire dogleg', kind: 'fire', layout: 'dogleg' },
  { id: 'main-straight', name: 'Straight', kind: 'main', layout: 'straight' },
] as const;
export type StairTypeId = (typeof STAIR_TYPES)[number]['id'];
export const stairType = (id: string): (typeof STAIR_TYPES)[number] => STAIR_TYPES.find((t) => t.id === id) ?? STAIR_TYPES[0];
/** The type a stair in the file is (a feature or bulkhead stair counts by its layout). */
export function stairTypeOf(s: Stair): StairTypeId {
  if (s.layout === 'dogleg') return s.kind === 'fire' ? 'fire-dogleg' : 'main-dogleg';
  return 'main-straight';
}
/** A stair with another type: kind, layout and the kind's width (risers stay). */
export function withStairType(s: Stair, id: string): Stair {
  const t = stairType(id);
  const out = { ...s, kind: t.kind, width: kindWidth(t.kind, STAIR_FACTS) } as Stair;
  if (t.layout === 'dogleg') out.layout = 'dogleg';
  else delete out.layout;
  delete out.flights;
  return out;
}

/** Floor hole kinds (schema.md voids[].kind) and their words. */
export const HOLE_KINDS = ['stairwell', 'liftshaft', 'riser', 'hatch', 'rooflight'] as const;
export const HOLE_NAMES: Record<string, string> = { stairwell: 'Stair well', liftshaft: 'Lift shaft', riser: 'Riser', hatch: 'Hatch', rooflight: 'Roof light' };

const levelById = (d: Campus, id: string): Level | undefined => d.levels.find((l) => l.id === id);
const sameRect = (a: Rect, b: Rect): boolean => a.every((x, i) => Math.abs(x - b[i]!) < EPS);
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const r3 = (x: number): number => +x.toFixed(3);
/** Up to the next grid step (a stair is never made shorter than the rule). */
const ceilTo = (x: number, g: number): number => r3(Math.ceil(x / g - 1e-6) * g);

/** The level a stair or ladder from `id` climbs to: the level starting where this one's storey ends, else the lowest above it. */
export function levelAbove(d: Campus, id: string): Level | undefined {
  const l = levelById(d, id);
  if (!l) return undefined;
  const above = d.levels.filter((q) => q.floor > l.floor + EPS).sort((a, b) => a.floor - b.floor);
  return above.find((q) => Math.abs(q.floor - (l.floor + l.height)) < EPS) ?? above[0];
}

/** The A11 sizes of a stair between two levels. */
export function sizeBetween(d: Campus, from: string, to: string, type: { kind: string; layout: 'dogleg' | 'straight' }, width?: number): StairSize | null {
  const a = levelById(d, from);
  const b = levelById(d, to);
  if (!a || !b || b.floor <= a.floor) return null;
  return stairSize({ rise: b.floor - a.floor, kind: type.kind, layout: type.layout, width }, STAIR_FACTS);
}

/** The sizes in words: "25 risers of 0.168 m, going 0.285 m, 2 flights (13 + 12), landing 2 m". */
export function sizeWords(z: StairSize): string {
  const flights = z.flights > 1 ? `${z.flights} flights (${z.risers - z.perFlight === z.perFlight ? `${z.perFlight} each` : `${z.perFlight} + ${z.risers - z.perFlight}`})` : '1 flight';
  return `${z.risers} risers of ${z.riserHeight.toFixed(3)} m, going ${z.going} m, ${flights}${z.landing ? `, landing ${fmt(z.landing)} m` : ''}`;
}

const DIRS: Record<string, Pt> = { N: [0, 1], S: [0, -1], E: [1, 0], W: [-1, 0] };

/** A rect from a start corner: `along` metres in the climb direction, `across` metres to the side the dot is on. */
function rectFrom(start: Pt, up: Stair['up'], side: number, along: number, across: number): Rect {
  const [ux, uz] = DIRS[up]!;
  const ax = ux === 0 ? side : 0;
  const az = uz === 0 ? side : 0;
  const x1 = start[0] + ux * along + ax * across;
  const z1 = start[1] + uz * along + az * across;
  return [r3(Math.min(start[0], x1)), r3(Math.min(start[1], z1)), r3(Math.max(start[0], x1)), r3(Math.max(start[1], z1))];
}

export interface StairProposal {
  stair: Stair;
  size: StairSize;
  words: string;
}

/**
 * The Stair tool's proposal (ON2 decision 1): A at the start corner, the dot points the climb (the larger of its x and z
 * offsets; the other picks the side); the smallest legal stair from the facts and the two floor heights (to the level above),
 * rounded up to the grid. Null with a reason when there is no level above.
 */
export function proposeStair(d: Campus, level: string, start: Pt, dot: Pt, typeId: string, id: string, grid: number): StairProposal | { why: string } {
  const t = stairType(typeId);
  const from = levelById(d, level);
  const to = levelAbove(d, level);
  if (!from || !to) return { why: `No level above ${from?.name ?? level}: add one on the hub's Levels tab` };
  const size = sizeBetween(d, from.id, to.id, t);
  if (!size) return { why: 'The level above is not higher' };
  const dx = dot[0] - start[0];
  const dz = dot[1] - start[1];
  const up: Stair['up'] = Math.abs(dx) > Math.abs(dz) ? (dx >= 0 ? 'E' : 'W') : dz >= 0 && Math.abs(dz) > EPS ? 'N' : Math.abs(dz) > EPS ? 'S' : 'N';
  const sideV = up === 'N' || up === 'S' ? dx : dz;
  const side = sideV < -EPS ? -1 : 1;
  const rect = rectFrom(start, up, side, ceilTo(size.length, grid), ceilTo(size.across, grid));
  const name = t.kind === 'fire' ? 'Fire Stair' : 'Main Stair';
  const stair: Stair = { id, name, kind: t.kind, from: from.id, to: to.id, rect, up, width: size.width, risers: size.risers };
  if (t.layout === 'dogleg') stair.layout = 'dogleg';
  const words = `${t.name}, ${from.name} to ${to.name}: ${sizeWords(size)}; ${fmt(rect[2] - rect[0])} x ${fmt(rect[3] - rect[1])} m, climbs ${DIR_WORDS[up]}`;
  return { stair, size, words };
}
const DIR_WORDS: Record<string, string> = { N: 'north', S: 'south', E: 'east', W: 'west' };

export interface StairFit {
  ok: boolean;
  size: StairSize | null;
  /** Rect length along the climb and across it. */
  along: number;
  across: number;
  words: string;
}

/** Whether a stair fits its rect (A11) and, if not, by how much: "needs 1.4 m more length for 25 risers". */
export function stairFit(d: Campus, s: Stair): StairFit {
  const r = s.rect;
  const ns = s.up === 'N' || s.up === 'S';
  const along = ns ? r[3] - r[1] : r[2] - r[0];
  const across = ns ? r[2] - r[0] : r[3] - r[1];
  const size = sizeBetween(d, s.from, s.to, { kind: s.kind, layout: s.layout === 'dogleg' ? 'dogleg' : 'straight' }, typeof s.width === 'number' ? s.width : undefined);
  if (!size) return { ok: false, size, along, across, words: `${levelById(d, s.to)?.name ?? s.to} is not above ${levelById(d, s.from)?.name ?? s.from}` };
  const short: string[] = [];
  if (along < size.length - 1e-3) short.push(`${fmt(size.length - along)} m more length for ${size.risers} risers`);
  if (across < size.across - 1e-3) short.push(`${fmt(size.across - across)} m more width for ${s.layout === 'dogleg' ? `two ${fmt(size.width)} m flights` : `a ${fmt(size.width)} m flight`}`);
  if (size.tooMany) short.push(`fewer risers per flight (${size.perFlight}, most ${STAIR_FACTS.maxRisersPerFlight})`);
  const risers = s.risers !== size.risers ? ` (the file says ${s.risers} risers, the rule ${size.risers}: Fit sets it)` : '';
  if (short.length) return { ok: false, size, along, across, words: `Needs ${short.join(' and ')}${risers}` };
  return { ok: !risers, size, along, across, words: `Fits: ${sizeWords(size)}${risers}` };
}

/**
 * Fit (ON2 decision 2): the smallest legal rect, from the corner the stair was drawn from (its foot edge and its west or
 * south side stay), risers set by the rule. Null when it already fits exactly.
 */
export function fitStair(d: Campus, s: Stair, grid: number): Stair | null {
  const f = stairFit(d, s);
  if (!f.size) return null;
  const r = s.rect;
  const start: Pt = [s.up === 'W' ? r[2] : r[0], s.up === 'S' ? r[3] : r[1]];
  const rect = rectFrom(start, s.up, 1, ceilTo(f.size.length, grid), ceilTo(f.size.across, grid));
  const out = { ...s, rect, risers: f.size.risers } as Stair;
  return JSON.stringify(out) === JSON.stringify(s) ? null : out;
}

/** A quarter turn of the climb (the stair's arrow handle): N, E, S, W; the rect stays. */
export function turnClimb(s: Stair): Stair {
  const next: Record<string, Stair['up']> = { N: 'E', E: 'S', S: 'W', W: 'N' };
  return { ...s, up: next[s.up]! };
}

/** The stairwell of a stair in the data: the `stairwell` void on its to-level with its rect. */
export function wellOf(d: Campus, s: Stair): Void | undefined {
  return d.voids.find((q) => q.kind === 'stairwell' && q.level === s.to && sameRect(q.rect, s.rect));
}

function freshVoidId(d: Campus, s: Stair, taken: Set<string>): string {
  const base = `V${s.to}-${s.id.replace(/^V-/, '')}`;
  const used = new Set([...d.voids.map((q) => q.id), ...taken]);
  if (!used.has(base)) return base;
  for (let n = 2; ; n++) if (!used.has(`${base}-${n}`)) return `${base}-${n}`;
}

/**
 * The stairwell changes a stair edit brings (ON2 decision 3): a new stair makes its well (same rect, kind stairwell, on the
 * to-level); a moved, resized or relevelled one moves its well; a deleted one deletes it. A stair with no matching well
 * before the edit (an old file) gets none. The model runs this on every commit and preview (model.link).
 */
export function stairwellLink(d: Campus, changes: readonly Change[]): Change[] {
  const out: Change[] = [];
  const taken = new Set<string>();
  for (const c of changes) {
    if (c.coll !== 'stairs') continue;
    const b = c.before as Stair | null;
    const a = c.after as Stair | null;
    const match = (s: Stair | null): Void | undefined => (s ? d.voids.find((q) => q.kind === 'stairwell' && q.level === s.to && sameRect(q.rect, s.rect) && !taken.has(q.id)) : undefined);
    const well = match(b) ?? match(a);
    if (b && a) {
      if (!well) continue;
      taken.add(well.id);
      const before = { ...clone(well), level: b.to, rect: [...b.rect] as Rect };
      const after = { ...clone(well), level: a.to, rect: [...a.rect] as Rect };
      if (JSON.stringify(before) !== JSON.stringify(after)) out.push({ coll: 'voids', id: well.id, before: JSON.stringify(before) === JSON.stringify(well) ? clone(well) : before, after });
    } else if (a) {
      // a new stair (a preview that already made its well keeps that id)
      const id = well?.id ?? freshVoidId(d, a, taken);
      taken.add(id);
      const name = typeof a.name === 'string' && a.name ? `${a.name} Well` : 'Stair Well';
      out.push({ coll: 'voids', id, before: null, after: { id, name, level: a.to, rect: [...a.rect] as Rect, kind: 'stairwell', reason: `Stair well over ${a.id}` } });
    } else if (b && well) {
      taken.add(well.id);
      out.push({ coll: 'voids', id: well.id, before: clone(well), after: null });
    }
  }
  return out;
}

// ---------- ladders ----------
export interface LadderProposal {
  ladder: Ladder;
  words: string;
  wall: Wall | null;
}

/** The climb in words, against the reach facts: "climbs 4.2 m to First, beyond jump-grab reach (3.1 m)". */
export function climbWords(d: Campus, from: string, to: string): string {
  const a = levelById(d, from);
  const b = levelById(d, to);
  if (!a || !b) return '';
  const h = b.floor - a.floor;
  const reach = h <= REACH.grabMax + EPS ? `within grab reach (${fmt(REACH.grabMax)} m): a ladder is optional` : h <= REACH.jumpGrab + EPS ? `within jump-grab reach (${fmt(REACH.jumpGrab)} m)` : `beyond jump-grab reach (${fmt(REACH.jumpGrab)} m): the ladder is the way up`;
  return `climbs ${fmt(h)} m to ${b.name}, ${reach}`;
}

/**
 * The Ladder tool (ON2 decision 5): on a wall face (the nearest wall within `reach` m) the foot stands off the wall by half
 * its thickness and half the ladder's width, facing the wall; on open floor it stands at the point facing north. From the
 * editing level to the level above; `room` is the room the foot is in.
 */
export function proposeLadder(d: Campus, level: string, p: Pt, id: string, grid: number, reach: number): LadderProposal | { why: string } {
  const from = levelById(d, level);
  const to = levelAbove(d, level);
  if (!from || !to) return { why: `No level above ${from?.name ?? level}: add one on the hub's Levels tab` };
  const w = nearestWall(d.walls, level, p[0], p[1], reach);
  let at: Pt = [snap(p[0], grid), snap(p[1], grid)];
  let facing = 'N';
  if (w) {
    const s = projectOnWall(w, p[0], p[1]).s;
    const dir = wallDir(w);
    const n: Pt = [-dir[1], dir[0]];
    const q: Pt = [w.a[0] + dir[0] * s, w.a[1] + dir[1] * s];
    const sideSign = (p[0] - q[0]) * n[0] + (p[1] - q[1]) * n[1] >= 0 ? 1 : -1;
    const off = w.t / 2 + LADDER_WIDTH / 2;
    at = [snap(q[0] + n[0] * sideSign * off, grid), snap(q[1] + n[1] * sideSign * off, grid)];
    // the climber faces the wall: against the normal on the side the foot is
    const fx = -n[0] * sideSign;
    const fz = -n[1] * sideSign;
    facing = Math.abs(fx) >= Math.abs(fz) ? (fx > 0 ? 'E' : 'W') : fz > 0 ? 'N' : 'S';
  }
  const room = d.rooms.find((r) => r.level === level && at[0] >= r.rect[0] - EPS && at[0] <= r.rect[2] + EPS && at[1] >= r.rect[1] - EPS && at[1] <= r.rect[3] + EPS) as Room | undefined;
  const ladder: Ladder = { id, name: 'Ladder', ...(room ? { room: room.id } : {}), at, from: from.id, to: to.id, facing, reason: 'Added in the level editor' };
  const words = `Ladder ${climbWords(d, from.id, to.id)}; faces ${DIR_WORDS[facing]}${w ? ` (wall ${w.id})` : ''}`;
  return { ladder, words, wall: w };
}

// ---------- floor holes ----------
/** A new floor hole (ON2 decision 6): the Floor hole tool draws its rect like a room. */
export function newHole(level: string, rect: Rect, kind: string, id: string): Void {
  return { id, name: HOLE_NAMES[kind] ?? 'Floor Hole', level, rect, kind, reason: 'Added in the level editor' };
}
/** A fresh floor hole id on a level: VF-NEW1, VF-NEW2 ... */
export function holeId(d: Campus, level: string): string {
  const used = new Set(d.voids.map((q) => q.id));
  for (let n = 1; ; n++) if (!used.has(`V${level}-NEW${n}`)) return `V${level}-NEW${n}`;
}
/** A fresh stair id: V-STAIR1, V-STAIR2 ... (the campus file's stairs start V-). */
export function stairId(d: Campus): string {
  const used = new Set(d.stairs.map((q) => q.id));
  for (let n = 1; ; n++) if (!used.has(`V-STAIR${n}`)) return `V-STAIR${n}`;
}
/** A fresh ladder id: LD-NEW1 ... */
export function ladderId(d: Campus): string {
  const used = new Set(d.ladders.map((q) => q.id));
  for (let n = 1; ; n++) if (!used.has(`LD-NEW${n}`)) return `LD-NEW${n}`;
}
