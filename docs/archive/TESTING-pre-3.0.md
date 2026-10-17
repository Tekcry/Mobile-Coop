# Manual device test checklists - before 3.0.0 (archived from TESTING.md, unchanged)

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
- [ ] Movement: superseded by the tactical model below (1.1.0).
- [ ] Feet do not slide when walking, jogging, strafing, backpedalling or turning on the spot; torso leans into acceleration and turns; head follows the aim.
- [ ] Camera: smooth follow (no jitter on stairs/slopes), smooth shoulder swap and ADS zoom.
- [ ] Cover snap: walk up to low cover, prompt shows; hold B (pad), tap the cover button (touch) or C (keyboard): character eases in (no teleport), side-on with the shoulder to the wall (kneeling at low cover), not clipping into it.
- [ ] Strafe along cover in both directions; stops at edges without falling off or clipping; inside corners stop; outside corners (building walls) pivot round when you keep pushing.
- [ ] Low cover: hold aim to pop up and shoot over, release to drop; fire without aim = blind fire over the top (inaccurate).
- [ ] High cover: aim near an edge leans out in place (feet stay in cover) and moves the camera to that shoulder; release leans back and restores the shoulder. Enemies can only hit what is exposed.
- [ ] Vault: A/jump at low cover vaults over smoothly when the far side is clear.
- [ ] Leaving: B / C / button again, dash with no cover marked, jump at high cover, or a firm push away (a light push does not leave).
- [ ] Settings > Gameplay: auto-snap on approach; cover-to-cover (on by default, see below).
- [ ] Stairs and slopes near cover, narrow gaps between crates, pillars (rounded surfaces): no snapping into geometry; dying in cover ragdolls normally.
- [ ] Touch vs controller parity: every cover action available on both; prompts show the right glyphs; menus still navigable.
- [ ] Grunts and heavies take cover behind the same walls, crouch behind low cover and peek out at high-cover edges.
- [ ] Debug overlay (F3 / 3-finger tap): Skeleton shows bones, capsule and hit volumes aligned to the body; Tune sliders change speeds live.
- [ ] Frame time with 8 enemies in the open and with 8 in cover stays within budget (debug overlay draws/ms).

## Tactical overhaul (1.1.0) - Proving Grounds, then a Wave match
Movement (SWAT-style):
- [ ] Light stick creeps (~0.6 m/s), full stick is a tactical walk (~1.2), holding full stick forward eases into a brisk move (~2.0) after ~0.6 s. Strafing is a little slower, backing up slower still. Nothing runs except the dash.
- [ ] The body faces the aim (weapon leads); feet sidestep without crossing; turning has weight (slower while aiming); reversing at speed plays a short pivot.
- [ ] Starts and stops are eased; no sliding. Crouch (~0.3 s) and, when still, a one-knee kneel (~0.4 s).
- [ ] Dash: LS click / dash button / flicking the touch stick past its rim, or Shift. Short wind-up, rush (~5.5 m/s, up to 1.5 s), braking recovery; no firing from wind-up to recovery. Repeated dashes drain stamina (HUD bar under health) and then lock out briefly.
- [ ] Jump is contextual: A / jump button / Space vaults low cover (red/orange walls), climbs a 0.9 m block, steps up a 0.6 m block, drops off the platform edge. In the open it does nothing. The HUD prompt names the action before you press.
- [ ] Footstep noise (HUD bars) rises with speed; creeping up behind an unaware grunt does not alert it; dashing nearby does.
Weapon ready positions:
- [ ] Out of combat the weapon sits at low ready (muzzle down); near a wall or doorway it pulls in to compressed ready; in a tight corridor high ready. It only comes up while aiming or firing.
- [ ] Firing from ready raises first (rifle ~0.15 s, pistol quicker, sniper slower); it stays up ~0.6 s after the last shot, then eases down. A semi-auto tap during the raise still fires once raised.
- [ ] Reloading slows you to a creep.
Camera:
- [ ] Always a tight over-the-shoulder view: head and shoulders upper left, crosshair clear; FOV 75 at 16:9 (wider phones see more at the sides, not less height). ADS pushes in. Crouch lowers, dash widens slightly, lean shifts with the body.
- [ ] Shoulder swap (RS click) takes about a quarter of a second, no snapping. In tight spaces the camera pushes in and hides the head rather than clipping.
Corners and doorways (north-west lane):
- [ ] Walking along the free-standing wall towards its end eases you out to ~1 m from it (slicing the pie) with the weapon compressed.
- [ ] Aiming with the wall end in front leans out to the open side (camera to that shoulder); movement is only a shuffle while leaning; releasing restores the shoulder.
- [ ] Walking through the 1.1 m doorway: compressed ready on approach, a quick left-right check sweep as you step through.
Cover v2:
- [ ] Reversing direction in cover plays a ~0.3 s turn-and-swap (weapon to the other hand, camera to that shoulder).
- [ ] Dashing into cover (dash then cover, or dash straight at a face) slides in.
- [ ] Inside corners (inside the building shell, north-east corner): keep pushing into the corner and you turn onto the adjoining wall.
- [ ] Cover-to-cover: looking or pushing towards another cover shows a diamond marker; dash (or cover while pushing towards it) runs there and slides in. At the end of the low wall with another in line beyond the gap, pushing past the edge marks a SWAT turn: a low, quick crossing.
- [ ] Touch: tap the cover button to take/leave cover; swipe from it towards another cover to move there (or away to leave).
- [ ] Jumping at deep low cover / blocks climbs (mantle); at thin low cover vaults.
Combat around cover (Wave match):
- [ ] Only what sticks out can be hit: crouched behind low cover the head barely clears; leaning moves head and torso out (Skeleton view shows the three player volumes moving).
- [ ] Rounds cracking past darken the screen edges, make the aim wander slightly, widen the spread and make the body flinch; it fades after a second without fire.
- [ ] HUD "EXPOSED" meter rises when visible to enemies; the cover badge says "flanked" when your cover no longer protects you.
- [ ] Enemies walk tactically when they can see you and rush only between covers; they suppress your last position, blind-fire from cover, one of them works round to flank if you stay put, and grenades come in if you camp the same cover.
- [ ] Losing your cover (destroyed / gone) stumbles you briefly.
Debug overlay:
- [ ] Lines for player (stance, dash, stamina, pivot), carry (ready weights, raise, weight), cover (state, facing, swaps, lean, quality, traversal, doorway), combat (exposure, suppression, noise) and anim (state + layer weights; "!limit" flags a pose that tried to snap). The small trace graph shows the weapon bob (should stay near flat while walking). Tune has movement, camera and weapon-carry sliders.

## Cinematic update (1.2.0) - Proving Grounds, Warehouse, then a Clear run
Use the debug overlay (F3 / 3-finger tap): Skeleton shows foot contacts (green planted, orange swinging), the
slow-motion button reviews blends at 0.5x / 0.25x.
Pace and weight:
- [ ] Pushing the stick: a visible weight shift before the first step, then up to a walk over about a second. Letting go: one or two settling steps over ~0.6 s, no sliding. Nothing feels floaty or instant.
- [ ] Walk ~0.9 m/s, full stick held forward eases into a brisk ~1.4 m/s; strafing and backing stay at walk pace; creeping with a light stick.
- [ ] Turning on the spot steps the feet round (90 degrees in ~0.6 s, two or three plants); aiming turns smoothly and no faster than ~110 deg/s.
- [ ] Crouch ~0.45 s, kneel when still ~0.5 s, stand ~0.6 s. Dash: a short wind-up, the rush, a braking recovery.
- [ ] Planted feet never slide (Skeleton: green markers stay put) while walking, strafing, backing up and stopping.
Weapon handling:
- [ ] Ready to aim ~0.35 s, back to ready ~0.55 s. Tactical reload ~2.6 s (off hand to the magazine and back), empty ~3.1 s with the charging handle; swap ~0.9 s; grenade ~1.2 s (pin, wind, release).
Cover:
- [ ] Taking cover glides in over ~0.8 s and the support hand reaches the wall first; peeking leads with the head, the weapon follows (~0.4 s); at a left edge the weapon changes hands before the lean; leaving steps back.
- [ ] Getting hit flinches and recovers within half a second.
Camera:
- [ ] Follows with a slight lag and leads where you move; ADS / crouch blends take about half a second; the shoulder swap swings round behind the head (~0.4 s); no jitter when stopping or turning; a tiny handheld drift; dash widens the view slightly; the camera never pops in tight corridors.
- [ ] Vignette on by default; film grain optional (Settings > Video); letterbox at mission start and on stingers; a brief slow-motion beat on the kill that clears a room (setting).
Avatar:
- [ ] Default stick figure; Settings > Video > Avatar style switches to the detailed body (customiser preview follows); colours and camos still apply.
Warehouse and Clear mode:
- [ ] Play defaults to Warehouse for Wave, Mission and Clear (Free Roam stays on Proving Grounds). The room tag under the compass names where you are.
- [ ] Clear: squads hold their rooms (they wait inside, take cover inside, do not chase you out); the counter reads "Rooms cleared n/9"; each room clear shows a banner and stinger; the last one ends with victory. Chasing enemies pause at doorways before entering.
Mobile controls (phone):
- [ ] Left thumb anywhere on the left half places the move stick; flick-to-dash only if enabled. The right stick only turns the camera (rate based: holding it keeps turning; fine control near the centre; speeds up at the rim). Drag-look in the empty upper right works if enabled.
- [ ] The fire button never moves the camera (unless "Fire button also drags to look" is on); ADS button; the action button's label changes with context (Take cover, Leave cover, Vault, Climb, Step up, Drop down, Use) and a swipe from it moves cover to cover.
- [ ] Buttons are comfortable on a 6.9" phone: fire >= 76 px, others >= 56 px apart; nothing sits under the home indicator or the Dynamic Island in either landscape orientation.
- [ ] Layout editor: Default / Claw / Left-handed presets, Smaller / Larger, Fainter / Bolder per control, Reach overlay, Preview. An older layout keeps its customised buttons after updating.
120 Hz (iPhone 17 Pro Max):
- [ ] Debug overlay shows "display 120Hz budget 8.33ms" (if it says 60 Hz in Safari, check Settings > Apps > Safari > Advanced > Feature Flags for a 60 fps cap and try the installed app).
- [ ] Warehouse fight with 10 enemies: pacing p95 within the budget, drops < 1%, quality settles on Ultra 120 in Auto (or High with resolution scale near 1).
- [ ] 10-minute thermal soak (Clear or Wave on Warehouse, plugged out, brightness 50%): the pacing graph stays green, no sustained drops, the resolution scale may step down but never oscillates; the phone is warm, not hot.

## Stealth update (1.3.0) - iPhone 17 Pro Max: Proving Grounds, then a Clear run on Warehouse
Use the debug overlay (F3 / 3-finger tap): Skeleton shows foot contacts, slow motion reviews blends.
Feel (touch and controller):
- [ ] The character responds the moment you push the stick (a lean on the first frame), reaches speed in about a quarter of a second and stops within a third of a second with one settling step. Nothing feels floaty, nothing feels instant.
- [ ] Sneak (light stick, crouched) ~0.8, crouch walk ~1.8, crouch run ~2.6; walk ~1.4, jog ~2.8 m/s; sprint (L3 / Shift / touch Sprint) ~5 m/s, toggle by default (Settings > Gameplay > Sprint: Hold), no stamina, stands you up and lowers the weapon.
- [ ] Not aiming: moving turns the body towards where you go; standing still and looking around does not turn the body. Turning 90 degrees while moving arcs round without slowing; reversing plants and pivots (~0.3 s). Aiming: the body follows the aim smoothly.
- [ ] Vault, climb (up to ~1.8 m), step and drop flow out of a run without a stop; a sprint over a gap hops it.
- [ ] Planted feet never slide in any gait (Skeleton: green markers stay put), including aim strafes and sprints.
Camera:
- [ ] Look round 360 degrees standing, crouched, moving, sprinting, aiming, after leaving cover and after a lean: the view never sticks on an angle and never lags behind your thumb.
- [ ] Follow ~0.1 s with a lead; aim framing ~0.2 s; R3 / touch shoulder swap ~0.25 s on an arc; the camera takes the open shoulder in cover and at peeks; with auto-recentre on, it eases behind you after 1.5 s of moving without looking.
Cover:
- [ ] A (Space / touch action) snaps to cover up to ~3 m away with a quick glide (a slide from a sprint), the support hand touching the wall. B toggles standing / crouched at high cover. A again (or a firm push away for a quarter second) leaves.
- [ ] Aim over low cover pops up; aim at an edge (low or high, standing or crouched) leans round it head first, weapon out in ~0.2 s, back in ~0.2 s; at a left edge the weapon changes hands quickly.
- [ ] Look at another cover: the marker shows; A runs to it (round a corner if needed) or SWAT-turns across a gap; pulling back cancels. Pushing past an outside corner swings round it (~0.5 s); pushing into an inside corner turns onto the next wall.
- [ ] Blind fire, Y to vault low cover / mantle from high cover, and reload / swap / grenade tuck in against the wall.
Weapon carry (Free Roam carries all five):
- [ ] Weapons look slim and real-sized (rifle ~0.84 m, pistol ~0.19 m); both hands sit on the grips.
- [ ] Every carried weapon is visible: long guns vertical on the back (muzzles up), the SMG on the left-hip sling (it swings out when the leg pushes it), the pistol low on the right thigh, grenades in belt pouches. Nothing pokes through the body, a vest or a backpack, in either avatar style, walking, sprinting, crouching or strafing.
- [ ] Swapping (RB / LB, X hold, touch Swap) reaches to the gun's slot, puts it away, takes the next from its slot and brings it up in under a second.
- [ ] Co-op: the other player's avatar shows their whole loadout.
Clear mode (Warehouse):
- [ ] The HUD shows only "Enemies left N" - no room names, room counts, lives, score, objective line or enemy blips on the minimap.
- [ ] Clearing a room gives no banner, stinger, slow motion, feed item or reward; the counter just drops. Going down shows "DOWN" only.
- [ ] Dropping the last hostile: OPERATION COMPLETE, stinger, slow-motion beat and letterbox; results have no rooms row and one "Operation complete" reward. Wave and Mission HUDs unchanged (room tag still shows there).
Controls:
- [ ] Gamepad: LS move, RS look, LT aim, RT fire, A cover / cover-to-cover, B crouch, L3 sprint, Y traverse / vault / use, X reload (hold to swap), RB / LB weapons, D-pad grenade / emotes, R3 shoulder. Prompts show the right glyphs.
- [ ] Touch: contextual action, crouch toggle, sprint toggle, aim; every press responds on the next frame.
- [ ] Keyboard: Space cover, C crouch, Shift sprint, E traverse / use.
120 Hz:
- [ ] Warehouse Clear run with 10 enemies: pacing p95 within the 8.33 ms budget, drops < 1%; 10-minute soak stays green.

## Cover update (1.3.1) - Proving Grounds low wall and crates, then Warehouse
- [ ] Walk and sprint straight into low and high cover: nothing happens until you press A / Space or tap "Take cover".
- [ ] "Take cover" sits low on the wall you would snap to (below the crosshair) and keeps one height as you walk along it; a vaultable low wall also shows Vault beside it, never overlapping.
- [ ] In low cover the head is fully below the top (kneeling and moving); from an enemy's eye line nothing shows. Aiming over stays crouched: only head, shoulders and gun come over, and shots clear the top.
- [ ] The cover badge ("Low cover", "High cover", "Peeking", "flanked") sits on the wall beside you, not mid-screen; by touch tapping it leaves cover and tapping Vault vaults.
- [ ] Low ready: elbows clearly bent, muzzle down and across the body, stock at the shoulder.
- [ ] Entering cover reads like a film: a shoulder slam with a camera hit, a ducking spin on turn-and-swap and corner swings, a firm push off when leaving.
- [ ] At every peek (both edges, high and low, standing and crouched, over the top) aim as far as the view allows and fire: no shot hits your own cover; angles you cannot shoot from cannot be aimed at.

## Aim, carry and cover (1.4.0) - Proving Grounds, then Warehouse
- [ ] Aim (LT / right mouse / touch Aim): the rifle comes up to the eye - head down on the stock, sights in front of the eye - for every weapon; firing without aiming raises it the same way.
- [ ] Walk, crouch-walk and sprint along walls on either side, and through doorways: the gun never goes into a wall or a leg.
- [ ] High cover: the gun is tucked on the open side, muzzle down along the wall; reverse direction (turn-and-swap), reload, swap, crouch: nothing pokes through the wall.
- [ ] At a high cover edge, aim round the corner, then swing the aim across towards the wall: the operative steps out past the edge as needed and back in; shots never hit your own cover; the gun only comes up once it is clear.
- [ ] Low cover: kneeling and moving, the gun is held forward and down clear of the knees.
- [ ] Camera: standing, the operative is small in the left third of the screen with the room ahead; crouched in cover, low in the lower left (compare the Blacklist screenshots); aiming pushes in over the shoulder.
- [ ] In cover, looking at another cover does nothing; looking at it and holding the stick towards it marks it (staying in cover); A / Space then moves there.

## Stance, aim and cover (1.6.0) - Proving Grounds, then Warehouse
- [ ] Aim and fire (with and without aiming): the gun comes up to eye level beside the head for every weapon; nothing reads as hip fire.
- [ ] Stand, walk, jog: chest forward over the hips, knees bent; the head and gun glide with little up-and-down; footfalls feel planted, no jolts on starting, stopping or turning.
- [ ] Crouch, crouch-walk, kneel: clearly bent over the knees.
- [ ] Standing still, look all around with the camera: only the head turns; the gun and hands stay put until you aim.
- [ ] In cover, move along the wall standing and crouched: a jog, and it stops a step back from each edge.
- [ ] No cover badge on the wall you are using. Push against an outside corner: "Round corner" shows on the edge and nothing happens until you press cover; then it swings round and you stay in cover with the stick still held.
- [ ] At an edge, aim and release quickly while moving left and right: the body never spins round or turns through the wall.

## Level horizon (1.5.1) - Warehouse
- [ ] Vault / climb over the mezzanine railing and drop to the floor, then look all around (up, down, left, right): the horizon stays level. Repeat after taking hits and after firing the shotgun and sniper.

## Body, weight and corners (1.5.0) - Proving Grounds, then Warehouse
- [ ] Aim with every weapon, standing, crouched and walking: the gun sits at the cheek, never inside the head; nothing pokes through the chest, arms or legs in any stance, sprint, reload or swap.
- [ ] Low cover: hide, kneel, move along it and aim over it - knees never go into the floor, legs never splay, the knees never knock together.
- [ ] At a high cover edge, aim well round the corner: the operative walks out around the wall step by step until the shot is clear, the gun stays tucked until then and never touches the wall; aiming back steps in again.
- [ ] Sprint, then pull aim (LT / right mouse / Aim): the sprint ends at once and the weapon comes up.
- [ ] Walk, jog and sprint: shoulders hunched over the gun, head forward; clear bob, sway and hip twist; each footfall lands with a visible check (body and camera dip), no sliding.
- [ ] Moving along cover: gun ready, bent over; entering, leaving and swapping sides read like a film.

## PC mouse (1.3.2) - Chrome, Edge, Firefox, Safari on a desktop
- [ ] Start Free Roam with a mouse click: the cursor disappears and moving the mouse looks around straight away (if the browser refuses, "Click to capture the mouse" shows and one click on the game captures it without firing).
- [ ] Left button fires, right button aims, the wheel steps the speed gear (3.2.0; Q / X swap weapons), WASD / Space / C / Shift / E / R work.
- [ ] Esc frees the cursor and opens the pause menu; Resume captures it again; alt-tab away and back shows the pause menu.
- [ ] Menus work with the mouse as before.

## 2.3.0 - Guards, noise, loadout (phone + controller)
- [ ] Crouch walking, a slow walk, moving in cover and climbing past a guard's back do not alert him; a sprint is heard
      only nearby, and less through a wall.
- [ ] A guard who spots you: take him out within ~2 s and nobody else comes; leave him and the squad arrives.
- [ ] After a fight guards search for a minute, then stay watchful (never back to "Must have been nothing" calm).
- [ ] In a fight guards take cover and fight from it; out of sight they move up cover to cover.
- [ ] Spotted, no takedown prompt on guards in combat; co-op: a hidden partner still gets takedowns.
- [ ] Flashlights never light the room behind a wall.
- [ ] New profile starts with the 9mm SD; a single headshot drops a guard (not a heavy).
- [ ] Loadout: lists left, operator centre, stats right; focusing previews (locked too); A equips / buys, Y
      customises, B steps back; by touch, tap to preview, tap again (or the action bar) to act.
- [ ] Menus fit without scrolling where they used to (Play, Settings categories).

## 2.2.0 - Silent But Deadly menus (phone + controller)
- [ ] Installed icon and name read "Silent But Deadly"; an existing save (level, credits, unlocks) is still there.
- [ ] Main menu: green theme, stacked logo, the menu list fits without scrolling; every screen uses the same style.
- [ ] Loadout: each category on the left (touch and LB / RB); changing a weapon, attachment, camo, suit piece or
      outfit part shows on the operator at once; a locked one previews with its requirement and buys in place;
      leaving restores the saved look; drag / right stick turns the operator.
- [ ] Settings side categories and Infiltration mission cards work by touch and controller.

## 2.1.1 - Main menu (phone)
- [ ] The main menu is dark with beams over the operator, who stands to the right of the buttons; Customise shows
      the outfit colours clearly; menus stay smooth (no frame drops on the menu).

## 2.1.0 - Co-op depth (two phones)
- [ ] Hunter in co-op: knock a guard out; both phones show the body until one player hides it.
- [ ] Ping (D-pad left / Z / touch Ping) on a guard and on a spot: the other phone shows it, following the guard.
- [ ] Client: a takedown, then mark two guards and Execute: both drop on the host's screen too.
- [ ] Client throws gas at a patrol: the host's guards fall asleep. Two takedowns at once: "DUAL TAKEDOWN".

## 2.1.0 - New maps (phone)
- [ ] Mansion, Port, Refinery: play each in Hunter and its Infiltration mission; every objective can be reached on
      foot, from above and through a door / window / duct; guards upstairs come down the stairs when alerted.
- [ ] Frame pacing on each (debug overlay): within the 120 Hz budget with the lights on. (VM: CPU p95 1.6-2.6 ms,
      draw calls 33-61; allocations 91-109 KB per frame, the animation graph's boxing as on the Warehouse.)

## 2.1.0 - Multi-level AI (phone)
- [ ] Warehouse Wave: climb a rack ladder; runners climb after you, guards shoot from the floor; come down and
      a guard on the rack climbs down. Embassy Hunter: get seen on a roof, drop out of sight - guards search up there.

## 2.0.1 - Feedback fixes - phone
- [ ] Main menu fits without scrolling in landscape; a long list (Settings tabs, HQ, Store) scrolls by dragging.
- [ ] Back button (top left) works on the first tap on every screen, including HQ, Armory, Store and Settings.
- [ ] Hunter on the Warehouse: walking past a guard at 4-5 m behind him does not make him suspicious; sneaking up
      behind a guard gets the takedown prompt without him turning; posted guards rarely glance round.
- [ ] Team Deathmatch: an upgraded rifle and a stock rifle take the same number of hits to eliminate.

## 2.0.0 release candidate - automated results (SwiftShader VM; frame times there are not representative)
- Soak, 10 minutes each (`scripts/soak.mjs`): Warehouse / Wave heap growth 4.6 MB, Embassy / Hunter 4.8 MB, Dust
  Depot / Wave 5.8 MB; no leaks, adaptive quality settles.
- Perf (`scripts/perf.mjs --budget`): Warehouse / Wave CPU p95 ~2.0 ms, draw calls 58, allocations ~86 KB per
  120 Hz frame; stealth scenes (`STEALTH=1`): Warehouse CPU p95 1.1 ms, draw calls 35-40, allocations 110-165 KB
  per frame (over the 96 KB line: boxed numbers in the animation graph's blend, a pre-existing cost); Embassy CPU
  p95 1.0 ms, 38 draw calls, 65 KB per frame. Animation per character 0.032-0.047 ms (VM drift).
- On a device: run the soak on the Warehouse at night and the Embassy with the debug overlay; pacing within the
  120 Hz budget with the light cones on.

## 2.0 phase 11 - HUD, touch v3, accessibility, training (1.23.0)
- [ ] In a match: no health bars; take damage, the screen edge reddens. Ammo shows when firing / reloading and
      fades after a few seconds. Hold to use a panel: the ring fills.
- [ ] Touch: walk up behind a guard - the Takedown button appears; tap it (knock out) / hold it (lethal). Mark
      shows while aiming, Execute when ready. An old customised layout keeps its placements.
- [ ] Settings > Accessibility: Controls lists every binding for the device; HUD size changes the HUD; colour-safe
      arcs are blue / orange; subtitles show guard lines at the bottom; "Tap to start" runs a download on a tap.
- [ ] Play > Training: finish all ten steps with each input type (pad, touch, keyboard); hints match the device.

## 2.0 phase 9 - Visual overhaul (1.22.0) - Warehouse, Dust Depot, Embassy
- [ ] A fresh install shows the operator (suit, carrier, pads, balaclava, tri-lens); toggle night vision: the
      lenses glow green. Settings > Video > Avatar style: Stick still works.
- [ ] Warehouse at night: lamps throw faint cones; characters have a soft shadow underfoot; the image has a cold
      grade. Shoot a lamp: its cone goes out.
- [ ] Enemies read by silhouette at 20 m: cap (guard), helmet + plates (heavy), hood (sniper), shield, beret
      (officer), headset (drone operator), dog. Dust Depot enemies wear desert colours, Embassy navy.
- [ ] Frame pacing on a phone in the Warehouse (debug overlay) stays inside the budget with the cones on.

## 2.0 phase 10 - Co-op 4 and PvP (1.21.0) - two to eight devices
- [ ] Co-op > Host: Mode lists Wave, Hunter, Infiltration, Free Roam, Team Deathmatch, Free-for-all. Four phones
      join a Hunter room; a fifth is told the room is full (switch to a PvP mode and it can join).
- [ ] Hunter with two: the client sees calm guards, opens a door (the host sees it open), takes a guard down from
      behind (tap: knocked out), and revives the host when he goes down (hold on the body).
- [ ] Infiltration with two (Diplomatic Pouch): the client sees the objective, starts the download, both extract.
- [ ] Team Deathmatch with 3+: teams split, "Join Red" moves you if there is room; team-mates have a marker;
      shooting a team-mate does nothing; an elimination scores, the victim respawns away from enemies after 4 s.
- [ ] Free-for-all: everyone can hit everyone; the HUD shows You / Lead and the clock; the end shows the winner.

## 2.0 phase 8 - Arsenal, suit, HQ (1.20.0)
- [ ] Store: the new weapons from level 2 (9mm SD) to 12 (M249). Armory: each shows its model; fit a suppressor /
      scope / grip / extended mag: they appear on the gun in the armory and in the hands.
- [ ] Shoot through a door with a rifle (a guard behind is hit); a pistol does not go through a wall.
- [ ] The DMR / M700 scope sways gently; crouch and stand still to steady it.
- [ ] Crossbow: a guard hit drops knocked out (non-lethal); with Lethal Bolts he dies.
- [ ] HQ > Suit: buy the light vest, wear it (the operator gets a vest; footsteps a bit louder on the meter);
      boots quiet them. HQ > Upgrades: radar shows nearby enemies on the minimap in Hunter.
- [ ] Finish a Hunter run sneaking: Ghost / Panther cash lines in the rewards; HQ > Challenges progress.
- [ ] HQ > Loadouts: save the current weapons to a preset, pick it on the Play screen; its gadget is selected.

## 2.0 phase 7 - Hunter and Infiltration (1.19.0) - Warehouse, Embassy
- [ ] Play > Hunter on the Warehouse: get spotted and let a guard reach an alarm panel - "Hostiles doubled", the
      counter doubles and squads come in hunting. Results: Detected count and three play-style bars.
- [ ] Play > Infiltration: the board lists four missions with stars; pick Diplomatic Pouch, Rooftop insertion.
- [ ] Drop through the roof duct into the server room, start the upload, step out of range (the % stops), come
      back; guards come to check the noise now and then. Take the three intel folders, leave by the back gate.
- [ ] Asset Recovery: bug the conference phone (hold), free the kneeling asset (hold), walk him out the front gate
      (he follows, crouches with you).
- [ ] Blackout: plant the charge on the generator; get seen once - the contract fails.
- [ ] Results: stars, bonuses kept; the board shows the best rating afterwards (and after a reload).
- [ ] Embassy routes: roof by the north ladder / front drainpipes; zipline to the court; the east pipe to the
      ambassador's window; both roof ducts.

## 2.0 phase 6 - Enemy archetypes (1.18.0) - Warehouse, Clear
- [ ] Dock: a dog trots beside the patrolling guard. Crouch behind a crate within a few metres: it growls and
      comes for you even in the dark. A takedown from behind or sleeping gas puts it down.
- [ ] Dispatch: a red-lit drone circles the drone operator. Stand under it: "Drone has him!". Shoot it down / EMP.
- [ ] Workshop: the enforcer's shield sparks when shot from the front; he walks at you; flank and shoot his back.
- [ ] Factory floor heavy: shots to his chest barely hurt, his back and face plate do; in front of him the prompt
      reads "Lethal takedown".
- [ ] Mezzanine sniper: a red laser and a glint when he aims at you; marking him then says "Can't mark through
      the glint"; after a couple of shots he moves.
- [ ] Office officer: alert him near the alarm panel - he runs it himself.
- [ ] Take one guard of a squad out quietly and wait ~40 s: "Radio check." - "No answer..." - one comes to look.
- [ ] Callouts float over heads (radio lines in blue with a chirp).
- [ ] Play menu: Rookie / Normal / Realistic / Perfectionist. Perfectionist: no sonar on the goggles, no marks.

## 2.0 phase 5 - Gadgets (1.17.0) - Warehouse, Clear
- [ ] Hold D-pad down / Tab: the gadget wheel opens and time slows. Push the stick (or move the mouse) to a slot,
      release: it is selected (HUD icon by the ammo). Touch: tap the wheel button, tap a slot.
- [ ] Hold D-pad up / G / the gadget button: a dotted arc and a landing ring. Release: thrown along it.
- [ ] Sleeping gas into a group: they drop (knocked out; a squadmate finding one wakes him).
- [ ] Flashbang: guards facing it stagger blind for a few seconds, then fight. Look at it yourself: white-out.
- [ ] EMP near lamps: they go out for ~8 s and come back; a guard investigates the darkness.
- [ ] Noisemaker on a wall: it chirps; a guard walks over to check (not a fight).
- [ ] Sticky cam: the view jumps to it (blue-grey feed). Fire pings (guards come), Y gasses (once), RB / T marks,
      B returns. Your operator stands still meanwhile.
- [ ] Drone: launches into its feed; fly where you look; RT darts a guard (knocked out); Y shock burst ends it; an
      alerted guard shoots it down; it drops when the battery runs out (the feed shows seconds left).
- [ ] Mine: placed at the feet, the light blinks then stays; a guard stepping near sets it off.
- [ ] Touch: the action button reads Gas / Shock in a feed; the crouch button returns.

## 2.0 phase 4 - Takedowns, Mark & Execute (1.16.0) - Warehouse, Clear
- [ ] Sneak up behind a guard: "Takedown" over him. Tap Y / E / the prompt: a choke, he drops (knocked out). Hold: a strike (killed).
- [ ] From the front works too; from the side only while he has not noticed you.
- [ ] In low cover with a guard across it: the takedown vaults over. From the mezzanine edge onto a guard below: a drop takedown.
- [ ] Hanging at the mezzanine lip with a guard standing over it: pull him down. At the workshop window with a guard outside: pull him through.
- [ ] Get shot during a takedown: it breaks off and he is free and alert.
- [ ] After a takedown a white diamond (charge) shows. Aim (LT / RMB / touch aim) and press RB / T / the Mark button on up to three guards: white chevrons; red once all are in sight and range.
- [ ] Y / keyboard Y / the Execute button: a slowed sequence drops each marked guard; the charge is spent.
- [ ] Touch: Mark appears only while aiming, Execute only when ready; the takedown prompt is tappable (long press = lethal).

## 2.0 phase 3d - Night vision and sonar (1.15.0) - Warehouse, Clear
- [ ] Press View (pad), N (keyboard) or the goggles button (touch): night vision; dark aisles become readable, lamps glare.
- [ ] Press again: sonar; guards behind walls show as orange silhouettes for a moment every 6 s, with a ring and a ping.
- [ ] After ~18 s sonar switches off and "SONAR n" counts down its recharge; pressing the button skips sonar until then.
- [ ] Night vision on an iPhone at 120 Hz: no frame drops (the debug pacing graph stays under the line).

## 2.0 phase 3c - Surfaces, doors, shot noise (1.14.0) - Warehouse, Clear
- [ ] Walk across the yard (gravel), the mezzanine (metal) and the office (carpet): steps sound different; the noise meter is higher on metal, lower on carpet.
- [ ] At a closed door: "Open door" eases it open with a creak; "Close door" shuts it. Guards behind a closed door cannot see you.
- [ ] Sprint into a closed door: it bangs open and nearby guards react.
- [ ] A patrolling guard opens a closed door on his beat.
- [ ] With a suppressor fitted, a shot near an unaware guard makes him look round, not open fire; without one he goes to combat.

## 2.0 phase 3b - Bodies, lights, alarms (1.13.0) - Warehouse, Clear
- [ ] Drop a guard: the body stays. Walk up to it: "Pick up body"; carry it (slow, no weapon), put it down, pick it up again.
- [ ] Carry a body to the yard dumpster or the dispatch cabinet: "Hide body"; it is gone.
- [ ] Leave a body in a lamp pool in a guard's view: he finds it, searches round it, others nearby join.
- [ ] Shoot a lamp bulb: it goes out with a tinkle; a guard comes to look with a flashlight (the beam lights you up).
- [ ] Use a wall switch: the room's lamps go off; someone comes to look at the switch.
- [ ] Get spotted near an alarm panel: a guard runs to it; stop him or ALARM sounds and three more come in from the yard.
- [ ] Hold Y / E at an alarm panel first: "Alarm disabled"; it can no longer be raised.

## 2.0 phase 3a - Perception and alert states (1.12.0) - Warehouse, Clear
- [ ] It is night: the yard is moonlit, inside is dark with pools under the lit lamps. The light meter (top left) dims and turns blue in shadow.
- [ ] Guards walk their routes or stand post and glance about. Crouch-walk behind one in the dark: no arc.
- [ ] Walk into a lamp pool in front of a guard: a white arc fills round the crosshair before he spots you (turns red).
- [ ] Make noise near a guard out of sight (sprint, drop from height): he turns, then comes to look.
- [ ] Get spotted, then slip away: a pale ghost of you stays where you were seen; they converge on it and search, then give up after ~30 s.
- [ ] Spotted guards radio the ones nearby (they join a moment later); far ones stay calm.
- [ ] Wave on Warehouse still sends enemies straight at you.

## 2.0 phase 2 feedback (1.11.0) - Proving Grounds, north east
- [ ] Ladder: climbing up and down feels quick (3 rungs/s); holding sprint climbs faster; hands and feet step one at a time.
- [ ] Walk up to a ladder next to a wall top: the ladder is offered, not the lip.
- [ ] Drainpipe: the climb stops at the top; Y climbs up off it; pushing sideways swings onto the lip beside it.
- [ ] Shimmy along a lip past the drainpipe: it swings onto the pipe; push sideways to carry on along the lip.
- [ ] Ducts: crawling, the guns on the back never poke through the roof.
- [ ] Moving fast along high cover: no sudden dip of the body or the gun into the floor.

## 2.0 phase 2c - Routes on every map (1.10.0) - Warehouse, Dust Depot
- [ ] Warehouse yard: vault in through the workshop window. Dispatch: Y at the glass shatters through to the corridor.
- [ ] Racking: climb a rack ladder, walk the rack top, sprint and hop the cross aisle.
- [ ] Factory floor: ladder up to the mezzanine (or grab its edge from below); zipline down from the deck.
- [ ] Mezzanine west end: the vent into the duct; crawl over the manager's office and drop in through the hatch.
- [ ] Dust Depot: a warehouse's south window; the crate by its east wall, grab the wall top, walk it, drop inside.
- [ ] Container tops: grab, climb up, walk across. Nothing pokes through walls while climbing, hanging or crawling.
- [ ] On a ladder / hanging, the camera cannot be spun all the way round (it stops softly).

## 2.0 phase 2b - Landings, ziplines, windows, ducts (1.9.0) - Proving Grounds, east side
- [ ] Walk off the tower (3.6 m): a roll that keeps you moving; off the 2.3 m blocks: a soft landing. Enemies in
      Wave mode turn towards a heavy landing.
- [ ] Drop off the tower beside its south wall and press Y as the lip passes: you catch it.
- [ ] Zipline from the tower's south edge: speed builds, B lets go mid-way (you fly on), riding to the end you land
      running.
- [ ] Shed: Y at the open south window vaults in; Y at the glazed north window shatters it and vaults out (loud).
- [ ] Ladder platform west of the shed: at the vent tap Y kicks it in (loud), or hold Y to unscrew (silent, the
      prompt counts up); crawl through; at the end you drop into the shed and roll. Pull back at the start to leave.
- [ ] The camera never pokes outside the duct; the stick-figure guns on the back stay inside the duct.

## 2.0 phase 2a - Ledges, ladders, pipes (1.8.0) - Proving Grounds, north east corner
- [ ] Ladder (tower, west side): Y climbs on; stick up climbs, hands and feet land on rungs (no sliding); B slides to
      the bottom; climbing past the top steps onto the tower. From the tower top, Y at the ladder steps on facing it.
- [ ] Drainpipe (tower, south side): climbs, takes the lip at the top, "Climb up" puts you on the tower.
- [ ] Hang blocks: Y under the 2.3 m wall grabs it; shimmy both ways at a steady pace; push past the far end with
      the stick towards the second block: "Jump" shows on it, Y jumps across; round the far corner; Y climbs up.
- [ ] On top of a block at the edge: hold B (or tap "Hang") lowers into a hang; B drops.
- [ ] Horizontal pipe: Y under it grabs, stick moves along it, B drops.
- [ ] Touch: every prompt above is a button; the camera framing changes on the ladder / hang and returns after.
- [ ] Holding crouch (hold mode) while walking up to an edge never lowers you over it.

## 2.0 phase 1 - Foundations (1.7.0) - Proving Grounds, then Warehouse
- [ ] Nothing looks or plays differently from 1.6.0: movement, cover, vaults, combat, camera, HUD.
- [ ] Frame pacing graph (debug overlay) unchanged on Warehouse with 10 enemies.
- [ ] B / C / touch crouch still crouches and toggles stance at high cover (it now also raises `drop`).
- [ ] Holding Y / E on an objective terminal still fills its ring; a tap still vaults.
