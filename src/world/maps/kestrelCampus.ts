/**
 * Campus schema to builder input (ED2 Part B, pure, no Babylon): turns the level editor's campus file
 * (`docs/kestrel/kestrel.campus.blocks.json`: two buildings, level footprint lists, levels U, H and L, boundary fences, gates
 * and rollers, parapets and balustrades, ladders, services) into what `buildKestrel` reads plus the two things it does not:
 * ladders and solid service boxes. No coordinate is typed here; everything comes from the file. The B0 path
 * (`kestrel.blocks.json`) does not pass through this module.
 */
import { roofWalkPieces } from './kestrelRoofs';
import { exteriorPieces, finishAreas } from './kestrelExterior';
import type { ExtBuild, ExtPiece, FinishArea } from './kestrelExterior';
import { campusLights } from './kestrelLights';
import type { CircuitRecord, LampRecord } from './kestrelLights';
import type { LightInit } from '../lights';
import type { Dir, RoofBox, RoofData, RoofPane } from './kestrelRoofs';
import { ceilingBoxes, ceilingType, crawlBoxes, hatchSize } from './kestrelCeilings';
import type { CeilBox, CeilingRoom, CrawlRecord } from './kestrelCeilings';
import type { ArchLevel, ArchOpening, ArchRoom, ArchStair, ArchVoid, ArchWall, KestrelArch, Pt, Rect4 } from './kestrelGeo';

export interface CampusLadder {
  id: string;
  at: Pt;
  from: string;
  to: string;
  facing: string;
}
export interface CampusService {
  id: string;
  /** Centreline points [x, y, z]. */
  path: [number, number, number][];
  /** Width across the run and height. */
  size: [number, number];
}
export interface CampusLevel extends Omit<ArchLevel, 'footprint' | 'footprints'> {
  footprint?: Rect4[] | Rect4;
}
export interface CampusFile {
  meta: { id: string; entry: Pt; site: Rect4; buildings?: { id: string; footprint: Rect4 }[]; footprint?: Rect4 };
  levels: CampusLevel[];
  rooms: ArchRoom[];
  walls: ArchWall[];
  openings: ArchOpening[];
  stairs: ArchStair[];
  ladders?: CampusLadder[];
  voids: ArchVoid[];
  services?: CampusService[];
  /** ON10: roofs (kestrelRoofs.ts). */
  roofs?: RoofData[];
  /** ON4: placed objects: an axis-aligned footprint, the top `h` above the base `y` over its level's floor. */
  objects?: CampusObject[];
  /** ON5: climb pieces and exterior features (kestrelExterior.ts). */
  exterior?: ExtPiece[];
  /** ON6: the play file's lamps and circuits (the editor joins them in; kestrelLights.ts). */
  lamps?: LampRecord[];
  circuits?: CircuitRecord[];
  /** ON13: crawl spaces (kestrelCeilings.ts). */
  crawls?: CrawlRecord[];
}

export interface CampusObject {
  id: string;
  level: string;
  rect: Rect4;
  h: number;
  y: number;
  noLedge?: boolean;
}
/** ON4: an object as a solid box (collision is real, see-through or not); `noLedge` keeps its top from being a lip. */
export interface ObjectBox extends SolidBox {
  noLedge: boolean;
}

export interface LadderPlace {
  id: string;
  x: number;
  z: number;
  y0: number;
  y1: number;
  /** Yaw the climber faces (towards the wall), as `LevelBuilder.ladder`. */
  yaw: number;
}
export interface SolidBox {
  id: string;
  c: [number, number, number];
  s: [number, number, number];
}
export interface CampusBuild {
  arch: KestrelArch;
  ladders: LadderPlace[];
  solids: SolidBox[];
  /** ON10: every roof as boxes (strips on a slope) and its glazing as panes. */
  roofBoxes: RoofBox[];
  roofPanes: RoofPane[];
  /** ON4: every object as a solid box of its real height and base. */
  objectBoxes: ObjectBox[];
  /** ON5: every climb piece as the engine's own builder call (or plain collision), and the floors marked by finish. */
  exterior: ExtBuild[];
  surfaces: FinishArea[];
  /** ON6: every lamp as the game's own light (circuits as switch groups). */
  lights: LightInit[];
  /** ON13: room ceilings (grid tiles light but do not collide) and crawl spaces' boards. */
  ceilings: CeilBox[];
}

/** Compass letter to yaw: north = +Z = 0, east = +X = 90 degrees (docs/kestrel/00-facts.md section 2). */
export const FACING_YAW: Record<string, number> = { N: 0, E: Math.PI / 2, S: Math.PI, W: -Math.PI / 2 };

const bbox = (rs: readonly Rect4[]): Rect4 => [Math.min(...rs.map((r) => r[0])), Math.min(...rs.map((r) => r[1])), Math.max(...rs.map((r) => r[2])), Math.max(...rs.map((r) => r[3]))];
const isRectList = (f: Rect4[] | Rect4): f is Rect4[] => Array.isArray(f[0]);

/** True when the file is in the campus schema (a building list or a level with a footprint list). */
export function isCampus(f: { meta: object; levels: { footprint?: unknown }[] }): boolean {
  return 'buildings' in f.meta || f.levels.some((l) => Array.isArray(l.footprint) && Array.isArray((l.footprint as unknown[])[0]));
}

export function campusToBuild(f: CampusFile): CampusBuild {
  const buildings = f.meta.buildings?.map((b) => b.footprint) ?? [];
  const metaFoot = f.meta.footprint ?? (buildings.length ? bbox(buildings) : f.meta.site);
  const levels: ArchLevel[] = f.levels.map((l) => {
    const { footprint, ...rest } = l;
    if (!footprint) return { ...rest };
    if (isRectList(footprint)) return { ...rest, footprint: bbox(footprint), footprints: footprint.slice() };
    return { ...rest, footprint };
  });
  const floor = (id: string): number => {
    const l = levels.find((q) => q.id === id);
    if (!l) throw new Error(`kestrel campus: unknown level ${id}`);
    return l.floor;
  };
  const arch: KestrelArch = {
    meta: { id: f.meta.id, entry: f.meta.entry, site: f.meta.site, footprint: metaFoot },
    levels,
    rooms: f.rooms,
    walls: f.walls,
    openings: f.openings,
    stairs: f.stairs,
    voids: f.voids,
  };
  const ladders = (f.ladders ?? []).map((l) => {
    const yaw = FACING_YAW[l.facing];
    if (yaw === undefined) throw new Error(`kestrel campus: ladder ${l.id} facing ${l.facing}`);
    return { id: l.id, x: l.at[0], z: l.at[1], y0: floor(l.from), y1: floor(l.to), yaw };
  });
  // a service run is a solid box per straight segment, centred on its path, size = [width across, height]
  const solids: SolidBox[] = [];
  for (const sv of f.services ?? []) {
    const [w, h] = sv.size;
    for (let i = 0; i + 1 < sv.path.length; i++) {
      const p = sv.path[i]!;
      const q = sv.path[i + 1]!;
      const dx = Math.abs(q[0] - p[0]);
      const dz = Math.abs(q[2] - p[2]);
      const dy = Math.abs(q[1] - p[1]);
      const c: [number, number, number] = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2];
      solids.push({ id: `${sv.id}.${i}`, c, s: dx >= dz ? [dx, dy + h, w] : [w, dy + h, dz] });
    }
  }
  const roofBoxes: RoofBox[] = [];
  const roofPanes: RoofPane[] = [];
  for (const r of f.roofs ?? []) {
    const pc = roofWalkPieces(r, roofContext(f, r));
    roofBoxes.push(...pc.boxes);
    roofPanes.push(...pc.panes);
  }
  // ON4: the rect is already turned (yaw swaps w and d in the file), so a box needs no yaw
  const objectBoxes: ObjectBox[] = (f.objects ?? []).map((o) => {
    const [x0, z0, x1, z1] = o.rect;
    return { id: o.id, c: [(x0 + x1) / 2, floor(o.level) + o.y + o.h / 2, (z0 + z1) / 2], s: [x1 - x0, o.h, z1 - z0], noLedge: !!o.noLedge };
  });
  // ON5: rooms with a floor finish sound as its game surface; climb pieces as the engine's builders
  const surfaces = finishAreas(f.rooms as readonly (ArchRoom & { finish?: string })[], floor);
  // ON13: ceilings and crawl spaces (a hatch end leaves its hole open below)
  const ceilings: CeilBox[] = [];
  const rooms = f.rooms as readonly CeilingRoom[];
  for (const r of rooms) if (levels.some((l) => l.id === r.level)) ceilings.push(...ceilingBoxes(r, floor(r.level)));
  for (const c of f.crawls ?? []) {
    if (!levels.some((l) => l.id === c.level)) continue;
    const side = (i: number): number => {
      const e = c.ends[i];
      const r = e?.kind === 'hatch' ? rooms.find((q) => q.id === e.ref) : undefined;
      return r ? hatchSize(ceilingType(r)) : 0;
    };
    ceilings.push(...crawlBoxes(c, floor(c.level), [side(0), side(c.ends.length - 1)]));
  }
  return { arch, ladders, solids, roofBoxes, roofPanes, objectBoxes, exterior: exteriorPieces(f.exterior ?? []), surfaces, lights: campusLights(f), ceilings };
}

/**
 * What the file already builds round a roof (ON10 decisions 5 and 6): roof lights (voids of kind `rooflight` over it,
 * on a level at its height) cut through it; a flat roof's slab is left out where a level floor at its top already covers
 * it (level R's roof rooms), and its parapet on an edge that already has a parapet wall there.
 */
export function roofContext(f: Pick<CampusFile, 'levels' | 'rooms' | 'walls' | 'voids'>, r: RoofData): { cuts: number[][]; slabCovered: boolean; walledEdges: Dir[]; ground: number } {
  const near = (id: string, tol: number): boolean => {
    const l = f.levels.find((q) => q.id === id);
    return !!l && Math.abs(l.floor - r.base) <= tol;
  };
  const [x0, z0, x1, z1] = r.rect;
  const ov = (q: readonly number[]): number => Math.max(0, Math.min(x1, q[2]!) - Math.max(x0, q[0]!)) * Math.max(0, Math.min(z1, q[3]!) - Math.max(z0, q[1]!));
  const cuts = f.voids.filter((v) => v.kind === 'rooflight' && (v.level === r.level || near(v.level, 0.5)) && ov(v.rect) > 0).map((v) => v.rect.slice());
  const covered = f.rooms.filter((q) => near(q.level, 0.05)).reduce((a, q) => a + ov(q.rect), 0);
  const slabCovered = r.type === 'flat' && covered >= (x1 - x0) * (z1 - z0) * 0.99;
  const walledEdges: Dir[] = [];
  const edges: [Dir, number, number, number, 0 | 1][] = [
    ['S', z0, x0, x1, 1],
    ['N', z1, x0, x1, 1],
    ['W', x0, z0, z1, 0],
    ['E', x1, z0, z1, 0],
  ];
  for (const [d, v, lo, hi, axis] of edges) {
    // a parapet wall within a wall's thickness of the edge, along at least half of it
    const run = f.walls
      .filter((w) => w.kind === 'parapet' && near(w.level, 0.05) && Math.abs(w.a[axis] - v) <= w.t && Math.abs(w.b[axis] - v) <= w.t)
      .reduce((a, w) => a + Math.max(0, Math.min(hi, Math.max(w.a[1 - axis]!, w.b[1 - axis]!)) - Math.max(lo, Math.min(w.a[1 - axis]!, w.b[1 - axis]!))), 0);
    if (run >= (hi - lo) / 2) walledEdges.push(d);
  }
  const ground = f.levels.find((l) => l.id === 'G')?.floor ?? 0;
  return { cuts, slabCovered, walledEdges, ground };
}

/**
 * The level a point stands on: the highest level whose floor is at or under the feet (half a metre of slack for stairs)
 * and whose footprint holds the point; else the highest level under the feet. Used by the walk readout and the way back.
 */
export function levelAt(f: Pick<CampusFile, 'levels'>, x: number, z: number, y: number): CampusLevel | null {
  const under = f.levels.filter((l) => l.floor <= y + 0.5).sort((a, b) => b.floor - a.floor);
  const holds = (l: CampusLevel): boolean => {
    const fp = l.footprint;
    if (!fp) return true;
    const rs = isRectList(fp) ? fp : [fp];
    return rs.some((r) => x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3]);
  };
  return under.find(holds) ?? under[0] ?? null;
}
