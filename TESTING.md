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

## Phase 6 - Progression and saves
- [ ] Main menu badge shows level 1, 0 XP, 500 cr on a fresh install.
- [ ] Armory: LB/RB (or tap tabs) cycles weapons; locked weapons show their requirement; pressing a locked button explains why.
- [ ] Buy a rifle Damage upgrade: credits drop, a pip lights, the Damage/DPS bars grow (green delta).
- [ ] Play a Wave match, get kills, die: results list XP/credit lines, the XP bar animates, level-ups and new Store items are announced.
- [ ] Store: after reaching level 2, the SMG is buyable; buy it and equip it as primary in the Armory; next match starts with it.
- [ ] Buy an attachment (e.g. Red Dot at level 2) in the Store, then fit it in Armory > Attachments.
- [ ] Close the app completely and reopen (also offline): level, credits, unlocks and loadout are kept.
- [ ] Settings > Data > Export save file: on iPhone/Android the share sheet appears (save to Files/Drive); on desktop a .json downloads.
- [ ] Settings > Data > Import save file: pick the exported file, confirm, progress is restored.
- [ ] Settings > Data > Reset all progress: confirm dialog, then a fresh profile.

## Phase 7 - Customiser and cosmetics (Main menu > Customise)
- [ ] The avatar stands on the right with the weapon; drag on it (touch) or use the right stick (controller) to rotate.
- [ ] Every tab (Body, Torso, Legs, Gear, Pattern, Tag, Emotes) works by tap and by controller (LB/RB tabs, d-pad, A).
- [ ] Changing an owned option updates the preview instantly and is still there after leaving and reopening.
- [ ] A 🔒 option previews with a lock note; leaving the screen reverts it. If affordable, the note's Unlock button buys and keeps it.
- [ ] Pattern tab: pick Stripes/Camo (after unlocking) - the shirt and trousers show the pattern; pattern colour swatches change it.
- [ ] Tag tab: Random callsign (controller-friendly) or type a name (touch keyboard); title/emblem/colour show on the main-menu badge.
- [ ] Emotes tab: assign slots; the preview plays the emote. In a match press d-pad right/down/left, or use the emote bar in the pause menu.
- [ ] Armory > Camo: after 10 rifle kills Woodland is available; the camo shows on the gun in the menu and in matches.
- [ ] FPS unaffected with patterned avatars and camo weapons on screen.

## Phase 8 - Audio, polish, performance
- [ ] Tap once on the first screen: menu music (soft pad) starts. Volume sliders in Settings > Audio change master/effects/music/interface live.
- [ ] Menu navigation by controller ticks; selecting confirms; Back plays a falling tone; locked items buzz.
- [ ] Each weapon sounds different (pistol snap, SMG rattle, rifle crack, shotgun boom, sniper crack + tail). Reload clicks match the animation length.
- [ ] Enemy gunfire comes from the correct side (wear headphones) and is quieter/muffled when far.
- [ ] Explosions boom and shake; heavies make a rising whine before firing; runners swipe.
- [ ] Music gets a beat when several enemies are active and calms down between waves.
- [ ] Ground/walls show a faint grid and darker wall bases; enemies flash white when hit; brass flies out of the gun; landing from the platform puffs dust.
- [ ] Settings > Video > Quality: Auto/Low/Medium/High. FPS overlay line `quality` shows the active level. On Auto, a heavy fight on a weaker phone drops the level instead of stuttering; it climbs back after calm.
- [ ] 10-minute wave session: no gradual slowdown or audio crackle (memory/GC stable).

## Phase 9 - Co-op (needs 2+ devices online)
- [ ] Main menu shows Co-op. In airplane mode the entry says Offline and the Co-op screen shows the offline notice; Retry works once back online. Single player still works offline.
- [ ] Device A: Co-op > Host a room. A 5-character code appears. Share link opens the share sheet (or copies the link).
- [ ] Device B: Co-op > Join with code; enter the code with the on-screen keypad by touch, then again by controller (d-pad + A). Or open the shared link: it goes straight to the lobby.
- [ ] Both lobbies list both players with their names/tags; B's Ready toggles the state on A; Start is blocked (with a toast) until B is ready.
- [ ] Host changes mode/map/difficulty; B sees it update. Start: both load the same map.
- [ ] In the match: each sees the other's avatar (their customised look), walking/crouching/rolling/aiming animations, weapon swaps, muzzle flashes and tracers; teammates show on the minimap.
- [ ] B's hits register on enemies (hit markers immediately, kill marker when the host confirms); B's kills appear in the kill feed on A as "<name>: ... down".
- [ ] Enemies move smoothly on B (no rubber-banding at ~100-200 ms ping). B's grenades damage enemies.
- [ ] B takes damage with direction indicators; B's health/shield bar matches the host's view. B downed: lies on the ground on A; revived when the wave is cleared.
- [ ] Pickups taken by either player disappear for both; B gets the heal/ammo.
- [ ] Emotes from either player play on the other's screen.
- [ ] Pause menu on either device does not freeze the match.
- [ ] Everyone downed: both get results; B's results show B's own kills and rewards; B's level/credits persist after reload.
- [ ] Play again returns both to the lobby with ready states cleared.
- [ ] B closes the app mid-match: A gets "<name> left"; reopening the link drops B back into the running match.
- [ ] A (host) quits: B gets "Host left" and returns to the menu.
- [ ] 3 and 4 players: everyone sees everyone; a 5th gets "Room full".

## Overhaul - avatars, movement, cover (Proving Grounds is the test map)
- [ ] Silhouettes: player, enemies (runner lean, grunt average, heavy broad with plates), coop teammates and the customiser preview share one realistic build; everything reads round at gameplay distance (no boxy parts).
- [ ] Joints: no gaps or seams at shoulders, elbows, hips, knees or neck while walking, crouching, rolling, reloading, peeking and emoting.
- [ ] Customiser: Average / Lean / Athletic / Broad change build only slightly; heads, hair, helmets, packs, colours, patterns and tag work; preview matches in-game.
- [ ] Two-hand grip on every weapon (left hand on the foregrip); spare guns visible on the back / pistol on the hip; reload moves the off hand to the magazine.
- [ ] Movement: light stick walks (~1.4 m/s), full stick jogs (~3.5), sprint (~5.5) only after a short wind-up and cannot fire; after sprinting there is a brief delay before ADS/fire. Stops ease out, no sliding. Jump is low and committed. Roll has a fixed length and cooldown.
- [ ] Feet do not slide when walking, jogging, strafing, backpedalling or turning on the spot; torso leans into acceleration and turns; head follows the aim.
- [ ] Camera: smooth follow (no jitter on stairs/slopes), smooth shoulder swap and ADS zoom.
- [ ] Cover snap: walk up to low cover, prompt shows; hold B (pad), tap the cover button (touch) or C (keyboard): character eases in (no teleport), crouched, facing the wall, not clipping into it.
- [ ] Strafe along cover in both directions; stops at edges without falling off or clipping; inside corners stop; outside corners (building walls) pivot round when you keep pushing.
- [ ] Low cover: hold aim to pop up and shoot over, release to drop; fire without aim = blind fire over the top (inaccurate).
- [ ] High cover: aim near an edge leans out past it and moves the camera to that shoulder; release returns and restores the shoulder. Enemies can only hit what is exposed.
- [ ] Vault: A/jump at low cover vaults over smoothly when the far side is clear.
- [ ] Leaving: B / C / button again, sprint, roll, jump at high cover, or backing away.
- [ ] Settings > Gameplay: auto-snap on approach; cover-to-cover dash (cover button while pushing towards the next cover).
- [ ] Stairs and slopes near cover, narrow gaps between crates, pillars (rounded surfaces): no snapping into geometry; dying in cover ragdolls normally.
- [ ] Touch vs controller parity: every cover action available on both; prompts show the right glyphs; menus still navigable.
- [ ] Grunts and heavies take cover behind the same walls, crouch behind low cover and peek out at high-cover edges.
- [ ] Debug overlay (F3 / 3-finger tap): Skeleton shows bones, capsule and hit volumes aligned to the body; Tune sliders change speeds live.
- [ ] Frame time with 8 enemies in the open and with 8 in cover stays within budget (debug overlay draws/ms).
