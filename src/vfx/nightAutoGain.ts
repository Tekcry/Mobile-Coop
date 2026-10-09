import { Vector3, type Camera, type Observer, type Scene } from '../core/babylon';
import { GLARE, abcWeight, easeGlare, easeVeil, glareY, pickGlare, type GlareLamp } from './nightVision';

/**
 * Night vision's auto-gain (Phase 1 Step 4b fix; rendering only): while the goggles are on, the nearest lamps in view
 * with a clear line from the camera turn the tube's gain down, eased (`veil`: the image divides by 1 + veil x
 * `NV_TONE.gainDrop`). Allocation-free.
 *
 * It runs from the scene's before-camera-render event, after the camera has updated: reading the camera's matrices
 * earlier in the frame would mark its view as current, Babylon would then see a moving camera as still, and TAA would
 * keep blending stale history (the smear Michael saw moving in night vision on desktop, 2026-10-09).
 */
export class NightAutoGain {
  /** The tube's auto-gain (0 none), eased. */
  veil = 0;
  private readonly idx = new Int16Array(GLARE.max);
  private readonly score = new Float32Array(GLARE.max);
  /** Per lamp: the eased weight, and this frame's target. */
  private readonly weight: Float32Array;
  private readonly target: Float32Array;
  private readonly fwd = new Vector3();
  private static readonly AXIS_Z = new Vector3(0, 0, 1);
  /** The night-vision blend and the frame time, set by the game each render frame. */
  private k = 0;
  private dt = 0;
  private obs: Observer<Camera> | null;
  /** Called after each update (the post pass reads `veil`). */
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

  /** `k`: night vision on (0..1; 0 clears the gain); `dt`: the frame time (the easing). */
  set(k: number, dt: number): void {
    this.k = k;
    this.dt += dt;
  }

  private update(camera: Camera): void {
    const k = this.k;
    const dt = this.dt;
    this.dt = 0;
    if (k <= 0) {
      this.veil = 0;
      this.weight.fill(0);
      this.onUpdate?.();
      return;
    }
    const c = camera.globalPosition;
    camera.getDirectionToRef(NightAutoGain.AXIS_Z, this.fwd);
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
    let abc = 0;
    for (let i = 0; i < n; i++) {
      const li = this.idx[i]!;
      const wt = w[li]!;
      if (wt <= 0) continue;
      const l = this.lamps[li]!;
      const dist = Math.sqrt((l.x - c.x) ** 2 + (glareY(l) - c.y) ** 2 + (l.z - c.z) ** 2);
      // a near lamp in view turns the tube's gain down more than a far one
      abc += wt * k * abcWeight(dist, l.intensity);
    }
    this.veil = easeVeil(this.veil, Math.min(2, abc), dt);
    this.onUpdate?.();
  }

  dispose(): void {
    if (this.obs) this.scene.onBeforeCameraRenderObservable.remove(this.obs);
    this.obs = null;
  }
}
