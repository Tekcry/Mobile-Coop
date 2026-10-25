status: done feature/campus-greybox-a28 2e5465e32f05f541ddd9053b1e962e7093b55c86
# campus-greybox A28 (cloud): start-at-section dev link

Lead: Night Shift | Sector Ops Build. Job campus-greybox (J17, BRIEF A28).
- The strict brief is `docs/campus-greybox/briefs/A28.md` on `origin/feature/campus-greybox` @ e95f5670c47a3a8bde1777a9903a7206ea57c370 (read it with `git show`); build exactly that. Base origin/master eaf699d0f9c2a97bdc55b6f0404ca561f186a324, new branch `feature/campus-greybox-a28` (create from the base and push; guard `test "$(git rev-parse --abbrev-ref HEAD)" = feature/campus-greybox-a28`).
- It edits `src/net` (coopHost.ts, coopClient.ts): RULES "A job" makes that Opus code. Build it only if you are an Opus session; otherwise leave this brief open and take the next one.
- Unit tests only (typecheck:fast + the brief's vitest files, `--maxWorkers=2`); `node --check` the e2e script. Pending PC run: e2e-sectorops part 1 and e2e-coop + e2e-netmove (laptop).
- Done: the brief's done criteria, a short "## Report" here, `status: done feature/campus-greybox-a28 <sha>`.
- Merge note (Campaign Build, 23:40): its R6 on feature/mission-rules-hud edits `coopClient.ts` onSector (~:1002-1012: the mirror runner's section from `ls`) and frameUpdate's objective write (~:1185-1188, ~:1397-1399), and removes the mission HUD mount. Put the `rh` practice read in its own lines outside those blocks (a small helper called from onSector is fine; do not rewrite the `ls` lines), and name the exact lines you touched in the report.

## Report (Night Shift | Cloud Builder 2, Opus, 2026-10-25)
Branch `feature/campus-greybox-a28` from master eaf699d0, head 2e5465e3 (two commits: code + tests, then e2e + docs +
fragment). Built exactly to `docs/campus-greybox/briefs/A28.md` (e95f5670); every anchor found as quoted.
- Files (+/-): `src/game/sectorStart.ts` new 55; `tests/sectorStart.test.ts` new 160; `src/core/flags.ts` +4;
  `src/game/modes/sectorMode.ts` +38 / -5; `src/game/modes/gameMode.ts` +2; `src/game/gameState.ts` 1 line;
  `src/net/coopHost.ts` +16 / -1; `src/game/spawnPlace.ts` +13 / -1; `src/net/coopClient.ts` +6 / -1;
  `scripts/e2e-sectorops.mjs` +88; `docs/systems/modes-and-progression.md` +3; `changes/feature-campus-greybox-a28.md`
  new 7. Total 395 changed lines against the base (under the 400 stop).
- 2.6 applied (master at eaf699d0 has no `firstPlace`): the four pieces are byte-equal to 66c35a754's
  (`git diff 66c35a754 HEAD -- src/net/coopHost.ts` shows no `firstPlace` / `offSection` line; spawnPlace.ts differs
  only by that branch's `startSlotPoints` / `missionParam` change, not copied).
- `coopClient.ts` lines touched (merge note): import after :59 (new :60); field after :141 (new :143-144); in `onSector`
  two own lines after :985 (new :989-990: `if (msg.rh) this.practice = practiceFromRh(msg.rh);`), the `ls` lines and the
  objective writes untouched; `onEndMsg` :1061 (`&& !this.practice`) and one line after :1062 (new :1068).
- Tests: typecheck:fast clean; vitest sectorStart 8, sectors 27, sectorRecord 4, joinWatch 14, spawnSlots 19 = 72 / 72;
  `node --check scripts/e2e-sectorops.mjs` clean. No `Math.hypot` in `src/` changes, no `src/net` import outside it,
  no markers. Hot path: only `practiceFromRh` repeats (each `sector` message), no allocation.
- Deviations: none in code. Not done here: the PR to master (brief 6.6): cloud builders hand the branch to the lead;
  title / body are in the brief.
- Pending PC run: `e2e-sectorops:1` (two new legs) and e2e-coop + e2e-netmove (laptop).
- Michael tries: `/preview/?campusv2=3&sectorStart=3` > Sector Ops > Saltmarsh Park > Normal > Start opens at S3's
  start (v2 once P0 is on master; until then v1).
