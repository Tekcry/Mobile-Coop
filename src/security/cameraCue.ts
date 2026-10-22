/**
 * The security camera vision cue (camera-cue, M1 "Always, faint"): pure maths, no Babylon / DOM, unit-tested.
 *
 * A faint red scan grid on the surfaces a camera sees. The surfaces come from the camera's own perception: rays from
 * the lens along a fixed angular grid that spans the whole sweep (`cueSpan`), against the same static colliders and
 * the same field of view, pitch and range as detection (`CAMERA` fields, `camPitch` / `camRange` of the camera's data:
 * `inFrame` + the `G.STATIC` ray in `securitySystem.ts`; sector-fixes C, item 3). The
 * hits become one world-space mesh per camera (`cueMesh`); its shader keeps only the part inside the current yaw's
 * frame (`cueEdge`, mirrored in GLSL by `CUE_MASK_GLSL`), so the footprint sweeps with the pan for free. Render only:
 * gameplay never reads any of it, and it is never a light (light parity is unchanged).
 */
import { CAMERA } from '../config/security';
import { camPitch, type CameraMode, type CamMeter } from './camera';
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
  /** Line strength normally (additive), and the faint fill between lines, in the red ink. (sector-fixes C, item 4: "very
   *  subtle": 0.16 / 0.025 -> 0.055 / 0.006, and the lines drawn thinner, `lineW`.) */
  line: 0.055,
  fill: 0.006,
  /** Line width in pixels (the shader's anti-aliased line: 1 was the camera-cue look, under it is a hairline). */
  lineW: 0.6,
  ink: [1.0, 0.07, 0.04] as const,
  /** (camera-cue fix) Electro: its post maps the scene's luma to navy and glows only above `ELECTRO.glowFrom` (0.5), so
   *  a red line (luma ~0.27 x strength) vanished. There the cue writes white ink (luma 1): the lines land in the glow
   *  band (0.72, a clear light lattice), the fill stays under it (0.05, a faint sheen). */
  electroInk: [1.0, 1.0, 1.0] as const,
  electroLine: 0.72,
  electroFill: 0.05,
  /** Width of the frame edge band `cueEdge` reports, as a fraction of the half field / range. (marlow-bays item 6: the
   *  pulsing red frame edge drawn there while the camera saw a player is gone; the cue is the grid only.) */
  edgeWidth: 0.1,
  /** Seconds to fade out (jammed, off, looped, shot) and back in (online). */
  fadeOut: 0.35,
  fadeIn: 0.8,
  /** Rays per fixed step (host and client alike, `FIXED_DT`): the first bake, then the refresh (doors and breakables are
   *  static colliders that move). */
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

/** The sample grid covering every yaw the camera can hold, plus half a field each side, and the vertical field about its pitch. */
export function cueSpan(def: Pick<CameraDevice, 'facing' | 'sweep' | 'y' | 'aim'>, stepDeg: number = CUE.stepDeg): CueSpan {
  const a = def.sweep ? Math.min(def.sweep[0], def.sweep[1]) * DEG : def.facing * DEG;
  const b = def.sweep ? Math.max(def.sweep[0], def.sweep[1]) * DEG : def.facing * DEG;
  const step = stepDeg * DEG;
  const az0 = a - CAMERA.hFov / 2;
  const el0 = -camPitch(def) - CAMERA.vFov / 2;
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

/** How far each sample ray is cast (m) for a camera of detection range `range` (`camRange`). */
export function cueReach(range: number = CAMERA.range): number {
  return range * CUE.over;
}


const MESH_DIR: [number, number, number] = [0, 0, 0];

function joined(a: number, b: number, reach: number, tol: number): boolean {
  if (a >= reach || b >= reach) return false;
  return Math.abs(1 / a - 1 / b) <= tol;
}

/**
 * Fill the mesh from the hit distances (`dist[row * cols + col]`, `>= reach` = no hit; `reach` = `cueReach(range)`). `pos` holds 3 floats per
 * sample, `idx` 6 per grid cell; a cell whose corners are not all joined surface writes degenerate triangles (fixed
 * buffer sizes, so a rebuild never reallocates). Returns the number of live triangles.
 */
export function cueMesh(s: CueSpan, dist: Float32Array, lx: number, ly: number, lz: number, pos: Float32Array, idx: Uint32Array, reach: number = cueReach()): number {
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
 * The shader's frame test (`CUE_MASK_GLSL`) in TS: -1 outside the camera's frame at `yaw`, `pitch` and `range` (exactly
 * `inFrame` with the same numbers), else how near the frame's edge the point is, 0 (deep inside) .. 1 (on the edge:
 * field sides, top, bottom or range).
 */
export function cueEdge(yaw: number, cx: number, cy: number, cz: number, px: number, py: number, pz: number, pitch = 0, range: number = CAMERA.range): number {
  const dx = px - cx;
  const dy = py - cy;
  const dz = pz - cz;
  const h = Math.sqrt(dx * dx + dz * dz);
  const dist = Math.sqrt(h * h + dy * dy);
  if (dist > range || h < 1e-6) return -1;
  const ax = Math.abs(wrap(Math.atan2(dx, dz) - yaw)) / (CAMERA.hFov / 2);
  const ay = Math.abs(Math.atan2(dy, h) + pitch) / (CAMERA.vFov / 2);
  if (ax > 1 || ay > 1) return -1;
  const e = Math.max(ax, ay, dist / range);
  const w = CUE.edgeWidth;
  const t = Math.min(1, Math.max(0, (e - (1 - w)) / w));
  return t * t * (3 - 2 * t);
}

/** GLSL mirror of `cueEdge` (uniforms: `lens` xyz, `cam` = yaw, half h-field, half v-field, range; `pitch` (+ down); `edgeW`). */
export const CUE_MASK_GLSL = `
float cueEdge(vec3 p, vec3 lens, vec4 cam, float pitch, float edgeW) {
  vec3 d = p - lens;
  float h = length(d.xz);
  float dist = length(d);
  if (dist > cam.w || h < 1e-6) return -1.0;
  float a = atan(d.x, d.z) - cam.x;
  a = mod(a + 3.14159265, 6.2831853) - 3.14159265;
  float ax = abs(a) / cam.y;
  float ay = abs(atan(d.y, h) + pitch) / cam.z;
  if (ax > 1.0 || ay > 1.0) return -1.0;
  float e = max(max(ax, ay), dist / cam.w);
  return smoothstep(1.0 - edgeW, 1.0, e);
}`;

/** One camera's cue animation. */
export interface CueState {
  /** Shown amount 0..1 (1 while the camera sees, 0 when jammed / off / looped / shot). */
  a: number;
  /** The camera's own "sees a player" state now (from its meters; the test view reads it, the look does not). */
  seen: boolean;
}

export function newCue(): CueState {
  return { a: 0, seen: false };
}

/** Advance a cue: it follows the camera's mode (fades) and records its own seen state. */
export function stepCue(c: CueState, dt: number, mode: CameraMode, seen: boolean): void {
  const on = mode === 'online';
  c.a = on ? Math.min(1, c.a + dt / CUE.fadeIn) : Math.max(0, c.a - dt / CUE.fadeOut);
  c.seen = on && seen;
}

/** Shown amount for the shader (0 = nothing drawn); the look itself is `cueInk`. */
export function cueStrength(c: CueState): number {
  return c.a;
}

/** The cue's ink: colour, line and fill strengths (normal: very subtle red, thin lines; electro: white, the stronger look). */
export interface CueInk {
  rgb: readonly [number, number, number];
  line: number;
  fill: number;
  /** Line width (px). */
  width: number;
}

const INK_NORMAL: CueInk = { rgb: CUE.ink, line: CUE.line, fill: CUE.fill, width: CUE.lineW };
const INK_ELECTRO: CueInk = { rgb: CUE.electroInk, line: CUE.electroLine, fill: CUE.electroFill, width: 1 };

export function cueInk(electro: boolean): CueInk {
  return electro ? INK_ELECTRO : INK_NORMAL;
}

/** Rec. 709 luma (the post's `dot(c, vec3(0.2126, 0.7152, 0.0722))`). */
export function luma709(rgb: readonly [number, number, number]): number {
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
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
