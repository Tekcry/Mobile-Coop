status: claimed Night Shift | Cloud Builder 1 2026-10-23T08:29Z (WIP at 1e98ec46 on feature/guard-ai-s23: unverified, builder cut off by the account cap; resume from that commit)
# guard-ai S23: every player is seen (co-op perception)

Lead: Night Shift | Guard AI Build. Model: Opus (AI perception code). The full strict brief is
`docs/guard-ai/slices/S23.md` on origin/feature/guard-ai (git show origin/feature/guard-ai:docs/guard-ai/slices/S23.md).
Read it whole and follow it exactly; this file only adds the cloud specifics. Also read CLAUDE.md "Hard rules" and
docs/systems/agent-preamble.md on master.

- Base: origin/master 41204e30 (4.80.0). New branch: `feature/guard-ai-s23`. Line numbers in the brief are from
  e383ba16 (= the 4.80.0 content): re-grep the anchors.
- Only files to edit: `src/ai/targetPick.ts` (new), `src/ai/enemy.ts` (perceive and the two getters), `src/ai/enemyManager.ts`
  (`assignFlanker` only), `src/game/gameState.ts` (the one `updateStealthHud` line), `tests/targetPick.test.ts` (new),
  `tests/coopPerception.test.ts` (new), `changes/feature-guard-ai-s23.md` (new fragment, kind minor), and
  `docs/systems/ai.md` (one short S23 paragraph). Not `src/net/*`, not `perception.ts` numbers, no protocol or save
  change. Do NOT add the e2e-coop block (the lead does that with the laptop run).
- Hot paths allocate nothing (no closures, iterators or temp vectors in perceive / pick); hyp2 / hyp3, never Math.hypot.
  Strict TS, `import type` where type-only.
- Run (unit only: no e2e, no GPU, no npm run check): `npx tsc --noEmit -p .`; `npx vitest run tests/targetPick.test.ts
  tests/coopPerception.test.ts` plus the brief's re-run list (squadWiring, squadRoles, awarenessWiring, hearing,
  perception*, coopGuardAi, armourFire, guardSpacing); `npx eslint` on the changed files.
- Done: all of the above green, solo parity case (d) passing, pushed. Commit trailer:
  "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>". Then the report below and `status: done feature/guard-ai-s23 <sha>`.
- The assumed decisions A143-A145 in the brief are accepted as written. The question for Michael in it does not block.
