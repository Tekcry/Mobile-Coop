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

describe('TunePadCtl (tuner-pad)', () => {
  it('closed: the pad is the game\'s', () => {
    const c = new TunePadCtl();
    expect(c.update(B(PAD.A), 0, 0, DT).consume).toBe(false);
    expect(c.out.exportNow).toBe(false);
  });

  it('opening swallows the held press that opened it until every button is up', () => {
    const c = new TunePadCtl();
    c.update(B(PAD.A), 0, 0, DT);
    c.open();
    const o = c.update(B(PAD.A), 0, DT, DT);
    expect(o.consume).toBe(true);
    expect(o.exportNow).toBe(false);
    c.update(0, 0, 2 * DT, DT);
    expect(c.update(B(PAD.A), 0, 3 * DT, DT).exportNow).toBe(true);
  });

  it('edge-triggers the face buttons, D-pad up / down and the shoulders', () => {
    const { c, t } = opened();
    const o = c.update(B(PAD.DOWN, PAD.RB, PAD.Y), 0, t, DT);
    expect([o.consume, o.move, o.group, o.reset]).toEqual([true, 1, 1, true]);
    const held = c.update(B(PAD.DOWN, PAD.RB, PAD.Y), 0, t + 1, DT);
    expect([held.move, held.group, held.reset]).toEqual([0, 0, false]);
    c.update(0, 0, t + 1.1, DT);
    expect(c.update(B(PAD.UP, PAD.LB), 0, t + 1.2, DT).move).toBe(-1);
    expect(c.out.group).toBe(-1);
  });

  it('left / right nudge on the press, repeat while held, x5 after the fast hold', () => {
    const { c, t } = opened();
    expect(c.update(B(PAD.RIGHT), 0, t, DT).nudge).toBe(1);
    expect(c.update(B(PAD.RIGHT), 0, t + 0.1, DT).nudge).toBe(0);
    expect(c.update(B(PAD.RIGHT), 0, t + 0.4, DT).nudge).toBe(1);
    expect(c.update(B(PAD.RIGHT), 0, t + NUDGE_FAST_S + 0.1, DT).nudge).toBe(5);
    // a direction change starts a new hold
    expect(c.update(B(PAD.LEFT), 0, t + 2, DT).nudge).toBe(-1);
  });

  it('the left stick X gives analogue steps past the deadzone', () => {
    const { c, t } = opened();
    expect(c.update(0, STICK_DZ * 0.9, t, DT).stick).toBe(0);
    const half = c.update(0, 0.6, t + DT, DT).stick;
    const full = c.update(0, -1, t + 2 * DT, DT).stick;
    expect(half).toBeGreaterThan(0);
    expect(full).toBeLessThan(-half);
  });

  it('B closes; the close then swallows B until released', () => {
    const { c, t } = opened();
    expect(c.update(B(PAD.B), 0, t, DT).close).toBe(true);
    c.close();
    expect(c.mode).toBe('off');
    expect(c.update(B(PAD.B), 0, t + DT, DT).consume).toBe(true);
    expect(c.update(0, 0, t + 2 * DT, DT).consume).toBe(false);
    expect(c.update(B(PAD.B), 0, t + 3 * DT, DT).consume).toBe(false);
  });

  it('View moves the pad between the tuner and the game', () => {
    const { c, t } = opened();
    const o = c.update(B(PAD.SELECT), 0, t, DT);
    expect([o.toggled, o.consume, c.mode]).toEqual([true, true, 'game']);
    // the rest of that press reaches nobody, then the game has the pad
    expect(c.update(B(PAD.SELECT, PAD.A), 0, t + DT, DT).consume).toBe(true);
    c.update(0, 0, t + 2 * DT, DT);
    const g = c.update(B(PAD.A, PAD.DOWN), 0, t + 3 * DT, DT);
    expect([g.consume, g.exportNow, g.move]).toEqual([false, false, 0]);
    c.update(0, 0, t + 4 * DT, DT);
    expect(c.update(B(PAD.SELECT), 0, t + 5 * DT, DT).toggled).toBe(true);
    expect(c.mode).toBe('tuner');
  });
});
