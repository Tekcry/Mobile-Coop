# F1a - controls, aim, selection wheel, camera (CT prototype fix slice)

Branch `feature/ct-prototype`, nothing committed. Prototype only (G4): every number is a starting value (G10). Michael's
picks: playtest 1 (cam-2, cam-3, cam-5, cam-6, pad-1, pad-2, gog-1 vision flip rule), "Yes, CT scheme", draw "About half",
D-pad up / down speed, G181 selection wheel. Protocol stays 16 (no wire change).

## Final pad table (Xbox names)

| Button | Holstered | Drawn (aiming mode) |
|---|---|---|
| X | draw (a toggle, no held aim) | holster |
| LT | knockout (palm strike, non-lethal) | secondary fire (stub: fires like RT, no secondary fire exists) |
| RT | lethal palm strike (kills; one hit, any guard) | primary fire |
| A | interact / context (doors, grab, takedown) | reload (A is not interact while drawn) |
| L3 | back to wall | swap shoulder |
| R3 | - | zoom in / out (scoped weapon only; normal aim never zooms, G29) |
| B / Y | crouch (hold while running = roll) / jump | same |
| LB | tap = switch weapon (next), hold = selection wheel | same |
| RB | co-op action | same |
| D-pad up / down | max-speed rocker up / down (stick push also sets the speed; mouse wheel too) | same |
| D-pad left | vision on / off (the mode picked on the wheel, night by default, never cycles) | same |
| D-pad right | quick-use the selected gadget (hold aims the arc, release throws; placed ones go on the press) | same |
| View / Menu | mission device (no action yet) / pause | same |

## Final keyboard and mouse table

| Input | Action |
|---|---|
| RMB (click) | draw / holster toggle |
| X | draw / holster toggle (remappable `draw`) |
| LMB | fire (holstered: the lethal palm strike) |
| Z | knockout (holstered) / secondary fire stub (drawn) (`knockout`) |
| B | zoom while aiming, scoped weapon only (`zoom`) |
| V | swap shoulder while aiming (`shoulder`, unchanged) |
| R | reload (works holstered: draws to low ready, reloads, holsters) |
| Tab tap / hold | switch weapon (next) / selection wheel; mouse picks, release selects |
| T / Q | next / previous weapon (`nextWeapon` moved from X to T) |
| N | vision on / off (the wheel's mode) |
| G | quick-use selected gadget |
| Mouse wheel, `=` / `-` | max speed up / down |
| Left Shift | back to wall |
| E, Space, C / Ctrl, F / PageDown, 1-7 | interact, jump, crouch, co-op action, gadget picks (unchanged) |

## What was built

1. **CT aim scheme.** `Player.ads` is now a toggle (`adsLatch`, flipped by the new `draw` action); `adsWanted` is the raw
   request (the legacy held `ads` action still feeds it so scripted tests and tools keep working; no real source writes it).
   A climb / traversal holsters for good, a hard landing only lowers it for the landing, death resets. New actions `draw`,
   `altFire`, `zoom` (`src/input/actions.ts`). The pad source turns A into `reload` while drawn (and drops `interact`),
   and LT into `fire` while drawn (secondary-fire stub). KBM source: RMB click taps `draw`, Z (`altFire`) fires while drawn.
2. **Lethal / knockout palm strike.** `StrikeController.fixedUpdate(dt, pressed, lethal)`: RT / LMB is lethal
   (`Enemy.killOutright`, new), LT / Z is the existing knockout. Solo and host resolve it. **Stub:** a co-op client's strike
   is a knockout on the host (the committed-move wire has no lethal flag; adding one would bump the protocol to 17).
3. **Draw speed.** `DRAW_TIME_SIDEARM` 0.6 -> 0.3 s, `DRAW_TIME_PRIMARY` 0.75 -> 0.4 s (`weapons/drawState.ts`),
   `CARRY.raiseTime` 0.8 -> 0.45 (pistol x0.7 = 0.32 s, trigger live at 85 %). Holster unchanged (0.55 s). The aim camera
   leads the gun by 0.9 x the draw time.
4. **D-pad.** Up / down = `speedUp` / `speedDown`; left = `vision`, right = `grenade`. `VisionState.toggle()` turns
   `selected` on / off; `select()` (the wheel) switches live goggles to another mode with `change = 'switch'`
   (gog-1: the goggle flip belongs to `on` / `off` only). **Stub:** the flip visual itself is not rebuilt here (A5 made every
   change an instant cut; `VisionState.change` tells the future animation which kind of change it is).
5. **Selection wheel (G181).** Pure logic `src/game/selectionWheel.ts` (ring build, `segmentAt`, vision stack by cursor
   length, `SelectionWheel` cursor / pick, labels); open / close / picks in `GadgetSystem` (`sel`, `ring`, `applyPick`, no
   time slow, the left stick still walks, LB / Tab tap = next weapon via `inp.tap('swapNext')`); DOM in
   `src/ui/hud/gadgetWheel.ts` (the old gadget wheel class rewritten, the remote-feed overlay kept) with styles in
   `styles.css` (`.sw-*`). Teal translucent tiles, vision stack above the top tile (night nearest the ring, thermal, electro:
   the further the cursor, the higher), guns with `loaded / reserve`, the 7 kit gadgets with `xN` (empty ones dimmed), label
   right of the ring (name white, kind teal), hint box left naming the key. Own glyphs (the gadget icons, text), no lethal /
   non-lethal centre toggle. `PlayerWeapons.switchTo(i)` swaps to a named gun.
6. **Camera.** `CAMERA.shoulderHip` 0.15 -> 0.32 (cam-2), aim `shoulderAds` 0.16 -> 0.42, `boomAds` 0.4 -> 0.35, `aimEyeDrop`
   0.08 -> 0.24 (lower and over the shoulder, cam-3). The weapon goes to the left hand on a shoulder swap through the
   existing `rig.openLeft` (local rig only; no arm / hand code touched). **Stub:** remotes still see it in the right hand
   (the wire has no aim side).
7. Zoom: `PlayerWeapons.zoomOn` toggles on `zoom` while aiming a scoped weapon; `cam.adsZoom` is 1 otherwise.

## Files

Edited: `src/input/{actions,padBinds,gamepadMapping,gamepadSource,keyBindings,keyboardMouseSource}.ts`,
`src/core/app.ts`, `src/ui/prompts.ts`, `src/player/player.ts`, `src/game/{gameState,gadgetSystem,strikeController,vision}.ts`,
`src/ai/enemy.ts`, `src/weapons/{drawState,weaponCarry,playerWeapons}.ts`, `src/config/camera.ts`,
`src/ui/hud/gadgetWheel.ts`, `src/styles.css`, `docs/systems/input-and-loop.md`. New: `src/game/selectionWheel.ts`,
`tests/selectionWheel.test.ts`. Not touched: arms / hands / `solveArm` / `AIM_POCKET` / `weaponPivot`, `src/ui/screens/**`,
`src/operators/**`.

## Left for the menu job (`src/ui/screens/controlsScreen.ts`, not edited)
- The fixed trigger rows still read `PAD_FIXED.aim` ("Aim"): LT is now the knockout / secondary fire (kept under the old
  key so the screen compiles). The remappable rows come from `PAD_BINDS` / `BINDS` and already show the new labels.
- Pad bind ids: `reload` and `shoulder` are gone (`draw` and `zoom` are new; L3 `wall` carries wall + shoulder swap).
  Saved pad layouts with the old ids ignore them (the verb falls back to its default), no `SAVE_VERSION` bump.
- Dead settings: `gameplay.adsToggle` (aim is always a toggle now), `gamepad.adsMultiplier` still applies while drawn.

## Tests changed
- Unit: new `selectionWheel.test.ts` (ring, `segmentAt`, vision stack, cursor / pick, labels, vision toggle / select);
  `padBinds`, `input` (incl. the doc binding table), `conflicts`, `settings`, `tactical` (raise 0.3-0.5 s, framing numbers).
- E2E scripts: `e2e-pad` (X draw toggle, LT secondary stub, RT lethal, LT knockout, A reload, D-pad up / down speed, left
  vision, right gadget, LB tap = weapon, LB hold = wheel with the right stick, the wheel picks electro, L3 shoulder only
  aiming, left hand, X leaves the wall, remap of `draw` / `zoom`), `e2e-mouse` (RMB click draws and holsters, T swaps, N toggles,
  Z knockout, LMB lethal, KBM table), `e2e-gadgets` (wheel scenario), `e2e-combat`, `e2e-weapon-audio`, `e2e-traverse`, `e2e-move`,
  `e2e-ct`, `e2e-netmove`, `e2e-ct-warehouse` (LT aim replaced by the held legacy `ads` action or A / RT presses).
  Stale ones fixed on the way: the KBM table's `ping` (now `coop`), the medkit station's +40 (now heals to full), the
  holstered-reload draw bound (1.2 s).

## Results
- No wire change: PROTOCOL_VERSION stays 16, ground MoveState.sub bit 128 untouched (feature/weapons owns the left-shoulder bit and protocol 17). The shoulder-side hand is local only: on merge, drive `rig.openLeft` (gameState, near the wall `leftHand` line) from their field instead of `cam.shoulder`.
- `npm run check`: lint, all unit tests and build pass.
- E2E (port 4193, one at a time, software GL): smoke ok, e2e-pad ok (after fixing three load-sensitive assertions), e2e-mouse ok, e2e-combat ok, e2e-ctcourse ok on rerun (first run timed out at station 5 client pull-up under load).

## What Michael should try (`https://tekcry.github.io/Mobile-Coop/ct/?autostart=warehouse&mode=sandbox`)
1. Pad: X draws (about 0.3 s pistol, 0.4 s rifle) and stays drawn; X again holsters. RT / LT fire drawn; holstered RT is the
   lethal strike, LT the knockout. L3 swaps shoulder only while drawn, and the gun changes hands.
2. Explore camera sits more to the right; aim sits lower and well over the shoulder.
3. Hold LB (Tab on keyboard): the wheel opens over the live game; right stick (mouse) up picks the vision stack, further out
   goes night, thermal, electro; release selects. D-pad left (N) turns that vision on and off. LB tap switches weapon.
4. D-pad up / down change max speed; D-pad right quick-uses the selected gadget.
5. Keyboard: RMB click or X draws / holsters, LMB fires (lethal strike holstered), Z knockout, Tab for the wheel.
6. Known gaps: no goggle flip visual, no real secondary fire, remotes see the gun in the right hand, co-op clients cannot
   kill with the strike, the default kit has no scoped weapon, so the zoom toggle is untested in play.
