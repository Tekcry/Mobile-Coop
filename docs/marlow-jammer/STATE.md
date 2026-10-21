# marlow-jammer - state (resume point)

**Now:** fix round 2 done (2026-10-22): master 4.44.0 merged (00c4a3fc; PROTOCOL_VERSION 26 stands); the
stale-position gate hole closed (`HALL_SENT`, a sent-back player counts again only after a reported position in the
entry lobby or hallway and a 3 s hold); the x 6 hallway lamp made unjammable (J4: all station 3 lamps out let a runner
beat the camera). npm run check pass (2536 tests). PAUSED (orchestrator, ~02:30, usage pacing until after the 04:00
reset): no e2e run this round.
**Next:** after the orchestrator says resume: e2e-ctcourse (the new stale-report assert) and the full `npm run e2e` on
the laptop (JOBS=2, solo reruns for failures); then a light final check of fix round 2 (one fresh checker, review +
the e2e results), the PR, tell "Night Shift | Orchestrator", ask it for the bay 3 GPU look on the desktop; ask
Michael (through the orchestrator) to confirm J2-J4.
**Open:** PROTOCOL_VERSION vs the cloud B + M PR (whichever merges second takes the next number); item 6 overlap on the
bay 3 floor lines (BRIEF "Limits").

## Done
- 2026-10-21: job docs (BRIEF, STATE).
- 2026-10-21: implementer (items 5, 7, 8, floor lines removed, protocol 26), 11cb81f5; REPORT.md.
- 2026-10-21: checker 1 FIX (bay 3 passable unjammed); fix round 1 d796a488 (J2 send-back, host LOS, client cue
  assert, forward-only mirror, allocations).
- 2026-10-22: checker 2 FIX (stale-position gate hole); fix round 2 + master 4.44.0 merge (J4 lamp).

## Resume prompt
```
Night Shift | Character Build (laptop). Resume job marlow-jammer (marlow-bays slice J) in C:/NightShift/Mobile-Coop-marlow-jammer, branch feature/marlow-jammer (branch guard before every write). Read CLAUDE.md "Sessions", docs/ROADMAP.md, then docs/marlow-jammer/BRIEF.md and STATE.md. Test requests from job leads come first (laptop: one at a time, heavy.lock, port 4191). Continue from STATE "Next": implementer, fresh checker, one fix round, full e2e, PR, then message "Night Shift | Orchestrator".
```
