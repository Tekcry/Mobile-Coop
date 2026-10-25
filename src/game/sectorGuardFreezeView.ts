// (sector-redesign perf) The scene side of the guard render freeze (`sectorGuardFreeze.ts`): once per camera
// evaluation, before the active meshes are picked, each living guard whose body and shadows cannot reach the screen is
// disabled (rig root: the merged body, its gun parts, helmet, armour, shield), and thawed as soon as either can.
// Shadow maps render after the evaluation in the same camera pass, so they see the same state; disabled meshes skip
// the evaluation, the skeleton prepare and every shadow draw. Render only: gameplay reads none of it.
//
// Two tests: the frustum (exact, every evaluation) and, for a guard whose body, moon shadow or (guard-render S10) a
// lamp's shadow of him is in the frustum, occlusion: rays from the camera to his sample points (`occlusionPoints`; the
// moon / lamp shadow landings: `shadowProbe`, `lampProbe`) against static geometry (walls, floors,
// closed doors; never glass or fences; a door leaf not shut, a breakable pane and a roof sheet are stepped past:
// `seeThroughRay`). Occlusion is re-tested every `RETEST` evaluations per guard (staggered, at most `TESTS_PER_EVAL`
// guards per evaluation), at once after a camera cut; a guard found visible stays drawn `HOLD` evaluations before
// the next test.
// (frzpol) A hidden verdict is re-tested at the next evaluation (urgent: drawn until tested if over the budget) when
// the view epoch moves (a door leaf stops being opaque, a breakable pane opens: `views`), when his frustum bits gain a
// part (re-entering the frustum, the body joining the shadow), or after a cut; a hidden verdict with a blocker within
// `EDGE` of a sample point (stepping out of cover, a doorway) is re-tested every evaluation. Guards are walked from a
// rotating start, so the per-evaluation budget is shared fairly.
// (guard-render S10b) The torch and character shadow atlases (`torchShadows.ts`, `charShadows.ts`) render with
// intensity-0 slot spots (the real light is the guards' flashlights and the baked lamps): `readLights` skips those
// lights and reads each ACTIVE slot instead (`FreezeAtlas`), as that slot renders this frame (the atlases place their
// slots in `World.frame`, before `scene.render`, so this evaluation sees this frame's slots). The atlases list a
// frozen guard's casters too (the map draws only what is enabled when it renders, after this evaluation) and re-render
// a slot at once when one of its listed casters is thawed, so a guard thawed here is in every map of this frame.
// `?guardfreeze=0` turns it off (A/B runs).

import { DirectionalLight, PointLight, SpotLight, Vector3, type Observer, type Scene } from '../core/babylon';
import type { Enemy } from '../ai/enemy';
import { hyp2, hyp3 } from '../core/mathx';
import { TORCH } from '../world/torches';
import {
  FREEZE_DRAW,
  FREEZE_LAMP_BIT0,
  FREEZE_LAMP_IN,
  FREEZE_MAX_POINTS,
  FREEZE_PROBES,
  FREEZE_SHADOW_IN,
  FreezeLights,
  guardFrustum,
  lampLanding,
  lampProbe,
  occlusionPoints,
  shadowLanding,
  shadowProbe,
} from './sectorGuardFreeze';

/** What the freeze reads of the guards (the enemy manager). */
export interface FreezeGuards {
  readonly enemies: readonly Enemy[];
}

/** Distance (m) from `from` to the first static hit towards `to` (`to`'s distance when clear). Allocation-free.
 *  (artnext C6) `recasts`, when the ray keeps one, counts the extra casts it made past see-through hits (`seeThroughRay`),
 *  so the freeze's `rays` debug counter includes them. */
export type FreezeRay = ((from: Vector3, to: Vector3) => number) & { recasts?: number };

/** (guard-render S10b) The guard-torch shadow atlas (`TorchShadows`): per slot its spot light while it holds a torch
 *  this frame (position, `getShadowDirection()`, `angle`, `shadowMaxZ` as the slot renders), null when unused. */
export interface FreezeTorchSlots {
  readonly slotCount: number;
  slotLight(s: number): SpotLight | null;
}
/** (S10b) The character shadow atlas (`CharShadows`): per slot its lamp this frame into `out` (x, y, z, how far from it a
 *  shadow can land: the map's far plane), false when unused. The map's cone is fitted around the casters drawn, so the
 *  lamp's whole reach is read, not the cone (a frozen guard is outside a fit made without him). */
export interface FreezeCharSlots {
  readonly slotCount: number;
  slotLamp(s: number, out: Float32Array): boolean;
}
/** (S10b) The shadow atlases the freeze reads (either may be absent: a bright map, a tier without them). */
export interface FreezeAtlas {
  readonly torch?: FreezeTorchSlots | null;
  readonly chars?: FreezeCharSlots | null;
}

/** Occlusion re-test period (camera evaluations) of a guard found hidden. */
export const RETEST = 4;
/** A guard found visible is drawn this many evaluations before the next test (no flicker at a corner). */
export const HOLD = 24;
/** A camera move longer than this (m) in one evaluation is a cut: every hidden verdict is re-tested at once. */
export const CUT = 0.75;
/** A sample point counts as seen when the ray stops within this of it (m). */
const SLACK = 0.25;
/** At most this many guards get an occlusion test per evaluation (a camera cut re-tests every hidden verdict: spread
 *  over the next evaluations; a guard waiting for his test is drawn meanwhile). At most `FREEZE_TEST_RAYS` (19, S10:
 *  with two lamp shadows) rays each, 5-7 typical. */
export const TESTS_PER_EVAL = 8;
/** (frzpol) A hidden verdict whose blocker stops within this (m) of a sample point is near the edge: re-tested every
 *  evaluation (within the budget). */
export const EDGE = 0.75;
/** (frzpol) Over the budget, a non-urgent hidden verdict at most this many evaluations old is kept (else drawn). */
export const STALE = RETEST;
/** (frzpol) The view epoch: a number that grows when something stops hiding what is behind it (a door leaf no longer
 *  opaque, a breakable panel opened). Read once per evaluation. */
export type FreezeViews = () => number;

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
  const ray: FreezeRay = (from: Vector3, to: Vector3): number => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dz = to.z - from.z;
    const total = hyp3(dx, dy, dz);
    if (total <= 0) return 0;
    a.copyFrom(from);
    for (let k = 0; k <= SEE_THROUGH_SKIPS; k++) {
      // (artnext C6) every cast after the first is a recast past a see-through hit
      if (k > 0) ray.recasts = (ray.recasts ?? 0) + 1;
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
  ray.recasts = 0;
  return ray;
}

/** The frame's shadow-casting lights into `L`: the moon / sun with moving shadows, and every lit spot / point shadow map;
 *  (S10b) the atlas slots (`torch`, `chars`) as they render this frame; `slot4` is scratch for a character slot's lamp.
 *  (guard-cap T1-SHADOW) Shared with the guard anim tier's shadow rule (`animTierView.ts`). Allocation-free. */
export function readFreezeLights(
  scene: Scene,
  L: FreezeLights,
  torch: FreezeTorchSlots | null | undefined,
  chars: FreezeCharSlots | null | undefined,
  slot4: Float32Array,
): void {
  L.clear();
  const ls = scene.lights;
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
    } else if (l instanceof SpotLight) addSpotLight(L, l);
    else if (l instanceof PointLight) {
      const p = l.getAbsolutePosition();
      const z = l.shadowMaxZ;
      // (S10) how far from the lamp a shadow can land: the shadow map ends at depth shadowMaxZ along its view axis
      // (sqrt 3 at a cube face corner), the light at its range
      let reach = Number.isFinite(z) && z > 0 ? z * Math.sqrt(3) : Infinity;
      const rg = l.range;
      if (Number.isFinite(rg) && rg > 0 && rg < reach && rg < 1e30) reach = rg;
      L.addSpot(p.x, p.y, p.z, reach);
    } else L.overflow = true;
  }
  // (S10b) the atlas slots (intensity 0, skipped above): each active one as it renders this frame; unused ones skipped
  if (torch) {
    for (let s = 0; s < torch.slotCount; s++) {
      const l = torch.slotLight(s);
      if (l) addSpotLight(L, l, true);
    }
  }
  if (chars) {
    const q = slot4;
    for (let s = 0; s < chars.slotCount; s++) {
      if (chars.slotLamp(s, q)) L.addSpot(q[0]!, q[1]!, q[2]!, q[3]! > 0 ? q[3]! : Infinity);
    }
  }
}

/** A shadowing spot as its map renders: position, axis, cone, reach (S10); (S10b) a guard torch slot (`torch`) also
 *  its holder's feet, `placeTorch` undone as `torchHolderScore` does (the slot's map drops its holder). */
function addSpotLight(L: FreezeLights, l: SpotLight, torch = false): void {
  const p = l.getAbsolutePosition();
  const z = l.shadowMaxZ;
  // (S10) how far from the lamp a shadow can land: the shadow map ends at depth shadowMaxZ along its view axis
  // (radially up to / cos(half angle) at a spot's rim), the light at its range
  let reach = Number.isFinite(z) && z > 0 ? z : Infinity;
  const half = l.angle * 0.5;
  const cos = Math.cos(half);
  reach = half < Math.PI / 2 ? reach / Math.max(cos, 0.05) : Infinity;
  const rg = l.range;
  if (Number.isFinite(rg) && rg > 0 && rg < reach && rg < 1e30) reach = rg;
  const d = l.getShadowDirection();
  const len = hyp3(d.x, d.y, d.z) || 1;
  let hx = Number.NaN;
  let hz = Number.NaN;
  const h = hyp2(d.x, d.z);
  if (torch && h > 1e-6) {
    const sn = d.x / h;
    const cs = d.z / h;
    hx = p.x - sn * TORCH.ahead - cs * TORCH.side;
    hz = p.z - cs * TORCH.ahead + sn * TORCH.side;
  }
  L.addSpot(p.x, p.y, p.z, reach, d.x / len, d.y / len, d.z / len, half, hx, hz);
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
  /** Occlusion memo by list index: the guard, hidden (1) or seen (0), evaluations until the next test; (frzpol) his
   *  last frustum bits (0: out or drawn), an urgent re-test due (1), the hidden verdict near the edge (1), evaluations
   *  since his last test. */
  private memoE: (Enemy | null)[] = [];
  private memoHidden: Uint8Array = new Uint8Array(0);
  private memoWait: Int16Array = new Int16Array(0);
  /** (S10) 32-bit: the lamp bits (`FREEZE_LAMP_BIT0 << i`) sit above the body / moon / lamp bits. */
  private memoBits: Uint32Array = new Uint32Array(0);
  private memoUrgent: Uint8Array = new Uint8Array(0);
  private memoEdge: Uint8Array = new Uint8Array(0);
  private memoAge: Int16Array = new Int16Array(0);
  private lastCam: unknown = null;
  private readonly lastPos = new Vector3(Number.NaN, 0, 0);
  /** (frzpol) The moon-shadow probe: from, to, landing. */
  private readonly probe = new Float64Array(9);
  /** (S10b) A character-atlas slot's lamp (x, y, z, reach). */
  private readonly slotLamp4 = new Float32Array(4);
  /** (frzpol) The last test's hidden verdict was near the edge. */
  private edge = false;
  /** (frzpol) The view epoch at the last evaluation. */
  private lastViews = Number.NaN;
  /** (frzpol) Where the guard walk starts (rotates each evaluation: the budget is shared fairly). */
  private rot = 0;
  /** Guards frozen at the last evaluation (debug, perf runs). */
  count = 0;
  /** Of them, frozen by occlusion (the rest by the frustum). */
  occluded = 0;
  /** Rays cast at the last evaluation, (artnext C6) the see-through recasts included. */
  rays = 0;

  constructor(
    private readonly scene: Scene,
    private readonly guards: FreezeGuards,
    private readonly ray: FreezeRay | null = null,
    private readonly views: FreezeViews | null = null,
    /** (S10b) The torch / character shadow atlases: each active slot is a shadowing light. */
    private readonly atlas: FreezeAtlas | null = null,
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
    // (frzpol) the view epoch moved (a door stopped being opaque, a pane opened): every hidden verdict is re-tested
    const v = this.views ? this.views() : 0;
    const bump = v !== this.lastViews;
    this.lastViews = v;
    let n = 0;
    let occ = 0;
    let tests = 0;
    this.rays = 0;
    const r0 = this.ray?.recasts ?? 0;
    const len = list.length;
    if (this.rot >= len) this.rot = 0;
    const start = this.rot;
    this.rot++;
    for (let j = 0; j < len; j++) {
      const i = j + start < len ? j + start : j + start - len;
      const e = list[i]!;
      if (this.memoE[i] !== e) {
        this.memoE[i] = e;
        this.memoHidden[i] = 0;
        this.memoWait[i] = i % RETEST;
        this.memoBits[i] = 0;
        this.memoUrgent[i] = 0;
        this.memoEdge[i] = 0;
        this.memoAge[i] = 0;
      }
      // (a dog's humanoid rig is hidden by the enemy itself: never touched)
      if (!e.alive || e.taken || e.dog !== null) continue;
      const root = e.bodyRig.root;
      const p = root.position;
      const h = e.def.height;
      const bits = guardFrustum(pl, p.x, p.y, p.z, h, c.x, c.y, c.z, this.lights);
      const prev = this.memoBits[i]!;
      this.memoBits[i] = bits > 0 ? bits : 0;
      let want = bits === 0;
      if (bits > 0 && this.ray) {
        // a hidden verdict goes stale after a cut, a view-epoch move, or a part of him newly in the frustum (re-entry)
        if (this.memoHidden[i] && (cut || bump || (bits & ~prev) !== 0)) {
          this.memoWait[i] = 0;
          this.memoUrgent[i] = 1;
        }
        if (this.memoAge[i]! < 32767) this.memoAge[i]!++;
        if (this.memoWait[i]! > 0) {
          this.memoWait[i]!--;
          want = this.memoHidden[i] === 1;
        } else if (tests < TESTS_PER_EVAL) {
          tests++;
          const hidden = this.occluded3(bits, p.x, p.y, p.z, h, c);
          this.memoHidden[i] = hidden ? 1 : 0;
          this.memoEdge[i] = hidden && this.edge ? 1 : 0;
          this.memoUrgent[i] = 0;
          this.memoAge[i] = 0;
          // (near the edge: tested again next evaluation)
          this.memoWait[i] = hidden ? (this.edge ? 0 : RETEST) : HOLD;
          want = hidden;
        } else {
          // over the budget: an urgent or old verdict is drawn until his test; a fresh one (an edge re-test) is kept
          want = this.memoHidden[i] === 1 && this.memoUrgent[i] === 0 && this.memoAge[i]! <= STALE;
        }
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
    // (artnext C6) plus the see-through recasts the ray made this evaluation
    if (this.ray) this.rays += (this.ray.recasts ?? 0) - r0;
  };

  /**
   * Is every sample point of the guard (feet at x, y, z) hidden from the camera `c` by static geometry? (frzpol) Also
   * where his moon shadow leaves his floor (a roof edge: the probe from his head, then his middle) must be hidden; sets
   * `edge` when a blocker stops within `EDGE` of a point.
   */
  private occluded3(bits: number, x: number, y: number, z: number, h: number, c: Vector3): boolean {
    const pts = this.pts;
    const n = occlusionPoints(pts, bits, x, y, z, h, c.x, c.z, this.lights);
    this.edge = false;
    for (let k = 0; k < n; k++) {
      if (this.seen(c, pts[k * 3]!, pts[k * 3 + 1]!, pts[k * 3 + 2]!)) return false;
    }
    if (bits & FREEZE_SHADOW_IN) {
      const pr = this.probe;
      for (let k = 0; k < 2; k++) {
        if (!shadowProbe(pr, x, y, z, h, k === 0 ? 1 : 0.5, this.lights)) break;
        this.from.set(pr[0]!, pr[1]!, pr[2]!);
        this.to.set(pr[3]!, pr[4]!, pr[5]!);
        this.rays++;
        // (on his floor, or no ground within the drop: his floor points cover it, and the middle's lands nearer)
        if (!shadowLanding(pr, y, this.ray!(this.from, this.to))) break;
        if (this.seen(c, pr[6]!, pr[7]!, pr[8]!)) return false;
      }
    }
    // (S10) each lamp whose shadow volume of him is in the frustum: where the shadow of his head and of his middle
    // lands (the probe away from the lamp, out to its reach), the camera must not see it
    if (bits & FREEZE_LAMP_IN) {
      const pr = this.probe;
      const L = this.lights;
      for (let i = 0; i < L.spotN; i++) {
        if ((bits & (FREEZE_LAMP_BIT0 << i)) === 0) continue;
        for (let k = 0; k < FREEZE_PROBES; k++) {
          if (!lampProbe(pr, x, y, z, h, k === 0 ? 1 : 0.5, L, i)) continue;
          this.from.set(pr[0]!, pr[1]!, pr[2]!);
          this.to.set(pr[3]!, pr[4]!, pr[5]!);
          this.rays++;
          // no landing within reach (a low or wall lamp, or near the reach edge): his shadow may still show, so draw
          // him (light parity over the saving; checker note 2026-10-24)
          if (!lampLanding(pr, this.ray!(this.from, this.to))) return false;
          if (this.seen(c, pr[6]!, pr[7]!, pr[8]!)) return false;
        }
      }
    }
    return true;
  }

  /** Does the camera `c` see the point (px, py, pz) past static geometry? Marks `edge` for a near blocker. */
  private seen(c: Vector3, px: number, py: number, pz: number): boolean {
    this.from.copyFrom(c);
    this.to.set(px, py, pz);
    this.rays++;
    const d = this.ray!(this.from, this.to);
    const t = hyp3(px - c.x, py - c.y, pz - c.z);
    if (d >= t - SLACK) return true;
    if (d >= t - EDGE) this.edge = true;
    return false;
  }

  private fitMemo(n: number): void {
    if (this.memoHidden.length >= n) return;
    const m = Math.max(n, 32);
    this.memoHidden = grow8(this.memoHidden, m);
    this.memoBits = grow32(this.memoBits, m);
    this.memoUrgent = grow8(this.memoUrgent, m);
    this.memoEdge = grow8(this.memoEdge, m);
    this.memoWait = grow16(this.memoWait, m);
    this.memoAge = grow16(this.memoAge, m);
    while (this.memoE.length < m) this.memoE.push(null);
  }

  /** The frame's shadow-casting lights (`readFreezeLights`). */
  private readLights(): void {
    readFreezeLights(this.scene, this.lights, this.atlas?.torch, this.atlas?.chars, this.slotLamp4);
  }

  private thaw(k: number): void {
    const fz = this.frozen;
    const e = fz[k]!;
    if (!e.bodyRig.root.isDisposed()) {
      e.bodyRig.root.setEnabled(true);
      // (artnext C7) his `frame` ran before this evaluation and skipped the solve: pose him now, so this render draws
      // the current pose, not the one at the freeze (a dead or disposed guard: nothing)
      e.thawPose();
    }
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

/** (frzpol) `a` copied into a new array of `m` (the memo grows with the guard list, never per frame). */
function grow8(a: Uint8Array, m: number): Uint8Array {
  const b = new Uint8Array(m);
  b.set(a);
  return b;
}
function grow16(a: Int16Array, m: number): Int16Array {
  const b = new Int16Array(m);
  b.set(a);
  return b;
}
function grow32(a: Uint32Array, m: number): Uint32Array {
  const b = new Uint32Array(m);
  b.set(a);
  return b;
}
