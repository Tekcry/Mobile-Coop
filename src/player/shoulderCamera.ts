import { Camera, FreeCamera, PhysicsRaycastResult, PhysicsShapeSphere, Quaternion, ShapeCastResult, Vector3, type HavokPlugin, type PhysicsEngine, type Scene } from '../core/babylon';
import { G } from '../physics/groups';
import { MOVEMENT } from '../config/movement';
import { ATTACH_FRAMING, attachFraming, CAMERA, framing, type AttachCamera, type AttachFraming } from '../config/camera';
import type { CharacterRig } from './characterRig';
import { Spring } from '../anim/rigMath';
import { hyp2 } from '../core/mathx';
import { vfovFor } from '../core/display';
import { castStop, easeRate, lowFraming, lowSwing, lowWeight, nearPlane, pivotFraction } from './cameraBounds';

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
 * give it weight. Walls (CAM): sphere casts run head -> pivot -> shoulder point -> camera, so neither the pivot, the
 * shoulder point nor the camera ever sits behind a surface, and the camera keeps its near plane clear of it; the boom pulls
 * in at once and eases back out. Low spaces: probes up and down from the head lower the shoulder point and shorten the boom
 * between floor and ceiling, easing back when the space opens. In the open none of this changes the framing.
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
  /** Ultrawide cap (deg): Hor+ up to this horizontal angle, then Vert- (`video.maxFov`). */
  maxFovDeg = 120;
  /** State nudges set by the player each frame. */
  crouch = 0;
  /** Attached traversal framing preset (null = none). */
  attach: AttachCamera | null = null;
  /** Body facing while attached: the orbit stays within the preset's cone around it. */
  attachYaw = 0;
  private attachPreset: AttachFraming | null = null;
  private sAttach = new Spring(0);
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
  private head = new Vector3();
  private probe = new Vector3();
  private castVec = new Vector3();
  private static readonly Q = { membership: G.PLAYER, collideWith: G.STATIC };
  /** Sphere casts (the camera's own shapes, G.PLAYER against G.STATIC like its rays), built on first use. */
  private castShape: PhysicsShapeSphere | null = null;
  private pivotShape: PhysicsShapeSphere | null = null;
  private castHit = new ShapeCastResult();
  private castHitOther = new ShapeCastResult();
  private castQuery = { shape: null as unknown as PhysicsShapeSphere, rotation: Quaternion.Identity(), startPosition: new Vector3(), endPosition: new Vector3(), shouldHitTriggers: false };
  /** Low space: weight 0..1 (eased) and the clear height over the head last frame (m). */
  private sLow = new Spring();
  private sLowDy = new Spring();
  lowW = 0;
  clearHeight = Number.POSITIVE_INFINITY;
  private lowOut = { boom: 0, shoulderY: 0 };

  constructor(private scene: Scene) {
    this.camera = new FreeCamera('ots', new Vector3(0, 2, -4), scene);
    this.camera.minZ = CAMERA.near;
    this.camera.maxZ = 220;
    // Hor+: the vertical FOV is fixed from the horizontal setting at 16:9, so tall framing (head to
    // hips) holds on any aspect and wider screens see more at the sides, up to `maxFovDeg` (then Vert-)
    this.camera.fovMode = Camera.FOVMODE_VERTICAL_FIXED;
    this.camera.inputs.clear();
    // the up vector follows the full rotation every frame; otherwise Babylon rebuilds it (pitch included)
    // only when rotation.z changes, so the frame a shake's roll ends leaves the horizon tilted by that
    // frame's pitch for good (a lasting tilt after a hard landing, a hit or an explosion)
    this.camera.updateUpVectorFromRotation = true;
    scene.activeCamera = this.camera;
    scene.onDisposeObservable.addOnce(() => {
      this.castShape?.dispose();
      this.pivotShape?.dispose();
      this.castShape = this.pivotShape = null;
    });
  }

  /** A sphere of `radius` for casts, rebuilt if the radius was retuned. */
  private sphere(cur: PhysicsShapeSphere | null, radius: number): PhysicsShapeSphere {
    if (cur && this.radii.get(cur) === radius) return cur;
    cur?.dispose();
    const s = new PhysicsShapeSphere(Vector3.Zero(), radius, this.scene);
    s.filterMembershipMask = G.PLAYER;
    s.filterCollideMask = G.STATIC;
    this.radii.set(s, radius);
    return s;
  }
  private radii = new WeakMap<PhysicsShapeSphere, number>();

  /**
   * Fraction (0..1) of `from` -> `to` a sphere of `radius` travels before it touches level geometry (1 = clear). A start that
   * already overlaps a surface (a tight duct) falls back to the ray, so the chain never collapses onto its start.
   */
  private cast(eng: PhysicsEngine, shape: PhysicsShapeSphere, radius: number, from: Vector3, to: Vector3): number {
    const plugin = eng.getPhysicsPlugin() as HavokPlugin;
    if (typeof plugin.shapeCast === 'function') {
      const q = this.castQuery;
      q.shape = shape;
      q.startPosition.copyFrom(from);
      q.endPosition.copyFrom(to);
      plugin.shapeCast(q, this.castHitOther, this.castHit);
      if (!this.castHit.hasHit) return 1;
      if (this.castHit.hitFraction > 1e-4) return this.castHit.hitFraction;
    }
    this.rr.reset();
    eng.raycastToRef(from, to, this.rr, ShoulderCamera.Q);
    if (!this.rr.hasHit) return 1;
    const len = Vector3.Distance(from, to);
    return len > 1e-6 ? Math.max(0, Vector3.Distance(from, this.rr.hitPoint) - radius) / len : 0;
  }

  /** Height (m) of the first surface straight up (`dir` 1) or down (-1) from `p` within `len`, else p.y + dir * len. */
  private probeY(eng: PhysicsEngine, p: Vector3, dir: number, len: number): number {
    this.probe.set(p.x, p.y + dir * len, p.z);
    this.rr.reset();
    eng.raycastToRef(p, this.probe, this.rr, ShoulderCamera.Q);
    return this.rr.hasHit ? this.rr.hitPoint.y : this.probe.y;
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

  /** Settings > Accessibility: camera shake strength (0 .. 1). */
  shakeMul = 1;

  shake(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount * this.shakeMul);
  }

  /** A hard contact (slamming into cover): a sharp dip of the view and a short shake (strength 0..1). */
  impact(strength: number): void {
    const s = Math.max(0, Math.min(1, strength));
    this.sBob.kick(-0.7 * s);
    this.trauma = Math.min(1, this.trauma + 0.16 * s);
  }

  /** A footstep landed (heel strike): a tiny damped dip of the view (strength ~0..1). */
  footstep(strength = 1): void {
    this.sBob.kick(-0.05 * Math.min(1.5, strength));
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
    // attached traversal (ladder, hang, duct...): its framing preset blends in and back out
    if (this.attach) this.attachPreset = ATTACH_FRAMING[this.attach];
    // attached: the free orbit stays within the state's cone around the body's facing (a soft edge)
    if (this.attach && this.attachPreset && this.attachPreset.cone < Math.PI) {
      const cone = this.attachPreset.cone;
      let d = this.yaw - this.attachYaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      if (Math.abs(d) > cone) this.yaw = this.attachYaw + Math.sign(d) * (cone + (Math.abs(d) - cone) * Math.exp(-dt / 0.06));
    }
    const attachW = this.sAttach.step(this.attach ? 1 : 0, 4 / Math.max(0.05, this.attachPreset?.blend ?? 0.25), dt);
    if (this.attachPreset && attachW > 1e-3) attachFraming(fr, this.attachPreset, Math.min(1, attachW));
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
    // the head: the pivot height on the operator's own axis (no follow lag, no look-ahead), always in the operator's space
    const head = this.head.set(feet.x, this.pivot.y, feet.z);
    const eng = this.scene.getPhysicsEngine() as PhysicsEngine | null;
    let lowDyT = 0;
    if (eng) {
      this.castShape = this.sphere(this.castShape, T.castRadius);
      this.pivotShape = this.sphere(this.pivotShape, T.pivotRadius);
      // pivot safety: the lagged, looked-ahead pivot is pulled back to the head side of any wall between them
      const f = pivotFraction(this.cast(eng, this.pivotShape, T.pivotRadius, head, this.pivot), Vector3.Distance(head, this.pivot), T.castSkin);
      if (f < 1) Vector3.LerpToRef(head, this.pivot, f, this.pivot);
      // low space: clear height over the head, floor to ceiling
      const ceilY = this.probeY(eng, head, 1, T.probeUp);
      const floorY = this.probeY(eng, head, -1, T.probeDown);
      this.clearHeight = ceilY - floorY;
      const wT = lowWeight(this.clearHeight);
      this.lowW = Math.max(0, Math.min(1, this.sLow.step(wT, easeRate(wT > this.sLow.x, T.lowIn, T.lowOut), dt)));
      if (wT > 0) lowDyT = Math.min(0, lowFraming(0, this.pivot.y + T.height, floorY, ceilY, 1, this.lowOut).shoulderY - (this.pivot.y + T.height));
    } else this.lowW = 0;

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

    // boom: framing, cover pull-back (show the room), and the shoulder swap arcs back behind the head
    const arc = 0.2 * (1 - side * side);
    // pace: a sneak frames a touch tighter, a jog / sprint pulls back a little (sprint adds the dash framing)
    const paceS = this.sPace.step(Math.min(1, this.pace / 2.8), 4, dt);
    const boomFr = Math.max(T.minBoom, fr.boom + coverS * T.coverBoom * (1 - this.ads) + arc + (paceS - 0.45) * 0.16 * (1 - this.ads));
    // low space: a shorter boom and the shoulder point between floor and ceiling (eased in fast, out slowly)
    const low = this.lowW;
    const lowDy = this.sLowDy.step(lowDyT, easeRate(lowDyT < this.sLowDy.x, T.lowIn, T.lowOut), dt);
    const boomTarget = boomFr + (Math.min(boomFr, T.lowBoom) - boomFr) * low;
    const shoulder = fr.shoulder * side + leanS * T.leanShift;
    const shoulderPt = this.shoulderPt.set(this.pivot.x + rightX * shoulder, this.pivot.y + T.height + Math.min(0, lowDy), this.pivot.z + rightZ * shoulder);
    if (eng && this.pivotShape) {
      // the shoulder point stays on the pivot's side of a wall (tight corridors, leaning past a corner)
      const f = pivotFraction(this.cast(eng, this.pivotShape, T.pivotRadius, this.pivot, shoulderPt), Vector3.Distance(this.pivot, shoulderPt), T.castSkin);
      if (f < 1) Vector3.LerpToRef(this.pivot, shoulderPt, f, shoulderPt);
    }
    // the boom: back along the view (its vertical swing flattened in a low space), shake included so the cast covers it
    const v = this.castVec.set(-this.forward.x, -this.forward.y * lowSwing(low), -this.forward.z);
    v.scaleInPlace(boomTarget / Math.max(1e-6, v.length()));
    const s = this.trauma * this.trauma;
    if (s > 0) {
      v.x += Math.sin(this.t * 37.3) * 0.06 * s;
      v.y += Math.sin(this.t * 41.7 + 1.3) * 0.06 * s;
    }
    const len = Math.max(1e-6, v.length());
    const desired = this.desired.copyFrom(shoulderPt).addInPlace(v);
    let dist = len;
    if (eng && this.castShape) dist = castStop(this.cast(eng, this.castShape, T.castRadius, shoulderPt, desired), len, T.castPad);
    // pull in fast, ease back out slowly; never past the cast's stop (never behind a wall)
    const boomNow = this.sBoom.step(dist, easeRate(dist < this.sBoom.x, T.boomIn, T.boomOut), dt);
    this.boomActual = Math.min(boomNow, dist);
    const pos = v.scaleToRef(this.boomActual / len, this.camPos).addInPlace(shoulderPt);
    this.camera.minZ = nearPlane(this.boomActual);
    this.camera.position.copyFrom(pos);
    this.camera.rotation.set(-pitch + Math.sin(this.t * 29.1) * 0.02 * s, yaw, Math.sin(this.t * 23.3) * 0.03 * s);
    const zoom = 1 + (this.adsZoom - 1) * this.ads;
    this.camera.fov = this.vfov(this.baseFovDeg + dashS * 4) * zoom;
  }

  /** The vertical FOV for a horizontal angle at 16:9 on this screen (Hor+, capped at `maxFovDeg`). */
  vfov(hDeg: number): number {
    return vfovFor(hDeg, this.scene.getEngine().getAspectRatio(this.camera), this.maxFovDeg);
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
      rig.setHeadVisible(!hideHead);
    }
  }

  /** Ray from the camera through the screen centre. */
  aimRay(outOrigin: Vector3, outDir: Vector3): void {
    outOrigin.copyFrom(this.camera.position);
    outDir.copyFrom(this.forward);
  }
}
