/**
 * Coop wire protocol. Everything from a peer is untrusted: `parseMessage` validates shape, clamps
 * numbers, caps strings/arrays and drops anything unknown. Pure (no DOM/Babylon) and unit-tested.
 */
import { sanitizeLook, type AvatarLook } from '../cosmetics/avatarLook';
import { WEAPON_IDS, type WeaponId } from '../weapons/weaponDefs';
import { emptyKinds, ENEMY_KINDS, type EnemyKind } from '../ai/enemyDefs';
import { hyp3 } from '../core/mathx';

export const PROTOCOL_VERSION = 1;
export const MAX_PLAYERS = 4;
export const MAX_ENEMIES = 32;
export const MAX_EVENTS = 48;
const WORLD = 400;

export type NetMode = 'wave' | 'sandbox';
import { parseDifficulty, type Difficulty } from '../ai/archetypes';
export type { Difficulty };

export interface PlayerInfo {
  id: string;
  name: string;
  tag: { title: string; color: string; emblem: string };
  look: AvatarLook;
  /** Carried weapons (all of them show on the avatar: back, sling, thigh). */
  loadout: WeaponId[];
  ready: boolean;
  host: boolean;
}

/** Bit flags in player state. */
export const PF = { crouch: 1, ads: 2, firing: 4, roll: 8, grounded: 16, dead: 32, sprint: 64 } as const;

export interface PlayerState {
  id: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  speed: number;
  f: number;
  w: WeaponId;
  hp: number;
  sh: number;
}

export interface EnemyState {
  id: string;
  k: EnemyKind;
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** 0 idle/chase, 1 attack/aim, 2 crouched (cover), 3 dead */
  st: number;
  hp: number;
}

export type NetEvent =
  | { e: 'tracer'; ax: number; ay: number; az: number; bx: number; by: number; bz: number; c: string }
  | { e: 'boom'; x: number; y: number; z: number; r: number }
  | { e: 'kill'; enemy: string; kind: EnemyKind; by: string; head: boolean }
  | { e: 'banner'; title: string; sub: string }
  | { e: 'feed'; text: string }
  | { e: 'pickup'; player: string; kind: 'ammo' | 'health' }
  | { e: 'emote'; player: string; id: string }
  | { e: 'hitConfirm'; player: string; kind: 'hit' | 'head' | 'kill' }
  /** A player took damage from a source at (x, z). */
  | { e: 'hurt'; player: string; x: number; z: number; boom: boolean }
  | { e: 'revive'; player: string; x: number; y: number; z: number };

export interface EndStats {
  won: boolean;
  subtitle: string;
  waves: number;
  score: number;
  /** Per player id. */
  players: Record<string, { kills: number; headshots: number; byKind: Record<EnemyKind, number>; weaponKills: Record<string, number> }>;
}

export type Msg =
  | { t: 'hello'; v: number; name: string; tag: PlayerInfo['tag']; look: AvatarLook; loadout: WeaponId[] }
  | { t: 'lobby'; players: PlayerInfo[]; mode: NetMode; map: string; difficulty: Difficulty; phase: 'lobby' | 'playing' }
  | { t: 'ready'; ready: boolean }
  | { t: 'start'; mode: NetMode; map: string; seed: number; difficulty: Difficulty; time: number }
  | { t: 'pstate'; s: PlayerState }
  | { t: 'shot'; w: WeaponId; ox: number; oy: number; oz: number; dx: number; dy: number; dz: number; target: string; part: 'head' | 'body'; rt: number; dist: number; dmg: number }
  /** `pk` is a bitmask of available pickups (bit i = pickup i). `info` is plain text, segments split by '|'. */
  | { t: 'snap'; time: number; players: PlayerState[]; enemies: EnemyState[]; obj: string; info: string; pk: number }
  | { t: 'ev'; events: NetEvent[] }
  | { t: 'emote'; id: string }
  /** Client grenade detonation (host validates distance and applies damage). */
  | { t: 'blast'; x: number; y: number; z: number }
  | { t: 'end'; stats: EndStats }
  | { t: 'bye'; reason: string };

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, lo: number, hi: number): number | null => (typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : null);
const str = (v: unknown, max: number): string | null => (typeof v === 'string' ? v.slice(0, max) : null);
const safeText = (v: unknown, max: number): string | null => {
  const s = str(v, max);
  return s === null ? null : s.replace(/[<>&"]/g, '');
};
const bool = (v: unknown): boolean | null => (typeof v === 'boolean' ? v : null);
const oneOf = <T extends string>(v: unknown, list: readonly T[]): T | null => (list.includes(v as T) ? (v as T) : null);
const HEX = /^#[0-9a-f]{6}$/i;
const ID = /^[A-Za-z0-9_-]{1,40}$/;
const id = (v: unknown): string | null => (typeof v === 'string' && ID.test(v) ? v : null);

/** Loadout: known weapon ids only, no repeats, at most one of each. */
function loadout(v: unknown): WeaponId[] {
  if (!Array.isArray(v)) return [];
  const out: WeaponId[] = [];
  for (const w of v.slice(0, 16)) {
    const id = oneOf(w, WEAPON_IDS);
    if (id && !out.includes(id)) out.push(id);
  }
  return out;
}

function tag(v: unknown): PlayerInfo['tag'] {
  const o = isObj(v) ? v : {};
  return {
    title: safeText(o.title, 24) ?? 'Rookie',
    color: typeof o.color === 'string' && HEX.test(o.color) ? o.color : '#ff8a1e',
    emblem: safeText(o.emblem, 16) ?? 'chevron',
  };
}

function playerState(v: unknown): PlayerState | null {
  if (!isObj(v)) return null;
  const pid = id(v.id);
  const x = num(v.x, -WORLD, WORLD);
  const y = num(v.y, -50, 100);
  const z = num(v.z, -WORLD, WORLD);
  const yaw = num(v.yaw, -1e4, 1e4);
  const pitch = num(v.pitch, -1.6, 1.6);
  const w = oneOf(v.w, WEAPON_IDS);
  if (pid === null || x === null || y === null || z === null || yaw === null || pitch === null || !w) return null;
  return {
    id: pid,
    x,
    y,
    z,
    yaw,
    pitch,
    speed: num(v.speed, 0, 20) ?? 0,
    f: Math.floor(num(v.f, 0, 127) ?? 0),
    w,
    hp: num(v.hp, 0, 100) ?? 100,
    sh: num(v.sh, 0, 50) ?? 0,
  };
}

function enemyState(v: unknown): EnemyState | null {
  if (!isObj(v)) return null;
  const eid = id(v.id);
  const k = oneOf(v.k, ENEMY_KINDS);
  const x = num(v.x, -WORLD, WORLD);
  const y = num(v.y, -50, 100);
  const z = num(v.z, -WORLD, WORLD);
  const yaw = num(v.yaw, -1e4, 1e4);
  if (eid === null || !k || x === null || y === null || z === null || yaw === null) return null;
  return { id: eid, k, x, y, z, yaw, st: Math.floor(num(v.st, 0, 3) ?? 0), hp: num(v.hp, 0, 1) ?? 1 };
}

function netEvent(v: unknown): NetEvent | null {
  if (!isObj(v)) return null;
  switch (v.e) {
    case 'tracer': {
      const c = [v.ax, v.ay, v.az, v.bx, v.by, v.bz].map((n) => num(n, -WORLD, WORLD));
      if (c.some((n) => n === null)) return null;
      const [ax, ay, az, bx, by, bz] = c as number[];
      return { e: 'tracer', ax: ax!, ay: ay!, az: az!, bx: bx!, by: by!, bz: bz!, c: typeof v.c === 'string' && HEX.test(v.c) ? v.c : '#ffd27a' };
    }
    case 'boom': {
      const x = num(v.x, -WORLD, WORLD);
      const y = num(v.y, -50, 100);
      const z = num(v.z, -WORLD, WORLD);
      if (x === null || y === null || z === null) return null;
      return { e: 'boom', x, y, z, r: num(v.r, 0.5, 12) ?? 4 };
    }
    case 'kill': {
      const enemy = id(v.enemy);
      const kind = oneOf(v.kind, ENEMY_KINDS);
      const by = id(v.by);
      if (!enemy || !kind || !by) return null;
      return { e: 'kill', enemy, kind, by, head: v.head === true };
    }
    case 'banner':
      return { e: 'banner', title: safeText(v.title, 40) ?? '', sub: safeText(v.sub, 60) ?? '' };
    case 'feed':
      return { e: 'feed', text: safeText(v.text, 60) ?? '' };
    case 'pickup': {
      const player = id(v.player);
      const kind = oneOf(v.kind, ['ammo', 'health'] as const);
      return player && kind ? { e: 'pickup', player, kind } : null;
    }
    case 'emote': {
      const player = id(v.player);
      const eid = safeText(v.id, 16);
      return player && eid ? { e: 'emote', player, id: eid } : null;
    }
    case 'hitConfirm': {
      const player = id(v.player);
      const kind = oneOf(v.kind, ['hit', 'head', 'kill'] as const);
      return player && kind ? { e: 'hitConfirm', player, kind } : null;
    }
    case 'hurt': {
      const player = id(v.player);
      const x = num(v.x, -WORLD, WORLD);
      const z = num(v.z, -WORLD, WORLD);
      return player && x !== null && z !== null ? { e: 'hurt', player, x, z, boom: v.boom === true } : null;
    }
    case 'revive': {
      const player = id(v.player);
      const x = num(v.x, -WORLD, WORLD);
      const y = num(v.y, -50, 100);
      const z = num(v.z, -WORLD, WORLD);
      return player && x !== null && y !== null && z !== null ? { e: 'revive', player, x, y, z } : null;
    }
    default:
      return null;
  }
}

function killsRecord<K extends string>(v: unknown, keys: readonly K[] | null, cap: number): Record<string, number> {
  const out: Record<string, number> = {};
  if (!isObj(v)) return out;
  for (const [k, n] of Object.entries(v).slice(0, 16)) {
    if (keys && !keys.includes(k as K)) continue;
    if (!ID.test(k)) continue;
    const c = num(n, 0, cap);
    if (c !== null) out[k] = Math.floor(c);
  }
  return out;
}

function kindsFrom(bk: Record<string, number>): Record<EnemyKind, number> {
  const o = emptyKinds();
  for (const k of ENEMY_KINDS) o[k] = bk[k] ?? 0;
  return o;
}

function endStats(v: unknown): EndStats | null {
  if (!isObj(v)) return null;
  const players: EndStats['players'] = {};
  const rp = isObj(v.players) ? v.players : {};
  for (const [pid, p] of Object.entries(rp).slice(0, MAX_PLAYERS)) {
    if (!ID.test(pid) || !isObj(p)) continue;
    const bk = killsRecord(p.byKind, ENEMY_KINDS, 2000);
    players[pid] = {
      kills: Math.floor(num(p.kills, 0, 2000) ?? 0),
      headshots: Math.floor(num(p.headshots, 0, 2000) ?? 0),
      byKind: kindsFrom(bk),
      weaponKills: killsRecord(p.weaponKills, WEAPON_IDS, 2000),
    };
  }
  return {
    won: v.won === true,
    subtitle: safeText(v.subtitle, 60) ?? '',
    waves: Math.floor(num(v.waves, 0, 200) ?? 0),
    score: Math.floor(num(v.score, 0, 1e7) ?? 0),
    players,
  };
}

const MODES: readonly NetMode[] = ['wave', 'sandbox'];

/** Validate an incoming message. Returns null for anything malformed. */
export function parseMessage(raw: unknown): Msg | null {
  if (!isObj(raw)) return null;
  switch (raw.t) {
    case 'hello': {
      const v = num(raw.v, 0, 1e6);
      if (v === null) return null;
      return { t: 'hello', v, name: safeText(raw.name, 16) || 'Operator', tag: tag(raw.tag), look: sanitizeLook(raw.look), loadout: loadout(raw.loadout) };
    }
    case 'lobby': {
      if (!Array.isArray(raw.players)) return null;
      const players: PlayerInfo[] = [];
      for (const p of raw.players.slice(0, MAX_PLAYERS)) {
        if (!isObj(p)) continue;
        const pid = id(p.id);
        if (!pid) continue;
        players.push({ id: pid, name: safeText(p.name, 16) || 'Operator', tag: tag(p.tag), look: sanitizeLook(p.look), loadout: loadout(p.loadout), ready: p.ready === true, host: p.host === true });
      }
      const mode = oneOf(raw.mode, MODES);
      const difficulty = raw.difficulty === undefined ? null : parseDifficulty(raw.difficulty);
      const phase = oneOf(raw.phase, ['lobby', 'playing'] as const);
      const map = id(raw.map);
      if (!mode || !difficulty || !phase || !map) return null;
      return { t: 'lobby', players, mode, map, difficulty, phase };
    }
    case 'ready': {
      const r = bool(raw.ready);
      return r === null ? null : { t: 'ready', ready: r };
    }
    case 'start': {
      const mode = oneOf(raw.mode, MODES);
      const difficulty = raw.difficulty === undefined ? null : parseDifficulty(raw.difficulty);
      const map = id(raw.map);
      const seed = num(raw.seed, 0, 2 ** 31);
      if (!mode || !difficulty || !map || seed === null) return null;
      return { t: 'start', mode, map, difficulty, seed: Math.floor(seed), time: num(raw.time, 0, 1e7) ?? 0 };
    }
    case 'pstate': {
      const s = playerState(raw.s);
      return s ? { t: 'pstate', s } : null;
    }
    case 'shot': {
      const w = oneOf(raw.w, WEAPON_IDS);
      const o = [raw.ox, raw.oy, raw.oz].map((n) => num(n, -WORLD, WORLD));
      const d = [raw.dx, raw.dy, raw.dz].map((n) => num(n, -1, 1));
      const target = id(raw.target);
      const part = oneOf(raw.part, ['head', 'body'] as const);
      if (!w || !target || !part || o.some((n) => n === null) || d.some((n) => n === null)) return null;
      const len = hyp3(d[0]!, d[1]!, d[2]!);
      if (len < 0.5) return null;
      return {
        t: 'shot',
        w,
        ox: o[0]!,
        oy: o[1]!,
        oz: o[2]!,
        dx: d[0]! / len,
        dy: d[1]! / len,
        dz: d[2]! / len,
        target,
        part,
        rt: num(raw.rt, 0, 1e7) ?? 0,
        dist: num(raw.dist, 0, 300) ?? 0,
        dmg: num(raw.dmg, 0, 1000) ?? 0,
      };
    }
    case 'snap': {
      if (!Array.isArray(raw.players) || !Array.isArray(raw.enemies)) return null;
      const time = num(raw.time, 0, 1e7);
      if (time === null) return null;
      const players = raw.players.slice(0, MAX_PLAYERS).map(playerState).filter((p): p is PlayerState => !!p);
      const enemies = raw.enemies.slice(0, MAX_ENEMIES).map(enemyState).filter((e): e is EnemyState => !!e);
      const pk = Math.floor(num(raw.pk, 0, 2 ** 30) ?? 0);
      return { t: 'snap', time, players, enemies, obj: safeText(raw.obj, 80) ?? '', info: safeText(raw.info, 120) ?? '', pk };
    }
    case 'ev': {
      if (!Array.isArray(raw.events)) return null;
      const events = raw.events.slice(0, MAX_EVENTS).map(netEvent).filter((e): e is NetEvent => !!e);
      return { t: 'ev', events };
    }
    case 'emote': {
      const e = safeText(raw.id, 16);
      return e ? { t: 'emote', id: e } : null;
    }
    case 'blast': {
      const x = num(raw.x, -WORLD, WORLD);
      const y = num(raw.y, -50, 100);
      const z = num(raw.z, -WORLD, WORLD);
      return x === null || y === null || z === null ? null : { t: 'blast', x, y, z };
    }
    case 'end': {
      const stats = endStats(raw.stats);
      return stats ? { t: 'end', stats } : null;
    }
    case 'bye':
      return { t: 'bye', reason: safeText(raw.reason, 60) ?? '' };
    default:
      return null;
  }
}

/** 5-char room codes without confusable characters. */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function makeRoomCode(rng: () => number = Math.random): string {
  let s = '';
  for (let i = 0; i < 5; i++) s += CODE_ALPHABET[Math.floor(rng() * CODE_ALPHABET.length)]!;
  return s;
}

export function normalizeRoomCode(input: string): string | null {
  const s = input.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  if (s.length !== 5) return null;
  for (const ch of s) if (!CODE_ALPHABET.includes(ch)) return null;
  return s;
}
