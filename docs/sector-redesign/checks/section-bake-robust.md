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
