# section-bake robust (feature/sector-redesign-bake2, base 5cc02048)

The polish items from checks A (P6, P8) and B (2, 3, 4, 5, 8, 10). Builder: Opus, desktop agent (node only: no e2e, no GPU,
no build). Design: `docs/sector-redesign/briefs/SECTION-BAKE.md`.

## Per item (file:line)
1. **Check A P6, a failed lamp is never cached.** `src/voxel/sectionJobs.ts:326` `retryInline`: when the inline bake
   throws too, `failed` counts it and the first failure logs once (:334). The lamp lands dark for this match. `complete`
   (:398) sets `saveDue` only when `failed === 0`, so neither `complete` nor `dispose`/`setLive` caches it. The next load
   bakes it again. `incomplete` getter (:184).
2. **Check B 3, retry on the pool, idle-only inline, in-flight cap.**
   - `dispatch` (:258) gives each try a token and a start time.
   - `failed1` (:283): the first failure (a worker error or the cap) sends the lamp to the pool once more (`poolRetries`).
     The second failure queues it for the inline bake. The main-thread fallback is logged once.
   - `drainInline` (:307): during the load the inline bake runs at once. Once `markPlaying` is set it runs only while no
     pool job is in flight, one lamp per task (`setTimeout` 0), so frames run between lamps.
   - `JOB_CAP_MS` 60 s (:29). `checkStalled` (:220) runs on a 5 s interval set in `start` (:161; `unref` in node) and
     cleared at `complete`/`dispose`. A job past the cap counts as failed, so a worker that dies silently no longer
     hangs `whenReady`.
   - A late answer from a timed-out job still lands if the lamp is not in yet (same bytes). A late failure is ignored
     by its token. `landed` (:340) ignores a lamp already in.
3. **Check A P8, no worker leak on a failed load.**
   - `world.ts` makes the baker and is off limits, so running bakers are listed in `sectionJobs.ts`: `RUNNING` (:53),
     with a creation `serial`. `sectionBakerMark()` (:62) returns the last serial. `disposeSectionBakersSince(mark)` (:67)
     disposes every running baker made after that mark.
   - `src/game/gameState.ts:920-926`: `GameState.create` takes a mark before `World.create`. On a throw it disposes the
     bakers made since, then rethrows. The import is at :5.
   - `src/world/lightBake.ts:100-118`: if the moon bake rejects beside a started section bake, `bakeLevelLight` disposes
     that baker itself.
4. **Check B 2, no per-batch whole-atlas re-upload.**
   - `src/world/bakedLamps.ts`: the first false from `uploadTile` sets `tileFailed` (:260). After that no sub-uploads
     run, and stepping the queue stops (:503).
   - The whole atlas goes up (`atlasDue` :262, done in `stepLanding` :833 on the next frame) in two cases: when a
     live-section lamp lands (:755, light parity) and once when the baker's last batch arrives (:767-769). Background
     batches in between only queue.
   - A whole re-upload empties the queue: each lamp in it fades in, or snaps to full if it is in the live section.
5. **Check B 4, live landings in play go to the queue head.**
   - `landed` (:741): during the load, a live-section lamp's tile still goes up at once. Once the baker is `playing` it
     goes to the head of the queue instead (`queueFirst` :777, :756), so the `TILE_BUDGET` bytes a frame applies.
   - Tile progress is now kept per lamp (`tileZ` Int32Array), so a head that is part-way up can be passed safely.
   - `tileUp` (:879): a live-section lamp whose tile has finished is in full at once (no fade).
6. **Check B 5, `setLive` snaps the new live section in.**
   - `SectionBaker.setLive` calls the `onLive` listeners (sectionJobs :175, :212). `BakedLamps` subscribes (:330).
   - `liveChanged` (:790): the section's fading lamps are set to fade 1 and leave the fade list. Its queued lamps are set
     to fade 1 and moved to the queue head by a stable partition into a preallocated scratch array.
   - The colours go up with one whole upload on the next frame. Without sub-uploads, an `atlasDue` is set.
7. **Check B 8.** `parts` is dropped at `complete` (sectionJobs :387). It is no longer `readonly`.
8. **Check B 10.** `scripts/e2e-lib.mjs:224-227`: when the bake wait times out or fails it now logs a `console.warn`
   (`[e2e-lib] section bake wait timed out or failed (240 s cap): ...`) instead of `.catch(() => {})`.

Docs: `docs/systems/lighting.md` "Per-section lamp bake", new "Failures" bullet.

## Tests (node, `--maxWorkers=2`)
- New `tests/sectionBakeRobust.test.ts`, **9/9**. Fixture: a six-lamp strip with three sections given as masks, driven by
  a hand-run pool. `bakeLamps` and `saveLamps` are partly mocked (the inline throw, the cache write). `BakedLamps` runs on
  a NullEngine (the `lampDataUpload` pattern).
  - Covered: a pool retry with no inline bake and the full bake's bytes; the in-flight cap (retry, then inline,
    `whenReady` released); idle-only inline during play, one lamp per task; P6 (dark lamps, logged once, never cached) and
    a clean bake cached once; P8 (only bakers made after the mark are stopped); the picture: no per-batch re-upload
    without sub-uploads, live landings at the queue head during play, the `setLive` snap.
  - Mutation check: reverting P6, the pool retry, the queue-head path and the done re-upload fails 6 of 9.
- `tests/sectionBake.test.ts` 11/11, `tests/sectionBakeCampus.test.ts` 3 passed + 1 skipped (heavy, `SECTION_BAKE_FULL`),
  `tests/bounceGrid.test.ts` 11/11, `tests/lampDataUpload.test.ts` 3/3 (BakedLamps touched): 37 passed, 1 skipped
  across the 5 files.
- `npx tsc --noEmit -p .`: clean. eslint on the changed `src` and test files: clean. `scripts/` is eslint-ignored by the
  project, and `node --check` passes.

## Deviations
- Item 3: `gameState.ts` gained one import line (:5) beside the World.create failure path. `lightBake.ts` also disposes
  its own baker when the moon bake rejects.
- Item 4: the brief says "one `reuploadAtlas` when the baker is done". The live section still gets a whole re-upload
  when its lamps land, because the picture has to match the meter there. Background batches wait for the one re-upload
  at the end. This path is unreachable on the WebGL engine anyway.
- Item 5: during the load (before `markPlaying`) live-section tiles still go up as they land, so the first frame of play
  is right. The queue head is used only once the match plays.
- `SectionBakerInput.capMs` (tests) and a public `checkStalled(now)`, so the cap can be tested without fake timers.

## Open
- Item 2: a held inline bake still runs on the main thread once the pool is idle. That is one lamp per task, so a big
  flood is still a single 2-5 s hitch, rare (two failures for the same lamp) and after the background is done. The
  alternative is to hold it until the next quiet moment (the SB14 connector cycle). But a live-section lamp of a late
  joiner would then wait for a section change while the SB9 gate waits for that lamp. Which does Michael prefer? The
  build keeps "pool idle", as the brief says.
- `disposeSectionBakersSince` stops every running baker made after the mark. Two `GameState.create` calls running at
  once in one page would cross. That does not happen today: one match per page, and the old one is disposed first.

# bake3 (feature/sector-redesign-bake3, base feature/sector-redesign-bake2 @ 54cdb9e1)

Check polish 1, 2 and 4 (`section-bake-robust-check.md`). Builder: Opus, desktop agent (node only: no e2e, no GPU, no
build). Only `src/voxel/sectionJobs.ts`, `tests/sectionBakeRobust.test.ts`, the fragment and this section changed.

## What changed (file:line)
1. **P2, a live-section inline lamp skips the idle wait.** `drainInline` (`sectionJobs.ts:314`): while the match plays
   and a pool job is in flight, it scans the inline queue from `inlineHead` for the first lamp that is not landed and is
   `plan.liveMember(i)`. None: it stops, as before. Found at `j`: `copyWithin` shifts `[head, j)` up one slot and the live
   lamp goes to `head` (:324), then it bakes as before (one lamp per task, `setTimeout` 0 before the next).
   - Queue-shape choice: a stable shift in the one existing `Int32Array`, not a swap and not a second queue. A swap
     would reorder the held non-live lamps; a second queue would need a live/non-live split at enqueue time, but
     membership changes with `setLive`, so a lamp queued as non-live would have to move between queues on a live change.
     Scanning at drain time reads the current live section, allocates nothing (index loop, `copyWithin` on the typed
     array) and the queue holds at most the lamps that failed twice, so the scan is a few entries.
2. **P1, a non-live lamp still waits.** During play it bakes only once the pool is idle or once its section goes live:
   `setLive` (:178) now calls `drainInline` after the live listeners, so a held lamp of the new live section bakes then.
   Nothing else changed: the check's polish 1 option "hold non-live lamps to `setLive` / match end" was not taken (the
   brief keeps the idle rule).
3. **P4, a shorter retry cap.** `JOB_RETRY_CAP_MS = 20_000` exported (:31). `checkStalled` (:229) picks the cap per lamp:
   `tries[i] === 1` (the retry is in flight) uses `JOB_RETRY_CAP_MS`, a first try keeps `capMs ?? JOB_CAP_MS`. Both caps
   are read once per call; the loop allocates nothing. Worst case with a silently dead worker: 60 + 20 + 5 s ~ 85 s
   (was ~125 s).

## Tests (node, `--maxWorkers=2`)
- `npx tsc --noEmit -p .`: clean. eslint on both changed files: clean.
- `tests/sectionBakeRobust.test.ts` **12/12** (9 unchanged + 3 new, describe "bake3"): (a) during play lamp 0 (live
  section 0) rejects twice and bakes inline at once while pool jobs are in flight; bytes equal the full bake. (b) lamp 2
  (section 1) rejects twice during play and stays dark across another landing while jobs run; `setLive(1)` bakes it at
  once with jobs still in flight; bytes equal the full bake. (c) lamp 0's retry hangs, lamp 1's first try hangs: at
  +19 s nothing; at +30 s lamp 0 counts as failed (inline at once, the load) and lamp 1 is untouched.
- `tests/sectionBake.test.ts` 11/11, `tests/sectionBakeCampus.test.ts` 3 passed + 1 skipped (heavy). All files that
  import `sectionJobs` / `sectionBake` (`grep -rl`): 26 passed, 1 skipped across 3 files.
- Mutation check: the old idle-only rule fails (a) and (b); dropping the `setLive` drain fails (b); a single cap fails (c).

## Deviations
- None in code. `docs/systems/lighting.md` "Failures" (:161-163) still says the inline bake waits for an idle pool and
  names only the 60 s cap; it was outside this brief's file list, so it needs a one-line follow-up (live-section lamps
  skip the wait; the retry's cap is 20 s).

# bake4 (feature/sector-redesign-bake4, base feature/sector-redesign-bake3 @ 820480c3)

bake3 check polish 2, 3, 4 and robust check polish 3. Builder: Opus, cloud agent (node only: no e2e, no GPU, no build).
Only `src/voxel/sectionJobs.ts`, `src/voxel/workerPool.ts`, `tests/sectionBakeRobust.test.ts`, the fragment and this
section changed.

## What changed (file:line)
1. **The retry cap never exceeds the first try's** (bake3 polish 2). `checkStalled` (`sectionJobs.ts:236`):
   `capR = Math.min(cap0, JOB_RETRY_CAP_MS)`, read once per call. No caller passes `capMs` today, so production is
   unchanged (60 s / 20 s).
2. **Held order pinned** (bake3 polish 4). Test only: queue [a, b, L, c], L's section goes live -> L bakes at once
   while a pool job runs; once the pool idles a, b, c bake in that order. A swap (`Q[j] = Q[head]`) fails it.
3. **Worst case ~90 s** (bake3 polish 3). Agreed with the checker: `checkStalled` runs every 5 s and compares strictly,
   so a first try started just after a check is caught up to 60 + 5 s later; the retry starts at that check and is
   caught at the first check past 20 s, up to 25 s -> ~90 s (was ~130 s on the same count, the old "~125 s"). Fixed in
   the `JOB_RETRY_CAP_MS` comment (`sectionJobs.ts:31`) and this branch's fragment; bake3's fragment untouched.
4. **A stalled job is cancelled on the pool** (robust check polish 3). `SectionBaker` keeps each lamp's current job
   (`jobs`, :117, set in `dispatch` :287, cleared in `endJob` :298); past its cap `checkStalled` (:241-244) calls
   `WorkerPool.cancel(job)` before `failed1`. `cancel` (`workerPool.ts:105`): a queued job is dropped; a running one has
   its worker terminated and replaced (`spawn`), `all` keeps its size, the queue pumps; the promise rejects (dropped by
   the baker's token, which `failed1` bumps first). `done` ignores a worker no longer in `all` (a terminated worker's
   late message never puts it back in `idle`). `cancel` after `dispose` or inline: false. With the hung worker
   replaced, a section job no longer ages in the pool's queue, so the "clock starts at enqueue" half of the polish item
   is moot (`poolJobs <= size`); no start hook added.
   - Behaviour choice: a first try past 60 s is now killed, not left running beside its retry (no duplicate job; a
     genuinely slow lamp > 60 s loses that try and goes retry -> inline, as the caps already define "failed").

## Tests (node, `--maxWorkers=2`)
- `npx tsc --noEmit -p .`: clean. eslint on the three changed code / test files: clean.
- `npx vitest run tests/sectionBake.test.ts tests/sectionBakeCampus.test.ts tests/sectionBakeRobust.test.ts`: 3 files,
  30 passed, 1 skipped (heavy campus case). `sectionBakeRobust` 16/16 (12 + 4 new, describe "bake4"): capMs 5 s retry
  cap; held order; cancel called with each try's own job; `WorkerPool.cancel` with a stubbed `Worker` (queued drop,
  terminate + replace, stale answer ignored, false after dispose).
- Mutation check (each mutated, run, restored): no `Math.min`, a swap for `copyWithin`, no cancel call, no `done`
  guard: each fails exactly its new test.

## Deviations / open
- `docs/systems/lighting.md` "Failures" not edited (no number in it changed); it does not mention that a stalled
  worker is terminated and replaced: a one-line follow-up if wanted.
- The real `Worker` terminate / respawn path is unit-tested with a stub only; no e2e reaches a hung worker.

# bake5 (feature/sector-redesign-bake5, base feature/sector-redesign-bake4 @ d2ccf630)

The bake4 check's held polish 1-8 (`checks/bake4-check.md`), built by a cloud builder. Nothing here runs per frame: the
new allocations (an Error, a warn string) are on `cancel` / `dispose` / the 5 s `checkStalled` timer only. No cap,
timing or bake order change.

## What changed (file:line, on the bake5 head)
1. **`dispose` settles the running jobs** (polish 1). `workerPool.ts:151-162`: every `busy` pending rejects with
   `voxel pool disposed` (:157), then `busy.clear()`, beside the queued ones (:159). Callers already dispose in a
   `finally` after their await or drop it by token (brief's list); none changed.
2. **`cancel` retires and settles before it spawns** (polish 2, 5). `workerPool.ts:117-140`: `busy.delete`, `retire`,
   `k = all.indexOf(w)` (the unreachable `all.push` branch dropped), reject, then `spawn` in `try`; on a throw the slot
   is spliced out (the pool runs one short, `size` drops), one warn per pool (`warnedSpawn`, :29), `pump`, true. JSDoc
   :101-106.
3. **`retire(w)`** (polish 4). `workerPool.ts:144-149`: handlers nulled, then `terminate`; used by `cancel` (:120) and
   `dispose` (:153). The `done` guard (:91) stays.
4. **Late `onerror`** (polish 8): test only (below).
5. **Cap warning** (polish 3). `sectionJobs.ts:127` `warnedCap`; `checkStalled` (:247-253) warns once per baker when a
   first try passes its cap, `ms` read before `failed1` resets the start time: `[section-bake] a worker job ran past its
   cap (<ms> ms): cancelled, tried again on the pool`. JSDoc line at :235.
6. **Fake pools** (polish 6). `tests/sectionBake.test.ts` `handPool` and the one-line pool gain `cancel: () => false`.
   The `as unknown as WorkerPool` cast hides the gap from tsc, so no new test: the file staying green is the proof.
7. **Docs** (polish 7). `docs/systems/lighting.md` "Failures": one sentence (a capped job is cancelled on the pool, a
   running one's worker replaced so the pool keeps its size, one short if the replacement cannot start; the first
   capped first try logged once with its elapsed ms). Docs only.
8. **Tests.** `tests/sectionBakeRobust.test.ts`: header sentence; `FakeWorker` hoisted to module level with
   `failSpawn` (constructor throws before recording itself), plus `fakeJob` / `runInto` helpers; each pool test resets
   `FakeWorker.made` and stubs / unstubs `Worker` in `try` / `finally`. The bake4 cancel test now captures `lateMsg` /
   `lateErr` after the first posts, asserts wA's handlers are null after `cancel`, replays the late answer through
   `lateMsg`, replays a late error (jF then stays queued: `wA.posted` `[jA]`, `nw.posted` `[jD, jE]`, job 1 still
   `cancelled`, not `late`, job 5 unsettled) and, after `dispose`, asserts jB, jE, jF are `disposed`. New describe
   "bake5" (3 tests): dispose settles running + queued, handlers null, a captured late answer changes nothing; cancel
   with a failing spawn (job cancelled, wA terminated, `size` 1, `made` 2, wB takes jC after answering jB, one warn);
   the cap warning (one `ran past its cap` with ms > `JOB_CAP_MS` after both first tries cap, still one after both
   retries cap, one `failed twice`, bytes equal the full bake).
9. `changes/feature-sector-redesign-bake5.md` (`kind: patch`).

## Tests (node, `--maxWorkers=2`)
- `npx tsc --noEmit -p .`: clean.
- `tests/sectionBakeRobust.test.ts`: 19/19 (16 + 3 new).
- `tests/sectionBake.test.ts`: 11/11.
- `tests/sectionBakeCampus.test.ts`: 3 passed, 1 skipped (the heavy case).
- `tests/changesFragments.test.ts`: 1/1.
- Mutations (each applied to the robust file's run, then restored; tree clean after):
  1. no busy reject in `dispose`: 2 fail (the bake4 cancel test's `disposed` asserts, the bake5 dispose test).
  2. spawn before reject, no try / catch: 1 fails (the failing-spawn test: `cancel` throws).
  3. no handler nulling: 2 fail (the null asserts in the bake4 cancel test and the bake5 dispose test).
  4. no `done` guard: 1 fails, at the bake4 cancel test's `nw.posted` assert (the late *message* replay already puts wA
     back in `idle`, so jE goes to it) before the jF assert is reached. A narrower variant that guards messages only
     (`if (r && ...)`) fails at the jF assert (`wA.posted` gains jF), so the late-error assert bites on its own.
  5. warn on every cap: 1 fails (the cap warning count).

## Deviations / open
- Mutation 4 as written is caught one assert earlier than the brief expected (above); the jF assert is proven by the
  narrower variant.
- A pool left with 0 workers after failed spawns is not handled further (brief: `SectionBaker`'s 5 s check fails its
  jobs past the cap and bakes them inline).
- The real `Worker` path is still unit-tested with a stub only; no e2e reaches a hung worker or a failed spawn.
