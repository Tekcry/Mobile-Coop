# section-bake robust check (fresh Opus)

**Verdict: PASS** (no must-fix; polish below).

Fresh Opus checker, 2026-10-24. Branch `feature/sector-redesign-bake2` @ 90bf843b vs base 5cc02048 (PR #333). Read: agent
preamble, CLAUDE.md hard rules, the brief (`origin/cloud-queue:briefs/sector-redesign-bake-robust.md`), the builder's
report, the full diff, `src/voxel/workerPool.ts`, `SectionPlan` (`src/world/sectionBake.ts`), `bakeLevelMoon`, the
`GameState.create` load / `markPlaying` path, the `setLive` callers (`sectorMode.ts:681`, `coopClient.ts:986`).
Ran (desktop CPU ~79%): `npx tsc --noEmit -p .` clean (exit 0); `npx vitest run tests/sectionBake*.test.ts --maxWorkers=2`:
3 files, 23 passed + 1 skipped (heavy campus case). `tests/lightBake*.test.ts` matches nothing. No e2e, build or GPU run
(the laptop runs lightbake, darkness, sectorops:6).

## Item by item

1. **P6, failed lamp never cached** - done. `sectionJobs.ts:334` counts `failed` and warns once; `:398` sets `saveDue`
   only when `failed === 0`, and `dispose` goes through `saveIfDue` (no back door). The failed lamp lands with an empty
   `vis`, so its cells stay 0 in the shared result: field and picture both dark. Test drives a real throw in the inline
   `bakeLamps` (module mock) after two pool rejections and checks dark bytes, the other lamps byte-exact, no `saveLamps`.
2. **B3, retry once, then inline; 60 s cap** - done and correct. Per-try token (`:258-270`) drops a stale rejection;
   `failed1` (`:283`) retries on the pool once, then bumps the token, ends the job (`endJob` decrements `poolJobs` only
   while `jobT0 > 0`, so no double count) and queues the inline bake. A late success after a retry or a timeout still
   lands (same deterministic bytes) and `landed` (`:340`) ignores anything for a lamp already in, after `done` or after
   `dispose`; `complete` is guarded by `done`: no double completion. `SectionPlan.busy` stays set for an inline-queued
   lamp, so `next()` never re-issues it. `checkStalled` (`:220`) runs every 5 s from `start`, cleared in `complete` and
   `dispose`; a dead worker fails the lamp at most ~2 x 60 s + 5 s later, so `whenReady` cannot hang. During play
   `drainInline` (`:307-311`) waits for `poolJobs === 0`, one lamp per `setTimeout(0)`. Tests use a hand-run pool with an
   injected clock (not tautologies): retry count, cap boundary (cap - 1 s no-op, cap + 1 ms retry), hold-until-idle.
3. **P8, pool disposed when `World.create` throws** - done. `gameState.ts:918-928` marks, catches, disposes the bakers
   made since the mark, rethrows; `lightBake.ts:117` also disposes when the moon bake rejects. Registry tested in node;
   the `GameState` wiring itself has no unit test (node cannot reach it).
4. **B2, single atlas re-upload** - done with the stated deviation: after the first false `uploadTile`, background
   batches only queue; one `reuploadAtlas` at the end (`bakedLamps.ts:769`, applied in `stepLanding` on the next frame);
   live-section landings still re-upload whole (WebGL 1 / NullEngine only). GL state: `uploadTile` keeps the check B
   fix (`_unpackFlipY(false)`, premultiply cleared and restored around `texSubImage3D`); `reuploadAtlas` goes through
   Babylon's `RawTexture3D.update`, which sets its own unpack state.
5. **B4, live landings at the queue head** - done (`bakedLamps.ts:756`, `queueFirst` `:777`; per-lamp `tileZ` keeps a
   part-uploaded head correct). Parity lag: the field reads the lamp at landing, the picture once its tile is up;
   `TILE_BUDGET` is 4 MB a frame, so one frame for any campus tile. Accepted by the brief.
6. **B5, `setLive` snap** - done (`liveChanged` `:790`): fading live lamps jump to 1 and leave the fade list, queued live
   lamps go to 1 and to the queue head (stable partition, preallocated `tileTmp`), colours re-uploaded next frame;
   `tileUp` (`:879`) then does not restart a fade for a live lamp. `setLive` now returns early when the section is
   unchanged (same behaviour as before for the cache write).
7. **B8, `parts` dropped at `complete`** - done (`sectionJobs.ts:387`, after the final `flush` joined the bounce).
8. **B10, e2e bake wait logs** - done (`scripts/e2e-lib.mjs:226`).

## Cross-checks

- **Light parity:** the meter and guard perception read `result.vis` through the light field; the picture uploads the
  same bytes. Every path keeps them equal within the live section: failed lamp dark in both; held inline lamp dark in
  both until it lands; live landing during play up within one frame; non-live lamps reach no point of the live section
  (SB8), so their fade is rendering only.
- **Hot paths:** `frame` / `stepLanding` / `tileUp` allocate nothing (typed arrays, index loops). `liveChanged`,
  `landed`, `checkStalled` (5 s timer) and `disposeSectionBakersSince` (`[...RUNNING]`, failure path only) are off the
  frame. No `Math.hypot`; no new Babylon import in `src` (the test imports `NullEngine` directly, as existing tests do).
- **Co-op:** nothing in `src/net` changed. Host (`sectorMode.ts:681`) and client (`coopClient.ts:986`) both call
  `setLive`, so both pictures snap the same way; per-lamp bytes are job-independent, so both bake the same.

## Polish

1. `sectionJobs.ts:311` - an inline bake during play still runs on the main thread once the pool is idle, so a big flood
   lamp that failed twice is one 2-5 s hitch after the background bake ends (the builder's open item). Lead choice:
   keep it, or hold it to the next `setLive` / match end unless it is a live-section lamp.
2. `sectionJobs.ts:311` with `landed` -> `pump` -> `drainInline` - "pool idle" only happens after the whole background
   queue drains, because `pump` refills the pool before `drainInline` looks. A live-section lamp that fails twice in
   play stays dark (meter and picture agree) until every other lamp is in. Option: let a live-member inline lamp skip
   the idle wait, or stop `pump` while the inline queue holds a live-section lamp.
3. `sectionJobs.ts:263` - the cap clock starts when the job enters the pool's queue, not when a worker takes it. A worker
   that hung stays in `WorkerPool.busy` forever (never terminated or replaced; `workerPool.ts` is outside the brief), so
   the pool runs one worker short for the rest of the match and jobs can age in its queue. Harmless (same bytes, first
   answer wins), but a slow-yet-alive lamp past 60 s gets a duplicate job.
4. Load worst case with a silently dead worker: ~125 s (two caps plus the 5 s check) before the inline bake runs; not a
   hang, but the load screen sits that long. A shorter cap for the retry (e.g. 20 s) would cut it.
5. `lightBake.ts:113-119` - if the moon bake rejects while `lampJob` is still awaiting `readLampCache`, the baker is
   made and started after both catches ran; it then runs to `complete` (which disposes its pool) rather than being
   stopped. Practically unreachable (an IndexedDB read against a full moon bake); transient CPU only, not a leak.
6. A lamp that fails every way on one peer is dark only there, so host guards and the client's meter could disagree on
   that lamp. Pre-existing and practically unreachable (inline `bakeLamps` with valid shapes does not throw); the fix
   here at least stops it being cached.
7. No unit test reaches the `GameState.create` try / catch or the moon-failure dispose; a fault-injection e2e (throw
   after `bakeLevelLight`) would cover P8 end to end if wanted.
