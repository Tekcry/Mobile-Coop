# guard-rules S5 check A
Owner: Guard AI Build. Status: history.

VERDICT: PASS

Checker A (Opus 5.5: code correctness, performance, hard rules), branch `feature/guard-rules-s5`, head be49ac06 (slice
S5 "repeat alarms", PR2), diff `211a66d5..be49ac06` (11 files, +497 / -22), against BRIEF A7 (row D5), PLAN "PR2 -
rule fix B (ship on)" and PLAN "Tests and e2e per PR" PR2 row.

## Checks run
- The worktree's `node_modules` junction chain (`-s5` -> `-guard-rules` -> `-guard-ai` -> `-guard-ai-s24`) does not
  resolve here ("untrusted mount point"), so `npm run typecheck:fast` fails with "tsc is not recognized". Rerun on a
  `git archive be49ac06` copy in the scratchpad (src, tests, scripts, public, docs/kestrel, configs) with one junction
  to `Mobile-Coop-guard-ai-s24/node_modules` (same dependency block as this branch's package.json).
- `tsc --noEmit -p tsconfig.json`: exit 0.
- `vitest run`: alarmRepeat, alarmCall, radioWiring and every test naming `resetAlarm`, `alarmRaised`, `raiseAlarm`,
  `radioAlarm`, `guardAlarms`, `alarmOpen` or `SectorMode` (26 files): 420 pass, 1 skipped. A wider sweep (66 more
  files importing enemyManager, stealthSystems, coopHost or alarm code): 1081 pass.
- `node scripts/doc-lint.mjs --quiet`: 0 errors (22 warnings, none from this diff).
- e2e not run here (laptop queue: e2e-sectorops, e2e-ctcourse, e2e-coop per the PR2 row).

## Findings (no blocking issue)
- Gate: `alarmOpen()` (`!alarmRaised || rearmed`) gates all five raise paths: `raiseAlarm`, `contactThrough`,
  `assignAlarm`, the command retry in `radioStep` and `radioAlarm`. `Enemy.decide` drops a panel run on
  `!ctx.alarmOpen()` (enemy.ts:3152); the carry rule (enemy.ts:1700) still reads the sticky `alarmRaised`.
- Lock: `repeatStep` opens it only with `alarmRepeat && ALARM_REPEAT.enabled`, `1 <= guardAlarms < max`, after `rearm`
  s or when a living, free member of a team from `alarmTeam0` on is searching. `raiseAlarm` shuts it and records
  `alarmTeam0 = teams.length` before `onAlarm`, which makes the team synchronously (`SectorMode.raised` -> `newTeam`), so
  the index is right. Never a fourth: at `n >= max` the lock never opens. An outside `alarmRaised` (n = 0) stays shut.
- Reset: `resetAlarm` clears `rearmed`, `guardAlarms`, `alarmAgo`, `alarmTeam0`. `clear()` empties `teams` but leaves
  `alarmTeam0` alone, which only drops the team route back to the `rearm` timer. Every section load calls `resetAlarm`
  (sectorMode.ts:692) before setting `alarmRepeat` (:703).
- Marlow Yard / parked modes: `EnemyManager` is made per `GameState` (gameState.ts:705) with `alarmRepeat = false`, and
  only `SectorMode.loadSection` sets it, so courseMode keeps exactly one guard alarm per load (unit test covers it). With
  repeats off, `alarmOpen()` reduces to the old `!alarmRaised` on every path.
- Command call: after a raise, `command.raised()` clears the debt. Once the lock opens, a new contact that gets through
  owes and starts a fresh call (alarmCall test: `started` 2, net alarms 2). A call still in flight when the lock shut is
  refused by `radioAlarm`. `counts.radioAlarms` now counts each raised radio alarm (`guardAlarms > n`).
- Performance: `repeatStep` returns early in the common case. `teamSearching` uses indexed loops over a few teams with
  no allocation. No `Math.hypot` in game code (the e2e's page-side `Math.hypot` predates this diff and is not game code).
- Hard rules: nothing in `src/net` reads `alarmRaised`, `alarmOpen` or the repeat state. Co-op clients get the stage
  through the existing Sector state sync. No Babylon or net imports added. Strict TS holds.
- e2e-sectorops: sound. The second panel alarm opens the lock with `repeatStep(rearm)`, which is TS-private but
  reachable at runtime; the team-searching route is unit-tested. It keeps the radio silence (`hush`) and the panel-only
  assert, and checks the shut lock after the first alarm, stage +1, `guardAlarms` 2 and the stage-2 gear. Security
  devices are off, so `deviceFresh` cannot open the lock early.
- Tests match the PLAN list: second and third alarm, never a fourth, the `rearm` fallback, reset on load, the sticky
  `alarmRaised`, the panel runner, courseMode with one alarm, and the stage climbing in the sector harness.

## Polish (non-blocking)
1. `src/ai/enemyManager.ts:855` `teamSearching(alarmTeam0)` scans every team made since the last guard alarm. That
   includes a team a later camera or laser stage brings (`SectorMode.cameraAlarm` -> `raised` -> `newTeam`), so that
   team's search can open the lock. A7 says "its newest response team". Harmless (stage cap 3, `max` 3), but a
   `alarmTeamN` upper bound would match the words.
2. `src/ai/enemyManager.ts:985` A team member who joins by the device route (`joinAsResponder`, no valid LKP and a fresh
   device trip) may count as "searching" from the moment he spawns, before he arrives. It is rare for a guard alarm,
   which needs a sighting. Worth a line in ai.md, or requiring `!m.entering`.
3. Once `rearm` passes during one long fight, any guard still alerted near a panel can take it again without a fresh
   sighting (`assignAlarm` needs only `alerted`). This is within A7's wording; flag it for Michael's walk if it feels
   too eager.
4. The branch worktree's `node_modules` junction chain is broken for sandboxed runs. Point
   `Mobile-Coop-guard-rules/node_modules` straight at a real install so the slice's own `npm run typecheck:fast` works.
