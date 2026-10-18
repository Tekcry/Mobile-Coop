/**
 * Rooms and their walls (ED3-3a), pure: which walls lie on a room edge, the walls a new room needs, linked edits (a
 * stretched or moved room takes its walls, neighbours and doors along) and Split. Every function works on a copy of the
 * campus and returns element changes (before and after), so one commit holds the whole edit and undo restores it.
 * A room edge is a wall centre line: all 123 walls of the campus file lie on room edges that way (planner, 2026-10-12).
 * Babylon-free (tests/editor/roomWalls.test.ts).
 */
import facts from '../../scripts/kestrel/facts.json';
import { EPS, roomsEitherSide, wallLen } from './geometry';
import type { Edge } from './geometry';
import type { Change } from './model';
import type { Campus, Coll, Elem, Opening, Rect, Room, Wall } from './types';

/** Wall thicknesses (scripts/kestrel/facts.json rules: RULES section 6). */
export const WALL_T = { interior: facts.rules.wallInterior.value, exterior: facts.rules.wallExterior.value };

/** What the room tool makes around a room (decision 3). */
export type RoomWallOption = 'walls' | 'outside' | 'none';
export const ROOM_OPTIONS: readonly { id: RoomWallOption; name: string; short: string }[] = [
  { id: 'walls', name: 'Room with walls', short: 'With walls' },
  { id: 'outside', name: 'Room with outside walls', short: 'Outside walls' },
  { id: 'none', name: 'Room only', short: 'No walls' },
];

/** A split must leave at least this much each side (decision 14). */
export const SPLIT_MIN = 1.0;
/** Wall spans shorter than this are not made (the grid, decision 4). */
export const SPAN_MIN = 0.5;
/** A wall lies on an edge when it overlaps it by more than this (decision 2). */
const OVERLAP = 0.01;

/** An axis-aligned line: `axis` 'x' means the line x = v running in z from lo to hi; 'z' means z = v running in x. */
export interface Line {
  axis: 'x' | 'z';
  v: number;
  lo: number;
  hi: number;
}

export function edgeLine(r: Rect, edge: Edge): Line {
  if (edge === 'W') return { axis: 'x', v: r[0], lo: r[1], hi: r[3] };
  if (edge === 'E') return { axis: 'x', v: r[2], lo: r[1], hi: r[3] };
  if (edge === 'S') return { axis: 'z', v: r[1], lo: r[0], hi: r[2] };
  return { axis: 'z', v: r[3], lo: r[0], hi: r[2] };
}

export const EDGES: readonly Edge[] = ['W', 'S', 'E', 'N'];

/** A wall as a line, or null if it is not axis-aligned (none are in the campus file; such walls are skipped). */
export function wallLine(w: Wall): Line | null {
  if (Math.abs(w.a[0] - w.b[0]) < EPS) return { axis: 'x', v: w.a[0], lo: Math.min(w.a[1], w.b[1]), hi: Math.max(w.a[1], w.b[1]) };
  if (Math.abs(w.a[1] - w.b[1]) < EPS) return { axis: 'z', v: w.a[1], lo: Math.min(w.a[0], w.b[0]), hi: Math.max(w.a[0], w.b[0]) };
  return null;
}

const overlap = (a: Line, b: Line): number => Math.min(a.hi, b.hi) - Math.max(a.lo, b.lo);

/** Decision 2: same level, parallel, centre line within half the wall's thickness of the edge, overlapping it. */
export function onLine(w: Wall, level: string, l: Line): boolean {
  const wl = w.level === level ? wallLine(w) : null;
  return !!wl && wl.axis === l.axis && Math.abs(wl.v - l.v) <= w.t / 2 + EPS && overlap(wl, l) > OVERLAP;
}

/** The parts of a line no wall covers, each at least SPAN_MIN long. */
export function missingSpans(walls: readonly Wall[], level: string, l: Line): [number, number][] {
  const cover = walls
    .filter((w) => onLine(w, level, l))
    .map((w) => wallLine(w)!)
    .map((wl): [number, number] => [Math.max(l.lo, wl.lo), Math.min(l.hi, wl.hi)])
    .sort((p, q) => p[0] - q[0]);
  const out: [number, number][] = [];
  let cur = l.lo;
  for (const [a, b] of cover) {
    if (a - cur >= SPAN_MIN - EPS) out.push([cur, a]);
    cur = Math.max(cur, b);
  }
  if (l.hi - cur >= SPAN_MIN - EPS) out.push([cur, l.hi]);
  return out;
}

const pt = (l: Line, s: number): [number, number] => (l.axis === 'x' ? [r3(l.v), r3(s)] : [r3(s), r3(l.v)]);
const r3 = (v: number): number => +v.toFixed(3);
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** Fresh ids: prefix + 1, 2, 3 ... not used in the list or by an earlier call. */
export function idMaker(used: Iterable<string>): (prefix: string) => string {
  const taken = new Set(used);
  return (prefix) => {
    for (let n = 1; ; n++) {
      const id = `${prefix}${n}`;
      if (!taken.has(id)) {
        taken.add(id);
        return id;
      }
    }
  };
}

const levelHeight = (d: Campus, level: string): number => d.levels.find((l) => l.id === level)?.height ?? 3;

/** A new wall along a span of a line, of the option's kind and thickness (decision 4). */
function makeWall(d: Campus, level: string, l: Line, a: number, b: number, option: RoomWallOption, id: string): Wall {
  const outside = option === 'outside';
  return { id, level, a: pt(l, a), b: pt(l, b), t: outside ? WALL_T.exterior : WALL_T.interior, h: levelHeight(d, level), kind: outside ? 'exterior' : 'interior' };
}

/** The walls a room needs: one per uncovered span of each edge (decisions 4, 5). Existing walls are reused, never changed. */
export function wallsForRoom(d: Campus, room: Room, option: RoomWallOption, ids = idMaker(d.walls.map((w) => w.id))): { walls: Wall[]; reusedEdges: number } {
  if (option === 'none') return { walls: [], reusedEdges: 0 };
  const walls: Wall[] = [];
  let reusedEdges = 0;
  for (const e of EDGES) {
    const l = edgeLine(room.rect, e);
    const gaps = missingSpans(d.walls, room.level, l);
    const full = gaps.length === 1 && Math.abs(gaps[0]![0] - l.lo) < EPS && Math.abs(gaps[0]![1] - l.hi) < EPS;
    if (!full) reusedEdges++;
    for (const [a, b] of gaps) walls.push(makeWall(d, room.level, l, a, b, option, ids(`W${room.level}-NEW`)));
  }
  return { walls, reusedEdges };
}

// ---------------------------------------------------------------- linked edits

/** What a linked edit did, for its words and the hint (decisions 9, 10, 13). */
export interface LinkedResult {
  changes: Change[];
  moved: number;
  stretched: number;
  cut: number;
  /** Names of neighbour rooms resized with a shared wall. */
  neighbours: string[];
  /** Shared walls left in place by a room move. */
  sharedStay: number;
  /** Why the edit cannot be done, in words; changes is then empty. */
  refused?: string;
}

interface Work {
  rooms: Room[];
  walls: Wall[];
  openings: Opening[];
}

const ALONG = (l: Line): 0 | 1 => (l.axis === 'x' ? 1 : 0);
const ACROSS = (l: Line): 0 | 1 => (l.axis === 'x' ? 0 : 1);

/** Changes between the original and the worked copy, the given element first (one commit). */
function diff(d: Campus, w: Work, first?: { coll: Coll; id: string }): Change[] {
  const out: Change[] = [];
  for (const coll of ['rooms', 'walls', 'openings'] as const) {
    const before = new Map((d[coll] as Elem[]).map((e) => [e.id, e]));
    const after = new Map((w[coll] as Elem[]).map((e) => [e.id, e]));
    for (const [id, a] of after) {
      const b = before.get(id) ?? null;
      if (!b || JSON.stringify(b) !== JSON.stringify(a)) out.push({ coll, id, before: b ? clone(b) : null, after: clone(a) });
    }
    for (const [id, b] of before) if (!after.has(id)) out.push({ coll, id, before: clone(b), after: null, index: (d[coll] as Elem[]).indexOf(b) });
  }
  if (first) {
    const i = out.findIndex((c) => c.coll === first.coll && c.id === first.id);
    if (i > 0) out.unshift(...out.splice(i, 1));
  }
  return out;
}

/** Decision 12: `between` for every opening on the given walls, from the worked rooms. */
function refreshBetween(w: Work, wallIds: ReadonlySet<string>): void {
  const byId = new Map(w.walls.map((x) => [x.id, x]));
  for (const o of w.openings) {
    const wall = byId.get(o.wall);
    if (wall && wallIds.has(wall.id)) o.between = roomsEitherSide(wall, o.at, w.rooms);
  }
}

/** Walls lying on any edge of the rects, on the level (for the `between` refresh). */
function wallsOnRects(w: Work, level: string, rects: readonly Rect[]): Set<string> {
  const out = new Set<string>();
  for (const r of rects) for (const e of EDGES) for (const x of w.walls) if (onLine(x, level, edgeLine(r, e))) out.add(x.id);
  return out;
}

/** Positions of an opening's sides along its wall. */
const sides = (o: Opening): [number, number] => [o.at - o.w / 2, o.at + o.w / 2];

/**
 * Cuts a wall at the given positions along its line (decision 8): up to three walls; the piece holding [lo, hi] keeps
 * the id. Openings go to the piece holding their centre. Returns null when an opening spans a cut point.
 */
function cutWall(w: Work, wall: Wall, lo: number, hi: number, ids: (p: string) => string): { middle: Wall; pieces: number } | null {
  const l = wallLine(wall)!;
  const k = ALONG(l);
  const cuts = [lo, hi].filter((c) => c > l.lo + EPS && c < l.hi - EPS);
  if (!cuts.length) return { middle: wall, pieces: 1 };
  const forward = wall.b[k] >= wall.a[k];
  // the opening's position along the line, from the wall's a end
  const lineAt = (o: Opening): number => (forward ? wall.a[k] + o.at : wall.a[k] - o.at);
  const ops = w.openings.filter((o) => o.wall === wall.id);
  for (const o of ops) {
    const [s0, s1] = sides(o).map((s) => (forward ? wall.a[k] + s : wall.a[k] - s)).sort((p, q) => p - q) as [number, number];
    if (cuts.some((c) => c > s0 + EPS && c < s1 - EPS)) return null;
  }
  const bounds = [l.lo, ...cuts, l.hi];
  // each opening's centre on the line, before the wall's ends change; each goes to one piece
  const centre = new Map(ops.map((o) => [o, lineAt(o)]));
  let middle: Wall = wall;
  for (let i = 0; i < bounds.length - 1; i++) {
    const p0 = bounds[i]!;
    const p1 = bounds[i + 1]!;
    const isMiddle = p0 >= lo - EPS && p1 <= hi + EPS;
    // keep the wall's own direction a -> b
    const [sa, sb] = forward ? [p0, p1] : [p1, p0];
    const piece: Wall = isMiddle ? wall : { ...clone(wall), id: ids(`${wall.id}-`) };
    piece.a = pt(l, sa);
    piece.b = pt(l, sb);
    if (isMiddle) middle = piece;
    else w.walls.push(piece);
    for (const [o, c] of centre) {
      if (c < p0 - EPS || c > p1 + EPS) continue;
      o.wall = piece.id;
      o.at = r3(Math.abs(c - sa));
      centre.delete(o);
    }
  }
  return { middle, pieces: bounds.length - 1 };
}

/** Moves one end of a wall (`end` a or b) to `to`; doors keep their distance from the nearer end (decision 7). */
function stretchEnd(w: Work, wall: Wall, end: 'a' | 'b', to: [number, number]): string | null {
  const L0 = wallLen(wall);
  const moved: Wall = { ...wall, [end]: to };
  const L1 = wallLen(moved);
  if (L1 < SPAN_MIN - EPS) return 'A wall would get too short';
  for (const o of w.openings.filter((x) => x.wall === wall.id)) {
    const dA = o.at;
    const dB = L0 - o.at;
    // the distance from the nearer end is kept (`at` is measured from a)
    const at = dA <= dB ? dA : L1 - dB;
    if (o.w > L1 + EPS) return 'A door would no longer fit in its wall';
    o.at = r3(Math.min(L1 - o.w / 2, Math.max(o.w / 2, at)));
  }
  wall[end] = to;
  return null;
}

/**
 * A room's rect changes from `rect` (its current one) to `next` with walls following (decisions 7-13). A same-size
 * change is a move; otherwise each changed edge is stretched. `follow` false: only the room and `between` change.
 */
export function linkedEdit(d: Campus, roomId: string, next: Rect, follow = true): LinkedResult {
  const w: Work = { rooms: clone(d.rooms), walls: clone(d.walls), openings: clone(d.openings) };
  const room = w.rooms.find((r) => r.id === roomId);
  const res: LinkedResult = { changes: [], moved: 0, stretched: 0, cut: 0, neighbours: [], sharedStay: 0 };
  if (!room) return res;
  const old = room.rect.slice() as Rect;
  const ids = idMaker(w.walls.map((x) => x.id));
  const touched = new Set<string>();
  const rects: Rect[] = [old, next];
  const sameSize = Math.abs(old[2] - old[0] - (next[2] - next[0])) < EPS && Math.abs(old[3] - old[1] - (next[3] - next[1])) < EPS;
  if (follow && sameSize) {
    const dx = next[0] - old[0];
    const dz = next[1] - old[1];
    for (const e of EDGES) {
      const l = edgeLine(old, e);
      for (const wall of w.walls) {
        if (!onLine(wall, room.level, l) || touched.has(wall.id)) continue;
        const wl = wallLine(wall)!;
        const shared = w.rooms.some((r) => r.id !== room.id && r.level === room.level && EDGES.some((f) => {
          const rl = edgeLine(r.rect, f);
          return rl.axis === wl.axis && Math.abs(rl.v - wl.v) <= wall.t / 2 + EPS && overlap(rl, wl) > OVERLAP;
        }));
        touched.add(wall.id);
        if (shared) {
          res.sharedStay++;
          continue;
        }
        wall.a = [r3(wall.a[0] + dx), r3(wall.a[1] + dz)];
        wall.b = [r3(wall.b[0] + dx), r3(wall.b[1] + dz)];
        res.moved++;
      }
    }
  } else if (follow) {
    for (let i = 0; i < 4; i++) {
      if (Math.abs(old[i]! - next[i]!) < EPS) continue;
      const e = (['W', 'S', 'E', 'N'] as const)[i]!;
      const l = edgeLine(old, e);
      const v1 = next[i]!;
      const dv = v1 - l.v;
      const k = ACROSS(l);
      // walls on the edge: cut at the edge's ends, then the piece on the edge moves
      for (const wall of w.walls.slice()) {
        if (!onLine(wall, room.level, l) || touched.has(wall.id)) continue;
        const c = cutWall(w, wall, l.lo, l.hi, ids);
        if (!c) return { ...res, refused: 'A door is in the way at the corner' };
        if (c.pieces > 1) res.cut++;
        const m = c.middle;
        const ml = wallLine(m)!;
        touched.add(m.id);
        // neighbours wholly on the moved piece follow it (decision 9)
        for (const r of w.rooms) {
          if (r.id === room.id || r.level !== room.level) continue;
          for (let j = 0; j < 4; j++) {
            const f = (['W', 'S', 'E', 'N'] as const)[j]!;
            const rl = edgeLine(r.rect, f);
            if (rl.axis !== ml.axis || Math.abs(rl.v - ml.v) > m.t / 2 + EPS || rl.lo < ml.lo - EPS || rl.hi > ml.hi + EPS) continue;
            const nr = r.rect.slice() as Rect;
            nr[j] = r3(nr[j]! + dv);
            if (nr[2] - nr[0] < SPAN_MIN - EPS || nr[3] - nr[1] < SPAN_MIN - EPS) return { ...res, refused: `${r.name || r.id} would get too small` };
            rects.push(r.rect.slice() as Rect, nr);
            r.rect = nr;
            if (!res.neighbours.includes(r.name || r.id)) res.neighbours.push(r.name || r.id);
          }
        }
        m.a = (k === 0 ? [r3(m.a[0] + dv), m.a[1]] : [m.a[0], r3(m.a[1] + dv)]) as [number, number];
        m.b = (k === 0 ? [r3(m.b[0] + dv), m.b[1]] : [m.b[0], r3(m.b[1] + dv)]) as [number, number];
        res.moved++;
      }
      // perpendicular walls ending on the old edge, within its span, stretch to the new line
      for (const wall of w.walls) {
        if (wall.level !== room.level || touched.has(wall.id)) continue;
        const wl = wallLine(wall);
        if (!wl || wl.axis === l.axis) continue;
        const along = wl.v;
        if (along < l.lo - EPS || along > l.hi + EPS) continue;
        const end = Math.abs(wall.a[k] - l.v) < EPS ? 'a' : Math.abs(wall.b[k] - l.v) < EPS ? 'b' : null;
        if (!end) continue;
        const to = (k === 0 ? [r3(v1), wall[end][1]] : [wall[end][0], r3(v1)]) as [number, number];
        const why = stretchEnd(w, wall, end, to);
        if (why) return { ...res, refused: why };
        touched.add(wall.id);
        res.stretched++;
      }
    }
  }
  room.rect = next;
  const between = wallsOnRects(w, room.level, rects);
  for (const id of touched) between.add(id);
  // pieces cut off a long wall carry its doors too
  for (const x of w.walls) if (!d.walls.some((y) => y.id === x.id)) between.add(x.id);
  refreshBetween(w, between);
  res.changes = diff(d, w, { coll: 'rooms', id: roomId });
  return res;
}

/** The linked edit's words (decision 13), after the room's own words. */
export function linkedWords(r: LinkedResult): string {
  const p: string[] = [];
  if (r.moved) p.push(`moved ${r.moved} wall${r.moved > 1 ? 's' : ''}`);
  if (r.stretched) p.push(`stretched ${r.stretched}`);
  if (r.cut) p.push(`cut ${r.cut} long wall${r.cut > 1 ? 's' : ''}`);
  if (r.neighbours.length) p.push(`also resized ${r.neighbours.join(', ')}`);
  if (r.sharedStay) p.push(`${r.sharedStay} shared wall${r.sharedStay > 1 ? 's' : ''} stayed`);
  return p.join(', ');
}

// ---------------------------------------------------------------- split

/** Decision 14-15: splits a room along x = v (axis 'x') or z = v (axis 'z'). */
export function splitRoom(d: Campus, roomId: string, axis: 'x' | 'z', v: number, option: RoomWallOption): { changes: Change[]; newRoom?: Room; wallLen: number; refused?: string } {
  const w: Work = { rooms: clone(d.rooms), walls: clone(d.walls), openings: clone(d.openings) };
  const room = w.rooms.find((r) => r.id === roomId);
  if (!room) return { changes: [], wallLen: 0, refused: 'No room' };
  const [x0, z0, x1, z1] = room.rect;
  const [lo, hi] = axis === 'x' ? [x0, x1] : [z0, z1];
  if (v - lo < SPLIT_MIN - EPS || hi - v < SPLIT_MIN - EPS) return { changes: [], wallLen: 0, refused: 'Too close to the edge' };
  const old = room.rect.slice() as Rect;
  const a: Rect = axis === 'x' ? [x0, z0, v, z1] : [x0, z0, x1, v];
  const b: Rect = axis === 'x' ? [v, z0, x1, z1] : [x0, v, x1, z1];
  room.rect = a;
  const ids = idMaker(d.rooms.map((r) => r.id));
  const nr: Room = { ...clone(room), id: ids(`${room.level}-NEW`), rect: b, name: `${room.name || 'Room'} 2` };
  w.rooms.push(nr);
  const line: Line = axis === 'x' ? { axis: 'x', v, lo: z0, hi: z1 } : { axis: 'z', v, lo: x0, hi: x1 };
  let len = 0;
  if (option !== 'none') {
    const wids = idMaker(d.walls.map((x) => x.id));
    for (const [s0, s1] of missingSpans(w.walls, room.level, line)) {
      w.walls.push(makeWall(d, room.level, line, s0, s1, option, wids(`W${room.level}-NEW`)));
      len += s1 - s0;
    }
  }
  refreshBetween(w, wallsOnRects(w, room.level, [old, a, b]));
  return { changes: diff(d, w, { coll: 'rooms', id: roomId }), newRoom: nr, wallLen: len };
}

/**
 * Smarter A's words for a room with walls following (decision 16): " (also resizes Store)" for an edge, " (2 shared
 * walls stay)" for a move; '' when nothing else is affected. Tested by a one-grid-step trial edit.
 */
export function linkedHint(d: Campus, roomId: string, handle: string | null, step: number): string {
  const r = d.rooms.find((x) => x.id === roomId);
  if (!r) return '';
  const next = r.rect.slice() as Rect;
  if (!handle) {
    next[0] += step;
    next[2] += step;
  } else {
    const i = 'WSEN'.indexOf(handle);
    if (i < 0) return '';
    next[i] = next[i]! + (i < 2 ? -step : step);
  }
  const res = linkedEdit(d, roomId, next, true);
  if (res.refused) return '';
  if (!handle) return res.sharedStay ? ` (${res.sharedStay} shared wall${res.sharedStay > 1 ? 's stay' : ' stays'})` : '';
  return res.neighbours.length ? ` (also resizes ${res.neighbours.join(', ')})` : '';
}
