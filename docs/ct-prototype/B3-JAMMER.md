# B3 - held jammer, camera, laser (2026-10-19)

## Built
- **Held pistol jammer (G152).** Pistol drawn, hold LT (pad) / Z (keyboard `altFire`) aimed at one camera or laser: while held, charged and standing still, the target is jammed (camera blind, LED dark; laser off). The charge drains while jamming and refills when released. LT drawn no longer fires (the F1a stub is gone); holstered, LT is still the knockout.
- **Gun light, no HUD element.** A small glow on the pistol model: red idle, green when the aim is on a jammable target, bright green while jamming, dark red when the charge is too low to start. Local only (the partner's gun shows no light: stub).
- **EMP removed from the kit and the wheel.** `GADGET_IDS` is now 6 (frag, gas, flash, noise, sticky cam, mine). The `emp` def, `GadgetId`, the blast code and `NetGadget` stay (maps, tests, loadout screens read them); carry 0, unbound.
- **Station 3 camera.** A real `security` camera over the door (2.4 m up, sweep 240-300 deg, existing `src/security` code, not edited). It raises the alarm stage (G125, 1 to 3, never ends the run; banner, radio line, `alarms` stat) when its meter fills. Under it is a blind spot (vFov 45 deg, SN04) marked on the floor: the pocket. Both players must stand in the pocket for the door to open (course flag `s3-clear`, `flag` gate). One has to jam while the other crosses, then swap.
- **Station 4 lasers.** A laser device (3 beams, 0.35 / 0.9 / 1.45 m) across the doorway. A touch costs 15 health plus a radio line, never below 1 HP, 2 s cooldown per player. The held jammer switches it off. The pair plates stay as the placeholder way past (B4 replaces them); the door opens by plates, then the doorway laser must be jammed or taken as a hit.
- **Co-op.** Host-authoritative. The client sends `jam` (target id, on change and every 0.25 s while held); the host steps charge, the stand-still rule (client speed from `pstate`), reach, camera mode, laser state, laser hits and the alarm. The host sends the state as a new optional `sec` field of the `course` message (camera clock, who jams what, charges, alarm). The client rebuilds the camera bodies from the map data (view only), follows the host clock and jam list, and draws the beams. Both pages show the same blind camera and dark laser.

## Numbers (G10 starting values) - `src/game/jammer.ts`
Charge 20 s, drain 1/s, refill 1.5/s, minimum 1.5 s to start. Still means horizontal speed 0.45 m/s or less. Reach 20 m, aim cone 9 deg half-angle (a held jam keeps its target through 2.5x). Client intent stale after 0.7 s. Laser: 15 damage, 2 s cooldown, reach 0.3 m, body 1.75 m standing / 1.1 crouched. Alarm gap 5 s, max stage 3. Camera: existing numbers (range 18, 70 x 45 deg, think 4 Hz).

## Wire change (protocol 16 to 17)
New client message `{ t: 'jam', tgt }` (whitelisted in `session.ts`, parsed in `protocol.ts`, handled in `coopHost.ts`) and the optional `sec` field on `course`. No ground sub bit, no `PlayerState` change. `PROTOCOL_VERSION` is 17 (feature/weapons also takes 17: expect a trivial merge on that constant and the five version assertions in `tests/net.test.ts` / `tests/moveState.test.ts`).

## Files
New: `src/game/jammer.ts` (pure), `src/game/ctDevices.ts` (host authority + client mirror), `tests/jammer.test.ts`. Edited: `src/game/gameState.ts` (`ctDev`, `sendJam` hook, local trigger step), `src/game/modes/courseMode.ts` (host `CtDevices`, `sec` on the wire, client mirror), `src/game/modes/gameMode.ts` (`onRemoteJam`), `src/game/course/courseWire.ts`, `src/net/{protocol,session,coopHost,coopClient}.ts`, `src/world/mapDef.ts` (`lasers`, `passZones`), `src/world/maps/ctcourse.ts`, `src/game/gadgets.ts`, `src/input/{gamepadSource,keyboardMouseSource}.ts`, `scripts/e2e-ctcourse.mjs`, `scripts/e2e-pad.mjs`, `tests/{gadgets,net,moveState}.test.ts`.
Not touched: `solveArm`, wrists, grips, `AIM_POCKET`, `weaponPivot`, `src/security/**`, `src/ui/screens/**`, `src/operators/**`.

## Stubs / not done
- Jamming a **light** is not built (camera and laser only); the target type exists in `JamTarget` for it.
- The partner's gun shows no jam light; the partner sees the camera and laser state.
- Camera noise / luring guards, laser breaker, jam crackle: none.
- No lighting pass at station 3 beyond one extra lamp. The camera pocket is 1.0 x 2.4 m.
- Station 4 has no skip screens; the laser is only in the doorway, so B4's throw over the wall skips it (as intended).

## Tests
Unit: `tests/jammer.test.ts` (drain, refill, minimum start, stand-still rule, target pick, laser hit and height, floor HP, cooldown, alarm cap, `jam` parse, the map's camera blind spot and doorway laser). Updated: `gadgets` (6 ids, EMP not carried), protocol-version assertions (17). E2E `e2e-ctcourse`: station 3 (camera raises the alarm stage; host jams and the client page sees the camera blind; client crosses without a reaction; swap; the pocket opens the gate; release shows the camera online on both pages) and station 4 (laser touch costs the client 15 health, jammed laser costs nothing, both pages see it off / on). `e2e-pad`: LT drawn fires no round.

## Results
`npm run check`: 0 lint errors (41 pre-existing warnings), 149 test files / 1665 tests pass, build ok. E2E on port 4193, one at a time: smoke ok, e2e-ctcourse ok (489 s), e2e-gadgets ok, e2e-darkness ok, e2e-pad ok.

## Try it
`https://tekcry.github.io/Mobile-Coop/ct/?net=local&autostart=ctcourse&mode=course` in two tabs (first hosts). At station 3 stand in the camera's view for a few seconds (alarm stage banner). Then: both pads, LB to the pistol, X to draw, aim at the camera, hold LT and stand still (the gun light turns bright green); your partner walks to the marked spot under the camera. Partner draws and holds LT up at the camera; you let go and join them: the door opens. At station 4 walk into the doorway beams (radio line, health drops), or aim at the laser and hold LT first.
