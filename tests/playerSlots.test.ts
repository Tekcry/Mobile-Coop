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
  it('equals MAX_PLAYERS (net) and MAX_INTRUDERS (ai), and is 2', () => {
    expect(PLAYER_SLOTS).toBe(MAX_PLAYERS);
    expect(PLAYER_SLOTS).toBe(MAX_INTRUDERS);
    expect(PLAYER_SLOTS).toBe(2);
  });

  it('isPlayerSlot takes integers 0..1 only', () => {
    for (let s = 0; s < PLAYER_SLOTS; s++) expect(isPlayerSlot(s)).toBe(true);
    for (const bad of [-1, 2, 3, 1.5, NaN, '1', null, undefined]) expect(isPlayerSlot(bad)).toBe(false);
  });
});

describe('SlotTable', () => {
  it('host is 0; the joiner gets 1, then the room is full', () => {
    const t = new SlotTable();
    expect(t.host('h')).toBe(0);
    expect(t.assign('a')).toBe(1);
    expect(t.assign('b')).toBe(-1);
    expect(t.slotOf('h')).toBe(0);
    expect(t.slotOf('a')).toBe(1);
    expect(t.slotOf('b')).toBe(-1);
    expect(t.count()).toBe(2);
  });

  it('assign is idempotent for a player that already has a slot', () => {
    const t = table('a');
    expect(t.assign('a')).toBe(1);
    expect(t.count()).toBe(2);
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

  it('a leave frees the slot and the next joiner takes it', () => {
    const t = table('a');
    expect(t.release('a')).toBe(1);
    expect(t.slotOf('a')).toBe(-1);
    expect(t.assign('d')).toBe(1);
    expect(t.release('a')).toBe(-1);
  });

  it('hold keeps the slot across a rejoin; release after the hold frees it', () => {
    const t = table('a');
    expect(t.hold('a')).toBe(true);
    expect(t.isHeld('a')).toBe(true);
    expect(t.heldCount()).toBe(1);
    // a held slot is not free for a new joiner
    expect(t.assign('d')).toBe(-1);
    // rejoin: same slot
    expect(t.unhold('a')).toBe(1);
    expect(t.isHeld('a')).toBe(false);
    expect(t.heldCount()).toBe(0);
    // drop again, hold runs out
    t.hold('a');
    expect(t.release('a')).toBe(1);
    expect(t.isHeld('a')).toBe(false);
    expect(t.heldCount()).toBe(0);
    expect(t.assign('d')).toBe(1);
  });

  it('assign for a held player returns its slot (still held until unhold)', () => {
    const t = table('a');
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

  it('compact keeps the host at 0 and a held joiner at 1', () => {
    const u = table('a');
    u.hold('a');
    expect(u.compact(['h', 'a'])).toBe(false);
    expect(u.entries()).toEqual([
      { id: 'h', slot: 0, held: false },
      { id: 'a', slot: 1, held: true },
    ]);
  });

  it('compact follows the given order: the host first, unknown ids ignored', () => {
    const t = table('a');
    t.compact(['a', 'h', 'zz']);
    expect(t.slotOf('h')).toBe(0);
    expect(t.slotOf('a')).toBe(1);
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

  it('host moves an id that had slot 1 to 0', () => {
    const t = new SlotTable();
    t.host('x');
    t.assign('h');
    expect(t.slotOf('h')).toBe(1);
    t.host('h');
    expect(t.slotOf('h')).toBe(0);
    expect(t.slotOf('x')).toBe(-1);
    expect(t.assign('b')).toBe(1);
  });

  it('entries lists occupied slots in slot order', () => {
    const t = table('a');
    expect(t.entries()).toEqual([
      { id: 'h', slot: 0, held: false },
      { id: 'a', slot: 1, held: false },
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
    ],
  ];

  it('matches goggleSlot (host 0, the other 1) for every list of 1-2 players', () => {
    for (const list of lists) for (const id of ['h', 'a', 'zz']) expect(slotFromList(list, id)).toBe(goggleSlot(list, id));
  });

  it('host 0, unknown id 0, the other 1', () => {
    const list = lists[2]!;
    expect(slotFromList(list, 'h')).toBe(0);
    expect(slotFromList(list, 'a')).toBe(1);
    expect(slotFromList(list, 'zz')).toBe(0);
  });

  it('clamps past the last slot', () => {
    const long = [{ id: 'h', host: true }, ...['a', 'b', 'c'].map((id) => ({ id, host: false }))];
    expect(slotFromList(long, 'a')).toBe(1);
    expect(slotFromList(long, 'c')).toBe(PLAYER_SLOTS - 1);
  });
});