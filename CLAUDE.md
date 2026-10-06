# Shoulder Strike - architecture and conventions

Mobile-only third-person over-the-shoulder shooter. Static web app (Vite + TypeScript + Babylon.js 9 + Havok),
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
  - `scripts/e2e-progression.mjs` armory/store by controller, rewards, IndexedDB persistence, export/import
  - `scripts/e2e-cover.mjs` (A cover, B crouch, Y traverse) snap side-on, turn-and-swap, kneel, peek/blind
    fire/vault, B keeps cover, stand/crouch at high cover + crouched edge peek, lean in place, outside corners (corner prompt + A, never automatic) /
    inside corners, edge stop a step back, no cover badge, SWAT turn, cover-to-cover only when looking at it with the stick held towards it + slide + marker,
    world prompts (low on the surface, tapped by touch), manual cover only (walking / sprinting into a wall never
    snaps), crouched aim over low cover, keyboard Space
  - `scripts/e2e-clip.mjs` weapon clipping sweep: every frame of wall-side movement, high / low cover (idle,
    moving, turn-and-swap, reload, swap), edge-peek aim sweeps both edges standing / crouched (with step-out),
    aim over, vault, aim every weapon, aim walking / crouched: no gun point inside the world (> 2 cm), legs grazed
    <= 2.5 cm, gun clear of the head (> -1 cm) and trunk (> -2 cm), elbows (> -3 cm), knees above the floor and
    > 9 cm apart, feet > 6 cm apart (`--only=name --log`)
  - `scripts/e2e-tactics.mjs` doorway check, contextual lean, slicing the pie, split hit volumes, suppression,
    exposure HUD, enemy grenades/flanker, footstep noise investigation
  - `scripts/e2e-coop.mjs` two pages over `?net=local`: lobby, match, validated hits, revive, results, host leaving, offline
  - `scripts/e2e-cosmetics.mjs` customiser by controller, locked previews, emotes, camo, in-game look
  - `scripts/e2e-clear.mjs` Warehouse + Clear mode: only "Enemies left N" (alive + pending), no room tags /
    counts / lives / score / blips, no per-room feedback, "DOWN", OPERATION COMPLETE stinger, results without a
    rooms row; Wave keeps room tags; doorway checks; mini room set; Warehouse default for Wave / Mission / Clear
  - `scripts/e2e-offline.mjs` service worker precache (every manifest entry), offline boot + match, backgrounding
    pauses, co-op offline state, v1 save in IndexedDB migrated on boot with a backup
  Long simulations use `window.__app.loop.stepHeadless(seconds)` (no rendering) to stay fast.
  - `node scripts/shot.mjs out.png "autostart=proving" 60 "<js>"` screenshot helper (`?autostart=<mapId>`)
  - `node scripts/rig-shot.mjs out.png [yaw]` close-up of the customiser rig (proportion/silhouette checks)
  - `node scripts/anim-sheet.mjs out.png <walk|jog|sneak|crouchrun|sprint|start|stop|strafe|back|turn|crouch|dash|
    reload|swap|grenade|cover|highcover|peek|vault> [frames] [interval] [side|front|back|ots]` contact sheet
  - `node scripts/perf.mjs [--budget]` Warehouse, 10 enemies: CPU per 120 Hz frame p50/p95/p99, animation ms per
    character, allocations (per simulated second / per frame, top allocators), draw calls (`PROFILE=1` CPU profile)
  - `node scripts/soak.mjs [minutes=10]` real-time soak: pacing, CPU, adaptive quality, heap growth (leak check)
  Uses the preinstalled Chromium (Pixel 7 landscape emulation, SwiftShader GL - FPS there is not representative).

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
| `player/` | Character controller (Havok `PhysicsCharacterController`), tactical movement maths, contextual traversal, proportions, shared `CharacterRig`, camera |
| `anim/` | Pure animation: `MotionDriver` (root motion), `curves`/`pose`/`clip` + `clips/` (clip library), `Inertializer`, `AnimGraph` (clip graph -> IK targets), `FootPlanner` (world-space feet), `rigMath` (two-bone IK, `Spring`) |
| `cover/` | Cover faces (`coverData`, pure), `CoverStateMachine` (pure), `CoverController` (player cover), corners/doorways (`corners` pure, `CornerController`) |
| `weapons/` | Data-driven weapons, hitscan + pooled projectiles, recoil/spread, grenades, `WeaponCarry` (ready positions, raise-to-fire) |
| `ai/` | Enemy state machines, grid navmesh + A*, cover points |
| `world/` | Modular tile kit and map builders (Warehouse, Dust Depot, Proving Grounds), `rooms` (room tags; pure) |
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
  R3 shoulder, RB/LB weapons, D-pad up grenade, others emotes. Keyboard: Space cover, C / Ctrl crouch, Shift
  sprint, E traverse / interact, R reload, Q / X weapons; mouse look, LMB fire, RMB aim, wheel weapons. Gamepad look: 30 ms smoothing (acceleration inside the
  smoothing, so releasing never steps the rate).
- Touch (`input/touchControls.ts`): pointer handlers only record state; `update(dt)` (per frame, from
  `InputManager.poll`) turns it into input. Floating move stick on the left half (flick-to-sprint optional, off by
  default); crouch toggle, sprint toggle; camera-only right stick (rate based: dead zone, response curve, 50 ms smoothing, acceleration when
  held at the rim; never fires); optional drag-look in the empty upper right; separate fire button (84 px; optional
  left fire; optional fire drag-look); ADS; a contextual action button only to use an interactable (`setAction(TouchAction)` from
  `GameState`, hidden otherwise; acts on release). Cover, vault/climb/step/drop and cover-to-cover are the world
  prompts (`ui/hud/worldPrompts.ts`), tapped directly. Secondary buttons >= 56 px. Layout: `settings.touch.layout` (`TOUCH_CONTROL_IDS`, per-control `x, y,
  scale, alpha?`), presets `LAYOUT_PRESETS` (default / claw / lefty), `TOUCH_LAYOUT_VERSION` 2 (v1 layouts keep
  customised placements; the old fire stick and untouched controls take the new defaults). Layout editor: presets,
  size, opacity, thumb-reach overlay, preview.
- `InputState` merges sources per action (down if any source holds it), latches press edges until consumed,
  and `releaseAll()` blocks still-held buttons until released so state changes never cause phantom presses.
- Edges are consumed after each fixed step (gameplay) or by `ScreenManager.update` (menus open).
- `InputManager` owns the active mode (`touch|gamepad|kbm`), sets `body.input-*` classes; CSS uses them to
  show/hide the focus ring, glyph prompts, and the touch layer.
- iOS exposes a controller only after its first button press: `GamepadSource` scans on every poll, not just on
  `gamepadconnected`.

## UI
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

## Characters (one rig for player, enemies, coop remotes, dummies and the customiser)
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
- Avatar style (`video.avatarStyle`, `setAvatarStyle`): `stick` (default; capsule limbs, sphere joints and head,
  pill feet on the same skeleton) or `detailed`. Saves and cosmetics are unchanged (colours apply to both).
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
  when sprinting), `noiseRadius(speed, crouched, sprinting)` (sneak < 1 m .. sprint 18 m). Crouched targets are
  seen at 0.6x the distance.
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
- Enemy brains (`ai/enemy.ts`) think at ~4 Hz (LOS raycasts staggered) and act every fixed step. Tactics: walk
  when they can see the target, run only to contact/between covers; suppressive fire at the last known
  position, blind fire in some hide phases; cover choice weighted by `coverQuality`; `EnemyManager` assigns one
  flanker against a player holding cover (> 4 s) and allows one grenade in the air at a time (player camping
  the same cover > 6 s); `hear()` makes unalerted enemies investigate footsteps (`PlayerRef.cover/coverT/
  suppress` carry the player side).
- `EnemyManager` caps alive enemies (10) and ragdolls (`BUDGET.maxRagdolls`).
- Modes implement `GameMode` (`game/modes/`); `GameState` owns world, player, combat, AI, pickups,
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
