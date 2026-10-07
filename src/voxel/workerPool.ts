/**
 * Voxel worker pool (3.0): chunk jobs spread over `hardwareConcurrency - 4` workers (2 .. 16; the browser and the
 * game keep the rest). Without Worker support (tests in node) jobs run inline.
 */
import { buildChunk, type ChunkJob, type ChunkResult } from './chunk';
import { bakeSky, type SkyJob, type SkyResult } from './skyBake';

export function workerCount(): number {
  const hc = typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 4;
  return Math.max(2, Math.min(16, hc - 4));
}

interface Pending {
  job: ChunkJob | SkyJob;
  resolve: (r: ChunkResult | SkyResult) => void;
  reject: (e: unknown) => void;
}

export class WorkerPool {
  private idle: Worker[] = [];
  private all: Worker[] = [];
  private queue: Pending[] = [];
  private busy = new Map<Worker, Pending>();
  readonly inline: boolean;

  constructor(n = workerCount()) {
    this.inline = typeof Worker === 'undefined';
    if (this.inline) return;
    for (let i = 0; i < n; i++) {
      const w = new Worker(new URL('./voxelWorker.ts', import.meta.url), { type: 'module' });
      w.onmessage = (e: MessageEvent<ChunkResult | SkyResult>) => this.done(w, e.data, null);
      w.onerror = (e) => this.done(w, null, e);
      this.all.push(w);
      this.idle.push(w);
    }
  }

  get size(): number {
    return this.all.length;
  }

  run(job: ChunkJob): Promise<ChunkResult> {
    if (this.inline) return Promise.resolve(buildChunk(job));
    return new Promise((resolve, reject) => {
      this.queue.push({ job, resolve: resolve as (r: ChunkResult | SkyResult) => void, reject });
      this.pump();
    });
  }

  /** The sky visibility bake (one job). */
  sky(job: SkyJob): Promise<SkyResult> {
    if (this.inline) return Promise.resolve(bakeSky(job));
    return new Promise((resolve, reject) => {
      this.queue.unshift({ job, resolve: resolve as (r: ChunkResult | SkyResult) => void, reject });
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

  private done(w: Worker, r: ChunkResult | SkyResult | null, err: unknown): void {
    const p = this.busy.get(w);
    this.busy.delete(w);
    this.idle.push(w);
    if (p) {
      if (r) p.resolve(r);
      else p.reject(err);
    }
    this.pump();
  }

  dispose(): void {
    for (const w of this.all) w.terminate();
    this.all = [];
    this.idle = [];
    for (const p of this.queue) p.reject(new Error('voxel pool disposed'));
    this.queue = [];
  }
}
