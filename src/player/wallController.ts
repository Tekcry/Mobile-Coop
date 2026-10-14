/**
 * Back-to-wall (locomotion step 11, bible 5.3, A23). A pure core (no Babylon, no DOM, no `src/net`) and a thin adapter
 * that turns its output into the character controller's `MoveOverride`.
 *
 * Candidates are the level's `CoverSegment`s (the same faces the AI uses): high faces (>= HIGH_MIN) standing or
 * crouched, low faces (LOW_MIN..LOW_MAX) always crouched. The body line runs `standoff` (`coverStandoff`) out from the
 * face. States: off, entering (a 0.2 s settle onto the face, at most 0.9 m away: no snap from a distance, no glide),
 * on (the stick's along-wall component at the gear's pace, capped at gear 4; inside corners wrap; outside ends stop),
 * leaving (one short beat back to free movement).
 *
 * Frames: the body faces out from the wall (yaw from the face normal). The character's right is the face's -t
 * (`t` = a -> b), so `faceRight` is set while sliding towards a, and the end at b is the left edge.
 */
import { EDGE_MARGIN, type CoverSegment } from '../cover/coverData';
import { GEARS } from '../config/movement';
import { hyp2 } from '../core/mathx';
import type { CoverSpot } from '../game/tactics';
import type { MoveOverride } from './playerController';

export const WALL = {
  /** Enter: the body line point at most this far (m), the face within this angle of the move or look direction. */
  reach: 0.9,
  coneCos: Math.cos((100 * Math.PI) / 180),
  /** Settle onto the face (s): at least `enterTime`, plus `enterPerM` per metre of travel, at most `enterMax` (a
   *  step or two onto the wall, never a lunge: the peak pace stays near a walk and the feet keep up). */
  enterTime: 0.2,
  enterPerM: 0.3,
  enterMax: 0.45,
  /** Settle tracking gain (1/s) onto the eased path, on top of its own velocity (no lag, so no catch-up overshoot). */
  enterGain: 12,
  /** Stick held into a high face this long (s), at gear <= `stickGearMax`, enters too; into = dot(stick, -n). */
  stickTime: 0.35,
  stickGearMax: 4,
  stickInto: 0.7,
  /** Slide pace: the gear's cap, at most gear 4 (2.8 / 1.8 m/s, the old cover caps). */
  maxGear: 4,
  /** Pull away: outward stick over this for `pullTime` (s). */
  pullOut: 0.6,
  pullTime: 0.15,
  /** Leaving beat (s) before the core reports off. */
  leaveTime: 0.12,
  /** Segment ends this close (m) are joined (inside corner wrap, a flat continuation). */
  joinGap: 0.1,
  /** Stacked players: capsule centres at least 2 x 0.3 + 0.02 apart along one segment (D8). */
  stackGap: 0.62,
  /** Braking into an end (m/s^2; under the controller's cover decel 7). */
  brake: 5,
  /** Body-line correction gain (1/s). */
  hold: 8,
  /** Feet height window about the face base (m). */
  yBelow: 0.4,
  yAbove: 0.6,
  // --- (step 12) edge verbs (bible 5.3, A24, A50)
  /** Within this of an outside end (m): WALL_SUB edgeL / edgeR, the edge verbs. */
  edgeReach: 0.35,
  /** Peek: the stick toward the edge held this long at the end (s); the head and near shoulder out at most `peekOut`
   *  (m), the rig's lean amount `peekLean`, eased over `peekBlend` (s). */
  peekHold: 0.2,
  peekOut: 0.25,
  peekLean: 0.45,
  peekBlend: 0.2,
  /** Looking past the edge (look . edge direction) peeks too. */
  peekLook: 0.85,
  /** Lean-out aim: the body steps out past the edge (m), in over the draw (s), back in (s). */
  leanOut: 0.35,
  leanIn: 0.3,
  leanBack: 0.25,
  /** The rig's lean while leaning out (the near shoulder past the edge, with the aim). */
  leanLean: 0.3,
  /** Step round the corner: the stick toward the edge and into the wall (round it) held this long (s). */
  roundTime: 0.3,
  roundInto: 0.4,
  /** SWAT turn: a coplanar segment across a gap in this range (m); duration clamp(gap / pace x k, min, max) (s). */
  swatGapMin: 0.8,
  swatGapMax: 2.0,
  swatPace: 2.4,
  swatK: 1.15,
  swatMin: 0.5,
  swatMax: 0.8,
} as const;

/**
 * (step 12b, D9) The open side at a back-to-wall edge from WALL_SUB: -1 left (edgeL, the end at b), 1 right (edgeR).
 * Mid-wall (no edge bit) aim stays on the normal right side (1). Peek and lean-out always use the open side.
 */
export function openSide(sub: number): -1 | 1 {
  return sub & WALL_SUB.edgeL ? -1 : 1;
}

/**
 * (step 12b, D9) The weapon goes to the left hand (pistol: mirrored two-handed grip; rifle: left shoulder) while
 * peeking or leaning out at a left edge (`sub` WALL_SUB, `lk` LEAN_KIND). Rising over a low wall keeps the right hand.
 */
export function wallLeftHand(sub: number, lk: number): boolean {
  if (!(sub & WALL_SUB.edgeL)) return false;
  return (sub & WALL_SUB.peek) !== 0 || ((sub & WALL_SUB.lean) !== 0 && lk === LEAN_KIND.out);
}

/**
 * (step 12b, D10) Aim on a low wall: at an edge (`edge` +-1, `atEnd`), the stick toward the end (`toward` = stick .
 * edge direction) or, with the stick idle, the look toward the end (`lookToward` = look . edge direction) leans out
 * past the end, crouched (LEAN_KIND.out); mid-wall, the stick up (`up` = the stick's forward component) or away from
 * the end rises over the top (LEAN_KIND.over). No allocation.
 */
export function lowAimKind(edge: number, atEnd: boolean, toward: number, up: number, lookToward: number): number {
  if (edge === 0 || !atEnd) return LEAN_KIND.over;
  if (toward > LOW_AIM.stick && toward >= up) return LEAN_KIND.out;
  if (toward < -LOW_AIM.stick || up > LOW_AIM.stick) return LEAN_KIND.over;
  // stick idle (or a small push): the look decides
  return lookToward > LOW_AIM.look ? LEAN_KIND.out : LEAN_KIND.over;
}

/** (step 12b, D10) The head centre's ceiling in a low-wall side lean: the wall top less the head's half height and a
 *  margin, so the head sample (perception, light meter) stays below the top. */
export const LOW_HEAD_CLEAR = 0.14;
export function wallHeadCap(baseY: number, height: number): number {
  return baseY + height - LOW_HEAD_CLEAR;
}

/** (step 12b fix r2, light parity) The light meter's head sample from a posed head centre (hx, hy, hz) over the feet
 *  (px, py, pz): the horizontal offset and the body height whose head sample (`bodyLevel`, 0.95 of the height) lands
 *  on the head. The local player (its rig) and the host's remotes (their posed RemoteAvatar rig) both call it, so the
 *  light meter, perception's head point and the posed body agree on the wall (bible 5.1). Writes `out`. */
export function posedHeadSample(px: number, py: number, pz: number, hx: number, hy: number, hz: number, out: { ox: number; oz: number; h: number }): { ox: number; oz: number; h: number } {
  out.ox = hx - px;
  out.oz = hz - pz;
  out.h = Math.max(0.3, (hy - py) / 0.95);
  return out;
}

/** (step 12b fix r1, light parity) The head cap a remote's MoveState asks for: the low-wall side lean (`m` 'wall',
 *  `lk` 1, WALL_SUB.low) caps the head centre at `wallHeadCap` of its segment, else +Infinity (no cap). The remote's
 *  posed rig and the host's head sample (perception, light) both read it, as the local rig and sample read the cap. */
export function remoteWallHeadCap(m: string, lk: number | undefined, sub: number, seg: { y: number; height: number } | undefined): number {
  return seg && m === 'wall' && lk === LEAN_KIND.out && (sub & WALL_SUB.low) !== 0 ? wallHeadCap(seg.y, seg.height) : Infinity;
}

/** (step 12b, D10) `lowAimKind` thresholds: a stick push (magnitude along an axis) and the look toward the end
 *  (look . edge direction, about 45 deg off the wall line). */
export const LOW_AIM = { stick: 0.5, look: 0.7 } as const;

/** (step 12) SWAT turn duration for a gap (m): clamp(gap / 2.4 x 1.15, 0.5, 0.8) s (A24). */
export function swatDuration(gap: number): number {
  return Math.max(WALL.swatMin, Math.min(WALL.swatMax, (gap / WALL.swatPace) * WALL.swatK));
}

/** (step 12) The fastest average pace a SWAT turn can claim (m/s): the widest gap plus both edge margins over its
 *  duration (the host's speed check, validate.ts). */
export const SWAT_MAX_PACE = (WALL.swatGapMax + 2 * EDGE_MARGIN + 0.1) / swatDuration(WALL.swatGapMax);

/** (step 12) Lean kinds on the wall MoveState `lk` (A34): none, out past the edge, over the top (12b: 1 with `low`). */
export const LEAN_KIND = { none: 0, out: 1, over: 2 } as const;

/** MoveState `sub` bits for `wall` (u8): edge flags, peek and lean (step 12); `leftHand` is step 12b's (D9). */
export const WALL_SUB = { crouch: 1, faceRight: 2, edgeL: 4, edgeR: 8, peek: 16, lean: 32, low: 64, leftHand: 128 } as const;

/**
 * (step 12, light parity) The head's horizontal offset past the edge while peeking, from the wall MoveState alone
 * (`sub` WALL_SUB, the segment's tangent): `peekOut` toward the edge (edgeL = +t), else 0. The host samples a remote
 * player's light and exposure there (no extra bandwidth); the local body uses its own blended offset. `k` (0..1) is
 * the blend amount: the receiver derives it from its time since the peek bit came on (`peekBlend`), so the ease-in
 * matches the owner's; the ease-out keeps the bit set until the owner's head is back, so a remote reads the full
 * offset for up to `peekBlend` while easing out (deliberately conservative: the guards see at least as much).
 */
export function wallPeekOffset(m: string, sub: number, tx: number, tz: number, out: { x: number; z: number }, k = 1): { x: number; z: number } {
  const e = m !== 'wall' || !(sub & WALL_SUB.peek) ? 0 : sub & WALL_SUB.edgeL ? 1 : sub & WALL_SUB.edgeR ? -1 : 0;
  // (step 12 r1) the eased amount (the local body's smoothstep of its 0.2 s blend), from the receiver's time in peek
  const c = Math.max(0, Math.min(1, k));
  const pe = WALL.peekOut * c * c * (3 - 2 * c);
  out.x = e * tx * pe;
  out.z = e * tz * pe;
  return out;
}

export type WallPhase = 'off' | 'entering' | 'on' | 'leaving' | 'swat';

/** Per-segment joins at each end: -1 none; else the neighbour index, `kind` 1 = inside corner, 2 = flat continuation;
 *  `at` 0 = the neighbour's a end meets, 1 = its b end. */
export interface WallLinks {
  nA: Int32Array;
  nB: Int32Array;
  kA: Uint8Array;
  kB: Uint8Array;
  atA: Uint8Array;
  atB: Uint8Array;
  /** (step 12) SWAT targets at each outside end: a coplanar segment across a gap (`swatGap*` m) or -1, the gap (m),
   *  and which of its ends faces us (0 = a, 1 = b). */
  gA: Int32Array;
  gB: Int32Array;
  gapA: Float32Array;
  gapB: Float32Array;
  gatA: Uint8Array;
  gatB: Uint8Array;
}

/** Joins between segment ends within `WALL.joinGap` (built once per level). */
export function buildWallLinks(segs: readonly CoverSegment[]): WallLinks {
  const n = segs.length;
  const L: WallLinks = {
    nA: new Int32Array(n).fill(-1),
    nB: new Int32Array(n).fill(-1),
    kA: new Uint8Array(n),
    kB: new Uint8Array(n),
    atA: new Uint8Array(n),
    atB: new Uint8Array(n),
    gA: new Int32Array(n).fill(-1),
    gB: new Int32Array(n).fill(-1),
    gapA: new Float32Array(n),
    gapB: new Float32Array(n),
    gatA: new Uint8Array(n),
    gatB: new Uint8Array(n),
  };
  const g2 = WALL.joinGap * WALL.joinGap;
  for (let i = 0; i < n; i++) {
    const s = segs[i]!;
    for (let end = 0; end < 2; end++) {
      const ex = end ? s.bx : s.ax;
      const ez = end ? s.bz : s.az;
      // walking off this end goes along +t at b, -t at a
      const wx = end ? s.tx : -s.tx;
      const wz = end ? s.tz : -s.tz;
      let best = -1;
      let kind = 0;
      let at = 0;
      for (let j = 0; j < n && best < 0; j++) {
        if (j === i) continue;
        const o = segs[j]!;
        if (Math.abs(o.y - s.y) > 0.3) continue;
        for (let oe = 0; oe < 2; oe++) {
          const dx = (oe ? o.bx : o.ax) - ex;
          const dz = (oe ? o.bz : o.az) - ez;
          if (dx * dx + dz * dz > g2) continue;
          const nn = o.nx * s.nx + o.nz * s.nz;
          // flat: same facing, the neighbour carries on the way we walk off; inside: its face looks back at us
          if (nn > 0.95) {
            const ox = oe ? -o.tx : o.tx;
            const oz = oe ? -o.tz : o.tz;
            if (ox * wx + oz * wz > 0.95) {
              best = j;
              kind = 2;
              at = oe;
            }
          } else if (o.nx * wx + o.nz * wz < -0.5) {
            best = j;
            kind = 1;
            at = oe;
          }
          if (best >= 0) break;
        }
      }
      // (step 12) an outside end: a coplanar segment (same facing, on the same line) across a doorway-size gap
      let gs = -1;
      let gd = 0;
      let gat = 0;
      if (best < 0) {
        for (let j = 0; j < n; j++) {
          if (j === i) continue;
          const o = segs[j]!;
          if (Math.abs(o.y - s.y) > 0.3 || o.low !== s.low || o.nx * s.nx + o.nz * s.nz < 0.95) continue;
          for (let oe = 0; oe < 2; oe++) {
            const dx = (oe ? o.bx : o.ax) - ex;
            const dz = (oe ? o.bz : o.az) - ez;
            const ahead = dx * wx + dz * wz;
            if (Math.abs(dx * s.nx + dz * s.nz) > 0.15 || ahead < WALL.swatGapMin || ahead > WALL.swatGapMax) continue;
            // that end faces us: the segment runs on away from the gap
            const ox = oe ? -o.tx : o.tx;
            const oz = oe ? -o.tz : o.tz;
            if (ox * wx + oz * wz < 0.95) continue;
            if (gs < 0 || ahead < gd) {
              gs = j;
              gd = ahead;
              gat = oe;
            }
          }
        }
      }
      if (end) {
        L.gB[i] = gs;
        L.gapB[i] = gd;
        L.gatB[i] = gat;
      } else {
        L.gA[i] = gs;
        L.gapA[i] = gd;
        L.gatA[i] = gat;
      }
      if (end) {
        L.nB[i] = best;
        L.kB[i] = kind;
        L.atB[i] = at;
      } else {
        L.nA[i] = best;
        L.kA[i] = kind;
        L.atA[i] = at;
      }
    }
  }
  return L;
}

/** One step's input to the core (world space; reused by the caller). */
export interface WallInput {
  /** Feet position. */
  x: number;
  y: number;
  z: number;
  /** World stick (magnitude 0..1). */
  moveX: number;
  moveZ: number;
  /** Look (camera) direction, unit XZ. */
  lookX: number;
  lookZ: number;
  gear: number;
  /** Standing / crouched now (the stance taken onto a high face). */
  crouched: boolean;
  grounded: boolean;
  /** Context (`cover`) press this step and whether it is held. */
  context: boolean;
  contextHeld: boolean;
  /** Crouch press this step (toggles the stance on a high face). */
  crouchPressed: boolean;
  /** Something else wants the body: jump, sprint, a takedown, traversal (leaves at once). */
  leave: boolean;
  /** Entering is not allowed now (aiming down sights is fine; a committed move, an attach, a takedown is not). */
  blocked: boolean;
  /** `gameplay.wallToggle`: press on / press off (true) or hold (false). */
  toggle: boolean;
  /** (step 12) Aim held (the lean-out / over-the-top aim at an edge or on a low wall). */
  aim: boolean;
  /** (step 12b, D10) The stick's raw forward (up) component -1..1: up on a low wall rises over the top. */
  moveUp?: number;
}

export function emptyWallInput(): WallInput {
  return { x: 0, y: 0, z: 0, moveX: 0, moveZ: 0, lookX: 0, lookZ: 1, gear: 3, crouched: false, grounded: true, context: false, contextHeld: false, crouchPressed: false, leave: false, blocked: false, toggle: true, aim: false };
}

/** Clamp `s` so it keeps `WALL.stackGap` from every other player on the segment (`others[0..n)`, metres along it).
 *  A player already overlapping is pushed out on the side away from `dir`. No allocation. */
export function stackClamp(s: number, dir: number, others: ArrayLike<number>, n: number): number {
  const gap = WALL.stackGap;
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < n; i++) {
      const o = others[i]!;
      const d = s - o;
      if (Math.abs(d) >= gap) continue;
      s = d > 0 || (d === 0 && dir < 0) ? o + gap : o - gap;
    }
  }
  return s;
}

/** The pure back-to-wall state machine. */
export class WallCore {
  phase: WallPhase = 'off';
  /** Segment index (level order) or -1, metres along it, facing along the wall (+1 towards b). */
  seg = -1;
  s = 0;
  dir = 1;
  crouch = false;
  low = false;
  /** At an outside end: -1 at a, +1 at b, 0 mid-wall. */
  edge = 0;
  /** Time in the current phase, stick-into and pull-away timers (s). */
  t = 0;
  intoT = 0;
  pullT = 0;
  /** The stick entry is armed: false while the stick is held through a traversal, an attach, a fall or another
   *  blocking state, true again once the stick is released (A48: walking off a roof or a ladder top with the stick
   *  held forward never lands into a back-to-wall entry). */
  stickArmed = true;
  /** (step 11 r3, D7) Entered by the stick held into the face (not the context press): in hold mode it stays while the
   *  stick is held; the context button's release rule applies to context entries only. */
  stickEntry = false;
  /** Slide speed along +t this step (m/s), the body-line target and the facing. */
  v = 0;
  tx = 0;
  tz = 0;
  yaw = 0;
  /** Desired horizontal velocity for the controller. */
  vx = 0;
  vz = 0;
  /** Seconds on the wall (the AI's `coverT`). */
  onT = 0;
  /** Other players on this segment (metres along it) for stacking; filled by the caller each step. */
  readonly others = new Float64Array(8);
  othersN = 0;
  /** After an inside-corner wrap the held stick keeps its sense until released. */
  private latch = 0;
  private fromX = 0;
  private fromZ = 0;
  /** This entry's settle time (s). */
  enterDur: number = WALL.enterTime;
  readonly spot: CoverSpot = { nx: 0, nz: 1, low: false, x: 0, z: 0 };
  count = { enter: 0, leave: 0, wrap: 0, swat: 0, peek: 0 };
  // --- (step 12) edge verbs
  /** Peek: the stick-toward-edge timer (s), the eased amount 0..1, whether it is on. */
  peekT = 0;
  peek = 0;
  peekOn = false;
  /** Lean-out / over-the-top aim amount 0..1 and its kind (`LEAN_KIND`; kept while `lean` > 0). */
  lean = 0;
  lk = 0;
  /** Step-round timer (s). */
  roundT = 0;
  /** The body's offset past the edge (m along +t) from the lean, and the head's from the peek (world XZ): the light
   *  meter samples there (light parity, bible 5.1). */
  leanS = 0;
  /** `leanS` at the step's start (the step's own lean move is fed forward, A50). */
  private leanS0 = 0;
  exX = 0;
  exZ = 0;
  /** SWAT turn: the committed move (from, to on the body lines, duration, time), its target and a wrapping counter. */
  swatN = 0;
  swatT = 0;
  swatDur = 0;
  swatGap = 0;
  readonly swatFrom = { x: 0, y: 0, z: 0 };
  readonly swatTo = { x: 0, y: 0, z: 0 };
  private swatSeg = -1;
  private swatS = 0;
  private swatDir = 1;
  lastLeave = '';

  constructor(
    readonly segs: readonly CoverSegment[],
    readonly links: WallLinks,
    readonly standoff: number,
  ) {}

  get active(): boolean {
    return this.phase === 'entering' || this.phase === 'on' || this.phase === 'swat';
  }

  /** At an outside end (edge != 0) and stopped on it. */
  get atEnd(): boolean {
    if (this.edge === 0 || this.seg < 0) return false;
    return Math.abs(this.s - this.range(this.seg, this.edge > 0 ? 1 : 0)) < 0.03;
  }

  /** A SWAT target across the gap at the current edge (segment index or -1). */
  get swatTarget(): number {
    if (this.edge === 0 || this.seg < 0) return -1;
    return this.edge > 0 ? this.links.gB[this.seg]! : this.links.gA[this.seg]!;
  }

  /** Body-line point at `s` on segment `i` -> (tx, tz). */
  private point(i: number, s: number): void {
    const g = this.segs[i]!;
    this.tx = g.ax + g.tx * s + g.nx * this.standoff;
    this.tz = g.az + g.tz * s + g.nz * this.standoff;
  }

  private lo(g: CoverSegment): number {
    return Math.min(EDGE_MARGIN, g.len / 2);
  }

  private hi(g: CoverSegment): number {
    return Math.max(g.len - EDGE_MARGIN, g.len / 2);
  }

  /** Usable range on segment i: an inside corner stops at the other wall's body line, a flat join runs to the end. */
  private range(i: number, end: 0 | 1): number {
    const g = this.segs[i]!;
    const k = end ? this.links.kB[i]! : this.links.kA[i]!;
    if (k === 2) return end ? g.len : 0;
    if (k === 1) return end ? g.len - this.standoff : this.standoff;
    return end ? this.hi(g) : this.lo(g);
  }

  /** Best face for an entry from (x, y, z) towards the unit direction (dx, dz) (or the look); -1 = none. */
  find(x: number, y: number, z: number, dx: number, dz: number, lx: number, lz: number, highOnly: boolean, cosMin: number): number {
    let best = -1;
    let bestD: number = WALL.reach;
    for (let i = 0; i < this.segs.length; i++) {
      const g = this.segs[i]!;
      if (y < g.y - WALL.yBelow || y > g.y + WALL.yAbove) continue;
      if (highOnly && g.low) continue;
      const px = x - g.ax;
      const pz = z - g.az;
      const dist = px * g.nx + pz * g.nz;
      if (dist < -0.05 || dist > this.standoff + WALL.reach) continue;
      // facing: the face (-n) within the cone of the move or the look direction
      const fm = dx === 0 && dz === 0 ? -2 : -(g.nx * dx + g.nz * dz);
      const fl = -(g.nx * lx + g.nz * lz);
      if (fm < cosMin && fl < cosMin) continue;
      const s = Math.max(this.range(i, 0), Math.min(this.range(i, 1), px * g.tx + pz * g.tz));
      this.point(i, s);
      const d = hyp2(this.tx - x, this.tz - z);
      if (d <= bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  }

  /** Enter segment i from (x, z): the settle starts. */
  enter(i: number, x: number, z: number, crouched: boolean, dx: number, dz: number): void {
    const g = this.segs[i]!;
    this.seg = i;
    this.stickEntry = false;
    this.s = Math.max(this.range(i, 0), Math.min(this.range(i, 1), (x - g.ax) * g.tx + (z - g.az) * g.tz));
    this.s = Math.max(this.range(i, 0), Math.min(this.range(i, 1), stackClamp(this.s, 1, this.others, this.othersN)));
    this.low = g.low;
    this.crouch = g.low || crouched;
    const along = dx * g.tx + dz * g.tz;
    this.dir = along < -0.1 ? -1 : 1;
    this.phase = 'entering';
    this.t = 0;
    this.v = 0;
    this.edge = 0;
    this.latch = 0;
    this.onT = 0;
    this.pullT = 0;
    this.fromX = x;
    this.fromZ = z;
    this.point(i, this.s);
    this.enterDur = Math.min(WALL.enterMax, WALL.enterTime + WALL.enterPerM * hyp2(this.tx - x, this.tz - z));
    this.yaw = Math.atan2(g.nx, g.nz);
    this.count.enter++;
  }

  leave(why: string): void {
    if (!this.active) return;
    this.phase = 'leaving';
    this.t = 0;
    this.v = 0;
    this.vx = this.vz = 0;
    this.lastLeave = why;
    this.count.leave++;
    this.clearEdge();
  }

  private clearEdge(): void {
    this.peekT = this.roundT = 0;
    this.peek = this.lean = this.leanS = this.leanS0 = this.exX = this.exZ = 0;
    this.peekOn = false;
    this.lk = 0;
  }

  reset(): void {
    this.phase = 'off';
    this.seg = -1;
    this.v = this.vx = this.vz = 0;
    this.onT = 0;
    this.intoT = this.pullT = 0;
    this.edge = 0;
    this.clearEdge();
  }

  /** (step 12) Start the SWAT turn across the gap at the current edge (a crouched committed move, A24). */
  private startSwat(): void {
    const j = this.swatTarget;
    const end = this.edge > 0 ? 1 : 0;
    const L = this.links;
    const g = this.segs[this.seg]!;
    const o = this.segs[j]!;
    const at = end ? L.gatB[this.seg]! : L.gatA[this.seg]!;
    this.swatGap = end ? L.gapB[this.seg]! : L.gapA[this.seg]!;
    this.point(this.seg, this.s);
    this.swatFrom.x = this.tx;
    this.swatFrom.y = g.y;
    this.swatFrom.z = this.tz;
    this.swatSeg = j;
    this.swatS = this.range(j, at as 0 | 1);
    this.swatDir = at === 0 ? 1 : -1;
    this.point(j, this.swatS);
    this.swatTo.x = this.tx;
    this.swatTo.y = o.y;
    this.swatTo.z = this.tz;
    this.swatDur = swatDuration(this.swatGap);
    this.swatT = 0;
    this.swatN = (this.swatN + 1) & 255;
    this.phase = 'swat';
    this.crouch = true;
    this.v = 0;
    this.clearEdge();
    this.count.swat++;
  }

  /** One step of the SWAT turn: the eased path from the near edge to the far wall's end, then `on` there. */
  private swatStep(dt: number, i: WallInput): void {
    this.swatT += dt;
    const T = this.swatDur;
    const k = Math.min(1, this.swatT / T);
    const k0 = Math.max(0, (this.swatT - dt) / T);
    const de = (k * k * (3 - 2 * k) - k0 * k0 * (3 - 2 * k0)) / Math.max(dt, 1e-3);
    const e0 = k0 * k0 * (3 - 2 * k0);
    const kg = Math.min(WALL.enterGain, 0.5 / Math.max(dt, 1e-3));
    const f = this.swatFrom;
    const t = this.swatTo;
    this.vx = (t.x - f.x) * de + (f.x + (t.x - f.x) * e0 - i.x) * kg;
    this.vz = (t.z - f.z) * de + (f.z + (t.z - f.z) * e0 - i.z) * kg;
    const o = this.segs[this.swatSeg]!;
    this.yaw = Math.atan2(o.nx, o.nz);
    this.onT += dt;
    if (k >= 1) {
      this.seg = this.swatSeg;
      this.s = this.swatS;
      this.dir = this.swatDir;
      this.low = o.low;
      this.phase = 'on';
      this.t = 0;
      this.edge = 0;
      this.latch = 0;
      this.updateSpot(o);
    }
  }

  /** One fixed step. */
  update(dt: number, i: WallInput): void {
    const mag = hyp2(i.moveX, i.moveZ);
    if (this.phase === 'leaving') {
      this.t += dt;
      if (this.t >= WALL.leaveTime) this.reset();
      return;
    }
    if (this.phase === 'off') {
      if (mag <= 0.5) this.stickArmed = true;
      if (i.blocked || !i.grounded) {
        this.intoT = 0;
        if (mag > 0.5) this.stickArmed = false;
        return;
      }
      const ux = mag > 1e-3 ? i.moveX / mag : 0;
      const uz = mag > 1e-3 ? i.moveZ / mag : 0;
      if (i.context) {
        const k = this.find(i.x, i.y, i.z, ux, uz, i.lookX, i.lookZ, false, WALL.coneCos);
        if (k >= 0) this.enter(k, i.x, i.z, i.crouched, ux, uz);
        return;
      }
      // the stick held into a high face (gear <= 4) for 0.35 s
      if (mag > 0.5 && this.stickArmed && i.gear <= WALL.stickGearMax) {
        const k = this.find(i.x, i.y, i.z, ux, uz, ux, uz, true, WALL.stickInto);
        const g = k >= 0 ? this.segs[k]! : null;
        const near = g ? (i.x - g.ax) * g.nx + (i.z - g.az) * g.nz < this.standoff + 0.15 : false;
        this.intoT = near ? this.intoT + dt : 0;
        if (near && this.intoT >= WALL.stickTime) {
          this.intoT = 0;
          this.enter(k, i.x, i.z, i.crouched, ux, uz);
          this.stickEntry = true;
        }
      } else this.intoT = 0;
      return;
    }
    if (this.phase === 'swat') return this.swatStep(dt, i);
    const g = this.segs[this.seg]!;
    // leaving: another action, the context press again (toggle) or released (hold), the stick pulled away
    if (i.leave) return this.leave('action');
    // (step 12) SWAT turn: the context press at a doorway edge with the stick toward the gap
    if (i.context && this.phase === 'on' && this.atEnd && this.swatTarget >= 0 && this.lean === 0) {
      const ex = this.edge * g.tx;
      const ez = this.edge * g.tz;
      if (i.moveX * ex + i.moveZ * ez > 0.5) return this.startSwat();
    }
    if (i.toggle && i.context && this.t > 0) return this.leave('context');
    if (!i.toggle) {
      // hold mode (D7): a context entry stays while the button is held; a stick entry while the stick is held (holding
      // the button later hands it to the button)
      if (this.stickEntry && i.contextHeld) this.stickEntry = false;
      if (this.stickEntry ? mag < 0.3 && this.t > 0.05 : !i.contextHeld && this.t > 0.05) return this.leave(this.stickEntry ? 'stick' : 'context');
    }
    const out = i.moveX * g.nx + i.moveZ * g.nz;
    this.pullT = this.phase === 'on' && out > WALL.pullOut ? this.pullT + dt : 0;
    if (this.pullT >= WALL.pullTime) return this.leave('pull');
    if (i.crouchPressed && !g.low) this.crouch = !this.crouch;
    this.t += dt;
    this.onT += dt;
    this.yaw = Math.atan2(g.nx, g.nz);
    if (this.phase === 'entering') {
      // settle: from the entry point onto the body line (eased; never more than 0.9 m): the path's own velocity
      // plus a gentle pull onto it, so the capsule eases in and stops on the standoff (no lag, no overshoot)
      this.point(this.seg, this.s);
      const T = this.enterDur;
      const k = Math.min(1, this.t / T);
      const k0 = Math.max(0, (this.t - dt) / T);
      // this step's move along the eased path (exact for a controller that follows), plus a pull from wherever the
      // body is onto where the path was at the step's start
      const de = (k * k * (3 - 2 * k) - k0 * k0 * (3 - 2 * k0)) / Math.max(dt, 1e-3);
      const e0 = k0 * k0 * (3 - 2 * k0);
      const kg = Math.min(WALL.enterGain, 0.5 / Math.max(dt, 1e-3));
      this.vx = (this.tx - this.fromX) * de + (this.fromX + (this.tx - this.fromX) * e0 - i.x) * kg;
      this.vz = (this.tz - this.fromZ) * de + (this.fromZ + (this.tz - this.fromZ) * e0 - i.z) * kg;
      if (k >= 1) {
        this.phase = 'on';
        this.t = 0;
      }
      this.updateSpot(g);
      return;
    }
    // slide: the stick's along-wall component at the gear's pace (gear <= 4)
    let along = i.moveX * g.tx + i.moveZ * g.tz;
    if (this.latch !== 0) {
      if (mag < 0.3 || along * this.latch < -0.5) this.latch = 0;
      else along = this.latch * mag;
    }
    const cap = (this.crouch ? GEARS.crouch : GEARS.stand)[Math.max(1, Math.min(WALL.maxGear, i.gear)) - 1]!;
    this.v = Math.abs(along) > GEARS.deadZone && this.lean === 0 ? Math.max(-1, Math.min(1, along)) * cap : 0;
    if (this.v !== 0) this.dir = this.v > 0 ? 1 : -1;
    // from where the body is along the wall (no lag to catch up: the controller's own acceleration paces it)
    const sb = (i.x - g.ax) * g.tx + (i.z - g.az) * g.tz;
    const lo = this.range(this.seg, 0);
    const hi = this.range(this.seg, 1);
    // brake into an end (not a flat continuation) so the body stops on it, never past it
    const s0 = Math.abs(sb - this.s) < 0.5 ? sb : this.s;
    const room = this.v > 0 ? (this.links.kB[this.seg] === 2 ? Infinity : hi - s0) : this.links.kA[this.seg] === 2 ? Infinity : s0 - lo;
    const vMax = Math.sqrt(2 * WALL.brake * Math.max(0, room));
    if (Math.abs(this.v) > vMax) this.v = Math.sign(this.v) * vMax;
    let s = s0 + this.v * dt;
    this.edge = 0;
    if (s >= hi && this.v > 0) {
      if (!this.wrap(1)) {
        s = hi;
        this.v = 0;
        if (this.links.kB[this.seg] !== 1) this.edge = 1;
      } else s = this.s;
    } else if (s <= lo && this.v < 0) {
      if (!this.wrap(0)) {
        s = lo;
        this.v = 0;
        if (this.links.kA[this.seg] !== 1) this.edge = -1;
      } else s = this.s;
    } else s = Math.max(lo, Math.min(hi, s));
    if (this.seg >= 0) {
      const g2 = this.segs[this.seg]!;
      const sc = stackClamp(s, this.dir, this.others, this.othersN);
      if (sc !== s) this.v = 0;
      this.s = Math.max(this.range(this.seg, 0), Math.min(this.range(this.seg, 1), sc));
      // (step 12) an edge: within `edgeReach` of an outside end (no join there)
      // A short face (a pillar) with both outside ends in reach: the end the stick points at (else the nearer), so
      // the step round / peek follow the stick and never lock it on the far end
      this.edge = 0;
      const nearB = this.links.kB[this.seg] === 0 && this.hi(g2) - this.s <= WALL.edgeReach + 1e-4;
      const nearA = this.links.kA[this.seg] === 0 && this.s - this.lo(g2) <= WALL.edgeReach + 1e-4;
      if (nearA && nearB) {
        const st = i.moveX * g2.tx + i.moveZ * g2.tz;
        this.edge = st > GEARS.deadZone ? 1 : st < -GEARS.deadZone ? -1 : this.hi(g2) - this.s <= this.s - this.lo(g2) ? 1 : -1;
      } else if (nearB) this.edge = 1;
      else if (nearA) this.edge = -1;
    }
    if (this.edgeVerbs(dt, i)) return;
    // the controller follows the body line: the slide plus a correction onto it (leaning out: past the edge)
    const gs = this.segs[this.seg]!;
    this.point(this.seg, this.s + this.leanS);
    const k = Math.min(WALL.hold, 1 / Math.max(dt, 1e-3));
    // along: the slide (a stacked stop or an end holds the body where it is); across: onto the body line
    const off = this.standoff - ((i.x - gs.ax) * gs.nx + (i.z - gs.az) * gs.nz);
    const bodyS = (i.x - gs.ax) * gs.tx + (i.z - gs.az) * gs.tz;
    // stepping out / back in: the lean's own move this step plus a pull onto where it was at the step's start (as the
    // entry settle: no lag, so no overshoot past the 0.35 m)
    const leaning = this.leanS !== 0 || this.leanS0 !== 0;
    const ds = leaning
      ? (this.leanS - this.leanS0) / Math.max(dt, 1e-3) + (this.s + this.leanS0 - bodyS) * Math.min(WALL.enterGain, 0.5 / Math.max(dt, 1e-3))
      : this.v === 0
        ? (this.s - bodyS) * k
        : this.v;
    this.vx = ds * gs.tx + off * gs.nx * k;
    this.vz = ds * gs.tz + off * gs.nz * k;
    // leaning / rising to aim: the body turns with the aim (pivoting on the outer foot); else it faces out
    this.yaw = this.lean > 0 ? Math.atan2(i.lookX, i.lookZ) : Math.atan2(gs.nx, gs.nz);
    this.updateSpot(gs);
  }

  /**
   * (step 12) The edge verbs after the slide: peek (the stick toward the edge held 0.2 s, or the look past it), the
   * lean-out aim (aim at an edge: the body 0.35 m past it; on a low wall: over the top), the step round the corner
   * (the stick toward the edge and into the wall, 0.3 s: off the wall; the stick moves on, no auto move). Returns true
   * when it left the wall.
   */
  private edgeVerbs(dt: number, i: WallInput): boolean {
    const g = this.segs[this.seg]!;
    const ex = this.edge * g.tx;
    const ez = this.edge * g.tz;
    const toward = this.edge !== 0 ? i.moveX * ex + i.moveZ * ez : 0;
    const into = -(i.moveX * g.nx + i.moveZ * g.nz);
    const atEnd = this.atEnd;
    // lean-out aim (high wall at an edge: out past it); a low wall: at an edge the stick / look toward the end leans
    // out past it crouched (12b, D10), else over the top. A kind already running holds until the lean is back in.
    const lookToward = this.edge !== 0 ? i.lookX * ex + i.lookZ * ez : 0;
    const lowKind = this.lk !== LEAN_KIND.none ? this.lk : lowAimKind(this.edge, atEnd, toward, i.moveUp ?? 0, lookToward);
    const want = i.aim ? (this.low ? lowKind : atEnd ? LEAN_KIND.out : LEAN_KIND.none) : LEAN_KIND.none;
    if (want !== LEAN_KIND.none && (this.lk === LEAN_KIND.none || this.lk === want)) {
      this.lk = want;
      this.lean = Math.min(1, this.lean + dt / WALL.leanIn);
    } else {
      this.lean = Math.max(0, this.lean - dt / WALL.leanBack);
      if (this.lean === 0) this.lk = LEAN_KIND.none;
    }
    const le = this.lean * this.lean * (3 - 2 * this.lean);
    this.leanS0 = this.leanS;
    this.leanS = this.lk === LEAN_KIND.out ? this.edge * WALL.leanOut * le : 0;
    if (this.lean > 0) this.v = 0;
    // step round the corner: the stick round it (toward the edge and into the wall)
    this.roundT = atEnd && this.lean === 0 && toward > 0.5 && into > WALL.roundInto ? this.roundT + dt : 0;
    if (this.roundT >= WALL.roundTime) {
      this.leave('round');
      return true;
    }
    // peek: the stick toward the edge (not round it) held 0.2 s at the end, or the look past the edge; not while aiming
    const lookPast = this.edge !== 0 && i.lookX * ex + i.lookZ * ez > WALL.peekLook;
    this.peekT = atEnd && this.lean === 0 && toward > 0.5 && into <= WALL.roundInto ? this.peekT + dt : 0;
    const on = atEnd && this.lean === 0 && (this.peekT >= WALL.peekHold || lookPast);
    if (on && !this.peekOn) this.count.peek++;
    this.peekOn = on;
    this.peek = on ? Math.min(1, this.peek + dt / WALL.peekBlend) : Math.max(0, this.peek - dt / WALL.peekBlend);
    const pe = this.peek * this.peek * (3 - 2 * this.peek);
    this.exX = ex * WALL.peekOut * pe;
    this.exZ = ez * WALL.peekOut * pe;
    return false;
  }

  /** (step 12b, D9) The weapon in the left hand: peeking or leaning out at a left edge (WALL_SUB.leftHand). */
  get leftHand(): boolean {
    return this.phase === 'on' && wallLeftHand(this.sub(), this.lk);
  }

  /** The rig's lean (-1 left .. 1 right; the edge at b is the body's left) from the peek and the lean-out. */
  rigLean(): number {
    if (this.edge === 0) return 0;
    const pe = this.peek * this.peek * (3 - 2 * this.peek);
    const le = this.lk === LEAN_KIND.out ? this.lean * this.lean * (3 - 2 * this.lean) : 0;
    return (this.edge > 0 ? -1 : 1) * (WALL.peekLean * pe + WALL.leanLean * le);
  }

  /** Off the end (1 = b, 0 = a) onto a joined segment; false = an outside end (stop). */
  private wrap(end: 0 | 1): boolean {
    const L = this.links;
    const j = end ? L.nB[this.seg]! : L.nA[this.seg]!;
    if (j < 0) return false;
    const kind = end ? L.kB[this.seg]! : L.kA[this.seg]!;
    const at = end ? L.atB[this.seg]! : L.atA[this.seg]!;
    const o = this.segs[j]!;
    // leave the meeting end going away from it
    const nd = at === 0 ? 1 : -1;
    this.s = kind === 1 ? (at === 0 ? this.standoff : o.len - this.standoff) : at === 0 ? 0 : o.len;
    this.seg = j;
    this.dir = nd;
    this.low = o.low;
    if (o.low) this.crouch = true;
    if (kind === 1) {
      this.latch = nd;
      this.count.wrap++;
    }
    return true;
  }

  private updateSpot(g: CoverSegment): void {
    const p = this.spot;
    p.nx = g.nx;
    p.nz = g.nz;
    p.low = g.low;
    p.x = g.ax + g.tx * this.s + g.nx * this.standoff;
    p.z = g.az + g.tz * this.s + g.nz * this.standoff;
  }

  /** MoveState `sub` (WALL_SUB) for the current state. */
  sub(): number {
    return (
      (this.crouch ? WALL_SUB.crouch : 0) |
      (this.dir < 0 ? WALL_SUB.faceRight : 0) |
      (this.edge === 1 ? WALL_SUB.edgeL : 0) |
      (this.edge === -1 ? WALL_SUB.edgeR : 0) |
      (this.peek > 0 ? WALL_SUB.peek : 0) |
      (this.lean > 0 ? WALL_SUB.lean : 0) |
      (this.low ? WALL_SUB.low : 0)
    );
  }
}

/** Thin adapter: the core's output as the controller override (reused `ov`); null when the core is not driving. */
export function wallOverride(core: WallCore, ov: MoveOverride): MoveOverride | null {
  if (!core.active) return null;
  const v = (ov.velocity ??= { x: 0, z: 0 });
  v.x = core.vx;
  v.z = core.vz;
  ov.yaw = core.yaw;
  // (step 12) rising over a low wall to aim stands the body up; a SWAT turn stays crouched
  ov.crouch = core.phase === 'swat' ? true : core.lk === LEAN_KIND.over && core.lean > 0.5 ? false : core.crouch;
  ov.turnRate = WALL_TURN_RATE;
  // (the settle, the SWAT turn and the step out / back in follow their eased paths exactly)
  ov.glide = core.phase === 'entering' || core.phase === 'swat' || core.lean > 0;
  ov.run = false;
  ov.noise = 'crouched';
  return ov;
}

/** (step 12) The body's turn rate on a wall (rad/s): the owner's override and the remote copy's yaw ease. */
export const WALL_TURN_RATE = 12;

/** Head turn along the slide (rad, the look yaw toward the facing side). */
export const WALL_LOOK = 0.55;

/** How far the rig's root moves from the capsule onto the face so the back sits <= 3 cm off it (m). */
export function wallRootPush(standoff: number, bodyDepthHalf: number): number {
  return Math.max(0, standoff - bodyDepthHalf - 0.015);
}

/** Body-line position for a remote's `wall` MoveState (segment `a`, `s` metres along it) -> out (x, z, yaw). */
export function wallPoint(seg: CoverSegment, s: number, standoff: number, out: { x: number; z: number; yaw: number }): void {
  out.x = seg.ax + seg.tx * s + seg.nx * standoff;
  out.z = seg.az + seg.tz * s + seg.nz * standoff;
  out.yaw = Math.atan2(seg.nx, seg.nz);
}

/** (step 11) The free hand's wall contact: out along the face from the body by this (m), this far off the face (m). */
export const WALL_HAND = { out: 0.3, off: 0.03, y: 1.02, crouchY: 0.62 };

/**
 * (step 11) The free hand's point on the wall for a body at (x, y, z): on the face plane (n . p = `face`), out on the
 * free hand's own side (`side` = the weapon hand, 1 right: the left hand then goes on the face's +t, the character's
 * left), at the hip-to-waist height of the stance (`crouch` 0..1). Never across the body. Writes out (no allocation).
 */
export function wallHandPoint(x: number, y: number, z: number, nx: number, nz: number, tx: number, tz: number, face: number, side: number, crouch: number, out: { x: number; y: number; z: number }): void {
  const d = x * nx + z * nz - face - WALL_HAND.off;
  const o = WALL_HAND.out * (side < 0 ? -1 : 1);
  out.x = x - nx * d + tx * o;
  out.z = z - nz * d + tz * o;
  out.y = y + WALL_HAND.y + (WALL_HAND.crouchY - WALL_HAND.y) * crouch;
}
