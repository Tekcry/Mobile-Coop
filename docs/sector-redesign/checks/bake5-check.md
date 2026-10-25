# bake5 check (feature/sector-redesign-bake5 @ 522727fb)

Checker: fresh Opus, 2026-10-25. Diff `d2ccf630..522727fb` (7 files), brief `origin/cloud-queue:briefs/sector-redesign-bake5.md`,
previous check `checks/bake4-check.md` (held polish 1-8, all built here).

## Verdict: PASS

No must-fix. Nothing is broken, unplayable or off-intent; the held items below are polish.

## Checks rerun
- `npm run typecheck:fast`: clean.
- `npx vitest run tests/sectionBakeRobust.test.ts tests/sectionBake.test.ts tests/sectionBakeCampus.test.ts
  tests/changesFragments.test.ts --maxWorkers=2`: 4 files, 34 passed, 1 skipped (heavy campus case) = robust 19 (16 + 3),
  sectionBake 11, campus 3 + 1 skipped, fragments 1. Matches the builder's counts.
- Mutations (applied one at a time to the head sources, the robust file rerun, the source restored; tree clean after):
  | Mutation | Result |
  | --- | --- |
  | no busy reject in `dispose` (`workerPool.ts:157`) | 2 fail (bake4 cancel test, bake5 dispose test) |
  | spawn before reject, no try / catch | 1 fails (failing-spawn test: `cancel` throws) |
  | reject moved after `spawn` inside the `try` | 1 fails (failing-spawn test: job 1 never settles) |
  | no handler nulling in `retire` | 2 fail (null asserts) |
  | no `done` guard (`:91`) | 1 fails (`:452`, the late message replay idles wA first) |
  | guard on messages only (`if (r && ...)`) | 1 fails at the jF assert (`:458`): the late `onerror` assert bites on its own |
  | no `this.all.splice(k, 1)` on a failed spawn | 1 fails (`size` 2, not 1) |
  | warn on every cap (no `warnedCap`) | 1 fails (cap warning count) |
  | `ms` from a reset start (`now - performance.now()`) | all pass (held polish 2) |
  | no `busy.clear()` in `dispose` | all pass (no observable effect after dispose; fine) |

## Findings
1. **Brief steps 1-9.** All built as asked, inside the brief's file list; the report's file:line pointers match the head.
   - Step 1: `dispose` (`workerPool.ts:151-162`) retires every worker, rejects busy then queued, clears both.
   - Steps 2 + 5: `cancel` (`:108-141`) does `busy.delete`, `retire`, `k = all.indexOf(w)`, reject, then `spawn` in
     `try`; on a throw it splices `k` (the pool runs one short), warns once per pool (`warnedSpawn`, `:29`), pumps and
     returns true. The unreachable `all.push` is gone. JSDoc updated.
   - Step 3: `retire` (`:145-149`) nulls both handlers, then terminates; used by `cancel` and `dispose`. The `done`
     guard (`:91`) stays.
   - Step 5: `warnedCap` (`sectionJobs.ts:127`); the warn (`:248-253`) reads `ms` before `failed1`, once per baker,
     only on a first try. The message has neither `failed twice` nor `failed to bake`.
   - Steps 6-9: fake pools gain `cancel`, the lighting.md sentence matches the code, the FakeWorker is hoisted with
     `failSpawn` and per-test reset / stub / unstub in `try` / `finally`, and the fragment is `kind: patch`.
2. **Pool correctness.**
   - No double settle. `cancel` removes `p` from `busy` before it rejects it, so `dispose` cannot reject it again.
     Queued and busy pendings are disjoint. A late event from a retired worker hits a null handler; a captured handler
     still stops at the `done` guard, because the worker left `all`.
   - No leaked handlers. Every worker that leaves `all` goes through `retire`: cancel, dispose, and the failed-spawn
     splice, which removes an already retired `w`. Replacements get fresh handlers from `spawn`.
   - Pool size. After a successful spawn, `all[k] = nw` keeps `size`. After a failed one, `size` drops by one.
     `SectionBaker.pump` reads `pool.size` live (`sectionJobs.ts:278`), so it stops over-dispatching. Jobs already
     queued past the new size wait in the pool queue, where the cap covers them.
   - The reject is synchronous, but its handlers run in a microtask. The baker's token bump in `failed1`
     (synchronous, same tick) always lands first, as in bake4.
3. **0-worker pool (only `cancel` + failed spawns can reach it). It is handled, but slowly.**
   - `SectionBaker.pump` caps at `max(1, size)`, so one lamp at a time sits queued in the empty pool.
   - The 5 s `checkStalled` timer fails it at `JOB_CAP_MS`, cancels it (queue branch) and retries on the pool. The
     retry fails at `JOB_RETRY_CAP_MS`, then the lamp bakes inline.
   - That works out to about 80-85 s per remaining lamp, one at a time. It never deadlocks, and every lamp bakes, but
     a full campus would take hours.
   - Reaching it needs every worker (at least 2) to hang past 60 s and every replacement `new Worker` to throw
     synchronously. A worker whose script fails to load fires `onerror` asynchronously; it does not throw.
   - It is not a regression: before bake5 a throwing spawn escaped `checkStalled` with the dead worker still in `all`.
   - The brief scoped it out, so it is held as polish 1, not a fix.
4. **No per-frame allocation.** The new allocations (two Errors, one warn string each guarded by a once flag) sit on
   `cancel` / `dispose` / the 5 s timer only. `retire` allocates nothing. Strict TS is clean: `nw` is definitely
   assigned, because the `catch` returns.
5. **Docs.** The `lighting.md` "Failures" sentence and the fragment match steps 2 and 5. The fragment is player-facing
   and passes `changesFragments`.

## Held polish (not blocking)
1. `src/voxel/workerPool.ts:127-133` (the failed-spawn branch): when `this.all.length === 0` after the splice, reject
   every queued pending, and make `sky` / `lamps` / `moon` (`:54`, `:63`, `:72`) reject at once while
   `!this.inline && this.all.length === 0`. The baker then reaches its inline bake in two microtasks instead of about
   80 s per lamp. Done looks like this: a test with a pool of 1, `failSpawn`, `cancel` of the running job, and the next
   `lamps()` rejecting before `settle()` resolves.
2. `tests/sectionBakeRobust.test.ts:548`: `ms > JOB_CAP_MS` cannot tell a read before `failed1` from one after it. Both
   give about `JOB_CAP_MS + 1`, because the test's clock offset is from `performance.now()`. Pass an offset well past
   the cap (for example `+ JOB_CAP_MS + 30_000`) and assert `ms >= JOB_CAP_MS + 30_000`. A start-time reset then reads
   about 30 000 less.
3. `tests/sectionBakeRobust.test.ts:529`: the warn-once of `warnedSpawn` is untested, because only one cancel fails.
   A second failing cancel, still with one warn, would pin it.
4. Pre-existing, `src/voxel/workerPool.ts:89-99` `done`: an event from a worker in `all` but not in `busy` (an idle
   worker's async load error) pushes it into `idle` a second time. `pump` can then post two jobs to it, and the first
   pending is overwritten in `busy`. The baker's cap and token cover it. The fix is `if (!p) return;` after the
   `busy.get`, or retiring that worker.
5. `src/voxel/sectionJobs.ts:252`: the warn says "ran past its cap" for a job that may have sat queued in the pool and
   never run. Wording only.
