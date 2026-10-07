import { PhysicsRaycastResult, Vector3, type PhysicsEngine } from '../core/babylon';
import type { SwapReach } from '../anim/clips/actions';
import { clampAim, type AimLimit, type AimState } from '../cover/coverAim';
import type { InputState } from '../input/inputState';
import type { Settings } from '../core/settings';
import type { World } from '../world/world';
import type { AvatarLook } from '../cosmetics/avatarLook';
import { CharacterRig, type RigPose } from './characterRig';
import { PlayerController, type PlayerInput } from './playerController';
import { ShoulderCamera } from './shoulderCamera';
import { avatarFactory } from '../cosmetics/avatarFactory';
import { WeaponCarry, emptyCarryInput } from '../weapons/weaponCarry';
import { wrapPi } from '../anim/motion';
import { hyp2 } from '../core/mathx';
import { MOVEMENT } from '../config/movement';
import { G } from '../physics/groups';
import type { TraverseKind } from '../anim/animGraph';

/** Pose inputs other systems (cover, corners, traversal) drive on the player's rig. */
export interface PlayerPose {
  cover: 'none' | 'low' | 'high';
  /** Cover surface side in the character's frame (-1 left, 1 right). */
  wallSide: number;
  /** Lean around an edge (-1 left .. 1 right), hips planted. */
  lean: number;
  /** Low cover: rise over the top 0..1. */
  peekOver: number;
  /** Low cover top above the feet (m; 0 = not at low cover). */
  top: number;
  blind: boolean;
  edgeLook: number;
  traverse: TraverseKind;
  traverseT: number;
  /** Dash-in slide 0..1, or < 0. */
  slide: number;
  /** Turn-and-swap or corner swing in cover 0..1, or < 0. */
  turn: number;
  /** Edge peek: the line of fire from where the body is clears the cover (else the gun stays tucked). */
  gunClear: boolean;
  /** Doorway check 0..1, or < 0. */
  check: number;
  /** Takedown strike progress 0..1, or < 0. */
  melee: number;
}

const Q = { membership: G.PLAYER, collideWith: G.STATIC };

/**
 * The local player: input -> controller (fixed step) -> camera + rig (per frame). Owns the weapon carry
 * state (ready positions, raise-to-fire) and the context probes that pick a ready position (walls in
 * front, tight corridors). Look input is rate-capped so the view never out-turns the body.
 */
export class Player {
  readonly controller: PlayerController;
  readonly rig: CharacterRig;
  readonly cam: ShoulderCamera;
  readonly carry = new WeaponCarry();
  readonly carryIn = emptyCarryInput();
  private adsToggled = false;
  ads = false;
  /** Aim regardless of input (Mark & Execute raises the weapon for its shots). */
  forceAds = false;
  /** Set by weapons when firing (kept for callers; the carry's raise now drives the pose). */
  aimLockTimer = 0;
  kick = 0;
  alive = true;
  /** Reload progress 0..1 (or -1), set by PlayerWeapons for the animation layer. */
  reload = -1;
  /** Reload is the empty one; weapon swap and grenade throw progress 0..1 or -1 (set by PlayerWeapons). */
  reloadEmpty = false;
  swapT = -1;
  /** Cover sets the angles a peek / blind fire may aim at (null = free). */
  aimLimit: AimLimit | null = null;
  /** The aim against the current cover limit (`inside` = within it, read by the cover controller). */
  readonly aimState: AimState = { yaw: 0, pitch: 0, inside: false };
  /** The weapon is not out past the cover yet (peek / rise / blind raise still moving): no shots. */
  coverFireBlocked = false;
  /** Where the hand holsters the outgoing gun and draws the next (carry slot kinds). */
  swapFrom: SwapReach = 'backC';
  swapTo: SwapReach = 'backC';
  grenadeT = -1;
  private rigPose: RigPose = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, lookYaw: 0, lookPitch: 0 };
  /** Seconds since the last shot and weapon mass factor (set by PlayerWeapons). */
  sinceShot = 99;
  weaponWeight = 1;
  /** Pose driven by cover / corners / traversal. */
  readonly coverPose: PlayerPose = { cover: 'none', wallSide: 0, lean: 0, peekOver: 0, top: 0, blind: false, edgeLook: 0, traverse: 'none', traverseT: 0, slide: -1, turn: -1, gunClear: true, check: -1, melee: -1 };
  /** Context flags for the ready position (set by the corner/cover systems each step). */
  context = { doorway: false, coverEdge: false };
  /** Called when landing from a fall (speed in m/s). */
  onLand: ((speed: number) => void) | null = null;
  private wasGrounded = true;
  private fallSpeed = 0;
  private probeT = 0;
  private rr = new PhysicsRaycastResult();
  private a = new Vector3();
  private b = new Vector3();

  constructor(
    readonly world: World,
    look: AvatarLook,
    spawn: { pos: Vector3; yaw: number },
    private getSettings: () => Settings,
  ) {
    this.controller = new PlayerController(world.scene, spawn.pos, spawn.yaw);
    this.rig = new CharacterRig(world.scene, avatarFactory(world.parts, look, 'player-part'), look, 1.75, 'player');
    for (const m of this.rig.parts) world.addShadowCaster(m);
    this.cam = new ShoulderCamera(world.scene);
    this.cam.yaw = spawn.yaw;
    const s = getSettings();
    this.cam.shoulder = s.gameplay.defaultShoulder === 'left' ? -1 : 1;
    this.cam.baseFovDeg = s.video.fovH;
    this.cam.maxFovDeg = s.video.maxFov;
    const eng = world.scene.getPhysicsEngine() as PhysicsEngine;
    this.rig.groundProbe = (x, z, yFrom) => {
      this.rr.reset();
      eng.raycastToRef(this.a.set(x, yFrom, z), this.b.set(x, yFrom - 1.2, z), this.rr, Q);
      return this.rr.hasHit ? this.rr.hitPoint.y : null;
    };
  }

  get position(): Vector3 {
    return this.controller.pos;
  }

  /** Weapon raised enough to be "aiming" (tightest turn and look rates). */
  get aiming(): boolean {
    return this.carry.raise > 0.5;
  }

  private ray(from: Vector3, to: Vector3): boolean {
    this.rr.reset();
    (this.world.scene.getPhysicsEngine() as PhysicsEngine).raycastToRef(from, to, this.rr, Q);
    return this.rr.hasHit;
  }

  /** Walls in front (muzzle would clip) and close on both sides (corridor): picks compressed/high ready. */
  private probeContext(): void {
    const c = this.controller;
    const yaw = this.cam.yaw;
    const fx = Math.sin(yaw);
    const fz = Math.cos(yaw);
    const y = c.pos.y + (c.crouched ? 0.9 : 1.35);
    const reach = 0.95;
    this.carryIn.nearWall = this.ray(this.a.set(c.pos.x, y, c.pos.z), this.b.set(c.pos.x + fx * reach, y, c.pos.z + fz * reach));
    const side = 0.8;
    const left = this.ray(this.a.set(c.pos.x, y, c.pos.z), this.b.set(c.pos.x - fz * side, y, c.pos.z + fx * side));
    const right = this.ray(this.a.set(c.pos.x, y, c.pos.z), this.b.set(c.pos.x + fz * side, y, c.pos.z - fx * side));
    this.carryIn.tight = left && right;
  }

  /** Simulation step. */
  fixedUpdate(dt: number, inp: InputState): void {
    const s = this.getSettings();
    const c = this.controller;
    if (s.gameplay.adsToggle) {
      if (inp.pressed('ads')) this.adsToggled = !this.adsToggled;
      this.ads = this.adsToggled;
    } else {
      this.ads = inp.down('ads');
    }
    // aiming while sprinting ends the sprint and raises the weapon
    if (this.ads && c.sprinting && this.coverPose.traverse === 'none') c.cancelSprint();
    if (this.forceAds) this.ads = true;
    if (c.weaponBlocked || this.coverPose.traverse !== 'none') this.ads = false;
    if (inp.pressed('shoulderSwap')) this.cam.swapShoulder();
    this.aimLockTimer = Math.max(0, this.aimLockTimer - dt);

    // weapon carry: ready position from context, raised only to aim or fire
    this.probeT -= dt;
    if (this.probeT <= 0) {
      this.probeT = 0.1;
      this.probeContext();
    }
    const ci = this.carryIn;
    ci.ads = this.ads;
    ci.fire = this.alive && inp.down('fire');
    ci.sinceShot = this.sinceShot;
    ci.doorway = this.context.doorway;
    ci.coverEdge = this.context.coverEdge;
    ci.dashing = c.weaponBlocked;
    // reloading, swapping and throwing all keep the weapon tucked in and down
    ci.reloading = this.reload >= 0 || this.swapT >= 0 || this.grenadeT >= 0;
    ci.traversing = this.coverPose.traverse !== 'none';
    ci.coverRaise = this.coverPose.lean !== 0 || this.coverPose.peekOver > 0.5 || this.coverPose.blind;
    ci.weight = this.weaponWeight;
    this.carry.update(dt, ci);

    const pi: PlayerInput = {
      moveX: inp.move.x,
      moveY: inp.move.y,
      crouchPressed: inp.pressed('crouch'),
      crouchHeld: inp.down('crouch'),
      crouchToggle: s.gameplay.crouchToggle,
      sprintPressed: inp.pressed('dash'),
      sprintHeld: inp.down('dash'),
      sprintToggle: !s.gameplay.sprintHold,
      ads: this.ads,
      aiming: this.aiming || inp.down('fire'),
      reloading: this.reload >= 0,
    };
    if (!this.alive) pi.moveX = pi.moveY = 0;
    c.fixedUpdate(dt, pi, this.cam.yaw);
    if (!c.grounded) this.fallSpeed = Math.max(this.fallSpeed, -c.cc.getVelocity().y);
    if (c.grounded && !this.wasGrounded && this.fallSpeed > 4) this.onLand?.(this.fallSpeed);
    if (c.grounded) this.fallSpeed = 0;
    this.wasGrounded = c.grounded;
  }

  /** Render-rate update: look, camera, animation. */
  frameUpdate(dt: number, alpha: number, look: { x: number; y: number }, move?: { x: number; y: number }): void {
    const c = this.controller;
    if (this.alive && dt > 0) {
      // free orbit: look input applies in full, the same frame, in every state (the body never holds
      // the view back; when aiming the body turns to the view instead)
      this.cam.addLook(look.x, look.y);
      this.recentre(dt, look);
      // from cover the aim stays within the angles the weapon can shoot along
      const lim = this.aimLimit;
      const as = this.aimState;
      if (lim) {
        as.yaw = this.cam.yaw;
        as.pitch = this.cam.pitch;
        clampAim(as, lim, dt);
        this.cam.yaw = as.yaw;
        this.cam.pitch = as.pitch;
      } else as.inside = false;
    }
    this.cam.adsTarget = this.ads ? 1 : 0;
    this.cam.baseFovDeg = this.getSettings().video.fovH;
    this.cam.maxFovDeg = this.getSettings().video.maxFov;
    c.interpolate(alpha);
    this.cam.crouch = c.crouchBlend;
    this.cam.dash = c.dashing ? 1 : 0;
    this.cam.lean = this.coverPose.lean;
    this.cam.cover = this.coverPose.cover !== 'none' ? 1 : 0;
    this.cam.steady = Math.max(c.kneeling ? 1 : c.crouchBlend * 0.5, this.ads ? 0.8 : 0);
    this.cam.pace = c.speed;
    this.cam.lift = this.rig.lift;
    this.cam.coverTop = this.coverPose.top;
    this.cam.update(dt, c.renderPos, c.crouchBlend);
    this.world.frame(c.renderPos, dt);

    const root = this.rig.root;
    root.position.copyFrom(c.renderPos);
    root.rotation.y = c.renderYaw;
    this.kick = Math.max(0, this.kick - dt * 8);
    const cp = this.coverPose;
    // aiming: the upper body follows the aim; not aiming the view orbits freely and only the head glances
    // towards where the camera looks (spine, arms and gun stay put until an action raises the weapon)
    const rel = wrapPi(this.cam.yaw - c.renderYaw);
    const raise = this.carry.raise;
    const aimYaw = rel * raise;
    const w = this.carry.w;
    // the rig pose object is reused every frame (no per-frame allocation)
    const rp = this.rigPose;
    const m = c.motion;
    rp.speed = c.speed;
    rp.localX = c.localMove.x;
    rp.localZ = c.localMove.z;
    rp.grounded = c.grounded;
    rp.crouch = c.crouchBlend;
    rp.kneel = c.kneeling;
    rp.aimPitch = this.cam.pitch * raise;
    rp.aimYaw = aimYaw;
    rp.lookYaw = Math.max(-1.1, Math.min(1.1, rel)) * 0.5 * (1 - raise);
    rp.lookPitch = Math.max(-0.6, Math.min(0.6, this.cam.pitch)) * 0.5 * (1 - raise);
    rp.aim = this.carry.raise;
    rp.carry = w;
    rp.weight = this.weaponWeight;
    rp.kick = this.kick;
    rp.dash = c.dashing ? 1 : 0;
    rp.landing = Math.min(1, c.landT * 2);
    rp.reload = this.reload;
    rp.reloadEmpty = this.reloadEmpty;
    rp.swap = this.swapT;
    rp.swapFrom = this.swapFrom;
    rp.swapTo = this.swapTo;
    rp.grenade = this.grenadeT;
    rp.cover = cp.cover;
    rp.wallSide = cp.wallSide;
    rp.lean = cp.lean;
    rp.peekOver = cp.peekOver;
    rp.coverTop = cp.top;
    // low cover: aiming over it rises just enough; otherwise stay below the top
    rp.coverMode = cp.top > 0 ? (cp.peekOver > 0.5 ? 'over' : 'hide') : 'none';
    rp.blind = cp.blind;
    rp.edgeLook = cp.edgeLook;
    rp.traverse = cp.traverse;
    rp.traverseT = cp.traverseT;
    rp.slide = cp.slide;
    rp.coverTurn = cp.turn;
    // the weapon comes up only once it clears: past an edge (cover controller) or over the top (the rig's rise)
    rp.peekClear = cp.gunClear && (cp.peekOver <= 0.5 || this.rig.overClear) ? 1 : 0;
    rp.check = cp.check;
    rp.melee = cp.melee;
    // motion driver: gait clock (interpolated), state, acceleration in the body frame, velocity
    rp.phase = c.renderPhase;
    rp.motion = m.state;
    rp.motionT = m.stateT;
    const by = c.renderYaw;
    rp.accelFwd = m.ax * Math.sin(by) + m.az * Math.cos(by);
    rp.accelSide = m.ax * Math.cos(by) - m.az * Math.sin(by);
    rp.velX = c.override?.kinematic ? undefined : m.outX;
    rp.velZ = c.override?.kinematic ? undefined : m.outZ;
    rp.goalYaw = m.goalYaw;
    // anticipation at render rate: the stick this frame against the current pace, along the body
    if (move && this.alive && !c.override) {
      const mag = Math.min(1, hyp2(move.x, move.y));
      const cy = this.cam.yaw;
      const wx = Math.cos(cy) * move.x + Math.sin(cy) * move.y;
      const wz = -Math.sin(cy) * move.x + Math.cos(cy) * move.y;
      const along = mag > 0.05 ? (wx * Math.sin(by) + wz * Math.cos(by)) / mag : 0;
      const top = c.sprinting ? MOVEMENT.sprintSpeed : c.crouched ? MOVEMENT.crouchRunSpeed : MOVEMENT.jogSpeed;
      rp.intent = mag * Math.max(0, along) - c.speed / top;
    } else rp.intent = 0;
    // stopping: the last steps land where the body will come to rest
    const sp = m.speed;
    const stopD = sp > 0.01 ? (sp * sp) / (2 * MOVEMENT.decelMax) + sp * (MOVEMENT.decelMax / MOVEMENT.jerkMax) * 0.5 : 0;
    rp.restX = c.renderPos.x + (sp > 0.01 ? (m.vx / sp) * stopD : 0);
    rp.restZ = c.renderPos.z + (sp > 0.01 ? (m.vz / sp) * stopD : 0);
    this.rig.animate(dt, rp);
    // from cover, no shot until the weapon is actually out: leaned past the edge, risen over the top, or
    // raised above it for blind fire (else the round would go into the cover)
    const cp2 = this.coverPose;
    const g = this.rig.graph;
    this.coverFireBlocked =
      cp2.cover !== 'none' &&
      (cp2.lean !== 0 ? Math.abs(g.leanOut) < 0.85 || !cp2.gunClear : cp2.peekOver > 0.5 ? !this.rig.overClear : cp2.blind && cp2.cover === 'low' ? g.blindOut < 0.85 : false);
    // footsteps carry into the camera as a tiny damped dip (scaled by how hard the step lands)
    const pl = this.rig.planner;
    if ((pl.L.landed || pl.R.landed) && c.grounded) this.cam.footstep(Math.min(1.4, 0.35 + m.speed * 0.45));
    this.cam.applyBodyFade(this.rig);
  }

  private lookIdleT = 0;

  /**
   * Gentle auto-recentre: after `recentreDelay` s without look input while moving (not aiming, not in
   * cover), the view eases round behind the travel direction. Never while the player is looking.
   */
  private recentre(dt: number, look: { x: number; y: number }): void {
    const c = this.controller;
    this.lookIdleT = Math.abs(look.x) + Math.abs(look.y) > 1e-5 ? 0 : this.lookIdleT + dt;
    const T = MOVEMENT;
    if (!this.getSettings().gameplay.autoRecentre || this.lookIdleT < T.recentreDelay) return;
    if (this.ads || this.aiming || c.override || this.coverPose.cover !== 'none' || c.speed < 0.5) return;
    const m = c.motion;
    const heading = Math.atan2(m.vx, m.vz);
    const err = wrapPi(heading - this.cam.yaw);
    // ease in over the first half second after the delay, slow near the target
    const ramp = Math.min(1, (this.lookIdleT - T.recentreDelay) / 0.5);
    const rate = T.recentreRate * ramp * Math.min(1, Math.abs(err) / 0.6);
    const step = Math.sign(err) * Math.min(Math.abs(err), rate * dt);
    this.cam.yaw = wrapPi(this.cam.yaw + step);
  }

  dispose(): void {
    this.rig.dispose();
    this.controller.dispose();
    this.cam.camera.dispose();
  }
}
