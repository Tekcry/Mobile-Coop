# Manual device test checklist

Run on your phone (and MFi controller where noted). Tick each item. Use `?debug=1` to show the FPS overlay,
or tap with three fingers.

## Phase 1 - Scaffold
- [ ] Open the GitHub Pages URL in Safari (iOS) / Chrome (Android). Boot bar fills, physics boxes fall and settle.
- [ ] Portrait: "Rotate your device" overlay shows. Landscape: it hides.
- [ ] Three-finger tap toggles the debug overlay. FPS reads 58-60 with mostly green bars.
- [ ] Add to Home Screen. Launch from the icon: icon is the orange crosshair, app opens fullscreen with no browser bars.
- [ ] Airplane mode, close and relaunch the installed app: it still boots and runs (offline precache).
- [ ] Pinch and double-tap do not zoom the page. Long-press shows no context menu.

## Phase 2 - Input and menus
Touch:
- [ ] Main menu: tap Settings; tabs switch by tap; sliders drag; toggles and choices change; the round back button (top right) closes it.
- [ ] Controls test: left thumb anywhere on the left 40% spawns the stick; readout `move` follows. Push past the rim forward shows `sprint`.
- [ ] Right thumb drag on the right side changes `look yaw/pitch` while the left thumb moves (true multi-touch).
- [ ] Hold Fire and drag: `fire` held and look changes at the same time.
- [ ] Every button shows in `held` when pressed. Pause button opens the pause menu; Quit returns to menu.
- [ ] Settings > Touch > Edit button layout: drag controls, Larger/Smaller, Reset all, Done. Layout persists after app restart.
- [ ] Opacity and Size sliders change the in-game buttons.

MFi / Bluetooth controller:
- [ ] Pair controller, open app, press any button: "Controller connected" toast appears, yellow focus ring appears, prompts show A/B (or ✕/○ for DualShock/DualSense).
- [ ] D-pad and left stick move focus in the main menu; A opens Settings; LB/RB switch tabs; left/right adjust sliders and choices; B backs out to the main menu with focus restored.
- [ ] Settings > Touch > Edit button layout with the controller: A grabs a control, d-pad moves it, LB/RB resize, A drops, B exits.
- [ ] Controls test: touch controls hidden while using the controller; sticks and every button appear in the readout; Start opens pause; B resumes; Quit flow works by controller only.
- [ ] Settings > Controller > Test vibration rumbles (where the browser supports it; iOS Safari currently does not).
- [ ] Turn the controller off: "Controller disconnected" toast; touching the screen shows the touch controls again.
- [ ] Touch the screen while a controller is connected: touch controls reappear; press a controller button: they hide.

## Phase 3 - Player and camera (Main menu > Free roam)
- [ ] Move with the left stick / touch stick: the character runs, turns smoothly, legs and arms animate.
- [ ] Push the touch stick past its rim forward (or click L3): sprint is faster.
- [ ] A / jump button: jumps about 1.2 m, lands cleanly.
- [ ] B / crouch while standing still: toggles crouch (camera lowers). B while moving: forward roll.
- [ ] West yard (yellow/red blocks): walk onto the three yellow steps without jumping; the two red ones block you.
- [ ] East ramps: the two grey ramps are walkable, the red steep one is not.
- [ ] North platform: climb the stairs (smooth, no bouncing) and the ramp on the other side.
- [ ] South-west tunnel: crouch-walk through; you cannot stand up inside.
- [ ] Walk into crates and barrels: they get pushed and tumble.
- [ ] Right stick / right-side drag rotates the camera; up/down limits feel natural; invert-Y setting works.
- [ ] Shoulder button (or R3) swaps the camera to the other shoulder smoothly.
- [ ] Hold LT / Aim: camera zooms in over the shoulder, character faces where you aim.
- [ ] Back the camera into a wall: it moves in front of the wall instead of clipping through; the character hides if the camera gets too close.
- [ ] FPS overlay stays at 58-60 while running around the map.

## Phase 4 - Shooting and HUD (Main menu > Free roam)
- [ ] Fire (touch Fire / RT): rifle fires automatically with tracers, muzzle flash and impact sparks/decals.
- [ ] Hold Fire and drag on the touch Fire button: you can steer the aim while firing.
- [ ] The crosshair widens when moving and while firing, tightens when aiming (ADS / LT); turns red over a target.
- [ ] Hit markers flash on hits, yellow on headshots, red on kills. Targets fall over and stand up again after ~3 s.
- [ ] Swap (⇄ / RB / LB) cycles rifle, SMG, shotgun, sniper, pistol; HUD name and ammo update.
- [ ] Pistol, shotgun and sniper fire once per press; SMG and rifle are automatic.
- [ ] Reload (touch ↻ / X) shows the ring around the crosshair and refills the magazine.
- [ ] Sniper with ADS zooms strongly; distant target hit after a short travel time.
- [ ] Grenade (touch grenade / d-pad up): arcs, bounces, blinks faster, explodes, pushes crates, shakes the camera.
- [ ] Shoot a red barrel: it explodes; standing close damages you (red arc shows the direction, vignette at low health).
- [ ] Shield (blue) recovers a few seconds after taking damage. At zero health: DOWN banner, respawn after 3 s.
- [ ] Aim assist: Settings > Controller (or Touch) > Aim assist High vs Off - near a strafing target the aim slows and follows on High.
- [ ] Controller rumbles on shots/explosions where supported. Phone vibrates lightly on touch buttons (Android).
- [ ] Minimap rotates with the camera, red dots for targets; compass letters move as you turn.
- [ ] FPS overlay stays near 60 while firing the SMG continuously and throwing grenades.

## Phase 5 - Enemies and modes (Main menu > Play)
- [ ] Play screen: change Mode / Map / Difficulty by tap and by d-pad left/right; Deploy starts the match.
- [ ] Wave Survival on Dust Depot: "WAVE 1" banner, enemies arrive from off-screen and path around buildings (they don't walk through walls).
- [ ] Grunts duck behind low walls and pop up to shoot; behind tall walls they step out sideways. Flank one: it leaves cover.
- [ ] Runners (yellow hoodies) sprint in zigzags and hit you up close. Heavies are slow, spin up, then hose bullets; body shots do less.
- [ ] Killed enemies collapse as ragdolls and sink away after a few seconds.
- [ ] Wave cleared: bonus banner, pickups (green ammo, white/red health) reappear; walking over them refills.
- [ ] Die: DEFEAT results screen with stats; Play again restarts; Main menu returns. Works by controller and by touch.
- [ ] Mission: enemies start unaware; shooting nearby alerts them. Hold Y / Interact at a terminal (progress %), do both, grab the intel on the central platform, then stand in the green beacon until extraction reaches 100% -> VICTORY.
- [ ] Mission deaths respawn you at the last objective with a lives counter.
- [ ] Minimap/compass show objective markers (yellow) and pickups (green).
- [ ] FPS stays above ~55 with 8-10 enemies fighting.
