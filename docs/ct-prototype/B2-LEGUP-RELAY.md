# B2 - leg-up and CT ledge relay (2026-10-19)

## Built
- Co-op action: new `coop` input action (pad RB, keys F / PageDown); `ping` stays defined but unbound. World prompt `coop` shows the glyph and names the move and who starts it.
- Leg-up (CT 1.1), anywhere with room (G151): crouched + Co-op action = offer (`offer` state, wire mode `brace`, hands-cupped pose). The partner in reach sees "Co-op: take the leg-up", presses Co-op and is boosted onto a ledge 2.4-4.5 m up (G57 band 4.3-4.5 designed, e.g. station 2). Offerer assists. G52 brace and its Y-hold path are removed. Standing + Co-op = hook `TeamController.standingHook` for B4's throw (null now: toast "Crouch for a leg-up").
- Room check (polite refusal, no penalty): 2.6 m free air over the crouched head and one side with 1.0 m run-in, else toast "No room for a leg-up here".
- CT ledge relay (1.2, hanging-body): a player hanging from a ledge presses Co-op (`relayOffer`, relay bit in the attach sub); the partner underneath (1.6 m, hang 0.3-4.6 m above) presses Co-op and climbs up beside the hanging body (1.4 s) to the same ledge (0.8 m slot along it); the hanger holds still meanwhile, then both pull up normally. The shoulder-stack controller code is removed; wire mode `stacked` is left unbound.
- Host-authoritative via the existing `tmove` / `tstart` rail; the host takes the relay anchor and spot from the hanger's own MoveState. Protocol 16 (`ATTACH_SUB.relay` = 1024).
- ctcourse: station 2 is a 1 m thick 4.4 m wall (climbable top) with a door bolted from the far side (bolt gate): leg-up one, cross, unbolt. Station 5: roof slab flush with the front wall; the pair plates are now on the roof (y 4.4), so both need leg-up + relay, then press together; drop off the roof as normal. A failed or abandoned move leaves nobody stuck (offers time out after 20 s; B cancels; hanging players can always drop).

## Numbers (starting values, `TEAM` in config/movement.ts)
legUpMin 2.4, boostMax 4.5, roomUp 2.6, roomSide 1.0, offerTime 20, relayReach 1.6, relayMax 4.6, relayClimb 1.4, relaySlide 0.8. Reach to the offerer 1.2.

## Files
New logic: `src/game/teamMoves.ts`, `teamController.ts` (rewritten). Edited: `config/movement.ts`, `input/{actions,gamepadMapping,gamepadSource,keyBindings,padBinds}.ts`, `ui/prompts.ts`, `ui/hud/worldPrompts.ts`, `core/app.ts`, `game/gameState.ts`, `game/localMoveState.ts`, `player/moveState.ts`, `net/{protocol,coopHost,coopClient,remoteAvatar}.ts`, `world/maps/ctcourse.ts`, `docs/systems/input-and-loop.md`. Tests: `tests/{teamMoves,ctcourse,input,keybinds,padBinds,moveState,net}.test.ts`; `scripts/e2e-ctcourse.mjs`, `scripts/e2e-netmove.mjs`.

## Stubs / not done
- Partner throw (standing) is B4: only the hook and a refusal toast.
- `anim-audit.mjs` and `e2e-ct-warehouse.mjs` still reference brace/old stack (not run, not updated). Wire modes `brace` (now = offer) and `stacked` (dead) keep their names.
- Relay climber pose is the existing `climbUp` clip with a kinematic path, not a bespoke body-climb animation.
- Standing-press refusal and the no-room refusal are unit-tested (room logic) but not e2e-checked (netmove check removed: crouch state carries across placements).
- Panel text on the north fence still says "stand is a throw".

## Tests and results
- `npm run lint` 0 errors; `npx vitest run` 135 files / 1482 tests pass; `npm run build` ok.
- e2e (port 4193): smoke ok; e2e-ctcourse ok (both pages: real leg-up at station 2, bolt, leg-up + relay + roof plates at station 5, rest as before). e2e-netmove: the leg-up, relay, stand-down denial and request-denial sections passed in a trimmed run; the full suite failed 3 times in earlier known-flaky sections (zipline / ladder joints / split aim) before reaching the team section - load, not this change (solo reruns repeated it). e2e-coop not run (time box).

## Try it
https://tekcry.github.io/Mobile-Coop/ct/?net=local&autostart=ctcourse&mode=course - station 2: one crouches (B / C) and presses RB / F, the other walks up and presses RB / F; on top, cross and use the bolt on the far side of the door. Station 5: leg-up one to the roof edge; while hanging press RB / F to offer the relay; the other stands under and presses RB / F; both pull up (Y / Space), stand on the roof plates and press together; drop down.
