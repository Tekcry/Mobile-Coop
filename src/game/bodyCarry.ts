import { TransformNode, Vector3 } from '../core/babylon';
import type { MoveOverride } from '../player/playerController';
import { CQ, dropCurve, liftCurve, type DropState, type LiftState } from './closeQuarters';
import { SOCKET_YAW, socketLocal } from '../ai/carryPose';
import type { Body } from '../ai/body';
import { BODY } from '../ai/bodies';
import type { GameState } from './gameState';
import { G } from '../physics/groups';
import { hyp2 } from '../core/mathx';
import { clearGripAxis } from '../player/attachGrips';
import type { Interactable } from './interactables';

/** Noise radius (m) of a body put down. */
export const DROP_NOISE = 3;

/** What the local carrier's owner does around the carry (the host / solo `StealthSystems`, the co-op client's
 *  `ClientCarry`). */
export interface CarryHooks {
  /** A ragdoll is under the budget now (else the body is laid flat). */
  canRagdoll(): boolean;
  /** A body put down at `at`: the guards hear it (solo / host; the client's host makes its own). */
  noise(r: number, at: Vector3): void;
  /** (G7) The lift was let go of before the hoist (crouch): the body lies there again. */
  onLetGo?(b: Body): void;
  /** The put down's hand-over (the ragdoll took the body), or the instant drop. */
  onDropped?(b: Body): void;
}

/**
 * The local player's body carry (G7, AUDIT-WALLS rows 6-8), moved unchanged out of `StealthSystems` (coop-carry) so the
 * co-op client carries with the same code: the 2.0 s committed lift, the carry (slow, bent, hands on the body's knees),
 * the 0.8 s put down and the instant drop. `GameState.carrier` reads it (through `StealthSystems` or the client's
 * `NetAttachment.carry`). No allocation per step.
 */
export class BodyCarry {
  /** The body on the player's shoulder. */
  carry: Body | null = null;
  private kneeL = new Vector3();
  private kneeR = new Vector3();

  constructor(
    private g: GameState,
    private hooks: CarryHooks,
  ) {}

  /** A body on the shoulder, or (G7) being lifted to it / put down from it: hands busy, no traversal. */
  get carrying(): boolean {
    return this.carry !== null || this.busy;
  }

  /** (G7) The lift or the put down is under way (committed: no interact, no movement). */
  get busy(): boolean {
    return this.liftT >= 0 || this.dropT >= 0;
  }

  /** Seconds into the lift / the put down (< 0: none). */
  private liftT = -1;
  private dropT = -1;
  private hoisting = false;
  private lc: LiftState = { atBody: true, hoist: 0, bend: 0, drop: 0, crouch: true, hands: 0, step: 0, load: 0 };
  private dc: DropState = { slide: 0, bend: 0, drop: 0, hands: 0, load: 0 };
  private liftFrom = new Vector3();
  private liftTo = new Vector3();
  private liftYaw = 0;
  private liftChest = new Vector3();
  private liftL = new Vector3();
  private liftR = new Vector3();
  private liftKin = new Vector3();
  private liftOv: MoveOverride = { kinematic: undefined, yaw: 0, turnRate: 8, crouch: true };
  private liftEye = new Vector3();
  private liftEye2 = new Vector3();
  private socket: TransformNode | null = null;
  private sockL = { th: 0, x: 0, y: 0, z: 0 };
  /** The hero's bend (rad) and pelvis drop (m) this step (GameState hands them to the player pose). */
  bend = 0;
  bendDrop = 0;
  /** (G7) Stepping in to the body under the override this step. */
  stepping = false;
  /** (anim-n4 fix) The body's weight on the shoulder this step, 0..1: the hoist in the lift, 1 carrying, easing out to the
   *  hand-over in the put down (the carry's lean and hip shift scale by it). */
  loadShare = 0;
  /** (anim-n4 fix) The lift's step-in to the body 0..1 this step, -1 no lift (the rig's lift crouch pose, cqGait.ts). */
  liftStepK = -1;

  /** (G7) The shoulder the body goes on: 1 right (CT 110936, 052704), -1 left when it lies head to his left (a hoist
   *  over the right shoulder swung the head through his back: tests/g7CloseQuarters). */
  private carrySide = 1;
  /** (anim-n4) The shoulder the body is on (1 right, -1 left): the carry walk leans away from it. */
  get loadSide(): number {
    return this.carrySide;
  }

  /** The carry socket's shoulder point in the operator's chest frame (x out to the right, y up from the chest node). */
  private shoulderX(): number {
    return this.g.player.rig.p.shoulderHalf * 0.75 * this.carrySide;
  }

  private shoulderY(): number {
    const rig = this.g.player.rig;
    const p = rig.p;
    const chestY = p.y.waist + 0.13 * (rig.height / 1.75);
    return p.y.shoulder - chestY + 0.12;
  }

  /** (G7, row 6, 110936 @ 39.5-42.6) Pick up: a 2.0 s committed lift. Step in to the body's chest and crouch over it
   *  with the hands at its shoulders (0-0.8 s; crouch cancels), hoist it up onto the right shoulder as he rises
   *  (0.8-1.6 s), settle (to 2.0 s). Replaces the instant teleport onto the shoulder. False when it cannot start. */
  pickUp(b: Body): boolean {
    if (this.carry || this.busy || !b.present || this.g.traversal.active) return false;
    const g = this.g;
    const c = g.player.controller;
    this.carry = b;
    this.liftT = 0;
    // (G7 fix round) CT stands up with the body: a crouch toggle from before the lift is cleared (one pressed while
    // carrying stays)
    c.standUp();
    this.hoisting = false;
    // kneel beside the chest on the side he stands, facing it; at most a metre's step, never through a wall
    const yaw = b.liftPoints(this.liftChest, this.liftL, this.liftR);
    const ch = this.liftChest;
    const p = c.pos;
    let px = -Math.cos(yaw);
    let pz = Math.sin(yaw);
    if ((p.x - ch.x) * px + (p.z - ch.z) * pz < 0) {
      px = -px;
      pz = -pz;
    }
    const to = this.liftTo;
    to.set(ch.x + px * CQ.liftSide, p.y, ch.z + pz * CQ.liftSide);
    const dx = to.x - p.x;
    const dz = to.z - p.z;
    const d = hyp2(dx, dz);
    if (d > CQ.liftStepMax) to.set(p.x + (dx * CQ.liftStepMax) / d, p.y, p.z + (dz * CQ.liftStepMax) / d);
    this.liftEye.set(p.x, p.y + 0.9, p.z);
    this.liftEye2.set(to.x, to.y + 0.9, to.z);
    if (!g.ballistics.clear(this.liftEye, this.liftEye2, G.STATIC)) to.copyFrom(p);
    this.liftFrom.copyFrom(p);
    this.liftYaw = Math.atan2(ch.x - to.x, ch.z - to.z);
    // the head to his right: over the right shoulder (CT); to his left: the left one (mirrored)
    this.carrySide = Math.sin(yaw) * Math.cos(this.liftYaw) - Math.cos(yaw) * Math.sin(this.liftYaw) >= 0 ? 1 : -1;
    g.events.emit('body', { action: 'pickup' });
    return true;
  }

  /** Put the body down at once (a restart, the carrier down): a short ragdoll drop in front. The interact's "Drop body"
   *  is the 0.8 s put down (`beginDrop`). */
  dropCarried(): void {
    const b = this.carry;
    this.endMotion();
    if (!b) return;
    const c = this.g.player.controller;
    const s = Math.sin(c.yaw);
    const co = Math.cos(c.yaw);
    const at = new Vector3(c.pos.x + s * 0.7, c.pos.y, c.pos.z + co * 0.7);
    b.drop(new Vector3(s * CQ.dropImpulse, CQ.dropImpulseDown, co * CQ.dropImpulse), this.hooks.canRagdoll(), at, c.yaw + Math.PI / 2);
    this.carry = null;
    this.release();
    this.hooks.noise(DROP_NOISE, at);
    this.g.events.emit('body', { action: 'drop' });
    this.hooks.onDropped?.(b);
  }

  /** (G7, row 8, 110936 @ 45.8-46.6) "Drop body": 0.8 s committed. The shoulder dips, the body rolls off it to the right
   *  side and the ragdoll takes it at 0.6 s with a small push (was an instant 25 m/s throw 0.7 m in front). */
  beginDrop(): void {
    if (!this.carry || this.busy) return;
    this.dropT = 0;
  }

  /** The ragdoll takes the body off the shoulder (the put down's hand-over). */
  private handOver(): void {
    const b = this.carry;
    if (!b) return;
    const c = this.g.player.controller;
    const s = Math.sin(c.yaw);
    const co = Math.cos(c.yaw);
    // his right (co, -s) on a right-shoulder carry (the left mirrored): the side the body was on
    const sd = this.carrySide;
    const at = new Vector3(c.pos.x + co * 0.5 * sd, c.pos.y, c.pos.z - s * 0.5 * sd);
    const k = CQ.dropImpulse;
    b.drop(new Vector3(co * k * sd + s * k * 0.3, CQ.dropImpulseDown, -s * k * sd + co * k * 0.3), this.hooks.canRagdoll(), at, c.yaw + Math.PI / 2);
    this.carry = null;
    this.hooks.noise(DROP_NOISE, at);
    this.g.events.emit('body', { action: 'drop' });
    this.hooks.onDropped?.(b);
  }

  /** Stop a lift / put down (its override and hands off). */
  private endMotion(): void {
    if (this.liftT >= 0 || this.dropT >= 0) {
      const c = this.g.player.controller;
      if (c.override === this.liftOv) c.override = null;
    }
    this.liftT = this.dropT = -1;
    this.hoisting = false;
  }

  private holdStill(x: number, y: number, z: number, yaw: number, crouch: boolean): void {
    const ov = this.liftOv;
    this.liftKin.set(x, y, z);
    ov.kinematic = this.liftKin;
    ov.yaw = yaw;
    ov.crouch = crouch;
    this.g.player.controller.override = ov;
  }

  /** The lift's fixed step. */
  private liftStep(crouchPressed: boolean): void {
    const b = this.carry!;
    const t = (this.liftT += 1 / 60);
    const lc = liftCurve(t, this.lc);
    const c = this.g.player.controller;
    // still crouched at the body: crouch lets it go
    if (crouchPressed && lc.atBody && t > 0.1) {
      c.swallowCrouch = true;
      this.endMotion();
      this.carry = null;
      this.release();
      this.hooks.onLetGo?.(b);
      return;
    }
    const f = this.liftFrom;
    const to = this.liftTo;
    // (anim-n4 fix) the controller crouch stays on this fixed timeline (from t = 0); the standing step-in and "down until a
    // foot lands" are the rig's (cqGait.ts CqLiftCrouch, from `liftStepK`): gameplay never reads the animation
    this.holdStill(f.x + (to.x - f.x) * lc.step, f.y, f.z + (to.z - f.z) * lc.step, this.liftYaw, lc.crouch);
    this.stepping = lc.step < 1;
    this.liftStepK = lc.step;
    this.loadShare = lc.load;
    this.bend = lc.bend;
    this.bendDrop = lc.drop;
    if (!lc.atBody && !this.hoisting && !b.carried) {
      b.beginHoist();
      this.hoisting = true;
    }
    if (t >= CQ.liftRise && this.hoisting) {
      b.shoulder(this.g.player.rig.torso, this.shoulderX(), this.shoulderY());
      this.hoisting = false;
    }
    if (t >= CQ.lift) this.endMotion();
  }

  /** The put down's fixed step. */
  private dropStep(): void {
    const t = (this.dropT += 1 / 60);
    const dc = dropCurve(t, this.dc);
    const c = this.g.player.controller;
    this.holdStill(c.pos.x, c.pos.y, c.pos.z, c.yaw, false);
    this.bend = dc.bend;
    this.bendDrop = dc.drop;
    this.loadShare = this.carry ? dc.load : 0;
    if (this.carry && t >= CQ.dropHand) this.handOver();
    if (t >= CQ.drop) {
      this.endMotion();
      this.release();
    }
  }

  /** Off the shoulder for good (into a hiding spot): the carry ends, the body is returned (null: none). */
  takeOff(): Body | null {
    const b = this.carry;
    if (!b) return null;
    this.endMotion();
    this.carry = null;
    this.release();
    return b;
  }

  /** The carry ends with no drop (a restart removed the body, or it went away): motion, carry and hands off. */
  reset(): void {
    this.endMotion();
    if (this.carry) {
      this.carry = null;
      this.release();
    }
  }

  private release(): void {
    const rig = this.g.player.rig;
    rig.reachL.w = rig.reachR.w = 0;
  }

  /** Fixed step: the carry movement rules (call once per fixed step, after the corner controller). `crouchPressed` (G7)
   *  lets go of a body still being reached for. */
  fixedUpdate(crouchPressed = false): void {
    this.bend = this.bendDrop = 0;
    this.stepping = false;
    this.loadShare = 0;
    this.liftStepK = -1;
    if (!this.g.player.alive && (this.carry || this.busy)) {
      this.dropCarried();
      return;
    }
    if (this.dropT >= 0) {
      this.dropStep();
      return;
    }
    if (!this.carry) {
      // (the body taken away mid-lift: a restart, a test)
      if (this.liftT >= 0) this.endMotion();
      return;
    }
    if (this.liftT >= 0) {
      this.liftStep(crouchPressed);
      return;
    }
    // (G7, row 7) carrying: slow (CT 0.4-0.8 m/s, was 2.2), bent forward under the weight
    const c = this.g.player.controller;
    c.speedCap = Math.min(c.speedCap, BODY.carrySpeed);
    this.bend = CQ.carryBend;
    this.bendDrop = CQ.carryDrop;
    this.loadShare = 1;
  }

  /** Render frame (before the player animates): the hands on the body (its shoulders as he reaches for it, then its
   *  legs over the shoulder); (G7) the hoist and the slide off the shoulder pose the carried rig. */
  frameUpdate(): void {
    const b = this.carry;
    const rig = this.g.player.rig;
    if (!b) {
      // the put down after the hand-over: the hands have let go
      if (this.dropT >= 0) rig.reachL.w = rig.reachR.w = 0;
      return;
    }
    // (anim-cleanup) a carried body's knees are not a grip axis
    clearGripAxis(rig.reachR);
    clearGripAxis(rig.reachL);
    let w = 1;
    if (this.liftT >= 0) {
      const lc = this.lc;
      w = lc.hands;
      if (lc.atBody) {
        // crouched over it: the hands under its shoulders
        b.liftPoints(this.liftChest, this.liftL, this.liftR);
        const near = this.nearSide();
        const a = near ? this.liftR : this.liftL;
        const o = near ? this.liftL : this.liftR;
        rig.reachR.x = a.x;
        rig.reachR.y = a.y - 0.04;
        rig.reachR.z = a.z;
        rig.reachR.w = w;
        rig.reachL.x = o.x;
        rig.reachL.y = o.y - 0.04;
        rig.reachL.z = o.z;
        rig.reachL.w = w * 0.9;
        return;
      }
      if (this.hoisting) b.hoist(this.socketNode(b), this.carrySide, lc.hoist);
    } else if (this.dropT >= 0) {
      b.slide(this.shoulderX(), this.shoulderY(), this.dc.slide);
      w = this.dc.hands;
    }
    b.knees(this.kneeL, this.kneeR);
    rig.reachR.x = this.kneeR.x;
    rig.reachR.y = this.kneeR.y;
    rig.reachR.z = this.kneeR.z;
    rig.reachR.w = w;
    rig.reachL.x = this.kneeL.x;
    rig.reachL.y = this.kneeL.y - 0.05;
    rig.reachL.z = this.kneeL.z;
    rig.reachL.w = 0.8 * w;
  }

  /** The body's right shoulder is the nearer one to the operator's right hand (lying either way up). */
  private nearSide(): boolean {
    const c = this.g.player.controller;
    const s = Math.sin(c.yaw);
    const co = Math.cos(c.yaw);
    // the hero's right (co, -s): whichever body shoulder lies further that way takes the right hand
    return (this.liftR.x - this.liftL.x) * co - (this.liftR.z - this.liftL.z) * s > 0;
  }

  /** The carry socket on the operator's chest (a node there at the socket's local transform), for the hoist. */
  private socketNode(b: Body): TransformNode {
    const torso = this.g.player.rig.torso;
    let n = this.socket;
    if (!n) {
      n = this.socket = new TransformNode('carry-socket', torso.getScene());
      n.parent = torso;
    }
    const view = b.view;
    if (view) {
      socketLocal(view, this.shoulderX(), this.shoulderY(), this.sockL);
      n.rotation.set(this.sockL.th, SOCKET_YAW, 0);
      n.position.set(this.sockL.x, this.sockL.y, this.sockL.z);
    }
    return n;
  }

  dispose(): void {
    this.socket?.dispose();
    this.socket = null;
  }
}

/** What `GameState` reads of the local player's carry (`GameState.carrier`): `StealthSystems` (solo / host) or the co-op
 *  client's carry (`NetAttachment.carry`). */
export interface LocalCarry {
  readonly carrying: boolean;
  readonly busy: boolean;
  readonly bend: number;
  readonly bendDrop: number;
  readonly stepping: boolean;
  readonly loadShare: number;
  readonly loadSide: number;
  readonly liftStepK: number;
  /** While carrying: the interact target (a hiding spot, a door faced, "Drop body"); null otherwise. */
  carryTarget(feet: Vector3): Interactable | null;
}

/** (coop-carry) The co-op client's carry as `GameState` steps it (`NetAttachment.carry`): the fixed step where
 *  `StealthSystems.fixedUpdate` runs (before the player's step: its speed cap), the render frame before the player
 *  animates. */
export interface NetCarry extends LocalCarry {
  fixedUpdate(crouchPressed: boolean): void;
  frameUpdate(): void;
}
