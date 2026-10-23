# ART-S4 brief - section 4 dressing: the data hall (builder: Sonnet 5.5; checker: Opus, batch 2)

Read first: `ART-PLAN.md` sections 1-5.1 and the ART-KIT API. Coordinates: `src/world/maps/campusS4.ts` (read only;
`S4_BOX`, `S4_PODS`, `S4_NOC`, `S4_GROUPS`). Anything not covered: simplest option, L-log in `checks/art-s4-build.md`.
Never ask. Acceptance A142-A146 + A152. Branch `feature/sector-redesign-art-s4` off the ART-KIT head.

## 1. Room tags (`S4_ART_TAGS`)
s4-dock dock; s4-sc corridor; s4-lobby / s4-lobby-b / s4-lobby-c lobby; s4-mantrap mantrap; s4-batt battery; s4-cc
corridor; s4-ups ups; s4-hall / s4-hall-w / s4-hall-e / s4-hall-n data-hall; s4-cage cage; s4-sec security; s4-noc noc;
s4-nc corridor; s4-riser riser; s4-yard ext-compound; s4-deck roof-plant.

## 2. Skins
| Target | Source | Piece | Call |
| --- | --- | --- | --- |
| Pod rack rows (2 per pod) | `pod()`: x0..x0+1.2 and x0+2.4..x0+3.6, z 24..32, h 2.2, x0 in `S4_PODS` | F serverRack | `skinRow` along z; row 1 fronts -x, row 2 fronts +x (the cold aisles) |
| Pod containment panels | x0..x0+0.1 and x0+3.5..x0+3.6, y 2.2..2.9 | H4 containPanel | `skinRow` along z |
| Pod roofs | x0..x0+3.6, y 2.9..3.0 | H4 podRoof | `skinRow` along z (visual skin of an overhead slab) |
| Cable baskets | `S4_BOX` b1, b2, b3, bN, bCage, stub (tops 4.4, 0.4 thick) | H4 basketRun | `skinRow` along each; top flush (+0 to +1 cm); **the CR4 box `cr4`: nothing proud on its east / west faces** |
| Spare rack | `S4_BOX.spareRack` | F serverRack | `skinRow` along x, fronts -z |
| CRAC units | `S4_BOX.crac` | H4 cracUnit | `skinRow` along x, fronts -z |
| Battery racks x 2 | `S4_BOX.batteryRacks` (h 1.2) | K batteryRack | `skinRow` along z |
| UPS cabinets | `S4_BOX.upsCabinets` | H4 upsCabinet | `skinRow` along z, fronts +x |
| Chillers x 4 | `S4_BOX.chillers` (on the deck, 7.3) | H4 chiller | `skin` |
| Generator | `S4_BOX.generator` | H4 genset | `skin` |
| Fuel tank | `S4_BOX.tanks` | H4 fuelTank | `skin` |
| Dock crate stacks x 2 | boxes in `s4-dock` 1.0-2.0 high (`boxesIn`) | F palletLoad (fit) or H4 crateStack | `skin` |
| Cage faces | thin boxes (<= 0.12) on the `S4_BOX.cage` perimeter, >= 2.2 high (`boxesIn`) | F meshPanel | `skinRow`; the pair-gate and front-gate doors stay the game's |

## 3. Hero set H4 - the data hall (`hero_s4.py`, `HERO_S4`, id 'H4')
| Piece | Size (x / y / z) | What | Class | Tris |
| --- | --- | --- | --- | --- |
| containPanel (fit, row 1.2) | 0.1 x 0.7 x 1.2 | hot-aisle containment: framed smoked polycarbonate (reads as a panel, solid look) | skin | 40 |
| podRoof (fit, row 1.2) | 3.6 x 0.1 x 1.2 | containment roof with cable cut-outs and a blanking lip | skin | 60 |
| basketRun (fit, row 1.0) | 1.0 x 0.4 x 1.0 | wire-mesh cable basket full of cable bundles, trapeze hangers with drop rods to the slab (rods <= 2 cm: rule V frame) | skin | 200 |
| cracUnit (fit, row 2.0) | 2.0 x 2.2 x 1.2 | downflow cooling unit, louvred front, a status display (`screen`, group `S4_GROUPS.cold1`) | skin | 200 |
| upsCabinet (fit, row 0.8) | 0.8 x 2.0 x 1.0 | UPS / battery cabinet line-up, mimic panel (`lamp` LEDs, group `S4_GROUPS.ups`) | skin | 120 |
| chiller (fit) | 4.0 x 2.2 x 2.0 | air-cooled chiller, 2 fan stacks on top | skin | 500 |
| genset (fit) | 3.0 x 2.6 x 6.0 | containerised generator, louvres, exhaust stack 0.3 dia above the roof | skin | 500 |
| fuelTank (fit) | 3.0 x 1.6 x 4.0 | bunded fuel tank, fill point | skin | 250 |
| crateStack (fit) | 1.2 x 1.5 x 1.0 | replacement drives in flight cases (the 03:00 courier's) | skin | 150 |
| suppressionBank | 1.2 x 1.7 x 0.35 | gas-suppression cylinders in a wall rack | see | 300 |
| floorGrid | K floorTileGrid (fit) | raised-floor tile lines over the hall floor (3 mm decal) | visual | - |

Hero placements (`add`):
| Piece | x, y, z | yaw | Why / fallback |
| --- | --- | --- | --- |
| F monitorWall | NOC north wall inner face, centre x 2, y `S4_NOC`, z 47.85 (read the wall face) | PI | the NOC video wall; fallback x 0, then omit + L |
| F securityDesk x 2 | (0, S4_NOC, 46.2) and (4, S4_NOC, 46.2) | PI (operators south of the desk, facing the video wall) | NOC operators; each omitted + L if it throws |
| F securityDesk | security room (-4..8, 42..48, ground): (2, 0, 46.2) | PI | the security room desk; omit + L if it throws |
| suppressionBank x 2 | on the hall's west wall (x -4 inner face) at z 25 and z 39 | PI / 2 | FM-200 cylinders for the hall; each omitted + L |
| floorTileGrid | tile the hall's floor (`s4-hall*` rects) at 3.0 m, y 0.003 | 0 | the raised floor |
| K pduStrip | one on each pod end face beside the door (never on the door) | - | PDUs |

## 4. Base pass, views
`d.base()` last. Views: s4-a (10.5, 1.7, 22.5) -> (10, 2, 32) the hall from the mantrap; s4-b (6.4, 1.6, 24.5) ->
(6.4, 1.2, 31) inside a hot aisle; s4-c (12, 1.7, 33) -> (18, 1.2, 37) the cage; s4-d (3.6, 6.0, 24.5) -> (3.6, 4.4, 40)
the baskets; s4-e (-3, 5.3, 43) -> (4, 4.5, 47) the NOC; s4-f (-7, 1.7, 46) -> (-9, 1, 33) UPS and battery rooms; s4-g
(37, 1.7, 17) -> (37.5, 1.5, 37) the generator compound.

## 5. Acceptance
- **A142** Tags. **A143** Skins per section 2; the CR4 lip checks unchanged; the basket walk tops unchanged (nav of the
  basket route equal: `campusArtGameplay -t S4` item 1). **A144** H4 (<= 5 k tris, GLB <= 0.5 MB), placements or logged
  fallbacks. **A145** S4 gates green incl. `campusS4.test.ts` (K3 choke, A64, the dog), las-tray clear (K9).
- **A146** S4 budgets (<= 40 draws incl. the ~600 rack instances: they merge as statics), report. **A152** shared.

## Do not touch
`campusS4.ts`, `campusS4Data.ts`, shared files; cold-aisle and NOC lamps and their panel; the mantrap doors, pod doors,
cage gates, keypads, pair-gate switches, the riser ladder and hatch.
