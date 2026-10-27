# coop4 merge 4 check - a98b041d9 (origin/master 4.114.0 ee1abab6b into 909aa040c)

Checker: fresh Opus merge checker, read-only. origin/master = ee1abab6b (the merged commit is master's tip).

## Verdict: PASS

## What was verified (against the code, not MERGE4.md)
1. `src/net/protocol.ts`: `PROTOCOL_VERSION = 69` (master's; the train bumps it for coop4's wire changes, as
   `changes/feature-coop4.md` says). `capacity()` = course `COURSE_MAX` 2, sector `SECTOR_MAX` 4, legacy `COOP_MAX` 4.
   Master's re-planned yard is map `ctcourseReplan` with `modes: ['course']` only (`ctcourse.ts`), reached only through
   `roomMap` / `resumeMap` / `lobbyMaps('course')`, so it always runs in mode `course`: capacity 2. The lobby's mode
   change picks a map valid for the new mode, so no sector room sits on the yard. Master's callers: `coopUi` (Room full
   text, directory notice, lobby slots, start block) now read `capacity(session.mode)` / `session.cap` (= capacity when
   `roomCap` is 0), same value for the course; `tests/sectorItemScope.test.ts` uses `COURSE_MAX` (still 2, passes);
   master's course wire (`pstats` pair, `jamId[0] / [1]` in `courseMode`) still holds for 2 players (`jamId` is now
   PLAYER_SLOTS long, indices 0-1 unchanged).
2. `src/net/session.ts`: both imports used. `roomMap` / `resumeMap` / `map = roomMap('ctcourse')` / `setSettings`
   (master) and `SlotTable`, `cap`, the A18 probe, `bySlot`, `compact` at `startMatch` (coop4) touch different state;
   the join refusal and `soleHeld` read `this.cap`, which is 2 for the course, so a 3rd/4th player on the re-planned
   yard is refused ("Room is full", `mode: 'course'`). Resume: `mode` + `resumeMap(map)` then `startMatch` (slots
   compact to the host alone); a joiner takes the lowest free slot. No conflict markers in any changed file.
3. e2e scripts: `git diff ee1abab6b a98b041d9 -- scripts/e2e-sectorops.mjs` removes only 3 lines (the import line,
   the header line extended, the `guards` helper line, which is the same as at 909aa040c), then appends `want(10)`,
   `want(11)`, `want(12)`, all coop4 blocks (`coop4(...)` harness, 4 / 3 / 3 pages). Master's `want(6..9)` blocks
   untouched. No stale "part 7/8/9" reference in the coop4 section, `docs/systems/coop.md`, `e2e-net-lib.mjs`,
   STATE or the changes file. `PARTS.e2e-sectorops` = 1-9; `PART_TIMEOUT` keys `:10/:11/:12` (1800 s), master's 7-9
   keep 600 s. `--list`, `--quick --list`, `--affected origin/master --list` (cap 3: e2e-coop, e2e-netmove, ctcourse
   1-8), `--affected ... --wide --list`, `e2e-sectorops --list`: never :10-:12; `e2e-sectorops:10 e2e-sectorops:12
   --list` lists exactly those. `scripts/e2e-affected.mjs` names only parts 1 and 6-9.
4. Semantic clashes: the files both sides changed since the last merge base (78c241933) are protocol, session,
   coopUi, coopClient, gameState, flags, the campus data, run-e2e, e2e-sectorops, TESTING, testing-tools,
   sectors.test. Master's `drawsExitBeacon` is kept in `gameState` and `coopClient`'s `Interactables`; master's campus
   data changes are objective labels only (coop4's tagged guards stay appended). Master's seeded think cadence /
   radio jitter, armed runner and preview flags touch `src/ai` / `flags` code coop4 does not change in this diff;
   coop4's tagged guards are grunts / officers. Master's `courseMode` reads `g.remotePlayers()[0]` and
   `playerRefsInto(...).length`; coop4's slot sort and OUT filter (`outIds`, written only by `SectorMode`) leave a
   2-player course list unchanged. Optional-param interface changes (`onPlayerOut(id?)`, `onRemoteJam(..., slot?)`)
   stay compatible with `courseMode`. No new hot-path code came in with the merge.
5. `npm run typecheck:fast`: clean. vitest: the 21 files coop4 touches (2 batches) 571 / 571; 30 more files on the
   merge seams (aiSeeded, runnerArmed, courseStation, courseRuleFixes, e2eAffected, jammer, jammerFixes,
   protocolConst, rejoin, ratingRejoin, ratingWire, sectorItemScope, playerSlots, coopGuardAi, guardAiAlloc,
   marlowN4Hold, laserPanels, crateWire, sectorLampSync, twoIntruders, laptop-queue, securityCamera, squadRoles,
   coopWalkFixes, courseLampWire, marlowClientSwitch, sectorSlice0, sectorStep3, coopCarry, medkit) 584 / 584.

## Polish (not blocking)
1. `NetSession.roomCap` is never set anywhere (`cap` always equals `capacity(mode)`); its comment describes a cap
   nothing applies. Remove it or wire it.
2. `autoLocalCourse` waits for `flags.players ?? 2`: `?players=3` or `4` on a course autostart never starts (cap 2).
   Dev / test only.
3. `scripts/e2e-sectorops.mjs` run directly with no `--part` (PART 0) also runs the 3-4 page parts 10-12 ("Named
   alone the suite runs every part in sequence"); the runner always passes `--part`, so only a direct run is hit.
   Pre-existing (was 7-9 before).
