# course-ready - state

## Now
S1 done and in the PR to master (walkthrough fixes only). Michael (00:40, via the orchestrator): movement is the only
focus tonight, so S2 and S3 wait for a later session.

## Next (a later session)
- S2 light pass: build `LIGHT.md` section 3 (7 airlock lamps, station 5 lamp B raised, back-room lamp moved, station 5
  medkit lamp, station 7 wall-top lamp) plus a station 2 wall-top lamp (A3); the vitest of section 4a (a partial draft
  sits in the shared notes folder as `course-ready-ctcourseLight.test.ts.draft`, not checked); the GPU shots of 4b
  (new `scripts/shots-ctcourse.mjs`, port 4189, `E2E_GPU=1`, Michael's PC). Note: S1 moved the leg-up squares to
  (30, 3.5), (96, 3.5), (140, 3.5).
- S3 `WALKTHROUGH.md`: menu path from the main menu, the version label, station by station both players.
- Polish (not blocking): `S1-CHECK.md` "Polish" list (panel 7 "Y / Space" on the rope top-out, g-s6 "Door unlocked",
  crouch keys unnamed, radio 3 "X / RMB", client revive ends a team move, the e2e near-side bolt press, pair hint text
  on other maps); F4 client restart cue needs a wire change (S1-REPORT.md); F6 role-swapped e2e pass (runner-owned).

## Open
- Slice tier at 1f8bce59: smoke, e2e-coop, e2e-netmove passed on the desktop; e2e-ctcourse and e2e-course were killed
  at the 600 s suite timeout on the loaded desktop with every assert ok; the laptop reruns them (1200 s cap); results
  come through the orchestrator.

## Done
- 2026-10-19: worktree and branch from master 4.7.5 (3a07eee9); BRIEF, PLAN, STATE. npm ci + typecheck under the lock 23:46.
- 2026-10-19: AUDIT.md (0 blockers, 8 confusing, 14 minor); LIGHT.md (survey, lamp plan, test and shot plan).
- 2026-10-20: S1 fixes (1f8bce59, S1-REPORT.md); npm run check passed (160 files, 1791 tests, build); S1 checker PASS
  (S1-CHECK.md); CHANGELOG, TESTING.

## Resume prompt
```
You are "Night Shift | Course Ready Build", job lead for course-ready. Folder C:/NightShift/Mobile-Coop-course-ready,
branch feature/course-ready (never work in C:/NightShift/Mobile-Coop). Branch guard before every write:
cd /c/NightShift/Mobile-Coop-course-ready && test "$(git rev-parse --abbrev-ref HEAD)" = feature/course-ready && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-course-ready"
Read CLAUDE.md, docs/ROADMAP.md, docs/course-ready/BRIEF.md, PLAN.md and this STATE.md. If the S1 PR is merged, cut a
new branch from master for S2 / S3; else carry on from "Next" on this branch. Loop: docs/systems/session-method.md
(implementer, fresh checker, at most 1 fix round per slice). Stay out of src/player, src/anim, src/input, src/ui
(CT Core). Check C:/NightShift/heavy.lock before heavy runs. Message "Night Shift | Orchestrator" on each pushed slice.
Finish: PR to master, report, STOP. Model Opus for checks, Sonnet for other subagents.
```
