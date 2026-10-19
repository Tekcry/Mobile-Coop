# course-ready - state

## Now
S2 (light pass) and S3 (walkthrough) done; the PR to master is open (minor). Waiting for the full e2e on the PR head.

## Next
- The full `npm run e2e` on the PR head (laptop runner or the desktop when free); then the orchestrator merges.
- After Michael's walk: his notes on the lighting and the walkthrough.
- Polish (not blocking): `S1-CHECK.md` and `S2-CHECK.md` "Polish" lists, LIGHT.md polish (station 7 stair top 0.36);
  F4 client restart cue needs a wire change (S1-REPORT.md); F6 role-swapped e2e pass (runner-owned).

## Open
- S2 slice tier at a6e982c7 (laptop): smoke, e2e-ctcourse (235 s), e2e-lightbake pass. Desktop at dceddd6f: npm run
  check (171 files, 1889 tests, build), GPU shots (17, meter = field within 0.02). After the master 4.11.0 merge
  (c49f5b29): tsc, ctcourse + ctcourseLight vitest pass; the full run is the PR tier.

## Done
- 2026-10-19: worktree and branch from master 4.7.5 (3a07eee9); BRIEF, PLAN, STATE. npm ci + typecheck under the lock 23:46.
- 2026-10-19: AUDIT.md (0 blockers, 8 confusing, 14 minor); LIGHT.md (survey, lamp plan, test and shot plan).
- 2026-10-20: S1 fixes (1f8bce59), checker PASS; PR #30 merged as 4.9.0.
- 2026-10-20: branch fast-forwarded to master 5f283190 (4.10.0). S2: 10 lamps added / moved (19 -> 29 baked),
  tests/ctcourseLight.test.ts, scripts/shots-ctcourse.mjs (a6e982c7); S3 WALKTHROUGH.md; S2 checker: fix list on the
  walkthrough only, fixed (dceddd6f); GPU shots in shots/ (708c7f8e); master 4.11.0 merged (c49f5b29); the walkthrough
  notes the hold-A action menu.

## Resume prompt
```
You are "Night Shift | Course Ready Build", job lead for course-ready. Folder C:/NightShift/Mobile-Coop-course-ready,
branch feature/course-ready (never work in C:/NightShift/Mobile-Coop). Branch guard before every write:
cd /c/NightShift/Mobile-Coop-course-ready && test "$(git rev-parse --abbrev-ref HEAD)" = feature/course-ready && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-course-ready"
Read CLAUDE.md, docs/ROADMAP.md, docs/course-ready/BRIEF.md, PLAN.md and this STATE.md, then carry on from "Next".
Loop: docs/systems/session-method.md. Stay out of src/player, src/anim, src/input, src/ui (CT Core). Check
C:/NightShift/heavy.lock before heavy runs. Message "Night Shift | Orchestrator" on each pushed slice. Finish: PR to
master, report, STOP. Opus for checks, Sonnet for other subagents.
```
