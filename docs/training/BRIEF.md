# Training run - brief

Start a session on Michael's PC (Claude Code, local, in `C:\NightShift\Mobile-Coop`) with the message:

    Training run: START. Follow docs/training/BRIEF.md.

Resume after a stop, a crash or a compaction with:

    Training run: RESUME. Follow docs/training/BRIEF.md.

You are the orchestrator of an unattended local run. Michael gives no input until the final review (DECISIONS D12):
never ask him anything and never use AskUserQuestion. Work through the steps in STATE.md. Two planned stops: after
Block B (Michael walks the geometry, D27) and at TM if locomotion step 20 is not on origin/feature/ct-locomotion yet
(D15). Resume on "Training run: RESUME". After Block D write REVIEW.md and stop. Never open a pull request and never merge anything.

## 0. Branch
- `git fetch origin`, `git checkout feature/training-bunker`, `git pull origin feature/training-bunker`.
- Commit and push only `feature/training-bunker`. Never commit to or push `feature/kestrel` (an overnight run pushes
  there), `feature/ct-locomotion` (the locomotion run), `ct-movement`, `dev` or `master`.
- On this branch ignore the `feature/kestrel` line at the top of CLAUDE.md; follow docs/training/RULES.md.

## 1. Goal
Build the Fallow training bunker (map id `bunker`) start to finish as designed in docs/training/: the course framework
(the one new system), all nine bays and eight airlocks with their light plans, devices, guards and course data in their
"now" forms, the `e2e-bunker` suite, and the docs. The map must be playable end to end by two players over `?net=local`
and by two PCs over the co-op lobby. Switch-on sessions (PLAN.md section 3) are separate later runs; this run builds
every element in its final geometry so that they only flip flags.

## 2. Documents (read by section, never whole when large)
| File | Role | Who reads it |
| --- | --- | --- |
| RULES.md | Run rules, condensed (wins over everything but DECISIONS and this brief) | Orchestrator every resume; every subagent first |
| STATE.md | Current step, last commit, done / blocked / pending, next action (under 120 lines) | Orchestrator every resume |
| steps/*.md | One standalone file per step (80 lines or fewer): model, reads with line ranges, task, checks, commit | The step's implementer and checker |
| DECISIONS.md | Michael's answers D1-D12 and Claude's C1-C8; new assumptions append as A1, A2, ... | When a choice comes up |
| SPEC.md | Map spec and the approved exceptions E1-E10 | Steps that build or check rules |
| BAYS.md | The build contract: bay sheets, guard sheets, register, metrics | Only the bay sections a step names |
| FEATURES.md | Feature matrix (status, bay, sync, check, placeholder) | T7a, T8a, T8b and the review |
| PLAN.md | Branch, prerequisites, switch-on map, order, editor scope | Orchestrator at block ends |
| LOG.md | One short entry per step | Orchestrator writes |
| PC-PASS.md | GPU, visual and perf items with command and pass limit | Checkers add; block ends run what can run |
| REVIEW-NOTES.md | Things for the final REVIEW.md | Anyone appends |

## 3. Blocks and steps
| Block | Steps | Ends with |
| --- | --- | --- |
| A Foundations | T0 facts (read-only), T1a course logic, T1b course mode and sync, T1c tutorial HUD, drills, results, bay select | Full `npm run e2e`; perf trend; GPU baseline |
| B Geometry | T2 Upper (B1, A1, B2, A2), T3 Shaft and Cistern (B3, A3, B4, A4), T4 Plant (B5, A5, B6, S6, A6), T5 Deep (B7, A7, B8, A8, B9, L9) | Full e2e; perf trend; GPU shots per bay; then PAUSE for Michael's walk (D27) |
| C Life | T5b walk notes; TM merge locomotion 09-20 (waits for loco 20, D15); T6 light, zones, surfaces; T7a course data, drills, gates, devices; T7b guards | Full e2e; perf trend; GPU light look per bay |
| D Proof | T8a e2e bays B1-B5; T8b e2e bays B6-B9, full course, coverage, perf; T9a art layer Upper and Plant; T9b art layer Deep; T10 light showcase, docs, REVIEW.md | Final checks; REVIEW.md; stop |

## 4. Step loop (the same as the locomotion run)
1. **Implement:** one subagent (opus). Its prompt is the step file plus: "Read CLAUDE.md and docs/training/RULES.md
   first. Do only this step. Run the checks the step file names before finishing. Return: files changed, check results
   with their summary lines, anything left undone, new assumptions. Do not commit."
2. **Check:** a fresh subagent (opus) that did not implement. It reads the step file, `git diff` and the BAYS sections
   the step names; re-runs the step's checks itself; compares against BAYS, SPEC (exceptions only where listed) and
   CLAUDE.md hard rules; adds GPU and visual items to PC-PASS.md; cites file:line or script output for every claim;
   returns PASS, or FAIL with a numbered fix list.
3. **Fix:** on FAIL a new implementer gets the fix list. At most 3 rounds, then Blocked (RULES).
4. **Commit:** on PASS the orchestrator commits with a path-limited commit, message `training TN: <summary>` plus the
   attribution lines, pushes, and updates LOG.md, STATE.md, CHANGELOG.md and TESTING.md (when the step adds playable
   content), FEATURES.md (status changes) and the docs/systems/*.md files the step names.
5. **Block end:** full `npm run e2e` in the background (wait for its notification), the perf trend, then the block's GPU
   items (RULES "GPU on this PC"). Fix regressions before the next block.

## 5. Finish (after T10)
- REVIEW.md in plain English, by the four goals (D23: fun, co-op sync, coverage, light and dark), then what was built per block; every assumption as a question with the recommended answer
  first; exceptions E5-E10 for confirmation; the now / final state of every gate; a numbered two-player checklist
  (desktop only, D24; pad first, then keyboard and mouse; the dev solo flag, two browser tabs
  `?net=local&autostart=bunker&mode=course`, then two PCs over the lobby); the PC-PASS results and anything still pending; blocked and deferred items; the switch-on sessions to run next.
- STATE.md: "Run complete". Final message, 15 lines or fewer: done / blocked / deferred / pending counts, the REVIEW.md
  path, and the next prompt names ("Training: feedback", "Training: SW-L1" ...).
