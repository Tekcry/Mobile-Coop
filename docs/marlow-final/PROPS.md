# Marlow Yard - props kit (marlow-final M5 / A6)

The PROPS kit dresses the sets (mock-ups of real sites) and the instructor gallery. The ARCHITECTURE kit (wall panels,
glazing, sliding doors, LED coves, trims, columns, handrails) is a separate kit: `KIT.md`, `scripts/facility-kit/`,
`src/world/kit/`. Props never replace architecture pieces and never touch the level builder's collision.

Status (2026-10-23): first batch generated (section 4). The rest of the list is planned, not built.

## 1. Rules
- **Source.** In-repo Blender script only: `scripts/facility-props/build.py`, Blender 5.2.2 headless (`-b`), driven by
  `node scripts/facility-props/build.mjs`. No external art, no textures yet (factor-only materials; CC0 textures may
  come in the visual pass). Output: `src/world/props/assets/facility-props.glb` + `facility-props.json` (triangles,
  bounds and bytes per prop), bundled, no runtime network.
- **Format.** Same as the facility kit (`build_kit.py`): one GLB, one mesh per (prop, material) named
  `<prop>.<material>`, triangulated, flat-shaded hard surface (sharp over 30 deg), no UVs. The game renderer owns the
  look by material name (`PROP_LOOK` in `src/world/props/facilityProps.ts`) and draws one thin-instanced mesh per
  (prop, material), so a set of 40 racks is still one draw per material.
- **Frame.** Game metres: +X right, +Y up, +Z the prop's front. Free-standing props: origin at the footprint centre on
  the floor (y 0). Wall-mounted props (monitor wall): back on the wall face at z 0, facing +z. Yaw about +y as the kit
  (Babylon: local +z -> (sin yaw, 0, cos yaw)).
- **Collision.** Props are visual only (`collide: false`) over the level builder's collision boxes. Each prop with a
  gameplay footprint lists the box the map builder must place (`PROP_COLLISION` in `facilityProps.ts`; the placement
  helper returns it in world space so the builder writes the same box). Gameplay never reads prop meshes (hard rule).
  Ledge flags are the builder's: racks, vans, transformers, cooling units, kiosks and the cage top are `noLedge`
  (ROUTE-DRAFT risk 7). A prop stands at most 5 cm proud of its box (the kit's skin rule: never into the 0.3 m capsule
  standoff); anything further out (a van's buffers, a pump's pipe flange) is listed as an overhang and sits where no
  player can stand.
- **Light parity.** Emissive parts (screens, status LEDs, ready lamps) are accents only and never brighter than the
  baked lamps around them; screens and lamps that stand for a device state are tinted per instance by the renderer
  (the kit's status-bar approach). A prop never adds a light.
- **Budget.** Low poly, believable at a glance. Per-prop budgets below; a set's dressing stays under 60 k triangles
  and 12 draws (props), so the whole yard's props stay under ~0.4 M triangles drawn (well inside the 8 M / 600 draw
  frame budget, `docs/systems/performance.md`). Perf and GPU shots per set via Character Build.

## 2. Materials (renderer table `PROP_LOOK`)
| Material | Use |
| --- | --- |
| `steel` | painted mid-grey steel: frames, cabinets, kiosks, consoles' carcass |
| `steelDark` | near-black powder coat: racks, monitor bezels, chairs' frames, desk legs |
| `galv` | galvanised steel: mesh cage frames, beam towers, rack bracing |
| `mesh` | welded mesh infill (alpha) |
| `rackBlue` | pallet racking uprights (RAL 5010 blue) |
| `rackOrange` | pallet racking beams (RAL 2004 orange) |
| `timber` | pallets, sleepers |
| `cardboard` | boxed loads on pallets |
| `wrap` | stretch-wrapped loads (pale, semi-gloss) |
| `vanBody` | freight van body (oxide brown) |
| `vanRoof` | van roof (weathered grey) |
| `iron` | running gear, wheels, buffers, vault steel (dark oiled iron) |
| `transformer` | transformer tank and radiators (RAL 7033 grey-green) |
| `porcelain` | bushings (glazed brown) |
| `concrete` | bunds, plinths (pale concrete) |
| `pumpPaint` | pump casings (machinery green) |
| `safety` | safety yellow (lifting points, kick plates, sign bands) |
| `oak` | bank counters |
| `marble` | counter tops (pale marble look) |
| `brass` | grille, counter rails, vault wheel |
| `plastic` | black plastic: keyboards, screen backs, rack blanking |
| `fabric` | chair seats (charcoal) |
| `screen` | screen faces (emissive, tinted per instance; dark when its device is off) |
| `lamp` | status / ready LEDs and beam lenses (emissive, tinted per instance) |

## 3. Prop list per set
Size = W x D x H in metres (W along local x, D along local z, H up). Collision: "builder" = the level builder places
the listed box (props are visual over it); "none" = no gameplay footprint (wall-mounted or above head height); "own" =
the prop is a device whose collision the device code already owns. Status: B1 = first batch (built), P = planned.

### Facility shell and instructor gallery (out of bounds, sight only; A5)
| Prop | Real object | Size | Collision | Tris | Status |
| --- | --- | --- | --- | --- | --- |
| `galleryConsole` | Long instructor control desk module (2.4 m), sloped control surface, two desk monitors | 2.4 x 0.9 x 1.1 | none (out of bounds) | 500 | P |
| `galleryChair` | High-back mesh task chair on a five-star base | 0.65 x 0.65 x 1.2 | none | 350 | P |
| `galleryScreen` | Wall-hung 86" display showing a set's camera feed | 1.95 x 0.08 x 1.15 | none | 60 | P |
| `monitorWall` | Shared with A4: 3 x 3 video wall on a floor frame (the bridge copy shows the sets) | 3.7 x 0.35 x 2.6 | none on the bridge | 400 | B1 |
| `instructorFigure` | Seated static dressing figure (LANTERN's chair, two instructors) | - | none | - | P (needs the guard / figure avatar job) |
| `receptionDesk` | Arrival lounge reception desk, marble-look front, oak top | 3.6 x 1.1 x 1.1 | builder 3.6 x 1.1 x 1.1 | 300 | P |
| `loungeSeat` | Leather lounge armchair | 0.85 x 0.85 x 0.8 | builder 0.85 x 0.85 x 0.8 | 400 | P |
| `greenWall` | Living green wall panel behind reception (1.2 m module) | 1.2 x 0.2 x 3.0 | none (wall) | 300 | P |
| `modelVitrine` | L7: scale model of A8 under a glass vitrine | 2.0 x 1.2 x 1.1 | builder 2.0 x 1.2 x 1.1 | 600 | P |
| `holdingBench` | Holding-room bench, oak on brushed legs | 1.8 x 0.45 x 0.45 | builder | 120 | P |
| `kitCaseWall` | Glass-fronted kit room wall of rifle and pistol cases (1.2 m module) | 1.2 x 0.5 x 2.4 | builder | 400 | P |

### A1 - The Gate (lorry gate, goods-yard wall, wicket)
| Prop | Real object | Size | Collision | Tris | Status |
| --- | --- | --- | --- | --- | --- |
| `barrierPost` | Rising-arm lorry barrier: motor post + 6 m arm (down) | post 0.4 x 0.4 x 1.1, arm 6.0 | builder post box only (arm above 1.0 m, visual) | 200 | P |
| `checkerDesk` | Gate checker's booth desk with a monitor and logbook | 1.4 x 0.7 x 0.75 | builder | 250 | P |
| `bollard` | Steel lane bollard, yellow sleeve | 0.2 dia x 1.0 | builder 0.25 box | 40 | P |
| `wicketBolt` | Heavy tower bolt and hasp on the wicket (yard side) | 0.4 x 0.1 x 0.1 | none (door's) | 60 | P |

### A2 - Carriage Shed (night freight siding)
| Prop | Real object | Size | Collision | Tris | Status |
| --- | --- | --- | --- | --- | --- |
| `boxVan` | Covered goods van: planked body, curved roof, sliding doors, underframe, two wheelsets, buffers | 10 x 2.6 x 3.4 (body to 3.4; buffers +0.45 each end) | builder 10 x 2.6 x 3.4, `noLedge` | 1200 | B1 |
| `trackPanel` | Rail road module: two rails on timber sleepers in ballast (10 m) | 10 x 2.6 x 0.2 | none (floor) | 300 | P |
| `bufferStop` | Rail-built buffer stop with two buffers | 2.6 x 1.4 x 1.5 | builder 2.6 x 1.4 x 1.5 | 300 | P |
| `pushStation` | Lighting push station: wall cabinet with ISOLATE button and status lamp | 0.6 x 0.3 x 1.0 | own (the isolator device) | 150 | P |
| `permitGate` | Padlocked permit-to-work gate on the staging stair | 1.0 x 0.1 x 1.1 | builder (the gate is the stair's block) | 120 | P |

### A3 - Office Range (commercial office corridor)
| Prop | Real object | Size | Collision | Tris | Status |
| --- | --- | --- | --- | --- | --- |
| `officeDesk` | Bench desk with modesty panel, monitor and keyboard | 1.6 x 0.8 x 0.75 (monitor to 1.2) | builder 1.6 x 0.8 x 0.75 | 250 | P |
| `officeChair` | Task chair (the gallery chair, low back) | 0.6 x 0.6 x 1.0 | none (small) | 300 | P |
| `filingCabinet` | Four-drawer steel filing cabinet | 0.47 x 0.62 x 1.32 | builder | 80 | P |
| `cleanerTrolley` | Cleaner's trolley with bucket and bin bag | 1.1 x 0.5 x 1.0 | builder | 300 | P |

### A4 - Goods Shed (port warehouse and its security room)
| Prop | Real object | Size | Collision | Tris | Status |
| --- | --- | --- | --- | --- | --- |
| `monitorWall` | Security office video wall: 3 x 3 55" screens on a floor-standing frame, plinth with cable trunking | 3.7 x 0.35 x 2.6 | builder 3.7 x 0.35 x 2.6 (against the wall) | 400 | B1 |
| `securityDesk` | Security operator console: worktop on a cable-managed carcass, three desk monitors, keyboard, joystick, phone | 2.4 x 0.9 x 0.75 (monitors to 1.25) | builder 2.4 x 0.9 x 0.75; the console device owns its use point | 500 | B1 |
| `palletRackBay` | One bay of wide-aisle pallet racking: two frames (uprights + bracing), 3 beam levels at 1.8 / 3.6 / 5.4 m... loaded with 2 pallets per level | 2.7 x 1.1 x 5.4 (beam centres 2.7) | builder 2.7 x 1.1 x 5.4, `noLedge` | 700 | B1 |
| `palletLoad` | Floor pallet with a stretch-wrapped load | 1.2 x 1.0 x 1.4 | builder 1.2 x 1.0 x 1.4 (low cover at 1.2 needs the 1.2 variant) | 120 | P |
| `dispatchDesk` | Dispatch desk with a label printer and a kettle counter | 1.8 x 0.7 x 0.9 | builder | 250 | P |
| `reachTruck` | Parked reach truck, forks down | 2.6 x 1.3 x 2.3 (mast to 2.3) | builder | 900 | P |

### A5 - Substation (urban grid substation, indoor switchgear hall)
| Prop | Real object | Size | Collision | Tris | Status |
| --- | --- | --- | --- | --- | --- |
| `transformer` | 33/11 kV transformer: tank, radiator banks on two sides, HV and LV bushings, conservator, in a 1.2 m concrete oil bund | bund 6.0 x 5.0 x 1.2; unit 3.6 x 2.4 x 3.5 | builder: bund walls (1.2 m low cover) + unit box 3.6 x 2.4 x 3.5, `noLedge` | 1200 | B1 |
| `beamTower` | IR beam tower: square aluminium column, three lens heads, hood cap, base plate | 0.22 x 0.22 x 2.4 | builder 0.25 x 0.25 x 2.4 (thin pole: sight passes beside it) | 200 | B1 |
| `zoneKiosk` | Zone control kiosk: pedestal cabinet with keypad and status lamps | 0.8 x 0.5 x 1.5 | own (the zone release) | 150 | P |
| `switchgearPanel` | One 11 kV switchgear panel (0.8 m module) in a line-up | 0.8 x 1.6 x 2.3 | builder (as a run) | 200 | P |
| `cableDrum` | Timber cable drum on its side | 1.8 dia x 1.1 | builder 1.8 x 1.1 x 1.8 | 250 | P |

### A6 - Pump House (tidal barrier pumping station)
| Prop | Real object | Size | Collision | Tris | Status |
| --- | --- | --- | --- | --- | --- |
| `pumpUnit` | Vertical mixed-flow pump set on a 1.2 m concrete plinth: discharge head and bend, motor stool, motor with fan cowl, guard, lifting eyes | plinth 2.4 x 2.4 x 1.2; unit to 4.0 | builder plinth 2.4 x 2.4 x 1.2 (low cover) + motor column 1.2 x 1.2 to 4.0, `noLedge` | 900 | B1 |
| `meshPanel` | Welded-mesh partition panel (machine guard / cage): galvanised frame, 1.2 m solid kick panel, mesh above | 1.5 x 0.05 x 2.4 | builder (the cage wall box; sight per G45 rules) | 120 | B1 |
| `driveCabinet` | Variable-speed drive cabinet, door HMI screen | 1.2 x 0.6 x 2.0 | own (the hack terminal) | 200 | P |
| `davitBox` | Confined-space rescue kit box on the gallery rail | 0.8 x 0.5 x 0.6 | own (the rope anchor) | 100 | P |
| `glandPlate` | 0.6 m cable gland plate with yellow lifting-point sign | 0.6 x 0.6 x 0.03 | own (the hang-down anchor) | 40 | P |
| `pipeRun` | DN600 discharge pipe, 1 m module, flanges | 1.0 x 0.7 dia | builder where reachable | 120 | P |

### A7 - Data Hall (colocation hall and two-person cage)
| Prop | Real object | Size | Collision | Tris | Status |
| --- | --- | --- | --- | --- | --- |
| `serverRack` | 42U server cabinet: perforated front door, side panels, top cable entry, blanking, status LEDs on the servers | 0.6 x 1.2 x 2.2 | builder (as a row box 0.6 n x 1.2 x 2.2), `noLedge` | 300 | B1 |
| `meshPanel` | The cage walls (shared with A6) | 1.5 x 0.05 x 2.4 | builder | 120 | B1 |
| `coolingUnit` | Downflow computer-room air handler | 1.8 x 0.9 x 2.0 | builder, `noLedge` | 200 | P |
| `cableTray` | Overhead wire cable basket, 1 m module, on drop rods | 1.0 x 0.3 x 0.1 | none (above 2.6 m) | 80 | P |
| `trenchGrating` | Cable trench grating, 1 m module | 1.0 x 1.0 x 0.03 | none (floor; the loud surface is the builder's) | 40 | P |

### A8 - The Strongroom (Victorian banking hall, security office, vault)
| Prop | Real object | Size | Collision | Tris | Status |
| --- | --- | --- | --- | --- | --- |
| `bankCounter` | Banking-hall counter module: panelled oak front, marble top, brass foot rail | 2.4 x 0.8 x 1.2 | builder 2.4 x 0.8 x 1.2 (low cover) | 300 | B1 |
| `vaultDoor` | Round vault door 2.2 m, 0.6 m thick, shown open on its hinge, in a square steel frame: locking bolts, spoked hand wheel, time-lock box on the back | frame 3.0 x 0.7 x 3.0; door 2.2 dia | builder: the frame jambs; the door is visual over the level builder's door (swing) | 900 | B1 |
| `bankGrille` | Public grille, brass bars 3 m, 1.5 m module | 1.5 x 0.08 x 3.0 | own (the maglocked gate) | 200 | P |
| `timeLockPanel` | Time-lock panel with a clock face and ready lamp | 0.5 x 0.15 x 0.7 | own (the sync terminal) | 100 | P |
| `lightingBoard` | Lighting distribution board with isolator handle | 1.2 x 0.3 x 1.8 | own (the isolator) | 150 | P |
| `depositWall` | Safe deposit box wall module | 1.2 x 0.6 x 2.4 | builder | 250 | P |
| `nightDesk` | The night desk (a securityDesk variant in oak) | 2.4 x 0.9 x 0.75 | builder | 400 | P |
| `cashCart` | Cash-in-transit trolley (exit dock) | 1.0 x 0.6 x 1.1 | builder | 150 | P |

## 4. First batch (B1)
Built by `scripts/facility-props/build.py`. Triangle counts are the build report's (`facility-props.json`); the
budgets are `PROP_TRI_BUDGET` in `facilityProps.ts`. Counts are filled in by the build (section 6).

## 5. Placement helper (`src/world/props/facilityProps.ts`)
Pure, no Babylon. A map builder lists prop placements (`PropPlacement`: prop, x, y, z, yaw, optional tint); the helper
snaps them (5 cm, yaw to 90 deg unless free), returns the world matrices for thin instances (`propMatrix`), the
world-space collision box each prop needs from the level builder (`propCollisionBox`, `null` for visual-only props),
rows of repeated props (`propRow`: racks, counters, mesh panels, vans) and a layout check (`checkPropLayout`: props
inside the set's box, no two footprints overlapping) so a dressing pass can be tested without a renderer. The
renderer (Babylon side, next step) reads the GLB through the operators' GLB reader as `kitRender.ts` does.

## 6. Build log and left to do
See the handback in STATE.md; the counts are written here after each build.
