# Warehouse redesign - review (step 2)

Reviewer, 2026-10-19. Read-only research: the code on `feature/warehouse-redesign` (master 4.7.5), BRIEF M1-M3, the level
standard, the template, the scale sheet, the CT levels and moves digests, Sector Ops BRIEF / PLAN. Line refs are
`file:line`. Abbreviations: `W` = `src/world/maps/warehouse.ts`, `O` = `src/world/maps/warehouseOps.ts`,
`S` = `src/world/maps/warehouseSectors.ts`, `LD` = `docs/level-design.md`. Axes: x west-east, z south-north (+z north),
y up. Guard speeds from the scale sheet (grunt 0.9, officer 0.85, heavy 0.75 m/s); a 2-point route walks back and forth.

**Bottom line.** The Warehouse is a close-quarters arena (open 3.2 m partitions inside a 6 m shell, a visual-only
roof, open holes for doors) with Sector Ops' walls and blocks added to make pockets for 10-11 guards each. It has no
structural grid, no office block, no real mezzanine, no fire exits and no service systems, so the stealth elements
(pipe, duct, zipline, fire walls, rack ladders) have no building reason. Guards pace 1.4-8.3 m lines with 11-24 s
cycles, placed to pass the M8 isolation test, not to do a job. A redesign should start from the building, not patch it.

---

## 1. What the Warehouse is today

### 1.1 Shell
| Item | Value | Where |
| --- | --- | --- |
| Map bounds (perimeter) | x -24..24, z -26..18 (48 x 44 m), walls 6 m high, 1 m thick, enclosing the yard too | W:162, `levelBuilder.ts:211` |
| Building floor | x -24..24, z -18..18 (48 x 36 m, 1,728 m2) | W:163 |
| South facade | z -18, **0.3 m** thick (the other three walls are the 1 m perimeter), 6 m high | W:165 |
| Facade openings | 2 roller openings 3.0 x 4.0 m (x -20..-17, -12..-9), personnel opening 1.1 x 3.0 m (x 17..18.1), dispatch window 1.2 x 1.2 glazed (x 1.2), workshop window 1.2 x 1.2 **open** (x 11.5) | W:165-176 |
| Interior walls | 3.2 m high, 0.3 m thick (`H`, `T`), in a 6 m hall | W:40-41 |
| Roof | 6 strips at y 6.15, 4.8 m deep, 1.2 m gaps, **no collision** ("visual only"); one colliding walkway over the south band, x -22..21, z -18.15..-13.2, top 6.275 | W:351-356, W:383-387 |
| Columns | 5 pillars r 0.35, only on the factory floor: (2,-4) (10,-4) (18,-1) (2,5) (10,5) | W:255 |
| Lamps | strips at y 5.05 on a 9 x 6 m grid, 14 lit (`LAMPS_ON`), one circuit per room; 3 more lit in Sector Ops | W:28-32, W:358-364, S:197-201 |

### 1.2 Rooms (base map)
| Room | Rect (x / z) | Size | Ceiling |
| --- | --- | --- | --- |
| Loading dock | -24..-4 / -18..-6 | 20 x 12 | none (hall roof only) |
| Dispatch | -4..6 / -18..-11 | 10 x 7 | none |
| Workshop | 6..24 / -18..-11 | 18 x 7 | none |
| Service corridor | -4..24 / -11..-8.8 | 28 x **1.9 clear** | none |
| Racking aisles | -24..-4 / -6..18 | 20 x 24 | none |
| Factory floor | -4..24 / -8.8..12 | 28 x 20.8 | none |
| Mezzanine deck | 8..24 / 12..18, deck at 2.6 | 16 x 6 | a **solid 2.6 m block** (no space under it) |
| Office | -4..2 / 12..18 | 6 x 6 | none |
| Manager's office | 2..8 / 12..18 | 6 x 6 | slab at 3.3 with a vent (the only ceiling) |
Source: W:46-125, W:275, W:288-302.

### 1.3 The 3 Sector Ops sections (M7, A12)
Sector Ops walls the openings between them (O:103-113) and adds `opsPieces` (O:33-86).

| # | Section | Area | Objective | Exit / connector | Guards |
| --- | --- | --- | --- | --- | --- |
| 1 | Service entrance: yard, dock, dispatch, workshop, corridor | yard 48 x 8 + building band 48 x 18 | download, workshop terminal (22.6, -16.6) | C2: a 3 x 3 m vestibule **inside the dock** (x -16..-13, z -9..-6), near door (-14.5,-9), far door (-14.5,-6), both 1.2 m, locked | 10 (S:28-42) |
| 2 | Racking aisles | 20 x 24 | grab the case (-22.8, 14.5), NW corner | C3: the office, near door in the x -4 wall at z 14 (1.1 m), far door (-0.95, 12) | 10 (S:77-91) |
| 3 | Factory floor, mezzanine, manager's office | 28 x 20.8 + deck 16 x 6 + 6 x 6 | hack on the deck (14.6, 2.6, 17.6) | extract "freight lift" box x 21.4..23.7, z -8.5..-5.2 in a plant room | 11 (S:119-135) |

Per-section devices: cameras 2 / 2 / 3 (S:165-171), laser bands 2 / 1 / 2 (S:177-181), one alarm panel each
(S:190-194). Guards per section 10 / 10 / 11 against M6's 20-25 (A13, room first).

### 1.4 Connectors between rooms inside each section
- S1: dock-dispatch opening (x -4, z -15..-13.9), dock-corridor opening (x -4, z -10.5..-9.3), dispatch-corridor
  opening (z -11, x 0..1.1) plus a glazed window (x 4.2), dispatch-workshop door (6, -16), workshop-corridor door
  (14, -11). One real loop: dock, dispatch, workshop, corridor, dock. Corridor-floor openings walled (O:107-108).
- S2: one door in (C2 far), one door out (C3 near); inside, aisles only.
- S3: office door (-0.95,12), new manager's doorway (z 12, x 4.6..5.7, O:72), manager's door (2,15.5) locked until C3
  seals (O:29, S:74), stores cage (SW) and plant room (SE) openings (O:76-79).

---

## 2. Realism problems

| # | Problem | Code | Real reference |
| --- | --- | --- | --- |
| R1 | **Rooms without roofs.** Every enclosed room (dispatch, workshop, corridor, office, C2 vestibule, stores cage, plant room) is 3.2 m walls open to a 6 m hall; only the manager's office has a slab. From the roof walkway you look down into roofless offices. | W:40, W:180-196, O:35-37, O:76-81; slab only W:288-302 | Offices in a warehouse are an enclosed block with its own ceiling, often a 2-storey block or an office mezzanine (Avanta UK, BWS mezzanines); a corridor has a ceiling. |
| R2 | **Doors are holes with no head.** Wall gaps run the full 3.2 m; door leaves are 2.1 m (`levelBuilder.ts:269`), so every closed door has a 1.1 x 1.1 m opening above it. Interior leaves are 1.1 m; the comment's "double doors 1.6 m" are open gaps with no leaf (z -8.8, x 2..3.6). | W:179-196, W:325-329 | Personnel door 0.9-1.0 x 2.1 m with a lintel (scale sheet 1.2 x 2.1 for nav); doubles 1.8-2.0 m. |
| R3 | **Facade personnel opening 1.1 x 3.0 m, no door.** An open hole in the external wall at night. | W:165, W:176 | A steel personnel door 1.0 x 2.1 m, locked, often with a keypad, by the office entrance. |
| R4 | **"Roller doors" are open 3 x 4 m holes with no shutter, at grade, with dock plates and leveller controls.** A raised dock and a grade door are mixed: the floor is at 0.02 (W:163), the "dock plates" are 0.08 m blocks (W:204), leveller boxes at W:208. | W:165, W:174-175, W:204, W:208 | Dock floor 48 in (1.2 m) above the apron; dock doors 8 x 9 ft (2.4 x 2.7 m) most common, 8 x 8 to 10 x 10 ft range (Blue Giant, Rite-Hite). A grade-level drive-in shutter is a different door, about 4.0 x 4.0 to 4.5 x 4.5 m (Manusa range via DirectIndustry). The engine has no roller-door anchor (section 5). |
| R5 | **Windows in odd spots.** An open window in the dock-racking partition (the "hatch", W:183-187; walled in Sector Ops, O:106); an **open** unglazed window in the workshop facade (W:171-173); no windows in the offices on the north wall, which is an external wall. | W:167-173, W:183-192 | Low windows belong to offices on external walls; the storage hall is lit by rooflights (10-15% of the roof) and sometimes a high strip of translucent sheeting. |
| R6 | **Walls with no reason.** Two 4 m "fire walls" only 5 m long in a 3.2 m corridor, built so the split jump works (W:393-396); a 9 m wall through the floor's middle (O:80) and a 5.5 m wall in the west bay (O:81); the C2 vestibule, a 3 x 3 m room in the middle of the dock (O:35-40). | W:393-396, O:35-40, O:76-81 | A fire wall runs full height to the roof and full length between compartments; partitions follow rooms (LD 16.6.1). |
| R7 | **Blocks placed for pockets.** A 4.4 m and a 5.4 m row of shrink-wrapped loads splitting the dock (O:49), a tool rack splitting the workshop (O:50), a pallet parked in the 1.9 m corridor (O:51), loads closing the racking cross aisle at two aisles (O:63) and two **chicanes** (O:66-68). The comments say why: "pockets", "dead-end pockets", "walk the S between them". | O:46-68 | LD 16.4.1 (no block without a real object where it is used), 16.4.2 (nothing blocks an escape route), 16.6.1 (no zig-zag to force a path). |
| R8 | **No structural grid.** 5 columns on the factory floor only, at 8-9 m spacing with (18,-1) off any line; none in the dock, racking or under the 16 m "mezzanine". The 6 m roof spans 36 m with nothing visible holding it (no frames, rafters, purlins). | W:255, W:351-356 | Portal frames: single spans 25-40 m, frames at 6-10 m (8 m typical), light-industrial eaves 5-6 m (SteelConstruction.info "Steel Insight 6"; UK unit listings). Big-box grid 50 x 52 ft with a 60 ft speed bay at the dock (Prologis listings, Tompkins). |
| R9 | **The roof is fake.** It looks solid but has no collision except the south walkway; its 1.2 m gaps are open slots, not glazed rooflights; the walkway's north edge is a 43 m open edge over the interior (the "skylight lip"). No parapet, no hatch, no roof plant. | W:351-356, W:383-387 | Rooflights are glazed sheets; roof access is a hatch on an upstand with a 1100 mm rail and a fixed (caged) ladder (Runnymede unit 100 roof plan; Staka hatch data). LD 2.5, 16.3.2, 16.5.1. |
| R10 | **The "mezzanine" is a solid 2.6 m block.** No columns, no space under it; the comment "offices under the west end" (W:274) is wrong (offices are beside it, x -4..8). Railing 1.0 m (W:277-282, should be 1.1); stair 2.4 m wide, 10 steps of **0.26 rise x 0.60 going**, no handrails (W:262). A ladder 12 m from the stair serves the same two levels (W:283). | W:262, W:274-283 | Mezzanines are steel decks on columns with storage or offices under (about 3 m clear), a pallet gate and 1.1 m rails; stairs 0.15-0.19 rise, 0.25-0.30 going (scale sheet 6). LD 16.2.2, 16.2.4. |
| R11 | **Racking is not racking.** Racks are 1.0 m deep "double-sided" blocks, 2.8 m high, with fixed ladders at the ends and planks bridging the tops (W:229-247, O:58-62). Cross aisles 1.65 m (south), 2.0 m (middle), **1.4 m** (north). | W:229-247, O:58-68 | A 48 in pallet sits on a 42 in (1.07 m) frame; back-to-back rows need a 6 in flue, so a double row is about 2.3-2.4 m deep (RMH Systems, Raymond West). Aisles 3.5-4.0 m for counterbalance trucks, 2.5-3.0 m for reach trucks (FCB, Racklify, Damotech). Under a 6 m eaves, racks reach about 4.5-5 m. Racks have no fixed ladders; rolling platform ladders do the job. |
| R12 | **The yard is a room.** It is closed on three sides by the 6 m perimeter walls, with no gate; the gatehouse sits in a corner with no gate to guard (W:343); reinforcements appear out of the south wall (W:450, S:43). The trailer is parked parallel to the facade, 3.5 m off it, away from both dock doors (W:336-341). A 3.55 m fence closes nothing (W:400). | W:162, W:336-343, W:400 | A yard has a fence and gate, a gatehouse at the gate, a truck court deep enough to back a trailer square onto a dock (Prologis listing: 174 ft truck court on a big DC). |
| R13 | **No fire exits.** The 48 x 36 m building has no exit door in the east, west or north walls; the only ways out are the south facade holes. | W:162-176 | IBC S-1 exit travel 250 ft (76 m), 400 ft only single-storey, 24 ft high and sprinklered (CSE magazine; Building Code Forum). Final exits are outward-opening, open from inside, locked from outside. |
| R14 | **No services.** One duct (1.4 m long, deck to manager's office, no fan or plant room, W:303-310); one pipe with no source or end (deck to mid-floor, W:398-399); a zipline in a warehouse (W:285-286); one downpipe on a 43 m eave (W:388). The pump house (W:391) is the only element with a real job, and nothing comes out of it. | W:285-310, W:388-399 | LD 16.3.4, 16.7.1 (ducts from plant), 2.5 / 16.2.6 (every downpipe of a kind behaves the same). A sprinkler pump house feeds mains that run under the roof: a real pipe network. |
| R15 | **Room logic.** The offices sit at the back (north wall), far from the yard and the personnel entrance; the "freight lift" extraction (S:118) is in a single-storey building with no upper floor; the plant room has one door (A16). | W:123-124, O:74-79, S:118 | Offices sit at the front by the entrance and the yard; a goods lift serves a mezzanine, beside it. |

---

## 3. Flow problems

### 3.1 Routes per section (the data's `routes`, S:45-62, S:94-111, S:138-157)
| Section | Route 1 | Route 2 | Route 3 | Genuinely different |
| --- | --- | --- | --- | --- |
| 1 | East roller door, dock, corridor, workshop door, terminal, back the same way, C2 | Yard, workshop personnel opening, terminal, dispatch, dock, C2 | Downpipe, roof walkway, rappel to the dispatch window (break: loud), dispatch, workshop, terminal, out the workshop window, back along the yard, dock, C2 | **2 approaches** (ground through the dock or the yard; the roof) to **one room** (the workshop): the third reuses route 2's rooms. All three end crossing the dock to one door. |
| 2 | West aisle up, north aisle (1.4 m) east, door | Centre aisle, north aisle, back south, east aisle, door | Ladders, rack tops, planks at z 11, ladder down at the NE rack, door | **2** (floor aisles, rack tops). Every route ends in the NE corner through a 1.4 m aisle or the east aisle's north half (laser, camera, a heavy). |
| 3 | North strip, stairs, deck, terminal, zipline down, floor, plant room | Ladder, deck, terminal, pipe out over the floor, plant room | Manager's office, crates, deck via a rail gap, terminal, stairs down, plant room | **1 objective space** (the 16 x 6 deck) with 4 ways up; one way out (the plant room's 1.1 m opening). |

### 3.2 Choke points and backtracking
- **S1 backtrack:** the objective is at the far east (x 22.6), the exit at the far west (x -14.5): about 37 m back through
  rooms already crossed. The exit door (-14.5, -9) is in the open dock under `cam-dock` facing it (S:165) with a guard
  pacing 4.5 m beside it (S:36).
- **S2 exit:** one door at (-4, 14.55) reached only from the east aisle (3.85 m) or the north cross aisle (1.4 m), with
  the heavy (S:89), `cam-rack-ne` (S:168) and the north laser (S:179) on the same 10 m.
- **S3:** the deck holds the objective, 3 guards (S:130-132), 2 lasers (S:180-181) and a camera (S:171); the exit is a
  single opening (O:78) at the far SE corner.
- **Corridor (S1):** 28 m long, 1.9 m clear (scale sheet: never under 3.0), dead-ended at both ends in Sector Ops
  (O:107-108): east of the workshop door (x 15.1..24) is 9 m of dead space with an explosive barrel (W:409).

### 3.3 Dead space and dead ends
- Yard lanes behind the trailer and the container (z -26..-24): dead ends against the perimeter, each with a pacing guard
  (S:30-31).
- Racking: the cross-aisle loads (O:63) make four dead-end aisle halves by design ("dead-end pockets", O:56-57), against
  LD 3.4 (loops) and 16.6.3.
- S3 west bay: walled into pockets by O:80-81 with no room function.
- The roof: 43 x 5 m walkway with one way up (downpipe), one co-op way (pump house), one way down (rappel).

### 3.4 Traversal present, and what is missing
| Kind | Present (where) | Missing for M1 |
| --- | --- | --- |
| Pipes | 1 drainpipe (W:388), 1 horizontal pipe 13.5 m at 4.4 m (W:398) | a pipe network with a reason (sprinkler mains, compressed air in the workshop); pipes in S1 and S2 |
| Ceiling crawl spaces | none | an office-block ceiling void or the space over an internal office block under the hall roof |
| Vents / ducts | 1 duct, 1.4 m (W:303-310) | a duct run from a plant room or rooftop unit to the offices; workshop extract |
| Co-op passages and boosts | pump house 4.2 m (W:391), just under the 4.3-4.5 band (LD 11.3) | one or two per section, each with a solo alternative (Sector Ops is solo or co-op) |
| Catwalks | none | a crane-runway or roof-plant walkway under the roof |
| Ledges, shimmy | auto lips on 3.2 m walls (hang only, 0.3 m < 0.38 climb depth, `anchors.ts:193`), the deck edge, the roof walkway edge | ledges with a reason: a dock canopy, an office block parapet, a window sill run |
| Ladders | 5 onto racks (W:244-247, O:58-59), 1 to the deck (W:283) | one roof-access ladder to a hatch, inside a plant or service space |
| Split jump | 1, 5 m (W:395-396) | a real narrow gap (between the office block and a fire wall, a rack flue at 1.2-1.95 m) |
| Zipline, rappel | zipline (W:286), rappel (W:389) | the zipline has no building reason; rappel fits a roof edge |
| Windows | 2 facade, 1 corridor | office windows on external walls, rooflights |

---

## 4. Guard-route problems

Cycles: 2 points = 2 x length / speed + 2 x wait; 3+ points loop.

| Sec | Guard (S:line) | Route, length | Cycle | Reason? |
| --- | --- | --- | --- | --- |
| 1 | grunt (30) | 6 m behind the container | ~19 s | none: a dead lane against a wall |
| 1 | grunt (31) | 6.5 m behind the trailer | ~22 s | none |
| 1 | grunt (32) | post at the gatehouse | - | a post with no gate |
| 1 | grunt (34) | 5.5 m in the dock's west bay | ~18 s | none |
| 1 | heavy (35) | post by the east roller opening | - | a door watch (plausible), but G155 |
| 1 | grunt (36) | 4.5 m in front of C2 | ~16 s | guards the exit for the mode |
| 1 | officer (38) | post in dispatch | - | plausible (a dispatcher at a desk) |
| 1 | enforcer (39) | post in the workshop | - | plausible if he is working at a bench |
| 1 | grunt (40) | 3.5 m beside the terminal | ~14 s | guards the objective for the mode |
| 1 | grunt (41) | 2.5 m at the corridor's dead end | ~14 s | none |
| 2 | grunt (79) | **1.4 m** in the west aisle | ~11 s | none |
| 2 | grunt (80) | 3-point loop, west aisle | ~31 s | none stated |
| 2 | grunt (82), runner (83), grunt (84), grunt (85), enforcer (86), grunt (88), heavy (89) | one aisle half each, 3.5-8.3 m | 16-24 s | none: one guard per aisle half (the M8 pocket rule) |
| 2 | officer (90) | post in the 1.4 m north aisle | - | none |
| 3 | officer (121) | 3.8 m in the stores cage | ~17 s | plausible (stores) if he does something |
| 3 | grunt (122) | 3-point loop in the plant room | ~22 s | none |
| 3 | grunt (123), grunt (125), runner (126), grunt (128) | bays on the floor, 2.7-7 m | 12-22 s | none |
| 3 | heavy (127) | post at the east wall | - | none |
| 3 | grunt (130), enforcer (131) | the deck, 2.8 m / post | ~12 s / - | guard the objective |
| 3 | sniper (132) | post on a 2.6 m deck indoors | - | no job a sniper has in a warehouse at night |
| 3 | heavy (134) | post in the manager's office | - | none (a dead-end room) |

Findings:
- **Every route is a short pacing line** (1.4-8.3 m) or a post; none walks between two real places. Cycles are 11-31 s,
  most under LD 4.3's 25-45 s. Only `route` and `wait` are used: the patrol code supports per-point waits and facings,
  ping-pong and timed loops (`src/ai/patrol.ts:13-31`, `src/world/rooms.ts:20-39`).
- **Placed for numbers.** The M8 check (`src/game/sectorCheck.ts:27`, `CHECK_RANGE` 15 m) requires each guard's takedown
  spot to be unseen by every other guard within 15 m, so guards were spread one per pocket and blocks and walls were added
  to make pockets (O:46-85). That is the root cause of R6, R7 and the dead ends: the constraint was met with geometry.
- **Overlap is designed out**, against LD 4.5 (one guard covers another for part of his cycle). Racking: 10 guards in
  480 m2, each in a lane he never leaves.
- **Archetype logic.** Heavies in all three sections (S:35, 89, 127, 134), an indoor sniper (S:132). G155 removes heavies
  and dogs from co-op missions; Sector Ops is a solo / co-op playground, so the spec should decide and log it.
- **Objective guards.** The guard 3.5 m from the S1 terminal (S:40), two on the S3 deck (S:130-131) and the C2 pacer (S:36)
  exist to guard mode objects, not building functions.

---

## 5. What the engine supports today

| Feature | Status | Where / limits |
| --- | --- | --- |
| Anchor kinds | `ladder`, `pipeV`, `pipeH`, `ledge`, `duct`, `window`, `door`, `zipline`, `split`, `rappel`, `fence` | `src/world/anchors.ts:18` |
| Ledges | auto from box tops >= 1.9 m drop, lip >= 0.6 m; climb-up needs >= 0.38 m top depth (0.3 m walls are hang and shimmy only); `noLedge` / `mark` | `anchors.ts:187-197`, `levelBuilder.ts:361-380` |
| Pipes | vertical climb; horizontal hand over hand (hang height, any length) | `levelBuilder.ts:239-250` |
| Ducts | a polyline auto-crawl with wall / ceiling / floor grates and peek grates (G56 limits it to duct ends in plant shafts) | `anchors.ts:79-97`, `levelBuilder.ts:260` |
| Crawl spaces | geometry only: crouch-walk under 1.5 m clear (crouch capsule 1.15 m); guards need 1.7 m headroom so they cannot follow | scale sheet 1, 3; LD 16.7.3 |
| Windows | vertical only (yaw): open (vault) or glazed (break, then vault) | `levelBuilder.ts:264` |
| Doors | hinged leaf, any width, `height` (default 2.1), swing, locked, breachable; guards push open and never close (G41 not built); door peek | `levelBuilder.ts:268`, LD 12.1 |
| Fences | chain-link: stops movement, passes sight and bullets, climbable | `levelBuilder.ts:289` (a stores cage can be mesh) |
| Team moves (G151: anywhere with room, no marked spots) | leg-up to a lip 2.4-4.5 m; ledge relay to 4.6 m; partner throw 3.2 m (landing within 1 m up or down, 2.2 m headroom); hang-down from an edge with >= 2.2 m drop (head 1.0-2.5 m under); two-person rope on drops 2.2-**6.0** m | `src/config/movement.ts:390-455`, `src/game/teamMoves.ts:12` |
| Solo reach | wall jump 3.8 m (`WALL_JUMP.maxUp`) | `movement.ts:292` |
| Split jump | auto from facing faces >= 3.6 m tall, 1.2-1.95 m apart | LD 12.1 |
| Lights | lamps, spots, fixtures shootable, switches per circuit, ambient zones per storey | W:358-369, W:437-444 |
| Nav | 3 surfaces per column by default; `MapDef.navLayers` raises it (Fallow: 5); nav seeds per area | LD 12.1, O:120-127 |
| Patrols | waits, faces per point, ping-pong, timed loops, `free` routes across rooms | `patrol.ts:13-31`, `rooms.ts:20-39` |

**Gaps a redesign would need (engine work, flag in the spec):**
- **E1 Roller / sectional doors** (a door that rises; a partly raised shutter as a crouch entry): not built. Prototype
  workaround: a closed shutter as a wall panel or a locked door leaf; a fixed half-open shutter as a lintel box over a
  1.5 m gap.
- **E2 Horizontal hatches and rooflights** (open, drop through; break the glass): `window` is vertical only. Workaround:
  a hole with a cover slab (CT course hatch, `ctcourse.ts:270-280`) or a duct with a ceiling grate.
- **E3 Guards see poorly above them (G44):** not built (`LD 12.1`: no vertical limit). Every high route (rack tops,
  catwalks) is as visible as the floor today: high routes must rely on darkness and occluders until it is.
- **E4 Guards close doors (G41):** not built.
- **E5 Nav layers:** a floor, an office first floor or roof, a mezzanine, a catwalk and a roof stack 4-5 surfaces in a
  column: set `navLayers` (no engine work, but a perf check).
- **E6 Rope reach:** the roof walkway at 6.275 m is just over `ropeMax` 6.0: a roof edge for the two-person rope must
  sit at 6.0 m or lower over its floor.
- Doc drift: LD 11.5 and 12.2 still cite G81 (marked boost spots); G151 replaced it (anywhere with room). Not an engine
  gap; note it for the spec.

---

## 6. Rules in `docs/level-design.md` that would block a free-flowing sandbox (candidate loosenings, M3)

Each needs a BRIEF log entry (what, why, how to undo) if the spec uses it.

| Rule (line) | Why it blocks | Candidate loosening |
| --- | --- | --- |
| 3.1 entry vantage sees every guard within one cycle (LD:30) | a 20 x 24 m racking hall or a two-level floor cannot show 10 guards from one spot | a vantage per sub-area; every guard readable from at least one dark vantage |
| 3.2 shadow + high + loud route per guarded space (LD:32) | fine as a target; strict per "space" multiplies routes in small rooms | count routes per section (objective and exit), not per room |
| 3.3 all routes rejoin before the next space, none skips a space (LD:36) | a sandbox lets a roof or void route skip a room | rejoin at the section's connector only |
| 4.9 / 12.1 guard cap 9 (LD:68, LD:136) | Sector Ops runs 10-11 (M6 wants more) | Sector Ops' per-mode cap (already the mode's rule): log it |
| 11.1-11.2 solo first / invariance (LD:114-115) | holds for Sector Ops (solo or co-op), so co-op passages must be extras with a solo way to the same surface (11.4, LD:119) | no loosening; state it so the spec does not make a co-op-only route |
| 11.3 co-op lip at 4.3-4.5 m (LD:117), 11.5 unplanned boost targets (LD:122) | with G151 every lip 2.4-4.6 m is a leg-up or relay target; a warehouse full of 4-5 m racks, canopies and beams cannot plan each | any lip in the band is a valid co-op route if its surface is also solo-reachable (11.4); update the G81 text |
| 16.2.1 storeys joined only by stairs, fire stairs or ladders in plant spaces (LD:305); 16.2.5 roof access only by a stair bulkhead or fire stair (LD:309) | a real warehouse's roof access is a caged fixed ladder to a hatch; a mezzanine may have a ladder to an upper storage deck | allow a caged fixed ladder to a roof hatch inside a plant or service area (real practice) |
| 16.3.4 a vent only as the end of a real duct system (LD:317); 16.7.4 "never a grille that pops into a room as a shortcut" (LD:345) | the CT ceiling entry (drop through a ceiling vent onto a guard) is exactly that | allow a ceiling grille or access panel at a real duct or void end, if the duct is traced to its plant |
| 16.7.3 crouch ducts 1.5 x 1.2 m (LD:344) | real office ductwork is 0.4-1.0 m; a 1.5 m duct is a trunk only next to plant | use the office-block roof void (real height) instead of a duct, or accept oversized trunk ducts and log it; the size was measured on the old camera (LD open item 8) |
| 16.7.5 ducts only inside walls, slabs or ceiling voids (LD:346) | warehouses hang exposed spiral ducts and pipes under the roof | allow hung ducts and pipes under the roof structure (at 4.3 m or more, so no accidental mantle) |
| 16.9 element register for every element (LD:354-361), 13 deliverables (LD:195-259), 14 phases with stops (LD:261-271) | a greybox prototype tonight cannot produce SVG plans, sheets and stops | register only traversal, cover and lamp elements; plans as a text grid; phases per G87 (LD open item 6) |
| 15 acceptance tests incl. the solo ghost run with every bonus (LD:273-285) | most need guards and a finished build | keep e2e-sectorops' walk; the rest pending |

Rules worth **keeping** because they fix M1's complaints: 2.2 "why is it here" (LD:17), 2.5 consistency (LD:23),
3.4 loops (LD:38), 4.1 jobs not lines (LD:53), 4.3 clockwork 25-45 s (LD:57), 4.4 isolation moment (LD:58),
16.4.1 named objects (LD:322), 16.5.1 roofs covered (LD:329), 16.6.1 no zig-zags (LD:335).

---

## 7. Real-warehouse reference (for a realistic redesign)

1. **Size and structure.** A 48 x 36 m (1,700 m2) unit is a real small light-industrial / trade unit: steel portal
   frames, single spans of 25-40 m, frames at 6-10 m (8 m typical), eaves 5-6 m (SteelConstruction.info "Steel
   Insight 6"; UK unit listings on LoopNet, Rightmove). A two-span portal has a valley column line at mid span, often at
   12-16 m centres with a valley beam. Big distribution centres use a 50 x 52 ft (15 x 16 m) grid with a 60 ft (18 m)
   speed bay at the dock and 32-36 ft (10-11 m) clear (Prologis listings; Tompkins "The importance of optimal column
   spacing").
2. **Dock.** Dock floor 48 in (1.2 m) above the apron; dock doors 8 x 9 ft (2.4 x 2.7 m) most common, 8 x 8 to 10 x 10 ft
   (2.4-3.0 m) range, with levellers and seals (Blue Giant "Door size"; Rite-Hite "Loading dock design"). Docks sit on
   one side facing the truck court.
3. **Drive-in doors.** Grade-level roller shutters about 4.0 x 4.0 m standard, up to 4.5 x 4.5 m (Manusa via
   DirectIndustry; dimensions.com roller door profiles 2.1-4.3 m).
4. **Personnel doors.** 0.9-1.0 x 2.1 m leaves, 850 mm clear (scale sheet 6, NCC / AS 1428), by the office entrance and
   at every fire exit.
5. **Offices.** An enclosed office block, often two storeys or an office mezzanine, with partitions, ceilings and
   services, typically at the front by the entrance and the yard; standard storey about 3 m (Avanta UK office
   mezzanines; BWS warehouse mezzanines; Building Code Forum on two-level office annexes).
6. **Mezzanines.** Steel decks on columns, storage or offices under, 1.1 m guard rails, a pallet gate, a stair with
   handrails (LD 16.5.3; Runnymede roof plan rail at 1100 mm).
7. **Racking.** 42 in (1.07 m) frames for 48 in pallets; back-to-back rows with a 6 in (150 mm) minimum flue, so a double
   row is about 2.3-2.4 m deep (RMH Systems; Raymond West). Aisles 3.5-4.0 m for counterbalance trucks, 2.5-3.0 m for
   reach trucks, 1.5-2.1 m for VNA (FCB; Racklify; Damotech).
8. **Roof.** Profiled metal sheet on purlins and rafters; rooflights 10-15% of the roof area on industrial roofs, 5-12.5%
   on warehouses, as triple-skin GRP sheets (Runnymede unit 100 roof plans; metalroofing.org.nz; isurv). Roof access is a
   proprietary hatch on an upstand with an 1100 mm rail and a fixed, caged ladder in high halls (Runnymede plan; Staka
   hatch via specifiedby; Building Design Index).
9. **Fire exits.** S-1 storage exit travel 250 ft (76 m), 400 ft only if single storey, 24 ft high and sprinklered (CSE
   magazine "The IBC's modification to exit access travel distance"; Building Code Forum). In practice: exit doors in
   every long wall, outward opening, panic hardware, open from inside only.
10. **Services.** Sprinkler pump house and valve set feeding mains hung under the roof (the existing pump house, W:391),
    lighting rows on the rafters, office HVAC (a rooftop or plant-room unit with ducts into the office ceiling), workshop
    extract and compressed air. (General building practice; no single source fetched.)

**Stealth level design references.**
- CT levels (`docs/ct-research/levels-digest.md` 3.1-3.2): boost-and-climb is how the pair enters, changes floor and
  reaches a ceiling route; ceiling routes over watched floors; overlooks and foreshadow-and-return; entry equals exit by a
  different path (Panama); a hub room; parallel routes that re-merge; anti-pattern A3: a solution above the problem with
  no tell.
- "Sneaky Ninja" (Uppsala University game design blog): looping patrols were easy to slip behind; L- and U-shaped routes
  worked better; making the player leave after the objective lets him take another path out.
- "Designing highly replayable stealth levels for Payday 2" (80.lv): vents as extra routes that also let players watch
  patrols safely.
- McGill guard-patrol work (Xu et al. 2014, Borodovski 2016): patrols must cover the space yet stay readable; path search
  can check that a level stays solvable.
- Steve Lee, "An approach to holistic level design" (GDC 2017, Arkane): affordances and intentionality: spaces read as
  real places and as play at once.

---

## 8. Recommendations for the spec

**Building logic**
- Start from a building brief: a night-shift trade warehouse with a workshop, run by a firm with a contracted night
  security crew. Keep the 48 x 36 m shell (it fits the yard and the three-section order) and give it a grid: portal
  frames every 6 m along z (z -18..18, matching the existing lamp and roof strip grid) with two 24 m spans and a valley
  column line at x 0 every 12 m (or a single 36 m span with no internal columns; the spec picks one and draws it).
- A real roof: rafters on the frame lines, purlins, glazed rooflights (about 10%) in place of open slots, one roof hatch
  with a caged ladder in a service area, a parapet or rail where people walk. Full collision, or no walkable roof at all.
- One front zone along the yard: the dock (2 dock doors about 2.7 x 3.0 m on a raised 1.2 m dock, or grade drive-in
  shutters 4 x 4.5 m; pick one, not both), the personnel entrance with a real door, and an **office block** (two storeys,
  3.3 m storey, ceilings, windows on the external walls) beside it. Its roof under the hall roof is the realistic
  "ceiling crawl space" and storage deck M1 asks for.
- Full-height walls only where a building needs them: the office block, a **fire compartment wall** between the
  workshop / goods-in and the storage hall (full height, with fire doors: the real section connectors), a plant room
  (sprinkler valves, switchgear). A stores cage as mesh (`fence`), not block walls.
- Racking to real sizes: 1.07 m frames, double rows about 2.4 m deep, 4.5 m tops, 3.0-3.5 m aisles, cross aisles 3 m or
  more and open (loops). No fixed ladders: rolling platform ladders parked at rack ends.
- A real mezzanine on columns (storage under it), 1.1 m rails, a proper stair, a pallet gate; the hack terminal in a
  room on it (a goods-out office or a server cupboard) rather than on the open deck.
- Services as the traversal network: sprinkler mains from the pump house under the roof (horizontal pipes at 4.3-4.5 m,
  co-op band, or higher), a crane runway with a walkway over the workshop (catwalk), office HVAC ducts from a plant room
  into the office ceiling void (the only duct with auto-crawl, G56), downpipes every eave bay (all climbable, 2.5).
- Fire exits in the east, west and north walls (locked outside, open inside): extra exits and loops, and a realistic
  extraction instead of the freight lift.
- Yard: a fence with a gate and the gatehouse at it, a truck backed onto a dock door, a dark side lane; reinforcements
  come in through the gate.
- Connectors as real rooms: a fire-door lobby in the compartment wall (S1 to S2), the office block's stair lobby or a
  goods-out office (S2 to S3). Drop the vestibule in the dock.
- Log engine gaps E1-E6; build roller doors and hatches as greybox workarounds (section 5).

**Per-section route ideas** (each: two or more ways to the objective, two or more back to the exit, one loop, one co-op
extra with a solo alternative)
- **S1 Yard and goods-in.** Shadow: the side lane, a shutter left part open (crouch under). High: a downpipe or a
  co-op leg-up onto the dock canopy (4.3-4.5 m), along it to a rooflight or high louvre. Loud: the personnel door
  (breach) or an office window. Secret: the sprinkler pump house's pipe duct into the plant room. Put the objective in
  the goods-in or dispatch office so the exit (the compartment fire door) is not a 37 m backtrack.
- **S2 Storage hall.** Floor aisles with lamp pools at the aisle ends (shadow), rack tops at 4.5 m (high, a leg-up or a
  rolling ladder), sprinkler mains across the aisles (pipe hand over hand), the mezzanine underside (cover). Open cross
  aisles give loops; objective and exit on different sides with at least two approaches to the exit.
- **S3 Workshop, mezzanine and offices.** Floor between machines (shadow), crane walkway and mezzanine (high), office
  block roof void and the HVAC duct into an office ceiling grille (secret, a drop onto a guard), hang-down or rope from
  the mezzanine edge (co-op), fire exit or the front entrance as the extraction.

**Guard logic**
- Every guard has an employer, a job and a route between named places; write it in a guard table. Mix per section:
  one post (gatehouse, reception), one tour guard on a long loop with clocking points at the fire exits, workers
  (forklift driver moving pallets from the dock to the racks, stocktaker walking the aisles in order, fitter at a
  machine, dispatch clerk at a desk), a smoke-break pair at a yard door.
- Cycles 25-45 s with stops 3-6 s, using `waits` and `faces` (`patrol.ts:13-31`); L- and U-shaped routes over plain loops.
- Meet M8 ("room to maneuver and take them out silently away from others") with **isolation moments in time** (LD 4.4)
  instead of one guard per walled pocket; if `sectorCheck` stays, check route points over the cycle, not a fixed spot,
  and let some overlap exist (LD 4.5).
- Fewer guards with real jobs before more guards: start at 8-12 per section and raise only if the space supports it (M6
  pending the PC perf run).
- Decide heavies and the sniper (G155 for co-op missions); no indoor sniper; dogs only in the yard with a handler, and no
  flashlight (step 1).
- Lights follow work: lit where people work (dispatch, a workshop bench, the dock door), dark storage, switches by the
  doors, emergency lights at exits.
