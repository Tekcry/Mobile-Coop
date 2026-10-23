# LR16-W part S1 - build report (section 1 at night, by layout)

Builder: Opus 5.5, 2026-10-24. Branch `feature/sector-redesign-lr16w-s1` off `67f3661a`. Brief:
`docs/sector-redesign/briefs/LR16-W.md` (part S1, rules for every warehouse part, light parity).
Files: `src/world/maps/warehouseS1.ts` (`S1_LAMPS` and its doc comment only) and `src/world/maps/warehouseSectors.ts`
(section 1 block, lines 67 and 81 only: R1 and R3 `pts`). Nothing within 3 lines of another section's block.

## Result
- `warehouseS1Light`: all 12 green (was 1 failing assert, 68 points). Every S1 point sits at least 0.01 inside its
  band (TOL included); most at 0.02 or more.
- `warehouseS2Light`: the 3 owned C2-lobby points at (-14.5, -7.2) cleared (1.00 -> 0.54). The 4 owned points at
  (-14.5, -5.4) (R1[1] R2[1] R3[1], "entry: the C2 far door") went from too bright (0.57) to too dark (0.37): C-entry
  below. S2 counts now: lit enough 8 (S2's own 4 + these 4), stealth 42 (S2's own 37 + S3's 5 C3-office points).
- `warehouseS3Light`: unchanged (67 + 1 + 1 + pocket deltas, all S3's).
- Print diff of S2 and S3 (threshold 0.005): only the 7 owned boundary points move. Every other point is unchanged.

## Method
Step 0 base prints (b1-b3) and the brief's probe matched the brief's red list exactly. Then an untracked probe
(`tests/zzW1opt.test.ts`, deleted) measured each S1 lamp's contribution per unit intensity (direct + bounce, chest and
head) at every S1 point, every pocket, the two S2 lobby points, the "sections 2 and 3" guard points and candidate
points, with lamp positions overridable before the bake. A linear model of those (checked against the real reads: within
0.01) picked intensities; layouts were compared by re-baking candidates on spare (dead) fitting ids. Every chosen layout
was then written to the source and re-measured by the real tests. Levels are linear in intensity (`lightField.ts`), so
the model only chose; the numbers below are the tests' own prints.

## Changed lines (old -> new, lever, why it stays realistic)
Lamp ids are registry ids (#0-#53 in `S1_LAMPS` order). Intensity "x" = fraction of the base level.

| fitting(s) | old | new | lever | why realistic |
| --- | --- | --- | --- | --- |
| facade flood #0 (-19, 5.0, -18.45) | i 0.397 | i 0.30 | L1 | yard flood on its night level |
| facade door bulkheads #2 #3 #4 (row) | y 3.0; #2 r 1.36 i 0.723, #3 i 0.248, #4 i 0.159 | y 3.3; #2 r 1.8 i 0.281, #3 i 0.103, #4 i 0.065 | L3 (row raised 0.3 m, one height kept) + L1 | door lamps a little higher over the doors: a flatter pool, so the door spot and the yard 1.5 m off it both sit in band; dimmed to a night level (0.4x) |
| gatehouse #5 | i 0.242 | i 0.225 | L1 | night level |
| bay strips #6-#13 | south row i 0.7 / 0.7 / 0.852 / 1.022; north row z -11.6, i 0.7 / 0.7 / 1.278 / 0.579 | south row 0.7 / 0.456 / 0.428 / 0.467; north row z -11.0, 0.608 / 0.386 / 0.572 / 0.452 | L3 (north row 0.6 m north) + L1 | high-bays on night level (0.37-0.87x); the checker's desk strip #6 stays at full level: the bay's work pool (floor 0.74) with R1[3] in its rim; the north row over the lane ends lights the forklift lane (takedown 5) without over-lighting the east lane |
| lobby-roof strips #14-#17 (row) | z -7.4; i 0.567 / 0.608 / 0.4 / 0 | z -6.6; i 0.314 / 0.305 / 0.211 / 0 | L3 (row 0.8 m north) + L1 | strips along the z -6 wall side; the roof walk (z -7.4 to -8.4) in their rim instead of under them (walk peak 1.00 -> 0.78) |
| plant deck strips #18-#21 (row) | z -15.15; #20 i 0.976, #21 r 1.5 i 0.726 | z -16.9; #20 i 0.237, #21 r 3 i 0.327 | L3 (row 1.75 m south, the brief's z -16.9) + L1 | a pool over the plant side; the walk line in its rim. #21's radius 1.5 -> 3 (a 1.5 m reach no longer reached the walk line from the new spot) |
| crane walkway bulkheads #22-#24 (row) | y 5.0; i 0.365 / 0.303 / 0.349 | y 5.5; i 0.063 / 0.052 / 0.06 | L3 (raised 0.5 m, the brief's option; light < 5.9) + L1 | maintained walkway lights; at 5.5 the near field over the head is softer, so i stays well above 0.03 |
| workshop strips #25-#30 | middle column x 16; i 0.483 / 0.921 / 0.921 / 0.921 / 1.376 / 1.123 | middle column x 16.6; i 0.482 / 0.639 / 0.632 / 0.686 / 0.613 / 0.792 | L3 (middle column 0.6 m east) + L1 | at x 16 the lathe strip sat right over the crane girder (x 15.8-16.2, y 4.5-4.9), which shadowed the lathe spot; 0.6 m east it lights the lathe at 0.45x instead of needing more than full level |
| fire lobby #32 #33 | (-15.15, -7.4) dead, (-13.85, -7.4) r 5.65 i 0.313 | (-13.1, -8.0) r 6 i 0.087, (-13.1, -7.0) r 6 i 0.11 | L3 (dead fitting lit, both moved within the lobby: a 1 x 2 column on its east side) + L1 | two panels, one by each door, off the door axis: a flat pool over the route (all lobby points 0.45-0.55); the pool's bright side is the east wall, not the route |
| reception #35 #36 (row) | z -15.9; #35 r 6.93 i 0.347 (pass), #36 dead (not pass) | z -15.1; #35 r 5 i 0.114, #36 r 5 i 0.113, both pass | L3 (row 0.8 m north, dead fitting lit) + L1 | the counter lit by both ceiling panels on a night level; the route along the room's west side and the counter front all in band (counter 0.47, its own WORK band). Both rows marked `pass` (the room's lit panels, as before) |
| security #37 #38 | i 0.706 / 0.45 | i 0.138 / 0.037 | L1 | CCTV room on a desk-level light (0.2x / 0.08x). The brief's 0.6 rad beam on #37 was measured and dropped: it put R1[11] / R3[15] (4.4, -14.5) at 0.17-0.34 (red) |
| corridor #39-#43 | i 0.321 / 0.411 / 0.314 / 0.664 / 0 | i 0.064 / 0.091 / 0.041 / 0.163 / 0 | L1 | corridor night level (0.13-0.25x); #42 a little higher for the security office door (WORK); #43 stays dead (takedown 8) |
| mess #44 | (4.5, -9.8) i 0.861 | (6.0, -9.8) i 0.773 | L3 (1.5 m east) + L1 | the kitchenette light: pool over the kitchenette end, the kettle end (x 2.6, hatch h2) in its rim. x 6.6 was measured: too far for the hatch end without full level |
| void #45-#52 | lit #45 (-5.3, -12.3), #51 (3.1, -10), #52 (6.65, -10); rows z -12.3 / -10, east column x 6.65 | lit #49 (-5.3, -11.0) i 0.222, #51 (3.1, -11.0) i 0.175, #52 (7.3, -11.0) i 0.257, r 2.8; rows z -12.3 / -11.0, east column x 7.3; the rest dead | L3 (swap lit / dead, north row 1.0 m south, east column 0.65 m east) + L1 | crawl-void panels 1.1-1.7 m off the openings. The brief's pure swap (lit panels 2.3-2.9 m off) needed i 1.3-2.8 because heads in the void are at panel height (only the chest sees a panel, near horizontal) and still left the catwalk opening red |
| exit sign #53 (11, 2.4, -17.76) | r 3.14 | r 0.6 | L1 (radius) | an exit sign's glow is local (as S2's signs); position fixed |
| R1[10] R1[13] R3[14] R3[17] | (4.4, -12.6) | (4.4, -13.0) | L4 (0.4 m south, same floor) | the waypoint at the security office door's threshold; same way through the corridor door |
| R3[6] | (22.6, -12) | (23.4, -12.4) | L4 (0.9 m toward the east wall) | along the wall out of #30's pool; same floor, same way to the catwalk ladder |
| R3[13] | (2.5, -11.6) | (2.5, -11.2) | L4 (0.4 m north) | just outside the mess door, the way R3 comes out of the mess |

Not changed: #1 #17-#19 #31 #34 #43 #45-#48 #50 (dead or the charging sign; #17 #18 #19 #48 #50 moved with their row);
#34 and #53 positions; no lamp at y >= 5.9; no lamp added or removed (54); no other section's lamps; no constants.
Route moves keep `obj`, `climbs` and surfaces; no two routes identical (`sectors.test.ts` green); an analytic nav probe
(the `campusS1.test.ts` pattern) paths every moved leg at its straight length (no detour). e2e-sectorops is the
laptop's check (brief, Laptop 1).

## Red points: base -> after
68 S1 reds (the test's list), the edge rows of the brief, and the 7 owned S2 points. Band = the test's (TOL 0.02 on
each edge). "edge" after = within 0.02 of a band edge.

| base | point | band | base | after | after |
| --- | --- | --- | --- | --- | --- |
| edge | R1[3] (-19, -17) | 0.4-0.55 | 0.57 | 0.45 | ok |
| RED | R1[4] (-16, -16.2) | 0.4-0.55 | 0.83 | 0.52 | ok |
| RED | R1[5] (-9, -15.8) | 0.4-0.55 | 0.83 | 0.44 | ok |
| RED | R1[6] (-7.3, -15.8) | 0.4-0.55 | 1.00 | 0.49 | ok |
| RED | R1[7] (-7.2, -14.4) | 0.4-0.55 | 0.79 | 0.53 | ok |
| RED | R1[8] (-4.5, -14.4) | 0.4-0.55 | 0.67 | 0.54 | ok |
| RED | R1[9] (-4.5, -13) | 0.4-0.55 | 1.00 | 0.40 | edge |
| RED | R1[10] (4.4, -12.6) -> (4.4, -13) | 0.4-0.55 | 1.00 | 0.51 | ok |
| RED | R1[11] (4.4, -14.5) | 0.4-0.55 | 1.00 | 0.44 | ok |
| RED | R1[12] (4.8, -16) | 0.45-0.8 | 1.00 | 0.76 | ok |
| RED | R1[13] (4.4, -12.6) -> (4.4, -13) | 0.4-0.55 | 1.00 | 0.51 | ok |
| RED | R1[14] (-7, -12.3) | 0.4-0.55 | 1.00 | 0.53 | ok |
| RED | R1[15] (-9.2, -12.3) | 0.4-0.55 | 0.75 | 0.47 | ok |
| RED | R1[17] (-14.5, -10) | 0.4-0.55 | 0.86 | 0.52 | ok |
| RED | R1[18] (-14.5, -9.4) | 0.4-0.55 | 0.90 | 0.48 | ok |
| RED | R1[19] (-14.5, -7.4) | 0.4-0.55 | 1.00 | 0.55 | edge |
| | R2[1] (-20.4, -19.6) | 0.4-0.55 | 0.46 | 0.55 | edge |
| RED | R2[5] (5, -14.9, 3.3) | 0.4-0.55 | 1.00 | 0.53 | ok |
| RED | R2[6] (7.4, -14.6, 3.3) | 0.4-0.55 | 1.00 | 0.43 | ok |
| RED | R2[7] (6.45, -16.3) | 0.4-0.55 | 1.00 | 0.42 | ok |
| RED | R2[8] (4.8, -16) | 0.45-0.8 | 1.00 | 0.76 | ok |
| RED | R2[9] (6.4, -16.5) | 0.4-0.55 | 1.00 | 0.40 | edge |
| RED | R2[10] (7.4, -14.6, 3.3) | 0.4-0.55 | 1.00 | 0.43 | ok |
| RED | R2[11] (5, -14.9, 3.3) | 0.4-0.55 | 1.00 | 0.53 | ok |
| RED | R2[14] (-20, -7.4, 3.2) | 0.4-0.55 | 0.95 | 0.40 | edge |
| RED | R2[15] (-15.5, -8.4, 3.2) | 0.4-0.55 | 1.00 | 0.40 | edge |
| RED | R2[16] (-14.5, -9.6) | 0.4-0.55 | 0.86 | 0.49 | ok |
| RED | R2[17] (-14.5, -7.4) | 0.4-0.55 | 1.00 | 0.55 | edge |
| RED | R3[4] (11, -18.9) | 0.4-0.55 | 0.93 | 0.52 | ok |
| RED | R3[5] (11, -17.2) | 0.4-0.55 | 0.75 | 0.43 | ok |
| RED | R3[6] (22.6, -12) -> (23.4, -12.4) | 0.4-0.55 | 0.89 | 0.52 | ok |
| edge | R3[7] (23.3, -10.4) | 0.4-0.55 | 0.56 | 0.43 | ok |
| RED | R3[8] (22.6, -9.55, 3) | 0.4-0.55 | 1.00 | 0.49 | ok |
| RED | R3[9] (8.6, -9.55, 3) | 0.4-0.55 | 1.00 | 0.52 | ok |
| RED | R3[10] (7, -9.6, 3) | 0.4-0.55 | 1.00 | 0.49 | ok |
| RED | R3[11] (2.6, -9.95, 3) | 0.4-0.55 | 1.00 | 0.50 | ok |
| RED | R3[12] (2.6, -10.2) | 0.4-0.55 | 1.00 | 0.46 | ok |
| RED | R3[13] (2.5, -11.6) -> (2.5, -11.2) | 0.4-0.55 | 1.00 | 0.46 | ok |
| RED | R3[14] (4.4, -12.6) -> (4.4, -13) | 0.4-0.55 | 1.00 | 0.51 | ok |
| RED | R3[15] (4.4, -14.5) | 0.4-0.55 | 1.00 | 0.44 | ok |
| RED | R3[16] (4.8, -16) | 0.45-0.8 | 1.00 | 0.76 | ok |
| RED | R3[17] (4.4, -12.6) -> (4.4, -13) | 0.4-0.55 | 1.00 | 0.51 | ok |
| RED | R3[18] (-7, -12.3) | 0.4-0.55 | 1.00 | 0.53 | ok |
| RED | R3[19] (-9.2, -12.3) | 0.4-0.55 | 0.75 | 0.47 | ok |
| RED | R3[20] (-11, -10) | 0.4-0.55 | 0.57 | 0.49 | ok |
| RED | R3[21] (-14.5, -9.6) | 0.4-0.55 | 0.86 | 0.49 | ok |
| RED | R3[22] (-14.5, -7.4) | 0.4-0.55 | 1.00 | 0.55 | edge |
| edge | takedown 1 officer | 0.4-0.55 | 0.56 | 0.52 | ok |
| edge | takedown 2 grunt | 0.4-0.55 | 0.57 | 0.41 | ok |
| RED | takedown 3 officer | 0.4-0.55 | 0.92 | 0.50 | ok |
| RED | takedown 4 officer | 0.4-0.55 | 1.00 | 0.43 | ok |
| RED | objective: the DVR | 0.55-0.8 | 1.00 | 0.79 | ok |
| RED | objective: the DVR desk front | 0.45-0.8 | 1.00 | 0.80 | edge |
| RED | connector: C2 near door | 0.45-0.55 | 0.97 | 0.52 | ok |
| RED | connector: C2 far door | 0.45-0.55 | 0.97 | 0.45 | edge |
| RED | connector: C2 checkpoint | 0.45-0.55 | 1.00 | 0.54 | ok |
| RED | entry: the entrance door | 0.45-0.55 | 1.00 | 0.54 | ok |
| RED | entry: the workshop door | 0.45-0.55 | 0.80 | 0.49 | ok |
| RED | bay: the wrapper | 0.4-0.55 | 0.97 | 0.44 | ok |
| RED | bay: the east lane | 0.4-0.55 | 0.86 | 0.48 | ok |
| RED | corridor: west end (door shut) | 0.4-0.55 | 1.00 | 0.53 | ok |
| RED | corridor: middle | 0.4-0.55 | 1.00 | 0.40 | edge |
| RED | security office door | 0.45-0.8 | 1.00 | 0.44 | edge |
| RED | plant deck: the middle | 0.45-0.55 | 1.00 | 0.53 | ok |
| edge | workshop: the bench | 0.4-0.55 | 0.57 | 0.44 | ok |
| edge | workshop: the lathe | 0.4-0.55 | 0.39 | 0.53 | ok |
| RED | crane walkway: east end | 0.45-0.55 | 1.00 | 0.49 | ok |
| RED | crane walkway: middle | 0.4-0.55 | 1.00 | 0.43 | ok |
| RED | crane walkway: west end | 0.45-0.55 | 1.00 | 0.52 | ok |
| RED | void: opening over the corridor (h1) | 0.45-0.55 | 1.00 | 0.47 | ok |
| RED | void: opening over the mess (h2) | 0.45-0.55 | 1.00 | 0.53 | ok |
| RED | void: the catwalk opening | 0.45-0.55 | 1.00 | 0.47 | ok |
| RED | mess: under the hatch | 0.45-0.55 | 1.00 | 0.47 | ok |
| RED | lobby roof: the storage | 0.4-0.55 | 0.95 | 0.40 | edge |
| RED | lobby roof: the vent | 0.4-0.55 | 1.00 | 0.40 | edge |
| | hide spot behind the skip (pocket) | dark <= 0.3 | 0.30 | 0.30 | unchanged (moonlit yard) |

Owned S2 points (`warehouseS2Light` print):

| point | band | base | after |
| --- | --- | --- | --- |
| R1[0] R2[0] R3[0] (-14.5, -7.2) | 0.4-0.55 | 1.00 | 0.54 |
| R1[1] R2[1] R3[1] (-14.5, -5.4) | 0.4-0.55 | 0.57 | 0.37 (C-entry) |
| entry: the C2 far door (from the lobby) (-14.5, -5.4) | 0.45-0.55 | 0.57 | 0.37 (C-entry) |

Edge rows after (within 0.02 of an edge, all inside TOL): R1[9] 0.40, R1[19] / R2[17] / R3[22] 0.55, R2[1] 0.55,
R2[9] 0.40, R2[14] / R2[15] 0.40, DVR desk front 0.80, C2 far door 0.45, corridor middle 0.40, security office door 0.44
(0.01 inside), lobby roof storage / vent 0.40. Pockets: all dark, the skip 0.30 (moon only, unchanged); takedown 8 +0.01 (base +0.03).

## C-entry: (-14.5, -5.4), the C2 far door seen from section 2 (4 owned S2 points)
Best measured 0.37 (needs 0.38 for R*[1], 0.43 for the KEY entry spot). Its light from the lobby has to pass under
the far door's head (2.1 m) from a panel at 2.95: only a panel at least 0.6 m south of the wall reaches the chest
(the head never), and every such panel sits 1.2-1.5 m from the lobby's own points but 2.6-3.1 m from this one. Over
about 40 panel positions measured (rows, columns, single panel, door axis, off axis, x -16.05 to -12.95, z -8.35 to -6.45),
the best ratio (far point / brightest lobby point) is 0.28; the target needs about 0.35. Best reachable with every lobby
point in band: 0.37-0.38 with 0.01 margins (chosen layout, margins kept at 0.02); 0.40 only with one panel and the
lobby points on their band edges. Base S2 lane strip (#56) gives it 0.10 (S2's, budgeted +-0.02).
Options for the lead / INT: (a) S2's lane strip #56 +0.06 at (-14.5, -5.4) (S2's lamp, outside this part's budget);
(b) INT moves S2's R1[1] R2[1] R3[1] waypoints (the connector route points INT owns) up to 1.0 m toward the doorway,
which clears the three READ points (the KEY spot stays at 0.37); (c) a light-model call (Michael).

## Each room's brightest floor point (body level, 0.5 m grid; mean in brackets)
| room | base | after |
| --- | --- | --- |
| yard | 1.00 at (-21.75, -19.25) [0.29] | 1.00 at (10.75, -22.25), the gatehouse door [0.27] |
| goods-in bay | 1.00 at (-16.25, -12.25) [0.73] | 0.75 at (-22.25, -15.25), the checker's desk [0.49] |
| goods-in office | 0.22 [0.13] | 0.28 [0.13] |
| fire lobby | 1.00 at (-14.75, -8.05) [0.76] | 1.00 at (-13.25, -7.55), the east side under the panels [0.51] |
| charging bay | 0.26 [0.14] | 0.30 [0.14] |
| reception | 1.00 at (-7.75, -16.25) [0.61] | 0.76 at (-3.75, -15.25), behind the counter [0.45] |
| transport office | 0.42 [0.14] | 0.16 [0.13] (unlit room) |
| security office | 1.00 at (3.25, -17.25) [0.97] | 0.83 at (4.25, -15.75), the DVR desk [0.41] |
| office corridor | 1.00 at (-7.75, -13.05) [0.86] | 1.00 at (3.25, -12.55), under #42 by the security door [0.38] |
| comms | 0.57 [0.18] | 0.21 [0.13] (unlit room) |
| WC | 0.35 [0.15] | 0.17 [0.13] (unlit room) |
| mess | 1.00 at (2.25, -10.55) [0.87] | 1.00 at (4.25, -10.55), the kitchenette [0.77] |
| workshop | 1.00 at (20.25, -13.75) [0.52] | 0.86 at (21.25, -13.75) [0.47] |
| plant deck (3.3) | 1.00 at (2.25, -15.1) [0.42] | 1.00 at (3.25, -16.6), over the plant [0.33] |
| office void (3.0) | 1.00 at (-6.25, -12.7) [0.41] | 1.00 at (-5.75, -11.2), under #49 [0.29] |
| crane walkway (3.0) | 1.00 at (8.4, -9.9) [0.39] | 0.47 at (8.4, -9.4) (a catwalk: no off-route floor) [0.20] |
| lobby roof (3.2) | 1.00 at (-23.75, -8.2) [0.63] | 1.00 at (-22.75, -7.2), by the north wall [0.45] |

Route legs (the straight line between waypoints, 0.25 m steps): 38 of the S1 legs peaked over 0.6 on the base, 14 now.
The 14: the security office's DVR legs (the objective's work pool, 0.76), the corridor legs past #42 (0.78-1.00 by the
security office door: #42 is what keeps the WORK door spot at 0.44, the corridor elsewhere reads 0.29-0.70), the
drainpipe leg (0.85), the lobby-roof walk (0.78), reception leg 7 (0.66), the workshop diagonal R3 leg 5 (0.83 where
it crosses #30's pool). Corridor profile along z -12.3 (x -7.5..7.5, 0.5 m): 0.33-0.70 west of x 2.5, 0.97-1.00 under
#42, 0.13-0.38 at the dark east end (takedown 8). The brief's ">= 0.42 between corridor panels" holds at the west end
only (0.33-0.40 between #40 and #41): the corridor points pass, but a flat 0.42 corridor and a 0.43 security door are
not both reachable with the corridor row (south-side and shifted rows were measured: worse).

## Tests (desktop, single files, maxWorkers 2, slot lock, CPU gated)
- `warehouseS1Light` 12/12; `warehouseS2Light` 2 failing asserts (lit enough 8 = S2's 4 + the C-entry's 4; stealth
  42 = S2's 37 + S3's 5), `warehouseS3Light` 4 failing asserts (S3's, unchanged): 34 tests, 28 passed.
- `sectors`, `warehouseCoopS1`, `warehouseCoopS2`, `warehouseCoopS3`, `warehouseLamps`, `lampAudit`, `lampBoxAlign`,
  `warehouseDress`, `sectorLampSync`, `rooms`, `detailPass`, `lampFlicker`, `lampAtlasFit`: 13 files, 173/173.
- `npx tsc --noEmit` clean; `npx eslint` on both files clean.
- No e2e, no build. Probe files (`tests/zz*`) untracked and deleted.

## Light parity
Map data only: intensities, radii, positions of whole rows / columns, one row height, dead fittings lit or put out, five
route points. One bake, one registry: the lamp shader (same cone and feather), the meter (`LightField.bodyLevel`) and
the guards (`fieldLight`) all read them, so picture, meter and guards move together. No shader, field, bake or constant
change. Route moves change where the test samples, not the light; each keeps the same way (same floor, door and
cover).

## For the lead / Michael
1. C-entry above (-14.5, -5.4): best 0.37; options (a) S2 #56, (b) INT moves S2's R*[1], (c) light model.
2. The corridor's pool by the security door (#42, 1.00 under it): the WORK door spot needs it. If Michael wants a flat
   corridor, the door spot's band or the office's spill (#37 is capped by the DVR's 0.8 maximum) is the call.
3. Laptop: e2e-sectorops (moved legs: R1 legs 9-13, R3 legs 5-6 and 12-17) and the GPU sheet, as the brief lists.
