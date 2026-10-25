# Step 4 check - section 1 greybox (fresh checker)

2026-10-20. Commit `5371c537` on `feature/warehouse-redesign`. Read-only review; light checks only (the job lead holds
the heavy lock for `npm run check` and e2e-sectorops).

## Verdict: PASS (no blocking item)
Section 1 is built to SPEC 5 and plays on data. The fix list below is ranked by impact; none of it makes the run
broken or unplayable. e2e-sectorops (nav legs, seals, reach) is the job lead's run and is not judged here.

## Commands and results
- `npx tsc --noEmit`: clean.
- `npx eslint` on the 8 changed ts files: clean.
- `npx vitest run tests/sectors.test.ts tests/sectorStep3.test.ts tests/voxelFit.test.ts tests/rooms.test.ts`: 4 files, 42 tests passed.
- Scratch probes (scratchpad only, deleted; no repo file touched):
  - Plain Warehouse: the old `warehouse.ts` (from `5371c537^`) and the new one built side by side. Boxes, cylinders,
    anchors, lights, the layout and the whole LevelBuilder serialise identically. Claim holds.
  - A2 per guard (section 1, longest isolation at the spot, in s): gate 5.0, yard patrol 5.0, checker 7.5, CCTV 7.75,
    driver 8.25, smoker 180 (static pass), clerk 15.25, office patrol 6.0. Six of the eight fail the static check and pass
    only on time, as the spec intends. The result holds at pace 1.0 and 1.3 (min 4.75 s).
  - A2 phase robustness: 40 random start phases per guard. All guards keep 4 s or more, except the office patrol: 0 s in
    18 of the 40 trials (fix 2).

## What holds
1. Michael's asks:
   - Ceilings and a real roof: the south rooms are under the plant-deck slab (3.0), the corridor and north rooms under
     the void floor (2.8), the lobby block has a slab at 3.2, the bay and workshop have a solid roof at 6.0 with parapets.
   - Doors are 1.2 x 2.1, shutters 4 x 4.5, windows 1.2 x 1.2 on a 0.9 sill. Every window has a job (transport and
     security face the yard, the goods-in office window faces the W lane).
   - Every wall has a job: facade, compartment walls, lobby block, office block.
   - All the old filler is gone (shrink-wrap rows, tool rack, parked pallet, second container, the C2 vestibule).
   - Three routes: R1 ground under shutter W, R2 high (drainpipe, roof, hatch), R3 service (lane, workshop, catwalk,
     void, mess hatch), plus the loud entries and the co-op lips.
   - Eight guards, each with a post or a patrol between real places. Kinds are officer, runner and grunt, one enforcer;
     the test asserts no heavy, sniper or dog.
2. A2: the schedule is correct for ping-pong (2 points), loop (3 or more), per-point waits and the closing leg. Doors are
   not in `SightWorld`, so the model is conservative. The spot gate (`CHECK_SPOT`) stops a guard passing on isolation
   far from its takedown spot. `sectorCheck` is imported only by tests: build/check time only. Sections 2 and 3 still pass
   the static branch. A3: the `setPatrol` call is identical to `infiltrationMode.ts:95`.
3. Run on data:
   - Connector box, near door (-14.5, -8.8) and far door (-14.5, -6) match the built doors.
   - The checkpoint equals section 2's start (asserted).
   - The lobby block and the 6 m walls at z -6, x -4 and z -8.8 seal C2. The parapets close the roof edges.
   - The DVR stand point is free; reinforcements are at the gate.
   - Climb indices check out against the final lists (leg i is pts[i] to pts[i+1]): R1 [2], R2 [2,4,6,9,11,13,15],
     R3 [7,9,10,11].
   - Co-op: four spawns within 1.5 m of the start, all free (asserted). Remotes spawn from `playerSpawns`
     (`coopHost.ts:271`).
4. The plain Warehouse is byte-identical (see the probe above).
5. Tests:
   - M8 is now "static OR in time at the spot", which is what A2 decides. The spot distance and the free-floor asserts
     are kept.
   - A new synthetic M8-in-time test covers the post, wall, range, walker and loop cases.
   - New tests for section 1 and the plain Warehouse.
   - `sectorStep3` reads `S1_ROOMS`.
   - e2e-sectorops: only the optional `s1-start` shot moved. The nav-leg, seal and reach asserts are unchanged.
6. Hard rules: no new per-frame allocation (the patrol object is built at spawn, as before). The added code uses no
   `Math.hypot` (the model uses `hyp2`). Babylon comes in only via `core/babylon`.

## Fix list (ranked by impact)
1. **The security cabinet is not under its hatch, so R2's climb back up likely fails.**
   - Problem: the hole is at x 6.0-6.9 and the cabinet at x 6.95-7.85 (`warehouseS1.ts`, `block(7.4, -15.4, 0.9, 1.3, 0.5)`,
     copied from SPEC 5.3). The cabinet top (1.3) has only 1.7 m under the deck slab (stand height 1.75), and the hole's
     lip can only be hung from inside the hole column.
   - Effect: R2 leg 9 (cabinet up to the deck) probably cannot be done. R2's way out still works on foot (corridor east
     door, workshop ladder, deck, roof hatch), so this is not blocking.
   - Done looks like: the cabinet centred under the hole (about x 6.45), or the hole moved over the cabinet. A playtest
     climbs from the cabinet onto the deck. If the engine cannot do the climb, A7 applies: the hatch is drop-only and R2's
     way out is rerouted through the workshop ladder, with the climbs recounted.
2. **A2 passes the office patrol only at the t = 0 phase.**
   - Problem: with random start phases, guard 8 has 0 s at its spot in 18 of 40 trials. The CCTV operator sees it along
     the corridor; the checker and the driver see it through the corridor west doorway, which the model treats as open.
   - Effect: in play the window comes and goes as patrols drift.
   - Done looks like: section 1's M8-in-time holds under phase offsets (for example the worst of N offsets, or all
     relative phases of each pair). The guard's data gets a robust window, for example the CCTV operator's corridor
     pause kept short or the spot moved off the corridor's sight line. The time model's doc comment says it assumes every
     guard starts at `route[0]` at t = 0.
3. **The base visual roof strips sit on top of section 1's solid roof.**
   - Problem: `warehouse.ts:372-375` builds the strips at y 6.025-6.275 for z -12 to -7.2 at full width, plus the z -18
     end pieces, just above S1's walkable roof at 6.0.
   - Effect: on the roof route the player's feet sink into a non-colliding slab.
   - Done looks like: the strips south of z -6 are skipped when `southBand` is false. The plain Warehouse probe stays
     identical.
4. **Time-model details drift from the game.**
   - Problems:
     - The default pause is 2.5 s; the game's is `PATROL.wait` = 9.
     - `start` and `loop` are ignored.
     - "Another floor" means more than 6 m apart, so a mezzanine guard at 2.6 m still counts as the same floor.
   - None of these changes a result today: every route has a `wait`, and none uses `start` or `loop`.
   - Done looks like: the default reads `PATROL.wait`, `start` sets the initial phase, the floor tolerance is about 2 m,
     and the unit test covers each.

## Polish
- Not verified (needs a running game, as the report says):
  - the roof-hatch ladder top against the hole edge
  - the deck and void nav layers
  - the camera in the 1.3-1.6 m void openings
  - the hatch climb-ups (A7)
  - the light pools and dark pockets
- The time model walks straight lines and ignores the 0.45 m arrival radius. Real A* legs through doors are slightly
  longer.
- The DVR is reachable from the yard window only just inside the 4 m range (about 3.9 m from z -18.3). Worth a walk-up
  in play.
- `longestIsolation` reports 180.25 s for a full horizon (it counts 721 samples). This is cosmetic.
