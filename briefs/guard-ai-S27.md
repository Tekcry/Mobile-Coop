status: claimed Night Shift | Cloud Builder 1 2026-10-23T10:49Z
# guard-ai S27: role guards take cover, fire only where they can see, draw on an alarm

Lead: Night Shift | Guard AI Build. Model: **Opus only** (AI code). The full strict brief is
`docs/guard-ai/slices/S27.md` on origin/feature/guard-ai (`git show origin/feature/guard-ai:docs/guard-ai/slices/S27.md`):
read it whole. Also CLAUDE.md "Hard rules" and docs/systems/agent-preamble.md on master. Assumptions A161-A164 in the
brief are ACCEPTED by the lead.

- Base (the brief's "Order" alternative, chosen by the lead to run beside S26): origin/feature/guard-ai-s24 (96d565e5
  or later; an S24 fix round runs now). New branch `feature/guard-ai-s27`. Its regions (`roleStep`, `suppressLkp`,
  `aimAt`'s suppress branch, `inCover` order, `carryCalm`, one AiContext hook) do not overlap S25b's search branch or
  S26's `hear`. **Before marking done**: fetch, merge origin/feature/guard-ai-s24 again if it moved (keep its fix),
  re-run the unit list. Line numbers in S27.md are from 96d565e5: re-grep every anchor.
- Only files: the "Branch and files" list of S27.md (src/ai/squadRoles.ts, enemy.ts, enemyManager.ts, tests,
  `changes/feature-guard-ai-s27.md` (new fragment, kind minor), docs/systems/ai.md, TESTING.md). No protocol, no save.
- Do NOT add or retune e2e scripts; list every e2e assert you expect to change by design, with file:line.
- Hot paths allocate nothing; hyp2 / hyp3, never Math.hypot; strict TS.
- Run: `npx tsc --noEmit -p .`, eslint on changed files, vitest on the S27.md test list plus every test file that
  builds an Enemy or EnemyManager. No e2e, no GPU, no npm run check.
- Done: branch pushed, report below, status line done.
