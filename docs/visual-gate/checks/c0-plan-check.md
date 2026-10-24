# visual-gate - C0 plan check

Checker: fresh Opus 5.5, 2026-10-24. Read: agent-preamble.md, CLAUDE.md (Sessions, Test tiers, Hard rules), BRIEF.md,
PLAN.md, STATE.md in full; verified against the branch (f70a222a, base bd54dfcd) and origin/master (7ae1eda1, 4.97.0).
No e2e, build, GPU or vitest run.

## Verdict: FIX (2 must-fix, both plan-text corrections; no slice or group change needed)

## Must-fix

### M1. Pin order makes the torch rigs (F5 / F5b, P4 / P7) and meter = field unrunnable as written
PLAN.md section 3 "Pinning" lists `shotPin(true)` first and sets `torchOverride` (and reads the meter) after it. Both are
applied only by the fixed step:
- A torch is switched on, placed and given its wall-stopped reach in `EnemyManager.updateTorches`
  (`src/ai/enemyManager.ts:1452-1483`: `torchWanted` -> `reg.setOn`, `placeTorch`, `l.reach = this.beamReach(l)` round
  robin at 15 Hz per torch), called from the sim update (`:3501`). `torchOverride` only feeds `torchWanted`
  (`src/ai/enemy.ts:1870-1882`). With the sim pinned, flipping `torchOverride` changes nothing: torch-on and torch-off
  shots are identical, so `leak` is 0 on every build and F5 can never go red (P4 fails, P7 cannot show red). The LR16t
  fix itself (beam stops at the first wall) is the `reach` computed there.
- The meter (`g.lightLevel`) updates on sim time at `LIGHT.playerHz` (`src/game/gameState.ts:1636-1650`, `updateLight`);
  `scripts/shots-ctcourse.mjs:62-70` unfreezes and waits 0.3 s of sim time before reading it. Read after the pin, the
  meter is the previous view's value and "meter = field within 0.02" fails on most views.

Correction (PLAN section 3 Pinning, and VG2 / VG5 acceptance): per view and per rig state, in this order:
1. sim running: teleport, `team?.end?.(true)`, `vision.set('off')`, guards stubbed (`e.update = () => e.prevPos.copyFrom(e.pos)`)
   and parked, the rig guard placed, every `torchOverride = false` except the rig guard's (true for "on", false for "off");
2. run >= 0.3 s of sim time (`g.time` advance, wall cap as shots-ctcourse.mjs:66-67) so `updateTorches` has acquired,
   placed and ranged the torch (>= 1/15 s x torch slots) and the meter has sampled; assert the rig torch's
   `reg` state is on / off as asked;
3. read `meter` and `field` (`lightField.bodyLevel`);
4. then pin (sim stopped, flicker / sway set as P2 below), `photoFreeze(true)`, `photo-mode`, rigs hidden, camera, converge.
Torch on -> off is a full unpin, step 1-4 again, not a toggle under the pin.

### M2. Campus boots with no guard, so the `cp-door` rig has nobody to place
PLAN.md:15 / section 3 data format: campus query `autostart=campusOps&mode=sector&sectorGuards=0`. `sectorGuards` caps
the guards a section spawns (`src/core/flags.ts:49-50`, `src/game/modes/sectorMode.ts:701` `const n = flags.sectorGuards
?? s.guards.length`); 0 spawns none, so the rig step has no enemy to move and P4's campus half cannot run.
Correction: campus query `sectorGuards=1` (the guard is parked 40 m under the map for every non-rig view, as on the other
maps), or a rig-only `query` override per map in `viewpoints.mjs`; VG3's shape test asserts every rig map's query spawns
>= 1 guard (no `sectorGuards=0` on a rig map). Same check for Sector Ops (`sectorGuards=N`, N >= 1).

## Verified (holds as planned)
- Tags exist: v4.60.1 62d80c02, v4.61.0 af56ab43, v4.72.0 0dc25cca, v4.78.0 518c3fa1, v4.82.0 33fff449, v4.88.0 1b8361c5,
  v4.96.0 4c864861, v4.97.0 7ae1eda1; 4813dbf2 (F8 fix) is in v4.97.0; vol-cone-fix (F1) merged v4.60.1..v4.61.0
  (fc2e8bd3); LR16g 1e4623c7, lr16w-s1 501c808e, LR16-M, lr16pol-e (torch) all in v4.82.0..v4.88.0.
- `?falloff=photo` existed in the bad builds: `flags.photoLamps` at v4.78.0 `src/core/flags.ts:133`, v4.82.0 `:129`
  (through `lampMath.matchLampFalloff`, v4.82.0 `src/world/lampMath.ts:69-71`); gone (ignored) from v4.88.0, where
  photometric is the only model (v4.88.0 `lampMath.ts:4`). `?gfx=` and `?weather=` in every proof build.
- Old-build hooks: `photoCamera`, `photoFreeze`, `World.addLightProbe`, `Enemy.torchOverride`, `warehouseOps`,
  `sectorGuards`, `QualityManager` all present from v4.60.1; `campusOps` from v4.72.0; `setFlicker` only from v4.88.0
  (A14 already says so). `e2e-lib.mjs` `launch({ url, params, viewport })` has the same signature from v4.60.1 to master.
- `a3-lobby` vantage identical at v4.82.0, v4.88.0, branch and master (`ctcourseSets/a3OfficeRange.ts:370`). All 9 Marlow
  vantage names exist (`ctcourseSets/*.ts`); campus rows exist (`campus-art-shots.mjs:24-63`, query :22); Sector Ops /
  Warehouse rows exist (`sector-lights-shots.mjs:40-69`).
- A1 "flag, not block" holds: auto-train reads only the rollup entry named `check` (`scripts/auto-train.mjs:157-161`)
  and the `laptop-e2e` context (`:46`, `contextStatus` :239); `merge-train release` waits on Actions runs
  (`gh run list` / `gh run watch`, `scripts/merge-train.mjs:563-564`, :653) and merges with `--match-head-commit`
  (:605), not on commit statuses. A failed `visual-gate` status blocks nothing unless branch protection makes it
  required. Note: `finish()` posts `laptop-e2e` (`service.mjs:597-603`, :683) before the post-step, so the train usually
  releases before `visual-gate` lands; the status and comment then sit on a merged head (fine for A1 / A8).
- Train hook point: `runTrain` (`scripts/laptop-queue/service.mjs:618-692`); after `finish()` at :683 and before the
  `finally` (:686-691, which releases the locks and writes the done claim) the slot is still locked and built. Statuses
  via `postStatus` (:133-139), comments via `postComment` (:142-147, 60 000 cap); contexts `contextName` (`lib.mjs:25-36`).
- `run-e2e.mjs`: a named suite runs whatever list it is in (`expand(named)`, master `run-e2e.mjs:142`); `--list` with no
  flag is REQUIRED only, so adding `e2e-visual` to GPU never puts it into the train shards. Suite stdout lands in the
  slot log, so `visualVerdict(text)` can read the block.
- Bible L5 targets = `DARK_TARGETS` (`src/world/darkCurve.ts:86-91`), `bandOf` :126-128; design-bible.md:255-266.
- Hard rules: metrics / harness / store are scripts (no Babylon import, no game runtime network); baselines on an orphan
  data branch, only 320 px webp of flagged shots; no src look change. The only src change is VG2's hook (see P1).

## Polish (in priority order)
P1. **Drop the src hook.** The sim can already be pinned from the page in every proof build: `__app.loop.timeScale = 0`
  (or `loop.paused = true`) stops the fixed step and physics while `frameUpdate` still runs the photo path
  (`src/core/loop.ts:29-31`, :184-206; same lines at v4.60.1 and v4.82.0; `window.__app` = App, `app.loop`,
  `src/main.ts:90`, `src/core/app.ts:52`). Then VG2 is harness-only, the job has zero src diff, old builds and trains pin
  identically (no A14 two-path divergence), and the "initial" baseline taken on master (P6) matches later trains.
  If the hook stays: a boolean early-out in `fixedUpdate`, no allocation, not read by any gameplay code.
P2. **Freeze to a fixed state, not the current phase.** Before the pin set every `reg.flickering` light to 1 (as
  e2e-darkness.mjs:31-33) and pendant sway to rest; freezing whatever phase the clock stopped on makes a tube's drop-out
  or a pendant's swing a run-to-run difference VG7 would wrongly fold into tolerances.
P3. **Determinism list for VG2 / VG7** (beyond the plan's): TAAU keeps a per-frame Halton jitter under the pin
  (`src/vfx/taau.ts:22-23`, :133-173), so converge on a full-frame (or 4x-downsampled) measure, not e2e-darkness's centre
  10 x 10; film grain is off by default (`src/core/settings.ts:159` `filmGrain: false`; a fresh context has defaults:
  assert it); post / volumetric time uniforms do not advance in photo mode (`gameState.ts:2507-2520`: `post.update` is
  skipped, `stack.frame(0)`); no auto-exposure with night vision off (`nightExposure` / `nightAutoGain` are NV only);
  the lamp bake: on master `launch` waits for the whole section bake but swallows a timeout
  (`origin/master:scripts/e2e-lib.mjs:221-226`, `.catch(() => {})`), so the harness asserts
  `world.lightBake.sections` is absent or `done` before the first view.
P4. **Proof mechanics: one alone request per build**, `--sha <that build>`, not a checkout + `npm ci` inside steps.
  `prepare()` records the installed lockfile per slot (`service.mjs:528-535`, `npm-ci-<port>.lock.json`); a step-level
  checkout / `npm ci` leaves that record stale and a later request can skip a needed `npm ci`. Copy the gate in with
  `git archive origin/feature/visual-gate scripts/e2e-visual.mjs scripts/visual-gate | tar -x` as a step.
P5. **A7 fallback detail.** `QualityManager.setOverride` is ignored under `?gfx=` (graphics-quality.md:37-38), so the
  one-page preset switch must boot without `?gfx=` and set the override at once (the override also stops the adaptive
  governor, :55-57). Say so in A7 / PLAN section 7; otherwise the 180 s ladder is concrete enough.
P6. **Initial baseline vs the hook.** VG7 records on master with the A14 fallback pinning; trains after the merge pin
  through `shotPin`. Any difference flags the first train. Either P1, or accept the job's own first train run as
  "initial" instead of the master run.
P7. **Runtime arithmetic.** Per preset 26 views + 6 rig shots = 32; Epic adds 12 parity = 44 renders (the Epic browser
  is the long pole, not 38). Each rig state adds a 0.3 s sim settle (M1). shots-ctcourse waits a fixed 2.5 s per view
  (`shots-ctcourse.mjs:75`); if convergence needs that, Epic ~ 44 x 2.5 + 51 s boots x 1.2 ~ 195 s, so expect the first
  rung of the ladder. Each fresh context cold-bakes (IndexedDB lamp cache is per context, `src/voxel/lampJobs.ts:42-50`),
  and two browsers bake the same map at once on 24 laptop cores (pool hc - 4 each, `src/voxel/workerPool.ts`); campus full
  bake 25.8 s at 4 workers, 12.9 s at 8 (`docs/sector-redesign/checks/section-bake-build.md:65-69`). M0 must run on a
  build with train 65's section bake (master, via the A14 copy), not the branch base bd54dfcd, which loads campus slower.
P8. **Ownership in group B/C.** VG5 should own `scripts/visual-gate/harness.mjs` (VG2 is done by then) or it cannot add
  two browsers / rigs / parity there. VG5 runs before VG7 creates `tolerances.mjs`: VG1 exports the spec floors and VG5
  falls back to them when `tolerances.mjs` is absent.
P9. **VG6 details.** `e2e()` has a fixed env and `E2E_SUITE_TIMEOUT: '900'` (`service.mjs:543-552`): add an env /
  timeout argument for `VG_RECORD`, `VG_TRAIN` and 300 s. Release 4192 (and freePort it) before the post-step so the
  second slot is not held ~3 min; the 4189 lock stays.
P10. **Desktop / renderer guard.** The desktop worker takes pr requests (`service.mjs:8-16`), so
  `--suites e2e-visual --set visual` can run there on another renderer: every shot would be `new` and the status green.
  The suite should report "no baseline for renderer <r>" as an error status (or exit with a clear skip), never green.
P11. **Branch drift.** The branch base is behind master: master's `run-e2e.mjs` GPU list is at :42 (plan :37), and
  train 65 added `scripts/e2e-affected.mjs` (LIGHT / `lightSuites` :98, :208 list e2e-darkness). Consider adding
  `e2e-visual` there so `request.mjs --affected` picks it for light / render PRs (it is filtered outside `--gpu`).
P12. **Rig doors across builds.** VG3 should pick `so-door` / `cp-door` doors that exist unchanged at v4.82.0, v4.88.0 and
  master (campus art changed much after 4.82); cite the map file:line at each tag.
P13. **F6 bad look.** In v4.82.0 the default falloff was linear (`src/core/settings.ts:167` `lampFalloff: 'linear'`), the
  photometric look only through Settings or `?falloff=photo`. P3 should also run v4.82.0 at the default and record which
  look reads "dark", so the rule is not set on a look Michael may not have played.
P14. **Warehouse mode.** The copied Warehouse views come from `sector-lights-shots.mjs:34` (`mode=sandbox`); PLAN:15 says
  `mode=clear` (e2e-darkness). Pick one and note it in viewpoints.mjs (it can change lights and guards).
P15. **parityRange** interpolates min / max between the four L5 levels; the bible fixes only those four points and the
  band. Either check `bandOf(level)` against the band's display range and the table ranges near the four levels only, or
  log the interpolation as an A-entry.
P16. **Line refs** (fix in the next PLAN pass): e2e-darkness `launch` call :300 (plan :262), the photoFreeze / rigs-hidden
  block :309-317 (plan :269-277 is the thermal `place`), guard freeze :219-226, `torchOverride` `enemy.ts:1872-1882`.
  The slice table names this file `checks/C0.md`; the orchestrator asked for `checks/c0-plan-check.md`.
P17. **Thumb links**: keys contain `@` (`m-a3-lobby@low`); URL-encode it in the PR comment links.
