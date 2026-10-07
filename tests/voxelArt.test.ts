import { describe, expect, it } from 'vitest';
import { hash3, noise3, Prog, runProgram } from '../src/voxel/programs';
import { packShapes, rasterise, ShapeMode } from '../src/voxel/shapes';
import { bakeSky, skyDirections } from '../src/voxel/skyBake';
import { Palette } from '../src/voxel/levelVoxels';

describe('voxel material programs', () => {
  it('hash and noise are deterministic and in range', () => {
    expect(hash3(1, 2, 3)).toBe(hash3(1, 2, 3));
    expect(hash3(1, 2, 3)).not.toBe(hash3(1, 2, 4));
    for (let i = 0; i < 200; i++) {
      const n = noise3(i * 0.37, i * 0.11, i * 0.73);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });
  it('block wall: mortar lines on the course and joint, block tones between', () => {
    const s = 0.05;
    const at = (wx: number, wy: number): number => runProgram(Prog.BlockWall, 10, 4, 99, 0.2, 0.4, 0, 0, 0, 2, 1.5, 0.15, wx, wy, 0.1, s, 10);
    // a bed joint every 20 cm, the first voxel of each course
    expect(at(0.225, 0.025)).toBe(99);
    expect(at(0.225, 0.225)).toBe(99);
    // between joints: one of the four block tones
    const v = at(0.225, 0.125);
    expect(v).toBeGreaterThanOrEqual(10);
    expect(v).toBeLessThan(14);
    // never carved (cover faces stay within 3 cm)
    for (let x = 0; x < 2; x += 0.05) for (let y = 0; y < 1; y += 0.05) expect(at(x + 0.025, y + 0.025)).not.toBe(0);
  });
  it('cladding: ribs carved only above 4.4 m, a concrete plinth below 1.2 m', () => {
    const s = 0.05;
    // a 6 m wall piece: ly + hy = height above its bottom
    const at = (wx: number, h: number, faceDist: number): number => runProgram(Prog.Cladding, 20, 4, 1.2, 77, 0, 0, h - 3, 0.15 - faceDist, 2, 3, 0.15, wx, h, 0, s, 20);
    expect(at(0.025, 0.5, 0.01)).toBe(77);
    // rib column (every third voxel), on the face: carved high up, a darker line low down
    expect(at(0.025, 5, 0.01)).toBe(0);
    expect(at(0.025, 3.1, 0.01)).toBe(23);
    // inside the sheet: never carved
    expect(at(0.025, 5, 0.1)).not.toBe(0);
  });
  it('paint programs leave air alone and keep what they do not paint', () => {
    expect(runProgram(Prog.Grime, 5, 9, 0.6, 0.6, 0, 0, -0.29, 0, 1, 0.3, 1, 0, 0.01, 0, 0.05, 0)).toBe(-1);
    const r = runProgram(Prog.Grime, 5, 9, 0.6, 0.9, 0, 0, 0.29, 0, 1, 0.3, 1, 0, 0.59, 0, 0.05, 3);
    expect(r).toBe(-1);
  });
  it('rasterise runs programs: paint only on solid voxels, carve where a program says so', () => {
    const sh = packShapes([
      { kind: 'box', c: [0.5, 0.5, 0.5], s: [1, 1, 1], yaw: 0, pitch: 0, mat: 1 },
      { kind: 'box', c: [0.5, 1.2, 0.5], s: [2, 1.6, 2], yaw: 0, pitch: 0, mat: 7, mode: ShapeMode.Paint, prog: Prog.Hazard, params: [0, 8, 0.3, 0] },
    ]);
    const g = new Uint8Array(20 * 20 * 20);
    rasterise(sh, g, [0, 0, 0], 0.1, 20, 20, 20);
    const vals = new Set<number>();
    for (let z = 0; z < 10; z++) for (let y = 4; y < 10; y++) for (let x = 0; x < 10; x++) vals.add(g[x + 20 * (y + 20 * z)]!);
    expect(vals.has(7) && vals.has(8)).toBe(true);
    // the paint volume above the box stays air
    expect(g[5 + 20 * (15 + 20 * 5)]).toBe(0);
  });
  it('palette ranges are consecutive and reused', () => {
    const p = new Palette();
    const a = p.range(['#111111', '#222222', '#333333'], 0);
    expect(a.ok).toBe(true);
    expect(p.entries[a.base + 2]!.color).toBe('#333333');
    expect(p.range(['#111111', '#222222', '#333333'], 0).base).toBe(a.base);
    expect(p.range(['#111111', '#222222', '#333333'], 1).base).not.toBe(a.base);
  });
});

describe('sky bake', () => {
  it('open ground sees the sky, under a roof is dark, under a hole lighter', () => {
    // a 10 x 10 m roof at 4 m with a 2 m hole in the middle, over open ground
    const shapes = packShapes([
      { kind: 'box', c: [-3, 4, 0], s: [4, 0.25, 10], yaw: 0, pitch: 0, mat: 1 },
      { kind: 'box', c: [3, 4, 0], s: [4, 0.25, 10], yaw: 0, pitch: 0, mat: 1 },
      { kind: 'box', c: [0, 4, -3], s: [2, 0.25, 4], yaw: 0, pitch: 0, mat: 1 },
      { kind: 'box', c: [0, 4, 3], s: [2, 0.25, 4], yaw: 0, pitch: 0, mat: 1 },
    ]);
    const r = bakeSky({ kind: 'sky', id: 0, origin: [-10, 0, -10], cell: 0.5, n: [40, 12, 40], shapes });
    const vis = (x: number, y: number, z: number): number => r.vis[Math.floor((x + 10) / 0.5) + 40 * (Math.floor(y / 0.5) + 12 * Math.floor((z + 10) / 0.5))]! / 255;
    expect(vis(8, 1, 8)).toBeGreaterThan(0.9);
    expect(vis(-3.5, 1, 3.5)).toBeLessThan(0.45);
    expect(vis(0, 1, 0)).toBeGreaterThan(vis(-3.5, 1, 3.5));
    // rain stops on the roof, falls through the hole
    expect(r.roof[Math.floor(13 / 0.5) + 40 * Math.floor(13 / 0.5)]).toBeCloseTo(4.5, 5);
    expect(r.roof[Math.floor(10 / 0.5) + 40 * Math.floor(10 / 0.5)]).toBeLessThan(0);
    expect(skyDirections(16).every((d) => d[1] > 0)).toBe(true);
  });
});
