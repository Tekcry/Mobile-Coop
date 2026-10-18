/**
 * Level editor camera: fly (free, through walls), walk (eye height, walls block, crouch) and orbit (the controller's
 * builder camera around the dot, orbit.ts). Right mouse drag looks, WASD moves, Q / E go down and up (fly), Shift is
 * fast, C crouches (walk). Mouse or key input in orbit hands over to fly from the same pose. Hub > Settings > Camera
 * (Michael 2026-10-14): Free fly (the default: the pad flies too, fly.ts; the wheel sets the fly speed) or Orbit (the
 * pad drives the orbit camera; the wheel dollies, as before).
 */
import type { FreeCamera } from '../core/babylon';
import { collide } from './geometry';
import type { Obb } from './geometry';
import { OrbitCam, ORBIT, orbitFromPose, blendPose, type CamPose } from './orbit';
import type { OrbitInput, OrbitTune } from './orbit';
import { FLY, flyGoTo, flyPad, flyVel, wheelSpeed } from './fly';
import type { FlyPadIn, FlyPose } from './fly';

export type CamMode = 'fly' | 'walk' | 'orbit';

/** Player numbers (scripts/kestrel/facts.json player.*: stand 1.75, crouch 1.15, radius 0.3). Eye sits 0.12 below the top. */
const STAND = 1.75;
const CROUCH = 1.15;
const EYE_DROP = 0.12;
const RADIUS = 0.3;
const WALK = 1.6; // m/s, a careful walk
const RUN = 4.5;
/** Pad look, radians per second at full stick. */
const LOOK_RATE = 2.4;

export class CameraControls {
  yaw = 0;
  pitch = 0.9;
  mode: CamMode = 'fly';
  readonly orbit = new OrbitCam();
  /** Controller input for the orbit camera, set each frame by padControl.ts. */
  orbitIn: OrbitInput = { panX: 0, panY: 0, orbitX: 0, tiltY: 0, zoom: 0, precision: false };
  crouched = false;
  /** Floor height under the walker (the current level's floor). */
  floor = 0;
  /** Wall boxes that block the walker (rebuilt by the editor when the level or the walls change). */
  blockers: Obb[] = [];
  /** Controller input when walking, set each frame by padControl.ts: left stick move (x right, y forward), right stick look rate (x right, y up). */
  padMove = { x: 0, y: 0 };
  padLook = { x: 0, y: 0 };
  /** Hub > Settings > Camera (padControl copies it in). */
  camSetting: 'fly' | 'orbit' = 'fly';
  /** Free fly: the speed (the wheel steps it), the pad's input this frame (null: none) and its eased velocity. */
  flySpeed: number = FLY.SPEED;
  flyIn: FlyPadIn | null = null;
  readonly flyV = flyVel();
  /** Free fly: the view before the top-down swap (View tap); null when not top-down. */
  flyTop: { yaw: number; pitch: number } | null = null;
  /** Free fly: called when the wheel changes the speed. */
  onFlySpeed: ((speed: number) => void) | null = null;
  /** Controller run while walking (L3 toggles it, as the game's sprint; ED3-pad1). Reset when a walk starts. */
  padRun = false;
  private readonly keys = new Set<string>();
  private looking = false;
  private lastX = 0;
  private lastY = 0;

  constructor(
    private readonly camera: FreeCamera,
    canvas: HTMLCanvasElement,
    /** False while the user types in a panel field. */
    private readonly keysAllowed: () => boolean,
  ) {
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 2) return;
      this.leaveOrbit();
      this.looking = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!this.looking) return;
      this.yaw += (e.clientX - this.lastX) * 0.004;
      this.pitch = Math.max(-1.55, Math.min(1.55, this.pitch + (e.clientY - this.lastY) * 0.004));
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });
    canvas.addEventListener('pointerup', (e) => {
      if (e.button === 2) this.looking = false;
    });
    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        if (this.walking) return;
        this.leaveOrbit();
        if (this.camSetting === 'fly') {
          this.flySpeed = wheelSpeed(this.flySpeed, e.deltaY);
          this.onFlySpeed?.(this.flySpeed);
          return;
        }
        const step = -Math.sign(e.deltaY) * (e.shiftKey ? 12 : 4);
        const f = this.forward();
        this.camera.position.set(this.camera.position.x + f[0] * step, this.camera.position.y + f[1] * step, this.camera.position.z + f[2] * step);
      },
      { passive: false },
    );
    window.addEventListener('keydown', (e) => {
      if (!this.keysAllowed() || e.ctrlKey || e.metaKey || e.altKey) return;
      this.keys.add(e.code);
      if (e.code === 'KeyC' && this.walking) this.crouched = !this.crouched;
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }

  get walking(): boolean {
    return this.mode === 'walk';
  }

  /** Enters the orbit camera from the current pose (decision 2); `hit` is the centre ray on the editing floor. */
  enterOrbit(floorY: number, hit: [number, number] | null): void {
    const p = this.camera.position;
    this.orbit.enter(orbitFromPose([p.x, p.y, p.z], this.yaw, this.pitch, floorY, hit));
    this.mode = 'orbit';
  }

  /** Mouse or keys: the fly camera takes over exactly where the orbit camera is (decision 3). */
  leaveOrbit(): void {
    if (this.mode === 'orbit') this.mode = 'fly';
  }

  /** Free fly, the pad's View tap: ease to straight down, north up; again goes back to the view before. */
  flyTopDown(): boolean {
    const back = this.flyTop;
    const p = this.camera.position;
    const from = this.pose();
    if (back) {
      this.flyTop = null;
      this.blend = { from, to: { ...from, yaw: back.yaw, pitch: back.pitch }, t: 0, dur: 0.3, done: () => undefined };
      return false;
    }
    this.flyTop = { yaw: this.yaw, pitch: this.pitch };
    this.blend = { from, to: { pos: [p.x, p.y, p.z], yaw: 0, pitch: FLY.PITCH, fov: from.fov }, t: 0, dur: 0.3, done: () => undefined };
    return true;
  }

  /** Free fly: ease so the aim lands on (x, y, z) from `dist` metres, keeping the yaw and looking down (go to, Find, problems). */
  flyTo(x: number, y: number, z: number, dist: number): void {
    const from = this.pose();
    const g = flyGoTo({ x: from.pos[0], y: from.pos[1], z: from.pos[2], yaw: this.yaw, pitch: this.pitch }, x, y, z, dist);
    this.mode = 'fly';
    this.flyTop = null;
    this.blend = { from, to: { pos: [g.x, g.y, g.z], yaw: g.yaw, pitch: g.pitch, fov: from.fov }, t: 0, dur: 0.3, done: () => undefined };
  }

  /** Unit view direction [x, y, z]. */
  forward(): [number, number, number] {
    const c = Math.cos(this.pitch);
    return [Math.sin(this.yaw) * c, -Math.sin(this.pitch), Math.cos(this.yaw) * c];
  }

  /** Looks from where the camera is toward a point. */
  lookAt(x: number, y: number, z: number): void {
    const p = this.camera.position;
    const dx = x - p.x;
    const dy = y - p.y;
    const dz = z - p.z;
    this.yaw = Math.atan2(dx, dz);
    this.pitch = Math.atan2(-dy, Math.sqrt(dx * dx + dz * dz));
  }

  /** Puts the camera above a plan point, looking down at it from the south. */
  overlook(x: number, z: number, floor: number, dist = 25): void {
    this.mode = 'fly';
    this.camera.position.set(x, floor + dist * 0.8, z - dist * 0.6);
    this.lookAt(x, floor, z);
  }

  /** Starts walking at a plan point on a floor. */
  walkAt(x: number, z: number, floor: number): void {
    this.mode = 'walk';
    this.floor = floor;
    this.camera.position.set(x, floor + this.eye(), z);
    this.pitch = 0;
  }

  eye(): number {
    return (this.crouched ? CROUCH : STAND) - EYE_DROP;
  }

  /** The walk test's swap (ED2 Part B): the camera eases between the editor's pose and the game camera's; input waits. */
  blend: { from: CamPose; to: CamPose; t: number; dur: number; done: () => void; at?: number } | null = null;

  /** The camera's pose now (position, angles, field of view). */
  pose(): CamPose {
    const p = this.camera.position;
    return { pos: [p.x, p.y, p.z], yaw: this.yaw, pitch: this.pitch, fov: this.camera.fov };
  }

  /** Puts the camera at a pose at once. */
  setPose(c: CamPose): void {
    this.camera.position.set(c.pos[0], c.pos[1], c.pos[2]);
    this.yaw = c.yaw;
    this.pitch = c.pitch;
    this.camera.fov = c.fov;
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  update(dt: number): void {
    const b = this.blend;
    if (b) {
      // wall-clock time, so a slow frame never stretches the swap
      const now = performance.now() / 1000;
      b.t += Math.max(0, now - (b.at ?? now));
      b.at = now;
      this.setPose(blendPose(b.from, b.to, b.dur > 0 ? b.t / b.dur : 1));
      if (b.t >= b.dur) {
        this.blend = null;
        b.done();
      }
      return;
    }
    if (this.mode === 'orbit') return this.updateOrbit(dt);
    if (this.mode === 'fly' && this.flyIn) return this.updateFlyPad(dt, this.flyIn);
    const k = this.keys;
    const fast = k.has('ShiftLeft') || k.has('ShiftRight') || (this.walking && this.padRun);
    const clamp1 = (v: number): number => Math.max(-1, Math.min(1, v));
    const fwd = clamp1((k.has('KeyW') ? 1 : 0) - (k.has('KeyS') ? 1 : 0) + this.padMove.y);
    const side = clamp1((k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0) + this.padMove.x);
    // right stick: a turn rate, squared for fine aim near the centre
    const lx = this.padLook.x;
    const ly = this.padLook.y;
    this.yaw += Math.sign(lx) * lx * lx * LOOK_RATE * dt;
    this.pitch = Math.max(-1.55, Math.min(1.55, this.pitch - Math.sign(ly) * ly * ly * LOOK_RATE * 0.7 * dt));
    const p = this.camera.position;
    if (this.walking) {
      const v = (fast && !this.crouched ? RUN : WALK) * dt;
      const sx = Math.sin(this.yaw);
      const cz = Math.cos(this.yaw);
      const nx = p.x + (sx * fwd + cz * side) * v;
      const nz = p.z + (cz * fwd - sx * side) * v;
      const [x, z] = collide(nx, nz, RADIUS, this.blockers);
      p.set(x, this.floor + this.eye(), z);
    } else {
      const v = this.flySpeed * (fast ? FLY.FAST : 1) * dt;
      const f = this.forward();
      const rx = Math.cos(this.yaw);
      const rz = -Math.sin(this.yaw);
      const up = clamp1((k.has('KeyE') ? 1 : 0) - (k.has('KeyQ') ? 1 : 0));
      p.set(p.x + (f[0] * fwd + rx * side) * v, p.y + (f[1] * fwd + up) * v, p.z + (f[2] * fwd + rz * side) * v);
    }
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  /** Pad tune (padControl copies Settings in: dead zone, smoothing, pan and orbit speed) and invert tilt. */
  flyTune: OrbitTune & { invert: boolean } = { dead: ORBIT.DEAD, smoothing: 'medium', pan: 1, orbit: 1, invert: false };

  /** Free fly on the pad (fly.ts): the eased sticks and triggers move and turn the camera; keys still add W A S D. */
  private updateFlyPad(dt: number, i: FlyPadIn): void {
    const p = this.camera.position;
    const pose: FlyPose = { x: p.x, y: p.y, z: p.z, yaw: this.yaw, pitch: this.pitch };
    if (i.lookX || i.lookY) this.flyTop = null;
    flyPad(pose, this.flyV, i, dt, this.flyTune, this.flySpeed, this.flyTune.invert);
    p.set(pose.x, pose.y, pose.z);
    this.yaw = pose.yaw;
    this.pitch = pose.pitch;
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  private updateOrbit(dt: number): void {
    const o = this.orbit;
    o.input(this.orbitIn, dt);
    o.update(dt);
    const [x, y, z] = o.position();
    this.camera.position.set(x, y, z);
    this.yaw = o.s.yaw;
    this.pitch = o.s.pitch;
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }
}
