# Step 4 report - section 1 greybox (implementer)

2026-10-20. Branch `feature/warehouse-redesign`. Light checks only (tsc, ESLint, targeted Vitest). No e2e, no build: the
job lead runs them. SPEC.md and BRIEF.md untouched.

## Built
1. **A3 (N1)** `src/game/modes/sectorMode.ts`: `setPatrol` now gets `waits`, `faces`, `start`, `loop` like `infiltrationMode`.
2. **A2 (C1)** `src/game/sectorCheck.ts`: `longestIsolation` / `isolatedInTime` (build-time, may allocate; not in any frame path).
   Samples 0-180 s every 0.25 s; guards walk their routes at `speed` (the test passes `walkSpeed x 1.1`, the patrol pace of
   `ai/enemy.ts`, exported here as `CHECK_PATROL_PACE`) with `waits` / `wait` pauses; two points ping-pong, three or more
   loop; a guard with no route stands at its slot. Isolated = every other guard over 15 m away, on another floor, or with no
   clear eye-height line. Pass = 3 s in a row (12 samples). Extra: an optional `spot` makes only the moments with the guard
   within 1.6 m of its takedown spot count (`CHECK_SPOT`), so the takedown spot data means something. Section 1 passes with
   that stricter form (isolation at the spot: 5 to 180 s per guard). Sections 2 and 3 still pass the static branch unchanged.
3. **Section 1** to SPEC 5:
   - `warehouse.ts`: `WarehouseOpts.southBand` (default true). False skips the facade, windows, z -6 wall and hatch, the z -11 /
     -8.8 / x 6 walls and dispatch window, the dock / dispatch / workshop / corridor contents, three doors, dumpster / cabinet /
     yard props / lane zone, lamp rows z -15 and -9, the three floodlights, the roof walkway / pipe / rappel / pump house /
     fire walls and the fence. Kept: the deck pipe (W:398-399). The x -4 wall starts at z -6.
   - New `warehouseS1.ts`: `buildServiceS1` (5.2 - 5.3), `S1_ROOMS` (13), `S1_SWITCHES`, `S1_PICKUPS`, `S1_HIDESPOTS`,
     `S1_SPAWNS`, `S1_NAV_SEEDS`. A `plate()` helper splits slabs around their holes (deck, void floor, void roof, roof).
   - `warehouseOps.ts`: C2 and the old section 1 filler removed (the shrink-wrap loads, tool rack, parked pallet, crates and the
     second container are gone); `southBand: false`, `gapsX4: [[14, 15.1]]`; the layout drops the dock / dispatch / workshop /
     corridor rooms, filters spawns, props, pickups, hide spots and switches to z >= -6 (or x > -4 and z >= -8.8), drops
     `termB` and `extract`, adds S1's items and nav seeds. `OPS_DOORS.c2Near` is `[-14.5, -8.8]`.
   - `warehouseSectors.ts`: section 0 per 5.6 (start (-20, -24.6) yaw 0.5, DVR objective, connector C2, 8 guards in the sheet's
     order so `?sectorGuards=4` takes the gate officer, yard patrol, checker and CCTV operator, reinforcements at the gate,
     routes R1-R3); `cam-yard` / `cam-bay`; `laser-workshop` / `laser-deck`. Counts stay cameras 2/2/3, lasers 2/1/2.
   - A7 fallbacks: shutter W raised 1.5 m (crouch under it, a climb leg), workshop door an unlocked leaf.

## Sheet fixes and deviations (all of them)
- **cam-yard mount height 4.5 failed `validateSecurity` (SN04, 2.4-3.5 m)**: set to 3.5.
- **R1** crossed the E-lane crate (-11.4, -11.6) between (-9.2, -12.3) and (-14.5, -10): inserted (-10, -10). obj 12 and `climbs [2]` unchanged.
- **R2**: (a) the first leg to the drainpipe cut through the skip's footprint: inserted (-20.4, -19.6) after the start;
  (b) the leg (4.8, -15) -> (7.4, -16) clipped the cabinet: that point became (6.4, -16.5). Climbs recounted from the final
  list: `[2, 4, 6, 9, 11, 13, 15]`, obj 8. (The sheet's own R2 indices were correct for its list; they shift by one with the insert.)
- **R3**: (a) (2.6, -9.6) is inside the mess worktop's reach: now (2.6, -10.2); (b) the leg (2.5, -11.6) -> (4.4, -14.5) clipped the
  security door frame: inserted (4.4, -12.6), so obj is 16 (was 15); (c) the last leg to C2 clipped the near doorway frame:
  (-13.6, -9.4) became (-14.5, -9.6). Climbs `[7, 9, 10, 11]` unchanged (still correct).
- The thin sill and cap boxes of the two void openings are `noLedge` (a generated ledge on them failed `voxelFit`: 0.2 m
  slabs do not voxelise). They were never meant as ledges.
- Guard takedown spots (not in the sheet except two): gate (9, -22.4), yard patrol (-6.5, -19.9), checker (-11.2, -15.4), CCTV
  (2.6, -9.9), driver (-9.6, -9.6), smoker (-13.4, -20.5), clerk (-22.6, -7), office patrol (-7, -12.3).
- Guard kinds as the sheet: officer, runner, officer, officer, grunt, grunt, grunt, enforcer (no heavies, dogs or snipers).
- The isolation model measures the guard's real position at time t, not only at the spot, unless `spot` is passed (the
  test passes it).
- Rails: deck and catwalk rails are visual only and minimal (west deck edge, catwalk). Crane runway and girder are two visual boxes.
- Lights: every S1 lamp has a small box fixture (the sheet names none). Colours: green (0.5, 1, 0.6), blue (0.55, 0.7, 1).
- Not verified (needs a running game): the roof-hatch ladder top (5.0, 6.0, -14.0) against the roof hole edge, the deck / void
  nav layers (the seeds are the sheet's), and all the visual and light-meter claims.

## Files
Changed: `src/game/sectorCheck.ts`, `src/game/modes/sectorMode.ts`, `src/world/maps/warehouse.ts`, `warehouseOps.ts`,
`warehouseSectors.ts`, `tests/sectors.test.ts`, `tests/sectorStep3.test.ts`, `scripts/e2e-sectorops.mjs`.
New: `src/world/maps/warehouseS1.ts`, this report. (The new file and edited files keep CRLF like their neighbours.)

## Tests changed
- `sectors.test.ts`: M8 test is now static OR isolation in time at the spot (guard speeds from `ENEMIES` x `CHECK_PATROL_PACE`);
  new "M8 in time" unit test on synthetic worlds (post in view, wall, out of range, a walker that leaves range, ping-pong / loop);
  new section 1 test (start and spawns in the yard corner, DVR stand point free, 8 guards, first four kinds, no heavy / sniper /
  dog, old rooms gone, S1 rooms present, `termB` / `extract` gone); new "plain Warehouse unchanged" test (318 boxes, 14
  cylinders, 5 doors, captured from the old build; the box list was also byte-equal to the old build's).
- `sectorStep3.test.ts`: `SECTION_ROOMS[0]` reads `S1_ROOMS`.
- Everything else (sectors counts, spawn distance, routes, connector doors, devices 2/2/3 and 2/1/2, rooms) holds as is.
- `e2e-sectorops.mjs`: only the optional `s1-start` shot moved to (-20, 0, -24.6). Everything else is data-driven (start,
  routes, objective, guard count, connector) and unchanged: nav-leg, seal and reach checks keep full strength. I could not run
  it. Offline proxies I ran (scratch tests, deleted): every non-climb route leg has a 0.25 m grid path (radius 0.32) with no
  big detour; a "suppressed shot" spot exists for the M9 check (320 candidate cells, mostly in section 2's south-west);
  route points are clear of geometry.

## Results (light checks)
- `npx tsc --noEmit`: clean.
- ESLint on all changed ts files: clean (`scripts/` is ignored by the config).
- Vitest: `sectors`, `sectorStep3`, `rooms`, `sectorRestart`, `sectorRecord`, `voxelFit` (found and fixed the sill ledge),
  `camSpaces`, `detailPass`, `guardInfo`, `jammer`, `lampBake`, `losParity`, `missions`, `scanners`: all green.
- Not run: `npm run check`, build, e2e (`e2e-sectorops` and the suites `run-e2e` maps to the changed files).

## Engine questions from SPEC 6 (by reading code only)
- **Climb up through a hatch into the 1.6 m void**: ledge generation (`anchors.ts`) needs only 0.35 m free above a lip
  (`LEDGE.clearAbove`) and 1.9 m minimum drop; it never checks standing room. So a hatch rim gets a climb-up ledge. Whether the
  climb animation's end pose copes with a 1.6 m ceiling (stand height 1.75, crouch 1.15; I found no stand-up ceiling check)
  needs a playtest. The 1.3 m openings are above the 1.15 m crouch, so a crawl fits.
- **Camera with 1.3 m openings (L7)**: not answerable from code in the time; `player/cameraBounds.ts` is the place; playtest.
- **Perimeter wall tops stay unreachable**: the perimeter is a plain 6.0 m box (1 m thick), so its top generates lips. In section
  1 the west and east tops are covered by 1.5 m gable parapets (noLedge); the south perimeter top is 8 m from any climb start.
  Nothing in the sheet reaches 6.0 m there solo; the two-person rope and the pump house boost (4.3 m) are the only candidates
  near the east side: x 24 is 2.2 m east of the pump house roof's edge, so no.
- **Guards walk at `walkSpeed x 1.1`** on a plain route (`PATROL_PACE`, `enemy.ts:133`), x 1.0 on a timed loop; `loop` is
  unused by section 1 (only `waits`, `faces`).
- Nav ignores `overhead` boxes as floor blockers (`navBuild.ts`), so lintels, bands, slabs and the roof are marked overhead; the
  void walls and deck-side upper walls are not (they must block the deck layer).

## What Michael should try
Menu: Sector Ops, Warehouse (version label from the orchestrator). Start in the yard's south-west corner.
- Walk the ground route: under shutter W (crouch), the bay, reception, corridor, security (hold 10 s for the DVR), back out the
  corridor's west door to the lobby.
- The high route: drainpipe at x -22.4 beside the skip, roof, hatch at x 5 down to the plant deck, drop through the security
  hatch; back up via the cabinet; west across the roof and drop through the smoke vent onto the lobby roof, then to C2.
- The service route: lane behind the trailer, the workshop door (x 11), east ladder (x 23.5) to the catwalk, west into the void
  (crawl), drop through the mess hatch (the CCTV operator's kettle).
- Judge: the 1.5 m crawl under the shutter, the void climb-ins, whether the guards' timed gaps give a clean takedown, light
  and shadow in the yard and bay (untested), the workshop beam and the deck beam.

## Draft STATE Done line
2026-10-20 step 4: section 1 greybox built to SPEC 5 (`warehouseS1.ts`, `southBand` switch, 8 guards, A2 isolation-in-time
check, A3 patrol waits and faces in the sector mode); tsc, ESLint and targeted Vitest green; e2e-sectorops, `npm run check`
and the PC perf run pending.

## Fix round
Light checks only (no e2e run here; the job lead reruns e2e-sectorops).

1. **e2e-sectorops "section 1 (service): the download opens the connector" (blocking).**
   - Cause (by code reading, not reproduced): the test stands the player 0.9 m east of the DVR (4.85, -15.0). There a
     closed door (office door at x 4.5, z -13.8) was 1.25 m away, under the door-set reach (1.6 m), and CCTV guard 4 (in the
     first four) started 1.2 m away, inside the takedown reach (1.8 m). Either puts several rows in the A context menu
     (`gameState.contextMenuStep`), so the tap on A did not run the DVR's "Start the download".
   - Fix (map data, test unchanged): the DVR moved to (3.95, 0, -16.0) on the same desk (stand point (4.85, -16.0): 2.2 m
     from the door, 2.8 m from the guard); guard 4 starts at (7.3, -17.2) in the office's south-east corner (its route's
     first point moved with it; the corridor and mess legs are unchanged); the three routes' DVR point (4.8, -15) became
     (4.8, -16). New Vitest asserts: no door hinge within 1.6 m and no first-four guard within 1.8 m of the e2e stand point.
   - Files: `src/world/maps/warehouseSectors.ts`, `tests/sectors.test.ts`.
2. **Security cabinet (check item 1).** Cabinet now `block(6.45, -15.4, 0.9, 1.2, 0.5)`: centred under the hatch (x 6.0 - 6.9),
   top 1.2, so 1.8 m of stand height to the 3.0 slab underside. R2's drop point (6.45, -15.4, inside the cabinet) became
   (6.45, -16.3). Not verified: whether the engine's hang-and-climb gets from the cabinet onto the deck lip (2.1 m above
   the cabinet top; wall-jump reach is 3.8 m) - needs a playtest; if it fails A7 applies (drop-only hatch). Files:
   `warehouseS1.ts`, `warehouseSectors.ts`.
3. **Base roof strips (check item 3).** `warehouse.ts`: when `southBand` is false the strips at z -18 and z -12 are skipped
   (`continue`), so nothing sits on S1's roof at 6.0. The plain Warehouse keeps its test (318 boxes, 14 cylinders, 5 doors).
4. **Guard 8 phase window (check item 2).**
   - Cause: its west end (-7, -12.3) sits in the bay's line of sight through the west doorway, and in the CCTV operator's
     corridor line.
   - Fix: the patrol starts at and is taken at the east end: route (7, -12.3) -> (-7, -12.3), post (7, -12.3), spot
     (7, -12.3), faces swapped (the east end is hidden from the bay and, by the office walls, from the monitors and the mess).
     Waits unchanged. Worst isolation over 40 random phase sets went from 0 s to 7.25 s.
   - Test: "section 1 A2 survives patrol phase drift" (30 random start phases of every guard through
     `worstIsolationOverPhases`, every statically-seen guard keeps >= 3 s). Result: all eight pass (worst 4.25 s).
   - Files: `warehouseSectors.ts`, `sectorCheck.ts`, `tests/sectors.test.ts`.
5. **Time model (check item 4).** `sectorCheck.ts`: default pause is `PATROL.wait`; `start` and `loop` are honoured (start sets
   the initial cycle offset; loop pauses until the planned loop time); `CHECK_FLOOR` = 2 m for "another floor" (time model
   only; the static spot check keeps 6 m); `longestIsolation` takes per-guard start phases. Test added for each (default
   pause, start, floor). Sections 1 to 3 still pass.

Results: `npx tsc --noEmit` clean; ESLint clean on the changed files; `npx vitest run tests/sectors.test.ts
tests/sectorStep3.test.ts tests/rooms.test.ts tests/voxelFit.test.ts`: 44 passed.
