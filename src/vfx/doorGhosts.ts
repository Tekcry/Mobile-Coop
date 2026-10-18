import { Color3, CreateSphere, StandardMaterial, Vector3, type Mesh, type Scene } from '../core/babylon';
import { THERMAL } from './visionLook';
import { G } from '../physics/groups';
import type { Doors } from '../world/doors';

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

  /** A closed door leaf crossing the floor segment (cx,cz) -> (gx,gz)? Its crossing point goes to `out` (x, z). */
  private crossing(cx: number, cz: number, gx: number, gz: number): { x: number; z: number } | null {
    const list = this.doors.list;
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
      if (t > 0.02 && t < 0.98 && u > 0 && u < 1) return { x: cx + dx * t, z: cz + dz * t };
    }
    return null;
  }

  /** Per render frame: `guards` are the live guards' feet positions; `on` is thermal showing. */
  update(on: boolean, cam: Vector3, guards: readonly { pos: Vector3; alive: boolean }[] | undefined): void {
    let n = 0;
    if (on && guards && this.doors.list.length) {
      for (let i = 0; i < guards.length; i++) {
        const g = guards[i]!;
        if (!g.alive) continue;
        const dx = g.pos.x - cam.x;
        const dz = g.pos.z - cam.z;
        if (dx * dx + dz * dz > THERMAL.doorRange * THERMAL.doorRange) continue;
        const x = this.crossing(cam.x, cam.z, g.pos.x, g.pos.z);
        if (!x) continue;
        // the sight line must be stopped by the door and nothing else: camera -> just before the door, just past it -> guard
        const len = Math.sqrt(dx * dx + dz * dz) || 1;
        const k = 0.2 / len;
        const y = g.pos.y + 1.2;
        this.a.set(cam.x, cam.y, cam.z);
        this.b.set(x.x - dx * k, y, x.z - dz * k);
        if (this.ray(this.a, this.b, G.STATIC).hit) continue;
        this.a.set(x.x + dx * k, y, x.z + dz * k);
        this.b.set(g.pos.x, y, g.pos.z);
        const h = this.ray(this.a, this.b, G.STATIC);
        if (h.hit && h.distance < Vector3.Distance(this.a, this.b) - 0.3) continue;
        const m = this.blob(n++);
        m.position.set(g.pos.x, g.pos.y + 0.9, g.pos.z);
        m.setEnabled(true);
      }
    }
    for (let i = n; i < this.blobs.length; i++) this.blobs[i]!.setEnabled(false);
  }
}
