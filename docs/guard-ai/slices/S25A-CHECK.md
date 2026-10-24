# S25a check (fresh Opus checker, 2026-10-23)

Verdict: PASS

Branch feature/guard-ai-s25a @ 39420159 off master 41204e30. Diff 41204e30..HEAD: src/ai/searchArea.ts (new, 172 lines),
tests/searchArea.test.ts (new, 226 lines). Nothing else touched.

## Findings (none blocking)
- Data shapes match S25.md exactly: SEARCH_AREA (searchArea.ts:12-38) enabled true, base 6, speed 1.5, max 20, points 12,
  spacing 3, lattice 2, dark = LIGHT.shadow (0.28, lights.ts:76, `as const`, test asserts parity), sampleY 0.9,
  wDark 1, wCover 0.6, wNear 0.8, rebuild 2. SearchPlan (68-172): x, z (Float32Array), score (Float64Array), claim
  (Int32Array filled -1), done (Uint8Array), n, cx, cz, builtAt = -1; offer / take / release / finish / reset with the
  S25.md signatures. areaRadius (44-48) and pointScore (56-64) signatures match; formula documented in the doc comment.
  S25b can wire Build steps 2-3 against it as written.
- offer (85-121): best N kept sorted descending; full plan drops the worst; equal-to-worst rejected; near-duplicate
  (< spacing) rejected unless strictly better than every kept point it is near, then all those are removed and the
  newcomer inserted; vacated slots cleared; claims and done move with points. Spacing invariant holds after every call.
  Equal scores: newcomer goes after existing equals.
- take (126-141): skips done and claimed points, value score - wNear x dist / r, ties keep the better-ranked point,
  claims for num, -1 when none. Releases num's earlier claim first (one claim per guard; builder deviation 3, sound).
- release / finish (bounds-checked) / reset (clears n, claims, done; records centre and time): correct.
- Zero allocation after construction (fill() on existing arrays only, no closures / iterators); hyp2 from core/mathx,
  no Math.hypot (Math.sqrt only in the test). Pure: imports core/mathx and world/lights (which imports mathx and
  lampMath, type-only import there); no Babylon, no enemy / enemyManager imports. Strict TS clean.
- Tests cover every item of S25.md "Tests" first bullet (areaRadius clamps 6 / 20 + monotone; offer best N, spacing,
  worse near-dup dropped, better replaces; take different guards, nearer of equal scores, -1 all claimed and all done;
  release; finish never re-offers; reset; dark cover > lit open floor at equal path distance; array identity through
  offer / take loops).

## Polish (not blocking)
1. searchArea.ts:85-121: offer is an online greedy, so the result depends on offer order. A candidate rejected as a
   near-duplicate of a point that is later replaced (or a point evicted from a full plan) never returns, even when the
   replacement frees room for it. Example: keep A(0,0,0.5); B(2.5,0,0.4) rejected; C(-2,0,0.9) replaces A; B (4.5 m
   from C) is lost. Fewer points than possible, never wrong points. S25b can avoid it by offering in descending score
   order, or accept it.
2. Index stability, for S25b: offer shifts indices and evicting the worst silently drops its claim; reset (every
   rebuild, 2 s) wipes claims and done flags. If S25b stores the index k from take and calls finish(k) after a rebuild,
   it marks an unrelated point done, and already searched points are handed out again after a rebuild. Suggest
   searchDone finds the point by claim === num (a small finishBy(num) helper here would make that easy) and that
   buildPlan does not rebuild a plan while claims are live, or re-marks done points near the old ones.
3. tests/searchArea.test.ts: not covered: a near-duplicate replacing in a full plan, the order-dependent chain case of
   polish 1, and a claim moving with its point when an insert shifts it.
4. The allocation test checks array identity only (the brief allows this); it cannot catch a temporary allocation.

## What I ran (after npm ci exit 0)
- `timeout 600 npx tsc --noEmit -p .`: exit 0.
- `timeout 600 npx vitest run tests/searchArea.test.ts`: 14 / 14 passed.
- `npx eslint src/ai/searchArea.ts tests/searchArea.test.ts`: exit 0, no output.
- Read: CLAUDE.md Hard rules, the S25a brief (origin/cloud-queue), S25.md (origin/feature/guard-ai), the full diff.
