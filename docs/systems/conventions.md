# Robustness rules, conventions and module layout
Purpose: robustness rules, code conventions and the full module table.
Design authority: docs/design-bible.md (Section 9). What the game is: docs/VISION.md and docs/DECISIONS.md.

## Robustness rules
- `startGame` calls `App.releaseState()` (exit + free the scene, and empty the engine's shader cache with
  `engine.releaseEffects()`) before `GameState.create`: two matches are never in memory at once. `goToMenu` releases
  too; `e2e-desktop` checks no `GameState` survives (CDP `queryObjects` after a GC).
- Crash log (`feedback/crashLog.ts`, `App.crashLog`): a heartbeat in `localStorage` (diagnostics, not a save: it is
  synchronous, so `pagehide` marks it clean before unload) every 5 s and on `stage(...)` (menu / loading / in a match /
  benchmark run) with `feedbackContext`; still `alive` at the next boot -> a "Crash report" feedback note + toast.
- `App` isolates state updates: an exception in `fixedUpdate` / `frameUpdate` is logged (rate-limited) and toasted
  once; input polling and menus keep running. `GameState` ignores updates after `exit()` (quit can happen mid-tick).
- `App` resizes the engine only once a window resize settles (`RESIZE_SETTLE_MS` 250), so dragging a window does not
  re-make every full-resolution target per step.
- Backgrounding (`visibilitychange` / `pagehide`): flush the save, suspend audio, pause single-player test modes
  (co-op opens the menu without pausing).
- `SaveManager.readOnly`: if the stored profile cannot be read (newer version, corrupt), play continues on an
  in-memory profile and nothing is written; an explicit import / reset backs the unreadable data up first.
- Release checklist (offline, save migration, controller): TESTING.md. Deploy steps: README and
  `docs/systems/deploy.md`.

## Conventions
- Files: camelCase `.ts`; one main class per file. Tests in `tests/*.test.ts`.
- Pure logic (maths, validation, migrations) stays free of Babylon and the DOM so it is unit-testable in node.
- Strict TS (`noUncheckedIndexedAccess`, `verbatimModuleSyntax`: `import type`). Babylon only through
  `src/core/babylon.ts`. Single player never imports `src/net` statically.
- Every job updates `CHANGELOG.md` (under "Unreleased" until Michael merges, G93), TESTING.md when the desktop
  checklist changes, and the system docs it touches.

## Hot paths
- Hot paths must not allocate (no closures, iterators or temporary vectors in AI / nav / anim loops; `for` with an
  index over arrays; typed-array heaps). Use `hyp2` / `hyp3` (`core/mathx.ts`), never `Math.hypot` (V8 allocates
  its arguments).

## Module layout (`src/`)
| Module | Responsibility |
| --- | --- |
| `core/` | `babylon.ts` import surface, engine creation, `GameLoop` (fixed 60 Hz sim + manual Havok step, `timeScale`, `onFrameEnd`), event bus, flags, settings, `legacy` (parked modes), `pacing`, `quality`, `governor`, `deviceTier`, `display` (pure parts), `mathx` (`hyp2` / `hyp3`) |
| `input/` | Action map; gamepad and keyboard / mouse sources write the same `InputState`; pad and key binds, conflicts |
| `ui/` | DOM overlay UI. `FocusNav` spatial navigation shared by every menu; screen stack; HUD; debug overlay |
| `game/` | Play session state; modes (Infiltration, Free Roam `sandbox`, the training course `course`; Hunter `clear` and Mission parked behind `?legacy=1`); damage / health, pickups, interactables, takedowns, gadgets, `tactics` and `roomClear` (pure), the course (`game/course/`) |
| `physics/` | Havok loading, collision groups, body budget |
| `player/` | Character controller (Havok `PhysicsCharacterController`), movement maths, traversal and the attached-state machine (pure), move state, proportions, the shared `CharacterRig`, camera |
| `anim/` | Pure animation: `MotionDriver`, clips, `Inertializer`, `AnimGraph`, `FootPlanner`, IK, the animation audit metrics |
| `cover/` | Cover data for enemy AI and level build (coverData, corners); back-to-wall reuses it |
| `weapons/` | Data-driven weapons, hitscan + pooled projectiles, recoil / spread, grenades, `WeaponCarry` |
| `ai/` | Enemy brains, grid navmesh + A*, `perception`, `alertState`, `patrol` (pure), archetypes, the enemy recon drone |
| `world/` | Level builder, map builders (`maps/`: Marlow Yard `ctcourse`, Saltmarsh Park `campusOps`, the old Sector Ops `warehouseOps`, Warehouse, Proving Grounds, Kestrel, the Fallow bunker, courselab, seclab; the 2.x maps parked in `maps/parked.ts`, not imported), rooms, anchors, doors, lights, light rig, surfaces, menu stage |
| `voxel/` | Light bakes (the folder name is history): lamp bake and light volume, moon / sky bake, canonical light shapes, the bake worker pool |
| `vfx/` | Pooled effects, post stack, TAAU, weather, vision looks |
| `security/` | The security system (cameras, panels), first built for Kestrel (paused, G53); Sector Ops and Marlow Yard use cameras and panels through `game/ctDevices.ts` |
| `editor/`, `dev/` | The Kestrel level editor (dev only, never in `dist/`) and its bridge |
| `net/` | Optional co-op: transports (Trystero / BroadcastChannel), protocol validation, session / lobby, host + client sims, lobby UI |
| `progression/`, `cosmetics/` | XP / levels / credits maths, unlocks, upgrades, suit / HQ; avatar catalogue and procedural camos (parked behind `?legacy=1`) |
| `save/`, `feedback/` | IndexedDB wrapper, versioned schema, migrations, export / import, course record; playtest notes and crash log |
| `audio/` | Audio engine, music score, movement foley and weapon sounds (CC0 recordings), synth fallbacks |
| `pwa/` | Service worker registration, fullscreen, gesture suppression |
| `config/` | JSON / TS content data (weapons, enemies, missions, unlock tables), `movement.ts` and `camera.ts` feel tables |
