# AF5 - Mocap the only player path (Michael P3)

Branch `feature/afp-af5` off `feature/anim-fix-pass` 69662cf2. Per BRIEF A1 / PLAN "AF5".

## What and why
Michael P3: "Mocap off: has old animations which are also still as bad as they originally were." A1: mocap becomes the
only player path rather than re-keying the OFF clips.
- `src/ui/screens/settingsScreen.ts`: the Settings > Gameplay "Mocap locomotion" row is gone (with its wrong claim
  "your partner's view follows their own setting"); the Gameplay reset no longer touches `mocapLoco`.
- `src/core/app.ts`: the switch resolves as `applyMocapSwitch(flags.mocap ?? mocapTuner, true)` on boot and every
  settings change, so a stored `gameplay.mocapLoco: false` boots ON. `?mocap=0/1` wins; otherwise the tuner's
  "Mocap locomotion" box (`tune.mocapHost`) sets a page-only override (`mocapTuner`), no longer written to the save.
  The box reads the resolved state (`mocapWanted`).
- No save-shape change: `gameplay.mocapLoco`, `mocapV`, `SAVE_VERSION` and the sanitize / migration untouched.
- `?mocap=0` path is unchanged code (same `applyMocapSwitch(false, ...)` -> `setMocapLocomotion(false)`), so the OFF
  output is the same; no OFF md5 dump was re-run (not needed: no OFF code changed).

## Files
src/core/app.ts, src/ui/screens/settingsScreen.ts, tests/mocapDefault.test.ts, scripts/e2e-menus.mjs (new assert:
the Gameplay tab has no Mocap row), TESTING.md (one checklist line), docs/systems/ui.md, docs/systems/world-and-characters.md
(switch description), changes/feature-afp-af5.md.

## Tests
- tests/mocapDefault.test.ts (extended: app.ts never resolves from `mocapLoco`, stored false boots ON, `?mocap=0` OFF,
  tuner off OFF, url over tuner, no Settings row) + tests/settings.test.ts + tests/settingsCover.test.ts +
  tests/mocapSwitch.test.ts: 4 files, 34 / 34 pass.
- `npx tsc --noEmit -p .`: clean. eslint on the touched src / test files: clean (scripts/*.mjs is eslint-ignored).
- e2e-menus (E2E_GPU=1, E2E_JOBS=1, desktop lane 1): pass, 63 s.

## e2e
e2e-menus on desktop lane 1 (heavy.lock, port 4191, E2E_GPU=1, E2E_JOBS=1) at 5766fe1a after a fresh `npm run build`:
all asserts pass, 63 s, no console errors, including the new "Gameplay has no Mocap locomotion row" assert (the
suite fails on any assert). The lock waited ~40 min for desktop CPU < 80%.

## Open items
- Narrows M4 for players ("the hand-keyed set stays behind the switch" now holds for developers only): flag to Michael
  at the PR (BRIEF A1).
- The tuner box no longer persists across reloads (page only). Undo: restore the row + reset line, revert app.ts.

## Changelog
- Settings > Gameplay no longer has the "Mocap locomotion" row; a save that had it off boots with mocap on; `?mocap=0`
  or the tuner's box (that page only) still show the hand-keyed set.
