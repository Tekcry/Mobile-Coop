/**
 * Level editor camera: fly (free, through walls) and walk (eye height, walls block, crouch). Right mouse drag looks,
 * WASD moves, Q / E go down and up (fly), Shift is fast, the wheel dollies, C crouches (walk).
 */
import type { FreeCamera } from '../core/babylon';
import { collide } from './geometry';
import type { Obb } from './geometry';

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
  walking = false;
  crouched = false;
  /** Floor height under the walker (the current level's floor). */
  floor = 0;
  /** Wall boxes that block the walker (rebuilt by the editor when the level or the walls change). */
  blockers: Obb[] = [];
  /** Controller input, set each frame by padControl.ts: left stick move (x right, y forward), right stick look rate (x right, y up), triggers rise (RT up, LT down, -1..1). */
  padMove = { x: 0, y: 0 };
  padLook = { x: 0, y: 0 };
  padRise = 0;
  /** L3 toggles fast movement for the pad. */
  padFast = false;
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
    this.walking = false;
    this.camera.position.set(x, floor + dist * 0.8, z - dist * 0.6);
    this.lookAt(x, floor, z);
  }

  /** Starts walking at a plan point on a floor. */
  walkAt(x: number, z: number, floor: number): void {
    this.walking = true;
    this.floor = floor;
    this.camera.position.set(x, floor + this.eye(), z);
    this.pitch = 0;
  }

  eye(): number {
    return (this.crouched ? CROUCH : STAND) - EYE_DROP;
  }

  update(dt: number): void {
    const k = this.keys;
    const fast = k.has('ShiftLeft') || k.has('ShiftRight') || this.padFast;
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
      // triggers: a deeper press is faster (squared)
      const r = this.padRise;
      const up = clamp1((k.has('KeyE') ? 1 : 0) - (k.has('KeyQ') ? 1 : 0) + Math.sign(r) * r * r);
      p.set(p.x + (f[0] * fwd + rx * side) * v, p.y + (f[1] * fwd + up) * v, p.z + (f[2] * fwd + rz * side) * v);
    }
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }
}
