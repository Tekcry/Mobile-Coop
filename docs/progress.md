# Silent But Deadly - progress

The single place that says where the project stands. Design authority: `docs/design-bible.md`. Updated at the end of
every phase step.

## Status
| Phase | Name | Status | Version | Spec file |
| --- | --- | --- | --- | --- |
| 0 | Foundation | in progress | 3.5.0 | `docs/prompts/phase-0-foundation.md` |
| 1 | Light parity | not started | 3.6.0 | (to be written by Opus) |
| 2 | Sound | not started | 3.7.0 | (to be written) |
| 3 | Pure CT conversion | not started | 3.8.0 | (to be written) |
| 4 | Mission framework | not started | 3.9.0 | (to be written) |
| 5 | Co-op 2-4 | not started | 3.10.0 | (to be written) |
| 6 | CT verbs for the slice | not started | 3.11.0 | (to be written) |
| 7 | Vertical slice (Kestrel Exchange, "Dead Line") | not started | 3.12.0 | `docs/prompts/exchange-alignment.md` first, then the map's phases 3-6 |

## Current state
- `master`, `dev` and `ct-movement` are integrated at 3.4.0 + CT movement: `master` (3.4.0) is merged into
  `ct-movement`; Michael promotes `ct-movement` to `dev` and `master`.
- Phones draw the phone look: the 3.4 light renderer (plain blockout, nearest six lamps as plain lights, no shadow
  maps, no post stack). Desktop renders lamps from the baked visibility atlas (`voxel/lampBake.ts`, `world/bakedLamps.ts`).
- Three separate light calculations can disagree (bible 5.1): desktop baked lamps, the phone's six unshadowed lights
  (lamps light through walls), and gameplay's analytic `LightRegistry` + one ray per light (`GameState.updateLight`).
  Roadmap Phase 1 replaces them with one source of truth.
- CT movement is complete (`docs/ct-movement-progress.md`): speed gears, instant stop, roll, split / wall jump, pipes,
  rappel, fences, CT takedowns and the grab, co-op team moves, the Warehouse CT routes.
- Kestrel Exchange is a paper design only: map phases 0-2 done, Phase 2 awaiting Michael's approval; no map code; build
  phases held until roadmap Phase 3 and the alignment pass (bible Section 10, Phase 7).
- Parked content (Wave, Hunter, Mission, PvP, the economy, cosmetics) goes behind `?legacy=1` in Phase 0 Step 4.

## Phase 0 log

#### Step 1 report (integrate) - 2026-10-08
- Done:
  - Handover 0a: Exchange pause note on `feature/exchange-map` (d590117), with the Space 8 secret route and sloped duct items carried over.
  - Handover 0b: bible, Phase 0 spec, handover, alignment spec on `ct-movement` (5be33e4).
  - 1b: `feature/exchange-map` merged (e0bd61e). Code diff was exactly the allowed list. Old Exchange blockout gone.
  - 1c: `origin/master` (3.4.0) merged (f017423).
  - 1d: two e2e timing fixes (8c343a3, 6162149).
- Conflicts (5):
  - `src/player/player.ts` - took master's removal of the `matchFov` import (3.1.9 dropped the PvP FOV lock), kept ct's `CT`.
  - `src/input/touchControls.ts` - button pointer role: master's rotated coordinates (`vx` / `vy`) plus ct's action-button `ctx`.
  - `src/styles.css` - union: ct's speed gear / rocker styles, then master's bench tag, forced landscape and resolution list.
  - `CHANGELOG.md` - master's entries as they are; ct's heading renamed `3.2.0-ct - Chaos Theory movement (ct-movement branch)`, placed after master's 3.2.0.
  - `TESTING.md` - union, ct's sections then master's.
  - Everything else merged cleanly. `CLAUDE.md` 3-way merge keeps both sides' edits.
- Decisions:
  - `vite.config.ts`: kept the merged file (master's `/ct/` denylist plus ct's `VITE_PREVIEW_ID`), not master's verbatim. Master's lacks `VITE_PREVIEW_ID`, so the `/ct/` build would lose its own save and label. Workflows are master's (identical).
  - Phone-path perf command: `perf.mjs --preset=ultra --mobile --budget` (the one master's `CLAUDE.md` documents). It runs the preset path, not the 3.4 phone look, because `?gfx=` turns the phone look off. The phone look was checked separately: boots and a Phone check run.
  - Pushed the merge right after `npm run check` passed, before the e2e run finished (the stop hook required a push). The two later fixes are test-only.
  - e2e fixes, no thresholds changed:
    - `e2e-traverse`: wait for the match after `page.reload()` (3.2.2 creates it only after shaders compile).
    - `e2e-netmove`: the known "ladder after a climb" race (logged in ct-movement-progress). Software GL runs the pages at ~4 fps, so the host's one-limb-at-a-time settle could outlast the fixed 800 ms. Now waits until the host's grips match the client's reported planted grips. Also holds B until the brace ends (a 150 ms press fell between polls).
    - The ladder race also failed on the pre-merge build (e0bd61e), so it is not from the master merge.
- Tests:
  - `npm run check`:
    - ct baseline: 57 files, 573 tests.
    - after the Exchange merge: 56 / 567 (the old Exchange test removed).
    - after the master merge: 60 / 590. All pass.
  - `npm run e2e` (32 suites, union list without `e2e-exchange`): 1365 checks.
    - 30 suites passed; `e2e-traverse` and `e2e-netmove` failed.
    - After the fixes: `e2e-traverse` passes, `e2e-netmove` passes 3 of 3.
    - The integration-risk suites (`e2e-ct`, `e2e-ct-warehouse`, `e2e-touch`, `e2e-anchors`, `e2e-clip`, `e2e-desktop`) passed in the full run.
  - Split jump fix: `e2e-ct` checks pass (jump out of a split to the 4.3 m lip).
  - Benchmark flight on the merged Warehouse: 180 m through 9 rooms, 718 samples, no step crosses static geometry or the fence, nothing within 0.3 m. No waypoint change needed.
  - Phone emulation, real phone look: `?autostart=warehouse` and `?autostart=proving` boot with 0 console errors. One Phone check run completes with 0 console errors.
  - Settings: master's video fields (3.2.1-3.3) and ct's touch layout v5 (rocker, jump) are separate fields in `sanitizeSettings`. Both kept, unit tests pass.
- Measurements (4-core VM; CPU budgets are noisy here and already missed before the merge):

  | Path | Build | sim p95 ms | anim ms/char | alloc MB/s | draws | tris M |
  | --- | --- | --- | --- | --- | --- | --- |
  | test (`--budget`) | ct before | 2.95 / 3.45 | 0.055 / 0.074 | 12.4 / 13.3 (over) | 43 | 0.14 |
  | test (`--budget`) | master | 2.75 / 2.55 | 0.057 / 0.060 (over) | 11.1 / 10.5 | 43 | 0.13 |
  | test (`--budget`) | merged | 2.6 / 2.25 | 0.056 / 0.052 | 12.9 / 11.5 | 42-43 | 0.14 |
  | phone (`--preset=ultra --mobile`) | master | 3.85 / 3.6 / 6.8 | 0.054-0.081 | 10.3-12.0 | 138-153 | 0.48 |
  | phone (`--preset=ultra --mobile`) | merged | 5.05 / 6.35 / 3.7 | 0.059-0.069 | 10.6-12.8 | 144-159 | 0.48 |

  - Budgets: sim p95 2.5 (test) / 2 (phone) ms x machine speed, anim 0.04 x speed, alloc 11.5 MB/s, draws 55 / 250, tris 0.2 / 2 M.
  - The merged test path passed every budget on its second run. Interleaved phone runs overlap master's.
  - Draws and triangles are within budget on every run (phone +6-20 draws from the CT Warehouse pieces).
  - The CPU misses happen on both sides (VM load). The allocation overshoot was already on ct before the merge.
- Open issues:
  - Allocations on the test path sit near or over 11.5 MB/s on CT builds (ct baseline 12.4-13.3). Not caused by the merge.
  - CPU readings on this VM swing by up to 2x run to run.
- Next: STOP. Michael tests `/ct/`, merges `ct-movement` -> `dev` -> `master`, then says "continue with Step 2".

#### Step 2 report (design bible and progress file) - 2026-10-08
- Done: `docs/design-bible.md` installed (committed in handover Step 0b, 5be33e4; unedited); this file.
- Files changed: `docs/progress.md`.
- Decisions: Michael re-issued "follow the handover" before promoting Step 1 to `dev` / `master` -> Steps 2-5 run
  on `ct-movement` now -> `dev` / `master` receive Phase 0 in one merge. Versions per phase follow bible 9 (one
  minor per phase from 3.5.0).
- Tests: docs only.
- Next: Step 3 (lean `CLAUDE.md`, `docs/systems/`, archived history).

### Decisions
(collected from the step reports above)

### Measurements
(collected from the step reports above)

### Open issues
- Allocations on the test path sit near or over 11.5 MB/s on CT builds (12.4-13.3 MB/s before the merge).
- CPU readings on the cloud VM swing by up to 2x run to run; single `perf.mjs` readings may miss scaled budgets.

## Links
- CT movement: `docs/ct-movement.md` (spec), `docs/ct-movement-progress.md` (status)
- Level design: `docs/level-design.md` (the standard), `docs/templates/map-spec.md` (map spec template)
- Kestrel Exchange: `docs/prompts/exchange-map.md` (spec), `docs/prompts/exchange-design.md` (design),
  `docs/prompts/exchange-map-progress.md` (log), `docs/prompts/exchange-plans/` (plans and overlays),
  `docs/prompts/exchange-alignment.md` (map Phase 2b)
- Phase 0: `docs/prompts/phase-0-foundation.md`, `docs/prompts/phase-0-handover.md`
