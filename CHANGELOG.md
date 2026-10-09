# Changelog

## 3.6.x - First Playable (in progress)
- S1a: the Kestrel Exchange greybox is a listed map (`?autostart=exchange&mode=sandbox`): cable tunnel and chamber, ground floor shell, basement stair, main stair to a first-floor landing. No lights, guards or objective yet (S1b, S1c).

## 3.5.0 - Chaos Theory foundation
- Direction: the game is now **Night Shift**, an original stealth game in the spirit of Splinter Cell: Chaos Theory
  (`docs/design-bible.md` v1.7, story in `docs/story.md`). This release changes no gameplay and no feel.
- Integration: `ct-movement` now carries `master` 3.4.0 (the light phone renderer, baked lamps, the Phone check) with the
  Chaos Theory movement (3.2.0-ct) and the Warehouse CT routes. The Kestrel Exchange is a paper design only (map phases
  0-2, `docs/prompts/exchange-design.md`; paused until roadmap Phase 3b); the old Exchange blockout is gone. The split
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
  Kestrel Exchange spec (`docs/prompts/exchange-map.md`).

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
