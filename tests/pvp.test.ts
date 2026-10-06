import { describe, expect, it } from 'vitest';
import { balanceTeam, canJoinTeam, pickSpawn, PvpScore, pvpInfo, PVP } from '../src/net/pvp';
import { capacity, isPvp, parseMessage, MAX_ITEMS } from '../src/net/protocol';
import { NetSession } from '../src/net/session';
import type { Transport } from '../src/net/transport';
import { defaultLook } from '../src/cosmetics/avatarLook';
import type { WeaponId } from '../src/weapons/weaponDefs';
import { computeRewards } from '../src/progression/rewards';
import { emptyStats } from '../src/game/modes/gameMode';

describe('pvp rules', () => {
  it('teams balance and cap at four a side', () => {
    expect(balanceTeam([])).toBe(0);
    expect(balanceTeam([0])).toBe(1);
    expect(balanceTeam([0, 1, 0])).toBe(1);
    expect(canJoinTeam([0, 0, 0, 0, 1], 0)).toBe(false);
    expect(canJoinTeam([0, 0, 0, 1], 0)).toBe(true);
  });
  it('team deathmatch: no friendly fire, team kills score, first to the limit wins', () => {
    const s = new PvpScore('tdm');
    s.add('a', 0);
    s.add('b', 0);
    s.add('c', 1);
    expect(s.hostile('a', 'b')).toBe(false);
    expect(s.hostile('a', 'c')).toBe(true);
    expect(s.hostile('a', 'a')).toBe(false);
    s.frag('c', 'a');
    s.frag('a', 'b'); // a team kill never scores
    s.frag('b', 'b'); // a suicide is a death only
    expect(s.teams).toEqual([1, 0]);
    expect(s.lines().find((l) => l.id === 'b')).toMatchObject({ k: 0, d: 1 });
    expect(s.leader()).toEqual({ id: 'team0', score: 1 });
    expect(s.over).toBe(false);
    for (let i = 0; i < PVP.tdm.limit; i++) s.frag('c', 'b');
    expect(s.over).toBe(true);
    expect(s.won('a')).toBe(true);
    expect(s.won('c')).toBe(false);
  });
  it('free-for-all: everyone is an opponent; time up ends it, a tie is a draw', () => {
    const s = new PvpScore('ffa');
    for (const id of ['a', 'b', 'c']) s.add(id, 0);
    expect(s.hostile('a', 'b')).toBe(true);
    s.frag('b', 'a');
    s.frag('a', 'c');
    expect(s.leader().id).toBe('');
    s.frag('c', 'a');
    expect(s.leader()).toEqual({ id: 'a', score: 2 });
    s.elapsed = PVP.ffa.time;
    expect(s.over).toBe(true);
    expect(s.won('a')).toBe(true);
  });
  it('spawns pick the point furthest from opponents (team-mates nearby break ties)', () => {
    const c = [{ x: 0, z: 0 }, { x: 40, z: 0 }, { x: 20, z: 30 }];
    expect(pickSpawn(c, [{ x: 2, z: 0 }])).toBe(1);
    expect(pickSpawn(c, [{ x: 38, z: 0 }])).toBe(0);
    expect(pickSpawn(c, [{ x: 20, z: 0 }], [{ x: 20, z: 28 }])).toBe(2);
  });
  it('HUD line', () => {
    const lines = [{ id: 'a', k: 3, d: 1, team: 1 }, { id: 'b', k: 5, d: 0, team: 0 }];
    expect(pvpInfo('tdm', lines, 'a', 125)).toMatch(/Red <b>3<\/b>.*Blue <b>5<\/b>.*2:05/);
    expect(pvpInfo('ffa', lines, 'a', 59)).toMatch(/You <b>3<\/b>.*Lead <b>5<\/b>.*0:59/);
  });
  it('rewards pay eliminations and the result', () => {
    const s = emptyStats('tdm', 'warehouse');
    s.kills = 10;
    s.headshots = 4;
    s.won = true;
    const r = computeRewards(s, 'realistic');
    expect(r.lines.map((l) => l.label)).toEqual(['Eliminations (10)', 'Headshots', 'Match won']);
    s.won = false;
    expect(computeRewards(s, 'normal').lines.at(-1)!.label).toBe('Match played');
  });
});

describe('phase 10 protocol', () => {
  it('modes and capacity: co-op 4, PvP 8', () => {
    expect(capacity('wave')).toBe(4);
    expect(capacity('infiltration')).toBe(4);
    expect(capacity('tdm')).toBe(8);
    expect(isPvp('ffa')).toBe(true);
    expect(parseMessage({ t: 'start', mode: 'clear', map: 'warehouse', seed: 1, difficulty: 'normal', mission: 'embassy-pouch' })).toMatchObject({ mode: 'clear', mission: 'embassy-pouch' });
    expect(parseMessage({ t: 'start', mode: 'tdm', map: 'warehouse', seed: 1, difficulty: 'normal', mission: '../x' })).toMatchObject({ mode: 'tdm', mission: '' });
  });
  it('use / takedown / team messages', () => {
    expect(parseMessage({ t: 'use', id: 'door-3' })).toEqual({ t: 'use', id: 'door-3' });
    expect(parseMessage({ t: 'use', id: '<x>' })).toBeNull();
    expect(parseMessage({ t: 'td', target: 'e4', ph: 'done', lethal: 1 })).toEqual({ t: 'td', target: 'e4', ph: 'done', lethal: false });
    expect(parseMessage({ t: 'td', target: 'e4', ph: 'eat' })).toBeNull();
    expect(parseMessage({ t: 'team', team: 1 })).toEqual({ t: 'team', team: 1 });
    expect(parseMessage({ t: 'team', team: 2 })).toBeNull();
  });
  it('snapshot items, doors, score and enemy alert levels are validated and capped', () => {
    const items = Array.from({ length: 80 }, (_, i) => ({ id: `it${i}`, k: i % 9 === 0 ? 'bomb' : 'door', x: 1, y: 0, z: 2, label: '<b>Open</b>', hold: 99, reach: 0, on: true }));
    const m = parseMessage({ t: 'snap', time: 1, players: [], enemies: [{ id: 'e1', k: 'dog', x: 0, y: 0, z: 0, yaw: 0, st: 0, hp: 1, al: 99 }], obj: '', info: '', pk: 0, items, doors: [3, 3, -1, 'x', 5000], score: [{ id: 'a', k: 3, d: 2, team: 7 }], tl: 9999 });
    expect(m?.t).toBe('snap');
    if (m?.t !== 'snap') return;
    expect(m.items!.length).toBeLessThanOrEqual(MAX_ITEMS);
    expect(m.items!.every((i) => i.k === 'door' && i.hold === 10 && i.reach === 0.5 && !/[<>]/.test(i.label))).toBe(true);
    expect(m.doors).toEqual([3, 0, 4095]);
    expect(m.score).toEqual([{ id: 'a', k: 3, d: 2, team: 1 }]);
    expect(m.tl).toBe(3600);
    expect(m.enemies[0]!.al).toBe(7);
  });
  it('frag and takedown-denied events', () => {
    const m = parseMessage({ t: 'ev', events: [{ e: 'frag', victim: 'a', by: 'b', head: true }, { e: 'tdDenied', player: 'a', enemy: 'e1' }, { e: 'frag', victim: '' }] });
    expect(m?.t === 'ev' && m.events.map((e) => e.e)).toEqual(['frag', 'tdDenied']);
  });
});

/** In-memory hub (like the wire: JSON round trip). */
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
const prof = (name: string) => ({ name, tag: { title: 'Rookie', color: '#ff8a1e', emblem: 'chevron' }, look: defaultLook(), loadout: ['rifle'] as WeaponId[] });

describe('pvp lobby', () => {
  it('eight in a PvP room, teams balanced on join; co-op over capacity cannot start', () => {
    const h = hub();
    const host = new NetSession(h.make('H'), 'host', 'ABCDE', prof('Host'));
    host.setSettings('tdm', 'warehouse', 'normal');
    const cs = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((id) => new NetSession(h.make(id), 'client', 'ABCDE', prof(id)));
    expect(host.players.size).toBe(8);
    const t = [...host.players.values()].map((p) => p.team);
    expect(t.filter((x) => x === 0).length).toBe(4);
    const ninth = new NetSession(h.make('X'), 'client', 'ABCDE', prof('X'));
    let full = false;
    ninth.events.on('full', () => (full = true));
    ninth.transport.send({ t: 'hello', v: 2, name: 'X', tag: {}, look: {} }, 'H');
    expect(full).toBe(true);
    // a full side refuses a switch; a client sees its side
    cs[0]!.requestTeam(1 - host.players.get('A')!.team);
    expect([...host.players.values()].filter((p) => p.team === 0).length).toBe(4);
    host.setSettings('wave', 'warehouse', 'normal');
    expect(host.overCapacity).toBe(true);
    expect(host.startMatch()).toBeNull();
    host.setSettings('ffa', 'warehouse', 'normal');
    expect(host.startMatch()).toMatchObject({ mode: 'ffa' });
  });
  it('team switch with room on the other side; infiltration carries the mission', () => {
    const h = hub();
    const host = new NetSession(h.make('H'), 'host', 'ABCDE', prof('Host'));
    const a = new NetSession(h.make('A'), 'client', 'ABCDE', prof('A'));
    host.setSettings('tdm', 'warehouse', 'normal');
    const before = host.players.get('A')!.team;
    a.requestTeam(1 - before);
    expect(host.players.get('A')!.team).toBe(1 - before);
    expect(a.players.get('A')!.team).toBe(1 - before);
    let started: unknown = null;
    a.events.on('start', (s) => (started = s));
    host.setSettings('infiltration', 'embassy', 'normal', 'embassy-asset');
    expect(a.mission).toBe('embassy-asset');
    host.startMatch();
    expect(started).toMatchObject({ mode: 'infiltration', mission: 'embassy-asset' });
  });
});
