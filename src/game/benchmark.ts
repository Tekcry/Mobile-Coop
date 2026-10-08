/**
 * In-game benchmark (3.0, pure parts unit-tested): a fixed camera flight through a map's rooms while the AI
 * patrols, frame times recorded, then average and 1% low FPS. Settings > Graphics > Benchmark: the current
 * settings, every preset, render pixel counts of the target displays, or a 10-minute sustained loop (laptops:
 * does the frame rate hold once the machine is hot?).
 */
import { PRESET_IDS, type FixedPreset, type GraphicsFeatures } from '../core/quality';

export const BENCH = {
  /** Seconds of flight per run (the first `warmup` not counted: shader compiles, shadow maps settling). */
  seconds: 30,
  warmup: 3,
  /** The sustained run (s) and its bucket (s): first vs last bucket. */
  sustained: 600,
  bucket: 60,
  /** Camera height over each room's floor (m). */
  height: 2.2,
  /** A frame longer than this is a hitch (counted per run). */
  longMs: 50,
};

export type BenchKind = 'current' | 'presets' | 'resolutions' | 'sustained' | 'features';

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

/** Target displays measured by render pixel count (the window's aspect is kept). */
export const BENCH_RESOLUTIONS = [
  { label: '2560x1600', w: 2560, h: 1600 },
  { label: '3840x2160 (4K)', w: 3840, h: 2160 },
  { label: '7680x2160 (32:9)', w: 7680, h: 2160 },
] as const;

/**
 * The runs for a benchmark kind. `outW` / `outH` = the output in device pixels at render scale 1: a resolution is
 * included when it is within render scale 2 of it (a 1600p laptop reaches 7680 x 2160's pixel count at ~2.0).
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
  if (kind === 'sustained') return [{ ...run(`sustained ${Math.round(BENCH.sustained / 60)} min`), seconds: BENCH.sustained, sustained: true }];
  if (kind === 'resolutions') {
    const out = [run(`${outW}x${outH} (output)`, null, 1)];
    const px = Math.max(1, outW * outH);
    for (const r of BENCH_RESOLUTIONS) {
      const k = Math.sqrt((r.w * r.h) / px);
      if (Math.abs(k - 1) > 0.03 && k <= 2.05) out.push(run(`${r.label} pixel count`, null, k));
    }
    return out;
  }
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

export function benchText(r: BenchResult, where: string, shaders = -1): string {
  const extra = `${r.long ? `; ${r.long} frames over ${BENCH.longMs} ms` : ''}${shaders > 0 ? `; ${shaders} shaders compiled` : ''}`;
  return `${where}: average ${r.avgFps.toFixed(0)} fps, 1% low ${r.low1Fps.toFixed(0)} fps (frame p50 ${r.p50Ms.toFixed(1)} ms, p99 ${r.p99Ms.toFixed(1)} ms, ${r.frames} frames${r.cpuP95Ms ? `; main thread p95 ${r.cpuP95Ms.toFixed(2)} ms` : ''}${extra})`;
}
