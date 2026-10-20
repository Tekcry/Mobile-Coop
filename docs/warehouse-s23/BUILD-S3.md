# Section 3 build sheet - assembly hall, mezzanine, rear offices (warehouse-s23)

Spec writer, 2026-10-20. Source: `docs/warehouse-redesign/SPEC.md` 2.3 (the design), 1, 3 (co-op), 4 (L1-L15), 6 (C1 / A2,
N1 / A3, E7 / A7); `BUILD-S2.md` (format), `step-s2-report.md` and `check-s2.md` (what the section 2 build found). Code read on
`feature/warehouse-s23` at c08465ca (plus the lamp agent's uncommitted S1 / S2 lamp edits, read only). Build this exactly; every
deviation from SPEC 2.3 is in section 9 with its reason. The only judgement left to the builder is the two adjustment ladders in
section 8.3 (M8) and 8.4 (lamps).

Frame (the code's, same as SPEC): x west to east, z south to north (+z north), y up, metres. Yaw 0 faces +z, yaw PI/2 faces +x.
Camera `facing` is degrees, 0 = +z. `W:n` = `src/world/maps/warehouse.ts` line n, `O:n` = `warehouseOps.ts`, `S:n` =
`warehouseSectors.ts`. `T` = 0.3, `PI` = Math.PI.

The hall: x -4 (section 2's 6.0 wall, east face -3.85) to x 24 (perimeter inner face), z -8.8 (section 1's 6.0 wall, north face
-8.65) to z 18 (perimeter inner face). Single span, no internal columns but the deck's. The base roof strips at y 6.15 stay visual
(W:381-385). Every solid face below sits on the 5 cm grid (the voxel fit test).

Numbers marked "scratch" come from two scratch scripts (deleted, scratchpad only) that ran the repo's `SightWorld`,
`longestIsolation` and `worstIsolationOverPhases` on this sheet's solid pieces, and an analytic lamp estimate (the lamp formula of
`lampMath.ts` with `SightWorld` occlusion, the S1 and S2 lamps included). They are estimates; the Vitest files are the truth.

---

## 1. How it plugs in

Sections 1 (`warehouseS1.ts`) and 2 (`warehouseS2.ts`) are unchanged (the lamp agent owns their lamps). C3 keeps its doors, box and
checkpoint (S:82-89), so the run flows 2 -> 3. Section 3 ends in the extraction in the new east fire-exit lobby.

### 1.1 `src/world/maps/warehouse.ts`
Add `WarehouseOpts.assemblyHall?: boolean` (default true; doc: "the base factory floor and mezzanine east of x -4 from z -8.8
(floor contents, the solid deck block, rails, ladder, zipline, the manager's slab and duct, the deck crates, the deck pipe, the lamp
strips there); Sector Ops sets it false and builds section 3 itself (`warehouseS3.ts`). Used only with `southBand: false`."). Let
`const ah = o.assemblyHall !== false;`. When `ah` is false:
- W:215-216: the z 12 wall and the x 2 wall are 3.0 high (the deck underside): `wallX(b, 12, -4, 8, o.gapsZ12 ?? [[-1.5, -0.4]], WALL, ah ? H : 3.0);`
  and `wallZ(b, 2, 12, 18, [[15.5, 16.6]], WALL, ah ? H : 3.0);`. (At 3.2 their tops would poke 0.2 into the deck slab and make a
  second lip 0.1 under the deck's.)
- Skip W:278-296 (`if (ah) { ... }`): pillars, press, machines, conveyor, crate, hazard block, stairs, cabinets, forklift, low wall,
  crate, crane girder and hoist, walkway line. Section 3 rebuilds what it needs.
- Skip W:298-337: the mezzanine block, railings, ladder, zipline, the manager's slab, vent and duct, the deck crates and shelf.
- Keep W:339-346 (office furniture) and W:349-350 (the office and manager's doors).
- The lamp loop W:387-394: add `if (!ah && x > -4) continue;` after the `!sh` line (drops the x 0, 9 and 18 strips, lit and unlit).
- W:404: `if (ah) b.surface('metal', 8, 24, 12, 18, 2.6);`.
- W:432-433: `if (ah)` round the deck pipe and its hangers.
The plain `warehouse` passes no options: 318 boxes, 14 cylinders, 5 doors stay (the existing Vitest).

### 1.2 New `src/world/maps/warehouseS3.ts`
Same shape as `warehouseS2.ts`. Colours: CONCRETE '#8e9396', WALL '#b7b2a6', WALL_DARK '#7d786d', STEEL '#55606a', CRATE
'#a8784a', HAZARD '#e8b923', DESK '#8a6a4c', SHRINK '#c4c0b0', PIPE '#6d7378', BEAM '#e07b22', ROOF '#4a4f55', GRATE '#3a3d40',
BELT '#3d4247', CABINET '#4b5560'. Local copies of `lintel` (warehouseS2.ts:92) and `plate` (warehouseS1.ts:118); do not import
from S1 / S2 (another agent edits them). A local `nl(from)` = `b.mark(from, { noLedge: true })` and `ov(from)` =
`b.mark(from, { overhead: true })`.
Exports:
- `buildAssemblyS3(b: LevelBuilder): void` - everything in sections 2 and 3 of this sheet.
- `S3_ROOMS`, `S3_SWITCHES`, `S3_PICKUPS`, `S3_NAV_SEEDS`, `S3_LIGHT_PASS` (+ type `S3Lamp`, as `S2Lamp`) (sections 3.7 and 4).
Header comment: "Sector Ops section 3 of the Warehouse (warehouse-s23, SPEC 2.3, BUILD-S3.md): the assembly hall, the
mezzanine with the production office, the rear offices and the east fire-exit lobby, a greybox."

### 1.3 `src/world/maps/warehouseOps.ts`
- Import `buildAssemblyS3, S3_NAV_SEEDS, S3_PICKUPS, S3_ROOMS, S3_SWITCHES` from `./warehouseS3`.
- `opsPieces`: call `buildAssemblyS3(b)` after `buildStorageS2(b)`. Keep C3 (O:42-43) and the manager's floor door
  `b.door(4.6, 0, 12, 1.1, PI / 2, { swing: -1 })` (O:47). Delete O:48-60 (the crate, the six walls, the two blocks, the deck
  crates). Update the comments at O:33 and O:45. Drop the constants that become unused (`H`, `T`, `WALL`, `CRATE`, `STEEL`: lint).
- `build()`: add `assemblyHall: false` (keep `southBand: false`, `storageHall: false`, `gapsX4`, `gapsZ12` [[-1.5, -0.4], [4.6, 5.7]],
  `officeSwing: 1`, `officeDesk: false`, `extra`). Delete the `WAREHOUSE_OPS_LAMPS` loop (O:88-90) and its import.
- Rooms: `gone` adds 'floor', 'mezz', 'office', 'manager' (all the base rooms are gone); the list is `[...S1_ROOMS, ...S2_ROOMS, ...S3_ROOMS]`
  (keep the filter line for safety).
- Items: keep the `s3` filter for `enemySpawns` and `hideSpots`; `props: []` (the only base prop left was a crate at (12.5, 9.8), now
  beside the forklift); `pickups: [...S1_PICKUPS, ...S2_PICKUPS, ...S3_PICKUPS]`; `switches: [...S1_SWITCHES, ...S2_SWITCHES, ...S3_SWITCHES]`
  (the base switch (1.85, 13) group 7 lit the old office strip; section 3 brings its own at the same spot).
- `navSeeds`: replace `new Vector3(15, 2.6, 15)` with `new Vector3(15, 3.3, 13.0)`; add `...S3_NAV_SEEDS`.
- `description`: 'Three sections in a row: the service entrance, the storage hall, the assembly hall and mezzanine.'

### 1.4 `src/world/maps/warehouseSectors.ts`
- Replace `WAREHOUSE_SECTORS[2]` (S:136-181) with section 6 of this sheet. Keep `id: 'floor'` (sectors.test asserts the ids).
- Devices: replace `cam-floor`, `cam-stairs`, `cam-mezz` (S:192-194), `laser-deck-stairs`, `laser-deck-west` (S:203-204) with section 5;
  `levels: { ground: 0, mezz: 3.3 }`. Counts stay cameras 2/2/3, lasers 2/1/2. Alarm panel (-3.85, 6) unchanged.
- Delete `WAREHOUSE_OPS_LAMPS` (S:219-224). Header comment: "8, 8 and 11 guards" becomes "8, 8 and 9".

---

## 2. Walls, slabs, roofs

### 2.1 Shell
- West wall x -4 (6.0, parapet) and south wall z -8.8 (6.0, parapet): built by sections 2 and 1. No change.
- **Parapets** (A4 extended, D13; y 6.0-7.5, WALL_DARK, mark noLedge): `b.box(10, 6.75, 18.5, 28.0, 1.5, 1.0)` (north perimeter top,
  x -4 to 24, meets section 2's at x -4) and `b.box(24.5, 6.75, 5.1, 1.0, 1.5, 27.8)` (east perimeter top, z -8.8 to 19, meets section
  1's at z -8.8). Why: the deck (3.3) puts the north wall's lip 2.7 m over the deck, inside a standing grab (`REACH.grabMax` 2.7,
  anchors.ts:215), and the wall tops lead outside the building. A parapet over the whole top leaves no `LEDGE.clearAbove` (0.35), so
  no lip (anchors.ts:416).
- No rafters (SPEC 1 has them on the frame lines; section 2 found that every visible box of 0.05 or more shadows lamps, and the
  crane runways already sit at that height). No roof to stand on.

### 2.2 The mezzanine deck (top 3.3, underside 3.0)
- Slab: `b.box(10.075, 3.15, 14.925, 27.85, 0.3, 6.15, STEEL)`, mark overhead (x -3.85 to 24.0, z 11.85 to 18.0). Its south edge is
  one uncut lip at 3.3 from x -3.85 to 24 (the walls and columns below do not cut it: section 7 point 1).
- Columns: `b.pillar(x, 12.15, 0.15, 3.0, STEEL)` for x = 12, 16, 20 (z 12.0 to 12.3, inside the edge). The offices' walls carry
  the west part.
- Offices under the deck: the base z 12 wall (x -4 to 8, gaps [-1.5, -0.4] and [4.6, 5.7]) and x 2 wall (gap [15.5, 16.6]), both
  3.0 (1.1); a new east wall for the manager's office `b.wallZ(8, 12.15, 18, [], 3.0, WALL, T)`. Door heads (y 2.1-3.0):
  `lintel(b, -0.95, 2.55, 12, 1.1, 0.9, T)`, `lintel(b, 5.15, 2.55, 12, 1.1, 0.9, T)`, `lintel(b, 2, 2.55, 16.05, T, 0.9, 1.1)`.
  The office fronts (z 12, x -4 to 8) are a wall below the deck lip: a solo wall jump (3.3 is inside `WALL_JUMP` 2.7-3.8).
- Surfaces: `b.surface('metal', -3.85, 24, 11.85, 18, 3.3)` (the deck); `b.surface('carpet', 16.15, 24, 14.65, 18, 3.3)` (the office).
- Rails (visual, 0.04 thick so they are not light shapes): along z 11.9, segments x [-3.15, 12.5], [14.5, 22.1], [23.3, 24.0] (gaps: the
  west ladder head, the pallet gate, the stair head). Per segment [a, e]: top rail `b.box((a + e) / 2, 4.3, 11.9, e - a, 0.04, 0.04,
  HAZARD, 0, 0, false)`, mid rail the same at y 3.8, posts `b.box(x, 3.8, 11.9, 0.04, 1.0, 0.04, HAZARD, 0, 0, false)` at x = a, then
  every 2.0, and e. Rails are visual (SPEC): the edge stays a hang lip and a nav cliff (guards drop at most 2.2, navBuild.ts:12).
- Pallet gate (visual, x 12.5-14.5): posts `b.box(x, 3.85, 11.9, 0.04, 1.1, 0.04, HAZARD, 0, 0, false)` at x 12.5 and 14.5; bar
  `b.box(13.5, 4.4, 11.9, 2.0, 0.04, 0.04, HAZARD, 0, 0, false)`.
- West escape ladder (L12): `b.ladder(-3.4, 11.6, 0, 3.3, 0, STEEL)` (top (-3.4, 3.3, 12.05) on the deck).
- On the deck (all noLedge; mark them): archive racking `b.block(6.0, 16.3, 4.0, 2.0, 2.6, STEEL, 3.3)` (x 4-8, z 15-17.6); staged kit
  parts `b.block(9.0, 14.6, 1.2, 1.2, 1.2, CRATE, 3.3)` and `b.block(11.5, 15.8, 1.2, 1.1, 1.2, CRATE, 3.3)`.

### 2.3 The production office (on the deck, x 16-24, z 14.5-18; walls y 3.3-5.8 under its own roof)
All pieces WALL and noLedge (mark them) unless stated.
- West wall: `b.box(16, 4.55, 16.175, T, 2.5, 3.65)` (z 14.35-18.0, no door: D1).
- South wall (z 14.5), west to east:
  - `b.box(16.3, 4.55, 14.5, 0.3, 2.5, T)` (x 16.15-16.45)
  - door gap x 16.45-17.55, head `lintel(b, 17.0, 5.6, 14.5, 1.1, 0.4, T)` (y 5.4-5.8); door `b.door(16.45, 3.3, 14.5, 1.1, PI / 2, { swing: -1 })`
    (centre (17.0, 14.5), opens north into the office)
  - `b.box(18.275, 4.55, 14.5, 1.45, 2.5, T)` (x 17.55-19.0)
  - window x 19.0-20.2: sill `b.box(19.6, 3.75, 14.5, 1.2, 0.9, T)` (y 3.3-4.2), head `lintel(b, 19.6, 5.6, 14.5, 1.2, 0.4, T)` (y 5.4-5.8),
    `b.windowAt(19.6, 4.8, 14.5, 1.2, 1.2, 0, { sill: 4.2, open: true })` (D2)
  - `b.box(21.775, 4.55, 14.5, 3.15, 2.5, T)` (x 20.2-23.35)
  - duct opening x 23.35-24.0, y 4.25-4.95: below `b.box(23.675, 3.775, 14.5, 0.65, 0.95, T)`, above `b.box(23.675, 5.375, 14.5, 0.65, 0.85, T)`;
    the grille (visual) `b.box(23.675, 4.6, 14.67, 0.6, 0.6, 0.04, GRATE, 0, 0, false)`
- Roof: `b.box(19.925, 5.9, 16.175, 8.15, 0.2, 3.65, ROOF)`, mark overhead and noLedge (x 15.85-24.0, z 14.35-18.0, y 5.8-6.0; it covers
  the wall tops, so no lip on them).
- Contents (noLedge): the clerk's desk `b.block(18.6, 17.75, 1.6, 0.75, 0.5, DESK, 3.3)`; the terminal console
  `b.block(21.9, 17.3, 0.6, 1.0, 1.4, DESK, 3.3)` (x 21.6-22.2; the terminal stands 0.2 m off its east face, as section 2's case);
  a filing cabinet `b.block(16.5, 17.6, 0.6, 1.3, 0.8, STEEL, 3.3)`.

### 2.4 The east stair (two flights of 9, riser 0.183, going 0.278, a landing; x 22.1-23.3, D10)
- Flight 1: `b.stairs(22.7, 6.1, 1.2, 2.5, 1.65, 9, CONCRETE, 0, 0)` (z 4.85-7.35).
- Landing: `b.block(22.7, 8.35, 1.2, 1.65, 2.0, CONCRETE)` (z 7.35-9.35, top 1.65: under `LEDGE.minDrop` 1.9, no lip).
- Flight 2: `b.stairs(22.7, 10.6, 1.2, 2.5, 1.65, 9, CONCRETE, 0, 1.65)` (z 9.35-11.85, arrives at the deck edge).
- Handrails (visual, both sides, x 22.08 and 23.32): along each flight `b.box(x, y0 + 1.825, zc, 0.04, 0.04, 2.995, HAZARD, 0, -Math.atan2(1.65, 2.5), false)`
  (flight 1: y0 0, zc 6.1; flight 2: y0 1.65, zc 10.6; the pitch is the one `ramp()` uses, levelBuilder.ts:170); landing rail
  `b.box(x, 2.65, 8.35, 0.04, 0.04, 2.0, HAZARD, 0, 0, false)`; posts `b.box(x, y + 0.5, z, 0.04, 1.0, 0.04, HAZARD, 0, 0, false)` at
  (z, y) = (4.85, 0), (7.35, 1.65), (9.35, 1.65), (11.85, 3.3). If a flight rail slopes the wrong way, flip the pitch sign.
- Nav: 0.33 m of rise per 0.5 m cell, under the 0.45 step (navBuild.ts:78-80).

### 2.5 The plant room (x 16-24, z -5.6 to -1.0; walls 3.6, roof top 3.8)
- `b.wallZ(16, -5.6, -1.0, [[-3.85, -2.75]], 3.6, WALL, T)` (west, door centre (16, -3.3)).
- `b.wallX(-1.0, 15.85, 24, [[19.45, 20.55]], 3.6, WALL, T)` (north, door centre (20.0, -1.0)).
- `b.wallX(-5.6, 15.85, 24, [], 3.6, WALL, T)` (south: also the lobby's north wall).
- Heads (y 2.1-3.6): `lintel(b, 16, 2.85, -3.3, T, 1.5, 1.1)`, `lintel(b, 20.0, 2.85, -1.0, 1.1, 1.5, T)`.
- Doors (unlocked leaves): `b.door(16, 0, -3.85, 1.1, 0, { swing: 1 })` (west, opens east into the room);
  `b.door(19.45, 0, -1.0, 1.1, PI / 2, { swing: -1 })` (north, opens north out of the room, D9).
- Roof: `plate(b, 15.85, 24, -5.75, -0.85, 3.8, 0.2, [[20.55, 21.45, -2.45, -1.55]], ROOF)`, mark overhead. Lips at 3.8 on the west and
  north faces with the wall below: solo wall jumps (3.8 = `WALL_JUMP.maxUp`). The hole is the roof hatch (two-way, L4 / L12).
- Hatch ladder: `b.ladder(21.0, -2.0, 0, 3.8, 0, STEEL)` (top (21.0, 3.8, -1.55), the hole's north edge, as section 1's roof hatch).
- Valve set `b.block(17.2, -5.0, 1.8, 1.6, 0.9, PIPE)` (x 16.3-18.1, z -5.45 to -4.55); the office AHU `b.block(20.6, -4.4, 3.0, 2.0, 1.6, STEEL)`
  (x 19.1-22.1, z -5.2 to -3.6; the engineer's panel is its north face).
- Riser shaft (noLedge): `b.block(23.6, -0.9, 0.8, 5.9, 3.0, STEEL)` (x 23.2-24.0, z -2.4 to 0.6, y 0-5.9; it passes through the north
  wall and the roof). 5.9 keeps its top over a mantle from the roof (1.8 is the mantle limit, movement.ts:122). Entry grate (visual)
  `b.box(23.18, 0.5, -1.8, 0.04, 0.6, 0.6, GRATE, 0, 0, false)`.

### 2.6 The east fire-exit lobby (x 16-24, z -8.8 to -5.6; walls 3.0, roof top 3.2)
- West wall `b.box(16, 1.5, -7.75, T, 3.0, 1.8, WALL)` (z -8.65 to -6.85) and the head `lintel(b, 16, 2.55, -6.3, T, 0.9, 1.1)` (y 2.1-3.0).
- Fire door (E7: an unlocked leaf): `b.door(16, 0, -6.85, 1.1, 0, { swing: 1 })` (centre (16, -6.3), opens east into the lobby; D8).
- North wall: the plant room's south wall. South wall: section 1's z -8.8 wall. East: the perimeter.
- Roof: `plate(b, 15.85, 24, -8.65, -5.75, 3.2, 0.2, [[22.05, 22.95, -7.65, -6.75]], ROOF)`, mark overhead. The hole is the roof hatch
  over (22.5, -7.2): drop-only (A7; its edges have no wall below and 3.2 is out of a standing grab).
- Exit door east (visual only, no gap: the perimeter is the map edge): `b.box(23.97, 1.05, -7.2, 0.06, 2.1, 1.2, STEEL, 0, 0, false)`,
  push bar `b.box(23.92, 1.0, -7.2, 0.04, 0.06, 1.0, HAZARD, 0, 0, false)`.
- The lobby roof meets the walkway (3.0) at x 15.8 / 15.85: a 0.2 step up (nav step 0.45). From the lobby roof the plant roof is a
  0.6 step (a player step, `pickTraversal` 0.65; not a nav step).

### 2.7 The crane walkway (3.0) and the crane (visual)
- Walkway: `b.box(6.1, 2.9, -8.05, 19.4, 0.2, 1.2, STEEL)`, mark overhead (x -3.6 to 15.8, z -8.65 to -7.45, y 2.8-3.0); its north lip is
  a co-op lip and a hang-drop line (no wall below); `b.surface('metal', -3.6, 15.8, -8.65, -7.45, 3.0)`.
- Rail (visual) `b.box(6.1, 4.0, -7.47, 19.4, 0.04, 0.04, HAZARD, 0, 0, false)`; hangers `b.box(x, 4.4, -8.05, 0.04, 2.8, 0.04, STEEL, 0, 0, false)`
  at x -2, 2, 6, 10, 14.
- Caged ladder (L12): `b.ladder(-3.4, -7.2, 0, 3.0, PI, STEEL)` (top (-3.4, 3.0, -7.65) on the walkway).
- Runways (visual): `b.box(10.075, 5.5, -8.2, 27.85, 0.3, 0.3, BEAM, 0, 0, false)` and the same at z 11.6. Bridge girder parked at x 11:
  `b.box(11, 5.2, 1.7, 0.4, 0.4, 19.8, BEAM, 0, 0, false)` (y 5.0-5.4); hoist `b.box(11, 4.75, -6.9, 0.6, 0.5, 0.6, HAZARD, 0, 0, false)`,
  pendant `b.box(11, 3.0, -6.9, 0.03, 3.0, 0.03, STEEL, 0, 0, false)`.

### 2.8 The floor
- Press cell: the press `b.block(6, 1, 2.4, 3.3, 2.0, STEEL)` (x 4.8-7.2, z 0-2, a 3.3 perch by wall jump) and
  `b.box(5.25, 3.5, 1, 0.6, 0.4, 0.9, HAZARD, 0, 0, false)`; its hydraulic power unit `b.block(7.4, -1.2, 2.4, 2.0, 1.2, STEEL)` (noLedge,
  x 6.2-8.6, z -1.8 to -0.6); a die trolley `b.block(7.65, 2.6, 1.5, 1.8, 0.8, STEEL)` (x 6.9-8.4, z 2.2-3.0); the press control cabinet
  `b.block(8.6, 1.0, 0.6, 2.0, 1.8, CABINET)` (noLedge, x 8.3-8.9, z 0.1-1.9). The last three are the fitter's M8 screens (D7).
- East cell: two enclosed CNC machining centres `b.block(12.5, -2.5, 3.0, 2.4, 1.6, STEEL)` and `b.block(12.5, 3.5, 3.0, 2.4, 1.6, STEEL)`
  (noLedge; x 11-14; D6).
- Packing line: the conveyor `b.block(4, 8.6, 10, 1.0, 0.9, BELT)` (x -1 to 9, z 8.15-9.05); finished kits for C3
  `b.block(0.5, 10.8, 1.2, 1.4, 1.2, SHRINK)` (x -0.1 to 1.1, z 10.2-11.4).
- The parked forklift (body with its overhead guard, top 2.2: a hang lip on every side) `b.block(13.5, 10.8, 1.2, 2.2, 2.0, HAZARD)`
  (x 12.9-14.1, z 9.8-11.8, its forks under the pallet gate); forks (visual) `b.box(13.5, 0.1, 12.1, 0.9, 0.05, 0.6, STEEL, 0, 0, false)`.
- Parts store (under the deck, x 8-24): shelving rows `b.block(11.75, 13.5, 6.5, 2.0, 0.6, STEEL)` and `b.block(11.75, 16.5, 6.5, 2.0, 0.6, STEEL)`
  (noLedge; x 8.5-15.0, z 13.2-13.8 and 16.2-16.8).
- Stores cage (x 0-6, z -8.65 to -4.0; mesh 2.4, open top): `b.fence(0, -8.65, 0, -4.0, 2.4)`, `b.fence(0, -4.0, 2.45, -4.0, 2.4)`,
  `b.fence(3.55, -4.0, 6.0, -4.0, 2.4)`, `b.fence(6.0, -4.0, 6.0, -8.65, 2.4)`; counter gate `b.door(2.45, 0, -4.0, 1.1, PI / 2, { swing: 1 })`
  (centre (3.0, -4.0), opens south into the cage); the issue counter `b.block(4.7, -4.35, 1.4, 1.0, 0.5, DESK)` (x 4.0-5.4, z -4.6 to -4.1);
  shelving along the east fence `b.block(5.65, -6.5, 0.5, 2.0, 3.6, STEEL)` (noLedge, x 5.4-5.9, z -8.3 to -4.7); back shelves
  `b.block(2.6, -8.35, 3.2, 2.0, 0.6, STEEL)` (noLedge, x 1.0-4.2, z -8.65 to -8.05).
- Die rack under the walkway `b.block(11.0, -8.15, 1.6, 1.2, 0.9, STEEL)` (x 10.2-11.8, z -8.6 to -7.7).
- Gone (SPEC): the five pillars, O:48-60's pocket walls and crates, the zipline (W:310), the manager's duct (W:327), the freight lift.

### 2.9 Services
- **The hall main** (L6, D5), PIPE:
  - Header over the plant roof (the riser's top): `b.pipeH(17.0, -3.0, 17.0, -1.2, 5.8)` (a standing grab from the roof, 2.0 up).
  - Main: `b.pipeH(17.0, -0.5, 17.0, 12.6, 5.0)` (over open floor from z -0.85 to 11.85; its south end 0.35 m north of the plant roof,
    its north end 0.75 m over the deck).
  - Visual: riser from the valve set `b.box(17.0, 2.6, -4.5, 0.12, 2.0, 0.12, PIPE, 0, 0, false)` (in the room) and
    `b.box(17.0, 4.8, -3.0, 0.12, 2.0, 0.12, PIPE, 0, 0, false)` (roof to header); the drop `b.box(17.0, 5.8, -0.85, 0.12, 0.12, 0.7, PIPE, 0, 0, false)`
    and `b.box(17.0, 5.4, -0.5, 0.12, 0.8, 0.12, PIPE, 0, 0, false)`; hangers `b.box(17.0, 5.6, z, 0.04, 1.2, 0.04, PIPE, 0, 0, false)` at
    z 3, 7, 11; sprinklers under the deck `b.box(10.0, 2.85, 13.0, 24.0, 0.04, 0.04, PIPE, 0, 0, false)`.
- **The office supply duct** (G56 auto-crawl, L13; D4). Casing (solid, noLedge): `b.box(23.675, 5.1, 7.275, 0.65, 0.9, 13.35, STEEL)`
  (x 23.35-24.0, y 4.65-5.55, z 0.6-13.95: over the east bay and the deck strip, beside the stair); elbow (visual)
  `b.box(23.675, 4.75, 14.15, 0.65, 0.9, 0.4, STEEL, 0, 0, false)`. The anchors:
  - In: `b.duct([{ x: 23.2, y: 0, z: -1.8 }, { x: 23.65, y: 0, z: -1.8 }, { x: 23.65, y: 4.7, z: 0.5 }, { x: 23.65, y: 4.7, z: 14.0 }, { x: 23.65, y: 4.35, z: 14.45 }],
    { pos: { x: 23.18, y: 0.5, z: -1.8 }, nx: -1, ny: 0, nz: 0, where: 'wall' }, { pos: { x: 23.65, y: 4.6, z: 14.67 }, nx: 0, ny: 0, nz: 1, where: 'wall' })`.
  - Back (the same path reversed, the grates swapped): `b.duct([the five points in reverse order], { pos: { x: 23.65, y: 4.6, z: 14.67 }, nx: 0, ny: 0, nz: 1, where: 'wall' },
    { pos: { x: 23.18, y: 0.5, z: -1.8 }, nx: -1, ny: 0, nz: 0, where: 'wall' })`.
  - 16.7 m in plan; the shaft rise (0 to 4.7) is the sloped 2.3 m leg inside the shaft. In: crawl out of the grille to (23.65, 3.3, 15.42).
    Back: out of the plant grate to (22.43, 0, -1.8).

## 3. Traversal, contents, lights

### 3.1 Ledges (generated; by code, section 7)
| Lip | Height | Solo | Co-op / other |
| --- | --- | --- | --- |
| Deck edge over the office fronts (x -3.85 to 8) | 3.3 | wall jump (wall below) | hang, drop |
| Deck edge on columns (x 8 to 24) | 3.3 | the forklift (mantle 1.1 from its 2.2 top), the stair, the west ladder | leg-up (L8); the shimmy line under the x 15.5 beam |
| Walkway north edge | 3.0 | its ladder | leg-up anywhere; hang-drop onto the crane operator and over the stores cage |
| Plant-room roof, west and north faces | 3.8 | wall jump; the hatch ladder | - |
| Lobby roof, west face | 3.2 | wall jump | the walkway steps onto it (0.2) |
| Forklift top | 2.2 | jump-grab, climb | - |
| Press top | 3.3 | wall jump | - |
| Lobby roof hatch edges | 3.2 | hang, drop into the lobby | - |
Everything else is noLedge or under 1.9.

### 3.2 Boosts and co-op (SPEC 3)
- Leg-up onto the deck edge on its columns (x 8-24, 3.3). Solo: the stair, the west ladder, the forklift, the office-front wall jump.
- Leg-up onto the walkway anywhere (3.0). Solo: its ladder.
- Hang-down from the deck edge east of the beam (x 15.6-21) to lift the partner past the laser. Solo: the shimmy.
- Split roles: one in the duct to the clerk, one along the main to the window; both reach the terminal.
- The main (5.0) stays out of boost reach (`boostMax` 4.5) from the floor; only the header over the plant roof leads onto it.

### 3.3 Cover
Generated from every solid piece (anchors and fences give none): the press and its three screens, the CNC machines, the conveyor and
kits, the forklift, the parts shelving, the cage shelving and counter, the die rack, the valve set, AHU and shaft, the deck crates
and archive racking, the office desk and console, the stair landing.

### 3.4 Dark and lit (M1, the brief's classes)
Route and decision points 0.40-0.55 (readable, under `LIGHT.lit` 0.6); the objective and staffed work areas (the press, the packing
end, the cage counter, the engineer's panel, the clerk, the terminal) 0.55-0.80; the dark pockets 0.30 or less: the parts store
between the rows, the deck's west end and the loader's west staging, the south strip under the walkway (the crane operator's west
end), the cage's south-west corner, the east bay by the plant room (21.0, 1.5).

### 3.5 Vantages (L15)
The floor from the C3 door (-0.95, 11.2); the deck from the west ladder head (-3.4, 3.3, 12.05); the plant room from its west door
(15.2, -3.3).

### 3.6 Switches (`S3_SWITCHES`)
`{ pos: (1.85, 0, 13.0), yaw: -PI / 2, group: 50 }` (C3, on the x 2 wall); `{ pos: (-3.85, 0, 10.5), yaw: PI / 2, group: 51 }` (the floor,
on the x -4 wall by the C3 door); `{ pos: (23.85, 0, 4.4), yaw: -PI / 2, group: 52 }` (the deck and high lamps, by the stair foot);
`{ pos: (16.15, 3.3, 15.0), yaw: PI / 2, group: 53 }` (the office, inside its west wall); `{ pos: (16.15, 0, -4.3), yaw: PI / 2, group: 54 }`
(the plant room, inside its west door); `{ pos: (2.15, 0, 13.0), yaw: PI / 2, group: 57 }` (the manager's office).

### 3.7 Lamps (`S3_LIGHT_PASS`, [x, y, z, radius, intensity, group, colour?]; built in a loop as `warehouseS2.ts:163-176`: fixture
`{ sx: 0.5, sy: 0.08, sz: 0.5, oy: 0.1 }`, signs (group 58) `{ sx: 0.3, sy: 0.12, sz: 0.06, oy: 0.06 }`; colour warm (1, 0.92, 0.75)
unless given)
| # | Lamp | x, y, z | r | i | group |
| --- | --- | --- | --- | --- | --- |
| 1 | C3 office ceiling | -1.8, 2.8, 14.2 | 4.0 | 0.60 | 50 |
| 2 | C3 office east | 0.6, 2.8, 15.6 | 2.5 | 0.60 | 50 |
| 3 | entry, the C3 door | -1.0, 3.6, 10.8 | 4.0 | 0.60 | 51 |
| 4 | packing line south | 4.0, 3.6, 7.0 | 4.5 | 0.60 | 51 |
| 5 | packing end | 7.2, 3.6, 9.6 | 4.0 | 0.85 | 51 |
| 6 | the manager's floor door | 5.0, 4.4, 10.6 | 3.5 | 0.62 | 51 |
| 7 | parts store front | 11.4, 3.4, 11.3 | 3.5 | 1.05 | 51 |
| 8 | the forklift | 13.2, 5.4, 10.8 | 3.0 | 0.60 | 52 |
| 9 | deck, the pallet gate | 13.8, 5.8, 12.6 | 2.5 | 0.47 | 52 |
| 10 | deck by the office door | 16.9, 5.6, 12.9 | 3.0 | 0.65 | 52 |
| 11 | deck by the window | 19.6, 5.6, 13.8 | 2.5 | 0.31 | 52 |
| 12 | deck strip east | 20.4, 5.6, 12.4 | 2.5 | 0.51 | 52 |
| 13 | office, the door | 18.2, 5.6, 15.3 | 3.0 | 0.69 | 53 |
| 14 | office, the clerk | 18.8, 5.6, 17.4 | 2.5 | 0.74 | 53 |
| 15 | office, the terminal (monitor glow) | 22.6, 5.6, 16.4 | 4.0 | 0.87 | 53, colour (0.55, 0.7, 1) |
| 16 | east bay north | 19.5, 4.0, 10.0 | 4.0 | 0.83 | 51 |
| 17 | east bay south | 18.0, 4.0, 3.5 | 4.5 | 0.80 | 51 |
| 18 | beside the main | 18.2, 5.6, 6.0 | 3.5 | 0.80 | 52 |
| 19 | plant lane north | 15.0, 3.4, -1.8 | 3.0 | 1.40 | 51 |
| 20 | plant lane south | 15.0, 3.0, -5.4 | 3.0 | 0.80 | 51 |
| 21 | plant room, the door | 17.6, 3.3, -3.3 | 2.4 | 1.28 | 54 |
| 22 | plant room, the panel | 19.4, 3.3, -3.4 | 2.4 | 1.37 | 54 |
| 23 | plant room, the grate | 22.2, 2.75, -2.4 | 2.5 | 0.67 | 54 |
| 24 | lobby west | 18.2, 2.75, -6.9 | 2.6 | 0.72 | 55 |
| 25 | lobby east | 22.2, 2.75, -7.4 | 2.0 | 0.65 | 55 |
| 26 | exit sign, the east fire exit | 23.8, 2.4, -7.2 | 3.0 | 0.40 | 58, green (0.5, 1, 0.6) |
| 27 | over the lobby roof | 16.8, 5.8, -6.6 | 2.5 | 0.60 | 52 |
| 28 | over the hatch | 21.7, 5.8, -7.2 | 2.5 | 0.58 | 52 |
| 29 | the riser and the main's south end | 18.0, 5.7, -1.4 | 2.5 | 1.23 | 52 |
| 30 | west strip north | -2.6, 3.6, 8.0 | 4.0 | 0.60 | 51 |
| 31 | west strip middle | -2.6, 3.6, 1.0 | 4.0 | 0.70 | 51 |
| 32 | west strip south | -2.6, 3.6, -4.5 | 4.0 | 0.70 | 51 |
| 33 | walkway ladder foot | -3.2, 2.6, -6.6 | 3.0 | 0.35 | 51 |
| 34 | walkway west | -3.0, 5.0, -8.0 | 3.0 | 0.40 | 52 |
| 35 | walkway over the cage | 4.0, 5.0, -8.0 | 3.0 | 0.40 | 52 |
| 36 | walkway over the die rack | 12.0, 5.0, -8.0 | 1.9 | 0.43 | 52 |
| 37 | manager's office | 4.2, 2.8, 14.5 | 4.0 | 1.22 | 57 |
| 38 | east cell north | 11.0, 3.6, 5.5 | 4.5 | 1.14 | 51 |
| 39 | east cell south | 10.8, 3.6, -4.8 | 3.0 | 0.90 | 51 |
| 40 | press cell | 7.8, 3.6, 1.4 | 4.0 | 0.80 | 51 |
| 41 | cage counter | 4.2, 2.6, -5.4 | 3.0 | 0.80 | 56 |
| 42 | exit sign, the stair head | 22.7, 5.4, 12.2 | 3.0 | 0.40 | 58, green |

- Why so many small lamps (SPEC had 9): a lamp lights only what is below it, with a cosine cone (`lampMath.ts:43-51`), so a body on
  a roof, the deck or a pipe needs a lamp within about 1.5 m in plan; and the 2 m column cap (8, `LAMP_GRID_SLOTS`) counts plan
  reach through walls, so the columns along z -10 to -6 (section 1's catwalk and workshop lamps reach 4-6 m) leave room for 3 more
  only: radii there are 1.9-3.0 and no lamp of x 13-22 near z -8 is added. Scratch: worst column 8, every point in its class but the
  office door's outside (17.0, 13.8) at 0.40 (it is a route point, READ).
- Keep lamps off the pipe lines (a pipe shadows what hangs under it): lamps 18 and 29 sit 1 m east of x 17.

## 4. Rooms and data lists
| id | name | x | z | storey |
| --- | --- | --- | --- | --- |
| assembly | Assembly Hall | -4 .. 24 | -8.8 .. 12 | maxY 2.9 |
| stores | Stores Cage | 0 .. 6 | -8.8 .. -4.0 | maxY 2.9 |
| plant | Plant Room | 16 .. 24 | -5.6 .. -1.0 | maxY 2.9 |
| fireLobby | Fire-exit Lobby | 16 .. 24 | -8.8 .. -5.6 | maxY 2.9 |
| partsStore | Parts Store | 8 .. 24 | 12 .. 18 | maxY 2.9 |
| office | Office | -4 .. 2 | 12 .. 18 | maxY 2.9 |
| manager | Manager's Office | 2 .. 8 | 12 .. 18 | maxY 2.9 |
| mezzDeck | Mezzanine | -4 .. 24 | 12 .. 18 | minY 2.9 |
| prodOffice | Production Office | 16 .. 24 | 14.5 .. 18 | minY 2.9 |
(`squad: []`; nested rooms are allowed by `rooms.test`, storeys do not overlap; `office` and `manager` keep the base ids, now with a
storey. The walkway (3.0) reads as `assembly` from below: maxY 2.9 is exclusive of 3.0, so on it `roomAt` with y gives -1; acceptable.)
- `S3_PICKUPS`: `{ pos: (-3.4, 0, 3.0), kind: 'ammo' }` (the west strip, against the x -4 wall).
- `S3_NAV_SEEDS`: (10, 3.3, 14.0) the deck; (20, 3.3, 16.0) the office; (19.0, 3.3, 13.0) the deck strip; (6, 3.0, -8.0) the walkway;
  (19.5, 3.2, -7.8) the lobby roof; (18.5, 3.8, -2.5) the plant roof; (19.0, 0, -2.0) the plant room; (19.5, 0, -7.2) the lobby;
  (3.0, 0, -6.5) the cage; (12.0, 0, 15.0) the parts store; (6.0, 3.3, 1.0) the press top; (13.5, 2.2, 10.8) the forklift top.
- Nav layers: 3 or fewer per column on every route (floor, deck, office roof). If e2e-sectorops reports a missing office or deck cell,
  set `navLayers: 4` on `warehouseOps` (`MapDef.navLayers`, mapDef.ts:109) and log it.
- No hide spots (SPEC 2.3 has none; bodies go in the dark parts store, the cage corner, under the walkway).

## 5. Devices (ids kept, moved; section 2)
- `cam-floor`: `{ kind: 'camera', level: 'ground', at: [23.6, 1.2], y: 3.5, facing: 260, sweep: [230, 290], reason: 'Section 3: the east bay and the plant room doors', section: 2 }` (D11).
- `cam-stairs`: `{ kind: 'camera', level: 'ground', at: [23.6, 11.6], y: 2.6, facing: 225, sweep: [200, 250], reason: 'Section 3: the stair and the parts store front', section: 2 }`.
- `cam-mezz`: `{ kind: 'camera', level: 'mezz', at: [-3.6, 17.6], y: 2.4, facing: 100, sweep: [80, 120], reason: 'Section 3: along the mezzanine deck from its west end', section: 2 }` (5.7 m absolute; D11).
- `laser-deck-stairs`: `{ x1: 22.1, z1: 12.3, x2: 23.3, z2: 12.3, ys: [0.35, 0.9, 1.45], floorY: 3.3, label: 'Stair head laser', section: 2 }`.
- `laser-deck-west`: `{ x1: 15.5, z1: 12.05, x2: 15.5, z2: 17.85, ys: [0.35, 0.9, 1.45], floorY: 3.3, label: 'Deck laser', section: 2 }`. It shuts the
  deck's west half off from the office side; the main, the window, the duct and the shimmy pass it.
- `levels: { ground: 0, mezz: 3.3 }`. Alarm panel (-3.85, 6), yaw PI/2, section 2: unchanged (its stand point is in `assembly`).
- All three cameras pass `validateSecurity` (mount 2.4-3.5 over their level, sweep 60 under 120).

## 6. Section 3 data (`WAREHOUSE_SECTORS[2]`)
- `id: 'floor'`, `name: 'Assembly hall and mezzanine'`.
- `start: { x: -1.2, y: 0, z: 14.8, yaw: PI }` (C3's checkpoint, the section's restart point; unchanged).
- `objective: { kind: 'hack', label: 'Hack the production terminal', x: 22.4, y: 3.3, z: 17.3, yaw: PI / 2 }`.
  e2e stand point (x + 0.9) = (23.3, 3.3, 17.3): free (console face 22.2, the east wall 24.0), nearest door hinge the office door
  (16.45, 14.5) at 7.4 m (rule: over 1.6), nearest first-four guard the clerk at 4.9 m (rule: over 1.8).
- `extract: { label: 'Extract by the east fire exit', box: [21.4, -8.5, 23.7, -5.9] }` (inside the lobby; centre (22.55, -7.2) is free
  floor under the hatch; no guard slot within 1.8 m: the tour guard's slot is at the stair foot, D8).
- `reinforce: [[-2.5, 10.5], [20.8, 6.5], [13, -7.0]]`, `perStage: 3` (D12).

### 6.1 Guards (9; no heavies, dogs or snipers, G155; in this order, so `?sectorGuards=4` takes the porter, the loader, the clerk and
the tour guard: the entry, the deck, the objective and the exit, D14)
Walk = archetype `walkSpeed` x 1.1 (grunt 0.99, officer 0.935, enforcer 0.88, runner 1.43 m/s). Every slot is route[0] and 7 m or more
from the start. `wait` is the first entry of `waits`. Deck guards carry `y: 3.3`.

| # | Data | Reason | Cycle | Takedown spot |
| --- | --- | --- | --- | --- |
| 1 kitPorter | `{ kind: 'enforcer', x: 8.0, z: 9.7, yaw: PI / 2, route: [[8.0, 9.7], [-1.5, 9.8]], wait: 5, waits: [5, 5], faces: [PI / 2, 0], takedownSpot: [-1.5, 9.8] }` | Pallet-trucks finished kits from the packing end to C3 | 32 s | West end by the C3 door under the deck edge; the press screens the fitter |
| 2 deckLoader | `{ kind: 'grunt', x: 13.5, z: 13.2, y: 3.3, yaw: PI, route: [[13.5, 13.2], [3.0, 13.2]], wait: 5, waits: [5, 4], faces: [PI, 0], takedownSpot: [3.0, 13.2] }` | Lifts kit parts in at the pallet gate, stages them on the deck | 30 s | The west staging over the offices (dark); the office walls screen the clerk; cam-mezz watches it |
| 3 clerk | `{ kind: 'officer', x: 18.6, z: 17.1, y: 3.3, yaw: 0, takedownSpot: [18.6, 17.1] }` | Writes up the shift's job cards at his desk on the north wall (D3) | post | Inside the office, his back to the door, the window and the grille |
| 4 tourGuard | `{ kind: 'runner', x: 21.5, z: 4.4, yaw: 0, route: [[21.5, 4.4], [14.9, 0.0], [15.0, -6.3], [23.0, -7.9], [15.0, -6.3], [14.9, 0.0]], wait: 4, waits: [4, 0, 0, 5, 0, 0], faces: [0, PI, PI / 2, PI / 2, -PI / 2, PI / 2], takedownSpot: [23.0, -7.9] }` | Security tour: the mezzanine stair foot, down the plant room's west side, clocks the east fire exit | 40 s (a loop; it closes from (14.9, 0) to the stair foot) | At the exit door inside the lobby (walls; the fire door is at the lobby's north end, D8) |
| 5 supervisor | `{ kind: 'officer', x: 12.5, z: 4.9, yaw: PI, route: [[12.5, 4.9], [17.0, 12.8], [15.6, 14.9], [12.0, 15.0], [15.6, 14.9], [17.0, 12.8]], wait: 5, waits: [5, 0, 0, 4, 0, 0], faces: [PI, 0, -PI / 2, -PI / 2, PI / 2, PI], takedownSpot: [12.0, 15.0] }` | Line supervisor: checks the CNC cell, pulls parts from the store for the next kit (D18) | 42 s | Between the shelving rows in the parts store (dark; the deck above, the rows either side) |
| 6 fitter | `{ kind: 'grunt', x: 7.6, z: 1.0, yaw: -PI / 2, takedownSpot: [7.6, 1.0] }` | Runs the press | post | At the press: the press, the power unit, the die trolley and the control cabinet screen him (D7) |
| 7 craneOperator | `{ kind: 'grunt', x: 8.0, z: -6.8, yaw: 0, route: [[8.0, -6.8], [14.0, -6.8]], wait: 7, waits: [7, 7], faces: [0, PI], takedownSpot: [8.0, -6.8] }` | Moves dies from the die rack to the press with the pendant | 26 s | West end under the walkway edge (0.65 m north of it: the hang-drop); the cage shelving screens the stores officer |
| 8 storesOfficer | `{ kind: 'officer', x: 4.7, z: -5.0, yaw: 0, route: [[4.7, -5.0], [0.6, -7.6]], wait: 8, waits: [8, 8], faces: [0, PI], takedownSpot: [0.6, -7.6] }` | Issues parts at the cage counter, restocks the back shelves | 26 s | The cage's dark south-west corner; the cage shelving and the press screen the floor |
| 9 plantEngineer | `{ kind: 'grunt', x: 19.4, z: -3.0, yaw: PI, route: [[19.4, -3.0], [20.0, 0.6], [14.9, 0.6], [15.0, -3.3]], wait: 6, waits: [6, 2, 2, 2], faces: [PI, 0, -PI / 2, PI / 2], takedownSpot: [19.4, -3.0] }` | Hourly plant check: the AHU panel, both doors, the valve set | 29 s | At his panel inside the plant room (walls); R3 starts here |

- Cycles 26-42 s (LD 4.3). Overlap on purpose (LD 4.5): the engineer and the tour guard down the plant room's west lane; the crane
  operator and the tour guard by the lobby door; the porter and the loader over the C3 corner (different floors).
- Every takedown spot is a pause point (or a post) and free floor (`world.blocked` false at its y). Scratch M8 (this sheet's pieces,
  `CHECK_RANGE` 15, 30 phases, seeds 1-20, worst run at the spot): porter 8.5 s, loader 7.25, clerk 180, tour 7.25 (static),
  supervisor 7.5 (static), fitter 16.0, crane operator 5.25, stores officer 11.5 (static), engineer 8.0. Statically seen (so the
  phase-drift test applies): porter (by the loader, the supervisor), loader (porter, supervisor, fitter: other floor), clerk
  (supervisor, through the window: other floor), fitter (loader, crane operator), crane operator (tour guard, engineer), engineer
  (tour guard). Without the fitter's three screens the fitter falls to 1.75 s (8 of 10 seeds under 3 s): they stay.

### 6.2 Routes (data; `climbs` = legs i: pts[i] -> pts[i + 1] that the guards' nav does not walk)
- **R1 ground / ledge** - name 'Along the packing line, the forklift and the deck lip, out over the east bay', obj 13, climbs [6, 7, 8, 17]:
  [-1.2, 14.8], [-0.95, 12.6], [-0.95, 11.2], [-1.6, 7.6], [9.6, 7.6], [10.4, 12.6], [12.4, 10.8], [13.5, 10.8, 2.2], [13.6, 12.3, 3.3],
  [16.6, 12.4, 3.3], [17.0, 13.8, 3.3], [17.0, 15.3, 3.3], [22.9, 15.6, 3.3], [23.3, 17.3, 3.3], [22.9, 15.6, 3.3], [17.0, 15.3, 3.3],
  [17.0, 13.8, 3.3], [20.0, 12.3, 3.3], [20.0, 11.2], [18.6, 4.0], [14.9, -0.3], [14.9, -6.3], [17.8, -6.6], [22.5, -7.2].
  - Climb legs: 6 jump-grab the forklift's west lip and climb up; 7 mantle onto the deck (1.1 from the 2.2 top); 8 lower into a hang at
    x 14.6, shimmy east under the x 15.5 laser, climb up at x 16.6; 17 hang-drop off the deck edge into the east bay.
  - East along the conveyor's south side (the porter walks its north side), into the dark parts store front, the forklift, the deck,
    the office door (behind the clerk), out the door, the deck strip, down into the east bay, round the plant room's west side to the
    lobby door (the tour guard's south end).
- **R2 high** - name 'The west strip, the crane walkway and the roofs, along the main to the window', obj 18,
  climbs [5, 9, 10, 11, 12, 13, 15, 20, 22, 23, 24, 25, 26, 28]:
  [-1.2, 14.8], [-0.95, 12.6], [-0.95, 11.2], [-3.0, 9.0], [-3.0, -6.6], [-3.4, -6.9], [-3.2, -8.0, 3.0], [4.0, -8.0, 3.0], [12.0, -8.0, 3.0],
  [16.6, -6.6, 3.2], [17.0, -2.1, 3.8], [17.0, -2.1, 5.8], [17.0, -0.5, 5.0], [17.0, 12.4, 5.0], [17.0, 12.4, 3.3], [19.6, 13.9, 3.3],
  [19.6, 15.2, 3.3], [22.9, 15.6, 3.3], [23.3, 17.3, 3.3], [22.9, 15.6, 3.3], [19.6, 15.2, 3.3], [19.6, 13.9, 3.3], [17.0, 12.4, 3.3],
  [17.0, 12.4, 5.0], [17.0, -0.5, 5.0], [17.0, -1.6, 5.8], [17.0, -2.1, 3.8], [16.6, -6.6, 3.2], [21.7, -7.2, 3.2], [22.5, -7.2].
  - Climb legs: 5 the walkway ladder; 9 the 0.6 step onto the plant roof and on to the riser; 10 the standing grab of the header (2.0);
    11 along the header, the jump down onto the main; 12 hand over hand north over the floor; 13 the drop onto the deck; 15 in through the
    open window; 20 out through it; 22 the standing grab of the main from the deck (1.7); 23 hand over hand south; 24 the jump up to the
    header; 25 the drop onto the plant roof; 26 south over the roof and the 0.6 step down onto the lobby roof; 28 the drop through the hatch.
  - Walked: the walkway (nav at 3.0), the walkway to the lobby roof (0.2 step), the deck, the office, the lobby roof.
  - South along the dark west strip, the ladder, the walkway over the stores officer and the crane operator (hang-drop attacks), the
    roofs, the main, the window (the clerk's back), back the same way, through the hatch into the extraction.
- **R3 service (duct)** - name "The manager's office, past the press, the plant room and the supply duct", obj 14, climbs [12, 15]:
  [-1.2, 14.8], [1.0, 16.05], [3.0, 16.05], [3.2, 13.0], [5.15, 12.6], [5.15, 11.2], [9.6, 10.4], [9.8, 4.0], [10.0, -4.6], [14.9, -4.2],
  [15.2, -3.3], [16.9, -3.3], [22.4, -1.8], [23.65, 15.42, 3.3], [23.3, 17.3, 3.3], [23.65, 15.3, 3.3], [22.4, -1.8], [16.9, -3.3],
  [15.2, -3.3], [14.9, -6.3], [17.8, -6.6], [22.5, -7.2].
  - Climb legs: 12 the duct (unscrew the grate, crawl, out of the grille); 15 the return duct (unscrew the grille, crawl, out of the grate).
  - The manager's office (unlocked when C3 seals), its floor door (5.15, 12), behind the fitter (he faces the press), the plant room's
    west door (the engineer's panel), the grate, the duct, out behind the clerk; back down the duct, out the west door, the lobby.
- **Loud** (not data): rush the stair through the stair head laser; break the cage gate; shoot the lobby lamps.
- **Loops** (SPEC): floor and deck by four ways (stair, forklift, west ladder or office-front wall jump, the main); walkway, lobby roof,
  plant roof, main, deck, floor; the plant room's two doors; the duct both ways.
- Every obj point is (23.3, 3.3, 17.3), 0.9 m from the terminal (the routes test's hack reach is 1.6). Every route ends at (22.5, -7.2)
  in the extract box (floorY 0). The three lists differ.

## 7. Engine points (SPEC 2.3 "Engine fit"; answered by reading the code, not a playtest)
1. **The deck-lip shimmy under the beam: works; no jammer fallback.** A hang puts the feet `HANG.drop` 1.9 under the lip and the body
   0.22 out (anchors.ts:204-208): feet 1.4, body 1.4-3.15 at z 11.63. The beams are at 3.3 + 0.35 / 0.9 / 1.45 = 3.65 / 4.2 / 4.75;
   `laserTouch` (jammer.ts:147) needs a beam height inside the body and the body within `LASER.reach` 0.3 of the beam line
   (jammer.ts:125): neither holds (the hang line is 0.42 from the beam's south end (15.5, 12.05)). The lip is one piece: `cutLip`
   (anchors.ts:363-420) cuts a lip only where a box sits on it or against its face 0.3 under it; the columns are cylinders, not in
   that box list, and the forklift top (2.2) is under the sample height (3.0). Into the hang from the deck top: `reach` ledge 'above'
   (standing within 0.7 of the lip facing out, anchors.ts:711) with drop held. Climb up: `canClimbUp` (deck depth 6.15) and room above.
2. **Climbing in through a closed window: not quietly. The SPEC fallback applies: `open: true`.** `windowProbe` (traversal.ts:265-286)
   vaults a closed window only if it is breakable and breaks the glass on the way through (`breakables.open('glass:<id>', 'break')`,
   traversal.ts:433: loud); closed and unbreakable it is no way at all (traversal.ts:269). Its reach (anchors.ts:729-741): sill
   0.3-1.3 over the feet (deck 3.3, sill 4.2), 0.25-1.4 from the plane, the landing floor within 0.6 of the feet (the office floor is
   the deck). Open, it is a quiet vault.
3. **A 21 m auto-crawl duct: works as built; no shortening.** The duct crawl is the attached state with axis 'path' at 0.9 m/s
   (attach.ts:84); its length is counted in plan (anchors.ts:582-585), so the shaft's 4.7 m rise sits in one sloped 2.3 m leg (a path
   point is feet height and is interpolated along plan length, anchors.ts:595-611). Plan length 16.7 m: about 18.5 s of crawl, plus
   the grate unscrew 1.2 s (`UNSCREW_TIME`, attachController.ts:63) and the crawl out 2.5 s (`DUCT_CRAWL_OUT`, :84), about 22 s door to
   door. Precedent: bunkerDeep's B9 duct is about 30 m. The SPEC fallback (start the shaft at the plant room's north wall) is where it
   starts already. Two code facts shape it: a duct is entered only at its `entry` grate, within 1.1 m and 1.4 m of height
   (anchors.ts:721-727), so the way back is a second, reversed duct anchor and the office grille's centre is 4.6 (1.3 over the deck,
   SPEC 4.8); a high wall exit works (`ductEnd` finds the floor up to 3 m under it, attachController.ts:630-655, crawl-out 1.35 down).
4. **The jump-grab from the plant-room roof to the main: does not exist at these heights; built with the header (D5, L16).** A
   standing grab of a pipe needs it 1.6-2.7 over the feet (anchors.ts:700-703): 5.0 - 3.8 = 1.2. An attached jump from a hang on the
   roof's north lip needs the target at most 1.2 up (anchors.ts:929), and 5.0 - 3.8 is 1.2000000000000002 in floating point. A
   hanging body on the main over the roof would also put the feet (about 3.1) inside the roof (3.8). So: the header at 5.8 over the
   roof (standing grab 2.0), a pipe-to-pipe jump down 0.8 onto the main at 0.7 m (section 2's pipe-to-pipe pattern, findJumpTarget
   2.5 m reach), the main starting 0.35 m north of the roof edge.
5. **The duct exit high in a wall: works** (point 3). **Nav: 3 layers or fewer on the routes** (section 4). **One-way fire doors:** not
   built (E7): the lobby fire door is an unlocked leaf, the exit door visual.
6. **Cameras:** mount heights are relative to the camera's level and must be 2.4-3.5 (config/security.ts:17-18,
   securitySystem.ts:43): SPEC's cam-floor at 4.0 and cam-mezz at 5.4 (2.1 over the deck) fail; D11.
7. **M8 on two floors:** the static check (`spotSeenBy`) counts guards up to 6 m above or below (sectorCheck.ts:199), the time model
   ignores anyone over `CHECK_FLOOR` 2 m away in height (sectorCheck.ts:215, 332). So a deck guard seen from the floor passes in time.
Not answerable from code (playtest): the camera in the duct's sloped rise and in the office corner; whether the shimmy reads under
the laser; whether guards notice a player on the main (G44 vertical sight is not built, so light is the only cover above).

## 8. Tests

### 8.1 Vitest
- `tests/sectorStep3.test.ts:87`: `SECTION_ROOMS[2]` becomes `S3_ROOMS.map((r) => r.id)` (import `S3_ROOMS`).
- `tests/sectors.test.ts`: add "section 3 (warehouse-s23)", like the section 2 test (sectors.test.ts:416):
  - `S[2].id === 'floor'`, `S[2].start` equals section 2's connector checkpoint; the extract label and box as section 6.
  - 9 guards; the first four kinds `['enforcer', 'grunt', 'officer', 'runner']`; none `heavy`, `sniper` or `dog`.
  - The e2e stand (objective x + 0.9, z) at y 3.3: `world.blocked(..., 3.3, ..., 0.3)` false; every door hinge over 1.6 m; every
    first-four guard slot over 1.8 m. The extract box centre at y 0: `world.blocked` false; no guard slot within 1.8 m.
  - Rooms: every `S3_ROOMS` id present, 'mezz' absent; the objective is inside `prodOffice` (and on its storey, y 3.3), the extract box
    centre inside `fireLobby`; every route's obj point free at y 3.3.
- Extend the phase-drift test (sectors.test.ts:334) to all three sections (rename it "sections 1-3 A2 survive ...").
- Existing tests that must still pass unchanged: three sections, ids, kinds; guard counts rise or hold (8, 8, 9); slots 7 m or more from
  the start; routes (start within 0.5 m, obj within 1.6 m, last point in the exit, climb indices in range, unique lists); M8 (static
  or in time); devices 2/2/3 and 2/1/2 and `validateSecurity`; connector doors (C3 near and far, the manager's door (2, 16.05)); the plain
  Warehouse (318, 14, 5); `voxelFit`; `rooms` (nesting, storeys).
- New `tests/warehouseS3Light.test.ts`, the pattern of `tests/warehouseS2Light.test.ts` with `SEC = WAREHOUSE_SECTORS[2]` and
  `S3_LIGHT_PASS`:
  - SPOTS: every route waypoint (feet y = the point's y; a pipe grip (y 4.5 or more) reads its feet 2.0 lower), class READ 0.40-CAP
    0.55, the obj points KEY 0.45-WORK 0.80; the named points: the C3 checkpoint, the C3 far doorway outside (-0.95, 0, 11.2) KEY;
    the walkway ladder foot (-3.4, 0, -6.9), the plant room west door both sides (15.2 / 16.9, -3.3), the grate (22.4, 0, -1.8), the grille
    (23.65, 3.3, 15.3), the window outside (19.6, 3.3, 13.9), the lobby (17.8, 0, -6.6), the extract centre (22.55, 0, -7.2), the hatch edge
    (21.7, 3.2, -7.2) KEY-CAP; the main's middle (17.0, 3.0, 6.0) READ-CAP; the staffed areas WORK floor 0.55 to 0.80: the fitter
    (7.6, 0, 1.0), the packing end (8.0, 0, 9.7), the cage counter (4.7, 0, -5.0), the engineer's panel (19.4, 0, -3.0), the clerk
    (18.6, 3.3, 17.1), the terminal (22.4, 3.3, 17.3); the porter's and the tour guard's takedown spots READ-CAP.
  - POCKETS (named, at their own floor; 0.30 or less and at most +0.05 over the level without the pass): the supervisor (12.0, 0, 15.0),
    the loader (3.0, 3.3, 13.2), the crane operator (8.0, 0, -6.8), the stores officer (0.6, 0, -7.6), the east bay (21.0, 0, 1.5), the
    deck's west end (-2.0, 3.3, 15.5).
  - Every new lamp in the bake; the lamps lift more than half the spots by 0.05; sections 1 and 2 read the same with the S3 lamps off and
    on within 0.02 (grid points x -23..-6 at z -5..17, and x -23..23 at z -24..-10), but beside the C3 near doorway (within 6 m of
    (-4, 14.55)); no 2 m column over `LAMP_GRID_SLOTS`; lamps under the bake top; `WH3LIGHT_PRINT=<file>` writes the table to a new
    `docs/warehouse-s23/LIGHT-S3.md`.
- Owned by the lamp agent, to re-read once section 3 lands (not this build's files): `warehouseS2Light.test.ts` pins the C3
  checkpoint and doors at KEY-CAP (the C3 lamps give 0.47-0.52, scratch) and reads two old deck points at y 2.6 (now inside the
  slab; the test is an off/on difference, so it should hold); both S1 and S2 light tests count every map lamp in their column cap.

### 8.2 e2e-sectorops (no logic change; data-driven)
- The ghost walk: section 3's exit does nothing before the objective; at (23.3, 3.3, 17.3) the hold hacks the terminal (no door within
  1.6 m, no guard within 1.8 m); the teleport to the extract box centre (22.55, 0, -7.2) ends the run (VICTORY, Ghost).
- Nav: every non-climb leg above has a path within 2.5 x + 6 m (deck and office legs need the 3.3 seeds; walkway legs the 3.0 seed;
  the walkway-to-lobby-roof leg the 0.2 step); section 3's objective and exit are reachable (C3, the stair, the office door; back
  down the stair, the lane, the lobby door); sealed: section 2's start reaches section 3's objective only through C3 (the x -4 wall is
  6.0 with a parapet; the north and east wall tops now have parapets).
- The suppressed-shot spot (section 1's guards): unaffected (section 2 alone offers 39 cells with 4 guards).
- Optional `SECTOR_SHOTS` block (e2e-sectorops.mjs:555): the deck shot moves from (16, 2.6, 13.4) (inside the new slab) to
  `shot('s3-deck', 16.8, 3.3, 12.6, Math.PI, 0.3)`.
- No other suite changes. Run `npm run check` and e2e-sectorops (e2e-coop / e2e-netmove only if `src/game` or `src/net` change; this
  sheet changes neither).

### 8.3 M8 adjustment ladder (if a guard fails the M8 or phase-drift test)
As BUILD-S2 8.3: move a wait or a point up to 2 m, never geometry. In order, one change at a time, rerun:
1. Raise that guard's wait at its spot by 2 s (max 8).
2. Shorten a pause of the guard that sees it (name from the failure) by 2 s (min 2).
3. Move the spot point (and the route point) up to 2 m along its own line, keeping the 7 m slot rule, the pause and free floor.
4. Log it in the step report; if a guard still fails, stop and report (the only screens this sheet adds are the fitter's three).

### 8.4 Lamp adjustment ladder (if a light pin fails in the bake)
In order, one lamp at a time: (1) that point's nearest lamp's intensity by 15 % steps (0.2-1.6); (2) move it up to 1.0 m in plan
towards (too dark) or away from (too bright) the point, never over a pipe line; (3) its radius by 0.5 m, never past the column cap.
Pockets are fixed at 0.30: lower the lamp that lifts them, never move the pocket. Log every change in `LIGHT-S3.md`.

## 9. Deviations from SPEC 2.3 (decided here, each with its reason; the job lead can overrule)
- **D1** The office door is in the south wall at (17.0, 14.5), not the west wall (16, 16.3): the west door stood 0.5 m east of the x 15.5
  laser, so no one could reach it without touching the beam (reach 0.3), and R1 climbs up east of the laser.
- **D2** The window is at x 19.6 (SPEC 19.0) and open (section 7 point 2); at 19.0 its landing was 1.75 m from the clerk, inside the
  1.8 m "anyone notices a moving body" range (perception.ts:31).
- **D3** The clerk sits at his desk on the north wall, (18.6, 17.1) facing north (SPEC (18.2, 17.0) facing the window): the window,
  the door and the grille are all behind him (over 100 degrees, past the peripheral cone, perception.ts:21).
- **D4** The duct: the exit grille is in the office's south wall at x 23.65, centre y 4.6 (SPEC (23.6, 4.8, 14.8)), and a second,
  reversed duct anchor makes it two-way (section 7 point 3).
- **D5** The main runs z -0.5 to 12.6 at 5.0 with a header at 5.8 over the plant roof (SPEC `pipeH(17.0, -1.0, 17.0, 12.8, 5.0)` and a
  jump from the roof): section 7 point 4. New loosening L16 (BRIEF.md).
- **D6** The east cell machines are at x 12.5 (SPEC 14) and 2.4 m tall: at x 14 the machine left 0.35 m beside the plant room's west
  wall, where the SPEC tour route walks; 2.4 makes them full cover (they screen the stair foot and the fitter).
- **D7** The press gets a power unit, a die trolley and a control cabinet (real press-cell kit): without them the fitter has no 3 s
  window under phase drift (section 6.1).
- **D8** The tour guard's takedown spot is his fire-exit clocking point inside the lobby (23.0, -7.9), not the stair foot (seen there
  by the fitter, the supervisor and the engineer); the lobby fire door is at (16, -6.3) (SPEC (16, -7.2)) so the lobby's inside is
  out of every line from the hall; his slot is the stair foot, so no guard stands in the extract box at the start.
- **D9** The engineer's loop points (19.4, -3.0), (20.0, 0.6), (14.9, 0.6), (15.0, -3.3) (SPEC (18.5, -3.3), (20.0, -0.2), (15.2, -0.2),
  (15.2, -3.3)): door jamb and leaf clearances; the north door opens outwards.
- **D10** The stair is x 22.1-23.3 (SPEC 22.2-23.4) with the flights at z 4.85-7.35 and 9.35-11.85, the landing 7.35-9.35: room for the
  duct casing at the wall, and the top flush with the deck edge at 11.85 (the office fronts' south face).
- **D11** cam-floor (23.6, 1.2) y 3.5 facing 260 sweep [230, 290] (SPEC (23.6, -0.8), inside the riser shaft, at y 4.0 over the mount
  limit); cam-mezz y 2.4 over the deck (SPEC 5.4 absolute = 2.1, under the 2.4 minimum).
- **D12** Reinforcement point (20.8, 6.5), not (22.5, 6.5) (on the stair).
- **D13** Parapets on the north (x -4 to 24) and east (z -8.8 to 19) perimeter tops: A4 extended to section 3 (a seal; section 2.1).
- **D14** Guard order porter, loader, clerk, tour guard first (SPEC numbering supervisor first): `?sectorGuards=4` then has a guard at
  the entry, the deck, the objective and the exit.
- **D15** The stores officer waits 8 / 8 and the crane operator 7 / 7 (SPEC 6 / 6): their cycles were 22 s and 24 s, under LD 4.3's 25.
- **D16** The supervisor's loop goes round the shelving rows' east ends ((12.5, 4.9), (17.0, 12.8), (15.6, 14.9), (12.0, 15.0) and back): the
  SPEC points crossed a shelving row and a column; (14.0, 4.5) was against the moved machine.
- **D17** 42 small lamps instead of SPEC's 9 (M1 readability; section 3.7). No rafters (light shapes).
- **D18** The deck's south edge is z 11.85, the base z 12 and x 2 walls are 3.0 high, and a new x 8 wall closes the manager's office
  (the old solid deck block was its east wall).
- **D19** The deck crates, archive racking, shelving and machines are noLedge: cover, not perches.
- **D20** The riser shaft stands 5.9 (over a roof mantle), and the duct casing is solid and noLedge (it screens the crawler; no secret
  walk along its top over the stair laser).
