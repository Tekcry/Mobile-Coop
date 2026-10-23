# ART-S5 brief - section 5 dressing: the Old House (builder: Sonnet 5.5; checker: Opus, batch 2)

Read first: `ART-PLAN.md` sections 1-5.1 and the ART-KIT API. Coordinates: `src/world/maps/campusS5.ts` (read only;
`S5_BOX`, `S5_GROUPS`, L1 4.2). Anything not covered: simplest option, L-log in `checks/art-s5-build.md`. Never ask.
Acceptance A147-A151 + A152. Branch `feature/sector-redesign-art-s5` off the ART-KIT head.

## 1. Room tags (`S5_ART_TAGS`)
s5-ctl oh-control; s5-draw oh-formal; s5-hall oh-hall; s5-pass oh-corridor; s5-ante oh-ante; s5-strong strongroom;
s5-vest oh-corridor; s5-back oh-service; s5-plant plant; s5-lobby oh-service; s5-kitchen oh-kitchen; s5-board oh-formal;
s5-ceo oh-formal; s5-gal oh-hall; s5-arch oh-archive; s5-landing oh-corridor; s5-low roof; s5-roof roof; s5-garden
ext-garden; s5-terrace ext-terrace; s5-lawn ext-garden; s5-jetty ext-jetty.

## 2. Skins
| Target | Source | Piece | Call |
| --- | --- | --- | --- |
| Control-room rack rows x 3 | x -56..-51.6, z centres `S5_BOX.racks`, 0.3 thick, 2.2 high | H5 radioRackRow | `skinRow` along x |
| Gallery screens x 2 | `S5_BOX.screens` (L1, 2.2 high) | H5 displayScreen | `skinRow` along z |
| Archive rolling stacks x 3 | `S5_BOX.stacks` (L1, 2.2) | H5 rollingStack | `skin`; handwheel on the aisle end <= 5 cm proud |
| Token table | `S5_BOX.token` (0.9 high) | H5 tokenPlinth | `skin`; top flush (the game's token model sits on it) |
| Chimney stacks x 4 | boxes at `S5_BOX.chimneys` on the roof | H5 chimneyStack | `skin` (pots above: <= 0.3 dia, rule V) |
| Trees x 6 | cylinders at `S5_BOX.trees` | K treeSkin | `skinCyl` |
| The van | `S5_BOX.van` box | H5 panelVan | `skinHide` (ART-PLAN AS10) |
| Terrace balustrade (1.0) | boxes on the terrace edge (`boxesIn` in `S5_BOX.terrace`, h 0.9-1.1, thin) | H5 balustrade | `skinRow`; the gate and the boathouse path openings stay open |
| Board table / CEO desk / kitchen counters | any desk / table / counter box in s5-board, s5-ceo, s5-kitchen (`boxesIn`, 0.7-1.0 high) | K boardTable / F officeDesk / K kitchenRun (fit) | `skin` / `skinRow`; L-log what was found |

## 3. Hero set H5 - the strongroom and the house (`hero_s5.py`, `HERO_S5`, id 'H5')
| Piece | Size (x / y / z) | What | Class | Tris |
| --- | --- | --- | --- | --- |
| radioRackRow (fit, row 1.1) | 1.1 x 2.2 x 0.3 | radio and CCTV recorder racks, equipment both faces, LEDs (`lamp`, group `S5_GROUPS.ctl`) | skin | 200 |
| displayScreen (fit, row 1.2) | 0.3 x 2.2 x 1.2 | oak-framed display screens hung with framed plans of the house | skin | 120 |
| rollingStack (fit) | 1.4 x 2.2 x 1.0 | rolling archive stack, archive boxes, handwheel | skin | 300 |
| tokenPlinth (fit) | 1.2 x 0.9 x 0.6 | steel plinth with a green baize top and an empty key-case recess | skin | 150 |
| chimneyStack (fit) | per box | brick stack with a stone cap and two clay pots | skin | 200 |
| panelVan (fit) | 2.0 x 2.0 x 5.0 | the courier's panel van (no livery text) | skin-hide | 1200 |
| balustrade (fit, row 1.0) | 1.0 x 1.0 x 0.3 | stone balusters (gaps <= 8 cm) under a coping | skin | 200 |
| vaultFrameSlim | per the opening: jambs 0.3 wide, 0.12 proud each face | steel architrave with bolt-work round the strongroom opening (z 37) | visual (flush, rule V) | 300 |
| leafEnv | (box only) 0.6 x 2.2 x 1.5 | the see box under the open vault leaf | - | 0 |

Hero placements (`add`):
| Piece | x, y, z | yaw | Why / fallback |
| --- | --- | --- | --- |
| vaultFrameSlim | centred on the anteroom / strongroom opening in the z 37 wall (find it with `wallRuns` of s5-strong: the one gap) | 0 | the strongroom door frame; if the gap is not 1.0-1.8 wide: omit + L |
| F vaultLeaf + leafEnv | open 180 deg, flat against the strongroom's south wall inner face, hinge on the opening's west edge | - | the leaf stands open tonight (AS8); if `add` throws: omit the leaf, L-log (the frame stays) |
| F depositWall rows | along the strongroom's west (x -46) and east (x -40) inner faces, z 38.0..43.4 | facing in | safe-deposit boxes; modules dropped individually if they throw |
| F timeLockPanel | strongroom south wall inner face, 0.6 east of the opening, y 1.4 | 0 | the time lock |
| F monitorWall | control room east wall (x -50 inner face), centre z 24, y 0 | -PI / 2 | the house CCTV wall; omit + L if it throws |
| K fireplace + K portraitFrame | per the base rules (chimney rooms); the stair hall gets K longcaseClock at (-49.5, 0, 31.2) yaw PI | | the house's period fittings; omit + L |

## 4. Base pass, views
`d.base()` last (formal rooms: bookcases, portraits, radiators, sideboards; kitchen runs and range; the archive's shelving).
Views: s5-a (-48, 1.7, 20) -> (-44, 3, 26) the stair hall and chandelier; s5-b (-43, 1.7, 33) -> (-43, 1.2, 42)
anteroom to strongroom; s5-c (-41, 1.7, 43.5) -> (-45, 1.2, 38) inside the strongroom; s5-d (-39, 5.9, 43) ->
(-44, 5.2, 35) the archive; s5-e (-51, 5.9, 19) -> (-54, 5, 28) the boardroom; s5-f (-30, 1.7, 47) -> (-55, 1, 52) the
terrace and lawn; s5-g (-35, 1.7, 59) -> (-46, 1, 63) the jetty extract.

## 5. Acceptance
- **A147** Tags. **A148** Skins per section 2; the van `skin-hide` within AS10 bounds. **A149** H5 (<= 5 k tris, GLB
  <= 0.5 MB); placements or logged fallbacks (AS8 for the leaf).
- **A150** S5 gates green incl. `campusS5.test.ts` (K4 choke in the anteroom unchanged: no new box in s5-ante; M8, A64,
  dogs), CR6 / CR7 (the archive cage, the light well and its rope edge: nothing within K7 / K11), las-shaft clear.
- **A151** S5 budgets, report. **A152** shared.

## Do not touch
`campusS5.ts`, `campusS5Data.ts`, shared files; the chandelier and every lamp; the archive cage and pair-gate switches;
the light well, the hoist door and rope edge; the rappel gap; the jetty extract zone; the front, side and shaft doors.
