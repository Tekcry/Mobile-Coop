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
      moonLight: 0.1,
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

/** Bytes a query may leave in the young generation: V8 boxes the doubles returned by calls it does not inline (16 B
 *  each). A vector, array or closure per query costs far more (the control). */
const BOXED_BUDGET = 64;

describe('light field (3.6)', async () => {
  const { LightField, trilinear } = await import('../src/world/lightField');
  const { bakeLamps, BOX_STRIDE, LAMP_CELL } = await import('../src/voxel/lampBake');
  const { bakedLights } = await import('../src/world/lightBake');
  const { buildAmbientGrid } = await import('../src/world/ambientGrid');
  const { makeCone } = await import('../src/world/lights');

  /** A room (floor, a wall with a doorway) under three lamps and a spot, a zone, the moon: baked as the game does. */
  function scene(): { reg: LightRegistry; bake: LightBake } {
    const reg = new LightRegistry();
    reg.ambient = 0.2;
    reg.addZone({ minX: -10, maxX: 0, minY: -1, maxY: 5, minZ: -10, maxZ: 10, ambient: 0.08 });
    reg.add({ x: -3, y: 3, z: 0, radius: 6, intensity: 0.9 });
    reg.add({ x: 3, y: 3.5, z: 2, radius: 7, intensity: 0.7, fixture: { sx: 0.2, sy: 0.1, sz: 1.5, oy: 0.1 } });
    reg.add({ kind: 'spot', x: 0, y: 4, z: -4, radius: 8, intensity: 1, cone: makeCone(0.3, -1, 0, 0.6) });
    reg.add({ x: 6, y: 2, z: -6, radius: 4, intensity: 0.5 });
    const shapes = packShapes([
      box([0, -0.25, 0], [20, 0.5, 20]),
      // a wall at x = 0 with a doorway at z 0..1.2
      box([0, 1.5, -5.4], [0.2, 3, 8.8]),
      box([0, 1.5, 5.6], [0.2, 3, 8.8]),
      box([0, 2.6, 0.6], [0.2, 0.8, 1.2]),
      box([-5, 4.1, 0], [10, 0.2, 20]),
    ]);
    const lo: [number, number, number] = [-11, -1, -11];
    const hi: [number, number, number] = [11, 6, 11];
    const baked = bakedLights(reg);
    const r = bakeLamps({ kind: 'lamps', id: 0, shapes, lights: baked.lights, lo, hi });
    const s = Math.SQRT1_2;
    const dir: [number, number, number] = [s, s, 0];
    const n: [number, number, number] = [44, 14, 44];
    const m = bakeMoon({ kind: 'moon', id: 0, origin: lo, n, shapes, dir });
    const moonL = 0.1;
    const sky = reg.ambient - moonL;
    const ambient = buildAmbientGrid({ ambientAt: (x, y, z) => { const v = reg.zoneAt(x, y, z); return v === v ? v : sky; } }, lo, hi);
    return { reg, bake: { lo, hi, lampKey: 'k', moonKey: 'm', lamps: { baked, r }, moon: { origin: lo, n, cell: MOON_CELL, vis: m.vis, dir }, ambient, moonLight: moonL, ms: 0 } };
  }

  /** An independent sum: every lamp, the plain formula, its own trilinear read. */
  function brute(reg: LightRegistry, b: LightBake, x: number, y: number, z: number): number {
    const at = (g: Uint8Array, start: number, o: number[], nn: number[], c: number): number => {
      const f = [(x - o[0]!) / c - 0.5, (y - o[1]!) / c - 0.5, (z - o[2]!) / c - 0.5].map((v, k) => Math.min(nn[k]! - 1, Math.max(0, v)));
      let sum = 0;
      for (let dz = 0; dz < 2; dz++) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        const i = [dx, dy, dz].map((d, k) => Math.min(nn[k]! - 1, Math.floor(f[k]!) + d));
        const wgt = [dx, dy, dz].map((d, k) => (d ? f[k]! - Math.floor(f[k]!) : 1 - (f[k]! - Math.floor(f[k]!)))).reduce((p, q) => p * q, 1);
        sum += wgt * g[start + i[0]! + nn[0]! * (i[1]! + nn[1]! * i[2]!)]!;
      }
      return sum / 255;
    };
    const ag = b.ambient;
    const ci = [x, y, z].map((v, k) => Math.min(ag.n[k]! - 1, Math.max(0, Math.floor(v - ag.origin[k]!))));
    let v = ag.data[ci[0]! + ag.n[0] * (ci[1]! + ag.n[1] * ci[2]!)]! / 255;
    v += b.moonLight * at(b.moon.vis, 0, b.moon.origin, b.moon.n, MOON_CELL);
    let off = 0;
    b.lamps!.baked.ids.forEach((id, i) => {
      const B = b.lamps!.r.boxes.subarray(i * BOX_STRIDE, i * BOX_STRIDE + 6);
      const start = off;
      off += B[3]! * B[4]! * B[5]!;
      const l = reg.lights[id]!;
      if (!l.on || l.destroyed) return;
      const dx = x - l.x;
      const dy = y - l.y;
      const dz = z - l.z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d >= l.radius) return;
      const axis = l.cone ? [l.cone.dx, l.cone.dy, l.cone.dz] : [0, -1, 0];
      const cosA = d > 1e-4 ? (dx * axis[0]! + dy * axis[1]! + dz * axis[2]!) / d : 1;
      const cut = l.cone ? l.cone.cosOuter : Math.cos((Math.PI * 0.97) / 2);
      if (cosA < cut) return;
      const cone = Math.pow(Math.max(cosA, 1e-4), l.cone ? 2 : 1);
      v += l.intensity * (1 - d / l.radius) * cone * at(b.lamps!.r.vis, start, [B[0]!, B[1]!, B[2]!], [B[3]!, B[4]!, B[5]!], LAMP_CELL);
    });
    return Math.min(1, Math.max(0, v));
  }

  it('levelAt equals an independent brute-force sum at random points', () => {
    const { reg, bake } = scene();
    const f = new LightField(bake, reg);
    let seed = 7;
    const rnd = (): number => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    let lit = 0;
    for (let i = 0; i < 500; i++) {
      const x = -10 + rnd() * 20;
      const y = 0.05 + rnd() * 3.5;
      const z = -10 + rnd() * 20;
      const a = f.levelAt(x, y, z);
      expect(a, `${x.toFixed(2)} ${y.toFixed(2)} ${z.toFixed(2)}`).toBeCloseTo(brute(reg, bake, x, y, z), 6);
      if (a > 0.4) lit++;
    }
    // (the scene is not all dark: lamps really contribute)
    expect(lit).toBeGreaterThan(30);
  });

  it('switching, shooting and EMP change the level at once; the wall and the roof shade it as baked', () => {
    const { reg, bake } = scene();
    const f = new LightField(bake, reg);
    const under = f.levelAt(-3, 1, 0);
    expect(under).toBeGreaterThan(0.4);
    // the wall stops the west lamp (x -3): nothing of it east of the wall away from the doorway, plenty west of it
    expect(f.lampAt(0, 1.5, 1, -3)).toBe(0);
    expect(f.lampAt(0, -1.5, 1, -3)).toBeGreaterThan(0.1);
    reg.setOn(0, false);
    expect(f.levelAt(-3, 1, 0)).toBeLessThan(under - 0.3);
    reg.setOn(0, true);
    reg.destroy(0);
    expect(f.levelAt(-3, 1, 0)).toBeCloseTo(brute(reg, bake, -3, 1, 0), 6);
    // the moon: under the roof (x < 0) it adds nothing, out in the open it does
    expect(f.moonAt(-5, 1, 5)).toBe(0);
    expect(f.moonAt(8, 1, 8)).toBeGreaterThan(0.99);
  });

  it('a closed door cuts the lamps behind it; an open one does not', () => {
    const { reg, bake } = scene();
    // the doorway at x 0, z 0..1.2, 2.2 m high: a leaf hinged at z 0 along +z
    const door = { anchor: { hinge: { x: 0, y: 0, z: 0 }, yaw: 0, width: 1.2, height: 2.2 }, open: 0 };
    const f = new LightField(bake, reg, [door]);
    const free = new LightField(bake, reg, []);
    // east of the wall, in line with the doorway from the west lamp
    const p = [1.2, 0.8, 0.6] as const;
    expect(free.lampAt(0, ...p)).toBeGreaterThan(0.05);
    expect(f.lampAt(0, ...p)).toBe(0);
    expect(f.levelAt(...p)).toBeLessThan(free.levelAt(...p));
    door.open = 1;
    expect(f.levelAt(...p)).toBeCloseTo(free.levelAt(...p), 9);
    // a lamp on the same side as the point is never cut
    door.open = 0;
    expect(f.lampAt(1, 3, 1, 2)).toBeCloseTo(free.lampAt(1, 3, 1, 2), 9);
  });

  it('flashlights are dynamic (with the ray test); baked lamps never are', () => {
    const { reg, bake } = scene();
    const t = reg.add({ kind: 'flashlight', x: 5, y: 1.5, z: 5, radius: 10, intensity: 0.8, cone: makeCone(0, 0, 1, 0.4), on: true });
    const f = new LightField(bake, reg);
    const seen: number[] = [];
    const d = f.dynamicAt(5, 1.5, 8, (l) => {
      seen.push(l.id);
      return false;
    });
    expect(d).toBeGreaterThan(0.3);
    expect(seen).toEqual([t.id]);
    expect(f.dynamicAt(5, 1.5, 8, () => true)).toBe(0);
    expect(f.totalAt(5, 1.5, 8)).toBeCloseTo(Math.min(1, f.levelAt(5, 1.5, 8) + d), 9);
  });

  it('allocation-free under a loop (no objects, closures or vectors; only V8 boxing a returned double)', async () => {
    const { reg, bake } = scene();
    reg.add({ kind: 'flashlight', x: 5, y: 1.5, z: 5, radius: 10, intensity: 0.8, cone: makeCone(0, 0, 1, 0.4), on: true });
    const door = { anchor: { hinge: { x: 0, y: 0, z: 0 }, yaw: 0, width: 1.2, height: 2.2 }, open: 0 };
    const f = new LightField(bake, reg, [door]);
    const occ = (): boolean => false;
    const v8 = await import('node:v8');
    const vm = await import('node:vm');
    v8.setFlagsFromString('--expose-gc');
    const gc = vm.runInNewContext('gc') as () => void;
    const newSpace = (): number => v8.getHeapSpaceStatistics().find((x) => x.space_name === 'new_space')!.space_used_size;
    const out = new Float64Array(1);
    const N = 20000;
    const per = (fn: (n: number) => void): number => {
      for (let k = 0; k < 5; k++) fn(100000);
      let best = Infinity;
      for (let k = 0; k < 5; k++) {
        gc();
        const b0 = newSpace();
        fn(N);
        best = Math.min(best, newSpace() - b0);
      }
      return best / N;
    };
    const level = per((n) => {
      let s = 0;
      for (let i = 0; i < n; i++) s += f.levelAt((i % 40) * 0.5 - 10, 1, ((i * 7) % 40) * 0.5 - 10);
      out[0] = s;
    });
    const body = per((n) => {
      let s = 0;
      for (let i = 0; i < n; i++) s += f.bodyLevel((i % 40) * 0.5 - 10, 0, ((i * 7) % 40) * 0.5 - 10, 1.75, occ);
      out[0] = s;
    });
    // a control that makes one 3-vector per query: what a real allocation looks like
    const ctl = per((n) => {
      let s = 0;
      for (let i = 0; i < n; i++) {
        const v = new Float64Array(3);
        v[0] = f.levelAt((i % 40) * 0.5 - 10, 1, ((i * 7) % 40) * 0.5 - 10);
        s += v[0];
      }
      out[0] = s;
    });
    console.info(`bytes per query: levelAt ${level.toFixed(1)}, bodyLevel ${body.toFixed(1)}, control with a vector ${ctl.toFixed(1)}`);
    expect(out[0]).toBeGreaterThan(0);
    expect(level).toBeLessThan(ctl - 32);
    expect(level).toBeLessThanOrEqual(BOXED_BUDGET);
    expect(body).toBeLessThanOrEqual(BOXED_BUDGET * 2);
  });

  it('trilinear reads match cell values at centres and clamp at the edges', () => {
    const g = new Uint8Array([0, 255, 0, 255, 0, 255, 0, 255]);
    expect(trilinear(g, 0, 0, 0, 0, 2, 2, 2, 1, 0.5, 0.5, 0.5)).toBe(0);
    expect(trilinear(g, 0, 0, 0, 0, 2, 2, 2, 1, 1.5, 0.5, 0.5)).toBe(1);
    expect(trilinear(g, 0, 0, 0, 0, 2, 2, 2, 1, 1, 0.5, 0.5)).toBeCloseTo(0.5, 9);
    expect(trilinear(g, 0, 0, 0, 0, 2, 2, 2, 1, -5, 0.5, 0.5)).toBe(0);
    expect(trilinear(g, 0, 0, 0, 0, 2, 2, 2, 1, 9, 0.5, 0.5)).toBe(1);
  });
});
