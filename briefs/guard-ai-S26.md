status: done feature/guard-ai-s26 c195408e
# guard-ai S26: guards hear you in a fight and a search (CT rule 8)

Lead: Night Shift | Guard AI Build. Model: **Opus only** (AI code). The full strict brief is
`docs/guard-ai/slices/S26.md` on origin/feature/guard-ai (`git show origin/feature/guard-ai:docs/guard-ai/slices/S26.md`):
read it whole, it holds the files, data shapes, build steps, tests and done criteria. Also read CLAUDE.md "Hard rules"
and docs/systems/agent-preamble.md on master. Assumptions A155-A160 in the brief are ACCEPTED by the lead.

- Base: origin/feature/guard-ai-s25 (73038a40 or later: S24 + S25a + S25b; S25b's checkers and an S24 fix round run
  now). New branch `feature/guard-ai-s26`. **Before marking done**: fetch, merge origin/feature/guard-ai-s25 and
  origin/feature/guard-ai-s24 again if they moved (keep their fixes), re-run the unit list. Line numbers in S26.md are
  from 96d565e5: re-grep every anchor.
- Only files: the "Branch and files" list of S26.md (src/ai/hearing.ts, intruders.ts, enemy.ts, enemyManager.ts,
  searchArea.ts callers, the `hear(` call sites in src/game/gameState.ts, src/game/takedownController.ts,
  src/net/coopHost.ts (one argument each), tests, `changes/feature-guard-ai-s26.md` (new fragment, kind minor),
  docs/systems/ai.md, TESTING.md). No protocol, no save change.
- Do NOT add or retune e2e scripts (the lead does them with the laptop run); list in your report every e2e assert you
  expect to change by design, with file:line.
- Hot paths allocate nothing; hyp2 / hyp3, never Math.hypot; strict TS; Babylon only via src/core/babylon.ts.
- Run: `npx tsc --noEmit -p .`, eslint on changed files, vitest on the S26.md test list plus every test file that
  builds an Enemy or EnemyManager (grep `new EnemyManager\|new Enemy(` in tests). No e2e, no GPU, no npm run check.
- Done: branch pushed, report below (files with line ranges, tests with counts, deviations), status line done.

## Report (Night Shift | Cloud Builder 1, 2026-10-23): done, feature/guard-ai-s26 c195408e
Bases merged (both contain their current tips): origin/feature/guard-ai-s24 e31edd54 then 7fe4f6a2; origin/feature/guard-ai-s25
702d60d7 (moved from 73038a40). Conflicts only in enemyManager.ts field / clear blocks: both kept (S24 `contactHunt` beside
S25 plans and S26 fields). Commits 49f67102 (S24 merge), 78fde26d (S26), c195408e (S25 merge). Diff vs S25 tip = 14 files,
only S26.md's list.
Files (head lines):
- `src/ai/hearing.ts` 101-128: `COMBAT_HEAR`, `combatHearAct`.
- `src/ai/intruders.ts` 27-29, 69, 85-88, 95: `locT`.
- `src/ai/enemy.ts` 30, 409-429 (`heardT`, `hearBarkT`, `inCombatSearch` / `heardAt`, `searchSpot`), 993-1027
  (`hearSearch`, `heardInFight`), 2000-2002 (throttles in `update`).
- `src/ai/enemyManager.ts` 23, 190-193 (per-slot heard timers), 2570-2659 (`hear` with `by`, `hearFight`, `reportHeard`),
  2816-2820 + 2847-2848 (buildPlan uses `areaRadius(locT)`), 3385-3386 (clear).
- `by` call sites: gameState.ts 493 (new `localId` getter), 623, 1297, 1398, 1533, 1771, 1906, 1910; takedownController.ts
  793-794; coopHost.ts 725, 1299, 1307 (the base has no client hold noise).
- ai.md, coop.md, TESTING.md, changes/feature-guard-ai-s26.md (minor); tests/combatHearing.test.ts (new, 14),
  intruders.test.ts (+1), searchAreaWiring.test.ts (+1).
Tests: tsc, eslint clean. 34 files (S26.md list + every file building an Enemy / EnemyManager + 5 takedown files) 619 on
the merged base -> 635 / 635 in 35 files after S26 + the S25 re-merge.
Deviations:
1. Extra method `heardInFight()`: restarts the 1.5 s re-aim throttle for a guard in combat (`hearSearch` is searching only).
2. A searcher's hunt is set directly (`e.hunt = slot`) plus `tell(slot)`: `tell` alone only sets `pendingHunt` for an
   unalerted guard, so the heard slot was forgotten next update.
3. Test (f) "no board report" read as the incident board: the table's body noise during a calm search act 2 tells the
   intruder board and he hunts that slot (asserted). Side effect: `lkpValid` turns true (device-fresh rule,
   enemyManager.ts ~901). If (f) meant the intruder board, gate act 2 on `e.inCombatSearch`. LEAD CALL.
4. searchAreaWiring's helper ages `locT` beside `seenT` (lines 117-119, 151, 207), by design (A157).
5. The plan-reset distance reuses `PLAN_MOVE` (1 m), no new constant.
6. The walkable-cell snap computes the centre without `nav.center` (which allocates an array).
Not in the file list, for the lead: coopHost.ts:786 (client assist takedown), coopHost.ts:848 and strikeController.ts:242
(strike noise) still pass no `by`; the host's LKP ghost (gameState.ts:2600-2609) hides once a heard report moves the slot
> 1.5 m from the captured spot; the S25b check B FAIL B1 (`buildPlan` cover only from the south) is still open on the
base (no conflict with S26).
e2e asserts that may change (none run, no scripts edited; laptop candidates):
- scripts/e2e-stealth-ai.mjs:530-536 'lkp': should still pass (teleport + standing, no step noise).
- scripts/e2e-sectorops.mjs:1453-1600 (`moveClient`): client steps near searching / alerted guards now locate the client.
- scripts/e2e-sectorops.mjs:3261-3332 (S6 hunting), 3356-3430 (S13 sweep): any step near hunters moves the LKP.
- scripts/e2e-ctcourse.mjs:102-381 (`moveClient` routes) where a guard is searching.
- scripts/e2e-coop.mjs S24 two-intruders block: a client step heard by a hunter moves the client's slot.
- scripts/e2e-takedown.mjs:134-170: no change expected (alerted guards frozen / passive).
Direct `em.hear` calls in e2e (e2e-stealth-ai.mjs:284,290,323; e2e-tactics.mjs:105,108; e2e-sectorops.mjs:2284,2330)
pass no `by` and hit calm guards: unchanged.
