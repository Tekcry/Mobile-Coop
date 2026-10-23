import {
  CharacterSupportedState,
  PhysicsCharacterController,
  PhysicsRaycastResult,
  Vector3,
  type CharacterSurfaceInfo,
  type PhysicsEngine,
  type Scene,
} from '../core/babylon';
import { GRAVITY } from '../physics/havok';
import { G, MASK } from '../physics/groups';
import { CT, MOVEMENT, TENSE } from '../config/movement';
import { tenseNear } from './tenseSneak';
import { EasedVelocity, paceSpeed, targetSpeed, landingKind, LANDING, crouchWanted, type LandingKind, type Stance } from './movement';
import { AnalogGear, GearState, StickRelease, clampGear } from './speedGears';
import { flags } from '../core/flags';
import { easeInOut, emptyMotionInput, MotionDriver } from '../anim/motion';
import { LOCO } from '../anim/mocap';
import { hyp2 } from '../core/mathx';
import { tuneSim } from '../anim/tune';
import { cqSim } from '../anim/cqGait';
import { speedMoveMul } from './speedTune';
import { weightSim, weightSimEnd } from './weightTune';

/** Movement constants live in `config/movement.ts` (live-tunable). Kept as an alias for older code. */
export const PLAYER_TUNING = MOVEMENT;
/**
 * (F3) Crouched and still this long (s): the crouch idle kneels (CT). The remote copies use the same. (CT prototype G1,
 * audit row 3) 0.25 -> 0.05, and a crouched stop no longer waits out the stop hold: CT kneels on the stop (105624 @
 * 52.6-53.6: last crouch step at 53.2, knee on the floor at 53.5).
 */
export const KNEEL_STILL = 0.05;
/**
 * (anim-fix-pass AF4a, Michael P4 "Crouch cover strafe: ... moves around constantly") Crouched and aiming the kneel waits
 * this long (s) still: an L <-> R stick flip crosses the dead zone for ~0.1-0.3 s, and at KNEEL_STILL the strafe could drop
 * into a kneel and back on a flip. A real stop still kneels, a beat later.
 */
export const KNEEL_STILL_AIM = 0.35;
/** The stillness (s) before the crouched kneel: KNEEL_STILL_AIM aiming, else KNEEL_STILL. */
export function kneelStill(aiming: boolean): number {
  return aiming ? KNEEL_STILL_AIM : KNEEL_STILL;
}

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
  /** `velocity` is a run (cover-to-cover): the free-movement tuning at run acceleration. */
  run?: boolean;
  /** (step 11) Footstep noise while the override drives: the crouch band (back-to-wall slide, bible 5.3). */
  noise?: 'crouched';
}

export interface PlayerInput {
  moveX: number;
  moveY: number;
  /** Edge: crouch button pressed this step. */
  crouchPressed: boolean;
  /** Level: crouch button held (hold mode). */
  crouchHeld: boolean;
  crouchToggle: boolean;
  ads: boolean;
  /** Weapon raised or firing (tightest turn rate). */
  aiming: boolean;
  /** Reloading / swapping: moving slows (`reloadMult`). */
  reloading: boolean;
}

/** Motion caps for cover-driven moves: snappier so the standoff controller stays stable; a jog along the wall
 *  gets up to pace quickly. Never a planted pivot in cover: reversing along the wall is a turn-and-swap (the
 *  cover controller owns the facing). */
const COVER_MOTION = { ...MOVEMENT, accelMax: 6, decelMax: 7, jerkMax: 60, velGain: 10, startShift: 0.08, rootDip: 0.01, pivotMinSpeed: 99 };
/** Cover snap glide: the path is already eased (cover controller), the driver just follows it. */
const GLIDE_MOTION = { ...MOVEMENT, accelMax: 40, decelMax: 40, jerkMax: 2000, velGain: 40, brakeGain: 40, startShift: 0, rootDip: 0.01, pivotMinSpeed: 99 };

/** Character controller acceleration cap (m/s^2) on Chaos Theory free movement: a full stop from a run in one
 *  60 Hz step (the usual 80 m/s^2 takes two or three). */
const CT_MAX_ACCEL = 600;
const UP = new Vector3(0, 1, 0);
const DOWN = new Vector3(0, -1, 0);

/** Settling onto the floor. Havok counts a surface as support up to `keepDistance` + `keepContactTolerance` (0.14 m)
 *  under the capsule and its solver never closes that gap, so a capsule that stops 4-14 cm up (the last step of a
 *  fall, stepping off a curb) would stay there. `rest`: the capsule's resting gap on flat floor (m); `tol`: a gap
 *  this much over the rest (for the slope under it) settles; `reach`: the deepest gap settled; `rim`: the four edge
 *  rays' offset (x radius) - the capsule only comes down as far as the highest floor under it (a step's edge). */
const SETTLE = { rest: 0.02, tol: 0.025, reach: 0.2, rim: 0.7 } as const;
const RIM_SAG = MOVEMENT.radius - Math.sqrt(MOVEMENT.radius * MOVEMENT.radius * (1 - SETTLE.rim * SETTLE.rim));
/** (S-e2e-fix) `floorNear`: the highest a floor top may be over the feet (m): a kinematic move or a teleport puts the feet
 *  0.02 over the floor it ends on, a step-up a little more; a ray that starts inside a solid reads far higher. */
const STALE_TOP = 0.1;
/** The floor rays' filter (`floorUnder`): one shared bag, no allocation per ray. */
const FLOOR_QUERY = { membership: G.PLAYER, collideWith: MASK.PLAYER_COLLIDE };

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
  /** (G1, audit row 26) Crouched with an unaware guard close by (`tenseSneak`): the tense sneak, and no kneel. */
  tense = false;
  /** (G1) Test hook (contact sheets): as if an unaware guard were close by. */
  tenseForce = false;
  private stillT = 0;
  /** The internal speed cap (anim-rework S1: no player control; 5 = none): kept through stance changes, back to the
   *  spawn cap on respawn. Tests cap it with `?gear=N` or set it here. */
  readonly gears = new GearState(flags.gear !== null ? clampGear(flags.gear) : undefined);
  /** (anim-rework S1) The stick's analogue speed (`v`, continuous) within the cap, its nearest named speed and pace band. */
  readonly analog = new AnalogGear();
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
  /** (G27) Seconds the frozen stance has held; after `CT.stopHoldTime` it lets go and eases to idle over `CT.stopEase`. */
  private holdT = 0;
  /** The frozen stance has let go and is easing to a feet-together idle (s since; -1 when not). */
  stopEaseT = -1;
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
  /** (G32) A crouch press at a run waits `CT.rollHold` s: held it is a roll (traversal starts it), released it crouches. */
  crouchPend = false;
  crouchPendT = 0;
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
  /**
   * (marlow-final S-e2e-fix) The Havok controller answers `checkSupport` from the contacts of its last `integrate`, and
   * `setPosition` does not refresh them: after a kinematic step or a teleport they are the floor the body left (the wall
   * top a hang began on), so the next free step read support in mid-air (`grounded` one step at the hang height after a
   * let-go). True from such a move until the next `integrate`; that step keeps the support only with a floor under it.
   */
  private staleSupport = false;
  /** (anim-weight) A weapon in hand (Player writes it from the weapon stance): the Weight section's `weight.drawn` group. */
  weightDrawn = false;
  /** Horizontal velocity at the moment of the last landing (m/s). */
  landVX = 0;
  landVZ = 0;
  private height: number = MOVEMENT.standHeight;
  private support: CharacterSurfaceInfo | null = null;
  private readonly settleRay = new PhysicsRaycastResult();
  private readonly settleFrom = new Vector3();
  private readonly settleTo = new Vector3();
  /** Steps that settled the capsule onto the floor (tests). */
  settles = 0;
  private wish = new Vector3();
  private motionIn = emptyMotionInput();
  private tmp = new Vector3();
  private crouchToggled = false;
  /** Disable movement (dead, cutscene, menus). */
  frozen = false;
  /** External speed multiplier: weapon handling. */
  speedMul = 1;
  /** Hard speed cap (m/s) set per step by other systems (leaning: hips planted, only a shuffle). */
  speedCap = Infinity;

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

  /** Weapon lowered: recovering from a landing. */
  get weaponBlocked(): boolean {
    return this.landT > 0.15;
  }

  /** Cover takes over crouching: forget a pending crouch toggle. */
  clearCrouchToggle(): void {
    this.crouchToggled = false;
    this.autoCrouch = false;
    // (G4) at once, not from the next step: a co-op offer later in this frame reads it
    this.crouchIntent = false;
  }

  /** End a committed move crouched (the Chaos Theory forward roll, G4 climb-up / ladder / vent ends): the crouch toggle
   *  is set. It counts as automatic (`autoCrouch`) until the player presses crouch themselves. */
  setCrouchToggle(): void {
    this.crouchToggled = true;
    this.autoCrouch = true;
    this.crouchIntent = true;
  }

  /** (G4) The crouch came from a move's end, not the player: a co-op offer reads it as standing (rope, throw), not as
   *  the chosen crouch (hang-down, leg-up), and stands up for it. Cleared by a crouch press or standing up. */
  autoCrouch = false;

  /** (G4) The crouch the player wants this step (toggle, hold or an override): false while standing up from a crouch, so a
   *  co-op offer in the frames before the body is up reads it as standing. */
  crouchIntent = false;

  /** (G4) Stand up from an automatic crouch (a co-op rope / throw offer after a crouched climb-up end). */
  standUp(): void {
    this.crouchToggled = false;
    this.autoCrouch = false;
    this.crouchIntent = false;
  }

  /** The nearest named speed (1..5) of the stick while moving (anim-rework S1), else the cap. */
  get gear(): number {
    return this.analog.moving ? this.analog.gear : this.maxGear;
  }

  /** (anim-rework S1) The wire's pace band: the slowest gear whose speed covers the stick's speed while moving, else the
   *  cap (`MoveState.g`; the host's speed check allows that gear's speed + 15%). */
  get paceBand(): number {
    return this.analog.moving ? this.analog.band : this.maxGear;
  }

  /** (anim-rework S1) The speed the stick asks for (m/s, continuous; 0 at rest), before the aim cap and the handling:
   *  the anim code can read it next to the measured `speed`. */
  wantSpeed = 0;

  /** The internal speed cap (1..5; 5 = none; tests and tools). */
  get maxGear(): number {
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
    // (3.2.0) leaving the floor upwards (a jump): the support check would hold the capsule down for its first steps
    this.takeoffT = vy > 0.5 ? 0.15 : 0;
    this.cc.setVelocity(this.tmp.set(vx, vy, vz));
    this.airTop = this.pos.y;
    this.grounded = false;
    this.vel.reset(vx, vz);
  }

  /** Wish direction (world XZ, length = stick magnitude) of the last step. */
  get wishDir(): Vector3 {
    return this.wish;
  }

  private readonly shiftTmp = new Vector3();

  /**
   * (tuner-ui) Move the body by (dx, dz) with no teleport: the velocity, the gait clock and the stance carry on (the Anim
   * Studio's treadmill holds a state on the spot this way; studio only). No allocation.
   */
  shift(dx: number, dz: number): void {
    const c = this.cc.getPosition();
    this.shiftTmp.set(c.x + dx, c.y, c.z + dz);
    this.cc.setPosition(this.shiftTmp);
    this.pos.x += dx;
    this.pos.z += dz;
    this.prevPos.x += dx;
    this.prevPos.z += dz;
    this.renderPos.x += dx;
    this.renderPos.z += dz;
  }

  teleport(feet: Vector3, yaw?: number): void {
    this.cc.setPosition(feet.add(new Vector3(0, this.height / 2 + 0.02, 0)));
    this.cc.setVelocity(Vector3.Zero());
    this.staleSupport = true;
    this.vel.reset();
    this.motion.reset(yaw ?? this.yaw);
    // a fresh stance: the gait clock restarts with the feet (the player resets the foot planner on a teleport)
    this.motion.phase = 0;
    this.stopHold = false;
    this.stopEaseT = -1;
    this.crouchPend = false;
    this.syncFeet();
    this.prevPos.copyFrom(this.pos);
    this.renderPos.copyFrom(this.pos);
    if (yaw !== undefined) this.yaw = this.prevYaw = this.renderYaw = yaw;
    // a teleport is no fall: no landing (roll / heavy) where it lands
    this.airTop = feet.y;
    this.fallSpeed = 0;
    this.teleports++;
  }

  /** (3.2.0) Seconds left in a jump's take-off (`launch` upwards). */
  private takeoffT = 0;

  /** Teleports so far (a committed traversal move in flight is dropped by one). */
  teleports = 0;

  private setHeight(h: number): void {
    if (h === this.height) return;
    this.cc.setShapeOptions({ capsuleHeight: h, capsuleRadius: MOVEMENT.radius }, true);
    this.height = h;
    this.applyFilters();
  }

  /** How far the capsule hangs over the floor beyond its rest gap (0 when it rests, when the floor under its centre
   *  is out of reach or too steep). Four rays round the rim cap it: resting on a step's edge, it never sinks in. */
  private settleGap(): number {
    const eng = this.scene.getPhysicsEngine() as PhysicsEngine | null;
    if (!eng) return 0;
    const c = this.cc.getPosition();
    const feet = c.y - this.height / 2;
    const hit = this.floorUnder(eng, c.x, c.y, c.z, feet);
    if (hit === null) return 0;
    const ny = this.settleRay.hitNormalWorld.y;
    if (ny < this.cc.maxSlopeCosine) return 0;
    // the sphere's lowest point stands off a slope by r (1 / cos - 1) over the point under its centre
    let gap = feet - hit - SETTLE.rest - MOVEMENT.radius * (1 / ny - 1);
    if (gap <= SETTLE.tol) return 0;
    const d = MOVEMENT.radius * SETTLE.rim;
    for (let k = 0; k < 4; k++) {
      const ox = k === 0 ? d : k === 1 ? -d : 0;
      const oz = k === 2 ? d : k === 3 ? -d : 0;
      const h = this.floorUnder(eng, c.x + ox, c.y, c.z + oz, feet);
      // the sphere's surface over a rim ray is `RIM_SAG` higher than its lowest point
      if (h !== null) gap = Math.min(gap, feet + RIM_SAG - h - SETTLE.rest);
    }
    return gap > SETTLE.tol ? gap : 0;
  }

  /**
   * (S-e2e-fix) A floor under the body now: the centre ray or one of the four rim rays (as `settleGap`) finds a top within
   * `SETTLE.reach` under the feet and no higher than `STALE_TOP` over them (a ray that starts inside a wall reads its own
   * start). No physics engine: true (the controller's own answer stands). Allocation-free; runs once after a kinematic
   * move or a teleport.
   */
  private floorNear(): boolean {
    const eng = this.scene.getPhysicsEngine() as PhysicsEngine | null;
    if (!eng) return true;
    const c = this.cc.getPosition();
    const feet = c.y - this.height / 2;
    const d = MOVEMENT.radius * SETTLE.rim;
    for (let k = 0; k < 5; k++) {
      const ox = k === 1 ? d : k === 2 ? -d : 0;
      const oz = k === 3 ? d : k === 4 ? -d : 0;
      const h = this.floorUnder(eng, c.x + ox, c.y, c.z + oz, feet);
      if (h !== null && h <= feet + STALE_TOP) return true;
    }
    return false;
  }

  /** Height of the floor under (x, z) within `SETTLE.reach` of the feet, else null. */
  private floorUnder(eng: PhysicsEngine, x: number, y: number, z: number, feet: number): number | null {
    this.settleFrom.set(x, y, z);
    this.settleTo.set(x, feet - SETTLE.reach, z);
    eng.raycastToRef(this.settleFrom, this.settleTo, this.settleRay, FLOOR_QUERY);
    return this.settleRay.hasHit ? this.settleRay.hitPointWorld.y : null;
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
    this.steps = !ov ? 'free' : ov.run || ov.noise === 'crouched' ? 'crouched' : 'silent';

    // committed kinematic move (vault, mantle, corner swing): exact path, no collision
    if (ov?.kinematic) {
      // (anim-rework S1) the stick's speed still reads while a committed move drives (a fence climb's rattle, the wire)
      this.analog.update(this.maxGear, this.crouched, this.frozen ? 0 : Math.min(1, hyp2(input.moveX, input.moveY)));
      this.wantSpeed = this.analog.v;
      this.stopHold = false;
      this.stopEaseT = -1;
      this.crouchPend = false;
      this.cc.setPosition(ov.kinematic.add(new Vector3(0, this.height / 2 + 0.02, 0)));
      this.cc.setVelocity(Vector3.Zero());
      this.staleSupport = true;
      this.syncFeet();
      if (ov.yaw !== undefined) this.yaw = turnTowards(this.yaw, ov.yaw, (ov.turnRate ?? T.turnMoving * 1.5) * dt);
      this.speed = Vector3.Distance(this.pos, this.prevPos) / Math.max(dt, 1e-4);
      this.vel.reset();
      this.motion.reset(this.yaw);
      this.grounded = true;
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

    // crouch (toggle by default). (G32) At a run the press waits `CT.rollHold` s: held it rolls (the traversal system
    // starts it), a tap just crouches.
    const crouchPressed = input.crouchPressed && !this.swallowCrouch;
    this.swallowCrouch = false;
    const aiming = input.ads || input.aiming;
    if (crouchPressed) this.autoCrouch = false;
    if (!this.frozen && !ov && crouchPressed && this.grounded) {
      if (this.rollReady(mag, aiming)) {
        this.crouchPend = true;
        this.crouchPendT = 0;
      } else if (input.crouchToggle) this.crouchToggled = !this.crouchToggled;
    }
    if (this.crouchPend) {
      this.crouchPendT += dt;
      const released = !input.crouchHeld;
      if (released || ov || this.frozen || !this.grounded || aiming || this.crouchPendT > CT.rollHold + 0.15) {
        // a tap (or a hold that cannot roll any more): the plain crouch
        this.crouchPend = false;
        if (input.crouchToggle && !this.frozen && !ov && this.grounded && (released || this.crouchPendT > CT.rollHold)) this.crouchToggled = !this.crouchToggled;
      }
    }

    let wantCrouch = crouchWanted(input.crouchToggle, this.crouchToggled, input.crouchHeld);
    if (ov?.crouch !== undefined) wantCrouch = ov.crouch;
    if (this.crouchPend) wantCrouch = false;
    this.crouchIntent = wantCrouch;
    this.applyCrouch(wantCrouch);

    // speed: analog per stance; strafe / backstep penalties only while aiming (relative to the aim)
    const bs = Math.sin(camYaw);
    const bc = Math.cos(camYaw);
    const lx = mag > 0 ? (this.wish.x * bc - this.wish.z * bs) / mag : 0;
    const lz = mag > 0 ? (this.wish.x * bs + this.wish.z * bc) / mag : 1;
    const stance: Stance = aiming ? (this.crouched ? 'adsCrouch' : 'ads') : this.crouched ? 'crouch' : 'stand';
    // (anim-rework S1) free movement: the stick's deflection sets the speed continuously (`AnalogGear.v`, the
    // STICK_SPEED curve; the keyboard's walk / run / creep magnitudes land on its points); overrides set their own velocity
    const snapped = this.analog.update(this.maxGear, this.crouched, mag);
    this.wantSpeed = this.analog.v;
    let speedTarget = Math.min(this.speedCap, (ov ? targetSpeed(mag, stance, lx, lz, T) : paceSpeed(this.analog.v, stance, lx, lz, T) * speedMoveMul(this.analog.v, stance, lx, lz)) * this.speedMul);
    if (input.reloading) speedTarget *= T.reloadMult;
    if (this.landT > 0) speedTarget = Math.min(speedTarget, T.sneakSpeed);
    const inv = mag > 0 ? speedTarget / Math.max(mag, 1e-3) : 0;
    let tx = this.wish.x * inv;
    let tz = this.wish.z * inv;
    if (ov?.velocity) {
      tx = ov.velocity.x;
      tz = ov.velocity.z;
    }
    // root motion: the driver owns velocity (jerk-limited, weight shift, stride modulation) and facing
    const mi = this.motionIn;
    mi.vx = tx;
    mi.vz = tz;
    mi.aiming = aiming;
    // (mocap-trial-2, strafe) the player is a carrier: the mocap strafe's side-step on its gait clock with the switch on
    mi.mocapSide = LOCO.mocap && LOCO.set.strafeL !== null && LOCO.set.strafeR !== null;
    mi.sprinting = !!ov?.run;
    mi.slowest = snapped === 1;
    // (G1, audit row 26) the tense sneak near an unaware guard: long deliberate steps on the gait clock
    this.tense = this.crouched && this.grounded && !ov && (this.tenseForce || tenseNear(this.pos.x, this.pos.z));
    mi.tense = this.tense && this.motion.speed <= TENSE.maxSpeed;
    // (G8, A4) the stance for the standing walk's shorter steps (the same eased blend the rig poses)
    mi.crouch = this.crouchBlend;
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
    tuneSim(true); // (anim-tuner) the step-length slider on the local player's gait clock (identity by default)
    cqSim(); // (anim-n4) holding / carrying: the walk's step length (a slower carry cadence)
    weightSim(this.crouched, this.weightDrawn, Math.max(this.analog.v, this.motion.speed)); // (anim-weight) momentum (identity by default)
    try {
      if (this.grounded) this.motion.step(dt, mi, ov?.velocity && !ov.run ? (ov.glide ? GLIDE_MOTION : COVER_MOTION) : T);
    } finally {
      tuneSim(false);
      weightSimEnd();
    }
    // (G26, G27) a stop at any pace freezes the feet in the stride they stopped in; the frozen stance holds
    // `CT.stopHoldTime` s, then lets go and eases to a feet-together idle over `CT.stopEase`. The next input lets it
    // go at once: a stick that moves the operator again, aiming, a stance change, an override or leaving the ground
    if (this.ct && this.grounded && wasMoving && this.motion.state !== 'move' && spBefore > 0.02) {
      this.stopHold = true;
      this.holdSpeed = spBefore;
      this.holdCrouch = this.crouched;
      this.holdT = 0;
      this.stopEaseT = -1;
    }
    const moving = hyp2(tx, tz) > 0.05;
    if (this.stopHold && (moving || !this.ct || !this.grounded || aiming || this.crouched !== this.holdCrouch)) this.stopHold = false;
    if (this.stopHold) {
      this.holdT += dt;
      if (this.holdT >= CT.stopHoldTime) {
        this.stopHold = false;
        this.stopEaseT = 0;
      }
    } else if (this.stopEaseT >= 0) {
      this.stopEaseT += dt;
      if (this.stopEaseT >= CT.stopEase || moving || !this.ct || !this.grounded || aiming) this.stopEaseT = -1;
    }
    this.vel.x = this.motion.vx;
    this.vel.z = this.motion.vz;
    const desired = this.tmp.set(this.motion.outX, 0, this.motion.outZ);

    if (this.grounded && mag > 0.1) this.stepAssist(dt);

    // Havok character controller step
    const support = (this.support = this.cc.checkSupport(dt, DOWN));
    // (S-e2e-fix) the first free step after a kinematic move or a teleport: the support is the old contacts' unless a floor
    // is under the body now (`staleSupport`)
    if (this.staleSupport && support.supportedState === CharacterSupportedState.SUPPORTED && !this.floorNear()) support.supportedState = CharacterSupportedState.UNSUPPORTED;
    const cur = this.cc.getVelocity();
    // (a jump's first steps never count as supported while it still rises)
    this.takeoffT = Math.max(0, this.takeoffT - dt);
    const grounded = support.supportedState === CharacterSupportedState.SUPPORTED && !(this.takeoffT > 0 && cur.y > 0.2);
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
      // a capsule held up within the support range (after a fall, off a curb) comes down onto the floor
      const gap = this.settleGap();
      if (gap > 0) {
        const c = this.cc.getPosition();
        this.settleFrom.set(c.x, c.y - gap, c.z);
        this.cc.setPosition(this.settleFrom);
        this.settles++;
      }
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
    // (the integrate queried the contacts where the body is: the support is fresh again)
    this.staleSupport = false;
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
    // (step 22, M14) a Chaos Theory stop counts from rest, not from the eased stop's last 0.4 m/s
    this.stillT = this.crouched && mag < 0.1 && (this.ct ? this.motion.state === 'idle' : this.speed < 0.4) ? this.stillT + dt : 0;
    // (G1, audit row 3) crouched, the stop goes straight to the kneel (the stop hold lets go for it); not beside an
    // unaware guard (the tense sneak holds its pose there)
    this.kneeling = this.stillT > kneelStill(aiming) && (!this.stopHold || this.crouched) && this.stopEaseT < 0 && !this.tense;
    if (this.kneeling && this.stopHold) {
      this.stopHold = false;
      this.holdSpeed = 0;
    }
    this.updateStance(dt);
  }

  /**
   * (G32) A crouch press now would be the start of a roll: standing, free, at the top speed with the stick pushed.
   * (The press then waits `CT.rollHold` s: held it rolls, released it crouches.)
   */
  private rollReady(mag: number, aiming: boolean): boolean {
    if (this.crouched || this.override || !this.grounded || aiming || mag < 0.3) return false;
    return this.analog.moving && this.analog.gear >= CT.rollGear && this.motion.speed >= CT.rollMinSpeed;
  }

  /** The held crouch is ready to roll (the traversal system starts it, then calls `takeRollHold`). */
  get rollHeld(): boolean {
    return this.crouchPend && this.crouchPendT >= CT.rollHold;
  }

  /** The roll has started: the pending crouch is spent. */
  takeRollHold(): void {
    this.crouchPend = false;
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
  private readonly stepDir = new Vector3();
  private readonly stepA = new Vector3();
  private readonly stepB = new Vector3();
  private readonly stepRay = new PhysicsRaycastResult();
  private readonly stepQuery = { membership: G.PLAYER, collideWith: G.STATIC };
  private static readonly STEP_REACH_ADD = [0.1, 0.22] as const;
  /**
   * Havok's built-in step-up needs the per-step sweep to clear the capsule radius, which
   * walking speed never does. Probe ahead with rays and lift onto steps <= maxStep.
   * Allocation-free (preallocated vectors and ray result; was a per-step allocator on a hot path).
   */
  private stepAssist(dt: number): void {
    this.stepCd = Math.max(0, this.stepCd - dt);
    if (this.stepCd > 0) return;
    const eng = this.scene.getPhysicsEngine() as PhysicsEngine | null;
    if (!eng) return;
    const T = MOVEMENT;
    const dir = this.stepDir.copyFrom(this.wish);
    dir.y = 0;
    if (dir.lengthSquared() < 1e-4) return;
    dir.normalize();
    const q = this.stepQuery;
    const a = this.stepA;
    const b = this.stepB;
    const r = this.stepRay;
    const px = this.pos.x;
    const py = this.pos.y;
    const pz = this.pos.z;
    for (let n = 0; n < 2; n++) {
      const reach = T.radius + PlayerController.STEP_REACH_ADD[n]!;
      a.set(px + dir.x * reach, py + T.maxStep + 0.05, pz + dir.z * reach);
      b.set(a.x, a.y - (T.maxStep + 0.1), a.z);
      r.reset();
      eng.raycastToRef(a, b, r, q);
      if (!r.hasHit) continue;
      const h = r.hitPointWorld.y - py;
      // flat step tops only; slopes are handled by the controller itself
      if (h < 0.08 || h > T.maxStep || r.hitNormalWorld.y < 0.97) continue;
      // space above the step must be free for the whole body
      a.set(px, py + h + 0.15, pz);
      b.set(px + dir.x * (reach + 0.1), a.y, pz + dir.z * (reach + 0.1));
      r.reset();
      eng.raycastToRef(a, b, r, q);
      if (r.hasHit) continue;
      b.set(a.x, a.y + this.height, a.z);
      r.reset();
      eng.raycastToRef(a, b, r, q);
      if (r.hasHit) continue;
      const cp = this.cc.getPosition();
      cp.x += dir.x * 0.04;
      cp.y += h + 0.03;
      cp.z += dir.z * 0.04;
      this.cc.setPosition(cp);
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

