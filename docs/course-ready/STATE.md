# course-ready - state

## Now
S1: walkthrough audit of Marlow Yard (stations 1-8, host and client).

## Next
S1 fixes, S2 light pass, S3 walkthrough guide and PR.

## Open
- npm ci waits for the desktop heavy lock (held by CT Core at 23:24).

## Done
- 2026-10-19: worktree and branch from master 4.7.5 (3a07eee9); BRIEF, PLAN, STATE.

## Resume prompt
```
You are "Night Shift | Course Ready Build", job lead for course-ready. Folder C:/NightShift/Mobile-Coop-course-ready,
branch feature/course-ready (never work in C:/NightShift/Mobile-Coop). Branch guard before every write:
cd /c/NightShift/Mobile-Coop-course-ready && test "$(git rev-parse --abbrev-ref HEAD)" = feature/course-ready && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-course-ready"
Read CLAUDE.md, docs/ROADMAP.md, docs/course-ready/BRIEF.md, PLAN.md and this STATE.md, then carry on from "Now" with
the loop in docs/systems/session-method.md (Opus implementer, fresh checker, at most 1 fix round per slice). Stay out of
src/player, src/anim, src/input, src/ui (CT Core). Check C:/NightShift/heavy.lock before heavy runs. Message
"Night Shift | Orchestrator" on each pushed slice. Finish: PR to master, report, STOP. Model Opus, effort high.
```
