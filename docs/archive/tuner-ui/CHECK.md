# tuner-ui - checker report (2026-10-21)

Commit checked: `cc3ab8e8` on `feature/tuner-ui`. A read-only review by a fresh checker.

## Verdict: PASS

There are no blockers. Nothing breaks for a player who never opens the tuner. All 10 brief points are done; point 3 is
done as the brief worded it, with a gap noted below. The fix round can take polish items 1-3 if the job lead wants them.

**Checks run here**
- `npx tsc --noEmit -p .`: clean.
- `npx eslint` on the 15 changed source and test files: clean.
- `npx vitest run` on tunerLayout, animStudio, freeView and footPlanner: 4 files, 48 tests pass. An earlier run on
  the loaded machine reported 3 collection errors (timeouts); the rerun was clean.

**Not run:** e2e, the build and `npm run check`. The job lead owns those.

## 1. Gameplay outside the tuner

- **Blank input under the pause menu** (`src/game/gameState.ts:1559`, `:2240`)
  - **Single player:** under Pause, `simulating` is false, so `loop.paused` is set (`app.ts:392`). `fixedUpdate`
    never runs and `frameUpdate` gets dt 0.
    - The `fixedUpdate` change is a no-op in single player.
    - The `frameUpdate` change hands `player.frameUpdate` a zero move instead of the studio's or free view's move. With
      dt 0 that only zeroes the anticipation intent.
  - **Held input:** `setGameplayActive(false)` already calls `releaseAll()` on the real input when the menu opens.
    `menuInp` is never written, so it has no edges and no stuck state, and the real input comes back on resume. No
    press is lost that the old code kept.
  - **Co-op:** the shared sim keeps running under Pause. That is by design (`pause()` comment and the Resume text: "It
    kept running while you were here").
    - Before: `fixedUpdate` read the device input while the menu was open, so menu navigation (stick, buttons) reached
      the sim.
    - Now: the local player stands. That is an improvement.
    - No `src/net` file changed, nothing reads `menuInp` for the wire, and `PROTOCOL_VERSION` is untouched.
  - **Free view:** it now stops under the co-op pause (`:1883`). That only touches the dev free view.
- **The `shift()` methods** (`playerController.shift`, `characterRig.shiftWorld`, `FootPlanner.shift`)
  - The only caller is the `StudioHost.shift` closure (`gameState.ts:810`), and that only runs from
    `StudioStage.afterStep`.
  - The `StudioStage` is created only on the studio map, never with `opts.net` (`gameState.ts:791-793`).
  - `afterStep` returns at once unless the studio drives a moving state with "Loop on the spot" on.
  - No player, partner or guard can be shifted in normal play.
  - **No allocation:** `shiftTmp` is a field, and Babylon's `getPosition` / `setPosition` return and copy the stored
    vector. The planner and rig shifts are plain field writes.
- **The snap lock**
  - `FREE_VIEW.lock` only acts in `FreeViewCore.update` when the mode is `orbit`.
  - Off or Fly clear it (`setFreeMode`), and closing the panel sets the free view off.
  - It changes only the free camera's yaw and pitch. Gameplay keeps reading `cam.gamePos`; perception, aim and light
    never read the free camera. The free view already took the look before this change.
  - No leak.

## 2. The brief, point by point

| # | Point (Michael's words) | Status | Notes |
| --- | --- | --- | --- |
| 1 | "l1/r1 cycle tabs horizontally", logical order | Done | View, Body, Hands & feet, Weapon, Stepping, Weight, Camera, Keys, Co-op, Settings; wraps; LB / RB glyphs at the ends of the bar. |
| 2 | "drop down list that shows when I click into a list" | Done | The panel's own list, visible while choosing: A or click opens, D-pad or arrows move, A / Enter / click picks, B / Esc / click outside backs out. The hidden native selects keep tests and code working (A8). |
| 3 | "cycled through menus one at a time, ie select body state first then work through animations" | Done (per the brief) | Inside a tab: Part, then State (or Weapon, then State), then the sliders; focus steps on after a pick; B from a slider goes back to the State list. **Gap:** a manual State pick sets only that section and turns follow off, so each other tab needs the state picked again (polish 1). |
| 4 | "All values are missing until I click into the slider" | Done | Root cause found (inline `style.color = ''` fell back to dark text). Every value box now has an explicit fg / bg and is always filled; changed values are amber. |
| 5 | "Make ui adapt so it's not so big" | Done | Font scales with screen height; S / M / L in Settings (saved in key `ui`); width at most 50 % (62 % narrow), about 408 px at 1080p Small. |
| 6 | "Help text also shouldn't cover any UI" | Done | The hint strip is a flex row in the panel's own flow, under the info line, never over a row; e2e-menus asserts it. |
| 7 | "Setting the loop should automatically change the state"; "loop on the spot" | Done | `applyLoop` sets body, joint, limb reach, hand / gun in hand, stepping, weight, keys, co-op role and climb groups. "Loop on the spot" (default on, A3) runs a treadmill; off walks the circle. |
| 8 | "Character also moves in pause menu" | Done | Blank input under Pause (single player and co-op), the tuner hands the pad to the menus while Pause is open, and "Pause game while tuning" (on by default, not in the Studio or co-op, A2). See note 8 in the polish list about the test. |
| 9 | "plain English, no filler, simplified. Use button symbols" | Done, small gaps | Label table plus patterns, unit-tested for every slider; pad glyphs in the hint strip, switching live. Gaps in polish 5. |
| 10 | "Selecting front/side views ... locked to that angle" | Done | Lock holds the snap angle to her facing every frame (look and turntable ignored), shown as "Locked: Side" with Unlock; works outside the Studio; e2e-studio asserts it. |

## 3. The colour fix

The injected stylesheet (`src/ui/animTunePanel.ts:113-171`) gives every control an explicit colour, so no browser
default shows through:
- **Colours on every control:** `.anim-tune button, input, select, textarea` all get an explicit `color` and
  `-webkit-text-fill-color` (the second one matters for Safari).
- **Backgrounds:**
  - `.tt-btn` (every `mkBtn` and every drop-down button): `#22303c`.
  - The tabs: `#22303c`; the active tab: `#2d5a78`.
  - Number, text and search inputs and the textarea: `#0b1218`.
  - The drop list: `#0d171f`.
  - `.tt-x`: transparent on the panel, with the dim foreground.
- **No native look:** `appearance: none` is set on buttons and text inputs, so iOS Safari's light native look is gone.
- **Focus:** the pad focus is now a class (`tt-focus` / `tt-edit`) with a translucent tint over the dark panel. No
  inline style is cleared any more; a grep finds no inline `style.color` or `style.background` left in the tuner.
- **Selects:** every native select is `hidden` (A8). None can show browser white.
- **Disabled controls:** they keep the author colour at 45 % opacity, which is still readable.
- **Contrast:** about `#e2edf5` on `#0b1218`-`#22303c`, around 12:1 or better. Amber changed values on `#0b1218` are
  about 10:1.
- **Not covered:** checkboxes and ranges use the native look with `accent-color` (on the polish list already).
  Placeholders: see polish 7.

## 4. Saves, exports, bake table

They are unchanged:
- No `src/anim/tune*` file and no registry file changed.
- `animTuneStore` only adds the key `ui` (`{ size, pauseTuning }`) beside `current` and `presets`. Nothing lists or
  clears every key.
- Labels are display only (A6): `t.label` and ids still feed the export and the bake table.
- The preset UI only changed its label text.

## 5. Hard rules

- **No per-frame allocation in the hot paths:**
  - The treadmill (`afterStep`, `spotShift` into `spotD`), the snap lock (`freeSnap` into the core) and `DropNav`:
    nothing allocated.
  - `frame()` per frame: `syncTuneFreeze` is property reads and one `classList.contains`.
  - The 250 ms refresh builds strings and reads `offsetParent`. That is UI, not a hot path, and the same as before.
  - `padItems()` allocates, but only on input.
- **Babylon:** imported only through `../core/babylon`.
- **No `localStorage`** in the diff.
- `Math.hypot` appears only in the e2e scripts and tests, never in `src`.

## 6. e2e-menus and e2e-studio

- **e2e-menus:** the selectors are by class and the `__animTune.pad()` state, so it does not depend on layout.
  `press()` is one poll each. The freeze is checked after `frames(3)`, and `syncTuneFreeze` runs in `frame()` every
  frame. The colour asserts sum RGB on computed styles, which is robust. The later free-view and marker checks still
  hold: the auto-freeze lifts while the pad is in free mode and comes back after `free('off')`, and `hide()` unfreezes
  before the results block.
- **e2e-studio, on the spot:** stable. The treadmill re-anchors at the first step of the new entry, and the root is
  read after the step's shift.
- **e2e-studio, snap lock (`scripts/e2e-studio.mjs:99`): likely to flake.**
  - The free view's `bodyYaw` is read in `freeFrame`, before `player.frameUpdate` writes `root.rotation.y`. The
    camera therefore trails the body by one rendered frame of turn.
  - The test compares `f.yaw - root.rotation.y` across two real-time frames: about 0.7-0.8 rad/s × the difference in
    frame time.
  - SwiftShader frames of 30-100 ms (realDt is capped at 0.1 s) can reach the 0.05 rad tolerance.
  - Fix: compare `f.yaw - f.bodyYaw` (exact), or widen the tolerance to 0.1 (polish 3).
- **e2e-studio, pause stops the player:** deterministic. It would also pass on master, though (see polish 8).

## Polish list

1. **The State pick should carry across tabs** (Michael: "select body state first then work through animations").
   - Today a manual pick in Body sets only the Body section and turns follow off. Hands & feet, Stepping and Weight
     stay on the old state.
   - Fix: on a level-0 State pick in `pickLevel` (`animTunePanel.ts:1108`), map the state to the other sections the
     way `applyLoop` does for a loop (body, joint, ik, hand / weapon last level, `step.` / `weight.` through the
     `BODY_STEP` / `BODY_WEIGHT` maps).
   - It is cheap, and it is the strongest reading of his words. A good fix-round candidate.
2. **The folded panel still shows its tab bar.**
   - Cause: `.anim-tune .anim-tune-tabs{display:flex}` (`animTunePanel.ts:129`) overrides the `hidden` attribute set
     in `setFolded`.
   - Fix: add `.anim-tune [hidden]{display:none!important}` to the CSS.
3. **The e2e-studio snap-lock assert can flake** (section 6). Compare against `f.bodyYaw`, or widen to 0.1 rad.
4. **Treadmill sawtooth** of about 2 cm walking and 7 cm running on the rendered root, as the report says.
5. **Hint strip gaps.**
   - "Right stick: orbit / look" has no glyph (`animTunePanel.ts:1603-1604`).
   - "` held: untuned", "Pad: tuner" and "Reset all (A twice)" are still jargon.
6. **Co-op Pause, not a regression:** `updateInteract` (`gameState.ts:1158`, `:1179`) and `updateVision` (`:2291`)
   still read `app.input.state` directly while the co-op pause menu is open. Menu presses on those actions can still
   reach the running sim. Worth a follow-up next to this change.
7. **Placeholders in Safari:** with `-webkit-text-fill-color` set on inputs, the placeholders ("Find a slider",
   "Preset name") may show at full brightness and read like values. Fix: add
   `.anim-tune ::placeholder{color:var(--tt-dim);-webkit-text-fill-color:var(--tt-dim)}`.
8. **The "pause stops the player" test proves little.**
   - It would already pass on master, because the single-player pause stops the loop.
   - The paths this job actually changed have no test: the co-op `menuOpen` blank input and the tuner auto-pause in a
     match. The latter is covered in e2e-menus.
   - Consider an e2e-coop assert that the paused client stands while the sim runs.
9. **The locked camera trails a turning body by one rendered frame** (the `bodyYaw` read order in `freeFrame`). It is
   not visible at normal frame rates.
10. **REPORT.md wording:** it says values sit in a "light box"; the CSS gives a dark box with light text. That is
    readable; only the description is wrong.
11. The report's own list still stands: list button text lags 250 ms after a rename, the tab bar scrolls sideways on
    narrow screens, the checkboxes are browser-styled, and Import may not open from a pad press.
