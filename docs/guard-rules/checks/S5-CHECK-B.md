# guard-rules S5 check B
Owner: Guard AI Build. Status: history.

VERDICT: PASS

Checker B: Opus 5.5 (fresh), 2026-10-25. Head be49ac068 (feature/guard-rules-s5), diff `211a66d5..be49ac06` (11
files). Scope: intent against Michael's words and the design docs, gameplay edge cases, test coverage, docs and
changelog. Read: agent-preamble, VISION (rules 3, 4, 8), bible 5.7 "Mission alarm level 0-3. Each raised alarm adds one
level" and 5.8 (rules, results), BRIEF ("Michael said", "Michael picked", A1, A7, Limits), PLAN "PR2 - rule fix B", the
full `src`, tests, e2e and docs diff, and the code it touches (`SectorMode.onAlarm` / `raised` / `fill`,
`StealthSystems.onAlarm`, `SectorRun.raiseAlarm`, `CommandCall`, `joinReinforcement`, the co-op host's sector wire).

## Checks run
- `npx vitest run tests/alarmRepeat.test.ts tests/alarmCall.test.ts tests/radioWiring.test.ts`: 3 files, 40 tests
  pass. The worktree's `node_modules` junction (-> Mobile-Coop-guard-rules -> Mobile-Coop-guard-ai) cannot be read
  (vitest not found), so the run used a scratch copy of be49ac06 (`git archive` of src, tests, scripts) on
  Mobile-Coop-flake-fix's `node_modules` (same dependencies in package.json). Worth repairing the junction before
  the lead's own runs.
- `node scripts/doc-lint.mjs`: 0 errors; the only warning in a touched file is TESTING.md's old header warning.
- No `npm run check`, no e2e (laptop queue), as asked.

## Findings (intent: all match)
- Where: `SectorMode.loadSection` sets `em.alarmRepeat = true` beside `setSection` (Sector Ops, and the campaign,
  which launches as mode `sector` from the briefing screen). `courseMode` and `stealthSystems` are untouched and a new
  `EnemyManager` is made per game, so Marlow Yard keeps one guard alarm per load (A7, Q11) and the flag cannot leak
  across modes.
- Bible 5.7 "Each raised alarm adds one level": each guard alarm goes through `raiseAlarm` -> `onAlarm` ->
  `SectorRun.raiseAlarm` (+1, capped at `SECTOR.alarmMax` 3), its own response team and the stage gear (stage 2:
  armour and helmet, A3). `ALARM_REPEAT.max` 3 matches the cap.
- Fixed and explainable (VISION 8, bible P5): the lock opens on a fixed rule (a living, free member of a team the
  alarm brought is searching, or 60 s), no randomness. A new raise still needs a guard in combat (the panel runner
  takes only `alerted` guards) or a new contact call (contacts while shut are dropped, not banked), so the next stage
  comes from a guard who sees the player again, as PLAN "Done looks like" says.
- Every new-raise gate moved from `alarmRaised` to `alarmOpen()`: `raiseAlarm`, `contactThrough`, `assignAlarm`, the
  command retry in `radioStep`, `radioAlarm`, and the panel run in `Enemy.decide`. `alarmRaised` stays sticky for the
  carry rule (`enemy.ts:1700`). `resetAlarm` clears lock, count, timer and team index. A raise from outside
  (`alarmRaised` set, `guardAlarms` 0) never opens.
- Perfect rating / no forced kill (G146, G127): untouched; a repeat needs an alarm already raised. Each repeat counts
  in `secStats.alarms` and `radioAlarms`, which is the honest tally.
- Co-op: the client runs no `EnemyManager`; the stage reaches it on the host's `sector` wire (on change and every
  0.5 s) and the gear via `MoveState`, the same path the first alarm and camera stages already use. No wire change.
- Capacity: the live cap and `newTeam`'s `spread` were already sized for `alarmMax` teams per section, so three guard
  alarms fit.
- Tests prove what the plan asks: the second and third alarm only after a team member searches (and only one the
  latest alarm brought), never a fourth even with every team searching and time passing, the 60 s fallback (not
  before), reset on load, the panel runner and `ctx.alarmOpen`, the Marlow case (`alarmRepeat` off: after the team
  searches a second sighting starts no command call, no panel run), and the stage 1 -> 2 -> 3 climb with stage-2 gear
  and a restart reset in the real `SectorMode` harness. `alarmCall` / `radioWiring` cover both settings of
  `alarmRepeat`. The e2e block adds a second panel alarm in section 2 (stage +1, helmets at stage 2), then the restart.
- Docs: `docs/systems/ai.md` (the repeat paragraph, Response teams), TESTING.md (the response-teams item) and the
  changelog fragment match the code.

## Polish (non-blocking)
1. `src/ai/enemyManager.ts:247` "raised once per match" and `:892` (`contactThrough` JSDoc) "no alarm yet" are stale
   now; "once per load, or up to `ALARM_REPEAT.max` with `alarmRepeat`" / "while a new alarm may be raised".
2. A device-alarm team (`joinAsResponder` -> `searchAt`) is `searching` from spawn, before it arrives. If such a team
   is among the teams counted (`teams` from `alarmTeam0` on: a camera / laser alarm after the guard alarm while no
   last known position is valid), the lock opens at once rather than when the response is in. Rare (a guard alarm
   almost always leaves a valid LKP); skipping `responder` members or `entry` still running in `teamSearching` would
   close it. Also the doc says "a response team the last alarm brought"; the code also counts later camera teams.
3. At the stage cap (3, e.g. cameras raised it), a repeat guard alarm still shows `StealthSystems.onAlarm`'s
   "ALARM / Reinforcements inbound" with none sent. Pre-existing for the first alarm, but repeats make it likelier.
4. Lines over 120 characters in the new `TESTING.md` item (189) and `docs/systems/ai.md` (121-142); no lint rule
   catches it.
5. The changelog line says "after the response team is in"; "or a minute later" would match TESTING.md and the rule.
