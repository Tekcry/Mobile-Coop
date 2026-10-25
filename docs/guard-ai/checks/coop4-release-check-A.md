# coop4 release check A (#317)
Owner: Guard AI Build. Status: history.

Fresh Opus checker A (src/net wire and session) on PR #317 head 0837f147 (kept off the coop4 branch so the laptop
statuses on that head stay valid). tsc clean; 11 net files 268 / 268.

VERDICT: PASS. Fix list: none.

Verified: Q16 live (`capacity('sector')` 4, no flag; course 2); join gating via `cap` (host only, a client cannot widen
the room); slots (host 0, lowest free, held on drop, compact at start); token rejoin; wire parse bounds (`wireSlot`,
lists cut at MAX_PLAYERS, `secWire` j / ch / cd, `ot` 1..15, `bye.mode`); Marlow Yard unchanged; no static `src/net`
import from single player; hot paths; PROTOCOL_VERSION untouched; D4 `roomCap` hook (nothing sets it yet: Campaign J7).

## Train merge notes (for the orchestrator's by-hand merge)
1. `protocol.ts:22-28`: master's `PROTOCOL_VERSION = 62` + the branch's `MAX_PLAYERS` comment; the train bumps to 63.
2. `protocol.ts`: keep both sides (branch snap* / wireNum / PlayerInfo.slot / bye.mode / secWire lists / ot; master
   EnemyState.in / markIntel / the `in` parse). No overlap: `snapEnemyState` leaves `in` alone.
3. `coopHost.ts` imports: union (`markIntel` + `snapEnemyState, snapItem, snapPlayerState`); `setPlayerGlow` stays gone.
4. `coopHost.ts` snapshot hunk, a real clash: `const w = markIntel(es, hasInfo(e)); enemies.push(this.round ?
   snapEnemyState(w) : w);` and keep `players.map(this.round ? snapPlayerState : wirePlayerState)`.
5. Snapshot budget: master's `"in":1` adds 7 B per guard with intel; 4 x 32 steady goes ~5953 -> ~6177 B against
   `STEADY_MAX` 6144 (`tests/snapBudget.test.ts:15`), hidden because the fixture has no `in`. On the resolved head add
   `in: 1` to the fixture, then raise the steady budget slightly or trim (upload ~2.22 Mbit/s, under 2.25).
6. Master's lamp-shot and `interPh` changes merge cleanly and work at 4 players.
7. Campaign J7 / J22: set `session.roomCap = 2` when a mission is picked; the refused text and a client's lobby show
   the mode cap until `cap` goes on the wire.
8. Docs `coop.md` / `testing-tools.md` by hand: keep both; the history line names the train's version.
9. Rerun after resolving: net, coopRejoin, rejoin, spawnSlots, snapBudget, ctDevicesSlots, sectorOut, joinWatch,
   protocolConst, opticCoop, and master's intel / lamp-shot tests.

## Polish
1. `coopHost.ts:244-245` duplicate comment. 2. `session.ts:428-435` `start` before the compacted `lobby`. 3.
`coopUi.ts:87` refused text uses the mode cap. 4. `coopUi.ts:504` "invite your teammates" in a 2-seat lobby. 5.
`session.ts:182` R2 rule: a tokenless newcomer takes the one held slot; consider requiring the token when cap > 2. 6.
`protocol.ts:885` lobby parse does not dedupe slots. 7. `bySlot()` maps a missing player to slot 0. 8.
`coopClient.ts:1384` `for...of` in `blips()`.
