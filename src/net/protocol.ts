/**
 * Coop wire protocol. Everything from a peer is untrusted: `parseMessage` validates shape, clamps
 * numbers, caps strings/arrays and drops anything unknown. Pure (no DOM/Babylon) and unit-tested.
 */
import { WEATHER_CHOICES, type WeatherChoice } from '../world/mapDef';
import { sanitizeLook, type AvatarLook } from '../cosmetics/avatarLook';
import { WEAPON_IDS, type WeaponId } from '../weapons/weaponDefs';
import { emptyKinds, ENEMY_KINDS, type EnemyKind } from '../ai/enemyDefs';
import { hyp3 } from '../core/mathx';
import { OPTIC_POINT_MAX, packMoveState, sanitizeMoveState, type MoveState } from '../player/moveState';
import { CDENY_REASONS, CKINDS, type CDenyReason, type CKind } from '../game/committedMoves';
import { CLIENT_VERBS, RH_HI, RH_MAX, type ClientVerb, type CourseWire } from '../game/course/courseWire';
import type { AirlockPhase, PackedCourse, RetryCause } from '../game/course/courseState';
import type { SecWire } from '../game/ctDevices';
import type { SectorNetExtra, SectorRatingWire } from '../game/sectors';
import { isKitKind, TEAM_KINDS, type TeamKind } from '../game/teamMoves';
import { parseMissionWire } from '../game/mission/missionWire';
import type { GadgetId } from '../game/gadgets';
import { LAMP_BITS, LAMP_CHARS, LAMP_MAX, type LampWire } from './lampSync';
import { SWAY } from '../world/lampSway';
import type { MotionState } from '../anim/motion';

/** The wire version. Only this line holds it; tests read it. `scripts/merge-train.mjs build` bumps it once per train with a wire change (history: CHANGELOG, docs/systems/coop.md). */
export const PROTOCOL_VERSION = 80;
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
/** (mission NET) The gadgets whose use reaches the host only as a `gused` (no effect message: a frag goes as `blast`). */
export type UseOnlyGadget = Exclude<GadgetId, NetGadget>;
export const USE_ONLY_GADGETS: readonly UseOnlyGadget[] = ['frag', 'mine', 'stickyCam'];
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
  /** (afp AF6) The sender's clock when it sent the state (s; a joiner's `pstate` only: the host's snapshots carry
   *  `time`). */
  t?: number;
  /** (afp AF6) The owner's gait clock (cycle 0..1, its MotionDriver phase at the state): the partner's stride in step. */
  gph?: number;
  /** (afp AF6) The owner's Chaos Theory stop: the blend to idle (s, 0 none) and the held stride's pace (m/s, 0 none). */
  qs?: number;
  hs?: number;
  /** (afp AF6) The owner's motion driver state (`MOTION_WIRE` index) and its time in it (s): the partner plays the same start /
   *  stop / turn / pivot moments (it derived them from the measured velocity, at other moments). */
  mo?: number;
  mt?: number;
  /** (afp AF6) The owner's acceleration (world x / z, m/s^2, its motion driver's): the partner's lean and its mocap stop slot
   *  fire as the owner's (derived from the measured velocity they came ~0.1 s late, or not at all). */
  ax?: number;
  az?: number;
}

/** (afp AF6) `PlayerState.mo`: the motion driver states by index. */
export const MOTION_WIRE: readonly MotionState[] = ['idle', 'start', 'move', 'stop', 'turn', 'pivot'];

/** (afp AF6) The owner's motion state for the wire (pure); null (a scripted override drives the body): none. */
export function motionWire(state: MotionState | null, stateT: number, ax: number, az: number, out: { mo?: number; mt?: number; ax?: number; az?: number }): void {
  const i = state ? MOTION_WIRE.indexOf(state) : -1;
  if (i < 0) return;
  out.mo = i;
  out.mt = Number.isFinite(stateT) ? Math.max(0, Math.min(60, stateT)) : 0;
  out.ax = Number.isFinite(ax) ? Math.max(-100, Math.min(100, ax)) : 0;
  out.az = Number.isFinite(az) ? Math.max(-100, Math.min(100, az)) : 0;
}

/** (afp AF6) The owner's gait fields for the wire from its controller (pure): the gait clock, the CT stop. */
export function gaitWire(phase: number, ct: boolean, stopEaseT: number, stopHold: boolean, holdSpeed: number, stopEase: number, stopBlend: number, out: { gph?: number; qs?: number; hs?: number }): void {
  out.gph = Number.isFinite(phase) ? ((phase % 1) + 1) % 1 : 0;
  const qs = ct ? (stopEaseT >= 0 ? stopEase : stopBlend) : 0;
  if (qs > 0) out.qs = qs;
  if (stopHold && holdSpeed > 0) out.hs = holdSpeed;
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
   *  takedown; (25) +8 (`AL_TORCH`) = his flashlight is on; (32) +16 (`AL_CAUTION`) cautious, +32 (`AL_HELMET`) wears a
   *  helmet, +64 (`AL_ARMOUR`) wears body armour; (37, A126) bits 7-8 (`AL_CARRY`) his S21 weapon carry (`WIRE_CARRY_*`);
   *  (guard-models G6n) bits 9-15 (`AL_LOOK`) his look seed (`Enemy.look`). `packAlert` builds it. */
  al: number;
  /** (stealth-pays client intel) 1: he has unspent interrogation intel (the host's `Enemy.info`); absent otherwise.
   *  Host-authoritative: a revived guard, a client rejoin and an interrogation on either side all follow it. */
  in?: 1;
}

/** `EnemyState.al` bits over the alert level (bits 0-1): seized in a takedown, and (protocol 25) the torch on. */
export const AL_SEIZED = 4;
export const AL_TORCH = 8;
/** (32, guard-ai S9) Cautious (S4 / S14 caution: the client's low ready), wearing a helmet, wearing body armour (S12 /
 *  S13 gear: the client's placeholder parts; the helmet bit falling 1 -> 0 drops his helmet there). */
export const AL_CAUTION = 16;
export const AL_HELMET = 32;
export const AL_ARMOUR = 64;
/** (37, guard-ai A126) The guard's S21 weapon carry in `al` bits 7-8 (`ai/carryState.ts` GuardCarry's phase, so the
 *  client runs the same draw / holster clip): 0 drawn (in the hands; low ready or raised come from `st`, the level and
 *  `AL_CAUTION` as before, and every kind that never holsters stays 0), 1 holstered, 2 drawing, 3 holstering. */
export const AL_CARRY_SHIFT = 7;
export const AL_CARRY = 3 << AL_CARRY_SHIFT;
export const WIRE_CARRY_DRAWN = 0;
export const WIRE_CARRY_HOLSTERED = 1;
export const WIRE_CARRY_DRAWING = 2;
export const WIRE_CARRY_HOLSTERING = 3;
/** (guard-models G6n, M3) The guard's 7-bit look seed (`Enemy.look`, `ai/guardLook.ts`: set once at spawn from his
 *  spawn slot) in `al` bits 9-15, so the client builds the same look; it never changes for one guard id. */
export const AL_LOOK_SHIFT = 9;
export const AL_LOOK = 127 << AL_LOOK_SHIFT;
/** Every `al` bit in use (the parser clamps into these). */
export const AL_MAX = 65535;

/** The wire `al`: alert level 0-3, seized, torch on, (32) cautious, helmet, armour, (37, A126) the carry 0-3, (G6n) the
 *  look seed 0-127. A guard without a torch or gear costs what he did before (0-7); a lit one is 8-15; caution and gear
 *  add at most two JSON digits (16-127); a holstered carry one more (128-511); a look seed adds at most two more. */
export function packAlert(level: number, seized: boolean, torch: boolean, cautious = false, helmet = false, armour = false, carry = WIRE_CARRY_DRAWN, look = 0): number {
  return (level & 3) | (seized ? AL_SEIZED : 0) | (torch ? AL_TORCH : 0) | (cautious ? AL_CAUTION : 0) | (helmet ? AL_HELMET : 0) | (armour ? AL_ARMOUR : 0) | ((carry & 3) << AL_CARRY_SHIFT) | ((look & 127) << AL_LOOK_SHIFT);
}

/** (37, A126) The carry (`WIRE_CARRY_*`) in a wire `al`. */
export function alertCarry(al: number): number {
  return (al & AL_CARRY) >> AL_CARRY_SHIFT;
}

/** (guard-models G6n) The look seed (0-127) in a wire `al`. */
export function alertLook(al: number): number {
  return (al & AL_LOOK) >> AL_LOOK_SHIFT;
}

/** (32, guard-ai S9) The `bark` event's `b` for the security desk's camera line (its text in `t`; `id` the camera). */
export const BARK_CAM = 254;
/** (32) The `bark` event's `b` for a line said verbatim by guard `id` (a talking pair's line: its text in `t`). */
export const BARK_TEXT = 255;

/** (32, guard-ai S9) The confirm a client's round earns (`hitConfirm.kind`): killed, stopped by a helmet or vest
 *  (`deflect`, as the host's own hit marker), a head hit, a body hit; null when it did nothing (no confirm sent). */
export function hitConfirmKind(dealt: number, killed: boolean, deflect: boolean, head: boolean): 'hit' | 'head' | 'kill' | 'deflect' | null {
  if (killed) return 'kill';
  if (deflect) return 'deflect';
  if (dealt <= 0) return null;
  return head ? 'head' : 'hit';
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
  k: 'terminal' | 'cache' | 'switch' | 'alarm' | 'door' | 'intel' | 'charge' | 'revive' | 'medkitWall' | 'crate' | 'body';
  x: number;
  y: number;
  z: number;
  yaw: number;
  label: string;
  hold: number;
  reach: number;
  on: boolean;
  /** (30, marlow-final Q12) The hold's noise radius (m) when it is a noisy hold; absent: silent. */
  hn?: number;
  /** (coop-carry) A `body` item: the enemy id the body was (the client keeps his body by it). */
  e?: string;
  /** (coop-carry) A `body` item: the player carrying it (absent: lying when `on`; gone from the list: hidden). */
  by?: string;
}
export const ITEM_KINDS: readonly NetItem['k'][] = ['terminal', 'cache', 'switch', 'alarm', 'door', 'intel', 'charge', 'revive', 'medkitWall', 'crate', 'body'];
/** (coop-carry) The `use` id a client sends to put its carried body down (at its put down's hand-over). */
export const DROP_BODY_ID = 'drop-body';

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
  /** (32/37) `deflect`: the round was stopped by the guard's helmet or vest (guard-ai S12 / S9). */
  | { e: 'hitConfirm'; player: string; kind: 'hit' | 'head' | 'kill' | 'deflect' }
  /** (32/37, guard-ai S9) A guard's line as the host shows it: speaker `id` (a guard; with `BARK_CAM` a camera), `b` the
   *  bark event's index (`BARK_EVENTS`), `n` its line index, `u` the unit it names (0 none); `BARK_CAM` / `BARK_TEXT`
   *  carry the line in `t` (radio `r`). */
  | { e: 'bark'; id: string; b: number; n: number; u: number; r: boolean; t?: string }
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
  | { e: 'gadget'; player: string; kind: NetGadget; x: number; y: number; z: number }
  /** (39, LR16-5b) A swinging pendant's kick (`lampSway.ts`): light `id`, the host's sim time `t`, amplitude `a` (m) and
   *  heading `h` (rad), applied verbatim (`LightRegistry.swayImpulse`). */
  | { e: 'sway'; id: number; t: number; a: number; h: number };

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
  /** `mission`: Infiltration's. (mission-framework NET3) `sm`: Sector Ops' mission (`MissionDef.id`, the host's
   *  `?mission=`; absent / '': none), so a client starts in the mission's start section and follows the host's. */
  | { t: 'start'; mode: NetMode; map: string; seed: number; difficulty: Difficulty; time: number; mission: string; weather: WeatherChoice; bay?: number; sm?: string }
  | { t: 'pstate'; s: PlayerState }
  | { t: 'shot'; w: WeaponId; ox: number; oy: number; oz: number; dx: number; dy: number; dz: number; target: string; part: 'head' | 'body'; rt: number; dist: number; dmg: number }
  /** `pk` is a bitmask of available pickups (bit i = pickup i). `info` is plain text, segments split by '|'. */
  /** (optic-coop, CHECK-M B1) `trp`: the optic gaps (`BuiltLevel.opticPoints` indices) whose trap panel is open, sent
   *  with `doors` (on a change, every few seconds and at a rejoin), so a late joiner opens them too. */
  | { t: 'snap'; time: number; players: PlayerState[]; enemies: EnemyState[]; obj: string; info: string; pk: number; items?: NetItem[]; doors?: number[]; dcr?: number[]; trp?: number[]; bodies?: string[] }
  /** Client used a mirrored item (the host checks reach and that it is usable). (30, marlow-final Q12) `pulse`: not the
   *  use but one noise pulse of a noisy hold under way (its first moment, then every `HOLD_NOISE_PULSE` s); the host
   *  checks it the same way and its guards hear the item as for the host's own hold (`holdPulse.ts`). */
  | { t: 'use'; id: string; pulse?: true }
  /** (locomotion step 13) Client door peek: crack door `i` (or close its crack); the host checks reach, closed, unlocked. */
  | { t: 'door'; i: number; crack: boolean }
  /** (optic-coop, CHECK-M B1) Client OPEN TRAP: open the trap panel over optic gap `g` (index bound `OPTIC_POINT_MAX`);
   *  the host checks the gap has a closed trap and the client is in reach, opens it, and its snapshots' `trp` carry it. */
  | { t: 'panel'; g: number }
  /** Client takedown on a host enemy: seize it, finish it (lethal / not), or let go. `kind`: a course kind on `done`,
   *  `'assist'`, `'bluff'`, and (piano-knife S3) `'knife'` on every phase of a knife kill (the client's switch on). */
  | { t: 'td'; target: string; ph: 'start' | 'done' | 'abort'; lethal: boolean; kind?: string }
  /** (3.2.0 phase 5) A client asks for a team move with a braced partner (boost onto anchor `target` at `s`, the
   *  grip at `gy`), or ends the human ladder. */
  /** (mission NET) + the kit kinds `pull` / `shutter` (`TeamKind`); a kit request may claim a point (`lx`, `gy`, `lz`:
   *  the pull-up's catch point, `KitMove.claimsPoint`). `hangEnd` also ends a kit pair (`target` 0 'pull', 1 'drop'). */
  | { t: 'tmove'; kind: TeamKind | 'hangEnd' | 'end'; partner: string; target: number; s: number; gy: number; lx?: number; lz?: number }
  /** The host started a team move: `a` climbs, `b` is braced. (CT prototype B4, protocol 19) `throw`: `a` is thrown
   *  over the standing `b` to the landing `l` (feet; a `tmove` throw claims it as `lx`, `gy`, `lz`). */
  | { t: 'tstart'; kind: TeamKind; a: string; b: string; target: number; s: number; t0: number; l?: [number, number, number] }
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
  /** (mission NET) Client: one of its gadgets with no effect on the wire (`USE_ONLY_GADGETS`: frag, mine, sticky cam) was
   *  thrown or placed; the host's mode counts it (`onRemoteGadget`: a mission's No gadgets rule). */
  | { t: 'gused'; kind: UseOnlyGadget }
  | { t: 'ev'; events: NetEvent[] }
  /** Client grenade detonation (host validates distance and applies damage). */
  | { t: 'blast'; x: number; y: number; z: number }
  /** Training course state (host -> all): when it changes or every COURSE_SEND. */
  | ({ t: 'course' } & CourseWire)
  /** Sector Ops: the cameras' clock, jams and alarm stage (host -> all), on change and every 0.5 s; (24) the live
   *  section, locked door indices, cameras shot out and the revive syringes left; (34) the last section's rating `rt`. */
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
/** (mission NET) `tmove` kinds: every team move (the kit's too) and the two ends. */
const TMOVE_KINDS: readonly (TeamKind | 'hangEnd' | 'end')[] = [...TEAM_KINDS, 'hangEnd', 'end'];
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
    ...(num(v.t, 0, 1e9) !== null ? { t: num(v.t, 0, 1e9)! } : {}),
    ...(num(v.gph, 0, 1) !== null ? { gph: num(v.gph, 0, 1)! } : {}),
    ...(num(v.qs, 0, 2) !== null ? { qs: num(v.qs, 0, 2)! } : {}),
    ...(num(v.hs, 0, 20) !== null ? { hs: num(v.hs, 0, 20)! } : {}),
    ...(num(v.mo, 0, MOTION_WIRE.length - 1) !== null && num(v.mt, 0, 60) !== null ? { mo: Math.floor(num(v.mo, 0, MOTION_WIRE.length - 1)!), mt: num(v.mt, 0, 60)! } : {}),
    ...(num(v.ax, -100, 100) !== null && num(v.az, -100, 100) !== null ? { ax: num(v.ax, -100, 100)!, az: num(v.az, -100, 100)! } : {}),
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
  const out: EnemyState = { id: eid, k, x, y, z, yaw, st: Math.floor(num(v.st, 0, 3) ?? 0), hp: num(v.hp, 0, 1) ?? 1, al: Math.floor(num(v.al, 0, AL_MAX) ?? 0) };
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
  const item: NetItem = { id: iid, k, x, y, z, yaw: num(v.yaw, -10, 10) ?? 0, label: safeText(v.label, 24) || 'Use', hold: num(v.hold, 0, 10) ?? 0, reach: num(v.reach, 0.5, 4) ?? 1.8, on: v.on === true };
  // (30, Q12) a noisy hold's radius; absent, 0 or malformed reads as a silent item
  const hn = num(v.hn, 0, 30);
  if (hn) item.hn = hn;
  // (coop-carry) a body item's enemy id and carrier; junk drops the field only
  if (k === 'body') {
    const e = id(v.e);
    if (e) item.e = e;
    const by = id(v.by);
    if (by) item.by = by;
  }
  return item;
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
    case 'sway': {
      // (39) a light id (an integer in the lamp range), the host's sim time, an amplitude up to the cap, a heading
      if (typeof v.id !== 'number' || !Number.isInteger(v.id) || v.id < 0 || v.id >= LAMP_MAX) return null;
      const t = num(v.t, 0, 1e7);
      const a = num(v.a, 0, SWAY.maxAmp);
      const h = num(v.h, -Math.PI, Math.PI);
      if (t === null || a === null || h === null) return null;
      return { e: 'sway', id: v.id, t, a, h };
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
      const kind = oneOf(v.kind, ['hit', 'head', 'kill', 'deflect'] as const);
      return player && kind ? { e: 'hitConfirm', player, kind } : null;
    }
    case 'bark': {
      const sid = id(v.id);
      const b = num(v.b, 0, 255);
      if (!sid || b === null) return null;
      const bi = Math.floor(b);
      const text = bi === BARK_CAM || bi === BARK_TEXT;
      const t = text ? safeText(v.t, 120) : null;
      if (text && !t) return null;
      const ev: Extract<NetEvent, { e: 'bark' }> = { e: 'bark', id: sid, b: bi, n: Math.floor(num(v.n, 0, 63) ?? 0), u: Math.floor(num(v.u, 0, 99) ?? 0), r: v.r === true };
      if (t) ev.t = t;
      return ev;
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
/** (NET3) A Sector Ops mission id (`MissionDef.id`: camelCase, as `MISSION_WIRE.idMax`); anything else is '' (none). */
export const sectorMissionId = (v: unknown): string => (typeof v === 'string' && /^[A-Za-z0-9_-]{0,64}$/.test(v) ? v : '');

/** Cameras a `sec` field carries clocks for (SN60 caps a map at 12) and jammed / recovering devices it lists. */
const SEC_CAMS = 16;
const SEC_DEVS = 64;
/** (30 marlow-final N6) Scanner pairs a `sec` field carries. */
const SEC_SCANS = 8;

/** (B6; 30 marlow-final N6) One scanner pair's `sec.sc` entry: phases 0-3, occupied bits 0-3, progress in tenths of a s. */
function scanEntry(e: unknown): number[] {
  const a: unknown[] = Array.isArray(e) ? e : [];
  return [0, 1, 2, 3, 4].map((i) => Math.round(num(a[i], 0, i < 3 ? 3 : 100) ?? 0));
}

/** (CT prototype B3; 26 marlow-jammer) The `sec` field of a course / sector message: the jam list, each jammer's use and
 *  cooldown, the devices' jam timelines and the camera clocks, clamped. */
function secWire(v: unknown): { sec?: SecWire } {
  if (!isObj(v)) return {};
  const j = Array.isArray(v.j) ? v.j : [];
  const ch = Array.isArray(v.ch) ? v.ch : [];
  const cd = Array.isArray(v.cd) ? v.cd : [];
  // (30) one entry per scanner pair, in the map's order; an entry that is no array reads as idle (the order is kept)
  const sc: number[][] | null = Array.isArray(v.sc) ? v.sc.slice(0, SEC_SCANS).map(scanEntry) : null;
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
      ...(sc ? { sc } : {}),
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
  const rt = ratingWire(raw.rt);
  if (rt) out.rt = rt;
  // (marlow-polish, inside 42) every section rated so far, as the course message's `rh`
  const rh = courseRh(raw.rh).rh;
  if (rh) out.rh = rh;
  // (mission NET) the running mission (`missionWire.ts`; malformed: dropped)
  const ms = parseMissionWire(raw.ms);
  if (ms) out.ms = ms;
  // (piano-escape S4, inside the train's protocol) the scene's EMP press on the host's sim clock; malformed: dropped
  const ep = num(raw.ep, 0, EP_MAX);
  if (ep !== null) out.ep = ep;
  return out;
}

/** (piano-escape S4) The `sector` message's `ep` (the EMP press, host sim seconds): 0..this (about 115 days). */
export const EP_MAX = 1e7;

/** (34) Rating counts on the wire: whole numbers 0..RT_COUNT (synced takedowns, grant parts). */
export const RT_COUNT = 99;
const rtInt = (v: unknown, lo: number, hi: number): number => Math.round(num(v, lo, hi) ?? 0);

/**
 * (34, section-rating S3) The `sector` message's `rt`: the last rated section. `sec` -1..63 (-1 none yet), `marks` a
 * 0-15 bitmask, `synced` and the grant counts whole numbers 0..RT_COUNT. Not an object, or no numeric `sec`: dropped.
 */
export function ratingWire(v: unknown): SectorRatingWire | null {
  if (!isObj(v)) return null;
  const sec = num(v.sec, -1, 63);
  if (sec === null) return null;
  return {
    sec: Math.round(sec),
    marks: rtInt(v.marks, 0, 15),
    synced: rtInt(v.synced, 0, RT_COUNT),
    gadget: rtInt(v.gadget, 0, RT_COUNT),
    syringe: rtInt(v.syringe, 0, RT_COUNT),
    medkit: rtInt(v.medkit, 0, RT_COUNT),
    alarmStep: rtInt(v.alarmStep, 0, RT_COUNT),
  };
}

/** (37, section-rating S6) The `course` message's `rt` (the last rated Marlow set, `ratingWire`'s shape): dropped when bad. */
function courseRt(v: unknown): { rt?: SectorRatingWire } {
  const rt = ratingWire(v);
  return rt ? { rt } : {};
}

/** (37, S6 fix) The course message's `rh`: one entry per bay (index kept: a bad entry reads -1, unrated), at most
 *  RH_MAX; not an array: dropped. */
function courseRh(v: unknown): { rh?: number[] } {
  if (!Array.isArray(v)) return {};
  const rh: number[] = [];
  for (const x of v.slice(0, RH_MAX)) {
    const n = num(x, -1, RH_HI);
    rh.push(n === null ? -1 : Math.round(n));
  }
  return { rh };
}

const COURSE_LIST = 256;
const PHASES: readonly AirlockPhase[] = ['open', 'waiting', 'ready', 'cycling', 'sealed'];
/** (J14 R1) A course retry's causes (`PackedCourse.rc`). */
const RETRY_CAUSES: readonly RetryCause[] = ['seen', 'caught', 'timer', 'out', 'down', 'other'];
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
    return { time: n0(o.time, 0, 1e6), detections: n0(o.detections, 0, 1e4), alarms: n0(o.alarms, 0, 1e4), knockouts: n0(o.knockouts, 0, 1e4), kills: n0(o.kills, 0, 1e4), revives: n0(o.revives, 0, 1e4), teamMoves: n0(o.teamMoves, 0, 1e4), bodies: n0(o.bodies, 0, 1e4), synced: Math.round(n0(o.synced, 0, 1e4)) };
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
    // (J14 R1) the live station, the retry count and the last retry (plain fields; an older host sends none)
    st: Math.round(n0(s.st, 0, 64)),
    rs: Math.round(n0(s.rs, 0, 1e6)),
    rt: Math.round(n0(s.rt, 0, 64)),
    rc: oneOf(s.rc, RETRY_CAUSES) ?? '',
  };
  const groups: [number, boolean][] = [];
  for (const x of arr(lights.groups)) {
    if (!Array.isArray(x)) continue;
    const g = num(x[0], -1, 4096);
    if (g !== null && typeof x[1] === 'boolean') groups.push([Math.round(g), x[1]]);
  }
  return { t: 'course', s: packed, locks: ints(raw.locks, 0, MAX_DOORS - 1, MAX_DOORS), anchors: ints(raw.anchors, 0, 1e5), lights: { groups, dead: ints(lights.dead, 0, 1e5, 1024) }, ref: safeText(raw.ref, 160) ?? '', rn: Math.round(n0(raw.rn, 0, 1e6)), rl: safeText(raw.rl, 160) ?? '', rln: Math.round(n0(raw.rln, 0, 1e6)), ...secWire(raw.sec), ...courseRt(raw.rt), ...courseRh(raw.rh) };
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
      if (!iid) return null;
      return raw.pulse === true ? { t: 'use', id: iid, pulse: true } : { t: 'use', id: iid };
    }
    case 'door': {
      const i = typeof raw.i === 'number' && Number.isInteger(raw.i) && raw.i >= 0 && raw.i < MAX_DOORS ? raw.i : null;
      const crack = bool(raw.crack);
      return i === null || crack === null ? null : { t: 'door', i, crack };
    }
    case 'panel': {
      const g = typeof raw.g === 'number' && Number.isInteger(raw.g) && raw.g >= 0 && raw.g < OPTIC_POINT_MAX ? raw.g : null;
      return g === null ? null : { t: 'panel', g };
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
    case 'gused': {
      // (mission NET) a client's frag / mine / sticky cam used (no effect message)
      const kind = oneOf(raw.kind, USE_ONLY_GADGETS);
      return kind ? { t: 'gused', kind } : null;
    }
    case 'ping': {
      const x = num(raw.x, -WORLD, WORLD);
      const y = num(raw.y, -50, 100);
      const z = num(raw.z, -WORLD, WORLD);
      if (x === null || y === null || z === null) return null;
      return { t: 'ping', x, y, z, target: id(raw.target) ?? '' };
    }
    case 'tmove': {
      const kind = oneOf(raw.kind, TMOVE_KINDS);
      const partner = raw.partner === '' ? '' : id(raw.partner);
      if (!kind || partner === null) return null;
      const out: Extract<Msg, { t: 'tmove' }> = { t: 'tmove', kind, partner, target: Math.floor(num(raw.target, -1, 1e5) ?? -1), s: num(raw.s, -500, 500) ?? 0, gy: num(raw.gy, -100, 200) ?? 0 };
      if (kind === 'throw' || kind === 'hang' || kind === 'rope') {
        const lx = num(raw.lx, -WORLD, WORLD);
        const lz = num(raw.lz, -WORLD, WORLD);
        if (lx === null || lz === null) return null;
        out.lx = lx;
        out.lz = lz;
      } else if (isKitKind(kind)) {
        // (mission NET) a kit request's claimed point is optional here (the move's host rule needs it or not); (coop-kit
        // K0) any kit kind (`isKitKind`): a part 2 request's `target` is its spot index (-1 none), `s` its phase
        const lx = num(raw.lx, -WORLD, WORLD);
        const lz = num(raw.lz, -WORLD, WORLD);
        if (lx !== null && lz !== null) {
          out.lx = lx;
          out.lz = lz;
        }
      }
      return out;
    }
    case 'tstart': {
      const kind = oneOf(raw.kind, TEAM_KINDS);
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
      } else if (isKitKind(kind) && raw.l !== undefined) {
        // (mission NET) a kit start carries `l` when its request claimed a point (the pull-up's catch point); (coop-kit K0)
        // any kit kind, its `target` the spot index and `s` the request's phase
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
      // (NET3) the sector mission rides only when set (a run with none: the message as before)
      const sm = sectorMissionId(raw.sm);
      return { t: 'start', mode, map, difficulty, seed: Math.floor(seed), time: num(raw.time, 0, 1e7) ?? 0, mission: mission(raw.mission), weather: oneOf(raw.weather, WEATHER_CHOICES) ?? 'clear', bay: Math.round(num(raw.bay, 1, 64) ?? 1), ...(sm ? { sm } : {}) };
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
      // (optic-coop, CHECK-M B1) open trap panels as optic gap indices: out-of-range entries dropped, never clamped
      if (Array.isArray(raw.trp)) {
        const ts: number[] = [];
        for (const g of raw.trp.slice(0, OPTIC_POINT_MAX)) {
          if (typeof g !== 'number' || !Number.isInteger(g) || g < 0 || g >= OPTIC_POINT_MAX) continue;
          if (!ts.includes(g)) ts.push(g);
        }
        out.trp = ts;
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
