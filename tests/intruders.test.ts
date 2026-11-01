import { describe, expect, it } from 'vitest';
import { ALARM_HUNT, alarmHunts, COOP4, INTRUDERS, IntruderBoard, slotOf } from '../src/ai/intruders';
import { MAX_INTRUDERS } from '../src/ai/targetPick';
import type { PlayerRef } from '../src/ai/enemy';

// (guard-ai S24, G139) One last known position per intruder: the pure board (slots by player id, report / forget /
// seenT / freshest, `split` false = today's one shared position). Two players at most (clean-up F).

describe('IntruderBoard', () => {
  it('slotFor: one slot per player id, stable, kept after clear; two fill, a third gets -1', () => {
    const b = new IntruderBoard(true);
    expect(b.slotFor('host')).toBe(0);
    expect(b.slotFor('guest')).toBe(1);
    expect(b.slotFor('host')).toBe(0);
    expect(b.idOf(1)).toBe('guest');
    b.clear();
    // the same players keep their slots
    expect(b.slotFor('guest')).toBe(1);
    expect(b.slotFor('host')).toBe(0);
    expect(b.slotFor('c')).toBe(-1);
    expect(b.idOf(-1)).toBe('');
    expect(MAX_INTRUDERS).toBe(2);
  });

  it('a third player is reported nowhere', () => {
    const b = new IntruderBoard(true);
    for (const id of ['a', 'b']) b.slotFor(id);
    const s = b.slotFor('c');
    b.report(s, 1, 2, 3, true);
    expect(Array.from(b.valid)).toEqual([0, 0]);
    expect(b.freshest).toBe(-1);
  });

  it('report / seenT / freshest / forget', () => {
    const b = new IntruderBoard(true);
    expect(Array.from(b.seenT)).toEqual([99, 99]);
    b.report(0, 1, 0, 2, true);
    expect([b.valid[0], b.x[0], b.z[0], b.seenT[0], b.freshest]).toEqual([1, 1, 2, 0, 0]);
    b.step(1.5);
    // located (a shot), not seen: the clock runs on
    b.report(1, 30, 0, 0, false);
    expect(b.freshest).toBe(1);
    expect(b.seenT[1]).toBeCloseTo(100.5, 3);
    expect(b.seenT[0]).toBeCloseTo(1.5, 5);
    // the freshest forgotten: the latest reported slot still valid takes over
    b.forget(1);
    expect([b.valid[1], b.freshest]).toEqual([0, 0]);
    b.forget(0);
    expect(b.freshest).toBe(-1);
    // a slot not the freshest forgotten: the freshest stays
    b.report(0, 0, 0, 0, true);
    b.report(1, 5, 0, 5, true);
    b.forget(0);
    expect(b.freshest).toBe(1);
    b.clear();
    expect([Array.from(b.valid), b.freshest, b.seenT[1]]).toEqual([[0, 0], -1, 99]);
  });

  it('(guard-ai S26, A157) locT: reset by every report (a heard one too), seenT only by a sighting; clear drops both', () => {
    const b = new IntruderBoard(true);
    expect(Array.from(b.locT)).toEqual([99, 99]);
    b.report(0, 1, 0, 2, true);
    expect([b.seenT[0], b.locT[0]]).toEqual([0, 0]);
    b.step(3);
    expect(b.locT[0]).toBeCloseTo(3, 5);
    // heard (located), not seen: locT restarts, seenT runs on
    b.report(0, 4, 0, 2, false);
    expect(b.locT[0]).toBe(0);
    expect(b.seenT[0]).toBeCloseTo(3, 5);
    b.step(0.5);
    expect([b.locT[0], b.seenT[0]]).toEqual([0.5, 3.5]);
    // a slot only ever heard: located now, never seen (its sight clock runs on from 99)
    b.report(1, 9, 0, 9, false);
    expect(b.locT[1]).toBe(0);
    expect(b.seenT[1]).toBeGreaterThan(99);
    b.clear();
    expect([Array.from(b.locT), Array.from(b.seenT)]).toEqual([
      [99, 99],
      [99, 99],
    ]);
  });

  it('split false: every player is slot 0 and every report writes slot 0 (today)', () => {
    const b = new IntruderBoard(false);
    expect(b.slotFor('host')).toBe(0);
    expect(b.slotFor('guest')).toBe(0);
    b.report(1, 7, 0, 8, true);
    expect(Array.from(b.valid)).toEqual([1, 0]);
    expect([b.x[0], b.z[0], b.freshest]).toEqual([7, 8, 0]);
  });

  it('the defaults (A146, A148, coop4 A170 / A171): split, forget after 2 s, no walk to the real feet, reuse from 3 players', () => {
    expect(INTRUDERS).toEqual({ split: true, forget: 2, noFeet: true, reuse: true });
    expect(COOP4.from).toBe(3);
    expect(new IntruderBoard().split).toBe(true);
  });
});

// (coop4 AI1, A171) Slot reuse: a player who left keeps his slot for his rejoin until a new id needs one.
describe('IntruderBoard: leave, rejoin, reuse (coop4 AI1)', () => {
  const two = () => {
    const b = new IntruderBoard(true);
    for (const id of ['a', 'b']) b.slotFor(id);
    return b;
  };

  it('2 ids fill 2 slots; find never assigns', () => {
    const b = new IntruderBoard(true);
    expect(b.find('a')).toBe(-1);
    expect(b.find('a')).toBe(-1);
    expect(b.slotFor('a')).toBe(0);
    expect(b.find('a')).toBe(0);
    // find did not take a slot: the next new id still gets slot 1
    expect(b.find('zz')).toBe(-1);
    expect(b.slotFor('b')).toBe(1);
    expect([b.find('b'), b.find('zz'), b.idOf(1)]).toEqual([1, -1, 'b']);
    expect(Array.from(b.gone)).toEqual([0, 0]);
    expect(new IntruderBoard(false).find('anyone')).toBe(0);
  });

  it('leave + rejoin with the same id: the same slot, his last known position kept, gone cleared', () => {
    const b = two();
    b.report(1, 5, 0, 6, true);
    b.step(3);
    b.leave('b');
    expect(Array.from(b.gone)).toEqual([0, 1]);
    expect(b.slotFor('b')).toBe(1);
    expect(Array.from(b.gone)).toEqual([0, 0]);
    expect([b.valid[1], b.x[1], b.z[1], b.reused]).toEqual([1, 5, 6, -1]);
    expect(b.seenT[1]).toBeCloseTo(3, 5);
    // an unknown id leaving changes nothing
    b.leave('nobody');
    b.leave('');
    expect(Array.from(b.gone)).toEqual([0, 0]);
  });

  it('leave + a new id: the gone slot (its position and clocks dropped, `reused` names it), never a live one', () => {
    const b = two();
    for (let s = 0; s < 2; s++) b.report(s, s * 10, 0, 1, true);
    b.leave('b');
    const s = b.slotFor('e', null, true);
    expect(s).toBe(1);
    expect(b.reused).toBe(1);
    expect([b.idOf(1), b.gone[1], b.valid[1], b.x[1], b.seenT[1], b.locT[1]]).toEqual(['e', 0, 0, 0, 99, 99]);
    // the live player keeps his
    expect([b.find('a'), b.find('b')]).toEqual([0, -1]);
    expect(b.valid[0]).toBe(1);
    // the freshest was slot 1 (the latest report), now dropped: slot 0 takes over
    expect(b.freshest).toBe(0);
    // the old id comes back: no slot is free or gone now
    b.reused = -1;
    expect(b.slotFor('b')).toBe(-1);
    expect(b.reused).toBe(-1);
  });

  it('the pick: a gone slot not valid and not hunted first, else the gone slot unseen longest', () => {
    const b = two();
    b.report(0, 1, 0, 1, true);
    b.step(5);
    b.leave('a');
    b.leave('b');
    // b (slot 1) is idle: never reported and not hunted
    expect(b.slotFor('e', () => false, true)).toBe(1);
    // slot 0 left too but is valid: none idle, so the one unseen longest
    expect(b.slotFor('f', () => true, true)).toBe(0);
    expect(b.slotFor('g', () => true, true)).toBe(-1);
  });

  it('all present (none gone): -1, nobody reused; reuse off (the default): -1 even with a gone slot', () => {
    const b = two();
    expect(b.slotFor('e', () => false, true)).toBe(-1);
    expect(b.reused).toBe(-1);
    b.leave('b');
    expect(b.slotFor('e', null, false)).toBe(-1);
    // reuse is the manager's call (gated, A170): the default is off, so a plain read-side `slotFor` never takes over
    expect(b.slotFor('e')).toBe(-1);
    expect([b.reused, b.idOf(1), b.gone[1]]).toEqual([-1, 'b', 1]);
  });

  it('the slot seam: `slotOf` is the list index until a ref carries its team slot (N1)', () => {
    const r = { id: 'x' } as unknown as PlayerRef;
    expect(slotOf(r, 1)).toBe(1);
    expect(slotOf({ ...r, slot: 1 } as unknown as PlayerRef, 0)).toBe(1);
    expect(slotOf({ ...r, slot: 0 } as unknown as PlayerRef, 1)).toBe(0);
  });
});

describe('alarmHunts (coop4 AI4, A174)', () => {
  const v = (...a: number[]) => Uint8Array.from(a);
  const t = (...a: number[]) => Float32Array.from(a);
  const order = (alarm: number, valid: Uint8Array, seenT: Float32Array, gone: Uint8Array | null = null) => {
    const out = new Int8Array(2).fill(-9);
    const n = alarmHunts(alarm, valid, seenT, out, gone);
    return Array.from(out.subarray(0, n));
  };

  it("the alarm's slot first, then the other", () => {
    expect(ALARM_HUNT.split).toBe(true);
    expect(order(1, v(1, 1), t(2, 5))).toEqual([1, 0]);
    expect(order(0, v(1, 1), t(4, 1))).toEqual([0, 1]);
  });

  it('no alarm slot: freshest sighting first; ties the lower slot; never-seen (located only) last', () => {
    expect(order(-1, v(1, 1), t(5, 2))).toEqual([1, 0]);
    expect(order(-1, v(1, 1), t(2, 2))).toEqual([0, 1]);
    expect(order(-1, v(1, 1), t(99, 2))).toEqual([1, 0]);
  });

  it("the alarm's slot forgotten or none: the other; nobody known: none", () => {
    expect(order(1, v(1, 0), t(3, 0))).toEqual([0]);
    expect(order(-1, v(0, 1), t(99, 4))).toEqual([1]);
    expect(order(0, v(0, 0), t(1, 1))).toEqual([]);
  });

  it('a slot whose player left is skipped, the alarm one too', () => {
    expect(order(0, v(1, 1), t(0, 1), v(1, 0))).toEqual([1]);
  });
});