import { describe, expect, it } from 'vitest';
import { LightRegistry, makeCone, type LightInit } from '../src/world/lights';
import { addTorchSlots, TORCH } from '../src/world/torches';
import { VOL_BEAM_GAIN, VOL_LAMP_COS, volBeam, writeVolLight } from '../src/vfx/volLights';

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

describe('volumetric pass per-light values (vol-cone-fix)', () => {
  it('a Sector Ops strip with a beam optic scatters like a lamp: short march, lamp cone, gain 1', () => {
    // the S1 bay strip (warehouseS1 `HALL`, 45 deg) at y 5.58, radius 7.02: was r 7.02, cos 0.71, gain 1.6
    const { p, d, c } = write({ kind: 'spot', x: -22, y: 5.58, z: -15.4, radius: 7.02, intensity: 0.7, color: COOL, cone: makeCone(0, -1, 0, Math.PI / 4) });
    expect(p[3]).toBeCloseTo(3.2, 5);
    expect(d[3]).toBeCloseTo(VOL_LAMP_COS, 5);
    expect(d[1]).toBeCloseTo(-1, 5);
    expect(c[0]).toBeCloseTo(0.9 * 0.7, 5);
    expect(c[3]).toBe(1);
  });

  it('a fixed spot keeps its own beam direction (a tilted bulkhead or flood) and a narrower cone than the lamp cone', () => {
    const tilted = write({ kind: 'spot', x: 0, y: 3, z: 0, radius: 5, intensity: 1, color: COOL, cone: makeCone(0, -0.819, -0.574, 0.96) });
    expect(tilted.d[1]).toBeCloseTo(-0.819, 3);
    expect(tilted.d[2]).toBeCloseTo(-0.574, 3);
    expect(tilted.d[3]).toBeCloseTo(VOL_LAMP_COS, 5);
    expect(tilted.p[3]).toBeCloseTo(2.5, 5); // half the radius
    const narrow = write({ kind: 'spot', x: 0, y: 8, z: 0, radius: 13, intensity: 1, color: COOL, cone: makeCone(0, -1, 0, 0.3) });
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
    // no other kind beams
    for (const kind of ['lamp', 'spot', 'window', 'fire'] as const) expect(volBeam({ kind })).toBe(false);
  });

  it('writes only its own slot', () => {
    pos.fill(-7);
    write({ kind: 'spot', x: 3, y: 4, z: 5, radius: 6, intensity: 1, color: COOL, cone: makeCone(0, -1, 0, 0.7) }, 1);
    expect(pos[3]).toBe(-7);
    expect(pos[8]).toBe(-7);
    expect(pos[4]).toBe(3);
  });
});
