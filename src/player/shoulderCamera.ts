import { Camera, FreeCamera, PhysicsRaycastResult, PhysicsShapeSphere, Quaternion, ShapeCastResult, Vector3, type HavokPlugin, type PhysicsEngine, type Scene } from '../core/babylon';
import { G } from '../physics/groups';
import { ATTACH_FRAMING, attachFraming, CAMERA, framing, peekEase, WALL_CAMERA, type AttachCamera, type AttachFraming } from '../config/camera';
import type { CharacterRig } from './characterRig';
import { Spring } from '../anim/rigMath';
import { hyp2 } from '../core/mathx';
import { DOOR_PEEK, clampPeekYaw } from '../world/doorPeek';
import { vfovFor } from '../core/display';
import { castStop, easeRate, lowFraming, lowSwing, lowWeight, nearPlane, pivotFraction } from './cameraBounds';
import { probeOpen } from '../world/camSpaces';
import { TUNE_CAM_CUR, tuneCamStep } from '../anim/tune';
import type { FreeViewCore } from './freeView';

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


/**
 * Chaos Theory style third-person camera (CT prototype A2.1). Gameplay sets the look angles (`yaw`, `pitch`); the rendered view
 * is exactly where they point (no look lag, no drift). The position is RIGID: the pivot is the character's head (capsule height,
 * G38) on its own axis, the camera a fixed offset from it (boom 1.8 m tight, 2.8 m open (G3), 0.15 m to the shoulder side), aimed at the pivot. There is
 * no follow spring, look-ahead, pace boom, bob, swing toward travel or auto recentre: the camera moves only when the player
 * moves the stick or mouse. Only the feet's HEIGHT is low-passed (stairs). Aiming moves the camera in to the firing shoulder
 * over about 0.6 s (linear in, fast out) with NO zoom (G29); the shoulder swap works only while aiming and arcs back through a
 * pulled-back mid-point (G17). Walls (CAM): sphere casts run head -> pivot -> shoulder point -> camera, so neither the pivot, the
 * shoulder point nor the camera ever sits behind a surface, and the camera keeps its near plane clear of it; the boom pulls in
 * at once and eases back out. Low spaces: probes up and down from the head lower the shoulder point and shorten the boom
 * between floor and ceiling. Updated every render frame from interpolated targets.
 */

export class ShoulderCamera {
  readonly camera: FreeCamera;
  /** Look targets (gameplay). */
  yaw = 0;
  pitch = CAMERA.startPitch;
  /** Rendered view angles (follow the targets with slight inertia). */
  viewYaw = Number.NaN;
  viewPitch = 0;
  /** Rendered view angular speed (rad/s), for the debug graph and smoothness tests. */
  angVel = 0;
  /** Target shoulder: 1 = right, -1 = left. */
  shoulder: 1 | -1 = 1;
  /** 0 hip .. 1 ADS: linear in over `adsInTime`, fast-out (exponential) on release. */
  ads = 0;
  adsTarget = 0;
  /** Seconds to blend in (playerWeapons sets it from the weapon draw time, a little faster so the camera leads the gun). */
  adsInTime: number = CAMERA.adsInTime;
  /** FOV multiplier while fully ADS: 1 (no zoom, G29); only a marksman scope sets it lower (playerWeapons). */
  adsZoom = 1;
  baseFovDeg = CAMERA.fov;
  /** Ultrawide cap (deg): Hor+ up to this horizontal angle, then Vert- (`video.maxFov`). */
  maxFovDeg = 120;
  /** State nudges set by the player each frame. */
  crouch = 0;
  /** Attached traversal framing preset (null = none). */
  attach: AttachCamera | null = null;
  /** (G3) The map's camera space at the feet (`world/camSpaces.ts`): 1 open, 0 tight, NaN = no data (the probes decide). */
  space = Number.NaN;
  /** (G3) The eased open-space weight (0 tight .. 1 open) the explore boom follows. */
  openW = 0;
  private sOpen = new Spring(Number.NaN);
  /** (G3) Passing through an open doorway (0 / 1, set by the game each step) and its eased weight. */
  doorPass = 0;
  private passW = 0;
  /** (G3) This aim started on a wall (or just off it): the faster `adsInWall` blend. */
  private adsWall = false;
  /** (G3) The probe fallback said open last frame (its hysteresis). */
  private probeWasOpen = false;
  /** (step 12; F4) Back to a wall at an edge: how far the player looks / pushes past the edge (0..1, the camera's slide
   *  toward the open side) and the direction past the edge (unit XZ, from the edge, never from the camera). */
  wallPeek = 0;
  wallEdgeX = 0;
  wallEdgeZ = 0;
  /** (21w) Seconds left of the slower wall shoulder-swap rate. */
  private wallSideT = 0;
  /** (locomotion step 13) Door peek: the view at the crack (0..1, the core's), the eye there (world) and the look's
   *  centre yaw (the look stays within +-35 deg of it). Local only, never sent. */
  doorPeek = 0;
  readonly doorEye = new Vector3();
  doorYaw = 0;
  private doorW = 0;
  private readonly doorPt = new Vector3();
  /** Eased peek / lean amounts (capped rate) and the edge direction they swing toward. */
  private peekW = 0;
  private edgeX = 0;
  private edgeZ = 0;
  /** Body facing while attached: the orbit stays within the preset's cone around it. */
  attachYaw = 0;
  private attachPreset: AttachFraming | null = null;
  private sAttach = new Spring(0);
  lean = 0;
  private sSide = new Spring(1);
  private sLean = new Spring();
  private sFootY = new Spring(Number.NaN);
  /** (G3) NaN until the first frame, which starts at that frame's boom (an open-space spawn starts at 2.8 m, not easing out). */
  private sBoom = new Spring(Number.NaN);
  private headHidden = false;
  private allHidden = false;
  private recoilPitch = 0;
  private recoilYaw = 0;
  private trauma = 0;
  private t = 0;
  readonly pivot = new Vector3();
  readonly forward = new Vector3(0, 0, 1);
  /** (tuner-camera) The game's view position this frame (the tuned follow camera, never the free view): what gameplay
   *  reads (aim ray, ping, the jammer pick, the flash white-out, the crosshair's target). Written here, and by whatever
   *  else places the game view after this update: the sticky-cam remote view (`GadgetSystem.frameUpdate`) and photo
   *  mode. Equal to `camera.position` except while the tuner's free view is on. */
  readonly gamePos = new Vector3();
  /** (tuner-camera) The tuner's free view (dev): when on, the rendered camera is placed by it after the game view. */
  free: FreeViewCore | null = null;
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

  /** Clear distance (m) along the horizontal direction (dx, dz) from `p`, up to `len` (the first hit, else `len`). */
  private rayClear(eng: PhysicsEngine, p: Vector3, dx: number, dz: number, len: number): number {
    this.probe.set(p.x + dx * len, p.y, p.z + dz * len);
    this.rr.reset();
    eng.raycastToRef(p, this.probe, this.rr, ShoulderCamera.Q);
    return this.rr.hasHit ? hyp2(this.rr.hitPoint.x - p.x, this.rr.hitPoint.z - p.z) : len;
  }

  swapShoulder(): void {
    this.shoulder = this.shoulder === 1 ? -1 : 1;
  }

  /** (F1, playtest 2) Holstering resets the shoulder to the right: the follow camera only ever sits over the right
   *  shoulder, and the next draw is on the right. */
  resetShoulder(): void {
    this.shoulder = 1;
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

  /** A hard contact (slamming into cover): a short shake (strength 0..1). No dip: the follow is rigid. */
  impact(strength: number): void {
    const s = Math.max(0, Math.min(1, strength));
    this.trauma = Math.min(1, this.trauma + 0.16 * s);
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
    // (tuner-camera) the camera state's tuned values (identity at default: every use below is + 0 or x 1)
    tuneCamStep(this.attach, this.wallPeek, this.adsTarget, crouch, dt);
    const K = TUNE_CAM_CUR;
    if (dt <= 0) dt = 1e-4;
    // (step 13) at a door's crack the look stays within its range
    if (this.doorPeek > 0) this.yaw = clampPeekYaw(this.yaw, this.doorYaw);
    this.doorW = this.doorPeek;
    this.wallSideT = this.attach === 'wall' ? 0.8 : Math.max(0, this.wallSideT - dt);
    // aim blend: linear in over `adsInTime` (camera leads the weapon), fast-out (about half way in 0.1 s) on release.
    // (G3, AUDIT-CAMERA row 13) an aim that starts on the wall or just off it dollies in over `adsInWall` at most
    if (this.ads <= 0 && this.adsTarget > 0) this.adsWall = this.wallSideT > 0;
    if (this.adsTarget > this.ads) {
      const tIn = (this.adsWall ? Math.min(this.adsInTime, T.adsInWall) : this.adsInTime) * K.camBlendMul;
      this.ads = Math.min(this.adsTarget, this.ads + dt / Math.max(0.05, tIn));
    } else if (this.adsTarget < this.ads) {
      this.ads += (this.adsTarget - this.ads) * (1 - Math.exp(-(T.adsOutRate / K.camBlendMul) * dt));
      if (this.ads - this.adsTarget < 2e-3) this.ads = this.adsTarget;
    }
    // shoulder side: only the aim's swap changes it (G17) and holstering resets it to the right (F1). (F1) The wall's
    // open side no longer sets it: CT aims off the wall (drawing leaves it), so the holstered wall camera stays over the
    // right shoulder, and at an edge the peek slides the camera toward the open side instead (F4, below)
    const side = this.sSide.step(this.shoulder, this.wallSideT > 0 ? WALL_CAMERA.side : T.swapRate, dt);
    const leanS = this.sLean.step(this.lean, 8, dt);
    const recover = Math.min(1, dt * 9);
    this.recoilPitch -= this.recoilPitch * recover;
    this.recoilYaw -= this.recoilYaw * recover;
    this.trauma = Math.max(0, this.trauma - dt * 1.6);

    // (G3, AUDIT-CAMERA rows 1 and 7) open or tight space: the map's camera spaces, else probes back and to the sides
    // from the head (no physics: tight). The weight eases on its own spring, so a doorway is a glide, not a cut
    const eng = this.scene.getPhysicsEngine() as PhysicsEngine | null;
    let openT = this.space;
    if (!(openT === openT)) {
      openT = 0;
      if (eng) {
        const hy = feet.y + T.pivotStand + (T.pivotCrouch - T.pivotStand) * crouch;
        const h = this.head.set(feet.x, hy, feet.z);
        const sx = Math.sin(this.yaw);
        const cz = Math.cos(this.yaw);
        const back = this.rayClear(eng, h, -sx, -cz, T.openBack);
        const left = this.rayClear(eng, h, -cz, sx, T.openSide);
        const right = this.rayClear(eng, h, cz, -sx, T.openSide);
        openT = probeOpen(back, left, right, T.openBack, T.openSide, this.probeWasOpen);
        this.probeWasOpen = openT > 0;
      }
    }
    if (!(this.sOpen.x === this.sOpen.x)) this.sOpen.reset(openT);
    this.openW = Math.max(0, Math.min(1, this.sOpen.step(openT, (openT < this.sOpen.x ? T.toTight : T.toOpen) / K.camBlendMul, dt)));
    const fr = framing(this.ads, crouch, CAMERA, this.openW);
    // attached traversal (ladder, hang, duct...): its framing preset blends in and back out
    if (this.attach) this.attachPreset = ATTACH_FRAMING[this.attach];
    // attached: the free orbit stays within the state's cone around the body's facing (a soft edge)
    if (this.attach && this.attachPreset && this.attachPreset.cone < Math.PI) {
      const cone = this.attachPreset.cone;
      let d = this.yaw - this.attachYaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      if (Math.abs(d) > cone) this.yaw = this.attachYaw + Math.sign(d) * (cone + (Math.abs(d) - cone) * Math.exp(-dt / 0.06));
    }
    const attachW = this.sAttach.step(this.attach ? 1 : 0, 4 / Math.max(0.05, (this.attachPreset?.blend ?? 0.25) * K.camBlendMul), dt);
    if (this.attachPreset && attachW > 1e-3) attachFraming(fr, this.attachPreset, Math.min(1, attachW));
    // (tuner-camera) the state's distance, shoulder offset and look-at height
    fr.boom += K.camBoomAdd;
    fr.shoulder += K.camSideAdd;
    fr.pivot += K.camPivotAdd;
    // rigid follow: XZ is exactly the character (no spring, no lag); only the feet's height is low-passed (stairs)
    if (Number.isNaN(this.sFootY.x) || Math.abs(feet.y - this.sFootY.x) > 3) this.sFootY.reset(feet.y);
    const footY = this.sFootY.step(feet.y, T.stairRate * K.camFollowMul, dt);
    // (step 12) the wall peek / lean-out swing: the pivot out toward the edge at a capped rate (the pivot safety below
    // keeps it on the head's side of any wall)
    const wp = WALL_CAMERA.peek;
    const onWall = this.attach === 'wall';
    if (this.wallEdgeX !== 0 || this.wallEdgeZ !== 0) {
      this.edgeX = this.wallEdgeX;
      this.edgeZ = this.wallEdgeZ;
    }
    const pT = onWall ? this.wallPeek : 0;
    // (G3) in over `blend`, back over `out` (CT 0.2 s / 0.17 s)
    const pRate = dt / ((pT > this.peekW ? wp.blend : wp.out) * K.camBlendMul);
    this.peekW += Math.max(-pRate, Math.min(pRate, pT - this.peekW));
    const pe = peekEase(this.peekW);
    const swing = wp.offset * pe;
    this.pivot.set(feet.x + this.edgeX * swing, footY + fr.pivot, feet.z + this.edgeZ * swing);
    // the head: the pivot height on the operator's own axis, always in the operator's space
    const head = this.head.set(feet.x, this.pivot.y, feet.z);
    let lowDyT = 0;
    if (eng) {
      this.castShape = this.sphere(this.castShape, T.castRadius);
      this.pivotShape = this.sphere(this.pivotShape, T.pivotRadius);
      // pivot safety: a peeking pivot is pulled back to the head side of any wall between them
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
    // the input sources, so the view is exactly where the player points it (no drift)
    if (Number.isNaN(this.viewYaw)) this.snap();
    const prevYaw = this.viewYaw;
    const prevPitch = this.viewPitch;
    this.viewYaw = this.aimYaw;
    this.viewPitch = this.aimPitch;
    // (step 12) peeking: the view turns toward the edge, at most `WALL_CAMERA.peek.yaw` (the aim is untouched)
    let peekYaw = 0;
    if (this.peekW > 0) {
      const d = Math.atan2(Math.sin(Math.atan2(this.edgeX, this.edgeZ) - this.viewYaw), Math.cos(Math.atan2(this.edgeX, this.edgeZ) - this.viewYaw));
      const pe = peekEase(this.peekW);
      peekYaw = Math.sign(d) * Math.min(Math.abs(d), WALL_CAMERA.peek.yaw) * pe;
    }
    const yaw = this.viewYaw + peekYaw;
    const pitch = this.viewPitch;
    const dYaw = yaw - prevYaw;
    this.angVel = hyp2(dYaw, pitch - prevPitch) / dt;
    const cp = Math.cos(pitch);
    this.forward.set(Math.sin(yaw) * cp, Math.sin(pitch), Math.cos(yaw) * cp);
    const rightX = Math.cos(yaw);
    const rightZ = -Math.sin(yaw);

    // boom: framing, and the shoulder swap arcs back through a pulled-back mid-point (side passes through 0)
    const arc = T.swapArc * (1 - side * side);
    // (F4) peeking past an edge the boom comes in toward CT's close side framing (1.0-1.5 m measured)
    const boomPk = fr.boom + arc + (Math.min(fr.boom, WALL_CAMERA.peek.boom + K.camBoomAdd) - fr.boom) * pe;
    // (G3, AUDIT-EXTRA-NEW row 19) through an open door the boom pushes in behind the shoulder, then returns
    const pRateD = dt / (this.doorPass > this.passW ? T.doorPassIn : T.doorPassOut);
    this.passW += Math.max(-pRateD, Math.min(pRateD, this.doorPass - this.passW));
    const boomFr = Math.max(T.minBoom, boomPk + (Math.min(boomPk, T.doorPassBoom) - boomPk) * peekEase(this.passW));
    // low space: a shorter boom and the shoulder point between floor and ceiling (eased in fast, out slowly)
    const low = this.lowW;
    const lowDy = this.sLowDy.step(lowDyT, easeRate(lowDyT < this.sLowDy.x, T.lowIn, T.lowOut), dt);
    const boomTarget = boomFr + (Math.min(boomFr, T.lowBoom) - boomFr) * low;
    // (F4) peeking, the shoulder offset turns toward the edge's open side: its share along the camera's right is the edge
    // direction . right (continuous, so it never flips as the camera swings; 0 when looking straight past the edge)
    // (G3) peeking, the offset grows to `peek.shoulder` (the wall preset alone is now a near-centred 0.15 m)
    const shoulder = fr.shoulder * side * (1 - pe) + Math.max(fr.shoulder, wp.shoulder + K.camSideAdd) * pe * (this.edgeX * rightX + this.edgeZ * rightZ) + leanS * T.leanShift;
    const shoulderPt = this.shoulderPt.set(this.pivot.x + rightX * shoulder, this.pivot.y + T.height + K.camHeightAdd + Math.min(0, lowDy), this.pivot.z + rightZ * shoulder);
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
    if (eng && this.castShape) dist = castStop(this.cast(eng, this.castShape, T.castRadius, shoulderPt, desired), len, Math.max(0, T.castPad + K.camPadAdd));
    // pull in fast, ease back out slowly; never past the cast's stop (never behind a wall)
    if (!(this.sBoom.x === this.sBoom.x)) this.sBoom.reset(dist);
    const boomNow = this.sBoom.step(dist, easeRate(dist < this.sBoom.x, T.boomIn * K.camBoomRateMul, T.boomOut * K.camBoomRateMul), dt);
    this.boomActual = Math.min(boomNow, dist);
    const pos = v.scaleToRef(this.boomActual / len, this.camPos).addInPlace(shoulderPt);
    this.camera.minZ = nearPlane(this.boomActual);
    // (step 13) door peek: the eye goes to the crack (cast from the head, so never inside the leaf or the jamb)
    const dw = this.doorW;
    if (dw > 0) {
      const e = dw * dw * (3 - 2 * dw);
      const eye = this.doorPt.copyFrom(this.doorEye);
      if (eng && this.pivotShape) {
        const f = pivotFraction(this.cast(eng, this.pivotShape, T.pivotRadius, head, eye), Vector3.Distance(head, eye), T.castSkin);
        if (f < 1) Vector3.LerpToRef(head, eye, f, eye);
      }
      Vector3.LerpToRef(pos, eye, e, pos);
      this.camera.minZ += (0.02 - this.camera.minZ) * e;
    }
    this.camera.position.copyFrom(pos);
    this.camera.rotation.set(-pitch + Math.sin(this.t * 29.1) * 0.02 * s, yaw, Math.sin(this.t * 23.3) * 0.03 * s);
    // no aim zoom (G29): `adsZoom` is 1 except for a marksman scope
    const zoom = 1 + (this.adsZoom * K.camZoomMul - 1) * this.ads;
    this.camera.fov = this.vfov(this.baseFovDeg + K.camFovAdd) * zoom * (1 + (DOOR_PEEK.fovMul - 1) * (dw * dw * (3 - 2 * dw)));
    this.gamePos.copyFrom(pos);
    // (tuner-camera) the free view (dev) renders from its own place; the game view above stays what gameplay reads
    const fv = this.free;
    if (fv && fv.mode !== 'off') {
      fv.place(feet.x, feet.y, feet.z);
      this.camera.position.set(fv.x, fv.y, fv.z);
      this.camera.rotation.set(-fv.pitch, fv.yaw, 0);
      this.camera.minZ = CAMERA.near;
    }
  }

  /** (tuner-camera) The free view is placing the rendered camera. */
  get freeOn(): boolean {
    return !!this.free && this.free.mode !== 'off';
  }

  /** The vertical FOV for a horizontal angle at 16:9 on this screen (Hor+, capped at `maxFovDeg`). */
  vfov(hDeg: number): number {
    return vfovFor(hDeg, this.scene.getEngine().getAspectRatio(this.camera), this.maxFovDeg);
  }

  /**
   * Tight spaces: rather than swinging the camera away, hide the parts of the body it gets too close
   * to (head first, then everything). Only touches visibility when a threshold is crossed.
   */
  /** (operators 11e) The head is shown (the fade's head hide is off): Wren's figure follows it. */
  get headVisible(): boolean {
    return !this.headHidden;
  }

  applyBodyFade(rig: CharacterRig): void {
    rig.headNode.computeWorldMatrix(true);
    const dHead = Vector3.Distance(this.camera.position, rig.headNode.getAbsolutePosition());
    // (tuner-camera) the free view shows the whole body
    const fv = this.freeOn;
    const hideHead = !fv && dHead < CAMERA.hideHead;
    const hideAll = !fv && this.boomActual < CAMERA.hideAll;
    if (hideAll !== this.allHidden) {
      this.allHidden = hideAll;
      rig.root.setEnabled(!hideAll);
    }
    if (hideHead !== this.headHidden) {
      this.headHidden = hideHead;
      rig.setHeadVisible(!hideHead);
    }
  }

  /** Ray from the (game) camera through the screen centre: never the free view. */
  aimRay(outOrigin: Vector3, outDir: Vector3): void {
    outOrigin.copyFrom(this.gamePos);
    outDir.copyFrom(this.forward);
  }
}
