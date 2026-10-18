import { describe, expect, it } from 'vitest';
import { facingDot, resolveStrike, STRIKE, STRIKE_DUR, STRIKE_WHIFF_DUR, strikePhase, strikeReach, strikeStage } from '../src/game/elbowStrike';

describe('palm strike (CT prototype A4, G42 / G155)', () => {
  it('tuning (footage: contact 0.10-0.15 s, free about 1.4 s after contact)', () => {
    expect(STRIKE).toMatchObject({ reach: 1.2, hitAt: 0.12, recover: 1.4, noise: 4 });
    expect(STRIKE.cone).toBeCloseTo(Math.PI / 2);
    expect(STRIKE.lunge).toBeGreaterThanOrEqual(0.3);
    expect(STRIKE.lunge).toBeLessThanOrEqual(0.5);
  });
  it('one hit knocks out every guard from any side, aware or not, heavy or not', () => {
    for (const fd of [1, 0.6, 0, -1]) {
      for (const aware of [true, false]) expect(resolveStrike({ aware, facingDot: fd })).toBe('ko');
    }
    expect(resolveStrike()).toBe('ko');
  });
  it('facing dot', () => {
    expect(facingDot(0, 0, 0, 0, 1)).toBeCloseTo(1);
    expect(facingDot(0, 0, 0, 0, -1)).toBeCloseTo(-1);
    expect(facingDot(Math.PI / 2, 0, 0, 0, 1)).toBeCloseTo(0);
  });
  it('reach and cone', () => {
    expect(strikeReach(0, 1, 0)).toBeCloseTo(1);
    expect(strikeReach(0, 1.3, 0)).toBe(-1);
    expect(strikeReach(0, 1.3, 0, STRIKE.lagSlack)).toBeCloseTo(1.3);
    expect(strikeReach(0.6, 0.8, 0)).toBeCloseTo(1); // 37 deg off: inside
    expect(strikeReach(0.9, 0.5, 0)).toBe(-1); // 61 deg off: outside
    expect(strikeReach(0, -1, 0)).toBe(-1); // behind
  });
  it('timeline: wind-up 0.1, contact 0.12, free at 1.52; a whiff is shorter', () => {
    expect(STRIKE_DUR).toBeCloseTo(1.52);
    expect(STRIKE_WHIFF_DUR).toBeLessThan(STRIKE_DUR);
    expect(strikeStage(0)).toBe('anticipation');
    expect(strikeStage(0.09)).toBe('anticipation');
    expect(strikeStage(0.1)).toBe('strike');
    expect(strikeStage(0.119)).toBe('strike');
    expect(strikeStage(0.12)).toBe('recover');
    expect(strikeStage(1.51)).toBe('recover');
    expect(strikeStage(1.52)).toBe('done');
    expect(strikePhase(0)).toBe(0);
    expect(strikePhase(STRIKE_DUR / 2)).toBeCloseTo(0.5);
    expect(strikePhase(3)).toBe(1);
  });
});
