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

## G4.4 NOC block: fire stair, roof hatch, escape, rooflight, lights (D:31-35, C16-C20)

**Files:** `s4.ts`, `s4Dress.ts`, `tests/campusV2S4.test.ts`, `tests/campusV2S4Lights.test.ts`, the graph, the fragment, this
report. (`s4Data.ts` needed nothing: the nav seed is in `s4.ts`.)

**Built (s4.ts lines):**
- C16 stair: `S4_FLIGHT` -> `S4_FLIGHTS` (two flights as the brief's literal, :91); NOC slab one rect minus the well x 0..4.2,
  z 45.1..47.85 via `slabCut` (S5's `subtract` / `slab(rect, top, holes)` copied as private `subtract` / `cutRect` / `slabCut`,
  :419-445), mid landing, spine, three rails (:587-592), `b.stairs` x 2 (:593). Nav seed (4.85, 3.6, 45.75) (:222).
- C17 roof slab = one rect x -10..34, z 16..48 minus the riser hatch, the NOC hatch and the rooflight (:490); hatch ladder and
  three rails (:601-605) - see A1.
- C19 rooflight pane `b.box(2, 7.275, 44.5, 4, 0.05, 2, GLASS_COLOR, 0, 0, true, false)`, `glass = 'clear'`, noLedge, overhead (:607-611).
- C18 escape: wall x 8 with two holes (:614), secNc `doorAt(8, 43.5, 0, 1)` (:616), escape door (8, 45.5, 3.6) swing -1 (:617),
  platform, four rails (:619-623), ladder `b.ladder(9.55, 45.5, 0, S4_NOC, -PI / 2)` (:624). `S4_DOORS.secNc = [8, 43.5]`,
  `nocEscape = [8, 45.5]` (:80-82).
- Lights: `console` (-2.0, 2.4, 44.6) r 3.6 i 0.8 `WARM` cone down w 0.3 group 77 (:328); `nc` x3 at (11.75 / 19.25 / 26.75, 3.5, 45) r 5
  i 0.8 cone 1.2 w 0.4 group 140 (:329); switch (21.2, 0, 42.3) yaw 0 on 140 (:254). The as-built NOC and security room lamps
  all stay; the window-seat lamp is not built (0.5 rule 2). The NOC switch (6.0, 3.6, 47.85) stays: 1.15 m from the hatch
  ladder (6.95, 47.2) (0.65 m from the brief's literal (6.6, 47.6)).

**Dress (s4Dress.ts):** hero log with the flag on: NOC video wall now lands on the west wall (-3.85, 3.6, 45.0) (the east wall has
no 3 m run left beside the escape door; fallback candidates added); NOC desk 1 at (-1.3, 3.6, 46.0); **NOC desk 2 omitted** (no
candidate passes the keepouts); security room desk (-0.5, 0, 46.9); the rest as G4.2. The NOC desk candidates now skip the
stair well and the hatch ladder's foot (before the filter desk 1 landed over the well at (0.1, 3.6, 45.6)). No skin moved.

**Sync nodes:** none built or moved (desk-sec4 (-2.8, 44.6) unmoved; the side door is now (8, 43.5)).

**Graph:** `s4-sec`, `s4-noc`, `s4-nc`, `s4-deck` and the `s4-sec -> s4-noc`, `s4-noc -> s4-deck`, `s4-noc -> s4-nc`,
`s4-sec -> s4-nc` link notes -> "BUILT G4.4 (...)", with "(A19: as-built lamps kept)" on the light lines.

**Tests:** `tests/campusV2S4.test.ts` 11 -> 15 (fire stair: risers, goings, 2R + G, slope rule, the stair path, headroom over 100+
flight cells; the NOC is no dead end: hatch ladder, escape, stair, rails, roof slab holes; bolt point clear; rooflight and the
sight line, and blocked when the pane is solid), `tests/campusV2S4Lights.test.ts` 2 -> 4 (console lamp warm on 77; corridor lamps on
140 with one switch within 1.5 m of ncDoor on nav; every S4 lamp on, lit, shootable, electric, from `S4_LIGHTS`). Slice set:
8 files, 113 / 113; typecheck clean.

**Assumptions:**
- **A1 (deviation from the literal, undo: one edit)** The brief's NOC hatch ladder `b.ladder(6.6, 47.6, S4_NOC, S4_DECK, 0)` faces
  north: its top step-off is z 48.05, inside the deck screen (z 47.85..48.15, 2.0 high), and the brief's rails close the other three
  sides (west, south, east), so nothing could climb out. Built instead: `b.ladder(6.95, 47.2, S4_NOC, S4_DECK, PI / 2)` (S1's
  hatch-ladder rule turned east: base 0.25 m inside the east rim, facing it, top 0.45 m past it, exit onto the deck at x 7.4+), and the
  east rail x 7.2..7.3 is two pieces (z 46.6..46.95 and 47.45..47.8) leaving the 0.5 m ladder gap (as R1's landing rail). The graph
  note already put the ladder at z 47.2. Undo: the literal ladder and the unbroken rail, plus a cut in the screen for the exit.
- NOC desk / video wall hero candidates (above): dress only.
**Deviations:** A1 only.
**Findings for the lead:** A1 (the plan's hatch sits 0.05 m off the deck screen, so the plan's "rails on three sides" has no exit;
if the lead wants the north exit the screen needs a gap); NOC desk 2 is omitted by the kit; `F:monitorWall` moved to the west wall.
**Pending PC run:** `e2e-sectorops:1` .. `:6` (default flags); E2E-1 / E2E-2 (v2): the hatch ladder, the escape ladder and the
fire stair climb, the nav of the dog-leg flights, the deck exit.

## G4.5 Compound, riser, deck, CR10 (D:36-40, C21-C25)

**Files:** `s4.ts`, `s4Data.ts`, `tests/campusV2S4.test.ts`, `tests/campusV2S4Coop.test.ts`, `tests/campusV2S4Lights.test.ts`, the
graph, the fragment, this report. (`s4Dress.ts` unchanged: no skinned box moved; the cage and poles get no art.)

**Built (s4.ts lines):**
- C22 riser partition x 30.5 (:638, door :641); `S4_BOX.nc = [8, 42, 30.5, 48]`, `riser = [30.5, 42, 34, 48]` (:114-115); rooms
  `s4-nc` maxX 30.5, `s4-riser` minX 30.5 (:276-277); `S4_DOORS.kpDeck = [30.5, 45]`. Riser-side keypad prop (:642).
- kp-riser: `doorHole(46.5, 0)` in the shell east wall, `doorAt(34, 46.5, 0, 1)` into the compound (:510); `S4_DOORS.kpRiser = [34, 46.5]`
  (:66); keypad `{ at: [34, 46.5], code: 's4-codes' }` in `S4_SECTOR.keypads` (`s4Data.ts:204`, `// kp-riser (Code Relay BT:102)`).
- C23 cage `bx(34.15, 35.05, 0, 4.4, 22.4, 23.6, STEEL)` (not noLedge), ladder `b.ladder(34.6, 23, 4.4, D, -PI / 2)`, two `noLedge`
  points (:673-679) - see A2.
- C25 four poles (`S4_DECK_POLES`, :103; built :688-689).
- CR10 in `S4_COOP_LIPS` (:188).
- Lights: `deckFloods` x4 at 12.3, r 7.5, i 0.9, cone 1.15, w 0.6, group 79 (:349); `riser` (31.2, 3.5, 47.2) r 4 i 0.7 no cone w 0.3 group 141
  (:350); switch (30.75, 0, 46.2) yaw PI / 2 on 141 (:271). The two compound floods stay on the yard board (75); the plan's single flood is
  not built (0.5 rule 2). Group 79 has no switch (photocell, the LD 5.1 named reason).

**Sync nodes:** none built or moved; the yard board (33.85, 0, 20.8) group 75, 20 s is unmoved (`s4.ts:186`).

**Graph:** `s4-yard`, `s4-riser`, `s4-deck` and the CR10, `s4-deck -> s4-yard`, `s4-yard -> s4-riser`, `s4-nc -> s4-riser` link notes -> "BUILT G4.5 (...)".

**Tests:** `tests/campusV2S4.test.ts` 15 -> 17 (riser: partition, kp-deck, kp-riser, prop, codes, the compound -> riser path; plant ladder
and poles); `tests/campusV2S4Coop.test.ts` 24 -> 29 (CR10 as briefed; no solo jump / top landing; rules 2, 3, 5; no floor attach by `reach()`
and the cage top attaches; the planned ledge; the lip list now CR4, CR4-west, CR8, CR8-west, CR10); `tests/campusV2S4Lights.test.ts` 4 -> 5 (group
79 = 4 + 4, no switch; group 75; riser lamp on 141 with its switch). Slice set: 8 files, all pass (counts at the end of the report); typecheck clean.

**Assumptions:**
- **A2 (deviation, undo: 0.5)** `b.noLedge(34.6, 22.4, 0.5)` / `(34.6, 23.6, 0.5)` as briefed also remove the east lip: `suppressLedgesNear`
  drops every ledge whose nearest point is within r, and the lip's ends are 0.45 m from those points. The first CR10 ledge test showed no
  `canHang` ledge left. Built with radius 0.4 (the north and south edges still go; the east lip stays).
**Deviations:** A2.
**Findings for the lead:** A2 (the brief's literal 0.5 kills CR10; a test that builds `generateLedges` alone misses it, the noLedge points apply in
`LevelBuilder.build`). The test helper applies them (`noLedgeAt`) to see the real result.
**Pending PC run:** `e2e-sectorops:1` .. `:6` (default flags); E2E-1 / E2E-2 (v2): the CR10 leg-up and the cage-top ladder attach, the kp-riser door.
