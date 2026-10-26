Verdict: PASS

Checker A (fresh Opus), PR2 polish delta `a09495007..69257d7b1` (7 commits, 16 files, docs/guard-rules/slices excluded),
head `69257d7b1`. Read only; tests: `npx vitest run tests/alarmRepeat.test.ts tests/killScore.test.ts
tests/responseTeam.test.ts tests/gear.test.ts tests/helmetRule.test.ts` -> 5 files, 62 tests passed (CPU 26% before
the run). No tsc, no e2e.

## Blocking
None.

## Findings by focus
1. `responseTeam` shield default false (`src/ai/gear.ts:180`): every caller on the branch names it, so no behaviour
   changes. `src/game/modes/sectorMode.ts:965` passes `s.shieldTeams === true` (campus S4 / S5 data set it:
   `campusS4Data.ts:196`, `campusS5Data.ts:179`; every other section, the campaign's included, gets false);
   `src/game/stealthSystems.ts:596` passes false (Marlow Yard / live maps). `RESPONSE.shieldLead` is now an off switch
   (`shield && RESPONSE.shieldLead`), as the comment says. `src/net` has no caller.
2. Dog score (`src/game/modes/score.ts:19`): `headshot && base > 0` is the same as master for every non-dog kind (all
   `KILL_BASE` values and the 100 fallback are positive) and for the dog (killed: -120, no bonus; knocked out: 120,
   bonus as before). `src/net/validate.ts:144` (`killScore('heavy', true, 2)`) is unchanged. The undo (`dog` back to
   120) now restores the old score in full; the test pins it.
3. Repeat lock (`src/ai/enemyManager.ts:851-876`, `:879-901`):
   - Bounds: `alarmTeam0 = teams.length` before `onAlarm`, `alarmTeamN = teams.length` after it. Both team makers
     (`SectorMode.raised` -> `em.newTeam`, `StealthSystems.onAlarm` -> `em.newTeam`) run inside `onAlarm`
     synchronously, so the window is exactly that guard alarm's team(s); a later `cameraAlarm` team lands past
     `alarmTeamN`. `end` is clamped to `teams.length`, so a cleared `teams` (unload) cannot index past the end.
   - Can it never open? No: the `rearm` timer (60 s) opens it in every case the team test cannot (team wiped out or
     taken, no team at the stage cap where `alarmTeamN == alarmTeam0`, live cap full so no member spawned, a device
     responder whose spot is unreachable, a member who never leaves `entering`). `entering` is `entry !== null`, which
     `entryStep` clears on sight, at the route's end or after `ENTRY_MAX`, in combat and in the calm search alike
     (`enemy.ts:2769`, `:3174`).
   - Too early? No longer: a member still on his run-in route and a device responder (searching from spawn) not yet
     standing at a search spot (`atSearchSpot` = `spotArrived`, reset at the top of `calmDecide`, set only when he is
     there) are skipped. A regular reinforcement is only `searching` after combat, so it counts as in.
   - Allocation: plain index loops over `teams` / `members`, two field getters; nothing allocated per step.
4. Stage-cap banner: `StealthSystems.onAlarm` asks `g.mode?.alarmQuiet?.()` before `mode.onAlarm` raises the stage,
   so `SectorRun.nextAlarmSends()` (`src/game/sectors.ts:801`, same `alarmStep` as `raiseAlarm`) reads the stage the
   raise starts from: 0 only at `SECTOR.alarmMax` (or a section with `perStage` 0). Below the cap the banner is as
   before and `SectorMode.raised` still overrides it with "ALARM STAGE n". Other modes have no `alarmQuiet` -> unchanged.
   Co-op: `onAlarm` runs on the host's manager; the host's `hud.banner` wrapper (`src/net/coopHost.ts:292`) pushes the
   same title / sub to clients, so joiners see the plain line too. `alarmStep` returns a small object, but only on an
   alarm, not per step.
5. Tests pin the behaviour (each would fail on the old code): the two "later camera team" cases (`alarmRepeat.test.ts`
   manager and sector harness: the old `teamSearching(from)` scanned to the end and opened on the camera team); the
   `entering` / responder case; the stage-cap banner (old code always said "Reinforcements inbound"); the dog undo
   (old `!(dog && killed)` gave 120 for a headshot at base 120, not 180); `responseTeam` default `['grunt', ...]`;
   `helmetRule` `revived` now drives the real `EnemyManager.revive` (an unlocked old self wakes locked only through
   `revive`'s `ruleHelmet` call), which closes PR1-CHECK-B polish 4.

## Non-blocking polish
1. Merge note for the lead: `origin/feature/mission-engine` still calls `responseTeam(stage, send, this.teamKinds)`
   (`sectorMode.ts:973`) and `responseTeam(1, RESPONSE.liveTeam, this.teamKinds)` (`stealthSystems.ts:594`). With the
   new default those become no-shield (the intended M2 campaign result), but when the branches meet, the sectorMode
   line must keep guard-rules' `s.shieldTeams === true`, or campus S4 / S5 silently lose the shield lead.
2. `src/game/modes/score.ts:6`: `KILL_BASE` is now an exported mutable table only so the undo test can write it. A
   `Readonly<...>` export with the test casting, or an internal `killScoreWith(base, ...)`, keeps game code from
   writing it; harmless as is.
3. `tests/alarmRepeat.test.ts:352` stops after the capped alarm; one more `repeatStep(ALARM_REPEAT.rearm)` and a third
   raise would pin that an alarm with no team still reopens on the timer (the empty `alarmTeam0..alarmTeamN` window).
   The code is right (the timer path has its own test), so this is coverage only.
4. `SectorMode.raised` can still send fewer guards than `send` (no `reinforceSlot` / live cap), in which case
   "Reinforcements inbound" shows with none coming; pre-existing and rare, not this delta's scope.
