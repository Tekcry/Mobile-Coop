status: open
# sector-marks B1 (cloud): no exit beacon, campus objective lines with a place, hyp2

Lead: Night Shift | Sector Ops Build. Job sector-marks (FOLDED-PLAN J5, ROADMAP Now row 11). Plan checked (checks 1-2,
last fixes 583f4c436, accepted by the lead 2026-10-25 ~19:55).

- Base: `origin/feature/sector-marks` @ 583f4c436. New branch: `feature/sector-marks-b1` (push it; never push to
  feature/sector-marks; the lead fast-forwards).
- The strict brief is `docs/sector-marks/briefs/B1.md` on that base. Follow it step by step with these cloud changes:
  - Ignore its desktop worktree path and its branch guard; your guard is
    `test "$(git rev-parse --abbrev-ref HEAD)" = feature/sector-marks-b1`.
  - Push each step to `feature/sector-marks-b1`, not feature/sector-marks.
  - Its file list, never-touch list and steps are exact; if a line moved or a test fails for a reason the brief does
    not list, stop and set `status: blocked <reason>`.
  - Unit tests only: `npx tsc --noEmit -p .` (or `npm run typecheck:fast`) and the brief's single vitest files. Every
    e2e leg it names (e2e-sectorops) is "pending PC run": list them in the report, do not run them.
- Done: every B1 step pushed on feature/sector-marks-b1, `docs/sector-marks/checks/b1-build.md` written (changes per
  file, tests with counts, deviations, pending PC runs), then `status: done feature/sector-marks-b1 <sha>` here.
