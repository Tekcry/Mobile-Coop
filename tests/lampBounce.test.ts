/**
 * (LR16-1) One-bounce fill, the bake (`src/voxel/lampBounce.ts`) read through the light field: the ceiling over a lamp
 * and the walls beside its pool take the light the pool throws; a wall stops it; no lamp, no bounce; the uplight is a
 * downward lamp's only; the bake is deterministic and costs at most a quarter of the lamp bake (ctcourse). (Fix round)
 * A wall or a slab anywhere inside its 1 m cell lets nothing through, and the lit side keeps its light.
 */
import { describe, expect, it } from 'vitest';
import { bakeLamps } from '../src/voxel/lampBake';
import { BOUNCE } from '../src/voxel/lampBounce';
import { packShapes } from '../src/voxel/shapes';
import { bakedLights } from '../src/world/lightBake';
import { LightRegistry } from '../src/world/lights';
import { bakeRoom, LAMP_A, roomA, SHARED_WALL, slabProbe, tallHall, TWO_HI, TWO_LO, twoRooms, wallProbe } from './helpers/bounceRoom';

/** The bounce bytes (`g` / 255) of the cell holding (x, y, z). */
const cellAt = (f: ReturnType<typeof roomA>['field'], x: number, y: number, z: number): number => {
  const g = f.bounce;
  const i = Math.floor(x - g.origin[0]) + g.n[0] * (Math.floor(y - g.origin[1]) + g.n[1] * Math.floor(z - g.origin[2]));
  return g.g[i]! / 255;
};

describe('(LR16-1) one-bounce fill: the bake', () => {
  const A = roomA();
  const f = A.field;
  // the floor under the lamp, read as the picture reads a floor (0.25 m off it)
  const floor = f.levelAt(LAMP_A.x, 0.25, LAMP_A.z);

  it('ceiling over a lamp is lit', () => {
    // the ceiling (y 3) as the shader reads it: 0.25 m under it
    const ceil = f.bounceAt(LAMP_A.x, 2.75, LAMP_A.z);
    console.info(`ceiling bounce ${ceil.toFixed(3)}, floor level under the lamp ${floor.toFixed(3)}`);
    expect(floor).toBeGreaterThan(0.9);
    expect(ceil).toBeGreaterThan(0.04);
    expect(ceil).toBeGreaterThanOrEqual(0.1 * floor);
    // without the bounce the ceiling over a downward lamp is black (the hemisphere stops under it)
    expect(f.levelAt(LAMP_A.x, 2.95, LAMP_A.z) - f.bounceAt(LAMP_A.x, 2.95, LAMP_A.z)).toBeLessThan(0.01);
  });

  it('wall beside a pool reads >= 0.2 of the pool', () => {
    // the pool's edge: where the floor's direct light (the lamp alone) falls under the shadow line (0.28) towards the
    // shared wall
    let edge = LAMP_A.x;
    for (let x = LAMP_A.x; x < SHARED_WALL; x += 0.05) {
      if (f.lampAt(0, x, 0.25, LAMP_A.z) < 0.28) break;
      edge = x;
    }
    // the wall 1 m outside the pool edge (the fixture's own geometry)
    expect(Math.abs(SHARED_WALL - edge - 1)).toBeLessThan(0.1);
    const p = [SHARED_WALL - 0.25, 1.5, LAMP_A.z] as const;
    const total = f.levelAt(...p);
    const bounce = f.bounceAt(...p);
    console.info(`pool edge ${edge.toFixed(2)} m, wall at 1.5 m: total ${total.toFixed(3)} (bounce ${bounce.toFixed(3)}), pool floor ${floor.toFixed(3)}`);
    expect(total).toBeGreaterThanOrEqual(0.2 * floor);
    expect(bounce).toBeGreaterThan(0.02);
  });

  it('no bounce through a wall', () => {
    let worstNear = 0;
    let worstCell = 0;
    for (let z = 0.5; z < 10; z += 1) {
      for (let y = 0.5; y < 3; y += 0.5) {
        // 1 m behind the wall's far face (x 10.6), and the straddling cell (x 10..11, the wall at 10.4..10.6)
        worstNear = Math.max(worstNear, f.bounceAt(SHARED_WALL + 0.2 + 1, y, z));
        worstCell = Math.max(worstCell, cellAt(f, 10.5, y, z));
      }
    }
    console.info(`room B: bounce 1 m from the wall <= ${worstNear.toFixed(4)}, straddling cell <= ${worstCell.toFixed(4)}`);
    expect(worstNear).toBeLessThanOrEqual(0.01);
    expect(worstCell).toBeLessThanOrEqual(0.03);
    // (room A's side of the wall is lit)
    expect(cellAt(f, 9.5, 1.5, LAMP_A.z)).toBeGreaterThan(0.02);
  });

  // (LR16-1 fix round, check Blocking 1) The wall and the slab anywhere inside their 1 m cell, the lamp 1 m and 2 m from
  // them: nothing behind (<= 0.03, body heights), and the lit side keeps at least half of what it read before the fix
  // (`BEFORE`: `wallProbe` / `slabProbe` on bde295ef, the 1 m trilinear read and the 3-point share).
  const BEFORE: Record<string, [number, number]> = {
    'wall 0 1': [0.2472, 0.0574],
    'wall 0 2': [0.1242, 0.0279],
    'wall 0.25 1': [0.1632, 0.0431],
    'wall 0.25 2': [0.0864, 0.0216],
    'wall 0.5 1': [0.0787, 0.0225],
    'wall 0.5 2': [0.0459, 0.0118],
    'wall 0.75 1': [0.1996, 0.0412],
    'wall 0.75 2': [0.088, 0.0103],
    'slab 0 1': [0.0663, 0.0191],
    'slab 0 2': [0.0602, 0.0162],
    'slab 0.25 1': [0.0527, 0.0167],
    'slab 0.25 2': [0.0659, 0.0186],
    'slab 0.5 1': [0.0267, 0.0076],
    'slab 0.5 2': [0.0392, 0.011],
    'slab 0.75 1': [0.0201, 0.0049],
    'slab 0.75 2': [0.0182, 0.0049],
  };
  it('no bounce through a wall or a slab anywhere in its cell; the lit side keeps its light', () => {
    const rows: string[] = [];
    for (const kind of ['wall', 'slab'] as const) {
      for (const off of [0, 0.25, 0.5, 0.75]) {
        for (const d of [1, 2]) {
          const key = `${kind} ${off} ${d}`;
          const p = kind === 'wall' ? wallProbe(10 + off, d) : slabProbe(3 + off, d);
          const [mean0, min0] = BEFORE[key]!;
          rows.push(`${key}: behind ${p.behind.map((v) => v.toFixed(3)).join(' / ')}, lit mean ${p.litMean.toFixed(3)} (was ${mean0}), min ${p.litMin.toFixed(3)} (was ${min0})`);
          for (const v of p.behind) expect(v, key).toBeLessThanOrEqual(0.03);
          expect(p.litMean, key).toBeGreaterThanOrEqual(0.5 * mean0);
          expect(p.litMin, key).toBeGreaterThanOrEqual(0.5 * min0);
        }
      }
    }
    console.info(rows.join('\n'));
  });

  it('no lamp, no bounce', () => {
    // room B has no lamp: every cell past the straddling one is 0
    const g = f.bounce;
    for (let z = 0; z < g.n[2]; z++) for (let y = 0; y < g.n[1]; y++) for (let x = Math.ceil(11 - g.origin[0]); x < g.n[0]; x++) expect(g.g[x + g.n[0] * (y + g.n[1] * z)]).toBe(0);
    // a map without lamps: no bounce at all
    const none = bakeRoom(new LightRegistry(), twoRooms(), TWO_LO, TWO_HI);
    expect(none.field.bounce.active).toBe(false);
    expect(none.field.bounceAt(5, 1.5, 5)).toBe(0);
    expect(none.field.levelAt(5, 1.5, 5)).toBe(0);
  });

  it('uplight only for downward lamps', () => {
    // the floor is 7.5 m under the lamp, past the bounce's reach: only the fixture's uplight can reach the ceiling
    const down = tallHall(false);
    const spot = tallHall(true);
    const dc = down.field.bounceAt(10, 7.75, 10);
    const sc = spot.field.bounceAt(10, 7.75, 10);
    console.info(`tall hall ceiling bounce: downward lamp ${dc.toFixed(4)}, spot ${sc.toFixed(4)}`);
    expect(dc).toBeGreaterThan(0.03);
    expect(sc).toBe(0);
    // the uplight's level at 1 m, as `BOUNCE.uplight` says (+-: the near term and the 1 m cells)
    expect(down.field.bounceAt(10, 7.75, 10)).toBeLessThan(BOUNCE.uplight * 5);
  });

  it('deterministic', () => {
    const reg = new LightRegistry();
    reg.add({ ...LAMP_A });
    reg.add({ x: 15, y: 2.6, z: 3, radius: 5, intensity: 0.7, fixture: { sx: 1.2, sy: 0.1, sz: 0.2, oy: 0.1 } });
    const shapes = packShapes(twoRooms());
    const b = bakedLights(reg);
    const one = bakeLamps({ kind: 'lamps', id: 0, shapes, lights: b.lights, lo: TWO_LO, hi: TWO_HI });
    const two = bakeLamps({ kind: 'lamps', id: 0, shapes, lights: b.lights, lo: TWO_LO, hi: TWO_HI });
    expect(Buffer.from(one.bounce!.boxes.buffer).equals(Buffer.from(two.bounce!.boxes.buffer))).toBe(true);
    expect(Buffer.from(one.bounce!.data.buffer).equals(Buffer.from(two.bounce!.data.buffer))).toBe(true);
    expect(Buffer.from(one.bounce!.bits!.buffer).equals(Buffer.from(two.bounce!.bits!.buffer))).toBe(true);
    expect(one.bounce!.data.length).toBeGreaterThan(0);
    // (fix round) a cell's wall bits are the map's, not the lamp's: the two lamps' boxes agree where they overlap
    expect(one.bounce!.bits!.length).toBe(one.bounce!.data.length);
    const bx = one.bounce!.boxes;
    const bits = one.bounce!.bits!;
    const seen = new Map<string, number>();
    let at = 0;
    let shared = 0;
    for (let i = 0; i < 2; i++) {
      const o = i * 6;
      for (let z = 0; z < bx[o + 5]!; z++) for (let y = 0; y < bx[o + 4]!; y++) for (let x = 0; x < bx[o + 3]!; x++) {
        const k = `${bx[o]! + x} ${bx[o + 1]! + y} ${bx[o + 2]! + z}`;
        const v = bits[at++]!;
        const prev = seen.get(k);
        if (prev === undefined) seen.set(k, v);
        else {
          shared++;
          expect(v, k).toBe(prev);
        }
      }
    }
    expect(shared).toBeGreaterThan(0);
    // (one job or two: a lamp's bounce is its own)
    const lone = bakeLamps({ kind: 'lamps', id: 0, shapes, lights: b.lights.slice(10), lo: TWO_LO, hi: TWO_HI });
    expect(Array.from(lone.bounce!.boxes)).toEqual(Array.from(one.bounce!.boxes.subarray(6)));
  });

  it('bake time on the ctcourse fixture', async () => {
    const { LevelBuilder } = await import('../src/world/levelBuilder');
    const { ctcourse } = await import('../src/world/maps/ctcourse');
    const { canonicalLightSet } = await import('../src/voxel/lightShapes');
    const { dressingOn } = await import('../src/world/detailPass');
    const lb = new LevelBuilder();
    ctcourse.build(lb, 0);
    const set = canonicalLightSet(lb.boxes, lb.cylinders, 'ctcourse', dressingOn(ctcourse));
    const baked = bakedLights(lb.lights);
    const r = bakeLamps({ kind: 'lamps', id: 0, shapes: set.shapes, lights: baked.lights, lo: set.lo, hi: set.hi });
    const ms = r.ms!;
    const kb = (r.bounce!.data.byteLength + r.bounce!.boxes.byteLength) / 1024;
    console.info(`ctcourse ${baked.ids.length} lamps: visibility ${ms.vis.toFixed(0)} ms, bounce ${ms.bounce.toFixed(0)} ms (+${((ms.bounce / ms.vis) * 100).toFixed(1)}%), bounce ${kb.toFixed(0)} KB`);
    expect(ms.bounce).toBeLessThanOrEqual(0.25 * ms.vis);
  }, 300_000);
});
