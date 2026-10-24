import { emptyKinds } from '../src/ai/enemyDefs';
import type { WeaponId } from '../src/weapons/weaponDefs';
import { describe, expect, it } from 'vitest';
import { makeRoomCode, normalizeRoomCode, parseMessage, CODE_ALPHABET, MAX_ENEMIES, MAX_DOORS, capacity, PROTOCOL_VERSION } from '../src/net/protocol';
import { TickLimiter } from '../src/game/course/courseWire';
import { mulberry } from '../src/core/rng';

const ps = { id: 'peerA', x: 1, y: 0, z: 2, yaw: 0.5, pitch: 0.1, speed: 3, f: 16, w: 'rifle', hp: 80 };

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
  it('carries the weather choice (3.0), unknown values fall back to clear', () => {
    const a = parseMessage({ t: 'start', mode: 'clear', map: 'warehouse', seed: 1, difficulty: 'normal', weather: 'rain' });
    expect(a && a.t === 'start' && a.weather).toBe('rain');
    const b = parseMessage({ t: 'start', mode: 'clear', map: 'warehouse', seed: 1, difficulty: 'normal', weather: 'blizzard' });
    expect(b && b.t === 'start' && b.weather).toBe('clear');
    const c = parseMessage({ t: 'lobby', players: [], mode: 'clear', map: 'warehouse', difficulty: 'normal', phase: 'lobby', weather: 'fog' });
    expect(parseMessage({ t: 'lobby', players: [], mode: 'wave', map: 'warehouse', difficulty: 'normal', phase: 'lobby' })).toBeNull();
    expect(parseMessage({ t: 'start', mode: 'tdm', map: 'warehouse', seed: 1, difficulty: 'normal' })).toBeNull();
    expect(parseMessage({ t: 'team', team: 1 })).toBeNull();
    expect(parseMessage({ t: 'ptd', target: 'peerB', kind: 'drop' })).toBeNull();
    expect(c && c.t === 'lobby' && c.weather).toBe('fog');
  });
  it('clamps numbers to sane ranges', () => {
    const m = parseMessage({ t: 'pstate', s: { ...ps, x: 1e9, hp: 9999, speed: -4, pitch: 9 } });
    expect(m && m.t === 'pstate' && m.s).toMatchObject({ x: 400, hp: 100, speed: 0, pitch: 1.6 });
  });
  it('sanitises strings (names, ids, looks) and caps lengths', () => {
    const m = parseMessage({ t: 'hello', v: PROTOCOL_VERSION, name: '<img src=x onerror=alert(1)>Mallory-the-long-name', tag: { title: '<b>', color: 'red', emblem: 'x' }, look: { hair: 'laser' } });
    expect(m?.t).toBe('hello');
    if (m?.t !== 'hello') return;
    expect(m.name).not.toMatch(/[<>]/);
    expect(m.name.length).toBeLessThanOrEqual(16);
    expect(m.tag.color).toBe('#ff8a1e');
    expect(m.look.hair).toBe(defaultLook().hair);
    expect(parseMessage({ t: 'pstate', s: { ...ps, id: '../../etc' } })).toBeNull();
  });
  it('loadout: known weapons only, no repeats, capped', () => {
    const m = parseMessage({ t: 'hello', v: PROTOCOL_VERSION, name: 'A', tag: {}, look: {}, loadout: ['rifle', 'rifle', 'railgun', 7, 'pistol', 'smg', 'pistolSd', 'sniper', 'pistolSd'] });
    // the deleted guns (G115) are unknown ids now
    expect(m?.t === 'hello' && m.loadout).toEqual(['rifle', 'pistolSd']);
    const n = parseMessage({ t: 'hello', v: PROTOCOL_VERSION, name: 'A', tag: {}, look: {}, loadout: 'rifle' });
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
    const m = parseMessage({ t: 'end', stats: { won: 'yes', score: -5, subtitle: 'x', players: { me: { kills: 1e9, headshots: 3, byKind: { grunt: 5, dragon: 9 }, weaponKills: { rifle: 4, bfg: 99 } } } } });
    expect(m?.t).toBe('end');
    if (m?.t !== 'end') return;
    expect(m.stats.won).toBe(false);
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
    expect(parseMessage({ ...shot, ex: true })).not.toHaveProperty('ex');
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
import { RateLimiter, checkShot, checkBlast, clampEnd, coopSessionStats, maxHitDamage, playersHostile, shotLimiter, rayPointDistance } from '../src/net/validate';
import { NetSession, type StartInfo } from '../src/net/session';
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
    b.push(2, st(1.5));
    expect(b.sample(1.5)!.x).toBeCloseTo(0.75);
    expect(b.sample(0)!.x).toBe(0);
  });
  it('extrapolates a little past the newest state, then holds', () => {
    const b = new SnapshotBuffer<ReturnType<typeof st>>(30, 0.2);
    b.push(1, st(0));
    b.push(2, st(1.5));
    expect(b.sample(2.1)!.x).toBeCloseTo(1.65);
    expect(b.sample(5)!.x).toBeCloseTo(1.8);
  });
  it('snaps a teleport instead of sliding through the points between (T5b2)', () => {
    const b = new SnapshotBuffer<ReturnType<typeof st>>(30, 0.2);
    b.push(1, st(0));
    b.push(1.05, st(0.3));
    b.push(1.1, st(8));
    expect(b.sample(1.025)!.x).toBeCloseTo(0.15);
    expect(b.sample(1.09)!.x).toBeCloseTo(0.3);
    expect(b.sample(1.1)!.x).toBeCloseTo(8);
    expect(b.sample(1.2)!.x).toBeCloseTo(8);
    // a standing partner teleported after a 2 s pause in its states snaps too (slow on paper, a jump in fact)
    b.push(3.1, st(11));
    expect(b.sample(2.5)!.x).toBeCloseTo(8);
    expect(b.sample(3.1)!.x).toBeCloseTo(11);
  });
  it('runs a sprinter on smoothly across a stalled sender, never backwards (T5b2)', () => {
    // 5 m/s (sprint), states every 50 ms, then a 0.45 s stall (0.2 -> 0.65) while the sprinter keeps running
    const b = new SnapshotBuffer<ReturnType<typeof st>>(40, 0.25);
    const times: number[] = [];
    for (let t = 0; t <= 0.2 + 1e-9; t += 0.05) times.push(t);
    for (let t = 0.65; t <= 1 + 1e-9; t += 0.05) times.push(t);
    let next = 0;
    let prev = -Infinity;
    for (let f = 0; f <= 72; f++) {
      const rt = f / 60;
      while (next < times.length && times[next]! <= rt + 1e-9) {
        b.push(times[next]!, st(5 * times[next]!));
        next++;
      }
      const x = b.sample(rt - 0.1)!.x;
      expect(x).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = x;
      // while stalled, extrapolation clamps at 1.0 + 5 * 0.25 = 2.25
      if (rt > 0.55 && rt < 0.65) expect(x).toBeCloseTo(2.25);
    }
    // after the late state (0.65, 3.25) lands, 0.2 s before it interpolates 1.0 + 2.25 * (0.25 / 0.45) = 2.25
    expect(b.sample(0.45)!.x).toBeCloseTo(2.25);
    expect(b.sample(0.65)!.x).toBeCloseTo(3.25);
  });
  it('runs a partner on smoothly round a corner turned during a stall, no hold (T5b2)', () => {
    // 5 m/s along +x, states every 50 ms to t 1.0, then a 0.6 s stall; 0.1 s into it the runner turns 90 degrees to +z
    const p3 = (x: number, z: number) => ({ x, y: 0, z, yaw: 0 });
    const b = new SnapshotBuffer<ReturnType<typeof p3>>(40, 0.2);
    for (let i = 0; i <= 20; i++) b.push(i * 0.05, p3(5 * i * 0.05, 0));
    // at 1.6: x 5 + 0.5, z 5 * 0.5 (3.54 m off the straight-line prediction (8, 0), under sqrt(2) * 5 * 0.6 = 4.24)
    b.push(1.6, p3(5.5, 2.5));
    const mid = b.sample(1.3)!;
    expect(mid.k).toBeCloseTo(0.5);
    expect(mid.x).toBeCloseTo(5.25);
    expect(mid.z).toBeCloseTo(1.25);
    let prevZ = 0;
    for (let t = 1.0; t <= 1.6 + 1e-9; t += 0.05) {
      const z = b.sample(t)!.z;
      expect(z).toBeGreaterThanOrEqual(prevZ - 1e-9);
      prevZ = z;
    }
    // a standing partner teleported the same way after the same stall still snaps
    const s = new SnapshotBuffer<ReturnType<typeof p3>>(40, 0.2);
    s.push(0.95, p3(5, 0));
    s.push(1, p3(5, 0));
    s.push(1.6, p3(5.5, 2.5));
    expect(s.sample(1.3)!.z).toBe(0);
    expect(s.sample(1.6)!.z).toBeCloseTo(2.5);
  });
  it('interpolates a fast run (2.5 m over 0.15 s) instead of snapping it (T5b2)', () => {
    const b = new SnapshotBuffer<ReturnType<typeof st>>(30, 0.2);
    b.push(1, st(0));
    b.push(1.15, st(2.5));
    expect(b.sample(1.075)!.x).toBeCloseTo(1.25);
    expect(b.sample(1.03)!.x).toBeCloseTo(0.5);
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
    const def = WEAPONS.rifle;
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
    expect(maxHitDamage(WEAPONS.rifle, true)).toBeGreaterThan(maxHitDamage(WEAPONS.rifle, false));
    expect(maxHitDamage(WEAPONS.pistolSd, false)).toBeLessThan(200);
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
        score: 1e7,
        players: { me: { kills: 500, headshots: 900, byKind: { ...emptyKinds(), grunt: 400, runner: 400, heavy: 400 }, weaponKills: { rifle: 400, pistolSd: 400 } } },
      },
      60,
    );
    const me = end.players.me!;
    expect(me.kills).toBeLessThanOrEqual(92);
    expect(me.headshots).toBeLessThanOrEqual(me.kills);
    expect(me.byKind.grunt + me.byKind.runner + me.byKind.heavy).toBeLessThanOrEqual(me.kills);
    expect((me.weaponKills.rifle ?? 0) + (me.weaponKills.pistolSd ?? 0)).toBeLessThanOrEqual(me.kills);
    expect(end.score).toBeLessThan(1e7);
    const honest = clampEnd({ won: false, subtitle: '', score: 1500, players: { me: { kills: 9, headshots: 2, byKind: { ...emptyKinds(), grunt: 9, runner: 0, heavy: 0 }, weaponKills: { rifle: 9 } } } }, 120);
    expect(honest.score).toBe(1500);
    expect(honest.players.me!.kills).toBe(9);
  });
  it('rewards use only this player’s line of the host report', () => {
    const s = coopSessionStats(emptyStats('clear', 'depot'), { won: false, subtitle: '', score: 900, players: { a: { kills: 4, headshots: 1, byKind: { ...emptyKinds(), grunt: 4, runner: 0, heavy: 0 }, weaponKills: {} }, b: { kills: 7, headshots: 0, byKind: { ...emptyKinds(), grunt: 7, runner: 0, heavy: 0 }, weaponKills: {} } } }, 'b');
    expect(s.kills).toBe(7);
    expect(s.score).toBe(900);
    expect(coopSessionStats(emptyStats('clear', 'depot'), { won: false, subtitle: '', score: 0, players: {} }, 'zz').kills).toBe(0);
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

const prof = (name: string) => ({ name, tag: { title: 'Rookie', color: '#ff8a1e', emblem: 'chevron' }, look: defaultLook(), loadout: ['rifle', 'pistolSd'] as WeaponId[] });

describe('net session', () => {
  it('lobby handshake, ready-up and start', () => {
    const h = hub();
    const host = new NetSession(h.make('H'), 'host', 'ABCDE', prof('Host'));
    const cli = new NetSession(h.make('C'), 'client', 'ABCDE', prof('Cli'));
    expect(cli.hostId).toBe('H');
    expect(host.players.size).toBe(2);
    expect(host.allReady).toBe(false);
    // a new room defaults to Infiltration, not the parked Hunter (the client hears it in the lobby)
    expect(host.mode).toBe('course');
    expect(cli.mode).toBe('course');
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
    late.transport.send({ t: 'hello', v: PROTOCOL_VERSION, name: 'Late', tag: {}, look: {} });
    expect(got).toBe(true);
    // (marlow-bays R2) a leaver mid-match is held (away), not gone
    let left = '';
    host.events.on('away', (p) => (left = p.name));
    void late.leave();
    expect(left).toBe('Late');
    expect(host.players.get('L')?.away).toBe(true);
  });
  it("(step 13) a client's door crack request reaches the host's game", () => {
    const h = hub();
    const host = new NetSession(h.make('H'), 'host', 'ABCDE', prof('Host'));
    const cli = new NetSession(h.make('C'), 'client', 'ABCDE', prof('Cli'));
    host.startMatch();
    const got: unknown[] = [];
    host.events.on('game', (e) => got.push(e.msg));
    cli.toHost({ t: 'door', i: 0, crack: true });
    expect(got).toEqual([{ t: 'door', i: 0, crack: true }]);
  });
  it('a peer one protocol version behind is refused; the current version joins', () => {
    const h = hub();
    const host = new NetSession(h.make('H'), 'host', 'ABCDE', prof('Host'));
    const old = h.make('O');
    old.send({ t: 'hello', v: PROTOCOL_VERSION - 1, name: 'Old', tag: {}, look: {} }, 'H');
    expect(host.players.has('O')).toBe(false);
    old.send({ t: 'hello', v: PROTOCOL_VERSION, name: 'New', tag: {}, look: {} }, 'H');
    expect(host.players.has('O')).toBe(true);
  });
  it("(LR16a, one light model) the start message carries no lamp falloff; an old peer's lf is dropped", () => {
    const h = hub();
    const host = new NetSession(h.make('H'), 'host', 'ABCDE', prof('Host'));
    const cli = new NetSession(h.make('C'), 'client', 'ABCDE', prof('Cli'));
    let started = null as StartInfo | null;
    cli.events.on('start', (s) => (started = s));
    host.startMatch();
    expect(started).not.toBeNull();
    expect('lampFalloff' in started!).toBe(false);
    const msg = parseMessage({ t: 'start', mode: 'clear', map: 'warehouse', seed: 1, difficulty: 'normal', lf: 'linear' });
    expect(msg).not.toBeNull();
    expect('lf' in msg!).toBe(false);
  });
  it('clients ignore authority claims from non-hosts and handle the host leaving', async () => {
    const h = hub();
    const host = new NetSession(h.make('H'), 'host', 'ABCDE', prof('Host'));
    const a = new NetSession(h.make('A'), 'client', 'ABCDE', prof('A'));
    const evil = h.make('E');
    evil.send({ t: 'lobby', players: [{ id: 'E', name: 'Evil', host: true }], mode: 'clear', map: 'depot', difficulty: 'easy', phase: 'lobby' });
    expect(a.hostId).toBe('H');
    expect(a.players.has('E')).toBe(false);
    let started = false;
    a.events.on('start', () => (started = true));
    evil.send({ t: 'start', mode: 'clear', map: 'depot', seed: 1, difficulty: 'easy', time: 0 });
    expect(started).toBe(false);
    let gone = false;
    a.events.on('hostLeft', () => (gone = true));
    await host.leave();
    expect(gone).toBe(true);
  });
  it('rooms cap at four players', () => {
    const h = hub();
    const host = new NetSession(h.make('H'), 'host', 'ABCDE', prof('Host'));
    // (a new room is the two-player campaign since sector-ops; the cap of four is the parked modes')
    host.setSettings('infiltration', 'warehouse', 'normal');
    for (const id of ['A', 'B', 'C']) new NetSession(h.make(id), 'client', 'ABCDE', prof(id));
    const fifth = new NetSession(h.make('X'), 'client', 'ABCDE', prof('X'));
    let full = false;
    fifth.events.on('full', () => (full = true));
    fifth.transport.send({ t: 'hello', v: PROTOCOL_VERSION, name: 'X', tag: {}, look: {} }, 'H');
    expect(host.players.size).toBe(4);
    expect(full).toBe(true);
  });
});

describe('pstate movement state (3.2.0)', () => {
  it('carries a sanitised move state; drops a bad one but keeps the message', () => {
    const mv = { m: 5, a: 2, s: 1.5, sub: 5, ph: 1, tid: '', g: 4, r: 0, ay: 0 };
    const m = parseMessage({ t: 'pstate', s: { ...ps, mv } });
    expect(m && m.t === 'pstate' && m.s.mv).toMatchObject({ m: 'ledge', a: 2, s: 1.5 });
    const bad = parseMessage({ t: 'pstate', s: { ...ps, mv: { m: 200 } } });
    expect(bad && bad.t === 'pstate' && bad.s.mv).toBeUndefined();
    const noAnchor = parseMessage({ t: 'pstate', s: { ...ps, mv: { m: 'ladder', a: -1 } } });
    expect(noAnchor && noAnchor.t === 'pstate' && noAnchor.s.mv).toBeUndefined();
  });
});

import { clientStepNoise, MAX_FREE_SPEED } from '../src/net/validate';
import { noiseRadius } from '../src/player/movement';
import { NOISE_QUIET } from '../src/config/movement';
import { PF } from '../src/net/protocol';

describe('guard-ai S26 fix: the client step noise on the host (its own sent speed and stance)', () => {
  const G = PF.grounded;
  const st = (speed: number, f: number, m?: string) =>
    ({ ...ps, speed, f, ...(m ? { mv: { ...emptyMoveState(), m } } : {}) }) as unknown as Parameters<typeof clientStepNoise>[0];
  it('a crouch-walk is never heard (G40 silent band), crouched, wall slide or a crouched traversal run', () => {
    for (let i = 0; i <= 40; i++) {
      const v = (NOISE_QUIET.crouch * i) / 40;
      expect(clientStepNoise(st(v, G | PF.crouch), true), `crouch ${v}`).toBe(0);
      expect(clientStepNoise(st(v, G | PF.driven), true), `driven ${v}`).toBe(0);
      expect(clientStepNoise(st(v, G, 'wall'), true), `wall ${v}`).toBe(0);
    }
    for (let i = 0; i <= 40; i++) expect(clientStepNoise(st((NOISE_QUIET.stand * i) / 40, G), true), `walk ${i}`).toBe(0);
  });
  it('the host player rule: noiseRadius(speed, crouched) on the same speed and stance', () => {
    for (let v = 0; v <= MAX_FREE_SPEED; v += 0.25) {
      expect(clientStepNoise(st(v, G), true)).toBe(noiseRadius(v, false));
      expect(clientStepNoise(st(v, G | PF.crouch), true)).toBe(noiseRadius(v, true));
      // (steps 'crouched': a traversal-driven move that is not silent) and a back-to-wall slide: the crouch band
      expect(clientStepNoise(st(v, G | PF.driven), true)).toBe(noiseRadius(v, true));
      expect(clientStepNoise(st(v, G, 'wall'), true)).toBe(noiseRadius(v, true));
    }
    expect(clientStepNoise(st(5, G), true)).toBeGreaterThan(6);
  });
  it('silent steps, in the air, or a state that jumped (teleport / respawn / send-back): no step at any speed', () => {
    expect(clientStepNoise(st(6, G | PF.silent), true)).toBe(0);
    expect(clientStepNoise(st(6, G | PF.driven | PF.silent), true)).toBe(0);
    expect(clientStepNoise(st(6, 0), true)).toBe(0);
    expect(clientStepNoise(st(6, G), false)).toBe(0);
  });
  it('reads the wire speed (sanitised 0..20), capped at the old bound', () => {
    const m = parseMessage({ t: 'pstate', s: { ...ps, speed: 20, f: G } });
    expect(m && m.t === 'pstate' && clientStepNoise(m.s, true)).toBe(noiseRadius(MAX_FREE_SPEED, false));
    const crouchWalk = parseMessage({ t: 'pstate', s: { ...ps, speed: NOISE_QUIET.crouch, f: G | PF.crouch } });
    expect(crouchWalk && crouchWalk.t === 'pstate' && clientStepNoise(crouchWalk.s, true)).toBe(0);
  });
});

describe('team moves (3.2.0 phase 5)', () => {
  it('tmove: boost / ladder / end, a valid partner id, clamped numbers', () => {
    expect(parseMessage({ t: 'tmove', kind: 'boost', partner: 'peerB', target: 12, s: 1.5, gy: 4.2 })).toEqual({ t: 'tmove', kind: 'boost', partner: 'peerB', target: 12, s: 1.5, gy: 4.2 });
    expect(parseMessage({ t: 'tmove', kind: 'end', partner: '', target: -1, s: 0, gy: 0 })).not.toBeNull();
    expect(parseMessage({ t: 'tmove', kind: 'fly', partner: 'peerB' })).toBeNull();
    // (CT prototype B4, protocol 19) the partner throw: the request carries the landing, the start echoes it
    expect(parseMessage({ t: 'tmove', kind: 'throw', partner: 'peerB', target: -1, s: 0, gy: 0.1, lx: 80, lz: 7 })).toEqual({ t: 'tmove', kind: 'throw', partner: 'peerB', target: -1, s: 0, gy: 0.1, lx: 80, lz: 7 });
    expect(parseMessage({ t: 'tmove', kind: 'throw', partner: 'peerB', target: -1, s: 0, gy: 0 })).toBeNull();
    expect(parseMessage({ t: 'tstart', kind: 'throw', a: 'peerA', b: 'peerB', target: -1, s: 0, t0: 3, l: [80, 0.1, 7] })).toMatchObject({ kind: 'throw', l: [80, 0.1, 7] });
    expect(parseMessage({ t: 'tstart', kind: 'throw', a: 'peerA', b: 'peerB', target: -1, s: 0, t0: 3 })).toBeNull();
    // (CT prototype B5, protocol 20) the hang-down: the request carries the hang point, the start echoes it; the end says pull / drop
    expect(parseMessage({ t: 'tmove', kind: 'hang', partner: 'peerB', target: -1, s: 0, gy: 4.4, lx: 102, lz: 1.2 })).toMatchObject({ kind: 'hang', lx: 102, lz: 1.2, gy: 4.4 });
    expect(parseMessage({ t: 'tmove', kind: 'hang', partner: 'peerB', target: -1, s: 0, gy: 4.4 })).toBeNull();
    expect(parseMessage({ t: 'tstart', kind: 'hang', a: 'peerA', b: 'peerB', target: -1, s: 0, t0: 3, l: [102, 4.4, 1.2] })).toMatchObject({ kind: 'hang', l: [102, 4.4, 1.2] });
    // (CT prototype B7, protocol 22) the two-person rope: the request carries the rope foot, the start echoes it
    expect(parseMessage({ t: 'tmove', kind: 'rope', partner: 'peerB', target: -1, s: 0, gy: 4.4, lx: 140, lz: 7 })).toMatchObject({ kind: 'rope', lx: 140, lz: 7, gy: 4.4 });
    expect(parseMessage({ t: 'tmove', kind: 'rope', partner: 'peerB', target: -1, s: 0, gy: 4.4 })).toBeNull();
    expect(parseMessage({ t: 'tstart', kind: 'rope', a: 'peerA', b: 'peerB', target: -1, s: 0, t0: 3, l: [140, 4.4, 7] })).toMatchObject({ kind: 'rope', l: [140, 4.4, 7] });
    expect(parseMessage({ t: 'tmove', kind: 'hangEnd', partner: '', target: 1, s: 0, gy: 0 })).toMatchObject({ kind: 'hangEnd', target: 1 });
    expect(parseMessage({ t: 'tend', a: 'peerA', b: 'peerB', k: 'drop' })).toEqual({ t: 'tend', a: 'peerA', b: 'peerB', k: 'drop' });
    expect(parseMessage({ t: 'tend', a: 'peerA', b: 'peerB', k: 'fly' })).toEqual({ t: 'tend', a: 'peerA', b: 'peerB' });
    expect(parseMessage({ t: 'tmove', kind: 'boost', partner: '../x' })).toBeNull();
    const big = parseMessage({ t: 'tmove', kind: 'ladder', partner: 'peerB', target: 1e9, s: 1e9, gy: 1e9 });
    expect(big && big.t === 'tmove' && big.target <= 1e5 && Math.abs(big.s) <= 500 && big.gy <= 200).toBe(true);
  });
  it('tstart / tdeny / tend need valid player ids', () => {
    expect(parseMessage({ t: 'tstart', kind: 'ladder', a: 'peerA', b: 'peerB', target: -1, s: 0, t0: 3 })).toEqual({ t: 'tstart', kind: 'ladder', a: 'peerA', b: 'peerB', target: -1, s: 0, t0: 3 });
    expect(parseMessage({ t: 'tstart', kind: 'boost', a: 'peerA' })).toBeNull();
    expect(parseMessage({ t: 'tdeny', a: 'peerA', reason: 'notBraced' })).toEqual({ t: 'tdeny', a: 'peerA', reason: 'notBraced' });
    expect(parseMessage({ t: 'tend', a: 'peerA', b: 'peerB' })).toEqual({ t: 'tend', a: 'peerA', b: 'peerB' });
    expect(parseMessage({ t: 'tend', a: 'peerA' })).toBeNull();
  });
});

import { clientForcedHolster, hostDrawPhase, hostShotAllowed, hostShotWeapon, hostWeapon } from '../src/net/validate';
import { DrawState, DRAW_TIME_PRIMARY } from '../src/weapons/drawState';
import { MOVE_MODES, dropBadWallMove, packMoveState, sanitizeMoveState, emptyMoveState, poseFromMoveState, emptyMovePose } from '../src/player/moveState';
import { strikeWarp } from '../src/anim/strikeBody';

describe('step 09: host-authoritative drawn state (D8)', () => {
  it('(step 11) wall packs and sanitizes: `a` a segment in range, `sub` a u8', () => {
    const mv = { ...emptyMoveState(), m: 'wall' as const, a: 3, s: 2.25, sub: 1 | 2 | 64, ph: 1 };
    const wire = JSON.parse(JSON.stringify(packMoveState(mv)));
    expect(wire.m).toBe(1);
    expect(sanitizeMoveState(wire, 4096, 10)).toMatchObject({ m: 'wall', a: 3, s: 2.25, sub: 67 });
    expect(sanitizeMoveState({ ...wire, a: 10 }, 4096, 10)).toBeNull();
    expect(sanitizeMoveState({ ...wire, a: -1 }, 4096, 10)).toBeNull();
    expect(sanitizeMoveState({ ...wire, a: 'x' }, 4096, 10)).toBeNull();
    expect(sanitizeMoveState({ ...wire, sub: 0x1ff })!.sub).toBe(0xff);
    expect(sanitizeMoveState({ ...wire, sub: -3 })!.sub).toBe(0);
    // an attached anchor bound does not apply to a wall segment
    expect(sanitizeMoveState(wire, 1, 10)!.a).toBe(3);
  });
  it('(step 11 r3) the receive path drops a wall `a` outside the level (the wire keeps anything under 4096)', () => {
    const mv = packMoveState({ ...emptyMoveState(), m: 'wall' as const, a: 40, s: 1, sub: 1 });
    const ps = { id: 'peerA', x: 0, y: 0, z: 0, yaw: 0, pitch: 0, speed: 0, f: 0, w: 'pistolSd', hp: 100, mv };
    const msg = parseMessage({ t: 'pstate', s: ps });
    const s = msg?.t === 'pstate' ? msg.s : null;
    expect(s?.mv).toMatchObject({ m: 'wall', a: 40 });
    // a level with 12 segments: dropped (posed as ground), not kept with a stale face
    expect(dropBadWallMove(s!, 12)).toBe(true);
    expect(s!.mv).toBeUndefined();
    // in range: kept; other modes: untouched
    const ok = { mv: { ...emptyMoveState(), m: 'wall' as const, a: 11 } };
    expect(dropBadWallMove(ok, 12)).toBe(false);
    expect(ok.mv.a).toBe(11);
    const gr = { mv: { ...emptyMoveState(), a: 99 } };
    expect(dropBadWallMove(gr, 12)).toBe(false);
    expect(gr.mv).toBeDefined();
    expect(dropBadWallMove({}, 12)).toBe(false);
  });
  it('dw packs and sanitizes (clamped 0-3, default 0)', () => {
    const mv = { ...emptyMoveState(), dw: 2 };
    expect(packMoveState(mv).dw).toBe(2);
    expect(sanitizeMoveState(packMoveState(mv))!.dw).toBe(2);
    expect(sanitizeMoveState({ m: 0, dw: 9 })!.dw).toBe(3);
    expect(sanitizeMoveState({ m: 0, dw: -4 })!.dw).toBe(0);
    expect(sanitizeMoveState({ m: 0, dw: 'x' })!.dw).toBe(0);
    expect(sanitizeMoveState({ m: 0 })!.dw).toBe(0);
    expect(sanitizeMoveState({ m: 0, dw: 1.4 })!.dw).toBe(1);
    expect(poseFromMoveState({ ...emptyMoveState(), dw: 2 }, 1, emptyMovePose()).drawn).toBe(true);
    expect(poseFromMoveState({ ...emptyMoveState(), dw: 0 }, 1, emptyMovePose()).drawn).toBe(false);
  });
  it('a literal pstate with an off-loadout weapon keeps the last valid id', () => {
    const lobby: WeaponId[] = ['pistolSd'];
    const first = parseMessage({ t: 'pstate', s: { id: 'c1', x: 0, y: 0, z: 0, yaw: 0, pitch: 0, speed: 0, f: 0, w: 'pistolSd', hp: 100, mv: { m: 0, a: -1, s: 0, sub: 0, ph: 0, tid: '', g: 3, r: 0, ay: 0, dw: 2 } } });
    expect(first?.t).toBe('pstate');
    if (first?.t !== 'pstate') return;
    let last = hostWeapon(first.s.w, lobby, null);
    expect(last).toBe('pistolSd');
    const off = parseMessage({ t: 'pstate', s: { id: 'c1', x: 0, y: 0, z: 0, yaw: 0, pitch: 0, speed: 0, f: 0, w: 'rifle', hp: 100 } });
    if (off?.t !== 'pstate') throw new Error('pstate expected');
    last = hostWeapon(off.s.w, lobby, last);
    expect(last).toBe('pistolSd');
    expect(hostWeapon('rifle' as WeaponId, lobby, null)).toBe('pistolSd');
    expect(first.s.mv?.dw).toBe(2);
  });
  it('the host forces holstered while hands are busy or downed', () => {
    const g = { ...emptyMoveState(), dw: 2 };
    expect(hostDrawPhase(g, false)).toBe(2);
    expect(hostDrawPhase(g, true)).toBe(0);
    expect(hostDrawPhase({ ...g, m: 'ladder', a: 0 }, false)).toBe(0);
    expect(hostDrawPhase({ ...g, m: 'takedown' }, false)).toBe(0);
    expect(hostDrawPhase({ ...g, m: 'brace' }, false)).toBe(0);
    expect(hostDrawPhase({ ...g, m: 'stacked', sub: 2 }, false)).toBe(0);
    expect(hostDrawPhase({ ...g, m: 'stacked', sub: 1 }, false)).toBe(2);
    expect(hostDrawPhase({ ...g, m: 'split', a: 0 }, false)).toBe(2);
    expect(hostDrawPhase({ ...g, m: 'grab' }, false)).toBe(2);
    expect(hostDrawPhase(undefined, false)).toBe(0);
  });
  it('the host refuses a shot unless drawn', () => {
    expect(hostShotAllowed(0)).toBe(false);
    expect(hostShotAllowed(1)).toBe(false);
    expect(hostShotAllowed(3)).toBe(false);
    expect(hostShotAllowed(undefined)).toBe(false);
    expect(hostShotAllowed(2)).toBe(true);
  });
  it('fix 3: a shot counts only with the held weapon or one from the lobby loadout', () => {
    const lobby: WeaponId[] = ['pistolSd'];
    expect(hostShotWeapon('pistolSd' as WeaponId, 'pistolSd', lobby)).toBe(true);
    expect(hostShotWeapon('pistolSd' as WeaponId, 'rifle', lobby)).toBe(true);
    expect(hostShotWeapon('rifle' as WeaponId, 'pistolSd', lobby)).toBe(false);
    expect(hostShotWeapon('rifle' as WeaponId, undefined, lobby)).toBe(false);
    // no lobby loadout sent: only the weapon the host holds for it (hostWeapon kept the claim)
    expect(hostShotWeapon('rifle' as WeaponId, 'rifle', [])).toBe(true);
    expect(hostShotWeapon('rifle' as WeaponId, 'pistolSd', [])).toBe(false);
    expect(hostShotWeapon('rifle' as WeaponId, undefined, [])).toBe(false);
  });
  it('fix 2: with >= 300 ms injected delay a legitimate draw is never cancelled', () => {
    for (const delay of [0.3, 0.45, 0.8]) {
      const dt = 1 / 60;
      const draw = new DrawState();
      const sent: { t: number; dw: number }[] = [];
      let sendT = 0;
      let forced = 0;
      let echoed = 0;
      for (let i = 0; i < 180; i++) {
        const t = i * dt;
        const aim = t >= 0.1 && t < 2.2;
        draw.update(dt, aim, DRAW_TIME_PRIMARY);
        const mv = { ...emptyMoveState(), dw: draw.phase };
        sendT -= dt;
        if (sendT <= 0) {
          sendT = 1 / 20;
          sent.push({ t, dw: hostDrawPhase(mv, false) });
        }
        // the host's echo of this client is what it saw `delay` seconds ago (holstered before any pstate)
        while (sent.length && sent[0]!.t <= t - delay) echoed = sent.shift()!.dw;
        if (clientForcedHolster(echoed, draw.phase, mv, false)) forced++;
      }
      expect(forced).toBe(0);
    }
    // a real force: the host sees this client downed, or its own mode says the hands are busy
    const g = { ...emptyMoveState(), dw: 2 };
    expect(clientForcedHolster(0, 2, g, true)).toBe(true);
    expect(clientForcedHolster(0, 2, { ...g, m: 'takedown' }, false)).toBe(true);
    expect(clientForcedHolster(0, 2, g, false)).toBe(false);
    expect(clientForcedHolster(0, 0, g, true)).toBe(false);
    expect(clientForcedHolster(2, 2, g, true)).toBe(false);
  });
});

describe('step 10: committed-move messages (A5, PLAN H3)', () => {
  it('parses cmove / cstart / cdeny', () => {
    expect(parseMessage({ t: 'cmove', kind: 'strike', id: 7, target: 'e12' })).toEqual({ t: 'cmove', kind: 'strike', id: 7, target: 'e12' });
    // the carried medkit is gone (G98)
    expect(parseMessage({ t: 'cmove', kind: 'medkit', id: 1, target: '' })).toBeNull();
    expect(parseMessage({ t: 'cstart', kind: 'strike', a: 'peerA', id: 3, target: '', t0: 12.5 })).toEqual({ t: 'cstart', kind: 'strike', a: 'peerA', id: 3, target: '', t0: 12.5 });
    expect(parseMessage({ t: 'cdeny', a: 'peerA', id: 3, kind: 'strike', reason: 'busy' })).toEqual({ t: 'cdeny', a: 'peerA', id: 3, kind: 'strike', reason: 'busy' });
    expect(parseMessage({ t: 'cdeny', a: 'peerA', id: 3, kind: 'strike', reason: 'hit' })).toMatchObject({ reason: 'hit' });
  });
  it('clamps ids and rejects bad fields', () => {
    expect(parseMessage({ t: 'cmove', kind: 'strike', id: 1e9, target: '' })).toMatchObject({ id: 0xffff });
    expect(parseMessage({ t: 'cmove', kind: 'strike', id: 2.7, target: '' })).toMatchObject({ id: 2 });
    expect(parseMessage({ t: 'cmove', kind: 'strike', id: 'x', target: '' })).toBeNull();
    expect(parseMessage({ t: 'cmove', kind: 'strike', id: 1, target: '<bad>' })).toBeNull();
    expect(parseMessage({ t: 'cstart', kind: 'strike', a: 'bad id!', id: 1, target: '', t0: 1 })).toBeNull();
    expect(parseMessage({ t: 'cdeny', a: 'peerA', id: 1, kind: 'strike', reason: 'because' })).toBeNull();
  });
  it('unknown and reserved kinds are rejected', () => {
    for (const kind of ['nope', 'takedown', 'grab', 'drag', 'splitBoost', 'backToBack', 'pullUp', 'rappelAnchor', 'clutch']) {
      expect(parseMessage({ t: 'cmove', kind, id: 1, target: '' })).toBeNull();
      expect(parseMessage({ t: 'cstart', kind, a: 'peerA', id: 1, target: '', t0: 1 })).toBeNull();
      expect(parseMessage({ t: 'cdeny', a: 'peerA', id: 1, kind, reason: 'busy' })).toBeNull();
    }
  });
  it('t0 must be a finite host time in range', () => {
    for (const t0 of [-1, 1e8, NaN, Infinity, '3', undefined]) expect(parseMessage({ t: 'cstart', kind: 'strike', a: 'peerA', id: 1, target: '', t0 })).toBeNull();
    expect(parseMessage({ t: 'cstart', kind: 'strike', a: 'peerA', id: 1, target: '', t0: 0 })).toMatchObject({ t0: 0 });
  });
  it('MoveState strike is mode 25 and poses the elbow arc', () => {
    const mv = { ...emptyMoveState(), m: 'strike' as const, ph: 0.4, tid: 'e3', dw: 2 };
    const w = packMoveState(mv);
    expect(w.m).toBe(25);
    const back = sanitizeMoveState(w)!;
    expect(back.m).toBe('strike');
    expect(back.tid).toBe('e3');
    const pose = poseFromMoveState(back, 0, emptyMovePose());
    expect(pose.melee).toBeCloseTo(strikeWarp(0.4)); // (anim-n4c M1) the strike's phase posed warped onto the hit
    expect(pose.drawn).toBe(false);
  });
});

describe('A3: the wall wire after the SWAT turn and the lean-out are gone (protocol 15)', () => {
  it('the lean kind is not carried: lk is dropped on the way in and never packed', () => {
    const mv = { ...emptyMoveState(), m: 'wall' as const, a: 2, s: 1, sub: 8 | 64 };
    const w = JSON.parse(JSON.stringify(packMoveState(mv))) as Record<string, unknown>;
    expect('lk' in w).toBe(false);
    expect((sanitizeMoveState({ m: 1, a: 2, lk: 1 }, 4096, 8) as unknown as Record<string, unknown>).lk).toBeUndefined();
  });
  it('swat is not a mode any more: it is not in MOVE_MODES and its old index is the next mode', () => {
    expect((MOVE_MODES as readonly string[]).includes('swat')).toBe(false);
    expect(sanitizeMoveState({ m: 26, a: 0 }, 4096, 4096, 10)!.m).toBe('doorPeek');
  });
  it('the peek bit poses the rig lean toward the edge side; the old lean bit (32) poses nothing', () => {
    const p = poseFromMoveState({ ...emptyMoveState(), m: 'wall', a: 0, sub: 16 | 4 }, 0, emptyMovePose());
    // (G6, AUDIT-WALLS row 9, 052021: CT leans 10-15 deg) the owner's WALL.peekLean 0.45 -> 0.2
    expect(p.lean).toBeCloseTo(-0.2, 6);
    const q = poseFromMoveState({ ...emptyMoveState(), m: 'wall', a: 0, sub: 32 | 8, r: 1 }, 0, emptyMovePose());
    expect(q.lean).toBe(0);
  });
  it('leftHand (128) and low (64) round-trip on a wall state', async () => {
    const mv = { ...emptyMoveState(), m: 'wall' as const, a: 2, s: 1, sub: 1 | 4 | 16 | 64 | 128 };
    const back = sanitizeMoveState(JSON.parse(JSON.stringify(packMoveState(mv))), 4096, 8)!;
    expect(back.sub).toBe(1 | 4 | 16 | 64 | 128);
  });
  it('poseFromMoveState: leftHand only with the left edge bit', () => {
    expect(poseFromMoveState({ ...emptyMoveState(), m: 'wall', a: 0, sub: 4 | 16 | 128 }, 0, emptyMovePose()).leftHand).toBe(true);
    expect(poseFromMoveState({ ...emptyMoveState(), m: 'wall', a: 0, sub: 8 | 128 }, 0, emptyMovePose()).leftHand).toBe(false);
    expect(poseFromMoveState({ ...emptyMoveState(), m: 'ladder', a: 0, sub: 4 | 128 }, 0, emptyMovePose()).leftHand).toBe(false);
  });
  it('posed head sample (light parity): local and remote light samples land on the posed head', async () => {
    const { posedHeadSample } = await import('../src/player/wallController');
    const feet = { x: 2, y: 0.5, z: -1 };
    const local = posedHeadSample(feet.x, feet.y, feet.z, 2.3, feet.y + 0.941, -0.9, { ox: 0, oz: 0, h: 0 });
    const remote = posedHeadSample(feet.x, feet.y, feet.z, 2.31, feet.y + 0.953, -0.9, { ox: 0, oz: 0, h: 0 });
    expect(feet.y + local.h * 0.95).toBeCloseTo(feet.y + 0.941, 9);
    expect(feet.y + remote.h * 0.95).toBeCloseTo(feet.y + 0.953, 9);
    expect(local.ox).toBeCloseTo(0.3, 9);
    expect(local.oz).toBeCloseTo(0.1, 9);
    expect(Math.abs(local.h * 0.95 - remote.h * 0.95)).toBeLessThan(0.02);
  });
});

describe('step 13: door peek on the wire', () => {
  it('parses `door` with an index bound and a bool', () => {
    expect(parseMessage({ t: 'door', i: 3, crack: true })).toEqual({ t: 'door', i: 3, crack: true });
    expect(parseMessage({ t: 'door', i: 0, crack: false })).toEqual({ t: 'door', i: 0, crack: false });
    expect(parseMessage({ t: 'door', i: -1, crack: true })).toBeNull();
    expect(parseMessage({ t: 'door', i: MAX_DOORS, crack: true })).toBeNull();
    expect(parseMessage({ t: 'door', i: 1.5, crack: true })).toBeNull();
    expect(parseMessage({ t: 'door', i: 2, crack: 1 })).toBeNull();
    expect(parseMessage({ t: 'door', i: '2', crack: true })).toBeNull();
  });
  it('bounds the snapshot `dcr` list: out-of-range entries dropped (never clamped to door 0), duplicates, MAX_DOORS', () => {
    const many = Array.from({ length: 200 }, (_, i) => i);
    const m = parseMessage({ t: 'snap', time: 1, players: [], enemies: [], obj: '', info: '', pk: 0, doors: [], dcr: [2, 2, -1, 'x', 5000, 1.5, 7, ...many] });
    expect(m && m.t === 'snap').toBe(true);
    const dcr = (m as Extract<typeof m, { t: 'snap' }>).dcr!;
    expect(dcr.slice(0, 3)).toEqual([2, 7, 0]);
    const m2 = parseMessage({ t: 'snap', time: 1, players: [], enemies: [], obj: '', info: '', pk: 0, doors: [], dcr: [-1, 4096] });
    expect((m2 as Extract<typeof m2, { t: 'snap' }>).dcr).toEqual([]);
    expect(dcr.length).toBeLessThanOrEqual(MAX_DOORS);
    expect(new Set(dcr).size).toBe(dcr.length);
  });
});

describe('difficulty on the wire (G106: fixed levels, no custom sliders)', () => {
  it('lobby / start carry a level only; an old custom reads Normal and its dc is dropped', () => {
    const s = parseMessage({ t: 'start', mode: 'clear', map: 'warehouse', seed: 1, difficulty: 'realistic' });
    expect(s).toMatchObject({ difficulty: 'realistic' });
    const old = parseMessage({ t: 'start', mode: 'clear', map: 'warehouse', seed: 1, difficulty: 'custom', dc: { b: 'rookie', p: 0.1, a: 1.3, t: 5 } });
    expect(old).toMatchObject({ difficulty: 'normal' });
    expect('dc' in (old as object)).toBe(false);
    const l = parseMessage({ t: 'lobby', players: [], mode: 'clear', map: 'warehouse', difficulty: 'custom', phase: 'lobby', dc: { b: 'normal', p: 0.5, a: 1, t: 2 } });
    expect(l).toMatchObject({ difficulty: 'normal' });
    expect('dc' in (l as object)).toBe(false);
  });

  it('a non-custom lobby / start ignores dc', () => {
    const l = parseMessage({ t: 'lobby', players: [], mode: 'clear', map: 'warehouse', difficulty: 'realistic', phase: 'lobby', dc: { b: 'normal', p: 0.5, a: 1, t: 2 } });
    expect(l).toMatchObject({ difficulty: 'realistic' });
    expect((l as { dc?: unknown }).dc).toBeUndefined();
    const s = parseMessage({ t: 'start', mode: 'clear', map: 'warehouse', seed: 1, difficulty: 'normal', dc: { b: 'normal', p: 0.5, a: 1, t: 2 } });
    expect((s as { dc?: unknown }).dc).toBeUndefined();
  });
});

describe('course messages (T1b)', () => {
  it('parses a course message with clamps and caps', () => {
    const m = parseMessage({
      t: 'course',
      s: { bay: 99, done: [true, 1], cp: 'A1<x>', clock: 5, over: false, air: [{ phase: 'bogus', t: 900 }], gates: [{ open: true, t: -4, holders: 9, ta: 1, tb: -1, pa: 0, pb: 5 }], flags: ['key'], flagBay: [['key', 1], [3, 1]], groupsOff: ['mains'], ticks: [[1, 200]], stats: [{ time: 2 }], locks: ['d0'], anchors: [] },
      locks: [0, 3, 500, 'x'],
      anchors: [12],
      lights: { groups: [[7, false], [8, 'on']], dead: [4] },
    });
    expect(m).toMatchObject({ t: 'course', locks: [0, 3, MAX_DOORS - 1], anchors: [12], lights: { groups: [[7, false]], dead: [4] } });
    if (m?.t !== 'course') throw new Error('not course');
    expect(m.s.bay).toBe(64);
    expect(m.s.done).toEqual([true, false]);
    expect(m.s.cp).toBe('A1x');
    expect(m.s.air[0]).toEqual({ phase: 'open', t: 60 });
    expect(m.s.gates[0]).toMatchObject({ open: true, t: 0, holders: 3, pb: 1 });
    expect(m.s.flagBay).toEqual([['key', 1]]);
    expect(m.s.ticks[0]).toEqual([1, 99]);
    expect(m.s.stats[0]).toMatchObject({ time: 2, kills: 0 });
    expect(m.ref).toBe('');
    expect(m.rn).toBe(0);
    expect(parseMessage({ t: 'course', s: 1, lights: {} })).toBeNull();
  });
  it('carries the client refusal (text cleaned and capped, counter clamped)', () => {
    const m = parseMessage({ t: 'course', s: {}, lights: {}, locks: [], anchors: [], ref: '<b>Bring your partner</b>' + 'x'.repeat(300), rn: -5 });
    if (m?.t !== 'course') throw new Error('not course');
    expect(m.ref.startsWith('bBring your partner/b')).toBe(true);
    expect(m.ref.length).toBeLessThanOrEqual(160);
    expect(m.rn).toBe(0);
  });
  it("carries LANTERN's radio line (cleaned and capped) and the takedown kind", () => {
    const m = parseMessage({ t: 'course', s: {}, lights: {}, locks: [], anchors: [], ref: '', rn: 0, rl: 'LANTERN: <i>Mind the gap</i>' + 'x'.repeat(300), rln: 3.4 });
    if (m?.t !== 'course') throw new Error('not course');
    expect(m.rl?.startsWith('LANTERN: iMind the gap/i')).toBe(true);
    expect(m.rl?.length).toBeLessThanOrEqual(160);
    expect(m.rln).toBe(3);
    expect(parseMessage({ t: 'td', target: 'e1', ph: 'done', lethal: false, kind: 'grab' })).toEqual({ t: 'td', target: 'e1', ph: 'done', lethal: false, kind: 'grab' });
    expect(parseMessage({ t: 'td', target: 'e1', ph: 'done', lethal: false, kind: '<x>' })).toEqual({ t: 'td', target: 'e1', ph: 'done', lethal: false });
  });
  it('friendly fire (D38): course partners hurt each other, never themselves; co-op never', () => {
    expect(playersHostile(true, 'a', 'b')).toBe(true);
    expect(playersHostile(true, 'a', 'a')).toBe(false);
    expect(playersHostile(false, 'a', 'b')).toBe(false);
  });
  it('parses ctick for client-only verbs only', () => {
    expect(parseMessage({ t: 'ctick', verb: 'gear' })).toEqual({ t: 'ctick', verb: 'gear' });
    expect(parseMessage({ t: 'ctick', verb: 'takedown' })).toBeNull();
  });
  it('the course takes two players', () => {
    expect(capacity('course')).toBe(2);
  });
  it('the ctick limiter allows 4 a second', () => {
    const l = new TickLimiter();
    let n = 0;
    for (let i = 0; i < 20; i++) if (l.take(i * 0.05)) n++;
    expect(n).toBeLessThanOrEqual(8);
    expect(n).toBeGreaterThanOrEqual(4);
  });
});

describe('coop4 N1: slots on the wire, Sector Ops cap 4 (A1, A19)', () => {
  const lobby = (players: unknown[], mode = 'sector') => parseMessage({ t: 'lobby', players, mode, map: 'campusOps', difficulty: 'normal', phase: 'lobby' });
  const slotsOf = (m: ReturnType<typeof parseMessage>): Record<string, number> => {
    const out: Record<string, number> = {};
    if (m?.t === 'lobby') for (const p of m.players) out[p.id] = p.slot;
    return out;
  };

  it('capacity: Sector Ops 4, the course (Marlow Yard) stays 2, the legacy modes 4', () => {
    expect(capacity('sector')).toBe(4);
    expect(capacity('course')).toBe(2);
    expect(capacity('infiltration')).toBe(4);
    expect(capacity('sandbox')).toBe(4);
  });

  it('a lobby slot clamps to 0..3 and rounds', () => {
    const m = lobby([
      { id: 'H', host: true, slot: 0 },
      { id: 'A', slot: 7 },
      { id: 'B', slot: 1.4 },
      { id: 'C', slot: -2 },
    ]);
    expect(slotsOf(m)).toEqual({ H: 0, A: 3, B: 1, C: 0 });
  });

  it('a missing or junk slot reads the list order (an older host)', () => {
    const m = lobby([{ id: 'H', host: true }, { id: 'A' }, { id: 'B', slot: 'two' }, { id: 'C', slot: null }]);
    expect(slotsOf(m)).toEqual({ H: 0, A: 1, B: 2, C: 3 });
    // a mix: the given slots stay, the missing one takes its list place
    expect(slotsOf(lobby([{ id: 'H', host: true, slot: 0 }, { id: 'A', slot: 3 }, { id: 'B' }]))).toEqual({ H: 0, A: 3, B: 2 });
  });

  it('secWire: j / ch / cd one entry per slot, padded to 2, cut at 4', () => {
    const sec = (n: number) => {
      const j: string[] = [];
      const ch: number[] = [];
      const cd: number[] = [];
      for (let k = 0; k < n; k++) {
        j.push(k % 2 ? `cam-${k}` : '');
        ch.push(k + 0.5);
        cd.push(k);
      }
      const m = parseMessage({ t: 'sector', sec: { ck: [], j, ch, cd, dv: [], al: 0 } });
      return m?.t === 'sector' ? m.sec : undefined;
    };
    expect(sec(1)).toMatchObject({ j: ['', ''], ch: [0.5, 0], cd: [0, 0] });
    expect(sec(2)).toMatchObject({ j: ['', 'cam-1'], ch: [0.5, 1.5], cd: [0, 1] });
    expect(sec(4)).toMatchObject({ j: ['', 'cam-1', '', 'cam-3'], ch: [0.5, 1.5, 2.5, 3.5], cd: [0, 1, 2, 3] });
    const six = sec(6);
    expect(six?.j).toHaveLength(4);
    expect(six?.ch).toHaveLength(4);
    expect(six?.cd).toHaveLength(4);
    // lists of different lengths: the longest decides, the others pad; junk entries read idle, numbers clamp
    const m = parseMessage({ t: 'sector', sec: { ck: [], j: ['a', 5, '../x'], ch: [99], cd: 'no', dv: [], al: 0 } });
    expect(m?.t === 'sector' && m.sec).toMatchObject({ j: ['a', '', ''], ch: [10, 0, 0], cd: [0, 0, 0] });
  });

  it('a full room refusal carries the room mode; an unknown mode is dropped', () => {
    expect(parseMessage({ t: 'bye', reason: 'Room is full', mode: 'sector' })).toEqual({ t: 'bye', reason: 'Room is full', mode: 'sector' });
    expect(parseMessage({ t: 'bye', reason: 'Room is full', mode: 'wave' })).toEqual({ t: 'bye', reason: 'Room is full' });
    expect(parseMessage({ t: 'bye', reason: 'left' })).toEqual({ t: 'bye', reason: 'left' });
  });

  it('a 4-player Sector Ops lobby: slots 0-3 on every page, list in slot order; a fifth is refused with the mode', () => {
    const h = hub();
    const host = new NetSession(h.make('H'), 'host', 'ABCDE', prof('Host'));
    host.setSettings('sector', 'campusOps', 'normal');
    const cs = ['A', 'B', 'C'].map((id) => new NetSession(h.make(id), 'client', 'ABCDE', prof(id)));
    expect(host.players.size).toBe(4);
    for (const s of [host, ...cs]) {
      expect(s.slotOf('H')).toBe(0);
      expect(s.slotOf('A')).toBe(1);
      expect(s.slotOf('B')).toBe(2);
      expect(s.slotOf('C')).toBe(3);
      expect([...s.players.values()].map((p) => p.slot).sort()).toEqual([0, 1, 2, 3]);
    }
    expect(cs.map((c) => c.selfSlot)).toEqual([1, 2, 3]);
    expect(host.selfSlot).toBe(0);
    const late = new NetSession(h.make('E'), 'client', 'ABCDE', prof('E'));
    let full = false;
    late.events.on('full', () => (full = true));
    late.transport.send({ t: 'hello', v: PROTOCOL_VERSION, name: 'E', tag: {}, look: {} }, 'H');
    expect(full).toBe(true);
    expect(late.mode).toBe('sector');
    expect(host.players.has('E')).toBe(false);
  });

  it('course regression: a 2-player course lobby gives slots 0 and 1; a third hello is refused ("Room full" says 2)', () => {
    const h = hub();
    const host = new NetSession(h.make('H'), 'host', 'ABCDE', prof('Host'));
    expect(host.mode).toBe('course');
    const a = new NetSession(h.make('A'), 'client', 'ABCDE', prof('A'));
    expect(host.slotOf('H')).toBe(0);
    expect(a.selfSlot).toBe(1);
    const b = new NetSession(h.make('B'), 'client', 'ABCDE', prof('B'));
    let full = false;
    b.events.on('full', () => (full = true));
    b.transport.send({ t: 'hello', v: PROTOCOL_VERSION, name: 'B', tag: {}, look: {} }, 'H');
    expect(full).toBe(true);
    expect(capacity(b.mode)).toBe(2);
    expect(host.players.size).toBe(2);
    expect(host.slotOf('B')).toBe(-1);
  });
});
