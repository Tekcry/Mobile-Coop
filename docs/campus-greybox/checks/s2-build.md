# campus-greybox S2 lane - build report

Builder: cloud (Opus), branch `feature/campus-greybox-s2`, worktree `/home/user/cg-s2`, base 024c7c172 (V2-SEED). Brief:
`docs/campus-greybox/briefs/S2.md`. Scope: G1, G2, G3, G4, G6a, G5a, G5c, G6b (in that order on this one branch; no G6a
worktree; G5b dormant, TAG-2 waits for #317).

Every e2e / GPU / level-measure leg is "pending PC run" (listed per slice). Unit tests only here: `npm run typecheck:fast`
and single vitest files with `--maxWorkers=2`.

Tag check: the `SS:` lines used (39-49, 62-70 at 6c3f4a87) read the same values on origin/master (lines moved by +4 / +9;
the co-op lip row now cites level-design 11.8 for 11.3, value 4.3-4.5 unchanged).

## S2-G1 - G floor

Files: `src/world/maps/campusV2/s2.ts`, `s2Dress.ts`, `s2Data.ts` (the `S2_V2_COPY` line only), `tests/campusV2S2Ground.test.ts`.

Built (file:line at the G1 commit):
- C1 one lobby (BA1): `s2.ts:169` foyer 'Reception and Atrium' x -30..-8, z -30..6; `hall` removed; `hallne` kept;
  `s2Dress.ts:25` foyer = 'atrium', `hall` tag removed. The turnstile barrier at z -23 is unchanged.
- C3 feature stair: `s2.ts:128` `FEATURE_FLIGHTS` (A: cz -11.4, y0 0; B: cz -16.8, y0 2.2; both w 2.4, len 3.4, rise 2.2,
  13 steps, yaw PI), `s2.ts:133` `FEATURE_LANDING` (x -19.2..-16.8, z -15.1..-13.1, top 2.2, 0.2 thick), `s2.ts:139`
  `S2_FLIGHTS` (14 flights), built at `s2.ts:406-426`: flights, the landing (noLedge, also `overhead` so G walks under
  it: 2.0 m clear), rails 1.1 x 0.1 at x -19.25 / -16.75 (pitched on the flights, flat on the landing), all noLedge.
  Risers 0.169, goings 0.283, 2R + G 0.62 (SS:44, SS:45). The 24-step `FEATURE_STAIR` is gone.
- C5 plant room north door: `s2.ts:444-445` gap `gc(-5)` in the z -4 wall, `doorIn(..., { locked: true, breachable: true })`.
  The switchgear block stays at (1.5, -22) (`s2.ts:470`; the sync-s2-power board, G5a, stands on it). Hide spot (2.5,0,-24) kept.
- C6 doors: `s2.ts:436-439` `gc(-36)` + `doorIn` in the z -12 and z -4 walls (6 m from the x -30 corner).
- C16 mail-lift shaft (BA8): `s2.ts:146` `MAIL_SHAFT` x -34..-32.8, z -19.5..-18; L1 slab hole `s2.ts:397`; walls N / E / S
  G to 4.4 (centre lines 0.1 outside the clear box), the L1 rail, the ladder `s2.ts:475-490` (ladder at x -32.8, 0 -> 4.4,
  facing PI / 2). Everything noLedge. The SW core is 8 m off, in another room (LD 16.2.2).
  Planned node: the mail-lift shaft is sync-s2-plantlog's room's high way (the plant log point itself is G5a).
- BA15 post cages: `s2.ts:194` `POST_CAGES` (-41.5, -20.6) and (-38.0, -20.6), built `s2.ts:474` (furn 2.2 x 1.8 x 0.9
  STEEL); hide spot (-39.75, 0, -21.6) `s2.ts:190`. No overlap with the SW core box or any door leaf swing: no shift.
- `S2_V2_COPY = false`: `s2Data.ts:166`.

Sync-node src lines (planned nodes this slice carries): the switchgear block for sync-s2-power `s2.ts:470`; the mail-lift
shaft (sync-s2-plantlog's room) `s2.ts:146`, `s2.ts:475-490`. sync-s2-atrium (the reception board) unchanged.

Dress: tags only (BA1). The new cages, shaft and stair get no skin (no new art; the S2 dressing pass is redone later). Dress
log: the test holds every v2 log line to a line the live S2 dressing logs too (no line gained).

Tests: `tests/campusV2S2Ground.test.ts` 17 / 17 pass. Flag-off set (`campusV2`, `campusS2`, `campusS2Dress`,
`campusS2Board`, `campusRuntimeNav`) 69 / 69 pass. `npm run typecheck:fast` clean; eslint clean on the lane files.

Assumptions: BA1, BA8, BA15 as the brief (undo there). New:
- **A-G1-1** the feature-stair landing is also `overhead` (a slab; G walks under its 2.0 m). Undo: drop the flag (the nav
  then treats it as a 2.0-2.2 blocker over the G floor).
- **A-G1-2** the shaft walls stand outside the clear box (centre lines 0.1 outside, as the cores' walls), so the box is
  both the clear shaft and the L1 hole. Undo: walls centred on the box lines.

Deviations:
- **D-G1-1 (BA8 rail side).** BA8 says the L1 rail is on the N, E and S sides, open to the west. The engine's ladder tops
  out forward, along `facing` (`attachController.ts:506-509`: top + 0.4 m along the facing; the ladder's top point is
  0.45 m forward of the base), so with the ladder on the east face facing PI / 2 the climber leaves east, into an E rail,
  and a player at L1 mounts it from the east. Built: rails on the N, W and S sides, open to the east (the ladder's side).
  Undo: move the rail box at x -34.05 to x -32.75 (`s2.ts:487`).

Findings for the lead: none beyond D-G1-1.

Pending PC run: e2e-sectorops parts 1-6 on the lane PR head (S2-a), flag off.

## S2-G2 - void and rings

Files: `src/world/maps/campusV2/s2.ts`, `s2Dress.ts`, `tests/campusV2S2Void.test.ts`.

Built (file:line at the G2 commit):
- C2 void: `s2.ts:46` `S2_VOID` x -26..-11.5, z -18.5..-4; the L1, L2 and roof slab holes follow (`s2.ts:453-457`).
- Balustrades: helper `s2.ts:389`; L1 `s2.ts:599-606` (west x -26.1 z -18.5..-4; north z -4.1 x -26..-11.5; south z -18.4
  x -26..-19.2 and -16.8..-11.6; east x -11.6 z -18.4..-11 and -5..-4); L2 `s2.ts:631-636` (one piece per side, east
  z -18.5..-4). 1.1 glass-coloured boxes, 0.1 thick, noLedge (the as-built form). Strips measured wall face to
  balustrade face: south 3.95 (z -22.4..-18.45), east 3.95 (x -11.55..-7.6) on L1 and L2.
- C4 CR2: lip piece `s2.ts:453` `[-11.5, -6, -11, -5]` (ledge kept); `CR2` `s2.ts:152-160` (lip x -11.5, z -11..-5, y 4.4;
  top x -11.5..-7.5; boost (-12.1, 0, -8); id, section, solo text unchanged); the planter removed; BA10 `CAFE_TABLES`
  `s2.ts:186` (the two tables by the nose at x -14.5), built `s2.ts:524`; dress `s2Dress.ts:201` reads `CAFE_TABLES`, the
  'CR2 planter' skin dropped (`s2Dress.ts:221`).
- Roof light rim `s2.ts:647-655`: south z -18.7 and north z -3.8 (x -26.4..-11.1), west x -26.2 and east x -11.3
  (z -18.5..-4), 0.9 high to 13.2, 0.4 thick, noLedge; the lid a visual box at (-18.75, 13.2, -11.25), 14.5 x 0.1 x 14.5.
- Pendants unchanged at (-22 / -18 / -14, 9.0, -17).
- `S2_LIGHTS` `s2.ts:248` (lead note 0.6): every S2 lamp in one block, header "provisional, light-realism retunes" and the
  `TODO(light-realism)` marker; `buildCampusS2` builds lamps only from it (`s2.ts:683`). `PENDANTS` / `BALCONY_LAMPS` are
  read from the block. BA3: 8 balcony downlights per circuit (the six as built plus (-18, -21.2) and (-10, -21.2)) on 51
  (y 7.9) and 52 (y 11.9). Values today's engine values x1.

Numbers: void 14.5 x 14.5 (`D:74`); strips 3.9 (`D:74`, SS:39 3.0 floor); lip 4.4 inside 4.3-4.5 (SS:49); rim (`D:94`).

Tests: `tests/campusV2S2Void.test.ts` 19 / 19 pass (void clear, rim, pendants, L1 / L2 balustrades and gaps, strips >= 3.9,
CR2 in the v2 lip list, ledge only on the lip, no solo jump or top landing (0.5 m margin), headroom, rule 2, rule 3,
rule 6, boost spot dark, stair >= 5.3 m from the lip, 8 lamps per balcony circuit, every lamp from `S2_LIGHTS`, dress log
gains no line). G1 tests 17 / 17 still pass. Flag-off set 69 / 69. Typecheck and eslint clean.

Assumptions: BA3, BA10 as the brief. New:
- **A-G2-1** "The void is clear of collision from G + 0.1 to 13.2" is read as: nothing but the feature stair's own pieces
  (its landing and rails), the G furniture 1.2 high or lower (the cafe counter and tables, the barrier) and the
  balustrades by their 0.1 thickness. The live test's version of this check was vacuous. Undo: none (a test reading).

Findings for the lead:
- **F-G2-1** The balustrade centre lines the brief gives (north z -4.1, south z -18.4, east x -11.6) lie 0.05-0.15 inside
  the void plan, so those three runs hang just off the slab edge, as the as-built L1 / L2 runs did (z -4.1, -19.9,
  x -10.1). Harmless for collision; the strips measure 3.95 to the balustrade face.
- **F-G2-2** AS11's 5.3 m is the flights' edge (x -16.8) to the lip; the east rail's centre line (x -16.75) is 5.25 m and
  its outer face 5.2 m off. Rule 2 is unaffected (a 0.1 rail is under `LEDGE.climbDepth`).

Pending PC run: e2e-sectorops parts 1-6 on the S2-a head (flag off); the v2 CR2 probes are e2e-sectorops `:2264-2267`
(v1 numbers, for SW-2).

## S2-G3 - L1 rooms

Files: `src/world/maps/campusV2/s2.ts`, `s2Dress.ts`, `tests/campusV2S2L1.test.ts` (and the dress-log comparison in the G1 /
G2 tests now ignores greybox box indices, which move with every added piece).

Built (file:line at the G3 commit):
- C8 `s2.ts:617-623`: south band wall z -22.5 x -30..-7.5 with doors x -25 / -17 / -10 (swing south into the rooms); the
  kitchen west wall at x -30 (z -30..-22.5) with its door z -26; the x -21 partition kept, x -13 removed; the project
  room's door into the SE meeting room (-7.5, -27) in the x -7.5 wall (`s2.ts:580-581`).
- C9 `s2.ts:624-639`: MR1 walls z -20 / -14 (x -44..-35.5), north door (-40, -14), glass front x -35.5 with its door
  (-35.5, -17); MR2 glass z 0 (x -44..-34) door (-39, 0), side wall x -34 door (-34, 3); MR3 glass z 0 (x -26..-16) door
  (-21, 0), side walls x -26 / -16, door (-16, 3). Fronts frosted to `S2_FROSTED_BAND` 1.2, clear above (as built: no
  head box over the glass).
- C10 `s2.ts:578-606`: x -7.5 wall z -30..0.5 with gaps -27 / -21 / -3; the glazed partition x -7.5 z 0.5..5.5 (clear) with
  its door (-7.5, 3); a wall stub x -7.5 z 5.5..6; wing walls x -2.5 (z -17.5..-4.5, doors -16 pg-brg and -7.5 comms),
  z -17.5, z -10.5 (door x 1), z -4.5; the facilities south wall z -1 (door -4, swing north) and its z -1..0 stub on
  x -0.1; the old landing / comms walls and the old facilities z 0 wall and glass removed; NE pocket kept. North UPS
  cabinet to z -5.2 (`s2.ts:646`). Switch 56 to (-5.6, 4.4, -1.5) (`s2.ts:230`).
- C12 `s2.ts:607-616`: the steel sunshade x -7..-1, z 6..7.2, top 4.4, 0.2 thick (noLedge box) with a manual hang ledge on
  its north edge (normal +z); the window (BA7) `windowAt(-4, 5.9, 6, 1.2, 1.2, 0, { sill: 5.3, open: true, breakable: true })`;
  `FAC_WINDOW` `s2.ts:48`. The north shell wall is split per floor (`s2.ts:459-469`), the L1 piece leaving the window gap.
- C15 `s2.ts:101` `NEAR_D` 1.3. Flights G-L1 12 x 0.183 (going 0.29), L1-L2 11 x 0.182, L2-roof 11 x 0.177 (going 0.32),
  all inside NCC. Door positions as built (Q3 default); no vision panels (Q4 default; the graph note goes in with G6b).
- Swings: the wing hall doors (-4, -1) north, (-2.5, -7.5) and (-2.5, -16) east, (-4.5, -23) south; the south ring doors
  south. Each open leaf lies in its room box (tested).
- Rooms BA2 `s2.ts:176-191`: the fifteen L1 boxes of the brief table. Tags `s2Dress.ts:30-44` (l1project, l1semeet,
  l1comms, l1landing 'office-cell'; strips l1west / l1south / l1east, l1ne, l1wingn, l1wings 'office-open').

Sync-node src lines (planned nodes this slice builds): the comms room for sync-s2-comms (`s2.ts:593-600`, the desk is
G5a); the pg-brg door (-2.5, -16) for sync-s2-pairdoor `s2.ts:594`; the two facilities doors for sync-s2-kpfac
(-4, -1) `s2.ts:603` and (-7.5, 3) `s2.ts:585`; the kitchen west door (-30, -26) for sync-s2-kitchen `s2.ts:621-622`.

Dress: tags only; the kitchen counter and BMS desk boxes are unchanged. The dress log gains no line (tested, box index
ignored).

Tests: `tests/campusV2S2L1.test.ts` 14 / 14 pass (BA2 table, PG areas, MR1-MR3 enclosure, class checks, every L1 nav cell
in a room, doors, swings, spacing, `Doors.nearest(-7.5, 3, 1.2)` on L1 with a NullEngine scene, wing walls, cabinets and
switch, sunshade / ledge / window, core flights, dress log). G1 17 / 17, G2 19 / 19. Flag-off set 69 / 69. Typecheck and
eslint clean.

Assumptions: BA2, BA7, Q3 and Q4 defaults as the brief. New:
- **A-G3-1** The x -7.5 wall north of the glazed partition (z 5.5..6) is closed with a wall stub (the brief leaves it
  unsaid). Undo: drop `s2.ts:586`.
- **A-G3-2** The sunshade slab itself is noLedge and carries one manual ledge on its north edge (no generated ledges on its
  ends). Undo: drop the mark.
- **A-G3-3** Glass fronts keep the as-built form (2.4 tall, no head box over the glass or the glass doors).
- **A-G3-4** "Each room box matches PG" for MR1-MR3 is checked as the built enclosure on the PG area (MR1-MR3 are not
  RoomDefs in the BA2 table: they sit inside l1sw / l1north).

Findings for the lead:
- **F-G3-1** The sunshade ledge (4.4, inside the 4.3-4.5 co-op band) stands over walkable ground north of the building
  (nav cells at y 0 under it, x -6..-2, z 6.6..7.9). If players can reach that ground, it is an unlisted co-op boost lip
  into the facilities window (no keypad); if they cannot, a player who drops off the ledge (4.4, a safe drop) is outside
  the building. Not in the brief; worth a look at the walk / route-runs.
- **F-G3-2** MR1-MR3 have no RoomDef of their own (BA2 puts them inside l1sw / l1north), so their HUD room is the open
  plan's. Room tags and G5c lighting follow from that (G5c's open-plan fittings fall inside MR1, MR2 and MR3).

Pending PC run: e2e-sectorops parts 1-6 on the S2-b head (flag off).

## S2-G4 - L2 and roof

Files: `src/world/maps/campusV2/s2.ts`, `tests/campusV2S2Upper.test.ts`.

Built (file:line at the G4 commit):
- C13 `s2.ts:670-693`: the L2 x -7.5 wall with gaps -26 (office B side door) / -21 / -3 / 3 (board room west door), doors
  at all four; the board room south wall moved to z -2.5 (x -7.5..-0.2, door x -4) and its z -2.5..0 stub on x -0.1;
  office A's second door (-24, -22.5) (gaps -24 / -20 / -10). pg-exec's door (-33, -4) and the exec east door (-30, 1)
  unchanged (G5a makes (-33, -4) a pair gate).
- C14 `s2.ts:50-52` `ROOF_PLANT`, `ROOF_HATCH`; roof slab hatch hole `s2.ts:490-492`; the north parapet split round the
  room `s2.ts:711-713`; the room `s2.ts:725-743`: walls x -20.5..-12, z 0..5.9 (the north wall on the parapet line),
  FR..FR+4.0, roof box on top (overhead, noLedge), door (-16, 0), the hatch rails (W, E, S: 1.1, noLedge) and the cat
  ladder (-18, 3) 8.4 -> 12.3 facing 0 (BA9).
- C12 `s2.ts:54` `DAVIT`, `s2.ts:746` `b.rappel(-4, 12.3, 5.8, 0, 7.9)`: the rope's foot stands on the sunshade (4.4) at
  (-4, 6.3), beside the facilities window (`attachController.windowBeside` conditions hold). Rope time 7.9 / 0.6 = 13.2 s
  (+ the vault: PG:66's 16 s).
- Nav layers: the widest column holds 5 surfaces (G, L1, L2, the plant room floor on the roof, its roof).

Tests: `tests/campusV2S2Upper.test.ts` 7 / 7 pass (board room enclosure and doors, office A / B doors, pg-exec and the
wing north door passable, the roof plant room, the hatch and ladder nav link (< 6 m), the davit rope to the window, at
most 5 surfaces per column). All lane tests (G1-G4) 57 / 57; flag-off set 69 / 69. Typecheck and eslint clean.

Assumptions: BA9 as the brief. New:
- **A-G4-1** BA9's "rail on three sides" leaves the north side open: the cat ladder faces 0 and tops out north (the same
  rule as D-G1-1). Undo: move the rail at z 2.45 to z 3.55.
- **A-G4-2** The roof plant room's north wall stands on the parapet line (z 5.9, 0.2 thick: its outer face on z 6.0),
  replacing the parapet over x -20.5..-12. Undo: centre it on z 6.
- **A-G4-3** The L2 RoomDefs are not re-cut (G4 names none): l2sw / l2north / l2wing stay as built, so the board room, the
  offices and the roof plant room have no RoomDef of their own (see the G5c note).

Findings for the lead:
- **F-G4-1** The L2 wing north door (-7.5, -3) (as built, kept by the plan) runs z -3.6..-2.4, and the board room's new
  south wall (z -2.5, from x -7.5) cuts 0.2 m off its north end: 1.0 m clear past the door plane. Nav still passes (a cell
  row at z -3.25; tested). Its leaf (default swing, east) sweeps into that wall when open. A one-line fix would centre the
  door at z -3.2 or start the board room wall at x -7.3; both change a plan position, so left as drawn.

Pending PC run: e2e-sectorops parts 1-6 on the S2-b head (flag off).

## S2-G6a - 18 guards (data and pure tests)

Built on the lane branch after G4 (one builder, so no G6a worktree and no merge step). Files: `src/world/maps/campusV2/s2Data.ts`
(the `S2_GUARDS` array only), `tests/campusV2S2Guards.test.ts`.

Built: `s2Data.ts:23-89` `S2_GUARDS`, 18 entries in the order #1-#14, #18-#21 (index 0-17; each number in its comment):
- As built: #1-#7, #9; #10 and #12 lose `dormant`.
- #8 (7): route (-4, -1.5) -> (2.2, -6.5) -> (-4, -14.5) (Q2 corner stop), waits [3, 7, 3], faces as built [0, PI / 2, PI],
  takedown (2.2, -6.5). 44.4 s.
- #11 (10) K2: post (1.5, 4.4, -15.8), yaw 0, leash 5, guards c2-door, takedown (1.5, -16.5).
- #13 (12): (-20, 2) <-> (-2, 2), [4, 4], takedown (-2, 2), 44.4 s. #14 (13): BA12 sweep (-19, -8.5) <-> (-17, -8.5),
  waits [12, 12], faces [PI - 1.05, PI + 1.05], takedown (-18, -8.5), 28.3 s. #18 (14): (-38, -21) -> (-33, -16) -> (-32, -8),
  [4, 4, 4], takedown (-32, -8), 41.7 s. #19 (15): (-39, -1.5) <-> (-22, -1.5) (Q2), [4, 4], takedown (-39, -1.5), 44.4 s.
  #20 (16): (1.2, -2.7) <-> (-4.5, -2.2), [7, 7] (Q2), takedown (1.2, -2.7), 26.2 s. #21 (17): (-27, -1.5) <-> (-9, -1.5)
  (Q2), [4, 4], takedown (-9, -1.5), 44.4 s.
- BA11: new guards' first yaw faces their second route point; `faces` only on #14 (BA12). Squads 0 G, 1 east wing, 2 L1
  plan, 3 L2. Role / zone / reason from the `D:255-273` table (zones: cafe, atrium, l1-west, l1-north, wing, l2-north).
- #19's torch (AS14) is the archetype's flashlight: no data field.
- 18 + 3 x 2 = 24 <= 32. Reinforce points unchanged.

Tests: `tests/campusV2S2Guards.test.ts` 7 / 7 pass (kinds / guns, `checkSectorGuards` [], floors, squads, posts #1 / #11 /
#12, none dormant, the D-table slots and BA11 / BA12, every cycle 25-45 s with the brief's values, the pair loop, the cap).
All lane tests 64 / 64; flag-off set 69 / 69. Typecheck and eslint clean.

Assumptions: Q2 defaults, BA11, BA12 as the brief. New:
- **A-G6a-1** #8 keeps his as-built `faces` [0, PI / 2, PI] (his stops are the same three jobs: the facilities door, the
  panel, the pair-door corner); BA11's "faces only where the plan gives one" is read for the new guards. Undo: drop `faces`.

## S2-G5a - devices and circuits (Split Shift, data only)

Files: `src/world/maps/campusV2/s2.ts`, `s2Data.ts`, `tests/campusV2S2Devices.test.ts`. No engine file.

Sync-node src lines (for the lead's `SYNC.md`):
| Sync id | src | Data |
| --- | --- | --- |
| sync-s2-comms | `src/world/maps/campusV2/s2Data.ts:104` | `S2_DESKS` desk-comms2 at (3.6, 4.4, -6.5), yaw -PI / 2, cam-turnstile / cam-lift / cam-bridge, operator 7 (#8) |
| sync-s2-power | `src/world/maps/campusV2/s2.ts:251` | `S2_BOARDS[1]` (0.3, 0, -22), yaw -PI / 2, groups [55, 56], no window |
| sync-s2-atrium | `src/world/maps/campusV2/s2.ts:248` | `S2_BOARDS[0]` (-8.4, 0, -28.5), group 50 (as built, not renamed) |
| sync-s2-kpfac (kp-fac) | `src/world/maps/campusV2/s2Data.ts:138-139` | keypads (-4, -1) and (-7.5, 3), code s2-fac-code (Q1 default) |
| sync-s2-kitchen | `src/world/maps/campusV2/s2Data.ts:143` | overhear box [-32, -27, -30, -25] on 4.4, talkers [4, 5], grants s2-fac-code |
| sync-s2-plantlog | `src/world/maps/campusV2/s2Data.ts:145` | board (-41.5, 0, -18.5), yaw 0, grants s2-board; lead: the post-room note `s2.ts:581` |
| sync-s2-pairdoor (pg-brg) | `src/world/maps/campusV2/s2Data.ts:148` | door (-2.5, -16), a (-3.1, -16.8) yaw -PI / 2, b (-1.9, -9.9) yaw PI / 2, two players |
| pg-exec | `src/world/maps/campusV2/s2Data.ts:149` | door (-33, -4) (L2), a (-34.8, -4.6), b (-31.2, -4.6), yaw PI, two players |

Built:
- Lights in `S2_LIGHTS`: BA4 the wing downlights (-4, 7.9, -2.0) and (-3.5, 7.9, -16.0) on 56 (`s2.ts:295-296`), replacing the
  as-built night lamp (-3, 7.9, -1.5); BA5 `S2_GROUPS.landing = 53` (`s2.ts:60`), the landing downlight (1.5, 7.9, -15.8)
  (`s2.ts:298`) and its switch (2.6, 4.4, -11.0) yaw PI (`s2.ts:239`); BA6 the goods-door bulkhead (-43.6, 2.6, -16) on 58,
  unswitched (`s2.ts:302`). The facilities lamp (55) and the reception downlight (50) are unchanged. Balcony spec for all
  four (r 5, i 0.8, cone 1.2, w 0.4).
- BA16 the post-room note `s2.ts:581`: a visual box 0.3 x 0.02 x 0.2 at (-35, 0.91, -26), no collision.
- Intel lines (BA13): 'Kitchen: the facilities keypad code, overheard.' (48 chars) and 'Plant log: east-wing breaker, plant
  room switchgear.' (52 chars).
- The objective comment no longer says EW5 is unbuilt (`s2Data.ts:121`).

Tests: `tests/campusV2S2Devices.test.ts` 15 / 15 pass (`checkSectors` [] with the map security, no `soloWindow` / `window` /
key `y`; the switchgear cut darkens exactly the facilities lamp and the two wing downlights; BA4-BA6; every keypad and gate
finds its door with the `Doors.nearest` rule (DOOR_FIND 1.2) on its floor; every sync id in a `//` comment on its data
line and the graph's `syncs` ids equal SYNC.md's S2 rows; one `it` per SYNC.md device; the note; the S2 live item count
under `MAX_ITEMS`; switches and boards on the nav). `tests/sectorPairGate.test.ts` and `tests/sectorItemScope.test.ts`
pass (flag off). All lane tests 79 / 79; flag-off set 69 / 69. Typecheck and eslint clean.

The plant log's read: the point (-41.5, 0, -18.5) is inside cage 3 (as built); the "Read" item's reach is the default
1.8 m in plan (`Interactables.nearest`) and the aisle cell (-41.5, -17.25) is walkable 1.25 m off: it reads. Not moved.

Assumptions: Q1, BA4, BA5, BA6, BA13, BA16 as the brief; Q21 (no `soloWindow`). None new.

Findings for the lead: none.

## S2-G5c block (ANSWERED: the lead took option 1, 2026-10-25 ~22:00; built below as S2-G5c-0, S2-G5c and S2-G6b)

The lead's answer: re-cut the rooms so every enclosed space is its own RoomDef (new G5c-0), then run G5c's rule unchanged on the new list
(`roof` exterior, no fitting there; the void, the shaft and the cores stay inside their parent boxes), then G6b. The lead's assumption
A-J17-S2-1 (undo: drop the new RoomDefs and their fittings, option 2 instead). F-G3-1 goes to the walk / route-runs, no change.
The block as it was reported:

**Block.** G5c's rule ("every `S2_ROOMS` box (after G4) with no lit fitting inside it", step 1) names room boxes that the
brief's own `S2_ROOMS` does not hold after G1-G4, and applied to the boxes that do exist it gives a result the brief says it
must not:
- The exceptions name "their L2 twins" of the strips, "the void", "the mail-lift shaft" and "the three core boxes": none
  is a RoomDef (BA1 / BA2 re-cut only G and L1; G4 re-cuts no L2 room; S2 has two cores).
- The coverage list wants MR1-MR3, offices A and B, the board room, the roof plant room and the L2 open plan lit. MR1-MR3
  sit inside l1sw / l1north (BA2), the offices and the exec suite inside l2north / l2sw, the board room inside l2wing, the
  roof plant room inside `roof`.
- Literal result on today's 26 boxes: lit by G5c would be post, lift, store, hallne, plant (G), l1sw, l1project, l1ne,
  l1wingn, l1wings, l1comms, l1semeet, l2wing and `roof`; skipped as already lit: mail (BA6), foyer, l1kitchen, the three
  L1 strips, l1north (its two north balcony downlights at z -2.8), l1fac, l1wing, l1landing, l2sw (the L2 night lamp and a
  balcony lamp), l2north (balcony lamps). So MR3, the exec suite, offices A and B and the roof plant room stay dark, and
  the `roof` box (the open roof) gets six fittings hanging at 15.8 m in the air, two of them over the void.
- Fixing it by adding RoomDefs (MR1-MR3, L2 strips / offices / exec / board room, roof plant room, void, shaft, cores)
  changes `S2_ROOMS` (HUD rooms, guard-ai `lightsOut` "a fixture in the room he stands in") and needs `S2_ART_TAGS` in
  `s2Dress.ts`, which is not a G5c file, and box values for the L2 split that the brief does not give.

Options for the lead (each is one data edit):
1. Re-cut L2 like L1 (boxes from the PG areas: `s2-l2-exec`, `-offa`, `-offb`, `-board`, `-wing`, `s2-roof-plant`, plus
   L2 strip twins of l1west / l1south / l1east and an l2north for the north strip), add MR1-MR3 boxes carved out of
   l1sw / l1north, tag them in `s2Dress.ts`, then run G5c's rule unchanged on the new list (exclude `roof` as exterior).
2. Keep `S2_ROOMS`, run G5c on its boxes, exclude `roof` (exterior), and add one fitting per named enclosed room that the
   rule misses (MR3, exec suite, offices A / B, roof plant room) at its PG area's centre line.
3. Keep `S2_ROOMS` and run the rule literally (the floating roof fittings and the dark MR3 / offices stand).

## S2-G5c-0 - every enclosed room a RoomDef (new, before G5c)

Files: `src/world/maps/campusV2/s2.ts` (`S2_ROOMS` only), `s2Dress.ts` (`S2_ART_TAGS`, the new ids only), `tests/campusV2S2L1.test.ts` (the BA2
table test skips the three meeting rooms), `tests/campusV2S2Rooms.test.ts` (new). Commit 4ba3fef0.

Built (`s2.ts:192-237`): 11 new RoomDefs, boxes from the plan graph `area`s: `s2-l1-mr1` x -44..-35.5, z -20..-14; `s2-l1-mr2` x -44..-34,
z 0..6; `s2-l1-mr3` x -26..-16, z 0..6 (all 4.4..8.4); `s2-l2-exec` x -44..-30, z -4..6; `s2-l2-offa` x -28.5..-13, z -30..-22.5;
`s2-l2-offb` x -13..-7.5, z -30..-22.5; `s2-l2-board` x -7.5..-0.2, z -2.5..6; the L2 strips `s2-l2-west` / `-south` / `-east` = the exact
boxes of `l1west` / `l1south` / `l1east` (all 8.4..12.3); `s2-roof-plant` x -20.5..-12, z 0..6, 12.3..16.5 (the walls 4.0 and the roof box).
No RoomDef for the void, the mail-lift shaft or the cores. 26 -> 37 rooms. Tags (`s2Dress.ts`): meeting rooms, exec, offices and the
board room 'office-cell', the strips 'office-open', the roof plant room 'plant'.

Tests: `tests/campusV2S2Rooms.test.ts` 6 / 6 pass (11 new ids once, no squads, no void / shaft / core id; boxes = PG areas; strips = L1 twins;
overlaps only by nesting; `roomAt` at each room and at the parents; the tag table covers every room). `campusV2S2L1.test.ts` 14 / 14.

Assumptions:
- **A-G5c-1 (the lead's "so those shrink" cannot hold for rectangles).** The parents `l1sw`, `l1north`, `l2sw`, `l2north`, `l2wing` keep their
  boxes. Each carve leaves an L-shape, not a rectangle (MR1 sits mid-wall, MR2 in a corner, the L2 rooms straddle the l2sw / l2north line at
  x -26: office A's PG area x -28.5..-13 overlaps both). The engine's rule is the answer: `roomAt` returns the smallest box on the storey
  (`rooms.ts`), so a point in a new room is that room's and the parent keeps the rest; `guard-ai` `lightsOut` reads `roomAt` the same way. Undo:
  split the parents into rectangles with new ids (more ids and tags).
- **A-G5c-n (box lines).** Every new box is a PG area or an L1 twin: no PG area gave "no exact line", so no wall-centre cut was needed.

Deviations: the parents are not shrunk (A-G5c-1).

Findings for the lead: none beyond A-G5c-1. F-G3-2 is closed (MR1-MR3 now have their own room).

Pending PC run: e2e-sectorops parts 1-6 on the lane head (flag off; HUD room tags are data the flag-off run does not read).

## S2-G5c - every room lit

Files: `s2.ts` (`S2_ROOM_GROUPS`, `S2_CORE_GROUPS`, `fit` / `coreFit`, the S2_LIGHTS block, `S2_SWITCHES`), `tests/campusV2S2Lights.test.ts` (new),
`changes/feature-campus-greybox-s2.md`. Commit 3877ede7. The rule as in the brief (5c), on the G5c-0 list.

Which rooms (step 1, recomputed in the test from the as-built lamps by `roomAt` at lamp y - 1.5, the engine's read): lit by G5c = 21 rooms.
Already lit by an as-built fitting (skipped): foyer (reception and corridor lamps), mail (the goods bulkhead, BA6), l1kitchen, l1fac, l1wing,
l1landing, l1north (its two north balcony downlights), l2sw (the L2 night lamp), l2north (the balcony downlights); the strips (l1west / south /
east and their L2 twins) by 51 / 52; `roof` (open roof, exterior: no fitting, no circuit). Circuits (step 3: numbered from 100 in `S2_ROOMS`
order) and fittings (step 2):

| room id | group | fittings | switch (x, y, z) / yaw | by |
| --- | --- | --- | --- | --- |
| post | 100 | 2 | (-30.5, 0, -25.8) / -PI/2 | door (-30, -27) |
| lift | 101 | 2 | (-30.5, 0, -6.8) / -PI/2 | door (-30, -8) |
| store | 102 | 2 | (-30.5, 0, 2.2) / -PI/2 | door (-30, 1) |
| hallne | 103 | 2 | (2.7, 0, -0.6) / PI | the NE core's G door (open plan) |
| plant | 104 | 4 | (-7.5, 0, -24.8) / PI/2 | door (-8, -26) |
| l1sw | 105 | 4 | (-38.8, 4.4, -21.8) / PI/2 | the SW core's L1 door (open plan) |
| l1project | 106 | 2 | (-15.8, 4.4, -23.0) / PI | door (-17, -22.5) |
| l1ne | 107 | 1 | (0.5, 4.4, -0.6) / PI | the NE core's L1 door, hinge side |
| l1wingn | 108 | 1 | (2.7, 4.4, -4.0) / 0 | the z -4.5 wall (no door of its own) |
| l1wings | 109 | 1 | (-1.5, 4.4, -18.0) / PI | the z -17.5 wall (no door of its own) |
| l1comms | 110 | 1 | (-2.0, 4.4, -6.3) / PI/2 | door (-2.5, -7.5) |
| l1semeet | 111 | 2 | (-3.3, 4.4, -23.5) / PI | door (-4.5, -23) |
| s2-l1-mr1 | 112 | 2 | (-38.8, 4.4, -14.5) / PI | north door (-40, -14) |
| s2-l1-mr2 | 113 | 2 | (-34.5, 4.4, 4.2) / -PI/2 | side door (-34, 3) |
| s2-l1-mr3 | 114 | 2 | (-16.5, 4.4, 4.2) / -PI/2 | side door (-16, 3) |
| l2wing | 115 | 4 | (0.5, 8.4, -0.6) / PI | the NE core's L2 door, hinge side |
| s2-l2-exec | 116 | 2 | (-30.5, 8.4, 2.2) / -PI/2 | east door (-30, 1) |
| s2-l2-offa | 117 | 2 | (-18.8, 8.4, -23.0) / PI | door (-20, -22.5) |
| s2-l2-offb | 118 | 1 | (-8.8, 8.4, -23.0) / PI | door (-10, -22.5) |
| s2-l2-board | 119 | 2 | (-2.8, 8.4, -2.0) / 0 | south door (-4, -2.5) |
| s2-roof-plant | 120 | 2 | (-14.8, 12.3, 0.5) / 0 | door (-16, 0) |
| core sw (step 4) | 121 | 7 | (-39.8, 0, -24.2) / -PI/2 | the core's G door, inside (hinge side) |
| core ne (step 4) | 122 | 7 | (0.5, 0, 0.4) / 0 | the core's G door, inside (hinge side) |

43 room fittings + 14 stair fittings: S2 now holds 85 lamps (was 28) and 30 switches (was 7). Fitting values r 5, i 0.8, `WHITE`, cone
(0, -1, 0, 1.2), w 0.4, destructible, electric, on; stair fittings r 4, i 0.7, no cone, w 0.3. All in `S2_LIGHTS`, marked provisional
(`TODO(light-realism)`). The switch rule (0.4 m off the wall face, 0.6 m past the opening's edge away from the hinge, the door's floor, facing in)
is recomputed in the test and holds for the 14 rooms with their own door.

Tests: `tests/campusV2S2Lights.test.ts` 15 / 15 pass: the rooms and group table recomputed (= `S2_ROOM_GROUPS`), every room (except the strips'
exemption and the roof) holds a lit fitting by `roomAt`, the roof holds none, every S2 lamp on / destructible / electric and in `S2_LIGHTS` (the
registry equals the block, 85); n and positions per room from its free rectangle; no fitting over the void, the shaft or a core, in a collision
box or outside its room; nothing above 13.2 outside the roof plant room and the bulkheads; the stair lights (7 per core, landing + 2.4);
one switch per new group on the nav (a walkable cell within 1.1 m, as the G5a switches, and the spot 1.0 m in front of it); no two switches
under 0.5 m; cutting each group darkens exactly its fittings and no other circuit; the switchgear board still cuts exactly 55 + 56.
All lane tests 100 / 100 at this commit; flag-off set 69 / 69; `sectorPairGate` + `sectorItemScope` 20 / 20; S2 live co-op items 107 of 128.

Assumptions:
- **A-G5c-2 (free rectangle).** A room that holds a core, the lift block, the mail-lift hole or a nested child lays its fittings in the free
  rectangle of its box (the rule runs on it: n = ceil(L / 8) on its long axis, evenly spaced on its centre line): post (SW core cut), lift
  (the block x -44..-41 cut), hallne and l1ne (the NE core cut), l1sw (meeting rooms 1 / 2 and the shaft hole cut: x -32.8..-30, z -30..0),
  l2wing (the board room cut: z -30..-2.5). Without it the rule puts fittings inside a core or inside a child. The table is `FREE` in the
  test. Undo: the literal box (fittings inside cores / children).
- **A-G5c-3 (switches).** (a) "On the nav grid" is the G5a convention (a walkable cell within 1.1 m): the spot 0.5 m off a wall centre line is
  inside the agent's 0.32 + 0.1 wall margin, so the cell under it is never walkable (the strict test fails for 15 of the 23). The spot 1.0 m in
  front is asserted strictly. (b) Where the rule's spot has no door: the open NE lobby and the L1 / L2 wing hall take the NE core's door, the open
  plan west the SW core's L1 door; `l1wingn` and `l1wings` (hall ends with no door) take the nearest wall of the room. (c) Rooms with a glass
  front (MR1) use the solid-wall door (a switch cannot stand on glass). (d) The NE core's three switches on a floor would sit 0.3 m from the
  as-built l1Bal / l2Bal switch (2.4, -0.6) on the away side: `l1ne`, `l2wing` and the stair circuit take the hinge side, 0.2 m along the wall off
  the x -0.1 wall's margin (x 0.5). (e) The core switches stand inside the core on the hinge side (the away side of the SW door is outside the
  core). Undo: the rule's spots (the test's `ruleSwitch` gives them).
- **A-G5c-4 (heights).** y per the brief's table (G 3.9, L1 7.9, L2 11.9, roof plant 15.9).
- **A-G5c-5 (stair lights).** "One fitting per landing" is read as the ground-floor door landing plus the code's six landing slabs (the near
  landing at each floor and the half landing at each storey): 7 per core at 2.4, 4.6, 6.8, 8.8, 10.8, 12.8 and 14.6 (the roof landing's 14.7 is
  14.6: the bulkhead roof's underside is 14.7). Undo: the four door landings only (G, L1, L2, roof).
- **A-G5c-6 ("no fitting above 13.2").** Read as no fitting in the open roof: the fittings above 13.2 are the roof plant room's (15.9) and the
  stair bulkheads' roof landings (14.6), tested inside their boxes; none of the new fittings is over the void (the pendants stay in it).
- **A-G5c-7 (rooms by `roomAt`).** "Holds a lit fitting" is the engine's read (`roomAt` with the lamp's y - 1.5), not the plain box: the nested
  parents then keep their own fittings and a child's circuit never lights a parent's count.

Deviations: none from the lead's answer. The brief's "the three core boxes" exception is not a room list entry (cores are no RoomDef); their
lights are step 4.

Findings for the lead:
- **F-G5c-1** S2 now has 85 lamps (28 before): the light bake / the shader's lamp budget for the section has not been measured (pending PC run).
- **F-G5c-2** The `l1ne` / `l2wing` stair-lobby switches sit beside the as-built balcony switch (A-G5c-3 d): two switches 0.7-2 m apart at each
  NE door; the lead may merge the groups instead (undo of "one group per room").

Pending PC run: e2e-sectorops parts 1-6 on the lane head (flag off); the light bake and the LR16 light meter at the new rooms (flag on, GPU);
the 85-lamp budget; V6 `level-measure` shadow percentages (the graph's `shadow_pct` 0.5 targets assumed dark open plans and cafe: Q2 "Never"
replaced them with cuttable circuits).

## S2-G6b - routes, nav, isolation, graph

Files: `src/world/maps/campusV2/s2Data.ts` (`S2_SECTOR.routes` only), `s2.ts` (`NEAR_D` / `FAR_D`, A-G6b-2), `docs/sector-redesign/graph/v2/campusOps-S2.json`,
`tests/campusV2S2Routes.test.ts` and `tests/campusV2S2Graph.test.ts` (new: the pure G6a file stays fast), the G3 / G5c tests for the landing
change. Commit 9781dba58.

Built:
- **Routes** (`s2Data.ts:151-177`): the three routes on the new doors at 1.2 m each side: facilities door (-4, -1) z -2.2 / 0.2, comms door
  (-2.5, -7.5) x -3.7 / -1.3, landing north door (1, -10.5) z -9.3 / -11.7. Stealth: the north plan, (-8.7, 3) / (-6.3, 3) by the west keypad door,
  the terminal (-6.5, 2.9), out by (-4, 0.2) / (-4, -2.2), the wing, comms, landing, (2.5, -14), (6, -14); loud: (-20, -22.2), (-18, -9), (-18, -14.1, 2.2),
  (-18, -19.4, 4.4), (-12, -20.4), (-9, -20.4), (-6, -21), then the wing as stealth; high: as built to the NE door, down to the wing hall
  (1.5, 0.6, 4.4), (1.5, -1.2), (-1.5, -3), then as stealth. `obj` 16 / 20 / 14.
- **Graph** (`graph/v2/campusOps-S2.json`, notes and keys only; the plan graph's 27 spaces, 53 links + spine, `tracks`, `syncs` kept):
  `meta.sections` S1-S5; guard keys "1".."4" on every guarded space (foyer 4, mail 1, l1-plan 3, l1-kitchen 2, l1-wing 2, l1-facilities 1,
  l1-landing 1, l2-plan 4: 18 at every key); `unavoidable` on `s2-l1-landing` with the brief's note; Q21 notes (both pair-gate links, the sync's
  `solo` = "two players (Q21); solo: the comms-room door into the landing"); Q1-Q5, BA lamp and guard deltas appended to the notes of foyer, mail,
  cores, facilities, wing, l1-plan, l2-plan, landing; stale "counted here, not in `guards`" notes of the kitchen and landing replaced. Nothing
  `measured` written.
- **Validator** (`node scripts/level-validate.mjs` on the v2 S1-S5 files): 0 errors, 129 warnings overall; S2: 40 (30 before). The S2 warnings are
  the justified kinds (ceiling bands, custom room classes, off-grid core sizes, room sizes over the class maxima, guards below the early band in
  mail / wing / facilities) plus two changes: the guard-band warnings now print for players 1-4 (3 spaces x 4 keys, was key 2 only) and one new kind,
  `s2-l1-landing: unknown tag 'unavoidable'` (this script does not know the tag, so the brief's expected "not a guarded encounter space" connector
  WARN does not print; list for the lead).

Tests: `tests/campusV2S2Routes.test.ts` 11 / 11 pass (routes, door offsets, every point / slot / takedown spot on the nav, analytic and runtime legs,
the nav flood from `S2_NAV_SEEDS` into all 27 PG areas plus the shaft foot and its L1 rim, M8 with the recorded exceptions, K2, the screen cap);
`tests/campusV2S2Graph.test.ts` 7 / 7 pass (graph shape, every area on the nav, every door link at a door anchor within 0.6 m, the guard sums, Q21
notes, solo past the team doors, light at vantages). All lane tests 118 / 118 (10 files); flag-off set 69 / 69; `sectorPairGate` +
`sectorItemScope` 20 / 20; `npm run typecheck:fast` and eslint clean.

Measured: screen cap worst 11 of 12 at (-10.25, 4.4, -4.25) (sees #1, #2, #3, #5, #6, #7, #8, #14, #18, #19, #20): Q5 not triggered. M8 runs
(index: s): #1 11.75, #2 0, #3 1.25, #4 7.25, #7 8.25, #8 8.5, #9 8.5, #10 6, #11 26.75, #12 180.25, #13 7.25, #14 0, #18 0, #19 7.5, #20 10.5, #21 7.25
(#5 / #6 the pair). Light at vantages (field level at the centre of the `from` space, bake over S2): store 0.43, post 0.44, SW core 1.00, MR1 1.00,
SE meeting room 0.66, L1 plan 1.00; hide spots: plant room 0.16 (no fitting lights it), NW store 0.31, project room 0.40, board room 0.57, post
room 0.18 (cages shade it).

Assumptions:
- **A-G6b-1 (routes).** The as-built north-plan legs at z 0.8 now run through meeting room 3 (glass front at z 0): the stealth route walks the north strip at
  z -1.5 (the guards' line), and its L1 legs east of the mail-lift hole: (-37.5, -23) -> (-31.4, -20.5) -> (-31.4, -8) -> (-29, -1) (the as-built
  (-33, -17) leg crossed the shaft rail). The high route's wing legs enter by the wing door (via (-1.5, -3)). Undo: the as-built points.
- **A-G6b-2 (core landings, a G3 repair).** `NEAR_D` 1.3 -> 1.4 and `FAR_D` 0.8 -> 0.9 (both exported). At 1.3 / 0.8 a flight's upper end fell within
  0.08 m of a 0.5 m nav cell centre (the SW core's near end at z -23.7, the NE core's far end at z 4.8): the down-cast hits the pitched ramp's end
  cap (normal y 0.5) and the cell is not walkable, so the runtime grid had no L1-L2 path in either core (the high route's climbs failed;
  guards could not use the stairs above L1). At 1.4 / 0.9 no cell centre is that close. The door still sits fully on the landing (1.4 >= the Q3
  1.3); the flights are 3.3 long: going 0.275 / 0.30, 2R + G 0.64-0.66 (NCC 0.55-0.70). Tests: G3 C15 and the G5c stair lights follow the constants.
  Undo: 1.3 / 0.8 and fix the grid alignment in the engine (the PC run should check the real Havok grid, which this helper only models).
- **A-G6b-3 (vantage points).** A graph vantage `from` is a space id: the point is the centre of that space's area at its storey; hide spots
  are `S2_HIDESPOTS`. "Dark only where no fitting lights the point": a point counts as lit by fittings when their unoccluded contribution sums above 0.02.
- **A-G6b-4 (door link points).** The door link's point is the first (x, z) in its `reason`, else its `note` (the plan graph has no point field);
  the SW core door link's note now carries (-39.3, -23).
- **A-G6b-5 (K2 test).** Brief items only: posted, leash 5, faces the comms door (yaw 0), the comms door cell in focus, the pg-brg door 90 degrees
  off and out of the focus cone; plus the leash edge 1 m off the card door's cell. The live test's cone-as-blocker route proof is not ported
  (K2 now faces north, not west).

Deviations:
- **D-G6b-1 (M8: four guards short).** "Every guard but the pair holds 3 s at his spot" does not hold on the plan's 18-guard data: #2 0 s (seen at every
  stop by #1, #13 and #14 across the open hall), #3 1.25 s (#18 and #19: Q2's #19 east end (-22, -1.5) is 2.5 m from #3's west end), #14 0 s (seen by
  #2 and #13), #18 0 s (seen by #3 and #19 on the west strip). The takedown spots are the plan's (`D:259-273`), so the guard data is unchanged; the
  four are recorded in `campusV2S2Routes.test.ts` like the kitchen pair and the test fails when one of them starts holding 3 s (remove it then).
  Data fixes for the lead: a takedown spot or stop moved off the shared lines (e.g. #2's west end into the lift-lobby doorway, #19 / #3 offset by
  a stop, #14's sweep behind the feature stair), or Guard AI's phase offsets (the check assumes no phases).
- **D-G6b-2 (test files).** G6b's level tests are in `campusV2S2Routes.test.ts`, not the Guards file (that file stays pure data and fast).

Findings for the lead:
- **F-G6b-1** M8 (D-G6b-1).
- **F-G6b-2** #18's first leg (-38, -21) -> (-33, -16) (the plan's D:263 points) cuts through meeting room 1's south wall corner (the wall z -20 ends at
  x -35.5; the leg crosses it at x -37). Guards path round it on the nav grid (the leg has a path), but the straight line the M8 / screen-cap
  checks use passes through the wall. Moving the middle point to (-34, -20.5) or (-33, -21) clears it.
- **F-G6b-3** Under Q2 "Never" every vantage and three of five hide spots read lit (the field levels above: store 0.31, project 0.40, board room
  0.57 at the hide spots; vantages 0.43-1.00): the plan's `shadow_pct` 0.5 and "vantage dark" targets (Marlow's Split Shift stealth reads) are for
  the lead's V6 measure to settle. The plant room (0.16) and post room (0.18) hide spots stay dark.
- **F-G6b-4** `level-validate.mjs` does not know the tag `unavoidable` (new WARN kind) and prints the guard-band WARNs for all four player counts.
- **F-G6b-5** The runtime-nav helper models Havok's down-cast; A-G6b-2 should be re-checked against the real grid on the PC (e2e-sectorops part 6
  walks the high route through both cores).

Sync-node `src` lines at the G6b head (for `SYNC.md`; the G5a lines moved with G5c-0 / G5c):
| Sync id | src |
| --- | --- |
| sync-s2-comms | `src/world/maps/campusV2/s2Data.ts:104` |
| sync-s2-power | `src/world/maps/campusV2/s2.ts:318` (the board; the switchgear block it stands on `s2.ts:692`) |
| sync-s2-atrium | `src/world/maps/campusV2/s2.ts:315` |
| sync-s2-kpfac | `src/world/maps/campusV2/s2Data.ts:138-139` |
| sync-s2-kitchen | `src/world/maps/campusV2/s2Data.ts:143` |
| sync-s2-plantlog | `src/world/maps/campusV2/s2Data.ts:145` (the post-room note `s2.ts:697`; the mail-lift shaft `s2.ts:174`, its ladder `s2.ts:713`) |
| sync-s2-pairdoor | `src/world/maps/campusV2/s2Data.ts:148` |

Pending PC run (all legs not run here):
- e2e-sectorops parts 1-6 on each lane PR head (flag off, proves the live map unchanged).
- SW-2 PR: part 6 with `?campusv2=2`; its S2 asserts are v1 numbers and need updating: `e2e-sectorops.mjs:2044` guards per floor [3, 6, 3] -> [5, 9, 4]
  (G: #1, #2, #12, #13, #14; L1: #3, #5, #6, #7, #8, #11, #18, #19, #20; L2: #4, #9, #10, #21), the CR2 probes :2264-2267 (lip x -11.5, boost (-12.1, 0, -8)),
  the stealth walk :2067-2088 (the new route points above).
- `level-measure --write` with the flag set (the lead's EXIT-2, after J12), then `--require-measured`; do not measure v1 into the v2 graph.
- The light bake and the LR16 light meter over S2 with 85 lamps (flag on, GPU); the real Havok nav grid at the core flights (A-G6b-2).
- Screenshot / walk review: F-G3-1 (the sunshade lip over reachable ground) goes to the walk / route-runs; no change made.
