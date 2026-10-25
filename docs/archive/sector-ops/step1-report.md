# Slice 2 step 1 - report (implementer, 2026-10-19)

Pure logic, AI and save for the 3-section Sector Ops (M7). The mode, the map and the geometry are unchanged apart from
the minimal edits that keep them compiling and playable (below). Step 2 wires the rest.

## Built
- `src/game/sectors.ts` (pure, Babylon-free):
  - Types: `Pose`, `PlanBox`, `SectorZone`, `ConnectorDef` (label, box, floorY, optional `nearDoor` / `farDoor` door
    ids, optional `nearAt` [x, z] near-doorway centre, `checkpoint` pose), `SectorDef` (`connector?` on every section
    but the last, `extract?` on the last; `objective`, `guards`, `reinforce`, `start` kept). `exit` is gone.
  - Helpers: `inZone(zone, x, y, z)` (replaces `inExit`), `inDoorway(connector, x, z)`, `exitZone(def)`,
    `checkSectors(defs)` (data check: connectors and the extraction in the right places).
  - `ConnectorMachine`: `locked -> open -> cycling -> sealed`. `open()` (objective done), `step(dt, input) -> number`
    (a bitmask, no allocation), `finish()`, `reset()`. Input (a reused `ConnectorInput`): `allInside`, `doorwayClear`.
    Events in order: `CONN_UNLOCK_NEAR` (the step after `open()`), `CONN_LOCK_NEAR | CONN_UNLOAD` (every living player
    inside for `connectorHold` and the doorway clear), `CONN_LOAD` (at `connectorLoadAt` into the cycle),
    `CONN_UNLOCK_FAR` (at `connectorCycle`, sealed). Leaving before the lock resets the hold; once cycling it runs out.
  - `SectorRun`: `index`, `phase` (`'objective' | 'connector' | 'extract' | 'done'`), `progress`, `downloading`,
    `alarm` (carried over, A3), `alarmAtStart`, `checkpoint` (a copy: section 1's start, then each sealed connector's
    checkpoint), `conn`. Methods: `current`, `next`, `objectiveDone()`, `download(dt)`, `step(dt, input)` (connector
    phase; on `CONN_UNLOCK_FAR` the run has already moved on), `extractStep(dt, allInside)`, `raiseAlarm() -> send`,
    `restartSection() -> owed events`.
  - `restartSection()`: objective, download, connector and the alarm go back to the section's start; the checkpoint
    stays. If the near door had unlocked it returns `CONN_LOCK_NEAR`. If a cycle is already running (near door locked
    behind the players) the cycle finishes first and the restart is of the next section: it returns the owed
    `CONN_LOAD | CONN_UNLOCK_FAR` (else a respawn would land outside a locked door).
  - `SECTOR`: `lives` removed (M7). New: `connectorHold` 1, `connectorCycle` 3, `connectorLoadAt` 1.5, `doorwayClear`
    (= `AIRLOCK_DOORWAY_CLEAR` 0.75, the course rule), `extractHold` 0.5 (the old exit hold), `maxAlive` 32,
    `syringes` per preset. `alarmStep`, `sectorResult`, `fmtTime` kept.
- `src/ai/enemyManager.ts`: `maxAlive` instance field (default `MAX_ALIVE` = 12; `spawn` checks it). `despawn(e)`: drops
  the guard from `enemies` / dog corpses, its bodies (`enemyId`, through `removeBody`, so `onBodyRemoved` fires and the
  carry / interactable go), its recon drone, its squad roster and silent mark, the alarm run, the flank, its
  flashlight, its cover; then `e.dispose()` (the same calls `clear` makes, for one guard). `despawnAll()` = `clear()`
  plus the last known position forgotten.
- Co-op: no change needed, no wire change. The host snapshot lists only live enemies and the bodies still lying; the
  client (`coopClient.onSnap`) disposes a puppet the host stops reporting after about 0.5 s (the stale sweep: no
  ragdoll, no kill event) and drops a kept ragdoll whose id leaves `bodies`. A despawned guard can stay visible on the
  client for about 0.5 s (behind locked doors during the cycle). `MAX_ENEMIES` is 32 = `SECTOR.maxAlive`.
- `src/save/sectorRecord.ts`: kv key `sector:ops`, `{ v: 1, ops: { [opId]: { done: DifficultyPreset[], best: {preset: s} } } }`
  sanitised on read (bad ids, presets and times dropped, 32 ops max). API: `loadSectorRecord`, `saveSectorRecord`,
  `sanitizeSectorRecord`, `markCompletedIn(entry, preset, time)`, `markCompleted(opId, preset, time)` (serialised
  read-modify-write), `starsOf(rec, opId)` and `starsFor(opId)` -> `boolean[4]` in DIFFICULTIES order.

## Minimal edits to keep the first cut compiling and playable
- `warehouseSectors.ts`: the first 3 sectors' `exit` became `connector` (same box, checkpoint = the next sector's
  start, no doors), the last one's became `extract`.
- `sectorMode.ts`: `exitStep` drives `run.step` (with `doorwayClear` always true: no connector rooms yet) or
  `run.extractStep`; only `CONN_UNLOCK_FAR` is acted on (starts the next sector). `lives` removed: both down respawns at
  the run's checkpoint, forever (step 2 calls `restartSection` and resets guards and devices). The mode still keeps its
  own `stage` (step 2 moves it to `run.alarm`).
- `scripts/e2e-sectorops.mjs`: reads `(s.connector ?? s.extract).box`, expects phase `connector` / `extract`, and sims
  4.5 s in a connector (1 s hold + 3 s cycle).

## Assumed decisions
- **A10 (syringes):** revive syringes per op by difficulty: rookie 3, normal 2, realistic 1, perfectionist 1
  (`SECTOR.syringes`). Co-op only; solo restarts the section. Undo: change the table (step 2 reads it).
- **A11 (stars record):** the difficulty stars live in a new kv key `sector:ops`, not in the profile: no profile shape
  change, so no SAVE_VERSION bump (the C9 precedent, `courseRecord.ts`). This differs from BRIEF M7's note ("bump
  SAVE_VERSION with a migration"): the job lead chose the kv precedent. Undo: move `ops` into the profile schema, bump
  SAVE_VERSION with a migration that reads `sector:ops`, and delete `src/save/sectorRecord.ts`.

## Tests
- Moved to `tests/` (Vitest only includes `tests/**/*.test.ts`; the first cut's `src/game/sectors.test.ts` never ran):
  - `tests/sectors.test.ts` (14): the connector machine's event order, the hold reset, the doorway-clear wait, finish /
    reset; 3 sections through 2 connectors to the extraction with the checkpoint moving; the alarm carried over;
    `restartSection` (alarm back to the section's start, checkpoint kept, any number of restarts, the near door
    relocked, a restart mid-cycle); zones, doorway, data check, alarm cap, Ghost, A10 / cap numbers, the Warehouse data.
  - `tests/sectorRecord.test.ts` (4): sanitising junk, marking and best time, stars order, kv read / write.
  - `tests/enemyManagerDespawn.test.ts` (3): a real `EnemyManager` on stub world and nav with stand-in guards (real
    guards need a scene): the cap (default 12, raised per instance), despawn of a live and a downed guard (lists,
    bodies, drone, squad, flank, flashlight), `despawnAll`.

## Results
- `npm run check`: pass (lint 0 errors, 41 existing warnings; 158 files, 1768 tests passed, 1 skipped; build ok).
- e2e (desktop, port 4191, `E2E_JOBS=2`, software GL): `smoke` ok (17 s), `e2e-sectorops` ok (58 s): the solo walk
  through all 4 first-cut sectors via 3 connectors and the extraction to a Ghost result, and the alarm / kill check.

## Open items for step 2
- Feed `doorwayClear` from `inDoorway(connector, feet)` for every player, apply the events to `Doors.setLocked` (near /
  far ids), unload with `despawnAll()` (or `despawn` per guard) and `CtDevices` off, load the next section's guards.
- A guard held in a takedown or as a hostage must be let go before `despawn` (not handled inside `despawn`).
- Set `enemyMgr.maxAlive = SECTOR.maxAlive` at the mode start; the e2e's `alive <= 12` check then changes.
- Move the mode's `stage` to `run.alarm` / `run.raiseAlarm()`; on both down call `run.restartSection()` and apply the
  returned events; co-op revives with `SECTOR.syringes[difficulty]`.
- Call `markCompleted(map.id, difficulty, time)` at the run's end (step 3 shows the stars).
