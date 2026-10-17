# UI
Purpose: HUD, menus, the screen stack, platform and display handling, feedback and photo mode.
Design authority: docs/design-bible.md (Section 5.10)

## UI
- HUD (Blacklist-minimal, `Hud.setAccess` per frame from `settings.access`): health = the screen-edge vignette
  (bars optional, `.no-hbar`), the weapon readout fades (`.quiet`) 3 s after the last change, hold ring on the use
  prompt (`setInteract(text, progress)`), subtitles (`BarkView.subtitles`), colour-safe arcs
  (`AwarenessArcs.colorSafe`), `--hud-scale` (CSS `zoom`), camera `shakeMul`, held actions by tap
  (`access.holdToggle`, `GameState.holdLatch`). `ControlsScreen` (Settings > Accessibility): a Controller and a
  Keyboard & mouse tab to remap (locomotion step 18, D7: `bindPanel`: two slots per verb, "press a button / key"
  capture with a 5 s timeout, conflict warnings on both rows and a summary, reset per device with a confirm; pad: A
  rebinds, Y clears, B held 1 s cancels) and the fixed Touch list (`CONTROLS.touch`). Settings > Mouse & Keyboard
  shows the same keyboard panel; Settings > Gameplay has hold / toggle for aim, crouch, sprint, back to wall, grab.
- Training (`game/training.ts` pure steps, `modes/trainingMode.ts`, Proving Grounds, `?mode=training`): passive
  guards (`Enemy.passive`), invulnerable operator, a step skipped after 90 s.
- Forced landscape (3.1.6, `core/viewRotation.ts`): a coarse pointer in a portrait window turns the page
  (3.2.4: `turnFor` - clockwise after the landscape angle 90 (default), anticlockwise `body.rotated.ccw`
  `translateY(--scr-h) rotate(-90deg)` after 270 / -90, from `screen.orientation.angle` / `window.orientation`; phones
  call `lockLandscape` on the first tap where the browser allows a lock) (`body.rotated`: `translateX(--scr-w) rotate(90deg)`, `--vw` / `--vh` swapped - styles use `calc(N * var(--vw))`,
  never raw `vw` / `vh` - and the safe areas remapped). Pointer positions and boxes arrive in screen space: read them
  through `vx(e)` / `vy(e)` / `viewRect(el)` / `viewWidth()` / `viewHeight()`, never `clientX` / `innerWidth`.
  `e2e-lib` `launch({ touchViewport })` emulates the phone upright.
- Touch scrolling: `pwa.suppressBrowserGestures` lets a drag through when it starts inside `.scrollable` or any
  element that overflows with `overflow: auto / scroll` (`canScroll`); everything else is the game's. The back
  button (`Screen.attachChrome`) sits top left (screens get `.with-back` padding) and acts on pointer up.
- Menu backdrop (`world/menuScene.ts` `MenuState`): a dark stage - `LIGHTS` (warm key over the operator, cool rim
  behind, a distant lamp) as `SpotLight`s with additive `lightCone` beams (vertex alpha over height subdivisions),
  a dim hemispheric fill (brighter while customising), the lens glow on; the camera's `targetScreenOffset` puts
  the operator in the right half beside the menu. `setFraming('menu' | 'loadout' | 'weapon')`; `setAvatar(look,
  weapon, camo, attachments)` rebuilds only when the key (`shown`) changes; `ui/screens/operator.ts`
  `showSavedOperator` puts the saved look back.
- Loadout (`ui/screens/loadoutScreen.ts`, the only upgrade / customisation screen; Splinter Cell: Blacklist's gear
  screen): an SBD-NET bar (next challenge, level, credits); a stack of list `Page`s on the left (breadcrumb, title,
  subtitle, `Row`s: label, value / price / `LV n`, marks equipped (check) / locked (lock) / tune (wrench) / go
  (chevron), group headers); the operator in the middle; the focused row's details on the right (Power / Accuracy /
  Range / Control segment bars with the change green / red, magazine, silenced, fire mode, upgrades; suit totals);
  the action bar along the bottom (A `act`, Y `alt`, B back; tappable). Pages: root (loadout preset, primary,
  secondary, gadget, suit, appearance, tag & emotes, HQ, challenges) > weapon list per slot > a weapon's attachments
  & upgrades > camo; suit > part > tiers; appearance > part options / colours; tag (a form); HQ; challenges.
  Focusing a row previews it (`resetDrafts` then `row.preview`: weapon in hand, attachments, camo, look, suit),
  locked items too; A equips / buys (then equips) / opens; B pops a page. Owned choices save at once. Touch: a tap
  on a row not focused previews it, a tap on the focused row (or the action bar) acts.
- Platform (3.0, `core/platform.ts` pure: `detectPlatform` from touch points / fine pointer / viewport / user agent,
  `video.platform` Auto / Desktop / Mobile, `?platform=`; `App.applyPlatform` sets `body.platform-desktop|mobile`,
  `can-touch` and `--ui-scale`): desktop lays the menus out for 1280 x 720 and scales `.screens` (transform) and the
  HUD panels (zoom) to the window (`uiScale`); hides the Touch settings tab (unless `touch`), the forced landscape and
  the auto fullscreen; Settings gets Mouse & Keyboard (first on desktop) and the Graphics tab (`graphicsTab`: preset,
  every feature, display; `refreshWidgets` re-reads rows after a preset change). The touch layer still follows the
  input mode (a touchscreen laptop gets it when touched).
- Displays (3.0, `core/display.ts` pure): ultrawide - `.screens` on desktop is a 16:9 layout scaled by height and
  centred (`left: 50%`, `scale() translateX(-50%)`), the stage fills the sides; the gameplay camera is Hor+ from
  `video.fovH` at 16:9 up to `video.maxFov` (default 120), then Vert- (`vfovFor`, `ShoulderCamera.vfov`, also the
  gadget feeds); `video.hudWidth` auto / 16:9 / 21:9 / full -> `--hud-inset` (`hudInset`; auto = 16:9 above 2.6:1)
  folded into the HUD's `--sal` / `--sar` (divided by the panels' zoom), so world prompts, arcs, markers and pings
  stay full width. GPU: `App.gpu` from the unmasked renderer (`classifyGpu`: discrete / integrated / software); a
  desktop on the integrated GPU gets one notice (`video.gpuNotice`; never under `navigator.webdriver`), Settings >
  Graphics > GPU shows it, feedback context carries it with the output resolution, aspect and refresh. The engine
  asks for `powerPreference: 'high-performance'`. Photo mode saves at full output resolution (<= 7680 px, JPEG
  quality stepped down to stay under 8 MB).
- Feedback (3.0, `feedback/feedback.ts` pure: `FeedbackEntry` category / text / context / photo Blobs, `sanitizeFeedback`,
  `feedbackText`, `feedbackReportHtml`; `FeedbackStore` = IndexedDB `kv` 'feedback', `App.feedback`):
  `ui/screens/feedbackScreen.ts` (`FeedbackFormScreen`, Settings > Feedback `feedbackTab`, Pause > Report feedback,
  `exportFeedback` -> one HTML file via `ui/fileOut.ts` share / download). Context: the state's `feedbackContext()`
  (GameState: map, mode, position, facing, enemies) + version, platform, graphics, frame times; 3.1.7: `settings` /
  `changed` from `settingsDigest` (core/settings.ts, pure: every video setting; the rest only where it differs from
  the defaults), values up to `MAX_CONTEXT` 2000, `feedbackText` (Copy as text) puts the context under each line,
  benchmark notes use the full `feedbackContext`. Photo mode
  (`ui/screens/photoMode.ts` `PhotoModeScreen` on a `PhotoHost`: `photoCamera()` / `photoFreeze(on)`; GameState flies
  its own FreeCamera so the post stack stays on, the menu stage gets a stand-in camera): `body.photo-mode` hides the
  HUD, touch layer and every other screen; free camera (move / look / up-down by keys, sticks, drags); a photo is the
  next rendered frame copied off the canvas (no DOM in it), max 1920 px JPEG; keep / retake (Y) / cancel (B).
- Theme (`styles.css` `:root`): dark green palette (`--accent` #38e08c, `--gold` credits), condensed font stack;
  main menu = stacked logo + `.menu-item` list; `TabView(tabs, { side: true })` = vertical icon nav (no bumper
  glyphs; LB / RB still cycle through `cycle`). 2.3 compact pass at the end of the file (32 px rows, 17 px titles,
  narrower Play / Settings so the operator shows).
- Every menu is a `Screen` on the `ScreenManager` stack. `FocusNav` is shared: any element with `data-focus`
  is navigable; `data-adjust` elements take left/right as `nav-adjust`; `data-capture-nav` elements take all
  directions as `nav-dir`; confirm fires `nav-confirm` then `click`; `data-wrap` containers wrap.
- Use `ui/widgets.ts` (button, toggle, slider, choice, TabView, Dialog). They work identically by touch and pad.
- Screens give footer `hints()`; prompts render glyphs for Xbox / PlayStation / Nintendo / keyboard, picked by CSS (step 17).
- Menus register entries via `MainMenuScreen.entries` and settings tabs via `extraSettingsTabs`.
- No `backdrop-filter` over the canvas (expensive on phones). `.screens` container is pointer-events: none;
  children opt in.

## 3.5 title
- The game's name is Night Shift (main menu `NIGHT` / `SHIFT`, boot screen, page and app titles, install manifest "Night Shift" / "Night Shift (Preview CT)", short name
  "NS CT"). The internal ids keep the old names: IndexedDB `shoulder-strike`, the save export magic `shoulder-strike-save`, the co-op app id.

## Health bar and medkits (locomotion step 15)

- `access.healthBar` now defaults on (a stored false is kept); with it off the screen-edge damage vignette is the only health readout.
- Beside the health number: the kit count (`+N kits`, dimmed at 0, shown with the bar on or off). During a medkit use a pale fill after the health fill shows the heal still to come (`HudFrame.kits`, `heal`). Phone legibility: pending PC run.

## Pad-first controls (locomotion step 17)

- Prompts (`ui/prompts.ts` `promptHtml`) emit Xbox, PlayStation, Nintendo (`GLYPHS.nintendo`) and key glyphs; the body
  classes `input-gamepad` + `pad-ps` / `pad-nin` (from `InputManager.applyModeClass`) show the pad glyph whenever a pad
  is the last device used. The binding table for every verb: `docs/systems/input-and-loop.md` "Binding table".
- HUD gear pips (`hud.setGear(gear, changes, max)`): the current (snapped) gear lit, gears up to the maximum dim, shown
  for 1.5 s after a change. The touch speed rocker and its pips are gone (D1).
- Touch basic scheme (D1, A65): move, look, aim, fire / elbow, crouch, jump, vision, one context button (takedown,
  door peek, use, traversal), reload, pause. The layout editor lists only these; `TOUCH_LAYOUT_VERSION` 7 resets stored
  layouts.
- Settings > Controller: Vibration (on / off), Rumble strength (`gameplay.rumble` 0-100%, the rumble table in
  `config/rumble.ts`), Test vibration.

## Custom difficulty (locomotion step 19, D7)

- `ui/difficultyRows.ts` `difficultyRows(app, get, set, onChange)`: the Difficulty choice (Rookie, Normal, Realistic,
  Perfectionist, Custom), three sliders (Guard perception, Guard aim, Alarm tolerance; 0.5-2.0, step 0.1) and the
  Custom base preset (shown only on Custom). On a preset the sliders show its values; moving one switches to Custom
  from that preset; picking a preset makes it Custom's base. Rows update in place (no rebuild), so a mouse drag keeps
  going; pad left / right steps a slider. The sliders persist in `gameplay.customDifficulty` (A3). Rows carry
  `data-diff` (`choice`, `perception`, `aim`, `alarm`, `base`) for the e2e suites.
- Used by the play screen (both builds; hidden in Free Roam) and the co-op host's lobby (`compact`: the sliders and
  base show only on Custom, so the lobby actions stay clear of the hints bar). A co-op client sees one
  read-only row (`customSummary`: "Custom (Normal base): perception 0.50, aim 1.00, alarm 2.00").
## Course HUD (training course, T1c)
`src/ui/hud/courseHud.ts`: the current bay's drills in teaching order with a P1 and a P2 tick column (a dash where the
drill is not that player's), and this player's current step in large type (LANTERN's line; `{Y}` / `{Y:traverse}`
tokens become prompt glyphs that follow the input mode). DOM is written only when the bay, the ticks
(`CourseState.gen`) or the end change. A drill done shows a toast and LANTERN's line ("Moth: vault - done"). The next
drill's marker is drawn by `PingView.marker` (on screen or on the edge); Settings > Gameplay "Course markers"
(`gameplay.courseMarkers`, default on) hides it. The results screen shows a course panel (`SessionStats.course`:
per-bay time, team and per-player numbers, the finale's Ghost / Silent / Loud tier, `courseRating.ts`) on the host and
the client; it is reached through the course end device ("Finish", `devices.end` in the last bay), refused while that
bay's drills are open. The co-op lobby reads the course record again whenever it is shown ("Start at bay N").
T5b (R5, R6): the objective list is always on screen for both players from spawn ("B<n> - objectives": each drill
named, ticked per player, the current one highlighted, then the airlock row); it has no toggle. Below it the airlock status
line (`.ch-air`, `CourseState.airlockStatus`) shows "Waiting for partner" with one player on the pad, the refusal naming
the open objectives (or "Revive first") with both on it, and the cycle while it runs; it is hidden otherwise. Airlocks have
no Cycle button: each has an emissive floor pad outline (`buildAirlockPads`, visual only).
