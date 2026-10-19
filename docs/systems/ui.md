# UI
Purpose: the HUD, menus, the screen stack, display handling, feedback, photo mode and the course HUD.
Design authority: docs/DECISIONS.md (G77, G107, G108, G113), then docs/design-bible.md (Section 5.10).

Desktop only (G12): pad first, then keyboard and mouse. Menus follow the Arkham Knight style plan
(feature/menu-ui-spec, G77) and are rebuilt after the prototype (G113); only the in-game HUD follows CT's layout (G77).
What follows is the UI as built today; "decided, not built yet" marks where the decisions differ.

## HUD
- `Hud.setAccess` per frame from `settings.access`: health = the screen-edge vignette plus the health bar
  (`access.healthBar`, default on; off leaves the vignette as the only readout), the weapon readout fades (`.quiet`) 3 s
  after the last change, a hold ring on the use prompt (`setInteract(text, progress)`), subtitles
  (`BarkView.subtitles`), colour-safe arcs (`AwarenessArcs.colorSafe`), `--hud-scale` (CSS `zoom`), camera `shakeMul`,
  held actions by tap (`access.holdToggle`, `GameState.holdLatch`). No medkit count: health comes back only at wall
  stations (G20, G98).
- Speed gear pips (`hud.setGear(gear, changes, max)`, shown `GEARS.pipsShow` 1.5 s after a change). Decided, not built
  yet: no gear or stance indicator on the HUD (loco M25 (7), G107: the body shows the stance).
- Decided, not built yet: mission objectives live in the menu, as in CT (G108); the Fallow course keeps its always-on
  list (below). The HUD layout follows CT (G77).

## Menus and screens
- Every menu is a `Screen` on the `ScreenManager` stack. `FocusNav` is shared: any element with `data-focus` is
  navigable; `data-adjust` elements take left / right as `nav-adjust`; `data-capture-nav` elements take all directions
  as `nav-dir`; confirm fires `nav-confirm` then `click`; `data-wrap` containers wrap.
- Use `ui/widgets.ts` (button, toggle, slider, choice, TabView, Dialog); they work the same by pad and mouse.
- Screens give footer `hints()`; prompts (`ui/prompts.ts` `promptHtml`) render Xbox, PlayStation, Nintendo
  (`GLYPHS.nintendo`) and key glyphs; the body classes `input-gamepad` + `pad-ps` / `pad-nin` (from
  `InputManager.applyModeClass`) show the pad's glyphs whenever a pad is the last device used. The binding table:
  `docs/systems/input-and-loop.md`.
- Menus register entries via `MainMenuScreen.entries` and settings tabs via `extraSettingsTabs`.
- Controls (`ControlsScreen`, Settings > Controls > Remap controls, the one Controls place: no Pause item, menu-notes A2; loco D7): a Controller and a Keyboard & mouse tab to remap
  (`bindPanel`: two slots per verb, capture with a 5 s timeout, conflict warnings on both rows and a summary, reset per
  device with a confirm; pad: A rebinds, Y clears; Esc cancels, and on the pad holding B 1 s cancels). Decided, not
  built yet (G22): Menu / Start or Esc cancels a capture and B stays bindable.
  Settings > Controls also holds hold / toggle (aim, crouch, back to wall, sprint) and the pad sensitivities.
- Settings > Controller: Vibration (on / off), Rumble strength (`gameplay.rumble` 0-100%, `config/rumble.ts`), Test
  vibration.
- Difficulty (`ui/difficultyRows.ts`): one row, CT's fixed levels Rookie, Normal, Realistic, Perfectionist (G106; no
  sliders). Shown on the Play screen (hidden in Free Roam) and in the co-op host's lobby; a client sees the host's level
  read-only. Rows carry `data-diff` for the e2e suites.
- Loadout (`ui/screens/loadoutScreen.ts`): a stack of list `Page`s on the left (breadcrumb, title, `Row`s with value,
  equipped / locked / tune / go marks), the operator in the middle, the focused row's details on the right (segment
  bars, magazine, suppressed, fire mode), the action bar along the bottom (A act, Y alt, B back). Legacy off: root =
  preset, primary, secondary, gadget > weapon list per slot > attachments. Focusing a row previews it; owned choices save
  at once. With `?legacy=1` the parked economy pages return (suit, appearance, tag, HQ, challenges, upgrades, camos, the
  credits bar; modes-and-progression.md).
- Menu backdrop (`world/menuScene.ts` `MenuState`): a dark stage - `LIGHTS` (warm key over the operator, cool rim behind,
  a distant lamp) as `SpotLight`s with additive `lightCone` beams, a dim hemispheric fill (brighter while customising),
  the lens glow on; the camera's `targetScreenOffset` puts the operator in the right half. `setFraming('menu' |
  'loadout' | 'weapon')`; `setAvatar(look, weapon, camo, attachments)` rebuilds only when the key changes;
  `ui/screens/operator.ts` `showSavedOperator` puts the saved look back.
- Theme (`styles.css` `:root`): dark green palette (`--accent` #38e08c; `--gold` for the parked credits), condensed font
  stack; main menu = stacked logo + `.menu-item` list; `TabView(tabs, { side: true })` = vertical icon nav (LB / RB
  cycle). No `backdrop-filter` over the canvas (blurring over WebGL is expensive). The `.screens` container is
  pointer-events: none; children opt in. The back button (`Screen.attachChrome`) sits top left.
- Launch and title (menu-notes M1, M2): `index.html` #boot shows only the NIGHT / SHIFT wordmark in the title's own
  position; `MenuState.prepare` (`world/menuGate.ts`, pure) holds it until the hero LOD is drawn, both weapon meshes
  are in and the stage's materials are ready (12 s with no bytes arriving, 120 s cap, 12 s under webdriver, `?bootCap=`
  override; errors still reveal). Then `TitleScreen.arm()` fades in only the prompt; presses before that are ignored.
  The title stage is pure black (spots, hemi, ambient, goggle emissive at 0). The press (`ui/titleSequence.ts`) fades the
  wordmark and prompt out; the title stays on top, empty, while the goggles flicker on T1 in full darkness, then the
  lights rise and the main menu fades in under it (M3); a second press skips to the lit menu (A3). Launch only; after a
  match the stage is lit at once. No green spill light on the face (it read as a glow on the helmet, M4). Back on the main menu does
  nothing (A1). Read-backs: `MenuState.heroLod`, `heroLodWanted`, `bootGate`, `titleLight`. Match loads keep the
  status-line boot screen.
- Menu void weapons (menu-notes notes 5-6): every void shot holds the Blender rifle or pistol (`world/menuPoses.ts`
  picks the hold per shot; the other weapon sits in its carry slot); the gun shows only once its mesh has loaded.
- Title: Night Shift (main menu `NIGHT` / `SHIFT`, boot screen, page and app titles, install manifest; a preview build
  is "Night Shift (Preview ...)"). The internal ids keep the old names: IndexedDB `shoulder-strike`, the save export
  magic `shoulder-strike-save`, the co-op app id.

## Display (`core/display.ts`, pure)
- `App.applyUiScale` sets `--ui-scale` (`uiScale(w, h)`: menus laid out for 1280 x 720, `.screens` scaled by
  transform and the HUD panels by zoom) and `--hud-inset`.
- Ultrawide: `.screens` is a 16:9 layout scaled by height and centred, the stage fills the sides; the gameplay camera is
  Hor+ from `video.fovH` at 16:9 up to `video.maxFov` (default 120), then Vert- (`vfovFor`, also the gadget feeds);
  `video.hudWidth` auto / 16:9 / 21:9 / full -> `--hud-inset` (auto = 16:9 above 2.6:1) folded into the HUD's `--sal` /
  `--sar`, so world prompts, arcs, markers and pings stay full width.
- GPU: `App.gpu` from the unmasked renderer (`classifyGpu`: discrete / integrated / software); an integrated GPU gets
  one notice (`video.gpuNotice`; never under `navigator.webdriver`); Settings > Graphics > GPU shows it. The engine asks
  for `powerPreference: 'high-performance'`. Settings > Graphics: graphics-quality.md.

## Feedback and photo mode
- Feedback (`feedback/feedback.ts` pure: `FeedbackEntry` category / text / context / photo Blobs, `sanitizeFeedback`,
  `feedbackText`, `feedbackReportHtml`; `FeedbackStore` = IndexedDB `kv` 'feedback'): `FeedbackFormScreen` (Settings >
  Feedback, Pause > Report feedback), `exportFeedback` -> one HTML file via `ui/fileOut.ts` share / download. Context:
  the state's `feedbackContext()` (map, mode, position, facing, enemies) + version, input device, graphics, frame
  times, output resolution, aspect, refresh, `settings` / `changed` from `settingsDigest` (every video setting; the
  rest only where it differs from the defaults), values up to `MAX_CONTEXT` 2000.
- Photo mode (`ui/screens/photoMode.ts` on a `PhotoHost`: `photoCamera()` / `photoFreeze(on)`; GameState flies its own
  FreeCamera so the post stack stays on, the menu stage gets a stand-in camera): `body.photo-mode` hides the HUD and
  every other screen; free camera by keys, mouse and sticks; a photo is the next rendered frame copied off the canvas
  (no DOM in it), max 1920 px JPEG; keep / retake (Y) / cancel (B). Full-resolution saves go up to 7680 px, JPEG
  quality stepped down to stay under 8 MB.

## Course HUD (Fallow, training D45)
`src/ui/hud/courseHud.ts`: the current bay's drills in teaching order with a P1 and a P2 tick column (a dash where the
drill is not that player's), and this player's current step in large type (LANTERN's line; `{Y}` / `{Y:traverse}`
tokens become prompt glyphs that follow the input mode). DOM is written only when the bay, the ticks
(`CourseState.gen`) or the end change. A drill done shows a toast. The next drill's marker is drawn by
`PingView.marker`; Settings > Gameplay "Course markers" (`gameplay.courseMarkers`, default on) hides it.
- The objective list is always on screen for both players from spawn ("B<n> - objectives": each drill ticked per
  player, the current one highlighted, then the airlock row), with no toggle (G108 keeps it for the course). Below it
  the airlock status line (`.ch-air`, `CourseState.airlockStatus`): "Waiting for partner" with one player on the pad,
  the refusal naming the open objectives (or "Revive first") with both on it, the cycle while it runs. Airlocks have no
  Cycle button: each has an emissive floor pad outline (`buildAirlockPads`, visual only).
- The results screen shows a course panel (`SessionStats.course`: per-bay time, team and per-player numbers, the
  finale's tier from `courseRating.ts`) on both pages, reached through the course end device ("Finish") and refused
  while that bay's drills are open. The co-op lobby re-reads the course record whenever it is shown ("Start at bay N").
