import { emptyKinds } from '../src/ai/enemyDefs';
import type { WeaponId } from '../src/weapons/weaponDefs';
import { describe, expect, it } from 'vitest';
import { makeRoomCode, normalizeRoomCode, parseMessage, CODE_ALPHABET, MAX_ENEMIES } from '../src/net/protocol';
import { mulberry } from '../src/core/rng';

const ps = { id: 'peerA', x: 1, y: 0, z: 2, yaw: 0.5, pitch: 0.1, speed: 3, f: 16, w: 'rifle', hp: 80, sh: 20 };

describe('net message validation', () => {
  it('accepts well-formed messages', () => {
    expect(parseMessage({ t: 'ready', ready: true })).toEqual({ t: 'ready', ready: true });
    expect(parseMessage({ t: 'pstate', s: ps })).toMatchObject({ t: 'pstate', s: { id: 'peerA', w: 'rifle' } });
    const snap = parseMessage({ t: 'snap', time: 12, players: [ps], enemies: [{ id: 'e1', k: 'grunt', x: 0, y: 0, z: 0, yaw: 0, st: 1, hp: 0.5 }], obj: 'Survive', info: '' });
    expect(snap?.t).toBe('snap');
  });
  it('rejects unknown types, missing fields and wrong types', () => {
    expect(parseMessage(null)).toBeNull();
    expect(parseMessage('hello')).toBeNull();
    expect(parseMessage({ t: 'nope' })).toBeNull();
    expect(parseMessage({ t: 'ready', ready: 'yes' })).toBeNull();
    expect(parseMessage({ t: 'pstate', s: { ...ps, w: 'railgun' } })).toBeNull();
    expect(parseMessage({ t: 'pstate', s: { ...ps, x: Number.NaN } })).toBeNull();
    expect(parseMessage({ t: 'start', mode: 'battle-royale', map: 'depot', seed: 1, difficulty: 'normal' })).toBeNull();
  });
  it('clamps numbers to sane ranges', () => {
    const m = parseMessage({ t: 'pstate', s: { ...ps, x: 1e9, hp: 9999, speed: -4, pitch: 9 } });
    expect(m && m.t === 'pstate' && m.s).toMatchObject({ x: 400, hp: 100, speed: 0, pitch: 1.6 });
  });
  it('sanitises strings (names, ids, looks) and caps lengths', () => {
    const m = parseMessage({ t: 'hello', v: 1, name: '<img src=x onerror=alert(1)>Mallory-the-long-name', tag: { title: '<b>', color: 'red', emblem: 'x' }, look: { hair: 'laser' } });
    expect(m?.t).toBe('hello');
    if (m?.t !== 'hello') return;
    expect(m.name).not.toMatch(/[<>]/);
    expect(m.name.length).toBeLessThanOrEqual(16);
    expect(m.tag.color).toBe('#ff8a1e');
    expect(m.look.hair).toBe(defaultLook().hair);
    expect(parseMessage({ t: 'pstate', s: { ...ps, id: '../../etc' } })).toBeNull();
  });
  it('loadout: known weapons only, no repeats, capped', () => {
    const m = parseMessage({ t: 'hello', v: 1, name: 'A', tag: {}, look: {}, loadout: ['rifle', 'rifle', 'railgun', 7, 'pistol', 'smg', 'sniper', 'shotgun', 'smg'] });
    expect(m?.t === 'hello' && m.loadout).toEqual(['rifle', 'pistol', 'smg', 'sniper', 'shotgun']);
    const n = parseMessage({ t: 'hello', v: 1, name: 'A', tag: {}, look: {}, loadout: 'rifle' });
    expect(n?.t === 'hello' && n.loadout).toEqual([]);
  });
  it('caps array sizes and drops bad entries', () => {
    const enemies = Array.from({ length: 100 }, (_, i) => ({ id: `e${i}`, k: i % 7 === 0 ? 'dragon' : 'grunt', x: 0, y: 0, z: 0, yaw: 0, st: 0, hp: 1 }));
    const m = parseMessage({ t: 'snap', time: 1, players: [], enemies, obj: '', info: '' });
    expect(m?.t === 'snap' && m.enemies.length).toBeLessThanOrEqual(MAX_ENEMIES);
    expect(m?.t === 'snap' && m.enemies.every((e) => e.k === 'grunt')).toBe(true);
  });
  it('shot directions are normalised and degenerate ones rejected', () => {
    const m = parseMessage({ t: 'shot', w: 'rifle', ox: 0, oy: 1, oz: 0, dx: 0.5, dy: 0, dz: 0.5, target: 'e3', part: 'head', rt: 10, dist: 12 });
    expect(m?.t === 'shot' && Math.hypot(m.dx, m.dy, m.dz)).toBeCloseTo(1);
    expect(parseMessage({ t: 'shot', w: 'rifle', ox: 0, oy: 1, oz: 0, dx: 0, dy: 0, dz: 0, target: 'e3', part: 'head', rt: 10, dist: 1 })).toBeNull();
  });
  it('end-of-match stats are clamped before they reach rewards', () => {
    const m = parseMessage({ t: 'end', stats: { won: 'yes', waves: 1e9, score: -5, subtitle: 'x', players: { me: { kills: 1e9, headshots: 3, byKind: { grunt: 5, dragon: 9 }, weaponKills: { rifle: 4, bfg: 99 } } } } });
    expect(m?.t).toBe('end');
    if (m?.t !== 'end') return;
    expect(m.stats.won).toBe(false);
    expect(m.stats.waves).toBe(200);
    expect(m.stats.score).toBe(0);
    expect(m.stats.players.me).toEqual({ kills: 2000, headshots: 3, byKind: { ...emptyKinds(), grunt: 5, runner: 0, heavy: 0 }, weaponKills: { rifle: 4 } });
  });
  it('events validate per kind', () => {
    const m = parseMessage({ t: 'ev', events: [{ e: 'boom', x: 1, y: 0, z: 1, r: 99 }, { e: 'banner', title: '<script>', sub: 'ok' }, { e: 'nuke' }, { e: 'kill', enemy: 'e1', kind: 'heavy', by: 'p1', head: true }] });
    expect(m?.t === 'ev' && m.events.map((e) => e.e)).toEqual(['boom', 'banner', 'kill']);
    expect(m?.t === 'ev' && m.events[0]).toMatchObject({ r: 12 });
  });
  it('pings, gadgets, execute shots and kept bodies', () => {
    expect(parseMessage({ t: 'ping', x: 1, y: 0, z: 2, target: 'e4' })).toEqual({ t: 'ping', x: 1, y: 0, z: 2, target: 'e4' });
    expect(parseMessage({ t: 'ping', x: 1e9, y: 0, z: 2 })).toMatchObject({ x: 400, target: '' });
    expect(parseMessage({ t: 'ping', x: 'a', y: 0, z: 2 })).toBeNull();
    expect(parseMessage({ t: 'gadget', kind: 'gas', x: 1, y: 0, z: 2 })).toEqual({ t: 'gadget', kind: 'gas', x: 1, y: 0, z: 2 });
    expect(parseMessage({ t: 'gadget', kind: 'frag', x: 1, y: 0, z: 2 })).toBeNull();
    const ev = parseMessage({ t: 'ev', events: [{ e: 'ping', player: 'p1', x: 0, y: 0, z: 0 }, { e: 'gadget', player: 'p1', kind: 'emp', x: 0, y: 0, z: 0 }, { e: 'gadget', player: 'p1', kind: 'nuke', x: 0, y: 0, z: 0 }] });
    expect(ev?.t === 'ev' && ev.events.map((e) => e.e)).toEqual(['ping', 'gadget']);
    const shot = { t: 'shot', w: 'rifle', ox: 0, oy: 1, oz: 0, dx: 0, dy: 0, dz: 1, target: 'e3', part: 'head', rt: 10, dist: 12 };
    expect(parseMessage({ ...shot, ex: true })).toMatchObject({ ex: true });
    expect(parseMessage({ ...shot, ex: 'yes' })).toMatchObject({ ex: false });
    const snap = parseMessage({ t: 'snap', time: 1, players: [], enemies: [], obj: '', info: '', pk: 0, bodies: ['e1', '../x', 7, 'e2'] });
    expect(snap?.t === 'snap' && snap.bodies).toEqual(['e1', 'e2']);
  });
});

describe('room codes', () => {
  it('generates 5-char codes from the safe alphabet', () => {
    const r = mulberry(3);
    for (let i = 0; i < 50; i++) {
      const c = makeRoomCode(r);
      expect(c).toHaveLength(5);
      for (const ch of c) expect(CODE_ALPHABET).toContain(ch);
    }
  });
  it('normalises user input and rejects invalid codes', () => {
    expect(normalizeRoomCode(' ab-cd2 ')).toBe('ABCD2');
    expect(normalizeRoomCode('abc')).toBeNull();
    expect(normalizeRoomCode('ABCDE1')).toBeNull();
  });
});

// ---------------------------------------------------------------------------------------------
import { SnapshotBuffer, ClockSync, lerpAngle } from '../src/net/interp';
import { RateLimiter, checkShot, checkBlast, clampEnd, coopSessionStats, maxHitDamage, shotLimiter, rayPointDistance } from '../src/net/validate';
import { NetSession } from '../src/net/session';
import type { Transport } from '../src/net/transport';
import { WEAPONS } from '../src/weapons/weaponDefs';
import { emptyStats } from '../src/game/modes/gameMode';
import { defaultLook } from '../src/cosmetics/avatarLook';
import { htmlToInfo, infoToHtml } from '../src/net/netShared';

describe('snapshot interpolation', () => {
  const st = (x: number, yaw = 0) => ({ x, y: 0, z: 0, yaw });
  it('interpolates between bracketing states and holds before the first', () => {
    const b = new SnapshotBuffer<ReturnType<typeof st>>();
    b.push(1, st(0));
    b.push(2, st(10));
    expect(b.sample(1.5)!.x).toBeCloseTo(5);
    expect(b.sample(0)!.x).toBe(0);
  });
  it('extrapolates a little past the newest state, then holds', () => {
    const b = new SnapshotBuffer<ReturnType<typeof st>>(30, 0.2);
    b.push(1, st(0));
    b.push(2, st(10));
    expect(b.sample(2.1)!.x).toBeCloseTo(11);
    expect(b.sample(5)!.x).toBeCloseTo(12);
  });
  it('drops out-of-order states and caps its size', () => {
    const b = new SnapshotBuffer<ReturnType<typeof st>>(3);
    b.push(2, st(2));
    b.push(1, st(1));
    expect(b.size).toBe(1);
    for (let i = 3; i < 10; i++) b.push(i, st(i));
    expect(b.size).toBe(3);
  });
  it('angles take the short way round', () => {
    expect(lerpAngle(3, -3, 0.5)).toBeCloseTo(Math.PI, 1);
    const b = new SnapshotBuffer<ReturnType<typeof st>>();
    b.push(0, st(0, 3.1));
    b.push(1, st(0, -3.1));
    expect(Math.abs(b.sample(0.5)!.yaw)).toBeGreaterThan(3);
  });
  it('clock sync converges on the remote clock', () => {
    const c = new ClockSync();
    c.observe(100, 10);
    for (let i = 0; i < 50; i++) c.observe(100 + i * 0.066 - (i % 3) * 0.01, 10 + i * 0.066);
    expect(c.now(20)).toBeGreaterThan(109.9);
    expect(c.now(20)).toBeLessThan(110.05);
  });
});

describe('host validation', () => {
  it('rate limiter refills over time', () => {
    const r = new RateLimiter(2, 1);
    expect(r.take(0)).toBe(true);
    expect(r.take(0)).toBe(true);
    expect(r.take(0)).toBe(false);
    expect(r.take(1.1)).toBe(true);
  });
  it('weapon budgets allow the real fire rate but not double', () => {
    const def = WEAPONS.smg;
    const lim = shotLimiter(def);
    const interval = 60 / def.rpm;
    let ok = 0;
    for (let i = 0; i < 100; i++) if (lim.take(i * interval)) ok++;
    expect(ok).toBe(100);
    const lim2 = shotLimiter(def);
    let ok2 = 0;
    for (let i = 0; i < 200; i++) if (lim2.take(i * interval * 0.5)) ok2++;
    expect(ok2).toBeLessThan(150);
  });
  it('damage claims are capped by fully upgraded stats', () => {
    expect(maxHitDamage(WEAPONS.sniper, true)).toBeGreaterThan(maxHitDamage(WEAPONS.sniper, false));
    expect(maxHitDamage(WEAPONS.pistol, false)).toBeLessThan(200);
  });
  it('ray/point distance', () => {
    const r = rayPointDistance({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 5 });
    expect(r.along).toBeCloseTo(5);
    expect(r.perp).toBeCloseTo(1);
    expect(rayPointDistance({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -3 }).perp).toBeCloseTo(3);
  });
  it('shots must start at the shooter, pass near the target and be in range', () => {
    const feet = { x: 0, y: 0, z: 0 };
    const body = { x: 0, y: 1, z: 20 };
    const head = { x: 0, y: 1.6, z: 20 };
    const o = { x: 0.4, y: 1.58, z: 0 };
    const at = (p: { x: number; y: number; z: number }) => {
      const d = { x: p.x - o.x, y: p.y - o.y, z: p.z - o.z };
      const l = Math.hypot(d.x, d.y, d.z);
      return { x: d.x / l, y: d.y / l, z: d.z / l };
    };
    expect(checkShot({ origin: o, dir: at(body), part: 'body' }, feet, body, head, 50).ok).toBe(true);
    expect(checkShot({ origin: o, dir: at(head), part: 'head' }, feet, body, head, 50).ok).toBe(true);
    expect(checkShot({ origin: { x: 30, y: 1.5, z: 0 }, dir: at(body), part: 'body' }, feet, body, head, 50)).toEqual({ ok: false, reason: 'origin' });
    expect(checkShot({ origin: o, dir: { x: 1, y: 0, z: 0 }, part: 'body' }, feet, body, head, 50)).toEqual({ ok: false, reason: 'miss' });
    expect(checkShot({ origin: o, dir: at(body), part: 'body' }, feet, body, head, 10)).toEqual({ ok: false, reason: 'range' });
    // a body-aimed ray claimed as a headshot is too low
    expect(checkShot({ origin: o, dir: at({ x: 0, y: 0.6, z: 20 }), part: 'head' }, feet, body, head, 50).ok).toBe(false);
  });
  it('grenade blasts must be near the thrower', () => {
    expect(checkBlast({ x: 10, y: 0, z: 10 }, { x: 0, y: 0, z: 0 })).toBe(true);
    expect(checkBlast({ x: 80, y: 0, z: 0 }, { x: 0, y: 0, z: 0 })).toBe(false);
  });
  it('end stats are clamped to what is possible in the time played', () => {
    const end = clampEnd(
      {
        won: false,
        subtitle: '',
        waves: 50,
        score: 1e7,
        players: { me: { kills: 500, headshots: 900, byKind: { ...emptyKinds(), grunt: 400, runner: 400, heavy: 400 }, weaponKills: { rifle: 400, smg: 400 } } },
        winner: '',
      },
      60,
    );
    const me = end.players.me!;
    expect(end.waves).toBeLessThanOrEqual(7);
    expect(me.kills).toBeLessThanOrEqual(92);
    expect(me.headshots).toBeLessThanOrEqual(me.kills);
    expect(me.byKind.grunt + me.byKind.runner + me.byKind.heavy).toBeLessThanOrEqual(me.kills);
    expect((me.weaponKills.rifle ?? 0) + (me.weaponKills.smg ?? 0)).toBeLessThanOrEqual(me.kills);
    expect(end.score).toBeLessThan(1e7);
    const honest = clampEnd({ won: false, subtitle: '', waves: 2, score: 1500, players: { me: { kills: 9, headshots: 2, byKind: { ...emptyKinds(), grunt: 9, runner: 0, heavy: 0 }, weaponKills: { rifle: 9 } } }, winner: '' }, 120);
    expect(honest.score).toBe(1500);
    expect(honest.players.me!.kills).toBe(9);
  });
  it('rewards use only this player’s line of the host report', () => {
    const s = coopSessionStats(emptyStats('wave', 'depot'), { won: false, subtitle: '', waves: 3, score: 900, players: { a: { kills: 4, headshots: 1, byKind: { ...emptyKinds(), grunt: 4, runner: 0, heavy: 0 }, weaponKills: {} }, b: { kills: 7, headshots: 0, byKind: { ...emptyKinds(), grunt: 7, runner: 0, heavy: 0 }, weaponKills: {} } }, winner: '' }, 'b');
    expect(s.kills).toBe(7);
    expect(s.waves).toBe(3);
    expect(coopSessionStats(emptyStats('wave', 'depot'), { won: false, subtitle: '', waves: 1, score: 0, players: {}, winner: '' }, 'zz').kills).toBe(0);
  });
  it('mode info round-trips through plain text', () => {
    const html = '<span>Wave <b>3</b></span><span>Hostiles <b>5</b></span><span>Score <b>1200</b></span>';
    expect(htmlToInfo(html)).toBe('Wave 3|Hostiles 5|Score 1200');
    expect(infoToHtml('Wave 3|Score 1200')).toBe('<span>Wave <b>3</b></span><span>Score <b>1200</b></span>');
    expect(infoToHtml('<img onerror=x>|Score 1')).not.toContain('<img');
  });
});

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

const prof = (name: string) => ({ name, tag: { title: 'Rookie', color: '#ff8a1e', emblem: 'chevron' }, look: defaultLook(), loadout: ['rifle', 'pistol'] as WeaponId[] });

describe('net session', () => {
  it('lobby handshake, ready-up and start', () => {
    const h = hub();
    const host = new NetSession(h.make('H'), 'host', 'ABCDE', prof('Host'));
    const cli = new NetSession(h.make('C'), 'client', 'ABCDE', prof('Cli'));
    expect(cli.hostId).toBe('H');
    expect(host.players.size).toBe(2);
    expect(host.allReady).toBe(false);
    cli.setReady(true);
    expect(host.allReady).toBe(true);
    let started: unknown = null;
    cli.events.on('start', (s) => (started = s));
    host.setSettings('sandbox', 'proving', 'realistic');
    expect(cli.mode).toBe('sandbox');
    host.startMatch();
    expect(started).toMatchObject({ mode: 'sandbox', map: 'proving', difficulty: 'realistic' });
  });
  it('late joiners get the running match; leavers are announced', () => {
    const h = hub();
    const host = new NetSession(h.make('H'), 'host', 'ABCDE', prof('Host'));
    host.startMatch();
    const late = new NetSession(h.make('L'), 'client', 'ABCDE', prof('Late'));
    let got = false;
    late.events.on('start', () => (got = true));
    // the late client subscribed after construction: a re-hello (reconnect) triggers the start again
    late.transport.send({ t: 'hello', v: 2, name: 'Late', tag: {}, look: {} });
    expect(got).toBe(true);
    let left = '';
    host.events.on('peerLeft', (p) => (left = p.name));
    void late.leave();
    expect(left).toBe('Late');
  });
  it('clients ignore authority claims from non-hosts and handle the host leaving', async () => {
    const h = hub();
    const host = new NetSession(h.make('H'), 'host', 'ABCDE', prof('Host'));
    const a = new NetSession(h.make('A'), 'client', 'ABCDE', prof('A'));
    const evil = h.make('E');
    evil.send({ t: 'lobby', players: [{ id: 'E', name: 'Evil', host: true }], mode: 'wave', map: 'depot', difficulty: 'easy', phase: 'lobby' });
    expect(a.hostId).toBe('H');
    expect(a.players.has('E')).toBe(false);
    let started = false;
    a.events.on('start', () => (started = true));
    evil.send({ t: 'start', mode: 'wave', map: 'depot', seed: 1, difficulty: 'easy', time: 0 });
    expect(started).toBe(false);
    let gone = false;
    a.events.on('hostLeft', () => (gone = true));
    await host.leave();
    expect(gone).toBe(true);
  });
  it('rooms cap at four players', () => {
    const h = hub();
    const host = new NetSession(h.make('H'), 'host', 'ABCDE', prof('Host'));
    for (const id of ['A', 'B', 'C']) new NetSession(h.make(id), 'client', 'ABCDE', prof(id));
    const fifth = new NetSession(h.make('X'), 'client', 'ABCDE', prof('X'));
    let full = false;
    fifth.events.on('full', () => (full = true));
    fifth.transport.send({ t: 'hello', v: 2, name: 'X', tag: {}, look: {} }, 'H');
    expect(host.players.size).toBe(4);
    expect(full).toBe(true);
  });
});
