# PR3 merge check (#558, merge of origin/master 4.112.1)
Owner: Guard AI Build. Status: current.

Verdict: PASS

Checked head `7c74b551d0948ad25022432819b99da336f7b1d1` = merge of `78c241933` (origin/master, 4.112.1) into
`48394def2` (PR3, re-checks A + B PASS). Merge base `e18039094` (PR2 polish, an ancestor of master). Checker: Opus,
read-only; no e2e, no `npm run check`.

## 1. Conflict resolution (`git show --remerge-diff 7c74b551d`)
- One conflicted file, `src/core/flags.ts`, two hunks; both resolved by keeping PR3's side then master's side, the
  conflict markers only removed (no line edited or dropped).
  - Interface: `guardPairs` / `lookouts` / `dogRelease` (flags.ts:79-87) then master's `charShadowLight` /
    `mapReady` / `campusV2` (flags.ts:88-99), the interface closes, then master's `CAMPUS_V2_ON` and `readCampusV2`
    intact (flags.ts:102-110).
  - Object: flags.ts:183-189, PR3's three `=== '1'` reads then master's three reads.
- No duplicated keys (a count of every `key:` line in the merged flags.ts finds none past interface + object).
- Flag defaults: `guardPairs`, `lookouts`, `dogRelease` stay default off (`=== '1'`, flags.ts:184-186); master's
  `charShadowLight` and `mapReady` default off, `campusV2` defaults to `CAMPUS_V2_ON` (empty).
- Line survival, every file both sides touched (`docs/systems/ai.md`, `TESTING.md`, `scripts/e2e-sectorops.mjs`,
  `src/ai/enemy.ts`, `src/ai/enemyManager.ts`, `src/core/flags.ts`): every non-blank line either side added since the
  base is present in the merged file (0 missing on both sides).

## 2. Semantic clashes the auto-merge could hide
Master's changes since the base to PR3's files: `src/ai/enemy.ts` (+183), `src/ai/enemyManager.ts` (+55),
`scripts/e2e-sectorops.mjs` (+183), `docs/systems/ai.md`, `TESTING.md`, `src/core/flags.ts`. Untouched by master:
`src/ai/barks.ts`, `src/ai/pairs.ts`, `tests/coopGuardAi.test.ts`, `tests/pairs*.test.ts`, `tests/combatHearing.test.ts`.
- `enemy.ts`: master's change is guard-ai-alloc (kept `GOAL_OUT` goal via `goal()`, enemy.ts:375 / 3080; kept shot,
  bite, throw vectors and `HIT_OUT`; index loops) plus the `GuardAnimTier` constructor's two new arguments
  (enemy.ts:720). PR3's lines (rise cause, enemy.ts:2143; `bark('heard')`, enemy.ts:1317; calm-moment reset,
  enemy.ts:2718) set flags and pick a bark only: no goal object returned, no `HitInfo` or vector kept, no allocation
  per frame, so nothing reads a kept scratch after master reuses it. `pairGoal` keeps its own object (enemy.ts:1751),
  as master's alloc comment says. No renamed API that PR3 calls (`postPoint`, `postDef`, `patrolRoute`, `onLevel`,
  `bark` unchanged; typecheck clean).
- `enemyManager.ts`: master's change is guard-ai-alloc in other methods (`throwGrenade` velocity, `callAlert`,
  `searchSlot`, `refreshFlow`, `assignFlanker`; `throwV` enemyManager.ts:3695). PR3's `buildPair` / `postedWhyNot`
  (enemyManager.ts:2240-2300) are load-time only and untouched by master; `flags` import (enemyManager.ts:52) is single.
  No double-applied logic.
- `barks.ts` / wire: master did not touch `BARK_EVENTS`; PR3's `'heard', 'spotCall'`, `'saw'` stay appended after
  `'console', 'consoleCheck'` (barks.ts:134-138); `tests/coopGuardAi.test.ts:100-102` pins them at 37 / 38 / 39.
- #500 repeat alarms: already in the base (PR2); master added no alarm code since. `tests/alarmRepeat.test.ts` passes.
- `scripts/e2e-sectorops.mjs`: master added the HUD objective check, the start-at-section legs and the H8 floor
  block; PR3 added `pairLanes` / `pairStage` and pair legs (c) / (d). No shared names; `node --check` passes (no
  duplicate top-level declaration). PR3's legs still stub `g.security.fixedUpdate` as master's legs do.
- char-shadow-meter, map-ready, campus-greybox: flags only on the PR3 overlap (above); no code in PR3's files.

## 3. Checks (on 7c74b551d, clean worktree)
- `npm run typecheck:fast`: exit 0.
- `npx vitest run tests/barkCause.test.ts tests/combatHearing.test.ts tests/archetypes.test.ts tests/pairs.test.ts
  tests/pairsWiring.test.ts tests/coopGuardAi.test.ts tests/alarmRepeat.test.ts`: 7 files, 126 tests passed.

## Polish (not blocking)
1. `docs/systems/ai.md:53-55` (master's text, arrived with this merge) still says posted pairs and the partner check
   between meetings are "Not built yet ... (`pairWhyNot` skips them)", while PR3's "Talking pairs" text documents both
   built dark behind `guardPairs` (`postedWhyNot`, `PairDef.watch`). Done looks like: that line says they are built
   dark behind `flags.guardPairs` (walk item 5) and lookouts are not built yet.
2. `docs/systems/ai.md:407-410` (master's own text, already on master) says "repeat alarms are job guard-rules"
   next to the built repeat-lock description from PR2. Not this merge's doing; fix on the next ai.md touch.

## Note for the orchestrator
origin/master has since moved to `b80d00d8d` (4.112.2, look-video); it touches none of PR3's files, so no new
conflict from it.
