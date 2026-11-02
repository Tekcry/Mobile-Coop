/**
 * Networked movement state (3.2.0 Chaos Theory movement, phase 1; pure, unit-tested). What a player is doing with
 * their body - free movement, back to a wall, an attached state on an anchor, a committed move, a takedown - in a few
 * fields, so a co-op remote is posed by the same code as the local player (`poseFromMoveState`,
 * `AttachGrips`, `traversePath`) instead of guessed from positions.
 *
 * (Lives in `player/`, not `net/`: single player builds it every step and must never import `src/net` statically.)
 */
import type { TraverseKind } from '../anim/animGraph';
import { CLIMB_UP_CROUCH_K } from '../anim/clips/traverse';
import { GRAB_KILL_BLOW, killWarp, strikeWarp, TAKEDOWN_BLOW } from '../anim/strikeBody';
import { WALL } from './wallController';
import { OPTIC_POINT_MAX } from './opticCable';

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
  // (locomotion step 13) the door peek: `a` the door index, `sub` bit 1 the hinge on the body's right, `ph` the door's
  // drawn crack (0..DOOR.crack); the crack itself is the door's (host-authoritative, snapshot `dcr`)
  'doorPeek',
  // (ct-toolkit 3.2, optic-coop) the optic cable: `sub` OPTIC_SUBS (0 door, 1 hatch, 2 panel, 3 grille), `a` the door
  // index (sub 0) or the level's optic gap index, `ph` the cable fed out 0..1; the view at the tip stays local
  'optic',
] as const;
export type MoveMode = (typeof MOVE_MODES)[number];

export const ATTACHED_MODES: readonly MoveMode[] = ['ladder', 'pipeV', 'pipeH', 'ledge', 'duct', 'zipline', 'split', 'wallJump', 'rappel', 'fence'];
export const COMMITTED_MODES: readonly MoveMode[] = ['step', 'vault', 'mantle', 'drop', 'hop', 'roll', 'windowVault', 'landing'];

/**
 * (coop-kit K0) A remote kit partner's body (`boost` + a part 2 kit sub bit, game/teamMoves `KIT_SUB`; a test keeps the
 * bits equal): the role A placeholder traverse per move, played at the wire's `ph` ('none' = no traverse: crouched or
 * walking by its flags). Deadweight 64 (`grateUnder`: the crouched pass), Drop Catch 128 (`dropInto`: the drop), Chimney
 * Pair 256 (the ladder climb), Swing Pass 512 (`swingRide`: the throw's vault), Plank Bridge 1024 (walking with the
 * board). Starting choices (prototype); a KA slice's pose file may replace its move's entry at load.
 */
export const KIT_A_TRAVERSE: Record<number, TraverseKind> = { 64: 'none', 128: 'drop', 256: 'climb', 512: 'vault', 1024: 'none' };
/** The part 2 kit bits, in a fixed order (the lowest first). */
export const KIT_A_BITS: readonly number[] = [64, 128, 256, 512, 1024];

/** (pose-parity, protocol 36) `takedown` `sub` bit: the blow is running (`ph` its phase); clear = a choke or the lethal
 *  approach (the owner's `blowPh` -1: no arc). */
export const TAKEDOWN_SUB_BLOW = 1;
/** (piano-knife S3) takedown sub bit: a knife kill (the knife in hand); bits 4-16 its row (KNIFE_KILLS index, 7 =
 *  KNIFE_ROW_NONE: the switch-on move without a row); ph the move's phase over knifeSpan, s the approach's progress. */
export const TAKEDOWN_SUB_KNIFE = 2;
export const KNIFE_ROW_NONE = 7;

/** (piano-knife S3) A knife kill's `takedown` sub: the knife bit and the row (0-6 a `KNIFE_KILLS` index; anything else
 *  `KNIFE_ROW_NONE`) in bits 4-16. */
export function knifeSub(row: number): number {
  return TAKEDOWN_SUB_KNIFE | ((row >= 0 && row < KNIFE_ROW_NONE ? row : KNIFE_ROW_NONE) << 2);
}

/** (piano-knife S3) The knife row of a `takedown` sub: -1 without the knife bit, else 0-7 (`KNIFE_ROW_NONE`: no row). */
export function knifeRowOfSub(sub: number): number {
  return (sub & TAKEDOWN_SUB_KNIFE) === 0 ? -1 : (sub >> 2) & 7;
}

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
export const ATTACH_SUB = { phaseMask: 3, face: 4, exitShift: 3, pipeShift: 6, pipeToShift: 8, /** (CT prototype B2) a hanging player is offering the ledge relay */ relay: 1024 } as const;
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
/** (optic-coop) Mode `optic`: the highest sub (OPTIC_SUBS in `opticCable.ts`: door, hatch, panel, grille) and the
 *  wire's bound on a gap index (the receiver drops one its level does not have; defined in `opticCable.ts`, where the
 *  level builder caps its gaps at it). */
export const OPTIC_SUB_MAX = 3;
export { OPTIC_POINT_MAX };

/** (optic-coop) A partner's still crouch kneels in these modes (as the owner's controller: free on the ground, side-on
 *  on a wall, at a door frame, feeding the optic cable); the crouch bit and the stillness decide the rest. */
export function moveKneels(m: MoveMode | undefined): boolean {
  return m === 'ground' || m === 'wall' || m === 'doorPeek' || m === 'optic';
}

/** (optic-coop) The receive path's level check for the optic cable at a gap: a gap index this level does not have
 *  (`pointCount`) drops `mv`. Doors (sub 0) are `dropBadDoorMove`'s. */
export function dropBadOpticMove(s: { mv?: MoveState }, pointCount: number): boolean {
  const mv = s.mv;
  if (!mv || mv.m !== 'optic' || mv.sub === 0 || (mv.a >= 0 && mv.a < pointCount)) return false;
  delete s.mv;
  return true;
}

/** (step 13) The receive path's level check for a door peek: a door index outside this level drops `mv`. */
export function dropBadDoorMove(s: { mv?: MoveState }, doorCount: number): boolean {
  const mv = s.mv;
  // (optic-coop) the optic cable at a door (sub 0) is checked the same way
  const onDoor = mv && (mv.m === 'doorPeek' || (mv.m === 'optic' && mv.sub === 0));
  if (!mv || !onDoor || (mv.a >= 0 && mv.a < doorCount)) return false;
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
  } else if (m === 'optic') {
    // (optic-coop) a known sub; a door index in range (sub 0) or a gap index (the level check is the receiver's)
    const os = typeof o.sub === 'number' ? Math.floor(o.sub) : -1;
    if (os < 0 || os > OPTIC_SUB_MAX || a < 0 || a >= (os === 0 ? doorCount : OPTIC_POINT_MAX)) return null;
  } else if (a >= anchorCount || !isAttachedMode(m)) a = -1;
  const out: MoveState = {
    m,
    a,
    s: num(o.s, -WORLD, WORLD, 0),
    sub: m === 'wall' ? Math.floor(num(o.sub, 0, 0xff, 0)) : m === 'doorPeek' ? Math.floor(num(o.sub, 0, 1, 0)) : m === 'optic' ? Math.floor(num(o.sub, 0, OPTIC_SUB_MAX, 0)) : Math.floor(num(o.sub, 0, 0xffff, 0)),
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
  /** (doorPeek parity) Still, the feet settle on the stance spots (`RigPose.settleFeet`): the door peek. */
  settle: boolean;
}

export function emptyMovePose(): MovePose {
  return { wall: false, wallSide: 0, lean: 0, traverse: 'none', traverseT: 0, melee: -1, tumble: 0, drawn: false, leftHand: false, settle: false };
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
  out.settle = false;
  // (pose-parity) the left-shoulder aim off the wall is the player flag `PF.aimLeft` (every mode), read by the remote
  out.leftHand = false;
  switch (mv.m) {
    case 'wall':
      // (step 11) the flat-back stance, facing along the slide (WALL_SUB.faceRight = 2)
      out.wall = true;
      // (F4) at an edge the side is the open side (edgeL 4 = the body's left), as the owner's `wallFacing`
      out.wallSide = mv.sub & 4 ? -1 : mv.sub & 8 ? 1 : mv.sub & 2 ? 1 : -1;
      // (step 12, A3) at an edge: the head-first peek (WALL_SUB.peek 16); the edge at b (edgeL 4) is the body's left
      if (peek > 0 && mv.sub & (4 | 8)) {
        const side = mv.sub & 4 ? -1 : 1;
        const pe = peek * peek * (3 - 2 * peek);
        // (G6) the owner's `rigLean` (WALL.peekLean, AUDIT-WALLS row 9)
        out.lean = side * WALL.peekLean * pe;
      }
      // (step 12b, D9) the open-left weapon hand (only with the left edge bit)
      out.leftHand = (mv.sub & 128) !== 0 && (mv.sub & 4) !== 0;
      return out;
    case 'doorPeek':
      // (step 13) the ground stance at the frame; the hand on the handle is a reach the remote sets from the door
      // (doorPeek parity) the feet on the stance spots when still, as the owner (frame-rate independent)
      out.settle = true;
      return out;
    case 'optic':
      // (optic-coop) kneeling (or standing under a panel) still in front of the gap: the feet on the stance spots; the
      // feeding hand and the cable prop are set from the gap by the remote (`opticPlaceOf`)
      out.settle = true;
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
      // (ct-prototype G4) a drainpipe climbs as an inchworm (PIPE_CLIMB), not the ladder's cycle
      let fam: TraverseKind = mv.m === 'ladder' ? 'climb' : mv.m === 'pipeV' ? 'pipeClimb' : mv.m === 'duct' ? 'crawl' : 'hang';
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
        // (G4) a ladder's top-out plays the climb-up only as far as its crouch on top (attachController)
        out.traverseT = mv.m === 'ladder' && exit === 'climbUp' ? mv.ph * CLIMB_UP_CROUCH_K : mv.ph;
      } else if (phase === 'exit' && (exit === 'ventDrop' || exit === 'drop')) {
        out.traverse = exit;
        out.traverseT = mv.ph;
      } else if (phase === 'exit' && mv.m === 'duct') {
        // (G4) out of a wall vent (or back out of the entry): crawl out and rise to the crouch
        out.traverse = 'crawlOut';
        out.traverseT = mv.ph;
      } else {
        out.traverse = fam;
        // (G4) hanging from a lip the grips' cadence is the pendulum's swing (AttachGrips.cadence); a pipe / cable hangs plumb
        out.traverseT = fam === 'hang' ? (mv.m === 'ledge' ? cadence : 0) : cadence;
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
      // (anim-n4d, M1) the wire carries the blow's own phase, posed warped onto the kill as the local player's (killWarp)
      // (pose-parity) only while the blow runs (TAKEDOWN_SUB_BLOW): a choke and the lethal approach pose no arc (-1), as
      // the owner's `blowPh` -1 (the wire's `ph` is 0..1)
      out.melee = mv.sub & TAKEDOWN_SUB_BLOW ? killWarp(mv.ph, TAKEDOWN_BLOW) : -1;
      return out;
    case 'grab':
      // (G7) the kill from the hold (sub bit 1): the blow's arc at the finisher's progress; (anim-n4d) warped onto the kill
      if (mv.sub & 1) out.melee = killWarp(mv.ph, GRAB_KILL_BLOW);
      return out;
    case 'strike':
      // (step 10) the elbow arc with the hip turn (animGraph melee), the hands free (holstered); (anim-n4c M1) the wire
      // carries the strike's own phase, posed warped onto the hit as the local player's (strikeWarp)
      out.melee = strikeWarp(mv.ph);
      out.drawn = false;
      return out;
    case 'brace':
      // (CT prototype B4) sub bit 1 = the standing partner throw (offer / throwing): no cupped-hands pose
      if (!(mv.sub & 1)) out.traverse = 'brace';
      return out;
    case 'boost':
      // (B5) sub bit 2 = hanging head-first from the partner's hands (hang-down): the body turned over
      if (mv.sub & 2) {
        out.tumble = Math.PI;
        return out;
      }
      // (mission NET) the kit's partner, never the leg-up's climb-up: sub 16 (SHUTTER_SUB) crawls under (crouched by its
      // flags, no traverse); sub 8 (PULL_SUB) reaches up for the hands, then scrambles over (the wire's ph: its climb-up)
      if (mv.sub & 16) return out;
      if (mv.sub & 8) {
        out.traverse = mv.ph > 0 ? 'climbUp' : 'hang';
        out.traverseT = mv.ph;
        return out;
      }
      // (coop-kit K0) a part 2 kit move's partner: its role A placeholder traverse (`KIT_A_TRAVERSE`), never the leg-up's
      for (let i = 0; i < KIT_A_BITS.length; i++) {
        const bit = KIT_A_BITS[i]!;
        if ((mv.sub & bit) === 0) continue;
        const tr = KIT_A_TRAVERSE[bit] ?? 'none';
        if (tr !== 'none') {
          out.traverse = tr;
          out.traverseT = mv.ph;
        }
        return out;
      }
      // (B4) sub bit 1 = thrown over the partner: the vault pose along the arc
      out.traverse = mv.sub & 4 ? 'climb' : mv.sub & 1 ? 'vault' : 'climbUp'; // (B7) sub 4: on the partner's rope
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

/** (ct-prototype E2) A climb-up keeps the hands planted on the top until the knee is on: 1 - smooth((k - k0) / span).
 *  (F5) Released only after the knee plant (the CLIMB_UP clip plants it by k 0.56, the root is on the top by 0.59): 0.6 - 0.74.
 *  (G4) The retimed clip plants the knee by 0.36 (0.47 s), the root is on the top by 0.38: 0.38 - 0.5 (0.49 - 0.65 s).
 *  (traverse-fix-2, kept) The clip keeps the chest low over the lip now (shoulders within reach): the palms stay on it
 *  until the right foot is on the top (k 0.474), then let go over 0.475 - 0.643 (0.62 - 0.84 s), off before the crouch
 *  (CLIMB_UP_CROUCH_K 0.654, where a climb-up with the stick released ends). The longest release that fits keeps the
 *  wrists' per-frame velocity change under 3 cm (tests/climbHands.test.ts). Undo: { k0: 0.38, span: 0.12 } with the
 *  pre-traverse-fix-2 CLIMB_UP keys (the palms left the lip from k 0.32); the interim 0.52 / 0.12 slid the palms 4.7 cm. */
export const CLIMB_UP_HANDS = { k0: 0.475, span: 0.168 };

/** (G4) Crawling out of a duct the hands leave the duct floor over the first share of the exit (the clip's hands take over). */
export const CRAWL_OUT_HANDS = 0.25;

const smoothGrip = (t: number): number => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/**
 * Blend weight of the attach grips for an attached state's phase and progress (as the local controller). `climbUp`: a
 * pull-up from a hang (ledge, top of a drainpipe), the hands held until the knee is on the top (CLIMB_UP_HANDS).
 */
export function attachGripWeight(phase: (typeof ATTACH_PHASES)[number], progress: number, climbUp: boolean | 'crawlOut' = false): number {
  if (phase === 'exit' && climbUp === 'crawlOut') return 1 - smoothGrip(progress / CRAWL_OUT_HANDS);
  if (phase === 'exit' && climbUp) return 1 - smoothGrip((progress - CLIMB_UP_HANDS.k0) / CLIMB_UP_HANDS.span);
  return phase === 'exit' ? 1 - smoothGrip(progress / 0.7) : phase === 'enter' ? smoothGrip((progress - 0.25) / 0.75) : 1;
}

/** (ct-prototype E2) The feet's plant cap through a climb-up off a drainpipe: off the pipe by the chest at the lip (k 0.34
 *  since F5's longer climb-up: the same 0.44 s). (G4) The chest is at the lip by k 0.2 (0.26 s) now. */
export function climbUpFootWeight(climbUp: boolean, progress: number): number {
  return climbUp ? 1 - smoothGrip(progress / 0.2) : 1;
}
