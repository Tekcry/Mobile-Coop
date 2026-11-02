import { describe, expect, it } from 'vitest';
import { LightRegistry, makeCone, type LightInit } from '../src/world/lights';
import { addTorchSlots, TORCH } from '../src/world/torches';
import { PHOTO } from '../src/world/lampMath';
import { VOL_BEAM_GAIN, VOL_LAMP_COS, volBeam, writeVolLight } from '../src/vfx/volLights';
import { LevelBuilder } from '../src/world/levelBuilder';
import { ctcourse } from '../src/world/maps/ctcourse';

const pos = new Float32Array(16);
const dir = new Float32Array(16);
const col = new Float32Array(16);

/** One light written into slot `k`; returns its four uniforms. */
function write(init: LightInit, k = 0): { p: number[]; d: number[]; c: number[] } {
  const reg = new LightRegistry();
  writeVolLight(reg.add(init), k, pos, dir, col);
  const o = k * 4;
  return { p: [...pos.slice(o, o + 4)], d: [...dir.slice(o, o + 4)], c: [...col.slice(o, o + 4)] };
}

const COOL: [number, number, number] = [0.9, 0.95, 1];
const STRIP = { sx: 0.25, sy: 0.08, sz: 2.6, oy: 0.15, model: 'strip' as const };
const BULKHEAD = { sx: 0.3, sy: 0.2, sz: 0.2, oy: 0, model: 'bulkhead' as const };
const HOUSING = { sx: 0.45, sy: 0.22, sz: 0.3, oy: 0.12 };

describe('volumetric pass per-light values (vol-cone-fix)', () => {
  it('a Sector Ops strip with a beam optic scatters like a lamp: short march, lamp cone, gain 1', () => {
    // the S1 bay strip (warehouseS1 `HALL`, 45 deg) at y 5.58, radius 7.02: was r 7.02, cos 0.71, gain 1.6
    const { p, d, c } = write({ kind: 'spot', x: -22, y: 5.58, z: -15.4, radius: 7.02, intensity: 0.7, color: COOL, cone: makeCone(0, -1, 0, Math.PI / 4), fixture: STRIP });
    expect(p[3]).toBeCloseTo(3.2, 5);
    expect(d[3]).toBeCloseTo(VOL_LAMP_COS, 5);
    expect(d[1]).toBeCloseTo(-1, 5);
    expect(c[0]).toBeCloseTo(0.9 * 0.7, 5);
    expect(c[3]).toBe(1);
  });

  it('an LED fitting keeps its own beam direction (a tilted bulkhead) and a narrower cone than the lamp cone', () => {
    const tilted = write({ kind: 'spot', x: 0, y: 3, z: 0, radius: 5, intensity: 1, color: COOL, cone: makeCone(0, -0.819, -0.574, 0.96), fixture: BULKHEAD });
    expect(tilted.d[1]).toBeCloseTo(-0.819, 3);
    expect(tilted.d[2]).toBeCloseTo(-0.574, 3);
    expect(tilted.d[3]).toBeCloseTo(VOL_LAMP_COS, 5);
    expect(tilted.p[3]).toBeCloseTo(Math.min(5 * PHOTO.reach * 0.5, 3), 5); // half the reach (LR16a: radius x PHOTO.reach), at most its height
    const narrow = write({ kind: 'spot', x: 0, y: 8, z: 0, radius: 13, intensity: 1, color: COOL, cone: makeCone(0, -1, 0, 0.3), fixture: BULKHEAD });
    expect(narrow.d[3]).toBeCloseTo(Math.cos(0.3), 5);
  });

  it('a lamp without a cone is unchanged: straight down, the lamp cone, march min(3.2, radius / 2, max(0.8, y))', () => {
    const { p, d, c } = write({ kind: 'lamp', x: 1, y: 1.2, z: 2, radius: 8, intensity: 0.5, color: [1, 0.9, 0.8] });
    expect(p).toEqual([1, Math.fround(1.2), 2, Math.fround(1.2)]);
    expect(d).toEqual([0, -1, 0, Math.fround(VOL_LAMP_COS)]);
    expect(c[1]).toBeCloseTo(0.45, 5);
    expect(write({ kind: 'lamp', x: 0, y: 0.2, z: 0, radius: 8, intensity: 1, color: COOL }).p[3]).toBeCloseTo(0.8, 5);
  });

  it('only a torch draws the long beam: its reach (capped at 14 m), its own cone, gain 1.6', () => {
    const reg = new LightRegistry();
    reg.ambient = 0.2;
    addTorchSlots(reg);
    const torches = reg.lights.filter((l) => volBeam(l));
    expect(torches.length).toBeGreaterThan(0);
    // every torch slot has a cone (the old code chose the beam by the cone, the new one by kind: same branch)
    for (const l of torches) expect(l.cone).toBeTruthy();
    const t = torches[0]!;
    t.reach = 9;
    writeVolLight(t, 2, pos, dir, col);
    expect(pos[11]).toBeCloseTo(9, 5);
    expect(dir[11]).toBeCloseTo(Math.cos(TORCH.outer), 5);
    expect(col[8]).toBeCloseTo(TORCH.color[0] * TORCH.intensity * VOL_BEAM_GAIN, 5);
    delete t.reach;
    writeVolLight(t, 2, pos, dir, col);
    expect(pos[11]).toBeCloseTo(TORCH.radius, 5);
    // no cone-less light beams
    for (const kind of ['lamp', 'spot', 'window', 'fire'] as const) expect(volBeam({ kind, cone: null, fixture: null })).toBe(false);
  });

  it('a flood without an LED fitting model keeps the beam it had (the removed Warehouse facade floods)', () => {
    const { p, d, c } = write({ kind: 'spot', x: -18.5, y: 5.6, z: -18.6, radius: 7.5, intensity: 0.9, color: [0.85, 0.9, 1], cone: makeCone(0, -1, -0.25, 0.7), fixture: HOUSING });
    expect(p[3]).toBeCloseTo(7.5 * PHOTO.reach, 5); // (LR16a) the reach: radius x PHOTO.reach
    expect(d[3]).toBeCloseTo(Math.cos(0.7), 5);
    expect(c[0]).toBeCloseTo(0.85 * 0.9 * VOL_BEAM_GAIN, 5);
  });

  it("(4.119 walk, Epic glare) Marlow Yard sets lampBeams false: no set lamp beams, only torches", () => {
    expect(ctcourse.theme.lampBeams).toBe(false);
    const b = new LevelBuilder();
    ctcourse.build(b, 0);
    expect(b.lights.lights.filter((l) => volBeam(l, ctcourse.theme.lampBeams ?? true)).length).toBe(0);
  });

  it('writes only its own slot', () => {
    pos.fill(-7);
    write({ kind: 'spot', x: 3, y: 4, z: 5, radius: 6, intensity: 1, color: COOL, cone: makeCone(0, -1, 0, 0.7), fixture: STRIP }, 1);
    expect(pos[3]).toBe(-7);
    expect(pos[8]).toBe(-7);
    expect(pos[4]).toBe(3);
  });
});
