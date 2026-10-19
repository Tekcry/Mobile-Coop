# B4 check (commit 7191d390) - verdict: PASS

Read-only review of the diff. No tests were run.

## Blockers
None.

## Checked and fine
- Station 4 stays completable. The thrown player lands past the wall, presses the release (pickup gate `g-s4`, flag `s4-release`), and the band switches off on host and client (`hasFlag` hook, mirror included). The thrower then walks through. The jammer route is kept.
- Early release is impossible: the switch is on the far side. Landing in the beams costs 15 HP, no more. The bay restart deletes the flag (`courseState.restart`, flagBay) and the laser re-arms on the next tick.
- Host or client as thrower: both go through `onTeamMove` and `tstart`. Both sides play from the same `l`, so landings match.
- Never stranded: `throwOffer` ends on B, Co-op, the 20 s timeout or leaving the ground. `throw` and `throwAssist` end on timers. Death calls `end(true)`. The flight does not depend on the partner, so a disconnect cannot leave anyone stuck.
- Leg-up vs throw: `THROW_SUB` on `brace` keeps them apart in both directions. Crouch state is read fresh each frame in `idle()`. The landing sets the crouch toggle.
- Protocol: `PROTOCOL_VERSION` 19. The other 17 / 19 test mentions are consistent (names are stale, asserts say 19). `parseMessage` bounds `lx`, `lz` and `l`.
- Allocations: `runThrow` and `throwOffer` allocate an override object per frame, the same as `runBoost` and `hold`.

## Polish
1. Host landing check is a ring only (2.2-4.2 m from thrower, within 1 m of their floor), with no direction or geometry check. A cheating client can pick any landing in the ring, for example through a thin wall. Fine for co-op trust. Add a host raycast later (`teamMoves.ts` `throwLandingOk`, `coopHost.ts` onTeamMove).
2. Landing head room is checked at 1.2 m but the landing pose is crouched, so it is OK. Body width is not checked.
3. Test titles still say "PROTOCOL_VERSION is 17" (`tests/net.test.ts:705,659`, `tests/moveState.test.ts:109`).
4. An offered throw holds the thrower still for up to 20 s with no partner (B cancels).
