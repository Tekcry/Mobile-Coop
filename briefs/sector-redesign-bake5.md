status: done feature/sector-redesign-bake5 522727fba1e4a8d6715cde42a5a2354ce131b69c

# Sector Ops: section-bake polish 5 (bake4 check held polish 1-8), stacked on #385

Lead: Night Shift | Sector Ops Build (2026-10-25 ~08:45). Model: Opus. Unit tests only: no e2e, no GPU, no npm run check.

Base: `origin/feature/sector-redesign-bake4` @ d2ccf6305cb9962772d619b92ab8e09c21338062 (PR #385, checker PASS, not in
master). New branch `feature/sector-redesign-bake5` cut from that sha; you own it: commit and push each step, end with the
report and this file's status line. Read first: `docs/systems/agent-preamble.md`; CLAUDE.md "Hard rules" (hot paths
allocate nothing); `docs/sector-redesign/checks/bake4-check.md` ("Held polish" 1-8: this brief builds all eight).
All line numbers below are on the base sha.

Only files to edit: `src/voxel/workerPool.ts`, `src/voxel/sectionJobs.ts`, `tests/sectionBakeRobust.test.ts`,
`tests/sectionBake.test.ts`, `docs/systems/lighting.md` ("Failures" bullet, lines 161-170, only), new
`changes/feature-sector-redesign-bake5.md` (`kind: patch`, format `changes/README.md`), and a report section "bake5"
appended to `docs/sector-redesign/checks/section-bake-robust.md` (after the "bake4" section).

Nothing here runs per frame: `cancel` / `dispose` run on a stall or at teardown, `checkStalled` on its 5 s timer. Allocate
only on those paths (an Error, a warn string). No gameplay change: no cap, timing or bake order changes.

Build:
1. (polish 1) `workerPool.ts:130-137` `dispose`: settle the running jobs too. Before clearing, reject every `busy`
   pending with `new Error('voxel pool disposed')` (the queued ones already do, `:135`), then `this.busy.clear()`.
   Callers are safe: `lampJobs.ts:58-69` and `:138-144`, `world.ts:584-590` dispose in a `finally` after their await
   (Promise.all has handlers on every job); `SectionBaker` drops it (`sectionJobs.ts:291` token, `failed1` returns on
   `disposed` / `landed`, `:307`). Test (new, robust file): FakeWorker pool of 2, run jA, jB (both busy), jC (queued);
   `pool.dispose()`; settle; all three outputs contain `disposed`; both workers terminated; a captured late
   `onmessage` from a disposed worker after that changes no output (no double settle).
2. (polish 2 + 5) `workerPool.ts:114-126` `cancel`, running branch: remove the hung worker and settle the job before
   spawning. New order: `busy.delete(w)`; retire `w` (step 3); `k = this.all.indexOf(w)` (always >= 0 here: not
   disposed and `all` holds every busy worker, so drop the unreachable `else this.all.push(nw)` at `:121`);
   `p.reject(new Error('voxel job cancelled: its worker was terminated'))`; then `try { nw = this.spawn() } catch (e)`:
   on throw `this.all.splice(k, 1)` (the pool runs one short; `size` drops), `console.warn` once per pool
   (`'[worker-pool] a replacement worker failed to start: the pool runs one short'`, e), `pump()`, return true; else
   `this.all[k] = nw; this.idle.push(nw); this.pump(); return true`. A pool left with 0 workers is not handled further:
   the only `cancel` caller is `SectionBaker`, whose 5 s check fails a job past its cap (queued ones too) and bakes it
   inline. Update the JSDoc at `:100-104`. Test (new): FakeWorker with a static `failSpawn` flag that makes the
   constructor throw (before it records itself); pool of 2, run jA, jB, jC (queued); set `failSpawn`, warn spied;
   `pool.cancel(jA)` returns true and does not throw; settle; jA's output contains `cancelled`; wA terminated;
   `pool.size === 1`; `FakeWorker.made.length === 2`; finish jB on wB (`onmessage`) -> jB `ok 2` and wB.posted
   `[jB, jC]`; one warn containing `failed to start`. Reset `failSpawn` in `finally`.
3. (polish 4) New private `retire(w: Worker)`: `w.onmessage = null; w.onerror = null; w.terminate();`. Use it in
   `cancel` (replaces `:117`) and in `dispose` (replaces `:132`'s terminate). The `done` guard at `:89` stays (it is
   what makes a late event harmless). Test: in the existing test `tests/sectionBakeRobust.test.ts:377-443`, capture
   `const lateMsg = wA.onmessage!, lateErr = wA.onerror!` right after `:410-411`; after `pool.cancel(jA)` (`:419`)
   assert `wA.onmessage` and `wA.onerror` are null; replace the direct call at `:429` with `lateMsg(...)`.
   The step-1 test asserts the disposed workers' handlers are null too.
4. (polish 8) Late `onerror`: in the same test, after `:434` (jE running on `nw`, wB still busy with jB) call
   `lateErr(new Error('late'))`, settle, then run a new jF (id 6). Assert jF is not posted to wA (`wA.posted` still
   `[jA]`, `nw.posted` still `[jD, jE]`: jF waits queued), `out.get(1)` still contains `cancelled` and not `late`,
   `out.has(5)` false. Without the `done` guard the late error would put wA in `idle` and jF would go to it. Then the
   existing `:437-439` lines; after `pool.dispose()` also assert jB, jE, jF outputs contain `disposed` (step 1).
5. (polish 3) `sectionJobs.ts:240-245` `checkStalled`: when a FIRST try (`this.tries[i] === 0`) passes its cap, warn
   once per baker with the elapsed ms. New field `private warnedCap = false;` next to `warnedInline` (`:125`). Compute
   `ms = Math.round(now - T[i]!)` before `failed1` (its retry `dispatch` resets `jobT0[i]`, `:284`). Message:
   `` `[section-bake] a worker job ran past its cap (${ms} ms): cancelled, tried again on the pool` ``, i. It must not
   contain `failed twice` or `failed to bake` (tests at `:177`, `:197` count those). Add one line to the JSDoc at
   `:227-232`. Test (new, robust file): warn spied; `handPool(2, { hang: (id) => id <= 1 })`; start;
   `checkStalled(performance.now() + JOB_CAP_MS + 1)` (both first tries capped) -> exactly one `ran past its cap`
   warn whose ms (parsed from `/\((\d+) ms\)/`) is > `JOB_CAP_MS`; `checkStalled(performance.now() + JOB_RETRY_CAP_MS
   + 1)` (both retries capped) -> still one `ran past its cap`, one `failed twice`; `finishAll`, `finished`, bytes equal
   the full bake.
6. (polish 6) `tests/sectionBake.test.ts`: add `cancel: () => false` to the two fake pools: `handPool` (`:57-61`) and
   the one-line pool at `:288`. Proof: that file stays green (the `as unknown as WorkerPool` cast hides the gap from
   tsc, so no new test; say so in the report).
7. (polish 7) `docs/systems/lighting.md:161-170` "Failures": one sentence after the retry-cap clause: a job past its
   cap is cancelled on the pool and a running one's worker is terminated and replaced, so the pool keeps its size (if the
   replacement cannot start the pool runs one short); the first capped first try is logged once with its elapsed ms.
   Docs only, no test (no code; the checker reads it against steps 2 and 5).
8. File header of `tests/sectionBakeRobust.test.ts` (`:1-12`): one "(bake5, bake4 check polish 1-4, 8)" sentence. Put
   the new tests in a new `describe('section bake robust bake5: pool teardown and the cap warning ...')` after the
   bake4 block; hoist the FakeWorker class (`:378-393`) to a module-level helper (with `failSpawn`) so the three tests
   share it, each with `vi.stubGlobal('Worker', ...)` / `vi.unstubAllGlobals()` in `try` / `finally`, and reset
   `FakeWorker.made` per test.
9. `changes/feature-sector-redesign-bake5.md`, `kind: patch`, player-facing, e.g. title "Saltmarsh Park section bake:
   clean shutdown of light-bake workers"; bullets: leaving a match mid-bake now ends every light-bake job instead of
   leaving some waiting; if a replacement worker cannot start, the bake carries on one worker short; a lamp that takes
   over a minute in a worker is noted once in the log.

Skipped: none. All eight are unit-provable (steps 1-5) or test / docs only (steps 6-7); none changes a cap, timing,
bake order or anything a player sees. If a step turns out to need a design call or e2e, set `status: blocked <reason>`
for that step only in the report and build the rest.

Run (single files, each its own command):
- `npx tsc --noEmit -p .`
- `npx vitest run tests/sectionBakeRobust.test.ts --maxWorkers=2` (base: 16 tests; expect 19: +3 new)
- `npx vitest run tests/sectionBake.test.ts --maxWorkers=2`
- `npx vitest run tests/sectionBakeCampus.test.ts --maxWorkers=2` (1 skipped heavy case is expected)
- `npx vitest run tests/changesFragments.test.ts --maxWorkers=2`
Mutation checks (revert each, run the robust file, restore, list in the report): no busy reject in `dispose` (step-1
test fails); spawn before reject / no try-catch (step-2 test fails or throws); no handler nulling (step-3 asserts fail);
no `done` guard (step-4 jF assert fails); warn on every cap (step-5 count fails).

Done: branch `feature/sector-redesign-bake5` pushed, tsc clean, the four files green with counts, mutation results in
the report, the "bake5" report section in `section-bake-robust.md` (what changed with file:line, tests with counts,
deviations, open), this file's report below and status line `status: done feature/sector-redesign-bake5 <sha>`.

## Report
Night Shift | Cloud Builder 1, 2026-10-24. Branch feature/sector-redesign-bake5 from d2ccf630: 4476201c (code, tests,
docs, fragment), 8413482d + 522727fb (report section "bake5" in docs/sector-redesign/checks/section-bake-robust.md, with
file:line per step).
- Steps 1-3: workerPool.ts `dispose` (:151-162) rejects busy then queued, `busy.clear()`; `cancel` (:108-141) busy.delete
  -> retire -> k -> reject -> spawn in try (throw: splice k, one warn per pool `warnedSpawn` :29, pump, true; the
  unreachable `all.push` dropped); `retire` (:145-149) nulls handlers then terminates, used by cancel and dispose; JSDoc
  updated. The `done` guard stays.
- Step 5: sectionJobs.ts `warnedCap` (:127), warn in `checkStalled` (:248-253) with ms read before `failed1`; JSDoc :234.
  Message has neither `failed twice` nor `failed to bake`.
- Step 6: `cancel: () => false` on both fake pools in tests/sectionBake.test.ts (no new test: the cast hides it from tsc;
  the file staying green is the proof).
- Step 7: lighting.md "Failures" one sentence. Step 8: FakeWorker hoisted with `failSpawn`, helpers `fakeJob` /
  `runInto`, new describe "bake5" with 3 tests; the bake4 cancel test extended (lateMsg / lateErr, null handlers, jF
  stays queued, disposed outputs). Step 9: changes/feature-sector-redesign-bake5.md (kind: patch).
- Tests: `npx tsc --noEmit -p .` clean; sectionBakeRobust 19/19 (16 + 3); sectionBake 11/11; sectionBakeCampus 3 passed
  + 1 skipped; changesFragments 1/1.
- Mutations (all caught, tree restored): 1 no busy reject -> 2 fail; 2 spawn before reject / no try -> 1 fails (cancel
  throws); 3 no handler nulling -> 2 fail; 4 no done guard -> 1 fails; 5 warn on every cap -> 1 fails.
- Deviation: mutation 4 is caught one assert before the jF assert (the late-message replay already idles wA, so jE goes to
  it, :452). A narrower mutation guarding messages only (`if (r && ...)`) fails exactly at the jF assert (:458), so the
  late-error assert bites on its own.
- Open: a pool left with 0 workers is not handled further (as briefed); the real Worker path is stub-tested only.
