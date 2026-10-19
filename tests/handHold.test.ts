import { describe, expect, it } from 'vitest';
import { HOLDS, rotateQ, solveHold, type HandFrame, type V3 } from '../src/player/handHold';
import { WREN_HANDS, WREN_HOLSTER, WREN_BACK_MOUNT } from '../src/operators/handFrame';

const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (a: V3): V3 => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };

describe('hand holds (feature/weapons)', () => {
  for (const [side, hand, s] of [['right', WREN_HANDS.R, 1], ['left', WREN_HANDS.L, -1]] as [string, HandFrame, 1 | -1][]) {
    for (const [name, hold] of Object.entries(HOLDS)) {
      it(`${side} hand, ${name}: knuckles and palm turn onto the hold, the palm centre lands on its point`, () => {
        const r = solveHold(hand, hold, s);
        const d = rotateQ(r.q, hand.d);
        const n = rotateQ(r.q, hand.n);
        const td = unit([hold.d[0] * s, hold.d[1], hold.d[2]]);
        expect(dot(d, td)).toBeGreaterThan(0.999);
        // the palm normal is the hold's, orthogonalised against the knuckles
        const tn = unit([hold.n[0] * s, hold.n[1], hold.n[2]]);
        expect(dot(n, tn)).toBeGreaterThan(0.9);
        // wrist + rotated palm offset = the hold's palm point
        const p = rotateQ(r.q, hand.palm);
        for (let k = 0; k < 3; k++) expect(r.wrist[k]! + p[k]!).toBeCloseTo(k === 0 ? hold.palm[0] * s : hold.palm[k]!, 6);
        expect(Math.hypot(...r.q)).toBeCloseTo(1, 6);
      });
    }
  }
  it('the left hold mirrors the right one', () => {
    const r = solveHold(WREN_HANDS.R, HOLDS.trigger, 1);
    const l = solveHold(WREN_HANDS.L, HOLDS.trigger, -1);
    expect(l.wrist[0]).toBeCloseTo(-r.wrist[0], 5);
    expect(l.wrist[1]).toBeCloseTo(r.wrist[1], 5);
    expect(l.wrist[2]).toBeCloseTo(r.wrist[2], 5);
  });
  it("Wren's holster and back mount frames are orthonormal, bore down / up, the mount facing out of her back", () => {
    const { x, y, z } = WREN_HOLSTER;
    for (const v of [x, y, z]) expect(Math.hypot(...v)).toBeCloseTo(1, 3);
    expect(Math.abs(dot(x, y)) + Math.abs(dot(y, z)) + Math.abs(dot(x, z))).toBeLessThan(0.01);
    expect(z[1]).toBeLessThan(-0.99);
    for (const m of Object.values(WREN_BACK_MOUNT)) {
      expect(m.up[1]).toBeGreaterThan(0.99);
      expect(m.out[2]).toBe(-1);
      expect(m.origin[2]).toBeLessThan(-0.07);
    }
  });
});

describe('world grips: holdInto (anim-cleanup slice 3)', () => {
  it('matches solveHold for the same frames, and rotates the palm offset by the same rotation', async () => {
    const { holdInto } = await import('../src/player/handHold');
    for (const [hand, s] of [[WREN_HANDS.R, 1], [WREN_HANDS.L, -1]] as [HandFrame, 1 | -1][]) {
      const h = HOLDS.tube;
      const ref = solveHold(hand, h, s);
      const out = new Float64Array(7);
      expect(holdInto(hand, h.d[0] * s, h.d[1], h.d[2], h.n[0] * s, h.n[1], h.n[2], out)).toBe(true);
      const dq = Math.abs(out[0]! * ref.q[0] + out[1]! * ref.q[1] + out[2]! * ref.q[2] + out[3]! * ref.q[3]);
      expect(dq).toBeGreaterThan(0.9999);
      const p = rotateQ(ref.q, hand.palm);
      for (let k = 0; k < 3; k++) expect(out[4 + k]!).toBeCloseTo(p[k]!, 6);
    }
  });
  it('refuses a degenerate frame (palm normal along the knuckles) instead of returning a broken rotation', async () => {
    const { holdInto } = await import('../src/player/handHold');
    const out = new Float64Array(7);
    expect(holdInto(WREN_HANDS.R, 0, 1, 0, 0, 1, 0, out)).toBe(false);
    expect(holdInto(WREN_HANDS.R, 0, 0, 0, 1, 0, 0, out)).toBe(false);
  });
});
