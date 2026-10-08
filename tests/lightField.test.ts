import { describe, expect, it } from 'vitest';
import { AMBIENT_CELL, ambientFromGrid, buildAmbientGrid } from '../src/world/ambientGrid';
import { LightRegistry } from '../src/world/lights';
import { bakeMoon, MOON_CELL, type MoonJob } from '../src/voxel/skyBake';
import { packShapes, type VoxelShape } from '../src/voxel/shapes';
import { lightBakeHash, type LightBake } from '../src/world/lightBake';

describe('ambient grid (3.6)', () => {
  const reg = new LightRegistry();
  reg.ambient = 0.2;
  reg.addZone({ minX: 0, maxX: 10, minY: 0, maxY: 4, minZ: 0, maxZ: 10, ambient: 0.05 });
  // (a smaller room inside: the smallest zone wins)
  reg.addZone({ minX: 2, maxX: 5, minY: 0, maxY: 4, minZ: 2, maxZ: 5, ambient: 0.4 });
  const g = buildAmbientGrid(reg, [-3.4, -0.2, -3.4], [14, 6, 14]);

  it('lines up on whole metres and covers the box', () => {
    expect(g.origin).toEqual([-4, -1, -4]);
    expect(g.n[0] * AMBIENT_CELL + g.origin[0]).toBeGreaterThanOrEqual(14);
    expect(g.data.length).toBe(g.n[0] * g.n[1] * g.n[2]);
  });

  it('reads the registry at every cell centre, to a byte', () => {
    for (let i = 0; i < 400; i++) {
      // a deterministic spread of points, all at cell centres
      const x = Math.floor(-4 + ((i * 7) % 18)) + 0.5;
      const y = Math.floor(-1 + ((i * 3) % 7)) + 0.5;
      const z = Math.floor(-4 + ((i * 11) % 18)) + 0.5;
      expect(Math.abs(ambientFromGrid(g, x, y, z) - reg.ambientAt(x, y, z))).toBeLessThanOrEqual(0.5 / 255 + 1e-9);
    }
  });

  it('takes the nearest cell inside a cell and clamps outside the grid', () => {
    expect(ambientFromGrid(g, 3.1, 1.2, 3.9)).toBeCloseTo(0.4, 2);
    expect(ambientFromGrid(g, 8.9, 1.9, 8.1)).toBeCloseTo(0.05, 2);
    expect(ambientFromGrid(g, 500, 1, 500)).toBeCloseTo(0.2, 2);
    expect(ambientFromGrid(g, -500, -500, -500)).toBeCloseTo(0.2, 2);
  });
});

const box = (c: [number, number, number], s: [number, number, number]): VoxelShape => ({ kind: 'box', c, s, yaw: 0, pitch: 0, mat: 1 });

function moon(shapes: VoxelShape[], dir: [number, number, number], lo: [number, number, number] = [-10, 0, -10], hi: [number, number, number] = [10, 8, 10]): { at: (x: number, y: number, z: number) => number } {
  const n: [number, number, number] = [(hi[0] - lo[0]) / MOON_CELL, (hi[1] - lo[1]) / MOON_CELL, (hi[2] - lo[2]) / MOON_CELL];
  const job: MoonJob = { kind: 'moon', id: 0, origin: lo, n, shapes: packShapes(shapes), dir };
  const r = bakeMoon(job);
  return {
    at: (x, y, z) => r.vis[Math.floor((x - lo[0]) / MOON_CELL) + n[0] * (Math.floor((y - lo[1]) / MOON_CELL) + n[1] * Math.floor((z - lo[2]) / MOON_CELL))]! / 255,
  };
}

describe('moon visibility bake (3.6)', () => {
  const floor = box([0, -0.25, 0], [20, 0.5, 20]);
  const s = Math.SQRT1_2;
  const dir: [number, number, number] = [s, s, 0];

  it('open ground sees the moon', () => {
    const m = moon([floor], dir);
    expect(m.at(0, 0.3, 0)).toBe(1);
    expect(m.at(-8, 1, 6)).toBe(1);
  });

  it('a roof shades what is under it, and a wall shades the side away from the moon', () => {
    const roof = box([0, 4.1, 0], [8, 0.2, 8]);
    const wall = box([6, 1.5, 0], [0.3, 3, 10]);
    const m = moon([floor, roof, wall], dir);
    expect(m.at(0, 0.3, 0)).toBe(0);
    // (the moon is at +x, 45 degrees up: the roof's shadow falls towards -x, the wall shades its own -x side)
    expect(m.at(-6, 0.3, 0)).toBe(0);
    expect(m.at(3, 0.3, 7)).toBe(1);
    expect(m.at(5, 0.3, 0)).toBe(0);
    expect(m.at(7.5, 0.3, 0)).toBe(1);
    // beyond the roof's edge in z
    expect(m.at(-6, 0.3, 8)).toBe(1);
  });

  it('a thin pole shades the cells whose ray passes it; the moon direction decides where', () => {
    const pole = box([0, 1.5, 0.25], [0.1, 3, 0.1]);
    const m = moon([floor, pole], dir);
    // (one ray per cell: a cell whose ray passes the pole is dark, its neighbours along z are not)
    expect(m.at(-1.2, 0.3, 0.1)).toBe(0);
    expect(m.at(-1.2, 0.3, 3)).toBe(1);
    expect(m.at(2, 0.3, 0.1)).toBe(1);
  });

  it('is deterministic', () => {
    const roof = box([0, 4.1, 0], [8, 0.2, 8]);
    const a = bakeMoon({ kind: 'moon', id: 0, origin: [-10, 0, -10], n: [40, 16, 40], shapes: packShapes([floor, roof]), dir });
    const b = bakeMoon({ kind: 'moon', id: 0, origin: [-10, 0, -10], n: [40, 16, 40], shapes: packShapes([floor, roof]), dir });
    expect(Buffer.from(a.vis).equals(Buffer.from(b.vis))).toBe(true);
  });
});

describe('light bake hash (3.6)', () => {
  it('changes with any baked byte and is stable otherwise', () => {
    const base = (): LightBake => ({
      lo: [0, 0, 0],
      hi: [1, 1, 1],
      lampKey: 'k',
      moonKey: 'm',
      lamps: null,
      moon: { origin: [0, 0, 0], n: [2, 2, 2], cell: 0.5, vis: new Uint8Array(8).fill(255), dir: [0, 1, 0] },
      ambient: { origin: [0, 0, 0], n: [1, 1, 1], data: new Uint8Array([100]) },
      ms: 0,
    });
    expect(lightBakeHash(base())).toBe(lightBakeHash(base()));
    const b = base();
    b.moon!.vis[3] = 0;
    expect(lightBakeHash(b)).not.toBe(lightBakeHash(base()));
    const c = base();
    c.ambient.data[0] = 101;
    expect(lightBakeHash(c)).not.toBe(lightBakeHash(base()));
  });
});
