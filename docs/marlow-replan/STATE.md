# J14 Marlow Yard re-plan - state
Owner: Marlow Build. Status: current.

## Resume block
- Branch feature/marlow-replan, worktree C:/NightShift/Mobile-Coop-marlow-replan. Plan only (no src / test / map /
  script / config change).
- Waiting on Michael: `REPLAN.md` "The decision" (Approve as drawn (Recommended) / Show me the detail first / Change
  something). Nothing is built before his pick.
- Files: `BRIEF.md` (his words, picks, assumptions A1-A11), `REPLAN.md` (his page), `replan-plan.svg` (to scale,
  18 badges), `graph.json` (training profile, 8 sections), `validate-run.txt` (master validator, notes per line).
- Validator (master, unchanged): 2 errors, 61 warnings. Both errors do not apply (Q29 coverage; A3's vent unlock is a
  `bolted` door the validator's COOP_KINDS does not count). Notes: `validate-run.txt` "What each line means".
- Assumptions that loosen a Michael-only rule (for the lead, not decided here): BRIEF A3 (new-move stations open only
  when each move is built, Q29), A5 (pull-up counted with the human ladder, Q29), A7 (A8 keeps 3 guards under
  campaign-area route rules, Q24).
- New-move stations and their stand-in graph kinds: A2 `a2-east -> a2-pitside` plank_bridge (pair_gate); A4
  `a4-passage -> a4-cross` deadweight (shutter); A5 `a5-gap -> a5-walltop` chimney_pair (team_rope),
  `a5-apron-east -> a5-apron` swing_pass (team_throw, `gap_m` 3.5); A6 `a6-bridge -> a6-pit` drop_catch (drop 6 m).
- Geometry changes the build job places to the 0.5 m grid: A2 open pit and isolator 2 moved west of it; A4 lift
  grille; A5 6 m perimeter wall, 1 m gap, inside ladder, 3.5 m trench, drums moved; A6 drive pit sunk 1.6 m with the
  outfall door in it, staff stair closed; A8 public stair widened to 2.4 m.
- Retry rule to build: A1-A7 spotted or failed = retry that station from its start mark (BRIEF A1); A8 detection plays
  out (A2); drills retry in place (~11:55).
- Test Runner allowlist (#445): none. No set in this plan starts a guard downed (no body-carry drill) or below y -5;
  the only sunk space is the A6 drive pit at -1.6 m and it has no guard.
- Next: on Michael's pick, write PLAN.md (build slices per set, the five new moves first via their co-op jobs), or apply
  his changes to graph.json, replan-plan.svg and REPLAN.md and rerun the validator.

## Done
- 18:19 graph.json (training profile) and first validator run (3 errors: coverage, A3, A4).
- 18:36 replan-plan.svg first version (13 badges).
- Graph: the five new kit moves added as stations (A2 plank, A4 deadweight, A5 chimney and swing, A6 drop catch); A6
  staff stair closed and the drive pit added (forces the drop catch; dead-end errors cleared); A8 public stair 2.4 m.
- validate-run.txt rerun: 2 errors (both not applying), A4 error fixed; notes per error and warning class.
- replan-plan.svg checked against graph.json and updated: 18 badges renumbered, new stations drawn dashed, A6 route
  through the pit, no commit hash or rule codes in Michael-facing text.
- BRIEF.md, REPLAN.md, STATE.md written; each committed and pushed.
