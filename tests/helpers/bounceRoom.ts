/**
 * (LR16-1) The bounce fixtures: rooms baked as the game bakes them (`bakeLamps` -> `LightField`), no zones and no moon,
 * so every level above 0 is a lamp's direct light or its bounce.
 */
import { bakeLamps } from '../../src/voxel/lampBake';
import { packShapes, type VoxelShape } from '../../src/voxel/shapes';
import { buildAmbientGrid } from '../../src/world/ambientGrid';
import { bakedLights, type LightBake } from '../../src/world/lightBake';
import { LightField } from '../../src/world/lightField';
import { LightRegistry, makeCone } from '../../src/world/lights';

export const box = (c: [number, number, number], s: [number, number, number]): VoxelShape => ({ kind: 'box', c, s, yaw: 0, pitch: 0, mat: 1 });

/** Bake `shapes` under `reg`'s lights over [lo, hi] (ambient 0, no moon). */
export function bakeRoom(reg: LightRegistry, shapes: VoxelShape[], lo: [number, number, number], hi: [number, number, number]): { bake: LightBake; field: LightField } {
  reg.ambient = 0;
  const packed = packShapes(shapes);
  const baked = bakedLights(reg);
  const r = bakeLamps({ kind: 'lamps', id: 0, shapes: packed, lights: baked.lights, lo, hi });
  const ambient = buildAmbientGrid({ ambientAt: () => 0 }, lo, hi);
  const bake: LightBake = {
    lo,
    hi,
    lampKey: 'k',
    moonKey: 'm',
    lamps: baked.ids.length ? { baked, r } : null,
    moon: { origin: lo, n: [1, 1, 1], cell: 1, vis: new Uint8Array(1), dir: [0, 1, 0] },
    ambient,
    moonLight: 0,
    ms: 0,
  };
  return { bake, field: new LightField(bake, reg) };
}

/** Room A (x 0..10.4) and room B (x 10.6..20) behind a 0.2 m wall (x 10.4..10.6), both z 0..10, floor y 0, ceiling 3. */
export const SHARED_WALL = 10.4;
export function twoRooms(): VoxelShape[] {
  return [
    box([10, -0.1, 5], [20.4, 0.2, 10.4]),
    box([10, 3.1, 5], [20.4, 0.2, 10.4]),
    box([-0.1, 1.5, 5], [0.2, 3, 10.4]),
    box([20.1, 1.5, 5], [0.2, 3, 10.4]),
    box([10.5, 1.5, 5], [0.2, 3, 10.4]),
    box([10, 1.5, -0.1], [20.4, 3, 0.2]),
    box([10, 1.5, 10.1], [20.4, 3, 0.2]),
  ];
}
export const TWO_LO: [number, number, number] = [-1, -1, -1];
export const TWO_HI: [number, number, number] = [21, 4, 11];
/** The acceptance lamp: downward, 2.8 m up, intensity 1, radius 2.5 (reach 4 m); its pool (direct floor level over the
 *  0.28 shadow line, 1.95 m from it) ends 1 m short of the shared wall. */
export const LAMP_A = { x: 7.45, y: 2.8, z: 5, radius: 2.5, intensity: 1 } as const;

export function roomA(): { reg: LightRegistry; bake: LightBake; field: LightField } {
  const reg = new LightRegistry();
  reg.add({ ...LAMP_A });
  return { reg, ...bakeRoom(reg, twoRooms(), TWO_LO, TWO_HI) };
}

/** A 20 x 8 x 20 m hall (ceiling at 8 m): a lamp 0.4 m under it sends no floor bounce up (the floor is past the reach). */
export function tallHall(spot: boolean): { reg: LightRegistry; bake: LightBake; field: LightField } {
  const reg = new LightRegistry();
  if (spot) reg.add({ kind: 'spot', x: 10, y: 7.6, z: 10, radius: 6, intensity: 1, cone: makeCone(0, -1, 0, 0.6) });
  else reg.add({ x: 10, y: 7.6, z: 10, radius: 6, intensity: 1 });
  const shapes = [box([10, -0.1, 10], [20.4, 0.2, 20.4]), box([10, 8.1, 10], [20.4, 0.2, 20.4])];
  return { reg, ...bakeRoom(reg, shapes, [-1, -1, -1], [21, 9, 21]) };
}

/** (LR16-1 fix round) `twoRooms` with the shared 0.2 m wall at x `wx`..`wx` + 0.2 (anywhere inside its 1 m cell). */
export function wallRooms(wx: number): VoxelShape[] {
  const s = twoRooms();
  s[4] = box([wx + 0.1, 1.5, 5], [0.2, 3, 10.4]);
  return s;
}

/** Room A's acceptance lamp `d` m (horizontally) from the lit face of a wall at x `wx`, baked. */
export function wallRoom(wx: number, d: number): { reg: LightRegistry; bake: LightBake; field: LightField } {
  const reg = new LightRegistry();
  reg.add({ ...LAMP_A, x: wx - d });
  return { reg, ...bakeRoom(reg, wallRooms(wx), TWO_LO, TWO_HI) };
}

/** Two storeys (10 x 10 m): the lower room's floor at 0, a 0.2 m slab at y `sy`..`sy` + 0.2 (`sy` >= 3), a 3 m room
 *  over it; the acceptance lamp (`lampY` up, 2.8 m by default) in the lower room. */
export function slabRoom(sy: number, intensity = 1, lampY: number = LAMP_A.y): { reg: LightRegistry; bake: LightBake; field: LightField } {
  const reg = new LightRegistry();
  reg.add({ ...LAMP_A, x: 5, y: lampY, z: 5, intensity });
  const top = sy + 0.2 + 3;
  const shapes = [
    box([5, -0.1, 5], [10.4, 0.2, 10.4]),
    box([5, sy + 0.1, 5], [10.4, 0.2, 10.4]),
    box([5, top + 0.1, 5], [10.4, 0.2, 10.4]),
    box([-0.1, top / 2, 5], [0.2, top, 10.4]),
    box([10.1, top / 2, 5], [0.2, top, 10.4]),
    box([5, top / 2, -0.1], [10.4, top, 0.2]),
    box([5, top / 2, 10.1], [10.4, top, 0.2]),
  ];
  return { reg, ...bakeRoom(reg, shapes, [-1, -1, -1], [11, top + 1, 11]) };
}

/**
 * (LR16-1 fix round, the check's wall test) Room A's lamp `d` m from a wall at x `wx`..`wx` + 0.2: `behind`, the most
 * bounce 0.15 / 0.3 / 0.5 m past its far face (body heights 0.25-1.5 m, the room's whole length); `litMean` /
 * `litMin`, the mean and the least bounce 0.25 m off its lit face (heights 0.25-2.5 m, z 3-7 m).
 */
export function wallProbe(wx: number, d: number): { behind: number[]; litMean: number; litMin: number } {
  const { field: f } = wallRoom(wx, d);
  const behind = [0.15, 0.3, 0.5].map((t) => {
    let m = 0;
    for (let z = 0.5; z < 10; z += 0.5) for (let y = 0.25; y <= 1.501; y += 0.25) m = Math.max(m, f.bounceAt(wx + 0.2 + t, y, z));
    return m;
  });
  let sum = 0;
  let n = 0;
  let litMin = Infinity;
  for (let z = 3; z <= 7.001; z += 1) {
    for (let y = 0.25; y <= 2.501; y += 0.25) {
      const v = f.bounceAt(wx - 0.25, y, z);
      sum += v;
      n++;
      litMin = Math.min(litMin, v);
    }
  }
  return { behind, litMean: sum / n, litMin };
}

/** The same for a slab at y `sy`..`sy` + 0.2 with the lamp `d` m under it: `behind` over the slab (the room above),
 *  the lit side 0.25 m under it (x, z 3-7 m). */
export function slabProbe(sy: number, d: number): { behind: number[]; litMean: number; litMin: number } {
  const { field: f } = slabRoom(sy, 1, sy - d);
  const behind = [0.15, 0.3, 0.5].map((t) => {
    let m = 0;
    for (let z = 0.5; z < 10; z += 0.5) for (let x = 0.5; x < 10; x += 0.5) m = Math.max(m, f.bounceAt(x, sy + 0.2 + t, z));
    return m;
  });
  let sum = 0;
  let n = 0;
  let litMin = Infinity;
  for (let z = 3; z <= 7.001; z += 0.5) {
    for (let x = 3; x <= 7.001; x += 0.5) {
      const v = f.bounceAt(x, sy - 0.25, z);
      sum += v;
      n++;
      litMin = Math.min(litMin, v);
    }
  }
  return { behind, litMean: sum / n, litMin };
}
