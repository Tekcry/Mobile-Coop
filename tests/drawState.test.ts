import { describe, expect, it } from 'vitest';
import { DRAW_DRAWING, DRAW_DRAWN, DRAW_HOLSTERED, DRAW_HOLSTERING, DRAW_TIME_PRIMARY, DRAW_TIME_SIDEARM, DrawState, drawTimeFor, fireReady, HOLSTER_TIME } from '../src/weapons/drawState';

const DT = 1 / 60;
/** Seconds until `phase` (stepping at 60 Hz with aim held / released). */
function timeTo(d: DrawState, aim: boolean, drawTime: number, phase: number): number {
  let t = 0;
  while (d.phase !== phase && t < 5) {
    d.update(DT, aim, drawTime);
    t += DT;
  }
  return t;
}

describe('draw state (step 09)', () => {
  it('draw times per class and the holster time', () => {
    expect(drawTimeFor('pistol')).toBe(DRAW_TIME_SIDEARM);
    expect(drawTimeFor('rifle')).toBe(DRAW_TIME_PRIMARY);
    expect(drawTimeFor('smg')).toBe(DRAW_TIME_PRIMARY);
    const d = new DrawState();
    expect(d.phase).toBe(DRAW_HOLSTERED);
    expect(timeTo(d, true, 0.3, DRAW_DRAWN)).toBeCloseTo(0.3, 1);
    expect(timeTo(d, false, 0.3, DRAW_HOLSTERED)).toBeCloseTo(HOLSTER_TIME, 1);
    expect(timeTo(d, true, 0.4, DRAW_DRAWN)).toBeCloseTo(0.4, 1);
  });
  it('phases: drawing then drawn, holstering then holstered', () => {
    const d = new DrawState();
    expect(d.update(DT, true, 0.4)).toBe(DRAW_DRAWING);
    timeTo(d, true, 0.4, DRAW_DRAWN);
    expect(d.update(DT, false, 0.4)).toBe(DRAW_HOLSTERING);
    expect(d.remaining(0.4)).toBeGreaterThan(0.3);
  });
  it('release mid-draw reverses from the current progress', () => {
    const d = new DrawState();
    for (let i = 0; i < 12; i++) d.update(DT, true, 0.4); // 0.2 s: half drawn
    expect(d.progress).toBeCloseTo(0.5, 2);
    const t = timeTo(d, false, 0.4, DRAW_HOLSTERED);
    expect(t).toBeCloseTo(0.5 * HOLSTER_TIME, 1);
    // and pressed again mid-holster draws from where it is
    timeTo(d, true, 0.4, DRAW_DRAWN);
    for (let i = 0; i < 6; i++) d.update(DT, false, 0.4);
    expect(d.phase).toBe(DRAW_HOLSTERING);
    expect(timeTo(d, true, 0.4, DRAW_DRAWN)).toBeLessThan(0.2);
  });
  it('aim is the only trigger: nothing without aim, whatever else happens', () => {
    const d = new DrawState();
    for (let i = 0; i < 120; i++) d.update(DT, false, 0.3);
    expect(d.phase).toBe(DRAW_HOLSTERED);
    expect(d.progress).toBe(0);
  });
  it('no hip fire: only drawn and aimed in', () => {
    expect(fireReady(DRAW_HOLSTERED, 1)).toBe(false);
    expect(fireReady(DRAW_DRAWING, 1)).toBe(false);
    expect(fireReady(DRAW_HOLSTERING, 1)).toBe(false);
    expect(fireReady(DRAW_DRAWN, 0.5)).toBe(false);
    expect(fireReady(DRAW_DRAWN, 0.9)).toBe(true);
  });
});
