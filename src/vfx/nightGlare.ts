import { Vector3, type Camera } from '../core/babylon';
import { GLARE, easeGlare, glareRadius, glareY, pickGlare, type GlareLamp } from './nightVision';

/**
 * Night vision's lamp glare (Phase 1 Step 4b fix; rendering only): per render frame while the goggles are on, the
 * nearest lamps in view with a clear line from the camera, as screen-space sources for `CinematicPost`
 * (`data`: u, v, radius in screen heights, strength; `veil`: their sum). Allocation-free.
 */
export class NightGlare {
  /** u, v, radius, strength per source (`GLARE.max`). */
  readonly data = new Float32Array(GLARE.max * 4);
  /** The glare in view (the tube's auto-gain and scatter). */
  veil = 0;
  private readonly idx = new Int16Array(GLARE.max);
  private readonly score = new Float32Array(GLARE.max);
  /** Per lamp: the eased glare weight, and this frame's target. */
  private readonly weight: Float32Array;
  private readonly target: Float32Array;
  private readonly p = new Vector3();
  private readonly q = new Vector3();
  private readonly fwd = new Vector3();
  private readonly up = new Vector3();
  private static readonly AXIS_Z = new Vector3(0, 0, 1);
  private static readonly AXIS_Y = new Vector3(0, 1, 0);

  constructor(
    private readonly lamps: readonly GlareLamp[],
    /** Static geometry on the segment (camera to lamp, already stopped short of the lamp). */
    private readonly blocked: (ax: number, ay: number, az: number, bx: number, by: number, bz: number) => boolean,
  ) {
    this.weight = new Float32Array(lamps.length);
    this.target = new Float32Array(lamps.length);
  }

  /** `k`: the night-vision blend 0..1 (0 clears the glare). */
  update(camera: Camera, k: number, dt: number): void {
    const d = this.data;
    d.fill(0);
    this.veil = 0;
    if (k <= 0) {
      this.weight.fill(0);
      return;
    }
    const c = camera.globalPosition;
    camera.getDirectionToRef(NightGlare.AXIS_Z, this.fwd);
    camera.getDirectionToRef(NightGlare.AXIS_Y, this.up);
    const f = this.fwd;
    const n = pickGlare(this.lamps, c.x, c.y, c.z, f.x, f.y, f.z, this.idx, this.score);
    const t = this.target;
    t.fill(0);
    for (let i = 0; i < n; i++) {
      const l = this.lamps[this.idx[i]!]!;
      const ly = glareY(l);
      const dx = l.x - c.x;
      const dy = ly - c.y;
      const dz = l.z - c.z;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const s = Math.max(0, len - GLARE.clearance) / len;
      t[this.idx[i]!] = this.blocked(c.x, c.y, c.z, c.x + dx * s, c.y + dy * s, c.z + dz * s) ? 0 : 1;
    }
    const w = this.weight;
    for (let i = 0; i < w.length; i++) w[i] = easeGlare(w[i]!, t[i]!, dt);
    const m = camera.getTransformationMatrix();
    let o = 0;
    for (let i = 0; i < n; i++) {
      const li = this.idx[i]!;
      const wt = w[li]!;
      if (wt <= 0) continue;
      const l = this.lamps[li]!;
      this.p.set(l.x, glareY(l), l.z);
      Vector3.TransformCoordinatesToRef(this.p, m, this.q);
      const u = this.q.x * 0.5 + 0.5;
      const v = this.q.y * 0.5 + 0.5;
      // the radius: the glare's size in metres, projected (straight up in view)
      this.p.addInPlaceFromFloats(this.up.x * GLARE.size, this.up.y * GLARE.size, this.up.z * GLARE.size);
      Vector3.TransformCoordinatesToRef(this.p, m, this.p);
      const r = glareRadius(Math.abs(this.p.y * 0.5 + 0.5 - v));
      const s = wt * k * Math.min(1, l.intensity);
      d[o] = u;
      d[o + 1] = v;
      d[o + 2] = r;
      d[o + 3] = s;
      o += 4;
      // a near (large) lamp floods the tube more than a far one
      this.veil += s * Math.min(1, r * 2);
    }
    this.veil = Math.min(2, this.veil);
  }
}
