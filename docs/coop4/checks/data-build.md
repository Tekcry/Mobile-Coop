# coop4 DATA build - Sector Ops guard tags for 3-4 players

Branch `feature/coop4-data`, from `feature/coop4-sm` 92d406ae. Builder: Sonnet. Plan: PLAN.md section 4 "DATA"; BRIEF A8-A10.

## Built
Two guards per section (8 sections, 16 tags) carry `minPlayers` 3 or 4 (SM's `SquadSlot.minPlayers`, filtered in
`sectorMode.loadSection`). Every tag is appended after the base list, so the base indices (desks, handlers, pairs, posts,
`?sectorGuards=4`) do not move. Each tag copies an existing patrol round from the other end (same route points, same
direction, so nav and clocks are the base guard's own) or doubles a static post 1.2-2.8 m away. No tag is a desk operator
(S4 operator #5 is untagged), dog, handler, pair partner, posted (`post`), dormant or enforcer.

| Section | Tag (index) | Spot / post | minPlayers | Reason (short) |
| --- | --- | --- | --- | --- |
| campus S1 | #9 grunt | fence patrol #7 round from the bin store end, (-34,-50) <-> (-38,-66) | 3 | shadow route (feeder board, bin store): west half cut at once |
| campus S1 | #10 officer | doorman's colleague, (-18.6,-35), facing as #5 | 4 | C1 badge door (team door): one pair lures, the other works the lock |
| campus S2 | #13 grunt | lobby patrol #2 round from the lift lobby end, (-29,-8.5) <-> (-24,-24.8) | 3 | loud route (turnstiles, feature stair): foyer rushed from both ends |
| campus S2 | #14 grunt | bridge landing approach, (1,-11.2) L1, 2.8 m N of posted #11 | 4 | bridge landing (only way to the labs): a pair holds the officer |
| campus S3 | #17 grunt | hall patrol, fourth corner (37,-23), same loop as #6 / #7 | 3 | hall crossing (loud route, south strip of the stealth one) |
| campus S3 | #18 grunt | dock patrol #10 round from the cage end, (38.9,-4.6) <-> (25,-4.5) | 4 | dock is the exit leg of all three routes |
| campus S4 | #21 grunt | cage front gate, (16.8,33), 1.2 m W of keyholder #9 | 3 | cage pair gate (team door): rear gate worked while the keyholder is held |
| campus S4 | #22 grunt | battery checker #12 round from the battery end, (-7,20) <-> (-7,37) | 4 | stealth route (service corridor, battery room, kp-batt) cleared from both ends |
| campus S5 | #25 grunt | archive round #18 from the NE corner, (-42.2,43) L1, same loop | 3 | archive pair gate (team door): gate worked while the stacks are cleared |
| campus S5 | #26 grunt | service round #21 from the hall end, (-29,23.5) <-> (-29,42.5) | 4 | loud route (hall, kitchen, terrace gate): wing and hall run at once |
| warehouse service | #9 grunt | yard patrol #2 round from the entrance end, (-6.5,-19.6) <-> (10.5,-21) | 3 | shutter and drainpipe routes both cross the yard |
| warehouse service | #10 grunt | office patrol #8 round from the west end, (-7,-12.3) <-> (7,-12.3) | 4 | mess back door (team door): two unbolt it while two take the corridor |
| warehouse racking | #9 officer | stocktaker #3 round from the cage end, (-21.4,11) <-> (-21.4,2) | 3 | west route up A1, past the VNA through-bay gate (team door) |
| warehouse racking | #10 grunt | picker #5 round from the south end, (-7.4,0.5) <-> (-7.4,14.6) | 4 | sprinkler-main route drops into the east gangway; VNA team exits at the issue gate |
| warehouse floor | #10 grunt | plant engineer #9 round from the opposite corner, (14.9,0.6) | 3 | plant room service door (team door): one pair unbolts it, another works the duct |
| warehouse floor | #11 grunt | crane operator #7 round from the press end, (14,-6.8) <-> (7.3,-7.5) | 4 | crane-walkway route passes over the die rack lane |

Index = 1-based guard number in the section. Placed totals with all tags: S1 10, S2 14, S3 18, S4 22, S5 26,
warehouse 10 / 10 / 11. With `alarmMax x perStage`: S5 26 + 6 = 32 = `SECTOR.maxAlive` (the existing cap test), the
rest lower. The 3-4 player alarm extras stay clamped by SM's live-cap `capReinforce` (not cumulative).

## Files
- `src/world/maps/campusSectors.ts` (S1-S3), `campusS4Data.ts`, `campusS5Data.ts`, `warehouseSectors.ts`: additions only
  (git diff: 40 insertions, 0 deletions in the four data files).
- `tests/sectorGuardTags.test.ts`: new block "coop4 DATA" per section (8): <= 2 tagged, minPlayers 3 or 4, reason > 30
  chars; tags appended, none a desk operator (S4 `CAMPUS_SECURITY.desks`, `roleFlags` desk class), dog, handler, pair,
  post, dormant or enforcer; team 1-2 = the base list (count and FNV-1a hash of the base JSON, taken from master's data),
  team 3 = base + the 3-tags, team 4 = base + all tags; `checkSectorGuards`, `validatePosts`, `validateGuardAi` clean;
  each tag >= 7 m from the section start and on its route start; `guards.length + alarmMax x perStage` <= `maxAlive`.

## Existing tests edited (outside the owned list, forced by the appended guards)
The campus and warehouse tests assert exact `guards.length`, kind / squad lists, "static guards" lists and 3 s isolation of
every takedown spot against ALL of a section's guards. A tag beside a base guard breaks those by design (two guards
on one round are not isolated), so these tests now read the BASE list (`minPlayers === undefined`) where they pin
today's list or isolation, and the FULL list where the tags must hold too (slot / route / takedown spot on the nav
grid, >= 7 m, the A99 screen count incl. the shut-door leaves, the live cap): `campusS1`-`campusS5.test.ts`
(a `G` base and `ALL` full list per file), `sectors.test.ts` (counts, M8 isolation and phase drift on the base list;
tagged slots and spots checked blocked / distance only). No assertion was loosened.
- Spot fix found by the tests: S4 #21 takedown spot (16.8,33.5) was off the nav grid -> (16.8,33.0); warehouse racking #9
  spot (-21.4,2.0) read lit 0.62 in `warehouseS2Light` -> (-21.4,11.0) (the base stocktaker's own dark spot).

## Checks
- `npx tsc --noEmit`: clean. `npx eslint` on the 4 data files, `sectorGuardTags`, `campusS1`-`S5`, `sectors` tests: clean.
- vitest `--maxWorkers=2` under a slot lock: sectorGuardTags, campusS1-S5, campusPosts, campusGear, campusRuntimeNav,
  sectors, warehouseCoopS1/S2/S3, guardAiData, postsWiring, sectorTeamScale: 16 files, 397 tests pass. Also
  armour, cameraCue, cameraReach, campusArtLight, campusS2Board, campusS4NocSight, laserPanels, pairsWiring, s6CloseOn,
  sectorBolt, sectorItemScope, sectorSlice0, sectorStageActions, sectorStep3, securityCameraE8, securityRoom, spawnSlots,
  warehouseDress, warehouse S1/S2/S3 Light, sectorRestart, sectorDesk, enemyManager*: pass (after the spot fix to
  warehouseS2Light).
- Not run (per brief): e2e, build, GPU. e2e part 7 can count the tags with `?players=4` (2 per section) and part 6 stays unchanged.

## Undo
Remove the `minPlayers` guards (one block at the end of each guard array) or set `flags.sectorGuards`; the tests then
see an empty tag list (the "at least one" count test would need relaxing).
