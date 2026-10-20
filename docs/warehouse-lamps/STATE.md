# Warehouse lamps - state

**Now:** implementation done, self-reviewed (no checker: prototype, one pass). PR to master open; waits on the
orchestrator's review and merge (version theirs).
**Next:** Michael walks the Warehouse on GPU (sections 1-3, NV off and on): the fittings read, none float. Notes come
in as M3 onward.
**Open (polish, not blocking):**
- GPU look of the three models and the body material: pending PC run.
- A batten's shot box is still the old 0.5 m box (A3): its ends are not a target.
- S1 yard lamp (11.25, 2.45, -22.45) sits inside the container box: keeps its plain box (the one exception; moving it
  changes the yard's light levels).
- Seen in passing (geometry, not this job): in Sector Ops the base Warehouse's z -12 roof strip is skipped and
  section 1's roof ends at z -8.8, so section 3 has no roof between z -8.8 and -7.2 (the south strip over the lobby
  and plant roofs). Its three lamps at y 5.0 (x -3, 4, 12) are now bulkheads on section 1's north wall.

## Done
- 2026-10-20: `world/lampMount.ts`, `world/fixtureModels.ts`, `LightRig.buildFittings`, mount pass in `warehouseOps`;
  `tests/warehouseLamps.test.ts`; section light tests unchanged and green; CHANGELOG, TESTING, lighting.md.
- 2026-10-20: branch from master 813d13a4 (4.19.0); node_modules junction to the ct-prototype folder (same lock file).

## Resume prompt
```
Night Shift | Warehouse lamps. Job lead for warehouse-lamps (Sector Ops lamp fittings: mounts and three quick models).
Work only in C:\NightShift\Mobile-Coop-warehouse-lamps on feature/warehouse-lamps (node_modules is a junction, never
npm ci). Read CLAUDE.md ("Sessions"), docs/ROADMAP.md, docs/warehouse-lamps/BRIEF.md and STATE.md. Carry on from
STATE "Now / Next"; Michael's notes on the fittings come as M3 onward. Keep STATE current; one PR to master.
```
