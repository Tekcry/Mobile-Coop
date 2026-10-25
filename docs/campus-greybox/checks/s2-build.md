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
