# PC pass (this PC, E2E_GPU=1)

Run at block ends only (RULES "GPU on this PC"). Numbers against a limit are real results on this PC; looks are for
Michael (the run saves the screenshots under `test-results/training/`, not committed). Checkers add rows as steps land.

| # | Item | Command | Pass limit | Added by | Result |
| --- | --- | --- | --- | --- | --- |
| 1 | Desktop perf budget on the Warehouse (baseline for this PC) | `E2E_GPU=1 node scripts/perf.mjs --desktop --budget` | docs/systems/performance.md desktop budgets | T0 | |
| 2 | Desktop perf budget in the bunker, B9 with 7 guards (needs T8b's `MODE=` and `PERF_POINT=` in perf.mjs) | `E2E_GPU=1 MAP=bunker MODE=course PERF_POINT=B9 node scripts/perf.mjs --desktop --budget` | same budgets; draws <= 600, triangles <= 8 M | T8b | |
| 4 | One screenshot per bay from its vantage at Epic and at the phone look | `E2E_GPU=1 node scripts/shot.mjs test-results/training/<bay>.png "autostart=bunker&mode=course" 120 "const g=__app.current,d=g.world.layout.debugPoints.find(p=>p.id==='<bay>');g.player.controller.teleport(d.pos,d.yaw)"` (T2-T5 add one debug point per bay vantage, ids B1..B9) | Michael: the bay reads as BAYS describes (shape, colour temperature) | T5 | |
| 5 | Light look per bay: lit pools, dark pockets, emergency lamps, night vision in B1 store and B3 chamber | as 4, after T6, plus goggles on | Michael: darkness is dark; lit chokepoints visible; meter agrees | T6 | |
| 6 | Course light sync on the client (T1b): the mains group cut / restored and a shot-out lamp restored after a bay restart render the same on the client page as on the host (baked lamps, light meter) | `E2E_GPU=1 node scripts/run-e2e.mjs e2e-course`, plus host and client screenshots of courselab cell 6 before and after the mains cut | Michael: client and host views agree; the meter matches (light parity) | T1b | |
