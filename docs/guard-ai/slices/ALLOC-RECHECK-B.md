# J6 alloc re-check B
Owner: Guard AI Build. Status: history.

VERDICT: PASS

PR #446, feature/guard-ai-alloc @ 97c6338f (fix round 864520c4..97c6338f, incl. WIP save 3d36aacb). Checker: Opus,
checker B (intent, player-visible result, docs and tests). Read only.

## Checks run
- `npx tsc --noEmit -p .`: clean (exit 0).
- `npx vitest run tests/guardAiAlloc.test.ts tests/guardAiAllocManager.test.ts`: 2 files, 9 tests pass.
- Mutation check (scratch worktree, removed): with the copy line `src/ai/enemy.ts:3556` deleted, the new test fails
  (`expected [4, 5] not to be [4, 5] // Object.is`); with it, it passes. The test really catches the regression.
- PR checks on 97c6338f: lint, build-check, pr-size green; affected-e2e pending.

## Fix list items
1. **tsc TS2322: fixed.** `tests/guardAiAllocManager.test.ts:34` casts the players getter at the boundary
   (`ps as unknown as readonly PlayerRef[]`); `FakePlayer` gains `speed` / `crouched` (`:16-17`). tsc clean, CI
   build-check green.
2. **Per-guard known point: fixed.** Module `KNOWN_TP` is gone; `decide` writes the guard's own `knownPt` with the same
   values at the same point and passes it as `tp` (`src/ai/enemy.ts:3225-3227`), so no guard can see another guard's
   target. `chasePoint` replaces a same-cell route `[tp]` with a copy right after `goTo` (`src/ai/enemy.ts:3556`), so
   the kept route holds that step's spot and a later frame's `decide` cannot move it: the same value semantics as the
   pre-PR fresh `tp` array. The copy only happens on a same-cell re-path (findPath allocates there anyway). `tp` is
   only read elsewhere (`pickAdvance`, the lineClear branch, `leashed` clamps into `leashTmp`), so sharing `knownPt`
   changes no value. The `CHASE_ME` / `CHASE_CAND` comment (`:369-370`) is now true (they never reach `goTo`).
   Test `tests/guardAiAlloc.test.ts:212-244` drives the real `chasePoint` -> `goTo` path with a `findPath` that returns
   `[to]`, and asserts identity and values after `knownPt` is rewritten.
3. **PR body / changelog still truthful: yes.** `changes/feature-guard-ai-alloc.md` (patch, "no garbage when they
   shoot, bite or think") stays accurate and claims no player-visible change. PR body D1 / D2 / receiver audit still
   match the code.

## New risk in the fix round
- Polish-taken items checked: `type Goal` swaps are type-only; `throwV` (`src/ai/enemyManager.ts:631`) is safe since
  `Grenades.throw` clones a velocity at once (`src/weapons/grenades.ts:60`, `dir.clone()`) and keeps no `dir`.
- No new blocking issues.

## Polish
- PR body "Tests" paragraph does not list the fix-round test (same-cell route copy) and still says 2278 pass (ALLOC-FIX
  says 2279); D2 does not mention the kept grenade `throwV`. Update the body when convenient.
