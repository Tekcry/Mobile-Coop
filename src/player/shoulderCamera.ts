import { Camera, FreeCamera, PhysicsRaycastResult, Vector3, type PhysicsEngine, type Scene } from '../core/babylon';
import { G } from '../physics/groups';
import { MOVEMENT } from '../config/movement';
import { CAMERA, framing } from '../config/camera';
import type { CharacterRig } from './characterRig';
import { Spring } from '../anim/rigMath';
import { hyp2 } from '../core/mathx';

/** Vertical FOV (rad) for a horizontal FOV (deg) at a 16:9 reference aspect. */
export function vfovFromH16x9(hDeg: number): number {
  return 2 * Math.atan(Math.tan((hDeg * Math.PI) / 360) * (9 / 16));
}

/** Kept for older callers: the framing values now live in `config/camera.ts`. */
export const CAMERA_TUNING = {
  get pivotHeightStand(): number {
    return CAMERA.pivotStand;
  },
  get pivotHeightCrouch(): number {
    return CAMERA.pivotCrouch;
  },
  get minPitch(): number {
    return CAMERA.minPitch;
  },
  get maxPitch(): number {
    return CAMERA.maxPitch;
  },
};

/** Low cover: the camera eye sits this far above the top (m). */
export const COVER_EYE = 0.26;

/**
 * Weighted cinematic over-the-shoulder camera. Gameplay sets the look targets (`yaw`, `pitch`); the
 * rendered view follows them with slight inertia (critically damped, no overshoot). Position follows
 * the feet with a 150-250 ms lag and looks ahead along the movement; every framing change (crouch,
 * ADS, cover, lean, dash, shoulder swap) blends over 350-600 ms; the shoulder swap arcs back behind
 * the head. Subtle handheld drift (steadier when kneeling or aiming) and a damped footstep micro-bob
 * give it weight. The boom pulls in smoothly against walls (never pops) and eases back out.
 * Updated every render frame from interpolated targets.
 */

export class ShoulderCamera {
  readonly camera: FreeCamera;
  /** Look targets (gameplay). */
  yaw = 0;
  pitch = 0;
  /** Rendered view angles (follow the targets with slight inertia). */
  viewYaw = Number.NaN;
  viewPitch = 0;
  /** Rendered view angular speed (rad/s), for the debug graph and smoothness tests. */
  angVel = 0;
  /** Target shoulder: 1 = right, -1 = left. */
  shoulder: 1 | -1 = 1;
  /** 0 hip .. 1 ADS. */
  ads = 0;
  adsTarget = 0;
  /** FOV multiplier while fully ADS (weapon zoom). */
  adsZoom = 0.75;
  baseFovDeg = CAMERA.fov;
  /** State nudges set by the player each frame. */
  crouch = 0;
  /** Pelvis lift of the low cover height control (m): the pivot rises with a crouched aim over cover. */
  lift = 0;
  /** Low cover top above the feet (m; 0 = none): the eye stays just above it, so hiding still sees over. */
  coverTop = 0;
  dash = 0;
  lean = 0;
  /** In cover (slow push-in). */
  cover = 0;
  /** Steadiness 0..1 (kneeling, aiming): scales the handheld drift down. */
  steady = 0;
  /** Ground speed (m/s): framing tightens at a sneak and opens up with pace. */
  pace = 0;
  private sPace = new Spring();
  private sSide = new Spring(1);
  private sAds = new Spring();
  private sPivot = new Spring(CAMERA.pivotStand);
  private sLean = new Spring();
  private sDash = new Spring();
  private sCover = new Spring();
  private sFootY = new Spring(Number.NaN);
  private sFx = new Spring(Number.NaN);
  private sFz = new Spring();
  private sLookX = new Spring();
  private sLookZ = new Spring();
  private sBob = new Spring();
  private sBoom = new Spring(CAMERA.boomHip);
  private lastFx = Number.NaN;
  private lastFz = 0;
  private headHidden = false;
  private allHidden = false;
  private recoilPitch = 0;
  private recoilYaw = 0;
  private trauma = 0;
  private t = 0;
  readonly pivot = new Vector3();
  readonly forward = new Vector3(0, 0, 1);
  /** Distance from camera to pivot; used to fade the player model when too close. */
  boomActual = CAMERA.boomHip;
  private rr = new PhysicsRaycastResult();
  private shoulderPt = new Vector3();
  private desired = new Vector3();
  private camPos = new Vector3();
  private static readonly Q = { membership: G.PLAYER, collideWith: G.STATIC };

  constructor(private scene: Scene) {
    this.camera = new FreeCamera('ots', new Vector3(0, 2, -4), scene);
    this.camera.minZ = 0.05;
    this.camera.maxZ = 220;
    // Hor+: the vertical FOV is fixed from the horizontal setting at 16:9, so tall framing (head to
    // hips) holds on any aspect and ultra-wide phones simply see more at the sides
    this.camera.fovMode = Camera.FOVMODE_VERTICAL_FIXED;
    this.camera.inputs.clear();
    scene.activeCamera = this.camera;
  }

  swapShoulder(): void {
    this.shoulder = this.shoulder === 1 ? -1 : 1;
  }

  addLook(dYaw: number, dPitch: number): void {
    this.yaw += dYaw;
    this.pitch = Math.max(CAMERA.minPitch, Math.min(CAMERA.maxPitch, this.pitch + dPitch));
  }

  /** Weapon recoil kick in radians. Pitch kick is applied to aim then partially recovered. */
  kick(pitch: number, yaw: number): void {
    this.recoilPitch += pitch;
    this.recoilYaw += yaw;
    // Most of the kick is transient (recovers); a small part climbs permanently.
    this.pitch = Math.min(CAMERA.maxPitch, this.pitch + pitch * 0.32);
    this.yaw += yaw * 0.32;
  }

  shake(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  /** A hard contact (slamming into cover): a sharp dip of the view and a short shake (strength 0..1). */
  impact(strength: number): void {
    const s = Math.max(0, Math.min(1, strength));
    this.sBob.kick(-0.7 * s);
    this.trauma = Math.min(1, this.trauma + 0.16 * s);
  }

  /** A footstep landed (heel strike): a tiny damped dip of the view (strength ~0..1). */
  footstep(strength = 1): void {
    this.sBob.kick(-0.12 * Math.min(1.5, strength));
  }

  /** Snap the rendered view to the targets (teleport, respawn). */
  snap(): void {
    this.viewYaw = this.yaw;
    this.viewPitch = this.pitch;
  }

  /** Aim yaw/pitch including transient recoil. */
  get aimYaw(): number {
    return this.yaw + this.recoilYaw * 0.4;
  }
  get aimPitch(): number {
    return this.pitch + this.recoilPitch * 0.4;
  }

  update(dt: number, feet: Vector3, crouch: number): void {
    const T = CAMERA;
    this.t += dt;
    if (dt <= 0) dt = 1e-4;
    // framing blends (critically damped: 350-600 ms, no overshoot)
    const side = this.sSide.step(this.shoulder, MOVEMENT.camShoulder, dt);
    this.ads = Math.max(0, Math.min(1, this.sAds.step(this.adsTarget, MOVEMENT.camAds, dt)));
    const leanS = this.sLean.step(this.lean, 8, dt);
    const dashS = this.sDash.step(this.dash, 6, dt);
    const coverS = this.sCover.step(this.cover, 3, dt);
    const recover = Math.min(1, dt * 9);
    this.recoilPitch -= this.recoilPitch * recover;
    this.recoilYaw -= this.recoilYaw * recover;
    this.trauma = Math.max(0, this.trauma - dt * 1.6);

    const fr = framing(this.ads, crouch, dashS);
    const overEye = this.coverTop > 0 ? this.coverTop + COVER_EYE - T.height : 0;
    const pivotY = this.sPivot.step(Math.max(fr.pivot + Math.max(0, this.lift), overEye), 10, dt);
    // follow: feet height and position lag slightly; look ahead along the movement
    if (Number.isNaN(this.sFootY.x) || Math.abs(feet.y - this.sFootY.x) > 3) this.sFootY.reset(feet.y);
    const footY = this.sFootY.step(feet.y, 14, dt);
    if (Number.isNaN(this.sFx.x) || hyp2(feet.x - this.sFx.x, feet.z - this.sFz.x) > 3) {
      this.sFx.reset(feet.x);
      this.sFz.reset(feet.z);
      this.lastFx = feet.x;
      this.lastFz = feet.z;
      this.sLookX.reset();
      this.sLookZ.reset();
    }
    const vx = (feet.x - this.lastFx) / dt;
    const vz = (feet.z - this.lastFz) / dt;
    this.lastFx = feet.x;
    this.lastFz = feet.z;
    const la = 0.14;
    const lx = this.sLookX.step(Math.max(-0.3, Math.min(0.3, vx * la)), 5, dt);
    const lz = this.sLookZ.step(Math.max(-0.3, Math.min(0.3, vz * la)), 5, dt);
    const fx = this.sFx.step(feet.x, MOVEMENT.camFollow, dt);
    const fz = this.sFz.step(feet.z, MOVEMENT.camFollow, dt);
    const bob = this.sBob.step(0, 16, dt);
    this.pivot.set(fx + lx, footY + pivotY + bob, fz + lz);

    // rendered rotation: look input applies the same frame (no lag); smoothing and acceleration live in
    // the input sources, so the view is exactly where the player points it
    if (Number.isNaN(this.viewYaw)) this.snap();
    const prevYaw = this.viewYaw;
    const prevPitch = this.viewPitch;
    this.viewYaw = this.aimYaw;
    this.viewPitch = this.aimPitch;
    // handheld drift: tiny and slow; steadier kneeling / aiming, a touch more when dashing
    // yaw and pitch peaks combine: 0.0018 rad per axis keeps the total under 0.15 deg
    const drift = 0.0018 * (1 - 0.65 * Math.min(1, this.steady)) * (1 + dashS * 0.5);
    const yaw = this.viewYaw + (Math.sin(this.t * 0.53) * 0.6 + Math.sin(this.t * 1.31 + 1) * 0.4) * drift;
    const pitch = this.viewPitch + (Math.sin(this.t * 0.41 + 2) * 0.6 + Math.sin(this.t * 1.07) * 0.4) * drift - dashS * 0.03;
    const dYaw = yaw - prevYaw;
    this.angVel = hyp2(dYaw, pitch - prevPitch) / dt;
    const cp = Math.cos(pitch);
    this.forward.set(Math.sin(yaw) * cp, Math.sin(pitch), Math.cos(yaw) * cp);
    const rightX = Math.cos(yaw);
    const rightZ = -Math.sin(yaw);

    // boom: framing, cover push-in, and the shoulder swap arcs back behind the head
    const arc = 0.2 * (1 - side * side);
    // pace: a sneak frames tighter, a jog / sprint pulls back a little (sprint adds the dash framing)
    const paceS = this.sPace.step(Math.min(1, this.pace / 2.8), 4, dt);
    const boomTarget = fr.boom - coverS * 0.12 + arc + (paceS - 0.45) * 0.22 * (1 - this.ads);
    const shoulder = fr.shoulder * side + leanS * T.leanShift;
    const shoulderPt = this.shoulderPt.set(this.pivot.x + rightX * shoulder, this.pivot.y + T.height, this.pivot.z + rightZ * shoulder);
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
      if (this.rr.hasHit) dist = Math.max(T.minBoom, Vector3.Distance(shoulderPt, this.rr.hitPoint) - T.padding);
    }
    // pull in quickly but smoothly (never pops), ease back out slowly; never behind a wall
    const boomNow = this.sBoom.step(dist, dist < this.sBoom.x ? 40 : 7, dt);
    this.boomActual = Math.min(boomNow, dist + 0.04);
    const pos = this.forward.scaleToRef(-this.boomActual, this.camPos).addInPlace(shoulderPt);

    // shake (smooth pseudo-noise)
    const s = this.trauma * this.trauma;
    if (s > 0) {
      pos.x += Math.sin(this.t * 37.3) * 0.06 * s;
      pos.y += Math.sin(this.t * 41.7 + 1.3) * 0.06 * s;
    }
    this.camera.position.copyFrom(pos);
    this.camera.rotation.set(-pitch + Math.sin(this.t * 29.1) * 0.02 * s, yaw, Math.sin(this.t * 23.3) * 0.03 * s);
    const zoom = 1 + (this.adsZoom - 1) * this.ads;
    this.camera.fov = vfovFromH16x9(this.baseFovDeg + dashS * 4) * zoom;
  }

  /**
   * Tight spaces: rather than swinging the camera away, hide the parts of the body it gets too close
   * to (head first, then everything). Only touches visibility when a threshold is crossed.
   */
  applyBodyFade(rig: CharacterRig): void {
    rig.headNode.computeWorldMatrix(true);
    const dHead = Vector3.Distance(this.camera.position, rig.headNode.getAbsolutePosition());
    const hideHead = dHead < CAMERA.hideHead;
    const hideAll = this.boomActual < CAMERA.hideAll;
    if (hideAll !== this.allHidden) {
      this.allHidden = hideAll;
      rig.root.setEnabled(!hideAll);
    }
    if (hideHead !== this.headHidden) {
      this.headHidden = hideHead;
      for (const m of rig.parts) if (m.parent === rig.headNode) m.isVisible = !hideHead;
    }
  }

  /** Ray from the camera through the screen centre. */
  aimRay(outOrigin: Vector3, outDir: Vector3): void {
    outOrigin.copyFrom(this.camera.position);
    outDir.copyFrom(this.forward);
  }
}
