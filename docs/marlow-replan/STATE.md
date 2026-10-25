# J14 Marlow Yard re-plan - state
Owner: Marlow Build. Status: current.

## Resume block
- Branch feature/marlow-replan, worktree C:/NightShift/Mobile-Coop-marlow-replan. Guard: `test "$(git rev-parse
  --abbrev-ref HEAD)" = feature/marlow-replan`. Docs only so far (no src / test / map / script / config change).
- Michael approved REPLAN ~19:16 "Approve as drawn (Recommended)". Picks since: ~20:40 "12, add two" (guards) and
  chimney gap "1.4 m" (`BRIEF.md:31-36`); ~20:50 "Marlow first" (PLAN waves, ROADMAP Decided).
- Plan check 1 (FIX, C:/NightShift/scratch/marlow/j14-plan-check.md) answered dff7647d2..6d9c284f0 (guards 12, R1
  hooks, wave 1 seams, polish). Its fix 1 (one-out change) was overruled by plan check 2.
- Plan check 2 (Opus, FIX on 6d9c284f0, C:/NightShift/scratch/marlow/j14-plan-check-2.md) answered, lead decisions:
  - Fix 1 (d07f96887): checker's default. F1 = revive cap 2, lone-host Start block, M8 test only; no `out` /
    `setOut` / `oneMay()` / `need()` / pair-gate change, F1 does not edit `courseState.ts`; A21 three fixes; walk
    line without one-out; G349 citation gone. Downed rule unchanged (level-design 9.4, REPLAN): on `ctcourseReplan`
    one out takes the both-down bay restart, R1 records `restarts` cause `out` / `down`; no `onPlayerOut`
    (`PLAN.md:335`, F1 `:372`, A21 `:516`). No question to Michael.
  - Fix 2 (fdab780fa): R1 `window.__course.retryOff(n)` (host; station retry off until the bay restarts), unit test in
    R1's done line; R4c mapping `seen` / `caught` -> seen, `timer` -> timer, `out` / `down` -> other (`PLAN.md:324`);
    J13 claims bullet says the J13 lead is told when the PLAN passes (`:206-208`).
  - Polish (c116af71d, 2ea99f224, 0934d5999): claims-check rerun 43 overlaps (two new slice branches), mission-rules
    R4 / R5 ordered after F1, they rebase and widen F1's checks (`:221`); `scripts/e2e-ctcourse/revive.mjs` claimed;
    A7 pod-leg technician counted on `a7-hall` (guards 2), `a7-pod` a quiet connector, validator rerun (only the
    a7-hall INFO changes); `LastRetry = { st, cause } | null` on host and client, wire `rt` + `rc` (`:309`); R1 ~1,100.
- Plan check 3 (FIX, 2 items in F1, C:/NightShift/scratch/marlow/j14-plan-check-3.md) answered dda93c788 (Michael ~21:42
  "Yes, everywhere now": 2 players on every build, `?course=solo` dev only) and 0e79cd741 (course grant syringe 0).
  Plan check 4 PASS on 0e79cd741 (j14-plan-check-4.md); polish open (49 overlaps). J13 told the R1 hooks (route-runs-2 STATE).
- Wave 1 at the ~22:45 save (reports in C:/NightShift/scratch/marlow/; lead notes for wave 2 and seams:
  j14-wave2-notes.md - read it):
  - F1 = PR #463 (10dc0a9e9): two Opus checkers PASS, status posted; laptop affected-e2e + `rating` (e2e-section-rating)
    running. Train-ready when green. Tell the orchestrator.
  - S0 built (feature/marlow-replan-s0 464228fbc, first commit aa37044a9): Opus checker running -> j14-s0-check.md
    (missing: rerun). Open PR 1 on PASS. Open question: `ctcourseReplan` in DEV_MAPS vs R1's lobby `roomMap()`.
  - R1 built (feature/marlow-replan-r1 4d8c53ff6): two Opus checkers running -> r1-check-a.md, r1-check-b.md; on both
    PASS post `checker` and open PR 2 after PR 1.
  - D1 (STATIONS.md) and G0 (graph areas, check fixed 7bc609ba2) merged here. D1 check + seven wave-2 briefs being
    written to `docs/marlow-replan/briefs/` -> j14-d1-check.md.
- PLAN map: code today `PLAN.md:8-50`; design `:52-137`; claims `:138-236`; slices `:237-438` (R1 `:295`, F1 `:372`);
  flags `:439`; waves `:445`; gates `:464`; walk items `:475`; A13-A25 `:489`; Assume and log `:528`; risks `:534`.
- Blocks elsewhere: Player coop-kit part 2 + `kitMoves` (KS1-KS5); Guard AI board-noticed hook (KS5); J12 PR A / S2 /
  S4 / D-A and J13 R6 / R8 for G1's gates.
- Marlow Yard is AT CAP: everything but F1 ships dark behind `marlowReplan` (target walk-ready Tue 27 Oct evening).
- Next: (~23:15) S0 and R1 fix rounds were running (see j14-wave2-notes.md last entry). S0 + R1 PASS -> merge both into feature/marlow-replan-base, fill its sha into the seven briefs, post them on
  cloud-queue (tsc + vitest only; Michael ~22:10 desktop load to cloud); PRs 1 / 2 open; rerun any missing check.

## Done
- ~21:30 Plan check 2 answered: fix 1 (F1 drops one-out), fix 2 (R1 retryOff + cause mapping), polish (43 overlaps,
  mission-rules order, a7 guard on a7-hall + validator rerun, LastRetry shape, R1 ~1,100) (d07f96887..0934d5999).
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
