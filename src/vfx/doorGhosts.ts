import { Color3, CreateSphere, StandardMaterial, Vector3, type Mesh, type Scene } from '../core/babylon';
import { THERMAL } from './visionLook';
import { G } from '../physics/groups';
import type { Doors } from '../world/doors';

/** The door fields the thermal rule reads. */
export interface GhostDoor {
  open: number;
  anchor: { yaw: number; width: number; hinge: { x: number; z: number } };
}

/** (G102, pure) A closed door leaf crossing the floor segment (cx,cz) -> (gx,gz)? True and the crossing point in `out` (x, z). No allocation. */
export function closedDoorCrossing(list: readonly GhostDoor[], cx: number, cz: number, gx: number, gz: number, out: { x: number; z: number }): boolean {
  const dx = gx - cx;
  const dz = gz - cz;
  for (let i = 0; i < list.length; i++) {
    const d = list[i]!;
    if (d.open > 0) continue;
    const a = d.anchor;
    const ex = Math.sin(a.yaw) * a.width;
    const ez = Math.cos(a.yaw) * a.width;
    const den = dx * ez - dz * ex;
    if (Math.abs(den) < 1e-6) continue;
    const hx = a.hinge.x - cx;
    const hz = a.hinge.z - cz;
    const t = (hx * ez - hz * ex) / den;
    const u = (hx * dz - hz * dx) / den;
    if (t > 0.02 && t < 0.98 && u > 0 && u < 1) {
      out.x = cx + dx * t;
      out.z = cz + dz * t;
      return true;
    }
  }
  return false;
}

/**
 * (prototype A5, G102) Thermal's dim silhouette of a guard behind a closed door (CT: a soft low-ramp figure). Render
 * only: it reads gameplay state (guard positions, closed doors) to place a blob and writes nothing back; perception never
 * reads it. A blob is drawn (rendering group 1: over the leaf) only when the sight line camera -> guard is stopped by a
 * closed door and by nothing else (two static rays), so a wall or anything else still hides the guard (G45: thermal never
 * sees through glass or walls). Every number is a starting value.
 */
export class DoorGhosts {
  private readonly blobs: Mesh[] = [];
  private readonly mat: StandardMaterial;
  private readonly a = new Vector3();
  private readonly b = new Vector3();

  constructor(
    private scene: Scene,
    private doors: Doors,
    private ray: (from: Vector3, to: Vector3, mask: number) => { hit: boolean; distance: number },
  ) {
    const m = new StandardMaterial('doorGhost', scene);
    m.disableLighting = true;
    m.diffuseColor = Color3.Black();
    m.specularColor = Color3.Black();
    m.emissiveColor = new Color3(THERMAL.doorGhost, THERMAL.doorGhost, THERMAL.doorGhost);
    m.fogEnabled = false;
    this.mat = m;
  }

  private blob(i: number): Mesh {
    let m = this.blobs[i];
    if (!m) {
      m = CreateSphere('doorGhost', { diameter: 1, segments: 6 }, this.scene);
      m.material = this.mat;
      m.scaling.set(0.65, 1.85, 0.5);
      m.renderingGroupId = 1;
      m.isPickable = false;
      m.setEnabled(false);
      this.blobs[i] = m;
    }
    return m;
  }

  private n = 0;
  private readonly x = { x: 0, z: 0 };

  /** Per render frame: `guards` are the live guards, `partners` the remote players (co-op), both by feet; `on` is thermal showing. */
  update(
    on: boolean,
    cam: Vector3,
    guards: readonly { pos: Vector3; alive: boolean }[] | undefined,
    partners?: readonly { feet: Vector3; target: { alive: boolean } }[],
  ): void {
    this.n = 0;
    if (on && this.doors.list.length) {
      if (guards) for (let i = 0; i < guards.length; i++) if (guards[i]!.alive) this.consider(cam, guards[i]!.pos);
      if (partners) for (let i = 0; i < partners.length; i++) if (partners[i]!.target.alive) this.consider(cam, partners[i]!.feet);
    }
    for (let i = this.n; i < this.blobs.length; i++) this.blobs[i]!.setEnabled(false);
  }

  private consider(cam: Vector3, p: Vector3): void {
    const dx = p.x - cam.x;
    const dz = p.z - cam.z;
    if (dx * dx + dz * dz > THERMAL.doorRange * THERMAL.doorRange) return;
    const x = this.x;
    if (!closedDoorCrossing(this.doors.list, cam.x, cam.z, p.x, p.z, x)) return;
    // the sight line must be stopped by the door and nothing else: camera -> just before the door, just past it -> body
    const len = Math.sqrt(dx * dx + dz * dz) || 1;
    const k = 0.2 / len;
    const y = p.y + 1.2;
    this.a.set(cam.x, cam.y, cam.z);
    this.b.set(x.x - dx * k, y, x.z - dz * k);
    if (this.ray(this.a, this.b, G.STATIC).hit) return;
    this.a.set(x.x + dx * k, y, x.z + dz * k);
    this.b.set(p.x, y, p.z);
    const h = this.ray(this.a, this.b, G.STATIC);
    if (h.hit && h.distance < Vector3.Distance(this.a, this.b) - 0.3) return;
    const m = this.blob(this.n++);
    m.position.set(p.x, p.y + 0.9, p.z);
    m.setEnabled(true);
  }
}
