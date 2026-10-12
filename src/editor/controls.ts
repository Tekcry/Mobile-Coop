/**
 * Level editor camera: fly (free, through walls), walk (eye height, walls block, crouch) and orbit (the controller's
 * builder camera around the dot, orbit.ts). Right mouse drag looks, WASD moves, Q / E go down and up (fly), Shift is
 * fast, the wheel dollies, C crouches (walk). Mouse or key input in orbit hands over to fly from the same pose.
 */
import type { FreeCamera } from '../core/babylon';
import { collide } from './geometry';
import type { Obb } from './geometry';
import { OrbitCam, orbitFromPose } from './orbit';
import type { OrbitInput } from './orbit';

export type CamMode = 'fly' | 'walk' | 'orbit';

/** Player numbers (scripts/kestrel/facts.json player.*: stand 1.75, crouch 1.15, radius 0.3). Eye sits 0.12 below the top. */
const STAND = 1.75;
const CROUCH = 1.15;
const EYE_DROP = 0.12;
const RADIUS = 0.3;
const WALK = 1.6; // m/s, a careful walk
const RUN = 4.5;
const FLY = 10;
const FLY_FAST = 35;
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

  update(dt: number): void {
    if (this.mode === 'orbit') return this.updateOrbit(dt);
    const k = this.keys;
    const fast = k.has('ShiftLeft') || k.has('ShiftRight');
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
      const v = (fast ? FLY_FAST : FLY) * dt;
      const f = this.forward();
      const rx = Math.cos(this.yaw);
      const rz = -Math.sin(this.yaw);
      const up = clamp1((k.has('KeyE') ? 1 : 0) - (k.has('KeyQ') ? 1 : 0));
      p.set(p.x + (f[0] * fwd + rx * side) * v, p.y + (f[1] * fwd + up) * v, p.z + (f[2] * fwd + rz * side) * v);
    }
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
