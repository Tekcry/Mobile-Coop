/**
 * guard-render S5: golden guard poses (captured on the untouched code, 70470c30). Every optimisation lever must keep
 * every captured world position and local quaternion within 1e-4. Never re-capture.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { runGuardPoseGolden, type GoldenFixture } from './helpers/guardPoseGolden';

const FIXTURE = 'tests/fixtures/guard-pose-golden.json';
const CAPTURE = process.env.GUARD_POSE_CAPTURE === '1';

describe('guard-render S5: golden guard poses', () => {
  it.skipIf(!CAPTURE)('captures the fixture (untouched code only)', async () => {
    writeFileSync(FIXTURE, `${JSON.stringify(await runGuardPoseGolden())}\n`);
  });

  it.skipIf(CAPTURE)('every kind, scenario and frame matches within 1e-4', async () => {
    expect(existsSync(FIXTURE)).toBe(true);
    const want = JSON.parse(readFileSync(FIXTURE, 'utf8')) as GoldenFixture;
    const got = await runGuardPoseGolden();
    expect(Object.keys(got).sort()).toEqual(Object.keys(want).sort());
    for (const key of Object.keys(want)) {
      const w = want[key]!;
      const g = got[key]!;
      expect(g.length, key).toBe(w.length);
      let worst = 0;
      for (let i = 0; i < w.length; i++) worst = Math.max(worst, Math.abs(g[i]! - w[i]!));
      expect(worst, key).toBeLessThan(1e-4);
    }
  });
});
