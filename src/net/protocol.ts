/**
 * Coop wire protocol. Everything from a peer is untrusted: `parseMessage` validates shape, clamps
 * numbers, caps strings/arrays and drops anything unknown. Pure (no DOM/Babylon) and unit-tested.
 */
import { WEATHER_CHOICES, type WeatherChoice } from '../world/mapDef';
import { LAMP_FALLOFFS, type LampFalloff } from '../world/lampMath';
import { sanitizeLook, type AvatarLook } from '../cosmetics/avatarLook';
import { WEAPON_IDS, type WeaponId } from '../weapons/weaponDefs';
import { emptyKinds, ENEMY_KINDS, type EnemyKind } from '../ai/enemyDefs';
import { hyp3 } from '../core/mathx';
import { packMoveState, sanitizeMoveState, type MoveState } from '../player/moveState';
import { CDENY_REASONS, CKINDS, type CDenyReason, type CKind } from '../game/committedMoves';
import { CLIENT_VERBS, type ClientVerb, type CourseWire } from '../game/course/courseWire';
import type { AirlockPhase, PackedCourse } from '../game/course/courseState';
import type { SecWire } from '../game/ctDevices';
import type { SectorNetExtra } from '../game/sectors';
import { LAMP_BITS, LAMP_CHARS, LAMP_MAX, type LampWire } from './lampSync';

/** 40 (pose-parity + coop-walk-fixes, one bump for the stack at train 30); was 37: the partner's rounds (coop-walk-fixes P7): `PlayerState.sc`, the player's rounds fired mod 256, so a remote plays each round once with its weapon's own (suppressed when `PF.quiet`) sound; the `PF.firing` 0.2 s window replayed one shot twice; also (P6) the team takedown on a partner's hostage is a `td` with kind `assist` (the field existed); 36: partner pose parity (pose-parity): `PF.aimLeft` 64 (the left-shoulder aim, every mode; the ground MoveState `sub` bit 128 is no longer written) and the MoveState `takedown` `sub` bit 1 (`TAKEDOWN_SUB_BLOW`: the blow is running; a choke / the lethal approach poses no arc); 39: guard-ai S9; 38: the host's lamp falloff (sector-redesign lightrev LR13): `start.lf` ('linear' | 'photometric'), which the client's match runs whatever its own setting (a 37 peer would ignore it and bake the other falloff: light parity); 35: the weapons crate (sector-redesign E9-crate): `NetItem` kind `crate` and the `crate` event (host -> all; `fill` false = rejoin re-send); 32-34 taken by open branches (guard-ai 32, marlow-final 33, section-rating 34); 31: Sector Ops light state (sector-redesign slice L): the `lamps` message (host -> all: switched-off and shot-out bitsets, `lampSync.ts`) and a client's lamp shot as a `shot` whose target is `lt-<light id>`; 30: taken by marlow-final (Menu Notes); 29: the lasers' jam point is their power panel (sector-fixes P): the `jam` claim and `sec.dv` name panel ids (`panel-*`), never laser ids (a 28 peer would jam a laser the other side does not know); 28: the `jam` claim carries the client's camera eye `e` (jammer-fixes: the host checks the jam's line of sight from it); 27: rejoin (marlow-bays R): `hello.tok`, `PlayerInfo.away`, the `you` message, the `restore` event; 26: the jammer's rules (marlow-jammer: `sec` carries per-camera clocks `ck`, each player's jam left `ch` and cooldown `cd`, and the jammed / recovering devices `dv`); 25: the guard torch bit `AL_TORCH` in the snapshot's enemy `al` (coop-torches); 24: the `sector` message's live section, door locks, shot cameras and syringes (sector-ops step 3); 23: Sector Ops (the `sector` mode and message); 22: the two-person rope (B7); 21: the paired scanners (course.sec sc); 20: the hang-down (B5); 19: the partner throw (B4); 18: ground MoveState.sub bit 128, the left-shoulder weapon (anim-cleanup); 17: the held jammer (B3). */
export const PROTOCOL_VERSION = 40;
/** Room cap on the wire; co-op modes take `COOP_MAX` (the training course `COURSE_MAX`). */
export const MAX_PLAYERS = 4;
export const COOP_MAX = 4;
export const MAX_ENEMIES = 32;
export const MAX_EVENTS = 48;
/** Usable things (objectives, switches, doors, revives) mirrored to clients; open doors listed. */
export const MAX_ITEMS = 128;
export const MAX_DOORS = 256;
const WORLD = 400;

/** Co-op: free roam, Hunter (`clear`), Infiltration, the training course (the campaign), Sector Ops. */
/** Gadgets whose effect crosses the net. */
export type NetGadget = 'gas' | 'flash' | 'emp' | 'noise';
export const NET_GADGETS: readonly NetGadget[] = ['gas', 'flash', 'emp', 'noise'];
export type NetMode = 'sandbox' | 'clear' | 'infiltration' | 'course' | 'sector';
export const NET_MODES: readonly NetMode[] = ['sandbox', 'clear', 'infiltration', 'course', 'sector'];
/** The training course and Sector Ops take two players (P1 host, P2 client; G2). */
export const COURSE_MAX = 2;
/** Players a mode takes. */
export const capacity = (m: NetMode): number => (m === 'course' || m === 'sector' ? COURSE_MAX : COOP_MAX);
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
  /** (marlow-bays R2) Dropped mid-match: the host holds the slot (frozen, invulnerable) until a rejoin or the hold ends. */
  away: boolean;
}

/** Bit flags in player state. */
/** Player flags; `silent`: footsteps make no noise this moment (climbing, vaults);
 *  `spotted` (host -> client): guards in combat know this player is there (no takedowns on them);
 *  `aimLeft` (pose-parity, 36; the old sprint bit, removed in 14): the weapon on the left shoulder off the wall (the
 *  shoulder swap), the owner's own rule (`gameState.ts` openLeft), so the partner's rig mirrors the hand in every mode. */
export const PF = { crouch: 1, ads: 2, firing: 4, roll: 8, grounded: 16, dead: 32, aimLeft: 64, quiet: 128, silent: 256, spotted: 512, driven: 1024 } as const;

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
  /** (37, coop-walk-fixes P7) Rounds fired mod 256 (`PlayerWeapons.shotCount`): a remote plays one shot per step of it. */
  sc?: number;
  /** Movement state (3.2.0): back to a wall, attached, committed moves, takedowns (`player/moveState.ts`). */
  mv?: MoveState;
}

/** A player state for the wire (the move state packed: its mode as an index). */
export function wirePlayerState(s: PlayerState): PlayerState {
  if (!s.mv) return s;
  return { ...s, mv: packMoveState(s.mv) as unknown as MoveState };
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
  /** Alert level: 0 calm, 1 suspicious / investigating, 2 searching, 3 combat; +4 (`AL_SEIZED`) = seized in a
   *  takedown; (25) +8 (`AL_TORCH`) = his flashlight is on. `packAlert` builds it. */
  al: number;
  /** (stealth-pays client intel) 1: he has unspent interrogation intel (the host's `Enemy.info`); absent otherwise.
   *  Host-authoritative: a revived guard, a client rejoin and an interrogation on either side all follow it. */
  in?: 1;
}

/** `EnemyState.al` bits over the alert level (bits 0-1): seized in a takedown, and (protocol 25) the torch on. */
export const AL_SEIZED = 4;
export const AL_TORCH = 8;

/** The wire `al`: alert level 0-3, seized, torch on. A guard without a torch costs what he did before (0-7); a lit one
 *  is 8-11 (calm or investigating 8-9: one JSON digit; searching or in combat 10-11: two) or 12-15 seized: at most one byte more. */
export function packAlert(level: number, seized: boolean, torch: boolean): number {
  return (level & 3) | (seized ? AL_SEIZED : 0) | (torch ? AL_TORCH : 0);
}

/** (stealth-pays client intel) The host's writer of `EnemyState.in`: set while the guard has unspent intel, absent
 *  otherwise (no bytes for a guard without). */
export function markIntel(s: EnemyState, has: boolean): EnemyState {
  if (has) s.in = 1;
  else delete s.in;
  return s;
}

/** A usable thing on the host (mirrored on clients, used through `use`). */
export interface NetItem {
  id: string;
  k: 'terminal' | 'cache' | 'switch' | 'alarm' | 'door' | 'intel' | 'charge' | 'revive' | 'medkitWall' | 'crate';
  x: number;
  y: number;
  z: number;
  yaw: number;
  label: string;
  hold: number;
  reach: number;
  on: boolean;
}
export const ITEM_KINDS: readonly NetItem['k'][] = ['terminal', 'cache', 'switch', 'alarm', 'door', 'intel', 'charge', 'revive', 'medkitWall', 'crate'];

/** (polish 8) The host's event queue holds `MAX_EVENTS * 2`; a `crate` fill is never dropped (a dropped one left that
 *  client's use recorded but never filled until a restart). Crate events are bounded by crates x players. */
export function eventQueueKeeps(len: number, e: NetEvent): boolean {
  return len < MAX_EVENTS * 2 || e.e === 'crate';
}

export type NetEvent =
  | { e: 'tracer'; ax: number; ay: number; az: number; bx: number; by: number; bz: number; c: string }
  | { e: 'boom'; x: number; y: number; z: number; r: number }
  | { e: 'kill'; enemy: string; kind: EnemyKind; by: string; head: boolean }
  | { e: 'banner'; title: string; sub: string }
  | { e: 'feed'; text: string }
  | { e: 'pickup'; player: string; kind: 'ammo' }
  /** (35, E9-crate) `player` used weapons crate `id`: `fill` true = the use itself (that player tops up), false = a
   *  re-send after a rejoin (hide the prompt only, never top up). */
  | { e: 'crate'; player: string; id: string; fill: boolean }
  | { e: 'hitConfirm'; player: string; kind: 'hit' | 'head' | 'kill' }
  /** A player took damage from a source at (x, z). */
  | { e: 'hurt'; player: string; x: number; z: number; boom: boolean }
  | { e: 'revive'; player: string; x: number; y: number; z: number }
  /** (marlow-bays R2) A rejoined player is put back where the host held them (health and team state come as usual). */
  | { e: 'restore'; player: string; x: number; y: number; z: number; yaw: number }
  /** (26, marlow-jammer fix round 1) The camera hallway sent `player` back to (x, y, z), facing `yaw` (alive, health kept). */
  | { e: 'back'; player: string; x: number; y: number; z: number; yaw: number }
  /** Co-op: a takedown the host refused (the client lets go of its puppet). */
  | { e: 'tdDenied'; player: string; enemy: string }
  /** A ping by `player` at a spot or on an enemy (`target`, '' = the spot). */
  | { e: 'ping'; player: string; x: number; y: number; z: number; target: string }
  /** A player's gadget went off / stuck there (gas, flashbang, EMP, noisemaker): everyone sees it. */
  | { e: 'gadget'; player: string; kind: NetGadget; x: number; y: number; z: number };

export interface EndStats {
  won: boolean;
  subtitle: string;
  score: number;
  /** Per player id. */
  players: Record<string, { kills: number; headshots: number; byKind: Record<EnemyKind, number>; weaponKills: Record<string, number> }>;
}

export type Msg =
  /** `tok` (marlow-bays R2): the client's rejoin token for this room ('' = none), so a rejoin gets its held slot back. */
  | { t: 'hello'; v: number; name: string; tag: PlayerInfo['tag']; look: AvatarLook; loadout: WeaponId[]; tok: string }
  /** (marlow-bays R2) Host -> one client: the player id the host knows it by (its held slot's on a rejoin). */
  | { t: 'you'; id: string }
  | { t: 'lobby'; players: PlayerInfo[]; mode: NetMode; map: string; difficulty: Difficulty; phase: 'lobby' | 'playing'; mission: string; weather: WeatherChoice }
  | { t: 'ready'; ready: boolean }
  | { t: 'start'; mode: NetMode; map: string; seed: number; difficulty: Difficulty; time: number; mission: string; weather: WeatherChoice; bay?: number; /** (38, LR13) the host's lamp falloff: the match's for everyone */ lf: LampFalloff }
  | { t: 'pstate'; s: PlayerState }
  | { t: 'shot'; w: WeaponId; ox: number; oy: number; oz: number; dx: number; dy: number; dz: number; target: string; part: 'head' | 'body'; rt: number; dist: number; dmg: number }
  /** `pk` is a bitmask of available pickups (bit i = pickup i). `info` is plain text, segments split by '|'. */
  | { t: 'snap'; time: number; players: PlayerState[]; enemies: EnemyState[]; obj: string; info: string; pk: number; items?: NetItem[]; doors?: number[]; dcr?: number[]; bodies?: string[] }
  /** Client used a mirrored item (the host checks reach and that it is usable). */
  | { t: 'use'; id: string }
  /** (locomotion step 13) Client door peek: crack door `i` (or close its crack); the host checks reach, closed, unlocked. */
  | { t: 'door'; i: number; crack: boolean }
  /** Client takedown on a host enemy: seize it, finish it (lethal / not), or let go. */
  | { t: 'td'; target: string; ph: 'start' | 'done' | 'abort'; lethal: boolean; kind?: string }
  /** (3.2.0 phase 5) A client asks for a team move with a braced partner (boost onto anchor `target` at `s`, the
   *  grip at `gy`), or ends the human ladder. */
  | { t: 'tmove'; kind: 'boost' | 'ladder' | 'throw' | 'hang' | 'rope' | 'hangEnd' | 'end'; partner: string; target: number; s: number; gy: number; lx?: number; lz?: number }
  /** The host started a team move: `a` climbs, `b` is braced. (CT prototype B4, protocol 19) `throw`: `a` is thrown
   *  over the standing `b` to the landing `l` (feet; a `tmove` throw claims it as `lx`, `gy`, `lz`). */
  | { t: 'tstart'; kind: 'boost' | 'ladder' | 'throw' | 'hang' | 'rope'; a: string; b: string; target: number; s: number; t0: number; l?: [number, number, number] }
  /** The host refused `a`'s request. */
  | { t: 'tdeny'; a: string; reason: string }
  /**
   * (locomotion step 10, A5 / PLAN H3) The generic host-approved committed move: a client asks (`id` its own
   * counter, `target` a guard id or ''), the host starts it for everyone at its time `t0` or refuses it (or
   * interrupts it: reason `hit`). Kinds now: `strike`. Reserved, not parsed yet: takedown, grab,
   * drag (step 27); splitBoost, backToBack, pullUp, rappelAnchor, clutch (Phase 5, PLAN H4).
   */
  | { t: 'cmove'; kind: CKind; id: number; target: string }
  | { t: 'cstart'; kind: CKind; a: string; id: number; target: string; t0: number }
  | { t: 'cdeny'; a: string; id: number; kind: CKind; reason: CDenyReason }
  /** The human ladder of `a` (top) and `b` (bottom) ended. (B5, protocol 20) `k`: a hang-down ended: pulled up or dropped. */
  | { t: 'tend'; a: string; b: string; k?: 'pull' | 'drop' }
  /** Client ping (the host relays it to everyone). */
  | { t: 'ping'; x: number; y: number; z: number; target: string }
  /** Client gadget effect (the host applies it to its guards and tells everyone). */
  | { t: 'gadget'; kind: NetGadget; x: number; y: number; z: number }
  | { t: 'ev'; events: NetEvent[] }
  /** Client grenade detonation (host validates distance and applies damage). */
  | { t: 'blast'; x: number; y: number; z: number }
  /** Training course state (host -> all): when it changes or every COURSE_SEND. */
  | ({ t: 'course' } & CourseWire)
  /** Sector Ops: the cameras' clock, jams and alarm stage (host -> all), on change and every 0.5 s; (24) the live
   *  section, locked door indices, cameras shot out and the revive syringes left. */
  | ({ t: 'sector'; sec?: SecWire } & Partial<SectorNetExtra>)
  /** A client's local-only drill verb (DECISIONS C10; at most CTICK_RATE a second). */
  | { t: 'ctick'; verb: ClientVerb }
  /** (CT prototype B3) A client's held pistol jammer: the device it aims at ('' = released); sent on change and every 0.25 s while held. */
  /** (27) `e`: the client's camera eye (m) a claim was aimed from (a release has none). */
  | { t: 'jam'; tgt: string; e?: [number, number, number] }
  | { t: 'end'; stats: EndStats }
  | { t: 'bye'; reason: string }
  /** (31, sector-redesign slice L) Sector Ops light state (host -> all): `n` lights by registry id, `of` switched off, `sh` shot out (6-bit bitsets, `lampSync.ts`); on change, join and every 2 s. */
  | ({ t: 'lamps' } & LampWire);

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
    f: Math.floor(num(v.f, 0, 2047) ?? 0),
    w,
    hp: num(v.hp, 0, 100) ?? 100,
    ...(typeof v.sc === 'number' && Number.isFinite(v.sc) ? { sc: Math.floor(Math.max(0, Math.min(255, v.sc))) } : {}),
    ...(v.mv !== undefined && sanitizeMoveState(v.mv) ? { mv: sanitizeMoveState(v.mv)! } : {}),
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
  const out: EnemyState = { id: eid, k, x, y, z, yaw, st: Math.floor(num(v.st, 0, 3) ?? 0), hp: num(v.hp, 0, 1) ?? 1, al: Math.floor(num(v.al, 0, 15) ?? 0) };
  if (v.in === 1) out.in = 1;
  return out;
}

function netItem(v: unknown): NetItem | null {
  if (!isObj(v)) return null;
  const iid = id(v.id);
  const k = oneOf(v.k, ITEM_KINDS);
  const x = num(v.x, -WORLD, WORLD);
  const y = num(v.y, -50, 100);
  const z = num(v.z, -WORLD, WORLD);
  if (!iid || !k || x === null || y === null || z === null) return null;
  return { id: iid, k, x, y, z, yaw: num(v.yaw, -10, 10) ?? 0, label: safeText(v.label, 24) || 'Use', hold: num(v.hold, 0, 10) ?? 0, reach: num(v.reach, 0.5, 4) ?? 1.8, on: v.on === true };
}

function playerInfo(p: unknown): PlayerInfo | null {
  if (!isObj(p)) return null;
  const pid = id(p.id);
  if (!pid) return null;
  return { id: pid, name: safeText(p.name, 16) || 'Operator', tag: tag(p.tag), look: sanitizeLook(p.look), loadout: loadout(p.loadout), ready: p.ready === true, host: p.host === true, away: p.away === true };
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
      const kind = oneOf(v.kind, ['ammo'] as const);
      return player && kind ? { e: 'pickup', player, kind } : null;
    }
    case 'crate': {
      const player = id(v.player);
      const cid = id(v.id);
      return player && cid ? { e: 'crate', player, id: cid, fill: v.fill === true } : null;
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
    case 'restore': {
      const player = id(v.player);
      const x = num(v.x, -WORLD, WORLD);
      const y = num(v.y, -50, 100);
      const z = num(v.z, -WORLD, WORLD);
      return player && x !== null && y !== null && z !== null ? { e: 'restore', player, x, y, z, yaw: num(v.yaw, -10, 10) ?? 0 } : null;
    }
    case 'back': {
      const player = id(v.player);
      const x = num(v.x, -WORLD, WORLD);
      const y = num(v.y, -50, 100);
      const z = num(v.z, -WORLD, WORLD);
      const yaw = num(v.yaw, -10, 10);
      return player && x !== null && y !== null && z !== null && yaw !== null ? { e: 'back', player, x, y, z, yaw } : null;
    }
    case 'tdDenied': {
      const player = id(v.player);
      const enemy = id(v.enemy);
      return player && enemy ? { e: 'tdDenied', player, enemy } : null;
    }
    case 'gadget': {
      const player = id(v.player);
      const kind = oneOf(v.kind, NET_GADGETS);
      const x = num(v.x, -WORLD, WORLD);
      const y = num(v.y, -50, 100);
      const z = num(v.z, -WORLD, WORLD);
      return player && kind && x !== null && y !== null && z !== null ? { e: 'gadget', player, kind, x, y, z } : null;
    }
    case 'ping': {
      const player = id(v.player);
      const x = num(v.x, -WORLD, WORLD);
      const y = num(v.y, -50, 100);
      const z = num(v.z, -WORLD, WORLD);
      if (!player || x === null || y === null || z === null) return null;
      return { e: 'ping', player, x, y, z, target: id(v.target) ?? '' };
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
    score: Math.floor(num(v.score, 0, 1e7) ?? 0),
    players,
  };
}

const MODES = NET_MODES;
/** Mission ids are plain slugs ('' = none). */
const mission = (v: unknown): string => (typeof v === 'string' && /^[a-z0-9-]{0,40}$/.test(v) ? v : '');

/** Cameras a `sec` field carries clocks for (SN60 caps a map at 12) and jammed / recovering devices it lists. */
const SEC_CAMS = 16;
const SEC_DEVS = 64;

/** (CT prototype B3; 26 marlow-jammer) The `sec` field of a course / sector message: the jam list, each jammer's use and
 *  cooldown, the devices' jam timelines and the camera clocks, clamped. */
function secWire(v: unknown): { sec?: SecWire } {
  if (!isObj(v)) return {};
  const j = Array.isArray(v.j) ? v.j : [];
  const ch = Array.isArray(v.ch) ? v.ch : [];
  const cd = Array.isArray(v.cd) ? v.cd : [];
  const sc: unknown[] | null = Array.isArray(v.sc) ? v.sc : null;
  const ck: number[] = [];
  if (Array.isArray(v.ck)) for (const x of v.ck.slice(0, SEC_CAMS)) ck.push(num(x, 0, 1e6) ?? 0);
  const dv: [string, number, number][] = [];
  if (Array.isArray(v.dv)) {
    for (const x of v.dv.slice(0, SEC_DEVS)) {
      if (!Array.isArray(x)) continue;
      const k = id(x[0]);
      // phase 1 (jammed) or 2 (recovering); anything else is dropped
      const ph = x[1] === 1 || x[1] === 2 ? x[1] : 0;
      if (!k || ph === 0) continue;
      dv.push([k, ph, num(x[2], 0, 30) ?? 0]);
    }
  }
  return {
    sec: {
      ck,
      j: [id(j[0]) ?? '', id(j[1]) ?? ''],
      ch: [num(ch[0], 0, 10) ?? 0, num(ch[1], 0, 10) ?? 0],
      cd: [num(cd[0], 0, 10) ?? 0, num(cd[1], 0, 10) ?? 0],
      dv,
      al: Math.round(num(v.al, 0, 9) ?? 0),
      // (B6) the scanner pair: phases 0-3, occupied bits 0-3, progress in tenths of a second
      ...(sc ? { sc: [0, 1, 2, 3, 4].map((i) => Math.round(num(sc[i], 0, i < 3 ? 3 : 100) ?? 0)) } : {}),
    },
  };
}

/** (24) The `sector` message's extras: live section -1..63, locked doors, shot cameras (ids), syringes 0..9. */
function sectorExtra(raw: Record<string, unknown>): Partial<SectorNetExtra> {
  const out: Partial<SectorNetExtra> = {};
  const ls = num(raw.ls, -1, 63);
  if (ls !== null) out.ls = Math.round(ls);
  if (Array.isArray(raw.lk)) out.lk = ints(raw.lk, 0, MAX_DOORS - 1, MAX_DOORS);
  if (Array.isArray(raw.dn)) {
    const dn: string[] = [];
    for (const v of raw.dn.slice(0, 64)) {
      const k = id(v);
      if (k) dn.push(k);
    }
    out.dn = dn;
  }
  const sy = num(raw.sy, 0, 9);
  if (sy !== null) out.sy = Math.round(sy);
  return out;
}

const COURSE_LIST = 256;
const PHASES: readonly AirlockPhase[] = ['open', 'waiting', 'ready', 'cycling', 'sealed'];
const ints = (v: unknown, lo: number, hi: number, max = COURSE_LIST): number[] => {
  const out: number[] = [];
  if (!Array.isArray(v)) return out;
  for (const x of v.slice(0, max)) {
    const n = num(x, lo, hi);
    if (n !== null) out.push(Math.round(n));
  }
  return out;
};
const strs = (v: unknown, max = COURSE_LIST): string[] => {
  const out: string[] = [];
  if (!Array.isArray(v)) return out;
  for (const x of v.slice(0, max)) {
    const s = safeText(x, 48);
    if (s) out.push(s);
  }
  return out;
};
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v.slice(0, COURSE_LIST) : []);
const n0 = (v: unknown, lo: number, hi: number): number => num(v, lo, hi) ?? 0;

/** The `course` message: every field clamped, lists capped, unknown shapes dropped. */
function parseCourse(raw: Obj): Msg | null {
  const s = raw.s;
  const lights = raw.lights;
  if (!isObj(s) || !isObj(lights)) return null;
  const stat = (q: unknown) => {
    const o = isObj(q) ? q : {};
    return { time: n0(o.time, 0, 1e6), detections: n0(o.detections, 0, 1e4), alarms: n0(o.alarms, 0, 1e4), knockouts: n0(o.knockouts, 0, 1e4), kills: n0(o.kills, 0, 1e4), revives: n0(o.revives, 0, 1e4), teamMoves: n0(o.teamMoves, 0, 1e4), bodies: n0(o.bodies, 0, 1e4) };
  };
  const ps = arr(s.pstats);
  const packed: PackedCourse = {
    bay: Math.round(n0(s.bay, 0, 64)),
    done: arr(s.done).map((b) => b === true),
    cp: safeText(s.cp, 48) ?? 'start',
    clock: n0(s.clock, 0, 1e6),
    over: s.over === true,
    air: arr(s.air).map((a) => {
      const o = isObj(a) ? a : {};
      return { phase: oneOf(o.phase, PHASES) ?? 'open', t: n0(o.t, 0, 60) };
    }),
    gates: arr(s.gates).map((x) => {
      const o = isObj(x) ? x : {};
      return { open: o.open === true, t: n0(o.t, 0, 600), holders: Math.round(n0(o.holders, 0, 3)), ta: n0(o.ta, -1, 1e6), tb: n0(o.tb, -1, 1e6), pa: Math.round(n0(o.pa, -1, 1)), pb: Math.round(n0(o.pb, -1, 1)) };
    }),
    flags: strs(s.flags),
    flagBay: arr(s.flagBay).flatMap((x): [string, number][] => {
      const f = Array.isArray(x) ? safeText(x[0], 48) : null;
      return f ? [[f, Math.round(n0((x as unknown[])[1], 0, 64))]] : [];
    }),
    groupsOff: strs(s.groupsOff),
    ticks: arr(s.ticks).map((x): [number, number] => (Array.isArray(x) ? [Math.round(n0(x[0], 0, 99)), Math.round(n0(x[1], 0, 99))] : [0, 0])),
    stats: arr(s.stats).map(stat),
    pstats: [stat(ps[0]), stat(ps[1])],
    locks: strs(s.locks),
    anchors: strs(s.anchors),
  };
  const groups: [number, boolean][] = [];
  for (const x of arr(lights.groups)) {
    if (!Array.isArray(x)) continue;
    const g = num(x[0], -1, 4096);
    if (g !== null && typeof x[1] === 'boolean') groups.push([Math.round(g), x[1]]);
  }
  return { t: 'course', s: packed, locks: ints(raw.locks, 0, MAX_DOORS - 1, MAX_DOORS), anchors: ints(raw.anchors, 0, 1e5), lights: { groups, dead: ints(lights.dead, 0, 1e5, 1024) }, ref: safeText(raw.ref, 160) ?? '', rn: Math.round(n0(raw.rn, 0, 1e6)), rl: safeText(raw.rl, 160) ?? '', rln: Math.round(n0(raw.rln, 0, 1e6)), ...secWire(raw.sec) };
}

/** Validate an incoming message. Returns null for anything malformed. */

export function parseMessage(raw: unknown): Msg | null {
  if (!isObj(raw)) return null;
  switch (raw.t) {
    case 'hello': {
      const v = num(raw.v, 0, 1e6);
      if (v === null) return null;
      return { t: 'hello', v, name: safeText(raw.name, 16) || 'Operator', tag: tag(raw.tag), look: sanitizeLook(raw.look), loadout: loadout(raw.loadout), tok: id(raw.tok) ?? '' };
    }
    case 'you': {
      const pid = id(raw.id);
      return pid ? { t: 'you', id: pid } : null;
    }
    case 'lobby': {
      if (!Array.isArray(raw.players)) return null;
      const players: PlayerInfo[] = [];
      for (const p of raw.players.slice(0, MAX_PLAYERS)) {
        const info = playerInfo(p);
        if (info) players.push(info);
      }
      const mode = oneOf(raw.mode, MODES);
      const difficulty = raw.difficulty === undefined ? null : parseDifficulty(raw.difficulty);
      const phase = oneOf(raw.phase, ['lobby', 'playing'] as const);
      const map = id(raw.map);
      if (!mode || !difficulty || !phase || !map) return null;
      return { t: 'lobby', players, mode, map, difficulty, phase, mission: mission(raw.mission), weather: oneOf(raw.weather, WEATHER_CHOICES) ?? 'clear' };
    }
    case 'ready': {
      const r = bool(raw.ready);
      return r === null ? null : { t: 'ready', ready: r };
    }
    case 'use': {
      const iid = id(raw.id);
      return iid ? { t: 'use', id: iid } : null;
    }
    case 'door': {
      const i = typeof raw.i === 'number' && Number.isInteger(raw.i) && raw.i >= 0 && raw.i < MAX_DOORS ? raw.i : null;
      const crack = bool(raw.crack);
      return i === null || crack === null ? null : { t: 'door', i, crack };
    }
    case 'sector':
      return { t: 'sector', ...secWire(raw.sec), ...sectorExtra(raw) };
    case 'course':
      return parseCourse(raw);
    case 'ctick': {
      const verb = oneOf(raw.verb, CLIENT_VERBS);
      return verb ? { t: 'ctick', verb } : null;
    }
    case 'jam': {
      if (raw.tgt === '') return { t: 'jam', tgt: '' };
      const tgt = id(raw.tgt);
      if (!tgt) return null;
      // (27) the camera eye, clamped to the world; a malformed one is dropped (the host then checks from the head)
      const e = Array.isArray(raw.e) && raw.e.length === 3 ? raw.e : null;
      const ex = e ? num(e[0], -WORLD, WORLD) : null;
      const ey = e ? num(e[1], -50, 100) : null;
      const ez = e ? num(e[2], -WORLD, WORLD) : null;
      return ex !== null && ey !== null && ez !== null ? { t: 'jam', tgt, e: [ex, ey, ez] } : { t: 'jam', tgt };
    }
    case 'gadget': {
      const kind = oneOf(raw.kind, NET_GADGETS);
      const x = num(raw.x, -WORLD, WORLD);
      const y = num(raw.y, -50, 100);
      const z = num(raw.z, -WORLD, WORLD);
      return kind && x !== null && y !== null && z !== null ? { t: 'gadget', kind, x, y, z } : null;
    }
    case 'ping': {
      const x = num(raw.x, -WORLD, WORLD);
      const y = num(raw.y, -50, 100);
      const z = num(raw.z, -WORLD, WORLD);
      if (x === null || y === null || z === null) return null;
      return { t: 'ping', x, y, z, target: id(raw.target) ?? '' };
    }
    case 'tmove': {
      const kind = oneOf(raw.kind, ['boost', 'ladder', 'throw', 'hang', 'rope', 'hangEnd', 'end'] as const);
      const partner = raw.partner === '' ? '' : id(raw.partner);
      if (!kind || partner === null) return null;
      const out: Extract<Msg, { t: 'tmove' }> = { t: 'tmove', kind, partner, target: Math.floor(num(raw.target, -1, 1e5) ?? -1), s: num(raw.s, -500, 500) ?? 0, gy: num(raw.gy, -100, 200) ?? 0 };
      if (kind === 'throw' || kind === 'hang' || kind === 'rope') {
        const lx = num(raw.lx, -WORLD, WORLD);
        const lz = num(raw.lz, -WORLD, WORLD);
        if (lx === null || lz === null) return null;
        out.lx = lx;
        out.lz = lz;
      }
      return out;
    }
    case 'tstart': {
      const kind = oneOf(raw.kind, ['boost', 'ladder', 'throw', 'hang', 'rope'] as const);
      const a = id(raw.a);
      const b = id(raw.b);
      if (!kind || !a || !b) return null;
      const out: Extract<Msg, { t: 'tstart' }> = { t: 'tstart', kind, a, b, target: Math.floor(num(raw.target, -1, 1e5) ?? -1), s: num(raw.s, -500, 500) ?? 0, t0: num(raw.t0, 0, 1e7) ?? 0 };
      if (kind === 'throw' || kind === 'hang' || kind === 'rope') {
        const la = Array.isArray(raw.l) && raw.l.length === 3 ? (raw.l as unknown[]) : null;
        const lx = la ? num(la[0], -WORLD, WORLD) : null;
        const ly = la ? num(la[1], -50, 100) : null;
        const lz = la ? num(la[2], -WORLD, WORLD) : null;
        if (lx === null || ly === null || lz === null) return null;
        out.l = [lx, ly, lz];
      }
      return out;
    }
    case 'tdeny': {
      const a = id(raw.a);
      return a ? { t: 'tdeny', a, reason: str(raw.reason, 20) ?? '' } : null;
    }
    case 'cmove': {
      const kind = oneOf(raw.kind, CKINDS);
      const cid = num(raw.id, 0, 0xffff);
      const target = raw.target === '' || raw.target === undefined ? '' : id(raw.target);
      if (!kind || cid === null || target === null) return null;
      return { t: 'cmove', kind, id: Math.floor(cid), target };
    }
    case 'cstart': {
      const kind = oneOf(raw.kind, CKINDS);
      const a = id(raw.a);
      const cid = num(raw.id, 0, 0xffff);
      const target = raw.target === '' || raw.target === undefined ? '' : id(raw.target);
      const t0 = typeof raw.t0 === 'number' && Number.isFinite(raw.t0) && raw.t0 >= 0 && raw.t0 <= 1e7 ? raw.t0 : null;
      if (!kind || !a || cid === null || target === null || t0 === null) return null;
      return { t: 'cstart', kind, a, id: Math.floor(cid), target, t0 };
    }
    case 'cdeny': {
      const kind = oneOf(raw.kind, CKINDS);
      const a = id(raw.a);
      const cid = num(raw.id, 0, 0xffff);
      const reason = oneOf(raw.reason, CDENY_REASONS);
      if (!kind || !a || cid === null || !reason) return null;
      return { t: 'cdeny', a, id: Math.floor(cid), kind, reason };
    }
    case 'tend': {
      const a = id(raw.a);
      const b = id(raw.b);
      if (!a || !b) return null;
      const k = oneOf(raw.k, ['pull', 'drop'] as const);
      return k ? { t: 'tend', a, b, k } : { t: 'tend', a, b };
    }
    case 'td': {
      const target = id(raw.target);
      const ph = oneOf(raw.ph, ['start', 'done', 'abort'] as const);
      const kind = id(raw.kind);
      return target && ph ? { t: 'td', target, ph, lethal: raw.lethal === true, ...(kind ? { kind } : {}) } : null;
    }
    case 'start': {
      const mode = oneOf(raw.mode, MODES);
      const difficulty = raw.difficulty === undefined ? null : parseDifficulty(raw.difficulty);
      const map = id(raw.map);
      const seed = num(raw.seed, 0, 2 ** 31);
      if (!mode || !difficulty || !map || seed === null) return null;
      return { t: 'start', mode, map, difficulty, seed: Math.floor(seed), time: num(raw.time, 0, 1e7) ?? 0, mission: mission(raw.mission), weather: oneOf(raw.weather, WEATHER_CHOICES) ?? 'clear', bay: Math.round(num(raw.bay, 1, 64) ?? 1), lf: oneOf(raw.lf, LAMP_FALLOFFS) ?? 'linear' };
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
      const out: Extract<Msg, { t: 'snap' }> = { t: 'snap', time, players, enemies, obj: safeText(raw.obj, 80) ?? '', info: safeText(raw.info, 120) ?? '', pk };
      if (Array.isArray(raw.items)) out.items = raw.items.slice(0, MAX_ITEMS).map(netItem).filter((i): i is NetItem => !!i);
      if (Array.isArray(raw.doors)) {
        const ds: number[] = [];
        for (const d of raw.doors.slice(0, MAX_DOORS)) {
          const n = num(d, 0, 4095);
          if (n !== null && !ds.includes(Math.floor(n))) ds.push(Math.floor(n));
        }
        out.doors = ds;
      }
      // (step 13) cracked doors (door peek), the same bounds
      if (Array.isArray(raw.dcr)) {
        const cs: number[] = [];
        // (fix r1) an out-of-range entry is dropped, never clamped (-1 must not crack door 0)
        for (const d of raw.dcr.slice(0, MAX_DOORS)) {
          if (typeof d !== 'number' || !Number.isInteger(d) || d < 0 || d > 4095) continue;
          if (!cs.includes(d)) cs.push(d);
        }
        out.dcr = cs;
      }
      if (Array.isArray(raw.bodies)) out.bodies = raw.bodies.slice(0, MAX_ENEMIES).map((b) => id(b)).filter((b): b is string => !!b);
      return out;
    }
    case 'ev': {
      if (!Array.isArray(raw.events)) return null;
      const events = raw.events.slice(0, MAX_EVENTS).map(netEvent).filter((e): e is NetEvent => !!e);
      return { t: 'ev', events };
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
    case 'lamps': {
      // (31) bitsets of known characters only, at most LAMP_CHARS each
      const n = num(raw.n, 0, LAMP_MAX);
      const of = typeof raw.of === 'string' && raw.of.length <= LAMP_CHARS && LAMP_BITS.test(raw.of) ? raw.of : null;
      const sh = typeof raw.sh === 'string' && raw.sh.length <= LAMP_CHARS && LAMP_BITS.test(raw.sh) ? raw.sh : null;
      return n === null || of === null || sh === null ? null : { t: 'lamps', n: Math.round(n), of, sh };
    }
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
