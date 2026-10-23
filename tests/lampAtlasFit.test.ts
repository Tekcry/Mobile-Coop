/**
 * lr-tex3d: the baked lamps' visibility atlas stays within the GPU's 3D texture size (`fitLampAtlas`). Under LR13's
 * 1.6x reach campusOps packed to 1023 x 90 x 2428 at the old 1024 width: past 2048 the upload failed
 * ("texImage3D: width, height or depth out of range") and every baked lamp read 0 on screen while the light field still
 * lit the floor. A map that fits keeps the old layout texel for texel (Classic unchanged); the rest widen, then page
 * along y, every cell copied exactly (light parity). `docs/sector-redesign/checks/lr-tex3d-fix.md`.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { BOX_STRIDE, fillLampAtlas, fitLampAtlas, LAMP_ATLAS_WIDTH, lampBox, packLampAtlas, type LampAtlas, type LampResult } from '../src/voxel/lampBake';
import { max3DTextureSize } from '../src/core/babylon';
import { LevelBuilder } from '../src/world/levelBuilder';
import { campusOps } from '../src/world/maps/campusOps';
import { dressingOn } from '../src/world/detailPass';
import { canonicalLightSet } from '../src/voxel/lightShapes';
import { bakedLights } from '../src/world/lightBake';
import { setLampFalloff, type LampFalloff } from '../src/world/lampMath';

/** Boxes (`BOX_STRIDE`) of the given cell sizes, origin 0. */
function boxes(sizes: readonly [number, number, number][]): Float32Array {
  const b = new Float32Array(sizes.length * BOX_STRIDE);
  sizes.forEach(([x, y, z], i) => b.set([0, 0, 0, x, y, z], i * BOX_STRIDE));
  return b;
}

/** Every tile inside the atlas, none overlapping another. */
function tilesOk(b: Float32Array, a: LampAtlas): boolean {
  const n = b.length / BOX_STRIDE;
  const [ax, ay, az] = a.dims;
  for (let i = 0; i < n; i++) {
    const x0 = a.offsets[i * 2]!;
    const z0 = a.offsets[i * 2 + 1]!;
    const y0 = a.ys[i]!;
    if (x0 + b[i * BOX_STRIDE + 3]! > ax || y0 + b[i * BOX_STRIDE + 4]! > ay || z0 + b[i * BOX_STRIDE + 5]! > az) return false;
    for (let j = 0; j < i; j++) {
      const sep =
        x0 >= a.offsets[j * 2]! + b[j * BOX_STRIDE + 3]! || a.offsets[j * 2]! >= x0 + b[i * BOX_STRIDE + 3]! ||
        y0 >= a.ys[j]! + b[j * BOX_STRIDE + 4]! || a.ys[j]! >= y0 + b[i * BOX_STRIDE + 4]! ||
        z0 >= a.offsets[j * 2 + 1]! + b[j * BOX_STRIDE + 5]! || a.offsets[j * 2 + 1]! >= z0 + b[i * BOX_STRIDE + 5]!;
      if (!sep) return false;
    }
  }
  return true;
}

describe('fitLampAtlas (lr-tex3d size rule)', () => {
  it('keeps the old 1024-wide layout when it fits (Classic texel for texel)', () => {
    const b = boxes([[120, 90, 120], [90, 55, 90], [200, 40, 30], [64, 64, 64]]);
    const old = packLampAtlas(b);
    const fit = fitLampAtlas(b, 2048);
    expect(fit.fits).toBe(true);
    expect(fit.pages).toBe(1);
    expect(fit.dims).toEqual(old.dims);
    expect([...fit.offsets]).toEqual([...old.offsets]);
    expect([...fit.ys]).toEqual([0, 0, 0, 0]);
  });

  it('widens the rows when the depth would pass the limit', () => {
    // 40 tiles of 300 x 10 x 200: 3 a 1024 row -> 14 rows, 2800 deep; 6 a 2048 row -> 7 rows, 1400 deep, one page
    const b = boxes(Array.from({ length: 40 }, () => [300, 10, 200] as [number, number, number]));
    expect(packLampAtlas(b).dims[2]).toBe(2800);
    const a = fitLampAtlas(b, 2048);
    expect(a.fits).toBe(true);
    expect(a.pages).toBe(1);
    expect(a.dims).toEqual([1800, 10, 1400]);
    expect(tilesOk(b, a)).toBe(true);
  });

  it('pages along y when the widest rows still pass the limit, copying every cell exactly', () => {
    const sizes = Array.from({ length: 30 }, (_, i) => [60 + (i % 3) * 7, 5 + (i % 4), 50 + (i % 5) * 3] as [number, number, number]);
    const b = boxes(sizes);
    const a = fitLampAtlas(b, 128);
    expect(a.fits).toBe(true);
    expect(a.pages).toBeGreaterThan(1);
    for (const d of a.dims) expect(d).toBeLessThanOrEqual(128);
    expect(tilesOk(b, a)).toBe(true);
    // each light's cells: a distinct value per light and cell, read back from its tile
    let total = 0;
    for (const [x, y, z] of sizes) total += x * y * z;
    const vis = new Uint8Array(total);
    for (let k = 0; k < total; k++) vis[k] = (k * 31 + 7) % 251;
    const r: LampResult = { kind: 'lamps', id: 0, boxes: b, vis };
    const out = fillLampAtlas(r, a);
    const [ax, ay] = a.dims;
    let at = 0;
    for (let i = 0; i < sizes.length; i++) {
      const [nx, ny, nz] = sizes[i]!;
      for (const [cx, cy, cz] of [[0, 0, 0], [nx - 1, ny - 1, nz - 1], [nx >> 1, ny >> 1, nz >> 1]] as const) {
        const got = out[a.offsets[i * 2]! + cx + ax * (a.ys[i]! + cy + ay * (a.offsets[i * 2 + 1]! + cz))];
        expect(got).toBe(vis[at + cx + nx * (cy + ny * cz)]);
      }
      at += nx * ny * nz;
    }
  });

  it('says when nothing fits', () => {
    const a = fitLampAtlas(boxes([[200, 200, 200], [200, 200, 200]]), 256);
    expect(a.fits).toBe(false);
  });
});

describe('campusOps atlas under both falloffs', () => {
  afterEach(() => setLampFalloff('linear'));
  const campusBoxes = (m: LampFalloff): Float32Array => {
    setLampFalloff(m);
    const b = new LevelBuilder();
    campusOps.build(b, 0);
    const set = canonicalLightSet(b.boxes, b.cylinders, campusOps.id, dressingOn(campusOps));
    const baked = bakedLights(b.lights);
    const n = baked.ids.length;
    const out = new Float32Array(n * BOX_STRIDE);
    const o = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < n; i++) out.set(lampBox(baked.lights, i, set.lo, set.hi, o), i * BOX_STRIDE);
    return out;
  };

  it('Classic keeps its layout; Realistic passed 2048 deep at the old width and fits now', () => {
    const lin = campusBoxes('linear');
    const fl = fitLampAtlas(lin, 2048);
    expect(fl.dims).toEqual(packLampAtlas(lin).dims);
    expect(fl.dims[0]).toBeLessThanOrEqual(LAMP_ATLAS_WIDTH);
    const ph = campusBoxes('photometric');
    // the bug: 1023 x 90 x 2428 at 1024 wide
    expect(packLampAtlas(ph).dims[2]).toBeGreaterThan(2048);
    const fp = fitLampAtlas(ph, 2048);
    expect(fp.fits).toBe(true);
    for (const d of fp.dims) expect(d).toBeLessThanOrEqual(2048);
    expect(tilesOk(ph, fp)).toBe(true);
  }, 60_000);
});

describe('max3DTextureSize', () => {
  it('reads MAX_3D_TEXTURE_SIZE from a WebGL2 context, 2048 without one', () => {
    expect(max3DTextureSize({})).toBe(2048);
    const gl = { getParameter: (p: number): number => (p === 0x8073 ? 512 : 0) };
    expect(max3DTextureSize({ webGLVersion: 2, _gl: gl })).toBe(512);
    expect(max3DTextureSize({ webGLVersion: 1, _gl: gl })).toBe(2048);
  });
});
