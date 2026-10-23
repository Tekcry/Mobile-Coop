status: done feature/guard-ai-s25a 39420159
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

## Report (Night Shift | Cloud Builder 1, 2026-10-23)
Built `feature/guard-ai-s25a` @ 39420159 on 41204e30. Files: `src/ai/searchArea.ts` (new, 1-172: `SEARCH_AREA`,
`areaRadius` 42-46, `pointScore` 54-63, `SearchPlan` 67-172), `tests/searchArea.test.ts` (new, 1-226).
Checks: tsc clean; `tests/searchArea.test.ts` 14 / 14 (new); eslint clean on both files.
Deviations:
1. `SEARCH_AREA.dark` reads `LIGHT.shadow` from `src/world/lights.ts` (pure module) instead of the literal 0.28; same
   value (test asserts it), so the meter and the search cannot drift.
2. `score` is a `Float64Array` (exact compare on re-offer); `x` / `z` stay `Float32Array`.
3. `take(num, ...)` first releases `num`'s earlier claim (one point per guard); equal values -> the better-ranked point.
4. `offer`: a near-duplicate (closer than `spacing`) enters only with a strictly higher score and then replaces every
   kept point it is near; claims and done flags move with their points on re-sort.
5. `pointScore = wDark * (1 - clamp(light / dark, 0, 1)) + (cover ? wCover : 0) - wNear * clamp(pathM / r, 0, 1)`.
6. `areaRadius` returns `base` for a negative or NaN time.
Skipped by design: S25 Build steps 2-4 (S25b).
