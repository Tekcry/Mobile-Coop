# anim-studio PR 1 - implementer report (2026-10-21)

Brief: `docs/anim-studio/BRIEF.md` (A stage, B loop player, C viewing aids, D snapshots; copy state to state not wanted).
Prototype quality.

## What was built
**A) Stage**
- A dev scene `studio` (`src/world/maps/studio.ts`):
  - 16 x 16 m dark room with a 1 m floor grid (thin non-colliding boxes, the centre lines brighter).
  - Dark walls all round as the backdrop.
  - Warm key, cool rim and soft fill lamps; no dressing.
  - Wren spawns in the middle facing +z.
- Entries (never in co-op):
  - `?autostart=studio` (Free Roam);
  - Main menu > "Anim Studio (dev)" (last row);
  - Pause > "Anim Studio (dev)" (before Quit, not shown inside the studio);
  - Settings > Graphics > Developer > "Anim Studio (dev)".
- `src/game/studioStage.ts` is built by `GameState.create` for that map, single player only. It opens the tuner panel
  docked and the debug overlay (for the crab readout), and closes what it opened on leaving.
- The panel gets a "Studio" section at its top (`src/ui/studioPanel.ts`), shown only inside the studio.
- Turntable: the orbit free view spins at 10, 20, 45 or 90 deg/s.
- Optional guard figure: a plain rig at `GRAB.hold` / `GRAB.side` in front of Wren. No AI, no hitboxes. Guard clips
  play on it while it is on.

**B) Loop player** (`src/anim/studio.ts`, `src/anim/studioDrive.ts`)
- The list has three parts:
  - "off (you drive)";
  - the procedural states: idle, walk, jog, run, crouch idle, sneak, crouch walk, low ready, aim glide forward /
    strafe / back;
  - all 28 keyed clips in `src/anim/clips/keyed`, including the wall, hold and guard clips the game does not play yet.
- States play by synthesised input (stick, aim, crouch, a draw tap). A moving state walks a 2 m circle.
- Keyed clips play through `AnimGraph.drive`. At the end of `update`, the clip sampled at the drive's phase replaces
  the keyed targets at full weight.
  - In place (the default): the studio owns the phase. The treadmill feet (`studioFeet`, run after the foot planner)
    slide the planted foot back at the clip's pace and arc the swing foot forward with the clip's lift.
  - Root motion: travel-capable clips walk the circle, sampled on the graph's gait clock.
- Controls:
  - Play / Pause (the tuner's freeze).
  - "< key" / "key >" (freezes first) and scrub.
  - Speed 0.1-2x (the loop's time scale; the game speed slider reaches 2x only in the studio).
  - Mirror and root motion.
- Readout: "key n/frames" and the phase.

**C) Viewing aids** (`src/ui/studioOverlay.ts`)
- A 2D canvas `.studio-overlay`: no scene meshes, pointer-events none. The projection in `src/ui/overlayProject.ts` is
  shared with the barrel marker.
- It draws:
  - the skeleton of every rig on the stage;
  - foot contacts (green dot planted, orange ring swinging) and 60-sample foot trails;
  - the onion skin: previous key in blue, next key in orange, faint.
- The free view is reused, and the crab readout shows because the debug overlay is on.
- Front / Side / Back / Top snaps (`FREE_VIEW.snap`, `freeSnap`) turn the orbit view on.

**D) Snapshots** (pure logic `src/anim/tuneHistory.ts`, UI `src/ui/tuneSnapshots.ts`)
These are two bars in the tuner's tools and work in and out of the studio.
- **Undo / Redo** of every tuner change:
  - a run of changes within 0.6 s is one step, and 200 steps are kept;
  - changes apply through `tuneSet`, so the log, the save and the export see them;
  - Import, Reset all, A/B and preset loads are undoable too.
- **A/B:** Store A, Store B, and an A/B flip.
- **Named presets:** a picker, a name box (keyboard), Save / Load / Delete (Delete takes A twice). They are stored in
  the tuner's own IndexedDB store under key `presets`, never in the main save.

## Controls
**Pad**
- Every studio and snapshot control is a `[data-pad]` control. The D-pad reaches it; A presses, ticks or edits it. The
  scrub and speed sliders and the dropdowns use edit mode.
- LB / RB land on the Studio section first. Opening the panel in the studio focuses the loop list.
- The Y menu adds Undo, Redo, Store A, Store B and A/B (flip).
- A snap or the turntable hands the pad to the free view; View brings the panel back.
- The pad map in `docs/anim-tuner/STATE.md` and the hint strip are updated.

**K&M**
- Mouse for everything.
- Ctrl+Z undoes; Ctrl+Y or Ctrl+Shift+Z redoes. They work while the panel is open and no text box has the keys; a
  capture listener takes them before the game.
- In the preset name box, Enter saves.

## Files
- **New:**
  - `src/anim/studio.ts`, `src/anim/studioDrive.ts`, `src/anim/tuneHistory.ts`
  - `src/game/studioStage.ts`
  - `src/world/maps/studio.ts`
  - `src/ui/studioPanel.ts`, `src/ui/studioOverlay.ts`, `src/ui/tuneSnapshots.ts`, `src/ui/overlayProject.ts`
  - `tests/animStudio.test.ts`, `scripts/e2e-studio.mjs`
- **Hooks:**
  - `animGraph.ts`: a `drive` field and one line before `return o`.
  - `characterRig.ts`: one line after `planner.update`.
  - `gameState.ts`: the stage, the loop's input and frame, snap and spin, `inStudio` for the pause menu.
  - `freeView.ts`: spin / snap and the speed cap parameter.
  - `maps/index.ts`: `DEV_MAPS`.
  - Also: `animTunePanel.ts`, `animTuneStore.ts`, `app.ts`, `main.ts`, `pauseScreen.ts`, `settingsScreen.ts`.
- **Suites:**
  - `run-e2e.mjs`: `e2e-studio` added to REQUIRED, plus COVERS entries.
  - `e2e-menus.mjs`, `e2e-park.mjs`, `e2e-pad.mjs`: the menu rows.
- **Docs:** CHANGELOG, TESTING, `docs/systems/ui.md`, `docs/systems/testing-tools.md`, `docs/anim-tuner/STATE.md`
  (the pad map).

## Level design rule
The studio is a non-map dev scene, so the rule does not cover it.
- It is in `DEV_MAPS`, not `MAPS`, so the map tests and the menus never see it.
- It has `modes: []` and no spec.
- Undo: move it into `MAPS` and write a spec from `docs/templates/map-spec.md`.

## Assumed decisions (undo)
- **S1** The stage is a dev scene in `DEV_MAPS`. Undo: `maps/index.ts`.
- **S2** States always walk the circle; the root motion toggle is for keyed clips only. Undo: `studioInput`.
- **S3** In place, the treadmill feet come from a per-clip pace / step table (`STUDIO_ENTRIES`) plus the clip's duty,
  lift and track width. Undo: the table or `studioFeet`.
- **S4** Keyed clips play standing (crouch clips carry their own drop). Drawn clips play with the gun out, and the
  glides aim. Undo: `studioDriveTargets`.
- **S5** Wall, hold and traversal states are keyed clips only: no props until PR 2. The wall clips play free-standing.
- **S6** Mirror samples half a cycle on.
- **S7** Speed is the loop time scale and Pause is the freeze. Scrub and key steps work in place only; the tools' Step
  still steps one sim frame. Undo: `StudioPanel`.
- **S8** The turntable spins the orbit view; it does not rotate Wren.
- **S9** The onion skin caches each key's pose as the phase passes it. The cache clears on a tuner change, a clip
  change, mirror or root motion.
- **S10** Undo merge window 0.6 s, 200 steps.
- **S11** The A/B flip keeps edits in the slot that was shown.
- **S12** Presets are not exported; they hold values only.
- **S13** Ctrl+Z / Y work while the panel is open, not only while it has focus.
- **S14** The studio turns the debug overlay on.
- **S15** The guard is a plain rig with a dummy look.
- **S16** Row placement: main menu last; Pause after the tuner row; Settings > Developer; none in co-op.
- **S17** The studio rows start at once, leaving a running match without a confirmation.

## Safety
- The drive is null on every graph outside the studio; the studio's input replaces the devices' only while a loop
  plays.
- Spin and snap move only the rendered view. Tuner defaults are unchanged.
- `dispose` turns the drive, guard, free view, spin and snap off, closes what it opened, then calls `studioReset()`.
  Exit sets the time scale back to 1.
- Nothing goes on the wire. No allocation in the drive, the treadmill or the per-step input.

## Tests
- **`tests/animStudio.test.ts`, 17 tests:**
  - The loop list and the reset.
  - The speed, advance, scrub, wrap and step maths.
  - The drive and mirror; the treadmill and its heel strikes.
  - The synthesised input.
  - A real rig: a keyed sneak drops the hips by more than 15 cm, and with no drive the rig is unchanged.
  - Undo / redo and A/B.
  - Presets, including their IndexedDB round trip.
  - The snaps and the 2x cap.
- **`scripts/e2e-studio.mjs`:**
  - Boot, then step and scrub a key; mirror; 2x speed; a state walking.
  - Undo / redo.
  - A preset saved, read back from IndexedDB and loaded.
  - No studio row inside the studio.
  - Quit leaves nothing behind; no console errors.
- **Implementer's checks:** tsc clean, eslint clean, the vitest files pass.

## What Michael should try
1. Main menu > Anim Studio (dev). Pick "keyed: walk": she walks in place; watch the feet dots and the trails.
2. Pause, "key >" / "< key", scrub, 0.25x and 2x, mirror. Turn root motion on: she walks the circle.
3. Try the clips the game does not play yet: sneak, crouch_walk, wall_slide, hold_fwd, glide_strafe.
4. Tick guard and pick guard_choke_sag, then hold_choke.
5. Try the snaps and the turntable (View brings the panel back), and the onion skin while stepping.
6. Move a slider, then Ctrl+Z and redo. Store A, change, Store B, flip. Save a preset, Reset all, Load it.
7. Quit to the menu: normal speed, nothing of the studio left.

## Polish list
- The treadmill feet have no heel-toe pitch.
- The wall clips are not side-on to a wall.
- A strafing state circles about a centre to her side.
- A state cannot play in place.
- An onion ghost needs its key to have shown first.
- The crab readout follows the debug overlay's compact / hidden setting.
- `e2e-times.json` has no `e2e-studio` entry yet.
