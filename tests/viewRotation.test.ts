import { describe, expect, it } from 'vitest';
import { turnFor, wantsRotation } from '../src/core/viewRotation';

describe('forced landscape (3.1.6, 3.2.4)', () => {
  it('turns a portrait touch window, the way of the last landscape grip', () => {
    expect(wantsRotation(true, true)).toBe(true);
    expect(turnFor(false, true, 90)).toBe(0);
    expect(turnFor(true, false, 90)).toBe(0);
    expect(turnFor(true, true, 90)).toBe(90);
    expect(turnFor(true, true, 270)).toBe(-90);
    expect(turnFor(true, true, -90)).toBe(-90);
    // (never held landscape: clockwise)
    expect(turnFor(true, true, 0)).toBe(90);
  });
});
