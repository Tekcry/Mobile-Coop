# UI
Purpose: the HUD, menus, the screen stack, display handling, feedback, photo mode and the course HUD.
Design authority: docs/DECISIONS.md (G77, G107, G108, G113), then docs/design-bible.md (Section 5.10).

Desktop only (G12): pad first, then keyboard and mouse. Menus follow the Arkham Knight style plan
(feature/menu-ui-spec, G77) and are rebuilt after the prototype (G113); only the in-game HUD follows CT's layout (G77).
What follows is the UI as built today; "decided, not built yet" marks where the decisions differ.

## HUD
- `Hud.setAccess` per frame from `settings.access`: health = the screen-edge vignette plus the health bar
  (`access.healthBar`, default on; off leaves the vignette as the only readout), the weapon readout fades (`.quiet`) 3 s
  after the last change, a hold ring on the use prompt (`setInteract(text, progress)`; since G5 only on the team-move
  direct path), subtitles
  (`BarkView.subtitles`), colour-safe arcs (`AwarenessArcs.colorSafe`), `--hud-scale` (CSS `zoom`), camera `shakeMul`,
  held actions by tap (`access.holdToggle`, `GameState.holdLatch`). No medkit count: health comes back only at wall
  stations (G20, G98).
- (CT prototype G5) The context action menu, top right (`ui/hud/contextMenuView.ts`, `.hud-ctx` in styles.css): a
  header box (INTERACT, or BACK TO GAME while A is held) over the options box, inside a dim corner-tick frame. CT's
  fractions of the frame: right edge 3.0 % W, width 27.6 % W, header 3.2 % H tall from 10.7 % H (pushed under the
  minimap where they would overlap), 0.4 % H gap, rows 3.34 % H apart, cap height 2.0 % H, uppercase Barlow
  Condensed. Our own look: steel borders, the highlight a thin outline with bright corner ticks (no fill), a fill line
  on a hold row. It writes the DOM only when `ContextMenu.version` changes. Logic: `docs/systems/input-and-loop.md`.
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

## Debug overlay (F3)
- `ui/debugOverlay.ts`; buttons, lines and the anti-crab readout: `docs/systems/testing-tools.md`, "Debug overlay".
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
    `anim/studio.ts` `STAGE_LIGHTS`, `stageLightPlace`) follow her root and facing, made once by `StudioStage`, light
    only her meshes (`includedOnlyMeshes`, re-read once a second as the LODs load; once a second her materials are
    raised to every light on her mesh, `lightSources`, unfrozen and frozen again like `LightRig.fitMaterial`, so a later
    rig fit cannot leave the stage lights out), range falloff as the game's lamps. "Stage light" slider (View tab, Loop player; 0-2,
    default 1; `STUDIO_LIGHT.scale`, saved with the panel's `ui` settings as `stageLight`). The studio map's ambient
    is 0.6 (was 0.45). The game's lights, light registry and light field are untouched. Hooks `__studioStage.lights()`,
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
    half (`key.<clip>.<n .. 2n-1>`) first takes the mirror image of the own keys' edits, then each key and arm is edited
    on its own and the key list shows all 2n keys; the bake writes such a clip in full (`expandMirror`, `mirror: false`)
    where the halves differ. Selecting a row marks its bone (slice T's marker; `tunerTarget` knows the new fields).
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
- (tuner-ui, the current layout; the older bullets below are history where they differ) The animation tuner panel
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
  schema. `window.__animTune` is the test / console hook. Hook list: `docs/anim-tuner/REPORT.md`.
- (anim-tuner pass 2) Also opens from Pause > "Animation tuner (dev)" (the row before Quit, pass 3; it resumes the match with the
  panel open) and Settings > Graphics > Developer > "Animation tuner (dev)"; it stays open over play, with or without the
  overlay (the overlay's frame hook drives it), until its header x. Header bar: fold (_ / +) to one line, close (x).
  Phone fit: at most `min(340px, 45vw)` wide, `max-height: 100vh - 8px`, scrolls; rows, sliders and buttons at least
  28 px high; the panel stops its pointer, mouse, click, wheel, touch and context-menu events (keys still reach the game:
  buttons blur after a click, sliders on change). Share / Copy: `navigator.share` with a File where `canShare({ files })`
  allows, else `navigator.clipboard.writeText`, else the JSON in a read-only text box (selected on focus).
- (tuner-pad) Pad control, `docs/anim-tuner/PAD.md`: the pure mode logic is `ui/animTunePad.ts` (`TunePadCtl`, modes
  off / tuner / game); `GamepadSource.padHook` (set in `core/app.ts` to `AnimTunePanel.padPoll`) sees the active pad
  before the bindings each poll, and while it returns true the pad's held actions are released and nothing of it
  reaches the `InputState` (game and menus). Opening the panel takes the pad (after every button is up); D-pad up / down
  pick a slider (body rows then gun rows, wrapping), left / right nudge by the step (repeat 0.35 s / 0.06 s, x5 after
  1 s), left stick X nudges (full tilt crosses the range in 2 s), LB / RB the focused section's group (follow off), Y
  the row's reset, A Export, B close, View (Select) the pad between tuner and game. The header's "PAD:" line shows the
  mode; the focused row has an amber outline. Follow waits while the tuner has the pad.
- (tuner-camera) The panel's sections come from the section registry (`anim/tuneRegistry.ts`, API in
  `docs/anim-tuner/STATE.md`): Body, Gun and Camera, then any section another file registers (the panel adds it), each
  with the picker, follow, resets, save, export, log and pad control. Camera: a group per camera state (`cam.explore`
  ... `cam.hold`, `selectCamGroup`) and ten offset / multiplier sliders on `config/camera.ts` values, read by
  `ShoulderCamera.update` through `TUNE_CAM_CUR` (eased, identity at default); grey "today: ..." lines under the sliders.
  Detail: `docs/anim-tuner/CAMERA.md`.
- (tuner-camera pass 2) The pad drives every control (the tuner-pad map above is replaced: `docs/anim-tuner/STATE.md`
  "Pad map"; a hint strip at the bottom of the panel): a focus list of every `[data-pad]` control, edit mode for sliders
  and dropdowns, a Y menu, LB / RB sections, LT / RT state, R3 / Backquote bypass, View game / tuner with a freeze, Menu
  close. Tools: free view (orbit / fly, demo loop; `player/freeView.ts`, rendered after the game view so gameplay reads
  `ShoulderCamera.gamePos`), hide HUD (`body.tune-hide-hud`), game speed 0.1-1x, Pause / Step (`GameLoop.timeScale` 0,
  `stepHeadless`; off in co-op), wide ranges, Import, search. A Speed section (`player/speedTune.ts`, gameplay, local
  only). Body / Gun / Camera ease state changes (`tuneSectionEase`). The barrel marker is a 2D canvas over the game
  canvas (`.anim-tune-marker-overlay`, no scene meshes).
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
  it all (`studioReset`). `window.__studio` is the test / console hook. Detail: `docs/anim-studio/REPORT.md`.
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
    B / contact" on a co-op section. `window.__studio.pair()` is the test hook. Detail: `docs/anim-studio/REPORT-2.md`.

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
