# coop4 merge 3 check A (AI and game behaviour)
Owner: Guard AI Build. Status: current.

Checked head: `a51c951b78af0eb5f13aec59d7ef608daad56592` (merge of origin/master 78c241933, 4.112.1, into ed34b4005).
Read: `git show --remerge-diff a51c951b7`, master's diff since the merge base 29f03b6c0 for sectorMode, sectors,
sectorStart, gear, score, spawnPlace and gameState, and the merged code paths below. Merge note:
`docs/guard-ai/checks/COOP4-MERGE3.md`.

Verdict: FIX

## Fix list
1. **`SectorRun.nextAlarmSends()` must not pass `teamSize` (src/game/sectors.ts).** The merger's premise ("`raiseAlarm`'s
   count is what is sent") does not hold on the live path. In `SectorMode.raised` the Guard AI hook is always present
   (`EnemyManager.shapeResponse`), so `want` (raiseAlarm's count with the A9 extras) only says whether the stage sends at
   all; the spawn count is `responseShape(stage, perStage, ...)` (src/ai/gear.ts), which returns `size` 0 when
   `perStage < 1` and adds per-player extras only on top of a base of 1 or more. So a `perStage` 0 section with 3-4
   players sends nobody, yet the merged `nextAlarmSends()` returns the extras (> 0), `alarmQuiet()` is false and
   `stealthSystems.onAlarm` shows "Reinforcements inbound" with no one coming: the exact case guard-rules S5 made quiet.
   Master's call (`alarmStep(this.alarm, perStage).send`, 2-player default) is zero exactly when the live path sends
   zero (stage cap or `perStage` 0); with `perStage` >= 1 the base always goes (`capReinforce` keeps it), so the extras
   never change the answer. Impact today: latent (every shipped section has `perStage` 2 or 3), but it is the one
   behaviour the merge changed against master, and on a false premise.
   Done looks like: `nextAlarmSends()` back to master's body (no `teamSize`), its doc saying why (the 3-4 player extras
   ride on the base: `responseShape` sends none without one, so the base alone decides quiet); a unit test in
   `tests/alarmRepeat.test.ts` or `tests/sectorTeamScale.test.ts`: a `SectorRun` with a `perStage` 0 section and
   `teamSize` 4 gives `nextAlarmSends()` 0, and `perStage` 2 with `teamSize` 4 gives > 0 (stage below the cap), 0 at
   `SECTOR.alarmMax`. The merge note's "For the merge checker" bullet corrected to match.

## Checked and fine
- **sectorMode `loadSection` order**: `resetAlarm()` (clears the repeat lock and counts), then `setSection(i)` and
  `alarmRepeat = true` (only with a section), then `setResponseShape(s?.responseShape ?? null)`. None reads another's
  state; `setResponseShape` runs with or without a section, as on coop4 before the merge. Order is irrelevant.
- **Repeat alarms with coop4's two response teams**: `EnemyManager.raiseAlarm` sets `alarmTeamN = teams.length` after
  `onAlarm`, so both AI5 teams of one alarm are inside the `teamSearching` range that opens the repeat lock. The stage
  cap (`SECTOR.alarmMax` 3) still bounds sends; `capReinforce` still holds the extras to the live cap.
- **Practice runs (`?sectorStart=N`) with 3-4 players**: master's `startAt` runs before the host teleport and before
  coop4's `opTeam` / `run.teamSize` reads, so the section scales by the team as usual. Remotes off the section are
  placed by `placeEarly` / `firstPlace` through coop4's slot-aware `joinSpot` (`slotSpawn` on `checkpointSpawns`, slots
  2-3 beside, A14). Practice gating (`practiceFrom`: no star, no best rating, `practiceLine`) is intact. Untested on 4
  pages (polish 2).
- **Auto-merged master behaviour**: present in the merge: `startAt` / `practiceFrom` / the checkpoint teleport,
  `alarmQuiet`, `alarmRepeat`, the practice guards on `markCompleted` / `updateRatingRecord` / `endSession`,
  `responseTeam`'s `shield = false` default (coop4's AI5 caller passes `SectorDef.shieldTeams`), `killScore`'s negative
  base rule, `offSection`, and the char-shadow fill (`FILL.players` is 4, so slots 2-3 are in the light meter and the
  guards' light).
- **Test stub edits (`tests/sectorStartCoop.test.ts`)**: no runtime gap. `GameState.outIds` is a `readonly` field
  always built (gameState.ts), and `Session.slotOf` is always there; the host's slot table is filled at each `hello`
  (session.ts `slots.assign`), before the match starts, so a real host has both when `placeEarly` first runs. The stub
  `slotOf: () => 1` is a real 2-player table. No assertion changed.

## Checks run
- `npm run typecheck:fast`: clean.
- `npx vitest run` on the 43 files matching sector*, alarm*, coop*, playerSlots*, responseWiring*, killScore*: 43
  passed, 581 tests passed.
- No e2e, no `npm run check` (per brief).

## Polish
1. No test covers `alarmQuiet` / `nextAlarmSends` at all (master's S5 shipped without one); fix 1's test closes it.
2. A 4-page `?sectorStart=N` leg in e2e-sectorops part 7 (slots 2-3 placed at the section's checkpoint), as the merge
   note says.
3. `raiseAlarm`'s doc ("returns how many guards it sends in ... + the extras") overstates the live path for the same
   reason as fix 1: its return is the no-hook count; the hook decides the real size. A one-line doc note.
