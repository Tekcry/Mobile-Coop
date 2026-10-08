# Night Shift - progress

The single place that says where the project stands. Design authority: `docs/design-bible.md`. Updated at the end of
every phase step.

## Status
| Phase | Name | Status | Version | Spec file |
| --- | --- | --- | --- | --- |
| 0 | Foundation | done | 3.5.0 | `docs/prompts/phase-0-foundation.md` |
| 1 | Light parity | not started | 3.6.0 | `docs/prompts/phase-1-light-parity.md` |
| 2 | Sound | not started | 3.7.0 | (to be written) |
| 3 | Pure CT conversion | not started | 3.8.0 | (to be written) |
| 3b | Movement, camera and animation lock | not started | 3.9.0 | (to be written) |
| 4 | Mission framework | not started | 3.10.0 | (to be written) |
| 5 | Co-op 2-4 | not started | 3.11.0 | (to be written) |
| 6 | CT verbs for the slice | not started | 3.12.0 | (to be written) |
| 7 | Vertical slice (Kestrel Exchange, "Dead Line") | not started | 3.13.0 | `docs/prompts/exchange-alignment.md` first, then the map's phases 3-6 |

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

## Links
- Story: `docs/story.md` (story, setting, characters, in-game text)
- CT movement: `docs/ct-movement.md` (spec), `docs/ct-movement-progress.md` (status)
- Level design: `docs/level-design.md` (the standard), `docs/templates/map-spec.md` (map spec template)
- Kestrel Exchange: `docs/prompts/exchange-map.md` (spec), `docs/prompts/exchange-design.md` (design),
  `docs/prompts/exchange-map-progress.md` (log), `docs/prompts/exchange-plans/` (plans and overlays),
  `docs/prompts/exchange-alignment.md` (map Phase 2b)
- Phase 0: `docs/prompts/phase-0-foundation.md`, `docs/prompts/phase-0-handover.md`
