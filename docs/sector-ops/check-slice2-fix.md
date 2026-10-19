# Slice 2 fix round - checker report (fresh checker, 2026-10-19)

Commit checked: c1f93ed7 (fix round, `git diff 2079cb14..c1f93ed7`). Light checks only; the remote runner's
`npm run check`, smoke, e2e-sectorops, e2e-stealth-ai and e2e-coop on this commit are the gate for the e2e claims.

**Verdict: PASS.** No blocking items. Two POLISH notes below.

## Checks run
- `npx tsc --noEmit`: clean. ESLint on the 10 changed source and test files: clean. `node --check` on
  `scripts/e2e-sectorops.mjs` and `scripts/run-e2e.mjs`: OK.
- `npx vitest run tests/sectorStep3.test.ts tests/sectors.test.ts tests/enemyManagerDespawn.test.ts`: 29 passed.
- Scratch Vitest (scratchpad, not committed): `warehouseOps` built, the analytic layered nav from `bunkerMap.test.ts`
  with the locked door leaves (C2 near/far, C3 near) shut:
  - The section 2 panel's stand point (-4.75, 1) is a walkable cell.
  - All 10 section 2 guard posts path to it (4.5 m to 37 m, all inside `ALARM.range` 30 m straight line).
  - None of the 10 section 1 posts or 11 section 3 posts can path to it: the panel opens no route between sections.

## Item by item
1. **Blocking item fixed.**
   - `assignAlarm` -> `nearestPanel` skips `disabled` panels. `StealthSystems.setLiveAlarms(i)` disables every panel
     whose `section` is not `i`, and `unloadSection` disables all of them. So only the live section's panel can be
     assigned.
   - A runner already running when its panel goes off: `Enemy.decide` drops `ap.disabled` panels, and the unload
     despawns every guard anyway. `resetAlarm` also clears `alarmRunner`.
   - `raiseAlarm` rejects a disabled panel. The host's `onUse` rejects a disabled item, and the client mirror shows
     the off items disabled (`on: enabled && !done`).
   - `alarmRaised` and the runner reset in `loadSection`, which runs on every section load and in `restartSection`
     (after `unloadSection`). Panels the player disabled are re-armed (`done` and `progress` cleared, item enabled).
   - The new panel (-4.15, 1) sits on the west (racking) face of the x -4 wall. In `warehouseOps` that wall has no gap
     between z -9.3 and 14 (`gapsX4`), so it is solid at z 1. Its stand point is in the east aisle (rack x -9..-8,
     pallet at z -4.6..-3.4 clear). It is reachable and sealed (scratch test above).
   - Other maps are unaffected:
     - `section` is spread only when it is defined.
     - `setLiveAlarms` and `resetAlarm` are called only from `SectorMode`.
     - The plain Warehouse layout's `alarms` are unchanged (`alarm-1` in e2e-stealth-ai is still the floor panel).
     - Fallow and Marlow Yard are untouched.
2. **The e2e now proves a real panel run.**
   - The new scenario forces `e.alert()` on the guard nearest section 2's panel. It asserts that the runner's
     `e.alarm.section === 1` and waits for `enemyMgr.alarmRaised` (only `raiseAlarm` from `Enemy.decide` sets it). It
     asserts the stage +1, restarts, asserts the re-arm, and repeats.
   - The polish-2 checks are no longer vacuous:
     - KO bodies: `knockOut` -> `die` -> `ctx.addBody` is synchronous, and it works with the stubbed `update`. The
       first 4 spawns in sections 1 and 2 are not dogs.
     - Seal length: section 2's connector has `sealUnlocks [[2, 16.05]]`.
     - `lk1 !== lk0`: these are strings.
3. **`playerRefsInto` and the HUD.**
   - `playerRefsInto` is the same as `playerRefs` (speed and crouch refreshed, local first, then remotes), with no
     spread.
   - The shared `this.refs` has no reentrancy hazard: `exitStep` and the download loop finish iterating before
     `connEvents`, `loadSection` and `fill` reuse it, and `raised` -> `fill` runs from callbacks outside those loops.
   - The HUD cache compares `i`, `a` and `sy` (`n` is fixed per run). The initial `-1/-1/-2` forces the first build.
4. **The quiet far door.**
   - `lockDoor(far, false)` runs first, then `Doors.setOpen(far, true)`: `target = 1`, uncracked, the body removed.
     No `onSound` and no `playerOpened`.
   - Players pass. The client mirrors open doors from `target === 1` (`coopHost.doors()`) and the locks from the
     anchors, as before.
5. **Broken by the fix: nothing found.**
   - `CtDevices.repair` now zeroes every meter of the section's cameras, then repairs only the destroyed ones. Only
     `SectorMode.restartSection` calls it.
   - The `Map.values()` iterator there runs once per restart, not per tick.

## POLISH
1. **The new e2e scenario holds `g.security` only, not the CT cameras** (`scripts/e2e-sectorops.mjs:205`).
   - `CtDevices` (`window.__ctdev`) keeps running.
   - If a section 2 camera reached full on the player during the up-to-40 s wait, the stage would rise twice, and
     `d.stage === st0 + 1` would fail. The risk is low, because the player waits inside C2, out of `cam-rack-sw`'s cone.
   - Done looks like: stub `window.__ctdev.fixedUpdate` as well, or assert `d.stage >= st0 + 1` (the
     `alarmRaised` assert already proves the panel run).
2. **The fix-round e2e has not been run by the implementer** (step3-report "No e2e run"). The remote runner's
   e2e-sectorops result on c1f93ed7 is the proof for items 1 and 2. If the new scenario fails there, treat it as this
   item, not a new design question.
