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
import { DashGate, EasedVelocity, targetSpeed, type Stance } from './movement';
import { easeInOut, emptyMotionInput, MotionDriver } from '../anim/motion';

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
  /** Turn rate (rad/s) towards `yaw` (default: the moving turn rate). */
  turnRate?: number;
}

export interface PlayerInput {
  moveX: number;
  moveY: number;
  /** Edge: crouch button pressed this step. */
  crouchPressed: boolean;
  /** Level: crouch button held (hold mode). */
  crouchHeld: boolean;
  crouchToggle: boolean;
  /** Edge: dash pressed this step. */
  dashPressed: boolean;
  ads: boolean;
  /** Weapon raised or firing (tightest turn rate). */
  aiming: boolean;
  /** Reloading: moving drops to creep speed. */
  reloading: boolean;
}

/** Motion caps for cover-driven moves: snappier so the standoff controller stays stable. */
const COVER_MOTION = { ...MOVEMENT, accelMax: 3, decelMax: 4, jerkMax: 30, velGain: 10, startShift: 0.12, rootDip: 0.02 };

const UP = new Vector3(0, 1, 0);
const DOWN = new Vector3(0, -1, 0);

/**
 * Tactical (SWAT-style) Havok character controller. The body faces the aim (weapon-led: legs sidestep
 * and backstep, feet never cross), turning at a stance-limited rate; large reversals at speed become a
 * controlled pivot. Speed is analog (creep, walk, brisk) with strafe/backstep penalties and eased
 * acceleration. The only fast movement is the committed bounding dash. There is no free jump: traversal
 * (vault, mantle, step, drop) is driven through `override.kinematic` by the traversal/cover systems.
 */
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
  /** Crouched and stopped for a moment: one-knee kneel (steadier aim). */
  kneeling = false;
  private stillT = 0;
  readonly dash = new DashGate();
  /** Root motion: jerk-limited velocity, gait clock, starts/stops/stepped turns/pivots. */
  readonly motion: MotionDriver;
  /** Kept for callers: mirrors the driver's velocity; `reset` also resets the driver. */
  readonly vel = new EasedVelocity();
  /** Stance progress 0 (standing) .. 1 (crouched), advanced at the stance transition rates. */
  private crouchK = 0;
  private dashDir = new Vector3(0, 0, 1);
  /** True during the dash wind-up and rush (kept as `sprinting` for animation/net flags). */
  sprinting = false;
  /** Set each step by the cover/traversal systems (or null). */
  override: MoveOverride | null = null;
  /** Ignore this step's crouch press (consumed by the cover system). */
  swallowCrouch = false;
  speed = 0;
  localMove = { x: 0, z: 0 };
  /** Seconds left in a controlled pivot (kept for the debug overlay; the driver owns pivots). */
  get pivotT(): number {
    return this.motion.state === 'pivot' ? 1 : 0;
  }
  /** Seconds the stick has been at full deflection (eases into the brisk move). */
  private fullT = 0;
  /** Landing recovery after a drop (s): slows to a creep. */
  landT = 0;
  private fallSpeed = 0;
  private height: number = MOVEMENT.standHeight;
  private support: CharacterSurfaceInfo | null = null;
  private wish = new Vector3();
  private motionIn = emptyMotionInput();
  private tmp = new Vector3();
  private crouchToggled = false;
  /** Disable movement (dead, cutscene, menus). */
  frozen = false;
  /** External speed multipliers: weapon handling, and stance (leaning: hips planted). */
  speedMul = 1;
  stanceMul = 1;
  /** Gentle world-space velocity bias (m/s) added to free movement (slicing-the-pie standoff). */
  readonly steer = { x: 0, z: 0 };

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
    this.motion = new MotionDriver(yaw);
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

  /** The dash replaced the old roll: kept for callers that ask (always false). */
  get isRolling(): boolean {
    return false;
  }

  get rollT(): number {
    return -1;
  }

  get dashing(): boolean {
    return this.dash.dashing;
  }

  /** Weapon lowered/compressed: dashing (wind-up to recovery) or recovering from a landing. */
  get weaponBlocked(): boolean {
    return this.dash.blocksWeapon || this.landT > 0.15;
  }

  /** Cover takes over crouching: forget a pending crouch toggle. */
  clearCrouchToggle(): void {
    this.crouchToggled = false;
  }

  /** Current capsule height (crouch-aware). */
  get capsuleHeight(): number {
    return this.height;
  }

  /** Wish direction (world XZ, length = stick magnitude) of the last step. */
  get wishDir(): Vector3 {
    return this.wish;
  }

  teleport(feet: Vector3, yaw?: number): void {
    this.cc.setPosition(feet.add(new Vector3(0, this.height / 2 + 0.02, 0)));
    this.cc.setVelocity(Vector3.Zero());
    this.vel.reset();
    this.motion.reset(yaw ?? this.yaw);
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
    this.landT = Math.max(0, this.landT - dt);

    // committed kinematic move (vault, mantle, corner swing): exact path, no collision
    if (ov?.kinematic) {
      this.cc.setPosition(ov.kinematic.add(new Vector3(0, this.height / 2 + 0.02, 0)));
      this.cc.setVelocity(Vector3.Zero());
      this.syncFeet();
      if (ov.yaw !== undefined) this.yaw = turnTowards(this.yaw, ov.yaw, T.turnMoving * 1.5 * dt);
      this.speed = Vector3.Distance(this.pos, this.prevPos) / Math.max(dt, 1e-4);
      this.vel.reset();
      this.motion.reset(this.yaw);
      this.grounded = true;
      this.dash.update(dt);
      this.sprinting = false;
      if (ov.crouch !== undefined) this.applyCrouch(ov.crouch);
      this.updateStance(dt);
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

    // crouch (no roll: crouch always toggles/holds)
    const crouchPressed = input.crouchPressed && !this.swallowCrouch;
    this.swallowCrouch = false;
    if (!this.frozen && !ov && crouchPressed && this.grounded && input.crouchToggle) this.crouchToggled = !this.crouchToggled;
    let wantCrouch = input.crouchToggle ? this.crouchToggled : input.crouchHeld;
    if (ov?.crouch !== undefined) wantCrouch = ov.crouch;
    if (this.dash.dashing) wantCrouch = false;
    this.applyCrouch(wantCrouch);

    // bounding dash: press to start; ends at max time, when the stick is released, or on stamina out
    if (!ov && !this.frozen && input.dashPressed && this.grounded && mag > 0.3 && this.dash.start()) {
      this.dashDir.copyFrom(this.wish).normalize();
      this.crouchToggled = false;
    }
    if (this.dash.dashing && mag < 0.2 && this.dash.state === 'rush') this.dash.stop();
    this.dash.update(dt);
    this.sprinting = this.dash.dashing;
    if (this.dash.dashing && mag > 0.3) {
      // limited steering while committed
      const want = Math.atan2(this.wish.x, this.wish.z);
      const cur = Math.atan2(this.dashDir.x, this.dashDir.z);
      const a = turnTowards(cur, want, T.turnDash * dt);
      this.dashDir.set(Math.sin(a), 0, Math.cos(a));
    }

    // speed: analog creep/walk/brisk with direction penalties relative to the body (which faces the aim)
    this.fullT = mag > 0.95 && !input.ads && !input.aiming ? this.fullT + dt : 0;
    const briskK = Math.max(0, Math.min(1, (this.fullT - T.briskDelay) / 0.6));
    const bs = Math.sin(this.yaw);
    const bc = Math.cos(this.yaw);
    const lx = mag > 0 ? (this.wish.x * bc - this.wish.z * bs) / mag : 0;
    const lz = mag > 0 ? (this.wish.x * bs + this.wish.z * bc) / mag : 1;
    const stance: Stance = ov ? 'cover' : input.reloading ? 'reload' : this.crouched ? 'crouch' : input.ads || input.aiming ? 'ads' : 'stand';
    let speedTarget = targetSpeed(mag, stance, lx, lz, briskK) * this.speedMul * this.stanceMul;
    if (this.landT > 0) speedTarget = Math.min(speedTarget, T.creepSpeed);
    const inv = mag > 0 ? speedTarget / Math.max(mag, 1e-3) : 0;
    let tx = this.wish.x * inv + (mag > 0.1 ? this.steer.x : 0);
    let tz = this.wish.z * inv + (mag > 0.1 ? this.steer.z : 0);
    if (this.dash.dashing) {
      const ds = this.dash.state === 'rush' ? T.dashSpeed : Math.max(T.walkSpeed, this.motion.speed);
      tx = this.dashDir.x * ds;
      tz = this.dashDir.z * ds;
    }
    if (ov?.velocity) {
      tx = ov.velocity.x;
      tz = ov.velocity.z;
    }
    // root motion: the driver owns velocity (jerk-limited, weight shift, stride modulation) and facing
    const mi = this.motionIn;
    mi.vx = tx;
    mi.vz = tz;
    mi.aiming = input.ads || input.aiming;
    mi.dashing = this.dash.dashing;
    mi.yaw = this.dash.dashing ? Math.atan2(this.dashDir.x, this.dashDir.z) : ov?.yaw ?? camYaw;
    if (this.grounded) this.motion.step(dt, mi, ov?.velocity ? COVER_MOTION : T);
    this.vel.x = this.motion.vx;
    this.vel.z = this.motion.vz;
    const desired = this.tmp.set(this.motion.outX, 0, this.motion.outZ);

    if (this.grounded && mag > 0.1) this.stepAssist(dt);

    // Havok character controller step
    const support = (this.support = this.cc.checkSupport(dt, DOWN));
    const cur = this.cc.getVelocity();
    const grounded = support.supportedState === CharacterSupportedState.SUPPORTED;
    let out: Vector3;
    if (grounded) {
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
      if (!this.grounded) {
        // controlled landing: recovery scales with the fall
        if (this.fallSpeed > 3) this.landT = Math.min(0.7, 0.15 + (this.fallSpeed - 3) * 0.08);
        this.vel.reset(cur.x * 0.3, cur.z * 0.3);
        this.fallSpeed = 0;
      }
      this.grounded = true;
    } else {
      // dropping off a ledge: committed arc, minimal control
      const k = Math.min(1, T.airControl * dt * 10);
      out = new Vector3(cur.x + (tx - cur.x) * k, cur.y, cur.z + (tz - cur.z) * k).addInPlace(GRAVITY.scale(dt));
      this.vel.reset(out.x, out.z);
      this.fallSpeed = Math.max(this.fallSpeed, -out.y);
      this.grounded = false;
    }
    this.cc.setVelocity(out);
    this.cc.integrate(dt, support, GRAVITY);
    this.syncFeet();

    // facing: the driver's (weapon-led, stance-limited, stepped on the spot); overrides may turn faster
    const v = this.cc.getVelocity();
    this.speed = Math.hypot(v.x, v.z);
    if (ov?.yaw !== undefined && ov.turnRate !== undefined) {
      this.yaw = turnTowards(this.yaw, ov.yaw, ov.turnRate * dt);
      this.motion.yaw = this.yaw;
    } else this.yaw = this.motion.yaw;
    // local move for animation
    const s = Math.sin(this.yaw);
    const c = Math.cos(this.yaw);
    const invS = this.speed > 0.01 ? 1 / this.speed : 0;
    this.localMove.x = (v.x * c - v.z * s) * invS;
    this.localMove.z = (v.x * s + v.z * c) * invS;
    // kneel: crouched and still for a moment
    // (stick idle and barely moving: small standoff corrections in cover do not count as moving)
    this.stillT = this.crouched && mag < 0.1 && this.speed < 0.4 ? this.stillT + dt : 0;
    this.kneeling = this.stillT > 0.25;
    this.updateStance(dt);
  }

  /** Eased stance transition: crouching takes `crouchTime`, standing up `standTime`. */
  private updateStance(dt: number): void {
    const T = MOVEMENT;
    const target = this.crouched ? 1 : 0;
    const rate = target > this.crouchK ? 1 / T.crouchTime : 1 / T.standTime;
    this.crouchK = target > this.crouchK ? Math.min(target, this.crouchK + rate * dt) : Math.max(target, this.crouchK - rate * dt);
    this.crouchBlend = easeInOut(this.crouchK);
  }

  private applyCrouch(want: boolean): void {
    if (want && !this.crouched) {
      this.setHeight(MOVEMENT.crouchHeight);
      this.crouched = true;
    } else if (!want && this.crouched && this.hasHeadroom()) {
      this.setHeight(MOVEMENT.standHeight);
      this.crouched = false;
    }
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

