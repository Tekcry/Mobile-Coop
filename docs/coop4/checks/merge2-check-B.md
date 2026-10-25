# coop4 merge 2, check B (game and test semantics)
Owner: Guard AI Build. Status: current.

Checked: merge commit f720d29e3 = 603f23a43 (coop4) + 70af237e5 (origin/master 4.106.0), merge base 7df39dc60. Written
before reading check A (independent).

## Verdict: PASS

No fix list. The merge is semantically clean: nothing of master reverted, nothing of coop4 lost, no new clash.

## Method
- `git show --remerge-diff f720d29e3`: 8 files differ from a plain re-merge (the 5 conflicted files, coop.md and the 2
  test fixes). Every resolved hunk read.
- Files changed on one side only: every master-only file in the merge equals master (except `tests/killScore.test.ts`,
  the stub fix); every coop4-only file equals coop4 (except `tests/sectorGuardTags.test.ts`, the hash fix); no file
  touched by neither side changed.
- Files changed on both sides (16): master's +/- lines (merge base to master) compared with the merge's lines (coop4 to
  merge). Identical for 13 files (protocol, coopClient, coopHost, gameState, gameMode, sectors, flags, campus S4 / S5
  data, sectors.test, both e2e scripts, TESTING.md). The 3 that differ: sectorMode.ts (only the resolution below),
  testing-tools.md (every master line present; only coop4 lines moved out), coop.md (only the moved coop4 lines added).

## Resolutions
1. protocol.ts: `PROTOCOL_VERSION = 65` (master's), coop4's room-cap comment (`capacity(mode)`); `capacity` keeps
   course 2, sector `SECTOR_MAX` 4, legacy 4. Correct.
2. gameState.ts `NetAttachment`: both optional hooks kept (`teamSize`, coop4 A10; `objectiveLines`, hud-guidance B4);
   both are read (`GameState.teamSize`, `GameState.objectiveLines`) and implemented by CoopClient. Correct.
3. coopClient.ts: coop4's `followStep` and master's `showLine` both whole; every objective write still goes through
   `showLine` (no coop4 path writes the HUD objective directly). Correct.
4. sectorMode.ts `raised()`: coop4 AI5's per-team loop now calls `responseTeam(stage, size, teamKinds, shield)` with
   `shield = s.shieldTeams === true` (guard-rules S1 A4 / M2). Each response team gets a shield lead only on campus
   S4 / S5, as master intends ("a riot-shield guard leads each response team"); count unchanged, so the live cap holds.
   Master's other sectorMode changes (difficulty helmets on start / dispose, `resultBadge`, `alarmsRaised`, dog score
   `!e.ko`, `objectiveLines`) are all present; coop4 A13's attacker slot sits after master's kill / knock-out split.
   The only other caller (`stealthSystems`, master A14) passes `false`. No allocation added (one boolean hoisted).
5. killScore.test.ts (master's new test): the prototype stub gains `g.playerRefsInto` (empty list) and `refs: []`, which
   coop4 A13's `slotOfId` reads; empty list = slot 1, the old behaviour. Assertions unchanged.
6. sectorGuardTags.test.ts `MASTER_BASE`: campus S4 / S5 hashes updated. Master's A15 changed only `gear` fields in S4 /
   S5 base guards (helmet / both to armour; section `gear: 'helmet'` removed); coop4's tags are appended and carry no
   gear, so the untagged list equals master's list and the test pins it (passes). Coop4's tags name no helmet gear, so
   master's `checkSectorGuards` (armour only) holds for them.
7. testing-tools.md held at 720 lines: coop4's e2e part detail moved to coop.md "coop4 e2e parts", pointers left;
   docLint passes.

## Hard rules
- No static import of `src/net` outside `src/net` (same as master). No hot-path allocation added. Strict TS: typecheck
  clean.

## Runs
- `npm run typecheck:fast`: clean.
- vitest, 58 files, 955 tests, all pass: net, protocolConst, killScore, sectorGuardTags, gear, responseTeam,
  playerSlots, docLint, campusGear, responseWiring, netSim, gearWiring, gearMask, every `tests/sector*` and
  `tests/coop*`. No e2e (laptop queue runs affected-e2e on the head).

## Polish (not blocking)
- No unit test pins `shieldTeams` with coop4's multi-team shape (3-4 players on S4 / S5: one shield lead per team);
  `responseWiring` covers one team. A small case there would lock resolution 4.
