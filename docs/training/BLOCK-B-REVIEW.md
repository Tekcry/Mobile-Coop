# Block B self-review (T5 end) - BAYS register and level-design 16.10

Read-only review of feature/training-bunker. Sources: BAYS.md 10 (element register), DECISIONS A25-A43, LOG T2-T5,
src/world/maps/bunker{Upper,Shaft,Plant,Deep}.ts. Line numbers below are bunkerDeep.ts unless named.

## 1. Element register vs built (51 rows)
Built = as BAYS. Changed = built, moved or reshaped (reason logged). Partial = geometry built, behaviour / lamp owed.
No row is missing its geometry.

| Rows | Status | Note |
| --- | --- | --- |
| E-B1-1, E-B1-2 | built | Upper 251, 260. Strike post dummy: T7a |
| E-B2-2, -3, -4, -5, -8, -9 | built | Upper 307-385 (G1, G2, platform P; pipe; downpipes; pads; trench) |
| E-B2-1 glazed walkway | changed | A26: invisible full-height collision glass behind a visual frame |
| E-B2-6 beam ledges, column | changed | A27: column x 35, L2 / P moved 0.4 west |
| E-B2-7 cross walls | changed | A27; LOG T2 SCR: walkway east doors gated by the lane lever |
| E-B3-3 damper bar | built | Shaft 267 |
| E-B3-1, -2, -4, -5, -8 | changed | A30: RC on G1, WJ is G3's front face (not the north wall ring beam), hoist recess, ZP start, nets |
| E-B3-6 fan fence | changed | A31: mesh hood at 4.6 added (Shaft 289) |
| E-B3-7 duct + grille | changed | A31: 4.15 m, into a plant passage inside B3's box |
| E-B4-2, E-B4-3 | built | Shaft 381-387 |
| E-B4-1 cell walls | changed | A35: W2 4.25 (co-op margin 0.45, not 0.5) |
| E-B4-4, E-B4-5 | changed | A33: C1 / C2 ladders visual; overflow channel ends at z 8.5 (T3 fix) |
| E-B5-1, -2, -4, -5, -6 | built | Plant 265-309; MB is a switch in SR |
| E-B5-3 cable gallery | changed | A36: x 2..24, ladder x 23.3 |
| E-B6-1 | built | Plant 425-436 |
| E-B6-2, -3, -4 | changed | A36 / A37: CR stair, A5 service passage, RD3 vestibule, egress as pickup |
| E-B6-5 lockers, PC, CRAC, keypad | partial | Mount points built (Plant 436-449); hack / fault / code behaviour T7a |
| E-S6-1 | changed | A36: offset z -8, mid landing 3.0 |
| E-B7-1, -3, -5 | built | 216-283 |
| E-B7-2 water main | changed | LOG T5: 4.9 (BAYS 4.6), wall to wall (263) |
| E-B7-4 annex, parapet, hatch | changed | LOG T5: parapet 0.9 (BAYS 1.1); A40: roof downpipe added (249) |
| E-B7-6 store door + keypad | changed | A41: the door is A7's near door; KP7 mount only (132), key is a switch (237) |
| E-B8-2 barricades | built | 344-346 |
| E-B8-1 range kit | partial | Benches, lockers, stands, gantry frame built; dummies, barrel blast T7a; gantry lamp T6. Barrels collide: false (343) |
| E-B8-3 catwalk, tower, stair | changed | A43: CS z 24..30, convenience gate, vaultable rail |
| E-B8-4 sniper scaffold | changed | LOG T5: z 18..22 |
| E-B9-3, -4, -5 | built | 446-447, 513-539 |
| E-B9-1 balconies etc. | changed | A39: deck depths, cabins, towers, bridge to the north wall |
| E-B9-2 map table | partial | Built (520); back-light L9-T: T6 |

Counts: built 24, changed 24, partial 3 (owed to T6 / T7a), missing 0.
Outside the register but owed: every bay lamp beyond one work lamp (T6), device behaviour, cameras, alarm, dummies (T7a),
all guards and routes incl. A40's moved B7-O / B7-R stops (T7b), finishes and dressing (T9).

## 2. Level-design 16.10 (14 questions)
| # | Answer | Detail |
| --- | --- | --- |
| 1 | yes (none) | No forcing partitions. B2 lanes are declared course lanes (SPEC E2, E5). |
| 2 | partial | B6 L leg dead-ends at z 2 (A36, Plant 396); B5 dark pocket behind the landing stair reached by a 2nd SR door (A36 fix 7, Plant 291); B9 staff tunnel door with nothing behind (A41, 425). Each has a drill or guard reason; check on the walk. |
| 3 | partial | No ladder beside a stair serving the same levels (B8 LD x 9 vs CS x 58: 50 m apart). Ladders outside plant: B7 roof hatch ladder from an office floor (240), B8 tower LD (359) and scaffold ladder (373). B2 / B4 / B9 rig is E7. |
| 4 | no | S6 complete (Plant 509). No handrails on B7's timber stair (230) or its first-floor stairwell edge (233: 3.2 m open drop); B9 towers have two flights 0.1 apart with no spine or rail (404-406, "no spine" on purpose); B8 CS has walls but no rail. 16.2.4 fails; visual rails like S6 would fix it (T9 or a T5b fix). |
| 5 | no | B7 roof by a hatch ladder (240) and an exterior downpipe (249, A40). It is a training house (not a secure building), but no exception covers it. |
| 6 | yes (none) | B7 roof is bare. T9 may add roof plant; it must be real equipment. |
| 7 | partial | B7 roof hatch has no cover (239); stairwell hole without balustrade (233); B-2 balustrade gaps: zipline launch 3.5 m (502-503) and rope point 1 m (504-505) at 9 m; B-1 NW co-op gap (458). Gaps have rig reasons (E-B9-4, 11.3), the hatch and stairwell do not. |
| 8 | partial | Unnamed blocks: B7 annex wood block (260, presumably the kitchen counter); B9 pier (464) is named in code only. No object found blocking a door or window; confirm on the walk. |
| 9 | yes (none) | Sandbags and barricades are range props (E-B7-5, E-B8-2). |
| 10 | partial | B7 roof hatch ladder rises through a hole above an occupied floor, no cover / rail (16.2.3). No other. |
| 11 | yes (none) | B3 fan duct, B6 supply duct (SPEC E6), B9 tube duct all real systems ending at grilles / inspection doors. |
| 12 | partial | No invented side entrance into a dead end except SR's 2nd door (A36) and the dead tunnel door (A41). |
| 13 | partial | Rows missing for added elements: B3 mesh hood and plant passage (A31), B5 entry landing + stair + mesh screen (A36), SR 2nd door, A5 service passage, S6 lobby, B7 roof downpipe (A40), B9 pier, zipline post, controller desk. E-B3-2's reason (north wall ring beam) is now wrong. |
| 14 | yes, pending walk | Guardroom, cable hall, shaft, cistern, plant, offices, kill house, range, ops room all read as real. Stairs: B9 towers at the corners, B7 stair inside the east wall, S6 off B6. Michael's judgement. |

## 3. Open risks for Michael's walk (look first)
1. B7 roof: parapet 0.9 (16.5.3 wants 1.1), uncovered hatch, and the downpipe-top to parapet-hang transfer is unproven
   in the engine (A40). Walk: debug point B7-roof, then climb the downpipe at the south face.
2. Stairs and edges (16.2.4): B7 open stair and stairwell, B9 tower flights with no spine, no handrails except S6. Walk
   the SW / SE towers 0 -> 4.5 -> 9.0 and look for falls between flights.
3. B7 takedown geometry moved off BAYS (WM 4.9 wall to wall; inverted takedown only over the annex roof edge; B7-O /
   B7-R stops relocated, A40). Check the drills read naturally before T7b routes guards there.
4. B9 high edges: B-2 zipline launch gap and bridge rope gap at 9 m, the B-1 NW boost gap as the only solo-proof lip
   (unit-tested, not walked). Check a fall from B-2 never strands a player and nothing else reaches B-1 solo.
5. Gate chain as assumptions: store door = A7 near (A41), lift door = 4 ANDed gates with the end inside L9, CS a
   convenience bolt with a vaultable catwalk rail (A43), staff tunnel door to nothing. Try to bypass each.
6. Everything is near dark: one work lamp per bay (lights T6, guards T7b), so light parity and the lit chokepoints
   cannot be judged yet. GPU shots and perf budgets: see PC-PASS.md (pending PC run if this block ended in cloud).
