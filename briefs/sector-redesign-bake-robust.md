status: done feature/sector-redesign-bake2 90bf843b

# Sector Ops: section bake robustness (follow-up to PR #333)

Lead: Night Shift | Sector Ops Build (Opus brief, 2026-10-24 ~20:40). Unit tests only: no e2e, no GPU, no npm run check.

Base: `feature/sector-redesign-bake` @ 5cc02048 (PR #333; per-section campus lamp bake). New branch:
`feature/sector-redesign-bake2` cut from that sha. Read first on the base: `docs/sector-redesign/briefs/SECTION-BAKE.md`,
`docs/sector-redesign/checks/section-bake-build.md`, `-check-A.md` (P6, P8), `-check-B.md` ("Polish" 2, 3, 4, 5, 8, 10),
CLAUDE.md "Hard rules" (hot paths allocate nothing; Babylon only through src/core/babylon.ts).

Only these files: `src/voxel/sectionJobs.ts`, `src/voxel/lampJobs.ts`, `src/world/bakedLamps.ts`, `src/world/sectionBake.ts`,
`src/world/lightBake.ts`, `src/game/gameState.ts` (only the World.create failure path), `scripts/e2e-lib.mjs` (only the
bake wait), `tests/sectionBake*.test.ts` (or one new `tests/sectionBakeRobust.test.ts`), `docs/systems/lighting.md`
(section bake paragraph), `docs/sector-redesign/checks/section-bake-robust.md` (your report). Never touch src/ai,
src/net, src/game/course, courseMode.ts, ctcourse maps, src/world/world.ts, sunCascadeCull.ts, sectorGuardFreeze*,
tests/lightField.test.ts.

Build (each with a unit test where node can reach it; fake the worker pool / engine as the existing tests do):
1. Check A P6: a lamp whose bake fails (worker error AND the retry throws) must never be cached. Mark the bake incomplete,
   skip the cache write for that run, and log once; the lamp stays dark only for this match.
2. Check B 3: a worker job error retries once on the pool before any inline main-thread bake; once the match is playing,
   an inline bake waits for the pool to be idle (no 2-5 s freeze in play). A job in flight longer than a cap (e.g. 60 s,
   a constant) counts as failed (a silent worker death no longer hangs `whenReady`).
3. Check A P8: if `World.create` throws after the bake started, the baker's worker pool is disposed (no leak).
4. Check B 2: once `uploadTile` has returned false, stop re-uploading the whole atlas per landing batch; do one
   `reuploadAtlas` when the baker is done.
5. Check B 4: live-member landings during play go through the budgeted tile queue head, not a direct whole-tile upload.
6. Check B 5: on `setLive`, the new live section's lamps still queued or fading snap their fade to 1 and move to the queue
   head (picture = meter at once for the live section).
7. Check B 8: drop `SectionBaker.parts` at `complete`.
8. Check B 10: the e2e-lib bake wait logs a line when its 240 s timeout fires instead of swallowing it.

Done when: tsc clean (`npx tsc --noEmit -p .`), eslint clean on the changed files, the sectionBake tests + bounceGrid +
your new tests pass (`npx vitest run <files> --maxWorkers=2`), report written with file:line per item and counts, branch
pushed. Deviations: list them in the report. If an item needs a design choice not settled here, do the rest and set
`status: blocked <item: question>`.

## Report (Night Shift | Cloud Builder 1, 2026-10-24)
Branch `feature/sector-redesign-bake2` @ 90bf843b (one commit on 5cc02048). Full report with file:line per item:
`docs/sector-redesign/checks/section-bake-robust.md`.
1. P6: `sectionJobs.ts` - a lamp whose pool retry and inline bake both fail lands dark, `failed++`, one warning;
   `complete` saves only when `failed === 0`; new `incomplete` getter.
2. B3: per-try token + start time; first failure (error or `JOB_CAP_MS = 60_000`) retries on the pool, second queues
   an inline bake; inline runs at once during load, during play only while no pool job is in flight (one lamp per
   task). `checkStalled` every 5 s from `start`, cleared at complete/dispose; a late failure is ignored by token.
3. P8: `world.ts` makes the baker, so `sectionJobs.ts` keeps a registry: `sectionBakerMark()` /
   `disposeSectionBakersSince(mark)`; `gameState.ts` wraps `World.create` in try/catch (plus one import line).
   `lightBake.ts` also disposes its baker if the moon bake rejects.
4. B2: `bakedLamps.ts` - after the first false `uploadTile`, background batches only queue; one whole-atlas upload at
   the end (live-section landings still upload next frame so picture = meter).
5. B4: during play live landings go to the queue head (`queueFirst`); tile progress per lamp (`tileZ` Int32Array).
6. B5: baker `onLive` listeners -> `BakedLamps.liveChanged`: the live section's fading lamps jump to 1, queued ones
   go to 1 and the queue head (stable order, preallocated scratch).
7. B8: `parts` dropped at `complete`.
8. B10: `e2e-lib.mjs` bake wait logs a `console.warn` on timeout/failure.
Tests (`--maxWorkers=2`): new `sectionBakeRobust` 9/9, `sectionBake` 11/11, `sectionBakeCampus` 3 passed + 1 skipped
(heavy), `bounceGrid` 11/11, `lampDataUpload` 3/3. `npx tsc --noEmit -p .` clean; eslint clean on changed src/tests;
`node --check` on e2e-lib. Reverting P6 / retry / queue-head / end-upload fails 6 of the 9 new tests.
Deviations: gameState.ts +1 import; lightBake.ts moon-failure dispose; test hooks `capMs` input and public
`checkStalled(now)`; item 4 keeps the live-section whole-atlas upload (WebGL never reaches this path).
Open (for the lead / Michael, not blocking): an inline bake held for "pool idle" still runs one lamp on the main
thread, so a big flood lamp failing twice is one 2-5 s hitch after the background bake ends; alternative is to hold it
to the connector cycle, but a late joiner's live lamp would then wait for a section change. Kept "pool idle" per brief.
`disposeSectionBakersSince` stops every baker made after the mark (two concurrent `GameState.create` would interfere;
does not happen today).
