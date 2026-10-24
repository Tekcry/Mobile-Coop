# visual-gate - plan

Read BRIEF.md first (ask, limits, A1-A16). Order: this plan -> C0 one fresh Opus checker on the plan (done: FIX, fixed
in the C0 fix round, `checks/c0-plan-check.md`) -> group A in parallel (strict briefs `briefs/VG1.md`..`VG4.md`) ->
M0 timing -> group B in parallel -> group C (bootstrap, red / green proofs) -> VG8 calibration -> C1 checker -> PR.
Line refs are origin/master 92d0205d (4.97.1) unless a tag is named; the branch base bd54dfcd is older, so builders read
reused code with `git show origin/master:<file>`.

## 1. What exists to reuse (file:line, origin/master)
- Boot + pin + read pixels: `scripts/e2e-lib.mjs` `launch({ url, params, viewport })` (:87-101, returns
  `{ browser, ctx, page, errors }`; same signature from v4.60.1), waits for the match and the whole section bake but
  swallows a timeout (:220-224), `frames(page, n)` (:248). `scripts/e2e-darkness.mjs`: launch call :301, `photoFreeze(true)`
  + `body.photo-mode` + rigs hidden (:311-318), guards stubbed and parked (`e.update = () => e.prevPos.copyFrom(e.pos)`,
  :222-228 in `place` :213-234), flickering lights put at 1 for a sync search (:31-34), shut hinged door finder (:188-212),
  grey card `World.addLightProbe` + `photoCamera()` (`measure` :100-128), convergence (`scene.isReady()`, 30 frames, reads
  until 3 agree within 0.5%, max 8 s, :117-127), screenshot -> decode in page -> Rec. 709 luma (`readLuma` :130-145).
- Views: `scripts/shots-ctcourse.mjs` (Marlow `SHOT_VANTAGES` via the SSR loader :21-22; per view: unfreeze, teleport,
  0.3 s of sim time with a 20 s wall cap, meter vs `lightField.bodyLevel(feet, 1.7)` within 0.02, then freeze, :58-75),
  `scripts/campus-art-shots.mjs` (35 views :36-77, query :31, vision off :176; "the whole campus is built at once" :30),
  `scripts/sector-lights-shots.mjs` (Sector Ops, Marlow and Warehouse rows :40-70, map queries :33-35),
  `scripts/lamps-shots.mjs` (:15, :18-27).
- Map queries (gate): Marlow `autostart=ctcourse&mode=course`; campus `autostart=campusOps&mode=sector&sectorGuards=1`
  (C0 M2); Sector Ops `autostart=warehouseOps&mode=sector&sectorGuards=4`; Warehouse `autostart=warehouse&mode=clear`
  (A16). `?gfx=` pins the governor off (graphics-quality.md:37-38, :55-57); `?weather=clear` (src/core/flags.ts:116).
  `sectorGuards` caps guards per section (flags.ts:49-50, :128; sectorMode.ts:704): 0 spawns none.
- Sim pin (C0 P1): `GameLoop.timeScale` (src/core/loop.ts:31) scales the time fed to the accumulator (:184); at 0 no
  fixed step runs (:188-206) and `frameUpdate` gets dt 0 (:214), whose photo path still renders the free camera
  (src/game/gameState.ts:2516-2530). `window.__app` (src/main.ts:90), `app.loop` (src/core/app.ts:52). NOT `loop.paused`:
  `beforeFrame` overwrites it every frame (`this.loop.paused = !s.simulating`, app.ts:413). Writers of `timeScale` that
  could undo the pin: `slowBeat` (gameState.ts:3217, restore :3304, only after a kill) and state dispose (:1202).
  Same lines at v4.60.1, v4.82.0, v4.88.0 (loop.ts:31, :184, :214).
- What the fixed step runs (stopped by the pin): `fixedUpdate` (gameState.ts:1820, clock `this.time += dt` :1833),
  `updateLight` (:1648; `reg.tickFlicker` :1652, `reg.tickSway` :1654, meter at `LIGHT.playerHz`), the enemy manager
  (guards, doors pushed open by a live guard within `DOOR.enemyReach` 1.0 m of a shut door: enemyManager.ts:3484-3491,
  doors.ts:45, :396-401; torches `updateTorches` :1452-1483 called at :3501).
- Lights: `LightDef.flicker` (src/world/lights.ts:54), `swx / swy / swz` (:59-61), `flickerVersion` (:170),
  `swayVersion` (:174), `flickering` (:246), `setFlicker` (:257), `tickFlicker` (:278), `tickSway` (:303). Sway moves only
  on kicks (rounds, blasts, head bumps; src/world/lampSway.ts:1-16).
- Torches: `Enemy.torchOverride` (src/ai/enemy.ts:1882) feeds `torchWanted` (:1870-1878); `placeTorch` from `e.yaw`
  (:1885-1887, yaw :270; src/world/torches.ts:44); `EnemyManager.hasTorch(e)` (:1507-1510, also v4.60.1 :365).
- Parity targets: `src/world/darkCurve.ts:86-91` DARK_TARGETS, `bandOf` :126-128 (LIGHT.shadow 0.28, LIGHT.lit 0.6:
  lights.ts:89, :91; bible L5 design-bible.md:255-266).
- Determinism (C0 P3): TAAU jitters every frame (Halton, src/vfx/taau.ts:22-23, :93-94) even when pinned; film grain off by
  default (src/core/settings.ts:159); post time uniforms do not advance in photo mode (gameState.ts:2516-2530).
- Train runs: `scripts/laptop-queue/service.mjs` `runTrain` (:669-769; `finish()` call :759, `finally` :761), `e2e()`
  (:580, fixed env with `E2E_SUITE_TIMEOUT: '900'` :582), `postStatus` :152, `postComment` :161, alone steps (:844-881:
  one shell line per step, `E2E_PORT` = the slot, `E2E_GPU=1`; `prepare` cleans the worktree, so a step must not rely on
  files an earlier step left, :61-63), `prepare` lockfile record (:556, :568-573); contexts `contextName` (lib.mjs:31).
  Suite lists: `scripts/run-e2e.mjs:42` (GPU = e2e-darkness, e2e-desktop:3, e2e-coop-gpu).
  `scripts/laptop-queue/serve.mjs` serves dist on `E2E_PORT` and runs one script (:1-3).
- Data-branch writes with git plumbing (temp index, orphan the first time): `scripts/laptop-queue/request.mjs:88-98`
  (`buildCommit`), push with 5 retries :100-117.
- Unit tests of `.mjs` scripts: `tests/<name>.test.ts`, node env (vitest.config.ts), import
  `../scripts/<file>.mjs` under `// @ts-expect-error plain .mjs process script without types` (tests/autoTrain.test.ts:1-8,
  tests/heavyLock.test.ts:5-8). eslint ignores `scripts/**/*.mjs` (eslint.config.js:6); tests are linted.
- Timings known: e2e-darkness whole suite 11-12 s on the laptop GPU (docs/vol-cone-fix/NOTE.md:37). Campus full bake
  25.8 s at 4 workers, 12.9 s at 8 (docs/sector-redesign/checks/section-bake-build.md:65-69); the IndexedDB lamp cache is
  per browser context (src/voxel/lampJobs.ts:42-50), so every fresh context cold-bakes.

## 2. Targets: metric that catches each, bad vs fixed build
| # | View(s) | Preset | Metric (region) | Rule idea | Bad -> fixed (proof slice) |
| --- | --- | --- | --- | --- | --- |
| F1 strip fog cones | so-s1-goods-in, so-s1-girder | Epic | haze: `veil` up, `contrast` down (upper) | veil <= X, contrast >= Y | v4.60.1 -> v4.61.0 (P6) |
| F2 bay floor black | so-s1-goods-in | Epic, Low | nearBlack (floor) | floor nearBlack <= X | v4.72.0 -> v4.88.0 (P6) |
| F4 hard arcs | so-s1-workshop | Epic | arc (wall) | arc <= X | v4.78.0 `falloff=photo` -> v4.88.0 (P5) |
| F5 torch through door | rig so-door, rig cp-door | Low, Epic | leak = on - off (door + wall quad) | leak.mean <= 0.004, p95 <= 0.02 | v4.82.0 -> v4.88.0 (P4) |
| F5b haze wedge | rig so-corner | Epic | leak (camera-side wall by the corner) | as F5; `known` until fixed | master stays red (P7) |
| F6 Marlow dark | m-* (9 views) + parity | Epic, Low | whole mean, nearBlack; field at readers | mean >= X, nearBlack <= Y per view | v4.82.0 `falloff=photo` and default -> v4.88.0 (P3) |
| F7 Low blotch | m-a3-lobby (north wall x 81-96, y 1.8-2.9) | Low | blotch (wall), arc (wall) | blotch <= X | v4.82.0 `falloff=photo&gfx=low` -> v4.88.0 (P2) |
| F8 campus fog | cp-s2-b, cp-s3-a, cp-s2-d | Epic | haze (upper) | veil <= X, contrast >= Y | v4.96.0 -> v4.97.0 (P1) |
X / Y are set in VG8 from the proof numbers: threshold at the geometric midpoint of bad and fixed, and >= 4 sigma
(VG7) from the fixed value; if the gap is under 4 sigma the metric is wrong for that target: VG8 reports it, no rule.
Sources: WALK-4.72-REPORT.md:30,33; WALK-4.82-REPORT.md:5,12; MORNING-WALK.md:37-39 (all on feature/menu);
docs/sector-redesign/checks/fog-triage.md; lr16-8-triage.md:65-87 (feature/sector-redesign-polish).

## 3. Viewpoints (A4; literal data in `scripts/visual-gate/viewpoints.mjs`, VG3)
- Marlow Yard (9, from SHOT_VANTAGES): m-a1-lounge (a1-lounge-door), m-a2-vantage, m-a3-lobby (F7), m-a4-aisle
  (a4-main-aisle-east), m-a5-kiosk, m-a6-kerb, m-a7-corridor, m-a8-vestibule, m-f-gallery (f-gallery-from-a1).
- Campus S1-S5 (10, from campus-art-shots ROWS :36-77): cp-s1-b, cp-s1-f, cp-s2-b (F8), cp-s2-d (F8), cp-s3-a (F8),
  cp-s3-c, cp-s4-a, cp-s4-e, cp-s5-a, cp-s5-d.
- Sector Ops / warehouseOps (5, from sector-lights-shots ROWS :40-70): so-s1-goods-in (F1, F2), so-s1-girder (F1),
  so-s1-workshop (F4), so-s2-aisle, so-s3-hall.
- Warehouse (2, sector-lights-shots): wh-floods-dock, wh-flood-workshop.
- Torch rigs (2 shots each: torch on, torch off): so-door and cp-door (a guard 1.2 m behind a shut hinged door facing
  it, camera 2.2 m on the near side; F5; the e2e-darkness door rule :188-212), so-corner (a guard down a side corridor,
  the beam along it; camera on the main corridor facing the corner wall; F5b, `known`). The rig doors exist unchanged at
  v4.82.0, v4.88.0 and master, each cited at each tag (C0 P12).
- Parity cards: 3 card points per map (12 in all), on views, Epic only.
- Count per preset: 26 views + 3 rigs x 2 states = 32 renders; Epic adds 12 parity cards = 44 (the long pole); 76 in all.
- Exact types (View, Rig, MapCfg, Rule): `briefs/VG3.md` "Contract" is the single definition; VG2 and VG5 code to it.
  Image / mask / Stats / Flag types: `briefs/VG1.md` "Contract". Capture / Settle / Projection types:
  `briefs/VG2.md` "Contract".

### Pinning order (A6, C0 M1; harness `scripts/visual-gate/harness.mjs`, VG2)
Per view, and per rig state, in this order:
1. **Sim running** (`__app.loop.timeScale = 1`, `photoFreeze(false)`, `photo-mode` off): `team?.end?.(true)`, teleport the
   player to `feet`, `vision.set('off')`; every alive guard (each view: a section change can spawn new ones) stubbed
   (`e.update = () => e.prevPos.copyFrom(e.pos)`) and parked 40 m under the map, except a rig's guard, placed at
   `guard.pos` with `e.yaw = guard.yaw`; every `torchOverride = false` except the rig guard's (true for "on", false for
   "off").
2. **Settle** >= 0.3 s of sim time (`g.time` advance) and >= (torch count + 1) fixed steps, wall cap 20 s
   (shots-ctcourse.mjs:63-70), so `updateTorches` has acquired, placed and ranged the torch and the meter has sampled.
   Assert: the rig guard's `hasTorch` equals the asked state; no other guard holds a torch; a rig door is still shut
   (`target === 0 && open === 0` on the door nearest `door.at`); `loop.timeScale` is still 1.
3. **Read** `meter = g.lightLevel` and `field = g.world.lightField.bodyLevel(feet, 1.7)` (the same instant).
4. **Pin**, in ONE synchronous page evaluate: `__app.loop.timeScale = 0`; every `reg.flickering` light's `flicker = 1`
   and `reg.flickerVersion++` (C0 P2; `?.`: none before v4.88.0); every light's `swx = swy = swz = 0` and
   `reg.swayVersion++` when `reg.sway` (pendants at rest; record `swayed: true` when any was non-zero); then
   `photoFreeze(true)`, `photo-mode` on, player and guard rigs hidden. Then the photo camera at `cam` looking at `target`,
   wait `scene.isReady()`, converge (full-frame 16 x 9 grid of cell means, not a centre patch: TAAU jitter, C0 P3), capture.
   After converge assert `loop.timeScale === 0` (a `slowBeat` restore would have unpinned).
Torch on -> off is a full unpin and steps 1-4 again, never a toggle under the pin. Before the first view of a boot the
harness asserts the section bake is done (`world.lightBake.sections` absent or `done`, C0 P3) and records the renderer
(`__app.engine.getGlInfo().renderer`).

## 4. Metrics (VG1; `scripts/visual-gate/metrics.mjs`, plain ESM, no Babylon, no DOM)
Input: `{ w, h, luma: Uint8Array }` (Rec. 709 Y' of sRGB bytes) and a `Uint8Array` mask (0/1). Exact API and types:
`briefs/VG1.md`.
- `lumaFromRgba`, `maskFromPolygon` (scanline fill; off-screen points clipped), `erode`, `fullMask`.
- `stats`: n, mean, p5, p50, p95, `nearBlack` = share <= 0.04 (bible L5 dark target; 10/255), 32-bin hist.
- `emd`: 1-D earth mover's distance on normalised histograms (0..1).
- `haze`: `veil` = p5 (lifted blacks), `contrast` = mean |Laplacian| of a 3 px box blur / (mean + 0.03).
- `blotch`: std of (box blur r 3 - box blur r 24) over the mask eroded by 24 px, / (mean + 0.03).
- `arc`: Sobel magnitude of a 2 px blur; share of mask pixels whose gradient > max(6/255, 4 x the mask's median gradient)
  and that sit in a run of >= 12 such pixels along the gradient's normal (a ridge, not noise).
- `leak(on, off, mask)`: per pixel max(0, on - off); mean and p95.
- `parityRange(level)` per A15 (no interpolation); a test asserts the mirror equals `src/world/darkCurve.ts` DARK_TARGETS.
- `measure`, `compare(key, base, cur, tol)`, `checkRules(key, item, cur, preset)`; `FLOORS` exported (C0 P8: VG5 uses them until
  VG7's `tolerances.mjs` exists).
Spec tolerance floors (A13; final = max(floor, 4 x spread)): whole / region mean |d| >= 0.03 and >= 20% relative;
nearBlack |d| >= 0.08; emd >= 0.03; veil |d| >= 0.02; contrast drop >= 25%; blotch x1.4 and +0.02; arc x1.5 and
+0.01; leak absolute rules only; parity: any non-skipped card outside its range.

## 5. Baselines (VG4; data branch `visual-baselines`, orphan, written with git plumbing like request.mjs:88-117)
- `runs/<sha>/result.json`: RunRecord (`briefs/VG4.md`). Written by train runs (`--record`), never by PR runs.
- `runs/<sha>/thumbs/<key>.webp` (320 px): flagged shots and the matching baseline shot only (A11). All thumbs of every
  run stay in laptop scratch `C:/NightShift/scratch/visual-gate/<sha>/` (pruned after 60 days).
- `accepted/<version>-<sha8>.json`: { sha, version, by, why, at, only: null | [keys] }.
- `storeLib.pickBaseline(records, { isAncestor, renderer, version })` (pure, A8). No baseline -> the shot reports `new`.
- CLI `node scripts/visual-gate/baseline.mjs list | show <sha> | accept --sha <sha> --by <name> --why <text> [--only k,k]
  [--dry-run]` (A9). `accept` refuses a run that is not recorded or an empty `--why`.
- First baseline: VG7 records master and the orchestrator accepts it as "initial" (F5b known). Trains pin the same way
  (A14), so the first train compares like with like (C0 P6).

## 6. Train wiring (VG6)
- Suite `e2e-visual` (`scripts/e2e-visual.mjs`) joins the GPU list in `scripts/run-e2e.mjs:42`, so `npm run e2e:gpu`
  and `request.mjs --sha <head> --suites e2e-visual --set visual` work for any PR that touches rendering
  (status `laptop-e2e/visual`).
- `runTrain` (laptop worker only; the desktop skips with status "skipped: desktop"), after the `finish()` call (:759),
  inside the `try` before `finally` (:761): if the train head has `scripts/e2e-visual.mjs`, release and free 4192 first
  (C0 P9), then run it on `ports[0]` (4189, `E2E_GPU=1`, `VG_RECORD=1`, `VG_TRAIN=<n>`, timeout 300 s) through `e2e()`
  extended with an env / timeout argument (its env is fixed today, :582). The suite prints one block between
  `VISUAL-GATE BEGIN` / `VISUAL-GATE END` (markdown: verdict line, baseline version and approver, flags table key |
  metric | base | now | tol, KNOWN lines, parity misses, wall time). Pure `visualVerdict(text)` in lib.mjs reads it ->
  status context `visual-gate`: success "clean: 64 shots vs 4.97.0, 152 s", failure "3 flags: m-a3-lobby@low blotch
  ...", error "no result / over 300 s / no baseline for renderer <r>" (C0 P10); on failure a PR comment with the block
  (capTail 8000) and thumb links with the key URL-encoded (`@` -> `%40`, C0 P17):
  `https://github.com/Tekcry/Mobile-Coop/blob/visual-baselines/runs/<sha>/thumbs/<encoded key>.webp`.
- auto-train ignores `visual-gate` (A1). The orchestrator's cron reads it; a flag goes to the job that owns the change
  (fix) or to Michael / the orchestrator (accept, A9).
- Deploy: the service runs from the laptop's own checkout; after the merge Test Runner restarts
  `NightShift-laptop-queue` (docs/laptop-queue).

## 7. Runtime budget (ESTIMATED, M0 replaces it)
Two browsers (Low | Epic) at once (A7). The Epic browser is the long pole (C0 P7): 4 boots with a cold lamp bake each
(Warehouse ~6 s, Sector Ops ~10, Marlow ~15, campus ~20-30 with two contexts baking at once) ~55-60 s; 44 renders x
(settle 0.3 s sim + converge 1.5-2.5 s) ~80-120 s; GPU sharing x1.2 -> ~160-215 s; serve + metrics + record ~10 s.
**~170-225 s per train (estimate): expect to need the ladder.** If M0 is over 180 s, in order: drop to 1 parity card
per map (-8 Epic renders); trim campus to 1 view per section (-5 per preset); only if M0 shows boots dominate, A7's
one-page preset switch (boots without `?gfx=`, A7). M0 runs on a build with train 65's section bake (master, the gate
copied in), never the branch base (C0 P7).

M0 (after group A merges into feature/visual-gate; the LEAD sends it, VG2 writes the command): one alone request on the
master sha, one step (prepare cleans the worktree between steps, service.mjs:61-63):
`node scripts/laptop-queue/request.mjs --sha <origin/master sha> --alone --set visual-m0 --requester "Night Shift | Sector Ops Build" --note "visual-gate M0" --step "git fetch -q origin feature/visual-gate && git archive FETCH_HEAD scripts/e2e-visual.mjs scripts/visual-gate | tar -xf - && node scripts/laptop-queue/serve.mjs scripts/e2e-visual.mjs http://127.0.0.1:4189/ --time --json C:/NightShift/scratch/visual-gate/m0/m0.json"`.
The lead writes `docs/visual-gate/M0.md` from Test Runner's reply (step log / JSON).

## 8. Slices

### Parallel safety (slice -> files it alone may create or edit)
| Slice | Group | Files | Branch |
| --- | --- | --- | --- |
| VG1 metrics | A | `scripts/visual-gate/metrics.mjs`, `tests/visualGateMetrics.test.ts`, `docs/visual-gate/checks/vg1-build.md` | feature/visual-gate-vg1 |
| VG2 harness + M0 command | A | `scripts/visual-gate/harness.mjs`, `scripts/e2e-visual.mjs` (skeleton, `--time`), `tests/visualGateHarness.test.ts`, `docs/visual-gate/checks/vg2-build.md` | feature/visual-gate-vg2 |
| VG3 viewpoints | A | `scripts/visual-gate/viewpoints.mjs`, `tests/visualGateViewpoints.test.ts`, `docs/visual-gate/checks/vg3-build.md` | feature/visual-gate-vg3 |
| VG4 store + CLI | A | `scripts/visual-gate/storeLib.mjs`, `scripts/visual-gate/store.mjs`, `scripts/visual-gate/baseline.mjs`, `tests/visualGateStore.test.ts`, `docs/visual-gate/checks/vg4-build.md` | feature/visual-gate-vg4 |
| VG5 gate runner | B | `scripts/e2e-visual.mjs`, `scripts/visual-gate/harness.mjs` (C0 P8), `scripts/run-e2e.mjs` (GPU list line :42), `docs/systems/testing-tools.md` (one entry) | later brief |
| VG6 train wiring | B | `scripts/laptop-queue/service.mjs`, `scripts/laptop-queue/lib.mjs`, `tests/laptop-queue.test.ts`, `docs/systems/auto-train.md`, `docs/laptop-queue/` note | later brief |
| VG7, P1-P7, VG8, C1, VG9 | C-E | as the slice table below | later briefs |
No src/ file in any slice. No file in two group A rows. Each group A branch is cut from the pushed feature/visual-gate
head; the lead merges all four back (disjoint files, no conflicts) and commits; builders never commit.

Owner model: Opus = metrics, harness, gate runner, train wiring, calibration, checkers; Sonnet = data, store tooling,
runs from strict briefs; Haiku = chores. Every slice: the preamble (`docs/systems/agent-preamble.md`), branch guard,
owned files only, single vitest files (`npx vitest run <file> --maxWorkers=2`) + `npm run typecheck:fast`; no e2e, no
GPU, no `npm run check`; GPU / timing runs only through the laptop queue, requested by the LEAD.

| Slice | Model | Group | Owns (only these files) | Acceptance |
| --- | --- | --- | --- | --- |
| C0 plan check | Opus (fresh) | 0 | `docs/visual-gate/checks/c0-plan-check.md` | done: FIX; fix round applied |
| VG1 metrics | Opus | A | see 8 table | `briefs/VG1.md`: section 4 API; all synthetic tests pass; no Babylon / DOM import |
| VG2 harness + M0 | Opus | A | see 8 table (harness-only, zero src diff, C0 P1) | `briefs/VG2.md`: the section 3 pinning order (C0 M1) through `loop.timeScale`; flicker 1 and sway at rest at the pin; asserts torch / door / bake / timeScale; full-frame convergence; skeleton `--time` prints boot / settle / converge / capture ms per map and preset; M0 request command in the report; `docs/visual-gate/M0.md` written by the lead after the run |
| VG3 viewpoints | Sonnet | A | see 8 table | `briefs/VG3.md`: section 3 list and Contract; coords copied from origin/master with source file:line; regions as world quads; rigs at a real shut door / corner unchanged at v4.82.0, v4.88.0, master (each cited); campus `sectorGuards=1`; shape test incl. every rig map's query spawns >= 1 guard (C0 M2) |
| VG4 store + baseline CLI | Sonnet | A | see 8 table | `briefs/VG4.md`: section 5; pickBaseline tests (accepted vs green, ancestor, renderer, `only`, no baseline); temp-repo write test; `--dry-run` prints the commit, pushes nothing |
| VG5 gate runner | Opus | B (after A + M0) | see 8 table | views x presets in 2 browsers, rigs, parity grid (A15) + meter = field (0.02), rules, compare vs baseline (FLOORS until tolerances.mjs exists, C0 P8), report block, `VG_RECORD`, `--only`, `--extra <params>` (proof flags), `--url` or self-serve dist; renderer with no baseline -> error, never green (C0 P10); exit 1 on flags; laptop run on master green or flags explained; <= 180 s |
| VG6 train wiring | Opus | B (parallel to VG5) | see 8 table | `visualVerdict` tests on sample blocks (clean, flagged, KNOWN only, missing, over time, no-baseline renderer); runTrain post-step behind "head has the script", 4192 released first, `e2e()` env / timeout argument (C0 P9); thumb keys URL-encoded (C0 P17); desktop skip; dry run of the service passes |
| VG7 noise + bootstrap | Sonnet | C | `scripts/visual-gate/tolerances.mjs`, `docs/visual-gate/VG7.md` | 3 laptop runs on master; per key and metric spread; tolerances = max(floor, 4 x spread); record run; orchestrator accepts "initial" |
| P1 F8 campus fog | Sonnet | C (parallel) | `docs/visual-gate/proofs/P1.md` | gate `--only cp-s2-b,cp-s2-d,cp-s3-a` at v4.96.0 and v4.97.0: numbers table |
| P2 F7 Low blotch | Sonnet | C | `proofs/P2.md` | `--only m-a3-lobby --extra falloff=photo` at v4.82.0 (Low) vs v4.88.0 |
| P3 F6 Marlow dark | Sonnet | C | `proofs/P3.md` | Marlow views + parity at v4.82.0 `falloff=photo` AND v4.82.0 default (linear, settings.ts:167 at that tag; C0 P13) vs v4.88.0; which look reads dark is recorded (coords checked on 4.82; overrides noted) |
| P4 F5 torch leak | Sonnet | C | `proofs/P4.md` | rigs so-door, cp-door at v4.82.0 vs v4.88.0, Low and Epic |
| P5 F4 arcs | Sonnet | C | `proofs/P5.md` | so-s1-workshop at v4.78.0 `falloff=photo` vs v4.88.0 |
| P6 F1 / F2 | Sonnet | C | `proofs/P6.md` | so-s1-goods-in, so-s1-girder at v4.60.1 vs v4.61.0 (F1) and v4.72.0 vs v4.88.0 (F2) |
| P7 F5b | Sonnet | C | `proofs/P7.md` | rig so-corner on master: red, kept `known` |
| VG8 calibrate rules | Opus | D (after C) | `scripts/visual-gate/viewpoints.mjs` (`rules`, `known` only), `docs/visual-gate/RULES.md` | each rule's threshold with its bad / fixed / sigma numbers; one laptop request reruns all pairs: every Fn red on bad, green on fixed |
| C1 checker | Opus (fresh) | E | `docs/visual-gate/checks/c1-check.md` | reads the diff and the proof table; PASS / one fix round |
| VG9 chores | Haiku | E | `changes/feature-visual-gate.md`, `TESTING.md` line, docs index line in CLAUDE.md "Doc index" if one exists for jobs | fragment + lines only |

Parallel safety later: VG5 and VG6 disjoint; P1-P7 only write their own proof docs and run on the laptop queue (one
alone request per build; they queue serially there, so start them together); VG8 is the only later writer of
viewpoints.mjs. The lead commits; agents never commit.
Proof mechanics (P1-P7, C0 P4): one `request.mjs --alone --sha <that build>` per build (the service's own `prepare`
does checkout, `npm ci` when the lockfile differs, and the build, keeping its per-slot lockfile record right), with ONE
step that copies the gate in and runs it (steps must not rely on files an earlier step left):
`git fetch -q origin feature/visual-gate && git archive FETCH_HEAD scripts/e2e-visual.mjs scripts/visual-gate | tar -xf - && node scripts/laptop-queue/serve.mjs scripts/e2e-visual.mjs http://127.0.0.1:4189/ --only ... --extra ... --no-record --json C:/NightShift/scratch/visual-gate/proofs/<Pn>-<tag>.json`.

## 9. Questions for Michael (ask later, native multiple choice; defaults stand meanwhile)
1. When the picture check flags a train: release anyway and report (A1, default), or hold the release until fixed or
   accepted?
2. Who may accept a deliberate look change: the orchestrator when the job's brief names the look change (A9, default),
   or only you?
3. Presets: Low and Epic only (default), or add Medium (where volumetric haze and torch shadows first change)?

## 10. Held polish (C0 items not adopted now)
- C0 P11 second half: add `e2e-visual` to `scripts/e2e-affected.mjs` `lightSuites` (:98) / `LIGHT` (:208) so
  `request.mjs --affected` picks it for light / render PRs. Held: it changes every light PR's laptop load (~3 min GPU
  each) and `tests/e2eAffected.test.ts` lists; decide after VG5's real runtime and ~10 clean trains (with A1's undo).
  The line-ref half (GPU list at run-e2e.mjs:42) is adopted above.
