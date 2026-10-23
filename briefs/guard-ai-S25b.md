status: open
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
