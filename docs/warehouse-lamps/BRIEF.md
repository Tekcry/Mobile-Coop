# Warehouse lamps - brief

Set by the orchestrator, 2026-10-20 (master 4.19.0). Branch `feature/warehouse-lamps`, folder
`C:/NightShift/Mobile-Coop-warehouse-lamps`. Briefed as a cloud-style job: unit tests and logic e2e only; every GPU or
visual check is "pending PC run". One PR to master; the orchestrator versions it. Prototype effort: one implementer
pass, one self-review, no polish.

## Michael's words
- **M1** (2026-10-20, verbatim): "The sector ops lights are not sitting properly on the ceilings, some are even above
  ceilings or just floating. I want to fix this quickly, not perfectly. Also the light fittings seem to only be light
  boxes with physical light fitting, can we create prototype rough quick 3d models for each?"
- **M2** (his choices): quick and believable, three fitting types, built in code (no Blender).

## Goal
Sections 1-3 of the Sector Ops Warehouse: every fitting fixed to the ceiling over it (none floating, none above or
through a ceiling), else a wall bracket, else listed; three quick models (dome high-bay, fluorescent batten, caged
bulkhead) from primitives, merged per type, instanced, one shared material, an emissive face. Light parity holds; no
gameplay, guard route or light value change beyond moving with the fitting.

## Assumed decisions (how to undo)
- **A1** No light moves: the fitting reaches the structure instead (a drop rod or hangers to the ceiling, a bracket arm
  to the wall, a strut to the roof strip beside a skylight gap, a mast on a roof), so the tuned levels of
  warehouse-s23 hold exactly. Undo: move the lamps up under their ceilings in the `S*_LIGHT_PASS` tables and retune
  (the section light tests pin the levels).
- **A2** Lamps with nothing over them and no wall in reach but a roof under them (S1's three roof lamps, S3's lobby
  roof lamp) get a dome on a mast. Undo: drop `mast()` from `lampMount.ts` (they become exceptions).
- **A3** The fixture box (what the bake samples, glare and shots read) stays as authored; a batten's ends are not a
  shot target yet. Undo: set the box from `FITTING` per model (changes the bake slightly).
- **A4** Signs, door lamps and spots (green, small boxes, spots, under 2.3 m) try a short wall bracket (arm <= 0.6 m)
  before a ceiling; other lamps try the ceiling over them first.

## Additions (2026-10-20, through the orchestrator)
- **M3** (verbatim): "can warehouse lights session also update warehouse ceiling - the open sections are unusual, they
  are usually a opaque type of corrugated plastic sheet that allow light in but cant be passed through." Orchestrator:
  fill every open roof section with translucent corrugated sheeting, solid, letting diffuse moonlight in, light parity;
  openings on a route stay open and are listed.
- **M4** (chose "Walls + ceiling + dead-space clutter"): quick primitives, merged / instanced, one or two materials, no
  assets. Walls and ceiling anywhere; floor clutter only in dead space, never on a route, never new cover or a sightline
  blocker on a patrol, with collision, high-route clearance kept; draw calls within budget.
- **A5** The sheets pass the moon fully (collision only, not baked, not a shadow caster): the bake has no translucency
  rule (G45 not built), so "dimmer than open sky" would break parity. Undo: put the sheets in the light shapes (dark
  under them) or build G45.
- **A6** Dressing is `detail` boxes in the level's own box mesh (no new draw, never baked); floor items add one
  collision-only box (no cover face, no ledge). Clearances: routes 1.5 m, patrols and posts 2 m, sightlines a guard has
  today to a route within 20 m, 1.8 m headroom over walkable tops. Undo: drop `dressWarehouseOps` from `warehouseOps`.
- **A7** No boxes on the racking shelves: the racking's voxel art already holds loads at the voxel presets.
