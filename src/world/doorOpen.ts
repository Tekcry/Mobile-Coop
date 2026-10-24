/**
 * (CT prototype G6, AUDIT-WALLS row 4) The normal door open as a short committed move, Babylon-free. CT (052349 @ 4.6-7.6,
 * 10 fps): OPEN DOOR picked at 5.15; 5.4-5.9 a sidestep of about 0.3 m to the latch side, the body turned 30-45 deg to
 * the door, the near hand rising; the leaf starts at 5.95 (0.8 s after the pick), fast at first and easing (45 deg at
 * 6.2, 70 at 6.4, 78 at 7.0, drifting to 85-90 by about 9 s); the palm on the leaf with the arm extended 6.1-6.6, the
 * feet planted; the arms back by 6.9, then a normal walk through. Ours opened at once from wherever the body stood (up
 * to 1.6 m), with no step and no hand.
 *
 * Phases: `step` (to the spot beside the latch, turned to the door), `wait` (the hand up, until `leafAt`), `push` (the
 * leaf swings; the hand follows the leaf to `letGo`), `back` (the arm down), then off. The door itself opens through
 * the caller (`act` OPEN at `leafAt`: the host's door in co-op, as before).
 * (marlow-final N9) A sliding door has no committed move (no swing to step aside from, no leaf to push): `doorOpenMove`
 * is false and the caller opens it at once.
 */
import { DOOR_PEEK, isSlideDoor, type PeekDoorAnchor } from './doorPeek';

/** (N9) Whether Open door at this door is the committed step-and-push move (hinged), or an at-once open (sliding). */
export function doorOpenMove(a: { leaf?: 'swing' | 'slide' }): boolean {
  return !isSlideDoor(a);
}

export const DOOR_OPEN = {
  /** The step to the spot (s; CT 5.4-5.9 after a 0.25 s beat: the pick to the step). */
  step: 0.5,
  /** The leaf starts this long after the pick (s; 052349 5.15 -> 5.95). */
  leafAt: 0.8,
  /** The spot: off the leaf plane (m) and in from the latch edge toward the hinge (m), on the body's side. A leaf that
   *  swings toward the body: the spot is past the latch edge instead (`pullOut` m beyond it, `pullOff` off the plane), out
   *  of the leaf's sweep. */
  off: 0.55,
  in: 0.25,
  pullOut: 0.3,
  pullOff: 0.35,
  /** The body's turn from square to the door toward the hinge (rad, CT 30-45 deg). */
  turn: (35 * Math.PI) / 180,
  /** The hand: up over `handIn` s before the leaf moves; on the leaf at the handle height (`DOOR_PEEK.handleY`) until
   *  the leaf has opened `letGo` (rad, a push; `letGoPull` a pull) of its swing, then down over `handOut` s. */
  handIn: 0.35,
  letGo: (65 * Math.PI) / 180,
  letGoPull: (35 * Math.PI) / 180,
  /** The palm on a pushed leaf this far in from the latch edge (m); a pull holds the handle (`DOOR_PEEK.handleEdge`). */
  palmIn: 0.22,
  handOut: 0.3,
  /** The whole move ends at most this long after the pick (s): a door that never opens (locked by someone, the host
   *  refused) frees the body. */
  maxTime: 2.4,
} as const;

export type DoorOpenPhase = 'off' | 'step' | 'wait' | 'push' | 'back';

/** Where the body stands and faces for the open, and whether the leaf swings toward it. */
export interface DoorOpenSpot {
  x: number;
  z: number;
  yaw: number;
  /** The side of the leaf plane the body is on (+1 / -1) and the leaf swings toward the body. */
  side: number;
  pull: boolean;
  /** The hand on the leaf is the right one: a push uses the hinge-side hand on the leaf as it swings away (052349
   *  @ 6.7-7.0: the hinge on his left, the left arm out on the leaf), a pull the latch-side hand on the handle. */
  handRight: boolean;
}

export function emptyOpenSpot(): DoorOpenSpot {
  return { x: 0, z: 0, yaw: 0, side: 1, pull: false, handRight: true };
}

/** The open's spot at door `a` for a body at (px, pz). No allocation. */
export function doorOpenSpot(a: PeekDoorAnchor, px: number, pz: number, out: DoorOpenSpot): DoorOpenSpot {
  const tx = Math.sin(a.yaw);
  const tz = Math.cos(a.yaw);
  const nx = tz;
  const nz = -tx;
  const side = (px - a.hinge.x) * nx + (pz - a.hinge.z) * nz >= 0 ? 1 : -1;
  const pull = a.swing * side > 0;
  const along = pull ? a.width + DOOR_OPEN.pullOut : a.width - DOOR_OPEN.in;
  const off = pull ? DOOR_OPEN.pullOff : DOOR_OPEN.off;
  out.side = side;
  out.pull = pull;
  out.x = a.hinge.x + tx * along + nx * side * off;
  out.z = a.hinge.z + tz * along + nz * side * off;
  // square to the door (facing -n side), turned toward the hinge (back along -t)
  const sq = Math.atan2(-nx * side, -nz * side);
  // the hinge on the body's right: turn right (+) toward it, else left
  const hingeRight = -tx * Math.cos(sq) + tz * Math.sin(sq) > 0;
  out.yaw = sq + (hingeRight ? 1 : -1) * DOOR_OPEN.turn * (pull ? 0.5 : 1);
  out.handRight = pull ? !hingeRight : hingeRight;
  return out;
}

/** What the core asks of the caller this step. */
export const OPEN_ACT = { none: 0, open: 1 } as const;
export type OpenAct = (typeof OPEN_ACT)[keyof typeof OPEN_ACT];

export class DoorOpenCore {
  phase: DoorOpenPhase = 'off';
  door = -1;
  /** Time since the pick (s) and since the hand let go (s). */
  t = 0;
  private outT = 0;
  readonly spot: DoorOpenSpot = emptyOpenSpot();
  /** Where the body stood at the pick (feet XZ): the step eases from here to the spot. */
  fromX = 0;
  fromZ = 0;

  get active(): boolean {
    return this.phase !== 'off';
  }

  /** Start the move; false (and nothing starts) at a sliding door (N9: the caller opens it at once). */
  start(door: number, a: PeekDoorAnchor, px: number, pz: number): boolean {
    if (!doorOpenMove(a)) return false;
    this.phase = 'step';
    this.door = door;
    this.t = 0;
    this.outT = 0;
    this.fromX = px;
    this.fromZ = pz;
    doorOpenSpot(a, px, pz, this.spot);
    return true;
  }

  reset(): void {
    this.phase = 'off';
    this.door = -1;
    this.t = 0;
    this.outT = 0;
  }

  /** The step's eased progress 0..1 (the body to the spot). */
  stepK(): number {
    const k = Math.min(1, this.t / DOOR_OPEN.step);
    return k * k * (3 - 2 * k);
  }

  /** The hand's weight on the leaf (0..1). */
  handW(): number {
    if (this.phase === 'off') return 0;
    if (this.phase === 'back') return Math.max(0, 1 - this.outT / DOOR_OPEN.handOut);
    const k = (this.t - (DOOR_OPEN.leafAt - DOOR_OPEN.handIn)) / DOOR_OPEN.handIn;
    const c = Math.max(0, Math.min(1, k));
    return c * c * (3 - 2 * c);
  }

  /**
   * One fixed step. `leafAngle`: the leaf's drawn angle off closed now (rad); `opened`: the door is open (target 1) by
   * anyone; `end`: the body is wanted elsewhere (damage, death, a takedown): the move stops (the door, if asked, opens on).
   */
  update(dt: number, leafAngle: number, opened: boolean, end: boolean): OpenAct {
    if (this.phase === 'off') return OPEN_ACT.none;
    if (end) {
      this.reset();
      return OPEN_ACT.none;
    }
    this.t += dt;
    let act: OpenAct = OPEN_ACT.none;
    if (this.phase === 'step' && this.t >= DOOR_OPEN.step) this.phase = 'wait';
    if ((this.phase === 'step' || this.phase === 'wait') && this.t >= DOOR_OPEN.leafAt) {
      this.phase = 'push';
      if (!opened) act = OPEN_ACT.open;
    } else if (this.phase === 'push' && (leafAngle >= (this.spot.pull ? DOOR_OPEN.letGoPull : DOOR_OPEN.letGo) || this.t >= DOOR_OPEN.maxTime - DOOR_OPEN.handOut)) {
      this.phase = 'back';
      this.outT = 0;
    } else if (this.phase === 'back') {
      this.outT += dt;
      if (this.outT >= DOOR_OPEN.handOut) this.reset();
    }
    if (this.active && this.t >= DOOR_OPEN.maxTime) this.reset();
    return act;
  }
}

/** The hand's point on a leaf drawn `angle` rad open: the handle height, `fromEdge` m in from the latch edge, on `side`
 *  of the leaf (the body's side when closed). Writes out. */
export function leafHandPoint(a: PeekDoorAnchor, side: number, angle: number, fromEdge: number, out: { x: number; y: number; z: number }): void {
  const yaw = a.yaw + a.swing * angle;
  const tx = Math.sin(yaw);
  const tz = Math.cos(yaw);
  const hl = a.width - fromEdge;
  out.x = a.hinge.x + tx * hl + tz * side * DOOR_PEEK.handleOut;
  out.y = a.hinge.y + DOOR_PEEK.handleY;
  out.z = a.hinge.z + tz * hl - tx * side * DOOR_PEEK.handleOut;
}
