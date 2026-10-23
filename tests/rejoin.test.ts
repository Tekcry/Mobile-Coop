import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WeaponId } from '../src/weapons/weaponDefs';
import { NetSession } from '../src/net/session';
import type { Transport } from '../src/net/transport';
import { defaultLook } from '../src/cosmetics/avatarLook';
import { parseMessage, PROTOCOL_VERSION } from '../src/net/protocol';
import { clearRejoin, loadRejoin, REJOIN_HOLD_S, rejoinLive, rejoinToken, saveRejoin, type RejoinRecord } from '../src/core/rejoin';

/** (marlow-bays R) Rejoin a match: the held slot, the token, the host dropping, the menu record. */

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
const prof = (name: string) => ({ name, tag: { title: 'Rookie', color: '#ff8a1e', emblem: 'chevron' }, look: defaultLook(), loadout: ['rifle', 'pistolSd'] as WeaponId[] });

const sessions: NetSession[] = [];
const sess = (...a: ConstructorParameters<typeof NetSession>): NetSession => {
  const s = new NetSession(...a);
  sessions.push(s);
  return s;
};
afterEach(async () => {
  for (const s of sessions.splice(0)) await s.leave();
  clearRejoin();
});

describe('rejoin wire (protocol 27)', () => {
  it('carries the hello token, the you id, the away flag and the restore event; drops bad ones', () => {
    const h = parseMessage({ t: 'hello', v: PROTOCOL_VERSION, name: 'A', tag: {}, look: {}, tok: 'rabc123' });
    expect(h?.t === 'hello' && h.tok).toBe('rabc123');
    const bad = parseMessage({ t: 'hello', v: PROTOCOL_VERSION, name: 'A', tag: {}, look: {}, tok: '../x<script>' });
    expect(bad?.t === 'hello' && bad.tok).toBe('');
    expect(parseMessage({ t: 'you', id: 'C1' })).toEqual({ t: 'you', id: 'C1' });
    expect(parseMessage({ t: 'you', id: 5 })).toBeNull();
    const l = parseMessage({ t: 'lobby', players: [{ id: 'C1', name: 'C', away: true }], mode: 'course', map: 'ctcourse', difficulty: 'normal', phase: 'playing' });
    expect(l?.t === 'lobby' && l.players[0]!.away).toBe(true);
    const ev = parseMessage({ t: 'ev', events: [{ e: 'restore', player: 'C1', x: 5, y: 0, z: 2, yaw: 1 }] });
    expect(ev && ev.t === 'ev' && ev.events[0]).toEqual({ e: 'restore', player: 'C1', x: 5, y: 0, z: 2, yaw: 1 });
  });
});

describe('rejoin session (R2-R3)', () => {
  const room = () => {
    const h = hub();
    const host = sess(h.make('H'), 'host', 'ABCDE', prof('Host'));
    const c1 = sess(h.make('C1'), 'client', 'ABCDE', prof('Cli'), 'tokA');
    host.startMatch();
    return { h, host, c1 };
  };

  it('a joiner dropping mid-match keeps its slot, held; its token takes it back under the same player id', async () => {
    const { h, host, c1 } = room();
    const away: string[] = [];
    const back: string[] = [];
    const left: string[] = [];
    host.events.on('away', (p) => away.push(p.id));
    host.events.on('rejoin', (p) => back.push(p.id));
    host.events.on('peerLeft', (p) => left.push(p.id));
    await c1.transport.leave();
    expect(away).toEqual(['C1']);
    expect(left).toEqual([]);
    expect(host.players.get('C1')?.away).toBe(true);
    // a held slot sends nothing to the game
    const got: unknown[] = [];
    host.events.on('game', (e) => got.push([e.from, e.msg.t]));
    // the same tab rejoins on a new connection with its token
    const c2 = sess(h.make('C2'), 'client', 'ABCDE', prof('Cli'), 'tokA');
    let started = false;
    c2.events.on('start', () => (started = true));
    c2.transport.send({ t: 'hello', v: PROTOCOL_VERSION, name: 'Cli', tag: {}, look: {}, tok: 'tokA' }, 'H');
    expect(back).toEqual(['C1']);
    expect(host.players.has('C2')).toBe(false);
    expect(host.players.get('C1')?.away).toBe(false);
    expect(c2.selfId).toBe('C1');
    expect(c2.players.has('C2')).toBe(false);
    expect(c2.players.get('C1')?.host).toBe(false);
    expect(started).toBe(true);
    // its game messages reach the host as the held player, and the host's reach it
    c2.toHost({ t: 'ready', ready: true });
    c2.toHost({ t: 'ping', x: 1, y: 0, z: 1, target: '' });
    expect(got).toContainEqual(['C1', 'ping']);
    let pinged = false;
    c2.events.on('game', (e) => (pinged = e.msg.t === 'end'));
    host.send({ t: 'end', stats: { won: true, subtitle: '', score: 0, players: {} } }, 'C1');
    expect(pinged).toBe(true);
  });

  it('a full room gives its only held slot to a joiner without the token (a tab closed with it)', async () => {
    const { h, host, c1 } = room();
    await c1.transport.leave();
    const c3 = sess(h.make('C3'), 'client', 'ABCDE', prof('Cli'), 'tokB');
    c3.transport.send({ t: 'hello', v: PROTOCOL_VERSION, name: 'Cli', tag: {}, look: {}, tok: 'tokB' }, 'H');
    expect(host.players.size).toBe(2);
    expect(c3.selfId).toBe('C1');
  });

  it('a stranger cannot take a slot that is not held; the held slot leaves for good after the hold', async () => {
    const { h, host, c1 } = room();
    const s = sess(h.make('S'), 'client', 'ABCDE', prof('S'), 'tokS');
    let full = false;
    s.events.on('full', () => (full = true));
    s.transport.send({ t: 'hello', v: PROTOCOL_VERSION, name: 'S', tag: {}, look: {}, tok: 'tokS' }, 'H');
    expect(full).toBe(true);
    expect(s.selfId).toBe('S');
    await c1.transport.leave();
    const left: string[] = [];
    host.events.on('peerLeft', (p) => left.push(p.id));
    host.expireAway(Date.now() + (REJOIN_HOLD_S - 5) * 1000);
    expect(host.players.has('C1')).toBe(true);
    host.expireAway(Date.now() + (REJOIN_HOLD_S + 5) * 1000);
    expect(left).toEqual(['C1']);
    expect(host.players.has('C1')).toBe(false);
  });

  it('in the lobby a leaver leaves (no match to hold); back to the lobby drops a held slot', async () => {
    const h = hub();
    const host = sess(h.make('H'), 'host', 'ABCDE', prof('Host'));
    const c1 = sess(h.make('C1'), 'client', 'ABCDE', prof('Cli'), 'tokA');
    await c1.transport.leave();
    expect(host.players.has('C1')).toBe(false);
    const c2 = sess(h.make('C2'), 'client', 'ABCDE', prof('Cli'), 'tokA');
    host.startMatch();
    await c2.transport.leave();
    expect(host.players.get('C2')?.away).toBe(true);
    host.backToLobby();
    expect(host.players.has('C2')).toBe(false);
  });

  it('a reload before the old connection drops is refused until it drops, then takes its slot', async () => {
    const { h, host, c1 } = room();
    const c2 = sess(h.make('C2'), 'client', 'ABCDE', prof('Cli'), 'tokA');
    c2.transport.send({ t: 'hello', v: PROTOCOL_VERSION, name: 'Cli', tag: {}, look: {}, tok: 'tokA' }, 'H');
    expect(c2.selfId).toBe('C2');
    expect(host.players.get('C1')?.away).toBe(false);
    await c1.transport.leave();
    // the refused tab tries again (its menu's Rejoin): a new session with its token
    const c3 = sess(h.make('C3'), 'client', 'ABCDE', prof('Cli'), 'tokA');
    expect(c3.selfId).toBe('C1');
    expect(host.players.get('C1')?.away).toBe(false);
  });

  it('the token goes to the host alone, and a live joiner\'s slot is never taken, even with its token', () => {
    const h = hub();
    const host = sess(h.make('H'), 'host', 'ABCDE', prof('Host'));
    host.setSettings('infiltration', 'warehouse', 'normal');
    const sniff = h.make('Z');
    const seen: string[] = [];
    sniff.onMessage = (m) => {
      const v = m as { t?: string; tok?: string };
      if (v.t === 'hello' && v.tok) seen.push(v.tok);
    };
    const c1 = sess(h.make('C1'), 'client', 'ABCDE', prof('Cli'), 'tokA');
    host.startMatch();
    expect(seen).toEqual([]);
    expect(c1.hostId).toBe('H');
    // a stranger that learnt the token anyway
    const s = sess(h.make('S'), 'client', 'ABCDE', prof('S'), 'tokA');
    s.transport.send({ t: 'hello', v: PROTOCOL_VERSION, name: 'S', tag: {}, look: {}, tok: 'tokA' }, 'H');
    expect(s.selfId).toBe('S');
    expect(host.players.get('C1')?.away).toBe(false);
  });

  it('a non-full room: the token hello moves a rejoin from its fresh entry to its held slot', async () => {
    const h = hub();
    const host = sess(h.make('H'), 'host', 'ABCDE', prof('Host'));
    host.setSettings('infiltration', 'warehouse', 'normal');
    const c1 = sess(h.make('C1'), 'client', 'ABCDE', prof('Cli'), 'tokA');
    host.startMatch();
    await c1.transport.leave();
    const c2 = sess(h.make('C2'), 'client', 'ABCDE', prof('Cli'), 'tokA');
    expect(c2.selfId).toBe('C1');
    expect(host.players.has('C2')).toBe(false);
    expect(host.players.get('C1')?.away).toBe(false);
    expect(host.players.size).toBe(2);
  });

  it('(R3) a client whose host drops keeps its session and takes the host that reopens the room', async () => {
    const { h, host, c1 } = room();
    let lost = 0;
    c1.events.on('hostLeft', () => lost++);
    await host.leave();
    expect(lost).toBeGreaterThan(0);
    expect(c1.hostId).toBeNull();
    let start: unknown = null;
    c1.events.on('start', (s) => (start = s));
    const h2 = sess(h.make('H2'), 'host', 'ABCDE', prof('Host'));
    h2.mode = 'course';
    h2.map = 'ctcourse';
    h2.courseBay = 3;
    h2.startMatch();
    // the waiting client hears the new host (its hello on the newcomer, the host's lobby and start)
    expect(c1.hostId).toBe('H2');
    expect(start).toMatchObject({ mode: 'course', map: 'ctcourse', bay: 3 });
    expect(h2.players.has('C1')).toBe(true);
  });
});

describe('rejoin record (R1)', () => {
  const rec = (at: number): RejoinRecord => ({ code: 'ABCDE', role: 'client', at, mode: 'course', map: 'ctcourse', difficulty: 'normal', mission: '', weather: 'clear', bay: 2 });
  it('is offered for the hold after it was last seen live, then gone', () => {
    const t = 1_000_000_000;
    expect(rejoinLive(rec(t), t + 1000)).toBe(true);
    expect(rejoinLive(rec(t), t + REJOIN_HOLD_S * 1000 - 1)).toBe(true);
    expect(rejoinLive(rec(t), t + REJOIN_HOLD_S * 1000 + 1)).toBe(false);
    expect(rejoinLive(null, t)).toBe(false);
    saveRejoin(rec(Date.now()));
    expect(loadRejoin()?.code).toBe('ABCDE');
    expect(loadRejoin(Date.now() + (REJOIN_HOLD_S + 1) * 1000)).toBeNull();
    clearRejoin();
    expect(loadRejoin()).toBeNull();
  });
  it('(lrpolish) keeps the match lamp falloff through the tab storage; an older record or junk reads as none', () => {
    const m = new Map<string, string>();
    vi.stubGlobal('sessionStorage', { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) });
    try {
      saveRejoin({ ...rec(Date.now()), role: 'host', lf: 'photometric' });
      expect(loadRejoin()?.lf).toBe('photometric');
      saveRejoin(rec(Date.now()));
      expect(loadRejoin()?.lf).toBeUndefined();
      m.set('ns-rejoin', JSON.stringify({ ...rec(Date.now()), lf: 'bogus' }));
      expect(loadRejoin()?.lf).toBeUndefined();
      clearRejoin();
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it('keeps one token per room for the tab', () => {
    const a = rejoinToken('ABCDE');
    expect(a).toMatch(/^[A-Za-z0-9]{8,24}$/);
    expect(rejoinToken('ABCDE')).toBe(a);
    expect(rejoinToken('FGHJK')).not.toBe(a);
  });
});
