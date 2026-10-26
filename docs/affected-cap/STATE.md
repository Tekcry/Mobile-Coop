# affected-cap - state
Owner: Test Runner. Status: current.

## Resume block
- Branch feature/affected-cap2, worktree C:/NightShift/Mobile-Coop-affected-cap, base origin/master 3f0ab7fec (train
  116). The old branch feature/affected-cap (base a02784f7) is abandoned: do not build on it.
- BRIEF (A1-A9) and PLAN (slices 1-3, tests, docs) written by the Opus planner (2026-10-26 ~10:45); plan checker
  FIX 1-4 and polish applied in the one fix round, every line pointer refreshed on 3f0ab7fec and checked against #507
  (laptop-queue-7) by hunk content.
- Plan checker PASS; slices 1-3 and docs built by one Opus builder (2026-10-26), with the checker's polish (re-file
  skips a withdrawn request; `--wide` with a max tests the co-op rule on DIRECT rows only).
- Next: one Opus checker on the branch head -> PR to master with `Job-done: affected-cap`; after release, Test Runner
  runs `service.mjs --once --dry-run` on the laptop and reports the before / after suite count (queue was 166).
