status: open
# campus-greybox A28 (cloud): start-at-section dev link

Lead: Night Shift | Sector Ops Build. Job campus-greybox (J17, BRIEF A28).
- The strict brief is `docs/campus-greybox/briefs/A28.md` on `origin/feature/campus-greybox` @ e95f5670c47a3a8bde1777a9903a7206ea57c370 (read it with `git show`); build exactly that. Base origin/master eaf699d0f9c2a97bdc55b6f0404ca561f186a324, new branch `feature/campus-greybox-a28` (create from the base and push; guard `test "$(git rev-parse --abbrev-ref HEAD)" = feature/campus-greybox-a28`).
- It edits `src/net` (coopHost.ts, coopClient.ts): RULES "A job" makes that Opus code. Build it only if you are an Opus session; otherwise leave this brief open and take the next one.
- Unit tests only (typecheck:fast + the brief's vitest files, `--maxWorkers=2`); `node --check` the e2e script. Pending PC run: e2e-sectorops part 1 and e2e-coop + e2e-netmove (laptop).
- Done: the brief's done criteria, a short "## Report" here, `status: done feature/campus-greybox-a28 <sha>`.
- Merge note (Campaign Build, 23:40): its R6 on feature/mission-rules-hud edits `coopClient.ts` onSector (~:1002-1012: the mirror runner's section from `ls`) and frameUpdate's objective write (~:1185-1188, ~:1397-1399), and removes the mission HUD mount. Put the `rh` practice read in its own lines outside those blocks (a small helper called from onSector is fine; do not rewrite the `ls` lines), and name the exact lines you touched in the report.
