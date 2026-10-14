import { emptyKinds } from '../src/ai/enemyDefs';
import type { WeaponId } from '../src/weapons/weaponDefs';
import { describe, expect, it } from 'vitest';
import { makeRoomCode, normalizeRoomCode, parseMessage, CODE_ALPHABET, MAX_ENEMIES, MAX_DOORS, capacity, PROTOCOL_VERSION } from '../src/net/protocol';
import { TickLimiter } from '../src/game/course/courseWire';
import { playersHostile, PvpScore } from '../src/net/pvp';
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
  it('carries the weather choice (3.0), unknown values fall back to clear', () => {
    const a = parseMessage({ t: 'start', mode: 'clear', map: 'warehouse', seed: 1, difficulty: 'normal', weather: 'rain' });
    expect(a && a.t === 'start' && a.weather).toBe('rain');
    const b = parseMessage({ t: 'start', mode: 'clear', map: 'warehouse', seed: 1, difficulty: 'normal', weather: 'blizzard' });
    expect(b && b.t === 'start' && b.weather).toBe('clear');
    const c = parseMessage({ t: 'lobby', players: [], mode: 'wave', map: 'warehouse', difficulty: 'normal', phase: 'lobby', weather: 'fog' });
    expect(c && c.t === 'lobby' && c.weather).toBe('fog');
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
    late.transport.send({ t: 'hello', v: PROTOCOL_VERSION, name: 'Late', tag: {}, look: {} });
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

describe('PvP takedowns (3.2.0 phase 4)', () => {
  it('ptd: only the drop, the ledge pull and the inverted choke, on a valid id', () => {
    expect(parseMessage({ t: 'ptd', target: 'peerB', kind: 'drop' })).toEqual({ t: 'ptd', target: 'peerB', kind: 'drop' });
    expect(parseMessage({ t: 'ptd', target: 'peerB', kind: 'inverted' })).not.toBeNull();
    expect(parseMessage({ t: 'ptd', target: 'peerB', kind: 'behind' })).toBeNull();
    expect(parseMessage({ t: 'ptd', target: '../x', kind: 'drop' })).toBeNull();
  });
});

describe('team moves (3.2.0 phase 5)', () => {
  it('tmove: boost / ladder / end, a valid partner id, clamped numbers', () => {
    expect(parseMessage({ t: 'tmove', kind: 'boost', partner: 'peerB', target: 12, s: 1.5, gy: 4.2 })).toEqual({ t: 'tmove', kind: 'boost', partner: 'peerB', target: 12, s: 1.5, gy: 4.2 });
    expect(parseMessage({ t: 'tmove', kind: 'end', partner: '', target: -1, s: 0, gy: 0 })).not.toBeNull();
    expect(parseMessage({ t: 'tmove', kind: 'fly', partner: 'peerB' })).toBeNull();
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
  it('friendly fire (D38): course partners hurt each other, never themselves; co-op never; PvP by sides', () => {
    expect(playersHostile(null, true, 'a', 'b')).toBe(true);
    expect(playersHostile(null, true, 'a', 'a')).toBe(false);
    expect(playersHostile(null, false, 'a', 'b')).toBe(false);
    const sc = new PvpScore('tdm');
    sc.add('a', 0);
    sc.add('b', 0);
    sc.add('c', 1);
    expect(playersHostile(sc, true, 'a', 'b')).toBe(false);
    expect(playersHostile(sc, false, 'a', 'c')).toBe(true);
  });
  it('parses ctick for client-only verbs only', () => {
    expect(parseMessage({ t: 'ctick', verb: 'gear' })).toEqual({ t: 'ctick', verb: 'gear' });
    expect(parseMessage({ t: 'ctick', verb: 'takedown' })).toBeNull();
  });
  it('the course takes two players and the protocol was bumped', () => {
    expect(capacity('course')).toBe(2);
    expect(PROTOCOL_VERSION).toBe(3);
  });
  it('the ctick limiter allows 4 a second', () => {
    const l = new TickLimiter();
    let n = 0;
    for (let i = 0; i < 20; i++) if (l.take(i * 0.05)) n++;
    expect(n).toBeLessThanOrEqual(8);
    expect(n).toBeGreaterThanOrEqual(4);
  });
});
