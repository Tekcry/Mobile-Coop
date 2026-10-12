/**
 * Campus schema to builder input (ED2 Part B, pure, no Babylon): turns the level editor's campus file
 * (`docs/kestrel/kestrel.campus.blocks.json`: two buildings, level footprint lists, levels U, H and L, boundary fences, gates
 * and rollers, parapets and balustrades, ladders, services) into what `buildKestrel` reads plus the two things it does not:
 * ladders and solid service boxes. No coordinate is typed here; everything comes from the file. The B0 path
 * (`kestrel.blocks.json`) does not pass through this module.
 */
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
  return { arch, ladders, solids };
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
