import { describe, expect, it } from 'vitest';
import { BACK_DIAG, DIAG_TURN, diagTurn, FRAME_DOWN, FRAME_UP, planeFrame, slungPosition, slungTheta, type DiagTurnStep } from '../src/weapons/backDiag';

// (CT prototype G2, AUDIT-AIM rows 1-3) the diagonal back sling and its draw / holster turn
const step = (): DiagTurnStep => ({ kind: 0, theta: 0, t: 0, from: 'start', to: 'end' });
const axis = (f: readonly number[], i: number): [number, number, number] => [f[i * 3]!, f[i * 3 + 1]!, f[i * 3 + 2]!];
const dot = (a: readonly number[], b: readonly number[]): number => a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
const cross = (a: readonly number[], b: readonly number[]): number[] => [a[1]! * b[2]! - a[2]! * b[1]!, a[2]! * b[0]! - a[0]! * b[2]!, a[0]! * b[1]! - a[1]! * b[0]!];

function rightHanded(f: readonly number[]): void {
  const x = axis(f, 0);
  const y = axis(f, 1);
  const z = axis(f, 2);
  for (const v of [x, y, z]) expect(dot(v, v)).toBeCloseTo(1, 9);
  expect(dot(x, y)).toBeCloseTo(0, 9);
  const c = cross(x, y);
  for (let i = 0; i < 3; i++) expect(c[i]!).toBeCloseTo(z[i]!, 9);
}

describe('diagonal back sling (CT: stock at the right shoulder blade, muzzle down to the left hip)', () => {
  it('slung frame: flat on the back, bore down and to the LEFT about 35 deg from vertical, top up-left', () => {
    const f = planeFrame(slungTheta(), new Array(9).fill(0));
    rightHanded(f);
    const bore = axis(f, 2);
    expect(bore[0]).toBeLessThan(-0.4);
    expect(bore[1]).toBeLessThan(-0.7);
    expect(bore[2]).toBe(0);
    // right side against the back (+z), the top up-left
    expect(axis(f, 0)).toEqual([0, 0, 1]);
    expect(axis(f, 1)[0]).toBeLessThan(0);
    expect(axis(f, 1)[1]).toBeGreaterThan(0);
    expect((Math.acos(-bore[1]) * 180) / Math.PI).toBeGreaterThan(25);
    expect((Math.acos(-bore[1]) * 180) / Math.PI).toBeLessThan(50);
  });

  it('the key frames are right-handed', () => {
    rightHanded(FRAME_UP);
    rightHanded(FRAME_DOWN);
    for (const th of [0, 1, 2, Math.PI, slungTheta()]) rightHanded(planeFrame(th, new Array(9).fill(0)));
    expect(axis(FRAME_UP, 2)).toEqual([0, 1, 0]);
    expect(axis(FRAME_DOWN, 2)).toEqual([0, -1, 0]);
  });

  it('the grip lands on the right shoulder blade, the right side on the back face', () => {
    const grip = [0, -0.07, -0.03];
    const o = slungPosition(grip, 0.03, -0.08, [0, 0, 0]);
    const f = planeFrame(slungTheta(), new Array(9).fill(0));
    for (let i = 0; i < 2; i++) expect(o[i]! + f[i]! * grip[0]! + f[3 + i]! * grip[1]! + f[6 + i]! * grip[2]!).toBeCloseTo(BACK_DIAG.grip[i]!, 9);
    expect(o[2]! + 0.03).toBeCloseTo(-0.08 - BACK_DIAG.gap, 9);
    expect(BACK_DIAG.grip[0]).toBeGreaterThan(0.05);
  });

  it('draw: the bore sweeps round the RIGHT side (never up-left across the back of the head), then muzzle up, then onto the line', () => {
    const s = step();
    const f = new Array(9).fill(0);
    let prevTh = slungTheta();
    for (let r = 0; r <= 1.0001; r += 0.01) {
      diagTurn(true, r, s);
      if (s.kind === 0) {
        planeFrame(s.theta, f);
        const bore = axis(f, 2);
        // up-left would be behind the head: the sweep goes down-left -> down -> right -> up
        expect(bore[0] < -0.05 && bore[1] > -0.05).toBe(false);
        expect(s.theta).toBeLessThanOrEqual(prevTh + 1e-9);
        prevTh = s.theta;
      } else expect(r).toBeGreaterThanOrEqual(DIAG_TURN.draw.sweep - 1e-9);
    }
    // continuous at the joins: the sweep ends at theta 0 (the twist's start key), the twist ends muzzle up
    expect(diagTurn(true, DIAG_TURN.draw.sweep - 1e-6, s).theta).toBeCloseTo(0, 4);
    const tw = diagTurn(true, DIAG_TURN.draw.sweep + 1e-6, s);
    expect([tw.from, tw.to, tw.t < 1e-3]).toEqual(['plane0', 'up', true]);
    const tip = diagTurn(true, DIAG_TURN.draw.twist + 1e-6, s);
    expect([tip.from, tip.to, tip.t < 1e-3]).toEqual(['up', 'end', true]);
    expect(diagTurn(true, 1, s).t).toBeCloseTo(1, 9);
    expect(diagTurn(true, 0, s).theta).toBeCloseTo(slungTheta(), 9);
  });

  it('holster: the muzzle goes DOWN from the line, never up (CT: instant, no arc over the head)', () => {
    const s = step();
    const f = new Array(9).fill(0);
    for (let r = 0; r <= 1.0001; r += 0.01) {
      diagTurn(false, r, s);
      if (s.kind === 0) expect(axis(planeFrame(s.theta, f), 2)[1]).toBeLessThanOrEqual(1e-9);
      else for (const k of [s.from, s.to]) if (k === 'down' || k === 'planePi') expect(k === 'down' ? FRAME_DOWN[7] : planeFrame(Math.PI, f)[7]).toBeCloseTo(-1, 9);
    }
    expect(diagTurn(false, 1, s).theta).toBeCloseTo(slungTheta(), 9);
    expect(diagTurn(false, DIAG_TURN.holster.twist + 1e-6, s).theta).toBeCloseTo(Math.PI, 4);
  });
});
