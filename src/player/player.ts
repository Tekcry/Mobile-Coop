import { Vector3 } from '../core/babylon';
import type { InputState } from '../input/inputState';
import type { Settings } from '../core/settings';
import type { World } from '../world/world';
import type { AvatarLook } from '../cosmetics/avatarLook';
import { CharacterRig } from './characterRig';
import { PlayerController, type PlayerInput } from './playerController';
import { ShoulderCamera } from './shoulderCamera';

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

  constructor(
    readonly world: World,
    look: AvatarLook,
    spawn: { pos: Vector3; yaw: number },
    private getSettings: () => Settings,
  ) {
    this.controller = new PlayerController(world.scene, spawn.pos, spawn.yaw);
    this.rig = new CharacterRig(world.scene, (shape, hex) => world.parts.instance(shape, hex, 'player-part'), look, 1.8, 'player');
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
    if (this.controller.isRolling || this.controller.sprinting) this.ads = false;
    if (inp.pressed('shoulderSwap')) this.cam.swapShoulder();
    this.aimLockTimer = Math.max(0, this.aimLockTimer - dt);
    const pi: PlayerInput = {
      moveX: inp.move.x,
      moveY: inp.move.y,
      jump: inp.pressed('jump'),
      crouchPressed: inp.pressed('crouch'),
      crouchHeld: inp.down('crouch'),
      crouchToggle: s.gameplay.crouchToggle,
      sprint: inp.down('sprint'),
      ads: this.ads,
      aimLock: this.aimLockTimer > 0 || inp.down('fire'),
    };
    if (!this.alive) {
      pi.moveX = pi.moveY = 0;
      pi.jump = false;
    }
    this.controller.fixedUpdate(dt, pi, this.cam.yaw);
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
    const aiming = this.ads || this.aimLockTimer > 0 ? 1 : 0.15;
    this.rig.animate(dt, {
      speed: c.speed,
      localX: c.localMove.x,
      localZ: c.localMove.z,
      grounded: c.grounded,
      crouch: c.crouchBlend,
      roll: c.rollT,
      aimPitch: this.cam.pitch,
      aim: aiming,
      kick: this.kick,
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

