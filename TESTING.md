# Manual device test checklist

Run on your phone (and MFi controller where noted). Tick each item. Use `?debug=1` to show the FPS overlay,
or tap with three fingers.

Checklists for versions before 3.0.0 are archived in [docs/archive/TESTING-pre-3.0.md](docs/archive/TESTING-pre-3.0.md).

## 3.6.0 (Phase 1) - Desktop sharpness, backlog 3 (PC; phone for the look only)
- [ ] Desktop, Epic, Reflections Screen space, in a match, not aiming: the whole frame is sharp (crate edges, far
      shelving, the operator's outline); the same with Reflections Off.
- [ ] Switch Reflections to Ray traced: the sharpness does not change (only the reflections do).
- [ ] Repeat at Ultra and High.
- [ ] Aim: the background softens behind what the sight is on, with no full-frame blur flash as aiming starts; release:
      sharp again.
- [ ] Phone (`/ct/`): the phone look is unchanged (no depth of field there).

## 3.5.0 manual check - Night Shift foundation (iPhone at the /ct/ preview, desktop, two devices)
On the iPhone, at the `/ct/` preview:
- [ ] The app and menu are titled Night Shift. The installed home-screen app may keep its old name until it is re-added.
- [ ] The Play menu shows only Infiltration, Training and Free Roam (Infiltration first).
- [ ] Free Roam on the Warehouse and the Proving Grounds loads and runs smoothly.
- [ ] The CT moves work by touch: split jump (including jumping out of it), wall jump, rappel, pipes, the speed rocker.
- [ ] Settings > Display > Phone check. Run it and send the feedback note.
- [ ] The Loadout screen shows weapons, attachments, gadget and presets only; everything is selectable (try the sniper), and the choice is still there after closing and reopening the app.
- [ ] No level, XP or credits on the menu, in the Loadout screen, or on the results screen (the mission rating stays).

On desktop:
- [ ] Same menu checks.
- [ ] `?legacy=1` brings back Wave, Hunter, Mission, PvP and the Loadout economy.

Co-op (two devices): Infiltration on the Warehouse; Free Roam on the Warehouse with boost and human ladder where it offers them. The lobby lists Infiltration and Free Roam (more with `?legacy=1`).

## 3.2.0 phase 0 - Chaos Theory locomotion: speed gears, instant stop, roll (phone + controller + PC)
Proving Grounds (Free Roam), open ground south west of the spawn:
- [ ] Spawn: the operator is in gear 3 (a brisk walk, 2.0 m/s); the HUD shows the SPD pips by the light meter for a
  moment after each change, then they fade. On the phone the rocker's pips always show the gear.
- [ ] Controller: D-pad up / down step one gear each press (1..6, no wrap). Full stick in each gear, standing and
  crouched: six clearly different paces (crouched 0.5 .. 2.8, standing 0.8 .. 5.0 m/s); half stick is about half.
- [ ] Phone: tap the rocker's top half / bottom half: one gear each tap, the pips follow; the move stick at its rim
  gives the gear's pace. The rocker sits right of the move stick's zone and does not get in the thumb's way
  (Default, Claw and Left-handed layouts; the layout editor moves and resizes it).
- [ ] PC: the mouse wheel up / down and = / - step the gear (Settings > Mouse & Keyboard can rebind = / -); Q / X
  swap weapons (the wheel no longer does).
- [ ] Release the stick at any gear: the operator stops dead (no slide, no extra step forward) and holds the exact
  stride he stopped in - no pulling the feet together, no settling step, no kneel when crouched - until you move,
  aim, change stance or take cover. A foot in the air sets straight down. Starting again is immediate. Try it at every
  gear, crouched, out of a sprint, and letting a controller stick snap back: it should hold every time.
- [ ] In cover, strafe along a long wall at gear 1, 3 and 6: a creep, about the old pace, a hurried shuffle. Reversing at speed: no planted
  pivot, straight off the other way. Turning sharply: the body snaps round (720 deg/s).
- [ ] Crouch / stand while moving keeps the gear.
- [ ] Gear 5 or 6 (or sprinting), moving standing: tap crouch (B / C / the crouch button) = a forward roll, ~3 m in
  0.7 s, coming up crouched; a guard 2 m away hears it, one 4 m away does not. Gear 1-4: crouch just crouches.
- [ ] Noise (debug overlay noise meter / guards): crouched gears 1-4 and standing gears 1-2 make no footstep noise;
  standing gear 3 and up do.
- [ ] Controller remap: D-pad right = gadget (hold aims, release throws); D-pad left tap = co-op ping, held = the
  gadget wheel; View tap = goggles, View held = emote 1. Settings > Accessibility > Controls lists it.
- [ ] Guards walk, turn and run exactly as in 3.1 (their tuning is pinned).
- [ ] Cover moves, cover-to-cover runs, ladders, ledges and vaults feel as in 3.1 (the Chaos Theory feel applies only to
  free movement).
- [ ] An existing touch layout keeps every control where it was after the update and gains the rocker.

## 3.2.0 phase 1 - Networked movement state (two devices, co-op Free Roam on Proving Grounds, then Team Deathmatch)
- [ ] Watch the other player take low cover: they kneel behind it at the same height you see on their screen, and
  peek over it when they aim. High cover: standing side-on, leaning out at an edge with the gun on the open side.
- [ ] Ladder, drainpipe, horizontal pipe, ledge hang and shimmy, duct crawl, zipline: hands and feet on the same rungs
  / lip / pipe as on their own screen; no upright sliding. Climbing up and stopping: the same rung.
- [ ] Vaults, mantles, drops, a forward roll, a window vault: played as a move, clean over the obstacle.
- [ ] A takedown by the other player: the strike pose, weapon stowed.
- [ ] Team Deathmatch: shoot an opponent hanging off a lip or leaning out of cover - head hits count as headshots;
  their body in cover is only hittable where it shows.
- [ ] Taking cover / grabbing a ladder shows on the other screen without a visible delay.

## 3.2.0 phase 2 - Split jump, wall jump, pipe legs up / inverted (Proving Grounds, north of the platform)
- [ ] Split corridor (two dark 4.3 m walls): stand between them facing along it - "Split jump"; facing a wall - no
  prompt. Y: a quick spring into the split, feet on both walls, hands braced; the stick does nothing.
- [ ] In the split: LT draws the pistol one-handed and aims; the view stops turning at about 100 deg from the corridor
  and can look almost straight down; RT fires. Release LT: it is put away. B drops to the floor. Y jumps up to the
  wall tops.
- [ ] Wall jump block (3.3 m, grey): facing its south face - "Wall jump", Y kicks up the wall into a hang. Facing the
  tall wall on its west side from the corner - Y kicks off it onto the block's lip. 2 m back: no prompt.
- [ ] Pipe north of the platform: hang, Y "Legs up" (legs cross over the pipe, body along it face up), shimmy slowly
  (about 0.5 m/s); Y "Invert": hanging by the knees, head down, the view upright; LT / RT aim and fire the pistol;
  Y curls up again, B "Hands" back to hanging by the hands; inverted, B: flip over and land on the feet.
- [ ] Co-op: the other player sees each of these poses (split braced and aiming, the kick, legs up, inverted).
- [ ] No pistol in the loadout: the split and inverted hang still work, LT does nothing.

## 3.2.0 phase 3 - Rappel and fences (Proving Grounds, north east / north west)
- [ ] Rappel house: up the ladder on its west side, walk to the south edge facing out - "Rappel"; Y hooks on and steps
  over facing the wall, the rope runs from the anchor to the harness.
- [ ] Stick down: steady descent; with sprint held: fast; stick up: climbs, and at the top steps back onto the roof.
- [ ] Y: kicks out and swings back to the wall; holding the stick sideways moves along the wall with each kick.
- [ ] LT: turns round on the rope and aims the pistol out over the yard; RT fires.
- [ ] Down beside the window: "Kick through" - smashes the glass and lands inside.
- [ ] "Unhook" only shows within 2 m of the floor; B lets go. At the bottom the rope lets you go by itself.
- [ ] Fence (north west of the platform): you cannot walk through it, but bullets and sight pass. Y "Climb", climb and
  shimmy; gear 4+ makes noise (a guard near it hears), gear 3 and below are silent; at the top "Flip over".
- [ ] Co-op: the other player sees the rope and the climbing pose; on a fence the same.

## 3.2.0 phase 4 - Takedowns: drop attack, inverted, the grab / human shield (Warehouse Hunter + co-op + TDM)
- [ ] Behind a calm guard: "Grab"; Y grabs him; walking is slow (gear 2) and he stays in front of you; LT draws the
  pistol over his shoulder, RT fires; Y tap: knocked out, Y hold: killed; B: shoved away, staggering, then alert.
- [ ] Holding a hostage in view of an alerted guard: no shots for about 1.5 s, then aimed shots - mostly into the
  hostage; enough of them kill him and he drops.
- [ ] Hanging under a pipe / at a lip / braced in a split / on the rope above a guard: "Drop attack" - you fall on him.
- [ ] Inverted on a pipe right over a guard: "Takedown" - he is choked up, you stay hanging.
- [ ] A dog from behind is still an instant takedown; a heavy from the front still only a lethal strike.
- [ ] Co-op: the other player grabs a guard - you see him held in front of them; your shots at him do not hurt them.
- [ ] TDM: drop on an opponent from a pipe or lip, or choke one from inverted: they are eliminated; no grab offered.

## 3.2.0 phase 5 - Co-op team moves (two devices, co-op Free Roam on Proving Grounds, the 4.2 m block north)
- [ ] Player 1 backs onto the block's south wall with player 2 near, holds Y: braced (back to the wall, hands cupped);
  B stands up. Without a team-mate near, holding Y does nothing.
- [ ] Player 2 faces the braced player 1: a "Boost (hold: ladder)" prompt over them; tap Y: a step into the hands, a toss, hanging from the
  4.2 m lip on both screens. Player 1 is free again.
- [ ] Player 2 braces, player 1 holds Y facing them: climbs onto the shoulders; free to turn, aim and fire there; Y
  grabs the lip; B instead hops down. The bottom's B drops the top player.
- [ ] TDM: a team-mate can boost you, an opponent cannot (nothing happens).
- [ ] A takedown on offer still wins over the team move (Y takes the guard).

## 3.2.0 - Playtest changes: jump, action button, pipes facing along, higher split (phone + controller)
- [ ] Touch: the Jump button (right of the action button) jumps on open floor; under a pipe / at a lip up to ~3 m / beside
  a drainpipe or ladder the jump grabs it.
- [ ] Controller: Y on open floor jumps; Y at a vault / ladder still does that instead.
- [ ] Between the Proving corridor walls (or the Warehouse corridor's tall walls): the prompt reads "Split jump (double
  jump)"; two quick taps of Jump (or Y) brace in the split, feet about 2.5 m up; the touch action button there jumps
  straight in.
- [ ] Split pose: the legs almost horizontal out to both walls, hands braced on the walls. Jump in facing east, it
  faces east; facing west, it faces west.
- [ ] In the split under a lip (the Proving corridor's 4.3 m wall tops): the Jump prompt shows; Y or Jump jumps up and
  hangs from the lip ahead. With nothing over it, no prompt and Y does nothing. Drop (B), a drop attack on a guard
  under you and the pistol (LT / RT) still work.
- [ ] Hanging from a horizontal pipe: the operator faces along the pipe, hands one ahead of the other; legs up and
  upside down stay along it; holding the stick back turns round.
- [ ] Mezzanine deck: standing under the pipe's start, the action button / Y grabs the pipe (no mantle over the railing).
- [ ] Touch action button: label follows the prompts (Take cover, Vault, Climb, Grab, Rappel, Legs up, Leave cover, Use);
  dimmed when nothing is on offer; tapping the prompts themselves does nothing.
- [ ] At a low wall: standing still the button takes cover; pushing the stick at it, it vaults.
- [ ] Drop from a split, a lip or a box, and walk off a curb: the feet land on the floor (no floating a hand's width
  above it).

## 3.2.0 - Warehouse Chaos Theory routes (Free Roam, then Hunter at night)
- [ ] West yard: the drainpipe on the facade climbs to the roof walkway; footsteps on the roof are louder.
- [ ] On the roof over the dispatch window: "Rappel", down the rope, "Kick through" at the window, inside dispatch.
- [ ] The roof's north edge over the workshop: hang there; with the patrol under you, "Drop attack".
- [ ] Co-op: brace against the pump house (east lot, beside the workshop door); the other player boosts onto it, then
  climbs from its top onto the roof. Alone, nothing reaches its top.
- [ ] Service corridor, where its two walls stand 4 m (no cabinets): "Split jump"; the corridor patrol walks under -
  "Drop attack".
- [ ] Mezzanine deck: the pipe out over the factory floor; hands / legs up / inverted over the floor patrol.
- [ ] The press (factory floor): "Wall jump" up onto it; from the top, a drop on the patrol passing it.
- [ ] Yard fence (east end of the dark lane): climb it at gear 3 (quiet) / gear 4 (rattles), flip over into the east
  lot; guards chasing go round by the facade.
- [ ] Hunter on the Warehouse: every room still clears; Infiltration missions (Ledger, Courier, Blackout, Cold Storage)
  still complete.

## 3.1.1 - Phone GPU (iPhone 17 Pro Max, Settings > Graphics > Benchmark, each preset)
| Build | Low | Medium | High | Ultra |
| --- | --- | --- | --- | --- |
| 3.1.0 (2868 x 1320) | 60 avg / 35 1% low | 19 / 8 | 15 / 7 | 12 / 6 |
| 3.1.1 (1912 x 880) | 76 / 48 | 47 / 15 | 41 / 12 | 21 / 8 |
| 3.1.2 (Feature costs, current settings) | | 57 / 21 | | 22 / 12 |
| 3.1.3 (Feature costs, current settings) | | 53 / 18 | | 21 / 11 |
| 3.1.4 (Feature costs, own match per run) | | 52 / 20 | | crashed |
| 3.1.5 | | | | |
- 3.1.2 Feature costs: Medium shadows Low 62 fps, lamps 8 54; Ultra shadows Low 28, lamps 8 23. Every other run
  (8-20 fps) was the rebuild bug fixed in 3.1.3, not the feature's cost.
- 3.1.3 Feature costs: the same pattern (Ultra shadows Low 25, lamps 8 22, post half 23; every other run 8-20 fps).
- 3.1.4 Medium: without ambient occlusion 70 / 42, textures Low 56 / 40, shadows Low 55, shafts / bloom / lamps 8
  within 2 fps; post effects rebuilt mid-match 49, then shadows rebuilt mid-match 15 (the mid-match slowdown is the
  shadow rebuild). Ultra closed the tab on run 2, High a few runs in (two matches in memory while loading).
- [ ] 3.1.7: Feature costs on the phone at High and Ultra: no crash report; play several matches in a row (quit to
  the menu, play again): no crash, no slowdown building up.
- [ ] 3.4.0 iPhone: a match looks like 2.x (plain level, smooth characters, lamp pools of light, no shadow maps) and
  holds 60 on the FPS overlay for 10 minutes of play; the phone stays warm, not hot. Phone check (~8 min): send the
  note - the hold's first vs last minute, and the 3.3 voxel look run against the light look.
- [ ] 3.4.0 iPhone: Loadout shows the smooth operator; co-op with a PC: both see the same cover and darkness.
- [ ] 3.3.2 iPhone (start cool, out of the case, not charging): Phone check - 30 s cool-downs between runs, the
  last run 3 min held at 60 (first vs last minute).
- [ ] 3.3.1 iPhone: run the Phone check again; each line ends with fps per 2.5 s of the route; the last run (the
  first again) shows how much the phone slowed as it warmed.
- [ ] 3.3.0 iPhone: Settings shows Display (no graphics options); a match holds 60 (FPS overlay) at 75% or more;
  Settings > Display > Phone check runs eight flights and saves one note - send it.
- [ ] 3.3.0 iPhone: lamps look as before (switch a circuit off and on, shoot a lamp, EMP: the light goes and comes
  back at once); characters still cast soft shadows under lamps.
- [ ] 3.2.5 Benchmark: the flight walks through doorways and corridors, up the mezzanine stairs, never through a wall,
  no bobbing up and down, gentle turns, a dead-end room circled.
- [ ] 3.2.4 iPhone (rotation lock off): hold landscape one way, turn upright - the game stays put on the glass; the other
  landscape way, turn upright - the same. With rotation lock on, upright: the game is landscape. Taps and sticks act
  where they look in every case.
- [ ] 3.2.3: Benchmark > Every preset - Low has floors; no run flies through the mezzanine. Turning the phone mid-run
  does not close the tab.
- [ ] 3.2.2 iPhone: Benchmark > Every preset and Feature costs at Ultra finish without a crash report; the tag shows
  "freeing memory" between runs; send the lines (3.2.0: Medium 33, High 29, Ultra 20 fps native).
- [ ] 3.2.1 desktop (7680 x 2160 monitor): Settings > Graphics > Resolution lists 7680 x 2160 (native), 5120 x 1440,
  3840 x 1080; in fullscreen a benchmark line says 5120x1440 after picking it; in a window it says "5120x1440 (window
  ...)". Benchmark > Resolutions runs the three.
- [ ] 3.2 baked lamps (phone and laptop): lamp pools look as before; racks, crates and walls cast shadows under every
  lamp (not just the nearest few); no light through walls or closed racks; a guard / the operator casts a soft
  shadow under each lamp; shooting a lamp or a switch darkens its area at once; an EMP darkens and restores. First
  load of the Warehouse: note the load time (the bake), then again (cached).
- [ ] 3.2 Benchmark > Every preset on the iPhone (Ultra is native 2868x1320 now): send the lines.
- [ ] 3.1.9 desktop Epic (RT reflections on): no bottom-half fog in a match or the benchmark, aiming and not aiming.
- [ ] 3.1.9 phone: Settings > Graphics has no Ambient occlusion / Reflections / Depth of field / Lens / Panini rows and
  an Output resolution choice (Native 2868x1320, the default / 1912x880 / 1434x660); Target frame rate shows 60;
  Ultra shows Resolution scale 100%, Upscaler off. Benchmark > Every preset: send the lines (3.1.8 at 1912x880: Medium
  54, High 36, Ultra 21 fps; the target is Ultra 60 native, after the 3.2 lighting work).
- [ ] 3.1.9 PvP: a wide FOV on one player and a narrow one on another both stay as set in Team Deathmatch.
- [ ] 3.1.9 phone: feedback notes from a heavy match say the display's real rate (120 Hz on the iPhone 17 Pro Max), and
  the benchmark's debug line shows the governor stepping down (`governor L<n>`) when frames miss.
- [ ] 3.1.8 desktop: Epic (and Shadows Epic in Custom) shows the level, no fog-only view; the picture is sharp with
  Adaptive detail off (no hidden resolution drop). Settings > Graphics > Resolution: pick one - it applies at once,
  Keep keeps it, waiting 15 s puts the last one back.
- [ ] 3.1.7 Settings > Feedback > Copy as text: each note has a second line with its context (settings, device,
  GPU, frames).
- [ ] 3.1.7 desktop Ultra was all grey (fog) except the lamps in every benchmark run (custom settings fine): at Ultra,
  does a normal match (Play > Deploy) look right? With Settings > Graphics > Upscaler off?
- [ ] 3.1.6 forced landscape (iPhone, rotation lock on, held upright): the game shows turned; hold the phone turned
  left and play a match - menus tap where they look, sticks / camera / fire go the right way, nothing hides under
  the Dynamic Island or the home bar; unlock rotation and turn the phone: the normal landscape takes over.
- [ ] 3.1.5: Feature costs on Ultra, High and Medium: no crash; the tag at the top names each run; Settings >
  Feedback has the note after every run. If it still crashes: the next start shows a toast and a "Crash report" note
  naming the run - send it with the benchmark note.
- [ ] (was 3.1.4) Settings > Graphics > Preset Ultra, then Benchmark > Feature costs (each run loads the map: ~4 min);
  again on Medium. Copy text and send the lines: no run without a feature may come out slower than "current
  settings"; the last two lines ("post effects rebuilt mid-match", "then shadows rebuilt mid-match") are the
  diagnosis of the mid-match slowdown.
- [ ] Mid-match (pause > Settings > Graphics): turn Ambient occlusion off and on, then Bloom: the frame rate stays
  where it was (3.1.2 dropped ~4x until Shadows were changed).
- [ ] Fog and light shafts look as before (Medium, Fog weather); no shimmer on the shafts when the camera moves.
- [ ] Settings > Graphics > Shadows changed in a paused match: shadows switch, nothing goes black or flickers.
- [ ] Display rate: Settings > Graphics > Target frame rate shows "Display refresh (N Hz)". Every iPhone browser
  (Chrome too) runs on WebKit; if it reads 60, turn off Settings > Apps > Safari > Advanced > Feature Flags >
  "Prefer Page Rendering Updates near 60fps", close the browser fully, check again; then try Safari and the Home
  Screen app. Still 60 everywhere: the phone target is a steady 60 at Ultra (the governor aims at the display rate).

## 3.1 phases 2-3 - Auto graphics and adaptive detail (PC + phone)
- [ ] Fresh install on the laptop: Settings > Graphics shows Auto with "this device: Epic (from the GPU)" (RTX 4090).
- [ ] Fresh install on the iPhone: a toast "Graphics: <preset> for this device" a few seconds after the menu shows;
  reopening the app does not measure again. Detect again measures (toast) and keeps Auto.
- [ ] Picking a preset by hand turns Auto off; picking Auto again goes back to the device's preset.
- [ ] A match at Ultra on the phone for 10 minutes (`?debug=1`): the governor line stays at L0-L3 most of the time,
  the frame pacing graph holds the budget; nothing visibly pops (resolution changes are soft).
- [ ] Low Power Mode on the iPhone: a toast "Low Power Mode: the game runs at 30 fps"; the match holds 30.
- [ ] Target frame rate 60 on the laptop: the governor holds 60 at a higher level of detail than at 240.
- [ ] PvP on Low (phone) and Epic (laptop): the same lamps lit and the same shadows on the same spots (screenshots
  side by side from the same position).
- [ ] `node scripts/perf.mjs --preset=ultra --mobile --budget` and `--preset=low --mobile --budget` pass (draws;
  the animation number is noisy on the VM - compare side by side with the previous build).
- [ ] Shadows below Epic (proxy): walls, racks and crates cast the same shapes under the lamps and the moon as on
  Epic (screenshots side by side); no shadow from a wall that is not there.
- [ ] Low: guards in the yard have contact shadows, no moon shadows; Ultra: guards in the yard cast moon shadows,
  indoors only lamp shadows.
- [ ] Fog at Medium / High / Ultra looks like before (depth from the G-buffer); aiming with depth of field still
  focuses on the target.

## 3.1 phase 1 - Preset ladder and fair PvP (PC + phone)
- [ ] Settings > Graphics > Preset cycles Low, Medium, High, Ultra, Epic, Custom on PC; a phone shows no Epic and no
  Ray traced reflections option. Picking a preset sets the render scale (Low 67% .. Ultra 90% with TAAU, Epic 100%).
- [ ] A 3.0 install keeps its preset after the update (named the same, the new values) or its Custom choices.
- [ ] Each preset on the Warehouse at night: fog looks the same distance-wise on Low and Epic; Volumetric light off
  removes only the light shafts.
- [ ] Walk 40 m away from the service corridor and the offices: no wall, door or sign flickers see-through.
- [ ] PvP on an ultrawide (or a 21:9 window) and a phone: the FOV slider at 120 still shows 90 in the match, and the
  ultrawide sees no more of the sides than 16:9 (black-free, narrower vertically). Panini set to 0.5 is off in PvP
  and back in other modes.
- [ ] Settings > Graphics > Benchmark > Every preset: five lines on PC (Low .. Epic), four on a phone.

## 3.0.0 - PC renderer, desktop interface, feedback (PC + phone)
Warehouse focus:
- [ ] Play lists every mode on the Warehouse (Training on Proving Grounds); Free Roam on the Warehouse has no guards
      and every weapon; Infiltration shows four Warehouse missions only (Cold Storage, Ledger, Courier, Blackout) and
      each can be finished; co-op and PvP lobbies offer the Warehouse.
Voxels (Epic, the laptop):
- [ ] Warehouse and Proving Grounds load as voxels (first load: note the time; second load quicker - cached); walls,
      floors, racks and crates show voxel tones, soft occlusion in corners and lighter worn edges up close; far
      rooms switch to coarser voxels without visible popping or cracks.
- [ ] Cover, vaults, ladders, ledges and doors behave exactly as before (hands on the cover surface, feet on floors).
- [ ] Shadows from lamps / flashlights / the moon fall on and from the voxels; reflections pick them up.
Warehouse art and weather (Epic):
- [ ] Walls read as block walls / cladding / concrete, floors as slabs with joints and stains, crates as planks,
      racks as wrapped loads in bays; props crisper than walls (2.5 cm); no stray holes where you take cover.
- [ ] Under the roof it is darker than the yard (but for the lamps); the skylight strips let a little in.
- [ ] Rain: none inside except under the skylights; the yard and puddles go glossy; Fog: thick with light shafts
      under the skylights; Clear unchanged. Co-op: the host's weather choice reaches the client.
Voxel characters (Epic):
- [ ] The operator (menu and in a match), guards, bodies and co-op players are voxel figures; joints never open gaps
      while running, climbing, in cover or as a ragdoll; goggles glow with night vision; the head disappears when the
      camera gets close; hits flash; Stick style (Settings) still shows the stick figures.
Voxel weapons and chips (Epic):
- [ ] Weapons in the hands, on the back / hip / thigh and in the Loadout preview are voxel models (sights, triggers
      visible up close); camo shows on them; thrown grenades and the drone are voxels.
- [ ] Shooting a wall, floor or crate leaves a dark one-voxel pock and throws debris in its colour; cover and
      movement are unchanged.
GI (Epic):
- [ ] Rooms with lamps on have soft bounce light on the walls / ceiling beside the pools; a room switched off goes
      fully dark (no glow left); a shot-out lamp and an EMP do the same for their share; Ultra / High have none.
Reflections, TAAU, Panini (Epic, the laptop):
- [ ] Reflections: Off / Screen space / Ray traced; Ray traced in the rain: puddles mirror walls, lamps and guards
      even off screen; steel and wet floors gloss; half rate vs full: note the frame rate (debug overlay).
- [ ] Upscaler TAAU at 67% on 7680 x 2160 (or the built-in screen): sharp, no ghosting on the operator when turning;
      Off at 67% looks softer.
- [ ] Panini 50% at FOV 120 on 32:9: sides less stretched; prompts near the edges still usable.
Displays (gaming laptop: RTX 4090 Laptop, 16 GB; built-in 2560 x 1600 240 Hz; external ultrawide):
- [ ] The browser runs on the NVIDIA GPU (Settings > Graphics > GPU); switch it to the integrated GPU once: the
      notice appears once with the Windows steps.
- [ ] 21:9 and 32:9 (7680 x 2160): menus a centred 16:9, the stage around them; in a match the view widens up to the
      widest FOV, then stops (no fisheye); HUD width Auto keeps the HUD in a centred 16:9 on 32:9; 16:9 / 21:9 / Full
      change it; world prompts, arcs and markers still sit on what they point at.
- [ ] Frame-rate cap reads "Display refresh (240 Hz)" on the panel; 120 / 144 / 165 / 240 caps hold (debug overlay).
- [ ] Photo mode on the ultrawide: the saved photo is full width (7680 px).
- [ ] Benchmark: current settings, Every preset, Resolutions, Sustained (10 min, plugged in): note the lines (also
      saved as feedback) and report them back.
Performance targets (RTX 4090 Laptop 16 GB, i9 HX, mains power; Settings > Graphics > Benchmark; fill in the measured
average / 1% low and the GPU memory from the browser's task manager):

| Output | Epic (SSR) | Epic + Ray traced | High | Measured |
| --- | --- | --- | --- | --- |
| 1920 x 1200 | 165 | 120 | 240 | |
| 2560 x 1600 (built-in, 240 Hz) | 120 | 90 | 165 | |
| 3440 x 1440 | 100 | 75 | - | |
| 5120 x 1440 | 90 | 60 | - | |
| 3840 x 2160 | 60 | 50 | - | |
| 7680 x 2160 (TAAU 67%) | 60 | 45 | 120 | |

Budgets: CPU main thread <= 3 ms per frame; <= 8 M triangles and <= 600 draw calls including shadows; GPU memory
<= 12 GB at Epic (High 6, Ultra 9; brick pool <= 5 GB; render targets <= 2.5 GB at 4K, 3.5 GB at 7680 x 2160); tab
<= 6 GB, JS heap <= 1.5 GB; the voxel cache in IndexedDB <= 2 GB; Warehouse load <= 4 s cold, <= 1.5 s cached.
Desktop (mouse and keyboard, 1440p or 4K):
- [ ] Menus fill the screen at a readable size (scaled from a 1280 x 720 layout); no Touch settings, no touch
      buttons in a match, no rotate overlay; hover highlights; Settings opens on Mouse & Keyboard.
- [ ] Mouse & Keyboard: sensitivity, aim sensitivity, invert, raw input; rebind a key (click, press), a key already
      used moves over (toast), Backspace clears, Esc cancels; Mouse 4 / 5 can be bound; in-game prompts show the new
      keys; Settings > Accessibility > Controls lists them.
- [ ] Graphics: Epic by default; High / Ultra / Epic change the look live; changing any feature shows Custom;
      resolution scale above 100% sharpens; the frame-rate cap holds (debug overlay); FOV to 120.
- [ ] Note the FPS (Show FPS overlay) on the Warehouse at Epic: report back average / worst.
- [ ] Lamps light the rooms, the nearest lamps and every guard flashlight cast shadows (walls stop them), the
      moon casts soft shadows in the yard, beams show in the haze, aiming blurs the background.
- [ ] Touchscreen laptop: touching the screen brings the touch controls back; the mouse hides them.
Phone:
- [ ] The same Epic renderer boots and plays (slower is expected); Graphics > High is playable.
Feedback (both):
- [ ] Pause > Report feedback: type a note, Add photo: the game freezes, no HUD; fly the camera (WASD / sticks /
      drag), take a photo, retake, keep; add a second; Save. Settings > Feedback lists it after a restart.
- [ ] Export report: one HTML file with the list and every photo (share sheet on the phone); Copy as text.

## Phase 10 - Release checklist

### Offline and install
- [ ] First visit online; wait for the "Ready to play offline" toast. Airplane mode, fully close the tab/app, reopen: boots, menus work, a Wave match and Proving Grounds play normally.
- [ ] Installed (Home Screen) app in airplane mode: same as above; Co-op shows the offline notice and nothing else is blocked.
- [ ] Deploy a new version while the app is closed; next online launch picks it up (auto-update), progress intact.
- [ ] Switch to another app mid-match: on return the match is paused, music/sound are silent while away, progress was saved.

### Save migration
- [ ] Settings > Data > Import an exported file from an older build (v1-v3): level, credits, unlocks, upgrades, look and loadout carry over; renamed avatar parts map to their new equivalents.
- [ ] A save from a newer build opened in an older build: Settings > Data explains it was left untouched; playing does not overwrite it.
- [ ] Private browsing / storage blocked: game still plays; Data tab warns that progress will not be kept.

### Controller (Xbox and PlayStation layouts; MFi on iOS)
Connect, hot-plug and prompts:
- [ ] iOS: controller is detected after its first button press; Android/desktop: on connect. "Controller connected" toast; touch controls hide; prompts switch to the pad's glyphs (Xbox letters / PlayStation shapes).
- [ ] Unplug or switch off mid-match: "Controller disconnected" toast, touch controls return, no stuck movement or firing. Reconnect: works again without reloading.
- [ ] Touching the screen switches back to touch mode; pressing a pad button switches to pad mode.

Menus (every screen must be fully usable without touching the screen):
- [ ] Main menu: d-pad / left stick moves the focus ring, A selects, wraps top/bottom.
- [ ] B goes back from every sub-screen; Start/B closes the pause menu; dialogs: A confirms, B cancels.
- [ ] LB / RB switch tabs (Settings, Armory, Store, Customise).
- [ ] Sliders and choices change with left/right; toggles with A.
- [ ] Customise: right stick rotates the preview; locked items show the lock note and the Unlock button is reachable.
- [ ] Layout editor: select a control with A, move it with the stick, A to drop.
- [ ] Co-op: Host / Join; code keypad typing with d-pad + A, Del and Join reachable; lobby Ready / Start / Share / Leave.
- [ ] Results screen: A = Play again, B = Main menu.

Gameplay mapping:
- [ ] LS move, RS look (sensitivity, curve, invert-Y and dead zones from Settings > Controller apply).
- [ ] RT fire (analog threshold), LT aim (hold or toggle per setting); aim assist slows near targets on Standard/High, off when disabled.
- [ ] RB / LB next / previous weapon (RB marks while aiming); X reload (hold: next weapon); A take / leave cover and
      cover-to-cover; B crouch; Y traverse / use / takedown (hold: lethal) / Execute when ready.
- [ ] L3 sprint; R3 shoulder swap; View tap goggles (night vision on / off), View held emote.
- [ ] D-pad up / down speed gear; D-pad right gadget (hold aims, release throws); D-pad left tap ping (co-op), held
      gadget wheel.
- [ ] In cover: A leaves (or to the marked cover), Y vaults low cover, LT peeks / leans, RT blind-fires, A at an
      outside edge swings round the corner, pushing into an inside corner turns.
- [ ] Start pauses (single player) / opens the menu without pausing (co-op).
- [ ] Haptics: firing, hits, explosions and damage rumble (if the controller supports it); off when Haptics is disabled.

### Final pass
- [ ] 2.0: Play > Training to the end on a phone; a Hunter run on the Warehouse at night, ghosted; an
      Infiltration mission per insertion; four phones in co-op Hunter; eight in Team Deathmatch (or as many as
      available) through to the result; the 10-minute soak (`scripts/soak.mjs`, debug overlay) on the Warehouse
      and the Embassy.
- [ ] Full Wave run to wave 5+ and a Mission win on a mid-range phone: no hitches, frame time stable (debug overlay), no audio crackle.
- [ ] Two phones co-op through a full wave, then Play again, then host leaves.
