# F1a check (commit 32dac79)

Verdict: PASS

Read-only review of the diff (no builds or tests run).

## Blockers
None found. Every control still has a path:
- Pad: fire RT, reload A (drawn) or keyboard R, interact A (holstered), crouch B, jump Y, back-to-wall L3 (holstered), shoulder swap L3 (aiming only), co-op RB, wheel LB, vision D-pad left, speed D-pad up/down, gadget D-pad right, pause Start.
- Keyboard: draw X / RMB, knockout Z, zoom B, wheel Tab, next weapon T.
- The wheel closes on release, on death (gadgetSystem.ts:160) and on pause (gameState.ts:1336).
- The draw latch clears on death, climb and traversal (player.ts).
- No leftover reader of the legacy `ads` action.

## Polish
1. Old saved binds: a saved keyboard `nextWeapon` = KeyX now shares X with `draw` (conflict warned on the controls screen, not an error). Saved pad `wall` (L3), `vision` (Up) and `gearUp` (Right) can clash with the new defaults. Dropped ids `reload` and `shoulder` are ignored cleanly. Consider a one-time reset of pad and key binds.
2. Pad A is `interact` only while holstered and `reload` while drawn. Doors and hostage menus (gameState.ts ~1063, 1115) need a holster first. Holding A while holstering fires an interact press on the next frame.
3. `refreshRing` (gadgetSystem.ts ~221) and the hint string (gameState.ts ~2316) allocate every step while the wheel is open. It is only open while held, but it breaks the no-allocation hot-path rule.
4. A co-op client's strike is always a knockout on the host (the wire has no lethal flag, noted as a stub). The remote weapon is shown in the right hand on a left shoulder (stub).
5. A tap of LB held 0.15 s or longer opens the wheel instead of switching weapon (WHEEL_HOLD). A very quick tap whose release lands in the same step as the press has not been confirmed to register.
6. Keyboard: holstering with X while Z is held keeps no fire stuck (Z release clears it). The RMB chord path in pointermove could toggle draw twice if the browser sends both events. Unconfirmed.
