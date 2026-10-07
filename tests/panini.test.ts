import { describe, expect, it } from 'vitest';
import { paniniScale, paniniView } from '../src/core/panini';

describe('panini projection', () => {
  const o: [number, number] = [0, 0];
  it('is rectilinear at d = 0 and leaves the centre alone', () => {
    expect(paniniView(0.7, 0.3, 0, o)).toEqual([expect.closeTo(0.7, 9), expect.closeTo(0.3, 9)]);
    expect(paniniView(0, 0, 1, o)).toEqual([0, 0]);
    expect(paniniScale(1.7, 0)).toBe(1);
  });
  it('compresses the sides: an output point near the edge samples further out, monotonically', () => {
    let prev = 0;
    for (let x = 0.1; x < 1.9; x += 0.1) {
      const sx = paniniView(x, 0, 1, o)[0];
      expect(sx).toBeGreaterThan(prev);
      expect(sx).toBeGreaterThanOrEqual(x - 1e-9);
      prev = sx;
    }
  });
  it('the fitted output width samples exactly the screen edge (120 deg wide)', () => {
    const tanX = Math.tan((120 * Math.PI) / 360);
    for (const d of [0.25, 0.5, 1]) {
      const s = paniniScale(tanX, d);
      expect(s).toBeLessThan(1);
      expect(paniniView(tanX * s, 0, d, o)[0]).toBeCloseTo(tanX, 6);
    }
  });
});
