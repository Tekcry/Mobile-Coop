# Section 2 build sheet - storage hall (warehouse-s23)

Spec writer, 2026-10-20. Source: `docs/warehouse-redesign/SPEC.md` 2.2 (the design), 3 (co-op), 4 (L1-L15), 5 (the
section 1 sheet's format), 6 (C1 / A2, N1 / A3, E7 / A7); `docs/warehouse-redesign/step4-report.md` (how section 1 was
built). Code read on master cf73f8b5. Build this exactly; every deviation from SPEC 2.2 is listed in section 9 with its
reason. No design judgement is left to the builder except the M8 adjustment ladder in section 8.3.

Frame (the code's, same as SPEC): x west to east, z south to north (+z north), y up, metres. Yaw 0 faces +z,
yaw PI/2 faces +x. Camera `facing` is degrees, 0 = +z. `W:n` = `src/world/maps/warehouse.ts` line n,
`O:n` = `warehouseOps.ts`, `S:n` = `warehouseSectors.ts`.

The hall: x -24 (perimeter inner face) to x -4 (wall centre line, west face -4.15), z -6 (wall centre, north face
-5.85, built by section 1) to z 18 (perimeter inner face). 20 x 24 m, no roof to stand on (the base roof strips over it are
visual only, W:373-377).

---

## 1. How it plugs in

Section 1 (`warehouseS1.ts`) and section 3 (everything in `buildWarehouse` and `opsPieces` east of x -4) are unchanged.
C2 (section 1's exit, far door (-14.5, -6)) and C3 (near door (-4, 14.55), far door (-0.95, 12)) keep their doors, boxes
and checkpoints, so the run still flows 1 -> 2 -> 3.

### 1.1 `src/world/maps/warehouse.ts`
Add `WarehouseOpts.storageHall?: boolean` (default true; doc: "the base racking hall west of x -4 from z -6; Sector Ops
sets it false and builds section 2 itself (`warehouseS2.ts`). Used only with `southBand: false`."). Let
`const sh = o.storageHall !== false;`. When `sh` is false, skip:
- the x -4 wall from z -6 to 18: W:193 becomes `} else if (sh) wallZ(b, -4, -6, 18, gx4);` (section 2 builds its own,
  6.0 high, 1.4).
- W:245-268: the four racks with beams, uprights and loads, the three ladders, the aisle-wall pallets.
- in the lamp loop W:379-385: every strip with `x < -4` (with `southBand: false` that is the x -18 and x -9 strips at
  z -3, 3, 9, 15; lit and unlit). Add `if (!sh && x < -4) continue;` as the inner loop's first line.
- W:396: the rack-top `metal` surfaces.

Keep everything else (the perimeter, floors, the visual roof strips, the building ambient zone W:392, section 3).
The plain `warehouse` passes no options, so its counts stay 318 boxes, 14 cylinders, 5 doors (the existing Vitest).

### 1.2 New `src/world/maps/warehouseS2.ts`
Same shape as `warehouseS1.ts`: the colour constants it needs (CONCRETE, WALL, WALL_DARK, STEEL, CRATE, DESK, SHRINK,
PIPE, HAZARD, `RACK = '#3f6f9a'` (the art program dresses this colour as racking bays, `warehouseArt.ts:23,80`),
`BEAM = '#e07b22'`), `T = 0.3`, `PI`, and local copies of the `lintel` helper (or export it from `warehouseS1.ts`).
Exports:
- `buildStorageS2(b: LevelBuilder): void` - everything in sections 2 and 3 of this sheet.
- `S2_ROOMS`, `S2_SWITCHES`, `S2_PICKUPS`, `S2_NAV_SEEDS` (section 4).
Header comment: "Sector Ops section 2 of the Warehouse (warehouse-s23, SPEC 2.2, BUILD-S2.md): the storage hall, a
greybox."

### 1.3 `src/world/maps/warehouseOps.ts`
- Import `buildStorageS2, S2_NAV_SEEDS, S2_PICKUPS, S2_ROOMS, S2_SWITCHES` from `./warehouseS2`.
- `opsPieces`: call `buildStorageS2(b)` right after `buildServiceS1(b)`. Keep C3 (O:38-40: the near door and the desk).
  Delete the old section 2 M8 pieces O:42-56 (two ladders, three planks, the shrink-wrapped loads and the chicanes).
  Keep section 3 (O:58-73). Update the comment at O:33 and O:42 to say section 2 is `warehouseS2.ts`.
- `build()`: add `storageHall: false` to the options (keep `southBand: false`, `gapsX4`, `gapsZ12`, `officeSwing`,
  `officeDesk`, `extra`).
- Rooms: `gone` becomes `new Set(['dock', 'dispatch', 'workshop', 'corridor', 'racking'])`; the list is
  `[...base kept, ...S1_ROOMS, ...S2_ROOMS]`.
- Replace the `north` filter (O:108) with `const s3 = (x: number, z: number): boolean => x > -4 && z >= -8.8;` (a base
  item now belongs to section 3 only; this drops the base S2 items: the switch (-4.15, 2), the pickup (-14.5, 5.2), the
  prop `smallCrate` (-6.4, 11.5), the enemy spawns (-18.5, 10) and (-12.5, 5.2)). Use it for `props`, `pickups`,
  `hideSpots`, `switches` and `enemySpawns` (`lay.enemySpawns.filter((v) => s3(v.x, v.z))`).
- `pickups`: add `...S2_PICKUPS`; `switches`: add `...S2_SWITCHES`; `navSeeds`: add `...S2_NAV_SEEDS` (keep the
  existing (-14.5, 0, 5.2): it is in the cross aisle).
- `description`: 'Three sections in a row: the service entrance, the storage hall, the factory floor and mezzanine.'

### 1.4 `src/world/maps/warehouseSectors.ts`
- Replace `WAREHOUSE_SECTORS[1]` (S:76-124) with section 6 of this sheet. Keep `id: 'racking'` (e2e-sectorops:190 finds
  `racking-obj`; sectors.test asserts the ids).
- Devices: replace `cam-rack-sw`, `cam-rack-ne` (S:179-180) and `laser-north-aisle` (S:191) with section 5. Counts stay
  cameras 2/2/3, lasers 2/1/2. `WAREHOUSE_OPS_ALARMS` unchanged (section 2's panel (-4.15, 1) stands in `storage`).
- The header comment's "10, 10 and 11 guards" becomes "8, 8 and 11".

---

## 2. Walls, roof, parapets
- **x -4 compartment wall** (6.0, SPEC 2.2 build notes): `b.wallZ(-4, -6, 18, [[14, 15.1]], 6.0, WALL, T)`. Head over
  the C3 near doorway: `lintel(b, -4, 4.05, 14.55, T, 3.9, 1.1)` (y 2.1-6.0, overhead). The C3 door itself stays in
  `opsPieces` (O:39). This raises section 3's west wall from 3.2 to 6.0 (section 9, item D1).
- **Parapets** (y 6.0-7.5, all `noLedge`; mark them with `b.mark(p0, { noLedge: true })`):
  - x -4 wall: `b.box(-4, 6.75, 6.0, T, 1.5, 24.0, WALL_DARK)` (z -6 to 18).
  - West perimeter top: `b.box(-24.5, 6.75, 5.925, 1.0, 1.5, 24.15, WALL_DARK)` (z -6.15 to 18; meets section 1's at
    -6.15).
  - North perimeter top: `b.box(-14.5, 6.75, 18.5, 21.0, 1.5, 1.0, WALL_DARK)` (x -25 to -4).
  - Why (a seal, not decoration): the perimeter is a plain 6.0 box whose top makes lips. From W0's top (4.0, against the
    west perimeter) that lip is 2.0 up, inside a standing grab (`REACH.grabMin` 1.6 - `grabMax` 2.7, `anchors.ts:212`),
    and from the north branch pipe (5.0, 2.0 m from x -4) the x -4 lip is a pipe-to-lip jump (2.1 m, 1.0 up;
    `findJumpTarget` takes up to 2.5 m and 1.2 m up). A parapet covering the whole top leaves no 0.35 m clear above
    the lip (`LEDGE.clearAbove`), so no lip is generated (section 1 does the same, step4 report).
- **z -6 wall**: section 1's (6.0, parapet, the C2 far door). No change.
- **Roof**: none to build. The base strips at y 6.15 stay visual. No slabs, no ceilings in this hall.
- **Columns**: none (single-span portal frames, SPEC 1). Two visual rafters on the frame lines:
  `b.box(x, 5.75, 6.0, 0.3, 0.5, 24.0, STEEL, 0, 0, false)` for x = -16 and -8.
- **Windows**: none (a racked hall; SPEC 2.2 has none).
- **West fire exit** (x -24, z 5.5, on the cross aisle): visual only, no gap in the perimeter (the gable is the map
  edge; SPEC E7). Leaf `b.box(-23.97, 1.05, 5.5, 0.06, 2.1, 1.2, STEEL, 0, 0, false)`, push bar
  `b.box(-23.92, 1.0, 5.5, 0.04, 0.06, 1.0, HAZARD, 0, 0, false)`.

## 3. Traversal, contents, lights

### 3.1 Racks (real sizes: 1.1 m single-depth, 2.3 m back-to-back with the flue, 2.7 m bays; greybox height 4.0)
Solid `block(cx, cz, w, 4.0, d, RACK)` each (top 4.0, so ledges on every edge: drop 4.0 is over `LEDGE.minDrop` 1.9).

| Block | x | z | Call |
| --- | --- | --- | --- |
| W0S (wall row, single) | -24 .. -22.9 | -3 .. 4 | `block(-23.45, 0.5, 1.1, 4.0, 7.0, RACK)` |
| W0N (cut by the cage) | -24 .. -22.9 | 7 .. 12 | `block(-23.45, 9.5, 1.1, 4.0, 5.0, RACK)` |
| R1S | -19.9 .. -17.6 | -3 .. 4 | `block(-18.75, 0.5, 2.3, 4.0, 7.0, RACK)` |
| R1N | -19.9 .. -17.6 | 7 .. 15 | `block(-18.75, 11.0, 2.3, 4.0, 8.0, RACK)` |
| R2S | -15.8 .. -13.5 | -3 .. 4 | `block(-14.65, 0.5, 2.3, 4.0, 7.0, RACK)` |
| R2N | -15.8 .. -13.5 | 7 .. 15 | `block(-14.65, 11.0, 2.3, 4.0, 8.0, RACK)` |
| R3S | -10.5 .. -8.2 | -3 .. 4 | `block(-9.35, 0.5, 2.3, 4.0, 7.0, RACK)` |
| R3N | -10.5 .. -8.2 | 7 .. 15 | `block(-9.35, 11.0, 2.3, 4.0, 8.0, RACK)` |

- Per block, two visual beam boxes: `b.box(cx, y, cz, w + 0.08, 0.1, d + 0.04, BEAM, 0, 0, false)` at y 1.35 and 2.7.
- Surfaces: `b.surface('metal', x0, x1, z0, z1, 4.0)` for each block's plan box.
- Aisles that result: A1 x -22.9 to -19.9 (3.0); **A2 x -17.6 to -15.8 (1.8, VNA, L14)**; A3 x -13.5 to -10.5 (3.0);
  east gangway x -8.2 to -4.15 (4.05 clear).
- Gangways: the marshalling lane z -5.85 to -3; the cross aisle z 4 to 7; the north gangway z 15 to 18.

### 3.2 The high-value cage (x -24 to -19.9, z 12 to 18; mesh `fence`, 2.4 high, open top)
Its sides: the west perimeter; W0N's north face (x -24 to -22.9 at z 12); the south fence; R1N's west face (z 12 to 15);
the east fence (z 15 to 18); the north perimeter.
- South fence with the gate gap x -21.9 to -20.9: `b.fence(-22.9, 12, -21.9, 12, 2.4)`, `b.fence(-20.9, 12, -19.9, 12, 2.4)`.
- South gate (locked; "force the cage gate" is the loud way): `b.door(-21.9, 0, 12, 1.0, PI / 2, { swing: -1, locked: true, breachable: true })`
  (centre (-21.4, 12); swing -1 opens north into the cage).
- East fence with the gate gap z 15.9 to 17.1: `b.fence(-19.9, 15.0, -19.9, 15.9, 2.4)`, `b.fence(-19.9, 17.1, -19.9, 18.0, 2.4)`.
- East gate (the issue point, unlocked leaf): `b.door(-19.9, 0, 15.9, 1.2, 0, { swing: -1 })` (centre (-19.9, 16.5);
  yaw 0 with swing -1 opens west into the cage, like the C3 near door).
- Shelving along the west wall: `b.block(-23.6, 15.4, 0.8, 2.0, 4.4, STEEL)` (x -24 to -23.2, z 13.2 to 17.6).
- Stock ladder against W0N's north face: `b.ladder(-23.45, 12.25, 0, 4.0, PI, STEEL)` (top (-23.45, 4.0, 11.8) on W0N).

### 3.3 Ladders, pipes, splits
- Fixed "rolling" ladders (SPEC: they do not roll), all `STEEL`, 0.25 m off their face:
  - R2N in the cross aisle: `b.ladder(-14.65, 6.75, 0, 4.0, 0, STEEL)` (top (-14.65, 4.0, 7.2)).
  - R3S, east face at its south end: `b.ladder(-7.95, -2.6, 0, 4.0, -PI / 2, STEEL)` (top (-8.4, 4.0, -2.6)).
  - A2 inspection ladder on R1N's east face, south of the beam: `b.ladder(-17.35, 13.4, 0, 4.0, -PI / 2, STEEL)`
    (top (-17.8, 4.0, 13.4)). This is SPEC 2.2's fallback "a third ladder on R1" (section 7, points 4 and 5).
  - The cage stock ladder (3.2).
- Sprinklers (L6), all `PIPE`:
  - Riser: `b.pipeV(-23.85, 6.4, 0, 5.0, -PI / 2)` (against the west perimeter, beside the exit; the climber faces -x).
  - Cross main: `b.pipeH(-23.85, 6.4, -6.0, 6.4, 5.0)` over the cross aisle, 0.6 m off the north blocks' south faces.
  - North branch: `b.pipeH(-6.0, 6.4, -6.0, 15.4, 5.0)` over the east gangway.
  - Visual hangers: `b.box(x, 5.45, 6.4, 0.05, 0.9, 0.05, PIPE, 0, 0, false)` at x -20, -16, -12, -8; and
    `b.box(-6.0, 5.45, z, 0.05, 0.9, 0.05, PIPE, 0, 0, false)` at z 10, 14.
- Split: no anchor to place. The engine generates split gaps from opposed faces 1.2-1.95 apart and at least 3.6 tall
  (`SPLIT`, `anchors.ts:280`): A2's rack faces (1.8 apart, 4.0 tall) give splits along R1S/R2S and R1N/R2N.
- Crawl spaces: none (SPEC 2.2 has none).

### 3.4 Contents and cover (heights are cover classes: 0.9 low, 1.6-2.0 full)
- Staged delivery (lane north side): `b.block(-19.7, -3.9, 3.4, 1.8, 1.2, SHRINK)` (x -21.4 to -18.0, z -4.5 to -3.3)
  and `b.block(-9.7, -3.9, 2.6, 1.8, 1.2, SHRINK)` (x -11.0 to -8.4). A1 keeps 1.5 m open (x -22.9 to -21.4), A2, the
  C2 door and A3 (x -13.5 to -11.0) stay open.
- Charge bay: charger `b.block(-4.5, -5.2, 0.5, 1.6, 1.0, STEEL)`; empty-pallet stack `b.block(-6.0, -2.8, 1.6, 2.0, 1.2, CRATE)`.
- Issue desk (on the north wall, the cage officer's right): `b.block(-17.0, 17.6, 1.6, 0.9, 0.8, DESK)`.
- Goods-out corner: wrapper turntable `b.block(-6.0, 17.35, 1.2, 0.15, 1.2, STEEL)`, mast `b.block(-6.0, 17.85, 0.3, 2.4, 0.2, STEEL)`;
  wrapped stack `b.block(-9.0, 16.6, 1.2, 1.8, 1.2, SHRINK)` (screens the cage officer from the loader).
- Cover is generated from every solid piece; nothing extra to mark.

### 3.5 Ledges, boosts, drops (by code: section 7)
- Rack-top lips, 4.0: no solo wall jump (`WALL_JUMP.maxUp` 3.8), so they are co-op targets (L8) with solo ways up:
  the four ladders, the riser (to the main only), and a standing grab from the staged pallets' tops (1.8) onto R1S's
  and R3S's south lips (2.2 up, 0.6 m across, `REACH`).
- Co-op (SPEC 3): boost or human ladder onto any rack-end top (4.0 is within `boostMax` 4.5 and `ladderGrab` 4.1);
  boost over the cage fence (2.4); hang-down from a rack top into A2 for the partner; split and drop (one braced in A2,
  one dropping into the cage from R1N).
- Hang-drops: R1N's west lip into the cage (z 12 to 15); R1N's north lip into the north gangway; any lip into an aisle.
- Pipe entries (no standing grab reaches 5.0 from a 4.0 top, section 7 point 2): from a hang on any north block's
  south lip (z 7), jump back to the cross main; from the riser's top, jump back (+x) to the main; at the main's east
  end, jump north to the branch.

### 3.6 Lights (`lamp` helper as in `warehouseS1.ts:288`, fixture `{ sx: 0.5, sy: 0.08, sz: 0.5, oy: 0.1 }`; exit
signs fixture `{ sx: 0.3, sy: 0.12, sz: 0.06, oy: 0.06 }`; new circuits 40-42)

| Light | Position (x, y, z) | Radius | Intensity | Colour | Group |
| --- | --- | --- | --- | --- | --- |
| Lane work lamp | (-19.5, 5.05, -4.6) | 6 | 0.8 | warm (1, 0.92, 0.75) | 40 |
| Issue desk | (-17.0, 2.6, 17.4) | 4 | 0.8 | warm | 41 |
| Exit sign, west exit | (-23.6, 2.4, 5.5) | 3 | 0.4 | green (0.5, 1, 0.6) | 42 |
| Exit sign, C3 door | (-4.6, 2.4, 14.55) | 3 | 0.4 | green | 42 |
| Charger indicator | (-4.6, 1.8, -5.2) | 3 | 0.4 | green | 42 |

- Everything else is dark (the building's ambient 0.12, W:392): every aisle, the cross aisle, the rack tops, the
  lane's east half, the charge bay, the east gangway. The base lamp strips over the hall are gone (1.1).
- Switches (`S2_SWITCHES`): `{ pos: (-13.2, 0, -5.85), yaw: 0, group: 40 }` (by the C2 door, north face of z -6) and
  `{ pos: (-15.9, 0, 17.85), yaw: PI, group: 41 }` (by the issue desk, on the north wall).
- Vantages (L11): the C2 doorway (the lane), A2's south mouth (A2 and the cross aisle), the riser foot (A1 and the cross
  aisle), R2N's top (A3, the cage desk, the east gangway). Every guard reads from at least one.

## 4. Rooms and data lists
| id | name | x | z |
| --- | --- | --- | --- |
| storage | Storage Hall | -24 .. -4 | -6 .. 18 |
| hvCage | High-value Cage | -24 .. -19.9 | 12 .. 18 |

(`squad: []`; `roomAt` takes the smallest room, so order does not matter.)
- `S2_PICKUPS`: `{ pos: (-4.7, 0, 9.0), kind: 'ammo' }` (east gangway, against the x -4 wall).
- `S2_NAV_SEEDS`: the cage floor (-21.4, 0, 14.0); the rack tops at y 4.0: (-23.45, 4, 0.5), (-23.45, 4, 9.5),
  (-18.75, 4, 0.5), (-18.75, 4, 11), (-14.65, 4, 0.5), (-14.65, 4, 11), (-9.35, 4, 0.5), (-9.35, 4, 11).
- Nav layers: at most 2 per column (floor, rack top or shelving top), under the limit of 3.
- No hide spots (SPEC 2.2 has none; bodies go in the dark aisles).

## 5. Devices (ids kept, moved; section 1)
- `cam-rack-sw`: `{ kind: 'camera', level: 'ground', at: [-23.6, -5.6], y: 2.8, facing: 15, sweep: [0, 40], reason: 'Section 2: up the west aisle', section: 1 }`.
- `cam-rack-ne`: `{ kind: 'camera', level: 'ground', at: [-4.4, 17.6], y: 2.8, facing: 255, sweep: [235, 285], reason: 'Section 2: the north gangway to the office door', section: 1 }`.
  (It covers the gangway the player walks to the door, not the door below it; time the sweep or jam it.)
- `laser-north-aisle`, the VNA aisle sensor: `{ x1: -17.55, z1: 14.8, x2: -15.85, z2: 14.8, ys: [0.35, 0.9, 1.45], label: 'VNA aisle sensor', section: 1 }`.
- Alarm panel unchanged: (-4.15, 1), yaw -PI/2, section 1.
- Both cameras pass `validateSecurity` (mount 2.4-3.5, sweep under 120).

## 6. Section 2 data (`WAREHOUSE_SECTORS[1]`)
- `id: 'racking'`, `name: 'Storage hall'`.
- `start: { x: -14.5, y: 0, z: -7.2, yaw: 0 }` (C2's checkpoint; unchanged).
- `objective: { kind: 'grab', label: 'Take the case from the cage', x: -23.0, y: 0, z: 15.0, yaw: -PI / 2 }`.
  e2e stand point (x + 0.9) = (-22.1, 15.0): free floor (shelving face -23.2), nearest door hinges (-21.9, 12) at 3.0 m and
  (-19.9, 15.9) at 2.4 m (rule: over 1.6), nearest first-four guard the cage officer at 5.4 m (rule: over 1.8), the
  stock ladder at 3.1 m.
- `connector`: unchanged (S:81-88): label 'Into the office', box [-3.6, 12.4, 1.6, 17.6], nearAt [-4, 14.55],
  farAt [-0.95, 12], sealUnlocks [[2, 16.05]], checkpoint { x: -1.2, y: 0, z: 14.8, yaw: PI }.
- `reinforce: [[-22.5, 5.5], [-6.2, -5.0]]` (the west fire exit, the charge bay), `perStage: 2`.

### 6.1 Guards (8; no heavies, dogs or snipers, G155; in this order, so `?sectorGuards=4` takes the checker, the reach
driver, the stocktaker and the cage officer: the lane, A3, A1 and the cage, one per route)
Walk = archetype `walkSpeed` x 1.1 (grunt 0.99, officer 0.935, enforcer 0.88, runner 1.43 m/s). Every slot is at least
7 m from the start (the slot is route[0]). `wait` is the first entry of `waits`.

| # | Data | Reason | Cycle | Isolation moment (takedown spot) |
| --- | --- | --- | --- | --- |
| 1 checker | `{ kind: 'enforcer', x: -21.6, z: -5.0, yaw: 0, route: [[-21.6, -5.0], [-9.6, -5.0]], wait: 5, waits: [5, 5], faces: [0, 0], takedownSpot: [-21.6, -5.0] }` | Team leader: checks the staged delivery against the put-away list | 37 s | West end, by the west pallet row, while the stocktaker is at A1's north end (16 m), the driver off the lane and the tour guard off his lane point |
| 2 reachDriver | `{ kind: 'grunt', x: -11.6, z: 10.5, yaw: PI / 2, route: [[-11.6, 10.5], [-11.6, -4.2]], wait: 5, waits: [5, 6], faces: [PI / 2, PI / 2], takedownSpot: [-11.6, 10.5] }` | Puts the staged pallets away into A3's north locations (R3's west face) | 41 s | A3 north end, dark between R2N and R3N, while the tour guard is west of A3 |
| 3 stocktaker | `{ kind: 'officer', x: -21.4, z: 1.0, yaw: -PI / 2, route: [[-21.4, 1.0], [-21.4, 11.0]], wait: 5, waits: [5, 5], faces: [-PI / 2, PI / 2], takedownSpot: [-21.4, 11.0] }` | Cycle count of W0 and R1 bays from A1 | 31 s | A1 north end at the cage's south fence; R1N screens the cage desk; while the tour guard is off the fire exit |
| 4 cageOfficer | `{ kind: 'officer', x: -17.0, z: 16.8, yaw: -PI / 2, takedownSpot: [-17.0, 16.8] }` | Keyholder: issues high-value stock to the pickers, facing the east gate | post | Static: R1N, R2N, R3N and the wrapped stack screen every other guard |
| 5 picker | `{ kind: 'grunt', x: -7.4, z: 14.6, yaw: PI, route: [[-7.4, 14.6], [-7.4, 0.5]], wait: 4, waits: [4, 4], faces: [PI / 2, -PI / 2], takedownSpot: [-7.4, 0.5] }` | Picks the 06:00 trade orders from R3's east face to the goods-out corner | 37 s | South end: R3S and the empty-pallet stack screen the lane and the charge bay; the loader is 15.8 m off |
| 6 tourGuard | `{ kind: 'runner', x: -23.2, z: 5.5, yaw: -PI / 2, route: [[-23.2, 5.5], [-12.6, 5.5], [-12.6, -4.0], [-12.6, 5.5], [-14.6, 5.5]], wait: 4, waits: [4, 0, 4, 0, 3], faces: [-PI / 2, 0, -2.4, 0, -PI / 2], takedownSpot: [-14.6, 5.5] }` | Security tour: clocks the west fire exit and the C2 lobby door, checks the VNA barrier at A2 | 39 s (a loop; the closing leg runs back along the cross aisle) | Paused at (-14.6, 5.5) facing A2, under the cross main: taken from A3 behind him or by a drop from the main; R2's blocks screen A3 and the cage desk |
| 7 chargeHand | `{ kind: 'grunt', x: -5.3, z: -5.2, yaw: PI / 2, takedownSpot: [-5.3, -5.2] }` | Night battery change for the reach and picking trucks | post | While the checker is at the west end (16 m); the east staged row, R3S and the empty-pallet stack screen the driver, the tour guard and the picker |
| 8 loader | `{ kind: 'grunt', x: -6.0, z: 16.2, yaw: 0, takedownSpot: [-6.0, 16.2] }` | Wraps and labels the picked orders for C3, facing the wrapper | post | While the picker is at his south end (15.8 m); the wrapped stack screens the cage officer, R3N the driver |

- Cycles are inside LD 4.3 (25-45 s). Overlap on purpose (LD 4.5): the checker and the driver share the lane, the tour
  guard and the driver share A3 (x -12.6 and -11.6, 1 m apart), the picker and the loader share the goods-out corner.
- Every takedown spot is a pause point (the check counts only moments within 1.6 m of the spot, `CHECK_SPOT`; a walk-
  through gives under 3 s) and is free floor (`world.blocked` false).

### 6.2 Routes (data; `climbs` = legs i: pts[i] -> pts[i + 1] that the guards' nav does not walk)
- **R1 ground / shadow** - name 'West behind the pallets, up A1 and over the cage fence', obj 6, climbs [4, 7]:
  [-14.5, -7.2], [-14.5, -5.4], [-22.1, -5.4], [-22.2, -3.6], [-22.4, 11.2], [-22.4, 12.7], [-22.1, 15.0],
  [-22.4, 12.7], [-22.4, 11.2], [-21.6, 5.5], [-12.0, 5.5], [-12.0, 15.5], [-5.2, 15.5], [-4.8, 14.55], [-1.0, 15.0].
  - Legs 4 and 7: the fence climb (the south fence's west panel, x -22.9 to -21.9).
- **R2 high** - name 'Rack tops into the cage, out along the sprinkler mains', obj 10, climbs [4, 6, 8, 12, 13, 14, 15, 16, 17]:
  [-14.5, -7.2], [-14.5, -5.4], [-12.0, -5.4], [-12.0, 5.8], [-14.65, 6.3], [-14.65, 7.6, 4.0], [-14.9, 10.0, 4.0],
  [-18.3, 10.0, 4.0], [-18.75, 13.5, 4.0], [-20.4, 13.5], [-22.1, 15.0], [-22.6, 12.8], [-23.45, 12.7],
  [-23.45, 11.4, 4.0], [-23.45, 7.4, 4.0], [-23.45, 6.4, 5.0], [-6.2, 6.4, 5.0], [-6.0, 15.2, 5.0], [-6.0, 15.2],
  [-4.8, 14.55], [-1.0, 15.0].
  - Climb legs: 4 the R2N ladder; 6 the jump over A2 (R2N to R1N); 8 the hang-drop off R1N's west lip into the cage;
    12 the stock ladder; 13 W0N's top (1.1 m wide: listed as a climb so the nav check does not depend on a narrow top);
    14 hang from W0N's south lip, jump back onto the cross main; 15 hand over hand east; 16 jump to the north branch and
    along it; 17 the drop by the C3 door.
  - Legs 5 and 7 are walked on the R2N and R1N tops (nav at y 4.0, seeded in 4).
- **R3 service (VNA)** - name 'Up the VNA aisle, over the beam and in at the issue gate', obj 9, climbs [3, 5]:
  [-14.5, -7.2], [-14.5, -5.4], [-16.7, -4.0], [-16.9, 13.4], [-18.2, 13.4, 4.0], [-18.75, 14.6, 4.0], [-18.75, 15.5],
  [-19.2, 16.5], [-20.6, 16.5], [-22.1, 15.0], [-20.6, 16.5], [-19.2, 16.5], [-17.0, 15.6], [-12.0, 15.5], [-5.2, 15.5],
  [-4.8, 14.55], [-1.0, 15.0].
  - Climb legs: 3 the A2 ladder (south of the beam); 5 the hang-drop off R1N's north lip, north of the beam and 1.4 m
    clear of its west end. Take the cage officer at the desk (2.2 m east of the landing), in through the east gate.
  - Leg 4 is walked on R1N's top.
- **Loud** (not data): shoot the lane lamp and run A3; breach the locked south gate.
- **Loops** (SPEC): lane, A1, cross aisle, A3, lane; cross aisle, east gangway, north gangway, A3; the cage (two gates, an
  open top).
- Every obj point is (-22.1, 15.0): 0.9 m from the objective (the routes test's grab reach is 1.6). Every route ends in
  the C3 box. The three lists differ.

## 7. Engine points (SPEC 2.2 "Engine fit"; by reading the code, not a playtest)
1. **Standing on the 4.0 rack tops: works; keep 4.0, no 3.8 fallback.** Nothing solid is over the hall: the roof strips
   are `collide false` (W:373-377), and the pipes, lamp fixtures and rafters are visual (`pipeH` draws a non-colliding
   box, `levelBuilder.ts:245-249`). Nav headroom (1.7, `navBuild.ts:9`) is met. The rack edges make hangable lips
   (drop 4.0 over 1.9). The tops are not solo wall-jumpable (3.8 max), so the ladders and boosts above are the ways up.
2. **Jump-grab from a rack top onto `pipeH` 1.0 up, 0.6 out: not as a standing grab; yes as a hang-and-jump.**
   - A standing grab (`reach()` pipeH, `anchors.ts:700`) needs the pipe 1.6-2.7 m over the feet and within 0.6 m in
     plan; 1.0 m over a 4.0 top fails, and 5.0 is out of reach from the floor.
   - A falling grab (`fallProbe`, `attachController.ts:323`) catches a pipe 1.5-2.35 m over falling feet within 0.7 m
     (walk off a top's edge and press jump while falling: works, but the window is about 0.15 s). Not on a route.
   - What the routes use: attached jumps (`findJumpTarget`, `anchors.ts:898`: target within 2.5 m, at most 1.2 m up,
     ledge, pipeH, pipeV and ladder all allowed). From a hang on a north block's south lip (grip 4.0) a back jump
     reaches the main (1.17 m, 1.0 up). From the riser's top a back (+x) jump reaches the main. A pipe-to-pipe jump at
     the corner takes the main to the north branch (1.2 m). So the mains stay at 5.0, 0.6 m off the faces, as SPEC.
   - The SPEC fallback "the riser and W0's south end" is what the routes use. The riser's top does not step onto W0's
     top (`pipeLip` needs a lip within 0.8 m of the pipe top; 4.0 vs 5.0), so the riser leads to the main only.
3. **Climbing the cage fence: works.** `b.fence` makes a `fence` anchor (`levelBuilder.ts:289`): climb with the stick,
   shimmy, Y at the top flips over to 0.7 m past the far side on the fence's floor (`attachController.ts:839-864`); any
   height. Its body stops movement and the guards' nav (`navBuild.ts:38`) but not sight or bullets (it is not a level
   piece), so the mesh does not screen anyone (the sight check agrees). The gates are door anchors in real fence gaps.
4. **The VNA beam sensor: works as a laser.** `laser-north-aisle` is a `LaserDef` band; `laserTouch` (`jammer.ts:144`)
   trips a body within 0.3 m in plan of the beam line whose height span holds a beam (0.35, 0.9, 1.45); a body over every
   beam is clear: on a rack top, hanging from a lip (feet 2.1) or braced in the split (feet about 2.1).
   - But the split cannot move: `split` has `axis: 'none'` (`attach.ts:87`). A player braced in A2 cannot pass the beam,
     only hide over the aisle or drop. The split's jump-out targets a lip ahead and above (`findJump`, split case);
     R1N's lip is 0.9 m to the side, which is marginal. So SPEC's "split-climb over the beam" is replaced by the SPEC
     2.2 fallback "a third ladder on R1": the A2 ladder south of the beam, R1N's top past it, a hang-drop north of it.
     The split stays as the CT hide and the co-op split-and-drop.
5. **The 1.8 m rack-top jump over A2 (SPEC fallback point): works.** A sprint jump carries about 2.8 m (sprint 5.0 m/s,
   `LEAP.vy` 5.6, about 0.57 s of flight); if short, the falling grab catches R1's lip (1.5-2.35 m over the feet);
   a hang-to-hang back jump between the facing lips (1.8 m) is inside `findJumpTarget`'s 2.5 m. The A2 ladder also
   stands as the fallback.

Not answerable from code (playtest): the camera between 4.0 tops and the pipes; whether guards notice a player on a rack
top (G44 vertical sight is not built, so darkness is the only cover above).

## 8. Tests

### 8.1 Vitest
- `tests/sectorStep3.test.ts:86`: `SECTION_ROOMS[1]` becomes `S2_ROOMS.map((r) => r.id)` (import `S2_ROOMS`).
- `tests/sectors.test.ts`: add "section 2 (warehouse-s23)", like the section 1 test (`sectors.test.ts:386`):
  - `S[1].id === 'racking'`, `S[1].start` equals section 1's connector checkpoint.
  - 8 guards; the first four kinds `['enforcer', 'grunt', 'officer', 'officer']`; none `heavy`, `sniper` or `dog`.
  - The e2e stand (objective x + 0.9, z): `world.blocked(..., 0.3)` false; every door hinge over 1.6 m; every first-four
    guard slot over 1.8 m.
  - Rooms: `storage` and `hvCage` present, `racking` absent; the objective is inside `hvCage`.
- Existing tests that must still pass unchanged: three sections with ids and kinds; guard counts rise or hold (8, 8, 11);
  slots 7 m or more from the start; routes (start within 0.5 m, obj within 1.6 m, last point in the exit, climb indices in
  range, unique lists); M8 (static or isolation in time at the spot, `sectors.test.ts:315`); devices 2/2/3 and 2/1/2 and
  `validateSecurity`; connector doors (C3 near and far, the manager's door); the plain Warehouse (318, 14, 5); `voxelFit`
  (no thin box makes a ledge; every new box with a lip is 0.3 m or more thick).
- Extend the phase-drift test (`sectors.test.ts:333`) to section 2's guards whose spot is statically seen (30 phases,
  each keeps `CHECK_ISOLATION`).

### 8.2 e2e-sectorops (no logic change; all data-driven)
- The ghost walk: section 2's exit does nothing before the objective; at (-22.1, 15.0) one A press takes the case (no
  door within 1.6 m, no guard within 1.8 m, so the context menu has one row); the C3 cycle unloads 4 guards and loads
  section 3.
- The section 2 restart and the panel alarm: with 4 guards the one nearest the panel (-4.15, 1) is the reach driver
  (12 m from its slot); its path is A3, the cross aisle, the east gangway (all open floor).
- Nav: every non-climb leg above has a path within 2.5 x + 6 m (the rack-top legs need the 4.0 seeds); each section's
  objective and exit are reachable (the cage through its gate gaps, the fence blocks nav elsewhere); sealed: section 2's
  walls are 6.0 with parapets, so section 3's objective is reached only through C3, and section 2's only through C2.
- The suppressed-shot spot (section 1's guards, any ground nav cell): the hall still offers floor cells 18 m or more from
  section 1's checker and within 26 m of it (A1 at about z 8-9, A2 at z 8-10, A3 at z 7-8.5), behind the 6.0 z -6 wall.
- No other suite changes. Run `npm run check` and e2e-sectorops (plus e2e-coop / e2e-netmove only if `src/game` or
  `src/net` change; this sheet changes neither).

### 8.3 M8 adjustment ladder (if a guard fails the M8 test)
SPEC 2.2: move a wait or a post up to 2 m, never geometry. Try in this order, one change at a time, rerun the test:
1. Raise that guard's wait at its spot by 2 s (max 8).
2. Shorten a pause of the guard that sees it (name from the failure message) by 2 s (min 2).
3. Move that guard's spot point (and the matching route point) up to 2 m along its own line, keeping the 7 m slot rule,
   the pause on the spot and the free-floor rule.
4. Log what moved in the step report. If a guard still fails, stop and report (do not add cover).

## 9. Deviations from SPEC 2.2 (decided here, each with its reason; the job lead can overrule)
- **D1** The x -4 wall is 6.0 with a parapet from z -6 to 18 (SPEC build notes). It is also section 3's west wall
  (was 3.2); section 3's play is unchanged, its seal gets stronger.
- **D2** Parapets on the west and north perimeter tops over the hall (a seal: section 2).
- **D3** A2 ladder on R1N at z 13.4 replaces the split-climb past the beam (section 7 point 4; SPEC's own fallback).
- **D4** The R3 "rolling ladder at R3's south end" is on R3S's east face (-7.95, -2.6): the south face is behind the
  staged east row (z -4.5 to -3.3), which would stand in the climber's place.
- **D5** Checker slot and west end (-21.6, -5.0), not (-21.0, -5.0): the slot must be 7 m from the start (6.86 m).
- **D6** Reach driver on x -11.6 (not -12.0), slot at the north end: its south end (-12.0, -4.2) was 3.9 m from the start
  and on the tour guard's lane point.
- **D7** Tour guard: post at (-23.2, 5.5) (by the exit, off the stocktaker's A1 line), its A3 leg on x -12.6, its lane
  point (-12.6, -4.0) (1 m off the checker's line), and a 3 s pause at (-14.6, 5.5) as its takedown spot. A2's mouth
  is in the cage officer's straight view down A2, and a walk-through gives under 3 s at a spot.
- **D8** Picker on x -7.4 with ends (-7.4, 14.6) and (-7.4, 0.5): (-7.0, 16.0) was 1.0 m from the loader, and 0.5 keeps the
  loader over 15 m away at the south end.
- **D9** Loader at (-6.0, 16.2) and the wrapper at z 17.35: the SPEC post sat on the wrapper's plate.
- **D10** Charger at (-4.5, -5.2) (0.5 wide), charge hand at (-5.3, -5.2), its green light at (-4.6, 1.8, -5.2): the
  SPEC charge hand stood 0.1 m from the charger, the light inside it.
- **D11** Cage south gate 1.0 wide (fence panels 1.0 each side), the shelving z 13.2 to 17.6: room for the fence climb
  and the stock ladder's foot.
- **D12** The west fire exit is visual only (no gap in the perimeter).
- **D13** The riser at (-23.85, 6.4) under the main's west end (SPEC (-23.7, 6.75) put the climber against W0N's corner).
- No new level-standard loosening (L1-L15 cover this section: L6 mains, L8 co-op lips, L11 vantages, L14 the VNA aisle);
  nothing added to BRIEF.md.
