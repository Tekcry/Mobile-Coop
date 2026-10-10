# Cinder Yard - block plan (zones and rings)
Status: DRAFT (revision 2026-10-11: massing walk fixes 1-6)

Zones only: no rooms, doors or objects. File: `docs/kestrel/kestrel.blocks.json` (arch schema, rooms of kind zone or corridor).
Plans: `docs/kestrel/plans/blocks-{B,G,F,R}.png`. Area check: brief room areas (02 section 5) at most 85% of the zone.

## 1. Grid and site
| Item | Value |
| --- | --- |
| Site `meta.site` | [0, 0, 78, 56]: 78 x 56 (limit 80 x 60) |
| Lane X01 | z 0-6, full width; depot facade on z 0 (7.0 m); 2.4 m palisade fence on z 6; viaduct on z 56 (9.0 m to its deck) |
| Footprint `meta.footprint` | [15, 22, 63, 52]: 48 x 30, 8 x 5 bays of 6.0 (limit 48 x 30) |
| Grid lines, west to east | A 15, B 21, C 27, D 33, E 39, F 45, G 51, H 57, I 63 |
| Grid lines, south to north | 1 z22, 2 z28, 3 z34, 4 z40, 5 z46, 6 z52 |
| Yards | front z 6-22 (16 m), west and east 15 m wide, north service strip z 52-56 (4 m, see ASK-3); X10 in the strip at x 52-53 |
| `meta.entry` | [14, 6.5]: just inside the fence, west of centre |

Front block z 22-37.5 (first floor above). North block z 37.5-52: single storey to the roof at 6.6 m (hall, gallery, power); the hall floor sits over a 1.5 m void (level U).
The front/north line z 37.5 and the row lines z 29.5 and 33.5 are on the 0.5 m grid, not on bay lines (mid-bay beams; P04 records it).

## 2. Levels
| Id | Floor | Height | Footprint | Holds |
| --- | --- | --- | --- | --- |
| B | -3.3 | 3.3 | - | carrier vault and its duct only |
| U | -1.5 | 1.5 | hall only | the void under the hall's raised floor; slab sunk 1.5 m, hall floor level with the corridors |
| G | 0 | 3.3 | full | everything else on the ground; hall and gallery 5.0 clear |
| F | 3.3 | 3.3 | [15, 22, 63, 37.5] front block only (Michael's decision) | staff floor |
| R | 6.6 | 2.4 | full | plant decks and the stair bulkhead |

## 3. Zones
| Id | Level | Ring | Rect | Brief rooms held | Area check (m2) |
| --- | --- | --- | --- | --- | --- |
| X-Z1-LANE | G | 1 | 0,0,78,6 | X01 | open |
| X-Z1-YARD | G | 1 | 0,6,78,22 | X02, X03, X05, X06, X07, X09 | open |
| X-Z1-WEST | G | 1 | 0,22,15,52 | X02, X04 | open |
| X-Z1-EAST | G | 1 | 63,22,78,52 | X02, X08 apron | open |
| X-Z1-NORTH | G | 1 | 0,52,78,56 | X02 (service strip), X10 | open |
| G-Z2 reception | G | 2 | 23.5,22,42.5,29.5 | G01, G03, G04, G05 | 118.5 / 142.5 = 83% |
| G-Z2G goods lobby | G | 2 | 59,29.5,63,33.5 | G26 | 12 / 16 = 75% |
| G-Z3P security room | G | 3+ | 18.5,22,23.5,29.5 | G06 (reshaped 6.4 x 4.7) | 30 / 37.5 = 80% |
| G20 corridor | G | 3 | 18.5,29.5,46.5,33.5 | G20 (28 x 4, clear 27.7 x 3.7) | corridor |
| G22 corridor | G | 3 | 15,29.5,18.5,52 | G22 (clear 3.13 x 22.1) | corridor |
| G-Z3G goods | G | 3 | 46.5,22,59,33.5 | G07, G08 | 122 / 143.75 = 85% (84.9) |
| G-Z3C comms | G | 3 | 52,33.5,63,37.5 | G09, G11 | 23 / 44 = 52% |
| G-MS / F-MS main stair | G, F | 3 | 42.5,22,46.5,29.5 | G21 | stair core |
| G-FS2 / F-FS2 fire stair 2 | G, F | 3 | 15,22,18.5,29.5 | G25 | stair core |
| G-FS1 / F-FS1 fire stair 1 | G, F | 3 | 59,22,63,29.5 | G24 | stair core |
| G-Z3W staff WC | G | 3 | 18.5,33.5,21,37.5 | G27 (Michael, P03B) | 5.5 / 10 = 55% |
| G-Z4M mantrap | G | 4 | 21,33.5,25.5,37.5 | G12 (4.0 x 3.0) | 12 / 18 = 67% |
| G23 corridor | G | 4 | 25.5,33.5,52,37.5 | G23 (clear 26.2 x 3.7) | corridor |
| G-Z4C cooling gallery | G | 4 | 18.5,37.5,26.5,52 | G17 | 64 / 116 = 55% |
| G-Z4H data hall | G | 4 | 26.5,37.5,49.5,52 | G13, G19 (cage inside) | 280 / 333.5 = 84% |
| G-Z4P power | G | 4 | 49.5,37.5,63,45 | G14, G16 | 83 / 101.25 = 82% |
| G-Z4B battery | G | 4 | 57.5,45,63,52 | G15 | 30 / 38.5 = 78% |
| G-Z5 meet-me | G | 5 | 49.5,45,57.5,52 | G18, B02 head | 46 / 56 = 82% |
| B-Z5V carrier vault | B | 5 | 49.5,44,57.5,52 | B01, B02 foot | 52 / 64 = 81% |
| B-Z5D carrier duct | B | 5 | 51,52,54,55 | X10 to B01 path (3 m) | duct |
| U-Z4V hall underfloor void | U | 4 | 26.5,37.5,49.5,52 | G13 underfloor (1.5 m clear) | void |
| F-Z3O offices and NOC | F | 3 | 18.5,22,42.5,29.5 | F01, F02 | 144 / 180 = 80% |
| F-Z3S staff and facilities | F | 3 | 46.5,22,59,29.5 | F03, F04 | 72 / 93.75 = 77% |
| F08 corridor | F | 3 | 15,29.5,63,33.5 | F08 (clear 47.6 x 3.7) | corridor |
| F-Z3W toilets and lockers | F | 3 | 15,33.5,52,37.5 | F05 | 40 / 148 = 27% |
| F-Z3T store and janitor | F | 3 | 52,33.5,63,37.5 | F06, F07 | 23 / 44 = 52% |
| R-PLANT-N chiller deck | R | plant (3 in file) | 15,37.5,63,52 | R01 | open |
| R-PLANT-S AHU deck | R | plant (3) | 15,22,59,37.5 | R03 | open |
| R-PLANT-E east deck | R | plant (3) | 59,29.5,63,37.5 | - | open |
| R-BULK bulkhead | R | plant (3) | 59,22,63,29.5 | R02 | stair head |

All 48 rows of the brief room schedule (G10 removed, G27 added) are assigned to a zone. Roof ring is written as 3 because A28 accepts 1-5 only; the roof is reached only from fire stair 1 (ring 3).

## 4. How each ring is entered
- Ring 1: over the lane fence (story entry), the west vehicle gate X09, the east gate to the apron.
- Ring 2: reception by the front door on the south face (arch at x 28.5); goods lobby by the dock shutter on the east face (z 31.5).
- Ring 3: G20 from reception (arch at x 40); the goods zone from the goods lobby (P04 door). G22, the staff WC, stairs, comms and all of F are entered only from ring 3.
- Ring 3+: the security room only from G20 (arch at x 21.5). It shares a wall with reception (the window), no opening.
- Ring 4: only through the mantrap: G20 to the mantrap (south side), mantrap to G23 (east side). G23 serves power and the hall; the hall's single entrance is at G23's east end (x 47), farthest from the mantrap, so everyone entering crosses the whole corridor. The gallery opens only from the hall; battery off power. Level U, the void under the hall, is reached only by hinged floor hatches spread across the hall (P04 places them); no stair or ladder, no officer enters it.
- Ring 5: the meet-me room only from the hall (P04 door on the hall's east wall, z 45-52).
- Exceptions: exit-only fire doors (fire stairs, G22, hall); carriers' entrance X10 hatch, duct, vault, riser B02 up into the meet-me room (`ringExempt`).

## 5. Circulation and fire escape
- Corridors (all at least 3.0 clear): G20 3.7, G22 3.13, G23 3.7, F08 3.7.
- Main stair: staff stair, dog-leg, two 1.85 m flights with an open centre and a balustrade between them (no wall), 2.0 m landings (stair z 22-27, bottom landing to z 29.5), core 4.0 x 7.5. Off G20 only, never the lobby; arrives on F08.
- Fire stair 2 (SW, G25: ground to first, doors to G22 and F08) and fire stair 1 (SE, G24/R02: ground to first to roof, door to F08, bulkhead on the roof): dog-legs, flights and mid landing z 22-26.5, bottom landing to z 29.5. Each exit-only door is on the end wall off the bottom landing, at z 28: fire stair 2 west, fire stair 1 east.
- Both fire stairs serve the first floor, at its two ends (F08 runs between them, 48 m: at most ~24 m to the nearer stair).
- Ground exits: G22 exit-only door on the north face (x 17.5) into the service strip; two hall exit-only doors on the north face (x 29, x 45) to the same strip.
- No goods lift (everything heavy stays on the ground); F06 is reached by the stairs. Voids: stairwells, riser, X10 hatch.
- Carriers: X10 at (52-53, 53.5-54.5) in the service strip beside the vault (Michael, Q2); a 3 m duct drops south into the vault under the meet-me room; riser void at (54-56, 49.5-51.5), by the hall's north-east corner. From G22's fire door to X10 is about 35 m along the strip, past both hall exits.

## 6. Entry and exit
- Entry: over the lane fence at x 14 (meta.entry [14, 6.5]).
- Exit: through the east gate (x 70) by the loading apron. Separate from the entry and from the west vehicle gate.

## 7. Rough critical path
Polyline (G unless F), stair flight path 8.7 m (two flights of 10 risers plus the landing turn). Assumes the NOC at the west end of F-Z3O, G05 at the east end of G-Z2, G06 in G-Z3P.
| Leg | Route | Length (m) |
| --- | --- | --- |
| 1 inside | fence at (14, 6.5) | 0 |
| 1 to 2 keycard | yard diagonal to the apron, dock shutter, goods, G20, reception arch, G05 | 98.1 |
| 2 to 3 security room | back to G20, west to the 3+ arch, G06 | 30.6 |
| 3 to 4 cage number | G20 east, main stair up, F08 west, NOC | 69.4 |
| 4 to 5 secure zone | F08 east, main stair down, G20 west, mantrap, G23 east, hall arch (x 47) | 92.9 |
| 5 to 6 tap | across the hall's east end to the meet-me room | 14.0 |
| 6 to 7 exfiltration | hall east fire exit, service strip east, east yard south, east gate | 85.0 |
| Total | | 390.0 (target 380-550) |

## 8. Look notes
- B: an 8 x 8 vault under the meet-me room with a 3 x 3 duct on its north side, under X10 in the service strip. Nothing else below ground.
- B: the duct enters the vault by one arch; the vault sits under G-Z5 and part of power; walls are all retaining walls. No cell stacks over 3 surfaces.
- B: the riser void on G lies over the vault; the ladder is P04's. U: one pit under the whole hall, 1.5 m clear, retaining walls.
- G: front block reads in three bands: rooms on the facade, G20, then G23 along the secure core. The north block reads gallery, hall, power with meet-me and battery.
- G: G22 runs the full west side from G20 to its fire door into the service strip; the staff WC and the mantrap sit side by side north of G20; the mantrap is the only link into ring 4.
- G: labels for small zones go to the callout column; the plan is legible. Fence gates show as dashed gaps.
- F: one 48 m corridor links fire stair 2, the main stair and fire stair 1; offices and NOC face south.
- F: the north row is only 3.6 m clear (toilets, lockers, store); the store takes the old lift slot.
- F: no room is over the hall, gallery or power (north block is double height).
- R: one deck over the whole footprint inside a 1.1 m parapet; the bulkhead at the SE corner opens north.
- R: chillers go on the north deck over the gallery and G22 (pipes drop in G22); the AHU on the south deck.
- R: only the bulkhead stair reaches the roof.

## 9. Checker notes
`check.mjs`: 25 PASS, 1 WARN, 1 FAIL, 8 SKIP, 1 INFO.
- A07 FAIL (accepted by Michael until P04's real doors): three block arches sit on 4 m corridor-end walls and are within 1.5 m of a wall end: D-G20-MS (main stair), D-G20-GDS (G20 to goods), D-MT-G23 (mantrap inner side). P04's real 1.2 m doors fit.
- A10 WARN: G22's two doors (fire stair 2 at the south end, fire exit at the north end) line up across G22; they are 22.5 m apart at opposite ends, not facing.
- A24 SKIP (no register yet, P06). A30 SKIP (no module rooms): fire stairs checked by hand (section 5). SC01-SC06 SKIP (no security file).
- A19 INFO: lip list only.

## 10. ASK items and brief deviations for P04
- ASK-1: closed (Q1). G07 sits under the first floor at 3.0 clear (brief 4.0); P04 records the deviation.
- ASK-2: closed (Q2). X10 moved beside the vault; brief 02 sections 4, 7, 9 and the G22 and X10 rows updated.
- ASK-3: a 4 m service strip behind the building (not in the brief) gives the hall fire exits a yard; the viaduct wall is on z 56.
- ASK-4: closed. Depot facade 7.0 m (two-storey warehouse), viaduct 9.0 m to its deck (Michael). East gate width 4.0 copied from X09.
- ASK-5: closed. Staff WC G27 added in zone 3 off G20 (Michael); zone G-Z3W, P04 places it. The mantrap zone narrows to 3 m and the north block shifts 0.5 m east to make room.
- Deviations: G23 26.5 m (brief 14); F08 48 m (brief 24); G22 3.13 clear (brief 3.5) and 22 m long; cooling gallery fits 14.1 m long (brief 16, same area); G09, F05 and F06 must reshape to 3.6-3.7 m deep; G08 and G09 open from the goods zone, not G20.
- The critical path sits 10.0 m over the 380 m floor (Q3 accepted 5.1). Revision: G06 reshapes to 6.4 x 4.7 (fix 4); main stair flights 1.85 m, not 2.0 (Michael, fix 4); hall void 1.5 m (brief 02 section 2).
- Downstream: B0 must rerun with the new blocks.

## 11. Questions for Michael (answered 2026-10-10)
1. Loading bay height: (a) accept 3.0 m under the first floor; (b) keep 4.0 m and shrink the first floor. Answer: (a).
2. Carrier duct: (a) 38 m duct; (b) under the north strip; (c) move X10. Answer: X10 moves to the north service strip beside the vault, short duct, reached from G22's fire door along the strip; the brief note is updated.
3. Critical path at 388 m: (a) accept; (b) lengthen in P04. Answer: (a); now 385 m after the staff WC change.

## Revision log
| Date | Fix # | What changed (ids) | Checker counts after | Status |
| --- | --- | --- | --- | --- |
| 2026-10-11 | 1 | G-LIFT, F-LIFT, V-F-LIFT, D-LIFT-G, D-F-LIFT, W031, W047 removed; G-Z3C and F-Z3T take x 52-55 | 25 PASS, 1 WARN, 1 FAIL (A07) | done |
| 2026-10-11 | 2 | D-G23-H moved to x 47 (G23 east end); no other hall door on G23 | 25 / 1 / 1 | done |
| 2026-10-11 | 3 | G-Z4M 4.5 x 4 (W022 to x 25.5), G23 from x 25.5; D-G23-C became D-H-C on W032 (gallery off the hall, Michael) | 25 / 1 / 1 | done |
| 2026-10-11 | 4 | S-MAIN 1.85 m flights, rect z 22-27; G-MS, F-MS, W023, W040 to x 42.5; V-F-MS; G-Z3P, W021, G-Z2, F-Z3O (Michael: 1.85 m) | 25 / 1 / 1 | done |
| 2026-10-11 | 5 | S-FS2, S-FS1, S-FS1R and V-F-FS2, V-F-FS1, V-R-FS1 to z 22-26.5; D-X-FS2 on W012, D-X-FS1 on W014 (z 28) | 25 / 1 / 1 | done |
| 2026-10-11 | 6 | Level U, U-Z4V, W056-W059; schema.md level ids; check.test.mjs +1 | 25 / 1 / 1 | done |
