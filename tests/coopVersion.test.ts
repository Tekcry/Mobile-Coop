import { describe, expect, it } from 'vitest';
import { NetSession, VERSION_BYE } from '../src/net/session';
import { PROTOCOL_VERSION } from '../src/net/protocol';
import type { Transport } from '../src/net/transport';
import type { WeaponId } from '../src/weapons/weaponDefs';

// (co-op relay fix, protocol 91) another game version in the room is said, not silent: before, the host dropped the
// joiner's hello, the joiner sat in the host's lobby (or saw "No host found") and the host never saw it

/** In-memory hub: every transport sees every other; messages go through JSON like the wire. */
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

describe('protocol version mismatch', () => {
  it('the host refuses another version with a bye and says so once per connection', () => {
    const h = hub();
    const host = new NetSession(h.make('H'), 'host', 'ABCDE', prof('Host'));
    const told: number[] = [];
    host.events.on('version', (e) => told.push(e.theirs));
    const old = h.make('O');
    const got: unknown[] = [];
    old.onMessage = (m) => got.push(m);
    old.send({ t: 'hello', v: PROTOCOL_VERSION - 1, name: 'Old', loadout: [], tok: '' }, 'H');
    old.send({ t: 'hello', v: PROTOCOL_VERSION - 1, name: 'Old', loadout: [], tok: '' }, 'H');
    expect(host.players.has('O')).toBe(false);
    expect(got).toContainEqual({ t: 'bye', reason: VERSION_BYE });
    expect(told).toEqual([PROTOCOL_VERSION - 1]);
  });

  it("a joiner refused for its version emits version (not full, not hostLeft) and takes no lobby after", () => {
    const h = hub();
    const host = new NetSession(h.make('H'), 'host', 'ABCDE', prof('Host'));
    const ht = host.transport;
    const ct = h.make('C');
    const cli = new NetSession(ct, 'client', 'ABCDE', prof('Cli'));
    const ev: string[] = [];
    cli.events.on('version', () => ev.push('version'));
    cli.events.on('full', () => ev.push('full'));
    cli.events.on('hostLeft', () => ev.push('hostLeft'));
    expect(cli.hostId).toBe('H');
    ht.send({ t: 'bye', reason: VERSION_BYE }, 'C');
    expect(ev).toEqual(['version']);
    expect(cli.hostId).toBeNull();
    host.broadcastLobby();
    expect(cli.hostId).toBeNull();
  });

  it("a joiner hearing the host's hello of another version stops at once", () => {
    const h = hub();
    const fakeHost = h.make('H');
    const cli = new NetSession(h.make('C'), 'client', 'ABCDE', prof('Cli'));
    const ev: number[] = [];
    cli.events.on('version', (e) => ev.push(e.theirs));
    fakeHost.send({ t: 'hello', v: PROTOCOL_VERSION + 1, name: 'New', loadout: [], tok: '', h: 1 }, 'C');
    expect(ev).toEqual([PROTOCOL_VERSION + 1]);
    // a hello of our own version is quiet
    const cli2 = new NetSession(h.make('D'), 'client', 'ABCDE', prof('Cli2'));
    const ev2: number[] = [];
    cli2.events.on('version', (e) => ev2.push(e.theirs));
    fakeHost.send({ t: 'hello', v: PROTOCOL_VERSION, name: 'Same', loadout: [], tok: '', h: 1 }, 'D');
    expect(ev2).toEqual([]);
  });

  it('a third peer of another version (not the host: no h flag) never stops a joiner', () => {
    const h = hub();
    const host = new NetSession(h.make('H'), 'host', 'ABCDE', prof('Host'));
    const cli = new NetSession(h.make('C'), 'client', 'ABCDE', prof('Cli'));
    const ev: number[] = [];
    cli.events.on('version', (e) => ev.push(e.theirs));
    // before and after the host is known: an old joiner's hello to everyone
    const third = h.make('X');
    third.send({ t: 'hello', v: PROTOCOL_VERSION - 1, name: 'Old', loadout: [], tok: '' });
    expect(ev).toEqual([]);
    expect(cli.hostId).toBe('H');
    // no host known yet (another room, the old peer first): still not a refusal; the same hello with h is
    const h2 = hub();
    const x = h2.make('X');
    const early = new NetSession(h2.make('E'), 'client', 'FGHJK', prof('Early'));
    const ev2: number[] = [];
    early.events.on('version', (e) => ev2.push(e.theirs));
    x.send({ t: 'hello', v: PROTOCOL_VERSION - 1, name: 'Old', loadout: [], tok: '' }, 'E');
    expect(ev2).toEqual([]);
    expect(early.hostId).toBeNull();
    x.send({ t: 'hello', v: PROTOCOL_VERSION - 1, name: 'OldHost', loadout: [], tok: '', h: 1 }, 'E');
    expect(ev2).toEqual([PROTOCOL_VERSION - 1]);
    expect(host.players.has('C')).toBe(true);
  });

  it("the host's hello carries h: 1, a joiner's does not", () => {
    const h = hub();
    const seen: Record<string, unknown>[] = [];
    const spy = h.make('S');
    spy.onMessage = (m) => {
      const o = m as Record<string, unknown>;
      if (o.t === 'hello') seen.push(o);
    };
    new NetSession(h.make('H'), 'host', 'ABCDE', prof('Host'));
    new NetSession(h.make('C'), 'client', 'ABCDE', prof('Cli'));
    expect(seen.find((m) => m.name === 'Host')?.h).toBe(1);
    expect(seen.find((m) => m.name === 'Cli')?.h).toBeUndefined();
  });

  it('the same version joins as before', () => {
    const h = hub();
    const host = new NetSession(h.make('H'), 'host', 'ABCDE', prof('Host'));
    const cli = new NetSession(h.make('C'), 'client', 'ABCDE', prof('Cli'));
    let v = 0;
    host.events.on('version', () => v++);
    cli.events.on('version', () => v++);
    expect(cli.hostId).toBe('H');
    expect(host.players.size).toBe(2);
    expect(v).toBe(0);
  });
});
