# map-ready S1 - build report
Owner: Night Shift | Sector Ops Build. Status: current.

Builder: Night Shift | Cloud Builder 2 (Opus, cloud), 2026-10-25. Branch `feature/map-ready-s1` from `feature/map-ready`
3a18a7bb5 (W0). Brief `docs/map-ready/briefs/S1.md`; cloud changes from `cloud-queue` `briefs/map-ready-S1.md`.
Steps 1-5 built; step 6 is the lead's (commands below). No `flags.mapReady` read: the record runs with the flag on or off.

## Step 1 - `src/core/mapReadyStats.ts` (new, ef967865)
- The brief's interfaces as written (`BakeSource`, `AFTER_WINDOW_MS`, `loadCounters`, `AfterWindow`, `MapReadyRecord`,
  `FrameSample`, `MapReadyStats`, `bakeSourceOf`). Pure: no Babylon, no DOM.
- `frame()` ignores samples before `reveal()` and after `done`; after the reveal it stores the interval in a preallocated
  `Float32Array(2400)` and counts frames and program changes, nothing else; when 10 s have passed it fills the window's
  deltas from the reveal's sample, sorts a copy of the used intervals once (once per match) and writes p50 / p95 / max
  (nearest rank). `reveal()` copies the `loadCounters` deltas since the constructor's snapshot; a second call is ignored.
- Deviation: the constructor takes an optional fifth argument `programs0` (the program count at the load start), so
  `loadPrograms` = the reveal's count less it; the brief's four-argument call still works (`programs0` 0).

## Step 2 - `tests/mapReadyStats.test.ts` (new, cd6663b7)
7 tests, 7 / 7: steps and reveal in ms from the start; window deltas from cumulative samples (programs 40 at the reveal,
42 at +10.1 s gives 2) and `shaderFrames`; frames before the reveal and after `done` ignored, a second reveal ignored;
p50 / p95 / max of a known series; `loadCounters` deltas; `setBake` and `summary()` (map, reveal seconds, window, bake);
`bakeSourceOf` all four branches. `npx vitest run tests/mapReadyStats.test.ts --maxWorkers=2`.

## Step 3 - `src/world/bakedLamps.ts` (024e2690)
`landings = 0` and `rescans = 0` beside `tileUploads` (one comment naming map-ready S1); `landings++` after
`have[i] = 1` in `landed()`; `rescans++` inside `frame()`'s material re-scan `if`. Nothing else.

## Step 4 - `src/game/gameState.ts` (51a410a3)
- `create`: the clock and the program count before `World.create`; after `new GameState` the record (`opts.map.id`,
  `opts.mode`, gated false), step `world` (World.create done), `setBake(bakeSourceOf(undefined,
  !!sectionBakeFor(map id), !!world.lightBake?.sections), world.lightBake?.ms ?? -1)`, one
  `scene.onNewMaterialAddedObservable` counter, `window.__mapReady`; step `create` before `return g`.
- `enter`: first line `readyReveal()` (fills the sample, the program count once, the heap from `performance.memory`).
- `frameUpdate`: after `trackSpikes()`, while the record is released and the window open: `readyPoll()` and
  `frame()`. Programs reuse `spikeShaders` (no second `shaderCount()` per frame). Landings / uploads from
  `world.lamps`. Pop-ins: `player.figure.current` changing from a value >= 0; a weapon slot's `model.meshPending`
  true -> false (a `Uint8Array(16)`); a guard body `shown` first seen (a `WeakSet`). Polling stops once `after.done`.
- `feedbackContext`: `ctx.mapReady = summary()`.
- New private members only beside these; `spikeShaders` is read, never written (the spike log is unchanged).
- Allocation: none per frame once the lists exist. One note: guard bodies are polled only with `flags.guardModels`
  (they exist only then); `liveGuardBodies` returns a fresh `[]` while a scene has no body yet, so until the first body
  registers each polled frame of the 10 s window makes one empty array (the reference is cached once non-empty;
  `src/ai/guardBody.ts` is never-touch).
- Checks: `npm run typecheck:fast` clean; eslint on the four source / test files clean.

## Step 5 - `scripts/map-ready-measure.mjs` (new)
Report only, never asserts. `launch` / `openPage` from `e2e-lib.mjs` (not edited); port `E2E_PORT` (default 4189); maps
`campusOps` sector, `ctcourse` course solo, `warehouse` clear, each `gfx=epic` (+ `mapready=1` with `--gated`). Per map:
cold (new browser), 3 cached (reload), a repeat in the page (`cb.quit()`, `__play`), then the next map in the list in
that page (row `<next> | after <map>`; with one `--maps` entry the next from all three; fix round); each waits for the reveal and
`after.done` (60 s past the reveal). A16 (a): campus cold, its section bake done, `cb.restart()`, the new record's
`bakeSource`. A16 (b): one `net=local` context, page A plays campus solo until its section bake is done, quits, hosts;
page B joins; the host starts `sector` / `campusOps`; both pages' `bakeSource` (the `hostAndJoin` / `startMode` steps
copied in, `e2e-net-lib.mjs` not imported). Output: `--out` JSON and a markdown table on stdout (map, run, reveal s,
steps, loadPrograms, after-window counts, p50 / p95 / max, bakeSource, bakeMs, heapMb). `--maps`, `--skip-a16` for
partial runs. `node --check` clean (eslint ignores `scripts/`). Not run here (needs `dist/` and a GPU).

## Step 6 - hand-over (pending PC run; the lead sends)
- Affected + the co-op gate (`src/game` changed): `node scripts/laptop-queue/request.mjs --sha <head> --pr <n> --affected
  --set affected --requester "Night Shift | Sector Ops Build"` and `node scripts/laptop-queue/request.mjs --sha <head>
  --pr <n> --suites "e2e-coop e2e-netmove" --set coop-gate --requester "Night Shift | Sector Ops Build"`.
- The baseline: `node scripts/laptop-queue/request.mjs --sha <head> --alone --step "npm run build" --step "node
  scripts/map-ready-measure.mjs --out C:/NightShift/scratch/map-ready/baseline.json" --env E2E_GPU=1 --set
  map-ready-baseline --requester "Night Shift | Sector Ops Build"`.
- Then `docs/map-ready/research/baseline.md` from its output (the table, the laptop, the build sha, campus cold
  programs / landings / pop-ins > 0 in the window, the warehouse rows against `docs/systems/performance.md:25-26`, the
  A16 rows reading `baked`). Not written here (no run).
