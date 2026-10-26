Verdict: PASS

# J15 guard-rules PR2 polish delta: checker B (Opus, fresh)

Checked: `git diff a09495007 69257d7b1 -- . ':!docs/archive/guard-rules/slices'` (7 commits, 026f52c5e..69257d7b1, 16 files)
against the Polish lists of PR1-CHECK-A/B and S5-CHECK-A/B and BRIEF A7. Head 69257d7b1.

Reran: `npm run typecheck:fast` clean (CPU 21%). The five touched test files only (`helmetRule`, `alarmRepeat`,
`killScore`, `gear`, `responseTeam`): 62 / 62 pass. No full vitest, no e2e.

## Blocking
None.

## What was checked
1. Hard rules. `teamSearching` loops by index, no closure, iterator or temp object; `atSearchSpot` is a plain getter.
   `nextAlarmSends` allocates `alarmStep`'s small object, but only once per alarm (not a hot path). No `Math.hypot`, no
   new `src/net` import, type-only imports stay `import type`; tsc strict is clean.
2. `GameMode.alarmQuiet` / `SectorRun.nextAlarmSends`. Only `SectorMode` implements it; mission, clear, course
   (Marlow Yard) and the parked modes fall through `?.()` to the old "Reinforcements inbound" line. Order is right:
   `StealthSystems.onAlarm` reads it before `SectorMode.onAlarm` raises the stage, so it asks about this alarm. Below
   the cap the stage banner replaces it as before. Co-op: the alarm runs on the host's manager only; nothing changes
   on the client. No `src/net` or `src/save` change, `PROTOCOL_VERSION` untouched, no new wire or save field.
   `responseTeam`'s default flip to `false` changes no behaviour: both production callers (`sectorMode.ts:965`,
   `stealthSystems.ts:596`) pass `shield` explicitly. `RESPONSE.shieldLead` is now a real global switch (doc matches).
   `killScore`'s `base > 0` gives the same results as before for every kind (killed dog: no bonus; knocked-out dog
   and others: bonus).
3. Reset. `alarmTeamN` is cleared in `resetAlarm` with `alarmTeam0`, and `resetAlarm` runs on every section load or
   restart (`SectorMode.loadSection`) and checkpoint restart (`resetMemory`). If `teams` is emptied without it, `end`
   is clamped and the loop does nothing (the 60 s timer still opens the lock). `spotArrived` behind `atSearchSpot`
   is per-step state on a fresh `Enemy`, never saved or sent. `alarmTeamN` is set after `onAlarm`, and both team
   makers (`SectorMode.raised`, the live-map `StealthSystems.onAlarm`) call `newTeam` synchronously, so the range
   covers the alarm's own team and leaves out a later camera or laser team.
4. `vi.mock` in `tests/helmetRule.test.ts`. Vitest isolates modules per file (no `isolate: false` in
   `vitest.config.ts`), so the mock cannot reach other files. It replaces only the constructor (the real prototype and
   statics are kept), and the test drives the real `EnemyManager.revive`. Dropping the `ruleHelmet` call from `revive`
   would fail the new "wakes locked" case, because the stand-in starts with `helmetLocked` false and `giveStageGear`
   never sets it. So the test proves what it claims.
5. Docs. `docs/systems/ai.md` describes the repeat rule once (Repeat guard alarms); the Teams paragraph only points
   back ("the repeat lock reads it, above"). TESTING.md and `changes/feature-guard-rules.md` are plain English and
   match the code ("or a minute later", the dev-check bullet dropped, body armour folded into the shields line). No
   added doc line is over 120 characters.

## Non-blocking polish
1. Added code lines over 120 characters (no lint rule; long lines exist elsewhere): `src/ai/enemyManager.ts:856`,
   `:906`, `src/game/modes/score.ts:6` (already long; `export` added), `:13`, `tests/alarmRepeat.test.ts:352`,
   `tests/helmetRule.test.ts:18`, `:119`, `:120`.
2. `src/game/modes/score.ts:6` exports a mutable `KILL_BASE` only so a test can try the undo. The test restores it in
   `finally`, so this is safe. A `readonly` export plus a local copy in the test would keep production code from
   writing to it.
3. Polish items left for later (fine for this delta, list them in the PR so they are not lost): PR1-A 2 (client
   deflect marker; needs a wire bit, the train's), PR1-A 4 (`GearGuard`, J17), PR1-B "gas knocks the dog out" e2e
   name (`scripts/e2e-enemies.mjs:223`) and a Perfectionist e2e line, PR1-B co-op deflect note in the TESTING helmets
   item, S5-A 3 (re-take a panel without a fresh sighting: flag it for Michael's walk), S5-A 4 (`node_modules` junction).
