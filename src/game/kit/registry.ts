/**
 * (mission KIT0) The co-op traversal kit's move registry (PLAN 4, M3 / M5): every campaign section forces a co-op move,
 * and each new kit move lives in its own file in this folder (KIT-PULL `pullUp.ts`, KIT-SHUT `shutter.ts`). A move file
 * calls `registerKitMove` at load; the team controller loads every file here (`import.meta.glob('./kit/*.ts')` in
 * teamController.ts) and hands its kit states to the move, so a new move plugs in without editing teamController,
 * teamMoves' shared checks or this file.
 *
 * What a move gets:
 * - kind: a `KitKind` (teamMoves.ts), its wire sub bit `KIT_SUB[kind]` (the `brace` / `boost` modes; NET carries it);
 * - states: its pose ids (`KIT_POSE_IDS`, anim/clips/team.ts) ARE the controller's states while it plays. Role b (holder)
 *   rides wire mode `brace`, role a (partner) `boost`; `<move>Offer` is the waiting offer (not `busy`, pose k < 0); a
 *   phase with a time in `times` has k = t / time, the rest k = 1 (held);
 * - the host's rule (`check`, called from `checkTeamRequest` after the rate / alive / self checks, before the ground
 *   check), `paired` (the host keeps the pair until an end, as the hang-down / rope) and `claimsPoint` (the request
 *   claims a point `lx, gy, lz` that the start carries as `l`): NET reads these for `tmove` / `tstart`;
 * - the local side through `KitHost` (the TeamController): `idle` before the built-in offers, `begin` on the host's
 *   start, `step` every fixed step in its states, `ended` on the partner's / host's end, `end` on the way out;
 * - per-controller run data (`newRun`, one per kind per controller: a host and a client page may share a process);
 * - the kit device hook: `KitDevices` per controller (`TeamController.devices`), filled by `setupDevices` once per level
 *   (a shutter's lift point and its gap); the host's checks and the guards' view read the same list.
 * Pure and Babylon-free (type imports only from the game side).
 */
import { hyp2 } from '../../core/mathx';
import { KIT_CHECKS, KIT_KINDS, KIT_SUB, type KitKind, type TeamDenial, type TeamRequest } from '../teamMoves';
import { KIT_POSE_OF, type KitPoseId, type TeamPoseRole } from '../../anim/clips/team';
import type { GameState } from '../gameState';
import type { TeamMate, TeamStart, TeamState } from '../teamController';

/** A kit move's controller state: its pose id. */
export type KitState = KitPoseId;

// ---- the kit device hook ----

/** A kit device in the level (a shutter's lift point): where it is used and its live state. */
export interface KitDevice {
  /** Unique in the level (e.g. 'shutter-w2-loading'). */
  readonly id: string;
  /** The move that uses it. */
  readonly kind: KitKind;
  /** The use point (feet) and the facing of its use side (rad). */
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** Horizontal reach of the use point (m). */
  reach: number;
  /** Its state (shutter: the opening's height under its edge, m; 0 = shut). */
  open: number;
  /** The player working it ('' = none). */
  user: string;
}

/** The kit devices of one level (per team controller). `near` allocates nothing. */
export class KitDevices {
  readonly list: KitDevice[] = [];
  /** Bumped on every add / remove / clear (a cache key for the wire and the guards' view). */
  version = 0;

  add(d: KitDevice): KitDevice {
    const i = this.list.findIndex((o) => o.id === d.id);
    if (i >= 0) this.list[i] = d;
    else this.list.push(d);
    this.version++;
    return d;
  }

  get(id: string): KitDevice | null {
    for (let i = 0; i < this.list.length; i++) if (this.list[i]!.id === id) return this.list[i]!;
    return null;
  }

  remove(id: string): boolean {
    const i = this.list.findIndex((o) => o.id === id);
    if (i < 0) return false;
    this.list.splice(i, 1);
    this.version++;
    return true;
  }

  clear(): void {
    if (!this.list.length) return;
    this.list.length = 0;
    this.version++;
  }

  /** The nearest device of `kind` whose use point is within its reach of (`x`, `z`) and `up` m of `y`; null = none. */
  near(kind: KitKind, x: number, y: number, z: number, up = 1): KitDevice | null {
    let best: KitDevice | null = null;
    let bd = Infinity;
    for (let i = 0; i < this.list.length; i++) {
      const d = this.list[i]!;
      if (d.kind !== kind || Math.abs(d.y - y) > up) continue;
      const r = hyp2(d.x - x, d.z - z);
      if (r <= d.reach && r < bd) {
        bd = r;
        best = d;
      }
    }
    return best;
  }
}

// ---- the controller side a move works through ----

/** What a kit move may use of the team controller (TeamController implements it). */
export interface KitHost {
  readonly g: GameState;
  state: TeamState;
  /** Seconds into the current part (the pose clock, `partT`). Reset it on each phase change. */
  t: number;
  /** The partner in the move ('' = none yet). */
  partner: string;
  /** The world prompt now (null = none) and where it is drawn. */
  prompt: string | null;
  readonly promptAt: { set(x: number, y: number, z: number): unknown };
  /** Counts (tests): an offer started, a denial. */
  readonly count: { offers: number; denied: number; ends: number };
  /** Why the last move ended early (tests, debugging). */
  endWhy: string;
  /** This controller's kit devices. */
  readonly devices: KitDevices;
  mates(): readonly TeamMate[];
  partnerPos(): { x: number; y: number; z: number } | null;
  partnerYaw(): number;
  /** A polite refusal (toast and prompt). */
  refused(text: string): void;
  /** Crouched, still, the brace pose (the leg-up offer's hold). */
  hold(): void;
  /** Ask the host for `kind` with `partner` (anchor `target` at `s`, height `gy`, a claimed point `lx, gy, lz`). */
  kitRequest(kind: KitKind, partner: string, target: number, s: number, gy: number, lx?: number, lz?: number): void;
  /** Back to free movement (calls the move's own `end` first; never call it from `end`). */
  end(aborted: boolean): void;
}

/** One kit move (its own file). `R` its per-controller run data. Every hook runs on the fixed step; no allocation. */
export interface KitMove<R extends object = object> {
  readonly kind: KitKind;
  /** Seconds of each timed phase (pose k = t / time); a state without one is held (k = 1) or an offer (k = -1). */
  readonly times?: Readonly<Partial<Record<KitState, number>>>;
  /** Host: the pair stays linked until an end (the hang-down / rope's `teamPairs`). */
  readonly paired?: boolean;
  /** Host: the request claims a point (`lx`, `gy`, `lz`) that the start carries as `l`. */
  readonly claimsPoint?: boolean;
  newRun(): R;
  /** Host: the request's rule (the shared rate / alive / self checks are done); null = allowed. */
  check(r: TeamRequest): TeamDenial | null;
  /** No move running (before the built-in offers): null = not here (the built-ins run), else whether it took the press.
   *  `free` = on the ground and unattached, `near` = the nearest mate (m). */
  idle?(h: KitHost, run: R, coopPressed: boolean, free: boolean, near: number): boolean | null;
  /** The host started this move with this player in it (`self`): set `h.state`, `h.partner`. */
  begin(h: KitHost, run: R, s: TeamStart, self: string): void;
  /** Every fixed step in one of its states. */
  step(h: KitHost, run: R, dt: number, coopPressed: boolean, bPressed: boolean, moveY: number): void;
  /** The partner or the host ended it (`k` the hang-style end); default: `h.end(false)`. */
  ended?(h: KitHost, run: R, k?: 'pull' | 'drop'): void;
  /** Leaving its states (aborted or done): undo overrides. Must not call `h.end`. */
  end?(h: KitHost, run: R, aborted: boolean): void;
  /** The team mode's `s` on the wire (shutter: the gap); default 0. */
  wireS?(h: KitHost, run: R): number;
  /** The shutter gap for the pose (m, NaN = none); default NaN. */
  gap?(h: KitHost, run: R): number;
  /** Once per level per controller: add this move's devices (the kit device hook). */
  setupDevices?(h: KitHost, run: R, devices: KitDevices, level: unknown): void;
}

// ---- the registry ----

const MOVES = new Map<KitKind, KitMove>();
const LIST: KitMove[] = [];

/** Register (or replace: hot reload, tests) a kit move; its host rule goes into `checkTeamRequest`. */
export function registerKitMove<R extends object>(m: KitMove<R>): void {
  if (!KIT_KINDS.includes(m.kind)) throw new Error(`kit: unknown kind ${String(m.kind)}`);
  const mv = m as unknown as KitMove;
  const old = MOVES.get(m.kind);
  if (old) LIST.splice(LIST.indexOf(old), 1, mv);
  else LIST.push(mv);
  MOVES.set(m.kind, mv);
  KIT_CHECKS[m.kind] = m.check;
}

/** Remove a kit move (tests). */
export function unregisterKitMove(kind: KitKind): void {
  const old = MOVES.get(kind);
  if (!old) return;
  LIST.splice(LIST.indexOf(old), 1);
  MOVES.delete(kind);
  delete KIT_CHECKS[kind];
}

/** The registered moves, in registration order (no copy: do not change it). */
export function kitMoves(): readonly KitMove[] {
  return LIST;
}

export function kitMove(kind: string): KitMove | null {
  return MOVES.get(kind as KitKind) ?? null;
}

export function isKitState(state: string): state is KitState {
  return KIT_POSE_OF.has(state);
}

/** The kind a kit state belongs to; null = not a kit state. */
export function kitKindOf(state: string): KitKind | null {
  return KIT_POSE_OF.get(state)?.move ?? null;
}

/** The registered move that owns a kit state; null = not a kit state or its move is not registered. */
export function kitMoveOfState(state: string): KitMove | null {
  const k = kitKindOf(state);
  return k ? (MOVES.get(k) ?? null) : null;
}

/** A kit state's role: b = holder / top, a = partner / climber. */
export function kitStateRole(state: KitState): TeamPoseRole {
  return KIT_POSE_OF.get(state)!.role;
}

/** A kit state's wire mode: the holder rides `brace`, the partner `boost` (as every team move). */
export function kitStateWireMode(state: KitState): 'brace' | 'boost' {
  return kitStateRole(state) === 'b' ? 'brace' : 'boost';
}

/** A kit move's waiting offer (`<move>Offer`): the body is held but the player is not `busy`. */
export function kitStateOffer(state: string): boolean {
  return state.endsWith('Offer') && KIT_POSE_OF.has(state);
}

/** A kit state's wire sub bit (its move's). */
export function kitStateSub(state: KitState): number {
  return KIT_SUB[KIT_POSE_OF.get(state)!.move];
}

/** The pose clock `k` of a kit state `t` s in: -1 offering, t / time for a timed phase (clamped 0..1), else 1 (held). */
export function kitPoseK(state: KitState, t: number, times?: Readonly<Partial<Record<KitState, number>>>): number {
  if (kitStateOffer(state)) return -1;
  const d = times?.[state];
  return d && d > 0 ? Math.max(0, Math.min(1, t / d)) : 1;
}
