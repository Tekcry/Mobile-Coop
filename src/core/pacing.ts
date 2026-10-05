/**
 * Frame pacing (pure, allocation free after construction): display refresh detection, frame-time
 * percentiles and drops against the refresh budget, and a hysteresis resolution scaler for when the
 * GPU (not the CPU) misses the budget. 120 Hz phones get an 8.33 ms budget; Safari may still cap
 * requestAnimationFrame at 60 Hz, which the detector then reports.
 */

const STANDARD_HZ = [30, 48, 50, 60, 72, 75, 90, 100, 120, 144, 165, 240] as const;

/** Snap a measured frame interval to the nearest common refresh rate (within 7%), else round. */
export function snapHz(intervalMs: number): number {
  if (!(intervalMs > 0)) return 60;
  const hz = 1000 / intervalMs;
  let best = Math.round(hz);
  let bestErr = Infinity;
  for (const s of STANDARD_HZ) {
    const err = Math.abs(hz - s) / s;
    if (err < bestErr) {
      bestErr = err;
      best = s;
    }
  }
  return bestErr < 0.07 ? best : Math.round(hz);
}

/** Value at percentile p of the sorted first n values. */
function pick(s: Float32Array, n: number, p: number): number {
  return s[Math.min(n - 1, Math.floor(p * n))]!;
}

/** Median of the first `n` values of `src`, using `scratch` (no allocation). */
function median(src: Float32Array, n: number, scratch: Float32Array): number {
  if (n <= 0) return 0;
  const s = scratch.subarray(0, n);
  s.set(src.subarray(0, n));
  s.sort();
  return n % 2 ? s[(n - 1) >> 1]! : (s[n / 2 - 1]! + s[n / 2]!) / 2;
}

/**
 * Refresh-rate detector: medians rAF intervals (skipping the first, hitchy frames). Re-detects when
 * the display rate changes (low-power mode, ProMotion throttling): a new median that disagrees for a
 * full window replaces the old value.
 */
export class RefreshDetector {
  private buf: Float32Array;
  private scratch: Float32Array;
  private n = 0;
  private skip: number;
  hz = 0;

  constructor(
    private window = 90,
    skip = 10,
  ) {
    this.buf = new Float32Array(window);
    this.scratch = new Float32Array(window);
    this.skip = skip;
  }

  get ready(): boolean {
    return this.hz > 0;
  }

  /** Feed one rAF interval (ms). Returns true when the detected rate changed. */
  push(intervalMs: number): boolean {
    if (this.skip > 0) {
      this.skip--;
      return false;
    }
    // ignore hitches and background-tab gaps
    if (!(intervalMs > 2) || intervalMs > 100) return false;
    this.buf[this.n++] = intervalMs;
    if (this.n < this.window) return false;
    this.n = 0;
    const hz = snapHz(median(this.buf, this.window, this.scratch));
    if (hz === this.hz) return false;
    this.hz = hz;
    return true;
  }

  reset(): void {
    this.n = 0;
    this.skip = 10;
    this.hz = 0;
  }
}

export interface PacingSnapshot {
  hz: number;
  budgetMs: number;
  p50: number;
  p95: number;
  p99: number;
  worst: number;
  cpuP50: number;
  cpuP95: number;
  /** Share of frames that took over 1.5x the budget (visible stutter). */
  dropShare: number;
  count: number;
}

export function emptySnapshot(): PacingSnapshot {
  return { hz: 0, budgetMs: 0, p50: 0, p95: 0, p99: 0, worst: 0, cpuP50: 0, cpuP95: 0, dropShare: 0, count: 0 };
}

/** Rolling frame / CPU time statistics (ring buffers). */
export class FrameStats {
  readonly frame: Float32Array;
  readonly cpu: Float32Array;
  private scratch: Float32Array;
  /** Write index and number of valid samples. */
  head = 0;
  count = 0;

  constructor(readonly capacity = 240) {
    this.frame = new Float32Array(capacity);
    this.cpu = new Float32Array(capacity);
    this.scratch = new Float32Array(capacity);
  }

  push(frameMs: number, cpuMs: number): void {
    this.frame[this.head] = frameMs;
    this.cpu[this.head] = cpuMs;
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) this.count++;
  }

  clear(): void {
    this.head = 0;
    this.count = 0;
  }

  /** Percentiles into `out` (no allocation). */
  snapshot(hz: number, out: PacingSnapshot): PacingSnapshot {
    const n = this.count;
    const budget = hz > 0 ? 1000 / hz : 1000 / 60;
    out.hz = hz;
    out.budgetMs = budget;
    out.count = n;
    if (!n) {
      out.p50 = out.p95 = out.p99 = out.worst = out.cpuP50 = out.cpuP95 = out.dropShare = 0;
      return out;
    }
    const s = this.scratch.subarray(0, n);
    s.set(this.frame.subarray(0, n));
    s.sort();
    out.p50 = pick(s, n, 0.5);
    out.p95 = pick(s, n, 0.95);
    out.p99 = pick(s, n, 0.99);
    out.worst = s[n - 1]!;
    let drops = 0;
    for (let i = 0; i < n; i++) if (s[i]! > budget * 1.5) drops++;
    out.dropShare = drops / n;
    s.set(this.cpu.subarray(0, n));
    s.sort();
    out.cpuP50 = pick(s, n, 0.5);
    out.cpuP95 = pick(s, n, 0.95);
    return out;
  }
}

export interface ScalerTuning {
  min: number;
  max: number;
  step: number;
  /** Seconds over budget before stepping down / with headroom before stepping up. */
  downAfter: number;
  upAfter: number;
  /** Seconds after a change during which nothing changes again (hysteresis). */
  cooldown: number;
}

export const SCALER_TUNING: ScalerTuning = { min: 0.6, max: 1, step: 0.1, downAfter: 0.75, upAfter: 4, cooldown: 1.5 };

/**
 * Dynamic resolution within a quality level. GPU-bound frames (over budget while the CPU part is
 * well under it) step the render scale down; long stretches on budget with an idle CPU step back up.
 * Separate down/up thresholds, dwell times and a cooldown keep it from oscillating.
 */
export class ResolutionScaler {
  scale = 1;
  private overT = 0;
  private underT = 0;
  private cool = 0;

  constructor(private tune: ScalerTuning = SCALER_TUNING) {
    this.scale = tune.max;
  }

  reset(): void {
    this.scale = this.tune.max;
    this.overT = 0;
    this.underT = 0;
    this.cool = 0;
  }

  /** Returns true when `scale` changed. */
  push(frameMs: number, cpuMs: number, budgetMs: number, dt: number): boolean {
    const t = this.tune;
    if (this.cool > 0) {
      // let the new resolution settle before judging it
      this.cool = Math.max(0, this.cool - dt);
      this.overT = 0;
      this.underT = 0;
      return false;
    }
    const gpuBound = frameMs > budgetMs * 1.2 && cpuMs < budgetMs * 0.75;
    const headroom = frameMs < budgetMs * 1.08 && cpuMs < budgetMs * 0.5;
    if (gpuBound) {
      this.overT += dt;
      this.underT = 0;
    } else if (headroom) {
      this.underT += dt;
      this.overT = Math.max(0, this.overT - dt);
    } else {
      this.overT = Math.max(0, this.overT - dt * 0.5);
      this.underT = 0;
    }
    if (this.overT >= t.downAfter && this.scale > t.min + 1e-6) {
      this.scale = Math.max(t.min, Math.round((this.scale - t.step) * 100) / 100);
      this.overT = 0;
      this.cool = t.cooldown;
      return true;
    }
    if (this.underT >= t.upAfter && this.scale < t.max - 1e-6) {
      this.scale = Math.min(t.max, Math.round((this.scale + t.step / 2) * 100) / 100);
      this.underT = 0;
      this.cool = t.cooldown * 2;
      return true;
    }
    return false;
  }
}
