# course-restart-hold - brief

Job lead: Night Shift | Character Build (laptop). Branch `feature/course-restart-hold` in
`C:/NightShift/Mobile-Coop-course-restart-hold`, from master 4.43.0 (ef98cef2). A patch (high severity), its own PR.

## The ask (orchestrator, 2026-10-21 ~23:30, from a review of #85)
"Restart at checkpoint" in the course crashes a co-op client that is holding a guard.
- `courseMode.ts` restartCheckpoint calls `st.restart()`, which emits `bayRestart`; `spawnSquad` then disposes the squad
  without releasing holds. Sector mode does release them (`sectorMode.ts`: `takedown.reset()` and `net.releaseHolds()`).
- On the client the stale puppet is disposed with `rig = null` but stays alive, so `TakedownController.frameUpdate`
  (`takedownController.ts`) reads `a.e.bodyRig.neck` on null every frame.

Fix: call `g.takedown.reset()` and `g.net?.releaseHolds?.()` before `spawnSquad` on a bay restart; set `dead = true` in
`EnemyPuppet.dispose()`. An e2e-coop step: the client holds a guard, the host restarts at a checkpoint, no console
errors follow. Then a checker, e2e-coop and e2e-ctcourse, a PR (patch version).

## Limits
CLAUDE.md hard rules. Do not touch the animation tracks' files or slice J's files (`src/game/ctDevices.ts`,
`src/game/jammer.ts`, `src/world/maps/ctcourse.ts`, `scripts/e2e-ctcourse.mjs`). One implementer, one checker, one fix
round.
