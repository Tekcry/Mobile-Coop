# anim-studio PR 1 - check (2026-10-21)

Fresh checker, commit 989ba439 (`git diff 2287d5b7..HEAD`). Read: CLAUDE.md, BRIEF.md, REPORT.md, the full diff of
every changed `src/` and `scripts/` file, and the code each hook touches (loop, app transitions, keyboard source, tuner
pad, tune registry).

Ran: `npx tsc --noEmit -p .` clean; `npx eslint` on the changed files clean; `npx vitest run tests/animStudio.test.ts`
17/17 pass. e2e not run (the job lead is running them).

## Verdict: FIX

Two one-line fixes. Nothing reaches players who never open the studio.

## Blockers

**B1. Closure allocated every fixed step and every frame in the studio (hard rule: hot paths do not allocate).**
- Where: `src/anim/studio.ts:153-155`. `studioEntry` is `STUDIO_ENTRIES.find((e) => e.id === id)`, and the arrow
  captures `id`, so each call allocates a closure.
- Called from `src/game/studioStage.ts:79` (`input`, every fixed step inside `GameState.fixedUpdate`) and `:105`
  (`frame`, every rendered frame).
- The report says "no allocation in the per-step input", which is not true.
- Fix: a plain `for` loop in `studioEntry`, or cache the entry in `StudioStage.configure` (it already tracks
  `cEntry`) and use it in `input` / `frame`.

**B2. Undo / redo write the change log with `performance.now()` as the wall clock.**
- Where: `src/ui/tuneSnapshots.ts:102,110` pass `performance.now()` to `TuneHistory.undo/redo`. `src/anim/tuneHistory.ts:127`
  then hands that `now` to `tuneApplyValues`, which passes it to `tuneSet` (`tuneRegistry.ts:261-276`).
- What breaks: `tuneSet` stamps the log entry `new Date(now)`, so undo steps are logged in 1970. Its merge test
  `now - lastLogAt < LOG_MERGE_MS` (`lastLogAt` in epoch ms) is then hugely negative, so it is always true. An undo of
  the slider last changed overwrites that slider's entry (`last.to = v`, logged as "1 -> 1") instead of adding a step.
  The log is saved and exported (`tuneExport` includes it), so the record Michael shares is wrong. The values are
  right.
- Fix: in `TuneHistory.apply`, call `tuneApplyValues(m)` (default `Date.now()`). Keep `now` only for the history's
  own merge timing. Optionally, a unit test that the last `TUNE_LOG` entry after an undo has a current-year `t` and
  `from !== to`.

## What was checked and holds

1. **No change for players who never open the studio.**
   - `AnimGraph.drive` starts null. Only `StudioStage.configure` / `detach` write it, and the stage is built only for
     map `studio` with no `opts.net`. The `drive` line and the `studioFeet` line (`if (this.graph.drive)`) are
     no-ops elsewhere.
   - The gameState hooks are all `this.studio?.` (null elsewhere): the input swap, `studio.frame` and the `move`
     override.
   - The `freeFrame` snap / spin read `FREE_VIEW.snap` / `spin`. Only the studio panel writes them, while
     `STUDIO.active`, and `dispose` zeroes them.
   - Reset on exit, every path:
     - Quit, retry / restart, a studio row from Pause or Settings, and the main menu all go through
       `app.releaseState()` / `setState()` to `GameState.exit()`. That runs `studio.dispose()` (the drive off, the guard
       disposed, the free view off, spin / snap 0, the panel and debug overlay it opened closed, `studioReset()`), then
       `loop.timeScale = 1`.
     - The 2x cap: the panel's frame drops `speedMax` back to 1 and clamps `runScale` the first frame it runs outside
       the studio. If the studio opened the panel, `hide()` puts the speed back to 1.
     - Death: no enemies or hazards in the studio. A restart is the restart path above.
2. **Studio as a scene.**
   - `DEV_MAPS` is separate from `MAPS`, and every MAPS consumer leaves the studio out: the Play, Free Roam,
     Missions and Sector Ops screens, the co-op lobby (`coopUi.ts`), and the map tests.
   - `getMap` falls back to `DEV_MAPS`.
   - The rows are hidden in co-op: Pause checks `!opts.coop`, Settings checks `!animTune.coop()`. A co-op match never
     builds the stage (`opts.net` is checked first).
   - `?autostart=studio` boots Free Roam on it. Nothing branches on `map.modes`.
3. **Hard rules.**
   - Babylon only through `core/babylon`. `import type` is used where needed. No localStorage. No `src/net` import.
   - The presets live in the tuner's own IndexedDB (`<save>-animtune`, key `presets`), never the main save.
   - The drive, the treadmill, `studioInput` and the overlay draw do not allocate (`getAbsolutePosition` returns
     Babylon's cached vector).
   - The onion cache allocates only on a clip change.
   - The one exception is B1.
4. **Input safety.**
   - The Ctrl+Z / Y capture returns at once when the panel is closed, and it only takes `KeyZ` / `KeyY` with a
     modifier, never Ctrl itself. Crouch (C / Ctrl) is never swallowed, and a Z keyup reaching the game is harmless.
   - The synthesised `InputState` belongs to the stage. It is read only while `drives` is set and dies with the match.
     Picking "off" goes straight back to the device state. Pause is read from the real device first.
   - Snap / turntable go through `setFreeMode('orbit')`, then `pad.setFree(true)`, which sets `quiet`. The A press
     that triggered it is swallowed until released, and View back works the same way (`animTunePad.ts:111-121`).
5. **Menu rows.**
   - Main menu: `order: 95`, after Feedback (90), so it is last.
   - Pause: after the tuner row and before Quit. Hidden with `inStudio` and in co-op.
   - Settings: under Developer.
   - The asserts in e2e-menus (both orders), e2e-park and e2e-pad (the extra Down) match. No other suite asserts these
     orders. e2e-menus:81 (up wraps to the last row) is generic.
6. **e2e-studio.** The selectors exist. The key-step maths is exact (k / 32). Phases hold with dt 0, because
   `frameUpdate` gets the scaled dt. `drive === null` after a state pick holds. The IndexedDB read-back uses the right
   DB / store / key.

## e2e-studio: what may flake
- Mostly deterministic: the walk uses `stepHeadless(2)` (it ignores the time scale). The keys are exact fractions, and
  the preset read polls 20 times.
- The walk margin is large: about 2 m along the 2 m circle against a 0.5 m threshold. It would only fail if the
  synthesised stick never reached the controller.
- The "no console errors" filter: a first-time runtime lamp bake or a shadow warning on the new map logged as an error
  would fail it. Watch the first laptop run.
- Boot time under software GL: the wait is 90 s, which should be enough for a 16 m room.

## Polish list
- **Checkboxes after a second visit.** `StudioPanel.sync` (`studioPanel.ts:144-156`) only re-syncs the loop, mirror
  and root motion. On a second visit, guard, turntable, deg/s, skeleton, feet and onion keep the last visit's ticks
  while `STUDIO` was reset, so one click looks like it does nothing.
- **Debug overlay and settings.** Any settings change inside the studio hides the debug overlay (`app.ts:133` syncs it
  to `showFps`), so the crab readout goes. If the player turned `showFps` on inside the studio, `dispose` turns the
  overlay off anyway.
- **Guard rigs in the bones map.** `StudioOverlay.bones` (`studioOverlay.ts:32`) keeps every disposed guard rig until
  the panel closes or the studio is left. Delete the entry in `dropGuard`, or key it per session.
- **Pause row without a confirm (S17).** Pause > Anim Studio (dev) sits one row above Quit and leaves a mission with no
  confirm. Consider Quit's dialog outside Free Roam.
- **Panel during loading.** The panel and debug overlay open during the loading screen (the stage is built inside
  `GameState.create`).
- **Settings row inside the studio.** Settings > Developer > Anim Studio still shows there and reloads the stage.
- **Failed loads.** If `GameState.create` throws after the stage is built, `STUDIO.active` and the opened panel stay on
  (no `dispose`).
- **Device input while a loop plays.** Systems that read `app.input.state` directly (the gadget wheel, the context
  menu) still see the devices. That is fine for a dev aid.
- **S1 needs a confirm.** S1 (a dev scene in `DEV_MAPS`, outside the level-design standard) should be confirmed by the
  orchestrator / Michael, since the hard rule says every new map follows the standard.
- **Timing file.** `e2e-times.json` has no `e2e-studio` entry (already on the report's list).
