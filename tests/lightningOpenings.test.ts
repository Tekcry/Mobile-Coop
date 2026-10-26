/**
 * (piano SO5b) Lightning through an opening as a baked flash light: a synthetic dark room with one window, one flash
 * light from `addOpeningLights`, baked with the room's own visibility (the pure bakers inline, as
 * `tests/thornbeckMillLight.test.ts`), driven the way `World.setFlash` drives it (the field's level, then
 * `LightRegistry.setSkyFlash(level / FLASH_GAIN)`). Babylon-free.
 *
 * Cases: at a full peak the floor in front of the opening reads the plan's 5-20 lux and nothing in the room tops it; a
 * cell behind a solid block stays dark; between strikes the room is dark; `mainsOff` leaves the flash light alone; the
 * meter path and the guard-sight path agree; the per-step path allocates nothing; a map without openings is unchanged.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { packShapes, type VoxelShape } from '../src/voxel/shapes';
import { bakeLamps } from '../src/voxel/lampBake';
import { bakeMoon, MOON_CELL } from '../src/voxel/skyBake';
import { bakedLights, type LightBake } from '../src/world/lightBake';
import { buildAmbientGrid } from '../src/world/ambientGrid';
import { LightField } from '../src/world/lightField';
import { LAMP_LEVEL_GAIN } from '../src/world/lampMath';
import { LIGHT, lightTerm, LightRegistry } from '../src/world/lights';
import { FLICKER_FLASH } from '../src/world/lampFlicker';
import { addOpeningLights, FLASH_GAIN, FLASH_RISE, Lightning, OPENING_LIGHT, type LightningData } from '../src/world/lightning';
import { levelToLux, luxToLevel } from '../src/world/lux';
import { addTorchSlots } from '../src/world/torches';
import { bytesPerCall, HEAP_NUMBER, inputs, sink } from './helpers/allocPerCall';

const box = (c: [number, number, number], s: [number, number, number]): VoxelShape => ({ kind: 'box', c, s, yaw: 0, pitch: 0, mat: 1 });

/** The room: x -5..5, z 0..9, floor top 0, roof at 4.2; a window in the south wall (z 0) at x -1..1, sill 1.0, head
 *  3.4 (the mill's south windows); a crate (x 0.4..0.9, z 1.6..2.0, 2.6 tall) beside the window's centre line. */
const SHAPES = packShapes([
  box([0, -0.25, 4.5], [30, 0.5, 30]),
  box([-5.1, 2.1, 4.5], [0.2, 4.2, 9.4]),
  box([5.1, 2.1, 4.5], [0.2, 4.2, 9.4]),
  box([0, 2.1, 9.1], [10.4, 4.2, 0.2]),
  // south wall round the window (sill, head, both sides)
  box([0, 0.5, -0.1], [2, 1, 0.2]),
  box([0, 3.8, -0.1], [2, 0.8, 0.2]),
  box([-3.1, 2.1, -0.1], [4.2, 4.2, 0.2]),
  box([3.1, 2.1, -0.1], [4.2, 4.2, 0.2]),
  box([0, 4.3, 4.5], [10.4, 0.2, 9.4]),
  // the crate
  box([0.65, 1.3, 1.8], [0.5, 2.6, 0.4]),
]);
const LO: [number, number, number] = [-8, -1, -4];
const HI: [number, number, number] = [8, 7, 12];
/** The window as a map lists it (centre on the inner face, width, height, inward normal). */
const DATA: LightningData = { flashes: [{ t: 3, peak: 1, len: 0.25 }], openings: [{ x: 0, y: 2.2, z: 0, w: 2, h: 2.4, nx: 0, nz: 1 }] };
const PEAK = 3 + FLASH_RISE;
/** The meter-height plane over the floor (`luxGrid.ts` `meter`), and a standing body for `bodyLevel`. */
const METER_H = 1;
const BODY = 1.7;
/** PLAN 2b's band at a peak, on the meter's curve (`lux.ts`); the meter's dark line is `LIGHT.shadow` (1 lux). */
const LO_LV = luxToLevel(5);
const HI_LV = luxToLevel(20);
/** How deep the band reaches on the centre line under the 20 lux cap with one point light (SO5b's tuning pass). */
const DEPTH = 3;

/** The room's floor on a 0.5 m grid (cell centres), the crate's footprint left out (a body cannot stand in it). */
const FLOOR: (readonly [number, number])[] = [];
for (let x = -4.75; x < 5; x += 0.5) for (let z = 0.25; z < 9; z += 0.5) if (!(x > 0.4 && x < 0.9 && z > 1.6 && z < 2.0)) FLOOR.push([x, z]);

let reg: LightRegistry;
let field: LightField;
let win: number;
let lamp: number;
const lt = new Lightning(DATA);

/** One sim step as `World.setFlash` runs it: the field's level, then the openings' lights at level / FLASH_GAIN. */
function step(t: number): void {
  field.setFlash(lt.levelAt(t));
  reg.setSkyFlash(field.flashLevel / FLASH_GAIN);
}
const at = (x: number, z: number): number => field.levelAt(x, METER_H, z);

beforeAll(() => {
  reg = new LightRegistry();
  reg.ambient = 0;
  // an electric ceiling lamp (the mains cut takes it) and the guards' torch slots (all off)
  lamp = reg.add({ x: 0, y: 4, z: 6, radius: 6, intensity: 0.8 }).id;
  expect(addOpeningLights(reg, DATA)).toBe(1);
  win = reg.lights.length - 1;
  addTorchSlots(reg);
  // (the moon behind the room, as the mill's outer wall keeps the sky ray out of its windows: this room reads the flash light alone)
  const sun: [number, number, number] = [0.35, -1, -0.55];
  const l = Math.sqrt(sun[0] ** 2 + sun[1] ** 2 + sun[2] ** 2);
  const dir: [number, number, number] = [-sun[0] / l, -sun[1] / l, -sun[2] / l];
  const n = [0, 1, 2].map((k) => Math.max(1, Math.ceil((HI[k]! - LO[k]!) / MOON_CELL))) as [number, number, number];
  const m = bakeMoon({ kind: 'moon', id: 0, origin: LO, n, shapes: SHAPES, dir });
  const baked = bakedLights(reg);
  const r = bakeLamps({ kind: 'lamps', id: 0, shapes: SHAPES, lights: baked.lights, lo: LO, hi: HI });
  const ambient = buildAmbientGrid({ ambientAt: () => 0 }, LO, HI);
  const bake: LightBake = { lo: LO, hi: HI, lampKey: 'so5b', moonKey: 'so5b', lamps: { baked, r }, moon: { origin: LO, n, cell: MOON_CELL, vis: m.vis, dir }, ambient, moonLight: 0, ms: 0 };
  field = new LightField(bake, reg);
  // the EMP: the mains cut runs to its end
  reg.mainsOff(0, 1, 6);
  for (let k = 0; k < 60; k++) reg.update(1 / 60);
  step(1);
}, 120_000);

describe('lightning openings: one baked flash light per opening (piano SO5b)', () => {
  it('the flash light: kind window, not electric, not destructible, cone inward and down, dark until a strike', () => {
    const l = reg.lights[win]!;
    expect(l.kind).toBe('window');
    expect(l.flash).toBe(true);
    expect(l.electric).toBe(false);
    expect(l.destructible).toBe(false);
    expect(l.intensity).toBe(OPENING_LIGHT.gain);
    expect(l.z).toBeCloseTo(OPENING_LIGHT.inset, 9);
    expect(l.cone!.dz).toBeGreaterThan(0.8);
    expect(l.cone!.dy).toBeLessThan(0);
    expect(reg.flickerMode(win)).toBe(FLICKER_FLASH);
    expect(reg.flickering).toContain(win);
    expect(reg.flashCount).toBe(1);
    expect(l.flicker).toBe(0);
    // `tickFlicker` (fires, stutter tubes) never moves it
    reg.tickFlicker(12.3);
    expect(l.flicker).toBe(0);
  });

  it(`at a full peak the floor 1-${DEPTH} m in front of the opening reads 5-20 lux; nothing in the room reads over 20`, () => {
    step(PEAK);
    expect(lt.flashAt(PEAK)).toBeCloseTo(1, 12);
    const row: string[] = [];
    for (let z = 1; z <= DEPTH + 1e-9; z += 0.5) {
      const v = at(0, z);
      row.push(`${z}: ${levelToLux(v).toFixed(1)}`);
      expect(v, `centre line ${z} m: ${levelToLux(v).toFixed(2)} lux`).toBeGreaterThanOrEqual(LO_LV);
      expect(v).toBeLessThanOrEqual(HI_LV);
    }
    let max = 0;
    let mx = 0;
    let mz = 0;
    for (const [x, z] of FLOOR) {
      const v = at(x, z);
      if (v > max) [max, mx, mz] = [v, x, z];
    }
    for (let z = DEPTH + 0.5; z <= 6 + 1e-9; z += 0.5) row.push(`${z}: ${levelToLux(at(0, z)).toFixed(1)}`);
    console.info(`SO5b room at the peak, centre line lux ${row.join(', ')}; brightest floor cell ${levelToLux(max).toFixed(1)} lux at (${mx}, ${mz})`);
    expect(max).toBeLessThanOrEqual(HI_LV);
    // the pool reaches the meter's lit band
    expect(Math.max(at(0, 1.5), at(0, 2))).toBeGreaterThanOrEqual(LIGHT.lit);
    step(1);
  });

  /** SO5b finding: under the 20 lux cap one point light's inverse square leaves 3.5-6 m under 5 lux (measured on the
   *  centre line: 5.6 lux at 1 m, 17.7 at 2 m, 5.6 at 3 m, then 2.8 at 3.5 m, 1.5 at 4 m, 0.5 at 5 m, 0.3 at 6 m). An
   *  area light (or two lights per opening) would carry the band to 6 m. */
  it.fails('[finding] 4-6 m in front of the opening also reads 5-20 lux at a full peak', () => {
    step(PEAK);
    try {
      for (let z = 4; z <= 6; z += 0.5) expect(at(0, z), `centre line ${z} m: ${levelToLux(at(0, z)).toFixed(2)} lux`).toBeGreaterThanOrEqual(LO_LV);
    } finally {
      step(1);
    }
  });

  it('a cell behind the crate stays dark at the peak (the bake shadows the flash); the same cell unblocked would not', () => {
    step(PEAK);
    const l = reg.lights[win]!;
    const open = LAMP_LEVEL_GAIN * l.intensity * l.flicker * lightTerm(l, 1, METER_H, 3);
    expect(open).toBeGreaterThan(LIGHT.shadow);
    expect(at(1, 3)).toBeLessThan(LIGHT.shadow);
    expect(field.bodyLevel(1, 0, 3, BODY)).toBeLessThan(LIGHT.lit);
    step(1);
  });

  it('between strikes the room is dark everywhere (and before the first)', () => {
    for (const t of [0, 1, PEAK + 0.5, 10]) {
      step(t);
      expect(reg.lights[win]!.flicker).toBe(0);
      for (const [x, z] of FLOOR) expect(at(x, z)).toBeLessThan(LIGHT.shadow);
    }
  });

  it('mainsOff cut the electric lamp and left the flash light; a later cut leaves it too', () => {
    expect(reg.lights[lamp]!.on).toBe(false);
    expect(reg.mainsCut(lamp)).toBe(true);
    expect(reg.mainsCut(win)).toBe(false);
    expect(reg.mainsOff(0, 1, 0)).toBe(0);
    for (let k = 0; k < 60; k++) reg.update(1 / 60);
    expect(reg.lights[win]!.on).toBe(true);
    // an EMP burst neither
    expect(reg.disrupt(0, 2, 1, 20, 5)).toBe(0);
    step(PEAK);
    expect(at(0, 2)).toBeGreaterThanOrEqual(LO_LV);
    step(1);
  });

  it('parity: the meter path and the guard-sight path read one value; the flash light is the step\'s whole change', () => {
    step(1);
    const dark = at(0, 2);
    step(PEAK);
    const v = reg.lights[win]!;
    // the value the picture's texel carries (intensity x flicker) is the map gain x the flash
    expect(v.intensity * v.flicker).toBeCloseTo(OPENING_LIGHT.gain * lt.flashAt(PEAK), 12);
    for (let x = -3; x <= 3; x += 1) {
      for (let z = 0.5; z <= 7; z += 0.5) {
        const chest = field.totalAt(x, BODY * 0.6, z);
        const head = field.totalAt(x, BODY * 0.95, z);
        expect(Object.is(field.bodyLevel(x, 0, z, BODY), chest > head ? chest : head)).toBe(true);
        expect(Object.is(field.totalAt(x, METER_H, z), field.levelAt(x, METER_H, z))).toBe(true);
      }
    }
    // the gameplay set lists the flash light as a member (ShadowCues, character shadows) with its whole term
    expect(dark + field.sourceAt(win, 0, METER_H, 2)).toBeCloseTo(at(0, 2), 9);
    step(1);
  });

  it('allocation-free: setSkyFlash, and the step (field + lights) with a read', async () => {
    const T = inputs(2000, (k) => 2.9 + (k % 40) * 0.01);
    const X = inputs(2000, (k) => -1 + (k % 9) * 0.25);
    const sk = await bytesPerCall((n) => {
      for (let i = 0; i < n; i++) reg.setSkyFlash(T[i]! - 2.9);
    }, 2 * HEAP_NUMBER);
    const st = await bytesPerCall((n) => {
      for (let i = 0; i < n; i++) {
        field.setFlash(lt.levelAt(T[i]!));
        reg.setSkyFlash(field.flashLevel / FLASH_GAIN);
        sink[0]! += field.levelAt(X[i]!, METER_H, 2);
      }
    }, 6 * HEAP_NUMBER);
    step(1);
    console.info(`bytes per setSkyFlash ${sk.toFixed(1)}, per step + levelAt ${st.toFixed(1)}`);
    expect(sk).toBeLessThanOrEqual(2 * HEAP_NUMBER);
    expect(st).toBeLessThanOrEqual(6 * HEAP_NUMBER);
  });
});

describe('a map without openings is unchanged (piano SO5b)', () => {
  it('no extra light, no flickering entry; setSkyFlash moves nothing; the levels are the same bits', () => {
    const r = new LightRegistry();
    r.ambient = 0.05;
    r.add({ x: 0, y: 3, z: 2, radius: 6 });
    r.add({ x: -6, y: 0.5, z: 0, radius: 4, intensity: 0.5, kind: 'fire', electric: false });
    const n = r.lights.length;
    const fl = r.flickering.length;
    expect(addOpeningLights(r, { flashes: DATA.flashes })).toBe(0);
    expect(addOpeningLights(r, { flashes: DATA.flashes, openings: [] })).toBe(0);
    expect(addOpeningLights(r, null)).toBe(0);
    expect(r.lights.length).toBe(n);
    expect(r.flickering.length).toBe(fl);
    expect(r.flashCount).toBe(0);
    expect(r.lights.every((l) => l.flash === false && l.flicker === 1)).toBe(true);
    const f = new LightField(null, r);
    const before = [f.levelAt(0, 1, 2), f.totalAt(1, 1, 3), f.bodyLevel(0, 0, 2, BODY)];
    const v = r.flickerVersion;
    r.setSkyFlash(1);
    expect(r.flickerVersion).toBe(v);
    const after = [f.levelAt(0, 1, 2), f.totalAt(1, 1, 3), f.bodyLevel(0, 0, 2, BODY)];
    for (let k = 0; k < 3; k++) expect(Object.is(after[k], before[k])).toBe(true);
  });
});
