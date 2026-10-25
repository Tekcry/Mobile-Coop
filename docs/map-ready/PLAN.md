# map-ready: plan
Owner: Night Shift | Sector Ops Build. Status: current.

Lead: Night Shift | Sector Ops Build. Planner: Opus 5.5, master 2148ec96 (src unchanged to b81c4945); revised after
plan check 1 (`PLAN-CHECK.md`, FIX) for Michael's ~18:50 near-instant-loads pick. Brief: `docs/map-ready/BRIEF.md`.
Findings with file:line: `docs/map-ready/research/start-path.md` (rows 1-15 below are its table rows).

Michael's four fixes and where they are built: (1) settings before the warm-up, characters / guards / weapons warmed
behind the loading screen: S2 (`quality`, `bodies`, `shaders`) and S3. (2) campus lamp bakes shipped pre-built: S4.
(3) loading starts in the lobby once the map is picked: S11, with S5's start handshake. (4) characters, guards, weapons
and compiled shaders kept between maps: S9 (files and textures) and S10 (compiled shaders). As planned, (3) and (4)
are narrower than his words (the level is built at Start, each match gets a fresh scene: BRIEF A18, A19); BRIEF Q3
asks him. Q3's second or third option adds S12 (one scene, only the level swapped) and S13 (the level built in the
lobby), sketched at the end of section 3; until he answers they are not built. Plan check 2: `PLAN-CHECK-2.md`.

## 1. Claims
```claims
files:
  - src/core/flags.ts
  - src/core/app.ts
  - src/core/mapReadyStats.ts
  - src/core/keptParts.ts
  - src/main.ts
  - src/game/gameState.ts
  - src/game/mapGate.ts
  - src/game/preload.ts
  - src/game/modes/courseMode.ts
  - src/world/world.ts
  - src/world/bakedLamps.ts
  - src/world/lightBake.ts
  - src/world/shippedBake.ts
  - src/world/kit/kitRender.ts
  - src/world/props/propRender.ts
  - src/world/campusArt/campusArtRender.ts
  - src/voxel/sectionJobs.ts
  - src/voxel/lampJobs.ts
  - src/world/surfacePlugin.ts
  - src/world/levelMaterialPlugin.ts
  - src/player/smoothBodyPlugin.ts
  - src/operators/runtime/guardFigurePlugin.ts
  - src/cosmetics/patternPlugin.ts
  - src/operators/runtime/figure.ts
  - src/ai/guardWarm.ts
  - src/ai/guardHelmet.ts
  - src/ai/guardShield.ts
  - src/audio/gameAudio.ts
  - src/audio/weapons/weaponAudio.ts
  - src/audio/score/game/gameMusic.ts
  - src/ui/screens/briefingScreen.ts
  - src/pwa/runtimeCaching.ts
  - src/pwa/precacheGlobs.ts
  - src/net/protocol.ts
  - src/net/session.ts
  - src/net/coopHost.ts
  - src/net/coopClient.ts
  - src/net/coopUi.ts
  - vite.config.ts
  - .github/workflows/deploy.yml
  - .github/workflows/preview.yml
  - tests/mapGate.test.ts
  - tests/mapReadyStats.test.ts
  - tests/mapReadyNet.test.ts
  - tests/guardWarm*.test.ts
  - tests/sectionBake*.test.ts
  - tests/shippedBake.test.ts
  - tests/keptParts.test.ts
  - tests/pluginCode.test.ts
  - tests/preload.test.ts
  - scripts/prebake.mjs
  - scripts/prebake/**
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
maps: campusOps, ctcourse, warehouse
protocol: mr, go
save: none
```
`package.json` (the `build` script gains the prebake) and the changelog fragment `changes/feature-map-ready.md` are
shared files (not claimed). Save: none (the IndexedDB bake cache keys drop the seed, A16: a cache key, not the save
shape; old entries age out through the cache's own keep-2 index). Wire: `mr` and `go` are new; `snap` is sent during
the hold with the clock at 0 (same shape); the lobby preload sends nothing (A19). The train bumps `PROTOCOL_VERSION`;
no test asserts its number.

Overlaps: section 7 (claims-check output and the order against each branch).

## 2. What "map ready" waits for (the gate)
A pure gate `game/mapGate.ts` on the pattern of `world/menuGate.ts` (steps, progress text, cap, a probe the state
fills each frame, `WARM_FRAMES`). It runs after `World.create`, inside the match state, with the sim held (A4). With
the lobby preload (S11) and the kept parts (S9, S10) most steps are already true when it starts.

| Step | Done when | Fixes rows | Cap cuts it |
| --- | --- | --- | --- |
| `bake-live` | the live section's lamps landed (today's wait, `gameState.ts:974`; with the shipped bake, at once) | 15 | never (A3) |
| `quality` | the first `applyQuality` / `applyAdaptive` ran BEFORE the warm-up: shadows, light pool, char / torch shadow defines, post stack, surface atlas at its real size | 1, 7 | no (synchronous) |
| `content` | `mode.start()` ran in the hold (guards placed, devices on); co-op: remote avatars built (host `addRemote`; client: the first hold snapshot applied, puppets built) | 5, 10 | no (synchronous) |
| `bodies` | every operator / guard figure in the scene has its play LODs (LOD0-2; `?gfx=min` LOD2), every weapon model `meshPending` false, the helmet drop and shield meshes in when the run uses them | 3, 4, 11 | yes |
| `shaders` | every mesh with sub-meshes `isReady(true)` (disabled ones too: frozen off-screen guards and far-culled art must compile), every post process ready, `getWaitingItemsCount() === 0`, a warm body per guard kind present (S3) | 1, 2, 9 | yes |
| `probe` | the environment probe captured and `scene.environmentTexture` set | 8 | yes |
| `bake-all` | every section landed (`sections.done`, or a shipped / cached hit) and no atlas tile queued (`lamps.tilesPending === 0`) | 6, 12 | yes (then today's background bake) |
| `audio` | the weapon sound sprite and the first music cue decoded | 13 | yes |
| `warm` | `WARM_FRAMES` (5) rendered behind the boot screen with every step above true and `shaderCount()` unchanged | 1, 2, 8 | yes |
| `peers` (co-op) | host: every start player's `mr` in, or `COOP_READY_GRACE_MS` 15 s past its own ready; client: `go` received | 10 | host grace only |

Release: the boot screen fades (`main.ts:412` moves from `create`'s `finally` to the gate's end), input goes live, the
sim's first fixed step runs, `sections.markPlaying()` (the cache write happens then when every lamp is in: S4), then
the opening plays from the release: the 2.8 s letterbox, the banners and the start objective popup (G343 / G351: the
popup's "fade in on each new objective" is triggered by re-applying the current objective at the release, so its ~5 s
hold is never spent behind the loading screen). With `mapReady` off nothing of this runs (today's order).

The cap: `MAP_READY_CAP_MS` 45 s from the end of `World.create` (A2, Q1), `?readyCap=<s>` 5-600. Hidden tab: the
gate ticks every 100 ms like the menu (`menuScene.ts:332-345`).

## 3. Slices
Sizes are changed lines incl. tests, excluding generated or baked data (none is committed). Every slice is one PR
under ~1.5k lines / ~4 h; every `src/net` slice gets two independent Opus checkers (Guard AI reviews `src/net`).

**S1 Measure first (Sonnet 5.5 from an Opus brief; Opus checker). Fixes: baseline for all four.** A pure
`core/mapReadyStats.ts`: step times, the reveal time, then a 10 s after-window counting shader programs created
(`shaderCount`), frames tagged `shaders`, lamp landings and atlas tile uploads, materials added, body and weapon mesh
swaps ("pop-ins": an `OperatorFigure` first LOD shown or switched while in view, a `WeaponModel.useMesh`, a guard
`ready()` swap, counted by polling those objects' public state each frame, render side only), frame time p50 / p95 /
max; plus the bake source (`shipped` / `cache` / `baked`), effects reused vs compiled and textures reused vs decoded
during the load (the counters S9 / S10 read), and `performance.memory.usedJSHeapSize` at the reveal. Exposed as
`window.__mapReady` and one line in `feedbackContext()`. Works with the flag off (the reveal = today's `setState`) so
S1 gives the baseline. `scripts/map-ready-measure.mjs` (report only, laptop alone): campusOps solo, ctcourse solo,
warehouse; Epic; a cold run (fresh profile: no bake or shader cache), 3 cached runs, and a repeat run in the same page
(menu, the same map again, then another map), each map.
- Files: `src/core/mapReadyStats.ts`, `src/game/gameState.ts` (wire the stats; no behaviour change),
  `src/world/bakedLamps.ts` (a landing / re-scan counter), `scripts/map-ready-measure.mjs`,
  `tests/mapReadyStats.test.ts`. Est. lines: 480.
- Checks: `npx vitest run tests/mapReadyStats.test.ts`, tsc; affected e2e plus `e2e-coop` + `e2e-netmove` requested
  by hand if the affected set lacks them (`src/game/gameState.ts`: RULES "Test tiers" checker gate for `src/game`).
  Then one laptop 4189 alone request
  (`--suites` none, steps: the measure script, `E2E_GPU=1`) -> `docs/map-ready/research/baseline.md`.
- Done looks like: the baseline table names, per map, seconds to reveal (cold, cached, repeat in the page), how much
  builds in the 10 s after it (expected: campus cold shows programs > 0, landings > 0, pop-ins > 0), the warehouse row
  against `performance.md:25-26` (A14), and a co-op campus row showing `baked` on every start (A16's bug).
- Flag: none (read-only counters, render side; gameplay reads none).

**S2 The gate, the hold, settings first (Opus 5.5). Fix (1).** `game/mapGate.ts` (pure, the steps in section 2 minus
S3-S5's parts), the `mapReady` flag, and in `GameState.create` / `main.ts` with the flag on: apply quality before the
warm-up (`quality` step: today it runs after it, `core/app.ts:386` vs `gameState.ts:970-975`); `app.setState` with the
state held (no fixed steps, `simulating` false, input off, clock 0; the frame update still poses rigs and renders);
`content` (`mode.start()` moves inside the hold, its letterbox and banners deferred to the release); the `bodies`,
`shaders`, `probe`, `bake-all` (reading today's `sections.done` and a new `BakedLamps.tilesPending`) and `warm`
steps; the cap and fallback (A3); the release order in section 2, including the start objective re-applied at the
release (G343 / G351); the boot bar's step text ("Building lights", "Compiling shaders", "Loading Wren", "Final
checks"; S5 adds "Waiting for partner" for its `peers` step). A `NetAttachment` hook pair for S5 (`holdsStart(): boolean`, `onLocalReady(info)`), unused until S5.
`scripts/e2e-lib.mjs`: with `mapready=1` in the URL, `openPage` waits for `__mapReady.released` (so suites never step
a held sim).
- Files: `src/game/mapGate.ts`, `src/game/gameState.ts`, `src/main.ts`, `src/core/flags.ts`, `src/world/world.ts`
  (probe captured flag), `src/world/bakedLamps.ts` (`tilesPending`), `scripts/e2e-lib.mjs`, `tests/mapGate.test.ts`.
  Est. lines: 900. (`core/app.ts` is S9 / S10's; S2 holds the sim in `GameState`, not in the loop.)
- Checks: vitest `tests/mapGate.test.ts tests/menuGate.test.ts tests/mapReadyStats.test.ts`, tsc. e2e: affected (the
  e2e-lib change runs the full set) plus, by hand request, `e2e-sectorops` part 6 and `e2e-lightbake` with
  `mapready=1`, and `e2e-coop` + `e2e-netmove` (the `NetAttachment` change; RULES "Test tiers" checker gate); one
  laptop alone measure run with `?mapready=1` against S1's baseline.
- Done looks like: flag off, every suite as before; flag on, campus and warehouse at Epic reveal with 0 programs and 0
  pop-ins in the after-window (guards spawned later and co-op stay open until S3 / S5); the letterbox, banners and the
  objective popup start at the release, none during the hold.
- Order: after S1. Against `feature/hud-guidance`: its A1 deletes `blips?()` from `NetAttachment` (its PLAN:249) where
  S2 adds two hooks, and its B1 adds the objective popup. S2 cuts from the master after hud-guidance PR A if A is on
  master by then; otherwise S2 goes first and A rebases (one-line conflict in the interface). If B1 is not on master
  when S2 lands, S2's release re-applies the current objective through `hud.setObjective` (today's call), which B1's
  popup then shows; B1's builder keeps that call (noted in both PRs). After `feature/sector-batch` PR A / PR B
  (`main.ts`, `gameState.ts` `NetHooks`, `flags.ts`; section 7) or rebase on them.
- Flag: `mapReady`.

**S3 Warm what arrives later (Opus 5.5; two independent Opus checkers, Guard AI reviews the `src/ai` part: RULES "A
job"). Fix (1).** The guard body variant warmed per kind on the merged-body path too (`ai/guardWarm.ts` today warms only `?guardmodels=1`), so a guard spawned after the release (inside 7 m, A8; a
course bay's squad; a reinforcement) compiles nothing; course mode lists its bays' kinds at load (`courseMode.ts`);
the helmet drop and shield meshes start loading at load when the run's guards can carry them (`guardHelmet.ts`,
`guardShield.ts`); audio ready promises for the `audio` step and for S11's preload (`gameAudio.ts`, `weaponAudio.ts`,
`gameMusic.ts`); a `guardKindsFor(mapId, mode)` export S11 reads.
- Files: `src/ai/guardWarm.ts`, `src/ai/guardHelmet.ts`, `src/ai/guardShield.ts`, `src/game/modes/courseMode.ts`,
  `src/audio/gameAudio.ts`, `src/audio/weapons/weaponAudio.ts`, `src/audio/score/game/gameMusic.ts`,
  `tests/guardWarm*.test.ts`. Est. lines: 600.
- Checks: vitest the guard-warm tests, tsc; affected e2e plus `e2e-coop` + `e2e-netmove` (guard bodies are drawn on
  the client); `e2e-ctcourse` with `mapready=1` (a bay's squad spawns: 0 programs created at its spawn).
- Done looks like: a guard spawning mid-match adds no shader program; helmets and shields never show a stand-in box.
- Order: after S2. `gameAudio.ts` is also j19's (its S7 `put-body` sound): different functions; the second rebases.
- Flag: `mapReady` (the warm meshes are built only with it on).

**S4 Campus lamps shipped pre-built (Opus 5.5; Opus checker). Fix (2).** How it stays in sync (A15): built at build
time from the current map data, never committed, read only on an exact key match.
1. Key: one exported `lampKeyOf(mapId, shapesHash, lights)` / `moonKeyOf(...)` in `world/lightBake.ts`, used by the
   game and the prebake; the seed leaves both keys (A16, live, not flagged: research row 15).
2. Prebake: `scripts/prebake.mjs` runs `npx vitest run --config scripts/prebake/vitest.prebake.config.ts` (the
   `scripts/light-measure` pattern: TS in Node, no new package). It builds campusOps in Node as
   `tests/sectionBakeCampus.test.ts` does, takes the key, and, unless `node_modules/.cache/prebake/<key>/` holds it,
   bakes each section's lamps with the same `bakeLamps` the workers run (one test file per section, so the vitest pool
   bakes them in parallel; S1 is the long pole, 88.6 s single thread, research row 6), then writes per section
   `campusOps-s<k>.bin.gz` (Node `zlib` gzip of a small header + the section's `boxes`, `vis`, bounce `boxes` / `data`
   / `bits`) and `campusOps.json` (key, `LAMP_VERSION`, `CANON_VERSION`, per-file byte size and sha256). Over the cap
   (16 MB a file, 48 MB the map, compressed) it exits 1 with the sizes. `package.json` `build` becomes
   `node scripts/prebake.mjs && npm run typecheck && vite build`; a `vite.config.ts` plugin emits the cache folder's
   files as `bakes/*` in the build (nothing lands in `public/` or git).
3. Runtime: `world/shippedBake.ts`: on a cache miss for a section-bake map with `mapReady` on, fetch
   `bakes/<map>.json` (same origin, in the build); key equal -> fetch the section files (live section first), gunzip
   with `DecompressionStream('gzip')`, check sizes, join with the existing `joinBounce` / `lampLayout` into one
   `LampResult` and return it as a hit (`lightBake.ts:104-106` path); any mismatch, missing file or bad size -> null,
   and the PC bakes as today. A preloaded copy (S11) is used when its key matches. `src/pwa/runtimeCaching.ts`: a
   `bakes` runtime rule (cache-first, like `guards`); `precacheGlobs.ts`: `**/bakes/**` ignored.
4. Cache write at the release: S4 owns only the `markPlaying` write (`voxel/sectionJobs.ts`): when all lamps are in
   at the release, `markPlaying` writes the joined result to the cache then (SB14 allows it: not mid-play) instead of
   at the first section change (row 12). With a shipped hit nothing is written (the file is the cache; if that skip
   needs a change in `voxel/lampJobs.ts`, it is in S4's files). The `bake-all` wait for every section is S2's
   (`game/mapGate.ts`); S4 runs in W1 before S2 and only exposes `sections.done` as today.
5. CI: `.github/workflows/deploy.yml` (build-check and the deploy builds) and `preview.yml` restore / save
   `node_modules/.cache/prebake` with `actions/cache`, key `prebake-${{ hashFiles('src/**', 'scripts/prebake/**') }}`
   and `restore-keys: prebake-` (the newest folder comes back on any miss; the prebake reads it only under the exact
   lamp key, so a build without a lamp or level change bakes nothing even when other `src` files moved).
- Files: `src/world/lightBake.ts`, `src/world/shippedBake.ts`, `src/voxel/sectionJobs.ts`, `src/voxel/lampJobs.ts`
  (only if the shipped-hit skip needs it), `src/pwa/runtimeCaching.ts`,
  `src/pwa/precacheGlobs.ts`, `vite.config.ts`, `scripts/prebake.mjs`, `scripts/prebake/**`,
  `.github/workflows/deploy.yml`, `.github/workflows/preview.yml`, `tests/shippedBake.test.ts`,
  `tests/sectionBake*.test.ts`; `package.json` (shared). Est. lines: 1,000 (no baked data in git).
- Checks: vitest `tests/shippedBake.test.ts tests/sectionBake.test.ts tests/sectionBakeCampus.test.ts
  tests/sectionBakeRobust.test.ts`, tsc. `tests/shippedBake.test.ts` (the staleness and parity test, in `npm test`):
  two seeds give one key and a moved lamp gives a new key; the prebake and the game import the same `lampKeyOf`; a
  three-section strip baked through the prebake path, gzipped and read back through `shippedBake` equals the
  `SectionBaker` joined result byte for byte (light parity: the picture, the meter and the guards read the same bytes);
  a manifest with another key, a short file or a bad hash returns null. One CI build (build-check) proves the prebake
  runs on the runner and logs its seconds and sizes. Affected e2e (LIGHT group) plus `e2e-sectorops` part 6 by hand
  request with `mapready=1` (S6 adds `bakeSource === 'shipped'`).
- Done looks like: a built campus load with the flag on reads `shipped` and has every lamp lit at the reveal with no
  bake worker started; a co-op campus start with the flag off hits the IndexedDB cache from its second start (A16);
  PLAN / STATE record the measured file sizes and the prebake's seconds on CI and on the desktop; a dev build (no
  bakes) still bakes on the PC.
- Order: parallel with S1 (disjoint files). If the first prebake is over the cap, S4 stops before the runtime part and
  the planner re-plans (ship S1-S2 sections only, or quantise `vis`), logged as an A-line.
- Flag: `mapReady` for the shipped read and the wait-all; none for the key (A16).

**S5 Co-op: everyone ready before play (Opus 5.5; two independent Opus checkers, Guard AI reviews).** Client: its
gate runs as solo plus "a hold snapshot applied" in `content`; then it sends `mr` {capHit, ms} and keeps its boot
screen until `go`. Host: its gate, then holds (clock 0, a snapshot at 2 Hz so clients build puppets and partners,
nothing else sent) until every start player's `mr` or the grace (A5), then broadcasts `go` and releases. A client with
no `go` by its cap plus 30 s reveals into the existing "Waiting for host..." text (`net/objectiveMirror.ts`) and the
host-drop path. Boot bar text in the `peers` step (through S2's step-text hook): "Waiting for partner" on the host and
on a client waiting for `go` (walk item 3). Late joiners and rejoiners: local gate only, never `mr` / `go`. `mr` joins the host whitelist
(`session.ts:205`); both get `parseMessage` cases (`protocol.ts:796-1046`).
- Files: `src/net/protocol.ts`, `src/net/session.ts`, `src/net/coopHost.ts`, `src/net/coopClient.ts`,
  `tests/mapReadyNet.test.ts`, `scripts/e2e-ctcourse.mjs` (the co-op assertions). Est. lines: 650.
- Checks: vitest `tests/mapReadyNet.test.ts tests/net.test.ts tests/coopRejoin.test.ts tests/protocolConst.test.ts`,
  tsc; the co-op group `e2e-coop` + `e2e-netmove` + `e2e-ctcourse` (and `e2e-sectorops` co-op part) green, flag off
  and on.
- Done looks like: in `e2e-ctcourse` with `mapready=1` the host's sim time is 0 until `go`, both pages reveal within
  1 s of each other, the client's guards and partner exist at its reveal, a rejoin still works.
- Order: after S2 and after `feature/player-batch-j19` S3 (it adds `ff` to `lobby` / `start` and edits `session.ts`
  start handling, the exact path S5 holds): S5 cuts from the master that carries j19 S3 and adds no field to `lobby` or
  `start`. If j19 S3 slips past S2's merge by more than a day, S5 goes first and j19 S3 rebases (different messages;
  the train bumps `PROTOCOL_VERSION` once for both).
- Flag: `mapReady` (off: no `mr` / `go` sent, no hold snapshots).

**S6 The e2e proof (Sonnet 5.5 from an Opus brief).** "Nothing builds after ready", in the suites that own each
map's start: `e2e-sectorops` part 6 (campusOps, `scripts/e2e-sectorops.mjs:1946-1957`), `e2e-ctcourse` (ctcourse
solo and co-op, `:39`, `:305-309`), `e2e-lightbake` (warehouse at min / low / epic, `:18`). Each with `mapready=1`:
wait for `__mapReady.released`; stand still for 10 s of rendered frames; assert the after-window: 0 programs created,
0 frames tagged `shaders`, 0 landings and tile uploads, 0 pop-ins, `released` true. `capHit` false is asserted only on
the GPU runs (software GL may hit it; it then asserts the fallback kept the live section lit). Plus: campus
`bakeSource === 'shipped'` (S4); `e2e-lightbake` loads warehouse, quits to the menu and loads it again in the same
page: the second load compiles 0 programs during its gate and reuses every body texture (S9, S10); `e2e-ctcourse`
co-op: both lobby preloads report done before the host's Start (S11).
- Files: `scripts/e2e-sectorops.mjs`, `scripts/e2e-ctcourse.mjs`, `scripts/e2e-lightbake.mjs`. Est. lines: 450.
- Checks: those three suites on the laptop queue (`E2E_GPU=1`), solo reruns per `docs/systems/testing-tools.md`.
- Done looks like: the three suites green with the assertions; a deliberate late compile (a test-only material made
  after the release) fails them (shown once in the PR body).
- Order: after S5 and S11; after `feature/test-runner-j20` S6c (alive-at-start) and `feature/hud-guidance` A (one
  assert per suite) and `feature/sector-marks` B1 (`e2e-sectorops.mjs`) merge, or appended without editing their lines.
- Flag: the suites set `mapready=1` themselves.

**S7 Docs and the budget lines (Haiku 5.5; after Q1 and the after-S11 run).**
- Files: `docs/systems/performance.md` (line 81 only: "Loading: ... <= `WARMUP_MAX_MS`" becomes the line below; lines
  25-26 untouched, A14), `docs/systems/lighting.md` ("Per-section lamp bake": the shipped bake, the seed-free key, the
  wait-all rule), `docs/systems/testing-tools.md` (`__mapReady`, `?readyCap=`, the after-window, the prebake and its
  cache folder), `TESTING.md` (one checklist line), `changes/feature-map-ready.md` (`kind: minor`). Est. lines: 150.
- Checks: CI `check` (doc lint); the lead reads the performance.md diff against A2 / A12 / A14.
- Done looks like: performance.md line 81 is the proposed line with Q1's answer (or 45 s and "Q1 pending"), lines
  25-26 byte-identical to master; lighting.md names `scripts/prebake.mjs`, the manifest and the key rule;
  testing-tools.md lets a new agent read `__mapReady` without opening code.

Proposed performance.md line (numbers are starting values, G10; pending a PC run):
> - Map ready (map-ready; `?mapready=1` until switched on): the loading screen stays up until the map is built and
>   warmed (`game/mapGate.ts`: lamps, shaders for the settings in use, bodies, weapons, the probe, every Saltmarsh Park
>   section), at most `MAP_READY_CAP_MS` 45 s after the level is built (Q1); past it play starts with what is ready
>   (the live section's lamps always). After the reveal, standing still for 10 s: 0 shader programs created, 0 lamp
>   landings or atlas tile uploads, 0 body or weapon mesh swaps, frame p95 within the rendered-frame-interval line.
>   Co-op: play starts when every player is ready (15 s grace). Aim (Michael, 2026-10-25): a first-ever load takes
>   seconds (shaders compile per GPU), a repeat load is near-instant; the measured goals follow his review (Q31, Q2).

**S8 Shorten the wait: plan (Opus 5.5).** From S1's baseline and the after-S11 run: where the first-ever seconds
still go once fixes (1)-(4) are in, then a plan for the biggest cut. Candidates: fewer Epic body variants (the V12
body-shader slice: hand over if it has an owner, A13); character and live-section shaders first in the compile order;
`KHR_parallel_shader_compile` use; a warm scene in the lobby that compiles the match's character variants with the
match's defines (the step past S11's data preload, A19); Marlow Yard / warehouse bakes into the manifest (A17).
- Files: `docs/map-ready/SHORTEN.md` (new). Est. lines: 150 (doc).
- Checks: a fresh Opus plan checker reads SHORTEN.md against BRIEF (A12, A13) and the numbers; the lead accepts it.
- Done looks like: SHORTEN.md names the top 3 remaining costs in seconds from the laptop run, one chosen cut with its
  files, size (a build slice under 800 lines), model and checks, and what it hands to the V12 owner if one exists.
- Order: its plan after the after-S11 laptop run; its build slice joins this PLAN as S14 when accepted (S12 / S13 are
  Q3's).

**S9 Kept parts: model files and textures (Opus 5.5). Fix (4).** A `core/keptParts.ts` holder that lives on the
`App` (not on a match): (a) one parsed-file cache for every GLB the match reads: kit, props and campus art move from
fetch-per-load (`kit/kitRender.ts:68`, `props/propRender.ts:89`, `campusArt/campusArtRender.ts:132`) onto the
operator file cache (`operators/runtime/figure.ts:131-172` `loadModel`); (b) textures: `figure.ts` `texture()`
(`:226-240`) makes each image's URL a fresh blob URL (`:230`), so Babylon's engine texture cache (Babylon 9.29
`Texture` checks `_getFromCache(url)` first, `texture.pure.js:308`, `baseTexture.pure.js:580-597`) never hits across
scenes and every match transcodes the KTX2 again; S9 gives each image a stable key (`<file url>#img<i>`) and the holder
keeps one reference per kept texture across `app.releaseState`, so the next match's `Texture` gets the same internal
texture; (c) a budget: at most one match's set (A18; the player's and partner's play LODs, the loadouts' weapons, the
last map's guard kinds; never the hero), least-recently-used out, all dropped on `engine.onContextLostObservable` and
when the Textures setting changes; (d) counters for S1 (reused vs decoded). `core/app.ts` `releaseState` hands the
held set over instead of letting the scene's dispose free it (with `mapReady` on).
- Files: `src/core/keptParts.ts`, `src/core/app.ts`, `src/operators/runtime/figure.ts`, `src/world/kit/kitRender.ts`,
  `src/world/props/propRender.ts`, `src/world/campusArt/campusArtRender.ts`, `tests/keptParts.test.ts`. Est. lines:
  800.
- Checks: vitest `tests/keptParts.test.ts` (NullEngine: two create / release cycles, the second reuses every kept
  texture and fetches nothing; the budget drops the oldest; context loss drops all; flag off = today) plus the figure
  and campus-art tests that exist (`npx vitest run tests/operator* tests/campusArt*`), tsc; affected e2e plus
  `e2e-coop` + `e2e-netmove` (partner bodies) and `e2e-lightbake` with `mapready=1`.
- Done looks like: a second load of any map in the same page fetches no GLB and decodes no KTX2 for kept parts; the
  heap after 3 loads of campus is within 5% of after 1 (no old scene kept; measured on the laptop run).
- Order: parallel with S1 and S4 (disjoint files). Owns `core/app.ts` for this job; S10 follows it.
- Flag: `mapReady` (off: blob URLs and today's release).

**S10 Kept parts: compiled shaders (Opus 5.5; Opus checker). Fix (4).** Today `app.releaseState` empties the whole
compiled-shader cache (`core/app.ts:364-377`, `engine.releaseEffects()`), because a kept effect held its material and
so the old match (3.1.7). Its comment says the keys never repeat; in Babylon 9.29 they do: a plugin's main define is
per class name (`materialPluginManager.pure.js:43-44`) and the cache key is shader name + defines
(`thinEngine.pure.js:1683`), so the next match asks for the same keys (research row 14). With `mapReady` on,
`releaseState` instead: takes one reference on every ready effect in the budget (the next match's characters, guards,
weapons, post stack and level materials; at most `KEPT_EFFECTS` 400, least-recently-used out), strips what ties it to
the old scene (Babylon 9.29 `effect.pure.js:148-163`: `onCompiled`, `onError`, `_fallbacks`,
`_processCodeAfterIncludes`, `_processFinalCode`, and its observers), and releases the rest; on a GPU context loss it
drops every kept effect (a stripped effect cannot rebuild itself). A plugin audit first: every `getCustomCode`
(`world/bakedLamps.ts:1387+`, `world/surfacePlugin.ts`, `world/levelMaterialPlugin.ts`, `player/smoothBodyPlugin.ts`,
`operators/runtime/guardFigurePlugin.ts`, `cosmetics/patternPlugin.ts`) must depend only on its defines and module
constants, so an equal key always means equal code; any per-map value found moves into a define or a uniform in this
slice (the five plugin files are in the claims block for this; only those the audit finds are edited, listed in the
PR) or its material is kept out of the budget.
- Files: `src/core/app.ts`, `src/core/keptParts.ts`, `tests/pluginCode.test.ts` (two plugin instances made for two
  different maps give the same code for the same defines), `tests/keptParts.test.ts` (kept effects survive a release
  and are returned on the same key; no kept effect reaches its old material; context loss drops them). Plugin files
  (claimed) only if the audit finds a per-map value: `src/world/surfacePlugin.ts`, `src/world/levelMaterialPlugin.ts`,
  `src/player/smoothBodyPlugin.ts`, `src/operators/runtime/guardFigurePlugin.ts`, `src/cosmetics/patternPlugin.ts`
  (`world/bakedLamps.ts` is already claimed). Est. lines: 550 (+ up to ~20 a plugin).
- Checks: vitest `tests/pluginCode.test.ts tests/keptParts.test.ts`, tsc; affected e2e plus `e2e-lightbake` (repeat
  load in the page, S6's assert run by hand before S6 lands) and `e2e-desktop` (quality changes mid-match still apply).
- Done looks like: the second load of a map in the same page creates 0 new programs for kept materials (S1 counter);
  the heap after 3 loads stays within 5% of after 1; a quality preset change compiles its new variants as today.
- Order: after S9 (same files). Flag: `mapReady` (off: `releaseEffects()` as today).

**S11 Lobby preload (Opus 5.5; two independent Opus checkers, Guard AI reviews the `src/net` part). Fix (3).**
`game/preload.ts`: `preload(app, {map, mode, loadout})` starts, in this order, the shipped bake files (S4, decoded and
held under their key), the map's GLBs (through S9's file cache), the player's and partner's play LODs, the loadout's
weapons and the map's guard kinds (`guardKindsFor`, S3) with their textures made into kept parts (S9), the weapon
sound sprite and the first music cue (S3's promises); it reports progress 0-1, can be cancelled, and is joined by
`GameState.create` (the gate's steps then find their parts ready). Hooks: `main.ts` sets `app.preload` (flag on
only); solo, `BriefingScreen` calls it on open for its map (Sector Ops, Missions, Free Roam) and shows "Map loading
62%" / "Map ready" under Start; co-op, `coopUi.ts` calls it on every peer when the lobby's map or mode changes (the
`lobby` event, `coopUi.ts:88`, `:448`) and shows the same line in the lobby panel (local only, no wire, A19). A map
change cancels the old preload; leaving the lobby or briefing drops what the kept-parts budget does not keep.
- Files: `src/game/preload.ts`, `src/main.ts`, `src/ui/screens/briefingScreen.ts`, `src/net/coopUi.ts`,
  `src/world/shippedBake.ts` (the preloaded copy), `tests/preload.test.ts`. Est. lines: 750.
- Checks: vitest `tests/preload.test.ts` (order, cancel on map change, join by `create`, nothing preloaded with the
  flag off) plus `tests/net.test.ts`, tsc; the co-op group `e2e-coop` + `e2e-netmove` + `e2e-ctcourse` (coopUi), flag
  off and on; `e2e-sectorops` part 6 with `mapready=1` through the briefing.
- Done looks like: on the laptop, opening the campus briefing, waiting until "Map ready", then Start reveals in
  seconds on a first-ever load and near-instant on a repeat (the after-S11 run, A12); in co-op both lobby lines read
  "Map ready" before the host's Start and S5's handshake releases both together.
- Order: after S2 (`main.ts`), S3 (`guardKindsFor`, audio promises), S4 (`shippedBake.ts`), S9 (kept parts), and after
  `feature/player-batch-j19` S3 (its lobby rows, `coopUi.ts:518-526`) and `feature/sector-batch` PR A / PR B
  (`briefingScreen.ts` :57 / :60, `main.ts`; section 7). Then the after-S11 laptop alone run (same
  script as S1) feeds Q2 and S8.
- Flag: `mapReady` (off: no preload, no lobby line).

**S12 and S13: Michael's fixes (3) and (4) in full (only with Q3's second or third option; sketch, not briefed).**
Neither is built until Q3 picks it. When picked, the planner researches them (`research/one-scene.md`: every system
that holds a scene reference and its clean-up), writes them out in this section with files and checks, and a fresh
Opus plan checker passes them before any build.
- S12 One scene, only the level swapped (Opus 5.5; two independent Opus checkers, Guard AI reviews `src/ai` and
  `src/net`). The match scene lives on the `App` for the session; at a map change the level (`World`: voxel sections,
  kit / props / art meshes, Havok static bodies, nav grid, lamps, devices) is disposed and the next one built in the
  same scene; the player, partner, weapons, guard pool and post stack stay as objects and are reset (place, state,
  timers). Every match system gets a `reset()` and a leak test: after 3 swaps the heap is within 5% of after 1 and no
  object of an old level is reachable (the 3.1.7 guard). Likely files: `core/app.ts`, `game/gameState.ts`,
  `world/world.ts`, the guard director and pool, the device and pickup systems, `net/coopHost.ts`,
  `net/coopClient.ts`. Est. ~1,400 lines in two PRs (the reset hooks, then the swap). Flag: `mapReady`. Order: after
  S10 and S11 (it replaces S10's hand-over in `releaseState` for the swap path).
- S13 The level built in the lobby (Opus 5.5; two independent Opus checkers for its `coopUi.ts` part). With S12, the
  picked map's level is built into the kept scene, disabled, while the menu stage renders (solo: briefing open; co-op:
  every peer when the lobby names the map); a first-ever load also renders it once to a small hidden target so its
  shaders compile in the lobby. Never two levels at once: a map change disposes the half-built one. Est. ~700 lines.
  Order: after S12. Memory: the menu stage plus one level in the lobby, inside the unchanged memory target
  (FOLDED-PLAN Q4).
- With Q3's first option neither is built; they return only if the after-S11 run shows repeat loads above
  near-instant (Q2).

Order: W1 (now, disjoint files): S1, S4, S9. W2: S2 (after S1), S10 (after S9). W3: S3 (after S2), S5 (after S2 and
j19 S3). W4: S11 (after S2, S3, S4, S9, j19 S3). W5: S6 (after S5, S11), then the after-S11 laptop alone run, S8's
plan, Q2. S7 after Q1 and that run. S12 then S13 after S11, only if Q3 picks them. Parallel slices run in their own
worktrees (`feature/map-ready-s<k>`).

## 4. Flags (dark until accepted)
| Flag | Default | Owner | Switch-on date | Switches on when |
| --- | --- | --- | --- | --- |
| `mapReady` (`?mapready=1`) | off | Night Shift \| Sector Ops Build | after the Sector Ops and Marlow Yard walks land (both at cap), target 2026-11-01 | S2-S6 and S9-S11 passed (and S12 / S13 if Q3 adds them), Q1 and Q3 answered, Michael accepts the walk items below on campusOps (solo, co-op) and Marlow Yard (co-op) |

A16 (the seed-free bake key) is not behind the flag: same bytes, a cache bug fix.

## 5. Walk items
Sector Ops (campusOps):
- Main menu > Sector Ops > Saltmarsh Park, solo, first load after the update: the briefing shows "Map loading" then
  "Map ready"; after Start the loading bar walks its steps; when the map appears nothing changes on screen (no lights
  coming on, no textures swapping, Wren and the gun detailed, guards in place), no hitch in the first 10 s - accept
  when the first 10 s look finished and the wait felt like seconds, not tens of seconds.
- Quit to the menu and start Saltmarsh Park again (and then another map): accept when the map appears almost at once
  and still looks finished.
- Co-op > Sector Ops with a partner, one PC slower: the faster player waits on "Waiting for partner" - accept when
  play starts for both at once.
Marlow Yard (ctcourse):
- Co-op > Marlow Yard with a partner: wait in the lobby until both lines say "Map ready", then Start - both loading
  screens drop together almost at once; the partner and the first bay's guards are already there - accept when
  neither player sees anything arrive.

## 6. Risks and open questions
- A held sim under the old e2e helpers: suites step the sim as soon as `current.player` exists
  (`scripts/e2e-lib.mjs:223-236`). Mitigation: the flag is off by default; S2's `openPage` waits for `released` when
  `mapready=1`.
- Quality applied earlier: `applyQuality` then runs twice (before the warm-up and in `setTarget`); the second must be a
  no-op. Check: `e2e-lightbake` and `e2e-desktop` with the flag on and off (shader defines, 16-texture limit).
- `Scene.whenReadyAsync` before any render misses render targets and post effects; the `warm` step renders behind the
  boot screen and needs `shaderCount()` stable for 5 frames, so a late variant is caught before the reveal.
- Shipped bake size: 133 M cells for campus today (`docs/sector-redesign/checks/section-bake-build.md:62`), `vis` one
  byte a cell, so the raw bytes are large and the gzip ratio decides the 48 MB cap (A15). S4 measures before building
  the runtime part; over the cap it stops and re-plans.
- Prebake time on CI: about the desktop's S1 section (88.6 s single thread) per lamp or level change; the
  `actions/cache` key keeps other builds at zero. The laptop's e2e builds bake once per lamp change in each checkout.
- Prebake on local builds: it runs in every `npm run build`, flag on or off, so each worktree's first build after a
  lamp or level change spends ~90 s of all cores (vitest pool) on the desktop and the laptop. Against the desktop CPU
  target (RULES "Machines"): `node_modules/.cache/prebake` is per worktree, so parallel jobs each bake once per lamp
  change; S4 logs the desktop seconds and, if a busy desktop shows the cost, adds `PREBAKE=0` (skip; the build then
  has no shipped bake and the PC bakes as today) for non-release builds, noted in testing-tools.md by S7.
- Kept effects (S10) are the 3.1.7 leak's ground: a missed back-reference keeps a whole match alive. Mitigation: the
  heap check over 3 loads (S9, S10), the strip list from Babylon 9.29's own fields, and the flag.
- A cold campus bake on a dev build (no shipped files) may outlast the cap (S1 alone 22 s at 4 workers; a dead worker
  holds a job up to 80 s, `voxel/sectionJobs.ts:30-35`): the fallback is today's behaviour, and the cache makes the
  next load quick (A16).
- The host waiting on a slow client: bounded by the grace; a client that drops during the hold is removed from the
  wait by the existing leave path (`session.ts`); a rejoin never holds.
- `DIRECT_COVERS` has no campusOps entry (`scripts/e2e-affected.mjs:297-315`), so campus file changes do not reach
  `e2e-sectorops` by themselves; J20 T5 (`feature/test-runner-j20`) adds it. Until that merges the lead requests
  `e2e-sectorops` part 6 by hand on S2 / S4 / S11 PRs.
- Q1 (cap) is Michael's: until answered the build uses 45 s behind the dark flag (A2, logged overnight). Q2 (load
  numbers, the warehouse line) comes after the after-S11 run (A12, A14). Q3 (how far fixes (3) and (4) go): until
  answered S9-S11 build option 1 (A18, A19, logged as narrowing his pick); options 2 and 3 add S12 / S13 after S11,
  so no W1-W4 work is wasted either way.

## 7. Overlaps
`node scripts/claims-check.mjs --plan docs/map-ready/PLAN.md --name feature/map-ready` (2026-10-25 ~20:00, this
PLAN after plan check 2): 34 plans with claims, 33 overlaps across 13 jobs (sub-branches of one job counted once
below), exit 1 (overlaps listed, none a blocker). No other plan claims the new files of S4, S9, S10 or S11
(`lightBake.ts`, `shippedBake.ts`, `keptParts.ts`, `figure.ts`, kit / props / art renders, `preload.ts`,
`vite.config.ts`, the workflows, `pwa/*`, `lampJobs.ts`, the five S10 plugin files) except `coopUi.ts` (j19) and
`briefingScreen.ts` (sector-batch, below). S12 / S13 (Q3) are not claimed yet: their files join this block when they
are planned, with a new claims-check. Every overlap is a shared big file in other functions; whichever lands second
rebases on its branch.
- `feature/sector-batch` (Sector Ops, same lead, J18; PR A = B1-B3 on `feature/sector-batch`, PR B = B4 on
  `feature/sector-batch-out`): `gameState.ts` (B4: `returnOut?` in `NetHooks` after :229; S2's hooks go in
  `NetAttachment` :177), `main.ts` (B1: :164, :257 menu stars; S2: :412 boot fade, S11: `app.preload` hook),
  `flags.ts` (one line each), `ui/screens/briefingScreen.ts` (B1 :60, B4 :57: the briefing text lines in
  `briefBlock()`; S11 adds the "Map loading" / "Map ready" line under Start in `build()`), `coopHost.ts` (B4 :580,
  :1894-1921; S5 the start hold ~:1701), `coopClient.ts` (B4 :618; S5 `go` handling), `e2e-sectorops.mjs` (B1 :123,
  :151-153, :163; B4 a block after :983; S6 part 6 :1946-1957), `TESTING.md` (B1 :46-48, B4 after :51; S7 one line at
  the end of its list), `lighting.md` (B3 :23-24; S7 the "Per-section lamp bake" section). No shared line. Order: both
  sector-batch PRs land first (they start now and are small: ~465 and ~260 lines); S2, S5, S6, S7 and S11 cut from the
  master that carries them, or rebase if one slips (the second to land takes both edits in `briefingScreen.ts` and
  `main.ts`). Sector-batch's own PLAN section 7 already lists map-ready the same way.
- `feature/player-batch-j19` (Player): `gameState.ts`, `protocol.ts`, `coopHost.ts`, `coopClient.ts`, `session.ts`,
  `coopUi.ts`, `flags.ts`, `gameAudio.ts`; wire `cmove`, `revive`, `lobby`, `start`, `use`. Its S3 adds `ff` to
  `lobby` / `start` and the lobby rows (`coopUi.ts:518-526`). Order: S5 and S11 cut from the master after j19 S3 (S5
  section 3); S3 here and j19 S7 share `gameAudio.ts` in different functions.
- `feature/hud-guidance` (+ `-a1`, `-a2`, `-a3`; Sector Ops HUD): `gameState.ts`, `courseMode.ts`, `coopHost.ts`,
  `coopClient.ts`, `e2e-sectorops.mjs`, `e2e-ctcourse.mjs`, `testing-tools.md`, `TESTING.md`. A1 deletes `blips?()`
  from `NetAttachment` where S2 adds hooks; B1 adds the objective popup S2 defers to the release. Order: S2 section 3.
- `feature/coop-kit` (Player): `gameState.ts`, `flags.ts`, `protocol.ts`, `coopHost.ts`, `coopClient.ts`; wire
  `tmove`, `tstart`. Different messages; one train may carry several wire members and bumps `PROTOCOL_VERSION` once.
- `feature/guard-rules` (+ `-s1`, `-s2`; Guard AI): `flags.ts`, `coopHost.ts` (`start` deny ~:892),
  `e2e-sectorops.mjs`; map campusOps; wire `bark`, `td`. S5 holds the start around, not in, the deny; rebase.
- `feature/player-hygiene` (Player J6): `coopHost.ts`, `coopClient.ts`, `protocol.ts` (comments and allocations, no
  wire). Rebase.
- `feature/sector-marks` (Sector Ops, own job): `gameState.ts`, `coopClient.ts`, `e2e-sectorops.mjs`, `TESTING.md`;
  map campusOps. Same lead: B1 merges first, S2 / S6 rebase.
- `feature/char-shadow-meter` (Lighting): `bakedLamps.ts` (a GLSL import), `flags.ts`, `gameState.ts`, `lighting.md`,
  `testing-tools.md`. Its PLAN:205 already lists map-ready (no shared lines; flags one line each). S1 / S2 touch
  `bakedLamps.ts` counters only.
- `feature/light-realism` (+ `-l0`; Sector Ops lighting): `lighting.md`; maps campusOps, warehouse. Its campus lamp moves change
  the lamp key, so the prebake bakes again on its PR (A15: nothing to sync by hand); S7 edits only the "Per-section
  lamp bake" section of `lighting.md`.
- `feature/guard-ai-mission-hooks` (Guard AI): `flags.ts` (its own flag lines). One line each.
- `feature/test-runner-j20` (+ 14 slice branches; Test Runner): `e2e-sectorops.mjs`, `e2e-ctcourse.mjs`,
  `testing-tools.md`. S6 / S7 start after its S6c / PR-C merge or append without editing its lines.
- `feature/route-runs-2` (Marlow): `testing-tools.md` (one new section). S7 appends its own section.
- `flags.ts` and `gameState.ts` are on most plans: one new flag line; S1 / S2 keep their `gameState.ts` changes to
  `create`, `enter`, the update entry checks and new private members.
