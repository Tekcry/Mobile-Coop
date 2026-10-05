import {
  CharacterSupportedState,
  PhysicsCharacterController,
  Vector3,
  type CharacterSurfaceInfo,
  type Scene,
} from '../core/babylon';
import { GRAVITY } from '../physics/havok';
import { G, MASK } from '../physics/groups';
import { MOVEMENT } from '../config/movement';
import { EasedVelocity, RollGate, SprintGate, targetSpeed, type Stance } from './movement';

/** Movement constants live in `config/movement.ts` (live-tunable). Kept as an alias for older code. */
export const PLAYER_TUNING = MOVEMENT;

/**
 * Lets another system (cover) drive the controller for a step: a desired horizontal velocity and
 * facing; or a kinematic feet position (vaults) that bypasses collision for committed moves.
 */
export interface MoveOverride {
  velocity?: { x: number; z: number };
  yaw?: number;
  crouch?: boolean;
  kinematic?: Vector3;
}

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
  readonly roll = new RollGate();
  readonly sprint = new SprintGate();
  readonly vel = new EasedVelocity();
  private rollDir = new Vector3(0, 0, 1);
  sprinting = false;
  /** Set each step by the cover system (or null). */
  override: MoveOverride | null = null;
  speed = 0;
  localMove = { x: 0, z: 0 };
  private height: number = MOVEMENT.standHeight;
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
    const center = spawn.add(new Vector3(0, MOVEMENT.standHeight / 2 + 0.02, 0));
    this.cc = new PhysicsCharacterController(
      center,
      { capsuleHeight: MOVEMENT.standHeight, capsuleRadius: MOVEMENT.radius },
      scene,
    );
    // we ease velocity ourselves (EasedVelocity); the controller should follow it exactly
    this.cc.acceleration = 1;
    this.cc.maxAcceleration = 80;
    this.cc.maxSlopeCosine = Math.cos((50 * Math.PI) / 180);
    this.cc.maxStepHeight = MOVEMENT.maxStep;
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
    return this.roll.active;
  }

  /** Roll progress 0..1 while rolling, else -1. */
  get rollT(): number {
    return this.roll.progress;
  }

  /** Weapon lowered: sprinting (incl. wind-up/recovery) or rolling/recovering. */
  get weaponBlocked(): boolean {
    return this.sprint.blocksWeapon || this.roll.blocksWeapon;
  }

  /** Current capsule height (crouch-aware). */
  get capsuleHeight(): number {
    return this.height;
  }

  teleport(feet: Vector3, yaw?: number): void {
    this.cc.setPosition(feet.add(new Vector3(0, this.height / 2 + 0.02, 0)));
    this.cc.setVelocity(Vector3.Zero());
    this.vel.reset();
    this.syncFeet();
    this.prevPos.copyFrom(this.pos);
    this.renderPos.copyFrom(this.pos);
    if (yaw !== undefined) this.yaw = this.prevYaw = this.renderYaw = yaw;
  }

  private setHeight(h: number): void {
    if (h === this.height) return;
    this.cc.setShapeOptions({ capsuleHeight: h, capsuleRadius: MOVEMENT.radius }, true);
    this.height = h;
    this.applyFilters();
  }

  private hasHeadroom(): boolean {
    const top = this.pos.add(new Vector3(0, this.height, 0));
    const res = this.scene.getPhysicsEngine()?.raycast(top, top.add(new Vector3(0, MOVEMENT.standHeight - this.height + 0.05, 0)), {
      membership: G.PLAYER,
      collideWith: G.STATIC,
    });
    return !res?.hasHit;
  }

  fixedUpdate(dt: number, input: PlayerInput, camYaw: number): void {
    const T = MOVEMENT;
    const ov = this.override;
    this.prevPos.copyFrom(this.pos);
    this.prevYaw = this.yaw;
    this.roll.update(dt);

    // committed kinematic move (vault): no collision, exact path
    if (ov?.kinematic) {
      this.cc.setPosition(ov.kinematic.add(new Vector3(0, this.height / 2 + 0.02, 0)));
      this.cc.setVelocity(Vector3.Zero());
      this.syncFeet();
      if (ov.yaw !== undefined) this.yaw = turnTowards(this.yaw, ov.yaw, T.turnSpeed * 2 * dt);
      this.speed = Vector3.Distance(this.pos, this.prevPos) / Math.max(dt, 1e-4);
      this.grounded = true;
      this.sprint.update(false, dt);
      this.crouchBlend += ((this.crouched ? 1 : 0) - this.crouchBlend) * Math.min(1, dt * 12);
      return;
    }

    // wish direction (camera relative)
    const fx = Math.sin(camYaw);
    const fz = Math.cos(camYaw);
    let mx = this.frozen ? 0 : input.moveX;
    let my = this.frozen ? 0 : input.moveY;
    const mag = Math.min(1, Math.hypot(mx, my));
    if (mag < 0.05) mx = my = 0;
    this.wish.set(fz * mx + fx * my, 0, -fx * mx + fz * my);
    if (this.wish.lengthSquared() > 1) this.wish.normalize();

    // crouch / roll
    if (!this.frozen && !ov && input.crouchPressed && this.grounded && !this.isRolling) {
      if (mag > 0.5 && this.roll.start()) {
        this.rollDir.copyFrom(this.wish).normalize();
        this.crouchToggled = false;
      } else if (input.crouchToggle) {
        this.crouchToggled = !this.crouchToggled;
      }
    }
    let wantCrouch = input.crouchToggle ? this.crouchToggled : input.crouchHeld;
    if (ov?.crouch !== undefined) wantCrouch = ov.crouch;
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

    // sprint is a commitment: forward, grounded, standing, not aiming; wind-up then recovery
    const wantSprint = !ov && input.sprint && !input.ads && !this.crouched && my > 0.5 && this.grounded && !this.isRolling;
    this.sprint.update(wantSprint, dt);
    this.sprinting = this.sprint.sprinting;
    const stance: Stance = ov ? 'cover' : this.crouched ? 'crouch' : input.ads ? 'ads' : 'stand';
    let speedTarget = targetSpeed(mag, stance);
    if (this.sprint.sprinting) speedTarget += (T.sprintSpeed - speedTarget) * this.sprint.blend;
    speedTarget *= this.speedMul;
    const inv = mag > 0 ? speedTarget / Math.max(mag, 1e-3) : 0;
    let tx = this.wish.x * inv;
    let tz = this.wish.z * inv;
    if (ov?.velocity) {
      tx = ov.velocity.x;
      tz = ov.velocity.z;
    }
    if (this.isRolling) {
      const rs = this.roll.speedAt();
      tx = this.rollDir.x * rs;
      tz = this.rollDir.z * rs;
      this.vel.reset(tx, tz);
    } else if (this.grounded) {
      this.vel.step(tx, tz, dt);
    }
    const desired = this.tmp.set(this.vel.x, 0, this.vel.z);

    if (this.grounded && mag > 0.1) this.stepAssist(dt);

    // Havok character controller step
    const support = (this.support = this.cc.checkSupport(dt, DOWN));
    const cur = this.cc.getVelocity();
    this.airborneLock = Math.max(0, this.airborneLock - dt);
    const grounded = support.supportedState === CharacterSupportedState.SUPPORTED && this.airborneLock === 0;
    let out: Vector3;
    if (grounded && input.jump && !this.frozen && !this.isRolling && !ov) {
      // modest, committed jump: keep the take-off velocity
      const u = Math.sqrt(2 * -GRAVITY.y * T.jumpHeight);
      const along = cur.dot(UP);
      out = cur.add(UP.scale(u - along));
      out.x = desired.x;
      out.z = desired.z;
      this.grounded = false;
      this.airborneLock = 0.2;
      this.sprint.cancel();
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
      if (!this.grounded) this.vel.reset(cur.x, cur.z);
      this.grounded = true;
    } else {
      // air: committed arc, minimal control
      const k = Math.min(1, T.airControl * dt * 10);
      out = new Vector3(cur.x + (tx - cur.x) * k, cur.y, cur.z + (tz - cur.z) * k).addInPlace(GRAVITY.scale(dt));
      this.vel.reset(out.x, out.z);
      this.grounded = false;
    }
    this.cc.setVelocity(out);
    this.cc.integrate(dt, support, GRAVITY);
    this.syncFeet();

    // facing
    const v = this.cc.getVelocity();
    this.speed = Math.hypot(v.x, v.z);
    if (ov?.yaw !== undefined) {
      this.yaw = turnTowards(this.yaw, ov.yaw, T.turnSpeed * dt);
    } else if (input.aimLock || input.ads) {
      this.yaw = turnTowards(this.yaw, camYaw, T.turnSpeed * 1.6 * dt);
    } else if (this.isRolling) {
      this.yaw = turnTowards(this.yaw, Math.atan2(this.rollDir.x, this.rollDir.z), T.turnSpeed * 2 * dt);
    } else if (mag > 0.1) {
      this.yaw = turnTowards(this.yaw, Math.atan2(this.wish.x, this.wish.z), T.turnSpeed * dt);
    }
    // local move for animation
    const s = Math.sin(this.yaw);
    const c = Math.cos(this.yaw);
    const invS = this.speed > 0.01 ? 1 / this.speed : 0;
    this.localMove.x = (v.x * c - v.z * s) * invS;
    this.localMove.z = (v.x * s + v.z * c) * invS;
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
    const T = MOVEMENT;
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

