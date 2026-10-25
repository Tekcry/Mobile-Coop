# Step T5 - geometry: The House, The Range, The Plot (Block B end step)

Model: implementer opus, checker opus. Deps: T4. No guards; one work lamp per bay.

## Read
- BAYS.md 7-70 (conventions), 493-569 (B7), 570-644 (B8), 645-735 (B9), 736-791 (element register), 831-852 (metrics)
- src/world/levelBuilder.ts 125-224, 226-404; src/world/maps/stairs.ts; src/world/maps/storey.ts (windows, walls on a storey)
- src/game/takedown.ts: grep `drop`, `inverted`, `below` (heights the drop / ledge pull need)
- The existing bunker files (pattern)

## Task (decisions)
1. `src/world/maps/bunkerDeep.ts`: B7, A7, B8, A8, B9, L9.
2. B7: the cavern shell (sprayed-concrete walls, 10 high, overhead roof slab), the house (two storeys at 0 and 3.2, roof
   6.4 with a 1.1 parapet and the roof hatch with a fixed ladder to the first floor), the annex (roof 3.2), house doors
   (front, back, side) and windows (two glazed, two open on the ground floor; the manager's window sill 4.1 over the
   annex roof), the water main `pipeH` at 4.6 on z 6, the rock-bolting bench (lip 3.0) with its plant ladder at z 30, the
   sandbag walls (1.0), the skip, three wall recesses, the store door (`locked: true`) on the east wall.
3. B8: firing line benches, kit lockers, lane stands, the penetration wall (a 0.05 plywood panel beside 0.2 block), two
   barrel props (positions exported for T7a), the lamp gantry, the shoot-house barricades (1.0 and 2.0), the catwalk at
   4.0 with its ladder at x 9 and the tower cabin, the catwalk stair at the east end behind a door locked from below
   (bolt gate), the sniper scaffold 3.0.
4. B9: plot floor, map table (0.9), plotting stands, balcony B-1 at 4.5 (west, south, east; 3 m deep) with cabins, B-2 at
   9.0 (west, east), the bridge at 9.0, two enclosed stairs (SW, SE; 0 -> 4.5 -> 9.0), balustrades 1.1 everywhere but one
   gap on B-1 north-west (the planned co-op lip: add to `BUNKER_COOP_LIPS`), the rappel point on the bridge rail, the
   zipline from B-2 east to the lift lobby rail, the message-tube duct (1.5 x 1.2) from the B-1 west cabin to an inspection
   door in the lift lobby, the lift lobby and the lift car L9 (doors locked: the two-key gate), the staff tunnel door
   (reinforcement point), alarm panel position, wall medkit point.
5. Hide spots: B7 lobby lockers, recesses, skip; B9 cabins (2) and under-balcony recesses (2).
6. debugPoints 'B7', 'B7-roof', 'B8', 'B8-RT', 'B9', 'B9-B2', 'L9', 'A7', 'A8'.
7. `e2e-anchors.mjs`: add `bunker` to its map list (level-design 15: "e2e-anchors covers the map"); new anchors go after
   existing ones (ladder ordering note in CLAUDE.md).
8. Course stub: B7 (flag gate on the store door from a "Store key" switch), B8 (bolt gate on the catwalk stair, the
   cease-fire switch), B9 (objectives: key A, key B, case as pickups; pair gate on the lift), airlocks A7, A8.

## Tests (tests/bunkerMap.test.ts)
- The water main in the drop-takedown window over B7-W's stop; the annex roof in the wall-jump window; the parapet hang
  height for a ledge pull; B9 boost gap at 4.5 (co-op lip rule); no other lip between 3.8 and 4.5 above any B9 floor.
- Nav: with every course door unlocked, a path exists from the B1 spawn to L9 that enters B1..B9 in order and skips none
  (level-design 15); with doors as built (locked), no path leaves B1 (airlocks hold).

## Checks
`timeout 900 npm run check`; `node scripts/plan-svg.mjs` (all three levels); `node scripts/run-e2e.mjs e2e-course
e2e-anchors smoke`. Then the Block B end (BRIEF 4.5): full `npm run e2e` in the background, the perf trend, and the
PC-PASS shots per bay (row 4) with `E2E_GPU=1`.

## Commit
"training T5: House, Range and Plot geometry (B7, A7, B8, A8, B9, L9)". Docs: CHANGELOG, LOG, STATE, PC-PASS results.
Opus self-review at the block end: BAYS register vs the built elements and level-design 16.10 (14 questions), logged.
Then PAUSE (D15, D27): STATE.md "Paused for Michael's walk"; write docs/training/WALK.md (how to walk: two tabs or
the solo flag, debug teleports per bay, what to look at per bay, where to write notes: docs/training/WALK-NOTES.md);
final message, 10 lines or fewer; STOP. The run resumes with T5b when Michael says RESUME.
