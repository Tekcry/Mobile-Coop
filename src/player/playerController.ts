import {
  CharacterSupportedState,
  PhysicsCharacterController,
  Vector3,
  type CharacterSurfaceInfo,
  type Scene,
} from '../core/babylon';
import { GRAVITY } from '../physics/havok';
import { G, MASK } from '../physics/groups';

export const PLAYER_TUNING = {
  walkSpeed: 5.0,
  sprintSpeed: 7.4,
  crouchSpeed: 2.6,
  adsSpeed: 3.0,
  jumpHeight: 1.2,
  airControl: 0.35,
  rollSpeed: 8.5,
  rollTime: 0.48,
  rollCooldown: 0.65,
  standHeight: 1.8,
  crouchHeight: 1.15,
  radius: 0.34,
  turnSpeed: 14,
  maxStep: 0.42,
};

export interface PlayerInput {
  moveX: number;
  moveY: number;
  jump: boolean;
  /** Edge: crouch/roll button pressed this step. */
  crouchPressed: boolean;
  /** Level: crouch button held (hold mode). */
  crouchHeld: boolean;
  crouchToggle: boolean;
  sprint: boolean;
  ads: boolean;
  /** Character faces the camera (aiming or firing). */
  aimLock: boolean;
}

const UP = new Vector3(0, 1, 0);
const DOWN = new Vector3(0, -1, 0);

/** Havok character controller with walk/sprint/crouch/roll/jump and step/slope handling. */
export class PlayerController {
  static stickForce = 1.2;
  readonly cc: PhysicsCharacterController;
  /** Feet position (render-interpolated copy in `renderPos`). */
  readonly pos = new Vector3();
  readonly prevPos = new Vector3();
  readonly renderPos = new Vector3();
  yaw = 0;
  private prevYaw = 0;
  renderYaw = 0;
  grounded = true;
  crouched = false;
  /** Visual crouch blend 0..1. */
  crouchBlend = 0;
  rollT = -1;
  private rollCd = 0;
  private rollDir = new Vector3(0, 0, 1);
  sprinting = false;
  speed = 0;
  localMove = { x: 0, z: 0 };
  private height = PLAYER_TUNING.standHeight;
  private support: CharacterSurfaceInfo | null = null;
  private wish = new Vector3();
  private tmp = new Vector3();
  private crouchToggled = false;
  /** After take-off, ignore "supported" (contact tolerance) briefly so the jump is not cancelled. */
  private airborneLock = 0;
  /** Disable movement (dead, cutscene, menus). */
  frozen = false;
  /** External speed multiplier (e.g. weapon weight). */
  speedMul = 1;

  constructor(
    private scene: Scene,
    spawn: Vector3,
    yaw: number,
  ) {
    const center = spawn.add(new Vector3(0, PLAYER_TUNING.standHeight / 2 + 0.02, 0));
    this.cc = new PhysicsCharacterController(
      center,
      { capsuleHeight: PLAYER_TUNING.standHeight, capsuleRadius: PLAYER_TUNING.radius },
      scene,
    );
    this.cc.maxSlopeCosine = Math.cos((50 * Math.PI) / 180);
    this.cc.maxStepHeight = PLAYER_TUNING.maxStep;
    this.cc.characterStrength = 900;
    this.cc.characterMass = 80;
    this.cc.keepDistance = 0.04;
    this.applyFilters();
    this.yaw = this.prevYaw = this.renderYaw = yaw;
    this.syncFeet();
    this.prevPos.copyFrom(this.pos);
    this.renderPos.copyFrom(this.pos);
  }

  private applyFilters(): void {
    this.cc.shape.filterMembershipMask = G.PLAYER;
    this.cc.shape.filterCollideMask = MASK.PLAYER_COLLIDE;
  }

  private syncFeet(): void {
    this.cc.getPosition().subtractToRef(new Vector3(0, this.height / 2, 0), this.pos);
  }

  get eyeHeight(): number {
    return this.crouched ? 1.05 : 1.6;
  }

  get isRolling(): boolean {
    return this.rollT >= 0;
  }

  teleport(feet: Vector3, yaw?: number): void {
    this.cc.setPosition(feet.add(new Vector3(0, this.height / 2 + 0.02, 0)));
    this.cc.setVelocity(Vector3.Zero());
    this.syncFeet();
    this.prevPos.copyFrom(this.pos);
    this.renderPos.copyFrom(this.pos);
    if (yaw !== undefined) this.yaw = this.prevYaw = this.renderYaw = yaw;
  }

  private setHeight(h: number): void {
    if (h === this.height) return;
    this.cc.setShapeOptions({ capsuleHeight: h, capsuleRadius: PLAYER_TUNING.radius }, true);
    this.height = h;
    this.applyFilters();
  }

  private hasHeadroom(): boolean {
    const top = this.pos.add(new Vector3(0, this.height, 0));
    const res = this.scene.getPhysicsEngine()?.raycast(top, top.add(new Vector3(0, PLAYER_TUNING.standHeight - this.height + 0.05, 0)), {
      membership: G.PLAYER,
      collideWith: G.STATIC,
    });
    return !res?.hasHit;
  }

  fixedUpdate(dt: number, input: PlayerInput, camYaw: number): void {
    const T = PLAYER_TUNING;
    this.prevPos.copyFrom(this.pos);
    this.prevYaw = this.yaw;
    this.rollCd = Math.max(0, this.rollCd - dt);

    // wish direction (camera relative)
    const fx = Math.sin(camYaw);
    const fz = Math.cos(camYaw);
    let mx = this.frozen ? 0 : input.moveX;
    let my = this.frozen ? 0 : input.moveY;
    const mag = Math.min(1, Math.hypot(mx, my));
    if (mag < 0.05) mx = my = 0;
    this.wish.set(fz * mx + fx * my, 0, -fx * mx + fz * my);

    // crouch / roll
    if (!this.frozen && input.crouchPressed && this.grounded && !this.isRolling) {
      if (mag > 0.5 && this.rollCd === 0) {
        this.rollT = 0;
        this.rollDir.copyFrom(this.wish).normalize();
        this.crouchToggled = false;
      } else if (input.crouchToggle) {
        this.crouchToggled = !this.crouchToggled;
      }
    }
    let wantCrouch = input.crouchToggle ? this.crouchToggled : input.crouchHeld;
    if (this.isRolling) wantCrouch = true;
    if (input.jump && this.crouchToggled) {
      this.crouchToggled = false;
      wantCrouch = false;
    }
    if (wantCrouch && !this.crouched) {
      this.setHeight(T.crouchHeight);
      this.crouched = true;
    } else if (!wantCrouch && this.crouched && this.hasHeadroom()) {
      this.setHeight(T.standHeight);
      this.crouched = false;
    }

    // speed selection
    this.sprinting = input.sprint && !input.ads && !this.crouched && my > 0.5 && this.grounded;
    let maxSpeed = this.crouched ? T.crouchSpeed : input.ads ? T.adsSpeed : this.sprinting ? T.sprintSpeed : T.walkSpeed;
    maxSpeed *= this.speedMul;
    const desired = this.tmp.copyFrom(this.wish).scaleInPlace(maxSpeed);

    if (this.isRolling) {
      this.rollT += dt / T.rollTime;
      const ease = 1 - this.rollT * 0.5;
      desired.copyFrom(this.rollDir).scaleInPlace(T.rollSpeed * ease);
      if (this.rollT >= 1) {
        this.rollT = -1;
        this.rollCd = T.rollCooldown;
      }
    }

    if (this.grounded && mag > 0.1) this.stepAssist(dt);

    // Havok character controller step
    const support = (this.support = this.cc.checkSupport(dt, DOWN));
    const cur = this.cc.getVelocity();
    this.airborneLock = Math.max(0, this.airborneLock - dt);
    const grounded = support.supportedState === CharacterSupportedState.SUPPORTED && this.airborneLock === 0;
    let out: Vector3;
    if (grounded && input.jump && !this.frozen && !this.isRolling) {
      const u = Math.sqrt(2 * -GRAVITY.y * T.jumpHeight);
      const along = cur.dot(UP);
      out = cur.add(UP.scale(u - along));
      // keep horizontal intent on take-off
      out.x = desired.x;
      out.z = desired.z;
      this.grounded = false;
      this.airborneLock = 0.2;
    } else if (grounded) {
      out = this.cc.calculateMovement(dt, this.forwardVec(), support.averageSurfaceNormal, cur, support.averageSurfaceVelocity, desired, UP);
      out.subtractInPlace(support.averageSurfaceVelocity);
      if (out.dot(UP) > 1e-3) {
        // project onto slope so walking up does not launch the player
        const len = out.length();
        out.normalizeFromLength(len);
        const horiz = len / support.averageSurfaceNormal.dot(UP);
        const c = support.averageSurfaceNormal.cross(out);
        out = c.cross(UP).scaleInPlace(horiz);
      }
      out.addInPlace(support.averageSurfaceVelocity);
      // Small stick force keeps the capsule in contact (no hovering within contact tolerance).
      out.subtractInPlace(support.averageSurfaceNormal.scale(PlayerController.stickForce));
      this.grounded = true;
    } else {
      // air: limited control, keep vertical velocity, apply gravity
      const air = new Vector3(cur.x, 0, cur.z);
      const target = new Vector3(desired.x, 0, desired.z);
      air.addInPlace(target.subtract(air).scale(Math.min(1, T.airControl * dt * 10)));
      out = new Vector3(air.x, cur.y, air.z).addInPlace(GRAVITY.scale(dt));
      this.grounded = false;
    }
    this.cc.setVelocity(out);
    this.cc.integrate(dt, support, GRAVITY);
    this.syncFeet();

    // facing
    const v = this.cc.getVelocity();
    this.speed = Math.hypot(v.x, v.z);
    if (input.aimLock || input.ads) {
      this.yaw = turnTowards(this.yaw, camYaw, T.turnSpeed * 2 * dt);
    } else if (this.isRolling) {
      this.yaw = turnTowards(this.yaw, Math.atan2(this.rollDir.x, this.rollDir.z), T.turnSpeed * 2 * dt);
    } else if (mag > 0.1) {
      this.yaw = turnTowards(this.yaw, Math.atan2(this.wish.x, this.wish.z), T.turnSpeed * dt);
    }
    // local move for animation
    const s = Math.sin(this.yaw);
    const c = Math.cos(this.yaw);
    const inv = this.speed > 0.01 ? 1 / this.speed : 0;
    this.localMove.x = (v.x * c - v.z * s) * inv;
    this.localMove.z = (v.x * s + v.z * c) * inv;
    this.crouchBlend += ((this.crouched ? 1 : 0) - this.crouchBlend) * Math.min(1, dt * 12);
  }

  private stepCd = 0;
  /**
   * Havok's built-in step-up needs the per-step sweep to clear the capsule radius, which
   * walking speed never does. Probe ahead with rays and lift onto steps <= maxStep.
   */
  private stepAssist(dt: number): void {
    this.stepCd = Math.max(0, this.stepCd - dt);
    if (this.stepCd > 0) return;
    const eng = this.scene.getPhysicsEngine();
    if (!eng) return;
    const T = PLAYER_TUNING;
    const dir = this.wish.clone();
    dir.y = 0;
    if (dir.lengthSquared() < 1e-4) return;
    dir.normalize();
    const q = { membership: G.PLAYER, collideWith: G.STATIC };
    for (const reach of [T.radius + 0.1, T.radius + 0.22]) {
      const from = this.pos.add(dir.scale(reach)).addInPlace(new Vector3(0, T.maxStep + 0.05, 0));
      const to = from.add(new Vector3(0, -(T.maxStep + 0.1), 0));
      const hit = eng.raycast(from, to, q);
      if (!hit.hasHit) continue;
      const h = hit.hitPoint.y - this.pos.y;
      // flat step tops only; slopes are handled by the controller itself
      if (h < 0.08 || h > T.maxStep || hit.hitNormal.y < 0.97) continue;
      // space above the step must be free for the whole body
      const chestFrom = this.pos.add(new Vector3(0, h + 0.15, 0));
      const block = eng.raycast(chestFrom, chestFrom.add(dir.scale(reach + 0.1)), q);
      if (block.hasHit) continue;
      const head = eng.raycast(chestFrom, chestFrom.add(new Vector3(0, this.height, 0)), q);
      if (head.hasHit) continue;
      this.cc.setPosition(this.cc.getPosition().add(new Vector3(0, h + 0.03, 0)).addInPlace(dir.scale(0.04)));
      this.syncFeet();
      this.stepCd = 0.08;
      return;
    }
  }

  private forwardVec(): Vector3 {
    return new Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
  }

  /** Interpolate between the last two fixed steps for smooth rendering. */
  interpolate(alpha: number): void {
    Vector3.LerpToRef(this.prevPos, this.pos, alpha, this.renderPos);
    this.renderYaw = lerpAngle(this.prevYaw, this.yaw, alpha);
  }

  get onGroundSupport(): CharacterSurfaceInfo | null {
    return this.support;
  }

  dispose(): void {
    this.cc.dispose();
  }
}

export function wrapAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function turnTowards(cur: number, target: number, maxStep: number): number {
  const d = wrapAngle(target - cur);
  if (Math.abs(d) <= maxStep) return target;
  return wrapAngle(cur + Math.sign(d) * maxStep);
}

export function lerpAngle(a: number, b: number, t: number): number {
  return a + wrapAngle(b - a) * t;
}

