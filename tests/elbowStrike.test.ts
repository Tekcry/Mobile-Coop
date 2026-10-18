import { describe, expect, it } from 'vitest';
import { facingDot, resolveStrike, STRIKE, STRIKE_DUR, strikePhase, strikeReach, strikeStage } from '../src/game/elbowStrike';

const v = (o: Partial<{ aware: boolean; facingDot: number; heavy: boolean; staggered: boolean }>) => ({ aware: false, facingDot: 1, heavy: false, staggered: false, ...o });

describe('elbow strike (bible 5.4)', () => {
  it('tuning', () => {
    expect(STRIKE).toMatchObject({ reach: 1.2, hitAt: 0.5, recover: 0.4, stagger: 1.0, noise: 4 });
    expect(STRIKE.cone).toBeCloseTo(Math.PI / 2);
    expect(STRIKE.lunge).toBeLessThanOrEqual(0.3);
  });
  it('resolve table', () => {
    // unaware, any side -> knocked out
    for (const fd of [1, 0.6, 0, -1]) expect(resolveStrike(v({ aware: false, facingDot: fd }))).toBe('ko');
    // aware, side / behind -> knocked out
    for (const fd of [0.5, 0, -1]) expect(resolveStrike(v({ aware: true, facingDot: fd }))).toBe('ko');
    // aware, facing -> stagger
    expect(resolveStrike(v({ aware: true, facingDot: 0.9 }))).toBe('stagger');
    // a second strike inside the stagger -> knocked out
    expect(resolveStrike(v({ aware: true, facingDot: 0.9, staggered: true }))).toBe('ko');
    // heavy from the front: stagger only, never knocked out (unaware, staggered, aware)
    for (const o of [{ aware: false }, { aware: true }, { aware: true, staggered: true }]) expect(resolveStrike(v({ heavy: true, facingDot: 0.9, ...o }))).toBe('stagger');
    // heavy from behind: knocked out
    expect(resolveStrike(v({ heavy: true, aware: true, facingDot: -1 }))).toBe('ko');
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
  it('timeline: anticipation 0-0.15, contact 0.5, recovery to 0.9', () => {
    expect(STRIKE_DUR).toBeCloseTo(0.9);
    expect(strikeStage(0)).toBe('anticipation');
    expect(strikeStage(0.14)).toBe('anticipation');
    expect(strikeStage(0.15)).toBe('strike');
    expect(strikeStage(0.49)).toBe('strike');
    expect(strikeStage(0.5)).toBe('recover');
    expect(strikeStage(0.89)).toBe('recover');
    expect(strikeStage(0.9)).toBe('done');
    expect(strikePhase(0)).toBe(0);
    expect(strikePhase(0.45)).toBeCloseTo(0.5);
    expect(strikePhase(2)).toBe(1);
  });
  it('a whiff keeps the 0.4 s recovery exposed', () => {
    let t = STRIKE.hitAt;
    let exposed = 0;
    while (strikeStage(t) !== 'done') {
      exposed += 1 / 60;
      t += 1 / 60;
    }
    expect(exposed).toBeGreaterThanOrEqual(STRIKE.recover - 1 / 60);
  });
});
