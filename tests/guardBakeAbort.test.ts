// Guard bake driver (scripts/operators/guard-bake.mjs): a lost console stops the stage (gm-bake-abort).
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// @ts-expect-error plain .mjs build script without types
import * as bake from '../scripts/operators/guard-bake.mjs';

interface FakeJob { id: string; gpuBound: boolean }
interface TodoItem { job: FakeJob; hash: string }
interface Result { ok: boolean; code?: number | null; ms?: number; bytes?: number; message?: string; err?: string }
type Runner = (a: TodoItem, ctx: unknown) => Promise<Result>;
const consoleLost = bake.consoleLost as (r: Result | null | undefined) => boolean;
const stageExit = bake.stageExit as (failed: number, aborted: boolean) => number;
const runAll = bake.runAll as (
  todo: TodoItem[], ctx: { outDir: string }, o: { par: number; maxGpu?: number; run?: Runner },
) => Promise<{ results: Record<string, Result>; aborted: boolean; cause: string | null }>;
interface RunJob { id: string; outputs: string[] }
type CmdFor = (job: RunJob, ctx: { outDir: string }) => [string, string[], string, NodeJS.ProcessEnv];
const runJob = bake.runJob as (a: { job: RunJob; hash: string }, ctx: { outDir: string }, cmdFor: CmdFor) => Promise<Result>;
const abortCause = bake.abortCause as (r: Result) => string;
const abortLine = bake.abortLine as (cause: string | null) => string;
const CONSOLE_LOST_CODE = bake.CONSOLE_LOST_CODE as number;
const QUICK_FAIL_MS = bake.QUICK_FAIL_MS as number;
const EXIT_CONSOLE_LOST = bake.EXIT_CONSOLE_LOST as number;
const ABORT_LINE = bake.ABORT_LINE as string;

interface Deferred { promise: Promise<Result>; resolve: (r: Result) => void }
function deferred(): Deferred {
  let resolve!: (r: Result) => void;
  const promise = new Promise<Result>((r) => { resolve = r; });
  return { promise, resolve };
}

const IDS = ['a', 'b', 'c', 'd', 'e', 'f'];
const todo = (): TodoItem[] => IDS.map((id) => ({ job: { id, gpuBound: false }, hash: 'h' }));
const ctx = { outDir: path.join(os.tmpdir(), `gm-bake-abort-missing-${process.pid}`, 'none') };
const tick = () => new Promise((r) => setTimeout(r, 0));
const ticks = async (n = 5) => { for (let i = 0; i < n; i++) await tick(); };

/** A runner whose jobs settle when the test says; records the ids it starts. */
function fakeRunner() {
  const started: string[] = [];
  const jobs = new Map<string, Deferred>();
  const run: Runner = (a) => {
    started.push(a.job.id);
    const d = deferred();
    jobs.set(a.job.id, d);
    return d.promise;
  };
  const settle = (id: string, r: Result) => {
    const d = jobs.get(id);
    if (!d) throw new Error(`job ${id} never started`);
    d.resolve(r);
  };
  return { run, started, settle };
}

let errorSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => { vi.restoreAllMocks(); });

describe('consoleLost', () => {
  it('flags exit 0xC0000142, unsigned or signed', () => {
    expect(consoleLost({ ok: false, code: 3221225794, ms: 5000, bytes: 900 })).toBe(true);
    expect(consoleLost({ ok: false, code: -1073741502, ms: 5000, bytes: 900 })).toBe(true);
  });
  it('flags a quick failure with an empty log', () => {
    expect(consoleLost({ ok: false, code: 1, ms: 300, bytes: 0 })).toBe(true);
    expect(consoleLost({ ok: false, code: null, ms: 5, bytes: 0, message: 'could not start: x' })).toBe(true);
  });
  it('does not flag a real failure, a success or a result without a log size', () => {
    expect(consoleLost({ ok: false, code: 1, ms: 300, bytes: 120 })).toBe(false);
    expect(consoleLost({ ok: false, code: 1, ms: 2500, bytes: 0 })).toBe(false);
    expect(consoleLost({ ok: true, code: 0, ms: 10, bytes: 0 })).toBe(false);
    expect(consoleLost({ ok: false, code: 1, ms: 300 })).toBe(false);
  });
  it('exports the constants', () => {
    expect(CONSOLE_LOST_CODE).toBe(3221225794);
    expect(QUICK_FAIL_MS).toBe(2000);
    expect(EXIT_CONSOLE_LOST).toBe(5);
    expect(ABORT_LINE).toBe('ABORT: console lost, restart the bake detached');
  });
});

describe('runAll abort', () => {
  async function abortCase(first: Result) {
    const f = fakeRunner();
    let settled = false;
    const p = runAll(todo(), ctx, { par: 2, run: f.run }).then((r) => { settled = true; return r; });
    await ticks();
    expect(f.started).toEqual(['a', 'b']);
    f.settle('a', first);
    await ticks();
    expect(f.started).toEqual(['a', 'b']);
    expect(settled).toBe(false);
    f.settle('b', { ok: true, code: 0, ms: 9000, bytes: 4000 });
    const out = await p;
    expect(out.aborted).toBe(true);
    expect(out.results.a?.ok).toBe(false);
    expect(out.results.b?.ok).toBe(true);
    for (const id of ['c', 'd', 'e', 'f']) expect(out.results[id]).toEqual({ ok: false, message: 'not started: console lost' });
    expect(f.started).toEqual(['a', 'b']);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(String(errorSpy.mock.calls[0]?.[0])).toMatch(/^abort {3}a:/);
    expect(out.cause).toBe(`a: ${abortCause(first)}`);
  }

  it('stops new starts on exit 0xC0000142 and lets the running job finish', async () => {
    await abortCase({ ok: false, code: 3221225794, ms: 0, bytes: 0, message: 'exit 3221225794' });
  });

  it('stops new starts on a spawn error and names it', async () => {
    await abortCase({ ok: false, code: null, ms: 3, bytes: 0, err: 'EPERM', message: 'could not start: spawn EPERM' });
  });

  it('stops new starts on a quick silent failure', async () => {
    await abortCase({ ok: false, code: 1, ms: 300, bytes: 0, message: 'exit 1' });
  });

  it('runs every job after a real failure', async () => {
    const started: string[] = [];
    const run: Runner = (a) => {
      started.push(a.job.id);
      return Promise.resolve(a.job.id === 'a'
        ? { ok: false, code: 1, ms: 30000, bytes: 5000, message: 'exit 1' }
        : { ok: true, code: 0, ms: 9000, bytes: 4000 });
    };
    const out = await runAll(todo(), ctx, { par: 2, run });
    expect(started).toEqual(IDS);
    expect(out.aborted).toBe(false);
    expect(out.results.a?.ok).toBe(false);
    for (const id of IDS.slice(1)) expect(out.results[id]?.ok).toBe(true);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(out.cause).toBeNull();
  });
});

describe('abort text', () => {
  it('names the spawn error, the lost-console exit or the quick silent failure', () => {
    expect(abortCause({ ok: false, code: null, ms: 2, bytes: 0, err: 'ENOENT', message: 'could not start: spawn x ENOENT' })).toBe('spawn ENOENT');
    expect(abortCause({ ok: false, code: -1073741502, ms: 0, bytes: 0, message: 'exit -1073741502' })).toBe('exit 0xC0000142');
    expect(abortCause({ ok: false, code: 1, ms: 300, bytes: 0, message: 'exit 1' })).toBe('exit 1 in 0.3 s with 0 bytes of log');
  });
  it('keeps the ABORT line first and appends the cause', () => {
    expect(abortLine(null)).toBe(ABORT_LINE);
    expect(abortLine('a: spawn ENOENT')).toBe(`${ABORT_LINE} (a: spawn ENOENT)`);
  });
});

describe('runJob', () => {
  let outDir = '';
  beforeEach(() => { outDir = mkdtempSync(path.join(os.tmpdir(), 'gm-bake-runjob-')); });
  afterEach(() => { rmSync(outDir, { recursive: true, force: true }); });
  const node = (src: string): CmdFor => () => [process.execPath, ['-e', src], process.cwd(), process.env];

  it('reports a non-zero exit code and the bytes the job logged', async () => {
    const r = await runJob({ job: { id: 'x', outputs: [] }, hash: 'h' }, { outDir }, node("process.stdout.write('0123456789'); process.exit(3)"));
    expect(r.ok).toBe(false);
    expect(r.code).toBe(3);
    expect(r.message).toBe('exit 3');
    expect(r.bytes).toBe(10);
    expect(r.err).toBeUndefined();
    expect(r.ms).toBeGreaterThanOrEqual(0);
    expect(readFileSync(path.join(outDir, 'logs', 'x.log'), 'utf8')).toBe('0123456789');
    expect(consoleLost(r)).toBe(false);
    expect(existsSync(path.join(outDir, 'x.hash'))).toBe(false);
  });

  it('reports exit 0 with its outputs as ok and writes the hash', async () => {
    const r = await runJob({ job: { id: 'y', outputs: [] }, hash: 'abc' }, { outDir }, node("process.stdout.write('ok')"));
    expect(r).toMatchObject({ ok: true, code: 0, bytes: 2 });
    expect(readFileSync(path.join(outDir, 'y.hash'), 'utf8')).toBe('abc\n');
  });

  it('reports a spawn error by its code, with no exit code and an empty log', async () => {
    const missing = path.join(outDir, 'no-such-blender.exe');
    const r = await runJob({ job: { id: 'z', outputs: [] }, hash: 'h' }, { outDir }, () => [missing, [], outDir, process.env]);
    expect(r.ok).toBe(false);
    expect(r.err).toBe('ENOENT');
    expect(r.code).toBeNull();
    expect(r.bytes).toBe(0);
    expect(r.message).toMatch(/^could not start: .*ENOENT/);
    expect(consoleLost(r)).toBe(true);
    expect(abortCause(r)).toBe('spawn ENOENT');
  });
});

describe('stageExit', () => {
  it('maps failures and an abort to the exit code', () => {
    expect(stageExit(0, false)).toBe(0);
    expect(stageExit(3, false)).toBe(1);
    expect(stageExit(0, true)).toBe(5);
    expect(stageExit(3, true)).toBe(5);
  });
});
