# Shoulder Strike - architecture and conventions

Mobile-only third-person over-the-shoulder shooter. Static web app (Vite + TypeScript + Babylon.js 9 + Havok),
installable PWA, fully playable offline. Hosted on GitHub Pages.

## Commands
- `npm run dev` - dev server (LAN-exposed for phone testing)
- `npm run build` - typecheck + production build into `dist/`
- `npm test` - Vitest unit tests (node env, `fake-indexeddb` for save tests)
- `npm run lint` - ESLint (typescript-eslint)
- `npm run icons` - regenerate procedural PWA icons into `public/icons/`
- `npm run e2e` - serves `dist/` and runs the headless e2e suites (needs a prior `npm run build`):
  - `scripts/smoke.mjs` boot + console-error check (`--shot=out.png` for a screenshot)
  - `scripts/e2e-pad.mjs` controller-only navigation through every menu using a fake Gamepad API pad
  - `scripts/e2e-touch.mjs` touch-only: taps menus, multi-touch drags the virtual sticks
  - `scripts/e2e-move.mjs` character controller checks on Proving Grounds
  - `scripts/e2e-combat.mjs` weapons, hits, headshots, reload, swap, grenades, barrels, death/respawn
  - `scripts/e2e-modes.mjs` wave progression, mission flow, enemy types, ragdolls
  - `scripts/e2e-progression.mjs` armory/store by controller, rewards, IndexedDB persistence, export/import
  - `scripts/e2e-cover.mjs` movement speeds, cover snap/strafe/edge/peek/blind fire/vault/corner/auto-snap
  - `scripts/e2e-coop.mjs` two pages over `?net=local`: lobby, match, validated hits, revive, results, host leaving, offline
  - `scripts/e2e-cosmetics.mjs` customiser by controller, locked previews, emotes, camo, in-game look
  - `scripts/e2e-offline.mjs` service worker precache (every manifest entry), offline boot + match, backgrounding
    pauses, co-op offline state, v1 save in IndexedDB migrated on boot with a backup
  Long simulations use `window.__app.loop.stepHeadless(seconds)` (no rendering) to stay fast.
  - `node scripts/shot.mjs out.png "autostart=proving" 60 "<js>"` screenshot helper (`?autostart=<mapId>`)
  - `node scripts/rig-shot.mjs out.png [yaw]` close-up of the customiser rig (proportion/silhouette checks)
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
| `core/` | `babylon.ts` import surface, engine creation, `GameLoop` (fixed 60Hz sim + manual Havok step), event bus, feature flags, scene manager |
| `input/` | Action map; touch, gamepad, keyboard/mouse sources all write the same `InputState` |
| `ui/` | DOM overlay UI. `FocusNav` spatial navigation shared by every menu; screen stack; HUD; debug overlay |
| `game/` | Play session state, game modes, damage/health, pickups, interactables |
| `physics/` | Havok loading, collision groups, body budget |
| `player/` | Character controller (Havok `PhysicsCharacterController`), movement maths, proportions, shared `CharacterRig`, camera |
| `anim/` | Pure animation: `AnimGraph` (layered state machine + blend tree -> IK targets), `rigMath` (two-bone IK, gait, springs) |
| `cover/` | Cover faces (`coverData`, pure), `CoverStateMachine` (pure), `CoverController` (player cover) |
| `weapons/` | Data-driven weapons, hitscan + pooled projectiles, recoil/spread, grenades |
| `ai/` | Enemy state machines, grid navmesh + A*, cover points |
| `world/` | Modular tile kit and procedural map builders |
| `progression/` | XP/levels/currency maths, unlock tables, upgrade trees (pure, unit-tested) |
| `cosmetics/` | Avatar part catalogue, procedural materials/camos |
| `save/` | IndexedDB wrapper, versioned schema, migrations, export/import |
| `audio/` | WebAudio synth voices and mixer |
| `vfx/` | Pooled particles, tracers, decals |
| `net/` | Optional coop: transports (Trystero / BroadcastChannel), protocol validation, session/lobby, host + client sims, lobby UI |
| `pwa/` | Service worker registration, fullscreen/orientation, gesture suppression |
| `config/` | JSON/TS content data (weapons, enemies, unlock tables) |

## Game loop
`GameLoop` disables Babylon's automatic physics (`scene.physicsEnabled = false`) and steps Havok itself at a
fixed 1/60 s inside an accumulator (max 4 steps/frame, backlog dropped). Order per step:
`fixedUpdate(dt)` -> `onBeforePhysicsObservable` -> `physics._step` -> `onAfterPhysicsObservable`.
After the steps: `frameUpdate(dt, alpha)` then `scene.render()`.

## Input
- Actions (`input/actions.ts`) are the only thing game/UI code reads. Sources: `GamepadSource` (polled each
  frame, standard mapping in `gamepadMapping.ts`), `TouchControls` (DOM virtual sticks/buttons, layout from
  settings), `KeyboardMouseSource` (desktop testing only).
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
  `LevelBuilder` and returns a `MapLayout` (spawns, props, objectives, pickups). Register in `world/maps/index.ts`.
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
- Animation: callers pass a `RigPose` (speed, local move dir, grounded, crouch, roll, aim, aimPitch/aimYaw, kick,
  sprint, reload, cover/peek/blind/vault, melee) to `rig.animate(dt, pose)`. `AnimGraph` picks the lower-body
  state (roll > vault > air > cover > crouch > locomotion) and cross-fades weights over 200 ms (`FADE`);
  locomotion is a blend tree over `GAIT` (idle/walk/jog/sprint: stride, duty, lift, bob, swing, lean). Feet
  follow `gaitFoot` with cadence from ground speed, so planted feet never slide; turning in place steps.
  Upper body: aim layer (raised vs low-ready, sprint carry, reload with off-hand to the mag, recoil spring,
  blind fire), spine/head look-at, breathing, sway, accel/turn lean, hit react (`rig.hit`). Two-bone IK puts
  hands on the weapon's `grip`/`foregrip` (weapons.json) and feet on the gait targets. Emotes return an
  `FkPose` that is slerped over the result (fade in/out). Rigs beyond `ANIM_LOD_DISTANCE` (22 m) animate at
  half rate; `animate` is a no-op after `dispose` (and `GameState` ignores updates after `exit`).
- Weapons: `WeaponModel.hold(rig)` (hands IK'd to it) / `holster(rig)` (long guns on the back, pistol on the hip;
  one per holster). Deaths: `Ragdoll` = 5 Havok bodies (torso, legs, arms) with ball-and-socket joints at hips
  and shoulders, limbs never collide with their own torso, capped by `BUDGET.maxRagdolls`.

## Movement and camera
- All feel constants live in `config/movement.ts` (`MOVEMENT`, live-tunable in the debug overlay's Tune panel):
  walk 1.4, jog 3.5, sprint 5.5, crouch 1.2, ADS 1.0, cover 1.3 m/s; stick < `walkBand` walks, above jogs.
- `player/movement.ts` (pure): `targetSpeed`, `EasedVelocity` (critically damped per axis: eased starts and
  stops, no overshoot), `SprintGate` (wind-up before full speed, recovery before fire/ADS), `RollGate` (fixed
  0.6 s roll, recovery, cooldown). `PlayerController.weaponBlocked` gates firing/ADS. Jump is modest (0.45 m),
  air control minimal. The controller follows the eased velocity exactly (`cc.acceleration = 1`).
- `PlayerController.override` lets cover drive a step (velocity + facing + crouch, or a kinematic feet path).
- Camera: critically damped follow (`camFollow`), shoulder swap and ADS springs; render interpolation unchanged.

## Cover (`src/cover`)
- `buildCoverSegments(boxes, cylinders)` (called by `LevelBuilder.build`) makes a face per side of every upright,
  visible, colliding piece >= 0.75 m tall: low (0.75-1.45 m, crouch) or high (>= 1.6 m, standing); pillars become
  octagons. Faces carry outward normals, depth and outside-corner links. AI cover points
  (`level.cover`) are sampled from the same faces; enemies peek past the nearest edge of high cover.
- Run-time probing (raycasts) re-checks the real cover height (stacked crates, slopes), the snap point (floor,
  clear path), inside corners/narrow gaps, vault landing, corner swings and that the surface still exists.
- `CoverStateMachine`: none -> enter (250 ms eased) -> in <-> peek (aim) / blind (fire without aim) / corner
  (hold against an outside edge) ; vault (jump at clear low cover) ; dash (setting) ; exits on cover/crouch,
  sprint, roll, jump at high cover, backing away, lost surface, death.
- `CoverController` (player): standoff `COVER_STANDOFF` (capsule radius + 5 cm, > body depth); strafes along
  the tangent with predictive braking at edges; low cover peek stands up; high cover peek leans out past the
  edge and moves the camera to that shoulder (restored after); blind fire = spread x3 and minimal exposure.
  Exposure is physical: the hit capsule follows the controller (crouch lowers it 0.65 m).
- Input: action `cover` = touch contextual button, controller B-hold (`COVER_HOLD` 0.28 s; B tap stays
  crouch/roll; B in cover leaves), keyboard C (crouch moved to Ctrl). Settings: `gameplay.autoCover`,
  `gameplay.coverDash`. HUD: `hud.setCover(prompt, state)`.

## Debug overlay
- F3 / 3-finger tap. Buttons: Skeleton (bones, controller capsules, hit volumes as lines; things register in
  `ui/debugVolumes.ts`) and Tune (sliders bound to `MOVEMENT`).

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
- Enemy brains (`ai/enemy.ts`) think at ~4 Hz (LOS raycasts staggered) and act every fixed step.
- `EnemyManager` caps alive enemies (10) and ragdolls (`BUDGET.maxRagdolls`).
- Modes implement `GameMode` (`game/modes/`); `GameState` owns world, player, combat, AI, pickups,
  interactables and calls mode hooks. `GameState.endSession` shows results; `GameState.rewardHook` lets
  progression add rewards.
- `?autostart=<mapId>&mode=<sandbox|wave|mission>` boots straight into a match (dev/tests).

## Coop (`src/net`)
- Entry: `main.ts` registers the Co-op menu entry and `?room=CODE` handling; both `import('./net/coopUi')`.
  `CoopApi` (startGame/goToMenu/profile) is how net talks back to the shell. Never import `src/net` statically.
- `Transport` (`transport.ts`): `send(msg, to?)`, `onMessage/onPeerJoin/onPeerLeave`. `trysteroTransport`
  (WebRTC, Nostr signalling, room `ss-<code>`) or `localTransport` (BroadcastChannel, `?net=local`, for tests).
- `protocol.ts`: every inbound message goes through `parseMessage` (shape, clamps, string sanitising, caps).
  Add a message: type in `Msg`, case in `parseMessage`, a test in `tests/net.test.ts`.
- `NetSession`: lobby state, ready/start, routing. Clients accept authoritative messages (lobby/start/snap/
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
- `app.quality` (QualityManager) applies `QUALITY_LEVELS` to engine scaling and to the current state if it
  implements `applyQuality(level, userShadows)` (GameState does). Frame samples only while simulating.
- `node scripts/perf.mjs` prints CPU ms per fixed step, heap churn and draw calls for a 10-enemy fight.
  Hot paths must not allocate per step (no generators/closures/temporary vectors in AI/nav loops).

## Performance budget (mid-range phone, 60fps)
- Draw calls < 120 in combat. Static level geometry uses thin instances, `freezeWorldMatrix()`, frozen materials.
- Dynamic physics bodies capped (see `physics/budget`). Projectiles/effects pooled, never allocated per shot.
- Render scale: DPR capped at 1.5, then adaptive quality scales further.
- Avoid per-frame allocations in hot paths: reuse `Vector3` temporaries.

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
