import { describe, it, expect } from 'vitest';
import { DualClock, DUAL_WINDOW } from '../src/game/dualTakedown';

describe('DualClock (spare 12)', () => {
  it('window is 1.5 s', () => expect(DUAL_WINDOW).toBe(1.5));
  it('pairs two players inside the window', () => {
    const c = new DualClock();
    expect(c.note('a', 0)).toBeNull();
    expect(c.note('b', 1.4)).toBe('a');
  });
  it('too late: the second becomes the last', () => {
    const c = new DualClock();
    c.note('a', 0);
    expect(c.note('b', 1.6)).toBeNull();
    expect(c.note('a', 2.0)).toBe('b');
  });
  it('window is inclusive', () => {
    const c = new DualClock();
    c.note('a', 0);
    expect(c.note('b', 1.5)).toBe('a');
  });
  it('same player twice: the newer replaces the older', () => {
    const c = new DualClock();
    c.note('a', 0);
    expect(c.note('a', 1)).toBeNull();
    expect(c.note('b', 2.4)).toBe('a');
  });
  it('clears after a pair', () => {
    const c = new DualClock();
    c.note('a', 0);
    expect(c.note('b', 1)).toBe('a');
    expect(c.note('a', 1.2)).toBeNull();
  });
  it('reset clears the last takedown', () => {
    const c = new DualClock();
    c.note('a', 0);
    c.reset();
    expect(c.note('b', 0.5)).toBeNull();
  });
});
