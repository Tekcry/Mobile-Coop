# campus-greybox S4 - build report (lane `feature/campus-greybox-s4`)

Builder: cloud builder (Opus), 2026-10-25, to `docs/campus-greybox/briefs/S4.md` (G4.1 .. G4.6; TAG-4 waits for #317).
Base 024c7c172 (job branch after V2-SEED). v2 files at the base equal `4eeb05a0` (the brief's B / DT / T4 lines).
Guard-rules PR1 (J15) is not on master: per job BRIEF A27 no section `gear: 'helmet'` is written and `'armour'` stands where
the brief says `'both'` (G4.6). Checks per sub-step: `npm run typecheck:fast` and
`npx vitest run tests/campusV2.test.ts tests/campusV2S4*.test.ts tests/campusS4.test.ts tests/campusS4Dress.test.ts
tests/campusS4NocSight.test.ts tests/campusRuntimeNav.test.ts --maxWorkers=2`. No e2e, GPU, level-measure or screenshot run
here: each is listed as pending PC run.

## G4.1 South band (D:16-23, C1-C8)

**Files:** `src/world/maps/campusV2/s4.ts`, `s4Data.ts`, `s4Dress.ts`, `tests/campusV2S4.test.ts` (new),
`docs/sector-redesign/graph/v2/campusOps-S4.json`, `changes/feature-campus-greybox-s4.md` (new), this report.

**Step 0.** `S4_V2_COPY = false` (s4Data.ts:239). `S4_LIGHTS` (s4.ts:252-278, header PROVISIONAL / TODO(light-realism)):
the as-built lamps as named lists `cold1`, `cold2`, `cage`, `cold3`, `lobby`, `dockFloods`, `yardFloods`, `noc`, `sec`,
`ups`, `cc`, `deckTask` (B:494-505 values unchanged), then the added lists. `lamp()` takes an `S4Lamp` with an optional
`color` (default `WHITE`) (s4.ts:237-298); `buildCampusS4` draws every lamp from the block only (s4.ts:541).

**Built (s4.ts lines):**
- C1 one lobby: the z 18 partition and the scLobby door gone; one slab `slab(b, -4, 14, 16, 22, 3.2)` (:421);
  `S4_DOORS.scLobby` removed.
- C2 mantrap x 8..11, z 19..22: walls (:424-426), outer door (8, 20.5) swing -1 not breachable (:427), lid (:428); inner
  door hole 9.5 in the hall south wall (:417) and the armoured inner door (:418). `S4_DOORS.mantrapOuter = [8, 20.5]`,
  `mantrapInner = [9.5, 22]` (:69-70). Trolley alcove x 11..14, z 19..22: no box.
- C3 desk x 0.5..2.1, z 20.6..21.4 (:430).
- C4 parcel cages 1.2 high, not noLedge, x 2.0..3.2 / 7.0..8.2 / 11.5..12.7, z 18.0..18.8 (:432).
- C6 dockWest (14, 17.5) (:410, :414); kpBatt (-4, 18.5) (:435-436); `S4_DOORS` (:59, :63).
- Hide spot lobby alcove (12.6, 0, 21.3) (:191).
- Lights: `lobbyN` (2.0 / 6.5, 2.8, 21.2) r 4.2 i 0.8 cone 1.15 w 0.4 group lobby 73 (:275); `mantrap` (9.5, 2.9, 20.5)
  r 3 i 0.8 cone down w 0.3 group 73 (:276, derived B3); `dockBoard` (16, 2.4, 21.5) r 3.6 i 0.8 cone down w 0.3 group dock
  74 (:277). The as-built lobby lamp (5, 2.8, 20) and both dock floods kept (A19).
- Switches: hall panel (-1.4 / -1.0 / -0.6, 0, 16.15) yaw 0 (:201-203); lobby (13.85, 0, 18.6) yaw -PI / 2 (:204).
- Rooms (:215-219): `s4-lobby` -4..8 / 16..22, `s4-lobby-e` 8..14 / 16..19, `s4-lobby-a` 11..14 / 19..22, `s4-mantrap`
  8..11 / 19..22 (all maxY 3.1), `s4-plenum` -4..14 / 16..22 minY 3.1 maxY 7.2.

**Data (s4Data.ts):** #4 (1.3, 20.1) yaw PI / 2, takedown (0.8, 20.1) (:46); cam-mantrap at (10.8, 21.8), facing 225, aim 3
(:108); arm-mantrap `at` = `S4_DOORS.mantrapInner` (9.5, 22) (:147), its bypass still `S4_DOORS.kpBatt` (now (-4, 18.5)).

**Dress (s4Dress.ts):** `S4_ART_TAGS` drops `s4-sc`, `s4-lobby-b`, `s4-lobby-c`; adds `s4-lobby-e`, `s4-lobby-a` 'lobby' and
`s4-plenum` 'riser' (:28-32; B2: the nearest existing tag for a service void). No skinned box moved in this slice. Hero log
with the flag on: every hero placed (NOC wall, two NOC desks, the security desk, two FM-200 banks, ten PDUs, 72 floor tiles);
none omitted.

**Sync nodes / devices:** none built or moved. The dock board (16, 1.5, 21.85) unmoved (s4Data.ts:205); the yard board
(33.85, 0, 20.8) unmoved (s4.ts:165).

**Graph:** `s4-dock`, `s4-lobby`, `s4-mantrap` notes -> "BUILT G4.1 (...)"; the dock and lobby lamp lines carry the A19
note. `syncs` untouched.

**Tests:** `tests/campusV2S4.test.ts` 8 / 8 (G4.1 one lobby; mantrap; desk, cages, alcove; doors 1.5 m off corners; lights
(30 as-built lamps kept, 4 new, every S4 light from `S4_LIGHTS`, 4 switches on nav); cam-mantrap and validateSecurity;
rooms and art tags; the dressed build with the flag on). Slice set: 6 files, 78 / 78 pass; typecheck clean.

**Assumptions:** B1 (light per 0.5), B2 (room split, plenum tag 'riser'), B3 (the mantrap lamp point) as the brief.
**Deviations:** none.
**Findings for the lead:**
- C26 (the cage downlight goes warm, D:41) is in no slice of the brief; the cage lamp stays white as built (`S4_LIGHTS.cage`).
- `s4Dress.ts:177` still has `Math.hypot` (A26 carry, sector-marks not on master yet; the lead's carry).
**Pending PC run:** `e2e-sectorops:1` .. `:6` (default flags, the live map unchanged).

## G4.2 Return-air plenum, CR8 lips, baskets run-on, racks (D:24-26, C9-C11)

**Files:** `s4.ts`, `s4Dress.ts`, `tests/campusV2S4.test.ts` (the G4.1 slab case now asserts the four hatch-cut pieces),
`tests/campusV2S4Coop.test.ts` (new), the graph, the fragment, this report.

**Built (s4.ts lines):**
- Ceiling hatch 1.2 x 1.2 at (-2.0, 17.0): the lobby slab in four pieces round x -2.6..-1.4, z 16.4..17.6, overhead,
  noLedge (:446-449). Open hole (its cover is dress, S1 A3).
- Grilles y 4.4..5.9: hall south wall z 22 `[3.0, 4.2]` and `[8.6, 9.8]` (:441, noLedge kept); dock west wall x 14
  `[19.5, 21.0]` (:433); hall west wall x -4 `[19.5, 21.0]` (:464).
- CR8 sills: the two side strips (y 0..4.4, z 19.5..21.0) lose `noLedge` after the wall calls (:476-481; throws if a strip
  is not found).
- C10 baskets: `S4_BOX.b1 = [3.1, 22.15, 4.1, 40.8]`, `b2 = [8.7, 22.15, 9.7, 40.8]` (:102-103); B1's south box z
  22.15..32.4, the CR4 box unchanged.
- C11 racks: `S4_BOX.batteryRacks` (:116), built 0..2.0 noLedge (:475) (P1: east row z 21.0..23.5).
- Nav seed the plenum (5, 3.2, 19) (:202).
- `S4_COOP_LIPS` CR8 (:150-157) and CR8-west (:158-165) as the brief's literal, after CR4-west.

**Lights:** none (the plenum has no fitting).

**Dress (s4Dress.ts):** omitted-art change: the two `K:batteryRack` skins are dropped (:250-255). The kit piece is 1.2 m and
fits to scale 1.3 only (`campusKit.ts` fitRange), so the 2.0 racks threw `ArtRuleError ... scale 1.683 outside 0.8-1.3`
and the dressed build failed. The rows are still found by exact centre (`boxAt`, y 1.0) and logged in `S4_HERO_LOG`; the
base pass dresses them as greybox. B1 / B2 skins follow `S4_BOX` (no edit). Hero log otherwise unchanged.

**Sync nodes / devices:** none built or moved.

**Graph:** `s4-plenum`, `s4-baskets`, `s4-batt` notes -> "BUILT G4.2 (...)"; CR8 / CR8-west boosts, the two duct links and
the three plenum drops -> "BUILT G4.2 (...)".

**Tests:** `tests/campusV2S4Coop.test.ts` 24 / 24 (CR4 / CR4-west unchanged: 10 cases ported from T4:486-575; CR8 /
CR8-west: literal, solo jump and top landing threats [], rule 2, rule 3, rule 5 capsule and 1.5 m opening; the ledges on
the grille walls; the plenum (cover, hatch open, runtime-nav isolation); the baskets' run-on; the racks).
`tests/campusV2S4.test.ts` 8 / 8. Slice set: 7 files, 102 / 102; typecheck clean.

**Assumptions:** P1 (east rack row z 21.0..23.5) as the brief.
**Deviations:**
- D1 (test scope) CR8 / CR8-west rules 2 and 3 count the pieces on the lip's boost side of its wall only. The lobby side
  is under the 3.0-3.2 slab (the parcel cage x 11.5..12.7 top 1.2 is 1.6 m from the CR8 lip in plan but behind the wall
  and under the ceiling; the slab itself is within 1 m of the wall). `soloJumpThreats` already takes the outer side only.
  Undo: plan-only filters (then the cage and the slab fail them).
- D2 (dress) the battery rack skins omitted (above).

**Findings for the lead:**
- R1, concrete: the CR8 sills are the wall strips, 0.2 deep (dock wall P) and 0.3 deep (hall wall T). `generateLedges` makes
  them `canHang` but not `canClimbUp` (`LEDGE.climbDepth` 0.38, `anchors.ts:207`, `:414`): a hang only, so the climb into
  the plenum likely does not engage (E2E-1). The opening is 1.5 high (header 5.9). A fix is a lead call: a 0.4 deep sill
  piece, or a taller grille (the brief's R1 line).
- The battery racks need an art decision (a 2.0 m battery piece, or a two-tier skin).
- The runtime nav grid seeds the plenum (an island): no path from the lobby, the hall, the dock, the battery room or the
  basket B1 into it.

**Pending PC run:** `e2e-sectorops:1` .. `:6` (default flags); E2E-1 (v2): the CR8 / CR8-west climbs engage.

## G4.3 West strip: battery room, colonnade, UPS room, ess board (D:27-30, C12-C15)

Resumed by a second cloud builder (Sonnet) at 8bd64d26; the slice-set at that head was 7 files, 102 / 102, before any edit.

**Files:** `s4.ts`, `s4Data.ts`, `tests/campusV2S4.test.ts`, `tests/campusV2S4Lights.test.ts` (new), the graph, the fragment,
this report. `s4Dress.ts` unchanged (no skinned box moved: the battery rows and UPS cabinets keep their centres).

**Built (s4.ts lines):**
- C13 / C14 colonnade z 27.5..31: walls `wall(b, true, 27.5, ... doorHole(-8.5))` and `wall(b, true, 31, ... doorHole(-5.5))`
  (:481-482), battCC `doorAt(true, 27.5, -8.5, 0, -1)` (:483), ccUps `doorAt(true, 31, -5.5, 0, 1)` (:484), slab
  `slab(b, -10, -4, 27.5, 31, 3.2)` (:485). `S4_DOORS.battCC = [-8.5, 27.5]`, `ccUps = [-5.5, 31]` (:72-73);
  `S4_BOX.battery = [-10, 16, -4, 27.5]`, `ups = [-10, 31, -4, 48]`.
- hallCC walled: the `doorHole(29)` and its `doorAt` gone (:472-473); `S4_DOORS.hallCC` removed.
- C15 staff door UPS -> security room: `doorHole(46.5)` in the hall west wall and `doorAt(false, -4, 46.5, 0, 1)` (:473, :478);
  `S4_DOORS.upsSec = [-4, 46.5]` (:68); console z 43.2..45.6 (:542).
- Light (C12): `S4_LIGHTS.batt` (-7, 2.4, 24) r 3.6 i 0.8 cone down w 0.3, group `batt 142` (:308; `S4_GROUPS` gains `nc 140`,
  `riser 141`, `batt 142`, :51). Switch (-4.3, 0, 26.2) yaw -PI / 2 (:237, derived).
- Ess board `S4_BOARDS` second entry (-5.5, 0, 27.3) yaw PI groups [76, 77] window 25 (:188), `// sync-s4-ess-board`;
  `// sync-s4-yard-board` on the first (:186).
- Rooms: `s4-batt` z 16..27.5, `s4-cc` z 27.5..31 maxY 3.1, `s4-ups` z 31..48 (:249-251).

**Data (s4Data.ts):** #19 K3 (-8.8, 30.0) yaw PI / 2, takedown (-9.3, 30.0), post as built (:72); alarm-sec4 (-3.85, 43.0) (:161).

**Sync nodes:** ess board (sync-s4-ess-board) `s4.ts:188`; yard board (sync-s4-yard-board) `s4.ts:186` (unmoved).

**Graph:** `s4-batt`, `s4-cc`, `s4-ups` and the `s4-batt -> s4-cc`, `s4-cc -> s4-ups`, `s4-ups -> s4-sec` link notes -> "BUILT G4.3 (...)".

**Tests:** `tests/campusV2S4.test.ts` 8 -> 11 (colonnade; UPS door, console, alarm; K3 cone with #19 at (-8.8, 30.0)),
`tests/campusV2S4Lights.test.ts` 2 / 2 (ess board [76, 77] 25 s on nav, switching 76 + 77 darkens exactly the group-76 / 77
lamps; battery lamp on 142 with one switch within 1.5 m of hallBatt). Slice set: 8 files, 107 / 107; typecheck clean.

**Assumptions:** the ess-board lamp check reads "the NOC and security room lamps" as every S4 lamp on groups 76 / 77 (so the
G4.4 console lamp joins it). Undo: none needed.
**Deviations:** the T4 K3 case also asserts the three colonnade doors sit inside the cone; not ported (the brief lists only the
cone-blocker path and the leash margin), so battCC / ccUps are not asserted in the cone.
**Findings for the lead:** the graph `s4-batt` note still says the east rack row is "z 21.0..26.5" (plan text, P1 built 23.5).
**Pending PC run:** `e2e-sectorops:1` .. `:6` (default flags).
