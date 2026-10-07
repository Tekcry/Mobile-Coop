/**
 * The level as voxels (3.0, pure): which blockout pieces become voxels, their palette and the map's voxel grid.
 * Pieces thinner than 1.5 voxels (ladder rails, rungs, cables, boards, thin pipes, floor lines) stay meshes until
 * the art layer models them at prop resolution; collision never changes (it is the blockout's).
 */
import type { BoxPiece, CylPiece } from '../world/levelBuilder';
import { surfaceAt, type Surface, type SurfaceArea } from '../world/surfaces';
import { pieceKind } from '../world/surfaceKinds';
import { SURFACE_ID } from '../world/surfaceAtlas';
import { BRICK } from './brickmap';
import { ShapeMode, type VoxelShape } from './shapes';
import type { Prog } from './programs';

/**
 * A map's voxel art layer (3.0): what each blockout piece's voxels look like (a material program and its
 * parameters, `programs.ts`) and extra visual-only shapes (dressing, paint) added after the pieces. It never
 * touches the blockout, so collision, cover, ledges and nav stay exactly the same (`tests/voxelFit.test.ts`).
 */
export interface VoxelArt {
  piece?(p: BoxPiece | CylPiece, index: number, kind: 'box' | 'cyl', pal: Palette, mat: number): { mat?: number; prog: Prog; params: readonly number[]; fine?: boolean } | null;
  extra?(pal: Palette, boxes: readonly BoxPiece[], cylinders: readonly CylPiece[]): VoxelShape[];
}

/** Voxels per chunk side at the finest level (coarser levels: the same world extent, fewer voxels). */
export const CHUNK = 128;
/** Voxel data format version (bump to invalidate caches). */
export const VOXEL_VERSION = 3;

export interface PaletteEntry {
  /** Authored colour (#rrggbb, sRGB). */
  color: string;
  /** Surface kind (`SURFACE_KINDS` index): micro detail, roughness, metallic. */
  kind: number;
  /** Self-lit (0..1): lamp fixtures and screens in the art layer. */
  emissive: number;
  /** A low spot that holds water: mirror-like when it rains. */
  puddle?: boolean;
}

export interface LevelVoxels {
  shapes: VoxelShape[];
  /** Index 0 is air. */
  palette: PaletteEntry[];
  /** Per box / cylinder: rendered as voxels (else it stays a mesh piece). */
  voxelBox: boolean[];
  voxelCyl: boolean[];
  /** Voxel (0, 0, 0)'s minimum corner (on the chunk grid) and voxel counts (whole chunks). */
  origin: [number, number, number];
  dims: [number, number, number];
  size: number;
  /** The finer layer (props, furniture, machines, vehicles, thin pieces), when there is one. */
  fine?: LevelVoxels;
}

/** A piece is voxelised when every side is at least this many voxels. */
export const MIN_VOXELS = 1.5;

export class Palette {
  readonly entries: PaletteEntry[] = [{ color: '#000000', kind: 0, emissive: 0 }];
  private map = new Map<string, number>();

  /** The palette index for a colour / kind (up to 255 entries; past that the nearest colour of the kind). */
  get(color: string, kind: number, emissive = 0, puddle = false): number {
    const key = `${color.toLowerCase()}|${kind}|${emissive}|${puddle ? 1 : 0}`;
    const hit = this.map.get(key);
    if (hit !== undefined) return hit;
    if (this.entries.length >= 256) return this.nearest(color, kind);
    const i = this.entries.length;
    this.entries.push({ color: color.toLowerCase(), kind, emissive, ...(puddle ? { puddle } : {}) });
    this.map.set(key, i);
    return i;
  }

  /**
   * Consecutive entries for a set of colours (a program's variants: base, base + 1, ...). Returns the first index;
   * the same set again returns the same range. When the palette is full: the nearest single entry (`ok` false).
   */
  range(colors: readonly string[], kind: number, emissive = 0): { base: number; ok: boolean } {
    const key = `range|${colors.join(',').toLowerCase()}|${kind}|${emissive}`;
    const hit = this.map.get(key);
    if (hit !== undefined) return { base: hit, ok: true };
    if (this.entries.length + colors.length > 256) return { base: this.nearest(colors[0] ?? '#808080', kind), ok: false };
    const base = this.entries.length;
    for (const c of colors) this.entries.push({ color: c.toLowerCase(), kind, emissive });
    this.map.set(key, base);
    return { base, ok: true };
  }

  private nearest(color: string, kind: number): number {
    const c = parseInt(color.slice(1, 7), 16);
    let best = 1;
    let bd = Infinity;
    for (let i = 1; i < this.entries.length; i++) {
      const e = this.entries[i]!;
      const d0 = parseInt(e.color.slice(1, 7), 16);
      const d = Math.abs(((c >> 16) & 255) - ((d0 >> 16) & 255)) + Math.abs(((c >> 8) & 255) - ((d0 >> 8) & 255)) + Math.abs((c & 255) - (d0 & 255)) + (e.kind === kind ? 0 : 200);
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    return best;
  }
}

/** Shape bounds (min x, y, z, max x, y, z): rotated boxes by their circumscribed cube. */
function boundsOf(x: VoxelShape): [number, number, number, number, number, number] {
  if (x.kind === 'box') {
    // the rotated box's exact extent per axis (pitch about X, then yaw about Y)
    const [hx, hy, hz] = [x.s[0] / 2, x.s[1] / 2, x.s[2] / 2];
    const cy = Math.cos(x.yaw);
    const sy = Math.sin(x.yaw);
    const cp = Math.cos(x.pitch);
    const sp = Math.sin(x.pitch);
    const ex = Math.abs(cy) * hx + Math.abs(sy * sp) * hy + Math.abs(sy * cp) * hz;
    const ey = Math.abs(cp) * hy + Math.abs(sp) * hz;
    const ez = Math.abs(sy) * hx + Math.abs(cy * sp) * hy + Math.abs(cy * cp) * hz;
    return [x.c[0] - ex, x.c[1] - ey, x.c[2] - ez, x.c[0] + ex, x.c[1] + ey, x.c[2] + ez];
  }
  return [x.c[0] - x.r, x.c[1] - x.h / 2, x.c[2] - x.r, x.c[0] + x.r, x.c[1] + x.h / 2, x.c[2] + x.r];
}

/** The grid round a shape list: whole chunks, voxel (0,0,0) on the brick grid of `size` (so coarser levels nest). */
function gridOf(shapes: readonly VoxelShape[], size: number): { origin: [number, number, number]; dims: [number, number, number] } {
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (const x of shapes) {
    // only what adds voxels sizes the grid (paint and carve volumes may be loose)
    if (x.mode !== undefined && x.mode !== ShapeMode.Fill) continue;
    const b = boundsOf(x);
    for (let a = 0; a < 3; a++) {
      lo[a] = Math.min(lo[a]!, b[a]!);
      hi[a] = Math.max(hi[a]!, b[a + 3]!);
    }
  }
  if (lo[0] === Infinity) {
    lo[0] = lo[1] = lo[2] = 0;
    hi[0] = hi[1] = hi[2] = 1;
  }
  const chunk = CHUNK * size;
  const brick = BRICK * size;
  const origin: [number, number, number] = [Math.floor(lo[0]! / brick) * brick, Math.floor(lo[1]! / brick) * brick, Math.floor(lo[2]! / brick) * brick];
  const dims = [0, 1, 2].map((a) => Math.max(1, Math.ceil((hi[a]! - origin[a]!) / chunk)) * CHUNK) as [number, number, number];
  return { origin, dims };
}

/**
 * Split the blockout into voxel shapes + mesh pieces, build the palette and the map's voxel grid at `size`. With an
 * art layer that marks pieces `fine` and a `fineSize`, those pieces (props, furniture, machines, vehicles) form a
 * second, finer layer (`fine`, 2.5 cm at Epic) with the same palette.
 */
export function levelVoxels(boxes: readonly BoxPiece[], cylinders: readonly CylPiece[], surfaces: readonly SurfaceArea[], floor: Surface, size: number, palette = new Palette(), art: VoxelArt | null = null, fineSize = 0): LevelVoxels {
  const min = size * MIN_VOXELS;
  const fineMin = fineSize * MIN_VOXELS;
  const kindOf = (hex: string, sx: number, sy: number, sz: number, cx: number, top: number, cz: number): number =>
    SURFACE_ID[pieceKind(hex, sx, sy, sz, sy <= 0.35 ? surfaceAt(surfaces, cx, top, cz, floor) : null)];
  const shapes: VoxelShape[] = [];
  const fine: VoxelShape[] = [];
  const voxelBox = boxes.map((b, i) => {
    if (b.visible === false) return false;
    const thin = Math.min(b.s[0], b.s[1], b.s[2]);
    if (thin < (fineSize ? Math.min(min, fineMin) : min)) return false;
    const mat = palette.get(b.color, kindOf(b.color, b.s[0], b.s[1], b.s[2], b.c[0], b.c[1] + b.s[1] / 2, b.c[2]));
    const look = art?.piece?.(b, i, 'box', palette, mat) ?? null;
    const toFine = !!fineSize && (!!look?.fine || thin < min);
    if (toFine && thin < fineMin) return false;
    (toFine ? fine : shapes).push({ kind: 'box', c: b.c, s: b.s, yaw: b.yaw, pitch: b.pitch, mat: look?.mat ?? mat, prog: look?.prog, params: look?.params });
    return true;
  });
  const voxelCyl = cylinders.map((c, i) => {
    const thin = Math.min(c.r * 2, c.h);
    if (thin < (fineSize ? Math.min(min, fineMin) : min)) return false;
    const mat = palette.get(c.color, kindOf(c.color, c.r * 2, c.h, c.r * 2, c.c[0], c.c[1] + c.h / 2, c.c[2]));
    const look = art?.piece?.(c, i, 'cyl', palette, mat) ?? null;
    const toFine = !!fineSize && (!!look?.fine || thin < min);
    if (toFine && thin < fineMin) return false;
    (toFine ? fine : shapes).push({ kind: 'cyl', c: c.c, r: c.r, h: c.h, mat: look?.mat ?? mat, prog: look?.prog, params: look?.params });
    return true;
  });
  // the art layer's dressing and paint (fine ones on the fine layer)
  for (const x of art?.extra?.(palette, boxes, cylinders) ?? []) (fineSize && x.fine ? fine : shapes).push(x);
  const g = gridOf(shapes, size);
  const out: LevelVoxels = { shapes, palette: palette.entries, voxelBox, voxelCyl, origin: g.origin, dims: g.dims, size };
  if (fineSize && fine.length) {
    const gf = gridOf(fine, fineSize);
    out.fine = { shapes: fine, palette: palette.entries, voxelBox, voxelCyl, origin: gf.origin, dims: gf.dims, size: fineSize };
  }
  return out;
}

/** Chunk grid counts per axis for a level. */
export function chunkCounts(lv: Pick<LevelVoxels, 'dims'>): [number, number, number] {
  return [lv.dims[0] / CHUNK, lv.dims[1] / CHUNK, lv.dims[2] / CHUNK];
}
