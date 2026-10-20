# Warehouse lamps - state

**Now:** fittings, roof sheets (M3) and dressing (M4) done, self-reviewed; unit tests green. Full `npm run check` and
e2e-sectorops + smoke wait on a free heavy slot. PR to master open; the orchestrator reviews and merges.
**Next:** Michael walks the Warehouse on GPU (sections 1-3, NV off and on): the fittings read, none float. Notes come
in as M5 onward.
**Open (polish, not blocking):**
- GPU look of the three models and the body material: pending PC run.
- A batten's shot box is still the old 0.5 m box (A3): its ends are not a target.
- S1 yard lamp (11.25, 2.45, -22.45) sits inside the container box: keeps its plain box (the one exception; moving it
  changes the yard's light levels).
- Section 3's open roof strip (z -8.95 to -6, the base z -12 strip is skipped in Sector Ops) is now a sheet (M3); its
  three lamps at y 5.0 (x -3, 4, 12) are bulkheads on section 1's north wall.
- Under the sheets the moon is as bright as open sky (A5); a dimmer pass-through needs G45 in the bake.
- Not placed: the forklift (no dead space fits it), section 3's roller door, boxes on the racking (A7).
- Draw calls: +8 (fittings 7, sheets 1; the dressing rides the level box mesh): pending PC run for the totals.

## Done
- 2026-10-20: roof sheets (`LevelBuilder.sheet`, `roofSheets.ts`) and dressing (`warehouseDress.ts`);
  `tests/warehouseDress.test.ts`; section light, sector and room tests green; tsc and ESLint clean.
- 2026-10-20: `world/lampMount.ts`, `world/fixtureModels.ts`, `LightRig.buildFittings`, mount pass in `warehouseOps`;
  `tests/warehouseLamps.test.ts`; section light tests unchanged and green; CHANGELOG, TESTING, lighting.md.
- 2026-10-20: branch from master 813d13a4 (4.19.0); node_modules junction to the ct-prototype folder (same lock file).

## Resume prompt
```
Night Shift | Warehouse lamps. Job lead for warehouse-lamps (Sector Ops lamp fittings: mounts and three quick models).
Work only in C:\NightShift\Mobile-Coop-warehouse-lamps on feature/warehouse-lamps (node_modules is a junction, never
npm ci). Read CLAUDE.md ("Sessions"), docs/ROADMAP.md, docs/warehouse-lamps/BRIEF.md and STATE.md. Carry on from
STATE "Now / Next"; Michael's notes come as M5 onward. Keep STATE current; one PR to master.
```
