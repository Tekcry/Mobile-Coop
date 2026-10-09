import { Vector3, type Camera, type Observer, type Scene } from '../core/babylon';
import { GLARE, easeGlare, glareEnds, glareRadius, glareY, pickGlare, type GlareLamp } from './nightVision';

/**
 * Night vision's lamp glare (Phase 1 Step 4b fix; rendering only): while the goggles are on, the nearest lamps in view
 * with a clear line from the camera, as screen-space sources for `CinematicPost`. A lamp glares along its whole fitting
 * (a strip is a segment, a bulb a point). `data` holds two vec4 per source: the segment's ends (u, v, u, v), then
 * radius (screen heights) and strength; `veil` is their sum (the tube's auto-gain and scatter). Allocation-free.
 *
 * It runs from the scene's before-camera-render event, after the camera has updated: reading the camera's matrices
 * earlier in the frame would mark its view as current, Babylon would then see a moving camera as still, and TAA would
 * keep blending stale history (the smear Michael saw moving in night vision on desktop, 2026-10-09).
 */
export class NightGlare {
  /** Two vec4 per source (`GLARE.max`). */
  readonly data = new Float32Array(GLARE.max * 8);
  /** The glare in view (the tube's auto-gain and scatter). */
  veil = 0;
  private readonly idx = new Int16Array(GLARE.max);
  private readonly score = new Float32Array(GLARE.max);
  /** Per lamp: the eased glare weight, and this frame's target. */
  private readonly weight: Float32Array;
  private readonly target: Float32Array;
  private readonly ends = new Float32Array(6);
  private readonly p = new Vector3();
  private readonly q = new Vector3();
  private readonly fwd = new Vector3();
  private readonly up = new Vector3();
  private static readonly AXIS_Z = new Vector3(0, 0, 1);
  private static readonly AXIS_Y = new Vector3(0, 1, 0);
  /** The night-vision blend and the frame time, set by the game each render frame. */
  private k = 0;
  private dt = 0;
  private obs: Observer<Camera> | null;
  /** Called after each update (the post pass reads `data` and `veil`). */
  onUpdate: (() => void) | null = null;

  constructor(
    private readonly scene: Scene,
    private readonly lamps: readonly GlareLamp[],
    /** Static geometry on the segment (camera to lamp, already stopped short of the lamp). */
    private readonly blocked: (ax: number, ay: number, az: number, bx: number, by: number, bz: number) => boolean,
  ) {
    this.weight = new Float32Array(lamps.length);
    this.target = new Float32Array(lamps.length);
    this.obs = scene.onBeforeCameraRenderObservable.add((cam) => {
      if (cam === scene.activeCamera) this.update(cam);
    });
  }

  /** `k`: the night-vision blend 0..1 (0 clears the glare); `dt`: the frame time (the fades). */
  set(k: number, dt: number): void {
    this.k = k;
    this.dt += dt;
  }

  private update(camera: Camera): void {
    const d = this.data;
    const k = this.k;
    const dt = this.dt;
    this.dt = 0;
    d.fill(0);
    this.veil = 0;
    if (k <= 0) {
      this.weight.fill(0);
      this.onUpdate?.();
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
      const dx = l.x - c.x;
      const dy = glareY(l) - c.y;
      const dz = l.z - c.z;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const s = Math.max(0, len - GLARE.clearance) / len;
      t[this.idx[i]!] = this.blocked(c.x, c.y, c.z, c.x + dx * s, c.y + dy * s, c.z + dz * s) ? 0 : 1;
    }
    const w = this.weight;
    for (let i = 0; i < w.length; i++) w[i] = easeGlare(w[i]!, t[i]!, dt);
    const m = camera.getTransformationMatrix();
    const e = this.ends;
    let o = 0;
    for (let i = 0; i < n; i++) {
      const li = this.idx[i]!;
      const wt = w[li]!;
      if (wt <= 0) continue;
      const l = this.lamps[li]!;
      glareEnds(l, e);
      this.p.set(e[0]!, e[1]!, e[2]!);
      Vector3.TransformCoordinatesToRef(this.p, m, this.q);
      d[o] = this.q.x * 0.5 + 0.5;
      d[o + 1] = this.q.y * 0.5 + 0.5;
      this.p.set(e[3]!, e[4]!, e[5]!);
      Vector3.TransformCoordinatesToRef(this.p, m, this.q);
      d[o + 2] = this.q.x * 0.5 + 0.5;
      d[o + 3] = this.q.y * 0.5 + 0.5;
      // the radius: the glare's size in metres, projected (straight up in view, from the fitting's centre)
      this.p.set(l.x, glareY(l), l.z);
      Vector3.TransformCoordinatesToRef(this.p, m, this.q);
      const v = this.q.y;
      this.p.addInPlaceFromFloats(this.up.x * GLARE.size, this.up.y * GLARE.size, this.up.z * GLARE.size);
      Vector3.TransformCoordinatesToRef(this.p, m, this.q);
      const r = glareRadius(Math.abs(this.q.y - v) * 0.5);
      const s = wt * k * Math.min(1, l.intensity);
      d[o + 4] = r;
      d[o + 5] = s;
      o += 8;
      // a near (large) lamp floods the tube more than a far one
      this.veil += s * Math.min(1, r * 2);
    }
    this.veil = Math.min(2, this.veil);
    this.onUpdate?.();
  }

  dispose(): void {
    if (this.obs) this.scene.onBeforeCameraRenderObservable.remove(this.obs);
    this.obs = null;
  }
}
