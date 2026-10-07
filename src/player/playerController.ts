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
import { SprintGate, EasedVelocity, targetSpeed, landingKind, LANDING, type LandingKind, type Stance } from './movement';
import { GearState, StickRelease, clampGear } from './speedGears';
import { flags } from '../core/flags';
import { easeInOut, emptyMotionInput, MotionDriver } from '../anim/motion';
import { hyp2 } from '../core/mathx';

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
  /** `velocity` follows an already-eased path (cover snap glide): track it tightly. */
  glide?: boolean;
  /** `velocity` is a run (cover-to-cover): the free-movement tuning at sprint acceleration. */
  run?: boolean;
}

export interface PlayerInput {
  moveX: number;
  moveY: number;
  /** Edge: crouch button pressed this step. */
  crouchPressed: boolean;
  /** Level: crouch button held (hold mode). */
  crouchHeld: boolean;
  crouchToggle: boolean;
  /** Sprint button: edge this step, held, and toggle (press) vs hold mode. */
  sprintPressed: boolean;
  sprintHeld: boolean;
  sprintToggle: boolean;
  ads: boolean;
  /** Weapon raised or firing (tightest turn rate). */
  aiming: boolean;
  /** Reloading / swapping: moving slows (`reloadMult`). */
  reloading: boolean;
  /** Speed gear up / down pressed this step (3.2.0). */
  gearUp?: boolean;
  gearDown?: boolean;
}

/** Motion caps for cover-driven moves: snappier so the standoff controller stays stable; a jog along the wall
 *  gets up to pace quickly. Never a planted pivot in cover: reversing along the wall is a turn-and-swap (the
 *  cover controller owns the facing). */
const COVER_MOTION = { ...MOVEMENT, accelMax: 6, decelMax: 7, jerkMax: 60, velGain: 10, startShift: 0.08, rootDip: 0.01, pivotMinSpeed: 99 };
/** Cover snap glide: the path is already eased (cover controller), the driver just follows it. */
const GLIDE_MOTION = { ...MOVEMENT, accelMax: 40, decelMax: 40, jerkMax: 2000, velGain: 40, brakeGain: 40, startShift: 0, rootDip: 0.01, pivotMinSpeed: 99 };

/** Character controller acceleration cap (m/s^2) on Chaos Theory free movement: a full stop from a sprint in one
 *  60 Hz step (the usual 80 m/s^2 takes two or three). */
const CT_MAX_ACCEL = 600;
const UP = new Vector3(0, 1, 0);
const DOWN = new Vector3(0, -1, 0);

/**
 * Stealth-operative Havok character controller. Movement is camera-relative; not aiming, the body faces
 * where it goes (arcs through turns, a short planted pivot on reversals at speed) and holds its facing
 * when still, so the camera orbits freely. Aiming, the body is strafe-locked to the aim (strafe and
 * backstep penalties). Speed is analog per stance (crouched sneak / walk / run, standing walk / jog) with
 * snappy, jerk-limited acceleration; the sprint is stamina-free. There is no free jump: traversal (vault,
 * mantle, step, drop) is driven through `override.kinematic` by the traversal/cover systems.
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
  readonly sprint = new SprintGate();
  /** Chaos Theory speed gears (3.2.0): kept through stance changes, back to the spawn gear on respawn. Tests can
   *  start on another gear with `?gear=N`. */
  readonly gears = new GearState(flags.gear !== null ? clampGear(flags.gear) : undefined);
  /** Free movement uses the Chaos Theory feel (instant stop / start; `MotionInput.ct`) this step. */
  ct = false;
  /**
   * Chaos Theory stop hold: after an instant stop the body holds the stride it stopped in (`holdSpeed` = the pace it
   * stopped from, `holdCrouch` = its stance) until the next input: the stick, aiming, a stance change, an override
   * (cover, traversal, takedown) or leaving the ground. No kneel while it holds.
   */
  stopHold = false;
  holdSpeed = 0;
  private holdCrouch = false;
  /** A stick springing back reads as a release from its full deflection (free movement only). */
  private release = new StickRelease();
  /** Root motion: jerk-limited velocity, gait clock, starts/stops/stepped turns/pivots. */
  readonly motion: MotionDriver;
  /** Kept for callers: mirrors the driver's velocity; `reset` also resets the driver. */
  readonly vel = new EasedVelocity();
  /** Gait clock at the previous step and interpolated for rendering. */
  private prevPhase = 0;
  renderPhase = 0;
  /** Stance progress 0 (standing) .. 1 (crouched), advanced at the stance transition rates. */
  private crouchK = 0;
  /** Crouch toggle to restore when a sprint ends (sprinting stands you up). */
  private crouchBeforeSprint = false;
  /** Set each step by the cover/traversal systems (or null). */
  override: MoveOverride | null = null;
  /** Ignore this step's crouch press (consumed by the cover system). */
  swallowCrouch = false;
  speed = 0;
  /** Footstep noise this step: 'free' by gait, 'silent' (climbing, vaults, cover glides and moves along cover),
   *  'crouched' (a cover-to-cover run is a crouched run). */
  steps: 'free' | 'silent' | 'crouched' = 'free';
  localMove = { x: 0, z: 0 };
  /** Seconds left in a controlled pivot (kept for the debug overlay; the driver owns pivots). */
  get pivotT(): number {
    return this.motion.state === 'pivot' ? 1 : 0;
  }
  /** Landing recovery after a drop (s): slows to a creep. */
  landT = 0;
  private fallSpeed = 0;
  /** Highest feet height of the current fall (m). */
  private airTop = 0;
  /** The last landing: fall height (m), its band, and a counter that moves on every landing. */
  lastFall = 0;
  lastLanding: LandingKind = 'none';
  landings = 0;
  /** Horizontal velocity at the moment of the last landing (m/s). */
  landVX = 0;
  landVZ = 0;
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
  /** Hard speed cap (m/s) set per step by other systems (leaning: hips planted, only a shuffle). */
  speedCap = Infinity;
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

  get isRolling(): boolean {
    return false;
  }

  get rollT(): number {
    return -1;
  }

  get sprinting(): boolean {
    return this.sprint.sprinting;
  }

  /** Legacy name for `sprinting` (cover slide-in, camera, animation, net flags). */
  get dashing(): boolean {
    return this.sprint.sprinting;
  }

  /** Weapon lowered: sprinting or recovering from a landing. */
  get weaponBlocked(): boolean {
    return this.sprint.blocksWeapon || this.landT > 0.15;
  }

  /** Cover takes over crouching: forget a pending crouch toggle. */
  clearCrouchToggle(): void {
    this.crouchToggled = false;
  }

  /** End a committed move crouched (the Chaos Theory forward roll): the crouch toggle is set. */
  setCrouchToggle(): void {
    this.crouchToggled = true;
  }

  /** Current speed gear (1..6). */
  get gear(): number {
    return this.gears.gear;
  }

  /** Current capsule height (crouch-aware). */
  get capsuleHeight(): number {
    return this.height;
  }

  /** A landing from a committed fall (a drop through a vent): the same bands, noise and roll as a real one. */
  registerLanding(fall: number, vx: number, vz: number): void {
    this.lastFall = fall;
    this.lastLanding = landingKind(fall);
    this.landVX = vx;
    this.landVZ = vz;
    if (this.lastLanding === 'heavy') this.landT = Math.max(this.landT, LANDING.heavyRecovery);
    if (this.lastLanding !== 'none') this.landings++;
  }

  /** Leave the ground with a velocity (letting go of a zipline / a jump off an anchor): gravity takes over. */
  launch(vx: number, vy: number, vz: number): void {
    this.cc.setVelocity(this.tmp.set(vx, vy, vz));
    this.airTop = this.pos.y;
    this.grounded = false;
    this.vel.reset(vx, vz);
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
    this.stopHold = false;
    this.syncFeet();
    this.prevPos.copyFrom(this.pos);
    this.renderPos.copyFrom(this.pos);
    if (yaw !== undefined) this.yaw = this.prevYaw = this.renderYaw = yaw;
    // a teleport is no fall: no landing (roll / heavy) where it lands
    this.airTop = feet.y;
    this.fallSpeed = 0;
    this.teleports++;
  }

  /** Teleports so far (a committed traversal move in flight is dropped by one). */
  teleports = 0;

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
    this.prevPhase = this.motion.phase;
    this.landT = Math.max(0, this.landT - dt);
    this.steps = !ov ? 'free' : ov.run ? 'crouched' : 'silent';
    // speed gears step by one per press (kept through stances, cover and traversal)
    if (input.gearUp) this.gears.step(1);
    if (input.gearDown) this.gears.step(-1);

    // committed kinematic move (vault, mantle, corner swing): exact path, no collision
    if (ov?.kinematic) {
      this.stopHold = false;
      this.cc.setPosition(ov.kinematic.add(new Vector3(0, this.height / 2 + 0.02, 0)));
      this.cc.setVelocity(Vector3.Zero());
      this.syncFeet();
      if (ov.yaw !== undefined) this.yaw = turnTowards(this.yaw, ov.yaw, (ov.turnRate ?? T.turnMoving * 1.5) * dt);
      this.speed = Vector3.Distance(this.pos, this.prevPos) / Math.max(dt, 1e-4);
      this.vel.reset();
      this.motion.reset(this.yaw);
      this.grounded = true;
      this.endSprint();
      if (ov.crouch !== undefined) this.applyCrouch(ov.crouch);
      this.updateStance(dt);
      return;
    }

    // wish direction (camera relative)
    const fx = Math.sin(camYaw);
    const fz = Math.cos(camYaw);
    let mx = this.frozen ? 0 : input.moveX;
    let my = this.frozen ? 0 : input.moveY;
    // free movement: a stick springing back is a release from where it was, not a slow-down on the way
    if (!ov) {
      this.release.update(mx, my, dt);
      mx = this.release.x;
      my = this.release.y;
    } else this.release.reset();
    const mag = Math.min(1, hyp2(mx, my));
    if (mag < 0.05) mx = my = 0;
    this.wish.set(fz * mx + fx * my, 0, -fx * mx + fz * my);
    if (this.wish.lengthSquared() > 1) this.wish.normalize();

    // crouch (toggle by default; sprinting stands you up, crouching ends the sprint)
    const crouchPressed = input.crouchPressed && !this.swallowCrouch;
    this.swallowCrouch = false;
    if (!this.frozen && !ov && crouchPressed && this.grounded && input.crouchToggle) {
      if (this.sprint.sprinting) {
        this.endSprint();
        this.crouchToggled = true;
      } else this.crouchToggled = !this.crouchToggled;
    }

    // sprint: toggle (press) or hold; ends on aiming, cover, traversal or releasing the stick
    const aiming = input.ads || input.aiming;
    if (!ov && !this.frozen && this.grounded && !aiming) {
      if (input.sprintToggle) {
        if (input.sprintPressed) {
          if (this.sprint.sprinting) this.endSprint();
          else if (mag > 0.3) this.startSprint();
        }
      } else if (input.sprintHeld && mag > 0.3) {
        if (!this.sprint.sprinting) this.startSprint();
      } else if (this.sprint.sprinting) this.endSprint();
    }
    if (this.sprint.sprinting && (ov || aiming || !this.grounded)) this.endSprint();
    this.sprint.update(dt, mag);
    if (!this.sprint.sprinting && this.sprintWas) this.endSprint();
    this.sprintWas = this.sprint.sprinting;

    let wantCrouch = input.crouchToggle ? this.crouchToggled : input.crouchHeld;
    if (ov?.crouch !== undefined) wantCrouch = ov.crouch;
    if (this.sprint.sprinting) wantCrouch = false;
    this.applyCrouch(wantCrouch);

    // speed: analog per stance; strafe / backstep penalties only while aiming (relative to the aim)
    const bs = Math.sin(camYaw);
    const bc = Math.cos(camYaw);
    const lx = mag > 0 ? (this.wish.x * bc - this.wish.z * bs) / mag : 0;
    const lz = mag > 0 ? (this.wish.x * bs + this.wish.z * bc) / mag : 1;
    const stance: Stance = ov
      ? this.crouched
        ? 'coverCrouch'
        : 'cover'
      : this.sprint.sprinting
        ? 'sprint'
        : aiming
          ? this.crouched
            ? 'adsCrouch'
            : 'ads'
          : this.crouched
            ? 'crouch'
            : 'stand';
    // free movement: the speed gear's cap x the stick (cover moves keep their own paces)
    let speedTarget = Math.min(this.speedCap, targetSpeed(mag, stance, lx, lz, T, ov ? undefined : this.gears.gear) * this.speedMul * this.stanceMul);
    if (input.reloading) speedTarget *= T.reloadMult;
    if (this.landT > 0) speedTarget = Math.min(speedTarget, T.sneakSpeed);
    const inv = mag > 0 ? speedTarget / Math.max(mag, 1e-3) : 0;
    let tx = this.wish.x * inv + (mag > 0.1 ? this.steer.x : 0);
    let tz = this.wish.z * inv + (mag > 0.1 ? this.steer.z : 0);
    if (this.sprint.sprinting && mag > 0) {
      tx = (this.wish.x / mag) * speedTarget;
      tz = (this.wish.z / mag) * speedTarget;
    }
    if (ov?.velocity) {
      tx = ov.velocity.x;
      tz = ov.velocity.z;
    }
    // root motion: the driver owns velocity (jerk-limited, weight shift, stride modulation) and facing
    const mi = this.motionIn;
    mi.vx = tx;
    mi.vz = tz;
    mi.aiming = aiming;
    mi.sprinting = this.sprint.sprinting || !!ov?.run;
    // not aiming and free: face the travel direction (the camera orbits freely); else face the
    // override's yaw (cover) or the aim
    mi.faceTravel = !aiming && !ov?.velocity && ov?.yaw === undefined;
    mi.yaw = ov?.yaw ?? camYaw;
    // Chaos Theory feel on free movement only: cover glides / moves and cover-to-cover runs keep their tuning
    this.ct = mi.ct = !ov;
    // the character controller follows the driver's velocity within a step (Chaos Theory stops and starts land on
    // the step; the 2.x moves are jerk-limited well inside the usual cap anyway)
    this.cc.maxAcceleration = this.ct ? CT_MAX_ACCEL : 80;
    const wasMoving = this.motion.state === 'move';
    const spBefore = this.motion.speed;
    if (this.grounded) this.motion.step(dt, mi, ov?.velocity && !ov.run ? (ov.glide ? GLIDE_MOTION : COVER_MOTION) : T);
    // an instant stop (any pace, any stance) holds the stride; the next input lets it go: a stick that moves the
    // operator again, aiming, a stance change, an override or leaving the ground
    if (this.ct && this.grounded && wasMoving && this.motion.state === 'idle' && spBefore > 0.02) {
      this.stopHold = true;
      this.holdSpeed = spBefore;
      this.holdCrouch = this.crouched;
    }
    const moving = hyp2(tx, tz) > 0.05;
    if (this.stopHold && (moving || !this.ct || !this.grounded || aiming || this.crouched !== this.holdCrouch)) this.stopHold = false;
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
        // controlled landing: recovery scales with the fall; a long fall is a heavy landing (a roll is played
        // by the traversal controller from `lastLanding`)
        if (this.fallSpeed > 3) this.landT = Math.min(0.7, 0.15 + (this.fallSpeed - 3) * 0.08);
        this.lastFall = Math.max(0, this.airTop - this.pos.y);
        this.lastLanding = landingKind(this.lastFall);
        if (this.lastLanding === 'heavy') this.landT = Math.max(this.landT, LANDING.heavyRecovery);
        this.landVX = cur.x;
        this.landVZ = cur.z;
        if (this.lastLanding !== 'none') this.landings++;
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
      if (this.grounded) this.airTop = this.pos.y;
      else this.airTop = Math.max(this.airTop, this.pos.y);
      this.grounded = false;
    }
    this.cc.setVelocity(out);
    this.cc.integrate(dt, support, GRAVITY);
    this.syncFeet();

    // facing: the driver's (weapon-led, stance-limited, stepped on the spot); overrides may turn faster
    const v = this.cc.getVelocity();
    this.speed = hyp2(v.x, v.z);
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
    this.kneeling = this.stillT > 0.25 && !this.stopHold;
    this.updateStance(dt);
  }

  private sprintWas = false;

  /** Pick a sprint back up after a traversal (momentum carries through). */
  resumeSprint(): void {
    if (!this.sprint.sprinting) this.startSprint();
    this.sprintWas = true;
  }

  private startSprint(): void {
    this.crouchBeforeSprint = this.crouchToggled;
    this.crouchToggled = false;
    this.sprint.start();
  }

  /** End a sprint (if any) and restore the stance it interrupted. */
  /** Aiming cuts a sprint short: the weapon comes straight up. */
  cancelSprint(): void {
    if (this.sprint.sprinting) this.endSprint();
  }

  private endSprint(): void {
    if (this.sprint.sprinting) this.sprint.stop();
    if (this.sprintWas) this.crouchToggled = this.crouchBeforeSprint || this.crouchToggled;
    this.sprintWas = false;
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
    // gait clock between the last two steps (wrapping)
    let d = this.motion.phase - this.prevPhase;
    if (d < -0.5) d += 1;
    this.renderPhase = (this.prevPhase + d * alpha + 1) % 1;
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

