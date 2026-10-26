# coop4 merge 3 re-check (check A FIX 1)
Owner: Guard AI Build. Status: current.

Checked head: `21ee1fc1b1aa3a1203b3bd61879da13144318803` (fix round, diff `b6d8d4ada..21ee1fc1b`). Checker: fresh Opus 5.5,
read-only. Read: check A (`MERGE3-CHECK-A.md`), the fix diff, the merge note (now `docs/coop4/checks/MERGE3.md`),
`SectorRun.nextAlarmSends` / `raiseAlarm` / `alarmStep` and `capReinforce` (src/game/sectors.ts), `responseShape`
(src/ai/gear.ts), `EnemyManager.shapeResponse` (src/ai/enemyManager.ts), `SectorMode.alarmQuiet` / `onAlarm` /
`cameraAlarm` / `raised` (src/game/modes/sectorMode.ts), `stealthSystems.onAlarm`.

Verdict: PASS

## Fix 1 against check A's "done looks like"
- **Body**: `nextAlarmSends()` is `alarmStep(this.alarm, this.current?.perStage ?? SECTOR.perStage).send`, byte for byte
  origin/master's. No `teamSize`.
- **Doc**: says why the 2-player count is used (`responseShape` sends nobody at `perStage` 0 and adds the A9 extras
  only on top of a base).
- **Test** (`tests/sectorTeamScale.test.ts` "nextAlarmSends ignores the coop4 extras"): `perStage` 0 + `teamSize` 4 gives
  0; `perStage` 2 + `teamSize` 4 gives 2 at each stage below the cap and 0 at `SECTOR.alarmMax`. Both halves fail on the
  pre-fix body (it returned 2 and 4: `reinforcePerExtra` 1 x `extraPlayers(4)` 2), so the test pins the fix.
- **Merge note**: the conflict row and the "For the merge checker" bullet now describe the restored body.

## The "zero exactly when the live path sends zero" claim
Live path at an alarm: `raiseAlarm` gives `want` (teamSize-aware); `raised` asks `EnemyManager.shapeResponse` only when
`want > 0`, takes `ask = sh.size` from `responseShape(stage, perStage, livePlayers, headroom)`, then
`send = capReinforce(ask, base, headroom)` = `min(ask, max(base, headroom))`. `g.enemyMgr` is always an `EnemyManager`
once a world loads, and `shapeResponse` is unconditional (no flag), so the hook path is the live one.
- **Stage capped**: `alarmStep` gives 0 for any player count, so `want` 0, no shape, `send` 0; `nextAlarmSends` 0. Agree.
- **`perStage` < 1 (0 or a fraction)**: `responseShape` base is 0, so `size` 0 and `send` 0 whatever the extras;
  `nextAlarmSends` returns `perStage` < 1, so `alarmQuiet` (`< 1`) is true. Agree.
- **`perStage` >= 1, below the cap**: `want` >= 1, `size` >= `floor(perStage)` >= 1, and `capReinforce` never cuts below
  `base` (`max(base, headroom)` >= base, `ask` >= base), so `send` >= 1; `nextAlarmSends` >= 1, not quiet. Agree.
  The extras never move the answer across zero.
- Without an enemy manager (`em0` null, no world) `send = want`, but nothing can spawn; same as master, out of scope.

## Nothing else depends on the old teamSize-aware count
`git grep` over src, tests, scripts: `nextAlarmSends` has one caller, `SectorMode.alarmQuiet`, whose one reader is
`stealthSystems.onAlarm`'s "Reinforcements inbound" line. No test asserted the old value. `raiseAlarm` still passes
`teamSize` (coop4 A9, unchanged by the fix) and only feeds `want`, which decides "sends at all" identically for both
counts when `perStage` >= 1.

## Checks run
- `npm run typecheck:fast`: clean.
- `npx vitest run tests/sectorTeamScale.test.ts tests/alarmRepeat.test.ts tests/sectors.test.ts
  tests/responseWiring.test.ts`: 4 files, 88 tests passed.
- No e2e, no `npm run check` (per brief).

## Polish
1. `MERGE3-CHECK-A.md` and `MERGE3-CHECK-B.md` still name the merge note at its old path
   `docs/guard-ai/checks/COOP4-MERGE3.md` (now `docs/coop4/checks/MERGE3.md`). Historical records; fix only if touched.
2. Check A polish 3 still open: `raiseAlarm`'s doc ("+ the extras for `teamSize`") reads as the spawned count; on the
   live path it only gates whether the stage sends, the hook decides the size.
