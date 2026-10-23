import { describe, expect, it } from 'vitest';
import { INTRUDERS, IntruderBoard } from '../src/ai/intruders';
import { MAX_INTRUDERS } from '../src/ai/targetPick';

// (guard-ai S24, G139) One last known position per intruder: the pure board (slots by player id, report / forget /
// seenT / freshest, `split` false = today's one shared position).

describe('IntruderBoard', () => {
  it('slotFor: one slot per player id, stable, kept after clear; four fill, a fifth gets -1', () => {
    const b = new IntruderBoard(true);
    expect(b.slotFor('host')).toBe(0);
    expect(b.slotFor('guest')).toBe(1);
    expect(b.slotFor('host')).toBe(0);
    expect(b.idOf(1)).toBe('guest');
    b.clear();
    // the same players keep their slots
    expect(b.slotFor('guest')).toBe(1);
    expect(b.slotFor('host')).toBe(0);
    expect(b.slotFor('c')).toBe(2);
    expect(b.slotFor('d')).toBe(3);
    expect(b.slotFor('e')).toBe(-1);
    expect(b.idOf(-1)).toBe('');
    expect(MAX_INTRUDERS).toBe(4);
  });

  it('a fifth player is reported nowhere', () => {
    const b = new IntruderBoard(true);
    for (const id of ['a', 'b', 'c', 'd']) b.slotFor(id);
    const s = b.slotFor('e');
    b.report(s, 1, 2, 3, true);
    expect(Array.from(b.valid)).toEqual([0, 0, 0, 0]);
    expect(b.freshest).toBe(-1);
  });

  it('report / seenT / freshest / forget', () => {
    const b = new IntruderBoard(true);
    expect(Array.from(b.seenT)).toEqual([99, 99, 99, 99]);
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
    b.report(2, 0, 0, 0, true);
    b.report(3, 5, 0, 5, true);
    b.forget(2);
    expect(b.freshest).toBe(3);
    b.clear();
    expect([Array.from(b.valid), b.freshest, b.seenT[3]]).toEqual([[0, 0, 0, 0], -1, 99]);
  });

  it('(guard-ai S26, A157) locT: reset by every report (a heard one too), seenT only by a sighting; clear drops both', () => {
    const b = new IntruderBoard(true);
    expect(Array.from(b.locT)).toEqual([99, 99, 99, 99]);
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
      [99, 99, 99, 99],
      [99, 99, 99, 99],
    ]);
  });

  it('split false: every player is slot 0 and every report writes slot 0 (today)', () => {
    const b = new IntruderBoard(false);
    expect(b.slotFor('host')).toBe(0);
    expect(b.slotFor('guest')).toBe(0);
    b.report(2, 7, 0, 8, true);
    expect(Array.from(b.valid)).toEqual([1, 0, 0, 0]);
    expect([b.x[0], b.z[0], b.freshest]).toEqual([7, 8, 0]);
  });

  it('the defaults (A146, A148): split, forget after 2 s, no walk to the real feet', () => {
    expect(INTRUDERS).toEqual({ split: true, forget: 2, noFeet: true });
    expect(new IntruderBoard().split).toBe(true);
  });
});
