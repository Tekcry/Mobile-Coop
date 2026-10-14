# Training run - state

Current step: T5e (rebuild Shaft and Cistern; closes the T5c Blocked items first)
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
| C | T5c BAYS v2 redesign (docs) | done with 3 open B3 items (Blocked, see below; T5e resolves them first) | (this commit) |
| C | T5d rebuild Upper (B1, A1, B2, A2) | done (cloud; RL2 turnstile, re-glaze, re-lamp stubbed for T7a; interim A2 -> v1 B3 passage until T5e) | (this commit) |
| C | T5e rebuild Shaft and Cistern (B3, A3, B4, A4) | not started | |
| C | T5f rebuild Plant (B5, A5, B6, S6, A6) | not started | |
| C | T5g rebuild Deep (B7-B9, L9), then PAUSE for walk 2 | not started | |
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
T5c open items (B3 rope stages, after 3 fix rounds; resolve first in T5e):
  1. R2 skip G5 -> ML without the rope: a walk-off from HS's open north edge at a jog lands on ML (~x 6.8, z 2.0) or
     catches ML's open west lip (7 m fall, gravity 18, no fall damage); BAYS ~:400/:401/:473/:487 "any fall lands in NR"
     is false. Fix: full-height flush glass screen at x 5.6..5.95 from ML's floor to y 23.0, ML west edge noLedge (or log
     an A51-style residual for Michael).
  2. Rope kick-outs (swingOut 1.2) sweep through ladder cages: NR's ladder (x 4, z 2.5) inside RP1's volume
     x 3.0..6.6, z 1.0..2.8, y 13.6..21.4; RF's ladder (x 7.4, z 0) inside RP2's volume x 7.0..9, z 0..3, y 7.5..15.4.
     Move both ladders out.
  3. Stale wording: REVIEW-NOTES ~:79-82 ("hoist niche in the south wall", "slot in ML's west screen"), A61 ("ML's west
     slot"); BAYS ~:401 recovery 0.6 s -> ~0.7 s; element register lacks DB, hatch, turnstiles.

## Pending PC (visual items for Michael)
(see PC-PASS.md) - every row pending PC run (cloud Blocks A-B); row 1 (GPU baseline) first at the next local block end

## Open assumptions
A1-A70 (DECISIONS.md; A6 revised per D21, A15 resolved)

## Next for Michael
1. Where the run is: walk 1 done (notes in docs/training/WALK-NOTES.md, decisions D40-D48, course rules R1-R8 in SPEC).
   Next: T5b, T5b2 (partner blocking, D49), T5c (BAYS v2) and T5d (Upper rebuilt) done; T5e-T5g rebuild the other bays, then the run stops for walk 2.
2. These steps need no GPU and no locomotion work: run them in a Claude Code cloud session (repo Tekcry/Mobile-Coop) or
   on the PC. Send:
   ```
   Training run: RESUME (cloud). Follow docs/training/BRIEF.md. Use branch feature/training-bunker.
   ```
   (On the PC, drop "(cloud)" and the branch sentence is optional.)
3. After that: about 6 steps, then a stop with walk-2 instructions (URLs, what to check, where to write notes).

## Next action
On RESUME: read BRIEF, RULES, STATE; then T5e (docs/training/steps/T5e-*.md): first close the T5c open items under Blocked, then move B3 to (65, 46) against A2's east wall and remove the Upper's interim passage (bunkerUpper `INTERIM_PASSAGE`, the 'B3' passage rects in the room graph test).
