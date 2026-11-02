import { afterEach, describe, expect, it } from 'vitest';
import type { WeaponId } from '../src/weapons/weaponDefs';
import { NetSession } from '../src/net/session';
import type { Transport } from '../src/net/transport';
import { parseMessage, PROTOCOL_VERSION, RT_COUNT, ratingWire, type Msg } from '../src/net/protocol';
import { ratingViewFromWire, ratingViewsFromRh } from '../src/net/validate';
import type { SectorRatingWire } from '../src/game/sectors';
import { RH_HI, RH_MAX, packRated, unpackRated } from '../src/game/course/courseWire';

/** (section-rating S3, protocol 42) The `sector` message's `rt` and the course stats' `synced`. */

function hub() {
  const peers = new Map<string, Transport & { deliver(m: unknown, from: string): void }>();
  const make = (id: string) => {
    const t = {
      selfId: id,
      onMessage: null as Transport['onMessage'],
      onPeerJoin: null as Transport['onPeerJoin'],
      onPeerLeave: null as Transport['onPeerLeave'],
      send(msg: unknown, to?: string) {
        const raw = JSON.parse(JSON.stringify(msg)) as unknown;
        for (const [pid, p] of peers) if (pid !== id && (!to || to === pid)) p.deliver(raw, id);
      },
      deliver(m: unknown, from: string) {
        t.onMessage?.(m, from);
      },
      peers: () => [...peers.keys()].filter((p) => p !== id),
      async leave() {
        peers.delete(id);
        for (const p of peers.values()) p.onPeerLeave?.(id);
      },
    };
    for (const p of peers.values()) p.onPeerJoin?.(id);
    peers.set(id, t);
    return t;
  };
  return { make };
}
const prof = (name: string) => ({ name, loadout: ['rifle', 'pistolSd'] as WeaponId[] });

const sessions: NetSession[] = [];
const sess = (...a: ConstructorParameters<typeof NetSession>): NetSession => {
  const s = new NetSession(...a);
  sessions.push(s);
  return s;
};
afterEach(async () => {
  for (const s of sessions.splice(0)) await s.leave();
});

const RT: SectorRatingWire = { sec: 1, marks: 13, synced: 1, gadget: 2, syringe: 1, medkit: 0, alarmStep: 0 };
const sectorOf = (m: Msg | null) => (m && m.t === 'sector' ? m : null);

describe('rating wire (protocol 42)', () => {
  it('a sector message round-trips its rt beside the other extras', () => {
    const msg = { t: 'sector', ls: 2, lk: [3], dn: ['cam-a'], sy: 1, rt: RT };
    expect(parseMessage(JSON.parse(JSON.stringify(msg)))).toEqual(msg);
    // none yet (-1) still parses
    const none = { ...RT, sec: -1, marks: 0, synced: 0, gadget: 0, syringe: 0 };
    expect(sectorOf(parseMessage({ t: 'sector', rt: none }))?.rt).toEqual(none);
  });

  it('clamps every rt field: marks 0-15, counts whole 0..RT_COUNT, sec -1..63', () => {
    const rt = ratingWire({ sec: 200, marks: 99, synced: -3, gadget: 1e9, syringe: 1.6, medkit: Infinity, alarmStep: 'x' });
    expect(rt).toEqual({ sec: 63, marks: 15, synced: 0, gadget: RT_COUNT, syringe: 2, medkit: 0, alarmStep: 0 });
    expect(ratingWire({ sec: -9, marks: -1 })).toEqual({ sec: -1, marks: 0, synced: 0, gadget: 0, syringe: 0, medkit: 0, alarmStep: 0 });
    expect(ratingWire({ sec: 0.6, marks: 7.4 })?.sec).toBe(1);
  });

  it('junk rt is dropped; the rest of the message stays', () => {
    for (const bad of [null, 5, 'rt', [1, 2], {}, { sec: '1' }, { sec: NaN, marks: 3 }]) {
      const m = sectorOf(parseMessage({ t: 'sector', ls: 1, rt: bad }));
      expect(m).not.toBeNull();
      expect(m?.ls).toBe(1);
      expect(m && 'rt' in m).toBe(false);
    }
    // unknown keys inside rt never pass through
    const m = sectorOf(parseMessage({ t: 'sector', rt: { ...RT, evil: '<script>' } }));
    expect(m?.rt).toEqual(RT);
  });

  it('the course stats carry synced, clamped to a whole 0-1e4 (missing reads 0)', () => {
    const raw = { t: 'course', s: { stats: [{ time: 3, synced: 2 }, { synced: 1e9 }, { synced: -1 }, {}], pstats: [{ synced: 1.4 }, {}] }, lights: {} };
    const m = parseMessage(raw);
    if (!m || m.t !== 'course') throw new Error('course');
    const synced = (o: unknown) => (o as { synced?: number }).synced;
    expect(m.s.stats.map(synced)).toEqual([2, 1e4, 0, 0]);
    expect((m.s.pstats ?? []).map(synced)).toEqual([1, 0]);
  });

  it('(S6) the course message carries the last rated Marlow set as rt, clamped; a bad one is dropped, the rest kept', () => {
    const base = { t: 'course', s: { stats: [] }, lights: {} };
    const ok = parseMessage({ ...base, rt: { ...RT, sec: 3, marks: 99, gadget: 1e6 } });
    if (!ok || ok.t !== 'course') throw new Error('course');
    expect(ok.rt).toEqual({ ...RT, sec: 3, marks: 15, gadget: RT_COUNT });
    const bad = parseMessage({ ...base, rt: { marks: 15 } });
    if (!bad || bad.t !== 'course') throw new Error('course');
    expect(bad.rt).toBeUndefined();
    const none = parseMessage(base);
    expect(none && none.t === 'course' && 'rt' in none).toBe(false);
  });

  it('(S6 fix) the course message carries every set rated so far as rh (index kept, a bad entry -1, clamped, capped); none: dropped', () => {
    const base = { t: 'course', s: { stats: [] }, lights: {} };
    const rh = packRated([-1, 15, 5, -1], [0, 2, 0, 0]);
    expect(rh).toEqual([-1, 15 + 32, 5, -1]);
    expect(rh.map(unpackRated)).toEqual([null, { marks: 15, synced: 2 }, { marks: 5, synced: 0 }, null]);
    const ok = parseMessage({ ...base, rh: [...rh, 'x', RH_HI + 5, -7] });
    if (!ok || ok.t !== 'course') throw new Error('course');
    expect(ok.rh).toEqual([...rh, -1, RH_HI, -1]);
    const long = parseMessage({ ...base, rh: new Array(RH_MAX + 10).fill(3) });
    expect(long && long.t === 'course' ? long.rh?.length : 0).toBe(RH_MAX);
    const none = parseMessage(base);
    expect(none && none.t === 'course' && 'rh' in none).toBe(false);
  });

  it('(marlow-polish) the sector message carries every section rated so far as rh (clamped, capped, index kept); none: dropped', () => {
    const rh = packRated([7, 15, -1, 3], [0, 2, 0, 1]);
    const ok = sectorOf(parseMessage({ t: 'sector', ls: 3, rt: { ...RT, sec: 3 }, rh: [...rh, 'x', RH_HI + 5, -7] }));
    expect(ok?.rh).toEqual([...rh, -1, RH_HI, -1]);
    expect(ok?.ls).toBe(3);
    const long = sectorOf(parseMessage({ t: 'sector', rh: new Array(RH_MAX + 10).fill(3) }));
    expect(long?.rh?.length).toBe(RH_MAX);
    for (const bad of [undefined, null, 5, 'rh', { 0: 3 }]) {
      const m = sectorOf(parseMessage({ t: 'sector', ls: 1, rh: bad }));
      expect(m?.ls).toBe(1);
      expect(m && 'rh' in m).toBe(false);
    }
  });

  it('(marlow-polish) a late joiner rebuilds every rated section from rh: map titles, index order, rt section skipped, no grant', () => {
    const defs = [
      { id: 'dock', name: 'Dock' },
      { id: 'labs', name: 'Labs' },
      { id: 'yard', name: 'Yard' },
      { id: 'roof', name: 'Roof' },
    ];
    const rh = packRated([7, 15, -1, 3, 9], [0, 2, 0, 1, 0]);
    const nil = { gadget: 0, syringe: 0, medkit: 0, alarmStep: 0 };
    expect(ratingViewsFromRh(rh, 3, defs)).toEqual([
      { sectionId: 'dock', title: 'Dock', marks: 7, synced: 0, grant: nil },
      { sectionId: 'labs', title: 'Labs', marks: 15, synced: 2, grant: nil },
    ]);
    // no rt (-1): every rated section; an index the map lacks (4) is not listed
    expect(ratingViewsFromRh(rh, -1, defs).map((v) => v.sectionId)).toEqual(['dock', 'labs', 'roof']);
    expect(ratingViewsFromRh([], -1, defs)).toEqual([]);
  });

  it('the client view: section id and title from the map, null before a rating or for an index the map lacks', () => {
    const defs = [
      { id: 'dock', name: 'Dock' },
      { id: 'labs', name: 'Labs' },
    ];
    expect(ratingViewFromWire(RT, defs)).toEqual({ sectionId: 'labs', title: 'Labs', marks: 13, synced: 1, grant: { gadget: 2, syringe: 1, medkit: 0, alarmStep: 0 } });
    expect(ratingViewFromWire({ ...RT, sec: -1 }, defs)).toBeNull();
    expect(ratingViewFromWire({ ...RT, sec: 5 }, defs)).toBeNull();
  });

  it('host -> client: the rt arrives clamped through a session', () => {
    const h = hub();
    const host = sess(h.make('H'), 'host', 'ABCDE', prof('Host'));
    const cli = sess(h.make('C'), 'client', 'ABCDE', prof('Cli'));
    host.startMatch();
    const got: Msg[] = [];
    cli.events.on('game', (e) => got.push(e.msg));
    host.send({ t: 'sector', rt: { ...RT, marks: 31 } });
    const m = sectorOf(got.find((x) => x.t === 'sector') ?? null);
    expect(m?.rt).toEqual({ ...RT, marks: 15 });
  });

  it('a peer one protocol version behind (PROTOCOL_VERSION - 1) is refused; the current PROTOCOL_VERSION joins', () => {
    const h = hub();
    const host = sess(h.make('H'), 'host', 'ABCDE', prof('Host'));
    const old = h.make('O');
    old.send({ t: 'hello', v: PROTOCOL_VERSION - 1, name: 'Old', tag: {}, look: {} }, 'H');
    expect(host.players.has('O')).toBe(false);
    old.send({ t: 'hello', v: PROTOCOL_VERSION, name: 'New', tag: {}, look: {} }, 'H');
    expect(host.players.has('O')).toBe(true);
  });
});
