/**
 * In-game benchmark (3.0, pure parts unit-tested): a fixed camera flight through a map's rooms while the AI
 * patrols, frame times recorded, then average and 1% low FPS. Settings > Graphics > Benchmark: the current
 * settings, every preset, render pixel counts of the target displays, or a 10-minute sustained loop (laptops:
 * does the frame rate hold once the machine is hot?).
 */
import type { FixedPreset } from '../core/quality';

export const BENCH = {
  /** Seconds of flight per run (the first `warmup` not counted: shader compiles, shadow maps settling). */
  seconds: 30,
  warmup: 3,
  /** The sustained run (s) and its bucket (s): first vs last bucket. */
  sustained: 600,
  bucket: 60,
  /** Camera height over each room's floor (m). */
  height: 2.2,
};

export type BenchKind = 'current' | 'presets' | 'resolutions' | 'sustained';

export interface BenchRun {
  label: string;
  /** A preset for this run only (null: the player's settings). */
  preset: FixedPreset | null;
  /** Render scale for this run only (null: the player's). */
  scale: number | null;
  seconds: number;
  sustained: boolean;
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
export function benchPlan(kind: BenchKind, outW: number, outH: number): BenchRun[] {
  const run = (label: string, preset: FixedPreset | null = null, scale: number | null = null): BenchRun => ({ label, preset, scale, seconds: BENCH.seconds, sustained: false });
  if (kind === 'presets') return (['high', 'ultra', 'epic'] as const).map((p) => run(p[0]!.toUpperCase() + p.slice(1), p));
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
}

export function benchResult(intervalsMs: readonly number[]): BenchResult {
  const n = intervalsMs.length;
  if (!n) return { frames: 0, avgFps: 0, low1Fps: 0, p50Ms: 0, p99Ms: 0 };
  const sorted = [...intervalsMs].sort((a, b) => a - b);
  const total = sorted.reduce((s, v) => s + v, 0);
  const k = Math.max(1, Math.floor(n * 0.01));
  let worst = 0;
  for (let i = n - k; i < n; i++) worst += sorted[i]!;
  const pct = (p: number): number => sorted[Math.min(n - 1, Math.ceil(p * (n - 1)))]!;
  return { frames: n, avgFps: (1000 * n) / total, low1Fps: (1000 * k) / worst, p50Ms: pct(0.5), p99Ms: pct(0.99) };
}

export function benchText(r: BenchResult, where: string): string {
  return `${where}: average ${r.avgFps.toFixed(0)} fps, 1% low ${r.low1Fps.toFixed(0)} fps (frame p50 ${r.p50Ms.toFixed(1)} ms, p99 ${r.p99Ms.toFixed(1)} ms, ${r.frames} frames)`;
}
