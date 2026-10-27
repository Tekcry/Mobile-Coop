# coop4 merge 3: origin/master (4.112.1, train 120) into feature/coop4
Owner: Night Shift | Guard AI Build (Opus merge agent). Status: done.

Base: feature/coop4 ed34b4005 (last master merge 4.110.0); master 78c241933 (trains 118-120). Master work in the
conflicted files: guard-rules S5 / PR2 (#500, repeat alarms: `em.alarmRepeat`, `SectorRun.nextAlarmSends`,
`SectorMode.alarmQuiet`), campus-greybox A28 (`?sectorStart=N` practice start, `CoopHost.placeEarly`), mission-framework
NET3 (`CoopHost.firstPlace` / `offSection`), and the train version bumps (`PROTOCOL_VERSION` 67).

## Conflicts
| File | Resolution | Why |
| --- | --- | --- |
| `src/net/protocol.ts` | `PROTOCOL_VERSION = 67` (master's), coop4's `MAX_PLAYERS` comment (`PLAYER_SLOTS`, `capacity(mode)`) and its `slotFromList` import kept. | The train owns the number; no bump here. |
| `src/game/sectors.ts` | Both: master's `nextAlarmSends()` added. The merge first passed `this.teamSize`; merge check A FIX 1 restored master's body (the live team is `responseShape`, which sends nobody at `perStage` 0, so extras must not count). | Test: `tests/sectorTeamScale.test.ts` "nextAlarmSends ignores the coop4 extras". |
| `src/game/modes/sectorMode.ts` | Both: master's `if (em && s) { em.setSection(i); em.alarmRepeat = true; }` then coop4's `setResponseShape` line. | Independent lines in `loadSection`; order does not matter. |
| `src/net/coopHost.ts` | Both: imports `OutFollow` and `offSection`; coop4's `follow` / `followScan` / `followStep()` and master's `earlyPlaced` / `placeEarly()` both kept; `fixedUpdate` runs `followStep()` then `if (!earlyPlaced) placeEarly()`. | Unrelated features; neither reads the other's state. No allocation added. |
| `scripts/e2e-sectorops.mjs` | Import line is the union (coop4's 4-page helpers plus master's `LOAD_MS`). | Master's start-at-section legs use `LOAD_MS`; coop4's parts 7-8 use the rest. |

## Test fixed for the merge
- `tests/sectorStartCoop.test.ts` (master's, A28 fix 1): its stub host now has `g.outIds` (empty set) and
  `s.slotOf: () => 1`. Without them coop4's `followStep` (reads `g.outIds`) and slot-aware `joinSpot` (reads
  `s.slotOf`) threw in the stub. No assertion changed.

## Checks
- `npm run typecheck:fast`: clean.
- `npx eslint` on the five files and the test: clean (e2e-sectorops.mjs is in the ignore list).
- `npx vitest run`: 43 files, 773 tests, all pass (sectors, alarmRepeat, killScore, protocolConst, net, sectorStart,
  sectorStartCoop, sectorTeamScale, sectorOut, sectorRestart, sectorSolo, sectorGuardTags, sectorRecord, sectorSlice0,
  sectorStageActions, sectorBolt, sectorIsolator, sectorLampSync, sectorIntelCode, coopRejoin, rejoin, playerSlots,
  responseWiring, sectorPairGate, sectorStep3, sectorRatingHost, coopFix, coopGuardAi, sectorPerfect, sectorBoltPair,
  sectorIntelClient, sectorItemScope, ratingWire, crateWire, snapBudget, campusS1-S5, sectorObjectives, sectorDesk,
  sectorKeypad).
- `node --check scripts/e2e-sectorops.mjs`: ok. e2e not run here (laptop queue).

## For the merge checker
- `nextAlarmSends` (fixed after check A): back to master's 2-player count; a `perStage` 0 section stays quiet with
  3-4 players, as `responseShape` sends no one there.
- `?sectorStart=N` with 3-4 players: `placeEarly` / `firstPlace` place slot 2-3 remotes through coop4's slot-aware
  `joinSpot`; untested on 4 pages (worth a leg in part 7 later).
- e2e for the wire change: e2e-coop, e2e-netmove, e2e-ctcourse, e2e-sectorops (parts incl. 7-8).
