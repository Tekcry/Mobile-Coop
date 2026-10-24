# S4 data hall - plan detail (backing for `S4.md`)

Planner: Opus, overnight 2026-10-24. Graph: `docs/sector-redesign/graph/plan/campusOps-S4.json` (17 spaces, 37 links, a
top-level `syncs` array). Plans: `S4-plan-0.svg`, `S4-plan-3.6.svg`, `S4-plan-7.3.svg` (1 m = 10 px, px = (x + 16) * 10,
py = (54 - z) * 10). Before: `before/S4-*.svg`. Source as built: `src/world/maps/campusS4.ts`, `campusS4Data.ts`.
Code Relay: Marlow's beat chart `origin/feature/mission-framework:docs/missions/prototypes/code-relay/BEAT.md`. Its ids are
used as given. Relay = Team A, Vault = Team B.

Coordinates are map x, z in metres. y is the floor height when it is not 0. Sizes are boxes on wall centre lines, as in the
as-built graph; clear widths are 0.2-0.3 m smaller and are noted where they matter.

## 1. Change list

| # | Change | Where (x, z, y, size) | Why |
| --- | --- | --- | --- |
| C1 | Merge the service corridor and the hall lobby into one goods-in lobby. Remove the z 18 partition and the scLobby door (4, 18). Keep the slab at 3.0-3.2. | x -4..14, z 16..22, 6 x 18 (clear 5.7) | ERR svc 2 x 18 < corridor 3; ERR lobby 4 x 13 < class and < the 6 m camera floor; V5d F1 / F6 (1.75 m corridor, 0.8 m slot, dead pocket); REPORT verdict "re-cut the service band" |
| C2 | Move the mantrap 1 m west, x 8..11, z 19..22. Outer door (8, 20.5); armoured inner door (9.5, 22) onto the P2/P3 cold aisle. The east 3 x 3 becomes an open trolley alcove. cam-mantrap moves to (10.8, 21.8). | mantrap 3 x 3 x 3 | Removes s4-lobby-b / -c (F6). Inner door 3.1 / 2.5 m from the pod doors (sheet 5: facing-door offset). |
| C3 | Mantrap desk moves to x 0.5..2.1, z 20.6..21.4. The interlock release sits on the desk at (1.3, 21.0), 6.4 m from the reader (7.7, 21.4). It is a pair gate (CR9, E3 data). | lobby | A real interlock admission becomes a team door. Gives the lobby a co-op link and keeps the loud way through the lobby co-op. |
| C4 | Add three 1.2 m parcel cages as low cover at x 2.0..3.2, 7.0..8.2 and 11.5..12.7, z 18.0..18.8. | lobby | Sheet 5: cover every 8 m (was 18 m bare). Hides the goods lane from the desk. |
| C5 | Relight the lobby: two 2.8 m lamps at (2.0, 21.2) and (6.5, 21.2). Lobby switch by the dock door (13.85, 18.6). The hall panel switches move to the south wall (-1.4..-0.6, 16.15). | lobby | Shadow 0.39 -> 0.5. The goods lane (z 16.15..17.0) stays dark. |
| C6 | Move dockWest from (14, 17) to (14, 17.5) and kpBatt from (-4, 17) to (-4, 18.5). | doors 1.2 x 2.1 | Sheet 5: 1.5 m from the corner (F3). |
| C7 | Dock lights: replace the two 6.0 floods with one 3.5 m bay light at (28, 21.5) and a 2.4 m lamp over the dock board at (16, 21.5). | dock 6 x 20 | Shadow 0 -> 0.46. The C3 door, the goods door and the east door are dark. The board reads lit (Marlow 1B). |
| C8 | Re-class the dock from loading_dock to storage (a goods-in bay). Walls stay. | dock | ERR 6 x 20 < 21 x 28 cannot be met in the shell (AS1). |
| C9 | Return-air plenum as a route space: the void over the lobby slab. Add grilles 1.2 x 1.5 at y 4.4 in the hall's south wall (x 3.0..4.2 and 8.6..9.8), the dock's west wall (x 14, z 19.5..21.0) and the battery room's east wall (x -4, z 19.5..21.0). Add a 1.2 x 1.2 ceiling hatch at (-2.0, 17.0). | x -4..14, z 16..22, floor 3.2, 3.8 clear | A vent route: secret approaches for 4 guarded spaces. Co-op lips CR8 / CR8-west (dock and battery room boosts) put co-op in two more spaces. |
| C10 | Run baskets B1 and B2 on south from z 24 to the hall wall (z 22.15), where they end at the plenum grilles. | x 3.1..4.1 and 8.7..9.7, z 22.15..24, y 4.0-4.4 | F8: B1-B3 ended over the south strip with no exit. Gives the plenum a solo way in (no softlock). |
| C11 | Battery racks go from 1.2 to 2.0 high and noLedge. The east row is cut back to z 21.0..26.5. | battery room | CR8 lip rules 2-3: nothing solo-standable within 4 m; boost spot (-4.8, 20.2) clear. |
| C12 | Battery room: one 2.4 m hydrogen-rated lamp over the monitor panel at (-7, 24). Add the essential lighting board (E4 board, groups noc 76 + sec 77, timed 25 s) at (-5.5, 27.3). | x -10..-4, z 16..27.5 | Shadow 1.0 -> 0.5. sync-s4-ess-board. |
| C13 | Widen the colonnade corridor to z 27.5..31 (3.5 box, 3.3 clear) and add a 3.0-3.2 ceiling slab. Move battCC to (-8.5, 27.5) and ccUps to (-5.5, 31). Wall up hallCC (-4, 29). Re-post K3 #19 at (-8.8, 30.0) facing east. | x -10..-4 | ERR cc 2.4 < 3. F3 / F9: the door pairs faced each other, and hallCC faced C4. C4 near door (-10, 29) is unchanged. |
| C14 | The battery room becomes z 16..27.5 and the UPS room z 31..48. | west strip | Follows C13; both on the 0.5 grid. |
| C15 | New staff door UPS room <-> security room at (-4, 46.5). The operator console shortens to z 43.2..45.6. alarm-sec4 moves to (-3.85, 43.0). | x -4 wall | Track A's way out. Secret approach to the security room. |
| C16 | NOC stair rebuilt as a dog-leg fire stair: 1.3 wide, 2 x 11 risers (0.165 / 0.28). Flights between x 1.4 and 4.2 on z 46.7..48 and 45.4..46.7. Mid landing x 0..1.4 at y 1.8. Foot x 4.2..5.5, z 46.7..48. Top landing x 4.2..5.5, z 45.4..46.7. Slab hole x 0..4.2, z 45.4..48, with rails on its west and south edges and on x 4.2 over flight 1's foot. | security room north strip | ERR fire stair 1.2 < 1.3; F4: 20 risers in one flight (sheet 3: 2-18 per flight, two flights and a landing). |
| C17 | NOC roof access hatch 1.2 x 1.2 at x 6.0..7.2, z 46.6..47.8, with a caged ladder from y 3.6 to 7.3 and deck rails on three sides. | NOC / deck | ERR NOC dead end. Gives the deck its loud approach and Relay's way in. |
| C18 | NOC escape door (8, 45.5, y 3.6). Platform 1.2 x 1.2 at x 8.1..9.3, z 44.9..46.1, y 3.6, with rails, and a caged ladder down to the north corridor at (9.4, 45.5). secNc moves to (8, 43.5). | NOC east wall | NOC third approach (shadow). A staffed mezzanine needs a second exit. Keeps Marlow's bolt point (28, 45.8) clear. |
| C19 | NOC rooflight, fixed wired glass, x 0..4, z 43.5..45.5 in the roof slab. | deck / NOC | The SPEC's "NOC roof light" observation point (F7, never built). The NOC's vantage, and the lead spot for sync-s4-noc. |
| C20 | NOC lights: one lamp at (1.0, 6.4, 43.6) over the window seats; the east lamp goes. Security room: the two lamps become one warm 2.4 m console lamp at (-2.0, 44.6). | NOC, security room | Shadow 0.02 / 0.01 -> 0.45 / 0.5. The stair head, the hatch and the escape door are dark. |
| C21 | Compound: one 6.0 m flood over the tanks at (37, 30) instead of two. The gate end, the dock door end and the north end are dark. | x 34..40, z 16..48 | Shadow 0 -> 0.45. Shadow approach via the dark north end. |
| C22 | New cable-pull door from the compound into the riser at (34, 46.5), keypad on the plant-doors code. Riser partition moves from x 30.6 to 30.5; kpDeck is now at (30.5, 45) and gets a second keypad on its riser side (Marlow). | riser 3.5 x 6 | Yard shadow approach. Off-grid 3.4 / 22.6 fixed. |
| C23 | Plant ladder (34.6, 23): the lower 4.4 m sits behind a locked anti-climb shield (box 0.6 x 0.3 x 4.4); the ladder runs from 4.4 to 7.3. | compound east wall | CR10 co-op boost (yard and deck co-op). Down is a hang-drop. |
| C24 | Re-class the compound from yard to plant_room. | compound | ERR 6 x 32 < yard 14 x 14 cannot be met inside the section (AS1). |
| C25 | Deck: replace the four 1.5 m chiller task lights with four pole floods 5 m over the deck at (-3, 24), (8, 36), (20, 24), (24, 38) (r 7.5). | deck y 7.3 | Shadow 0.95 -> 0.5. The ladder top, riser hatch, NOC hatch and rooflight stay dark. |
| C26 | Cage downlight (18, 2.8, 37) goes warm. | cage | Light language: the warm lamp is the objective. |
| C27 | Guards: 5 new (#21-#25); #4 moves to the new desk; #12's route goes through the new doors; #19 is re-posted (section 5). | | Michael ~22:00, as many as realistic; above S3 (lead's ramp). |

Not changed: the shell, C3 far door (24, 16), C4 near door (-10, 29), the yard gate, the pods P1-P5, the cage box, the
basket network apart from C10, CR4 and CR5, the cameras (all bulletproof, E8), arm-mantrap and arm-noc (E10), las-tray and
its panel, the alarm panels apart from alarm-sec4's move, and the C4 spine link.

## 2. Spaces, routes, loop, choke, vantage, landmark, light

Approaches per guarded space (validator kinds; the audit's dark / high-or-vent / social-or-tool):

| Space | Dark (shadow) | High / vent | Social / tool (loud) | Secret | Shadow / vantage / LOS | Light language |
| --- | --- | --- | --- | --- | --- | --- |
| s4-dock | goods door from the lobby lane | plenum hang-drop (CR8 boost up) | compound door (floods, gate, dog) | - | 0.46 / C3 door threshold 0.85 / 2 s | Bay light white over the van shelf; board lamp; west half dark |
| s4-lobby | goods door from the dock | plenum ceiling hatch drop | mantrap interlock (CR9) | kp-batt (code) | 0.5 / dark lane at the dock door 0.8 / 1.5 s | Desk and mantrap white (the officer); goods lane dark |
| s4-batt | hallBatt from the hall | plenum drop (CR8-west boost up) | battCC from the colonnade (K3) | kp-batt from the lobby | 0.5 / kp-batt doorway 0.8 / 1 s | Monitor lamp white; aisles dark |
| s4-yard | riser door (dark north end) | hang-drop from the plant ladder (CR10 boost up) | dock east door; hall east door | - | 0.45 / deck east parapet 0.8 / 2 s | Tank flood white (tank watch, dog lane); gate and north end dark |
| s4-deck | R2 from the dark riser | plant ladder (CR10) | NOC roof hatch (staffed room) | - | 0.5 / riser hatch 0.8 / 3 s | Pole floods over the middle; edges dark |
| s4-noc | escape ladder from the north corridor | fire stair from the security room | roof hatch from the deck | - | 0.45 / deck rooflight 0.75 / 2 s | Window-seat lamp white; east end dark; screens glow |
| s4-sec | secNc from the north corridor | the NOC stair | secDoor from the hall | UPS staff door | 0.5 / stair mid landing 0.8 / 1.5 s | Console lamp warm (the tool / objective) |
| s4-hall | hallBatt, ncDoor | basket drops (CR4 boost up) | mantrap inner door, secDoor, hall east door | hallUps (UPS back room) | 0.46 / the basket run 0.75 / 2 s | Cold aisles white (patrolled); pods and baskets dark; the cage warm |

All shadow, vantage and line-of-sight values are declared targets, measured in greybox (V6).

- Loops: every guarded space has 2+ doors on its dark route or a vent alternative. Section loops: lobby -> battery -> plenum -> lobby; hall -> UPS -> security -> north corridor -> hall; compound -> riser -> deck -> plant ladder -> compound; NOC -> stair -> security -> north corridor -> escape ladder -> NOC.
- Choke: K3, the colonnade sentry #19, at C4's near door (-10, 29), post leash 5. Both tracks pass him on the way out: one lures with the colonnade lights, the other slips by.
- Scouting vantages:
  - The basket run sees the hall's four awake patrols (#7, #8, #20, #22) and the keyholder.
  - The deck parapet sees the compound's three moving guards.
  - The NOC window, once taken, overlooks the whole hall floor. It is the overwatch spot for split s4r and Marlow's twist.
- The goal is visible before you reach it: the cage's warm glow shows over the pod roofs from the west aisle and the build-out area, from the baskets, and from the NOC window.
- Landmark (one): the NOC window band. It is an 11 m lit strip of screens at 4.6-6.6 m on the hall's north wall, and it frames "the control suite on the north side" from anywhere on the hall floor.
- Dark by reason: the plenum (nobody works there), the goods lane (on the dock circuit, off after the 03:00 unload), the battery aisles (only the monitor lamp burns), the north corridor, the riser, the hot aisles, and the compound north end (the generator panel is on standby).

## 3. Sync nodes (graph `syncs` array; Marlow's ids where he named them)

| id | kind | space | src | lead | track | helps |
| --- | --- | --- | --- | --- | --- | --- |
| sync-s4-dockboard | code_source | s4-dock | built, `campusS4Data.ts:202` (board (16, 1.5, 21.85), grants s4-codes) | s4-dock (the board, now lit) | B | A: kp-deck from the riser side; kp-riser at (34, 46.5) for a one-player Relay |
| sync-s4-desk | camera_loop | s4-sec | built, `campusS4Data.ts:164-166` (desk-sec4) | s4-nc (the side door behind the operator, (8, 43.5)) | A | B: cam-cage, cam-mantrap, cam-dock4 |
| sync-s4-noc | code_source | s4-noc | planned (the NOC console release, issued by interrogating #14 Dunmore) | s4-deck (#13's radio stop at (12, 36)) | A | B: the release |
| sync-s4-cagekp | code_sink | s4-cage | planned (release prompt on the terminal (18, 0, 38.3); 30 s, solo 90 s) | s4-hall (#9's line at (18, 33)) | B | all: the download opens C4 |
| sync-s4-ess-board | power_cut | s4-batt | planned (E4 board pattern, `campusS4.ts:164`) | s4-batt (board label, #12's line) | B | A: the NOC and security room go dark for 25 s |
| sync-s4-yard-board | power_cut | s4-dock | built, `campusS4.ts:164` (compound board, 20 s) | s4-dock | B (at the shared start) | A: the compound flood goes off for the crossing |

Marlow's other placements:
- **Rules.**
  - No alarms: the panels alarm-sec4 (-3.85, 43.0), alarm-mt (5.0, 21.85) and alarm-dk (14.15, 20.8), plus the three cameras.
  - Relay may question only #14 Dunmore. The decoy is #15 Pryce, at the window seats x 1.0 / 3.0, y 3.6.
  - Vault: no bodies found. Hide spots: battery room SW (-9.2, 17.2), hall NW (-3.2, 41.2), UPS north (-7.2, 47.2), and a new one in the lobby alcove (12.6, 21.3).
- **Leads.**
  - lead-s4-deckradio: #13's radio line at his stop (12, 36), planned.
  - lead-s4-roster: the duty roster on the security room's west wall at (-3.85, 45.2), planned. It is solo's lead.
  - Dunmore's seat placard on the west window seat (1.0, 3.6, 43.0), planned.
- **Other points.**
  - Spook bolt point (28, 45.8) in the north corridor by the riser door, planned; nothing new stands near it.
  - Footage wipe: a second action at desk-sec4, planned, optional objective.
  - A keypad on the riser side of kp-deck (30.5, 45), planned.
  - #20 walks to the cage on the release: west aisle (-2.5, 33) -> north strip z 33 -> cage front (17, 33.5). The path stays open; the new #22 loop crosses it, which is his overlap partner.

## 4. Guards (25, dog included; was 20)

| Space | Count | Guards (post / patrol, archetype, gear) |
| --- | --- | --- |
| s4-dock | 2 | #17-18 dock pair, grunts, staggered timed loop (42 s), helmets |
| s4-lobby | 2 | #4 mantrap officer at the desk (1.3, 20.1) facing the interlock; **#21 goods-in officer** (new, officer, back-and-forth (12.5, 19.6) <-> (5.0, 19.6), 4 s stops, ~30 s; a talking pair with #4 at the west stop) |
| s4-batt | 1 | #12 battery checker, grunt, route (-5.5, 38) -> (-5.5, 31.5) -> (-8.5, 27) -> (-8.5, 19) through ccUps / battCC |
| s4-yard | 4 | #1 handler + #2 dog (44 s loop, x 35.3 / 34.8); #3 gate officer (37, 17.6); **#23 tank watch** (new, grunt, post (38.5, 31) facing south: "diesel stolen twice") |
| s4-deck | 2 | #13 deck patrol (12..30, 36; the radio lead); **#24 chiller watch** (new, grunt, post (18, 30.0) facing east, waiting on the chiller engineer) |
| s4-noc | 2 | #14 Dunmore (duty officer, west seat), #15 Pryce (east seat); officers with body armour |
| s4-sec | 3 | #5 operator; #6 site supervisor (armour); **#25 night runner** (new, officer, back-and-forth from the desk (0, 43.2) to the side door (7, 43.5), ~30 s, takes the log up to the NOC) |
| s4-hall | 7 | #7 / #8 cold-aisle loops; #9 keyholder (18, 33); #10 / #11 hot-aisle checkers (dormant); #20 mobile supervisor (west aisle; the twist); **#22 second keyholder** (new, officer, loop round the cage (13.5, 33) -> (13.5, 40.8) -> (22.5, 40.8) -> (22.5, 33), ~40 s, dual custody) |
| s4-nc (note) | 1 | #16 tour (dormant) |
| s4-cc (note) | 1 | #19 K3 colonnade sentry (posted, leash 5, c4-gate) |

- Everyone wears a helmet. The NOC pair and the supervisor also wear body armour (stealth over shooting).
- The first dog is released at alarm stage 2 (stageActions unchanged).
- Caps:
  - 25 + perStage 2 x alarmMax 3 = 31 <= `SECTOR.maxAlive` 32 and `MAX_ENEMIES` 32.
  - Awake on screen: at most ~9 from the hall floor (7 in the hall - 2 dormant + 2 seen through the NOC glass), ~8 from the dock, ~4 from the deck. All under ~12.
- Ramp: S3 plans about 20+, so S4 at 25 is above it. **S5 can only reach 26** (32 - 6) unless the alive cap or the alarm budget changes.

## 5. Co-op moves, split numbers, solo path

| Move | Spot | Solo bypass |
| --- | --- | --- |
| CR4 / CR4-west (as built) | boost onto B1 at (4.8, 34) / (2.4, 34), lip 4.4 | the riser ladders |
| CR5 (as built) | the cage's rear pair gate (18, 40) | the front gate |
| CR8 / CR8-west (new) | boost into the plenum from the dock (14.6, 20.2) / the battery room (-4.8, 20.2), lip 4.4 | the plenum from baskets B1 / B2 |
| CR9 (new) | mantrap interlock: desk release + door reader, 6.4 m, 1.0 s | kp-batt (the E10 quiet bypass) |
| CR10 (new) | the plant ladder shield, lip 4.4 | kp-riser door, R1, R2 |

- Co-op links touch 6 of 8 S4 encounter spaces (dock, lobby, battery room, compound, deck, hall).
- Every co-op top is solo-reachable another way (no softlock). The validator finds no solo twin.

**Split s4r (validator-checked; the relay moment):**
- Leg a is s4-sec: Relay at the desk.
- Leg b is s4-hall: Vault working to the cage.
- The fork is the north corridor; the rejoin is the UPS room.
- Leg times: a 24.2 s, b 28.8 s, parity 16% (limit 20%).
- Partner reach: 6.5 s through secDoor (limit 15 s).
- Overwatch: the NOC window. Assist: the cage front gate, opened by the camera loop.

**Team tracks (2+2):**
- Track A (Relay): C3 door, dock east door, compound, CR10 or kp-riser, deck edge, NOC hatch, NOC, fire stair, desk, UPS door, UPS room, colonnade, C4. About 100 m plus ~17 s of climbs, ~95 s of walking at 1.3 m/s.
- Track B (Vault): C3 door, goods lane, kp-batt, battery room (ess board), hallBatt, P2 hot aisle, cage, hallUps, UPS room, colonnade, C4. About 115 m, ~90 s.
- Track parity is about 5%.
- These are team tracks, not partner splits: each team's pair stays together, so the 15 s reach applies inside a team.
- With 2 players (1+1), the relay moment is the split above (7 s apart).
- Marlow's chart has Relay taking the plant ladder alone. That ladder is now co-op (CR10), so a one-player Relay goes in by kp-riser (34, 46.5), using Vault's dock board code. This is a real sync.

**Solo path (one player, every node in sequence):**
1. Dock board, then the goods lane and kp-batt.
2. Battery room: the essential board, optional; the security room is 22 m away, inside its 25 s.
3. hallBatt, then the west aisle to secDoor and the security room: take the roster lead, loop the cameras.
4. The fire stair to the NOC: question Dunmore. The release is the 90 s maintenance release.
5. Back down, through secDoor to the cage front: deal with #9, then the terminal and the download.
6. hallUps, the UPS room, the colonnade (K3), C4.

About 130 m of path. Marlow puts it at ~26 min with waits.

## 6. Validator counts (S4 lines only)

| Run | ERR | WARN | Source |
| --- | --- | --- | --- |
| Before (as built) | 28 | 31 | `docs/level-validator/campus-run/run.txt`. The as-built S4 graph was the plan copy before this change: 28 ERR by rule (rule of three 14, targets 6, class size 5, camera floor 1, fire stair 1, dead end 1); 32 WARN lines name s4, one of which is S3's C3 link. |
| After (this plan) | **0** | 29 | `node scripts/level-validate.mjs docs/sector-redesign/graph/plan/campusOps-S{1..5}.json`, 2026-10-24 ~23:05. The whole map has 0 errors and 116 warnings. Fix round 2026-10-25: the map has 0 errors and 119 warnings; the exfil tag moved off s4-cc into the graph's `tracks` block (`"tracks": {"exfil": "s4-cc"}`, as S2), so the map-level WARN "exfil 's4-cc' is not in the last section" is gone. |

The remaining S4 WARNs are justified:
- Ceilings out of class range (10): the hall, plant rooms and cage are 7.0 m to the roof; the NOC and security room are 3.4.
- Rooms over their class maximum (6): hall, lobby, compound, NOC, security room, north corridor.
- Custom class (3): mantrap, plenum, baskets.
- Basket headroom 2.6 (1).
- C4 width 5.7 off the grid and outside 3.5-4 (2): the unchanged spine link.
- Guard counts below the late band 6-10 (7): every guarded space except the hall. The rooms are too small to hold more, and the per-section caps above bind first.
- Pacing: no WARN.

## 7. Held items (not solved by this plan)

1. **CR4 partner reach (as built): an accepted exception, stated on S4.md line 19.** A partner downed on the baskets is ~12 s from the floor by the drop. The floor partner needs ~25 s to climb back up by the riser (R1), which breaks the 15 s rule inside a team.
   - Fix round 2026-10-25: no clean fix found. Reach = floor walk / 3 m/s + 4.4 s ladder + basket walk / 3 m/s (`rules.reach_speed_mps` 3), so every basket point needs a ladder top within ~16 m along the baskets. The comb (B1, B2, B3 teeth of 17-19 m, B-N 29.5 m, B-cage) is ~85 m long.
   - A north-wall ladder at (12, 41.9) onto B-N would bring the CR4 run under 15 s (CR4 box 13.1 s, B-cage south end 13.4 s). But it is 10 m from the CR4 boost spot: one player climbs there instead, so CR4 gets a solo twin and the co-op move is pointless. The B1 / B2 south ends stay at ~21 s anyway.
   - The checker's B3 ladder (26.8, 23) fixes only B3 (~16 s at its north end) and leaves the CR4 run at ~25 s.
   - A shielded ladder unlocked from the basket side only (the C23 shield pattern) would keep CR4 two-player, but that is a plain one-player `SectorBolt`, which A21 / EG11 rule out. As a new device it would be an engine cost.
   - Undo (if Michael wants the rule kept over CR4): add the (12, 41.9) ladder in G4.2 (+0.5 h) and drop CR4 / CR4-west (co-op coverage 4 of 8, still half).
2. **Code Relay mechanics are Marlow's.**
   - The named interrogation and the release window are his.
   - So are per-area alarm stages (EN2) and the #20 twist (Guard AI).
   - So are the footage wipe, the leads and the bolt point.
3. **CLOSED 2026-10-25:** Marlow's step 2B now runs the s4-lobby goods lane (C1), not the old `s4-svc` (feature/mission-sync 9cb3a627).
4. **The hall vantage** is the basket run as a whole. No single point reaches 0.7 over 3.0 m pods; one would need a hall gantry at 6 m (+2 h).
5. **No-alarm rule and the mantrap.** cam-mantrap sees anyone using CR9 unless the desk loop is up. That makes CR9 Relay-dependent for Vault (intended).

## 8. Assumptions (each with its undo)

- **AS1** The dock is re-classed to `storage` (a goods-in bay) and the compound to `plant_room`. The sheet minimums (21 x 28, 14 x 14) cannot fit inside the shell.
  - Undo: keep the classes and accept 2 ERR, or grow the shell east (moves the section bounds).
- **AS2** The merged lobby is `security_room` class, 6 x 18 box (clear 5.7, under the 6.0 camera floor by the wall thickness, as every as-built box is read).
  - Undo: option 2 on the page (a separate corridor and lobby; the hall wall moves).
- **AS3** 25 guards: above S3 (~20+), leaving S5 one step (26) under the 32-alive cap.
  - Undo: drop #22 (24) or #25.
- **AS4** The NOC and security room are encounters again, because Track A walks them (V5f-3 rule 2).
  - Undo: route A round them (it then loses its code source).
- **AS5** The hall vantage is the basket run as a union (0.75).
  - Undo: add the 6 m gantry (held item 4).
- **AS6** The mantrap outer door is a pair gate (CR9). Solo goes loud through the compound's hall east door or quietly through kp-batt.
  - Undo: a plain door again (the lobby loses its co-op link; coverage stays at 5 of 8).
- **AS7** The plant ladder is co-op (CR10). A one-player Relay uses kp-riser.
  - Undo: remove the shield (the yard and deck lose their co-op link; still 0 ERR, coverage 4 of 8).
- **AS8** The cage front gate stays a plain door. Marlow's sink is the terminal prompt, so the earlier keypad idea was dropped.
  - Undo: none needed.
- **AS9** The light changes (C5, C7, C12, C20, C21, C25) are sized by the 1.5 x mount-height rule.
  - Undo: V6 measures them; re-aim in the greybox fix round.
- **AS10** sync-s4-ess-board and sync-s4-yard-board are Sector Ops extras beyond Marlow's four.
  - Undo: delete their entries; nothing else depends on them.
- **AS11** S4_ROUTES is rewritten in greybox:
  - stealth via the goods lane, the battery room and the hot aisles;
  - loud via the interlock and the cold aisle;
  - high via CR10 or kp-riser, the deck, R2 and the baskets.
  - Undo: keep the old points where the walls allow.

## 9. Greybox cost (after sign-off; Sonnet builds from an Opus brief, Opus checks)

| Slice | Content | Hours |
| --- | --- | --- |
| G4.1 South band | C1-C8: walls, slab, mantrap, desk, cages, doors, lights, switches, cam move, dock relight, S4_ROOMS | 2.5 |
| G4.2 Plenum | C9-C11: grilles, B1 / B2 run-on, hatch, CR8 lips in `CAMPUS_COOP_LIPS` with the lip unit tests, racks 2.0 | 3.0 |
| G4.3 West strip | C12-C15: colonnade, slab, door moves, hallCC infill, UPS-security door, battery lamp, ess board | 2.0 |
| G4.4 NOC block | C16-C20: dog-leg stair, slab hole and rails, roof hatch and ladder, rooflight, escape door / platform / ladder, lights | 3.0 |
| G4.5 Compound, riser, deck | C21-C25: flood, riser door and keypads (both kp-deck sides), shield and CR10 lip test, partition, deck floods | 2.5 |
| G4.6 Data and tests | Guards #21-#25 and moves, CR9 pair gate data, routes, sync data hooks, `campusS4.test.ts` / NOC sight / nav flood updates | 3.0 |
| **Total** | | **~16 h (2 days)** |
