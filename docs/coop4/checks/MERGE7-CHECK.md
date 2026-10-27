# coop4 check: merge 6 fix round (6adf988e5) + merge 7 (33bc8459f, origin/master 4.116.0 = 1b58989ed)

**PASS**

Checker: fresh Opus. Head 872020570 (merges 33bc8459f onto 6adf988e5; `git diff 24b75b79 33bc8459f` equals
`git diff 6adf988e5 872020570`, so neither side was changed by that merge).

## A. Fix round 6adf988e5 (MERGE6 F1, F2)

### F1 - fixed
- `src/game/gameState.ts:1899` `fillChars`: slot 0 is always `localSampleInto(0)`; slots 1.. take `refs[i]` in slot
  order skipping `localRef`, and `charRefAt[slot] = i`; slots `nr..3` reset to -1. `updateLight` (`:1834`) writes slot
  s >= 1 to `charRefs[charRefAt[s]]` only when >= 0.
- Out host (`outIds` has 'local', host down): `playerRefsInto` = [A, B, C] -> slots 1/2/3 = A/B/C, `charRefAt` 0/1/2:
  every partner gets a capsule and a light. 4-player host up: [local, A, B, C] -> slots 1-3 = A/B/C, `charRefAt` 1/2/3.
- Client: `playerRefsInto` = [localRef] (no remotes, `outIds` host-only) -> nr 1, `charRefAt[1..3]` -1; the
  `charMatesInto` slots past nr write no light (as S2c meant). Host: `NO_MATES`, n = nr.
- Allocation: indexed loop, a kept `Int8Array(FILL.players)`; nothing per step. `charRefs` is only written by
  `fillChars` and read by `updateLight` in the same step (`:2308`-`:2309`).

### F2 - fixed
- `src/net/charMates.ts` `mateOrderInto(..., isOut = NEVER_OUT)`: a module-level default, so the 1-2 player and solo
  paths are unchanged.
- `src/net/coopClient.ts:464` `partnerOut` = `slotOut(outMask, s.slotOf(id))`: one closure made once. The host's
  mask is `outMask(outs.values())` of the slots `SectorMode.onPlayerOut` stored (`sectorMode.ts:1497`, `:1547`), the
  same partners `playerRefsInto` drops (`isOutRef`: in `outIds` and not alive). An unknown slot (-1) is never out.
- `onSector` (`:1053`-`:1060`): `outMask` is set before `relistMates()`, which runs only on a mask change; flag off
  it returns at once (`!this.g.charOccluders`). The iterator in `mateOrderInto` runs only then (not hot).

### Tests
- `tests/charMates.test.ts`: F2 behavioural (out partner skipped, back when cleared, default) plus the source pins;
  F1 source-level only (see Polish 1).

## B. Merge 7 (Saltmarsh Park v2 re-lay)

### Base lists
- `git diff 1b58989ed 33bc8459f -- src/world/maps/campusV2/`: s2-s5Data only append the two extras after master's
  last row and edit the doc comments; master's base rows, cameras, routes and sectors are verbatim. s1Data shows
  coop4's own S1 extras (master did not touch s1Data since the merge base a2c778c43).
- Graph JSON: only `guards` keys "3" / "4" raised in the extras' spaces (S2 foyer 4/4/5/5, landing 1/1/1/2; S3 hall
  6/6/7/7, dock 4/4/4/5; S4 hall 7/7/8/8, s4-ups 0/0/0/1; S5 arch 1/1/2/2, s5-plant 0/0/0/1) plus note text.

### The extras (all on nav on their floor, every leg pathed, >= 7 m from the start: the nav tests take every guard)
| Section | Row | Verdict |
| --- | --- | --- |
| S2 tag 3 | #2's round reversed, ground | As master's TAG-2 row (`campus-greybox/briefs/S2.md:532`) verbatim. |
| S2 tag 4 | (2.8, 4.4, -13.0) post, role `backup` | As TAG-2 row `:533` verbatim; 3.1 m off the north door, 2.9 m from K2, L1. |
| S3 tag 3 | #6 / #7 chamber loop from (37, -23) | Same direction as #6 / #7 (A-B-C-D wrap), #6's per-corner stops rotated: spacing holds. |
| S3 tag 4 | dock north strip (14.5, -3.5) <-> (20.5, -2.5) | Separate from #10's line (1 m off his cage stop), spot behind him, A99 passes with him. |
| S4 tag 3 | static at (25.5, 40.8) facing W | Outside #22's cage round (3 m E of its NE corner), faces pg-cage 7.5 m down the wall. |
| S4 tag 4 | #12's 8-point round from index 4 | Same round half a cycle out: they swap ends, each clear of the other's spot; they pass in the colonnade (`ai/separation.ts`). |
| S5 tag 3 | (-45, 4.2, 39.5) <-> (-39.5, 4.2, 33.0) | L1 archive; off #18's aisle line; faces pg-arch (-41.5, 39.6) then the cage; 29.2 s by nav. |
| S5 tag 4 | #21's line reversed, 2 s stops | Unchanged idea; 44.4 s by nav path. |

- Spawned counts 1/2/3/4: S2 18/18/19/20, S3 20/20/21/22, S4 25/25/26/27, S5 26/26/27/28: every list <= 32.

### The 11 edited master v2 tests
- Guards (S2-S5): the table / kind / slot checks run on the base filter (`minPlayers === undefined`), and
  `ALL.slice(0, n)` equal to the base pins the extras to the end; the old "no minPlayers row" asserts became that plus
  a block on the extras. Nav checks now take every guard (stronger). M8 isolation on the base list, as
  `tests/sectors.test.ts`. Screen (A99) on the 4-player list (stronger). Graph: key k = team-of-k count; S4 / S5 still
  pin master's base per-space map. Nothing master meant for the base list is weakened.

## Runs
- `npm run typecheck:fast`: clean.
- Single `npx vitest run tests/<file>`: charMates 14, sectorTeamScale 27, sectorGuardTags 55, sectors 28, campusS2 40,
  campusS3 32, campusS4 41, campusS5 29, campusV2 9, campusV2S2Graph 7, S2Guards 9, S2Routes 11, S3Graph 5,
  S3Guards 17 (merged-lane block ran, not skipped), S3Coop 22, S4 19, S4Graph 6, S4Guards 12, S4Screen 1, S4Coop 30,
  S5 11, S5Graph 6, S5Guards 14, S5Screen 1, S5Coop 21: all passed.

## Polish
1. F1's test is a source string pin; MERGE6's behavioural stub (local out and down, three remotes, each gets a slot
   and a light) would guard the indexing itself.
2. Full alarm at 4 players: S4 27 + 3 x 2 = 33 and S5 28 + 6 = 34 (S5 at 3 players 33) pass 32; the last 1-2 base
   reinforcements wait in `pending` for room (`sectorMode.ts:996`, A9's cap), as designed. The S4 / S5 v2 extras
   blocks assert only `ALL.length <= maxAlive`; a line recording the wait would make it explicit.
3. MERGE7-NOTES cites "job BRIEF A14's totals"; A14 is spawns (the extras are A8).
4. S2 tag 4's role moved `post` (ROLE_FIXED) -> `backup` (no class) with TAG-2's row: he is now neither first nor last
   to a light check. Matches master's brief; noted only.
5. S3 tag 4 spawns facing the desk (yaw 1.406) but his first stop faces the cage (-PI/2): one turn on his first wait.
6. S4 tag 3 faces #22's north leg; #22's takedown spot (22.5, 40.8) is 3 m in front of him at 3+ players (base-only
   M8, by design; fits his reason).
