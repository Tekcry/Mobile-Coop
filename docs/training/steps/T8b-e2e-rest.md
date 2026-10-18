# Step T8b - e2e-bunker: bays B6-B9, the full course, perf (Block D)

Model: implementer opus, checker opus. Deps: T8a. Runs e2e-coop and e2e-netmove.

## Read
- FEATURES.md rows placed in B6-B9 and section 11; BAYS.md B6-B9 "Sequence" and "Co-op split and gate"
- scripts/e2e-bunker.mjs (T8a); scripts/perf.mjs 70-100 (MAP, params)

## Task (decisions)
1. Sections B6-B9 as in T8a item 2. Plus: B6 operator / runner split (each role's drills by the right player per the swap
   rule); B7 every takedown kind on its guard (behind, front, side, corner, over the sandbags, drop from the water main,
   ledge pull, window, inverted), dual takedown within 1.5 s, interrogation (or its now form), carry and hide, drag, a
   body found by B7-W when left out; B8 every weapon class, every gadget, live fire survived with the catwalk cover;
   B9 keys A and B in parallel, the case, the pair gate refused at 1.5 s and accepted at 0.9 s, the lift, the results
   screen with the course panel on both pages.
2. The full course: one section runs B1 -> L9 with both players doing every drill (teleports only between drills);
   `courseDone` fires; the course record now offers every bay; the per-player coverage report lists every "(both)"
   FEATURES row done by both players - any missing row fails the suite (D30).
3. Ratings (D31, D32): B7 with a lethal takedown costs nothing in the results; a scripted B9 ghost run (both sync
   moments, the keys) ends with the Ghost tier; a run with one knock-out ends Silent; a run with an alarm ends Loud.
   Friendly fire (D38): a shot and a grenade down the partner in B8; the revive works.
4. `scripts/perf.mjs`: a `MODE=` env (default as now) and a `PERF_POINT=` debug point env, so
   `MAP=bunker MODE=course PERF_POINT=B9` measures the finale with its squad.

## Checks
`timeout 900 npm run check`; `node scripts/run-e2e.mjs e2e-bunker e2e-course e2e-coop e2e-netmove`; full `npm run e2e`
in the background; the perf trend with `MAP=bunker MODE=course PERF_POINT=B9`; PC-PASS row 2 with `E2E_GPU=1` (real
desktop numbers on this PC, against the budgets).

## Commit
"training T8b: e2e-bunker bays B6-B9, full course, coverage, perf on the bunker". Docs: testing-tools.md (perf envs),
LOG, STATE, PC-PASS results.
