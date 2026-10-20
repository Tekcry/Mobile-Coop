# tuner-ui - implementer report (2026-10-21)

## Results
- **Done:** all 10 brief points.
- **Checks run:** tsc and eslint pass. Vitest: 9 files, 115 tests pass, including the new `tests/tunerLayout.test.ts`.
- **Not run:** `npm run check`, the build, e2e-menus, e2e-studio and smoke (the job lead runs these under the machine
  lock).
- **Not seen in a browser:** the panel was never opened, so nothing here confirms how it looks. The layout and colours
  rest on the code alone.

## Two bugs found while reading the code (both fixed)
- **Dark-on-dark value boxes.** A value at its default had its colour cleared (`style.color = ''`), so the box fell back
  to the browser's dark default text on a dark box. That is why "all values are missing until I click into the slider
  and move it".
- **White-on-white buttons.** The old pad focus mark cleared the focused button's inline background when the focus
  moved on, so the button showed the browser's white default. That is why only the buttons he had moved over went
  white.
- **Fix for both:** one injected stylesheet sets explicit colours on every control in the panel. The pad focus is now a
  class (`tt-focus` / `tt-edit`), never an inline style.

## What was built, per brief point
1. **Tabs.** A horizontal bar; LB / RB or a click cycles them, wrapping at the ends. Order: View, Body, Hands & feet,
   Weapon, Stepping, Weight, Camera, Keys, Co-op, any later section, Settings. The loop player and camera tools are in
   View; undo, A/B, presets, search, files and the options are in Settings.
2. **One step at a time.**
   - A tab with more than one section starts with a "Part" list.
   - Then one list per level of the group ids: State, or Weapon then State, or Clip then Key; Role on Co-op.
   - Then that group's sliders.
   - Every list is the panel's own drop-down, shown while open: A or a click opens it, the D-pad or arrows move,
     A / Enter / a click picks, B / Esc / a click outside backs out.
   - After a pick the focus steps on to the next list or the first slider; B from a slider goes back to the State list.
3. **Values visible.** Every value sits in a light box, always filled in. A changed value turns amber.
4. **Size.** The panel scales with the screen height. Settings > Size: Small (default) / Medium / Large. Width at most
   50 % of the screen (62 % narrow); height fits. The size and the pause option save in the tuner's IndexedDB store
   (key `ui`).
5. **Hint strip.** A row at the bottom of the panel with its own space, never over a row. With a pad it shows button
   glyphs (`promptHtml`, xbox / ps / nin); otherwise key and mouse help. It switches live with the input mode and
   changes with the moment: normal, open list, editing, menu, game, free camera.
6. **Loop player.**
   - Picking a loop sets the tuner's groups to match: body state, joints, limb reach, hands / gun-in-hand, stepping,
     weight, the clip's keys, co-op role A, the climb move. Follow goes off, and comes back on when leaving the studio.
   - "Loop on the spot" (default on): a moving state runs on a treadmill. After each fixed step the stage moves her
     back by what she moved, along with the planted feet and swing ends (no teleport).
   - Turning the option off walks the 2 m circle, for clips and states alike.
7. **Pause stops the game.**
   - Under the pause menu the game gets a blank input: no studio loop or free view demo input reaches her.
   - The tuner gives the pad to the menus while Pause is open, and swallows held buttons when it closes.
   - New "Pause game while tuning" option (Settings, on by default): the game holds still while the panel has the pad.
     It is edge triggered, and does not apply in the Anim Studio or in co-op.
8. **Camera snap lock.** View tab: Front / Side / Back / Top. A snap sets the lock and turns on the orbit camera while
   the pad stays on the panel. Each frame the free view takes the snap angle from her facing and keeps following her
   position; look input and the turntable do not move it. "Locked: Side" text, the active snap lit, an Unlock button;
   Off or Fly also clear it. The snaps now work outside the studio too.
9. **Plain English.** A label table plus patterns for generated sliders ("Foot width", "Knee out", "Hip height",
   "Lean", "Right elbow bend"). No brackets, "x2", "pole", "IK" or "fwd"; a unit test checks every slider. Units show
   beside values. Ids, saves, exports and the bake table are unchanged.
10. **Pad map.** In `docs/anim-tuner/STATE.md` ("Pad map") and the hint strip.

## Tab map
| Tab | Contents |
| --- | --- |
| View | Loop player (studio only); Camera: free view, snaps, Unlock, fly demo, hide HUD; Time: Pause / Step, game speed |
| Body | Parts: Body, Joints, Limb reach (ik), Climb and vault (trav) |
| Hands & feet | hand |
| Weapon | Parts: Gun hold (gun), Gun in hand (weapon) |
| Stepping | Parts: Stepping (step), Speed (speed) |
| Weight | weight |
| Camera | cam |
| Keys | keys (Clip, then Key) |
| Co-op | One part per team move (team_*), Role list |
| (later sections) | Their own tab |
| Settings | Size, pause game while tuning, follow my state, changed only, wide ranges, barrel line, find a slider, undo / redo / A-B / presets, export / share / import, reset all, clear change log |

## Pad map
| Button | Action |
| --- | --- |
| LB / RB | Tabs (wraps) |
| D-pad | Rows; moves inside an open list; steps a slider while editing |
| A | Open a list / pick / edit a slider / press a button |
| B | Back: list out, edit undone, menu closed, slider back to its State list |
| X | Reset the row |
| Y | More menu: Undo, Redo, Store A, Store B, Flip A / B, Reset this group, Reset all (A twice), Export, Share / Copy, Import, Clear change log |
| View | Swap the pad between tuner and game (or free camera); the game holds still while the tuner has it |
| Menu (Start) | Close the panel |
| Kept extras | LT / RT: previous / next state; LT held while editing: fine steps; left stick: fast adjust; R3 held: untuned |

## Files
- **New:** `src/ui/tunerLayout.ts` (tabs, group levels, plain labels, `DropNav`, `tunerScale`, `loopGroups`,
  `plainLoop`); `tests/tunerLayout.test.ts`.
- **Rewritten:** `src/ui/animTunePanel.ts`; `src/ui/studioPanel.ts` (plain labels, "Loop on the spot", the loop-pick
  callback; snaps moved to the View tab).
- **Changed:**
  - `src/ui/animTunePad.ts`: `hold()`; `setFree(on, take)`.
  - `src/ui/tuneSnapshots.ts`: labels.
  - `src/anim/studio.ts`: `STUDIO.spot`, `studioInput(..., spot)`, `studioSpot`, `spotShift`.
  - `src/game/studioStage.ts`: `afterStep` treadmill, `host.shift`.
  - `src/game/gameState.ts`: blank input under the pause menu, the `menuPaused` getter, the treadmill hook, the snap
    lock in the free view, the free view stopping under the co-op pause.
  - `src/player/freeView.ts`: `FREE_VIEW.lock`, `FreeSnap`, `FreeViewCore.lock` / `bodyYaw`.
  - `src/player/playerController.ts`: `shift()`.
  - `src/player/characterRig.ts`: `shiftWorld()`.
  - `src/anim/footPlanner.ts`: `shift()`.
  - `src/core/app.ts`: `tune.menuPaused`.
  - `src/save/animTuneStore.ts`: `ui` key.
- **Tests and scripts:** `scripts/e2e-menus.mjs` (tuner block rewritten), `scripts/e2e-studio.mjs` (new checks),
  `scripts/run-e2e.mjs` (COVERS `src/ui/tunerLayout`).
- **Docs:** CHANGELOG (Unreleased - tuner-ui), TESTING, `docs/systems/ui.md`, `docs/systems/testing-tools.md`,
  `docs/anim-tuner/STATE.md`.

## Assumed decisions (undo)
- **A1** Joints, Limb reach and Climb and vault go in Body; Speed in Stepping; both gun sections in Weapon. Undo:
  `SECTION_TAB` in `tunerLayout.ts`.
- **A2** "Pause game while tuning" applies only while the panel holds the pad with a pad in use, never in the Anim
  Studio, never in co-op. Undo: the `want` conditions in `syncTuneFreeze`.
- **A3** Loop on the spot is on by default. Undo: `spot: false` in `STUDIO`.
- **A4** A loop pick turns follow off. Undo: `applyLoop`.
- **A5** Default size Small. Undo: the `size` field default.
- **A6** Labels are a display table; registry labels (and so exports) are unchanged. Undo: delete the `PLAIN` entries.
- **A7** Old map extras kept (LT / RT state, left / right between controls outside edit). Undo: `padGroup` /
  `TunePadCtl`.
- **A8** Each list keeps a hidden native select (`.anim-tune-pick-<id>`), so smoke and existing code still work.

## Tests
- **Vitest (`tests/tunerLayout.test.ts`):**
  - tab order, mapping and wrap;
  - group levels;
  - plain labels;
  - the `DropNav` state machine;
  - pad hold and `setFree`;
  - size scaling;
  - the loop-to-group map for every studio entry;
  - the snap-lock maths;
  - on-the-spot input.
- **e2e-menus:**
  - opens on Body with the game held;
  - values readable;
  - the hint strip under the rows;
  - the LB / RB tab sequence;
  - the list opens, moves, backs out and picks;
  - slider edit, cancel, keep and reset;
  - the Y menu;
  - RT state;
  - left stick blocked;
  - View to game and back;
  - Start closes.
- **e2e-studio:**
  - a loop pick sets groups;
  - walk on the spot (root < 5 cm, speed > 0.8 m/s);
  - on the spot off still moves;
  - the side snap lock holds within 0.05 rad as she turns;
  - pause stops the player.

## What Michael should try (pad)
1. Pause > Animation tuner (dev): the game holds still. LB / RB through the tabs.
2. On Body, A on State: the list shows. Pick Walk; the focus jumps to the sliders and every value is readable.
3. Settings > Size: Medium / Large, on the PC and the phone.
4. Anim Studio: pick "Walk". She walks on the spot. View > Side: the camera holds her side. Untick "Loop on the spot":
   she walks the circle and the camera keeps her side. Unlock.
5. Pause during a loop: she does not move and the pad drives the menu.

## Polish list
- The treadmill shows a sawtooth under one fixed step of the rendered root (~2 cm walk, ~7 cm run).
- A list's button text updates on the next 250 ms refresh after its options are renamed.
- The tab bar scrolls sideways on narrow screens (no arrows).
- The Settings checkboxes are browser-styled.
- The Import file picker may not open from a pad press (browser gesture rule).
- The pass-2 bullets in `docs/systems/ui.md` and `docs/anim-tuner/PAD.md` are history.

## Fix round (after CHECK.md)
1. A State picked by hand on the Body part now carries to Joints, Limb reach, Hands & feet, Gun in hand (weapon kept),
   the gun hold where it maps (low ready, aim, crouched aim), Stepping and Weight; a section only takes a group it has.
   A pick in any other section stays local. Pure mapping `bodyCarry` in `src/ui/tunerLayout.ts` (shared with the loop
   pick: `carryBody` in the panel); unit tests in `tests/tunerLayout.test.ts` (walk, aim, crouch walk, ladder, every body
   state maps only to groups that exist).
2. Folded panel: `.anim-tune [hidden]{display:none!important}`, so the tab bar (and any hidden child with a display
   rule) hides.
3. e2e-studio snap lock: the camera angle is measured against `FreeViewCore.bodyYaw` (the yaw the lock reads), tolerance
   0.02 rad, so a rendered frame of lag cannot flake it; the body-turn check (> 0.3 rad) is unchanged.
Checks: tsc and eslint clean; vitest tunerLayout, animTunePad, animStudio, freeView pass (49 tests). e2e not run.
