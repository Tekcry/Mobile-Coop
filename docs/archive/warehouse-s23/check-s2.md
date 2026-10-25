# Check S2 - section 2 greybox (fresh checker)

2026-10-20. Branch `feature/warehouse-s23`. Read-only check; light commands only (`heavy.lock` held). No e2e, no build, no GPU.

## Commits checked
- `7b7afda9` section 1 lamp pass (`warehouseS1.ts` `S1_LIGHT_PASS`, `tests/warehouseS1Light.test.ts`, `LIGHT-S1.md`).
- `f4facc1d` section 2 greybox (`warehouseS2.ts` new; `warehouse.ts` `storageHall`; `warehouseOps.ts`; `warehouseSectors.ts`;
  tests `sectors`, `sectorStep3`, `rooms`, `warehouseS1Light`, `warehouseS2Light` new; `LIGHT-S2.md`, `step-s2-report.md`).

Read: BRIEF (M1, A1-A6), BUILD-S2.md, step-s2-report.md, LIGHT-S1.md / LIGHT-S2.md (method and tables), SPEC 2.2.

## Commands and results
| Command | Result |
| --- | --- |
| `npx tsc --noEmit` | clean (exit 0) |
| `npx eslint` on the 10 changed / related `.ts` files (5 src, 5 tests) | clean (exit 0) |
| `npx vitest run` sectors, sectorStep3, rooms, voxelFit, lampBake, warehouseS1Light, warehouseS2Light | 7 files, 74 passed, 2 skipped (the print tests), 4.3 s |
| Scratch Vitest (scratchpad, not committed): generated ledges with top > 4.5 m in or next to section 2 | only the north perimeter east of x -3.8 (section 3's side, there before). No lip on the x -4, west or north wall tops over the hall: A3 / A4 seal |
| Scratch Vitest: `worstIsolationOverPhases` (30 phases) for seeds 1-20, section 2 | see M8 below |

## Findings by ask
1. **Michael's asks.** Real rack sizes (1.1 single, 2.3 back-to-back, 1.8 VNA, 3.0 aisles, 4.0 tops), roof strips kept (visual), visual
   rafters, the C2 / C3 doors, a visual fire exit, the cage with a locked south gate and an unlocked issue gate, shelving and stock ladder.
   Contents have a job each (staged delivery, charge bay, issue desk, wrapper, wrapped stack); no filler. Three different routes to the case
   (A1 + fence climb; R2N ladder, rack tops, A2 jump, drop into the cage; A2 ladder over the beam, hang-drop, east gate) and three ways to C3
   (A3 + north gangway; the sprinkler mains; the north gangway from the issue gate). R1 and R3 share only the last 7 m of north gangway to
   the single door. 8 guards, each with a reason; kinds enforcer / grunt / officer / runner, no heavy, sniper or dog (asserted).
2. **The run on data.** Start = C2 checkpoint (asserted). C3 near / far door, box and checkpoint unchanged. Objective stand point
   (-22.1, 15.0): free floor, hinges 3.0 m and 2.4 m (rule 1.6), first-four guard slots 5.4 m or more, the stocktaker's nearest point 4.1 m
   (rule 1.8). The panel e2e: with 4 guards the nearest to (-4.15, 1) is the reach driver (12 m, open floor). Reinforce points on free
   floor. A3 (x -4 to 6.0 with parapet, same gaps) only adds height to section 3's west wall: the office has no ceiling there, the parapet is
   `noLedge`, so no new lip or route in section 3; S2 light test shows sections 1 and 3 within 0.02. A4 parapets sit exactly on the 1.0 m
   perimeter tops and meet section 1's at z -6.15. Nav and the suppressed-shot spot rely on the report's offline proxies: e2e-sectorops
   still pending (job lead).
3. **M8.** All 8 pass the committed test (seed 7). Over 20 seeds (30 phases each) the worst window at the spot: checker 1.75-4.0 s (5 of 20
   seeds under 3 s), tour guard 1.75-3.5 s (12 of 20 under 3 s); all others 3.0 s or more every seed (the three static guards and the
   stocktaker 5.5-25 s). Seed 7 is the suite's existing seed, not picked for S2, but S2 passes it with no margin (tour guard exactly 3.0).
   Not blocking: these are worst-of-30 phase draws; most runs give 3 s or more, both guards walk 12-14 m legs where they can be taken
   elsewhere, and circuit 40's switch at the C2 door darkens the lane and aisles. A takedown is not practically impossible.
4. **Light.** All lamps are `b.light` registry lamps, baked (`every new lamp is in the bake`), on wall-switch circuits 40 / 41 (parity).
   Every route waypoint 0.42-1.00, pockets 0.12-0.17 and +0.05 at most, column cap asserted against `LAMP_GRID_SLOTS` (8), lamps under the
   bake top. The dropped `warehouseS1Light` point (-14.5, -5.2) is the C2 far doorway's threshold, lit by section 1's own exit sign through
   the open door (0.06) now that the base racking no longer shadows it: a fair change; the grid points round it stay. The `rooms.test`
   nesting allowance is sound: a room wholly inside another in plan passes, partial overlaps still fail, and `roomAt` takes the smallest
   area (`rooms.ts:59`), so the cage tags correctly.
5. **Rules.** Plain Warehouse unchanged (`storageHall` defaults true, every skip is behind `sh`; 318 / 14 / 5 test green). No test
   weakened: the phase-drift test now covers sections 1 and 2, the section 2 test is new, the two edits are justified above. Babylon only
   via `core/babylon.ts`; map build code is not a hot path. Light fixtures are rig meshes, not level boxes (no collision).

## Verdict: PASS

## Fix list (blocking)
None.

## Polish / watch list (not blocking)
1. **The "shadow" route is lit.** M1 readability pushed most route points to 0.7-1.0, over `LIGHT.lit` 0.6 (full guard visibility; SPEC 2.2
   had every aisle dark). The checker's and tour guard's takedown spots are lit too. Done looks like: after Michael's walk, if section 2
   plays too exposed, drop the pendants to land route points at 0.40-0.55 (readable, under `lit`), pins unchanged.
2. **M8 margin.** Tour guard 3.0 s on the committed seed, 12 of 20 seeds under 3 s. Done looks like: if Michael finds the checker or tour
   guard exposed, the report's next lever (a pallet at the A1 mouth, or a longer pause), and the phase test passing on seeds 1-5.
3. **C2 far door leaf vs the checker's lane.** Hinge (-15.1, -6), swing north, 1.2 m: open, it stands across z -5.85 to -4.65 on the
   checker's z -5.0 line (1.65 m of lane left north of it). Watch in e2e-sectorops / the walk that the checker paths round it.
4. Rack-top lamp fixtures at y 5.8 sit at head height over R2N / R1N / W0N tops (visual clip, no collision).
5. `tests/warehouseS1Light.test.ts:96` uses `Math.hypot` (test, not a hot path; `hyp2` for consistency).
6. Pending as the report says: `npm run check`, build, e2e-sectorops (nav legs, objective reach, seal, suppressed-shot spot), the GPU look.
