import { PhysicsRaycastResult, Vector3, type PhysicsEngine } from '../core/babylon';
import type { InputState } from '../input/inputState';
import type { Settings } from '../core/settings';
import type { World } from '../world/world';
import type { AvatarLook } from '../cosmetics/avatarLook';
import { CharacterRig } from './characterRig';
import { PlayerController, type PlayerInput } from './playerController';
import { ShoulderCamera } from './shoulderCamera';
import { avatarFactory } from '../cosmetics/avatarFactory';
import { WeaponCarry, emptyCarryInput } from '../weapons/weaponCarry';
import { lookCap } from './movement';
import { wrapPi } from '../anim/motion';
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
  blind: boolean;
  edgeLook: number;
  traverse: TraverseKind;
  traverseT: number;
  /** Dash-in slide 0..1, or < 0. */
  slide: number;
  /** Doorway check 0..1, or < 0. */
  check: number;
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
  /** Set by weapons when firing (kept for callers; the carry's raise now drives the pose). */
  aimLockTimer = 0;
  kick = 0;
  alive = true;
  /** Reload progress 0..1 (or -1), set by PlayerWeapons for the animation layer. */
  reload = -1;
  /** Seconds since the last shot and weapon mass factor (set by PlayerWeapons). */
  sinceShot = 99;
  weaponWeight = 1;
  /** Pose driven by cover / corners / traversal. */
  readonly coverPose: PlayerPose = { cover: 'none', wallSide: 0, lean: 0, peekOver: 0, blind: false, edgeLook: 0, traverse: 'none', traverseT: 0, slide: -1, check: -1 };
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
    ci.reloading = this.reload >= 0;
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
      dashPressed: inp.pressed('dash'),
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
  frameUpdate(dt: number, alpha: number, look: { x: number; y: number }): void {
    const c = this.controller;
    if (this.alive && dt > 0) {
      // the view never turns faster than the body can follow (stance-limited)
      const cap = lookCap(this.aiming || this.ads, c.dashing) * dt;
      this.cam.addLook(Math.max(-cap, Math.min(cap, look.x)), Math.max(-cap, Math.min(cap, look.y)));
      // the upper body can only twist so far ahead of the feet: the view waits for the body to turn
      const rel = wrapPi(this.cam.yaw - c.renderYaw);
      if (Math.abs(rel) > MOVEMENT.twistMax) this.cam.yaw = c.renderYaw + Math.sign(rel) * MOVEMENT.twistMax;
    }
    this.cam.adsTarget = this.ads ? 1 : 0;
    this.cam.baseFovDeg = this.getSettings().video.fovH;
    c.interpolate(alpha);
    this.cam.crouch = c.crouchBlend;
    this.cam.dash = c.dashing ? 1 : 0;
    this.cam.lean = this.coverPose.lean;
    this.cam.update(dt, c.renderPos, c.crouchBlend);
    this.world.frame(c.renderPos);

    const root = this.rig.root;
    root.position.copyFrom(c.renderPos);
    root.rotation.y = c.renderYaw;
    this.kick = Math.max(0, this.kick - dt * 8);
    const cp = this.coverPose;
    let aimYaw = this.cam.yaw - c.renderYaw;
    aimYaw = Math.atan2(Math.sin(aimYaw), Math.cos(aimYaw));
    const w = this.carry.w;
    this.rig.animate(dt, {
      speed: c.speed,
      localX: c.localMove.x,
      localZ: c.localMove.z,
      grounded: c.grounded,
      crouch: c.crouchBlend,
      kneel: c.kneeling,
      aimPitch: this.cam.pitch,
      aimYaw,
      aim: this.carry.raise,
      carry: w,
      weight: this.weaponWeight,
      kick: this.kick,
      dash: c.dashing ? 1 : 0,
      landing: Math.min(1, c.landT * 2),
      reload: this.reload,
      cover: cp.cover,
      wallSide: cp.wallSide,
      lean: cp.lean,
      peekOver: cp.peekOver,
      blind: cp.blind,
      edgeLook: cp.edgeLook,
      traverse: cp.traverse,
      traverseT: cp.traverseT,
      slide: cp.slide,
      check: cp.check,
    });
    this.cam.applyBodyFade(this.rig);
  }

  dispose(): void {
    this.rig.dispose();
    this.controller.dispose();
    this.cam.camera.dispose();
  }
}
