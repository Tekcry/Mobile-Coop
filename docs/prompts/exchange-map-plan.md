# Kestrel Exchange - paper plan (Phase 1)
Spec: docs/prompts/exchange-map.md | Progress: docs/prompts/exchange-map-progress.md | Rules: docs/level-design.md
Coordinates: x east, z north, yaw 0 = +Z (yaw pi/2 = +X). `c` = centre, `s` = size (x, y, z). Heights are floors above y 0.
Phases 2-3 build exactly this; every deviation goes under Decisions with the reason. A nudge of <= 0.25 m to make a set piece
engage is a Decision, not a plan change. Numbers marked (e2e) are to be confirmed in the running game.

## 0. Global

### 0.1 Standing rules (from the Phase 0 findings and Michael's approvals)
- Perimeter: `perimeter(-32, 32, -20, 20, 8.0, PL)`, with `from = b.boxes.length` before it and `mark(from, {noLedge})` after.
- Every wall and wall header is `noLedge`: structural walls (6.5 m), the S5 office walls (3.1 m), door / window headers and
  sills, the plant block. Lips come only from the pieces this plan names (shelves, cabinets, catwalks, podiums, boilers, piers,
  galleries, the C3 block, the roof strips). Cover faces and split gaps are unaffected by `noLedge`.
- Each door gap gets a header box (2.1 m up to the wall top) because `wallX / wallZ` leave the gap open full height.
  Windows use `windowX / windowZ` (sill + header + `windowAt`), with a matching 1.2 m gap, or the same pieces by hand where the
  storey base is not 0.
- Roofs are `box(..., false)` (no collision). Only the S4 roof strips, the S5 archive slab, the catwalks, podiums and
  galleries are solid.
- One wait per guard (`SquadSlot.wait`); facing while paused is the next leg's direction.
- Hyphens only.

### 0.2 Palette (names used below)
PL plaster `#9c9486` | PAN panelling `#4a3b2e` | BAK bakelite `#1f1c1a` | GRN enamel `#3f5e4f` | BRS brass `#b08d4a` | OXB oxblood `#6e2f2a` |
TER terrazzo `#8a857b` | IRON `#3c4146` | RUST `#7a4a2c` | CARP `#4f3a46` | GLS `#1b2430`. Eleven colours, so the voxel palette stays
under 256 even with surface kinds.

### 0.3 Theme and registration
- `MapDef { id: 'exchange', name: 'Kestrel Exchange', modes: ['infiltration', 'clear', 'sandbox'], weathers: ['clear','rain','fog'] }`, no `art`.
- Theme: `sky '#080b12'`, `horizon '#121823'`, `ground '#181b20'`, `fogStart 22`, `fogEnd 80`, `sunDir [-0.4,-0.8,0.3]`,
  `sunIntensity 0.14`, `ambient 0.2`, `lightLevel 0.1`, `floor 'concrete'`, `faction 'urban'`,
  `grade {tint [0.95,0.97,1.1], saturation 0.8, contrast 1.12}`.
- `MAPS` appends `exchange` (Warehouse stays first); `LISTED_MAP_IDS` appends `'exchange'`. Unit-test edits: `tests/rooms.test.ts:138`
  (ids list), `tests/missions.test.ts:26` (listed missions may be on `exchange`).
- Exported: `EXCHANGE_COOP_LIPS` (section 8).

### 0.4 Lamp circuits (`group`) and switches
| Group | Lamps | Switch (pos, yaw) | Start |
| --- | --- | --- | --- |
| 0 | S0 walkway | (-31.9, 1.4, -14.5) pi/2 | on |
| 1 | S1 La, Lb | (-15.0, 1.4, -6.3) pi | on |
| 2 | S2 desk | (-6.0, 1.4, -6.3) pi | on |
| 3 | S3 stairs | none (shoot) | on |
| 4 | S4 door lamp | none (shoot) | on |
| 11 | S5 office S1 | (14.3, 1.4, 8.9) pi | OFF (dark side-door office) |
| 12 | S5 office S2 (download) | (18.4, 1.4, 8.9) pi | OFF |
| 13 | S5 office S3 | (22.7, 1.4, 8.9) pi | OFF (kick-through office) |
| 14 | S5 office N1 | (14.3, 1.4, 11.9) 0 | on |
| 15 | S5 office N2 | (21.1, 1.4, 11.9) 0 | on |
| 16 | S5 corridor east lamp | (25.8, 1.4, 11.9) 0 | on |
| 17 | S5 reception (2 lamps) | (30.0, 1.4, 19.7) pi | on |
| 18 | S5 archive | (8.4, 1.4, 12.0) pi/2 | on |
| 6 | S6 central, door, gallery-door, stair, clock-side lamps | none (shoot) | on |
| 7 | S7 loading lamps (2) | (-31.9, 1.4, 12.0) pi/2 | on |
Switch yaw faces out of the wall (a wall on the room's north side faces pi).

### 0.5 Light pools used for every lamp
Lamp at 3.0-3.8 m, intensity 0.9-1.0, radius 6-7. A chest at 1.3 m is `lit` (>= 0.6) within ~3 m horizontally, between 0.28 and
0.6 out to ~4.5 m, and in `shadow` (< 0.28, ambient 0.12) beyond ~5 m. Every "dark pocket" below is >= 5 m from any lamp.

### 0.6 Rooms (`MapLayout.rooms`; 9 rects, none overlapping; the gallery over the ground floor split by `minY`)
| id | name | x | z | y |
| --- | --- | --- | --- | --- |
| s0 | Culvert | -32..-24 | -20..-6 | |
| s1 | Sorting Room | -24..-8 | -20..-6 | |
| s2 | Switchboard Hall | -8..12 | -20..-6 | |
| s3 | Boiler Room | 12..32 | -20..-6 | |
| s4 | Light Well | 12..32 | -6..6 | |
| s5 | Records Wing | 8..32 | 6..20 | |
| s6 | Exchange Floor | -12..8 | -6..20 | maxY 3.0 |
| s6g | Exchange Gallery | -12..8 | -6..20 | minY 3.0 |
| s7 | Service Tunnel and Lift | -32..-12 | -6..20 | |

### 0.7 Guards (9; slot = first point of the route)
| Id | Kind | Room | Slot (x, z, yaw, y) | Route (loop unless noted) | Wait | Est. cycle |
| --- | --- | --- | --- | --- | --- | --- |
| G1 | grunt | s1 | (-12.8, -13.0, ., .) | A (-12.8,-13.0) pool; B (-22.9,-11.1) west connector; E (-9.2,-10.1) exit door | 4.5 | 43 s |
| G2 | grunt | s2 | (-5.0, -10.1) | W (-5.0,-10.1); M (0.0,-10.1) under the split; D (6.0,-13.2) desk, under the pipe | 4.5 | 38 s |
| G3 | grunt | s3 | (27.8, -11.2) | R1 (27.8,-11.2) by the cage; R2 (22.0,-14.4) stairs foot; R3 (13.9,-15.0) by the W catwalk lip | 3.5 | 42 s |
| G4 | grunt | s4 | (19.0, -0.6) | Q1 (19.0,-0.6); Q2 (25.0,-0.6); D4 (25.7,4.5) door, under the rope; Q3 (19.0,3.2) | 4.0 | 38 s |
| G5 | officer | s5 | (21.4, 10.4) | ping-pong: Pa (21.4,10.4) at the open window of the download office; Pb (11.2,13.8) archive, under the hatch | 4.0 | 35 s |
| G6 | sniper | s6g | (-1.0, 18.3, pi, 3.6) | post (north gallery lip) | - | - |
| G7 | heavy | s6 | (-8.2, 10.0) | H1 (-8.2,10.0) under the pipe; H2 (0.0,9.5) lamp pool; H3 (2.0,5.0) dark rows | 3.5 | 40 s |
| G8 | grunt | s7 | (-27.0, 15.2, pi/2) | post, facing G9 | - | - |
| G9 | grunt | s7 | (-25.8, 15.2, -pi/2) | post, facing G8 | - | - |
Cycle = path length at the patrol pace (walk speed x 1.1: grunt 0.99, officer 0.94, heavy 0.83 m/s) + points x wait; path lengths
measured on the plan with ~10% for corners. Phase 4 measures the real ones (e2e). Every slot is >= 7 m from the spawn (-28, -18).

### 0.8 Mission `exchange-deadline` ("Dead Line")
Insertion `culvert` (-28, 0, -18, yaw 0). Objectives in order (all sites on a floor, dark, out of view of the guard's planned spot):
1 intel `s1-ledger` items [(-9.0, 0, -18.4)] | 2 plant `s2-trunk` (10.0, 0, -17.2) 3 s | 3 sabotage `s3-valve` (25.7, 0, -7.6) 4 s |
4 intel `s4-phone` items [(15.4, 0, -4.6)] | 5 download `s5-logs` (20.4, 0, 7.3) 30 s | 6 plant `s6-tap` (-2.0, 3.6, -4.7) 4 s |
7 extract `s7-lift` (-30.2, 0, 18.6) radius 2. Rules `noAlarms noKills undetected` = bonus. `squads 'rooms'`.
Layout extras: `reinforce` [(-28,0,-16), (-30,0,13)]; `alarms` (31.95,1.4,14.5) -pi/2 | (5.45,1.4,14.5) -pi/2 | (-30.0,1.4,9.5) 0;
`enemySpawns` the nine slots; a few props / pickups in dark pockets (ammo / health at (-22.9,0,-18.6), (14.4,0,-11.0), (-23.0,0,18.5), (30.8,0,7.4)).

## 1. S0 Culvert (no guard; dark 0.08; the only exit is the duct)
Zone: `ambientZone(-31.85,-24.3,-19.85,-6.15, 0.08)`. Floor concrete. Spawn (-28, 0, -18) yaw 0. Teaches: gears, light meter, noise meter, crawl, landing bands.
| Piece | Call | Place | Purpose |
| --- | --- | --- | --- |
| Floor | `floor` | x -32..-24, z -20..-6 | |
| S0/S1 wall | box (thick 0.6, 6.5 m, noLedge) | c(-24.0, 3.25, -13) s(0.6, 6.5, 14) | holds the vent |
| S0/S7 wall | wallX z=-6 x -32..-24, 6.5, noLedge | | |
| Walkway lamp | `light` lamp r7 I0.95 sodium group 0, fixture 0.9x0.12x0.25 | (-29.4, 3.0, -13.5) | the one lit pool |
| Switch | layout `switches` | (-31.9, 1.4, -14.5) pi/2 group 0 | kill it, S0 is black |
| Pump plinth | box rust | c(-29.8, 1.3, -9.0) s(2.4, 2.6, 2.4) | lips 2.6: standing grab, hang, shimmy, climb up, hold B lowers in; walking off the north side is a 2.6 m fall = roll band (noise 5 m); the 1.8 m back gap is free |
| Valve housing | box iron | c(-28.9, 0.65, -15.1) s(1.4, 1.3, 1.4) | 1.3 m mantle then a soft drop (landing band soft) |
| Channel curbs | 2 x box iron (low cover) | c(-27.05, 0.55, -14) and c(-25.55, 0.55, -14), s(0.3, 1.1, 10) | the 1.2 m lane (inner faces x -26.9 / -25.7), z -19..-9, for the forward roll |
| Grate strip | `surface('grate', -26.9,-25.7,-14.6,-13.2, 0)` + dark box (no collide) | | the noise meter reacts above gear 2 standing |
| Entry vent | `duct` entry `Grate` wall | pos (-24.3, 0.6, -9.5) n(-1,0,0) | kick (tap < 0.3 s, 10 m noise, 4.5 m through the wall) or unscrew (hold, silent) |
| Duct | `duct(path, entry, exit)` | path (-24.0,0.1,-9.5) -> (-24.0,0.1,-19.2); exit grate wall pos (-23.7, 0.6, -19.2) n(+1,0,0) | one way into S1's south-west pocket |
| Duct casing | box (no collide) | along the path | visual |
Dark pockets: all of S0 beyond 5 m of the lamp (the spawn is dim, ~0.33). Entry vantage: none (no guard). Hide spot: none.
Anchors: 1 duct, plinth lips. Splits: none. Tall faces: S0/S1 wall, perimeter only.

## 2. S1 Sorting Room - "Shadows" (G1; wood floor; aisles dark 0.12)
Zone `ambientZone(-23.7,-8.15,-19.85,-6.15, 0.12)`; `surface('wood', -23.7,-8,-19.85,-6.15, 0)`.
| Piece | Call | Place | Purpose |
| --- | --- | --- | --- |
| Floor | `floor` TER | x -24..-8, z -20..-6 | |
| North wall | wallX z=-6, x -24..-8, 6.5, noLedge | | |
| East wall | `wallZ` x=-8 z -20..-6 gaps [-14.0,-12.8] (window) [-10.7,-9.5] (door), 6.5, noLedge | + door header | |
| Mail shelves R1-R4 | 4 x box PAN | c(-18.4, 1.3, z) s(8.0, 2.6, 0.6), z = -18.2, -15.4, -12.6, -9.8 | aisles 2.2 m; tops 2.6 = standing grab, walk the tops, above takedown, jump between rows (gap 2.2) |
| Exit door | `door(-8, 0, -10.7, 1.2, 0, {swing 1})` | | quiet 1.1 s or sprint bash |
| Exit window | `windowZ(b, -8, -13.4, 0, 6.5, PL, {open: true})` | | sill 0.9, 2.7 m from the door |
| Table T1 | `lowCover`-style box GRN | c(-12.0, 0.5, -14.2) s(2.4, 1.0, 1.0) | low cover, lamp La above |
| Table T2 | box GRN | c(-11.2, 0.5, -7.8) s(2.2, 1.0, 0.9) | low cover near the door |
| Mail cart | box RUST | c(-13.4, 0.65, -9.0) s(1.0, 1.3, 0.7) | low cover / step |
| Chute hopper | box IRON | c(-19.0, 2.45, -6.5) s(1.6, 0.9, 0.7) | lip 2.9: the manual-jump grab (standing grab does not reach) |
| Lamp La | lamp r7 I0.95 sodium group 1 + fixture | (-13.2, 3.0, -14.6) | pool over T1; the window side is outside it |
| Lamp Lb | lamp r6 I0.95 sodium group 1 + fixture | (-9.6, 3.0, -10.3) | pool at the exit door |
| Switch | `switches` | (-15.0, 1.4, -6.3) pi group 1 | reached by the dark north aisle |
| Hide spots | `hideSpots` | (-8.7, 0, -7.0) cage by the exit; (-12.6, 0, -6.9) by the tables | carry and hide |
| Intel | mission item | (-9.0, 0, -18.4) | dark corner (Lb 8 m away, La 5.9 m) |
Duct exit pocket: (-22.95, 0, -19.2) between R1 and the south wall (1.5 m deep), the entry vantage V1. Dark pockets: pocket, west connector
(x -23.7..-22.4), north aisle, south-east corner.
G1: slot A; he walks A -> aisle z=-11.1 -> B (faces east, the next leg) -> E (door, faces the lit room) -> A. The S0 vent is 2.1 m from B
(through the wall: heard by a kick, not by the unscrew). Approaches: the aisles or the window; kill group 1 / shoot Lb and take him in the
dark; grab; shelf tops (above); over-cover at T1 / T2; loud.
Self-check: no tall faces except walls. Shelf tops are free lips (2.6): fine, they lead to nothing but S1.

## 3. S2 Switchboard Hall - "Look up" (G2)
Zone `ambientZone(-7.85,11.85,-19.85,-6.15, 0.12)`. Floor TER; the north dark lane is z -8.35..-6.15.
| Piece | Call | Place | Purpose |
| --- | --- | --- | --- |
| Floor | `floor` | x -8..12, z -20..-6 | |
| North wall | wallX z=-6 x -8..8, 6.5, noLedge (plant block x 8..12) | + high glazed window below | |
| High window | box sill + header + `windowAt(-7.0, 4.4, -6.0, 1.2, 1.2, 0, {sill: 3.8, breakable: true, open: false})` | gap x [-7.6,-6.4] y 3.8..5.0 | glazed: the player sees the S6 clock, guards cannot see through (rule 12) |
| South bank | box GRN noLedge | c(0, 2.0, -11.4) s(6.0, 4.0, 0.8) | split wall (inner face z -11.0) |
| North bank | box GRN noLedge | c(0, 2.0, -8.75) s(6.0, 4.0, 0.8) | split wall (inner face z -9.15); gap 1.85, 6 m; lane z -8.35..-6.15 behind it is 2.2 |
| Desk | box PAN (low cover) | c(6.0, 0.5, -14.5) s(2.2, 1.0, 0.9) | |
| Desk lamp | lamp r6 I0.9 sodium group 2 + fixture | (6.0, 3.0, -14.5) | the pool |
| Pipe | `pipeH(6.0, -7.0, 6.0, -18.5, 4.4)` | x 6.0, z -7.0 .. -18.5 | hands, legs up, inverted over G2 at the desk and over the dark north end |
| Cable cabinet | box IRON | c(6.0, 1.3, -7.6) s(1.6, 2.6, 0.9) | jump grab onto the pipe (up 1.8, pipe 0.3 away); dark; V2 |
| Relay bank | box GRN | c(11.35, 1.65, -16.5) s(1.0, 3.3, 3.0) | lip 3.3: wall jump from x ~10.3; perch 1.0 deep |
| Perch window | wall x=12: lower block c(12, 1.65, -16.5) s(0.3, 3.3, 1.2); `windowZ(b, 12, -16.5, 3.3, 3.2, PL, {open: true})` | sill 4.2 | onto the S3 catwalk (3.3) |
| Doors | x=-8 door (shared with S1), x=12 `wallZ` gap [-10.7,-9.5] + door + header | z -10.1 | straight through the lane |
| Switch | `switches` | (-6.0, 1.4, -6.3) pi group 2 | |
| Hide spots | | (-6.8, 0, -7.0); (9.5, 0, -19.0) | |
| Junction box (plant) | mission | (10.0, 0, -17.2) | dark: the desk lamp is 5.0 m away |
Splits: exactly one gap (banks). The banks' tops (4.0, band 3.75-4.5) are `noLedge`. The pipe at 4.4 is a ground boost target; it has the solo
route (cabinet), so it is allowed. Entry vantage V2: the cabinet top (6.0, 2.6, -7.6): dark, sees the desk and the lane mouths, G2 passes
M / W out of its sight but the cycle is readable from the lane mouths. Dark pockets: NW corner, north lane, cabinet foot, junction, south strip.
Risk (e2e): the spec's cable bundle on the pipe cannot be built: nothing reads obstacles on a pipe shimmy (the attached body is kinematic), so
legs up changes only the pose and the aim band. Dropped; a visual-only bundle may hang there (no collision).

## 4. S3 Boiler Room - "Hear yourself" (G3)
Zone `ambientZone(12.15,31.85,-19.85,-6.15, 0.12)`. Floor concrete; `surface('metal', 23.0,29.5,-18.0,-13.0, 0)` (loud plates by boiler B);
catwalk `surface('grate', ..., top 3.3)` on both strips.
| Piece | Call | Place | Purpose |
| --- | --- | --- | --- |
| Floor | `floor` | x 12..32, z -20..-6 | |
| South wall of S4 | wallX z=-6 x 12..32 gaps [12.15,13.15] (catwalk doorway, above 3.3) [29.4,30.6] (cage door) | 6.5, noLedge | + block under the doorway c(12.65, 1.65, -6.0) s(1.0, 3.3, 0.3), cage-door header |
| Catwalk W strip | box IRON | c(12.65, 3.24, -12.975) s(1.0, 0.12, 13.65) | top 3.3, z -19.8..-6.15, hugs the wall (the wall is within 1.3 m of the lip: the wall jump kick) |
| Catwalk N strip | box IRON | c(19.8, 3.24, -6.65) s(13.3, 0.12, 1.0) | x 13.15..26.45, z -7.15..-6.15 |
| Stairs | `stairs(22.0, -9.9, 1.2, 5.5, 3.3, 17, IRON)` | up to the N strip | lit east end; metal |
| Stair lamp | lamp r7 I1.0 sodium group 3 + fixture | (22.0, 3.8, -13.8) | lit stretch |
| Ladder | `ladder(13.6, -17.5, 0, 3.3, -pi/2)` | top (13.15, 3.3, -17.5) | dark SW corner |
| Boiler A | box RUST | c(18.5, 2.2, -8.65) s(3.0, 4.4, 3.0) | top 4.4; flush to the N strip's south edge (a 1.1 step from the catwalk = the solo route); C1 lips |
| Boiler B | box RUST | c(26.0, 1.75, -16.0) s(2.6, 3.5, 2.6) | top 3.5 (spec 3.6; under the 3.6 split height); wall-jump lip |
| Drainpipe | `pipeV(24.6, -16.0, 0, 3.5, pi/2)` | west face of B | solo route to B's top |
| Valve housing | box IRON | c(26.4, 1.0, -8.8) s(0.9, 2.0, 1.4) | breaks the line from the cage to the sabotage site |
| Cage | `fence(27.0,-10.0, 27.0,-6.15, 2.4)` + `fence(27.0,-10.0, 31.85,-10.0, 2.4)` | | no gate: climb (quiet at gears <= 3, rattle 4 m above); holds the ground door |
| Hide spots | | (14.4, 0, -11.0) under the W strip; (28.6, 0, -13.4) | |
| Sabotage site | mission | (25.7, 0, -7.6) | Ls is 7.2 m away; the housing shields it from R1 |
Routes: ghost the floor (silent gears) | W strip lip: hang, drop on G3 at R3 (hands at x 13.15, R3 0.5 away) | B's top: drop on him | climb the cage while he walks away |
the catwalk to the balcony | window from the S2 perch. Standing gear 4 on the grate: 3.44 m x 1.4 = 4.8 m (G3 at R3 is within it). Entry vantage V3: (13.6, 0, -8.2)
under the N strip, dark; R3 is 6.8 m south of it. Dark pockets: V3, the SW ladder corner, south wall, behind boiler A, the sabotage nook.
Boost (C1): braced mate with the back to boiler A's south face (18.5, 0, -10.7); lip (17.0..20.0, 4.4, -10.15).

## 5. S4 Light Well - "The climb" (G4; open sky)
Zones: court `ambientZone(12.2,31.95,-2.5,5.85, 0.3, -1, 9)`; arcade `(12.2,31.95,-5.85,-2.5, 0.12, -1, 4)`; west shade `(12.2,15.5,-2.5,5.85, 0.14, -1, 9)`.
Rain: wet floors come from the weather system (no roof over the court).
| Piece | Call | Place | Purpose |
| --- | --- | --- | --- |
| Floor | `floor` | x 12..32, z -6..6 | |
| Facade wall | `wallX` z=6, x 12..32, height 5.7, thick 0.3, noLedge, gaps below | | S4/S5 wall |
| Facade gaps | dark side door [15.6,16.8] (door + header); open window c=21.0 `windowX(b,21.0,6.0,0,5.7,PL,{open:true})`; glazed window c=24.7 `windowX(.., {open:false})`; entry door [27.0,28.2] (door + header) | | into S5 offices S1, S2, S3 and the reception |
| Roof N strip | box IRON (metal), overhead | c(22.35, 5.85, 6.15) s(18.1, 0.3, 1.5) | x 13.3..31.4, z 5.4..6.9, top 6.0 (cap over the facade wall) |
| Roof E strip | box IRON, overhead | c(31.2, 5.85, 4.4) s(1.5, 0.3, 2.0) | x 30.45..31.95, z 3.4..5.4 |
| Rappel | `rappel(25.4, 6.0, 5.4, pi, 6.0)` | rope hangs south of the cap edge | beside the glazed window (lateral 0.7) |
| Podium (balcony start) | box PL | c(13.4, 1.65, -4.6) s(2.5, 3.3, 2.5) | top 3.3: inside-corner wall jump (south wall + its east face) and the straight one; the S3 catwalk doorway opens onto it |
| Balcony deck | box IRON | c(12.65, 3.24, 1.05) s(1.0, 0.12, 8.8) | x 12.15..13.15, z -3.35..5.45 |
| Drainpipe 1 | `pipeV(12.9, 5.15, 3.3, 6.0, 0)` | base on the deck | to the N strip's west lip (0.4 away) |
| Piers A, B (C2) | 2 x box PL | c(31.1, 2.2, -3.2) s(0.8, 4.4, 2.8); c(31.1, 2.2, 1.4) s(0.8, 4.4, 2.8) | tops 4.4, z -4.6..-1.8 and 0.0..2.8: gap 1.8 to jump; outside corners (free-standing, 0.8 from the wall) |
| Drainpipe 2 | `pipeV(31.9, -5.3, 0, 4.4, pi/2)` | by pier A | solo route to pier A |
| Arcade pillars | 4 x `pillar(x, -2.7, 0.3, 3.4)` | x 16, 20, 24, 28 | |
| Arcade roof | box (no collide) | c(22.1, 3.55, -4.2) s(19.8, 0.3, 3.3) | visual |
| Planter | box (low cover) | c(22.0, 0.45, 0.8) s(3.0, 0.9, 1.2) | |
| Fence | `fence(28.2,-5.85, 28.2,-2.5, 2.4)` | arcade east end | a fence in the open |
| Door lamp | lamp r6 I1.0 sodium group 4 + fixture | (26.6, 3.4, 4.9) | shoot it for the dark |
| Intel | mission | (15.4, 0, -4.6) | the inside corner, dark arcade west |
Routes to S5: the lit entry door; the dark side door (cage door, fence, west along the arcade, north in the west shade); the rope window (glazed:
fast, 15 m noise) or the open ground window (slow, quiet). Routes up: balcony deck -> drainpipe 1 -> strip; drainpipe 2 -> pier A -> standing grab to the
E strip lip (feet 4.4, lip 6.0: 1.6). G4 at D4 is 0.4 m from the rope axis. Entry vantage V4: the balcony deck north end (12.9, 3.3, 4.0), in the west shade.
Dark pockets: arcade, west shade, the pier pocket. Heights: tops above 6.0 none; the perimeter is 8.0 so no step or mantle reaches it.
Boost (C2): braced mate with the back to pier A's west face (30.4, 0, -3.2); lip (30.7, 4.4, -4.6..-1.8).
Risks (e2e): the drainpipe-top climb onto the cap's west lip; the pier-top pipe lip.

## 6. S5 Records Wing - "Doors and corners" (G5)
Zone `ambientZone(8.15,31.85,6.15,19.85, 0.12)`; carpet `surface('carpet', 8.15,26.0,6.15,19.85, 0)`; reception concrete.
Walls 3.1 m, 0.3 m thick (noLedge); wing roof visual at 3.4. West wall x=8 and the facade are structural.
| Piece | Place | Notes |
| --- | --- | --- |
| Corridor | x 8.15..26.0, z 9.2..11.6 (2.4) | carpet; lamp (23.0, 3.0, 10.4) r7 I0.9 cold group 16 (east lit, west dark) |
| South wall z=9.05 | gaps [12.2,13.4] stair room door; [15.0,16.2] S1 door; [16.5,17.7] S1 window glazed (c 17.1); [18.9,20.1] S2 door; [20.8,22.0] S2 window open (c 21.4); [23.2,24.4] S3 door | |
| North wall z=11.75 | gaps [10.6,11.8] archive door; [15.0,16.2] N1 door; [16.5,17.7] N1 window glazed (c 17.1); [18.25,20.65] the stub (no door); [21.6,22.8] N2 door; [23.8,25.0] N2 window open (c 24.4) | |
| Office walls (x) | x=14.0 (z 6.15..9.05 and 11.75..19.85, door [17.4,18.6] N1 -> store), x=18.15 and 22.45 (south), x=18.1 and 20.8 (north), x=26.0 (z 6.15..9.05, 11.75..19.85; opening [9.05,11.75]) | |
| Rooms | South: stair room x 8.15..13.85 | S1 x 14.15..18.0 | S2 x 18.3..22.3 | S3 x 22.6..26.0, all z 6.15..9.05. North: archive x 8.15..13.85, z 11.75..16.6 | store x 8.15..13.85, z 16.75..19.85 | N1 x 14.15..17.95, z 11.75..19.85 | stub x 18.25..20.65, z 11.6..19.85 | N2 x 20.95..26.0. Reception x 26.15..31.85, z 6.15..19.85 | |
| Desks / cabinets | desks low (1.6 x 0.9 x 0.8) one per office; filing cabinets high (0.5 x 1.8 x 0.9) in N1, N2 and S2 | cover-to-cover along the corridor walls |
| T junction | the stub mouth, corner at (20.65, 11.6) | corner takedown |
| Archive slab | 4 solid boxes around a 0.8 hole at (10.6..11.4, 13.4..14.2): top 3.3, x 8.3..13.7, z 11.9..16.8, overhead + noLedge | ceiling; hatch grate (ceiling) at (11.0, 3.3, 13.8) |
| Duct | entry grate wall pos (11.0, 3.6, 16.4) n(0,0,1); path (11.0,3.35,16.2) -> (11.0,3.35,13.8); exit grate ceiling (11.0, 3.3, 13.8) n(0,-1,0); casing box (no collide) c(11.0, 3.65, 14.9) s(1.0, 0.7, 3.0) | entered from the ladder top, left through the hatch (drop 3.3) |
| Ladder | `ladder(11.0, 17.0, 0, 3.3, pi)` in the store room | top (11.0, 3.3, 16.55) on the slab |
| Stair to S6 | `stairs(11.0, 7.6, 1.4, 5.2, 3.6, 18, IRON, -pi/2)` in the stair room, rising west to (8.4, 3.6) | doorway in x=8 at y 3.6..5.7, z [6.9,8.3] over a solid block (0..3.6) onto the east gallery |
| West double doors | wall x=8 gap [9.2,11.6]: `door(8,0,9.2,1.2,0)` + `door(8,0,11.6,1.2,pi)` + header | onto S6 ground floor |
| Reception | counter c(29.2, 0.5, 12.8) s(3.0, 1.0, 1.0); lamps (28.9, 3.2, 8.8) and (28.9, 3.2, 16.0) r7 I1.0 cold group 17; alarm (31.95, 1.4, 14.5) -pi/2; entry door from the facade | |
| Lamps (offices) | one r5 I0.7 cold per office at its centre y 2.9; archive (11.0, 2.9, 13.6) group 18 | S1 / S2 / S3 start off |
| Download terminal | mission (20.4, 0, 7.3) in S2 | the open ground window (c 21.4) and the corridor window open on it |
| Hide spots | (9.2, 0, 18.5) store; (30.8, 0, 7.4) reception | |
G5 pings between the window (lit by the corridor lamp) and the archive hatch (dark west half): the download's noise pulses (every 10 s, 16 m) send
him to the terminal along the corridor past the T corner. Approaches: the ground windows / vaults; corner takedown at the T; window takedown from
inside the open window of S2; grab and walk him; the duct and hatch drop at the archive; kill group 17 for the alarm run. Entry vantage V5: the
stair room's dark door / the S3 office through the rope window (dark): from S3's open interior window is 3 m from the corridor mouth.
Dark pockets: S1 / S2 / S3 offices, the stair room, the store, the corridor's west half, the archive hatch.

## 7. S6 Exchange Floor - "Above it all" (G6, G7)
Zones: hall `(-11.85,7.85,-5.85,19.85, 0.1, -1, 12)`; moon stripe `(-3.5,0.5,-3.35,17.5, 0.3, -1, 12)`. Floor TER; the galleries `surface('wood', .., top 3.6)`.
| Piece | Call | Place | Purpose |
| --- | --- | --- | --- |
| Walls | S2/S6 wall (z=-6, 6.5), S6/S7 wall x=-12 (gaps [6.15,7.35] hatch window open; [7.7,8.9] door + header), S5 wall x=8 (above), north perimeter | noLedge | |
| South podium | box PL | c(-2.0, 1.8, -4.6) s(19.7, 3.6, 2.5) | gallery top 3.6, solid (the kick wall) |
| East podium E1 / E2 | box PL | c(6.675, 1.8, 2.525) s(2.35, 3.6, 11.75) z -3.35..8.4; c(6.675, 1.8, 14.95) s(2.35, 3.6, 5.1) z 12.4..17.5 | the S5 doors pass between them |
| Bridge | box (thin) | c(6.675, 3.55, 10.4) s(2.35, 0.1, 4.0) | gallery over the doors; noLedge |
| North podium | box PL | c(-0.75, 1.8, 18.675) s(17.2, 3.6, 2.35) | sniper gallery; lip z=17.5 for the wall jump and the ledge pull |
| C3 block | box PL | c(-10.6, 2.2, 18.375) s(2.5, 4.4, 3.0) | top 4.4 steps down 0.8 onto the north gallery (x -9.35) |
| Lit stair | `stairs(3.7, 14.5, 1.4, 6.0, 3.6, 18, IRON, 0)` | to the north gallery | lamp (3.7, 4.6, 13.0) r6 I1.0 group 6 |
| Ladder | `ladder(-8.5, 17.05, 0, 3.6, 0)` | dark NW | 3.6 (spec table 2.4-3.4; (e2e)) |
| Rails | boxes (no collide) 1.0 m with gaps | along the lips | visual |
| Desks | 6 x low cover 2.4 x 0.9 x 0.9 | (-7.5,2.5) (3.5,2.5) (-5.0,6.5) (3.5,6.5) (-7.5,13.0) (-2.5,13.0) | |
| Central lamp | lamp r7 I1.0 sodium group 6 + fixture | (0.0, 4.0, 9.5) | the lit pool |
| Pipe | `pipeH(-8.2,5.3, -8.2,13.7, 4.4)`; columns (-7.4,5.3), (-7.4,13.7) (`pillar`, r 0.25, h 5) | | over G7's wait |
| Crate stack | box RUST | c(-8.2, 1.3, 4.6) s(1.4, 2.6, 1.2) | jump grab (up 1.8, pipe 0.3 away) |
| Zipline | `zipline({-8.8,5.6,18.2}, {-11.3,2.3,6.75})` | from the north gallery west end | ends by the hatch window |
| Glass office | on the south podium x -5..1, z -5.85..-3.35: walls 3.0 high (y 3.6..6.6); north wall z=-3.5 gaps [-4.4,-3.3] door, [-3.0,-1.8] open window c -2.4, [-1.2,0.0] glazed window c -0.6 | plant (-2.0, 3.6, -4.7) | the objective |
| Clock | box BRS (no collide) c(-7.0, 6.4, -3.7) s(1.2,1.2,0.2) + lamp r3.5 I0.6 brass, indestructible | | the landmark through S2's high glass |
| Gallery-door lamp | lamp r6 I1.0 group 6 (6.7, 6.6, 6.0); door lamp (-11.0, 3.0, 8.3) r6 group 6 | | the lit stretches in the sniper's view |
| Alarm | (5.45, 1.4, 14.5) -pi/2 | | |
G6 at (-1.0, 18.3, y 3.6) faces south; the east gallery door at (7.8, 3.6, 7.6) and the stair are in his view. G7 loops H1 (under the pipe), H2 (pool), H3
(dark rows). Routes: wall jump to the north lip from the floor (the sniper sees it) | ladder | stair | the S5 stair and the east gallery (long way round) |
boost C3 | the pipe over G7 | the zipline. Ledge pull: hang under the north lip (1.4 m from G6's post). Entry vantage V6: under the bridge (6.7, 0, 10.4), 6.8 m from the lamp.
Dark pockets: V6, rows, the NW corner, under the south podium front.
Splits: none (tall faces: podium faces 3.6 pair 21 m apart; the block and wall).
Boost (C3): braced mate with the back to the block's south face (-10.6, 0, 16.4); lip (-11.85..-9.35, 4.4, 16.9).

## 8. S7 Service Tunnel and Freight Lift - "The exam" (G8, G9)
Zones: tunnel `(-24.5,-12,5.85,9.15, 0.12)`; hall `(-31.85,-22,9.45,19.85, 0.12)`. Walls 6.5 noLedge. The mass around the tunnel is void (no floor).
| Piece | Place | Purpose |
| --- | --- | --- |
| Tunnel | x -24.5..-12, z 5.85..9.15 (floor concrete); south wall c(-18.4, 3.25, 5.7) s(13.0, 6.5, 0.3); north wall z=9.3 x -24.8..-12 with a gap [-24.4,-22.4] into the hall; west end x=-24.65 | |
| Split blocks | c(-17.0, 2.0, 6.215) and c(-17.0, 2.0, 8.785), s(6.0, 4.0, 0.73), noLedge | inner faces z 6.58 / 8.42 = 1.84, x -20..-14 |
| Side duct | entry grate wall (-13.0, 0.6, 9.15) n(0,0,-1); exit (-21.2, 0.6, 9.15) n(0,0,-1); path (-13.0,0.1,9.4) -> (-21.2,0.1,9.4); casing (no collide) | round the split |
| Hall | x -31.85..-22.0, z 9.45..19.85; east wall x=-21.85 | |
| Lamps | (-27.0, 3.4, 15.0) and (-24.0, 3.4, 12.5), r7 I1.0 sodium group 7 + fixtures; switch (-31.9, 1.4, 12.0) pi/2 | |
| Fence gate | `fence(-31.85,16.8, -27.5,16.8, 2.4)`; walk-round gap x -27.5..-22 on the lit side | |
| Lift car | east wall c(-28.6, 1.5, 18.6) s(0.2, 3.0, 2.4), roof (no collide), metal floor `surface('metal', -31.8,-28.6,17.4,19.8, 0)` | extract (-30.2, 0, 18.6) radius 2; dark inside |
| Pipe | `pipeH(-26.4,10.9, -26.4,18.9, 4.4)` | over the pair (0.6 each side) |
| Crate stack | c(-26.4, 1.3, 10.6) s(1.4, 2.6, 1.2) | jump grab onto the pipe |
| Cover | high crate c(-29.5, 1.0, 13.5) s(1.6,2.0,1.4); low crates 1.0 at (-24.0,0.5,17.5), (-24.8,0.5,11.8) | |
| Alarm | (-30.0, 1.4, 9.5) 0 | |
| Hide spots | (-30.8, 0, 11.0); (-23.0, 0, 18.5) | |
Splits: exactly the tunnel's (and S2's). The pair at 1.2 m faces each other (each sees the other). Approaches: Mark & Execute; the pipe (inverted on one, the
other sees); a noisemaker; shoot lamps and climb the fence in the dark; co-op dual takedown; loud. Entry vantage V7: the tunnel's dark north-east
nook / the hall entry gap (-23.4, 0, 9.9), 6 m from the pair, dark (lamp 8 m).

## 9. Co-op lips (`EXCHANGE_COOP_LIPS`)
| Id | Lip endpoints (a -> b) | Height | Boosted from (floor y) | Solo route to the same surface |
| --- | --- | --- | --- | --- |
| c1-boiler-a | (17.0, 4.4, -10.15) -> (20.0, 4.4, -10.15) | 4.4 | 0 | the catwalk, a 1.1 m step |
| c2-pier-a | (30.7, 4.4, -4.6) -> (30.7, 4.4, -1.8) | 4.4 | 0 | drainpipe 2 |
| c2-pier-b | (30.7, 4.4, 0.0) -> (30.7, 4.4, 2.8) | 4.4 | 0 | the gap jump from pier A |
| c3-block | (-11.85, 4.4, 16.9) -> (-9.35, 4.4, 16.9) | 4.4 | 0 | the north gallery, a 0.8 m step |
All four sit 4.4 above the floor they are boosted from (>= `WALL_JUMP.maxUp` 3.8 + 0.5, <= `TEAM.boostMax` 4.5).

## 10. Band audit: every lip / pipe 3.75-4.5 m over the floor a mate can stand on (`teamController.boostTarget`)
Standing floors in the map: ground 0, plinth / crate stacks / cabinet / shelves 2.6, catwalks / podium / relay perch / archive slab 3.3, boiler B 3.5, galleries 3.6,
boiler A / piers / C3 block 4.4, the roof strips 6.0. Candidate grips = floor + 3.75 .. + 4.5.
| Floor | Lips and pipes in its band | Disposition |
| --- | --- | --- |
| 0 | S2 pipe 4.4, S6 pipe 4.4, S7 pipe 4.4 | allowed: each has a solo jump grab (cabinet / crate) |
| 0 | boiler A top, piers A / B, C3 block (all faces) | the routes C1-C3; each surface is solo-reachable |
| 0 | split bank tops 4.0 (S2, S7); structural walls; perimeter; S5 walls | `noLedge` |
| 0 | the drainpipes (S3 top 3.5, S4 pipe 1 base 3.3 top 6.0, pipe 2 top 4.4), ladders (3.3 / 3.3 / 3.6) | climbers; solo-climbable. Pipe 2's grip 4.4 is the pier route; ladders end under 3.75 |
| 2.6 | grips 6.35-7.1 | none (roofs are visual) |
| 3.3 | grips 7.05-7.8 | none |
| 3.5 | 7.25-8.0 | none |
| 3.6 | 7.35-8.1 | none (roofs visual, perimeter noLedge) |
| 4.4 | 8.15-8.9 | none |
| 6.0 | 9.75-10.5 | none |
Top lips below 3.75 over the ground (wall jump, solo): relay perch 3.3, catwalks 3.3, podium 3.3, boiler B 3.5, galleries 3.6, slab (noLedge): all intended.

## 11. Self-check against the Target numbers
| Target | Plan | Result |
| --- | --- | --- |
| Split corridor 1.85 / 4.0 / >= 5 m | S2 banks 1.85 (6 m, usable 5.4); S7 blocks 1.84 (6 m) | pass |
| No accidental splits | tall faces (>= 3.6): perimeter, structural walls, plant, banks, blocks, boiler A, piers, C3 block, podiums 3.6, facade 5.7, glass-office walls (base 3.6, 3.0 high: not tall). Piers A / B face each other 1.8 apart over a 0.8 overlap: usable overlap 0.8 - 0.6 = 0.2 < `minLen` 0.8, so no gap (fragile; the unit check asserts exactly two gaps). The north bank's north face to the north wall is 2.2 (> 1.95). Boiler B 3.5 stays under 3.6. | pass (watch piers) |
| Interior walls 3.1 / 0.3 | S5 offices | pass; `noLedge` (finding 1) |
| Wall jump lip 3.2-3.6, face within 1.0 | relay perch 3.3, catwalks 3.3 (1.0 wide, wall within 1.3), podium 3.3, galleries 3.6 on solid podiums, boiler B 3.5 | pass; (e2e) catwalk reach |
| Manual jump grab <= 3.0 | hopper 2.9 (S1) | pass |
| Standing grab <= 2.6 | shelves 2.6, plinth 2.6, crate stacks / cabinet 2.6 | pass |
| Pipes 4.3-4.5 over the guard floor | S2, S6, S7 pipes 4.4 | pass; (e2e) drop and inverted windows |
| Drop / above / ledge pull / window | G2 under the split (drop 2.5); G3 at R3; G1 aisle (above 2.6); G6 1.4 from the lip; G5 at the open window | pass; (e2e) |
| Rappel: point on a solid roof strip at 6.0, window sill 0.9 | S4 rope on the N strip 6.0 (length 6.0); glazed window 0.7 from the rope, sill 0.9 | pass; (e2e) |
| Fence 2.4 | cage (2), S4 arcade, S7 gate | pass |
| Ladders 2.4-3.4 | S3 3.3, S5 store 3.3; S6 3.6 | S6 over by 0.2 (e2e; fallback: stair only) |
| Ceiling vent drop ~3.2 slab, overhead + noLedge | S5 archive slab 3.3 | pass |
| Lit pool 0.9-1.0 / r 6-8 | all lamps I 0.9-1.0, r 6-7 | pass |
| Dark 0.08-0.12; moon 0.28-0.3 | zones 0.08 / 0.12 / 0.3 | pass |
| Silent gears | S1 and S2 floors wood / concrete: crouched 1-4, standing 1-2 silent everywhere | pass |
| Co-op lip 4.4 | C1-C3 (section 9) | pass |

## 12. Self-check against the level design rules (P pass, F fail with a reason)
| Rule | S0 | S1 | S2 | S3 | S4 | S5 | S6 | S7 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 two or three routes, rejoin, none skips | P (duct kick / unscrew only: the tutorial space) | P ghost / window / shelf tops / loud | P lane / split / pipe / perch window | P floor / catwalk / cage / boiler | P arcade / balcony-roof-rope / pipes | P offices / corridor / duct-hatch | P wall jump / ladder / stair / boost / zipline | P tunnel / duct / fence / pipe |
| 2 entry vantage | n/a (no guard) | P V1 | P V2 | P V3 | P V4 | P V5 | P V6 | P V7 |
| 3 teach, test, twist | P | P | P | P | P | P (combines) | P (combines) | P (exam) |
| 4 release after pressure | P (start) | P | P | P | P (quiet after S1-S3) | P | P | P |
| 5 readable AI | P (shared perception) | P | P | P | P | P | P (sniper laser) | P |
| 6 patrols 25-45 s, waits 3-6 s, lit + dark | n/a | P 43 s, 4.5 s | P 38 s | P 42 s | P 38 s | P 35 s | P 40 s | n/a (posts) |
| 7 light and surfaces readable | P | P wood vs concrete | P | P metal plates / grate | P | P carpet | P | P |
| 8 no forced timers | P | P | P | P | P | P (download pulses only) | P | P |
| 9 checkpoints | P (spawn) | P ledger | P trunk | P valve | P phone | P logs | P tap | P |
| 10 toys | P lamp + switch | P | P | P (lamp, cage, vents of S2 via window) | P | P | P | P |
| 11 shortcuts / alternate takedowns | P | P | P | P | P | P | P | P |
| 12 sightlines | P (n/a) | P exit window | P high glazed window to the clock | P | P open arcade | P glazed interior windows | P galleries | P |
| 13 landmarks | P lamp | P lit door | P clock | P stair lamp | P door lamp | P reception | P clock | P lit hall |
Rule 14: every co-op route is extra: nothing solo needs a mate (section 9 solo routes).
Pre-existing risk: S0 has one exit (the duct). It teaches kick vs unscrew; recorded, not a violation of rule 1 for a no-guard tutorial.

## 13. No route skips a section
- S0 -> S1: the duct only. S1 -> S2: the door or the window (both in the shared wall x=-8). S2 -> S3: the ground door or the perch window; the perch is inside S2, the window
  lands on S3's catwalk. S3 -> S4: the cage door or the catwalk doorway (inside S3). S4 -> S5: entry door, dark side door, rope window, open ground window (all
  into S5). S5 -> S6: the double doors or the stair (both from S5's corridor / stair room, so S5 is crossed). S6 -> S7: the west door or the zipline to the hatch window.
- Every dividing wall, the perimeter and the plant block are `noLedge`; the perimeter is 8.0 m (above any mantle from the 6.0 m strips); the roof strips end inside S4.
  The S4 N strip's north edge drops 6.0 m into S5 (a heavy landing: loud, optional, not a skip: it lands in S5's offices).
- (e2e Phase 3) The nav path spawn -> lift passes s0..s7 in order; a solo jump / wall jump from every standing surface to every perimeter and dividing-wall top finds nothing.

## 14. Test and risk list carried into Phases 2-4
1. Catwalk wall jump with a 1.0 m strip against the wall (kick ray 1.3 m).
2. Rope kick-through from the N strip's rope (rope plane z 5.4, wall z 5.85, window z 6.0).
3. Drainpipe 1 top onto the strip's west lip; drainpipe 2 top onto pier A; the pier gap jump (grip distance 2.3).
4. Pipe drop / inverted windows at 4.4 (the inverted victim band 0.6-2.8 m under the attacker's root).
5. Ladder 3.6 (S6).
6. Perf: a 64 x 40 map with ~28 lights; budgets as in `CLAUDE.md` (mobile Ultra 250 draws).
7. Guard first-point behaviour: the route starts at the slot; the slot is the first point.
