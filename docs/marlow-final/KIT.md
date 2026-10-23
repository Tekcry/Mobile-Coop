# marlow-final - facility kit (KIT)

The reusable art kit for Marlow Yard's luxury training hall (BRIEF M5, A5-A6): dark premium surfaces (charcoal
composite panels, brushed metal trims), warm and cool LED lines, clear and frosted glass, motorised sliding doors.
Built now, before the layout spec, so each area can be dressed as its greybox passes. Mock-up areas inside the hall
(rail siding, office floor, server room) keep their own materials (A6): the kit is the hall, not the sets.

Files:
- Generator: `scripts/facility-kit/py/build_kit.py` (Blender 5.2.2, headless `-b`, pinned by
  `scripts/operators/blender.mjs`), runner `scripts/facility-kit/build.mjs`, `npm run kit:build` (about 5 s).
- Output (bundled, committed): `src/world/kit/assets/facility-kit.glb` (151 KB) and `facility-kit.json` (the build
  report: triangles per piece and material, bounds, bytes).
- Placement API (pure, no Babylon at run time): `src/world/kit/facilityKit.ts` `FacilityKit`.
- Renderer: `src/world/kit/kitRender.ts` `KitRender`, started by `World.create` from `MapLayout.kit`.
- Tests: `tests/facilityKit.test.ts` (placement maths, the boxes the kit writes, the sliding leaves, the report and
  GLB against the kit tables, winding against the weapon GLBs).
- No external art: no textures at all (no CC0 file used, so nothing added to `docs/art-credits.md`). No runtime
  network: the GLB is a same-origin bundle asset (service worker caches `assets/*.glb` as for the weapons).

## 1. Collision: the kit provides matching collision

Gameplay never reads the kit's meshes. Each placement call writes the gameplay piece into the `LevelBuilder` itself
and records the visual instances over it:
- Walls and columns: a normal visible box (colour `KIT_BOX_COLOR` `#17191b`), exactly what `LevelBuilder.wall` /
  `box` would add (the test compares them). It stays the collision, cover faces, ledges, nav, canonical light shape
  and shadow caster. The skin sits on its faces: panels 4-60 mm proud, skirting 22 mm more, columns 15 mm per unit.
  Nothing a player touches differs from the box (capsule radius 0.3, cover standoff larger than any skin).
- Glass partitions and the gallery balustrade: a collision-only box (`visible: false`, `noLedge`). Collision-only
  pieces are out of the canonical light shapes, so light passes them in the bake, the meter, the guards and the
  picture alike (the roof sheets' rule), as G45 decides for clear and frosted glass. They stop movement, bullets
  and guard sight (sight runs on physics rays). G45's "clear glass passes sight" is still not built: use clear glass
  only where a guard never needs to see through it (the gallery, sealed offices), or build G45 first.
- Trims, skirting, LED slots: no collision (visual only, too thin to matter).
- Sliding doors: the existing hinged `Door` anchor (`LevelBuilder.door`) with `leaf: 'slide'`. Collision while
  shut, light (`DOOR_SHUT`), sight, sound, locks, course gates, crack peek and co-op are the door system's, unchanged
  (no new door mechanic). `Doors` draws no hinged leaf for it; the kit draws two leaves sliding into the wall's pockets
  from the same `DoorState` (`slideFraction(open, ajar)`: render only).

Why: one call per piece means the art and the collision cannot drift apart, the box under every skin keeps light
parity (the bake, the meter and the guards all read the same boxes) and the `?gfx=min` path, which draws no kit, still
shows a complete charcoal greybox. The skins cast no shadows: the boxes under them already do, matching the bake.

## 2. Pieces

Frames (game frame, metres): x along the run, y up, z out of the face. Wall-mounted pieces have their back on the wall
face (z 0) and face +z; free-standing pieces are centred on z 0. A piece is placed by origin, yaw (Babylon's: local +z
-> (sin yaw, 0, cos yaw)) and a scale per axis; runs tile whole modules, stretched (`tileRun`: at most 1/6 once a run
is 3 modules long).

| Piece | Module (x by y by z) | What it is | Materials (triangles) | Budget |
| --- | --- | --- | --- | --- |
| `wallPanel` | 1.2 x 3.0 x 0.06 | Charcoal composite cladding: lower and upper panels split by a brushed dado trim at 1.0 m, an LED uplight cove under a brushed fascia at 2.74 m, a top cap; 12 mm open joints | composite 132, metal 88, reveal 12, led 12 (244) | 400 |
| `wallUpper` | 1.2 x 1.5 x 0.03 | Plain composite panel stacked over `wallPanel` on walls over 3.3 m | composite 44 | 80 |
| `glassClear` | 1.5 x 3.0 x 0.08 | Full-height clear pane, graphite head and sill channels, brushed half mullions (two modules make a 50 mm mullion), a frosted manifestation band at 1.0-1.1 m | metalDark 88, metal 88, glass 12, frosted 12 (200) | 300 |
| `glassFrosted` | 1.5 x 3.0 x 0.08 | The same, acid-etched all over | metalDark 88, metal 88, frosted 12 (188) | 300 |
| `doorFrame` | 2.0 x 2.42 x 0.092 | One face's surround of a sliding door: brushed architrave, graphite motor head, a status bar (green unlocked, red locked) | metal 132, metalDark 44, reveal 12, status 12 (200) | 300 |
| `doorJamb` | 2.0 x 2.1 x 1.0 | Brushed linings of both jambs and the soffit; z scaled by the wall's thickness | metal 36 | 60 |
| `doorLeaf` | 1.0 x 2.08 x 0.044 | One motorised leaf (both leaves are this piece): charcoal, brushed edge caps and kick band, pull channels | composite 44, metal 48, reveal 48 (140) | 300 |
| `ledSlot` | 1.0 x 0.045 x 0.08 | Surface-mounted linear LED slot under a ceiling: graphite channel, recessed diffuser | metalDark 100, reveal 12, led 12 (124) | 200 |
| `skirting` | 1.0 x 0.12 x 0.022 | Recessed brushed skirting with an LED toe-kick line in its shadow gap | metal 44, reveal 12, led 12 (68) | 120 |
| `column` | 1 x 3 x 1 unit | Column cladding scaled to the column box: charcoal panels, brushed corner angles and collars, a vertical LED reveal up each face | composite 352, metal 264, led 48 (664) | 800 |
| `handrail` | 1.5 x 1.025 x 0.07 | Gallery glass balustrade: brushed half posts, 50 mm round top rail at 1.0 m with an LED line under it, graphite shoe, clear infill | metal 124, metalDark 44, glass 12, led 12 (192) | 300 |

Sizes follow `docs/design/scale-sheet.md`: 3.0 m rooms and corridors (one `wallPanel` row), 4.5-6.0 m halls (plus
`wallUpper` rows), double doors 1.8 or 2.0 x 2.1 (the sliding door takes 1.6-2.4), a 1.0 m rail is not cover.
Prototype quality: hard-surface boxes with 2-4 mm chamfers so edges catch the LED light, believable at a glance.

Looks (`KIT_LOOK`, sRGB, PBR like the level material and lit by the baked lamps as level): composite `#2a2d31`
roughness 0.55; brushed metal `#b9bdc1` metallic 0.9 roughness 0.3; graphite `#3b3e42` metallic 0.75; reveal black;
clear glass alpha 0.14; frosted alpha 0.68 roughness 0.55. LED lines are unlit emissive tinted per instance:
`warm` 3000 K, `cool` 5000 K, `white` (`LED_TONES`, x `LED_GAIN` 1.6). The renderer owns the look by material name,
so a retexture (A6's undo) is one table, no rebuild.

## 3. Placement API (map builders)

```ts
import { FacilityKit } from '../kit/facilityKit';
const kit = new FacilityKit(b);              // b: the map's LevelBuilder
kit.wall(x1, z1, x2, z2, h, { thick, y, faces: 'both' | 'left' | 'right' | 'none', tone, skirting, group });
kit.wallPanel(x, z, len, yaw, { h, y, tone, group });   // visual only, on an existing face; yaw = the face's normal
kit.skirting(x, z, len, yaw, { y, tone, group, standoff }); // visual only
kit.glass(x1, z1, x2, z2, h, { frosted, y, thick });    // collision-only box + panes
kit.handrail(x1, z1, x2, z2, { y, h, tone, group });    // collision-only box + balustrade
kit.column(x, z, w, d, h, { y, tone, group });          // box + cladding
kit.ledSlot(x, y, z, len, yaw, { tone, light: { radius, intensity, group, electric } | false });
const door = kit.slidingDoor(x, z, width, yaw, { y, height, wallThick, wallH, locked, breachable, lintel });
return { ...layout, kit: kit.layout };       // MapLayout.kit: the drawn pieces
```

- Positions snap to 5 cm (`KIT_SNAP`). `faces` names the faces walking from (x1, z1) to (x2, z2) ('right' = the
  right hand). `wallPanel` / `skirting`: (x, z) is the run's centre on the face.
- `ledSlot` with a light (default): one lamp per <= 2.4 m segment (`SLOT_SEGMENT`), 27.5 mm under the slot's top
  (flush under a ceiling, as the LED panels: the bake sees it), yaw snapped to 90 degrees, each lamp's fixture box is
  the glowing diffuser, so the line goes dark with its lamp (switch, jammer, EMP, shot) through `LightRig` as any
  fitting does, and its lamp is in the bake, the meter and guard perception (light parity). `light: false` is an
  accent line (no light, never in the bake). Radius 7 / intensity 0.9 are starting values: each area tunes them
  against its light tests.
- Accent LED lines (wall coves, skirting, columns, rails, accent slots) light no surface; with `group` they go dark
  when that lamp circuit has no lit lamp (the renderer re-reads on each `LightRegistry.version` change), else they
  are always on. They carry no gameplay light, so a dark exercise stays dark for the meter; give the LED lines in
  a darkness exercise the circuit's `group` so the picture agrees.
- `slidingDoor`: (x, z) the opening's centre, `yaw` as `LevelBuilder.door` (the shut leaf lies along
  (sin yaw, cos yaw)); it adds the anchor (returned, for course gates and locks), a lintel box from the door height
  to `wallH` (set `lintel: false` when the greybox already has one), both faces' frames and the linings. The map's
  wall must leave the opening (a `wallX` / `wallZ` gap of `width`) and run on at least `width / 2` past each side:
  the open leaves slide into the wall box (pocket doors; a 0.3 m wall hides a 44 mm leaf). The scale sheet's "no
  door within 1.5 m of a corner" covers a 2.0 m door.
- Corners: two clad walls meeting overlap their panel ends at the corner; end the second wall's panel run 30 mm short
  (`wallPanel` on the face) or clad only one face there. The kit does not miter.

## 4. Budgets (performance.md)

- Draws: one thin-instanced mesh per (piece, material) placed: at most 33 for the whole map, whatever the instance
  count. No shadow-map draws (the skins are not casters) except the leaves' composite in the flashlights' lists.
  (S9 perf: at run time the static opaque pairs - every piece but the leaves; not the LEDs, status bars or glass - are
  baked into one mesh per material, `kit-static.<material>`, so the map draws ~16; the kit's opaque materials draw ahead
  of the level boxes they clad; glass is back-face culled. `src/world/kit/staticMerge.ts`, `slices/S9-perf.md`.)
- Triangles: 2100 for one of every piece; a typical 12 x 20 m area (clad walls both faces, 6 columns, 3 slots,
  2 sliding doors, a glazed side) is about 25-35 k. Area budget: <= 60 k kit triangles per area, checked with
  `kitTriangles(layout, report)`. The frame budget is 8 M triangles over every pass.
- Lights: each lit slot segment is one baked lamp; keep <= 8 lamps per 2 m bake column (the lamp grid's cap) and
  count them with the area's other fittings.
- Memory: the GLB is 151 KB (positions and normals, no UVs or textures); per instance 64 bytes of matrix (+16 colour).
- Per frame: allocation-free, only the sliding doors' leaves move (matrices rewritten while a door moves) and the
  status bars repaint on a lock change. Perf and GPU shots per area go to Character Build (BRIEF M5).

## 5. Left for per-area dressing (after each greybox passes)

- Each area's kit calls in its map builder, per the spec (the ctcourse builders are not touched by this step).
- The instructor gallery itself (A5): its raised floor and stairs (level builder), glass along the course side,
  balustrade, slots, a console run and monitor wall (props), its out-of-bounds blocker for players.
- Floors: polished concrete is the level floor's surface kind and colour (`b.surface` / floor colour); a floor-inset
  LED wayfinding line is a `skirting`-style accent in a later kit piece.
- Light tuning: each lit slot's radius / intensity against the area's light tests; darkness rules stay as they are
  (any loosening goes to Michael as a proposal, BRIEF M5).
- GPU review: contact sheets and perf on the laptop (pending a PC run; this step ran no GPU check).

## 6. Suggestions (not built)

- Door status bars already show lock state; the same bar could pulse amber during a timed exercise's countdown.
- Ceiling rafts / acoustic baffles in graphite over the halls (cheap boxes, big read of "expensive").
- Wall-recessed signage panels with the facility's own original name and area numbers (backlit, warm).
- Mirror-glass for the gallery from the course side (one-way glass: frosted look from below, clear from above);
  needs G45's sight rule to be meaningful.
- Thin brushed shadow-gap ceiling trim where walls meet the ceiling, and a stone-look reception desk at the start.
- The `SurfacePlugin` micro detail (brushed grain, composite speckle) on the kit materials: a per-instance `surf`
  buffer; left out of the first cut to avoid an unverified shader change.

## 7. Engine changes made for the kit

- `Door.leaf?: 'swing' | 'slide'` (`world/anchors.ts`), `LevelBuilder.door(.., { leaf })`; `Doors` draws a zero
  matrix for a sliding door's hinged leaf. Plain doors' anchors are unchanged (no `leaf` key).
- `MapLayout.kit?: KitLayout` (`world/mapDef.ts`); `World.kit` (`KitRender`, null without a kit, on `?gfx=min`, or
  when the GLB fails to load: a warning, and the greybox shows).
- No `docs/level-design.md` Section 12 engine fact changes (collision, nav, light and doors behave as before).
