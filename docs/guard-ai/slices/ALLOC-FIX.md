# ALLOC-FIX: PR #446 feature/guard-ai-alloc, fix round (Opus)

Fixes the items in ALLOC-CHECK-A and ALLOC-CHECK-B (both on feature/guard-ai, head 864520c4c). Pure refactor kept:
same numbers, same RNG draw order, same call order.

## Fix round
- A1 / B1 (tsc TS2322, blocker): `tests/guardAiAllocManager.test.ts:34` casts the players getter at the boundary
  (`() => ps as unknown as readonly PlayerRef[]`); `FakePlayer` also gets `speed: 0, crouched: false`. Adding the two
  fields alone is not enough (tsc then wants a full `Damageable` on `target`), so the cast stays.
- B2 (KNOWN_TP kept past the call): the module `KNOWN_TP` is gone. `decide` fills the guard's own `knownPt` (same
  values, written at the same point as before) and passes it as `tp` (`src/ai/enemy.ts:3225`). `chasePoint` copies a
  same-cell route (`NavGrid.findPath` returns `[to]`) off it once per re-path (`src/ai/enemy.ts:3556`), so the kept
  route holds that step's spot, as the old fresh `tp` did, and the next `decide` cannot move it. The `CHASE_ME` /
  `CHASE_CAND` comment now says they never reach `goTo`. Test: `tests/guardAiAlloc.test.ts:212` (fails with the copy
  removed).

## Polish taken (non-blocking, behaviour identical)
- A polish 1: the inline `{ point; speed; face }` goal types in `enemy.ts` use `type Goal`.
- B polish 1: the guard grenade's velocity is a kept `throwV` (`src/ai/enemyManager.ts:631`); `Grenades.throw` clones
  a velocity at once (`dir.clone()`).

## Not taken
- A polish 2 (stand-in guards lack `blind*` fields): no test calls `blind()`.
- B polish 2 / 3 (`die` impulse, HIT_OUT retention): once per death / harmless, pre-existing.

## Checks
- `npx tsc --noEmit -p .` clean; eslint clean on the 5 changed files.
- vitest, the 133 files importing `src/ai` (4 batches): 131 passed, 2 skipped; 2279 tests passed, 3 skipped.
