# map-ready S14 - build report
Owner: Night Shift | Sector Ops Build. Status: current.

Builder: Night Shift | Cloud Builder 4 (cloud, Opus 5.5), 2026-10-26. Branch `feature/map-ready-s14` from
`origin/feature/map-ready-s2` a85f3db93 (S1 fix1 + S2 fix1). Brief `docs/map-ready/briefs/S14.md` and
`docs/map-ready/SHORTEN.md` read from `origin/feature/map-ready` eae83afc9. Steps 1-5 built and pushed; step 6 is the
lead's hand-over (pending PC run, below). Cloud checks only: tsc and the named vitest files; no e2e, no GPU, no browser.
Owned files only; nothing in the never-touch list changed. Code head: 624014911.

## Step 1 - `src/core/compileLog.ts` (new), `tests/compileLog.test.ts` (new) - 221635bf5
- The brief's interface as written: `ShaderKind`, `shaderKindOf`, `CompileEntry`, `CompileLogRecord`, `CompileLog`
  (`known`, `seen`, `ready`, `group`, `finish`, `top`, `summary`). Pure, no Babylon, no DOM.
- `shaderKindOf` matches whole define names on a `#define` line (`#define SMOOTHBODY`, with or without a value), in the
  brief's order: body, guard, level (LEVELSHADING or SURFACES), lit (BAKED_LAMPS); then a name other than `pbr` /
  `default` (and not empty) is post; else other.
- `seen` / `ready` allocate only the entry (`#define` lines counted with `indexOf`). `inFlight` = pending before this
  entry; `peakInFlight` = the most pending at once. A ready time is never before its start (`max`).
- Additions (each undo: delete it): `KEY_MAX` (200) exported for the test; a finished log ignores `seen` / `ready`;
  `summary` says ", none finished" with nothing ready and appends ", N pending at T s" while some are (the brief's
  example text is unchanged when nothing is pending).
- Tests: 9 / 9 (every kind, substring defines not a kind, known never logged, seen twice keeps the first, ready on an
  unknown key ignored, early and cut keys, 3 compiles with 2 overlapping: ms / inFlight / peak, failed, top with a
  pending last, summary text, finish leaves -1, group keeps the first time).

## Step 2 - `src/game/compileOrder.ts` (new), `tests/compileOrder.test.ts` (new) - 28e90f014
- As written. parallel: nothing before quality + content; LEVEL | GUARDS then; OWN once bodies; REST once OWN, LEVEL and
  GUARDS are in `started` (so REST starts one gate read after the third, never the same read); no settle waited on.
  serial: OWN once bodies, LEVEL after OWN settled, GUARDS after LEVEL settled, REST after GUARDS settled. A started bit
  is never returned (pinned over every started / settled / bodies combination in both orders).
- Tests: 8 / 8.

## Step 3 - `src/game/gameState.ts`, the log - a3db057aa
- `create`, right after S1's `window.__mapReady`: `compileLogStart(readyWorld)` (the S1 `world` step's time):
  `new CompileLog(t0, compileOrderOf(location.search))`; each `_compiledEffects` key whose effect `isReady()` is
  `known`; one not ready is `seen(..., early true)` and watched; `window.__compileLog = log.record`. Flag on or off.
- `frameUpdate`, right after `trackSpikes()` and before S1's block: while the log is open, `compilePoll(now)`: when
  `spikeShaders` differs from the count the log last walked at, `Object.keys(_compiledEffects)` once and each new key
  `seen` with its name (a string, or the `fragment` / `fragmentElement` of an object name) and `defines`, pushed on
  the watched pair of arrays (members, reused); then each watched effect: disposed -> `ready(..., -1, true)`;
  `isReady()` -> `ready(key, now, _fragmentSourceCode?.length ?? -1, false)`; `getCompilationError()` non-empty ->
  `ready(..., true)`; swap-removed. `finish()` once nothing is pending and S1's after-window is done, or 150 s after t0
  (`COMPILE_LOG_MAX_MS`); then both arrays are emptied (no effect kept). Once done: one boolean read per frame. A frame
  with no new program and nothing pending allocates nothing.
- Code read, "does `frameUpdate` run during S2's hold": yes. `GameState.simulating` is false while holding, so
  `App.hooks.beforeFrame` sets `loop.paused`; `Loop.frame` (`src/core/loop.ts:214`) still calls
  `hooks.frameUpdate(this.paused ? 0 : dt, ...)` every rendered frame, and `GameState.frameUpdate` reaches the poll
  (only `exited` returns before it). So the poll is in `frameUpdate` only, not `gateRead`. Two limits: `Loop.advance`
  (the test stepper, `loop.ts:87`) skips `frameUpdate` while paused, and a hidden tab renders no frames (the gate ticks
  by timer then); in both the log catches up on the next rendered frame, so a program that became ready meanwhile reads
  late (its ms longer). The measure runs on a visible page.
- `feedbackContext()`: `ctx.compiles = log.summary(now)`.
- Known limits: a key that appears and is ready within one frame logs about 0 ms (frame granularity); an effect whose
  compile error Babylon then retries with fewer defines (fallbacks) is logged failed at the first error.
- Deviation (undo: add `this.compileLog = null; this.compilePending.length = 0; this.compileKeys.length = 0` to
  `exit()`): a match quit before the log closes leaves the watched effects on the exited `GameState` until it is
  collected; `exit()` is outside this slice's members, and nothing holds an exited state.

## Step 4 - `src/game/gameState.ts`, cut A - 2947b7dae
- `gateCompile` (0-5) becomes `gateStarted` / `gateSettled` (group bits), `gateOrder` (from the log's `order`) and one
  reused `CompileDueInput`. `gateRead` fills it and calls `compileGroupsDue` each read (a number), and `gateCompileAll(due)`
  starts what it returns in priority order (own, level, guards, rest), each logged with `group(name)`.
- Group starters (S2's lists): own = the player rig's and weapon nodes' meshes; level = level + kit + facility props +
  `campus-` meshes; guards = every enemy's `bodyRig.root` meshes, sorted nearest first (`hyp2`), all started together
  with no await between guards (parallel); rest = every scene mesh. Each through S2's `gateCompileMeshes`; its promise
  settling (or rejecting, or the list throwing: logged "the priority compile stopped early") sets its settled bit.
- `shaders` = `gateStarted === GROUP_ALL && gateDrawReady()` (S2's check unchanged). `gateDescribe` prints
  `compile <order> started <bits> settled <bits> of 15` in place of the group number.
- `?compileorder=serial`: S2's order and waits: OWN once bodies, each next group after the previous settled, and the guards
  one after the other (awaited, stopping if the state exits), as S2 did.
- Deviation from S2 (undo: none needed for the parallel path): in serial, a thrown group no longer ends the whole chain
  (S2 jumped to "done" and skipped the rest); the next group starts after it settles. `gateDrawReady` compiles
  everything either way.
- Note for the run: in parallel the guards group starts at quality + content, before `bodies`; a guard body not loaded
  yet compiles in the rest group or through `gateDrawReady`, as S2's sweep did.

## Step 5 - `scripts/map-ready-measure.mjs` - 624014911
- `--runs cold` (each map's cold run only, then the browser closes) and `--compile-order serial` (adds
  `compileorder=serial` to the page params, the A16 co-op pages too).
- After each run's after-window: waits for `__compileLog.done` (or no log) up to 150 s more, warns on timeout, keeps the
  record in the row's `compile` (JSON). `__compileLog` is cleared with `__mapReady` before a quit / restart / co-op start.
- Output: each run's console line adds the log's summary; after the table, per run: summary, order, peak in flight,
  group start times (s from the `world` step), and the 8 longest programs (kind, s, frag chars, in flight, early,
  failed). The JSON adds `compileOrder` and `runs`.
- `node --check`: pass. Never launched (no browser in the cloud).

## Checks (cloud)
- `npx tsc --noEmit -p .`: clean. `npx eslint` on every changed source file: clean.
- `npx vitest run tests/compileLog.test.ts tests/compileOrder.test.ts tests/mapGate.test.ts tests/mapReadyStats.test.ts
  tests/menuGate.test.ts tests/changesFragments.test.ts --maxWorkers=2`: 50 / 50 (9, 8, 15, 7, 10, 1). S2's gate tests
  unchanged and green.
- Fragment `changes/feature-map-ready-s14.md`, `kind: patch`.
- Size: 691 + / 36 - over the six code files (before this report).

## Step 6 - hand-over (pending PC run, the lead)
- Affected e2e and the `src/game` co-op gate:
  - `node scripts/laptop-queue/request.mjs --sha <head> --pr <n> --affected --set affected --requester "Night Shift | Sector Ops Build"`
  - `node scripts/laptop-queue/request.mjs --sha <head> --pr <n> --suites "e2e-coop e2e-netmove" --set coop-gate --requester "Night Shift | Sector Ops Build"`
- One laptop 4189 alone run:
  `node scripts/laptop-queue/request.mjs --sha <head> --alone --step "npm run build" --step "node scripts/map-ready-measure.mjs --gated --runs cold --skip-a16 --out C:/NightShift/scratch/map-ready/s14-par.json" --step "node scripts/map-ready-measure.mjs --gated --runs cold --skip-a16 --compile-order serial --out C:/NightShift/scratch/map-ready/s14-ser.json" --env E2E_GPU=1 --set map-ready-s14 --requester "Night Shift | Sector Ops Build"`
- The lead then writes `docs/map-ready/research/compile-times.md` (per map: the longest variants by kind, Epic body keys
  per character kind, peak in flight, overlap factor (sum / span), the `shaders` step parallel vs serial, reveal seconds
  and `capHit`) and fills SHORTEN section 1. Expected (estimates, SHORTEN 3): parallel `shaders` about the longest
  variant (30-44 s cold Epic campus before S15), serial about the sum.
