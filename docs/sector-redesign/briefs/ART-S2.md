# ART-S2 brief - section 2 dressing: HQ atrium and offices (builder: Sonnet 5.5; checker: Opus, batch 2)

Read first: `ART-PLAN.md` sections 1-5.1 and the ART-KIT API in `src/world/campusArt/*.ts`. Source of every coordinate:
`src/world/maps/campusS2.ts` (read only; `F0` 0, `A1` / `F1` 4.4, `A2` / `F2` 8.4). Build exactly this; anything not
covered: simplest option, logged L1, L2 ... in `checks/art-s2-build.md`. Never ask. Acceptance A132-A136 + A152.
Branch `feature/sector-redesign-art-s2` off the ART-KIT head.

## 1. Room tags (`S2_ART_TAGS`)
| Room id | Tag | | Room id | Tag |
| --- | --- | --- | --- | --- |
| post | mailroom | | l1sw | office-open |
| mail | mailroom | | l1kitchen | kitchen |
| lift | lobby | | l1north | office-open |
| store | store | | l1fac | office-cell |
| foyer | reception | | l1wing | office-open |
| hall | atrium | | l2sw | office-open |
| hallne | lobby | | l2north | office-cell |
| plant | plant | | l2wing | office-open |
| roof | roof | | | |

## 2. Skins of greybox objects (`furn(b, x, z, w, h, d, color, y)` is a block: centre y = y0 + h / 2)
| Target (builder) | Centre (x, y, z) / size | Piece | Call |
| --- | --- | --- | --- |
| Reception desk | (-20, 0.55, -27.1) / 6 x 1.1 x 0.8 | H2 receptionCounter | `skinRow` along x, face +z (visitors on the turnstile side) |
| Turnstile barrier segments (4 boxes at z -23, h 1.1, T 0.3; the three 1.2 gates stay open gaps) | find with `boxesIn(-30, -23.2, -8, -22.8, 0, 1.2)` | H2 speedGate | `skinRow` along x on each segment |
| Cafe counter | (-19, 0.55, -5.6) / 6 x 1.1 x 0.6 | H2 cafeCounter | `skinRow` along x, face -z (the cafe side) |
| Cafe tables x 3 | (-13, 0.375, -9), (-13, 0.375, -6.5), (-22.5, 0.375, -9.5) / 1.0 x 0.75 x 1.0 | K cafeTable | `skin` |
| Mail cages x 3 | (-41.5, 0.9, -13.5), (-38, 0.9, -13.5), (-41.5, 0.9, -18.5) / 2.2 x 1.8 x 0.9 | F lockerBank? no: H2 mailCage | `skin` yaw 0 |
| Plant switchgear x 2 | (1.5, 0.9, -10), (1.5, 0.9, -22) / 2.4 x 1.8 x 1.0 | F switchgearPanel | `skinRow` along x (fit if the module depth allows, else H2 mailCage-style log L) |
| NW store block | (-42.5, 0.9, 3) / 1.4 x 1.8 x 3.0 | K shelving | `skinRow` along z (the stock behind reads solid: use H2 stockShelf instead if `skinFit` fails) |
| Post-room sorting table | (-35, 0.45, -26) / 3.0 x 0.9 x 1.0 | K labBench? no: H2 sortingTable | `skin` |
| Every desk 1.6 x 0.75 x 0.8 on L1 / L2 (the `furn` loops at A1 and A2) | each (x, F + 0.375, z) | F officeDesk (fit) | `skin`, yaw by the desk's long axis; then one F officeChair (see, K chairEnv box) on the side away from the nearest K1 / K2 leg, dropped + counted if it throws (`add` inside try / catch for chairs only) |
| L1 counter (-25, 4.95, -29.4) 5 x 1.1 x 0.6 (kitchen) | | K kitchenRun | `skinRow` along x, face +z |
| L1 BMS desk (-6.5, 4.775, 4.3) 3 x 0.75 x 0.9 | | H2 bmsDesk | `skin` yaw PI (operator side south) |
| L2 table (-38, 8.775, 3) 4 x 0.75 x 1.4 | | K boardTable (fit) | `skin` |
| Lift doors (visual, 9: x -40.93, z -10.5 / -8 / -5.5, floors 0 / 4.4 / 8.4; 0.14 x 2.1 x 1.2) | | H2 liftDoor | `skin` yaw PI / 2 |
| The CR2 planter (-9.0, 4.625, -8) / 0.6 x 0.45 x 6.0 | | H2 balconyPlanter | `skinRow` along z; **0 cm proud on its -x face** (the lip's headroom side) and the planting no higher than the box top |

## 3. Hero set H2 - the HQ atrium and reception (`hero_s2.py`, `HERO_S2`, id 'H2')
| Piece | Size (x / y / z) | What | Class | Tris |
| --- | --- | --- | --- | --- |
| receptionCounter (fit, row 3.0) | 3.0 x 1.1 x 0.8 | oak front with a brushed steel kick, marble transaction top, two monitors behind (overhang) | skin | 350 |
| speedGate (fit, row 1.0) | 1.0 x 1.1 x 0.3 | steel cabinet, glass top strip (the flaps retracted: nothing in the gaps), green status LED (`lamp`, group `S2_GROUPS.atrium`) | skin | 160 |
| cafeCounter (fit, row 3.0) | 3.0 x 1.1 x 0.6 | timber slat front, quartz top, coffee machine and a cake cabinet on top (overhang) | skin | 350 |
| mailCage (fit) | 2.2 x 1.8 x 0.9 | pigeon-hole sorting frame and roll cages, full (reads solid) | skin | 300 |
| sortingTable (fit) | 3.0 x 0.9 x 1.0 | post-room bench with trays | skin | 150 |
| stockShelf (fit, row 1.2) | 1.2 x 1.8 x 0.6 | boxed stationery stock | skin | 150 |
| bmsDesk (fit) | 3.0 x 0.75 x 0.9 | facilities desk, 3 monitors (overhang), plotter roll holder on the end | skin | 450 |
| liftDoor (fit) | 0.14 x 2.1 x 1.2 | brushed steel doors, frame, a call panel (visual box skin) | skin | 80 |
| balconyPlanter (fit, row 2.0) | 0.6 x 0.45 x 2.0 | trough with clipped box planting flush with the top | skin | 200 |
| logoWall | 4.0 x 1.2 x 0.05 | brushed steel panel with an abstract tide-line mark (no text, no real logo) | visual (flush) | 60 |
| tidewaterVitrine | F modelVitrine (reused) | the Tidewater relay model under glass | solid + see (F boxes) | - |
| seatingGroup | F loungeSeat x 4 + H2 lowTable | | solid (F) / H2 lowTable solid 1.2 x 0.4 x 0.6 | 60 |

Hero placements (`add`; throws are brief errors except where a fallback is listed):
| Piece | x, y, z | yaw | Why / fallback |
| --- | --- | --- | --- |
| logoWall | (-25.5, 1.8, -29.84) on the foyer's south wall | 0 | the brand wall behind reception |
| F greenWall | (-29.84, 0, -15) on the hall's west wall | PI / 2 | the atrium's planted wall; fallback z -2, then omit + L |
| F modelVitrine | (-10.6, 0, -27.4) | -PI / 2 | the Tidewater product display; fallback (-28.6, 0, -27.4), then omit + L |
| seatingGroup | lowTable (-27.4, 0, -19.5) yaw 0, loungeSeats at (-28.4, 0, -19.5) PI / 2, (-26.4, 0, -19.5) -PI / 2 | | visitors' seating; each piece omitted + L if it throws |
| F greenWall (second) | none | | - |

## 4. Base pass
`d.base()` last: offices get ceiling grids, diffusers, cabinets, whiteboards, printers; the kitchen gets a fridge and
cupboards; lobbies vending and plants; the roof condensers. Corridor, stair and door extras per ART-PLAN 4.2.

## 5. Views
s2-a (-20, 1.7, -29.3) -> (-20, 1, -23) reception from C1; s2-b (-12, 1.7, -22) -> (-18, 6, -5) the atrium up; s2-c
(-24, 1.7, -12) -> (-14, 0.8, -6) the cafe; s2-d (-42, 6.1, -28) -> (-32, 5, -10) L1 open plan west; s2-e (-22, 6.1, -23)
-> (-26, 5, -28) the breakout kitchen; s2-f (-1, 6.1, 1) -> (-6, 5, 4) the facilities office; s2-g (-24, 10.1, -28) ->
(-14, 9, -10) L2 offices.

## 6. Acceptance
- **A132** Tags per section 1.
- **A133** Skins per section 2 (each target once; the turnstile gaps stay empty: no piece within the three 1.2 gates;
  the CR2 planter skin 0 cm proud on -x, `soloJumpThreats` / headroom for the CR2 lip unchanged).
- **A134** H2 per section 3 (total H2 <= 4 k tris, GLB <= 0.4 MB); placements per section 3 or logged fallbacks.
- **A135** S2 gates green (`campusArtGameplay -t S2`, `campusArtLight -t S2`, `campusS2.test.ts` incl. K2 choke and A64,
  `campusRuntimeNav` S2 budget 200000 unchanged).
- **A136** S2 budgets (<= 40 draws, <= 150 k tris), report.
- **A152** (shared) ART-PLAN 5.1.

## Do not touch
`campusS2.ts` and every shared file; the atrium pendants, balcony downlights and their switches; the glass meeting-room
fronts; the keypad, the BMS terminal item, the alarm panels; the feature stair and the fire stairs (finishes only).
