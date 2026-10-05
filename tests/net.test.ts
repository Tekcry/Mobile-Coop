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
    expect(m.look.hair).toBe('buzz');
    expect(parseMessage({ t: 'pstate', s: { ...ps, id: '../../etc' } })).toBeNull();
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
    expect(m.stats.players.me).toEqual({ kills: 2000, headshots: 3, byKind: { grunt: 5, runner: 0, heavy: 0 }, weaponKills: { rifle: 4 } });
  });
  it('events validate per kind', () => {
    const m = parseMessage({ t: 'ev', events: [{ e: 'boom', x: 1, y: 0, z: 1, r: 99 }, { e: 'banner', title: '<script>', sub: 'ok' }, { e: 'nuke' }, { e: 'kill', enemy: 'e1', kind: 'heavy', by: 'p1', head: true }] });
    expect(m?.t === 'ev' && m.events.map((e) => e.e)).toEqual(['boom', 'banner', 'kill']);
    expect(m?.t === 'ev' && m.events[0]).toMatchObject({ r: 12 });
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
