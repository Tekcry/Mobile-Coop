/**
 * Networked movement state (3.2.0 Chaos Theory movement, phase 1; pure, unit-tested). What a player is doing with
 * their body - free movement, back to a wall, an attached state on an anchor, a committed move, a takedown - in a few
 * fields, so a co-op / PvP remote is posed by the same code as the local player (`poseFromMoveState`,
 * `AttachGrips`, `traversePath`) instead of guessed from positions.
 *
 * (Lives in `player/`, not `net/`: single player builds it every step and must never import `src/net` statically.)
 */
import type { TraverseKind } from '../anim/animGraph';

/** Every mode on the wire, in a fixed order (an index is a u8). Later phases append, never reorder. */
export const MOVE_MODES = [
  'ground',
  // back to a wall (A2: the old snap-cover slot, renamed; reserved - nothing sets it until step 11)
  'wall',
  // attached (`ATTACH` kinds)
  'ladder',
  'pipeV',
  'pipeH',
  'ledge',
  'duct',
  'zipline',
  // committed traversal
  'step',
  'vault',
  'mantle',
  'drop',
  'hop',
  'roll',
  'windowVault',
  'landing',
  'takedown',
  // 3.2.0 phase 2
  'split',
  'wallJump',
  // 3.2.0 phase 3
  'rappel',
  'fence',
  // 3.2.0 phase 4: holding a guard (`tid`) in front as a hostage
  'grab',
  // 3.2.0 phase 5: team moves - braced for a team-mate, boosted up (committed), the human ladder (sub 1 top / 2 bottom,
  // `tid` the partner)
  'brace',
  'boost',
  'stacked',
] as const;
export type MoveMode = (typeof MOVE_MODES)[number];

export const ATTACHED_MODES: readonly MoveMode[] = ['ladder', 'pipeV', 'pipeH', 'ledge', 'duct', 'zipline', 'split', 'wallJump', 'rappel', 'fence'];
export const COMMITTED_MODES: readonly MoveMode[] = ['step', 'vault', 'mantle', 'drop', 'hop', 'roll', 'windowVault', 'landing'];

export const isAttachedMode = (m: MoveMode): boolean => ATTACHED_MODES.includes(m);
export const isCommittedMode = (m: MoveMode): boolean => COMMITTED_MODES.includes(m);

/** A committed move's start, sent once (a new `n`): the remote replays the same path from it (`traversePath`). */
export interface MoveCommit {
  /** Move counter (wraps at 256): a new value is a new move. */
  n: number;
  x0: number;
  y0: number;
  z0: number;
  x1: number;
  y1: number;
  z1: number;
  /** Top of the obstacle (vault arc) and the entry speed (m/s). */
  top: number;
  v: number;
  /** Duration (s). */
  dur: number;
}

export interface MoveState {
  m: MoveMode;
  /** Anchor index into `anchors.all` (attached modes) or -1. */
  a: number;
  /** Position along the anchor (m). */
  s: number;
  /** Sub-state bits (`ATTACH_SUB`; u16). */
  sub: number;
  /** Committed-move / attach blend progress 0..1. */
  ph: number;
  /** Takedown target id ('' = none). */
  tid: string;
  /** Speed gear 1..6. */
  g: number;
  /** Weapon raise 0..1 and the aim's twist from the body (rad): the upper body follows the aim when raised. */
  r: number;
  ay: number;
  /** (step 09) Draw phase (`weapons/drawState`): 0 holstered, 1 drawing, 2 drawn, 3 holstering. Every mode carries
   *  it; the host forces 0 while hands are busy (D8). Remotes take the weapon in hand from it. */
  dw: number;
  /** (3.2.0 phase 3) The attach controller's second axis: a rope's sideways offset, a fence's climb height (m). */
  u?: number;
  /** Weapon ready position (0 low, 1 high, 2 compressed; `WeaponCarry`), so the lowered gun is carried alike. */
  rd?: number;
  /**
   * Attached, still: the planted grips on the anchor's axis [hand L, hand R, foot L, foot R] (`AttachGrips.planted`;
   * NaN / null = swinging): the remote's hands and feet settle on the same rungs.
   */
  gp?: [number, number, number, number];
  c?: MoveCommit;
}

export function emptyMoveState(): MoveState {
  return { m: 'ground', a: -1, s: 0, sub: 0, ph: 0, tid: '', g: 3, r: 0, ay: 0, dw: 0 };
}

/**
 * Attached sub bits: the blend phase (2 bits), facing (+1), the exit pose (3 bits); (3.2.0) a horizontal pipe's
 * sub-state (2 bits, `PIPE_MODES`) and the one it is changing to (2 bits, 0 = none; `ph` is then the change's
 * progress).
 */
export const ATTACH_SUB = { phaseMask: 3, face: 4, exitShift: 3, pipeShift: 6, pipeToShift: 8 } as const;
export const ATTACH_PHASES = ['enter', 'on', 'exit'] as const;
/** Exit poses (attach sub bits 3..5): the family itself, a climb up, a mantle off a ladder top, through a vent,
 *  (3.2.0) the flip out of an inverted hang. */
export const EXIT_POSES = ['none', 'climbUp', 'mantle', 'ventDrop', 'drop', 'flip', 'fenceFlip'] as const;
export type ExitPose = (typeof EXIT_POSES)[number];
export const PIPE_MODES = ['hands', 'legsUp', 'inverted'] as const;
export type PipeModeName = (typeof PIPE_MODES)[number];

export function packAttachSub(phase: (typeof ATTACH_PHASES)[number], face: number, exit: ExitPose, pipe: PipeModeName = 'hands', pipeTo: PipeModeName | null = null): number {
  return (
    (ATTACH_PHASES.indexOf(phase) & 3) |
    (face > 0 ? ATTACH_SUB.face : 0) |
    (EXIT_POSES.indexOf(exit) << ATTACH_SUB.exitShift) |
    (PIPE_MODES.indexOf(pipe) << ATTACH_SUB.pipeShift) |
    ((pipeTo ? PIPE_MODES.indexOf(pipeTo) + 1 : 0) << ATTACH_SUB.pipeToShift)
  );
}

export function unpackAttachSub(sub: number): { phase: (typeof ATTACH_PHASES)[number]; face: 1 | -1; exit: ExitPose; pipe: PipeModeName; pipeTo: PipeModeName | null } {
  const to = (sub >> ATTACH_SUB.pipeToShift) & 3;
  return {
    phase: ATTACH_PHASES[Math.min(2, sub & ATTACH_SUB.phaseMask)]!,
    face: sub & ATTACH_SUB.face ? 1 : -1,
    exit: EXIT_POSES[Math.min(EXIT_POSES.length - 1, (sub >> ATTACH_SUB.exitShift) & 7)]!,
    pipe: PIPE_MODES[Math.min(2, (sub >> ATTACH_SUB.pipeShift) & 3)]!,
    pipeTo: to > 0 ? PIPE_MODES[Math.min(2, to - 1)]! : null,
  };
}

/** Pipe tumble (rad) per sub-state (as `attach.ts` `PIPE_TUMBLE`; repeated so this file stays free of it). */
const TUMBLE: Record<PipeModeName, number> = { hands: 0, legsUp: -Math.PI / 2, inverted: Math.PI };

/**
 * A new mode or sub-state (not just a new position along it): the sender sends at once instead of waiting for its
 * next tick.
 */
export function moveChanged(a: MoveState, b: MoveState): boolean {
  return a.m !== b.m || a.sub !== b.sub || a.a !== b.a || a.tid !== b.tid || a.dw !== b.dw || (a.c?.n ?? -1) !== (b.c?.n ?? -1);
}

const num = (v: unknown, lo: number, hi: number, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d);
const WORLD = 400;

/** Untrusted wire data -> a valid state (unknown mode: null; numbers clamped; anchor index in range or -1). */
export function sanitizeMoveState(raw: unknown, anchorCount = 4096): MoveState | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const mi = typeof o.m === 'number' ? Math.floor(o.m) : MOVE_MODES.indexOf(o.m as MoveMode);
  const m = MOVE_MODES[mi];
  if (!m) return null;
  let a = Math.floor(num(o.a, -1, 1e6, -1));
  if (a >= anchorCount || !isAttachedMode(m)) a = -1;
  const out: MoveState = {
    m,
    a,
    s: num(o.s, -WORLD, WORLD, 0),
    sub: Math.floor(num(o.sub, 0, 0xffff, 0)),
    ph: num(o.ph, 0, 1, 0),
    tid: typeof o.tid === 'string' && /^[A-Za-z0-9_-]{0,40}$/.test(o.tid) ? o.tid : '',
    g: Math.floor(num(o.g, 1, 6, 3)),
    r: num(o.r, 0, 1, 0),
    ay: num(o.ay, -Math.PI, Math.PI, 0),
    dw: Math.round(num(o.dw, 0, 3, 0)),
  };
  if (isAttachedMode(m) && Array.isArray(o.gp) && o.gp.length === 4)
    out.gp = (o.gp as unknown[]).map((v) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(-WORLD, Math.min(WORLD, v)) : NaN)) as [number, number, number, number];
  if ((m === 'rappel' || m === 'fence') && typeof o.u === 'number') out.u = num(o.u, -10, 10, 0);
  if (typeof o.rd === 'number' && Number.isFinite(o.rd)) out.rd = Math.max(0, Math.min(2, Math.round(o.rd)));
  if (isAttachedMode(m) && a < 0) return null;
  const c = o.c;
  if (isCommittedMode(m) && typeof c === 'object' && c !== null && !Array.isArray(c)) {
    const k = c as Record<string, unknown>;
    out.c = {
      n: Math.floor(num(k.n, 0, 255, 0)),
      x0: num(k.x0, -WORLD, WORLD, 0),
      y0: num(k.y0, -50, 100, 0),
      z0: num(k.z0, -WORLD, WORLD, 0),
      x1: num(k.x1, -WORLD, WORLD, 0),
      y1: num(k.y1, -50, 100, 0),
      z1: num(k.z1, -WORLD, WORLD, 0),
      top: num(k.top, -50, 100, 0),
      v: num(k.v, 0, 12, 0),
      dur: num(k.dur, 0.05, 3, 0.5),
    };
  }
  return out;
}

/** Wire form: the mode as its index (the rest as is). */
export function packMoveState(mv: MoveState): Record<string, unknown> {
  const o: Record<string, unknown> = { m: MOVE_MODES.indexOf(mv.m), a: mv.a, s: round(mv.s), sub: mv.sub, ph: round(mv.ph), tid: mv.tid, g: mv.g, r: round(mv.r), ay: round(mv.ay), dw: mv.dw };
  if (mv.rd !== undefined) o.rd = mv.rd;
  if (mv.u !== undefined) o.u = round(mv.u);
  if (mv.gp) o.gp = mv.gp.map((v) => (Number.isNaN(v) ? null : round(v)));
  if (mv.c) o.c = { ...mv.c };
  return o;
}

const round = (v: number): number => Math.round(v * 1000) / 1000;

/** The pose families a move state drives on the rig (`RigPose` subset). */
export interface MovePose {
  /** Side of the wall (-1 left, 1 right, 0 none) and the lean around an edge (-1..1): back-to-wall (steps 11-12). */
  wallSide: number;
  lean: number;
  traverse: TraverseKind;
  traverseT: number;
  melee: number;
  /** Whole-body tumble (rad): a pipe hung legs up / inverted. */
  tumble: number;
  /** (step 09) The weapon in the hand (`dw` drawing, drawn or holstering); false = holstered. */
  drawn: boolean;
}

export function emptyMovePose(): MovePose {
  return { wallSide: 0, lean: 0, traverse: 'none', traverseT: 0, melee: -1, tumble: 0, drawn: false };
}

/**
 * The pose families from a move state (attached, committed, takedown). `cadence` is the climb cycle of the
 * attach grips (`AttachGrips.cadence`). The local player and remotes both read it this way.
 */
export function poseFromMoveState(mv: MoveState, cadence: number, out: MovePose): MovePose {
  out.wallSide = 0;
  out.lean = 0;
  out.traverse = 'none';
  out.traverseT = 0;
  out.melee = -1;
  out.tumble = 0;
  out.drawn = mv.dw !== 0;
  switch (mv.m) {
    case 'split':
      out.traverse = 'split';
      return out;
    case 'rappel': {
      const { phase, exit } = unpackAttachSub(mv.sub);
      out.traverse = phase === 'exit' && exit === 'mantle' ? 'mantle' : 'rappel';
      out.traverseT = phase === 'on' || out.traverse === 'mantle' ? mv.ph : 0;
      if (phase !== 'on' && out.traverse === 'rappel') out.traverseT = 0;
      return out;
    }
    case 'fence': {
      const { phase, exit } = unpackAttachSub(mv.sub);
      if (phase === 'exit' && exit === 'fenceFlip') {
        out.traverse = 'vault';
        out.traverseT = mv.ph;
      } else {
        out.traverse = 'climb';
        out.traverseT = ((mv.u ?? 0) * 1.6 + mv.s * 1.2) % 1;
      }
      return out;
    }
    case 'wallJump':
      out.traverse = 'wallKick';
      out.traverseT = mv.ph;
      return out;
    case 'ladder':
    case 'pipeV':
    case 'pipeH':
    case 'ledge':
    case 'duct':
    case 'zipline': {
      const { phase, exit, pipe, pipeTo } = unpackAttachSub(mv.sub);
      let fam: TraverseKind = mv.m === 'ladder' || mv.m === 'pipeV' ? 'climb' : mv.m === 'duct' ? 'crawl' : 'hang';
      if (mv.m === 'pipeH') {
        // a sub-state, or the change to the next one (its pose past half way); the tumble eases over
        const k = pipeTo && phase === 'on' ? mv.ph : 1;
        const now = pipeTo && k > 0.5 ? pipeTo : pipe;
        fam = now === 'legsUp' ? 'pipeLegs' : now === 'inverted' ? 'pipeInv' : 'hang';
        const e = k * k * (3 - 2 * k);
        out.tumble = pipeTo && phase === 'on' ? TUMBLE[pipe] + (TUMBLE[pipeTo] - TUMBLE[pipe]) * e : TUMBLE[pipe];
        if (phase === 'exit' && exit === 'flip') {
          out.traverse = 'hang';
          out.tumble = TUMBLE.inverted + Math.PI * (mv.ph * mv.ph * (3 - 2 * mv.ph));
          return out;
        }
      }
      if (phase === 'exit' && (exit === 'climbUp' || exit === 'mantle')) {
        out.traverse = exit;
        out.traverseT = mv.ph;
      } else if (phase === 'exit' && (exit === 'ventDrop' || exit === 'drop')) {
        out.traverse = exit;
        out.traverseT = mv.ph;
      } else {
        out.traverse = fam;
        out.traverseT = fam === 'hang' ? 0 : cadence;
      }
      return out;
    }
    case 'step':
    case 'vault':
    case 'mantle':
    case 'drop':
    case 'hop':
    case 'roll':
    case 'windowVault':
      out.traverse = mv.m;
      out.traverseT = mv.ph;
      return out;
    case 'takedown':
      out.melee = mv.ph;
      return out;
    case 'brace':
      out.traverse = 'brace';
      return out;
    case 'boost':
      out.traverse = 'climbUp';
      out.traverseT = mv.ph;
      return out;
    case 'stacked':
      // the bottom braces, the top stands on the shoulders
      if (mv.sub === 2) out.traverse = 'brace';
      return out;
    default:
      return out;
  }
}

/** Blend weight of the attach grips for an attached state's phase and progress (as the local controller). */
export function attachGripWeight(phase: (typeof ATTACH_PHASES)[number], progress: number): number {
  const s = (t: number): number => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  return phase === 'exit' ? 1 - s(progress / 0.7) : phase === 'enter' ? s((progress - 0.25) / 0.75) : 1;
}
