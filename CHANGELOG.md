# Changelog

## 2.1.0 - Co-op depth, multi-level AI, three new maps
- Co-op: bodies stay down on every screen (and vanish for everyone when hidden, carried or revived); team pings
  (D-pad left / Z / the touch Ping button: marks the spot or the guard under the crosshair, in your colour, with
  an edge arrow when off screen); clients use Mark & Execute (a takedown earns the charge, checked by the host);
  clients' gas, flashbangs, EMPs and noisemakers act on the host's guards and show for everyone; two takedowns
  within 1.5 s are a Dual Takedown.
- Multi-level AI: the nav grid keeps every storey (a floor, the storey over it, a roof); guards use stairs,
  climb ladders up and down (in a climbing pose) and drop off low ledges to reach you or the last place they saw
  you - rack tops and roofs are no longer safe spots. Dogs wait at the foot of a ladder.
- New maps, each in Hunter, Wave, Infiltration (a mission each), Team Deathmatch and Free-for-all:
  - Mansion (night): a walled estate and a two-storey house - grand staircase, balcony, gallery, the vault office
    upstairs (a roof duct drops into it), garage, pool house. Mission "Private Collection".
  - Port (night): container stacks with ladders, a customs shed with a mezzanine office, a moored cargo ship (gangway,
    deck, bridge with a lookout, bosun's store), the pier. Mission "Dead Reckoning".
  - Refinery (dusk): tank tops joined by catwalks, a pipe-rack walkway, process units under a burning flare, a
    two-storey control building, a loading bay. Mission "Flashpoint".

## 2.0.1 - Feedback: menus, back buttons, calmer guards, fair PvP
- Main menu: a compact two-column grid (Play across the top) that fits a landscape phone; every menu that
  overflows scrolls by touch (drags inside any scrolling list are no longer swallowed as game gestures).
- Back button: larger (54 px with a wider hit area), top left beside the title (the profile badge used to cover
  it on several screens), acts on release so a thumb that drifts still counts, shows a pressed state.
- Guards (more chances to stay unseen and take them down): they linger longer at patrol points (5.5 s) and glance
  round rarely and slowly (every 10 s, narrower); calm guards turn at 60 deg/s instead of snapping round; distant
  footsteps no longer make them suspicious (only nearer ones do, investigations only close in) and every
  footstep is quieter (walk 2.8 m, crouch walk 2 m, sneak 0.5 m); they take longer before walking over to a sound;
  sneaking or crouch-walking up behind a guard is no longer felt (walking still is, within 1.8 m); takedowns
  reach 1.8 m and count as "behind" over a wider arc.
- PvP (Team Deathmatch, Free-for-all): no damage bonuses - weapons at base damage (no damage upgrades or damage
  mods; handling attachments stay), no suit armour or HQ perks; the host caps hits at base damage.

## 2.0.0 - Shoulder Strike 2.0: the Blacklist overhaul (release candidate)
The 1.7.0 - 1.23.0 phases together; details under each version below.
- A stealth operative: light and shadow, noise, alert states with a last known position and searches, bodies to
  find, carry and hide, switches and shootable lamps, alarms, doors, night vision and sonar (1.12 - 1.15).
- Traversal: ladders, drainpipes, ledges with shimmy / corners / jumps, pipes, ducts with vents, windows,
  ziplines, landings and rolls, on every map (1.8 - 1.11).
- Takedowns from every angle (behind, front, over cover, from above, below, through windows) and Mark & Execute
  (1.16); eight gadgets on a wheel (1.17).
- Enemies: guards, runners, heavies, snipers, shield enforcers, dogs, drone operators, officers; barks and radio;
  Rookie to Perfectionist (1.18).
- Modes: Hunter (an alarm doubles the hostiles), Infiltration (four missions on the new Embassy and the
  Warehouse), play styles Ghost / Panther / Assault (1.19); Training (1.23).
- Arsenal of 16 with visible attachments, the suit, HQ upgrades, challenges, presets, play-style cash (1.20).
- Co-op for 2-4 in every mode (objectives, doors, takedowns and revives synced) and PvP: Team Deathmatch 4v4 and
  Free-for-all for 8 (1.21).
- The operator look (tri-lens goggles), enemy silhouettes and faction colours, light cones, contact shadows,
  per-map grades (1.22); the Blacklist-minimal HUD, touch layout v3, accessibility options and a controls screen
  (1.23).
- Saves: v6 (every older version migrates, a backup kept); settings move to the operator and touch layout v3 once.
- Fixes in the release candidate: the hip-sling gun hangs 3.5 cm outside the thigh (the detailed body's hip and
  cargo pocket swung into a P90 in a side-step); the weapon port and rail details sit flush in the receiver; the
  operator's thigh panel only without cargo trousers.
- Release checks: full e2e (27 suites) green; 10-minute soaks on the Warehouse, the Embassy and the Dust Depot;
  perf on the heaviest scenes (see TESTING.md); offline: every precache entry, an Infiltration mission offline.
- Known gaps (not in 2.0): the Port / Mansion / Refinery maps of the plan, multi-level AI navigation, co-op
  bodies / Mark & Execute / non-frag gadgets by clients, pings and dual takedowns, a four-footed planner for the
  dog (it trots procedurally).

## 1.23.0 - 2.0 phase 11: Blacklist-minimal HUD, touch layout v3, accessibility, controls screen, training course
- HUD: health is the screen-edge vignette (it reddens with damage; the bars are an option); the ammo and gadget
  readout shows on any change, a reload or a low magazine and fades after 3 s (option: always); the use prompt
  has a hold ring that fills while held; the compass objective marker and awareness arcs as before.
- Touch layout v3 (`TOUCH_LAYOUT_VERSION` 3): a Takedown button that appears only while a takedown is on offer
  (tap knocks out, hold is lethal), alongside Mark (while aiming) and Execute (when ready); v2 layouts keep every
  placement, the new button takes its default spot.
- Settings > Accessibility: Controls (every binding for controller, keyboard and mouse, touch), HUD size,
  health bar, always-on ammo, colour-blind-safe awareness colours (blue filling, orange when alerted),
  subtitles for barks and radio (on by default), held actions by tap (downloads, alarm panels, revives, plants
  start on a tap and keep going), camera shake strength. Aim assist tiers stay per input (off / low / standard /
  high); aim, crouch and sprint have hold / toggle as before.
- Training (Play > Training, Proving Grounds): ten steps, one verb each - move, sneak, cover, vault, ladder,
  goggles, a takedown on a passive guard, marking two more, Execute, a gadget - with a marker on the target and the
  input for the device in use; the operator cannot be hurt; a step not done in 90 s is skipped; a small reward
  on completion.
- Tests: `tests/training.test.ts`, touch v3 migration and accessibility clamps in `tests/ui.test.ts`;
  `scripts/e2e-training.mjs` plays the whole course by touch (the Takedown, Mark and Execute buttons, HUD
  defaults); e2e-pad reaches Accessibility and the Controls screen by pad. e2e-lib ignores SwiftShader's own
  performance notes; e2e-move samples traversal kinds every frame; e2e-coop retries a revive under load.

## 1.22.0 - 2.0 phase 9: the operator, enemy silhouettes and factions, light cones, contact shadows, colour grade
- The operator is the new default look: a fitted suit with a plate carrier, magazine pouches, shoulder straps,
  belt with a radio pouch, elbow and knee pads, gloves, thigh panels, and a balaclava with the tri-lens goggle
  (two lenses at the eyes, one above); the lenses glow green while night vision or sonar is on. Built on the
  detailed body, which is now the default avatar style (settings from before move to it once; Settings > Video >
  Avatar style keeps Stick). Customiser: "Operator suit" and "Tri-lens goggles" (starters), "Sniper hood" (level 7).
  With the operator, suit tiers keep the suit (heavy armour adds leg plates) and the tri-lens.
- Enemy silhouettes per archetype: the guard in a cap, the heavy in a visored helmet with plates and tanks, the
  sniper in a hood, the enforcer with his shield, the officer in jacket and beret, the drone operator with a
  headset, the dog as a dog. Faction colourways per map (`MapTheme.faction`, `ai/factions.ts`): urban
  (Warehouse), desert (Dust Depot), maritime (Embassy).
- Weapons: an ejection port on every long gun and a top rail under the optic.
- Lighting: every fixed light casts a faint additive cone (one thin-instanced mesh, fading to the floor, out
  with the light; hidden at the lowest quality); soft contact shadows under every character (`vfx/blobShadows`,
  one draw call); a colour grade per map in the cinematic pass (`MapTheme.grade`: tint, saturation, contrast):
  cold night at the Warehouse, warm dusk at the Depot, steel blue at the Embassy.
- Tests: suit-look unit test for the operator; e2e-cosmetics, e2e-weapons-carry and e2e-clip with the operator
  as the default style.

## 1.21.0 - 2.0 phase 10: four-player co-op in every mode, PvP (Team Deathmatch 4v4, Free-for-all 8)
- Co-op (2-4) now runs Wave, Hunter, Infiltration (any mission; the lobby picks it) and Free Roam. The host runs
  the match; clients see the host's enemies with their alert state (the dog as a dog), use objectives, switches,
  alarm panels and doors through mirrored interactables (`use`, reach checked by the host), see the host's doors
  open and close (door states are synced; doorways no longer stand open for clients), take guards down (the
  takedown seizes the host's enemy, `td`; tap = knock-out, hold = lethal) and are heard (footsteps by speed and
  stance, shots by weapon; suppressed = suspicion only).
- Downed in co-op: a team-mate holds the revive point on the body (2.5 s; HQ medic training makes it faster);
  everyone down hands over to the mode (Hunter / Infiltration lives at the checkpoint, Wave ends). Infiltration
  downloads and the extraction count any operator standing there; the rescued asset follows the nearest.
- PvP: Team Deathmatch (4v4, first to 30) and Free-for-all (up to 8, first to 15), 8 minutes, on the Warehouse,
  Dust Depot and Embassy. Teams balance on join; "Join Blue / Red" in the lobby. Client hits on players are
  rewound to what the shooter saw and checked like enemy hits; the host's own shots resolve through hit volumes
  on opponents; no friendly fire; respawn after 4 s at the spawn furthest from opponents, 2 s of protection.
  HUD: team scores in team colours (or You / Lead) and the clock; kill feed "A > B"; team-mates carry a marker.
  Results: eliminations, deaths, headshots; rewards pay eliminations and the result.
- Lobby: capacity per mode (co-op 4, PvP 8; start is blocked with too many players), mission choice for
  Infiltration, team colours. Protocol v2 (`team`, `use`, `td`; snapshot `items`, `doors`, `score`, `tl`, enemy
  `al`; events `frag`, `tdDenied`; end `winner`).
- Not synced yet (noted): bodies (clients see a ragdoll, not a body to carry), Mark & Execute by clients, gadgets
  thrown by clients other than frags (the host re-detonates frags only), alarm panels held by clients finish on
  the client's hold.
- Tests: `tests/pvp.test.ts` (teams, scoring, spawns, HUD line, rewards, new messages and caps, 8-player lobby,
  team switch, mission in the start); e2e-coop adds Hunter (calm puppets, door sync, a door used by the client, a
  client takedown, the client reviving the host), Infiltration (mission map and objectives on the client) and a
  third player for Team Deathmatch (teams, hit volumes only on opponents, no friendly fire, a validated
  elimination, respawn, results on every page) and Free-for-all. e2e-combat selects the frag before the d-pad
  throw (the preset may pick another gadget).

## 1.20.0 - 2.0 phase 8: arsenal, attachments, suit, HQ, economy
- Arsenal of 16 (`config/weapons.json`, procedural models by role at real sizes): pistols - P45 Compact (the old
  P9), FN Five-7, 9mm SD (integral suppressor); SMGs - MP5 Kurz (the old V-12), Vector .45, P-90 (bullpup, top
  magazine); rifles - 552 Commando (the old AR-7), AK-74, TAR-21 (bullpup); shotguns - M870 Pump (the old M4),
  M1014 Semi, Breacher; marksman - M14 DMR (scoped), M700 Bolt (the old LR-50); the Silent Crossbow (sleep bolts
  knock out; Lethal Bolts in its magazine slot kill; near silent); the M249 SAW (100-round box, bipod). The 1.x
  weapons keep their ids, so unlocks, upgrades and kills carry over. New unlocks from level 2 to 12.
- Attachments are visible (`withAttachments`, pure): red dot / 4x scope on top, suppressor or compensator on the
  muzzle (the muzzle moves out), vertical grip / laser under the front, a longer or a taped double magazine, red
  broadheads; carry placement and clip checks use the attached model.
- Handling: a slow breathing sway through magnifying scopes (steadier crouched and still); a suppressor hides most
  of the muzzle flash; rounds go through thin world geometry (doors, glazing, thin partitions: pistols 8 cm, SMGs
  10, rifles 20, the LMG 25, DMR / bolt 32) with half the damage after; brass ejects (pooled) as before.
- The suit (HQ > Suit): vest (no armour .. heavy: -45 % damage for +45 % footstep noise), gloves (swaps and
  takedowns up to 22 % faster), boots (footstep noise down to 60 %), goggles (sonar range +25 / +50 %, faster
  recharge), pouches (+1 / +2 of each gadget); tiers bought in order by level and credits, any owned tier worn;
  the look follows (vest / plate carrier, headset goggles, a rig on the back, dark boots).
- HQ upgrades: minimap radar (enemies within 15 / 25 m in Hunter and Infiltration), sonar amplifier (+20 % per
  level), execute capacity (+1 mark), supply drops (gadgets restocked at checkpoints), field medic training
  (co-op revives faster; used from phase 10).
- Economy: Hunter and Infiltration pay Ghost / Panther / Assault cash and XP from the play-style points (x the
  difficulty); challenges ("10 takedowns from above", "Knock out 25", "50 headshots", "Mark & Execute 15",
  "3 missions undetected", "Hunter without an alarm", "20 gadget knock-outs") pay once on completion.
- Loadout presets: three (Ghost / Panther / Assault to start) with weapons and the starting gadget; saved and
  used in HQ > Loadouts, picked on the Play screen (Loadout row). Co-op partners see the loadout in the lobby
  as before.
- Save v6 (`suit`, `hq`, `challenges`, `presets`, `preset`; migration from v5 issues the basic kit).
- Plan notes: the attachment slots stay optic / barrel (suppressor or muzzle device) / underbarrel / magazine; the
  crossbow is a compact pistol-grip one (16 cm limbs) so it carries on the back with other long guns.
- Tests: `tests/economy.test.ts` (arsenal, attachments model, suit, HQ, challenges, style cash, profile ops, save
  v5 -> v6); carry dimensions for all 16; e2e-weapons-carry runs every weapon (three more loadouts, `?loadout=`);
  e2e-progression buys a suit tier, an HQ upgrade and a suppressed AK and checks them in the match and after a
  reload.

## 1.19.0 - 2.0 phase 7: Hunter, Infiltration missions, the Embassy
- Hunter: Clear is renamed Hunter in the Play menu (`?mode=hunter`; `?mode=clear` still works). Start undetected,
  clear every hostile. If an enemy raises the alarm the hostiles double (Blacklist's rule): as many again come in
  from the entry point furthest from you, hunting (alerted, not holding rooms). Results show "Detected" and the
  Ghost / Panther / Assault bars.
- Play styles (`game/playstyle.ts`, pure): knock-outs, non-lethal takedowns, unseen objectives and hidden bodies
  score Ghost; unseen kills, lethal takedowns and Mark & Execute score Panther; anything done while detected,
  alarms and explosions score Assault. Detection = an enemy going to combat on you (stealth rules).
- Infiltration (`game/missions.ts` pure + `config/missions.json`, validated; `game/modes/infiltrationMode.ts`):
  objective chains per map - download (start it at the terminal; it uploads while you stay within 9 m, pauses
  when you leave, and every 10 s the traffic is noticed: a noise pulse guards come to check), plant / hack and
  sabotage (holds; the charge goes off as you leave), rescue (free the asset - a hostage on his knees - who then
  follows you, crouching with you, round walls by A*), intel (three items, any order) and extraction (a zone; with
  the asset). Mission rules: no alarms / no kills / undetected as a bonus or a fail condition ("Ghost
  contract"). 1-3 insertion points per mission. Extraction is a stinger (slow beat, letterbox, banner); results
  show a 0-3 star rating and the bonuses kept. Four missions: Diplomatic Pouch, Asset Recovery and Blackout (Ghost
  contract) on the Embassy, Cold Storage on the Warehouse.
- Mission board: the Play menu's Infiltration mode lists the missions with their best rating, play-style split
  and wins, the insertion choice and the difficulty. Saves keep the best run per mission (save v5: `missions`;
  migration from v4).
- The Embassy (night): a walled compound - front court (fountain, hedges, cars, gatehouse, a gate tower with a
  sniper), west garden, service yard and garage - and a residence (lobby, security office, server room,
  reception, the ambassador's office, corridor, conference room, staff room, archive) under a walkable roof:
  roof ducts drop into the server room and the ambassador's office, drainpipes and a ladder go up, a pipe runs
  along the east facade, ziplines run from the roof to the court and the garage roof, windows (glazed and open)
  and doors. 25 placed anchors and ~100 hangable lips; light pools and dark gardens; switches, alarms, hide spots.
  Hunter and Wave work there too.
- Autostart: `?autostart=<map>&mode=infiltration&mission=<id>&insertion=<id>`. Perf: `MAP=embassy node scripts/perf.mjs`.
- Plan gaps (kept for later, noted for the summary): Port, Mansion and Refinery are not built; multi-level nav
  (enemies on roofs by ladder links) is not done - enemies stay on the ground / ramped decks; Dust Depot is not
  rebuilt for verticality. The route check counts the ground plus anchors within 14 m above / through each site.
- Tests: `tests/missions.test.ts` (validation, chain, download pauses, rules, rating, play styles); save v4 -> v5;
  `e2e-missions` (Hunter doubling; download + intel + extract with results; plant + rescue (the asset follows) +
  extract; sabotage + extract; Ghost contract fails on detection; three downs fail; routes and 25+ anchors per
  mission map); e2e-anchors covers the Embassy; e2e-clear reads the Hunter / Infiltration menu entries.

## 1.18.0 - 2.0 phase 6: enemy archetypes, squads, difficulty
- Archetypes (`ai/archetypes.ts`, pure rules; `config/enemies.json`): Guard (the grunt renamed; rifle, flashlight at
  night), Heavy (plates in front x0.45, the back x1.5, the face plate x2.2; from the front only a lethal takedown),
  Sniper (laser while it aims, a scope glint when it points at you - it cannot be marked through the glint;
  relocates to a new post 5-22 m away after 2 shots or 9 s), Enforcer (a shield stops rounds from within 70 deg of
  the front; no frontal grab; walks into the fire at 1.1 m/s with a pistol - flank him), Dog (a procedural
  quadruped on the shared brain: heels beside its handler, smells you within 6 m (4.2 m crouched) whatever the
  light or walls, runs you down and bites; a takedown or gas puts it down), Drone operator (flies a recon drone
  that orbits him at 3.4 m; its camera needs no light; what it sees goes to him - suspicion, then an alert and
  the squad radio; shoot it down or EMP it; it falls when he goes down), Officer (squadmates within 12 m aim x1.25
  better and react faster; runs the alarm himself first; calls the search).
- Squads: Clear mode puts each room's squad on a roster; every ~40 s a calm member radios a check, and a silent
  (downed) member is missed: the caller goes to look where he was. Warehouse squads now include a dog with the
  dock guard, a drone operator in dispatch, an enforcer in the workshop, a sniper on the mezzanine and an officer
  in the office. Waves add enforcers (wave 4+), dogs (5+), a sniper (6+), an officer (7+), a drone operator (8+).
- Callouts (`ai/barks.ts`): short lines over the speaker's head ("Huh?", "Checking it out.", "Contact!", "Lost
  him!", "Man down!", "Radio check.", "No answer...", "*growl*"...), per-speaker cooldowns (urgent lines cut in),
  radio lines with a synthesized chirp; no voice audio.
- Difficulty tiers: Rookie, Normal, Realistic, Perfectionist (perception, damage, accuracy, hit points, reaction
  and rewards scale; Perfectionist has no Mark & Execute and no sonar). Old lobbies' easy / hard read as Rookie /
  Realistic. `?difficulty=` for autostart.
- Gadgets: keyboard 1-8 pick a gadget directly (the plan's "1-5 plus G"); emotes move to J / K / L.
- Blacklist differences: the dog's body is procedural primitives on the humanoid brain (no dog ragdoll: it lies on
  its side); the recon drone orbits its operator rather than flying patrol routes; co-op clients show the new
  kinds from phase 10.
- Tests: `tests/archetypes.test.ts` (armour by direction, grab rules, shield arc, sniper relocation and glint, dog
  smell, radio check, voices, tiers, waves); `e2e-enemies` (each archetype's signature, officer buff and alarm,
  radio check, callouts, Perfectionist); perf spawns ten mixed archetypes.

## 1.17.0 - 2.0 phase 5: gadgets
- Eight gadgets (`game/gadgets.ts`, pure; `game/gadgetSystem.ts`): frag, sleeping gas (a cloud for 6 s: 0.8 s in it
  knocks a guard out), flashbang (guards facing it are blind for up to 4 s - staggering, hands to the face - then
  alert; turned away, a 1.2 s daze; it whites the screen out if you look at it), EMP (lights within 9 m out for
  8 s, close guards dazed, a guard investigates the dark), noisemaker (sticks where it lands, a lure pulse every
  1.5 s for 6 s), sticky cam (sticks, its feed opens: look round, fire pings a lure, Y releases its gas once, mark
  from it, X next cam, B back), tri-rotor drone (launches into its feed: fly where it looks, a stun dart, a shock
  burst that knocks out round it and spends the drone; 40 s battery, 35 m range; calm guards that see it look over,
  alerted ones shoot it down), proximity mine (placed at the feet, arms in 1.5 s, a guard within 1.6 m sets it
  off). Starting carry: 2 frag, 2 gas, 2 flash, 1 EMP, 2 noise, 2 cams, 1 drone, 1 mine; ammo pickups add a frag.
- The gadget wheel: hold D-pad down / Tab (time slows to x0.3 in single player), the stick or mouse picks a slot,
  release selects. Touch: a wheel button (tap opens, tap a slot). The HUD shows the selected gadget and count.
- The gadget button (D-pad up / G / touch gadget): held, a dotted arc to a landing ring; released, thrown.
  Placed / flown gadgets go on the press; with the drone out (or every cam thrown) it re-opens the feed.
- Remote feeds (cam / drone): a camera-feed look (`CinematicPost.setFeed`), a corner frame and the controls for the
  input mode; the operator stands still (the rest of the step gets no input). Touch: fire, the action button
  (Gas / Shock), Mark, crouch to return.
- Input: action `gadgetWheel`; the pad's D-pad up is the gadget (was `quick1`), D-pad down the wheel (the down
  emote is on the keyboard's 3 only now).
- Blacklist differences: gadgets are not yet bought or upgraded (phase 8); the drone's shock is non-lethal; co-op
  syncs no gadget effects yet (phase 10).
- Tests: unit tests for the inventory, wheel, arc and drone flight; `e2e-gadgets` (wheel by pad and touch, arc,
  gas, flash, EMP, noise, sticky cam, drone, mine); e2e-touch checks the wheel button size.

## 1.16.1 - fixes
- Foot planting: an early toe-off already in the air goes on from its progress and lands on the gait clock
  (1.15.1 kept the larger of the two, so a sprinting foot arrived early, behind the body, and slid up to 2.6 cm
  once planted). Sprint feet are locked again (< 1 cm) and the high-cover move clip case stays clean.
- e2e-anchors marks the frozen enemies as taken: a guard beyond a window offered a window takedown (which wins
  over the vault, as intended) instead of the traversal under test.

## 1.16.0 - 2.0 phase 4: takedowns, Mark & Execute
- Takedowns (`game/takedown.ts`, pure; `game/takedownController.ts`): a "Takedown" prompt over a guard in reach;
  Y / E / tap the prompt. Tap = non-lethal (a choke, knocked out: wakes if found), hold = lethal (a strike); it
  starts on the press and the hold decides (0.3 s). Kinds: on the ground from behind or the front at any
  awareness, from the side only on a calm guard; round a corner from high cover; over low cover (the attacker
  vaults it); from above (a drop off a ledge, deck, pipe, zipline or vent onto a guard 1.1-4.6 m below); from
  below (hanging at a lip, a guard standing over it is pulled down); through a window (pulled through). The
  attacker's feet follow an eased path onto a spot aligned to the victim (within 5 cm), the victim is seized
  (brain off, a struggle pose, pulled where the kind says), the weapon is stowed, the hands go to the victim.
  Taking damage breaks it off (the victim breaks free, alerted). Noise: a choke 1.2 m, a strike 3 m.
- Mark & Execute (`game/marks.ts`, pure; `game/executeController.ts`): a melee takedown earns an Execute charge
  (max 1). While aiming, RB / T / the touch Mark button toggles a mark on the guard under the crosshair (up to 3;
  4 later with the upgrade): white chevrons over them, red when every mark is in weapon range and line of sight.
  Then Y / keyboard Y / the touch Execute button: a slowed (x0.5, single player) letterboxed sequence turns to each
  mark in order and drops it with a head shot (~0.14 s each). Marks persist through cover moves; nothing happens
  out of sight. HUD: a charge pip on the tactical strip.
- Input: actions `mark` (pad RB while aiming - swapping weapons needs the weapon lowered then -, keyboard T) and
  `execute` (keyboard Y; pad Y when ready); touch Mark (shown while aiming) and Execute (shown when ready)
  buttons. RB while aiming no longer swaps weapons.
- Deferred to phase 5 (gadgets): the sleeping-gas grenade and gas cam; co-op dual takedowns and shared marks to
  phase 10; the victim rig is not yet in the clip checks.
- Tests: unit tests for takedown kinds / alignment / tap-hold and the mark set; `e2e-takedown` (ground kinds and
  rules, tap / hold, 5 cm alignment, interrupt by damage, over low cover, from above, from below, through a
  window, charge, marks through cover, no execute without sight, execute). e2e-anim steps the sim only
  (`loop.manual`): real-time frames between its checks advanced it by a load-dependent amount.

## 1.15.1 - stealth feedback
- Lamps: a lit strip is the light's fixture: a shot anywhere along it puts it out (not only its middle), and the
  whole strip goes dark (`LightDef.fixture`, a box hit test `rayBox`; the light rig draws fixtures as boxes). Yard
  floodlights have housings too.
- Awareness arcs only show for enemies that can see the player (line of sight to any body point) or are within
  2.5 m; a guard who only hears footsteps through a wall no longer gives himself away. The meter is a little less
  twitchy (base rate 2.2, weak-evidence leak 0.2 /s).

## 1.15.0 - 2.0 phase 3d: night vision and sonar goggles
- Goggles (`game/vision.ts`): one button cycles off -> night vision -> sonar -> off. Gamepad View (it used to
  duplicate Start's pause), keyboard N, and a new touch button (56 px, beside reload; existing layouts get it at its
  default spot beside reload).
- Night vision: green phosphor in the one cinematic pass (the dark lifted, lamps blooming out, heavy grain, a
  tube vignette), faded in over 0.25 s. Gameplay light is unchanged: being seen still depends on the light on you.
- Sonar: a pulse every 6 s marks every enemy within 30 m as an orange silhouette drawn through walls (their pose at
  the pulse, 2.5 s, fading), with a ring sweeping out and a soft ping. It runs 18 s, then recharges 12 s (shown
  on the tactical strip; the cycle skips sonar meanwhile). Marks and the LKP ghost share `vfx/silhouettes.ts`
  (thin-instanced figures, 2 draw calls per set).
- Fix: clearing enemies (restarts, tests) also frees the alarm run, the flank and the flashlights; a disposed
  enemy never counts as alive again.
- Tests: unit tests for the goggle states; e2e-stealth-ai vision (night vision, sonar through a wall, fade, run
  out, recharge); e2e-touch checks the goggles button size.

## 1.14.0 - 2.0 phase 3c: surfaces, doors, shot noise
- Floor surfaces (`world/surfaces.ts`): footsteps are louder on metal (x1.6), grates, gravel and wood, quieter on
  carpet (x0.6), and sound different (ringing steel, gravel crunch, soft carpet). Warehouse: a gravel yard, a steel
  mezzanine deck and rack tops, carpeted offices; Dust Depot is gravel throughout.
- Doors (the `Door` anchors, finally in play): five on the Warehouse (offices, dispatch / workshop, off the
  corridor). Closed doors block movement, sight and lamp light. Y / E / the action button opens one quietly (a 1 s
  creak, heard within 2 m) or shuts it (never on someone in the doorway); sprinting into a closed door bashes it
  open (loud). Enemies open doors they walk into. Doorways stay on the nav grid. (Co-op clients do not sync doors
  yet: theirs stand open.)
- Shots: a suppressed weapon (noise x0.6 or less, the suppressor attachment) only makes guards in earshot
  suspicious of where it came from; a loud one still puts them in combat. Every shot also shows on the noise meter,
  and a round landing within 4 m of a guard is heard.
- An enemy running to an alarm panel stays in combat until he gets there.
- Tests: unit tests for surfaces; e2e-stealth-ai surfaces (metal > concrete > carpet), suppressed vs loud shots,
  impacts, doors (sight blocked, quiet open, sprint bash, a guard walking through). e2e-touch waits for the camera
  to settle before tapping the cover prompt; e2e-modes counts ragdolls from the bodies.

## 1.13.0 - 2.0 phase 3b: bodies, lights, flashlights, alarms
- Bodies stay where they fall (the ragdoll settles and remains; a still body when no ragdoll can be spared; up to
  12 kept). Enemies notice them by light, distance and field of view (`ai/bodies.ts`): a body in a lamp pool is
  seen from far off, one left in shadow only by someone almost tripping over it. A found body sends the finder
  searching round it and radios the squad (22 m) to search too; a knocked-out victim is woken by the finder (3 s
  kneeling over it) and comes back searching (Clear counts it again). Knock-outs arrive with takedowns (phase 4).
- Carry: "Pick up body" (Y / E / the action button) puts it over the shoulder (torso down the back, the hands on
  its legs); carrying is slow (2.2 m/s, no sprint), the weapon stowed, no cover or traversal. "Drop body" puts it
  down (a short ragdoll drop, a small thud); at a dumpster / cabinet "Hide body" removes it for good.
- Lights: any hitscan shot through a bulb puts that light out (glass, 5 m noise). Wall switches turn a room's lamp
  circuit on and off. A room going dark or a bulb shot out brings the nearest calm enemy to look (others nearby
  turn to look). Enemies investigating or searching in the dark switch on a flashlight (four moving cone lights in
  the light model, so being in the beam shows you; rendered by the real-light pool).
- Alarms: two panels on the Warehouse. An alerted enemy within 30 m runs to the nearest working panel and works it
  for 1.6 s: ALARM banner, horn, a reinforcement squad (2 grunts, a heavy) comes in at the yard entry furthest
  from the player (Clear counts them). Hold interact at a panel (1.2 s) to disable it first.
- Interactables: switches, alarm panels, hiding spots and bodies alongside the objectives, each with its own reach
  and use (`onUse`); map layouts list `switches`, `alarms`, `hideSpots`, `reinforce`.
- Tests: unit tests for body notice, alarm panels and shooting lights (`lightOnRay`); e2e-stealth-ai body found in
  light / not in shadow, squad search, carry / drop / hide, shooting a light (investigation + flashlight), the
  switch, alarm + reinforcements, a disabled panel, waking a knocked-out guard.

## 1.12.0 - 2.0 phase 3a: perception, alert states, last known position
- Perception (`ai/perception.ts`): a 55 deg / 25 m focused cone and slower peripheral vision (100 deg, 12 m); an
  awareness meter fills by distance, the light on the body (squared: shadow hides far more), stance, motion
  (still .. sprint) and how much of the body is in view (three line-of-sight samples). Weak evidence (a dim shape)
  never builds up; out of sight the meter holds, then drains. Within 2.2 m a moving body is noticed in any light;
  point blank in full light in the cone is instant, anything else takes at least ~0.3 s (the arc shows first).
- Alert states (`ai/alertState.ts`): unaware (patrol route or post with glances) -> suspicious (stops and looks)
  -> investigating (walks over and looks round) -> alert (the existing combat AI) -> searching (sweeps out from
  the last known position on a widening ring, searchers fanned out) -> cooldown (45 s, still jumpy). One heard
  noise is enough to go and look. Detection radios squadmates within 22 m (no relay); damage and gunfire go
  straight to combat.
- Last known position (stealth rules): enemies chase and search where they last saw (or heard the shots of) the
  player, never where the player is; a pale ghost of the player in the last-seen pose marks it once they lose
  sight; it clears when the search ends. Wave keeps enemies sent at the player (no stealth rules).
- HUD: awareness arcs round the crosshair (white filling = noticing, red = detected and in sight); a light meter on
  the tactical strip (blue in shadow).
- Night Warehouse: moonlit yard (0.3), dark interior (0.12) with 14 of 30 lamp strips lit (pools, dark aisles
  between; each room's lamps are one circuit for switches later), floodlights at the doors. Clear-mode squads walk
  routes (dock, workshop, racking, factory floor, mezzanine) or stand post. `LightRegistry` ambient zones.
- Blacklist rules where the plan was open: the focused cone is 55 deg in total; investigating after one sound;
  radio range 22 m without relays; the search lasts 25 s.
- Tests: unit tests for the detection maths, alert transitions, patrols / search points and ambient zones;
  `e2e-stealth-ai` (shadow vs light, the arc warns first, no sight through walls, noise -> investigate, radio,
  LKP + ghost + converge + search ends, patrols); `perf.mjs` with `STEALTH=1` (ten unaware enemies perceiving).

## 1.11.0 - 2.0 phase 2 feedback: faster climbing, pipe tops, passing climbers
- Ladders: 3 rungs/s (was 1.6), hold sprint for 5 rungs/s; hands and feet step quicker with the climb; an upright
  pose (body close to the rungs, head up), one limb moving at a time.
- Drainpipes: hold sprint to climb ~35% faster. At the top the climb stops and waits: Y ("Climb up") climbs
  straight off the top onto the roof / wall top, or push sideways to swing onto a lip beside the pipe.
- Ladders / drainpipes: pushing sideways at a lip beside the climb swings onto it (hang); shimmying along a lip past
  a ladder or drainpipe crossing it swings onto the climb (then sideways again to carry on along the lip).
- A ladder or drainpipe wins over the lip beside it when both are in reach (walking up to a ladder always offers it).
- Crawlspaces are 1.1 m tall (Proving Grounds, Warehouse); the crawl keeps a flat back so the back guns clear the roof.
- Prompts: the ledge "Grab" prompt sits on the face just under the lip; the pipe prompt under the pipe.
- Fix: a trailing foot that toed off early (overstretched at > 2 m/s) no longer snaps back to where it left the
  ground when the gait clock's swing window opens (the pelvis dropped up to 25 cm for a frame; seen moving along
  high cover).
- Deferred (feedback, Blacklist has it): the kicked vent cover falling / the unscrewed cover set down beside the entry.
- Tests: e2e-traverse (ladder rate, sprint rate, pipe top waits / Climb up / sideways onto the lip, shimmy past a
  pipe), unit test for the early toe-off.

## 1.10.0 - 2.0 phase 2c: routes on every map, clean traversal poses
- Warehouse: a window from the truck yard into the workshop; a glazed window between dispatch and the corridor;
  ladders onto two racks (walk the rack tops, sprint-hop the cross aisle); a ladder up to the mezzanine; a zipline
  from the mezzanine over the factory floor; a duct from the mezzanine over the manager's office (until now a dead
  end) with a ceiling vent into it. Mezzanine and container edges (2.6 m) can now be grabbed from the floor.
- Dust Depot: every warehouse gets an open window and a crate below its east wall (mantle it, grab the wall top,
  walk along it, drop in); container tops and ruin walls are climbable.
- Reach: lips up to 2.7 m over the feet can be grabbed; 0.4 m wall tops can be climbed onto and walked along.
- Camera: while attached the orbit stays within the state's cone around the body's facing (soft edge).
- No body or limb ever goes into the world while traversing (new e2e-clip checks): the weapon stows in ~0.14 s; the
  ladder's bottom exit steps back off it; outside corners are swung round on a curve outside both faces; a jump
  "up" only takes something above and every jump needs a clear flight line; a dedicated climb-up (feet walk up
  the face, the knee comes over only above the lip, the body eases out from the wall); hang feet hang plumb; a
  drainpipe keeps 0.34 m off the wall; horizontal pipes keep the hands off their posts; the vent drop lowers
  through the hatch on the hands (the head stays in the duct) before letting go; ceiling hatches are 0.8 m; a
  low dive through windows (1.2 m openings); the landing roll rides up over its back.
- Nav: pieces marked `overhead` (ceiling slabs, ducts) are looked through by the nav sampler and never block.
- Tests: e2e-anchors (every placed anchor on every map offered from its approach and engaged; hangable lips per map),
  e2e-clip traversal scenarios (ladder climb / slide, drainpipe + lip, shimmy + corner, climb up, pipe, duct +
  vent, window vault, zipline, landing roll: no body point into the world), e2e-traverse camera inside the duct.

## 1.9.0 - 2.0 phase 2b: landings, ziplines, windows, ducts
- Landings (no fall damage, Blacklist): under 2.5 m a soft landing; 2.5-4.5 m a roll that keeps the momentum
  (the body turns over forward, then carries on at a run; skipped when a wall is too close); over 4.5 m a heavy
  landing with a 0.6 s recovery. Each band is louder (3 / 8 / 14 m) and enemies hear it.
- Falling past a lip (or a pipe): a "Grab" prompt shows while it passes the hands, Y grabs it.
- Ziplines: Y under the high end; speed builds to 6 m/s; B lets go and the body flies on with the cable's speed;
  at the end it carries off the cable and lands.
- Windows: Y at an open window vaults through it; at a glazed one the vault shatters the glass on the way (15 m).
  Glass and duct grates are separate breakable bodies (`world/breakables.ts`, two draw calls).
- Ducts: at a vent, tap Y to kick the grate in (quick, 10 m noise) or hold Y to unscrew it (1.2 s, silent, progress on
  the prompt); crawl through at ~0.9 m/s (tight camera, hands planted on the duct floor); out through a wall vent,
  or drop through a ceiling vent into the room below (a committed fall, landing like any other: a roll from 2.5 m),
  or back out of the entry.
- Placed anchors (ladders, drainpipes, ducts, ziplines) win over a step / vault / mantle the geometry offers at the
  same spot; lips and pipes give way to them. Lowering into a hang is its own hint (never in the way of a climb).
- Ladder tops are offered only walking out towards the edge the ladder hangs off.
- The noise meter holds one-off noises (glass, kicks, landings) for a moment.
- Fixes: the stowed weapon's swap pose no longer bends the body while hanging / climbing / crawling.
- Proving Grounds: a zipline off the tower; a shed (south east) with an open and a glazed window, a door, and a duct
  on its ceiling reached by a ladder platform, with a ceiling vent into the shed.
- Tests: e2e-traverse (landing bands + noise + recovery, grab while falling, zipline, both windows, unscrew / kick /
  crawl / vent drop), unit tests for landing bands and the window / duct / ladder-top reach rules.

## 1.8.0 - 2.0 phase 2a: ledges, ladders and pipes
- Ladders: Y at the bottom climbs on (or at the top: turn round and step on); climb at 1.6 rungs/s with the hands and
  feet stepping rung to rung; B slides to the bottom (pushing up stops it); step off at the top or the bottom.
- Drainpipes: climb at ~0.9 m/s hand over hand; at the top it takes the lip above (then climb up).
- Ledges: Y grabs a lip 1.6-2.45 m above the feet; at an edge, hold B (or tap the "Hang" prompt) to lower into a hang
  (Y there still drops down). Shimmy at ~1.2 m/s hand over hand, round outside corners and onto neighbouring lips;
  Y climbs up where there is room; B lets go. With the stick pointing at another lip / pipe / ladder within 2.5 m a
  "Jump" marker shows on it and Y jumps across (pushing into the wall jumps up). At the end of a lip the stick
  pointing at a jump target holds there instead of wrapping round the corner (Blacklist).
- Horizontal pipes: Y grabs from below, hand over hand along it, B drops.
- Contacts: planted hands and feet never slide (`GripStepper`: each grip stays locked until the limb trails too far,
  then swings to the next grip, rungs snapped); the arms always reach their grips.
- World prompts: Climb / Grab / Hang from the ground; Climb up, Jump (on the target) and Drop / Slide (B) while
  attached; all tappable by touch. No take-cover prompt while attached.
- Proving Grounds: a traversal course in the north east (tower with ladder and drainpipe, two hang blocks to jump
  between, a horizontal pipe).
- Tuning: hang point 1.9 m under the lip and 0.22 m out from the face; climbers stand 0.28 m off the rungs.
- Tests: e2e-traverse (every verb above by pad, keyboard E and touch prompts; speeds; contacts < 1 cm), unit tests
  for the grip stepper, ledge continuation and jump targets.

## 1.7.0 - 2.0 "Blacklist" overhaul, phase 1: foundations (no visible change)
- Traversal anchors (`world/anchors.ts`, pure): ladders, vertical / horizontal pipes, ledges, ducts, windows, doors and
  ziplines as map data in the built level (`BuiltLevel.anchors`). Ledges are generated from box tops like cover faces
  (lip >= 1.9 m off the floor, cut where another piece sits on or presses against it, linked round outside corners,
  climb-up only where the top is >= 0.45 m deep), with manual additions / suppressions; `LevelBuilder.ladder / pipeV /
  pipeH / zipline / duct / windowAt / door / ledge / noLedge`. Reach tests, hang points, lip grips, rung snapping.
- Attached locomotion (`player/attach.ts`, pure): one state machine for ladder, pipe, hang, duct and zipline - stick
  mapping along the anchor, root path, enter / on / exit blends, camera framing preset and allowed actions per state.
  `TraversalController` runs it beside the committed moves (`attachTo`, `detach`): ladder climb at 1.6 rungs/s, slide
  on held drop, step off the top or bottom; drop lets go; climb up from a ledge.
- Rig: hands take world grips independent of the weapon (`reachL/R`), feet take world soles while attached
  (`plantL/R`); new `hang`, `climb`, `crawl` poses. Attaching stows the weapon through the swap's holster half and
  draws it again after.
- Camera: framing presets per attached state (`ATTACH_FRAMING`), blended in and out.
- Input: `drop` (raised by the crouch control on every device) and `interactHold` (interact held 0.3 s);
  `InputState` tracks hold time and progress for hold rings.
- Light model (`world/lights.ts`, pure): a registry of lights (radius, cone, intensity, on / off, shoot-out, switch
  groups, EMP outages) and `lightLevelAt` / `bodyLightLevel`; the player is sampled at 10 Hz (occlusion rays only for
  lights in range), enemies sample their target in their think tick. `LightRig` renders a capped pool of real lights
  (by quality, nearest the camera) plus emissive bulbs; maps without lights create nothing. Map themes take a
  gameplay `lightLevel` (default daylight 0.75).
- Decisions (Blacklist-style): hanging, ladders and pipes holster the long gun; drop on a ladder slides, elsewhere it
  lets go. Anchors live in the built level (`BuiltLevel`), not `MapLayout`, since ledges come from the geometry.
- Tests: anchors, lights, attach machine, input holds (unit).

## 1.6.0 - Tactical stance, sights at the eye, smooth gait, cover jog and corner prompt
- Aiming and firing bring the weapon up to eye level beside the head (stock high, elbows up), so shooting never
  reads as hip fire.
- Tactical stance: chest well forward over the hips, knees bent, head up; crouched the operative is bent over the
  knees (straightening a little into a raised weapon).
- Smooth, weighted gait: much less up-and-down (head and weapon glide), the weight shown in the hip sway and
  twist; the per-step speed pulse, heel kick and camera footstep dip are small.
- Looking around with the camera only turns the head; the gun, hands and spine move only when you aim or fire.
- Cover: moving along a wall is a jog (2.3 m/s standing, 1.25 crouched) and gets up to pace quickly; the
  operative stops a step back from an edge instead of on it.
- The weapon stays clear of walls, floor and body through the new poses: compressed while gliding into cover,
  high ready while turning round at high cover, a lifted muzzle crouched, the arms opened up for a reload.
- Cover corners are never turned automatically: pushing against an outside corner shows a "Round corner" prompt
  on the edge, and the cover button (A / Space / tap) swings round it. Holding the stick on afterwards no longer
  pushes you out of the new wall.
- No cover badge on the wall you are using (only a "Flanked" warning); leave with the cover button or by pushing
  away.
- Fix: the body could spin round on the spot when aiming at cover edges while moving quickly. Turns in cover never
  pass through the wall or wrap round, and cover moves never trigger the open-ground planted pivot.
- Tests: e2e-cover (corner prompt + button, no badge, edge stop), e2e-stealth (corner never automatic, no spin,
  tucked turns never face the wall), e2e-touch (no badge, push away leaves), unit test for the corner button.

## 1.5.1 - Level horizon after shakes
- Fix: the view could stay tilted after a hard landing (vaulting off the Warehouse mezzanine), a hit, an
  explosion or shotgun / sniper fire, changing as you turned and only clearing on the next shake. The engine
  rebuilt the camera's up vector (pitch included) only when the shake's roll changed, so the frame the roll
  ended froze a tilted horizon. The up vector now follows the camera rotation every frame.
- Weapon body clearance is allocation-free and cheaper (animation back within the per-character budget).
- Tests: e2e-stealth checks a level horizon after a shake at a new pitch and yaw.

## 1.5.0 - Weighted movie movement, no clipping body or gun, walking round corners
- Movie stealth movement: every gait is exaggerated - deeper bob and rise, more hip sway and shoulder twist,
  stronger lean into turns. The operative carries a tactical hunch whenever armed (spine and head forward,
  shoulders rolled over the gun, hips a little lower), deeper along cover: walking along a wall is gun-ready
  and bent over.
- Weighted steps: each footfall checks the body (a heavier heel-strike compression and a pulse in the root speed:
  plant, then push) and kicks the camera, so steps land instead of gliding; the sprint bob is kept tighter so the
  feet stay locked.
- No unrealistic limbs: legs are solved before the head and weapon, knees never go below the floor (the hips
  rise instead), knees never knock together (they bow outward when close), and low cover hiding curls the back
  over the knees rather than folding the legs. Map low cover is slightly taller (0.95-1.0 m) so hiding never
  needs a crushed pose.
- The gun never clips the operative: aiming puts the sight under the eye beside (not inside) the head, and a
  body push-out keeps every weapon clear of the head, torso and legs in every stance, carry, reload and swap;
  kneeling in cover mirrors to the open side so the gun is held away from the knees.
- Corners: aiming further round a high cover edge walks the operative out around the wall (up to 1.4 m, step by
  step along the face, round the corner and along the side) until the line of fire is clear; the gun stays tucked
  until then and the step-out path is checked so the gun never meets the wall. Aiming over low cover rises on the
  eye line, side-on until the gun is clear of the top.
- Aim while sprinting ends the sprint and raises the weapon. Sprinting keeps the low ready (the compressed tuck
  drove the gun into the chest at full stride).
- Tests: e2e-clip now checks head, trunk, knees (floor and gap), feet and elbows against the gun and world, aims
  every weapon, aims walking and crouched; e2e-move checks aim cancelling a sprint.

## 1.4.0 - Sights at the eye, no weapon clipping, cover step-out, Blacklist camera
- Aiming is a real cheek weld, never hip fire: raised to aim or fire, the weapon's sight line sits under the
  dominant eye (within ~1 cm for every weapon), the head bends down onto the stock and the shoulders lift into it.
- Tactical carry everywhere: the compressed ready (near walls, doorways) is pulled tight to the chest, muzzle
  forward and down, instead of swung across the body into a wall. In cover the weapon is tucked on the open side,
  muzzle down along the wall and turned away from it (crouched / kneeling: flatter and higher, clear of the knees).
- No clipping: turn-and-swap and other big turns in cover swing through facing away from the wall (back to it),
  so the gun never passes through it; at an edge peek the gun comes up only once the body has leaned out and the
  line of fire is clear; a new clipping sweep (e2e-clip) checks every frame of wall-side movement, high and low
  cover, edge-peek aim sweeps, aim over, reload, swap and vault: no gun point inside the world, legs at most grazed.
- Step out to shoot: aiming further across from an edge steps the operative out past the edge as far as the line
  of fire needs (up to 0.8 m) and back in as you aim round again, so you can shoot anywhere in the room you can
  aim, including a little back across the cover; the body stays side-on with the weapon tucked until the shot is
  clear. Aim that starts outside the allowed arc eases in with the weapon held down.
- Camera: Splinter Cell: Blacklist framing - further back (2.2 m) and wider (0.62 m right), so the operative stands
  small in the left third (crouched in cover: low in the lower left) and most of the screen is the room; cover
  pulls back slightly; aiming pushes in over the shoulder (1.5 m).
- Cover-to-cover only on intent: a target is marked only while you look at the cover and hold the stick towards
  it; then press cover. Holding the stick towards a marked cover never pushes you out of the one you are in.
- Tests: e2e-clip (new), e2e-cover (cover-to-cover intent), unit tests for the wider edge arc and the sticky exit.

## 1.3.2 - PC mouse capture
- The mouse is captured in a match on PC browsers (pointer lock): the click that starts or resumes a match
  captures it, and any click on the game while it is free does (that click never fires; a "Click to capture the
  mouse" hint shows meanwhile). Captured: move to look, left button fires, right aims, the wheel swaps weapons.
  Esc (or alt-tab) frees it and pauses; Resume captures it again.
- Fix: mouse buttons never reached the game (the engine cancels pointer presses on the canvas, which stops the
  browser sending mouse presses), so the mouse was never captured and could not fire or aim. Mouse buttons now
  use pointer events.
- Tests: new e2e-mouse suite.

## 1.3.1 - Cover feedback: hide for real, crouched aim, world prompts, manual cover
- Low cover hides you: the body ducks (hips down, back curled over the knees, head tucked) until the top of the
  head is ~7 cm under the cover top, kneeling or moving along it. Aiming over low cover stays crouched: the back
  straightens and the weapon comes up to the cheek, rising only until the muzzle clears the top (eyes, head and
  gun show; no full stand). The camera keeps a view over the top.
- Low ready with bent arms: the stock stays in the shoulder pocket and the muzzle angles ~45 deg down across
  the body; the wrists sit behind / under the palm points on the gun, so the support elbow bends ~130 deg instead
  of locking straight.
- Cinematic cover moves: the entry slams shoulder-first into the wall (hips thrown over, spine whipping into
  it, a crunch down and a camera hit scaled by the approach speed), a ducking spin through the turn-and-swap and
  the corner swing, a hard push off when leaving (step back ~0.26 m), wider leans at edge peeks.
- Manual cover only: walking or sprinting into a wall never takes cover; the Auto-snap setting is gone. Only
  A / Space or a tap on the take-cover prompt does.
- World prompts (Splinter Cell: Blacklist style): "Take cover" sits on the face a press would snap to, low on it
  (at most 0.55 m up, one height per surface), vault / climb / step on the obstacle at the same kind of height, the
  cover type badge ("Low cover", "Peeking", "· flanked") on the face in use, the cover-to-cover marker on the
  target. Prompts never overlap and stay on screen. By touch the prompt is the button (tap the badge to leave
  cover); the touch action button now only appears to use an interactable. The centre-screen prompts and the swipe
  gesture are gone.
- No wall shots from cover: aim is limited to angles the weapon can shoot from each peek (round an edge: from
  straight across round to behind the shoulder; over low cover: a wide arc whose lowest pitch clears the top,
  tighter sideways; high cover away from an edge: never into the wall). Inside those limits every shot clears the
  cover; firing waits until the weapon is actually out (lean / rise / blind raise). The barrel-through-wall check
  now runs from the head, not the camera.
- Hit volumes follow the posed body (ducking really lowers them); enemies that only see your head aim at it.
- Tests: unit tests for the cover aim limits; e2e-cover covers the world prompts, prompt taps, manual-only
  cover and the crouched aim over; e2e-weapons-carry uses the new wrist model.

## 1.3.0 - Stealth movement, Blacklist-style cover, realistic weapons, minimal Clear mode
A stealth operative: fluid, quick and cover-oriented, still weighted. Built and checked against the
iPhone 17 Pro Max class target (120 Hz).
- Camera fix: the view could get stuck on an angle after sprinting or looking around until you aimed (a
  twist clamp plus a stance turn cap held the view back). The camera now orbits freely: look input applies the
  same frame, nothing holds it back, and no offset is left after a sprint, cover, a lean or traversal
  (e2e-stealth reproduces the old bug and covers 360 deg looks standing, crouched, moving, aiming, after a
  sprint, after cover and after a lean).
- Movement: crouched sneak 0.8 / crouch walk 1.8 / crouch run 2.6 m/s, standing walk 1.4 / jog 2.8 m/s, sprint
  5.0 m/s (toggle or hold, no stamina, stands you up, weapon lowered), aiming 1.4 standing / 1.0 crouched;
  strafe x0.9 and backstep x0.75 only while aiming. Visible on the first frame, 90% speed in 0.2-0.35 s
  (sprint <= 0.45 s), stops in 0.2-0.35 s with one settling step, direction changes under 90 deg arc round,
  reversals are a 0.3 s planted pivot. Not aiming the body faces its travel (540 deg/s at a sneak to 300 deg/s at
  a sprint) and does not turn with the camera when still; aiming turns <= 360 deg/s. Traversal in stride (vault,
  mantle up to 1.8 m, step, drop, and a sprinting hop over gaps). Noise by stance and speed; crouching shrinks
  the distance enemies see you from.
- Camera: 80-150 ms follow with look-ahead, aim framing 150-250 ms, ~250 ms shoulder swap on an arc, framing
  that tightens at lower pace, auto shoulder in cover and at peeks, optional auto-recentre after 1.5 s of no
  look input while moving (Settings > Gameplay). Collision pull-in, body fade, drift <= 0.15 deg, bob <= 1 cm.
- Cover: snap from up to 3 m with a 0.25-0.42 s glide (a slide from a sprint) and the support hand on the wall;
  low and high cover, stand or crouch at high cover (crouch toggles); peeks over low cover and round the edges
  of low and high cover, standing or crouched, head first with the weapon out in ~0.2 s and back in ~0.2 s; the
  weapon changes hands at a left edge in 0.18 s; shuffle, edge look, 0.5 s corner swing, inside-corner turn;
  cover-to-cover to the marked cover (routed round a corner when needed) or a SWAT turn, cancelled by pushing
  back; blind fire, vault / mantle from cover, a 0.25 s sticky exit; reloads, swaps and grenades tucked in.
- Animation: gaits for sneak, crouch walk, crouch run, walk, jog, sprint and aim strafes; start, stop and pivot
  overlapping the root motion; leaning into turns (<= 8 deg); planted feet locked to the millimetre in every
  gait (the pelvis drop now measures each leg from its own hip, without lag); stance changes 0.25-0.28 s; aim
  raise ~170 ms, lower ~300 ms; inertialization 120-250 ms. Both avatar styles.
- Weapons: realistic sizes (rifle 0.84 m, SMG 0.60, shotgun 1.00, sniper 1.15, pistol 0.19; barrels 12-22 mm;
  receivers 30-60 mm wide), hands on the grip points within 2 cm. Every carried weapon is visible: long guns
  vertically on the back (left / centre / right, muzzle up, within 10 deg of the spine, standing off vests and
  backpacks), compact guns on a left-hip sling that swings out with the thigh, the pistol low on the right
  thigh, grenades in belt pouches. Swaps reach to each slot (holster, take, bring up) and stay 0.8-1.0 s.
  Co-op remotes show their whole loadout (the lobby carries it).
- Clear mode: the HUD shows only "Enemies left N" (alive + still to spawn): no room names, room counts, lives,
  score, objective or enemy blips, and no per-room banners, stingers, slow beats, feed items or rewards. Going
  down shows "DOWN". Completing the operation is the only feedback (OPERATION COMPLETE banner, stinger, slow
  beat, letterbox); results have no rooms row and a single completion reward. Wave and Mission are unchanged.
- Controls: gamepad A cover / cover-to-cover, B crouch (stand / crouch at high cover), Y traverse / vault /
  interact, X reload (hold to swap), L3 sprint, R3 shoulder, RB/LB weapons, D-pad grenade / gadgets, LT aim,
  RT fire. Touch: contextual action button, crouch toggle, sprint toggle, aim. Keyboard: Space cover, C crouch,
  Shift sprint, E traverse / interact.
- Aim assist no longer jolts the camera when sweeping across a target (friction fades in space and time,
  magnetism fades at the centre).
- Tests: e2e-anim rewritten to the new bars, new e2e-stealth (camera + cover) and e2e-weapons-carry, e2e-clear
  rewritten, e2e-cover / move / tactics / combat / coop updated; unit tests for weapon dimensions, carry slots,
  Clear rewards and the hostiles-left count.

## 1.2.0 - Cinematic tactical animation, close-quarters Warehouse, mobile controls, 120 Hz
Slower, weighted, cinematic SWAT pacing in close quarters, tuned for top-end phones at 120 Hz.
- Pace: creep 0.45, walk 0.9, brisk 1.4 (forward only), crouch 0.55, ADS 0.7, cover 0.5, reload 0.45 m/s; dash
  3.8 m/s with a 300 ms wind-up and 450 ms recovery. `MotionDriver` (player and enemies): 250-400 ms weight shift
  before the first step, walk speed over ~0.9 s, stops in 0.5-0.8 s with settling steps, capped acceleration /
  deceleration / jerk (Tune panel), stepped 90 deg turns in ~0.6 s with plants (a turn keeps stepping until the
  feet face the aim), aim turns <= 110 deg/s, planted pivots. Stance: crouch 0.45 s, kneel 0.5 s, stand 0.6 s.
  Frame-rate independent.
- Animation system: a clip library in code (keyed monotone curves over pose channels, cycles with contact duty
  and lift, timed clips with events), a 2D locomotion blend space, start / stop / pivot / cover / traversal clips,
  root motion with stride modulation, inertialization on every state switch (180-350 ms), heel-strike weight,
  balance and support shifts. World-space foot planner: planted feet locked (< 1 cm slide), swing arcs with toe-off
  and heel strike, no crossing, distance-matched stops, error-driven idle steps, shorter side-steps. Hand IK onto
  the grip, foregrip, magazine well or the cover wall; head world-stabilised; weapon orientation lags with mass.
- Weapon clips: ready transitions 320 ms, raise 350 ms, lower 550 ms, tactical reload 2.6 s / empty 3.1 s (charge
  handle), swap 0.9 s (equipped at 45%), grenade 1.2 s (release at 68%).
- Cover choreography: 0.6-0.95 s eased entry with the support hand reaching the wall first, head-first peeks
  with the weapon out by ~400 ms, weapon changes hands (~0.35 s) before leaning out of a left edge, reloads
  tucked against the wall, 0.4-0.6 s step-back exit, vault and mantle clips. Hit flinch recovers in 0.3-0.6 s.
- Stick-figure avatar (default) on the shared skeleton; the detailed body stays selectable (Settings > Video >
  Avatar style). Saves and cosmetics unchanged.
- Camera: ~200 ms follow lag with look-ahead, rotation inertia, 350-600 ms framing blends, ~400 ms shoulder swap
  on an arc, cover push-in, handheld drift <= 0.15 deg, footstep micro-bob <= 1 cm, dash FOV +4 deg, smooth
  collision pull-in; updated every render frame. Cinematic post pass (vignette on by default, optional film
  grain, letterbox for stingers) and a 0.25 s slow-motion beat (setting).
- Warehouse map (default for Mission, Wave and the new Clear mode): truck yard, loading dock, dispatch, workshop,
  service corridor, racking aisles, factory floor, mezzanine, offices; roofed with skylights and hanging lights.
  Tagged rooms (HUD room tag on every mode). Clear mode: room-holding squads, "Rooms cleared n/N", stingers
  (banner, audio, slow beat, letterbox), three lives. Enemies hold their rooms (fight and take cover inside,
  never chase out) and chasing enemies stop to check a room before entering it unseen. Proving Grounds gained a
  three-room mini set.
- Mobile controls: floating move stick (flick-to-dash optional, off by default); camera-only right stick (rate
  based, dead zone, response curve, smoothing, acceleration) plus optional drag-look; a separate fire button
  (84 px) that never moves the camera (optional left fire, optional fire drag-look); ADS button; one contextual
  action button (take / leave cover, vault, climb, step, drop, open / use; swipe for cover to cover); secondary
  buttons >= 56 px; the weapon readout moves under the vitals in touch mode. Layout editor: presets (Default,
  Claw, Left-handed), per-control size and opacity, thumb-reach overlay, preview. Touch layouts migrate (v2).
- 120 Hz: refresh-rate detection (Safari may cap rAF at 60), frame pacing percentiles and a pacing graph against
  the budget in the debug overlay, an "Ultra 120" quality tier (DPR cap 3), dynamic resolution with hysteresis,
  adaptive quality relative to the display budget (headroom judged on CPU work). The rig now refreshes world
  matrices top-down instead of re-forcing the whole parent chain per joint: CPU per frame -55%, animation
  ~0.037 ms per character. Allocation-free `hyp2`/`hyp3` instead of `Math.hypot`, typed-array nav heaps.
  Warehouse, 10 enemies, CPU per 120 Hz frame p50 0.65 / p95 1.65 / p99 2.2 ms, 17-30 draw calls.
- Debug overlay: active clip timeline, foot contact markers, speed / acceleration / camera traces, slow motion
  0.25x / 0.5x, pacing lines.
- Tests: unit tests for motion, curves / clips / inertialization / graph, foot planner, pacing, rooms and room
  clearing, touch layout migration and presets; new `e2e-anim` (every timing and smoothness bar above in the
  running game, plus 60 vs 120 Hz parity) and `e2e-clear`; `e2e-touch` rewritten for the new controls;
  `perf.mjs` (percentiles at 120 Hz, animation cost per character, allocations with top allocators, draw calls,
  `--budget`) and `soak.mjs`; `anim-sheet.mjs` contact sheets.
- Choices: clips are authored as curves in code (no external assets, tree-shaken, diffable) and evaluated into a
  flat channel pose; inertialization replaces cross-fades so state changes never pop; the foot planner works in
  world space so feet lock regardless of root motion; Clear mode is single player (co-op modes unchanged);
  remaining per-frame allocation is V8 number boxing and Havok marshalling, so the budget is per frame, not zero.

## 1.1.0 - Cover-first tactical overhaul
SWAT-style movement, a tight over-the-shoulder camera, weapon ready positions, weighted animation and an
intuitive, deeper cover system.
- Movement: analog creep (0.6 m/s) / tactical walk (1.2) / brisk (2.0, full stick forward held 0.6 s), ADS 1.0,
  crouch 0.9, cover 1.0, reload 0.6; strafing x0.9, backstepping x0.7. The body faces the aim (strafe-locked,
  weapon-led) at a stance-limited turn rate, and the view is capped to what the body can follow; reversing at
  speed plays a 0.5 s pivot. Feet sidestep without crossing. Crouch ~0.3 s; crouched and still kneels.
- Bounding dash replaces sprint and roll: LS click / dash button / touch stick flick / Shift. 150 ms wind-up, rush
  at 5.5 m/s for up to 1.5 s, 300 ms braking recovery, no firing throughout; stamina with a lockout when empty.
- No free jump. Jump is contextual (`TraversalController`): step up (<= 0.65 m), vault (low and thin, clear
  landing), mantle (<= 1.7 m with room on top) or a controlled drop at a ledge, each a committed eased move with
  a HUD prompt naming it beforehand.
- Footstep noise scales with speed (creeping is near silent, dashing carries) and draws unalerted enemies over to
  investigate.
- Weapon carry: low ready by default, compressed near walls, doorways, cover edges, while dashing and reloading,
  high ready in tight corridors and traversal; cross-faded. Raised only to aim or fire: firing from ready raises
  first (rifle 150 ms, scaled by weapon weight: pistol faster, shotgun and sniper slower), the weapon holds up
  0.6 s after the last shot. Semi-auto taps during the raise fire once up. Weapons have a mass factor
  (`weight`, class default) that also drives sway and inertia.
- Camera: always a tight over-the-shoulder framing (boom 1.2 m, ADS 0.75, shoulder 0.5, pivot 1.6, camera just
  below head height so the head and shoulders sit upper left). FOV setting is now horizontal at 16:9
  (`video.fovH`, default 75) with the vertical FOV fixed, so ultra-wide phones see more at the sides instead of
  cropping the body. Nudges for crouch, dash and lean; ~250 ms weighted shoulder swap; in tight spaces the
  camera pushes in and hides the head/body rather than clipping.
- Corners and doorways (pure detection from cover faces): slicing the pie eases you out to ~1 m from an outside
  corner with the weapon compressed; aiming with a wall edge or door frame in the way leans out to the open side
  (hips planted, camera to that shoulder, restored after); doorways get compressed ready and a check sweep when
  stepping through. Proving Grounds has a new close-quarters lane (doorway wall + free-standing wall).
- Cover v2: side-on stance with the shoulder to the wall and a 0.3 s turn-and-swap when reversing; kneel at low
  cover; lean in place at high-cover edges (the capsule stays in cover); dashing in slides into cover; pushing
  into inside corners turns onto the adjoining wall; cover-to-cover targets in the push/look direction with a
  HUD diamond marker (on by default) and a low SWAT turn across gaps to in-line cover; touch swipe from the
  cover button; jumping out of cover can mantle; sticky but not trapping (a firm push away for 0.3 s leaves).
- Combat around cover: split player hit volumes (legs, torso, head) that follow crouch and lean; exposure sampled
  by rays from the nearest threats (HUD meter); suppression from near misses and nearby impacts (vignette, aim
  wander, wider spread, flinch); cover quality against current threats (badge shows "flanked"); losing your
  cover stumbles you.
- Enemies use the same tactics: walk when they can see you and rush only between covers, suppress your last
  known position, blind-fire from cover, choose cover by quality, one is assigned to flank a player holding
  cover, and grenades come in if you camp the same cover.
- HUD: stamina bar, exposure meter, noise bars, suppression vignette, traversal prompt, cover-to-cover marker.
- Animation: tactical gait (creep/walk/brisk/dash), kneel, slide, traversal and doorway-check poses, ready
  positions, mass-weighted sway and turn follow-through, per-joint angular rate limits as the continuity safety
  net. Debug overlay: player/carry/cover/combat/anim lines (layer weights, joint-limit warnings), weapon bob
  trace, camera and weapon-carry tuning.
- Input: action `sprint` renamed `dash`; touch `dash` button; `LS` prompt glyph. Settings: cover-to-cover on by
  default; FOV key changed (old FOV values reset to 75).
- Tests: `tests/tactical.test.ts`, `tests/corners.test.ts`, `tests/tactics.test.ts`; e2e-move and e2e-cover
  rewritten for the new model; new `scripts/e2e-tactics.mjs`. Probe (10 enemies, headless): ~2.2 ms CPU per
  fixed step (v1.0.0: ~2.4).
- Choices: traversal and cover are separate controllers sharing `PlayerController.override` rather than one
  merged state machine, so each stays small and testable; exposure is sampled with a handful of rays at 4 Hz
  instead of per-shot visibility; contextual lean is probe-driven (works at any wall edge or door frame without
  tagging); the FOV setting was re-keyed rather than migrated because the meaning changed (horizontal at 16:9).

## 1.0.0 - Phase 10: Hardening and release
- Offline end-to-end test (`scripts/e2e-offline.mjs`): every file in the service worker's precache manifest is
  cached (including the lazy co-op chunks and the Havok WASM), the game boots and plays a Wave match with the
  network cut, backgrounding pauses, co-op shows its offline state, and a v1 save written straight into
  IndexedDB is migrated on boot with a backup and survives reloads.
- Saves: a profile that cannot be read (from a newer version, or corrupt) is never overwritten; play continues
  on an in-memory profile, Settings > Data explains why, and an explicit import/reset backs the old data up first.
- Loop: an error in one system no longer wedges input polling and menus (isolated, logged, toasted once).
- Backgrounding the app saves immediately, silences audio and pauses single player.
- PWA: removed duplicate icon entries from the precache manifest.
- TESTING.md release checklist (offline/install, migration, full controller checklist); README with play,
  develop and GitHub Pages deploy instructions.
- e2e: pad disconnect check waits for the poll instead of a fixed 300 ms; page errors can print stacks (`STACK=1`).

## 0.10.0 - Avatar, movement and cover overhaul
Retrofits the player, enemies, coop remotes, training dummies and the customiser preview.
- One shared rig with realistic proportions (1.75 m, ~7.5 heads, shoulders ~2 head heights, chest-to-waist
  taper, limbs tapering thigh -> knee -> ankle and shoulder -> wrist), built only from smooth shapes: surfaces of
  revolution (torso, tapered limbs with muscle swell, domes, helmets, rounded cylinders) and superellipsoids
  (rounded boxes, mitten hands, boots, plates) with shared-vertex normals and a low-poly LOD beyond 16 m.
  Joint spheres sleeve into the limbs so there are no gaps in any pose. Still instanced from one material.
- Body types are now Average / Lean / Athletic / Broad (girth and shoulders within ~0.9-1.15x). Enemies differ
  by build and gear: lean runner, average grunt with a rifle, broad plated heavy with an SMG-class gun.
- Customiser options adapted to the smooth style: heads Round / Strong jaw / Oval / Long, Swept hair, Bedroll
  pack, Comms headset (replacing hard-edged hex/square heads, spikes, blade and horns). Patterns and camos now
  have soft edges. Save v4 migrates looks and owned unlocks to the new ids (test with a literal v3 save).
- Layered procedural animation (`anim/`): lower-body state machine with 200 ms cross-fades and a speed-driven
  blend tree (idle/walk/jog/sprint, crouch, strafe, backpedal, turn-in-place steps, jump/air/land compression,
  roll), planted feet synced to ground speed, two-bone IK for feet and both hands (correct two-hand grip on
  each weapon's foregrip), separate aim layer with spine/head look-at, recoil spring, reload (off-hand to the
  magazine), sprint carry, blind fire, weapon sway, breathing, lean into acceleration and turns, hit react,
  emotes blended over the top. Holstered guns show on the back (long guns) or hip (pistol).
- Ragdolls re-fitted: five bodies (torso, legs, arms) with ball-and-socket hips and shoulders.
- Movement: realistic speeds (walk 1.4, jog 3.5, sprint 5.5, crouch 1.2, ADS 1.0 m/s) in a tunable data table,
  critically damped acceleration/deceleration (eased, no instant stops or sliding), committed sprint with a
  wind-up and a recovery before firing/ADS, modest 0.45 m jump with minimal air control, fixed 0.6 s roll with
  recovery and cooldown. Camera follow, shoulder swap and ADS use critically damped springs.
- Cover system: cover faces generated from every upright map piece (both maps and Proving Grounds; walls,
  crates, low walls, pillars), probed at run time for real height, clearance and inside corners. Snap with an
  eased 250 ms move (button, B-hold or C; optional auto-snap), strafe along the face with edge stops, aim over
  low cover / lean out at high-cover edges with automatic shoulder swap, blind fire (x3 spread, stays covered),
  pivot round outside corners, vault low cover, optional cover-to-cover dash. Cancels on sprint, roll, jump,
  backing off, lost surface or death. Enemies use the same faces and peek past edges.
- Contextual cover prompt, state badge and touch button; `cover` action across touch/pad/keyboard (keyboard
  crouch moved to Ctrl). Settings: auto-snap, cover dash.
- Debug overlay: Skeleton view (bones, controller capsule, hit volumes) and a live movement/camera Tune panel.
- Hit volumes and the controller capsule are derived from the proportions (player capsule 1.75 m x 0.30 m).
- Fixed: a quit triggered mid-tick could animate the disposed player rig (GameState and rigs now ignore
  updates after exit). Animation LOD: rigs beyond 22 m solve IK at half rate. Probe (10 enemies, headless):
  ~1.9 ms CPU per fixed step (was ~1.0 ms with the box rig), 25 draw calls.
- Choices: characters stay instanced (one draw call per smooth shape) instead of merging meshes per character,
  which would cost a draw call per character; IK hands follow the weapon rather than the weapon following the
  hand, so aim is exact; cover data is generated from geometry rather than hand-tagged, so new maps get cover
  for free.

## 0.9.0 - Phase 9: Online co-op (optional, behind `flags.coop`)
- 2-4 player co-op over WebRTC (Trystero, Nostr public signalling) for Wave Survival and Free Roam.
  Mission stays single player. Everything lives in `src/net`, loaded only by dynamic `import()` from the
  main menu's Co-op entry or a `?room=CODE` link; single player never loads it.
- Lobby: host a room (5-character code, no confusable characters) or join by code (on-screen keypad for
  controllers, typing on keyboards) or invite link (share sheet / clipboard). Player list with tags,
  ready-up, host picks mode/map/difficulty, Start blocked until everyone is ready. All by touch or pad.
- Host-authoritative simulation: the host runs AI, waves, pickups and every player's health. 15 Hz
  snapshots (players, enemies, objective, mode info, pickup mask) + batched events (enemy tracers,
  explosions, kills, banners, pickups, emotes, damage direction, revives).
- Clients predict their own movement and fire; enemies are interpolated puppets (~120 ms buffer, clock
  sync, short extrapolation) with local hit volumes. Hits are sent to the host, which checks the fire
  rate (token bucket per weapon), origin, range, line of sight and the target's lag-compensated position
  (up to 600 ms rewind), and caps damage at the fully upgraded maximum. Grenades are re-detonated by the host.
- Remote players render with their own avatar look, weapon, animation flags, muzzle flashes, tracers and
  positional gunfire; shown on the minimap. Downed players are revived when the wave is cleared
  (sandbox: after 3 s); the match ends when everyone is down.
- Rewards: each player's save gets their own line of the host's report, after parsing (types, ranges,
  string sanitising) and plausibility clamping against the match length (kill rate, headshots <= kills,
  per-kind/per-weapon totals, wave count, score bound).
- Disconnects: leavers are announced and removed; rejoining with the code drops a player back into a
  running match; the host leaving ends the session with a "Host left" dialog; a 4-player cap; a 15 s
  timeout when no host answers. Offline: the Co-op entry and screen show an offline state with Retry.
- `?net=local` uses a BroadcastChannel transport between tabs (tests, local debugging).
- Tests: protocol validation, interpolation, clock sync, rate limiting, shot geometry, stat clamping,
  lobby/session handshake (authority, late join, room cap, host left). `scripts/e2e-coop.mjs` drives two
  pages through lobby -> match -> hits -> downed/revive -> results -> lobby -> host leaves, plus offline.

## 0.8.0 - Phase 8: Audio, VFX polish, performance, adaptive quality
- WebAudio engine (no files): compressor, sfx/music/ui buses tied to settings, voice cap, per-sound
  throttling, cheap stereo-pan + distance attenuation for positional sounds. Context unlocks on first gesture.
- Synth SFX: per-class gunshots (near and distant/muffled enemy fire), reload clicks, dry fire, swap,
  impacts, hit/headshot/kill cues, hurt, explosions, grenade throw, runner swipe, heavy wind-up, footsteps,
  pickups, objective chime, wave/alarm horn, level-up arpeggio, UI move/confirm/back/denied.
- Procedural music: minor chord pad bed + combat layer (bass pulse, kick, hats) that fades with the
  number of active enemies.
- Adaptive quality (`core/quality.ts`, pure + tested): four levels (render scale, DPR cap, shadows,
  shadow refresh rate, VFX density); 'Auto' steps down after ~2 s of slow frames and up after ~12 s of
  headroom, with warm-up and cooldowns; fixed presets also available. Live-applied, shown in the FPS overlay.
- Level shading plugin: distance-faded world grid, wall-base contact darkening, face tint, speckle.
- Enemy hit flash, ejected casings, landing dust + camera thump.
- Performance: nav-grid searches no longer allocate (generator removed) - CPU per fixed step with 10
  enemies fell from ~1.9 ms to ~1.0 ms and GC churn from ~3.6 MB/s to ~0.9 MB/s in the headless probe;
  camera collision rays reuse results; enemy movement reuses vectors. ~10 draw calls in a 10-enemy fight.
- `scripts/perf.mjs` performance probe. Fixed: sounds could throw before audio was unlocked.

## 0.7.0 - Phase 7: Avatar customiser and cosmetics
- Customiser with live 3D preview on the menu stage (rotate by right stick or drag): body type, head,
  hair, torso, legs, helmet, backpack, skin/hair/clothing/accent/boot/gear colours, clothing pattern.
- Procedural patterns via a StandardMaterial plugin with per-instance attributes (`pattern`, `color2`):
  stripes, camo, digital, tiger, checker, carbon, hex. Still one draw call per part shape.
- Weapon camos: Factory, mastery camos per weapon (Woodland, Desert, Urban, Tiger, Gold at mastery 1-5)
  and Store camos (Carbon, Arctic, Neon); picked in the Armory, shown in the preview and in matches.
- Cosmetic catalogue registers every part, pattern, camo, emote, title and emblem in the unlock table
  with level/price/mastery requirements; locked items can be previewed (with an Unlock button) but are
  never saved until owned.
- Emotes (wave, salute, point, dance, flex, clap, laugh) as procedural rig poses; 4 slots, d-pad
  right/down/left in matches, emote bar in the pause menu, cancelled by moving or shooting.
- Player tag: callsign (text or random), title, emblem, colour; shown on the profile badge.
- `scripts/e2e-cosmetics.mjs`.

## 0.6.0 - Phase 6: Progression, unlocks, upgrades, saves
- XP and levels (1-50, quadratic curve), credits, level-up bonus credits (`progression/levels.ts`).
- Match rewards from kills by type, headshots, waves/objectives, victory, accuracy, difficulty
  multiplier; clamped against bad input (`progression/rewards.ts`).
- Weapon mastery from kills (5 levels). Upgrade trees per weapon: damage, magazine, recoil, reload
  (5 levels each, credit cost scaled by weapon tier, player-level gates).
- Attachments (optic, barrel, underbarrel, magazine; 8 total) as multiplicative stat modifiers,
  one per slot, weapon compatibility rules. Suppressor reduces gunfire alert radius.
- Unlock tables (`progression/unlocks.ts`) for weapons and attachments with level/mastery/price
  requirements; free items auto-granted; extensible for cosmetics.
- Save system: IndexedDB profile with versioned schema (v3), migrations from v1/v2, sanitiser that
  repairs tampered values, automatic backups before migrations/imports/resets (last 3 kept),
  export to a JSON file (share sheet on mobile, download elsewhere) and import with confirmation.
- UI: profile badge (level, XP bar, credits, tag), Armory (loadout, stat bars with upgrade deltas,
  upgrade tree, attachment slots, mastery), Store (unlock catalogue by category), rewards breakdown
  with animated XP bar and level-up/unlock notices, Settings > Data tab.
- Locked/unaffordable buttons stay focusable for controllers and explain why when pressed.
- Spatial navigation scoring uses edge gaps (more reliable in multi-column screens).
- `scripts/e2e-progression.mjs`.

## 0.5.0 - Phase 5: Enemies, AI, modes, second map
- Nav grid (`ai/navGrid.ts`, pure): heights sampled from Havok at load, walls/cover/pillars rasterised
  analytically with agent radius, step-height connectivity, unreachable islands pruned. A* with string
  pulling, multi-source Dijkstra flow field (shared chase field, refreshed at 2 Hz), line checks.
- Enemies from `config/enemies.json` (validated): Grunt (rifle bursts, takes cover, peeks from low cover,
  steps out from high cover, abandons flanked cover), Runner (zigzag charge, lunge, melee), Heavy (armour,
  minigun wind-up, staggers). Perception with LOS + view cone + gunfire noise, accuracy that settles over
  time and drops against moving targets, separation steering, nav-constrained movement.
- Three-body physics ragdolls (ball-and-socket hips), budget-capped, settle then sink.
- Wave Survival: escalating compositions (pure, tested), off-screen spawn selection, intermissions,
  pickups refresh, scoring, game over -> results.
- Mission "Operation Blackout": pre-placed unaware squads, hold-to-hack terminals, intel cache, alarm
  reinforcements, timed extraction zone, 3 lives with checkpoints.
- Second map "Dust Depot": procedural 3x3 compound from modules (warehouses, container yard, ruins,
  plaza with high ground), seeded variation.
- Walk-over ammo/health pickups, objective props with HUD prompt and hold progress.
- Play setup screen (mode, map, difficulty), results screen (Play again / Main menu).
- Difficulty (enemy damage, accuracy, health). Spawn protection after respawn.
- `GameLoop.stepHeadless()` for fast automated simulation; `scripts/e2e-modes.mjs`.

## 0.4.0 - Phase 4: Shooting and HUD
- Data-driven weapons (`config/weapons.json`, validated on load): pistol, SMG, assault rifle, shotgun
  (9 pellets), sniper (swept-ray projectile with drop), plus frag grenade (`config/grenade.json`).
  Per-weapon fire rate, fire mode, spread (hip/ADS/move/bloom), recoil pattern, damage falloff, head
  multiplier, magazine, reserve, reload time, ADS zoom, move speed, impulse, primitive model parts.
- Pure stats maths (`weapons/weaponStats.ts`): upgrade tracks (damage, magazine, recoil, reload), falloff,
  spread, recoil pattern, DPS. Unit-tested, including balance invariants.
- Hit detection: crosshair ray from the player's depth along the camera, then muzzle-to-aim-point ray;
  shoulder-to-muzzle check so cover in front of the barrel is respected. Head and body hit volumes.
- Damage registry, health + regenerating shield, explosions with line-of-sight and falloff, explosive
  barrels (chain reactions queued), prop impulses, player death and respawn.
- Aim assist (friction, magnetism, ADS snap) for controller and touch, levels Off/Low/Standard/High.
- Recoil (mostly transient with recovery), camera shake on firing/explosions, controller rumble.
- Pooled instanced VFX: tracers, muzzle flash, sparks, dust, bullet decals, explosions.
- HUD: health/shield, ammo + grenades, dynamic crosshair (spread, on-target), hit/headshot/kill markers,
  reload ring, damage direction arcs, low-health vignette, compass with markers, rotating minimap,
  objective line, banner, interact prompt, feed.
- Sandbox mode: all five weapons, infinite reserve, training dummies (static and strafing) that respawn.
- `scripts/e2e-combat.mjs`.

## 0.3.0 - Phase 3: Player, camera, test map
- Havok `PhysicsCharacterController` player: walk/sprint/crouch/roll/jump, slopes up to ~50°, ray-probe step
  assist for steps up to 0.42 m (Havok's own step-up needs the sweep to clear the capsule radius), ground
  stick force along the surface normal, headroom check before standing, render interpolation.
- Over-the-shoulder camera: shoulder swap (smooth), ADS boom and FOV zoom, boom collision against static
  geometry (snap in, ease out), recoil with recovery, trauma shake, smoothed foot height, horizontal FOV.
- Modular level kit: boxes/ramps/stairs/walls/cover/pillars rendered as thin instances (1 draw call per
  shape) and one static Havok body with a container shape. Stairs collide as a smooth invisible ramp.
- Primitive modular character rig (body type, head, hair, torso, legs, backpack, helmet) with procedural
  walk/crouch/roll/air/aim animation; parts are instanced from a shared part library (per-instance colour).
- Physics props (crates, barrels, explosive barrels, boxes), instanced, budget-capped, pushable.
- Proving Grounds test map: step row, slope row, stairs and ramp onto a platform, crouch tunnel, cover.
- Sky dome, fog, sun with optional shadow map following the player.
- `scripts/e2e-move.mjs`: automated movement checks (walk speed, jump, crouch, roll, steps, slopes, stairs,
  tunnel, prop pushing).

## 0.2.0 - Phase 2: Input and menus
- Action map with touch, gamepad (standard mapping) and keyboard/mouse sources feeding one `InputState`.
- Touch: floating left stick (push past rim to sprint), right-side look, fire-and-look button, ADS, reload,
  jump, crouch/roll, swap, grenade, interact, shoulder swap, pause. Size, opacity and per-control position
  configurable; drag-to-edit layout editor that also works by controller (grab, move, resize).
- Gamepad: radial dead zones, trigger dead zone, response curves, invert-Y, per-axis and ADS sensitivity,
  aim-assist level setting, vibration with test button. Hot-plug, iOS first-press detection, connect toasts.
- Automatic input-mode switching (touch / controller / keyboard), Xbox and PlayStation glyph prompts.
- Shared spatial focus-navigation system; screen stack; main menu, settings (Touch, Controller, Video,
  Audio, Gameplay tabs), pause menu, confirm dialog, toasts. Bumpers switch tabs.
- Settings stored in IndexedDB, sanitised/clamped on load.
- Controls test bed showing live action state.
- Headless e2e suites: controller-only menu walkthrough and touch multi-touch test (`npm run e2e`).

## 0.1.0 - Phase 1: Scaffold
- Vite 7 + TypeScript 6 (strict) + Babylon.js 9 + Havok physics with locally bundled WASM.
- Fixed-timestep game loop with manual physics stepping.
- PWA: manifest (fullscreen, landscape), procedurally generated icons, Workbox precache of the full build incl. WASM.
- Rotate-to-landscape overlay, fullscreen/orientation-lock helper, browser gesture suppression, safe-area CSS vars.
- Debug overlay (F3 / 3-finger tap / `?debug=1`): FPS, frame-time graph, sim/physics ms, draw calls, resolution.
- GitHub Actions workflow: lint, test, build with repo base path, deploy to Pages.
- Headless mobile-emulated smoke test script.
