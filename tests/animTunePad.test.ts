import { describe, expect, it } from 'vitest';
import { NUDGE_FAST_S, SCROLL_DZ, SCROLL_FAST_S, scrollInterval, STICK_ACCEL_MAX, STICK_DZ, TunePadCtl } from '../src/ui/animTunePad';
import { mapPad, PAD } from '../src/input/gamepadMapping';

const B = (...i: number[]): number => i.reduce((m, x) => m | (1 << x), 0);
const DT = 1 / 60;

/** A controller opened with nothing held (the open's quiet frame passed). */
function opened(): { c: TunePadCtl; t: number } {
  const c = new TunePadCtl();
  c.open();
  c.update(0, 0, 0, 0, DT);
  return { c, t: DT };
}

describe('TunePadCtl (marlow-bays item 29: the v3 map)', () => {
  it("closed: the pad is the game's", () => {
    const c = new TunePadCtl();
    expect(c.update(B(PAD.A), 0, 0, 0, DT).consume).toBe(false);
    expect(c.out.select).toBe(false);
  });

  it('opening swallows the held press that opened it until every button is up', () => {
    const c = new TunePadCtl();
    c.update(B(PAD.A), 0, 0, 0, DT);
    c.open();
    const o = c.update(B(PAD.A), 0, 0, DT, DT);
    expect(o.consume).toBe(true);
    expect(o.select).toBe(false);
    c.update(0, 0, 0, 2 * DT, DT);
    expect(c.update(B(PAD.A), 0, 0, 3 * DT, DT).select).toBe(true);
  });

  it('A select, B back, X reset, Y menu, LB / RB tab, Start close (edges); the triggers do nothing here (camera zoom)', () => {
    const { c, t } = opened();
    const o = c.update(B(PAD.A, PAD.X, PAD.Y, PAD.RB, PAD.RT), 0, 0, t, DT);
    expect([o.select, o.reset, o.menu, o.section, o.nav, o.side]).toEqual([true, true, true, 1, 0, 0]);
    const held = c.update(B(PAD.A, PAD.X, PAD.Y, PAD.RB, PAD.RT), 0, 0, t + 1, DT);
    expect([held.select, held.reset, held.menu, held.section]).toEqual([false, false, false, 0]);
    c.update(0, 0, 0, t + 1.1, DT);
    const o2 = c.update(B(PAD.B, PAD.LB, PAD.LT), 0, 0, t + 1.2, DT);
    expect([o2.back, o2.section]).toEqual([true, -1]);
    c.update(0, 0, 0, t + 1.3, DT);
    expect(c.update(B(PAD.START), 0, 0, t + 1.4, DT).close).toBe(true);
  });

  it('the D-pad: up / down rows (repeat), left / right one value step (repeat, x5 after the fast hold)', () => {
    const { c, t } = opened();
    expect(c.update(B(PAD.DOWN), 0, 0, t, DT).nav).toBe(1);
    expect(c.update(B(PAD.DOWN), 0, 0, t + 0.1, DT).nav).toBe(0);
    expect(c.update(B(PAD.DOWN), 0, 0, t + 0.4, DT).nav).toBe(1);
    c.update(0, 0, 0, t + 0.5, DT);
    expect(c.update(B(PAD.UP), 0, 0, t + 0.6, DT).nav).toBe(-1);
    c.update(0, 0, 0, t + 0.7, DT);
    const r = c.update(B(PAD.RIGHT), 0, 0, t + 0.8, DT);
    expect([r.nav, r.side]).toEqual([0, 1]);
    let fast = 0;
    for (let s = t + 0.8; s < t + 0.8 + NUDGE_FAST_S + 0.5; s += DT) fast = Math.max(fast, c.update(B(PAD.RIGHT), 0, 0, s, DT).side);
    expect(fast).toBe(5);
    c.update(0, 0, 0, t + 3, DT);
    expect(c.update(B(PAD.LEFT), 0, 0, t + 3.1, DT).side).toBe(-1);
  });

  it('the left stick up / down scrolls: a step at once, then repeats that speed up with the lean and the hold', () => {
    const { c, t } = opened();
    expect(c.update(0, 0, SCROLL_DZ - 0.05, t, DT).nav).toBe(0);
    expect(c.update(0, 0, -0.6, t + DT, DT).nav).toBe(-1);
    c.update(0, 0, 0, t + 2 * DT, DT);
    // a light lean repeats slower than a full one
    const count = (ly: number, secs: number, t0: number): number => {
      let n = 0;
      for (let s = 0; s < secs; s += DT) n += Math.abs(c.update(0, 0, ly, t0 + s, DT).nav);
      c.update(0, 0, 0, t0 + secs, DT);
      return n;
    };
    const light = count(0.5, 0.9, t + 1);
    const full = count(1, 0.9, t + 3);
    expect(full).toBeGreaterThan(light);
    expect(scrollInterval(1, 0)).toBeLessThan(scrollInterval(0, 0));
    expect(scrollInterval(0.5, SCROLL_FAST_S)).toBeCloseTo(scrollInterval(0.5, 0) / 2);
    // a lean mostly sideways never scrolls
    expect(c.update(0, 0.9, 0.5, t + 6, DT).nav).toBe(0);
  });

  it('the left stick left / right changes the value (analogue, it speeds up when held), never while it scrolls', () => {
    const { c, t } = opened();
    expect(c.update(0, STICK_DZ - 0.05, 0, t, DT).stick).toBe(0);
    const first = c.update(0, 1, 0, t + DT, DT).stick;
    expect(first).toBeGreaterThan(0);
    let later = 0;
    for (let s = 0; s < 2; s += DT) later = c.update(0, 1, 0, t + 2 * DT + s, DT).stick;
    expect(later).toBeGreaterThan(first * 2);
    expect(later).toBeLessThanOrEqual(first * STICK_ACCEL_MAX + 1e-9);
    c.update(0, 0, 0, t + 3, DT);
    expect(c.update(0, -0.6, 0, t + 3.1, DT).stick).toBeLessThan(0);
    expect(c.update(0, 0.3, 0.9, t + 3.2, DT).stick).toBe(0);
  });

  it('R3 held is the bypass while the tuner has the pad, never in the game', () => {
    const { c, t } = opened();
    expect(c.update(B(PAD.RS), 0, 0, t, DT).bypass).toBe(true);
    c.update(0, 0, 0, t + 0.1, DT);
    c.update(B(PAD.SELECT), 0, 0, t + 0.2, DT);
    c.update(0, 0, 0, t + 0.3, DT);
    expect(c.update(B(PAD.RS), 0, 0, t + 0.4, DT).bypass).toBe(false);
  });

  it('Start closes; the close then swallows held buttons until released', () => {
    const { c, t } = opened();
    expect(c.update(B(PAD.START), 0, 0, t, DT).close).toBe(true);
    c.close();
    expect(c.update(B(PAD.START, PAD.A), 0, 0, t + 0.1, DT).consume).toBe(true);
    c.update(0, 0, 0, t + 0.2, DT);
    expect(c.update(B(PAD.A), 0, 0, t + 0.3, DT).consume).toBe(false);
  });

  it('View moves the pad between the tuner and the game (no camera mode: the right stick is always the camera)', () => {
    const { c, t } = opened();
    const o = c.update(B(PAD.SELECT), 0, 0, t, DT);
    expect([o.toggled, o.consume, c.mode]).toEqual([true, true, 'game']);
    c.update(0, 0, 0, t + 0.1, DT);
    expect(c.update(B(PAD.A), 0, 0, t + 0.2, DT).consume).toBe(false);
    c.update(0, 0, 0, t + 0.3, DT);
    c.update(B(PAD.SELECT), 0, 0, t + 0.4, DT);
    expect(c.mode).toBe('tuner');
  });

  it('(G343) a View press the tuner consumes never reaches the game actions (no objective popup from the toggle)', () => {
    const snap = (down: number): { buttons: number[]; axes: number[] } => ({ buttons: Array.from({ length: 17 }, (_, i) => ((down >> i) & 1) * 1), axes: [0, 0, 0, 0] });
    const tuning = { deadzoneLeft: 0.15, deadzoneRight: 0.15, triggerDeadzone: 0.05, curve: 'linear' as const, invertY: false };
    // what `GamepadSource.poll` does: a frame the tuner consumes is taken by the hook and never mapped
    const toGame = (c: TunePadCtl, mask: number, t: number): boolean => {
      const o = c.update(mask, 0, 0, t, DT);
      return !o.consume && mapPad(snap(mask), tuning).buttons.objective === true;
    };
    const { c, t } = opened();
    expect(toGame(c, B(PAD.SELECT), t)).toBe(false);
    expect(c.mode).toBe('game');
    // held on, the swallow after the toggle keeps the press away from the game too
    expect(toGame(c, B(PAD.SELECT), t + 0.1)).toBe(false);
    toGame(c, 0, t + 0.2);
    // with the tuner closed the same press is the game's
    const closed = new TunePadCtl();
    expect(toGame(closed, B(PAD.SELECT), 0)).toBe(true);
  });

  it('L3 is an edge in the tuner, never in the game', () => {
    const { c, t } = opened();
    expect(c.update(B(PAD.LS), 0, 0, t, DT).spot).toBe(true);
    expect(c.update(B(PAD.LS), 0, 0, t + 0.1, DT).spot).toBe(false);
    c.update(0, 0, 0, t + 0.2, DT);
    c.update(B(PAD.SELECT), 0, 0, t + 0.3, DT);
    c.update(0, 0, 0, t + 0.4, DT);
    expect(c.update(B(PAD.LS), 0, 0, t + 0.5, DT).spot).toBe(false);
  });
});
