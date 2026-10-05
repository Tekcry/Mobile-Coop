import { Camera, FreeCamera, PhysicsRaycastResult, Vector3, type PhysicsEngine, type Scene } from '../core/babylon';
import { G } from '../physics/groups';
import { MOVEMENT } from '../config/movement';
import { springStep } from '../anim/rigMath';

export const CAMERA_TUNING = {
  pivotHeightStand: 1.58,
  pivotHeightCrouch: 1.08,
  shoulderOffset: 0.82,
  boomHip: 2.55,
  boomAds: 1.25,
  height: 0.12,
  minPitch: -1.25,
  maxPitch: 1.1,
  collisionPadding: 0.22,
  shoulderSwapSpeed: 8,
  adsSpeed: 12,
};

/**
 * Over-the-shoulder camera: yaw/pitch from look input, boom with collision against
 * static geometry, shoulder swap, ADS zoom, recoil (with recovery) and trauma shake.
 */
export class ShoulderCamera {
  readonly camera: FreeCamera;
  yaw = 0;
  pitch = 0;
  /** Target shoulder: 1 = right, -1 = left. */
  shoulder: 1 | -1 = 1;
  private side = 1;
  /** 0 hip .. 1 ADS. */
  ads = 0;
  adsTarget = 0;
  /** FOV multiplier while fully ADS (weapon zoom). */
  adsZoom = 0.75;
  baseFovDeg = 90;
  private boom = CAMERA_TUNING.boomHip;
  private recoilPitch = 0;
  private recoilYaw = 0;
  private trauma = 0;
  private t = 0;
  private pivotY = CAMERA_TUNING.pivotHeightStand;
  /** Smoothed feet height so step-ups and landings do not jolt the view. */
  private footY = Number.NaN;
  /** Critically damped follow state (x/z position, shoulder side, ADS blend). */
  private fx = Number.NaN;
  private fz = 0;
  private fvx = 0;
  private fvz = 0;
  private sideV = 0;
  private adsV = 0;
  private footV = 0;
  readonly pivot = new Vector3();
  readonly forward = new Vector3(0, 0, 1);
  /** Distance from camera to pivot; used to fade the player model when too close. */
  boomActual = CAMERA_TUNING.boomHip;
  private rr = new PhysicsRaycastResult();
  private shoulderPt = new Vector3();
  private desired = new Vector3();
  private camPos = new Vector3();
  private static readonly Q = { membership: G.PLAYER, collideWith: G.STATIC };

  constructor(private scene: Scene) {
    this.camera = new FreeCamera('ots', new Vector3(0, 2, -4), scene);
    this.camera.minZ = 0.05;
    this.camera.maxZ = 220;
    this.camera.fovMode = Camera.FOVMODE_HORIZONTAL_FIXED;
    this.camera.inputs.clear();
    scene.activeCamera = this.camera;
  }

  swapShoulder(): void {
    this.shoulder = this.shoulder === 1 ? -1 : 1;
  }

  addLook(dYaw: number, dPitch: number): void {
    this.yaw += dYaw;
    this.pitch = Math.max(CAMERA_TUNING.minPitch, Math.min(CAMERA_TUNING.maxPitch, this.pitch + dPitch));
  }

  /** Weapon recoil kick in radians. Pitch kick is applied to aim then partially recovered. */
  kick(pitch: number, yaw: number): void {
    this.recoilPitch += pitch;
    this.recoilYaw += yaw;
    // Most of the kick is transient (recovers); a small part climbs permanently.
    this.pitch = Math.min(CAMERA_TUNING.maxPitch, this.pitch + pitch * 0.32);
    this.yaw += yaw * 0.32;
  }

  shake(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  /** Aim yaw/pitch including transient recoil. */
  get aimYaw(): number {
    return this.yaw + this.recoilYaw * 0.4;
  }
  get aimPitch(): number {
    return this.pitch + this.recoilPitch * 0.4;
  }

  update(dt: number, feet: Vector3, crouch: number): void {
    const T = CAMERA_TUNING;
    this.t += dt;
    // critically damped: smooth start and stop, no overshoot or jitter
    [this.side, this.sideV] = springStep(this.side, this.sideV, this.shoulder, MOVEMENT.camShoulder, dt);
    [this.ads, this.adsV] = springStep(this.ads, this.adsV, this.adsTarget, MOVEMENT.camAds, dt);
    this.ads = Math.max(0, Math.min(1, this.ads));
    const recover = Math.min(1, dt * 9);
    this.recoilPitch -= this.recoilPitch * recover;
    this.recoilYaw -= this.recoilYaw * recover;
    this.trauma = Math.max(0, this.trauma - dt * 1.6);

    const targetPivotY = T.pivotHeightStand + (T.pivotHeightCrouch - T.pivotHeightStand) * crouch;
    this.pivotY += (targetPivotY - this.pivotY) * Math.min(1, dt * 10);
    if (Number.isNaN(this.footY) || Math.abs(feet.y - this.footY) > 3) {
      this.footY = feet.y;
      this.footV = 0;
    }
    [this.footY, this.footV] = springStep(this.footY, this.footV, feet.y, 14, dt);
    if (Number.isNaN(this.fx) || Math.hypot(feet.x - this.fx, feet.z - this.fz) > 3) {
      this.fx = feet.x;
      this.fz = feet.z;
      this.fvx = this.fvz = 0;
    }
    [this.fx, this.fvx] = springStep(this.fx, this.fvx, feet.x, MOVEMENT.camFollow, dt);
    [this.fz, this.fvz] = springStep(this.fz, this.fvz, feet.z, MOVEMENT.camFollow, dt);
    this.pivot.set(this.fx, this.footY + this.pivotY, this.fz);

    const yaw = this.aimYaw;
    const pitch = this.aimPitch;
    const cp = Math.cos(pitch);
    this.forward.set(Math.sin(yaw) * cp, Math.sin(pitch), Math.cos(yaw) * cp);
    const rightX = Math.cos(yaw);
    const rightZ = -Math.sin(yaw);

    const boomTarget = T.boomHip + (T.boomAds - T.boomHip) * this.ads;
    const shoulder = T.shoulderOffset * (1 - 0.25 * this.ads) * this.side;
    // shoulder point (beside the head), then boom backwards along view
    const sx = this.pivot.x + rightX * shoulder;
    const sy = this.pivot.y + T.height;
    const sz = this.pivot.z + rightZ * shoulder;
    const shoulderPt = this.shoulderPt.set(sx, sy, sz);
    const eng = this.scene.getPhysicsEngine() as PhysicsEngine | null;
    const q = ShoulderCamera.Q;
    if (eng) {
      // keep the shoulder point itself out of walls in tight corridors
      this.rr.reset();
      eng.raycastToRef(this.pivot, shoulderPt, this.rr, q);
      if (this.rr.hasHit) Vector3.LerpToRef(this.pivot, this.rr.hitPoint, 0.75, shoulderPt);
    }
    const desired = this.forward.scaleToRef(-boomTarget, this.desired).addInPlace(shoulderPt);
    let dist = boomTarget;
    if (eng) {
      this.rr.reset();
      eng.raycastToRef(shoulderPt, desired, this.rr, q);
      if (this.rr.hasHit) dist = Math.max(0.3, Vector3.Distance(shoulderPt, this.rr.hitPoint) - T.collisionPadding);
    }
    // snap in instantly, ease back out
    this.boom = dist < this.boom ? dist : this.boom + (dist - this.boom) * Math.min(1, dt * 5);
    this.boomActual = this.boom;
    const pos = this.forward.scaleToRef(-this.boom, this.camPos).addInPlace(shoulderPt);

    // shake (smooth pseudo-noise)
    const s = this.trauma * this.trauma;
    if (s > 0) {
      pos.x += Math.sin(this.t * 37.3) * 0.06 * s;
      pos.y += Math.sin(this.t * 41.7 + 1.3) * 0.06 * s;
    }
    this.camera.position.copyFrom(pos);
    this.camera.rotation.set(-pitch + Math.sin(this.t * 29.1) * 0.02 * s, yaw, Math.sin(this.t * 23.3) * 0.03 * s);
    const zoom = 1 + (this.adsZoom - 1) * this.ads;
    this.camera.fov = ((this.baseFovDeg * Math.PI) / 180) * zoom;
  }

  /** Ray from the camera through the screen centre. */
  aimRay(outOrigin: Vector3, outDir: Vector3): void {
    outOrigin.copyFrom(this.camera.position);
    outDir.copyFrom(this.forward);
  }
}
