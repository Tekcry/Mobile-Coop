import { describe, expect, it } from 'vitest';
import { PAIR_WINDOW } from '../src/config/course';
import { pairHalves, pressPairHalf } from '../src/game/pairPress';
import { PAIR_SWITCH_LABEL, SectorPairGates, checkSectors, pairGateById, pairSwitchId, type SectorPairGate } from '../src/game/sectors';
import { FEED_GATE_OPEN, FEED_KEY_WAIT } from '../src/game/sectorTeamDoors';
import { oneSec, player, rig, through } from './helpers/teamDoorRig';

/** (sector-redesign E3, EW4) The pair gate in Sector Ops: two key switches turned within the window by two players. */

// the S4 CR5 shape: the gate at (0, 0), key switches 8 m apart
const PG: SectorPairGate = { door: [0, 0], a: { at: [-2, -4], y: 1.1, yaw: Math.PI / 2 }, b: { at: [-2, 4], label: 'Turn key (north post)' } };
const DEFS = [oneSec('a', { pairGates: [PG] })];

describe('the shared pair rule (pairPress, the course PairGate)', () => {
  it('the course window is 1.0 s and the Sector default reads it', () => {
    expect(PAIR_WINDOW).toBe(1.0);
    const s = new SectorPairGates(DEFS);
    expect(s.press(0, 0, true, 0, 10)).toBe('wait');
    expect(s.press(0, 0, false, 1, 10 + PAIR_WINDOW)).toBe('open');
  });

  it('either order; the same player twice is refused (solo only with the course dev flag)', () => {
    const h = pairHalves();
    expect(pressPairHalf(h, false, 1, 0, 1)).toBe(false);
    expect(pressPairHalf(h, true, 1, 0.2, 1)).toBe(false);
    expect(pressPairHalf(h, true, 0, 0.4, 1)).toBe(true);
    const solo = pairHalves();
    expect(pressPairHalf(solo, true, 0, 0, 1, true)).toBe(false);
    expect(pressPairHalf(solo, false, 0, 0.5, 1, true)).toBe(true);
  });
});

describe('SectorPairGates', () => {
  it('one player alone never opens it, however fast', () => {
    const s = new SectorPairGates(DEFS);
    expect(s.press(0, 0, true, 0, 1)).toBe('wait');
    expect(s.press(0, 0, false, 0, 1.1)).toBe('wait');
    expect(s.press(0, 0, true, 0, 1.2)).toBe('wait');
    expect(s.isOpen(0, 0)).toBe(false);
  });

  it('two players within the window open it, either order; then it is done', () => {
    const s = new SectorPairGates(DEFS);
    expect(s.press(0, 0, false, 1, 5)).toBe('wait');
    expect(s.press(0, 0, true, 0, 5.6)).toBe('open');
    expect(s.isOpen(0, 0)).toBe(true);
    expect(s.press(0, 0, true, 0, 5.7)).toBe('done');
  });

  it('window timing: just inside opens, just outside does not and forgets the first key', () => {
    const s = new SectorPairGates(DEFS);
    expect(s.press(0, 0, true, 0, 2)).toBe('wait');
    expect(s.press(0, 0, false, 1, 3.05)).toBe('wait');
    expect(s.isOpen(0, 0)).toBe(false);
    // b at 3.05 stays; a again within the window of it opens
    expect(s.press(0, 0, true, 0, 3.9)).toBe('open');
    const t = new SectorPairGates(DEFS);
    expect(t.press(0, 0, true, 0, 0)).toBe('wait');
    expect(t.press(0, 0, false, 1, 0.99)).toBe('open');
  });

  it('a gate window from data overrides the default', () => {
    const s = new SectorPairGates([oneSec('a', { pairGates: [{ ...PG, window: 0.5 }] })]);
    expect(s.press(0, 0, true, 0, 0)).toBe('wait');
    expect(s.press(0, 0, false, 1, 0.7)).toBe('wait');
  });

  it('restart: reset locks it and forgets a pending key', () => {
    const s = new SectorPairGates(DEFS);
    expect(s.press(0, 0, true, 0, 0)).toBe('wait');
    expect(s.press(0, 0, false, 1, 0.5)).toBe('open');
    expect(s.reset(0)).toEqual([0]);
    expect(s.isOpen(0, 0)).toBe(false);
    expect(s.press(0, 0, true, 0, 1)).toBe('wait');
    s.reset(0);
    // the key turned before the restart does not count after it
    expect(s.press(0, 0, false, 1, 1.2)).toBe('wait');
    expect(s.reset(9)).toEqual([]);
  });

  it('a bad index is done (refused)', () => {
    const s = new SectorPairGates(DEFS);
    expect(s.press(0, 3, true, 0, 0)).toBe('done');
    expect(s.press(4, 0, true, 0, 0)).toBe('done');
  });
});

describe('ids and data', () => {
  it('the switch item ids name the gate both ways and sort with the course devices (c-)', () => {
    const id = pairSwitchId(0, 0, false);
    expect(id.startsWith('c-')).toBe(true);
    expect(pairGateById(DEFS, id)).toEqual({ sec: 0, k: 0, isA: false, gate: PG });
    expect(pairGateById(DEFS, pairSwitchId(0, 0, true))?.isA).toBe(true);
    expect(pairGateById(DEFS, pairSwitchId(0, 2, true))).toBeNull();
    expect(pairGateById(DEFS, 'c-sbolt-0-0')).toBeNull();
    expect(pairGateById(undefined, id)).toBeNull();
  });

  it('checkSectors: fine as is; both keys in one place or a bad window refused', () => {
    expect(checkSectors(DEFS)).toEqual([]);
    expect(checkSectors([oneSec('x', { pairGates: [{ ...PG, b: { at: [-2, -4] }, window: 0 }] })])).toEqual(['x: pair gate 0 has both key switches in one place', 'x: pair gate 0 window is not positive']);
  });
});

describe('SectorTeamDoors: a pair gate in the world (host-authoritative, nav closure)', () => {
  it('starts locked with its doorway shut on the nav grid and two live key switches', () => {
    const r = rig(DEFS);
    expect(r.door.anchor.locked).toBe(true);
    expect(through(r.nav)).toBe(false);
    const a = r.items.find((q) => q.id === pairSwitchId(0, 0, true))!;
    const b = r.items.find((q) => q.id === pairSwitchId(0, 0, false))!;
    expect(a.kind).toBe('switch');
    expect([a.enabled, b.enabled]).toEqual([true, true]);
    expect(a.label).toBe(PAIR_SWITCH_LABEL);
    expect(b.label).toBe('Turn key (north post)');
    expect([a.pos.x, a.pos.y, a.pos.z]).toEqual([-2, 1.1, -4]);
    expect(b.pos.y).toBe(0);
  });

  it('one player turns both keys: refused, the door and nav stay shut', () => {
    const r = rig(DEFS);
    r.refs.push(player('local', -2, -4));
    expect(r.team.turnKey(0, 0, true, 'local', 1)).toBe('wait');
    expect(r.feed).toHaveBeenCalledWith(FEED_KEY_WAIT);
    expect(r.team.turnKey(0, 0, false, 'local', 1.3)).toBe('wait');
    expect(r.door.anchor.locked).toBe(true);
    expect(through(r.nav)).toBe(false);
  });

  it("host and client within the window: the door unlocks for both, nav opens, keys go off; a restart shuts it all", () => {
    const r = rig(DEFS);
    r.refs.push(player('local', -2, -4), player('peer', -2, 4));
    expect(r.team.turnKey(0, 0, false, 'peer', 2)).toBe('wait');
    // a client's turn makes no host feed line
    expect(r.feed).not.toHaveBeenCalled();
    expect(r.team.turnKey(0, 0, true, 'local', 2.8)).toBe('open');
    expect(r.feed).toHaveBeenCalledWith(FEED_GATE_OPEN);
    expect(r.door.anchor.locked).toBe(false);
    expect(through(r.nav)).toBe(true);
    expect(r.items.every((q) => !q.enabled)).toBe(true);
    expect(r.changed).toHaveBeenCalled();
    expect(r.team.gateInfo()[0]).toMatchObject({ open: true, locked: false, door: 3 });
    r.team.reset(0);
    expect(r.door.anchor.locked).toBe(true);
    expect(through(r.nav)).toBe(false);
    expect(r.items.every((q) => q.enabled)).toBe(true);
    expect(r.team.gateInfo()[0]!.open).toBe(false);
  });

  it('the turns run on the mode clock (`now`) when the item gives no time; too slow is refused', () => {
    const r = rig(DEFS);
    r.refs.push(player('local', -2, -4), player('peer', -2, 4));
    r.team.now = 10;
    expect(r.team.turnKey(0, 0, true, 'local')).toBe('wait');
    r.team.now = 11.5;
    expect(r.team.turnKey(0, 0, false, 'peer')).toBe('wait');
    r.team.now = 12;
    expect(r.team.turnKey(0, 0, true, 'local')).toBe('open');
  });

  it('a downed player cannot turn a key', () => {
    const r = rig(DEFS);
    r.refs.push(player('local', -2, -4), player('peer', -2, 4, false));
    expect(r.team.turnKey(0, 0, true, 'local', 0)).toBe('wait');
    expect(r.team.turnKey(0, 0, false, 'peer', 0.2)).toBe('done');
    expect(r.door.anchor.locked).toBe(true);
  });
});
