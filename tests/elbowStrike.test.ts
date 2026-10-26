import { describe, expect, it } from 'vitest';
import { facingDot, resolveStrike, STRIKE, STRIKE_DUR, STRIKE_WHIFF_DUR, strikePhase, strikeReach, strikeStage } from '../src/game/elbowStrike';

describe('palm strike (CT prototype A4, G42 / G155)', () => {
  it('tuning (footage: contact 0.10-0.15 s, free about 1.4 s after contact)', () => {
    expect(STRIKE).toMatchObject({ reach: 1.3, hitAt: 0.08, recover: 1.4, whiffRecover: 0.3, noise: 4 });
    expect(STRIKE.cone).toBeCloseTo((Math.PI * 140) / 180);
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
    expect(strikeReach(0, 1.4, 0)).toBe(-1);
    expect(strikeReach(0, 1.4, 0, STRIKE.contactSlack)).toBeCloseTo(1.4);
    expect(strikeReach(0.6, 0.8, 0)).toBeCloseTo(1); // 37 deg off: inside
    expect(strikeReach(0.9, 0.5, 0)).toBeCloseTo(Math.hypot(0.9, 0.5)); // 61 deg off: inside the 70 deg half cone
    expect(strikeReach(1, 0.2, 0)).toBe(-1); // 79 deg off: outside
    expect(strikeReach(0, -1, 0)).toBe(-1); // behind
  });
  it('timeline (F1b; J19 R8): wind-up 0.06, contact 0.08, free at 1.48 (1.4 s after contact); a whiff is shorter', () => {
    expect(STRIKE_DUR).toBe(1.48);
    expect(STRIKE_DUR - STRIKE.hitAt).toBeCloseTo(1.4, 12);
    expect(STRIKE_WHIFF_DUR).toBeCloseTo(0.38, 12); // the whiff unchanged
    expect(STRIKE_WHIFF_DUR).toBeLessThan(STRIKE_DUR);
    expect(strikeStage(0)).toBe('anticipation');
    expect(strikeStage(0.05)).toBe('anticipation');
    expect(strikeStage(0.06)).toBe('strike');
    expect(strikeStage(0.079)).toBe('strike');
    expect(strikeStage(0.08)).toBe('recover');
    expect(strikeStage(1.47)).toBe('recover');
    expect(strikeStage(1.48)).toBe('done');
    expect(strikePhase(0)).toBe(0);
    expect(strikePhase(STRIKE.hitAt)).toBeCloseTo(0.08 / 1.48, 12);
    expect(strikePhase(STRIKE_DUR / 2)).toBeCloseTo(0.5);
    expect(strikePhase(3)).toBe(1);
  });
});
