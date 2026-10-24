# settings-rt-hide - brief

## Ask
Hide the Settings controls that do nothing since voxel-retire (PR #236): the "Ray traced" reflections option,
"Ray-traced reflections rate" (`rtRes`) and "Global illumination" (`gi`). Follow-up to voxel-retire A3
(`docs/voxel-retire/BRIEF.md`, STATE "Polish list").

## Base
Branch `feature/settings-rt-hide`, cut from `origin/feature/voxel-retire` (it removed the rt path); rebase onto master
after #236 merges.

## Plan (one step)
- UI: `src/ui/screens/settingsScreen.ts` Graphics tab. Remove `{ value: 'rt' }` from `REFL_OPTS`, drop the
  `RTRES_OPTS` table, the "Global illumination" toggle and the "Ray-traced reflections rate" row. The Reflections row
  shows a saved `'rt'` as Screen space (the renderer already runs SSR for `'rt'`, `postStack.ts`); stepping from it
  moves from Screen space.
- FocusNav: rows are collected from the DOM (`data-focus`), so removing rows needs no nav change.
- Tests: no unit test lists these rows or options. e2e-desktop part 4 and e2e-lightbake set `reflections = 'rt'`
  through `settings.update` (not the UI): still valid, left as they are. e2e-menus does not assert these rows.

## Assumed decisions
- A1. Settings / save shape unchanged, no `SAVE_VERSION` bump: `ReflectionMode` keeps `'rt'`, `rtRes` and `gi` stay
  in `GraphicsFeatures`, the presets and `sanitizeGfx`. Undo: put the rows back. Later sweep may delete the fields with
  a migration.
- A2. A saved `'rt'` is not rewritten on load; only the UI shows it as Screen space (same render either way).
