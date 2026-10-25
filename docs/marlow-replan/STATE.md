# J14 Marlow Yard re-plan - state
Owner: Marlow Build. Status: current.

## Resume block
- Branch feature/marlow-replan, worktree C:/NightShift/Mobile-Coop-marlow-replan. Guard: `test "$(git rev-parse
  --abbrev-ref HEAD)" = feature/marlow-replan`. Docs only so far (no src / test / map / script / config change).
- Michael approved REPLAN ~19:16 "Approve as drawn (Recommended)" (`REPLAN.md:47-48`). Build plan written:
  `PLAN.md` (planner Opus 5.5, master 94e72b1cd), BRIEF fixed per lead notes (`BRIEF.md:48` A2 = A8 caught retries in
  place, `:73` A9 #443 merged, `:38` 10 guards).
- Graph: `graph.json:8` `meta.taught_by` "A6", 17 `teach:<move>` space tags (PLAN A13, `PLAN.md:375`); master
  validator 2 ERR / 78 WARN (`validate-run.txt`, notes at the end). No `area` yet: slice G0 (`PLAN.md:221`).
- PLAN map: code today `PLAN.md:8-50`; design `:52-121` (dark map `ctcourseReplan` A16, bays stay 8 and the 18 steps
  are stations `:62`, `StationDef` verbatim `:68-84`, retry rule `:86`); claims and collisions `:123-205`; slices
  `:207-334`; flags `:336`; waves `:342-350`; gates `:352`; walk items `:363`; A13-A25 `:374-410`; Assume and log
  `:411`; blocks `:415-421`.
- Slices: D1 station sheet (Opus, docs), G0 graph `area` (Sonnet, docs), S0 variant base (Sonnet, PR 1, flag
  `marlowReplan`), R1 station retry runtime (Opus, PR 2, wire `course.st`, two checkers), F1 live rule fixes (Opus,
  PR 3: revive cap 2, one-out no restart, solo Start blocked, room map), set slices G-A1A7 / A2 / A3 / A4 / A5 / A6 /
  A8 (Sonnet, PRs 4-10), R2 HUD + ratings (PR 11), G1 graph as built + gates (PR 12), KS1-KS5 kit stations (PRs 13-17),
  C1 switch-on cleanup.
- Wave 1 (now): D1, G0, S0, F1; R1 from S0's first commit (`stationDef.ts`). Wave 2: the seven set slices from the
  lead's merge of S0 + R1 (`feature/marlow-replan-base`); G-A2 / A3 / A6 after #441. Wave 3: R2 (after #441), G1.
- Blocks elsewhere: Player coop-kit part 2 (K0-K5b, waits on Campaign's mission-engine kit PR) and `kitMoves` for
  KS1-KS5; Guard AI board-noticed hook (KS5); J12 PR A / S2 / S4 / D-A and J13 R6 / R8 for G1's gates.
- For the orchestrator: Assume and log A15 (10 guards not 12), A19 (chimney gap 1.4 m not 1 m) plus BRIEF A3 / A5 /
  A7; order #441 and map-ready vs R1 / F1 (`PLAN.md:169-205`); S0 touches Test Runner's `run-e2e.mjs` /
  `e2e-times.json`.
- Marlow Yard is AT CAP: everything ships dark behind `marlowReplan` (switch-on target 2026-10-29, after the walk).
- Next: plan checker on 82f1f823e (PLAN head; later commits are STATE only).

## Done
- 20:45 BRIEF A2 / A9 / guard total fixed; graph `meta.taught_by` + `teach:` tags; validator rerun (8217b0628).
- 20:55 PLAN.md written: claims (claims-check 32 overlaps, listed), 17 slices in PRs, waves, gates, A13-A25 (82f1f823e).
- 18:19 graph.json (training profile) and first validator run (3 errors: coverage, A3, A4).
- 18:36 replan-plan.svg first version (13 badges).
- Graph: the five new kit moves added as stations (A2 plank, A4 deadweight, A5 chimney and swing, A6 drop catch); A6
  staff stair closed and the drive pit added (forces the drop catch; dead-end errors cleared); A8 public stair 2.4 m.
- validate-run.txt rerun: 2 errors (both not applying), A4 error fixed; notes per error and warning class.
- replan-plan.svg checked against graph.json and updated: 18 badges renumbered, new stations drawn dashed, A6 route
  through the pit, no commit hash or rule codes in Michael-facing text.
- BRIEF.md, REPLAN.md, STATE.md written; each committed and pushed.
