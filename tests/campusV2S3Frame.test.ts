/**
 * (campus-greybox S3 R1a) The v2 lab block's frame (`docs/campus-greybox/briefs/S3.md` section 4 "R1a"): with section 3's
 * v2 flag on the campus builds; `S3_DOORS` holds every door of brief 3.2 (centre and floor); the north corridor wall's
 * door centres are >= 3.0 apart (D:78); the gallery door faces no door within 2.0 across the corridor (D:79).
 */
import { describe, expect, it, vi } from 'vitest';

/** Loads the campus modules fresh with `flags.campusV2 = [3]` (the selection is made at load, as on a page). */
async function loadV2S3() {
  vi.resetModules();
  const { flags } = await import('../src/core/flags');
  flags.campusV2 = [3];
  const sections = await import('../src/world/maps/campusSections');
  const kit = await import('../src/world/maps/campusV2/s3Kit');
  const s3 = await import('../src/world/maps/campusV2/s3');
  const { buildCampus } = await import('../src/world/maps/campusOps');
  const { LevelBuilder } = await import('../src/world/levelBuilder');
  return { sections, kit, s3, buildCampus, LevelBuilder };
}

/** Brief 3.2, row by row: id -> [x, z, floor]. */
const DOORS_32: Record<string, readonly [number, number, number]> = {
  c3Near: [24, 0, 0],
  c2Far: [10, -14, 4.5],
  roller: [21.5, -11, 0],
  ctlHall: [40.6, -11, 0],
  nStairW: [30, -6, 0],
  nStairE: [33.5, -6, 0],
  nStairL1: [31.6, -7, 4.5],
  ctlPlant: [52, -9, 0],
  plantHall: [52, -26.8, 0],
  eStairG: [59.7, -7, 0],
  wStairG: [14, -20.05, 0],
  wStairL1: [14, -20.05, 4.5],
  landingFire: [12, -11, 4.5],
  hoist: [12.6, -7, 4.5],
  writeup: [24.6, -7, 4.5],
  gown: [35.5, -7, 4.5],
  passThrough: [37.5, -3, 4.5],
  airlock: [47, -3, 4.5],
  storeHatch: [49.6, -7, 4.5],
  staff: [58, -6, 4.5],
  eStairL1: [59.7, -7, 4.5],
  gallery: [43.2, -11, 4.5],
  sec: [58.6, -11, 4.5],
  walkway: [14, -29.0, 6.0],
};

describe('campus v2 S3 frame (R1a)', () => {
  it('section 3 on: the v2 parts are selected and the campus builds without throwing', async () => {
    const m = await loadV2S3();
    expect(m.sections.CAMPUS_PARTS[2]).toBe(m.sections.CAMPUS_V2_PARTS[2]);
    expect(m.sections.CAMPUS_PARTS[2]!.build).toBe(m.s3.buildCampusS3);
    const b = new m.LevelBuilder();
    expect(() => m.buildCampus(b, { dress: false })).not.toThrow();
  });

  it('S3_DOORS holds every door of brief 3.2 (centre and floor), and a swing for each', async () => {
    const { kit } = await loadV2S3();
    expect(Object.keys(kit.S3_DOORS).sort()).toEqual(Object.keys(DOORS_32).sort());
    for (const [id, want] of Object.entries(DOORS_32)) {
      const got = kit.S3_DOORS[id as keyof typeof kit.S3_DOORS];
      expect([...got], id).toEqual([...want]);
    }
    expect(Object.keys(kit.S3_DOOR_SWING).sort()).toEqual(Object.keys(DOORS_32).sort());
    expect(kit.S3_DOOR_SWING.roller).toBe(0);
    // the fixed doors stay as built (S3:324-328)
    expect(kit.S3_DOOR_SWING.c3Near).toBe(-1);
    expect(kit.S3_DOOR_SWING.c2Far).toBe(1);
  });

  it('the north corridor wall (z -7, L1) door centres are 12.6, 24.6, 31.6, 35.5, 49.6, 59.7, each >= 3.0 apart (D:78)', async () => {
    const { kit } = await loadV2S3();
    const xs = Object.values(kit.S3_DOORS)
      .filter((d) => d[1] === -7 && d[2] === kit.S3_L1)
      .map((d) => d[0])
      .sort((p, q) => p - q);
    expect(xs).toEqual([12.6, 24.6, 31.6, 35.5, 49.6, 59.7]);
    for (let i = 1; i < xs.length; i++) expect(xs[i]! - xs[i - 1]!, `${xs[i - 1]} -> ${xs[i]}`).toBeGreaterThanOrEqual(3.0 - 1e-9);
  });

  it('the gallery door faces no door within 2.0 across the corridor (z -11 vs z -7 centres, L1; D:79)', async () => {
    const { kit } = await loadV2S3();
    const south = Object.entries(kit.S3_DOORS).filter(([, d]) => d[1] === -11 && d[2] === kit.S3_L1);
    const north = Object.entries(kit.S3_DOORS).filter(([, d]) => d[1] === -7 && d[2] === kit.S3_L1);
    expect(south.map(([id]) => id).sort()).toEqual(['gallery', 'landingFire', 'sec']);
    const facing: string[] = [];
    for (const [a, p] of south) for (const [c, q] of north) if (Math.abs(p[0] - q[0]) < 2.0) facing.push(`${a}/${c}`);
    // the gallery door is the plan's rule (D:79); the landing fire door (x 12) faces the hoist door (x 12.6) and the
    // security door (x 58.6) faces the east core's L1 door (x 59.7) as signed (D:78, P45): recorded, reported to the lead
    expect(facing.filter((f) => f.startsWith('gallery/'))).toEqual([]);
    expect(facing.sort()).toEqual(['landingFire/hoist', 'sec/eStairL1']);
  });
});
