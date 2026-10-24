# coop4 polish batch - check B (engine safety, wire, tests, guards, docs)

**Verdict: PASS.** No must-fix items.

Scope: `git diff 3f1c946f..1f61b0af` (src, tests, docs/systems, UI2 e2e assert) and `docs/coop4/checks/pol-build.md`.
Ran: `npx tsc --noEmit -p .` clean; `npx vitest run` sectorOut, teamMovesTaken, coopRejoin, localMvLazy, goggleColour,
playerSlots (`--maxWorkers=2`): 6 files, 115 tests pass. No e2e, no build.

## Must-fix

None.

## (a) Hot paths allocate nothing

- `OutRestoreLatch.due` (src/game/sectorOut.ts:107) and `CoopClient.outRestoreCheck` (src/net/coopClient.ts:1066), run
  each fixed step from `followStep`: booleans only; `outSelf` -> `slotOut` / `NetSession.selfSlot` / `slotOf` allocate
  nothing. OK.
- `GameState.localMvRead` (src/game/gameState.ts:524) fills the reused `localMv`; the getter closure is made once in the
  constructor (gameState.ts:614); the fixed step only sets a flag (gameState.ts:2073). OK.
- `teamMark` / `teamClear` (src/net/coopHost.ts:1100) run on a team request, not per frame; Map deletes only. OK.
- coopUi.ts `SLOT_CSS` is built once (static); `renderPlayers` is menu UI, not a hot path.

## (b) Wire

No message shape changes; `src/net/protocol.ts` and `PROTOCOL_VERSION` untouched. The one wire-visible change is order:
`startMatch` now sends `lobby` before `start` (session.ts:427), named in pol-build.md. Side effect checked: that lobby
carries `phase: 'playing'` (set at session.ts:419) while the client is still in the lobby; the client's lobby handler
only acts on `phase === 'lobby'` (coopUi.ts:93), so at most the status line flashes "Match in progress - joining..." for
one message. Harmless.

## (c) Tests pin the fixes

- teamMovesTaken "frees the first holder": on 3f1c946f `teamActive[h1]` (mate c, open) survives and `inOpenMove(c)` is
  true, so `teamBusy('h1','x')` is true and `teamPairs.get('h1')` is 'c': fails on the base. Pins P3. The same-pair test
  is a guard for the new clear-then-mark path (passes on the base too; fine).
- coopRejoin `atStart` [2]: transport is synchronous (the existing `cs.selfSlot` 2 assert right after `startMatch`), and
  on the base `start` fires before the lobby with C's old slot 3: fails on the base. Pins P2.
- sectorOut `OutRestoreLatch` and localMvLazy: fail on the base (symbols missing), but both test the pure piece only.
- Nothing loosened: the removed goggleSlot test went with its function; slotFromList now checks literal expected slots
  for every list (stronger than comparing with another implementation).

## (d) Marlow guard, (e) src/ai

`git diff --stat 3f1c946f..1f61b0af -- src/game/course src/game/modes/courseMode.ts 'src/world/maps/ctcourse*' src/ai`:
empty. OK.

## (f) Docs

world-and-characters.md matches the code (goggleColour by slot, applied at coopClient.ts:66 / coopHost.ts:133).
coop.md was not updated for the batch (see polish 1).

## Polish

1. docs/systems/coop.md not updated: "Team moves: `taken`" (line ~169) says `teamActive` is cleared at `tend`, a denial,
   a drop or a leave; it now also clears when either player starts a new move. "Slots" (`compact` at `startMatch`) does
   not say the lobby goes before `start`. "Lobby (L1)" does not mention rows in slot order with the beacon swatch.
   `TeamRef.mv` (line ~156) does not say the local ref's is built on first read per fixed step.
2. tests/localMvLazy.test.ts builds its own ref and `defineProperty` and fakes the step flag, so it does not catch the
   constructor wiring (gameState.ts:614) or the step marker (gameState.ts:2073) being removed. Same shape for the latch:
   no test drives `CoopClient.onSector` + `followStep` in the P5 rejoin order (`ot` first, down later).
3. gameState.ts:614 redefines `mv` as an accessor on the `localRef` literal: a different hidden class from the remote
   `TeamRef`s (data `mv`), so ref reads in the guards' loops see one more shape. Not an allocation; only worth a look
   when Guard AI starts reading `mv` there (nothing in src/ai reads it today).
4. With the lazy build, `localRef.mv` is the state at the first read in a step (inside `enemyMgr.update`), not before
   the guards run; a guard that changes the player before the first reader would shift the snapshot. Nothing reads it
   yet; note for Guard AI.
5. sectorOut.test.ts comment "slotOut reads -1 until the lobby": a client's `selfSlot` is 1 until its lobby
   (session.ts:139), not -1. Comment only.
