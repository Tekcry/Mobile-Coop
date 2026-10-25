# map-ready: plan
Owner: Night Shift | Sector Ops Build. Status: current.

Lead: Night Shift | Sector Ops Build. Planner: Opus 5.5, master 2148ec96. Brief: `docs/map-ready/BRIEF.md`. Findings
with file:line: `docs/map-ready/research/start-path.md` (rows 1-13 below are its table rows).

## 1. Claims
```claims
files:
  - src/core/flags.ts
  - src/core/app.ts
  - src/core/mapReadyStats.ts
  - src/main.ts
  - src/game/gameState.ts
  - src/game/mapGate.ts
  - src/game/modes/courseMode.ts
  - src/world/world.ts
  - src/world/bakedLamps.ts
  - src/voxel/sectionJobs.ts
  - src/ai/guardWarm.ts
  - src/ai/guardHelmet.ts
  - src/ai/guardShield.ts
  - src/audio/gameAudio.ts
  - src/audio/weapons/weaponAudio.ts
  - src/audio/score/game/gameMusic.ts
  - src/net/protocol.ts
  - src/net/session.ts
  - src/net/coopHost.ts
  - src/net/coopClient.ts
  - tests/mapGate.test.ts
  - tests/mapReadyStats.test.ts
  - tests/mapReadyNet.test.ts
  - tests/guardWarm*.test.ts
  - tests/sectionBake*.test.ts
  - scripts/e2e-lib.mjs
  - scripts/e2e-sectorops.mjs
  - scripts/e2e-ctcourse.mjs
  - scripts/e2e-lightbake.mjs
  - scripts/map-ready-measure.mjs
  - docs/map-ready/**
  - docs/systems/performance.md
  - docs/systems/lighting.md
  - docs/systems/testing-tools.md
  - TESTING.md
  - changes/feature-map-ready.md
maps: campusOps, ctcourse, warehouse
protocol: mr, go
save: none
```
Wire: `mr` and `go` are new; `snap` is sent during the hold with the clock at 0 (same shape). The train bumps
`PROTOCOL_VERSION`; no test asserts its number. Save: none (the bake cache key and shape are unchanged).

## 2. What "map ready" waits for (the gate)
A pure gate `game/mapGate.ts` on the pattern of `world/menuGate.ts` (steps, progress text, cap, a probe the state
fills each frame, `WARM_FRAMES`). It runs after `World.create`, inside the match state, with the sim held (A4).

| Step | Done when | Fixes rows | Cap cuts it |
| --- | --- | --- | --- |
| `bake-live` | the live section's lamps landed (today's wait, `gameState.ts:974`) | - | never (A3) |
| `quality` | the first `applyQuality` / `applyAdaptive` ran BEFORE the warm-up: shadows, light pool, char / torch shadow defines, post stack, surface atlas at its real size | 1, 7 | no (synchronous) |
| `content` | `mode.start()` ran in the hold (guards placed, devices on); co-op: remote avatars built (host `addRemote`; client: the first hold snapshot applied, puppets built) | 5, 10 | no (synchronous) |
| `bodies` | every operator / guard figure in the scene has its play LODs (LOD0-2; `?gfx=min` LOD2), every weapon model `meshPending` false, the helmet drop and shield meshes in when the run uses them | 3, 4, 11 | yes |
| `shaders` | every mesh with sub-meshes `isReady(true)` (disabled ones too: frozen off-screen guards and far-culled art must compile), every post process ready, `getWaitingItemsCount() === 0`, a warm body per guard kind present (S3) | 1, 2, 9 | yes |
| `probe` | the environment probe captured and `scene.environmentTexture` set | 8 | yes |
| `bake-all` | every section landed (`sections.done`) and no atlas tile queued (`lamps.tilesPending === 0`) | 6, 12 | yes (then today's background bake) |
| `audio` | the weapon sound sprite and the first music cue decoded | 13 | yes |
| `warm` | `WARM_FRAMES` (5) rendered behind the boot screen with every step above true and `shaderCount()` unchanged | 1, 2, 8 | yes |
| `peers` (co-op) | host: every start player's `mr` in, or `COOP_READY_GRACE_MS` 15 s past its own ready; client: `go` received | 10 | host grace only |

Release: the boot screen fades (`main.ts:412` moves from `create`'s `finally` to the gate's end), input goes live, the
sim's first fixed step runs, `sections.markPlaying()` (the cache write happens then when every lamp is in: S4), the
letterbox starts. With `mapReady` off nothing of this runs (today's order).

The cap: `MAP_READY_CAP_MS` 45 s from the end of `World.create` (A2, Q1), `?readyCap=<s>` 5-600. Hidden tab: the
gate ticks every 100 ms like the menu (`menuScene.ts:332-345`).

## 3. Slices
**S1 Measure first (Sonnet 5.5 from an Opus brief; Opus checker).** A pure `core/mapReadyStats.ts`: step times, the
reveal time, then a 10 s after-window counting shader programs created (`shaderCount`), frames tagged `shaders`,
lamp landings and atlas tile uploads, materials added, body and weapon mesh swaps ("pop-ins": an `OperatorFigure`
first LOD shown or switched while in view, a `WeaponModel.useMesh`, a guard `ready()` swap, counted by polling those
objects' public state each frame, render side only), frame time p50 / p95 / max. Exposed as `window.__mapReady` and
one line in `feedbackContext()`. Works with the flag off (the reveal = today's `setState`) so S1 gives the baseline.
`scripts/map-ready-measure.mjs` (report only, laptop alone): campusOps solo, ctcourse solo, warehouse; Epic; a cold
run (fresh profile: no bake or shader cache) and 3 cached runs each; writes JSON plus a short table.
- Files: `src/core/mapReadyStats.ts`, `src/game/gameState.ts` (wire the stats; no behaviour change),
  `src/world/bakedLamps.ts` (a landing / re-scan counter), `scripts/map-ready-measure.mjs`,
  `tests/mapReadyStats.test.ts`. Est. lines: 450.
- Checks: `npx vitest run tests/mapReadyStats.test.ts`, tsc; affected e2e. Then one laptop 4189 alone request
  (`--suites` none, steps: the measure script, `E2E_GPU=1`) -> `docs/map-ready/research/baseline.md`.
- Done looks like: the baseline table names, per map, seconds to reveal and how much builds in the 10 s after it
  (expected: campus cold shows programs > 0, landings > 0, pop-ins > 0).
- Flag: none (read-only counters, render side; gameplay reads none).

**S2 The gate and the hold (Opus 5.5).** `game/mapGate.ts` (pure, steps in section 2 minus S3-S5's parts), the
`mapReady` flag, and in `GameState.create` / `main.ts` with the flag on: apply quality before the warm-up (`quality`
step); `app.setState` with the state held (no fixed steps, `simulating` false, input off, clock 0; the frame update
still poses rigs and renders); `content` (`mode.start()` moves inside the hold, its letterbox / banners deferred to the
release); the `bodies`, `shaders`, `probe`, `bake-all` (reading today's `sections.done` and a new
`BakedLamps.tilesPending`) and `warm` steps; the cap and fallback (A3); the boot bar's step text ("Building lights",
"Compiling shaders", "Loading Wren", "Final checks"). A `NetAttachment` hook pair for S5 (`holdsStart(): boolean`,
`onLocalReady(info)`), unused until S5. `scripts/e2e-lib.mjs`: with `mapready=1` in the URL, `openPage` waits for
`__mapReady.released` (so suites never step a held sim).
- Files: `src/game/mapGate.ts`, `src/game/gameState.ts`, `src/main.ts`, `src/core/app.ts` (only if the hold needs the
  loop's help), `src/core/flags.ts`, `src/world/world.ts` (probe captured flag), `src/world/bakedLamps.ts`
  (`tilesPending`), `scripts/e2e-lib.mjs`, `tests/mapGate.test.ts`. Est. lines: 900.
- Checks: vitest `tests/mapGate.test.ts tests/menuGate.test.ts tests/mapReadyStats.test.ts`, tsc. e2e: affected (the
  e2e-lib change runs the full set) plus, by hand request, `e2e-sectorops` part 6 and `e2e-lightbake` with
  `mapready=1`; one laptop alone measure run with `?mapready=1` against S1's baseline.
- Done looks like: flag off, every suite as before; flag on, campus and warehouse at Epic reveal with 0 programs and 0
  pop-ins in the after-window (guards' first-compile and co-op still open until S3 / S5).
- Flag: `mapReady`.

**S3 Warm what arrives later (Opus 5.5).** The guard body variant warmed per kind on the merged-body path too
(`ai/guardWarm.ts` today warms only `?guardmodels=1`), so a guard spawned after the release (inside 7 m, A8; a course
bay's squad; a reinforcement) compiles nothing; course mode lists its bays' kinds at load (`courseMode.ts`); the helmet
drop and shield meshes start loading at load when the run's guards can carry them (`guardHelmet.ts`, `guardShield.ts`);
audio ready promises for the `audio` step (`gameAudio.ts`, `weaponAudio.ts`, `gameMusic.ts`).
- Files: `src/ai/guardWarm.ts`, `src/ai/guardHelmet.ts`, `src/ai/guardShield.ts`, `src/game/modes/courseMode.ts`,
  `src/audio/gameAudio.ts`, `src/audio/weapons/weaponAudio.ts`, `src/audio/score/game/gameMusic.ts`,
  `tests/guardWarm*.test.ts`. Est. lines: 600.
- Checks: vitest the guard-warm tests, tsc; affected e2e plus `e2e-coop` + `e2e-netmove` (guard bodies are drawn on
  the client); `e2e-ctcourse` with `mapready=1` (a bay's squad spawns: 0 programs created at its spawn).
- Done looks like: a guard spawning mid-match adds no shader program; helmets and shields never show a stand-in box.
- Flag: `mapReady` (the warm meshes are built only with it on).

**S4 Every section before play (Opus 5.5).** With the flag on, `bake-all` waits for every campus section; when all
lamps are in at the release, `markPlaying` writes the joined result to the cache then (SB14 allows it: not mid-play)
instead of at the first section change (row 12). At the cap the bake carries on in the background exactly as today
(fade, tile budget, inline retries). Parity unchanged (`tests/sectionBake.test.ts`).
- Files: `src/voxel/sectionJobs.ts`, `tests/sectionBake*.test.ts`. Est. lines: 250. May ride one PR with S3.
- Checks: vitest `tests/sectionBake.test.ts tests/sectionBakeCampus.test.ts tests/sectionBakeRobust.test.ts`, tsc;
  affected (LIGHT group); `e2e-sectorops` part 6 with `mapready=1&readyCap=240` (software GL bakes slowly).
- Done looks like: a cold campus load reveals with every lamp lit and no tile upload after; the first section door
  has no cache-write hitch.
- Flag: `mapReady`.

**S5 Co-op: everyone ready before play (Opus 5.5; two independent Opus checkers).** Client: its gate runs as solo plus
"a hold snapshot applied" in `content`; then it sends `mr` {capHit, ms} and keeps its boot screen until `go`. Host: its
gate, then holds (clock 0, a snapshot at 2 Hz so clients build puppets and partners, nothing else sent) until every
start player's `mr` or the grace (A5), then broadcasts `go` and releases. A client with no `go` by its cap plus 30 s
reveals into the existing "Waiting for host..." text (`net/objectiveMirror.ts`) and the host-drop path. Late joiners
and rejoiners: local gate only, never `mr` / `go`. `mr` joins the host whitelist (`session.ts:205`); both get
`parseMessage` cases (`protocol.ts:796-1046`).
- Files: `src/net/protocol.ts`, `src/net/session.ts`, `src/net/coopHost.ts`, `src/net/coopClient.ts`,
  `tests/mapReadyNet.test.ts`, `scripts/e2e-ctcourse.mjs` (the co-op assertions). Est. lines: 650.
- Checks: vitest `tests/mapReadyNet.test.ts tests/net.test.ts tests/coopRejoin.test.ts tests/protocolConst.test.ts`,
  tsc; the co-op group `e2e-coop` + `e2e-netmove` + `e2e-ctcourse` (and `e2e-sectorops` co-op part) green, flag off
  and on.
- Done looks like: in `e2e-ctcourse` with `mapready=1` the host's sim time is 0 until `go`, both pages reveal within
  1 s of each other, the client's guards and partner exist at its reveal, a rejoin still works.
- Flag: `mapReady` (off: no `mr` / `go` sent, no hold snapshots).

**S6 The e2e proof (Sonnet 5.5 from an Opus brief).** "Nothing builds after ready", in the suites that own each
map's start: `e2e-sectorops` part 6 (campusOps, `scripts/e2e-sectorops.mjs:1946-1957`), `e2e-ctcourse` (ctcourse
solo and co-op, `:39`, `:305-309`), `e2e-lightbake` (warehouse at min / low / epic, `:18`). Each with `mapready=1`:
wait for `__mapReady.released`; stand still for 10 s of rendered frames; assert the after-window: 0 programs created,
0 frames tagged `shaders`, 0 landings and tile uploads, 0 pop-ins, `released` true. `capHit` false is asserted only on
the GPU runs (software GL may hit it on a cold campus bake; it then asserts the fallback kept the live section lit).
- Files: `scripts/e2e-sectorops.mjs`, `scripts/e2e-ctcourse.mjs`, `scripts/e2e-lightbake.mjs`. Est. lines: 400.
- Checks: those three suites on the laptop queue (`E2E_GPU=1`), solo reruns per `docs/systems/testing-tools.md`.
- Done looks like: the three suites green with the assertions; a deliberate late compile (a test-only material made
  after the release) fails them (shown once in the PR body).
- Flag: the suites set `mapready=1` themselves.

**S7 Docs and the budget line (Haiku 5.5; after Q1 and S2-S6's numbers).** `docs/systems/performance.md` line 81
("Loading: ... <= `WARMUP_MAX_MS`") becomes the line below; `docs/systems/lighting.md` "Per-section lamp bake" gets
the wait-all rule; `docs/systems/testing-tools.md` gets `__mapReady`, `?readyCap=` and the after-window; `TESTING.md`
one checklist line; `changes/feature-map-ready.md` (`kind: minor`).
- Est. lines: 120. Checks: CI `check` (doc lint).

Proposed performance.md line (numbers are starting values, G10; pending a PC run):
> - Map ready (map-ready; `?mapready=1` until switched on): the loading screen stays up until the map is built and
>   warmed (`game/mapGate.ts`: lamps, shaders for the settings in use, bodies, weapons, the probe, every Saltmarsh Park
>   section), at most `MAP_READY_CAP_MS` 45 s after the level is built (Q1); past it play starts with what is ready
>   (the live section's lamps always). After the reveal, standing still for 10 s: 0 shader programs created, 0 lamp
>   landings or atlas tile uploads, 0 body or weapon mesh swaps, frame p95 within the rendered-frame-interval line.
>   Co-op: play starts when every player is ready (15 s grace). Load-time goals: after Michael's review of S1's
>   numbers (Q31).

**S8 Shorten the wait (Opus 5.5 plan; builder chosen with it).** From S1's baseline: where the cold seconds go, then a
plan for the biggest cut. Candidates: compile the match's character variants while the player sits in the lobby or
the menu (the menu already parses Wren's LOD0 / LOD1, `operators/runtime/playerFigure.ts:84-110`); fewer Epic body
variants (the V12 body-shader slice: hand over if it has an owner, A13); put character and live-section shaders first
in the compile order; start the bake workers for the chosen map from the lobby. Plan doc `docs/map-ready/SHORTEN.md`
first; a build slice stays under 800 lines.

Order: S1 -> S2 -> S3, S4, S5 in parallel (own worktrees `feature/map-ready-s3` / `-s4` / `-s5`; disjoint files) ->
S6 -> S7. S8's plan after S1. Laptop alone runs: after S1 (baseline) and after S5 (flag on), same script.

## 4. Flags (dark until accepted)
| Flag | Default | Owner | Switch-on date | Switches on when |
| --- | --- | --- | --- | --- |
| `mapReady` (`?mapready=1`) | off | Night Shift \| Sector Ops Build | after the Sector Ops walk lands (area at cap), target 2026-11-01 | S2-S6 passed, Q1 answered, Michael accepts the walk items below |

## 5. Walk items
- Main menu > Sector Ops > Saltmarsh Park, solo, first load after the update: the loading bar walks its steps; when the
  map appears nothing changes on screen (no lights coming on, no textures swapping, Wren and the gun detailed, guards
  in place), no hitch in the first 10 s - accept when the first 10 s look finished and the wait is under the cap.
- Same, second load: accept when it is clearly quicker and still finished at the reveal.
- Co-op > Marlow Yard with a partner: both loading screens drop together; the partner and the first bay's guards are
  already there - accept when neither player sees anything arrive.
- Co-op > Sector Ops with a partner, one PC slower: the faster player waits on "Waiting for partner" - accept when
  play starts for both at once.

## 6. Risks and open questions
- A held sim under the old e2e helpers: suites step the sim as soon as `current.player` exists
  (`scripts/e2e-lib.mjs:223-236`). Mitigation: the flag is off by default; S2's `openPage` waits for `released` when
  `mapready=1`.
- Quality applied earlier: `applyQuality` then runs twice (before the warm-up and in `setTarget`); the second must be a
  no-op. Check: `e2e-lightbake` and `e2e-desktop` with the flag on and off (shader defines, 16-texture limit).
- `Scene.whenReadyAsync` before any render misses render targets and post effects; the `warm` step renders behind the
  boot screen and needs `shaderCount()` stable for 5 frames, so a late variant is caught before the reveal.
- A cold campus bake may outlast the cap (S1 alone 22 s at 4 workers; a dead worker holds a job up to 80 s,
  `voxel/sectionJobs.ts:30-35`): the fallback is today's behaviour, and the cache makes the next load quick.
- The host waiting on a slow client: bounded by the grace; a client that drops during the hold is removed from the
  wait by the existing leave path (`session.ts`); a rejoin never holds.
- `DIRECT_COVERS` has no campusOps entry (`scripts/e2e-affected.mjs:297-315`), so campus file changes do not reach
  `e2e-sectorops` by themselves: the lead requests it on S2 / S4 PRs (and tells Test Runner; not claimed here).
- Q1 (cap) is Michael's: until answered the build uses 45 s behind the dark flag (A2, logged overnight).
