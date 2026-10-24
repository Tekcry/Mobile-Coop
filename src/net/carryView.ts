/**
 * (coop-carry) A partner carrying a body, as this page shows it (host: a client's carry; client: the host's or the other
 * client's): the body lifted (`Body.beginHoist`: off the floor list, a fresh rig where it lay) when the mirror says so,
 * on the partner's shoulder at `CQ.liftRise` (the owner's own lift timing), the avatar bent with its hands on the body's
 * knees (`RemoteAvatar.carryLoad`); put down into a ragdoll at his side, or hidden (gone). Render / sim side of the
 * pure `bodyCarryNet.ts`; no allocation per step.
 */
import { Vector3 } from '../core/babylon';
import type { Body } from '../ai/body';
import { CQ } from '../game/closeQuarters';
import { carryShoulderX, carryShoulderY, carrySideOf } from '../game/bodyCarry';
import type { RemoteAvatar } from './remoteAvatar';

const chest = new Vector3();
const sL = new Vector3();
const sR = new Vector3();

/** Seconds the shown load eases in once the body is on the shoulder. */
const LOAD_IN = 0.4;

export class CarryView {
  /** Seconds since the lift began. */
  t = 0;
  private shouldered = false;
  private readonly side: number;

  constructor(
    readonly body: Body,
    readonly avatar: RemoteAvatar,
  ) {
    // the shoulder the owner's lift chose: the side the head lies, seen from where he stands
    const headYaw = body.liftPoints(chest, sL, sR);
    this.side = carrySideOf(headYaw, Math.atan2(chest.x - avatar.pos.x, chest.z - avatar.pos.z));
    body.beginHoist();
    avatar.carrySide = this.side;
    avatar.carryKnees = body;
    avatar.carryLoad = 0;
  }

  /** On the shoulder yet (the lift's hoist done). */
  get onShoulder(): boolean {
    return this.shouldered;
  }

  /** One step (fixed or frame): the hoist lands at `CQ.liftRise`, then the load eases in. */
  step(dt: number): void {
    this.t += dt;
    const a = this.avatar;
    if (!this.shouldered && this.t >= CQ.liftRise) {
      this.body.shoulder(a.rig.torso, carryShoulderX(a.rig, this.side), carryShoulderY(a.rig));
      this.shouldered = true;
    }
    a.carryLoad = this.shouldered ? Math.min(1, (this.t - CQ.liftRise) / LOAD_IN) : 0;
  }

  /** Put down at his side (the ragdoll, or laid flat over the budget): as the owner's hand-over. */
  drop(ragdollOk: boolean): Vector3 {
    const a = this.avatar;
    const s = Math.sin(a.yaw);
    const co = Math.cos(a.yaw);
    const sd = this.side;
    const at = new Vector3(a.pos.x + co * 0.5 * sd, a.pos.y, a.pos.z - s * 0.5 * sd);
    const k = CQ.dropImpulse;
    this.body.drop(new Vector3(co * k * sd + s * k * 0.3, CQ.dropImpulseDown, -s * k * sd + co * k * 0.3), ragdollOk, at, a.yaw + Math.PI / 2);
    this.clear();
    return at;
  }

  /** Into a hiding spot: gone for good. */
  hide(): void {
    this.body.hide();
    this.clear();
  }

  /** The avatar no longer carries (the body went another way). */
  clear(): void {
    const a = this.avatar;
    a.carryLoad = 0;
    if (a.carryKnees === this.body) a.carryKnees = null;
  }
}
