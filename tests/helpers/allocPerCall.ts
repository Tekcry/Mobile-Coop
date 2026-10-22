/**
 * (heap-asserts) Young-generation bytes a hot call leaves per call: lightField's gc() + new-space method
 * (docs/lightfield-heap), shared by every "never allocates" check. `process.memoryUsage().heapUsed` over 100k calls
 * read whatever a scavenge happened to leave (a 32 B call read 0.4 B when a scavenge landed in the window, a clean one
 * MBs of other work's garbage), so those checks passed or failed with GC timing.
 *
 * Each round starts from a gc(), runs `n` calls small enough to stay inside the young generation (no scavenge can make
 * a reading low), and reads new space before and after, minus what the read itself allocates. Up to 40 rounds with a
 * short yield between them let the background compiler install the optimized code (unoptimized code boxes more
 * doubles); the smallest round is kept, and the rounds stop once it meets `goal`. Code that allocates an object every
 * call reads its size in every round, so it never meets a goal under one small object.
 *
 * The measured loop must not allocate itself: inputs precomputed with `inputs()` (no double arithmetic in the loop),
 * results into a typed array such as `sink` (`acc += x` on a captured `let` boxes 16 B an iteration), no closures or
 * literals in the loop.
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
  let best = Infinity;
  for (let k = 0; k < 40; k++) {
    gc();
    const r0 = newSpace();
    const r1 = newSpace(); // r1 - r0: what one read allocates
    fn(n);
    const r2 = newSpace();
    // a scavenge inside the round (r2 under r1) is not a reading
    if (r2 >= r1) best = Math.min(best, Math.max(0, r2 - r1 - (r1 - r0)) / n);
    if (k >= 4 && best <= goal) break;
    await new Promise((r) => setTimeout(r, 25));
  }
  return best;
}
