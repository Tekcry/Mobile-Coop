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
Proposed by the step 3 spec (`SPEC.md` section 4, which has the full table) for Michael's review.

- **L1 - LD 3.2 (LD:32), three routes plus a secret per guarded space.**
  - What: routes are counted per section (objective and exit), not per room.
  - Why: counting per room multiplies routes in small rooms.
  - Undo: add the missing route kinds to each space.
- **L2 - LD 3.3 (LD:36), routes rejoin before the next space and none skips a space.**
  - What: routes rejoin only at the objective room and the connector.
  - Why: the sandbox's roof and void routes skip rooms on purpose.
  - Undo: add a pinch point in each space.
- **L3 - LD 16.2.1 (LD:305), storeys joined only by stairs or ladders inside plant spaces.**
  - What: fixed caged ladders from the workshop to the plant deck, and up to the crane walkway.
  - Why: this is real warehouse practice.
  - Undo: replace them with a stair.
- **L4 - LD 16.2.5 (LD:309), roof access only by a stair bulkhead or fire stair.**
  - What: roof access is a hatch with a fixed ladder from the plant deck.
  - Why: this is real practice on industrial units.
  - Undo: build a stair bulkhead.
- **L5 - LD 16.7.4 (LD:345), never an opening that pops into a room as a shortcut.**
  - What: ceiling access hatches into the corridor, the mess and the security office.
  - Why: this is the CT ceiling entry, and the hatches sit at real void access points.
  - Undo: remove the hatches.
- **L6 - LD 16.7.5 (LD:346), ducts only inside walls, slabs or ceiling voids.**
  - What: sprinkler mains (and a visual duct) hang exposed under the roof at 4.7-5.0 m.
  - Why: warehouses hang their services exposed, and at that height there is no accidental mantle.
  - Undo: remove the pipes.
- **L7 - LD 16.7.3 (LD:344), crawl spaces 1.5 m clear.**
  - What: the void openings are 1.3-1.4 m clear, and the crawl under the trailer is 1.3 m.
  - Why: the void must stay under 1.7 m so guards stay out, and a real trailer bed is about 1.3 m high.
  - Undo: raise the openings to 1.5 m and drop the trailer crawl.
- **L8 - LD 11.3 and 11.5 (LD:117, LD:122), co-op lips at 4.3-4.5 m, every lip in the band planned.**
  - What: under G151, a 2.4-4.6 m lip with no wall below it is a co-op target, provided its surface is also
    reachable solo (LD 11.4 is kept).
  - Why: G151 replaced G81's marked spots, and the doc still cites G81.
  - Undo: limit co-op targets to 4.3-4.5 m.
- **L9 - LD 16.9, 13 and 14 (LD:354-361, LD:195-271), element register, deliverables and phases.**
  - What: the spec's tables stand in for them, plans are ASCII, and the build is one greybox step.
  - Why: this is a prototype for Michael to judge.
  - Undo: produce the full set before the final build.
- **L10 - LD 15 (LD:273-285), acceptance tests.**
  - What: only e2e-sectorops and the Vitest checks run.
  - Why: most of the tests need a finished build.
  - Undo: run the full section 15 set.
- **L11 - LD 3.1 (LD:30), one entry vantage per space that sees every guard.**
  - What: in section 2 (later), one dark vantage per aisle end, with every guard readable from at least one.
  - Why: a racked hall cannot show 9 guards from one spot.
  - Undo: one vantage per space.
- **L12 - LD 16.2.1 (LD:305), extends L3 to section 3.**
  - What: caged ladders for the mezzanine's west escape, the crane walkway and the plant room's roof hatch.
  - Why: real crane and plant access; the escape ladder is a player-only way down (guards use the stair).
  - Undo: a second stair at the deck's west end, stairs for the rest.
- **L13 - LD 16.7.4 and 16.7.5 (LD:345-346), extends L5 and L6 to section 3.**
  - What: the fire-exit lobby's roof hatch, and the office supply duct (auto-crawl from the plant shaft, G56) exposed
    along the east wall into the production office.
  - Why: the CT drop entry; halls hang their services exposed.
  - Undo: remove the hatch; box the duct into a riser that stops at the deck.
- **L14 - scale sheet "Corridor ... never under 3.0" (scale-sheet.md:37), applied to aisles.**
  - What: section 2's VNA aisle A2 is 1.8 m.
  - Why: real VNA aisles are 1.7-1.9 m and barred to pedestrians, so no guard walks it; the split jump needs 1.2-1.95.
  - Undo: widen A2 to 3.0 and drop the split jump.
- **L15 - LD 3.1 (LD:30), extends L11 to section 3.**
  - What: one vantage per volume (the floor from the C3 door, the deck from the west ladder head, the plant room from
    its west door).
  - Why: the deck, the office and the plant room are separate volumes.
  - Undo: one vantage per space.

## Assumed decisions (job lead; each with how to undo)
- **A1 (node_modules):** the worktree's `node_modules` is a junction to `C:/NightShift/Mobile-Coop-sector-restart`'s
  (the dependency lock is identical; `npm ci` counts as heavy and the desktop lock was held). Undo: delete the junction
  and `npm ci` under the lock.
- **M5** (2026-10-20 13:05, via the orchestrator): "Is there capacity to continue the sector ops on desktop when
  nothing else is running, it shouldn't take priority". The job resumes at the lowest priority; the PR waits for
  Michael's look at the direction. The SPEC "Decisions" are the job lead's (A2-A7 below).
- **M6** (2026-10-20 14:05, via the orchestrator): Michael chose "Merge to master" for the section 1 greybox, to walk it
  on /preview/. The PR (a minor step) opens when the laptop run on 0017294d is green; sections 2-3 follow at the lowest
  priority.
- **A2 (C1, M8 isolation in time):** the takedown check (`sectorCheck.ts`) passes a guard whose spot is statically
  unseen (as now) or that has 3 s or more of isolation in a row on its timed patrol (SPEC 6 model), so section 1 needs no
  filler geometry. Undo: drop the time branch (sections 2 and 3 pass the static branch).
- **A3 (N1):** `sectorMode.ts` passes per-point `waits`, `faces`, `start` and `loop` like `infiltrationMode.ts`. Undo: the
  one call back to `wait` only.
- **A4 (D3):** section 1's start is the yard's south-west corner. Undo: the old start and spawns.
- **A5 (D4):** sections 2 and 3 keep their heavies and indoor sniper until rebuilt (against G155 for co-op; noted for
  Michael). Undo: swap them to guards now.
- **A6 (D5):** section 1 has 8 guards (was 10); the PC perf run (G187) sets any rise. Undo: add guards with jobs.
- **A7 (E7):** the workshop fire exit is an unlocked door leaf until one-way doors exist; a hatch climb-up that the
  engine cannot do makes that hatch drop-only. Undo: build the one-way door / climb when the engine has them.
