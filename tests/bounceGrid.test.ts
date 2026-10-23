/**
 * (LR16-1) The bounce grid at runtime (`src/world/bounceGrid.ts`): a lamp switched, shot, jammed dark or EMP'd takes
 * exactly its own bounce out, at once and to the byte, and back on puts the same bytes back; only the touched box is
 * re-quantised; a sync with nothing moved costs one compare; no allocation. And the picture: the shader's `nsGrid2`
 * green channel, read as the GPU reads the RG fill texture, is the field's bounce.
 */
import { describe, expect, it } from 'vitest';
import { BOUNCE, BOUNCE_BOX_STRIDE, type LampBounce } from '../src/voxel/lampBounce';
import { BOUNCE_WEIGHT, BounceGrid, bounceColor, packFillRG } from '../src/world/bounceGrid';
import { LAMP_LEVEL_GAIN } from '../src/world/lampMath';
import { LightRegistry } from '../src/world/lights';
import { bytesPerCall } from './helpers/allocPerCall';
import { roomA } from './helpers/bounceRoom';

const N: [number, number, number] = [14, 5, 12];
const GRID = { origin: [-2, -1, -3], n: N };

/** Four lamps with overlapping boxes and seeded steps (one with an empty box). */
function setup(): { reg: LightRegistry; ids: number[]; b: LampBounce } {
  const reg = new LightRegistry();
  const ids = [0, 1, 2, 3].map((k) => reg.add({ x: k * 3, y: 2.5, z: 2, radius: 4, intensity: [1, 0.9, 0.55, 1.4][k]! }).id);
  const boxes = new Int32Array([1, 0, 1, 6, 4, 5, 4, 1, 2, 7, 3, 6, 0, 0, 0, 0, 0, 0, 7, 0, 5, 6, 5, 7]);
  let seed = 11;
  const rnd = (): number => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let len = 0;
  for (let i = 0; i < 4; i++) len += boxes[i * 6 + 3]! * boxes[i * 6 + 4]! * boxes[i * 6 + 5]!;
  const data = new Uint16Array(len);
  for (let k = 0; k < len; k++) data[k] = rnd() < 0.15 ? 0 : Math.floor(rnd() * 40000);
  return { reg, ids, b: { boxes, data } };
}

/** The grid computed from scratch for the registry as it is (an independent sum). */
function scratch(reg: LightRegistry, ids: number[], b: LampBounce): Uint8Array {
  const acc = new Float64Array(N[0] * N[1] * N[2]);
  let at = 0;
  ids.forEach((id, i) => {
    const o = i * BOUNCE_BOX_STRIDE;
    const [bx, by, bz, nx, ny, nz] = Array.from(b.boxes.subarray(o, o + 6));
    const l = reg.lights[id]!;
    const w = l.on && !l.destroyed && l.intensity > 0 ? Math.round(l.intensity * BOUNCE_WEIGHT) : 0;
    for (let z = 0; z < nz!; z++) for (let y = 0; y < ny!; y++) for (let x = 0; x < nx!; x++) { const c = bx! + x + N[0] * (by! + y + N[1] * (bz! + z)); acc[c] = acc[c]! + b.data[at++]! * w; }
  });
  return Uint8Array.from(acc, (a) => Math.round(Math.min(1, a * (BOUNCE.q / BOUNCE_WEIGHT) * LAMP_LEVEL_GAIN) * 255));
}

const same = (a: Uint8Array, b: Uint8Array): boolean => Buffer.from(a).equals(Buffer.from(b));

describe('(LR16-1) bounce grid', () => {
  it('switch off removes exactly that lamp\'s bounce', () => {
    const { reg, ids, b } = setup();
    const g = new BounceGrid(b, ids, GRID);
    g.sync(reg);
    expect(g.active).toBe(true);
    expect(same(g.g, scratch(reg, ids, b))).toBe(true);
    const lit = g.g.slice();
    // switched off
    reg.setOn(ids[1]!, false);
    g.sync(reg);
    expect(same(g.g, scratch(reg, ids, b))).toBe(true);
    // the cells only lamp 1 reaches (x 7..10, z 2..4: inside its box, outside 0's and 3's) are dark now; the ones only
    // lamp 0 holds (x 1..3) are as they were
    const c = (x: number, y: number, z: number): number => x + N[0] * (y + N[1] * z);
    let own = 0;
    for (let x = 7; x <= 10; x++) {
      for (let y = 1; y <= 3; y++) {
        for (let z = 2; z <= 4; z++) {
          if (lit[c(x, y, z)]! > 0) own++;
          expect(g.g[c(x, y, z)]).toBe(0);
        }
      }
    }
    expect(own).toBeGreaterThan(10);
    for (let x = 1; x <= 3; x++) for (let z = 1; z <= 5; z++) expect(g.g[c(x, 2, z)]).toBe(lit[c(x, 2, z)]);
    // shot, jammed dark, EMP'd: each out at once
    reg.setOn(ids[1]!, true);
    reg.kill(ids[0]!);
    g.sync(reg);
    expect(same(g.g, scratch(reg, ids, b))).toBe(true);
    reg.jamStart(ids[3]!);
    reg.jamLit(ids[3]!, false);
    g.sync(reg);
    expect(g.weight(3)).toBe(0);
    expect(same(g.g, scratch(reg, ids, b))).toBe(true);
    reg.jamEnd(ids[3]!);
    expect(reg.disrupt(3, 2.5, 2, 1, 5)).toBe(1);
    g.sync(reg);
    expect(g.weight(1)).toBe(0);
    expect(same(g.g, scratch(reg, ids, b))).toBe(true);
    // all back: the very first bytes
    reg.update(10);
    reg.restore(ids[0]!);
    reg.resetTo(ids[0]!, true, false);
    g.sync(reg);
    expect(same(g.g, lit)).toBe(true);
  });

  it('1000 random toggles return to the same bytes', () => {
    const { reg, ids, b } = setup();
    const g = new BounceGrid(b, ids, GRID);
    g.sync(reg);
    const first = g.g.slice();
    let seed = 5;
    const rnd = (): number => (seed = (seed * 48271) % 2147483647) / 2147483647;
    for (let k = 0; k < 1000; k++) {
      const id = ids[Math.floor(rnd() * ids.length)]!;
      const r = rnd();
      if (r < 0.5) reg.setOn(id, !reg.lights[id]!.on);
      else if (r < 0.7) reg.kill(id);
      else if (r < 0.85) reg.resetTo(id, true, false);
      else {
        reg.lights[id]!.intensity = Math.round(rnd() * 20) / 10;
        reg.version++;
      }
      g.sync(reg);
      if (k % 50 === 0) expect(same(g.g, scratch(reg, ids, b))).toBe(true);
    }
    ids.forEach((id, i) => {
      reg.lights[id]!.intensity = [1, 0.9, 0.55, 1.4][i]!;
      reg.resetTo(id, true, false);
    });
    reg.version++;
    g.sync(reg);
    expect(same(g.g, first)).toBe(true);
  });

  it('only the touched box is re-quantised', () => {
    const { reg, ids, b } = setup();
    const g = new BounceGrid(b, ids, GRID);
    g.sync(reg);
    g.clearDirty();
    // a byte outside lamp 0's box, poisoned: a toggle of lamp 0 must not rewrite it
    const out = 12 + N[0] * (4 + N[1] * 11);
    g.g[out] = 77;
    reg.setOn(ids[0]!, false);
    g.sync(reg);
    expect(g.lastCells).toBe(6 * 4 * 5);
    expect(g.g[out]).toBe(77);
    expect(Array.from(g.dirty)).toEqual([1, 0, 1, 7, 4, 6]);
    // a second lamp grows the dirty box to the union
    reg.setOn(ids[1]!, false);
    g.sync(reg);
    expect(Array.from(g.dirty)).toEqual([1, 0, 1, 11, 4, 8]);
  });

  it('sync is free when the version did not move', async () => {
    const { reg, ids, b } = setup();
    const g = new BounceGrid(b, ids, GRID);
    g.sync(reg);
    const v = g.version;
    reg.lights[ids[0]!]!.on = false; // (behind the registry's back: no version bump, no work)
    g.sync(reg);
    expect(g.version).toBe(v);
    expect(g.weight(0)).toBeGreaterThan(0);
    // a version bump that changes nothing: no cell touched, no new version
    reg.lights[ids[0]!]!.on = true;
    reg.version++;
    g.sync(reg);
    expect(g.version).toBe(v);
    expect(g.lastCells).toBe(0);
    const bytes = await bytesPerCall((n) => {
      for (let i = 0; i < n; i++) g.sync(reg);
    }, 1);
    expect(bytes).toBeLessThan(1);
  });

  it('allocation-free', async () => {
    const { reg, ids, b } = setup();
    const g = new BounceGrid(b, ids, GRID);
    g.sync(reg);
    const l = reg.lights[ids[1]!]!;
    const bytes = await bytesPerCall((n) => {
      for (let i = 0; i < n; i++) {
        l.on = !l.on;
        reg.version++;
        g.sync(reg);
      }
    }, 1, { n: 500 });
    expect(bytes).toBeLessThan(1);
  });

  it('a lamp-free bake or a box past the grid is no bounce', () => {
    const reg = new LightRegistry();
    const none = new BounceGrid(undefined, [], GRID);
    none.sync(reg);
    expect(none.active).toBe(false);
    const { b, ids, reg: r2 } = setup();
    // every box shifted past the grid's x end: all dropped, nothing written out of bounds
    const far: LampBounce = { boxes: b.boxes.map((v, k) => (k % 6 === 0 ? v + 20 : v)), data: b.data };
    const g = new BounceGrid(far, ids, GRID);
    g.sync(r2);
    expect(g.g.every((v) => v === 0)).toBe(true);
  });

  it('the bounce tint: lamp colours by intensity, luminance 1', () => {
    const c = bounceColor([{ color: [1, 0.9, 0.75], intensity: 1 }, { color: [0.6, 0.8, 1], intensity: 3 }]);
    expect(0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]).toBeCloseTo(1, 9);
    expect(c[2]).toBeGreaterThan(c[0]);
    expect(bounceColor([])).toEqual([1, 1, 1]);
  });
});

describe('(LR16-1) nsGrid2 green channel = field bounce', () => {
  it('the GLSL reads G of the RG fill texture as the field reads the bounce grid', async () => {
    const { NS_GRID2_GLSL, LAMP_GLSL } = await import('../src/world/bakedLamps');
    // the function: the same normalised coordinate as nsGrid, G read with the coordinate clamped to the grid (a clamped
    // bilinear tap = the field's clamped trilinear), R as nsGrid (1 outside the grid)
    expect(LAMP_GLSL).toContain(NS_GRID2_GLSL);
    expect(NS_GRID2_GLSL).toContain('vec3 q = (p - o.xyz) / (o.w * n.xyz);');
    expect(NS_GRID2_GLSL).toContain('texture(t, clamp(q, 0.0, 1.0)).rg');
    expect(NS_GRID2_GLSL).toMatch(/\? 1\.0 : v\.x, v\.y\)/);

    // the bytes: the field's bounce grid packed as the fill texture (R ambient, G bounce), sampled the way GL samples a
    // LINEAR, CLAMP_TO_EDGE 3D texture at nsGrid2's coordinate, equals the field's bounceAt
    const { field, bake } = roomA();
    const bg = field.bounce;
    const amb = bake.ambient;
    expect(bg.n).toEqual(amb.n);
    expect(bg.origin).toEqual(amb.origin);
    const rg = new Uint8Array(amb.data.length * 2);
    packFillRG(amb.data, bg.g, rg, amb.n);
    const [nx, ny, nz] = amb.n;
    const gl = (px: number, py: number, pz: number): number => {
      // nsGrid2: q = (p - o) / (cell x n), clamped to [0, 1]; GL LINEAR + CLAMP_TO_EDGE: u = q x n - 0.5 clamped to the edge texels
      const q = [(px - amb.origin[0]) / nx, (py - amb.origin[1]) / ny, (pz - amb.origin[2]) / nz].map((v) => Math.min(1, Math.max(0, v)));
      const u = [q[0]! * nx - 0.5, q[1]! * ny - 0.5, q[2]! * nz - 0.5];
      const lo = u.map((v) => Math.floor(v));
      const fr = u.map((v, k) => v - lo[k]!);
      const n = [nx, ny, nz];
      let s = 0;
      for (let dz = 0; dz < 2; dz++) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        const i = [dx, dy, dz].map((d, k) => Math.min(n[k]! - 1, Math.max(0, lo[k]! + d)));
        const w = (dx ? fr[0]! : 1 - fr[0]!) * (dy ? fr[1]! : 1 - fr[1]!) * (dz ? fr[2]! : 1 - fr[2]!);
        s += w * rg[(i[0]! + nx * (i[1]! + ny * i[2]!)) * 2 + 1]!;
      }
      return s / 255;
    };
    let seed = 3;
    const rnd = (): number => (seed = (seed * 16807) % 2147483647) / 2147483647;
    let lit = 0;
    for (let k = 0; k < 400; k++) {
      // inside the grid, on its edges and past it
      const x = -2 + rnd() * 25;
      const y = -1.5 + rnd() * 6;
      const z = -1.5 + rnd() * 14;
      const want = field.bounceAt(x, y, z);
      expect(gl(x, y, z), `${x.toFixed(2)} ${y.toFixed(2)} ${z.toFixed(2)}`).toBeCloseTo(want, 9);
      if (want > 0.02) lit++;
    }
    expect(lit).toBeGreaterThan(10);
    // R is the ambient grid untouched
    for (let c = 0; c < amb.data.length; c++) expect(rg[c * 2]).toBe(amb.data[c]);
  });
});
