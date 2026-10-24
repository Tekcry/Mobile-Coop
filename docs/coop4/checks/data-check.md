# coop4 DATA check (Sonnet checker, d7f934bc)

Scope: the 16 `minPlayers` guard tags (campus S1-S5, warehouse service / racking / floor). Read-only; run in a temporary detached worktree (removed).

## Verdict: FIX (one small must-fix: racking default squads change for a 2-player team; the data is otherwise sound, no test loosened)

## Must-fix

1. **Warehouse racking: the base guards' default squads change at team 1-2.** The racking tags (`src/world/maps/warehouseSectors.ts:128` stocktaker #9, `:130` picker #10) have no `squad`. `sectorMode.fill` passes the FULL `s.guards` (tags included, spawned or not) to `placeSlot` -> `slotSquads` -> `defaultSquads` (single-linkage within 12 m over every slot without a hand-set `squad`). Measured with `defaultSquads` on the base list vs the full list:
   - racking base: clusters `[0,1,0,1,1,0,2,1]` (3 squads, master); with the two tags: `[0,0,0,0,0,0,0,0,0,0]` (ONE squad of 8). The unspawned tags bridge the clusters.
   - service and floor: partition identical (SAME). All five campus sections hand-set every squad (-1), unaffected.
   So a 2-player racking run differs from master (radio-check misses, who is sent to look for a missing guard) while A8 / PLAN say a team of 2 plays master's list.
   **Fix:** give both racking tags a hand-set squad (hand-set slots are excluded from clustering and sit below `DEFAULT_SQUAD_BASE` 50): `warehouseSectors.ts:128` and `:130` add `squad: 0,`. Then add to `tests/sectorGuardTags.test.ts` (per section): `defaultSquads(full)` restricted to the base indices equals `defaultSquads(base)` (guards the same trap for service / floor too). Recheck: racking full -> `[0,1,0,1,1,0,2,1,-1,-1]`.

## What passed

- **Tag table:** 2 per section in all 8 (S1 10 / S2 14 / S3 18 / S4 22 / S5 26, warehouse 10 / 10 / 11), minPlayers 3 and 4 one each, every tag has a reason (> 30 chars, names the team door or split route it answers). The reasons are sound.
- **Not tagged:** no desk operator (S4 operator #5 untouched), dog, handler, pair partner, posted (`post`), dormant or enforcer (test + read). Tag roles are 'post' (no `post` block), patrol, sentry or checker.
- **Appended:** `git diff origin/master HEAD` on the 4 data files = 40 insertions, 0 deletions (against the master tip, not only the merge-base), so the base list is byte-identical to master's and the FNV hash in the test is master's. Tags follow the base and the 3-tag precedes the 4-tag in every section, so a team of 3 keeps stable indices (`loadSection` keeps `k`, `slotEnemy[k]`).
- **Team 1-2 = master's list:** `guardForTeam` filter; the test asserts count + hash of the base and `spawned(1|2)` equals the base. Caveats: the squad finding above, and `sweepSource` (polish).
- **Nav / route / spot:** every tag slot, route point and takedown spot is on the nav grid (campusS1-S5 now run these on ALL); tag routes are the base guard's own route points (rotated or reversed), so each leg is the same walkable leg; S2 / S3 / S5 also `findPath` each leg on ALL. S5 #25 runs the same cycle direction as #18, half a loop apart. Light: `campusArtLight` (takedown spot of every guard) and `warehouseS1/2/3Light` pass; the two spot fixes in data-build.md (S4 #21, racking #9) are right.
- **Screen count / cap at team 4:** the A99 sight tests use the full list (S2 `S2.guards` 14, S3 / S4 / S5 `ALL`, with the shut-door leaves in S4 / S5, 32 facings): all pass at <= 12. S1 only asserts count 10 <= cap 12. Live cap: S1 10+6, S2 14+6, S3 18+6, S4 22+6, S5 26+6 = 32 = `SECTOR.maxAlive`, warehouse <= 11+6. `sectorGuardTags` asserts `guards.length + alarmMax x perStage <= maxAlive` per section.
- **Tests run** (`--maxWorkers=2`, slot lock, CPU < 90%): sectorGuardTags, campusS1-S5, campusPosts, campusGear, campusRuntimeNav, sectors, warehouseCoopS1/S2/S3, guardAiData, postsWiring, sectorTeamScale, warehouseS1/S2/S3Light = 19 files, 428 passed, 3 skipped, 0 failed. Extra: campusArtLight, campusDressRules, sectorDesk, responseWiring = 4 files, 76 passed.

## Edited existing tests: none loosened

"Base" = `minPlayers === undefined` = master's list.
- campusS1-S5 `G = base`: kind / gun / squad / pair / posted / handler / dormant lists, `G.length` (8 / 12 / 16 / 20 / 24), loop and facing pins, the M8 isolation + phase-drift rows (S1, S2 `base`; S3-S5 `G`), the desk operator `G[...]`: the same assertions as master on the same list. Same strength.
- `G -> ALL` (slot >= 7 m, on the nav grid, takedown spot on the grid, route start = slot, S2 / S3 / S5 leg paths, A99 screen counts with `awake = ALL`, `ALL.length + alarmMax x perStage <= maxAlive`, S5 `routePasses` for the shut-door leaves): STRICTER than master (they cover the tags too).
- sectors.test.ts: counts `filter(base).length` 8 / 8 / 9 (same as master); M8 isolation and the 30-phase drift run on `bs` (base) with `spotSeenBy` against `bs`: same as master for the untagged list. Tags get distance <= CHECK_SPOT and blocked checks only, not isolation, because a tag walks beside its base twin by design. This is the one place tags are checked less than base guards (see polish).
- No `expect` removed, no tolerance widened, no `skip` added.

## S5 live cap consequence (no alarm headroom at 4 players, all live)

S5 at team 4 = 26 guards + 3 stages x perStage 2 = exactly 32. `capReinforce(send, base, headroom)` always sends the base 2 per stage (pending until there is room) and the +2 extras only within `maxAlive - alive - pending`: stage 1 = 4 (headroom 6), stage 2 = 2 (headroom 2), stage 3 = 2 pending until a guard is down. So at 4 players S5 gets +2 at stage 1 and nothing extra after; the two tags cost the two later extras. Acceptable: stage-3 reinforcements still queue and arrive as soon as any guard is lost or KOd (any loud run), and the two extra guards are standing in the section from the start (they ARE the 3-4 player scale in S5). Keep both S5 tags. If the playtest shows a stealthy 4-player S5 never gets stage-3 help, drop #25 (the 3-tag, `campusS5Data.ts:77`) or give S5 a smaller `perStage`; not needed now.

## Polish (not blocking)

- `sectorMode.sweepSource` (:1017) iterates all `s.guards`, so a 1-2 player alarm sweep source also lists the unspawned tags' routes and posts (duplicates of base routes). Filter with `guardForTeam(q, this.run.teamSize)` (SM-owned file; changes the random sweep weighting slightly at team 2).
- S2 #14 (`campusSectors.ts:147`): (1, -11.2) is 0.8 m outside the lobby's N doorway (wall z -12, door x 0.4..1.6), on the door's centreline, facing -z into the lobby, takedown spot (1, -10.8) behind him. Walkable and sane, but he half-blocks that doorway; look at it in the 4-tab playtest (shift x to 2.0 or 0.0 if it plugs the door).
- S5 #26 start (-29, 23.5) is 6.3 m from the C4 far exit (-26, 29): the same end the base service round reaches, but at t = 0 a guard stands there. Note for the playtest (spawn-camp feel).
- Tag takedown spots on a shared route (S1 #9, S2 #13, S3 #17 / #18, S4 #22, S5 #25 / #26, warehouse patrols) are not isolation-checked; a guard and his twin meet mid-route. Two grunts passing in the 1.4 m warehouse office corridor share a lane: fine for the nav, cosmetic.
- Stale wording: `campusS1.test.ts:677` title says "S1 has 8 guards" (10 with tags, 8 base); the S2 log line says "all 12". The "every section tags at least one" count test ties DATA to >= 1 (the builder noted this as the undo cost).
- e2e part 7 can count the tags with `players=4` (2 per section); part 6 stays unchanged.
