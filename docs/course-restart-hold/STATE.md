# course-restart-hold - state

**Now:** PR open to master (patch). Fix a86f0ad3; independent checker PASS.
**Next:** the orchestrator merges (patch version at merge, G183). Full e2e on 1b4ec12e: green (32 ok at JOBS=2; e2e-pad and e2e-levels passed solo).

## Done
- 2026-10-21: BRIEF, STATE (8c9134c7).
- 2026-10-22: fix a86f0ad3: `CourseMode.spawnSquad` resets the takedown and releases net holds before disposing the
  squad (covers bayStarted, bayRestart, restartCheckpoint); `EnemyPuppet.dispose` sets dead and clears holds; the
  client's stale sweep aborts its own takedown first; `TakedownController.frameUpdate` returns early on a dead victim.
  e2e-coop step: restart at checkpoint with the client, then the host, holding the station-1 guard; failed before the
  fix ("Cannot read properties of null (reading 'neck')"), passes after.
- Checks (laptop, software GL): npm run check pass (2490 tests); e2e-coop ok (JOBS=2 and solo), e2e-ctcourse ok 401 s.
- Checker PASS. Polish (not done): `takedown.reset()` only when a takedown is active, so a stale offer can live one tick;
  a victim disposed mid-grab counts as a lost grab in stats.

## Resume prompt
```
Night Shift | Character Build (laptop). Resume job course-restart-hold in C:/NightShift/Mobile-Coop-course-restart-hold, branch feature/course-restart-hold (branch guard before every write). Read CLAUDE.md "Sessions", then docs/course-restart-hold/BRIEF.md and STATE.md. Test requests from job leads come first. Continue from STATE "Next".
```
