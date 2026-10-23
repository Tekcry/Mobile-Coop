# A7 - Set 7, the Data Hall (set doc)

Status: SET DOC (PLAN.md slice 7 step 1), written 2026-10-23 by the A5-A8 set-doc agent, before any geometry.
Set id `a7DataHall`; file `src/world/maps/ctcourseSets/a7DataHall.ts`; plans `plans/a7DataHall-ground.svg`,
`plans/a7DataHall-gameplay.svg`. Sources: SPEC sections 5-7, 9 (A7 sheet, route summary), 10, 12, 13, 14 (N6), 15,
18 (A7 rows); LIGHTING-PLAN section 3 (A7) and `MARLOW_CIRCUITS`; GREYBOX-HELPERS.md (with "Changes from the tests" and
the job lead's corrections of 2026-10-23); ENGINE-ANSWERS.md (Q8 cage and jam line, Q10 panel height, Q13 camera
spaces); `docs/level-design.md` section 13. Coordinates: x east, z north, metres, floor y 0, yaw radians with 0 = +z;
camera facings in degrees with 0 = +z, 90 = +x. Decisions and contradictions: section 13 (`A7-D<n>` / `A7-C<n>`).

## 1. Space sheet

| Field | Content |
| --- | --- |
| Space | Set 7, the Data Hall. Ground (y 0), one storey under a 4.0 m slab. A colocation data hall: the entry lobby with its two glazed doors and the fire plan, the rack hall (rows east-west, 3.0 m aisles), the client's two-person cage with dual-control terminals, the hot-aisle containment pod east of it, and the plant corridor along the south side with its cooling units and the cable trench grating. Set box x 70-100, z 52-72 (30 x 20 m) |
| New mechanic | Teaches split paths and a synced hack (the paired scanners, N6 second pair on the map). Combines solo stealth against a guard (hall) and a sweeping camera (corridor) |
| Entry vantage | The entry lobby (73.5, 62.0): through the glazed sidelight of the hall door, aisle B to the cage front and terminal T1 and the technician's whole round (it passes the hall door); through the glazed sidelight of the plant door, the corridor, its grating and the sweeping camera at its east end; the fire plan on the north wall shows both routes, both terminals and both cameras. No guard enters the lobby; glass stops guard and camera sight (P17), so the lobby is out of every view |
| Routes | Hall (A): "Wait for him to go up the west aisle, slip into aisle B behind him, then to terminal one when he walks off south." Corridor (B): "Crouch to the first cooling unit, hop the grating while the camera looks away, then the pod door." Either player may take either path. Hall, high-risk: "The north aisle and down the front aisle under the north camera (jam-hop)." Corridor, loud: "Run the grating in one window" (loud: the technician hears it through the wall). Lure: "Switch the aisle ends off and he walks to the south-west corner." Loud: shoot a camera (alarm stage) |
| Loop | The technician's loop round rows 1-2 west of the cage is also the hall player's loop (aisles A, B, C and the two cross aisles); the corridor is a dead end by design (the pod door at its end is the goal), with the lobby behind |
| Stepping stones | Hall: lobby -> aisle B's west end (78.5, 61.5), 5 m, behind row 1 -> T1 (85.35, 61.5), 7 m along aisle B. Corridor: lobby -> plant door (72.8, 55.8) -> the x 85 cooling unit's lee (83.7, 55.2), 11 m -> the x 93 unit's lee (91.75, 55.2), 8 m over the grating -> the pod door (97.9, 55.8), 6 m: each hop a blind window or a unit's lee |
| Guards | `a7-tech` (section 2). One guard, two cameras: the guard covers the hall, `a7-cam1` the north approach to the cage, `a7-cam2` the corridor. Isolation moment: R1 at the south aisle's west end |
| Lights | Rack rows 70 (switch in the lobby by the hall door), aisle ends 71 (switch at the south aisle's west end), plant corridor 72 (switch inside its west door), pod 73 (on the cage's own control). Cameras ignore light (G240): darkness helps against the technician only |
| Surfaces | Raised floor tiles in the hall and the lobby (quiet), the plant corridor's concrete (quiet), the 6 m trench grating across the corridor (`metal`, loud above crouched gears 1-3) |
| Toys | Two cameras (jam, shoot), three switches (70, 71, 72), the grating (a quiet and a loud way across), the lobby's two glazed doors, the cage doors (on the sync) |
| Hide spots | The ends of each rack row (aisle B's west part, the cross aisles); the lobby's coat bay (x 74.5-76, z 64-66); the cooling units' west lees in the corridor. A body at the cage front is found at his R0 stop; a body in aisle B is seen from R0 (facing east) only by its back: found on his next south walk past the aisle's mouth |
| Traversal elements | None in the co-op band. Racks 2.2 m, cooling units 2.0 m, cage lid 2.5, pod roof 2.6: all `noLedge` (over the 1.9 m auto-lip line). The cage fence anchors locked (`anchorLock`) |
| Exit | Pinch point: the pod (one-player pass zone `a7-pod`). After the sync the cage doors open, so the hall player walks through the cage into the pod and both leave by `A7-east` (the facility's L7 near door, `flag` on `a7-sync`). Checkpoint: L7 (x 100-106, z 57-63), the Model Room, with the A8 vitrine and a wall medkit |
| Tension | 4 |

### 1.1 Dimensions (6 m grid: x 70, 76, 82, 88, 94, 100; z 54, 60, 66, 72)

| Piece | Plan box (x0-x1, z0-z1) | Height | Notes |
| --- | --- | --- | --- |
| Set box | 70-100, 52-72 | slab 4.0 | Box-edge walls are `facility.ts`'s (L6 door x 70, z 61.1-62.9; L7 door x 100, z 59.1-60.9) |
| Entry lobby | 70.2-76, 56-66 | ceiling 3.0 | Hall door `A7-hall` (x 76, z 61.0-62.2) with a `kit.glass` sidelight (z 62.4-63.6); plant door `A7-plant` (z 55.8, x 72.2-73.4) with a sidelight (x 73.6-74.8). Fire plan board on the north wall (73.0, 1.5, 65.8). Coat bay x 74.5-76, z 64-66 |
| Plant corridor | 70.2-100, 52.2-55.65 | 3.5 | Its north wall (z 55.65-55.95) runs x 70.2-100; the lobby's south wall and the pod's south wall sit on it |
| Cooling units (3) | centres x 78.0, 85.0, 93.0; z 54.75-55.65 | 2.0 | `coolingUnit` 1.8 x 0.9, against the corridor's north wall, `noLedge`. Clear corridor width beside them 2.55 m |
| Trench grating | 86-92, 52.2-55.65 | flush | Full width (no way round): `metal` surface |
| Rack rows | row 1: 78.8-83.0 and 86.0-95.6, z 58.8-60.0; row 2: 78.8-83.0, z 63.0-64.2; row 3: 78.8-83.0, z 67.2-68.4 | 2.2 | `serverRack` 0.6 x 1.2, one collide box per run, `noLedge`. Row 1's east part runs along the cage's south face |
| Aisles | A (south) z 55.95-58.8; B z 60.0-63.0; C z 64.2-67.2; D (north) z 68.4-71.775; west cross aisle x 76.15-78.8; front aisle x 83.0-86.0 | - | 3.0 m aisles (D 3.4, west cross 2.65: the lobby wall side) |
| Cage | 86-96, 60-66 | mesh 2.4, lid 2.4-2.5 (a 5 cm slab failed `tests/voxelFit.test.ts`, floor parity on the 5 cm grid) | `b.fence` mesh on all four faces over 1.2 m solid kick-panel boxes; lid a `noLedge` box; fence anchors locked by `{ kind: 'anchorLock', id: 'g-a7-cage-lock', anchorId: <each fence anchor>, flag: 'a7-never' }` (never set). Doors `A7-cage-w` (x 86, z 63.9-65.1) and `A7-cage-e` (x 96, z 63.9-65.1), 1.2 x 2.1, locked, `flag` gates on `a7-sync`. (marlow-a7-cabinet, 2026-10-23) A solid 1.75 m equipment cabinet in the middle, x 90.4-91.6, z 60.2-63.7 (`A7_CABINET`, `noLedge`): the mesh passes sight, so it is what hides T2's spot from the technician; the ready and state lamps show over it from a standing hacker, and the door-to-door walk (z 64.5) passes north of it |
| Terminal T1 (`a7-t1`) | (85.95, 0, 61.5) (device y 0: the scanner's `y` is its panel's floor, so the ready lamps hang at 1.95 / 2.25; the housing stays at 1.2) on the cage's west face, yaw -pi/2 (faces west); hack spot (85.35, 61.5) | - | Scanner panel; ready lamp seen from the pod through both mesh faces |
| Terminal T2 (`a7-t2`) | (96.05, 0, 61.5) (device y 0, housing 1.2) on the cage's east face, yaw pi/2 (faces east, into the pod); hack spot (96.65, 61.5) | - | 10.1 m from T1, the cage between |
| Containment pod | 96.0-100, 55.95-68 | roof 2.6 | Solid containment panels on its west wall except the cage's mesh face (z 60-66) and on its north wall; roof box `noLedge`. South door `A7-pod-s` (z 55.8, x 97.4-98.6), unlocked. East door = `A7-east` (facility) |
| Hall north-east | 86-100, 66-71.775 | - | Open floor north of the cage and the pod (the cage's north apron) |
| Camera `a7-cam1` | (86.5, 3.2, 71.5) on the north wall over the front aisle | - | Fixed, facing 195 deg, `aim` 4.0, `range` 12 (A7-C2) |
| Camera `a7-cam2` | (99.6, 3.0, 54.0) on the corridor's east end wall | - | Sweeping `[220, 320]`, facing 270 deg, `aim` 9, `range` 14 (master camera-range cut, was 18) |

Doors and spacing: L6 door (70, 62) -> hall door (76, 61.6): 6.0 m; L6 door -> plant door (72.8, 56): 6.6 m; hall door
-> plant door: 6.3 m; plant door -> pod door: 25 m. Every pair 5 m or more (SPEC: the lobby 6 m deep for this).

### 1.2 Heights and lips

| Lip / top | Height | Builder | In `COOP_LIPS` | Note |
| --- | --- | --- | --- | --- |
| Rack runs | 2.2 | hand boxes, `noLedge` | No | Over the 1.9 m auto-lip line; a 2.2 m top is no solo jump top (no mantle) |
| Cooling units | 2.0 | hand boxes, `noLedge` | No | Same |
| Cage mesh, kick panels, lid | 2.4 / 1.2 / 2.5 | `b.fence` (climbable: anchors locked), boxes, lid `noLedge` | No | Q8: a fence is climbable; the lid and the anchor lock close it |
| Pod roof | 2.6 | hand box, `noLedge` | No | - |
| Lobby partitions | 3.0 (to the lobby ceiling) | hand boxes | No | To the ceiling |

No lip in the co-op band in A7 (no co-op surface). No solo-standable top near anything that matters (no beams, no lips).

### 1.3 Greybox helper call

```ts
syncStation({ id: 'a7', kind: 'scan', a: { x: 85.95, z: 61.5, yaw: -Math.PI / 2 }, b: { x: 96.05, z: 61.5, yaw: Math.PI / 2 },
  y: 1.2, walk: 26 });
// 10.1 m straight (26 m by the shortest walk round the cage): over syncMinGap('scan') 4.6, strictly (it throws at
// or under it, correction 6). Scanner `sc-a7`, flag `a7-sync`; the helper's device keys `sw-a7-a` / `sw-a7-b` are
// renamed to SPEC's `a7-t1` / `a7-t2` with the ScannerDef's a / b (A7-D3). Hack spots (85.35, 61.5), (96.65, 61.5).
```

Hand data beside it: the cage (fence runs, kick panels, lid, anchor lock), the cage door gates `{ kind: 'flag', id:
'g-a7-cage-w', flag: 'a7-sync', doorId: 'A7-cage-w' }`, the same for `A7-cage-e` and for `A7-east` (the facility's L7
near door), the pass zone `a7-pod`, the two cameras.

## 2. Guard sheets

### `a7-tech`

| Field | Content |
| --- | --- |
| Guard | `a7-tech`, kind `grunt`, A7 squad, slot (84.4, 60.6) (R0), yaw pi/2 |
| Job | The data-hall technician on his rounds: reads the rack status screen at the cage front, walks the south aisle to the west wall's power distribution unit, back up the west cross aisle and along aisle C to the cage again |
| Route | `route: [[84.4, 60.6], [84.4, 57.4], [77.5, 57.4], [77.5, 65.7], [84.4, 65.7]]`, `waits: [5, 0.1, 3, 0.1, 0.1]` (0.1 s pass-through stops as built: a wait of 0 freezes `PatrolWalker`), `faces: [pi/2, NaN, -pi/2, NaN, NaN]`. R0 = the cage front (facing east: the screen on row 1's east part, (86.0, 59.4)), R1 = the south aisle's west end (facing west: the PDU). Walk 30.4 m at 0.99 m/s = 30.7 s + 8 s of stops: cycle 35-41 s on the walker as built (A7-C1) |
| Timeline (t = leaving R0) | 0-3.2 south down the front aisle. 3.2-10.2 west along aisle A (behind row 1). 10.2-13.2 R1 stop, facing west. 13.2-21.6 north up the west cross aisle (passes the hall door at 1.5 m at about t 17.6). 21.6-28.6 east along aisle C (row 2 hides aisle B until about t 26.6). 28.6-33.7 south down the front aisle. 33.7-38.7 R0 stop facing east (his back to aisle B and T1's hack spot is 1.1 m to his right) |
| What he sees | At R0: the cage's west mesh and the screen; aisle B is behind him. Through the mesh the cage's equipment cabinet hides T2's spot and the pod behind it from R0, aisle B, the front aisle and aisle C (marlow-a7-cabinet; from the cage's north apron, off his loop, T2 still shows through the north and east mesh). On aisle A: the south aisle only (row 1 is solid: nothing of aisle B). At R1: the west wall; the hall door is 4 m to his right (north). Up the west cross aisle: aisles A-D open to his right in turn (he sees down each). Along aisle C: the cage's north part and the front aisle ahead |
| Gaps | T1's hack spot is out of his view t 5-26 (21 s): the hall player's window. The hall door: safe to open t 21.6-13 (when he is east of x 80 or facing east) |
| Isolation moment | R1 (77.5, 57.4), t 10.2-13.2: alone, unwatched (no camera covers the hall's south-west), lit by 71's bulkhead but darkened by 71's switch beside him (LR4; LIGHTING-PLAN); a takedown from behind him, coming west along aisle A (he faces the west wall) |
| Covered by / covers | One guard. `a7-cam1` covers the north approach to the front aisle; he covers aisle B and T1 at R0 and on the front aisle. The hall player chooses: time the guard or jam-hop the camera |
| Lures | Aisle ends 71 off (`a7-sw-aisles`, the hall's south-west corner (76.5, 56.3)): from anywhere on his loop (within 13 m) he walks to the switch, looks 4 s, gives up within 20 s: the cage front is free for about 25 s. Rows 70 off (lobby switch): he walks to the lobby side of the hall door (he opens it: the lobby is not his loop, A7-D5). Corridor 72 off: he is out of 25 m only at R0 (13 m: in range); he walks into the corridor by the plant door. A jammed camera or lamp lures nobody |
| Search | After a sighting: the aisles round rows 1-2 (search ring 11 m). Nearest hide spots: the row ends, the lobby (through the hall door), the coat bay |
| Body | A body at the cage front, in aisle A or the front aisle is on his loop; in aisle B it is found from the front aisle's mouth on his next pass |

### Cameras

| Camera | Mount | Watches | Beaten by |
| --- | --- | --- | --- |
| `a7-cam1` | (86.5, 3.2, 71.5), fixed, facing 195 deg, `aim` 4, `range` 12 | The front aisle's north mouth (x 83-86, z 64-70) and the cage's north apron: a head is in frame from about 1 to 5.5 m out (the frame's top edge); T1's hack spot (10.2 m) is above the frame (A7-C2) | Time (it is fixed: never); the jam (5 s held + 1.5 s reboot: a lone jammer hops on the reboot only); the aisle-B route avoids it |
| `a7-cam2` | (99.6, 3.0, 54.0), sweeping 220-320 deg (15 deg/s, 2 s pauses), `aim` 9, `range` 14 (was 18; master camera-range cut) | The corridor east of x 86 while its axis is within 35 deg of west (4.7 s per pass); out of frame for about 4 s at each end of the sweep (two blind windows per 17.3 s) | The blind windows (the taught answer); a jam from the x 85 unit's lee (15.6 m), then a hop on the reboot; the units' west lees (a crouched body against the wall behind a unit is out of its line) |

## 3. Beat chart rows

| Space | Tension | Mechanic taught | Combined | Release | Feeling |
| --- | --- | --- | --- | --- | --- |
| A7 the Data Hall | 4 | Split paths and a synced hack | Solo stealth against a guard and a sweeping camera | Both ready lamps lit through the mesh; the cage opens and the pair walk out together | "You're on your own for a bit": the pair separate for the first time and meet again through the mesh |
| L7 the Model Room | 1 | - | - | The A8 model under its vitrine, a wall medkit, a 30 s rest | Plan the finale together |

## 4. Coverage table (verbs in this set)

| Verb | Use here |
| --- | --- |
| Paired hack (scanners, N6) | Taught (C9): 2 s each, inside 1.5 s, on the ready lamps |
| Split paths | Taught: the hall and the corridor |
| Solo stealth against a patrol | Tested (the hall) |
| Solo stealth against a sweeping camera | Tested (the corridor) |
| Held jammer on a camera | Optional (either camera; solo it only buys the reboot) |
| Crouch-walk at a silent gear | Tested on the grating (loud above crouched gears 1-3) |
| Light switch / lights-out lure | Toy (71 to the south-west corner, 70 to the hall door, 72 into the corridor) |
| Takedown from behind, carry and hide a body | Optional (R1) |
| Doors | The lobby's two glazed doors, the pod's south door, the cage doors on the sync, L6 / L7 slide doors |
| Leg-up, relay, throw, hang-down, rope, console, dual takedown | Not used here |
| Split jump, wall jump, pipes, ladders, ducts, rappel | Not used: no believable element (SPEC 8); the trench is covered by the grating |
| Revive | Not a co-op surface (ground level) |

## 5. Tool / problem matrix

| Problem | Tools (at least three) |
| --- | --- |
| The technician's round past T1 | Time his walk (t 5-26) / lure him to the south-west corner with 71 / take him at R1 / wait in aisle B behind his back |
| The fixed camera on the north approach | Avoid it (aisle B) / jam it and hop on the reboot / shoot it (alarm stage) |
| The sweeping corridor camera | Its blind windows / the cooling units' lees / jam and hop on the reboot / shoot it |
| The loud grating | Silent crouched gears (4.7 s for 6-8 m) / run it in one window (loud) / wait out his far side of the loop |
| Two terminals 10 m apart with the cage between | A partner at each / the ready lamps through the mesh / nothing for one player (helper-proved) |
| A body | Aisle B's west end / the lobby / leave it and be quick |

## 6. Metrics check

| Element | Number | Window (source) | Pass |
| --- | --- | --- | --- |
| Terminal spacing | 10.1 m straight, 26 m by walk | `syncMinGap('scan')` 4.6, strictly | Yes (correction 6) |
| Panel height | y 1.2 on a y 0 floor | Q10: per panel floor since N6 | Yes |
| Hack | 2 s each, finish inside 1.5 s | `SCANNER`; a fail costs 10 HP (G193) | Yes |
| Hall window at T1 | 21 s per 39 s cycle | A's 7 m hop (4 s) + the hack (2 s) + the ready-lamp wait | Yes |
| Corridor blind windows | about 4 s, twice per 17.3 s | The 8 m grating hop at 1.7 m/s = 4.7 s (0.7 s in frame at 10 m: the fill stays under the leak) | Yes, marginal (A7-C4) |
| Corridor path length | about 38 m, about 43 s with the window waits | SPEC "each path about 45 s" | Yes |
| Hall path length | about 13 m plus the waits, about 45 s | SPEC | Yes |
| Jam ranges | cam2 from the x 85 lee 15.6 m; cam1 from the front aisle's mouth (84.5, 63.5) 8.3 m | `JAMMER.range` 20 | Yes |
| Cameras in the budget | 2 | A7 budget 2; 12 per map | Yes |
| cam1 frame | Head in frame 1-5.5 m out; T1 spot 10.2 m | `aim` 4 at y 3.2: frame 16-61 deg below level | Yes (unit test: `inFrame` false at T1's spot, A7-C2) |
| Lure range, 71 | Switch (76.5, 56.3) to R0 8.4 m, the farthest point (84.4, 65.7) 12.3 m | `LURE_RANGE` 25 | Yes |
| Cycle / stops | 38.7 s; 5 / 3 s | LD 4.3: 25-45 s; 3-6 s | Yes (A7-C1) |
| Aisles / corridor | 3.0 m aisles, 2.55 m beside the units, 3.45 m corridor | Q13: 3.0 m and 3.5 m fit the shoulder camera (`camSpaces` tight) | Yes (GPU shot pending) |
| Doors | Lobby doors 1.2 x 2.1, 6.0-6.6 m apart; cage and pod doors 1.2 x 2.1 | Doors; 5 m between doors | Yes |
| Racks, units, lid, roof | 2.2 / 2.0 / 2.5 / 2.6, all `noLedge` | LD 12.1 auto lips at 1.9 m | Yes |
| Clearance | 1.0 m in front of T1, T2 and both doors of the cage | LD 16.4.2 | Yes (T1 has the front aisle, T2 the pod's 4 m) |

## 7. Lights (LIGHTING-PLAN section 3, `MARLOW_CIRCUITS`)

| Group | Key | Kind | Lamps (plan, y) | Switch / reason | Cut by | Lure |
| --- | --- | --- | --- | --- | --- | --- |
| 70 | `a7-rows` | switch | 6 strips over the aisles (y 3.8, radius 4.5, intensity 1.0, cool): (81.6, 57.4) (moved from 80.9 so R1 reads cut with only 71 off), (80.9, 61.5), (80.9, 65.7), (84.5, 61.8) lengthwise over the front aisle (T1 read 0.50 at (84.5, 63.0); the pool needs 0.60), (91.0, 57.4), (91.0, 69.0); 1 lobby panel (73.0, 2.9, 61.0), radius 4.0 (A7-D4): 7 lamps | `a7-sw-rows` (75.8, 1.2, 60.4), in the lobby by the hall door | switch, jam, shot | tech (to the hall door) |
| 71 | `a7-aisles` | switch | 2 bulkheads at the aisle ends (y 2.6, radius 3.2): (76.4, 57.4), (76.4, 69.9) | `a7-sw-aisles` (76.6, 1.2, 56.0), at the south aisle's west end (hall side) | switch, jam, shot | tech (to the south-west corner) |
| 72 | `a7-plant` | switch | 4 bulkheads (y 3.0, radius 4.5: at 3.5 the grating read 0.39): (74.0, 53.9), (79.5, 53.9), (85.0, 53.9), (91.0, 53.9) | `a7-sw-plant` (71.6, 1.2, 55.6), in the corridor west of its west door (the doc's (73.0, 55.3) is inside the door opening, x 72.2-73.4) | switch, jam, shot | tech (into the corridor) |
| 73 | `a7-pod` | device | 2 strips in the pod roof (y 2.5, radius 3.5: T2 read 0.18 at radius 2.5): (97.8, 60.0), (97.8, 63.0) | None: on the cage's own control | jam, shot | none |

- Zones: set `ambientZone` x 70-100, z 52-72 at 0.14 (`minY` -1, `maxY` 3.9). No upper level.
- Dark pockets: none (rack-row ends and the coat bay are hide spots). Isolation moment R1 lit but darkenable by 71
  beside it (LR4).
- Light-test spots: the cage front / T1 spot (85.35, 61.5) >= 0.60; aisle B (80.9, 61.5) >= 0.40; R1 (77.5, 57.4) >=
  0.40 with 71 on and <= 0.24 with 71 off; the corridor (80, 53.9) >= 0.40; T2 spot (96.65, 61.5) >= 0.40; the lobby
  (73.5, 62) >= 0.40.
- Parity: the cool LED accent lines on the rack-row ends on 70; the terminals' ready lamps and the cage door status bars
  are device emissives. The mesh passes light (`b.fence` mesh is not in the light shapes): 73 lights the cage's east
  half a little, as the picture shows.
- No timed window in A7.

## 8. Objective steps (N1) and per-player lines

Roles (claim): `roles: [{ role: 'b', zone: { box: [70.3, 52.3, 99.8, 55.6] } }]`: the first player into the plant
corridor takes B; the other is A (the hall). Until then the lead (P1, odd set) sees A.

| Step | Shared | A | B | Done when | Timer |
| --- | --- | --- | --- | --- | --- |
| `a7-split` | Split up: one through the hall, one through the plant corridor. (63) | Hall route: slip past the technician's round to terminal one. (61) | Plant corridor: quiet on the grating, past the camera, to terminal two. (71) | `{ flag: 'a7-pod' }` (one player in the pod) | - |
| `a7-sync` | Hack both terminals together. Start on the ready lamps. (55) | Hack terminal one on your partner's count. (42) | Hack terminal two on your partner's count. (42) | `{ flag: 'a7-sync' }` | - |
| `a7-lock` | The cage and the east door are open. Both of you into holding room seven. (73) | - | - | Last line (L7 cycles) | - |

- Pass zone: `a7-pod` (`any: true`), box x 96.3-99.8, z 56.2-67.8, `floorY` 0.
- Radio: enter "Two terminals, two routes. You'll be on your own for a bit. Meet at the cage." (77); then "That
  corridor camera sweeps. Move while it looks the other way." (63, A7-D6); on `a7-sync` "Cage released. East door is
  open." (33).

## 9. Co-op routes and timing (SPEC section 10: A7 target 1:50, min 1:10, max 3:00; cumulative 13:57)

### Route 1 (taught): split, sync, out through the cage

| # | Who | Action | Target | Running in A7 |
| --- | --- | --- | --- | --- |
| 1 | Both | Through L6's door into the lobby; the fire plan; both glazed doors | 0:05 | 0:05 |
| 2 | Both | Watch the technician's round once through the hall door's sidelight; watch the corridor camera's sweep through the plant door's sidelight | 0:35 | 0:40 |
| 3 | B | Through the plant door (claims B), crouch along the corridor to the x 85 unit's lee (83.7, 55.2), the last 3 m in a blind window | 0:15 | 0:55 |
| 3' | A | (in parallel) When he turns into aisle C (t 21.6), through the hall door and into aisle B's west end (78.5, 61.5); crouch still | - | - |
| 4 | B | Hop the grating to the x 93 unit's lee (8 m, 4.7 s) at the start of a blind window | 0:10 | 1:05 |
| 5 | B | Next window: to the pod door (6 m), in, to T2's spot (`a7-pod`; `a7-split` ticks) | 0:10 | 1:15 |
| 6 | A | Wait for the technician's R0 stop to end (t 0) and his walk off south and west (t 5); to T1's spot (7 m) | 0:15 | 1:30 |
| 7 | A, B | Both ready lamps lit (each seen through the mesh); A counts; both hack 2 s (`a7-sync`: the cage doors and `A7-east` open; `a7-sync` ticks) | 0:05 | 1:35 |
| 8 | A, B | A through `A7-cage-w`, across the cage (10 m), through `A7-cage-e` into the pod while he walks west (t 10-20); both through `A7-east`; both onto the L7 pad | 0:12 | 1:47 |
| 9 | Both | First-run slack | 0:03 | 1:50 |

Sum 1:50 (target). Min about 1:10 (no watch, B's windows on arrival, the technician already west). Max 3:00 (a failed
sync: 10 HP to the late player, both wait for the next hall window; or a camera sighting: the alarm stage and LANTERN,
re-hide and retry).

### Route 2 (hall, the camera way)

A goes north up the west cross aisle behind him (t 22-30 he is on aisle C: wait for him to turn south at t 28.6), along
aisle D, then down the front aisle's north mouth under `a7-cam1`: a jam (8.3 m) from aisle C's east end, the hop on the
reboot (1.5 s) to (84.5, 63.5), then T1 (2 m). Slower and lit; for a player who misses the aisle-B window.

### Route 3 (lure)

A enters the hall and presses 71 (the south-west corner, 5 m from the hall door) while he is at R0 or on the front
aisle: he walks to the switch (dark south aisle, torch on); A goes back into the lobby, waits for him to arrive, then
crosses aisle B to T1 behind his back (about 25 s of clear cage front). Or A waits behind the corner for the R1
takedown (the isolation moment).

### Route 4 (corridor, loud)

B runs the grating at 2.15-2.6 m/s in one window (2.3-2.8 s, loud): the technician hears it through the wall (muffled)
if he is near the south aisle and turns; acceptable when he is at R0 or on aisle C.

Way back for a lone or downed player (C9): both paths are ground level and open both ways; the lobby is out of every
view; a failed sync leaves both terminals ready again after the fail.

## 10. Self-critique (the 10 weakest points and the fix)

1. The technician's loop circles only the west rows: the hall's north-east is his blind side and only `a7-cam1`
   covers it. Fix: deliberate (two problems, two tools); if the north route proves free, add a 3 s stop at (90, 69)
   (cycle about 45 s).
2. T1's hack spot is 1.1 m from his R0 stop: a player who mistimes it is caught point blank. Fix: the objective line
   says "slip past his round"; the window is 21 s; the aisle-B wait is behind his back.
3. A lone player cannot really use the jammer on a camera (the jammer must stand still): the SPEC's "jam either camera
   (each player alone)" is weak (A7-C3). Fix: the blind windows and the unit lees are the taught answers; the jam buys
   the reboot.
4. The corridor's blind windows (4 s) are 0.7 s short of a silent grating hop. Fix: the 0.7 s in frame at 10 m does not
   fill the meter (pinned by the e2e); if it does, widen the sweep to 230-310 (5 s windows).
5. The hall door is on his loop (1.5 m at t 17.6): opening it at the wrong moment is a close-range detection. Fix: the
   glazed sidelight shows him coming; the vantage line names the timing.
6. `a7-cam1` is not at the north-east corner (A7-C2). Fix: the corner would see T1 through the mesh; the new mount
   keeps the camera's job (the north approach) without blocking the hack.
7. The corridor is a dead end for B if the pod door is the only way on. Fix: it is the goal; the lobby behind is out
   of every view; cam2 never sees into the lobby.
8. The pass zone ticks `a7-split` for any player in the pod, so the hall player walking into the pod after the sync
   is not a problem, but a B who loiters in the corridor leaves the step open. Fix: the HUD's B line names the pod.
9. Light does little here (cameras ignore it; the tech is the only reader). Fix: 71 and its lure are the light play;
   SPEC's route summary lists A7's combine as solo stealth and cameras.
10. Shooting a camera is host only today. Fix: Future (SPEC 21); no exercise needs a shot.

## 11. e2e route (`scripts/e2e-ctcourse/a7DataHall.mjs`, part `:4`, two pages)

Pages: host (P1) and client (P2). Pass 1: the client is B (corridor), the host is A (hall). Pass 2 (claim swap): the
host steps into the corridor first and the HUD shows the host as B on both pages; then restart.

1. Start at L6's far door after A6 (or "Start at" A7); HUD `a7-split` on both pages (host A line, client B line).
2. Client through `A7-plant` into the corridor: the claim shows the client as B on both pages.
3. Client crosses the corridor in cam2's blind windows (read the sweep yaw from `__ctdev.debug()`; teleport legs
   allowed between the lees): no camera detection counted; client into the pod: `a7-pod` set; `a7-split` ticks.
4. Host waits for `a7-tech` to leave R0 (route index 0 -> 1, read on the host), then to T1's spot.
5. Both hack (`c-a7-t1` on the host, `c-a7-t2` on the client) with starts 0.5 s apart: `a7-sync` set; `sc-a7` ready
   lamps lit on both pages during the hack; `A7-cage-w`, `A7-cage-e` and `A7-east` unlocked; `a7-sync` ticks.
6. Fail check (pass 1b, before step 5 on a restart): starts 2.0 s apart: no flag, the late player loses 10 HP (never
   below 1), both terminals ready again.
7. Host through both cage doors into the pod; both onto the L7 pad; L7 cycles; A8's list shows on both pages.
8. Unit cases (`tests/ctcourse/a7DataHall.test.ts`, moved from `tests/scanners.test.ts`): `A7_SCANNERS` (ids, flag,
   spacing over `syncMinGap`), one player cannot work both (`scanStart`), the cage fence anchors locked, the lid
   `noLedge`, `a7-cam1` `inFrame` false at T1's hack spot, every rack and unit `noLedge`.

Shot vantages: the lobby (73.5, 62.0) looking east through the hall door's sidelight; the corridor's west end (73.5,
53.9) looking east to the grating and cam2; T1's spot (85.35, 61.5) looking east through the cage to T2.

## 12. Playtest checklist (Michael, desktop)

- From the lobby, can you read the technician's round, both terminals and the corridor camera within one cycle?
- Does the split feel good: each player busy with his own problem, neither waiting more than about 30 s?
- Are the corridor's blind windows readable (the camera's view grid), and is the silent grating hop fair?
- Is the synced hack clear on the ready lamps through the mesh, and does a failed sync feel fair?
- Is the north camera route ever worth it, or is aisle B strictly best?
- Can one player do both terminals, or reach T2 without the corridor?
- LD 13: any detection you could not understand; did it feel like a real data hall?

## 13. Decisions, corrections and contradictions

| Id | What | Why | Undo |
| --- | --- | --- | --- |
| A7-D1 | Entry lobby x 70-76, z 56-66 with the hall door on its east wall (aligned with aisle B) and the plant door on its south wall | SPEC: "lobby at the west end, 6 m deep, doors 5 m apart"; the corridor runs under it along z 52-55.5 | - |
| A7-D2 | Rows west of the cage only (x 78.8-83.0) plus row 1's east part along the cage's south face; the north-east is open floor | Three rows fill the 16 m between the corridor wall and the north wall at 3.0 m aisles; the cage takes the east half | More rows east of the cage at 2.4 m aisles (under SPEC's 3.0) |
| A7-D3 | Terminal ids `a7-t1` / `a7-t2` (SPEC), renamed from `syncStation`'s `sw-a7-a` / `sw-a7-b` | SPEC's names in the scanner and the tests | Keep the helper's names everywhere |
| A7-D4 | One lobby panel on 70 (the lighting table has none for the lobby) | The lobby needs a read light; it is the hall's operator's lobby on the rows' switch | A lobby group 74 on a switch by the L6 door |
| A7-D5 | 70's lure makes him open the hall door into the lobby | The switch is in the lobby by the door (a real place for it); his look at the switch is a risk the players choose | Move 70's switch inside the hall at (76.6, 62.6) |
| A7-D6 | Extra LANTERN line on the camera's sweep | The blind windows are the corridor's lesson | Drop the line |
| A7-D7 | Technician kind `grunt` | SPEC rule 9 | - |
| A7-C1 | SPEC: cycle 40 s "along the aisles west -> east -> back by the south aisle"; a full-length aisle loop is about 55 m (55 s) at 0.99 m/s | Loop round rows 1-2 west of the cage: 38.7 s, inside LD 25-45 | A longer loop at about 45 s with a north stop (self-critique 1) |
| A7-C2 | SPEC: `a7-cam1` "fixed at the hall's north-east corner over T1's approach"; from the corner its line passes the cage's mesh to T1's hack spot (`b.fence` passes sight, Q8), so the hack would always be seen | Mount on the north wall over the front aisle (86.5, 3.2, 71.5), short aim: it watches the north approach and T1's spot is above its frame | Corner mount and T1 moved to the cage's south-west corner behind row 1 |
| A7-C3 | SPEC: "Jam either camera (each player alone, still): the solo stealth test"; the jammer must stand still (`stillSpeed` 0.45), so a lone player only gains the 1.5 s reboot | The taught solo answers are the sweep's blind windows and the hall timing; the jam is a minor tool | - |
| A7-C4 | SPEC: the grating "slow and silent or fast and loud"; at the silent crouch 8 m takes 4.7 s against a 4 s blind window | Marginal by design; the e2e pins that 0.7 s in frame at 10 m does not detect | Sweep 230-310 deg |
| A7-C5 | SPEC 5: the north gallery strip (z 48-52) is "glazed into the middle and north rows"; A7's slab is at 4.0 m, under the gallery floor (4.5), so a window in A7's south wall above 4.5 m sees nothing | A7 is shown on the bridge's monitor wall (as A3); facility.ts's glazing over A7 is a blank panel or looks at the slab (reported to the job lead; not A7's file) | Raise A7's slab to 6 m over the corridor's north half |
| A7-C6 | SPEC: the technician "with a torch" (ROUTE-DRAFT); SPEC 5 bars torches near glass | No torch carried; he takes one only when investigating a made dark (torch rule), and the lobby glass is 1 m from his loop: a torch beam through the sidelight is drawn but blocked for the meter (Q7) | - |

Register additions / changes (SPEC 18, A7): A7-5 amended: "Entry lobby, glazed sidelights beside both doors (glass
stops guard and camera sight), fire plan". A7-9 Containment pod south door (the plant corridor's end, real pod end
door). A7-10 Cage fence anchor lock and lid (a colocation cage is roofed).
