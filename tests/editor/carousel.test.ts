import { describe, expect, it } from 'vitest';
import { carouselFade, carouselSlots, carouselWindow, wrapIndex } from '../../src/editor/carousel';

describe('type carousel (Michael 2026-10-14)', () => {
  it('wraps indices both ways', () => {
    expect(wrapIndex(-1, 5)).toBe(4);
    expect(wrapIndex(5, 5)).toBe(0);
    expect(wrapIndex(12, 5)).toBe(2);
    expect(wrapIndex(3, 0)).toBe(0);
  });

  it('fits an odd number of items, at least one, at most the max', () => {
    expect(carouselSlots(1000, 118, 4, 7)).toBe(7);
    expect(carouselSlots(600, 118, 4, 7)).toBe(3);
    expect(carouselSlots(610, 118, 4, 7)).toBe(5);
    expect(carouselSlots(50, 118, 4, 7)).toBe(1);
  });

  it('centres the current item with its neighbours either side, wrapping', () => {
    expect(carouselWindow(10, 0, 5)).toEqual([
      { i: 8, off: -2 },
      { i: 9, off: -1 },
      { i: 0, off: 0 },
      { i: 1, off: 1 },
      { i: 2, off: 2 },
    ]);
    expect(carouselWindow(10, 9, 3).map((s) => s.i)).toEqual([8, 9, 0]);
    expect(carouselWindow(10, -1, 3).map((s) => s.i)).toEqual([8, 9, 0]);
  });

  it('a short list shows each item once', () => {
    expect(carouselWindow(3, 1, 7).map((s) => s.i)).toEqual([0, 1, 2]);
    expect(carouselWindow(2, 0, 7)).toEqual([
      { i: 0, off: 0 },
      { i: 1, off: 1 },
    ]);
    expect(carouselWindow(0, 0, 7)).toEqual([]);
  });

  it('fades toward the edges, the centre full', () => {
    expect(carouselFade(0, 3)).toBe(1);
    expect(carouselFade(1, 3)).toBeGreaterThan(carouselFade(2, 3));
    expect(carouselFade(-2, 3)).toBe(carouselFade(2, 3));
    expect(carouselFade(9, 3)).toBe(0.25);
  });
});
