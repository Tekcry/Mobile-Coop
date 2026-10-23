status: done feature/guard-ai-s25 73038a40
# guard-ai S25b: probable-area search, the wiring (searchers check where a player could be)

Lead: Night Shift | Guard AI Build. Model: **Opus only** (AI code; no Sonnet / Haiku builders). The full strict brief is
`docs/guard-ai/slices/S25.md` on origin/feature/guard-ai (git show origin/feature/guard-ai:docs/guard-ai/slices/S25.md):
read it whole. This slice builds its "Build" steps 2-4, the `searchAreaWiring.test.ts` tests and the docs. Step 1 (the
pure module `src/ai/searchArea.ts` + `tests/searchArea.test.ts`) is DONE on `feature/guard-ai-s25a` (39420159 + check
9a243955, checker PASS: `docs/guard-ai/slices/S25A-CHECK.md` there; read its polish list). Also read CLAUDE.md "Hard
rules" and docs/systems/agent-preamble.md on master.

- Base: origin/feature/guard-ai-s24 (ef44eea5 or later: S24 two intruders, its checkers running now). New branch
  `feature/guard-ai-s25`. First `git merge origin/feature/guard-ai-s25a` (no overlap expected). **Before marking done**:
  fetch and merge origin/feature/guard-ai-s24 again if it moved (an S24 fix round may land), keep S24's fix, re-run the
  unit list. Line numbers in S25.md are from e383ba16 (before S23 / S24): re-grep every anchor.
- Only files: `src/ai/searchArea.ts` (small additions only, see below), `src/ai/enemy.ts` (the search-point branch and
  the `AiContext` hooks), `src/ai/enemyManager.ts` (plans, `buildPlan`, the two ctx hooks, claim release),
  `tests/searchAreaWiring.test.ts` (new), `tests/searchArea.test.ts` (additions for the helpers you add),
  `changes/feature-guard-ai-s25.md` (new fragment, kind minor), `docs/systems/ai.md`, `TESTING.md`. Not `response.ts`
  numbers, `BODY_SEARCH`, `DEVICE`, the light code, `src/net`. No protocol, no save change.
- **Required from the S25a check (polish 2), do these:**
  1. `buildPlan` offers candidates best score first (collect into a fixed scratch, sort in place by score, then offer),
     so `offer`'s order dependence never loses points.
  2. `searchDone` finds the guard's point by `claim === num` (add a small `finishBy(num)` / `claimOf(num)` helper to
     `SearchPlan`, unit-tested), never by an index saved before a rebuild (`offer` shifts indices).
  3. `buildPlan` never rebuilds (resets) a plan while any claim is live; it rebuilds when the plan is older than
     `SEARCH_AREA.rebuild` s or its centre moved > 1 m AND no claim is live (or all claimed points are done).
- Do NOT add or retune e2e scripts (the lead does the `e2e-stealth-ai` 'search area' scenario and the 'lkp' hide-spot
  check with the laptop run); in your report, give the path distance from the 'lkp' scenario's last known position to
  its hide spot (-2, -15) if you can compute it from the unit test helpers, else say so.
- Hot paths allocate nothing (scratch made once, index loops, no closures); hyp2 / hyp3, never Math.hypot. Strict TS,
  `import type` where type-only.
- Run (unit only: no e2e, no GPU, no npm run check): `npx tsc --noEmit -p .`; `npx vitest run tests/searchArea.test.ts
  tests/searchAreaWiring.test.ts` plus S25.md's re-run list (bodySearch, deviceTrip, urgency, responseWiring, sweep,
  twoIntruders, squadWiring, postsWiring, incidents) and every test file that builds an Enemy or EnemyManager (grep);
  `npx eslint` on the changed files.
- Done: all green, (g) `SEARCH_AREA.enabled = false` gives today's points exactly, pushed. Commit trailer
  "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>". Then a report below (files with line ranges, tests before
  -> after with counts, deviations, e2e blocks that change by design) and `status: done feature/guard-ai-s25 <sha>`.
- Assumed decisions A151-A154 in S25.md are accepted as written. The flares question for Michael does not block.

## Report (Night Shift | Cloud Builder 1, 2026-10-23 ~21:55): done, feature/guard-ai-s25 73038a40
Base: origin/feature/guard-ai-s24 96d565e5 (re-fetched before done: not moved) + clean merge of origin/feature/guard-ai-s25a
(2f04b4bd). S24 code untouched; its check A FAIL (hunt -1 joiners never rebind) is still open.
Files (line ranges at 73038a40; diff vs S24 = S25a's files + these):
- `src/ai/searchArea.ts`: `orderByScore` 66-86 (in-place shell sort, no allocation); `SearchPlan.claimOf` / `finishBy` /
  `anyClaim` 176-195.
- `src/ai/enemy.ts`: import 34; `AiContext.searchPoint?` / `searchDone?` 194-199; `planPoint` / `planN` 380-383; `onPlan`
  401-405; `planOver` 1275-1280; plan resets in koSearch / bodySearch 871-872, 890-891, onLevel 1785, 1794-1795; search
  branch 2371-2379 (point 0 the LKP, then `ctx.searchPoint`, else `ringPoint` at `searchK-1-planN`); `searchDone` at look
  end 2406 and unreachable skip 2417.
- `src/ai/enemyManager.ts`: import 67; `PLAN_*` 109-114; plans / scratch 173-189; claim release onKilled 543-544, despawn
  1664-1665; ctx hooks 631-633; reset on forgotten slot 2644-2645; `searchPointFor` / `searchDoneFor` / `releasePlans` /
  `planSweep` / `buildPlan` 2687-2823; update plan clock + planSweep 3069-3071; clear 3299-3300.
- Tests: `tests/searchAreaWiring.test.ts` new (10), `tests/searchArea.test.ts` +4. Docs: `changes/feature-guard-ai-s25.md`
  (minor), `docs/systems/ai.md` 415-431, `TESTING.md` 58-60.
Required S25a polish: (1) buildPlan collects into fixed scratch, `orderByScore`, offers best first; (2) searchDone by
`finishBy(num)`, never a saved index; (3) rebuild only when due (never built / older than rebuild s / centre moved > 1 m)
AND no live claim AND a current chase field for that position.
Tests: before (merged base) 26 files 385 / 385 (searchArea, bodySearch, urgency, sweep + the 22 files that build an Enemy
or EnemyManager, incl. deviceTrip, responseWiring, twoIntruders, squadWiring, postsWiring, incidents) -> after 27 files
399 / 399 (searchArea 14 -> 18). Wiring (a)-(g) + no rebuild with a live claim + unreachable -> searchDone(false).
(g) passes: `SEARCH_AREA.enabled = false` gives exactly LKP then ringPoint k 0-6, hook never called. tsc, eslint clean.
Deviations / choices: when the plan runs out the ring starts at its own first point (`searchK-1-planN`), so with no plan
points the index is exactly today's; a rebuild round the same centre (<= 1 m) keeps done points (matched within the 3 m
spacing; else a lone searcher got his own finished point back after 2 s); `planSweep` each update frees claims of guards
gone / down / not searching / off plan / on another intruder (no third ctx hook); cover candidates use
`nav.nearestWalkable(x, z, 2, y)` (cover can sit on a wall column); no plan while the intruder's chase field is missing,
stale or built round another position (then the ring point).
'lkp' path distance (warehouse runtime nav, doors open): LKP ~(-0.5, 0) -> hide spot (-2, -15) = 19.5 m (from (0,0)
19.3 m, from (-1, 0.5) 20.2 m; straight 15.1 m). Under `SEARCH_AREA.max` + 3 = 23 m, so per the brief the hide spot must
move farther or into light behind the wall. Baked light at (-2, -15) not readable from the unit helpers.
e2e blocks that may change by design (none edited): e2e-sectorops search and ghost blocks; any e2e-tactics / e2e-stealth
check asserting a combat searcher's ring points or keeping him near the LKP. The e2e-stealth-ai 'search area' scenario is
the lead's.
