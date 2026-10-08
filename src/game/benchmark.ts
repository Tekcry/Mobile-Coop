import { desktopResolutions, resolutionScale } from '../core/display';
import { hyp2 } from '../core/mathx';
/**
 * In-game benchmark (3.0, pure parts unit-tested): a fixed camera flight through a map's rooms while the AI
 * patrols, frame times recorded, then average and 1% low FPS. Settings > Graphics > Benchmark: the current
 * settings, every preset, render pixel counts of the target displays, or a 10-minute sustained loop (laptops:
 * does the frame rate hold once the machine is hot?).
 */
import { PHONE_FLOOR, PRESET_IDS, type FixedPreset, type GraphicsFeatures, type PhoneCuts, type PhoneLook } from '../core/quality';

export const BENCH = {
  /** Seconds of flight per run (the first `warmup` not counted: shader compiles, shadow maps settling). */
  seconds: 30,
  warmup: 3,
  /** The sustained run (s) and its bucket (s): first vs last bucket. */
  sustained: 600,
  bucket: 60,
  /** A frame longer than this is a hitch (counted per run). */
  longMs: 50,
};

export type BenchKind = 'current' | 'presets' | 'resolutions' | 'sustained' | 'features' | 'phone';

export interface BenchRun {
  label: string;
  /** A preset for this run only (null: the player's settings). */
  preset: FixedPreset | null;
  /** Render scale for this run only (null: the player's). */
  scale: number | null;
  seconds: number;
  sustained: boolean;
  /** 3.1.1 Feature costs: these features changed for this run only (over the player's settings). */
  gfx?: Partial<GraphicsFeatures>;
  /**
   * 3.1.4: every run loads its own match (a graphics change mid-match left the iPhone ~4x slower, so a run after a
   * change measured that, not its settings) - except a `sameMatch` run, which goes on in the last run's match.
   */
  sameMatch?: boolean;
  /** 3.1.4 diagnosis (Feature costs): rebuilt mid-match at the run's start, same settings - the post stack or the shadows. */
  rebuild?: 'post' | 'shadows';
  /** 3.3 Phone check: a phone cut put back for this run. */
  cuts?: Partial<PhoneCuts>;
  /** 3.3.2: a frame cap for this run (phone runs are otherwise uncapped, to show the headroom). */
  cap?: number;
  /** 3.4 Phone check: the 3.3 voxel look for a comparison run (default the light look). */
  look?: PhoneLook;
}

/** A benchmark in progress, carried from one run's match to the next. */
export interface BenchSession {
  kind: BenchKind;
  runs: BenchRun[];
  /** The run this match measures. */
  idx: number;
  /** The finished runs' lines. */
  lines: string[];
  /** 3.1.4: the feedback note updated after every run (its id) and when the benchmark started. */
  note?: string;
  started?: number;
}

/** 3.3.2 Phone check: the capped run's length (s; per-minute averages). */
export const PHONE_HOLD_SECONDS = 180;

/** Feature costs: one flight per run (shorter than the full benchmark: there are up to nine). */
export const FEATURE_SECONDS = 20;

/**
 * Feature costs (3.1.1): the player's settings, then the same with one costly feature off or lower per run - on the
 * device itself, so its GPU says what to cut. Features already off are skipped.
 */
export function featureRuns(f: GraphicsFeatures): { label: string; gfx: Partial<GraphicsFeatures> }[] {
  const out: { label: string; gfx: Partial<GraphicsFeatures> }[] = [];
  if (f.ao) out.push({ label: 'without ambient occlusion', gfx: { ao: false } });
  if (f.volumetrics) out.push({ label: 'without light shafts', gfx: { volumetrics: false } });
  if (f.reflections !== 'off') out.push({ label: 'without reflections', gfx: { reflections: 'off' } });
  if (f.bloom) out.push({ label: 'without bloom', gfx: { bloom: false } });
  if (f.dof) out.push({ label: 'without depth of field', gfx: { dof: false } });
  if (f.shadows !== 'off' && f.shadows !== 'low') out.push({ label: 'shadows Low', gfx: { shadows: 'low' } });
  if (f.postRes === 'full') out.push({ label: 'post effects at half resolution', gfx: { postRes: 'half' } });
  if (f.textures !== 'low') out.push({ label: 'textures Low', gfx: { textures: 'low' } });
  // (3.2: TAA's full-screen resolve, and the fine prop layer - Detail High and up - on the phone)
  if (f.aa === 'taa') out.push({ label: 'anti-aliasing FXAA', gfx: { aa: 'fxaa' } });
  if (f.detail === 'high' || f.detail === 'ultra' || f.detail === 'epic') out.push({ label: 'detail Medium', gfx: { detail: 'medium' } });
  return out;
}

/**
 * Phone check (3.3; 3.4: the light look): the phone look native, at its 75% floor, with the moon's shadow, then the
 * 3.3 voxel look for comparison, the first run again (heat) and a 3 minute hold at 60. Uncapped but the hold (the
 * headroom shows).
 */
export function phoneCheckRuns(): BenchRun[] {
  const run = (label: string, extra: Partial<BenchRun> = {}): BenchRun => ({ label, preset: null, scale: 1, seconds: FEATURE_SECONDS, sustained: false, ...extra });
  return [
    run('phone look, 100%'),
    run('phone look, 75%', { scale: PHONE_FLOOR }),
    // (3.4: is the moon's shadow affordable - moonlight stopped by the roof)
    run('+ moon shadow (1 cascade)', { gfx: { shadows: 'low' } }),
    // (3.4: the comparison - the 3.3 voxel phone look, TAAU from 75%)
    run('3.3 voxel look, 75%', { look: 'voxel', scale: PHONE_FLOOR }),
    // (3.3.1: the first run again - a phone heating up through the check slows every later run; this says by how much)
    run('phone look, 100% again (heat check)'),
    // (3.3.2: what a match does - capped at 60 for 3 minutes, once warm: does 60 hold?)
    { ...run('phone look held at 60, 3 min'), seconds: PHONE_HOLD_SECONDS, sustained: true, cap: 60 },
  ];
}

/**
 * The runs for a benchmark kind. `outW` / `outH` = the output in device pixels at render scale 1 (3.2.1: the monitor
 * on desktop): Resolutions runs the monitor's own resolutions (`desktopResolutions`: a 7680 x 2160 monitor runs 7680 x
 * 2160, 5120 x 1440, 3840 x 1080).
 */
export function benchPlan(kind: BenchKind, outW: number, outH: number, presets: readonly FixedPreset[] = PRESET_IDS, current: GraphicsFeatures | null = null, scale = 1): BenchRun[] {
  const run = (label: string, preset: FixedPreset | null = null, scale: number | null = null): BenchRun => ({ label, preset, scale, seconds: BENCH.seconds, sustained: false });
  if (kind === 'presets') return presets.map((p) => run(p[0]!.toUpperCase() + p.slice(1), p));
  if (kind === 'features') {
    const base = { ...run('current settings'), seconds: FEATURE_SECONDS };
    // (then the settings again, rebuilt mid-match: the post stack, then in the same match the shadows - does a
    // rebuild alone slow the device, and does new shadows put it right?)
    const post: BenchRun = { ...base, label: 'current settings, post effects rebuilt mid-match', rebuild: 'post' };
    const shadows: BenchRun = { ...base, label: 'then shadows rebuilt mid-match', rebuild: 'shadows', sameMatch: true };
    // (3.2: the settings at 75% of the render resolution - frames that speed up say the GPU is the limit)
    const res: BenchRun = { ...run('render scale 75%', null, Math.max(0.5, scale * 0.75)), seconds: FEATURE_SECONDS };
    return [base, res, ...(current ? featureRuns(current) : []).map((r) => ({ ...run(r.label), seconds: FEATURE_SECONDS, gfx: r.gfx })), post, shadows];
  }
  if (kind === 'phone') return phoneCheckRuns();
  if (kind === 'sustained') return [{ ...run(`sustained ${Math.round(BENCH.sustained / 60)} min`), seconds: BENCH.sustained, sustained: true }];
  if (kind === 'resolutions') return desktopResolutions(outW, outH).map((r) => run(`${r.w}x${r.h}`, null, resolutionScale(r.h, outH)));
  return [run('current settings')];
}

/** Sustained drift: the last bucket's average against the first (-0.08 = 8% slower once hot). */
export function sustainedDrift(bucketFps: readonly number[]): number {
  if (bucketFps.length < 2 || !(bucketFps[0]! > 0)) return 0;
  return bucketFps[bucketFps.length - 1]! / bucketFps[0]! - 1;
}

export interface P3 {
  x: number;
  y: number;
  z: number;
}

/** Catmull-Rom through `pts` (closed loop), t in 0..1 over the whole loop. */
export function pathAt(pts: readonly P3[], t: number, out: P3 = { x: 0, y: 0, z: 0 }): P3 {
  const n = pts.length;
  if (n === 0) return out;
  if (n === 1) {
    out.x = pts[0]!.x;
    out.y = pts[0]!.y;
    out.z = pts[0]!.z;
    return out;
  }
  const f = (((t % 1) + 1) % 1) * n;
  const i = Math.floor(f);
  const u = f - i;
  const p0 = pts[(i - 1 + n) % n]!;
  const p1 = pts[i % n]!;
  const p2 = pts[(i + 1) % n]!;
  const p3 = pts[(i + 2) % n]!;
  const u2 = u * u;
  const u3 = u2 * u;
  const cr = (a: number, b: number, c: number, d: number): number => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
  out.x = cr(p0.x, p1.x, p2.x, p3.x);
  out.y = cr(p0.y, p1.y, p2.y, p3.y);
  out.z = cr(p0.z, p1.z, p2.z, p3.z);
  return out;
}

/** 3.2.5 The flight: a steady walk-height glide along the guards' walking routes (doorways, corridors, stairs). */
export const FLIGHT = {
  /** Metres per second along the route (the same pace on every run, so runs see the same views). */
  speed: 2.8,
  /** Spacing of the route's samples (m). */
  step: 0.25,
  /** Eye height over the floor (m), and the gap kept under anything overhead (a lintel, a deck). */
  eye: 1.9,
  overhead: 0.35,
  minEye: 1.25,
  /** Walls are kept this far off where the space allows (m). */
  wall: 1.3,
  /** Smoothing moves no point further than this from the walking route (m). */
  drift: 1,
  /** The view looks this far ahead along the route (m), a little down; with less than `view` of open floor that way
   *  it turns towards the open side. */
  look: 4.5,
  view: 3,
  pitch: -0.08,
  /** A visit that turns back more than this (rad) circles the room's middle instead of reversing on the spot. */
  reverse: 1.9,
};

/** What the flight reads off the level (GameState: the nav grid, one ray up for the headroom). */
export interface FlightNav {
  /** The walkable point nearest (x, z) on the storey nearest y: [x, floor y, z], or null. */
  snap(x: number, y: number, z: number): P3 | null;
  /** Walking waypoints from a to b after a (no ladders or drops; y = the floor), or null. */
  path(a: P3, b: P3): P3[] | null;
  /** The floor at (x, z) on the storey nearest y; NaN where it is not walkable. */
  floor(x: number, z: number, y: number): number;
  /** A straight walkable line from a to b (on a's storey, ending on b's). */
  clear(a: P3, b: P3): boolean;
  /** Free height over the floor point (x, y, z), up to `max`. */
  headroom(x: number, y: number, z: number, max: number): number;
  /** How far the view from the eye (x, y, z) along yaw runs before it meets the level (m; the nav's open floor when
   *  left out). */
  see?(x: number, y: number, z: number, yaw: number): number;
}

/** The route: per sample x, y (the eye), z, yaw, pitch; a closed loop of `n` samples `FLIGHT.step` apart. */
export interface Flight {
  pts: Float32Array;
  n: number;
  length: number;
}

export const FLIGHT_STRIDE = 5;

/**
 * Pure (3.2.5): the benchmark flight through `keys` (room middles; y = a floor height on the wanted storey). The rooms
 * are put in a short tour (nearest neighbour, then 2-opt on walking distance), joined by the guards' walking routes
 * (through doorways, round corners, up stairs - never ladders or drops), a room visited at a dead end circled instead
 * of reversed, the line relaxed off the walls and rounded where it stays walkable, resampled evenly; the eye held at
 * `FLIGHT.eye` over the floor (lowered under anything overhead) and smoothed along the route, and the view a smoothed
 * look ahead. Every sample-to-sample line is walkable.
 */
export function benchFlight(keys: readonly P3[], nav: FlightNav): Flight {
  const ks: P3[] = [];
  for (const k of keys) {
    const p = nav.snap(k.x, k.y, k.z);
    if (p && !ks.some((q) => Math.abs(q.x - p.x) + Math.abs(q.z - p.z) < 0.5 && Math.abs(q.y - p.y) < 1)) ks.push(p);
  }
  // walking legs between every pair (symmetric: walking only)
  const n0 = ks.length;
  const legs: (P3[] | null)[] = new Array(n0 * n0).fill(null);
  const dist = new Float64Array(n0 * n0).fill(Infinity);
  for (let i = 0; i < n0; i++) {
    dist[i * n0 + i] = 0;
    for (let j = i + 1; j < n0; j++) {
      const w = nav.path(ks[i]!, ks[j]!);
      if (!w || !w.length) continue;
      // (the leg ends on the key itself: a dead-end visit is found by it)
      const full = [ks[i]!, ...w.slice(0, -1), ks[j]!];
      let d = 0;
      for (let k = 1; k < full.length; k++) d += hyp2(full[k]!.x - full[k - 1]!.x, full[k]!.z - full[k - 1]!.z);
      legs[i * n0 + j] = full;
      legs[j * n0 + i] = [...full].reverse();
      dist[i * n0 + j] = dist[j * n0 + i] = d;
    }
  }
  // the rooms reachable from the first, in a short loop
  const reach: number[] = [];
  for (let i = 0; i < n0; i++) if (dist[i]! < Infinity) reach.push(i);
  const tour = shortTour(reach, (a, b) => dist[a * n0 + b]!);
  if (tour.length < 2) {
    // one place: a circle round it
    const c = ks[0] ?? { x: 0, y: 0, z: 0 };
    const ring = orbit(c, { x: 1, y: 0, z: 0 }, nav) ?? [c, { x: c.x + 1, y: c.y, z: c.z }];
    return finish(ring, nav);
  }
  // the loop's corner points, with dead-end visits circled
  const line: P3[] = [];
  for (let t = 0; t < tour.length; t++) {
    const leg = legs[tour[t]! * n0 + tour[(t + 1) % tour.length]!]!;
    for (let k = 0; k < leg.length - 1; k++) line.push(leg[k]!);
  }
  const loop = circleReversals(line, ks, tour, nav);
  return finish(loop, nav);
}

/** Nearest-neighbour tour from the first, improved by 2-opt (a closed loop). */
function shortTour(ids: readonly number[], d: (a: number, b: number) => number): number[] {
  if (ids.length < 3) return [...ids];
  const left = ids.slice(1);
  const t = [ids[0]!];
  while (left.length) {
    const cur = t[t.length - 1]!;
    let bi = 0;
    for (let i = 1; i < left.length; i++) if (d(cur, left[i]!) < d(cur, left[bi]!)) bi = i;
    t.push(left.splice(bi, 1)[0]!);
  }
  const n = t.length;
  for (let pass = 0, better = true; better && pass < 50; pass++) {
    better = false;
    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 2; j < n; j++) {
        if (i === 0 && j === n - 1) continue;
        const a = t[i]!;
        const b = t[i + 1]!;
        const c = t[j]!;
        const e = t[(j + 1) % n]!;
        if (d(a, c) + d(b, e) < d(a, b) + d(c, e) - 1e-6) {
          t.splice(i + 1, j - i, ...t.slice(i + 1, j + 1).reverse());
          better = true;
        }
      }
    }
  }
  return t;
}

/** A circle round c (radius 3.5 .. 1.5 m, the largest that is walkable all round), starting and ending on the side `from`
 *  points to, or null. */
function orbit(c: P3, from: P3, nav: FlightNav): P3[] | null {
  const a0 = Math.atan2(from.z, from.x);
  for (const r of [3.5, 3, 2.5, 2, 1.5]) {
    const pts: P3[] = [];
    let ok = true;
    for (let k = 0; k <= 16 && ok; k++) {
      const a = a0 + (k / 16) * Math.PI * 2;
      const x = c.x + Math.cos(a) * r;
      const z = c.z + Math.sin(a) * r;
      const y = nav.floor(x, z, c.y);
      if (y !== y || Math.abs(y - c.y) > 0.6) ok = false;
      else {
        const p = { x, y, z };
        if (pts.length && !nav.clear(pts[pts.length - 1]!, p)) ok = false;
        pts.push(p);
      }
    }
    if (ok && nav.clear(c, pts[0]!)) return pts;
  }
  return null;
}

/** Where the loop reaches a room's middle and turns back (a dead end), the middle becomes a circle round it. */
function circleReversals(line: P3[], ks: readonly P3[], tour: readonly number[], nav: FlightNav): P3[] {
  const out: P3[] = [];
  const n = line.length;
  for (let i = 0; i < n; i++) {
    const p = line[i]!;
    const isKey = tour.some((t) => ks[t] === p);
    if (isKey) {
      const a = line[(i - 1 + n) % n]!;
      const b = line[(i + 1) % n]!;
      const turn = Math.abs(wrapAngle(Math.atan2(b.z - p.z, b.x - p.x) - Math.atan2(p.z - a.z, p.x - a.x)));
      if (turn > FLIGHT.reverse) {
        const ring = orbit(p, { x: a.x - p.x, y: 0, z: a.z - p.z }, nav);
        if (ring && nav.clear(a, ring[0]!) && nav.clear(ring[ring.length - 1]!, b)) {
          out.push(...ring);
          continue;
        }
      }
    }
    out.push(p);
  }
  return out;
}

function wrapAngle(a: number): number {
  return a - Math.PI * 2 * Math.round(a / (Math.PI * 2));
}

/** Even samples along a closed polyline (floors carried along the line). */
function resample(line: readonly P3[], nav: FlightNav): P3[] {
  const out: P3[] = [];
  const n = line.length;
  let carry = 0;
  let fy = line[0]!.y;
  for (let i = 0; i < n; i++) {
    const a = line[i]!;
    const b = line[(i + 1) % n]!;
    const len = hyp2(b.x - a.x, b.z - a.z);
    let s = carry;
    for (; s < len; s += FLIGHT.step) {
      const u = s / len;
      const x = a.x + (b.x - a.x) * u;
      const z = a.z + (b.z - a.z) * u;
      const y = nav.floor(x, z, fy);
      if (y === y && Math.abs(y - fy) < 0.6) fy = y;
      out.push({ x, y: fy, z });
    }
    carry = s - len;
  }
  return out;
}

const RING = 12;
const RING_C = Array.from({ length: RING }, (_, k) => Math.cos((k / RING) * Math.PI * 2));
const RING_S = Array.from({ length: RING }, (_, k) => Math.sin((k / RING) * Math.PI * 2));

/** Relax the line off the walls and round it where it stays walkable, resample, then heights and views. */
function finish(line0: P3[], nav: FlightNav): Flight {
  let pts = resample(line0, nav);
  // (walkable within a stair's rise of the point: stairs are not walls)
  const open = (x: number, z: number, y: number, r: number): boolean => {
    const f = nav.floor(x, z, y);
    return f === f && Math.abs(f - y) < 0.35 + 0.7 * r;
  };
  // Taubin smoothing (a step to the neighbours' average, then a slightly bigger one back: corners round off without
  // the loop shrinking - a plain average would pull the circles and the room visits in), plus a push off the walls
  // within FLIGHT.wall; a move is kept only if the point stays walkable, within FLIGHT.drift of where it started and
  // the lines to both neighbours stay walkable
  {
    const K = 4;
    const n = pts.length;
    const ox = pts.map((p) => p.x);
    const oz = pts.map((p) => p.z);
    for (let it = 0; it < 60; it++) {
      const gain = it % 2 ? -0.53 : 0.5;
      for (let i = 0; i < n; i++) {
        const p = pts[i]!;
        let ax = 0;
        let az = 0;
        for (let k = -K; k <= K; k++) {
          if (!k) continue;
          const q = pts[(i + k + n) % n]!;
          ax += q.x;
          az += q.z;
        }
        let dx = (ax / (2 * K) - p.x) * gain;
        let dz = (az / (2 * K) - p.z) * gain;
        let px = 0;
        let pz = 0;
        for (let k = 0; k < RING; k++) {
          for (let r = 0.5; r <= FLIGHT.wall + 1e-6; r += 0.4) {
            if (!open(p.x + RING_C[k]! * r, p.z + RING_S[k]! * r, p.y, r)) {
              const w = (FLIGHT.wall + 0.2 - r) / FLIGHT.wall;
              px -= RING_C[k]! * w;
              pz -= RING_S[k]! * w;
              break;
            }
          }
        }
        const pm = hyp2(px, pz);
        if (pm > 0) {
          const g = Math.min(0.06, pm * 0.02) / pm;
          dx += px * g;
          dz += pz * g;
        }
        const dm = hyp2(dx, dz);
        if (dm < 1e-4) continue;
        if (dm > 0.15) {
          dx *= 0.15 / dm;
          dz *= 0.15 / dm;
        }
        const c = { x: p.x + dx, y: p.y, z: p.z + dz };
        if (hyp2(c.x - ox[i]!, c.z - oz[i]!) > FLIGHT.drift) continue;
        const f = nav.floor(c.x, c.z, p.y);
        if (f !== f || Math.abs(f - p.y) > 0.6) continue;
        c.y = f;
        if (nav.clear(pts[(i - 1 + n) % n]!, c) && nav.clear(c, pts[(i + 1) % n]!)) pts[i] = c;
      }
    }
  }
  pts = resample(pts, nav);
  const n = pts.length;
  // the eye: over the floor (smoothed along the route), lowered ahead of anything overhead
  const floorY = new Float64Array(n);
  const eye = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const p = pts[i]!;
    floorY[i] = p.y;
    eye[i] = Math.max(FLIGHT.minEye, Math.min(FLIGHT.eye, nav.headroom(p.x, p.y, p.z, FLIGHT.eye + FLIGHT.overhead) - FLIGHT.overhead));
  }
  const W = Math.round(2 / FLIGHT.step);
  const fy = boxBlur(boxBlur(floorY, W), W);
  // (a min over both blurs' reach first, so the average never rises over any sample's limit)
  const ey = boxBlur(boxBlur(minFilter(eye, 2 * W), W), W);
  const ys = new Float64Array(n);
  for (let i = 0; i < n; i++) ys[i] = fy[i]! + Math.min(ey[i]!, eye[i]!);
  // the view: towards a point ahead - turned towards open space where that looks into a wall close by (a tight turn
  // in a small room) - unwrapped, then smoothed
  const L = Math.round(FLIGHT.look / FLIGHT.step);
  const see = (i: number, a: number): number => (nav.see ? nav.see(pts[i]!.x, ys[i]!, pts[i]!.z, a) : viewRun(pts[i]!, a, nav));
  /** The yaw within +-range of a with the longest view (less 2 m a radian turned away). */
  const openYaw = (i: number, a: number, range: number): number => {
    let best = -Infinity;
    let ba = a;
    for (let k = -6; k <= 6; k++) {
      const c = a + (k / 6) * range;
      const score = see(i, c) - 2 * Math.abs(c - a);
      if (score > best) {
        best = score;
        ba = c;
      }
    }
    return ba;
  };
  const yaw = new Float64Array(n);
  const pitch = new Float64Array(n);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const p = pts[i]!;
    const q = pts[(i + L) % n]!;
    let a = Math.atan2(q.x - p.x, q.z - p.z);
    if (see(i, a) < FLIGHT.view) a = openYaw(i, a, Math.PI / 4);
    if (i) a = prev + wrapAngle(a - prev);
    yaw[i] = prev = a;
    pitch[i] = FLIGHT.pitch + Math.atan2(ys[(i + L) % n]! - ys[i]!, FLIGHT.look);
  }
  // (the loop's seam: the unwrapped yaw ends a whole number of turns from where it started)
  const turns = Math.round((yaw[n - 1]! - yaw[0]!) / (Math.PI * 2));
  const seam = turns * Math.PI * 2;
  const blurYaw = (): Float64Array => boxBlur(boxBlur(boxBlur(yaw, W, seam), W, seam), W, seam);
  let ys2 = blurYaw();
  // (smoothing can still turn the view into a wall at a corner: there the raw yaw round it is bent towards the open
  // side, and smoothed again)
  for (let pass = 0; pass < 4; pass++) {
    let bent = 0;
    for (let i = 0; i < n; i++) {
      const v = ys2[i]!;
      if (see(i, v) >= FLIGHT.view * 0.6) continue;
      const d = openYaw(i, v, Math.PI / 3) - v;
      if (Math.abs(d) < 1e-3) continue;
      bent++;
      for (let k = -W; k <= W; k++) {
        const j = i + k;
        const m = Math.floor(j / n);
        yaw[j - m * n] = yaw[j - m * n]! + d * 0.5 * (1 - Math.abs(k) / (W + 1));
      }
    }
    if (!bent) break;
    ys2 = blurYaw();
  }
  const ps = boxBlur(boxBlur(pitch, W), W);
  const out = new Float32Array(n * FLIGHT_STRIDE);
  for (let i = 0; i < n; i++) {
    const p = pts[i]!;
    out.set([p.x, ys[i]!, p.z, ys2[i]!, ps[i]!], i * FLIGHT_STRIDE);
  }
  return { pts: out, n, length: n * FLIGHT.step };
}

/** How far the floor runs open from p along yaw a (m, up to 2 x FLIGHT.view): what the view sees before a wall. */
function viewRun(p: P3, a: number, nav: FlightNav): number {
  const sx = Math.sin(a);
  const sz = Math.cos(a);
  let y = p.y;
  const max = FLIGHT.view * 2;
  for (let d = 0.5; d <= max; d += 0.5) {
    const f = nav.floor(p.x + sx * d, p.z + sz * d, y);
    if (f !== f || Math.abs(f - y) > 0.6) return d - 0.5;
    y = f;
  }
  return max;
}

/** Moving average over +-w on a closed loop (`seam`: what a value gains going once round, e.g. turns of yaw). */
function boxBlur(v: Float64Array, w: number, seam = 0): Float64Array {
  const n = v.length;
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let k = -w; k <= w; k++) {
      const j = i + k;
      const m = Math.floor(j / n);
      s += v[j - m * n]! + m * seam;
    }
    out[i] = s / (2 * w + 1);
  }
  return out;
}

function minFilter(v: Float64Array, w: number): Float64Array {
  const n = v.length;
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let m = Infinity;
    for (let k = -w; k <= w; k++) m = Math.min(m, v[(((i + k) % n) + n) % n]!);
    out[i] = m;
  }
  return out;
}

/** The camera at `dist` metres along the flight (looping): position + yaw / pitch, interpolated between samples. */
export function flightAt(f: Flight, dist: number, out: { x: number; y: number; z: number; yaw: number; pitch: number }): typeof out {
  if (!f.n) return out;
  const s = (((dist / FLIGHT.step) % f.n) + f.n) % f.n;
  const i = Math.floor(s);
  const u = s - i;
  const a = i * FLIGHT_STRIDE;
  const b = ((i + 1) % f.n) * FLIGHT_STRIDE;
  const P = f.pts;
  out.x = P[a]! + (P[b]! - P[a]!) * u;
  out.y = P[a + 1]! + (P[b + 1]! - P[a + 1]!) * u;
  out.z = P[a + 2]! + (P[b + 2]! - P[a + 2]!) * u;
  out.yaw = P[a + 3]! + wrapAngle(P[b + 3]! - P[a + 3]!) * u;
  out.pitch = P[a + 4]! + (P[b + 4]! - P[a + 4]!) * u;
  return out;
}

export interface BenchResult {
  frames: number;
  avgFps: number;
  /** Average FPS over the slowest 1% of frames. */
  low1Fps: number;
  p50Ms: number;
  p99Ms: number;
  /** Main-thread CPU per frame (the loop's update + render submission), p95 ms; 0 when not measured. */
  cpuP95Ms: number;
  /** Frames over `BENCH.longMs` (hitches). */
  long: number;
}

export function benchResult(intervalsMs: readonly number[], cpuMs: readonly number[] = []): BenchResult {
  const n = intervalsMs.length;
  if (!n) return { frames: 0, avgFps: 0, low1Fps: 0, p50Ms: 0, p99Ms: 0, cpuP95Ms: 0, long: 0 };
  const sorted = [...intervalsMs].sort((a, b) => a - b);
  const total = sorted.reduce((s, v) => s + v, 0);
  const k = Math.max(1, Math.floor(n * 0.01));
  let worst = 0;
  for (let i = n - k; i < n; i++) worst += sorted[i]!;
  const pct = (p: number): number => sorted[Math.min(n - 1, Math.ceil(p * (n - 1)))]!;
  const cs = [...cpuMs].sort((a, b) => a - b);
  const cpuP95Ms = cs.length ? cs[Math.min(cs.length - 1, Math.ceil(0.95 * (cs.length - 1)))]! : 0;
  let long = 0;
  for (let i = 0; i < n; i++) if (intervalsMs[i]! > BENCH.longMs) long++;
  return { frames: n, avgFps: (1000 * n) / total, low1Fps: (1000 * k) / worst, p50Ms: pct(0.5), p99Ms: pct(0.99), cpuP95Ms, long };
}

/** Seconds of flight per section in a run's line (3.3.1: where along the route the frame rate drops). */
export const SECTION_SECONDS = 2.5;

/** "by 2.5 s (7 m): 70 68 ... 41" - the average fps of each section of the flight after the warm-up. */
export function sectionText(fps: readonly number[]): string {
  return fps.length ? `by ${SECTION_SECONDS} s (${Math.round(SECTION_SECONDS * FLIGHT.speed)} m): ${fps.map((f) => Math.round(f)).join(' ')}` : '';
}

export function benchText(r: BenchResult, where: string, shaders = -1): string {
  const extra = `${r.long ? `; ${r.long} frames over ${BENCH.longMs} ms` : ''}${shaders > 0 ? `; ${shaders} shaders compiled` : ''}`;
  return `${where}: average ${r.avgFps.toFixed(0)} fps, 1% low ${r.low1Fps.toFixed(0)} fps (frame p50 ${r.p50Ms.toFixed(1)} ms, p99 ${r.p99Ms.toFixed(1)} ms, ${r.frames} frames${r.cpuP95Ms ? `; main thread p95 ${r.cpuP95Ms.toFixed(2)} ms` : ''}${extra})`;
}
