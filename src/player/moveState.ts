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
  // (step 11) back to a wall (A2: the old snap-cover slot): `a` the cover segment (level order), `s` metres along it,
  // `sub` WALL_SUB (wallController)
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
  // (locomotion step 10) the elbow strike (committed, host-approved): `ph` 0..1 over its 0.9 s, `tid` the guard ('' = a whiff)
  'strike',
  // (locomotion step 12) the SWAT turn across a doorway gap (committed, client-owned like a traversal, A24): a crouched
  // move from one wall edge to the far wall (`c` from, to, dur), ends in `wall`
  'swat',
  // (locomotion step 13) the door peek: `a` the door index, `sub` bit 1 the hinge on the body's right, `ph` the door's
  // drawn crack (0..DOOR.crack); the crack itself is the door's (host-authoritative, snapshot `dcr`)
  'doorPeek',
] as const;
export type MoveMode = (typeof MOVE_MODES)[number];

export const ATTACHED_MODES: readonly MoveMode[] = ['ladder', 'pipeV', 'pipeH', 'ledge', 'duct', 'zipline', 'split', 'wallJump', 'rappel', 'fence'];
export const COMMITTED_MODES: readonly MoveMode[] = ['step', 'vault', 'mantle', 'drop', 'hop', 'roll', 'windowVault', 'landing', 'swat'];

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
  /** Speed gear 1..5. */
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
  /** (step 12, A34) Wall lean kind, 2 bits: 0 none, 1 out past the edge, 2 over the top (12b: 1 with WALL_SUB.low is
   *  the low-wall side lean). Wall states only. */
  lk?: number;
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
  return a.m !== b.m || a.sub !== b.sub || a.a !== b.a || a.tid !== b.tid || a.dw !== b.dw || (a.lk ?? 0) !== (b.lk ?? 0) || (a.c?.n ?? -1) !== (b.c?.n ?? -1);
}

const num = (v: unknown, lo: number, hi: number, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d);
const WORLD = 400;

/** (step 13) The receive path's level check for a door peek: a door index outside this level drops `mv`. */
export function dropBadDoorMove(s: { mv?: MoveState }, doorCount: number): boolean {
  const mv = s.mv;
  if (!mv || mv.m !== 'doorPeek' || (mv.a >= 0 && mv.a < doorCount)) return false;
  delete s.mv;
  return true;
}

/**
 * (step 11 r3) The receive path's level check: the wire decode bounds a wall `a` by the generic 4096 only, so a state
 * whose wall segment is not in this level's `coverSegments` (`segCount`) loses its `mv` (posed as ground), never a
 * stale face. Returns whether `mv` was dropped.
 */
export function dropBadWallMove(s: { mv?: MoveState }, segCount: number): boolean {
  const mv = s.mv;
  if (!mv || mv.m !== 'wall' || (mv.a >= 0 && mv.a < segCount)) return false;
  delete s.mv;
  return true;
}

/** Untrusted wire data -> a valid state (unknown mode: null; numbers clamped; anchor index in range or -1). */
export function sanitizeMoveState(raw: unknown, anchorCount = 4096, segCount = 4096, doorCount = 96): MoveState | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const mi = typeof o.m === 'number' ? Math.floor(o.m) : MOVE_MODES.indexOf(o.m as MoveMode);
  const m = MOVE_MODES[mi];
  if (!m) return null;
  let a = Math.floor(num(o.a, -1, 1e6, -1));
  if (m === 'wall') {
    // (step 11) a cover segment in range, else not a wall state
    if (a < 0 || a >= segCount) return null;
  } else if (m === 'doorPeek') {
    // (step 13) a door index in range (the level's door count, MAX_DOORS on the wire), else not a peek
    if (a < 0 || a >= doorCount) return null;
  } else if (a >= anchorCount || !isAttachedMode(m)) a = -1;
  const out: MoveState = {
    m,
    a,
    s: num(o.s, -WORLD, WORLD, 0),
    sub: m === 'wall' ? Math.floor(num(o.sub, 0, 0xff, 0)) : m === 'doorPeek' ? Math.floor(num(o.sub, 0, 1, 0)) : Math.floor(num(o.sub, 0, 0xffff, 0)),
    ph: num(o.ph, 0, 1, 0),
    tid: typeof o.tid === 'string' && /^[A-Za-z0-9_-]{0,40}$/.test(o.tid) ? o.tid : '',
    g: Math.floor(num(o.g, 1, 5, 3)),
    r: num(o.r, 0, 1, 0),
    ay: num(o.ay, -Math.PI, Math.PI, 0),
    dw: Math.round(num(o.dw, 0, 3, 0)),
  };
  if (isAttachedMode(m) && Array.isArray(o.gp) && o.gp.length === 4)
    out.gp = (o.gp as unknown[]).map((v) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(-WORLD, Math.min(WORLD, v)) : NaN)) as [number, number, number, number];
  if ((m === 'rappel' || m === 'fence') && typeof o.u === 'number') out.u = num(o.u, -10, 10, 0);
  if (typeof o.rd === 'number' && Number.isFinite(o.rd)) out.rd = Math.max(0, Math.min(2, Math.round(o.rd)));
  // (step 12) the lean kind: an integer 0..2 on a wall state, anything else is not carried
  if (m === 'wall' && typeof o.lk === 'number' && Number.isInteger(o.lk) && o.lk >= 0 && o.lk <= 2) out.lk = o.lk;
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
  if (mv.m === 'wall' && mv.lk) o.lk = mv.lk & 3;
  if (mv.u !== undefined) o.u = round(mv.u);
  if (mv.gp) o.gp = mv.gp.map((v) => (Number.isNaN(v) ? null : round(v)));
  if (mv.c) o.c = { ...mv.c };
  return o;
}

const round = (v: number): number => Math.round(v * 1000) / 1000;

/** The pose families a move state drives on the rig (`RigPose` subset). */
export interface MovePose {
  /** (step 11) Back to a wall (the flat-back stance). */
  wall: boolean;
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
  /** (step 12b, D9) The weapon in the left hand at a left wall edge (WALL_SUB.leftHand 128); the rig blends it. */
  leftHand: boolean;
}

export function emptyMovePose(): MovePose {
  return { wall: false, wallSide: 0, lean: 0, traverse: 'none', traverseT: 0, melee: -1, tumble: 0, drawn: false, leftHand: false };
}

/**
 * The pose families from a move state (attached, committed, takedown). `cadence` is the climb cycle of the
 * attach grips (`AttachGrips.cadence`). The local player and remotes both read it this way. `peek` (0..1, default the
 * peek bit) is the receiver's eased head-first peek (PC1 fix: the owner eases it over `WALL.peekBlend` with a smoothstep;
 * a copy that jumped to the full lean at the bit swung its pelvis faster than the owner's and re-planted its feet elsewhere).
 */
export function poseFromMoveState(mv: MoveState, cadence: number, out: MovePose, peek = mv.sub & 16 ? 1 : 0): MovePose {
  out.wall = false;
  out.wallSide = 0;
  out.lean = 0;
  out.traverse = 'none';
  out.traverseT = 0;
  out.melee = -1;
  out.tumble = 0;
  out.drawn = mv.dw !== 0;
  out.leftHand = false;
  switch (mv.m) {
    case 'wall':
      // (step 11) the flat-back stance, facing along the slide (WALL_SUB.faceRight = 2)
      out.wall = true;
      out.wallSide = mv.sub & 2 ? 1 : -1;
      // (step 12) at an edge: the head-first peek (WALL_SUB.peek 16) or the lean-out with the aim (lean 32, `lk` 1);
      // the edge at b (edgeL 4) is the body's left
      if ((peek > 0 || mv.sub & 32) && mv.sub & (4 | 8)) {
        const side = mv.sub & 4 ? -1 : 1;
        const pe = peek * peek * (3 - 2 * peek);
        out.lean = side * (0.45 * pe + (mv.sub & 32 && mv.lk === 1 ? 0.3 * Math.max(0.5, mv.r) : 0));
      }
      // (step 12b, D9) the open-left weapon hand (only with the left edge bit; D10's low side lean is `lk` 1 with `low`)
      out.leftHand = (mv.sub & 128) !== 0 && (mv.sub & 4) !== 0;
      return out;
    case 'doorPeek':
      // (step 13) the ground stance at the frame; the hand on the handle is a reach the remote sets from the door
      return out;
    case 'swat':
      // (step 12) a crouched run across the gap: the gait from the replayed path's speed (no traverse family)
      return out;
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
    case 'strike':
      // (step 10) the elbow arc with the hip turn (animGraph melee), the hands free (holstered)
      out.melee = mv.ph;
      out.drawn = false;
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
