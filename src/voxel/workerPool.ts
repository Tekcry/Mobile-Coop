/**
 * Bake worker pool: sky, lamp and moon bakes spread over `hardwareConcurrency - 4` workers (2 .. 16; the browser and
 * the game keep the rest). Without Worker support (tests in node) jobs run inline.
 */
import { bakeLamps, type LampJob, type LampResult } from './lampBake';
import { bakeMoon, bakeSky, type MoonJob, type MoonResult, type SkyJob, type SkyResult } from './skyBake';

type Job = SkyJob | LampJob | MoonJob;
type Result = SkyResult | LampResult | MoonResult;

export function workerCount(): number {
  const hc = typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 4;
  return Math.max(2, Math.min(16, hc - 4));
}

interface Pending {
  job: Job;
  resolve: (r: Result) => void;
  reject: (e: unknown) => void;
}

export class WorkerPool {
  private idle: Worker[] = [];
  private all: Worker[] = [];
  private queue: Pending[] = [];
  private busy = new Map<Worker, Pending>();
  private disposed = false;
  readonly inline: boolean;

  constructor(n = workerCount()) {
    this.inline = typeof Worker === 'undefined';
    if (this.inline) return;
    for (let i = 0; i < n; i++) {
      const w = this.spawn();
      this.all.push(w);
      this.idle.push(w);
    }
  }

  private spawn(): Worker {
    const w = new Worker(new URL('./voxelWorker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e: MessageEvent<Result>) => this.done(w, e.data, null);
    w.onerror = (e) => this.done(w, null, e);
    return w;
  }

  get size(): number {
    return this.all.length;
  }

  /** The sky visibility bake (one job). */
  sky(job: SkyJob): Promise<SkyResult> {
    if (this.inline) return Promise.resolve(bakeSky(job));
    return new Promise((resolve, reject) => {
      this.queue.unshift({ job, resolve: resolve as (r: Result) => void, reject });
      this.pump();
    });
  }

  /** A lamp visibility bake (3.2; split across the workers by the caller). */
  lamps(job: LampJob): Promise<LampResult> {
    if (this.inline) return Promise.resolve(bakeLamps(job));
    return new Promise((resolve, reject) => {
      this.queue.push({ job, resolve: resolve as (r: Result) => void, reject });
      this.pump();
    });
  }

  /** The moon visibility bake (3.6; one job). */
  moon(job: MoonJob): Promise<MoonResult> {
    if (this.inline) return Promise.resolve(bakeMoon(job));
    return new Promise((resolve, reject) => {
      this.queue.push({ job, resolve: resolve as (r: Result) => void, reject });
      this.pump();
    });
  }

  private pump(): void {
    while (this.idle.length && this.queue.length) {
      const w = this.idle.pop()!;
      const p = this.queue.shift()!;
      this.busy.set(w, p);
      w.postMessage(p.job, [p.job.shapes.buffer as ArrayBuffer]);
    }
  }

  private done(w: Worker, r: Result | null, err: unknown): void {
    // (bake4) a terminated worker (cancelled, or the pool disposed) never comes back
    if (this.all.indexOf(w) < 0) return;
    const p = this.busy.get(w);
    this.busy.delete(w);
    this.idle.push(w);
    if (p) {
      if (r) p.resolve(r);
      else p.reject(err);
    }
    this.pump();
  }

  /**
   * (bake4) Give up on `job` (the caller's in-flight cap ran out): still queued, it is dropped; running, its worker (hung,
   * or dead without `onerror`) is terminated and replaced, so the pool keeps its size and its queue moves. Its promise
   * rejects. False: not here (it already answered, the pool runs inline, or it is disposed).
   */
  cancel(job: Job): boolean {
    if (this.inline || this.disposed) return false;
    for (let q = 0; q < this.queue.length; q++) {
      const p = this.queue[q]!;
      if (p.job !== job) continue;
      this.queue.splice(q, 1);
      p.reject(new Error('voxel job cancelled'));
      return true;
    }
    for (const [w, p] of this.busy) {
      if (p.job !== job) continue;
      this.busy.delete(w);
      w.terminate();
      const nw = this.spawn();
      const k = this.all.indexOf(w);
      if (k >= 0) this.all[k] = nw;
      else this.all.push(nw);
      this.idle.push(nw);
      p.reject(new Error('voxel job cancelled: its worker was terminated'));
      this.pump();
      return true;
    }
    return false;
  }

  dispose(): void {
    this.disposed = true;
    for (const w of this.all) w.terminate();
    this.all = [];
    this.idle = [];
    for (const p of this.queue) p.reject(new Error('voxel pool disposed'));
    this.queue = [];
  }
}
