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
  const trace: string[] | null = process.env.ALLOC_TRACE ? [] : null;
  let best = Infinity;
  for (let k = 0; k < 40; k++) {
    gc();
    const r0 = newSpace();
    const r1 = newSpace(); // r1 - r0: what one read allocates
    fn(n);
    const r2 = newSpace();
    // a scavenge inside the round (r2 under r1) is not a reading
    if (r2 >= r1) best = Math.min(best, Math.max(0, r2 - r1 - (r1 - r0)) / n);
    trace?.push(`${k}:${((r2 - r1 - (r1 - r0)) / n).toFixed(1)}/0x${optStatus(fn).toString(16)}${r2 < r1 ? '/scavenge' : ''}`);
    if (k >= 4 && best <= goal) break;
    await new Promise((r) => setImmediate(r));
  }
  if (trace) console.info(`allocPerCall goal ${goal.toFixed(1)} best ${best.toFixed(1)}: ${trace.join(' ')}`);
  return best;
}
