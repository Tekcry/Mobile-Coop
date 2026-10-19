# course-ready - state

## Now
S1 fixes: an Opus implementer works the AUDIT.md list (report: S1-REPORT.md). S2 light plan ready (LIGHT.md): 9 new
+ 2 changed lamps, plus a station 2 wall-top lamp (A3); built after S1 (same file).

## Next
S1 checker, S2 light pass + shots, S3 walkthrough guide and PR.

## Open
- Asked the orchestrator (23:58): may this job edit src/net/coopHost.ts onRespawn (F3) and src/ui/hud/courseHud.ts (F1)?
- Deadline (Michael via the orchestrator, 23:55): PR to master open with its test tier green by 05:30; Michael tests /preview/ (master). Short on time: cut light scope, never the walkthrough fixes.

## Done
- 2026-10-19: worktree and branch from master 4.7.5 (3a07eee9); BRIEF, PLAN, STATE. npm ci + typecheck under the lock 23:46.
- 2026-10-19: AUDIT.md (0 blockers, 8 confusing, 14 minor); LIGHT.md (survey, lamp plan, test and shot plan).

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
