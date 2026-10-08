# Night Shift - progress

The single place that says where the project stands. Design authority: `docs/design-bible.md`. Updated at the end of
every phase step.

## Status
| Phase | Name | Status | Version | Spec file |
| --- | --- | --- | --- | --- |
| 0 | Foundation | done | 3.5.0 | `docs/prompts/phase-0-foundation.md` |
| 1 | Light parity | in progress (Step 2 reviewed; Step 3) | 3.6.0 | `docs/prompts/phase-1-light-parity.md` |
| 2 | Sound | not started | 3.7.0 | (to be written) |
| 3 | Pure CT conversion | not started | 3.8.0 | (to be written) |
| 3b | Movement, camera and animation lock | not started | 3.9.0 | (to be written) |
| 4 | Mission framework | not started | 3.10.0 | (to be written) |
| 5 | Co-op 2-4 | not started | 3.11.0 | (to be written) |
| 6 | CT verbs for the slice | not started | 3.12.0 | (to be written) |
| 6b | Visual target | not started | 3.13.0 | (to be written) |
| 7 | Vertical slice (Kestrel Exchange, "Dead Line") | not started | 3.14.0 | `docs/prompts/exchange-alignment.md` first, then the map's phases 3-6 |

## Current state
- `ct-movement` is at 3.5.0: `master` 3.4.0 plus CT movement plus Phase 0. `master` already carries the Step 1 integration (Michael merged PR #2); `dev` and
  `master` get 3.5.0 when Michael merges `ct-movement` again.
- Phones draw the phone look: the 3.4 light renderer (plain blockout, nearest six lamps as plain lights, no shadow
  maps, no post stack). Desktop renders lamps from the baked visibility atlas (`voxel/lampBake.ts`, `world/bakedLamps.ts`).
- Three separate light calculations can disagree (bible 5.1): desktop baked lamps, the phone's six unshadowed lights
  (lamps light through walls), and gameplay's analytic `LightRegistry` + one ray per light (`GameState.updateLight`).
  Roadmap Phase 1 replaces them with one source of truth.
- CT movement is complete (`docs/ct-movement-progress.md`): speed gears, instant stop, roll, split / wall jump, pipes,
  rappel, fences, CT takedowns and the grab, co-op team moves, the Warehouse CT routes.
- Kestrel Exchange is a paper design only: map phases 0-2 done, Phase 2 approved 2026-10-08; no map code; build
  phases held until roadmap Phase 3b and the alignment pass (bible Section 10, Phase 7).
- Decisions of 2026-10-08 recorded: bible v1.8, story v1.2 (see the bible's Section 11).
- Bible 1.9: desktop visual target and CC0 textures (5.16), Phase 6b.
- The game is now Night Shift (bible 1.7, story `docs/story.md`); the player-facing rename is Phase 0 Step 4.
- Parked content (Wave, Hunter, Mission, PvP, the economy, cosmetics) is behind `?legacy=1` (3.5.0, `core/legacy.ts`). The title is Night Shift. `CLAUDE.md` is a lean core (9.6 KB) with the detail in `docs/systems/`.

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
- Decisions: Michael re-issued "follow the handover" before promoting Step 1 to `dev` / `master` -> this file was
  written then. Versions per phase follow bible 9 (one minor per phase from 3.5.0); Phase 3b is counted as a phase
  of its own (3.9.0), so Phases 4-7 are 3.10.0-3.13.0.
- Tests: docs only.
- Next: Step 3 (lean `CLAUDE.md`, `docs/systems/`, archived history).

#### Night Shift bundle (2026-10-08)
- Done: Michael replaced the handover bundle (bible v1.7, `docs/story.md`, Phase 0 spec with the title rename,
  handover and alignment spec now naming Phase 3b).
  - Step 0a again: the pause note on `feature/exchange-map` says Phases 0-3b (c197e36).
  - Step 0b again: the five files installed byte for byte (a6f7b7f).
  - Step 1b again: c197e36 merged into `ct-movement` (docs only).
  - Step 1 is otherwise unchanged in the new spec: the integration above stands. This file updated to bible v1.7 (Phase 3b row, story link).
- Next: STOP for Michael (handover): test `/ct/`, promote `ct-movement`, then "continue with Step 2" (Step 2 is
  written; Steps 3-5 remain).

#### Step 3 report (docs restructure) - 2026-10-08
- Done: `CLAUDE.md` rewritten as a lean core (identity, every session, commands, branches, hard rules + the new ones, definition of done, module map, doc index);
  the old text moved verbatim into 19 `docs/systems/*.md` files; pre-3.0 `CHANGELOG.md` / `TESTING.md` archived; `README.md` points to `CLAUDE.md` and `docs/systems/`.
- Files: `CLAUDE.md`, `docs/systems/*.md` (ai, audio, combat, conventions, coop, cover, deploy, gadgets, graphics-quality, input-and-loop, lighting, modes-and-progression,
  movement, performance, saves, takedowns, testing-tools, ui, world-and-characters), `docs/archive/CHANGELOG-pre-3.0.md`, `docs/archive/TESTING-pre-3.0.md`.
- Sizes (KB, before -> after): `CLAUDE.md` 142.7 -> 9.6 (limit 12); `CHANGELOG.md` 137.9 -> 45.2; `TESTING.md` 84.4 -> 32.0.
- Proof: a throwaway script checked every non-empty non-heading line of the merged `CLAUDE.md` (f017423, 1307 lines) appears in the new `CLAUDE.md` or a
  `docs/systems` file: 0 missing, none dropped. The same check on the archived `CHANGELOG.md` and `TESTING.md`: 0 missing.
- Decisions: sections not listed in the spec: "Level design" -> `world-and-characters.md`; "Module layout" (full table), the old introduction paragraph and the
  "Hot paths must not allocate" bullet -> `conventions.md` (CLAUDE.md keeps a shorter module map and a hot-path hard rule); "Debug overlay" -> `testing-tools.md`.
  "Progression and saves" -> `saves.md` whole. `TESTING.md` keeps the 3.2.0-ct sections, 3.1.x, 3.0.0 and the release checklist ("Phase 10").

#### Step 4 report (`?legacy=1` and the title) - 2026-10-08
- Done: `flags.legacy`; `core/legacy.ts` + `tests/legacy.test.ts` (8 tests); Play screen (Infiltration default, Training, Free Roam), co-op lobby (Infiltration, Free Roam; a new
  room starts on Infiltration), Loadout screen (weapons, attachments, gadget, presets; every weapon and attachment selectable), results (no rewards panel, no style
  bars, rating kept), profile badge (name and tag), kill feed (no "+XP"), main-menu subtitles; the title Night Shift (page, boot screen, menu, manifest, share and file
  names, README); `REQUIRED` / `LEGACY` suite lists, `npm run e2e:legacy`, `e2e-lib` `LEGACY=1`; new suite `e2e-park`.
- Suite classification: LEGACY = `e2e-progression` (Loadout economy, suit / HQ, rewards; its save export / import checks moved into `e2e-park`), `e2e-cosmetics`, `e2e-clear` (Hunter).
  REQUIRED = every other suite, `e2e-park` new. Changed: `e2e-coop` (pages open with `legacy=1`), `e2e-missions` (no style bars; 3 with `LEGACY=1`).
- Decisions:
  - Selecting a weapon the profile does not own would have been reset by the save sanitiser on the next load. `sanitizeSave(raw, openLoadout)` and `SaveManager.openLoadout`
    keep it while the campaign is open (no `SAVE_VERSION` change; default sanitising unchanged, so the existing sanitiser test still holds).
  - Profile badge keeps the name, tag and emblem (the tag is the co-op identity); level, XP bar and credits are hidden.
  - The Training description still mentions Mark & Execute (Training is rewritten in Phase 3).
  - The data export file is now `night-shift-save-<date>.json`; the feedback report file name (`sbd-feedback-...`) is unchanged (an e2e asserts it; internal).
- Open: `src/save/migrations.ts` still says "Not a Silent But Deadly save" in an error message (the spec says leave it).

#### Step 5 report (version and final verification) - 2026-10-08
- Done: `package.json` 3.5.0; `CHANGELOG.md` 3.5.0 entry; `TESTING.md` "3.5.0 manual check"; per-step reports above; systems notes (`modes-and-progression.md`, `testing-tools.md`, `ui.md`).
- Tests:
  - `npm run check`: lint clean, 61 files / 598 tests pass, build OK.
  - `npm run e2e` (31 required suites, 1342 checks): 30 passed on the first run; `e2e-mouse` failed its `=` / `-` gear check (a fixed 150 ms wait on a page at a few frames a second). After polling
    up to 2 s for the step (same assertion) it passes 3 of 3. `e2e-park`, `e2e-missions` and `e2e-coop` pass after their edits.
  - `npm run e2e:legacy` (`e2e-progression`, `e2e-cosmetics`, `e2e-clear`): all pass.
- Measurements (cloud VM, noisy; scaled budgets):

  | Path | sim p95 ms | animation ms / char | allocations MB/s | draws | triangles M |
  | --- | --- | --- | --- | --- | --- |
  | Test path, Step 1 baseline (ct before / master) | 2.95-3.45 / 2.55-2.75 | 0.055-0.074 / 0.057-0.060 | 12.4-13.3 / 10.5-11.1 | 43 | 0.14 |
  | Test path, 3.5.0 (two runs) | 2.85, 2.3 | 0.054, 0.063 | 11.2, 11.0 | 40-42 | 0.14 |
  | Phone path (`--preset=ultra --mobile`), Step 1 (master / merged) | 3.6-6.8 / 3.7-6.35 | 0.054-0.081 / 0.059-0.069 | 10.3-12.0 / 10.6-12.8 | 138-153 / 144-159 | 0.48 |
  | Phone path, 3.5.0 | 3.1 | 0.051 | 11.6 | 159 | 0.49 |

  The test path passes every budget on its second run (the first misses animation by a hair, as `master` does). The phone path's sim p95 (3.1 against 2.65) and allocations
  (11.56 against 11.52) are over by the same VM noise seen on `master`; draws and triangles are inside the budget. No regression from Phase 0.
- Phone check (the light renderer under phone emulation) and the benchmark flight were checked in Step 1; nothing in the renderer changed since.

### Decisions
- Michael re-issued "follow the handover" with the Night Shift bundle (bible v1.7, story) before promoting Step 1; Step 1 stood as written and Steps 2-5 ran after
  Michael merged `ct-movement` into `master` (PR #2, identical trees). `dev` was not merged yet.
- Phase 3b is its own phase and version (3.9.0), so Phases 4-7 are 3.10.0-3.13.0.
- `vite.config.ts`: kept `VITE_PREVIEW_ID` (the `/ct/` save and label) on top of `master`'s file.
- The merge was pushed after `npm run check` and before the full e2e run (the stop hook asks for pushes); two test-timing fixes followed (`e2e-traverse`, `e2e-netmove`),
  then `e2e-mouse`. Step 4 was pushed as work in progress (42bf428) before its e2e suites were updated.
- e2e timing flakes (software GL runs the pages at a few frames a second) are fixed by waiting for the condition, never by loosening a threshold.

### Measurements
See the Step 1 and Step 5 reports.

### Open issues
- Allocations on the test path sit near the 11.5 MB/s budget on CT builds (12.4-13.3 MB/s before the merge, 11.0-11.2 now).
- CPU readings on the cloud VM swing by up to 2x run to run; single `perf.mjs` readings may miss scaled budgets (the same on `master`).
- `e2e-park` covers the legacy-off lobby and Loadout; the legacy-off results screen (no rewards panel) is covered only through `e2e-missions` (no style bars).
- `src/save/migrations.ts` error text still names Silent But Deadly (left alone on purpose).
- `docs/story.md` Section 9 and bible Section 11 list the still-open decisions for Michael.

## Phase 1 log

#### Step 1 report (a canonical bake on every device) - 2026-10-08
- Done:
  - Canonical shapes: `voxel/lightShapes.ts` builds them from the level's own boxes and cylinders (visible, at least 5 cm thick) plus the Medium box dressing, whatever the renderer, preset or tier. `BuiltLevel.light` holds them packed with bounds (whole metres) and a hash.
  - Bake everywhere: `world/lightBake.ts` `bakeLevelLight` runs the lamp bake, the moon bake and the ambient grid in `World.create` on every device (phone look, `?gfx=min`, `?voxels=0`, every preset) when the map has lights. `bakedLights` moved there (re-exported from `bakedLamps.ts`).
  - Moon: `bakeMoon` in `voxel/skyBake.ts` (0.5 m cells, one ray per cell through 0.25 m conservative occupancy, solid cells take their brightest air neighbour). Worker job `moon`, cached (`moon:` keys, `bakeLevelMoon`).
  - Ambient grid: `world/ambientGrid.ts`, 1 m cells, one byte each, from `LightRegistry.zones`; nearest-cell lookup.
  - The keys (`lampKey`, `moonKey`) hold only the map, seed, canonical shapes hash, lights and the moon direction. `World.lightInfo()` exposes them and a content hash for tests.
  - Renderers unchanged: the desktop voxel path draws `BakedLamps` from the canonical bake; the phone look bakes but still draws its six plain lights (Step 4).
  - Doors: leaves are `Door` anchors, not level boxes, so they are already outside the shapes (Decision 7). Nothing to change.
- Files changed: `src/voxel/lightShapes.ts` (new), `src/voxel/skyBake.ts`, `src/voxel/lampJobs.ts`, `src/voxel/workerPool.ts`, `src/voxel/voxelWorker.ts`, `src/world/lightBake.ts` (new), `src/world/ambientGrid.ts` (new), `src/world/world.ts`, `src/world/levelBuilder.ts`, `src/world/bakedLamps.ts`, `tests/lampBake.test.ts`, `tests/lightField.test.ts` (new), `scripts/e2e-lightbake.mjs` (new), `scripts/run-e2e.mjs`, `docs/systems/testing-tools.md`, `docs/prompts/phase-1-sheets/` (contact sheets).
- Decisions:
  - Thickness floor 5 cm (`CANON_MIN_THICK`): the bake grows every shape by half a cell (10 cm) anyway, so thinner pieces (skirting, decals, wire) only add noise. 5 cm is the finest structure voxel size.
  - Dressing tier: Medium (the phone look's). `detailPieces` gives dressing at every tier but High, so the canonical set drops the pieces `build()` added for the tier and regenerates them at Medium.
  - Moon occupancy is 0.25 m, finer than its 0.5 m cells, so a thin pole or rail still shades the cells whose ray passes it. A one-ray cell cannot shade a pole narrower than its offset from the cell centre; Step 2's trilinear read softens it.
  - The moon bake runs on its own single-worker pool next to the lamp pool, so the two bakes overlap.
  - The ambient grid is built after `reg.ambient` is set; `World.create` now sets it before the bake (the constructor still sets it, same value).
  - Desktop drawing of baked lamps still needs voxels and `!cheap` (as before); only the bake data moved to every device.
- Dropped objects (STOP rule: larger than 0.3 m in two dimensions):
  - Warehouse art-layer extras (voxel-only dressing, not in the canonical set): 31 fill shapes, of which 6 exceed 0.3 m in two dimensions: wall plates 0.1 x 0.55 x 0.4 m at (-4.33, 1.6, 0.1), (-4.33, 1.6, 10.1), (-3.67, 1.6, 16.1), (6.33, 1.6, -13.9), (5.67, 1.6, -13.9), (2.33, 1.6, 13.0). They are 10 cm deep and flush to walls; with the half-cell growth they shaded at most 10 cm of wall. **Decided (Michael, 2026-10-09, on the review's recommendation): left out.** Adding them would make the bake depend on what the voxel renderer draws.
  - Thinner than 5 cm (visible boxes): Warehouse 54, Proving Grounds 50. Five Warehouse ones are larger than 0.3 m in two dimensions; all checked in review: the 48 x 0.04 x 36 m floor overlay at y 0 (a 0.4 m floor slab lies under it), two whiteboards (`BOARD`, 1.6 / 1.4 x 0.9 x 0.04 m at (-1, 1.6, -11.18) and (-3, 1.6, 12.17)), the van's windscreen (`GLASS`, 0.04 x 0.6 x 2 m at (2.62, 1.85, -22.5)) and the guard hut's panel (0.04 x 0.6 x 1.1 m at (21.78, 1.55, -22.9)). Every one lies flush on a solid face, so leaving it out changes nothing visible. (The first draft of this report called them window panes; wrong.) Proving Grounds' one is its floor overlay (slab under it).
  - Fine-layer props and the art layer's paint: not in the bake before either (paint never blocks); fine props came from the same blockout boxes, so the canonical set covers them.
- Tests:
  - `npm run lint`: clean.
  - `npx vitest run`: 62 files, 609 tests pass (new: ambient grid 3, moon bake 4, bake hash 1, canonical shapes 3).
  - `npm run build`: OK.
  - `node scripts/e2e-lightbake.mjs` (Warehouse under `?gfx=min`, the phone look, `?gfx=low`, `?gfx=epic`): all 4 boot with 0 console errors; shapes `gdv5dj`, lamp key, moon key and data hash `16foi8b` identical in all four.
  - `npm run check` (after the report was first committed): passed.
  - Full `npm run e2e`: run after the review (below).
- Measurements:
  - Bake (Warehouse, 18 lamps, 4.1 MB of lamp visibility, 232,960 moon cells): node single thread, lamps 3.5 s, moon 0.06 s; headless Chromium with workers (fresh profile, no cache): 2.4 s (`?gfx=min`), 2.6 s (phone emulation), 2.6 s (`?gfx=low`), 2.4 s (`?gfx=epic`).
  - Every Warehouse boot on the test path now pays about 2.4 s it did not before (no cache in a fresh e2e profile). Proving Grounds has no lights: no bake.
  - iPhone cold bake: not measured (Michael, end of Step 4). If over 4 s, the proposal is a build-time bake (`npm run bake`, compressed per map, keyed by content hash). Not built.
  - Perf budgets: not run in this step (no per-frame code changed).
- Contact sheets (Epic, headless software GL, same six views old / new; old left, new right): `docs/prompts/phase-1-sheets/step1-{corridor,hall,west,yard,south,rack}.jpg`. Old = `a78293f`, new = this step. All six look the same: lamp pools, window and doorway light, the yard spot and the rack bays match. Differences are the animated operator and guard poses, and a few small dark specks on the wall in `south` (new), not traced (probably bullet chips from guards firing during the capture; not light).
- Open issues:
  - Engine facts for `docs/level-design.md` Section 12 (written in Step 9): only blockout pieces at least 5 cm thick and the Medium dressing block light (voxel art never does); ambient zones resolve to 1 m cells (Step 2 decides the cell size).
  - The moon is baked only on maps with fixed lights (Proving Grounds has none): Step 2's `LightField` takes a null moon.
  - Bake time on the iPhone unknown. The bake cache is per browser profile, so first load pays the full cost.
  - Phone look is still six unshadowed lights until Step 4.
- Next: STOP for the Opus review. Then Step 2 (one light function for all gameplay).

#### Step 1 review (Opus, bible Appendix C) - 2026-10-09
- Approved. Spec followed, nothing extra; gameplay reads no graphics state; pure modules tested; no per-frame code; no save change.
- Fixed in the report: the thin pieces are whiteboards, a windscreen and a hut panel (not window panes), all flush on solid faces; the floor slab under the overlay verified.
- Decisions (Michael took the review's recommendations, 2026-10-09):
  - The six Warehouse wall plates stay out of the canonical set.
  - The ambient grid's zone edges: settled in Step 2's behaviour check. The Warehouse zone `x -7.5..12.5, z -26..-23.8, y ..6` reads as `x -8..13, z -26..-24` at 1 m cells (a 0.2 m strip at z -24..-23.8 reads 0.3 instead of 0.17). Either 0.5 m cells or accept and record in Section 12.
- Owed before Step 2: the full `npm run e2e` (every boot now bakes).
- Process: Step 1 was first pushed to a session branch (`claude/new-session-cw8fow`; the remote copy could not be deleted from the session, Michael removes it); the contact sheets were first cut to 3 views without asking, then redone in full (12); the report was committed before `npm run check` finished (it passed).

#### Step 2 report (one light function for all gameplay) - 2026-10-09
- Done:
  - `world/lampMath.ts` (pure): the one formula, taken from what the screen has drawn since 3.2 - linear range falloff
    x cosine cone (lamps without a cone: the hemisphere below, exponent 1; spots: squared, cut at the outer angle).
    The exact path and the volume mix in `bakedLamps.ts` use `LAMP_MATH_GLSL` and its constants; `LAMP_CONE`,
    `LIGHT_GAIN` and the exponents moved there. `lights.ts`'s old smooth falloff / cone (`falloff`, `coneFactor`)
    and `lightLevelAt` / `bodyLightLevel` are gone; `contribution` calls `lampMath`.
  - `world/lightField.ts` (pure) `LightField`, `World.lightField`: `levelAt` (ambient grid + moon x moon visibility +
    the lamps listed for the 2 m column, as the shaders list them, x intensity x formula x trilinear baked
    visibility, closed doors cutting a lamp), `dynamicAt` (flashlights, with the caller's ray), `totalAt`,
    `bodyLevel`. Allocation-free.
  - Every gameplay light query goes through it: `GameState.updateLight` (meter, 10 Hz) and, on the host, every
    remote player's `PlayerRef.light`; `Enemy.perceive` (`ref.light`, else `totalAt`); body light in
    `EnemyManager`; `Enemy.torchWanted` (static level, with hysteresis). `grep` finds no other caller.
  - The moon: `lampMath.moonLight(theme)` = `lightLevel x sun / (ambient + sun)`; the open sky's ambient gives that
    much up to it (zones unchanged), and the bake now always runs the moon (60 ms; Proving Grounds included).
- Files changed: `src/world/lampMath.ts` (new), `src/world/lightField.ts` (new), `src/world/lights.ts`,
  `src/world/bakedLamps.ts`, `src/world/lightBake.ts`, `src/world/world.ts`, `src/game/gameState.ts`,
  `src/ai/enemy.ts`, `src/ai/enemyManager.ts`, `tests/lightField.test.ts`, `tests/lights.test.ts`,
  `tests/perception.test.ts`, `scripts/e2e-stealth-ai.mjs`, `scripts/e2e-coop.mjs`, `docs/systems/lighting.md`,
  `docs/systems/ai.md`.
- Decisions:
  - Which formula: the shaders' (what players see) over gameplay's smooth one; desktop is unchanged and gameplay
    moves. Rendering keeps colour, `LIGHT_GAIN` and N.L on top.
  - Re-tuning (spec: "lamp intensities or the `LIGHT` thresholds, one place"): `LIGHT.shadow` 0.28 -> 0.25,
    `LIGHT.lit` 0.6 -> 0.53 - the pair that keeps the most Warehouse floor (0.5 m grid, standing and crouched,
    moon-shadowed open ground left out) in its 3.5 band: 90.5% against 85.6% with the old pair. The rest differ
    because the formula's shape changed (linear falloff reaches further, the lamp cosine dims off-axis).
  - The moon's share comes from the theme (no map edit): Warehouse 0.104 of its 0.3. The yard in the open stays
    0.3; in the moon's shadow (the perimeter wall's, 2-3 m deep) it is 0.196, dark - as the desktop draws it.
  - Ambient cells stay 1 m (review decision, settled here): the Warehouse's zone edges off the metre grid move
    6.0 m2 of floor (0.28%) at y 1.
  - Torch rule: the spec says the full level. Static level (the guard's own torch is not counted) < `TORCH_DARK`
    0.35 to switch on, kept on to `TORCH_KEEP` 0.45 so a walk through a pool's edge does not flick it.
  - Doors in gameplay: one segment-leaf test per contributing lamp against the closed leaves (`DOOR_SHUT` 0.05
    open), pure, from `Doors.list`; dynamic lights get the same test plus their ray.
  - Remote players: the host samples them with `bodyLevel` (crouched 0.65 of 1.75 m) and the static-geometry ray
    for flashlights, as the local player.
  - Allocation: V8 boxes a double returned from a call it does not inline (16 B); the field's private steps write
    a scratch number field instead, so a query leaves only its own returned number. The unit test bounds bytes per
    query (`levelAt` 32, `bodyLevel` 97 measured; a control with one 3-vector per query 256).
- Behaviour check (Warehouse, old formula with the old ray occlusion stood in by baked visibility; each side read
  with its own thresholds):

  | e2e position | old | new |
  | --- | --- | --- |
  | shadow aisle (-15.2, 6.2), crouched | 0.120 dark | 0.122 dark |
  | in front (-14.5, 17.5), crouched | 0.120 dark | 0.194 dark |
  | lamp pool (-0.5, -3) | 0.787 lit | 0.687 lit |
  | (-0.5, 0) | 0.577 mid | 0.442 mid |
  | (0, -5), (-2, -15) | 0.695 lit | 0.559 lit |
  | (-0.95, 9.8) | 0.268 dark | 0.238 dark |
  | yard (-22, -24), (-21, -24) | 0.300 mid | 0.196 dark (moon shadow) |
  | (-21.6, -20.2) | 0.376 mid | 0.472 mid |

  - Floor (8,633 points, standing): 3,813 dark stay dark, 1,921 mid stay mid; the moon shadows in the yard turn
    mid to dark; lamp pools' edges move by the falloff's shape.
  - e2e changes from behaviour (no threshold loosened):
    - `e2e-stealth-ai` lights: the investigating guard walks to the second lamp shot out (9, -9) through the pool
      of the lamp at (9, 3) (0.44-0.51 at his head), so his torch stays off until he leaves it (traced). The check
      waits up to 15 s and asserts the torch came on where the field reads dark (0.34).
  - e2e fixes for flakes that predate Phase 1 (`e2e-coop` "client grabs a host guard from behind": 1 in 3 on `a78293f` and
    on Step 1 alike; failure dumps added to find the causes):
    - the guard was picked from the client's puppets, which can still list one the host has just removed: picked on
      the host now, the client waits for its puppet;
    - the checks before (an execute, a gas cloud) can leave guards in combat having spotted the client, and such a
      guard cannot be taken by surprise (by design): the host's guards are calmed first;
    - the gas cloud is cleared first (the grab spot is inside it).
    - One failure on the earlier version lost the chosen guard on the host mid-check, cause not traced; a kill log
      stays in the suite and dumps on failure. 5 of 5 runs pass after the fixes.
- Tests:
  - `npm run lint`: clean. `npx vitest run`: 63 files, 617 tests (new: `lampMath` known values, `levelAt` against an
    independent brute-force sum at 500 random points, state changes, doors, dynamic lights, allocation bound, trilinear).
  - Step 1's full `npm run e2e` (before Step 2, after the review): 31 suites, 1342 checks; 30 passed, `e2e-coop`
    failed on the grab (pre-existing, above).
  - Step 2 build: `e2e-stealth-ai` (full suite, after its torch fix), `e2e-stealth`, `e2e-tactics`, `e2e-missions`,
    `e2e-desktop` (the GLSL built from `lampMath` compiles on the Epic exact path and the phone voxel look's volume;
    no console errors), `e2e-lightbake`: all pass. `e2e-coop`: 5 of 5 after its fixes.
  - The full `npm run e2e` on Step 2: not run (phase end, Step 9).
- Measurements (perf test path `--budget`, cloud VM; interleaved with `a78293f` on the same VM):

  | Build | sim p95 ms | anim ms / char | alloc MB/s | draws | tris M | budgets |
  | --- | --- | --- | --- | --- | --- | --- |
  | `a78293f` (two runs) | 3.4, 2.0 | 0.0703, 0.0462 | 10.83, 11.09 | 43 | 0.14 | sim + anim over, then all pass |
  | Step 2 (four runs) | 2.65, 2.95, 3.05, 2.9 | 0.0541, 0.0527, 0.0675, 0.0569 | 11.26, 11.32, 11.54, 11.18 | 43 | 0.14 | anim over by a hair twice, alloc over by 0.2% once, then all pass |

  - The animation misses happen on `a78293f` too (worse), as Phase 0 reported; Step 2 touches no animation code.
  - Allocations lean 0.3 MB/s higher on Step 2. A top-80 allocation profile of each build shows no light-field
    function at all (no `levelAt`, `bodyLevel`, `updateLight`); the top-80 sums differ by 2.5% (8.66 / 8.88 MB/s),
    the shuffle of sites near the cut-off. Read as noise; still near the budget as in Phase 0.
  - The player meter now casts rays only for flashlights (before: one per lamp in range, 10 Hz, two samples).
- Engine facts for `docs/level-design.md` Section 12 (written in Step 9):
  - Light formula: linear falloff to the lamp's reach; a lamp without a cone lights only below itself, by the
    cosine from straight down; a spot by the squared cosine inside its outer angle, nothing outside it.
  - Bands: dark below 0.25, lit above 0.53.
  - The moon (the sun on day maps): open sky at the theme's `lightLevel`; in its baked shadow less its share
    (`lightLevel x sun / (sky + sun)`; Warehouse 0.3 -> 0.196, dark; Proving Grounds 0.75 -> 0.339, mid). A wall or
    building shades a strip on its far side from the moon.
  - Light blockers: blockout pieces >= 5 cm and the Medium dressing (voxel art never); closed door leaves.
  - Ambient zones resolve to 1 m cells: author zone edges on whole metres.
  - Guards light torches where the static level at the head is below 0.35 (lamps count), and keep them to 0.45.
  - Daylight maps too (review): Proving Grounds' sun share is 0.411 (sun 0.85, sky 0.7), so ground in the sun's
    shadow reads 0.339 (mid) instead of 0.75 (lit), as the desktop draws it. Nowhere on it is dark.
  - Map decisions that relied on the old facts (bible 7): `docs/prompts/exchange-design.md` Section 9 (the detection
    table by light band; darkness from ambient 0.08-0.12) and Space 2's moonlight, authored as ambient zones at 0.28
    under the windows - the old dark / mid edge, now mid (0.25 / 0.53), and with the baked moon the windows' light
    comes from the moon itself rather than a zone. Re-check in the alignment pass (map Phase 2b).

- Open issues:
  - Allocations on the test path sit near the 11.5 MB/s budget (Phase 0's open issue; 11.2-11.5 here).
  - `e2e-coop`'s grab: one failure mode (the guard lost on the host mid-check) not traced; the kill log reports it if
    it comes back.
  - The light field's moon and lamps are not yet drawn on the phone (Step 4) or for the moon on desktop (Step 3), so
    until then the screen and the field can differ in the moon's shadow and on the phone.
  - Section 12 and the Exchange re-check are recorded above for Step 9 and map Phase 2b.
- Next: STOP for the Opus review. Then Step 3 (desktop renders the same field).

#### Step 2 review (Opus, bible Appendix C) - 2026-10-09
- Approved. Spec followed; gameplay reads only the bake, the registry and door state; pure modules tested (brute-force
  sum, doors, dynamic lights, allocation bound); the four named suites pass; co-op: only the host samples remotes.
- Findings and decisions (Michael took the recommendations, 2026-10-09):
  - A. Flashlight range: the rig draws a flashlight with `range = reach ?? radius` (`lightRig.ts`), `reach` cut at the
    first wall at 15 Hz, while the field uses `radius` with its ray: e.g. a target at 3 m, a wall at 4 m: 0.25 on
    screen, 0.77 for gameplay. Pre-existing; **fixed in Step 3** (desktop draws flashlights with the full radius, their
    shadow maps stop the beam); phone flashlights in Step 4.
  - B. Proving Grounds' sun shadows (0.339, mid, where it was 0.75) were not in the report: **accepted**, the same
    rule as the Warehouse; added above and to the Section 12 facts.
  - C. `LightField.lampInto` writes `lampTerm` out by hand (boxing): both now point at each other; the brute-force
    test compares them.
  - D. The new thresholds also shape `visibilityFromLight`: sight speed at mid light moves both ways (at (-0.5, 0) the
    light factor 0.99 -> 0.81; at a level of 0.4, 0.49 -> 0.69). Detection in `e2e-stealth-ai` unchanged (0.78-0.80 s).
    Noted.
  - E. `lightRig.ts` keeps its own `LAMP_CONE` (0.97 pi) and `SHADOW_LAMP_CONE` (0.8 pi): the phone's plain lights
    only; Step 4 removes them.
- Process: two test-fix commits were pushed before their re-runs (said so in the messages); verified afterwards.
- Next: Step 3.

## Links
- Story: `docs/story.md` (story, setting, characters, in-game text)
- CT movement: `docs/ct-movement.md` (spec), `docs/ct-movement-progress.md` (status)
- Level design: `docs/level-design.md` (the standard), `docs/templates/map-spec.md` (map spec template)
- Kestrel Exchange: `docs/prompts/exchange-map.md` (spec), `docs/prompts/exchange-design.md` (design),
  `docs/prompts/exchange-map-progress.md` (log), `docs/prompts/exchange-plans/` (plans and overlays),
  `docs/prompts/exchange-alignment.md` (map Phase 2b)
- Phase 0: `docs/prompts/phase-0-foundation.md`, `docs/prompts/phase-0-handover.md`
