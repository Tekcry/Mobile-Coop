# guard-ai-mission-hooks S3b: check B (rules, hot paths, tests, e2e)
Owner: Guard AI Build. Status: current.
Verdict: FIX 1

Checker: fresh Opus 5.5 (B), independent of check A (not read). Diff checked: 3c3a7d17b..28a4c2ac9 (+750 / -27) over
`src/ai/enemyManager.ts`, `src/ai/enemy.ts`, `tests/areaAlarmsManager.test.ts` (new), `scripts/e2e-stealth-ai.mjs`,
against `slices/S3-BRIEF.md` Part 2 (steps 3-6, Rules, Must NOT touch, Checks, lead decisions). Every changed line
read; the e2e read, not run.

Runs: `npm run typecheck:fast` clean. `npx eslint` on the three TS files: clean (the .mjs is lint-ignored).
`node --check scripts/e2e-stealth-ai.mjs` OK. `npx vitest run tests/areaAlarmsManager.test.ts tests/alarmRepeat.test.ts
tests/alarmCall.test.ts tests/radioWiring.test.ts tests/helmetRule.test.ts`: 5 files, 71 tests, all pass.

## Fix list

1. **e2e (b) and (d2): the area-1 spotter's sight line grazes the pillar at (10, 5)** (`scripts/e2e-stealth-ai.mjs`
   ~3902-3904; pillar `src/world/maps/warehouse.ts:320`, `b.pillar(10, 5, 0.35, ...)`, a Havok
   `PhysicsShapeCylinder`). The spotter stands at (10, 9) facing -z. The first floor candidate, (9.5, 4), is almost
   surely walkable (1.1 m from the pillar's axis), so it is the pick. The eye-to-player ray, which is also the chest,
   head and hips rays (same x / z), passes 0.398 m from the pillar's axis against a 0.35 m radius: about 5 cm clear.
   Candidate (10.5, 4) is the same; (10, 4.5) is right behind the pillar. Any Havok convex radius, or the guard
   settling a few cm in +x, blocks every ray: `bAlerted` / `d2Alerted` fail and (b) never raises. The run is
   deterministic, so it passes or fails every time, and nobody has run it yet.
   Done looks like: player spots well off the pillar's line, e.g. candidates `[[11.2, 4.5], [8.8, 4.5], [10, 6.5]]`
   (11.2, 4.5 clears the axis by ~1.0 m and is 15 deg off his facing). Optionally assert `b.alerted` before the
   command wait with a message that names the pick.

## What holds (no action)

- **Scope.** Only the four owned files changed. `alarm.ts`, `gear.ts`, `missionOrders.ts`, `radioNet.ts`,
  `core/flags.ts`, `src/game/**` and J15's tests are untouched. No wire, save or `PROTOCOL_VERSION` change.
  `import type` / inline `type` are used throughout. No randomness, no `Math.hypot`, no time source added.
- **Hot paths.**
  - `repeatStep`'s area loop (`enemyManager.ts` ~903-910) reads typed arrays only.
  - `radioStep`'s two area ticks (~3211-3226) do `isOpen(id)` scans with no allocation.
  - `holdsCommand` / `canCallIn` / `nextCaller` add fixed loops.
  - The ctx `areaStage` / `areaRaised` arrows live in the ctx object built once in the constructor (~642, ~784-786),
    not per call.
  - `carryCalm` (`enemy.ts:1931`) uses optional calls, which allocate nothing.
  - `gearS` is a scratch object. `areaOf` runs at placement and `setAreas` only.
- **J15 exact with no areas.** Every new branch is gated on `this.areas`. `canCallIn` equals `canCall`, `nextCaller()`
  adds 0, `radioStep` reads `commandOpen`, and `radioAlarm`'s `alarmsRaised` equals `guardAlarms` (area counts are 0;
  `setAreas` resets them). `sink.completed`'s `areaSt.any()` is false. So `&areaalarms=1` changes no other scenario:
  `setAreas` appears only in the new scenario, and its `finally` restores `onAlarm`, calls `setAreas(null)` and
  `resetAlarm()`, clears `pending` and unpins the light.
- **Builder deviations, both sound.**
  - `canCallIn` / `holdsCommand`: the net hands the same caller back his open command call (inc -1), so one guard
    must not hold two areas' calls.
  - Case 3 rewritten: the net refuses a second `command` call per section (`radioNet.ts` `startCall`), so area calls
    run one after another. Area 1's `refused()` keeps `owed`, and its retry starts its call once area 0's ends.
- **Unit test, the brief's 11 cases, each with real assertions.**
  - Case 3 proves the debt is kept: `areaCmd[1].owed` stays true through area 0's raise, then area 1 raises,
    `command.started` stays 0 and `guardAlarms` 0.
  - Case 4 covers team-search rearm per area, the time rearm, the max-3 cap (`alarmsRaised` max+1 across areas) and
    `resetAlarm` keeping stages.
  - Case 8 runs the real `carryCalm` on a prototype probe, plus `inherit`.
  - Case 11 asserts `toBe` identity for all 7 typed arrays, the `areaCmd` array and both `CommandCall`s over 200
    steps. That proves identity, as the brief asks, not a zero-allocation count.
- **e2e otherwise.**
  - (a) reuses 'alarm call''s proven spotter and player spots. The boxes hold (0, 5) and (10, 9). The floor checks
    copy the 'dog release' helper.
  - Clear mode never calls `setAlarmStage` / `useDifficultyHelmets` (rule `stage`, site stage 0), so (c)'s
    before/after gear is sound.
  - (d) proves J15's one-alarm rule with areas null.
  - Timeouts: 5 s spot, 15 s raise, against ~6.5 s contact + report. The scenario is the suite's last, so no state
    leaks forward.

## Polish

1. Case 11 barely runs the per-area command path: area 0 is shut, so the contact is gated and the area ticks return
   at `!owed`. Owing area 1 inside the 200 steps would run `startCommand(c, a)` / `isOpen(areaCmdId)` too.
2. Case 3 could pin the one-command-call-per-net adaptation directly: after area 1's contact,
   `areaCmd[1].caller === -1 && areaCmd[1].retryT > 0`.
3. `setAreas` resets the area locks but not `areaCmd` / `areaCmdId`. An area call in flight at a re-bind (or after
   `setAreas(null)`) completes into the site or the reopened area, and a stale `caller` stays until `resetAlarm` /
   `clear`. This is harmless today: C5 binds at load, and the e2e calls `resetAlarm`. Clearing them in `setAreas`
   would close it.
4. e2e (b) `r.b.site` is trivially true (`t.reset()` sets `alarmRaised = false`); (a)'s `!raised && site` carries
   the proof.
5. Design note for the lead / ai.md: area command calls take turns on the section net. Area 1's alarm is never lost
   but can wait up to one `ALARM_CALL.retry` after area 0's (or the site's) call ends. S3-a's "never blocks" holds for
   the debt, not the timing.
6. `alarmsRaised` sums `count[0] + count[1]` by hand rather than looping `AREAS.max`. `carryCalm`'s new line is
   ~186 chars.
