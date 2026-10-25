# UI
Owner: the orchestrator. Status: current.
Purpose: the HUD, menus, the screen stack, display handling, feedback, photo mode and the course HUD.
Design authority: docs/DECISIONS.md (G77, G107, G108, G113, G336, G339, G343, G351), then
docs/design-bible.md (Section 5.10).

Desktop only (G12), pad first (loco D1), then keyboard and mouse. Menus follow the menu style plan
(`docs/menu-ui/SPEC.md`, G77) and are rebuilt after the prototype (G113); only the in-game HUD follows CT's layout
(G77).
What follows is the UI as built today; "decided, not built yet" marks where the decisions differ.

## HUD
- `Hud.setAccess` per frame from `settings.access`: health = the screen-edge vignette plus the health bar
  (`access.healthBar`, default on; off leaves the vignette as the only readout), the weapon readout fades (`.quiet`) 3 s
  after the last change, a hold ring on the use prompt (`setInteract(text, progress)`; since G5 only on the team-move
  direct path; the hang-down's hanging player, settled, uses the menu), subtitles
  (`BarkView.subtitles`), colour-safe arcs (`AwarenessArcs.colorSafe`), `--hud-scale` (CSS `zoom`), camera `shakeMul`,
  held actions by tap (`access.holdToggle`, `GameState.holdLatch`). No medkit count: health comes back only at wall
  stations (G20, G98).
- (CT prototype G5) The context action menu, top right (`ui/hud/contextMenuView.ts`, `.hud-ctx` in styles.css): a
  header box (INTERACT, or BACK TO GAME while A is held) over the options box, inside a dim corner-tick frame. CT's
  fractions of the frame: right edge 3.0 % W, width 27.6 % W, header 3.2 % H tall from 10.7 % H, 0.4 % H gap, rows 3.34 % H apart, cap height 2.0 % H, uppercase Barlow
  Condensed. Our own look: steel borders, the highlight a thin outline with bright corner ticks (no fill), a fill line
  on a hold row. It writes the DOM only when `ContextMenu.version` changes. Logic: `docs/systems/input-and-loop.md`.
- Speed gear pips (`hud.setGear(gear, changes, max)`, shown `GEARS.pipsShow` 1.5 s after a change). Decided, not built
  yet: no gear or stance indicator on the HUD (loco M25 (7), G107: the body shows the stance).
- The objective popup and the no-maps rule are owned by bible 5.10 (G336, G339, G343, G351); strict rules by bible
  5.8 (G290). In short: the current objective is a short, plain English line that names what to do and where; it fades
  in for about 5 s on every update and on a tap of View / Select (pad) or O (keyboard); the menu keeps the full list
  (G108). No map, minimap, compass, objective blip, waypoint or marker in any mode. Marlow Yard keeps its guidance
  marks and always-on list (G277, G292; below).
- Decided, not built yet (G343, G351): the popup and its binding (View has no action yet, `input/padBinds.ts`; O is
  unbound). As built the HUD shows the objective line at the top (`Hud.setObjective`, `.hud-objective`).
- Built (G339, hud-guidance PR A): no minimap, compass or blip in any mode; the Marlow drill marker and world pings
  stay (G292, G135). Do not add a map, a waypoint or a marker to any mode.

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
- Pause menu (`PauseScreen`, the field terminal): Resume, Objectives, (marlow-bays items 3-4) Restart at checkpoint
  (Sector Ops and the course, `GameMode.restartCheckpoint`: the same clean retry as everyone down) and, in co-op,
  Return to lobby (`SessionCallbacks.lobby`: the host's `backToLobby`, every client follows), then Settings, Report
  feedback, the dev rows and Quit to menu. Both confirm in a `Dialog` that opens on Stay. In co-op they are host
  actions (A1): the client's rows are blocked with the line "Host only" (`HOST_ONLY`) and it keeps its own Quit.
- Controls (`ControlsScreen`, Settings > Controls > Remap controls, the one Controls place: no Pause item, menu-notes A2; loco D7): a Controller and a Keyboard & mouse tab to remap
  (`bindPanel`: two slots per verb, capture with a 5 s timeout, conflict warnings on both rows and a summary, reset per
  device with a confirm; pad: A rebinds, Y clears; Esc cancels, and on the pad holding B 1 s cancels). Decided, not
  built yet (G22): Menu / Start or Esc cancels a capture and B stays bindable.
  Settings > Controls also holds hold / toggle (aim, crouch, back to wall, sprint) and the pad sensitivities.
- Settings > Controller: Vibration (on / off), Rumble strength (`gameplay.rumble` 0-100%, `config/rumble.ts`), Test
  vibration.
- (mocap-trial; anim-fix-pass AF5) Mocap locomotion has no Settings row since AF5 (BRIEF A1: mocap is the only player
  path; `gameplay.mocapLoco` stays in the save but a stored false boots ON). `?mocap=0/1` overrides it
  for a page, then the animation tuner's More > Panel box (`mocapHost`, this page only, not saved).
  World-and-characters.md "Mocap locomotion switch".
- (LR14) Settings > Graphics > "Character shadows" (`video.charShadows`: Auto, the default - on from High shadows - / On /
  Off), under Shadows: the nearest lamps' silhouette shadow maps; rendering only, this machine only (lighting.md
  "Character silhouette shadows").
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

## Debug overlay (F3)
- `ui/debugOverlay.ts`; buttons, lines and the anti-crab readout: `docs/systems/testing-tools.md`, "Debug overlay".
- (tuner-clarity) Motion capture or hand-made, shown plainly. Pure table `ui/tunerReach.ts` (`REACH_WORDS`,
  `REACH_TITLES`, `KEYS_MOCAP_NOTE`, `MOCAP_BOX_LABEL`, `CLARITY_WARN_LABEL`, `SECTION_RULE`, `WORKS_INSTEAD`; tests
  `tests/tunerReach.test.ts`, the probe `tests/tunerReachProbe.test.ts` with its own long timeout).
  - Reach tags in each row's name: "Motion capture", "Hand-made", "Both", "Not playing now" (the row's own state plays
    the other way: a hand-made-only row while the capture plays it, a capture-only row while the hand-made move plays;
    a row of a state that is not playing keeps its tag and its edit raises the warning, `rowNow`). Camera and gear rows
    get none. Words and colour, never colour alone. Each part has a note summing up its rows (`reachSummary`). A Body
    slider the capture ignores is kept and tagged "Hand-made" (hover: `HAND_MADE_ONLY_NOTE`), not hidden.
  - Now playing: one line under the tab bar (`.anim-tune-playing`, full text in `title`) and in the Anim Studio's Loop
    player (`.studio-playing`). Read live from the graph (`anim/nowPlaying.ts`, `AnimGraph.playing` copied by
    `tune.ts` `tuneEnd`), not from the settings. Examples: "Now playing: motion-capture walk", "hand-made crouch walk
    (motion capture off)", "mix, 70% motion-capture walk, 30% hand-made".
  - Edit warning: an edit that changes nothing on screen shows a one-line strip under the row (`.tt-warn`) and in
    the header (`.anim-tune-warn`) for about 5 s, naming the setting that does work (`WORKS_INSTEAD`). More > Panel
    "Warn when an edit changes nothing" (on by default; saved as `clarityWarn` in the tuner's `ui` record).
  - Keys tab: the fixed note `KEYS_MOCAP_NOTE` ("Keys change the hand-made moves only") sits above the existing hint.
    Legs are their own parts, shown as "Left leg" and "Right leg" (target labels "Left leg (key)" / "Right leg (key)",
    `ui/tunerTarget.ts` `keyRow`), with "foot twist, toes out" (ankle yaw) and "shin twist" rows per leg
    (`legL_ankleYaw`, `legL_shinTwist`). The key channel `legd` is 9 a side (hip pitch / yaw / roll, knee, ankle
    pitch / roll, toe, ankle yaw, shin twist; 18 a frame, `KEYED_LEGD` in `anim/keyed.ts`; the channel itself:
    `docs/systems/world-and-characters.md`). Fingers are "Left / Right fingers". "Whole body" no longer holds keyed rows. The readout adds "(motion capture plays this in the game)" on walk, jog, run, sneak and glide strafe.
  - More > Panel box `MOCAP_BOX_LABEL`: "Motion capture for walk, jog, run, sneak and aimed strafe (off = hand-made)".
    The label changed; the switch, `mocapHost` and the save are unchanged.
- (marlow-bays slice T, items 9-11, 13, 14) Tuner mouse, selection, Keyed, on the spot, stage light:
  - Mouse mode (keyboard and mouse; pure state `ui/tunerMouse.ts` `TunerMouseCtl`): opening the panel frees the pointer
    in "Drag view" (`KeyboardMouseSource.setFreeMouse`: no pointer lock, no capture hint, scene clicks neither fire nor
    aim; a left drag on the game canvas is the look at the captured look's scale, read from `pointermove` (the engine cancels
    the canvas pointerdown, which stops the compatibility `mousemove` while the button is held), turning the game camera or the free
    view; the wheel on the scene zooms, starting "Orbit her" from the game view if the free view is off). F4
    (`TUNER_MOUSE_KEY`; F4 and F8 are reserved like F3, never bindable) and the header button ("Mouse: drag view" / "Mouse: game camera") toggle "Game camera": play's
    pointer-locked mouse look, the panel ignores the mouse (`.tt-gamecam`, the button stays clickable). A capture lost
    in the game camera (Esc, alt-tab) drops back to drag view with no pause (`KeyboardMouseSource.lockLostHook`).
    Closing the panel restores play's locking. `core/app.ts` wires `AnimTunePanel.mouseHost`. The pad path is unchanged.
  - Selection: the row last pressed, focused (mouse, keys) or given the pad focus is the selected row (`tt-sel`: a yellow
    bar and bold name; the active tab has a yellow underline); a "▶ part · state · row → target" line in the info area.
    `ui/tunerTarget.ts` (pure) maps a section and slider id to its target (rig joint(s) or bone, the weapon, the whole
    body, the camera); with no row picked in the shown part, the part as a whole. The scene marker is drawn on the
    barrel marker's 2D overlay (always on top; yellow ring and bone line with a black edge, the target's name); a dev
    visual, nothing reads it but the hook. Hooks: `__animTune.mouse()`, `mouseMode(m)`, `select(key)`, `selected()`.
  - Keyed (Anim Studio, next to the Loop list; `tunerLayout.loopKeyed` / `loopKeyedPick`): ticked plays the state's
    keyed clip (`state:walk` -> `keyed:walk`), cleared the procedural state; greyed where the loop has no other form.
    `__studio.keyed(on)`, `keyedState()`.
  - In the studio a state picked in any tab's state list (or LT / RT) plays that state's loop (`tunerLayout.loopForGroup`;
    keyed stays keyed; the Keys tab's clip plays that clip; the tab and part stay). "Loop on the spot" from every tab:
    the header button "On the spot: on / off" (studio only), F8 (`TUNER_SPOT_KEY`) and L3 on the pad (`TunePadOut.spot`).
  - Stage light (studio only, rendering only): four point lights (key, fill, rim, a soft top "ambient";
    `anim/studio.ts` `STAGE_LIGHTS`, `stageLightPlace`) follow her root, (T2) turned toward the camera (`stageViewYaw`: key and fill on the camera's side, the rim beyond her, from any view; they were in front of her facing, so the view from behind saw only the rim and the top light), made once by `StudioStage`, light
    only her own meshes, never an instance or its shared part base (`includedOnlyMeshes` from `stageLightMeshes`; fix 12: a part base in the list lit every instance in the scene, the hold-pair guard went white; GPU round: a base pushed into a list later, as the anim audit's pair rows do, is dropped on the once-a-second check, `stageLightKeep`, and the materials it lit re-frozen so they recompile), re-read once a second as the LODs load; once a second her materials are
    raised to every light on her mesh, `lightSources`, unfrozen and frozen again like `LightRig.fitMaterial`, so a later
    rig fit cannot leave the stage lights out), range falloff as the game's lamps. "Stage light" slider (View tab, Loop player; 0-2,
    default 1; `STUDIO_LIGHT.scale`, saved with the panel's `ui` settings as `stageLight`). The studio map's ambient
    is 0.6 (was 0.45). (T2) Intensities at scale 1: key 2.4, fill 1.4, rim 1.5, ambient 1.5 (were 1.7, 0.9, 1.3, 0.8:
    she read dark at 1080 p on the hardware GPU). The game's lights, light registry and light field are untouched. Hooks `__studioStage.lights()`,
    `root()`, `__studio.stageLight(v)`.
- (marlow-bays slice T1a, items 15-19, COVERAGE gaps 3, 4) Keys, playback bar, aim stances, own rows:
  - Playback bar (`StudioPanel.bar`, docked by the panel under the tabs, studio only, hidden folded): Play / Pause,
    "◀ Key" / "Key ▶" (a keyed clip steps to its next key, its mirrored half included, `anim/keyTimeline.ts`
    `keyStep`; a pair one frame), Gun (Rifle / Pistol, `STUDIO.weapon`: every armed loop swaps to it,
    `StudioHost.weaponClass` / `switchWeapon`; kept across visits), the time scrub, the speed and "On the spot" (the
    header button moved here; class `anim-tune-spot` kept). The readout names the loop and, on a keyed clip, its key
    ("jog - key 2 of 8 (mirror of 6), frame 4", `keyReadout`). Keys F9 play / pause, F1 / F2 key back / forward (with
    F8 on the spot; `tunerMouse.ts`, reserved in `keyBindings` RESERVED), pad right stick left / right a key (repeats when
    held), up play / pause (`TunePadOut.key` / `play`, the tuner mode only), L3 on the spot. The bar's controls come
    first in the D-pad order on every tab (a tab change still focuses the tab's own first control).
  - Every pick plays (item 16; `tunerLayout.loopForGroup`, `AnimTunePanel.pickLevel`): a state in any tab's list, a
    clip or key in the Keys tab (the clip on the spot, paused on that key: `StudioPanel.showKey`, `STUDIO.seekKey`), a
    weapon in Hands & feet / Gun in hand / the gun hold (the gun pick; a holstered loop plays the low ready), a climb
    move or climbing state (its traversal loop), a co-op role (its pair).
  - Keys tab (items 15, 18): "◀ Key" / "Key ▶" (the picker follows the key the clip stands on; on a mirrored-half key
    with Mirror on it shows the own key it mirrors), a readout, a Mirror box and the hint "Key edits change one pose;
    whole-cycle changes go in the state tabs." Mirror (default on, per clip, the Keys group `key.<clip>.mirror` slider
    `mirror`): on, an edit shows on the mirror key (the other arm half a cycle on); off (`tuneKeysMirror`), the mirrored
    half (`key.<clip>.<n .. 2n-1>`) takes the mirror image of the own keys' edits where it has none of its own (turning Mirror on keeps them, ignored), then each key and arm is edited
    on its own and the key list shows all 2n keys; the bake writes such a clip in full (`expandMirror`, `mirror: false`)
    where the halves differ. Selecting a row marks its bone (slice T's marker; `tunerTarget` knows the new fields).
  - Key timing (marlow-bays item 23; `anim/tuneKeysTime.ts`, `tuneKeysRetime` / `tuneKeysTimeInfo`): "◀ Earlier" /
    "Later ▶" slide the picked key one bake frame (1/48 of the cycle), the slider sets its bake frame, the readout gives
    its frame, phase, bake frame, the move and the range between its neighbours. Stored as the slider `time` (bake
    frames, + later) in the key's group. Keys keep their order at least one bake frame apart, key 1 is fixed (the cycle
    start), the last stays before the cycle end; with Mirror on a mirrored clip's own key moves its mirror key with it.
    The preview is live (the keyed sampler reads the baked clip at the warped phase, `KeyedClip.keyTime`); undo and
    reset work as for every slider. The bake writes the key's `phase` (frame / 48) only for moved keys, regenerates
    `src/anim/tuneKeysMeta.ts` and prints the clip's rebake.
  - Add / delete keys (marlow-bays item 25; `anim/tuneKeysEdit.ts`, `tuneKeysAdd` / `tuneKeysDelete` / `tuneKeysEditInfo`):
    "+ Add key" inserts a key midway (in time, bake frames) between the picked key and the next (wrapping; with Mirror
    on in the own half, the bake mirrors it half a cycle on); its deltas copy the live offset there, so play looks the
    same until it is edited. "Delete key" removes the picked key (never key 1, never below 4 keys a cycle: 2 own keys
    with Mirror on; with Mirror on its mirror goes too). State as sliders, no store version bump: `del` (0 / 1) in a
    key's group; 8 added-key groups per clip `key.<clip>.a<s>` (`at`, bake frames, 0 empty, and the field sliders as
    deltas on the original keys' blended pose there). Key ids: the original keys, then the slots, then (Mirror on) the
    slots' mirrors; the live list goes to `KEY_LIVE`, which `keyTimeline` (count, phase, step, readout numbered in
    phase order, "(added)") and the picker (live keys in phase order) read. Live: an added key is one more knot of the
    offset tables; a deleted key's knot takes its live neighbours' blended pose minus its own, from the key files
    (loaded on the clip's first delete). Mirror off copies the own half's adds / deletes onto the other half. The
    timing control moves an added key's `at` and keeps every key between its live neighbours. Undo, reset, presets,
    export and import work as for every slider. The bake writes the key file with the new key list (phase order),
    regenerates `tuneKeysMeta.ts` and prints the rebake; buttons `k:add` / `k:del` (pad focus, no new binding).
  - Key tools (marlow-bays item 30; `ui/tunerKeyTools.ts`, pure parts `anim/tuneKeysTools.ts`, registry glue
    `tuneKeysWave` / `tuneKeysApply` / `tuneKeysSmooth` / `tuneKeysDiff` / `tuneKeysToolKeys` in `anim/tuneKeys.ts`),
    under the key buttons. The Compare row (always shown): "Compare" (off by default) with "Previous key" or a picked
    key; on, the studio overlay draws a light ghost of that key's skeleton over her (`STUDIO.compare`,
    `STUDIO.comparePhase`; recorded root-local while she stands on that key: paused, the tools visit the key once and
    come back, the picker waits) and a line "Key 2 vs key 1: Right forearm twist, palm in +12°, Chest turn -3°" (the bake's
    poses, the key file's values plus the deltas; the four largest, "+N more"). The "Key tools" fold holds one tool at
    a time: Wave (Channel: any key slider by its plain name, a newly selected Keys slider by default; Amount; Timing, a
    share of the cycle; "Fill keys" sets that slider on every key with its own sliders to amount x sin(2 pi (phase +
    timing)), Mirror on: the mirrored half follows the mirror rule), Apply to keys (the selected slider's value on this
    key given to the ticked keys; a tick per key, All / None) and Smooth between (From / to keys, every slider or the
    selected one: the keys between, going forward, on a smoothstep blend of the two keys' poses; loads the key file
    first). Each tool closes the undo run before and after (one undo step) and writes only key sliders (bakes as
    them). Pad keys `kt:*` (ranges by left / right, drop-downs, ticks, buttons), no new binding; hooks
    `__animTune.keyTools()`, `keyToolsSet(o)`, `keyToolsRun(tool)`.
  - Exact preview (marlow-bays item 30e, `anim/tuneKeys.ts` `build`, `anim/tuneKeysCurve.ts`): a clip's key file loads
    on its first edit; then the Bezier-keyed fields spread on Blender's curve (`keyCurve.ts`), the trunk re-keyed in
    the bake's channel frames and the arms composed as the bake's FK, against the baked keys' curve read where the
    sampler reads the clip (retimed: warped). Retimed, added and deleted keys re-key the curve. Allocation: the curve
    tables once per clip (on its first edit), the baked keys' curves once per clip (on its file load).
  - New key fields (item 17; `anim/tuneKeysFile.ts` `KEY_FIELDS`, plain names in `tunerLayout.plainLabel`): head pitch /
    yaw / roll (`head.*`), pelvis shift (`pelvis.dx / dy / dz`, cm, now a slider), per arm the shoulder
    (`armX.sh.{pitch,yaw,roll}`, "shoulder forward / turn / out"), the upper arm twist (`armX.twistUpper`) and the
    forearm twist (`armX.twist`). Key files without them read 0. Runtime clip channels (optional, `anim/keyed.ts`):
    `fore` (8 a frame: the forearm twist, local to the elbow node), `head` (4: local on the look), `sh` (8: chest-frame
    shoulder turns); the upper arm twist rides the arm points. `characterRig.keyedArm` / `keyedShFore` and the head after
    the look apply them; `scripts/anim-keys/py/key_clip.py` poses them in Blender and writes the channels (the sampled
    arm points leave the shoulder turn out), `build.mjs` writes them into the clip. The Joints part names the twists
    ("Right forearm twist" for the elbow's y, "upper arm twist", "thigh twist").
  - Aim stances (item 19): loops `state:aimStill` (aim standing), `state:crouchAim` (crouch aim standing),
    `state:crouchAimFwd` (crouch aim moving), with the gun pick.
  - Own rows (gap 3; `anim/tuneRows.ts`): body states `crouchRun`, `aimStill` (the glides keep `aim`), `aimCrouchMove`
    (`aimCrouch` is the still one), `wallCrouchIdle` / `Slide` / `Peek`, `carry` (a body; `hold` the held guard; the
    pose's `carryBody`), each with its Joints, Limb reach, Hands & feet and Gun in hand rows; per-gun Joints rows
    `joint.rifle.<state>` / `joint.pistol.<state>` for low ready and the four aim states (`tuneV2JointRow`). The store's
    snapshot, the presets file and the export are version 2; a version 1 one (or an unversioned save) loads with each new
    row given its old row's values (`migrateTuneRows`, `migrateTuneChanged`; the bake reads a version 1 export the same).
  - The drawn set's edits (gap 4): `KeyedPose.ed` carries the sampled per-key trunk and arm offsets and the upper arm
    twists; with a gun in hand the rig applies the ready stance's and the glides' arm edits (and their forearm twist and
    shoulder keys) over the solved arms (`keyedArmEdit`, by the drawn share) and the aimed trunk edits by the share the
    keyed trunk leaves (`keyedTrunkEdit`). The walk / jog / run legs under the low ready keep their trunk (their arm
    channels are cleared, `clearKeyedArms`).
  - Hooks: `__studio.step(dir)` (a key), `showKey(clip, k)`, `weapon(w)`, `readout()`; `__animTune.pickLevel(sec, level,
    v)`, `keys()`, `keysStep(dir)`, `keysMirror(on)`.
- (marlow-bays item 29: tuner v3, simpler; the current tuner layout, the item 26 / 26b, T2 and tuner-ui bullets below
  are history where they differ) The panel (`ui/animTunePanel.ts`; pure parts `ui/tunerLayout.ts`, `ui/tunerPhone.ts`,
  `ui/tunerEffect.ts`, `ui/animTunePad.ts`; tests `tests/tunerV3.test.ts`, `tests/tunerEffect.test.ts`,
  `tests/tunerHands.test.ts`, `tests/tunerLayout.test.ts`, `tests/tunerPhone.test.ts`, `tests/animTunePad.test.ts`):
  - One layout for every input (Michael: "consistent between touch, controller, and k&m"): the input changes only the
    hint glyphs; the viewport size alone picks the dock, the drawer (landscape, short side <= 600 px) or the sheet
    (portrait, width <= 900 px). Body map, search, recent and pinned sliders, the Settings tab, the edit mode and 26b's
    pad density are gone.
  - One column: the top block (header, tabs, the studio's playback bar), the tab's "what" row (Part, State / Weapon),
    folding slider groups, then a collapsed More (time and speed, View aids, panel settings with "Highlight on her" and
    the Debug readout, presets, files). (Phase 2) On a drawer / sheet the top block is sticky as a whole (the tabs and
    the playback bar scrolled away under the header before: Michael's 844 x 390 screenshots); the tabs and the playback
    bar are one row that scrolls sideways; a row brought into view stops under it (`scroll-padding-top`).
  - Highlight: a 3 px dot (a hairline along a bone), off with More > "Highlight on her". (Phase 2) The studio's green
    skeleton and foot marks start off; More > View aids (studio only) turns Skeleton, Feet and Ghost poses on.
  - (Phase 2) Keyed clips: the studio pins a keyed clip's own state on her rig (`anim/tune.ts` `TUNE_PIN`,
    `tuneBodyGroup`; `anim/studio.ts` `studioBodyPin`), so the Body, Joints, Limb reach, Hands & feet and Gun rows of
    that state reach the clip (on the spot her pose had no speed and picked `idle`: every jog slider did nothing). The
    treadmill applies Feet apart and Knee lift (`studioDrive.ts`). The Body tab greys the sliders that do nothing in the
    loop playing now (keyed clip, procedural, gun in hand) with a one-line reason: data from the effect probe
    (`tests/helpers/tuneEffectProbe.ts`, table `ui/tunerEffect.ts`, the test fails when they disagree).
  - (Phase 2) Plain words: units shown as cm (metres x 100), degrees (radians), ×, frames, per m/s (display only: ids,
    stored values, saves and exports unchanged; `tunerLayout.shownUnit`); an armed row names the hands "Gun hand" and
    "Support hand" (`handRoles`, `roleWords`); "Gun in the gun hand" moves the gun about her grip, the support hand
    follows it (the report "gun in hand and support modified the same hand").
  - (Phase 2) Camera: the View tab's "Around her" (0 behind, 90 her right, 180 front), "Camera tilt" and "Distance"
    sliders set the orbit and follow the stick, drag, touch orbit and snaps (`player/freeView.ts` `FREE_SET`,
    `FREE_ORBIT`, `FreeViewCore.setOrbit` / `snapTo`); a held snap keeps its angle to her facing and the look turns that
    angle; Side pressed again swaps sides (`FreeSnap` `left`).
  - (Phase 2) A rebuild (a key stepped, picked, added or deleted; another state) keeps the panel's scroll and the
    focused slider. The studio's playback bar has the foot slide line ("Foot slide L 0.0 cm  R 0.0 cm", amber over
    0.5 cm) from her rig's optional `footSlide` (track C), hidden while the field is absent. The pad controller runs on
    real time (`padPoll`): the left stick and the repeats worked off the game's time, which is 0 while the tuner holds
    the game.
- (marlow-bays item 26: the tuner on a phone; Michael's written exception to M21 for the animation tuner and the Anim
  Studio only. The game stays desktop only: no phone look, no mobile path, no new work outside these two tools.) Pure
  parts `ui/tunerPhone.ts` (tests `tests/tunerPhone.test.ts`), suite `e2e-tuner-phone`:
  - Layout (`tunerPhoneLayout`): a phone is `flags.phone` (touch as the main pointer: `maxTouchPoints` and
    `pointer: coarse`) with a short side of at most 600 px; anything else keeps the T2 desktop layout exactly. Landscape:
    a side drawer on the right, full height, 38% of the width (270-400 px; height is scarce, width is not, so she keeps
    the left); portrait: a bottom sheet, full width, 45% of the height (she keeps the top). The studio dock gives the
    canvas up beside the drawer (`--tt-dock-w`, `body.tt-docked`) or above the sheet (`--tt-dock-h`,
    `body.tt-docked-b`), so she stands in the free area. Classes `tt-phone` + `tt-drawer` / `tt-sheet`.
  - Look (26b, Michael: "Smaller buttons, more compact. Adjust smaller with controller connected also"): two densities
    from the layout's `target`, set as `--tt-t` on the panel. Touch: 13 px text, every touch target at least 34 px
    (`TOUCH_TARGET`: tabs, buttons, chips, group headers, steppers, the ↺ and ☆, the drop-down rows, sliders 34 px
    high, check boxes in a 34 px row), tight padding; a slider row is two lines (pin, name, value, unit, reset; then the
    slider full width). Pad (a pad the last input, body `input-gamepad`; class `tt-ppad`): 11 px text, 26 px rows
    (`PAD_ROW`, no touch minimum), the desktop one-line rows, the drawer 34% wide / the sheet 40% high, the map at 1 px
    a unit with its own targets. It switches live: `frame()` compares the body class with the last layout's (one read a
    frame, no allocation) and re-lays out only on a change; a touch anywhere now sets the input mode back to `kbm`
    (`InputManager`, as a mouse press did), a pad press sets `gamepad`. The panel scrolls as a whole (`touch-action: pan-y`),
    the header sticky with a grab handle (`.anim-tune-handle`, "Hide panel" / "Show panel": the fold); the hint strip
    and the mouse-mode button hide. By touch the body map is drawn at 1.2 px a unit with 34 px hit circles; overlapping ones
    resolve to the nearest joint (`nearestMapPart`). The pad focus scrolls the panel only while a pad is in use.
  - Debug readout: the studio no longer turns the F3 overlay on in the phone layout, and opening the tuner on a phone
    sets it to the saved choice (`phoneDebug` in the tuner's `ui` store, default off). Settings > "Debug readout (F3)"
    (`.anim-tune-debugreadout`, on every layout) shows / hides it; F3 still works with a keyboard and the box follows
    (`DebugOverlay.toggle` -> `AnimTunePanel.debugShown`; the overlay sets `animTune.debugHost`).
  - Touch camera (`TouchGesture`, fed the canvas's touch pointer events; touches on the panel stop at the panel): a
    finger moved under 10 px and released within 450 ms is a tap (`pickAtScreen`, as T2's click; the mouse pick ignores
    touches); one finger past 10 px orbits (0.006 rad / px into `FREE_IN.tlx` / `tly`, starting the orbit from the game
    view as the wheel does); two fingers are decided once, when both moved (the same way: pan; opposite, or one far from
    a still one: pinch): a pinch adds the log of the spread ratio to `FREE_IN.tzoom`, a pan moves the circled point
    (`FREE_IN.tpx` / `tpy` in screen heights; `FreeViewCore.panX` / `panZ` along the view's level right, up into the
    orbit height, within `FREE_CFG.panMax` 3 m; reset when the free view restarts). A finger of two lifted spends the
    gesture until all are up. No allocation per event. The pad and the mouse are unchanged.
  - Hooks: `__animTune.phone()` (mode, drawer width / sheet height, dock, folded, readout, last gesture, taps),
    `fold(v)`.
- (anim-joints J1, COVERAGE gap 1) The Joints, Hands & feet, IK strength and Weapon sliders are deltas on a generated
  base table (`anim/animBase.ts`, written by the bake: `docs/archive/anim-tuner/BAKE.md`) and act on every Wren rig
  (`CharacterRig.tuneRows`, set in `operatorRig`: the player, the co-op partner, the studio's pair puppets), each picking
  its own row from its own pose inside its `animate` (`anim/tuneJointsRig.ts`); guards and other rigs never. `tuneV2Frame`
  copies the panel's rows into the tables (the active row, plus a few background rows a frame). Hook: `__animBase`.
- (anim-bake-targets) Every tuner slider bakes. The Body sliders without a code value are deltas on the base table's
  `body` key (each Wren rig composes its own row, `tune.ts` bodyRigBegin); the gun tuck bakes per gun state into
  `WREN_TUCK` (`animGraph.ts`). Hook: `__animBase.setBody(row, id, v)`.
- (anim-bake-all) Every other slider with no code value (aimed gun, FOV / zoom / aim-in blend, glide forward, the
  Stepping rest, Weight damping and amounts, strideMul per state, the co-op and traversal moves) bakes into the base
  table's generic `sections` key; the registry composes it with the tuner's values (`TuneSection.eff`, rebuilt on an
  edit or a load) for every consumer, the bypass reads the base. Never the guard sections (their own table, below) or
  Clip speed (code rules). Hook: `__animBase.setSection(section, group, id, v)`.
- (marlow-bays item 24, track A) Guard tuning (`anim/tuneGuard.ts`, the per-guard window `anim/tuneGuardRig.ts`; tests
  `tests/guardTune.test.ts`, e2e-studio): a "Who" list (Wren / Guard) heads the what-row of the Body, Stepping and Weight
  tabs (`AnimTunePanel.setWho`, `tunerLayout.whoSections`). Guard shows the guard sections in place of hers: Guard
  joints `guard.joint.<row>` (Body tab), Guard stepping `guard.step.<gait>` (Stepping), Guard weight
  `guard.weight.<row>` (Weight: lean, step load, springs, the start dip; no momentum, landing, jump, gear or camera
  slider), rows idle, walk (patrol and alert), run, aim, crouch, cover (`guardRowOf`); plain labels and targets as
  the Wren section each mirrors (`GUARD_BASE_SECTION`). A tab with no guard rows keeps hers under a grey line. Every
  guard rig (`CharacterRig.guardRows`, set in `buildEnemyRig`) picks its own row in its own `animate`, eases its joint
  offsets and opens the joints window on the guard table only (`tuneJoints.jointsOpen`), steps its own Weight layers
  (`WEIGHT_POSE` for its frame only, the camera signal put back) and its planner reads `GUARD_STEP_ROWS`
  (`FootPlanner.stepRows`); no Wren rig reads them, and Wren's Joints / Stepping rows never reach a guard; the plain rigs
  (the VIP, the training dummy, a carried body) read a fixed identity stepping table (`tuneStep.STEP_IDENTITY_ROWS`),
  so Wren's Stepping rows reach Wren only. The guard loops' Stepping gait is the planner's own pick for the loop's pace
  (`tunerLayout.GUARD_LOOP_GAIT` from `stepGaitIndex`: the run at 3.2 m/s steps in the jog gait). `tuneGuardFrame` (player.ts) copies the rows in once a
  frame. Deltas on the generated guard base table `anim/animBaseGuard.ts` (BAKE.md). Saves, exports, imports, presets
  and undo carry them through the registry (additive group ids; old records load with the guard rows at identity).
  Anim Studio: Who = Guard (or a `guard:<loop>` pick) plays the guard puppet (`studioStage` `makePuppet`: a grunt from
  `buildEnemyRig`, its gun, no AI) where Wren stands (she is hidden; the camera, the highlight via the panel's rig
  getter, the view aids and pause / speed work on it): loops idle, patrol walk, alert walk, run, aim, crouched aim,
  wall cover (`anim/studio.ts` `GuardLoop`), moving ones on the spot (`shiftWorld` treadmill); the guard sections
  follow the puppet's row. Who = Wren plays her idle again. Hooks: `__animTune.who(w)`, `whoState()`, `__guardTune`.
- (anim-bake-1022) Reset baked (`anim/tuneBakedReset.ts`): when the tuner's save loads, the sliders at a value the
  bundled bake ledger (`anim/tuneBakeLog.json`) says is now in the code reset to their defaults, once per bake (hashes in
  the save, `TuneSnapshot.baked`); the info line gives the count (on the next open when closed). Y menu "Reset baked"
  reruns it over every bake. Hooks: `__animTune.bakedReset()`, `bakedApplied()`, `infoText()`; BAKE.md step 7.
- (anim-joints J2, COVERAGE gap 2) Move and action rows in Joints, Hands & feet, IK strength and Weapon: the tables are
  keyed by the row list `TUNE_ROW_IDS` (`anim/tuneMoveRows.ts`): the body states (ids unchanged), then `trav.<kind>`
  (the traversal moves without a body state, plus `brace`), `team.<move>.<a|b>` (each co-op move per role) and the
  actions `air`, `land`, `slide`, `melee`, `reload`, `swap`, `throw` (the grenade), `hit`. Groups such as
  `joint.trav.vault`, `joint.team.boost.b`, `hand.rifle.reload`, `ik.air`, `weapon.pistol.throw` register through the
  registry, so the panel's pickers list them (State: `trav` > `vault`, `team` > `boost` > `b`, `reload`). When they
  apply: each Wren rig picks the stance row plus up to 3 move / action rows with a weight 0..1 (`pickTuneRows`): a
  traversal row 1 while the pose is in that move; a team row 1 while the rig is in that role (`RigPose.tuneTeam`: the
  local player from `MOVE_TUNE_TEAM`, the studio pairs from their role, the co-op partner from its move mode and sub on
  the wire; the partner's relay climb reads as the leg-up's role A and the revive has no wire state); an action row
  the anim graph's own blend weight (`AnimGraph.rowW`: the air and slide fades, the landing envelope, the elbow strike's
  hand weight, the reload / swap overlays, the grenade hands, the flinch spring; last frame's). Composition (A5):
  joints stance x nlerp(identity, move, w) per row; offsets stance + w x move; gun scale and IK strength stance x
  lerp(1, move, w); the trigger the move row's at w >= 0.5 when not auto. A move with no body state (a vault) applies
  its row over identity. The panel follows the strongest move row while its weight is 0.5 or more, else the stance
  row. The per-gun Joints rows stay for the armed states only.
- (anim-gear, marlow-bays item 22) Gear (`anim/tuneV2Sections.ts` `GEAR_SECTION`, tables `anim/tuneGear.ts`): worn-gear
  offsets per socket, its own tuner tab (`sec:gear`, "Gear": the panel builds it from the registry, no UI change).
  Groups `gear.<socket>` (holster, backL, backC, backR, slingHip, (anim-goggle) goggles) and `gear.<socket>.crouch` (added
  over the standing row by the rig's crouch amount 0..1); sliders x / y / z (m, -0.1..0.1) and pitch / yaw / roll (deg,
  -45..45), identity 0, no follow. Deltas on the base table's `gear` key; every Wren rig composes its own
  (`TuneRigState.gear`, in `tuneRigBegin`). Where each applies: holster -> the thigh pistol (`WeaponModel.place`, the
  `thighMount` branch, about the holster's weapon point; the generic thigh slot likewise); backL / backR -> the back
  mount's guns (about the stud); backC -> the diagonal centre sling (about the grip); slingHip -> the rig's `slingHip`
  node and the compact gun on the hip sling (about its stock-end pivot). No slingBack socket (nothing reads that node yet) and no
  pouches socket: Wren's kit draws her grenade pouches (the GrenadePouches meshes are hidden on her rig), so it would
  move nothing (dropped until they can move). A gun's frame is its own in the slot (x right, y top, z toward the muzzle); a node's is its
  parent's. A draw / holster's travel targets the moved slot (it places its end through `place`). Visual only (G-A3).
  (anim-goggle) goggles -> the worn goggle (track C's `GOGGLE_OFFSET.inUse`, head frame: x right, y up, z forward, about
  its own pivot): each Wren rig writes its composed value there inside its tuner window just before `goggleFrame()`
  copies it into `rig.goggleOff`, and puts the old value back after (guards never); on LOD1 / LOD2 only the lens moves
  (the housing is fused into the head); no stowed socket (the stowed goggle has no vertices yet).
  Hook: `__animBase.setGear(row, param, v)`.
- (marlow-bays slice T2, item 12: the tuner redesign; the current layout, the tuner-ui bullet below is history where it
  differs) The panel (`ui/animTunePanel.ts`; pure parts `ui/tunerLayout.ts`, `ui/tunerTarget.ts`; tests
  `tests/marlowT2.test.ts`, `tests/tunerLayout.test.ts`):
  - Look: the game menus' face and colours (`--font-menu`, `--text`, `--text-hi`, `--muted`, `--line`, `--hl`, `--warn`,
    `--gold`, `--panel-2`; no palette of its own). Tabs as the menus' tab strip (caps, the active one white over a green
    rule, wrapping to two lines). The pad focus is the menus' row focus (green bar, 3 px edge, white bold label); edit
    mode the same in `--warn`; the selected row a gold edge. Size S / M / L is 16 / 19 / 22 px at 1080 p (Medium the
    default; `tunerScale`: the screen height scales it, never under 11 px), the width at most a third of the screen
    (`font * 25`). Values bold white (changed: amber); reset is ↺ (the unit keeps ×).
  - Docked: fixed to the right edge, full height (`top` / `bottom` 0; folded: the header only). In the Anim Studio the
    canvas gives up the panel's width (`body.tt-docked`, `--tt-dock-w`, one `engine.resize()` per change;
    `syncDock`), so she stands in the middle of the free area; not folded, not outside the studio, not in co-op. The
    studio hides the game HUD (`body.tt-studio`: `.hud`, `.hud-world`, the mouse capture hint; `syncStudioHud`, run
    every frame open or not, off in co-op).
  - The part strip (`.anim-tune-nav`, between the playback bar and the tab): the body map (`.anim-tune-map`, her joints
    seen from behind, her left on the left with large L / R, the gun, "whole"; tap targets 8 units, about 11 px at
    Medium; the part picked a green ring and fill, the selected slider's joints a gold dashed ring), "Showing" with the
    part's name (`.anim-tune-partname`) and the part list (`.anim-tune-bodypart`, `BODY_PARTS`: the pad's way to the
    map), Show every part, the pinned and recent chips (`.anim-tune-quick`, `q:<key>` pad items) and the search (moved
    from Settings; it searches every tab). The map and the part list hide on View, Camera and Settings.
  - A part picked (the map, the list, or a click on her in the scene) shows only the sliders that move it
    (`rowHasPart`: slice T's `tuneTarget` in reverse: a joint by its joint, a bone by its first joint, a pair by either;
    the weapon and the whole body by their own part; the camera never filtered): the shown section when it has any,
    else Joints, Body, Hands & feet, Limb reach, Keys (the weapon: Gun in hand, Gun hold); its first slider is
    selected (the scene marker). The same part again, the list's "All parts" or Show every part: every part.
  - A click on her (drag view, a press and release on the canvas under 6 px and 450 ms): `pickOnBody` over her joints
    projected through the rendered camera (a joint within 26 px, else the bone under the click within 36 px: its first
    joint, else a joint within 64 px; the middle of the gun along its bore as one more point).
  - Rows in groups by what they move (`tuneTarget`'s label: "Right elbow", "Knees"), a header each (`.tt-grp`, pad key
    `g:<section>:<label>`, A or a click folds it); `groupOpen`: a choice by hand holds, else open when the first, holding
    the selected row, filtered by a part or the search, or 8 rows or fewer in all. Folded rows stay in the DOM (code and
    tests set them). A slider moved heads the recent list (`pushRecent`, 6); ☆ on a row (or Y menu > Pin / unpin this
    slider) pins it (`togglePin`, 12, saved in the tuner's `ui` store as `pins`); a chip goes to its slider (tab, part,
    group, follow off, its group open, selected; by pad the focus lands on it).
  - The status line: `stanceText`: in the studio the loop playing and the gun as it is ("Walk · Rifle holstered", "Low
    ready · Rifle drawn"); outside it the game's state ("Walk · No gun drawn").
  - A level picker with no choice hides; the Joints' second level is "Armed state".
  - Hooks added to `window.__animTune`: `part(p)`, `partState()` (part, label, shown section, its shown slider keys,
    dock width), `clickAt(x, y)`, `reveal(key)`, `pin(key)`, `quick()`.
- (tuner-ui, the layout before T2; the older bullets below are history where they differ) The animation tuner panel
  (`ui/animTunePanel.ts`; pure parts `ui/tunerLayout.ts`, tests `tests/tunerLayout.test.ts`):
  - Tabs (LB / RB, a click): View (the Loop player in the Anim Studio, the camera: free view, Front / Side / Back / Top
    snaps that hold, Unlock, fly demo, hide HUD; time: Pause / Step, game speed), Body (parts Body, Joints, Limb reach,
    Climb and vault), Hands & feet, Weapon (Gun hold, Gun in hand), Stepping (Stepping, Speed), Weight, Camera, Keys,
    Co-op (one part per team move), any later registered section as its own tab, Settings (size, pause game while
    tuning, follow my state, changed only, wide ranges, barrel line, find a slider, undo / A/B / presets, export /
    share / import, reset all, clear change log). `tabOfSection` maps a section to a tab; `buildTabs` builds the list.
  - In a tab: a Part drop-down (more than one section), then one drop-down per level of the group ids (the shared
    prefix dropped: `hand.rifle.walk` is Weapon then State, `key.walk.0` Clip then Key), Reset group, then the rows
    (plain label, slider, the value in a light box, the unit, × reset). Every drop-down is a hidden native select (code
    and tests set `.value` and dispatch `change` as before; `.anim-tune-pick-<id>` holds every group id) shown as a
    button that opens the panel's own list (`.anim-tune-drop-list`; `DropNav`).
  - Look: explicit colours from one injected stylesheet (`style[data-tuner=ui]`); the pad focus is a class
    (`tt-focus`, `tt-edit`), never an inline style. Size S / M / L (`tunerScale`), saved with "Pause game while tuning"
    in the tuner's IndexedDB store, key `ui`. The hint strip is a flex row under the body (reserved space): pad glyphs
    (`promptHtml`) under `body.input-gamepad`, key and mouse help otherwise.
  - Pause: `GameState.menuPaused` (the pause menu or the results); `App` hands it to `AnimTunePanel.menuPaused`: the
    tuner gives the pad to the menus; `GameState.fixedUpdate` uses a blank input (`menuInp`) under the pause menu, the
    free view stops in co-op too. "Pause game while tuning" freezes (time scale 0) while the panel has the pad and a pad
    is in use, outside the studio and co-op (edge triggered: a Resume by hand stays).
  - Camera lock: `FREE_VIEW.lock` (`FreeViewCore.lock` / `bodyYaw`): the orbit takes `freeSnap` of her facing every
    frame; the look and the turntable do not turn it; the pad stays on the panel (`TunePadCtl.setFree(on, false)`).
  - (fix round) A State picked by hand on the Body part carries to Joints, Limb reach, Hands & feet, Gun in hand, the
    gun hold where it maps, Stepping and Weight (`bodyCarry`, the panel's `carryBody`); a pick in any other section
    stays local.
  - Anim Studio: a loop pick calls `applyLoop` (`loopGroups`: body, joint, ik, hand / weapon state, step, weight, keys,
    team role A, climb move; follow off). "Loop on the spot" (`STUDIO.spot`, default on; off = `rootMotion`): a moving
    state's stick runs with no camera turn and `StudioStage.afterStep` moves her back by what she moved each fixed step
    (`PlayerController.shift`, `CharacterRig.shiftWorld` / `FootPlanner.shift`: the feet slide back, no teleport).
  - Hooks added to `window.__animTune`: `tabs`, `tab`, `size`, `lock`, `unlock`, `group(section)`, `pad()` gains `tab`,
    `list`, `listIndex`, `listLength`, `hint`; `window.__studio.spot`.
- (anim-tuner) Anim button: `ui/animTunePanel.ts`, a plain slider panel fixed top right (the overlay and its crab readout
  stay top left), any build. Two sections: the body state (20 groups) and the gun hold (rifle / pistol x low ready /
  aim / crouched aim), each a picker that follows the local player's state while "follow" is on (`TUNE_STATE`), with
  per-slider reset (x), Reset group, Reset all, "changed only", a barrel marker (line and ball 12 m out along the held
  weapon's bore) and Export (`anim-tune-<YYYY-MM-DD>.json`: `changed` values with their defaults, `log` of time /
  group / id / from / to). The table is `anim/tune.ts` (pure): `TUNABLES` registry, `TUNE_BODY` / `TUNE_GUN` values,
  `TUNE_CUR` (read by the hooks; set by `tuneBegin` / `tuneEnd` around the local player's `rig.animate` only, identity
  otherwise) and `TUNE_LOCAL` (the last selection, for the wall push, the root offset and the motion driver's stride).
  Saved (debounced 0.4 s) to its own IndexedDB database `<save db>-animtune` (`save/animTuneStore.ts`), outside the save
  schema. `window.__animTune` is the test / console hook. Hook list: `docs/archive/anim-tuner/REPORT.md`.
- (anim-tuner pass 2) Also opens from Pause > "Animation tuner (dev)" (the row before Quit, pass 3; it resumes the match with the
  panel open) and Settings > Graphics > Developer > "Animation tuner (dev)"; it stays open over play, with or without the
  overlay (the overlay's frame hook drives it), until its header x. Header bar: fold (_ / +) to one line, close (x).
  Phone fit: at most `min(340px, 45vw)` wide, `max-height: 100vh - 8px`, scrolls; rows, sliders and buttons at least
  28 px high; the panel stops its pointer, mouse, click, wheel, touch and context-menu events (keys still reach the game:
  buttons blur after a click, sliders on change). Share / Copy: `navigator.share` with a File where `canShare({ files })`
  allows, else `navigator.clipboard.writeText`, else the JSON in a read-only text box (selected on focus).
- (tuner-pad) Pad control, `docs/archive/anim-tuner/PAD.md`: the pure mode logic is `ui/animTunePad.ts` (`TunePadCtl`,
  modes off / tuner / game); `GamepadSource.padHook` (set in `core/app.ts` to `AnimTunePanel.padPoll`) sees the active
  pad before the bindings each poll, and while it returns true the pad's held actions are released and nothing of it
  reaches the `InputState` (game and menus). Opening the panel takes the pad (after every button is up); D-pad up / down
  pick a slider (body rows then gun rows, wrapping), left / right nudge by the step (repeat 0.35 s / 0.06 s, x5 after
  1 s), left stick X nudges (full tilt crosses the range in 2 s), LB / RB the focused section's group (follow off), Y
  the row's reset, A Export, B close, View (Select) the pad between tuner and game. The header's "PAD:" line shows the
  mode; the focused row has an amber outline. Follow waits while the tuner has the pad.
- (tuner-camera) The panel's sections come from the section registry (`anim/tuneRegistry.ts`, API in
  `docs/archive/anim-tuner/STATE.md`): Body, Gun and Camera, then any section another file registers (the panel adds
  it), each with the picker, follow, resets, save, export, log and pad control. Camera: a group per camera state
  (`cam.explore` ... `cam.hold`, `selectCamGroup`) and ten offset / multiplier sliders on `config/camera.ts` values,
  read by `ShoulderCamera.update` through `TUNE_CAM_CUR` (eased, identity at default); grey "today: ..." lines under the
  sliders. Detail: `docs/archive/anim-tuner/CAMERA.md`.
- (tuner-camera pass 2) The pad drives every control (the tuner-pad map above is replaced:
  `docs/archive/anim-tuner/STATE.md` "Pad map"; a hint strip at the bottom of the panel): a focus list of every
  `[data-pad]` control, edit mode for sliders and dropdowns, a Y menu, LB / RB sections, LT / RT state, R3 / Backquote
  bypass, View game / tuner with a freeze, Menu close. Tools: free view (orbit / fly, demo loop; `player/freeView.ts`,
  rendered after the game view so gameplay reads `ShoulderCamera.gamePos`), hide HUD (`body.tune-hide-hud`), game speed
  0.1-1x, Pause / Step (`GameLoop.timeScale` 0, `stepHeadless`; off in co-op), wide ranges, Import, search. A Speed
  section (`player/speedTune.ts`, gameplay, local only). Body / Gun / Camera ease state changes (`tuneSectionEase`). The
  barrel marker is a 2D canvas over the game canvas (`.anim-tune-marker-overlay`, no scene meshes).
- (anim-studio) Snapshots in the tools (`ui/tuneSnapshots.ts`, pure logic `anim/tuneHistory.ts`): Undo / Redo (every
  tuner change, a run of changes within 0.6 s is one step; Ctrl+Z / Ctrl+Y or Ctrl+Shift+Z while the panel is open and
  no text box has the keys; the Y menu), Store A / Store B / A/B (the values shown stay in the slot shown), presets (a
  picker, a name box, Save / Load / Delete (A twice); key `presets` in the tuner's IndexedDB store). Hooks on
  `window.__animTune` (`undo`, `redo`, `settle`, `abStore`, `abToggle`, `presetSave` / `Load` / `Delete`, `presets`).
- (anim-studio) Anim Studio (dev): Main menu row `anim-studio` (last) and Pause row `anim-studio` (before Quit; not in a
  co-op session, not inside the studio) start the `studio` dev scene (`world/maps/studio.ts`, in `DEV_MAPS`, not `MAPS`;
  `?autostart=studio`, Free Roam) through `App.studio` (set in `main.ts`). `game/studioStage.ts` opens the tuner panel
  and the debug overlay (the crab readout), plays the loop player (`anim/studio.ts`: the list, the switches `STUDIO`, the
  phase maths, the synthesised input; `anim/studioDrive.ts`: a keyed clip on one rig's graph, `AnimGraph.drive`, with the
  treadmill feet after the planner) and keeps an optional guard figure. The panel's Studio section is
  `ui/studioPanel.ts` (top of the panel, shown only while `STUDIO.active`; LB / RB lands on it first); its viewing aids
  are `ui/studioOverlay.ts` (a 2D canvas `.studio-overlay`: skeleton, feet and trails, onion skin; projection
  `ui/overlayProject.ts`, shared with the barrel marker). The turntable and the camera snaps are `FREE_VIEW.spin` /
  `FREE_VIEW.snap`, taken by the free view. The game speed slider reaches 2x only while the studio runs. Leaving resets
  it all (`studioReset`). `window.__studio` is the test / console hook. Detail: `docs/archive/anim-studio/REPORT.md`.
- (anim-studio-2) Pairs and traversal in the studio. The loop list adds `pair:<move>` and `trav:<move>` entries.
  - A co-op pair (`anim/studioPairs.ts`, pure): both roles of a team move from one clock, through the game's own paths
    and timing (`game/teamMoves.ts`, `TEAM`). The stage poses two Wren puppets (`operatorRig`, local rigs, no network;
    Wren hidden, standing back as the camera's anchor) through `moveTuneSelect` / `Root` / `Begin` / `End` with each
    role's group, the same calls the local player makes in real play. Moves: leg-up, ledge relay, partner throw,
    hang-down, two-person rope (a `world.ropes` line), revive. The panel's follow shows role A's group (`MOVE_TUNE_TEAM.follow`).
  - A hold pair: Wren's hold clip and the guard's clip in place, both drives `held` to the pair's phase.
  - A traversal loop (`anim/studioTraversal.ts`, pure `travTick`: reset, settle, walk in, act steps, reset): the
    synthesised stick and buttons (jump, interact, drop, cover; the door's Open through `startDoorOpen`) on the props of
    `anim/studioProps.ts`, built as level pieces and anchors in the 28 m studio room. Reset is `GameState.studioTeleport`
    (out of any anchor, wall or door move, as the respawn).
  - The move sections (`anim/moveTune.ts`): `team_<move>` (groups `team.<move>.a` / `.b` / `.contact`) and `trav`
    (`trav.<kind>`). The local player's own role and pose select them (`GameState` writes `MOVE_TUNE_TEAM` from
    `TeamController.state` / `partT`, or 'revive' while holding a partner's revive); the remote avatar never reads them;
    nothing on the wire; visual only (the rig root, the pose, the grip targets). The pad strip shows "LT / RT: role A /
    B / contact" on a co-op section. `window.__studio.pair()` is the test hook. Detail:
    `docs/archive/anim-studio/REPORT-2.md`.

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
