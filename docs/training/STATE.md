# Training run - state

Current step: T4 Plant (Block B) - not started
Where the last step ran: cloud
Last commit: see git log (T1a done)
Branch: feature/training-bunker (from origin/feature/kestrel)

## Baseline (filled by T0)
- npm run check: lint 0 errors / 38 warnings; 99 files, 1085 tests passed; build ok
- smoke e2e: ok (8 s)
- Perf trend (node scripts/perf.mjs, no --budget, cloud software GL): sim p95 3.9 ms, anim 0.105 ms/char, alloc 11163 KB/s, draws 41, tris 0.15 M
- E2E_GPU=1 perf --desktop --budget (Warehouse, this PC): pending PC run

## Steps
| Block | Step | Status | Commit |
| --- | --- | --- | --- |
| A | T0 facts | done | (this commit) |
| A | T1a course logic | done | 5e81e9f |
| A | T1b course mode and sync | done | c81124a + comment fix |
| A | T1c tutorial HUD, drills, results, bay select | done | marker fix commit |
| A | Block A end | done (GPU items pending PC run) | |
| B | T2 Upper | done | ba09b54 |
| B | T3 Shaft and Cistern | done | 408f27d |
| B | T4 Plant | implemented (cloud), awaiting check | |
| B | T5 Deep | not started | |
| B | Block B end, then PAUSE for Michael's walk (D27) | not started | |
| C | T5b walk notes | not started | |
| C | TM merge locomotion 09-20 (waits for loco 20, D15) | not started | |
| C | T6 light, zones, surfaces | not started | |
| C | T7a course data, drills, gates, devices | not started | |
| C | T7b guards | not started | |
| C | Block C end | not started | |
| D | T8a e2e bays B1-B5 | not started | |
| D | T8b e2e bays B6-B9, full course, perf | not started | |
| D | T8c bot as course partner | not started | |
| D | T9a art layer Upper and Plant | not started | |
| D | T9b art layer Deep | not started | |
| D | T10 light showcase, docs, REVIEW.md | not started | |

## Blocked
(none)

## Pending PC (visual items for Michael)
(see PC-PASS.md) - every row pending PC run (cloud Blocks A-B); row 1 (GPU baseline) first at the next local block end

## Open assumptions
A1-A38 (DECISIONS.md; A6 revised per D21, A15 resolved)

## Next for Michael
Nothing yet: the run is starting (cloud, Block A).

## Next action
T4 checker (fresh agent): docs/training/steps/T4-plant.md checks, the A5 -> S6 nav walk; then commit T4.
