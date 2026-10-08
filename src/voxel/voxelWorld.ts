import { renderOpts } from '../world/renderOpts';
import { Color3, Constants, Mesh, PBRMaterial, RawTexture, RawTexture3D, StandardMaterial, Texture, VertexData, type Scene } from '../core/babylon';
import type { SurfaceAtlas } from '../world/surfaceAtlas';
import { BRICK, BRICK_VOXELS, Brickmap, EMPTY, UNIFORM_BASE } from './brickmap';
import type { ChunkJob, ChunkResult } from './chunk';
import { CHUNK, chunkCounts, type LevelVoxels } from './levelVoxels';
import { coarseShapes, packShapes, SHAPE_STRIDE, shapeBounds } from './shapes';
import { VoxelPlugin, type VoxelTextures } from './voxelPlugin';
import { WorkerPool } from './workerPool';
import { loadVoxelCache, saveVoxelCache } from './voxelCache';
import type { SkyResult } from './skyBake';

/** Sky visibility cells (m). */
export const SKY_CELL = 0.5;

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
  /** Bake the sky visibility (the structure layer); a finer layer reads another layer's (`skyFrom`). */
  bakeSky?: boolean;
  skyFrom?: VoxelWorld | null;
  /** Chunks per super-chunk side (one mesh per super-chunk and level; default 1). */
  group?: number;
  /** One-bounce GI per light group (Epic): the lights (`GI_STRIDE` each) and the group slots (with the sky bake). */
  gi?: { lights: Float32Array; groups: number } | null;
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
  readonly materials: (PBRMaterial | StandardMaterial)[] = [];
  readonly plugins: VoxelPlugin[] = [];
  readonly brickmap: Brickmap;
  private chunks: Chunk[] = [];
  private textures: (RawTexture | RawTexture3D)[] = [];
  private lodT = 0;
  /** Level-of-detail swaps so far (3.3 spike log). */
  lodSwaps = 0;
  /** The sky bake: visibility per cell and, per column, the top of the highest solid cell (rain stops there). */
  sky: { origin: [number, number, number]; cell: number; n: [number, number, number]; roof: Float32Array } | null = null;
  private skyVis: Uint8Array | null = null;
  private giData: Uint8Array | null = null;
  /** GI group slots (0: no GI). */
  giGroups = 0;
  giTex: RawTexture3D | null = null;
  private skyFrom: VoxelWorld | null = null;
  /** The sky visibility texture (null without a bake). */
  skyTex: RawTexture3D | null = null;
  stats = { chunks: 0, supers: 0, quads: 0, explicit: 0, uniform: 0, bytes: 0, ms: 0, cached: false, workers: 0 };

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
    const cached = opts.cacheKey ? await loadVoxelCache(opts.cacheKey) : null;
    let results = cached?.chunks ?? null;
    let sky: SkyResult | null = cached?.sky ?? null;
    w.stats.cached = !!results;
    // the sky bake's grid: the map's voxel bounds in 0.5 m cells
    const skyN: [number, number, number] = [0, 1, 2].map((a) => Math.ceil((lv.dims[a]! * lv.size) / SKY_CELL)) as [number, number, number];
    if (!results) {
      const packed = packShapes(lv.shapes);
      const n = packed.length / SHAPE_STRIDE;
      const bb: number[][] = [];
      for (let i = 0; i < n; i++) bb.push(shapeBounds(packed, i));
      const jobs: ChunkJob[] = [];
      for (let l = 0; l < levels; l++) {
        const size = lv.size * (1 << l);
        const src = l ? coarseShapes(packed, size) : packed;
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
              pick.forEach((i, k) => shapes.set(src.subarray(i * SHAPE_STRIDE, (i + 1) * SHAPE_STRIDE), k * SHAPE_STRIDE));
              jobs.push({ id: (l * cz + z) * cy * cx + y * cx + x, origin: [ox, oy, oz], size, n: [vn, vn, vn], shapes, bricks: l === 0 });
            }
          }
        }
      }
      const pool = new WorkerPool();
      w.stats.workers = pool.size;
      try {
        const skyJob = opts.bakeSky === false ? null : pool.sky({ kind: 'sky', id: -1, origin: [...lv.origin], cell: SKY_CELL, n: skyN, shapes: packed.slice(), lights: opts.gi?.lights.slice(), groups: opts.gi?.groups });
        results = await Promise.all(jobs.map((j) => pool.run(j)));
        sky = skyJob ? await skyJob : null;
      } finally {
        pool.dispose();
      }
      if (opts.cacheKey) void saveVoxelCache(opts.cacheKey, { chunks: results, sky });
    }
    if (sky) {
      w.sky = { origin: [...lv.origin], cell: SKY_CELL, n: skyN, roof: sky.roof };
      w.skyVis = sky.vis;
      w.giData = sky.gi ?? null;
      w.giGroups = sky.gi ? (opts.gi?.groups ?? 0) : 0;
    }
    w.skyFrom = opts.skyFrom ?? null;
    w.assemble(scene, results, levels, cx, cy, cz);
    w.stats.ms = performance.now() - t0;
    return w;
  }

  private assemble(scene: Scene, results: ChunkResult[], levels: number, cx: number, cy: number, cz: number): void {
    const lv = this.lv;
    const bm = this.brickmap;
    const per = CHUNK / BRICK;
    const nChunks = cx * cy * cz;
    const ext = CHUNK * lv.size;
    // chunks merge into super-chunks of g^3 (fewer meshes: every one is drawn again in each shadow map and geometry pass)
    const g = Math.max(1, this.opts.group ?? 1);
    const sx = Math.ceil(cx / g);
    const sy = Math.ceil(cy / g);
    const sz = Math.ceil(cz / g);
    for (let i = 0; i < sx * sy * sz; i++) {
      const x = i % sx;
      const y = Math.floor(i / sx) % sy;
      const z = Math.floor(i / (sx * sy));
      const min: [number, number, number] = [lv.origin[0] + x * g * ext, lv.origin[1] + y * g * ext, lv.origin[2] + z * g * ext];
      const max: [number, number, number] = [
        lv.origin[0] + Math.min(cx, (x + 1) * g) * ext,
        lv.origin[1] + Math.min(cy, (y + 1) * g) * ext,
        lv.origin[2] + Math.min(cz, (z + 1) * g) * ext,
      ];
      this.chunks.push({ min, max, lods: [null, null, null], shown: -1 });
    }
    // the brickmap from level 0; the meshes grouped per (super-chunk, level)
    const groups = new Map<number, ChunkResult[]>();
    for (const r of results) {
      const l = Math.floor(r.id / nChunks);
      const ci = r.id - l * nChunks;
      const x = ci % cx;
      const y = Math.floor(ci / cx) % cy;
      const z = Math.floor(ci / (cx * cy));
      if (r.codes && r.data) {
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
      const si = Math.floor(x / g) + sx * (Math.floor(y / g) + sy * Math.floor(z / g));
      const key = si * 4 + l;
      let list = groups.get(key);
      if (!list) groups.set(key, (list = []));
      list.push(r);
    }
    for (const [key, list] of groups) {
      const si = Math.floor(key / 4);
      const l = key - si * 4;
      let nv = 0;
      let ni = 0;
      for (const r of list) {
        nv += r.mesh.positions.length;
        ni += r.mesh.indices.length;
      }
      const positions = new Float32Array(nv);
      const normals = new Float32Array(nv);
      const indices = new Uint32Array(ni);
      let vo = 0;
      let io = 0;
      for (const r of list) {
        positions.set(r.mesh.positions, vo);
        normals.set(r.mesh.normals, vo);
        const base = vo / 3;
        const src = r.mesh.indices;
        for (let i = 0; i < src.length; i++) indices[io + i] = src[i]! + base;
        vo += r.mesh.positions.length;
        io += src.length;
      }
      const m = new Mesh(`vox-${this.opts.name}-${l}-${si}`, scene);
      const vd = new VertexData();
      vd.positions = positions;
      vd.normals = normals;
      vd.indices = indices;
      vd.applyToMesh(m, false);
      m.isPickable = false;
      m.receiveShadows = true;
      m.freezeWorldMatrix();
      m.doNotSyncBoundingInfo = true;
      m.setEnabled(l === 0);
      this.chunks[si]!.lods[l] = m;
      this.meshes.push(m);
    }
    // (chunks with faces, before merging; `supers` the meshes per level they became)
    this.stats.chunks = new Set(results.filter((r) => r.mesh.quads).map((r) => r.id % nChunks)).size;
    this.stats.supers = this.chunks.filter((c) => c.lods.some(Boolean)).length;
    const st = bm.stats();
    this.stats.explicit = st.explicit;
    this.stats.uniform = st.uniform;
    this.stats.bytes = st.bytes;
    const tex = this.uploadTextures(scene);
    for (let l = 0; l < levels; l++) {
      let mat: PBRMaterial | StandardMaterial;
      if (this.opts.atlas) {
        const pm = new PBRMaterial(`voxMat-${this.opts.name}-${l}`, scene);
        pm.albedoColor = Color3.White();
        pm.metallic = 0;
        pm.roughness = 1;
        // the game's lights are tuned to range falloff; PBR divides diffuse by pi (lights authored for standard)
        pm.usePhysicalLightFalloff = false;
        pm.directIntensity = Math.PI;
        pm.environmentIntensity = 0.6;
        pm.realTimeFiltering = renderOpts.iblFilter;
        mat = pm;
      } else {
        // the cheap path (`?gfx=min`): standard shading, the palette colour per voxel only
        const sm = new StandardMaterial(`voxMat-${this.opts.name}-${l}`, scene);
        sm.diffuseColor = Color3.White();
        sm.specularColor = Color3.Black();
        mat = sm;
      }
      const plugin = new VoxelPlugin(mat, tex, this.opts.atlas, 1 << l, this.opts.ao && l === 0, this.opts.micro && l < 2, renderOpts.aoLite);
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
    // (3.2.2: no CPU copy of the pool - 64 MB per layer at 5 cm, kept only to rebuild after a lost context; chips
    // write the texture directly)
    dropCpuCopy(pool);
    // row 0: colour + kind / emissive; row 1: r = puddle
    const pal = new Uint8Array(256 * 4 * 2);
    this.lv.palette.forEach((e, i) => {
      const n = parseInt(e.color.slice(1, 7), 16);
      pal[i * 4] = (n >> 16) & 255;
      pal[i * 4 + 1] = (n >> 8) & 255;
      pal[i * 4 + 2] = n & 255;
      pal[i * 4 + 3] = (e.kind & 15) + 16 * Math.round(Math.max(0, Math.min(1, e.emissive)) * 15);
      pal[1024 + i * 4] = e.puddle ? 255 : 0;
    });
    const palette = new RawTexture(pal, 256, 2, Constants.TEXTUREFORMAT_RGBA, scene, false, false, nearest, Constants.TEXTURETYPE_UNSIGNED_BYTE);
    for (const t of [index, pool, palette]) {
      t.wrapU = t.wrapV = Texture.CLAMP_ADDRESSMODE;
      this.textures.push(t);
    }
    this.stats.bytes = ind.byteLength + poolData.byteLength + pal.byteLength;
    let sky: RawTexture3D | null = null;
    if (this.sky && this.skyVis) {
      const [sx, sy, sz] = this.sky.n;
      sky = new RawTexture3D(this.skyVis, sx, sy, sz, Constants.TEXTUREFORMAT_R, scene, false, false, Texture.BILINEAR_SAMPLINGMODE, Constants.TEXTURETYPE_UNSIGNED_BYTE);
      sky.wrapU = sky.wrapV = sky.wrapR = Texture.CLAMP_ADDRESSMODE;
      this.textures.push(sky);
      this.skyTex = sky;
    }
    let so = sky ? this.sky : null;
    // a finer layer lights itself from the structure layer's bake
    if (!sky && this.skyFrom?.skyTex && this.skyFrom.sky) {
      sky = this.skyFrom.skyTex;
      so = this.skyFrom.sky;
    }
    if (!sky) {
      // (no sky bake: a 1 x 1 x 1 stand-in, so the material's 3D sampler never shares a unit with a 2D texture)
      sky = new RawTexture3D(new Uint8Array([255]), 1, 1, 1, Constants.TEXTUREFORMAT_R, scene, false, false, nearest, Constants.TEXTURETYPE_UNSIGNED_BYTE);
      this.textures.push(sky);
    }
    // GI per light group: the slots stacked along z (the structure layer bakes it; a finer layer reads it)
    let gi: RawTexture3D | null = null;
    let giGroups = 0;
    if (this.giData && this.sky && this.giGroups) {
      const [sx, sy, sz] = this.sky.n;
      // (3.2: one texture, the circuits mixed by how much of each is lit - `mixGi`; one tap per pixel, not one per circuit)
      this.giMix = new Uint8Array(sx * sy * sz * 4);
      mixGiSlots(this.giData, this.giGroups, new Float32Array(this.giGroups).fill(1), this.giMix);
      gi = new RawTexture3D(this.giMix, sx, sy, sz, Constants.TEXTUREFORMAT_RGBA, scene, false, false, Texture.BILINEAR_SAMPLINGMODE, Constants.TEXTURETYPE_UNSIGNED_BYTE);
      gi.wrapU = gi.wrapV = gi.wrapR = Texture.CLAMP_ADDRESSMODE;
      this.textures.push(gi);
      this.giTex = gi;
      giGroups = this.giGroups;
    } else if (this.skyFrom?.giTex) {
      gi = this.skyFrom.giTex;
      giGroups = this.skyFrom.giGroups;
    }
    if (!gi) {
      gi = new RawTexture3D(new Uint8Array(4), 1, 1, 1, Constants.TEXTUREFORMAT_RGBA, scene, false, false, nearest, Constants.TEXTURETYPE_UNSIGNED_BYTE);
      this.textures.push(gi);
    }
    this.poolTex = pool;
    this.indexTex = index;
    this.poolCap = layers * POOL_ROW * POOL_ROW;
    return { index, pool, palette, origin: [...this.lv.origin], size: this.lv.size, bricks: [bm.bx, bm.by, bm.bz], sky, skyOrigin: so ? so.origin : [0, 0, 0], skyCell: so ? so.cell : 0, skyDims: so ? so.n : [1, 1, 1], gi, giGroups };
  }

  private poolTex: RawTexture3D | null = null;
  private indexTex: RawTexture3D | null = null;
  /** Slots the GPU pool holds (the last layer's spare slots take bricks a chip makes explicit). */
  private poolCap = 0;
  private texel = new Uint8Array(4);
  private brickBuf = new Uint8Array(BRICK_VOXELS);

  /**
   * A bullet chip (cosmetic, one voxel): the voxel just behind the hit point turns to the chip colour - one texel
   * uploaded (a uniform brick becomes explicit while the GPU pool has spare slots). Geometry, collision and the
   * meshes are untouched. Returns the struck voxel's colour (debris), or null when there is no voxel there.
   */
  chip(px: number, py: number, pz: number, nx: number, ny: number, nz: number): string | null {
    const s = this.lv.size;
    const o = this.lv.origin;
    const x = Math.floor((px - nx * s * 0.5 - o[0]) / s);
    const y = Math.floor((py - ny * s * 0.5 - o[1]) / s);
    const z = Math.floor((pz - nz * s * 0.5 - o[2]) / s);
    const bm = this.brickmap;
    const m = bm.get(x, y, z);
    if (!m) return null;
    const color = this.lv.palette[m]?.color ?? null;
    const chip = this.lv.chip;
    const pool = this.poolTex;
    if (chip === undefined || m === chip || !pool || !this.indexTex) return color;
    const bi = bm.brickIndex(x >> 3, y >> 3, z >> 3);
    let code = bm.index[bi]!;
    if (code < 0) {
      // a uniform brick: only while the GPU pool has a spare slot; then the whole brick and its indirection texel
      if (bm.slots >= this.poolCap) return color;
      code = bm.explicit(bi);
      this.brickBuf.set(bm.pool.subarray(code * BRICK_VOXELS, (code + 1) * BRICK_VOXELS));
      this.brickBuf[(x & 7) + ((y & 7) << 3) + ((z & 7) << 6)] = chip;
      this.upload(pool, (code % POOL_ROW) * BRICK, (Math.floor(code / POOL_ROW) % POOL_ROW) * BRICK, Math.floor(code / (POOL_ROW * POOL_ROW)) * BRICK, BRICK, this.brickBuf, false);
      this.texel[0] = code & 255;
      this.texel[1] = (code >> 8) & 255;
      this.texel[2] = (code >> 16) & 255;
      this.texel[3] = 255;
      this.upload(this.indexTex, x >> 3, y >> 3, z >> 3, 1, this.texel, true);
    } else {
      this.texel[0] = chip;
      this.upload(pool, (code % POOL_ROW) * BRICK + (x & 7), (Math.floor(code / POOL_ROW) % POOL_ROW) * BRICK + (y & 7), Math.floor(code / (POOL_ROW * POOL_ROW)) * BRICK + (z & 7), 1, this.texel, false);
    }
    bm.pool[code * BRICK_VOXELS + (x & 7) + ((y & 7) << 3) + ((z & 7) << 6)] = chip;
    return color;
  }

  /** texSubImage3D of an n^3 block (R8, or RGBA8 for the indirection). */
  private upload(tex: RawTexture3D, x: number, y: number, z: number, n: number, data: Uint8Array, rgba: boolean): void {
    const engine = tex.getScene()?.getEngine() as unknown as { _gl?: WebGL2RenderingContext; _bindTextureDirectly(t: number, tex: unknown, forUpdate?: boolean, force?: boolean): void } | undefined;
    const gl = engine?._gl;
    const it = tex.getInternalTexture();
    if (!engine || !gl || !it) return;
    engine._bindTextureDirectly(gl.TEXTURE_3D, it, true);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texSubImage3D(gl.TEXTURE_3D, 0, x, y, z, n, n, n, rgba ? gl.RGBA : gl.RED, gl.UNSIGNED_BYTE, data);
    engine._bindTextureDirectly(gl.TEXTURE_3D, null, true);
  }

  /** The top of the highest solid cell above (x, z) (m; -1e9: open sky). Rain stops there. */
  roofAt(x: number, z: number): number {
    const s = this.sky;
    if (!s) return -1e9;
    const cx = Math.floor((x - s.origin[0]) / s.cell);
    const cz = Math.floor((z - s.origin[2]) / s.cell);
    if (cx < 0 || cz < 0 || cx >= s.n[0] || cz >= s.n[2]) return -1e9;
    return s.roof[cx + s.n[0] * cz]!;
  }

  /** Sky visibility at a point (0..1; 1 without a bake). */
  skyAt(x: number, y: number, z: number): number {
    const s = this.sky;
    const v = this.skyVis;
    if (!s || !v) return 1;
    const cx = Math.floor((x - s.origin[0]) / s.cell);
    const cy = Math.floor((y - s.origin[1]) / s.cell);
    const cz = Math.floor((z - s.origin[2]) / s.cell);
    if (cx < 0 || cy < 0 || cz < 0 || cx >= s.n[0] || cy >= s.n[1] || cz >= s.n[2]) return 1;
    return v[cx + s.n[0] * (cy + s.n[1] * cz)]! / 255;
  }

  /** The fill light (the hemisphere's sky and ground colour x intensity) the voxels apply by sky visibility. */
  setFill(sky: [number, number, number], ground: [number, number, number]): void {
    for (const p of this.plugins) {
      p.skyFill = sky;
      p.groundFill = ground;
    }
    this.refresh();
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
      this.lodSwaps++;
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
    this.refresh();
  }

  /** The circuits' GI mixed into one texture (3.2): `weights` per slot (how much of each circuit is lit). */
  private giMix: Uint8Array | null = null;
  mixGi(weights: ArrayLike<number>): void {
    if (!this.giData || !this.giMix || !this.giTex) return;
    mixGiSlots(this.giData, this.giGroups, weights, this.giMix);
    this.giTex.update(this.giMix);
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

/**
 * Pure (3.2): the GI slots (stacked along z, `groups` of them) weighted and summed into one RGBA block, at half scale
 * (`GI_MIX` in the shader: overlapping circuits add up without clipping).
 */
export function mixGiSlots(data: Uint8Array, groups: number, weights: ArrayLike<number>, out: Uint8Array): void {
  const n = out.length;
  for (let i = 0; i < n; i += 4) {
    let r = 0;
    let g = 0;
    let b = 0;
    for (let s = 0; s < groups; s++) {
      const w = weights[s] ?? 0;
      if (w <= 0) continue;
      const o = s * n + i;
      r += data[o]! * w;
      g += data[o + 1]! * w;
      b += data[o + 2]! * w;
    }
    out[i] = Math.min(255, Math.round(r * 0.5));
    out[i + 1] = Math.min(255, Math.round(g * 0.5));
    out[i + 2] = Math.min(255, Math.round(b * 0.5));
    out[i + 3] = 255;
  }
}

/**
 * Let a static texture's upload buffer go (3.2.2): Babylon keeps it to re-create the texture after a lost WebGL
 * context; the big voxel / lamp textures would double their memory for that (the phone ran out of memory).
 */
export function dropCpuCopy(t: { getInternalTexture(): unknown } | null): void {
  const it = t?.getInternalTexture() as { _bufferView?: unknown } | null | undefined;
  if (it) it._bufferView = null;
}
