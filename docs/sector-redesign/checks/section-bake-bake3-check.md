# Check: section bake bake3 (feature/sector-redesign-bake3 @ 3c2d7d19)

Verdict: PASS

Checker: Opus, fresh, 2026-10-24. Base 54cdb9e1 (master 4.98.1). Diff `git diff 54cdb9e1 HEAD`: `src/voxel/sectionJobs.ts`,
`tests/sectionBakeRobust.test.ts`, `changes/feature-sector-redesign-bake3.md`, the "bake3" section of
`section-bake-robust.md`. Only the brief's files changed.

## Must fix

None.

## What was checked

1. **Brief items.**
   - P2 (`sectionJobs.ts:320-327`): while playing with pool jobs in flight, `drainInline` scans `[inlineHead, inlineTail)`
     for the first lamp that is not landed and is `plan.liveMember`; none -> break (held, as before); found at `j` ->
     `Q.copyWithin(head + 1, head, j)` then `Q[head] = live`. Typed-array `copyWithin` has memmove semantics, so the
     shift is stable and loses nothing (`Q[j]` is saved first). Held lamps keep their order.
   - No double bake / no skip: a lamp enters `inlineQ` at most once (the twice-failed path bumps `token` and `endJob`
     zeroes `jobT0`, so neither a late failure nor `checkStalled` can push it again; capacity `n` holds). A late pool
     answer for a queued lamp lands it; the scan skips landed lamps and the pop `continue`s past them (:329). Every
     held lamp is reached: each landing (:377), each `failed1` (:306), `setLive` (:180) and the zero-delay timer all
     re-run `drainInline`, and once `poolJobs` hits 0 the old idle rule drains the rest.
   - P1 / `setLive` (:180): `drainInline` runs after the live listeners. Re-entry is safe: inside a drain the
     `draining` flag returns the nested call and the outer loop rescans against the new live section; with a timer
     pending it returns and the timer covers it; after `done` / `dispose` the loop / guard stops it. Not playing, the
     queue is already empty (every `failed1` drains at once during the load).
   - P4 (:31, :230): `JOB_RETRY_CAP_MS = 20_000` exported; `checkStalled` picks `tries[i] === 1 ? JOB_RETRY_CAP_MS :
     capMs ?? JOB_CAP_MS` per lamp. A retry restarts `jobT0` in `dispatch`, so the 20 s counts from the retry.
   - Pool / inline races in play: the inline bake runs synchronously between promise callbacks; the pool's late answer
     for the same lamp is dropped by `plan.landed` (same bytes either way). `pump` runs before `drainInline` in
     `failed1` and `landed`, so `poolJobs > 0` correctly reflects in-flight work when the scan decides.
2. **Hot paths.** New code allocates nothing: index loops, `copyWithin` on the existing `Int32Array`, two number
   reads per `checkStalled` call. `failed1` and `pump` are unchanged. (The `new Error` in `checkStalled` only on a stall
   and the `setTimeout` arrow in `drainInline` are pre-existing; see polish 5.)
3. **Mutation check** (each mutated, run, restored with `git checkout -- src/voxel/sectionJobs.ts`; tree clean after):
   - P2 scan replaced by the old `break`: fails (a) and (b).
   - `setLive`'s `drainInline` removed: fails (b).
   - Live filter dropped (any held lamp bakes while jobs run): fails (b) and the old "waits for the pool to be idle" test.
   - Single cap (`cap0` for all): fails (c). Retry cap for all: fails (c) and the old cap test.
4. **Runs** (desktop CPU waited to <= 90%): `npx tsc --noEmit -p .` clean. `npx vitest run tests/sectionBake.test.ts
   tests/sectionBakeCampus.test.ts tests/sectionBakeRobust.test.ts --maxWorkers=2`: 3 files, 26 passed, 1 skipped
   (the heavy campus case, as before). Matches the builder's counts.
5. **Docs.** `docs/systems/lighting.md` "Failures" (:161-163) is stale, confirmed: it says an inline bake during play
   "waits until the pool is idle" and names only `JOB_CAP_MS` 60 s. Needs: a live-section lamp skips the idle wait, a
   held lamp bakes when its section goes live (`setLive`), and the retry's cap is `JOB_RETRY_CAP_MS` 20 s. Outside this
   brief's files: a one-line follow-up (polish 1).

## Polish

1. `docs/systems/lighting.md:161-163` - update the "Failures" bullet as in item 5 above.
2. `sectionJobs.ts:230` - the retry cap ignores a smaller `capMs` override, so with `capMs` < 20 s the retry would get
   longer than the first try. Use `Math.min(cap0, JOB_RETRY_CAP_MS)`. No caller passes `capMs` today (grep), so
   harmless now.
3. `sectionJobs.ts:31`, the changes fragment and the report say "~85 s" worst case; with the 5 s check interval
   counted on both tries it is up to ~90 s (65 + 25). Wording only.
4. No test pins the held lamps' order after a live lamp is pulled forward (the reason for `copyWithin` over a swap);
   a swap would pass all 12 tests. Optional: two held non-live lamps plus one live, assert the held pair bake in their
   queued order once the pool idles.
5. `sectionJobs.ts:332` (pre-existing) - the `setTimeout` arrow allocates one closure per inline lamp during play. Not per
   frame and rare; could bind one drain callback in the constructor.
6. `setLive` now bakes a live, twice-failed lamp synchronously inside `SectorMode.loadSection` / the client's `ls`
   handler: a big flood lamp is a 2-5 s hitch at that section change. As the brief intends (otherwise it stays dark);
   noted only.
7. Report line refs drift by a couple of lines: the `setLive` drain is :180 (report :178), `drainInline` :315.
