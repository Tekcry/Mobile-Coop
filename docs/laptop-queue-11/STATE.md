# laptop-queue-11 - state
Owner: Test Runner. Status: current.

## Resume (2026-10-26)
Branch feature/laptop-queue-11, worktree C:/NightShift/Mobile-Coop-laptop-queue-11, from origin/master bea28daec.
Done: F36 + F35 code (lib.mjs suiteParts table arg, partsTable / slowLines / slowNote / slowRecord / slowSummary at the
end; service.mjs planParts / runParts after `gh`, noteSlow before `finish`, the three suiteParts call sites, the
flake-budget.md write), tests (describe "laptop-queue-11: parts per head (F36) and SLOW lines (F35)"), docs, fragment.
Checks: typecheck:fast clean, vitest tests/laptop-queue.test.ts 195 pass.
Next: the job lead opens the PR (not opened here); a live run when the lead says (a sharded train rerun of
e2e-sectorops on #568's head should log 9 parts).
