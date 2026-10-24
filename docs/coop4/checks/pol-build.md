# coop4 polish batch - build (feature/coop4-pol)

Builder: Opus (cut off at the account swap after item 4; item 5 finished and committed by the lead). Base: feature/coop4
3f1c946f (the #317 laptop head). Follow-up PR after #317; carries Marlow Build's UI2 (feature/coop4-ui2 42842a77).

| Item | Source | Commit | Change |
| --- | --- | --- | --- |
| 1 | round-check-A P5 | 72771798 | OUT loadout restore on a rejoin whose `ot` arrives before the snapshot downs it: `OutRestoreLatch` (src/game/sectorOut.ts) restores once per OUT spell, checked on each `sector` message and each fixed step (coopClient.ts) |
| 2 | round-check-A P3 | 50ebbb37 | a new team move first clears both players' earlier marks (`teamMark`, coopHost.ts), so a silently ended hang / rope cannot leave its holder `taken` or a stale pair |
| 3 | net-batch P2 | 55a13cef | `startMatch` sends the lobby (compacted slots) before `start` (session.ts); host local order unchanged |
| 4 | net-batch P5 | 06375cec | `localRef.mv` built on demand once per fixed step into the same buffer (gameState.ts); single player and course hosts no longer build it every step; client null |
| 5 | dead glow code | 28b9e8c8 | `goggleSlot` / `setPlayerGlow` removed (no caller after slots); slotFromList test pinned to literal slots |
| UI2 | Marlow Build | 57ec3f70 (merge) | lobby rows by slot + beacon swatch (coopUi.ts, styles.css, e2e-coop assert) |

Tests: tests/sectorOut, teamMovesTaken, coopRejoin, localMvLazy (new), goggleColour, playerSlots.
Held (look items, Michael): S2 #14 doorway, S5 #26 start, follow-cam crouch height.
