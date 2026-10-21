import { describe, expect, it } from 'vitest';
import { FOOT_TURN_SCENARIOS, footTurnTable, runFootTurn } from './footTurnHarness';

// (anim-natural N1) The feet in turns, measured headless in sim time (tests/footTurnHarness.ts). Loose sanity checks only
// for now: the table is the measurement (N1 BRIEF "measured before / after"); N1's rule tightens these into limits.
describe('foot turn harness (anim-natural N1)', () => {
  const rows = FOOT_TURN_SCENARIOS.map(runFootTurn);
  it('measures every scenario (finite numbers) and prints the table', () => {
    console.info(`\nfoot turn harness (60 Hz, sim time; deg / cm / s)\n${footTurnTable(rows)}\n`);
    for (const r of rows) {
      // (minGapCm is NaN when the feet were never side by side in the window)
      for (const [k, v] of Object.entries(r)) if (typeof v === 'number' && !((k === 'minGapCm' || k === 'minGapBodyCm') && Number.isNaN(v))) expect(Number.isFinite(v), `${r.name} ${k}`).toBe(true);
      expect(r.steps, r.name).toBeGreaterThanOrEqual(0);
    }
    // the turns turn and step
    for (const r of rows.filter((q) => / (45|90|180)$/.test(q.name) && !q.name.startsWith('aim'))) {
      expect(Math.abs(r.yawTotalDeg), r.name).toBeGreaterThan(30);
      expect(r.steps, r.name).toBeGreaterThan(0);
    }
  });
});
