# coop4 merge 2 check A (PR #317, master 4.106.0 into feature/coop4)
Owner: Guard AI Build. Status: current.

Head checked: f720d29e3 (parents 603f23a43 coop4, 70af237e5 origin/master). Checker A, Opus, independent of B.

## Verdict: PASS

No fix. Every resolved hunk keeps both sides; the auto-merged files show no semantic clash.

## Resolved hunks
- `src/net/protocol.ts`: `PROTOCOL_VERSION = 65` (master's train bump); coop4's `MAX_PLAYERS` comment (`PLAYER_SLOTS`,
  `capacity(mode)`) and the `slotFromList` import kept. `tests/protocolConst.test.ts` passes.
- `src/net/coopClient.ts`: `followStep` (1129) and `showLine` (1152) both present; `fixedUpdate` calls `followStep()`
  (1160) then routes the stall through `showLine` (1165); the snapshot path (552) and the start (293-294,
  `setObjective('')` + `showLine`) use master's B3 path. coop4's `slot: () => this.slot()` CtDevices hook and master's
  `SectorListMirror` sit together; `list?.onLive`, `clientFeedToNotes`, `objectiveLines()` intact.
- `src/game/gameState.ts`: `NetAttachment.teamSize?` and `objectiveLines?` (194-197); `notes`, the `intel` listener,
  `objectiveLines()` (mode then net) and coop4's `TeamRef` / `localMv` all present.
- `src/game/modes/sectorMode.ts` `raised()` (1002-1069): `shield = s.shieldTeams === true` (1038) feeds
  `responseTeam(stage, size, this.teamKinds, shield)` (1043) inside the per-team loop, so every team keeps S1's rule;
  no leftover single-team `nt` / `team` / loop. Without Guard AI's hook (master today) `teams` is 1 and `size` is
  `send`: identical to master's path.

## Auto-merged files changed on both sides (read for clashes)
TESTING.md, docs/systems/coop.md, docs/systems/testing-tools.md, scripts/e2e-coop.mjs, scripts/e2e-sectorops.mjs,
src/core/flags.ts, gameState.ts, gameMode.ts, sectorMode.ts, sectors.ts, coopClient.ts, coopHost.ts, protocol.ts,
campusS4Data.ts, campusS5Data.ts, tests/sectors.test.ts.
- Helmets (A1 / A15, G350): S4 / S5 base guards are byte-identical to master (only `armour` gear, no section gear);
  coop4's four `minPlayers` tags are pure appends with no gear, so `checkSectorGuards` passes and the new MASTER_BASE
  hashes (a9a014c3, e1372a37) are master's lists. `useDifficultyHelmets()` on start and `(false)` on dispose kept.
- Dog kill (A5, G348): `onEnemyKilled` keeps `killScore(..., !e.ko)` before coop4 A13's `slotOfId` synced slot; the
  host's `e.def.quadruped` takedown deny kept (coopHost 1010). The `killScore.test.ts` stub's `playerRefsInto` / `refs`
  is the right minimum for A13.
- sector-batch Perfect: `raiseAlarm` keeps coop4's `teamSize` and master's `alarmsRaised++`; `result()` passes
  `alarms`; `resultBadge` on the banner.
- e2e: `sections()` counts the untagged list, so master's H8 block (part 6, solo) compares against the right count;
  master's warehouse S13 "armed guards only" asserts hold (team 1: no extras, no hook). Both scripts pass `node --check`.
- flags: `players` and `mixamo` both present.

## Checks
- `npm run typecheck:fast`: exit 0.
- `npx vitest run` on 40 files (killScore, sectorGuardTags, sectors, sectorTeamScale, responseTeam, responseWiring,
  helmetRule, gear, gearWiring, campusGear, dogTakedown, sectorOut, playerSlots, ctDevicesSlots, sectorObjectives,
  fieldNotes, net, netSim, protocolConst, snapBudget, coopRejoin, coopFix, coopGuardAi, e2eAffected and others):
  716 / 716 pass.
- No e2e (the laptop runs affected-e2e on the head).

## Polish
1. `scripts/e2e-sectorops.mjs:2498` (H8): the greedy slot match reads every slot, the unspawned `minPlayers` tags
   included. A live guard nearer a tag slot than its own would mismatch; none of the four tags sits on a base slot, so
   it passes today. Done looks like: filter `guards` to `minPlayers === undefined` there.
2. With Guard AI's hook (feature/guard-ai-coop4) splitting a stage into 2+ teams, campus S4 / S5 get one shield lead
   per team (more riot shields at 3-4 players). That matches A4's "each response team" wording; worth one line in the
   coop4 PLAN so Guard AI does not read it as a regression.
