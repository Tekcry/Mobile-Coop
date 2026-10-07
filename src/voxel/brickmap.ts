/**
 * Sparse brickmap (3.0 voxels, pure): the world as voxels of `size` metres, stored as 8 x 8 x 8 bricks. A brick is
 * empty, uniform (one material, no storage: the inside of a wall or a slab) or explicit (512 palette bytes in a
 * growable pool). One structure serves meshing, the GPU lookup the voxel material reads, ray tracing and (later)
 * edits. Voxel value 0 is air; 1..255 index the palette.
 */
export const BRICK = 8;
export const BRICK_VOXELS = BRICK * BRICK * BRICK;

/** `index` codes: >= 0 an explicit brick's pool slot; EMPTY; <= UNIFORM_BASE a uniform brick of (UNIFORM_BASE - code). */
export const EMPTY = -1;
export const UNIFORM_BASE = -2;

export class Brickmap {
  /** Brick grid dimensions. */
  readonly bx: number;
  readonly by: number;
  readonly bz: number;
  /** Per brick: EMPTY, a uniform material code or a pool slot. */
  readonly index: Int32Array;
  pool: Uint8Array;
  slots = 0;

  /**
   * @param origin world position of voxel (0, 0, 0)'s minimum corner (keep it on the brick grid of the parent map)
   * @param size voxel edge (m)
   * @param dims voxel counts per axis (rounded up to whole bricks)
   */
  constructor(
    readonly origin: readonly [number, number, number],
    readonly size: number,
    dims: readonly [number, number, number],
  ) {
    this.bx = Math.max(1, Math.ceil(dims[0] / BRICK));
    this.by = Math.max(1, Math.ceil(dims[1] / BRICK));
    this.bz = Math.max(1, Math.ceil(dims[2] / BRICK));
    this.index = new Int32Array(this.bx * this.by * this.bz).fill(EMPTY);
    this.pool = new Uint8Array(BRICK_VOXELS * 64);
  }

  /** Voxel counts per axis (whole bricks). */
  get nx(): number {
    return this.bx * BRICK;
  }
  get ny(): number {
    return this.by * BRICK;
  }
  get nz(): number {
    return this.bz * BRICK;
  }

  brickIndex(bx: number, by: number, bz: number): number {
    return bx + this.bx * (by + this.by * bz);
  }

  inside(x: number, y: number, z: number): boolean {
    return x >= 0 && y >= 0 && z >= 0 && x < this.nx && y < this.ny && z < this.nz;
  }

  /** Palette index at a voxel (0 = air; outside the map = air). */
  get(x: number, y: number, z: number): number {
    if (!this.inside(x, y, z)) return 0;
    const code = this.index[this.brickIndex(x >> 3, y >> 3, z >> 3)]!;
    if (code === EMPTY) return 0;
    if (code <= UNIFORM_BASE) return UNIFORM_BASE - code;
    return this.pool[code * BRICK_VOXELS + (x & 7) + ((y & 7) << 3) + ((z & 7) << 6)]!;
  }

  /** Make a brick explicit (allocating its slot; a uniform brick is expanded) and return its slot. */
  explicit(bi: number): number {
    const code = this.index[bi]!;
    if (code >= 0) return code;
    const slot = this.slots++;
    if ((slot + 1) * BRICK_VOXELS > this.pool.length) {
      const grown = new Uint8Array(this.pool.length * 2);
      grown.set(this.pool);
      this.pool = grown;
    }
    this.pool.fill(code <= UNIFORM_BASE ? UNIFORM_BASE - code : 0, slot * BRICK_VOXELS, (slot + 1) * BRICK_VOXELS);
    this.index[bi] = slot;
    return slot;
  }

  set(x: number, y: number, z: number, v: number): void {
    if (!this.inside(x, y, z)) return;
    const bi = this.brickIndex(x >> 3, y >> 3, z >> 3);
    const code = this.index[bi]!;
    if (code === EMPTY && v === 0) return;
    if (code <= UNIFORM_BASE && UNIFORM_BASE - code === v) return;
    const slot = this.explicit(bi);
    this.pool[slot * BRICK_VOXELS + (x & 7) + ((y & 7) << 3) + ((z & 7) << 6)] = v;
  }

  /** A whole brick to one material (0 = empty); an explicit brick keeps its slot (now uniform data). */
  fillBrick(bx: number, by: number, bz: number, v: number): void {
    const bi = this.brickIndex(bx, by, bz);
    const code = this.index[bi]!;
    if (code >= 0) {
      this.pool.fill(v, code * BRICK_VOXELS, (code + 1) * BRICK_VOXELS);
      return;
    }
    this.index[bi] = v === 0 ? EMPTY : UNIFORM_BASE - v;
  }

  /**
   * Explicit bricks whose voxels are all the same go back to uniform / empty (their slots are left unused; `compact`
   * repacks the pool). Returns how many were folded.
   */
  fold(): number {
    let n = 0;
    for (let bi = 0; bi < this.index.length; bi++) {
      const code = this.index[bi]!;
      if (code < 0) continue;
      const o = code * BRICK_VOXELS;
      const v = this.pool[o]!;
      let same = true;
      for (let k = 1; k < BRICK_VOXELS; k++) {
        if (this.pool[o + k] !== v) {
          same = false;
          break;
        }
      }
      if (same) {
        this.index[bi] = v === 0 ? EMPTY : UNIFORM_BASE - v;
        n++;
      }
    }
    if (n) this.compact();
    return n;
  }

  /** Repack the pool so explicit bricks use slots 0..slots-1 in brick order. */
  compact(): void {
    let next = 0;
    const out = new Uint8Array(Math.max(BRICK_VOXELS, this.pool.length));
    for (let bi = 0; bi < this.index.length; bi++) {
      const code = this.index[bi]!;
      if (code < 0) continue;
      out.set(this.pool.subarray(code * BRICK_VOXELS, (code + 1) * BRICK_VOXELS), next * BRICK_VOXELS);
      this.index[bi] = next++;
    }
    this.pool = out;
    this.slots = next;
  }

  /** Counts: explicit, uniform and empty bricks. */
  stats(): { explicit: number; uniform: number; empty: number; bytes: number } {
    let explicit = 0;
    let uniform = 0;
    let empty = 0;
    for (let bi = 0; bi < this.index.length; bi++) {
      const c = this.index[bi]!;
      if (c >= 0) explicit++;
      else if (c === EMPTY) empty++;
      else uniform++;
    }
    return { explicit, uniform, empty, bytes: this.index.byteLength + this.slots * BRICK_VOXELS };
  }

  /** World position of a voxel's centre. */
  centre(x: number, y: number, z: number, out: [number, number, number]): [number, number, number] {
    out[0] = this.origin[0] + (x + 0.5) * this.size;
    out[1] = this.origin[1] + (y + 0.5) * this.size;
    out[2] = this.origin[2] + (z + 0.5) * this.size;
    return out;
  }
}
