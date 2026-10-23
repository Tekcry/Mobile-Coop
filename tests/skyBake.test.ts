import { describe, expect, it } from 'vitest';
import { packShapes } from '../src/voxel/shapes';
import { bakeSky, skyDirections } from '../src/voxel/skyBake';

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

describe('GI bake (one bounce per light group)', () => {
  it('a lamp in a closed room lights its slot only; a wall between keeps the next room dark', async () => {
    const { GI_STRIDE } = await import('../src/voxel/skyBake');
    // two rooms 4 x 3 x 4 m side by side (x 0..4 and 4.25..8.25), floor, walls, roof; a lamp in the first
    const box = (c: [number, number, number], s: [number, number, number]) => ({ kind: 'box' as const, c, s, yaw: 0, pitch: 0, mat: 1 });
    const shapes = packShapes([
      box([4.1, -0.25, 2], [9, 0.5, 5]),
      box([4.1, 3.25, 2], [9, 0.5, 5]),
      box([4.1, 1.5, -0.25], [9, 3.5, 0.5]),
      box([4.1, 1.5, 4.25], [9, 3.5, 0.5]),
      box([-0.25, 1.5, 2], [0.5, 3.5, 5]),
      box([8.5, 1.5, 2], [0.5, 3.5, 5]),
      box([4.125, 1.5, 2], [0.25, 3.5, 5]),
    ]);
    const lights = new Float32Array(GI_STRIDE);
    lights.set([2, 2.6, 2, 5, 0, 0, 0, -2, 1, 1, 1, 1]);
    const r = bakeSky({ kind: 'sky', id: 0, origin: [-1, -1, -1], cell: 0.5, n: [21, 10, 13], shapes, lights, groups: 2 });
    const cells = 21 * 10 * 13;
    const at = (slot: number, x: number, y: number, z: number): number => r.gi![((Math.floor((x + 1) * 2) + 21 * (Math.floor((y + 1) * 2) + 10 * Math.floor((z + 1) * 2))) + slot * cells) * 4]!;
    expect(r.gi).toBeDefined();
    // the lamp's room: bounce light in its slot (1), none in slot 0
    expect(at(1, 1.25, 1.25, 1.25)).toBeGreaterThan(3);
    expect(at(0, 1.25, 1.25, 1.25)).toBe(0);
    // the other room (behind the wall): dark
    expect(at(1, 6.25, 1.25, 2.25)).toBeLessThan(1);
  });
});
