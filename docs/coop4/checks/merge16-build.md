# coop4 merge 16 (origin/master into feature/coop4): build notes
Owner: coop4 builder (Opus). Status: built, for the checker.

- Base: feature/coop4 `7b12a71ea`, origin/master `593b22c58` (194 commits), merge base `a7853bed4`.
- Merge commit `165fb0af1`; test fix `576256cfd`; this note after.
- PROTOCOL_VERSION: 79, master's number (auto-merged; coop4 had 78 = the old master value, no conflict).

## Conflict hunks

### 1. `scripts/e2e-coop.mjs` (header comment)
- coop4: added the `(coop4 AI6) Four pages: three intruders ...` line before the guard-models line.
- master: reworded the guard-models line ("with E2E_GUARDMODELS=1" -> "with the guard models on", gm-flip).
- Kept: coop4's AI6 line, then master's reworded line. Comment only; the code below auto-merged (coop4's extra
  e2e-net-lib imports and lobby-cap / four-page blocks, master's `GM` default-on switch).

### 2. `scripts/run-e2e.mjs` (`PARTS`)
- coop4: kept `e2e-sectorops` at 1-9 + mission and added the note that parts 10-12 (3-4 pages) are named only (never
  in a full, quick or affected expansion).
- master: added `wharf-tgc` / `wharf-tkl` (Tallow Wharf missions in co-op, own script via `PART_SCRIPT`) to the
  `e2e-sectorops` list, with its comment.
- Kept: master's comment and `PARTS` line (with the wharf parts), then coop4's named-only note. Parts 10-12 stay out of
  `PARTS`, as before. The wharf parts are 2-page runs (host + 1 client): no 4-player assumption to adapt.

### 3. `src/game/modes/sectorMode.ts` `loadSection` (guard queue)
- coop4 (A8): a slot guard spawns only when `guardForTeam(slot, this.run.teamSize)` (a `minPlayers` tag above the team
  keeps him out; his index stays his) and the mission spawns him.
- master (gm-look-seeds): collects every queued slot guard's look seed first and calls `em.beginLooks(looks)` before
  any spawn, so a reinforcement / team member never takes a slot guard's seed.
- Kept: master's loop and `beginLooks`, with coop4's `guardForTeam` test as a `continue` before the mission test. A
  guard left out for the team is treated like master's mission-held guard: not queued and no seed reserved (he never
  spawns this load). For a team of 1-2 (no tag above it) the list equals master's.

## 2-player / list-index reads in master's new code (checked)
- `EnemyManager` shadow-cue notice (guard-ai-j16 G3, `enemy.ts`): `P_RATE[i]` and `occKey(OCC_KIND.player, i)` are
  both the `players()` list index, filled in the same perceive pass; the cue slot is `cues.slotOf(p.id)` (by id);
  `CUE.players` is 4. Consistent, no slot read from a list place. Nothing adapted.
- `chimneyPair` (coop-kit K3, new kit move, `paired: true`): goes through merge 15's generic kit path. `teamMark` busy
  length = `kitPairS('chimneyPair')` = `SHUTTER_PAIR_S` (no `KIT_PAIR` row), the same value as `newKitPair`'s `until`.
  Nothing adapted (see risky spots).
- `coopHost` knife gate (knife-when-spotted): `!kOn` added to the spotted test; per client (`r`), no index.
- `e2e-sectorops-wharf.mjs`: two pages; every e2e-net-lib import it uses exists on coop4's lib.
- Tallow Wharf sectors: no `minPlayers` tags, so every guard spawns for any team size (master's list).

## Test fallout (commit `576256cfd`, no assertion changed)
- `tests/mission/sectorMission.test.ts` "SectorMode.loadSection queues only the mission's guards": master's stand-in
  had no `g.playerRefsInto` / `refs`, which coop4's `loadSection` reads (`teamSizeOf`). Added both (empty team list,
  the alarmRepeat.test.ts pattern).

## Commands and results
- `git merge --no-ff --no-commit origin/master`: 3 conflicts (above).
- `npm run typecheck:fast`: clean (before and after the test fix).
- `node --check scripts/e2e-coop.mjs`, `node --check scripts/run-e2e.mjs` (and `scripts/e2e-sectorops-wharf.mjs`): OK.
- `npx vitest run` on 181 files (every test naming src/net, playerSlots, teamMoves, sectorMode, knife, kit or piano,
  plus `tallowWharf/sectors` and `mission/sectorMission`): 180 passed, 1 failed (the stand-in above); after the fix
  `sectorMission.test.ts` 30/30. `tests/campusS1.test.ts` (coop4 map data): 52/52.
- Not run (by instruction): e2e, `npm run check`, dev server.

## Risky spots for the checker
1. `loadSection`: a tagged guard out for the team holds no seed, so runtime spawns may take the seed he would have had;
   seeds of the guards that do spawn are unchanged. Confirm that reading of master's intent.
2. `chimneyPair` busy length: a chimney climb (3-8 m at `CHIMNEY.climb` 0.35 m/s = 8.6-23 s, plus brace 1.0 s and top
   1.2 s) outlasts `SHUTTER_PAIR_S` (1.6 + 0.35 + 3 = 4.95 s; also master's own `newKitPair` `until`); after it a third player's request to either climber is no longer refused as busy by A20 (the kit's own
   state checks still apply). Same rule as merge 15 chose for any future paired part 2 move; not changed here.
3. `run-e2e.mjs`: the wharf parts are in full / affected expansions (master), parts 10-12 still named only.
