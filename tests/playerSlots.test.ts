import { describe, expect, it } from 'vitest';
import { isPlayerSlot, PLAYER_SLOTS, SlotTable, slotFromList } from '../src/game/playerSlots';
import { MAX_PLAYERS } from '../src/net/protocol';
import { MAX_INTRUDERS } from '../src/ai/targetPick';
import { goggleSlot } from '../src/operators/runtime/goggle';

function table(...joiners: string[]): SlotTable {
  const t = new SlotTable();
  t.host('h');
  for (const id of joiners) t.assign(id);
  return t;
}

describe('PLAYER_SLOTS', () => {
  it('equals MAX_PLAYERS (net) and MAX_INTRUDERS (ai)', () => {
    expect(PLAYER_SLOTS).toBe(MAX_PLAYERS);
    expect(PLAYER_SLOTS).toBe(MAX_INTRUDERS);
  });

  it('isPlayerSlot takes integers 0..3 only', () => {
    for (let s = 0; s < PLAYER_SLOTS; s++) expect(isPlayerSlot(s)).toBe(true);
    for (const bad of [-1, 4, 1.5, NaN, '1', null, undefined]) expect(isPlayerSlot(bad)).toBe(false);
  });
});

describe('SlotTable', () => {
  it('host is 0; joiners get 1, 2, 3, then the room is full', () => {
    const t = new SlotTable();
    expect(t.host('h')).toBe(0);
    expect(t.assign('a')).toBe(1);
    expect(t.assign('b')).toBe(2);
    expect(t.assign('c')).toBe(3);
    expect(t.assign('d')).toBe(-1);
    expect(t.slotOf('h')).toBe(0);
    expect(t.slotOf('c')).toBe(3);
    expect(t.slotOf('d')).toBe(-1);
    expect(t.count()).toBe(4);
  });

  it('assign is idempotent for a player that already has a slot', () => {
    const t = table('a', 'b');
    expect(t.assign('a')).toBe(1);
    expect(t.assign('b')).toBe(2);
    expect(t.count()).toBe(3);
  });

  it('a campaign table (cap 2) hands out slot 1 only', () => {
    const t = new SlotTable(2);
    expect(t.cap).toBe(2);
    t.host('h');
    expect(t.assign('a')).toBe(1);
    expect(t.assign('b')).toBe(-1);
  });

  it('cap is clamped to 1..PLAYER_SLOTS', () => {
    expect(new SlotTable(9).cap).toBe(PLAYER_SLOTS);
    expect(new SlotTable(0).cap).toBe(1);
    expect(new SlotTable(NaN).cap).toBe(PLAYER_SLOTS);
  });

  it('a leave frees the slot and the next joiner takes the lowest free one', () => {
    const t = table('a', 'b', 'c');
    expect(t.release('a')).toBe(1);
    expect(t.slotOf('a')).toBe(-1);
    // slots never move: b and c stay
    expect(t.slotOf('b')).toBe(2);
    expect(t.slotOf('c')).toBe(3);
    expect(t.assign('d')).toBe(1);
    expect(t.release('a')).toBe(-1);
    t.release('c');
    expect(t.assign('e')).toBe(3);
  });

  it('hold keeps the slot across a rejoin; release after the hold frees it', () => {
    const t = table('a', 'b', 'c');
    expect(t.hold('b')).toBe(true);
    expect(t.isHeld('b')).toBe(true);
    expect(t.heldCount()).toBe(1);
    // a held slot is not free for a new joiner
    expect(t.assign('d')).toBe(-1);
    // rejoin: same slot
    expect(t.unhold('b')).toBe(2);
    expect(t.isHeld('b')).toBe(false);
    expect(t.heldCount()).toBe(0);
    // drop again, hold runs out
    t.hold('b');
    expect(t.release('b')).toBe(2);
    expect(t.isHeld('b')).toBe(false);
    expect(t.heldCount()).toBe(0);
    expect(t.assign('d')).toBe(2);
  });

  it('assign for a held player returns its slot (still held until unhold)', () => {
    const t = table('a', 'b');
    t.hold('a');
    expect(t.assign('a')).toBe(1);
    expect(t.isHeld('a')).toBe(true);
  });

  it('hold / unhold of an unknown id do nothing', () => {
    const t = table('a');
    expect(t.hold('x')).toBe(false);
    expect(t.unhold('x')).toBe(-1);
    expect(t.heldCount()).toBe(0);
  });

  it('heldCount counts two held slots', () => {
    const t = table('a', 'b', 'c');
    t.hold('a');
    t.hold('c');
    expect(t.heldCount()).toBe(2);
  });

  it('compact keeps the relative order and the host at 0', () => {
    const t = table('a', 'b', 'c');
    t.release('a');
    t.release('b');
    // h 0, c 3
    expect(t.compact(['h', 'c'])).toBe(true);
    expect(t.slotOf('h')).toBe(0);
    expect(t.slotOf('c')).toBe(1);
    expect(t.compact(['h', 'c'])).toBe(false);

    const u = table('a', 'b', 'c');
    u.release('a');
    u.hold('c');
    // h 0, b 2, c 3 (held): order follows the list
    expect(u.compact(['h', 'b', 'c'])).toBe(true);
    expect(u.entries()).toEqual([
      { id: 'h', slot: 0, held: false },
      { id: 'b', slot: 1, held: false },
      { id: 'c', slot: 2, held: true },
    ]);
  });

  it('compact follows the given order; ids missing from it go last in slot order; unknown ids are ignored', () => {
    const t = table('a', 'b', 'c');
    t.compact(['c', 'a', 'h', 'zz']);
    expect(t.slotOf('h')).toBe(0);
    expect(t.slotOf('c')).toBe(1);
    expect(t.slotOf('a')).toBe(2);
    expect(t.slotOf('b')).toBe(3);
    expect(t.slotOf('zz')).toBe(-1);
  });

  it('a campaign match after a leave always has slots 0 and 1', () => {
    const t = new SlotTable(2);
    t.host('h');
    t.assign('a');
    t.release('a');
    t.assign('b');
    t.compact(['h', 'b']);
    expect(t.entries().map((e) => e.slot)).toEqual([0, 1]);
  });

  it('host moves an id that had another slot to 0', () => {
    const t = new SlotTable();
    t.assign('a');
    t.assign('h');
    expect(t.slotOf('h')).toBe(2);
    t.host('h');
    expect(t.slotOf('h')).toBe(0);
    expect(t.assign('b')).toBe(2);
  });

  it('entries lists occupied slots in slot order', () => {
    const t = table('a', 'b');
    t.release('a');
    expect(t.entries()).toEqual([
      { id: 'h', slot: 0, held: false },
      { id: 'b', slot: 2, held: false },
    ]);
  });
});

describe('slotFromList', () => {
  const lists = [
    [{ id: 'h', host: true }],
    [
      { id: 'h', host: true },
      { id: 'a', host: false },
    ],
    [
      { id: 'a', host: false },
      { id: 'h', host: true },
      { id: 'b', host: false },
    ],
    [
      { id: 'h', host: true },
      { id: 'a', host: false },
      { id: 'b', host: false },
      { id: 'c', host: false },
    ],
  ];

  it('matches goggleSlot (host 0, the others 1, 2, ... in list order) for every list of 1-4 players', () => {
    for (const list of lists) for (const id of ['h', 'a', 'b', 'c', 'zz']) expect(slotFromList(list, id)).toBe(goggleSlot(list, id));
  });

  it('host 0, unknown id 0, the others in list order', () => {
    const list = lists[2]!;
    expect(slotFromList(list, 'h')).toBe(0);
    expect(slotFromList(list, 'a')).toBe(1);
    expect(slotFromList(list, 'b')).toBe(2);
    expect(slotFromList(list, 'zz')).toBe(0);
  });

  it('clamps past the last slot', () => {
    const long = [{ id: 'h', host: true }, ...['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, host: false }))];
    expect(slotFromList(long, 'c')).toBe(3);
    expect(slotFromList(long, 'e')).toBe(PLAYER_SLOTS - 1);
  });
});
