import { Vector3 } from '../../core/babylon';
import type { EnemyKind } from '../../ai/enemyDefs';
import { loopArrivals, loopPeriod, loopStateAt, loopTimeAtMaster, loopWaits, type LoopWp } from '../../ai/loopSchedule';
import type { MapDef, MapLayout } from '../mapDef';
import type { LevelBuilder } from '../levelBuilder';
import type { RoomDef, SquadSlot } from '../rooms';
import data from './trunkAnnex.data.json';

/**
 * The Kestrel Trunk Annex (First Playable T1), to `docs/design/map-trunk-annex.md`: a 36 x 28 m greybox of three
 * levels (Ground 0, Upper 3.3, Roof 6.6) plus Cooper's Lane south of the yard. Boxes only. The geometry follows the
 * design JSON (`trunkAnnex.data.json`, a copy of `docs/design/map-trunk-annex.json`; a test keeps them equal): spaces,
 * blocks, openings, links, spawns, objectives and the six guard loops. Lamps, switches, alarm panels, hide spots and the
 * trench D1 come in T2 / T3.
 *
 * Wall placement: every wall sits on the OUTSIDE of the space rectangles in the design (`side`), so a corridor or lane
 * keeps its full design width (the hall west lane stays 3.5 m, the cage aisles 3.0 m). Exterior walls are 0.45, interior
 * 0.30. Sealed doors (RD, ND) are plain wall. Door centres are the design's; the nav grid origin is the world bounds, on
 * a quarter-metre offset (all single doors are 1.2 m, which passes at any alignment: `docs/design/scale-sheet.md` 4).
 */
export const TRUNK_Y = { ground: 0, upper: 3.3, roof: 6.6 } as const;

const WALL = '#a9a496';
const WALL_DARK = '#7d786d';
const FLOOR = '#6f7477';
const STEEL = '#55606a';
const STAIR = '#9a948a';
const RAIL_C = '#4d5560';
const BLOCK = '#8a8478';

const T = 0.3; // interior wall thickness
const TX = 0.45; // exterior wall thickness
const DOOR_H = 2.1;
const SLAB = 0.3;
const GH = 3.0; // ground ceiling under the upper slab
const UH = 3.0; // upper ceiling
const ROOF_UNDER = TRUNK_Y.roof - SLAB; // 6.3: the underside of the roof slab
const PARAPET = 1.1;
const RAIL = 1.0;

/** An opening in a wall line: centre `c` along the line, width `w`; door / locked door anchor, glazed, or a bare opening. */
interface Gap {
  c: number;
  w: number;
  door?: 'door' | 'locked';
  /** Glazed: a sill below, a fence (stops bodies, not sight or light) above. */
  glass?: { sill: number; top: number };
}

type Side = -1 | 0 | 1;

/**
 * A wall along `axis` ('x' runs along X at z = `at`, 'z' runs along Z at x = `at`) from `a` to `b` standing on `y0` up to
 * `y1`. `side` puts the thickness on the low side (-1), the high side (+1) or centred (0) of the line. Gaps get a lintel
 * (to `y1`) and a door anchor (hinge at the gap start, as `exchange.ts` does).
 */
function wall(b: LevelBuilder, axis: 'x' | 'z', at: number, a: number, e: number, side: Side, t: number, y0: number, y1: number, gaps: readonly Gap[], color = WALL): void {
  const mid = at + (side * t) / 2;
  const seg = (s0: number, s1: number, lo: number, hi: number): void => {
    if (s1 - s0 < 1e-6 || hi - lo < 1e-6) return;
    if (axis === 'x') b.box((s0 + s1) / 2, (lo + hi) / 2, mid, s1 - s0, hi - lo, t, color);
    else b.box(mid, (lo + hi) / 2, (s0 + s1) / 2, t, hi - lo, s1 - s0, color);
  };
  const sorted = [...gaps].sort((p, q) => p.c - q.c);
  let s = a;
  for (const g of sorted) {
    const g0 = g.c - g.w / 2;
    const g1 = g.c + g.w / 2;
    seg(s, g0, y0, y1);
    if (g.glass) {
      seg(g0, g1, y0, y0 + g.glass.sill);
      seg(g0, g1, y0 + g.glass.top, y1);
      if (axis === 'x') b.fence(g0, mid, g1, mid, g.glass.top - g.glass.sill, y0 + g.glass.sill);
      else b.fence(mid, g0, mid, g1, g.glass.top - g.glass.sill, y0 + g.glass.sill);
    } else {
      seg(g0, g1, y0 + DOOR_H, y1);
      if (g.door) {
        if (axis === 'x') b.door(g0, y0, mid, g.w, Math.PI / 2, { locked: g.door === 'locked', breachable: g.door !== 'locked' });
        else b.door(mid, y0, g0, g.w, 0, { locked: g.door === 'locked', breachable: g.door !== 'locked' });
      }
    }
    s = g1;
  }
  seg(s, e, y0, y1);
}

/** Floor slab over [x0, x1] x [z0, z1] with its top at `top`, minus rectangular holes (tiled along the hole edges). */
function slab(b: LevelBuilder, x0: number, x1: number, z0: number, z1: number, top: number, holes: readonly Rect[] = []): void {
  const xs = new Set<number>([x0, x1]);
  const zs = new Set<number>([z0, z1]);
  for (const [a, c, d, e] of holes) {
    for (const x of [a, c]) if (x > x0 && x < x1) xs.add(x);
    for (const z of [d, e]) if (z > z0 && z < z1) zs.add(z);
  }
  const X = [...xs].sort((p, q) => p - q);
  const Z = [...zs].sort((p, q) => p - q);
  for (let i = 0; i + 1 < X.length; i++) {
    for (let j = 0; j + 1 < Z.length; j++) {
      const mx = (X[i]! + X[i + 1]!) / 2;
      const mz = (Z[j]! + Z[j + 1]!) / 2;
      if (holes.some((h) => mx > h[0] && mx < h[1] && mz > h[2] && mz < h[3])) continue;
      b.floor(mx, mz, X[i + 1]! - X[i]!, Z[j + 1]! - Z[j]!, FLOOR, top, SLAB);
    }
  }
}

/** A rectangle on the plan: x0, x1, z0, z1. */
type Rect = readonly [x0: number, x1: number, z0: number, z1: number];

/** Solid block over [x0, x1] x [z0, z1] from y0 to y1. */
function solid(b: LevelBuilder, x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, color: string): void {
  b.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, color);
}

const LEVEL_Y: Record<string, number> = { G: TRUNK_Y.ground, U: TRUNK_Y.upper, R: TRUNK_Y.roof };

// --- the fire stair (FS): three flights of 13 risers in a 4.7 x 4.2 well, a switchback with a sideways turn at each end -----
// Flights collide as smooth ramps (slope 0.75: a cell is 0.5 m, so stepped treads would climb 0.51 m between cells, over the 0.45 nav step).
const FS = {
  /** Mid column (flights A and C, centred on the doors at x 15.5) and east column (flight B). */
  midX: [14.85, 16.15] as const,
  eastX: [16.15, 17.45] as const,
  z0: -7.0,
  z1: -2.8,
  /** Flight run (m) and the z where the flights end and the landing begins. */
  steps: 13,
  run: 0.2254,
  rise: 2.2,
};
const FS_RISER = FS.rise / FS.steps;
const FS_ZN = FS.z0 + FS.steps * FS.run; // -4.07: top of A, bottom of B, start of the landings

function buildFireStair(b: LevelBuilder): void {
  const from = b.boxes.length;
  const [ax0, ax1] = FS.midX;
  const [bx0, bx1] = FS.eastX;
  // the well: filler blocks west (x 13..14.85) and east (17.45..18) so the columns are the only floor; the north wall
  solid(b, 13.0, ax0, FS.z0, -2.5, 0, ROOF_UNDER, WALL);
  solid(b, bx1, 18.0, FS.z0, -2.5, 0, ROOF_UNDER, WALL);
  solid(b, 13.0, 18.0, FS.z1, -2.5, 0, ROOF_UNDER, WALL);
  const len = FS.steps * FS.run;
  const w = ax1 - ax0;
  // A: south to north, 0 -> 2.2, in the mid column
  b.stairs((ax0 + ax1) / 2, FS.z0 + len / 2, w, len, FS.rise, FS.steps, STAIR, 0, 0);
  // north landing NL (2.2) across both columns
  solid(b, ax0, bx1, FS_ZN, FS.z1, 0, FS.rise, STAIR);
  // B: north to south, 2.2 -> 4.4, in the east column, over a filler wedge (no hollow under it)
  b.stairs((bx0 + bx1) / 2, FS_ZN - len / 2, w, len, FS.rise, FS.steps, STAIR, Math.PI, FS.rise);
  for (let j = 0; j < FS.steps; j++) solid(b, bx0, bx1, FS_ZN - (j + 1) * FS.run, FS_ZN - j * FS.run, 0, FS.rise + FS_RISER * (j + 1) - 0.45, STAIR);
  // C: south to north over A, 4.4 -> 6.6, in the mid column (the open space under it is A)
  b.stairs((ax0 + ax1) / 2, FS.z0 + len / 2, w, len, FS.rise, FS.steps, STAIR, 0, 2 * FS.rise);
  // divider between the columns (rail height over C), open at the south end where B meets C and at the north landing
  for (let k = 2; k < FS.steps; k++) {
    const top = 2 * FS.rise + FS_RISER * (k + 1) + RAIL;
    solid(b, 16.1, 16.2, FS.z0 + k * FS.run, FS.z0 + (k + 1) * FS.run, 0, top, RAIL_C);
  }
  b.mark(from, { noLedge: true });
}

// --- the open stair (S1): along the hall's south wall, two flights of 10 with a 2.0 m landing, foot at the east end -------
const S1 = { z: -5.75, w: 2.4, footX: 2.0, rise: 1.65, run: 2.85, landing: 2.0 };

function buildOpenStair(b: LevelBuilder): void {
  const from = b.boxes.length;
  const x1 = S1.footX - S1.run; // -0.85: end of flight 1
  const x2 = x1 - S1.landing; // -2.85: start of flight 2
  const x3 = x2 - S1.run; // -5.7: top of flight 2
  b.stairs((S1.footX + x1) / 2, S1.z, S1.w, S1.run, S1.rise, 10, STAIR, -Math.PI / 2, 0);
  b.block((x1 + x2) / 2, S1.z, S1.landing, S1.rise, S1.w, STAIR);
  b.stairs((x2 + x3) / 2, S1.z, S1.w, S1.run, S1.rise, 10, STAIR, -Math.PI / 2, S1.rise);
  // the stair's open (north) side is a waist-high rail that follows the treads (and seals the space under them)
  const zr = S1.z + S1.w / 2 + 0.1;
  const rail = (xa: number, xb: number, top: number): void => solid(b, Math.min(xa, xb), Math.max(xa, xb), zr - 0.1, zr, 0, top + RAIL, RAIL_C);
  const tread = S1.run / 10;
  for (let j = 0; j < 10; j++) rail(S1.footX - j * tread, S1.footX - (j + 1) * tread, (S1.rise / 10) * (j + 1));
  rail(x1, x2, S1.rise);
  for (let j = 0; j < 10; j++) rail(x2 - j * tread, x2 - (j + 1) * tread, S1.rise + (S1.rise / 10) * (j + 1));
  rail(x3, -6.0, TRUNK_Y.upper);
  b.mark(from, { noLedge: true });
}

/** The data, typed for the builder. */
interface DSpace { id: string; name: string; level: string; rect: number[]; kind: string; ceil: number }
interface DBlock { id: string; level: string; rect: number[]; h: number; label: string }
interface DWp { x: number; z: number; d: number; face: number[]; what: string }
interface DGuard { id: string; arch: string; speed: number; phase: number; role: string; wps: DWp[] }
interface DOpening { id: string; type: string; level: string; axis: string; at: number; c: number; w: number }

const SPACES = data.spaces as unknown as DSpace[];
const BLOCKS = data.blocks as unknown as DBlock[];
const GUARDS = data.guards as unknown as DGuard[];
const OPENINGS = data.openings as unknown as DOpening[];

/** The opening `id` from the design data as a wall gap: single and double doors are doors, the gates are padlocked, windows are glazed, wide openings are bare. */
function gap(id: string): Gap {
  const o = OPENINGS.find((p) => p.id === id);
  if (!o) throw new Error(`trunk annex: no opening ${id}`);
  const g: Gap = { c: o.c, w: o.w };
  if (o.type === 'door1' || o.type === 'door2') g.door = 'door';
  else if (o.type === 'gate') g.door = 'locked';
  else if (o.type === 'window') g.glass = { sill: 0.9, top: 2.1 };
  return g;
}

/** Blocks the builder replaces or leaves out: the open stair (built by `buildOpenStair`) and the ladder-top housings (they would sit on the exits). */
const SKIP_BLOCKS = new Set(['S1', 'R1T', 'GLR', 'ESR']);

export interface GuardLoop {
  id: string;
  kind: EnemyKind;
  speed: number;
  phase: number;
  role: string;
  level: keyof typeof TRUNK_Y;
  wps: LoopWp[];
  faces: number[];
  period: number;
}

const GUARD_LEVEL: Record<string, keyof typeof TRUNK_Y> = { G1: 'ground', G2: 'ground', G3: 'ground', G4: 'upper', G5: 'ground', G6: 'roof' };

/** The six guard loops from the design data: kind, speed, phase, waypoints with dwells and facings, and the computed period. */
export function guardLoops(): GuardLoop[] {
  return GUARDS.map((g) => {
    const wps: LoopWp[] = g.wps.map((w) => ({ x: w.x, z: w.z, d: w.d }));
    return {
      id: g.id,
      kind: g.arch as EnemyKind,
      speed: g.speed,
      phase: g.phase,
      role: g.role,
      level: GUARD_LEVEL[g.id] ?? 'ground',
      wps,
      faces: g.wps.map((w) => Math.atan2(w.face[0] ?? 0, w.face[1] ?? 1)),
      period: loopPeriod(wps, g.speed),
    };
  });
}

/** Planned departure (loop time, s) from each waypoint: its arrival plus the pause. */
export function loopLeave(g: GuardLoop): number[] {
  const arr = loopArrivals(g.wps, g.speed);
  const w = loopWaits(g.wps);
  return arr.map((a, i) => a + w[i]!);
}

/** A squad slot for a guard: placed where its loop is when the master clock starts, with the route, waits and facings. */
export function guardSlot(g: GuardLoop): SquadSlot {
  const st = loopStateAt(g.wps, g.speed, loopTimeAtMaster(g.phase));
  const yaw = st.wait > 0 ? g.faces[st.idx]! : Math.atan2(g.wps[st.idx]!.x - st.x, g.wps[st.idx]!.z - st.z);
  return {
    kind: g.kind,
    x: st.x,
    z: st.z,
    yaw,
    y: TRUNK_Y[g.level],
    route: g.wps.map((w): [number, number] => [w.x, w.z]),
    waits: loopWaits(g.wps),
    faces: g.faces,
    start: { idx: st.idx, wait: st.wait },
    loop: { period: g.period, leave: loopLeave(g), t0: ((loopTimeAtMaster(g.phase) % g.period) + g.period) % g.period },
    free: g.id !== 'G1' && g.id !== 'G5' && g.id !== 'G6',
  };
}

/** Room tags: the design spaces (a space with a south-east carve, the generator room and the roof, also gets a room for the part the carve leaves). Guards belong to the room they stand in when the clock starts. */
function rooms(): RoomDef[] {
  const squads: Record<string, string> = { G1: 'yard', G2: 'hall', G3: 'hall', G4: 'gal', G5: 'cage', G6: 'roof' };
  const slots = guardLoops().map((g) => ({ id: g.id, slot: guardSlot(g) }));
  const out: RoomDef[] = [];
  for (const s of SPACES) {
    const [x0, z0, x1, z1] = s.rect as [number, number, number, number];
    const y = LEVEL_Y[s.level] ?? 0;
    // storeys touch without overlapping: the ground rooms end at 3.2, the upper rooms start at 3.25, the roof rooms at 6.55
    const minY = y === 0 ? -0.2 : y - 0.05;
    const maxY = s.level === 'R' ? y + 8 : s.level === 'U' ? y + 3.2 : y + GH + 0.2;
    const squad = slots.filter((q) => squads[q.id] === s.id).map((q) => q.slot);
    const carve = (s as { carve?: number[][] }).carve?.[0];
    const corner = carve !== undefined && carve[2] === x1 && carve[1] === z0;
    out.push({ id: s.id, name: s.name, minX: x0, maxX: corner ? carve[0]! : x1, minZ: z0, maxZ: z1, minY, maxY, ...(squad.length ? { squad } : {}) });
    if (corner) out.push({ id: `${s.id}-e`, name: s.name, minX: carve[0]!, maxX: x1, minZ: carve[3]!, maxZ: z1, minY, maxY });
  }
  return out;
}

function buildShell(b: LevelBuilder): void {
  const GY = TRUNK_Y.ground;
  const UY = TRUNK_Y.upper;
  const RY = TRUNK_Y.roof;
  // world bounds: the site (x +-18, z -14..14) plus Cooper's Lane (z -17.5..-14.45) and half a metre of margin
  b.perimeter(-18.5, 18.5, -17.5, 14.5, 8, WALL_DARK);

  // floors
  slab(b, -18.5, 18.5, -17.5, 14.5, GY);
  slab(b, -18, -6.0, -7, 14, UY); // Test room and Control room
  slab(b, -6.0, -2.5, -3, 14, UY); // gallery
  slab(b, -6.0, -5.7, -7, -4.5, UY); // the S1 top landing, east of the wall line (the stair builder adds its own)
  // roof (head house floor included), cut for the ladders GL and ES and for the fire stair's top flight
  slab(b, -18, 18, -7, 14, RY, [
    [-5.5, -4.5, 12, 13],
    [16, 17, 12, 13],
    [FS.midX[0], FS.midX[1], FS.z0, FS_ZN],
  ]);

  // exterior walls: west, east, north to the roof; the south facade with PD, GD and FD1 (the roller door RD is plain wall)
  wall(b, 'z', -18, -7.45, 14.45, -1, TX, 0, RY, [], WALL_DARK);
  wall(b, 'z', 18, -7.45, 14.45, 1, TX, 0, RY, [], WALL_DARK);
  wall(b, 'x', 14, -18.45, 18.45, 1, TX, 0, RY, [], WALL_DARK);
  wall(b, 'x', -7, -18.45, 18.45, -1, TX, 0, RY, [gap('PD'), gap('GD'), gap('FD1')], WALL_DARK);
  // the loading yard: walls 3.0 high, the lane gates Gp (padlocked, the team's way in) and Gv (chained)
  wall(b, 'x', -14, -18.45, 18.45, -1, TX, 0, 3, [gap('Gp'), gap('Gv')], WALL_DARK);
  wall(b, 'z', -18, -14.45, -7.45, -1, TX, 0, 3, [], WALL_DARK);
  wall(b, 'z', 18, -14.45, -7.45, 1, TX, 0, 3, [], WALL_DARK);

  // x = -6: the Goods-in and Break room wall (WO1, DD), and above it the Test room / Control room wall (SO, DT2, DC, W1)
  wall(b, 'z', -6, -7, 14, -1, T, 0, GH, [gap('WO1'), gap('DD')]);
  wall(b, 'z', -6, -7, 14, -1, T, UY, UY + UH, [gap('SO'), gap('DT2'), gap('DC'), gap('W1')]);
  // z = 2.5: Goods-in | Break room, Test room | Control room (no door between them)
  wall(b, 'x', 2.5, -18, -6.3, 1, T, 0, GH, []);
  wall(b, 'x', 2.5, -18, -6.3, 1, T, UY, UY + UH, []);
  // x = 6: the hall's east wall to the generator room (DG), then the cage mesh (CH): a fence, sight and light pass
  wall(b, 'z', 6, -7, 4, -1, T, 0, ROOF_UNDER, [gap('DG')]);
  const ch = gap('CH');
  const mesh = OPENINGS.find((p) => p.id === 'MESH')!;
  const m0 = mesh.c - mesh.w / 2;
  const m1 = mesh.c + mesh.w / 2;
  b.fence(5.97, m0, 5.97, ch.c - ch.w / 2, ROOF_UNDER, 0);
  b.fence(5.97, ch.c + ch.w / 2, 5.97, m1, ROOF_UNDER, 0);
  b.fence(5.97, ch.c - ch.w / 2, 5.97, ch.c + ch.w / 2, ROOF_UNDER - DOOR_H, DOOR_H);
  b.door(5.97, 0, ch.c - ch.w / 2, ch.w, 0, { locked: false, breachable: true });
  // z = 4: generator room | cage (GCd)
  wall(b, 'x', 4, 6, 18, -1, T, 0, ROOF_UNDER, [gap('GCd')]);
  // the fire stair's west wall (the well is filled by `buildFireStair`)
  wall(b, 'z', 13, -7, -2.5, 1, T, 0, ROOF_UNDER, []);

  // parapets round the roof (1.1 m), open at the exterior ladder RL; the head house walls (3 m, open top) with the roof door FD3
  wall(b, 'x', -7, -18.45, 13, -1, TX, RY, RY + PARAPET, [{ c: -16.5, w: 1.0 }], WALL_DARK);
  wall(b, 'z', 18, -2.5, 14.45, 1, TX, RY, RY + PARAPET, [], WALL_DARK);
  wall(b, 'x', 14, -18.45, 18.45, 1, TX, RY, RY + PARAPET, [], WALL_DARK);
  wall(b, 'z', -18, -7.45, 14.45, -1, TX, RY, RY + PARAPET, [], WALL_DARK);
  wall(b, 'x', -7, 13, 18.45, -1, TX, RY, RY + 3, [], WALL_DARK);
  wall(b, 'z', 18, -7.45, -2.5, 1, TX, RY, RY + 3, [], WALL_DARK);
  wall(b, 'z', 13, -7, -2.5, 1, T, RY, RY + 3, []);
  wall(b, 'x', -2.5, 13, 18, -1, T, RY, RY + 3, [gap('FD3')]);

  // rails on the gallery's open sides (east over the hall, south over the stair well)
  solid(b, -2.5, -2.4, -3, 14, UY, UY + RAIL, RAIL_C);
  solid(b, -6, -2.5, -3.0, -2.9, UY, UY + RAIL, RAIL_C);

  buildOpenStair(b);
  buildFireStair(b);

  // blocks from the design: racks, genset, tables, shaft towers, AHUs
  for (const k of BLOCKS) {
    if (SKIP_BLOCKS.has(k.id)) continue;
    const [x0, z0, x1, z1] = k.rect as [number, number, number, number];
    const y0 = LEVEL_Y[k.level] ?? 0;
    solid(b, x0, x1, z0, z1, y0, y0 + k.h, BLOCK);
  }

  // ladders: RL (exterior, south facade, yard to roof), R1 (riser: Goods-in to the Test room, climbed from the east),
  // GL (gallery to the roof, over the tower in the gallery's north-west corner), ES (cage east aisle to the roof stack)
  b.ladder(-16.5, -7.5, GY, RY, 0, STEEL);
  b.ladder(-15.45, -6, GY, UY, -Math.PI / 2, STEEL);
  b.ladder(-5, 12.95, UY, RY, 0, STEEL);
  b.ladder(16.5, 12.95, GY, RY, 0, STEEL);
}

export const trunkAnnex: MapDef = {
  id: 'trunk-annex',
  name: 'Kestrel Trunk Annex',
  description: 'The 1962 trunk-switch annex at night: a loading yard, a double-height switch hall with a gallery, a core switch cage, a roof, and six guards on the exchange master clock.',
  modes: ['infiltration', 'sandbox'],
  theme: {
    sky: '#0b111b',
    horizon: '#2b3440',
    ground: '#5f6364',
    fogStart: 30,
    fogEnd: 90,
    sunDir: [0.35, -1, 0.55],
    sunIntensity: 0.16,
    ambient: 0.3,
    lightLevel: 0.1,
    faction: 'urban',
    grade: { tint: [0.92, 1.0, 1.08], saturation: 0.85, contrast: 1.08 },
  },
  build(b: LevelBuilder): MapLayout {
    buildShell(b);
    return {
      playerSpawns: data.spawns.map((s) => ({ pos: new Vector3(s.x, 0, s.z), yaw: 0 })),
      enemySpawns: [],
      props: [],
      objectives: [],
      pickups: [],
      rooms: rooms(),
    };
  },
};
