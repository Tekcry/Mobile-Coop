// (LR16-polish A1) Night vision's glare and auto-gain follow a tube's flicker: a lamp in a drop-out has no glare, a dimmer
// one ranks below the same lamp steady, and its target follows the multiplier (0 when blocked).
import { describe, expect, it } from 'vitest';
import { glareTarget, pickGlare, type GlareLamp } from '../src/vfx/nightVision';

const lamp = (x: number, z: number, o: Partial<GlareLamp> = {}): GlareLamp => ({ x, y: 3, z, kind: 'lamp', on: true, destroyed: false, intensity: 1, flicker: 1, fixture: null, ...o });

const pick = (lamps: GlareLamp[]): { n: number; out: Int16Array } => {
  const out = new Int16Array(4);
  const score = new Float32Array(4);
  return { n: pickGlare(lamps, 0, 1.6, 0, 0, 0, 1, out, score), out };
};

describe('night vision glare follows the flicker', () => {
  it('skips a lamp at flicker 0 (a tube in a drop-out)', () => {
    const { n } = pick([lamp(0, 6, { flicker: 0 })]);
    expect(n).toBe(0);
    expect(pick([lamp(0, 6, { flicker: 1 })]).n).toBe(1);
  });

  it('ranks a lamp at 0.5 below the same lamp at 1', () => {
    const { n, out } = pick([lamp(0, 6, { flicker: 0.5 }), lamp(1, 6, { flicker: 1 })]);
    expect(n).toBe(2);
    expect(out[0]).toBe(1);
    expect(out[1]).toBe(0);
  });

  it('the auto-gain target is 0 at flicker 0, 0.5 at 0.5, 0 when blocked', () => {
    expect(glareTarget(false, 0)).toBe(0);
    expect(glareTarget(false, 0.5)).toBe(0.5);
    expect(glareTarget(false, 1)).toBe(1);
    expect(glareTarget(true, 1)).toBe(0);
    expect(glareTarget(true, 0.5)).toBe(0);
  });
});
