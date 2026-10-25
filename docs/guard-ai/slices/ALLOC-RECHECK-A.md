# J6 alloc re-check A

Owner: Guard AI Build. Status: history.

VERDICT: PASS

PR #446 feature/guard-ai-alloc @ 97c6338f4 (Opus checker A, code correctness and performance). Fix round
`864520c4..97c6338f` (3d36aacb WIP save, 72e53977, 2bf853c6, 97c6338f) reviewed as one diff.

## Checks run
- `npx tsc --noEmit -p .`: clean.
- vitest, 17 files (guardAiAlloc, guardAiAllocManager, guardPolish2, guardPolishA, s6CloseOn, loneGuardEngage,
  oneMover, coopGuardAi, fourIntruders, twoIntruders, combatHearing, lockedDoorPath, nav, postsWiring,
  searchAreaWiring, responseWiring, enemyManagerDespawn): 238 passed, 1 skipped.

## Fix list items
1. tsc TS2322 in the manager test: fixed. `tests/guardAiAllocManager.test.ts:34` casts the players getter at the
   boundary (`() => ps as unknown as readonly PlayerRef[]`); `FakePlayer` also carries `speed` / `crouched` (lines
   16-17). tsc clean.

## New risk in the fix-round diff (all checked, none blocking)
- knownPt as `tp` (`src/ai/enemy.ts:3225`): same values written at the same point as the old separate `knownPt`
  write; nothing in `decide`, `chasePoint`, `pickAdvance`, `goTo` or `leashed` writes into `tp` (all reads;
  `leashed` clamps into its own `leashTmp`). Per guard, so one guard's step can no longer move another's goal.
- same-cell route copy (`src/ai/enemy.ts:3556`): `NavGrid.findPath` returns `to` by reference only on `s === g`
  (`src/ai/navGrid.ts:615`); multi-cell paths are built from fresh `[ex, ez]` arrays, so `routePath[0]` is the only
  slot that can alias. The check runs after `goTo`'s shift, so a shifted-out `[tp]` leaves an empty route (as before)
  and is not copied. Copy holds this step's values, has no `.link` (as the old fresh `tp`), and after it
  `routePath[0] !== tp`, so it runs once per re-path, never per frame. `goTo`'s return this step is still `tp` (equal
  values; `move` reads at once). No other `goTo` caller passes `knownPt`. Old route semantics kept.
- grenade `throwV` (`src/ai/enemyManager.ts:631`, field 3549): `Grenades.throw` with `isVelocity` does
  `dir.clone()` before `setLinearVelocity` (`src/weapons/grenades.ts:60`) and keeps no reference; `grenades` is typed
  `Grenades` with no wrapper or test stub of `throw`. Field is read lazily from the closure, so declaration order is
  irrelevant. One throw per 8 s squad-wide, same numbers.
- `type Goal` swap for the inline goal types: type-only, no emit change.

## Polish (non-blocking)
- `tests/guardAiAlloc.test.ts:212` reaches `chasePoint` through a cast on private members; fine for a pin test, but
  it will need updating if `chasePoint`'s signature changes.
