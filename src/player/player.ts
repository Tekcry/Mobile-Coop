import type { Vector3 } from '../core/babylon';
import type { InputState } from '../input/inputState';
import type { Settings } from '../core/settings';
import type { World } from '../world/world';
import type { AvatarLook } from '../cosmetics/avatarLook';
import { CharacterRig } from './characterRig';
import { PlayerController, type PlayerInput } from './playerController';
import { ShoulderCamera } from './shoulderCamera';
import { avatarFactory } from '../cosmetics/avatarFactory';

/** The local player: input -> controller (fixed step) -> camera + rig (per frame). */
export class Player {
  readonly controller: PlayerController;
  readonly rig: CharacterRig;
  readonly cam: ShoulderCamera;
  private adsToggled = false;
  ads = false;
  /** Set by weapons when firing so the body turns to face the aim. */
  aimLockTimer = 0;
  kick = 0;
  alive = true;
  /** Reload progress 0..1 (or -1), set by PlayerWeapons for the animation layer. */
  reload = -1;
  /** Cover pose (set by the cover controller). */
  coverPose: { cover: 'none' | 'low' | 'high'; peek: number; blind: boolean; vault: number } = { cover: 'none', peek: 0, blind: false, vault: -1 };
  /** Called when landing from a fall (speed in m/s). */
  onLand: ((speed: number) => void) | null = null;
  private wasGrounded = true;
  private fallSpeed = 0;

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
    this.cam.baseFovDeg = s.video.fov;
  }

  get position(): Vector3 {
    return this.controller.pos;
  }

  /** Simulation step. */
  fixedUpdate(dt: number, inp: InputState): void {
    const s = this.getSettings();
    if (s.gameplay.adsToggle) {
      if (inp.pressed('ads')) this.adsToggled = !this.adsToggled;
      this.ads = this.adsToggled;
    } else {
      this.ads = inp.down('ads');
    }
    if (this.controller.weaponBlocked) this.ads = false;
    if (inp.pressed('shoulderSwap')) this.cam.swapShoulder();
    this.aimLockTimer = Math.max(0, this.aimLockTimer - dt);
    const pi: PlayerInput = {
      moveX: inp.move.x,
      moveY: inp.move.y,
      jump: inp.pressed('jump'),
      crouchPressed: inp.pressed('crouch'),
      crouchHeld: inp.down('crouch'),
      crouchToggle: s.gameplay.crouchToggle,
      sprint: inp.down('sprint') && !inp.down('fire'),
      ads: this.ads,
      aimLock: this.aimLockTimer > 0 || inp.down('fire'),
    };
    if (!this.alive) {
      pi.moveX = pi.moveY = 0;
      pi.jump = false;
    }
    this.controller.fixedUpdate(dt, pi, this.cam.yaw);
    const c = this.controller;
    if (!c.grounded) this.fallSpeed = Math.max(this.fallSpeed, -c.cc.getVelocity().y);
    if (c.grounded && !this.wasGrounded && this.fallSpeed > 4) this.onLand?.(this.fallSpeed);
    if (c.grounded) this.fallSpeed = 0;
    this.wasGrounded = c.grounded;
  }

  /** Render-rate update: look, camera, animation. */
  frameUpdate(dt: number, alpha: number, look: { x: number; y: number }): void {
    const c = this.controller;
    if (this.alive) this.cam.addLook(look.x, look.y);
    this.cam.adsTarget = this.ads ? 1 : 0;
    this.cam.baseFovDeg = this.getSettings().video.fov;
    c.interpolate(alpha);
    this.cam.update(dt, c.renderPos, c.crouchBlend);
    this.world.frame(c.renderPos);

    const root = this.rig.root;
    root.position.copyFrom(c.renderPos);
    root.rotation.y = c.renderYaw;
    this.kick = Math.max(0, this.kick - dt * 8);
    const cp = this.coverPose;
    const aiming = c.weaponBlocked ? 0 : this.ads || this.aimLockTimer > 0 ? 1 : 0.15;
    let aimYaw = this.cam.yaw - c.renderYaw;
    aimYaw = Math.atan2(Math.sin(aimYaw), Math.cos(aimYaw));
    this.rig.animate(dt, {
      speed: c.speed,
      localX: c.localMove.x,
      localZ: c.localMove.z,
      grounded: c.grounded,
      crouch: c.crouchBlend,
      roll: c.rollT,
      aimPitch: this.cam.pitch,
      aimYaw: aiming > 0.5 ? aimYaw : aimYaw * 0.5,
      aim: aiming,
      kick: this.kick,
      sprint: c.sprinting,
      reload: this.reload,
      cover: cp.cover,
      peek: cp.peek,
      blind: cp.blind,
      vault: cp.vault,
    });
    // Hide the body if the camera is pushed into it (tight spaces).
    root.setEnabled(this.cam.boomActual > 0.75);
  }

  dispose(): void {
    this.rig.dispose();
    this.controller.dispose();
    this.cam.camera.dispose();
  }
}

