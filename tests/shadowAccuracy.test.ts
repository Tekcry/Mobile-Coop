/**
 * Shadow accuracy fixes (sector-redesign shadow audit, Michael 2026-10-23 ~14:45; `world/shadowAccuracy.ts`, default
 * off, on with the LR13 falloff toggle). Findings: `docs/sector-redesign/checks/shadow-audit.md`.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/world/levelBuilder';
import { canonicalLightSet } from '../src/voxel/lightShapes';
import { bakeLamps } from '../src/voxel/lampBake';
import { bakedLights, type LightBake } from '../src/world/lightBake';
import { ambientFromGrid, AMBIENT_CELL, buildAmbientGrid } from '../src/world/ambientGrid';
import { bakeVisSampler, doorSeen, DOORS_PER_LAMP, lampDoorLists, LightField, trilinear, type FieldDoor } from '../src/world/lightField';
import { setLampFalloff } from '../src/world/lampMath';
import { gameLightFalloff, rayOccluder, setShadowAccuracy, shadowAccuracyOn, torchShadowPass } from '../src/world/shadowAccuracy';

afterEach(() => {
  setShadowAccuracy(null);
  setLampFalloff('linear');
});

describe('the toggle', () => {
  it('is off by default and follows the LR13 falloff toggle unless set', () => {
    expect(shadowAccuracyOn()).toBe(false);
    setLampFalloff('photometric');
    expect(shadowAccuracyOn()).toBe(true);
    setShadowAccuracy(false);
    expect(shadowAccuracyOn()).toBe(false);
    setLampFalloff('linear');
    setShadowAccuracy(true);
    expect(shadowAccuracyOn()).toBe(true);
  });
});

/** A lamp at (0, 3, 0) beside a 4 m wall at x -0.7..-0.5 (everything at x < -0.7 is hidden from it), a 0.1 / 0.5 fill. */
function scene() {
  const b = new LevelBuilder();
  b.box(0, -0.1, 0, 24, 0.2, 24, '#888');
  b.box(-0.6, 2, 0, 0.2, 4, 16, '#888');
  const reg = b.lights;
  reg.add({ x: 0, y: 3, z: 0, radius: 8, intensity: 1 });
  reg.ambient = 0.5;
  reg.addZone({ minX: -12, maxX: 0.5, minY: -1, maxY: 6, minZ: -12, maxZ: 12, ambient: 0.1 });
  const set = canonicalLightSet(b.boxes, b.cylinders, 'shadow-test', false);
  const baked = bakedLights(reg);
  const r = bakeLamps({ kind: 'lamps', id: 0, shapes: set.shapes, lights: baked.lights, lo: set.lo, hi: set.hi });
  const ambient = buildAmbientGrid(reg, set.lo, set.hi);
  const bake: LightBake = { lo: set.lo, hi: set.hi, lampKey: 't', moonKey: 't', lamps: { baked, r }, moon: { origin: set.lo, n: [1, 1, 1], cell: 1, vis: new Uint8Array([255]), dir: [0, 1, 0] }, ambient, moonLight: 0, ms: 0 };
  // five doors behind the wall (nearer the lamp, unseen) and one in its view at x 4.5 (the sixth nearest)
  const door = (x: number, z: number): FieldDoor => ({ anchor: { hinge: { x, y: 0, z }, yaw: 0, width: 1, height: 2.1 }, open: 0 });
  const doors = [door(-1.5, -3), door(-1.5, -1.5), door(-1.5, 0), door(-1.5, 1.5), door(-2, 3), door(4.5, -0.5)];
  return { reg, bake, doors, r, baked };
}

describe('door lists skip the doorways a lamp cannot see', () => {
  it('the seen door keeps a slot; the field cuts the light behind it', () => {
    const { reg, bake, doors, r, baked } = scene();
    const seen = bakeVisSampler(r);
    expect(doors.slice(0, 5).every((d) => !doorSeen(seen, 0, d))).toBe(true);
    expect(doorSeen(seen, 0, doors[5]!)).toBe(true);
    // today: the four nearest (all behind the wall); the door in view gets no slot
    const old = lampDoorLists(baked.lights, doors);
    expect(Array.from(old.subarray(0, DOORS_PER_LAMP)).includes(5)).toBe(false);
    const fixed = lampDoorLists(baked.lights, doors, seen);
    expect(fixed[0]).toBe(5);
    // a point behind the closed door in view: the leaf is between it and the lamp
    const p: [number, number, number] = [5.5, 1, 0];
    const off = new LightField(bake, reg, doors);
    expect(off.doorBlocks(0, 3, 0, ...p)).toBe(true);
    expect(off.lampAt(0, ...p)).toBeGreaterThan(0.05);
    setShadowAccuracy(true);
    const on = new LightField(bake, reg, doors);
    expect(on.lampAt(0, ...p)).toBe(0);
    // with the door open the light passes in both
    doors[5]!.open = 1;
    expect(on.lampAt(0, ...p)).toBeCloseTo(off.lampAt(0, ...p), 9);
  });

  it('the sampler reads what the field reads', () => {
    const { reg, bake, r } = scene();
    const f = new LightField(bake, reg);
    const s = bakeVisSampler(r);
    const pts: [number, number, number][] = [[1, 1, 0], [3.3, 0.4, -2.2], [-2, 1, 0], [0.2, 2.9, 0.1]];
    for (const p of pts) expect(s(0, ...p)).toBeCloseTo(f.visAt(0, ...p), 9);
  });
});

describe('the ambient fill is read as the shaders read it', () => {
  it('trilinear with the fixes on, the nearest cell without', () => {
    const { reg, bake } = scene();
    reg.setOn(0, false);
    const g = bake.ambient;
    const off = new LightField(bake, reg);
    setShadowAccuracy(true);
    const on = new LightField(bake, reg);
    let most = 0;
    for (let x = -2; x <= 3; x += 0.1) {
      const tri = trilinear(g.data, 0, g.origin[0], g.origin[1], g.origin[2], g.n[0], g.n[1], g.n[2], AMBIENT_CELL, x, 1.2, 0.3);
      expect(off.levelAt(x, 1.2, 0.3)).toBeCloseTo(ambientFromGrid(g, x, 1.2, 0.3), 9);
      expect(on.levelAt(x, 1.2, 0.3)).toBeCloseTo(tri, 9);
      most = Math.max(most, Math.abs(tri - ambientFromGrid(g, x, 1.2, 0.3)));
    }
    // the zone edge: the old read stepped by up to half the zone's step from what the picture shows
    expect(most).toBeGreaterThan(0.15);
  });
});

describe('flashlights in the picture', () => {
  it('game PBR materials drop the inverse-square falloff only with the fixes on', () => {
    const m = { usePhysicalLightFalloff: true };
    expect(gameLightFalloff(m, false)).toBe(false);
    expect(m.usePhysicalLightFalloff).toBe(true);
    expect(gameLightFalloff(m, true)).toBe(true);
    expect(m.usePhysicalLightFalloff).toBe(false);
    expect(gameLightFalloff({}, true)).toBe(false);
  });

  it('shadow maps go to the cut beams first', () => {
    const cut = { kind: 'flashlight', radius: 13, reach: 3.4 };
    const free = { kind: 'flashlight', radius: 13, reach: 13 };
    const lamp = { kind: 'lamp', radius: 6 };
    expect([torchShadowPass(cut, false), torchShadowPass(free, false), torchShadowPass(lamp, false)]).toEqual([0, 0, 1]);
    expect([torchShadowPass(cut, true), torchShadowPass(free, true), torchShadowPass(lamp, true)]).toEqual([0, 1, 2]);
    expect(torchShadowPass({ kind: 'flashlight', radius: 13 }, true)).toBe(1);
  });

  it('a body behind a wall is not lit by a torch for the guards', () => {
    // a wall at x 2: the ray stops there
    const hit = (ax: number, _ay: number, _az: number, bx: number, by: number, bz: number): number => {
      const full = Math.hypot(bx - ax, by - _ay, bz - _az);
      return ax < 2 && bx > 2 ? (full * (2 - ax)) / (bx - ax) : full;
    };
    const occ = rayOccluder(hit);
    const torch = { x: 0, y: 1.5, z: 0 };
    expect(occ(torch, 4, 0.2, 0)).toBe(true);
    expect(occ(torch, 1.5, 0.2, 0)).toBe(false);
    expect(occ(torch, 0.1, 1.4, 0)).toBe(false);
  });
});
