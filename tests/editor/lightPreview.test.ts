import { describe, expect, it } from 'vitest';
import { band, bearing, BODY_HEIGHT, cellCentre, cellIndex, contour, guardClass, inView, lampOnIn, levelCells, MAP_CELL, meterWords, quickLevel, sampleCells, type LightMode } from '../../src/editor/lightPreview';
import { EYE_STAND, losClear, PERCEPTION } from '../../src/ai/perception';
import { LIGHT, LightRegistry } from '../../src/world/lights';
import { LightField } from '../../src/world/lightField';
import { LAMP_CONE_COS, LAMP_EXP, LAMP_LEVEL_GAIN, lampTerm, photoTerm, SPOT_EXP } from '../../src/world/lampMath';
import { campusLights, type LampRecord } from '../../src/world/maps/kestrelLights';
import type { Rect } from '../../src/editor/types';

const lamp = (id: string, more: Partial<LampRecord> = {}): LampRecord => ({ id, fixture: 'downlight', owner: 'A', room: 'R1', at: [5, 2.25, 5], circuit: 'C1', params: { radius: 4, intensity: 0.7, color: [1, 1, 1] }, ...more });

describe('ON7 light bands (LIGHT thresholds, never typed)', () => {
  it('hidden under the shadow threshold, grey between, lit over the lit threshold', () => {
    expect(band(LIGHT.shadow - 1e-6)).toBe('hidden');
    expect(band(LIGHT.shadow)).toBe('grey');
    expect(band(LIGHT.lit)).toBe('grey');
    expect(band(LIGHT.lit + 1e-6)).toBe('lit');
    expect(meterWords(LIGHT.shadow - 0.07)).toBe(`${(LIGHT.shadow - 0.07).toFixed(2)} hidden`);
  });

  it('a darkness map from the game light field: lit under a lamp, hidden far off, the contours between', () => {
    const reg = new LightRegistry();
    reg.ambient = LIGHT.shadow / 2;
    reg.add({ x: 2, y: 2.25, z: 2, radius: 4, intensity: 0.7 });
    const field = new LightField(null, reg);
    const rooms: { level: string; rect: Rect }[] = [{ level: 'G', rect: [0, 0, 10, 4] }];
    const g = levelCells(rooms, [{ level: 'G', rect: [9, 0, 10, 1] }], 'G')!;
    expect(g.nx).toBe(10 / MAP_CELL);
    expect(g.nz).toBe(4 / MAP_CELL);
    const v = sampleCells(g, (x, z) => field.bodyLevel(x, 0, z, BODY_HEIGHT));
    const under = v[cellIndex(g, 2.1, 2.1)]!;
    const far = v[cellIndex(g, 9.6, 3.6)]!;
    expect(under).toBeCloseTo(field.bodyLevel(...[cellCentre(g, cellIndex(g, 2.1, 2.1))].map(([x, z]) => [x, 0, z, BODY_HEIGHT] as const)[0]!), 6);
    expect(band(under)).toBe('lit');
    expect(band(far)).toBe('hidden');
    // the floor hole has no cells
    expect(Number.isNaN(v[cellIndex(g, 9.6, 0.4)]!)).toBe(true);
    const hid = contour(g, v, LIGHT.shadow);
    const lit = contour(g, v, LIGHT.lit);
    expect(hid.length).toBeGreaterThan(0);
    expect(lit.length).toBeGreaterThan(0);
    // every contour edge has a cell on each side, one under and one at or over the threshold
    for (const [x0, z0, x1, z1] of lit) {
      const vertical = x0 === x1;
      const a = vertical ? v[cellIndex(g, x0 - 0.1, z0 + 0.1)]! : v[cellIndex(g, x0 + 0.1, z0 - 0.1)]!;
      const b = vertical ? v[cellIndex(g, x0 + 0.1, z0 + 0.1)]! : v[cellIndex(g, x0 + 0.1, z0 + 0.1)]!;
      expect(a < LIGHT.lit !== b < LIGHT.lit).toBe(true);
      expect(Math.abs(x1 - x0) + Math.abs(z1 - z0)).toBeCloseTo(MAP_CELL, 9);
    }
  });
});

describe('ON7 lights preview modes', () => {
  const l = {
    room: lamp('LP1', { circuit: 'C1' }),
    exit: lamp('LP2', { fixture: 'exit-sign', emergency: 'maintained', circuit: 'C9' }),
    spit: lamp('LP3', { fixture: 'spitfire', emergency: 'non-maintained', circuit: 'C9', heads: 2 }),
    pir: lamp('LP4', { fixture: 'pir-flood', motion: true, circuit: 'C5' }),
    other: lamp('LP5', { circuit: 'C2', breakable: true }),
  };
  const on = (m: LightMode): string[] => Object.values(l).filter((q) => lampOnIn(q, m)).map((q) => q.id);
  it('normal is the game build (PIR and non-maintained emergency off)', () => {
    expect(on({ kind: 'normal' })).toEqual(['LP1', 'LP2', 'LP5']);
  });
  it('mains off keeps only the emergency fittings (maintained and non-maintained)', () => {
    expect(on({ kind: 'mains' })).toEqual(['LP2', 'LP3']);
  });
  it('switched off turns one circuit off', () => {
    expect(on({ kind: 'switched', circuit: 'C1' })).toEqual(['LP2', 'LP5']);
  });
  it('motion lights on lights the PIR lamps', () => {
    expect(on({ kind: 'motion' })).toEqual(['LP1', 'LP2', 'LP4', 'LP5']);
  });
  it('a shot out lamp goes out only when it is breakable', () => {
    expect(on({ kind: 'shot', lamp: 'LP5' })).toEqual(['LP1', 'LP2']);
    expect(on({ kind: 'shot', lamp: 'LP1' })).toEqual(['LP1', 'LP2', 'LP5']);
  });
  it('campusLights gives each light its lamp id in order (a twin spot twice)', () => {
    const ids: string[] = [];
    const f = { levels: [{ id: 'G', floor: 0 }], rooms: [{ id: 'R1', level: 'G' }], lamps: [l.room, { ...l.spit, params: { ...l.spit.params, cone: { dx: 1, dy: -0.5, dz: 0, cosOuter: 0.9, cosInner: 0.95 } } }, { ...l.other, room: 'gone' }], circuits: [] };
    const out = campusLights(f, ids);
    expect(out.length).toBe(3);
    expect(ids).toEqual(['LP1', 'LP3', 'LP3']);
  });
});

describe('ON7 guard view and quick light', () => {
  it('classifies cells red, amber and clear by the AI field of view, line of sight and the light field', () => {
    const reg = new LightRegistry();
    reg.ambient = 0.1;
    reg.add({ x: 6, y: 2.25, z: 0, radius: 4, intensity: 0.7 });
    const field = new LightField(null, reg);
    // a wall across x = 10: the fake ray hits it
    const ballistics = {
      ray(from: { x: number; y: number; z: number }, to: { x: number; y: number; z: number }) {
        if ((from.x - 10) * (to.x - 10) >= 0) return { hit: false, distance: 0 };
        const t = (10 - from.x) / (to.x - from.x);
        return { hit: true, distance: t * Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z) };
      },
    };
    const eye = { x: 0, y: EYE_STAND, z: 0 };
    const yaw = Math.PI / 2; // facing +x
    const cls = (x: number, z: number): string => {
      const d = Math.hypot(x, z);
      const a = bearing(x, z, yaw);
      const los = losClear(ballistics, eye, { x, y: BODY_HEIGHT * 0.6, z }, 0.3);
      return guardClass(d, a, los, field.bodyLevel(x, 0, z, BODY_HEIGHT));
    };
    const lvl = (x: number, z: number): number => field.bodyLevel(x, 0, z, BODY_HEIGHT);
    expect(band(lvl(6, 0))).toBe('lit');
    expect(cls(6, 0)).toBe('red');
    // grey light in front: amber
    const pts: [number, number][] = [];
    for (let x = 6; x < 9.9; x += 0.25) for (let z = 0; z < 3; z += 0.25) pts.push([x, z]);
    const grey = pts.find(([x, z]) => band(lvl(x, z)) === 'grey');
    expect(grey).toBeDefined();
    expect(cls(...grey!)).toBe('amber');
    // behind the guard: clear whatever the light
    expect(inView(3, bearing(-3, 0, yaw))).toBe(false);
    expect(cls(-3, 0)).toBe('clear');
    // beyond the wall: clear
    reg.add({ x: 12, y: 2.25, z: 0, radius: 4, intensity: 0.7 });
    expect(band(lvl(12, 0))).toBe('lit');
    expect(cls(12, 0)).toBe('clear');
    // beyond the focused range: clear
    expect(guardClass(PERCEPTION.focusRange + 0.1, 0, true, 1)).toBe('clear');
  });

  it('the quick light is the game formula for an unoccluded point', () => {
    const reg = new LightRegistry();
    const lamp1 = reg.add({ x: 1, y: 3, z: 2, radius: 4, intensity: 0.7 });
    const spot = reg.add({ x: 0, y: 4, z: 0, radius: 8, intensity: 1, cone: { dx: 0, dy: -1, dz: 0, cosOuter: 0.8, cosInner: 0.9 } });
    // (LR16a) the registry's radius is the photometric reach (authored x PHOTO.reach); the quick light reads it with the
    // photometric term, as the bake (LR16 fix: was the linear `lampTerm`)
    const p: [number, number, number] = [1.5, 1, 2.4];
    expect(quickLevel(lamp1, ...p)).toBeCloseTo(LAMP_LEVEL_GAIN * 0.7 * photoTerm(p[0] - 1, p[1] - 3, p[2] - 2, lamp1.radius, 0, -1, 0, LAMP_CONE_COS, LAMP_EXP), 12);
    expect(quickLevel(spot, ...p)).toBeCloseTo(LAMP_LEVEL_GAIN * photoTerm(p[0], p[1] - 4, p[2], spot.radius, 0, -1, 0, 0.8, SPOT_EXP), 12);
    // (a flashlight keeps the linear torch term, as the meter's)
    const torch = reg.add({ kind: 'flashlight', x: 1.5, y: 3, z: 2, radius: 8, intensity: 1, cone: { dx: 0, dy: -1, dz: 0, cosOuter: 0.8, cosInner: 0.9 } });
    expect(quickLevel(torch, ...p)).toBeCloseTo(LAMP_LEVEL_GAIN * lampTerm(p[0] - 1.5, p[1] - 3, p[2] - 2, torch.radius, 0, -1, 0, 0.8, SPOT_EXP), 12);
    expect(quickLevel(torch, ...p)).toBeGreaterThan(0);
    // the field with no bake gives every light unoccluded: the same number
    const field = new LightField(null, reg);
    reg.ambient = 0;
    expect(field.dynamicAt(...p)).toBeCloseTo(Math.min(1, quickLevel(lamp1, ...p) + quickLevel(spot, ...p) + quickLevel(torch, ...p)), 9);
  });

  it('line of sight as perception tests it', () => {
    const eye = { x: 0, y: 1.55, z: 0 };
    const to = { x: 4, y: 1.55, z: 0 };
    expect(losClear({ ray: () => ({ hit: false, distance: 0 }) }, eye, to, 0.3)).toBe(true);
    expect(losClear({ ray: () => ({ hit: true, distance: 3.8 }) }, eye, to, 0.3)).toBe(true);
    expect(losClear({ ray: () => ({ hit: true, distance: 2 }) }, eye, to, 0.3)).toBe(false);
  });
});
