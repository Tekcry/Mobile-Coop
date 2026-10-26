# guard-rules S8 check A
Owner: Guard AI Build. Status: current.
VERDICT: PASS

Checker A (Opus 5.5, fresh: AI behaviour, intent, the flag-off guarantee), branch `feature/guard-rules-s8`, head
a5d18b277, diff `48394def2..a5d18b277` (6 owned files; no src/net, src/core or wire change), against
`docs/archive/guard-rules/slices/S8-BRIEF.md`, PLAN S8 / Flags / PR4, BRIEF A12 and G348.

## Checks run
- `npm run typecheck:fast`: clean.
- `npx vitest run` on 21 files (dogRelease, sectorStageActions, killScore, postsWiring, barkCause, guardPolish2,
  guardPolishA, campusS4, campusS5, alarmRepeat, bodySearch, deviceTrip, pairsWiring, responseWiring, s6CloseOn,
  searchAreaWiring, sectorDesk, sectorGuardTags, sectorKeypad, urgency, lockedDoorPath): 348 pass, 1 skip.
- Read for logic: `Enemy.releaseHeel` against `searchAt`, `koSearch`, `bodySearch`, `onLevel`, `updateAwareness`,
  `AlertMachine.step`, `calmDecide`; `SectorMode.raised` / `beginSection`; the `gameState` client path; the board's
  dog exclusions; campus S4 / S5 `releaseDogs` data. e2e read, not run.

## Flag off
- `flags.dogRelease` is read only at `sectorMode.ts:558` (`if (live && r?.dogs && flags.dogRelease) this.releaseDogs();`),
  event time. `raise` records `dogsReleased` as before and returns the `dogs` edge, read by no other caller;
  `beginSection`'s `live = false` (`sectorMode.ts:769`) is read only in that line; `releaseHeel` has no other caller.
- Lights, doors, the gear stage, reinforcements and the run order unchanged: byte-identical behaviour.

## Flag on: behaviour
- Live raise: `dogs` is an edge (1->2 true, 2->3 false in the vitest); `releaseDogs` takes `e.dog && e.section ===
  run.index` only. Campus S4 stage 2 (`campusS4Data.ts:207`) and S5 stage 1 (`campusS5Data.ts:186`) carry
  `releaseDogs`; their dogs have handlers.
- Free (S8-b): alive, not alerted, passive or `taken`; a dog already in combat keeps its hunt.
- Target: shared `ctx.lkp` if valid, else `handler ?? leader`, else its own spot; `searchAt` then `rush = true` (as
  `bodySearch`); the sweep centres on the release spot; ring bearings fixed (golden angle), no randomness added.
- Already searching: the reset block (`enemy.ts:1673-1682`) restarts the 60 s clock and ring round the new spot.
- Back to heel: the search ends at `ALERT.searchTime` (unreachable spots skipped), then cooldown and the `calmDecide`
  heel branch. Only the existing `i.hunting` case never calms (no new stuck case). Dead or gassed mid-release: stops as
  today. Handler down: heels by the body (A12). A section change despawns handler and dog together.
- Section start (S8-a): `live = false`, so a carried stage releases no dogs (vitest and a source check pin it).
- Host only: `SectorMode` / `EnemyManager` exist only when `!this.puppet` (`gameState.ts:697-740`); no wire change.
- Detections stay explainable (normal smell and sight); G348 / M5 dog rules untouched; board sends and pairs skip dogs
  (`enemyManager.ts:1409`, `:1479`, `:2785`). Nothing added per step.
- e2e logic: seeded `Math.random` restored in `finally`, other enemies passive, release inside the 2 s forget window,
  20 + 150 + up to 650 steps covers the 60 s search, `held >= 10` filters a one-step stale spot. No logic errors.

## Fix list
None.

## Polish
1. e2e smell margin: `scripts/e2e-stealth-ai.mjs:3317` keeps the known position >= 15 m from the hidden player; the
   ring reaches `PATROL.searchMax` 11 m and a crouched dog smells at 4.2 m, so ~4 m is possible (suspicious only).
   20 m removes the doubt.
2. The search reset block is in three places (`enemy.ts:1128-1137`, `1149-1158`, `1673-1682`); a private
   `restartSearch()` keeps them in step.
3. A dog still in the fill queue at a live raise is not released once it spawns (S8-a's reasoning); worth one line in
   ai.md.
4. Camera and laser alarms can raise the stage with no valid shared position (S8-d): the dogs search round their
   handlers. Per A12; walk item 7 should say so.
