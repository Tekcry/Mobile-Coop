import { Color3, Constants, Mesh, PBRMaterial, RawTexture, RawTexture3D, Texture, VertexData, type Scene } from '../core/babylon';
import type { SurfaceAtlas } from '../world/surfaceAtlas';
import { BRICK, BRICK_VOXELS, Brickmap, EMPTY, UNIFORM_BASE } from './brickmap';
import type { ChunkJob, ChunkResult } from './chunk';
import { CHUNK, chunkCounts, type LevelVoxels } from './levelVoxels';
import { packShapes, SHAPE_STRIDE, shapeBounds } from './shapes';
import { VoxelPlugin, type VoxelTextures } from './voxelPlugin';
import { WorkerPool } from './workerPool';
import { loadVoxelCache, saveVoxelCache } from './voxelCache';

export interface VoxelWorldOptions {
  name: string;
  atlas: SurfaceAtlas | null;
  /** Levels of detail (1..3): level l has voxels 2^l times the base size. */
  levels: number;
  /** Camera distance (m) where level 1 / level 2 take over. */
  lodDist: [number, number];
  ao: boolean;
  micro: boolean;
  /** IndexedDB cache key (null: no cache). */
  cacheKey: string | null;
}

interface Chunk {
  /** World AABB. */
  min: [number, number, number];
  max: [number, number, number];
  lods: (Mesh | null)[];
  shown: number;
}

/** Slots per pool layer (64 x 64 bricks of 8^3 texels: a 512 x 512 x 8 slab). */
const POOL_ROW = 64;

/**
 * The level's voxels on the GPU (3.0): chunk meshes per level of detail (built by the worker pool, or the cache),
 * the brickmap the material reads per pixel, and the level-of-detail switch per chunk by camera distance.
 */
export class VoxelWorld {
  readonly meshes: Mesh[] = [];
  readonly materials: PBRMaterial[] = [];
  readonly plugins: VoxelPlugin[] = [];
  readonly brickmap: Brickmap;
  private chunks: Chunk[] = [];
  private textures: (RawTexture | RawTexture3D)[] = [];
  private lodT = 0;
  stats = { chunks: 0, quads: 0, explicit: 0, uniform: 0, bytes: 0, ms: 0, cached: false, workers: 0 };

  private constructor(
    readonly lv: LevelVoxels,
    private opts: VoxelWorldOptions,
  ) {
    this.brickmap = new Brickmap(lv.origin, lv.size, lv.dims);
  }

  /** Build the level's voxels (workers; the cache when it has them). */
  static async build(scene: Scene, lv: LevelVoxels, opts: VoxelWorldOptions): Promise<VoxelWorld> {
    const t0 = performance.now();
    const w = new VoxelWorld(lv, opts);
    const [cx, cy, cz] = chunkCounts(lv);
    const levels = Math.max(1, Math.min(3, opts.levels));
    let results = opts.cacheKey ? await loadVoxelCache(opts.cacheKey) : null;
    w.stats.cached = !!results;
    if (!results) {
      const packed = packShapes(lv.shapes);
      const n = packed.length / SHAPE_STRIDE;
      const bb: number[][] = [];
      for (let i = 0; i < n; i++) bb.push(shapeBounds(packed, i));
      const jobs: ChunkJob[] = [];
      for (let l = 0; l < levels; l++) {
        const size = lv.size * (1 << l);
        const vn = CHUNK >> l;
        const ext = CHUNK * lv.size;
        for (let z = 0; z < cz; z++) {
          for (let y = 0; y < cy; y++) {
            for (let x = 0; x < cx; x++) {
              const ox = lv.origin[0] + x * ext;
              const oy = lv.origin[1] + y * ext;
              const oz = lv.origin[2] + z * ext;
              // shapes touching the chunk plus its apron (in order: later shapes win)
              const pick: number[] = [];
              for (let i = 0; i < n; i++) {
                const b = bb[i]!;
                if (b[3]! < ox - size || b[0]! > ox + ext + size || b[4]! < oy - size || b[1]! > oy + ext + size || b[5]! < oz - size || b[2]! > oz + ext + size) continue;
                pick.push(i);
              }
              if (!pick.length) continue;
              const shapes = new Float32Array(pick.length * SHAPE_STRIDE);
              pick.forEach((i, k) => shapes.set(packed.subarray(i * SHAPE_STRIDE, (i + 1) * SHAPE_STRIDE), k * SHAPE_STRIDE));
              jobs.push({ id: (l * cz + z) * cy * cx + y * cx + x, origin: [ox, oy, oz], size, n: [vn, vn, vn], shapes, bricks: l === 0 });
            }
          }
        }
      }
      const pool = new WorkerPool();
      w.stats.workers = pool.size;
      try {
        results = await Promise.all(jobs.map((j) => pool.run(j)));
      } finally {
        pool.dispose();
      }
      if (opts.cacheKey) void saveVoxelCache(opts.cacheKey, results);
    }
    w.assemble(scene, results, levels, cx, cy, cz);
    w.stats.ms = performance.now() - t0;
    return w;
  }

  private assemble(scene: Scene, results: ChunkResult[], levels: number, cx: number, cy: number, cz: number): void {
    const lv = this.lv;
    const bm = this.brickmap;
    const per = CHUNK / BRICK;
    // chunks (AABBs) and the brickmap from level 0
    const nChunks = cx * cy * cz;
    const ext = CHUNK * lv.size;
    for (let i = 0; i < nChunks; i++) {
      const x = i % cx;
      const y = Math.floor(i / cx) % cy;
      const z = Math.floor(i / (cx * cy));
      const min: [number, number, number] = [lv.origin[0] + x * ext, lv.origin[1] + y * ext, lv.origin[2] + z * ext];
      this.chunks.push({ min, max: [min[0] + ext, min[1] + ext, min[2] + ext], lods: [null, null, null], shown: -1 });
    }
    for (const r of results) {
      const l = Math.floor(r.id / nChunks);
      const ci = r.id - l * nChunks;
      if (r.codes && r.data) {
        const x = ci % cx;
        const y = Math.floor(ci / cx) % cy;
        const z = Math.floor(ci / (cx * cy));
        for (let k = 0; k < r.codes.length; k++) {
          const code = r.codes[k]!;
          const bx = x * per + (k % per);
          const by = y * per + (Math.floor(k / per) % per);
          const bz = z * per + Math.floor(k / (per * per));
          const bi = bm.brickIndex(bx, by, bz);
          if (code >= 0) {
            const slot = bm.explicit(bi);
            bm.pool.set(r.data.subarray(code * BRICK_VOXELS, (code + 1) * BRICK_VOXELS), slot * BRICK_VOXELS);
          } else bm.index[bi] = code;
        }
      }
      if (!r.mesh.quads) continue;
      this.stats.quads += r.mesh.quads;
      const m = new Mesh(`vox-${this.opts.name}-${l}-${ci}`, scene);
      const vd = new VertexData();
      vd.positions = r.mesh.positions;
      vd.normals = r.mesh.normals;
      vd.indices = r.mesh.indices;
      vd.applyToMesh(m, false);
      m.isPickable = false;
      m.receiveShadows = true;
      m.freezeWorldMatrix();
      m.doNotSyncBoundingInfo = true;
      m.setEnabled(l === 0);
      this.chunks[ci]!.lods[l] = m;
      this.meshes.push(m);
    }
    this.stats.chunks = this.chunks.filter((c) => c.lods.some(Boolean)).length;
    const st = bm.stats();
    this.stats.explicit = st.explicit;
    this.stats.uniform = st.uniform;
    this.stats.bytes = st.bytes;
    const tex = this.uploadTextures(scene);
    for (let l = 0; l < levels; l++) {
      const mat = new PBRMaterial(`voxMat-${this.opts.name}-${l}`, scene);
      mat.albedoColor = Color3.White();
      mat.metallic = 0;
      mat.roughness = 1;
      // the game's lights are tuned to range falloff; PBR divides diffuse by pi (lights authored for standard)
      mat.usePhysicalLightFalloff = false;
      mat.directIntensity = Math.PI;
      mat.environmentIntensity = 0.6;
      mat.realTimeFiltering = true;
      const plugin = new VoxelPlugin(mat, tex, this.opts.atlas, 1 << l, this.opts.ao && l === 0, this.opts.micro && l < 2);
      this.plugins.push(plugin);
      this.materials.push(mat);
      mat.freeze();
    }
    for (const c of this.chunks) c.lods.forEach((m, l) => m && (m.material = this.materials[l]!));
  }

  /** Indirection (RGBA8 per brick), brick pool (R8, 512 x 512 x 8n) and palette (RGBA8 256 x 1) textures. */
  private uploadTextures(scene: Scene): VoxelTextures {
    const bm = this.brickmap;
    bm.compact();
    const ind = new Uint8Array(bm.index.length * 4);
    for (let i = 0; i < bm.index.length; i++) {
      const c = bm.index[i]!;
      if (c === EMPTY) continue;
      if (c <= UNIFORM_BASE) {
        ind[i * 4] = UNIFORM_BASE - c;
        ind[i * 4 + 3] = 254;
      } else {
        ind[i * 4] = c & 255;
        ind[i * 4 + 1] = (c >> 8) & 255;
        ind[i * 4 + 2] = (c >> 16) & 255;
        ind[i * 4 + 3] = 255;
      }
    }
    const nearest = Texture.NEAREST_SAMPLINGMODE;
    const index = new RawTexture3D(ind, bm.bx, bm.by, bm.bz, Constants.TEXTUREFORMAT_RGBA, scene, false, false, nearest, Constants.TEXTURETYPE_UNSIGNED_BYTE);
    const layers = Math.max(1, Math.ceil(bm.slots / (POOL_ROW * POOL_ROW)));
    const W = POOL_ROW * BRICK;
    const poolData = new Uint8Array(W * W * layers * BRICK);
    for (let s = 0; s < bm.slots; s++) {
      const sx = (s % POOL_ROW) * BRICK;
      const sy = (Math.floor(s / POOL_ROW) % POOL_ROW) * BRICK;
      const sz = Math.floor(s / (POOL_ROW * POOL_ROW)) * BRICK;
      const o = s * BRICK_VOXELS;
      for (let z = 0; z < BRICK; z++) {
        for (let y = 0; y < BRICK; y++) {
          const dst = sx + W * (sy + y + W * (sz + z));
          poolData.set(bm.pool.subarray(o + (y << 3) + (z << 6), o + (y << 3) + (z << 6) + BRICK), dst);
        }
      }
    }
    const pool = new RawTexture3D(poolData, W, W, layers * BRICK, Constants.TEXTUREFORMAT_R, scene, false, false, nearest, Constants.TEXTURETYPE_UNSIGNED_BYTE);
    const pal = new Uint8Array(256 * 4);
    this.lv.palette.forEach((e, i) => {
      const n = parseInt(e.color.slice(1, 7), 16);
      pal[i * 4] = (n >> 16) & 255;
      pal[i * 4 + 1] = (n >> 8) & 255;
      pal[i * 4 + 2] = n & 255;
      pal[i * 4 + 3] = (e.kind & 15) + 16 * Math.round(Math.max(0, Math.min(1, e.emissive)) * 15);
    });
    const palette = new RawTexture(pal, 256, 1, Constants.TEXTUREFORMAT_RGBA, scene, false, false, nearest, Constants.TEXTURETYPE_UNSIGNED_BYTE);
    for (const t of [index, pool, palette]) {
      t.wrapU = t.wrapV = Texture.CLAMP_ADDRESSMODE;
      this.textures.push(t);
    }
    this.stats.bytes = ind.byteLength + poolData.byteLength + pal.byteLength;
    return { index, pool, palette, origin: [...this.lv.origin], size: this.lv.size, bricks: [bm.bx, bm.by, bm.bz], sky: null, skyOrigin: [0, 0, 0], skyCell: 0, skyDims: [1, 1, 1] };
  }

  /** Level of detail per chunk by camera distance (a few times a second). */
  frame(dt: number, x: number, y: number, z: number): void {
    this.lodT -= dt;
    if (this.lodT > 0) return;
    this.lodT = 0.2;
    const [d1, d2] = this.opts.lodDist;
    for (const c of this.chunks) {
      if (!c.lods[0] && !c.lods[1] && !c.lods[2]) continue;
      const dx = Math.max(c.min[0] - x, 0, x - c.max[0]);
      const dy = Math.max(c.min[1] - y, 0, y - c.max[1]);
      const dz = Math.max(c.min[2] - z, 0, z - c.max[2]);
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      let want = d < d1 ? 0 : d < d2 ? 1 : 2;
      // a level a chunk lacks (no faces there, or not built): the nearest finer one
      while (want > 0 && !c.lods[want]) want--;
      if (want === c.shown) continue;
      c.shown = want;
      c.lods.forEach((m, l) => m?.setEnabled(l === want));
    }
  }

  setLodDistances(d1: number, d2: number): void {
    this.opts.lodDist = [d1, d2];
    this.lodT = 0;
  }

  /** Rain on the voxels (0..1). */
  setWet(w: number): void {
    for (const p of this.plugins) p.wet = w;
    for (const m of this.materials) {
      m.unfreeze();
      m.markAsDirty(1);
      m.freeze();
    }
  }

  /** Re-bind after the surface atlas changes size. */
  refresh(): void {
    for (const m of this.materials) {
      m.unfreeze();
      m.markAsDirty(1);
      m.freeze();
    }
  }

  dispose(): void {
    for (const m of this.meshes) m.dispose();
    for (const m of this.materials) m.dispose();
    for (const t of this.textures) t.dispose();
  }
}
