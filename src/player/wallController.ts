/**
 * Back-to-wall (locomotion step 11, bible 5.3, A23). A pure core (no Babylon, no DOM, no `src/net`) and a thin adapter
 * that turns its output into the character controller's `MoveOverride`.
 *
 * Candidates are the level's `CoverSegment`s (the same faces the AI uses): high faces (>= HIGH_MIN) standing or
 * crouched, low faces (LOW_MIN..LOW_MAX) always crouched. The body line runs `standoff` (`coverStandoff`) out from the
 * face. States: off, entering (a 0.14-0.24 s settle onto the face, at most 0.5 m away: no snap from a distance, no glide),
 * on (the stick's along-wall component at the gear's pace, capped at gear 4; inside corners wrap; outside ends stop),
 * leaving (one short beat back to free movement).
 *
 * Frames: the body faces out from the wall (yaw from the face normal). The character's right is the face's -t
 * (`t` = a -> b), so `faceRight` is set while sliding towards a, and the end at b is the left edge.
 */
import { EDGE_MARGIN, type CoverSegment } from '../cover/coverData';
import { GEARS } from '../config/movement';

import { hyp2 } from '../core/mathx';
import { speedWallMul } from './speedTune';
import type { CoverSpot } from '../game/tactics';
import type { MoveOverride } from './playerController';

export const WALL = {
  /** Enter (playtest 2: was 0.9, snapped from too far and slid): the body line point at most this far (m), the face within this angle of the move or look direction. */
  reach: 0.5,
  coneCos: Math.cos((100 * Math.PI) / 180),
  /** Settle onto the face (s): at least `enterTime`, plus `enterPerM` per metre of travel, at most `enterMax` (a
   *  step or two onto the wall, never a lunge: the peak pace stays near a walk and the feet keep up). */
  enterTime: 0.14,
  enterPerM: 0.2,
  enterMax: 0.24,
  /** Settle tracking gain (1/s) onto the eased path, on top of its own velocity (no lag, so no catch-up overshoot). */
  enterGain: 12,
  /** (step 21w, M14, A83) The stick held into a high face no longer enters on its own: entry is an intentional context
   *  press only (walking into a wall never sticks to it). `WallCore.stickEnter` turns it back on (tests, a future
   *  option); then the stick held this long (s), at gear <= `stickGearMax`, enters; into = dot(stick, -n). */
  stickEntry: false,
  stickTime: 0.35,
  stickGearMax: 4,
  stickInto: 0.7,
  /** (A3, G35) Slide pace: the CT shuffle, `slideStand` / `slideCrouch` m/s at full stick along the wall, analog below
   *  (the along component past `slideDead`, rescaled 0..1), a little slower at the lower speed gears (`slideGear1` of it
   *  at gear 1, rising to 1 at `maxGear`). Starting values.
   *  (G6, AUDIT-WALLS row 2, replaces F1b's +50 %) standing 0.525 -> 0.39 (051917 @ 15.5-18.0: a 1.1 s shuffle cycle of
   *  0.35-0.45 m = 0.35 m/s at the spawn gear 3; Michael N5 "moves too quick along the wall"); crouched 0.45 -> 0.55
   *  (051917 @ 29.07-30.23 ruler frames: 0.57 m in 1.17 s = 0.5 m/s at gear 3: the side-on crouch-walk is faster than
   *  the standing shuffle). */
  maxGear: 4,
  slideStand: 0.39,
  slideCrouch: 0.55,
  slideGear1: 0.7,
  slideDead: 0.2,
  /** Leaving beat (s) before the core reports off. (G6, AUDIT-EXTRA-OLD row 17, 052059 @ 17.69-17.93) 0.12 -> 0.28: the
   *  turn out of the wall into the walk takes 0.25-0.3 s (the body's visual turn-out runs at `WALL_TURN.out`). */
  leaveTime: 0.28,
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
  /** (A3, G36) Peek at once: the stick pushed toward the edge (over `peekPush`) at the end peeks, no hold; it stays on
   *  while the push is over `peekKeep`. The head goes out `peekOut` (m, what guards see), the rig leans `peekLean`,
   *  eased over `peekBlend` (s).
   *  (G6, AUDIT-WALLS row 9, 052021 @ 3.4-4.6) CT leans the torso only 10-15 deg (`peekLean` 0.45 -> 0.2 rad) but the
   *  head ends 0.15-0.25 m PAST the edge: the hips shift onto the outer foot and the body eases `peekStep` m toward the
   *  edge (the rig's root, visual: the capsule stays on the wall). Ours at 0.45 rad put the head centre 6 cm short of the
   *  edge (rig probe). `peekOut` (the host's light sample of a remote, from MoveState) stays 0.35: the posed head now ends
   *  0.36 along the wall from the capsule at a full peek (wallStance.test), within 1.5 cm (e2e-netmove asserts 0.35). `peekBlend` 0.2 -> 0.3 (in 0.3, out 0.4-0.5 s in CT). */
  peekPush: 0.4,
  peekKeep: 0.25,
  peekOut: 0.35,
  peekLean: 0.2,
  peekStep: 0.2,
  peekBlend: 0.3,
  /** Looking past the edge (look . edge direction) peeks too. */
  peekLook: 0.85,
  /** (F4) The camera's slide past the edge starts once the look turns this far toward it (look . edge direction) and is
   *  full at `peekLook`; the stick's push toward the edge drives it too. Starting value (G10). */
  viewLook: 0.2,
} as const;

/** (F4, playtest 2 "the body obviously is only going to lean right only") The wall stance side (1 right, -1 left): at
 *  an edge the open side (`edge` 1 = the end at b = the body's left), else the slide's facing (`dir` < 0 = right).
 *  Never from the camera. The remotes decode the same from WALL_SUB (`poseFromMoveState`). */
export function wallFacing(edge: number, dir: number): -1 | 1 {
  if (edge !== 0) return edge > 0 ? -1 : 1;
  return dir < 0 ? 1 : -1;
}

/**
 * (step 12b, D9) The open side at a back-to-wall edge from WALL_SUB: -1 left (edgeL, the end at b), 1 right (edgeR).
 * Mid-wall (no edge bit) aim stays on the normal right side (1). The peek always uses the open side.
 */
export function openSide(sub: number): -1 | 1 {
  return sub & WALL_SUB.edgeL ? -1 : 1;
}

/** (G6) The wall side from WALL_SUB, as `wallFacing` on the owner: an edge's open side, else the slide's facing. */
export function wallSideFromSub(sub: number): -1 | 1 {
  return sub & WALL_SUB.edgeL ? -1 : sub & WALL_SUB.edgeR ? 1 : sub & WALL_SUB.faceRight ? 1 : -1;
}

/** (A3) The weapon goes to the left hand while peeking at a left edge. */
export function wallLeftHand(sub: number): boolean {
  return (sub & WALL_SUB.edgeL) !== 0 && (sub & WALL_SUB.peek) !== 0;
}

/** (step 12b fix r2, light parity) The light meter's head sample from a head centre (hx, hy, hz) over the feet
 *  (px, py, pz): the horizontal offset and the body height whose head sample (`bodyLevel`, 0.95 of the height) lands
 *  on the head. (rig-pose-fix S4, A2 supersedes A51) The head is the sim body's (`playerBody` of the wall state: the
 *  local player's `PlayerTarget.body`, the host's `RemotePlayer` from the MoveState), so the light meter, perception's
 *  head point and the guards agree on the wall on both machines (bible 5.1). Writes `out`. */
export function posedHeadSample(px: number, py: number, pz: number, hx: number, hy: number, hz: number, out: { ox: number; oz: number; h: number }): { ox: number; oz: number; h: number } {
  out.ox = hx - px;
  out.oz = hz - pz;
  out.h = Math.max(0.3, (hy - py) / 0.95);
  return out;
}

/** (A3, G35) The slide speed along the wall (m/s, signed like `along`) for the stick's along-wall component `along`
 *  (-1..1): 0 inside `WALL.slideDead`, then rescaled linearly to the CT shuffle at full stick (0.35 standing, 0.5
 *  crouched at gear 3), scaled by the speed gear (0.7 at gear 1 up to 1 at gear 4). No allocation. */
export function wallSlideSpeed(along: number, crouch: boolean, gear: number): number {
  const a = Math.abs(along);
  if (a <= WALL.slideDead) return 0;
  const k = Math.min(1, (a - WALL.slideDead) / (1 - WALL.slideDead));
  const g = Math.max(1, Math.min(WALL.maxGear, gear));
  const gk = WALL.slideGear1 + (1 - WALL.slideGear1) * ((g - 1) / (WALL.maxGear - 1));
  return Math.sign(along) * k * gk * (crouch ? WALL.slideCrouch : WALL.slideStand);
}

/** (A3, G35) The peek trigger: `on` now, the push toward the edge (`toward`). Peeks at once over `peekPush`, stays on over `peekKeep`. */
export function wallPeekWanted(on: boolean, toward: number): boolean {
  return on ? toward > WALL.peekKeep : toward > WALL.peekPush;
}

/** (F4) The camera's slide past an edge (0..1, local only): how far the stick pushes toward the edge (`toward`, -1..1) or
 *  the look turns past it (`look`, the look direction . the edge direction). No allocation. */
export function wallPeekView(toward: number, look: number): number {
  const l = (look - WALL.viewLook) / (WALL.peekLook - WALL.viewLook);
  return Math.max(0, Math.min(1, Math.max(toward, l)));
}

/** MoveState `sub` bits for `wall` (u8): edge flags and peek; `leftHand` is the weapon hand at a left edge. (A3: the
 *  lean bit 32 is gone with the lean-out; piano-knife S4b uses 32 for the intro pose.) `low` stays, it feeds the crouch
 *  and the takedown attacker state. */
export const WALL_SUB = { crouch: 1, faceRight: 2, edgeL: 4, edgeR: 8, peek: 16, intro: 32, low: 64, leftHand: 128 } as const;

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

export type WallPhase = 'off' | 'entering' | 'on' | 'leaving';

/** Per-segment joins at each end: -1 none; else the neighbour index, `kind` 1 = inside corner, 2 = flat continuation;
 *  `at` 0 = the neighbour's a end meets, 1 = its b end. */
export interface WallLinks {
  nA: Int32Array;
  nB: Int32Array;
  kA: Uint8Array;
  kB: Uint8Array;
  atA: Uint8Array;
  atB: Uint8Array;
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
  /** (step 21w, D7) `gameplay.crouchToggle` false (hold to crouch): on a high face the stance follows `crouchHeld`. */
  crouchHold?: boolean;
  crouchHeld?: boolean;
  /** Something else wants the body: aiming (G180, CT: aiming leaves the wall), a takedown, traversal (leaves at once). */
  leave: boolean;
  /** Entering is not allowed now (aiming down sights is fine; a committed move, an attach, a takedown is not). */
  blocked: boolean;
  /** `gameplay.wallToggle`: press on / press off (true) or hold (false). */
  toggle: boolean;
}

export function emptyWallInput(): WallInput {
  return { x: 0, y: 0, z: 0, moveX: 0, moveZ: 0, lookX: 0, lookZ: 1, gear: 3, crouched: false, grounded: true, context: false, contextHeld: false, crouchPressed: false, leave: false, blocked: false, toggle: true };
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
  /** (piano-knife S4b) The piano intro pose holds this wall (IntroPose): WALL_SUB.intro; introLeft: the mirror variant,
   *  the weapon in the left hand. */
  intro = false;
  introLeft = false;
  /** At an outside end: -1 at a, +1 at b, 0 mid-wall. */
  edge = 0;
  /** Time in the current phase, stick-into and pull-away timers (s). */
  t = 0;
  intoT = 0;
  /** The stick entry is armed: false while the stick is held through a traversal, an attach, a fall or another
   *  blocking state, true again once the stick is released (A48: walking off a roof or a ladder top with the stick
   *  held forward never lands into a back-to-wall entry). */
  stickArmed = true;
  /** (step 11 r3, D7) Entered by the stick held into the face (not the context press): in hold mode it stays while the
   *  stick is held; the context button's release rule applies to context entries only. */
  stickEntry = false;
  /** (step 21w, A83) The stick held into a high face enters (off by default: `WALL.stickEntry`). */
  stickEnter: boolean = WALL.stickEntry;
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
  count = { enter: 0, leave: 0, wrap: 0, peek: 0 };
  // --- (step 12) edge verbs
  /** Peek: the stick-toward-edge timer (s), the eased amount 0..1, whether it is on. */
  peekT = 0;
  peek = 0;
  peekOn = false;
  /** (F4) The camera's slide toward the open side at an end (0..1, `wallPeekView`; local only, never sent). */
  peekView = 0;
  /** The head's offset past the edge while peeking (world XZ): the light meter samples there (light parity, bible 5.1). */
  exX = 0;
  exZ = 0;
  /** (G6) The rig root's step toward the edge while peeking (world XZ, `WALL.peekStep` at a full peek; visual). */
  stX = 0;
  stZ = 0;
  lastLeave = '';
  /** The step's dt (for the peek blend). */
  private dt = 1 / 60;

  constructor(
    readonly segs: readonly CoverSegment[],
    readonly links: WallLinks,
    readonly standoff: number,
  ) {}

  get active(): boolean {
    return this.phase === 'entering' || this.phase === 'on';
  }

  /** At an outside end (edge != 0) and stopped on it. */
  get atEnd(): boolean {
    if (this.edge === 0 || this.seg < 0) return false;
    return Math.abs(this.s - this.range(this.seg, this.edge > 0 ? 1 : 0)) < 0.03;
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
    this.peekT = 0;
    this.peek = this.exX = this.exZ = this.stX = this.stZ = 0;
    this.peekOn = false;
    this.peekView = 0;
  }

  reset(): void {
    this.phase = 'off';
    this.seg = -1;
    this.v = this.vx = this.vz = 0;
    this.onT = 0;
    this.intoT = 0;
    this.edge = 0;
    this.clearEdge();
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
      if (this.stickEnter && mag > 0.5 && this.stickArmed && i.gear <= WALL.stickGearMax) {
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
    const g = this.segs[this.seg]!;
    // (piano-knife S4b) the intro pose holds the wall: no button, aim, crouch or hold-mode release leaves it
    // (`IntroPose.set(false)` does)
    if (!this.intro) {
      // leaving: another action or aiming, the context press again (toggle) or released (hold)
      if (i.leave) return this.leave('action');
      if (i.toggle && i.context && this.t > 0) return this.leave('context');
      if (!i.toggle) {
        // hold mode (D7): a context entry stays while the button is held; a stick entry while the stick is held (holding
        // the button later hands it to the button)
        if (this.stickEntry && i.contextHeld) this.stickEntry = false;
        if (this.stickEntry ? mag < 0.3 && this.t > 0.05 : !i.contextHeld && this.t > 0.05) return this.leave(this.stickEntry ? 'stick' : 'context');
      }
      // (A3, loco M25) only the button (or aiming, or another action) leaves the wall: no pull-away
      // (21w, M14) crouch on any wall: a press toggles the stance on a high face (hold mode: the held button decides);
      // a low face is always crouched. The controller eases the stance; the body stays on the wall.
      if (!g.low) {
        if (i.crouchHold) this.crouch = !!i.crouchHeld;
        else if (i.crouchPressed) this.crouch = !this.crouch;
      }
    }
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
    // (A3, G35) the CT pace: 0.35 / 0.5 m/s at gear 3 at full stick (G6), analog below, a little slower at the lower gears
    // (tuner-camera) the tuner Speed section (local player: the game's one WallCore), x1 by default
    this.v = wallSlideSpeed(along, this.crouch, i.gear) * speedWallMul(this.crouch);
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
      // the peek follows the stick and never lock it on the far end
      this.edge = 0;
      const nearB = this.links.kB[this.seg] === 0 && this.hi(g2) - this.s <= WALL.edgeReach + 1e-4;
      const nearA = this.links.kA[this.seg] === 0 && this.s - this.lo(g2) <= WALL.edgeReach + 1e-4;
      if (nearA && nearB) {
        const st = i.moveX * g2.tx + i.moveZ * g2.tz;
        this.edge = st > GEARS.deadZone ? 1 : st < -GEARS.deadZone ? -1 : this.hi(g2) - this.s <= this.s - this.lo(g2) ? 1 : -1;
      } else if (nearB) this.edge = 1;
      else if (nearA) this.edge = -1;
    }
    this.dt = dt;
    this.edgeVerbs(i);
    // the controller follows the body line: the slide plus a correction onto it
    const gs = this.segs[this.seg]!;
    this.point(this.seg, this.s);
    const k = Math.min(WALL.hold, 1 / Math.max(dt, 1e-3));
    // along: the slide (a stacked stop or an end holds the body where it is); across: onto the body line
    const off = this.standoff - ((i.x - gs.ax) * gs.nx + (i.z - gs.az) * gs.nz);
    const bodyS = (i.x - gs.ax) * gs.tx + (i.z - gs.az) * gs.tz;
    const ds = this.v === 0 ? (this.s - bodyS) * k : this.v;
    this.vx = ds * gs.tx + off * gs.nx * k;
    this.vz = ds * gs.tz + off * gs.nz * k;
    this.yaw = Math.atan2(gs.nx, gs.nz);
    this.updateSpot(gs);
  }

  /**
   * (A3, G36) The edge verb after the slide: the peek, at once (the stick pushed toward the edge at the end, or the look
   * past it). The lean-out aim and the over-the-top rise are gone (G52); an end holds the body on the wall.
   */
  private edgeVerbs(i: WallInput): void {
    const g = this.segs[this.seg]!;
    const ex = this.edge * g.tx;
    const ez = this.edge * g.tz;
    const toward = this.edge !== 0 ? i.moveX * ex + i.moveZ * ez : 0;
    const atEnd = this.atEnd;
    const lookPast = this.edge !== 0 && i.lookX * ex + i.lookZ * ez > WALL.peekLook;
    const push = lookPast ? Math.max(1, toward) : toward;
    const on = atEnd && wallPeekWanted(this.peekOn, push);
    if (on && !this.peekOn) this.count.peek++;
    this.peekOn = on;
    this.peekView = atEnd ? wallPeekView(toward, this.edge !== 0 ? i.lookX * ex + i.lookZ * ez : 0) : 0;
    this.peek = on ? Math.min(1, this.peek + this.dt / WALL.peekBlend) : Math.max(0, this.peek - this.dt / WALL.peekBlend);
    const pe = this.peek * this.peek * (3 - 2 * this.peek);
    this.exX = ex * WALL.peekOut * pe;
    this.exZ = ez * WALL.peekOut * pe;
    // (G6) the body eases toward the edge with the peek (the rig's root; the capsule stays)
    this.stX = ex * WALL.peekStep * pe;
    this.stZ = ez * WALL.peekStep * pe;
  }

  /** The weapon in the left hand: peeking at a left edge (WALL_SUB.leftHand). */
  get leftHand(): boolean {
    return (this.intro && this.introLeft && this.active) || (this.phase === 'on' && wallLeftHand(this.sub()));
  }

  /** The rig's lean (-1 left .. 1 right; the edge at b is the body's left) from the peek. */
  rigLean(): number {
    if (this.edge === 0) return 0;
    const pe = this.peek * this.peek * (3 - 2 * this.peek);
    return (this.edge > 0 ? -1 : 1) * WALL.peekLean * pe;
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
      (this.intro ? WALL_SUB.intro : 0) |
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
  ov.crouch = core.crouch;
  ov.turnRate = WALL_TURN_RATE;
  // (the settle follows its eased path exactly)
  ov.glide = core.phase === 'entering';
  ov.run = false;
  ov.noise = 'crouched';
  return ov;
}

/** (step 12) The capsule's turn rate on a wall (rad/s, the owner's override). The body's visual turn (local rig and the
 *  remote copy) follows `wallTurnRate`. */
export const WALL_TURN_RATE = 12;

/**
 * (G6) The body's visual turn on and off a wall (rad/s), shared by the local rig and the remote copy (both from the
 * same inputs, so the copy turns as the owner):
 * - entry (AUDIT-WALLS row 15, 051917 @ 12.5-13.1 at 30 fps: back view to profile in 0.07 s, settled 3/4 by 0.25-0.3 s):
 *   front-loaded, `fast` while more than `split` is left, then `slow` (180 deg in about 0.27 s; was 12 linear, 0.26 s
 *   with no front-loading);
 * - settled and crouched (row 1, 051917 @ 32.67-33.17: the side-on reversal turns through square-on in about 0.45 s):
 *   `side` (2 x 83 deg in 0.45 s; the rise from side-on to square, row 16, in about 0.23 s);
 * - off the wall (AUDIT-EXTRA-OLD row 17, 052059 @ 17.69-17.93: a 90-120 deg turn-out in 0.25-0.3 s): `out`.
 * `settled`: on the wall at least `settleT` s. Starting values.
 */
export const WALL_TURN = { fast: 22, slow: 8, split: Math.PI / 2, side: 6.4, out: 8, settleT: 0.3 } as const;
export function wallTurnRate(absD: number, onWall: boolean, settled: boolean, crouch: number): number {
  if (!onWall) return WALL_TURN.out;
  if (settled && crouch > 0.5) return WALL_TURN.side;
  return absD > WALL_TURN.split ? WALL_TURN.fast : WALL_TURN.slow;
}

/**
 * (G6, AUDIT-WALLS row 1, Michael P6 / P8 "unrealistic") The crouched wall stance is SIDE-ON: 051917 @ 29.0-34.0 the body
 * turns about 83 deg from facing out toward the travel (the wall-side hip and shoulder on the wall, the spine about
 * 45 deg forward over the knees) and crouch-walks along the wall. `yaw` (rad) the turn, eased in with the crouch from
 * `from` to `to` (crouch blend). Visual only: the capsule keeps facing out (gameplay, the camera and the AI read that).
 */
export const WALL_SIDE = { yaw: 1.45, from: 0.35, to: 0.85, arm: 0.03, crouchBack: 0.16 } as const;

/** (G6) The visual body yaw's offset from the face normal (rad) for the crouch blend and the wall side (1 right, -1 left:
 *  `wallFacing`, the slide's facing or the open side at an edge). No allocation. */
export function wallYawOffset(crouch: number, side: number): number {
  const k = Math.max(0, Math.min(1, (crouch - WALL_SIDE.from) / (WALL_SIDE.to - WALL_SIDE.from)));
  return (side < 0 ? -1 : 1) * WALL_SIDE.yaw * k * k * (3 - 2 * k);
}

/** Head turn along the slide (rad, the look yaw toward the facing side). (G6, AUDIT-WALLS row 3, 051917 @ 14.0-17.8:
 *  sliding standing the head turns 70-90 deg toward the travel and drops forward) 0.55 -> 1.3 while sliding
 *  (`WALL_LOOK_SLIDE`, by the slide's pace), `WALL_LOOK` at rest; `WALL_LOOK_PITCH` the head down while sliding (rad). */
export const WALL_LOOK = 0.55;
export const WALL_LOOK_SLIDE = 1.3;
export const WALL_LOOK_PITCH = 0.3;
export const WALL_LOOK_PEEK = 1.45;
/** (G6) The head's look yaw on a wall (rad) for the side, the slide pace share 0..1 (`move`) and the raise. */
export function wallLookYaw(side: number, move: number, raise: number): number {
  const m = Math.max(0, Math.min(1, move));
  return side * (WALL_LOOK + (WALL_LOOK_SLIDE - WALL_LOOK) * m) * (1 - raise);
}

/** (G6) The head's look yaw relative to the posed body on a wall: standing, toward the travel (`wallLookYaw`); side-on
 *  (crouched) straight along the travel the body already faces. `visOff` the body's current visual yaw off the face
 *  normal (rad; mid-turn the head keeps its world aim). The local rig and the remote copy both call it. */
export function wallHeadYaw(side: number, move: number, crouch: number, visOff: number, raise: number, peek = 0): number {
  const off = wallYawOffset(crouch, side);
  const k = Math.abs(off) / WALL_SIDE.yaw;
  // (G6, row 9, 052021 @ 3.4-4.6) peeking the head turns about 90 deg to the opening (the open side)
  const pk = Math.max(0, Math.min(1, peek));
  const stand = wallLookYaw(side, move, 0);
  const goal = (stand + (side * WALL_LOOK_PEEK - stand) * pk) * (1 - k) + off * k;
  return Math.max(-1.45, Math.min(1.45, goal - visOff)) * (1 - raise);
}

/** (G6) The slide's share of the walk pace for the wall head and torso turn (0 still .. 1 at 0.3 m/s). */
export function wallMoveK(speed: number): number {
  return Math.max(0, Math.min(1, speed / 0.3));
}

/** How far the rig's root moves from the capsule onto the face so the back sits <= 3 cm off it (m). (21w-5) `turnSin`:
 *  the sine of the body's visual turn from facing out (the lean-out arc, M16, turns it up to 175 deg): turned, the near
 *  shoulder (`shoulderHalf` off the spine) reaches the face first, so the root stops that much short of it (the push at
 *  full depth put the near shoulder 13-21 cm through the wall end in the lean in / out: audit edge-row wallClip). */
/** (G6) The body's reach toward the face is a turned box: half depth x |cos| + the shoulder (joint plus `WALL_SIDE.arm`
 *  of upper arm) x |sin|, so a side-on crouch (row 1) puts the wall-side shoulder and hip about 3 cm off the face
 *  instead of 15 cm out (21w-5's depth + 0.88 shoulder sum is the box's 45 deg corner; it held the side-on body off the
 *  wall). Square to the wall (turnSin 0) it is unchanged. */
export function wallRootPush(standoff: number, bodyDepthHalf: number, turnSin = 0, shoulderHalf = 0, crouch = 0): number {
  const s = Math.min(1, Math.abs(turnSin));
  const c = Math.sqrt(1 - s * s);
  // (G6 fix, check BLOCK 3) crouched and turned off side-on (through the reversal) the forward trunk puts the pelvis and
  // the hanging elbows behind the half depth: `WALL_SIDE.crouchBack` more, by the crouch blend and the share still square
  const back = WALL_SIDE.crouchBack * Math.max(0, Math.min(1, crouch)) * c;
  const reach = bodyDepthHalf * c + back + (shoulderHalf > 0 ? shoulderHalf + WALL_SIDE.arm : 0) * s;
  return Math.max(0, standoff - reach - 0.015);
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
