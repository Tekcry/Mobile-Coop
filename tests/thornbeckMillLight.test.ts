/**
 * (piano SO4) Thornbeck Mill light-meter check: the map's real light field, baked in node with the pure bakers as
 * `scripts/light-realism/luxGrid.ts` and `tests/ctcourseLight.test.ts` do (no worker, no Babylon scene), then read the
 * way the game reads it: the lamps lit (the intro), `LightRegistry.mainsOff` run to its end (0.8 s, SO1), no torch
 * lit, and the strikes of `THORNBECK_LIGHTNING` through `Lightning` + `LightField.setFlash` (SO5). The map file does not
 * set `MapDef.lightning` yet (a TODO(#604) in it), so the timetable is supplied from this side by spreading the map def.
 *
 * Cases: (a) the map data; (b) after the mains are cut and between flashes, every walkable cell of the ground floor and
 * the gallery reads in the meter's dark band (under `LIGHT.shadow`, the 1 lux line of `world/lux.ts`); (c) at the peak of
 * the first flash the cells within 6 m of an opening read 5-20 lux and the plan's flash-shadow spots stay dark;
 * (d) the meter path and the guard-sight path give one value (one `LightField`, one step).
 *
 * Findings are left in as assertions: a case that fails at this base is `it.fails` with the measured value named, so
 * the fix (Campaign's map) turns it red and the marker comes off. Run with `SO4_PRINT=1` for the measured tables.
 * Sources: `docs/piano-escape/PLAN.md` at origin/feature/piano-escape f5c7f8be0 (line numbers below), `ELEMENTS.md`,
 * `map-plan.svg` (the flash bands).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { LevelBuilder, type BoxPiece } from '../src/world/levelBuilder';
import { THORNBECK_LIGHTNING, thornbeckMill, DECK_Y, THORNBECK_PLATFORM } from '../src/world/maps/thornbeckMill';
import { bakeLamps } from '../src/voxel/lampBake';
import { bakeMoon, MOON_CELL } from '../src/voxel/skyBake';
import { bakedLights, type LightBake } from '../src/world/lightBake';
import { buildAmbientGrid } from '../src/world/ambientGrid';
import { LightField, type FieldDoor } from '../src/world/lightField';
import { moonLight } from '../src/world/lampMath';
import { LIGHT, LightRegistry } from '../src/world/lights';
import { addTorchSlots } from '../src/world/torches';
import { FLASH_GAIN, FLASH_RISE, Lightning } from '../src/world/lightning';
import { levelToLux, luxToLevel } from '../src/world/lux';
import { lightFactor } from '../src/ai/perception';

/** The map with its lightning on it, as `MapDef.lightning` will carry it (supplied from the test side). */
const MAP = { ...thornbeckMill, lightning: THORNBECK_LIGHTNING };
const DT = 1 / 60;
/** The meter's own dark line: a level under `LIGHT.shadow` is the dark band (= 1 lux on the `lux.ts` curve). */
const DARK = LIGHT.shadow;
/** A standing body's height for the meter path (`bodyLevel`: chest at 0.6 x it, head at 0.95 x it). */
const BODY = 1.7;
/** The meter-height plane over a floor (the lux grid's `meter` plane, `luxGrid.ts`). */
const METER_H = 1.0;
/** PLAN section 2b: "Peak about 5-20 lux on floors within about 6 m of an opening". */
const LUX_LO = 5;
const LUX_HI = 20;
const NEAR = 6;

let b: LevelBuilder;
let reg: LightRegistry;
let field: LightField;
let lt: Lightning;
/** Lamp levels read before the EMP, by lamp id (the control: the dark below is the cut, not an unlit map). */
const preEmp: { id: number; level: number }[] = [];

interface Cell {
  x: number;
  z: number;
  /** Floor height (m): 0 the ground floor, DECK_Y the gallery deck and the hoist platform. */
  floor: number;
}
const cells: Cell[] = [];

/** Rotated box test in plan (a piece's `yaw`). */
function inPlan(bx: BoxPiece, x: number, z: number): boolean {
  const c = Math.cos(-bx.yaw);
  const s = Math.sin(-bx.yaw);
  const dx = x - bx.c[0];
  const dz = z - bx.c[2];
  return Math.abs(dx * c + dz * s) <= bx.s[0] / 2 && Math.abs(-dx * s + dz * c) <= bx.s[2] / 2;
}

/** A body can stand at (x, z) on `floor`: a collider top at the floor under it, and no collider through its height. */
function walkable(solids: readonly BoxPiece[], x: number, z: number, floor: number): boolean {
  let supported = false;
  for (const bx of solids) {
    if (!inPlan(bx, x, z)) continue;
    const top = bx.c[1] + bx.s[1] / 2;
    const bot = bx.c[1] - bx.s[1] / 2;
    if (Math.abs(top - floor) < 0.02) supported = true;
    else if (top > floor + 0.05 && bot < floor + 1.8) return false;
  }
  return supported;
}

const luxOf = (level: number): number => levelToLux(level);
const print = (s: string): void => {
  if (process.env.SO4_PRINT) console.info(s);
};

beforeAll(() => {
  b = new LevelBuilder();
  const layout = MAP.build(b, 0);
  reg = b.lights;
  const { light: set } = b.prepare(MAP.id, {});
  reg.ambient = MAP.theme.lightLevel ?? 0.75;
  // the guards' torch slots exist on a dark map (World adds them); all off here: "no torches"
  addTorchSlots(reg);
  const mL = moonLight(MAP.theme);
  const sky = Math.max(0, reg.ambient - mL);
  const ambient = buildAmbientGrid({ ambientAt: (x, y, z) => { const v = reg.zoneAt(x, y, z); return v === v ? v : sky; } }, set.lo, set.hi);
  const s = MAP.theme.sunDir;
  const l = Math.sqrt(s[0] * s[0] + s[1] * s[1] + s[2] * s[2]);
  const dir: [number, number, number] = [-s[0] / l, -s[1] / l, -s[2] / l];
  const n = [0, 1, 2].map((k) => Math.max(1, Math.ceil((set.hi[k]! - set.lo[k]!) / MOON_CELL))) as [number, number, number];
  // the moon job run inline (the game runs it in a worker; the same `bakeMoon` / `bakeLamps`)
  const m = bakeMoon({ kind: 'moon', id: 0, origin: set.lo, n, shapes: set.shapes, dir });
  const baked = bakedLights(reg);
  const r = bakeLamps({ kind: 'lamps', id: 0, shapes: set.shapes, lights: baked.lights, lo: set.lo, hi: set.hi });
  const bake: LightBake = { lo: set.lo, hi: set.hi, lampKey: 'so4', moonKey: 'so4', lamps: { baked, r }, moon: { origin: set.lo, n, cell: MOON_CELL, vis: m.vis, dir }, ambient, moonLight: mL, ms: 0 };
  const doors: FieldDoor[] = b.anchors.doors.map((anchor) => ({ anchor, open: 0 }));
  field = new LightField(bake, reg, doors);
  lt = new Lightning(MAP.lightning);

  // the walkable 1 m cells: the hall's ground floor (the machinery floor too: a superset of the path), the gallery
  // deck over it, and the hoist platform outside the west gable
  const solids = b.boxes.filter((bx) => bx.collide);
  for (let x = 0.5; x < 32; x++) {
    for (let z = 0.5; z < 18; z++) {
      if (walkable(solids, x, z, 0)) cells.push({ x, z, floor: 0 });
      if (z > 15 && walkable(solids, x, z, DECK_Y)) cells.push({ x, z, floor: DECK_Y });
    }
  }
  for (let x = THORNBECK_PLATFORM[0] + 0.1; x < THORNBECK_PLATFORM[2]; x++) {
    for (let z = THORNBECK_PLATFORM[1] + 0.5; z < THORNBECK_PLATFORM[3]; z++) if (walkable(solids, x, z, DECK_Y)) cells.push({ x, z, floor: DECK_Y });
  }

  // the lamps lit (the intro): read under each lamp before the EMP
  for (const lp of reg.lights) {
    if (lp.kind !== 'lamp' || lp.radius < 5) continue;
    const floor = lp.y > 5.5 ? DECK_Y : 0;
    const z = Math.min(17.5, Math.max(0.5, lp.z));
    preEmp.push({ id: lp.id, level: field.levelAt(lp.x, floor + METER_H, z) });
  }

  // the EMP: the cut runs its 0.8 s ripple from the operator's start, then a little longer; the clock is 1 s after it
  const op = layout.playerSpawns[0]!.pos;
  reg.mainsOff(op.x, 1, op.z);
  for (let k = 0; k < Math.ceil(0.8 / DT) + 2; k++) reg.update(DT);
  field.setFlash(lt.levelAt(1));
}, 120_000);

/** The strike's peak on the scene clock: the first flash of the timetable. */
const PEAK_T = THORNBECK_LIGHTNING.flashes[0]!.t + FLASH_RISE;
/** Read at the meter plane over a cell's floor. */
const level = (c: Cell): number => field.levelAt(c.x, c.floor + METER_H, c.z);

describe('(a) the map data', () => {
  it('a dark map: ambient under 0.5, every lamp electric with no switch group', () => {
    expect(MAP.theme.lightLevel ?? 0.75).toBeLessThan(0.5);
    expect(MAP.theme.ambient).toBeLessThan(0.5);
    const lamps = reg.lights.filter((lp) => lp.kind !== 'flashlight');
    expect(lamps.length).toBe(17);
    for (const lp of lamps) {
      expect(lp.electric).toBe(true);
      expect(lp.group).toBe(-1);
    }
    // the torch slots exist (a dark map) and none is lit
    const torches = reg.lights.filter((lp) => lp.kind === 'flashlight');
    expect(torches.length).toBeGreaterThan(0);
    expect(torches.every((t) => !t.on)).toBe(true);
    // the walkable grid is what the checks below read (ground floor, gallery deck, hoist platform)
    print(`walkable cells: ${cells.filter((c) => c.floor === 0).length} ground, ${cells.filter((c) => c.floor > 0 && c.x >= 0).length} gallery, ${cells.filter((c) => c.x < 0).length} platform`);
    expect(cells.filter((c) => c.floor === 0).length).toBeGreaterThan(200);
    expect(cells.filter((c) => c.floor > 0 && c.x >= 0).length).toBeGreaterThan(40);
  });

  it('control: the lamps are lit before the EMP (the dark below is the cut, not an unlit map)', () => {
    print(`pre-EMP level under each lamp: ${preEmp.map((p) => `L${p.id + 1} ${p.level.toFixed(2)}`).join(' ')}`);
    const lit = preEmp.filter((p) => p.level > DARK).length;
    expect(lit).toBeGreaterThanOrEqual(preEmp.length - 1);
  });
});

describe('(b) after mainsOff, between flashes, no torch: the dark band everywhere', () => {
  it('every electric lamp is off; the clock sits between flashes', () => {
    for (const lp of reg.lights) if (lp.electric) expect(lp.on).toBe(false);
    for (const lp of reg.lights) if (lp.kind === 'flashlight') expect(lp.on).toBe(false);
    expect(lt.flashAt(1)).toBe(0);
    expect(field.flashLevel).toBe(0);
  });

  it('the meter-height level on a 1 m grid over every walkable cell (ground floor and gallery) is under the dark line', () => {
    field.setFlash(lt.levelAt(1));
    let worst = 0;
    let at: Cell = cells[0]!;
    for (const c of cells) {
      const v = level(c);
      if (v > worst) {
        worst = v;
        at = c;
      }
      expect(v, `cell (${c.x}, ${c.z}) floor ${c.floor}: ${luxOf(v).toFixed(2)} lux`).toBeLessThan(DARK);
    }
    print(`(b) ${cells.length} cells, brightest ${worst.toFixed(4)} = ${luxOf(worst).toFixed(3)} lux at (${at.x}, ${at.z}) floor ${at.floor}; dark line ${DARK} = ${luxOf(DARK).toFixed(2)} lux`);
    expect(luxOf(DARK)).toBeCloseTo(1, 6);
  });

  it('the meter path (bodyLevel) is dark on every cell too', () => {
    field.setFlash(lt.levelAt(1));
    for (const c of cells) expect(field.bodyLevel(c.x, c.floor, c.z, BODY)).toBeLessThan(DARK);
  });
});

/** An opening in a hall wall (ELEMENTS.md "Shell, openings and doors"; the map's `buildShell`). */
interface Opening {
  id: string;
  /** The wall's plane: 'z' = the wall at z = `at` running along x, 'x' = at x = `at` running along z. */
  wall: 'z' | 'x';
  at: number;
  a: number;
  e: number;
  /** Floor the opening lights: 0 the ground floor, DECK_Y the gallery. */
  floor: number;
}
const OPENINGS: readonly Opening[] = [
  { id: 'W-S1', wall: 'z', at: 0, a: 2, e: 4, floor: 0 },
  { id: 'W-S2', wall: 'z', at: 0, a: 11, e: 13, floor: 0 },
  { id: 'W-S3', wall: 'z', at: 0, a: 21, e: 23, floor: 0 },
  { id: 'W-W1', wall: 'x', at: 0, a: 3, e: 5, floor: 0 },
  { id: 'W-E1', wall: 'x', at: 32, a: 8.5, e: 10, floor: 0 },
  { id: 'BG1', wall: 'x', at: 32, a: 2, e: 3, floor: 0 },
  { id: 'W-N1', wall: 'z', at: 18, a: 4, e: 6, floor: DECK_Y },
  { id: 'W-N2', wall: 'z', at: 18, a: 13, e: 15, floor: DECK_Y },
  { id: 'W-N3', wall: 'z', at: 18, a: 17, e: 19, floor: DECK_Y },
  { id: 'W-N4', wall: 'z', at: 18, a: 25, e: 27, floor: DECK_Y },
];

/** Plan distance from a cell to the opening's segment in its wall plane. */
function planDist(o: Opening, c: Cell): number {
  const along = o.wall === 'z' ? c.x : c.z;
  const across = o.wall === 'z' ? c.z : c.x;
  const da = Math.max(o.a - along, 0, along - o.e);
  const dn = across - o.at;
  return Math.hypot(da, dn);
}

/**
 * Openings measured to fail at this base (the findings; their cases are `it.fails`). Every opening: the flash lights no
 * walkable cell. The sky ray is one direction (the theme's `sunDir` [0.35, -1, 0.55], 57 degrees up from the south-west);
 * the 14 m outer wall (H3, `b.perimeter(..., 14, ...)`) 3.6 m off the hall shuts it out of every window and gap, so the
 * brightest walkable cell within 6 m of each reads the field's floor (0.13 lux; 0.23 lux at W-S1 and W-W1, a trilinear
 * bleed at the start bay's corner). A test-side check with that wall removed lit one row of cells behind each south
 * window at about 3 lux (the window head cuts the ray after 0.5 m), still under 5 lux; a flatter sky (sunDir y -0.35)
 * lit one cell at 10 lux. The hoist platform (open sky) reads 10 lux at the peak: the strike itself works.
 */
const MEASURED = (max: string): string => `flash lights no cell within 6 m: brightest ${max} lux (outer wall H3 and the single sky ray)`;
const KNOWN_FAIL: Readonly<Record<string, string>> = {
  'W-S1': MEASURED('0.23'),
  'W-S2': MEASURED('0.13'),
  'W-S3': MEASURED('0.13'),
  'W-W1': MEASURED('0.23'),
  'W-E1': MEASURED('0.13'),
  BG1: MEASURED('0.13'),
  'W-N1': MEASURED('0.13'),
  'W-N2': MEASURED('0.13'),
  'W-N3': MEASURED('0.13'),
  'W-N4': MEASURED('0.13'),
};

describe('(c) at the first flash peak', () => {
  it('the clock is the first strike of the timetable at its peak: the full gain', () => {
    field.setFlash(lt.levelAt(PEAK_T));
    expect(THORNBECK_LIGHTNING.flashes[0]!.peak).toBe(1);
    expect(lt.flashAt(PEAK_T)).toBeCloseTo(1, 12);
    expect(field.flashLevel).toBeCloseTo(FLASH_GAIN, 12);
  });

  it('control: the strike reaches a cell with open sky (the hoist platform outside the west gable) at 5-20 lux', () => {
    field.setFlash(lt.levelAt(PEAK_T));
    const lux = cells.filter((c) => c.x < 0).map((c) => luxOf(level(c)));
    print(`(c) platform cells at the peak: ${lux.map((v) => v.toFixed(1)).join(' ')} lux`);
    expect(Math.max(...lux)).toBeGreaterThanOrEqual(LUX_LO);
    expect(Math.max(...lux)).toBeLessThanOrEqual(LUX_HI);
  });

  for (const o of OPENINGS) {
    const run = KNOWN_FAIL[o.id] ? it.fails : it;
    run(`${o.id}: within ${NEAR} m of the opening the brightest walkable cell reads ${LUX_LO}-${LUX_HI} lux, none above ${LUX_HI}${KNOWN_FAIL[o.id] ? ` [finding: ${KNOWN_FAIL[o.id]}]` : ''}`, () => {
      field.setFlash(lt.levelAt(PEAK_T));
      const near = cells.filter((c) => c.floor === o.floor && c.x >= 0 && planDist(o, c) <= NEAR);
      const lux = near.map((c) => luxOf(level(c)));
      const max = lux.length ? Math.max(...lux) : 0;
      const litCells = lux.filter((v) => v >= LUX_LO).length;
      print(`(c) ${o.id}: ${near.length} walkable cells within ${NEAR} m, max ${max.toFixed(2)} lux, ${litCells} at or over ${LUX_LO} lux`);
      expect(near.length, `${o.id}: no walkable cell within ${NEAR} m (the opening lights a solid)`).toBeGreaterThan(0);
      expect(max, `${o.id}: brightest cell ${max.toFixed(2)} lux`).toBeGreaterThanOrEqual(LUX_LO);
      expect(max).toBeLessThanOrEqual(LUX_HI);
    });
  }

  /** Flash-shadow spots named in the plan: [name, x, z, floor, citation]. Each lies outside the SVG's flash bands. */
  const SHADOWS: readonly (readonly [string, number, number, number, string])[] = [
    // PLAN.md line 152 (stretch 1): "kill at K1 (6.0, 8.4)", north of the start bay's bin W1, outside the SVG's start-bay bands
    ['K1 start bay north', 6.0, 8.4, 0, 'PLAN 152'],
    // PLAN.md line 153 (stretch 2): "follow in the flash shadows of the sack stacks to his stop in the roller mill's shadow; kill at K2 (22.8, 7.0)"
    ['K2 roller mill shadow', 22.8, 7.0, 0, 'PLAN 153'],
    // PLAN.md lines 186-187 (hide spots): "in the bin-row niche of the mill bay (19.0, 7.4)"
    ['bin-row niche', 19.0, 7.4, 0, 'PLAN 186-187'],
    // PLAN.md line 156 (stretch 5): "take them at once at K5 (25.4, 12.2)", inside the office door, no SVG band there
    ['K5 office door', 25.4, 12.2, 0, 'PLAN 156'],
    // PLAN.md line 157 (stretch 6): "his stop by sack stack GS2; kill at K6 (22.8, 16.2)", on the deck between the SVG's north bands
    ['K6 by GS2', 22.8, 16.2, DECK_Y, 'PLAN 157'],
    // PLAN.md lines 158 and 186-187: "hide behind GS2 ... between flashes through the north windows" (ELEMENTS HS5 (23.0, 17.5))
    ['behind GS2', 23.0, 17.5, DECK_Y, 'PLAN 158, 186'],
  ];

  it('the flash-shadow spots of the plan are dark at the peak (under 1 lux), on the meter path too', () => {
    const solids = b.boxes.filter((bx) => bx.collide);
    field.setFlash(lt.levelAt(PEAK_T));
    for (const [name, x, z, floor] of SHADOWS) {
      expect(walkable(solids, x, z, floor), `${name} (${x}, ${z}) is a walkable spot`).toBe(true);
      const v = field.levelAt(x, floor + METER_H, z);
      const mv = field.bodyLevel(x, floor, z, BODY);
      print(`(c) shadow ${name} (${x}, ${z}) floor ${floor}: ${luxOf(v).toFixed(3)} lux (meter path ${luxOf(mv).toFixed(3)})`);
      expect(v, `${name}: ${luxOf(v).toFixed(2)} lux`).toBeLessThan(DARK);
      expect(mv, `${name} (meter path): ${luxOf(mv).toFixed(2)} lux`).toBeLessThan(DARK);
    }
  });

  it('between the strikes the flash is gone again (the peak reading is the strike, not a leftover)', () => {
    field.setFlash(lt.levelAt(PEAK_T));
    const on = cells.filter((c) => c.x < 0).map(level);
    field.setFlash(lt.levelAt(PEAK_T + 1));
    expect(lt.flashAt(PEAK_T + 1)).toBe(0);
    const off = cells.filter((c) => c.x < 0).map(level);
    expect(Math.max(...off)).toBeLessThan(DARK);
    expect(Math.max(...on)).toBeGreaterThan(Math.max(...off));
    field.setFlash(lt.levelAt(1));
  });
});

describe('(d) parity: the meter path and the guard-sight path read one LightField value', () => {
  /**
   * The code has two read paths on one field: the meter's `bodyLevel` (chest and head samples of a standing body,
   * `GameState.updateLight`) and guard sight's `totalAt` (`fieldLight`, `enemy.ts`) at a point; the plane read here is
   * `levelAt`. Torches off, so `totalAt` = `levelAt` and `bodyLevel` = the brighter of two `totalAt` reads.
   */
  const same = (x: number, floor: number, z: number): void => {
    const yc = floor + BODY * 0.6;
    const yh = floor + BODY * 0.95;
    const chest = field.totalAt(x, yc, z);
    const head = field.totalAt(x, yh, z);
    expect(Object.is(field.bodyLevel(x, floor, z, BODY), chest > head ? chest : head)).toBe(true);
    expect(Object.is(field.totalAt(x, floor + METER_H, z), field.levelAt(x, floor + METER_H, z))).toBe(true);
    // and the guard's visibility is the same function of the same number
    expect(lightFactor(field.bodyLevel(x, floor, z, BODY))).toBeGreaterThanOrEqual(lightFactor(chest) - 1e-12);
  };

  it('(b) points: every walkable cell, after the cut, between flashes', () => {
    field.setFlash(lt.levelAt(1));
    for (const c of cells) same(c.x, c.floor, c.z);
  });

  it('(c) points: every cell within 6 m of an opening, and the shadow spots, at the first peak', () => {
    field.setFlash(lt.levelAt(PEAK_T));
    for (const c of cells) same(c.x, c.floor, c.z);
    for (const [x, z, f] of [[6.0, 8.4, 0], [22.8, 7.0, 0], [19.0, 7.4, 0], [25.4, 12.2, 0], [22.8, 16.2, DECK_Y], [23.0, 17.5, DECK_Y]] as const) same(x, f, z);
    field.setFlash(lt.levelAt(1));
  });

  it('the flash level the meter reads is the level the guards read: one setFlash per step', () => {
    field.setFlash(lt.levelAt(PEAK_T));
    const c = cells.find((q) => q.x < 0 && q.z > 16 && q.z < 17)!;
    const meter = field.bodyLevel(c.x, c.floor, c.z, BODY);
    const guard = field.totalAt(c.x, c.floor + BODY * 0.6, c.z);
    expect(meter).toBeGreaterThanOrEqual(guard);
    expect(luxToLevel(luxOf(meter))).toBeCloseTo(meter, 9);
    field.setFlash(lt.levelAt(1));
  });
});
