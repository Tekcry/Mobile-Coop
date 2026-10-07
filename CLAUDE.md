# Silent But Deadly - architecture and conventions

Silent But Deadly (renamed from Shoulder Strike in 2.2.0; internal ids keep the old name for compatibility:
IndexedDB `shoulder-strike`, export magic `shoulder-strike-save`, co-op app id). Mobile-only third-person over-the-shoulder shooter. Static web app (Vite + TypeScript + Babylon.js 9 + Havok),
installable PWA, fully playable offline. Hosted on GitHub Pages. Target: top-end phones at 120 Hz (8.33 ms frames);
a stealth operative that moves fluidly and responsively (still weighted) and fights from cover, Splinter Cell:
Blacklist style.

## Commands
- `npm run dev` - dev server (LAN-exposed for phone testing)
- `npm run build` - typecheck + production build into `dist/`
- `npm test` - Vitest unit tests (node env, `fake-indexeddb` for save tests)
- `npm run lint` - ESLint (typescript-eslint)
- `npm run icons` - regenerate procedural PWA icons into `public/icons/`
- `npm run e2e` - serves `dist/` and runs the headless e2e suites (needs a prior `npm run build`):
  - `scripts/smoke.mjs` boot + console-error check (`--shot=out.png` for a screenshot)
  - `scripts/e2e-pad.mjs` controller-only navigation through every menu using a fake Gamepad API pad
  - `scripts/e2e-touch.mjs` touch-only: taps menus, floating move stick, rate-based camera stick, drag-look,
    fire button never moves the camera, control sizes, action button only for "use", take-cover prompt tap, no cover badge in cover, a push away leaves
  - `scripts/e2e-mouse.mjs` PC mouse capture: click captures (never fires), look, fire, wheel swap, Esc pauses,
    Resume re-captures
  - `scripts/e2e-move.mjs` stealth speeds (sneak .. sprint), aim strafe/backstep, sprint toggle, aim ends a sprint, no free jump,
    kneel, contextual vault/climb/step/drop/hop, steps/slopes/stairs/tunnel/props on Proving Grounds
  - `scripts/e2e-traverse.mjs` Proving Grounds course (north east): ladder bottom / top entry, climb rate, slide, step
    off; drainpipe to a lip, climb up; ledge grab, shimmy rate, jump across, outside corner, climb up, hold-B lower
    in, drop; horizontal pipe; landing bands (soft / roll / heavy + noise + recovery); grab while falling; zipline;
    open / glazed windows; duct unscrew, crawl, vent drop + roll, kick (fresh page); keyboard E; touch prompts;
    planted hands / feet locked (< 1 cm), arms reach grips
  - `scripts/e2e-anchors.mjs` every placed anchor on every map (seven) (ladders bottom / top, drainpipes, pipes, ziplines,
    ducts, windows both sides) is offered from its approach and engages; hangable lips per map
  - `scripts/e2e-stealth.mjs` real-time camera repro (free orbit: 360 deg looks standing, crouched, moving,
    aiming, after a sprint / cover / lean, no residual offsets, level horizon after a shake) + headless cover bars: 3 m snap glide, hand
    contact, sticky exit, sprint slide, edge peeks, peek in/out timing, left-edge hand switch, corner offered and swung on the button (never automatic), no spin from quick aim /
    direction changes, tuck,
    auto shoulder, routed cover-to-cover, push-back cancel
  - `scripts/e2e-weapons-carry.mjs` Free Roam loadout: five slots, back guns within 10 deg of the spine in six
    gaits, no clipping (both avatar styles, with a backpack), hands within 2 cm of the grips, swap reach + timing
  - `scripts/e2e-anim.mjs` quality bars in the running game: first-frame response, 90% speed / stop times, one
    settling step, pivots, arcs, turn rates, lean into turns, stance and aim raise/lower times, weapon clip
    timings, foot locking (< 1 cm) in seven gaits, pose continuity, flinch, camera lag/blends/bob/drift/sprint
    FOV/stick-look bounds, 60 vs 120 Hz parity
  - `scripts/e2e-combat.mjs` weapons, hits, headshots, reload, swap, grenades, barrels, death/respawn
  - `scripts/e2e-modes.mjs` wave progression, mission flow, enemy types, ragdolls
  - `scripts/e2e-progression.mjs` Loadout by controller (live weapon preview, lock line, upgrade, buy in place), suit / HQ by touch, rewards, IndexedDB persistence, export/import
  - `scripts/e2e-cover.mjs` (A cover, B crouch, Y traverse) snap side-on, turn-and-swap, kneel, peek/blind
    fire/vault, B keeps cover, stand/crouch at high cover + crouched edge peek, lean in place, outside corners (corner prompt + A, never automatic) /
    inside corners, edge stop a step back, no cover badge, SWAT turn, cover-to-cover only when looking at it with the stick held towards it + slide + marker,
    world prompts (low on the surface, tapped by touch), manual cover only (walking / sprinting into a wall never
    snaps), crouched aim over low cover, keyboard Space
  - `scripts/e2e-clip.mjs` traversal: no body point (trunk, head, thighs, calves, upper arms; raycast from the hips)
    > 3 cm into the world while climbing, hanging, shimmying, climbing up, crawling, dropping through a vent,
    vaulting a window, on a zipline or rolling; plus the weapon clipping sweep: every frame of wall-side movement, high / low cover (idle,
    moving, turn-and-swap, reload, swap), edge-peek aim sweeps both edges standing / crouched (with step-out),
    aim over, vault, aim every weapon, aim walking / crouched: no gun point inside the world (> 2 cm), legs grazed
    <= 2.5 cm, gun clear of the head (> -1 cm) and trunk (> -2 cm), elbows (> -3 cm), knees above the floor and
    > 9 cm apart, feet > 6 cm apart (`--only=name --log`)
  - `scripts/e2e-tactics.mjs` doorway check, contextual lean, slicing the pie, split hit volumes, suppression,
    exposure HUD, enemy grenades/flanker, footstep noise investigation, a wall muffles a noise
  - `scripts/e2e-takedown.mjs` takedown kinds (ground rules, over low cover, above, below, window), tap / hold,
    5 cm alignment, damage interrupt, Execute charge, marks through cover, no execute out of sight, execute; no takedown
    on a guard in combat who saw you, one alerted without seeing you still can be
  - `scripts/e2e-enemies.mjs` heavy (plates / back / face plate, lethal-only frontal takedown), enforcer (shield,
    no frontal grab, pushes), sniper (laser, glint refuses a mark, relocates), dog (smell in the dark, takedown),
    drone operator (spots, shot down, EMP), officer (buff, alarm first), radio check, callouts, Perfectionist
  - `scripts/e2e-levels.mjs` multi-level AI: three storeys per column, Warehouse ladder links both ways, a runner
    chasing the player up a rack ladder and back down
  - `scripts/e2e-missions.mjs` Hunter alarm doubles the hostiles; Infiltration objective types to success (download
    pauses away + noticed pulses, intel any order, plant, rescue + escort, sabotage, extraction, results rating and
    style bars) and failure (Ghost contract detection, three downs); routes per objective + 25 anchors per map
  - `scripts/e2e-gadgets.mjs` wheel (hold opens + slows time, stick picks, release selects, touch tap), arc preview,
    gas knock-out, flashbang blind -> alert + white-out, EMP lights out and back, noisemaker lure (muffled behind a wall), sticky cam feed
    (operator still, ping, gas, back), drone (flies, dart, battery), mine
  - `scripts/e2e-stealth-ai.mjs` night Warehouse: shadow vs light detection, the arc warns first, no sight through
    walls, noise -> suspicious -> investigating, squad radio after the spotter's radio window, the shout to guards
    close by, a spotter taken out first tells nobody, LKP + ghost + converge + search ends, patrols
  - `scripts/e2e-coop.mjs` two pages over `?net=local` (a third for PvP): lobby, wave match, validated hits, revive, results;
    Hunter (puppet alert levels, door sync, a client door use, a client takedown, kept / hidden bodies, pings both
    ways, a client execute, a client gas cloud on the host's guards, a dual takedown, a client reviving the host),
    Infiltration objectives on the client, Team Deathmatch (teams, opponents-only hit volumes, no friendly fire,
    a validated elimination, respawn, results) and Free-for-all; host leaving, offline
  - `scripts/e2e-cosmetics.mjs` Loadout appearance by controller, live / locked previews on the operator, revert on exit, emotes, camo, in-game look
  - `scripts/e2e-clear.mjs` Warehouse + Clear mode: only "Enemies left N" (alive + pending), no room tags /
    counts / lives / score / blips, no per-room feedback, "DOWN", OPERATION COMPLETE stinger, results without a
    rooms row; Wave keeps room tags; doorway checks; mini room set; Warehouse default for Wave / Mission / Clear
  - `scripts/e2e-training.mjs` the training course by touch: hints per device, each step advancing, the
    Takedown / Mark / Execute buttons, HUD defaults (no health bar, ammo fades), the results
  - `scripts/e2e-offline.mjs` service worker precache (every manifest entry), offline boot + match, backgrounding
    pauses, co-op offline state, v1 save in IndexedDB migrated on boot with a backup
  Long simulations use `window.__app.loop.stepHeadless(seconds)` (no rendering) to stay fast.
  - `node scripts/shot.mjs out.png "autostart=proving" 60 "<js>"` screenshot helper (`?autostart=<mapId>`)
  - `node scripts/rig-shot.mjs out.png [yaw]` close-up of the Loadout operator (proportion/silhouette checks)
  - `node scripts/anim-sheet.mjs out.png <walk|jog|sneak|crouchrun|sprint|start|stop|strafe|back|turn|crouch|dash|
    reload|swap|grenade|cover|highcover|peek|vault> [frames] [interval] [side|front|back|ots]` contact sheet
  - `node scripts/perf.mjs [--budget]` (`STEALTH=1`: ten unaware enemies perceiving) Warehouse, 10 enemies: CPU per 120 Hz frame p50/p95/p99, animation ms per
    character, allocations (per simulated second / per frame, top allocators), draw calls (`PROFILE=1` CPU profile)
  - `node scripts/soak.mjs [minutes=10] [url]` (`MAP=`, `MODE=`) real-time soak: pacing, CPU, adaptive quality, heap growth (leak check)
  Uses the preinstalled Chromium (Pixel 7 landscape emulation, SwiftShader GL - FPS there is not representative).

## Branches and deploy
- Work goes to `dev`; the default branch (`master`) is the live game. Pages hosts both: live at `/<repo>/`, the
  `dev` build at `/<repo>/preview/` (`VITE_PREVIEW=1`: `__PREVIEW__`, version label "PREVIEW", its own IndexedDB
  `shoulder-strike-preview`, the live worker's `navigateFallbackDenylist` skips `/preview/`). `preview.yml` checks
  `dev` pushes; `deploy.yml` (default branch, also on `workflow_run` of that check) builds both and deploys. Release
  = merge `dev` into `master`.

## Hard rules
- No runtime CDN or network dependency. All assets are bundled; Havok WASM is imported with `?url`.
- No external art/audio. Visuals are procedural/primitive; audio is WebAudio synthesis.
- Import Babylon only through `src/core/babylon.ts`. Babylon 9 is tree-shaken and stubs methods whose
  side-effect module is missing (it warns: "requires a side-effect import"). Add the side-effect import there.
- Important data goes to IndexedDB (`src/save`). `localStorage` is never used for saves.
- Coop code lives in `src/net` and is only reached through a dynamic `import()` behind `flags.coop`.
  Single player must never import from `src/net` statically.
- Strict TS (`noUncheckedIndexedAccess`, `verbatimModuleSyntax`: use `import type`).

## Module layout (`src/`)
| Module | Responsibility |
| --- | --- |
| `core/` | `babylon.ts` import surface, engine creation, `GameLoop` (fixed 60Hz sim + manual Havok step, `timeScale`, `onFrameEnd`), event bus, feature flags, `pacing` (refresh detection, frame stats, dynamic resolution; pure), `quality`, `mathx` (`hyp2`/`hyp3`) |
| `input/` | Action map; touch, gamepad, keyboard/mouse sources all write the same `InputState` |
| `ui/` | DOM overlay UI. `FocusNav` spatial navigation shared by every menu; screen stack; HUD; debug overlay |
| `game/` | Play session state, game modes (wave, mission, clear, sandbox), damage/health, pickups, interactables, `tactics` (exposure, cover quality, suppression; pure), `roomClear` (pure) |
| `physics/` | Havok loading, collision groups, body budget |
| `player/` | Character controller (Havok `PhysicsCharacterController`), tactical movement maths, contextual traversal + `attach` (attached-state machine; pure), proportions, shared `CharacterRig`, camera |
| `anim/` | Pure animation: `MotionDriver` (root motion), `curves`/`pose`/`clip` + `clips/` (clip library), `Inertializer`, `AnimGraph` (clip graph -> IK targets), `FootPlanner` (world-space feet), `rigMath` (two-bone IK, `Spring`) |
| `cover/` | Cover faces (`coverData`, pure), `CoverStateMachine` (pure), `CoverController` (player cover), corners/doorways (`corners` pure, `CornerController`) |
| `weapons/` | Data-driven weapons, hitscan + pooled projectiles, recoil/spread, grenades, `WeaponCarry` (ready positions, raise-to-fire) |
| `ai/` | Enemy state machines, grid navmesh + A*, cover points; `perception` (sight / noise maths), `alertState` (alert levels), `patrol` (routes, posts, search points) - all pure |
| `world/` | Modular tile kit and map builders (Warehouse, Embassy, Mansion, Port, Refinery, Dust Depot, Proving Grounds), `rooms` (room tags; pure), `anchors` (traversal anchors; pure), `lights` (light model; pure), `lightRig` (renders it) |
| `progression/` | XP/levels/currency maths, unlock tables, upgrade trees (pure, unit-tested) |
| `cosmetics/` | Avatar part catalogue, procedural materials/camos |
| `save/` | IndexedDB wrapper, versioned schema, migrations, export/import |
| `audio/` | WebAudio synth voices and mixer |
| `vfx/` | Pooled particles, tracers, decals |
| `net/` | Optional coop: transports (Trystero / BroadcastChannel), protocol validation, session/lobby, host + client sims, lobby UI |
| `pwa/` | Service worker registration, fullscreen/orientation, gesture suppression |
| `config/` | JSON/TS content data (weapons, enemies, unlock tables), `movement.ts` and `camera.ts` feel tables |

## Game loop
`GameLoop` disables Babylon's automatic physics (`scene.physicsEnabled = false`) and steps Havok itself at a
fixed 1/60 s inside an accumulator (max 4 steps/frame, backlog dropped). Order per step:
`fixedUpdate(dt)` -> `onBeforePhysicsObservable` -> `physics._step` -> `onAfterPhysicsObservable`.
After the steps: `frameUpdate(dt, alpha)` then `scene.render()`.

## Input
- Actions (`input/actions.ts`) are the only thing game/UI code reads. Sources: `GamepadSource` (polled each
  frame, standard mapping in `gamepadMapping.ts`), `TouchControls` (DOM virtual sticks/buttons, layout from
  settings), `KeyboardMouseSource` (PC browsers: pointer lock in a match - requested by
  `setGameplayActive(true)` on the click that starts / resumes, else any click on the game captures without firing;
  a "click to capture" hint while free; losing it mid-match taps `pause`; mouse buttons are pointer events because
  Babylon cancels canvas `pointerdown`, which suppresses `mousedown`).
- Bindings (section 7 of 1.3.0): gamepad LS move, RS look, LT aim, RT fire, A `cover` (take / leave /
  cover-to-cover), B `crouch` (stand / crouch at high cover), Y `jump` + `interact` (contextual: an interactable
  in reach takes it, else traversal), X tap `reload` / hold (`SWAP_HOLD` 0.35 s) `swapNext`, L3 `dash` (= sprint),
  R3 shoulder, RB/LB weapons (RB `mark` while aiming), D-pad up `grenade` (the gadget: hold aims the arc, release
  throws), D-pad down `gadgetWheel` (hold), right emote, left `ping` (co-op), View `vision` (goggles);
  Y also takedown / execute (contextual); in menus Y = `uiAlt` (`Screen.onAlt`, Loadout: customise). Keyboard: Space cover, C / Ctrl crouch, Shift sprint, E traverse /
  interact / takedown, R reload, Q / X weapons, N goggles, T mark, Y execute, G gadget, Tab wheel (hold), 1-8 pick
  a gadget (`InputState.gadgetPick`), J / K / L emotes, Z ping; mouse look, LMB fire, RMB aim, wheel weapons. Gamepad look: 30 ms smoothing (acceleration inside the
  smoothing, so releasing never steps the rate).
- Touch (`input/touchControls.ts`): pointer handlers only record state; `update(dt)` (per frame, from
  `InputManager.poll`) turns it into input. Floating move stick on the left half (flick-to-sprint optional, off by
  default); crouch toggle, sprint toggle; camera-only right stick (rate based: dead zone, response curve, 50 ms smoothing, acceleration when
  held at the rim; never fires); optional drag-look in the empty upper right; separate fire button (84 px; optional
  left fire; optional fire drag-look); ADS; goggles (`vision`); a contextual action button only to use an interactable (`setAction(TouchAction)` from
  `GameState`, hidden otherwise; acts on release). Cover, vault/climb/step/drop and cover-to-cover are the world
  prompts (`ui/hud/worldPrompts.ts`), tapped directly. Secondary buttons >= 56 px. Layout: `settings.touch.layout` (`TOUCH_CONTROL_IDS`, per-control `x, y,
  scale, alpha?`), presets `LAYOUT_PRESETS` (default / claw / lefty), `TOUCH_LAYOUT_VERSION` 3 (v1 layouts keep
  customised placements, the old fire stick and untouched controls take the new defaults; v2 -> v3 keeps every
  stored placement and adds the `takedown` button, shown only while a takedown is on offer, action `interact`). Layout editor: presets,
  size, opacity, thumb-reach overlay, preview.
- `InputState` merges sources per action (down if any source holds it), latches press edges until consumed,
  and `releaseAll()` blocks still-held buttons until released so state changes never cause phantom presses.
- Edges are consumed after each fixed step (gameplay) or by `ScreenManager.update` (menus open).
- `InputManager` owns the active mode (`touch|gamepad|kbm`), sets `body.input-*` classes; CSS uses them to
  show/hide the focus ring, glyph prompts, and the touch layer.
- iOS exposes a controller only after its first button press: `GamepadSource` scans on every poll, not just on
  `gamepadconnected`.

## UI
- HUD (Blacklist-minimal, `Hud.setAccess` per frame from `settings.access`): health = the screen-edge vignette
  (bars optional, `.no-hbar`), the weapon readout fades (`.quiet`) 3 s after the last change, hold ring on the use
  prompt (`setInteract(text, progress)`), subtitles (`BarkView.subtitles`), colour-safe arcs
  (`AwarenessArcs.colorSafe`), `--hud-scale` (CSS `zoom`), camera `shakeMul`, held actions by tap
  (`access.holdToggle`, `GameState.holdLatch`). `ControlsScreen` (Settings > Accessibility) lists bindings per
  input type (`CONTROLS`; keep it in step with the mappings).
- Training (`game/training.ts` pure steps, `modes/trainingMode.ts`, Proving Grounds, `?mode=training`): passive
  guards (`Enemy.passive`), invulnerable operator, a step skipped after 90 s.
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

## World and player
- Maps (`world/maps/*.ts`) are `MapDef`s: a `build(builder, seed)` that places modular pieces through
  `LevelBuilder` and returns a `MapLayout` (spawns, props, objectives, pickups, optional `rooms`). Register in
  `world/maps/index.ts`; the first map listing a mode is its default (Warehouse for Clear, Mission and Wave,
  Proving Grounds for Free Roam). `LevelBuilder.wallX/wallZ` build walls with door gaps.
- Warehouse (`world/maps/warehouse.ts`): truck yard, loading dock, dispatch, workshop, a 2.2 m service corridor,
  racking aisles, factory floor, a mezzanine deck (stairs) and two offices; roofed (visual only: roof and lights
  do not collide, so the nav sampler sees the floor) with skylight strips. Nine tagged rooms with squads. Proving
  Grounds has a three-room mini set (north west) for tests.
- `LevelBuilder.build` emits thin instances (boxes, cylinders) and one static body with a container shape.
  Use `visible=false` pieces for collision-only helpers (stairs collide as a ramp).
- Characters use `CharacterRig` (see "Characters" below) with a `PartFactory`; `PartLibrary` instances share unit meshes and one
  material with per-instance colour, so any number of characters costs ~5 draw calls.
- `PlayerController` runs in `fixedUpdate`; `Player.frameUpdate` interpolates, updates camera and animation.
- Collision groups/masks/budgets live in `physics/groups.ts`. Shots raycast with membership `PROJECTILE`
  and a `collideWith` mask; hit volumes (`ai/hitboxes.ts`, `game/playerTarget.ts`) are ANIMATED bodies
  registered in the `DamageRegistry`, which maps bodies to `Damageable`s.

## Characters (one rig for player, enemies, coop remotes, dummies and the menu operator)
- `player/proportions.ts` (pure) is the single source of body sizes. Average build at 1.75 m:

  | Landmark | Value | | Limb (len, r0 -> r1) | Value |
  | --- | --- | --- | --- | --- |
  | Head h / w / d | 0.229 / 0.158 / 0.19 (7.5 heads tall) | | Upper arm | 0.30, 0.050 -> 0.038 |
  | Shoulder joint y / outer width | 1.435 / 0.46 (~2 head heights) | | Forearm | 0.26, 0.040 -> 0.028 |
  | Neck base / waist / hip joint y | 1.48 / 1.05 / 0.915 | | Thigh | 0.415, 0.082 -> 0.054 |
  | Knee / ankle y | 0.50 / 0.075 | | Calf | 0.425, 0.057 -> 0.036 |
  | Chest w x d / waist w x d | 0.34 x 0.22 / 0.28 x 0.185 | | Hand / foot | 0.17 / 0.27 long |

  Builds (`average | lean | athletic | broad`) only scale girth (0.88-1.15), shoulders (0.95-1.10), waist and
  chest within that range (`BUILD_MODS`). Enemies: runner lean 1.74 m, grunt average 1.77 m, heavy broad
  1.83 m with plates (`config/enemies.json` `height/build/plated/gun`). `hitVolumes(p)` derives hit capsules.
- Mesh rules: bodies, gear and weapons use only smooth shapes from `world/smoothMeshes.ts` via `PartLibrary`
  (`sphere, capsule, limbA, limbL, torso, dome, helmet, rcyl, rbox, pill, torus`): surfaces of revolution or
  superellipsoids with shared vertices and computed normals (no seams). Hard shapes (`box, cyl, cone, hex`) are
  for world props only. Each smooth shape has a hi and lo tessellation (`LOD_DISTANCE` 16 m, per-instance LOD).
  Joints are spheres sleeved into tapered limbs (limbs hang along -Y from their joint) so no pose opens gaps.
  Patterns/camos are procedural with smoothstep edges. One material, instanced: ~20 draw calls for all characters.
- Rig: root -> body (tumble pivot) -> pelvis(`hips`) -> spine -> chest(`torso`) -> neck -> head(`headNode`, head
  centre); chest -> shoulder -> elbow -> wrist; pelvis -> hip -> knee -> ankle; sockets `weaponPivot` (aim
  pocket), `backSocket`, `hipSocket`. Joints use `rotationQuaternion` (root uses Euler `rotation.y`).
- Avatar style (`video.avatarStyle`, `setAvatarStyle`): `detailed` (default since 2.0; `avatarStyleV` 2 moves older
  settings once) or `stick` (capsule limbs, sphere joints and head, pill feet on the same skeleton). Saves and
  cosmetics are unchanged (colours apply to both). The default look is the operator (`torso: 'operator'`: suit,
  carrier, pouches, pads, gloves; `helmet: 'trilens'`: balaclava + tri-lens, `rig.setLensGlow` from the vision
  mode). Enemy looks get the map's faction colours (`ai/factions.ts` `factionLook`, `MapTheme.faction`).
- Rendering extras: `LightRig` light cones (additive, thin-instanced, `CONE_*`), `vfx/blobShadows.ts` contact
  shadows (`GameState.drawShadows`, `NetAttachment.shadows`), `CinematicPost.setGrade(MapTheme.grade)`.
- Animation: callers pass a `RigPose` (speed, local move dir, grounded, crouch, kneel, aim = weapon raise 0..1,
  carry = ready-position weights, weight, aimPitch/aimYaw, kick, dash, slide, landing, reload/reloadEmpty, swap,
  grenade, cover/wallSide/lean/peekOver/blind/edgeLook, traverse/traverseT, check, melee, gait phase, motion
  state, acceleration, root velocity, goal yaw, stop point, stick intent, swap from/to slots) to
  `rig.animate(dt, pose)` every render frame (120 Hz). `rig.onPosed` callbacks run after each solved pose.
- Clips (`anim/clips/*.ts`) are keyed curves over named pose channels (`anim/pose.ts`: pelvis, spine, head,
  weapon, hand targets and weights, foot offsets), monotone cubic, cycles keyed over the gait phase with duty and
  lift, timed clips in seconds with events (`magOut`, `magIn`, `charge`, `holstered`, `release`, ...).
  `addClip` (additive vs neutral) / `overClip` (override); `mirrorClip` for left/right.
- `AnimGraph` builds a source pose per frame: locomotion 2D blend space (`FORWARD_NODES` creep / walk / jog /
  sprint, `CROUCH_NODES` sneak / crouch walk / crouch run x forward/back/strafe), start / stop / pivot clips from
  the `MotionDriver` state, a first-order stick-intent lean (visible on the first frame), acceleration lean and
  roll (leans into turns, <= 8 deg), cover enter/exit and tuck (reload / swap / grenade in cover), traversal,
  slide, land, reloads, per-slot swaps (`swapClipFor(from, to)`), grenade, ready positions blended to the aim
  pose, head-first lean (head ~60 ms ahead, body/weapon out ~0.2 s, back ~0.2 s; gated by the 0.18 s hand swap),
  breathing, recoil, heel-strike compression (`HEEL_KICK`), hit flinch (`rig.hit`, recovers 0.3-0.6 s). State
  switches trigger the `Inertializer` (offset decays critically damped per channel group, 120-250 ms).
- Gait style: `GAIT_STYLE` (`clips/locomotion.ts`) keeps height smooth (small loading dip and rise, smaller still at
  jog / sprint) and shows the weight in hip sway and twist; armed, the body carries a tactical `HUNCH` (chest well
  forward over the hips, knees bent, head up; deeper along cover; `crouch`: bent over the knees, half of it
  straightening into a raised weapon). Footfalls: a small `MOVEMENT.rootDip` speed check, `HEEL_KICK` and a tiny
  camera footstep kick.
- `FootPlanner` (world space): contacts from the gait clock while moving (landing spot = where the hip will be
  mid-stance; distance-matched to the stop point), locked while planted (< 1 cm), swing arcs with toe-off and
  heel pitch, no crossing, error-driven idle steps (turning on the spot plants steps). Side-steps are 60% length
  (`stepLength(..., lateral)`). Two-bone IK puts feet on it and hands on the weapon's `grip`/`foregrip`/magazine
  well (wrists offset behind / under the palm points in weapon space, `WRIST_TRIGGER` / `WRIST_SUPPORT`, so the
  elbows bend) or the cover surface; the pelvis drops so both feet stay reachable (each leg measured from its own hip
  joint; a growing need is met at once, release eases); leg IK twist references stay defined in a deep sneak
  (kneecap away from the shin); planted feet measure reach from under the hip and toe off early at speed; a
  relaxed stance tolerates a front-back stagger (one settling step); the head is world-stabilised; the
  weapon's orientation lags by its mass. Legs solve (and are rate limited) before the head and weapon: knees never go under
  `KNEE_FLOOR` (the hips rise), knees closer than `KNEE_GAP` bow outward (steeper pole), and low cover hiding
  curls the back (`rig.curl`, graph `duck`) instead of crushing the legs. The weapon blends from the body to the
  aim by `aimW`, sits beside the head when aimed (`SIGHT_RAISE`, `NECK_WELD`), and `clearBody()` pushes it out
  of the trunk, head and leg capsules (`rig.gunSpan` from `WeaponModel.hold`). Kneeling in cover mirrors
  (`KNEEL_M`) so the gun is on the open side. A per-joint angular rate limit (`JOINT_RATE`) is the safety net
  (`rig.limited`). The rig refreshes world matrices top-down once per node (`fresh`), never
  `computeWorldMatrix(true)` per joint (it re-forces the whole chain). Emotes return an `FkPose` slerped over the
  result. Rigs beyond `ANIM_LOD_DISTANCE` (22 m) animate at half rate; `animate` is a no-op after `dispose`.
- Weapons (`config/weapons.json`, real sizes: rifle 0.84 m, SMG 0.60, shotgun 1.00, sniper 1.15, pistol 0.19;
  parts carry a `role`: barrel, receiver, grip, mag, ...; `modelExtents`): `WeaponModel.hold(rig)` (aim pocket,
  hands IK'd to `grip` / `foregrip` within 2 cm, magazine well from the mag part) / `holster(rig, slot)` /
  `inHand(rig)` (mid-swap). `weapons/carrySlots.ts` (pure) gives every loadout weapon its own slot: long guns
  vertical on the back (`backL/backC/backR`, muzzle up, thin side to the back, splayed from the butt, standing
  off `rig.backGear` = vest / hood / backpack depth measured from the parts), compact guns on the left-hip
  `sling` (pushed out by the thigh after each pose via `rig.onPosed`), the pistol low on the right `thigh`
  (standing off `rig.thighOuter`); `GrenadePouches` on the belt. Swaps: holster at 38%, take the next from its
  slot at 58%, in the aim pocket at 80% (0.9 s). Co-op remotes build the same from the lobby `loadout`. Deaths: `Ragdoll` = 5 Havok bodies (torso, legs, arms) with ball-and-socket joints at hips
  and shoulders, limbs never collide with their own torso, capped by `BUDGET.maxRagdolls`.

## Movement and camera (stealth operative)
- All feel constants live in `config/movement.ts` (`MOVEMENT`, live-tunable in the debug overlay's Tune panel):
  crouched sneak 0.8 / crouch walk 1.8 / crouch run 2.6, standing walk 1.4 / jog 2.8, sprint 5.0 m/s (toggle or
  hold `gameplay.sprintHold`, no stamina, stands you up, weapon lowered at the low ready; aiming ends it via
  `cancelSprint`), aiming 1.4 / 1.0 crouched; strafe x0.9
  and backstep x0.75 only while aiming; analog by stick bands (`sneakBand`, `walkBand`, `crouchWalkBand`); cover
  2.3 / 1.25 crouched (a jog along the wall; `COVER_MOTION` never pivots), cover-to-cover run 3.6. Stance times: crouch 0.25 s, kneel 0.3 s, stand 0.28 s.
  `ENEMY_MOTION` keeps the enemies' slower, weighted tuning.
- `anim/motion.ts` `MotionDriver` (pure; player and enemies): first-frame response, 90% speed in 0.2-0.35 s
  (sprint <= 0.45), stops in 0.2-0.35 s (`brakeGain`), capped acceleration / deceleration / jerk (never carrying
  more acceleration than the active tuning allows), a gait clock (`phase`) with a heel-strike dip. `faceTravel`
  (not aiming): the body faces the travel heading, which swings at `travelRate` (540 deg/s at a sneak down to 300
  at a sprint) and no tighter than the grip allows; still, it holds its facing (the camera orbits freely). Aiming:
  <= 360 deg/s. Reversals over 135 deg at speed are a 0.3 s planted pivot. `carry(vx, vz)` keeps traversal
  momentum. Enemies keep stepped turns (explicit facing). Frame-rate independent (60 vs 120 Hz parity tested).
- `player/movement.ts` (pure): `targetSpeed(mag, stance, localX, localZ)`, `SprintGate` (toggle / hold, ends
  when the stick drops), `pickTraversal` (step <= 0.65 m, vault <= 1.25 m and thin, mantle <= 1.8 m, hop over gaps
  when sprinting), `noiseRadius(speed, crouched, sprinting)` (2.3: sneak, crouch walk and a slow walk 0; crouch
  run ~2 m, jog ~3.4 m, sprint 9 m). `PlayerController.steps`: 'silent' while an override drives the step (cover
  glides and moves along cover, climbing, vaults, attached), 'crouched' for a cover-to-cover run; footsteps only
  when grounded (`PF.silent` carries it for co-op clients). Crouched targets are seen at 0.6x the distance.
- Kneel = crouched and still. There is no free jump: `TraversalController` (`player/traversal.ts`) probes ahead
  (5 Hz, for the HUD prompt) and on traverse plays a committed step / vault / mantle / drop / hop, timed by speed
  and carrying momentum out (in stride). Footstep noise goes to `EnemyManager.hear` (investigate).
- `PlayerController.override` lets cover/traversal drive a step (velocity + facing + turn rate + crouch, `glide`
  for an eased path, `run` for cover-to-cover, or a kinematic feet path); `steer` is a gentle velocity bias
  (slicing the pie); `stanceMul` / `speedCap` slow (leaning).
- Weapon carry (`weapons/weaponCarry.ts`, pure): ready position from context (`pickReady`: compressed near walls,
  doorways, cover edges, sprinting, reloading; high in tight corridors/traversal; else low), raised only to aim or
  fire (raise ~170 ms, lower ~300 ms; `CARRY.raiseTime` x weapon `weight`), the trigger is live at
  `fireThreshold`, held `holdAfterFire` after the last shot. `PlayerWeapons` gates on `carry.canFire`.
  Raised = a cheek weld, never hip fire: `SIGHT_RAISE` (anim graph) lifts the gun so its sight line is level with
  the eye beside the head (stock high, elbows up) and the rig closes the loop on the posed head
  (`sightToEye`, any stance, hunch or lean), the neck flexes the head onto the stock (`out.weld` -> `NECK_WELD`) and the shoulders lift
  into it (`SHOULDER_WELD`). Ready poses (`READY_POSES`): low (stock in the shoulder, muzzle ~45 deg down across),
  compressed (tight to the chest, muzzle forward-down, never swung across into a wall), high; in cover
  `COVER_READY` (muzzle down along the wall, turned away from it, relative to the hand holding it;
  `COVER_READY_CROUCH`: flatter, higher and further out, clear of the knees; coming up toward level as the body
  leans out; carried flatter moving crouched). Gliding into cover the carry is compressed until the tuck takes
  over; turning round at high cover (turn-and-swap, corner) it goes to the high ready, at low cover the tucked
  muzzle comes up; crouched in the open the lowered muzzle lifts with the crouch.
- Camera (`config/camera.ts` `CAMERA` + `framing()`): free orbit - look input applies the same frame and nothing
  holds the view back (no twist clamp, no look cap); lowered, looking around only turns the head
  (`RigPose.lookYaw/lookPitch`): spine, arms and gun move with the camera only once raised (`aimYaw/aimPitch` x
  raise); Splinter Cell: Blacklist framing - the operative small in
  the left third (boom 2.2 / ADS 1.5, shoulder 0.62 / 0.58, pivot 1.62 / crouched 1.18, height -0.08; crouched
  low in the lower left), a sneak frames a touch tighter, cover pulls back `coverBoom` to show the room. FOV is horizontal at 16:9 (`video.fovH`, default 75), Hor+. Springs
  updated every render frame: follow 80-150 ms with look-ahead, aim framing 150-250 ms, shoulder swap ~250 ms on
  an arc, auto shoulder in cover / at peeks, optional auto-recentre after 1.5 s of no look input
  while moving (`gameplay.autoRecentre`), handheld drift (<= 0.15 deg), micro-bob (<= 1 cm), sprint FOV +4 deg.
  Tight spaces: the boom pulls in fast and eases out slowly, then `applyBodyFade` hides the head / body.
  Shake roll is `rotation.z`; the camera sets `updateUpVectorFromRotation` (Babylon otherwise rebuilds the up
  vector, pitch included, only when `rotation.z` changes, freezing a tilted horizon when a shake ends).
- Aim assist (`weapons/aimAssist.ts`): friction fades across the cone edge (and over ~60 ms in `GameState`),
  magnetism fades at the centre, so sweeping across a target never jolts the view.
- Cinematic post (`vfx/cinematicPost.ts`): one pass for vignette, optional film grain and letterbox (stingers);
  `GameState.slowBeat()` (0.25 s at 0.6x, setting `gameplay.slowBeat`) and `letterbox(seconds)`.

## Traversal anchors and attached states (2.0 phase 1)
- `world/anchors.ts` (pure): `Ladder {base, top, facing, rung, width}`, `PipeVertical {base, top, side}`,
  `PipeHorizontal {a, b, hangHeight}`, `Ledge {a, b, top, n, t, len, drop, canHang, canClimbUp, nextA/B}`,
  `Duct {path, entry, exit, grates}`, `WindowAnchor`, `Door`, `Zipline {a, b}` in a `TraversalAnchors` (ids index
  `all`; co-op sends them). `generateLedges(boxes)` makes lips from box tops (`LEDGE.minDrop` 1.9 m, cut by pieces on
  or against them, broad-phase by bounding circles, `noLedge` pieces skipped); `LevelBuilder` places the rest
  (`ladder/pipeV/pipeH/zipline/duct/windowAt/door/ledge/noLedge`; their visuals never collide) and `build` adds the
  generated ledges (lips outside the bounds disabled) to `BuiltLevel.anchors`. Helpers: `closestOn`, `reach` (entry:
  bottom / top / below / above / side), `nearestInReach`, `anchorsNear`, `hangPoint` (`HANG.drop` 1.9 m under the
  lip at 1.75 m, `HANG.out` 0.22 m off the face), `lipGrips`, `nearestRung`, `ductPoint`, `ledgeContinuation`,
  `findJumpTarget`. Climbers stand `CLIMB_STANDOFF` 0.28 m off the rungs / pipe.
- `player/attach.ts` (pure): `AttachMachine` (none -> enter -> on -> exit) with `ATTACH` specs per kind (axis:
  vertical / along / path / auto; speed + accel with a first-frame response; enter / exit times; `camera` preset;
  `allow` sidearm / takedown / drop / traverse / gadgets; `holster`). `axisInput` maps the stick (camera relative
  along tangents), `attachPose` gives the feet + facing on the anchor, `attachRange` the travel range, `update`
  reports pushing past an end (`edge`). Ladder 3 rungs/s (`LADDER_RUNG_RATE`; sprint held `LADDER_SPRINT_RATE` 5, drainpipe x`PIPE_SPRINT`), slide `LADDER_SLIDE`; zipline
  builds to `ZIP_SPEED` 6 m/s.
- `TraversalController.attach` runs it: `attachTo(anchor, s, entry)`, `detach(reason)`; `input` (move, camera yaw,
  drop) is filled by `GameState` each step. While attached it drives `override.kinematic`, sets `coverPose.traverse`
  to the pose family (`hang` / `climb` / `crawl`, clips in `anim/clips/traverse.ts`; `traverseT` = climb cadence) and
  the rig's world targets; `GameState` stows the weapon (`PlayerWeapons.setStowed`: the swap's holster half, held)
  and sets `cam.attach` (framing preset `ATTACH_FRAMING` in `config/camera.ts`, blended by `blend`).
- Run time (`player/attachController.ts`, owned by `TraversalController.attachCtl`): from the ground the traversal
  probe also asks `probe` (anchors in reach, 5 Hz); traverse attaches when no step / vault / mantle is offered
  (ladder bottom / top, drainpipe, pipe and lip from below); at a hangable edge traverse still drops down and the
  drop control held `LOWER_HOLD` (a fresh press) or the "Hang" prompt (`lowerRequest`) lowers in. Attached: drop
  lets go (a ladder slides to the bottom, latched), traverse jumps to `jump` (`findJumpTarget`: <= 2.5 m from the
  grip centre along the camera-relative stick, into the wall = up, same-facing lips preferred) or climbs up
  (`canClimb`: room on top); pushing past a lip's end continues round the corner (`ledgeContinuation`) unless a
  jump target is under the stick; a drainpipe's top waits: traverse climbs up off it (`pipeLip` with room), a sideways push (`sidePush`) swings onto a lip beside a ladder / drainpipe (`stepOffSideways`); shimmying past a climber crossing the lip swings onto it (`passClimber`; `transferT` stops ping-pong); placed climbers outscore lips in `nearestInReach`. Entries from above / a ladder top turn
  round and step out before dropping to the hands. Hands and feet step with `GripStepper` (pure: locked contacts,
  the worse-off limb swings to a new grip, the next may start half way through, optional rung grid) driven per
  render frame (`TraversalController.frameUpdate`, interpolated body parameter); the climb clip phase follows
  the hand swings. Prompts (`GameState.anchorPrompts`): 'vault' (Climb / Grab / Climb up), 'jumpTo', 'drop'
  (Drop / Slide / Hang).
- 2b: landings (`player/movement.ts` `LANDING` / `landingKind` / `landingNoise`; `PlayerController` tracks the fall's
  top, `lastLanding`, `landings`, `landVX/Z`, `registerLanding` for committed falls, `launch(v)` to fly off an
  anchor): a roll is a committed traversal (`kind 'roll'`, `ROLL` clip + `rollTumble` -> graph `tumble`; the rig
  turns the feet over with it), heavy = `landT` recovery; GameState makes landing / glass / kick noise
  (`eventNoise`, held on the meter). Falling past a lip: `AttachController.fallProbe` (Y grabs). Zipline: auto axis,
  `finish` launches along the cable. Windows: `TraversalController.windowProbe` (reach rule in `anchors.reach`)
  -> a vault through, breaking the glass (`hintWindow`). Ducts: `AttachController.vent` (tap kick / hold unscrew
  via `useHeld/useHeldT`), crawl with hands planted on the floor, `ductEnd` (wall vent: crawl out; ceiling vent:
  committed drop, `exitDur`, registered as a landing). `Breakables` (`world/breakables.ts`): glass / grate panels as
  their own static bodies + thin instances, `open(key, how)`, `onOpen`. `anchorFirst`: ladder / drainpipe / duct /
  zipline hints beat geometric moves. Lowering into a hang is `AttachController.lower` (separate from `hint`).
- 2c: maps place anchors for alternate routes (Warehouse windows, rack ladders, mezzanine ladder / zipline, a duct
  into the manager's office; Dust Depot windows and wall-top routes). `REACH.grabMax` 2.7, `LEDGE.climbDepth` 0.38.
  `BoxPiece.overhead` (`LevelBuilder.mark`): ceiling slabs / ducts that are never nav blockers for the floor under
  them (the layered grid keeps both surfaces). Clean poses: quick stow (`STOW_RATE`), outside-corner transfers curve through `via`, jumps need
  `lineClear`, `CLIMB_UP` / `VENT_DROP` / `WINDOW_VAULT` clips, `PIPE_STANDOFF`, `plantFade`; the camera clamps the
  orbit to the preset's `cone` around `cam.attachYaw`.
  While attached the graph skips the swap clip (the stowed weapon goes straight to its slot).
- Rig world targets: `reachL/R` (palm points, weight; the wrist sits behind the palm along the reach) override the
  weapon / clip hands; `plantL/R` (sole points) override the feet while off the ground planner.
- Input: `drop` is raised with `crouch` by `InputState` (alias), `interactHold` after `INTERACT_HOLD` 0.3 s;
  `heldTime` / `holdProgress` for rings (`InputState.tick` from `InputManager.poll`).

## Light model (2.0 phase 1)
- `world/lights.ts` (pure): `LightRegistry` (lights with radius, optional cone, intensity, on / destroyed, switch
  `group`, `electric` for EMP `disrupt`, `version` bumped on change; `ambient` from `MapTheme.lightLevel`, default
  0.75 daylight). `lightLevelAt` = ambient + sum of `intensity * falloff * cone`, clamped, optional `Occluder`
  (only called for lights in range); `bodyLightLevel` = brighter of chest / head; `visibilityFromLight` (0.25 in
  darkness .. 1); `nearestLights` (allocation-free, for rendering).
- `GameState.updateLight` samples the player at `LIGHT.playerHz` (10 Hz) with static-geometry occlusion rays
  (`lightLevel`, `localRef.light`); `Enemy.perceive` stores `targetLight` each think (the ref's sample or the
  registry at the aim point).
- `world/lightRig.ts`: emissive bulbs (one thin-instanced mesh) for every light, and a fixed pool of
  `MAX_REAL_LIGHTS` spot lights (lamps = wide downward cone) given to the nearest lights at 4 Hz; quality sets how
  many are lit (`QualityLevel.realLights`). Pool lights are never enabled / disabled (no recompiles); materials
  get `maxSimultaneousLights` for the pool. Maps without lights create nothing.

## Corners and doorways
- `cover/corners.ts` (pure): `findDoorways` (0.7-1.8 m gaps between collinear high faces), `outsideCorners`,
  `sliceSteer` (ease out to a ~1 m standoff approaching a corner), `doorSide`, `pickLean`.
- `CornerController` (runs when not in cover/traversal): slice-the-pie steer + compressed ready near corners,
  doorway compressed ready + check sweep on crossing, contextual lean while aiming with the aim line blocked
  (probes centre/left/right; shoulder swap and restore; hips planted via `stanceMul`).

## Cover (`src/cover`)
- `buildCoverSegments(boxes, cylinders)` (called by `LevelBuilder.build`) makes a face per side of every upright,
  visible, colliding piece >= 0.75 m tall: low (0.75-1.45 m, crouch) or high (>= 1.6 m, standing); pillars become
  octagons. Faces carry outward normals, depth and outside-corner links. AI cover points
  (`level.cover`) are sampled from the same faces; enemies peek past the nearest edge of high cover.
- Run-time probing (raycasts) re-checks the real cover height (stacked crates, slopes), the snap point (floor,
  clear path), inside corners/narrow gaps, vault landing, corner swings and that the surface still exists.
- `CoverStateMachine`: none -> enter (glide) -> in <-> peek (aim) / blind (fire without aim) / corner (the cover
  button while pushing against an outside edge, `cornerPush`; never automatic; 0.5 s swing; afterwards the
  still-held stick is not "away" until released) ; vault (traverse at clear low cover) ; dash (cover or sprint with a
  marked target; a push back against it for ~0.15 s cancels) ; exits on cover with no target, sprint with no
  target, traverse at high cover (traversal may then mantle via `exitDir`), a firm push away (sticky: `away >
  0.75` for `AWAY_TIME` 0.25 s), lost surface, death. Crouch never leaves cover: it toggles standing / crouched
  at high cover (`highCrouch`; low cover is always crouched).
- Side-on: the body faces along the face (`faceDir`), shoulder to the wall (`wallSide`); reversing direction is a
  turn-and-swap (`SWAP_TIME` 0.3 s, `swaps` counter); kneels at low cover when still. Snap from up to `SNAP_REACH`
  3 m: a Hermite glide carrying the approach velocity, 0.25-0.42 s by distance (`GLIDE_MIN/MAX`), a slide when
  sprinting. Peeks (`peekKind`): over low cover, or round an edge of low (aiming past it) or high cover, standing
  or crouched, leaning in place (capsule stays in cover). Pushing into an inside corner turns onto the adjoining
  face. `target` (5 Hz, and the moment the stick is pushed / released) is the cover-to-cover destination only on
  intent: the stick held towards it (> `TARGET_STICK`) AND the view looking at it (`TARGET_LOOK_COS`, ~50 deg)
  (routed via a waypoint past the current face's end when the straight line is blocked), or a SWAT turn (low,
  `SWAT_SPEED`) to collinear cover beyond a gap; pushing towards a marked target never counts as backing out of
  cover; the marker is a world prompt on the target.
- `CoverController` (player): standoff `COVER_STANDOFF` (capsule radius + 5 cm, > body depth); strafes along
  the tangent with predictive braking, stopping `EDGE_STOP` 0.45 m short of an edge (peeks / step-out go on from
  there); low cover hides (the rig's `lift` ducks until the head top is
  `HIDE_MARGIN` 7 cm under `coverTop`) and the over-peek stays crouched (`aimOver`: back straightened, weapon at
  the cheek, rising until the eye is `OVER_EYE` above the top, side-on until `rig.overClear`; camera eye >= top + `COVER_EYE`);
  `aimLimit` (`cover/coverAim.ts`, pure: edge / over / wall arcs, pitch floor over low cover) clamps the camera
  so every aimable angle shoots clear, and fire waits until the weapon is out (`player.coverFireBlocked`); while
  the view eases into the arc the body holds side-on with the weapon tucked; edge peeks step out past the edge as
  far as the predicted line of fire needs to clear the cover (`stepOut` <= `STEP_OUT_MAX` 1.4 m along a path round
  the corner, `stepPoint`: along the face, round the edge on the standoff circle, along the side; `neededStep`
  checks the fire line and that the path is free; `EDGE_BACK` lets the aim come 0.7 rad back across the cover), the body
  stays side-on facing the edge and the weapon tucked (`pose.gunClear` -> graph `peekClear`) until the line is
  clear, then turns to the aim; every turn in cover is measured from a safe centre and never wraps through its opposite (side-on / tucked:
  via facing away from the wall, never through it; turning to the aim: within the aim arc), so quick aim and
  direction changes never spin the body; already facing across low cover it leaves the short way; edge peeks lean out past the edge and
  move the camera to that shoulder (restored after); the head leads and the weapon is out in ~0.2 s; at a left
  edge the weapon changes hands (`HAND_SWAP_TIME` 0.18 s, `rig.leftHanded`) before the lean; leaving pushes off
  (`EXIT_PUSH` 0.9 m/s over 0.45 s); blind fire = spread x3 and minimal exposure. Moves are played big (film):
  `COVER_ENTER` slams in with `cam.impact` by approach speed, `COVER_TURN` ducks through turn-and-swap and corner
  swings (`pose.turn`), `COVER_EXIT` pushes off.
  Exposure is physical: the hit volumes follow the posed rig (ducking lowers them); enemies seeing only the
  head aim at it (`Damageable.headPoint`).
- Input: cover is manual only (no auto-snap): action `cover` = controller A, keyboard Space or a tap on the
  take-cover / cover-to-cover / corner prompt; leaving is the cover button (no target) or a firm push away. `dash` (sprint) = L3 / touch sprint button (stick flick optional) / Shift. Setting:
  `gameplay.coverDash` (cover-to-cover, default on).
- World prompts (`WorldPrompts`, layer `.hud-world` above the touch layer, below menus; `GameState.updateCoverHud`):
  `cover` on the candidate face, `vault` on the traversal obstacle (`TraversalController.hintAt`; beside the cover
  prompt when both apply), in-cover `vault` along the face in use (on the low cover's top edge, since the camera
  looks over it), no badge on the face in use (`state` only warns "Flanked"), `corner` on the edge while pushing
  against an outside corner (`CoverController.cornerSide`), `move` on the cover-to-cover target. One height per surface: `seg.y +
  min(PROMPT_Y 0.55, height / 2)`; `flush()` pushes overlapping prompts apart and keeps them on screen. Glyphs by
  pad / keyboard, icons and tap-to-act by touch.

## Stealth AI (2.0 phase 3a)
- `ai/perception.ts` (pure, `PERCEPTION`): `sightRate` = rate x (1 - d / range)^1.5 x field (55 deg focus, 25 m;
  peripheral 100 deg, 12 m, x0.35) x `lightFactor` (`visibilityFromLight`^2) x stance x `motionFactor` x exposure
  (fraction of chest / head / hips in line of sight) x state sensitivity, plus a close-range term (2.2 m, moving),
  capped at `maxRate`; `instantDetect` (point blank, lit, in focus); `stepMeter` (rises by what exceeds `leak`,
  holds `hold`, drains `decay`); `noiseSuspicion(dist, radius)`.
- `ai/alertState.ts` (pure): `AlertMachine` unaware -> suspicious -> investigating -> alert -> searching ->
  cooldown (`ALERT` times, `SENSITIVITY` per level). `Enemy.alerted` = level alert (combat).
- `Enemy`: perceives at ~4 Hz (rays to chest, head, hips; hips skipped in combat), integrates the meter per fixed
  step (`updateAwareness`), `calmDecide` drives patrol (`PatrolWalker`: `SquadSlot.route` / post with glances),
  look at the stimulus, walk to it (`goTo`: straight or A*), search sweeps (`searchPoint`, `searchSlot`). Inputs:
  `hear(x, z, radius)`, `hearGunfire`, `radio(delay)`, `searchAt` (bodies / lights, phase 3b), `alert()`.
- 2.3: `EnemyManager.hear` muffles a noise to `MUFFLE` (0.45) of its reach when a wall is between it and the
  listener (one ray at head height; low cover does not muffle). Guards hold longer (`PATROL.wait` 9 s, glances every
  14 s, `searchLook` 3 s, `hearLook` 2.4 s, slower patrol / investigate / search paces). Combat: `ALERT.lostSight` 12 s,
  `searchTime` 60 s, and after combat a guard never returns to unaware (`AlertMachine.fought`: cooldown for good).
  Radio window: a sighting (not a loud alert) is shouted to guards within `ALERT.shout` 8 m at once (`ctx.shout`)
  and radioed after `ALERT.callIn` 2.5 s (x reaction; `Enemy.radioT`, bark `callIn`); a spotter taken out first
  tells nobody; gunfire / a hit / a flashbang (`alert()`, `loudAlert`) calls in at once. `PlayerRef.spotted`: set
  when a guard in combat sees that player (`reportSighting`, a sighting alert), cleared when nobody is in combat;
  takedowns skip a guard at level alert while the attacker is spotted (`GameState.spottedLocal`, host check on
  client `td`, `PF.spotted` in snapshots). Tactics: from sight into cover first (85%), attack -> cover after 2.5-4.5 s,
  longer peek cycles (4.2 s, up to 5), slower strafes; out of sight (stealth) an `advancing` bound to cover closer to
  the believed position (`pickAdvance`, 3+ m closer, <= 12 m away), a 2.5 s hold, then the next; the last stretch is
  walked (`ADVANCE_PACE`); cover is picked against `knownPt` (never the real position out of sight). One bullet to the
  head kills any guard but a heavy (`Enemy.applyDamage`).
- 2.0.1 tuning (guards calmer): `PATROL.wait` 5.5 s, glances every 10 s; `ENEMY_CALM_MOTION` (60 deg/s turns while
  not in combat / searching); `noiseSuspicion` rises with the square of closeness (edge noises < suspicious);
  `noiseRadius` walk 1 + 1.3 v; the close-range sense from behind ignores a sneak / crouched approach;
  `TAKEDOWN.reach` 1.8, `behindCone` 0.56 pi.
- `EnemyManager.stealth` (Clear, Mission): shared `lkp` (sightings by alerted enemies, located gunfire), flow field
  to the LKP (never the real position), chase / face the LKP out of sight, arriving with nothing there starts the
  search; `callAlert` radios within `RADIO` 22 m (a radioed alert does not relay); `sightT`, `hunting`. Off (Wave),
  enemies are sent at the players and combat never cools into a search.
- HUD: `ui/hud/awareness.ts` arcs round the crosshair (canvas, drawn only while showing; `shown / maxFill /
  anyRed`; only for enemies `inSight` or within `ARC_NEAR` 2.5 m), `Hud.setLight` meter; `vfx/lkpGhost.ts` (thin-instanced silhouette, 2 draw calls) captured from the rig
  while seen, shown at the LKP while hunted unseen (`GameState.updateStealthHud`).
- Light fixtures: `LightDef.fixture` (box size + offset) is the shot target (`rayBox`) and is drawn by the light rig
  as a box that goes dark with the light (Warehouse lamp strips, flood housings).
- Light: `LightRegistry.zones` / `ambientAt` (`LevelBuilder.ambientZone`); Warehouse is a night map (yard 0.3,
  interior 0.12, `LAMPS_ON`, lamp `group` per room).
- Bodies (3b): `Enemy.die` / `knockOut` hand the rig to `EnemyManager.addBody` -> `ai/body.ts` `Body` (a `Ragdoll`
  with `keep` that stays settled, or laid flat when `canRagdoll` is out of budget; `BODY.max` kept). Enemies not in
  combat look for bodies each think (`bodyNoticed`: field x `lightFactor(body.light)` x distance, close range
  always; one ray) -> `bodyFound`: finder `searchAt(x, z, revive?)`, squad within `RADIO` searches; a non-lethal
  body is revived (`BODY.reviveTime`, `onRevived` -> mode `onEnemyJoined`). Carry (`game/stealthSystems.ts`): a
  fresh unarmed rig (`buildBodyRig`) parented to the player's chest in a fixed over-the-shoulder pose; the player's
  `reachL/R` hold its knees; weapon stowed, `speedCap` `BODY.carrySpeed`, no sprint / cover / traversal; drop = a
  short `Ragdoll` (settle 2.2 s); hide spots (`MapLayout.hideSpots`) remove it.
- Lights (3b): `PlayerWeapons.onRay` -> `StealthSystems.shotRay` -> `lightOnRay` (pure) + `LightRegistry.destroy`;
  `MapLayout.switches` toggle a `group`; both call `EnemyManager.lightsOut` (nearest calm enemy investigates, others
  `notice`). Flashlights: `World` adds `FLASHLIGHTS` (4) `kind 'flashlight'` lights on dark maps; the manager gives
  them to enemies with `torchWanted` (investigating / searching / hunting unseen where `ambientAt` < 0.35) and
  `placeTorch` moves them each step; `LightRig` re-places pooled flashlights every frame (no bulb). The beam stops at
  geometry: `EnemyManager.beamReach` (centre + four edge rays, round robin, 15 Hz per torch) sets `LightDef.reach`,
  the pool light's `range`.
- Alarms (3b): `ai/alarm.ts` (pure) panels from `MapLayout.alarms`; `assignAlarm` (2 Hz) sends the nearest alerted
  enemy (`runAlarm`, run speed) to work it `ALARM.holdTime` -> `onAlarm` -> reinforcements (`reinforce`, at the
  `MapLayout.reinforce` point furthest from the player). The player disables a panel with a hold.
- Sound (3c): `world/surfaces.ts` (pure) `surfaceAt(level.surfaces, ...)` (`LevelBuilder.surface`, default
  `MapTheme.floor`) scales footstep noise (`SURFACE_NOISE`) and picks the footstep voice (`GameState.surface`).
  Shots: `SHOT_NOISE` x weapon noise; at or below `SUPPRESSED_NOISE` it is `hear` (suspicion), else `noise`
  (combat); `onRay` hits are heard within `IMPACT_NOISE`.
- Doors (3c): `world/doors.ts` `Doors` (from `Door` anchors via `LevelBuilder.door`): one thin-instanced leaf mesh,
  a static body only while closed, created by `arm()` after the nav grid is built (co-op clients `openAll()`);
  `open(d, quiet | bash | enemy)` drops the body and swings the leaf, `close` refuses an occupied doorway;
  `pushOpen` (enemies, each step), sprint bash and the interact (`door` kind) live in `StealthSystems`; `onSound`
  -> `door` event (audio) + noise (quiet 2 m, bash 10 m).
- Goggles (3d): `game/vision.ts` (pure) `VisionState` (action `vision` cycles off / night / sonar; `VISION` pulse
  period, reveal, range, max run, recharge). Night vision is the `nv` uniform of `CinematicPost`
  (`setNightVision`); sonar pulses capture enemies in range into `GameState.sonarMarks` (`vfx/silhouettes.ts`,
  overlay = depth ALWAYS), plus a torus ring; `Hud.setVision` on the tactical strip. The LKP ghost uses the same
  `Silhouettes`.
- Interactables: kinds `switch`, `alarm`, `hide`, `body`, `door` with per-item `reach` and `onUse`; `nearest(feet, reach,
  only)` (hide spots only with `only`); `GameState.updateInteract` calls `onUse` (else Mission).

## Takedowns and Mark & Execute (2.0 phase 4)
- `game/takedown.ts` (pure, `TAKEDOWN`): `pickTakedown(input)` -> kind (`behind` / `front` / `side` (calm only) /
  `corner` / `overCover` / `above` / `below` / `window`) + aligned attacker spot, facing, approach (with `arc`),
  strike, optional `victimTo`; `approachPoint`; `lethalFromHold`.
- `game/takedownController.ts`: each fixed step (after cover / traversal / corners) finds the offer (nearest enemy
  within 5 m, one LOS ray; attacker state from traversal / cover / window hint), shows the `takedown` world
  prompt; the interact press starts it (`holding` decides lethal after `lethalHold`; touch `touchPress`). Running:
  `controller.override.kinematic` along the path, `Enemy.beginTakedown` / `holdAt` / `releaseTakedown` (brain off,
  struggle emote), `coverPose.melee` strike, `reachL/R` on the victim (frame update), weapon stowed; damage (hp +
  shield) aborts; finish = `applyDamage` (lethal) or `knockOut`, `marks.earn()`, noise.
- `game/marks.ts` (pure) `MarkSet` (toggle, prune, earn, ready, consume) + `executeStep`; `game/executeController.ts`
  (mark under the camera's aim ray while `player.ads`, readiness at 4 Hz with LOS from the eye, the sequence:
  `loop.timeScale` `EXECUTE.slowScale` unless co-op, letterbox, `player.forceAds`, camera turned to each head,
  one lethal head shot each). HUD: `ui/hud/markers.ts` chevrons, `Hud.setCharge`.
- GameState order: busy (takedown / execute from the last step) skips cover and blocks traversal's jump; Y is a
  takedown when offered, else execute when ready, else interact / traverse.

## Gadgets (2.0 phase 5)
- `game/gadgets.ts` (pure): `GADGETS` (frag, sleeping gas, flashbang, EMP, noisemaker, sticky cam, tri-rotor drone,
  proximity mine: carry / max, `use` throw | stick | place | fly, fuse, radius, duration), `GADGET_IDS` (wheel order,
  clockwise from the top), `GadgetInventory` (counts, selected, cycle, take, add, restock), `wheelSlot`,
  `predictArc`, `DRONE` + `droneStep` (camera-relative flight, range from the launch point, altitude band, battery).
- `PlayerWeapons.gadgets` replaces the grenade count (`grenades` = frags; pouches show them); `useGadget()` plays
  the throw (released through `onThrow(id, from, vel)` at the clip's release) or places (`onPlace`); `throwStart`
  is the launch point / velocity the arc preview uses. `Grenades.throw(..., kind, color, fuse)`; non-frag kinds go
  off through `onDetonate`.
- `game/gadgetSystem.ts` (`GameState.gadgets`): runs first each fixed step with the real input and returns true while
  the wheel or a remote view has it (the rest of the step then gets `blankInp`); `look()` takes the frame's look
  (wheel cursor / remote view); `frameUpdate` after the player's camera (the remote view owns the camera: position,
  rotation, FOV; arc dots + landing ring; drone pose). Wheel: pad / keyboard hold `gadgetWheel` `WHEEL_HOLD`
  (stick or look picks, release selects), touch press toggles it and a slot tap selects (`hud.gadgets.onPick`);
  `loop.timeScale` `WHEEL_SLOW` unless co-op. Effects: gas clouds (`Enemy.gas` seconds -> `knockOut` at `GAS_KO`),
  flashbang (`Enemy.blind(s)`: brain off, hands-to-face emote, then `alert()`; facing it the full duration;
  `CinematicPost.whiteOut` for the operator facing it), EMP (`LightRegistry.disrupt` + `update` each step, `lightsOut`,
  dazes close guards, kills the operator's own drone), noisemaker (stick-on, `hear` pulses), sticky cam (stick-on,
  feed opens: lure ping (fire), gas once (Y), mark (RB / T), next (X), back (B / gadget)), drone (launch into the
  feed: fly where it looks, stun dart (fire, `knockOut`), shock burst (Y, non-lethal in `radius`, spends it), alerted
  guards in sight shoot it down, calm ones `notice`), mine (placed, arms after 1.5 s, an enemy within 1.6 m sets
  off a frag-strength blast). The feed look is `CinematicPost.setFeed`; `ui/hud/gadgetWheel.ts` (wheel + feed
  overlay text per input mode); touch: the action button is "Gas" / "Shock" in a feed, Mark is shown there too.

## Enemy archetypes (2.0 phase 6)
- `ai/archetypes.ts` (pure, `ARCHETYPE`): `heavyMult` (by `fromFront`), `shieldBlocks`, `grabRule` (heavy frontal =
  lethal only, enforcer frontal = none; `TakedownController` offers `lethalOnly`), `sniperRelocate`, `glint`,
  `smellRate`, `radioCheck`, `DIFFICULTY` tiers (`rookie | normal | realistic | perfectionist`: perception, damage,
  accuracy, hp, reaction, reward, `execute`, `sonar`; `parseDifficulty` reads easy / hard). `enemyDefs.ts` re-exports
  them; `ENEMY_KINDS` adds `sniper | enforcer | dog | droneOp | officer` (`emptyKinds()` for tallies; `quadruped`).
- `Enemy`: `perceptionMul` (tier x officer buff), dog smell (`smelled` keeps an alerted dog on the target),
  `applyDamage` plates / shield (`shieldBlocks`), sniper `shotsHere` / `relocations` (`relocating` picks a post
  5-22 m away), `glintFor(viewer)`, laser + glint meshes (`sniperFx`), enforcer push in `attack`, dog heel
  (`findLeader` in its squad), `DogModel` (`ai/dogModel.ts`) instead of the rig (rig root disabled; dead dogs kept
  in `EnemyManager.dogCorpses`), `bark(ev)` -> `ctx.onBark`, `squad`, `buff`.
- `EnemyManager`: `ReconDrone`s (`ai/reconDrone.ts`, Damageable + ANIMATED sphere, orbit, camera cone, `onDroneSpot`,
  `empAt`), officer buffs (2 Hz), alarm runner weighted to officers, `joinSquad` + `radioCheckNow` (period
  `ARCHETYPE.radio`, stealth only), radio delays x tier reaction x officer.
- Barks: `ai/barks.ts` (`BARKS`, `RADIO_BARKS`, `BarkVoice` cooldowns); `ui/hud/barks.ts` `BarkView` (pool, placed by
  `GameState.placeBark`); `bark` event -> `sfx.radio()` for radio lines.
- `GameState.difficultyDef`; Perfectionist turns off `ExecuteController` and `VisionState.sonarAllowed`.

## Modes 2.0: Hunter and Infiltration (phase 7)
- Hunter = `ClearMode` (`id 'clear'`, labelled Hunter; `?mode=hunter`); `GameMode.onAlarm(at)` (from
  `StealthSystems.onAlarm`) returns true when the mode brings its own reinforcements: Hunter adds `hostilesLeft`
  more pending slots (alerted, not holding) at the entry point (`alarmAdded`).
- Play styles: `game/playstyle.ts` `StyleTracker` (`GameState.style`; `GameState.detected` flips record
  `detected`); kills / knock-outs / takedowns / executes from `enemyMgr.onKilled` (`Enemy.ko`), alarms and hidden
  bodies from `StealthSystems`; `SessionStats.style / detections / knockouts`; results bars (`style-bars`).
- Infiltration: `game/missions.ts` (`MISSIONS` from `config/missions.json`, `validateMissions`, `ObjectiveChain`,
  `DOWNLOAD`, `evaluateRules`, `missionRating`), `game/modes/infiltrationMode.ts` (insertion teleport, room squads
  with a fill like Hunter, per-objective interactables with `onUse`: kinds `terminal`, `charge`, `vip`, `intel`,
  `extract`; download progress while within `DOWNLOAD.range`, `noticed()` -> `enemyMgr.hear`; `Vip`
  (`game/vip.ts`) follows by A*; rules fail at once; `finish` sets `stats.missionId / rating / bonuses`).
  `GameOptions.missionId / insertion`; `GameMode.onInteract`. Save v5 `missions` (`MissionRecord`, best run;
  `applySession`). Play screen: Infiltration shows the mission board. `window.__missions` for tests.
- Embassy (`world/maps/embassy.ts`): `slabWithHoles` (roof with vent holes, overhead), `roofDuct`; rooms with
  squads (sniper on the tower at 3.2 m). Gap lists for `wallX / wallZ` must be sorted (an unsorted list bridges a
  doorway).
- 2.1 maps (multi-storey; `maps/storey.ts`: `wallXAt / wallZAt` walls on any storey, `windowX / windowZ` vaultable
  windows, `glassX / glassZ` fixed panes where nothing stands outside): Mansion (night, urban; a two-storey house -
  grand staircase through a stairwell in the upper slab, balcony + ladder, flat roof with a duct into the vault
  office, rooms on both storeys via `minY / maxY`), Port (night, maritime; container stacks with ladders, a
  customs shed with a mezzanine office, a moored ship: gangway, deck, bridge + lookout, bosun's store, a pier hut),
  Refinery (dusk, desert; tank tops joined by catwalks, a pipe-rack walkway, a unit platform, a two-storey control
  building with an outside stair, shelters / huts). One Infiltration mission each (`mansion-vault`,
  `port-manifest`, `refinery-flare`). Landings must overlap a stair top (else the nav sees the ramp's end cap: a
  seam); squads on raised floors set `SquadSlot.y`.
- 2.3 detail pass: every map gained set dressing (mostly visual-only `box(..., false)` / overhead pieces; solid pieces
  only where they are meant as cover) and darker side lanes (`ambientZone`) with extra routes (ladders, breakable
  windows, doors). Dust Depot dressing uses its own random stream so the procedural layout per seed is unchanged.
  `e2e-anchors` tests ladders in creation order: a ladder-bottom test right after a 2.5-3 m ladder-top one can start
  in a landing roll, so new ladders go after the existing ones.

## Arsenal, suit, HQ, economy (2.0 phase 8)
- 16 weapons (`WEAPON_IDS`; the 1.x five keep ids). Optional `WeaponDef.noise` (x the stat), `nonLethal` (crossbow;
  `HitInfo.nonLethal` -> `Enemy.knockOut`). `withAttachments(def, ids)` (progression/attachments.ts, pure) returns
  the def with attachment parts and the moved muzzle; `LoadoutEntry.attachments`; `PlayerWeapons` builds from it
  (slots carry `nonLethal`, `pen` = `PENETRATION[class]`, `scoped`). `penetrate()` casts back from beyond the hit
  to find the exit face. Back carry: a centre gun stands off `CENTRE_CLEAR` minus its top-to-bore depth.
- `progression/suit.ts` (pure): `SUIT` tiers, `suitStats` (damage, noise, hands, sonar, gadgets), `suitLook`, `HQ`
  + `hqStats` (radar, sonarRange, extraMarks, restock, reviveSpeed), `canBuySuit / canBuyHq`, `CHALLENGES` +
  `challengeProgress`, `styleLines` (`STYLE_PAY`), presets. Profile ops `buySuit / wearSuit / buyHq / savePreset /
  applyPreset`; `applySession` pays challenges (`SessionStats.takedownsByKind / executes / gadgetKos / alarms`).
- `GameOptions.suit / hq / gadget` (single player from the save in `main.ts`; the look via `suitLook`); GameState
  applies `target.armorMul`, `weapons.handsMul`, `takedown.handsMul`, gadget counts, `marks.max`, footstep noise
  x `suit.noise`, `sonarMul`, radar blips, restock on respawn. `ui/screens/loadoutScreen.ts` (Gear / HQ tabs;
  root page presets); Play screen Loadout row. Save v6; v7 (2.3) issues the 9mm SD (`STARTER_UNLOCKS`) as the
  default primary with the 552 secondary (a loadout / preset still on 552 + P45 moves to it). `?loadout=a,b` for
  autostart (tests).

## Combat around cover
- Player hit volumes are split (`PlayerTarget`: legs, torso, head) and follow crouch and lean; head x1.3, legs
  x0.75. Enemies aim at the torso volume.
- `game/tactics.ts` (pure): `exposureFraction`/`exposurePoints` (GameState samples rays from up to 4 alerted
  threats at 4 Hz), `coverQuality` (badge "flanked" below 0.3), `flanks`, `segPointDist`, `Suppression`
  (near misses / impacts close to the head; holds then decays; spread, aim sway, flinch, vignette).
- Losing the cover being used (`reason === 'gone'`) stumbles the player. HUD `setTactical` shows stamina,
  exposure, noise and the suppression vignette.

## Debug overlay
- F3 / 3-finger tap. Buttons: Skeleton (bones, controller capsules, hit volumes and foot contacts as lines:
  green = planted, orange = swinging to its landing spot; things register in `ui/debugVolumes.ts`), Tune (sliders
  for `MOVEMENT`, `CAMERA`, `CARRY`) and slow motion (1x / 0.5x / 0.25x). Lines: display Hz + budget, pacing
  p50/p95/p99 + drops, CPU per frame, quality + resolution scale, player, carry, cover, combat, anim (layer
  weights, active clip timeline, `!limit` = joint-rate limiter hits). The bar graph is frame pacing against the
  budget line; `addTrace` graphs values per frame (weapon bob, speed, acceleration, camera angular velocity).

## Combat
- Weapon content is JSON (`config/weapons.json`), validated by `validateWeaponDefs`; maths in
  `weapons/weaponStats.ts` (pure). Add a weapon: JSON entry + id in `WEAPON_IDS`.
- `PlayerWeapons` (fixed step) owns fire/reload/swap/grenades; `Ballistics` owns rays and pooled swept
  projectiles; `Explosions` queues detonations (never recursive); `Vfx` pools every effect.
- Anything shootable implements `Damageable` and registers its bodies with `DamageRegistry`.
- HUD (`ui/hud/hud.ts`) only writes DOM when a value changes; minimap redraws at 20 Hz.

## AI and modes
- `buildNavGrid` (load time) -> `NavGrid` (pure). Enemies chase via the shared flow field, use A* only
  for cover moves, and are constrained to nav cells (no physics character controller per enemy).
- Multi-level (2.1): the grid is layered - up to 3 standing surfaces per column (`sampleLayers`: rays cast on from
  under each piece hit, a surface needs `HEADROOM` 1.7 m), cell = `layer * cols + column`; columns join by height
  (`stepTo`), never by layer number. Links (`navLinks`): ladders both ways (`kind 'ladder'`, route foot -> rungs ->
  top), ledge drops 1-2.2 m one way; A* / Dijkstra take them (`fillPredecessors` for the flow field), paths split
  at them (`Waypoint.link`), `flowNext` returns a link's start. Every query takes an optional height (`cellOf`,
  `heightAt`, `nearestWalkable` (soft: the storey nearest it), `lineClear(a, b, ya, yb)`, `findPath(.., fromY,
  toY)`, `flowField(goals, out, ys)`, `flowNext(.., y)`); NaN = the lowest surface. Enemies: `cellNear` keeps
  their storey, `goTo` defaults to their own height, `beginLink` / `runLink` (walk 1.5, climb 1.1 up / 1.4 down,
  drop 6 m/s; `climbing` -> `traverse 'climb'` pose; dogs wait at the foot), `linksTaken`. `SquadSlot.y` spawns on
  an upper storey.
- Enemy brains (`ai/enemy.ts`) think at ~4 Hz (LOS raycasts staggered) and act every fixed step. Tactics: walk
  when they can see the target, run only to contact/between covers; suppressive fire at the last known
  position, blind fire in some hide phases; cover choice weighted by `coverQuality`; `EnemyManager` assigns one
  flanker against a player holding cover (> 4 s) and allows one grenade in the air at a time (player camping
  the same cover > 6 s); `hear()` makes unalerted enemies investigate footsteps (`PlayerRef.cover/coverT/
  suppress` carry the player side).
- `EnemyManager` caps alive enemies (10) and ragdolls (`BUDGET.maxRagdolls`).
- Modes implement `GameMode` (`game/modes/`; `ModeId` also has `tdm | ffa`, run by the net host, not a mode); `GameState` owns world, player, combat, AI, pickups,
  interactables and calls mode hooks. `GameState.endSession` shows results; `GameState.rewardHook` lets
  progression add rewards.
- Clear mode (`game/modes/clearMode.ts`): each tagged room's squad spawns unalerted holding it (`Enemy.hold`: fights
  from inside, takes cover inside, never chases out, falls back to its post); squads beyond the alive cap spawn
  later, nearest rooms first, never within 7 m. The HUD shows only "Enemies left N" (`enemiesLeft` =
  `RoomClearTracker.hostilesLeft`: alive + still to spawn): no room tag (`hud.setRoom` is skipped in Clear; other
  modes keep it on tagged maps), room counts, lives, score, objective or enemy blips (`GameState.enemyBlips`), and
  nothing happens when a room empties (it silently becomes the respawn checkpoint). Going down shows "DOWN" (three
  tries, not shown). The last hostile down completes the operation: `operationComplete` event (audio stinger),
  OPERATION COMPLETE banner, slow beat, letterbox; results have no rooms row; `computeRewards` pays one
  "Operation complete" line instead of per-room rewards.
  Chasing enemies entering a new room unseen pause 0.7 s at the threshold (doorway check).
- `?autostart=<mapId>&mode=<sandbox|wave|mission|clear>` boots straight into a match (dev/tests).

## Coop (`src/net`)
- Entry: `main.ts` registers the Co-op menu entry and `?room=CODE` handling; both `import('./net/coopUi')`.
  `CoopApi` (startGame/goToMenu/profile) is how net talks back to the shell. Never import `src/net` statically.
- `Transport` (`transport.ts`): `send(msg, to?)`, `onMessage/onPeerJoin/onPeerLeave`. `trysteroTransport`
  (WebRTC, Nostr signalling, room `ss-<code>`) or `localTransport` (BroadcastChannel, `?net=local`, for tests).
- `protocol.ts`: every inbound message goes through `parseMessage` (shape, clamps, string sanitising, caps).
  Add a message: type in `Msg`, case in `parseMessage`, a test in `tests/net.test.ts`.
- `NetSession`: lobby state (each `PlayerInfo` carries name, tag, look and the validated weapon `loadout`), ready/start, routing. Clients accept authoritative messages (lobby/start/snap/
  ev/end) only from the host; the host accepts gameplay messages only from lobby members. No host migration.
- `GameOptions.net = { role, attach(g) }` -> `GameState.net: NetAttachment` (fixed/frame hooks, death,
  revive, pickups, blips, end). Client sessions set `GameState.puppet` (no AI/mode; health from snapshots;
  local `damageMul = 0`). Coop never pauses the sim (pause menu only takes input).
- `CoopHost`: remote players (`RemotePlayer` = Damageable + hitbox + PlayerRef), 15 Hz snapshots, event
  queue, enemy position history for lag compensation, shot/blast checks via pure `validate.ts`, per-player
  kill tallies sent in `end`. `CoopClient`: `EnemyPuppet`s + `RemoteAvatar`s interpolated with
  `SnapshotBuffer`/`ClockSync` (`interp.ts`), sends `pstate` at 20 Hz and hits as `shot`; rewards come from
  `clampEnd` + `coopSessionStats` of the host report.
- Modes (`NetMode`): co-op `wave | clear | infiltration | sandbox` (`COOP_MAX` 4), PvP `tdm | ffa` (`MAX_PLAYERS`
  8, `TEAM_MAX` 4 a side); `capacity(mode)` gates joins and `startMatch` (`overCapacity`). Lobby/start carry
  `mission` (Infiltration); `PlayerInfo.team` (balanced on join, `team` message / `requestTeam`).
- Co-op sync: snapshots carry enemy `al` (alert level, +4 seized), and when changed (or every 2 s) `items`
  (usable interactables: objectives, switches, alarms, doors, revive points; clients mirror them in their own
  `Interactables` and send `use`, the host checks reach) and `doors` (open indices; clients `Doors.setOpen`).
  Client takedowns: `GameState.takedownVictims` = puppets (`TakedownVictim`), `td start/done/abort` seizes the
  host enemy (denied -> `tdDenied`). The host hears clients (footsteps by `noiseRadius`, shots by `PF.firing`,
  `PF.quiet` = suppressed). Downed: `revive` interactables on bodies (`NetAttachment.onLocalDeath` /
  `onRespawn`); everyone down -> the mode.
- Co-op depth (2.1): bodies - the host lists lying bodies (`Body.enemyId`, not hidden / carried) in `snap.bodies`
  when it changes; clients keep those ragdolls (`keep`, `BODY.max`) and drop the ones it leaves out. Pings
  (action `ping`: D-pad left, Z, touch `ping` in co-op): `GameState.sendPing` (aim ray) -> `NetAttachment.ping` ->
  `ping` msg / event (host rate 0.8 s, near the sender), `GameState.addPing` + `ui/hud/pings.ts` (follows a pinged
  guard, edge arrows off screen). Gadgets: `GadgetSystem.onLocal` reports gas / flash / EMP / noise effects; the
  host relays them (`gadget` msg / event, 1 s rate, <= 40 m) and runs `remoteEffect` on its guards. Mark &
  Execute on clients: a client takedown earns `RemotePlayer.execCharges` (<= 3); shots with `ex` open a 5 s /
  5-shot window that kills outright. Dual takedowns: two players finishing within `DUAL_WINDOW` 1.5 s ->
  banner (relayed) + style.
- PvP fairness: `pvpLoadout` (base damage), no suit / HQ in `tdm | ffa`, `maxHitDamage(def, head, false)` on the host.
- PvP (`net/pvp.ts`, pure: `PvpScore`, `pickSpawn`, `balanceTeam`, `pvpInfo`): `GameState.pvp` (no AI / mode;
  pickups only); the host owns the score (`frag` events, `score` + `tl` in snapshots), respawns (`PVP.respawn`,
  protection), the end (`winner` in `end`). Damage rules: `PlayerTarget.friendly` / `RemotePlayer.friendly`
  from `PvpScore.hostile`; host shots hit opponents through `Hitboxes` on their avatars; client shots hit
  `PvpTarget`s (hit volumes on opponent avatars) and are sent with the player id, rewound on the host
  (`RemotePlayer.history`, host `selfHist`). Results: eliminations / deaths (`SessionStats.deaths`).

## Progression and saves
- Pure maths in `progression/` (levels, rewards, upgrades, attachments, unlocks, profile ops). UI calls
  `app.save.update(d => op(d, ...))`; `SaveManager` sanitises, debounces and persists to IndexedDB.
- Save schema: `save/schema.ts` (`SAVE_VERSION`). Changing the shape = bump the version, add a
  migration in `save/migrations.ts` (input is the previous version's raw object), extend `sanitizeSave`,
  and add a test in `tests/save.test.ts` with a literal old save.
- Export format: `{ magic: 'shoulder-strike-save', version, exportedAt, data }`; import also accepts bare
  saves of any known version.
- New unlockables: add to `UNLOCKS` (or `registerUnlocks` from another module) with an id prefix
  (`weapon:`, `att:`, `camo:`, `part:`, `pattern:`, `emote:`, `tag:`, `color:`).

## Cosmetics
- `cosmetics/catalog.ts` is the single list of avatar options, camos, emotes, titles, emblems; it registers
  unlock items at import (imported first in `main.ts`, before `autoGrant`).
- Patterns: `PatternPlugin` (StandardMaterial plugin) reads per-instance `pattern` (id, scale) and
  `color2`; ids in `cosmetics/patterns.ts`, GLSL there too. `PartLibrary.instance(..., pattern)` sets them.
- `avatarFactory` puts the look's pattern on torso/legs slots; `WeaponModel` puts the camo pattern on
  `body` parts. Emotes are pose overrides (`cosmetics/emotes.ts`) run via `CharacterRig.emote`.

## Audio and quality
- `app.audio` (AudioEngine), `app.sfx` (Sfx voices), `app.music`. Every voice must early-out when the
  context is missing/suspended (before the first gesture). Game wiring lives in `audio/gameAudio.ts`.
- `app.quality` (QualityManager) applies `QUALITY_LEVELS` (potato .. ultra; "Ultra 120" = DPR cap 3) to engine
  scaling and to the current state if it implements `applyQuality(level, userShadows)` (GameState does). Every
  frame (`GameLoop.onFrameEnd`: rAF interval + CPU work) feeds `RefreshDetector` (display Hz; Safari may cap rAF
  at 60), `FrameStats` (p50/p95/p99, drops vs the 1000/Hz budget; debug overlay pacing lines + graph) and, while
  simulating in auto, the `AdaptiveController` (thresholds relative to the budget, headroom judged on CPU work
  since vsync hides it; Ultra only on >= 100 Hz) plus `ResolutionScaler` (GPU-bound frames step the render
  scale 0.6-1.0 with dwell times and cooldowns).
- Hot paths must not allocate (no closures, iterators or temporary vectors in AI/nav/anim loops; `for` with an
  index over arrays; typed-array heaps). Use `hyp2`/`hyp3` (`core/mathx.ts`), never `Math.hypot` (V8 allocates
  its arguments).

## Performance budget (iPhone 17 Pro Max class, 120 Hz)
- 8.33 ms per frame, worst case <= 6.5 ms work; CPU <= 3.5 ms, GPU <= 4 ms. `perf.mjs --budget` checks the CPU
  side: p95 CPU per 120 Hz frame <= 3.5 ms (measured ~1.7 ms on Warehouse with 10 enemies), animation <= 0.04 ms
  per character (~0.037 when last calibrated; the SwiftShader VM drifts, so compare against the previous
  build side by side before blaming a change), draw calls <= 80 (~17-30), allocations <= 96 KB per frame (~75: V8 boxing doubles at
  call boundaries and Havok embind marshalling; no retained objects). GPU time and thermals need a device:
  debug overlay pacing graph + `soak.mjs` / the 10-minute soak in TESTING.md.
- Static level geometry uses thin instances, `freezeWorldMatrix()`, frozen materials.
- Dynamic physics bodies capped (see `physics/budget`). Projectiles/effects pooled, never allocated per shot.
- Render scale: DPR capped per level (1 .. 3), dynamic resolution within it.

## Robustness rules
- `App` isolates state updates: an exception in `fixedUpdate`/`frameUpdate` is logged (rate-limited) and toasted
  once; input polling and menus keep running. `GameState` ignores updates after `exit()` (quit can happen mid-tick).
- Backgrounding (`visibilitychange`/`pagehide`): flush the save, suspend audio, pause single player (co-op opens
  the menu without pausing).
- `SaveManager.readOnly`: if the stored profile cannot be read (newer version, corrupt), play continues on an
  in-memory profile and nothing is written; an explicit import/reset backs the unreadable data up first.
- Release checklist (offline, migration, controller) is the Phase 10 section of TESTING.md; README has deploy steps.

## Conventions
- Files: camelCase `.ts`; one main class per file. Tests in `tests/*.test.ts`.
- Pure logic (maths, validation, migrations) stays free of Babylon/DOM so it is unit-testable in node.
- Every phase updates `CHANGELOG.md`, `TESTING.md`, and this file.
