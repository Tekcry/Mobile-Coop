// (mission-rules R4) Exactly two players for a campaign start (G2 "2 player coop campaign only, unable to be completed
// solo.", G48 "No bot anywhere"; BRIEF A9, A19): the host's session refuses a campaign start unless two are in the room,
// before the phase changes, so the room stays in the lobby and starts once the partner is in; a campaign room holds two
// whatever the mode's `capacity()` (coop4 takes Sector Ops to 4: `sectorCap` below plays that), while Sector Ops on
// other maps and Marlow Yard keep their capacity.
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WeaponId } from '../src/weapons/weaponDefs';
import { CAMPAIGN_ROOM, NetSession, type StartInfo } from '../src/net/session';
import type { Transport } from '../src/net/transport';
import { defaultLook } from '../src/cosmetics/avatarLook';
import { clearRejoin } from '../src/core/rejoin';
import { CAMPAIGN_PICK_MISSION, CAMPAIGN_TWO_PLAYERS } from '../src/game/mission/campaign';
import type * as Protocol from '../src/net/protocol';

/** Sector Ops' room capacity in this file: 2 (this branch) or 4 (coop4's `SECTOR_MAX`); other modes as they are. */
const cap = vi.hoisted(() => ({ sector: 2 }));
vi.mock('../src/net/protocol', async (importOriginal) => {
  const o = await importOriginal<typeof Protocol>();
  return { ...o, capacity: (m: Parameters<typeof o.capacity>[0]) => (m === 'sector' ? cap.sector : o.capacity(m)) };
});

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
  cap.sector = 2;
});

/** A host room on `map` with `mission`; `joiners` clients join before the settings change to it (so a room can hold
 *  more than a campaign room takes: it is filled on the campus first). */
function room(map: string, mission: string, joiners: number) {
  const h = hub();
  const host = sess(h.make('H'), 'host', 'ABCDE', prof('Host'));
  host.setSettings('sector', 'campusOps', 'normal');
  const clients: NetSession[] = [];
  const starts: StartInfo[] = [];
  for (let i = 0; i < joiners; i++) {
    const c = sess(h.make(`C${i}`), 'client', 'ABCDE', prof(`Cli${i}`));
    c.events.on('start', (s) => starts.push(s));
    c.setReady(true);
    clients.push(c);
  }
  host.sectorMission = mission;
  host.setSettings('sector', map, 'normal');
  return { h, host, clients, starts };
}

describe('R4: a campaign mission starts only with exactly two players', () => {
  it('a host alone on Three Grey Coats is refused and stays in the lobby; the start goes once the partner is in', () => {
    const h = hub();
    const host = sess(h.make('H'), 'host', 'ABCDE', prof('Host'));
    host.sectorMission = 'threeGreyCoats';
    host.setSettings('sector', 'tallowWharf', 'normal');
    let hostStarts = 0;
    host.events.on('start', () => hostStarts++);
    expect(host.campaign).toBe(true);
    expect(host.campaignBlock).toBe(CAMPAIGN_TWO_PLAYERS);
    expect(host.startMatch()).toBeNull();
    expect(host.phase).toBe('lobby');
    expect(hostStarts).toBe(0);
    // the partner joins: the same room starts (A19: the blocked start left nothing behind)
    const cli = sess(h.make('C'), 'client', 'ABCDE', prof('Cli'));
    let got: StartInfo | null = null;
    cli.events.on('start', (s) => (got = s));
    expect(cli.phase).toBe('lobby');
    expect(host.campaignBlock).toBeNull();
    const s = host.startMatch();
    expect(s?.sectorMission).toBe('threeGreyCoats');
    expect(host.phase).toBe('playing');
    expect(got!.sectorMission).toBe('threeGreyCoats');
    expect(cli.phase).toBe('playing');
  });

  for (const players of [3, 4]) {
    it(`${players} players (a room filled before the campaign was picked) are refused, the room stays in the lobby`, () => {
      cap.sector = 4;
      const r = room('tallowWharf', 'twoKeyLedger', players - 1);
      expect(r.host.players.size).toBe(players);
      expect(r.host.campaignBlock).toBe(CAMPAIGN_TWO_PLAYERS);
      expect(r.host.overCapacity).toBe(true);
      expect(r.host.startMatch()).toBeNull();
      expect(r.host.phase).toBe('lobby');
      expect(r.starts).toEqual([]);
      for (const c of r.clients) expect(c.phase).toBe('lobby');
    });
  }

  it('a campaign map with no campaign mission picked is refused, two players or not', () => {
    for (const mission of ['', 'campusMissionTest', 'nope']) {
      const r = room('tallowWharf', mission, 1);
      expect(r.host.campaignBlock).toBe(CAMPAIGN_PICK_MISSION);
      expect(r.host.startMatch()).toBeNull();
      expect(r.host.phase).toBe('lobby');
      expect(r.starts).toEqual([]);
    }
  });

  it('over capacity outside the campaign also leaves the room in the lobby (A19)', () => {
    cap.sector = 4;
    const r = room('campusOps', '', 2);
    // three in the room, then the host picks Marlow Yard (the course takes 2)
    r.host.setSettings('course', 'ctcourse', 'normal');
    expect(r.host.overCapacity).toBe(true);
    expect(r.host.campaignBlock).toBeNull();
    expect(r.host.startMatch()).toBeNull();
    expect(r.host.phase).toBe('lobby');
    expect(r.starts).toEqual([]);
  });
});

describe('R4: a campaign room holds two', () => {
  for (const sector of [2, 4]) {
    it(`a third join is refused on Tallow (Sector Ops capacity ${sector})`, () => {
      cap.sector = sector;
      const h = hub();
      const host = sess(h.make('H'), 'host', 'ABCDE', prof('Host'));
      host.sectorMission = 'threeGreyCoats';
      host.setSettings('sector', 'tallowWharf', 'normal');
      expect(host.cap).toBe(CAMPAIGN_ROOM);
      const cli = sess(h.make('C'), 'client', 'ABCDE', prof('Cli'));
      expect(cli.campaign).toBe(true); // the client's view: the map
      expect(cli.cap).toBe(CAMPAIGN_ROOM);
      // (the hub delivers at once: the host's "Room is full" bye reaches the third before any listener could)
      const third = sess(h.make('X'), 'client', 'ABCDE', prof('Third'));
      expect(third.hostId).toBeNull();
      expect([...host.players.keys()]).toEqual(['H', 'C']);
      expect(host.startMatch()).not.toBeNull();
    });
  }

  it('with coop4 capacity 4, a dropped partner\'s held slot is the only one a new connection can take (the room is full at 2)', () => {
    cap.sector = 4;
    const h = hub();
    const host = sess(h.make('H'), 'host', 'ABCDE', prof('Host'));
    host.sectorMission = 'threeGreyCoats';
    host.setSettings('sector', 'tallowWharf', 'normal');
    const cli = sess(h.make('C'), 'client', 'ABCDE', prof('Cli'));
    expect(host.startMatch()).not.toBeNull();
    void cli.leave();
    expect(host.players.get('C')?.away).toBe(true);
    // a tokenless hello (a tab closed with its token): the room is full, so it takes the only held slot
    sess(h.make('C2'), 'client', 'ABCDE', prof('Cli'));
    expect(host.players.size).toBe(2);
    expect(host.players.get('C')?.away).toBe(false);
  });
});

describe('R4: Sector Ops and Marlow Yard unchanged', () => {
  it('the campus test mission and plain Sector Ops start alone and take the mode\'s capacity (coop4: 4)', () => {
    for (const mission of ['campusMissionTest', '']) {
      cap.sector = 4;
      const h = hub();
      const host = sess(h.make('H'), 'host', 'ABCDE', prof('Host'));
      host.sectorMission = mission;
      host.setSettings('sector', 'campusOps', 'normal');
      expect(host.campaign).toBe(false);
      expect(host.campaignBlock).toBeNull();
      expect(host.cap).toBe(4);
      for (const id of ['C1', 'C2', 'C3']) sess(h.make(id), 'client', 'ABCDE', prof(id));
      expect(host.players.size).toBe(4);
      expect(host.overCapacity).toBe(false);
      expect(host.startMatch()?.sectorMission ?? '').toBe(mission);
      expect(host.phase).toBe('playing');
    }
    // a host alone on the campus starts as before
    const solo = sess(hub().make('S'), 'host', 'FGHJK', prof('Solo'));
    solo.sectorMission = 'campusMissionTest';
    solo.setSettings('sector', 'campusOps', 'normal');
    expect(solo.startMatch()).not.toBeNull();
  });

  it('Marlow Yard (course) stays 2 and starts alone; a mission id never makes a course room the campaign', () => {
    cap.sector = 4;
    const h = hub();
    const host = sess(h.make('H'), 'host', 'ABCDE', prof('Host'));
    host.sectorMission = 'threeGreyCoats';
    host.setSettings('course', 'ctcourse', 'normal');
    expect(host.campaign).toBe(false);
    expect(host.campaignBlock).toBeNull();
    expect(host.cap).toBe(2);
    expect(host.startMatch()).not.toBeNull();
    expect(host.phase).toBe('playing');
  });
});

// (PR E fix) "Resume hosting" a campaign match: the host reopens the room alone (R4 refuses the lone start), the joiner
// that waited in its match (no Ready button) is back: the match starts on its own, once (`startWhenUnblocked`).
describe('PR E fix: a resumed campaign host starts once the partner is back, no ready needed', () => {
  const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

  /** A campaign match whose host dropped (its joiner waits in the match, `hostId` cleared), and the host's reopened
   *  room set up as `connect`'s resume branch does (fields set directly, no lobby broadcast). */
  async function resumed() {
    const h = hub();
    const h1 = sess(h.make('H'), 'host', 'ABCDE', prof('Host'));
    h1.sectorMission = 'threeGreyCoats';
    h1.setSettings('sector', 'tallowWharf', 'normal');
    const cli = sess(h.make('C'), 'client', 'ABCDE', prof('Cli'), 'tokC');
    expect(h1.startMatch()).not.toBeNull();
    await h1.leave();
    expect(cli.hostId).toBeNull();
    expect(cli.phase).toBe('playing');
    const starts: StartInfo[] = [];
    cli.events.on('start', (s) => starts.push(s));
    const host = sess(h.make('H2'), 'host', 'ABCDE', prof('Host'));
    host.mode = 'sector';
    host.map = 'tallowWharf';
    host.sectorMission = 'threeGreyCoats';
    let hostStarts = 0;
    host.events.on('start', () => hostStarts++);
    // the resume branch: refused alone, then the auto start
    expect(host.startMatch()).toBeNull();
    expect(host.campaignBlock).toBe(CAMPAIGN_TWO_PLAYERS);
    host.startWhenUnblocked(() => host.campaignBlock);
    expect(host.phase).toBe('lobby');
    expect(host.autoStarting).toBe(true);
    // the host's side of the waiting joiner's connection (the test hub tells only the peers already in the room)
    const connect = (): void => host.transport.onPeerJoin?.('C');
    return { h, host, cli, starts, connect, hostStarts: () => hostStarts };
  }

  it('alone it stays in the lobby; the waiting joiner\'s hello starts the match for it with no Ready press', async () => {
    const r = await resumed();
    await tick();
    expect(r.host.phase).toBe('lobby');
    expect(r.hostStarts()).toBe(0);
    r.connect();
    expect(r.cli.hostId).toBe('H2');
    expect(r.host.players.get('C')?.ready).toBe(false);
    // the start goes on the next task (after the lobby handler that announced the partner)
    expect(r.host.phase).toBe('lobby');
    await tick();
    expect(r.host.phase).toBe('playing');
    expect(r.hostStarts()).toBe(1);
    expect(r.starts).toHaveLength(1);
    expect(r.starts[0]!.sectorMission).toBe('threeGreyCoats');
    expect(r.cli.phase).toBe('playing');
    expect(r.host.autoStarting).toBe(false);
  });

  it('fires once: back in the lobby with both in, the next match waits for the Ready press again', async () => {
    const r = await resumed();
    r.connect();
    await tick();
    expect(r.hostStarts()).toBe(1);
    r.host.backToLobby();
    r.host.broadcastLobby();
    await tick();
    expect(r.host.phase).toBe('lobby');
    expect(r.hostStarts()).toBe(1);
    expect(r.starts).toHaveLength(1);
    expect(r.host.allReady).toBe(false);
  });

  it('is gone after leave: a start queued before the leave never runs', async () => {
    const r = await resumed();
    r.connect();
    void r.host.leave();
    expect(r.host.autoStarting).toBe(false);
    await tick();
    expect(r.hostStarts()).toBe(0);
    expect(r.starts).toEqual([]);
    // and a host that leaves alone drops it too
    const q = await resumed();
    await q.host.leave();
    expect(q.host.autoStarting).toBe(false);
  });

  it('a partner that drops before the start keeps it pending; its rejoin from the menu starts the match', async () => {
    const r = await resumed();
    r.connect();
    await r.cli.leave();
    expect(r.host.players.has('C')).toBe(false);
    await tick();
    expect(r.host.phase).toBe('lobby');
    expect(r.host.autoStarting).toBe(true);
    const back = sess(r.h.make('C3'), 'client', 'ABCDE', prof('Cli'), 'tokC');
    let got: StartInfo | null = null;
    back.events.on('start', (s) => (got = s));
    expect(back.players.get(back.selfId)?.ready).toBe(false);
    await tick();
    expect(r.host.phase).toBe('playing');
    expect(r.hostStarts()).toBe(1);
    expect(got!.sectorMission).toBe('threeGreyCoats');
  });

  it('another mode or map drops it: a switch off the campaign never starts the host alone', async () => {
    const r = await resumed();
    r.host.setSettings('sector', 'tallowWharf', 'realistic');
    expect(r.host.autoStarting).toBe(true);
    r.host.setSettings('course', 'ctcourse', 'normal');
    expect(r.host.campaignBlock).toBeNull();
    expect(r.host.autoStarting).toBe(false);
    await tick();
    expect(r.host.phase).toBe('lobby');
    expect(r.hostStarts()).toBe(0);
  });
});
