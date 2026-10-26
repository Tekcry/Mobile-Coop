import { describe, expect, it } from 'vitest';
import { AMBIENT_CELL, ambientFromGrid, buildAmbientGrid } from '../src/world/ambientGrid';
import { LightRegistry } from '../src/world/lights';
import { bakeMoon, MOON_CELL, type MoonJob } from '../src/voxel/skyBake';
import { packShapes, type VoxelShape } from '../src/voxel/shapes';
import { lightBakeHash, type LightBake } from '../src/world/lightBake';
import { bytesPerCall, HEAP_NUMBER, inputs } from './helpers/allocPerCall';
import { CAPSULE, capsuleTransmit, CHAR_LIGHT, CharOccluders, holds, OCC, OCC_KIND, occKey } from '../src/world/charOccluders';
import type { Occluder } from '../src/world/lights';
import { nsGrid2 } from './helpers/bounceRead';

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
 *  each). A vector, array or closure per query costs far more (the control). (LR16a) 64 -> 72: the photometric reach
 *  (1.6 x radius, the one light model) lists more lamps per 2 m column, and each extra lamp call boxes its doubles:
 *  levelAt 32 -> 68 B, bodyLevel 64.8 -> 134 B, the same as the pre-LR16a Realistic mode (reach 1.0: 32 B again). */
const BOXED_BUDGET = 72;

describe('light field (3.6)', async () => {
  const { LightField, trilinear } = await import('../src/world/lightField');
  const { bakeLamps, BOX_STRIDE, LAMP_CELL } = await import('../src/voxel/lampBake');
  const { bakedLights } = await import('../src/world/lightBake');
  const { buildAmbientGrid } = await import('../src/world/ambientGrid');
  const { makeCone } = await import('../src/world/lights');
  const { PHOTO } = await import('../src/world/lampMath');

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

  /** An independent sum: every lamp, the plain formula (LR16a: the photometric falloff, the one light model), its own
   *  trilinear reads (the ambient fill too: the shadow-accuracy read, always on). */
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
    let v = at(ag.data, 0, ag.origin, ag.n, AMBIENT_CELL);
    // (LR16-1) the lit lamps' bounce: their boxes summed in exact integers (q x round(intensity x 1024)), quantised
    // (x 2^-15 / 1024 x the gain, to a byte), their wall bits OR'd, read on the ambient grid's cells as the shader reads
    // the RGBA fill texture (fix round: never blended across a wall; `helpers/bounceRead.ts`)
    const bb = b.lamps!.r.bounce;
    if (bb) {
      const acc = new Float64Array(ag.data.length);
      const bits = new Uint16Array(ag.data.length);
      let bo = 0;
      b.lamps!.baked.ids.forEach((id, i) => {
        const [bx, by, bz, nx, ny, nz] = Array.from(bb.boxes.subarray(i * 6, i * 6 + 6)) as number[];
        const l = reg.lights[id]!;
        const w = l.on && !l.destroyed && l.intensity > 0 ? Math.round(l.intensity * 1024) : 0;
        for (let z = 0; z < nz!; z++) for (let y = 0; y < ny!; y++) for (let x = 0; x < nx!; x++) {
          const c = bx! + x + ag.n[0] * (by! + y + ag.n[1] * (bz! + z));
          acc[c] = acc[c]! + bb.data[bo]! * w;
          bits[c] = bits[c]! | (bb.bits ? bb.bits[bo]! : 0);
          bo++;
        }
      });
      const rgba = new Uint8Array(ag.data.length * 4);
      for (let c = 0; c < ag.data.length; c++) {
        rgba[c * 4 + 1] = Math.round(Math.min(1, acc[c]! * (2 ** -15 / 1024) * 1.2) * 255);
        rgba[c * 4 + 2] = bits[c]! & 255;
        rgba[c * 4 + 3] = bits[c]! >> 8;
      }
      v += nsGrid2(rgba, [x, y, z], [ag.origin[0], ag.origin[1], ag.origin[2], AMBIENT_CELL], ag.n)[1];
    }
    v += b.moonLight * at(b.moon.vis, 0, b.moon.origin, b.moon.n, MOON_CELL);
    let off = 0;
    b.lamps!.baked.ids.forEach((id, i) => {
      const B = b.lamps!.r.boxes.subarray(i * BOX_STRIDE, i * BOX_STRIDE + 6);
      const start = off;
      off += B[3]! * B[4]! * B[5]!;
      const l = reg.lights[id]!;
      if (!l.on || l.destroyed) return;
      // (the lamp data as the shaders and the field hold it: float32)
      const f = Math.fround;
      const dx = x - f(l.x);
      const dy = y - f(l.y);
      const dz = z - f(l.z);
      const R = f(l.radius);
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d >= R) return;
      const axis = l.cone ? [f(l.cone.dx), f(l.cone.dy), f(l.cone.dz)] : [0, -1, 0];
      const cosA = d > 1e-4 ? (dx * axis[0]! + dy * axis[1]! + dz * axis[2]!) / d : 1;
      const cut = l.cone ? f(l.cone.cosOuter) : Math.cos((Math.PI * 0.97) / 2);
      if (cosA <= cut) return;
      // (LR16b) the feathered edge: a smoothstep from the cut over 0.4 (lamps) / 0.65 (spots) of (1 - cut)
      const u = Math.min(1, (cosA - cut) / ((l.cone ? 0.65 : 0.4) * (1 - cut)));
      const cone = Math.pow(Math.max(cosA, 1e-4), l.cone ? 2 : 1) * u * u * (3 - 2 * u);
      // inverse square referenced at PHOTO.ref with the smooth near term (LR16b), windowed (1 - (d / R)^4)^2 to 0 at the reach
      const fall = (PHOTO.ref ** 2 + PHOTO.near ** 2) / (d * d + PHOTO.near ** 2) * (1 - (d / R) ** 4) ** 2;
      v += 1.2 * l.intensity * fall * cone * at(b.lamps!.r.vis, start, [B[0]!, B[1]!, B[2]!], [B[3]!, B[4]!, B[5]!], LAMP_CELL);
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

  it('(LR16e) field equals trilinear of the baked bytes in a penumbra band', () => {
    const { reg, bake } = scene();
    const f = new LightField(bake, reg);
    const { baked, r } = bake.lamps!;
    // the band: a one-sample lamp's cells between 0 and 255 (the LR16b bake gave those lamps only 0 or 255)
    const band: [number, number, number, number, number][] = [];
    let off = 0;
    for (let i = 0; i < baked.ids.length; i++) {
      const B = r.boxes.subarray(i * BOX_STRIDE, i * BOX_STRIDE + 6);
      const one = Math.max(baked.lights[i * 10 + 8]!, baked.lights[i * 10 + 9]!) < 0.75;
      for (let z = 0; one && z < B[5]!; z++) for (let y = 0; y < B[4]!; y++) for (let x = 0; x < B[3]!; x++) {
        const v = r.vis[off + x + B[3]! * (y + B[4]! * z)]!;
        if (v > 0 && v < 255) band.push([i, off, B[0]! + (x + 0.5) * LAMP_CELL, B[1]! + (y + 0.5) * LAMP_CELL, B[2]! + (z + 0.5) * LAMP_CELL]);
      }
      off += B[3]! * B[4]! * B[5]!;
    }
    expect(band.length).toBeGreaterThan(100);
    let seed = 5;
    const rnd = (): number => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    let soft = 0;
    for (let k = 0; k < 200; k++) {
      const [i, start, cx, cy, cz] = band[Math.floor(rnd() * band.length)]!;
      const x = cx + (rnd() - 0.5) * LAMP_CELL;
      const y = Math.max(0.02, cy + (rnd() - 0.5) * LAMP_CELL);
      const z = cz + (rnd() - 0.5) * LAMP_CELL;
      const B = r.boxes.subarray(i * BOX_STRIDE, i * BOX_STRIDE + 6);
      const own = trilinear(r.vis, start, B[0]!, B[1]!, B[2]!, B[3]!, B[4]!, B[5]!, LAMP_CELL, x, y, z);
      const vis = f.visAt(i, x, y, z);
      expect(vis, `lamp ${i} at ${x.toFixed(2)} ${y.toFixed(2)} ${z.toFixed(2)}`).toBeCloseTo(own, 9);
      if (vis > 0.02 && vis < 0.98) soft++;
      // the meter and the guards' sample: the shaders' formula x these bytes (the brute-force sum)
      expect(f.levelAt(x, y, z)).toBeCloseTo(brute(reg, bake, x, y, z), 6);
    }
    expect(soft).toBeGreaterThan(50);
  });

  it('(LR16-1) level adds the bounce read as the picture reads it (fix round: walls kept)', () => {
    const { reg, bake } = scene();
    const f = new LightField(bake, reg);
    // the same bake without its bounce: the level before LR16-1
    const bare = new LightField({ ...bake, lamps: { baked: bake.lamps!.baked, r: { ...bake.lamps!.r, bounce: undefined } } }, reg);
    expect(f.bounce.active).toBe(true);
    expect(bare.bounce.active).toBe(false);
    const bg = f.bounce;
    let seed = 13;
    const rnd = (): number => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    let lit = 0;
    for (let i = 0; i < 300; i++) {
      const x = -10 + rnd() * 20;
      const y = 0.05 + rnd() * 3.5;
      const z = -10 + rnd() * 20;
      const b = f.bounceAt(x, y, z);
      // the bounce grid's own bytes and wall bits on the ambient grid's cells, read as the shader's nsGrid2 reads them
      const rgba = new Uint8Array(bg.g.length * 4);
      for (let c = 0; c < bg.g.length; c++) {
        rgba[c * 4 + 1] = bg.g[c]!;
        rgba[c * 4 + 2] = bg.bits[c]! & 255;
        rgba[c * 4 + 3] = bg.bits[c]! >> 8;
      }
      expect(b).toBeCloseTo(nsGrid2(rgba, [x, y, z], [bg.origin[0], bg.origin[1], bg.origin[2], AMBIENT_CELL], bg.n)[1], 12);
      const before = bare.levelAt(x, y, z);
      if (before + b < 1) expect(f.levelAt(x, y, z)).toBeCloseTo(before + b, 12);
      else expect(f.levelAt(x, y, z)).toBe(1);
      if (b > 0.02) lit++;
    }
    expect(lit).toBeGreaterThan(30);
    // the west lamp's bounce goes with it, at once: its floor under it keeps only the others' bounce
    const p = [-3, 0.5, 0] as const;
    const on = f.bounceAt(...p);
    reg.setOn(0, false);
    expect(f.bounceAt(...p)).toBeLessThan(on - 0.05);
    expect(f.levelAt(...p)).toBeCloseTo(brute(reg, bake, ...p), 6);
    reg.setOn(0, true);
    expect(f.bounceAt(...p)).toBe(on);
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
    // (sector-batch, G41) a leaf 12% into its swing is still shut for light; past 15% the light comes through
    door.open = 0.12;
    expect(f.lampAt(0, ...p)).toBe(0);
    door.open = 0.2;
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
    const out = new Float64Array(1);
    // Under load (an e2e run alongside, a low-priority laptop) the old 5-round reading skewed: the background compiler
    // had not installed the optimized loop yet, so the field's doubles were still boxed (35-42 B a query, optimized
    // 32.4), and a scavenge inside the 1.4 MB control round shrank new space (the control read 15 B). So: rounds that
    // fit in new space after a gc() (the control 2000 x 272 B, about 0.5 MB, under the 1 MB minimum semi-space), and up
    // to 40 of them. Each keeps its smallest round. The control runs all 40; each field query stops once its smallest
    // meets its limit (a query that allocates an object never gets there). Still flaky under load (4.60.0): the rounds
    // read whatever tier a starved background compiler had reached (bodyLevel in Sparkplug 100-127 B against 128), so
    // the helper now tiers up synchronously and every run reads the optimized code (levelAt 32.0, bodyLevel 64.8,
    // control 272.0). The method is shared: tests/helpers/allocPerCall.ts (heap-asserts).
    const per = (fn: (n: number) => void, goal = -Infinity, n = 5000): Promise<number> => bytesPerCall(fn, goal, { n, warm: 500000 });
    // a control that makes one 3-vector per query: what a real allocation looks like (kept in a small ring so it
    // escapes: a fully optimized loop otherwise scalar-replaces part of it and the control read 63 B instead of 272)
    const ring: Float64Array[] = new Array<Float64Array>(64);
    const ctl = await per((n) => {
      let s = 0;
      for (let i = 0; i < n; i++) {
        const v = new Float64Array(3);
        v[0] = f.levelAt((i % 40) * 0.5 - 10, 1, ((i * 7) % 40) * 0.5 - 10);
        ring[i & 63] = v;
        s += v[0];
      }
      out[0] = s;
    }, -Infinity, 2000);
    // A query over its limit is measured once more from a fresh warm-up and keeps the smaller reading. A query that
    // allocates an object reads its size in both measurements, so the retry cannot hide one. (#322's 173.2 B bodyLevel
    // reading was not load: it is a fixed per-process V8 mode the retry repeats; see the bodyLevel limit below.)
    const retry = async (fn: (n: number) => void, goal: number): Promise<number> => {
      const first = await per(fn, goal);
      return first <= goal ? first : Math.min(first, await per(fn, goal));
    };
    const level = await retry((n) => {
      let s = 0;
      for (let i = 0; i < n; i++) s += f.levelAt((i % 40) * 0.5 - 10, 1, ((i * 7) % 40) * 0.5 - 10);
      out[0] = s;
    }, Math.min(BOXED_BUDGET, ctl - 33));
    // (test-flakes) bodyLevel is judged against this run's levelAt, not an absolute 144 B. It is two level queries plus
    // the dynamic pass, so it reads about 2 x levelAt (CI 126.8 = 2 x 64.4 - 2, local 112.0 = 2 x 56.8 - 1.6). In about
    // 1 CI run in 15 (4 of 57 runs read on 2026-10-24: train/71 556d861d and PR #361 attempt 1, 40087823856, #322) V8
    // makes a different choice for the whole process and bodyLevel reads exactly 173.2 (2 x 64.4 + 44.4), the in-process
    // retry the same 173.2 again (the code and its feedback are already fixed), the rerun 126.8: no code reached it.
    // Allowed: 2 x levelAt + BODY_SLACK (56: that variant + 11.6). Still caught: a vector per call (the control, about
    // 224 B more than levelAt), and an object or closure in totalInto / dynamicInto / levelInto (it runs twice per
    // bodyLevel: 2 x 48 B and up). An object in levelInto also fails levelAt's own limit above. Not caught: one object
    // of about 48 B made once in bodyLevel's own body (it cannot be told apart from the 173.2 variant).
    const BODY_SLACK = 56;
    const bodyLimit = 2 * level + BODY_SLACK;
    const body = await retry((n) => {
      let s = 0;
      for (let i = 0; i < n; i++) s += f.bodyLevel((i % 40) * 0.5 - 10, 0, ((i * 7) % 40) * 0.5 - 10, 1.75, occ);
      out[0] = s;
    }, bodyLimit);
    console.info(`bytes per query: levelAt ${level.toFixed(1)}, bodyLevel ${body.toFixed(1)} (limit ${bodyLimit.toFixed(1)}), control with a vector ${ctl.toFixed(1)}`);
    expect(out[0]).toBeGreaterThan(0);
    expect(level).toBeLessThan(ctl - 32);
    expect(level).toBeLessThanOrEqual(BOXED_BUDGET);
    expect(body).toBeLessThanOrEqual(bodyLimit);
  });

  // ---- (char-shadow-meter S1, J16) the character term: the gameplay lamp set x the soft capsules (PLAN section 1) ----

  /** A source's position as the field uses it: registry id (a baked lamp with its swing, a non-baked light) or -1 the
   *  moon (60 m along its direction from the point). */
  function sourcePos(reg: LightRegistry, b: LightBake, id: number, x: number, y: number, z: number): [number, number, number] {
    if (id === -1) {
      const d = b.moon.dir;
      return [x + d[0] * CHAR_LIGHT.moonFar, y + d[1] * CHAR_LIGHT.moonFar, z + d[2] * CHAR_LIGHT.moonFar];
    }
    const l = reg.lights[id]!;
    const bi = b.lamps!.baked.ids.indexOf(id);
    if (bi < 0) return [l.x, l.y, l.z];
    // (the baked position, float32, as the field holds it)
    const L = b.lamps!.baked.lights;
    const st = L.length / b.lamps!.baked.ids.length;
    return [L[bi * st]! + l.swx, L[bi * st + 1]! + l.swy, L[bi * st + 2]! + l.swz];
  }

  /** The expectation from the parts: today's total, less each set member's share the capsules take (its term x (1 -
   *  the brute-force product over the contract)). Only while nothing clamps at 1. */
  function expected(f: InstanceType<typeof LightField>, reg: LightRegistry, b: LightBake, c: CharOccluders, x: number, y: number, z: number, skip: number, occ?: Occluder): { v: number; hit: number[] } {
    const ids = new Int32Array(64);
    const lv = new Float32Array(64);
    const n = f.sourcesInto(x, y, z, ids, lv, 64, occ);
    let v = f.totalAt(x, y, z, occ);
    const hit: number[] = [];
    for (let k = 0; k < n; k++) {
      const id = ids[k]!;
      const [sx, sy, sz] = sourcePos(reg, b, id, x, y, z);
      let t = 1;
      for (let i = 0; i < c.n; i++) {
        if (c.owner[i] === skip) continue;
        const o = i * OCC.stride;
        const C = c.cap;
        if (holds(sx, sy, sz, C[o]!, C[o + 1]!, C[o + 2]!, C[o + 3]!, C[o + 4]!, C[o + 5]!, C[o + 6]!)) continue;
        t *= capsuleTransmit(x, y, z, sx, sy, sz, C[o]!, C[o + 1]!, C[o + 2]!, C[o + 3]!, C[o + 4]!, C[o + 5]!, C[o + 6]!);
      }
      if (t < 1) hit.push(id);
      v -= f.sourceAt(id, x, y, z, occ) * (1 - t);
    }
    return { v, hit };
  }

  const upright = (c: CharOccluders, kind: number, index: number, x: number, y: number, z: number, h = 1.75, r = 0.3): number => c.add(kind, index, x, y + r, z, x, y + h - r, z, r);

  it('no contract, or an empty one, gives today\'s values to the bit', () => {
    const { reg, bake } = scene();
    reg.add({ kind: 'flashlight', x: 5, y: 1.5, z: 5, radius: 10, intensity: 0.8, cone: makeCone(0, 0, 1, 0.4), on: true });
    const f = new LightField(bake, reg);
    const empty = new CharOccluders();
    const occ = (): boolean => false;
    let seed = 41;
    const rnd = (): number => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 500; i++) {
      const x = -10 + rnd() * 20;
      const y = 0.05 + rnd() * 3.5;
      const z = -10 + rnd() * 20;
      const t = f.totalAt(x, y, z, occ);
      expect(Object.is(f.totalAt(x, y, z, occ, null, 5), t)).toBe(true);
      expect(Object.is(f.totalAt(x, y, z, occ, empty, -1), t)).toBe(true);
      const body = f.bodyLevel(x, 0, z, 1.75, occ, 0.1, 0);
      expect(Object.is(f.bodyLevel(x, 0, z, 1.75, occ, 0.1, 0, empty, -1), body)).toBe(true);
    }
  });

  it('a guard between one lamp and the chest scales only that lamp\'s share, by the formula (0.15 in the umbra)', () => {
    const { reg, bake } = scene();
    const f = new LightField(bake, reg);
    // the west lamp (id 0, at -3, 3, 0) and a chest 2.4 m from it under the roof; a guard stands across the ray
    const p = [-1.2, 1.1, -1.6] as const;
    const [lx, ly, lz] = sourcePos(reg, bake, 0, ...p);
    const L = f.lampAt(0, ...p);
    expect(L).toBeGreaterThan(CHAR_LIGHT.minLevel);
    const before = f.totalAt(...p);
    expect(before).toBeLessThan(1);
    const c = new CharOccluders();
    // (a quarter of the way to the lamp, his head just under the ray)
    upright(c, OCC_KIND.guard, 4, -1.65, 0, -1.2);
    const T = capsuleTransmit(...p, lx, ly, lz, -1.65, 0.3, -1.2, -1.65, 1.45, -1.2, 0.3);
    expect(T).toBeLessThan(1);
    const got = f.totalAt(...p, undefined, c, -1);
    const want = expected(f, reg, bake, c, ...p, -1);
    // only the west lamp is shaded
    expect(want.hit).toEqual([0]);
    expect(got).toBeCloseTo(before - L * (1 - T), 12);
    expect(got).toBeCloseTo(want.v, 12);
    // straight into the umbra: the lamp's share drops to its floor
    const u = new CharOccluders();
    u.add(OCC_KIND.body, 0, -1.65, 1.575, -1.6, -1.65, 1.575, -0.8, 0.3);
    expect(capsuleTransmit(...p, lx, ly, lz, -1.65, 1.575, -1.6, -1.65, 1.575, -0.8, 0.3)).toBe(CAPSULE.floor);
    expect(expected(f, reg, bake, u, ...p, -1).hit).toEqual([0]);
    expect(f.totalAt(...p, undefined, u, -1)).toBeCloseTo(before - L * (1 - CAPSULE.floor), 12);
    // the sampled character's own capsule never shades him (owner skip; and his chest is on its own surface)
    const own = new CharOccluders();
    const key = occKey(OCC_KIND.player, 0);
    upright(own, OCC_KIND.player, 0, p[0], 0, p[2]);
    expect(Object.is(f.bodyLevel(p[0], 0, p[2], 1.75, undefined, 0, 0, own, key), f.bodyLevel(p[0], 0, p[2], 1.75))).toBe(true);
    expect(Object.is(f.bodyLevel(p[0], 0, p[2], 1.75, undefined, 0, 0, own, -1), f.bodyLevel(p[0], 0, p[2], 1.75))).toBe(true);
  });

  it('random scenes: the field with a contract equals the parts (set members x the brute-force product)', () => {
    const { reg, bake } = scene();
    reg.add({ kind: 'flashlight', x: 5, y: 1.5, z: 5, radius: 10, intensity: 0.8, cone: makeCone(0, 0, 1, 0.4), on: true });
    const f = new LightField(bake, reg);
    const occ = (): boolean => false;
    let seed = 77;
    const rnd = (): number => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    let shaded = 0;
    let n = 0;
    for (let s = 0; s < 40; s++) {
      const c = new CharOccluders();
      for (let i = 0; i < 12; i++) upright(c, i < 4 ? OCC_KIND.player : OCC_KIND.guard, i, -9 + rnd() * 18, 0, -9 + rnd() * 18);
      for (let k = 0; k < 40; k++) {
        const x = -9 + rnd() * 18;
        const y = 0.3 + rnd() * 1.6;
        const z = -9 + rnd() * 18;
        if (f.totalAt(x, y, z, occ) >= 1) continue;
        const skip = rnd() < 0.5 ? c.owner[Math.floor(rnd() * c.n)]! : -1;
        const want = expected(f, reg, bake, c, x, y, z, skip, occ);
        expect(f.totalAt(x, y, z, occ, c, skip), `${x.toFixed(2)} ${y.toFixed(2)} ${z.toFixed(2)}`).toBeCloseTo(Math.max(0, want.v), 9);
        if (want.hit.length) shaded++;
        n++;
      }
    }
    expect(n).toBeGreaterThan(800);
    expect(shaded).toBeGreaterThan(40);
  });

  it('a lamp giving under CHAR_LIGHT.minLevel at the point is never shaded', () => {
    const { reg, bake } = scene();
    const f = new LightField(bake, reg);
    let seed = 3;
    const rnd = (): number => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    let found = 0;
    for (let k = 0; k < 4000 && found < 20; k++) {
      const x = -10 + rnd() * 20;
      const y = 0.3 + rnd() * 1.5;
      const z = -10 + rnd() * 20;
      for (let i = 0; i < bake.lamps!.baked.ids.length; i++) {
        const L = f.lampAt(i, x, y, z);
        if (!(L > 0.002 && L < CHAR_LIGHT.minLevel)) continue;
        const id = bake.lamps!.baked.ids[i]!;
        const [sx, sy, sz] = sourcePos(reg, bake, id, x, y, z);
        // a body lying across the ray, a third of the way to the lamp: its umbra
        const mx = x + (sx - x) / 3;
        const my = y + (sy - y) / 3;
        const mz = z + (sz - z) / 3;
        const ux = -(sz - z);
        const uz = sx - x;
        const ul = Math.sqrt(ux * ux + uz * uz) || 1;
        const c = new CharOccluders();
        c.add(OCC_KIND.body, 0, mx - (ux / ul) * 0.7, my, mz - (uz / ul) * 0.7, mx + (ux / ul) * 0.7, my, mz + (uz / ul) * 0.7, 0.3);
        expect(capsuleTransmit(x, y, z, sx, sy, sz, mx - (ux / ul) * 0.7, my, mz - (uz / ul) * 0.7, mx + (ux / ul) * 0.7, my, mz + (uz / ul) * 0.7, 0.3)).toBeLessThan(0.5);
        const want = expected(f, reg, bake, c, x, y, z, -1);
        // (the lamp is not a set member there; when the body shades no member the total is today's to the bit)
        if (f.totalAt(x, y, z) >= 1) continue;
        expect(want.hit).not.toContain(id);
        if (want.hit.length === 0) expect(Object.is(f.totalAt(x, y, z, undefined, c, -1), f.totalAt(x, y, z))).toBe(true);
        else expect(f.totalAt(x, y, z, undefined, c, -1)).toBeCloseTo(want.v, 12);
        found++;
      }
    }
    expect(found).toBeGreaterThanOrEqual(5);
  });

  it('the moon: a capsule along moon.dir scales its share', () => {
    const { reg, bake } = scene();
    const f = new LightField(bake, reg);
    // out in the open east of the wall, far from the lamps' columns where possible
    const p = [8, 0.8, 8] as const;
    expect(f.moonAt(...p)).toBeGreaterThan(0.99);
    const moon = bake.moonLight * f.moonAt(...p);
    const before = f.totalAt(...p);
    expect(before).toBeLessThan(1);
    const d = bake.moon.dir;
    // a guard 1.5 m towards the moon, lying across its ray (an up-tilted ray: a horizontal capsule along z)
    const cx = p[0] + d[0] * 1.5;
    const cy = p[1] + d[1] * 1.5;
    const cz = p[2] + d[2] * 1.5;
    const c = new CharOccluders();
    c.add(OCC_KIND.guard, 1, cx, cy, cz - 0.6, cx, cy, cz + 0.6, 0.3);
    const T = capsuleTransmit(...p, p[0] + d[0] * 60, p[1] + d[1] * 60, p[2] + d[2] * 60, cx, cy, cz - 0.6, cx, cy, cz + 0.6, 0.3);
    expect(T).toBe(CAPSULE.floor);
    const want = expected(f, reg, bake, c, ...p, -1);
    expect(want.hit).toContain(-1);
    expect(f.totalAt(...p, undefined, c, -1)).toBeCloseTo(want.v, 12);
    if (want.hit.length === 1) expect(f.totalAt(...p, undefined, c, -1)).toBeCloseTo(before - moon * (1 - T), 12);
  });

  it('a flashlight held inside a capsule is not shadowed by its holder (A5); a guard in its beam shadows it', () => {
    const { reg, bake } = scene();
    const t = reg.add({ kind: 'flashlight', x: 5, y: 1.5, z: 5, radius: 10, intensity: 0.8, cone: makeCone(0, 0, 1, 0.4), on: true });
    const f = new LightField(bake, reg);
    const p = [5, 1.3, 8.5] as const;
    const D = f.sourceAt(t.id, ...p);
    expect(D).toBeGreaterThan(0.2);
    const before = f.totalAt(...p);
    expect(before).toBeLessThan(1);
    // the holder stands 0.25 m behind his torch
    const c = new CharOccluders();
    upright(c, OCC_KIND.guard, 0, 5, 0, 4.75);
    const held = expected(f, reg, bake, c, ...p, -1);
    expect(held.hit).not.toContain(t.id);
    expect(f.totalAt(...p, undefined, c, -1)).toBeCloseTo(held.v, 12);
    // a second guard standing in the beam, 1.5 m in front of the torch
    upright(c, OCC_KIND.guard, 1, 5, 0, 6.5);
    const beam = expected(f, reg, bake, c, ...p, -1);
    expect(beam.hit).toContain(t.id);
    const got = f.totalAt(...p, undefined, c, -1);
    expect(got).toBeCloseTo(beam.v, 12);
    expect(got).toBeLessThan(before - D * 0.5);
  });

  it('sourcesInto lists the set the contract term walks, strongest first; sourceAt of each sums with the rest to totalAt', () => {
    const { reg, bake } = scene();
    reg.add({ kind: 'flashlight', x: 5, y: 1.5, z: 5, radius: 10, intensity: 0.8, cone: makeCone(0, 0, 1, 0.4), on: true });
    const f = new LightField(bake, reg);
    const occ = (): boolean => false;
    const ids = new Int32Array(32);
    const lv = new Float32Array(32);
    const top = new Int32Array(2);
    const topLv = new Float32Array(2);
    const ag = bake.ambient;
    const lampIds = bake.lamps!.baked.ids;
    let seed = 19;
    const rnd = (): number => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    let multi = 0;
    let checked = 0;
    for (let k = 0; k < 400; k++) {
      const x = -10 + rnd() * 20;
      const y = 0.05 + rnd() * 3.5;
      const z = -10 + rnd() * 20;
      const n = f.sourcesInto(x, y, z, ids, lv, 32, occ);
      for (let j = 1; j < n; j++) expect(lv[j]!).toBeLessThanOrEqual(lv[j - 1]!);
      if (n > 1) multi++;
      // each member's term, as listed
      for (let j = 0; j < n; j++) expect(f.sourceAt(ids[j]!, x, y, z, occ)).toBeCloseTo(lv[j]!, 6);
      // the set: the baked lamps giving at least minLevel here, the moon where it reaches, the lit flashlight
      const listed = new Set(Array.from(ids.subarray(0, n)));
      for (let i = 0; i < lampIds.length; i++) expect(listed.has(lampIds[i]!), `lamp ${i}`).toBe(f.lampAt(i, x, y, z) >= CHAR_LIGHT.minLevel);
      expect(listed.has(-1)).toBe(bake.moonLight * f.moonAt(x, y, z) > 0);
      // a short list keeps the strongest
      const m = f.sourcesInto(x, y, z, top, topLv, 2, occ);
      expect(m).toBe(Math.min(2, n));
      for (let j = 0; j < m; j++) expect(topLv[j]).toBe(lv[j]);
      // ambient + bounce + the members + the lamps under minLevel = today's total (while nothing clamps)
      const total = f.totalAt(x, y, z, occ);
      if (total >= 1) continue;
      let sum = trilinear(ag.data, 0, ag.origin[0], ag.origin[1], ag.origin[2], ag.n[0], ag.n[1], ag.n[2], AMBIENT_CELL, x, y, z) + f.bounceAt(x, y, z);
      for (let j = 0; j < n; j++) sum += f.sourceAt(ids[j]!, x, y, z, occ);
      for (let i = 0; i < lampIds.length; i++) {
        const L = f.lampAt(i, x, y, z);
        if (L < CHAR_LIGHT.minLevel) sum += L;
      }
      expect(sum, `${x.toFixed(2)} ${y.toFixed(2)} ${z.toFixed(2)}`).toBeCloseTo(total, 9);
      checked++;
    }
    expect(multi).toBeGreaterThan(50);
    expect(checked).toBeGreaterThan(200);
    // the moon and a non-baked light by id; an unknown id reads 0
    expect(f.sourceAt(-1, 8, 1, 8)).toBeCloseTo(bake.moonLight * f.moonAt(8, 1, 8), 12);
    expect(f.sourceAt(-7, 8, 1, 8)).toBe(0);
    expect(f.sourceAt(999, 8, 1, 8)).toBe(0);
  });

  it('(S3b) the Q calls equal their plain calls to the bit on 500 random points (with and without a contract, every set member id, -1 the moon)', () => {
    const { reg, bake } = scene();
    reg.add({ kind: 'flashlight', x: 5, y: 1.5, z: 5, radius: 10, intensity: 0.8, cone: makeCone(0, 0, 1, 0.4), on: true });
    const door = { anchor: { hinge: { x: 0, y: 0, z: 0 }, yaw: 0, width: 1.2, height: 2.2 }, open: 0 };
    const f = new LightField(bake, reg, [door]);
    const occ = (): boolean => false;
    const c = new CharOccluders();
    let seed = 23;
    const rnd = (): number => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 8; i++) upright(c, OCC_KIND.guard, i, -9 + rnd() * 18, 0, -9 + rnd() * 18);
    const ids = new Int32Array(16);
    const lv = new Float32Array(16);
    const qIds = new Int32Array(16);
    const qLv = new Float32Array(16);
    const moonId = -1;
    let members = 0;
    let moon = 0;
    for (let k = 0; k < 500; k++) {
      const x = -10 + rnd() * 20;
      const y = 0.05 + rnd() * 3.5;
      const z = -10 + rnd() * 20;
      f.qp[0] = x;
      f.qp[1] = y;
      f.qp[2] = z;
      for (const max of [16, 2]) {
        const n = f.sourcesInto(x, y, z, ids, lv, max, occ);
        expect(f.sourcesQ(qIds, qLv, max, occ)).toBe(n);
        for (let j = 0; j < n; j++) {
          expect(qIds[j]).toBe(ids[j]);
          expect(qLv[j]).toBe(lv[j]);
        }
      }
      const n = f.sourcesInto(x, y, z, ids, lv, 16, occ);
      for (let j = 0; j < n; j++) {
        f.sourceQ(ids[j]!, occ);
        expect(f.qr[0]).toBe(f.sourceAt(ids[j]!, x, y, z, occ));
        members++;
        if (ids[j] === moonId) moon++;
      }
      // the moon, an unknown id and a negative one, every registry id
      for (const id of [moonId, -7, 999, 0, 1, 2, 3, 4]) {
        f.sourceQ(id, occ);
        expect(f.qr[0], `id ${id}`).toBe(f.sourceAt(id, x, y, z, occ));
      }
      f.totalQ(occ, null, -1);
      expect(f.qr[0]).toBe(f.totalAt(x, y, z, occ));
      f.totalQ(undefined, null, -1);
      expect(f.qr[0]).toBe(f.totalAt(x, y, z));
      for (const skip of [-1, 3]) {
        f.totalQ(occ, c, skip);
        expect(f.qr[0]).toBe(f.totalAt(x, y, z, occ, c, skip));
      }
    }
    expect(members).toBeGreaterThan(500);
    expect(moon).toBeGreaterThan(50);
  });

  it('allocation-free with a contract: totalAt / bodyLevel / sourcesInto / sourceAt add nothing to the no-contract reading', async () => {
    const { reg, bake } = scene();
    reg.add({ kind: 'flashlight', x: 5, y: 1.5, z: 5, radius: 10, intensity: 0.8, cone: makeCone(0, 0, 1, 0.4), on: true });
    const door = { anchor: { hinge: { x: 0, y: 0, z: 0 }, yaw: 0, width: 1.2, height: 2.2 }, open: 0 };
    const f = new LightField(bake, reg, [door]);
    const occ = (): boolean => false;
    // 16 characters spread over the room, so most queries test a few capsules
    const c = new CharOccluders();
    let seed = 5;
    const rnd = (): number => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 16; i++) upright(c, OCC_KIND.guard, i, -9 + rnd() * 18, 0, -9 + rnd() * 18);
    const N = 2000;
    const X = inputs(N, (k) => (k % 40) * 0.5 - 10);
    const Z = inputs(N, (k) => ((k * 7) % 40) * 0.5 - 10);
    const ids = new Int32Array(8);
    const lv = new Float32Array(8);
    const out = new Float64Array(1);
    let hit = 0;
    for (let i = 0; i < N; i++) if (f.totalAt(X[i]!, 1, Z[i]!, occ, c, -1) < f.totalAt(X[i]!, 1, Z[i]!, occ)) hit++;
    const per = (fn: (n: number) => void, goal: number): Promise<number> => bytesPerCall(fn, goal, { n: N, warm: 500000 });
    const ring: Float64Array[] = new Array<Float64Array>(64);
    const ctl = await per((n) => {
      let s = 0;
      for (let i = 0; i < n; i++) {
        const v = new Float64Array(3);
        v[0] = f.totalAt(X[i]!, 1, Z[i]!, occ, c, -1);
        ring[i & 63] = v;
        s += v[0];
      }
      out[0] = s;
    }, -Infinity);
    const plain = await per((n) => {
      let s = 0;
      for (let i = 0; i < n; i++) s += f.totalAt(X[i]!, 1, Z[i]!, occ);
      out[0] = s;
    }, -Infinity);
    const total = await per((n) => {
      let s = 0;
      for (let i = 0; i < n; i++) s += f.totalAt(X[i]!, 1, Z[i]!, occ, c, -1);
      out[0] = s;
    }, plain);
    const plainBody = await per((n) => {
      let s = 0;
      for (let i = 0; i < n; i++) s += f.bodyLevel(X[i]!, 0, Z[i]!, 1.75, occ);
      out[0] = s;
    }, -Infinity);
    const body = await per((n) => {
      let s = 0;
      for (let i = 0; i < n; i++) s += f.bodyLevel(X[i]!, 0, Z[i]!, 1.75, occ, 0, 0, c, 3);
      out[0] = s;
    }, plainBody);
    const src = await per((n) => {
      let s = 0;
      for (let i = 0; i < n; i++) s += f.sourcesInto(X[i]!, 1, Z[i]!, ids, lv, 8, occ);
      out[0] = s;
    }, 0);
    const one = await per((n) => {
      let s = 0;
      for (let i = 0; i < n; i++) s += f.sourceAt(i & 3, X[i]!, 1, Z[i]!, occ);
      out[0] = s;
    }, 0);
    console.info(`bytes per query with a contract: totalAt ${total.toFixed(1)} (none ${plain.toFixed(1)}), bodyLevel ${body.toFixed(1)} (none ${plainBody.toFixed(1)}), sourcesInto ${src.toFixed(1)}, sourceAt ${one.toFixed(1)}; control with a vector ${ctl.toFixed(1)}; ${hit} of ${N} shaded`);
    expect(hit).toBeGreaterThan(N / 20);
    // the contract adds no allocation (measured +2 B and +1.6 B: two boxed doubles of slack for V8's choices; an object
    // in the character path, 48 B and up, still fails)
    expect(total).toBeLessThanOrEqual(plain + 2 * HEAP_NUMBER);
    expect(body).toBeLessThanOrEqual(plainBody + 2 * HEAP_NUMBER);
    expect(total).toBeLessThan(ctl - 32);
    expect(src).toBeLessThanOrEqual(BOXED_BUDGET);
    expect(one).toBeLessThanOrEqual(BOXED_BUDGET);
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

describe('per-lamp door lists (3.6, shared by the shaders and the field)', async () => {
  const { lampDoorLists, DOORS_PER_LAMP } = await import('../src/world/lightField');
  const { LAMP_STRIDE } = await import('../src/voxel/lampBake');
  const door = (x: number, z: number, yaw = 0): { anchor: { hinge: { x: number; y: number; z: number }; yaw: number; width: number; height: number }; open: number } => ({ anchor: { hinge: { x, y: 0, z }, yaw, width: 1, height: 2.1 }, open: 0 });
  const lamp = (x: number, y: number, z: number, r: number): number[] => [x, y, z, r, 0, -1, 0, -2, 0, 0];

  it('lists the doors within reach, nearest first, up to the cap; none is -1', () => {
    const L = new Float32Array([...lamp(0, 3, 0, 5), ...lamp(30, 3, 0, 4)]);
    const doors = [door(4, 0), door(1, 0), door(2, 1), door(-2, -1), door(0, 3), door(50, 50)];
    const out = lampDoorLists(L, doors);
    expect(out.length).toBe(2 * DOORS_PER_LAMP);
    // lamp 0: five doors within reach (leaf middles at (4, 0.5), (1, 0.5), (2, 1.5), (-2, -0.5), (0, 3.5)), the four nearest kept
    const first = [...out.subarray(0, DOORS_PER_LAMP)];
    expect(first).not.toContain(5);
    expect(first.length).toBe(4);
    expect(first[0]).toBe(1);
    // lamp 1: nothing near
    expect([...out.subarray(DOORS_PER_LAMP)]).toEqual([-1, -1, -1, -1]);
    expect(L.length / LAMP_STRIDE).toBe(2);
  });
});
