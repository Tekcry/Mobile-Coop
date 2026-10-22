# Changelog

## 4.55.0 - Train 4: Marlow Yard security room, wheel opens on goggles, run feet no longer cross (2026-10-22, PR #121; #110, #115, #116)

### #110 The run's feet no longer cross
- The run's feet no longer cross the midline: the keyed clips' track half-width (`half`) is measured with the
  stride-locked pelvis yaw removed (`scripts/anim-keys/py/key_clip.py`: each frame's ankles turned back by that frame's
  pelvis yaw minus the clip's mean pelvis yaw; the yaw read off the pelvis's lateral axis, which stays level in the
  face-down frames of the knife collapse), not in the world x, so the run keys' +-25.5 deg pelvis yaw no longer leaks
  the stride into it, and a constant stance yaw (the ready stance's 6 deg) keeps its world value. Run half -0.02039 ->
  0.05042 (0.045 before the 2026-10-22 bake).
- Every keyed clip rebaked (key JSONs unchanged); the clips whose pelvis yaw swings changed: walk 0.0466 -> 0.05188,
  jog 0.04592 -> 0.05386, sneak 0.06355 -> 0.06519, crouch walk 0.06203 -> 0.06566, crouch run 0.06071 -> 0.06666,
  glide fwd 0.05672 -> 0.05807, glide back 0.057 -> 0.05802, wall crouch slide 0.06195 -> 0.06564, guard held hands
  0.09392 -> 0.09389, held stumble 0.07274 -> 0.07634, choke sag 0.10495 -> 0.10482, knife collapse 0.12162 ->
  0.12164; crouch idle and wall crouch idle 0.12196 -> 0.12197, hold back 0.09363 -> 0.09365 (their crouch pitch and
  breathing roll read as a +-0.03-0.4 deg yaw). The ready stance and the other clips keep their half.
- Tests: the walk footage limit `half <= 0.05` -> 0.053; the skeleton identity fixtures re-captured (the swinging-yaw
  keyed clips, crouch idle, wall crouch idle, hold back, skeleton_test, the partner path and the guards' walk / aim
  walk); e2e-anim's run limits re-measured (track 0.16 -> 0.18, knee bow 0.09 -> 0.047; knee separation and elbows
  kept).

### #115 Marlow Yard security room (sector-fixes S)
- Marlow Yard, station 3 (Michael: "If there are cameras, there should be a security room with a guard watching the
  cameras. You can take him out and shut off cameras"): a security room off the far lobby, through a plain door behind
  the camera. A duty guard stands at the monitor wall (a training guard like station 1's: he sees and hears nothing);
  grabbed, INTERROGATE gets "All right! The desk console switches the hallway camera off."
- The desk console refuses while he is up ("The guard is watching the monitors. Take him out first."). Knock him out or
  kill him (takedown, strike or shot), then use it: the hallway camera goes off for both players (no detection, no
  alarm, no send-back, its LED dark, its red view hidden) until the bay restarts, which brings the camera and the guard
  back. LANTERN: "Cameras off. Your partner can walk the hallway." A second line at the station start names the room.
- The jam handoff still works exactly as before: the first runner still needs the partner's jam to reach the far lobby,
  and the second can still be jammed through. The room is an alternative to the second jam, not a replacement; a
  camera switched off at the console is simply no longer a jam target.
- The station's monitor wall moved from the hallway's south wall into the room, with a desk under it; the room has
  its own ceiling panel (jammable and shootable like the other lamps).
- Not in Sector Ops (Michael): its cameras have no console. Co-op: no protocol change.

### #116 Wheel opens on the goggles (sector-fixes W)

### The selection wheel defaults to the goggles (Michael item 8)
- Michael: "Change goggles in inventory to the default selection so you can just hold l1 and press a to automatically
  swap between them. Don't hold selections in the wheel, if analogue stick is let go it defaults to goggles/vision
  selection."
- The wheel opens on the vision slot: hold LB and press A to cycle night, thermal, electro with no stick; release LB
  and the mode shown is selected.
- The pad's right stick now places the wheel cursor where the stick points (it used to drift with the look rate and stay
  put). Let go of the stick and the vision slot lights again, so nothing else stays picked. A stick and LB let go
  together still pick the slot under the stick (a 0.08 s grace, `WHEEL_LETGO_S`); A with the stick centred always
  cycles the vision.
- Keyboard and mouse: hold Tab, the wheel opens on vision and E cycles; the mouse back in the centre lights vision.
- Tests: `tests/selectionWheel.test.ts` (default slot, let go, grace, A centred), `tests/input.test.ts` (the stick
  position); e2e-gadgets and e2e-pad assert the new behaviour; `scripts/wheel-shots.mjs` drives the stick.

## 4.54.1 - Load-flaky e2e asserts hold under E2E_JOBS=2 (test only) (2026-10-22, PR #117)
- Four load-flaky e2e asserts hold under E2E_JOBS=2 (test only): e2e-stealth-ai head-only peek spot, e2e-netmove client assists, e2e-mouse capture timeout, e2e-ctcourse station 4 throw; details in `docs/backlog.md`.

## 4.54.0 - Train 3: every tuner Body slider bakes, holds and carries (2026-10-22, PR #114; #103, #113)

### #103 Body sliders bake
- Animation tuner: every Body slider (but the shared stride length) and the gun tuck bake. The Body sliders with no
  code value (track, arm swing, knee lift, elbow out, elbow pole and the rest) bake into the base table's new `body`
  key, which every Wren rig reads (the player, the co-op partner, the Anim Studio puppets; guards never); the gun's
  elbow tuck bakes per gun state (six Wren constants, the guards keep theirs). The stride length stays one shared
  value (it bakes when every moving state agrees). Michael's 13 values from 2026-10-22 that stayed in his browser are
  now built in: the feet on a narrow track at idle / walk / jog / run, the elbows out at idle / walk / jog, more arm
  swing at jog / run, more knee lift at run, the elbows out at low ready and the rifle / pistol low ready tuck.
- The tuner resets those 13 sliders once on the next load (they would otherwise apply twice): each bake now has its
  own id in the save, so a second bake of the same export is not mistaken for the one already applied.

### #113 Holds and carries (anim-natural N4)
- Hostage walk and body carry: the hips and the shoulders now turn against each other with each step instead of as
  one block (pelvis about +-3 deg, the shoulders the other way, smaller than a free walk: the arms are busy). Carrying,
  the trunk leans about 6 deg away from the loaded shoulder, the hips sit a little under the load and each step dips a
  little deeper. Measured on Proving (desktop GPU): counterCorr hold-walk +0.85 -> -0.76, carry-walk +0.95 -> -0.91.
  The lean and the hip shift scale by the body's weight on the shoulder: none kneeling at the body, in with the hoist,
  out by the put down's hand-over (fix round).
- Body lift: she walks in to the body standing and crouches once there (the crouched step-in dragged a planted foot
  21 cm), and stays down until a stepping foot has landed before she stands with the body (at most 0.3 s). Animation
  only (fix round): the controller crouch keeps the lift's fixed timeline, crouched from the start as before. Lift
  planted slide 20.9 / 7.4 cm -> 0 / 5.4 cm (the 5.4 is the planted foot's twist in the 90 deg turn to the body: an N1
  planner item, as is the carry-walk's 5-9 cm late-stance and start-turn slide, which a free walk at that pace shows too).
- Animation tuner: a "Holds and carries" section (hold walk / carry rows): hip and shoulder twist, shoulders against
  the hips, step weight (dip), step length (cadence; default x1), and for the carry the lean away from the load and the
  hips under the load. Every slider bakes into `CQ_GAIT` (`src/anim/cqGait.ts`) with `scripts/anim-tune-bake.mjs`
  (section `cq`).

## 4.53.0 - Train 2: guard tuning and clip speed in the animation tuner (2026-10-22, PR #112; #105, #109)

### #109 Clip speed
- Animation tuner, Clip speed tab (Michael: "Can I fine tune the whole animation speed in anim tuner?"): a speed slider
  per timed clip, 1 = today's timing, 2 = twice as fast. Draw, holster, swap and throw: rifle draw (every long gun),
  pistol draw, holster, weapon swap, grenade throw. Start, stop and landing: the start-off weight shift, the stop
  settle, the landings. Every clip: one slider that multiplies all of them. Each slider shows today's duration.
- The draw speed is gameplay too: the gun can fire when the faster (or slower) draw ends, and the aim camera blends in
  with it. Not the View tab's slow motion (that slows the whole game for viewing).
- Bakes like the other sections (`node scripts/anim-tune-bake.mjs`, section `clip`): into the draw, holster, swap and
  throw times and a new playback rate per timed body clip (`CLIP_RATE`). Untuned, nothing changes; the save is unchanged.

### #105 Guard tuning
- Animation tuner: a "Who" list (Wren / Guard) at the head of the Body, Stepping and Weight tabs. Guard tunes every
  guard's Joints, Stepping and Weight (lean, step load, springs, the start dip) per guard state: idle, walk (patrol and
  alert), run, aim, crouched, wall cover. Wren's sliders never change a guard and the guard sliders never change Wren.
- Every guard (in single player and on a co-op client) reads a guard base table the bake writes from an export's guard
  rows (`src/anim/animBaseGuard.ts`); untuned guards look and act exactly as before.
- Anim Studio: Who = Guard (or a "Guard: ..." loop) plays a guard puppet (a real guard, no AI) where Wren stands:
  idle, patrol walk, alert walk, run, aim, crouched aim and wall cover, moving loops on the spot; the camera, the
  highlight, pause and speed work on it. Who = Wren brings her back.
- Saves, exports, imports, presets and undo carry the guard rows; older saves and exports load as before.

## 4.52.0 - Train 1: server browser and jammer fixes; protocol 28 (2026-10-22, PR #111; #99, #108)

### #108 Jammer fixes
- A jammed lamp comes back in the state its wall switch, EMP or a shot gives it at the end of the jam, not the state it
  had when the jam started: a group switched off (or EMPed) during a jam stays dark through the flicker, on the host and
  the client alike (light parity). The light registry keeps the switches' state under the jam.
- Jamming Course Lab's mains lamp no longer opens the mains gate, and its flicker no longer toggles it: the gates read
  the group's switch / EMP / shot state, never the jam.
- Co-op: `PROTOCOL_VERSION` 28: the client's `jam` claim carries its camera eye; the host checks the jam's line of sight
  from it (taken within 1.5 m of the client's head with a clear line between them, else from the head), so a client
  that shows JAMMER READY now jams.
- The jam buzz no longer allocates an object every frame while a device is jammed.
- Not changed (Michael 2026-10-22): cameras keep their IR on every camera ("Cameras should still work in the dark").

### #99 Server browser (prototype)
- Co-op: public rooms (Michael: a server browser, "prototype only, quick and fast to build"). The host lobby has a
  Room row, Private (default: only the code brings anyone in) or Public. A public room posts a notice (code, map, mode,
  version, players, host name) on the same relays as every room, every 30 s and to anyone who opens the list; it is
  taken off when the room is full, goes private or closes, and a notice not refreshed for 75 s drops out.
- Co-op > Browse rooms: the public rooms of this exact version and protocol, live, with pad, keyboard and mouse; a pick
  joins by its code as today. No quick match, no relay server, no game server.

## 4.51.1 - e2e-coop: the client-takedown step holds steady under load (test only) (2026-10-22, PR #107)
- The client-takedown step in `scripts/e2e-coop.mjs` calms the host's guards and holds the picked guard still until
  the takedown is done, as the grab step already does: on a slow page the guards alerted or turned between the host's
  pin and the client's read, so the offer never came (the master-wide flake). The start, the reach check and the
  knock-out are still the real code. A failure now prints both pages' view of the guard and the client.

## 4.51.0 - Animation tuner: key tools (wave, apply to ticked keys, smooth between, compare) and the exact key preview (2026-10-22, PR #106)
- Animation tuner, Keys tab: key tools for changing many keys at once, each one undo step and baked like any key edit.
  "Key tools" fold: Wave (pick a slider by name, an amount and a timing; "Fill keys" puts a smooth sine over the cycle
  on every key, the mirrored half following the Mirror rule), Apply to keys (the selected slider's value on this key
  to the ticked keys, All / None) and Smooth between (the keys between two keys eased from one pose to the other, every
  slider or the selected one).
- Compare (off by default): a light ghost of the previous or a picked key over her in the Anim Studio, and a line of
  how this key differs ("Key 2 vs key 1: Right forearm twist, palm in +12°, Chest turn -3°").
- Exact preview: a key edit now previews the way the Blender rebake makes it (the same Bezier curve; the trunk exact,
  the arms within 0.7 cm between the keys, the pelvis exact), also with retimed, added and deleted keys, so the
  in-betweens no longer shift after a rebake. "+ Add key" keeps the pose where the key goes.

## 4.50.0 - Co-op rejoin: a dropped player rejoins the match (held slot, Resume hosting, room code on pause and main menu); protocol 27 (2026-10-22, PR #92)
- Co-op: rejoin a match you left or dropped out of (Michael: "There should also be a way to rejoin a match you have
  left"). The room code shows in the pause menu, and for 10 minutes after a match was last live the main menu offers
  "Rejoin <code>" (the joiner) or "Resume hosting <code>" (the host): one press.
- A joiner who drops or leaves mid-match keeps its place: the host holds its body where it stood (frozen, unhurt, unseen
  by the guards) with a "<name> disconnected - reconnecting... (room CODE)" line, for 10 minutes. Rejoining puts it
  back as the same player, where it stood, with the health the host kept and the team's state.
- If the host drops or leaves, the joiner stays in the match with "Host disconnected - waiting (CODE)". "Resume
  hosting" reopens the same room and starts the match again from its last checkpoint (Marlow Yard: the bay they were
  in); the waiting joiner takes it at once, or rejoins from its menu. No server: the same room on the same relays.
- Protocol 27 (26 is the jammer slice): the hello's rejoin token, the held flag in the lobby, the host's `you` and the
  `restore` event.

## 4.49.1 - Animation tuner: worn-goggle offsets in the Gear tab, baked (2026-10-22, PR #102)
- Goggles in the Gear tab (marlow-bays item 22's last socket): a `goggles` socket (and its crouched row) moves and
  turns the worn goggle (night vision on) in the head frame: x / y / z in metres, pitch / yaw / roll in degrees, about
  the goggle's own pivot. It bakes into the animation base table like the other Gear rows; your own Wren shows it
  (the partner's and the studio puppets' rigs carry it too, but they always show the stowed goggle, so it shows on them once their vision mode is shown), guards never. At LOD1 / LOD2 only the lens moves (the housing
  is part of the head there). The stowed goggle has no slider yet (it has no separate parts). Untuned, nothing changes.

## 4.49.0 - Animation tuner v3: one simpler layout for pad, touch and mouse; analogue stick lists; plain labels; iPad and phone fit; touch camera; game touch for menus and camera (2026-10-22, PR #97)
- Animation tuner, simpler: one layout for every input (pad, keyboard and mouse, touch; the input changes only the
  button hints), the screen size alone picks the dock, the side drawer or the bottom sheet. One column: tabs, the
  playback bar, Part and State, folding slider groups, then More. The body map, search, recent and pinned sliders, the
  Settings tab and the edit mode are gone. Pad: the left stick scrolls the lists and changes values, the right stick is
  always the camera, the triggers zoom, the D-pad is optional; the state list's Up bug is fixed.
- The highlight on her is a small dot with an off switch; the studio's green skeleton and foot marks start off
  (More > View aids).
- On phones the tabs and the playback bar stay at the top of the drawer and sheet while the panel scrolls.
- Keyed clips: with Keyed ticked the Body, Joints, Limb reach, Hands & feet and gun rows now reach the clip (they did
  nothing: the clip on the spot tuned the idle). Feet apart and Knee lift work on the keyed clip on the spot. Sliders
  that do nothing in the loop playing now are greyed with the reason ("procedural only: the keyed clip is playing").
- Plain words: values in cm and degrees, the hands of a gun stance named "Gun hand" and "Support hand", "Gun in the gun
  hand" says the support hand follows the gun.
- Camera: "Around her" (360 degrees), "Camera tilt" and "Distance" sliders in the View tab, in step with the stick,
  the drag, the touch orbit and the snaps; Side pressed again swaps to her other side.
- Changing keys (back, forward, pick, add, delete) keeps the panel's scroll and the focused slider.
- Pad: the left stick changes values and scrolls while "Pause game while tuning" holds the game (it ran on game
  time, so it did nothing in play).
- The studio shows a foot slide line when the rig reports it (amber over 0.5 cm).
- Game touch: tap every menu and the pause menu, drag on the game view to look around, an on-screen pause button after
  a touch. No touch movement or combat.

## 4.48.0 - Marlow Yard bay 3: a jam-handoff hallway, the jammer's 5 s use / 5 s cooldown with a buzz, camera reboot and lamp flicker; cameras see in the dark (2026-10-22, PR #101)
- Jammer rules (Michael 2026-10-21 item 7, A3, J1): each player jams for at most 5 s, then a 5 s cooldown; letting go
  early (or moving: the stand-still rule) also starts the cooldown. The 20 s charge (drain / refill / minStart) is gone.
- A jammed camera goes blind (its red grid fades out), stops sweeping where it is and flashes its LED; released (or at
  5 s) it reboots for 1.5 s, still blind and frozen, and nobody can jam it again until it is back online. Lasers take the
  same 1.5 s. A quiet buzz / interference synth voice plays at the jammed device on both pages (positional, no asset).
- Lights are jam targets (item 8): a jammed lamp flickers off (0.5 s), stays off while held and 4 s after the release,
  then flickers back on; the registry gameplay reads follows the same timeline (the meter and guards agree).
- Only a target the aim has a clear line to can be jammed (no jamming through walls).
- The jammer HUD: a line under the reticle (JAMMING 3.2 s / JAMMER COOLDOWN / TARGET REBOOTING / READY) and the gun
  light: cyan pulse jamming, dim red cooling, amber on a rebooting target, green aimed (the old jamming colour was the
  aimed green, so a jam did not show).
- Marlow Yard station 3 is a camera hallway (item 5, A5): a 2.9 m hallway along the south wall, the camera at its far end
  looking back down it with a +-8 deg sweep; its view stays inside the bay (no view into either airlock). One jam covers
  one runner; the partner through jams it from the far lobby for the other. Both in the far lobby unlock airlock A3's
  door. The painted sweep-edge floor lines are gone (Michael: the red view overlay shows the camera's area). New radio,
  objective and panel text; the station's light levels re-taken for the hallway.
- Co-op: `PROTOCOL_VERSION` 26: `sec` carries per-camera clocks, each player's jam left and cooldown, and the jammed /
  recovering devices; the client draws the frozen camera, LED, grid, buzz and light flicker from it.
- Station 3 hard rule (fix round 1, item 5 "impossible to pass without one player jamming"): a player the camera has
  (its meter full) in the hallway, or still running in the far lobby, is sent back to the entry lobby facing the
  hallway ("Camera saw you. Back to the start of the hallway."); the far lobby only counts players who got through
  clean. Being seen still raises the alarm stage too. Co-op: a new `back` event moves the client (health kept).
- Fix round 1: the host checks a client's jam target with the same static line of sight (from the client's head); the
  client never blinks a camera back into its reboot on a late host message (device timelines only move forward); the
  jammer HUD line and the buzz no longer rebuild a string or schedule audio every frame.
- Fix round 2: a player the hallway camera sent back counts for the gate again only once seen back in the entry lobby
  (a co-op client after the host's 3 s teleport grace): stale far-lobby positions sent before the `back` event arrived no
  longer open it.
- Security cameras see in the dark (Michael M3): each has its own IR illuminator, so inside its range and cone it reads
  every body as fully lit whatever the lamps do. Putting lamps out (jam, EMP, shot) no longer hides anyone from a camera,
  in Marlow Yard and Sector Ops alike; guards and the light meter still go by the lamps. Every station 3 lamp is jammable
  again (the hardened bay x 6 hallway lamp of fix round 2 is undone).
## 4.47.1 - Tuner groundwork: a Blender-exact key curve evaluator for the coming exact key preview (not wired yet) (2026-10-22, PR #100)
- `src/anim/keyCurve.ts`: a pure, allocation-free port of Blender 5.2.2's auto-clamped Bezier solve (within 2e-6 of Blender on 124 curves), with tests and fixtures. Course Ready wires it into the Keys preview in item 30.


## 4.47.0 - Animation tuner: collarbone Joints, per-key legs (planted feet kept), collarbone and finger keys on every keyed clip (2026-10-22, PR #98)
- Per-key collarbones, fingers and legs on every keyed clip (Michael: per-key legs, collarbones and fingers on the real
  clips, jog, run, walk, idle ...). The Keys tab has, on every key: collarbone pitch / yaw / roll per side, curl and
  spread per finger, and leg changes per joint (hip pitch / yaw / roll, knee, ankle pitch / roll, toe). A clip takes
  them on the first edit and the bake writes them; clips nobody edits stay exactly as they are.
- Leg key changes keep planted feet still: while a foot is planted the leg is re-solved onto its plant with the change
  folded in (a knee or hip change on jog's contact key leaves the foot within 0.5 cm; measured 0.00 cm); the swinging
  leg takes the change as keyed. The rig reports how far a planted foot slid (`rig.footSlide`, the studio's foot
  slide line).
- Joints tab: a collarbone row per side (shrug, push forward, tilt) for every state.
- Clips can be keyed with whole legs (an FK takeover with a per-key weight over the foot planner); the studio-only test
  clip skeleton_test uses all of it (shrug, shoulder push, fingers one by one, a kick with the other foot planted).

## 4.46.0 - Michael's first tuner bake: jog and run keys, low-ready gun poses, Joints; Reset baked clears built-in values on load (2026-10-22, PR #96)
- Animation tuner: after a bake merges, the tuner resets the sliders the code now holds by itself (each saved value that
  equals a value in the bundled bake ledger goes back to its default, once per bake), so a baked tune is never applied
  twice. The rest of the tuning is kept; the panel says how many ("61 values are now built in; your other 13 changes
  are kept."). Y menu > "Reset baked" runs it again.
- Tests follow Michael's 2026-10-22 tune (the jog / run keys, the rifle and pistol low ready, the idle / walk / jog
  upper-arm roll): the identity fixtures re-captured (proven data only first), the tuner key tests moved to the evenly
  spaced sneak / walk keys, and the run's anti-crab and arm limits widened for the run alone (marked to restore).
- Michael's rifle and pistol low ready are Wren's alone (`WREN_READY_LOW`, `WREN_PISTOL_READY`, picked once per rig by
  `tuneRows`): guards, the VIP and the dummy keep the pre-bake ready poses, the gun bake rules target Wren's copies,
  the guard identity fixture is back to master's, and e2e-anim's player low-ready limits follow the tune (marked).

## 4.45.0 - Animation tuner: Gear offsets for the holster, the guns on her back and the hip sling, baked (2026-10-22, PR #95)
- Gear offsets (marlow-bays item 22): the animation tuner has a Gear tab with sliders that move worn gear per socket:
  the holstered pistol on the thigh, the guns on the back (left, centre, right) and the hip sling socket
  (the hip sling's gun with it). Each moves in its own frame (x / y / z in metres) and turns
  about its own seat (pitch / yaw / roll in degrees); each has a crouched variant added as she crouches. A draw or
  holster reaches to the moved slot. Visual only: what she carries and how long a draw takes are unchanged.
- The Gear values bake into the animation base table like Joints and Hands & feet, so every Wren body takes them: the
  co-op partner and the studio's pair puppets too, guards never. Old exports, saves and base tables load and bake as
  before. The grenade pouches are part of her own kit, so they have no slider yet; the goggles follow
  after track C's hook lands.

## 4.44.0 - Animation tuner: Joints, Hands & feet, IK and Weapon rows for every move and action (climbs, rappel, co-op moves, reload, melee, landing, hit) (2026-10-22, PR #90)
- Moves and actions have their own rows in Joints, Hands & feet, IK strength and Weapon (COVERAGE gap 2): every
  traversal move (vault, mantle, step up, climb up, window vault, rappel, drop, hop, roll, wall kick, split, brace),
  each co-op move per role (leg-up, relay, throw, hang-down, rope, revive: A and B), and air, landing, slide, melee,
  reload, weapon swap, grenade throw and hit. A row blends in over the stance while its move or action plays (by the
  animation's own fade) and out after it; the tuner follows the strongest one. They bake like the other rows; old
  exports and saves load as before. The co-op partner picks its role row from its move state (the relay climb reads as
  the leg-up's climber; the revive has no row on the partner).
- Tuner by pad: LT / RT steps the state (or the move, or A / B on a co-op row) in every section again, B goes back to
  that picker, and the changed dot marks the right picker (the pickers' depth now differs per row).
- The debug overlay's Tune and Teleport lists stay hidden until their buttons open them (their display rule overrode
  `hidden`, so Tune always showed and the overlay covered much of the Anim Studio's scene on a small window).

## 4.43.2 - Tests: e2e-menus waits on sim time on slow software GL; the e2e-levels ladder chase is seeded; a NaN guard in the loop (2026-10-22, PR #94)
- The desktop e2e-menus "stall" after the animation tuner closed was not a freeze in the game: the test ran past the
  runner's 600 s limit on software GL (the match page drew about 1.5 frames a second beside the open menu page). The
  menu page now goes blank before the match page opens, and the tuner camera check settles on the sim clock: the suite
  takes 312 s instead of 894 s on the desktop. The Havok stacks seen earlier were slow frames, not a spin.
- The game loop treats a NaN or negative frame interval or time scale as no time, so a bad value can never stop the
  simulation for good (new unit tests for the loop across a long tuner freeze and its release).
- e2e-levels: the ladder chases run on the manual clock with a fixed random seed (they took 9-30 s of game time
  against a 30 s budget; now 10-15.5 s).

## 4.43.1 - Co-op: restart at checkpoint no longer crashes a joiner holding a guard (2026-10-22, PR #93)
- Co-op course: "Restart at checkpoint" (or a bay restart) while a guard is held no longer crashes the client; the hold is
  let go first (as Sector Ops does), and a disposed guard puppet counts as gone, so a stale takedown lets go of it.

## 4.43.0 - Animation tuner: add or delete keys in a keyed clip, mirror kept, baked (2026-10-21, PR #91)
- Animation tuner, Keys tab: "+ Add key" inserts a key midway between the picked key and the next (wrapping; with
  Mirror on in the own half, mirrored half a cycle on), posed as the clip plays there, so nothing changes until it is
  edited. "Delete key" removes the picked key (never key 1, never below 4 keys a cycle; with Mirror on its mirror goes
  too). Live at once; undo, reset, presets, export and import work as for every slider; works with key timing.
- The bake writes the key file with the new key list, regenerates `src/anim/tuneKeysMeta.ts` and prints the clip's
  rebake. An export with no add / delete bakes exactly as before; no clip changes.

## 4.42.0 - Wren skeleton: collarbones, 30 finger bones, smoother glove fingers; hands close on weapons again (2026-10-21, PR #88)
- Wren's hands close on her weapons again: since the 2026-10-20 rebake the in-game models
  had lost their hand-closing shapes, so only the close-up camera showed a grip. Her fingers are now real joints on
  the two nearest models (each finger bends at three knuckles), and the game's grip drives them on every Wren,
  the co-op partner included. The fingers got extra knuckle loops so they bend smoothly (Michael: "Go, smooth fingers
  too"): nearest model 39 809 -> 43 431 triangles, second 13 578 -> 14 242, both inside their budgets.
- The tuner's per-finger curl and spread (Hands & feet) now move each finger on its own instead of one average close.
- New joints for the next steps (T3, BRIEF item 21): a real clavicle on each side (a shrug or a shoulder pushed forward
  moves the shoulder joint itself; tuner rows come in S4) and the goggle on its own joint (CT Core's gear-offset rows
  will move it). At rest nothing moves: every joint that existed before is bit-identical for all 28 keyed clips, the
  procedural states and the partner (tests/animSkeletonIdentity.test.ts).
- Cost: about +2.3 us per Wren figure per frame (figure update 6.9 -> 9.2 us at the nearest model); +264 KB of models.

## 4.41.0 - Animation tuner and Anim Studio on phones: compact drawer or sheet, pad mode, touch camera (2026-10-21, PR #89)
- The animation tuner and the Anim Studio work on a phone (Michael's written exception to M21 for these two tools only;
  the game itself stays desktop only). A phone (a touch screen as the main pointer, short side 600 px or less) in
  landscape gets a side drawer on the right (38% wide: she keeps the left 62%); in portrait a bottom sheet (45% high:
  she keeps the top 55%). The studio frames her in the free area as on desktop. A grab handle collapses the panel to
  its header and expands it. Every touch target is at least 34 px (tabs, buttons, chips, sliders, steppers, the body
  map's joints, the playback bar); the text is 13 px, the padding tight; the panel scrolls inside itself; slider rows
  put the slider on its own line.
- (26b, Michael: "Smaller buttons, more compact. Adjust smaller with controller connected also") With a controller the
  last input, smaller again: 26 px rows, 11 px text, no touch minimum, one-line slider rows, the drawer 34% wide and
  the sheet 40% high. It switches live between touch and pad with the last input (a touch or a pad press), no reload.
- The F3 debug readout (it covered the left half) is off on a phone; Settings > "Debug readout (F3)" shows it (the
  choice is saved) and F3 still toggles it with a keyboard.
- Touch camera on the scene: one finger dragged orbits, a pinch zooms, two fingers dragged pan the point the view
  circles; a tap on her picks a part as a click does. Touches on the panel never move the camera. The pad works as
  before. Desktop sizes and a mouse keep the T2 layout unchanged.
- The Anim Studio's stage lights are placed after she moves and from the camera's position this frame (they lagged
  one frame, up to 0.1 m on a busy machine; e2e-studio's light check failed under load).
- New suite `e2e-tuner-phone` (required).


## 4.40.0 - Animation tuner: slide a key earlier or later in its clip, baked into the key files (2026-10-21, PR #87)
- Animation tuner, Keys tab: slide a key earlier or later in its clip ("◀ Earlier" / "Later ▶", one bake frame = 1/48
  of the cycle, or the time slider), previewed live. Keys keep their order, the first key stays at the cycle start, and
  with Mirror on the mirror key moves with its own key. Undo, reset, export and import work as for every slider.
- The bake (`scripts/anim-tune-bake.mjs`, and `scripts/anim-keys/apply-tune.mjs`) writes a moved key's phase into its
  key file, regenerates the tuner's key list (`src/anim/tuneKeysMeta.ts`) and prints the clip's rebake. An export with
  no timing edit bakes exactly as before; the 28 clips are unchanged.

## 4.39.0 - Animation tuner redesign: docked panel in the menu style, body map, pinned sliders, folding groups; brighter studio (2026-10-21, PR #86)
- The animation tuner redesigned (Michael: "the UI is currently very poor": hard to read, cluttered, hard to navigate,
  looks unfinished). It now looks like the game's menus (their font, colours and focus bar), with larger text and values
  (Medium, now the default, is 19 px at 1080p; S / M / L 16 / 19 / 22).
- Docked to the right edge, at most a third of the screen. In the Anim Studio the picture gives up the panel's width,
  so she stands in the middle of the free area. The studio hides the game HUD (health, compass, objective, weapon and
  ammo).
- Pick a part on a body map (her joints seen from behind, the gun, the whole body), from the part list (the pad's way)
  or by clicking her in the scene: only the sliders that move that part show, and the first one is selected. Click it
  again for every part.
- Rows sit in groups by what they move ("Right elbow", "Knees") that fold; the first group and the selected row's group
  start open.
- Pinned (☆ on a row, or Y menu > Pin) and recent sliders show as chips over the rows; a chip goes to its slider. The
  search moved there and searches every tab.
- The status line reads the stance really playing ("Walk · Rifle holstered", "Low ready · Rifle drawn"; outside the
  studio "No gun drawn" for "Unarmed").
- The studio's stage lights are brighter (key 2.4, fill 1.4, rim 1.5, top ambient 1.5; were 1.7, 0.9, 1.3, 0.8): she
  read dark at 1080p on the hardware GPU. They now face the camera (key and fill on its side, the rim beyond her) from
  any view: placed in front of her, the usual view from behind saw only the rim and the top light. The game's lighting
  is untouched.
- Pad: the D-pad reaches the part list and the chips (after the playback bar, before the tab's controls); the group
  headers fold with A; the Y menu gains Pin / unpin this slider and Show every part. No button moved.

## 4.38.0 - Marlow Yard fixes: co-op guard hold, station 2 bolt, camera cue grid only; pause menu restart at checkpoint and return to lobby (2026-10-21, PR #85)
- Co-op: holding a guard as the joiner no longer slows and shoves you (Michael: "coop player unusual and slow movement
  when holding guard"). The held guard stayed solid on the joiner's side and kept pushing the holder back; it is now
  non-solid there, as on the host and in solo (bullets still hit him). On the host, the joiner's hostage follows the
  joiner's drawn body instead of stepping ahead of it. Solo hold and carry speeds are unchanged.
- Marlow Yard station 2: the host can unbolt the door alone after the leg-up (Michael: "stays closed and locked").
  The host's own presses on course devices were counted as the joiner's, so the bolt checked the joiner's side of the
  door (and "Bolted from the other side" went to the joiner's screen). The same fix credits the host's own hold
  consoles, pickups and finish correctly.
- Camera cue: the pulsing red frame edge while a camera sees a player is gone; the cue is the red grid only (in
  electro, the white grid). The two red lines on station 3's floor are the painted edges of that camera's +-30 deg
  sweep (course spec M2), kept.
- Pause menu: "Restart at checkpoint" in Sector Ops and the co-op course (the section or the bay starts again, both
  players back at the checkpoint) and, in co-op, "Return to lobby" (both players back to the room lobby). Each asks
  first, with Stay focused. In co-op both are the host's: the joiner sees them disabled, "Host only".

## 4.37.0 - Joints, Hands & feet, IK and Weapon tuning bake into a base table every Wren reads, the partner too (2026-10-21, PR #84)
- Joints, Hands & feet, IK strength and Weapon tunes now bake (Michael: "make sure i have full control over every stance
  and every body part"; COVERAGE gap 1): `scripts/anim-tune-bake.mjs` writes them into a generated base table
  (`src/anim/animBase.ts`) instead of listing them as manual, so a tuned elbow becomes the default after the merge.
  Exports from before (version 1 and 2) bake too.
- Those four sections now act on every Wren rig, not only your own: the co-op partner's avatar and the Anim Studio's
  pair puppets show the base table and your live tuner edits; guards and other characters are never touched. The
  tuner's sliders are changes on top of the base table (reset them after a bake: the look stays).
- With the game paused (the tuner's Pause, the studio's pause) a Joints, Hands & feet, IK or Weapon edit now shows at
  once, as the Body and Gun sliders do (before it waited for the game to run).

## 4.36.0 - Animation tuner: key stepping, playback bar on every tab, twist and mirror keys, aim stances, own rows (2026-10-21, PR #83)
- Keys tab (Michael: "how do the keys work ... i dont understand how to view each frame"): picking a clip and a key in
  the Anim Studio plays that clip on the spot, paused on that key; "◀ Key" / "Key ▶" step the clip's keys (its mirrored
  half too) with the key list following; a readout names the key ("jog - key 2 of 8 (mirror of 6), frame 4"); the bone a
  slider edits is marked; a hint: "Key edits change one pose; whole-cycle changes go in the state tabs."
- A playback bar on every tab in the Anim Studio (Michael: "i should be able to alter speed/steps/pause etc no matter
  which window im in"): Play / Pause, ◀ Key / Key ▶, the time, the speed, the gun (Rifle / Pistol) and "On the spot"
  (moved from the header). Keys F9 play / pause, F1 / F2 a key back / forward, F8 on the spot; pad right stick left / right
  a key, up play / pause, L3 on the spot. Every pick plays at once: a state, a weapon (the stance swaps to it), a clip
  or key, a climb move, a co-op role.
- Keys for every arm and trunk joint (Michael: "there is a forearm twist that i cant see to fix"): Forearm twist, Upper
  arm twist, Shoulder forward / turn / out, Head bend / turn / roll and the Hips shift per key; the game plays them and
  the key bake writes them (new key fields `armX.twist`, `armX.twistUpper`, `armX.sh`, `head`; new clip channels `fore`,
  `head`, `sh`). Old key files load as before. The Joints part names the twists ("Right forearm twist").
- A "Mirror" box in the Keys tab (Michael: "if they were uneven i dont know how id adjust them separetly"): on (default)
  an edit shows on the other arm half a cycle on, as before; off, each key and arm is its own, and the bake writes the
  clip in full where the arms differ.
- Aim stances in the Anim Studio (Michael: "How do i just adjust aiming stance?"): aim standing, crouch aim standing
  and crouch aim moving, each with the picked gun.
- States that shared a tuner row have their own (COVERAGE gap 3): crouch run, aim standing (the glides keep "Aim
  moving"), crouched aim moving, the crouched wall states and carrying a body, and the rifle and the pistol their own
  Joints rows in the armed states. Saved values, presets and exports from before give each new row the value of the row
  it shared, so nothing tuned is lost.
- Key edits of the ready stance and the glides now show in play with the gun out (arms over the gun hold, the glides'
  trunk while aiming).

## 4.35.0 - Animation tuner: free mouse, selection highlight, Keyed tick box, on the spot from every tab, studio light (2026-10-21, PR #82)
- Animation tuner with keyboard and mouse (Michael: "the player camera locks the mouse in position"): the open panel
  leaves the pointer free in "Drag view": drag the scene with the left button to turn the camera, the wheel zooms (the
  free view's orbit), every slider and list stays clickable, and scene clicks never fire. F4 or the header button
  switches to "Game camera" (the normal captured mouse look; the panel ignores the mouse) and back; Esc in the game camera
  returns to drag view instead of pausing. Closing the panel gives play its normal mouse capture back. The pad is
  unchanged.
- The part being adjusted is marked (Michael: "clearly highlight the body part/weapon/animation"): the selected row has
  a yellow bar and bold name, the active tab a yellow underline, a "▶ part · state · row → target" line names it, and the
  scene shows a pulsing yellow ring (black edged, on top, readable on light and dark) on the joint, bone, both feet or
  knees, the weapon or the whole body the row edits.
- Anim Studio: a "Keyed" tick box beside the Loop list plays the state's keyed clip (cleared: the procedural state),
  instead of hunting the keyed loop in the list.
- Anim Studio: a state picked in any tab's state list plays that state's loop; "Loop on the spot" is on every tab (the
  header button "On the spot: on / off", F8, L3 on the pad).
- Anim Studio: stage lights that follow her (key, fill, rim and a soft top light, on her only), a brighter studio
  ambient, and a "Stage light" slider (View tab; bright by default, saved with the tuner's settings). The game's lighting
  is unchanged.

## 4.34.0 - Co-op: the partner sees guards' flashlights (2026-10-21, PR #81)
- Co-op: the joiner now sees the guards' flashlights. Each guard in the host's snapshot carries a torch bit in his
  enemy `al` (`AL_TORCH` 8; protocol 24 -> 25). The client lights one of its own map's torch slots per lit guard and
  places it with the host's code (`world/torches.ts`: `placeTorch`, `beamReach`, `addTorchSlots`) from the guard as
  drawn, so the picture, the haze and the client's light meter read the same light the host's guard perception reads
  (light parity). The aim is derived from the position, yaw and crouch already on the wire. Cost: 0 bytes for a guard
  without a torch, at most 1 byte for a lit one.
- `net/torchMirror.ts` (pure) is the client's mirror; `EnemyPuppet.torch` / `torchCrouch` feed it. A guard missing
  from a snapshot loses his torch at once; listed again, it comes back from that snapshot.
- Test hook: `Enemy.torchOverride` (true / false forces the torch rule; null in play). `EnemyManager.hasTorch(e)`.
- Tests: `tests/coopTorches.test.ts` (the wire round trip, host vs client light at points, the mirror), the protocol
  asserts at 25; e2e-coop checks a host guard's torch on, then off, on the client.

## 4.33.1 - No more GL program warnings when graphics settings change on a hardware GPU (2026-10-21, PR #79)
- Hardware GPUs: no more "GL_INVALID_VALUE: glGetProgramiv: Program object expected" warnings when the post stack is
  rebuilt (a graphics setting change). A shader program that is still compiling in parallel is now deleted only once its
  compile finishes (`src/core/babylon.ts`). e2e-desktop under `E2E_GPU=1` passes its console-errors check again
  (backlog 27).

## 4.33.0 - Animation tuner laid out for the pad: tabs, drop-downs, one step at a time (2026-10-21, PR #80)
- Animation tuner layout pass for the pad (Michael, 2026-10-21: "Not practical for controller use. It's such a long
  list"): tabs across the top, LB / RB (or a click) cycle them: View, Body, Hands & feet, Weapon, Stepping, Weight,
  Camera, Keys, Co-op, then any later section, then Settings. One step at a time inside a tab: a drop-down for the part
  (when the tab holds more than one), one for the state (and weapon then state, clip then key), then that group's
  sliders. Every list opens as a visible drop-down (A or a click; D-pad or arrows move, A / Enter picks, B / Esc backs
  out); a pick steps the focus on to the sliders, B from a slider goes back to the picker.
- Every value shows at all times, light on dark: the panel sets explicit colours on all its controls (the old focus
  mark cleared the buttons' background, and a value at its default lost its colour: white on white, dark on dark).
- The panel scales to the screen (Small by default; Settings > Size: Small / Medium / Large, saved in the tuner's own
  IndexedDB store, key `ui`). The hint strip is reserved space at the bottom, pad glyphs with a pad, key and mouse help
  otherwise, switching live.
- Plain short labels ("Foot width", "Knee out", "Hip height", "Lean", "Right elbow bend"), units beside the values; ids,
  saves, exports and the bake table unchanged.
- Pause stops the game: under the pause menu no synthesised input (the studio loop, the free view demo) moves her and
  the menus get the pad; "Pause game while tuning" (Settings, on by default) holds the game still while the panel has
  the pad (not in the Anim Studio, where Play / Pause rules, nor in co-op).
- Camera snaps (View tab: Front / Side / Back / Top) lock: the orbit holds that angle to her facing as she turns and
  moves, until Unlock or another snap; the pad stays on the panel. They work outside the studio too.
- Anim Studio: picking a loop sets the tuner's state to match (body state, joints, reach, hands, stepping, weight, the
  clip's keys, the co-op role, the climb move); "Loop on the spot" (default on): a moving state walks a treadmill (the
  gait runs, the root is held, the feet slide back with it) and a clip plays in place; off, both walk the 2 m circle.
- Pure parts in `src/ui/tunerLayout.ts` (`tests/tunerLayout.test.ts`); e2e-menus and e2e-studio follow the new
  navigation (tabs, the drop-down, values shown, pause, the snap lock, loop on the spot).

## 4.32.3 - e2e-stealth-ai wall peek picks its spot with the guard's own eye (2026-10-21, PR #78)
- e2e-stealth-ai's wall peek block keeps a guard spot only if the spawned guard's own eye sees the peeking head and
  not the chest. It picked the spot with a 1.55 m eye guess, 4 cm below a grunt's eye, so the real guard could see the
  chest too and "the guard there sees the peeking head only" failed now and then (#65, #71). Test only.

## 4.32.2 - The last of pad aim assist removed (G16) (2026-10-21, PR #77)
- No aim assist (G16): the last of it, the pad's `gamepad.aimAssist` setting (default "standard", read by nothing since
  the aim-assist code went), is removed; an old stored value is dropped when settings load. Tests and the e2e helpers
  that switched it off no longer touch it. No save change.

## 4.32.1 - GPU shot rows for Marlow's low cells, airlock lids and dressing; warehouse s1 view re-aimed (2026-10-21, PR #75)
- Test scripts only: `scripts/shots-ctcourse.mjs` gains rows for two 4.5 m low cells, the 3.2 m airlock lid seen from
  below and the S1 desk, S3 monitor wall and S8 coffer (they need the marlow-variety geometry, PR #62).
  `scripts/lamps-shots.mjs` (Warehouse lamp look) is now tracked, with the section 1 workshop view re-aimed into the
  room (it was behind a wall). GPU on #62 99349d64 and master: all 23 Marlow rows agree within 0.02.

## 4.32.0 - Marlow Yard as an underground bunker: ceilings, lamp fittings, airlocks, lifts, station dressing (2026-10-21, PR #62)
- Marlow Yard is an underground training bunker (Michael 2026-10-20, the approved audit shortlist;
  `docs/marlow-bunker/`). Ceilings per test cell (low cells 4.5 m, the laser cell 5.5 m, the climbing and kill-house
  halls 7.5 m), perimeter and airlock walls 6 -> 7.5 m, no moon, a dark sky and close fog. The open floor still reads
  0.30 (all fill now, Michael's choice): every light level the course was tuned on is within 0.08 (`LIGHT.md`).
- All 29 lamps have fittings, cool white: pendants on rods at today's heights in the high halls, flush strips in the
  low cells and the laser cell (faintly red), flush panels in the kill-house, caged bulkheads under the airlocks' new
  3.2 m lids (chamfered haunches). Compensated by measurement.
- The station 3, 6 and 8 walls are bulkheads up to the ceiling; station 4's wall runs to its ceiling with a header from
  4.6 m over the laser gap (the throw passes under it). No new climbs: under the ceilings the only lips are the
  planned ones (S2 / S7 walls, the S5 roof front, the S7 stair); the 6 m perimeter lips once hangable from the high
  wall tops are gone.
- Dressing (no collision, no light change except the ribs and haunches near the ceiling): ceiling ribs, haunches, LED
  strips, wall panel seams, a colour band per cell, door frames with status lamps, the entry lift (west) and the
  goods lift (east); readability paint: the leg-up mark up the S2 / S5 / S7 wall faces, the S3 camera's sweep edges,
  the S4 beam emitters, the S5 hatch cover, the S6 "pair" line, the S7 rope anchor.
- Variety (marlow-variety, folded into this PR; Michael 2026-10-21, the marlow-bunker polish list;
  `docs/marlow-variety/`): a sentry desk at the station 1 post and a blast-door frame round the entry lift; a monitor
  wall in the camera cell; plant-room faces at the south pockets and one-way-glass instructor booths at A3 / A4;
  plywood and painted windows on the kill-house; frames round the station 6 scanners and server racks; the station 7
  stair painted as training blocks; a coffer with a faint green LED ring over the exit; a hazard frame on the laser
  release; black and white hazard stripes on every door frame. No light change at the 196 test points, no new ledge
  or climb (only the 2 m racks are solid, no lip), the routes stay clear.
- Text: "fence" is "wall" (station 4 panel, radio and objective; the training guard's line); the spec carries the
  bunker fiction and an element register.
- GPU look (2026-10-21, Menu Notes): fittings and ceilings right, the floor between pools not darker than its value;
  meter and field agree on all 17 rows once the shot script waits for sim time (#72).

## 4.31.0 - Camera cue: a faint red laser grid where a security camera looks (2026-10-21, PR #63)
- Security cameras show a faint red scan grid on the floor and walls they see, sweeping with the pan (Michael M1
  "Always, faint"); stronger in electro vision, its edge pulses while the camera sees a player, it fades when the camera
  is jammed, off or shot. Render only: same field, range and static-collider line of sight as detection, never a light.
- Fix round: in electro the grid is a clear white lattice (it vanished in the post); the co-op client's grid pulses too
  (the host's camera test run on both bodies, nothing sent); the cue's rays are cast per fixed step on both sides.

## 4.30.2 - Decisions G192-G228 folded from the roadmap (2026-10-21, PR #76)
- Docs only: Michael's answers from 2026-10-19 to 2026-10-21 move from `docs/ROADMAP.md` "Decided" into
  `docs/DECISIONS.md` as G192-G228, each also in `docs/design-bible.md`.

## 4.30.1 - Orchestrator docs: 2026-10-21 roadmap, STATE, account handoff plan (2026-10-21, PR #74)
- Docs only: `docs/ROADMAP.md` (Michael's overnight answers, Done 4.21.0-4.30.0), `docs/orchestrator/STATE.md`,
  `docs/orchestrator/HANDOFF.md` (the weekly-limit account switch), `docs/backlog.md` (GPU GL warning, e2e-stealth-ai
  wall peek).

## 4.30.0 - Tuner bake script: an export written into the game defaults, with a dry-run diff (2026-10-21, PR #73)
- Animation tuner bake (dev tool, no game change): `node scripts/anim-tune-bake.mjs <anim-tune-YYYY-MM-DD.json>
  [--dry-run] [--only section,...] [--allow-shared]` writes an export's values into the code defaults (body, gun, camera,
  speed, stepping and weight constants; the Keys section's key JSONs through the apply-tune functions, with the Blender
  rebake commands printed, never run), so after a reset of the baked sliders every slider reads identity with the same
  look. The dry run prints the diff and a table (section, group, slider, value, result, target). A slider whose groups
  share one code value bakes only when they agree ("manual: shared target" otherwise; `--allow-shared` bakes a single
  changed group and warns); sliders with no code value (joint, hand, IK and weapon tables, most clip-data sliders, the
  co-op role / contact and Traversal moves sections from #71) are listed "manual: no code target". Refuses a wrong magic or version, a value beyond its wide range, a target not found
  exactly once and any file outside `src/` and the key JSONs. A ledger (`src/anim/tuneBakeLog.json`, `group|id=value`)
  means a baked value is never baked twice, in a re-run or a later export. Mapping: `src/anim/tuneBakeTable.ts`; logic: `src/anim/tuneBake.ts`; tests:
  `tests/animTuneBake.test.ts`; `docs/anim-tuner/BAKE.md`.
## 4.29.0 - Anim Studio PR 2: co-op pairs, guard holds, traversal prop rig and loops (2026-10-21, PR #71)
- Anim Studio pairs (Michael, via the orchestrator: "fine tune coop animations with the same freedom, traversal etc.
  coop should show me both characters also"): each co-op team move plays with BOTH operators (two Wren puppets, Wren
  herself hidden) on one clock, through the game's own paths and timing, no network: leg-up, ledge relay, partner throw,
  hang-down, two-person rope and revive. Scrub, step and pause move both at once. The holds pair Wren's hold clips with
  the guard's (idle + held hands, back + stumble, choke + sag, knife + collapse) on one clock; the Body section's hold
  gap / side set their spacing.
- New tuner sections (registry): one per co-op move with role A, role B and contact groups (body forward / up / side,
  turn, lean, crouch, hand and foot grips, pose timing; contact offsets between the two, weighted by the move's contact
  window), and Traversal moves (vault, mantle, step, climb-up, window, rappel, drop, hop, roll, wall kick, split) for the
  moves the Body section has no state for. Live in real play for the local player's own role only; the partner always
  plays the shared defaults; nothing goes on the wire; visual only.
- The studio is a 28 m room with a traversal rig round the walls at the engine sizes: the co-op team block (4.4 m lip,
  a rappel point), a 2.4 m ledge wall, a 1.0 m low wall, a platform with a ladder and a drainpipe, a horizontal pipe, a
  hang bar, a vent duct, a window and a door. Traversal loops walk Wren to a prop and play the real move by synthesised
  input, then reset and repeat: vault, ledge grab + shimmy + climb up, ladder up and over, drainpipe, pipe hand over hand,
  hang bar legs up / inverted, vent, window, door, rappel, back to the wall.
  Detail: `docs/anim-studio/REPORT-2.md`.

## 4.28.1 - shots-ctcourse waits for sim time after each teleport (2026-10-21, PR #72)
- Test script only: `scripts/shots-ctcourse.mjs` waits 0.3 s of sim time (the game clock) after each teleport before
  reading the light meter and the light field. The meter updates every 0.1 s of sim time, and at Epic boot 800 ms of
  wall time could be under 0.1 s of sim, so s1-bay read a stale 0.970 against 0.606. It also refuses a foreign server
  on its port (the served `index.html` must match `dist/`). GPU at 2bd82f31: all 17 rows agree within 0.02.

## 4.28.0 - Smooth world: voxels off by default, baked lamps on the smooth path (2026-10-21, PR #58)
- The world draws smooth by default (Michael, 2026-10-20: "there still looks to be voxel graphics in the map which is no
  longer the goal"; he chose "Turn voxels off by default"): the level's boxes and cylinders in PBR with the CC0 surface
  atlas, the box detail pass at the Detail tier, smooth characters, weapons and props. `?voxels=1` keeps the voxel look
  for comparison (`?voxels=0` still means off). `?gfx=min` keeps its fast path (standard materials, no baked lamps).
- Light parity: the baked lamps (`BakedLamps`, the darkness curve, the ambient-grid fill, the baked moon, closed doors)
  now render on the smooth path too, so the picture reads the same bake as the light meter and guard perception.
  `tests/smoothWorldLight.test.ts` bakes Marlow Yard from the voxel and the smooth builders and proves the bakes and the
  light field are identical; `tests/lampLevel.test.ts` checks the level keeps its fill under night vision.
- The smooth level's fill and probe light follow the voxel walls' sky formula (a render-only sky bake from the canonical
  shapes, `src/world/levelFill.ts`): the first GPU shots showed smooth walls brighter than the light meter (annex walls
  about 20x the voxel fill). `tests/levelFillParity.test.ts` checks seven Marlow Yard points within 10%.
- Without voxels: rain stops under roofs through a roof grid from the canonical light shapes (`src/world/roofGrid.ts`),
  moving casters under a roof leave the moon cascades, fog shafts use the baked moon; voxel GI and bullet chips are
  off (decals instead), ray-traced reflections fall back to SSR.
- Tests: e2e-desktop's voxel and RT parts pass `&voxels=1`; e2e-lightbake adds a `gfx=epic&voxels=1` config and checks
  the smooth Epic path. Polish list: `docs/smooth-world/POLISH.md`.

## 4.27.0 - Tuner Weight section: momentum, lean, plant and landing load, springs, anticipation (2026-10-21, PR #70)
- Animation tuner: a Weight section (per holstered walk / jog / run, crouched, drawn) for hand-tuning weight in the
  movement: momentum (time to speed, stop time, turn rates, a stop overshoot; gameplay, local only), lean into
  acceleration and turns and a counter-lean on stops, foot-plant and landing load, springs on the chest, head, arms and
  carried guns, an anticipation dip on starts and vaults, and a camera follow-lag / dip signal for the camera section.
  Every slider defaults to today's movement and pose exactly. Detail: `docs/anim-tuner/WEIGHT.md`.

## 4.26.0 - Anim Studio: a stage with the loop player, skeleton, feet and onion-skin views, camera snaps, undo, A-B and presets (2026-10-21, PR #69)
- Anim Studio (dev) (Michael 2026-10-21: "I want freedom to manipulate the body/animation as needed ... a basic stage
  similar to the old main menu that allows me to make all the adjustments on the spot using controller or k&m"): a row in
  the main menu and in Pause (single player only) opens a plain stage (a dark room with a 1 m floor grid, warm key, cool
  rim and soft fill lamps; `?autostart=studio`) with the animation tuner docked, a Studio section at its top and the
  debug overlay's crab readout.
- Loop player: every keyed clip (all 28 in `src/anim/clips/keyed`, the walls, holds and guard clips that the game does not
  play yet included) sampled straight onto Wren, in place with treadmill feet or with root motion along a 2 m circle; the
  procedural states (idle, walk, jog, run, crouch idle, sneak, crouch walk, low ready, aim glide forward / strafe / back)
  by synthesised input on the circle. Play / pause, a key back / forward, scrub, speed 0.1-2x (above 1x only in the
  studio), mirror, root motion on / off. An optional guard figure stands at the hold offset (guard clips play on it).
- Viewing aids on a 2D overlay (no scene meshes): skeleton, foot contacts and foot trails, onion skin (the previous / next
  key, faint), a turntable (the orbit view circling at 10-90 deg/s) and front / side / back / top camera snaps.
- Snapshots in the tuner (in and out of the studio): undo / redo of every tuner change (a drag is one step; Ctrl+Z /
  Ctrl+Y, the Y menu), A/B compare, named presets saved in the tuner's own IndexedDB store (never the main save).
- Leaving the studio puts the time scale back to 1x and resets every studio switch; gameplay never reads studio state.
  Detail: `docs/anim-studio/REPORT.md`.

## 4.25.0 - Tuner v2: per-joint offsets, hand and foot placement, IK strength, weapon grip and fingers, stepping, per-key editing (2026-10-21, PR #68)
- Animation tuner: four new sections after Camera, wired through the section registry. **Joints**: per-state pitch / yaw / roll offsets for 21 joints, with a mirror lock (group `joint.options`). **Hands & feet**: hand and foot IK target offsets and hand rotation, per weapon and state. **IK strength**: per limb and state, 0 = FK (rest + joint offsets). **Weapon**: gun scale (visual only), gun in the hand, support hand, trigger finger, finger curl, per weapon and state. Each follows the game state and weapon, saves, exports, resets and works with the pad like the other sections; at the defaults nothing changes.
- Animation tuner: a **Stepping** section (item 3, after Weapon): per gait (still, walk, jog, run, crouched walk / run) foot lift, plant lock strength, step duration, foot-slide tolerance, a 3-point stride curve, toe-off and heel-strike roll and the replant threshold, as multipliers on the foot planner's own values (default 1 = unchanged). Feet stuck while running: the run's trailing foot stays planted to the leg's stretch limit; try Stepping > run > replant 0.8.
- Animation tuner: a **Keys** section (item 4, after Stepping): pick a keyed clip's key (`walk` key 1 = phase 0.125,
  every key of every clip in `scripts/anim-keys/keys`) and turn the pelvis / spine / chest / neck (pitch, yaw, roll),
  the upper arms (flex, abd), elbows (bend, inward) and wrists (pitch, yaw, roll) at that key only; the clip plays the
  edit live, blended to the neighbouring keys (a mirrored clip's other half follows). Export as usual, then
  `scripts/anim-keys/apply-tune.mjs <export>` writes the edited key files for `build.mjs` to bake. No edits: the clips
  play exactly as baked. Detail: `docs/tuner-v2/ITEM4.md`.

## 4.24.0 - Crouched movement and the wall set reworked (anim-rework slices 4 and 5) (2026-10-21, PR #66)
- Crouched movement (slice 4, `docs/anim-rework/S4-REPORT.md`; the real-world operator standard, BRIEF 3 "Stealth"):
  - holstered crouched: the keyed sneak, crouch walk and crouch run as one continuous speed blend (no pop), the knees
    and feet under the hips (knees 0.7 x the hip width, was 1.6; feet about 5 cm off the line, was 9-10), arms along the
    body (elbows 2 cm out, was 17-18), the crouch run leaning forward (about 37 deg) and low without the knee dragging;
  - the crouched idle when holstered is a deep balanced squat with each hand resting on top of its knee, palm down,
    fingers forward (was a one-knee kneel with the hand upside down and off the knee), slow breathing (a 12 s cycle of
    three breaths), a slow head scan; with a gun out she still kneels, its breathing slowed (a breath every 5 s);
  - crouched with a gun out: the crouched legs under the low ready and aim; the crouched aimed strafe is the short
    shuffle step (was a 35-44 cm wide crab with crossing feet);
  - stand <-> crouch in every state blends on the 0.22 s stance curve with no snap (the old crouch run to standing
    snapped the legs); standing up from a sneak re-steps the feet under the hips;
  - new e2e-anim checks: the crouch and sneak gaits, crouched idle / start / stop / run / low ready walk / aimed idle /
    aimed strafe, the knee hand, and a stand <-> crouch pop check; e2e-clip checks the arms against the legs crouched.

## 4.23.0 - Tuner: camera and speed sliders, free view, freeze, full pad control, import, bypass, search (2026-10-21, PR #65)
- Animation tuner: a Camera section (Michael 2026-10-21: "include camera adjustments to the animation sliders too, so
  I can fine tune camera locations too"). A picker per camera state (explore standing / crouched, low ready, aiming
  rifle / pistol, back to wall, peek, climb / hang, vent / crawl, holding a guard) that follows the current state, with
  sliders for distance behind, height, shoulder side offset, look-at height, FOV, aim zoom, transition blend time,
  follow damping, boom pull-in rate and collision margin. A grey "today: ..." line under each slider shows the value
  the game uses now. At default the camera is unchanged; the wall collision still applies after the sliders. Same
  save, export, resets and pad control as the other sections. Detail: `docs/anim-tuner/CAMERA.md`.
- The tuner's sections now come from a registry (`src/anim/tuneRegistry.ts`) so other jobs can add sections from
  their own files; saves and exports are unchanged (API: `docs/anim-tuner/STATE.md`).
- Free view (Michael: "a free view camera so I can view the animation from any direction freely"): Orbit circles the
  player (right stick / mouse, zoom on the triggers / wheel) while the player still walks; Fly is a detached camera,
  and the player stands or walks a demo loop (walk, jog, run, crouch walk, aim strafe). The game keeps running;
  gameplay never reads the free camera, and turning it off gives the game camera back exactly. Hide HUD toggle.
- Time: a game speed slider (0.1-1x, slow motion in normal play), Pause / Resume and Step (one frame); View handing the
  pad back to the tuner freezes the game mid-animation (on by default) and View to the game resumes. Off in co-op.
- Speed section (gameplay, local only): creep / sneak / walk / jog / run standing and crouched, aimed glide forward /
  strafe / back, wall slide, ladder / pipe / shimmy / duct crawl, each with today's value. Tests, e2e and co-op use the
  defaults until the values are folded in (the panel says so).
- Every tuner control by pad, with a new map: D-pad moves through every control, A selects or edits (a slider changes
  only in edit mode: left / right or the stick, LT fine, A keeps, B cancels), X resets the row, Y opens a menu (export,
  share, reset group / all, clear log, import, changed only, barrel marker, wide ranges), LB / RB jump between sections,
  LT / RT switch the state, R3 held shows the untuned animation, View swaps game / tuner, Menu closes. The map shows in a
  strip at the bottom of the panel and in `docs/anim-tuner/STATE.md`.
- Smooth state changes (Body and Gun ease over 0.1 s instead of popping), Import of an exported JSON, "wide ranges"
  (every range doubled), typed values in each row, a bypass (R3 or Backquote held), and a slider search box.
- Fix: the barrel marker turned half the screen grey. It is now drawn on a 2D overlay (no scene meshes, no per-frame
  Babylon allocation).

## 4.22.0 - Sector Ops lamp fittings, translucent roof sheets, warehouse dressing (2026-10-21, PR #59)
- Sector Ops Warehouse lamp fittings (Michael 2026-10-20: "The sector ops lights are not sitting properly on the
  ceilings, some are even above ceilings or just floating"; quick, believable, three types, in code). Every lamp of the
  three sections is now a fitting fixed to the structure: under a ceiling, a dome high-bay on a drop rod (halls) or a
  fluorescent batten on two hangers (rooms, corridors, decks), a strut to the roof strip when it hangs under a skylight
  gap; with no ceiling over it, a caged bulkhead on a bracket arm on the nearest wall (door lamps, signs, the yard
  floods); on the roofs, a dome on a mast. 98 of 99 lamps mounted (S1 33 of 34, S2 23, S3 42); the one left keeps its
  box (S1 yard (11.25, 2.45, -22.45), inside the container). `world/lampMount.ts` (pure) mounts them at level build.
- The three models (`world/fixtureModels.ts`, pure): built from boxes and frustums, one body mesh and one glowing face
  mesh per type, thin-instanced; one shared dark steel body material (PBR, lit by the lamp bake) and the bulbs'
  emissive material for the faces (dark when the lamp is out or shot); every rod, hanger, arm, strut and mast is one
  box mesh. 7 draws for all of them, built once at load. Other maps keep their glowing boxes.
- No light moved: positions, radii, intensities and the fixture boxes the bake samples are as before, so the light
  meter, guards and the bake read the same (the section light tests pass unchanged). A lamp's shot box is still its old
  box (a batten's ends are not a target yet).
- Test: `tests/warehouseLamps.test.ts` (each section: every fitting's mount ends within 3 cm of the ceiling underside,
  wall face or roof under it, nothing cuts the fitting or its rod; the exception list; the models).
- Roof sheets (Michael: the open sections are "usually a opaque type of corrugated plastic sheet that allow light in but
  cant be passed through"): every open section of the hall roofs (the four skylight gaps across all three sections,
  section 3's 2.95 m open strip at z -8.95 to -6 and the slit over section 2's south wall) is a pale see-through
  corrugated sheet, solid (collision only; overhead, no ledges). It is not in the light bake and casts no shadow, so the
  moon reaches the floor under it exactly as the bake, the meter and the guards have it (dimmer-than-sky light through
  plastic needs a translucency rule in the bake, G45, not built). Section 1's roof hatch and smoke vent are routes (R2)
  and stay open. `LevelBuilder.sheet`, `world/roofSheets.ts` (pure); one more draw.
- Detail (Michael chose "Walls + ceiling + dead-space clutter"; `world/maps/warehouseDress.ts`, pure): along the hall
  walls of all three sections pipe runs (256 m), cable trays (118 m), 16 signs, 12 fire points (extinguisher and
  panel), 39 hazard stripe bands at doorways, a roller door on section 2's north wall; roof trusses on the frame lines
  (81 panels; the top chord only over the high routes) and a duct in section 3; floor lanes and bay plates by the
  racks. 15 floor items in dead space: pallet stacks, drum pairs and cartons in the halls, lockers and a desk in side
  rooms. Every piece is a visual `detail` box drawn with the level's own box mesh (no new draw, out of the bake);
  the floor items also get one collision-only box (no cover face, no ledge). Each kind is skipped where it would cut a
  solid piece, a traversal anchor, a door, switch or device, a lamp or its mount, or where it would hang under 1.8 m
  over a walkable top (rack tops, decks, roofs); floor items stand 1.5 m clear of every section route, 2 m clear of
  every guard patrol and post, and off every sightline a guard has today to a route within 20 m. Not placed: the
  second roller door (section 3's east wall), the forklift (no dead space fits one) and boxes on the racking shelves
  (the racking's voxel art already holds loads at the voxel presets).
- Test: `tests/warehouseDress.test.ts` (the roofs closed but for the route openings, the sheets solid; the light shapes
  the same as without the dressing; no piece cuts a solid one, 1.8 m headroom; floor items clear of routes and
  patrols, on the floor, with collision).

## 4.21.1 - e2e-pad steps over the tuner item; steadier heap test (2026-10-21, PR #64)
- e2e-pad's pause menu walk steps over "Animation tuner (dev)" (added before Quit by the anim-tuner job); "focus Quit"
  failed every run, hidden by KNOWN FLAKY. analogGear "allocates nothing per update" warms up and takes the smallest of
  three passes (a single pass read 3.5 MB on a loaded CI runner). Test only.

## 4.21.0 - Selection wheel sized to the screen, radial ring look, FPS banner bottom left (2026-10-21, PR #61)
- Selection wheel restyle (`docs/wheel-ui/SLICE1.md`): the wheel sizes itself from the screen (130 + 0.36 x height px:
  518 px at 1080p, was about 430; about 250 px on an 844 x 390 phone) inside the safe area, never under the top HUD or the
  hint box; SVG ring segments with the highlighted one lit, icons and counts, the vision slot showing its mode, the
  item name in the centre. The FPS banner moved to the bottom left corner (it covered the compass on a phone).


## 4.20.1 - The animation tuner works with the pad (2026-10-21, PR #60)
- Animation tuner pad control: the panel takes the pad when it opens (Pause > Animation tuner, Settings, F3 > Anim).
  D-pad up / down pick a slider (body rows, then gun rows), left / right nudge it by its step (held: repeats, x5 after
  1 s), the left stick X nudges in analogue steps, LB / RB switch the focused section's state group, Y resets the
  slider, A exports, B closes, View moves the pad between the tuner and the game ("PAD: tuner" / "PAD: game" on the
  panel). The focused row has an amber outline. While the tuner has the pad the game and the menus get none of it.
  Keyboard, mouse and touch are unchanged. Detail: `docs/anim-tuner/PAD.md`.

## 4.20.0 - Animation tuner: live sliders for gaits, poses and the gun hold, with export (2026-10-21, PR #56)
- Animation tuner (Michael 2026-10-20: "add the sliders ... Doesn't have to look pretty, just functional"): F3 > Anim
  opens a slider panel top right (the anti-crab readout stays top left). A body-state section (idle, walk, jog, run,
  crouch idle / sneak / crouch walk, low ready, aim, crouched aim, back to wall idle / slide / peek, ladder, pipe, ledge,
  vent, crawl, hang, hold) and a gun-hold section (rifle and pistol x low ready / aim / crouched aim), each following
  the current state (untick "follow" to pick one). Sliders cover foot width, knee out, knee lift, step length, pelvis
  height / crouch depth, forward lean, arm swing and its growth with speed, elbow out, head turn, peek lean, gap to the
  wall, body distance to the ladder / pipe / guard, hand and foot reach and spacing, gap to the guard, and the gun's
  position, pitch, yaw, cant, sight height, head drop and elbow tuck; a barrel marker shows where the muzzle points.
  Changes apply live to the local player only (guards and the partner's copy are untouched; nothing on the wire), save
  to the tuner's own IndexedDB store, reset per slider / group / all, and Export downloads `anim-tune-<date>.json`
  (every changed value, its default, a timestamped change log). Every default is identity: nothing changes until a
  slider moves. `src/anim/tune.ts`, `src/ui/animTunePanel.ts`, `src/save/animTuneStore.ts`; report
  `docs/anim-tuner/REPORT.md`.
- Pass 2 (pad and phone, Michael: "I will wait for the anim tuner"): the tuner also opens from the pause menu ("Animation
  tuner (dev)", which resumes with the panel open) and Settings > Graphics, without F3, and stays open until its x. It
  folds to a header bar, scrolls on a short landscape screen, is at most 45 % wide, has 28 px touch rows, keeps its
  touches away from the game, and Share / Copy sends the export through the share sheet, the clipboard or a text box.
  Two new walk / jog / run sliders for the stiff walk (CT Core): stance knee flex and trunk / shoulder counter-rotation,
  at the top with arm swing amplitude and step length (cadence at the same speed).

## 4.19.1 - Faster, steadier e2e: co-op suites on sim time, full run ~20 min at E2E_JOBS=2 (2026-10-20, PR #57)
- Test code only, no game change. The full `npm run e2e` at `E2E_JOBS=2` passes on a loaded machine without reruns
  (`docs/test-speed/STATE.md` "Runs" and "Findings and fixes").
- e2e-ctcourse runs as three station groups in the full run (`e2e-ctcourse:1..3`); named alone it runs all eight.
- Load-safe waits: no background-tab throttling, 120 s page navigations and match loads (`LOAD_MS`), one-poll pad
  `press` / `stick`, `window.__afterSim` for timed in-page taps, sim-clock waits in e2e-stealth and e2e-course's latency
  checks, condition waits for fades and toasts in e2e-menus and e2e-pad, and station 6's late press on the client's
  own frame.
- A music fetch that fails under load prints "(ignored: ...)" instead of failing the console-error check.
- `scripts/laptop-runner.ps1`: the laptop test runner (one request at a time, detached worktree, `heavy.lock`,
  BelowNormal, port 4191).

## 4.19.0 - Drawn movement: low ready, aiming with the glide (no crab strafe), the sling draw (2026-10-20, PR #54)
- Drawn movement, low ready and aiming (slice 3, `docs/anim-rework/S3-REPORT.md`; the real-world operator standard,
  BRIEF section 3): with the gun out, standing, the legs play hand-keyed clips. Still: a ready stance, feet about hip
  width with the support foot 18 cm ahead, knees soft. At low ready the walk, jog and run legs and carriage (no lean
  below the run). Aiming, the glide: a short shuffle side-step that never crosses the feet (the aimed strafe was a crab,
  knees 2-2.9 x the hips and a foot up to 56 cm off the line; now 0.6-1.2 x and 18 cm at the widest), shorter steps
  backwards and forwards, the hips over the feet and the chest square to the gun. The aimed strafe is slower: 0.7 m/s
  at full stick (was 1.26). The rifle's low ready points the muzzle about 40 deg down in front of the feet (was 46 deg
  and 34 deg across the body); the pistol's low ready is a compressed ready close to the chest; the elbows stay in
  aiming (were 7 cm out). LT from holstered with the rifle is its own sling draw (0.75 s): the gun comes off the back
  round the right side, hangs muzzle down under the arm, then swings up into the shoulder. Crouched drawn is unchanged
  (slice 4). No wire change (PROTOCOL_VERSION 24).

## 4.18.1 - Phones render at a fixed 50% resolution (2026-10-20, PR #55)
- Phone (Michael 2026-10-20: "when it changes render resolution the screen flashes. Keep 50% render resolution the
  default and don't let it automatically adapt"): a fixed 50% of native, no dynamic resolution on phones. The 60 fps cap
  stays (Michael chose it over a 30 lock; Marlow Yard runs ~32-35 fps on his phone). Desktop unchanged.

## 4.18.0 - Sector Ops Warehouse sections 2 and 3 rebuilt, section 1 lamp pass (2026-10-20, PR #50)
- Sector Ops Warehouse sections 2 and 3 rebuilt as greybox prototypes (`docs/warehouse-redesign/SPEC.md` 2.2 / 2.3,
  `src/world/maps/warehouseS2.ts`, `warehouseS3.ts`): section 2 is a storage hall with real racking, a cage and three
  routes to the case; section 3 is an assembly hall with a mezzanine deck, a production office, a plant room, a supply
  duct and a crane walkway, with three routes to the terminal. 8 and 9 guards with jobs; no heavies, snipers or dogs
  (G155). Higher walls and parapets keep each section sealed to its connector.
- Lamp pass on sections 1-3 (Michael's section 1 walk, M1): routes and takedown spots read 0.40-0.55 without night
  vision (under the level where guards see the player fully), objectives and work areas to 0.8, dark pockets 0.30 or
  less; light-field tests pin each class with a minimum and a maximum (`tests/warehouseS1Light`, `S2Light`, `S3Light`).

## 4.17.0 - Holstered movement rework: upright walk, slower run, natural arms, starts, stops and turns (2026-10-20, PR #52)
- Standing holstered movement (slice 2, `docs/anim-rework/S2-REPORT.md`; the real-world operator standard, Michael M6
  2026-10-20): new hand-keyed walk, jog, run and idle clips play as one speed blend from a creep to the run (no gear
  pops). The walk is upright with the knees and feet under the hips and the arms hanging along the sides; the arm swing
  grows with the pace and the forward lean comes in only toward the run. The run is 4.0 m/s (was 4.5) with longer
  strides and fewer steps (3.2 a second, was 4.7; the walk 2.4, was 2.6). The idle breathes, shifts its weight and scans
  with the head, feet about hip width, arms in. Starts no longer slide a foot, turns and direction changes no longer
  slide the planted feet, a turn from a standstill no longer hops on both feet, and the hips trail the chest in turns.
  The wide walk came from the foot planner pushing every left step 13 cm from the right foot; fixed. Crouched, drawn
  and aiming movement are unchanged (slices 3 and 4). No wire change (PROTOCOL_VERSION 24).

## 4.16.2 - Phones render at 75% of native resolution (2026-10-20, PR #53)
- Phone (Michael 2026-10-20: "Cap resolution at 75%"): after 4.16.1 a Warehouse benchmark held 55-60 fps but fell to
  26 fps late in the route. Phones now render at 75% of native, dynamic resolution down to 50% on long frames. Light
  and shadows unchanged (Low preset), 60 fps cap. Desktop unchanged.

## 4.16.1 - The 60 fps cap holds on 90 and 144 Hz screens; phones scale resolution to stay cool (2026-10-20, PR #51)
- Frame cap: a deadline limiter (`capNext`) replaces the slack test, which let every frame through on a 90 Hz display
  (a phone capped at 60 drew 66 fps, then throttled to ~20). A 60 cap now holds on 60, 90, 120 and 144 Hz.
- Phone (Michael 2026-10-20: "FPS drops sharply on phone ... would be good to have it sit at 60 fps consistently"):
  dynamic resolution in a match, native at rest, stepping down to half on long frames and back up with headroom.
  Lamp light and shadows unchanged (Low preset). Desktop unchanged apart from the cap.

## 4.16.0 - Night vision pass: realistic night vision, a wider goggle frame, the vision carousel (2026-10-20, PR #49)
- Night vision (A1): modern green phosphor. The tube drive gamma 1.7 -> 1.3, green tint, dim green black, white clip from
  0.85, stronger grain in the dark; `VISION_GAIN` 8 -> 6 with the darkness curve's floor eased up to `VISION_FLOOR` 1.0, so
  deep dark reads and lit areas no longer clip. A frame auto-gain (`src/vfx/nightExposure.ts`) lifts dark frames (up to
  x3) and eases bright ones down (to x0.6); lit rooms stay in its band.
- Bodies no longer glow in night vision: the flat ambient fill on non-voxel surfaces is capped in the render path
  (`BODY_FILL`, x0.35 facing up, less facing down); lamp light on a body is untouched. Light parity, the light field and
  the bake are unchanged.
- Night-vision bloom comes from real sources only: the bright pass compresses a half-float source first (threshold 0.8,
  strength 1.4 -> 0.6), fixtures take `NV_BULB` 8 (electro stays x2.5), lit walls and bodies do not halo; the default
  bloom is off while the goggles are on.
- `?gfx=min` (no baked lamps, no lighting gain): the tube lifts its input (`postLift` 3) so night vision is never darker
  than off.
- Goggle frame: one wide, thin frame for night, thermal and electro (a rounded rectangle the shape of the screen, a faint
  rim, corners about 30%); the clear area goes from about 44% to 89% of the screen at 16:9. It fades in with the
  night-vision blend.
- Selection wheel: with the vision slot lit, A (pad) / E (keyboard) steps night -> thermal -> electro -> night and
  releasing LB / Tab selects it; the wheel opens on the current mode. The cursor-length pick is gone.
- Tests: the `e2e-darkness` night-vision target at level 0.12 is 0.10-0.45 (A2; the probe card is a non-voxel surface),
  and the probe prints the night-vision rgb. New `goggleFrame`, `nightExposure` and wheel carousel tests.
- Scripts: the night-vision shot scripts (`scripts/nv-shots.mjs`, `docs/nv-pass/nv-gpu.sh`) refuse a port that already
  answers, a dead preview or a served build that differs from `dist/`, and fail on a build or shot error.

## 4.15.4 - The FPS overlay is a thin banner (2026-10-20, PR #48)
- Settings > Graphics > Show FPS overlay (Michael 2026-10-20: "it takes up the whole screen. Can you make it a banner on
  the top of the screen with only critical information"): one line centred along the top edge: FPS, average and worst
  frame time, dropped frames, render resolution. F3 and `?debug=1` still open the full debug overlay.

## 4.15.3 - The phone menu draws at High quality (2026-10-20, PR #46)
- Phone menu (G182; Michael 2026-10-20: "menu hero should be best quality on phones if it doesn't cost much"): the
  menu draws at the High preset on phones (lamp shadows, AO, bloom, depth of field) while play stays on Low; the hero
  mesh was already the close-up LOD. Epic's TAA and full-res post are left out (heat). Desktop unchanged.

## 4.15.2 - Phones at native resolution and 100% render scale (2026-10-20, PR #45)
- Phone (testing launch, G182; Michael 2026-10-20: "Default phones to low settings but with shadows/light, native
  resolution, 60fps cap, 100% resolution scaling"): phones now render at native resolution (device DPR) and a 1.0
  render scale, still on the Low preset with the 60 fps cap. Desktop and the tests (`?gfx=min`) are unchanged.

## 4.15.1 - Phones get basic lamp light and shadows, a 60 fps cap, no side bars (2026-10-20, PR #44)
- Phone (testing launch, G182; Michael 2026-10-20): the Low preset instead of the bare test preset, so lamps light the
  level and characters get contact shadows; DPR 1 and a 0.75 render scale; a 60 fps cap (heat). The menus fill a wide
  phone screen (no 16:9 side bars). Desktop and the tests (`?gfx=min`) are unchanged.

## 4.15.0 - New controls: analogue speed, holstered, low ready and aiming states, LT aim, X holster, RT strikes, the sling draw (2026-10-20, PR #43)
- Controls (slice 1, `docs/anim-rework/BRIEF.md` section 1; Michael 2026-10-20): the left stick's deflection sets the
  speed continuously from a creep to a run (`STICK_SPEED`: most of the travel is creep / sneak / walk, the last fifth
  the jog and the run); no speed gears, no D-pad or mouse-wheel speed. Keyboard: WASD walks, Left Shift held runs, Left
  Alt held creeps (A1); back to wall moved from Left Shift to Caps Lock. D-pad up / down and the wheel only step the held
  context menu now; = / - are unbound.
- Weapon states: holstered, low ready, aiming. LT (RMB) held aims, let go drops to low ready; X tap holsters / draws
  (M1); X held with the gun out reloads (A2; nothing to reload: holsters); A always interacts and never reloads
  (Michael 14:55: "Interact always"; KBM R still reloads); LT from holstered draws
  straight to the aim through a slower sling draw (M2, the existing draw x 1.6 until slice 3's clip); RT fires only
  while aiming (A3). Holstered or holding a guard: RT tap knocks out, RT hold kills (M3); KBM Z still knocks out; LT
  while holding aims the pistol over his shoulder. Traversal and busy moves put the gun away and bring the state back
  after (M4). The pistol jammer: hold the co-op button (pad RB, keyboard F / PgDn) while aiming the drawn pistol at a
  camera or a laser (Michael 14:55: "Another button - what makes sense? RF?", read as RB); aiming alone never jams, and
  no team move starts while aiming the pistol (nor its prompt). KBM Z is the knockout only. A KBM R reload from
  holstered leaves the gun out at low ready; an X press that runs into a held context menu or the wheel is spent (no
  holster); the split / inverted-hang sidearm aim no longer leaves the gun at low ready after the attach.
- Settings: pad layout 3 and key layout 1 move an older save to the new defaults (the speed verbs and keys dropped,
  back to wall off Left Shift); the Aim hold / toggle choice is removed (Michael 15:25: "Remove it"; LT is always held, a stored choice is dropped); a remapped binding that now clashes is named in a toast
  once and marked on the controls screen. The Sprint row is gone. No wire change (PROTOCOL_VERSION 24).

### anim-metrics-2 (into feature/ct-prototype; shipped in 4.15.0)
- Debug overlay (F3, or Settings > Graphics > Show FPS overlay): a live anti-crab readout during play: knee separation
  over the hip width, the planted foot track, knee outside the ankle and elbow outside the shoulder, green inside the
  ranges and red outside, with the gait and state. Allocation-free per frame (`crabFrame` in `src/anim/audit/metrics.ts`).
- Tests: the `CRAB` ranges tightened to human gait data (knees 0.5-1.1 x the hips, planted feet within 7 cm of the line,
  knees at most 3 cm outside the ankles, elbows at most 6 cm out; crouched 1.25 and 8 cm); `e2e-anim` with
  `CRAB_STATES=1` measures the walk's sub-states at speeds 1-3. Findings in `docs/anim-rework/METRICS.md`: the aimed
  strafe is the crab (knees 2-2.8x the hips, feet up to 53 cm off the line), then turns from a standstill, starts and
  direction changes.

### anim-metrics (into feature/ct-prototype; shipped in 4.15.0)
- Tests: anti-crab metrics for the animation rework (BRIEF section 5): knee separation and planted foot track per speed
  and stance, knees over the ankles, planted-foot slide and elbow wing, in the pelvis frame (`src/anim/audit/metrics.ts`,
  ranges `CRAB` and per-gait `CRAB_GATES` in `limits.ts`, unit tests `tests/animCrabMetrics.test.ts`). `e2e-anim` prints
  them for walk, jog, run, crouch and sneak, report-only until a gait's gate is on; today's values in
  `docs/anim-rework/METRICS.md`.

## 4.14.1 - Orchestrator docs: 2026-10-20 roadmap, the animation rework brief (2026-10-20, PR #42)
Docs only. The roadmap and orchestrator state for 2026-10-20 (Michael's answers 08:10-16:15: the guard menu, keyframed
clips, the anim-rework brief docs/anim-rework/BRIEF.md, nv-pass, warehouse-s23, test-speed, context clears) and the dashboard.

## 4.14.0 - Sector Ops: Warehouse section 1 rebuilt (three routes, logical guard posts) (2026-10-20, PR #37)
- Dogs carry no flashlight (Michael, M1): only human guards take a torch slot when searching in the dark (pure
  `carriesTorch` / `torchRule` in `ai/archetypes.ts`, tested); a dog no longer lights the player or the meter.
- Sector Ops Warehouse section 1 rebuilt as a greybox prototype (M1, M6; `docs/warehouse-redesign/SPEC.md` 5,
  `src/world/maps/warehouseS1.ts`): a goods-in bay, a trade office block with a ceiling void and a plant deck, a workshop
  with a crane walkway; ceilings and a solid roof, real door and window sizes, no filler walls. Three routes to the
  security office's camera recorder (ground under the west shutter; drainpipe, roof and ceiling hatch; crane walkway,
  void and mess hatch). 8 guards with jobs, no heavies; the start in the yard's south-west corner. Sections 2 and 3 are
  unchanged (their redesign is specced in SPEC 2.2 / 2.3).
- Sector Ops: a takedown spot also passes the M8 check when its guard is alone for 3 s or more on its timed patrol
  (`sectorCheck.ts`, A2); Sector Ops patrols take per-point waits and facings like Infiltration (A3).

## 4.13.2 - No ghosting at Epic when aiming, drawing or holstering (2026-10-20, PR #36)
- No ghosting at Epic when drawing, aiming or holstering (Michael's playtest). The aim depth of field read the camera's
  direction before the render, so Babylon saw a moving camera as still and Epic's TAA kept blending old frames; it now
  uses the camera's own look angles. The TAA history is also clamped to the current frame's neighbourhood, so fast arms
  and guns leave no trails. `scripts/ghost-strip.mjs` captures before / after frame strips on the GPU
  (`docs/ghost-fix/shots/`).

## 4.13.1 - Co-op fixes: the host draws on the joiner at High and Epic, the connecting label clears (2026-10-20, PR #35)
- Co-op: the host was invisible on the joiner at High and Epic graphics (GPU). The baked-lamp material plugin broke a
  material clone while the partner figure loaded, so the figure never appeared. The plugin is no longer copied by a
  clone (`LampPlugin.doNotSerialize`); the clone gets its own plugin on the next frame.
- Co-op: "Connecting to host" no longer stays on the joiner's objective line after the first snapshot; "Waiting for host"
  shows if snapshots stop for 2 s.
- Co-op: a hidden or covered co-op window keeps stepping its sim, so the host keeps sending snapshots while another
  window is on top.
- Tests: `tests/lampPluginClone.test.ts` (a clone of a lamp-plugin material), new asserts in `e2e-ctcourse` (host avatar
  drawn and objective cleared on the client), and the GPU suite `scripts/e2e-coop-gpu.mjs` (real menu flow at High and
  Epic, `npm run e2e:gpu`).

## 4.13.0 - Marlow Yard interrogation guard (2026-10-20, PR #34)
- PR 3 Interrogate (`docs/ct-prototype/PR3-INTERROGATE.md`, Michael: "Add one in Marlow Yard"): station 1 has a training guard
  (passive, on his post by the south fence facing away from the start) who has information; held, hold-A lists INTERROGATE,
  and he says two short lines of his own (where the two wall medkits are) as subtitle; asked once, no menu again. A guard's
  information is `Enemy.info` (`src/ai/guardInfo.ts`, set from a squad slot's `info`); no wire change.

## 4.12.0 - Marlow Yard light pass and walkthrough guide (2026-10-20, PR #33)
Marlow Yard prototype light pass and the walkthrough guide (S2, S3; `docs/course-ready/LIGHT.md`, `WALKTHROUGH.md`).
- Lamps in all seven airlocks (the pads read lit, nothing spills out with the doors shut), on the station 2 and 7 wall
  tops, over the station 5 roof (raised lamp), in its back room (hack panel) and at its medkit: 19 -> 29 baked lights.
  The pools between the yard lamps and the station 3 camera bay are unchanged.
- `tests/ctcourseLight.test.ts` builds the real light field and checks every must-see spot and the dark pools.
- `scripts/shots-ctcourse.mjs`: headless GPU shots per station (Michael's PC, port 4189, `E2E_GPU=1`), the light meter
  checked against the field at each.

## 4.11.0 - CT movement 2: grab, hold and knockout, the hold-A action menu, walls and doors (2026-10-20, PR #32)
- G5 the hold-A action menu (`docs/ct-prototype/G5-REPORT.md`, Michael: "requires holding A and selecting which option you
  would like to proceed with, including returning to game (no action). I want it to be identical."): with anything in
  reach a list sits top right under INTERACT; holding A turns the header to BACK TO GAME with row 1 highlighted, the
  stick / D-pad (wheel or W / S on keyboard and mouse) moves it, and releasing A runs that row (BACK TO GAME does
  nothing); a quick tap runs row 1; rows with a hold time (hacks, medkits, alarms, revive) fill while A stays on them.
  One menu replaces the separate door and grab menus; doors list OPEN DOOR, OPEN DOOR STEALTH, BASH DOOR, OPTIC CABLE.
  Michael 08:10 / 08:20 / 08:25: behind a guard the list is GRAB CHARACTER (and BACK TO GAME); once grabbed there is
  no let-go and no BACK TO GAME: RT kills, LT knocks out, aiming holds him as a human shield, and hold-A lists only
  INTERROGATE for a guard with information (none have any yet, so no menu); other takedowns are one row (a knockout).
- G6 walls, corners and doors (`docs/ct-prototype/G6-REPORT.md`, against the CT footage): crouched on a wall Wren turns
  side-on toward where she is going and crouch-walks along it bent over her knees with a hand on her knee (Michael: "holds
  knee when up against wall"), turning through facing out when she reverses (0.45 s); standing she sinks into a
  semi-crouch and turns her chest and head toward the slide; wall slides are 0.35 m/s standing (was 0.47) and 0.5 m/s
  crouched (was 0.41) at the spawn gear; the turn onto a wall is quick at first; at a wall edge the peek is a small lean
  with the hips and body stepping out, so the head ends just past the frame (it stopped short); aiming at a wall half a
  metre away brings the rifle up muzzle-high; low cover uses the same side-on crouch. Doors: Open from the door menu is
  a short move (a step to the latch side, a hand on the door, the door opening 0.8 s after the pick), the leaf swings
  fast then eases to 88 deg (was a slow start to 100); Stealth open steps in and holds the handle before the crack
  (1.2 s after the pick, was 0.25 s) and the stick opens it a little slower; guards push doors open in 0.4 s (was 0.7)
  and a door a guard opened swings shut in 0.35 s. Co-op: the partner's copy poses the same from the existing wall
  state (no wire change).
- G7 grab, hold, knockout and carry (`docs/ct-prototype/G7-REPORT.md`, against the CT footage): the grab from behind
  steps in over 0.42 s (rising out of a crouch, legs stepping) and pulls the guard back against the chest over 0.6 s
  before the hold and its menu (~1 s, CT ~1-1.2 s); the guard struggles from the contact, not the press, his rifle out
  of his hands; the hold has the left forearm across his throat and the right hand on his shoulder, his hands up at the
  arm, the pair swaying a little and the guard flailing every 2-4 s; the hostage walk is capped at 0.75 m/s (was 1.4)
  with him held 0.32 m in front (was 0.42) and walking with you; Knock out lowers him in front over 0.85 s with you bent
  over him (was a 0.5 s drop); Interrogate works (your hand at his jaw for 1.5 s, the hold goes on); picking up a body
  is a 2.0 s lift (step in, crouch with the hands under its shoulders, hoist it onto the shoulder on the side its head
  lies, crouch lets go before the hoist) instead of a teleport; carrying is a 0.8 m/s walk (was 2.2) bent forward under
  the weight and can open and close doors; putting it down is a 0.8 s slide off the shoulder to your side (was an
  instant throw 0.7 m ahead). Co-op: the host and the partner pose the hold, its knockout and interrogation from the
  existing MoveState fields (no wire change).

## 4.10.0 - CT prototype: CT controls, posture and movement matched to the footage (2026-10-20, PR #31)
- Footage audit (Michael, 2026-10-19 / 20: "Every movement aspect must be audited and brought into night shift"): all 90
  of his CT clips catalogued (`docs/ct-prototype/FOOTAGE-CATALOGUE.md`) and every move measured against ours
  (`docs/ct-prototype/audit/`: per area, with a coverage map of every catalogue move); slices G1-G4 below follow it, and
  where the footage disagrees with an earlier number the footage wins (Michael).
- G4 traversal (`docs/ct-prototype/G4-REPORT.md`): the drainpipe climbs with one reach per hand about every second and
  both feet together; the hang shimmy slows to 0.5 m/s with the legs swinging under her (and a slight sway hanging
  still); the ledge climb-up puts the knee on top at 0.47 s and ends crouched at 0.85 s, standing only if you hold the
  stick; ladders climb 1.7 rungs a second, two rungs a reach, faster going down, mount from the top in 1.2 s and top out
  in 0.85 s; rappel hooks on in 1.8 s and descends at 0.6 m/s; drops land crouched; crawling out of a wall vent takes
  2.5 s.
- G3 camera (`docs/ct-prototype/G3-REPORT.md`): the field of view is 86 (CT's vertical view; a saved 75 moves once,
  `camV`) and the explore camera sits 0.15 m off the shoulder (Michael: "Match CT"); open spaces frame the whole body
  from 2.8 m (tight spaces 1.8 m) from map flags with a probe fallback; the aim camera puts the head on the left with the
  reticle clear; the camera eases in toward walls more slowly (as CT); it pushes in while passing through a doorway;
  traversal cameras centre the hero; the corner peek eases in over 0.35 s.
- G2 aiming and weapons (`docs/ct-prototype/G2-REPORT.md`, against the CT footage): the rifle is slung diagonally across
  the back (stock at the right shoulder, muzzle down to the left hip) and draws round the right side, muzzle up at the
  shoulder, then down onto the line, with no hold at the chest (about 0.4 s to settled); the holster is near instant
  (0.15 s) and never swings the muzzle over the head; the aimed upper body is one rigid block that tilts at the hips;
  the pistol is held lower and further out, under the sight line, and draws in 0.5 s; recoil shows no visible flip and
  no shot shake; a swap while holstered is the selection only; a reload pressed while holstered draws straight to the
  reload pose.
- G1 legs and gait (`docs/ct-prototype/G1-REPORT.md`, against the CT footage): in turns the legs turn with the body
  (feet under the hips, no splay, no pelvis spike); an upright standing walk with near-straight knees and the heel rising
  onto the toes; the run quickens (~4.7 steps/s), leans from gear 4, pumps its arms, has a flight phase and banks into
  fast turns; the top standing speed is 4.5 m/s; a stop sets down in a small split and straightens up; a crouched stop
  kneels at once on the trailing knee, the forearm on the front thigh, no wide squat on the way in; moving crouched the
  knees stay off the floor; a fall of about a metre lands deep with the arms out; new: the tense sneak near an unaware
  guard (long high-kneed steps, head up, a hand over the knife).
- Slice A (playtest 2, `docs/ct-prototype/A-PLAYTEST2.md`): the five speeds are re-spaced so the old speed 2 is the
  slowest (standing 0.75 / 1.4 / 2.1 / 3.0 / 4.2, crouched 0.85 / 1.3 / 1.7 / 2.15 / 2.6 m/s; D-pad up / down sets
  them and the stick reaches that speed from 0.9 of its travel); ADS look is 70 % less sensitive; the corner peek swings
  to the side you move to; the wall's open side becomes your shoulder and the last shoulder swap is kept for the next
  mission; a shoulder swap while aiming no longer flicks the gun up; back to wall needs you within 0.5 m (was 0.9) and
  settles faster, no slide; your own footsteps follow the noise meter (quiet when silent, 0.07 to 0.42 volume).
- Scanners: a hack whose partner never started resets both with no cost; a late or abandoned hack still costs 10 HP.
- Slices B+C (playtest 2, `docs/ct-prototype/BC-ANIM.md`): the ADS view is the same standing and crouched, for rifle
  and pistol; the chest carries the aim with the stock closer to the shoulder and the elbows tucked; the pistol is held
  closer to the eye line; the stance is narrower (legs stay under the body walking, running and turning, crouched too);
  the crouched gun sits closer to the body; less body bob at walking pace.
- Slices D+E (playtest 2, `docs/ct-prototype/DE-ANIM.md`): draw / holster keep the trigger hand on the gun the whole
  way (the rifle out at the shoulder, not head height; the pistol waits in the holster for the hand); the hanging
  shimmy's reaches are a little wider, longer and higher (D2b below slows it); drainpipe knees bend
  up and forward and the feet stay under the hips; the ledge climb-up (1.1 s) pulls up on held hands, puts a knee on the
  top, then stands.
- Slice D2b (Michael): the hang shimmy slows to 0.7 m/s (was 1.2) with slow, wide reaches one hand at a time, about
  two a second per hand.
- Slice F (playtest 2 walk, `docs/ct-prototype/F-REPORT.md`): holstered, the camera is always over the right shoulder; a
  left-shoulder swap lasts only while aiming and holstering resets it (the saved default shoulder and the wall's shoulder
  side are gone); crouched aiming frames from crouch height; the crouch idle kneels (one knee down, back upright); at a
  wall edge the body leans only to the open side and the camera slides past the edge as you look or push toward it; the
  ledge climb-up (1.3 s) holds the hands until the knee is on the top, then stands up smoothly (no hop); the rifle draw
  comes straight up to the shoulder (no low-ready dip); a settings save from an A3 build had the speed on D-pad left /
  right: it moves to up / down (vision left, gadget right) unless remapped.

## 4.9.0 - Marlow Yard co-op walkthrough fixes (2026-10-20, PR #30)
Marlow Yard walkthrough fixes for the 2-player co-op test (S1; audit `docs/course-ready/AUDIT.md`, 0 blockers,
8 confusing, 14 minor).
- Each station's task shows as the course HUD step line on both screens (bays without drills).
- A radio line names the next step when a station opens (unbolt, camera pocket, laser release, roof plates, hatch
  hack, scanners).
- Station 2: the bolt counts any player past the door leaf as the bolt side; once unbolted the "Unbolt" item turns off
  so the door menu shows on both sides (back on a bay restart).
- Panel and radio text name pad and keyboard buttons; station 3 says how to get the pistol out and to holster before
  the door; station 4 places the red release; station 5 says the way out after the hack; shorter panel 5.
- The station 3 blind spot is pale blue-grey (the airlock pads stay green); leg-up squares sit on the tested spot at
  stations 2, 5 and 7; a lone roof-plate press hints "Partner: press the other plate now"; the host's banner says who
  is down.
- Co-op: a course bay restart also brings an alive partner back to the checkpoint (no partner shut out by relocked
  gates). No wire change.

## 4.8.2 - Sector Ops: a checkpoint restart is a clean start (2026-10-20, PR #29)
- Sector Ops: a checkpoint restart is a clean start of the section (M9). The guards' shared memory goes back to its
  match-start state (`EnemyManager.resetMemory`: alarm, last known position and chase field, sighting flags, flanker,
  squads, AI clocks) and the section's guards load unaware on their routes. The loadout recorded when the section began
  comes back with every gun reloaded (no reload animation) and the gadgets restored (`weapons/loadoutSnapshot.ts`);
  grenades in flight and gadgets in the world (noisemakers, gas, mines, cams) go; doors the player opened are no longer
  noticed by the new guards. The alert / caution music fades out and the section starts in Calm (`Music.calm`). Health
  is full with the respawn.
- Co-op: the client records its own loadout as each section goes live and restores it on the host's restart banner
  (no wire change, A1).
- Sector Ops issues the campaign kit like Infiltration: the rifle comes with its suppressor (A62), as the Kit screen and
  the co-op lobby already showed it (A2). Before this its shots were loud in Sector Ops and put every guard in earshot
  into combat.

## 4.8.1 - Menu boot time measured (2026-10-19, PR #28)
Docs only. The 4.8.0 load gate adds about 0.9 s to boot-to-menu under software GL (median 1.72 s vs 0.78 s on
4.7.5); match boots skip it; no e2e helper change (docs/menu-notes/STATE.md).

## 4.8.0 - Menu notes: black launch screen, goggle flicker, menu weapons and poses (2026-10-19, PR #27)
- Launch (M1, M2, notes 1-2): one black screen with the NIGHT / SHIFT wordmark only, held until Wren's hero model,
  both weapon meshes and the shaders are ready (`src/world/menuGate.ts`: a stall timeout of 12 s with no bytes
  arriving, a hard cap of 120 s, never stranded); then only the press prompt fades in. The title stage is pure black;
  the press fades the wordmark and prompt out, Wren's goggles flicker on in full darkness with no menu on screen, then
  the light rises on the close-up and the main menu fades in (M3; a second press skips to the lit menu, A3; launch only).
- Music: the menu theme decodes at boot and plays on the title, or starts on the first key, click or pad press when
  autoplay is blocked.
- Main menu: Back no longer returns to the title (A1). The Pause menu's Controls item is gone; Settings > Controls is the
  one place (A2). Settings > Gameplay drops the Default shoulder row (CT: the camera is always over the right shoulder
  when holstered); the Controls screen lists the CT trigger and mouse verbs (holstered knockout / lethal palm strike,
  drawn secondary / primary fire; right click draws and holsters).
- Hero quality (note 4): the menu close-ups always draw the hero LOD on desktop presets (no fix needed; the jump was the
  LOD2 -> LOD0 -> hero load order, now behind the load gate); read-back `MenuState.heroLod`.
- Menu weapons (notes 5-6): the Blender rifle and pistol on Wren in every title and main-menu shot, one held at low or
  compressed ready, the other holstered or on the back (`src/world/menuPoses.ts`; new shots W1, W2); the void no
  longer shows a lone magazine or placeholder gun; a unit guard keeps the support hand off the magazine.
- Tactical shot (M4): W3 joins the main-menu deck, Wren on the sights with the rifle shouldered (Michael's pick X5 of
  the slice 4b mock-ups). The green goggle-spill spot in the face shots is gone: it reflected as a stray glow on the
  goggle housing and helmet above the lenses; the lens flicker itself is unchanged.
- Tests: `tests/menuGate.test.ts`, `tests/menuPoses.test.ts`, menuShots; `tests/titleSequence.test.ts`; e2e-menus checks the load
  gate, the dark title, the prompt fade, the sequence and the skip; e2e-pad follows the shorter Pause menu and the pad skip; GPU script `scripts/menu-boot-shots.mjs`.

## 4.7.5 - lightField heap check stable under load (2026-10-19, PR #26)
- tests/lightField "allocation-free under a loop" is stable under load: up to 40 rounds with yields so the optimizing
  compiler can finish (each measurement keeps its smallest round), and the control's vector escapes into a ring so it
  is never optimized away (272 B a query every run, was 63-272). Same limits. It failed `npm run check` on a busy
  laptop (41.97 < 39.54). Tests only.

## 4.7.4 - Orchestrator docs: new Claude account (2026-10-19, PR #25)
Docs only. Every session restarted in the new Claude account; the new dashboard
(https://claude.ai/artifact/XehBYx1Lm27txV29kjSoXh); the roadmap and orchestrator state at 22:55 (CT Core slice F
checks, Menu Notes fixes for CT Core, Sector Ops fix round, lightfield-heap runs).

## 4.7.3 - Orchestrator docs: walk notes, account handover, test runner and priority state (2026-10-19, PR #24)
Docs only. Michael's playtest-2 walk notes (docs/ct-prototype/WALK-2026-10-19.md), the account-switch handover
(docs/orchestrator/STATE.md), the roadmap (Menu Notes, Sector Ops restart bug M9, CT footage awaited), the menu notes
start prompt, and the dashboard with the walk-test checklist.

## 4.7.2 - The version label shows the build's own commit (2026-10-19, PR #23)
- The in-game version label shows the commit the build was made from. Preview slots read master's commit (/ct/ built
  from ct-movement e5fc5870 read "fca0e26"): vite.config.ts took GITHUB_SHA first, which every slot build in the deploy
  workflow inherits. The checked-out folder's HEAD now wins; GITHUB_SHA is the fallback (`src/core/buildSha.ts`, tested).

## 4.7.1 - e2e-traverse grate kick: a closed grate before the kick (2026-10-19, PR #22)
- e2e-traverse: the grate-kick check gets a closed grate. The keyboard vent section before it sometimes kicked the
  grate open on real frames, so the kick check entered an open duct silently (noise 0, about 1 run in 3). Tests only.

## 4.7.0 - Sector Ops: prototype menu, 3-section Sector Ops, co-op mode switch (2026-10-19, PR #21)
- Main menu: Sector Ops, Co-op, Loadout, Settings, Feedback. Missions, Training and Free roam only with `?legacy=1`.
  Sector Ops opens the op list (each op's difficulty stars), then the op's briefing (its sections, Difficulty, Weather,
  Start).
- Sector Ops (`?autostart=warehouseOps&mode=sector`), solo or co-op: the Warehouse in three sections played in order,
  joined by connector rooms that are the checkpoints. Each section has an objective (download, grab, hack), its own
  guards, cameras, laser bands and alarm panel; being spotted raises the alarm stage and sends guards in. No lives:
  solo, going down restarts the section at its checkpoint; co-op revives with the op's syringes. Completing the op
  fills its difficulty star. The result line shows time, kills, times spotted and Ghost. Details per step below.
- Co-op is the campaign: a new room hosts Marlow Yard in Course mode; the host can switch to Sector Ops (two players).
  Hunter, Infiltration and Free Roam only with `?legacy=1`. The Co-op entry no longer calls the Fallow bunker the
  tutorial. Protocol 24 (the `sector` mode and message: the client mirrors the live section's devices and door locks).
- Tests: a new required suite `e2e-sectorops`; e2e-menus, e2e-park and e2e-pad follow the new menu and lobby.
- Sector Ops slice 2 step 1 (logic): sections and connectors (`ConnectorMachine`: locked, open, cycling, sealed; the
  near door waits for a clear doorway), the run with a carried-over alarm stage, checkpoints and `restartSection` (no
  lives, M7; a down respawns at the checkpoint until step 2 restarts the section); revive syringes per difficulty;
  `EnemyManager.despawn` / `despawnAll` and a per-mode live cap `maxAlive` (12 everywhere, Sector Ops 32 from step 2);
  the difficulty stars record (`src/save/sectorRecord.ts`, a kv key, no SAVE_VERSION bump). Unit tests moved to
  `tests/` (the first cut's `src/game/sectors.test.ts` was never run by Vitest).
- Sector Ops slice 2 step 2 (the three sections, M7, M8): the Warehouse in three sections sealed from each other but for
  their connector rooms: 1 the service entrance (yard, dock, dispatch, workshop, corridor; download at the workshop
  terminal), C2 a vestibule in the dock, 2 the racking aisles (take the case), C3 the ground-floor office, 3 the factory
  floor, the mezzanine and the manager's office (hack on the deck), extraction by the freight lift. The connector cycle
  locks the near door, unloads the section (guards, bodies, its cameras and lasers), loads the next behind the far door
  and opens it; the connector is the checkpoint. No lives: everyone down restarts the section there (its guards,
  objective, devices and alarm stage reset; tallies kept). Per M8 the sections were re-laid with pockets (loads parked in
  the cross aisle, chicanes, a stores cage, a plant room, a split floor, deck crates) and new ways through (a rack-top
  route with ladders and planks, a manager's office door onto the floor, crates under the zipline gap): three routes
  per section, every guard in its own pocket with a takedown spot no other guard sees (10, 10 and 11 guards). Alarm
  reinforcements come from the section's own points (2, 2 and 3 per stage). Sector Ops raises the live guard cap to 32.
  `?sectorGuards=N` caps the guards per section (dev, tests). `buildWarehouse(b, opts)`: the plain Warehouse is
  unchanged.
- Sector Ops slice 2 step 3 (stars, syringes, co-op, M7): Sector Ops opens an op list (the Warehouse for now; every map
  with sections appears) with four difficulty stars, filled for each difficulty the op was completed on, and the best
  time per difficulty in the context panel; the main menu entry and the host's lobby Map row show the stars too.
  Completing a run saves its star (solo and co-op host; the co-op client saves its own, without a time). Co-op: a
  downed player is revived by the partner while the op's syringes last (Rookie 3, Normal 2, Realistic 1, Perfectionist
  1), shown as "Syringes n" on the HUD; with none left, or the 30 s window over, the section restarts at the checkpoint
  and both players come back there. The connector and the extraction wait for every player, a downed one too (revive
  them first). The client sees only the live section's cameras and lasers, the host's door locks and shot-out cameras.
  Guards the client holds are let go before a section unloads. A camera shot out comes back on a restart. Protocol 24.
- Sector Ops fix round: only the live section's alarm panel works (panels tagged by section; section 2 has its own),
  and the panel alarm is armed again on every section load and restart (it used to latch once per run and send guards
  to panels behind locked connector doors). The far door opens silently (no door noise for the new guards). A restart
  also clears the section's camera meters and re-arms disabled panels.

## 4.6.8 - Unit test timeouts under load (2026-10-19, PR #20)
- Vitest's test timeout is 120 s (was the 5 s default): under load (an e2e run alongside) the unit run is about 10x
  slower and heavy tests timed out. Per-test timeouts under 120 s are dropped (readyHands, menuShots, score).
- settings.test's round trip waits for its own debounced save, which under load overwrote kv/settings in a later test.
- Tests only; what each test checks is unchanged.

## 4.6.7 - Laptop test runner; co-op training first (2026-10-19, PR #19)
Docs only (Michael). The laptop (Character Build) runs the desktop jobs' logic e2e on pushed commits when the desktop
lock is held (CLAUDE.md "Machines", test tiers). Priority: the co-op training course first, Sector Ops on spare capacity
(ROADMAP.md). Dashboard and orchestrator state updated.

## 4.6.6 - e2e-menus slider fix: hold-repeat waits on the condition (2026-10-19, PR #18)
- e2e-menus: holding right on the Effects slider waits until a fast step lands and sfx passes 0.2 (15 s cap)
  instead of a fixed 3.2 s; under load fewer frames ran in that time and the check failed. The results-screen wait
  is a 60 s hang guard (was 15 s; it ran out under load). Tests only.

## 4.6.5 - Co-op test fix: reliable co-op suites (2026-10-19, PR #17)
The process audit's section 2 (Michael approved; `docs/coop-tests/`). Tests only, no game change.
- The two-page suites (e2e-coop, e2e-netmove, e2e-ctcourse, e2e-course) wait on the game's own clock: on software GL
  the sim runs at a fraction of real time, so wall-clock timeouts expired mid-move (e2e-ctcourse's leg-up, e2e-coop's
  holster). A timeout now names each page's sim seconds, sim rate and fps; netmove and ctcourse open at 960 x 480.
- Stale checks fixed: e2e-netmove's walk-off stands up first (B keeps the crouch), the stacked check waits for the
  host's copy; e2e-coop's wall medkit heals to full on Normal (G180); the crouch helpers wait to stand before pressing.
- e2e-coop runs legacy-off: Infiltration (the Ledger) and Free Roam instead of Hunter, two players (G2).
- e2e-coop, e2e-netmove and e2e-weapons-carry leave KNOWN_FLAKY (3 solo rounds and 2 full runs on the laptop, 23 min
  each); e2e-pad stays (one remap failure in full run 2, parked).

## 4.6.4 - Docs: the laptop is a second heavy slot; roadmap is state only (2026-10-19)
- CLAUDE.md "Machines": two heavy slots, the laptop at low priority, everything headless and invisible (Michael).
- docs/ROADMAP.md keeps state only; its rules moved to CLAUDE.md "Sessions". Sector Ops and the co-op test fix on the roadmap.

## 4.6.3 - Process audit: test tiers, shorter e2e, one rules file (2026-10-19, PR #15)
Michael approved the audit's report as written (2026-10-19; `docs/process-audit/REPORT.md`).
- The full e2e run is the training level and the systems it stands on (estimated 62 -> about 28 minutes at two
  suites at a time): the parked-content suites (Hunter / Mission, Fallow, Kestrel, the Warehouse routes and AI
  archetypes) move to `npm run e2e:legacy`, the audio suites to `npm run e2e:audio`, the visual read-backs (darkness,
  the Epic boot) to `npm run e2e:gpu` on Michael's PC, and the animation audit runs only from the quick map.
- e2e-pad and e2e-mouse keep input (menus, capture, the verb tables, remap) and drop the gameplay sections their system
  suites own; e2e-pad gains a pad verb table. e2e-course walks the gates once. `e2e:quick` no longer pulls the input
  suites for every core or config change.
- One set of rules in CLAUDE.md "Sessions" (orchestrator, machines, a job, test tiers, branches and previews), a
  3-file job format (BRIEF, PLAN, STATE), a shared subagent preamble; deploy.md and session-method.md agree with it;
  finished and parked job docs carry a history banner. The goggle job's records (M1-M3) and D36 (Moth's goggle is
  purple) reach master.

## 4.6.2 - Version numbers you can read (2026-10-19)
- Every merge to master gets the next version (G183): a job or feature is a minor step, a fix or docs-only merge a
  patch. The in-game label (title screen, main menu, playtest notes) adds the build's commit: `v4.6.2 · a1b2c3d`, with
  `PREVIEW CT` on /ct/. Versions 4.1.0-4.6.1 below were numbered after the fact, in merge order; each master release
  has a git tag (`v4.6.2`).

## 4.6.1 - Orchestrator docs (2026-10-19, PR #11)
- Roadmap, machine rule (heavy work on the desktop, heavy.lock), the orchestrator's resume point and dashboard source,
  Michael's dashboard answers (G-level decisions in ROADMAP "Decided"), Moth's goggle purple (bible 5.14).

## 4.6.0 - Phone launch for testing (2026-10-19, PR #13)
- A phone can launch the game for testing only (G182): the minimum settings (`?gfx=min`, no Auto detection, no
  governor) and the menus and HUD scaled down to fit its screen. No touch controls; a Bluetooth pad drives it. Untested.

## 4.5.0 - Animation clean-up (2026-10-19, PR #12)

Prototype pass over Wren's animations (Michael, 2026-10-19): accurate, believable, no clipping. `docs/anim-cleanup/`.

- **Draw and holster:** the current gun is put away before the next comes out. The rifle travels over the right shoulder
  onto the back plate stud, the pistol into the thigh holster, along a curved path clear of the head and trunk
  (`WeaponModel.beginTravel` / `travel`, `TRAVEL_VIA`, `TRAVEL_OUT`; beats `TRAVEL_OUT` / `TRAVEL_IN` in
  `playerWeapons.ts`). The draw pop is gone (e2e-anim asserts the draw).
- **Reloads with real magazines:** a separate magazine mesh leaves the gun with the support hand, goes to its pouch
  (rifle: chest; pistol: left hip), a fresh one is seated; an empty reload works the charging handle or racks the slide
  (`reloadClipFor`, pistol clips; a swap or a grenade mid-reload cancels it cleanly).
- **Shoulder swap moves the gun:** on the left shoulder the gun goes to the left hand once it is settled
  (`weapons.handSwitchOk`); the partner sees it (ground MoveState sub bit 128, `SHOULDER_LEFT_SUB`; it was protocol 18,
  counted in today's 22).
- **Hands on the real geometry:** ladder rungs, drainpipes, pipes, ledge lips, the zipline cable, the rappel rope and fence
  rails: the palm sits on the surface and the fingers wrap it (`attachGrips` grip axes, `CharacterRig.solveWorldGrip`);
  rungs and fence wires take a fixed overhand grip.
- **Hand shapes:** trigger, support, wrap and relaxed shapes blend from Wren's morph targets; free hands hang lightly curled.
- Crouched ready hands sit by the thighs (`READY_HANDS` crouch values, with CT Core's P1c).

## 4.4.1 - Docs: roadmap, merge approvals, walk-test menu notes (2026-10-19, PR #10)

## 4.4.0 - CT prototype (2026-10-19, PR #9)
- Posture, CT controls, the selection wheel, the 8-station co-op training course, revive. `docs/ct-prototype/`.

## 4.3.0 - Menus (2026-10-19, PR #8)
- Arkham-plan menus, dialog fixes, the cinematic hero background. `docs/menu-ui/`.

## 4.2.1 - CLAUDE.md "Current goal" (2026-10-19, PR #6)

## 4.2.0 - Weapons (2026-10-19, PR #7)
Placeholder weapons that look real at a glance, held and carried believably (Michael, 2026-10-19: "Holding weapons and
holstering should at least look believable but only prototype quick run").

- The CT kit as baked meshes from an offline Blender pipeline (`npm run weapons:build`, scripts/weapons/): the Heron
  Carbine with the co-op launcher always fitted and a suppressor (11.7 k triangles, 2K textures), the Hush 9 SD with its
  jammer emitter in the frame's nose (9.7 k, 1K), the knife (1.8 k, 512; shown in the right fist when drawn, no knife
  verb yet). Original designs, real proportions, KTX2 textures. Download +10.4 MB.
- Wren holds them: her fingers close round the grips (morph targets from her hero hand rig), the palm sits on the grip
  and the knuckles wrap it, the support hand under the launcher (the rifle) or cupping the trigger hand (the pistol).
  Her wrists now land on the rig's (her forearms were 35 degrees bent, the hands 16 cm off every grip).
- Stance: the support shoulder comes forward to reach the handguard with the elbow bent; the pistol is aimed out at
  near arm's length with both hands (CT).
- Carry: the pistol sits in her built thigh holster (it cut 20 mm into the shell); the rifle hangs flat from the receiver
  bar on her back plate by a keyhole stud, muzzle up, the grip to her right hand (it stood off her back on its optic).
- Guards keep their guns (A6). Gameplay unchanged: muzzle, hand points and carry extents still come from weapons.json
  (the rifle's support point moved back to the launcher sleeve's rear, its proxy parts follow the mesh).

## 4.1.0 - Wren, the player character (2026-10-18, PR #5)
Operators run (feature/operators): Wren replaces the player body for every player (G123: "I want wren in to replace the
existing character anyway; before the prototype is done", "Both play as Wren").

- Solo, the local co-op player and the co-op partner are Wren, the realistic operator built offline in Blender (G68):
  a one-piece stealth suit, slim armour, rigid kit, the original goggle. The main menu shows her hero model (D33: "Yes
  use hero for menu"). Guards keep their bodies.
- Gameplay unchanged (G38): the same capsule, speeds, noise, traversal and camera. The body drawn, the light-meter
  samples, the cover exposure points and the hit volumes follow Wren's size (1.68 m, G74; the meter samples 7 cm lower
  standing, 4.6 cm crouched, for the partner too); weapons sit in her hands.
- Body proportions corrected for every character (G72, ANSUR II): shoulder joint 3.5 cm lower, wider shoulders, longer
  hands, deeper chest, fuller waist and pelvis, head 1 cm deeper, thigh 2.5 cm shorter.
- The goggle glows dim with vision off and full with it on (G73); it sits over the eyes in both states until the stowed
  model is exported (cleanup).
- Each player's goggle is their own colour, the partner beacon (G135: "partner beacon (distinct light colour per
  player)"): the host (and solo) green, the partner cyan, the same on both screens. Emissive only; guards never see it.
- Download: 81.4 MB more, fetched on first use and then cached for offline play (LOD2 2.5 MB first, LOD0 18.4 MB,
  LOD1 5.1 MB; the menu's hero 55.5 MB loads after them). Once the service worker controls the page the play LODs go
  into its cache, so one online start that reaches the menu is enough to play Wren offline; the hero is cached the
  first time the menu or photo mode shows it. A body load cut off by a reload is not reported as an error.
- Ladders and drainpipes: a hand's reach is never quicker than the arm can swing (from the body's proportions); a
  sprint up a ladder keeps the hands on the rungs with Wren's shorter arms.
- Ledges, wall jumps, ladders and pipes play the same for every player (G176: "Keep gameplay fixed"): the attached
  root path uses the 1.75 m gameplay height; Wren's body is drawn lifted onto her grips (7.6 cm on a hang), visual
  only.
- Elbows never pass through the chest: after the arm IK an elbow inside the trunk swivels round the shoulder-wrist
  axis until it is out (the hand stays on the grip).
- Hot paths: the attach path reuses its move override, the pipe grip blend lost its per-frame closure, the soft-knee
  share no longer changes field representation mid-match (a deopt of the rig update).
- Tools: every child process the e2e runner and its helpers start (vite preview, suites, taskkill, Blender, KTX
  tools) is spawned with `windowsHide: true`, so no terminal windows open on Windows. e2e-coop asserts the goggle
  colours on both screens. `waitOperator` in `scripts/e2e-lib.mjs`; `anim-sheet.mjs` and `perf.mjs` wait for Wren's LOD0 and exit 1
  when she never loads; e2e-coop's offline check waits for the service worker first; e2e-offline asserts the offline
  player is Wren; e2e-desktop drives Wren's head fade and goggle glow directly. `@babylonjs/ktx2decoder` is a runtime
  dependency (the game transcodes her KTX2 textures).

## 4.0.0 - Consolidation (2026-10-18, PR #3)
One branch with all finished and paused work, one vision (docs/DECISIONS.md, G1-G118). The entries below this one are
the merged branches' own notes, kept as their history.

Came in:
- Locomotion run (feature/ct-locomotion, paused at step 22, with feature/kestrel inside it): Chaos Theory movement,
  back-to-wall, traversal, holstered carry, goggles, the anim audit, Kestrel's level editor and Mission 1 work (paused,
  G53).
- Movement foley (feature/footsteps), weapon sounds (feature/weapon-audio), Music V4 (feature/music, as is; revised in
  its own job).
- Fallow training bunker (feature/training-bunker; the co-op tutorial, G78; rebuilt on CT moves after the prototype,
  G79).
- Menu and HUD plan (feature/menu-ui-spec, docs only).
- Not included: feature/operators (its own PR, G75); ct-movement's 99da75b "phone loads and plays on Low" (superseded
  by desktop only).

Deleted (Michael, "In this merge"; logs in docs/consolidation/deleted-*.md):
- Wave, Team Deathmatch, Free-for-all and all player-versus-player code (G8, G9).
- Retired maps: the 1934 Exchange, Trunk Annex, Dead Line v1 and v2, with their missions and suites; design data
  archived (G12, G91).
- Phones and touch: touch input, the layout editor, the phone look and phone render paths, phone budgets; the e2e
  suites now run in a desktop browser (G12, G13).
- Emotes and the old solo Training mode (G24, G116); the Fallow course is the only training.
- Every gun outside the CT kit: 14 player guns removed; kept the rifle and the suppressed pistol (G76, G115).
- The player drone, the custom difficulty sliders (fixed difficulties again) and carried medkits (wall stations only)
  (G7, G98, G106, G115).

Changed:
- Co-op lobby defaults to Infiltration (Hunter under `?legacy=1`). PROTOCOL_VERSION 11 -> 13, MAX_PLAYERS 8 -> 4.
- SAVE_VERSION 8 -> 9: old saves migrate (emotes, deleted guns and drone presets dropped or mapped to the kept gun);
  old settings records load and drop touch, phone, custom difficulty and medkit-bind fields.
- The one wall medkit station (Proving Grounds) heals +40 directly (starting value, ASSUMED).
- Docs rewritten to one current vision: docs/DECISIONS.md (new), CLAUDE.md, the design bible 2.0, story 2.1,
  docs/progress.md as an ordered job list, every docs/systems file, level-design Section 12, TESTING.md (one desktop
  checklist plus a release checklist). Old lists and phase logs are in docs/archive.
- Tests: e2e-foley is known flaky (walk threshold since the step-22 speeds); e2e-pad's capture step waits for the
  capture to end; legacy e2e-progression steps to Deploy.

## Unreleased - Weapon sounds (feature/weapon-audio)
- Sound: every gun now plays real CC0 recordings instead of a filtered noise burst. The 16 guns borrow the closest of
  12 recorded guns (The Free Firearm Sound Library, `docs/audio-credits.md`): .45 pistol, 9 mm and 7.62 SMGs, 5.56
  and 7.62 rifles, a .30-06 bolt rifle, 12-gauge pumps. Each has near takes (the player and close guards) and
  mid-distance takes (far guards), crossfaded and darkened with distance.
- Suppressed guns finally sound suppressed (before, the suppressed pistol and a fitted suppressor played the full report). The
  suppressed shots are made from each gun's own recording: the blast and tail cut away, a dull thump, a puff of gas,
  the slide or bolt clack, a little room.
- Automatic fire chokes each shot into the next, so only the last round rings out. Brass (and shotgun shells) land on
  the floor you stand on (concrete, deck plate, wood; muffled on carpet). The pump and the sniper bolt cycle after
  each shot. Reloads are laid out over the real reload time (magazine out and in, the slide or charging handle on an
  empty reload, shell by shell for the tube shotguns) and stop on a swap. A dry click on an empty gun. The crossbow
  has its own string and limb thunk.
- Gameplay is unchanged: guards hear the noise model (the weapon's `noise` stat), never the audio.
- `?weaponlab=1`: a listening screen with every gun, the campaign arsenal's six first (single, burst, auto), suppressed, player or guard at 6 / 18 / 40 m,
  reloads, dry fire, brass per floor, a footstep for level, and an A/B against the old sounds.
- Tools: `npm run sfx:fetch-weapons`, `npm run sfx:render-weapons`; tests `tests/weapons-audio.test.ts` and
  `scripts/e2e-weapon-audio.mjs` (required).
- Rule: CC0 audio is now allowed for every sound (Michael, 2026-10-16; `CLAUDE.md`, bible S7).

## Music V4 (feature/music, not yet released)
- The game has a score. The main menu plays the menu theme ("Grand, dialled back": Hook A on strings, the melody
  on cellos, then violins). In a match the music follows the guards:
  - **Calm (nobody aware): silence.**
  - **Cautious** (a guard suspicious, investigating or searching): the plucked broken hook, a heartbeat and a faint
    tremolo.
  - **Alert:** a spotted hit, then "Alert, under fire" on its downbeat.
  - **Coming down:** Evasion, then a slow step down through Cautious to silence.
- The music director has hysteresis, so a glance does not flip the music. The music never reads guard count,
  distance or direction, and gameplay never reads the music.
- The music is real orchestral recordings (CC0, VSCO 2 CE), mixed offline into nine MP3 files (5.9 MB, precached for
  offline play). Rebuild with `npm run music:orch` (the samples come from `scripts/music/fetch-samples.mjs`).
- Test page for the score (`/music-test.html` on the dev server). New e2e suite: `e2e-score`.
- Test page: "Hook thread" (round 23) with four Calm and three Cautious alternatives, and Calm / Cautious choosers in
  the in-game test (the game's tracks are unchanged until Michael picks). A position slider scrolls through a piece
  playing alone (with jumps of 8 bars and to the last 4 bars before the loop).
- The music volume defaults to 15 % (an untouched old default, 50 % or 30 %, moves to 15 % once). A short build (a roll
  and climbing strings) leads into Alert.
- The menu theme is twice as long ("Menu theme, extended", 64 bars, 2 min 50 s): the theme as before, then low drums (no
  sticks, cymbals or rolls), a string pulse that turns to sixteenths, and an epic brass layer (the hook on tuba and
  trombones, big brass chords) build to a peak, and it comes back down to the low D it opens with, so the loop joins
  smoothly.
- Fades no longer cut: every music fade starts from the level playing at that moment. Before, a fade after an earlier
  fade began part-way down (entering a match the menu theme dropped to about a quarter at once). Into a match the menu
  fades over 4 s; leaving one the mission music fades over 2.5 s.

## Locomotion run (Phase 3 + 3b, in progress, branch feature/ct-locomotion)
- PC1 (desktop GPU catch-up): Epic desktop no longer fails the voxel shader compile when guards alert (one flashlight shadow at a time with micro detail on, A54; e2e-desktop re-counts samplers after alerting); remote wall peek eases in like the local one (no foot re-plant); empty goggles slot no longer leaves a gap in the HUD tactical row. Harness: anim-audit per-scenario reset and usable `--shots` (side camera, no HUD, no TAAU ghosting, one per scenario + metric); anim-sheet drawn reload / swap, movement turn, aimed wall-edge sheets; e2e-wall mid-switch reversal case (report-only until step 27); anim-audit runs on Windows.
- 22: weight (Michael's play check, M14 / M17): every speed about 17% lower (standing 0.65 / 1.1 / 1.65 / 2.3 / 3.15 / 4.15 m/s), 0.3 s to full pace, 0.25 s to stop with one closing step and a single settle, turn inertia at speed, a planted pivot on a reversal above 1.2 m/s; aim, draw, strike, crouch and jump stay instant. Gait posed by gear with stride from the real pace, arm swing with effort, acceleration lean, heel-to-toe roll at walking pace, remotes derive acceleration from their velocity. Noise: part stick stays a silent walk. A88, A89.
- 21v: visible sensor grain and slight softening on thermal, electro and night vision (Michael's play check, M14; render only, A87).
- 21w: back-to-wall polish (Michael's play check, M14 / M16): the body stops at a wall end and keeps hugging it (pushing on peeks; only a held pull-away or the context button leaves), crouch on any wall, a slow shuffle (0.9 m/s standing, 0.6 crouched, analog), entry by the context button only (A83), deliberate peeks (no flicker), the peek camera eases over 0.45 s and the shoulder swaps smoothly (never inside a wall), lean-out aim limited to about 85 deg past the edge (aim further round leaves the wall), feet under the hips with the back flat on the wall, crouched knees apart, weapon glides instead of popping when re-held on a wall. A83-A86.
- 21: no bob (D2) and trained posture: heel-strike kick and camera footstep / dash bob removed (camera vertical osc ~0.1 mm), walk sway capped (2.8-2.9 cm), pelvis one low / one high per step on every gear (run / sprint pelvis travel 12-14 cm -> ~1.9 cm), constant gait head pitch, breathing only after 2 s still and fading out on the first step, weapon sway settles in 0.2 s; holstered arms relaxed at the sides with counter-swing and a sprint pump (M14), right arm clear of the thigh holster (A81); crouched arms no longer straight; remote start ankle snaps and stair step-down pelvis fixed. A76-A82.
- 20b: network conditions simulator for local co-op tests (`?net=local&netsim=typical`, E2E_NETSIM: 80 ms RTT, 20 ms jitter, 1% retransmit, A75); e2e-netmove and e2e-coop report under typical: no committed move stuck, no desync, pose within limits (D11). Step 20 (bot partner) dropped (M12).
- 19: custom difficulty (D7): sliders for guard perception speed, guard aim and alarm tolerance (A72) on top of the presets (Rookie / Normal / Veteran as bases, A74), values in steps of 0.05 (A73); saved in settings; in co-op the host's difficulty applies (PROTOCOL_VERSION 10, `dc` on lobby / start, read-only on clients); medkit carry and rewards follow the base preset. Fixed: hidden settings rows were still shown (`.row[hidden]`).
- 18: full remapping (D7): Controller and Keyboard & mouse tabs, two slots per verb, conflict warnings (a shared input is allowed and warned, A71), capture on release with hold-B / Esc / 5 s cancel (A69), reset per device; hold or toggle for aim, crouch, sprint, back-to-wall and grab (hold-mode grab knocks out on release, A70); in-game pad prompts follow the bindings; saved in settings (IndexedDB), local only.
- 17: pad first (D1, D5.12): analog stick speed with gear snapping and hysteresis (50 / 80 / 100% -> gears 2 / 4 / 5, sprint -> 6, A63), the rocker / wheel set the maximum gear (1-5, A64), HUD gear pips lit to the current gear and dimmed to the maximum; rumble table (landings, footfalls, takedown, elbow, shots, explosions, hurt) with a Rumble strength setting, local only; touch trimmed to the D1 basic scheme (touch layout v7 reset; takedown on the context button, A65; the stick spans gears 1-5, A66; training skips the gadget step on touch, A67); Nintendo glyphs; full binding table in docs/systems/input-and-loop.md checked by a unit test.
- 16: the arsenal (bible 5.6, A28, A59-A62): campaign set rifle / SMG / pump / marksman plus Hush 9 SD / Warden .45 sidearms (defaults rifle + Hush 9 SD), mapped at use from the save (no save change); the issued rifle carries a suppressor (A62); every real-brand gun renamed (Heron Carbine, Marten 9 SMG, Mason 12 Pump, Spotter 7.62 Marksman, Hush 9 SD, Warden .45, Kite 5.7, Ferret .45 SMG, Swift 5.7 PDW, Steppe 5.45 Rifle, Ibex Bullpup, Talon 12 Semi, Ridgeline Bolt, Anvil 5.56 LMG); the rest stay in code for legacy. Loadout screen shows Primary / Sidearm in the campaign; the co-op lobby sends the issued loadout (fixed a host weapon / shot desync for old saves).
- 15: medkits (bible 5.13): health 100, no regen; a medkit heals 40 over 1.5 s (pad X held 0.4 s while not aiming, KBM H), damage interrupts (kit spent, A56), aim / jump / sprint cancel; carry 2 (3 at Rookie, host difficulty in co-op); health pickups give a kit; Proving wall medkit station (hold 0.6 s, single use); HUD health bar on by default with kit count and heal fill. Host-authoritative hp and kit counts (`mk`), committed move `medkit` with shared start, MoveState `medkit` (28), PROTOCOL_VERSION 9. Fixed in the step: host cancelled a client heal on a late snapshot; no interactables in sandbox. anim-audit medkit rows.
- 14: thermal and electro vision (bible 5.5, A26, A53): the goggles cycle off / night / thermal / electro, each switch one goggle flip, HUD label for 1.5 s. Both are a `vk` branch in the existing post pass (desktop and phone grade pass, no new render target) fed by a render-only `pattern.w` glow: thermal lights every live rig and dog body, a dead body or dog cools over 60 s; electro lights cameras, laser sights, the sticky-cam lens and powered interactables (switch, alarm, terminal, charge). Render-only and local-only: never sent, never read by perception, the light meter or alarms (unit isolation test, e2e-stealth-ai `vision-detect` / `vision-dog`); e2e-pad / e2e-mouse / e2e-touch cycle the modes.
- 13: door peek (bible 5.3 Doors, A25, A52): the context action (pad A, Space, the touch context button) at a closed, unlocked door within 1.0 m and 60 deg settles at the frame (hand on the handle) and cracks the leaf 0.12 over 0.6 s, quietly; the view goes to the crack (FOV x0.85, look +-35 deg, never inside geometry, local only); the context action again or the stick back closes it, the stick in or interact opens it quietly; damage, aim, jump or sprint end the peek. The crack is drawn only: collision, light (bake unchanged) and guard sight treat the door as closed. MoveState `doorPeek` (27), host-authoritative crack (`door {i, crack}`, snapshot `dcr`), PROTOCOL_VERSION 8. Proving's shed north doorway gets a hinged door. e2e-pad / e2e-mouse / e2e-touch / e2e-netmove / e2e-coop cases and an anim-audit `doorpeek` row (local + remote).
- 12b: D9 open-side weapon at back-to-wall edges (left edge: pistol in the left hand with a mirrored grip, rifle on the left shoulder, camera follows; 0.25 s switch, reversible without a pop; exposure from the real mirrored pose) and D10 aim around low cover (crouched side lean past a low wall's end with the head kept under the top, over the top otherwise; crouched peek round the end). The host samples a remote's head from its posed copy on walls (light parity). No protocol change.
- 12: back-to-wall edges (bible 5.3): corner peek (head only, light and perception from the real head pose, local and remote), lean-out aim and fire past the edge, over-the-top aim on low walls, step round, SWAT turn across doorways (MoveState swat, host-checked, remote replay), corner takedown from the wall; `lk` field and PROTOCOL_VERSION 7; level builder highCover / lowCover renamed highWall / lowWall.
- 11: back-to-wall (bible 5.3, A23, A45): the context action (pad A, Space, touch context button) puts the back to a cover face within 0.9 m and 100 deg (a 0.2-0.45 s settle: 0.2 s + 0.3 s per metre of approach, A46), or the stick held into a high face for 0.35 s at gear <= 4 (a stick held through a traversal or a fall must be released first, A48); slides at the gear's pace capped at gear 4 (2.8 / 1.8 m/s) with crouch-band footsteps; low walls always crouched; inside corners wrap, outside ends stop (edge flags); leaves on the context press again (`gameplay.wallToggle`, default on), pulling away 0.15 s, jump, sprint, takedown or traversal; MoveState `wall` (segment, metres along it, WALL_SUB) posed on remotes; guards flank and grenade-flush a wall-held player (host and clients); two players stack >= 0.62 m apart; camera preset `wall`; PROTOCOL_VERSION 6; new e2e suite `e2e-wall`; anim-audit `wall` scenario (its remaining pose fails are baseline rows carried to step 27, A47)
- 10: elbow strike (bible 5.4): fire while holstered (pad RT, LMB, touch fire) strikes; behind an unaware guard it knocks out, from the front it staggers, a second strike inside the stagger knocks out; 0.9 s committed, contact at 0.5 s. Co-op: generic host-approved committed-move protocol `cmove` / `cstart {t0}` / `cdeny` (A5, A21), MoveState `strike` (index 25), PROTOCOL_VERSION 5; the shared elbow arc also drives the lethal takedown blow.
- 09: holstered unless aiming (bible 5.6): matches start holstered, aim draws (0.3 s pistol / 0.4 s primary) and release holsters (0.4 s); no hip fire (fire while holstered does nothing); ADS spread table (x0.7 crouched and still, movement up to 2.8 m/s); reload is never cancelled by releasing aim (A43); RB swaps while aiming; ready hands while holstered (A42). Co-op: MoveState `dw`, PROTOCOL_VERSION 4, host-authoritative drawn state, weapon in hand and shot weapon (A20, A41), no latency-triggered holster.
- 08: the audit harness also measures remote poses over `?net=local` (host copy vs owner, lag-compensated: gating pose error, gait phase offset, phase-aligned lower body, rubber-band pops, paired-move alignment, LOD skips); `--compare` against `docs/locomotion/audit/anim-baseline.json` (local deterministic; remote gated per A39 / A40); joined to `npm run e2e` as a report-only suite; e2e helpers moved to `scripts/e2e-net-lib.mjs`.
- 07: animation audit harness (`node scripts/anim-audit.mjs`, `--quick`, `--only=`, `--shots`): drives the local player headless at 60 and 120 Hz over every gear, both stances, flat / stairs / ramp / 35 deg slope, stance, raise, swap, ladder, vault, mantle, drops and quick 180; measures the bible 5.12.2 limits, D2 and the measurable D5 items in a Babylon-free `src/anim/audit` module with unit tests; writes local.json and a fail list with frames. Report only for now.
- 06: cover rig poses and clips removed (low-cover curl / lift, blind fire, cover turns, cover foot pins); MoveState slot 1 renamed `wall`, PROTOCOL_VERSION 3 (A2); flat-back stance kept as WALL_STANCE / wallHand / offWall (A6); the open-left weapon mirroring kept dormant for D9; e2e-cover and docs/systems/cover.md deleted; guards in high cover lean to the correct side.
- 05: player snap cover removed (cover controller, glide, cover-to-cover, blind fire, cover aim limits, the doorway / corner lean (A1), coverDash setting); `cover` input kept as the context action; enemy cover AI (coverData, corners, tactics) unchanged. Fix: a reset mid-vault no longer leaves the vault override stuck.
- 02: sonar removed (pulse, marks, ring, HUD, audio, difficulty flag, suit / HQ hooks); the vision button is night vision only.
- 01: Mark & Execute removed (marks, execute, chevrons, charge pips, `ex` shot field, RB / T / Y bindings, touch buttons; touch layout v6).
- 03: regenerating shield removed: `Health(maxHp)`, no regen; effective player toughness 150 -> 100 (-33%). HUD shield bar and `PlayerState.sh` off the wire (no PROTOCOL_VERSION bump yet, step 06). Pistol guard at Normal: 26 per hit, 4 hits to down 100 hp.
- 04: style tracker and style cash removed (`StealthRating` counters stub), results style bars gone, HQ sonar / marks and challenge executes removed; SAVE_VERSION 8 with a v7 -> v8 migration (mission style keys, hq.sonar / marks, executes dropped). HQ credits spent on sonar / marks are not refunded (parked economy). Default presets renamed Silent / Flash / Loud.
## 3.9.0 - Fallow training bunker (Block C, branch `feature/training-bunker`, in progress)
- T5g: the Deep level rebuilt to BAYS v2 at its own offsets (the T5f shift is gone): B7 The House (a 30 x 30 cavern round
  the two-storey kill house, its office behind glass, annex roof, water main, bench, sandbags, the store door into A7),
  B8 The Range (60 x 16: glass firing-line screen, six lanes, shoot-house, glazed tower, catwalk and its caged stair,
  sniper scaffold), A8 with its medkit, B9 The Plot (a three-floor well with glass balcony fronts, cabins, bridge, rope,
  zipline and tube duct to the lift lobby) and the exit lift. Objectives listed by name; relief doors placed.
- T5f: B5 Standby Plant, A5, B6 Mock Site, S6 and A6 rebuilt to BAYS v2; B4 / A4 at their v2 offsets (66, 14) / (70, 8)
  (the T5e passage is gone) and A4's wall medkit. B5: one 30 x 24 guarded hall: EL (screened but for its stair), gensets
  (wall-jump roofs), trench, cable gallery, glazed switch room (MB, the mains gate on A5), fuel bay. B6: one line RC ->
  AH -> plant ladder -> supply duct -> vent drop -> records -> corridor (2.0 clear), then the operator / runner split
  (lockers, CR stair, mezzanine / L-leg, mantrap, server room) -> keypad -> S6 (rising north) -> A6. Relief doors (A62)
  placed as visual leaves with course data. v1 Deep moved by (+17.5, -29) until T5g (A74). New R1 / R2 nav tests.
- T5e: B3 The Intake and B4 The Cistern rebuilt to BAYS v2. B3 sits against A2 (no more passage): one line up the shaft
  (riser slot, two wall jumps, the damper bar) and down again (two rope stages, the control-room window, the zipline,
  the fan guard, twin ducts). B4: three cells, W1 boost and bolt door, W2 human ladder and sluice, outlet platform; it
  stands at an interim offset with a passage from A3 until the Plant rebuild.
- T5b walk-1 fixes: airlocks are automatic (R6, D46): a marked 4 x 4 m floor pad set 1 m in from the walls; one player
  on it shows "Waiting for partner" on both screens, both on it with the bay's objectives done seal it (the rear door
  shuts and locks for good, a 4 s cycle, the front door opens). The Cycle button is gone. The cycle holds while anyone
  stands in the rear doorway. The client now gets every course prompt (course items are sent first; `MAX_ITEMS` 128,
  `MAX_DOORS` 256) and shuts any rear door the host locks. The objective list is always on screen for both players
  (R5, D45) with the airlock status under it. New two-page suite `e2e-bunker` (B1, B2).
- T5b2 partners block each other (D49) in every co-op mode, on both screens (a partner capsule in its own collision
  group; off while the partner is down or in a boost or human ladder). Remote players snap on a teleport instead of
  sliding through the space between (a jump over 2 m faster than 25 m/s, or across a stall that a 90-degree turn at
  the earlier speed cannot explain), so a teleported partner no longer shoves anyone.
- T5d Upper rebuilt to the v2 bay plans: B1 Muster is five small rooms in a chain (lift lobby, kit room, briefing room
  with a glass wall onto the gear run, the 20 m gear run, the dark store), B2 The Lanes is one 52 m lane both players
  run in order (plinth, rail, block wall, caged ladder, pipe over a pit, hang-drop, trench, downpipe and beam ledge
  round a column, gap jump to the portal sill, three drop pads, the window wall). Glass is see-through and not
  climbable; every bay's objectives are listed by name.

## 3.8.0 - Fallow training bunker (Block B, branch `feature/training-bunker`, in progress)
- T2 Upper level (y 16): B1 Muster (lift lobby, kit room, briefing room, dark store, the gear-run corridor), airlocks
  A1 and A2 (locked blast doors the course opens, bench, vision slot), B2 The Lanes (two mirrored obstacle lanes with
  every ground and climbing verb, glass walkway, lever-gated lane doors, drop pads and pit). Map `bunker` ("Fallow",
  `?autostart=bunker&mode=course`, not listed) with a course stub (B1, B2). `scripts/plan-svg.mjs` draws a map's
  storey plans headless. Tests: `tests/bunkerMap.test.ts`.
- T3 shaft and reservoir (Plant level, y 6): B3 The Intake (24 m shaft with galleries G1-G3, riser-casing split slot,
  wall-jump lip, damper bar, hoist rope past the control-room window, spoil zipline, fan guard and discharge duct, catch
  nets), airlock A3, B4 The Cistern (three cells, 4.4 co-op walls, inspection door, sluice, valve gallery, overflow
  channel, float shaft, sump, outlet platform) and airlock A4 on the outlet platform. Course stub B1-B4 with the fan
  isolator, bolts, the sluice hold and the outlet ladder.
- T4 Plant level, rest (y 6) and Stair 6: B5 Standby Plant (three gensets with wall-jump roofs, grating walkway over a
  secret cable trench with lift-out panels, cable gallery with a hang-drop, glazed switch room with the mains breaker
  switch, fuel bay and day tank, duty desk, entry landing and stair at A4's door), airlock A5 and its service passage
  (plant platform under the supply duct), B6 Mock Site (reception, corridor and L, open office with partitions and the
  glazed manager's office, control-room mezzanine at 3.6 behind a reader door, lockers, records with the duct's
  ceiling grille, mantrap, server room, exit keypad lobby), S6 (33-riser enclosed stair to y 0) and airlock A6.
  `BUNKER_DEVICES` mount points for T7a. Course stub B1-B6: the mains gate on A5, card readers, keypad, egress, S6's
  one-way top door; Finish in A6.
- T5 Deep level (y 0): B7 The House (rock cavern, two-storey kill house with roof parapet and hatch, kitchen annex,
  water main, rock-bolting bench, sandbags, skip, recesses, the store door), airlock A7, B8 The Range (firing line, kit
  lockers, lane stands, penetration wall, barrels, lamp gantry, shoot-house barricades, catwalk, control tower, caged
  catwalk stair bolted from below, sniper scaffold), airlock A8 (medkit), B9 The Plot (plot floor and map table,
  balconies 4.5 / 9.0 with cabins, bridge, stair towers, the north-west boost gap, bridge rope, zipline to the lift
  lobby, message-tube duct) and the exit lift L9. Course stub B1-B9: store key, catwalk bolt, keys A / B, the case and
  the two-key lift; the course ends in the lift. e2e-anchors covers the bunker.

## 3.7.0 - Training course framework (Block A, branch `feature/training-bunker`)
- Course mode (T1a, T1b): `CourseState` (pure, host only) runs bays, airlocks and gates (lever, bolt, hold, timed hold,
  pair, egress, mains, pickup / flag, anchor lock), checkpoints and bay restarts; `CourseMode` puts down the devices,
  keeps door, anchor and lamp locks in step and speaks LANTERN's radio (text only, held while guards are alerted).
  Co-op "Training course" takes two players (host P1, client P2): the `course` message mirrors state, locks and lights;
  friendly fire is on (D38). Debug map `courselab` (`?autostart=courselab&mode=course`, not listed); dev solo flag
  `?course=solo`.
- Drills and tutorial (T1c): `drillDetect` derives every drill verb in one place (edge-triggered); the client reports
  its local-only verbs as `ctick`; takedowns, thrown gadgets, doors and team moves resolve and tick on the host. The
  tutorial HUD lists the bay's drills with P1 / P2 tick columns and the current step in LANTERN's voice; drill-done
  toasts and radio on both pages; next-drill markers (Settings > Gameplay "Course markers"). Airlocks and the course
  end device ("Finish", `devices.end`) refuse while drills are open, naming them. No skip path (D30).
- Results: a course panel (per-bay and total time, detections, alarms, knock-outs, kills, revives, team moves, per
  player and team; the finale's Ghost / Silent / Loud tier). Course record `course:fallow` (IndexedDB kv; no save
  version change); the co-op lobby offers "Start at bay N" for finished bays, and both players start in that bay's
  entry airlock.
- Net: `PROTOCOL_VERSION` 3 (`course`, `ctick`, `start.bay`, `td.kind`). Tests: `tests/course*.test.ts`,
  `tests/courseTutorial.test.ts`, e2e `e2e-course`.

## 3.6.x - First Playable (in progress)
- Docs: 2026-10-10 cleanup (retired maps archived, docs match the new campaign).
- Docs: story 2.0 (D1, approved): present-day campaign, Mission 1 Dead Line at Cinder Yard (Ostler Colocation's data centre), Mission 5 The Strongroom, Kestrel Exchange retired.
- Dead Line v2 G1 (Area 1, 3.5.1): the Cable Lane greybox (`?autostart=dead-line-v2&mode=sandbox`, main menu card "Dead Line v2"), generated from `docs/design/map-dead-line-v2.json` by `scripts/gen-dead-line-v2.mjs`: lane, viaduct, lean-to roofs with downpipes, roof lights, palisades, spikes, cars, substation rooms, cable tunnel with M1 and M2 shafts and ladders, vent grating, flat debug markers, debug Teleport (encounters, checkpoints, spawns). Gate report `docs/archive/maps/gates/dead-line-v2-G1.md`. The old Dead Line is unchanged.
- Per-object hold noise: `Interactable.holdNoise` sounds at the start of a hold and every 0.5 s while it runs (`holdNoisePulse`, `HOLD_NOISE_PULSE` in `config/noise.ts`); `MANHOLE_LIFT_NOISE_RADIUS` 10 m for cast-iron covers. Holds without it stay silent.
- Nav layers per map: `MapDef.navLayers` (default 3, `DEFAULT_NAV_LAYERS`); Dead Line keeps 5 surfaces per column for v2's A block (basement to roof).
- G1: Mission 1 DEAD LINE campus greybox (`?autostart=dead-line&mode=sandbox`), generated from `docs/design/map-dead-line.json` by `scripts/gen-dead-line.mjs`: four floors plus the trench and culvert, 12 doors, stairs, ladders, drops, ducts, ledge and roof beam, flat debug markers, flat light, no guards or lamps. Debug overlay Teleport menu (chapter starts, spawns, objectives). Gate report `docs/archive/maps/gates/G1.md`.
- T1: the Kestrel Trunk Annex ("Dead Line") is a listed map and mission (`?autostart=trunk-annex&mode=infiltration`): a walkable 36 x 28 m greybox on three levels with the yard, Goods-in, break room, switch hall and gallery, generator room, core switch cage, Test and Control rooms, roof, open stair, fire stair and four ladders; four insertions, objectives O1 and O2, exits E1 and E2; six guards on 40 s master-clock loops (timed patrol routes). NavGrid path costs are Float64 (a long search could loop and find no path). No lights, switches, panels or trench yet (T2, T3).
- S1a: the Kestrel Exchange greybox is a listed map (`?autostart=exchange&mode=sandbox`): cable tunnel and chamber, ground floor shell, basement stair, main stair to a first-floor landing. No lights, guards or objective yet (S1b, S1c).
- S1b: the Exchange's first floor, roof and rear goods yard: switchroom, offices, server hall with its cage, gallery and motor-room stairs, roof with parapets and the steel stair to the yard, yard with cover. Nine rooms.
- R1: Exchange layout v2, basement and ground floor: cable chamber, rectifier, battery, generator, boiler, riser base, service tunnel, MDF hall, test and transmission rooms, foyer, security, canteen, meeting room, cleaners, goods-in, workshop, light well, ring corridor, with the C ladder, B, V and R stairs, the plant ramp and the coke stair. The first floor and roof are rebuilt in R2.
## Unreleased - Movement foley (feature/footsteps)
- Sound: the player's footsteps, landings and moves are real CC0 recordings (Kenney Impact Sounds and RPG Audio,
  `docs/audio-credits.md`) instead of one filtered noise burst per surface. Each step is a heel and a toe from separately
  picked takes with their own pitch and level, the two feet a touch apart, no take repeated back to back, no gear
  sound at all: the suit is built not to make noise. Crouch, walk, run and sprint each sound different (a slow soft roll to a slap); concrete, metal
  (deck ring), grate (rattle), wood (boots on boards), gravel (crunch) and carpet each have their own takes. Landings
  (soft, roll, heavy), vaults, mantles, hops and rolls have their own sounds, all damped by the suit (dull, short, quiet).
- Steps now follow the animation's real foot plants instead of a timer, so they match what the feet do (turning on
  the spot, stopping, a stride at any speed gear).
- Gameplay is unchanged: guards still hear the noise model, never the audio.
- `?foleylab=1`: a listening screen with every surface and gait, the landings and moves, and an A/B against the old steps.
- Tools: `npm run sfx:fetch`, `npm run sfx:render`; tests `tests/foley.test.ts` and `scripts/e2e-foley.mjs` (required).
- Rule: `CLAUDE.md` and the bible (S7) allow CC0 movement foley (Michael, 2026-10-16).

## 3.5.0 - Chaos Theory foundation
- Direction: the game is now **Night Shift**, an original stealth game in the spirit of Splinter Cell: Chaos Theory
  (`docs/design-bible.md` v1.7, story in `docs/story.md`). This release changes no gameplay and no feel.
- Integration: `ct-movement` now carries `master` 3.4.0 (the light phone renderer, baked lamps, the Phone check) with the
  Chaos Theory movement (3.2.0-ct) and the Warehouse CT routes. The Kestrel Exchange is a paper design only (map phases
  0-2, `docs/archive/maps/prompts/exchange-design.md`; paused until roadmap Phase 3b); the old Exchange blockout is gone. The split
  jump can be jumped out of again.
- Design bible: `docs/design-bible.md` is the authority on design (vision, pillars, systems, out-of-scope list, process,
  roadmap Phases 0-7 with 3b); `docs/progress.md` says where the project stands.
- Docs: `CLAUDE.md` 142.7 KB -> 9.6 KB, a lean core with a doc index; everything else moved word for word into
  `docs/systems/*.md` (19 files, read on demand; a script checked that no line was lost). `CHANGELOG.md` 137.9 -> 45.2 KB
  and `TESTING.md` 84.4 -> 32.0 KB keep 3.0.0 onwards; older entries are in `docs/archive/`.
- `?legacy=1`: Wave Survival, Mission, Hunter, Team Deathmatch and Free-for-all, credits / XP / level, the Loadout suit,
  appearance, tag and emotes, HQ, challenges, weapon upgrades and camos, and the Ghost / Panther / Assault bars are hidden
  unless the URL has `?legacy=1` (never saved). Without it: the Play screen offers Infiltration (the default), Training and
  Free Roam; the co-op lobby Infiltration and Free Roam; the Loadout screen weapons, attachments, gadget and presets, with
  every weapon and attachment selectable (nothing is bought, unlocked or saved as owned: the save keeps your choice).
  Nothing is deleted, progression still records, saves are unchanged (no `SAVE_VERSION` change), and
  `?autostart=...&mode=...` starts any mode.
- Title: the game's name is Night Shift on the menu, the loading screen, the page and app titles and the install
  manifest ("Night Shift (Preview CT)" on `/ct/`). The internal ids keep the old names (IndexedDB `shoulder-strike`, the
  save export magic, the co-op app id).
- Tests: `npm run e2e` runs the required suites; `npm run e2e:legacy` runs `e2e-progression`, `e2e-cosmetics` and
  `e2e-clear` (parked content, report only). New: `e2e-park` (the legacy-off and legacy-on menus), `tests/legacy.test.ts`.
  `e2e-traverse` and `e2e-netmove` wait for the match / the host's copy to settle on slow machines.

## 3.4.0 - Light phone renderer
- Direction: desktop first. Phones no longer chase the PC renderer: on the iPhone the voxel look reached ~65 fps cool
  and fell to 18-30 once warm, whatever was cut. Before 3.0 phones ran smoothly because they drew the plain level in
  simple materials with no post effects - that is what they draw again.
- The phone look: the Warehouse's plain blockout (no voxels) in simple materials, smooth characters and weapons, the
  nearest six lamps as plain lights, contact shadows under characters, the scene fog, the vignette / goggles pass and
  nothing else (no shadow maps, no TAAU, no post effects). Native resolution; the frame governor steps down to 75%,
  then holds 30 fps, as before. The Loadout operator on a phone is the smooth one too.
- Gameplay is unchanged: collision, cover, navigation, enemy sight and the light meter always read the plain level, so
  a phone player sees and hides behind the same things as a PC player (co-op and PvP across devices stay fair).
- The Phone check (about 8 minutes): the phone look at 100% and 75%, with the moon's shadow, the 3.3 voxel look for
  comparison, the first run again (heat), then 3 minutes held at 60.

## 3.3.2 - Phone check without the heat
- The iPhone dropped from ~100 fps to ~20 during the Phone check and came back after a few seconds on the home
  screen: heat, not a leak - textures, shaders and memory stay flat across six benchmark matches and return to the
  menu's level after (checked headless). Uncapped runs keep the GPU flat out; a hot iPhone slows its GPU hard, and a
  few seconds idle cool the chip (not the case) enough for it to run fast again until it heats up.
- The Phone check now cools down for 30 s between runs (nothing drawn, a countdown on the run tag), so a run measures
  its settings rather than the runs before it, and ends with 3 minutes at the match's 60 fps cap: per-minute
  averages say whether 60 holds once the phone is warm. About 12 minutes; start with the phone cool.

## 3.3.1 - Reading the Phone check
- The first Phone check (iPhone 17 Pro Max): the phone look at 75% averaged 69 fps (median frame 14 ms), at 100% 42;
  the per-lamp loop 61, the voxel detail 52. The frame rate fell at the end of every run: not the next run loading (it
  loads only after the run's result is taken) but the route - 20 s at a walk ends where the camera leaves the
  dead-end office and looks down the corridor into the hall at the first guards (rifles, pouches, a dog, a recon
  drone, barrels, pickups: ~100 meshes on screen against ~30 before).
- Each run's line now ends with its frame rate per 2.5 s of the route (`by 2.5 s (7 m): ...`), so a slow stretch shows
  where it is.
- The spike log counted nearly every frame of an uncapped run as a spike (14 ms frames against a 120 Hz screen's
  8.3 ms): a spike is now 1.5x the budget or the typical frame, whichever is longer.
- The Phone check runs the phone look at 75% again last: the later runs were all ~56 fps whatever they changed
  (taking bounce light out included), which looks like the phone heating up; the repeat says by how much.

## 3.3.0 - One phone look
- Phones have no graphics settings any more: one fixed look built for 60 fps on the iPhone 17 Pro Max. Settings >
  Display keeps the field of view, the FPS overlay, the avatar style, the interface switch and fullscreen.
- Resolution 75 - 100% of the screen, sharpened to full resolution (TAAU), chosen in the match by the frame governor:
  a match starts at 75% and steps up while there is room; it never goes under 75%. A phone that still misses 60 there
  holds a steady 30 instead of wobbling, and tries 60 again later.
- What the phone look keeps: every lamp's light and shadows (walls, racks, doorways) and the characters' shadows under
  them, bounce light, the moon's shadows (one cascade), one flashlight shadow, the height fog. What it drops: ambient
  occlusion, reflections, bloom, light shafts, depth of field, lens effects, the 2.5 cm prop layer, and on the voxel
  walls the AO, worn edges and fine surface texture.
- The lamps cost two texture reads a pixel instead of a loop over up to eight lamps: they are mixed into one light
  volume (the bake's own 0.2 m cells: light and the direction it comes from) on the GPU - at load, and again over
  the cells of any lamp that switches, is shot out or goes down to an EMP (2 - 4 ms once, not every frame). Next to the
  per-lamp version it looks the same (TESTING.md has the comparison).
- Spike log: every frame over 1.5x the budget is tagged with what happened around it - shaders compiled, voxel
  levels of detail swapped, lamps re-mixed, the governor stepping, else the main thread or the GPU. Each benchmark
  run's line ends with it; feedback notes from a match carry it.
- Settings > Display > Phone check: eight 20 s flights - the phone look at 75% and at 100%, then the per-lamp loop,
  the voxel detail, bloom, light shafts and High shadows put back one at a time, and bounce light taken out. Runs are
  uncapped so the headroom shows. Send the note: it says what the phone can keep at 60.
- Measured before this (iPhone 17 Pro Max, 3.2.2): Medium at 75% 33 fps, at 56% 54 fps - the cost is the shading of
  every pixel, not the passes after it.

## 3.2.5 - A walking benchmark flight
- The benchmark flight cut straight from room middle to room middle - through walls - and was then lifted over
  whatever was below it, so it bobbed up and down over crates and racks. It now follows the guards' walking routes:
  the rooms in a short loop, through the doorways and down the corridors, up the mezzanine stairs (never a ladder),
  rounded off and kept clear of the walls, at a steady 1.9 m eye height (lower only under a beam or a deck), at a
  walking pace (2.8 m/s), the view looking ahead along the route and turning gently (under 100 deg/s); a dead-end room
  is circled rather than reversed on the spot, and the view turns towards the open side at tight corners. The doors
  stand open with their leaves hidden during the benchmark, so nothing stands out into a corridor. Warehouse: a 180 m
  loop through the nine rooms, no step crossing the level, nothing within 0.3 m of the camera.
- A run now covers part of the loop (30 s at a walk) - the same part on every run, so runs compare; results are not
  comparable with earlier versions' benchmarks (different views).

## 3.2.4 - Landscape only, either grip
- Phones are always landscape, whatever the orientation or rotation lock: held upright, the page turns - now the way
  of the landscape grip last held (clockwise after one, anticlockwise after the other), so turning the phone upright
  leaves the game where it was on the glass. Where the browser allows a lock (Android in fullscreen or installed), the
  screen is locked to landscape on the first tap; an installed app locks too. (iPhone browsers have no lock: the page
  turns itself.)

## 3.2.3 - Low's floors, the benchmark flight, turning the phone
- Low drew floors and crate tops as flat haze ("no floor"): the surface atlas made while the map loads came out empty,
  and every preset but Low replaced it when its size changed - Low's size (256) never did. It is always drawn anew
  on the first graphics apply.
- The benchmark flight went through the solid block under the mezzanine deck (the Mezzanine room's middle at 2.2 m)
  and the frame rate fell through the floor there: the flight is sampled densely and every point kept 1.6 m over
  whatever solid is below it, under the roof.
- Turning the phone mid-match fired several resizes with in-between sizes, each re-making every full-resolution
  target; at Ultra the memory spike closed the tab. The engine now resizes once the size has settled (250 ms).

## 3.2.2 - Phone memory and per-pixel cost
- The iPhone (3.2.0 benchmark) is GPU bound - frame time follows the pixel count (Medium 33 fps native, 54 at 75%;
  the "main thread" figure falls with resolution: it is waiting on the GPU) - and Ultra ran out of memory on its
  second or third run. Per match: GPU textures 251 -> 159 MB and JS heap ~400 -> 289 MB (headless, phone Ultra):
  - the voxel brick pools and the lamp bake no longer keep a CPU copy of their textures (kept only to rebuild after a
    lost WebGL context; 64 MB per voxel layer);
  - phones: the moon's shadow maps at most 1024 (Ultra's 2048 cascades took 72 MB), surface textures at most High.
- Phones: one flashlight shadow (every shadowed light is sampled by every pixel), no on-the-fly reflection filtering
  (several cube taps per pixel; the probe's mips / spherical harmonics instead), voxel corner shading from 4
  neighbours instead of 12; FXAA no longer runs behind TAAU (every device).
- Shaders compile on the loading screen (every material ready before the match starts; the benchmark counted 37-57
  compiles inside each run).
- Phone benchmark: each run frees the last match and pauses 2.5 s before the next loads ("freeing memory").
- The mid-match shadow rebuild did not reproduce headless (same draws and render time after it): most likely memory
  pressure on the phone; this release frees a lot of it.

## 3.2.1 - Desktop resolutions are the monitor's own
- Settings > Graphics > Resolution (desktop) lists the monitor's standard resolutions instead of percentages of the
  window: a 7680 x 2160 monitor offers 7680 x 2160 (native), 5120 x 1440 and 3840 x 1080 (same shape, down to half
  its height; 16:9, 16:10, 21:9 and 32:9 tables; an unusual shape gets its native size at 75 / 67 / 50%). Fullscreen
  draws exactly that; a window draws the same share of itself.
- Benchmark lines and feedback notes name the chosen resolution, with the real size when a window differs
  ("5120x1440 (window 1707x1005)"); the display line adds the monitor. Benchmark > Resolutions runs each of the
  monitor's resolutions.

## 3.2.0 - Baked lamps: every lamp lights and shadows correctly
- Every fixed light in the map (lamp strips, floods) is baked when the map loads: how much of each lamp's fixture
  every 20 cm of its reach can see through the level - walls, racks, crates, shelves, doorways. Every material shades
  each lamp by it, so all of them cast correct shadows (before, only the nearest 2-4 did; the rest shone through
  walls and racks while the guards' light model said you were in shadow). Strip lamps are area lights: soft along
  the strip, sharper across it. Characters get soft shadows from every lamp (a capsule each).
- Switches, shot-out lamps and EMP still change a lamp at once (its intensity; nothing re-bakes).
- Cheaper on every device: lamps are no longer real lights or shadow maps (the Ultra phone path: lamp shadow-map
  draws 45 -> 10, render JS 6.5 -> 5.2 ms on software GL); only flashlights stay real lights (up to 4, two with
  shadows). Settings > Graphics: Real-time lights is gone; Shadows is the moon and the flashlights.
- The bake runs in the voxel workers on first load (about 2 s headless) and is cached (IndexedDB `lamps:` keys, the
  newest two). `?baked=0` renders the old way, for comparisons.
- No second draw of the scene for depth: without ambient occlusion / reflections (every phone preset, desktop Low /
  Medium) the fog, light shafts and TAAU read the scene pass's own depth buffer (a depth texture on the first post
  process's target) instead of a separate depth pass. Phone Ultra: 223 -> 159 draw calls (baked lamps included).
- Benchmark > Feature costs adds: the settings at 75% render scale (faster = the GPU is the limit), anti-aliasing FXAA
  instead of TAA, and Detail Medium (no fine prop layer).
- Bounce light: the lamp circuits are mixed into one texture whenever a circuit changes (switch, shot, EMP), so a
  pixel takes one GI sample instead of one per circuit (9 in the Warehouse).

## 3.2.0-ct - Chaos Theory movement (ct-movement branch)
Phase 0 - speed gears, instant stop, roll:
- Speed gears: six paces, stepped one at a time (controller D-pad up / down, mouse wheel or = / - on PC, the new speed
  rocker on touch). Crouched 0.5 / 0.9 / 1.3 / 1.8 / 2.3 / 2.8 m/s, standing 0.8 / 1.3 / 2.0 / 2.8 / 3.8 / 5.0 m/s;
  the stick scales the gear's pace, a keyboard or a stick at its rim gives the full pace. Every spawn and respawn
  starts in gear 3; crouching and standing keep the gear. Sprint is gear 6 standing while it lasts; aiming is still
  capped at the aim pace. The HUD shows SPD pips by the light meter for 1.5 s after a change; the touch rocker shows
  them all the time.
- Footstep noise: crouched gears 1-4 and standing gears 1-2 are silent; faster gears are heard further.
- Chaos Theory feel on free movement: letting go of the stick stops the operator dead on the next step (the feet
  stay planted), starts reach full pace within 0.08 s, direction and gear changes
  take effect at once, no planted pivots, the body turns at up to 720 deg/s. Cover, cover-to-cover, traversal and
  the guards move as before (the guards' tuning is now pinned by a test).
- Stopping holds the exact stride you stopped in (a foot in the air sets straight down) until the next input - the
  stick, aiming, a stance change, cover or a climb - from any pace, crouched (no automatic kneel) or out of a sprint.
  A controller stick springing back counts as letting go from the full pace (it no longer slows you on the way).
- Cover: the speed gear sets the pace along the wall (gear 1 creeps, gear 6 hurries; no faster than 2.8 m/s standing,
  1.8 crouched; gear 3 is about the old pace).
- Forward roll: tap crouch while moving standing in gear 5-6 (or sprinting) - a committed 3 m roll in 0.7 s that
  comes up crouched; guards within 2 m hear it.
- Controller: D-pad right is now the gadget (hold to aim, release to throw); D-pad left tapped pings (co-op), held
  opens the gadget wheel; View tapped is goggles, held plays emote 1. PC: the mouse wheel changes the speed gear
  (weapons stay on Q / X); new bindable keys Speed up (=) / Speed down (-).
- Touch layout v4: the speed rocker (right of the move stick's zone) is added to every preset and the layout editor;
  saved layouts keep every placement.
- Debug Tune panel: a Chaos Theory table (stop blend, start time, turn rate, roll time / length).

Phase 1 - networked movement state:
- Co-op and PvP: team-mates and opponents are shown doing exactly what they are doing - in high or low cover (hiding,
  peeking over, leaning out at an edge, kneeling), climbing a ladder or drainpipe, hanging from a pipe or a lip,
  crawling a duct, riding a zipline, vaulting, mantling, rolling and in a takedown - posed by the same code as the
  player (hands and feet on the same rungs, within a few cm), instead of sliding upright between positions.
- A committed move (vault, mantle, step, drop, hop, roll, window vault) is sent once at its start and replayed on
  the other screens along the same path, so it never cuts corners through the obstacle.
- A change of mode (taking cover, grabbing a ladder) is sent at once, not on the next 20 Hz tick.
- Hit volumes on other players follow their pose (hanging, crawling, leaning): a shot at a hanging player's head is a
  headshot. The host's lag compensation rewinds the posed head and body, not just the feet.
- Host checks: a client's free movement is held to its speed gear's pace (+15%); a client claiming a ladder or lip
  stays within half a metre of it (clamped, never kicked).

Phase 2 - split jump, wall jump, pipe legs up / inverted:
- Split jump: between two tall walls 1.2-1.95 m apart, facing along them, a double jump braces in a split with the
  legs straight out to both walls 2.5 m up. Aim (LT) draws the sidearm one-handed (turn up to 100 deg either way, look
  down steeply), RT fires; B drops (or a drop attack). Nothing else leaves it.
- Wall jump: facing a wall under a lip 2.7-3.8 m up (too high to grab standing), Y ("Wall jump") kicks off the wall up
  to a hang on it; at an inside corner the kick goes off the adjoining wall to the lip beside it.
- Horizontal pipes: hanging by the hands, Y ("Legs up") crosses the legs over the pipe - a slow shimmy along it with the
  feet well up out of the way; Y again ("Invert") hangs upside down by the knees: no travel, the sidearm aims and fires
  (spread x1.3) while the camera stays upright; Y curls back up, B goes back to the hands; inverted, B lets go and flips
  over onto the feet. Changes take about half a second; getting hit during one drops back to the hands.
- Co-op / PvP: other players see all of it (split braced and aiming, the wall kick, legs up, inverted), hit volumes
  follow the pose.
- Proving Grounds: a Chaos Theory course north of the platform (a split corridor with lips above, a wall-jump block
  with an inside corner, a pipe over open ground).

Phase 3 - rappel and fences:
- Rappel: at a roof edge with a rappel point, Y ("Rappel") hooks on and steps over. Stick down descends (1.6 m/s, 3 m/s
  with sprint held), up climbs (1 m/s; at the top back over the edge). Y kicks out from the wall and swings back,
  sideways with the stick (up to 1.5 m either way). Aim (LT) turns round on the rope with the sidearm. Beside a window,
  Y kicks through it (the glass breaks) into the room. B unhooks within 2 m of the floor; at the bottom it unhooks.
- Fences (chain-link): Y ("Climb") grabs one; climb up / down 0.9 m/s, shimmy 0.6 m/s; at the top Y flips over and
  down the far side; B drops. Climbing above gear 3 rattles it (heard 4 m away); gears 1-3 are quiet. Fences stop
  bodies, never bullets or sight, and give no cover.
- Co-op / PvP: other players see you on the rope (with the rope drawn) and on fences.
- Proving Grounds: a 5.5 m rappel house north east (ladder up its west side, a rappel point over a glazed window, a
  doorway east) and a fence north west of the platform.

Phase 4 - Chaos Theory takedowns and the grab:
- Drop attack: hanging from a lip or a pipe (by the hands or legs up), braced in a split, on a zipline or a rope, a
  guard 1.2-5 m below within a metre of where you would land: "Drop attack" (tap knocks out, hold kills).
- Hanging inverted on a pipe, a guard right beneath: choke him up (tap) or break his neck (hold); you stay hanging.
- Hanging at a lip, a guard standing at it above is still pulled over (the ledge pull).
- The grab replaces the instant takedown from behind (dogs excepted): Y ("Grab") takes the guard and holds him in front.
  Holding him you walk (gear 2 at most), LT / RT aim and fire the pistol one-handed over his shoulder (spread x1.2);
  Y again: tap knocks him out, hold kills; B shoves him away (he staggers a second, then raises the alarm). Guards who
  see you hold their fire for 1.5 s, then aim at your head only - and their shots hit him first. If he dies, he drops.
  An Execute charge is earned as with any takedown.
- Co-op: a client's grab holds the host's guard in front of that player (a shield for them too).
- PvP: the drop attack, the ledge pull and the inverted choke work on opponents (the host checks them); no grabs.
- Training: the takedown step is now a grab and a second press.

Phase 5 - co-op team moves:
- Brace: with a team-mate within 3 m and a wall right behind you, hold Y - back to the wall, hands cupped. B stands up.
- Boost: facing a braced team-mate (within 1.2 m), tap Y - a step into their hands and a toss up to a lip, pipe or
  split above (up to 4.5 m) that you could not reach alone. The prompt shows only when there is one in reach.
- Human ladder: facing a braced team-mate, hold Y - you climb onto their shoulders (feet 1.45 m up) and stand there
  free to turn, aim and fire; Y grabs a lip up to 4.1 m over the floor, B hops down. The bottom holds still; B drops
  the climber.
- The host checks every request on both players' states (alive, team-mates - same side in Team Deathmatch - the
  partner braced, the climber on the ground, within reach, the target in range; one request a second) and starts it
  on both screens at once; refused requests do nothing.
- Y order: takedown > team move > Chaos Theory move > traversal > interact.
- A teleport (respawn, insertion) now drops any committed move in flight and is never counted as a fall (no landing
  roll where it lands).
- Proving Grounds: a 4.2 m block north (out of reach alone) for boosts and the human ladder.

Warehouse - Chaos Theory routes (more ways in, more height):
- A roof walkway over the south facade (6.3 m, moonlit, a loud metal deck): up a drainpipe in the west yard, or - with a
  team-mate - a boost or the human ladder up the new pump house in the east lot and a climb from its top.
- A rappel point on the roof edge over the glazed dispatch window: down the rope, kick through into dispatch.
- The skylight edge over the workshop: hang from it and drop on the patrol below.
- The service corridor's walls stand 4 m along a 5 m stretch (1.86 m apart, no cabinets): split jump over the new
  corridor patrol and drop on him.
- A pipe from the mezzanine deck out over the factory floor at 4.4 m, above the floor patrol: legs up, inverted, drop.
- The big press stands 3.3 m: a wall jump up to a perch over the floor.
- A chain-link fence closes the dark yard lane off from the east lot: climb it in the dark (quietly at gears 1-3) or walk
  round through the lit gap by the facade. Guards walk round.
- One more guard: a corridor patrol (Hunter / Infiltration counts include him).
- The gatehouse in the east lot moved south, clear of the pump house.
- Takedowns: the offer now tries the three nearest guards (a guard behind a wall no longer hides the one under you);
  a grab whose hostage is shot dead ends at once.

Playtest changes (Michael, 2026-10-08):
- Jump: a new touch Jump button; with a controller / keyboard, Y / E jumps when nothing else is on offer. A jump keeps
  the run's pace (about 0.8 m up) and the hands grab what comes in reach on the way: a lip, a horizontal pipe, a
  drainpipe or a ladder. A second press in the air between two tall walls braces in a split (a double jump); the split
  prompt says so.
- Split jump: the feet brace 2.5 m up (was 1.9 m); the walls need 3.6 m.
- Horizontal pipes: hanging by the hands faces along the pipe (hand over hand, not side-on like a lip), and so does
  hanging upside down (the legs wrapped round it); hold the stick back against the facing to turn round on it.
  Standing under a pipe, Y / the action button takes it before a mantle over anything beside it; the mezzanine deck
  pipe now starts further back over the deck.
- Touch action button: one button does what the world prompts show - take cover, vault, climb, grab, rappel, wall
  jump, boost, cover-to-cover, corner, leave cover, use - dimmed when nothing is on offer. The prompts stay on the
  surfaces as indicators (no longer tapped). With a cover face and an obstacle both prompted, moving (or the stick
  pushed at it) goes over / up it, standing still takes cover. Touch layout v5 adds the Jump button beside it; saved
  layouts keep every placement.

Playtest changes, second round (Michael, 2026-10-08):
- Split jump: the legs go almost straight out to the walls (the body sits lower, hips just over the feet), so the
  hallway can be wider: 1.2-1.95 m between the walls (was 0.9-1.7). It faces down the hallway the way you jumped, so
  either way works. No jumping out of it: drop (B), a drop attack on a guard under you, or aim and shoot the pistol.
- Warehouse: the corridor cabinet bank is gone; the corridor's own two walls stand 4 m along a 5 m stretch, 1.86 m
  apart. Proving Grounds: the split corridor is 1.8 m wide.
- Fix: after a fall (or stepping off a curb) the operator could come to rest floating 4-14 cm over the floor. The
  character now settles onto it.
- Fix: a respawn / insertion puts the feet straight into a stance where you appear (they used to walk over from where
  you were), and a foot stepping back past the other bows round it instead of brushing through it.
- Split jump: jumping out of it is back (Michael, 2026-10-08). Braced, Jump (or Y) jumps up to a lip, pipe or ladder
  over the split ahead of you; drop, a drop attack and the pistol stay as before.

- Docs: level design standard (`docs/level-design.md`), map spec template (`docs/templates/map-spec.md`) and the
  Kestrel Exchange spec (`docs/archive/maps/prompts/exchange-map.md`).

## 3.1.9 - Epic's half-fog, the phone's display rate, no locks, lighter phone passes
- Desktop Epic sometimes drew the bottom half of the screen as flat fog: ray-traced reflections and depth of field
  share one depth pass, and depth of field paused it whenever nothing was in focus - the reflections (and the fog
  where they composite) then read a stale depth. Depth of field only pauses that pass when nothing else reads it.
- The phone read its 120 Hz screen as 16 / 24 / 48 Hz in heavy matches (the detector took the median frame time, and a
  GPU-bound frame lasts whole refresh periods), so the frame governor saw every slow frame as on time and never
  stepped down. The detector now reads the fast end of the frames, and in a match it can only raise the rate (a real
  cap - low-power mode, a browser at 60 - shows on the menu).
- Phones toward 120 fps: ambient occlusion (the costliest pass measured: Medium 54 -> 74 fps without it; the voxels
  darken corners themselves), screen-space reflections, depth of field, motion blur, lens effects and Panini are off
  on phones whatever the preset; bloom is cheaper. Lighting, shadows, bounce light and light shafts stay. Settings
  hides those rows on phones; motion blur is gone everywhere (no preset used it).
- The phone target is now 60 fps at Ultra, native resolution: no resolution lock - phones choose the output in
  Settings > Graphics > Output resolution: Native (the default; 2868 x 1320 on the iPhone 17 Pro Max), 2x (1912 x
  880, as before) or 1.5x. Ultra on a phone renders native (no upscaling); a phone's Target frame rate starts at 60
  (once; "Display refresh" is still there) so the frame governor holds 60.
- No PvP locks: the shared PvP graphics look, the 90 deg / 16:9 field of view cap and Panini-off in PvP are gone;
  everyone plays on their own settings.

## 3.1.8 - Epic shadows fixed, a Resolution list, no hidden resolution drops
- Desktop "all fog but the lamps" was Epic shadows: 8 soft lamp shadows took the level's and characters' shaders past
  the 16 textures a shader may use on the laptop (Chrome on D3D11; headless software GL allows 32, so tests passed);
  those shaders failed and the level drew black under the fog. Every preset now stays within 16: lamp / flashlight
  shadows are PCF (one texture each) and at most 4 (`MAX_SHADOW_CASTERS`); Epic keeps 2048 maps and the moon's 4
  high-quality cascades. The desktop e2e checks every material shader at Epic against 16.
- The blurry desktop: with Adaptive detail off, the old dynamic resolution (still on in older settings) lowered the
  render resolution whenever a frame missed 120 Hz. Retired: only Adaptive detail may change it in a match.
- Settings > Graphics > Resolution (desktop): a list of real render resolutions from the native output (50% .. 200%);
  a pick applies at once and asks "Keep this resolution?" - no answer within 15 s (or Revert / Back) puts the last one
  back. Phones keep the Resolution scale slider.

## 3.1.7 - Every match stayed in memory
- The phone crash reports (High / Ultra benchmarks a minute in, and a crash 14 minutes into a session): every match
  stayed in memory after it ended - about 80 MB each at Low, far more at Ultra. Babylon's engine-wide shader cache keyed
  each match's material shaders by a plugin id that counts up, so none was ever reused, and each held its material,
  its scene and the whole match. The cache is emptied whenever a scene is freed (before the next one loads), and going
  back to the menu frees the match first too. Headless: back at the menu the heap returns to ~50 MB after every match
  (it climbed 80 MB per match before).
- Feedback notes carry every setting: `settings` (every graphics / display setting, the preset's features included)
  and `changed` (everything else that differs from the defaults; a moved touch layout or rebound keys as "custom").
  Benchmark and crash notes carry the same full context. Settings > Feedback > Copy as text now puts each note's
  context on the line under it (device, display, GPU, frames, settings), so a pasted report says what it ran on.
- Desktop Ultra (all grey but the lamps in every benchmark run) is not yet reproduced: see TESTING.md.

## 3.1.6 - Forced landscape
- iPhone browsers cannot lock the orientation (the manifest's `landscape` and `screen.orientation.lock` only work on
  Android), so with rotation locked the game sat on a "rotate your device" screen. Now a touch device held upright
  gets the whole page turned 90 degrees: hold the phone turned left (the Dynamic Island on the left). Menus, HUD,
  sticks and buttons work as in landscape; the safe areas follow the turn. The rotate screen is gone. Turning the
  phone to landscape with rotation unlocked still uses the browser's own landscape.

## 3.1.5 - Benchmark crash safety, crash reports
- iPhone Feature costs on 3.1.4 (Medium, 1912 x 880, every run in its own match - the first valid per-feature
  numbers): your settings 52 fps (1% low 20); without ambient occlusion 70 (1% low 42); textures Low 56 (1% low 40);
  shadows Low 55; light shafts, bloom and lamps 8 within 2 fps. A post-effects rebuild mid-match is fine (49); a
  shadow rebuild mid-match drops it to 15 fps (main thread 29 ms) - the slowdown comes from rebuilding the shadows, not
  the post effects (still to find: headless Chromium shows nothing different after it).
- Ultra and High closed the tab during the benchmark: the next run's match was built while the last one was still in
  memory (~0.5 GB of JS heap each at High in headless Chromium). A match now frees the last one (or the menu stage)
  before it loads (`App.releaseState`), for every match start, not only the benchmark.
- Crash reports: a heartbeat every 5 s and on every stage change (menu, loading, in a match, benchmark run n/N) with
  the feedback context; hiding or closing the page marks it clean. If the page died while open, the next start saves
  a "Crash report" note (Settings > Feedback) saying what was running, and shows a toast.
- The benchmark's note is saved after every run ("Benchmark (3 of 9 runs so far) - ..."), so a crash keeps the runs
  before it; the final save replaces it.
- A run tag at the top of the screen during the benchmark and its loading screens: "Run 3/9 · without bloom · 52 fps".

## 3.1.4 - Every benchmark run in its own match
- iPhone Feature costs on 3.1.3: unchanged (Medium 53 fps with your settings, Ultra 21; the runs after the first
  still 8-20 fps), so the 3.1.3 material refresh is not the cure. Headless Chromium shows nothing different after a
  rebuild (same passes, draws, light tiles, no GL errors): what goes stale is particular to the iPhone's GPU.
- Every benchmark run (Feature costs, Every preset, Resolutions) now loads its own match with its settings set before
  the map loads - the way the first run, always the fast one, was built. A preset's Detail tier (voxel layers) now
  takes effect too; before, every preset ran on the first match's.
- Feature costs ends with two diagnosis runs at your settings: the post effects rebuilt mid-match, then (same match)
  the shadows rebuilt mid-match. Their lines say whether a rebuild alone slows the phone and whether new shadows put
  it right.

## 3.1.3 - Graphics changes in a match no longer slow every frame
- iPhone Feature costs on 3.1.2 (1912 x 880): Medium 57 fps with your settings, Ultra 22. But every run that rebuilt
  the post effects without touching shadows (ambient occlusion, light shafts, reflections, bloom, depth of field,
  post-effect resolution or textures off) dropped to 8-20 fps and stayed there; the shadow and lamp runs, which make
  every material rebuild its shaders, were back at full speed. The same happened when changing those settings from
  the pause menu.
- A post-effects rebuild in a match now has every frozen material re-read its setup for two frames (as a shadow
  change already did), then freeze again.
- Turning ambient occlusion (and screen-space reflections) off mid-match on a preset with depth of field left fog and
  TAAU reading a depth pass depth of field had paused (a stale depth: smeared upscaling, wrong fog). The camera's
  depth passes are released with the old effects and the fog's is always running.

## 3.1.2 - Feature costs benchmark
- iPhone 17 Pro Max on 3.1.1 (1912 x 880): Low 76 fps, Medium 47, High 41, Ultra 21 (3.1.0: 60 / 19 / 15 / 12) -
  better, still short of the target, and the 1% lows (8-15 fps) show hitches.
- Settings > Graphics > Benchmark > Feature costs: your settings, then one run per costly feature turned off or down
  (ambient occlusion, light shafts, reflections, bloom, depth of field, shadows, lamps, post-effect resolution,
  textures), 20 s each - the device's own GPU says what costs most.
- Every benchmark line now counts hitches (frames over 50 ms) and the shaders compiled during the run.
- The benchmark result saves itself to Settings > Feedback the moment it finishes; the report scrolls inside its
  window (it outgrew a phone screen) and Copy text puts it on the clipboard.
- Benchmark runs hold the frame governor off (it was adapting during "current settings" runs, so those measured a
  moving target).

## 3.1.1 - Phone GPU fixes from the first iPhone benchmark
- iPhone 17 Pro Max benchmark on 3.1.0 (2868 x 1320): Low 60 fps (Safari's cap), Medium 19, High 15, Ultra 12 -
  the GPU was the limit (the main thread waits on it). Fixes:
  - The fog / light-shaft pass runs ahead of TAAU at the scene's resolution (it marched 6-8 lamps x 16 steps for
    every native pixel); TAAU's jitter is now set as the camera starts rendering, so a pass ahead of it is resolved
    with everything else. 8 steps per lamp below Epic.
  - SSAO / SSR's geometry buffer renders at the scene's resolution with TAAU, not the native canvas.
  - Phones render at most 2 device pixels per CSS pixel (the iPhone's 3x: 2.25x fewer pixels for every
    full-resolution pass; no visible difference on a ~460 ppi screen). PCs stay native.
- Changing Shadows (or a preset) in the middle of a match no longer leaves frozen materials on the old shadow setup
  (WebGL "unbound uniform buffer" warnings every frame, undefined rendering on some GPUs).

## 3.1.0 - One graphics ladder for PC and phones, Auto graphics, adaptive detail, fair crossplay
- Graphics > Preset: Auto (the default; 3.0 installs still on Epic move to it). The game picks the preset for the
  device from its GPU's name, or - when the browser hides it, as every iPhone does - measures the device for a few
  seconds on the main menu (once per device; "Detect again" measures anew). Settings say what was found.
- Adaptive detail (on by default; replaces Dynamic resolution): in a match the game steps detail down when frames are
  missed and back up when there is room - render resolution first, then shadow refresh, light shafts, distant voxel
  detail, effects, lights, character detail. It never changes fog, cover, sight lines or anything gameplay reads.
  A hot device that keeps slowing is noted (debug overlay, feedback notes); iOS Low Power Mode (30 fps) is shown once.
- Frame-rate cap is now Target frame rate (Display refresh, 30, 60, 90, 120, ...): the detail adapts to it.
- PvP: lamp count, lamp and moon shadows, bounce light, contact shadows (off), light shafts (off) and effects density
  are the same for everyone, whatever the preset - how dark or hidden a player looks never depends on the device.
- `perf.mjs --preset=<p> [--mobile]`: a preset's CPU side against the phone budgets (`PASSES=1`: draws per pass).
- Phone tuning (draw calls on the phone platform, 10 guards, Warehouse): Ultra 531 -> 233, Low 227 -> 103. Below
  Epic the level casts its shadows from a plain blockout stand-in (one or two draws per shadow map instead of dozens
  of voxel chunks; shadows within half a voxel of before); the moon's cascades skip characters under the roof (it
  cannot reach them) and small props; fog and TAAU read the G-buffer's depth when SSAO / SSR draw one (no second
  depth pass; depth of field's own depth pass runs only while aiming); guards are one voxel mesh (the head split
  stays for the player's camera fade); Low's moon shades only the level (characters get contact shadows).
- Graphics presets are one ladder for every device: Low, Medium, High, Ultra, Epic (PC only) and Custom. Each preset
  also sets its render scale (Low 67%, Medium 75%, High 85%, Ultra 90% with the TAAU upscaler; Epic native). Phones
  never get Epic or ray-traced reflections (Epic shows as Ultra there). Settings from 3.0 keep their preset (with the
  new values) or their Custom choices.
- New graphics options: Volumetric lights (how many lamps scatter light in the air, 2-12) and Post effects
  resolution (ambient occlusion and screen-space reflections at half or full resolution). Low and Medium keep props
  in the 5 cm voxels (no 2.5 cm prop layer); Low has a lighter shadow set (sun only), Medium two lamp shadows.
- Fog is drawn on every preset (Volumetric light now only adds the light shafts): what a player can see at a
  distance does not depend on graphics settings.
- Far-away voxels never turn see-through: thin walls and panels (doors, partitions, signs) used to drop out of the
  coarsest level of detail now and then; every filled piece is at least one voxel thick there.
- PvP (Team Deathmatch, Free-for-all) is fair between PC and phones: the field of view is capped at 90 and held at
  its 16:9 width on wider screens (ultrawide and phones see no more of the sides), Panini is off. The lobby says so.
- The benchmark's "every preset" runs Low to Epic (Low to Ultra on phones).

## 3.0.0 - PC renderer, Warehouse focus, desktop interface, playtest feedback
- Focus: the Warehouse is the one playable map and runs every mode - Hunter, Wave, Mission, Infiltration (four
  missions: Cold Storage, Ledger, Courier, Blackout - every objective type), Free Roam (new: the whole map, no
  guards, every weapon), co-op and PvP. Proving Grounds stays as a plain range for Free Roam and Training. Embassy,
  Mansion, Port, Refinery and Dust Depot are parked (not offered; kept as they were in 2.3.0 to come back later);
  their mission records and challenges stay in the save.
- Voxels: the Warehouse and Proving Grounds are built from voxels - 5 cm at Epic near the camera, 10 / 20 cm further
  out (levels of detail by distance, nearer on High / Ultra) - with a per-voxel colour and roughness variation,
  ambient occlusion and worn edges between voxels and the procedural surface textures inside each face. Built on all
  but four of the CPU's threads at load and cached on the device (the second load is quick). Gameplay is untouched:
  collision, cover, ledges and the guards' navigation are the same as before.
- Warehouse in voxels: concrete block walls with mortar lines, corrugated cladding over a concrete plinth with rust
  streaks, cast concrete with chipped edges, saw-cut floor slabs with oil stains and yard puddles, painted steel with
  worn edges and seams, plank crates, shrink-wrapped loads in the racking bays, hazard stripes, grime up the wall
  bases, conduit and junction boxes, electrical boxes, vents and signs. Props, furniture, machines and vehicles at
  2.5 cm. Inside under the roof is dark but for the lamps and what falls through the skylights and doorways (the map's
  open sky is baked at load); cover, ledges and floors stay exactly where they were.
- Weather on the Warehouse (Play screen and co-op lobby): Clear, Rain (no rain indoors - it falls through the
  skylights; the yard and the open floor go wet and glossy, puddles turn to mirrors) or Fog (thick, with moonlit
  shafts under the skylights and through the doors). Visual only.
- Voxel characters: the operator, every guard, co-op players and the menu operator are built from 2 cm voxels (4 cm
  further away) - suit, carrier, pouches, pads and the tri-lens goggles - with a tone per voxel and fine seams up close,
  animated as before (ragdolls included); the lens glow, hit flash and the camera's head fade work on them. The stick
  avatar style stays as it was.
- Voxel weapons and gadgets: every gun (in the hands, on the back, the hip and the thigh, in the Loadout preview) is
  built from 1 cm voxels with 5 mm sights, pins and triggers; thrown grenades and the drone are voxels too.
- Global illumination (Epic; Graphics > Global illumination): the lamps' light bounces off floors and walls into the
  rooms around them, per circuit - switch a room's lights off, shoot a lamp out or set off an EMP and its bounce light
  goes with it.
- Ray-traced reflections (Settings > Graphics > Reflections: Off / Screen space / Ray traced): wet floors, puddles
  and steel reflect the voxel world off screen too - walls, racks, lamps, the sky through the skylights - and the
  characters; half rate (a checkerboard, default) or full.
- TAAU upscaling (Settings > Graphics > Display > Upscaler): with a resolution scale under 100% the game renders
  smaller and rebuilds a sharp full-resolution image over frames (e.g. 7680 x 2160 from 67%).
- Panini projection (Display): keeps very wide fields of view from stretching at the sides (ultrawide screens).
- Bullet chips: shots knock a voxel-sized pock out of walls, floors and props with a spray of debris in the struck
  material's colour (cosmetic - cover and collision never change).
 21:9 and 32:9 (up to 7680 x 2160) - the view widens with the screen up to a widest field of
  view (default 120 deg, then the sides stop growing), menus stay a centred 16:9 layout, the HUD keeps to a centred
  16:9 on 32:9 (HUD width: auto / 16:9 / 21:9 / full); the frame-rate cap names the display's refresh (up to 240
  Hz); photos are saved at full output resolution.
- Laptops: the game asks for the high-performance GPU and tells you once if the browser is on the integrated one
  (and how to switch); Settings > Graphics shows the GPU in use.
- Benchmark (Settings > Graphics): a camera flight through the Warehouse - the current settings, every preset, the
  render pixel counts of 2560 x 1600, 4K and 7680 x 2160, or a 10-minute sustained run (first vs last minute, for a
  laptop that slows once hot); average and 1% low per run, saved as a feedback note.
- One renderer for every device, built for a gaming PC (phones run the same, slower): Graphics presets High /
  Ultra / Epic (default) with every feature adjustable (Custom): up to 48 real lights (clustered), lamps and every
  guard flashlight casting shadows (soft on Epic), cascaded sun / moon shadows, ambient occlusion, screen-space
  reflections, volumetric light and height fog, bloom, depth of field (aiming, the menu operator), motion blur,
  lens effects, TAA / MSAA / FXAA, HDR tone mapping; native resolution with a 50-200% scale, optional dynamic
  resolution, a frame-rate cap (30-240), FOV to 120. The menu stage gets shadows, bloom and depth of field.
- Materials: every level piece, character, weapon and prop is PBR with procedural surfaces drawn on the GPU at load
  (sixteen tileable kinds - concrete, floors, asphalt, gravel, grass, plaster, wood planks, corrugated paint,
  brushed steel, rust, tiles, carpet, brick, checker plate, rubber, fabric - with albedo detail, roughness, normals
  and cavity), picked per piece by what it is (floors by what is underfoot, the rest by colour); image-based light
  from a probe of each map.
- Detail: a dressing pass on every map (Detail Ultra / Epic, visual only - nav, cover and ledges are unchanged):
  skirting, conduit with junction boxes and switches, electrical boxes, vents, signs, floor stains, puddles and
  debris; draw and animation distances x2-4; spent brass that stays on the floor, longer-lasting bullet holes.
- Weather (engine): falling rain streaks with wet glossy floors that the reflections pick up, blown dust, heat
  haze (the Warehouse gets its weather choice with the voxel art pass).
- Desktop interface (detected, or Settings > Graphics > Interface): menus scale to the window, no touch settings or
  touch controls (a touchscreen laptop gets them back when touched), hover states, fullscreen on demand.
- Mouse & Keyboard settings: sensitivity, aim sensitivity, invert, raw input, and every key rebindable (two per
  action, extra mouse buttons too); prompts and the controls list follow the bindings.
- Playtest feedback: Settings > Feedback and Pause > Report feedback write a note (type, text, the map / mode /
  position / graphics it was written in) with photos from photo mode - the game freezes, the HUD hides, a free
  camera flies to the problem; take, retake or keep, as many photos as needed. Notes stay on the device; Export
  report makes one HTML file with every note and photo (share sheet on phones), or copy them as text.

## Older versions
- 2.3.0 and earlier: [docs/archive/CHANGELOG-pre-3.0.md](docs/archive/CHANGELOG-pre-3.0.md)
