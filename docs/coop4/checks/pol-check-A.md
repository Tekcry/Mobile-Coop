# coop4 polish batch - check A (net / game logic)

**Verdict: PASS**

Range: `3f1c946f..1f61b0af` (feature/coop4-pol). Checker A, fresh. Read-only review plus tsc and vitest.

## Must-fix

None.

## Polish (non-blocking)

1. **Late restore can land after the same message's grant** - src/net/coopClient.ts:946-947 and :1047. In the rejoin order
   (`ot` first, down state later) the restore now fires in `followStep`, after `onSector` already applied that message's
   `ls` / rating top-up, so `restoreCheckpoint` can undo a top-up that arrived in the same `sector` message as the `ot`.
   Rejoin-while-out only; the normal order (down, then `ot`) still restores before the grant.
2. **Freed holder may still be holding** - src/net/coopHost.ts:1101-1102. After `teamMark` clears C's old hang, the old
   holder X's client can still be in `runHold` (wire `brace` + HANG_SUB, the same as an offer), so a third player can be
   granted a hang with X at once; X's own `hangEnd` now gets no `tend` and ends on the 3 s "no end reply" fallback
   (teamController.ts:572). This is less harmful than the old bug (X `taken` for the whole of C's next move, and a stray
   `tend` ending C's new move). Only possible at 3-4 players.
3. **Build report wording** - pol-build.md item 3 says the host's local order is unchanged, but the host now emits
   `lobby` before `start` (session.ts:427-429). Harmless: coopUi.ts:89 sees phase `playing` (set at :419), the autostart
   listener (coopUi.ts:883) is already off, and the host LobbyScreen only re-renders.
4. **Test comment** - tests/sectorOut.test.ts says "slotOut reads -1 until the lobby", but `selfSlot` returns 1 until the
   lobby arrives (session.ts:139-143). The latch behaves the same either way.
5. **The localMvLazy test copies the getter** - tests/localMvLazy.test.ts defines its own `mv` getter, so a regression
   of the `defineProperty` at gameState.ts:614 (for example, a later `localRef = {...}`) would not fail it.

## Findings by item

- **(1) OutRestoreLatch (72771798).** Restores once per OUT spell: `due` fires on the first (out, down) and re-arms only
  on not-out. The handler and the next `followStep` cannot double-fire (`done`). A revive while `ot` still names us
  gives no second restore. A `sector` without `ot` re-arms it, as the old transition code did. The host omits `ot` only
  when it is 0 (sectorMode.ts:1482-1483). "Never" is only possible if we are out but never down, which OUT does not
  produce. `outSelf` -> `selfSlot` -> `slotOf` allocates nothing, so the per-step call is clean. At 1-2 players and in
  the course the mask is 0, so it never fires.
- **(2) teamMark clears earlier marks (50ebbb37).** `teamClear` is bookkeeping only: no `tend`, no `g.team` call, and
  `throwKo` is untouched. `checkTeamRequest` requires `a.mode === 'ground'`, and `b` must be offering (`brace` /
  `ledge`). So a player who is posed in a live move cannot reach `teamMark`, and a partner serving someone else is denied
  `taken` before it (teamBusy). The host goes through the same path (`teamSide(self)` uses a fresh `localMoveState`).
  Leavers are unchanged: `hold` and `removeRemote` already `teamClear`. Moving `teamMark` above `teamPairs.set` is
  required, because otherwise `teamClear` would delete the new pair.
- **(3) Lobby before start (55a13cef).** The client's `lobby` handler sets the compacted slot and phase `playing` before
  `start` is handled, which the test covers. Late joiners and rejoins already got `broadcastLobby` before the per-peer
  `startMsg` in the hello path (session.ts:223-231), so they are unchanged. The client's back-to-lobby check
  (coopUi.ts:93) does not trip, because the phase is `playing`.
- **(4) Lazy localRef.mv (06375cec).** No `src` reader of `TeamRef.mv` / `localRef.mv` exists yet. src/ai has none
  (Guard AI #319 is pending), and every other `.mv` read is a remote `state.mv` or `RemotePlayer.ref.mv`. Nothing
  assigns `localRef.mv` (a getter-only property would throw in strict mode) and nothing reassigns `localRef`. A read
  before the fixed-step marker returns the previous step's state, exactly as before. A read after the marker builds from
  the state at read time. The client (`puppet`) returns null, as before. There is no allocation: the closure is built
  once in the constructor, and `localMoveState` writes into the reused buffer. Single player never builds it now.
- **(5) Dead glow code (28b9e8c8).** There are no remaining references to `goggleSlot` / `setPlayerGlow` (the hits in
  figure.ts are the unrelated `goggleSlots` field). The slotFromList test now uses literal slots.
- **UI2 merge 57ec3f70.** It is clean: its diff against the first parent is exactly feature/coop4-ui2's change from the
  merge base (coopUi.ts, styles.css, e2e-coop.mjs), with no conflict markers. coopUi imports `BEACON` from
  player/goggleGlow, which imports only core/babylon.
- **Static src/net imports.** None of the changed non-net files import src/net.

## Runs

- `npx tsc --noEmit -p .`: clean.
- vitest `--maxWorkers=2`: sectorOut, teamMovesTaken, coopRejoin, localMvLazy, goggleColour and playerSlots, 115/115
  passed. net, ratingWire and rejoin, 106/106 passed.
- No e2e, build or check, per the brief.
