# Training run - state

> **History (process audit, 2026-10-19):** Fallow is parked behind `?legacy=1` (CT prototype B1); the training level is Marlow Yard (`ctcourse`). The current state of every job is `docs/ROADMAP.md`.

Current step: PAUSED for Michael's walk 2 (after T5g); resume with walk-2 fixes, then TM
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
| C | T5b walk-1 fixes (automatic airlocks, client prompts and doors, objective list) | done | 4cae63f |
| C | T5b2 partners block each other (D49) | done | (this commit) |
| C | T5c BAYS v2 redesign (docs) | done; its 3 open B3 items closed in T5e | 8c10c3c |
| C | T5d rebuild Upper (B1, A1, B2, A2) | done (cloud; RL2 turnstile, re-glaze, re-lamp stubbed for T7a; interim A2 -> v1 B3 passage until T5e) | 49f417d |
| C | T5e rebuild Shaft and Cistern (B3, A3, B4, A4) | done (cloud; T5c open items closed; B4 at interim (93, 30) with a passage from A3 until T5f, A71; turnstiles, sprung window, hatch, grilles stubbed for T7a; A4 wall medkit missing, added in T5f) | 2fe4faf |
| C | T5f rebuild Plant (B5, A5, B6, S6, A6) | done (cloud; B4 / A4 at v2, interim removed, A4 medkit; v1 Deep moved (+17.5, -29) until T5g, A74; circuits, security devices, guards and relief stubbed for T6 / T7a / T7b) | f787448 |
| C | T5g rebuild Deep (B7-B9, L9), then PAUSE for walk 2 (block-end checks done; paused) | built (cloud; A74 undone, bounds A77, numbers A76; guards, circuits, devices stubbed for T6 / T7a / T7b); checker PASS bar two BAYS rows, fixed | 9215c85 |
| C | TM merge locomotion 09-20 (waits for loco 20, D15), with the movement re-check (D50) | not started | |
| C | T6 light, zones, surfaces | not started | |
| C | T7a course data, drills, gates, devices | not started | |
| C | T7b guards | not started | |
| C | Block C end, then PAUSE for walk 3 (D50) | not started | |
| D | T8a e2e bays B1-B5 | not started | |
| D | T8b e2e bays B6-B9, full course, perf | not started | |
| D | T8c bot as course partner | not started | |
| D | T9a art layer Upper and Plant | not started | |
| D | T9b art layer Deep | not started | |
| D | T10 light showcase, docs, REVIEW.md | not started | |

## Blocked
(none; the T5c open items were closed in T5e: REVIEW-NOTES "T5e")

## Pending PC (visual items for Michael)
(see PC-PASS.md) - every row pending PC run (cloud Blocks A-B); row 1 (GPU baseline) first at the next local block end

## Open assumptions
A1-A77 (DECISIONS.md; A6 revised per D21, A15 resolved)

## Next for Michael
1. Where the run is: PAUSED for walk 2. Every bay (B1-B9) is rebuilt to BAYS v2 under the course rules R1-R8.
   LEDs are unlit until T6; guards, drill ticks and devices are stubs until T7a / T7b, so airlocks cycle with
   objectives open.
2. On the PC (C:\NightShift\Mobile-Coop), follow docs/training/WALK.md (start commands, two tab URLs, F3
   teleports, per-bay checklist, "look at" items). In short: `git fetch origin`, `git checkout feature/training-bunker`,
   `git pull`, `npm ci`, `npm run dev`; open
   `http://localhost:5173/?net=local&autostart=bunker&mode=course&fullbright=1&gfx=min` in two tabs. Walk B1-B9
   (about 30-45 min).
3. Write notes under "## Walk 2" in docs/training/WALK-NOTES.md, one line each, e.g.
   `- B3 G5: the rope point is hard to find; no prompt until I face the beam`. Then:
   `git add docs/training/WALK-NOTES.md`, `git commit -m "walk 2 notes"`, `git push`.
4. Send (cloud or PC):
   ```
   Training run: RESUME. Follow docs/training/BRIEF.md.
   ```
5. After that: a walk-2 fix step (only if notes exist), then TM (stops if locomotion step 20 has not landed on
   origin/feature/ct-locomotion), T6, T7a, T7b, then the stop for walk 3 (D50). About 5-6 steps.

## Next action
On RESUME: read BRIEF, RULES, STATE; read docs/training/WALK-NOTES.md "## Walk 2". If notes exist, write a fix step
(like T5b) from them and run it; then TM (docs/training/steps/TM-merge.md, with the D50 movement re-check).
