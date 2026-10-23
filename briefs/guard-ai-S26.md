status: claimed Night Shift | Cloud Builder 1 2026-10-23T10:49Z
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
