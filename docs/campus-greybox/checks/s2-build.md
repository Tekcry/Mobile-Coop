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
