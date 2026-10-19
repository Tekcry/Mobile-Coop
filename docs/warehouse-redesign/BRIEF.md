# Warehouse redesign - brief

Set by the orchestrator, 2026-10-19 23:50. Branch `feature/warehouse-redesign` (off master 4.7.5, 3a07eee9), folder
`C:/NightShift/Mobile-Coop-warehouse-redesign`. Job lead: "Night Shift | Sector Ops Build". Low priority: CT Core,
then Course Ready, then this job, on both heavy locks. Prototype effort only (CLAUDE.md "Current goal"). The PR waits
for Michael's approval of the direction (not opened tonight) - replaced by M4: the PR opens tonight.

## Michael's words
- **M1** (2026-10-19 23:45, via the orchestrator, verbatim): "section ops can fill in any time where theres gaps, but i
  would prefer if the level design was reviewed and overhauled to achieve fun gameplay flow with multiple stealth
  opportunities per section (pipes, ceiling crawl spaces, coop passages, etc) - i dont just want the warehouse patched
  together to suit the mode. i want the level to be designed as a quick prototype to allow a fun, efficient, free
  flowing sandbox to get between objectives and next areas in imaginitive and cool ways, and guard routes should be
  logical, not just placed for the sake of having guards there. Also note that dogs have flashlights for some reason.
  Research level design if you need to, but the level should at least be realistic (the warehouse has rooms that just
  dont have roofs, the doors are small, windows in random spots, walls in random spots)."
- **M2** (23:47): tonight "Spec all 3, build 1": research and a new spec for all three Warehouse sections, then section
  1 rebuilt as a quick greybox prototype for him to judge in the morning.
- **M3** (23:47), on the level standard: "Loosen where needed". The spec may loosen `docs/level-design.md` where it
  blocks fun flow; each loosening is logged below (what, why, how to undo) for his review. `docs/level-design.md` and
  `docs/templates/map-spec.md` themselves are not edited.
- **M4** (23:55, via the orchestrator): "i also want everything merged into one build by the morning, so i can try it
  all from one session". So this job's PR opens tonight, by 06:00: the dog fix, the spec docs and the section 1
  greybox (if the greybox is not stable by 05:00: the fix and the spec only), with the full `npm run e2e` on its head.
  The orchestrator sets the version and merges.

## Goal
1. **Dogs carry no light** (bug): a small commit with a test.
2. **Review** the current Warehouse (`src/world/maps/warehouseOps.ts`, `warehouseSectors.ts`, `warehouse.ts`):
   realism (roofs, door and window sizes and placement, wall logic), flow, guard-route logic, with numbers from the
   map code. Sources: `docs/ct-research/levels-digest.md` (how CT's levels give several routes per area), real
   warehouse layouts. Output `REVIEW.md`.
3. **Spec** all 3 sections from `docs/templates/map-spec.md`: realistic building logic, a free-flowing sandbox between
   objectives, several stealth routes per section (pipes, ceiling crawl spaces, vents, co-op passages and boosts),
   guard routes with a reason (posts, patrols between real places). Output `SPEC.md`.
4. **Greybox section 1** to the spec (implementer, fresh checker, at most 1 fix round, test tier); e2e-sectorops
   updated. Push; a short walk guide (menu path, version label) to the orchestrator.

## Level-standard loosenings (M3; each: what, why, how to undo)
(none yet)

## Assumed decisions (job lead; each with how to undo)
- **A1 (node_modules):** the worktree's `node_modules` is a junction to `C:/NightShift/Mobile-Coop-sector-restart`'s
  (the dependency lock is identical; `npm ci` counts as heavy and the desktop lock was held). Undo: delete the junction
  and `npm ci` under the lock.
