/**
 * (anim-studio-2) The Test Chamber's co-op pairs (pure, Babylon-free; a dev aid): both roles of a team move posed on one
 * clock, without the network. Each pair is a loop (approach, the move with the game's own timing and paths, a hold,
 * a short pause): `pairPose(move, t, ...)` writes both roles at the same `t`, so the two rigs can never drift.
 *
 * The paths and timings are the game's (`game/teamMoves.ts`: `boostPath`, `relayPath`, `relaySlot`, `throwArc`,
 * `hangRootY`, `ropeTopY`; `TEAM` in `config/movement.ts`; the lip's hang pose `hangPoint`), so what the chamber shows is
 * what a co-op session plays; each role's state name is the team controller's, so the move sections
 * (`moveTune.ts`) select the same group (and contact window) as in real play.
 *
 * The station: the face of a block (`top` m high, `width` m wide) whose outward normal points along `yaw`; local
 * coordinates are `f` (out from the face) and `s` (along the face, to the right looking at it from outside). The
 * throw and the revive play on open floor `OPEN_F` m out from it.
 */
import { TEAM } from '../config/movement';
import { hyp2 } from '../core/mathx';
import { boostPath, hangRootY, relayPath, relaySlot, ropeTopPath, ropeTopY, throwArc } from '../game/teamMoves';
import { hangPoint, HANG, makeLedge, type Ledge } from '../world/anchors';
import type { TraverseKind } from './animGraph';
import { teamContactK, teamGroup, teamRoleGroup, type TeamMoveId } from './moveTune';
import { clearTeamPoseIn, newTeamPoseIn, ropeGripWorld, type TeamPoseIn, type TeamPoseMove } from './clips/team';
import { PAIR_TOP } from './chamberProps';

/** A team-move station: the block face (`x`, `z` its foot's middle; `yaw` the outward normal). */
export interface PairStation {
  x: number;
  z: number;
  yaw: number;
  top: number;
  width: number;
}

/** One role's pose at a pair's `t` (world). */
export interface PairRole {
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
  crouch: number;
  kneel: boolean;
  /** Downed: lying on the side (the remote avatar's downed pose). */
  lie: boolean;
  traverse: TraverseKind;
  traverseT: number;
  tumble: number;
  /** The hands' world grips: none, a lip (hooked) or the rope. */
  grip: 'none' | 'lip' | 'rope';
  hlx: number;
  hly: number;
  hlz: number;
  hrx: number;
  hry: number;
  hrz: number;
  /** The team controller's state this role is in ('none' outside the move), its tuner group and contact weight. */
  state: string;
  group: string;
  k: number;
  /** (anim-n4b, track A) The role's team pose input (clips/team.ts `TeamPoser`, as in real play). */
  tp: TeamPoseIn;
}

export function newPairRole(): PairRole {
  return { x: 0, y: 0, z: 0, yaw: 0, speed: 0, crouch: 0, kneel: false, lie: false, traverse: 'none', traverseT: 0, tumble: 0, grip: 'none', hlx: 0, hly: 0, hlz: 0, hrx: 0, hry: 0, hrz: 0, state: 'none', group: '', k: 0, tp: newTeamPoseIn() };
}

/** (anim-n4b, track A) A role's team pose input: the move, role, phase and the partner's feet / facing (no allocation). */
function teamIn(r: PairRole, move: TeamPoseMove, role: 'a' | 'b', k: number, p: PairRole): void {
  const i = r.tp;
  i.move = move;
  i.role = role;
  i.k = k;
  i.px = p.x;
  i.py = p.y;
  i.pz = p.z;
  i.pyaw = p.yaw;
}

/** The rope holder's input: the lip the rope goes over (the rope's line at the top). */
function ropeIn(b: PairRole, k: number, a: PairRole, rx: number, top: number, rz: number): void {
  teamIn(b, 'rope', 'b', k, a);
  b.tp.lx = rx;
  b.tp.ly = top + 0.05;
  b.tp.lz = rz;
}

/** Seconds a co-op revive takes (net/coopHost `REVIVE_TIME`; copied here: single player never imports src/net). */
export const REVIVE_TIME = 2.5;

/** The parts of each loop (s). The move's own part is the game's timing. */
export const PAIR_PARTS = {
  boost: { walk: 1.4, move: TEAM.boostTime, hold: 1.2, rest: 0.4 },
  relay: { walk: 1.2, move: TEAM.relayClimb, hold: 1.2, rest: 0.4 },
  throw: { walk: 1.0, move: TEAM.throwTime, hold: 0.8, rest: 0.3 },
  hang: { walk: 0.6, move: TEAM.hangLower, hold: 2.4, rest: 0.4 },
  rope: { walk: 1.0, move: ropeTopY(PAIR_TOP) / TEAM.ropeUp, hold: 0.6, rest: 0.3 },
  revive: { walk: 1.2, move: REVIVE_TIME, hold: 0.6, rest: 0.3 },
} as const;
/** (the hang-down's pull-up and the rope's top-out are extra parts after the hold / climb) */
const HANG_PULL = TEAM.hangPull;
const ROPE_TOP = TEAM.ropeTop;
/** (team-climb) The top-out path's shares (scratch: no allocation per frame). */
const ropeTopShares = { rise: 0, across: 0 };

/** A pair's loop length (s). */
export function pairCycle(m: TeamMoveId): number {
  const p = PAIR_PARTS[m];
  const extra = m === 'hang' ? HANG_PULL : m === 'rope' ? ROPE_TOP : 0;
  return p.walk + p.move + p.hold + extra + p.rest;
}

/** The readout's frame count for a pair (30 a second: a key step is one 30 fps frame). */
export function pairFrames(cycle: number): number {
  return Math.max(1, Math.round(cycle * 30));
}

// ---- helpers (no allocation) ----

function smooth(v: number): number {
  return v <= 0 ? 0 : v >= 1 ? 1 : v * v * (3 - 2 * v);
}

const W = { x: 0, z: 0 };
/** Station local (f out, s along to the right seen from outside) to world x / z (one shared result: copy it). */
function world(st: PairStation, f: number, s: number): { x: number; z: number } {
  const nx = Math.sin(st.yaw);
  const nz = Math.cos(st.yaw);
  // facing the wall (-n) the right is (-nz, nx)
  W.x = st.x + nx * f - nz * s;
  W.z = st.z + nz * f + nx * s;
  return W;
}

function place(r: PairRole, st: PairStation, f: number, s: number, y: number, yaw: number): void {
  const w = world(st, f, s);
  r.x = w.x;
  r.z = w.z;
  r.y = y;
  r.yaw = yaw;
}

function clear(r: PairRole): void {
  r.speed = 0;
  r.crouch = 0;
  r.kneel = false;
  r.lie = false;
  r.traverse = 'none';
  r.traverseT = 0;
  r.tumble = 0;
  r.grip = 'none';
  r.state = 'none';
  r.k = 0;
  clearTeamPoseIn(r.tp);
}

/** The lip of a station (its top front edge; the outward normal along the station's yaw), cached per station. */
const LEDGE_CACHE: { x: number; z: number; yaw: number; top: number; width: number; ledge: Ledge | null } = { x: NaN, z: NaN, yaw: NaN, top: NaN, width: NaN, ledge: null };
export function stationLedge(st: PairStation): Ledge {
  const c = LEDGE_CACHE;
  if (c.ledge && c.x === st.x && c.z === st.z && c.yaw === st.yaw && c.top === st.top && c.width === st.width) return c.ledge;
  // makeLedge's normal is (tz, -tx): the tangent is (-nz, nx) for the outward normal n
  const tx = -Math.cos(st.yaw);
  const tz = Math.sin(st.yaw);
  const h = st.width / 2;
  const l = { ...makeLedge(st.x - tx * h, st.z - tz * h, st.x + tx * h, st.z + tz * h, st.top), id: -1 } as Ledge;
  c.x = st.x;
  c.z = st.z;
  c.yaw = st.yaw;
  c.top = st.top;
  c.width = st.width;
  c.ledge = l;
  return l;
}

const HP = { x: 0, y: 0, z: 0, yaw: 0 };
const PT = { x: 0, y: 0, z: 0 };

/** Hands on the lip at `s` (shoulder width apart along it, on the edge). Facing the wall, the right hand is along +t. */
function lipHands(r: PairRole, l: Ledge, s: number, h: number): void {
  const span = 0.22 * (h / 1.75);
  const cx = l.a.x + l.tx * s;
  const cz = l.a.z + l.tz * s;
  r.grip = 'lip';
  r.hlx = cx - l.tx * span;
  r.hlz = cz - l.tz * span;
  r.hrx = cx + l.tx * span;
  r.hrz = cz + l.tz * span;
  r.hly = r.hry = l.top;
}

function hangOn(r: PairRole, l: Ledge, s: number, h: number, t: number): void {
  hangPoint(l, s, h, HP);
  r.x = HP.x;
  r.y = HP.y;
  r.z = HP.z;
  r.yaw = HP.yaw;
  r.traverse = 'hang';
  r.traverseT = (t * 0.45) % 1;
  lipHands(r, l, s, h);
}

/** Walk from (f0, s0) to (f1, s1) over `dur` s, at `t`, facing `yaw`; the pace eases in and out. */
function walk(r: PairRole, st: PairStation, t: number, dur: number, f0: number, s0: number, f1: number, s1: number, y: number, yaw: number): void {
  const k = Math.max(0, Math.min(1, t / dur));
  place(r, st, f0 + (f1 - f0) * k, s0 + (s1 - s0) * k, y, yaw);
  const d = hyp2(f1 - f0, s1 - s0);
  r.speed = k < 1 ? (d / dur) * Math.min(1, 4 * k * (1 - k) + 0.5) : 0;
}

const BOOST_B_F = 0.45;
const BOOST_A_F0 = 3.4;
const BOOST_A_F1 = BOOST_B_F + 1.0;
/** Open-floor pairs (the throw, the revive) play this far out from the face. */
const OPEN_F = 3.2;
/** The rope's line out from the face (m). */
const ROPE_F = 0.15;

/**
 * Both roles of `move` at `t` s into its loop (wrapped to the cycle) at a station, for a body `h` m tall. Role A climbs
 * / is thrown / is lowered / revives; role B boosts / hangs / throws / holds / lies downed. No allocation.
 */
export function pairPose(move: TeamMoveId, t: number, st: PairStation, h: number, a: PairRole, b: PairRole): void {
  const cyc = pairCycle(move);
  t = ((t % cyc) + cyc) % cyc;
  clear(a);
  clear(b);
  const P = PAIR_PARTS[move];
  const tm = t - P.walk;
  const out = st.yaw;
  const inw = st.yaw + Math.PI;
  const l = stationLedge(st);
  const mid = l.len / 2;
  const k = h / 1.75;
  /** Seconds into role A's committed part (the contact window). */
  let pt = 0;
  switch (move) {
    case 'boost': {
      // B: back to the wall, crouched, hands cupped (offer, then assist for the boost), then up again
      place(b, st, BOOST_B_F, 0, 0, out);
      const bx = b.x;
      const bz = b.z;
      if (tm < P.move) {
        b.traverse = 'brace';
        b.crouch = 1;
        b.state = tm < 0 ? 'offer' : 'assist';
      } else b.crouch = 1 - smooth((tm - P.move) / 0.5);
      if (tm < 0) walk(a, st, t, P.walk, BOOST_A_F0, 0, BOOST_A_F1, 0, 0, inw);
      else if (tm < P.move) {
        // the game's boost: in to the cupped hands, a foot up on them, tossed up to the grip (the lip's height)
        hangPoint(l, mid, h, HP);
        const fw = world(st, BOOST_A_F1, 0);
        boostPath(tm, fw.x, 0, fw.z, bx, 0, bz, HP.x, HP.y + HANG.drop * k, HP.z, HANG.drop * k, PT);
        a.x = PT.x;
        a.y = PT.y;
        a.z = PT.z;
        a.yaw = HP.yaw;
        a.traverse = 'climbUp';
        a.traverseT = Math.min(1, tm / P.move);
        a.state = 'boost';
        pt = tm;
      } else hangOn(a, l, mid, h, tm - P.move);
      // (anim-n4b, track A) B works the lift on the boost's clock; A's foot on B's hands, the push
      if (tm < P.move) teamIn(b, 'boost', 'b', tm < 0 ? -1 : tm / P.move, a);
      if (tm >= 0 && tm < P.move) teamIn(a, 'boost', 'a', tm / P.move, b);
      break;
    }
    case 'relay': {
      // B hangs on the lip offering the relay; A walks in under, climbs up the body to the slot beside, hangs
      hangOn(b, l, mid, h, t);
      b.state = tm < P.move ? (tm < 0 ? 'relayOffer' : 'relayHold') : 'none';
      const slot = relaySlot(mid, l.len);
      if (tm < 0) walk(a, st, t, P.walk, 2.8, 0.3, 0.6, 0.3, 0, inw);
      else if (tm < P.move) {
        hangPoint(l, slot, h, HP);
        const f = world(st, 0.6, 0.3);
        relayPath(tm, f.x, 0, f.z, HP.x, HP.y, HP.z, PT);
        a.x = PT.x;
        a.y = PT.y;
        a.z = PT.z;
        a.yaw = HP.yaw;
        a.traverse = 'climbUp';
        a.traverseT = Math.min(1, tm / P.move);
        a.state = 'relayUp';
        pt = tm;
      } else hangOn(a, l, slot, h, tm - P.move);
      break;
    }
    case 'throw': {
      // open floor: the run goes along the face (-s); B stands facing the runner (offer, throwing); A runs in from
      // 3.4 m, is thrown on over B and lands `TEAM.throwDist` past B, crouched
      const runYaw = out + Math.PI / 2;
      place(b, st, OPEN_F, 0, 0, out - Math.PI / 2);
      b.state = tm < 0 ? 'throwOffer' : tm < P.move ? 'throwAssist' : 'none';
      if (tm < 0) walk(a, st, t, P.walk, OPEN_F, 3.4, OPEN_F, 1.2, 0, runYaw);
      else if (tm < P.move) {
        const from = world(st, OPEN_F, 1.2);
        const fx = from.x;
        const fz = from.z;
        const to = world(st, OPEN_F, -TEAM.throwDist);
        throwArc(tm, fx, 0, fz, to.x, 0, to.z, PT);
        a.x = PT.x;
        a.y = PT.y;
        a.z = PT.z;
        a.yaw = runYaw;
        a.traverse = 'vault';
        a.traverseT = Math.min(1, tm / P.move);
        a.state = 'throw';
        pt = tm;
      } else {
        place(a, st, OPEN_F, -TEAM.throwDist, 0, runYaw);
        a.crouch = 1 - smooth((tm - P.move - 0.4) / 0.4);
      }
      // (anim-n4b, track A) B loads and throws on the throw's clock
      if (tm < P.move) teamIn(b, 'throw', 'b', tm < 0 ? -1 : tm / P.move, a);
      break;
    }
    case 'hang': {
      // on top: B crouched at the edge (offer, hold); A beside B is lowered head-first over the edge, hangs (the
      // holder's stick moves the depth), is pulled back up
      const top = st.top;
      place(b, st, -0.45, 0, top, out);
      b.traverse = 'brace';
      b.crouch = 1;
      const pull = P.walk + P.move + P.hold;
      b.state = tm < 0 ? 'hangOffer' : t < pull + HANG_PULL ? 'hangHold' : 'none';
      if (t >= pull + HANG_PULL) {
        b.traverse = 'none';
        b.crouch = 1 - smooth((t - pull - HANG_PULL) / 0.3);
      }
      const hp = world(st, 0.4, 0);
      const hx = hp.x;
      const hz = hp.z;
      const sp = world(st, -0.45, 0.8);
      const sx = sp.x;
      const sz = sp.z;
      if (tm < 0) {
        place(a, st, -0.45, 0.8, top, out);
        teamIn(b, 'hang', 'b', -1, a); // (anim-n4b, track A) the offer
        break;
      }
      const th = tm - P.move;
      const depth = th <= 0 ? TEAM.hangStart : Math.max(TEAM.hangMin, Math.min(TEAM.hangMax, TEAM.hangStart + 0.7 * Math.sin((th / P.hold) * Math.PI * 2)));
      const ry = hangRootY(top, depth);
      a.yaw = Math.atan2(hx - sx, hz - sz);
      if (tm < P.move) {
        const e = smooth(tm / P.move);
        a.x = sx + (hx - sx) * e;
        a.y = top + (ry - top) * e;
        a.z = sz + (hz - sz) * e;
        a.tumble = Math.PI;
        a.state = 'hangDown';
        pt = tm;
      } else if (th < P.hold) {
        a.x = hx;
        a.y = ry;
        a.z = hz;
        a.tumble = Math.PI;
        a.state = 'hanging';
        pt = th;
      } else if (t < pull + HANG_PULL) {
        const kk = Math.min(1, (t - pull) / HANG_PULL);
        const e = smooth(kk);
        const y0 = hangRootY(top, TEAM.hangStart);
        a.x = hx + (sx - hx) * e;
        a.y = y0 + (top - y0) * Math.min(1, e * 1.6);
        a.z = hz + (sz - hz) * e;
        a.tumble = kk < 0.5 ? Math.PI : 0;
        a.crouch = 1;
        a.state = 'hangPull';
        pt = t - pull;
      } else {
        place(a, st, -0.45, 0.8, top, out);
        a.crouch = 1 - smooth((t - pull - HANG_PULL) / 0.3);
      }
      // (anim-n4b, track A) B's hands on A's ankles while A is over the edge, let go as A rolls back over it
      if (b.state === 'hangHold') {
        teamIn(b, 'hang', 'b', a.state === 'hangPull' && a.tumble === 0 ? -1 : 1, a);
        b.tp.depth = depth;
      }
      break;
    }
    case 'rope': {
      // on top: B crouched at the edge holding the rope; A walks to its foot, climbs (the game's 1 m/s), tops out beside
      const top = st.top;
      place(b, st, -0.45, 0, top, out);
      b.traverse = 'brace';
      b.crouch = 1;
      const climbEnd = P.walk + P.move;
      b.state = tm < 0 ? 'ropeOffer' : t < climbEnd + ROPE_TOP ? 'ropeHold' : 'none';
      if (t >= climbEnd + ROPE_TOP) {
        b.traverse = 'none';
        b.crouch = 1 - smooth((t - climbEnd - ROPE_TOP) / 0.3);
      }
      // the rope hangs just off the face in front of B; A hangs 0.35 m off it on the outside, facing it
      const ty = ropeTopY(top);
      const rp = world(st, ROPE_F, 0);
      const rx = rp.x;
      const rz = rp.z;
      if (tm < 0) {
        walk(a, st, t, P.walk, 2.6, 0, ROPE_F + 0.35, 0, 0, inw);
        ropeIn(b, -1, a, rx, top, rz); // (anim-n4b, track A) the offer: the rope's own weight
        break;
      }
      if (tm < P.move) {
        const y = Math.min(ty, tm * TEAM.ropeUp);
        place(a, st, ROPE_F + 0.35, 0, y, inw);
        a.traverse = 'climb';
        a.traverseT = (((y / 0.7) % 1) + 1) % 1;
        a.state = 'ropeClimb';
        a.grip = 'rope';
        a.hlx = a.hrx = rx;
        a.hlz = a.hrz = rz;
        const lead = a.traverseT < 0.5;
        a.hly = y + (lead ? 1.75 : 1.5) * k;
        a.hry = y + (lead ? 1.5 : 1.75) * k;
        pt = tm;
      } else if (t < climbEnd + ROPE_TOP) {
        // over the edge to beside the holder: up first, then in (the game's top-out)
        const kk = Math.min(1, (t - climbEnd) / ROPE_TOP);
        const x0 = world(st, ROPE_F + 0.35, 0);
        const ax0 = x0.x;
        const az0 = x0.z;
        const to = world(st, -0.45, 0.8);
        // (team-climb) the game's eased path (ropeTopPath; from still: the chamber climb may wait at the top)
        const { rise, across } = ropeTopPath(kk, 0, ropeTopShares);
        a.x = ax0 + (to.x - ax0) * across;
        a.y = ty + (top - ty) * rise;
        a.z = az0 + (to.z - az0) * across;
        a.yaw = inw;
        a.traverse = 'climbUp';
        a.traverseT = kk;
        a.state = 'ropeTop';
        pt = t - climbEnd;
      } else place(a, st, -0.45, 0.8, top, out);
      // (anim-n4b, track A) B braced on the rope under A's weight while A climbs it
      if (b.state === 'ropeHold') ropeIn(b, a.state === 'ropeClimb' ? 1 : -1, a, rx, top, rz);
      break;
    }
    case 'revive': {
      // open floor: B lies downed; A walks in, kneels beside for the revive (the game's 2.5 s hold), stands; B gets up
      place(b, st, OPEN_F, -2.4, 0, out);
      b.lie = tm < P.move;
      b.state = b.lie ? 'downed' : 'none';
      if (tm < 0) walk(a, st, t, P.walk, OPEN_F + 2.6, -2.4, OPEN_F + 0.75, -2.4, 0, inw);
      else {
        place(a, st, OPEN_F + 0.75, -2.4, 0, inw);
        if (tm < P.move) {
          a.crouch = smooth(tm / 0.3);
          a.kneel = true;
          a.state = 'revive';
          pt = tm;
        } else a.crouch = 1 - smooth((tm - P.move) / 0.4);
      }
      break;
    }
  }
  a.group = teamRoleGroup(a.state);
  // (the downed partner's group shows in the chamber only: in a session your downed body is drawn by your partner's game)
  b.group = b.state === 'downed' ? teamGroup('revive', 'b') : teamRoleGroup(b.state);
  a.k = a.group !== '' ? teamContactK(a.state, pt, TEAM) : 0;
}

/** The rope of a rope pair: from the holder's hands at the edge down to its foot (world). */
export function ropeLine(st: PairStation, out: { x0: number; y0: number; z0: number; x1: number; y1: number; z1: number }): void {
  const w = world(st, ROPE_F, 0);
  out.x0 = out.x1 = w.x;
  out.z0 = out.z1 = w.z;
  out.y0 = st.top + 0.05;
  out.y1 = 0.02;
}

const RG = { x: 0, y: 0, z: 0 };
/** (anim-n4b, track A) The rope from the holder's hands to the lip (world), as the game's rope line; false when role B
 *  is not holding the rope. */
export function ropeHoldLine(b: PairRole, h: number, out: { x0: number; y0: number; z0: number; x1: number; y1: number; z1: number }): boolean {
  const i = b.tp;
  if (i.move !== 'rope' || i.role !== 'b') return false;
  ropeGripWorld(b.x, b.y, b.z, b.yaw, i.k >= 0 ? 1 : 0.25, h, RG);
  out.x0 = RG.x;
  out.y0 = RG.y;
  out.z0 = RG.z;
  out.x1 = i.lx;
  out.y1 = i.ly;
  out.z1 = i.lz;
  return true;
}
