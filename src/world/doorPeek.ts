/**
 * (locomotion step 13) Door peek, Babylon-free: at a closed, unlocked door the context press settles the body on the
 * frame (the hinge side at the shoulder, a hand on the handle), cracks the leaf a little (`DOOR_CRACK`) and frames the
 * view at the crack; a second press or the stick pulled back closes it, the stick pushed in or `interact` opens it
 * quietly. The crack itself is the door's (host-authoritative in co-op, `Doors.crack`); this core only asks for it.
 *
 * Gameplay facts (A25): a cracked door keeps its collision body, blocks light (bake and field unchanged: its swing
 * `open` stays 0, only the leaf's drawn angle cracks) and blocks guard sight; guards walking through open it.
 */
import { hyp2 } from '../core/mathx';

/** Crack amount (fraction of the swing) and its timings (s). Mirrored by `DOOR.crack` / `DOOR.crackTime`. */
export const DOOR_CRACK = { crack: 0.12, crackTime: 0.6, closeTime: 0.4 } as const;

export const DOOR_PEEK = {
  /** The door's face within this of the body (m) and the body facing it within `cone` (rad, 60 deg). */
  reach: 1.0,
  /** (polish 3) The feet within this of the door's base (m), as the door menu: no peek offer from a walkway over a door. */
  floorGap: 1.2,
  cone: Math.PI / 3,
  /** Settle onto the frame (s). (G6, AUDIT-WALLS row 14, 052349 @ 13.6-18.6: picked 14.1, the step to the latch side
   *  and the hand up 14.4-14.8, the camera in at about 15.0, the leaf starts about 15.6: 1.5 s after the pick; ours
   *  cracked 0.25 s after it) `settle` 0.25 -> 0.5, then `crackDelay` s with the hand on the handle and the view moving
   *  in before the crack (0.7: the leaf at 1.2 s, short of CT's 1.5 so the co-op suites' waits keep their slack). */
  settle: 0.5,
  crackDelay: 0.7,
  /** Stick pulled back held this long closes (s); pushed in past `push` opens. */
  backHold: 0.2,
  back: -0.5,
  push: 0.6,
  /** The view's look range around the door's normal (rad, +-35 deg) and the FOV factor at the crack. (G3, AUDIT-CAMERA
   *  row 24; was 0.85) 1: CT shows no zoom at the crack (052349), as no aim zoom (G29). */
  look: (35 * Math.PI) / 180,
  fovMul: 1,
  /** The frame: the body line off the leaf (m), and in from the free edge toward the hinge (m). */
  standoff: 0.42,
  handleIn: 0.3,
  /** The handle: in from the free edge (m), height over the hinge base (m), off the leaf's middle plane (m). */
  handleEdge: 0.07,
  handleY: 1.0,
  handleOut: 0.06,
  /** The eye at the crack: in from the free edge (m) and off the leaf plane (m: a leaf swinging away, toward). */
  eyeEdge: 0.03,
  eyeOut: 0.16,
  eyeOutToward: 0.27,
  /** Host check: the door centre within this of the requesting client's feet (m). */
  hostReach: 1.5,
} as const;

/** The door fields the peek reads (a `Door` anchor). */
export interface PeekDoorAnchor {
  hinge: { x: number; y: number; z: number };
  yaw: number;
  width: number;
  height: number;
  swing: number;
  locked: boolean;
  /** (marlow-final N9) 'slide': the facility kit's motorised sliding door (no crack, peek, bash or committed swing). */
  leaf?: 'swing' | 'slide';
}

/** (marlow-final N9) A sliding door: it offers Open only (no crack / peek, bash, stealth drive or committed swing);
 *  its leaves slide on the same `DoorState` (`open`, `target`), so collision, light, sight, locks and co-op are unchanged. */
export function isSlideDoor(a: { leaf?: 'swing' | 'slide' }): boolean {
  return a.leaf === 'slide';
}

/** The door state fields the peek reads (`DoorState`). */
export interface PeekDoor {
  anchor: PeekDoorAnchor;
  target: 0 | 1;
  cx: number;
  cz: number;
}

/** Where the body settles, faces and looks from at one door, from the side the body stands on. */
export interface DoorFrame {
  /** +1 / -1: the side of the leaf plane (along its normal) the body is on. */
  side: number;
  x: number;
  z: number;
  yaw: number;
  /** The hinge on the body's right (MoveState `sub` bit 1). */
  hingeRight: boolean;
  /** Handle point (world). */
  hx: number;
  hy: number;
  hz: number;
  /** Eye at the crack (world) and the look's centre yaw. */
  ex: number;
  ey: number;
  ez: number;
}

export function emptyFrame(): DoorFrame {
  return { side: 1, x: 0, z: 0, yaw: 0, hingeRight: false, hx: 0, hy: 0, hz: 0, ex: 0, ey: 0, ez: 0 };
}

/** The frame at door `a` for a body at (px, pz) (`eyeY`: the eye's height over the door base). */
export function doorFrame(a: PeekDoorAnchor, px: number, pz: number, eyeY: number, out: DoorFrame): DoorFrame {
  const tx = Math.sin(a.yaw);
  const tz = Math.cos(a.yaw);
  const nx = tz;
  const nz = -tx;
  const d = (px - a.hinge.x) * nx + (pz - a.hinge.z) * nz;
  const side = d >= 0 ? 1 : -1;
  out.side = side;
  const fl = a.width - DOOR_PEEK.handleIn;
  out.x = a.hinge.x + tx * fl + nx * side * DOOR_PEEK.standoff;
  out.z = a.hinge.z + tz * fl + nz * side * DOOR_PEEK.standoff;
  out.yaw = Math.atan2(-nx * side, -nz * side);
  // the body's right (cos yaw, -sin yaw); the hinge is back along -t from the frame
  out.hingeRight = -tx * Math.cos(out.yaw) + tz * Math.sin(out.yaw) > 0;
  const hl = a.width - DOOR_PEEK.handleEdge;
  out.hx = a.hinge.x + tx * hl + nx * side * DOOR_PEEK.handleOut;
  out.hy = a.hinge.y + DOOR_PEEK.handleY;
  out.hz = a.hinge.z + tz * hl + nz * side * DOOR_PEEK.handleOut;
  // a leaf swinging toward the body sweeps out by width x sin(crack angle): the eye stays beyond it
  const out2 = a.swing * side > 0 ? DOOR_PEEK.eyeOutToward : DOOR_PEEK.eyeOut;
  const el = a.width - DOOR_PEEK.eyeEdge;
  out.ex = a.hinge.x + tx * el + nx * side * out2;
  out.ey = a.hinge.y + eyeY;
  out.ez = a.hinge.z + tz * el + nz * side * out2;
  return out;
}

/** Distance (m) from (px, pz) to the leaf's closed segment, in the plane. */
export function leafDistance(a: PeekDoorAnchor, px: number, pz: number): number {
  const tx = Math.sin(a.yaw);
  const tz = Math.cos(a.yaw);
  const rx = px - a.hinge.x;
  const rz = pz - a.hinge.z;
  const s = Math.max(0, Math.min(a.width, rx * tx + rz * tz));
  return hyp2(rx - tx * s, rz - tz * s);
}

/**
 * Eligible to start a peek at `d`: closed (target 0), unlocked, not peeked by someone else (`peekedByOther`: a crack
 * somebody holds; an abandoned crack nobody peeks is eligible, the peek resumes at it so it can be closed), the face
 * within `DOOR_PEEK.reach` and faced within the cone, grounded and free (`busy`: another state); with `py`, the feet within `floorGap` of the door's base.
 */
export function doorPeekEligible(d: PeekDoor, peekedByOther: boolean, px: number, pz: number, faceYaw: number, grounded: boolean, busy: boolean, py = Number.NaN): boolean {
  if (busy || !grounded || d.target !== 0 || d.anchor.locked || peekedByOther || isSlideDoor(d.anchor)) return false;
  const a = d.anchor;
  if (leafDistance(a, px, pz) > DOOR_PEEK.reach || Math.abs(a.hinge.y - py) > DOOR_PEEK.floorGap) return false;
  const nx = Math.cos(a.yaw);
  const nz = -Math.sin(a.yaw);
  const side = (px - a.hinge.x) * nx + (pz - a.hinge.z) * nz >= 0 ? 1 : -1;
  // facing the door: the body's forward against the inward normal
  return Math.sin(faceYaw) * -nx * side + Math.cos(faceYaw) * -nz * side >= Math.cos(DOOR_PEEK.cone);
}

/** Host check of a client's crack request (door centre within `hostReach` of its feet, closed, unlocked). */
export function hostCrackOk(d: PeekDoor, fx: number, fz: number, on: boolean): boolean {
  if (d.target !== 0) return false;
  if (!on) return hyp2(d.cx - fx, d.cz - fz) <= DOOR_PEEK.hostReach;
  return !d.anchor.locked && !isSlideDoor(d.anchor) && hyp2(d.cx - fx, d.cz - fz) <= DOOR_PEEK.hostReach;
}

export type DoorPeekPhase = 'off' | 'settle' | 'ready' | 'crack' | 'peek' | 'closing';

/** One step's input, door-relative. */
export interface DoorPeekInput {
  /** Context press; `interact` press; the stick toward the door (-1 back .. 1 in). */
  context: boolean;
  interact: boolean;
  push: number;
  /** Damage, aim, jump or sprint this step: the peek ends (the door stays as it is). */
  end: boolean;
  /** The door this press would start on (-1 none: not eligible). */
  candidate: number;
  /** The candidate is already cracked (an abandoned crack): the peek resumes at it, straight into `peek`. */
  resume?: boolean;
  /** The peeked door was opened (target 1) by anyone. */
  doorOpened: boolean;
}

/** What the core asks of the door this step. */
export const PEEK_ACT = { none: 0, crackOn: 1, crackOff: 2, open: 3 } as const;
export type PeekAct = (typeof PEEK_ACT)[keyof typeof PEEK_ACT];

export class DoorPeekCore {
  phase: DoorPeekPhase = 'off';
  /** The peeked door's index (-1 none). */
  door = -1;
  t = 0;
  private backT = 0;
  /** This peek started on an already cracked door (no crack request: settle, then peek). */
  private resume = false;

  get active(): boolean {
    return this.phase !== 'off';
  }

  /** The view at the crack (0..1): in through the crack, out while closing. */
  view(): number {
    // (G6) the view moves in before the leaf (CT: the camera at the door 0.6 s before the crack)
    if (this.phase === 'ready') return Math.min(1, this.t / DOOR_PEEK.crackDelay);
    if (this.phase === 'crack') return 1;
    if (this.phase === 'peek') return 1;
    if (this.phase === 'closing') return Math.max(0, 1 - this.t / DOOR_CRACK.closeTime);
    return 0;
  }

  /** The hand's weight on the handle (0..1). */
  handW(): number {
    if (this.phase === 'settle') return Math.min(1, this.t / DOOR_PEEK.settle);
    if (this.phase === 'closing') return Math.max(0, 1 - this.t / DOOR_CRACK.closeTime);
    return this.phase === 'off' ? 0 : 1;
  }

  reset(): void {
    this.phase = 'off';
    this.door = -1;
    this.t = 0;
    this.backT = 0;
    this.resume = false;
  }

  update(dt: number, i: DoorPeekInput): PeekAct {
    if (this.phase === 'off') {
      if (i.context && i.candidate >= 0) {
        this.phase = 'settle';
        this.door = i.candidate;
        this.t = 0;
        this.backT = 0;
        this.resume = i.resume === true;
      }
      return PEEK_ACT.none;
    }
    this.t += dt;
    if (i.doorOpened || i.end) {
      this.reset();
      return PEEK_ACT.none;
    }
    if (this.phase === 'settle') {
      if (i.context) {
        this.reset();
        return PEEK_ACT.none;
      }
      if (this.t >= DOOR_PEEK.settle - 1e-6) {
        if (this.resume) {
          // the crack is already there: straight into the peek (a press or the stick back closes it)
          this.phase = 'peek';
          this.t = 0;
          return PEEK_ACT.none;
        }
        this.phase = 'ready';
        this.t = 0;
      }
      return PEEK_ACT.none;
    }
    if (this.phase === 'ready') {
      if (i.context) {
        this.reset();
        return PEEK_ACT.none;
      }
      if (this.t >= DOOR_PEEK.crackDelay - 1e-6) {
        this.phase = 'crack';
        this.t = 0;
        return PEEK_ACT.crackOn;
      }
      return PEEK_ACT.none;
    }
    if (this.phase === 'closing') {
      if (this.t >= DOOR_CRACK.closeTime - 1e-6) this.reset();
      return PEEK_ACT.none;
    }
    // cracking / peeking
    if (this.phase === 'crack' && this.t >= DOOR_CRACK.crackTime - 1e-6) {
      this.phase = 'peek';
      this.t = 0;
    }
    if (i.interact || i.push > DOOR_PEEK.push) {
      this.reset();
      return PEEK_ACT.open;
    }
    this.backT = i.push < DOOR_PEEK.back ? this.backT + dt : 0;
    if (i.context || this.backT >= DOOR_PEEK.backHold - 1e-9) {
      this.phase = 'closing';
      this.t = 0;
      this.backT = 0;
      return PEEK_ACT.crackOff;
    }
    return PEEK_ACT.none;
  }
}

/** The camera's look clamp at the crack: `yaw` within +-`DOOR_PEEK.look` of `centre`. */
export function clampPeekYaw(yaw: number, centre: number): number {
  const d = Math.atan2(Math.sin(yaw - centre), Math.cos(yaw - centre));
  return Math.abs(d) <= DOOR_PEEK.look ? yaw : centre + Math.sign(d) * DOOR_PEEK.look;
}

/** One step of a door's crack amount toward its goal (`cracked`: DOOR_CRACK.crack, else 0) at the crack / close pace. */
export function stepCrack(ajar: number, cracked: boolean, dt: number): number {
  if (cracked) return Math.min(DOOR_CRACK.crack, ajar + (DOOR_CRACK.crack / DOOR_CRACK.crackTime) * dt);
  return Math.max(0, ajar - (DOOR_CRACK.crack / DOOR_CRACK.closeTime) * dt);
}

/** The handle on a leaf drawn `ajar` of its swing (`openAngle` rad full swing), on `side` of it -> out (world). */
export function crackedHandle(a: PeekDoorAnchor, side: number, ajar: number, openAngle: number, out: { x: number; y: number; z: number }): void {
  const k = ajar * ajar * (3 - 2 * ajar);
  const yaw = a.yaw + a.swing * openAngle * k;
  const tx = Math.sin(yaw);
  const tz = Math.cos(yaw);
  const hl = a.width - DOOR_PEEK.handleEdge;
  out.x = a.hinge.x + tx * hl + tz * side * DOOR_PEEK.handleOut;
  out.y = a.hinge.y + DOOR_PEEK.handleY;
  out.z = a.hinge.z + tz * hl - tx * side * DOOR_PEEK.handleOut;
}

/**
 * (step 13 fix r1) A client's crack prediction against the host's snapshot `dcr` list: after a local crack (or close),
 * a snapshot that still says the opposite is ignored for about one round trip (`hold`: the 15 Hz snapshot plus
 * latency), so the leaf never flickers back and the 30% crack sound never repeats; a snapshot that agrees ends the
 * hold at once, and past it the host wins. One slot per door, preallocated (no allocation per snapshot).
 */
export class CrackPrediction {
  static readonly hold = 0.4;
  private on: Int8Array;
  private t: Float64Array;

  constructor(doorCount: number) {
    this.on = new Int8Array(doorCount).fill(-1);
    this.t = new Float64Array(doorCount);
  }

  /** The local player cracked (`on`) or closed door `i` at time `now` (s). */
  predict(i: number, on: boolean, now: number): void {
    if (i < 0 || i >= this.on.length) return;
    this.on[i] = on ? 1 : 0;
    this.t[i] = now;
  }

  /** The crack state to apply for door `i` when the snapshot says `snapOn` at `now`. */
  resolve(i: number, snapOn: boolean, now: number): boolean {
    if (i < 0 || i >= this.on.length) return snapOn;
    const p = this.on[i]!;
    if (p < 0) return snapOn;
    if ((p === 1) === snapOn || now - this.t[i]! > CrackPrediction.hold) {
      this.on[i] = -1;
      return snapOn;
    }
    return p === 1;
  }
}
