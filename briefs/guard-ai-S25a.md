status: open
# guard-ai S25a: probable-area search, the pure module only (searchArea.ts + its unit test)

Lead: Night Shift | Guard AI Build. Model: **Opus only** (AI code). The full S25 brief is `docs/guard-ai/slices/S25.md`
on origin/feature/guard-ai (git show origin/feature/guard-ai:docs/guard-ai/slices/S25.md). Read it whole; this slice
builds ONLY its "Build" step 1 and the pure test. The wiring (EnemyManager plans, AiContext hooks, Enemy.decide, docs,
searchAreaWiring.test) is a later slice S25b on top of S24 and is NOT part of this brief.

- Base: origin/master 41204e30 (4.80.0). New branch: `feature/guard-ai-s25a`. Independent of S23 / S24: the module is
  pure (no Babylon, no imports from enemy.ts / enemyManager.ts; S25b feeds it numbers).
- Only files: `src/ai/searchArea.ts` (new) and `tests/searchArea.test.ts` (new). No fragment, no docs (S25b writes them).
- Build exactly S25.md "Data shapes": `SEARCH_AREA` table (A151 / A154 numbers), `SearchPlan` (fixed typed arrays sized
  `SEARCH_AREA.points`, `offer` insertion keeping the best `points` and enforcing `spacing`, `take` = max score -
  wNear x dist / r among free and not-done points, claims for `num`, -1 when none; `release(num)` frees that guard's
  claim; `finish(k)` marks done, never re-offered; `reset(cx, cz, now)` clears points, claims and done), `areaRadius`,
  `pointScore(light, cover, pathM, r)` (darker, cover and nearer by path score higher: wDark x (1 - light / dark clamped),
  wCover if cover, minus a path term; document the formula in a doc comment). Zero allocation after construction;
  hyp2 from the repo's helper (grep `export function hyp2`), never Math.hypot. Strict TS.
- Tests (S25.md "Tests", first bullet): areaRadius clamps (6 m at 0 s, 20 m cap, monotone); offer keeps the best N,
  enforces spacing, a worse near-duplicate dropped, a better near-duplicate replaces; take gives different points to
  different guards, the nearer of two equal scores, -1 when all claimed or done; release frees; finish never re-offers;
  reset clears; a dark cover spot outranks lit open floor at the same path distance; no allocation (take / offer in a
  loop, check via a counting proxy or simply that arrays keep identity).
- Run: `npx tsc --noEmit -p .`; `npx vitest run tests/searchArea.test.ts`; `npx eslint src/ai/searchArea.ts tests/searchArea.test.ts`.
- Done: green, pushed, trailer "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>", a short report below, then
  `status: done feature/guard-ai-s25a <sha>`.
- Assumed decisions A151-A154 in S25.md are accepted for the numbers in this table.
