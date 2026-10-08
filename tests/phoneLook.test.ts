import { describe, expect, it } from 'vitest';
import { FULL, Governor, phoneAdaptiveAt } from '../src/core/governor';
import { levelLabel, PHONE_CUTS, PHONE_FEATURES, PHONE_FLOOR, PHONE_SCALES, PHONE_SHADOW, PHONE_VOXEL_FEATURES, qualityLevel, shadowSpec } from '../src/core/quality';
import { SPIKE_EVENT, SpikeLog } from '../src/core/spikes';
import { benchPlan, phoneCheckRuns, sectionText } from '../src/game/benchmark';
import { BOX_STRIDE, LAMP_CELL } from '../src/voxel/lampBake';
import { lampVolumeGrid, lampVolumeRegion, unionRegion } from '../src/voxel/lampVolume';

describe('the phone look (3.3, 3.4)', () => {
  it('3.4: the light look - the 2.x renderer, native, labelled phone', () => {
    const q = qualityLevel('custom', PHONE_FEATURES, false, 1, 0, true, true, true);
    expect(q.phone).toBe(true);
    expect(q.lite).toBe(true);
    expect(q.upscale).toBe(1);
    expect(q.shadow).toEqual(shadowSpec('off'));
    expect(levelLabel(q)).toBe('phone');
    expect(PHONE_FEATURES).toMatchObject({ shadows: 'off', ao: false, bloom: false, reflections: 'off', gi: false, volumetrics: false, dof: false, motionBlur: false, lens: false });
    // the test path is never the phone look
    expect(qualityLevel('custom', PHONE_FEATURES, true, 1, 0, true, true, true).lite).toBe(false);
    // a PC level never is
    expect(qualityLevel('custom', PHONE_FEATURES, false, 1, 0, false, false, true).lite).toBe(false);
  });

  it('the 3.3 voxel look stays for the Phone check: its features and shadows, labelled phone voxel', () => {
    const q = qualityLevel('custom', PHONE_VOXEL_FEATURES, false, PHONE_FLOOR, 0, true, true);
    expect(q.phone).toBe(true);
    expect(q.lite).toBe(false);
    expect(q.shadow).toEqual(PHONE_SHADOW);
    expect(q.upscale).toBe(0.75);
    expect(levelLabel(q)).toBe('phone voxel');
    // what it leaves out
    expect(PHONE_VOXEL_FEATURES).toMatchObject({ ao: false, bloom: false, reflections: 'off', volumetrics: false, dof: false, motionBlur: false, lens: false });
    expect(PHONE_CUTS).toEqual({ lampVolume: true, plainVoxels: true });
    // a Phone check run changing the shadows gets the mobile spec for them
    expect(qualityLevel('custom', { ...PHONE_VOXEL_FEATURES, shadows: 'high' }, false, 0.75, 0, true, true).shadow.cascades).toBe(2);
    expect(qualityLevel('custom', PHONE_VOXEL_FEATURES, true, 1, 0, true, true).phone).toBe(false);
  });

  it('the governor ladder is the resolution only, 75 - 100%, then 30 fps', () => {
    expect(PHONE_SCALES[0]).toBe(1);
    expect(PHONE_SCALES[PHONE_SCALES.length - 1]).toBe(PHONE_FLOOR);
    for (let l = 0; l <= PHONE_SCALES.length; l++) {
      const a = phoneAdaptiveAt(l, PHONE_SCALES, PHONE_FLOOR);
      // (relative to the 75% base: x1.33 = native)
      const abs = a.scale * PHONE_FLOOR;
      expect(abs).toBeGreaterThanOrEqual(PHONE_FLOOR - 1e-9);
      expect(abs).toBeLessThanOrEqual(1 + 1e-9);
      expect({ ...a, scale: 1 }).toEqual({ ...FULL });
    }
    expect(phoneAdaptiveAt(0, PHONE_SCALES, PHONE_FLOOR).scale * PHONE_FLOOR).toBeCloseTo(1);
    // a match starts at the floor; missed frames step to the 30 fps level, room steps back up
    const g = new Governor();
    g.max = PHONE_SCALES.length;
    g.reset(PHONE_SCALES.length - 1);
    expect(g.level).toBe(3);
    let changed = false;
    for (let i = 0; i < 200 && !changed; i++) changed = g.frame(30, 16.7);
    expect(g.level).toBe(4);
    // (never past the 30 fps level)
    for (let i = 0; i < 400; i++) g.frame(40, 16.7);
    expect(g.level).toBe(4);
    // at 30 fps with room: tries 60 again
    let up = false;
    for (let i = 0; i < 1000 && !up; i++) up = g.frame(20, 33.3) && g.level === 3;
    expect(up).toBe(true);
  });
});

describe('the phone light volume grid (3.3)', () => {
  const boxes = (...b: number[][]): Float32Array => new Float32Array(b.flat());
  it('covers every lamp box on the bake cells, from a cell under the floor', () => {
    // two boxes (origin, cells) - one dipping under the floor
    const b = boxes([-2.1, -1.0, 0.3, 20, 30, 10], [3.05, 0, -4, 10, 10, 10]);
    const g = lampVolumeGrid(b, 0);
    expect(g.cell).toBe(LAMP_CELL);
    expect(g.o[1]).toBeCloseTo(-LAMP_CELL);
    for (let i = 0; i < 2; i++) {
      const o = i * BOX_STRIDE;
      expect(g.o[0]).toBeLessThanOrEqual(b[o]! + 1e-6);
      expect(g.o[2]).toBeLessThanOrEqual(b[o + 2]! + 1e-6);
      expect(g.o[0] + g.dims[0] * g.cell).toBeGreaterThanOrEqual(b[o]! + b[o + 3]! * LAMP_CELL - 1e-6);
      expect(g.o[1] + g.dims[1] * g.cell).toBeGreaterThanOrEqual(b[o + 1]! + b[o + 4]! * LAMP_CELL - 1e-6);
      expect(g.o[2] + g.dims[2] * g.cell).toBeGreaterThanOrEqual(b[o + 2]! + b[o + 5]! * LAMP_CELL - 1e-6);
      const r = lampVolumeRegion(b, i, g);
      for (let k = 0; k < 3; k++) {
        expect(r[k]).toBeGreaterThanOrEqual(0);
        expect(r[k + 3]).toBeLessThanOrEqual(g.dims[k as 0 | 1 | 2]);
        expect(r[k + 3]).toBeGreaterThan(r[k]!);
      }
    }
    expect(unionRegion([lampVolumeRegion(b, 0, g), lampVolumeRegion(b, 1, g)])).toEqual([0, 0, 0, g.dims[0], g.dims[1], g.dims[2]]);
    expect(unionRegion([])).toBeNull();
  });
});

describe('spike log (3.3)', () => {
  it('tags each long frame with what happened around it', () => {
    const s = new SpikeLog();
    // a smooth frame, then a shader compile and the long frame after it
    expect(s.frame(16, 16.7, 4, 0)).toBeNull();
    expect(s.frame(17, 16.7, 4, SPIKE_EVENT.shaders)).toBeNull();
    expect(s.frame(40, 16.7, 4, 0)).toBe('shaders');
    // the main thread over budget; else the GPU
    expect(s.frame(40, 16.7, 15, 0)).toBe('cpu');
    expect(s.frame(40, 16.7, 3, 0)).toBe('gpu');
    expect(s.frame(40, 16.7, 3, SPIKE_EVENT.lamps)).toBe('lamps');
    expect(s.summary()).toContain('4 spikes in 6 frames');
    expect(s.summary()).toContain('gpu 1');
    s.reset();
    expect(s.summary()).toBe('no spikes in 0 frames');
    // (3.3.1) uncapped on a 120 Hz screen: steady 14 ms frames against an 8.3 ms budget are not spikes; a 40 ms one is
    for (let i = 0; i < 60; i++) expect(s.frame(14, 8.3, 3, 0)).toBeNull();
    expect(s.frame(40, 8.3, 3, 0)).toBe('gpu');
    expect(s.typicalMs).toBeLessThan(16);
  });
});

describe('per-section frame rate (3.3.1)', () => {
  it('prints each section of the route', () => {
    expect(sectionText([70.2, 68.6, 41.4])).toBe('by 2.5 s (7 m): 70 69 41');
    expect(sectionText([])).toBe('');
  });
});

describe('Phone check (3.3, 3.4)', () => {
  it('runs the light look native and at 75%, the moon shadow, the 3.3 voxel look, the first again, then a hold', () => {
    const runs = phoneCheckRuns();
    expect(benchPlan('phone', 2868, 1320)).toEqual(runs);
    expect(runs[0]!.scale).toBe(1);
    expect(runs[1]!.scale).toBe(PHONE_FLOOR);
    expect(runs.some((r) => r.gfx?.shadows === 'low')).toBe(true);
    const voxel = runs.filter((r) => r.look === 'voxel');
    expect(voxel.length).toBe(1);
    expect(voxel[0]!.scale).toBe(PHONE_FLOOR);
    const hold = runs[runs.length - 1]!;
    expect(hold.cap).toBe(60);
    expect(hold.sustained).toBe(true);
    expect(hold.scale).toBe(1);
    expect(hold.look).toBeUndefined();
    const short = runs.slice(0, -1);
    expect(runs.every((r) => r.preset === null)).toBe(true);
    expect(short.every((r) => r.seconds === runs[0]!.seconds && r.cap === undefined)).toBe(true);
    expect(new Set(runs.map((r) => r.label)).size).toBe(runs.length);
    // (3.3.1: the first run again - the heat check - before the capped hold)
    const again = runs[runs.length - 2]!;
    expect(again.scale).toBe(runs[0]!.scale);
    expect(again.cuts ?? again.gfx ?? again.look).toBeUndefined();
  });
});
