/**
 * (section-bake robust) The per-section bake's failure paths and landing order (`voxel/sectionJobs.ts`,
 * `world/bakedLamps.ts`; checks `docs/sector-redesign/checks/section-bake-check-A.md` P6, P8 and
 * `section-bake-check-B.md` polish 2, 3, 4, 5, 8). A six-lamp strip, three sections of two lamps each (masks given, not
 * measured), driven by a hand-run pool: worker errors retry once on the pool, a hung job counts as failed past the cap,
 * an inline bake waits for an idle pool once the match plays, a lamp that fails every way is never cached, a failed load
 * stops its bakers; the picture's tile queue: no per-batch whole-atlas re-upload without sub-uploads, live landings at
 * the queue head during play, a live change snaps its lamps in. (bake3, check polish 1, 2, 4) A live-section lamp's inline
 * bake skips the idle wait during play, a held lamp bakes once its section goes live, the pool retry has a 20 s cap.
 * (bake4, bake3 check polish 2, 4; robust check polish 3) A smaller `capMs` bounds the retry too, held lamps keep their
 * queued order behind a live lamp pulled forward, a stalled job is cancelled on the pool (its worker replaced).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type * as LampBakeModule from '../src/voxel/lampBake';
import type * as LampJobsModule from '../src/voxel/lampJobs';

const ctl = vi.hoisted(() => ({ fail: new Set<number>() }));

vi.mock('../src/voxel/lampBake', async (importOriginal) => {
  const real = await importOriginal<typeof LampBakeModule>();
  return {
    ...real,
    // (a lamp in `ctl.fail` throws, as an inline bake that cannot happen with valid shapes would)
    bakeLamps: (job: LampJob) => {
      if (ctl.fail.has(job.id)) throw new Error(`lamp ${job.id} cannot bake`);
      return real.bakeLamps(job);
    },
  };
});

vi.mock('../src/voxel/lampJobs', async (importOriginal) => {
  const real = await importOriginal<typeof LampJobsModule>();
  return { ...real, saveLamps: vi.fn(async () => undefined) };
});

import { LevelBuilder } from '../src/world/levelBuilder';
import { canonicalLightSet } from '../src/voxel/lightShapes';
import { bakeLamps, BOX_STRIDE, type LampJob, type LampResult } from '../src/voxel/lampBake';
import { saveLamps } from '../src/voxel/lampJobs';
import { bakedLights } from '../src/world/lightBake';
import { disposeSectionBakersSince, JOB_CAP_MS, JOB_RETRY_CAP_MS, SectionBaker, sectionBakerMark } from '../src/voxel/sectionJobs';
import { WorkerPool } from '../src/voxel/workerPool';
import type { BakedLamps } from '../src/world/bakedLamps';

/** Lamps 0, 1 in section 0; 2, 3 in 1; 4, 5 in 2. */
const MASKS = Int32Array.from([1, 1, 2, 2, 4, 4]);

function fixture() {
  const b = new LevelBuilder();
  b.box(9, -0.1, 3, 20, 0.2, 8, '#888');
  b.box(4, 0.5, 3, 1, 1, 1, '#888');
  const reg = b.lights;
  for (const x of [1.5, 4.5, 7.5, 10.5, 13.5, 16.5]) reg.add({ x, y: 2.2, z: 3, radius: 2.5, intensity: 1 });
  reg.ambient = 0.2;
  const set = canonicalLightSet(b.boxes, b.cylinders, 'robust-strip', false);
  const baked = bakedLights(reg);
  const full = () => bakeLamps({ kind: 'lamps', id: 0, shapes: set.shapes, lights: baked.lights, lo: set.lo, hi: set.hi });
  return { reg, set, baked, full };
}

/** A hand-run pool: jobs wait until the test finishes them (in the order they started); `reject` / `hang` per lamp and try. */
function handPool(slots: number, opts: { reject?: (id: number, n: number) => boolean; hang?: (id: number, n: number) => boolean } = {}) {
  const q: { job: LampJob; resolve: (r: LampResult) => void }[] = [];
  const tries = new Map<number, number>();
  /** (bake4) The jobs the baker cancelled (a stalled job), in order. */
  const cancelled: LampJob[] = [];
  const pool = {
    size: slots,
    cancel: (job: LampJob) => (cancelled.push(job), false),
    lamps: (job: LampJob) => {
      const n = (tries.get(job.id) ?? 0) + 1;
      tries.set(job.id, n);
      if (opts.reject?.(job.id, n)) return Promise.reject(new Error('worker error'));
      if (opts.hang?.(job.id, n)) return new Promise<LampResult>(() => undefined);
      return new Promise<LampResult>((resolve) => q.push({ job, resolve }));
    },
    dispose: () => undefined,
  } as unknown as WorkerPool;
  const finishOne = async (): Promise<number> => {
    const p = q.shift();
    if (!p) return -1;
    p.resolve(bakeLamps(p.job));
    await settle();
    return p.job.id;
  };
  const finishAll = async (): Promise<void> => {
    while ((await finishOne()) >= 0);
  };
  return { pool, q, tries, cancelled, finishOne, finishAll };
}

/** Every promise callback and zero-delay timer queued so far has run. */
const settle = () => new Promise<void>((r) => setTimeout(r, 0));

function baker(f: ReturnType<typeof fixture>, pool: WorkerPool, key: string | null = null): SectionBaker {
  return new SectionBaker({ shapes: f.set.shapes, lights: f.baked.lights, lo: f.set.lo, hi: f.set.hi, masks: MASKS, sections: 3, key, pool });
}

const sameBytes = (a: Uint8Array, b: Uint8Array) => Buffer.from(a).equals(Buffer.from(b));

afterEach(() => {
  ctl.fail.clear();
  vi.mocked(saveLamps).mockClear();
  vi.restoreAllMocks();
});

describe('section bake robust: worker failures (check B 3, check A P6)', () => {
  it('a worker error retries once on the pool (no inline bake); the bytes are the full bake\'s; parts dropped at the end', async () => {
    const f = fixture();
    const hp = handPool(2, { reject: (id, n) => id === 2 && n === 1 });
    const sb = baker(f, hp.pool);
    sb.start();
    await settle();
    await hp.finishAll();
    await sb.finished;
    expect(sb.done).toBe(true);
    expect(hp.tries.get(2)).toBe(2);
    expect(sb.poolRetries).toBe(1);
    expect(sb.inlineRetries).toBe(0);
    expect(sb.failed).toBe(0);
    expect(sameBytes(sb.result.vis, f.full().vis)).toBe(true);
    // (check B 8) the per-lamp bounce parts are dropped at `complete`
    expect((sb as unknown as { parts: unknown[] }).parts.length).toBe(0);
  }, 60_000);

  it('a job in flight past the cap counts as failed: once more on the pool, then inline; whenReady never hangs', async () => {
    const f = fixture();
    // (lamp 0's worker never answers, both tries: a worker that died without `onerror`)
    const hp = handPool(2, { hang: (id) => id === 0 });
    const sb = baker(f, hp.pool);
    sb.start();
    let ready = false;
    void sb.whenReady(0).then(() => (ready = true));
    await hp.finishAll();
    expect(ready).toBe(false);
    // (not yet past the cap: nothing changes)
    sb.checkStalled(performance.now() + JOB_CAP_MS - 1000);
    expect(sb.poolRetries).toBe(0);
    sb.checkStalled(performance.now() + JOB_CAP_MS + 1);
    expect(sb.poolRetries).toBe(1);
    expect(hp.tries.get(0)).toBe(2);
    expect(sb.inlineRetries).toBe(0);
    sb.checkStalled(performance.now() + JOB_CAP_MS + 1);
    // (the load: the inline bake runs at once)
    expect(sb.inlineRetries).toBe(1);
    await hp.finishAll();
    await sb.finished;
    await settle();
    expect(ready).toBe(true);
    expect(sb.done).toBe(true);
    expect(sameBytes(sb.result.vis, f.full().vis)).toBe(true);
  }, 60_000);

  it('once playing, an inline bake waits for the pool to be idle, then one lamp per task', async () => {
    const f = fixture();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const hp = handPool(2, { reject: (id) => id === 3 || id === 4 });
    const sb = baker(f, hp.pool);
    sb.markPlaying();
    sb.start();
    // (lamps 3 and 4 fail twice each while other jobs run: held)
    while (hp.q.length > 1 || (hp.q.length === 1 && sb.plan.remaining > 3)) await hp.finishOne();
    expect(sb.poolRetries).toBe(2);
    expect(sb.inlineRetries).toBe(0);
    expect(sb.plan.landed[3]).toBe(0);
    expect(sb.plan.landed[4]).toBe(0);
    // the last pool job lands: the pool is idle, the first held lamp bakes; the second waits for the next task
    expect(await hp.finishOne()).toBeGreaterThanOrEqual(0);
    expect(hp.q.length).toBe(0);
    expect(sb.inlineRetries).toBeGreaterThanOrEqual(1);
    await settle();
    await sb.finished;
    expect(sb.inlineRetries).toBe(2);
    expect(sb.done).toBe(true);
    expect(sameBytes(sb.result.vis, f.full().vis)).toBe(true);
    // (the main-thread fallback is logged once)
    expect(warn.mock.calls.filter((c) => String(c[0]).includes('failed twice')).length).toBe(1);
  }, 60_000);

  it('a lamp that fails every way lands dark, is logged once, and the bake is never cached (check A P6)', async () => {
    const f = fixture();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    ctl.fail.add(2);
    ctl.fail.add(4);
    const hp = handPool(2, { reject: (id) => id === 2 || id === 4 });
    const sb = baker(f, hp.pool, 'lamps:robust');
    sb.start();
    await settle();
    await hp.finishAll();
    await sb.finished;
    expect(sb.done).toBe(true);
    expect(sb.failed).toBe(2);
    expect(sb.incomplete).toBe(true);
    expect(sb.saveDue).toBe(false);
    sb.dispose();
    expect(saveLamps).not.toHaveBeenCalled();
    expect(warn.mock.calls.filter((c) => String(c[0]).includes('failed to bake')).length).toBe(1);
    // the failed lamps are dark; every other lamp holds the full bake's bytes
    ctl.fail.clear();
    const full = f.full();
    const B = sb.result.boxes;
    for (let i = 0; i < 6; i++) {
      const at = sb.at[i]!;
      const n = B[i * BOX_STRIDE + 3]! * B[i * BOX_STRIDE + 4]! * B[i * BOX_STRIDE + 5]!;
      const got = sb.result.vis.subarray(at, at + n);
      if (i === 2 || i === 4) expect(got.every((v) => v === 0), `lamp ${i} dark`).toBe(true);
      else expect(sameBytes(got, full.vis.subarray(at, at + n)), `lamp ${i}`).toBe(true);
    }
  }, 60_000);

  it('a clean bake is cached once under its key', async () => {
    const f = fixture();
    const hp = handPool(2);
    const sb = baker(f, hp.pool, 'lamps:robust');
    sb.start();
    await hp.finishAll();
    await sb.finished;
    expect(sb.incomplete).toBe(false);
    expect(saveLamps).toHaveBeenCalledTimes(1);
    expect(vi.mocked(saveLamps).mock.calls[0]![0]).toBe('lamps:robust');
  }, 60_000);
});

describe('section bake robust bake3: live inline lamps and the retry cap (check polish 1, 2, 4)', () => {
  it('during play a live-section lamp that failed twice bakes inline while another pool job is in flight', async () => {
    const f = fixture();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    // (lamp 0 counts for the live section 0)
    const hp = handPool(2, { reject: (id) => id === 0 });
    const sb = baker(f, hp.pool);
    sb.markPlaying();
    sb.start();
    await settle();
    expect(hp.tries.get(0)).toBe(2);
    expect(hp.q.length).toBeGreaterThan(0);
    expect(sb.inlineRetries).toBe(1);
    expect(sb.plan.landed[0]).toBe(1);
    await hp.finishAll();
    await sb.finished;
    expect(sb.done).toBe(true);
    expect(sameBytes(sb.result.vis, f.full().vis)).toBe(true);
  }, 60_000);

  it('during play a non-live lamp that failed twice waits while a pool job runs, then bakes once setLive makes it live', async () => {
    const f = fixture();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    // (lamp 2 counts for section 1, not live)
    const hp = handPool(2, { reject: (id) => id === 2 });
    const sb = baker(f, hp.pool);
    sb.markPlaying();
    sb.start();
    while (hp.tries.get(2) !== 2) expect(await hp.finishOne()).toBeGreaterThanOrEqual(0);
    await settle();
    expect(hp.q.length).toBeGreaterThan(0);
    expect(sb.inlineRetries).toBe(0);
    expect(sb.plan.landed[2]).toBe(0);
    // (another landing while jobs still run: still held)
    await hp.finishOne();
    expect(hp.q.length).toBeGreaterThan(0);
    expect(sb.plan.landed[2]).toBe(0);
    sb.setLive(1);
    expect(sb.inlineRetries).toBe(1);
    expect(sb.plan.landed[2]).toBe(1);
    expect(hp.q.length).toBeGreaterThan(0);
    await hp.finishAll();
    await sb.finished;
    expect(sb.done).toBe(true);
    expect(sameBytes(sb.result.vis, f.full().vis)).toBe(true);
  }, 60_000);

  it('a retry job past JOB_RETRY_CAP_MS counts as failed while a first try at 30 s does not', async () => {
    const f = fixture();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    // (lamp 0: the first try errors, the retry never answers; lamp 1: the first try never answers)
    const hp = handPool(2, { reject: (id, n) => id === 0 && n === 1, hang: (id) => id === 0 || id === 1 });
    const sb = baker(f, hp.pool);
    sb.start();
    await settle();
    const t = performance.now();
    expect(JOB_RETRY_CAP_MS).toBe(20_000);
    expect(sb.poolRetries).toBe(1);
    expect(hp.tries.get(0)).toBe(2);
    expect(hp.tries.get(1)).toBe(1);
    sb.checkStalled(t + JOB_RETRY_CAP_MS - 1000);
    expect(sb.inlineRetries).toBe(0);
    sb.checkStalled(t + 30_000);
    // (lamp 0's retry is over its cap: the load bakes it inline at once; lamp 1's first try is under 60 s)
    expect(sb.inlineRetries).toBe(1);
    expect(sb.plan.landed[0]).toBe(1);
    expect(sb.poolRetries).toBe(1);
    expect(hp.tries.get(1)).toBe(1);
    expect(sb.plan.landed[1]).toBe(0);
    sb.dispose();
  }, 60_000);
});

describe('section bake robust bake4: the retry cap, held order, stalled jobs cancelled (bake3 check polish 2, 4)', () => {
  it('a capMs under 20 s bounds the retry too: with capMs 5 s a retry past 5 s counts as failed', async () => {
    const f = fixture();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    // (lamp 0: the first try errors, the retry never answers)
    const hp = handPool(2, { reject: (id, n) => id === 0 && n === 1, hang: (id) => id === 0 });
    const sb = new SectionBaker({ shapes: f.set.shapes, lights: f.baked.lights, lo: f.set.lo, hi: f.set.hi, masks: MASKS, sections: 3, key: null, pool: hp.pool, capMs: 5_000 });
    sb.start();
    await settle();
    const t = performance.now();
    expect(sb.poolRetries).toBe(1);
    expect(hp.tries.get(0)).toBe(2);
    sb.checkStalled(t + 4_000);
    expect(sb.inlineRetries).toBe(0);
    sb.checkStalled(t + 5_001);
    // (the load: lamp 0's retry is past 5 s, not 20 s: it bakes inline at once)
    expect(sb.inlineRetries).toBe(1);
    expect(sb.plan.landed[0]).toBe(1);
    sb.dispose();
  }, 60_000);

  it('held non-live inline lamps keep their queued order after a live lamp is pulled to the head', async () => {
    const f = fixture();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    // (lamps 0, 1 in section 0, live; lamps 2 .. 5 each a section of their own (1 .. 4), every pool try rejected)
    const masks = Int32Array.from([1, 1, 2, 4, 8, 16]);
    const hp = handPool(2, { reject: (id) => id >= 2 });
    const sb = new SectionBaker({ shapes: f.set.shapes, lights: f.baked.lights, lo: f.set.lo, hi: f.set.hi, masks, sections: 5, key: null, pool: hp.pool });
    const order: number[] = [];
    sb.onLand((lamps, n) => {
      for (let k = 0; k < n; k++) order.push(lamps[k]!);
    });
    sb.markPlaying();
    sb.start();
    // one of lamps 0, 1 lands; lamps 2 .. 5 then fail twice each while the other is still in flight: all four held
    await hp.finishOne();
    await settle();
    expect(hp.q.length).toBe(1);
    const inner = sb as unknown as { inlineQ: Int32Array; inlineHead: number; inlineTail: number };
    const held = Array.from(inner.inlineQ.subarray(inner.inlineHead, inner.inlineTail));
    expect(held.slice().sort()).toEqual([2, 3, 4, 5]);
    expect(sb.inlineRetries).toBe(0);
    const [a, b, L, c] = held as [number, number, number, number];
    // [a, b, L, c]: L's section goes live, L bakes at once while the pool job runs; a, b, c stay held
    sb.setLive(L - 1);
    await settle();
    expect(sb.inlineRetries).toBe(1);
    expect(sb.plan.landed[L]).toBe(1);
    expect(sb.plan.landed[a]! + sb.plan.landed[b]! + sb.plan.landed[c]!).toBe(0);
    // the pool goes idle: the held lamps bake in their queued order (a swap would give b before a)
    await hp.finishAll();
    await sb.finished;
    expect(sb.done).toBe(true);
    expect(order.filter((i) => i >= 2)).toEqual([L, a, b, c]);
    expect(sameBytes(sb.result.vis, f.full().vis)).toBe(true);
  }, 60_000);

  it('a job past its cap is cancelled on the pool (first try and retry), then the inline bake runs', async () => {
    const f = fixture();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const hp = handPool(2, { hang: (id) => id === 0 });
    const sb = baker(f, hp.pool);
    sb.start();
    await hp.finishAll();
    expect(hp.cancelled.length).toBe(0);
    sb.checkStalled(performance.now() + JOB_CAP_MS + 1);
    expect(hp.cancelled.map((j) => j.id)).toEqual([0]);
    expect(hp.tries.get(0)).toBe(2);
    sb.checkStalled(performance.now() + JOB_RETRY_CAP_MS + 1);
    expect(hp.cancelled.map((j) => j.id)).toEqual([0, 0]);
    // (each cancel names that try's own job, not the next one)
    expect(hp.cancelled[0]).not.toBe(hp.cancelled[1]);
    expect(sb.inlineRetries).toBe(1);
    await sb.finished;
    expect(sb.done).toBe(true);
    // (nothing is in flight once done: a later check cancels nothing)
    sb.checkStalled(performance.now() + JOB_CAP_MS * 3);
    expect(hp.cancelled.length).toBe(2);
  }, 60_000);

  it('WorkerPool.cancel drops a queued job, or terminates and replaces the worker running it; a stale answer is ignored', async () => {
    class FakeWorker {
      static made: FakeWorker[] = [];
      posted: LampJob[] = [];
      terminated = false;
      onmessage: ((e: { data: unknown }) => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
      constructor() {
        FakeWorker.made.push(this);
      }
      postMessage(m: LampJob): void {
        this.posted.push(m);
      }
      terminate(): void {
        this.terminated = true;
      }
    }
    vi.stubGlobal('Worker', FakeWorker);
    try {
      const job = (id: number): LampJob => ({ kind: 'lamps', id, shapes: new Float32Array(1), lights: new Float32Array(1), lo: [0, 0, 0], hi: [1, 1, 1] });
      const out = new Map<number, string>();
      const run = (pool: WorkerPool, j: LampJob) =>
        void pool.lamps(j).then(
          (r) => out.set(j.id, `ok ${r.id}`),
          (e: unknown) => out.set(j.id, String(e)),
        );
      const pool = new WorkerPool(2);
      expect(pool.inline).toBe(false);
      expect(FakeWorker.made.length).toBe(2);
      const [jA, jB, jC, jD, jE] = [1, 2, 3, 4, 5].map(job) as [LampJob, LampJob, LampJob, LampJob, LampJob];
      run(pool, jA);
      run(pool, jB);
      run(pool, jC);
      const wA = FakeWorker.made.find((w) => w.posted[0] === jA)!;
      expect(wA).toBeDefined();
      // a queued job: dropped, no worker touched
      expect(pool.cancel(jC)).toBe(true);
      await settle();
      expect(out.get(3)).toContain('cancelled');
      expect(FakeWorker.made.some((w) => w.terminated)).toBe(false);
      // a running job: its worker is terminated, a new one takes the queue
      run(pool, jD);
      expect(pool.cancel(jA)).toBe(true);
      await settle();
      expect(out.get(1)).toContain('cancelled');
      expect(wA.terminated).toBe(true);
      expect(FakeWorker.made.length).toBe(3);
      expect(pool.size).toBe(2);
      const nw = FakeWorker.made[2]!;
      expect(nw.posted).toEqual([jD]);
      nw.onmessage!({ data: { kind: 'lamps', id: 4 } });
      // (a late answer from the terminated worker: ignored, and that worker never takes a job again)
      wA.onmessage!({ data: { kind: 'lamps', id: 1 } });
      await settle();
      expect(out.get(4)).toBe('ok 4');
      expect(out.get(1)).toContain('cancelled');
      run(pool, jE);
      expect(nw.posted).toEqual([jD, jE]);
      expect(wA.posted).toEqual([jA]);
      // (not here any more, or the pool is disposed: false)
      expect(pool.cancel(jA)).toBe(false);
      pool.dispose();
      expect(pool.cancel(jB)).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('section bake robust: a failed load (check A P8)', () => {
  it('disposeSectionBakersSince stops the running bakers made after the mark, no others', async () => {
    const f = fixture();
    const before = baker(f, handPool(1).pool);
    before.start();
    const mark = sectionBakerMark();
    const mine = baker(f, handPool(1).pool);
    mine.start();
    // (made, never started: no workers to stop)
    const idle = baker(f, handPool(1).pool);
    let released = false;
    void mine.whenReady(2).then(() => (released = true));
    expect(disposeSectionBakersSince(mark)).toBe(1);
    await settle();
    expect(mine.disposed).toBe(true);
    expect(released).toBe(true);
    expect(before.disposed).toBe(false);
    expect(idle.disposed).toBe(false);
    expect(disposeSectionBakersSince(mark)).toBe(0);
    before.dispose();
  });
});

/** BakedLamps over a baker's result on a NullEngine (no 3D textures, no GL: the atlas is a bare internal texture). */
async function lampsOver(f: ReturnType<typeof fixture>, sb: SectionBaker): Promise<BakedLamps> {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene } = await import('../src/core/babylon');
  const { BakedLamps } = await import('../src/world/bakedLamps');
  const { InternalTexture, InternalTextureSource } = await import('@babylonjs/core/Materials/Textures/internalTexture');
  const engine = new NullEngine();
  const scene = new Scene(engine);
  vi.spyOn(engine as unknown as { updateTextureData: () => void }, 'updateTextureData').mockImplementation(() => undefined);
  vi.spyOn(engine as unknown as { createRawTexture3D: () => unknown }, 'createRawTexture3D').mockImplementation(() => new InternalTexture(engine, InternalTextureSource.Raw3D));
  vi.spyOn(engine as unknown as { updateRawTexture3D: () => void }, 'updateRawTexture3D').mockImplementation(() => undefined);
  return new BakedLamps(scene, f.reg, f.baked, sb.result, f.set.lo, f.set.hi, null, {});
}

interface Landing {
  fade: Float32Array;
  fadeN: number;
  fadeList: Int32Array;
  tileQ: Int32Array;
  tileHead: number;
  tileTail: number;
  tileFailed: boolean;
  uploadTile: (i: number, z0: number, z1: number) => boolean;
}

/** The queued lamps, head first. */
const queued = (l: Landing) => Array.from(l.tileQ.subarray(l.tileHead, l.tileTail));
const fading = (l: Landing) => Array.from(l.fadeList.subarray(0, l.fadeN)).sort();

describe('section bake robust: the picture (check B 2, 4, 5)', () => {
  it('without sub-uploads: one whole re-upload for the live section at load, none per background batch, one at the end', async () => {
    const f = fixture();
    const hp = handPool(1);
    const sb = baker(f, hp.pool);
    sb.start();
    const lamps = await lampsOver(f, sb);
    const L = lamps as unknown as Landing;
    lamps.frame();
    while (!sb.ready(0)) await hp.finishOne();
    // (NullEngine: no `texSubImage3D`; the live section goes up whole on the next frame)
    expect(L.tileFailed).toBe(true);
    expect(lamps.atlasReuploads).toBe(0);
    lamps.frame();
    expect(lamps.atlasReuploads).toBe(1);
    while (!sb.ready(1)) await hp.finishOne();
    lamps.frame();
    lamps.frame();
    expect(lamps.atlasReuploads).toBe(1);
    expect(queued(L)).toEqual([2, 3]);
    expect(L.fade[2]).toBe(0);
    await hp.finishAll();
    expect(sb.done).toBe(true);
    lamps.frame();
    expect(lamps.atlasReuploads).toBe(2);
    expect(queued(L)).toEqual([]);
    expect(fading(L)).toEqual([2, 3, 4, 5]);
    lamps.frame();
    expect(lamps.atlasReuploads).toBe(2);
    expect(lamps.tileUploads).toBe(0);
    lamps.dispose();
  }, 60_000);

  it('during play a live-section landing goes to the queue head (budgeted), never a direct whole-tile upload', async () => {
    const f = fixture();
    const hp = handPool(1);
    const sb = baker(f, hp.pool);
    sb.start();
    const lamps = await lampsOver(f, sb);
    const L = lamps as unknown as Landing;
    const up: number[] = [];
    vi.spyOn(L, 'uploadTile').mockImplementation((i: number) => (up.push(i), true));
    while (!sb.ready(0)) await hp.finishOne();
    // (the load: the live section's tiles go up as they land)
    expect(up.sort()).toEqual([0, 1]);
    up.length = 0;
    // the match plays; section 2 goes live while section 1's lamps land (queued behind)
    sb.markPlaying();
    sb.setLive(2);
    await hp.finishAll();
    expect(sb.done).toBe(true);
    expect(up).toEqual([]);
    expect(queued(L).slice(0, 2).sort()).toEqual([4, 5]);
    expect(queued(L).slice(2).sort()).toEqual([2, 3]);
    expect(L.fade[4]).toBe(1);
    expect(L.fade[5]).toBe(1);
    lamps.frame();
    expect(up.slice(0, 2).sort()).toEqual([4, 5]);
    expect(up.slice(2).sort()).toEqual([2, 3]);
    // (the live lamps are in full at once; the others fade in)
    expect(fading(L)).toEqual([2, 3]);
    expect(L.fade[4]).toBe(1);
    lamps.dispose();
  }, 60_000);

  it('a live change snaps the new live section\'s fading lamps to full and puts its queued tiles first', async () => {
    const f = fixture();
    const hp = handPool(1);
    // (lamp 2 counts for sections 1 and 2)
    const sb = new SectionBaker({ shapes: f.set.shapes, lights: f.baked.lights, lo: f.set.lo, hi: f.set.hi, masks: Int32Array.from([1, 1, 6, 2, 4, 4]), sections: 3, key: null, pool: hp.pool });
    sb.start();
    const lamps = await lampsOver(f, sb);
    const L = lamps as unknown as Landing;
    const up: number[] = [];
    vi.spyOn(L, 'uploadTile').mockImplementation((i: number) => (up.push(i), true));
    while (!sb.ready(1)) await hp.finishOne();
    // section 1's lamps: up and fading in
    lamps.frame();
    expect(fading(L)).toEqual([2, 3]);
    expect(L.fade[2]).toBeLessThan(1);
    // section 2's last lamps land (queued), then section 2 goes live: lamp 2 snaps, 4 and 5 lead the queue at full
    await hp.finishAll();
    expect(queued(L)).toEqual([4, 5]);
    sb.setLive(2);
    expect(L.fade[2]).toBe(1);
    expect(L.fade[4]).toBe(1);
    expect(L.fade[5]).toBe(1);
    expect(fading(L)).toEqual([3]);
    up.length = 0;
    lamps.frame();
    expect(up).toEqual([4, 5]);
    expect(fading(L)).toEqual([3]);
    expect(L.fade[4]).toBe(1);
    lamps.dispose();
  }, 60_000);
});
