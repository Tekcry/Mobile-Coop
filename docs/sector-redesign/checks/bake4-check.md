# bake4 check (PR #385, feature/sector-redesign-bake4 @ ad69c83e)

Checker: fresh Opus, 2026-10-25. Diff `origin/master...HEAD` (5 files), brief `origin/cloud-queue:briefs/sector-redesign-bake4.md`.

## Verdict: PASS

## Checks rerun
- `npm run typecheck:fast`: clean.
- `npx vitest run tests/sectionBakeRobust.test.ts tests/sectionBake*.test.ts --maxWorkers=2`: 3 files, 30 passed, 1 skipped
  (heavy campus case), matching the builder's count. `tests/changesFragments.test.ts` 1/1.

## Findings
1. **Brief steps.** All four built as asked, inside the brief's file list. Step 1: `sectionJobs.ts:236`. Step 2: the
   held-order test. Step 3: ~90 s, fixed in this branch's fragment and the `JOB_RETRY_CAP_MS` comment (`:31-34`); bake3's
   fragment untouched. Step 4: robust polish 3 built as `WorkerPool.cancel` with a unit test. The report's file:line
   pointers match the code. `lighting.md` was left alone correctly (no number changed).
2. **Retry cap.** `capR = Math.min(cap0, JOB_RETRY_CAP_MS)`. In production `capMs` is never passed
   (`lightBake.ts:106`), so the caps stay 60 s / 20 s and the first-try path (`cap0`) is unchanged. A `capMs` under
   20 s now bounds the retry too, and a test covers it.
3. **WorkerPool.cancel** (`workerPool.ts:105-128`):
   - Queued job: spliced out and rejected once.
   - Running job: removed from `busy` first, the worker terminated and replaced at the same index of `all` (size kept),
     the new worker pushed to `idle`, `pump` hands it the next queued job (the test asserts `nw.posted == [jD]`).
   - The rejection runs in a microtask. In the baker it is dropped by the token, because `failed1` either redispatches
     (token + 1) or bumps the token before inline. No double settle.
   - `done` returns early for a worker not in `all`, so a late `onmessage` / `onerror` from a terminated worker never
     puts it back in `idle` and never touches the new worker's pending job.
   - No reentrancy: `cancel` is synchronous and the promise callbacks are deferred, so "disposed mid-cancel" cannot
     happen. After `dispose`, `cancel` returns false.
   - `jobs[i]` is nulled before the cancel and in `endJob`, so a later check never cancels a stale job. Each cancel names
     that try's own job (tested).
4. **Behaviour change (first try killed at 60 s): keep.**
   - It is true that a legit lamp that needs over 60 s in a worker now always fails both tries (60-65 s, then 20-25 s)
     and bakes inline: about 150 s for that lamp plus a main-thread freeze of roughly its own length. Before bake4 the
     first try kept running and landed at about 61 s.
   - That machine is not realistic. The bake is CPU work in workers; the GPU is irrelevant, so a GPU-less laptop matters
     only through CPU speed. The largest campus lamps (floods of 3.35 M cells) take a few seconds each on the busy
     desktop: 217 s single-threaded for all 134 lamps (`SECTION-BAKE.md`), and the bake3 check measured a 2-5 s inline
     hitch per flood. 60 s per lamp is a 10-20x margin.
   - A machine past that margin would need about 15 min for the 30 floods on 2 workers anyway. The bake3 20 s retry cap
     is the tighter limit for slow machines, and it is unchanged here.
   - Killing the hung worker is the bigger win: a silently dead worker no longer costs a pool slot for the rest of the
     bake.
5. **Held-order test and worst-case math.**
   - Mutation-think. The test takes `L` as the third held lamp (`[a, b, L, c]`).
     - A swap (`Q[j] = Q[head]`) gives `[L, b, a, c]` and fails the final order assert.
     - An off-by-one `copyWithin(head + 1, head, j + 1)` overwrites `c`, which never bakes, so `finished` never resolves
       and the test times out (fails).
     - No pull-forward at all fails `landed[L] == 1` before the pool idles.
     - The test pins the `c` after `L` too.
   - Math: checks every 5 s with strict `>`. The first try is caught up to 65 s after dispatch. The retry is dispatched
     inside that check, so `jobT0` is about the check time, and it is caught at the first check past 20 s, i.e. up to
     25 s later. 65 + 25 = ~90 s, agreed. This fits under the menu gate's 120 s cap (`menuGate.ts:55`).
6. **Hard rules.**
   - Nothing runs per frame. `checkStalled` runs on a 5 s timer, adds one `Math.min` per call and allocates only on a
     stall (Error, cancel's Map iterator).
   - `jobs` is allocated once per baker.
   - Strict TS clean, `import type` used for `LampJob`.
   - No net, save or flag paths touched.

## Must-fix
None.

## Held polish
1. `src/voxel/workerPool.ts:130-137` `dispose`: running (`busy`) pendings never settle (this predates bake4). Reject
   them and clear `busy`, matching what `cancel` does.
2. `src/voxel/workerPool.ts:117-123`: if `spawn()` throws (Worker construction failure), the old worker stays in `all`
   terminated and `p` never rejects. Reject `p` and swap `all[k]` before spawning, or wrap `spawn` in try/catch and
   shrink the pool. Unlikely in practice.
3. `src/voxel/sectionJobs.ts:240-245`: a first-try cap is silent; only the inline warning fires later. Warn once with
   the elapsed ms, so a real slow lamp (finding 4) shows up in a playtest log.
4. `src/voxel/workerPool.ts:117`: null the terminated worker's `onmessage` / `onerror`. The `done` guard already covers
   them; this is tidiness only.
5. `src/voxel/workerPool.ts:121`: `else this.all.push(nw)` is unreachable, because `cancel` returns false once
   disposed and `all` otherwise holds every busy worker. Drop it, or leave a comment.
6. `tests/sectionBake.test.ts:58,288`: those fake pools have no `cancel`. A future test there that reaches a stalled
   `checkStalled` would throw a TypeError. Add `cancel: () => false`.
7. `docs/systems/lighting.md` "Failures": one line saying that a stalled worker is terminated and replaced (the builder
   already lists it as open).
8. The stub-Worker test covers a late `onmessage` from a terminated worker, not a late `onerror`. It is the same guard,
   so a one-line addition would cover it.
