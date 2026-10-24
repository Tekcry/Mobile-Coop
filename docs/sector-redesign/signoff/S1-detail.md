# Campus S1 - plan detail (backing for S1.md)

Section S1, gatehouse, staff car park and forecourt. Ground only (y 0), with roof walks at 3.0 / 3.3 / 4.4. Bounds of the
plan x -46..32, z -86..-28, 1 m = 10 px: pixel x = (x + 46) * 10, pixel y = (-28 - z) * 10.

- Plan: `docs/sector-redesign/signoff/S1-plan-0.svg`. The canvas is widened by a 240 px legend panel to the right; the
  map's frame and mapping are unchanged.
- Before: `before/S1-0.svg`.
- Graph: `docs/sector-redesign/graph/plan/campusOps-S1.json`.
- Sources read: `campusS1.ts`, the S1 parts of `campusSectors.ts` (guards :33-77, cameras :273-275, alarm :291, sector :306-360),
  `SPEC.md` S1 (:186-271) and the campus rules (:115-182), `campus-run/S1.md` (H1-H10), REPORT.md, the graph schema,
  scale sheet 3 / 5 / 7 / 8, level-design 3-7, 11 and 16, `sectorDesks.ts`, and audit section 4.
- The plan stays inside S1's shell (x -40..26, z -80..-30).
- C1 is unchanged: the near door (-20,-34), the far door (-20,-30), and the spine link `s1-forecourt -> s2-foyer`.
- The start is unchanged: `s1-verge` and the spawns (24,-79) etc.
- The map meta is unchanged: `players [1, 2, 3, 4]`.

## 1. Validator counts (S1's ids only)

| | ERR | WARN |
| --- | --- | --- |
| As built (`campus-run/run.txt`) | 13: class or camera-floor size 5 (gatehouse, dyard x2, forecourt, plantroom), rule of three 3 (gatehouse high, carpark high, dyard loud), targets 3 (gatehouse shadow 0.0 and vantage 0.4, carpark shadow 0.2), dead end 2 (bins, plantroom) | 21: custom 6, ceiling 1, opening width 11, guard band 3 |
| Plan (this graph, run with the S2-S5 plan files) | **0** | 20: custom 7 (verge, gateroof, lane, carport, plantroof, pavilion, canopy), ceiling 1 (car park), opening width 12 |

The split check passes: legs 48.6 s vs 47.3 s (3% apart), and a downed partner is at most 14.5 s away (from s1-dyard).

Map-wide lines S1 shares:
- The co-op coverage ERR: S1 now gives 3 of its 5 encounter spaces (was 1 of 4). The campus total depends on S2-S5.
- The secret-route WARN: in S1 only `s1-dyard` has a secret approach.

Every WARN is justified in section 9.

## 2. Change list

Each change says what moves (x, z, y, sizes) and why (validator error, H-finding, audit rule).

**C1 Perimeter closed** (fixes H4 a-e and H2, the "out-of-bounds open ground inside the map edge").
- The S1 perimeter becomes an anti-climb steel palisade, 2.4 high, 0.1 thick, `noLedge`, built as boxes rather than `fence` anchors:
  - z -80, x -40..26;
  - x 26, z -80..-34;
  - x -40, z -80..-40;
  - z -34, x 4..26.
- A sliding palisade leaf closes the gate gap (x 8..14, z -80), locked at night. The gatehouse opens it for the 03:00 courier.
- The anglers' cut panel (24,-80) stays visibly cut but is re-hung behind the crew, so its collision is closed.
- Roof-edge screens, 2.4 anti-climb, `noLedge`:
  - the gatehouse roof's south edge (x 13.5..20, z -79, y 3.3..5.7);
  - the plant roof's west parapet, raised to a screen (x -40, z -40..-34, y 4.4..6.8);
  - the pavilion top at x -40 and x 3.7 (z -34..-30, y 4.4..6.8).
- The bin store's 3.0 west wall goes, so no wall jump lands on top of the perimeter.

Why close it rather than give it a payoff: the ring road (z -84..-80), the field (x 26..70) and the west strip have no
function in this op. Closing them costs boxes only, and a real research campus has an anti-climb perimeter (the insurer's
condition).

Test: a nav flood from the spawn reaches no walkable cell outside S1's footprint before C1 opens.

E3 changes. The weldmesh was "climbable alone (a loud short cut)"; it was the out-of-bounds hole, so that toy goes.

**C2 Gatehouse** (fixes H6 and 4 gatehouse ERRs: camera floor, high approach, shadow, vantage).
- Box: x 13.5..20, z -79..-72.5 (6.5 x 6.5). The W wall moves to x 13.5, the N wall to z -72.5. Clear size 6.2 x 6.2, ceiling 3.0, roof top 3.3.
- Door: (17,-72.5), 1.2 x 2.1, opening outward. `S1_DOORS.gatehouse` becomes [17,-72.5]. The alarm panel moves to (15.0,-72.8) and the switch to (15.7,-72.8).
- Glazing band:
  - the open rear pane E2 (x 20, z -76.6..-75.4, sill 0.9), unchanged;
  - a fixed rear pane at x 20, z -74.4..-73.2;
  - a north pane at x 18.6..19.8, z -72.5;
  - the breakable reception window at x 13.5, z -76.6..-75.4.
- Light: the ceiling tube is off at night (the officers keep it off to see out). One warm desk lamp sits on the CCTV desk (18.6, 1.2, -73.4), radius 2.5, on group `gate`.
  - The PC desk by the rear window and the kettle corner stay dark.
  - The downloader at the window (20.6,-76) is 3.3 m from the lamp, so stays dark.
- Roof:
  - The east roof edge keeps its ledge (the rest stays `noLedge`). The A/C condenser on a wall bracket at (20.4,-78.4), y 1.2..2.0, and the downpipe make the SE wall-jump corner. A 3.3 climb is inside the 3.8 solo reach.
  - A glazed smoke-vent hatch, 1.2 x 1.2 at x 17.8..19.0, z -78.4..-77.2, sits over the kettle corner. It is one way down (3.3).
- Desk: the CCTV desk becomes an E6 security desk (data only): `{ id: 'desk-gate', section: 0, at: [18.8,-73.2], yaw: 0, cameras: ['cam-gate','cam-walk'], operator: 1 }`.

**C3 Car park and carport** (fixes the carpark ERRs: no high approach, shadow 0.2; also H8).
- Box: x -40..6, z -80..-54.
- Rows shift 2 m south: `ROW_Z` becomes [-75.75, -71.25, -60.75, -56.25], and the aisle runs z -69..-63. The 14 cars keep their bays.
- Columns go from 14 to 10:
  - park-W (6): (-34,-64), (-28,-64), (-22,-64), (-16,-64), (-34,-55), (-28,-55);
  - park-E (4): (-10,-64), (-4,-64), (2,-64), (2,-55).
  - The four old z -53 columns at x -22..-4 go (they would sit under the carport).
- Solar PV carport (new):
  - Size: x -24..0, z -63..-54, top 3.0, underside 2.6. One post line at z -58.5, every 6 m (0.3 posts).
  - Its LED strip is on a 01:00 timer, so it is off.
  - It is not `noLedge`: it is a planned solo route.
- Courier's van (new), parked early at R3 bay 3: centre (-26.2,-60.75), 2.0 x 5.0, bonnet 1.1, roof 2.4.
- Bike shelter moves to x -12..-2, z -54..-50 (roof 2.4, a ledge on its south edge). Cycle lockers stand beside it: x -12..-6, z -50..-49, 1.2 high.
- Clearances from the co-op lips:
  - carport to the canopy lip: 14 m;
  - bike shelter to the canopy lip: 10.2 m;
  - both to CR1-east: 20 m or more.
  - So rules 2 and 4 hold.
- The pair's loop moves -2 m:
  - grunt: (-29,-68.2) -> (-21,-68.2) -> (-21,-65.8) -> (-29,-65.8);
  - officer: z -67.2 / -64.8.
  - The officer's north stops are 1.8 m under the carport's south edge, which is the drop takedown.

**C4 Service yard** (fixes H5, H9 and the dyard ERRs: 2 size, no loud approach; bins dead end; co-op coverage).
- The bin store and the delivery yard become one yard, x -40..-26, z -54..-40 (14 x 14).
- The bin store's N wall (z -45, x -40..-30) and E wall (x -30, z -52..-45) go. The bins stand behind a 1.5 bin screen at x -40..-35, z -49 and x -35, z -54..-49.
- The feeder pillar (-31.4,-46.6) and its park-W / park-E breakers stay.
- The cage trolley moves to (-30.5,-46), with a 1.2 roll cage beside it at (-29.2,-46).
- #8's stops move to z -42.1, 0.5 m clear of the door arc (H10).
- Yard board (-29.5,-40.3), group `fore`, stays. The canopy breaker moves here from inside C1 (`campusS1.ts:133`) to (-29.0,-40.3). This is sync node A.
- Hoist bay (new co-op lip CR1-yard): the plant roof's S parapet opens at x -31..-27, with a safety gate left open.
  - Lip: z -40, y 4.4. Boost spot: (-29,-40.6).
  - Nothing solo-standable of 1.2 or higher is within 4 m (the roll cage is 5.6 m away).
  - It is shorter than the ladder, so it is not a solo twin.

**C5 Plant room** (fixes H1 and the plantroom ERRs: dead end, class min 6).
- The north wall is carved 1 m into the solid pavilion block. A new 0.3 wall sits at z -33, x -40..-26, 4.2 high. The block becomes x -44..-24, z -33..-30, solid.
- Clear size: 13.7 x 6.7.
- Roof hatch: 1.2 x 1.2 at (-30,-36.5), with a cover and a fixed ladder (4.4).
- The goods door E12 (-33,-40) is now a plain unlocked door: left open for the 03:00 courier. The `sealUnlocks` entry becomes moot and is kept.
- Props: two compressor skids, 1.0 high, on the north wall. Hide spot at (-38,-36).
- A circuit chart is pinned inside the door: the lead for sync node A.

**C6 Pavilion top** (fixes H2).
- The screens (C1) close both ends. The top becomes a planned roof walk, x -40..3.7.
- The drops off the east block's south face become planned: x -16..-6 onto the forecourt, x -6..4 onto the lawn.
- CR1-east (new co-op lip): the east block's south face, x -6..4 at z -34, y 4.4, normal (0,-1), boost spot (0,-34.6).
  - The ledge stays only on this segment; the rest stays `noLedge`.
  - The planters (0.7) stay 1.2 m off the wall (rule 3).
  - Headroom is open sky. Solo bypass: the plant-roof ladder and the walk.

**C7 Forecourt and lawn** (fixes H7, the H8 lawn, and the forecourt class min ERR).
- Forecourt: x -26..-6, z -54..-34 (20 x 20).
- Lawn: x -6..26, z -54..-34 (20 x 32). It is now an encounter space: the stealth route passes the smokers (V5f-3 rule).
- Cover:
  - the cycle lockers (C3);
  - grit bins, 1.2 high, at (-24,-48) and (-10,-47.5);
  - two lawn trees at (0,-44) and (16,-40).
- The smoking shelter gets a warm lamp: (8, 2.2, -48.5), radius 3, new group `smoke` (45), switch on its post.

**C8 RoomDef re-cut** (H8: every m2 of the footprint in one room).
- The rooms: verge 20..26 / -80..-54; gatehouse 13.5..20 / -79..-72.5; lane 6..13.5 / -80..-54 and apron 13.5..20 / -72.5..-54
  (one space in the graph); park -40..6 / -80..-54; dyard -40..-26 / -54..-40; plantroom -40..-26 / -40..-33 (new);
  forecourt -26..-6 / -54..-34; lawn -6..26 / -54..-34 (new).
- The roofs: plantroof (unchanged); carport -24..0 / -63..-54 (minY 2.9); gateroof (minY 3.2); pavilion -40..3.7 / -34..-30 (minY 4).
- The `bins`, `bikes` and `smoke` RoomDefs go: they are props inside the yard, forecourt and lawn (AS7).

**C9 Data**:
- `S1_GUARDS`: +7 guards (section 6).
- `CAMPUS_SECURITY.desks`: + desk-gate.
- `S1_COOP_LIPS`: + CR1-east, CR1-yard.
- `S1_SWITCHES`: the canopy breaker moves; + smoke.
- The 3 S1 route polylines in `CAMPUS_SECTORS[0].routes` are redrawn for the moved rows and the yard.
- `S1_HIDESPOTS`: + the plant room (-38,-36), + the carport's west end (-25,-62).
- `tests/campusS1.test.ts`: cycles and the screen count.

## 3. Routes per guarded space

The audit's three kinds are dark / high-or-vent / social-or-tool. In the graph they are `shadow` / `high` / `loud`.

| Space | Dark (shadow) | High / vent | Social / tool (loud) | Loop | Secret |
| --- | --- | --- | --- | --- | --- |
| s1-gatehouse | The verge, then the open rear pane E2 (download from outside, or vault in when #2 is at the kettle) | The wall-jump corner, the roof, the glazed hatch, a drop behind #2 | Lane door under cam-gate, or break the reception window; take #1, then the panel race | Round the building: window, door, roof | - |
| s1-carpark | West margin by the palisade (dark once the feeder board cuts park-W) | The van, the carport roof, a drop on the pair; or the forecourt bike shelter up to the carport | Straight down the lit aisle; shoot a column | Round the carport, or through the rows | - |
| s1-dyard | West margin to the bin corner behind the 1.5 screen | Caged ladder down from the plant roof; CR1-yard (co-op) | The delivery road from the drop-off bay past the bollard and the dock lamp | Ladder, plant roof, roof hatch, plant room, goods door | Plant room roof hatch and goods door |
| s1-forecourt | From the lawn along the planters (dark with the yard board cut) | Canopy hatch drop; pavilion drop; carport via the bike shelter; CR1 / CR1-south (co-op) | The footway from the rows straight to the kerb | Round the bike shelter and the canopy columns | - |
| s1-lawn | Dark east palisade strip from the verge to the NE corner | Pavilion drop into the planters; CR1-east (co-op) | Up the lit lane past the shelter's open side, or the car park's NE corner | Round the smoking shelter | - |

Section facts:
- **Section loop:** verge, lane, car park, yard, plant roof, canopy / pavilion, then the forecourt or the lawn, and back by the east strip to the verge.
- **Routes cross:** in the forecourt (every kind ends at C1) and the car park.
- **Choke node:** the C1 near door (-20,-34) with the doorman #5 (K1). It is the only way to S2.
- **Scouting vantage:** the gatehouse roof (3.3), right at the start. It sees 6 of the 10 patrol routes: #3, #4 (pair), #9 (barrier step), #11, #13 (over the carport), #15. Declared, measured in greybox (V6).
- **Per-space vantages** (in the graph): verge for the gatehouse (0.75), carport west end for the car park (0.75), plant roof for the yard (0.8), canopy for the forecourt (0.75), carport east end for the lawn (0.7). All declared, measured in greybox (V6).
- **Goal visible first:**
  - The objective (the gatehouse PC behind the open rear pane, in the desk lamp's warm spill) is 4 m from the spawn.
  - The exit (the white-lit canopy over C1) is visible from the verge across the car park (55 m). The carport top (3.0) sits below the line from a standing eye.
- **Landmark:** the entrance canopy, the one white-lit object under the dark HQ facade, seen from everywhere in S1.

Light language (one per space):

| Space | White cone (patrolled) | Warm lamp (objective / social) | Dark (route) |
| --- | --- | --- | --- |
| verge | - | - | All of it |
| gatehouse | - | CCTV desk lamp (the objective's desk) | PC desk / rear pane, kettle corner |
| lane | Floodlight (photocell, shot only), cam-gate island | - | Apron's east half |
| car park | Sodium columns over the aisle | - | Under the carport, west margin, south footway |
| yard | Dock lamp over the sentry's sweep | - | Bin corner, ladder foot |
| forecourt | Canopy downlights at the C1 door | - | Kerb end (x -14, CR1), footway under the carport edge |
| lawn | - | Smoking shelter lamp | Lawn, NE corner, planters |

## 4. Sync nodes and tracks

Both tracks start together at the verge and meet at the exit (C1):
- **Track A (high):** the west margin, the yard (board), the caged ladder, the plant roof, the canopy (overwatch), the hatch drop.
- **Track B (ground):** the gatehouse (desk), then the lane or the east strip, the lawn (smokers), the planters, the doorman from the east.

| id | kind | space | src | lead | track |
| --- | --- | --- | --- | --- | --- |
| sync-s1-gate-desk | camera_loop | s1-gatehouse | `src/game/sectorDesks.ts:14` (E6 desk, built; S1 data entry planned) | s1-gatehouse: #2 at the kettle, heard through the open rear pane from the verge: "If cam-walk freezes again I'm looping it from here, I'm not calling the engineer out at three." | B |
| sync-s1-yard-board | power_cut | s1-dyard | `src/world/maps/campusS1.ts:131` (yard board, group `fore`, built); planned: the canopy breaker (`:133`) moves onto it | s1-dyard: #8 on the radio at his post: "Yard board's tripped twice tonight; when it goes, the canopy goes and the doorman's standing in the dark at the door." Also the circuit chart inside the plant room door. | A |

What each node does for the other track:
- **B's loop** blinds cam-walk: 30 s looped, then switched off until the section restarts (`DESK_LOOP_TIME`, `DESK_OFF`). A's hatch drop on the doorman is then unseen. Graph assist on `s1-canopy -> s1-forecourt`.
- **A's board cut** darkens the bollards, the dock lamp and the canopy downlights. B's planters approach is then dark. Graph assist on `s1-lawn -> s1-forecourt`.

Guards relight boards (guard-ai S15): the cut is a window, not a state.

Solo does both nodes in sequence, with no pair press. The desk works when #2 is away: his kettle trip puts him 3.9 m from the desk, past `DESK_POST_RADIUS` 2.5. Or after a takedown.

## 5. Co-op moves and split numbers

Co-op moves:

| Move | Spaces | What it buys | Solo bypass |
| --- | --- | --- | --- |
| CR1 / CR1-south boost (unchanged) | forecourt to canopy | Overwatch of the doorman and the forecourt; hatch drop | Ladder, plant roof, canopy |
| CR1-east boost (new) | lawn to pavilion | Overwatch of the lawn and the walkway; drop behind cam-walk | Ladder and pavilion walk |
| CR1-yard boost (new) | yard to plant roof | Up beside the sentry, not under his sweep at the ladder | Caged ladder, or the plant room roof hatch |
| Dual takedowns (`sync_pair`) | gatehouse #1 + #2; car park #3 + #4; lawn #6 + #16 | Clear a pair that covers each other | Wait for the isolation moment (section 6) |

Split `s1` in the graph:
- Fork: s1-carpark. Rejoin: s1-forecourt.
- Leg a (A): s1-dyard, s1-plantroof, s1-canopy. 48.6 s: margin 25.5 m, ladder 15 s, 13 m, hatch drop 4 s.
- Leg b (B): s1-lawn. 47.3 s: 35.5 m + 26 m.
- Both legs are 90 s or less. Parity: 3%.
- Overwatch: s1-canopy.
- Assists: 2 (section 4).
- Partner reach, worst case: 14.5 s from s1-dyard (yard, forecourt, lawn at 3.0 m/s). This is under 15 s but tight; greybox measures it.

The gatehouse beat runs before the fork. With 2 players, one downloads at the window (10 s) while the other takes #2 at the kettle and loops the desk.

With 2+2:
- Team B clears the gatehouse with a dual takedown (#1 + #2, while #9 is out at the barrier) and switches the cameras off.
- Team A cuts the board.
- Each team has its own CR boost (CR1-east for B, CR1 / CR1-yard for A).
- They meet at C1. Overwatch per split: the canopy for A's side; the pavilion (CR1-east) gives B its own overwatch.

## 6. Guards per space (15; was 8)

All are Larchmont: officer = pistolSd, grunt = rifle. Every guard has a reason, a 25-45 s cycle and an isolation moment.

| Space (count) | # | Archetype | Post / patrol | Reason | Isolation / overlap |
| --- | --- | --- | --- | --- | --- |
| gatehouse (3) | 1 | officer | Post at the reception window (14.6,-76), faces W | Works the barrier, waits for the 03:00 courier | Back to the room; covered by #2 / #9 |
| | 2 | officer | CCTV desk (18.3,-73.6) 28 s, kettle (18.4,-78.2) 5 s; desk operator | Watches cam-gate / cam-walk | At the kettle: alone, back to the hatch and the rear pane |
| | 9 (new) | officer | Night supervisor: log desk (15.2,-73.6) 20 s, door step (17,-71.6) 5 s, ~33 s | Signs the log, checks the barrier for the courier | At the door step, facing the lane; covers the apron |
| car park (3) | 3 | grunt | Talking pair, aisle loop, 42 s clock (C3 coordinates) | The break-ins: tries door handles | Pair; first to answer the park-W cut |
| | 4 | officer | Talking pair with #3 | The break-in follow-up | North stops under the carport's edge (drop takedown) |
| | 11 (new) | officer | East half of the aisle, (-12,-66) to (4,-66), 4 s stops, ~40 s | The rows by the gate (courier parking) | Dark at the east end; answers the park-E cut |
| yard (3) | 7 | grunt | West palisade (-38,-64) to the bin corner (-38,-46), 4 s stops, ~44 s | Fence-line check after the break-ins | Dark at the bin corner; comes to the feeder board if it is cut |
| | 8 | grunt | Sentry sweep at the goods door, stops (-34 / -32, -42.1), 60 degrees either side, 12 s | Waits for the courier with the trolley | Covers the ladder; overlaps #7 at the bin corner |
| | 12 (new) | grunt | Storeman: goods door (-31,-42.6) to the bin screen mouth (-34,-48.5), 6 s stops, ~31 s | Stages the cage trolley for the courier | At the bin mouth, out of #8's sweep |
| forecourt (3) | 5 | officer | Doorman post (-20,-35), faces S (K1) | Badge check at the only staff door | White cone; cam-walk covers him unless the desk is used |
| | 13 (new) | grunt | Walkway patrol (-24,-43) to (-8,-43), 4 s stops, ~40 s | Walks the drop-off walkway | East end in the dark by the lockers; overlaps #5 |
| | 14 (new) | officer | Courier escort, post at the kerb (-18,-46.6), faces S | Meets the 03:00 courier at the drop-off | Faces the car park; back to the canopy (CR1-south) |
| lawn (3) | 6 | grunt | Smoker, post in the shelter (8,-48.5), faces S | On his break | Hidden from the verge by the A68 panel |
| | 16 (new) | officer | Second smoker: shelter front (7,-50.8) to the ash bin (4.5,-50.8), ~30 s | On his break with #6 (talking pair) | At the ash bin, back to the lawn |
| | 15 (new) | grunt | NE palisade (24,-54) to (24,-38), 5 s stops, ~42 s | East fence-line check | Dark at the NE corner (24,-38) |

Totals and caps:
- With reinforcements: 15 + 3 x 2 = 21, within `SECTOR.maxAlive` 32.
- Screen cap, `CAMPUS_SCREEN_CAP` 12, using the 40 m clear-line rule. The worst spot is the pavilion top's east block, with about 11 guards in view (forecourt 3, lawn 3, yard 3, #11, #7). This is measured by the greybox screen-count test. If it is over 12, #11 is moved south.
- Michael's 2026-10-23 ~01:20 rule: "each section should gradually get harder with more guards and more security." S1 at 15 is more than S2's SPEC 12, so S2-S5 must end above 15. Option 2 of the decision keeps S1 at 10.
- Cameras: unchanged (cam-gate, cam-walk). Both are on the gatehouse desk.

## 7. Solo path

Solo does everything in sequence, at about 6-8 min (SPEC ~6 min):
1. At the verge, download through the rear pane (10 s).
2. Roof wall jump, wait for #2's kettle trip, drop through the hatch, take down #2. Loop the desk, then switch the cameras off. #1 faces west and #9 steps out every ~33 s. Leave by the rear pane.
3. The south footway and the west margin (park-W cut at the feeder board optional), to the bin corner.
4. Cut the yard board, then the ladder in the gap of #8's sweep (or the plant room goods door and the roof hatch).
5. The plant roof, the canopy, the hatch drop on the doorman, C1.

There is no co-op-only move on the path. CR1, CR1-east and CR1-yard are all optional.

## 8. Held items

- **H3, C1 doors in line and 4 m apart:** C1 is a fixed connector (rulebook). It stays as built; it is a spine link, not a space.
- **Map-wide co-op coverage ERR:** S1 gives 3 of 5 (half). The campus total is S2-S5's.
- **Secret routes:** only the yard in S1 has one (the map-wide WARN). A gatehouse cable trench from the barrier island is possible later (a crouch duct, about 2 h); it is not added because S1 keeps new mechanics low.
- **Sync nodes are not read by the validator:** they sit in a top-level `sync` array in the graph, which `mergeGraphs` ignores. Marlow's mission-framework validator nodes will read them.
- **Everything marked "declared":** shadow, vantage, LOS and reach values are measured in greybox (V6, `--require-measured`).

## 9. WARN justification

- **custom (7):**
  - The verge and lane are 6-7.5 m strips (the yard class has a minimum width of 14).
  - The gatehouse roof, carport, plant roof, pavilion and canopy are roof walks with no sheet class (schema campus convention).
- **car_park ceiling 12:** an open surface car park. The class range 2.4-3.3 is for a deck; the schema has no `open` value for it (S1.md).
- **Opening width (12):** open ground between exterior spaces, and flush roof joins. They have no wall or door, so 2.5-3.5 cannot apply.

## 10. Assumptions (logged, undoable)

- **AS1** Close the perimeter rather than add a payoff outside it. Undo: put `fence` anchors back on the lines in C1 and graph the ring road / field as spaces with a reward.
- **AS2** 15 guards, 3 per encounter space, at the band floor. Michael's 22:00 "as many as realistically possible" against his 01:20 "gradually harder". Undo: option 2 (10 guards, 4 band WARNs).
- **AS3** The lawn is an encounter space (it was exterior, with the smoker counted in the forecourt). Undo: retype it as exterior and move #6 / #16 / #15 into the forecourt's count.
- **AS4** The carport climbs (van chain, bike-shelter chain) are written as `wall_jump` links: solo climbs under 3.8, and the schema has no mantle kind. Undo: a `mantle` kind in the schema.
- **AS5** The sync nodes live in a top-level `"sync"` array with an extra `track` field. Undo: move them to whatever field Marlow's framework settles on.
- **AS6** The plant room goods door is unlocked at night (story: the courier is due). Undo: lock it again. The plant room then still has the roof hatch, but becomes a dead end that needs `reward`.
- **AS7** The `bins`, `bikes` and `smoke` HUD RoomDefs are dropped (props inside the bigger rooms). Undo: keep them, provided the room lookup prefers the smaller box.
- **AS8** The canopy downlights become cuttable from S1 (the yard board). The SPEC kept their switch inside C1. Undo: move the breaker back. The power cut then darkens only the bollards and the dock lamp.
- **AS9** The campus unwalked-feature count is not tracked per area yet. This re-plan counts as +1 for campus.

## 11. Greybox build cost (after sign-off; Sonnet builds from Opus briefs, one checker)

| Slice | Content | Hours |
| --- | --- | --- |
| G1 Perimeter | Palisade lines, gate leaf, re-hung panel, 4 roof screens, bin W wall removed; nav-flood out-of-bounds unit test | 2.5 |
| G2 Gatehouse | Box rebuild, glazing band, two-lamp light, roof ledge corner and glazed hatch, desk-gate data, #9, door / alarm / switch moves | 2.5 |
| G3 Car park | Row and column shift, carport with posts, van, bike shelter move, lockers, #11, pair loop moved, hide spot | 3.0 |
| G4 Yard + plant room | Merge, bin screen, trolley / cage, plant room carve with hatch and ladder, goods door, board + canopy breaker, CR1-yard lip, #7 / #8 / #12 | 3.0 |
| G5 Forecourt + lawn | Box re-cut, grit bins, trees, shelter lamp, CR1-east lip, #13 / #14 / #15 / #16, pavilion ledge segment | 2.5 |
| G6 Data + tests | S1_ROOMS, routes, `tests/campusS1.test.ts` (cycles, screen cap 12, coop lips for CR1-east / CR1-yard), V6 measured graph pass | 2.0 |
| **Total** | 6 slices | **15.5 h** |
