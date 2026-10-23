# ART-S3 brief - section 3 dressing: the lab block (builder: Sonnet 5.5; checker: Opus, batch 2)

Read first: `ART-PLAN.md` sections 1-5.1 and the ART-KIT API. Coordinates: `src/world/maps/campusS3.ts` (read only;
`S3_BOX`, L1 floor 4.5). Anything not covered: simplest option, L-log in `checks/art-s3-build.md`. Never ask.
Acceptance A137-A141 + A152. Branch `feature/sector-redesign-art-s3` off the ART-KIT head.

## 1. Room tags (`S3_ART_TAGS`)
s3-lobby lobby; s3-c2 lobby; s3-hall lab-hall; s3-dock dock; s3-view corridor; s3-writeup office-cell; s3-gown lab-gown;
s3-clean lab-clean; s3-back corridor; s3-store lab-store; s3-strip corridor; s3-sec security; s3-yard ext-service.

## 2. Skins
| Target | Source | Piece | Call |
| --- | --- | --- | --- |
| Environmental chamber walls | `S3_BOX.chamber` x 30..36, z -22..-14, 0..4.4 | H3 chamberWall | `skinRow` on each of its 4 faces; **west face (the CR3 lip): nothing proud > 1 cm, no handles, no seams deeper than 5 mm** |
| Chamber refrigeration plant | box x 33.5..35.5, y 4.4..5.6, z -21..-15 | H3 condensingUnit | `skin` |
| EMC room | `S3_BOX.emc` x 42..48, z -24..-16, 0..4.0 | H3 emcPanel | `skinRow` on 4 faces; the shielded door drawn closed on the north face (visual, no gap) |
| Burn-in racks x 3 | `S3_BOX.racks`, top 2.2 | F serverRack | `skinRow` along z, fronts facing -x (the hall) |
| Benches x 3 | `S3_BOX.benches`, top 0.9 | K labBench | `skin` (the reagent shelf is an open frame: members <= 5 cm, ART-PLAN rule V exception) |
| Crane bay board screen | x 26.5..26.8, z -21.5..-10.5, h 3.0 | H3 hoardingPanel | `skinRow` along z |
| Dock desk | the one box 0.8-1.0 high in `s3-dock` (`boxesIn`; if not exactly one: L-log, skip) | F dispatchDesk (fit) | `skin` |
| Store shelving partition | x 48.5, h 2.4 (both runs either side of the aisle gap z -4.6..-3.4) | H3 stockShelf | `skinRow` along z; nothing in the gap (the beams cross it) |

## 3. Hero set H3 - the lab block (`hero_s3.py`, `HERO_S3`, id 'H3')
| Piece | Size (x / y / z) | What | Class | Tris |
| --- | --- | --- | --- | --- |
| chamberWall (fit, row 1.2) | 1.2 x 4.4 x 0.06 | white insulated panels, cam-lock seams, a viewing port and a door on the east face (visual only) | skin | 120 |
| condensingUnit (fit) | 2.0 x 1.2 x 6.0 | refrigeration condenser, two fan grilles on top, pipe stubs into the roof | skin | 500 |
| emcPanel (fit, row 1.2) | 1.2 x 4.0 x 0.06 | copper-clad shielding modules, the closed RF door with finger-stock and a "TEST IN PROGRESS" lamp box (`lamp`, dark: the room is off) | skin | 120 |
| hoardingPanel (fit, row 1.2) | 0.3 x 3.0 x 1.2 | plywood hoarding with braces on the crane-bay side | skin | 60 |
| stockShelf (fit, row 1.2) | 0.6 x 2.4 x 1.2 | steel shelving full of anti-static boxes (reads solid) | skin | 200 |
| craneGirder | 26 x 0.8 x 0.6 | parked overhead travelling crane girder with hoist, spanning the hall north-south | visual (ceiling class) | 800 |
| cleanBench | 1.8 x 2.2 x 0.8 | laminar-flow bench against a wall | solid | 300 |
| passBox | 0.6 x 0.6 x 0.15 | the clean room's wall pass-through hatch | visual (flush) | 60 |
| stickyMat | 1.2 x 0.005 x 0.9 | tacky mat at the gowning doors | visual (floor) | 4 |
| hazardPlate | 0.4 x 0.4 x 0.02 | gas / laser / RF warning plates (no text) | visual (flush) | 10 |

Hero placements (`add`):
| Piece | x, y, z | yaw | Why / fallback |
| --- | --- | --- | --- |
| craneGirder | (25.0, 8.0, -19.0) | 0 | parked over the crane bay; must clear the walkway top 6.0 + 1.9 and every high-bay lamp by 0.5; fallback x 23.5, then omit + L |
| cleanBench | against the clean room's north wall, centre (36.5, 4.5, -0.85) | PI | the clean-room bench; fallback the east wall, then omit + L |
| passBox | on the gowning / clean partition at (33, 5.6, -3) | PI / 2 | the pass-through |
| stickyMat | (31.5, 4.5, -3) and (34, 4.5, -3) | 0 | at each gowning door |
| F holdingBench | (31.5, 4.5, -5.4) | 0 | the gowning bench; omit + L if it throws |
| F kitCaseWall row | along the gowning room's south wall x 30.2..32.8 | 0 | gown lockers; modules dropped individually if they throw |
| K gasCylinders x 2 | inside the gas cage (find its blockwork box in `s3-dock`, NE corner), against its back wall | toward the cage door | the cylinders the dock guard checks |
| hazardPlate | one on the gas cage door, one on each laser panel's wall 0.6 m beside it (not over it), one on the EMC door | - | warnings |

## 4. Base pass, views
`d.base()` last. Views: s3-a (23, 1.7, -19) -> (40, 2, -19) the hall from the west door; s3-b (27, 1.7, -24) ->
(33, 2.5, -18) the chamber; s3-c (46, 1.7, -24) -> (51, 1.2, -15) burn-in racks; s3-d (25, 7.7, -29) -> (45, 6, -20) the
crane walkway; s3-e (23, 6.2, -7) -> (50, 5.5, -7) the viewing corridor; s3-f (31, 6.2, -1) -> (37, 5.2, -4) gowning and
clean room; s3-g (45.5, 6.2, -1) -> (50, 5.5, -5) the prototype store.

## 5. Acceptance
- **A137** Tags. **A138** Skins per section 2; the CR3 west face check (no part of chamberWall on x 30 proud > 1 cm;
  CR3 `soloJumpThreats` / headroom unchanged). **A139** H3 (<= 5 k tris, GLB <= 0.4 MB), placements or logged fallbacks.
- **A140** S3 gates green (`campusArtGameplay -t S3`, `campusArtLight -t S3`, `campusS3.test.ts`, `campusRuntimeNav`);
  the las-gown / las-store beams clear (K9). **A141** S3 budgets, report. **A152** shared.

## Do not touch
`campusS3.ts` and shared files; high bays, task lights and their switches; laser emitters and panels; the keypads; the
viewing-corridor glass; the escape gallery and the crane walkway (no box on or over them below + 1.9).
