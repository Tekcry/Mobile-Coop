# guard-ai-mission-hooks S3a: check B (fitness for S3b, intent)
Owner: Guard AI Build. Status: current.

Checker: Opus 5.5 (B). Head df0fb6028 on `feature/guard-ai-mission-hooks-s3a`, base 5db49d2ec. Spec: S3-BRIEF.md Part 1
and Part 2, Assumptions S3-a..S3-h, Lead decisions; PLAN Design 2; BRIEF A9 / A10 / A14.

## Verdict: PASS

No fixes.

## Checks run
- `npm run typecheck:fast`: clean (exit 0).
- `npx vitest run tests/areaAlarms.test.ts`: 24 / 24 passed.
- Diff: 2 new files only (`src/ai/areaAlarms.ts` 145 lines, `tests/areaAlarms.test.ts` 274 lines). No other file
  touched; nothing in `src/` imports the module yet, so no runtime change (A9 ships dark: trivially true until S3b).
- Purity: imports only `ALARM_REPEAT` from `./alarm` (which imports only `hyp2`); no Babylon, DOM, flag or `src/game`.

## Fitness for Part 2 (S3b)
Every name S3b's steps call exists with the signature it uses:
- Import line (step 4.1): `AREAS`, `areaOf`, `AreaStages`, `SITE`, `type AreaBox` are all exported.
- `areaOf(areas, x, z, y)`: argument order matches steps 4.3 / 4.6 (`e.zoneX, e.zoneZ, e.pos.y`, `e.pos.x, e.pos.z,
  e.pos.y`); `null` / `[]` -> -1; third area ignored (S3-g).
- `AreaStages`: `site` (mutable, steps 4.3 / 4.4), `stage[area] = stage` (step 4.3, `readonly` binding, writable
  elements), `stageFor(e.area)` (steps 4.3 / 4.5; -1 reads the site), `open(a)` (4.3, 4.9), `raise(a, teams.length)`
  then the manager writes `teamN[a]` after `onAlarm` (4.9), `count[0] + count[1]` (`alarmsRaised`, 4.2), `raised[a]
  === 1` (`areaRaisedFor`, 4.7), `any()` (4.16), `waiting(a, alarmRepeat)` / `tick(a, dt)` / `team0[a]` / `teamN[a]` /
  `rearm(a)` (4.15), `resetLocks()` (4.3, 4.8), `clearStages()` (4.3).
- Reset semantics (S3-e): `resetLocks` zeroes every lock field (raised, rearmed, count, ago, team0, teamN) and keeps
  `site` / `stage`; `clearStages` zeroes `site` / `stage` and keeps the locks. That is exactly what step 4.8
  (`resetAlarm` -> `resetLocks`, stages stay) and step 4.3 (`setAreas` -> `clearStages`, `site = alarmStage`,
  `resetLocks`) need. Both tested, including identity of the typed arrays.

## J15 rule copy (base 5db49d2ec, `src/ai/alarm.ts` ~68-74, `src/ai/enemyManager.ts` ~830-911)
- `ALARM_REPEAT` on the base: `enabled` true, `max` 3, `rearm` 60. The module reads the table, no copied numbers.
- `alarmOpen()` = `!alarmRaised || rearmed` <-> `open(a)` = `raised[a] === 0 || rearmed[a] === 1`. Same.
- `repeatStep` early return (`!alarmRaised || rearmed || !alarmRepeat || !enabled`, then `n < 1 || n >= max`) <->
  `waiting(a, repeatOn)`. Same conditions. Then `alarmAgo += dt; if (alarmAgo >= rearm || teamSearching(...)) rearmed =
  true` <-> S3b's `if (tick(a, dt) || teamSearching(team0[a], teamN[a])) rearm(a)`: `tick` adds before comparing, as
  J15 does; the `||` short-circuit skips `teamSearching` once the clock fires, same result.
- `raiseAlarm`'s lock lines (`alarmRaised` true, `rearmed` false, `alarmAgo` 0, `alarmTeam0 = alarmTeamN =
  teams.length`, `guardAlarms++`; `alarmTeamN = teams.length` after `onAlarm`) <-> `raise(a, teams)` plus S3b's
  `teamN[a]` write. Same.
- `resetAlarm`'s lock lines <-> `resetLocks`. Same.
- After `max` raises the area stays shut until the load resets (no rearm once `count >= max`), as J15's site lock.
- `teamSearching` stays the manager's (S3b reuses it with the area's range); nothing to copy.

## Intent
- A9 (G358, logged, Q1 on the walk card): the module models "site stage over two area stages, a guard reads max(site,
  his area)" and nothing more; it reads no flag (the manager gates `areaAlarms`, A14). Ships dark: unused by runtime.
- A10: `areaOf` is the placement-point rule (first area whose box holds (x, z) and whose band, if any, holds y).
- S3-c (independent locks, lead decision 4): the module has no site lock; one area's fields never touch the other's
  (tested: raise / tick on one area leaves the other's `open`, `count`, `ago` unchanged).
- Nothing contradicts Michael's words in BRIEF (G299, G292, the sign-off picks) or G125 / G350 / G355 as cited.

## Polish list (not blocking)
1. `src/ai/areaAlarms.ts:73` `ago` is a `Float32Array`; J15's `alarmAgo` is a float64 field. With frame dt the area
   clock fires within a few ms of the site's, not on the same step (the test allows +-dt). A `Float64Array` makes the
   area rule bit-for-bit J15's at no cost. Optional.
2. `src/ai/areaAlarms.ts:9-10` header: "a guard's radio command call raises his area's stage only" is A9's wording, but
   neither this module nor the S3b manager raises a stage on an alarm: the manager raises the area's lock and sets
   `alarmArea`; Campaign Build (C5) then calls `setAreaStage`. Suggest "raises his area's alarm (lock and count; C5
   lifts that area's stage from `alarmArea`)" so S3b readers do not look for a stage write in `raiseArea`.
3. `src/ai/areaAlarms.ts:94-101` `raise` does not bound `count` (`Uint8Array`); safe because the manager gates every
   raise with `open(a)` and `waiting` stops at `max`. A one-line doc note ("the caller checks `open(a)` first") would
   say so; the class doc already says the manager checks the range.

## Notes for S3b
- Stacking: base 5db49d2ec is S1a-1's polish head, not on master (master 8979683b0 has no `ALARM_REPEAT`: J15 PR4 is
  not merged there yet). S3a's PR can only land after J15 PR4 and S1a-1 reach master, or its diff carries them. S3b
  must be cut from a head that has S3a and S1b.
- `AREAS.max` is a literal `2` type; `new Int32Array(AREAS.max)` and the `for (a < AREAS.max)` loops are fine; the
  `areaCmd` tuple of two `CommandCall`s must stay in step with it if `AREAS.max` ever changes (S3-g undo).
- `AreaBox` is structural (`boxes` of [minX, minZ, maxX, maxZ], optional `y` [lo, hi]); the engine's track type is not
  on master yet, so C5 maps its track boxes and bands to this shape at `setAreas`. Edges are inclusive.
- `stageFor` reads any index (out of range = site), so `areaStageOf(e)` needs no range check; `open` / `raise` /
  `waiting` / `tick` / `rearm` / `raised[a]` do not check, so keep S3b's `area >= 0 && area < AREAS.max` gates in
  `raiseArea`'s caller, `alarmOpenIn` and `areaRaisedFor` exactly as the brief writes them.
- `setAreas` order matters: `clearStages()` zeroes `site`, so `site = this.alarmStage` must follow it (step 4.3).
