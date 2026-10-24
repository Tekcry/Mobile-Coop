import { describe, expect, it } from 'vitest';
import { ITEM_KINDS, parseMessage, type Msg } from '../src/net/protocol';
import { CRATE_DARK, CRATE_HOLD, CRATE_LABEL, CRATE_REACH, CrateLedger, applyCrateEvent, crateItemId, crateReserve } from '../src/game/crateLedger';

const evs = (events: unknown[]): unknown[] => {
  const m = parseMessage(JSON.parse(JSON.stringify({ t: 'ev', events })));
  return m && m.t === 'ev' ? m.events : [];
};

describe('E9-crate wire (protocol 35)', () => {
  it('the crate item kind was appended after medkitWall in ITEM_KINDS (append only; coop-carry appended body after it)', () => {
    expect(ITEM_KINDS[ITEM_KINDS.indexOf('medkitWall') + 1]).toBe('crate');
    expect(ITEM_KINDS.indexOf('crate')).toBeLessThan(ITEM_KINDS.indexOf('body'));
  });

  it('a crate event round-trips through the ev batch', () => {
    const e = { e: 'crate', player: 'C1', id: 's1-crate', fill: true };
    expect(evs([e])).toEqual([e]);
    const re = { e: 'crate', player: 'C1', id: 'service-crate', fill: false };
    expect(evs([re])).toEqual([re]);
  });

  it('a missing or bad id / player drops the event; a non-boolean fill becomes false', () => {
    expect(evs([{ e: 'crate', player: 'C1', fill: true }])).toEqual([]);
    expect(evs([{ e: 'crate', id: 's1-crate', fill: true }])).toEqual([]);
    expect(evs([{ e: 'crate', player: 'C1', id: '../x<script>', fill: true }])).toEqual([]);
    expect(evs([{ e: 'crate', player: 5, id: 's1-crate', fill: true }])).toEqual([]);
    expect(evs([{ e: 'crate', player: 'C1', id: 's1-crate', fill: 'yes' }])).toEqual([{ e: 'crate', player: 'C1', id: 's1-crate', fill: false }]);
    expect(evs([{ e: 'crate', player: 'C1', id: 's1-crate' }])).toEqual([{ e: 'crate', player: 'C1', id: 's1-crate', fill: false }]);
    // a good one beside a bad one survives
    expect(evs([{ e: 'crate', player: 'C1' }, { e: 'crate', player: 'C2', id: 's2-crate', fill: true }])).toEqual([{ e: 'crate', player: 'C2', id: 's2-crate', fill: true }]);
  });

  it('a snap item with k crate survives netItem', () => {
    const item = { id: 's1-crate', k: 'crate', x: 1, y: 0, z: -2, yaw: 1.5, label: CRATE_LABEL, hold: CRATE_HOLD, reach: CRATE_REACH, on: true };
    const m = parseMessage(JSON.parse(JSON.stringify({ t: 'snap', time: 1, players: [], enemies: [], obj: '', info: '', pk: 0, items: [item] }))) as Extract<Msg, { t: 'snap' }> | null;
    expect(m?.items).toEqual([item]);
  });
});

describe('E9-crate pure rules (part a)', () => {
  it('constants and the item id', () => {
    expect(CRATE_LABEL).toBe('Weapons crate');
    expect(CRATE_HOLD).toBe(1.0);
    expect(CRATE_REACH).toBe(1.8);
    expect(CRATE_DARK).toBe('#2a2f36');
    expect(crateItemId('s1')).toBe('s1-crate');
  });

  it('crateReserve tops up to the start total, never lowers, never above (A102)', () => {
    expect(crateReserve(0, 0, 30, 90)).toBe(120);
    expect(crateReserve(12, 40, 30, 90)).toBe(108);
    expect(crateReserve(30, 90, 30, 90)).toBe(90);
    expect(crateReserve(30, 150, 30, 90)).toBe(150);
  });

  it('the ledger: once per player per crate, per-player keys, reset', () => {
    const l = new CrateLedger();
    expect(l.use('s1-crate', 'local')).toBe(true);
    expect(l.use('s1-crate', 'local')).toBe(false);
    expect(l.use('s1-crate', 'p2')).toBe(true);
    expect(l.use('s2-crate', 'p2')).toBe(true);
    expect(l.has('s2-crate', 'local')).toBe(false);
    expect(l.usedBy('p2').sort()).toEqual(['s1-crate', 's2-crate']);
    expect(l.usersOf('s1-crate').sort()).toEqual(['local', 'p2']);
    l.reset();
    expect(l.usedBy('p2')).toEqual([]);
    expect(l.use('s1-crate', 'local')).toBe(true);
  });

  it('applyCrateEvent: mine only, never fills twice, a re-send marks', () => {
    const spent = new Set<string>();
    expect(applyCrateEvent(spent, 'C1', { player: 'C2', id: 's1-crate', fill: true })).toBeNull();
    expect(spent.size).toBe(0);
    expect(applyCrateEvent(spent, 'C1', { player: 'C1', id: 's1-crate', fill: true })).toBe('fill');
    expect(applyCrateEvent(spent, 'C1', { player: 'C1', id: 's1-crate', fill: true })).toBeNull();
    const fresh = new Set<string>();
    expect(applyCrateEvent(fresh, 'C1', { player: 'C1', id: 's1-crate', fill: false })).toBe('mark');
    expect(applyCrateEvent(fresh, 'C1', { player: 'C1', id: 's1-crate', fill: true })).toBeNull();
  });
});
