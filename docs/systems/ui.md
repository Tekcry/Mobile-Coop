# UI
Purpose: HUD, menus, the screen stack, platform and display handling, feedback and photo mode.
Design authority: docs/design-bible.md (Section 5.10)

## UI
- HUD (Blacklist-minimal, `Hud.setAccess` per frame from `settings.access`): health = the screen-edge vignette
  (bars optional, `.no-hbar`), the weapon readout fades (`.quiet`) 3 s after the last change, hold ring on the use
  prompt (`setInteract(text, progress)`), subtitles (`BarkView.subtitles`), colour-safe arcs
  (`AwarenessArcs.colorSafe`), `--hud-scale` (CSS `zoom`), camera `shakeMul`, held actions by tap
  (`access.holdToggle`, `GameState.holdLatch`). `ControlsScreen` (Settings > Accessibility) lists bindings per
  input type (`CONTROLS`; keep it in step with the mappings).
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
- Screens give footer `hints()`; prompts render glyphs for Xbox/PlayStation/keyboard, picked by CSS.
- Menus register entries via `MainMenuScreen.entries` and settings tabs via `extraSettingsTabs`.
- No `backdrop-filter` over the canvas (expensive on phones). `.screens` container is pointer-events: none;
  children opt in.
