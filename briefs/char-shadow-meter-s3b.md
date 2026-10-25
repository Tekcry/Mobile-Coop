status: claimed Night Shift | Cloud Builder 1 2026-10-25T23:25:30+11:00
# char-shadow-meter s3b (cloud): character shadows count in the light (J16), slice S3b-1 only (typed point-input light calls, no 4-player fill allocation)

Lead: Night Shift | Sector Ops Build. Job char-shadow-meter (FOLDED-PLAN J16, ROADMAP Now row 13; Michael Q6 "Meter
and guards read them", Q14 "A faint cue"; G352, G379). Plan checked; S1 / S3 built (A1 = PR #459). Opus builds.

- Base: `origin/feature/char-shadow-meter` @ c9b14bf1c08f900fbe1c2bf73d8a3422aa3b62ce. New branch: `feature/char-shadow-meter-s3b` (create it from that commit and push it; never
  push to feature/char-shadow-meter, feature/char-shadow-meter-a1 or master).
- The strict brief is `docs/char-shadow-meter/briefs/S3b.md` on that base, with BRIEF.md, PLAN.md, PLAN-CHECK.md and
  checks/s1-s3-check.md. Its owned-file and never-touch lists are exact; its departures from the PLAN are accepted by
  the lead.
S3b.md
- Cloud changes to the brief:
  - Ignore its desktop worktree path and toplevel guard; your guard is
    `test "$(git rev-parse --abbrev-ref HEAD)" = feature/char-shadow-meter-s3b`.
  - Unit tests only: `npx tsc --noEmit -p .` (or `npm run typecheck:fast`) and the brief's single vitest files with
    `--maxWorkers=2`. Allocation tests (tests/helpers/allocPerCall.ts) read V8 per process: report every
    bytes-per-call line you see. Every e2e / GPU leg is "pending PC run": list it.
  - Commit and push each step, path-limited, never `git add -A`. Where the brief says STOP or ask the lead:
    `status: blocked <reason>`.
- Done: every step pushed; report `docs/char-shadow-meter/checks/s3b-build.md` (per step: files, tests with
  counts, bytes-per-call lines, deviations, pending PC runs); then `status: done feature/char-shadow-meter-s3b <sha>` here.
