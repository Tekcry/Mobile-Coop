import { describe, expect, it } from 'vitest';
import { SP, STEP_GAITS, stepResetAll, stepSet } from '../src/anim/tuneStep';
import { FOOT_TURN_SCENARIOS, footTurnTable, runFootTurn } from './footTurnHarness';

// (anim-natural N1) The feet in turns, measured headless in sim time (tests/footTurnHarness.ts). The table is the
// measurement (BRIEF "measured before / after"); the limits are REPORT-A's where the turn rules reach them.
describe('foot turn harness (anim-natural N1)', () => {
  const rows = FOOT_TURN_SCENARIOS.map((s) => runFootTurn(s));
  it('measures every scenario (finite numbers) and prints the table', () => {
    console.info(`\nfoot turn harness (60 Hz, sim time; deg / cm / s)\n${footTurnTable(rows)}\n`);
    for (const r of rows) {
      // (minGapCm is NaN when the feet were never side by side in the window)
      for (const [k, v] of Object.entries(r)) if (typeof v === 'number' && !((k === 'minGapCm' || k === 'minGapBodyCm') && Number.isNaN(v))) expect(Number.isFinite(v), `${r.name} ${k}`).toBe(true);
      expect(r.steps, r.name).toBeGreaterThanOrEqual(0);
    }
    // the turns turn and step
    for (const r of rows.filter((q) => (/ (45|90|180)( L)?$/.test(q.name) || q.name.startsWith('stand turn')) && !q.name.startsWith('aim'))) {
      expect(Math.abs(r.yawTotalDeg), r.name).toBeGreaterThan(30);
      expect(r.steps, r.name).toBeGreaterThan(0);
    }
  });

  it('the contact stays put: contact-point slide < 1 cm in every scenario (master 3.8-14.8 cm in turns)', () => {
    for (const r of rows) expect(r.contactCm, r.name).toBeLessThan(1);
  });

  it('no wind-up: a planted foot lifts within 30 deg of the body (master: the cap held 14 deg by scrubbing; aimed 52 deg)', () => {
    for (const r of rows) expect(r.twistAtLift, r.name).toBeLessThanOrEqual(30);
  });

  it('the turn is taken by the ball pivot and the turn step, not the ankle-centred cap (a backstop) nor the band scrub', () => {
    for (const r of rows) {
      // (the aimed spot 180 meets the backstop for ~11 deg, about the ball: no slide)
      expect(r.capDeg, r.name).toBeLessThanOrEqual(15);
      expect(r.bandCm, r.name).toBe(0);
      expect(r.dragCm, r.name).toBe(0);
    }
  });

  it('the feet never cross: least gap >= 2 cm whenever side by side (master: -8.7 cm in a gentle jog curve, mid-swing)', () => {
    for (const r of rows) if (!Number.isNaN(r.minGapCm)) expect(r.minGapCm, r.name).toBeGreaterThanOrEqual(2);
  });

  it('no snap: the swing foot turns at most SWING_YAW_RATE; 45 / 90 deg jog and run turns under 300 deg/s', () => {
    for (const r of rows) expect(r.snapYaw, r.name).toBeLessThanOrEqual(700);
    for (const r of rows.filter((q) => /^(jog|run) (45|90)$/.test(q.name))) expect(r.snapYaw, r.name).toBeLessThanOrEqual(300);
  });

  it('turnRule 0 is the planner as before (the master table: jog 90 scrubs 50 deg about the ankle)', () => {
    const sc = FOOT_TURN_SCENARIOS.find((s) => s.name === 'jog 90')!;
    const off = runFootTurn(sc, undefined, { turnRule: 0 });
    expect(off.capDeg).toBeGreaterThan(45);
    expect(off.renderSlideCm).toBeGreaterThan(5);
  });

  it('the Stepping sliders are live per gait: the jog pivot locked (0) hands the turn to the turn step and the cap; landTurn moves the landings', () => {
    const sc = FOOT_TURN_SCENARIOS.find((s) => s.name === 'jog 90')!;
    const base = runFootTurn(sc);
    try {
      stepSet(STEP_GAITS.indexOf('jog'), SP.pivot, 0);
      const locked = runFootTurn(sc);
      // (the turn step then takes most of it: the cap backstop turns ~5 deg)
      expect(locked.capDeg).toBeGreaterThan(base.capDeg + 2);
      stepResetAll();
      stepSet(STEP_GAITS.indexOf('walk'), SP.pivot, 0);
      expect(runFootTurn(sc).capDeg).toBe(base.capDeg);
      stepResetAll();
      stepSet(STEP_GAITS.indexOf('jog'), SP.landTurn, 0);
      // (the landing's lead into the turn: the feet land elsewhere)
      expect(JSON.stringify(runFootTurn(sc))).not.toBe(JSON.stringify(base));
    } finally {
      stepResetAll();
    }
  });

  it('no worse than master where the limit is not reached: plant time while turning (jog / run <= 0.25 s), first swing frames (<= 5 m/s)', () => {
    for (const r of rows.filter((q) => /^(jog|run)/.test(q.name))) expect(r.plantTurnS, r.name).toBeLessThanOrEqual(0.25);
    for (const r of rows) expect(r.snap, r.name).toBeLessThanOrEqual(5);
  });
});
