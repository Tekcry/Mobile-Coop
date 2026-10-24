/**
 * (section-bake) The per-section lamp bake at runtime (`docs/sector-redesign/briefs/SECTION-BAKE.md`). One lamp per
 * worker job, the live section first (`SectionPlan`), each lamp copied into the one shared result as it lands: its
 * visibility in place (the full-size buffer `World` hands to the light field and the baked lamps), its bounce joined
 * again in light order. Listeners (`LightField`, `BakedLamps`) hear each landing batch; `whenReady(k)` resolves once
 * section k's lamps are all in. When every lamp has landed the joined result (byte-identical to `bakeLevelLamps`) is
 * cached under the full key, so the next load is a plain cache hit. (SB14) The cache write clones the whole result on the
 * main thread (~133 MB on the campus), so once the match plays it waits for a quiet moment: the next section change
 * (the connector cycle), or the match's end.
 * Landing runs in promise callbacks between frames, never per frame.
 */
import { bakeLamps, BOX_STRIDE, LAMP_STRIDE, type LampResult } from './lampBake';
import { saveLamps } from './lampJobs';
import { WorkerPool } from './workerPool';
import { joinBounce, lampLayout, SectionPlan, type BouncePart } from '../world/sectionBake';

/** A landing batch: `lamps[0 .. n)` the bake indices that landed since the last one. */
export type LandListener = (lamps: Int32Array, n: number) => void;

/** Lamps landed before a batch is flushed even when no section completed (the background's batches). */
const FLUSH_LAMPS = 8;

export interface SectionBakerInput {
  shapes: Float32Array;
  lights: Float32Array;
  lo: [number, number, number];
  hi: [number, number, number];
  /** Per lamp its sections (`lampSectionMasks`). */
  masks: Int32Array;
  sections: number;
  /** The full cache key (`lamps:`): the joined result is saved under it once every lamp landed; null: never saved. */
  key: string | null;
  /** The section to bake first (default 0). */
  live?: number;
  /** Tests: a pool to use (default a new `WorkerPool()`; in node it runs inline). */
  pool?: WorkerPool;
}

const BAKERS = new WeakMap<LampResult, SectionBaker>();

/** The baker filling `r` (null: a finished or full bake). */
export function sectionBakerOf(r: LampResult): SectionBaker | null {
  return BAKERS.get(r) ?? null;
}

export class SectionBaker {
  /** The shared result: every lamp's box from the start, its cells 0 until it lands, the landed lamps' bounce. */
  readonly result: LampResult;
  readonly plan: SectionPlan;
  /** Per lamp where its cells start in `result.vis`. */
  readonly at: Float64Array;
  /** Resolves when every lamp has landed (or the baker was disposed). */
  readonly finished: Promise<void>;
  /** Every lamp landed (tests and tools wait for it: `window.__app.current.world.lightBake.sections.done`). */
  done = false;
  disposed = false;
  /** Lamps baked inline after a worker failed (SB13). */
  inlineRetries = 0;
  /** (SB14) The match plays (`GameState.create` after its load): the cache write waits for a section change or the end. */
  playing = false;
  /** (SB14) The joined result is waiting to be cached. */
  saveDue = false;
  /** ms from `start` to the live section ready / to the last lamp (logged, tests). */
  liveMs = -1;
  totalMs = -1;
  private readonly inp: SectionBakerInput;
  private pool: WorkerPool | null = null;
  private inflight = 0;
  private readonly parts: (BouncePart | null)[];
  private readonly fresh: Int32Array;
  private freshN = 0;
  private readonly listeners: LandListener[] = [];
  private readonly waiters: { k: number; resolve: () => void }[] = [];
  private finish: () => void = () => undefined;
  private t0 = 0;
  private msVis = 0;
  private msBounce = 0;

  constructor(inp: SectionBakerInput) {
    this.inp = inp;
    const n = inp.lights.length / LAMP_STRIDE;
    const lay = lampLayout(inp.lights, inp.lo, inp.hi);
    this.at = lay.at;
    this.parts = new Array<BouncePart | null>(n).fill(null);
    this.result = { kind: 'lamps', id: 0, boxes: lay.boxes, vis: new Uint8Array(lay.cells), bounce: joinBounce(this.parts), ms: { vis: 0, bounce: 0 } };
    const cost = new Float64Array(n);
    for (let i = 0; i < n; i++) cost[i] = lay.boxes[i * BOX_STRIDE + 3]! * lay.boxes[i * BOX_STRIDE + 4]! * lay.boxes[i * BOX_STRIDE + 5]!;
    this.plan = new SectionPlan(inp.masks, cost, inp.sections);
    if (inp.live !== undefined) this.plan.setLive(inp.live);
    this.fresh = new Int32Array(n);
    this.finished = new Promise<void>((r) => {
      this.finish = () => r();
    });
    BAKERS.set(this.result, this);
    if (n === 0) this.complete();
  }

  /** Start the workers (once). */
  start(): void {
    if (this.pool || this.done || this.disposed) return;
    this.t0 = performance.now();
    this.pool = this.inp.pool ?? new WorkerPool();
    this.pump();
  }

  /** Section `k` is live (the host's `loadSection`, the client's `ls`): it bakes first. Ignores -1 / out of range. */
  setLive(k: number): void {
    const was = this.plan.live;
    this.plan.setLive(k);
    // (SB14) a section change is a quiet moment for the cache write
    if (this.plan.live !== was) this.saveIfDue();
  }

  /** The match starts playing (`GameState.create`): from now on the cache write waits for a quiet moment. */
  markPlaying(): void {
    this.playing = true;
  }

  /** (SB14) Cache the joined result now if it is waiting. */
  saveIfDue(): void {
    if (!this.saveDue || !this.inp.key) return;
    this.saveDue = false;
    void saveLamps(this.inp.key, this.result);
  }

  /** Section `k`'s lamps have all landed (true past the sections). */
  ready(k: number): boolean {
    return this.done || this.plan.ready(k);
  }

  /** Resolves once section `k` is ready (at once when it is, or when the baker is disposed). */
  whenReady(k: number): Promise<void> {
    if (this.disposed || this.ready(k)) return Promise.resolve();
    return new Promise((resolve) => this.waiters.push({ k, resolve }));
  }

  /** Hear every landing batch (the lamps are already in `result`). */
  onLand(fn: LandListener): void {
    this.listeners.push(fn);
  }

  /** Stop: the workers end, nothing more lands, nothing is cached (SB11). Waiters are released. */
  dispose(): void {
    // (SB14) a finished bake is cached as the match ends (a loading moment); an unfinished one is dropped
    this.saveIfDue();
    if (this.disposed) return;
    this.disposed = true;
    if (!this.inp.pool) this.pool?.dispose();
    this.pool = null;
    for (const w of this.waiters) w.resolve();
    this.waiters.length = 0;
    this.finish();
  }

  /** Keep every worker busy with the next lamp in the plan's order. */
  private pump(): void {
    const pool = this.pool;
    if (!pool || this.disposed) return;
    const cap = Math.max(1, pool.size);
    while (this.inflight < cap) {
      const i = this.plan.next();
      if (i < 0) return;
      this.inflight++;
      const L = this.inp.lights;
      const job = { kind: 'lamps' as const, id: i, shapes: this.inp.shapes.slice(), lights: L.slice(i * LAMP_STRIDE, (i + 1) * LAMP_STRIDE), lo: this.inp.lo, hi: this.inp.hi };
      pool.lamps(job).then(
        (r) => this.landed(i, r),
        () => this.retryInline(i),
      );
    }
  }

  /** (SB13) A worker failed: bake the lamp here (a hitch, never a wrong light). */
  private retryInline(i: number): void {
    if (this.disposed) return;
    this.inlineRetries++;
    const L = this.inp.lights;
    let r: LampResult;
    try {
      r = bakeLamps({ kind: 'lamps', id: i, shapes: this.inp.shapes, lights: L.slice(i * LAMP_STRIDE, (i + 1) * LAMP_STRIDE), lo: this.inp.lo, hi: this.inp.hi });
    } catch (e) {
      // (cannot happen with valid shapes; the lamp stays dark rather than the bake hanging)
      console.warn('[section-bake] a lamp failed to bake', i, e);
      r = { kind: 'lamps', id: i, boxes: this.result.boxes.slice(i * BOX_STRIDE, (i + 1) * BOX_STRIDE), vis: new Uint8Array(0) };
    }
    this.landed(i, r);
  }

  private landed(i: number, r: LampResult): void {
    this.inflight--;
    if (this.disposed) return;
    const B = this.result.boxes;
    const cells = B[i * BOX_STRIDE + 3]! * B[i * BOX_STRIDE + 4]! * B[i * BOX_STRIDE + 5]!;
    if (r.vis.length === cells) this.result.vis.set(r.vis, this.at[i]!);
    const b = r.bounce;
    this.parts[i] = b && b.data.length ? { box: b.boxes, data: b.data, bits: b.bits ?? new Uint16Array(0) } : null;
    this.msVis += r.ms?.vis ?? 0;
    this.msBounce += r.ms?.bounce ?? 0;
    this.plan.land(i);
    this.fresh[this.freshN++] = i;
    // (a section this lamp completed is told at once: `ready(k)` never runs ahead of the listeners)
    let flush = this.plan.done || this.freshN >= FLUSH_LAMPS;
    const m = this.plan.masks[i]!;
    for (let k = 0; k < this.plan.sections && !flush; k++) if (m & (1 << k) && this.plan.ready(k)) flush = true;
    if (flush) this.flush();
    if (this.plan.done) this.complete();
    else this.pump();
  }

  /** Join the bounce again and tell the listeners, then release the waiters whose section is in. */
  private flush(): void {
    if (this.freshN === 0) return;
    this.result.bounce = joinBounce(this.parts);
    if (this.liveMs < 0 && this.plan.ready(this.plan.live)) this.liveMs = performance.now() - this.t0;
    const n = this.freshN;
    this.freshN = 0;
    for (const fn of this.listeners) fn(this.fresh, n);
    for (let w = this.waiters.length - 1; w >= 0; w--) {
      const x = this.waiters[w]!;
      if (this.plan.ready(x.k)) {
        this.waiters.splice(w, 1);
        x.resolve();
      }
    }
  }

  private complete(): void {
    if (this.done) return;
    this.done = true;
    this.flush();
    this.totalMs = performance.now() - this.t0;
    this.result.ms = { vis: this.msVis, bounce: this.msBounce };
    if (!this.inp.pool) this.pool?.dispose();
    this.pool = null;
    for (const w of this.waiters) w.resolve();
    this.waiters.length = 0;
    BAKERS.delete(this.result);
    this.saveDue = !!this.inp.key;
    if (!this.playing) this.saveIfDue();
    this.finish();
  }
}
