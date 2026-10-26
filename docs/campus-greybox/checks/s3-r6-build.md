# campus-greybox S3 R6 / R7 build report (sub-lane r6, cloud)
Owner: Night Shift | Sector Ops Build. Status: current.

Builder: Night Shift | Cloud Builder 2 (Opus), 2026-10-25. Brief: `docs/campus-greybox/briefs/S3.md` section 4 "R6" and
"R7"; cloud brief `briefs/campus-greybox-s3-r6.md` (cloud-queue). Branch `feature/campus-greybox-s3-r6` from the join head
fb2666ff (r5, r1-r4 merged; `merge-base --is-ancestor` checked). Unit tests only (flag on: `flags.campusV2 = [3]`).

## Commits
| Commit | What |
| --- | --- |
| 5f00ff6c | Step 0a: `s3L1.ts:67` chamber-roof seed x 33 -> 32, `campusV2S3L1.test.ts:533` the pinned row (the join's fix) |
| 737cad47 | R6: `S3_COOP_LIPS` CR3, CR3b (`s3Lips.ts`) |
| 4ebd6f71 | Lead-approved one-liner: `s3Data.ts:202` R_VOID point 8 (20.8, -1, 7.5) -> (21.4, -1, 7.5) |
| 4ea38f80 | R6: `tests/campusV2S3Coop.test.ts` (22) |
| de17cb3c | R6: the v2 graph as built |
| cba52e86 | R6: `tests/campusV2S3Graph.test.ts` (5) |
| f4774b99 | R7: `s3Dress.ts` re-run, `tests/campusV2S3Dress.test.ts` (10) |
| (this) | fragment `changes/feature-campus-greybox-s3-r6.md` (`kind: minor`) and this report |

## Step 0 - baseline on fb2666ff (before 0a)
The brief's list (`campusV2S3*`, `campusS3*`, `campusV2`, `campusRuntimeNav`, `campusDressRules`): 12 files, 177 passed.
`campusV2S3Guards.test.ts` ran its merged half (MERGED true): 16 passed (the brief's 15 plus the join's stair-core
case), A99 worst 11 at (15.75, 6.00, -29.25) (<= 12), `checkSectors` empty (its case passes). The join's own tests hold
the rest: the L1 landing cells walkable after J3, no guard slot or route point in a stair core. After 0a,
`campusV2S3L1` + `campusV2S3Shell` 26 / 26.

## R6 - lips, nav reach, graph
- Lips (`src/world/maps/campusV2/s3Lips.ts`): CR3 :12 (x 30, z -22..-14, 4.4, n (-1, 0); top the chamber; boost floor 0 at
  (29.2, -18)); CR3b :20 (x 18, z -6..-3, 4.5, n (1, 0); top x 10..18, z -7..0 at 4.5; boost floor 0.1 at (18.8, -4.5),
  derived 0.8 m off the lip). The CR3 ledge is generated from the chamber box (`s3Shell.ts:140`); the CR3b ledge is the
  join's J8 manual ledge (`s3L1.ts:300`), not added again. Wiring unchanged (`s3Data.ts` coopLips -> `CAMPUS_COOP_LIPS`).
- `tests/campusV2S3Coop.test.ts` 22 / 22: data and wiring (CR3 / CR3b once each in `CAMPUS_COOP_LIPS`); each lip's ledge
  (one run, hang and climb up, normal toward the boost side, climb room at x 30.67 / 17.33: a top under it and a body
  radius clear to 1.75); lift 4.4 each (> `WALL_JUMP.maxUp` 3.8), boost spots on nav; no solo running jump to either lip
  or the chamber's other faces (0.5 m margin); no solo landing on either top; nothing standable >= 1.2 within 4 m of the
  roof or >= 1.0 within 4 m of the CR3b lip (the gas cage 4.5 m off); no step 0.3-4.3 within 1 m under either lip; headroom
  (CR3 4.5-6.2, CR3b to the 7.5 ceiling, the hoist room's lid present); the roof from the gallery over the spur's bridge
  plate and not with the spur blocked; the gallery and spur not from the hall floor (rails noLedge); the hatch drop (open
  hole, 4.4 onto the pad, <= 4.5, pad on nav); three-stairs reach on the full build per core with the other two blocked and
  no ladder links (path crosses the core, both ways); the flood from the landing reaches 18 spaces (hall, low aisle, dock,
  control, plant, corridor, east lobby, the north rooms, sec, walkway via the ladder links, gallery, chamber roof, both
  stair cores); nothing east of x 64; the void deck not on the guards' grid; both panels seen from every near point.
- Fail-first (local, not committed; the CR3 / CR3b ledge cases only): (A) chamber `noLedge` -> CR3 case fails; (B) chamber
  0.3 deep (x 30..30.3) -> CR3 fails; (C) CR3b manual ledge removed -> CR3b fails; (D) CR3b ledge hang-only
  (`canClimbUp: false`, the state a 0.3-deep lip gives) -> CR3b fails. Geometry restored after each.
- Test points adjusted: the chamber roof is sampled at (32, -18), not (33, -18): R1's roof plant stands at x 33.5..35.5
  (the join's seed fix for the same reason); the gallery-edge jump check skips the chamber roof (the planned step from
  above), as the live test does for the spur.
- Graph (`docs/sector-redesign/graph/v2/campusOps-S3.json`): ids, links and syncs unchanged (values; checked on write and
  by the Sync test 5 / 5); `meta.players` [1, 2, 3, 4] and the five sections were already there; compact (125 lines).
  Guard keys (each guard in the space whose `area` holds his slot on his storey):

  | Space | "1".."4" | Guards |
  | --- | --- | --- |
  | s3-c2 | 1 | #1 |
  | s3-view | 4 | #2, #3, #5, #15 |
  | s3-gown | 1 | #4 |
  | s3-hall | 6 | #6, #7, #8, #11, #16, #17 |
  | s3-dock | 4 | #9, #10, #18, #20 |
  | s3-sec | 1 | #12 |
  | s3-writeup | 1 | #13 |
  | s3-plant | 1 | #14 |
  | s3-control | 1 | #19 |
  | total | 20 at every key | no stair room, no `unavoidable` |

  "as built (R6): ..." notes on 13 spaces for P1, P2, P3-P7, P8, P9, P10-P11, P12, P13, P14, P15, P16, P17, P19, P22 and
  R5-A1 / A2; the targets (hall, dock) "measured: pending V6". Link-level P-items are noted on the space they sit in (the
  links stay unchanged).
- `tests/campusV2S3Graph.test.ts` 5 / 5: meta, ids, syncs; the guard keys computed from `S3_GUARDS` by the rule above
  (each guard in exactly one space); every space's area holds a floor on its storey (nav; the void a deck with crouch
  room); the 15 door links each have a door anchor within 0.6 m of their `S3_DOORS` door on its floor (and the reason's
  "(x, z)" agrees); the solo route start -> grab -> C3 (via c3Near) with CR3 and CR3b blocked solid.
- Validator: `node scripts/level-validate.mjs` on the five v2 graphs, before and after: 0 errors, 119 warnings; S3's are
  the nine of D:217-224 (four `custom` classes, the hall's size and ceiling, the two stair ceilings, the C3 stub width);
  no new kind. No `--require-measured` (not on master).

## R7 - dressing re-run
- `S3_ART_TAGS` for the 17 v2 rooms; gone: `s3-lobby`, `s3-back`, `s3-strip`, `s3-yard`. New rooms, nearest existing
  tag: `s3-control` noc (consoles), `s3-hoist` store, `s3-plant` plant, `s3-hall-aisle` lab-hall, `s3-east` corridor, the J1
  stair rooms `s3-wstair` / `s3-nstair` / `s3-estair` corridor.
- Skins on the v2 boxes: chamber (west face flat), roof plant, EMC room, 19 racks, 2 lab benches (the north one at
  z -11.55, P8), log desk, 6 hoarding panels, gas bottles in the NW cage (11.4, -1.8), 4 shelving pieces on the x 53
  partition. Hero spots moved into the v2 rooms: pass-through hatch (37.35, -5), both mats, four hazard plates (the cage's
  blast wall x 13.65, beside panel-gown, the x 53 partition north of the gap, the EMC door). The crane girder runs
  east-west at (33, -19) after (31, -19) failed K10: the 20.4 m piece no longer fits the 19 m deep hall north-south.
- Logged, not placed (`S3_HERO_LOG`, rule ids): the clean bench (rule C at every spot: the clean-suite route crosses the
  7 m deep clean room on z -3), the gowning bench (K1 / K2 / K4), the lockers (face skins S, floor spots K1 / K2 / K4 / K5,
  as v1), the dock desk (office and reception desks past their fit at 2.0 m; the security desk fits but blocks cam-dock,
  K8, so it is not tried: the desk stays greybox).
- `tests/campusV2S3Dress.test.ts` 10 / 10: tags, skins and counts, the chamber's west face, the hoist hatch's west edge bare
  (CR3b), the girder (walkway + 1.9, lamps 0.5, inside the walls), placements placed or logged with their rule, no wall
  piece on glass, `checkDressing` clean for section 2 with the flag on, budgets, a `dress: true` campus build that does
  not throw (it threw on the base: the v1 bench box).

## Tests at the end
`npm run typecheck:fast` clean; eslint on the five new / edited source and test files clean. `npx vitest run
--maxWorkers=2` on the brief's list: 15 files, 214 passed (Coop 22, Graph 5, Dress 10, DressRules 33, RuntimeNav 3,
campusS3 32, campusS3Dress 13, campusV2 9, Frame 4, Guards 16 (A99 worst 11), L1 17, Lights 11, Shell 9, Stairs 25,
Sync 5). Default build (flag off) unchanged: `campusS3*` green untouched.

## Deviations (each with its undo)
1. Graph link-level "as built" notes go on the spaces (links kept unchanged so the Sync test and the ids stay byte-equal in
   value). Undo: move a note onto its link.
2. Three-stairs reach drops the ladder links (the walkway ladders join G and L1 too). Undo: keep them and drop the
   "crosses the core" assertion.
3. The void's floor check is a deck with crouch room, not a guards' nav cell (it is a 1.5 m crawl by design).
4. Crane girder east-west (see R7). Undo: a shorter girder piece north-south.
5. Dock desk bare greybox (see R7). Undo: a 2.0 m desk piece in the facility set, or a dispatch desk at 0.75.

## Findings for the lead
- The clean bench (a D:215 hero piece) cannot stand in the v2 clean room under rule C while the clean-suite route runs
  along z -3 through it: a route change or a rule exception decides.
- The dock desk needs a 2.0 m, 0.75 high desk piece (none in the kit fits; the security desk blocks cam-dock).
- The trench is not built (P14, the campus ground box): no change here.
- Data pushed: Marlow can re-run the validator on `graph/v2/` (the brief's final step; cloud sessions cannot message).

## Pending PC run
`e2e-sectorops:1` .. `:6` flag off at the head (`node scripts/laptop-queue/request.mjs --sha <full sha> --pr <n> --suites
"e2e-sectorops:1 e2e-sectorops:2 e2e-sectorops:3 e2e-sectorops:4 e2e-sectorops:5 e2e-sectorops:6" --set s3-f --requester
"Night Shift | Sector Ops Build"`); E2E-1 CR3 / CR3b boost and climb-up; E2E-2a v2 walk (stairs, plenum, hatch drop, void
route); `scripts/plan-svg.mjs` render vs P0 / P45; V6 measured targets.

## What Michael should try (once v2 S3 is switched on)
`/preview/?campusv2=3&sectorStart=3` > Sector Ops > Saltmarsh Park > Normal > Start: boost a partner onto the test chamber
from the hall floor (west face) and onto the goods landing from the loading pad; check neither can be climbed alone.
