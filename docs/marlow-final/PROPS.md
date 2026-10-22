# Marlow Yard - props kit (marlow-final M5 / A6)

The PROPS kit dresses the sets (mock-ups of real sites) and the instructor gallery. The ARCHITECTURE kit (wall panels,
glazing, sliding doors, LED coves, trims, columns, handrails) is a separate kit: `KIT.md`, `scripts/facility-kit/`,
`src/world/kit/`. Props never replace architecture pieces and never touch the level builder's collision.

Status (2026-10-23): first batch B1 built (13 meshes, 5336 triangles, GLB 333 KB; section 4), the placement helper
(`facilityProps.ts`), the renderer (`propRender.ts`) and their tests are in. Not yet placed in any set (the slice
builders' job, section 5). The rest of the list is planned, not built.

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
| `monitorWall` | Shared with A4: 3 x 3 video wall on a floor frame (the bridge copy shows the sets) | 3.7 x 0.35 x 2.6 | none on the bridge (out of bounds) | 400 | B1 |
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
| `boxVan` | Covered goods van: planked body, curved roof, steel stanchions and braces, sliding doors, underframe, two wheelsets, buffers | 10.0 x 2.62 x 3.4 over buffers (body 9.1) | builder: body box 9.08 x 2.52 x 1.13-3.11 (solid) + underframe 9.3 x 2.5 x 1.13 (see), `noLedge`; buffers and roof are overhangs | 1200 | B1 |
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
| `monitorWall` | Security office video wall: 3 x 3 55" screens on a floor-standing frame, plinth with cable trunking | 3.7 x 0.35 x 2.6 | builder: plinth 3.68 x 0.34 x 0.47 + frame 3.68 x 0.105 to 2.59 behind the screens (solid, against the wall) | 400 | B1 |
| `securityDesk` | Security operator console: worktop on a cable-managed carcass, three desk monitors, keyboard, joystick, phone | 2.4 x 0.9 x 0.75 (monitors to 1.24) | builder 2.38 x 0.88 x 0.74 (solid); the console device owns its use point | 500 | B1 |
| `palletRackBay` | One bay of wide-aisle pallet racking: the frame at its -x end (uprights, lacing, foot plates), beams at 1.5 / 3.0 / 4.5 m, 2 pallets on the floor and per level (cartons or stretch wrap, seeded; one top slot empty) | 2.7 x 1.1 x 5.4 (frame pitch 2.7) | builder 2.7 x 1.1 x 5.4 (see), `noLedge` | 700 | B1 |
| `palletRackEnd` | The closing frame at a racking row's far end (`propRow` adds it) | 0.1 x 1.14 x 5.4 | none (inside the last bay's box) | 200 | B1 |
| `palletLoad` | Floor pallet with a stretch-wrapped load | 1.2 x 1.0 x 1.4 | builder 1.2 x 1.0 x 1.4 (low cover at 1.2 needs the 1.2 variant) | 120 | P |
| `dispatchDesk` | Dispatch desk with a label printer and a kettle counter | 1.8 x 0.7 x 0.9 | builder | 250 | P |
| `reachTruck` | Parked reach truck, forks down | 2.6 x 1.3 x 2.3 (mast to 2.3) | builder | 900 | P |

### A5 - Substation (urban grid substation, indoor switchgear hall)
| Prop | Real object | Size | Collision | Tris | Status |
| --- | --- | --- | --- | --- | --- |
| `transformer` | 33/11 kV transformer: tank, radiator banks on two sides, HV and LV bushings, conservator, marshalling box, in a 1.2 m concrete oil bund | bund 6.0 x 5.0 x 1.2; unit 3.6 x 2.8 x 3.5 | builder: 4 bund walls (1.2 m low cover, solid) + tank box (solid) + unit envelope 3.6 x 2.8 x 3.5 (see), all `noLedge` | 1200 | B1 |
| `beamTower` | IR beam tower: square aluminium column, IR-pass windows front and back with three lens heads each, hood cap, base plate | 0.26 x 0.26 x 2.4 | builder 0.16 x 0.16 x 2.39 (solid, thin pole: sight passes beside it) | 200 | B1 |
| `zoneKiosk` | Zone control kiosk: pedestal cabinet with keypad and status lamps | 0.8 x 0.5 x 1.5 | own (the zone release) | 150 | P |
| `switchgearPanel` | One 11 kV switchgear panel (0.8 m module) in a line-up | 0.8 x 1.6 x 2.3 | builder (as a run) | 200 | P |
| `cableDrum` | Timber cable drum on its side | 1.8 dia x 1.1 | builder 1.8 x 1.1 x 1.8 | 250 | P |

### A6 - Pump House (tidal barrier pumping station)
| Prop | Real object | Size | Collision | Tris | Status |
| --- | --- | --- | --- | --- | --- |
| `pumpUnit` | Vertical mixed-flow pump set on a 1.2 m concrete plinth: discharge head and stub with its flange, motor stool, coupling guard, motor with fan cowl, terminal box, lifting eyes | plinth 2.4 x 2.4 x 1.2; unit to 4.0 | builder plinth (low cover, solid) + pump column 0.64 x 0.64 (solid) + motor envelope 1.2 x 1.2 to 4.0 (see), `noLedge` | 900 | B1 |
| `meshPanel` | Welded-mesh partition panel (machine guard / cage): galvanised half posts and rails, 1.2 m solid kick panel, mesh above | 1.5 x 0.05 x 2.4 | builder 1.5 x 0.05 x 2.4 (see: the cage wall; G45) | 120 | B1 |
| `driveCabinet` | Variable-speed drive cabinet, door HMI screen | 1.2 x 0.6 x 2.0 | own (the hack terminal) | 200 | P |
| `davitBox` | Confined-space rescue kit box on the gallery rail | 0.8 x 0.5 x 0.6 | own (the rope anchor) | 100 | P |
| `glandPlate` | 0.6 m cable gland plate with yellow lifting-point sign | 0.6 x 0.6 x 0.03 | own (the hang-down anchor) | 40 | P |
| `pipeRun` | DN600 discharge pipe, 1 m module, flanges | 1.0 x 0.7 dia | builder where reachable | 120 | P |

### A7 - Data Hall (colocation hall and two-person cage)
| Prop | Real object | Size | Collision | Tris | Status |
| --- | --- | --- | --- | --- | --- |
| `serverRack` | 42U server cabinet: perforated front door, side panels, top cable entry, blanking, status LEDs on the servers | 0.6 x 1.2 x 2.2 | builder 0.58 x 1.14 x 2.19 per rack, behind the door (solid), `noLedge` | 300 | B1 |
| `meshPanel` | The cage walls (shared with A6) | 1.5 x 0.05 x 2.4 | builder | 120 | B1 |
| `coolingUnit` | Downflow computer-room air handler | 1.8 x 0.9 x 2.0 | builder, `noLedge` | 200 | P |
| `cableTray` | Overhead wire cable basket, 1 m module, on drop rods | 1.0 x 0.3 x 0.1 | none (above 2.6 m) | 80 | P |
| `trenchGrating` | Cable trench grating, 1 m module | 1.0 x 1.0 x 0.03 | none (floor; the loud surface is the builder's) | 40 | P |

### A8 - The Strongroom (Victorian banking hall, security office, vault)
| Prop | Real object | Size | Collision | Tris | Status |
| --- | --- | --- | --- | --- | --- |
| `bankCounter` | Banking-hall counter module: panelled oak front (three raised panels), dark plinth, marble top, brass foot rail | 2.4 x 0.9 x 1.2 (rail 9 cm out) | builder 2.38 x 0.74 x 1.19 (low cover, solid) | 300 | B1 |
| `vaultDoor` | Strongroom door frame (rectangular, as Victorian strongrooms; assumption PA3): heavy steel surround, threshold, bright reveal, hinge knuckles, maker's plate | 2.4 x 0.7 x 2.8; opening 1.4 x 2.2 | builder: two jambs + head (solid, `noLedge`); the opening is a level `Door` (`vaultDoorProps`) | 400 | B1 |
| `vaultLeaf` | The door leaf, 0.5 m thick: face slab, stepped plug, five locking bolts, spoked brass wheel, dial, name plate, time-lock box with a ready lamp, hinge arms; turns about the hinge by its `Door` | 1.4 x 0.5 x 2.2 | none (the `Door` anchor's) | 600 | B1 |
| `bankGrille` | Public grille, brass bars 3 m, 1.5 m module | 1.5 x 0.08 x 3.0 | own (the maglocked gate) | 200 | P |
| `timeLockPanel` | Time-lock panel with a clock face and ready lamp | 0.5 x 0.15 x 0.7 | own (the sync terminal) | 100 | P |
| `lightingBoard` | Lighting distribution board with isolator handle | 1.2 x 0.3 x 1.8 | own (the isolator) | 150 | P |
| `depositWall` | Safe deposit box wall module | 1.2 x 0.6 x 2.4 | builder | 250 | P |
| `nightDesk` | The night desk (a securityDesk variant in oak) | 2.4 x 0.9 x 0.75 | builder | 400 | P |
| `cashCart` | Cash-in-transit trolley (exit dock) | 1.0 x 0.6 x 1.1 | builder | 150 | P |

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
A1 (The Gate) and A3 (Office Range) have no B1 prop yet: their props are batch B2.

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
// render side (World): const r = await PropRender.create(scene, props.placements, doors.list);
// a device state: r.setTint(index, screenRgb, lampRgb)
```

Integration notes for the slice builders:
- `World` / `MapLayout` have no props hook yet (existing src was out of this step's scope): add `MapLayout.props?:
  PropPlacement[]` and start `PropRender.create(scene, layout.props, doors.list)` beside `KitRender` in `World.create`
  (skip on `?gfx=min`; on a load failure warn and keep the greybox), dispose it with the world.
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

### Left to do
- Integration (slice builders): the `MapLayout.props` hook and `World` start-up (section 5), then each set's dressing
  pass with `checkPropLayout` in its map test.
- Batch B2 (the props sets still need to read as their sites): A1 `barrierPost`, `bollard`, `checkerDesk`; A2
  `trackPanel`, `bufferStop`; A3 `officeDesk`, `officeChair`, `filingCabinet`; A4 `palletLoad`; A5 `switchgearPanel`;
  A7 `coolingUnit`, `cableTray`; A8 `bankGrille`, `depositWall`; gallery `galleryConsole`, `galleryChair`. Then the
  device-owned props (`pushStation`, `zoneKiosk`, `driveCabinet`, `timeLockPanel`, `lightingBoard`) with their devices.
- Door-driven props: `PropRender` swings only `vaultLeaf` (hinged). A prop tied to a real sliding door would have to
  translate like `kitRender`'s leaves (`leafAlong` / `slideFraction`), not swing: not built, no prop needs it yet. If
  the vault should keep the hinged door's peek and stick open, add a `Door.leaf` value that only hides the drawn leaf
  (`doors.ts`, `doorPeek.ts` `isSlideDoor` unchanged) and switch `vaultDoorProps` to it.
- GPU look check and perf per set on the laptop (Character Build): contact sheet of the 13 props under the baked lamps.
- Polish list (not now): CC0 textures in the visual pass; seeded variety of the racking loads (one bay variant
  today); planked-body detail on the van.
