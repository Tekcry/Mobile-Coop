# coop4 check: merge 8 (047c1ddf1, origin/master 4.117.x train 133 = f1cddbc2d)

**PASS**

Checker: fresh Opus. Head 047c1ddf1 (parents 412c4435e coop4, f1cddbc2d master; merge base 1b58989ed). Scope: the
merge commit only.

## A. Conflicts the lead resolved

### protocol.ts
- `PROTOCOL_VERSION = 72` (master's); coop4's `MAX_PLAYERS` comment, `SECTOR_MAX`, `capacity`, `slot`, `wireNum` /
  `snap*`, the per-slot jammer lists, `ot` and `bye.mode` all kept (`git diff f1cddbc2d 047c1ddf1 -- src/net/protocol.ts`
  is exactly coop4's own delta).

### S1 v2 guard list (`src/world/maps/campusV2/s1Data.ts:84-153`)
- `git diff f1cddbc2d 047c1ddf1 -- src/world/maps/campusV2/s1Data.ts`: only the two appended rows and their comments;
  master's 15 base rows, cameras, desks, alarms, sector, lights verbatim.
- Both rows equal `docs/campus-greybox/briefs/S1.md` "TAG-1" field for field, reasons verbatim:
  - index 15 (`:151`): grunt (-37, -56) yaw PI, route (-37, -56) <-> (-37, -74), waits [4, 4], faces [PI, 0], spot
    (-37, -74), patrol / perimeter / squad 3, `minPlayers: 3`.
  - index 16 (`:153`): officer (-18.6, -35.2) yaw PI, no route, spot (-18.6, -34.7), backup / c1 / squad 2,
    `minPlayers: 4`.
- TAG-1's checks, run in a scratch copy of `tests/campusV2S1.test.ts` with the flag on (deleted, not committed):
  - spawned at 1 / 2 / 3 / 4 players (`guardForTeam`): 15 / 15 / 16 / 17; team 3 = base + index 15; every list + the
    alarm stages <= `SECTOR.maxAlive`.
  - `checkSectorGuards`, `validatePosts`, `validateGuardAi` on all 17: [].
  - no `post` / `pair` / `handler` / `dormant`, not a desk operator (`roleFlags & ROLE_DESK` 0), reasons > 30 chars.
  - from the start (24, -79): 65.2 m and 61.1 m. Route starts at the slot.
  - nav (the test's `analyticNav`): both slots, every route point and both spots walkable; tag 3's leg has a path; both
    spots within `CHECK_SPOT`.
  - cycle: tag 3 44.36 s (brief 44.4, inside 25-45); tag 4 a post (null).
  - K1 choke: the existing #5 cone test passes; tag 4 stands 1.41 m east of #5 and 1.84 m from `c1Near`, so the cone
    union only grows.
  - screen cap: `campusV2S1Screen.test.ts` cap test is `it.fails` (R1 open), not a plain `it`; with 17 the worst point
    (-12.25, 0, -70.25) sees all 17 (it saw all 15 before), so the `fails` still holds. The count test now pins 17.
- Graph (`docs/sector-redesign/graph/v2/campusOps-S1.json`): only `s1-carpark` "3"/"4" 3 -> 4 and `s1-forecourt` "4"
  3 -> 4; sums 15 / 15 / 16 / 17. Both rows sit in those spaces' areas.

### Master's S1 tests, adapted
- `tests/campusV2S1.test.ts:42`: `G` = the base list (`minPlayers === undefined`), so `guard(n)`, kinds, guns, cycles,
  posts, pairs, operator and the M8 isolation (`:903-907`) are master's checks on master's 15. The 21-total stays exact
  on the base; the full 17 must be within `maxAlive` (`:854-855`). Nothing master meant for the base list is weakened.
- `tests/campusV2S1Screen.test.ts:131-133`: the count over all 17 (stronger).
- `tests/campusV2S1Sync.test.ts:85-99`: per-key graph sums 15 / 15 / 16 / 17 and the spawned count per key; key "1"
  = "2" everywhere, the car park +1 at 3 / 4, the forecourt +1 at 4, every other space flat. Tight.
- Gap (Polish 2): the v2 suite no longer runs its per-guard data loop on the extras, and nothing in it checks their nav.

## B. Auto-merged hunks in coop4-touched files
- `src/game/gameState.ts:2341` `this.team.end(true)` on a respawn, `src/net/coopClient.ts:990` the same on `revive`:
  once per event, per local player; no slot or player-count assumption.
- `src/net/coopHost.ts:523` `joinSpawns?.() ?? checkpointSpawns?.()`: only `CourseMode` has `joinSpawns`; Sector Ops
  falls back to its checkpoint marks as before, `others` (every slot) unchanged.
- `src/net/coopUi.ts:613` `lobbyStartBay`: course lobby only.
- `src/game/ctDevices.ts:574` `resetScans`: host, on a station retry, not per tick; indexed loop.
- `src/game/jammer.ts` (master only) `pickJamTarget`'s camera pass: indexed, no allocation.
- `src/core/flags.ts` `missions`, `coopKit` (dark); `src/game/mission/*` is not imported anywhere yet.
- `src/world/maps/campusS1Data.ts` (v1) objective z -77.3: coop4's v1 S1 extras untouched; `tests/campusS1.test.ts`
  (master's L1 column / objective hunks next to coop4's `ALL` nav loop) green.
- `scripts/e2e-sectorops.mjs`, `scripts/run-e2e.mjs`, `docs/systems/testing-tools.md`, `tests/campusS2.test.ts`:
  master's lamp / PC / column-count edits; coop4's parts `:10`-`:12` and LOAD_MS_4 lines kept.
- Per frame: nothing new allocates in a step.

## Runs
- `npm run typecheck:fast`: clean.
- Single `npx vitest run tests/<file>` (lead, after the cut-off): campusV2S1, campusV2S1Screen, campusV2S1Sync,
  campusV2S1Graph, campusS1, campusS2, sectorTeamScale, sectorGuardTags, sectors, charMates, protocolConst: 11 files,
  279 passed + 1 expected fail (the screen cap `it.fails`).

## Polish
1. Tag 3's takedown spot (-37, -74) is not dark: the south-row column at (-36, -73.5) (`s1Data.ts:37`, master's L1
   port in this train) puts a head ~0.5 m away; the analytic level there is 1.56 (shadow 0.28; his slot 0.40). The
   brief's "(dark SW corner)" and the data comment (`s1Data.ts:150`) predate it. A 3+ team still has the park-W
   breaker and the lamp itself. Fix, if wanted: the brief owner picks a darker spot on his line (TAG-1 lets the
   builder move only 0.5 m), or the comment drops "dark".
2. Add TAG-1's own block (it planned `tests/campusV2S1Tags.test.ts`) to the v2 suite: the checks in A, run on index
   15 / 16 (they all pass today). Smallest form: `tests/campusV2S1.test.ts:856` loop over `S1.guards` instead of `G`,
   plus `guardChecks`-style nav / cycle lines for the two rows.
3. At 3+ players #7's spot (-38, -62.5) is never isolated (5.75 s on the base list, 0 s with all 17): tag 3 walks
   1 m beside #7's line for z -64..-56. Tag 3's own spot holds 7.25 s. M8 is base-only by design (as MERGE7 Polish 6);
   noted only.
4. The graph notes (`campusOps-S1.json` `s1-carpark`, `s1-forecourt`) still list only the base guards; one clause each
   naming the TAG-1 rows would match the keys.
5. The screen print numbers the extras #17 / #18 (`numberOf`), as the data comments do; fine, noted for readers.
