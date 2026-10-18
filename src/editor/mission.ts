/**
 * ON8: guard patrol paths and mission markers, pure (Babylon- and DOM-free; tests/editor/mission.test.ts).
 *
 * The records are the play file's (schema.md section 3: `guards`, `spawns`, `objectives`, `extraction`, `hides`,
 * `checkpoints`). While editing they ride in the campus data like the lamps (src/editor/playFile.ts); `spawns` and
 * `extraction` are not lists of records in the file, so the editor holds them as records (`{ id: 'SP1', at }`,
 * `[{ id: 'EX1', level, rect }]`) and playFile.ts turns them back on save.
 *
 * Walkability: each leg of a patrol is searched on a grid at the AI nav grid's cell and agent radius (facts `guard`,
 * cited from src/ai/navBuild.ts), with the editor's own plain rules: the floor is the level's rooms less its floor holes,
 * walls block except at door openings, objects block between the step height and the headroom. The game's AI code is
 * not used or changed. A leg to another level goes by the nearest stair or ladder joining the two.
 */
import facts from '../../scripts/kestrel/facts.json';
import { hyp2 } from '../core/mathx';
import type { Campus, Ladder, Obj, Opening, Rect, Stair, Void, Wall } from './types';
import { guardKind, objectiveKind } from './missionCatalogue';

const CELL = facts.guard.navCell.value;
const RADIUS = facts.guard.agentRadius.value;
const STEP = facts.guard.stepHeight.value;
const HEADROOM = facts.nav.headroom.value;
const REACH = facts.guard.connectorReach.value;
const RISER = facts.stair.riserHeight.value;
const GOING = facts.stair.going.value;

/** A play point: x, z and the level id (schema.md section 1). */
export type PlayPt = [number, number, string];

export interface Stop {
  at: PlayPt;
  wait: number;
  face: number;
}

export interface Guard {
  id: string;
  kind: string;
  employer: string;
  job: string;
  space: string;
  loop: Stop[];
  cycle: number;
  isolation?: { at: PlayPt; t: number };
  /** ON8: true once the last stop is joined back to the first (an open path is unfinished). */
  closed?: boolean;
  name?: string;
  [k: string]: unknown;
}

export interface Objective {
  id: string;
  kind: string;
  room: string;
  at: PlayPt;
  optional: boolean;
  order: number;
  requires: string[];
  unlocks: string[];
  name?: string;
  [k: string]: unknown;
}

export interface Hide {
  id: string;
  space: string;
  at: PlayPt;
  kind: string;
  name?: string;
  [k: string]: unknown;
}

export interface Checkpoint {
  id: string;
  at: PlayPt;
  name?: string;
  [k: string]: unknown;
}

/** A player start as the editor holds it (the file has the bare point). */
export interface Spawn {
  id: string;
  at: PlayPt;
  [k: string]: unknown;
}

/** The extraction zone as the editor holds it (the file has one object). */
export interface Extraction {
  id: string;
  level: string;
  rect: Rect;
  [k: string]: unknown;
}

export type MissionData = Campus & {
  guards?: Guard[];
  objectives?: Objective[];
  hides?: Hide[];
  checkpoints?: Checkpoint[];
  spawns?: Spawn[];
  extraction?: Extraction[];
};

export const MISSION_COLLS = ['guards', 'objectives', 'hides', 'checkpoints', 'spawns', 'extraction'] as const;
export type MissionColl = (typeof MISSION_COLLS)[number];
export const isMission = (coll: string): coll is MissionColl => (MISSION_COLLS as readonly string[]).includes(coll);

const r2 = (v: number): number => Math.round(v * 100) / 100;
const r1 = (v: number): number => Math.round(v * 10) / 10;

/** The next readable id: the prefix and one more than the highest number in use (GD1, OBJ1, H1, CP1, SP1, EX1). */
export function nextId(list: readonly { id: string }[] | undefined, prefix: string): string {
  let n = 0;
  for (const e of list ?? []) {
    if (!e.id.startsWith(prefix)) continue;
    const k = Number(e.id.slice(prefix.length));
    if (Number.isInteger(k) && k > n) n = k;
  }
  return `${prefix}${n + 1}`;
}

/** The level a mission record is on (a guard: its first stop). */
export function missionLevel(coll: MissionColl, e: unknown): string {
  if (coll === 'guards') return (e as Guard).loop[0]?.at[2] ?? '';
  if (coll === 'extraction') return (e as Extraction).level;
  return (e as { at: PlayPt }).at[2];
}

/** A mission record's plan centre (a guard: its first stop; the extraction: its middle). */
export function missionCentre(coll: MissionColl, e: unknown): [number, number] {
  if (coll === 'guards') {
    const s = (e as Guard).loop[0];
    return s ? [s.at[0], s.at[1]] : [0, 0];
  }
  if (coll === 'extraction') {
    const r = (e as Extraction).rect;
    return [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2];
  }
  const a = (e as { at: PlayPt }).at;
  return [a[0], a[1]];
}

/** A mission record moved by (dx, dz) on the plan (a guard: every stop and its isolation point). */
export function moveMission<T>(coll: MissionColl, e: T, dx: number, dz: number): T {
  const c = JSON.parse(JSON.stringify(e)) as Record<string, unknown>;
  const mv = (p: PlayPt): PlayPt => [r2(p[0] + dx), r2(p[1] + dz), p[2]];
  if (coll === 'guards') {
    const g = c as unknown as Guard;
    g.loop = g.loop.map((s) => ({ ...s, at: mv(s.at) }));
    if (g.isolation) g.isolation = { ...g.isolation, at: mv(g.isolation.at) };
  } else if (coll === 'extraction') {
    const r = (c as unknown as Extraction).rect;
    (c as unknown as Extraction).rect = [r2(r[0] + dx), r2(r[1] + dz), r2(r[2] + dx), r2(r[3] + dz)];
  } else c.at = mv(c.at as PlayPt);
  return c as T;
}

/** The room on a level a point is in (the smallest that holds it), or ''. */
export function roomAt(d: Campus, level: string, x: number, z: number): string {
  let best = '';
  let area = Infinity;
  for (const r of d.rooms) {
    if (r.level !== level) continue;
    const [x0, z0, x1, z1] = r.rect;
    if (x < x0 || x > x1 || z < z0 || z > z1) continue;
    const a = (x1 - x0) * (z1 - z0);
    if (a < area) {
      area = a;
      best = r.id;
    }
  }
  return best;
}

// ---------- the walk grid ----------

export interface WalkGrid {
  level: string;
  ox: number;
  oz: number;
  nx: number;
  nz: number;
  cell: number;
  /** 1 where a guard can stand. */
  ok: Uint8Array;
}

/** A door-like opening a guard walks through: on the floor (within the step) and tall enough to stand in. */
const walkThrough = (o: Opening): boolean => o.sill <= STEP && o.h >= HEADROOM && o.w >= 2 * RADIUS;

/**
 * The walkable cells of a level at the AI's nav cell: inside a room on the level, not in a floor hole, clear of the
 * walls by the agent radius (door openings excepted) and of objects that stand between the step height and the headroom.
 */
export function walkGrid(d: Campus, level: string): WalkGrid | null {
  const rooms = d.rooms.filter((r) => r.level === level);
  if (!rooms.length) return null;
  let x0 = Infinity;
  let z0 = Infinity;
  let x1 = -Infinity;
  let z1 = -Infinity;
  for (const r of rooms) {
    x0 = Math.min(x0, r.rect[0]);
    z0 = Math.min(z0, r.rect[1]);
    x1 = Math.max(x1, r.rect[2]);
    z1 = Math.max(z1, r.rect[3]);
  }
  const ox = Math.floor(x0 / CELL) * CELL - CELL;
  const oz = Math.floor(z0 / CELL) * CELL - CELL;
  const nx = Math.ceil((x1 - ox) / CELL) + 2;
  const nz = Math.ceil((z1 - oz) / CELL) + 2;
  const ok = new Uint8Array(nx * nz);
  const g: WalkGrid = { level, ox, oz, nx, nz, cell: CELL, ok };
  const span = (a: number, b: number, o: number, n: number): [number, number] => [Math.max(0, Math.floor((a - o) / CELL)), Math.min(n - 1, Math.floor((b - o) / CELL))];
  const fill = (r: Rect, v: number, grow: number): void => {
    const [i0, i1] = span(r[0] - grow, r[2] + grow, ox, nx);
    const [k0, k1] = span(r[1] - grow, r[3] + grow, oz, nz);
    for (let k = k0; k <= k1; k++)
      for (let i = i0; i <= i1; i++) {
        const cx = ox + (i + 0.5) * CELL;
        const cz = oz + (k + 0.5) * CELL;
        if (cx >= r[0] - grow && cx <= r[2] + grow && cz >= r[1] - grow && cz <= r[3] + grow) ok[k * nx + i] = v;
      }
  };
  for (const r of rooms) fill(r.rect, 1, 0);
  for (const v of d.voids as Void[]) if (v.level === level) fill(v.rect, 0, 0);
  for (const o of (d.objects ?? []) as Obj[]) if (o.level === level && o.y < HEADROOM && o.y + o.h > STEP) fill(o.rect, 0, RADIUS);
  const doors = new Map<string, Opening[]>();
  for (const o of d.openings) if (walkThrough(o)) doors.set(o.wall, [...(doors.get(o.wall) ?? []), o]);
  for (const w of d.walls as Wall[]) {
    if (w.level !== level) continue;
    const dx = w.b[0] - w.a[0];
    const dz = w.b[1] - w.a[1];
    const len = hyp2(dx, dz);
    if (len < 1e-6) continue;
    const ux = dx / len;
    const uz = dz / len;
    const reach = w.t / 2 + RADIUS;
    const ds = doors.get(w.id) ?? [];
    const [i0, i1] = span(Math.min(w.a[0], w.b[0]) - reach, Math.max(w.a[0], w.b[0]) + reach, ox, nx);
    const [k0, k1] = span(Math.min(w.a[1], w.b[1]) - reach, Math.max(w.a[1], w.b[1]) + reach, oz, nz);
    for (let k = k0; k <= k1; k++)
      for (let i = i0; i <= i1; i++) {
        const px = ox + (i + 0.5) * CELL - w.a[0];
        const pz = oz + (k + 0.5) * CELL - w.a[1];
        const s = px * ux + pz * uz;
        const sc = Math.max(0, Math.min(len, s));
        const dist = hyp2(px - ux * sc, pz - uz * sc);
        if (dist >= reach) continue;
        // (a door opening: the cells across it stay open; the editor's lenient rule, the AI keeps its own)
        if (ds.some((o) => s >= o.at - o.w / 2 && s <= o.at + o.w / 2)) continue;
        ok[k * nx + i] = 0;
      }
  }
  return g;
}

const cellOf = (g: WalkGrid, x: number, z: number): number => {
  const i = Math.floor((x - g.ox) / g.cell);
  const k = Math.floor((z - g.oz) / g.cell);
  return i < 0 || k < 0 || i >= g.nx || k >= g.nz ? -1 : k * g.nx + i;
};
const centre = (g: WalkGrid, c: number): [number, number] => [g.ox + ((c % g.nx) + 0.5) * g.cell, g.oz + (Math.floor(c / g.nx) + 0.5) * g.cell];

/** True when a guard can stand at (x, z). */
export function walkable(g: WalkGrid, x: number, z: number): boolean {
  const c = cellOf(g, x, z);
  return c >= 0 && g.ok[c] === 1;
}

/** The walkable cell nearest (x, z) within `reach` metres, or -1. */
export function nearestCell(g: WalkGrid, x: number, z: number, reach: number): number {
  const c0 = cellOf(g, x, z);
  if (c0 >= 0 && g.ok[c0] === 1) return c0;
  const n = Math.ceil(reach / g.cell);
  const i0 = Math.floor((x - g.ox) / g.cell);
  const k0 = Math.floor((z - g.oz) / g.cell);
  let best = -1;
  let bd = Infinity;
  for (let k = k0 - n; k <= k0 + n; k++)
    for (let i = i0 - n; i <= i0 + n; i++) {
      if (i < 0 || k < 0 || i >= g.nx || k >= g.nz || g.ok[k * g.nx + i] !== 1) continue;
      const [cx, cz] = centre(g, k * g.nx + i);
      const dd = hyp2(cx - x, cz - z);
      if (dd <= reach && dd < bd) {
        bd = dd;
        best = k * g.nx + i;
      }
    }
  return best;
}

/** A straight line between two points stays on walkable cells (sampled at a quarter cell). */
function clearLine(g: WalkGrid, ax: number, az: number, bx: number, bz: number): boolean {
  const L = hyp2(bx - ax, bz - az);
  const n = Math.max(1, Math.ceil(L / (g.cell / 4)));
  for (let j = 0; j <= n; j++) {
    const t = j / n;
    if (!walkable(g, ax + (bx - ax) * t, az + (bz - az) * t)) return false;
  }
  return true;
}

/**
 * A* on the walk grid (8 directions, no corner cutting) from (ax, az) to (bx, bz), each snapped to its nearest walkable
 * cell within one cell; the path is pulled tight where the line between its points stays on the floor. null: no way.
 */
export function gridPath(g: WalkGrid, ax: number, az: number, bx: number, bz: number): [number, number][] | null {
  const s = nearestCell(g, ax, az, g.cell);
  const t = nearestCell(g, bx, bz, g.cell);
  if (s < 0 || t < 0) return null;
  const N = g.nx * g.nz;
  const cost = new Float64Array(N).fill(Infinity);
  const from = new Int32Array(N).fill(-1);
  const shut = new Uint8Array(N);
  const heap: number[] = [];
  const pri = new Float64Array(N);
  const push = (c: number): void => {
    heap.push(c);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (pri[heap[p]!]! <= pri[c]!) break;
      heap[i] = heap[p]!;
      i = p;
    }
    heap[i] = c;
  };
  const pop = (): number => {
    const top = heap[0]!;
    const last = heap.pop()!;
    if (heap.length) {
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        const pm = (): number => pri[m === i ? last : heap[m]!]!;
        if (l < heap.length && pri[heap[l]!]! < pm()) m = l;
        if (r < heap.length && pri[heap[r]!]! < pm()) m = r;
        if (m === i) break;
        heap[i] = heap[m]!;
        i = m;
      }
      heap[i] = last;
    }
    return top;
  };
  const tx = t % g.nx;
  const tz = Math.floor(t / g.nx);
  const h = (c: number): number => {
    const dx = Math.abs((c % g.nx) - tx);
    const dz = Math.abs(Math.floor(c / g.nx) - tz);
    return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz);
  };
  cost[s] = 0;
  pri[s] = h(s);
  push(s);
  while (heap.length) {
    const c = pop();
    if (shut[c]) continue;
    shut[c] = 1;
    if (c === t) break;
    const ci = c % g.nx;
    const ck = Math.floor(c / g.nx);
    for (let dk = -1; dk <= 1; dk++)
      for (let di = -1; di <= 1; di++) {
        if (!di && !dk) continue;
        const i = ci + di;
        const k = ck + dk;
        if (i < 0 || k < 0 || i >= g.nx || k >= g.nz) continue;
        const n = k * g.nx + i;
        if (g.ok[n] !== 1 || shut[n]) continue;
        if (di && dk && (g.ok[ck * g.nx + i] !== 1 || g.ok[k * g.nx + ci] !== 1)) continue;
        const nc = cost[c]! + (di && dk ? Math.SQRT2 : 1);
        if (nc >= cost[n]!) continue;
        cost[n] = nc;
        from[n] = c;
        pri[n] = nc + h(n);
        push(n);
      }
  }
  if (!shut[t]) return null;
  const cells: number[] = [];
  for (let c = t; c >= 0; c = from[c]!) cells.push(c);
  cells.reverse();
  const raw: [number, number][] = [[ax, az], ...cells.slice(1, -1).map((c) => centre(g, c)), [bx, bz]];
  // pull tight: from each kept point, the farthest point a straight line still reaches
  const out: [number, number][] = [raw[0]!];
  let i = 0;
  while (i < raw.length - 1) {
    let j = raw.length - 1;
    while (j > i + 1 && !clearLine(g, raw[i]![0], raw[i]![1], raw[j]![0], raw[j]![1])) j--;
    out.push(raw[j]!);
    i = j;
  }
  return out;
}

const polyLen = (pts: readonly [number, number][]): number => {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += hyp2(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]);
  return L;
};

/** Walk grids by level, rebuilt only when the level's walls, rooms, openings, objects, holes, stairs or ladders change. */
export class GridCache {
  private readonly map = new Map<string, { sig: string; g: WalkGrid | null }>();

  get(d: Campus, level: string): WalkGrid | null {
    const sig = gridSig(d, level);
    const c = this.map.get(level);
    if (c && c.sig === sig) return c.g;
    const g = walkGrid(d, level);
    this.map.set(level, { sig, g });
    return g;
  }
}

function gridSig(d: Campus, level: string): string {
  const on = <T extends { level?: unknown }>(a: readonly T[] | undefined): T[] => (a ?? []).filter((e) => e.level === level);
  const walls = on(d.walls);
  const ids = new Set(walls.map((w) => w.id));
  return JSON.stringify([on(d.rooms).map((r) => r.rect), walls.map((w) => [w.a, w.b, w.t]), d.openings.filter((o) => ids.has(o.wall)).map((o) => [o.wall, o.at, o.w, o.h, o.sill]), on(d.voids).map((v) => v.rect), on(d.objects).map((o) => [o.rect, o.y, o.h])]);
}

// ---------- legs, length, cycle ----------

export interface Leg {
  /** Stop indexes: from -> to (the last leg goes back to stop 0). */
  from: number;
  to: number;
  ok: boolean;
  /** Why it is red ("No way from stop 3 to stop 4"), or ''. */
  why: string;
  /** The way, as play points (a level change shows as a change of the third item). */
  pts: PlayPt[];
  len: number;
}

export interface Patrol {
  legs: Leg[];
  /** Metres of one loop (the way back to the first stop included). */
  length: number;
  waits: number;
  speed: number;
  /** Seconds of one loop. */
  cycle: number;
  bad: number;
}

type Grids = (level: string) => WalkGrid | null;

const levelName = (d: Campus, id: string): string => d.levels.find((l) => l.id === id)?.name ?? id;

/** Stairs and ladders joining two levels, each as the plan point a guard uses and the climb length. */
function connectors(d: Campus, a: string, b: string): { x: number; z: number; climb: number; id: string }[] {
  const fa = d.levels.find((l) => l.id === a)?.floor ?? 0;
  const fb = d.levels.find((l) => l.id === b)?.floor ?? 0;
  const rise = Math.abs(fb - fa);
  const joins = (p: { from: string; to: string }): boolean => (p.from === a && p.to === b) || (p.from === b && p.to === a);
  const out: { x: number; z: number; climb: number; id: string }[] = [];
  for (const s of d.stairs as Stair[]) if (joins(s)) out.push({ x: (s.rect[0] + s.rect[2]) / 2, z: (s.rect[1] + s.rect[3]) / 2, climb: (rise * hyp2(GOING, RISER)) / RISER, id: s.id });
  for (const l of d.ladders as Ladder[]) if (joins(l)) out.push({ x: l.at[0], z: l.at[1], climb: rise, id: l.id });
  return out;
}

/** One leg from stop i to stop j. */
export function legBetween(d: Campus, a: PlayPt, b: PlayPt, i: number, j: number, grids: Grids): Leg {
  const no = (why: string): Leg => ({ from: i, to: j, ok: false, why, pts: [a, b], len: hyp2(b[0] - a[0], b[1] - a[1]) });
  const words = `No way from stop ${i + 1} to stop ${j + 1}`;
  if (a[2] === b[2]) {
    const g = grids(a[2]);
    const p = g ? gridPath(g, a[0], a[1], b[0], b[1]) : null;
    if (!p) return no(words);
    return { from: i, to: j, ok: true, why: '', pts: p.map(([x, z]) => [r2(x), r2(z), a[2]] as PlayPt), len: polyLen(p) };
  }
  const cs = connectors(d, a[2], b[2]);
  if (!cs.length) return no(`No stair or ladder joins ${levelName(d, a[2])} and ${levelName(d, b[2])} (stop ${i + 1} to stop ${j + 1})`);
  const ga = grids(a[2]);
  const gb = grids(b[2]);
  let best: Leg | null = null;
  for (const c of cs) {
    if (!ga || !gb) break;
    const ca = nearestCell(ga, c.x, c.z, REACH);
    const cb = nearestCell(gb, c.x, c.z, REACH);
    if (ca < 0 || cb < 0) continue;
    const [ax, az] = centre(ga, ca);
    const [bx, bz] = centre(gb, cb);
    const p1 = gridPath(ga, a[0], a[1], ax, az);
    const p2 = p1 ? gridPath(gb, bx, bz, b[0], b[1]) : null;
    if (!p1 || !p2) continue;
    const len = polyLen(p1) + c.climb + polyLen(p2);
    if (best && best.len <= len) continue;
    best = { from: i, to: j, ok: true, why: '', pts: [...p1.map(([x, z]) => [r2(x), r2(z), a[2]] as PlayPt), ...p2.map(([x, z]) => [r2(x), r2(z), b[2]] as PlayPt)], len };
  }
  return best ?? no(words);
}

/** The guard kind's patrol walk speed (facts `guard.walk`, F20). */
export const walkSpeed = (kind: string): number => guardKind(kind).walk;

/** Every leg of a guard's loop, its length and its cycle time (length / walk speed + the waits). */
export function patrol(d: Campus, g: Guard, grids: Grids): Patrol {
  const n = g.loop.length;
  const legs: Leg[] = [];
  if (n >= 2) for (let i = 0; i < n; i++) legs.push(legBetween(d, g.loop[i]!.at, g.loop[(i + 1) % n]!.at, i, (i + 1) % n, grids));
  const length = legs.reduce((s, l) => s + l.len, 0);
  const waits = g.loop.reduce((s, x) => s + x.wait, 0);
  const speed = walkSpeed(g.kind);
  return { legs, length, waits, speed, cycle: r1(length / speed + waits), bad: legs.filter((l) => !l.ok).length };
}

/** The guard with its `cycle` worked out again. */
export function withCycle(d: Campus, g: Guard, grids: Grids): Guard {
  return { ...g, cycle: patrol(d, g, grids).cycle };
}

/** "Loop 84 m, 71 s" (and the first problem). */
export function patrolWords(p: Patrol, g: Guard): string {
  const base = g.loop.length < 2 ? `${g.loop.length} stop: A adds the next` : `Loop ${Math.round(p.length)} m, ${Math.round(p.cycle)} s${g.closed ? '' : ' (not closed)'}`;
  const bad = p.legs.find((l) => !l.ok);
  return bad ? `${base}; ${bad.why}` : base;
}

/** The change log's words for a guard: "guard GD3, Night guard, 6 stops, 71 s loop". */
export function guardSummary(g: Guard): string {
  const who = g.name || guardKind(g.kind).name;
  return `guard ${g.id}, ${who}, ${g.loop.length} stop${g.loop.length === 1 ? '' : 's'}, ${Math.round(g.cycle)} s loop`;
}

// ---------- path editing ----------

/** A stop added at the end (facing the way it was walked to, no wait). */
export function addStop(g: Guard, at: PlayPt): Guard {
  const prev = g.loop.at(-1);
  const face = prev ? Math.round(((Math.atan2(at[0] - prev.at[0], at[1] - prev.at[1]) * 180) / Math.PI + 360) % 360) : 0;
  return { ...g, loop: [...g.loop, { at: [r2(at[0]), r2(at[1]), at[2]], wait: 0, face }], closed: false };
}

/** X: the last stop goes (the first stays: a guard has at least one). */
export function removeLastStop(g: Guard): Guard {
  if (g.loop.length <= 1) return g;
  return { ...g, loop: g.loop.slice(0, -1), closed: false };
}

/** A on the first stop: the loop is closed (needs three stops). */
export function closeLoop(g: Guard): Guard {
  return g.loop.length >= 3 ? { ...g, closed: true } : g;
}

/** True when (x, z) on `level` is on the first stop (closes the loop). */
export function onFirstStop(g: Guard, x: number, z: number, level: string): boolean {
  const s = g.loop[0];
  return !!s && s.at[2] === level && hyp2(s.at[0] - x, s.at[1] - z) <= facts.guard.stopPick.value;
}

/** The last stop's wait stepped (D-pad up / down: 1 s steps, from 0). */
export function stepWait(g: Guard, dir: number, i = g.loop.length - 1): Guard {
  const s = g.loop[i];
  if (!s) return g;
  const wait = Math.max(0, s.wait + dir * facts.guard.waitStep.value);
  if (wait === s.wait) return g;
  return { ...g, loop: g.loop.map((q, k) => (k === i ? { ...q, wait } : q)) };
}

/** The last stop's facing set (degrees, 0 north, 90 east). */
export function setFace(g: Guard, deg: number, i = g.loop.length - 1): Guard {
  const s = g.loop[i];
  if (!s) return g;
  const face = Math.round(((deg % 360) + 360) % 360);
  return { ...g, loop: g.loop.map((q, k) => (k === i ? { ...q, face } : q)) };
}

// ---------- the patrol as time ----------

/** Where the guard is at time t (seconds, wrapped to the cycle): the point, level and yaw (radians, atan2(dx, dz)). */
export interface PatrolPose {
  x: number;
  z: number;
  level: string;
  yaw: number;
  /** The stop it is waiting at, or -1 while walking. */
  stop: number;
}

/** The pose at time t: it waits at stop 0 first, walks leg 0, waits at stop 1 and so on, back to stop 0. */
export function patrolAt(g: Guard, p: Patrol, t: number): PatrolPose {
  const s0 = g.loop[0];
  if (!s0) return { x: 0, z: 0, level: '', yaw: 0, stop: -1 };
  const rad = (deg: number): number => (deg * Math.PI) / 180;
  if (p.cycle <= 0 || !p.legs.length) return { x: s0.at[0], z: s0.at[1], level: s0.at[2], yaw: rad(s0.face), stop: 0 };
  let left = ((t % p.cycle) + p.cycle) % p.cycle;
  for (let i = 0; i < g.loop.length; i++) {
    const s = g.loop[i]!;
    if (left < s.wait) return { x: s.at[0], z: s.at[1], level: s.at[2], yaw: rad(s.face), stop: i };
    left -= s.wait;
    const leg = p.legs[i];
    if (!leg) continue;
    const walkT = leg.len / p.speed;
    if (left < walkT) {
      let dist = left * p.speed;
      for (let k = 1; k < leg.pts.length; k++) {
        const a = leg.pts[k - 1]!;
        const b = leg.pts[k]!;
        const L = a[2] === b[2] ? hyp2(b[0] - a[0], b[1] - a[1]) : leg.len - polyLenPts(leg.pts);
        if (dist <= L || k === leg.pts.length - 1) {
          const f = L > 0 ? Math.min(1, dist / L) : 1;
          const yaw = a[2] === b[2] && L > 0 ? Math.atan2(b[0] - a[0], b[1] - a[1]) : rad(s.face);
          return { x: a[0] + (b[0] - a[0]) * f, z: a[1] + (b[1] - a[1]) * f, level: f < 0.5 ? a[2] : b[2], yaw, stop: -1 };
        }
        dist -= L;
      }
    }
    left -= walkT;
  }
  return { x: s0.at[0], z: s0.at[1], level: s0.at[2], yaw: rad(s0.face), stop: 0 };
}

/** Plan length of a point list, level changes left out (the climb is the leg's length less this). */
function polyLenPts(pts: readonly PlayPt[]): number {
  let L = 0;
  for (let i = 1; i < pts.length; i++) if (pts[i]![2] === pts[i - 1]![2]) L += hyp2(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]);
  return L;
}

/** "Mark alone here": the point of the loop nearest (x, z) on `level`, and the time t (s) the guard is there. */
export function isolationAt(g: Guard, p: Patrol, x: number, z: number, level: string): { at: PlayPt; t: number } | null {
  let best: { at: PlayPt; t: number; d: number } | null = null;
  let t = 0;
  const consider = (px: number, pz: number, lv: string, tt: number): void => {
    if (lv !== level) return;
    const d = hyp2(px - x, pz - z);
    if (!best || d < best.d) best = { at: [r2(px), r2(pz), lv], t: r1(tt), d };
  };
  for (let i = 0; i < g.loop.length; i++) {
    const s = g.loop[i]!;
    consider(s.at[0], s.at[1], s.at[2], t);
    t += s.wait;
    const leg = p.legs[i];
    if (!leg) continue;
    for (let k = 1; k < leg.pts.length; k++) {
      const a = leg.pts[k - 1]!;
      const b = leg.pts[k]!;
      if (a[2] !== b[2]) {
        t += (leg.len - polyLenPts(leg.pts)) / p.speed;
        continue;
      }
      const L = hyp2(b[0] - a[0], b[1] - a[1]);
      const f = L > 0 ? Math.max(0, Math.min(1, ((x - a[0]) * (b[0] - a[0]) + (z - a[1]) * (b[1] - a[1])) / (L * L))) : 0;
      consider(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2], t + (f * L) / p.speed);
      t += L / p.speed;
    }
  }
  const b = best as { at: PlayPt; t: number } | null;
  return b ? { at: b.at, t: b.t } : null;
}

// ---------- objectives ----------

/** Objectives that need each other through requires / unlocks (a loop: none of them can be done). [] when none. */
export function objectiveCycles(list: readonly Objective[]): string[] {
  const ids = new Set(list.map((o) => o.id));
  const next = new Map<string, string[]>();
  const edge = (a: string, b: string): void => {
    if (ids.has(a) && ids.has(b)) next.set(a, [...(next.get(a) ?? []), b]);
  };
  for (const o of list) {
    for (const r of o.requires) edge(r, o.id);
    for (const u of o.unlocks) edge(o.id, u);
  }
  const state = new Map<string, number>();
  const inCycle = new Set<string>();
  const stack: string[] = [];
  const visit = (id: string): void => {
    state.set(id, 1);
    stack.push(id);
    for (const n of next.get(id) ?? []) {
      const s = state.get(n) ?? 0;
      if (s === 1) for (let k = stack.indexOf(n); k < stack.length; k++) inCycle.add(stack[k]!);
      else if (s === 0) visit(n);
    }
    stack.pop();
    state.set(id, 2);
  };
  for (const o of list) if (!state.get(o.id)) visit(o.id);
  return list.map((o) => o.id).filter((id) => inCycle.has(id));
}

/** The warning for objective loops, or ''. */
export function cycleWords(list: readonly Objective[]): string {
  const c = objectiveCycles(list);
  return c.length ? `Objectives ${c.join(', ')} need each other through requires / unlocks: none of them can be done` : '';
}

/**
 * Picking: objective `a` needs `b` first (or no longer, when it did). Both sides change: a.requires and b.unlocks stay
 * mirrored. The changed records.
 */
export function toggleRequires(a: Objective, b: Objective): [Objective, Objective] {
  const has = a.requires.includes(b.id);
  const na: Objective = { ...a, requires: has ? a.requires.filter((x) => x !== b.id) : [...a.requires, b.id] };
  const nb: Objective = { ...b, unlocks: has ? b.unlocks.filter((x) => x !== a.id) : b.unlocks.includes(a.id) ? b.unlocks : [...b.unlocks, a.id] };
  return [na, nb];
}

/** Objectives with a deleted one's id taken out of their requires and unlocks. */
export function dropObjectiveRefs(list: readonly Objective[], id: string): Objective[] {
  return list.filter((o) => o.id !== id && (o.requires.includes(id) || o.unlocks.includes(id))).map((o) => ({ ...o, requires: o.requires.filter((x) => x !== id), unlocks: o.unlocks.filter((x) => x !== id) }));
}

/** New records (the tools' A). */
export function newGuard(d: MissionData, at: PlayPt, role: { name: string; employer: string; job: string; kind: string }): Guard {
  return { id: nextId(d.guards, 'GD'), kind: role.kind, employer: role.employer, job: role.job, space: '', loop: [{ at: [r2(at[0]), r2(at[1]), at[2]], wait: 0, face: 0 }], cycle: 0, name: role.name };
}

export function newObjective(d: MissionData, at: PlayPt, kind: string): Objective {
  const order = (d.objectives ?? []).reduce((m, o) => Math.max(m, o.order), 0) + 1;
  return { id: nextId(d.objectives, 'OBJ'), kind, room: roomAt(d, at[2], at[0], at[1]), at: [r2(at[0]), r2(at[1]), at[2]], optional: false, order, requires: [], unlocks: [] };
}

export function newHide(d: MissionData, at: PlayPt, kind: string): Hide {
  return { id: nextId(d.hides, 'H'), space: '', at: [r2(at[0]), r2(at[1]), at[2]], kind };
}

export function newCheckpoint(d: MissionData, at: PlayPt): Checkpoint {
  return { id: nextId(d.checkpoints, 'CP'), at: [r2(at[0]), r2(at[1]), at[2]] };
}

export function newSpawn(d: MissionData, at: PlayPt): Spawn | null {
  if ((d.spawns ?? []).length >= facts.guard.maxSpawns.value) return null;
  return { id: nextId(d.spawns, 'SP'), at: [r2(at[0]), r2(at[1]), at[2]] };
}

/** The marker words on the plan and in 3D ("Insertion 1", "OBJ2 Intel", "H1 Locker", "CP1", "Extraction"). */
export function markerLabel(d: MissionData, coll: MissionColl, e: unknown): string {
  const named = (x: { name?: string }): string => (x.name ? ` ${x.name}` : '');
  if (coll === 'spawns') return `Insertion ${(d.spawns ?? []).findIndex((s) => s.id === (e as Spawn).id) + 1}`;
  if (coll === 'extraction') return 'Extraction';
  if (coll === 'objectives') {
    const o = e as Objective;
    return `${o.id} ${o.order}. ${o.name || objectiveKind(o.kind).name}${o.optional ? ' (optional)' : ''}`;
  }
  if (coll === 'hides') return `${(e as Hide).id} ${(e as Hide).kind}${named(e as Hide)}`;
  if (coll === 'checkpoints') return `${(e as Checkpoint).id}${named(e as Checkpoint)}`;
  const g = e as Guard;
  return `${g.id} ${g.name || guardKind(g.kind).name}`;
}

/** Card foot words for a mission record. */
export function missionWords(d: MissionData, coll: MissionColl, e: unknown, p?: Patrol): string {
  if (coll === 'guards') {
    const g = e as Guard;
    const iso = g.isolation ? `; alone at ${g.isolation.t} s` : '';
    return `${p ? patrolWords(p, g) : `${g.loop.length} stops`}; walks ${walkSpeed(g.kind)} m/s${iso}`;
  }
  if (coll === 'objectives') {
    const o = e as Objective;
    const cyc = objectiveCycles(d.objectives ?? []).includes(o.id) ? '; a loop in requires / unlocks' : '';
    return `${objectiveKind(o.kind).name} in ${o.room || 'no room'}; needs ${o.requires.join(', ') || 'nothing'}; opens ${o.unlocks.join(', ') || 'nothing'}${cyc}`;
  }
  if (coll === 'extraction') {
    const r = (e as Extraction).rect;
    return `${r2(r[2] - r[0])} x ${r2(r[3] - r[1])} m on ${levelName(d, (e as Extraction).level)}`;
  }
  const a = (e as { at: PlayPt }).at;
  const room = roomAt(d, a[2], a[0], a[1]);
  return `x ${a[0]}, z ${a[1]} on ${levelName(d, a[2])}${room ? `, in ${room}` : ''}`;
}

/** Spawn and extraction records to the file's shapes and back (playFile.ts). */
export function spawnsToFile(list: readonly Spawn[]): PlayPt[] {
  return list.map((s) => s.at);
}
export function spawnsFromFile(pts: unknown): Spawn[] | null {
  return Array.isArray(pts) ? pts.map((p, i) => ({ id: `SP${i + 1}`, at: p as PlayPt })) : null;
}
export function extractionToFile(list: readonly Extraction[]): Record<string, unknown> | null {
  const e = list[0];
  if (!e) return null;
  const { id: _id, ...rest } = e;
  return rest;
}
export function extractionFromFile(x: unknown): Extraction[] | null {
  return x && typeof x === 'object' && !Array.isArray(x) && Array.isArray((x as { rect?: unknown }).rect) ? [{ id: 'EX1', ...(x as { level: string; rect: Rect }) }] : null;
}

