# F27 check: `GameState.playerRefsInto` fills by index
Owner: Guard AI Build. Status: current.

Checked: 74c54fce6 (`src/game/gameState.ts` ~1158, `tests/playerRefsInto.test.ts`). Checker: fresh Opus.

Verdict: PASS

## Correctness
- Same list and order as before in every case. `n` counts exactly what the old pushes did, in the same order (local,
  then `remotePlayers()` in order, OUT refs skipped by the unchanged `isOutRef`). Writes go to `out[0..n-1]` only, each at
  an index <= current length, so the array stays dense (no holes) on growth.
- No stale tail: `out.length = n` runs whenever the old length differs (shrink after a remote leaves or goes OUT, and
  the grow case is already exact). A caller always gets length === live count.
- Sort bound `i < n` equals the old `i < out.length` (length is n before the sort). `refSlot(p, i)` place fallback sees
  the same indices as before, so unslotted refs sort identically.
- Solo: `remotePlayers()` is the frozen `NO_REMOTES`; list is [local] or [] (local OUT), as before. Host: `coopHost`
  returns its stable `remoteRefs` field, so 2-4 players and leaves behave as before.
- Callers (`aiRefs` via `teamRefsInto` for EnemyManager and cameras, `charRefs` for the shadow meter, `ctDevices`
  `refTmp`, `courseMode`/`sectorMode` `refs`, including `.length` and `[0]` reads) all get a dense, exact-length array.
  Aliasing semantics are unchanged (the same `out` was mutated in place before too).

## Churn
- Removed. Steady state (count unchanged) does no `length` write, only in-bounds stores into a packed array: no backing
  store drop and regrow. `out.length = n` runs only on a count change (rare: join, leave, OUT). Nothing else in the path
  allocates (`remotePlayers()` returns stable arrays; `isOutRef` and `refSlot` are pure).

## Test
- `vi.mock('virtual:pwa-register', ...)` is sound: vitest hoists it above the imports, `src/pwa/pwa.ts` only calls
  `registerSW` inside `setupServiceWorker` (never at import), and the factory matches the export's shape. It is the
  first test to import `GameState` as a value; the method is called via `prototype.call` on a stub with exactly the
  fields it reads (`localRef`, `player.controller`, `outIds`, `remotePlayers`).
- Covers: slot sort from out-of-order remotes, same array returned, an OUT remote dropped with length trimmed, a remote
  leaving (3 -> 2 -> 1).

## Runs
- `npm run typecheck:fast`: clean.
- `npx vitest run tests/playerRefsInto.test.ts tests/sectorOut.test.ts tests/playerSlots.test.ts tests/sectorTeamScale.test.ts`:
  4 files, 68 tests passed.

## Polish
1. The test checks parity, not the F27 property itself; it would also pass on the old `length = 0` + push code. Not
   testable in-process without heap hooks, so fine as is; a note in the test's describe would make that explicit.
2. Test gaps (behaviour is correct by reading): a regrow after a shrink (1 -> 3), a local OUT ref, a 4-player list, and
   a ref with no `slot` (place fallback).
