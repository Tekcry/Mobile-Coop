import { describe, expect, it } from 'vitest';
import { bytesPerCall, HEAP_NUMBER, inputs, sink } from './helpers/allocPerCall';
import { LAMP_GRID_SLOTS } from '../src/voxel/lampBake';
import { contribution, LightRegistry } from '../src/world/lights';
import { bodyEstimate, coveRow, HEAD_Y, lampLevel, lampsPerColumn, MARLOW_LEVEL, meterBand, poolIntensity, spillsPast, type LampSpec } from '../src/world/lighting/levels';
import { MARLOW_LAMP_BUDGET } from '../src/world/lighting/marlowCircuits';

describe('Marlow light targets and estimates (LIGHTING-PLAN section 2)', () => {
  it('lampLevel is the registry contribution of a downward lamp (one formula)', () => {
    const reg = new LightRegistry();
    const l = reg.add({ x: 3, y: 4.2, z: 5, radius: 5, intensity: 0.6 });
    const spec: LampSpec = { x: 3, y: 4.2, z: 5, radius: 5, intensity: 0.6 };
    for (const [x, y, z] of [[3, 1.6, 5], [4, 1, 6], [6, 0.5, 5]] as const) expect(lampLevel(spec, x, y, z)).toBeCloseTo(contribution(l, x, y, z), 9);
  });

  it('poolIntensity solves the intensity for a pool target straight under a lamp', () => {
    const drop = 4.2 - HEAD_Y;
    const i = poolIntensity(MARLOW_LEVEL.poolMin, MARLOW_LEVEL.standby, drop, 6);
    const v = bodyEstimate([{ x: 0, y: 4.2, z: 0, radius: 6, intensity: i }], MARLOW_LEVEL.standby, 0, 0, 0);
    expect(v).toBeCloseTo(MARLOW_LEVEL.poolMin, 6);
    expect(meterBand(v + 1e-6)).toBe('lit');
    expect(poolIntensity(0.6, 0.14, 7, 5)).toBe(Infinity);
  });

  it('a room cove row at 2.4 m centres reads lit enough on a 0.14 fill and stays inside the column cap', () => {
    // a 3.0 m room, a cove 0.3 m off each long wall of a 6 m wide room, lamps every <= 2.4 m (the kit's slot segment)
    const lamps: LampSpec[] = [];
    for (const z of [0.3, 5.7]) for (const [x] of coveRow(0, z, 12, z, 2.4)) lamps.push({ x, y: 2.95, z, radius: 4.5, intensity: 0.45 });
    expect(lamps.length).toBe(10);
    const mid = bodyEstimate(lamps, MARLOW_LEVEL.standby, 6, 0, 3);
    const edge = bodyEstimate(lamps, MARLOW_LEVEL.standby, 6, 0, 1);
    expect(mid).toBeGreaterThanOrEqual(MARLOW_LEVEL.readMin);
    expect(edge).toBeGreaterThan(mid);
    expect(lampsPerColumn(lamps, [0, 0, 12, 6])).toBeLessThanOrEqual(MARLOW_LAMP_BUDGET.perColumn);
    expect(MARLOW_LAMP_BUDGET.perColumn).toBe(LAMP_GRID_SLOTS);
  });

  it('a cut circuit leaves only the standby fill: dark on the meter', () => {
    expect(meterBand(bodyEstimate([], MARLOW_LEVEL.standby, 0, 0, 0))).toBe('dark');
    // a neighbour's lamp 6 m away with radius 5 adds nothing
    expect(bodyEstimate([{ x: 6, y: 4.2, z: 0, radius: 5, intensity: 0.9 }], MARLOW_LEVEL.standby, 0, 0, 0)).toBe(MARLOW_LEVEL.standby);
  });

  it('spillsPast: a gallery lamp must stop short of the glazing plane', () => {
    expect(spillsPast({ x: 0, y: 7, z: 22, radius: 3.5, intensity: 0.5 }, 'z', 18)).toBe(false);
    expect(spillsPast({ x: 0, y: 7, z: 22, radius: 3.9, intensity: 0.5 }, 'z', 18)).toBe(true);
  });

  it('coveRow spaces lamps evenly and never over the spacing', () => {
    const r = coveRow(0, 0, 10, 0, 2.4);
    expect(r.length).toBe(5);
    expect(r[1]![0] - r[0]![0]).toBeCloseTo(2, 9);
    expect(r[0]![0]).toBeCloseTo(1, 9);
  });

  it('bodyEstimate does not allocate', async () => {
    const lamps: LampSpec[] = Array.from({ length: 8 }, (_, i) => ({ x: i * 2, y: 4, z: 0, radius: 5, intensity: 0.5 }));
    // gc() + new space per round (tests/helpers/allocPerCall.ts): a heapUsed delta read other work's garbage (5.2 MB on
    // the train 32 release CI runner). bodyEstimate is a planning estimate (no runtime caller): a CI runner that does not
    // inline lampLevel boxes its doubles (264 B a call on 8 lamps), so the limit allows a boxed double per lampLevel call
    // plus the arguments and result; one { x, y, z } per lamp would add 8 x 48+ B and still fail.
    const X = inputs(2000, (i) => (i % 16) * 0.5);
    const limit = (2 * lamps.length + 2) * HEAP_NUMBER;
    sink[0] = 0;
    const per = await bytesPerCall((n) => {
      for (let i = 0; i < n; i++) sink[0]! += bodyEstimate(lamps, 0.14, X[i]!, 0, 1);
    }, limit);
    expect(sink[0]!).toBeGreaterThan(0);
    expect(per).toBeLessThanOrEqual(limit);
  });
});
