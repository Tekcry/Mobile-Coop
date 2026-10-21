# marlow-jammer - state (resume point)

**Now:** fix round 1 (d796a488) checked by a fresh checker (2026-10-22): FIX, one item - a client sent back near the
hallway end can still count for the gate from its stale in-flight far-lobby positions during the 3 s teleport grace
(`ctDevices.ts` ~701-705 with `remotePlayer.ts` ~171-173). check pass (2406 tests); e2e-ctcourse / netmove / sectorops /
coop ok at JOBS=2. Polish: lamp darkness may let a runner beat the camera (not checked against the bake); client /
host LOS from different points; HUD tenths one frame late. Orchestrator (~02:30): resume, one agent at a time.
**Next:** fix round 2 (the stale-position gate hole + a check of the hallway light level with the station 3 lamps off),
merge origin/master 4.44.0 (conflicts: CHANGELOG.md, scripts/e2e-ctcourse.mjs, tests/ctcourse.test.ts; master still
PROTOCOL_VERSION 25, so 26 stands), check, full e2e on the laptop, PR, tell "Night Shift | Orchestrator", ask it for the
bay 3 GPU look on the desktop.
**Open:** PROTOCOL_VERSION vs the cloud B + M PR (whichever merges second takes the next number); item 6 overlap on the
bay 3 floor lines (BRIEF "Limits").

## Done
- 2026-10-21: job docs (BRIEF, STATE).
- 2026-10-21: implementer (items 5, 7, 8, floor lines removed, protocol 26), 11cb81f5; REPORT.md.

## Resume prompt
```
Night Shift | Character Build (laptop). Resume job marlow-jammer (marlow-bays slice J) in C:/NightShift/Mobile-Coop-marlow-jammer, branch feature/marlow-jammer (branch guard before every write). Read CLAUDE.md "Sessions", docs/ROADMAP.md, then docs/marlow-jammer/BRIEF.md and STATE.md. Test requests from job leads come first (laptop: one at a time, heavy.lock, port 4191). Continue from STATE "Next": implementer, fresh checker, one fix round, full e2e, PR, then message "Night Shift | Orchestrator".
```
