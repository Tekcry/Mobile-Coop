# guard-rules PR4 re-check B
Owner: Guard AI Build. Status: current.
VERDICT: PASS

Re-checker B (Opus 5.5, fresh, independent of A), branch `feature/guard-rules-pr4`, head d9c4d0e8c, base PR3
48394def2 (25 files, +1451 / -71; src 9 files). Scope: the slices together, the flag-off guarantee, hard rules.

## Checks run
- `npm run typecheck:fast`: clean. `npx eslint` on 14 changed src / tests files: 0 errors. `node --check` on both e2e
  scripts: ok.
- vitest on 66 files (PR tests plus every test importing enemyManager, enemy, sectorMode, sectorStage): 981 pass,
  1 skip; consoleNoticeA4 timed out under the parallel load and passes alone (2/2, 8.9 s); PR4 does not touch it.

## Slices together
- A dog is never a lookout (`slotPost` ~2207 and the `lookoutStep` ~2578 gate); the features never act on one guard.
- The lookout's `noise` incident: dogs are `GV_MELEE` (skipped by the board), the lookout `GV_POSTED`, so only a calm
  human is sent, possibly a released dog's handler; the dog heels wherever he stands. No double-handling or stuck state.
- `releaseHeel` reads the shared last known position once; the lookout's report does not move it. A dog's noise is a
  sound rise: it can turn the lookout, never make him radio.
- Campus S5: #19 is not a handler (handlers are slots 4 and 6); stage 1 release does not touch posts.
- `releaseDogs` may run inside the manager update via `onAlarm`; it only sets dog state (event time). Section start
  does not release (S8-a).

## Flag off
- #19's lookout post reads as no post (post, `P_STANDARD`, zone radius as PR3); no other `slot.post` reader;
  `lookoutN` 0 skips every new line; `validatePosts` passes #19; `stageActions` stops at the flag; `spotCall` in
  `URGENT` is inert (nothing barked it at base). Identical to PR3.

## Hard rules
- Hot path: one gate plus field reads; per-key state in fixed `MAX_KEYS` typed arrays; bark / report / heightAt at
  call time only; `slotPost`'s spread at load; `releaseDogs` an index loop at event time. No `Math.hypot` added.
- Strict TS holds. No src/net, wire, save, `BARK_EVENTS` or `PROTOCOL_VERSION` change.
- Flags `lookouts` / `dogRelease` in src/core/flags.ts (:70-75, :147-148): URL switch, default off, owner Guard AI
  Build, switch-on target 2026-10-29, walk item.

## Fix list
None.

## Polish
1. No test turns both flags on together: a campus S5 stage-1 case asserting the lookout's call sends a human, never a
   dog.
2. `lookoutN` only resets on `clear()`; a live counter decremented in `despawn` would turn the gate off.
3. e2e (c): the 16 s calm wait often skips the 15 s perch loop and glimpse 2 is untracked (perch proven by (a), (b)); a
   wary start may give a false fail, never a false pass.
4. A comment in `releaseDogs` or `lookoutStep` that the board skipping dogs (`GV_MELEE`) keeps the two apart.
