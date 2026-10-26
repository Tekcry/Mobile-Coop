# Manual test checklist

Desktop only (G12): pad first, then keyboard and mouse. One current checklist plus the release checklist (G92). Run it
on the build under test: the live game, the one chosen preview (G85) or a local `npm run dev`. F3 (or `?debug=1`) shows
the debug overlay. Tick each item; note anything off in Pause > Report feedback.

Items marked (CT prototype) describe today's movement as built. CT movement values are not build targets: CT movement
references are ignored (G210) and Michael tunes movement himself (G227), so test what is built, never a CT target.
Default buttons: `docs/systems/input-and-loop.md`, "Binding table". Older per-version lists:
[docs/archive/testing-history.md](docs/archive/testing-history.md) (3.0.0 to the consolidation) and
[docs/archive/TESTING-pre-3.0.md](docs/archive/TESTING-pre-3.0.md); per-job lists moved out on 2026-10-25 (conformance T22):
[docs/archive/testing-job-sections.md](docs/archive/testing-job-sections.md).

## Desktop checklist

### Boot and menus (controller)
- [ ] Launch: a black screen with only NIGHT / SHIFT (no loading text, no progress line); when Wren, the weapons and
  the shaders are ready, only "Press (any) to start" fades in, and the wordmark never moves. Wren is not visible at all.
- [ ] The menu theme plays on the title (or starts on the first key or click if the browser blocks autoplay). The press
  makes Wren's goggles flicker on in the dark on the goggle close-up, then the lights come up; no model swap or hitch.
- [ ] B / Esc on the main menu does nothing (no way back to the title). After a match the menu comes back lit, with no
  title and no flicker.
- [ ] Main-menu shots: Wren holds the rifle or the pistol (the other on the thigh or the back); no hand through a
  magazine, no floating parts.
- [ ] Every menu works by pad alone: the stick and d-pad move the focus ring, A selects, B goes back, LB / RB switch
  tabs, sliders and choices change with left / right. Prompts show the pad's glyphs (Xbox letters or PlayStation shapes).
- [ ] The main menu shows Sector Ops, Co-op, Loadout, Settings and Feedback (Missions, Training and Free roam only with
  `?legacy=1`). Sector Ops opens the op list (Saltmarsh Park and the old Warehouse op, four stars each), then its
  briefing: the sectors listed, Difficulty (Rookie, Normal, Realistic, Perfectionist, no sliders), Weather, Start.
- [ ] Sector Ops on Saltmarsh Park (`campusOps`): five sections, S1 gatehouse and car park, S2 HQ atrium, S3 labs, S4
  data hall, S5 Old House. Each objective unlocks the connector room's door; standing in the room shuts it behind you,
  the next section loads and the far door opens. The extraction shows time, kills, times spotted and GHOST when there
  were none. Being seen raises ALARM STAGE and more guards come. Going down restarts the section at the room. Solo
  finishes it (team doors keep a solo route, G280).
- [ ] (G339) No minimap, compass or objective dots in Sector Ops, Marlow Yard (co-op) or free roam; the Marlow drill
  pointer and pings still show.
- [ ] (legacy map) Sector Ops Warehouse (`warehouseOps`, three sections) with night vision off: each section's routes
  and objective read by lamp light, with dark
  pockets between; sections 2 and 3 each offer three routes (`docs/archive/warehouse-s23/WALK.md`). Every lamp is an LED
  fitting (sector-fixes L): a flush panel under a room ceiling, a strip on short wires under the roof, a slim bulkhead on
  a wall bracket; a room's fittings share one height on a regular grid or row (some dark, over the pockets), none stands
  on the roof or near a climbing pipe, ladder or duct (the yard drainpipe's lamp is 1 m beside it); none floats or pokes
  through a ceiling; a lamp switched off or shot goes dark on its diffuser. The roof's open strips are pale corrugated
  sheets (moonlight still comes through); the walls carry pipes, trays, signs and fire points, trusses span the roof,
  and the halls' dead corners hold pallets, drums and cartons, none on a route or patrol.
- [ ] (fog fix) Saltmarsh Park on Epic, then High: the atrium, the S3 hall and the L1 offices read clear across the room;
  ceiling lights glow with a short, faint haze under their shade (no long beams), guard torches still beam, and the
  light meter reads as before.
- [ ] Sector Ops stars: finish a run on a difficulty; back on the menu that difficulty's star and every easier one are
  filled beside Sector Ops (Saltmarsh Park's stars) and in the op list (best time in the context panel). Co-op Sector
  Ops: the HUD shows Syringes (2 on Normal); a downed partner is revived until they run out, then a down restarts the
  section with both players at the room.
- [ ] (sector-batch) Sector Ops result: a run with no kill and no alarm ends "PERFECT" on the result line and the
  extraction banner (with "GHOST" too when never spotted); an alarm takes Perfect away.
- [ ] Sector Ops restart: get spotted (alarm, alert music), use some ammo and a gadget, go down. After "Restarting from
  checkpoint" the music fades to silence, the guards are back on their routes unaware, the guns are full (the rifle
  suppressed), the gadgets are back and health is full; a suppressed shot away from the guards alerts nobody.
- [ ] Section rating: clear a Sector Ops section unseen; as the connector shuts, a card shows four ticks and the
  rewards that land (none with a full kit and health; use a gadget first and it names the charges), then fades. Set off
  an alarm (panel or camera) in the next: No alarms is a cross. The results list one line per section.
- [ ] Marlow Yard rating: clear A2 unseen with a gadget used; as its airlock seals a card shows four ticks and the
  charges. In A3 get seen, restart the set: the card at its exit ignores the sighting. Co-op: both screens show it.
- [ ] (sector-fixes R) Co-op Sector Ops, each section: leg-up your partner onto a 4.4 m lip (section 1 the high door
  in the yard facade and the hoist rail in goods-in; section 2 the high-bay rack R3S from the east gangway and the landing high on the east wall over the gangway; section 3 the valve platform
  in the east bay and the crane drive over the CNC cell, each climbable onto under its roof hood); they relay or drop the
  rope for you; alone, the lip cannot be reached. Each team door is locked from your side; your partner unbolts it from the other side; a restart bolts it again.
- [ ] (coop-walk-fixes) Co-op, two pages: one player grabs a guard (hostage); the other, beside them, gets TEAM TAKEDOWN on him and it knocks him out (the hold ends, DUAL TAKEDOWN banner), both ways (host holding, joiner holding). A partner's single shot plays once; a partner's suppressed pistol sounds suppressed.
- [ ] (coop-rejoin) Co-op Marlow Yard, two pages: at the start, after a set restart and after "Start at A3" the two
  players stand on separate spots (never inside each other). Play into A3 (past its airlock), then close the joiner's
  tab and rejoin from its menu (or toggle its network off and on): the joiner comes back in the A3 entry airlock (or
  beside the host if that airlock is shut off), with A1-A2 done, the A3 doors as the host has them and the HUD on A3,
  never at the yard start. Same in Sector Ops in section 2 or 3.
- [ ] (coop-carry) Co-op, two pages: the joiner knocks a guard out, walks to the body and picks it up (Pick up body): the 2 s lift, then it rides on the joiner's shoulder on both screens (the joiner bent, slow); the joiner hides it at a hiding spot (gone on both) or puts it down (a ragdoll on both, a guard nearby hears it). The host's own carry now shows on the joiner's screen too.
- [ ] (pose-parity) Co-op, two pages: a partner aiming from the left shoulder while holding a hostage or on a rope shows the gun in the left hand; a partner's choke shows no elbow wind-up.
- [ ] Lamp light (LR16a: one photometric model, no Lamp falloff row in Settings > Gameplay): start Sector Ops: the S1
  goods-in floor between the strips reads lit (meter and picture agree), Marlow station 2 still reads; a guard's torch
  beam has a soft edge, and the meter fades with it at the beam's edge (LR16 fix).
- [ ] (section-bake) Saltmarsh Park cold load: clear the site data (or a private window), start the campus and time
  the load against the last build: it starts sooner. In S1 the car park floods and the meter read as before; within
  the first minute nothing on screen pops (far buildings' lamps fade in). Play into S2 through C1: S2 is lit at once.
  Co-op: a client joining while the host is in S2 or later gets the section's lamps within seconds. Reload: a warm
  load as before.
- [ ] Failing tube (LR16-5): stand under the stutter tube (Warehouse Ops: the trade offices corridor panel, west half;
  campusOps: HQ L1 breakout kitchen; Marlow Yard: the A7 south rack strip): every few seconds it chatters or drops
  out, the floor, the fitting and the light meter go with it; shoot it and it stays dark.
- [ ] Swinging pendants (LR16-5b, Marlow Yard only): fire past a hung fitting (the A4 aisle-2 strips), or throw a
  grenade near it: the fitting and its two rods swing as one, up to a hand's width, and settle in about 15 s; the pool
  of light, a guard's shadow and the light meter sway with it. Shoot one out: it swings dark. Co-op: both players see
  the same swing (no lag beyond the kick).
- [ ] Co-op: Host a room starts on Campaign (Marlow Yard); the Mode row offers Campaign and Sector Ops only.
- [ ] Co-op guard torches (coop-torches): on a dark map, when a guard searching in the dark switches his flashlight on,
  the joiner sees the same beam from his head, aimed where he faces, and it goes off when the host's does; standing in
  it raises the joiner's light meter as it raises the host's.
- [ ] Search after combat (guard-ai S25): get seen, break contact and crouch in a dark corner or behind cover a few
  metres from where you were seen: the first searcher comes to it and looks into it. Hide farther, in light or behind
  a wall: they search the near dark spots first; a body or a device search still walks its ring.
- [ ] Heard in a search (guard-ai S26): get seen, break contact, then run (standing) behind a searching guard in the
  dark: he turns and comes to where you were, looks round there, then carries on searching. Crouch-walk past him
  instead: he does not. In a fight out of his sight, run a few metres to his side: he turns to where he heard you.
- [ ] Co-op two intruders (guard-ai S24): split up and get seen apart (host in one room, joiner in another): each
  fight stays on its own player (the guards who saw the host hunt the host's last seen spot, the joiner's hunt his);
  out of sight, nobody walks to where a player really is without having seen or heard him. Solo is unchanged.
  (coop4, once 3-4 players can join Sector Ops) The same with three or four players apart; on an alarm the
  reinforcements go for different players, the one the alarm raiser saw first; 2-player play is unchanged.
- [ ] Co-op guard AI (guard-ai S9): on the joiner, guards' lines and radio calls show as on the host; a cautious guard
  carries his weapon at low ready on both screens; after an alarm stage 2 / 3 the joiner sees the vests and helmets and
  a response team's shield; the joiner's headshot on a helmeted guard pings as a deflect and the helmet falls on both.
- [ ] Co-op every player seen (guard-ai S23): hide behind a wall near a guard while your partner stands in his light in
  front of him: the guard spots the partner and fights him; walking nearer behind the wall does not make him stop.
- [ ] Co-op throw onto a guard (throw-ko): one player stands and offers the partner throw (RB standing), the other runs
  in about 3 m in front of a standing guard and is thrown over: the guard drops knocked out as the partner comes down
  on him, on both screens; a guard a step or more past the landing is left standing. Try it with each player thrown.
- [ ] Co-op on the High or Epic preset, host and joiner in two windows (side by side, then one over the other): each
  sees the other's character, and the joiner's "Connecting to host" goes away once in the match.
- [ ] Marlow Yard (marlow-final; two tabs `?net=local&autostart=ctcourse&mode=course`, or Co-op > Host): eight sets A1-A8
  in a luxury training hall, no explainer pads. Both screens show the objective table and your own A or B line (the lines
  swap once the first player takes a job); a radio line follows each step; each holding room's pad cycles only with both
  on it (near door locks, far door opens); a bay restart brings an alive partner back; every glass wall, LED cove and
  sliding door (Open only, no swing-only verbs) reads as a rehearsal centre; every set is lit and the players make the dark.
- [ ] Marlow Yard records: the old best times (bays S1-S8) no longer show. The bays are now A1-A8, so the record starts
  again (no save migration). Co-op > Host > Start at lists A1-A8 once the bay before was finished.
- [ ] Marlow Yard A1 Gate: no panel needed: the lounge door, the striped mark and the bolted wicket say what to do; the
  leg-up from the mark lands on the wall top, drop into the yard, unbolt (refused from the apron side); the relay variant
  works; no way over alone (cabin, wall end, gallery sill).
- [ ] Marlow Yard A2 Carriage Shed: press a neck cabinet: the neck is dark 15 s on both screens ("Lights back in", warning
  at 5 s), the shunter comes to look; the other cabinet refuses while re-arming; take him from the coat corner; cross in
  the dark, then back the other way; the staging deck (leg-up at the mark) is slower and silent when crouched.
- [ ] Marlow Yard A3 Office Range: jam the corridor camera for your partner (recess hide spot, then the east lobby), swap;
  a seen player is sent back to the west lobby with LANTERN's line, also with the corridor lights off (the camera sees in
  the dark); an office switch lures the cleaner; the lobby coves stay lit when an office is off; desks read as desks.
- [ ] Marlow Yard A3 hall camera: shoot it. It ricochets with sparks and keeps watching; jam it instead to blind it.
- [ ] Marlow Yard A4 Goods Shed: take the officer, loop the cameras at his console: 60 s on the HUD, "Cameras back in" at
  5 s, a press inside the 20 s re-arm refuses; back aisle dark, main aisle lit; two loaders go down together (or the
  kettle break, or the floor switch lure); the push bar opens L4's east door; read the rack signs and the video wall.
- [ ] Marlow Yard A5 Substation: in night vision the beams show across the gateway; throw your partner over while the
  patrol's back is turned, he lands in the dark pocket; jam the floodlight, he keys the kiosk release: the beams go off for
  good; jamming the beam panel is the other way (a beam touch raises the alarm stage, no health cost); the towers have no
  collision. Known open: one player can jam the panel, let go and walk through its 1.5 s reboot.
- [ ] Marlow Yard A6 Pump House: leg-up onto the dark west end of the motor gallery, the rescue line up, along to the
  bridge; lower your partner head-first to the drive panel, he holds the isolate key 3 s (the buzzer is noise: the attendant
  hears it, host or joiner) and is pulled up; the staff stair's open side holds you from the third tread, its foot is open.
- [ ] Marlow Yard A7 Data Hall: split, A through the hall, B along the plant corridor under the sweeping camera (blind
  windows, silent crouched on the grating); both terminals' ready lamps show through the mesh; hack together (2 s,
  within 1.5 s of each other; late costs 10 HP, never below 1); the cage and the east door open; cooling-unit lees hide.
- [ ] Marlow Yard A8 Strongroom: from the vestibule read the 40 s round; leg-up at (109.5, 68.25) onto the return; jam C2
  from behind the counters so A crosses the gallery unseen; take the officer, loop the cameras (60 s); cut the hall lights
  at the board (25 s, 12 s to the grille), slip through, shut it; throw over the beam curtain; both time locks together;
  the vault opens onto the cash dock; both in the exit zone ends the run.
- [ ] Marlow Yard timing: a first co-op run by a pair who know the controls takes 15-20 min (target 18 min, SPEC section
  10). Note the time per set and any wait over about 30 s with nothing to do.
- [ ] Marlow Yard restart: die or restart at a checkpoint mid-set. Guards, bodies, doors and cameras are back as at set start.
- [ ] Marlow Yard GPU look (pending PC run): gallery glass reads as one clear layer; coves, rack and desk skins show no
  z-fighting; the frame time of each set (A2 685 skins, A4 667, A6 725 are the heaviest).
- [ ] (interrogation-intel) Interrogate a guard with information: after his lines the feed shows `Code: ...` (when authored), `Cameras near: n, sweep a-b s` and `Patrols near: n, loop a-b s`; in co-op the partner sees the same lines (a client's interrogation too).
- [ ] (stealth-pays) An interrogation's door code now acts: Course mode sets it as a course flag (a gate listing it in `externalFlags` opens); Sector Ops holds it for the section (the matching keypad prompt turns to "Enter code" and opens; a section restart drops it). Pending until a map authors guard `info` codes. Checks: `tests/intelPartB.test.ts` (Course flag, repeat is one `flagSet`), `tests/sectorIntelCode.test.ts` (`grantCode`, restart drops it, keypad opens); `e2e-ctcourse` (appended check: `onIntelCode` sets `hasFlag`) and `e2e-sectorops` (check (a2): `onIntelCode('s4-codes')` turns kp-batt to "Enter code") drive the mode hook directly; the real interrogate chain stays in `e2e-takedown` `grab-interrogate-intel`.
- [ ] (joint-interrogation) Co-op: the partner beside a held A8 officer holds A, BLUFF; the holder INTERROGATEs within 6 s: both see the two joint lines; a solo read gives only his two lines.
- [ ] (hang-down) Co-op hang-down over a guard (any edge with a drop, e.g. a Sector Ops mezzanine): hanging, LT draws
  the pistol (never the rifle) and aims upside down, RT fires; hold A lists GRAB CHARACTER on a guard by your head (he is
  lifted, then RT tap / Z knocks him out, RT hold kills, no let-go); RT on him without the menu: tap chokes, hold snaps
  the neck; the partner pulling you up while you hold him knocks him out. Check it as the joiner and as the host.
- [ ] Loadout: primary (Heron Carbine) and sidearm (Hush 9 SD), attachments, gadget, presets; nothing to buy.
- [ ] Settings > Controller: vibration on / off and strength. Settings > Controls is the only Controls place (Pause has
  no Controls item): Remap controls rebinds a verb (A), clears a slot (Y), a conflict shows a warning, reset restores
  the defaults.
- [ ] Settings > Gameplay has no "Mocap locomotion" row; Wren walks / runs with the mocap clips even on an old save that
  had it off (only `?mocap=0` or the tuner's Mocap box shows the hand-keyed set).
- [ ] Unplug the pad mid-match: no stuck movement or firing, keyboard and mouse take over; plug it back in and press a
  button: the pad works again without a reload.

### In a match (controller; Free Roam on Proving Grounds, then Infiltration on the Warehouse at night)
- [ ] Moving (anim-rework S1): how far you push the stick sets the speed, smoothly from a creep to a run (no speed
  buttons; d-pad up / down do nothing in play); most of the travel is creep / sneak / walk, the last fifth jogs and
  runs. Keyboard: WASD walks, hold Left Shift to run, Left Alt to creep. B crouches; a stop holds the stride, then
  settles. A part-pushed stick is silent; a full stick is audible.
- [ ] Weapon states (anim-rework S1): X taps the gun out to low ready (explore camera) and away again; hold LT to aim
  (over the shoulder), let go and it drops to low ready; LT from holstered draws straight to the aim, slower (the rifle
  comes off the sling round the right side, muzzle down under the arm, then up into the shoulder). Aiming, strafe both
  ways and back up: short side-steps, the feet never cross or splay, the gun steady (anim-rework S3).
  RT fires only while aiming (each shot kicks her hands and chest a little, settled in 0.3 s; aimed into a wall up close
  the gun tips muzzle-down and comes back up when you step off, no stall); holstered, RT tap knocks a guard out, RT hold kills. Hold X with the gun out to reload.
  Y over a wall at low ready or aiming: the gun goes away for the climb and comes back after. A opens doors and uses
  things at low ready and aiming too. Aim the pistol at a camera, a light or a laser's power panel and hold RB (keyboard F) to jam it; aiming
  alone does not jam, and RB not aiming the pistol is still the co-op action.
- [ ] Body motion (anim-natural-n2): walk, jog, sneak and crouch walk holstered: the hips and shoulders turn against each
  other with each step, the hips sway over the standing foot, the head turns a little with the chest and nods; aiming
  and side-stepping, the hips swing under a steady chest and the gun and head stay on the aim. No pop speeding up,
  slowing down or crouching. Guards walk as before.
- [ ] A at a wall puts your back to it; slide along it, stop at the edge, A to leave (CT prototype).
- [ ] (G6) Crouched on a wall: side-on, a hand on the knee, turning through facing out on a reversal; Open from the door
  menu steps to the latch side and pushes the door with a hand; the edge peek puts the head just past the frame.
- [ ] Y climbs and uses: ladders, drainpipes, ledges (shimmy, climb up), pipes, ducts, windows, the split jump, wall jump,
  rappel and fences on the Proving CT course.
- [ ] Light: a lit pool on the light meter is lit on screen and guards there see you; a dark corner keeps you hidden
  (light parity). Shooting a lamp or a switch darkens it for the meter and the guards at once.
- [ ] Character shadows (LR14, High and up): under a lamp near you a guard, your partner, a body or a held rifle throws
  its real silhouette on the floor and walls (arms, legs, crouch), steady as you walk between lamps; at Medium (or
  Graphics > Character shadows Off) the soft capsule shadows return.
- [ ] Guard shadow in view (guard-cap T1-SHADOW, A195): Marlow, a guard just out of view under a lamp, his shadow in
  view: his shadow's feet do not step or slide (`&animshadow=0` shows the camera-only 1/8 rate).
- [ ] Guard alerts (guard-ai S1-S3, Sector Ops): a thrown bottle sends one guard over while the others only turn; shoot
  a lamp with guards near and one or two check it and go back calm. Get spotted: the spotter shouts "Contact!" (guards
  within a few metres join at once), about 2.5 s later radios it in, then the rest of the section joins one by one,
  nearest first. Take the spotter down before his radio line and nobody beyond shouting range comes.
- [ ] Bodies and caution (guard-ai S4): kill a guard in view of another: he shouts "Man down!", searches and radios it;
  take him out within ~2 s and the rest stay normal; let it through and the section stays on edge until everyone who
  knows is down. Knock one out and let him be found: the finder wakes him, both search ~1 min, stay on edge ~3 min,
  then normal; nobody else changes.
- [ ] Posted guards (guard-ai S5; once a map has a high-security post, e.g. the campus keyholders): throw a bottle or cut
  the light near him: he walks to the edge of his area, looks toward it ~5 s, walks back and faces his post; he never
  follows a search or chases you out of his area.
- [ ] Alarm by radio (guard-ai S6, Sector Ops): get spotted and let the radio calls through: "Command, contact. Send
  backup.", ALARM STAGE about 6.5 s after the spotter saw you, and reinforcements run in hunting. Take the spotter down
  before his first radio line: no alarm, nobody comes.
- [ ] Barks by cause (guard-rules S4): let a guard glimpse you at the edge of a light: he says a seeing line ("Thought
  I saw something."); throw a bottle near another: he says a hearing line; neither ever says the other kind.
- [ ] Squads and dogs (guard-ai S5b, Sector Ops): knock a guard out unseen and wait up to ~40 s: his squad's radio
  check misses him and two squad mates walk to where he went down and wake him. A dog stays with its handler; drop the
  handler and the dog stays by him and barks.
- [ ] Cameras see bodies (guard-ai S7, Sector Ops): knock a guard out where a camera sweeps (lit or dark): the desk
  radios "Camera N has a man down..." and the nearest guard walks over and wakes him; loop or jam the camera first and
  nobody comes.
- [ ] Guard tactics (guard-ai S8): get spotted by 4 guards and break line of sight: the caller drops back into cover,
  one moves up cover to cover ("Moving up!"), one covers from cover ("Covering!"), one goes round the side
  ("Flanking!"); never more than one of them moving up at once, nobody runs at you in the open.
- [ ] Guard cover and fire (guard-ai S27, Sector Ops): break sight on a group of 3-4: nobody stands upright and still in
  the open (they crouch, then take cover within ~3 s); the covering guard fires at your last spot only where he has a
  clear line (no rounds into a wall); the caller throws no grenade while he is on the radio. Trip a camera or a laser:
  every guard in the section draws his gun and none holsters while the alarm stage holds.
- [ ] Guard AI polish (Sector Ops): break sight on a group next to a wall: no guard walks a long way round to cover
  behind it, none freezes in the open (A2). Trip a device, then make a noise near its responder: after his look he
  searches the device room again (A1). Cut a breaker, let a guard relight it, cut it again inside a minute: after the
  light check it is relit, never dark for good (B1). Co-op: a guard who only heard player 1 never walks to player 2;
  hunted by one guard, show him player 2: one radio call names player 2 (A3 / A4).
- [ ] Guard AI polish 2 (Sector Ops): make a noise behind a locked door a guard cannot open: he walks to the near side
  of it, looks about 4 s and stands down, not 20 s on the spot (A184; Marlow A7 cage). Make one noise with three guards searching: one "I heard
  something." line, all three still go (A185). Break sight with a squad: the covering guard behind a high wall steps to
  his edge and fires at your last spot while a mate moves up (A186). Three guards searching after a fight: one looks
  at your last known spot once, the others go to their search points at once (A188).
- [ ] Report, then attack (guard-ai walk 4.82 items 2 and 6, Marlow Yard): get spotted by the station 2 guard and break
  line of sight: he takes cover and radios it in, then (call done, a few seconds with no sight of you) leaves cover and
  moves up on where he last saw you, still in the fight, and searches from there; he does not sit in cover and go
  cautious. Once station 3's camera is a training camera (`guardResponse: false`), being seen by it sends you back but
  no guard comes for you.
- [ ] Helmets and armour (guard-ai S12; once a section has `gear`, or set one with `e.setGear` in the console): shoot a
  helmeted guard in the head: steel-blue hit marker and a ping, the helmet falls to the floor and stays, he reels and
  comes up shooting; a second head shot kills. An armoured guard shrugs off chest rounds (a short stagger, not every
  round); a takedown drops either in one move.
- [ ] Guard models (guard-models; add `?guardmodels=1` to the URL until G8 makes it the default; `?guardmodels=0` is the old body):
  - Variety: on a map with several guards (Sector Ops, Marlow Yard, the Warehouse) the guards are not clones: three
    builds (grunt, droneOp and officer average; runner and sniper lean; heavy and enforcer broad), different faces, skin
    tones, hair and hair colours, caps, beanies, a boonie on a sniper, a headset on the drone operator, a peaked cap on
    the officer, glasses on some (the sniper always dark ones). The heavy and enforcer wear a balaclava, no hair.
  - Faces: at 1.5 m and 3 m the eyes, brows, nose and mouth read, no gap or step at the neck, no hair floating, the cap
    sits on the scalp; far away (> 25 m) the guard is a plain, correctly coloured figure, no flicker at the LOD switches.
  - Helmet knock-off: raise the alarm to the helmet stage (two alarms in Sector Ops on Rookie / Normal, or `e.setGear`
    in the console); the helmet shows only then, the cap and hair under it are gone; a head shot pings and the helmet
    leaves his head and falls to the floor as the same helmet (his faction colour), the hair or cap shows again. Vests
    show only with the armour stage; the heavy shows his plate; the enforcer carries the shield on his left arm.
  - Same looks after a restart: note three guards (a face, hair, cap); restart at the checkpoint or the section: the same
    guards in the same places look the same.
  - Bodies: carry and drop a guard: the body keeps his face, clothes and helmet state; thermal and night vision show him
    like before (no extra glow, no missing piece); the shadow of a guard has no helmet after the knock-off.
  - Co-op, both screens: host and joiner see the same man in each place (face, hair, cap, outfit, vest, helmet), the
    helmet falls on both screens, and a restart keeps the looks on both.
  - First frame: at level start every guard shows as a figure on his first frame, no hitch the first time one comes
    into view. The bake's guard files are bundled (`src/operators/assets/guards/`) but load only with `?guardmodels=1`;
    without it nothing changes (the old body, no guard file fetched).
- [ ] Talking pairs (guard-ai S10, Saltmarsh Park car park): watch the pair from cover: at their stop by the aisle end
  they face each other and swap two lines, then walk on; knock one out before they meet and ~6 s later the other walks
  to where his partner was headed.
- [ ] Armour (guard-ai S16, campus S4): stand on the data hall floor in front of the NOC window and get seen: the NOC
  pair aim at you but fire no round into the bulletproof glass (no sparks on it); after a moment they move (down to the
  hall, or another spot) or hold. A plain window still lets their rounds through.
- [ ] Response teams (guard-ai S13, guard-rules S1 / S5, Sector Ops, Normal): raise the alarm twice (guard-rules S5:
  once the first team is in and searching, or a minute later, a guard who sees you again raises the next stage; up to
  three guard alarms a section, Marlow Yard still one): every guard now wears armour and a helmet. In Saltmarsh Park
  sections 4 and 5 each alarm's team comes in behind a shield guard; in sections 1-3, the warehouse and Marlow Yard the
  team is armed guards only. Hide: after about a minute at your last spot the team walks the section point to point
  (shield first where there is one, the rest close behind, a look round at each, torches in the dark), still hunting
  minutes later; the cameras are as before. A restart drops the gear with the stage.
- [ ] Helmets and dogs (guard-rules S1 / S2, Sector Ops): on Realistic every guard wears a helmet from the start; on
  Rookie and Normal no guard does until the second alarm. On Perfectionist a head shot on a helmet only staggers him and
  the helmet stays on; a second head shot kills. Walk behind a dog: no takedown prompt (also in co-op on the joiner);
  gas knocks it out and the section can still end with "No kills"; shoot a dog dead instead: the rating loses "No kills"
  and Perfect and the score drops.
- [ ] Section alert (guard-ai S14, Sector Ops): knock a squad guard out unseen and wait for the radio check: "Unit N,
  report... Nothing.", then "a unit's not answering" on the radio; the section's guards walk slower and look longer for
  a few minutes (cautious), two search the spot. Do it again but take the caller down while he is still on the radio:
  nobody turns cautious. Fire an unsuppressed shot ~20 m from a guard: "Shots fired! Calling it in.", then a far guard
  who never heard it turns cautious and two guards come to the spot; no alarm. A suppressed shot: no call. In co-op
  the client's suppressed shot is heard as close as the host's (about 10 m).
- [ ] Breakers and dark lamps (guard-ai S15, Sector Ops): switch a room's lights off with two guards watching: one says
  "Breaker's gone again.", walks over at his normal pace and the lights come back about 2 s later, both stay calm;
  switch it off again at once: a full light check at the switch. Shoot a lamp out while no guard looks: the next guard
  who walks into view of it (within ~12 m) comes to check it; it stays dark for good.
- [ ] Guards relight (guard-ai LR16-4, Sector Ops): switch off a hall at its switch with a guard
  watching: a guard comes and switches it back on (a shot lamp stays dark); a timed isolator's lights stay off for its
  window (guards only come to look) and come back on their own.
  Campus S2: cut the reception panel board; #1 walks over and switches the atrium back on; take him at the board and it stays dark.
- [ ] Lasers (guard-ai S17, Sector Ops campus S3 or the warehouse): break a beam near guards, then climb out of the room
  unseen: two guards come to the middle of the beam and search that room only; the reinforcements search there too and
  never head for where you went unless one sees you.
- [ ] Dead bodies (guard-ai S18): leave a body where a patrol finds it and watch from cover: the finder and the guard who
  heard him search round it for about 3 minutes, spreading out to ~15 m, before going back on edge.
- [ ] Urgency (guard-ai S19): break a laser or let a camera alarm: the guards sent jog there; let a finder's "man down"
  report get through: a calm guard nearby jogs over to help search; throw a bottle: the one sent still walks over.
- [ ] Guards and doors (guard-ai S20): watch two patrols cross in a corridor and a guard pass a talking pair: they step
  round, never through each other; close a door on a patrol route: the guard opens it and waits for the swing, never
  walks through the leaf; a locked door is never crossed (guard-ai S28: his route goes round it; with no other way he
  stops short). Marlow A7: a guard whose round passes the locked cage door (`A7-cage-w`) takes the way round, no stall
  at the leaf; once the cage doors unlock, guards may path through them.
- [ ] Weapon carry (guard-ai S21): a calm patrol walks with his rifle slung on his back (an officer's pistol on his thigh),
  hands empty; make a noise: he draws (the rifle off the back in the right hand, under a second) and walks at low ready;
  seen, he fires only once drawn; calm again, he holsters after about 15 s. A high-security post, and every guard once
  the alarm is up, stays at low ready. Co-op (A126): on the client the same guard is holstered, draws and holsters
  with the host (a moment behind), never stuck at low ready.
- [ ] D-pad left (N) turns the goggles on and off; a guard's footsteps and your own sound right with the music in every alert state.
- [ ] Night vision in a dark room: green, readable with grey steps, no flat murk; Wren and the guards are shaped and not
  glowing white; lamps and fixtures glow, lit walls do not. The goggle frame is wide and thin (almost the whole screen
  clear, a soft dark band only at the edges and corners).
- [ ] Guards render (guard-render S1): in Sector Ops or Marlow Yard a guard close up looks normal, in thermal and in night
  vision (same shape, colours and pattern as with `?guardmerge=0`); it flashes on a hit and a downed guard ragdolls
  with no missing or stretched parts. A guard at the screen edge or on a stair does not pop out early. Heads, hands and
  feet cast shadows now (accepted).
- [ ] Wheel carousel: hold LB (Tab), put the cursor on the vision slot, A (E) cycles night, thermal, electro; release
  selects it. The wheel reopens on that mode. A off the vision slot does nothing.
- [ ] (LR16-6) Thermal behind a shut door: in Sector Ops or Marlow Yard pick thermal, stand a few metres from a shut door
  with a guard (or your partner) behind it: a dim blue figure in his pose shows on the door, moves as he moves, and goes
  when the door opens (his body shows instead), behind a wall or glass, or past ~14 m; your own body in front of the
  door still covers it. Every vision change (button or wheel) is an instant cut with the HUD label.
- [ ] (sector-fixes W) The wheel opens on the vision slot: hold LB and tap A with the right stick untouched, the mode
  cycles. Push the stick onto a gun, then let go of the stick: the vision slot lights again (nothing stays picked). Push
  onto a gun and let go of the stick and LB together: the gun is picked. Keys: hold Tab, E cycles; move the mouse out to
  a slot and back to the centre, the vision slot lights.
- [ ] The rifle hangs flat on Wren's back (stud on the back plate), the pistol sits in her thigh holster; aiming, her
  fingers wrap the grips, the support hand is under the launcher (rifle) or cups the trigger hand (pistol, arms out).
- [ ] Draw and holster: the current gun goes away (rifle over the right shoulder onto the back stud, pistol into the thigh
  holster) before the next comes out; no gun passes through the head, chest or legs.
- [ ] Draws and holsters (anim-natural N3): X draws the rifle in about 1.1 s, the pistol in 0.75 s, in one smooth move
  with no stop or flick; X again holsters slower (1.0 / 0.9 s). Tap X twice fast, or vault mid-draw: the gun goes back
  the way it came, no snap into the slot. RT while holstering: the holster hurries and the strike follows.
- [ ] Reload (hold X with the gun out; A no longer reloads): the magazine comes out in the support hand, goes to its pouch (rifle chest, pistol left hip) and a fresh
  one goes in; on an empty gun she works the charging handle / racks the slide. Swapping mid-reload leaves no magazine in
  the hand.
- [ ] Swap shoulders while aiming: the gun moves to the other hand and shoulder; a partner sees the same.
- [ ] Ladders, drainpipes, pipes, ledges, the zipline, rappel rope and fences: palms sit on the rung / pipe / lip / cable /
  rope / rail with the fingers round it, no hand sunk in or floating.
- [ ] LT held aims, RT fires (no hip fire, none from low ready); RT while holstered strikes (tap knockout, hold kill).
  Hold X to reload, LB tap switches between the two guns. The suppressed pistol and the issued rifle suppressor sound muffled and guards hear them less. The weapon box shows "SD n" (red at 5 or fewer) and counts down per suppressed shot; at 0 a feed line says "Suppressed rounds out: shots are loud" and shots sound open and alert nearby guards; an ammo crate refills quiet rounds; a checkpoint restart restores them.
- [ ] D-pad right throws the gadget (hold aims); holding d-pad left opens the wheel (time slows).
- [ ] Takedowns: A behind an unaware guard, GRAB CHARACTER (G7: the step-in and pull-in ~1 s; walk him at a slow pace;
  RT tap knocks him out and lowers him, RT hold kills, LT aims the pistol over his shoulder; Interrogate); a drop takedown from a pipe or ledge; a body takes 2 s to lift, carries at a slow
  walk, opens a door, and is put down beside you or hidden.
- [ ] The wall medkit station on Proving Grounds (Free Roam): hurt, then hold to heal +40; it shows spent; at full
  health it is refused ("Health full"). No other way heals.
- [ ] An Infiltration mission on the Warehouse runs to its results screen (rating shown, no rewards panel).
- [ ] Animation tuner: open it from Pause > Animation tuner (dev) (the match resumes with the panel open), Settings >
  Graphics > Animation tuner (dev) or F3 > Anim; on a phone the panel folds to its header (_ / +), scrolls, drags by
  thumb and closes with x, and Share / Copy shares, copies or shows the JSON. Walk: "arm swing amplitude", "stance knee
  flex" and "trunk / shoulder counter-rotation" sit at the top. Walk with the pad and drag "foot width / track" - the
  feet move apart live and the crab readout (F3, top left) changes; the picker follows walk / jog / crouch / wall / ladder; reload the page and the value
  is kept; Export downloads `anim-tune-<date>.json`; Reset group puts it back. Saved values stay applied with F3 closed:
  press Reset all before judging the game's own defaults.
- [ ] Animation tuner by pad (tuner-ui map, glyph strip at the bottom of the panel, never over a row): Pause >
  Animation tuner (dev) with A: the Body tab, "Pad: tuner · paused", the game holds still. LB / RB cycle the tabs (View
  ... Co-op, Settings, wrapping). Every value shows in a light box without touching it. On "State" A opens a list you can
  see; the D-pad moves, B backs out, A picks and the outline steps on to the sliders. A on a slider turns the outline
  green (edit): left / right step it (hold: faster), LT held fine, A keeps, B puts it back; X resets the row; B from a
  slider goes back to the State list; Y opens the menu (B closes it). View: "Pad: game", walk; View again: the game holds
  still, move a slider and the still pose changes. Hold R3: the untuned animation. Menu closes the panel. Settings >
  Size: Small / Medium / Large; the panel fits a 1080p screen and a phone in landscape. Labels are plain ("Foot width").
- [ ] Pause and the tuner: open the pause menu with the tuner open (and in the Anim Studio with a walk loop playing):
  she does not move behind the menu, the pad drives the menu. View tab: Side - the camera holds her side as she turns
  and walks; Unlock frees it.
- [ ] Free view: tools "free view" orbit - the right stick circles Wren, the triggers zoom, the left stick walks her;
  fly - the left stick flies, demo "walk" walks her in a circle; B ends it and the camera is back exactly where it was.
  "hide HUD" hides the HUD; "game speed" 0.25 slows the game; Pause / Step stop and step it.
- [ ] Speed section: walk at "walk speed" 1.5 - she walks faster; the note says it is gameplay and local only.
- [ ] Barrel marker: tick it with a gun out - a pink line and dot along the barrel, no grey screen.
- [ ] Import the exported JSON (tools > Import): the values come back; a wrong file is refused with a line in the panel.
  "wide ranges" doubles every range; typing a number in a row's field applies on Enter; the search box filters rows.
- [ ] Animation tuner Weight (anim-weight): every Weight slider at its default leaves the walk, jog, run, crouch and
  drawn movement exactly as before; momentum sliders change the local player only (time to speed, stop, turn rate),
  the lean / bank / plant / spring / anticipation sliders change the pose only (docs/archive/anim-tuner/WEIGHT.md).
- [ ] Animation tuner Clip speed (clip-speed): the Clip speed tab works by pad like the others; each slider shows
  "today: ... s at 1". Rifle draw speed 2: LT draws the rifle in half the time and it fires as soon as it is up; 0.5:
  twice as slow and it cannot fire until it is up. Rifle / Pistol holster (one row each), swap (LB), grenade throw and Every clip speed change their
  clip the same way; Start / Stop / Landing speed change the start-off shift, stop settle and landing dip. All at 1:
  exactly as before. Export, bake (`--only clip`), reset: same timing.
- [ ] Animation tuner Camera (tuner-camera): the Camera section's picker follows explore / crouched / low ready / aim
  rifle / aim pistol / wall / peek / climb / vent / hold; each slider shows "today: ..." in grey. In the yard move
  "distance behind" - the camera moves back live and glides; walk into a wall and it still pulls in (never through);
  Reset group puts it back; Export lists the `cam.` values.
- [ ] Base table (anim-joints J1): in the Anim Studio on a state loop, turn an elbow in Joints (and a hand offset in Hands &
  feet), Export, run `node scripts/anim-tune-bake.mjs <export>` (rows "baked (base table)", `src/anim/animBase.ts`
  changes), rebuild, reset those sliders: the pose looks the same. In a co-op pair loop (and with a partner) role B /
  the partner shows the same tune; the guard in a hold pair does not.
- [ ] Move rows (anim-joints J2): in the Anim Studio pick "traversal: vault the low wall", then in Body > Joints pick
  the state `Trav` > `Vault` (a studio loop turns follow off); turn her right elbow there: it shows during the vault
  only and is gone when she walks on. In the leg-up pair, `Team` > `Boost` > `B` moves role B only.
- [ ] Reload row (anim-joints J2): in play (follow on), reload; the Joints picker shows `Reload` while the reload plays;
  a left elbow edit there shows during each reload and not between them.
- [ ] Gear offsets (anim-gear): in the Anim Studio open the Gear tab, pick `holster`, slide x (and z) until the pistol
  sits out of the thigh, no clipping; pick `holster` > `crouch`, crouch: it moves on as she crouches and back as she
  stands; draw and holster the pistol: the hand goes to the moved holster. Export, run
  `node scripts/anim-tune-bake.mjs <export>` (rows "baked (base table)", `src/anim/animBase.ts` gets a `gear` key),
  rebuild, reset the Gear sliders: the same look. With a partner (or role B of a pair loop) the partner's sling socket
  and gear take the same rows; a guard does not.
- [ ] Goggles (anim-goggle): in the Anim Studio (or a match, the tuner open) turn night vision on (the goggles come
  down over her eyes), open the
  Gear tab, pick `goggles`, slide y / z and pitch until the worn goggle sits off the brow and clear of the face, no
  clipping; pick `goggles` > `crouch`, crouch: it follows. Vision off: the stowed goggle does not move (no stowed
  socket yet). Zoom out to LOD1 / LOD2: only the lens moves there (the housing is fused into the head), a known limit.
  Bake and reset as above: the same look; a guard never takes it (the partner and the studio puppets carry it but show the stowed goggle).
- [ ] Pause menu: Animation Tuner (DEV) only; Anim Studio from the main menu.
- [ ] Anim Studio (anim-studio): Main menu > Anim Studio (dev) (not from the Pause menu): a dark stage with a floor
  grid, the tuner docked on its View tab with the Loop player on top, the crab readout top left, the pad on the loop
  list. Pick "Walk clip": she walks in place, the feet stepping (green dots planted, orange rings swinging, short
  trails), and the Body tab shows Walk; Pause, "Key ▶" / "◀ Key" and the time slider move one key / any point; speed 2x;
  mirror; "Loop on the spot" off walks the circle; "Walk" (a state) on the spot: she walks without travelling, the
  feet sliding back under her; "Aim glide strafe" with on the spot off draws and strafes the circle. Ghost poses show the
  previous (blue) / next (orange) key once played; turntable circles the view; Front / Side / Back / Top lock the view;
  guard puts a figure at the hold spot. Move a
  slider, Ctrl+Z (or Y menu > Undo) puts it back, Ctrl+Y redoes; Store A, change, Store B, A/B flips; Save a preset,
  Reset all, Load brings it back. Quit to the menu: normal speed, no studio left.
- [ ] Anim Studio pairs and traversal (anim-studio-2): in the studio pick "pair: leg-up": two Wrens at the team block
  (north), B crouched with cupped hands, A walks in, is tossed up and hangs on the lip; Pause, "key >" moves both; the
  panel follows "Co-op: leg-up" (LT / RT: role A / B / contact). Move "A climber" body up: only A moves; a contact
  slider moves A only while the foot is in the hands. Try the relay, throw, hang-down (head first over the edge), rope
  (a rope from B's hands) and revive (B lying, A kneeling). "pair: hold_choke + guard_choke_sag": Wren and the guard
  choke on one clock. "traversal: ladder up and over the top": Wren walks to the ladder, climbs it, tops out, resets and
  goes again; the same for the vault, ledge, drainpipe, pipe, hang bar, vent, window, door, rappel and wall loops.
  Pick "state: idle": she is back in the middle.
- [ ] Anim Studio motion capture (mixamo-retarget M5): the Loop list has a "Motion capture (CMU): ..." group (walk, jog,
  run, sprint, start, stop, turns, sneak, strafes; Mixamo ones as "Motion capture (Mixamo): ..." once they land, the
  climbing ones on their props: picking one plays that capture there, flag or not; in a match the climbing
  captures play with `?mixamo=1`). Pick "Motion capture (CMU): walk": the Now playing
  line says "motion-capture (CMU) walk clip"; turn a knee in Joints (walk) or move a foot in Hands & feet: the capture
  follows; Arm swing is greyed (hand-made only) and changes nothing on it, as in the game. Walking in a match: "Now
  playing: motion-capture (CMU) walk". On a ledge, Body > foot reach rows are greyed ("Does nothing in this move").

### Keyboard and mouse
- [ ] A click captures the mouse (it never fires); W A S D move, the mouse looks, the wheel or = / - change the gear.
- [ ] RMB aims, LMB fires, C crouches, Space jumps, Caps Lock backs to a wall, E uses, F is the co-op action, R reloads,
  X draws / holsters, T / Q swap, Z knocks out, G gadget, Tab wheel, N goggles, middle mouse pings, V shoulder swap;
  Esc or P pauses and Resume re-captures.
- [ ] Settings > Mouse & Keyboard: rebind a key, a conflict warns, Esc cancels a capture.
- [ ] (marlow-bays slice T) Animation tuner (Pause > Animation tuner, or the Anim Studio): the cursor stays free; drag
  the scene with the left button to turn the camera, the wheel zooms, sliders and lists click; no shot fires. F4 (or the
  header "Mouse:" button) gives the normal mouse look and back; Esc in the game camera returns to drag view, no pause.
  Closing the tuner, a click captures the mouse again as in play.
- [ ] Click a slider row: it gets a yellow bar, the "▶" line names it, and a yellow ring sits on that joint / bone (the
  weapon for a gun row, both feet for Stepping), clear on a light wall and in a dark corner; other tabs move it.
- [ ] Anim Studio: tick "Keyed" on walk: the keyed walk plays; clear it: the procedural walk. Pick "Run" in the Body
  tab's Joints state list: the run plays, the tab stays. "On the spot" (header, F8, pad L3) on: she runs in place; off:
  she runs the circle. She is well lit as she moves; "Stage light" (View tab) dims and brightens her.
- [ ] (marlow-bays item 23) Anim Studio, Keys tab: pick Jog, Key 2, press "Later ▶" three times: the readout says
  "moved +3 (baked at 6)", the jog plays with that pose later in the stride; "◀ Earlier" stops at the key before it;
  Key 1's buttons are off (fixed). Ctrl+Z three times: back as baked. Export, then `node scripts/anim-tune-bake.mjs
  <export> --dry-run --only keys`: the row reads "baked (key JSON; rebake the clip)", target "jog.json key 1 phase".
- [ ] (marlow-bays item 25) Anim Studio, Keys tab: pick Jog, Key 2, press "+ Add key": the readout says "jog - key 3 of
  10 (mirror of 8) (added), frame 6", the pose does not jump; bend the left elbow: it shows there (and on the right arm
  half a cycle on). "Delete key": 8 keys again. Delete Key 3 (an original): the jog blends over it; Key 1's Delete is
  off; Ctrl+Z brings the key back. Pad: the D-pad reaches both buttons, A presses. Export and bake `--dry-run --only
  keys`: "baked (key added to the key JSON ...)" / "baked (key removed ...)", the meta regenerated.
- [ ] (marlow-bays T1a) Anim Studio, Keys tab: pick Jog, then Key 2: the jog stops on that key and the readout says
  "jog - key 2 of 8 (mirror of 6)"; "Key ▶", F2 and the pad's right stick right step on (the Key list follows), F1 /
  stick left step back. Click "Right forearm twist": the forearm is ringed; drag it: the forearm turns about itself.
- [ ] Keys tab: with Mirror on, bend the left elbow on key 2: step to key 6, the right elbow is bent too. Untick Mirror,
  set the right elbow at key 6 back: key 6 is straight, key 2 still bent.
- [ ] The playback bar shows on every tab (Body, Hands & feet, Keys ...): Play / Pause (F9, right stick up), the time,
  the speed, On the spot (F8, L3). In Hands & feet pick Pistol: she draws the pistol; Gun: Rifle swaps back.
- [ ] Loop list: "Aim standing", "Crouch aim standing", "Crouch aim moving" play with the picked gun; the Body tab shows
  "Aim standing" / "Aim crouched, still" / "Aim crouched, moving" as the state.
- [ ] An older tuner save (or export) with walk / aim / wall values loads: Crouch run, Aim standing and the crouched wall
  states show the values of the rows they shared.
- [ ] (anim-bake-1022) After a bake merges, open the tuner with your old save: the info line says how many values are
  now built in and that your other changes are kept; the baked sliders sit at their defaults, the rest as tuned, and she
  looks as before the merge. Reload: nothing resets again. Y menu > Reset baked gives the line again.
- [ ] (marlow-bays T2) Anim Studio at 1920 x 1080: the tuner sits on the right in the menus' look (their font, green
  focus bar), readable without leaning in; she stands in the middle of the space left of it, never under it; no health,
  compass, objective or ammo on screen. She reads clearly lit (suit detail and face visible, not washed out).
- [ ] Body tab: click her right elbow on the figure: "Showing: Right elbow" and only its sliders; click it again: every
  part. Click her left knee in the scene (no drag): the left knee is picked. A drag still turns the camera.
- [ ] Move a slider: it shows as a chip under "Pinned and recent"; ☆ pins it (★, a gold chip, kept after a reload);
  click the chip on another tab: it goes back to the slider. Fold and open a group by its header.
- [ ] By pad: from the tab's first list, D-pad up reaches the chips and the part list; A on the part list, pick Left
  knee: the focus lands on its first slider. Y > Pin / unpin this slider. A on a group header folds it.
- [ ] The status line in the studio: walk with Rifle picked reads "Walk · Rifle holstered"; Low ready "Low ready · Rifle
  drawn".
- [ ] Sizes S, M and L (Settings) and a 1280 x 720 window: the panel stays usable (tabs wrap, rows readable) and does
  not cover her. Outside the studio (Pause > Animation tuner) the panel overlays play with no dock; in co-op the same
  (no dock, the HUD stays).

### Co-op (two browser tabs)
- [ ] Two tabs with `?net=local` (or two PCs with a room code): Co-op > Host in one, Join in the other. The lobby shows
  both players and the host's difficulty read-only on the client.
- [ ] Infiltration on the Warehouse: both see the same guards, doors and bodies; a client takedown, door and objective
  register on the host; pings show on both; a downed partner is revived; results on both pages.
- [ ] Free Roam on Proving Grounds: brace and boost onto the 4.2 m block, the human ladder, a dual takedown; partners
  block each other (no walking through). The dual takedown banner shows on both; the host's `g.style.duals` is 1
  and `style.knockouts` did not rise from the pairing (e2e-coop).
- [ ] The Fallow bunker: open `?net=local&autostart=bunker&mode=course` in both tabs. The objective list shows for both;
  one player on an airlock pad shows "Waiting for partner"; both seal it; the rear door stays locked.
- [ ] (optic-coop) Optic cable seen by the partner: one tab, at a closed door hold A, OPTIC CABLE. The other tab sees her
  kneel in front of the leaf, her right hand down at the door's foot and a thin dark cable running out under the door;
  her view is not shared. When she pulls out (B) the cable shortens and goes, and she stands. Works both ways (host and
  joiner). (M2) R3 / middle mouse pings; a ping from the view marks what the tip sees on both tabs, also in the
  view's first moment. R3 while aiming a scoped weapon zooms and sends no ping; R3 otherwise pings and does not zoom;
  middle mouse pings while scoped too. Controls screen: Zoom and Ping both on R3 show no conflict (the pad note names
  the context); put another verb on R3 and it shows as a conflict.
- [ ] Close the host tab: the client is told and returns to the menu.
- [ ] (marlow-bays B+M) Marlow Yard in two tabs (`?net=local&autostart=ctcourse&mode=course`): as the joiner, grab a
  guard and walk: full hold speed, no shoving or jitter; on the host the guard stays in front of the joiner's body.
- [ ] A1: only the host does the leg-up, drops into the yard and presses the bolt: the wicket opens; the apron side shows
  "Bolted from the other side" to whoever pressed it.
- [ ] A3: the camera shows the red grid only, no flashing red border when it sees you (GPU look: pending PC run).
- [ ] Host: Start (Esc) > Restart at checkpoint: the confirm opens on Stay; Restart puts both players at the bay start.
  Joiner: Start > Restart at checkpoint and Return to lobby are greyed "Host only"; Quit to menu still works.
- [ ] Host: Start > Return to lobby > Return: both tabs land in the room lobby (ready cleared), a new match starts.
- [ ] Solo Sector Ops: Start > Restart at checkpoint > Restart: the section starts again from its checkpoint.
- [ ] (marlow-bays R) Rejoin: in a co-op match, Start shows "Room CODE". Joiner: Start > Quit to menu; the host sees
  "<name> disconnected - reconnecting..." and the joiner's body stays put. Joiner: Main menu > "Rejoin CODE": back in,
  where you stood, same health.
- [ ] (server browser) Host: Co-op > Host a room, Room: Public. Other tab / PC: Co-op > Browse rooms shows the room
  (code, Marlow Yard, 1 / 2) within a few seconds; pick it to join. Once both are in, it leaves the list. One real-relay
  check on the PC (two machines, not `?net=local`).
- [ ] Host: Start > Quit to menu; the joiner shows "Host disconnected - waiting (CODE)". Host: Main menu > "Resume
  hosting CODE": the match restarts at the bay you were in and the joiner is pulled in.

## Release checklist (before a job merges)

### Checks
- [ ] A job that adds or changes a map: the map's graph passes `node scripts/level-validate.mjs <graph.json>` with 0 errors
  and every WARN is justified in the design doc (before greybox).
- [ ] CI `check` passes and the PR's suites pass on the laptop queue on the PR head (the PR tier, `docs/RULES.md`;
  known-flaky suites excepted); a job that touches visuals or rendering runs
  `npm run e2e:gpu` and the perf checks on Michael's PC, or lists them as "pending PC run".
- [ ] A suite that stops with no error at `E2E_JOBS=1` may have been killed at the suite limit (the streamed output
  drops the KILLED line): check its time before reading a hang into it (havok-stall).

### Offline and install
- [ ] First visit online; wait for the "Ready to play offline" toast. Go offline, close the tab, reopen: the game boots,
  menus work, a Free Roam and an Infiltration match play.
- [ ] Installed app (desktop Chrome / Edge install) offline: the same; Co-op shows the offline notice and nothing else
  is blocked.
- [ ] Deploy a new version while the app is closed; the next online launch picks it up, progress intact.
- [ ] Deploy a new version while a (co-op) match is open: no reload mid-match, an "Update ready - restarts at the menu"
  toast; back on the main menu the game reloads once into the new version (sw-reload).
- [ ] Switch to another window mid-match: on return a solo match is paused, sound was silent while away, progress saved.

### Save migration
- [ ] Settings > Data > Import an export from an older build (v1 onwards): loadout and look carry over; a deleted gun
  becomes the kept gun of its slot.
- [ ] A save from a newer build opened in an older one: Settings > Data says it was left untouched; playing does not
  overwrite it.
- [ ] Private browsing or blocked storage: the game still plays; the Data tab warns that progress will not be kept.

### Controller (Xbox and PlayStation layouts)
- [ ] Connect and hot-plug: "Controller connected" toast, prompts switch to the pad's glyphs; disconnect mid-match:
  "Controller disconnected", no stuck input; reconnect works without a reload.
- [ ] Every screen is fully usable without the mouse: main menu, Play, Loadout, Settings, Co-op (Host / Join, the code
  keypad, Ready / Start / Leave), pause (Menu closes it), dialogs (A confirms, B cancels), results.
- [ ] Rumble on firing, hits, explosions and damage (where the pad supports it); off when Vibration is off.

### Final pass
- [ ] A 10-minute soak on the Warehouse (`node scripts/soak.mjs`, debug overlay): steady frame time, no heap growth, no
  audio crackle.
- [ ] Two PCs in co-op through an Infiltration mission, then Play again, then the host leaves.
- [ ] iPad: version label, bottom strip, no GPU banner, pause room note.
