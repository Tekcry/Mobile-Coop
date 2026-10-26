# V6e-1 - campus graph areas (data only)

Slice V6e-1 of `docs/level-validator/V6-PLAN.md`: `area` on every space of the five campus graphs, `vantage.at` on the encounter vantages the code pins, link `at` on pairs joined by 2+ openings. No `measured` values yet. Method: a RoomDef id when one RoomDef is the space (boxes read from `src/world/maps/campusS*.ts`); otherwise a box list `[minX, minZ, maxX, maxZ]` built only from coordinates in those files (the code column). Code refs are files in `src/world/maps/`.

Reading the floor column: width x depth of the box, or for a list the bounding box and the summed box area, before solid furniture, walls and the 0.32 m agent radius remove cells.

Nav cells column: a one-off check, not a measurement. A throwaway node script built the campus on the test runtime nav (`tests/helpers/runtimeNav.ts`, cell 0.5) and counted walkable cells inside each `area` within 1.0 m of `storey`, the rule `src/world/levelMeasure.ts` uses (a RoomDef area also checks the room's `minY` / `maxY`). It only proves each box lands on floor; `level-measure --write` will record the authoritative `measured.cells`. The same script found a walkable cell within 0.35 m of every vantage.at and link at except `s5-ante` (see its row) and the canopy hatch (0.76 m, the rim cell).

## S1 (campusOps-S1.json)

| Space | Storey | `area` | Code | Floor (m) | Nav cells | Doubt |
| --- | --- | --- | --- | --- | --- | --- |
| `s1-verge` | 0 | `"verge"` | campusS1.ts:50 (RoomDef 'verge') | 6 x 24 | 497 | Start strip; its east edge x 26 is the perimeter fence (:186). |
| `s1-gatehouse` (enc) | 0 | `"gatehouse"` | campusS1.ts:51 (RoomDef 'gatehouse') | 6 x 6 | 82 | RoomDef box 6 x 6 is wall centre to wall centre; the clear interior is 5.7 x 5.7, so the floor is a little smaller. |
| `s1-lane` | 0 | `"lane"` | campusS1.ts:52 (RoomDef 'lane') | 6 x 20 | 434 | South end is open to the ring road (no wall at z -80). |
| `s1-lawn` | 0 | `[6,-56,26,-34]` | campusS1.ts:186,189 (fence x 26 and z -34); west edge x 6 = RoomDef 'park' and 'forecourt' maxX (:53, :58); south edge z -56 = RoomDef 'verge' z end (:50) | 20 x 22 | 1632 | No RoomDef: the box is the graph note's reading (unassigned ground, SPEC). The south edge z -56 and the west edge x 6 are not walls; the smoking shelter (RoomDef 'smoke' x 6..10, z -50..-47) is inside it. |
| `s1-carpark` (enc) | 0 | `"park"` | campusS1.ts:53 (RoomDef 'park') | 42 x 24 | 3363 | Open surface car park; 14 parked cars block cells. |
| `s1-bins` | 0 | `"bins"` | campusS1.ts:54 (RoomDef 'bins') | 10 x 7 | 185 | Three walls on the box edges, open to the south. |
| `s1-dyard` (enc) | 0 | `"dyard"` | campusS1.ts:57 (RoomDef 'dyard') | 14 x 5 | 217 | Graph size 4.5 x 14 is the clear depth between wall faces; the RoomDef box is 5 deep. |
| `s1-plantroof` | 4.4 | `"plantroof"` | campusS1.ts:59 (RoomDef 'plantroof', minY 4) | 14 x 6 | 293 | Storey 4.4; the RoomDef has minY 4 and no maxY. Parapets on the S and W edges. |
| `s1-pavilion` | 4.4 | `[-44,-34,4,-30]` | campusS1.ts:274,275,279 (blocks x -44..-24 and x -16..4, C1 roof x -24..-16, all z -34..-30, top 4.4) | 48 x 4 | 672 | Clear width is 3.85 to the S2 wall face at z -30.15; the box runs to z -30. Cells within 0.32 m of that wall are not walkable. |
| `s1-canopy` | 4.4 | `[-26,-40,-14,-34]` | campusS1.ts:86 (CR1 top x -26..-14, z -40..-34, top 4.4); slab boxes :289 | 12 x 6 | 283 | The hatch x -20.6..-19.4, z -36.4..-35.3 is a hole in the slab (no floor cells there). |
| `s1-forecourt` (enc) | 0 | `"forecourt"` | campusS1.ts:58 (RoomDef 'forecourt') | 32 x 12 | 1369 | Ground floor only; the part under the canopy slab (x -26..-14, z -40..-34) is inside the box and counts. |
| `s1-plantroom` | 0 | `[-40,-40,-26,-34]` | campusS1.ts:296,298,299 (walls z -40, x -40, x -26) and the solid pavilion block on z -34 (:274) | 14 x 6 | 262 | No RoomDef for the ground-floor plant room (RoomDef 'plantroof' is the roof, minY 4). Closed volume; only the locked dock door leads in. |

**S1 vantage.at**

| Space | from | `at` [x, y, z] | Code / note | Doubt |
| --- | --- | --- | --- | --- |
| `s1-gatehouse` | `s1-verge` | `[20.6,0,-76]` | campusS1.ts:208 (rear window (20, -76), sill 0.9, open) | Window centre is code; the 0.6 m standing offset east of the wall face is my choice (verge x 20..26). |
| `s1-carpark` | `s1-canopy` | `[-20,4.4,-39.7]` | campusS1.ts:95 (CR1-south lip x -20, z -40; canopy top 4.4) | Canopy south lip centre, 0.3 m inside the slab edge. The graph names only "canopy top". The car park lies 12-36 m away, so part of it is beyond the 25 m focus range. |
| `s1-dyard` | `s1-plantroof` | `[-38,4.4,-39.95]` | campusS1.ts:309 (ladder (-38, -40.4), top (-38, -39.95) per the link note), parapet gap x -38.6..-37.4 (:304) | Ladder top, in the gap of the 1.1 m south parapet. The graph says "standing at the parapet" without a point; this is the one code point on that edge. |
| `s1-forecourt` | `s1-canopy` | `[-20,4.4,-39.7]` | campusS1.ts:95 (CR1-south lip x -20, z -40; canopy top 4.4) | Same point as the car park vantage. The 19% hidden under the slab in the graph note matches the canopy footprint (12 x 6 of 32 x 12). |

**S1 link at**

| Link (idx in file) | kind | `at` [x, y, z] | Code | Note |
| --- | --- | --- | --- | --- |
| 1: `s1-lane` -> `s1-gatehouse` | door | `[17,0,-73]` | campusS1.ts:205 (door gap x 16.4..17.6 at z -73), S1_DOORS.gatehouse (:39) | lane -> gatehouse door. The window link on the pair (idx 2) is off the nav and has no at. |
| 19: `s1-canopy` -> `s1-forecourt` | drop | `[-20,4.4,-35.85]` | campusS1.ts:289 (hatch x -20.6..-19.4, z -36.4..-35.3, centre (-20, -35.85)) | canopy -> forecourt drop through the hatch. at is the hatch centre, a hole in the slab: findPath snaps to the nearest walkable cell at y 4.4. The two coop_boost links on the pair (idx 17, 18) are off the nav. |

## S2 (campusOps-S2.json)

| Space | Storey | `area` | Code | Floor (m) | Nav cells | Doubt |
| --- | --- | --- | --- | --- | --- | --- |
| `s2-foyer` (enc) | 0 | `"foyer"` | campusS2.ts:147 (RoomDef 'foyer', maxY 4.4) | 22 x 7 | 428 |  |
| `s2-hall` (enc) | 0 | 2 boxes: `[[-30,-23,-8,6],[-8,-4,4,6]]` | campusS2.ts:148 (RoomDef 'hall') + campusS2.ts:149 (RoomDef 'hallne'); campusS2.ts:148-149 (S2_ROOMS 'hall' and 'hallne') | bbox 34 x 29, 758 m2 in 2 boxes | 2619 | L-shape: atrium hall plus the NE lobby. The NE core (x 0..2.6, z 0..5.6) lies inside the NE lobby box, so its ground cells count here as well as in s2-core-ne (about 3% of the floor). |
| `s2-post` | 0 | `"post"` | campusS2.ts:143 (RoomDef 'post', maxY 4.4) | 14 x 10 | 357 | Holds the SW core (x -42..-39.4) and a sorting table. |
| `s2-mail` | 0 | `"mail"` | campusS2.ts:144 (RoomDef 'mail', maxY 4.4) | 14 x 8 | 286 |  |
| `s2-lift-g` | 0 | `"lift"` | campusS2.ts:145 (RoomDef 'lift', maxY 4.4) | 14 x 8 | 276 | The lift shaft block x -44..-41 is solid (no cells). |
| `s2-store` | 0 | `"store"` | campusS2.ts:146 (RoomDef 'store', maxY 4.4) | 14 x 10 | 367 |  |
| `s2-plant-g` | 0 | `"plant"` | campusS2.ts:150 (RoomDef 'plant', maxY 4.4) | 12 x 26 | 984 |  |
| `s2-core-sw` | 0 | `[-42,-28,-39.4,-22.4]` | campusS2.ts:90 (SW_CORE clear interior) | 2.6 x 5.6 | 32 | Overlaps the post room box at ground; only the foot cells of the flights are within 1 m of storey 0. |
| `s2-core-ne` | 0 | `[0,0,2.6,5.6]` | campusS2.ts:91 (NE_CORE clear interior) | 2.6 x 5.6 | 36 | Inside the NE lobby box (RoomDef 'hallne'), so those cells are in s2-hall too. |
| `s2-l1-plan` (enc) | 4.4 | 11 boxes: `[[-44,-30,-28.5,-28.2],[-44,-28.2,-42.2,-20],[-39.2,-28.2,-28.5,-20],[-42.2,-22.2,-39.2,-20],[-44,-14,-26,-4],[-36,-20,-26,-14],[-44,-4,-7.5,2],[-34,2,-26,6],[-16,2,-7.5,6],[-10,-20,-7.5,-4],[-28.5,-22.5,-7.5,-20]]` | campusS2.ts:371 (L1 slab: footprint :46 minus void :44 and the core feet :100); south band walls :455-459 (x -28.5, -21, -13; z -22.5); meeting rooms :461-467 (MR1 x -44..-36, z -20..-14; MR2 x -44..-34, z 2..6; MR3 x -26..-16, z 2..6); wing wall x -7.5 :433; SW core foot = :90 grown by 0.2 | bbox 36.5 x 36, 754.5 m2 in 11 boxes | 2404 | No RoomDef fits (l1sw / l1north overlap rooms). Boxes = x -44..-7.5, z -30..6 minus the void, the SW core foot, kitchen, print room, MR4 and MR1-3: 11 boxes, about 749 m2. |
| `s2-l1-kitchen` | 4.4 | `"l1kitchen"` | campusS2.ts:152 (RoomDef 'l1kitchen', minY 4.4, maxY 8.4) | 7.5 x 7.5 | 159 |  |
| `s2-l1-print` | 4.4 | `[-21,-30,-13,-22.5]` | campusS2.ts:455-459 (walls x -21, x -13, z -22.5; footprint z -30) | 8 x 7.5 | 176 | No RoomDef. |
| `s2-l1-meet4` | 4.4 | `[-13,-30,-7.5,-22.5]` | campusS2.ts:455-459 (wall x -13, z -22.5), wing wall x -7.5 :433 | 5.5 x 7.5 | 119 | No RoomDef. |
| `s2-l1-mr1` | 4.4 | `[-44,-20,-36,-14]` | campusS2.ts:461-462 (walls z -20 and z -14 from x -44 to -36), glass front x -36 (:463) | 8 x 6 | 138 | No RoomDef. |
| `s2-l1-mr2` | 4.4 | `[-44,2,-34,6]` | campusS2.ts:464-465 (wall x -34, glass front z 2, footprint z 6) | 10 x 4 | 107 | No RoomDef. |
| `s2-l1-mr3` | 4.4 | `[-26,2,-16,6]` | campusS2.ts:466-468 (walls x -26 and x -16, glass front z 2) | 10 x 4 | 100 | No RoomDef. |
| `s2-l1-wing` (enc) | 4.4 | 4 boxes: `[[-7.5,-23,-2,0],[-2,-23,4,-16],[-2,-12,4,-9],[-2,-4,4,0]]` | campusS2.ts:433 (wing wall x -7.5), :437 (SE meeting wall z -23), :440-442 (landing x -2..4, z -16..-12), :444-447 (comms x -2..4, z -9..-4), :449 (facilities wall z 0), shell x 4 (:S2_FOOT :46) | bbox 11.5 x 23, 210.5 m2 in 4 boxes | 673 | RoomDef 'l1wing' (x -7.5..4, z -30..0) also holds the SE meeting room, landing and comms room, which are their own spaces. Boxes = x -7.5..4, z -23..0 minus landing and comms. The graph note says 5.3 m wide on the west side and 4 m deep on the z -4..0 strip. |
| `s2-l1-facilities` (enc) | 4.4 | `"l1fac"` | campusS2.ts:154 (RoomDef 'l1fac', minY 4.4, maxY 8.4) | 7.3 x 6 | 111 | Glass front on z 0 (x -7.2..-5.0) has no opening; the door is x -4.6..-3.4. |
| `s2-l1-comms` | 4.4 | `[-2,-9,4,-4]` | campusS2.ts:444-447 (walls x -2, z -9, z -4; shell x 4) | 6 x 5 | 66 | No RoomDef. UPS cabinets on the east wall block cells. |
| `s2-l1-se-meet` | 4.4 | `[-7.5,-30,4,-23]` | campusS2.ts:437 (wall z -23 from x -7.5 to 4), wing wall x -7.5 :433, footprint z -30 | 11.5 x 7 | 243 | No RoomDef. |
| `s2-l1-landing` | 4.4 | `[-2,-16,4,-12]` | campusS2.ts:440-442 (walls x -2, z -12, z -16) | 6 x 4 | 66 | No RoomDef. |
| `s2-l2-plan` | 8.4 | 8 boxes: `[[-44,-30,-28.5,-28.2],[-44,-28.2,-42.2,-20],[-39.2,-28.2,-28.5,-20],[-42.2,-22.2,-39.2,-20],[-44,-20,-26,-4],[-30,-4,-7.5,6],[-10,-20,-7.5,-4],[-28.5,-22.5,-7.5,-20]]` | campusS2.ts:373 (L2 slab: footprint minus void and core feet); exec suite walls :504-507 (z -4, x -30); south offices :509-511 (z -22.5, x -28.5, x -13); wing wall x -7.5 :496 | bbox 36.5 x 36, 742.5 m2 in 8 boxes | 2414 | No RoomDef fits (l2sw / l2north overlap rooms). Boxes = x -44..-7.5, z -30..6 minus the void, the SW core foot, the exec suite and the two offices. |
| `s2-l2-exec` | 8.4 | `[-44,-4,-30,6]` | campusS2.ts:504-507 (wall z -4 from x -44 to -30, wall x -30 from z -4 to 6) | 14 x 10 | 404 | No RoomDef. |
| `s2-l2-offa` | 8.4 | `[-28.5,-30,-13,-22.5]` | campusS2.ts:509-511 (walls x -28.5, x -13, z -22.5) | 15.5 x 7.5 | 379 | No RoomDef. |
| `s2-l2-offb` | 8.4 | `[-13,-30,-7.5,-22.5]` | campusS2.ts:509-511 (wall x -13, z -22.5), wing wall x -7.5 :496 | 5.5 x 7.5 | 119 | No RoomDef. |
| `s2-l2-wing` | 8.4 | `[-7.5,-30,4,0]` | campusS2.ts:496 (wing wall x -7.5), :500-502 (board room wall z 0 from x -7.5 to -0.2; pocket wall z 0 from x 2.8 to 4), shell x 4 | 11.5 x 30 | 1209 | RoomDef 'l2wing' runs to z 6; z 0..6 holds the board room, the NE core and a shut pocket. The graph size 36 deep includes the board room. |
| `s2-l2-board` | 8.4 | `[-7.5,0,-0.2,6]` | campusS2.ts:499-502 (walls z 0 and x -7.5; the east wall is the NE core wall at x -0.2) | 7.3 x 6 | 132 | No RoomDef. |
| `s2-roof` | 12.3 | 7 boxes: `[[-44,-30,4,-20.4],[-44,-20.4,-26.4,-3.6],[-9.6,-20.4,4,-3.6],[-44,-3.6,4,0],[-44,0,-20,6],[-12,0,4,6],[-20,4.5,-12,6]]` | campusS2.ts:46 (S2_FOOT), :374 (roof slab), :537-540 (void rim outer faces x -26.4 / -9.6, z -20.4 / -3.6), :545-548 (roof plant room x -20..-12, z 0..4.5) | bbox 48 x 36, 1409.76 m2 in 7 boxes | 5079 | Footprint minus the void rim and the roof plant room (about 1410 m2). The core bulkhead landings lie inside these boxes (a few cells). |
| `s2-roof-plant` | 12.3 | `[-20,0,-12,4.5]` | campusS2.ts:545-548 (walls x -20 / -12, z 0 / 4.5) | 8 x 4.5 | 100 | No RoomDef. Walls are 0.2 thick, so the clear floor is about 7.8 x 4.3. |

**S2 vantage.at**

| Space | from | `at` [x, y, z] | Code / note | Doubt |
| --- | --- | --- | --- | --- |
| `s2-foyer` | `s2-post` | `[-30.3,0,-27]` | graph note: post-room doorway (-30.3, -27); the door is in the x -30 wall at z -27 (campusS2.ts:388) | Standing 0.3 m west of the wall line, in the post room. |
| `s2-hall` | `s2-l1-plan` | `[-18,4.4,-20.4]` | graph note: feature-stair head (-18, -20.4) on L1; FEATURE_STAIR cx -18, head z -20 (campusS2.ts:122) | 0.4 m past the stair head on the south ring strip (z -22.5..-20); inside the L1 slab. |
| `s2-l1-plan` | `s2-core-sw` | `[-38.6,4.4,-23]` | graph note: SW core door (-38.6, -23); SW_CORE door in the east wall at z -23 (campusS2.ts:90) | Standing 0.8 m east of the core wall. The graph note says the door vision panel is not built. |
| `s2-l1-wing` | `s2-core-ne` | `[1.5,4.4,-0.9]` | graph note: NE stair door (1.5, -0.9); NE_CORE door in the south wall at x 1.5 (campusS2.ts:91) | Standing 0.9 m south of the core door, in the wing. |
| `s2-l1-facilities` | `s2-l1-wing` | `[-4,4.4,-0.8]` | graph note: from the wing through the glass (-4, -0.8); the door is at x -4 on z 0 (campusS2.ts:450) | In line with the door, 0.8 m south of it. |

**S2 link at**

| Link (idx in file) | kind | `at` [x, y, z] | Code | Note |
| --- | --- | --- | --- | --- |
| 9: `s2-hall` -> `s2-l1-plan` | open_stair | `[-18,0,-11.9]` | campusS2.ts:122 (FEATURE_STAIR foot z -11.9, cx -18) | Foot of the feature stair at ground. The coop_boost on the same pair (idx 10) is off the nav and has no at. |
| 23: `s2-l1-plan` -> `s2-l1-wing` | door | `[-7.5,4.4,-21]` | campusS2.ts:433-434 (wing wall door at z -21, L1) |  |
| 24: `s2-l1-plan` -> `s2-l1-wing` | door | `[-7.5,4.4,-3]` | campusS2.ts:433,435 (wing wall door at z -3, L1) |  |
| 28: `s2-l1-wing` -> `s2-l1-landing` | door | `[-2,4.4,-14]` | campusS2.ts:440 (landing west doorway at z -14, no leaf) |  |
| 29: `s2-l1-wing` -> `s2-l1-landing` | door | `[1,4.4,-12]` | campusS2.ts:441 (landing north doorway at x 1, no leaf) |  |
| 30: `s2-l2-plan` -> `s2-l2-wing` | door | `[-7.5,8.4,-21]` | campusS2.ts:496-497 (L2 wing wall door at z -21) |  |
| 31: `s2-l2-plan` -> `s2-l2-wing` | door | `[-7.5,8.4,-3]` | campusS2.ts:496,498 (L2 wing wall door at z -3) |  |
| 32: `s2-l2-plan` -> `s2-l2-exec` | door | `[-33,8.4,-4]` | campusS2.ts:504-505 (exec suite south door at x -33) |  |
| 33: `s2-l2-plan` -> `s2-l2-exec` | door | `[-30,8.4,1]` | campusS2.ts:506-507 (exec suite east door at z 1) |  |

## S3 (campusOps-S3.json)

| Space | Storey | `area` | Code | Floor (m) | Nav cells | Doubt |
| --- | --- | --- | --- | --- | --- | --- |
| `s3-c2` | 4.5 | `"s3-c2"` | campusS3.ts:118 (RoomDef 's3-c2', minY 4.5) | 12 x 30 | 1186 | The landing floor has the SW stair core cut out (x 12..14.6, z -28..-22.4). |
| `s3-lobby` | 0 | `"s3-lobby"` | campusS3.ts:117 (RoomDef 's3-lobby', maxY 4.4) | 12 x 30 | 1207 | The SW stair core stands free inside it. |
| `s3-hall` (enc) | 0 | `"s3-hall"` | campusS3.ts:119 (RoomDef 's3-hall') | 30 x 22 | 1771 | RoomDef has no minY / maxY: only ground cells count (storey 0). Chamber, EMC room and racks block cells. |
| `s3-walkway` | 6 | `[22.15,-29.85,51.85,-28.6]` | campusS3.ts:81 (S3_BOX.walkway, top 6.0) | 29.7 x 1.25 | 60 | No RoomDef. A 1.25 m deck with a 0.1 rail: only about 2 rows of cells survive the agent radius. |
| `s3-chamber` | 4.4 | `[30,-22,36,-14]` | campusS3.ts:71 (S3_BOX.chamber, top 4.4) | 6 x 8 | 108 | No RoomDef. The plant (x 33.5..35.5, z -21..-15) is solid. |
| `s3-gallery` | 4.5 | 2 boxes: `[[28,-9.5,44,-8.15],[31,-13.5,35,-9.5]]` | campusS3.ts:79-80 (S3_BOX.gallery and spur, tops 4.5) | bbox 16 x 5.35, 37.6 m2 in 2 boxes | 85 | No RoomDef. 1.35 m wide with rails on the edges: few walkable cells. |
| `s3-nstair` | 0 | `[40,-7.85,42.6,-0.15]` | campusS3.ts:359-360 (walls x 39.85 and 42.75 from z -7.85 to -0.15), S3_BOX.nStair :77 | 2.6 x 7.7 | 49 | No RoomDef at ground ('s3-dock' ends at x 40). Includes the 1.85 m ground vestibule z -7.85..-6; the core above the flights is open. |
| `s3-view` | 4.5 | `"s3-view"` | campusS3.ts:121 (RoomDef 's3-view', minY 4.5) | 30 x 2 | 122 | 1.7 m clear between wall faces: few cells survive the agent radius. |
| `s3-writeup` | 4.5 | `"s3-writeup"` | campusS3.ts:122 (RoomDef 's3-writeup', minY 4.5) | 8 x 6 | 127 |  |
| `s3-gown` | 4.5 | `"s3-gown"` | campusS3.ts:123 (RoomDef 's3-gown', minY 4.5) | 3 x 6 | 43 |  |
| `s3-clean` | 4.5 | `"s3-clean"` | campusS3.ts:124 (RoomDef 's3-clean', minY 4.5) | 7 x 6 | 114 |  |
| `s3-back` | 4.5 | `"s3-back"` | campusS3.ts:125 (RoomDef 's3-back', minY 4.5) | 2 x 6 | 24 | 2 m corridor. |
| `s3-store` | 4.5 | `"s3-store"` | campusS3.ts:126 (RoomDef 's3-store', minY 4.5) | 7.4 x 4.4 | 77 |  |
| `s3-strip` | 4.5 | `"s3-strip"` | campusS3.ts:127 (RoomDef 's3-strip', minY 4.5) | 19.4 x 1.6 | 40 | 1.6 m corridor, clear 1.3. |
| `s3-sec` | 4.5 | `"s3-sec"` | campusS3.ts:128 (RoomDef 's3-sec', minY 4.5) | 12 x 6.4 | 231 |  |
| `s3-dock` (enc) | 0 | `"s3-dock"` | campusS3.ts:120 (RoomDef 's3-dock', maxY 4.4) | 18 x 8 | 410 | The gas cage in the NE corner is solid. |
| `s3-yard` | 0 | `"s3-yard"` | campusS3.ts:129 (RoomDef 's3-yard') | 6 x 30 | 596 | x 64..70 is outside the S3 shell; the map perimeter is the east edge. |

**S3 vantage.at**

| Space | from | `at` [x, y, z] | Code / note | Doubt |
| --- | --- | --- | --- | --- |
| `s3-hall` | `s3-c2` | `[21.8,4.5,-28]` | graph note: best eye spot on the landing (21.8, 6.1, -28); landing slab z -30..-28 (campusS3.ts:338), glass above the 5.8 spandrel on x 22 (:335) | Eye y 6.1 in the note = feet 4.5 + 1.55. x 21.8 is 0.05 m from the x 22 wall face (21.85): fine for an eye, not a walkable nav cell. |
| `s3-dock` | `s3-nstair` | `[40.5,0,-7]` | graph note: 0.65 m behind the open stair-vestibule door (x 39.85, z -7.6..-6.4) (campusS3.ts:359,362) | Door centre z -7.0; 0.65 m east of the wall line x 39.85 = x 40.5, inside the stair vestibule. |

**S3 link at**

| Link (idx in file) | kind | `at` [x, y, z] | Code | Note |
| --- | --- | --- | --- | --- |
| 14: `s3-hall` -> `s3-walkway` | ladder | `[23,0,-28.15]` | campusS3.ts:403 (b.ladder(x, wz1 + 0.45, 0, 6.0) at x 23; wz1 -28.6 gives z -28.15) | Foot of the SW caged ladder at ground. |
| 15: `s3-hall` -> `s3-walkway` | ladder | `[51,0,-28.15]` | campusS3.ts:403 (ladder at x 51) | Foot of the SE caged ladder at ground. |

## S4 (campusOps-S4.json)

| Space | Storey | `area` | Code | Floor (m) | Nav cells | Doubt |
| --- | --- | --- | --- | --- | --- | --- |
| `s4-dock` (enc) | 0 | `"s4-dock"` | campusS4.ts:210 (RoomDef 's4-dock', maxY 7.2) | 20 x 6 | 362 |  |
| `s4-svc` | 0 | `"s4-sc"` | campusS4.ts:211 (RoomDef 's4-sc', maxY 7.2) | 18 x 2 | 74 | RoomDef id is s4-sc. 2 m corridor, clear about 1.75. |
| `s4-lobby` (enc) | 0 | `"s4-lobby"` | campusS4.ts:212 (RoomDef 's4-lobby', maxY 7.2) | 13 x 4 | 136 | Main volume x -4..9 only; the s4-lobby-b / -c pockets are not modelled (graph note). |
| `s4-mantrap` | 0 | `"s4-mantrap"` | campusS4.ts:215 (RoomDef 's4-mantrap', maxY 7.2) | 3 x 3 | 20 |  |
| `s4-batt` (enc) | 0 | `"s4-batt"` | campusS4.ts:216 (RoomDef 's4-batt', maxY 7.2) | 6 x 11.8 | 130 | Battery racks block cells. |
| `s4-yard` (enc) | 0 | `"s4-yard"` | campusS4.ts:228 (RoomDef 's4-yard') | 6 x 32 | 434 | RoomDef has no minY / maxY: only ground cells count. |
| `s4-deck` (enc) | 7.3 | `"s4-deck"` | campusS4.ts:229 (RoomDef 's4-deck', minY 7.2) | 44 x 32 | 5078 | Storey 7.3, RoomDef minY 7.2. Chillers 2.0 high block cells. |
| `s4-riser` | 0 | `"s4-riser"` | campusS4.ts:227 (RoomDef 's4-riser', maxY 7.2) | 3.4 x 6 | 52 |  |
| `s4-baskets` | 4.4 | 7 boxes: `[[3.1,40.8,32.6,41.8],[3.1,24,4.1,40.8],[8.7,24,9.7,40.8],[26.3,24,27.3,40.8],[17.5,34.4,18.5,40.8],[30.7,42.15,33.85,44.6],[31.6,41.8,32.6,42.15]]` | campusS4.ts:104 (bN), :101-103 (b1, b2, b3), :105 (bCage), :109 (landing), :106 (stub); basket tops 4.4 | bbox 30.75 x 20.6, 94.37 m2 in 7 boxes | 307 | No RoomDef. Baskets are 1.0 m strips: the nav may keep few or no cells on them. If a measured run finds under 20 cells, that is the nav, not the boxes. |
| `s4-hall` (enc) | 0 | 4 boxes: `[[-4,22,34,34],[-4,34,14,40],[22,34,34,40],[-4,40,34,42]]` | campusS4.ts:219 (RoomDef 's4-hall') + campusS4.ts:220 (RoomDef 's4-hall-w') + campusS4.ts:221 (RoomDef 's4-hall-e') + campusS4.ts:222 (RoomDef 's4-hall-n'); campusS4.ts:219-222 (S4_ROOMS: the hall cut round the cage) | bbox 38 x 20, 712 m2 in 4 boxes | 1838 | Hall box x -4..34, z 22..42 minus the cage (x 14..22, z 34..40). Pod interiors are inside the boxes (ground cells count). |
| `s4-nc` | 0 | `"s4-nc"` | campusS4.ts:226 (RoomDef 's4-nc', maxY 7.2) | 22.6 x 6 | 436 |  |
| `s4-sec` | 0 | `"s4-sec"` | campusS4.ts:224 (RoomDef 's4-sec', maxY 3.5) | 12 x 6 | 186 | Ground floor only (RoomDef maxY 3.5); the NOC mezzanine is s4-noc. |
| `s4-noc` | 3.6 | `"s4-noc"` | campusS4.ts:225 (RoomDef 's4-noc', minY 3.5, maxY 7.2) | 12 x 6 | 139 | Storey 3.6, RoomDef minY 3.5. |
| `s4-cage` | 0 | `"s4-cage"` | campusS4.ts:223 (RoomDef 's4-cage', maxY 7.2) | 8 x 6 | 136 | Built 8 x 6, not the SPEC 8 x 8. |
| `s4-ups` | 0 | `"s4-ups"` | campusS4.ts:218 (RoomDef 's4-ups', maxY 7.2) | 6 x 17.8 | 284 | Cabinets x -9.6..-8.6, z 32..46 block cells. |
| `s4-cc` | 0 | `"s4-cc"` | campusS4.ts:217 (RoomDef 's4-cc', maxY 7.2) | 6 x 2.4 | 44 | 2.4 m corridor. |

**S4 vantage.at**

| Space | from | `at` [x, y, z] | Code / note | Doubt |
| --- | --- | --- | --- | --- |
| `s4-dock` | `s4-dock` | `[24,0,16]` | campusS4.ts:55 (S4_DOORS.c3Far [24, 16]); graph note "from the C3 door line" | Door centre at the wall line z 16. |

**S4 link at**

| Link (idx in file) | kind | `at` [x, y, z] | Code | Note |
| --- | --- | --- | --- | --- |
| 24: `s4-hall` -> `s4-cage` | door | `[18,0,34]` | campusS4.ts:61 (S4_DOORS.cageFront [18, 34]) | hall -> cage front gate. |
| 25: `s4-hall` -> `s4-cage` | pair_gate | `[18,0,40]` | campusS4.ts:60 (S4_DOORS.pgCage [18, 40]) | hall -> cage dual-custody rear gate (pair_gate is on the nav). |

## S5 (campusOps-S5.json)

| Space | Storey | `area` | Code | Floor (m) | Nav cells | Doubt |
| --- | --- | --- | --- | --- | --- | --- |
| `s5-lobby` | 0 | `"s5-lobby"` | campusS5.ts:188 (RoomDef 's5-lobby', maxY 4.1) | 6 x 6 | 108 |  |
| `s5-back` | 0 | `"s5-back"` | campusS5.ts:186 (RoomDef 's5-back', maxY 4.1) | 6 x 20 | 388 |  |
| `s5-vest` | 0 | `"s5-vest"` | campusS5.ts:185 (RoomDef 's5-vest', maxY 4.1) | 2 x 3 | 11 | 2 x 3 m. |
| `s5-ante` (enc) | 0 | `"s5-ante"` | campusS5.ts:183 (RoomDef 's5-ante', maxY 4.1) | 6 x 5 | 87 |  |
| `s5-strong` | 0 | `"s5-strong"` | campusS5.ts:184 (RoomDef 's5-strong', maxY 4.1) | 6 x 7 | 118 |  |
| `s5-hall` (enc) | 0 | `"s5-hall"` | campusS5.ts:181 (RoomDef 's5-hall', maxY 4.1) | 12 x 14 | 569 | RoomDef maxY 4.1: ground cells only. The hall void is open above; the floor underneath is whole. |
| `s5-pass` | 0 | `"s5-pass"` | campusS5.ts:182 (RoomDef 's5-pass', maxY 4.1) | 4 x 2 | 16 | 2 x 4 m. |
| `s5-draw` | 0 | `"s5-draw"` | campusS5.ts:180 (RoomDef 's5-draw', maxY 4.1) | 6 x 14 | 245 |  |
| `s5-garden` (enc) | 0 | `"s5-garden"` | campusS5.ts:197 (RoomDef 's5-garden') | 14 x 26 | 1040 | RoomDef has no minY / maxY: ground cells only. |
| `s5-terrace` (enc) | 0 | `"s5-terrace"` | campusS5.ts:198 (RoomDef 's5-terrace') | 44 x 6 | 868 |  |
| `s5-lawn` (enc) | 0 | 2 boxes: `[[-70,50,-26,58],[-70,58,-26,70]]` | campusS5.ts:199 (RoomDef 's5-lawn') + campusS5.ts:200 (RoomDef 's5-jetty'); campusS5.ts:199-200 (S5_ROOMS 's5-lawn' z 50..58 and 's5-jetty' z 58..70; the graph merges them) | bbox 44 x 20, 880 m2 in 2 boxes | 2984 | Merged as the graph note says (no wall, one slab). The jetty deck (top 0.4, x -47..-43, z 58..66) is within 1 m of storey 0. The lake is not modelled. |
| `s5-plant` | 0 | `"s5-plant"` | campusS5.ts:187 (RoomDef 's5-plant', maxY 4.1) | 6 x 8 | 118 |  |
| `s5-kitchen` (enc) | 0 | `"s5-kitchen"` | campusS5.ts:189 (RoomDef 's5-kitchen', maxY 4.1) | 6 x 12 | 204 | Counter x -31.6..-30.8, z 34..38 blocks cells. |
| `s5-ctl` | 0 | `"s5-ctl"` | campusS5.ts:179 (RoomDef 's5-ctl', maxY 4.1) | 6 x 12 | 169 | Rack rows block the west side. |
| `s5-core-g` | 0 | `[-36.3,38.2,-33.7,43.8]` | campusS5.ts:146 (S5_CORE clear interior) | 2.6 x 5.6 | 34 | Only the foot cells of the flight (within 1 m of storey 0) are floor. |
| `s5-core-1` | 4.2 | `[-36.3,38.2,-33.7,43.8]` | campusS5.ts:146 (S5_CORE) | 2.6 x 5.6 | 22 | Storey 4.2: the L1 landing cells only. |
| `s5-landing` | 4.2 | 2 boxes: `[[-38,32,-32,38],[-38,38,-36.5,44]]` | campusS5.ts:194 (RoomDef 's5-landing' x -38..-32, z 32..44), core foot :146 (x -36.5..-33.5, z 38..44) and the solid masses beside it | bbox 6 x 12, 45 m2 in 2 boxes | 116 | The RoomDef box also holds the core and a solid block x -33.5..-32; the boxes are the walkable parts per the graph note (6 x 6 plus a 1.5 m strip). |
| `s5-gal` | 4.2 | 3 boxes: `[[-50,18,-47,29],[-50,29,-38,32],[-41,18,-38,29]]` | campusS5.ts:546-549 (rails on the void edges x -47.1, x -41.0, z 29), RoomDef 's5-gal' x -50..-38, z 18..32 (:192) | bbox 12 x 14, 102 m2 in 3 boxes | 272 | Three arms round the hall void. Rails are 0.1 thick; screens x -47.4..-47.1 and -40.9..-40.6 (z 18..21.6) block cells. |
| `s5-board` | 4.2 | `"s5-board"` | campusS5.ts:190 (RoomDef 's5-board', minY 4.2, maxY 8.3) | 6 x 12 | 205 |  |
| `s5-ceo` | 4.2 | `"s5-ceo"` | campusS5.ts:191 (RoomDef 's5-ceo', minY 4.2, maxY 8.3) | 6 x 14 | 242 |  |
| `s5-arch` (enc) | 4.2 | 3 boxes: `[[-46,32,-41,44],[-41,32,-38,34.6],[-41,39.4,-38,44]]` | campusS5.ts:193 (RoomDef 's5-arch' x -46..-38, z 32..44) minus the cage campusS5.ts:97 (x -41..-38, z 34.6..39.4) | bbox 8 x 12, 81.6 m2 in 3 boxes | 207 | The cage is its own space (s5-cage), excluded so cells are not counted twice. Stacks x -44.3..-42.9 block cells. |
| `s5-cage` | 4.2 | `[-41,34.6,-38,39.4]` | campusS5.ts:97 (S5_BOX.cage) | 3 x 4.8 | 21 | No RoomDef. The shaft hole x -40..-38, z 35..37 has no floor. |
| `s5-shaft` | 0 | `[-40,35,-38,37]` | campusS5.ts:96 (S5_BOX.shaft) | 2 x 2 | 6 | No RoomDef. 2 x 2 m: under 20 cells is likely (about 16); that is the room, not an error. |
| `s5-well` | 0 | `[-50,34,-46,38]` | campusS5.ts:95 (S5_BOX.well) | 4 x 4 | 0 | No RoomDef. 4 x 4 m. Nav check found 0 floor cells: the well is sealed from the nav flood (window sill 0.5 is over the 0.45 step; the hoist door is on L1), so V6 will report an empty area. The box itself matches S5_BOX.well. |
| `s5-core-r` | 8.4 | `[-36.3,38.2,-33.7,43.8]` | campusS5.ts:146 (S5_CORE) | 2.6 x 5.6 | 16 | Storey 8.4: the roof landing cells only. |
| `s5-roof` (enc) | 8.4 | `"s5-roof"` | campusS5.ts:196 (RoomDef 's5-roof', minY 8.4) | 24 x 26 | 2038 | RoomDef box x -56..-32, z 18..44 also holds the core footprint (roof landing cells of s5-core-r count in both, about 1% of the floor). Well and core holes have no floor; chimneys block cells. |
| `s5-lowroof` | 4.2 | `"s5-low"` | campusS5.ts:195 (RoomDef 's5-low', minY 4.2, maxY 8.3) | 6 x 26 | 477 | RoomDef id is s5-low (the graph id is s5-lowroof). |

**S5 vantage.at**

| Space | from | `at` [x, y, z] | Code / note | Doubt |
| --- | --- | --- | --- | --- |
| `s5-ante` | `s5-well` | `[-46.6,0,35.5]` | campusS5.ts:520 (window (-46, 35.5), sill 0.5), S5_BOX.well :95; graph note "the open window from the well" | Window centre is code; the 0.6 m standing offset into the well (x -50..-46) is my choice. No nav cell within 1.3 m of it (the well is sealed from the nav): fine for an eye point, which V6 does not snap. |
| `s5-hall` | `s5-back` | `[-38,0,22]` | campusS5.ts:65 (S5_DOORS.hallEast [-38, 22]); graph note "through the east door (-38, 22) only" | Door centre, at the wall line. |
| `s5-arch` | `s5-landing` | `[-38,4.2,41]` | campusS5.ts:79 (S5_DOORS.kpArch [-38, 41.0]), L1 door :507 | Door centre on L1, at the wall line (graph: "through kp-arch only"). |
| `s5-roof` | `s5-core-r` | `[-35,8.4,38.1]` | campusS5.ts:76 (S5_DOORS.core [-35, 38.1]); the roof door at 8.4 | The bulkhead door of the service stair, as the graph says. |

**S5 link at**

| Link (idx in file) | kind | `at` [x, y, z] | Code | Note |
| --- | --- | --- | --- | --- |
| 16: `s5-hall` -> `s5-gal` | open_stair | `[-45,0,21.6]` | campusS5.ts:172 (S5_HALL_STAIR cx -45, foot z 21.6 at y 0) | Foot of the hall stair. The drop on the same pair (idx 17) is over the gallery rail with no single opening. |
| 22: `s5-terrace` -> `s5-lawn` | door | `[-44,0,50]` | link reason: terrace gate gap x -44.6..-43.4 at z 50 (balustrade z 50) |  |
| 23: `s5-terrace` -> `s5-lawn` | door | `[-64,0,50]` | link reason: boathouse path gap x -64.6..-63.4 at z 50 (balustrade z 50) |  |
| 31: `s5-arch` -> `s5-well` | drop | `[-46,4.2,36]` | campusS5.ts:81 (S5_DOORS.hoist [-46, 36]), hoist door L1 sill (S5_ROPE_EDGE y 4.2) | arch -> well drop off the hoist-door sill. The team_rope on the same pair (idx 30) is off the nav and has no at. |

## Unplaced

None: every space of the five graphs has an `area`. One is placed but has no nav floor, and five have under 20 cells (the 20-cell ERR in the V6 report would fire on them):

- `s5-well`: 0 cells. The box is S5_BOX.well, but the nav flood never enters the well (window sill 0.5 is over the 0.45 step; the hoist door is on L1). Its note carries a revive-reach estimate, so V6e-2 needs a decision: drop the well from the nav check, or make it reachable.
- Under 20 cells because the room is that small: `s5-shaft` (6, 2 x 2 m), `s5-vest` (11, 2 x 3 m), `s5-pass` (16, 2 x 4 m), `s5-core-r` (16, the roof landing of the stair core). `s4-mantrap` (20) sits on the limit.

The weakest placements (read the Doubt column before trusting a measured number):

- `s1-lawn`: no RoomDef and no walls; the box is the graph note's reading of unassigned ground.
- `s4-baskets`: 1.0 m strips; the nav may keep few cells on them.
- `s3-walkway`, `s3-gallery`, `s3-view`, `s3-strip`, `s3-back`, `s5-shaft`, `s5-vest`, `s5-pass`: narrow boxes where few cells survive the agent radius; a count under 20 is the room size, not a wrong box.
- `s2-hall`, `s5-roof`: the box also holds a stair core, so its landing cells count in two spaces.
- `s2-l1-plan`, `s2-l2-plan`, `s2-roof`: built as box lists cut round rooms and holes from several code lines; the other places to check first if a count looks off.

## Left without `vantage.at` or link `at`

| Section | What | Field | Why |
| --- | --- | --- | --- |
| S4 | s4-lobby, s4-batt, s4-yard, s4-deck | vantage.at | vantage.from is the space itself and the graph names no eye point. V6 searches the best cell. |
| S4 | s4-hall | vantage.at | The vantage is "the basket run" (eye about 6.0, feet 4.4); no point on B-N or B1-B3 is declared. |
| S5 | s5-garden, s5-terrace, s5-lawn | vantage.at | The vantage is "the roof edge" (west / north); the notes name the edge, not a point on it. V6 searches the roof. |
| S1 | links idx 2 (lane -> gatehouse window), 17-18 (forecourt -> canopy coop_boost) | link at | Off-nav kinds in a multi-link pair: V6 returns time_s null before it reads at. |
| S2 | link idx 10 (hall -> l1-plan coop_boost) | link at | Off-nav kind. |
| S4 | links idx 20-21 (coop_boost), 23 (baskets -> hall drop) | link at | coop_boost is off-nav. The drop steps off any unrailed basket edge near x 14 (graph note); the code has no single opening. |
| S5 | links idx 17 (gal -> hall drop), 30 (team_rope), 34 (roof -> terrace drop), 35 (rappel) | link at | Drops over a rail or parapet edge have no single opening; team_rope and rappel are off-nav. V6 takes the shared-edge cell for the two drops and may report 2+ gaps: pin them in V6e-2 once a run shows which cell it picks. |

Link `at` rule used: only pairs joined by 2+ links, only for kinds the nav models (door, double_door, opening, stairs, ladder, drop, pair_gate); the off-nav kinds (coop_boost, team_rope, rappel, window) are left without `at` because V6 returns `time_s: null` for them before it reads `at`. Link `at` y is the walkable floor height at the opening (a ladder foot at ground, a stair foot at ground); `findPath` snaps to the nearest walkable cell at that y.

Totals: 101 spaces, 60 by RoomDef id, 41 by box list, 16 vantage.at, 19 link at.
