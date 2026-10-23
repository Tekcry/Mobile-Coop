status: claimed Night Shift | Cloud Builder 1 2026-10-23T20:07+1100
# guard-ai S24: two intruders (one last known position per player, G139)

Lead: Night Shift | Guard AI Build. Model: **Opus only** (AI code; no Sonnet / Haiku builders). The full strict brief is
`docs/guard-ai/slices/S24.md` on origin/feature/guard-ai (git show origin/feature/guard-ai:docs/guard-ai/slices/S24.md).
Read it whole and follow it exactly; this file only adds the cloud specifics. Also read CLAUDE.md "Hard rules" and
docs/systems/agent-preamble.md on master.

- Base: origin/feature/guard-ai-s23 a87ef34c (S23, every player seen; its two Opus checkers are running now). New branch:
  `feature/guard-ai-s24`. Line numbers in S24.md are from e383ba16 (4.80.0, before S23): re-grep every anchor.
- **Before marking done**: `git fetch origin feature/guard-ai-s23` and merge it into your branch if it moved (an S23 fix
  round may land while you build); resolve conflicts keeping S23's fix, re-run the unit list.
- Only files to edit: `src/ai/intruders.ts` (new), `src/ai/enemy.ts`, `src/ai/enemyManager.ts`, `src/ai/sweepTeam.ts` (the
  tick's inputs only), `src/game/gameState.ts` (the `noise` caller and the host ghost), `src/net/coopHost.ts` (the one
  `noise` argument only), `tests/intruders.test.ts` (new), `tests/twoIntruders.test.ts` (new), the S24 addition in
  `tests/coopPerception.test.ts`, tests that change by design (listed in your report), `changes/feature-guard-ai-s24.md`
  (new fragment, kind minor), `docs/systems/ai.md`, `docs/systems/coop.md`, `TESTING.md` (short lines). No protocol, no
  save change; nothing in src/net imported statically from single player.
- Do NOT add the e2e-coop block or retune e2e scripts (the lead does that with the laptop run); list in your report any
  e2e block you believe changes by design (S24.md "Tests that change by design": grep scripts/ for guards spawned
  alerted with no sighting).
- Hot paths allocate nothing (typed arrays sized MAX_INTRUDERS, reused Vector3 per slot, index loops, no closures);
  hyp2 / hyp3, never Math.hypot. Strict TS, `import type` where type-only.
- Run (unit only: no e2e, no GPU, no npm run check): `npx tsc --noEmit -p .`; `npx vitest run tests/intruders.test.ts
  tests/twoIntruders.test.ts tests/coopPerception.test.ts tests/targetPick.test.ts` plus S24.md's re-run list; then every
  test file that builds an Enemy or EnemyManager (grep); `npx eslint` on the changed files.
- Done: all green, solo parity case (f) passing, pushed. Commit trailer: "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>".
  Then a report below (files with line ranges, tests before -> after with counts, deviations, e2e blocks that change by
  design) and `status: done feature/guard-ai-s24 <sha>`.
- Assumed decisions A146-A150 in S24.md are accepted as written.
