import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { bakeLamps, BOX_STRIDE, fillLampAtlas, fixtureSize, LAMP_CELL, LAMP_GRID_SLOTS, LAMP_STRIDE, lampColumnDist, lampGrid, lampGridBase, lampPlanReach, packLampAtlas, PENUMBRA, PenumbraBuffers, penumbraWidth, tentWeight, type LampJob, type LampResult } from '../src/voxel/lampBake';
import { lampTerm, LAMP_CONE_COS, LAMP_EXP, SPOT_EXP } from '../src/world/lampMath';
import { packShapes, ShapeMode, type VoxelShape } from '../src/voxel/shapes';
import { canonicalLightSet, canonicalLightShapes } from '../src/voxel/lightShapes';
import { lampVolumeGrid, lampVolumeRegion, unionRegion } from '../src/voxel/lampVolume';
import { detailPieces, dressingOn } from '../src/world/detailPass';
import { LevelBuilder, type BoxPiece, type CylPiece } from '../src/world/levelBuilder';
import { MAPS } from '../src/world/maps';
import { trilinear } from '../src/world/lightField';
import { bakedLights } from '../src/world/lightBake';

const box = (c: [number, number, number], s: [number, number, number], mode?: ShapeMode): VoxelShape => ({ kind: 'box', c, s, yaw: 0, pitch: 0, mat: 1, mode });
/** A downward lamp at (x, y, z), radius r, fixture sx x sz. */
const lamp = (x: number, y: number, z: number, r = 6, sx = 0, sz = 0): number[] => [x, y, z, r, 0, 0, 0, -2, sx, sz];
const floor = box([0, -0.25, 0], [20, 0.5, 20]);

function bake(shapes: VoxelShape[], lights: number[][]): LampResult {
  const job: LampJob = { kind: 'lamps', id: 0, shapes: packShapes(shapes), lights: new Float32Array(lights.flat()), lo: [-10, -0.5, -10], hi: [10, 6, 10] };
  return bakeLamps(job);
}

/** Visibility (0..1) of light `li` at a world point (the cell containing it). */
function visAt(r: LampResult, li: number, x: number, y: number, z: number): number {
  let at = 0;
  for (let i = 0; i < li; i++) at += r.boxes[i * BOX_STRIDE + 3]! * r.boxes[i * BOX_STRIDE + 4]! * r.boxes[i * BOX_STRIDE + 5]!;
  const b = r.boxes.subarray(li * BOX_STRIDE, li * BOX_STRIDE + BOX_STRIDE);
  const cx = Math.floor((x - b[0]!) / LAMP_CELL);
  const cy = Math.floor((y - b[1]!) / LAMP_CELL);
  const cz = Math.floor((z - b[2]!) / LAMP_CELL);
  return r.vis[at + cx + b[3]! * (cy + b[4]! * cz)]! / 255;
}

describe('baked lamp visibility (3.2)', () => {
  it('an open floor under a lamp is in full view; nothing above a downward lamp is baked', () => {
    const r = bake([floor], [lamp(0, 4, 0)]);
    expect(visAt(r, 0, 0, 0.1, 0)).toBe(1);
    expect(visAt(r, 0, 3, 0.5, -2)).toBe(1);
    // (the box stops a cell above the lamp)
    expect(r.boxes[1]! + r.boxes[4]! * LAMP_CELL).toBeLessThanOrEqual(4 + LAMP_CELL * 2);
  });

  it('a wall hides the far side; a doorway carved through it lets the light through', () => {
    const wall = box([2, 1.5, 0], [0.3, 3, 10]);
    const r = bake([floor, wall], [lamp(0, 2.5, 0)]);
    expect(visAt(r, 0, 1, 0.3, 0)).toBe(1);
    expect(visAt(r, 0, 3.5, 0.3, 0)).toBe(0);
    expect(visAt(r, 0, 3.5, 0.3, 3)).toBe(0);
    const door = box([2, 1.1, 0], [0.6, 2.2, 1.2], ShapeMode.Carve);
    const d = bake([floor, wall, door], [lamp(0, 2.5, 0)]);
    expect(visAt(d, 0, 3.5, 0.3, 0)).toBe(1);
    // (still dark beside the doorway)
    expect(visAt(d, 0, 3.5, 0.3, 3)).toBe(0);
  });

  it('a thin shelf still casts a shadow (conservative occupancy)', () => {
    const shelf = box([0, 1.5, 0], [2, 0.02, 2]);
    const r = bake([floor, shelf], [lamp(0, 4, 0)]);
    expect(visAt(r, 0, 0, 0.3, 0)).toBe(0);
    expect(visAt(r, 0, 0, 2, 0)).toBe(1);
  });

  it('a strip lamp casts a soft edge along its length (part of the fixture in view)', () => {
    // a 3 m strip along x at 4 m; a blocker covering the strip's -x half, seen from a cell below
    const blocker = box([-1, 3, 0], [2, 0.1, 1]);
    const r = bake([floor, blocker], [lamp(0, 4, 0, 7, 3, 0.25)]);
    const v = visAt(r, 0, -0.1, 0.3, 0);
    expect(v).toBeGreaterThan(0.2);
    expect(v).toBeLessThan(0.8);
  });

  it('the atlas holds every light at its tile', () => {
    const r = bake([floor, box([2, 1.5, 0], [0.3, 3, 10])], [lamp(0, 2.5, 0), lamp(-5, 3, -5, 3)]);
    const a = packLampAtlas(r.boxes, 40);
    const data = fillLampAtlas(r, a);
    const [ax, ay] = a.dims;
    for (let li = 0; li < 2; li++) {
      const b = r.boxes.subarray(li * BOX_STRIDE, li * BOX_STRIDE + BOX_STRIDE);
      const tx = a.offsets[li * 2]!;
      const tz = a.offsets[li * 2 + 1]!;
      // tiles stay inside the atlas and never overlap the first
      expect(tx + b[3]!).toBeLessThanOrEqual(ax);
      for (const [x, y, z] of [[0, 0.3, 0], [3.5, 0.3, 0], [-5, 0.3, -5]] as const) {
        const cx = Math.floor((x - b[0]!) / LAMP_CELL);
        const cy = Math.floor((y - b[1]!) / LAMP_CELL);
        const cz = Math.floor((z - b[2]!) / LAMP_CELL);
        if (cx < 0 || cz < 0 || cx >= b[3]! || cz >= b[5]!) continue;
        expect(data[tx + cx + ax * (cy + ay * (tz + cz))]! / 255).toBe(visAt(r, li, x, y, z));
      }
    }
    expect(a.offsets[2]! + a.offsets[3]!).toBeGreaterThan(0);
  });

  it('the light grid lists the lights that reach each column, nearest first', () => {
    const L = new Float32Array([...lamp(0, 4, 0, 5), ...lamp(6, 4, 0, 3), ...lamp(-8, 4, -8, 1)]);
    const g = lampGrid(L, [-10, 0, -10], [10, 6, 10]);
    const ids = (x: number, z: number): number[] => {
      const q = Math.floor((x + 10) / 2);
      const r = Math.floor((z + 10) / 2);
      const o = lampGridBase(g.cols, q, r);
      return [...g.data.subarray(o, o + LAMP_GRID_SLOTS)].filter((v) => v > 0).map((v) => v - 1);
    };
    expect(ids(0.5, 0.5)).toEqual([0]);
    expect(ids(4.5, 0.5)).toEqual([1, 0]);
    expect(ids(-9.5, 9.5)).toEqual([]);
    expect(L.length / LAMP_STRIDE).toBe(3);
  });

  it('(sector-fixes L) a cone reaches only as far in plan as its beam: fewer lights per column, none that light it left out', () => {
    const c45 = Math.cos(Math.PI / 4);
    const t = Math.SQRT1_2;
    // a hemisphere lamp, a 45 degree downlight, a 30 degree spot tilted 45 degrees to -z (a wall pack)
    const L = new Float32Array([...lamp(0, 5, 0, 6), 0, 5, 0, 6, 0, -1, 0, c45, 0, 0, 0, 5, 0, 6, 0, -t, -t, Math.cos(Math.PI / 6), 0, 0]);
    const r = [0, 0, 0, 0, 0];
    lampPlanReach(L, 0, r);
    expect(r).toEqual([6, 6, 6, 6, 6]);
    lampPlanReach(L, 1, r);
    expect(r[0]).toBeCloseTo(6 * c45 + 0.01, 4);
    expect(lampColumnDist(L, 0, [6, 6, 6, 6, 6], 5, -1, 2)).toBeGreaterThanOrEqual(0);
    expect(lampColumnDist(L, 1, r, 5, -1, 2)).toBe(-1);
    lampPlanReach(L, 2, r);
    expect(r[4]).toBeLessThan(0.02); // nothing behind the wall pack (+z)
    expect(r[3]).toBeCloseTo(6 * Math.cos(Math.PI / 12) + 0.01, 3);
    expect(lampColumnDist(L, 2, r, -1, 1, 2)).toBe(-1);
    expect(lampColumnDist(L, 2, r, -1, -5, 2)).toBeGreaterThanOrEqual(0);
    // lossless: every point a light reaches lies in a column that lists it
    for (let i = 0; i < 3; i++) {
      const o = i * LAMP_STRIDE;
      const spot = L[o + 7]! > -1.5;
      lampPlanReach(L, i, r);
      for (let x = -7; x <= 7; x += 0.25) for (let z = -7; z <= 7; z += 0.25) for (let y = 0; y <= 5; y += 0.5) {
        const v = lampTerm(x - L[o]!, y - L[o + 1]!, z - L[o + 2]!, L[o + 3]!, L[o + 4]!, L[o + 5]!, L[o + 6]!, spot ? L[o + 7]! : LAMP_CONE_COS, spot ? SPOT_EXP : LAMP_EXP);
        if (v <= 0) continue;
        expect(lampColumnDist(L, i, r, Math.floor(x / 2) * 2, Math.floor(z / 2) * 2, 2), `light ${i} at ${x}, ${y}, ${z}`).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe('(LR16e) penumbra', () => {
  /** A lamp with a fixture of sx x sz (a single sample up to 0.7 m). */
  const panel = (x: number, y: number, z: number, sx: number, sz = sx, r = 6): number[] => lamp(x, y, z, r, sx, sz);
  const bakeP = (shapes: VoxelShape[], lights: number[][], penumbra = true): LampResult =>
    bakeLamps({ kind: 'lamps', id: 0, shapes: packShapes(shapes), lights: new Float32Array(lights.flat()), lo: [-10, -0.5, -10], hi: [10, 6, 10] }, penumbra);
  /** Light 0's visibility as the field and the shaders read it (trilinear between cell centres). */
  const read = (r: LampResult, x: number, y: number, z: number): number => trilinear(r.vis, 0, r.boxes[0]!, r.boxes[1]!, r.boxes[2]!, r.boxes[3]!, r.boxes[4]!, r.boxes[5]!, LAMP_CELL, x, y, z);
  /** 10-90% width (m) of the edge along a line from p in direction d (unit) over len metres, on the cell-centre row. */
  function edgeWidth(r: LampResult, p: [number, number, number], d: [number, number, number], len: number): number {
    const f = (t: number): number => read(r, p[0] + d[0] * t, p[1] + d[1] * t, p[2] + d[2] * t);
    const a = f(0);
    const b = f(len);
    expect(Math.abs(b - a)).toBeGreaterThan(0.9);
    let t10 = NaN;
    let t90 = NaN;
    for (let t = 0; t <= len; t += 0.002) {
      const q = (f(t) - a) / (b - a);
      if (Number.isNaN(t10) && q >= 0.1) t10 = t;
      if (Number.isNaN(t90) && q >= 0.9) t90 = t;
    }
    // (to the mm: the 2 mm march adds float noise)
    return Math.round((t90 - t10) * 1000) / 1000;
  }
  // (the floor's first air row has its centres at y = 0.2; the boxes' x and z centres sit at 0.1 + 0.2 k. (LR16-L) The box's
  // cell planes run through the light point, so the edge tests hang their lamps at odd tenths (3.1, 2.3): the planes then
  // lie at odd tenths and these rows stay cell-centre rows, as on the old grid from lo -0.5. At 3.0 the 0.2 row would sit
  // on a cell plane, half in the floor's solid row.)
  const Y = 3.1;
  const crate = box([1.5, 0.3, 0], [0.6, 0.6, 0.6]);
  const slab = (h: number): VoxelShape => box([2.5, h + 0.05, 0], [3, 0.1, 6]);
  const fence = (h: number): VoxelShape => box([1, h / 2, 0], [0.1, h, 6]);

  it('the width is s x receiver-occluder / occluder-light, clamped; the tent integrates to 1', () => {
    expect(penumbraWidth(0.3, 3, 2.5)).toBeCloseTo(PENUMBRA.minWidth, 9);
    expect(penumbraWidth(0.3, 3, 1.5)).toBeCloseTo(0.3, 9);
    expect(penumbraWidth(1.2, 3, 1)).toBe(PENUMBRA.maxWidth);
    // (an occluder at the lamp: the near limit)
    expect(penumbraWidth(0.3, 0.5, 0)).toBeCloseTo((0.3 * 0.5) / PENUMBRA.nearOcc, 9);
    expect(PENUMBRA.search).toBe(Math.round(PENUMBRA.maxWidth / LAMP_CELL));
    for (const h of [0.5, 1, 1.7, 3]) {
      let sum = tentWeight(h, 0);
      for (let j = 1; j <= PENUMBRA.search; j++) sum += 2 * tentWeight(h, j);
      expect(sum, `h ${h}`).toBeCloseTo(1, 9);
    }
    expect(tentWeight(0.5, 0)).toBe(1);
  });

  it('contact shadow stays sharp (edge width <= 0.25 m at a crate\'s foot)', () => {
    for (const s of [0.3, 0.6]) {
      const r = bakeP([floor, crate], [panel(0, Y, 0, s)]);
      // the shadow's side, just past the crate, and its far end
      expect(edgeWidth(r, [2.1, 0.2, 0.1], [0, 0, 1], 1.2), `side, s ${s}`).toBeLessThanOrEqual(0.25);
      expect(edgeWidth(r, [2.1, 0.2, 0.1], [1, 0, 0], 1), `end, s ${s}`).toBeLessThanOrEqual(0.25);
    }
  });

  it('a raised occluder\'s shadow is soft (>= 0.4 m at 1.5 m)', () => {
    // a 0.3 m panel 0.7 m over a slab 1.5 m up: s x 1.5 / 0.7, more than a cell
    const near = bakeP([floor, slab(1.5)], [panel(0, 2.3, 0, 0.3)]);
    expect(edgeWidth(near, [0.5, 0.2, 0.1], [1, 0, 0], 3)).toBeGreaterThanOrEqual(0.4);
    // the same panel 3 m up (s x 1.5 / 1.5 = 0.3 m): softer than the LR16b grid edge too
    const high = bakeP([floor, slab(1.5)], [panel(0, Y, 0, 0.3)]);
    const old = bakeP([floor, slab(1.5)], [panel(0, Y, 0, 0.3)], false);
    expect(edgeWidth(old, [0.5, 0.2, 0.1], [1, 0, 0], 3)).toBeLessThan(0.17);
    expect(edgeWidth(high, [0.5, 0.2, 0.1], [1, 0, 0], 3)).toBeGreaterThanOrEqual(0.24);
  });

  it('penumbra width grows with the receiver-occluder gap', () => {
    for (const s of [0.3, 0.6]) {
      const w = [0.3, 0.8, 1.5].map((h) => edgeWidth(bakeP([floor, fence(h)], [panel(0, Y, 0, s)]), [1.3, 0.2, 0.1], [1, 0, 0], 3.5));
      // (LR16-L: s 0.3 reads 0.162 / 0.160, both at the contact width; 2 mm is the march's noise)
      expect(w[1]!, `s ${s}: ${w.join(' / ')}`).toBeGreaterThanOrEqual(w[0]! - 0.005);
      expect(w[2]!, `s ${s}: ${w.join(' / ')}`).toBeGreaterThan(w[1]! + 0.2);
      // (a 0.6 m panel already softens the 0.8 m fence's edge)
      if (s === 0.6) expect(w[1]!).toBeGreaterThan(w[0]!);
    }
  });

  it('fully lit and fully hidden cells keep their bytes', () => {
    // an open floor: no edge, nothing changes
    const open = bakeP([floor], [panel(0, 3, 0, 0.6)]);
    expect(open.vis).toEqual(bakeP([floor], [panel(0, 3, 0, 0.6)], false).vis);
    // a crate and a slab: only cells within PENUMBRA.search (+ 1 for solids) cells of an LR16b edge change
    const shapes = [floor, crate, slab(1.5)];
    const L = [panel(-1, 3, 0, 0.6)];
    const e = bakeP(shapes, L);
    const b = bakeP(shapes, L, false);
    const [nx, ny, nz] = [b.boxes[3]!, b.boxes[4]!, b.boxes[5]!];
    const at = (x: number, y: number, z: number): number => b.vis[x + nx * (y + ny * z)]!;
    const nearEdge = (x: number, y: number, z: number): boolean => {
      // (a solid cell takes its brightest air neighbour: one cell more)
      const R = PENUMBRA.search + 1;
      for (let k = Math.max(0, z - R); k <= Math.min(nz - 1, z + R); k++) for (let j = Math.max(0, y - R); j <= Math.min(ny - 1, y + R); j++) for (let i = Math.max(0, x - R); i <= Math.min(nx - 1, x + R); i++) {
        const v = at(i, j, k);
        if ((i > 0 && at(i - 1, j, k) !== v) || (j > 0 && at(i, j - 1, k) !== v) || (k > 0 && at(i, j, k - 1) !== v)) return true;
      }
      return false;
    };
    let changed = 0;
    for (let z = 0; z < nz; z++) for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
      const i = x + nx * (y + ny * z);
      if (e.vis[i] === b.vis[i]) continue;
      changed++;
      expect(nearEdge(x, y, z), `cell ${x} ${y} ${z}`).toBe(true);
    }
    expect(changed).toBeGreaterThan(100);
    // open floor away from the shadows and deep under the slab: 255 and 0 as before
    expect(visAt(e, 0, -4, 0.2, -4)).toBe(1);
    expect(visAt(e, 0, 3.5, 0.2, 0.1)).toBe(0);
  });

  it('no light through a wall', () => {
    // a 0.2 m wall 2 m in front of a large panel (the widest penumbra): nothing behind it, as before
    const wall = box([2, 1.5, 0], [0.2, 3, 14]);
    for (const s of [0.3, 1.2]) {
      const r = bakeP([floor, wall], [panel(0, 2, 0, s, s)]);
      const B = r.boxes;
      for (let z = 0; z < B[5]!; z++) for (let y = 0; y < B[4]!; y++) for (let x = 0; x < B[3]!; x++) {
        if (B[0]! + (x + 0.5) * LAMP_CELL < 2.1 + 0.3) continue;
        expect(r.vis[x + B[3]! * (y + B[4]! * z)], `s ${s} cell ${x} ${y} ${z}`).toBe(0);
      }
      // (and the lit face stays lit)
      expect(visAt(r, 0, 1.7, 1, 0.1)).toBe(1);
    }
  });

  it('strips: soft across, the long axis not blurred twice', () => {
    // a 2.4 x 0.6 m strip along x (5 samples): only its 0.6 m side widens the filter
    const strip = [panel(0, 3, 0, 2.4, 0.6)];
    expect(fixtureSize(new Float32Array(strip[0]!), 0, 5)).toBeCloseTo(0.6, 6);
    expect(fixtureSize(new Float32Array(lamp(0, 3, 0)), 0, 1)).toBe(PENUMBRA.bulb);
    expect(fixtureSize(new Float32Array(panel(0, 3, 0, 0.3, 0.5)), 0, 1)).toBeCloseTo(0.5, 6);
    const across = [floor, box([0, 1.55, 2.5], [6, 0.1, 3])];
    const along = [floor, slab(1.5)];
    const wa = (p: boolean): number => edgeWidth(bakeP(across, strip, p), [0.1, 0.2, 0.3], [0, 0, 1], 3);
    const wl = (p: boolean): number => edgeWidth(bakeP(along, strip, p), [0.3, 0.2, 0.1], [1, 0, 0], 3.5);
    expect(wa(true)).toBeGreaterThan(wa(false) + 0.2);
    // along the strip the samples already make the ramp (~1.4 m): the filter leaves it as wide as it was
    const before = wl(false);
    expect(before).toBeGreaterThan(1);
    expect(wl(true)).toBeLessThanOrEqual(before * 1.05);
  });

  it('deterministic: same input, same bytes', () => {
    const shapes = [floor, crate, slab(1.5), fence(0.8)];
    const L = [panel(-1, 3, 0, 0.6), panel(2, 2.6, 1, 2.4, 0.3), lamp(-3, 2.5, -2, 5)];
    expect(bakeP(shapes, L).vis).toEqual(bakeP(shapes, L).vis);
  });

  it('bake time: no worse than 1.35x of the LR16b bake on the fixture (budget 1.2x, checked on the map bakes)', () => {
    // a room with a doorway, a crate, a shelf and a bench under a bulb, a strip, a panel and a small downlight
    const shapes = [floor, box([0, 1.5, -5.4], [0.2, 3, 8.8]), box([0, 1.5, 5.6], [0.2, 3, 8.8]), box([0, 2.6, 0.6], [0.2, 0.8, 1.2]), box([-3, 0.3, 2], [0.6, 0.6, 0.6]), box([3, 1.5, -2], [2, 0.05, 1]), box([4, 0.4, 3], [1, 0.8, 0.4])];
    const L = [lamp(-3, 3, 0, 6), panel(3, 3, 0, 2.4, 0.3), panel(3, 2.5, 4, 0.6, 0.6, 5), panel(-4, 2.8, -5, 0.1, 0.1, 5)];
    const tb: number[] = [];
    const te: number[] = [];
    // paired runs, best pair ratio: load that lands on one side of a pair cancels in the other pairs (lr16e-check 1)
    for (let k = 0; k < 11; k++) {
      let t = performance.now();
      bakeP(shapes, L, false);
      tb.push(performance.now() - t);
      t = performance.now();
      bakeP(shapes, L, true);
      te.push(performance.now() - t);
    }
    let ratio = Infinity;
    for (let k = 0; k < te.length; k++) ratio = Math.min(ratio, te[k]! / tb[k]!);
    console.info(`LR16e bake ${Math.min(...te).toFixed(0)} ms vs LR16b ${Math.min(...tb).toFixed(0)} ms (x${ratio.toFixed(3)})`);
    expect(ratio).toBeLessThanOrEqual(1.35);
  });

  /** sha256 (first 16 hex) of everything a bake returns: boxes, visibility bytes, bounce boxes, data and bits. */
  const bakeHash = (r: LampResult): string => {
    const h = createHash('sha256');
    const bytes = (a: ArrayBufferView): Uint8Array => new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
    h.update(bytes(r.boxes));
    h.update(r.vis);
    h.update(bytes(r.bounce!.boxes));
    h.update(bytes(r.bounce!.data));
    h.update(bytes(r.bounce!.bits!));
    return h.digest('hex').slice(0, 16);
  };

  // (LR16-POLISH C) the penumbra scratch was cut from 21 B per cell of the largest lamp box to the blocker distance (4 B,
  // also the band index), plane rings and the band's own cells. The bytes must not move: the hashes were taken on
  // lr16int e7cec732 (LR16g, LR16-L A) before the change, so no LAMP_VERSION bump.
  it('(LR16-POLISH C) scratch cut: the fixture bakes to the same bytes as before (penumbra on and off)', () => {
    const shapes = [floor, box([0, 1.5, -5.4], [0.2, 3, 8.8]), box([0, 1.5, 5.6], [0.2, 3, 8.8]), box([0, 2.6, 0.6], [0.2, 0.8, 1.2]), box([-3, 0.3, 2], [0.6, 0.6, 0.6]), box([3, 1.5, -2], [2, 0.05, 1]), box([4, 0.4, 3], [1, 0.8, 0.4]), crate, slab(1.5), fence(0.8)];
    const L = [lamp(-3, 3, 0, 6), panel(3, 3, 0, 2.4, 0.3), panel(3, 2.5, 4, 0.6, 0.6, 5), panel(-4, 2.8, -5, 0.1, 0.1, 5), panel(-1, Y, 0, 0.6), lamp(-3, 2.5, -2, 5)];
    expect(bakeHash(bakeP(shapes, L, true))).toBe('8a043bd5a06b6607');
    expect(bakeHash(bakeP(shapes, L, false))).toBe('74336023ce3a74b4');
  });

  it('(LR16-POLISH C) scratch cut: Marlow Yard (ctcourse) bakes to the same bytes as before', () => {
    const map = MAPS.find((m) => m.id === 'ctcourse')!;
    const b = new LevelBuilder();
    map.build(b, 0);
    const set = canonicalLightSet(b.boxes, b.cylinders, map.id, dressingOn(map));
    const r = bakeLamps({ kind: 'lamps', id: 0, shapes: set.shapes, lights: bakedLights(b.lights).lights, lo: set.lo, hi: set.hi });
    // (ctcourse re-taken after pol-f's bounce bits, LAMP_VERSION 7; vis bytes checked identical old vs new on the merged tree)
    // (LR16 train entry) re-pinned on master's Marlow Yard (A1-A8, marlow-final), which replaced the map the hash was
    // taken on (0a285ac259cd1791); the scratch-cut equivalence itself stays proven by the fixture hashes above
    // (LR16-M) re-pinned after Marlow Yard's lamp data re-tune under LR16 (6efdcc4965ad2745 before)
    expect(bakeHash(r)).toBe('67a42d8a9767ff7d');
  }, 600_000);

  it('(LR16-POLISH C) the scratch is the blocker distance (4 B a cell of the largest box) plus rings of planes', () => {
    const shapes = [floor, crate, slab(1.5), fence(0.8), box([0, 1.5, -5.4], [0.2, 3, 8.8])];
    const L = [panel(-1, Y, 0, 0.6), lamp(-3, 2.5, -2, 5), panel(2, 2.6, 1, 2.4, 0.3)];
    const pen = new PenumbraBuffers();
    const r = bakeLamps({ kind: 'lamps', id: 0, shapes: packShapes(shapes), lights: new Float32Array(L.flat()), lo: [-10, -0.5, -10], hi: [10, 6, 10] }, true, pen);
    let cells = 0;
    let plane = 0;
    let row = 0;
    for (let i = 0; i < L.length; i++) {
      const [nx, ny, nz] = [r.boxes[i * BOX_STRIDE + 3]!, r.boxes[i * BOX_STRIDE + 4]!, r.boxes[i * BOX_STRIDE + 5]!];
      cells = Math.max(cells, nx * ny * nz);
      plane = Math.max(plane, nx * ny);
      row = Math.max(row, nx);
    }
    // per plane cell: sums 100 B (2 inputs, x sums, 2 rings of 8, 2 Float64 sums, 2 outputs), filter 96 B (4 widths, x pass, 2 rings of 7)
    expect(pen.bytes).toBeLessThanOrEqual(4 * cells + 196 * plane + 8 * row);
    expect(pen.peakBand).toBeGreaterThan(0);
    // (was 21 B a cell, 1 + 5 x 4, plus 21 B a band cell)
    expect(pen.bytes).toBeLessThan((21 * cells) / 2);
  });
});

describe('canonical light shapes (3.6)', () => {
  const b = (c: [number, number, number], s: [number, number, number], extra: Partial<BoxPiece> = {}): BoxPiece => ({ c, s, yaw: 0, pitch: 0, color: '#888888', collide: true, visible: true, ...extra });

  it('keeps visible pieces at least 5 cm thick; drops invisible and thinner ones', () => {
    const boxes = [b([0, 1, 0], [4, 2, 0.2]), b([0, 1, 5], [4, 2, 0.04]), b([0, 1, 9], [4, 2, 0.3], { visible: false }), b([3, 0.5, 3], [1, 1, 1], { collide: false })];
    const cyls: CylPiece[] = [
      { c: [1, 1, 1], r: 0.3, h: 2, color: '#888888', collide: true },
      { c: [2, 1, 1], r: 0.02, h: 2, color: '#888888', collide: true },
    ];
    const s = canonicalLightShapes(boxes, cyls, 'unit');
    expect(s.filter((x) => x.kind === 'box').length).toBe(2);
    expect(s.filter((x) => x.kind === 'cyl').length).toBe(1);
  });

  it('is the same whatever dressing the renderer added, and with it', () => {
    const wall = b([0, 1.5, 0], [8, 3, 0.2]);
    const base = canonicalLightShapes([wall], [], 'unit');
    for (const tier of ['low', 'medium', 'ultra', 'epic'] as const) {
      const dressed = [wall, ...detailPieces([wall], 'unit', tier)];
      expect(JSON.stringify(canonicalLightShapes(dressed, [], 'unit')), tier).toBe(JSON.stringify(base));
    }
    // (the Medium dressing is part of it: wall dressing that is thick enough)
    expect(base.length).toBeGreaterThan(1);
  });

  it('every shipped map gives one set, bounded, with the tier of the dressing not mattering', () => {
    for (const map of MAPS) {
      const lb = new LevelBuilder();
      map.build(lb, 1);
      const a = canonicalLightSet(lb.boxes, lb.cylinders, map.id);
      const dressed = [...lb.boxes, ...detailPieces(lb.boxes, map.id, 'epic')];
      const c = canonicalLightSet(dressed, lb.cylinders, map.id);
      expect(c.hash, map.id).toBe(a.hash);
      expect(a.lo.every((v, k) => v < a.hi[k]!), map.id).toBe(true);
      // whole metres, so every grid lines up
      expect([...a.lo, ...a.hi].every((v) => Number.isInteger(v)), map.id).toBe(true);
    }
  });
});

describe('the lamp light volume grid (3.3; the editor light view)', () => {
  const boxes = (...b: number[][]): Float32Array => new Float32Array(b.flat());
  it('covers every lamp box on the bake cells, from a cell under the floor', () => {
    // two boxes (origin, cells) - one dipping under the floor
    const b = boxes([-2.1, -1.0, 0.3, 20, 30, 10], [3.05, 0, -4, 10, 10, 10]);
    const g = lampVolumeGrid(b, 0);
    expect(g.cell).toBe(LAMP_CELL);
    expect(g.o[1]).toBeCloseTo(-LAMP_CELL);
    for (let i = 0; i < 2; i++) {
      const o = i * BOX_STRIDE;
      expect(g.o[0]).toBeLessThanOrEqual(b[o]! + 1e-6);
      expect(g.o[2]).toBeLessThanOrEqual(b[o + 2]! + 1e-6);
      expect(g.o[0] + g.dims[0] * g.cell).toBeGreaterThanOrEqual(b[o]! + b[o + 3]! * LAMP_CELL - 1e-6);
      expect(g.o[1] + g.dims[1] * g.cell).toBeGreaterThanOrEqual(b[o + 1]! + b[o + 4]! * LAMP_CELL - 1e-6);
      expect(g.o[2] + g.dims[2] * g.cell).toBeGreaterThanOrEqual(b[o + 2]! + b[o + 5]! * LAMP_CELL - 1e-6);
      const r = lampVolumeRegion(b, i, g);
      for (let k = 0; k < 3; k++) {
        expect(r[k]).toBeGreaterThanOrEqual(0);
        expect(r[k + 3]).toBeLessThanOrEqual(g.dims[k as 0 | 1 | 2]);
        expect(r[k + 3]).toBeGreaterThan(r[k]!);
      }
    }
    expect(unionRegion([lampVolumeRegion(b, 0, g), lampVolumeRegion(b, 1, g)])).toEqual([0, 0, 0, g.dims[0], g.dims[1], g.dims[2]]);
    expect(unionRegion([])).toBeNull();
  });
});
