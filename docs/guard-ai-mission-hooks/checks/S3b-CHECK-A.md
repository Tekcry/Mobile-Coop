# S3b check A (per-area alarm wiring)
Owner: Guard AI Build. Status: current.
Verdict: PASS

Checker: fresh Opus 5.5, checker A (intent and correctness). Head `28a4c2ac9` on `feature/guard-ai-mission-hooks-s3b`,
diff `3c3a7d17b..28a4c2ac9` (S1b passed head + S3a's `src/ai/areaAlarms.ts`). Spec: S3-BRIEF Part 2 (steps 3-6) and its
lead decisions, PLAN Design section 2, "Order with J15", C5, BRIEF A9 / A10 / A14.

No fixes.

## Done looks like (flag on, areas set)
- Area-0 radio alarm raises area 0 only: `radioAlarm` maps the completed call to the area whose `areaCmd[i].caller` is
  the caller (`src/ai/enemyManager.ts:3258-3268`), `raiseAlarm(e, null, a)` diverts to `raiseArea` (`:939-944`), which
  shuts only `areaSt` lock `a` and leaves `alarmRaised`, `rearmed`, `guardAlarms`, `alarmRunner` and the site
  `command` alone (`:976-987`). Area 1 raises its own the same way. Met.
- A panel (`p` set) and a caller with no area (`area` -1) fall through to J15's body (`:945-971`). Met.
- Locks independent (lead decision 4): `alarmOpenIn` (`:1280-1284`) reads the area lock only; `alarmOpen()` and
  `assignAlarm` untouched. Met.
- `setAreaStage` (`:1263-1272`) gears only living guards with `e.area === area`; `giveStageGear` (`:1306-1312`) uses
  `stageFor(e.area)` only under helmet rule `stage`, else `alarmGear` (lead decision 3). Later placements read it
  (`placeSlot` sets `e.area` before `giveStageGear`, `:2309-2317`); a woken guard keeps it (`inherit`, `enemy.ts:1113`;
  `revive` gears after `inherit`). Met.
- Carry rule: `carryCalm` (`enemy.ts:1929-1933`) reads `areaRaised` (site or his area raised) and `areaStage`
  (max(site, area)); ctx wiring `:784-786`. Met.
- `alarmArea` is set before `onAlarm` in both paths (`:968`, `:985`). Met.
- `newTeam` index window per area (`team0` at `raise`, `teamN[a]` after `onAlarm`) and `repeatStep`'s area loop
  (`:902-909`) run J15's rule per area, before J15's early return. Count capped at `ALARM_REPEAT.max` by `waiting`.

## J15 with areas null (flag off, or no `setAreas`) - traced, no behaviour change
- `raiseAlarm`: divert needs `this.areas`; body identical (`huntOf` is the moved expression, same result); new
  `alarmArea = SITE` is write-only for J15.
- `contactThrough`: `a` = SITE, `cmd` = `this.command`, `alarmOpenIn(SITE)` = `alarmOpen()`, `canCallIn` = `canCall`,
  `nextCaller(SITE)` adds 0 and skips the holder test, `startCommand(who, SITE)` uses `this.command`. Only change:
  `byNum(caller)` now runs before the gate (pure lookup).
- `radioStep`: site tick still reads `radioNet.commandOpen`; `return` before the area loop; nothing followed it.
- `radioAlarm`: `a` = SITE; `alarmsRaised` = `guardAlarms` + area counts, and the area counts are 0 whenever areas are
  null (only `raiseArea` raises them, it needs areas, and every `setAreas` call runs `resetLocks`). Same tally.
- `repeatStep`, `giveStageGear`, `sink.completed` (`areaSt.any()` false for the same reason), `carryCalm`
  (`areaRaisedFor` / `areaStageOf` return `alarmRaised` / `alarmStage`), `placeSlot` / `spawnReinforcement` (area -1),
  `setAlarmStage` (`areaSt.site` mirror only), `resetAlarm` / `clear` (extra resets only): unchanged in effect.

## Builder deviations
1. Second command call refused by `radioNet.startCall` while one is open (`radioNet.ts` ~200-203, out of scope):
   verified. Area 1's `startCommand` gets -1, `cmd.refused()` keeps `owed` and sets the 3 s retry; its retry ticks
   (`:3220-3227`) pick `nextCaller(1)` again until area 0's call completes, then start their own. `raiseArea(0)` calls
   only `areaCmd[0].raised()`, so area 1's debt is never swallowed (the S3-a case the lead ruled on). It delays rather
   than blocks: up to `RADIO.report` + `ALARM_CALL.retry` (~7 s). ACCEPTABLE.
2. `canCallIn` / `holdsCommand` (`:1066-1077`, `nextCaller` `:1040`): needed, because `startCall` returns the open id
   for the same caller / inc -1 / kind, so a holder picked for a second area would share one net call and
   `radioAlarm` could only credit one area. Gated by `this.areas`. ACCEPTABLE.
3. `setAreas` recomputes from `zoneX / zoneZ` (only `placeSlot` sets them, `:2338`): verified; a guard from
   `spawnReinforcement` before a later `setAreas` would read (0, 0). C5 calls `setAreas` at the bind, before any
   reinforcement, so no live path hits it. ACCEPTABLE (polish 2).
4. e2e places its guards with `em.placeSlot` after `t.spawn`: the only way a test-spawned guard gets an area; it also
   clears his post (`setPost(null)`), which the scenario does not need. ACCEPTABLE (e2e not run here; lead queues it).

## Stuck / leak / double-raise
- One completed call raises at most one lock (area lookup or site, never both); `raiseArea` and `radioAlarm` both gate
  on the lock. No double raise found.
- `resetAlarm` (every Sector Ops section load) clears area locks, counts, command calls and ids; `clear()` clears the
  calls and ids; area stages and areas stay (S3-e). Old section's calls die with `despawnAll` (caller left the view).
- Area debt cannot stick: a held call that closes goes to retry; nobody to call lapses it (J15's rule).

## Checks run
- `npx vitest run tests/areaAlarmsManager.test.ts`: 12/12 passed.
- `npm run typecheck:fast` and the J15 test files: NOT run (laptop CPU 91-100% throughout). Checker B or the lead
  should run them.

## Polish (not blocking)
1. `setAreas` does not clear `areaCmd` / `areaCmdId`: `setAreas(boxes)` -> `setAreas(null)` -> `setAreas(boxes)` mid-load
   without `resetAlarm` would wake a stale area debt. Only C5's bind calls it; clearing the area calls in `setAreas`
   would close it (`:1248-1259`).
2. `setAreas` mixes placement x / z with the current `e.pos.y` (`:1257`): a guard who climbed out of a height band before
   the call gets the wrong area; and see deviation 3. Storing the placement height (or setting `zoneX / zoneZ` in
   `spawnReinforcement`) would make it exact.
3. `spawnReinforcement` reads the entry def point `at` (`:1094`), not the snapped spawn cell `e.pos` (as the brief says);
   differs only for an entry on a box edge.
4. After a panel raise clears `command.caller` while the site's net call is still open, `holdsCommand` misses that
   holder; picked for an area, `startCall` hands back the site's open id and its completion raises the area early.
   Harmless (the debt is paid), rare.
5. ai.md lines for the lead: say "one command call on the net at a time; the other area's waits its retry" (not "two
   open"), and note S3-c's effect for C5: after an area radio alarm the panels stay free, so a guard of that area who
   runs a panel still raises the site.
