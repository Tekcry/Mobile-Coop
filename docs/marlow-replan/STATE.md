# J14 Marlow Yard re-plan - state
Owner: Marlow Build. Status: current.

## Resume block
- Branch feature/marlow-replan, worktree C:/NightShift/Mobile-Coop-marlow-replan. Guard: `test "$(git rev-parse
  --abbrev-ref HEAD)" = feature/marlow-replan`. Docs only so far (no src / test / map / script / config change).
- Michael approved REPLAN ~19:16 "Approve as drawn (Recommended)". Picks since: ~20:40 "12, add two" (guards) and
  chimney gap "1.4 m" (`BRIEF.md:31-35`); ~20:50 "Marlow first" (`PLAN.md:420`, ROADMAP Decided).
- Plan check 1 (Opus, FIX, C:/NightShift/scratch/marlow/j14-plan-check.md) answered, one commit per item:
  - Fix 1 F1 out player returns (dff7647d2, 7ccd46471): the exit airlock cycles with the survivor while the partner is
    out, the out player respawns inside it, checkpoint advanced; a lone survivor may work a pair gate; on
    `ctcourseReplan` going out = that station's retry (R1 `onPlayerOut`, cause `out`). Test case named in F1's done
    line (`PLAN.md:334-363`). F1 owns the `out` / `oneMay()` / `need()` / pair-gate hunks of `courseState.ts`.
  - Fix 2 guards 12 (b15000a1c): A1 0, A2 1, A3 0, A4 3, A5 2, A6 1, A7 2, A8 3; A7 pod-leg technician, A5 kiosk
    watcher, A6 pit-side fallback (`PLAN.md:94-107`, A15 `:472`, D1 `:227`, G-A1A7 / G-A5 / G-A6 rows; `BRIEF.md:31-35`,
    `:44`; graph `a5-inner` guards 2, `a7-pod` guards 1 as a connector). Validator rerun: same 2 ERR, only the a5-inner
    INFO changed (`validate-run.txt` top and last note).
  - Fix 3 R1 hooks for J13 R4c (642ef1bc2): `window.__course.restarts` + `lastRetry` (`seen` / `caught` / `timer` /
    `out` / `down`) on host and client, wire `rs` / `rc` beside `st`, unit test (`PLAN.md:293-304`).
  - Fix 4 wave 1 seams (ce3b7de43): S0's first commit carries stationDef / flag / `SetPart.bay.stations` / ctcourse
    mapping / the `BayDef` line, then never edits `courseDef.ts` (`PLAN.md:261-265`); room-map line moved to R1; F1
    free of S0, ships first; set-slice PRs open after S0 + R1 are released (`PLAN.md:424-436`).
  - Marlow first in waves (932ef18d9); polish list done (6d9c284f0: 33 overlaps, F1 walk line, R1 done lines, src/net
    parse rule, A20 in Assume and log, replan calls from ctcourse.ts, S0 owns e2e budgets).
- Note for checker 2: STATIONS.md does not exist yet (slice D1 writes it); its guard rows are specified in D1's text.
  F1 built-yard limit stated: a team move between the survivor and the airlock still needs the partner (pause-menu
  bay restart, as today).
- PLAN map: code today `PLAN.md:8-50`; design `:52-132`; claims `:134-220`; slices `:221-412`; flags `:413`; waves
  `:419`; gates `:438`; walk items `:449`; A13-A25 `:463`; Assume and log `:501`; risks `:507`.
- Blocks elsewhere: Player coop-kit part 2 + `kitMoves` (KS1-KS5); Guard AI board-noticed hook (KS5); J12 PR A / S2 /
  S4 / D-A and J13 R6 / R8 for G1's gates.
- Marlow Yard is AT CAP: everything but F1 ships dark behind `marlowReplan` (target walk-ready Tue 27 Oct evening).
- Next: fresh plan checker 2 on 6d9c284f0

## Done
- ~21:45 Plan check 1 answered: fixes 1-4, Marlow first in waves, polish (dff7647d2..6d9c284f0); guards 12 placed,
  validator rerun.
- 20:40 Michael picked 12 guards and the 1.4 m chimney gap (6db797a09).
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
