import { describe, expect, it } from 'vitest';
import { COOP4, INTRUDERS, IntruderBoard, slotOf } from '../src/ai/intruders';
import { MAX_INTRUDERS } from '../src/ai/targetPick';
import type { PlayerRef } from '../src/ai/enemy';

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

  it('the defaults (A146, A148, coop4 A170 / A171): split, forget after 2 s, no walk to the real feet, reuse from 3 players', () => {
    expect(INTRUDERS).toEqual({ split: true, forget: 2, noFeet: true, reuse: true });
    expect(COOP4.from).toBe(3);
    expect(new IntruderBoard().split).toBe(true);
  });
});

// (coop4 AI1, A171) Slot reuse: a player who left keeps his slot for his rejoin until a new id needs one.
describe('IntruderBoard: leave, rejoin, reuse (coop4 AI1)', () => {
  const four = () => {
    const b = new IntruderBoard(true);
    for (const id of ['a', 'b', 'c', 'd']) b.slotFor(id);
    return b;
  };

  it('4 ids fill 4 slots; find never assigns', () => {
    const b = new IntruderBoard(true);
    expect(b.find('a')).toBe(-1);
    expect(b.find('a')).toBe(-1);
    expect(b.slotFor('a')).toBe(0);
    expect(b.find('a')).toBe(0);
    // find did not take a slot: the next new id still gets slot 1
    expect(b.find('zz')).toBe(-1);
    expect(b.slotFor('b')).toBe(1);
    expect(b.slotFor('c')).toBe(2);
    expect(b.slotFor('d')).toBe(3);
    expect([b.find('d'), b.find('zz'), b.idOf(3)]).toEqual([3, -1, 'd']);
    expect(Array.from(b.gone)).toEqual([0, 0, 0, 0]);
    expect(new IntruderBoard(false).find('anyone')).toBe(0);
  });

  it('leave + rejoin with the same id: the same slot, his last known position kept, gone cleared', () => {
    const b = four();
    b.report(2, 5, 0, 6, true);
    b.step(3);
    b.leave('c');
    expect(Array.from(b.gone)).toEqual([0, 0, 1, 0]);
    expect(b.slotFor('c')).toBe(2);
    expect(Array.from(b.gone)).toEqual([0, 0, 0, 0]);
    expect([b.valid[2], b.x[2], b.z[2], b.reused]).toEqual([1, 5, 6, -1]);
    expect(b.seenT[2]).toBeCloseTo(3, 5);
    // an unknown id leaving changes nothing
    b.leave('nobody');
    b.leave('');
    expect(Array.from(b.gone)).toEqual([0, 0, 0, 0]);
  });

  it('a leave with a free slot left: a new id takes the free slot, the gone one stays his', () => {
    const b = new IntruderBoard(true);
    b.slotFor('a');
    b.slotFor('b');
    b.leave('b');
    expect(b.slotFor('e')).toBe(2);
    expect(b.reused).toBe(-1);
    expect(b.slotFor('b')).toBe(1);
  });

  it('leave + a new id: the gone slot (its position and clocks dropped, `reused` names it), never a live one', () => {
    const b = four();
    for (let s = 0; s < 4; s++) b.report(s, s * 10, 0, 1, true);
    b.leave('b');
    const s = b.slotFor('e', null, true);
    expect(s).toBe(1);
    expect(b.reused).toBe(1);
    expect([b.idOf(1), b.gone[1], b.valid[1], b.x[1], b.seenT[1], b.locT[1]]).toEqual(['e', 0, 0, 0, 99, 99]);
    // the live players keep theirs
    expect([b.find('a'), b.find('c'), b.find('d'), b.find('b')]).toEqual([0, 2, 3, -1]);
    expect([b.valid[0], b.valid[2], b.valid[3]]).toEqual([1, 1, 1]);
    // the freshest was slot 3 (the latest report) and stays
    expect(b.freshest).toBe(3);
    // the old id comes back: no slot is free or gone now
    b.reused = -1;
    expect(b.slotFor('b')).toBe(-1);
    expect(b.reused).toBe(-1);
  });

  it('the pick: a gone slot not valid and not hunted first, else the gone slot unseen longest', () => {
    const b = four();
    b.report(0, 1, 0, 1, true);
    b.report(1, 2, 0, 2, true);
    b.step(5);
    b.report(1, 2, 0, 2, true);
    b.leave('a');
    b.leave('b');
    b.leave('c');
    // c (slot 2) is idle: never reported and not hunted
    expect(b.slotFor('e', () => false, true)).toBe(2);
    // slot 3 left too but is hunted (never seen): not idle; 0 and 1 are valid: none idle, so the one unseen longest:
    // 3 (99 + 5 s), then 0 (5 s), then 1 (0 s)
    b.leave('d');
    const hunted = (s: number) => s === 3;
    expect(b.slotFor('f', hunted, true)).toBe(3);
    expect(b.reused).toBe(3);
    expect(b.slotFor('g', hunted, true)).toBe(0);
    expect(b.slotFor('h', hunted, true)).toBe(1);
    expect(b.slotFor('i', hunted, true)).toBe(-1);
  });

  it('all 4 present (none gone): -1, nobody reused; reuse off (the default): -1 even with a gone slot', () => {
    const b = four();
    expect(b.slotFor('e', () => false, true)).toBe(-1);
    expect(b.reused).toBe(-1);
    b.leave('d');
    expect(b.slotFor('e', null, false)).toBe(-1);
    // reuse is the manager's call (gated, A170): the default is off, so a plain read-side `slotFor` never takes over
    expect(b.slotFor('e')).toBe(-1);
    expect([b.reused, b.idOf(3), b.gone[3]]).toEqual([-1, 'd', 1]);
  });

  it('the slot seam: `slotOf` is the list index until a ref carries its team slot (N1)', () => {
    const r = { id: 'x' } as unknown as PlayerRef;
    expect(slotOf(r, 2)).toBe(2);
    expect(slotOf({ ...r, slot: 3 } as unknown as PlayerRef, 1)).toBe(3);
    expect(slotOf({ ...r, slot: 0 } as unknown as PlayerRef, 1)).toBe(0);
  });
});
