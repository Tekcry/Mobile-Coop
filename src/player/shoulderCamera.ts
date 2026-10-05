import { Camera, FreeCamera, Vector3, type Scene } from '../core/babylon';
import { G } from '../physics/groups';

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
  readonly pivot = new Vector3();
  readonly forward = new Vector3(0, 0, 1);
  /** Distance from camera to pivot; used to fade the player model when too close. */
  boomActual = CAMERA_TUNING.boomHip;

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
    this.side += (this.shoulder - this.side) * Math.min(1, dt * T.shoulderSwapSpeed);
    this.ads += (this.adsTarget - this.ads) * Math.min(1, dt * T.adsSpeed);
    const recover = Math.min(1, dt * 9);
    this.recoilPitch -= this.recoilPitch * recover;
    this.recoilYaw -= this.recoilYaw * recover;
    this.trauma = Math.max(0, this.trauma - dt * 1.6);

    const targetPivotY = T.pivotHeightStand + (T.pivotHeightCrouch - T.pivotHeightStand) * crouch;
    this.pivotY += (targetPivotY - this.pivotY) * Math.min(1, dt * 10);
    if (Number.isNaN(this.footY) || Math.abs(feet.y - this.footY) > 3) this.footY = feet.y;
    this.footY += (feet.y - this.footY) * Math.min(1, dt * 14);
    this.pivot.set(feet.x, this.footY + this.pivotY, feet.z);

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
    let shoulderPt = new Vector3(sx, sy, sz);
    const eng = this.scene.getPhysicsEngine();
    const q = { membership: G.PLAYER, collideWith: G.STATIC };
    if (eng) {
      // keep the shoulder point itself out of walls in tight corridors
      const r0 = eng.raycast(this.pivot, shoulderPt, q);
      if (r0.hasHit) shoulderPt = Vector3.Lerp(this.pivot, r0.hitPoint, 0.75);
    }
    const desired = shoulderPt.subtract(this.forward.scale(boomTarget));
    let dist = boomTarget;
    if (eng) {
      const r = eng.raycast(shoulderPt, desired, q);
      if (r.hasHit) dist = Math.max(0.3, Vector3.Distance(shoulderPt, r.hitPoint) - T.collisionPadding);
    }
    // snap in instantly, ease back out
    this.boom = dist < this.boom ? dist : this.boom + (dist - this.boom) * Math.min(1, dt * 5);
    this.boomActual = this.boom;
    const pos = shoulderPt.subtract(this.forward.scale(this.boom));

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
