# Silent But Deadly - architecture and conventions

Silent But Deadly (renamed from Shoulder Strike in 2.2.0; internal ids keep the old name for compatibility:
IndexedDB `shoulder-strike`, export magic `shoulder-strike-save`, co-op app id). Third-person over-the-shoulder shooter
for PC and phones. Static web app (Vite + TypeScript + Babylon.js 9 + Havok), installable PWA, fully playable offline.
Hosted on GitHub Pages. Target (3.0): a gaming laptop (i9 HX, RTX 4090 Laptop 16 GB, 32 GB; built-in 2560 x 1600
240 Hz, external monitors up to 7680 x 2160 32:9 at 120 Hz); every device runs the same renderer (phones
with the 3.1 preset ladder; the iPhone 17 Pro Max targets 120 fps at Ultra). 3.0 scope: the Warehouse is the one playable map (every mode), Proving Grounds a plain
test range; the other maps are parked (`world/maps/parked.ts`, not imported, kept as in 2.3.0, no work on them). The platform (`core/platform.ts`) only changes the UI and
input. 3.1: one preset ladder for every device (Low .. Ultra, Epic PC only), Auto graphics per device, a frame governor
in matches, and crossplay fairness: graphics never change gameplay or how visible anyone is. A stealth operative that moves fluidly and responsively (still weighted) and fights from cover, Splinter Cell:
Blacklist style.

## Commands
- `npm run dev` - dev server (LAN-exposed for phone testing)
- `npm run build` - typecheck + production build into `dist/`
- `npm test` - Vitest unit tests (node env, `fake-indexeddb` for save tests)
- `npm run lint` - ESLint (typescript-eslint)
- `npm run icons` - regenerate procedural PWA icons into `public/icons/`
- `npm run e2e` - serves `dist/` and runs the headless e2e suites (needs a prior `npm run build`):
  - `scripts/smoke.mjs` boot + console-error check (`--shot=out.png` for a screenshot)
  - `scripts/e2e-pad.mjs` controller-only navigation through every menu using a fake Gamepad API pad; 3.2.0 in a match:
    D-pad up / down gears, D-pad left tap vs hold (wheel), View tap goggles / hold emote
  - `scripts/e2e-touch.mjs` touch-only: taps menus, floating move stick, rate-based camera stick, drag-look,
    fire button never moves the camera, control sizes, action button only for "use", take-cover prompt tap, no cover badge in cover, a push away leaves;
    3.2.0 speed rocker (up / down halves, pips, HUD pips fade), a forward roll by touch, the jump button, the action
    button dimmed when idle / taking cover at the prompt, prompts are indicators only
  - `scripts/e2e-mouse.mjs` PC mouse capture: click captures (never fires), look, fire, wheel = speed gear (3.2.0),
    X swaps, = / -, Esc pauses, Resume re-captures
  - `scripts/e2e-move.mjs` (3.2.0, `gear=none`: spawn gear 3) every gear's speed both stances, stick scaling, gear kept
    through stances, zero velocity on the release step, planted feet < 2 cm on a stop, the stop holds its stride
    (1.2 s, aiming lets go; crouched: no kneel; a creep and a sprint; a pad stick springing back), forward roll (0.7 s, ~3 m,
    crouched, 2 m noise) and none at gear 3, aim strafe/backstep, sprint toggle, aim ends a sprint, no free jump,
    kneel, contextual vault/climb/step/drop/hop, steps/slopes/stairs/tunnel/props on Proving Grounds
  - `scripts/e2e-traverse.mjs` Proving Grounds course (north east): ladder bottom / top entry, climb rate, slide, step
    off; drainpipe to a lip, climb up; ledge grab, shimmy rate, jump across, outside corner, climb up, hold-B lower
    in, drop; horizontal pipe; landing bands (soft / roll / heavy + noise + recovery); grab while falling; zipline;
    open / glazed windows; duct unscrew, crawl, vent drop + roll, kick (fresh page); keyboard E; touch: the action
    button at the prompts (grab, held at a vent: unscrew), crouch lets go;
    planted hands / feet locked (< 1 cm), arms reach grips
  - `scripts/e2e-anchors.mjs` every placed anchor on every listed map (Proving, Warehouse) (ladders bottom / top, drainpipes, pipes, ziplines,
    ducts, windows both sides) is offered from its approach and engages; hangable lips per map
  - `scripts/e2e-stealth.mjs` real-time camera repro (free orbit: 360 deg looks standing, crouched, moving,
    aiming, after a sprint / cover / lean, no residual offsets, level horizon after a shake) + headless cover bars: 3 m snap glide, hand
    contact, sticky exit, sprint slide, edge peeks, peek in/out timing, left-edge hand switch, corner offered and swung on the button (never automatic), no spin from quick aim /
    direction changes, tuck,
    auto shoulder, routed cover-to-cover, push-back cancel
  - `scripts/e2e-weapons-carry.mjs` Free Roam loadout: five slots, back guns within 10 deg of the spine in six
    gaits, no clipping (both avatar styles, with a backpack), hands within 2 cm of the grips, swap reach + timing
  - `scripts/e2e-anim.mjs` quality bars in the running game: first-frame response, 3.2.0 Chaos Theory: 95% speed
    within 0.08 s, a stop on the release step, the stride held (no settling step), no planted pivot, 720 deg/s turns, turn rates, lean into turns, stance and aim raise/lower times, weapon clip
    timings, foot locking (< 1 cm) in seven gaits, pose continuity, flinch, camera lag/blends/bob/drift/sprint
    FOV/stick-look bounds, 60 / 120 / 144 / 165 / 240 Hz parity (each run from gait phase 0)
  - `scripts/e2e-combat.mjs` weapons, hits, headshots, reload, swap, grenades, barrels, death/respawn
  - `scripts/e2e-modes.mjs` wave progression, mission flow, enemy types, ragdolls
  - `scripts/e2e-progression.mjs` Loadout by controller (live weapon preview, lock line, upgrade, buy in place), suit / HQ by touch, rewards, IndexedDB persistence, export/import
  - `scripts/e2e-cover.mjs` (A cover, B crouch, Y traverse) snap side-on, turn-and-swap, kneel, peek/blind
    fire/vault, B keeps cover, stand/crouch at high cover + crouched edge peek, lean in place, outside corners (corner prompt + A, never automatic) /
    inside corners, edge stop a step back, no cover badge, SWAT turn, cover-to-cover only when looking at it with the stick held towards it + slide + marker,
    world prompts (low on the surface; 3.2.0: the touch action button does what they show), manual cover only (walking / sprinting into a wall never
    snaps), crouched aim over low cover, keyboard Space; 3.2.0 cover strafe pace by gear
  - `scripts/e2e-clip.mjs` traversal: no body point (trunk, head, thighs, calves, upper arms; raycast from the hips)
    > 3 cm into the world while climbing, hanging, shimmying, climbing up, crawling, dropping through a vent,
    vaulting a window, on a zipline or rolling; plus the weapon clipping sweep: every frame of wall-side movement, high / low cover (idle,
    moving, turn-and-swap, reload, swap), edge-peek aim sweeps both edges standing / crouched (with step-out),
    aim over, vault, aim every weapon, aim walking / crouched: no gun point inside the world (> 2 cm), legs grazed
    <= 2.5 cm, gun clear of the head (> -1 cm) and trunk (> -2 cm), elbows (> -3 cm), knees above the floor and
    > 9 cm apart, feet > 6 cm apart (`--only=name --log`)
  - `scripts/e2e-tactics.mjs` doorway check, contextual lean, slicing the pie, split hit volumes, suppression,
    exposure HUD, enemy grenades/flanker, footstep noise investigation, a wall muffles a noise
  - `scripts/e2e-takedown.mjs` takedown kinds (ground rules, over low cover, above, below, window; 3.2.0: the grab -
    walk, sidearm, human shield, knock out / kill / shove - and drop attacks from a pipe / split, the inverted choke), tap / hold,
    5 cm alignment, damage interrupt, Execute charge, marks through cover, no execute out of sight, execute; no takedown
    on a guard in combat who saw you, one alerted without seeing you still can be
  - `scripts/e2e-enemies.mjs` heavy (plates / back / face plate, lethal-only frontal takedown), enforcer (shield,
    no frontal grab, pushes), sniper (laser, glint refuses a mark, relocates), dog (smell in the dark, takedown),
    drone operator (spots, shot down, EMP), officer (buff, alarm first), radio check, callouts, Perfectionist
  - `scripts/e2e-levels.mjs` multi-level AI: three storeys per column, Warehouse ladder links both ways, a runner
    chasing the player up a rack ladder and back down
  - `scripts/e2e-missions.mjs` Hunter alarm doubles the hostiles; Infiltration objective types to success (download
    pauses away + noticed pulses, intel any order, plant, rescue + escort, sabotage, extraction, results rating and
    style bars) and failure (Ghost contract detection, three downs) on the Warehouse missions (Ledger, Courier,
    Blackout, Cold Storage); routes per objective + 25 anchors
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
    a validated elimination, respawn, results; 3.1: FOV capped at 90 and 16:9-equivalent, no Panini) and
    Free-for-all; host leaving, offline
  - `scripts/e2e-cosmetics.mjs` Loadout appearance by controller, live / locked previews on the operator, revert on exit, emotes, camo, in-game look
  - `scripts/e2e-clear.mjs` Warehouse + Clear mode: only "Enemies left N" (alive + pending), no room tags /
    counts / lives / score / blips, no per-room feedback, "DOWN", OPERATION COMPLETE stinger, results without a
    rooms row; Wave keeps room tags; doorway checks; mini room set; the Play screen: Warehouse default for every mode
    but Training, Infiltration lists the Warehouse missions only
  - `scripts/e2e-training.mjs` the training course by touch: hints per device, each step advancing, the
    Takedown / Mark / Execute buttons, HUD defaults (no health bar, ammo fades), the results
  - `scripts/e2e-netmove.mjs` (3.2.0) two pages `?net=local`, Free Roam on Proving: the client in low cover (+ over
    peek), high cover (+ edge peek), ladder (+ after a climb), drainpipe, pipe, ledge, duct (hands / feet / head within
    10 cm on the host), zipline and a roll mirrored; CT moves (split, wall jump, pipe legs up / inverted, rappel +
    rope, fence); team moves (phase 5: the client braces and boosts the host onto the 4.2 m lip, the host braces and
    the client climbs the human ladder and grabs the lip, a request without a braced partner is denied); TDM: a host
    shot at a client hanging off a lip hits the head
  - `scripts/e2e-ct-warehouse.mjs` (3.2.0) the Warehouse CT routes (Hunter, guards frozen; one brought in for
    the drop checks): drainpipe -> roof, rappel -> kick through the dispatch window, skylight drop, the pump house
    boost target (out of reach alone) and the climb to the roof, press wall jump, corridor split + drop, deck pipe +
    drop, yard fence + the nav path round it
  - `scripts/e2e-ct.mjs` (3.2.0) the Proving CT course (north): the manual jump (up and down, grabs a pipe / lip /
    drainpipe), split jump (shown only facing along; one Y jumps, a second in the air braces facing the way it
    jumped, feet 2.5 m up on both walls, legs within 15 deg of level, no travel, sidearm aim band + fire, B drop, no jump
    out), wall jump (straight, too far, inside
    corner), pipe facing along it + turning round, legs up (0.5 m/s, feet up), inverted (camera upright, sidearm + spread x1.3), curl up, hands, damage
    mid-change, the flip drop; rappel (hook on, rope speeds, kick out + sideways, sidearm, kick through a window,
    unhook height), fence (bullets / sight pass, blocks the body, climb / shimmy speeds, rattle by gear, flip over)
  - `scripts/e2e-feedback.mjs` playtest notes: pause > Report feedback with the context, photo mode (frozen game,
    no HUD, free camera, take / retake / keep / cancel, two photos), IndexedDB after a reload, Settings > Feedback
    list, the HTML report download, photo mode on the menu stage
  - `scripts/e2e-desktop.mjs` desktop detection, menu scale, Mouse & Keyboard rebinding, the Graphics menu (presets,
    Custom, frame cap), the Interface switch, the benchmark (a short flight, saved as feedback; every preset in
    turn; 3.1: Low .. Epic), Auto graphics (GPU name, `?detect=1&renderer=Apple%20GPU` calibration, no re-measure),
    the frame governor stepping down (TAAU input), 16:10 / 21:9 / 32:9 windows (centred 16:9 menus, the HUD inset on 32:9, Hor+ up to the FOV cap), the Epic
    renderer booting in a match (`SHOTS=dir` saves the aspect screenshots)
  - `scripts/e2e-offline.mjs` service worker precache (every manifest entry), offline boot + match, backgrounding
    pauses, co-op offline state, v1 save in IndexedDB migrated on boot with a backup
  Long simulations use `window.__app.loop.stepHeadless(seconds)` (no rendering) to stay fast. `e2e-lib` adds
  `?gfx=min` (every graphics feature off, DPR 1; not saved) unless the params name a `gfx=` (a preset, or `user`
  for the saved settings): the PC renderer at Epic on software GL takes seconds per frame.
  - `node scripts/shot.mjs out.png "autostart=proving" 60 "<js>"` screenshot helper (`?autostart=<mapId>`)
  - `node scripts/rig-shot.mjs out.png [yaw]` close-up of the Loadout operator (proportion/silhouette checks)
  - `node scripts/anim-sheet.mjs out.png <walk|jog|sneak|crouchrun|sprint|start|stop|strafe|back|turn|crouch|dash|
    reload|swap|grenade|cover|highcover|peek|vault> [frames] [interval] [side|front|back|ots]` contact sheet
  - `node scripts/perf.mjs [--desktop] [--preset=<p> [--mobile]] [--budget]` (`--preset`: 3.1 phone budgets per preset; `--desktop`: the PC path at `?gfx=epic`; else the `?gfx=min` test
    path; `STEALTH=1`: ten unaware enemies perceiving) Warehouse, 10 enemies: main thread p95 (sim per 120 Hz frame +
    the render's JS), animation ms per character, allocations per second (top allocators), draw calls and triangles
    over every pass (`PROFILE=1` CPU profile)
  - `node scripts/soak.mjs [minutes=10] [url]` (`MAP=`, `MODE=`) real-time soak: pacing, CPU, adaptive quality, heap growth (leak check)
  Uses the preinstalled Chromium (Pixel 7 landscape emulation, SwiftShader GL - FPS there is not representative).

## Branches and deploy
- Work goes to `dev`; the default branch (`master`) is the live game. Pages hosts both: live at `/<repo>/`, the
  `dev` build at `/<repo>/preview/` (`VITE_PREVIEW=1`: `__PREVIEW__`, version label "PREVIEW", its own IndexedDB
  `shoulder-strike-preview`, the live worker's `navigateFallbackDenylist` skips `/preview/`). `preview.yml` checks
  `dev` pushes; `deploy.yml` (default branch, also on `workflow_run` of that check) builds both and deploys. Release
  = merge `dev` into `master`.
- 3.2.0: a second preview slot, `ct-movement` at `/<repo>/ct/` (`VITE_PREVIEW_ID=ct`: `__PREVIEW_ID__`, label
  "PREVIEW CT", IndexedDB `shoulder-strike-ct`; the live worker's denylist skips `/ct/` too). `preview.yml` also
  checks `ct-movement` pushes; `deploy.yml` builds it when the branch exists.

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
  R3 shoulder, RB/LB weapons (RB `mark` while aiming), 3.2.0: D-pad up / down `speedUp` / `speedDown`, right
  `grenade` (the gadget: hold aims the arc, release throws), left held `gadgetWheel` (`WHEEL_HOLD`, `input/inputState.ts`)
  / tapped `ping` (co-op), View tapped `vision` (goggles) / held (`SWAP_HOLD`) `quick2` (emote 1) - tap / hold by
  `TapHold` (`gamepadMapping.ts`, pure) in `GamepadSource`, as X's reload / swap;
  Y also takedown / execute (contextual); in menus Y = `uiAlt` (`Screen.onAlt`, Loadout: customise). Keyboard (3.0:
  rebindable, `input/keyBindings.ts` pure: `BINDS` defaults, two inputs per action incl. Mouse 3/4/5, `assignBind`
  moves a key off its old action, `settings.keys`; `KeyboardMouseSource` rebuilds its map when the keys change,
  `captureNext` for the rebinding UI; fixed: Esc / Enter / Backspace / arrows, Q / E menu tabs, 1-8 gadgets, LMB fire,
  RMB aim, wheel speed gear (3.2.0)): Space cover, C / Ctrl crouch, Shift sprint, = / - speed gear, E traverse / interact / takedown, F use, R
  reload, Q / X weapons, N goggles, T mark, Y execute, G gadget, Tab wheel (hold), J / K / L emotes, Z ping, V
  shoulder, P pause; mouse look (raw input via `unadjustedMovement` where supported, `mouse.adsMultiplier`).
  In-game key prompts read `ui/prompts.ts` `keyLabels` (set from the bindings). Gamepad look: 30 ms smoothing (acceleration inside the
  smoothing, so releasing never steps the rate).
- Touch (`input/touchControls.ts`): pointer handlers only record state; `update(dt)` (per frame, from
  `InputManager.poll`) turns it into input. Floating move stick on the left half (flick-to-sprint optional, off by
  default); crouch toggle, sprint toggle; camera-only right stick (rate based: dead zone, response curve, 50 ms smoothing, acceleration when
  held at the rim; never fires); optional drag-look in the empty upper right; separate fire button (84 px; optional
  left fire; optional fire drag-look); ADS; goggles (`vision`); jump (3.2.0, `leap`); a contextual action button (`setAction(TouchAction)` from `GameState`:
  use an interactable, else - 3.2.0 - whatever the world prompts show (`ui/hud/worldPrompts.ts`: cover, vault / climb /
  grab / drop, cover-to-cover, corner), dimmed when idle; acts on release). The prompts are indicators only. Secondary buttons >= 56 px. Layout: `settings.touch.layout` (`TOUCH_CONTROL_IDS`, per-control `x, y,
  scale, alpha?`), presets `LAYOUT_PRESETS` (default / claw / lefty), `TOUCH_LAYOUT_VERSION` 3 (v1 layouts keep
  customised placements, the old fire stick and untouched controls take the new defaults; v2 -> v3 keeps every
  stored placement and adds the `takedown` button, shown only while a takedown is on offer, action `interact`; v3 -> v4
  (3.2.0) keeps every stored placement and adds the `speed` rocker: a tall pill (`controlBox`, `controlHtml`), the
  half pressed taps `speedUp` / `speedDown`, six pips from `TouchControls.setGear`). Layout editor: presets,
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
- Platform (3.0, `core/platform.ts` pure: `detectPlatform` from touch points / fine pointer / viewport / user agent,
  `video.platform` Auto / Desktop / Mobile, `?platform=`; `App.applyPlatform` sets `body.platform-desktop|mobile`,
  `can-touch` and `--ui-scale`): desktop lays the menus out for 1280 x 720 and scales `.screens` (transform) and the
  HUD panels (zoom) to the window (`uiScale`); hides the Touch settings tab (unless `touch`), the rotate overlay and
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
  (GameState: map, mode, position, facing, enemies) + version, platform, graphics, frame times. Photo mode
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

## World and player
- Maps (`world/maps/*.ts`) are `MapDef`s: a `build(builder, seed)` that places modular pieces through
  `LevelBuilder` and returns a `MapLayout` (spawns, props, objectives, pickups, optional `rooms`). Register in
  `world/maps/index.ts` (`MAPS`: Warehouse, Proving Grounds; `listed.ts` `LISTED_MAP_IDS` is the pure list that
  content filters on: `MISSIONS` = `ALL_MISSIONS` on listed maps); the first map listing a mode is its default
  (Warehouse for every mode but Training; a mode change on the Play screen starts on its default map). Free Roam
  (`sandbox`) places the training dummies only on Proving Grounds. `LevelBuilder.wallX/wallZ` build walls with door gaps.
- Warehouse (`world/maps/warehouse.ts`): truck yard, loading dock, dispatch, workshop, a 2.2 m service corridor,
  racking aisles, factory floor, a mezzanine deck (stairs) and two offices; roofed (visual only: roof and lights
  do not collide, so the nav sampler sees the floor) with skylight strips. Nine tagged rooms with squads (3.2.0: the
  corridor has a patrol). 3.2.0 Chaos Theory routes: the south roof strip (x -22..21, top 6.275) is a solid walkway
  (`overhead`, metal surface) reached by a drainpipe (west yard) or from the 4.2 m pump house (east lot; co-op boost /
  human ladder), a rappel point over the dispatch window, the corridor's walls at 4 m over x 6.5..11.5 (a 1.86 m split gap), a deck
  pipe from the mezzanine (x 17, 4.4 m) over the floor patrol, the press at 3.3 m (wall jump), a yard fence (x 14.5)
  closing the dark lane off from the east lot (`scripts/e2e-ct-warehouse.mjs`). Proving
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
- Chaos Theory movement (3.2.0, in progress): spec `docs/ct-movement.md`, status `docs/ct-movement-progress.md`.
- 3.2.0 phase 0 (player free movement only; cover, traversal and enemies keep the rest of this section):
  speed gears (`player/speedGears.ts` pure, `GEARS` in `config/movement.ts`): 6 gears, spawn / respawn gear 3
  (`GameState` resets it when the player comes back alive; `?gear=N` for tests, `e2e-lib` adds `gear=4` = the 2.x jog
  unless a suite names a gear), kept through stance changes; `PlayerController.gears`, `speedUp` / `speedDown`
  (pad D-pad up / down, wheel + `=` / `-`, touch rocker). Target = gear cap (crouched 0.5 / 0.9 / 1.3 / 1.8 / 2.3 /
  2.8, standing 0.8 / 1.3 / 2.0 / 2.8 / 3.8 / 5.0) x `stickCurve` (dead zone 0.05, linear); `targetSpeed(.., gear)`
  replaces the stick bands for the player; aiming capped at 1.4 / 1.0; the sprint is gear 6 standing.
  `NOISE_QUIET` (crouched <= 1.9, standing <= 1.45 m/s silent: crouched gears 1-4, standing 1-2). Chaos Theory feel
  (`MotionInput.ct`, set by `PlayerController` when no override drives the step; `CT` table + `CT_RANGES` in the
  Tune panel): stick released = zero velocity on that step (the controller's `maxAcceleration` is 600 then so Havok
  follows in one step), gait clock frozen, `RigPose.quickStop` = `CT.stopBlend` 0.12 s (`FootPlanner.setDown`: a foot
  in the air sets straight down where it is within it, planted feet locked). Stop hold (approved spec change):
  `PlayerController.stopHold` / `holdSpeed` from any stop (> 0.02 m/s) until the next input (a stick that moves the
  operator again, aim, stance change, an override, leaving the ground; teleport clears it; no kneel while held);
  `StickRelease` (`speedGears.ts`, pure; `CT.releaseRate` / `releaseFrom` / `releaseWindow`) keeps a springing-back
  stick's deflection so the stop is from the full pace. Cover strafe = `coverPace(gear, crouched)` (`GEARS.coverMax`
  2.8 / 1.8; `CoverController`) -> `RigPose.holdSpeed`: the graph keeps
  the locomotion pose at the frozen gait clock for that pace (`locoSpeed`; released, it blends out over `quickStop`),
  the planner `hold` takes no settling / idle steps (`anim-sheet` `crouchstop` / `walkstop`); starts
  reach 95% within `CT.startTime` 0.08 s (`ctTau` = startTime / 4), direction / gear changes re-target at once, no
  pivots, travel turns at `CT.turnRate` 720 deg/s (sprint roll lean held to 0.05 rad so the bank stays <= 8 deg).
  Forward roll: crouch tapped standing at gear >= 5 (or sprinting) while moving >= 1.5 m/s
  (`TraversalController.canForwardRoll`, the `drop` alias of the press) = `startRoll(true)`: `kind 'roll'`, `ROLL`
  clip, `CT.rollTime` 0.7 s, `CT.rollLength` 3 m (shortened by a wall), comes up crouched (`setCrouchToggle`) at the
  gear's crouched pace; `forwardRolls` -> `GameState` noise `CT.rollNoise` 2 m. HUD: `Hud.setGear` (SPD pips in the
  tactical strip, `GEARS.pipsShow` 1.5 s after a change); touch rocker `speed` (`TOUCH_LAYOUT_VERSION` 4).
- 3.2.0 phase 1 networked movement: `player/moveState.ts` (pure; in `player/` because single player builds it and
  must never import `src/net`): `MoveState {m (MOVE_MODES index on the wire, later phases append), a anchor, s, sub
  (u16: `COVER_SUB` incl. `leftHand` / `ATTACH_SUB` phase + face + exit pose), ph, tid, g gear, r raise, ay aim
  twist, rd ready, cover: cu curl / lf lift / fp feet (body frame, still), attached: gp planted grips (still), c
  MoveCommit}`, `sanitizeMoveState`, `packMoveState`, `poseFromMoveState` (pose families for player and remotes),
  `moveChanged` (send at once). `game/localMoveState.ts` builds it from `GameState`. `player/attachGrips.ts`
  `AttachGrips` (hand / foot `GripStepper`s and rig targets; `AttachController.grips` and `RemoteAvatar` share it;
  `settleTo` onto the owner's planted grips) and `player/traversePath.ts` `traversePath` (committed move paths; the
  remote replays a `MoveCommit`). `PlayerState.mv` (`wirePlayerState`), `PF.driven`; `RemoteAvatar` poses from it
  (`rig.curlHold` / `liftHold` / `footPins` -> `FootPlanner` pins); `validate.ts` `moveSpeedCap` (gear pace x
  `MOVE_TOLERANCE` 1.15) / `attachedClamp` (`ATTACH_SLACK` 0.5) in `RemotePlayer.accept`; `RemotePlayer.followPose`
  and `Hitboxes.sync(feet, head, hips)` lay the capsules along hips -> head; host `Hist` keeps the posed head / hips
  and the mode, `judge` uses them.
- 3.2.0 phase 2: `player/splitJump.ts` (pure): `findSplitGaps(coverSegments)` (high faces, normals opposed, 1.2-1.95 m,
  both >= 2.6 m, same floor, overlap >= 0.8 m; `LevelBuilder.build` adds them last as `SplitAnchor`s, kind `split`,
  `anchors.splits`), `splitReach` (between the walls facing within 40 deg of the axis), `wallJumpReach` (lip 2.7-3.8 m,
  facing its wall within 1 m, or an inside corner: side-on within 1.4 m), `PipeHang` (hands -> legsUp -> inverted,
  `PIPE` times / speeds / aim band), `SPLIT`, `WALL_JUMP`. `ATTACH.split` (axis `none`, sidearm), `attachPose(.., pipe)`
  (`PIPE_HIPS`, `PIPE_TUMBLE`, `TUMBLE_PIVOT` / `TUMBLE_REST`: the rig tumbles about its body pivot, below the hips),
  `AttachEntry 'wall'`. `AttachController`: `splitProbe` / `wallJumpProbe` after the regular anchors, the wall kick
  path (`kickPt`), `pipe` (Y up / B down, `flipDrop`), `onHit` (GameState's damage hook), `sidearmAim`, camera presets
  `split` / `pipeLegs` / `inverted`. `AttachGrips`: split plants / braces, `setPipe` + blended pipe targets, `aimFree`.
  Sidearm attached: `Player.attachAim` (aim band clamp, ads allowed; inverted: mirrored spine aim + `RigPose.aimWorldYaw`
  / `aimWorldPitch` so the gun aims in world space), `PlayerWeapons.setAttachedStow(stowed, draw)` (`sidearmIndex`: the
  first pistol), `attachSpread`. `RigPose.tumble` (`PlayerPose.tumble`) -> graph; the rig skips the upright-only
  pelvis drop / knee floor when turned over. Clips `SPLIT_BRACE`, `WALL_KICK`, `PIPE_LEGS_UP`, `PIPE_INVERTED`
  (TraverseKind `split`, `wallKick`, `pipeLegs`, `pipeInv`). MoveState modes `split`, `wallJump`; pipe sub-state in
  `ATTACH_SUB` bits 6-9 (`ph` = the change's progress), exit pose `flip`.
- 3.2.0 phase 3: anchors `RappelPoint {top, nx, nz, length}` (`LevelBuilder.rappel`) and `Fence {a, b, height, t, n}`
  (`LevelBuilder.fence`: visual posts / rail, a see-through chain-link `DynamicTexture` panel, its own static body in
  `G.FENCE` - the player collides, bullets / sight / level probes do not; `navBuild` blocks it; never a level piece:
  no cover, ledges or voxels). `ATTACH.rappel` (vertical; `s` = rope out) and `ATTACH.fence` (along; the climb height
  is the controller's second axis `AttachController.u`, also the rope's sideways offset). `RAPPEL` / `FENCE` tables in
  `config/movement.ts`. `AttachController.rappelStep` (speeds, `swingT` kick out + `latFrom/latTo`, `ropeWindow` ->
  `onKickThrough` -> `TraversalController` window vault, unhook, top / bottom) and `fenceStep` (climb, shimmy,
  `fenceMoving` -> GameState rattle noise above `FENCE.quietGear`, flip over exit); `attachPose(.., u)`. Ropes:
  `world/ropes.ts` `Ropes` (thin-instanced, `World.ropes`; GameState `drawRope`, `RemoteAvatar` per remote). Clip
  `RAPPEL_HANG` (TraverseKind `rappel`). MoveState modes `rappel`, `fence`, field `u`, exit pose `fenceFlip`.
- 3.2.0 phase 4: `game/takedown.ts` kinds `drop` (from `hang` / `pipe` / `split` / `zipline` / `rappel`: 1.2-5 m below
  within 1 m of the landing; `approach` = the fall time) and `inverted` (a guard within 0.9 m beneath); `below` is the
  ledge pull. `GRAB` (gear 2, hold 0.42 m, spread x1.2, shove stagger 1 s, hesitate 1.5 s), `GRAB_KINDS` (`behind`).
  `TakedownController`: attacker states from the attach kinds; a grab (`active.grab`: approach, `hold` - no override,
  `speedCap` at gear 2, the hostage `holdAt` in front, `setSolid(false)`, `holdAsHostage` pose; a fresh press
  (`pressedNow`) decides tap / hold -> `GRAB_STRIKE`; `shovePressed` -> `releaseTakedown(GRAB.shoveStagger)`),
  `hostage`, `grabs` counters, `grabAllowed` (off in PvP). GameState: sidearm draw / `attachSpread` while holding,
  `localRef.shield` (PlayerRef) -> `Enemy.tryFire` hesitates, aims at the head, rays include `G.ENEMY_HITBOX` and a hit
  on the hostage is `HitInfo.shieldHit`. Net: MoveState mode `grab` (`tid`); `CoopHost` keeps a client's seized guard
  at their offset and `ref.shield`. PvP: `net/pvpVictim.ts` `PvpVictim` (opponents as victims; only `drop` / `below` /
  `inverted`), message `ptd` -> `CoopHost.onPvpTakedown` (`PTD_REACH` 2.5, `PTD_HEIGHT` 5.5).
- 3.2.0 phase 5 (co-op team moves): `TEAM` table (`config/movement.ts`), `game/teamMoves.ts` (pure: `checkTeamRequest`
  -> `TeamDenial`, `canBrace`, `boostPath`), `game/teamController.ts` `TeamController` (`GameState.team`; states none /
  brace / boost / assist / ladderUp / top / bottom; `offer` = a braced mate within `partnerReach` + the boost target
  from `findJumpTarget` 1.15 m under `boostMax`: lips 3.75-4.5 m, beyond a wall jump). Y: tap at a braced mate = boost, held `TEAM.braceHold` = ladder, held with
  a mate within `mateRange` and a wall behind (`wallBehind`, one ray) = brace; B ends brace / bottom / top. Y order in
  `GameState`: takedown > team > traversal (CT moves included) > interact; cover / traversal skip while a team move
  runs. NetAttachment `teamMates` / `teamRequest` / `teamEnd`; messages `tmove` (client -> host), `tstart` / `tdeny` /
  `tend` (host -> all); `CoopHost.onTeamMove` checks both sides (`teamSide`: MoveState mode, team in PvP, 1 s rate)
  and starts it on both (host included); `teamPairs` for the ladder's end. MoveState modes `brace`, `boost`, `stacked`
  (`sub` 1 top / 2 bottom). `PlayerController.teleports`: a teleport drops a committed traversal move and resets the
  fall's top (no landing where it lands).
- 3.2.0 playtest changes: the manual jump (`LEAP` in `config/movement.ts`; action `leap`: touch `jump` button, layout v5;
  Y / E jump when traversal has nothing on offer): `TraversalController.leap` (`PlayerController.launch` up at `LEAP.vy`
  - the controller's take-off window `takeoffT` stops the support check pinning it down; the air branch falls at ~2 g),
  in the air `fallProbe` / `AttachController.leapProbe` (drainpipes / ladders within `LEAP.climbReach`) grab at once
  (after `LEAP.splitWait` when a split gap is under the jump); a second press within `LEAP.doubleTap` over the split
  (`AttachController.split`, no longer a traverse hint; prompt `splitDouble`; `TraversalController.splitNow` for the
  touch button) braces in it. `SPLIT.feetHeight` 2.5, `rootDrop` 0.37 (the root under the feet line: legs
  near level), `minHeight` 3.6 (`gripCentre` of a split = the braced hands); `findJump` returns null in a split (drop,
  drop attack or sidearm only); the double tap sets the split's `face` from the jump's travel (else the body's yaw).
  Horizontal pipes face along the pipe in every sub-state (`attachPose` pipeH yaw along `face`; `pipeFace(a, camYaw)`
  in `attachTo`; hands one ahead of the other, `pipeHands` either side of the top; inverted: legs straddle it, ankles
  crossed over the top); held back against the facing for `PIPE_TURN` 0.3 s it turns round (`backT`); `anchorFirst`
  includes a pipe overhead. Touch action button (`GameState.promptAction`): the world prompt on offer (order: in cover
  corner / move / vault else leave cover; attached vault / jumpTo / drop; out of cover moving or stick pushed: vault,
  cover, jumpTo, drop - still: cover first), `TouchAction.press` / `down` / `up` = the prompt's tap / hold handlers;
  always shown, `tc-idle` when nothing is on offer; world prompts are indicators only (no pointer events).
- All feel constants live in `config/movement.ts` (`MOVEMENT`, live-tunable in the debug overlay's Tune panel):
  crouched sneak 0.8 / crouch walk 1.8 / crouch run 2.6, standing walk 1.4 / jog 2.8, sprint 5.0 m/s (toggle or
  hold `gameplay.sprintHold`, no stamina, stands you up, weapon lowered at the low ready; aiming ends it via
  `cancelSprint`), aiming 1.4 / 1.0 crouched; strafe x0.9
  and backstep x0.75 only while aiming; analog by stick bands (`sneakBand`, `walkBand`, `crouchWalkBand`); cover
  2.3 / 1.25 crouched (a jog along the wall; `COVER_MOTION` never pivots), cover-to-cover run 3.6. Stance times: crouch 0.25 s, kneel 0.3 s, stand 0.28 s.
  `ENEMY_MOTION` / `ENEMY_CALM_MOTION` keep the enemies' slower, weighted tuning as standalone literals (3.2.0;
  `tests/motion.test.ts` pins them, so `MOVEMENT` changes never reach the guards).
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
  pad / keyboard, icons by touch (3.2.0: indicators; the touch action button acts on them).

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
  3.1 crossplay: `PVP_LOOK` (`core/quality.ts`; `QualityManager.build` in PvP: lights 16, shadows medium, gi on, ao /
  volumetrics off, effects high - how visible a player is never depends on the device; the governor keeps lights,
  shadow refresh and effects at full there), `core/display.ts` `matchFov` (`PVP_MAX_FOV` 90, `maxFov` = `fovH`: 16:9-equivalent, Vert- on wider
  screens; `Player.pvp`), `QualityManager.setPvp` (Panini off); graphics never change gameplay or what can be seen (fog on
  every preset, `tests/losParity.test.ts`).
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
- Graphics (3.0, 3.1 ladder; `core/quality.ts` pure): `GRAPHICS_PRESETS` Low / Medium / High / Ultra / Epic (`PRESET_IDS`;
  phones `MOBILE_PRESET_IDS` without Epic, `forPlatform` maps Epic -> Ultra and rt -> ssr on mobile, `QualityManager.setMobile`
  from `App.applyPlatform`) fill `GraphicsFeatures` (shadows off / low / medium / high / ultra / epic -> `shadowSpec`: sun
  cascades, lamp / flashlight casters 0 / 2 / 3 / 4 / 8 (WebGL's 16 texture units), map size, PCSS; lights 8-48; ao,
  bloom, reflections off / ssr / rt (+ `rtRes` half / full), volumetrics (shafts only: the height fog is drawn on every
  preset, fairness) + `volLights` 2-12, `postRes` half / full (SSAO ratio, SSR downsample), dof, motionBlur, lens, aa fxaa / msaa / taa,
  textures / detail / effects tiers), `presetOf` (Custom), `qualityLevel` -> `QualityLevel`. Settings `video.preset`,
  `video.gfx`, `renderScale` 0.5-2 (native DPR, no cap), `dynamicRes` (off), `fpsCap` (`GameLoop.fpsCap`,
  `capAllows`), `fovH` 60-120; `setGfx` / `setPreset` (also sets `renderScale` / `upscaler` from `PRESET_DISPLAY`:
  Low 0.67 .. Ultra 0.9 TAAU, Epic native). `VOXEL_TIER` per Detail tier: structure 5 cm on every preset (fairness),
  the 2.5 cm prop layer from High up, character / weapon voxel sizes; `VOXEL_LOD` distances per tier. `app.quality` (QualityManager) applies the level to the state's
  `applyQuality(level)` (GameState: `World.applyQuality` + `PostStack.apply`; MenuState: lamp shadows + its stack),
  feeds `RefreshDetector` (raw rAF intervals), `FrameStats` and, only with dynamic resolution, the
  `ResolutionScaler` (0.5-1.0 against the cap or display budget). `?gfx=min|low|medium|high|ultra|epic` overrides for a page;
  `QualityManager.setOverride({ preset, scale })` is the benchmark's per-run override (never saved; ignored under `?gfx=`).
- Auto graphics (3.1, `core/deviceTier.ts` pure): `tierFromRenderer(renderer, mobile)` (desktop / phone GPU tables,
  confident or not; iOS "Apple GPU" is not), `deviceKey`, `Calibration` (the ladder top down on the menu stage, each at
  its render scale x `CALIBRATION.load` 1.4, warm-up 0.6 s + 1.2 s measured, p90 interval <= budget x 1.12; <= 6 s).
  Settings `video.auto` (default; 3.0 settings on Epic move to it; `setPreset` / `setGfx` turn it off, `setAuto(s,
  tier)`), `video.device {key, tier, source gpu | calibrated | none}`. `App.detectGraphics(force)` after
  `loadSettings` and on a platform change: known key -> its tier; else the GPU name; else `calibKey` and
  `calibFrame` runs it on `MenuState` (`menuStage`) through `QualityManager.setOverride`, aborted off the menu,
  toast + `onDetected`. Under automation only with `?detect=1` (`?renderer=` fakes the GPU name).
- Frame governor (3.1, `core/governor.ts` pure): `Governor.frame(interval, budget)` levels 0-10 (`adaptiveAt` ->
  `Adaptive`: scale 0.92 / 0.84 / 0.76, shadowEvery 2, volLights x0.5, voxelLod x0.75, effects x0.6, lights x0.75,
  partLod x0.75, scale 0.68), down on a p90 miss (> budget x 1.08, >= 8 frames, 1 s cooldown), up by a trial after
  6 s doubling to 96 s on a miss; `thermal` (a minute's average 12% over the first at one level, or three failed
  tries), `lowPower` (a phone at < 40 Hz; App toasts once). `QualityManager` runs it in a match when `video.adaptive`
  (default; replaces `dynamicRes`) and not under `?gfx=` / a benchmark override; `applyAdaptive` -> canvas scale
  (no TAAU) and `QualityTarget.applyAdaptive` (GameState: `World.applyAdaptive` - `LightRig.setAdaptive(lit share,
  shadow refresh)`, sun CSM refresh, voxel / part / anim LOD; `PostStack.setAdaptive` - `Taau.setScale` (the post
  process's ratio), volumetric light count; vfx / weather density). Reset on a new target or a settings change.
  Debug line `governor L<n>`; feedback context `adaptive`. `perf.mjs --preset=<p> [--mobile]` (phone budgets per preset).
- Benchmark (3.0, `game/benchmark.ts` pure: `BENCH`, `benchPlan(kind, w, h)`, `benchResult`, `sustainedDrift`):
  Settings > Graphics > Benchmark -> `app.benchmark(kind)` -> a Clear match on the Warehouse with `opts.benchmark`;
  `GameState` flies the camera through the room centres (`pathAt`, Catmull-Rom), guards passive, one flight per run
  (`current`, `presets` High / Ultra / Epic, `resolutions` = render scales reaching the pixel counts of 2560 x 1600,
  4K, 7680 x 2160 within scale 2, `sustained` 10 min with per-minute averages), then a Dialog with a line per run
  (`benchmarkLines`), saved as a performance feedback note.
- Renderer (3.0): `LightRig.configure` - unshadowed map lights in a `ClusteredLightContainer` (plain pool of 6
  without float blending), a shadow pool of spot lights with `ShadowGenerator`s (flashlights first, then the
  nearest lamps; lamps use a 144 deg cone there; idle maps stop refreshing, shadows never toggle - no recompiles),
  one shared caster list (`addCaster`: level meshes, characters, props; `World.addShadowCaster` also sets the
  receiver), materials fitted by `onNewMaterialAddedObservable`; additive cones hidden with volumetrics.
  `World.applyQuality`: the sun / moon `CascadedShadowGenerator`. Blob shadows only with shadows off.
  `vfx/postStack.ts` `PostStack` (rebuilt on a change): TAA, SSAO2, SSR, screen motion blur, the volumetric pass
  (depth renderer; per light a ray / sphere stretch marched for cone in-scatter, closed-form height fog; 12 nearest
  lights), then `DefaultRenderingPipeline` (HDR, MSAA samples, FXAA, bloom, DOF focused by `focus` / `focusOn`:
  aiming = the aim ray's hit, chromatic aberration, sharpen with TAA, KHR PBR Neutral tone mapping);
  `CinematicPost.toEnd()` keeps the grade / vignette / goggles pass last.
- Materials (3.0): `world/surfaceAtlas.ts` `SurfaceAtlas` - two GPU `ProceduralTexture` atlases (4 x 4 tiles, periodic
  GLSL: `detail` rgb albedo variation + a roughness, `normal` rg normal + b height + a cavity) for `SURFACE_KINDS`
  (`SURFACE_PARAMS`: metres per tile, metallic, bump); drawn once, `setSize` by the Textures tier (`TEXTURE_SIZE`
  per tile, `TEXTURE_ANISO`; 256 for `?gfx=min`). `world/surfacePlugin.ts` `SurfacePlugin` (PBR plugin): triplanar
  `textureGrad` taps in world space (level: per-instance `surf`) or object space (parts: `pattern.z`), albedo x
  detail x cavity, `metallicRoughness`, a UDN normal blend (world space). `world/surfaceKinds.ts` (pure)
  `pieceKind` / `floorKind` / `hsv`: floors by the footstep surface, else by colour; `partSurface` (weapons
  brushed / polymer, characters fabric / rubber, props like the level). The level (`LevelBuilder.build(.., { atlas,
  floor })`) and `PartLibrary(scene, atlas)` are `PBRMaterial`s: colours converted to linear, `usePhysicalLightFalloff
  = false` and `directIntensity = PI` (PBR divides diffuse by pi; the lights were authored for the standard
  material), `realTimeFiltering` on the `World` reflection probe (rendered once, then `scene.environmentTexture`;
  assigned after the capture to avoid a feedback loop). The menu stage has its own atlas for the operator.
- Detail (3.0): `world/detailPass.ts` (pure) `detailPieces(boxes, mapId, tier)` - skirting, conduit + junction
  boxes + switches, wall boxes / vents / signs (ultra), floor stains / puddles / debris (epic); every piece
  `collide: false`, `noLedge`, `detail` (the minimap skips it); `LevelBuilder.build(.., { detail })` from
  `WorldOptions.detail` (the Detail tier when the map loads; none with `?gfx=min`); a test builds every map and checks
  cover faces, ledges and the solid set are unchanged. `QualityLevel.detailScale` scales `PartLibrary.setLodScale`
  and `setAnimLodScale` (characterRig). `Vfx`: spent brass (`Brass`: one bounce, then lies at the shooter's floor;
  48 x effects density kept), 160 decals.
- Voxels (3.0, `src/voxel/`): the level renders as voxels; gameplay still reads the blockout (collision, cover, nav,
  ledges, anchors, perception). `levelVoxels` (pure) splits the pieces (every side >= `MIN_VOXELS` 1.5 voxels becomes
  voxels, thinner ones stay thin-instanced boxes / cylinders until the art layer models them) and builds the palette
  (`Palette`: colour + surface kind + emissive, <= 255) and the grid (`CHUNK` 128 voxels a side, origin on the brick
  grid). `shapes.ts` (pure): `VoxelShape` box (yaw / pitch as Babylon's) / cylinder, fill / carve / paint, packed 16
  floats each, `rasterise` by voxel centre (a surface lands within half a voxel). `mesher.ts` (pure) greedy meshing on
  occupancy only (one-voxel apron, Babylon winding). `chunk.ts` `buildChunk` (pure: rasterise + mesh + bricks) runs in
  `voxelWorker.ts` through `WorkerPool` (`hardwareConcurrency - 4`, 2..16; inline without Worker). `brickmap.ts`
  (pure) `Brickmap`: 8^3 bricks, empty / uniform / explicit (pool slots), `fold`, `compact`. `VoxelWorld` (Babylon):
  chunk jobs per level of detail (level l = 2^l x the size, same chunk extent), meshes per chunk, the brickmap on the
  GPU (indirection RGBA8 3D: a 0 empty / 254 uniform / 255 explicit slot; pool R8 3D 512 x 512 x 8n; palette RGBA8 256
  x 1), `VoxelPlugin` (PBR plugin: the voxel behind each pixel -> palette; per-voxel tone / roughness hash; AO and
  worn convex edges from neighbour voxels; the surface atlas as micro detail inside faces; rain `wet`; emissive;
  coarse levels search 2^l voxels inward), level of detail per chunk by camera distance at 5 Hz (`VOXEL_LOD` per Detail
  tier: Epic 30 / 60 m). `voxelCache.ts`: chunk results in IndexedDB `kv` (`voxel:<map>:<seed>:<size>:<levels>:v<VOXEL_VERSION>:<hash>`,
  newest 4 kept). `World.create(.., { voxel })` (GameState: 5 cm x 3 levels with AO / micro; `?gfx=min` 20 cm x 1, no
  AO / micro; `?voxels=0` the old boxes); chunk meshes are shadow casters and in the reflection probe.
  Coarse levels rasterise `coarseShapes` (every filled shape >= one voxel thick, so thin walls never drop out at a
  distance). `tests/losParity.test.ts` (3.1): sight lines through the Warehouse agree for every preset's layers and
  levels (against Epic up close), except lines grazing a surface within the coarsest voxel's reach; a line through
  every thin piece stays blocked at every level.
  `tests/voxelFit.test.ts`: parity (voxelising changes no cover face, ledge or solid) and fit (+-3 cm on every axis
  cover face, ledge lip and floor top against the plain blockout, art layer and fine layer included; round pillars:
  half a voxel's diagonal plus the curve's sag).
- Voxel art (3.0 phase 2): `MapDef.art` (`VoxelArt`: `piece(p, i, kind, pal, mat)` -> `{ mat, prog, params, fine }`,
  `extra(pal, boxes, cyls)` -> visual-only shapes) - `world/maps/warehouseArt.ts` picks by the builder's colours.
  `voxel/programs.ts` (pure) material programs run per voxel inside `rasterise`: BlockWall (running bond, mortar),
  Concrete (chipped arrises, form lines), Cladding (concrete plinth, ribs carved only above 4.4 m), Planks, Steel
  (worn edges, seams, rust), Hazard, Floor (saw cuts, stains), Wrap, Rack, paint programs Grime / Rust (-1 = keep);
  variants are consecutive palette entries (`Palette.range`). Rule: nothing carves or protrudes where gameplay reads a
  surface (cover faces, lips, floors) - the fit test enforces it. `fine: true` pieces (props, furniture, machines,
  vehicles; also pieces thinner than 1.5 coarse voxels) form a second `VoxelWorld` at `fineSize` (2.5 cm at Epic,
  `World.voxelsFine`, LOD at half the distances). With an art layer the box detail pass is skipped.
- Sky bake (`voxel/skyBake.ts`, pure, a worker job): conservative occupancy in 0.5 m cells, 16 cosine-weighted upward
  rays per air cell -> visibility (R8 3D texture, linear) + the roof height per column. `VoxelPlugin` takes the
  hemisphere's fill itself (`setFill`; the hemi light excludes voxel meshes) scaled by visibility, and scales
  irradiance / reflections by it; the fine layer reads the structure layer's bake (`skyFrom`). `VoxelWorld.roofAt`,
  `skyAt`. Palette row 1 r = puddle (mirror-like in the rain).
- Weather choice (3.0, `MapDef.weathers`, `WeatherChoice` clear / rain / fog; Play screen + co-op lobby, `lobby` /
  `start` messages carry `weather`): rain = `Weather('rain')` with `occluder` = `roofAt` (no rain under roofs; it falls
  through the skylights), voxels wet only where the sky reaches (`setWet`), fog x1.6; fog = fog x4 and the volumetric
  pass's light shafts (`PostStack` `sky` + `shafts`: the sky bake sampled along the first 30 m of each ray).
- Voxel characters (3.0 phase 3, `voxel/voxelBody.ts`): `setVoxelBodies(opts)` (GameState: 2 cm, 4 cm past
  `LOD_DISTANCE` x detail; menu stage 2 cm; `?gfx=min` / `?voxels=0`: null, the smooth parts render) makes every
  'detailed' `CharacterRig` (the stick style stays) a `VoxelBody`: every part on one joint voxelised into one grid in
  that joint's space (`meshVoxels.ts` `fillMesh`, pure: scanline parity by voxel centre; thin features keep the cell of
  a surface vertex with none of the part's cells beside it; a later part overwrites an earlier one - balaclava over the
  head), greedy meshed by value (`greedyMesh(.., byValue)`: faces between parts culled, a quad per part colour), cached
  per (joint's parts + transforms, size), merged into a body and a head mesh
  (+ the LOD pair) with per-vertex colour / pattern / `color2` / `vox` (the voxel-grid position: `VoxelBodyPlugin`
  per-voxel tone and fine seams), rigidly skinned: one flat bone per node a part hangs from, set each frame (skeleton
  `onBeforeComputeObservable`) to the node's world matrix relative to the root, so ragdolls (joints re-parented onto
  physics nodes) still drive it. The smooth parts stay, invisible (hit volumes, clearances, ghost / sonar read the
  joints). `rig.renderMeshes` (shadow casters), `rig.setHeadVisible` (camera fade), `setLensGlow` / `setFlash` reach
  the vertices (`setPartColor`). `PartLibrary.skinMaterial` (unfrozen twin of the part material + `VoxelBodyPlugin`,
  `mesh.metadata.skinMaterial` on the bases). Two draws per character (+ shadows).
- Voxel weapons / gadgets (3.0 phase 4, `voxel/voxelGroup.ts`): `VoxelGroup` merges the parts under one node into one
  rigid voxel mesh there (parts at `size`, parts thinner than `small` on a second grid at `fineSize`; a coarser LOD).
  `setVoxelWeapons` (`WeaponModel.voxel`, `renderMeshes` for shadow casters; 1 cm, 5 mm small parts, 2 cm LOD) and
  `setVoxelProps` + `voxeliseParts` (thrown grenades - the LED stays a part to blink - and the drone body, the rotors
  stay parts to spin). `VoxelSink` (`voxelBody.ts`) is the shared vertex builder.
- Chips (3.0 phase 4, cosmetic): `Ballistics.onWorldHit` (GameState, 5 cm voxels or finer) -> `VoxelWorld.chip`: the
  voxel behind a world hit (the prop layer first) turns to `LevelVoxels.chip` (a dark pock, the palette's last
  entry): one `texSubImage3D` texel, or for a uniform brick a new explicit slot from the GPU pool's spare capacity
  (brick + indirection texel); geometry, collision and meshes never change. `Vfx.chips` throws cubes of the struck
  colour (instead of the decal).
- GI (3.0 phase 6, `GraphicsFeatures.gi`, Epic; baked at load, so "next map"): `world.ts` `giLights(reg)` packs the
  map's fixed lights (not flashlights; `GI_STRIDE`) with a slot per lamp circuit (`group`, <= `GI_SLOTS` 12, more share
  the last); the sky bake job takes them (`skyBake.ts` `bakeGi`, pure: per air cell near a light, 12 rays to the
  surfaces round it, each surface's direct light from that lamp - falloff, cone, facing, a visibility march - bounced
  at a grey albedo, into the light's slot; RGBA / `GI_MAX`). `VoxelWorld.giTex` (the sky cells, slots stacked along
  z; the fine layer reads the structure's), `VoxelPlugin` `VOXEL_GI` adds the slots x `giWeights` (World.updateGi on a
  `LightRegistry.version` change: the lit share of each circuit - switches, shot-out lamps, EMP) to the voxel ambient.
  Cached with the sky (`VOXEL_VERSION` 4, the key carries the lights' hash).
- Reflections (3.0 phase 5, `GraphicsFeatures.reflections` off / ssr / rt; settings before had `ssr` on / off):
  `vfx/rtReflections.ts` `RtReflections` (PostStack, Ray traced with a voxel world, `PostStackOptions.rt` = GameState's
  `RtSource`: the structure layer's textures, its plugin's wet / fills, `rtCapsules`, the light registry): `rtScene`
  (a copy) -> `rtReflect` (per pixel, or a checkerboard alternating per frame at `rtRes` half: the voxel the pixel
  shows gives an axis normal, metal (`VX_P`), wetness / puddle -> roughness; glossy ones reflect: screen space first
  (20 steps against the depth), then a brickmap DDA (empty bricks skipped, <= 320 steps, 30 m) and up to 16 character
  capsules; hits shaded by palette colour, sky fill x baked visibility, 16 nearest lights, emissive) -> `rtComposite`
  (a tent over the traced pixels added to the scene). The SSR pipeline is off while it runs.
- TAAU (3.0 phase 5, Display > Upscaler, `video.upscaler` off / taau with a render scale < 1; `QualityLevel.upscale`):
  the canvas stays native (`QualityManager.applyScale`), `vfx/taau.ts` `Taau` is first in the chain (its input sets
  the scene's size), jitters the projection (Halton 2, 3 in low-res pixels; un-jittered view-projection kept for the
  reprojection), resolves at full resolution (Catmull-Rom current, history reprojected through the depth and clamped
  to the 4-neighbourhood, 1 : 9) into a ping-pong pair handed on by `taauPass`; replaces TAA.
- Panini (3.0 phase 5, `video.panini` 0..1, `QualityLevel.panini`): `core/panini.ts` (pure: `paniniView`,
  `paniniScale` fit to the width) and `vfx/paniniPass.ts` (after the default pipeline, before the grade). World
  prompts and markers are projected rectilinear (they drift a little near the sides with a strong Panini).
- Weather (3.0, `MapTheme.weather`: Port rain, Dust Depot dust, Refinery haze): `vfx/weather.ts` `Weather`
  (thin-instanced streaks / motes in a box wrapped round the camera, updated in place, count x effects density),
  `SurfacePlugin.wet` (upward faces darker and glossy, more in cavities: SSR puddles), the volumetric pass's
  `shimmer` (heat haze: distant, low pixels displaced).
- Hot paths must not allocate (no closures, iterators or temporary vectors in AI/nav/anim loops; `for` with an
  index over arrays; typed-array heaps). Use `hyp2`/`hyp3` (`core/mathx.ts`), never `Math.hypot` (V8 allocates
  its arguments).

## Performance budget (3.0: the gaming laptop; desktop first)
- Frame-rate targets (the RTX 4090 Laptop, mains power, Epic, Warehouse, 10 guards; 1% low >= 70% of the average):
  1920 x 1200 165 Hz (RT reflections 120), 2560 x 1600 120 Hz (RT 90), 3440 x 1440 100, 5120 x 1440 90, 4K 60 (RT 50),
  7680 x 2160 60 with TAAU at 67% (High 120). Phones run the same settings slower (accepted).
- GPU per frame = the target's frame time minus ~10% headroom: 165 Hz 5.5 ms, 120 Hz 7.5 ms, 100 Hz 9 ms, 90 Hz 10 ms,
  60 Hz 15 ms. Only the laptop can measure it: Settings > Graphics > Benchmark (TESTING.md table).
- CPU main thread <= 3 ms per frame (inside a 240 Hz frame's 4.17 ms): the sim (fixed steps, anim, camera) + the
  render's JS (active mesh evaluation: LOD, culling, skeletons / voxel bones). Animation <= 0.04 ms per character with
  voxel bodies. <= 600 draw calls and <= 8 M triangles per frame over every pass (shadow maps and post included).
  Allocations <= 11.5 MB per second (per second, so a 240 Hz display does not double the garbage). Memory: VRAM <=
  12 GB at Epic (High 6, Ultra 9; brick pool <= 5 GB; render targets <= 2.5 GB at 4K, 3.5 GB at 7680 x 2160), tab <=
  6 GB, JS heap <= 1.5 GB, voxel cache <= 2 GB; Warehouse load <= 4 s cold, <= 1.5 s cached.
- `perf.mjs --desktop --budget` (the PC path, `?gfx=epic`, 640 x 360): the sim's p95 (fixed steps, anim, camera)
  <= 2 ms (the rest of the 3 ms is the render's submission), animation <= 0.04 ms per character, allocations <= 11.5
  MB/s; draws <= 520 and triangles <= 1.7 M as the regression check (counted by wrapping the engine's draw calls: every
  pass; the laptop's GPU budget stays 600 / 8 M). Measured (3.1.0, idle VM): sim p95 2.05 ms at speed x1.19, animation
  0.044 ms, 444 draws (moon cascades 172, lamp shadows 140, main 55, G-buffer 52), 1.34 M triangles, 9.9 MB/s. CPU
  budgets scale by the machine: a fixed pure-JS workload against `REF_MS` (the VM the 2.3 budgets were set on), so a
  slower or busier VM does not fail an unchanged build (a reading far off the usual ~4.2 ms means the VM was busy:
  run again). The render's JS is printed but not enforced (software GL stalls land in it); the laptop's benchmark
  line carries the real main thread p95 (`benchResult` cpu from `GameLoop.stats.frameCpuMs`).
- 3.1 phone budgets (`perf.mjs --preset=<p> --mobile --budget`, `PASSES=1` prints draws per pass): draws Low 120 /
  Medium 170 / High 230 / Ultra 250 (the iPhone 17 Pro Max target: main thread <= 4 ms of 8.33, <= 2 M triangles);
  measured Low 103, Medium 156, High 218, Ultra 233. What keeps them there: `World` shadow proxy (below Epic the
  voxelised pieces cast from one thin-instanced box + cylinder mesh on `PROXY_LAYER`, which no camera draws -
  explicit shadow lists ignore layers; `setCasterMode` by `shadows === 'epic'`), `World.updateSunCasters` (4 Hz:
  static + moving casters open to the sky, none under 0.3 m; Low `ShadowSpec.staticSun`: static only, blob shadows
  on), `LightRig.fillCasters` skips casters under 0.3 m, `PostStack.depthSource` (the G-buffer's raw view z for fog /
  TAAU when SSAO / SSR enable it; `depthRaw` uniform; DOF's depth renderer `enabled` only while aiming), non-player
  `VoxelBody` without the head split.
- `perf.mjs --budget` (no flag) is the test-path regression check (`?gfx=min`: no post stack, no voxel characters,
  20 cm voxels): sim p95 <= 2.5 ms, animation <= 0.04 ms per character, <= 55 draws, <= 0.2 M triangles, allocations
  <= 11.5 MB/s. Measured (3.1.0): sim p95 1.5 ms, 0.043 ms, 43 draws, 0.14 M triangles, 11.0 MB/s.
- Draw calls (3.0 fix): voxel chunks merge into super-chunks (`VoxelWorldOptions.group`: structure 2^3, props 4^3);
  each lamp's shadow map lists only the casters within its reach (`LightRig.fillCasters`, refilled per pick, the
  list replaced only when it changes); the moon's cascades list moving casters and the static meshes the moon can
  reach (`World.sunCasters`: open sky above, or the roof itself); the character skin material is frozen.
- Static level geometry uses thin instances, `freezeWorldMatrix()`, frozen materials.
- Dynamic physics bodies capped (see `physics/budget`). Projectiles/effects pooled, never allocated per shot.
- Render scale: native DPR x `renderScale` (0.5-2), dynamic resolution (optional) within it; with TAAU the canvas stays native and the scene renders at the scale.

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
