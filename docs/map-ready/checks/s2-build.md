# map-ready S2 - build report
Owner: Night Shift | Sector Ops Build. Status: current.

Builder: Opus 5.5 (desktop), 2026-10-26. Branch `feature/map-ready-s2`, cut by the lead from `origin/feature/map-ready`
with S1 fix1 merged (b95911c04). Brief `docs/map-ready/briefs/S2.md`, PLAN S2 and section 2, BRIEF A1-A4, A7 (cap 20 s).
Base: #317 coop4, sector-batch PR A / PR B and hud-guidance PR A are not on master, so S2 goes first and rebases later
(lead's call); none of them merged here. Steps 1-6 built; step 7 (the measure) is the lead's request. Every change
below is behind `flags.mapReady` (W0's flag, `?mapready=1`, default off); with it off the code path is today's.

## Step 1 - `src/game/mapGate.ts` (new), `tests/mapGate.test.ts` (new) - d2f41589d
- The brief's interface as written: `MapStep`, `STEPS` (S2's 8), `ALWAYS` (`bake-live`), `MAP_READY_CAP_MS` 20 000,
  `WARM_FRAMES` 5, `MapGateInput` / `mapGateInput`, `MapGateState` / `mapGateStep(g, steps?)`, `readyCapMs` (5-600 s),
  `MapGateProbe`, `MapGateResult`, `runMapGate(probe, report, capMs, steps?, now?)`. Pure, no Babylon.
- `runMapGate`: never rejects (a throwing probe, report or tick returns `error`); `closed` when the probe says so;
  `ready` when every step of `steps` is done; past `capMs` returns `cap` with the step it was on once every `ALWAYS`
  step in `steps` is done (it keeps waiting for those). `warm` counts rendered frames at that step; a `programs` change
  or an earlier step falling back restarts the count; a hidden-tab tick (no frame) never counts. `capMs` counts from
  the gate's start: `GameState.runGate` passes what is left of the cap counted from the end of World.create.
- Boot texts: the brief's ("Building lights", "Loading map…", "Loading Wren", "Compiling shaders", "Final checks");
  `audio` "Loading sound" and `peers` "Waiting for partner" are placeholders for S3 / S5 (not in `STEPS`).
- Tests: 15 / 15 (step order and texts, no audio / peers in S2, a later step never skips an earlier one, progress
  rises 0 -> 1, a custom steps list incl. A1's drop-a-step undo, `readyCapMs` bounds; runner: ready after the warm
  frames, a program change mid-count restarts warm, a step falling back restarts warm, a hidden tab never warms, the
  cap returns `cap` with its step, the cap waits for `bakeLive` then returns at once, `closed`, throwing probe / report /
  tick -> `error`, S5's `peers` after warm). `npx vitest run tests/mapGate.test.ts tests/menuGate.test.ts
  --maxWorkers=2`: 25 / 25. Fail-first: not asked by the brief.

## Step 2 - `src/world/bakedLamps.ts`, `src/world/world.ts` - ee9cbce5e
- `BakedLamps.tilesPending` = `tileTail - tileHead` plus 1 while `atlasDue`. Nothing else in that file.
- `World.probeCaptured = false`, set true inside the existing `onAfterRenderObservable.addOnce` (after the disposed check).

## Steps 3 and 5 - `src/game/gameState.ts` - 1437d05f6 (pushed as "WIP:" at the lead's account save; complete)
- `create` with the flag: no warm-up race, no `markPlaying`; `holding = true`, `gateWorldAt` = the S1 `world` step's
  time (the cap's zero point); the S1 record kept (`gated` = `flags.mapReady`; `create` step written).
- `simulating` = `!paused && !holding`; `fixedUpdate` returns at once while holding (clock stays 0, `stepHeadless`
  callers step nothing).
- `enter`: the S1 reveal only when not holding; audio attaches and `mode.start()` runs as today; before it, while
  holding, `hud.banner` / `hud.setObjective` are wrapped on the instance (banners queued `[title, sub, ms]`, the
  objective recorded and still applied); at its end `gateContent = true` and, holding, `setGameplayActive(false)`.
- `applyQuality` sets `gateQuality` (the `quality` step: `app.setState`'s first `QualityManager.apply`).
- `runGate(report, capMs = MAP_READY_CAP_MS)`: builds the probe and runs `runMapGate` with the cap left since World.create;
  on any end but `closed` calls `release`. Probe reads (render side only, nothing in the sim reads them):
  `bakeLive` no baker / disposed / `ready(plan.live)`; `quality`; `content`; `bodies` the play LOD mask (14, or bit 3
  with `MIN_LODS` / `q.minimal`) or a failed figure load (the gate chains `fig.load` in `loadPlayLods`' order: the loads
  in flight are shared by `OperatorLibrary.load`), every weapon slot `meshPending` false, with `?guardmodels=1` every
  `liveGuardBodies` body `shown`; `shaders` (below); `probe` `world.probeCaptured`; `bakeAll` no baker / `done` /
  `disposed` and `lamps.tilesPending === 0`; `audio` / `peers` true; `programs` = `spikeShaders` (no second
  `shaderCount()`). No allocation in `read` (the guard list is the scene's own array).
- `shaders`: once quality, content and bodies are true, `gateCompileAll` runs `material.forceCompilationAsync(mesh,
  { useInstances })` group by group, each group's promises together: the player rig's meshes and the weapon nodes'
  meshes; `world.level.meshes` + kit + facility props + the `campus-` art meshes; each guard nearest first
  (`hyp2`, `bodyRig.root` meshes); then every scene mesh. Lists are built once per group start. The step is true once
  the last group has started and every mesh with sub-meshes (disabled too) `isReady(true)`, every post process
  `isReady()`, `getWaitingItemsCount() === 0` (`menuScene.ts`'s check without the enabled / visible skip).
- `tick`: the next rendered frame or 100 ms (`menuScene.ts` pattern). `closed`: the state exited.
- `release`: `holding = false`; input live (not for a benchmark run, which keeps it off as today); `markPlaying()`; the
  S1 record's `capHit` / `capStep`, then `readyReveal()` (sets `released`); `net?.onLocalReady?.({ capHit, ms })` (ms
  from the end of World.create); the HUD's own calls back, the queued banners replayed in order, the recorded
  objective re-applied through `hud.setObjective` (G343 / G351). A cap hit logs one line (`console.info` under
  `navigator.webdriver`, else `console.warn`); a gate `error` warns. `feedbackContext()` gets `mapReadyCap`
  ("no" / "hit at <step>") when gated.
- `bakeSourceOf` unchanged: S4 (`lightBake.source`) is not on this base.
- Step 5: `NetAttachment` gains `holdsStart?()` and `onLocalReady?(info)` with the brief's doc comments; `runGate` calls
  nothing else of the net layer. `blips?()` is still on the interface here (hud-guidance A1 not on the base): the
  one-line conflict is for whichever lands second.

## Step 4 - `src/main.ts` - 1437d05f6
- `startGame`: with the flag, `.then` returns `st.runGate((p, text) => setBoot(0.5 + 0.5 * p, text),
  readyCapMs(location.search))` after `app.setState`, so the boot screen's `done` (the `.finally`) waits for the
  release; the `.catch` path is today's. A newer load (`bootGen` moved) keeps the boot screen: the gated path neither
  writes the bar nor adds `done` for a stale load. Flag off: `.then` returns undefined and `.finally` adds `done` as today.

## Step 6 - `scripts/e2e-lib.mjs` (`openPage` only) - bbdb34880
- (a) `E2E_PARAMS` (env, optional) appended to every page's query; a key the suite (params or url) already names keeps
  the suite's value. Unset: the query is today's string.
- (b) With `mapready=1` in the page's query or url, after the match / lobby wait, it waits for
  `window.__mapReady?.released` (120 s, polling 250 ms); a timeout warns like the section-bake wait. Flag off: unchanged.

## Checks (desktop)
- `npm run typecheck:fast`: clean (after steps 1-6).
- `npx vitest run tests/mapGate.test.ts tests/menuGate.test.ts tests/mapReadyStats.test.ts tests/changesFragments.test.ts
  --maxWorkers=2`: 33 / 33 (mapGate 15, menuGate 10, mapReadyStats 7, changesFragments 1).
- `node --check scripts/e2e-lib.mjs`: ok; the `E2E_PARAMS` merge checked by hand (unset, added, suite key kept).
- No e2e, GPU or `npm run check` here (RULES). The desktop CPU sat at 100% most of the session; the first vitest run
  went at 100% (small, 25 tests), later runs waited for < 90%.

## Deviations (each with its undo)
1. With the flag and `?guardmodels=1`, `create` still starts `warmGuardModels` (not awaited) where the brief says skip
   the warm-up race: the waiting is gone, the guard warm meshes still get built and the `shaders` step compiles them
   (today's coverage of guard kinds not yet spawned, until S3 owns it). Undo: delete the one `warmGuardModels` line in
   the `flags.mapReady` block of `create`.
2. "Loading map…" uses the ellipsis character the boot screen already shows, not three dots. Undo: edit `TEXT` in
   `mapGate.ts`.
3. `runMapGate`'s `capMs` counts from the gate's start; the caller passes the remainder of the 20 s since World.create
   (the interface has no start-time argument). `MapGateResult.ms` is the gate's own time; `onLocalReady` gets ms since
   World.create. Undo: n/a (same cap point as the brief).
4. The priority compile treats each guard as its own group (nearest first) rather than one guard group. Undo: one
   `gateCompileMeshes` call over all guards' meshes in `gateCompileAll`.
5. `GameState.held` getter added (tests / e2e read the hold). Undo: delete it.

## Risks for the flag-on runs
- A mesh that never reports ready (a texture that never arrives) or a guard figure that fails to load holds its step
  to the cap; the cap then releases (logged).
- `openPage`'s boot wait is 60 s; with the flag on, a slow software-GL load adds up to the 20 s cap after World.create
  before `done`. If the alone run times out there, pass `readyCap` (e.g. `E2E_PARAMS=mapready=1&readyCap=5`).
- During the hold, `padDisconnected` can still open the pause menu behind the boot screen (unchanged handler).
- Co-op with the flag: each peer releases on its own gate (no `snap` during the hold, no `mr` / `go`) until S5.

## Pending PC runs (laptop queue, the lead requests)
- affected (the e2e-lib change runs the full set) on the head.
- `e2e-coop` + `e2e-netmove` (`NetAttachment`, `src/game`: RULES "Test tiers" checker gate).
- Alone, flag on: `--env E2E_PARAMS=mapready=1 --env E2E_GPU=1 --step "npm run build" --step "node scripts/run-e2e.mjs
  e2e-sectorops e2e-lightbake"`.
- Step 7 measure: `node scripts/laptop-queue/request.mjs --sha <head> --alone --step "npm run build" --step "node
  scripts/map-ready-measure.mjs --gated --out C:/NightShift/scratch/map-ready/s2.json" --env E2E_GPU=1 --set
  map-ready-s2 --requester "Night Shift | Sector Ops Build"`, against S1's baseline; the numbers go to S8.
