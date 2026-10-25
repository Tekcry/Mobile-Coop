# Slice 2 - checker report (fresh checker, 2026-10-19)

Commit checked: 2079cb14 (slice 2 = steps 1-3; the master merge e20c3f30 ignored). Light checks only (another job holds
the desktop heavy.lock); the remote runner's `npm run check` and e2e results are the job lead's.

**Verdict: FAIL, 1 blocking item.** Everything else is POLISH.

## Checks run
- `npx tsc --noEmit`: clean. ESLint on the 15 changed source files: clean.
- `npx vitest run` sectors, sectorStep3, sectorRecord, net, moveState, enemyManagerDespawn, reviveClock: 126 passed.
- Scratch Vitest, plain Warehouse: master's `warehouse.ts` and HEAD's `buildWarehouse(b, {})` produce identical boxes,
  cylinders, anchors, lights, surfaces, the layout and every MapDef field.
- Scratch Vitest, M8 check (is it vacuous?): `warehouseOps` has 376 boxes (169 collide, no NaN) and 14 cylinders. A
  line through the z -6 wall away from the door is blocked, and an open yard line is clear. 12 of 31 posts are seen by
  another guard. Takedown spots moved 3 m off are seen 25/50, 26/34 and 36/53 times per section. Routes are `[x, z]`
  pairs (the `SquadSlot.route` type), and the deck guards use y 2.6.
  The check is real: it traces eye height to every other guard's post and route (sampled every 1 m) within 15 m,
  through the collide boxes. It is conservative, because doors, windows, fences and pitched pieces count as open.
- Hard rules hold:
  - no static `src/net` import outside `src/net`
  - Babylon only through `core/babylon`
  - no `Math.hypot` in `src`
  - gameplay reads no graphics state
  - protocol 24 is asserted in `net.test.ts` and `moveState.test.ts`, and parse clamps are tested
- Hot paths: the minor allocations are in item 3.

## Flow review (read, not run)
- **Solo run, start to finish:**
  - Download, then the C2 cycle: the near door locks only once the doorway is clear. The unload resets the takedown,
    releases client holds, clears pending reinforcements, removes guards, bodies and drones (`despawnAll`), and turns
    the devices off.
  - Then the load, the far and seal doors unlock, and so on to the extraction.
  - `markCompleted(map.id, difficulty, t)` is written, and the op list reads it. All correct.
- **Solo death:**
  - The restart puts the alarm back to its stage at the section's start.
  - The objective is removed and added again (no duplicate). The download resets.
  - Cameras are repaired. The near door locks again (open case).
  - A restart during a cycle finishes the cycle first and restarts the next section: correct.
  - Pending guards and reinforcements are cleared. Guards spawn again 7 m out of the player's face.
- **Co-op:**
  - Syringes are set per difficulty, and the count is kept across checkpoints.
  - A player out restarts the section (`onPlayerOut`), and a partner still up is brought back.
  - `releaseHolds` runs before `despawnAll`.
  - The client mirrors the live section, the door locks and the shot cameras.
  - A20 is in `exitStep`. All consistent.
- **Per-match state:** `maxAlive` is restored on dispose, and the EnemyManager and doors are rebuilt per match.
  `?sectorGuards` parses 0-99.

## Fix list (ranked by impact)

### 1. BLOCKING - guard alarms run to panels in other (unloaded, locked-off) sections, and latch once per run
- Where:
  - `src/ai/enemyManager.ts:280-303` (`assignAlarm`: `nearestPanel` by straight-line distance, `ALARM.range` 30 m,
    through walls)
  - `src/ai/enemyManager.ts:241-246` (`alarmRaised` set once per match, never cleared)
  - `src/world/maps/warehouse.ts:445-448`: 2 panels. The dock panel (-4.15, -8.2) is in section 1 and the floor panel
    (-3.85, 6) in section 3. Section 2 has none.
  - `src/game/modes/sectorMode.ts:152-170, 362-384` (`loadSection` / `unloadSection` / `restartSection` never touch
    panels or `alarmRaised`)
- **Failure 1, section 2:**
  - A guard is spotted and alerted. Every racking guard is within 30 m of one of the two panels, so it becomes the alarm
    runner.
  - Its nav path runs through C2 or C3, because nav ignores doors.
  - It stops at a locked connector door: `Doors.open` refuses a locked door, and `pushOpen` is the guards' only way
    through.
  - It never raises the alarm. It leaves the fight and stands in C2, the section 2 checkpoint room, or at the C3 door.
- **Failure 2, section 3:** the stores-cage officer (1.5, -7.5) picks the dock panel. It is 5.7 m away through the
  wall, against 14 m to the floor panel, and an officer's distance counts x0.25. The same stall follows.
- **Failure 3, after the first panel alarm anywhere:** no guard can raise the alarm again for the whole run, even after
  a section restart, and the panel indicator stays red.
  - So A3's "a guard's alarm raises the stage" works at most once, in section 1 or 3.
  - Stages 2-3 come only from cameras.
  - A restart is not a clean retry of the alarm.
- The e2e alarm check calls `__sector.onAlarm()` directly, so no test catches this.
- **Done looks like:**
  - While section i is live, only panels inside section i are candidates. Tag each panel with a section in the
    `warehouseOps` layout, or keep a per-section list in `warehouseSectors.ts`. Mark the others `disabled` in
    `loadSection`, and restore them on load.
  - `em.alarmRaised = false` and the panel indicators reset on every section load and on `restartSection`.
  - Section 2 either gets a panel of its own, or is logged as cameras-only (an A-decision).
  - Test: in e2e-sectorops, the AI is live in section 2 or 3. One guard is forced alerted. Assert the alarm runner's
    panel lies in the live section (or there is no runner), then a real panel run raises the stage. A Vitest data check
    asserts every panel sits inside its section's area.

### 2. POLISH - e2e-sectorops claims a few things it never sets up
In `scripts/e2e-sectorops.mjs`:
- Line 95, `cyc.b === 0`: the walk stubs the AI and makes no body or knock-out, so the "bodies unloaded" half is vacuous
  (Vitest covers `despawn` only on stand-in guards). Knocking out one guard before C2 would prove it.
- Line 56 / 100: `seal.every(...)` passes on an empty list. Assert `seal.length > 0`.
- Line 346: `lk1` is not asserted to differ from `lk0`.
- No e2e for a restart during a cycle, the co-op out restart, or `releaseHolds` (already listed as untested in step 3).

### 3. POLISH - small per-tick allocations
In `src/game/modes/sectorMode.ts`:
- Lines 424 and 432: `g.playerRefs()` builds a new spread array every fixed tick in the download, connector and
  extract phases.
- Line 289: a `for...of` every 0.5 s.
- Line 441: a template-string key every render frame.

The existing code has the same pattern (`ctDevices.fixedUpdate`), so this is not new. Done: a reused refs array, and a
numeric change check before building the string.

### 4. POLISH - the far door opens "quiet" as a player-opened door
- Where: `sectorMode.ts:272`, which reaches `stealthSystems.ts:107-127`.
- `open(d.far, 'quiet')` makes a 2 m noise and adds the door to `playerOpened`.
- A calm guard of the new section facing it within 9 m (`DOOR_NOTICE_RANGE`) turns suspicious and comes to look, just
  as the players step out.
- Done: open it with `Doors.setOpen(d.far, true)` (no sound hook), or leave it shut and unlocked.

### 5. POLISH - a restart resets guards and devices only
- Not reset: panels the player disabled, doors left open, light switches and shot lamps, and live camera meters that
  latched `full`.
- Only destroyed cameras are reset (`CameraUnit.repair`).
- This does not break play. Note it for the next pass.

### 6. POLISH - docs
- `CHANGELOG.md:6-12` still describes the first cut ("four sectors", "3 lives", protocol 23) above the slice 2 entries.
- `scripts/run-e2e.mjs` `COVERS`: `src/net/` does not list e2e-sectorops, which now holds the co-op mirror check.
