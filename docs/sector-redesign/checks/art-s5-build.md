# ART-S5 build report (briefs/ART-S5.md, A147-A151)

Builder: Sonnet 5.5, 2026-10-23. Branch `feature/sector-redesign-art-s5` (worktree `C:/NightShift/Mobile-Coop-sector-redesign-art-s5`),
cut from the ART-KIT head 26670151. Files: `src/world/maps/campusS5Dress.ts`, `scripts/campus-props/hero_s5.py`,
`src/world/campusArt/assets/hero-s5.glb/.json`, `tests/campusS5Dress.test.ts`, this report. Kit, campusS5*.ts and game code untouched.
Where the brief and `art-kit-build.md` differ, the kit report won (API, rules C / W, box-in-doorway behaviour).

## Numbers
| | |
| --- | --- |
| Placements (section 5) | 247 (skins and heroes 83, base pass 164) |
| Draws (of 40) | 30 |
| Triangles (of 150 k) | 25.1 k |
| H5 hero set | 8 pieces, 1388 tris (of 5 k), GLB 98 KB (of 0.5 MB) |
| `d.check()` | `[]` |

## Placed
| Rule / hero | Piece | Count |
| --- | --- | --- |
| Skin (row) | H5 radioRackRow (3 rows x 4, lamps on `S5_GROUPS.ctl`) | 12 |
| Skin (row) | H5 displayScreen (2 screens x 3) | 6 |
| Skin | H5 rollingStack | 3 |
| Skin | H5 tokenPlinth (faces the door, top flush at 0.9) | 1 |
| Skin | H5 chimneyStack (cap and pots over the 2.0 box, listed overhang) | 4 |
| Skin (cylinder) | K treeSkin | 6 |
| Skin-hide | H5 panelVan (AS10; see L2) | 1 |
| Skin (row) | H5 balustrade (5 + 19 + 17 modules; the gate and path openings stay open) | 41 |
| Hero (visual, flush) | `H5:depositFace` on the strongroom west and east walls, z 38.0..42.8 (L3) | 8 |
| Hero | F timeLockPanel, strongroom south wall inner face, y 1.4, 0.65 east of the opening | 1 |
| Base | portraitFrame 27, bookcase 15, fireplace 3, wingChair 6, sideboard 1, longcaseClock 1 (hall), plantPot 1, noticeBoard 3, wallClock 1, smokeDetector 3, lockerBank 2 | 63 |
| Base | exitSign 14, fireExtinguisher 14, signPlate 34 (door extras) | 62 |
| Base | pipeRun 14, glandPlate 1 (plant); ductRun 7, acCondenser 7, roofCowl 4 (roofs); reeds 6 (jetty) | 39 |

## Dropped (counts by rule, `report.dropped`)
Heroes: F depositWall 8 tried: 7 by C (a 2.39 m solid box within 3.0 of route legs 9 / 10), 1 by K4 (alarm-ter). F vaultLeaf: K1.
F monitorWall: K2 (guard 3). Base, top reasons: B overlap (portrait 38, bookcase 21, sideboard 14), K1 / K2 route and patrol (lockerBank 46,
cableDrum 103), C (acCondenser 79, fridge 30), F (plantPot 621: no floor at the origin, the hall void), K4 (fridge 26). Full table in the
gate run's `DressReport`; none of it gates.

## Gates (this worktree, one slot at a time)
- `npx tsc --noEmit` clean; eslint clean on the two TS files.
- `npx vitest run tests/campusArtGameplay.test.ts tests/campusArtLight.test.ts tests/campusS5.test.ts tests/campusS5Dress.test.ts`: 4 files, 82 tests pass
  (gameplay 42, light 5 with a real bake, campusS5 29, own test 6). Gameplay unchanged: K4 choke in the anteroom
  untouched (no box in s5-ante), M8, A64, dogs, CR6 / CR7 (nothing within K7 / K11 of the cage, well or rope edge), las-shaft clear.
- Not run (lead / CI): `npm run check`, `campusRuntimeNav`, `campusArtKit`, any e2e, GPU shots (batch 3).

## Skipped / fallbacks (the brief's own)
- Strongroom vault leaf (AS8) and `vaultFrameSlim` (frame): the player route (K1, routes "back corridor, anteroom side door and garden" legs 8-9)
  runs through the opening, so anything within 1.2 m of the opening line is refused (the leaf, the frame, `leafEnv`). The frame was not built
  (no use); the leaf was tried and logged. The strongroom reads through the flush deposit fronts, the time lock and the token plinth.
- F depositWall rows: refused by rule C (see above); replaced by the flush visual fronts (L3).
- F monitorWall in the control room: K2, and rule C would follow (three guards stand in the room, nothing there is 3 m off their legs).
- Board table / CEO desk skins: no such box exists in the S5 greybox (only the plant boiler 2.0 and the kitchen counter 0.9).
- Kitchen counter (z 34..38, 0.8 x 4.0 x 0.9) skin: `K:kitchenRun` is not a fit piece in the kit (1.2 x 0.9 x 0.6 as built), so no skin fits; the
  counter stays greybox. The base pass drops the kitchen run, range and fridge (K4 / C / K3 / K1), so the kitchen is bare of art.
- Hall longcase clock at (-49.5, 0, 31.2): not placed by hand; `base()` already places the hall's clock.

## Kit gaps (for the lead)
- K1: a route through a door makes any door-frame piece impossible (the brief's frame and leaf); no `OVER_DOOR` exemption for a frame piece.
- `K:kitchenRun` / `K:wallCupboards` are not `fit`, so a kitchen counter greybox of another size cannot be skinned.
- `skinRow` has no `group` option (rack lamps are set on `d.placements[i].group` after the call).
- Rule C refuses every floor-mounted 1.6 m+ box in a room a route crosses (deposit rows, monitor wall): flush visuals are the only way to dress
  such rooms.

## L-log (assumed, simplest option, undoable)
- L1 Room tags as the brief's table. Chimney stacks use `overhang.chimneyStack.by = 0.6` (cap and pots above the 2.0 box).
- L2 Van: the greybox is 3.0 x 2.4 x 5.0 (not the brief's 2.0 wide); H5 panelVan is built 2.5 x 2.0 x 5.0 and fits 1.208 x 1.21 x 1.0 to the box. The
  skin-hide profile is a full-footprint lower body to 0.75, the cargo box and a lower cab above, so the box stands outside the skin only above
  0.9 and by at most 0.6. No mirrors beyond the body (they would change the fit scale).
- L3 `depositFace` is an extra H5 piece (not in the brief): 1.2 x 2.4 x 0.11, wall-mounted visual, steel plate with three columns of five box
  doors. Placed on the strongroom's west (x -45.9) and east (x -40.1) inner faces in four modules each (z 38.6 .. 42.2 centres). Remove the eight
  `tryAdd(... 'H5:depositFace' ...)` lines to undo.
- L4 Rolling-stack handwheel sits on the west end (the hoist side), 5 cm proud: the hull is 1.45 wide on the 1.4 box (scale 1).
- L5 The token plinth faces south (yaw PI), toward the door.
- L6 Trees: all six `S5_BOX.trees` cylinders skinned by `treeSkin` (r 0.35, h 6 on cylFit r 0.3, h 5: 1.167 / 1.2).

## What Michael should try
Not run in a browser (batch 3). Views to check on the GPU pass: s5-b / s5-c (the strongroom fronts and the time lock), s5-f (balustrade, van,
trees), s5-d (rolling stacks).
