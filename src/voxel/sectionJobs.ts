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
 * (section-bake robust) A failed worker job is tried once more on the pool, then baked inline (held while the match plays
 * until the pool is idle); a job in flight past `JOB_CAP_MS` counts as failed. A lamp that fails every way lands dark for
 * this match and the result is not cached. Every running baker is listed, so a load that fails after the bake started
 * can stop it (`disposeSectionBakersSince`).
 */
import { bakeLamps, BOX_STRIDE, LAMP_STRIDE, type LampResult } from './lampBake';
import { saveLamps } from './lampJobs';
import { WorkerPool } from './workerPool';
import { joinBounce, lampLayout, SectionPlan, type BouncePart } from '../world/sectionBake';

/** A landing batch: `lamps[0 .. n)` the bake indices that landed since the last one. */
export type LandListener = (lamps: Int32Array, n: number) => void;
/** The live section changed (`setLive`). */
export type LiveListener = (live: number) => void;

/** Lamps landed before a batch is flushed even when no section completed (the background's batches). */
const FLUSH_LAMPS = 8;
/** (section-bake robust) A worker job in flight longer than this counts as failed (a worker that died without `onerror`). */
export const JOB_CAP_MS = 60_000;
/** How often the in-flight jobs are checked against `JOB_CAP_MS`. */
const STALL_CHECK_MS = 5_000;

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
  /** Tests: the in-flight cap (default `JOB_CAP_MS`). */
  capMs?: number;
}

const BAKERS = new WeakMap<LampResult, SectionBaker>();
/** (section-bake robust, check A P8) Bakers started and not finished or disposed, and the last serial given out. */
const RUNNING = new Set<SectionBaker>();
let SERIAL = 0;

/** The baker filling `r` (null: a finished or full bake). */
export function sectionBakerOf(r: LampResult): SectionBaker | null {
  return BAKERS.get(r) ?? null;
}

/** (check A P8) A mark before a load: the bakers made after it are the load's own (`disposeSectionBakersSince`). */
export function sectionBakerMark(): number {
  return SERIAL;
}

/** (check A P8) A load failed (`World.create` threw): stop every running baker made after `mark`. Returns how many. */
export function disposeSectionBakersSince(mark: number): number {
  let n = 0;
  for (const b of [...RUNNING]) {
    if (b.serial <= mark) continue;
    b.dispose();
    n++;
  }
  return n;
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
  /** Lamps baked inline after a worker failed twice (SB13). */
  inlineRetries = 0;
  /** (section-bake robust) Worker jobs tried again on the pool after an error or the in-flight cap. */
  poolRetries = 0;
  /** (check A P6) Lamps that failed every way: they land dark for this match and the result is not cached. */
  failed = 0;
  /** (check A P8) Order of creation (`sectionBakerMark`). */
  readonly serial = ++SERIAL;
  /** (SB14) The match plays (`GameState.create` after its load): the cache write waits for a section change or the end. */
  playing = false;
  /** (SB14) The joined result is waiting to be cached. */
  saveDue = false;
  /** ms from `start` to the live section ready / to the last lamp (logged, tests). */
  liveMs = -1;
  totalMs = -1;
  private readonly inp: SectionBakerInput;
  private pool: WorkerPool | null = null;
  /** Lamps with a pool job running (`jobT0 > 0`). */
  private poolJobs = 0;
  /** Per lamp: when its current pool job started (0: none), its job token (a late failure of an older job is ignored), its pool retries. */
  private readonly jobT0: Float64Array;
  private readonly token: Int32Array;
  private readonly tries: Uint8Array;
  /** (check B 3) Lamps waiting for an inline bake (FIFO; held while playing until the pool is idle). */
  private readonly inlineQ: Int32Array;
  private inlineHead = 0;
  private inlineTail = 0;
  private inlineTimer: ReturnType<typeof setTimeout> | null = null;
  private draining = false;
  private warnedInline = false;
  private stallTimer: ReturnType<typeof setInterval> | null = null;
  /** Per lamp bounce parts until `complete` (check B 8: dropped there). */
  private parts: (BouncePart | null)[];
  private readonly fresh: Int32Array;
  private freshN = 0;
  private readonly listeners: LandListener[] = [];
  private readonly liveListeners: LiveListener[] = [];
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
    this.jobT0 = new Float64Array(n);
    this.token = new Int32Array(n);
    this.tries = new Uint8Array(n);
    this.inlineQ = new Int32Array(n);
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
    RUNNING.add(this);
    // (check B 3) a worker that dies without `onerror` never answers: its job counts as failed past the cap
    const t = setInterval(() => this.checkStalled(), STALL_CHECK_MS);
    (t as { unref?: () => void }).unref?.();
    this.stallTimer = t;
    this.pump();
  }

  /** Section `k` is live (the host's `loadSection`, the client's `ls`): it bakes first. Ignores -1 / out of range. */
  setLive(k: number): void {
    const was = this.plan.live;
    this.plan.setLive(k);
    if (this.plan.live === was) return;
    // (SB14) a section change is a quiet moment for the cache write
    this.saveIfDue();
    // (check B 5) the picture puts the new live section's waiting lamps first
    for (const fn of this.liveListeners) fn(this.plan.live);
  }

  /** The match starts playing (`GameState.create`): from now on the cache write waits for a quiet moment. */
  markPlaying(): void {
    this.playing = true;
  }

  /** (check A P6) A lamp failed every way: the result is incomplete for this match and never cached. */
  get incomplete(): boolean {
    return this.failed > 0;
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

  /** (check B 5) Hear every live section change. */
  onLive(fn: LiveListener): void {
    this.liveListeners.push(fn);
  }

  /**
   * (check B 3) A job in flight past the cap (default `JOB_CAP_MS`) counts as failed: tried again on the pool, then
   * inline. Called by a timer while the bake runs (tests call it with a clock of their own).
   */
  checkStalled(now = performance.now()): void {
    if (this.disposed || this.done) return;
    const cap = this.inp.capMs ?? JOB_CAP_MS;
    const T = this.jobT0;
    for (let i = 0; i < T.length; i++) {
      if (T[i]! > 0 && now - T[i]! > cap) this.failed1(i, new Error(`job in flight over ${cap} ms`));
    }
  }

  /** Stop: the workers end, nothing more lands, nothing is cached (SB11). Waiters are released. */
  dispose(): void {
    // (SB14) a finished bake is cached as the match ends (a loading moment); an unfinished one is dropped
    this.saveIfDue();
    if (this.disposed) return;
    this.disposed = true;
    this.stopTimers();
    RUNNING.delete(this);
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
    while (this.poolJobs < cap) {
      const i = this.plan.next();
      if (i < 0) return;
      this.poolJobs++;
      this.dispatch(i);
    }
  }

  /** Lamp `i` to the pool (its first job or its retry; `poolJobs` already counts it). */
  private dispatch(i: number): void {
    const pool = this.pool;
    if (!pool) return;
    const tok = this.token[i]! + 1;
    this.token[i] = tok;
    this.jobT0[i] = performance.now();
    const L = this.inp.lights;
    const job = { kind: 'lamps' as const, id: i, shapes: this.inp.shapes.slice(), lights: L.slice(i * LAMP_STRIDE, (i + 1) * LAMP_STRIDE), lo: this.inp.lo, hi: this.inp.hi };
    pool.lamps(job).then(
      (r) => this.landed(i, r),
      (e: unknown) => {
        if (this.token[i] === tok) this.failed1(i, e);
      },
    );
  }

  /** Lamp `i`'s pool job is over (landed, or handed to the inline bake). */
  private endJob(i: number): void {
    if (this.jobT0[i]! > 0) {
      this.jobT0[i] = 0;
      this.poolJobs--;
    }
  }

  /** (check B 3) Lamp `i`'s current job failed (a worker error or the cap): once more on the pool, then inline. */
  private failed1(i: number, e: unknown): void {
    if (this.disposed || this.plan.landed[i]) return;
    if (this.tries[i] === 0 && this.pool) {
      this.tries[i] = 1;
      this.poolRetries++;
      this.dispatch(i);
      return;
    }
    // (an older job's late answer still lands: the same bytes; its late failure is ignored by the token)
    this.token[i] = this.token[i]! + 1;
    this.endJob(i);
    if (!this.warnedInline) {
      this.warnedInline = true;
      console.warn('[section-bake] a worker job failed twice: the lamp bakes on the main thread', i, e);
    }
    this.inlineQ[this.inlineTail++] = i;
    this.pump();
    this.drainInline();
  }

  /**
   * (SB13, check B 3) Bake the waiting lamps here (a hitch, never a wrong light). During the load at once; once the match
   * plays only while the pool is idle, one lamp per task (frames run between them).
   */
  private drainInline(): void {
    if (this.draining || this.inlineTimer !== null || this.disposed) return;
    this.draining = true;
    while (this.inlineTail > this.inlineHead && !this.disposed && !this.done) {
      if (this.playing && this.poolJobs > 0) break;
      const i = this.inlineQ[this.inlineHead++]!;
      if (this.plan.landed[i]) continue;
      this.retryInline(i);
      if (this.playing && this.inlineTail > this.inlineHead && !this.disposed && !this.done) {
        this.inlineTimer = setTimeout(() => {
          this.inlineTimer = null;
          this.drainInline();
        }, 0);
        break;
      }
    }
    this.draining = false;
  }

  private retryInline(i: number): void {
    this.inlineRetries++;
    const L = this.inp.lights;
    let r: LampResult;
    try {
      r = bakeLamps({ kind: 'lamps', id: i, shapes: this.inp.shapes, lights: L.slice(i * LAMP_STRIDE, (i + 1) * LAMP_STRIDE), lo: this.inp.lo, hi: this.inp.hi });
    } catch (e) {
      // (check A P6: cannot happen with valid shapes; the lamp lands dark for this match, the result is never cached)
      if (this.failed++ === 0) console.warn('[section-bake] a lamp failed to bake (worker and inline): it stays dark this match; the bake is not cached', i, e);
      r = { kind: 'lamps', id: i, boxes: this.result.boxes.slice(i * BOX_STRIDE, (i + 1) * BOX_STRIDE), vis: new Uint8Array(0) };
    }
    this.landed(i, r);
  }

  private landed(i: number, r: LampResult): void {
    // (a late answer for a lamp already in, or after the end)
    if (this.disposed || this.done || this.plan.landed[i]) return;
    this.endJob(i);
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
    else {
      this.pump();
      this.drainInline();
    }
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
    // (check B 8) the per-lamp bounce lives on in the joined result only
    this.parts = [];
    this.stopTimers();
    RUNNING.delete(this);
    this.totalMs = performance.now() - this.t0;
    this.result.ms = { vis: this.msVis, bounce: this.msBounce };
    if (!this.inp.pool) this.pool?.dispose();
    this.pool = null;
    for (const w of this.waiters) w.resolve();
    this.waiters.length = 0;
    BAKERS.delete(this.result);
    // (check A P6) a lamp that failed every way is dark in this result: never cached (the next load bakes it again)
    this.saveDue = !!this.inp.key && this.failed === 0;
    if (!this.playing) this.saveIfDue();
    this.finish();
  }

  private stopTimers(): void {
    if (this.stallTimer !== null) clearInterval(this.stallTimer);
    this.stallTimer = null;
    if (this.inlineTimer !== null) clearTimeout(this.inlineTimer);
    this.inlineTimer = null;
  }
}
