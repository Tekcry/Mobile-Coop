# Menu UI - slice 5 (pause, objectives, results)

Branch `feature/menu`, 2026-10-18. Prototype first (G87). Desktop only (G12). Covers the desktop parts of step 10
(SPEC 7.19 field terminal, 7.20 pause background, 7.21 results, 7.25 controller disconnect).

## Built
- **Pause on the MenuScreen template** (`src/ui/screens/pauseScreen.ts`, ghost FIELD / TERMINAL, class `pause-screen`):
  Resume (default), Objectives, Settings, Controls (the remap screen), Report feedback, Quit to menu (`data-key`
  `resume`, `objectives`, `settings`, `controls`, `report-feedback`, `quit`), each with context text under the list so
  the operator stays visible on the right. Back, B and Start resume (Start as slice 2 set). Quit opens "Quit to menu?"
  with Stay first and focused (Back = Stay). Dev rows (`pauseExtraRows`) still append. Co-op shows "The mission keeps
  running."
- **Objectives (G108)** (`ObjectivesScreen`, MISSION / OBJECTIVES): the mission's objectives with Done / Current / To do
  (`GameState.objectiveLines()`: the Infiltration chain; other modes show the HUD objective line; free roam says there
  are none). Read only; Back returns to the pause menu with focus kept.
- **Pause look** (`src/vfx/pauseLook.ts`, pure state machine `stepPauseLevel` + `PauseLook`; `PostStack.pauseK`): depth
  of field opens to f/1.8 over 250 ms (instant under `prefers-reduced-motion`) with the focus distance = camera to the
  local player's chest, so the world behind blurs and the operator stays sharp (no mask needed; it is the DOF focus).
  Wall-clock driven (the sim dt is 0 while paused). Off on resume. Without depth of field (`PostStack.hasDof` false,
  the Low preset) the screen gets `.no-dof`: a plain `rgba(3,5,6,.82)` overlay plus the left shade; no `backdrop-filter`.
  The vignette and left shade are CSS gradients on the pause screen. Gameplay never reads any of it.
- **HUD hides while paused** (`Hud.setVisible(false)`, `.hud[hidden]`), and under the results screen; back on resume.
- **Co-op pause**: unchanged and kept: `GameState.pause()` sets `menuOpen` (not `paused`) when `net` is set, so the sim
  and the partner never freeze; the menu takes only this player's input. No e2e added (see Skipped).
- **Controller disconnect (MD12)**: `GameState` listens to `padDisconnected` (while the input mode is the pad) and opens
  the pause menu with a warn line "Controller disconnected. Reconnect it, or press any key to continue."; a reconnect, a
  key press or a click clears it. Co-op: the same menu over the live game. In menus the existing toast stays.
- **Results** (`resultsScreen.ts`, MISSION / RESULTS, class `results-screen`): big VICTORY / DEFEAT, subtitle, time,
  the stars with what earned each (mission completed, bonus rules kept, never detected), the kit used, the stat rows
  on the right (and the course panel for the course); items Next mission (after a solo win, default), Retry (co-op:
  "Play again", back to the lobby flow as before), Missions, Main menu. Back = Main menu. New `SessionCallbacks.missions`
  and `briefing` (set in `main.ts`) open the missions list or the next mission's briefing.
- Kept for scripts: `.pause-screen .btn`, `.dialog`, `.results-screen`, `.results-title`, `.stat-grid` (text
  "Objectives4"), `.mission-rating`, `.course-panel`, `.rewards`, the "Play again" button in co-op / course.

## Files
- New: `src/vfx/pauseLook.ts`, `tests/pauseLook.test.ts`, `scripts/archive/menu-shots5.mjs`, `docs/menu-ui/SLICE5.md`,
  `docs/menu-ui/shots/slice5-*.png`.
- Changed: `src/ui/screens/pauseScreen.ts`, `resultsScreen.ts`, `src/game/gameState.ts` (pause, objectiveLines, disconnect,
  pause look, results nav), `src/vfx/postStack.ts` (`pauseK`, `hasDof`), `src/ui/hud/hud.ts` (`objectiveText`),
  `src/main.ts` (Missions / Next callbacks), `src/styles.css` (slice 5 block), `scripts/e2e-pad.mjs` (pause order, Stay
  focused, Right to Quit), `scripts/e2e-menus.mjs` (pause, objectives, quit confirm, disconnect, results).

## Skipped
- Restart from checkpoint: no checkpoint save exists (modes keep a respawn point only), so the item is not shown.
- Radio log and Map items (the step file lists them; the brief did not).
- Field terminal (in-game computers) restyle.
- Sharp-player mask: not needed (DOF focus on the player); the vignette is CSS, not `CinematicPost`.
- Co-op "pause does not freeze" assertion in e2e-coop (kept behaviour; not added).
- Results: best-rating line, per-category rows beyond the existing stats, Retry / Next in co-op.
- CHANGELOG, TESTING, `docs/systems/ui.md`, `graphics-quality.md`: left to the orchestrator.

## Open items
- GPU check on the PC (`E2E_GPU=1`): the blur on the paused frame at Epic and the Low overlay. Software GL shots show the
  overlay path only (pending PC run).
- The Objectives screen sits on the same dim overlay as the pause menu; Settings / Controls keep their own backgrounds.
- Michael: look at `docs/menu-ui/shots/slice5-*.png`.

## Results
- `npm run check`: lint 0 errors (41 old warnings), 131 test files / 1479 tests pass (new `tests/pauseLook.test.ts`), build ok.
- e2e (software GL, `E2E_JOBS=1`, port 4191; the PC was running another job, so suites ran 10-40 min each):
  smoke, e2e-park, e2e-modes, e2e-missions (results rating assertion) ran with no assertion failure; e2e-menus stopped at the
  known load-sensitive "holding right repeats and accelerates" check before its new slice 5 block.
- The slice 5 block of e2e-menus (pause items and focus, HUD hidden, Objectives, Back focus kept, Quit confirm opens on
  Stay, Start resumes, controller disconnect line and reconnect clear, results stars / earned lines / items) was run
  on its own against the same build: all pass.
- NOT run to completion: e2e-pad (its pause assertions were edited: four Downs to Report feedback, Stay focused, Right to
  Quit), e2e-mouse, e2e-coop. The runner was stopped for time. Rerun these on a quiet PC.
- Shots: `docs/menu-ui/shots/slice5-pause.png`, `slice5-objectives.png`, `slice5-quit-confirm.png`, `slice5-results.png`
  (taken before the final results CSS fix: re-run `scripts/archive/menu-shots5.mjs` to refresh the results shot).

## Follow-up: G146 rating
- `missionRating(done, alarms, kills)` in `src/game/missions.ts`: 0 stars for a lost mission; otherwise 1 star for all primary objectives, +1 for no alarms raised, +1 for no kills (G146). The old formula (bonus rules and detections) is gone.
- Results screen (`src/ui/screens/resultsScreen.ts`): the three `.rs-earned` lines are "All primary objectives complete", "No alarms raised" / "Alarms raised: N", "No kills" / "Kills: N". The bonus rules kept show as a separate `Bonus:` line (`.rs-bonus`), not a star. `.mission-rating` is unchanged.
- The mission model has no optional objectives yet, so the bonus line shows the kept bonus rules only; optional objectives join it when maps define them. The detections stat row stays.
- Tests: `tests/missions.test.ts` (rating), `scripts/e2e-menus.mjs` (lines, bonus line). e2e-missions and e2e-menus pass (E2E_JOBS=1).
- G126 (encounter checkpoints) is not touched here; no results change was needed for it.
