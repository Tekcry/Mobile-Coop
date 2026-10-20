import { describe, expect, it } from 'vitest';
import { NUDGE_FAST_S, STICK_DZ, TunePadCtl } from '../src/ui/animTunePad';
import { PAD } from '../src/input/gamepadMapping';

const B = (...i: number[]): number => i.reduce((m, x) => m | (1 << x), 0);
const DT = 1 / 60;

/** A controller opened with nothing held (the open's quiet frame passed). */
function opened(): { c: TunePadCtl; t: number } {
  const c = new TunePadCtl();
  c.open();
  c.update(0, 0, 0, DT);
  return { c, t: DT };
}

describe('TunePadCtl (pass 2 map)', () => {
  it('closed: the pad is the game\'s', () => {
    const c = new TunePadCtl();
    expect(c.update(B(PAD.A), 0, 0, DT).consume).toBe(false);
    expect(c.out.select).toBe(false);
  });

  it('opening swallows the held press that opened it until every button is up', () => {
    const c = new TunePadCtl();
    c.update(B(PAD.A), 0, 0, DT);
    c.open();
    const o = c.update(B(PAD.A), 0, DT, DT);
    expect(o.consume).toBe(true);
    expect(o.select).toBe(false);
    c.update(0, 0, 2 * DT, DT);
    expect(c.update(B(PAD.A), 0, 3 * DT, DT).select).toBe(true);
  });

  it('A select, B back, X reset, Y menu, LB / RB section, LT / RT state, Start close (edges)', () => {
    const { c, t } = opened();
    const o = c.update(B(PAD.A, PAD.X, PAD.Y, PAD.RB, PAD.RT), 0, t, DT);
    expect([o.select, o.reset, o.menu, o.section, o.group]).toEqual([true, true, true, 1, 1]);
    const held = c.update(B(PAD.A, PAD.X, PAD.Y, PAD.RB, PAD.RT), 0, t + 1, DT);
    expect([held.select, held.reset, held.menu, held.section, held.group]).toEqual([false, false, false, 0, 0]);
    c.update(0, 0, t + 1.1, DT);
    const o2 = c.update(B(PAD.B, PAD.LB, PAD.LT), 0, t + 1.2, DT);
    expect([o2.back, o2.section, o2.group]).toEqual([true, -1, -1]);
    c.update(0, 0, t + 1.3, DT);
    expect(c.update(B(PAD.START), 0, t + 1.4, DT).close).toBe(true);
  });

  it('not editing: the D-pad navigates (up / left back, down / right on) with repeat and never adjusts', () => {
    const { c, t } = opened();
    expect(c.update(B(PAD.DOWN), 0, t, DT).nav).toBe(1);
    expect(c.update(B(PAD.DOWN), 0, t + 0.1, DT).nav).toBe(0);
    expect(c.update(B(PAD.DOWN), 0, t + 0.4, DT).nav).toBe(1);
    c.update(0, 0, t + 0.5, DT);
    const r = c.update(B(PAD.RIGHT), 0.9, t + 0.6, DT);
    expect([r.nav, r.adjust, r.stick]).toEqual([1, 0, 0]);
    c.update(0, 0, t + 0.7, DT);
    expect(c.update(B(PAD.LEFT), 0, t + 0.8, DT).nav).toBe(-1);
  });

  it('editing: left / right adjust (repeat, x5 after the fast hold), LT is fine, the stick is analogue, LT / RT never switch state', () => {
    const { c, t } = opened();
    c.editing = true;
    const o = c.update(B(PAD.RIGHT), 0, t, DT);
    expect([o.adjust, o.nav]).toEqual([1, 0]);
    expect(c.update(B(PAD.RIGHT), 0, t + 0.1, DT).adjust).toBe(0);
    expect(c.update(B(PAD.RIGHT), 0, t + 0.4, DT).adjust).toBe(1);
    expect(c.update(B(PAD.RIGHT), 0, t + NUDGE_FAST_S + 0.1, DT).adjust).toBe(5);
    const f = c.update(B(PAD.LEFT, PAD.LT), 0, t + 2, DT);
    expect([f.adjust, f.fine, f.group]).toEqual([-1, true, 0]);
    c.update(0, 0, t + 2.1, DT);
    expect(c.update(0, STICK_DZ * 0.9, t + 2.2, DT).stick).toBe(0);
    const half = c.update(0, 0.6, t + 2.3, DT).stick;
    const full = c.update(0, -1, t + 2.4, DT).stick;
    expect(half).toBeGreaterThan(0);
    expect(full).toBeLessThan(-half);
    expect(c.update(B(PAD.UP), 0, t + 2.5, DT).nav).toBe(0);
  });

  it('R3 held is the bypass while the tuner or the free view has the pad, never in the game', () => {
    const { c, t } = opened();
    expect(c.update(B(PAD.RS), 0, t, DT).bypass).toBe(true);
    expect(c.update(0, 0, t + DT, DT).bypass).toBe(false);
    c.update(B(PAD.SELECT), 0, t + 2 * DT, DT);
    c.update(0, 0, t + 3 * DT, DT);
    expect(c.mode).toBe('game');
    expect(c.update(B(PAD.RS), 0, t + 4 * DT, DT).bypass).toBe(false);
  });

  it('Start closes; the close then swallows held buttons until released', () => {
    const { c, t } = opened();
    expect(c.update(B(PAD.START), 0, t, DT).close).toBe(true);
    c.close();
    expect(c.mode).toBe('off');
    expect(c.update(B(PAD.START), 0, t + DT, DT).consume).toBe(true);
    expect(c.update(0, 0, t + 2 * DT, DT).consume).toBe(false);
    expect(c.update(B(PAD.START), 0, t + 3 * DT, DT).consume).toBe(false);
  });

  it('View moves the pad between the tuner and the game; an edit ends', () => {
    const { c, t } = opened();
    c.editing = true;
    const o = c.update(B(PAD.SELECT), 0, t, DT);
    expect([o.toggled, o.consume, c.mode, c.editing]).toEqual([true, true, 'game', false]);
    // the rest of that press reaches nobody, then the game has the pad
    expect(c.update(B(PAD.SELECT, PAD.A), 0, t + DT, DT).consume).toBe(true);
    c.update(0, 0, t + 2 * DT, DT);
    const g = c.update(B(PAD.A, PAD.DOWN), 0, t + 3 * DT, DT);
    expect([g.consume, g.select, g.nav]).toEqual([false, false, 0]);
    c.update(0, 0, t + 4 * DT, DT);
    expect(c.update(B(PAD.SELECT), 0, t + 5 * DT, DT).toggled).toBe(true);
    expect(c.mode).toBe('tuner');
  });

  it('free view: the pad goes to it, View alternates panel and free view, B turns it off, Start closes', () => {
    const { c, t } = opened();
    c.setFree(true);
    expect(c.mode).toBe('free');
    c.update(0, 0, t, DT);
    const a = c.update(B(PAD.A, PAD.DOWN), 0, t + DT, DT);
    expect([a.consume, a.select, a.nav]).toEqual([true, false, 0]);
    c.update(0, 0, t + 2 * DT, DT);
    expect(c.update(B(PAD.SELECT), 0, t + 3 * DT, DT).toggled).toBe(true);
    expect(c.mode).toBe('tuner');
    c.update(0, 0, t + 4 * DT, DT);
    c.update(B(PAD.SELECT), 0, t + 5 * DT, DT);
    expect(c.mode).toBe('free');
    c.update(0, 0, t + 6 * DT, DT);
    expect(c.update(B(PAD.B), 0, t + 7 * DT, DT).freeOff).toBe(true);
    c.setFree(false);
    expect(c.mode).toBe('tuner');
    c.update(0, 0, t + 8 * DT, DT);
    c.setFree(true);
    c.update(0, 0, t + 9 * DT, DT);
    expect(c.update(B(PAD.START), 0, t + 10 * DT, DT).close).toBe(true);
  });
});
