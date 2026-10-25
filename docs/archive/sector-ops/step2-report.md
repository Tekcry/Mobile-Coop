# Slice 2 step 2 - report (implementer, 2026-10-19)

The Warehouse in three sections (A12, M7) with connector rooms, re-laid for M8 (routes, pockets, out-of-sight
takedowns). Code done; `tsc`, lint and the targeted Vitest files pass. **Not run** (the desktop heavy.lock is CT Core's,
job lead's order): `npm run check`, every e2e suite, the screenshots. They go to the laptop runner.

## Built
- **Geometry** (`src/world/maps/warehouse.ts`): `buildWarehouse(b, opts = {})` with `WarehouseOpts` (gap lists for the
  x -4, z -6, z -8.8 and z 12 walls, `hatch`, `corridorDoor`, `officeSwing`, `officeDesk`, `extra`). The plain
  Warehouse calls it with `{}`. Proven identical: a scratch Vitest built HEAD's `warehouse.ts` and the new one and
  compared boxes, cylinders, anchors, surfaces and the layout JSON (all equal).
- **`warehouseOps.ts`**: seals (x -4 gaps kept only dock-dispatch, dock-corridor and the new C3 door; z -6 only the C2
  far door, hatch window gone; z -8.8 solid, corridor door gone; office door swings onto the floor; a doorway from the
  manager's office onto the floor). `opsPieces` adds:
  - C2: vestibule walls x -16 / -13, z -9 / -6; near door (-15.05, -9) swings into the dock, far door (-15.05, -6) into
    the racking; both locked, not breachable.
  - C3: near door (-4, 14) swings into the racking; the office desk moved to (-2.2, 17.4) (it blocked the new door).
  - Section 1 pockets: a shrink-wrap row splitting the dock (-13.4, -15.6) and a stack north of the forklift (-9, -11),
    a tool rack splitting the workshop (15, -16.3), two corridor pallets (17, -10.35) and (6, -9.4) (a chicane), a
    second container in the east lot (18.5, -24.6), a crate closing the lane behind the trailer cab (3.2, -24.9).
  - Section 2: ladders (-20.5, -4.25) and (-8.5, 16.65); three planks at z 11 joining the four rack tops (y 2.8,
    overhead); loads closing the cross aisle at x -18.5 and -10.5 (four dead-end aisle halves); chicanes in the west
    aisle (z -0.2 / 1.6) and the centre aisle (z 11.6 / 13.4); stacks at (-23.5, 5.2) and (-6.6, 9.6).
  - Section 3: a stores cage (x -4..4.1, z -8.8..-2.5, door gaps), a plant room = the freight lift (x 16..24,
    z -8.8..-2, one doorway z -8.5..-7.4), a wall at x 10 (z -2..7, gap 1.6..2.7), a short wall z 3 (x -4..1.5), shelves
    (9.5, 9) and (19, 3.8), crates under the zipline gap (12, 11.2: a climb onto the deck), deck crates (13.2, 16.4),
    (13.2, 12.9), (20.2, 15.6).
  - Nav seeds per section, C2, C3, the deck and the manager's office.
- **Data** (`warehouseSectors.ts`): 3 sections with `connector` (box, `nearAt`, `farAt`, `sealUnlocks`, checkpoint) /
  `extract`, guards with `takedownSpot`, 3 named `routes` each (`obj` index, `climbs` legs), `reinforce` points,
  `perStage`. Cameras and lasers tagged `section`.
- **Types** (`sectors.ts`): `SectorGuard`, `SectorRoute`, `RoutePt`; `ConnectorDef` takes door centres (`nearAt`,
  `farAt`, `sealUnlocks`) instead of ids; `SectorDef.reinforce` is a list, `perStage` per section;
  `alarmStep(stage, perStage)`, `raiseAlarm` uses the section's.
- **Check module** (`src/game/sectorCheck.ts`, pure): `SightWorld` (eye-height segment tests through the level's
  collide boxes and cylinders; doors, windows, fences count as open), `guardPoints`, `distToGuard`, `spotSeenBy`.
- **Devices** (`ctDevices.ts`): `setLive(section)` (other sections' cameras off and blind, lasers dark and harmless, not
  jam targets; `-1` none), `live(id)`, `liveSection`; client `apply` respects it. Host authority unchanged; no wire change.
- **Mode** (`sectorMode.ts`): `maxAlive = SECTOR.maxAlive` (restored on dispose); doors found by position, every door
  into a later section locked at start (course pattern: `setLocked`, `setOpen(false)`, the `door-<id>` item disabled);
  `ConnectorMachine` driven with `allInside` and `doorwayClear` (`inDoorway` of the near door, every living player);
  events: unlock near / lock near / unload (takedown reset, `despawnAll`, devices off) / load the next section
  (unaware, on routes, devices on) / unlock far (opens quietly, side doors unlock, banner, checkpoint). Alarm from
  `run.alarm` (guard alarms and camera alarms), reinforcements from the section's points. No lives: everyone down ->
  2.5 s -> `restartSection` (owed door events applied, guards despawned and respawned, objective reset, devices on,
  `scheduleRespawn` at the checkpoint, banner "Restarting from checkpoint"; tallies kept). Extraction unchanged
  (no stars record yet). HUD "Section i/3", "Alarm a/3" (rebuilt only on change). No per-tick closures or `.some`.
- **Flag**: `?sectorGuards=N` (`flags.sectorGuards`). **Briefing** and the menu line say "section".

## Numbers
| Section | Guards | perStage | Cameras | Lasers | Exit |
| --- | --- | --- | --- | --- | --- |
| 1 Service entrance (start -14.5, -24) | 10 | 2 | cam-dock (-14.5, -17.6), cam-workshop | corridor x 12.5, x 16 | C2 box [-15.75, -8.75, -13.25, -6.25], checkpoint (-14.5, -7.2) |
| 2 Racking aisles | 10 | 2 | cam-rack-sw (-23.6, -5.6), cam-rack-ne (-4.4, 17.6) | north aisle x -12.5 | C3 box [-3.6, 12.4, 1.6, 17.6], checkpoint (-1.2, 14.8) |
| 3 Factory floor | 11 | 3 | cam-floor, cam-stairs (23.6, 11.6), cam-mezz | deck stairs top, deck west (ladder + crate climb) | extract [21.4, -8.5, 23.7, -5.2] |

Objectives: download at the workshop terminal (22.6, -16.6); grab the case (-22.8, 14.5); hack on the deck (14.6, 2.6,
17.6). Live cap: 11 + 3 x 3 = 20 at most (cap 32).

## M8: routes and takedown spots
Routes (each: start -> objective -> exit; climb legs are skipped by the nav check):
- S1: Dock and corridor; Yard, workshop door, out through dispatch; Roof walkway (drainpipe, rappel, dispatch window), out the workshop window.
- S2: West aisle (chicane); Centre aisle and the north aisle, out by the south and east aisles; Over the racks (ladder, cross-aisle hop, planks, ladder).
- S3: Floor and the stairs, down the zipline; Ladder to the deck, out along the pipe; Manager's office and the crates, down the stairs.

Takedown spots (Vitest `sectors.test.ts`: from each spot no other guard's post or route point within 15 m has an
eye-height line; all pass):
| Section | Guard (post / route) | Spot | Pass |
| --- | --- | --- | --- |
| 1 | yard lane behind container | [6, -25] | yes |
| 1 | yard lane behind trailer | [-6.5, -25] | yes |
| 1 | gatehouse post | [23.5, -21.5] | yes |
| 1 | dock west bay | [-21, -13] | yes |
| 1 | dock east roller door (heavy) | [-8, -15.5] | yes |
| 1 | dock NE by the corridor | [-11, -7.5] | yes |
| 1 | dispatch (officer) | [2.5, -16.5] | yes |
| 1 | workshop west (enforcer) | [11.5, -17.5] (fix round 2) | yes |
| 1 | workshop east, terminal end | [20, -16] (fix round 2) | yes |
| 1 | corridor east | [18.5, -10] | yes |
| 2 | west aisle south | [-22, -3] | yes |
| 2 | west aisle north (the case) | [-22, 13] | yes |
| 2 | aisle -18.5 south / north | [-18.5, -3.5] / [-18.5, 7.5] | yes |
| 2 | centre aisle north | [-14.5, 7] | yes |
| 2 | aisle -10.5 south / north | [-10.5, -3.5] / [-10.5, 7.5] | yes |
| 2 | east aisle south / north | [-6.5, -3] / [-6, 11] | yes |
| 2 | north aisle (officer) | [-14.5, 16.5] | yes |
| 3 | stores cage (officer) | [1.5, -7.5] | yes |
| 3 | plant room | [18.5, -5.5] | yes |
| 3 | south bay | [7.5, -8] | yes |
| 3 | west bay south / north | [-2.5, -1] / [-3, 4.5] | yes |
| 3 | east wall (heavy) | [23, 0.5] | yes |
| 3 | north strip | [16, 10.5] | yes |
| 3 | deck west | [12, 14] | yes |
| 3 | deck terminal (enforcer) | [15.5, 17] | yes |
| 3 | sniper | [22.5, 16.5] | yes |
| 3 | manager's office (heavy) | [6.5, 12.5] | yes |

The guard set was chosen with a scratch search (every candidate's spots and who sees them, then the largest set where
all have a spot; scratchpad `design/`, not in the repo).

## Assumed decisions (A13+)
- **A13 (guard counts):** 10 / 10 / 11, not 18-24: M8's rule (each guard takedown-able out of every other's sight
  within 15 m) does not fit more in these rooms, even with the added pockets. Room comes first (M8). Undo: add slots in
  `warehouseSectors.ts` (the Vitest check shows which spots break), or add cover.
- **A14 (M8 pockets):** placeholder walls, loads, chicanes and rooms listed above, by eye. Undo: `opsPieces` in
  `warehouseOps.ts`.
- **A15 (no dog):** a dog beside its handler shares his pocket (fails M8), and a lone dog without a squad is untested.
  Undo: a `dog` slot in section 1's data.
- **A16 (one door into the plant room):** its north gap let the floor see into it. Undo: the `wallX(-2, ...)` gaps.
- **A17 (door finds):** `ConnectorDef` uses door centres (`nearAt`, `farAt`, `sealUnlocks`) instead of door ids.
- **A18 (shots as JPEG):** the optional shots save `.jpg` (size). Undo: `type: 'png'` in the suite.
- **A19 (connector counts living players):** a downed co-op partner outside does not hold the cycle (step 1's rule);
  step 3 decides with the syringes.

## Tests changed
- `tests/sectors.test.ts`: helpers for the new shape; per-section `perStage` in `alarmStep`; a new block: 3 sections,
  each objective kind once, counts rise or hold, starts = previous checkpoints, cap holds guards + reinforcements;
  every slot >= 7 m from its start; >= 2 routes from the start past the objective into the exit; the M8 takedown check;
  devices per section (2/2/3 cameras, 2/1/2 lasers, `validateSecurity`); a door at every connector doorway, checkpoints
  inside, clear of the doorway.
- `scripts/e2e-sectorops.mjs` (written, **not run**): the walk through 3 sections with `?sectorGuards=4` (near door
  locked, objective unlocks it, cycle locks it and unloads guards, bodies and devices, next section's 4 guards with new
  ids, far and side doors unlocked, checkpoint moved, only live cameras on) to the extraction and GHOST; the alarm check;
  the restart check (down in section 2: restart at C2, guards reset, objective open, alarm 0, near door locked); the nav
  check (every non-climb route leg has a path without a wild detour, objective and exit reachable, the next section
  reached only through the connector box); `SECTOR_SHOTS=<dir>` layout shots.

## Results
- `npx tsc --noEmit`: clean. ESLint on the changed files: clean.
- `npx vitest run tests/sectors.test.ts tests/rooms.test.ts`: 31 passed (rooms caught the moved desk on an enemy spawn;
  fixed). Also passed earlier: net, sectorRecord, jammer, losParity, enemyManagerDespawn.
- **Pending (laptop runner):** `npm run check`; `npm run build`; `e2e:quick`; `e2e-sectorops`; the plain-Warehouse
  suites; the three shots (`SECTOR_SHOTS=docs/sector-ops/shots node scripts/run-e2e.mjs e2e-sectorops`).

## Likely first-run risks (for the fix round)
- Nav legs may fail where a waypoint sits tight to a piece (0.3-0.5 m margins in places) or on rack tops / the deck
  (layer pick): the suite prints each failing leg.
- The `cams ... mode === 'off'` assert assumes `setLive` shows non-live cameras as `off`.
- The shot camera pitch sign is a guess.

## What Michael should try
`?autostart=warehouseOps&mode=sector`: each section's three routes; the rack-top planks; the chicanes; the manager's
office door onto the floor and the crate climb under the zipline; standing in C2 / C3 (door shuts, next section loads);
going down in a section (restart at the room). `&sectorGuards=4` for a quiet run.

## Open items
- Co-op (step 3): the client's devices by section (send `liveSection`), seized guards released before an unload, the
  syringes, downed partners and the cycle, door locks on the client.
- Stars record at the extraction (step 3). Perf with the full counts: pending PC run.
- A camera shot out stays broken after a restart.

## Polish list (cosmetic)
- Placeholder boxes everywhere new; the C2 near door's leaf swings close to the forklift mast; the deck crate chicane
  is tight; camera placements by eye.

## Fix round (2026-10-19, after the laptop run of 878b304a)
The laptop ran `npm run check` (only unrelated unit timeouts failed), smoke, e2e-levels, e2e-anchors, e2e-lightbake,
e2e-menus and e2e-park (all passed), and e2e-sectorops, which failed twice at C2:
1. **"section 2 starts at the connector" failed:** the test was too short, not the mode. The cycle starts once the
   1 s hold is met and runs `SECTOR.connectorCycle` (3 s) to UNLOCK_FAR, so about 4 s after the teleport. The suite
   simmed 1.3 + 2.2 = 3.5 s; the debug output shows LOAD had fired (`live: 1`, still `cycling`). Fix: `sim(3.2)` after the
   cycle check (4.5 s in all), in `scripts/e2e-sectorops.mjs`.
2. **No nav path through C2 (6 legs at x -14.5):** both C2 doorways were 1.1 m gaps at x -15.05..-13.95. The nav grid's
   0.5 m cells fall at x -14.75 and -14.25 there, each 0.30 m from a gap edge, under the agent radius 0.32, so neither
   cell was walkable. The Warehouse's own 1.1 m gaps happen to line up with the cells; this one did not. Fix: both C2
   gaps are 1.2 m (x -15.1..-13.9; cells 0.35 m clear), the doors are 1.2 m wide, and the doorway centres stay
   (-14.5, -9) / (-14.5, -6). Every other new gap has at least one cell 0.35 m or more from both edges.
- Light checks: `tsc` is clean; `vitest tests/sectors.test.ts tests/rooms.test.ts` gives 31 passed (the M8 sight check
  still passes with the wider doorways). e2e-sectorops still has to be re-run on the runner.

## Fix round 2 (2026-10-19, after the laptop run of e20c3f30)
The laptop run: check passes; in e2e-sectorops the ghost walk, the alarm and the restart pass, and all 163 route legs
have paths. One assert failed: "a section is reached only through its connector" (`via: false` for both pairs).
- **Cause: a test flaw, not a leak.** `NavGrid.findPath` returns waypoints as `[x, z]` pairs, but the suite read
  `w.x` / `w.z`. Those were undefined, so the box test never matched (always false). The detour test had the same bug
  and could never fail.
- **Leak check (light, node):** a scratch Vitest built an analytic layered nav grid of `warehouseOps`, the way
  `tests/bunkerMap.test.ts` does it (every collide piece's top a surface, the same blockers, `navLinks` with ladders
  and the generated ledge drops). The shortest paths go yard -> dock -> C2 -> racking, and C2 -> racking -> C3 ->
  ladder -> deck. With the connector box blocked, no path remains for either pair. No leak.
- **Suite fix** (`scripts/e2e-sectorops.mjs`): waypoints are read as `w[0]` / `w[1]`. The seal check is now the
  stronger test: a path from section i's start to section i+1's objective must exist. Then every nav cell (every layer)
  in connector i's box plus 0.2 m is set unwalkable and the query is repeated: no path may remain (a leak prints the
  path). The cells are restored after.
- **Detours, which the old check could not see:** the analytic grid found 9 legs with long detours at 3 pinch points
  narrower than the nav agent (radius 0.32, 0.5 m cells). Fixed in `warehouseOps.ts`:
  - the workshop tool rack now ends at z -15.6 (`block(15, -16.8, 0.6, 2.6, 2.4)`). With the bench it had cut the
    workshop in two for the guards' nav.
  - the centre-aisle chicane's north load moved to z 13.6 (the S-bend gap is 0.9 -> 1.1 m).
  - shelf D on the floor is shorter (`block(9.5, 8.8, 0.8, 2.6, 3.6)`), so the lane under the deck front is 1.4 m.

  After these, the analytic grid shows no detour and no missing leg.
- **M8:** the shorter tool rack moved two section 1 takedown spots: the workshop west guard to [11.5, -17.5] and the
  workshop east guard to [20, -16] (found with the scratch search). Counts stay 10 / 10 / 11.
- **Light checks:** `tsc` is clean; `vitest tests/sectors.test.ts tests/rooms.test.ts` gives 31 passed (the M8 sight
  check included); `node --check` on the suite passes. e2e-sectorops still has to be re-run on the runner.
