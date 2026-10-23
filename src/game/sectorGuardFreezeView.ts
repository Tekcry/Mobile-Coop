// (sector-redesign perf) The scene side of the guard render freeze (`sectorGuardFreeze.ts`): once per camera
// evaluation, before the active meshes are picked, each living guard whose body and shadows cannot reach the screen is
// disabled (rig root: the merged body, its gun parts, helmet, armour, shield), and thawed as soon as either can.
// Shadow maps render after the evaluation in the same camera pass, so they see the same state; disabled meshes skip
// the evaluation, the skeleton prepare and every shadow draw. Render only: gameplay reads none of it.
//
// Two tests: the frustum (exact, every evaluation) and, for a guard whose body or moon shadow is in the frustum,
// occlusion: rays from the camera to his sample points (`occlusionPoints`) against static geometry (walls, floors,
// closed doors; never glass or fences; a door leaf not shut, a breakable pane and a roof sheet are stepped past:
// `seeThroughRay`). Occlusion is re-tested every `RETEST` evaluations per guard (staggered, at most `TESTS_PER_EVAL`
// guards per evaluation), at once after a camera cut; a guard found visible stays drawn `HOLD` evaluations before
// the next test.
// `?guardfreeze=0` turns it off (A/B runs).

import { DirectionalLight, PointLight, SpotLight, Vector3, type Observer, type Scene } from '../core/babylon';
import type { Enemy } from '../ai/enemy';
import { hyp3 } from '../core/mathx';
import { FREEZE_DRAW, FREEZE_MAX_POINTS, FreezeLights, guardFrustum, occlusionPoints } from './sectorGuardFreeze';

/** What the freeze reads of the guards (the enemy manager). */
export interface FreezeGuards {
  readonly enemies: readonly Enemy[];
}

/** Distance (m) from `from` to the first static hit towards `to` (`to`'s distance when clear). Allocation-free. */
export type FreezeRay = (from: Vector3, to: Vector3) => number;

/** Occlusion re-test period (camera evaluations) of a guard found hidden. */
export const RETEST = 4;
/** A guard found visible is drawn this many evaluations before the next test (no flicker at a corner). */
export const HOLD = 24;
/** A camera move longer than this (m) in one evaluation is a cut: every hidden verdict is re-tested at once. */
export const CUT = 0.75;
/** A sample point counts as seen when the ray stops within this of it (m). */
const SLACK = 0.25;
/** At most this many guards get an occlusion test per evaluation (a camera cut re-tests every hidden verdict: spread
 *  over the next evaluations; a guard waiting for his test is drawn meanwhile). ~6 rays each. */
export const TESTS_PER_EVAL = 8;

/** The first hit of a render-only cast (Babylon's `PhysicsRaycastResult` fits; read before the next cast). */
export interface FreezeHit {
  readonly hasHit: boolean;
  readonly body?: unknown;
  readonly hitPoint: { readonly x: number; readonly y: number; readonly z: number };
}
/** Is this hit (body, point) on something the camera sees through (a cracked door leaf, a glass pane, a roof sheet)? */
export type SeeThrough = (body: unknown, x: number, y: number, z: number) => boolean;

/** See-through hits a freeze ray steps past before it gives up and calls the point seen. */
export const SEE_THROUGH_SKIPS = 6;
/** How far past a see-through hit (m) the next cast starts. */
const SKIP_STEP = 0.05;

/**
 * (sector-redesign perf, fix round) The freeze's occlusion ray: casts `cast` (static geometry) from `from` to `to`; a
 * hit on something see-through (`see`) is stepped past and the cast goes on. Render only: gameplay rays (sight, shots,
 * the light field, the meter) keep their masks and never use this. When unsure (too many see-through hits in a row)
 * the point is seen: a guard drawn needlessly costs a little perf, a guard missing is a bug. One closure, made once;
 * allocation-free per call.
 */
export function seeThroughRay(cast: (from: Vector3, to: Vector3) => FreezeHit, see: SeeThrough): FreezeRay {
  const a = new Vector3();
  return (from: Vector3, to: Vector3): number => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dz = to.z - from.z;
    const total = hyp3(dx, dy, dz);
    if (total <= 0) return 0;
    a.copyFrom(from);
    for (let k = 0; k <= SEE_THROUGH_SKIPS; k++) {
      const r = cast(a, to);
      if (!r.hasHit) return total;
      const p = r.hitPoint;
      const d = hyp3(p.x - from.x, p.y - from.y, p.z - from.z);
      if (!see(r.body, p.x, p.y, p.z)) return d;
      const s = d + SKIP_STEP;
      if (s >= total) return total;
      a.set(from.x + (dx * s) / total, from.y + (dy * s) / total, from.z + (dz * s) / total);
    }
    return total;
  };
}

export class SectorGuardFreeze {
  private obs: Observer<Scene> | null;
  private readonly planes = new Float64Array(24);
  private readonly lights = new FreezeLights();
  private readonly pts = new Float64Array(FREEZE_MAX_POINTS * 3);
  private readonly from = new Vector3();
  private readonly to = new Vector3();
  /** The guards this freeze disabled (only these are ever re-enabled by it). */
  private readonly frozen: Enemy[] = [];
  /** Occlusion memo by list index: the guard, hidden (1) or seen (0), evaluations until the next test. */
  private memoE: (Enemy | null)[] = [];
  private memoHidden = new Uint8Array(0);
  private memoWait = new Int16Array(0);
  private lastCam: unknown = null;
  private readonly lastPos = new Vector3(Number.NaN, 0, 0);
  /** Guards frozen at the last evaluation (debug, perf runs). */
  count = 0;
  /** Of them, frozen by occlusion (the rest by the frustum). */
  occluded = 0;
  /** Rays cast at the last evaluation. */
  rays = 0;

  constructor(
    private readonly scene: Scene,
    private readonly guards: FreezeGuards,
    private readonly ray: FreezeRay | null = null,
  ) {
    this.obs = scene.onBeforeActiveMeshesEvaluationObservable.add(this.step);
  }

  private readonly step = (): void => {
    const scene = this.scene;
    const cam = scene.activeCamera;
    const fp = scene.frustumPlanes;
    if (!cam || !fp || fp.length < 6) return;
    const pl = this.planes;
    for (let i = 0; i < 6; i++) {
      const p = fp[i]!;
      pl[i * 4] = p.normal.x;
      pl[i * 4 + 1] = p.normal.y;
      pl[i * 4 + 2] = p.normal.z;
      pl[i * 4 + 3] = p.d;
    }
    this.readLights();
    // thaw what left the rule's reach first (died, despawned, taken in a takedown), and drop what left the list or was
    // disposed (a section unload or a restart: `Enemy.dispose` keeps `alive`)
    const fz = this.frozen;
    const list = this.guards.enemies;
    for (let i = fz.length - 1; i >= 0; i--) {
      const e = fz[i]!;
      if (e.alive && !e.taken && e.dog === null && !e.bodyRig.root.isDisposed() && list.indexOf(e) >= 0) continue;
      this.thaw(i);
    }
    const c = cam.globalPosition;
    const cut = cam !== this.lastCam || !(hyp3(c.x - this.lastPos.x, c.y - this.lastPos.y, c.z - this.lastPos.z) <= CUT);
    this.lastCam = cam;
    this.lastPos.copyFrom(c);
    this.fitMemo(list.length);
    let n = 0;
    let occ = 0;
    let tests = 0;
    this.rays = 0;
    for (let i = 0; i < list.length; i++) {
      const e = list[i]!;
      if (this.memoE[i] !== e) {
        this.memoE[i] = e;
        this.memoHidden[i] = 0;
        this.memoWait[i] = i % RETEST;
      }
      // (a dog's humanoid rig is hidden by the enemy itself: never touched)
      if (!e.alive || e.taken || e.dog !== null) continue;
      const root = e.bodyRig.root;
      const p = root.position;
      const h = e.def.height;
      const bits = guardFrustum(pl, p.x, p.y, p.z, h, c.x, c.y, c.z, this.lights);
      let want = bits === 0;
      if (bits > 0 && this.ray) {
        if (cut && this.memoHidden[i]) this.memoWait[i] = 0;
        if (this.memoWait[i]! > 0) {
          this.memoWait[i]!--;
          want = this.memoHidden[i] === 1;
        } else if (tests < TESTS_PER_EVAL) {
          tests++;
          const hidden = this.occluded3(bits, p.x, p.y, p.z, h, c);
          this.memoHidden[i] = hidden ? 1 : 0;
          this.memoWait[i] = hidden ? RETEST : HOLD;
          want = hidden;
        } else want = false; // (over the budget: drawn until his test, next evaluation)
        if (want) occ++;
      } else if (bits === FREEZE_DRAW) this.memoHidden[i] = 0;
      const on = root.isEnabled(false);
      if (want) {
        n++;
        if (on) {
          root.setEnabled(false);
          fz.push(e);
        }
      } else if (!on) {
        const k = fz.indexOf(e);
        if (k >= 0) this.thaw(k);
      }
    }
    this.count = n;
    this.occluded = occ;
  };

  /** Is every sample point of the guard (feet at x, y, z) hidden from the camera `c` by static geometry? */
  private occluded3(bits: number, x: number, y: number, z: number, h: number, c: Vector3): boolean {
    const ray = this.ray!;
    const pts = this.pts;
    const n = occlusionPoints(pts, bits, x, y, z, h, c.x, c.z, this.lights);
    this.from.copyFrom(c);
    for (let k = 0; k < n; k++) {
      const px = pts[k * 3]!;
      const py = pts[k * 3 + 1]!;
      const pz = pts[k * 3 + 2]!;
      this.to.set(px, py, pz);
      this.rays++;
      if (ray(this.from, this.to) >= hyp3(px - c.x, py - c.y, pz - c.z) - SLACK) return false;
    }
    return true;
  }

  private fitMemo(n: number): void {
    if (this.memoHidden.length >= n) return;
    const m = Math.max(n, 32);
    const hid = new Uint8Array(m);
    hid.set(this.memoHidden);
    const wait = new Int16Array(m);
    wait.set(this.memoWait);
    this.memoHidden = hid;
    this.memoWait = wait;
    while (this.memoE.length < m) this.memoE.push(null);
  }

  /** The frame's shadow-casting lights: the moon / sun with moving shadows, and every lit spot / point shadow map. */
  private readLights(): void {
    const L = this.lights;
    L.clear();
    const ls = this.scene.lights;
    for (let i = 0; i < ls.length; i++) {
      const l = ls[i]!;
      if (!l.shadowEnabled || l.intensity <= 0 || !l.isEnabled() || l.getShadowGenerator() === null) continue;
      if (l instanceof DirectionalLight) {
        const d = l.direction;
        const len = hyp3(d.x, d.y, d.z) || 1;
        // (several suns: the first is read, the rest make the rule give up)
        if (L.sun) L.overflow = true;
        L.sun = true;
        L.sx = d.x / len;
        L.sy = d.y / len;
        L.sz = d.z / len;
      } else if (l instanceof SpotLight || l instanceof PointLight) {
        const p = l.getAbsolutePosition();
        const z = l.shadowMaxZ;
        L.addSpot(p.x, p.y, p.z, Number.isFinite(z) && z > 0 ? z : Infinity);
      } else L.overflow = true;
    }
  }

  private thaw(k: number): void {
    const fz = this.frozen;
    const e = fz[k]!;
    if (!e.bodyRig.root.isDisposed()) e.bodyRig.root.setEnabled(true);
    fz[k] = fz[fz.length - 1]!;
    fz.pop();
  }

  /** Every frozen guard shown again; the observer removed. */
  dispose(): void {
    if (this.obs) this.scene.onBeforeActiveMeshesEvaluationObservable.remove(this.obs);
    this.obs = null;
    while (this.frozen.length) this.thaw(this.frozen.length - 1);
    this.count = 0;
  }
}
