# CHECK-R3: the contextual R3 change (2408cfa4..c69b698c)

Result: **PASS**. No blockers.

Checked against Michael's words: "contextual: R3 pings normally and zooms only while aiming a scoped weapon (no ping while scoped). Keyboard: middle mouse pings."

## Verified
- `ALLOWED_PAIRS = [['zoom','ping']]` (`src/input/conflicts.ts`) silences only that pair. A remap putting another action on R3 still conflicts with both Zoom and Ping (`tests/conflicts.test.ts`, crouch on R3 gives two conflicts). On keys, another verb on Ping's key still conflicts.
- Scoped aim: `scopedAim = player.ads && current.scoped` (`src/weapons/playerWeapons.ts`), identical to the old zoom test `!ads || !scoped`. R3 zooms (`contextZoom`), does not ping (`contextPing`).
- Not scoped (holstered, low ready, unscoped gun aimed): R3 pings, `zoomOn` is forced off, no zoom.
- Middle mouse (`Mouse1`, Ping alone, `keyBindings.ts`) pings in every state, scoped too. B (Zoom alone) never pings.
- Optic view: `scopedAim` is false there, so R3 and middle mouse ping from the cable (`real` input, as before).
- Controls screen note and the migration toast: the toast lists `findConflicts` results, which are now empty for the defaults (settings test asserts no Zoom/Ping line). The controls note names the shared R3.
- `scripts/e2e-pad.mjs` expectations match: defaults show no conflict, reset restores draw `[2]`, zoom/ping `[11]`, no conflict rows. No other binding changed in the diff (`GAME_BINDINGS` and `PAD_BINDS` keep R3 on zoom and ping; only comments and the Ping label changed).
- Hot paths: `contextPing`, `contextZoom` and the `scopedAim` getter are pure, no allocation.
- Runs, one at a time: opticCoop 26, conflicts 6, padBinds 5, settings 17, input 26, keybinds 5 all pass; `tsc --noEmit` clean. No e2e run (as asked).

## Polish (not blocking)
1. `src/game/gameState.ts:1835` reads `scopedAim` at the ping check, `weapons.fixedUpdate` (line ~2013) reads `player.ads` later in the same step. On the single step where `ads` flips on with a scoped gun, one R3 press could ping and then toggle zoom. Cosmetic; fix by caching the value or reading it once per step.
2. While holding a guard (`grabInp`, `GRAB_PASS` has `zoom` but not `ping`) R3 does not ping when not aiming. Same as before this change, but "pings normally" would suggest adding `ping` to `GRAB_PASS` if Michael wants it.
3. A player who binds Zoom and Ping to the same key gets the contextual behaviour with no warning (the allowed pair covers any shared input, not only R3). Matches the brief's "an allowed pair".
4. `src/game/gadgetSystem.ts:615`: a remote gadget camera zooms on `down('zoom')`; input is blank there, so R3 does not ping. Fine, noted only.
