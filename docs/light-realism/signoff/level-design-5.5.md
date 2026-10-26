# light-realism: draft text for level-design 5.5 (after Michael's click)
Owner: Night Shift | Sector Ops Build. Status: current (draft for the L5 fold; replaces master `docs/level-design.md`
section 5 item 5, lines 192-200, only after Michael approves `SIGNOFF.md`).

Draft (the interim rule "Until the bands have values ..." is dropped; the [Training] sentence is kept):

5. **Real light levels.** Each space is lit to the real-world illuminance band of its space type: AS/NZS 1158.3.1 car
   parks and roads, AS/NZS 1680 interiors, EN 12464 where they are silent (the band table,
   `docs/light-realism/research/bands.md` section 3, approved by Michael with the S1 car-park light map, G368). A band
   is the standard's maintained average as the floor of the space's mean lux, up to 2.5x it, plus the standard's point
   minimum on open ground. Engine light is read in lux on one curve, level = 0.28 + 0.32 x log10(lux) (1 lux = the edge
   of dark, 10 lux = lit; `src/world/lux.ts`), lamps added in lux, and measured from the bake at greybox exit
   (`scripts/light-realism/lux-grid.mjs`) on the standards' planes: car parks, roads, yards, corridors, stairs, lobbies,
   warehouses and plant rooms horizontal at the floor (y 0.1); offices, labs, data halls and security rooms at the task
   plane (y 0.8). Stealth comes from real gaps (between poles, under carports, behind cars, cut circuits, shot lamps),
   never from leaving lit places unlit or a light dead or switched off (G329, "Real-world levels"; G367). The floor
   shadow share (`shadow_pct`, `shadow_min_frac` - `shadow_max_frac`) is reported for information only; the band wins.
   [Training] Lit by default, the players cut it (G279); this is never the fallback for the campaign or Sector Ops.
