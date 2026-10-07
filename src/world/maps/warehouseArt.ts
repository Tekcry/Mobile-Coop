/**
 * Warehouse voxel art (3.0): what every blockout piece's voxels look like (concrete block walls with mortar,
 * corrugated cladding over a concrete plinth, cast concrete with chipped arrises, saw-cut floor slabs with stains,
 * painted steel with worn edges and rust, plank crates, shrink-wrapped pallet loads, racking bays) and the dressing
 * the old detail pass drew as boxes, now voxels: grime up the wall bases, floor lines and oil stains, conduit with
 * junction boxes, electrical boxes, vents and signs. Visual only - the blockout (collision, cover, nav, ledges) is
 * untouched, and nothing protrudes from a cover face or a walkable top where gameplay reads it.
 */
import type { BoxPiece, CylPiece } from '../levelBuilder';
import { shade } from '../detailPass';
import { SURFACE_ID } from '../surfaceAtlas';
import { Prog } from '../../voxel/programs';
import { ShapeMode, type VoxelShape } from '../../voxel/shapes';
import type { Palette, VoxelArt } from '../../voxel/levelVoxels';

const C = {
  concrete: '#8e9396',
  floor: '#6f7477',
  yard: '#5a5e60',
  wall: '#b7b2a6',
  wallDark: '#7d786d',
  steel: '#55606a',
  rack: '#3f6f9a',
  beam: '#e07b22',
  crate: '#a8784a',
  hazard: '#e8b923',
  desk: '#8a6a4c',
  roof: '#4a4f55',
  shrink: '#c4c0b0',
  upright: '#2d4f6e',
  cabinet: '#4b5560',
  container: '#3d6e8f',
  trailer: '#d8d8d8',
  dumpster: '#2f5a3c',
};

const TONES = [0.9, 0.96, 1.0, 1.05];
const tones = (hex: string, t: readonly number[] = TONES): string[] => t.map((k) => shade(hex, k));

/** A program's variant range (+ its extra entries, each its own single entry). */
function range(pal: Palette, hex: string, kind: keyof typeof SURFACE_ID, t: readonly number[] = TONES): number {
  return pal.range(tones(hex, t), SURFACE_ID[kind]).base;
}

const near = (a: string, b: string): boolean => a.toLowerCase() === b;

/** The look per piece (by its colour and size: the Warehouse builder's palette). */
function piece(p: BoxPiece | CylPiece, _i: number, kind: 'box' | 'cyl', pal: Palette): { mat?: number; prog: Prog; params: readonly number[] } | null {
  const col = p.color.toLowerCase();
  const sx = kind === 'box' ? (p as BoxPiece).s[0] : (p as CylPiece).r * 2;
  const sy = kind === 'box' ? (p as BoxPiece).s[1] : (p as CylPiece).h;
  const sz = kind === 'box' ? (p as BoxPiece).s[2] : (p as CylPiece).r * 2;
  const small = Math.min(sx, sz);
  if (near(col, C.wall)) {
    return { mat: range(pal, C.wall, 'concrete', [0.86, 0.93, 1.0, 1.04]), prog: Prog.BlockWall, params: [4, pal.get(shade(C.wall, 0.74), SURFACE_ID.concrete), 0.2, 0.4] };
  }
  if (near(col, C.wallDark)) {
    return {
      mat: range(pal, '#6f7478', 'corrugated', [0.88, 0.95, 1.0, 1.06]),
      prog: Prog.Cladding,
      params: [4, 1.2, pal.get('#868782', SURFACE_ID.concrete), pal.get('#6e4b33', SURFACE_ID.rust)],
    };
  }
  if (near(col, C.concrete)) {
    return { mat: range(pal, C.concrete, 'concrete'), prog: Prog.Concrete, params: [4, 22, 1.2, pal.get(shade(C.concrete, 0.8), SURFACE_ID.concrete)] };
  }
  if (near(col, C.floor)) {
    return { mat: range(pal, C.floor, 'concreteFloor', [0.92, 0.97, 1.0, 1.04]), prog: Prog.Floor, params: [4, pal.get(shade(C.floor, 0.7), SURFACE_ID.concreteFloor), 4, pal.get(shade(C.floor, 0.78), SURFACE_ID.concreteFloor)] };
  }
  if (near(col, C.yard)) {
    return { mat: range(pal, C.yard, 'asphalt', [0.9, 0.96, 1.0, 1.05]), prog: Prog.Floor, params: [4, pal.get(shade(C.yard, 0.72), SURFACE_ID.asphalt), 6, pal.get(shade(C.yard, 0.8), SURFACE_ID.asphalt)] };
  }
  if (near(col, C.steel) || near(col, C.cabinet) || near(col, C.trailer) || near(col, C.dumpster) || near(col, '#3b3f44')) {
    return { mat: range(pal, col, 'brushed', [0.9, 0.97, 1.0, 0.8]), prog: Prog.Steel, params: [4, pal.get('#8d949a', SURFACE_ID.brushed), near(col, C.trailer) ? 1.2 : 0, pal.get('#6b4a35', SURFACE_ID.rust)] };
  }
  if (near(col, C.container)) {
    return { mat: range(pal, C.container, 'corrugated'), prog: Prog.Cladding, params: [4, 0, 0, pal.get('#7a4c30', SURFACE_ID.rust)] };
  }
  if (near(col, C.rack)) {
    // wrapped loads and brown cartons in the bays, a pallet under each (the last variant)
    const loads = pal.range([shade(C.shrink, 0.95), C.shrink, '#a88a62', '#9c7f5a', '#8f7350'], SURFACE_ID.fabric).base;
    return { mat: loads, prog: Prog.Rack, params: [5, pal.get(C.upright, SURFACE_ID.brushed), 2.7, pal.get(C.beam, SURFACE_ID.brushed)] };
  }
  if (near(col, C.crate) || near(col, '#b59468')) {
    return { mat: range(pal, col, 'wood'), prog: Prog.Planks, params: [4, pal.get(shade(col, 0.62), SURFACE_ID.wood), 0.15, pal.get(shade(col, 0.78), SURFACE_ID.wood)] };
  }
  if (near(col, C.desk)) {
    return { mat: range(pal, C.desk, 'wood'), prog: Prog.Planks, params: [4, pal.get(shade(C.desk, 0.7), SURFACE_ID.wood), 0.3, 0] };
  }
  if (near(col, C.shrink)) {
    return { mat: range(pal, C.shrink, 'fabric', [0.92, 0.97, 1.0, 1.03]), prog: Prog.Wrap, params: [4, pal.get('#8a8a80', SURFACE_ID.rubber), 0, pal.get('#9a7a52', SURFACE_ID.wood)] };
  }
  if (near(col, C.hazard)) {
    // posts, rails and edges: stripes; a big yellow body (the forklift) is painted steel
    if (small <= 0.35 || sy <= 0.35) return { prog: Prog.Hazard, params: [0, pal.get('#1e1e1e', SURFACE_ID.brushed), 0.3, 0] };
    return { mat: range(pal, C.hazard, 'brushed', [0.9, 0.97, 1.0, 0.75]), prog: Prog.Steel, params: [4, pal.get('#5f5f5a', SURFACE_ID.brushed), 0, pal.get('#6b4a35', SURFACE_ID.rust)] };
  }
  if (near(col, C.roof)) {
    return { mat: range(pal, C.roof, 'corrugated', [0.9, 0.97, 1.0, 0.82]), prog: Prog.Steel, params: [4, 0, 0.15, 0] };
  }
  return null;
}

/** Tall walls (block or clad) for the dressing: [piece, along-x]. */
function walls(boxes: readonly BoxPiece[]): { b: BoxPiece; alongX: boolean }[] {
  return boxes
    .filter((b) => b.collide && b.visible !== false && !b.detail && Math.abs(b.pitch) < 1e-3 && Math.abs(b.yaw) < 1e-3 && b.s[1] >= 2.4 && Math.min(b.s[0], b.s[2]) <= 0.7 && Math.max(b.s[0], b.s[2]) >= 2)
    .map((b) => ({ b, alongX: b.s[0] >= b.s[2] }));
}

/** Deterministic random stream (mulberry32). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function extra(pal: Palette, boxes: readonly BoxPiece[]): VoxelShape[] {
  const out: VoxelShape[] = [];
  const r = rng(0x5ebd);
  const box = (c: [number, number, number], s: [number, number, number], mat: number, mode = ShapeMode.Fill, prog = 0, params: number[] = []): void => {
    out.push({ kind: 'box', c, s, yaw: 0, pitch: 0, mat, mode, prog, params });
  };
  const grime = pal.get('#3a3a36', SURFACE_ID.concrete);
  const conduit = pal.get('#6b7075', SURFACE_ID.brushed);
  const jbox = pal.get('#585d62', SURFACE_ID.brushed);
  const ebox = pal.get('#7a8086', SURFACE_ID.brushed);
  const vent = pal.get('#2a2e33', SURFACE_ID.brushed);
  const signs = ['#d8b22c', '#c9cdd1', '#2f6fb3', '#b33a2f', '#3a8f4f'].map((c) => pal.get(c, SURFACE_ID.plaster));
  const line = pal.get('#d9b52a', SURFACE_ID.concreteFloor);
  const white = pal.get('#c9c9c2', SURFACE_ID.asphalt);
  const oil = pal.get('#262a2c', SURFACE_ID.concreteFloor);

  for (const { b, alongX } of walls(boxes)) {
    const [cx, cy, cz] = b.c;
    const len = alongX ? b.s[0] : b.s[2];
    const thick = alongX ? b.s[2] : b.s[0];
    const bottom = cy - b.s[1] / 2;
    const top = cy + b.s[1] / 2;
    // grime up the base on both faces (paint: only the wall's own voxels change)
    box([cx, bottom + 0.35, cz], alongX ? [len, 0.7, thick + 0.1] : [thick + 0.1, 0.7, len], grime, ShapeMode.Paint, Prog.Grime, [grime, 0.7, 0.75, 0]);
    for (const side of [1, -1]) {
      const off = thick / 2 + 0.025;
      const ox = alongX ? 0 : side * off;
      const oz = alongX ? side * off : 0;
      // conduit high up on one side in two, junction boxes along it (above any cover height)
      if (r() < 0.5 && top - bottom > 2.6) {
        const h = Math.min(top - 0.3, bottom + 2.7);
        box([cx + ox * 1.6, h, cz + oz * 1.6], alongX ? [len - 0.1, 0.05, 0.05] : [0.05, 0.05, len - 0.1], conduit);
        for (let s = -len / 2 + 0.8; s < len / 2 - 0.5; s += 2.5 + r() * 2) {
          const px = alongX ? cx + s : cx + ox * 2;
          const pz = alongX ? cz + oz * 2 : cz + s;
          box([px, h, pz], alongX ? [0.15, 0.15, 0.1] : [0.1, 0.15, 0.15], jbox);
        }
      }
      // electrical boxes, vents, signs every few metres (from 1.4 m up: clear of cover heights)
      for (let s = -len / 2 + 1; s < len / 2 - 1; s += 3 + r() * 3) {
        const k = r();
        const px = alongX ? cx + s : cx + ox * 1.9;
        const pz = alongX ? cz + oz * 1.9 : cz + s;
        if (k < 0.18) box([px, bottom + 1.6, pz], alongX ? [0.4, 0.55, 0.1] : [0.1, 0.55, 0.4], ebox);
        else if (k < 0.3 && top - bottom > 2.6) box([alongX ? px : cx + ox, bottom + 2.2, alongX ? cz + oz : pz], alongX ? [0.6, 0.3, 0.1] : [0.1, 0.3, 0.6], vent, ShapeMode.Paint);
        else if (k < 0.42) box([alongX ? px : cx + ox, bottom + 1.75, alongX ? cz + oz : pz], alongX ? [0.5, 0.35, 0.1] : [0.1, 0.35, 0.5], signs[Math.floor(r() * signs.length)]!, ShapeMode.Paint);
      }
    }
  }
  // floor lines: the walkway line by the factory floor, parking bays in the yard (paint on the slab's top)
  box([10, 0.02, -7.9], [27.5, 0.1, 0.1], line, ShapeMode.Paint);
  box([10, 0.02, -7.2], [27.5, 0.1, 0.1], line, ShapeMode.Paint);
  for (const x of [-6, -3, 0, 3, 6, 9, 12, 15]) box([x, -0.02, -25], [0.1, 0.1, 2.4], white, ShapeMode.Paint);
  // oil under the forklift, the press, the truck; scattered stains
  for (const [x, z, w, d] of [[-14.5, -11.4, 1.6, 2.2], [6, 1, 2.0, 1.4], [1.4, -22.5, 2.2, 1.8], [-3.5, -22.4, 2.0, 1.6], [21.2, 0.4, 1.4, 1.6]] as const) {
    box([x, 0.0, z], [w, 0.12, d], oil, ShapeMode.Paint, Prog.Rust, [oil, 1.6, 0.55, 0]);
  }
  return out;
}

export const warehouseArt: VoxelArt = {
  piece: (p, i, kind, pal) => piece(p, i, kind, pal),
  extra: (pal, boxes) => extra(pal, boxes),
};
