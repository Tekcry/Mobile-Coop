import { describe, expect, it } from 'vitest';
import { BOLT_PAIR_DEPTH, BOLT_PAIR_RISE, SectorBolts, boltHalfSpan, boltItemId, checkSectors, partnerAtDoor, type SectorBolt } from '../src/game/sectors';
import { FEED_PAIR_BOLT, FEED_UNBOLTED } from '../src/game/sectorTeamDoors';
import { oneSec, player, rig, through } from './helpers/teamDoorRig';

/** (sector-redesign E3, EW3) The pair bolt (R2-PATHS design 2): it draws only while the partner pushes on the near side. */

// a pair bolt at (0, 0) in a wall along x = 0, worked from +x (the bolt side); the partner pushes from -x
const PB: SectorBolt = { at: [0, 0], side: [1, 0], w: 1, pair: true };
const PLAIN: SectorBolt = { at: [0, 6], side: [1, 0], w: 1 };
const f = (x: number, z: number, y = 0) => ({ x, y, z });

describe('partnerAtDoor (the near side, within 1.5 m, on the span and the floor)', () => {
  it('the near side within the depth counts; the bolt side, too far, off the span or another floor do not', () => {
    expect(BOLT_PAIR_DEPTH).toBe(1.5);
    expect(partnerAtDoor(PB, -0.5, 0, 0, 0)).toBe(true);
    expect(partnerAtDoor(PB, -1.45, 0, 0.2, 0)).toBe(true);
    expect(partnerAtDoor(PB, -1.6, 0, 0, 0)).toBe(false);
    expect(partnerAtDoor(PB, 0.5, 0, 0, 0)).toBe(false);
    const half = boltHalfSpan(PB);
    expect(partnerAtDoor(PB, -0.5, 0, half - 0.05, 0)).toBe(true);
    expect(partnerAtDoor(PB, -0.5, 0, half + 0.05, 0)).toBe(false);
    // a catwalk over the door does not count; the same raised floor does
    expect(partnerAtDoor(PB, -0.5, BOLT_PAIR_RISE + 0.5, 0, 0)).toBe(false);
    expect(partnerAtDoor(PB, -0.5, 3.0, 0, 3.2)).toBe(true);
  });
});

describe('SectorBolts with a pair bolt', () => {
  const DEFS = [oneSec('a', { bolts: [PB, PLAIN] })];

  it('one player alone is refused from either side, by `use` and by `press`', () => {
    const s = new SectorBolts(DEFS);
    expect(s.use(0, 0, 0.6, 0)).toBe(false);
    expect(s.press(0, 0, f(0.6, 0), [])).toBe('partner');
    // the user's own feet listed as a mate do not count
    const me = f(0.6, 0);
    expect(s.press(0, 0, me, [me])).toBe('partner');
    // the near side cannot work the bolt at all
    expect(s.press(0, 0, f(-0.6, 0), [])).toBe('reach');
    expect(s.isShut(0, 0)).toBe(true);
  });

  it('two players: the partner on the bolt side, off the floor or too far is refused; pushing on the near side draws it, once', () => {
    const s = new SectorBolts(DEFS);
    expect(s.press(0, 0, f(0.6, 0), [f(1.0, 0.3)])).toBe('partner');
    expect(s.press(0, 0, f(0.6, 0), [f(-0.5, 0, 3)])).toBe('partner');
    expect(s.press(0, 0, f(0.6, 0), [f(-2.0, 0)])).toBe('partner');
    expect(s.isShut(0, 0)).toBe(true);
    expect(s.press(0, 0, f(0.6, 0), [f(-0.5, 0.2)])).toBe('ok');
    expect(s.isShut(0, 0)).toBe(false);
    expect(s.press(0, 0, f(0.6, 0), [f(-0.5, 0.2)])).toBe('shut');
  });

  it('a plain bolt still draws for one player (`press` and `use` agree)', () => {
    expect(new SectorBolts(DEFS).press(0, 1, f(0.6, 6), [])).toBe('ok');
    expect(new SectorBolts(DEFS).use(0, 1, 0.6, 6)).toBe(true);
  });

  it('a restart (rebolt) shuts a drawn pair bolt again', () => {
    const s = new SectorBolts(DEFS);
    expect(s.press(0, 0, f(0.6, 0), [f(-0.5, 0)])).toBe('ok');
    expect(s.rebolt(0)).toEqual([0]);
    expect(s.press(0, 0, f(0.6, 0), [])).toBe('partner');
  });

  it('the data check passes a pair bolt', () => {
    expect(checkSectors(DEFS)).toEqual([]);
  });
});

describe('SectorTeamDoors: a pair bolt in the world (host-authoritative, nav closure)', () => {
  const DEFS = [oneSec('a', { bolts: [PB] })];

  it('starts locked, its doorway shut on the nav grid, its Unbolt item live on the bolt side', () => {
    const r = rig(DEFS);
    expect(r.door.anchor.locked).toBe(true);
    expect(through(r.nav)).toBe(false);
    const it = r.items.find((q) => q.id === boltItemId(0, 0))!;
    expect(it.enabled).toBe(true);
    expect(it.side).toEqual(PB.side);
  });

  it('solo (one player) is refused with the feed line; the door, item and nav stay shut', () => {
    const r = rig(DEFS);
    r.refs.push(player('local', 0.6, 0));
    expect(r.team.unbolt(0, 0, 'local')).toBe(false);
    expect(r.feed).toHaveBeenCalledWith(FEED_PAIR_BOLT);
    expect(r.door.anchor.locked).toBe(true);
    expect(through(r.nav)).toBe(false);
    expect(r.items[0]!.enabled).toBe(true);
  });

  it('a downed partner on the near side does not count', () => {
    const r = rig(DEFS);
    r.refs.push(player('local', 0.6, 0), player('peer', -0.5, 0, false));
    expect(r.team.unbolt(0, 0, 'local')).toBe(false);
    expect(r.door.anchor.locked).toBe(true);
  });

  it("two players: the client's use with the host pushing on the near side draws it; door, nav and item open", () => {
    const r = rig(DEFS);
    // the host (refs[0]) on the bolt side with the client: refused
    r.refs.push(player('local', 1.0, 0.2), player('peer', 0.6, 0));
    expect(r.team.unbolt(0, 0, 'peer')).toBe(false);
    // a client's refusal makes no host feed line (the client has none: no wire change)
    expect(r.feed).not.toHaveBeenCalled();
    // the host moves to the near side and pushes
    r.refs[0]!.feet.set(-0.5, 0, 0.1);
    expect(r.team.unbolt(0, 0, 'peer')).toBe(true);
    expect(r.door.anchor.locked).toBe(false);
    expect(through(r.nav)).toBe(true);
    expect(r.items[0]!.enabled).toBe(false);
    expect(r.changed).toHaveBeenCalled();
    expect(r.team.boltInfo()[0]).toMatchObject({ pair: true, shut: false, locked: false, door: 3 });
  });

  it('the host draws it with the client pushing; a restart bolts it again (door, nav, item) and it needs both again', () => {
    const r = rig(DEFS);
    r.refs.push(player('local', 0.6, 0), player('peer', -0.7, -0.2));
    expect(r.team.unbolt(0, 0)).toBe(true);
    expect(r.feed).toHaveBeenCalledWith(FEED_UNBOLTED);
    r.team.reset(0);
    expect(r.team.bolts.isShut(0, 0)).toBe(true);
    expect(r.door.anchor.locked).toBe(true);
    expect(through(r.nav)).toBe(false);
    expect(r.items[0]!.enabled).toBe(true);
    r.refs.length = 1;
    expect(r.team.unbolt(0, 0)).toBe(false);
    r.refs.push(player('peer', -0.7, -0.2));
    expect(r.team.unbolt(0, 0)).toBe(true);
    expect(through(r.nav)).toBe(true);
  });

  it('an unknown user id is refused', () => {
    const r = rig(DEFS);
    r.refs.push(player('local', -0.5, 0), player('peer', 0.6, 0));
    expect(r.team.unbolt(0, 0, 'ghost')).toBe(false);
    expect(r.door.anchor.locked).toBe(true);
  });
});
