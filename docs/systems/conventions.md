# Robustness rules, conventions, module layout and project overview
Purpose: robustness rules, code conventions, the full module table and the project overview that used to open CLAUDE.md.
Design authority: docs/design-bible.md (Section 9)

## Robustness rules
- 3.1.5: `startGame` calls `App.releaseState()` (exit + free the scene) before `GameState.create`: two matches are
  never in memory at once (the iPhone closed the tab). Crash log (`feedback/crashLog.ts`, `App.crashLog`): a
  heartbeat in localStorage (diagnostics, not a save: synchronous, so `pagehide` marks it clean before unload) every
  5 s and on `stage(...)` (menu / loading / in a match / benchmark run) with `feedbackContext`; still `alive` at the
  next boot -> `crashNote` -> a "Crash report" feedback note + toast. 3.1.7: `releaseState` empties the engine's
  shader cache (`engine.releaseEffects()`: plugin materials' shaders held their scene, and so every old match;
  their keys never repeat) and `goToMenu` releases too; `e2e-desktop` checks no GameState survives (CDP
  `queryObjects` after a GC - release the object group, or the probe itself keeps them alive).
- `App` isolates state updates: an exception in `fixedUpdate`/`frameUpdate` is logged (rate-limited) and toasted
  once; input polling and menus keep running. `GameState` ignores updates after `exit()` (quit can happen mid-tick).
- 3.2.3: `App` resizes the engine only once a resize settles (`RESIZE_SETTLE_MS` 250): a phone turning fires several
  in-between sizes, each re-making every full-resolution target.
- Backgrounding (`visibilitychange`/`pagehide`): flush the save, suspend audio, pause single player (co-op opens
  the menu without pausing).
- `SaveManager.readOnly`: if the stored profile cannot be read (newer version, corrupt), play continues on an
  in-memory profile and nothing is written; an explicit import/reset backs the unreadable data up first.
- Release checklist (offline, migration, controller) is the Phase 10 section of TESTING.md; README has deploy steps.

## Conventions
- Files: camelCase `.ts`; one main class per file. Tests in `tests/*.test.ts`.
- Pure logic (maths, validation, migrations) stays free of Babylon/DOM so it is unit-testable in node.
- Every phase updates `CHANGELOG.md`, `TESTING.md`, and this file.

## Hot paths (from "Audio and quality")
- Hot paths must not allocate (no closures, iterators or temporary vectors in AI/nav/anim loops; `for` with an
  index over arrays; typed-array heaps). Use `hyp2`/`hyp3` (`core/mathx.ts`), never `Math.hypot` (V8 allocates
  its arguments).

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

## Project overview (the old CLAUDE.md introduction)

Silent But Deadly (renamed from Shoulder Strike in 2.2.0; internal ids keep the old name for compatibility:
IndexedDB `shoulder-strike`, export magic `shoulder-strike-save`, co-op app id). Third-person over-the-shoulder shooter
for PC and phones. Static web app (Vite + TypeScript + Babylon.js 9 + Havok), installable PWA, fully playable offline.
Hosted on GitHub Pages. Target (3.0): a gaming laptop (i9 HX, RTX 4090 Laptop 16 GB, 32 GB; built-in 2560 x 1600
240 Hz, external monitors up to 7680 x 2160 32:9 at 120 Hz); every device runs the same renderer (3.3: phones get
one fixed phone look, no graphics settings; 3.4: the light 2.x renderer on phones - the iPhone 17 Pro Max targets 60 fps at 75 - 100% of native 2868 x 1320). 3.0 scope: the Warehouse is the one playable map (every mode), Proving Grounds a plain
test range; the other maps are parked (`world/maps/parked.ts`, not imported, kept as in 2.3.0, no work on them). The platform (`core/platform.ts`) changes the UI and
input, and (3.3) phones take the phone look. 3.1: one preset ladder for PCs (Low .. Epic), Auto graphics per PC, a frame governor
in matches; graphics never change gameplay (3.1.9: the PvP look / FOV locks are gone - each player's own settings). A stealth operative that moves fluidly and responsively (still weighted) and fights from cover, Splinter Cell:
Blacklist style.
