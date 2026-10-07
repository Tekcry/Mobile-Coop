/**
 * Voxel material programs (3.0 art layer, pure; evaluated per voxel in the chunk workers). A shape with a program
 * picks each voxel's palette entry (or carves it) from where the voxel sits: in the shape (local coordinates, the
 * distance to its faces and edges) and in the world (courses that line up across wall pieces, floor joints, noise
 * patches). Variants are consecutive palette entries from `base` (see `Palette.range`).
 *
 * Return: a palette index, 0 = carve (air), -1 = leave the voxel as it is (paint programs).
 */
export const enum Prog {
  None = 0,
  /** Concrete block wall: running bond 40 x 20 cm, mortar lines, block tones. p: [variants, mortar, course, length] */
  BlockWall = 1,
  /** Cast concrete: chipped edges, form lines, cloudy tone. p: [variants, chip %, line spacing, line entry] */
  Concrete = 2,
  /** Corrugated cladding over a concrete plinth: ribs (grooves carved above 4.4 m), rust streaks. p: [variants, plinth h, plinth entry, rust entry] */
  Cladding = 3,
  /** Planks: boards along the long side, gaps, battens on the edges. p: [variants, gap entry, board width, batten entry] */
  Planks = 4,
  /** Painted steel: worn edges, panel seams, rust low down. p: [variants, bare entry, seam spacing, rust entry] */
  Steel = 5,
  /** Hazard stripes (diagonal). p: [-, black entry, period, -] */
  Hazard = 6,
  /** Floor slab: saw-cut joints, stains, cloudy tone. p: [variants, joint entry, joint spacing, stain entry] */
  Floor = 7,
  /** Shrink-wrapped pallet loads: a wooden pallet at the bottom, straps, wrap tones. p: [variants, strap entry, -, pallet entry] */
  Wrap = 8,
  /** Paint: grime rising from the floor (darker), patchy. p: [grime entry, height, density, -] */
  Grime = 9,
  /** Paint: rust patches. p: [rust entry, scale, density, -] */
  Rust = 10,
  /** Pallet racking (a solid bay block): wrapped loads per bay, blue uprights at bay ends, orange beams. p: [variants, upright entry, bay length, beam entry] */
  Rack = 11,
}

/** Integer hash of a voxel / cell -> [0, 1). */
export function hash3(x: number, y: number, z: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Smooth 3D value noise (period-free; cells of 1). */
export function noise3(x: number, y: number, z: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const uz = fz * fz * (3 - 2 * fz);
  const l = (a: number, b: number, t: number): number => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number): number => hash3(ix + dx, iy + dy, iz + dz);
  return l(l(l(c(0, 0, 0), c(1, 0, 0), ux), l(c(0, 1, 0), c(1, 1, 0), ux), uy), l(l(c(0, 0, 1), c(1, 0, 1), ux), l(c(0, 1, 1), c(1, 1, 1), ux), uy), uz);
}

/** Two octaves. */
function fbm(x: number, y: number, z: number): number {
  return noise3(x, y, z) * 0.65 + noise3(x * 2.3 + 17, y * 2.3, z * 2.3 - 5) * 0.35;
}

const pickVariant = (base: number, k: number, r: number): number => base + Math.min(k - 1, Math.max(0, Math.floor(r * k)));

/**
 * @param l local position in the shape (x, y, z), h its half extents, w the world position of the voxel centre,
 *   s the voxel size, cur the voxel's current entry (paint programs)
 */
export function runProgram(
  prog: number,
  base: number,
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  lx: number,
  ly: number,
  lz: number,
  hx: number,
  hy: number,
  hz: number,
  wx: number,
  wy: number,
  wz: number,
  s: number,
  cur: number,
): number {
  const k = Math.max(1, p0 | 0);
  // distances to the faces (in voxels: a face voxel is < 1)
  const dx = (hx - Math.abs(lx)) / s;
  const dy = (hy - Math.abs(ly)) / s;
  const dz = (hz - Math.abs(lz)) / s;
  const vx = Math.floor(wx / s);
  const vy = Math.floor(wy / s);
  const vz = Math.floor(wz / s);
  // the long horizontal axis (courses, boards, ribs run along it)
  const alongX = hx >= hz;
  const u = alongX ? wx : wz;
  switch (prog) {
    case Prog.BlockWall: {
      const course = p2 || 0.2;
      const len = p3 || 0.4;
      const row = Math.floor(wy / course);
      const off = (row & 1) * 0.5 * len;
      const col = Math.floor((u + off) / len);
      const fu = u + off - col * len;
      const fv = wy - row * course;
      if (fu < s * 0.99 || fv < s * 0.99) return p1 | 0;
      // a chipped block corner now and then: darker, never carved (cover faces stay within 3 cm of the blockout)
      if ((alongX ? dz : dx) < 1 && fu > len - s * 1.01 && fv > course - s * 1.01 && hash3(col, row, 7) < 0.18) return p1 | 0;
      return pickVariant(base, k, hash3(col, row, alongX ? Math.round(wz * 2) : Math.round(wx * 2)));
    }
    case Prog.Concrete: {
      const near = (dx < 1 ? 1 : 0) + (dy < 1 ? 1 : 0) + (dz < 1 ? 1 : 0);
      if (near >= 2 && hash3(vx, vy, vz) < (p1 || 0) / 100) return 0;
      const spacing = p2 || 1.2;
      if (p3 && wy - Math.floor(wy / spacing) * spacing < s * 0.99 && near >= 1) return p3 | 0;
      return pickVariant(base, k, fbm(wx * 0.9, wy * 0.9, wz * 0.9));
    }
    case Prog.Cladding: {
      const bottom = ly + hy;
      if (p1 > 0 && p2 && bottom < p1) {
        const near = (dx < 1 ? 1 : 0) + (dy < 1 ? 1 : 0) + (dz < 1 ? 1 : 0);
        if (near >= 2 && hash3(vx, vy, vz) < 0.15) return 0;
        return p2 | 0;
      }
      // ribs: every third voxel along the wall is a groove on both faces - carved above 4.4 m (over a mezzanine's
      // cover heights too), below it only a darker line, so cover faces stay within 3 cm of the blockout
      const thin = alongX ? dz : dx;
      if (thin < 1 && ((alongX ? vx : vz) % 3 + 3) % 3 === 0) return bottom > 4.4 ? 0 : base + k - 1;
      // rust streaks: narrow vertical runs, longer near the top and the bottom of the sheets
      const streak = noise3(u * 3.1, wy * 0.35, (alongX ? wz : wx) * 3.1);
      if (p3 && streak > 0.74) return p3 | 0;
      return pickVariant(base, k, fbm(u * 0.6, wy * 0.6, 3));
    }
    case Prog.Planks: {
      const w = p2 || 0.15;
      const near = (dx < 1 ? 1 : 0) + (dy < 1 ? 1 : 0) + (dz < 1 ? 1 : 0);
      if (p3 && near >= 2) return p3 | 0;
      const board = Math.floor(wy / w);
      if (wy - board * w < s * 0.99 && p1 && near >= 1) return p1 | 0;
      return pickVariant(base, k, hash3(board, alongX ? Math.round(wz * 4) : Math.round(wx * 4), 3));
    }
    case Prog.Steel: {
      const near = (dx < 1 ? 1 : 0) + (dy < 1 ? 1 : 0) + (dz < 1 ? 1 : 0);
      if (p1 && near >= 2 && hash3(vx, vy, vz) < 0.55) return p1 | 0;
      const sp = p2 || 0;
      // panel seams: the darkest variant
      if (sp && near >= 1 && u - Math.floor(u / sp) * sp < s * 0.99) return base + k - 1;
      if (p3 && ly + hy < 0.45 && fbm(wx * 2, wy * 2, wz * 2) > 0.6) return p3 | 0;
      return pickVariant(base, k, fbm(wx * 1.3, wy * 1.3, wz * 1.3));
    }
    case Prog.Hazard: {
      const period = p2 || 0.3;
      const t = (u + wy) / period;
      return (Math.floor(t) & 1) === 0 ? base : p1 | 0;
    }
    case Prog.Floor: {
      const sp = p2 || 4;
      if (p1 && (wx - Math.floor(wx / sp) * sp < s * 0.99 || wz - Math.floor(wz / sp) * sp < s * 0.99)) return p1 | 0;
      if (p3 && fbm(wx * 0.35, 0, wz * 0.35) > 0.66) return p3 | 0;
      return pickVariant(base, k, fbm(wx * 0.5, wy, wz * 0.5));
    }
    case Prog.Wrap: {
      const bottom = ly + hy;
      if (bottom < 0.15) return p3 && hash3(Math.floor(u / 0.12), 0, 0) < 0.8 ? p3 | 0 : 0;
      if (p1 && bottom - Math.floor(bottom / 0.5) * 0.5 < s * 0.99) return p1 | 0;
      return pickVariant(base, k, fbm(wx * 2.2, wy * 2.2, wz * 2.2));
    }
    case Prog.Grime: {
      if (!cur) return -1;
      const h = Math.max(0.01, p1 || 0.6);
      const t = 1 - Math.min(1, Math.max(0, ly + hy) / h);
      return fbm(wx * 3, wy * 3, wz * 3) < (p2 || 0.6) * t ? p0 | 0 : -1;
    }
    case Prog.Rust: {
      if (!cur) return -1;
      const sc = p1 || 2;
      return fbm(wx * sc, wy * sc, wz * sc) > 1 - (p2 || 0.3) ? p0 | 0 : -1;
    }
    case Prog.Rack: {
      const bay = p2 || 2.7;
      const fu = u - Math.floor(u / bay) * bay;
      // uprights at the bay ends, beams at 1.0 / 2.0 m (flush with the faces: the block is the cover)
      if (p1 && fu < 0.1) return p1 | 0;
      const bottom = ly + hy;
      if (p3 && (Math.abs(bottom - 1.0) < 0.06 || Math.abs(bottom - 2.0) < 0.06 || bottom > 2.72)) return p3 | 0;
      // the loads: a pallet under each, wrapped above
      const level = bottom < 1 ? bottom : bottom < 2 ? bottom - 1 : bottom - 2;
      if (level < 0.12) return base + k - 1;
      const bayI = Math.floor(u / bay);
      return pickVariant(base, Math.max(1, k - 1), (hash3(bayI, Math.floor(bottom), 5) + fbm(wx * 2, wy * 2, wz * 2) * 0.3) / 1.3);
    }
    default:
      return base;
  }
}
