/**
 * (heap-asserts) Young-generation bytes a hot call leaves per call: lightField's gc() + new-space method
 * (docs/archive/lightfield-heap), shared by every "never allocates" check. `process.memoryUsage().heapUsed` over 100k calls
 * read whatever a scavenge happened to leave (a 32 B call read 0.4 B when a scavenge landed in the window, a clean one
 * MBs of other work's garbage), so those checks passed or failed with GC timing.
 *
 * Each round starts from a gc(), runs `n` calls small enough to stay inside the young generation (no scavenge can make
 * a reading low), and reads new space before and after, minus what the read itself allocates. The smallest of up to
 * 40 rounds is kept, and the rounds stop once it meets `goal`. Code that allocates an object every call reads its size
 * in every round, so it never meets a goal under one small object.
 *
 * Tier-up is synchronous (`--no-concurrent-recompilation`, `--no-concurrent-osr`, set when this module loads): a
 * function is optimized on the main thread the moment its call budget trips, not whenever a background compiler thread
 * gets CPU. Before (4.60.0), under load the rounds read whatever tier the code had reached by then: lightField's
 * bodyLevel in Sparkplug read 100-127 B against its 128 B limit (Turbofan: 64.8), levelAt 49-112 B against 64
 * (Turbofan: 32.0), so a starved compiler thread decided the result. Now the warm-up ends in optimized code on any
 * machine, and every run reads the same bytes.
 *
 * (lightfield-heap-3) Those flags are set after V8 started, and a starved machine still varied which calls the loop's
 * optimized code inlined: lightField's bodyLevel read 32.8 B on an idle machine but 61.6 B in 2 of 4 runs pinned to
 * one CPU with a busy loop, and 138.8 B (all 80 rounds) on train 117's CI against its 88 B limit, all at Turbofan
 * (0x51). So after the warm-up the loop is deoptimized and recompiled on the main thread from its full feedback
 * (`%OptimizeFunctionOnNextCall`). That alone was not enough: under load bodyLevel still read 61.6 B in 2 of 6 runs.
 * `--trace-turbo-inlining` showed why: Turbofan charges a callee's own optimized code (the bytecode that code
 * inlined) against the caller's 920-bytecode inlining budget, and which callees already had their own code, with how
 * much inlined, depended on when Maglev / Sparkplug background compiles landed (Maglev stays concurrent whatever the
 * flags). 32.8 B: bodyLevel and both totalInto calls inlined; 61.6 B: totalInto had its own code (832 inlined) and was
 * called out of line; 78.8 B: bodyLevel had its own code (689) and was called out of line. So the recompile runs with
 * that budget lifted (`MAX_INLINE`): every callee under V8's per-function limit (460 bytecodes) is inlined, whatever
 * its history, and the reading depends on the code alone (bodyLevel 32.0 B: its two out-of-line levelInto calls, 30
 * of 30 stressed runs; was 2 bad in 30). The budget is restored after; nothing else compiles under it. An allocation
 * per call is still in every reading: a control vector kept in a ring still reads 256 B.
 *
 * The measured loop must not allocate itself: inputs precomputed with `inputs()` (no double arithmetic in the loop),
 * results into a typed array such as `sink` (`acc += x` on a captured `let` boxes 16 B an iteration), no closures or
 * literals in the loop. `ALLOC_TRACE=1` logs every round's reading with the loop's optimization status (hex,
 * `%GetOptimizationStatus`: 0x51 Turbofan, 0x31 Maglev, 0x8001 Sparkplug).
 */
import v8 from 'node:v8';
import vm from 'node:vm';

/** V8 boxes a double passed to or returned from a call it does not inline: a 16-byte HeapNumber, not an object. */
export const HEAP_NUMBER = 16;
// The smallest real allocation a hot path could make, a `{ x, y, z }` literal, reads 48-64 B; a closure 40-96 B.

/** A typed result slot for measured loops: `sink[0] += f(...)` keeps the result live without boxing it. */
export const sink = new Float64Array(4);

/** `f(0) .. f(n - 1)` precomputed, so a measured loop only reads its inputs (index it with `k`, k < n). */
export function inputs(n: number, f: (k: number) => number): Float64Array {
  const a = new Float64Array(n);
  for (let k = 0; k < n; k++) a[k] = f(k);
  return a;
}

v8.setFlagsFromString('--expose-gc');
const gc = vm.runInNewContext('gc') as () => void;
v8.setFlagsFromString('--no-concurrent-recompilation');
v8.setFlagsFromString('--no-concurrent-osr');
v8.setFlagsFromString('--allow-natives-syntax');
const optStatus = new Function('f', 'return %GetOptimizationStatus(f)') as (f: unknown) => number;
const deopt = new Function('f', '%DeoptimizeFunction(f)') as (f: unknown) => void;
const prepare = new Function('f', '%PrepareFunctionForOptimization(f)') as (f: unknown) => void;
const optimizeNext = new Function('f', '%OptimizeFunctionOnNextCall(f)') as (f: unknown) => void;
/** The lifted Turbofan inlining budget for the measured loop's recompile (bytecodes; V8's defaults: 920 cumulative, 4600
 *  absolute). Far above any hot path here, so only V8's per-function limit decides what is inlined. */
const MAX_INLINE = 100000;
/** Sets both budgets (`null`: V8's defaults, Node 24). Read by Turbofan at the start of each compile. */
function inlineBudget(b: number | null): void {
  v8.setFlagsFromString(`--max-inlined-bytecode-size-cumulative=${b ?? 920}`);
  v8.setFlagsFromString(`--max-inlined-bytecode-size-absolute=${b ?? 4600}`);
}
const newSpace = (): number => v8.getHeapSpaceStatistics().find((x) => x.space_name === 'new_space')!.space_used_size;

export interface AllocOpts {
  /** Calls a round (the `n` given to `fn`, default 2000): keep `n` x the worst allocation guarded against under about
   *  0.5 MB (the young generation is at least 1 MB after a gc()), and size `inputs()` tables to it. */
  n?: number;
  /** Calls before the first round (default 50 n), in rounds of `n`. */
  warm?: number;
}

/** The fewest bytes per call `fn(n)` (which makes `n` calls) left in new space over up to 40 rounds. */
export async function bytesPerCall(fn: (n: number) => void, goal: number, opts: AllocOpts = {}): Promise<number> {
  const n = opts.n ?? 2000;
  const warm = opts.warm ?? 50 * n;
  for (let w = 0; w < warm; w += n) fn(n);
  // a fresh synchronous Turbofan compile from the full feedback, with the inlining budget lifted so the callees' own
  // code cannot change what is inlined (see the header): the same inlining on any machine
  deopt(fn);
  prepare(fn);
  fn(n);
  optimizeNext(fn);
  inlineBudget(MAX_INLINE);
  try {
    fn(n);
  } finally {
    inlineBudget(null);
  }
  const trace: string[] | null = process.env.ALLOC_TRACE ? [] : null;
  let best = Infinity;
  const gcs = new v8.GCProfiler();
  for (let k = 0; k < 40; k++) {
    gc();
    gcs.start();
    const r0 = newSpace();
    const r1 = newSpace(); // r1 - r0: what one read allocates
    fn(n);
    const r2 = newSpace();
    // a GC inside the round is not a reading. Counted, not inferred from r2 under r1: a scavenge can leave new space
    // at or just above r1 (with only that check, shadowCues' 32 B control once read 0.8 B under load)
    const clean = gcs.stop().statistics.length === 0;
    if (clean) best = Math.min(best, Math.max(0, r2 - r1 - (r1 - r0)) / n);
    trace?.push(`${k}:${((r2 - r1 - (r1 - r0)) / n).toFixed(1)}/0x${optStatus(fn).toString(16)}${clean ? '' : '/gc'}`);
    if (k >= 4 && best <= goal) break;
    await new Promise((r) => setImmediate(r));
  }
  if (trace) console.info(`allocPerCall goal ${goal.toFixed(1)} best ${best.toFixed(1)}: ${trace.join(' ')}`);
  return best;
}
