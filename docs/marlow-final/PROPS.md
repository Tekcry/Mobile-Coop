# Marlow Yard - props kit (marlow-final M5 / A6)

The PROPS kit dresses the sets (mock-ups of real sites) and the instructor gallery. The ARCHITECTURE kit (wall panels,
glazing, sliding doors, LED coves, trims, columns, handrails) is a separate kit: `KIT.md`, `scripts/facility-kit/`,
`src/world/kit/`. Props never replace architecture pieces and never touch the level builder's collision.

Status (2026-10-23): batches B1 (13 props) and B2 (42 props, 0f) built: 55 props, 11420 triangles, GLB 760 KB
(section 4). Every prop in section 3 is built except `instructorFigure` (waits for the figure job). The placement
helper (`facilityProps.ts`), the renderer (`propRender.ts`), the `World` hook (`MapLayout.facilityProps`, section 5)
and their tests are in (11 tests pass). Not yet placed in any set (the slice builders' job, section 5).

## 1. Rules
- **Source.** In-repo Blender script only: `scripts/facility-props/build.py`, Blender 5.2.2 headless (`-b`), driven by
  `node scripts/facility-props/build.mjs`. No external art, no textures yet (factor-only materials; CC0 textures may
  come in the visual pass). Output: `src/world/props/assets/facility-props.glb` + `facility-props.json` (triangles,
  bounds and bytes per prop), bundled, no runtime network.
- **Format.** Same as the facility kit (`build_kit.py`): one GLB, one mesh per (prop, material) named
  `<prop>.<material>`, triangulated, flat-shaded hard surface (sharp over 30 deg), no UVs. The game renderer owns the
  look by material name (`PROP_LOOK` in `src/world/props/facilityProps.ts`) and draws one thin-instanced mesh per
  (prop, material), so a set of 40 racks is still one draw per material. (S9 perf: at run time every static opaque
  pair - not screens, lamps, mesh / glass or a door-driven leaf - is baked into one mesh per material across the whole
  map, `prop-static.<material>`; the 12-draw set budget stays as the authoring check. `slices/S9-perf.md`.)
- **Frame.** Game metres: +X right, +Y up, +Z the prop's front. Free-standing props: origin at the footprint centre on
  the floor (y 0). Wall-mounted props (monitor wall): back on the wall face at z 0, facing +z. Hung props
  (`PROP_HUNG`: galleryScreen, signPlate, pushStation, timeLockPanel, wicketBolt, cableTray): origin at the bottom edge
  on the mounting face (the cable tray: under its trapeze strut, centred on the run); the placement's `y` is the mount
  height. Yaw about +y as the kit
  (Babylon: local +z -> (sin yaw, 0, cos yaw)).
- **Collision.** Props are visual only (`collide: false`) over the level builder's collision boxes. Each prop with a
  gameplay footprint lists the boxes the map builder must place (`PROP_COLLISION` in `facilityProps.ts`; the placement
  helper returns them in world space and `writePropBoxes` writes them, so the builder writes the same boxes). Gameplay
  never reads prop meshes (hard rule). Two kinds of box (assumption PA1, below):
  - *solid*: an ordinary visible box set 1 cm inside the prop's skin. It is the greybox: collision, cover, ledges, nav,
    the canonical light shapes and the shadow casters, exactly as a greybox box; the prop hides it (a solid box never
    pokes out of the drawn prop: tested), and `?gfx=min` shows it in `PROP_BOX_COLOR`. Consoles, counters, cabinets,
    van bodies, tanks, plinths, bund walls.
  - *see*: a collision-only box (`visible: false`) for open or see-through props (pallet racking, welded mesh, a van's
    underframe, a machine's envelope round its radiators or motor). It stops movement, bullets and guard sight; light
    passes it in the bake, the meter and the picture alike (props cast no shadows), so light parity holds, as the
    kit's glass. It gives no cover and no ledge (the cover and ledge passes skip invisible boxes).
  Ledge flags are the builder's: racks, vans, transformers, cooling units, kiosks and the cage top are `noLedge`
  (ROUTE-DRAFT risk 7). A prop stands at most 5 cm proud of its box (the kit's skin rule: never into the 0.3 m capsule
  standoff); anything further out (a van's buffers, a pump's pipe flange) is listed as an overhang (`PROP_OVERHANG`)
  and sits where no player can stand.
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
| `glass` | vitrine hood, kit case fronts (alpha 0.2; B2) |
| `leather` | lounge seats (dark cognac; B2) |
| `foliage` | green wall planting (B2) |
| `ballast` | track ballast (B2) |
| `red` | RAL 3020 traffic red: barrier arm bands, buffer stop, push and isolator buttons, rescue box (B2) |
| `white` | signal white: barrier bands, office and dispatch tops, labels, paper, card model, cooling unit (B2) |
| `screen` | screen faces (emissive, tinted per instance; dark when its device is off) |
| `lamp` | status / ready LEDs and beam lenses (emissive, tinted per instance) |

(S3-7 S1, light parity) A placement's `screen` and `lamp` follow its circuit (`group`: dim while no lamp of the group is on) or its powered device (`device`: the beam towers' lenses follow their laser, dark while the beams are off or jammed). Every lit prop in a set carries one; the only exception is `PROP_OWN_SUPPLY` (push station).

## 3. Prop list per set
Size = W x D x H in metres (W along local x, D along local z, H up; the built size, from the build report). Collision:
"builder" = the level builder places the listed boxes (`PROP_COLLISION`; props are visual over them); "none" = no
gameplay footprint (wall-hung, floor-flush or above head height); "own" = the prop is a device whose collision the
device code already owns. Tris = the build's count (budget in brackets, `PROP_TRI_BUDGET`). Status: B1 = first batch,
B2 = second batch (0f), P = planned. Hung props (marked "hung") have their origin at the bottom edge on the mounting
face; the placement's `y` is the mount height (section 1).

### Facility shell and instructor gallery (out of bounds, sight only; A5)
| Prop | Real object | Size | Collision | Tris | Status |
| --- | --- | --- | --- | --- | --- |
| `galleryConsole` | Instructor control desk module (2.4 m, runs end to end): cable spine, end panels, worktop, sloped control surface along the front, two desk monitors | 2.4 x 0.9 x 1.1 | none (out of bounds) | 176 (500) | B2 |
| `galleryChair` | High-back mesh task chair with a head pad on a five-star base | 0.59 x 0.68 x 1.2 | none | 336 (350) | B2 |
| `galleryScreen` | Wall-hung 86" display showing a set's camera feed (screen tinted per instance), hung | 1.95 x 0.06 x 1.15 | none | 24 (60) | B2 |
| `monitorWall` | Shared with A4: 3 x 3 video wall on a floor frame (the bridge copy shows the sets) | 3.7 x 0.35 x 2.6 | none on the bridge (out of bounds) | 332 (400) | B1 |
| `instructorFigure` | Seated static dressing figure (LANTERN's chair, two instructors) | - | none | - | P (needs the guard / figure avatar job) |
| `receptionDesk` | (no longer placed: the lounge became an armoury, walk 4.82 X5) Arrival lounge reception desk: marble-look visitor front, oak transaction top with a warm LED line under its lip, low staff worktop behind | 3.6 x 1.15 x 1.1 | builder: visitor front 3.58 x 0.38 x 1.09 + staff side 3.58 x 0.7 x 0.74 (solid) | 104 (300) | B2 |
| `loungeSeat` | (no longer placed, X5) Leather club armchair on a dark plinth | 0.85 x 0.85 x 0.8 | builder: base, two arms, back (solid; the seat stays open) | 200 (400) | B2 |
| `greenWall` | (no longer placed, X5) Living green wall module (1.2 m): planter trough, capping, planted mat, seeded leaf clumps | 1.2 x 0.2 x 3.0 | none (wall) | 252 (300) | B2 |
| `modelVitrine` | L7: white card scale model of A8 under a glass hood on a dark plinth | 2.0 x 1.2 x 1.1 | builder: plinth 1.98 x 1.18 x 0.74 (solid) + hood (see), `noLedge` | 204 (600) | B2 |
| `holdingBench` | Holding-room and armoury bench (two free-standing in the lounge), oak slab on brushed plate legs | 1.8 x 0.45 x 0.45 | builder 1.8 x 0.45 x 0.45 (see) | 68 (120) | B2 |
| `kitCaseWall` | Glass-fronted kit room module (the lounge armoury's weapons display cabinet: four in a row on the west wall): rifle cases standing, pistol cases on shelves, warm LED line (1.2 m) | 1.2 x 0.5 x 2.4 | builder 1.2 x 0.5 x 2.4 (see: glass front), `noLedge` | 216 (400) | B2 |
| `signPlate` | Set signage stand-in: dark plate with a backlit face (text waits for a texture, KIT.md 6), hung | 1.2 x 0.042 x 0.3 | none | 24 (60) | B2 |

The arrival lounge is an armoury (walk 4.82 X5, `dressLounge` in `facility.ts`): a weapons display cabinet of four `kitCaseWall` modules on the west wall (x 0.25, z 8.6-13.4, circuit 10), two hand-built locker banks on the south and north flats (x 1.0-4.6, z 8.25-8.75 and 13.25-13.75; 8 doors of 0.45 m, 1.9 m tall, 0.5 m deep; each one solid `noLedge` box plus thin visual skins for the doors, vents, handles and number plates, no props), and two free `holdingBench` props at (3.4, 9.5) and (3.4, 12.5), at least 0.5 m off every wall and locker face. The aisle from the spawns (2, 10) and (2, 12) to the door stays open.

### A1 - The Gate (lorry gate, goods-yard wall, wicket)
| Prop | Real object | Size | Collision | Tris | Status |
| --- | --- | --- | --- | --- | --- |
| `barrierPost` | Rising-arm lorry barrier: motor post, hub, 6 m arm down along +x in red and white bands | post 0.4 x 0.4 x 1.1, arm to x 6.24 at 1.0-1.08 m | builder post 0.38 x 0.38 x 1.09 (solid, `noLedge`); the arm is a listed overhang (visual) | 160 (250) | B2 |
| `checkerDesk` | Gate checker's booth desk with a monitor and an open logbook | 1.4 x 0.7 x 0.75 (monitor to 1.12) | builder 1.38 x 0.68 x 0.74 (solid, PA5) | 144 (250) | B2 |
| `bollard` | Steel lane bollard, yellow sleeve band | 0.21 dia x 1.0 | builder 0.12 x 0.12 x 0.99 inside the post (solid, `noLedge`) | 56 (80) | B2 |
| `wicketBolt` | Heavy tower bolt with staples, knob and keep, hung on the wicket's yard face | 0.41 x 0.06 x 0.1 | none (door's) | 80 (100) | B2 |

### A2 - Carriage Shed (night freight siding)
| Prop | Real object | Size | Collision | Tris | Status |
| --- | --- | --- | --- | --- | --- |
| `boxVan` | Covered goods van: planked body, curved roof, steel stanchions and braces, sliding doors, underframe, two wheelsets, buffers | 10.0 x 2.62 x 3.4 over buffers (body 9.1) | builder: body box 9.08 x 2.52 x 1.13-3.11 (solid) + underframe 9.3 x 2.5 x 1.13 (see), `noLedge`; buffers and roof are overhangs | 944 (1200) | B1 |
| `trackPanel` | Rail road module set flush in the shed floor (PB1): ballast strip, sleeper tops, two rails at standard gauge (10 m) | 10 x 2.6 x 0.02 | none (floor); a van on it stands at `TRACK_RAIL_TOP` (0.02) | 204 (300) | B2 |
| `bufferStop` | Rail-built buffer stop: red headstock, two buffers facing the train (+z), posts, raking struts and sills | 2.6 x 1.4 x 1.25 | builder 2.6 x 1.4 x 1.25 (see: an open rail frame), `noLedge` | 212 (300) | B2 |
| `pushStation` | Lighting push station: grey wall cabinet, red ISOLATE mushroom button, label, status lamp, hung | 0.6 x 0.34 x 1.0 | own (the isolator device) | 72 (150) | B2 |
| `permitGate` | Padlocked permit-to-work tube gate with a permit tag | 1.0 x 0.08 x 1.1 | builder 1.0 x 0.1 x 1.1 (see; the stair's block) | 120 (160) | B2 |

### A3 - Office Range (commercial office corridor)
| Prop | Real object | Size | Collision | Tris | Status |
| --- | --- | --- | --- | --- | --- |
| `officeDesk` | Bench desk: white top, closed end panels, modesty panel, monitor, keyboard, mouse | 1.6 x 0.8 x 0.75 (monitor to 1.2) | builder 1.54 x 0.74 x 0.74 (solid, PA5) | 120 (250) | B2 |
| `officeChair` | Task chair (the gallery chair, low back, no head pad) | 0.59 x 0.65 x 0.98 | none (small) | 324 (350) | B2 |
| `filingCabinet` | Four-drawer steel filing cabinet | 0.47 x 0.63 x 1.32 | builder 0.45 x 0.59 x 1.31 (solid) | 96 (120) | B2 |
| `cleanerTrolley` | Cleaner's trolley: base on castors, handle frame, yellow mop bucket with wringer and mop, black bin bag | 1.1 x 0.5 x 1.0 | builder 1.1 x 0.5 x 1.0 (see) | 248 (300) | B2 |

### A4 - Goods Shed (port warehouse and its security room)
| Prop | Real object | Size | Collision | Tris | Status |
| --- | --- | --- | --- | --- | --- |
| `monitorWall` | Security office video wall: 3 x 3 55" screens on a floor-standing frame, plinth with cable trunking | 3.7 x 0.35 x 2.6 | builder: plinth 3.68 x 0.34 x 0.47 + frame 3.68 x 0.105 to 2.59 behind the screens (solid, against the wall) | 332 (400) | B1 |
| `securityDesk` | Security operator console: worktop on a cable-managed carcass, three desk monitors, keyboard, joystick, phone | 2.4 x 0.9 x 0.75 (monitors to 1.24) | builder 2.38 x 0.88 x 0.74 (solid); the console device owns its use point | 304 (500) | B1 |
| `palletRackBay` | One bay of wide-aisle pallet racking: the frame at its -x end (uprights, lacing, foot plates), beams at 1.5 / 3.0 / 4.5 m, 2 pallets on the floor and per level (cartons or stretch wrap, seeded; one top slot empty) | 2.7 x 1.1 x 5.4 (frame pitch 2.7) | builder 2.7 x 1.1 x 5.4 (see), `noLedge` | 648 (700) | B1 |
| `palletRackEnd` | The closing frame at a racking row's far end (`propRow` adds it) | 0.1 x 1.14 x 5.4 | none (inside the last bay's box) | 156 (200) | B1 |
| `palletLoad` | Floor pallet (1.2 x 1.0) with a stretch-wrapped load | 1.2 x 1.0 x 1.4 | builder 1.18 x 0.98 x 1.39 (solid) | 60 (120) | B2 |
| `palletLoadLow` | The same at 1.2 m: low cover | 1.2 x 1.0 x 1.2 | builder 1.18 x 0.98 x 1.19 (solid) | 60 (120) | B2 |
| `dispatchDesk` | Dispatch counter: white top, drawer lines, label printer and label, kettle, two mugs | 1.8 x 0.72 x 0.9 (kettle to 1.14) | builder 1.78 x 0.68 x 0.89 (solid) | 140 (250) | B2 |
| `reachTruck` | Parked reach truck, forks down toward +x: yellow chassis, seat and console, overhead guard with an amber beacon, mast, carriage, forks, reach legs | 2.6 x 1.3 x 2.3 | builder: chassis 1.48 x 1.28 x 0.99 (solid) + envelope 2.6 x 1.3 x 2.3 (see), `noLedge` | 248 (900) | B2 |

### A5 - Substation (urban grid substation, indoor switchgear hall)
| Prop | Real object | Size | Collision | Tris | Status |
| --- | --- | --- | --- | --- | --- |
| `transformer` | 33/11 kV transformer: tank, radiator banks on two sides, HV and LV bushings, conservator, marshalling box, in a 1.2 m concrete oil bund | bund 6.0 x 5.0 x 1.2; unit 3.6 x 2.8 x 3.5 | builder: 4 bund walls (1.2 m low cover, solid) + tank box (solid) + unit envelope 3.6 x 2.8 x 3.5 (see), all `noLedge` | 912 (1200) | B1 |
| `beamTower` | IR beam tower: square aluminium column, IR-pass windows front and back with three lens heads each, hood cap, base plate | 0.26 x 0.26 x 2.4 | builder 0.16 x 0.16 x 2.39 (solid, thin pole: sight passes beside it) | 164 (200) | B1 |
| `zoneKiosk` | Zone control kiosk: grey pedestal cabinet on a plinth, keypad, small display, three status lamps | 0.8 x 0.52 x 1.5 | own (the zone release) | 116 (150) | B2 |
| `switchgearPanel` | One 11 kV switchgear panel (0.8 m line-up module): relay door with window and lamps, breaker door with a red mimic line, cable door | 0.8 x 1.62 x 2.3 | builder 0.79 x 1.56 x 2.29 (solid, `noLedge`; runs: `propRow`) | 144 (200) | B2 |
| `cableDrum` | Timber cable drum on its side, axis along z | 1.8 dia x 1.1 | builder: inside the cable 0.84 x 1.08 x 0.84 (solid) + envelope 1.8 x 1.1 x 1.8 (see), `noLedge` | 180 (250) | B2 |

### A6 - Pump House (tidal barrier pumping station)
| Prop | Real object | Size | Collision | Tris | Status |
| --- | --- | --- | --- | --- | --- |
| `pumpUnit` | Vertical mixed-flow pump set on a 1.2 m concrete plinth: discharge head and stub with its flange, motor stool, coupling guard, motor with fan cowl, terminal box, lifting eyes | plinth 2.4 x 2.4 x 1.2; unit to 4.0 | builder plinth (low cover, solid) + pump column 0.64 x 0.64 (solid) + motor envelope 1.2 x 1.2 to 4.0 (see), `noLedge` | 500 (900) | B1 |
| `meshPanel` | Welded-mesh partition panel (machine guard / cage): galvanised half posts and rails, 1.2 m solid kick panel, mesh above | 1.5 x 0.05 x 2.4 | builder 1.5 x 0.05 x 2.4 (see: the cage wall; G45) | 84 (120) | B1 |
| `driveCabinet` | Variable-speed drive cabinet: two doors, door HMI screen, status lamps, vent grilles | 1.2 x 0.63 x 2.0 | own (the hack terminal) | 156 (200) | B2 |
| `davitBox` | Confined-space rescue kit box: red body and lid, label, latches | 0.82 x 0.53 x 0.6 | own (the rope anchor) | 92 (100) | B2 |
| `glandPlate` | Floor cable gland plate: two glands, yellow lifting-point sign | 0.6 x 0.6 x 0.03 | own (the hang-down anchor) | 64 (80) | B2 |
| `pipeRun` | DN600 discharge pipe, 1 m module with half flanges (modules join flange to flange), on a saddle | 1.0 x 0.7 x 0.68 | builder: inside the pipe 0.98 x 0.4 x 0.4 (solid) + envelope 1.0 x 0.7 x 0.7 (see), `noLedge` | 120 (160) | B2 |

### A7 - Data Hall (colocation hall and two-person cage)
| Prop | Real object | Size | Collision | Tris | Status |
| --- | --- | --- | --- | --- | --- |
| `serverRack` | 42U server cabinet: perforated front door, side panels, top cable entry, blanking, status LEDs on the servers | 0.6 x 1.2 x 2.2 | builder 0.58 x 1.14 x 2.19 per rack, behind the door (solid), `noLedge` | 260 (300) | B1 |
| `meshPanel` | The cage walls (shared with A6) | 1.5 x 0.05 x 2.4 | builder | 84 (120) | B1 |
| `coolingUnit` | Downflow computer-room air handler: white cabinet, return-air grille, panel lines, controller screen | 1.8 x 0.9 x 2.0 | builder 1.78 x 0.86 x 1.99 (solid), `noLedge` | 72 (200) | B2 |
| `cableTray` | Overhead wire cable basket, 1 m module, on a trapeze strut with drop-rod stubs, hung | 1.0 x 0.38 x 0.5 | none (above 2.6 m) | 96 (120) | B2 |
| `trenchGrating` | Cable trench grating, 1 m module: galvanised frame round a grating | 1.0 x 1.0 x 0.03 | none (floor; the loud surface is the builder's) | 60 (80) | B2 |

### A8 - The Strongroom (Victorian banking hall, security office, vault)
| Prop | Real object | Size | Collision | Tris | Status |
| --- | --- | --- | --- | --- | --- |
| `bankCounter` | Banking-hall counter module: panelled oak front (three raised panels), dark plinth, marble top, brass foot rail | 2.4 x 0.9 x 1.2 (rail 9 cm out) | builder 2.38 x 0.74 x 1.19 (low cover, solid) | 264 (300) | B1 |
| `vaultDoor` | Strongroom door frame (rectangular, as Victorian strongrooms; assumption PA3): heavy steel surround, threshold, bright reveal, hinge knuckles, maker's plate | 2.4 x 0.7 x 2.8; opening 1.4 x 2.2 | builder: two jambs + head (solid, `noLedge`); the opening is a level `Door` (`vaultDoorProps`) | 288 (400) | B1 |
| `vaultLeaf` | The door leaf, 0.5 m thick: face slab, stepped plug, five locking bolts, spoked brass wheel, dial, name plate, time-lock box with a ready lamp, hinge arms; turns about the hinge by its `Door` | 1.4 x 0.5 x 2.2 | none (the `Door` anchor's) | 480 (600) | B1 |
| `bankGrille` | Public grille, 1.5 m module of brass bars: stiles, three rails, ten bars, 3 m | 1.5 x 0.08 x 3.0 | own (the maglocked gate) | 180 (200) | B2 |
| `timeLockPanel` | Time-lock panel: dark case, brass bezel, white clock face with hands, amber ready lamp, hung | 0.5 x 0.15 x 0.7 | own (the sync terminal) | 136 (160) | B2 |
| `lightingBoard` | Lighting distribution board against the wall: two doors, red rotary isolator on a yellow plate, indicator lamps | 1.2 x 0.33 x 1.8 | own (the isolator) | 96 (150) | B2 |
| `depositWall` | Safe deposit box wall module: dark carcass, brass door field ruled into boxes | 1.2 x 0.59 x 2.4 | builder 1.19 x 0.56 x 2.39 (solid, `noLedge`) | 180 (250) | B2 |
| `nightDesk` | The night desk (the securityDesk console in oak) | 2.4 x 0.9 x 0.75 | builder 2.38 x 0.88 x 0.74 (solid) | 304 (400) | B2 |
| `cashCart` | Cash-in-transit trolley: closed steel box on a chassis and castors, push handle at -x | 1.0 x 0.6 x 1.1 | builder: the box (solid) + chassis (see) | 140 (200) | B2 |

## 4. First batch (B1)
Built by `scripts/facility-props/build.py` (`npm run props:build`, about 10 s). Triangle counts are the build
report's (`src/world/props/assets/facility-props.json`); budgets are `PROP_TRI_BUDGET` in `facilityProps.ts` and the
test holds every prop under its budget. Prototype look: hard-surface boxes, cylinders and prisms with 1-3 cm chamfers
where light catches an edge, factor-only materials, no textures.

| Prop | Set | Materials (triangles) | Total | Budget |
| --- | --- | --- | --- | --- |
| `monitorWall` | A4, gallery | steelDark 80, plastic 120, screen 108, lamp 24 | 332 | 400 |
| `securityDesk` | A4 (A8 `nightDesk` later) | steelDark 44, steel 36, plastic 176, screen 36, lamp 12 | 304 | 500 |
| `serverRack` | A7 | steelDark 128, plastic 36, lamp 72, mesh 12, steel 12 | 260 | 300 |
| `palletRackBay` | A4 | rackBlue 24, galv 132, rackOrange 72, timber 336, wrap 36, cardboard 48 | 648 | 700 |
| `palletRackEnd` | A4 | rackBlue 24, galv 132 | 156 | 200 |
| `boxVan` | A2 | vanBody 36, vanRoof 20, iron 888 | 944 | 1200 |
| `transformer` | A5 | concrete 72, transformer 484, porcelain 168, galv 164, steel 12, safety 12 | 912 | 1200 |
| `pumpUnit` | A6 | concrete 44, iron 12, pumpPaint 356, safety 36, steelDark 52 | 500 | 900 |
| `meshPanel` | A6, A7 | galv 60, steel 12, mesh 12 | 84 | 120 |
| `bankCounter` | A8 | oak 156, iron 12, marble 44, brass 52 | 264 | 300 |
| `vaultDoor` | A8 | iron 156, steel 120, brass 12 | 288 | 400 |
| `vaultLeaf` | A8 | iron 68, steel 208, brass 192, lamp 12 | 480 | 600 |
| `beamTower` | A5 | galv 56, plastic 36, lamp 72 | 164 | 200 |

One of each: 5336 triangles, 13 props, GLB 333 KB (positions and normals, no UVs). Per set, B1 is far under the 60 k
/ 12 draw budget (a 40-rack data hall: 10.4 k triangles, 5 draws; a 12-bay racking aisle: 7.9 k, 8 draws).
A1 (The Gate) and A3 (Office Range) had no B1 prop: their props are batch B2.

### Second batch (B2, slice 0f)
Same builder, rules and look; batch 1's meshes are unchanged (the green wall draws from its own seeded generator so the
racking loads stay as built). Collision, footprint, pitch and box colour of each are in `facilityProps.ts`.

| Prop | Set | Materials (triangles) | Total | Budget |
| --- | --- | --- | --- | --- |
| `galleryConsole` | gallery | steelDark 92, plastic 60, screen 24 | 176 | 500 |
| `galleryChair` | gallery | steelDark 268, fabric 56, mesh 12 | 336 | 350 |
| `galleryScreen` | gallery | plastic 12, screen 12 | 24 | 60 |
| `receptionDesk` | none (was the lounge) | steelDark 24, marble 12, oak 56, lamp 12 | 104 | 300 |
| `loungeSeat` | none (was the lounge) | steelDark 12, leather 188 | 200 | 400 |
| `greenWall` | none (was the lounge) | steelDark 48, foliage 204 | 252 | 300 |
| `modelVitrine` | L7 | steelDark 92, white 60, oak 12, brass 28, glass 12 | 204 | 600 |
| `holdingBench` | holding rooms, the lounge | oak 44, steel 24 | 68 | 120 |
| `kitCaseWall` | lounge | steelDark 96, plastic 96, lamp 12, glass 12 | 216 | 400 |
| `signPlate` | set doors | steelDark 12, lamp 12 | 24 | 60 |
| `barrierPost` | A1 | steel 40, red 60, white 60 | 160 | 250 |
| `checkerDesk` | A1 | steel 48, plastic 72, screen 12, white 12 | 144 | 250 |
| `bollard` | A1 | steelDark 28, safety 28 | 56 | 80 |
| `wicketBolt` | A1 | iron 48, steel 32 | 80 | 100 |
| `trackPanel` | A2 | ballast 12, timber 168, iron 24 | 204 | 300 |
| `bufferStop` | A2 | red 12, iron 200 | 212 | 300 |
| `pushStation` | A2 | steel 12, red 36, white 12, lamp 12 | 72 | 150 |
| `permitGate` | A2 | safety 96, brass 12, white 12 | 120 | 160 |
| `officeDesk` | A3 | white 12, steel 36, plastic 60, screen 12 | 120 | 250 |
| `officeChair` | A3 | steelDark 268, fabric 44, mesh 12 | 324 | 350 |
| `filingCabinet` | A3 | steel 12, plastic 84 | 96 | 120 |
| `cleanerTrolley` | A3 | plastic 148, galv 56, safety 44 | 248 | 300 |
| `palletLoad` | A4 | timber 48, wrap 12 | 60 | 120 |
| `palletLoadLow` | A4 | timber 48, wrap 12 | 60 | 120 |
| `dispatchDesk` | A4 | steel 12, white 64, plastic 64 | 140 | 250 |
| `reachTruck` | A4 | safety 68, plastic 24, steelDark 144, lamp 12 | 248 | 900 |
| `zoneKiosk` | A5 | steelDark 12, steel 44, plastic 12, screen 12, lamp 36 | 116 | 150 |
| `switchgearPanel` | A5 | steel 48, plastic 48, red 12, lamp 36 | 144 | 200 |
| `cableDrum` | A5 | timber 120, plastic 60 | 180 | 250 |
| `driveCabinet` | A6 | steelDark 12, steel 36, plastic 60, screen 12, lamp 36 | 156 | 200 |
| `davitBox` | A6 | red 56, white 12, steelDark 24 | 92 | 100 |
| `glandPlate` | A6 | galv 12, safety 12, steelDark 40 | 64 | 80 |
| `pipeRun` | A6 | pumpPaint 108, steelDark 12 | 120 | 160 |
| `coolingUnit` | A7 | white 12, plastic 48, screen 12 | 72 | 200 |
| `cableTray` | A7 | galv 60, mesh 36 | 96 | 120 |
| `trenchGrating` | A7 | galv 48, mesh 12 | 60 | 80 |
| `bankGrille` | A8 | brass 180 | 180 | 200 |
| `timeLockPanel` | A8 | iron 36, brass 44, white 44, lamp 12 | 136 | 160 |
| `lightingBoard` | A8 | steel 12, plastic 36, safety 12, red 12, lamp 24 | 96 | 150 |
| `depositWall` | A8 | iron 168, brass 12 | 180 | 250 |
| `nightDesk` | A8 | oak 80, plastic 176, screen 36, lamp 12 | 304 | 400 |
| `cashCart` | A8 | steelDark 128, steel 12 | 140 | 200 |

B2: 42 props, 6084 triangles. Kit total: 55 props, 11420 triangles, GLB 760 KB. Budgets raised over section 3's first
guesses where a believable mesh needed it (bollard 40 -> 80, wicket bolt 60 -> 100, filing cabinet 80 -> 120, gland
plate 40 -> 80, trench grating 40 -> 80, cable tray 80 -> 120, pipe run 120 -> 160, time lock 100 -> 160, permit gate
120 -> 160, barrier 200 -> 250, office chair 300 -> 350, cash cart 150 -> 200); every built prop is under its budget.
Draws: a dressed A3 office range (desks, chairs, filing cabinets, a trolley) is 12 draws (tested). A4 with every A4
prop is 26 draws (section 6, left to do).

## 5. Placement helper (`src/world/props/facilityProps.ts`)
Pure, no Babylon. A map builder lists prop placements (`PropPlacement`: prop, x, y, z, yaw, optional screen `tint`
and `lamp` colours, `free` yaw, `door` for the vault leaf); the helper snaps them (x, z 5 cm, y 1 cm, yaw to 90 deg
unless `free`), returns the world matrices for thin instances (`propMatrix`), the world-space collision boxes each
prop needs from the level builder (`propCollisionBox`, `null` for visual-only props) and writes them
(`writePropBoxes`), lays rows of repeated props (`propRow`: racks, counters, mesh panels, vans; a racking row gets its
closing frame), and checks a layout (`checkPropLayout`: drawn footprints inside the set's box, no two props' gameplay
boxes overlapping where their heights overlap, and with the build report the set's triangle and draw budget). The
renderer `propRender.ts` (`PropRender`) reads the GLB through the operators' GLB reader as `kitRender.ts` does.

```ts
import { FacilityProps } from '../props/facilityProps';
const props = new FacilityProps();
props.row('serverRack', x1, z1, x2, z2, { flip });          // whole 0.6 m modules centred on the line, fronts left of the walk
props.row('palletRackBay', x1, z1, x2, z2);                  // 2.7 m bays + the closing frame
props.add('securityDesk', x, z, yaw, { y });                // one prop; returns its index (the renderer's handle)
props.add('monitorWall', x, z, yaw);                         // back on the wall face, facing +z
const v = props.vault(x, z, yaw);                            // strongroom frame + leaf; v.anchor: the Door to add
const door = b.door(v.anchor.hx, v.anchor.hy, v.anchor.hz, v.anchor.width, v.anchor.yaw,
  { height: v.anchor.height, swing: v.anchor.swing, leaf: 'slide', locked: true });
props.placements[v.leaf]!.door = door.id;
props.write(b);                                              // the gameplay boxes into the LevelBuilder
expect(props.check({ x0, z0, x1, z1 }, report)).toEqual([]); // in the map's test
return { /* ... */, facilityProps: props.placements };     // the map's layout: World draws them
// a device state: world.facilityProps?.setTint(index, screenRgb, lampRgb)
```

Integration notes for the slice builders:
- The hook (0f): a map returns its placements as `MapLayout.facilityProps` (`src/world/mapDef.ts`; `MapLayout.props`
  is the older dynamic prop system's, so the props kit uses its own field, PA7). `World.create` starts
  `PropRender.create(scene, layout.facilityProps, w.doors.list)` right after `KitRender` (skipped on `?gfx=min`, the
  cheap path, and when the list is empty; on a load failure it warns `[props]` and the boxes show), keeps it as
  `world.facilityProps` and disposes it with the world. Render only: gameplay reads the boxes `props.write(b)` wrote.
- A van on `trackPanel` stands at `y: TRACK_RAIL_TOP` (0.02). Hung props take their mount height as `y`.
- Write the boxes with `props.write(b)` before the level is built (cover, ledges, nav and the light bake read them).
- The vault leaf: `leaf: 'slide'` makes `Doors` draw no leaf of its own; `PropRender` turns `vaultLeaf` by the door's
  drawn swing (`leafFraction` x `DOOR.openAngle`, outward to the frame's +z face, `swing: -1`). The door's collision,
  light, sight and lock stay the door system's. Side effect (assumption PA6): `leaf: 'slide'` also gives the vault
  the sliding door's rules (`doorPeek.ts` `isSlideDoor`: no crack peek, no stick open, open from the menu only),
  which suits a strongroom door. Only `vaultLeaf` follows a door; other props ignore `door`.
- Screens and lamps that show a device state: keep the placement's index and call `setTint` on a state change
  (allocation-free). A dark screen is `[0, 0, 0]`.

## 6. Build log and left to do

### Build log
- 2026-10-23 (props agent, after the account swap): reviewed the cut-off agent's `build.py` against this file and the
  kit's builder; built B1 headless (Blender 5.2.2 `-b`, seed 1015), 13 props, 5336 triangles, 333 KB, 8-24 s.
  Fixes to `build.py`: racking beams moved to 1.5 / 3.0 / 4.5 so the top loads stay under the 5.4 m frame (they
  stood to 5.66), foot plates trimmed to the 5 cm skin rule; the vault's bright reveal was one plate across the whole
  opening (now three strips round it); the vault leaf reworked to turn about the frame's hinge knuckles (it was hinged
  on its own edge, clear of the knuckles); server faces and LED lines moved forward so the rack's box sits behind
  them (6 LED lines, under budget); video wall posts as deep as the screen backs; pump coupling guard and terminal
  box, beam tower base and bank counter plinth and foot rail fitted to their boxes; `build.mjs` added (mirrors the
  kit's; `--only a,b` builds a subset into `build/` only).
- Checks: `npx tsc --noEmit` clean; `npx eslint src/world/props tests/facilityProps.test.ts` clean;
  `npx vitest run tests/facilityProps.test.ts` NOT RUN TO A RESULT: twice the worker was killed (300 s, 900 s) while still importing on the loaded desktop (10 tests collected, 0 run); rerun on the laptop test runner. No GPU look check yet.
- 2026-10-23 (0f props agent, batch 2): the "import" hang was not load. `propRow` looped forever on any
  `palletRackBay` row: it iterated `out` while pushing the closing frame into it, and each pushed `palletRackEnd` found
  no frame past it and pushed another (the worker ran until killed; vitest reports the time as import). Fixed: the
  frames are found over a copy of the bays. The test's frame list also compared -0 with 0 (fixed). Then built B2
  headless (Blender 5.2.2 `-b`, seed 1015, 4 s): 42 props, 6084 triangles; B1 counts unchanged. `build.py`: six
  materials (`glass`, `leather`, `foliage`, `ballast`, `red`, `white`), `box` takes corners in any order,
  `security_desk` takes its materials (the oak `nightDesk`). The `World` hook added (section 5). Tests: a batch 2 case
  (hung props on their face, the van on the rail top, at most 6 materials a prop, a dressed A3 office range passes
  `checkPropLayout` at 12 draws).
- Checks (0f): `npx vitest run tests/facilityProps.test.ts` 11 / 11 pass (1.4 s, desktop); `npx eslint src/world/props
  tests/facilityProps.test.ts src/world/mapDef.ts src/world/world.ts` clean; `npx tsc --noEmit` no error in these
  files (84 errors elsewhere, all in tests that import `ctcourse.ts` exports the 0d rewrite is changing). No GPU look
  check yet.

### Assumptions (logged, Michael asleep)
- PA1 Solid boxes 1 cm inside the skin (visible greybox under the prop) and `see` boxes (collision-only) for open
  props, instead of one box per prop as section 3 first said: a visible box at full size would draw over the prop and
  z-fight its faces; an invisible one gives no cover and no light shape. Undo: change `PROP_COLLISION`.
- PA2 Pallet racking, the van's underframe and machine envelopes are `see` boxes: light passes them (no shadow in the
  bake or the picture: they agree), guards cannot see through them (physics rays). If racking must shadow, add solid
  boxes round the load stacks.
- PA3 The strongroom door is rectangular (1.4 x 2.2 opening in a 2.4 x 2.8 frame), not round: Victorian strongroom
  doors were rectangular, and the game's `Door` is a rectangle (collision, light, sight). Undo: a round leaf over the
  same rectangle.
- PA4 Heights snap to 1 cm (x and z to 5 cm): props stand on mezzanines and plinths whose tops are not on the 5 cm grid.
- PA5 The security desk's knee space is inside its solid box (it reads as a modesty panel in `PROP_BOX_COLOR`).
- PA6 The vault's `Door` uses `leaf: 'slide'` only so `Doors` draws no leaf of its own; it therefore takes the
  slide-door rules (no peek, no stick open). Undo: a `leaf: 'none'` (or `'prop'`) value on `Door` that only hides the
  drawn leaf (engine change, see left to do).
- PA7 (0f) The hook is `MapLayout.facilityProps` / `world.facilityProps`, not `props` as section 5 first said:
  `MapLayout.props` and `World.props` already belong to the dynamic prop system (`world/props.ts`). Undo: rename both.
- PB1 (0f) `trackPanel` is track set flush in the shed floor (rail heads 2 cm proud, sleeper tops and ballast strip
  flush), not a raised ballast bed: batch 1's van stands its wheels on y 0 as in real carriage sheds, and a raised bed
  with no collision would sink players' feet 0.2 m. Undo: a raised variant plus a solid bed box and the van at its rail
  top.
- PB2 (0f) Glass-fronted or open props are `see` boxes (kit case wall, vitrine hood, bench, buffer stop, permit gate,
  cleaner's trolley, the truck's and the drum's envelopes): a solid box would show through the glass or the frame.
  They give no cover; the reach truck chassis, the drum's core, the pipe and the cash box keep a solid box inside.
- PB3 (0f) Tall plant and furniture are `noLedge` (switchgear, cooling unit, deposit wall, kit case wall, vitrine,
  reach truck, drum, pipe, bollard, barrier post), as ROUTE-DRAFT risk 7 did for racks and plant. Undo: drop the flag
  in `PROP_COLLISION`.
- PB4 (0f) Device-owned props (`pushStation`, `zoneKiosk`, `driveCabinet`, `davitBox`, `glandPlate`, `bankGrille`,
  `timeLockPanel`, `lightingBoard`) carry no boxes (`null`): the device code owns their collision, as section 3 says.
  Their screens and lamps take the device state through `setTint`.
- PB5 (0f) `signPlate` stands in for the set signs: a backlit plate with no text (no textures yet); the name comes with
  a texture or kit piece later (KIT.md 6).

### Left to do
- Integration (slice builders): each set's dressing pass (`props.write(b)`, `facilityProps: props.placements` in the
  layout) with `checkPropLayout` in its map test; the devices call `setTint` on their props' screens and lamps.
- A4 draws: every A4 prop together is 26 draws, over the 12-draw set budget. Either check the security room and the
  warehouse floor as separate areas (each fits), or leave props out; decide in the A4 dressing pass.
- `instructorFigure` waits for the guard / figure avatar job (N14).
- Door-driven props: `PropRender` swings only `vaultLeaf` (hinged). A prop tied to a real sliding door would have to
  translate like `kitRender`'s leaves (`leafAlong` / `slideFraction`), not swing: not built, no prop needs it yet. If
  the vault should keep the hinged door's peek and stick open, add a `Door.leaf` value that only hides the drawn leaf
  (`doors.ts`, `doorPeek.ts` `isSlideDoor` unchanged) and switch `vaultDoorProps` to it.
- GPU look check and perf per set on the laptop (Character Build): contact sheet of the 55 props under the baked lamps.
- Polish list (not now): CC0 textures in the visual pass; seeded variety of the racking loads (one bay variant
  today); planked-body detail on the van.
