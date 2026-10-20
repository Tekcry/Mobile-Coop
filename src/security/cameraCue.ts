/**
 * The security camera vision cue (camera-cue, M1 "Always, faint"): pure maths, no Babylon / DOM, unit-tested.
 *
 * A faint red scan grid on the surfaces a camera sees. The surfaces come from the camera's own perception: rays from
 * the lens along a fixed angular grid that spans the whole sweep (`cueSpan`), against the same static colliders and
 * the same `CAMERA` field of view and range as detection (`inFrame` + the `G.STATIC` ray in `securitySystem.ts`). The
 * hits become one world-space mesh per camera (`cueMesh`); its shader keeps only the part inside the current yaw's
 * frame (`cueEdge`, mirrored in GLSL by `CUE_MASK_GLSL`), so the footprint sweeps with the pan for free. Render only:
 * gameplay never reads any of it, and it is never a light (light parity is unchanged).
 */
import { CAMERA } from '../config/security';
import type { CameraMode, CamMeter } from './camera';
import type { CameraDevice } from './data';

const DEG = Math.PI / 180;

/** The cue's look and budget (render only; the frame numbers are the camera's own, `CAMERA`). */
export const CUE = {
  /** Angular spacing of the surface samples (deg): ~0.26 m at 10 m, ~0.47 m at the 18 m range. */
  stepDeg: 1.5,
  /** Rays reach this far past the range so the range arc is cut cleanly in the shader. */
  over: 1.08,
  /** A vertex sits this far back from its hit toward the lens (m), with the material's depth offset: no z-fight. */
  lift: 0.03,
  /** Neighbouring hits are joined when 1/distance changes by at most 1.6 sample steps per this many metres: any plane
   *  at least this far from the lens stays joined however grazing (on a plane 1/d changes at most step / its
   *  distance), while an occluder's silhouette (say 8 m in front of 12 m) breaks. */
  joinNear: 1,
  /** Projected grid cell (deg, in the camera's own angles: the lines slide over the surfaces as it pans). */
  gridDeg: 2.5,
  /** Line strength normally (additive), and the faint fill between lines. */
  line: 0.16,
  fill: 0.025,
  /** Multiplier in electro vision (the cue reads as a live device there). */
  electro: 3,
  /** Peak strength of the pulsing frame edge while the camera sees a player. */
  edge: 0.5,
  /** Width of the frame edge as a fraction of the half field / range. */
  edgeWidth: 0.1,
  pulseHz: 1.6,
  /** Seconds to fade out (jammed, off, looped, shot) and back in (online). */
  fadeOut: 0.35,
  fadeIn: 0.8,
  /** The seen pulse eases in and out over this (s), so a 4 Hz think does not flicker it. */
  seenEase: 0.2,
  /** Rays per render frame: the first bake, then the refresh (doors and breakables are static colliders that move). */
  bakeRays: 512,
  refreshRays: 96,
  refreshRaysMin: 32,
  /** A refreshed hit that moved more than this (m) rebuilds the camera's mesh. */
  rebuildEps: 0.05,
} as const;

/** The angular sample grid of one camera: world azimuth (0 faces +Z, 90 deg faces +X) and elevation from level. */
export interface CueSpan {
  az0: number;
  el0: number;
  step: number;
  cols: number;
  rows: number;
}

/** The sample grid covering every yaw the camera can hold, plus half a field each side, and the vertical field. */
export function cueSpan(def: Pick<CameraDevice, 'facing' | 'sweep'>, stepDeg: number = CUE.stepDeg): CueSpan {
  const a = def.sweep ? Math.min(def.sweep[0], def.sweep[1]) * DEG : def.facing * DEG;
  const b = def.sweep ? Math.max(def.sweep[0], def.sweep[1]) * DEG : def.facing * DEG;
  const step = stepDeg * DEG;
  const az0 = a - CAMERA.hFov / 2;
  const el0 = -CAMERA.vFov / 2;
  const cols = Math.ceil((b - a + CAMERA.hFov) / step - 1e-9) + 1;
  const rows = Math.ceil(CAMERA.vFov / step - 1e-9) + 1;
  return { az0, el0, step, cols, rows };
}

/** Unit direction of sample (col, row) into `out` [x, y, z] (the `inFrame` convention: az = atan2(x, z)). */
export function cueDir(s: CueSpan, col: number, row: number, out: [number, number, number]): [number, number, number] {
  const az = s.az0 + col * s.step;
  const el = s.el0 + row * s.step;
  const ce = Math.cos(el);
  out[0] = Math.sin(az) * ce;
  out[1] = Math.sin(el);
  out[2] = Math.cos(az) * ce;
  return out;
}

/** How far each sample ray is cast (m). */
export function cueReach(): number {
  return CAMERA.range * CUE.over;
}

const MESH_DIR: [number, number, number] = [0, 0, 0];

function joined(a: number, b: number, reach: number, tol: number): boolean {
  if (a >= reach || b >= reach) return false;
  return Math.abs(1 / a - 1 / b) <= tol;
}

/**
 * Fill the mesh from the hit distances (`dist[row * cols + col]`, `>= cueReach()` = no hit). `pos` holds 3 floats per
 * sample, `idx` 6 per grid cell; a cell whose corners are not all joined surface writes degenerate triangles (fixed
 * buffer sizes, so a rebuild never reallocates). Returns the number of live triangles.
 */
export function cueMesh(s: CueSpan, dist: Float32Array, lx: number, ly: number, lz: number, pos: Float32Array, idx: Uint32Array): number {
  const reach = cueReach();
  const d = MESH_DIR;
  for (let r = 0; r < s.rows; r++) {
    for (let c = 0; c < s.cols; c++) {
      const i = r * s.cols + c;
      const k = Math.min(dist[i]!, reach) - CUE.lift;
      cueDir(s, c, r, d);
      pos[i * 3] = lx + d[0] * k;
      pos[i * 3 + 1] = ly + d[1] * k;
      pos[i * 3 + 2] = lz + d[2] * k;
    }
  }
  const tol = (1.6 * s.step) / CUE.joinNear;
  let tris = 0;
  let o = 0;
  for (let r = 0; r < s.rows - 1; r++) {
    for (let c = 0; c < s.cols - 1; c++) {
      const i00 = r * s.cols + c;
      const i10 = i00 + 1;
      const i01 = i00 + s.cols;
      const i11 = i01 + 1;
      const d00 = dist[i00]!;
      const d10 = dist[i10]!;
      const d01 = dist[i01]!;
      const d11 = dist[i11]!;
      const t1 = joined(d00, d10, reach, tol) && joined(d10, d11, reach, tol) && joined(d00, d11, reach, tol);
      const t2 = joined(d00, d11, reach, tol) && joined(d11, d01, reach, tol) && joined(d00, d01, reach, tol);
      idx[o] = t1 ? i00 : 0;
      idx[o + 1] = t1 ? i11 : 0;
      idx[o + 2] = t1 ? i10 : 0;
      idx[o + 3] = t2 ? i00 : 0;
      idx[o + 4] = t2 ? i01 : 0;
      idx[o + 5] = t2 ? i11 : 0;
      o += 6;
      tris += (t1 ? 1 : 0) + (t2 ? 1 : 0);
    }
  }
  return tris;
}

function wrap(a: number): number {
  let x = a;
  while (x > Math.PI) x -= 2 * Math.PI;
  while (x < -Math.PI) x += 2 * Math.PI;
  return x;
}

/**
 * The shader's frame test (`CUE_MASK_GLSL`) in TS: -1 outside the camera's frame at `yaw` (exactly `inFrame`), else
 * how near the frame's edge the point is, 0 (deep inside) .. 1 (on the edge: field sides, top, bottom or range).
 */
export function cueEdge(yaw: number, cx: number, cy: number, cz: number, px: number, py: number, pz: number): number {
  const dx = px - cx;
  const dy = py - cy;
  const dz = pz - cz;
  const h = Math.sqrt(dx * dx + dz * dz);
  const dist = Math.sqrt(h * h + dy * dy);
  if (dist > CAMERA.range || h < 1e-6) return -1;
  const ax = Math.abs(wrap(Math.atan2(dx, dz) - yaw)) / (CAMERA.hFov / 2);
  const ay = Math.abs(Math.atan2(dy, h)) / (CAMERA.vFov / 2);
  if (ax > 1 || ay > 1) return -1;
  const e = Math.max(ax, ay, dist / CAMERA.range);
  const w = CUE.edgeWidth;
  const t = Math.min(1, Math.max(0, (e - (1 - w)) / w));
  return t * t * (3 - 2 * t);
}

/** GLSL mirror of `cueEdge` (uniforms: `lens` xyz, `cam` = yaw, half h-field, half v-field, range; `edgeW`). */
export const CUE_MASK_GLSL = `
float cueEdge(vec3 p, vec3 lens, vec4 cam, float edgeW) {
  vec3 d = p - lens;
  float h = length(d.xz);
  float dist = length(d);
  if (dist > cam.w || h < 1e-6) return -1.0;
  float a = atan(d.x, d.z) - cam.x;
  a = mod(a + 3.14159265, 6.2831853) - 3.14159265;
  float ax = abs(a) / cam.y;
  float ay = abs(atan(d.y, h)) / cam.z;
  if (ax > 1.0 || ay > 1.0) return -1.0;
  float e = max(max(ax, ay), dist / cam.w);
  return smoothstep(1.0 - edgeW, 1.0, e);
}`;

/** One camera's cue animation. */
export interface CueState {
  /** Shown amount 0..1 (1 while the camera sees, 0 when jammed / off / looped / shot). */
  a: number;
  /** The camera's own "sees a player" state now (from its meters). */
  seen: boolean;
  /** Eased seen amount 0..1, the edge pulse's envelope. */
  s: number;
  /** Clock for the pulse (s). */
  t: number;
}

export function newCue(): CueState {
  return { a: 0, seen: false, s: 0, t: 0 };
}

/** Advance a cue: it follows the camera's mode (fades) and its own seen state (pulse envelope). */
export function stepCue(c: CueState, dt: number, mode: CameraMode, seen: boolean): void {
  const on = mode === 'online';
  c.a = on ? Math.min(1, c.a + dt / CUE.fadeIn) : Math.max(0, c.a - dt / CUE.fadeOut);
  c.seen = on && seen;
  c.s = c.seen ? Math.min(1, c.s + dt / CUE.seenEase) : Math.max(0, c.s - dt / CUE.seenEase);
  c.t += dt;
  if (c.t > 1000) c.t -= 1000;
}

/** Line strength for the shader (0 = nothing drawn). */
export function cueStrength(c: CueState, electro: boolean): number {
  return c.a * (electro ? CUE.electro : 1);
}

/** Edge pulse strength for the shader: 0 unless the camera sees a player, then a slow throb. */
export function cuePulse(c: CueState): number {
  const ph = 0.5 + 0.5 * Math.sin(c.t * CUE.pulseHz * 2 * Math.PI);
  return c.a * c.s * CUE.edge * (0.35 + 0.65 * ph);
}

let anySeen = false;
function visitMeter(m: CamMeter): void {
  if (m.sinceSeen === 0) anySeen = true;
}

/** The camera's own "sees a player" state: a meter whose player was seen at the last think (no allocation). */
export function camSeesAny(meters: ReadonlyMap<string, CamMeter>): boolean {
  anySeen = false;
  meters.forEach(visitMeter);
  return anySeen;
}
