# Training run - state

Current step: PAUSED for Michael's walk (D27) after Block B; resume with T5b
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
| B | T4 Plant | done | 1094b71 |
| B | T5 Deep | done | d6cbef8 |
| B | Block B end, then PAUSE for Michael's walk (D27) | done; paused (GPU rows pending PC run) | a75574b |
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
A1-A43 (DECISIONS.md; A6 revised per D21, A15 resolved)

## Next for Michael
1. Where the run is: Blocks A and B are done (course framework, all nine bays and eight airlocks as greybox, checked).
   The run is paused for your walk of the geometry (D27).
2. On your PC: `cd C:\NightShift\Mobile-Coop`, `git fetch origin`, `git checkout feature/training-bunker`, `git pull`,
   `npm ci`, `npm run dev`.
3. Two tabs, one after the other (2 s apart): `http://localhost:5173/?net=local&autostart=bunker&mode=course&fullbright=1`.
   Alone: `http://localhost:5173/?autostart=bunker&mode=course&course=solo&fullbright=1`. F3 > Teleport lists B1-B9, A1-A8, L9, S6
   and the extra points (B3-RC, B3-G3, B3-rope ...).
4. Per bay, about 5 minutes: the checklist table in docs/training/WALK.md. Start with the top 5 risks at the end of
   docs/training/BLOCK-B-REVIEW.md. `&fullbright=1` lights it like day for the walk (the real light plan comes in T6).
5. Notes on the review page https://claude.ai/artifact/JMcAnistZtmPb6g3eyLMBs (saved for the run), or in docs/training/WALK-NOTES.md, one line each, e.g. `B5 | B5-SR | breaker escape too long | move the ladder`.
   Then: `git add docs/training/WALK-NOTES.md`, `git commit -m "training: walk notes"`,
   `git push origin feature/training-bunker`.
6. Then send in a Claude Code session on the PC (folder C:\NightShift\Mobile-Coop):
   ```
   Training run: RESUME. Follow docs/training/BRIEF.md.
   ```
7. After that: T5b applies your notes, then TM (waits for locomotion step 20 on origin/feature/ct-locomotion: the next
   planned stop if it has not landed), then T6 light, T7a course data, T7b guards and the Block C end (about 6 steps).
   The first local block end also runs every pending PC-PASS row (GPU baseline, shots, perf).
## Next action
Paused. On RESUME: read BRIEF, RULES, STATE; then T5b (docs/training/steps/T5b-walk-fixes.md) with WALK-NOTES.md.
