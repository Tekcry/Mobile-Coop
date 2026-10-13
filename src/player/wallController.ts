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
} as const;

/** MoveState `sub` bits for `wall` (u8). Bits 4-32 are reserved for step 12 (edge flags are set here already). */
export const WALL_SUB = { crouch: 1, faceRight: 2, edgeL: 4, edgeR: 8, peek: 16, lean: 32, low: 64, leftHand: 128 } as const;

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
  const L: WallLinks = { nA: new Int32Array(n).fill(-1), nB: new Int32Array(n).fill(-1), kA: new Uint8Array(n), kB: new Uint8Array(n), atA: new Uint8Array(n), atB: new Uint8Array(n) };
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
  /** Something else wants the body: jump, sprint, a takedown, traversal (leaves at once). */
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
  count = { enter: 0, leave: 0, wrap: 0 };
  lastLeave = '';

  constructor(
    readonly segs: readonly CoverSegment[],
    readonly links: WallLinks,
    readonly standoff: number,
  ) {}

  get active(): boolean {
    return this.phase === 'entering' || this.phase === 'on';
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
  }

  reset(): void {
    this.phase = 'off';
    this.seg = -1;
    this.v = this.vx = this.vz = 0;
    this.onT = 0;
    this.intoT = this.pullT = 0;
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
    const g = this.segs[this.seg]!;
    // leaving: another action, the context press again (toggle) or released (hold), the stick pulled away
    if (i.leave) return this.leave('action');
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
    this.v = Math.abs(along) > GEARS.deadZone ? Math.max(-1, Math.min(1, along)) * cap : 0;
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
      if (this.edge === 0) {
        if (this.s <= this.lo(g2) + 1e-4 && this.links.kA[this.seg] === 0) this.edge = -1;
        else if (this.s >= this.hi(g2) - 1e-4 && this.links.kB[this.seg] === 0) this.edge = 1;
      }
    }
    // the controller follows the body line: the slide plus a correction onto it
    const gs = this.segs[this.seg]!;
    this.point(this.seg, this.s);
    const k = Math.min(WALL.hold, 1 / Math.max(dt, 1e-3));
    // along: the slide (a stacked stop or an end holds the body where it is); across: onto the body line
    const off = this.standoff - ((i.x - gs.ax) * gs.nx + (i.z - gs.az) * gs.nz);
    const ds = this.v === 0 ? (this.s - ((i.x - gs.ax) * gs.tx + (i.z - gs.az) * gs.tz)) * k : this.v;
    this.vx = ds * gs.tx + off * gs.nx * k;
    this.vz = ds * gs.tz + off * gs.nz * k;
    this.yaw = Math.atan2(gs.nx, gs.nz);
    this.updateSpot(gs);
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
    return (this.crouch ? WALL_SUB.crouch : 0) | (this.dir < 0 ? WALL_SUB.faceRight : 0) | (this.edge === 1 ? WALL_SUB.edgeL : 0) | (this.edge === -1 ? WALL_SUB.edgeR : 0) | (this.low ? WALL_SUB.low : 0);
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
  ov.turnRate = 12;
  ov.glide = core.phase === 'entering';
  ov.run = false;
  ov.noise = 'crouched';
  return ov;
}

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
