# Night Shift - Design Bible

Version 2.1 - 2026-10-25. States today's game, rewritten in place to Michael's decisions G1-G343 (`docs/DECISIONS.md`;
"Rewrite it now", G10; "I want to make sure my vision is clear constantly", G337). `docs/VISION.md` is the one-page
summary. The 1.13 text, with the removed systems and the old process, is in `docs/archive/design-bible-history.md`.
Owner: Michael. Location in the repo: `docs/design-bible.md`.

---

## 0. How to use this document

**Authority order (G86).** When sources disagree, the higher one wins. Note the conflict in your job report.

1. Michael's current instruction.
2. `docs/DECISIONS.md` (Michael's decisions, G entries). Every decision there is also written into this bible; where
   they differ, DECISIONS.md wins until the bible is fixed.
3. This bible (gameplay) and `docs/story.md` (story, setting, characters and in-game text).
4. Job and map docs: the job's own plan, `docs/level-design.md` (the level design standard) and the map's documents.
5. `CLAUDE.md` and `docs/systems/*.md`.
6. Existing code and tests.

**Numbers are starting values.** Every movement, camera, timing, health and tuning number in this bible is a starting
value, tuned as Michael plays (G10); he tunes movement himself (G227). Section 11 lists what is still open and where it
is decided.

**Chaos Theory is the authority (G1).** Where this bible and Chaos Theory (CT) behaviour differ, CT behaviour, from the
CT research, wins: "Pure ct, if it had it, we will use it." (G180). Several systems below are marked "research": they
stay only if CT has them (G1, G3, G180). Michael's recorded decisions depart from CT on purpose and win (for example
revive and encounter checkpoints, world pings, both players extract, the perfect rating, any partner rejoins: G126,
G135, G138, G146, G147; the selection wheel, G181); the full list of those overrides is `docs/VISION.md` section 3.

**History.** Older docs, prompts and code describe earlier directions: a Blacklist-style game (snap cover, Mark & Execute,
sonar, the Ghost / Panther / Assault economy), phones and touch, Wave and PvP, a traitor finale, a solo campaign and a
bot partner. That is history. Do not extend it. Section 6 lists what was removed and what is parked.

**What to read.** Sections 0-3, 6 and 9 every job; other sections when the job touches them.

**Reference game.** Chaos Theory (2005) is the reference for mechanics and look (G5): its mechanics,
timing, camera, HUD layout and visual style are matched closely. Names, characters, story, organisations, logos, art
assets, the goggle and the music are original. No reference-game character, gear or organisation name appears anywhere:
code, UI, specs, docs or research notes (G6). "Chaos Theory" and "CT" may name the reference, and Michael's quoted words
stay verbatim (G114). The raw CT research is kept only as the tag `archive/ct-research-raw`; master holds the scrubbed
digests in `docs/ct-research/` (G154).

---

## 1. Vision

Michael: "I want the game to be pure chaos theory. Anything that isn't a part of the original chaos theory shouldn't
exist." (G1)

**Night Shift** (renamed from Silent But Deadly; internal ids keep the old names) is an original third-person stealth
game that recreates Chaos Theory's co-op campaign: its mechanics and its look, with original assets,
names and story. `docs/VISION.md` is the one-page summary.

- **Three modes** (5.8, 5.9 C1):
  - **The campaign:** Michael: "2 player coop campaign only, unable to be completed solo." Exactly two players; no solo
    route, no bot or AI partner (G2, G48, G132). Every campaign section forces a co-op traversal move with no solo bypass
    (G292).
  - **Marlow Yard:** the 2-player co-op training course: heavily guided, linear, one route until its later sections
    teach split paths (G292, G308).
  - **Sector Ops:** Saltmarsh Park, 1-4 players, solo always possible (G308, G280, G331).
- **The CT co-op levels are recreated.** Their design, flow and moves are researched, and that experience is rebuilt
  with original maps and story (G3). The research is done (2026-10-18, G124-G160).
- **Prototype, then refine.** Michael: "We must get a working prototype working, only the basics required to make it
  work and functional to test features and gameplay." (G4) Refining is allowed since 2026-10-24, paced by the walk cap
  and gated by the one-click visual sign-off (G288). Michael tunes movement himself (G227).
- **Story** (`docs/story.md`): a present-day (G124), standalone co-op story (G136); a grounded techno-thriller with dry
  humour. Two operators, Wren and Moth, of the deniable unit NIGHT SHIFT, with the handler LANTERN and the radio crew
  Tally and Sexton (G112), have nine nights to stop SUNDOWN, a staged blackout of the port city of Hollowmere. The team
  that lives in shadow has to keep the city's lights on. Story is text radio and subtitles now, written so it can be
  voiced later (G82).
- Darkness, silence, acrobatic movement (heightened: showpiece two-player moves beside grounded ones, G130), teamwork
  and patience are the tools. Combat is possible, but it is a sign that something went wrong.
- **Desktop only** (G12): an installable PWA in the browser, pad first, then keyboard and mouse.
- **Realistic** characters and a realistic look everywhere, no voxels (G68, G282).

The heart of the game is the light and shadow system. If a feature makes light less truthful, less readable or less
controllable, it is wrong.

---

## 2. Pillars (ranked - use the rank to break ties)

### P1 - Light and shadow are the game

- Darkness is safety. Light is danger. The player can always read which is which.
- The light meter never lies. What the player sees, what the meter shows and what guards perceive come from one source
  (Section 5.1).
- Light is a toy: switches, breakable lamps, the pistol and its held jammer (G152), flashlights that guards carry into
  the dark.
- Sites are lit like real sites; the players make the shadows by cutting lights and using real gaps (L17, G329).
- **Test:** stand anywhere in any map at any graphics preset. The rendered brightness of the player, the meter and the
  guards' detection rate agree.

### P2 - Sound matters

- Every movement makes noise relative to the environment. Loud places (machinery, rain) let you move faster; quiet places
  punish haste.
- **Test:** the sound meter shows your noise against the local ambient level, and guards hear exactly when the meter
  says they can (G61).

### P3 - The players author the approach

- Every space offers more than one route (high / traversal, low / shadow, loud) and lethal and non-lethal options
  (G284, G285); Marlow Yard, the training course, is the exception: one guided route (G292).
  Ghosting (never seen, nobody harmed) is always possible. Violence is scored: non-lethal and ghost play are rewarded,
  and no mission forces a kill (G127).
- **Test:** each mission can be completed with no kills, no alarms and every primary objective: the perfect rating
  (G146).

### P4 - Physical, deliberate CT movement

- CT movement, measured from the footage (Section 5.3): analog speed, back-to-wall, split jump, wall jump, pipes,
  ledges, rappel.
- Control is instant; the body is weighted (5.12.1). No magnetic snap-to-cover. The player places the body.
- No move fires on its own: the player always presses.

### P5 - Readable, fair AI

- Patrols are predictable with exploitable gaps.
- Detection escalates visibly and audibly. Guards react to environmental change.
- **Test:** after any detection the players can say why it happened.

### P6 - Co-op is the game

- Two players, one mission in the campaign and Marlow Yard; up to four in Sector Ops (5.9 C1). Campaign levels are
  built for the pair: team moves and coordination are part of the route, as in CT's co-op campaign, and every section
  needs a co-op move (G2, G3, G292).
- Every feature works in co-op (5.9 C11, 5.17 D8).

### P7 - Desktop, pad first

- Desktop only (G12). The pad is the primary design target, then keyboard and mouse (5.17 D1). The pad layout copies
  CT's default layout button for button (G96).
- Gameplay never depends on graphics settings (Section 8).

---

## 3. The player experience

### Mission flow

1. **Briefing:** text and the pair's complementary kits, fixed per mission (G134, G153); the strict rules are
   signposted here (G290). No map (G336).
2. **Insertion:** where the mission offers more than one.
3. **Space by space**, following the level design spine: scout from the entry vantage, plan, execute together, reach
   the next checkpoint.
4. **Radio:** the handler and crew talk through text radio. Radio never blocks input.
5. **Objectives** are short, plain English lines that name what and where; the level flows towards each one (G336,
   G343). The current objective fades in on every update and on a tap of View / Select (pad) or O (keyboard) for
   about 5 s; the menu holds the full list (G108, G343). Primary objectives complete the mission; secondary and
   opportunity objectives raise the rating.
6. **Extraction:** both players must reach the exit (G138).
7. **Results:** the stealth rating and its breakdown (Section 5.8).

### Failure and recovery

- **Detection** escalates: suspicious, then investigating, then alert, then search.
- **Breaking line of sight** works. Guards search the last known position, not the real one. Guards know only what
  they saw: no one knows a second intruder exists until one is seen or evidence suggests it (G139).
- **Alarms** raise a shared alert tier that escalates the response; no mission fails on an alarm count (G125).
- **Strict rules:** a mission has up to 2 strict rules, signposted in the briefing and the objective list; "ghost"
  counts as one. Breaking one restarts the section from its checkpoint, and the mission continues (G290; 5.8).
- **Downed:** the partner revives (5.9 C6 owns the rule). Encounter checkpoints cap replay loss at about 10 minutes
  (G126).

### A good session feels like

- watching a patrol from a dark ledge while the partner waits below
- shooting out one lamp
- boosting the partner to a window in the new shadow
- dropping onto a guard as the partner takes his colleague
- carrying both into the dark before anyone turns round

---

## 4. Verb catalogue

The Rule column gives the decision that settles a verb. "Research" means the verb stays only if the CT co-op research
finds it in CT (G1, G3, G11); the research also adds CT verbs missing here. Removed verbs are listed in Section 6.

### Movement

| Verb | Behaviour | Rule |
| --- | --- | --- |
| Analog speed | Stick deflection sets the pace, with no speed toggle (G210). No sprint. Noise rises with speed; the slowest speeds are silent. | loco M20 Q8, G40, G210 |
| Stops and turns | Feet freeze mid-stride; a run reversal is one smooth turn; a stick flick turns round in about 0.4 s. | G25-G27, G33 |
| Crouch / stand, roll | Standing and crouched only. Holding crouch while running rolls; a tap just crouches. Sneaking slowly near an enemy, the crouch turns tense: on the toes, exaggerated balancing. | G32, G110, G160 |
| Jump, split jump, wall jump | Narrow corridors, lips | Research |
| Pipes (hang, shimmy, legs up), drainpipes, ladders, ledges (shimmy, drop, climb) | No fast ladder climb. | G31, Research |
| Ducts, windows, ziplines, vault / mantle, fences, rappel | No fast rappel descent, no small gap hops. Crawl spaces are crouch-walked. | G31, G56, Research |
| Back-to-wall | L3 enters (button only). Slide about 0.35 m/s, peek at once at an edge, leave by the button or by aiming. | G18, G34-G37, loco M25 (3) |
| Doors | A CT door list: open, stealth open, bash, optic cable. Running into a door does nothing special. | G19, G97 |

### Interaction

| Verb | Behaviour | Rule |
| --- | --- | --- |
| Light switches, shoot out lamps | | P1 |
| Carry and hide bodies | Standing, footsteps louder | Research |
| Drag bodies | Crouched, slow | Research |
| Lockpick | Short minigame on doors and cases. Silent but takes time. | Research |
| Hack | Short minigame on terminals and keypads; hands-on only, no remote hacking tool | G142, Research |
| Optic cable | Look under a closed door before opening it (a door-list choice) | G37, G97 |
| Interrogation | From a grab: question the guard for intel (subtitled). Two-person questioning, non-violent: one player distracts or bluffs, the other reads a device or a reaction. | G23, G148 |
| Use a held guard on a scanner | Opportunity objective device | Research |
| Grab, human shield | The grab is the hub (5.4) | G23 |
| Whistle, fuse boxes, thrown objects | | Research |

### Takedowns

| Verb | Behaviour | Rule |
| --- | --- | --- |
| Grab, then choose | Grab first, then knock out, kill or interrogate from CT's grab menu. No stealth / kill selector. | G23, G43 |
| Drop, ledge, window and pipe takedowns | Tap = knock out, hold = kill | G43 |
| Palm strike | One-hit knockout from any side on every human guard; campaign missions have no heavies or dogs (Sector Ops: 5.8). | loco M20 Q4, G42, G155 |
| Knife | Close lethal takedown; its full role follows the research. | G76 |
| Synced takedown (co-op) | Two ordinary takedowns timed together; no dedicated dual move. Rewarded over shooting in Sector Ops. | G180, G307 |
| Holster / draw | A mission starts holstered; holstered / low ready / aiming, LT held aims, X tap holsters (5.6). No hip fire. | G21, G103, G210 |

### Vision

| Verb | Behaviour | Rule |
| --- | --- | --- |
| Goggle modes | Night, thermal, electro, picked on the selection wheel, one button toggles the picked mode | G99, G181 |
| Night vision | A gain in the lighting; CT grain | L7, G101 |
| Thermal | CT colour ramp; people behind closed doors as a dim silhouette; never through glass | G45, G102 |
| Electro | Shows powered devices | G99 |

### Gadgets and weapons

| Verb | Behaviour | Rule |
| --- | --- | --- |
| Rifle with attachments | Sniper (scope with hold breath), shotgun, launcher | G76, G104 |
| Pistol with held jammer | Shoots out lights; the held jammer disables one light, camera or laser while the player stands still, and its charge drains. No thrown EMP. | G76, G152 |
| Gadgets and launcher rounds | CT's set, settled by the research (the ring airfoil and the knife's role included) | G76 |

### Co-op team moves

| Verb | Behaviour | Rule |
| --- | --- | --- |
| Boost (leg-up), human ladder | Free wherever the space allows, with a prompt naming the move. One ledge band of 4.3-4.5 m serves boost and human ladder. No brace. | G57, G151, G180 |
| CT's team moves | Ledge relay, partner throw, hang-down, the two-person rope (the partner climbs the held rope), split-jump boost, back-to-back climb, pull-up, rappel anchor and any others CT has. Showpiece moves (partner launch, drop line) sit beside grounded ones. | G3, G130, G180 |
| Campaign co-op traversal kit | Boost up a wall, throw over a gap, human ladder / pull-up, hold a shutter or door, rope brace / descent, vent unlock for the partner, and more; every campaign section needs one (5.9 C4). | G292, G293 |
| Revive, carry a downed partner | Revive: 5.9 C6; carrying: research | G126, G188, Research |
| Pings, Sync, clutch-save markers | World pings stay; sync windows never scale with difficulty; the rest: research | G131, G135, Research |

---

## 5. Systems

### 5.1 Light and shadow (P1 - the heart of the game)

Implementation: `docs/systems/lighting.md`.

- **L1 - One source of truth.**
  - Gameplay light feeds the player meter, guard perception of players and bodies, and AI torch decisions.
  - Gameplay light = local ambient zone + the sum over every baked lamp that is on, not destroyed and not disrupted, of:
    intensity x falloff x cone x baked visibility at the sample point (trilinear).
  - Dynamic lights (flashlights, flares) add to it, with ray occlusion against static collision.
- **L2 - Same at every preset.** The bake is built from occupancy shapes (collision / blockout), never from what a
  graphics preset renders. Gameplay results never depend on graphics settings.
- **L3 - What you see is what counts.** Every renderer reads the same bake.
- **L4 - Real-time shadows only for what the bake cannot know:** flashlights, moving lights and characters. Static lamps
  never need a shadow map.
- **L5 - Parity test.** A test samples a grid of points per map and compares the gameplay level against the rendered
  band (dark / mid / lit). Any mismatch fails. How the test, long lamps and motion lights are built is sorted out when
  they are built (G47). Display brightness targets, measured on a matte 50% grey surface facing the light, after tone
  mapping and grade:

  | Gameplay level | Band | Display brightness |
  | --- | --- | --- |
  | 0.12 | dark | 4% or less |
  | 0.27 | dark | 9% or less |
  | 0.40 | mid | 12-35% |
  | 0.70 | lit | 45% or more |

- **L6 - The meter.** Continuous 0-1, updated at 10 Hz or more, with thresholds (`LIGHT.shadow` 0.28, `LIGHT.lit` 0.6).
  The HUD shows it in CT's layout. It samples chest and head; crouching lowers the samples. If the meter reads dark, no
  guard can detect the player faster than the dark rate allows.
- **L7 - Darkness is dark.** As in CT: if a guard cannot see you, you can hardly see yourself. The dark band renders
  near-black (L5 targets). Players find their way with:
  - night vision: a gain inside the lighting that reveals real detail in the dark and blows out in light
  - the goggle glow: visual only, never a light, never seen by guards (5.14)
  - the light and sound meters
  - faint light from moon, windows and lamp pools where it really reaches
  - a brightness calibration screen that sets a small, clamped exposure offset (render only; its symbol is original,
    G69)
- **L8 - Controllable light.** Players change the light with switches, breakers, breakable lamps, the pistol and its
  held jammer (G152), and whatever else the research keeps. A lit choke point may be hardened in the campaign and Sector
  Ops (un-shootable fixtures, a guarded or locked breaker), as long as a route around it stays (G333).
- **L9 - Guards notice light changes in their view.** Investigating guards in darkness take torches.
- **L10 - Co-op.** Light state (on / off / destroyed / disrupted) is host-authoritative and synced. Clients re-mix the
  lighting locally.
- **L11 - Characters and bodies do not occlude gameplay light.** Deliberate: simple and symmetrical.
- **L12 - Doors.** Closed doors block light, on screen and in gameplay. Opening or closing a door updates the lighting
  like a switch.
- **L13 - Cost.** No per-frame per-lamp loops in gameplay. Re-mixing on a light change is a one-off of a few
  milliseconds.
- **L14 - The moon is baked** like a lamp, so outdoor moon shadows match the meter.
- **L15 - Glass (G45).** Clear glass passes light and sight; frosted glass and blinds pass light only; thermal never sees
  through glass.
- **L16 - Lit windows (G144).** Lit windows are systemic: a lit window exposes anyone in it, from either side; dark
  rooms hide.
- **L17 - Real-world light levels (G329).** Sites are lit as real sites are. Each space type has a real-world
  illuminance band from the lighting standards (outdoor car parks and roads AS/NZS 1158.3.1, interiors AS/NZS 1680 /
  EN 12464); engine light is calibrated to lux once and each space is measured from the bake at greybox exit. Stealth
  comes from real gaps (between poles, under carports, behind cars, cut circuits, shot lamps), never from leaving lit
  places unlit: the players make the shadows (G295). The 40-60% floor-in-shadow target yields to the band (G284).
- **L18 - One lighting system on every map (G316).** Realistic inverse-square falloff (G314) with no Classic path or
  falloff setting; soft light edges against walls and floors, hard only where an occluder cuts the ray; guard torches
  stopped by walls and shut doors, with soft beam edges; a CT-grade showcase, audited in LR16. The 2-4 lamps nearest the
  players cast real-time character shadows at High+ (G315). Fires flicker and one failing tube stutters per main map;
  swinging pendants on Marlow Yard only (G323).

### 5.2 Sound (P2)

Implementation: `docs/systems/audio.md`.

- **S1 - Noise events.** Every noise event has a loudness expressed as a radius: footsteps by speed x surface, landings,
  rolls, doors, glass and lamps breaking, body drops, shots (suppressed or not), impacts, gadgets, alarms.
- **S2 - Ambient noise zones** per map region (`MapLayout.noiseZones`): an area, a masking level and a source label
  (rain, machinery, generator, vent fan, traffic). A zone can be tied to a switch: turning a generator off removes its
  masking.
- **S3 - Masking.** Effective radius = the noise radius reduced by the local masking. Wall muffling applies after
  masking. Guards hear a noise only within the effective radius.
- **S4 - HUD sound meter.** Shows the player's noise and a marker for the local ambient level; above the marker means
  guards can hear.
- **S5 - Silent speeds (G40).** The two slowest standing speeds and the three slowest crouched speeds are silent.
- **S6 - What the player hears.** Ambient beds match the zones so the player can hear the masking. The player's own
  footsteps play very softly when guards cannot hear them (G61). One run sound for every running speed (G62). A separate
  Footsteps volume slider exists for testing (G60).
- **S7 - Audio sources (G58, G59).** CC0 recordings may be used for any sound wherever they cut build time and sound
  better; synthesis stays where it sounds better. Files are bundled, never fetched at runtime, and each source is credited
  in `docs/audio-credits.md`. There is no audio size limit.
- **S8 - Music.** Music follows every guard's state, never count, distance or direction. Searching plays Cautious; the
  chase music plays only after the players were seen (G63). Step timings and encoding are in `docs/systems/audio.md`
  (G67). The long menu theme ships (G64); the old music plans, test lab and unused music files are kept (G65). The
  music direction, briefing / results / pause music and the Calm alternatives are decided in the music job (Section 11).
- **S9 - Missing sounds** come after the prototype: guards' footsteps first, then ambience, then the rest (G66).
- **S10 - Voice (G129, G140, G156).** Partner voice is an earpiece: always clear, never fading with distance. Proximity
  voice (guards hear the players' voice chat) is an opt-in modifier: off by default, visible when on, tunable. Both are
  built after the prototype.

### 5.3 Movement, stances, camera and traversal (P4)

CT movement was first measured from Michael's footage (loco M19, M20, M23, M25; research in `docs/archive/locomotion/`); G210 drops
that reference. Implementation: `docs/systems/movement.md`. All numbers are starting values (Section 0). All
movement and its animations follow a real-world trained-operator standard (G210, docs/archive/anim-rework/BRIEF.md). Michael
fine-tunes movement himself as needed; movement slices and research are off (G227, replaces G150's tune-until-sign-off).

**Stances:** standing and crouched only. No prone and no solo rope climb (G110); CT's two-person rope, where the
partner climbs the held rope, stays (G180). Sneaking slowly near an enemy, the crouch
turns tense: quieter, on the toes, with exaggerated balancing (G160).

**Speed:**

- Analog stick speed, with no speed toggle (G210, replaces the speed rocker of loco M25 (7)). No sprint
  (loco M20 Q8). The run starts at about 4.2 m/s (loco M25 (6)). At the slowest speed the operator can walk backwards
  (loco M23).
- Silent speeds: S5.
- **Stops (G26, G27):** the feet freeze mid-stride at every speed; from a run the body slides up to about 0.3 m. The
  frozen stride holds about 1.7 s, then eases to a feet-together idle.
- **Turns (G25, G33):** an on-the-spot turn is a tight walking circle; a run reversal is one smooth turn of about 0.4 s;
  a stick flick turns round in about 0.4 s while walking. No planted pivot and no special quick 180.
- **Roll (G32):** holding crouch while running rolls; a tap just crouches.
- **No move fires on its own** (except the landing roll). The player always presses. This keeps co-op predictable.
- **Modern layer (G30):** only what CT shows: a start lean, head look-at, hands on doors and ledges, feet on stairs and
  faster vaults from a run.
- **Every operator moves the same (G109):** one CT movement set; operators differ in look and height only.

**Air:** the jump grabs what is near; the split jump and wall jump; soft / roll / heavy landing bands with noise; drop
attacks.

**Traversal:** ladders, drainpipes; pipes (hang, shimmy, legs up, upside down); ledges (shimmy, drop, climb, jump across);
ducts, windows, ziplines, vault / mantle / step; split and wall jumps; rappel; fences. The fast ladder climb, fast rappel
descent, small gap hops and sprint door bash are removed (G31). Crawl spaces are crouch-walked; an automatic crawl only
happens in real duct ends inside plant shafts (G56). The research confirms the list (G3).

**Back-to-wall (the only wall move, G37):**

- L3 puts the back to the wall (G18); button only, no entry by pushing into a wall (G34). It works on any wall, standing
  and crouched: flat back standing, sideways crouched (loco M25 (4)).
- The slide is CT's shuffle, about 0.35 m/s, a little slower at the lower speed settings (G35).
- At an edge the body stays on the wall and peeks at once while the stick pushes (G36).
- Only the button or aiming leaves the wall (loco M25 (3)).
- No lean-out aiming and no SWAT turn (loco M20 Q1). No snap from a distance, no glide, no cover-to-cover dash, no blind
  fire. Low objects are handled by crouching behind them.
- Enemy cover AI (cover points from cover faces, `src/cover`) stays. Only the player's cover changed.

**Doors (G19, G97):** at a door a CT-style list offers open, stealth open, bash and the optic cable. Bash can knock out a
guard behind the door. Running into a door does nothing special. Guards notice a door opened past about 15% (5.7).

**Bodies:** carry (standing, footsteps louder; no climbing or traversal while carrying); drag (crouched, slow) if the
research keeps it. Put the body down gently (quiet) or drop it (noise); hide spots remove the body.

**Camera (G28, G29, G17, G38, G137, G159):**

- **Exploring:** about 1.8 m behind, the head at screen centre, the legs partly out of frame. Rigid follow, no bob. The
  camera never moves or adjusts by itself: the player controls it (G159).
- **Exploring offset and FOV (G202):** shoulder offset 0.15 m and FOV 86, matched to CT.
- **Aiming:** over the shoulder with no zoom (the sniper scope is the exception, 5.6). The shoulder swap works only while
  aiming.
- **The same camera height for every operator:** the camera is tied to the shared body capsule, so maps read the same for
  every player.
- **Attached states** (hang, pipes, split, rappel, ladder) get their own framing.
- **Collision:** the camera pulls in smoothly near walls and ceilings at a capped rate, never pops, fades geometry that
  blocks the operator, and holds a usable view in tight corridors and ducts. Test: sampled positions on every map; the
  camera is never inside geometry and never jumps more than a set distance per frame.
- **Over the shoulder, strict corner peek (G137):** the camera sees little the character cannot. Guards detect the
  body, never the camera.

**Metrics.** Speeds, grab reach, mantle / step / vault heights, the wall jump band, split widths and heights, pipe heights,
boost and human ladder reach, rappel and fence limits, landing bands and camera distances are written into
`docs/level-design.md` Section 12 and pinned by unit tests. Room, corridor and crawl sizes are re-measured right after the
camera part of the prototype, and the size sheet is updated before new floor plans (G54). After the prototype is tuned,
changing a metric needs Michael's approval and a review of every map built on it.

### 5.4 Takedowns, grabs, interrogation

Implementation: `docs/systems/takedowns.md`.

- **The palm strike** (loco M20 Q4, G42): a one-hit knockout from any side on every human guard. Campaign missions
  have no heavies or dogs (G155); Sector Ops' dogs and armoured late guards are in 5.8. Recovery about 1.4 s (loco M25
  (5)). A small noise event. Host-approved in co-op.
- **The grab is the hub (G23, G43).** The ground takedown button grabs first; the menu then offers interrogate; RT / LT knock
  out or kill (G203). There is no stealth / kill selector. From the grab: human shield, interrogate, use on a scanner.
- **Hold-A action menu (G198):** actions are picked from a menu opened by holding A, with a return-to-game row (CT).
- **Behind a guard (G203):** the menu lists only grab and return; once held, interrogate shows when the guard has
  information, RT / LT knock out or kill, the aim button aims the pistol. Kill, knock out and carry are never rows.
- **No release (G204):** a held guard ends knocked out or killed, or serves as a human shield; interrogating keeps
  the hold.
- **No return row while holding (G205):** hold-A then shows only INTERROGATE (when the guard has information).
- **Positional takedowns:** drop, ledge, window and pipe takedowns keep tap = knock out, hold = kill (G43); ledge, pipe
  and window takedowns keep one KNOCK OUT row in the action menu (G206).
- **RT on a guard (G210):** tap knocks out, hold kills.
- **Quick, CT style:** about 1-1.5 s from press to victim down, every kind. That keeps exposure short and co-op sync
  simple.
- **Offered from:** standing, crouched, back-to-wall at a corner, split (drop), pipes (inverted, pull-down), ledge
  (pull-down), window, from above, over a low obstacle, through a doorway; the research confirms the set.
- **Interrogation:** 1-3 subtitled lines per guard type, data-driven per mission. It can reveal an opportunity objective,
  a code or a patrol. The intel goes into the field menu (5.10).
- **Two-person questioning (G148):** non-violent: one player distracts or bluffs while the other reads a device or a
  reaction.
- **Synced takedown (co-op):** two ordinary takedowns timed together, as in CT; there is no dedicated dual move
  (G180). Each is host-approved (5.9 C11). Sector Ops rewards synced takedowns over shooting (G307).

### 5.5 Gadgets and vision

Implementation: `docs/systems/gadgets.md`.

- **Goggle modes (G99-G102, G181):** night, thermal and electro. The selection wheel (G181) picks the mode; one button
  turns the selected mode on and off, and the goggle flip plays only on on / off, never between modes.
  - Night vision is a gain in the lighting (L7): it reveals real detail and blows out near lamps. It looks realistic,
    bodies are not over-bright, and the goggle outline is wide and thin, never claustrophobic (G213).
  - On the selection wheel, A on the hovered vision mode cycles the modes like a carousel (G213).
  - Thermal follows CT: CT's colour ramp; people behind closed doors show as a dim silhouette; never through glass (L15).
  - Electro shows powered devices.
  - Grain as in CT (G101).
  - Vision modes never change detection.
- **The goggle** is original: no three-lens look (G69). It sits on the brow with a dim glow when vision is off and over
  the eyes with full glow when on (G73). Wren keeps her current goggle; the redesign is parked (G195).
- **Goggle flicker** plays only at launch, never after a match (G194).
- **Gadgets:** CT's set, settled by the research, including the ring airfoil and the knife's role (G76). A Blacklist-style
  selection wheel picks weapons, gadgets and the vision mode (G181, Michael's exception to G1).
  The wheel opens on LB hold; there is no lethal / non-lethal switch, LT / RT covers it (G192).
  The wheel scales to the screen size, with a quick original radial restyle; the FPS banner is off the top HUD (G220).
  There is no time slow (a two-player game). There is no remote hacking tool: all hacking is hands-on (G142). The
  thrown EMP is gone: the pistol's held jammer replaces it (G152).
- **Kit per mission** is fixed by the mission: the pair get complementary kits (G134, G153). No credits.

### 5.6 Weapons, gunplay and kit

Implementation: `docs/systems/combat.md`.

**The CT kit only (G76):**

| Slot | Weapon |
| --- | --- |
| Primary | One rifle (suppressed) with attachments: sniper, shotgun, launcher |
| Sidearm | One pistol (suppressed) with the held jammer |
| Melee | The knife |

- Every other gun is deleted (G115). Attachments, gadgets and launcher rounds are CT's set, settled by the research.
- Original names only; no real gun brands.
- **The held jammer (G152):** held on one light, camera or laser; its charge drains and the player must stand still. It
  replaces the thrown EMP. It is on RB while the pistol is aimed; RB stays the co-op action otherwise (G212).

**Holstered (G21):**

- A mission starts holstered, arms relaxed (loco M14 (1)). Three states, holstered / low ready / aiming (G210): LT held
  aims, always held, no toggle aim (G214); X tap holsters; traversal auto-holsters and returns to the state after.
- At low ready A always interacts; reload is X hold only (G212, replaces G192's A reload).
- **No hip fire.** Fire while holstered is the palm strike where CT's layout puts it (G96).
- Swapping while holstered picks the gun the next aim draws; a swap button works while aiming; grenades and gadgets work
  holstered.
- **Draw timings (G103; real-world times, Michael 2026-10-22 "Research what is believable and realistic",
  docs/archive/anim-natural/n3/DRAW-TIMES.md):** draw to low ready 0.75 s (pistol) and 1.1 s (rifle, off the back); holster
  0.9 s (pistol) and 1.0 s (rifle). The tuner's Draw multipliers and the per-clip speed slider fine-tune them.
- Releasing aim never cancels a reload (loco M4, A43).

**Gunplay:**

- Aiming is the only way to shoot. Normal aiming has no zoom. The sniper scope has hold breath, as in CT (G104).
- No aim assist on any input (G16).
- Crouched and still is steadiest; speed and motion widen spread.
- Every shot is a noise event; suppressed shots are quiet, not silent; impacts are heard nearby.
- Every shot can kill a lamp (P1). The gun is also a light tool.
- One headshot downs a guard without a helmet. A helmet takes the first headshot (knocked off, a stagger) and the
  second kills (G307), except on the hardest difficulty, where the helmet cannot be shot off (G338).
- **Helmets and armour per mode.** Sector Ops: "harder difficulties always have helmets, and hardest difficulty you
  can't shoot the helmet off" (G338); later sections add body armour that makes torso shots stagger (G307).
  The campaign: no heavies (G155); the same helmet rule: harder difficulties always have helmets, the hardest cannot
  be shot off, and on the easier ones helmets and armour come with the alarm levels (5.7) (G341).
- **Ammo in Sector Ops (G307):** limited suppressor ammo, no ammo inside a section and one weapons-crate refill per
  player between sections.
- Aiming from attached states stays (split, pipes, rappel, ledge, human ladder top).
- **Co-op:** the drawn / holstered state and the weapon in hand are in `MoveState`, so the partner sees them.
- **Holstered look:** the rifle slung on the back, the pistol in its holster, a clean silhouette. On Wren the rifle hangs
  from her back plate mount and the pistol sits in her thigh holster, drawn and put away quickly (G178); hands hold the
  guns properly and believably (G177). Which gun comes out first is open (Section 11).

**Kits (G134, G153):** fixed per mission; each mission issues the two players complementary kits. Players do not choose
a loadout, and nothing is bought.

### 5.7 AI (P5)

Implementation: `docs/systems/ai.md`.

- **Keep:** perception (sight x light x stance x motion x exposure), `AlertMachine`, radio windows, shared last known
  position (LKP), search, torches, bodies, alarms, doors, archetypes (guard, runner, sniper, enforcer,
  officer; the heavy and dog archetypes are not placed in campaign missions, G155; Sector Ops places dogs, G297),
  barks (shown as text), difficulty.
- **Mission alarm level 0-3.** Each raised alarm adds one level. Level 1: guards draw torches in the dark. Level 2: more
  guards wear helmets and armour, patrols tighten. Level 3: reinforcements. No mission fails on an alarm count (G125);
  strict rules: 5.8. The alert tier is shared, but guards know only what they saw: no one knows a second intruder
  exists until one is seen or evidence suggests it (G139).
- **Environmental change** alerts guards: lights changed in view, a missing patrol partner (radio check), bodies, broken
  glass heard, and doors (G41): guards close doors behind them on a calm patrol and notice any door open that should be
  shut. One 15% threshold covers light, sound and sight through a door.
- **Guards see poorly above them (G44):** a player well above a guard is hard to spot, as in CT. This stays the base
  rule; some high routes (pipes, catwalks, vents) have static lookouts (G335).
- **Paired patrols and searches:** some patrols walk in pairs that check on each other (G335); guards search in
  impromptu pairs, relight lamps and investigate dead lights, as CT's do (G180).
- **Glass (L15, G45).**
- **Sensors:** security cameras (sweep cone; they see by their own IR illuminator, not by the lamps, so darkness does not
  hide a body in their cone (marlow-jammer, Michael M3); raise an alarm, can be shot or disrupted,
  visible in electro vision; a faint red laser grid always shows on the surfaces a camera watches, stronger in
  electro, Michael's decision, not CT, G222) and laser trip beams; the research confirms the set. Lethal automated
  defences appear only at military or private compounds; elsewhere security responds realistically (G128).
- **No randomness that defeats planning.** Patrol cycles are fixed per map. Some codes, items or rooms vary per run and are
  read in the world (G143).
- **Per-stop facing:** a guard's patrol stop can set the direction he faces while waiting (`SquadSlot`).
- **Civilians:** unarmed non-combatants (night watchmen, cleaners, night-shift technicians). Same perception rules as
  guards. When they see a player they flee to the nearest guard or alarm and raise it; they never fight. They can be
  grabbed, interrogated and knocked out (a rating penalty). Killing a civilian fails the mission.
- **Guard counts and the awake limit:** as many guards as realistically possible: each space gets the guards a real
  site would post, limited only by the measured guard cap and every route staying passable (G254, G289). Sector Ops
  caps at 32 alive, a ceiling, not a target, with room to manoeuvre first (G187, G190, G332); the other modes keep
  `MAX_ALIVE` 12 until the guard-cap job measures a higher floor (G187, G274).
- **Off-screen animation:** a guard out of view animates at a lower rate, but a guard whose shadow falls in view counts
  as seen (G327).
- **Difficulty (G106):** CT's fixed difficulty levels, one per session, chosen by the host. No sliders and no
  alarm-tolerance setting. Difficulty scales guard perception, alert tolerance and resources; sync timing windows
  never scale (G131).
- **Awareness arcs:** shown today; research (G1).
- **Realistic guards (G298-G300, G312):** every guard is armed on every map and cameras keep IR (G298). Guards hear
  only within range, wake knocked-out guards, report bodies and stay cautious, investigate a broken light in ones or
  twos then return, pass alerts by voice and radio without alerting everyone at once, hold high-security posts, and
  fight smart and tactical; reinforcements are aggressive (G299). KO caution is timed; reinforcements come only after a
  raised alarm; radio spreads through the own section, staggered; cameras see and report bodies (G300). Lasers draw a
  search of the laser spot, not the player; body investigations last longer; no walking through each other or doors;
  holstered in calm areas (G312).
- **Later Sector Ops sections (G307):** bulletproof and thermal cameras, riot shields in response teams, alarms that
  escalate gear, response teams that stay and search, missed check-ins raise alert.

### 5.8 Missions and campaign

Implementation: `docs/systems/modes-and-progression.md`.

**A mission is data:** map, spaces (the spine from `docs/level-design.md`), insertions, objectives, rules, triggers,
radio script, checkpoints, kits (G153) and co-op moments. It is validated by a schema with a unit test (`validateMissions`).

**Objectives:** primary (required), secondary (optional, rated), opportunity (revealed mid-mission by intel,
interrogation or radio; optional, rated). Types: terminal / download, plant, intel, rescue / escort, sabotage, extract,
interrogate a named target. Each is a short, plain English line that names what and where; there is no map, and the
level design flows towards each objective (G336). The current objective fades in and out in game: on every update and
on a tap of View / Select (pad, CT's Back) or O (keyboard), for about 5 s; the menu keeps the full list (G108, G343).

**Rules:** `noAlarms`, `noKills`, `noBodiesFound`, `maxAlarmLevel`. Each rule is a bonus or a strict rule. A mission
has up to 2 strict rules, signposted in the briefing and the objective list; "ghost" counts as one. Breaking a strict
rule restarts the section from its checkpoint, and the mission continues (G290). Sector Ops sets strict rules globally,
per team or per split (G291). Story-critical characters are protected until their role is done: killing one earlier
fails the mission, with a clear warning first (G145). Both players must reach the exit to finish (G138).

**Triggers and actions.** Triggers: enter area, objective state, alert level, alarm level, interrogation, item taken,
light group state. Actions: radio line, add / complete / fail objective, enable / disable a squad, lock / unlock door, set
light group, spawn reinforcements, checkpoint, end mission. In the campaign and Sector Ops, soft windows only:
predictable windows (shift changes, fixed patrol cycles, signposted in the world) are allowed; no countdown closes a
route and stealth sections have no forced timers (G334). Marlow Yard may use timed drills that force the players into
situations, as training (G342).

**No quicksave.** Checkpoints only. The pause menu offers "Restart from checkpoint".

**Checkpoints:** encounter checkpoints, one before each space, capping replay loss at about 10 minutes (G126). Autosave
to IndexedDB with the full mission state (objectives, alarm level, every guard's state, bodies, doors, lights, pickups
taken, both players' health and kit). The main menu shows Continue.

**Radio:** text lines with a speaker label and colour, shown as subtitles, queued with priority, never blocking input,
logged in the field menu. Lines are written so they can be voiced later (G82).

**Results:** a stealth rating of 0-100%. 100% is no kills, no alarms and every primary objective; secondary and
opportunity objectives are a bonus; every mission must be testably 100%-able (G146). Violence is scored: lethal and
non-lethal play are allowed, non-lethal and ghost play are rewarded, and no mission forces a kill (G127). Each category
is shown, plus each player's stats.

**Campaign progress:** fully shared. A saved mission's progress belongs to the host, and any partner can join it
(G147). The lobby lists every mission; finishing one records it, with its rating, for both
players. Choosing a mission beyond your own progress shows "Story spoilers ahead". Saved per player, per mission:
completed, best rating, intel found.

**Missions** recreate the CT co-op levels (G3); the research decides their number, length and flow. Mission 1 is Tallow
Wharf, the new small campaign map; Kestrel stays paused (G340, G53). Story, sites and names: `docs/story.md` (site and
company names are decided with the missions). The first campaign prototypes, Three Grey Coats and Two-Key Ledger, go on
Tallow Wharf (G293, G340), built on the mission framework: objective chains with parallel tracks, strict rules with
section restart, an interrogate-a-named-target objective (G291).

**Mission 8** has no traitor and no player-versus-player finale (G9; Section 5.15).

**Sector Ops** is the second mode beside the campaign (G184): an original take on co-op ops at Chaos Theory pace, a
playground for movement, stealth and gunplay (G185). It runs in its own session, in parallel with Marlow Yard (G296).
- **Map:** Saltmarsh Park (`campusOps`), a corporate research campus of five sections S1-S5 joined by connector rooms
  (G186), one co-op run 30-45 min, with the full detail-art lift (G295, G297, G309). The old Warehouse (`warehouseOps`)
  stays selectable (G298); its lamps sit on ceilings under translucent corrugated roof sheets (G221).
- **Players:** 1-4 (G308, coop4). Solo is always possible: team doors are true two-player pathways, and solo play keeps
  a working route past them (G280, G295).
- **Objectives and rules:** a section is done by its objective, then its exit; kills are optional, so a ghost run is
  always possible (G185). Objectives run in parallel for teams, or one player does them all; strict rules (up to 2)
  apply globally, per team or per split (G290, G291). First prototypes: Split Shift and Code Relay, on the mission
  framework (G291).
- **Layout:** 2-3 routes to each objective and exit, patrols in separate pockets with takedown spots out of the other
  guards' sight (G190); some sections have an unavoidable guard to distract, knock out or kill (G303). Security makes
  sense and gets harder: cameras with a shorter range, lasers, alarm panels, keypads, then dogs and armed response
  (G295, G297). Later sections reward stealth over shooting (G307; 5.6, 5.7).
- **Guards:** as many as realistically possible (G289), 32 alive as the ceiling, not a target (G187, G332). Signed-off
  counts: S1 15, S2 18, S3 20, S4 25 (the dog included), S5 26 (G328). Guards (tagged by team size), alarm
  reinforcements and revive syringes scale with the player count (G331).
- **Difficulty:** fixed levels per op, shown as stars; a clear on tier N fills every star below N, stored in its own
  IndexedDB key (G189, G331). Harder difficulties always have helmets; on the hardest the helmet cannot be shot off
  (G338).
- **Downed:** no lives: revive syringes and checkpoint restarts (G188; 5.9 C6).
- **Ammo:** no ammo inside a section, one weapons-crate refill per player between sections (G307; 5.6).
- **Light:** lit like a real site, the real-world bands of L17; players cut lights to make shadows (G297, G329).

### 5.9 Co-op (P6)

Implementation: `docs/systems/coop.md`.

- **C1 - Player count.** The campaign and Marlow Yard: exactly two humans; the campaign cannot be completed solo; no
  bot or AI partner and no solo variants (G2, G48, G50, G132). Sector Ops: 1-4 players, solo always possible (G308,
  G280; 5.8). No bot anywhere (G48).
- **C2 - Host authority.** The host is authoritative. There is no host migration: if the host leaves, the session ends;
  the host can resume from their checkpoint and re-invite. Clients keep no mission save. Any partner can join a saved
  mission; its progress belongs to the host (G147).
- **C3 - Team moves.** CT's moves (G180): boost (leg-up), human ladder, ledge relay, partner throw, hang-down and the
  two-person rope, plus CT's other team moves (split-jump boost, back-to-back climb, pull-up, rappel anchor and any
  others the research finds). There is no brace and no dedicated dual takedown: a synced takedown is two ordinary
  takedowns timed together (G180; 5.4). Team moves are free wherever the space allows, with a prompt naming the move
  (G151); showpiece moves sit beside grounded ones (G130); one ledge band of 4.3-4.5 m serves the boost and the human
  ladder (G57).
- **C4 - Levels need the pair.** Spaces are built around team moves and coordination, as in CT's co-op levels (G3).
  Every campaign section forces a co-op traversal move with no solo bypass (G292). The campaign kit: boost up a wall,
  throw over a gap, human ladder / pull-up, hold a shutter or door, rope brace / descent, vent unlock for the partner,
  and more (G293).
- **C5 - Detection.** Guards see each player separately (`PlayerRef.spotted` per player). Radio calls and alarms affect
  both. Guards know only what they saw: the shared alert tier rises, but no guard knows a second intruder exists until
  one is seen or evidence suggests it (G139). Whether the LKP becomes per player is open (Section 11).
- **C6 - Downed (the one owner of the revive rule).** The campaign: the partner can revive a downed player within 30
  seconds, at most twice per mission; a revive restores 35% health; both down reloads the last checkpoint (G126; 5.13).
  Sector Ops: no lives; a partner revives with a limited revive syringe (resources scale with difficulty, G131, and the
  count grows with the player count, G331); in solo, or with the whole team down, the run restarts at the section's
  checkpoint (G188). A Marlow Yard checkpoint restart is a full reset (G312).
- **C7 - Difficulty.** One per session, chosen by the host (5.7); Sector Ops has fixed levels per op (5.8). Sync timing
  windows never scale (G131).
- **C8 - Friendly fire** is a host option, on by default (G141). Campaign missions have no heavies or dogs (G155).
- **C9 - Tests.** Two browser tabs, the automatic two-player tests (`?net=local`) and the bunker's solo test switch; no
  bot (G48). The co-op suites are made reliable, then required like every other suite (G51).
- **C10 - Operators:** each player is a different operator, Wren or Moth (5.14). Partners find each other by the partner
  beacon (each goggle light a distinct colour) and world pings; there is no partner marker, no live partner position
  and no map at all (G135, G336). Whether the soft team-mate outline stays is checked against G135 when the co-op slices are built;
  guards never see it.
- **C11 - Movement sync rules** (every new move meets them):
  - Every movement state has a networked `MoveState` mode, and remotes pose from it, never from position alone.
  - Takedowns, team moves and other committed moves are approved by the host with a shared start time; both machines
    play them from that start, and the host decides interruptions.
  - The host decides who holds a body, and the body's position is synced.
  - `e2e-netmove` checks the remote pose error for every state; each new state adds its case.
  - Vision modes, the camera, rumble, remapping and hold / toggle are local only, never sent.
  - Partners block each other (capsule separation) in every co-op mode (G52).
- **C12-C18 - Engagement systems** (Sync countdowns, clutch-save markers, dragging a downed partner, split-and-converge
  spaces, typed pings with quick lines, team results and highlights): research (G1, G11). What CT has stays; the rest
  goes. World pings stay (G135).
- **C19 - Connection.** Online, split-screen and LAN; no cross-play commitment (G133). Online uses direct connections
  for now. A connection test on the co-op screen (peers connected,
  round-trip time, failed direct path) and network stats in feedback notes; a relay (TURN) server is decided after real
  sessions with friends (Section 11).
- **C20 - No bot partner.** The old dev bot partner is void (G48); co-op is tested as in C9.
- **C21 - Network version.** A train with a wire change bumps `PROTOCOL_VERSION` once; tests read the constant
  (CLAUDE.md "Definition of done"). The SWAT-turn and lean-out network fields go
  when the CT prototype is built (G52).
- **C22 - Voice.** Partner voice is always clear (G140); proximity voice is an opt-in modifier (G129); both come after
  the prototype (G156, 5.2 S10).

### 5.10 HUD and UI

Implementation: `docs/systems/ui.md`; the menu plan: `docs/menu-ui/SPEC.md`.

- **The in-game HUD follows CT's layout (G77):** light meter, sound meter, health bar, ammo, selected gadget, contextual
  prompts (a team move names itself, G151), radio subtitles. No partner marker (G135). No stance or gear icons: the
  operator's body shows the stance (G107). No medkit count (G98). The current objective fades in for about 5 s on every
  update and on a tap of View / Select or O; the menu keeps the full list (G108, G343). Marlow Yard keeps its
  always-on objective list (G277, G292).
- **Menus follow the Arkham Knight style plan** (feature/menu-ui-spec, G77). The menu job comes after the prototype
  (G113); its open calls are in Section 11.
- **No maps at all, in any mode:** no briefing map, no field-menu map, no minimap, compass or objective blip, no world
  waypoints and no live partner position (G135, G336, G339). Campaign missions and Sector Ops have no markers, only
  in-world guidance (objective text that names what and where, light language, landmarks, signs, place names) and an
  optional hint layer, off by default (G290, G336). Marlow Yard, the training course, keeps its guidance marks (G292).
- **Field menu** (pause): objectives, radio log, interrogation notes.
- **Dev menus:** Anim Studio only from the main menu; the animation tuner stays in the in-game menu (G313).
- **Remapping:** full remapping with conflict warnings and a reset; remap capture cancels with Menu / Start or Esc, and B
  stays bindable (G22, 5.17 D7).

### 5.11 Saves

- IndexedDB only, through `src/save`. `localStorage` is never used for saves.
- Any change to the save's shape bumps `SAVE_VERSION` (`src/save/schema.ts`), with a migration and a unit test using a
  literal old save.
- Parked data (credits, unlocks, cosmetics) stays in the save untouched.

### 5.12 Animation

- **Keyframed core clips (G208):** walk, jog, run, crouch walk, crouch idle and the wall-knee hand are keyframed clips
  authored headless in Blender, never traced from footage (G5, G209); the procedural layer blends, turns, plants feet.
- All other animation is generated in code (clips as curves, IK, `FootPlanner`, `AnimGraph`, `Inertializer`). No motion
  matching, no root motion driving control. The exception is CMU mocap locomotion (G264): kept as captured over the
  limits and feel notes below (G271), more clips without sheets (G273), on by default once checked, with the hand-keyed
  set behind the switch (G298). Every animation gets fixed, the normal ones too (G312).
- **Every animation looks realistic and believable**: no instant or unrealistic motion, no clipping (G199), no awkward
  poses. The reference is a real-world trained operator, not the CT footage (G210, replaces loco M20 Q9).
- **Michael's feel notes (G207):** legs and elbows in, never crab-like, also crouched; a slower crouch idle; the
  knee-rest hand the right way up, on the knee.
- **Michael's feel notes (G217):** a slower full speed with longer, fewer strides; no forward lean until full speed;
  knees and legs almost vertical under the body; arms parallel to the body, swinging a little more at each speed.
- **Priorities:** readability (stance, speed and state, and every guard's alert state, read at a glance), then
  believability (weight, timing, balance and contact of a trained person), then polish.

#### 5.12.1 The core rule: instant control, continuous body

Control response is instant; the body never is.

- **Gameplay** may react within one fixed step: the capsule stops, a move commits, a prompt fires.
- **The pose** always moves continuously: no joint pops, no teleports, no gliding. Root and capsule agree; the visible
  body never slides over the floor to catch up with the capsule, except the CT slide of up to about 0.3 m after a run
  stop (G26).
- **Stops:** the capsule stops; the feet freeze mid-stride, hold about 1.7 s, then ease to idle (G26, G27).
- **Starts:** the capsule reaches speed fast; the pose shows a push-off, never a glide.
- **Turns:** a tight walking circle on the spot, one smooth turn of about 0.4 s for a run reversal or a stick flick;
  never a spin on the spot with sliding feet, never a planted pivot (G25, G33).
- **Committed moves** (mantle, vault, takedown, roll, split jump, wall jump, palm strike) start on the press, with
  realistic anticipation inside the move's duration.

#### 5.12.2 Realism standard

These apply to every clip, the player and guards, local and remote, measured by the audit harness (5.12.4). The final
values live in a config table with unit tests (`src/anim/audit/limits.ts`).

1. **Continuity:** no joint rotates more than 25 deg between two 60 Hz frames (scaled at other rates), except hit
   reactions and impacts. The pelvis moves no more than speed x dt + 2 cm per frame. No teleports except spawn, respawn
   and checkpoint load. Every transition blends through the `Inertializer` in 0.1-0.25 s.
2. **Contact:** planted feet slide under 1 cm, never float more than 2 cm or sink more than 1 cm. Hands on rungs, pipes,
   lips, walls and bodies under 1 cm; weapon grip under 2 cm.
3. **Clipping:** body 3 cm or less into the world (`e2e-clip`); weapon 2 cm or less; self-intersection 2 cm or less;
   character against character (takedowns, grabs, carry, team moves) 3 cm or less.
4. **Range of motion:** knee and elbow 0-150 deg (no hyperextension beyond 5 deg); wrist 70 deg flexion / extension, 25
   deg sideways; neck 80 deg twist; spine 60 deg total twist; shoulders within anatomical cones.
5. **Balance:** on the ground the centre of mass stays over the support area (10 cm margin), except in deliberately
   dynamic moments (starts, stops, jumps, rolls, falls, pushes).
6. **Timing:** no action is faster than a trained person could do it. Starting minimums:

   | Action | Minimum |
   | --- | --- |
   | Stand to crouch | 0.25 s |
   | Crouch to stand | 0.3 s |
   | Flick turn | 0.4 s (G33) |
   | 1 m mantle | 0.6 s |
   | Vault | 0.5 s |
   | Ladder rung | 0.3 s |
   | Weapon raise | 0.75 s pistol, 1.1 s rifle (G103, Michael 2026-10-22, DRAW-TIMES.md) |
   | Weapon swap | 0.6 s |
   | Grab a body | 0.5 s |
   | Lift to carry | 1.0 s |
   | Takedown | 1.0-1.5 s (5.4) |

7. **Weight and follow-through:** anticipation before jumps; compression on landings; overlapping motion of arms, head,
   kit and weapon through the shared spring layer; the head leads turns; eyes and head look at the aim point, the next
   grip or a threat.
8. **Variation:** no identical loops side by side; idles breathe; guards get small per-guard timing variation. Operators
   move the same (G109).
9. **Interruption:** every state has a blended exit for hit, alert, partner left and anchor gone.
10. **Frame rate:** the same poses at 60, 120, 144 and 240 Hz (`e2e-anim`).
11. **Network:** remote poses obey the same limits; paired moves align within 3 cm at contact on host and client.

**Guard body language:** each alert state is a distinct posture readable at 15 m: relaxed patrol, suspicious,
investigating (weapon low ready, torch in the dark), alert, searching, radio call, alarm run, blinded, gassed, knocked
out, and ragdoll hand-offs with no snap.

#### 5.12.3 Tools

- **Pose viewer:** a debug screen to pick any clip, state or transition, scrub, slow down, loop and orbit, with overlays
  for joint limits, contacts, balance and clipping.
- **Contact sheets:** `scripts/anim-sheet.mjs`.
- **Feedback tool:** Michael tags in-game feedback notes and photos `anim`; every tagged note becomes a fix item.
- **Anim tuner (G219):** live sliders per state and gun hold per weapon and state, functional not pretty, saved in
  IndexedDB, exported as JSON, pad control; it opens from a menu and works by touch (G220).
- **Tuner v2 (G226):** the Anim Studio stage with free view, loop player, undo / A-B / presets; per-joint offsets, hand
  and foot placement, stepping, per-key editing exported as clip keys, a weapon group (gun scale visual only).
- **Tuner additions (G228):** smooth state changes, Import JSON, wider ranges, a bake script into the code defaults, a
  bypass button, slow motion 0.1-1x, slider search, per-limb IK weight; no copy state to state.
- **MPFB2 (G211):** the official GPL MakeHuman add-on in the desktop Blender for weight rebakes; nothing from it ships.

#### 5.12.4 The animation audit harness

`scripts/anim-audit.mjs` drives every state and transition headlessly, local and remote, and records against 5.12.2 and
the 5.17 D2 limits: joint velocity peaks, pelvis jumps, foot and hand slide, clipping, range-of-motion violations, balance
and action durations. Every new or changed clip passes it before it is committed. The audit inventory and its history are
in `docs/archive/locomotion/`.

### 5.13 Health and damage

CT model: a health bar, no regeneration, wall medkit stations only (G20, G98).

| Item | Value (starting values) |
| --- | --- |
| Health | 100 |
| Medkit station | Fixed in the map, hold to use, single use; heals by difficulty, as CT's wall cabinets: full on Normal, 50% on Hard, less on Expert (G180; our presets in `tests/medkit.test.ts`). Stations are placed in every map. No carried medkits. |
| Checkpoint | Saves current health. Reloading after death or failure restores at least 50%. |
| Revive | 5.9 C6 (restores 35%); Sector Ops revive syringes (G188). |
| Scanner hack | Costs 10 HP for a late or abandoned hack; nothing when the partner never started (G193). |

**Damage taken scales with difficulty** (5.7, G106; resources also scale, G131). Guard rifle hits to down a player from
full health, today's presets: about 8 (lowest), about 6, 4, 3 (highest). Other weapons scale from the rifle; headshots
on a player do double damage.

### 5.14 Operators

Two operators, Wren and Moth, are built and playable; there is no four-operator plan (G71). Tally and Sexton are radio
and briefing crew, not playable (G112).

- **Realistic** (G68): the operators come from the realistic character pipeline on `feature/operators`; guards and
  weapons follow later from the same pipeline. The voxel look is retired (2026-10-23, Michael: "nothing should be voxel"; G282). That
  branch keeps its own decisions and open items (G75).
- **Wren is the player character** for both players, with no dev switch, before the prototype is done (G123, replaces
  G70's "after the prototype, behind a dev switch"); Michael tunes movement on her himself (G227, replaces G150's core-feel job); then the weapon
  step. The shared-body proportion fixes apply to every character since Wren went in, and movement and climbing tests
  re-run (G72).
- **Sizes:** Wren stays 1.68 m (G74). Operators differ in look and height only: one movement set, one capsule, one camera
  height (G38, G109).
- **The goggle:** original, no three-lens look (G69); on the brow with a dim glow when vision is off, over the eyes with
  full glow when on (G73). The glow is visual only, never a light, never seen by guards; it is how a player finds their
  operator in darkness (L7). Wren's goggle light is green, Moth's purple (G196; amber failed the colour-blindness rule); both must stay distinguishable for common colour
  blindness. The goggle light colour is also the partner beacon (G135). While both players are Wren (G123) the colour
  follows the player, not the operator: player 1 (the host, and solo) green, player 2 cyan (ops A112: amber is the
  HUD's exposure warning and green / amber is the pair red-green colour blindness confuses).
- **Choosing:** each player picks a different operator; the host resolves duplicates. Cosmetics stay parked.

| Callsign | Role | Goggle light |
| --- | --- | --- |
| Wren | Lead | Green |
| Moth | Climber | Purple (G196) |

Roles are personality and story only, never stats (story Section 4). Both operators play the same; each mission issues
the pair complementary kits (G134, G153).

### 5.15 Mission 8 finale

Mission 8 has no traitor and no player-versus-player finale (G9). The finale is designed with the missions
(`docs/story.md`). The old Confrontation design is history (`docs/archive/design-bible-history.md`, 5.15).

### 5.16 Visual target

- **CT's look (G1, G5):** CT's visual style and HUD layout are copied closely, with original art assets. Desktop aims to
  surpass CT in fidelity (Michael, 2026-10-09). Visual work never changes gameplay.
- **Realistic everywhere (G68).** The voxel look is retired (2026-10-23, Michael: "nothing should be voxel"; G282).
- **Guards:** realistic, all male, a larger build than Wren, clear variety by archetype (armour, helmets) (G310);
  mid-detail faces on most kinds, balaclavas on heavy / armoured, the same look after a section restart (G320). Extra
  co-op player characters come after all levels are done (G310).
- **Where to win:** lighting and atmosphere: soft shadows shaped by the lamp fixture, one-bounce light, light cones in fog
  and rain, flickering and failing lamps, flashlight beams in haze, rain with wet surfaces and drips, steam and dust in
  light shafts.
- **Hollowmere's identity:** orange sodium lamps against blue moonlight, rain-wet stone and metal, deep blacks (L7).
- **Vision modes** as CT (5.5).
- **Camera finish:** filmic tone mapping and grading, subtle grain, restrained lens effects.
- **CC0 textures:** free CC0 texture files are allowed for surface detail, bundled with the game (never fetched from third
  parties at runtime), cached for offline play, each source and licence in `docs/art-credits.md` (created with the first texture). The texture budget is
  set in its job (G94).
- **Each map's documents** define its palette and lighting key (lamp colours, moon, the colours of dark and lit areas).
- **Beauty shots:** a fixed set of camera positions per map (`scripts/shot.mjs`, GPU runs on Michael's PC). Michael
  compares them privately with CT screenshots; those never go in the repo.
- **The art direction guide** waits until after the prototype (G113).

### 5.17 Locomotion rules still in force

From the locomotion run (loco D1-D8, 2026-10-13; `docs/archive/locomotion/DECISIONS.md`, history). D3, D4, D5, D6 are history;
what survives of D5 is G30 (5.3).

#### D1 Controls

- The pad is the primary design target, then keyboard and mouse. Every verb is designed and tuned on the pad first and
  covered in `e2e-pad` and `e2e-mouse`. The layout is CT's default, button for button (G96). Touch is gone (G12).

#### D2 No bobble

Starting limits, frozen in config with unit tests (`src/anim/audit/limits.ts`):

- Pelvis vertical travel, peak to peak per stride: crouched speeds 2.5 cm or less, walk 4 cm, run 6 cm. Exactly one low
  and one high point per step; no double bounce. (The old sprint value is void: there is no sprint.) Mocap clips keep
  their captured bob (walk 5.5-6.6 cm); checkers note it, not fail (G271).
- Head: vertical travel no more than the pelvis; pitch and roll oscillation 2 deg or less.
- Lateral pelvis sway at walk: 3 cm or less.
- Camera: no camera bob; the camera follows the capsule, never the head or pelvis; vertical oscillation 0.5 cm or less in
  steady movement; a landing gets one damped dip and no rebound.
- Weapon and kit sway settle within 0.2 s after a stop, with no secondary wobble. Idle breathing 1 cm or less.
- Measured at every speed, in both stances, on flat floor, stairs and slopes, at 60 and 120 Hz, local and remote.

#### D7 Input options

- Full remapping of every action, for the pad and for keyboard and mouse, with conflict warnings and a reset to defaults
  (warn-and-save bindings, loco M20 Q6).
- Every hold action gets a hold or toggle setting.
- Settings persist in IndexedDB through `src/save`.
- Custom difficulty sliders are removed (G7, G106).

#### D8 Co-op parity

Every feature works smoothly in co-op (2 players; up to 4 in Sector Ops), to 5.9 C11:

- Every new or changed movement state, verb and clip has a networked `MoveState` mode; committed moves are host-approved;
  health, the drawn / holstered state and the weapon in hand are host-authoritative; local-only items stay local (C11).
- The body layer runs on remotes from `MoveState` plus velocity, computed locally, with no extra bandwidth.
- Partners never interpenetrate; shoulders turn to pass in tight spaces; head look-at includes the partner; two players
  can stack on one wall; every team move gets contact IK with no clipping between the two bodies.
- Tests: every new state adds an `e2e-netmove` case; the anim-audit harness also runs on remote poses; rubber-banding or
  pose error above the `e2e-netmove` limits fails.

---

## 6. Out of scope

**Removed** (code deleted; logs in `docs/archive/consolidation/deleted-*.md`; history in the git log and `docs/archive/`):

- Blacklist systems: snap cover, cover glide, cover-to-cover, blind fire over cover; Mark & Execute; sonar; the Ghost /
  Panther / Assault tracker and cash; the regenerating shield.
- Phones and touch: touch controls, the layout editor, the phone look, phone budgets (G12, G13). The Kestrel editor keeps
  its phone launcher as a dev tool, with no new work (G15).
- Wave Survival, Team Deathmatch, Free-for-all and all player-versus-player code; the old Mission mode does not return as
  team-versus-team (G8, G12).
- The traitor finale and any player-versus-player finale (G9).
- The retired maps: the 1934 Kestrel Exchange, the Trunk Annex, Dead Line v1 and v2 (G12; designs in
  `docs/archive/maps/`, G91).
- Emotes and the old solo Training mode (G24, G116). Marlow Yard is the only training course (G184, G292).
- The tri-rotor drone, custom difficulty sliders and the alarm-tolerance setting (G7, G106, G115).
- Carried medkits and the medkit count (G98).
- Every gun outside the CT kit (G76, G115).
- The solo campaign, the bot partner, 3-4 player campaign play and the four-operator plan (G2, G48, G50, G71, G111;
  Sector Ops alone allows 1-4, G308).
- Sprint and the sprint-only moves (fast ladder climb, fast rappel descent, small gap hops, sprint door bash), the quick
  180, the planted pivot, the braking stop (loco M20 Q8, G25, G26, G31, G33).
- Lean-out aiming and the SWAT turn (loco M20 Q1); Kestrel's own wall hug (G37); wall entry by pushing into a wall (G34).
- The elbow strike (replaced by the palm strike, loco M20 Q4); the stealth / kill selector (G23).
- Aim assist (G16); the exploring-camera shoulder swap and camera zoom on aim (G17, G29); the goggle flip (G100).
- Prone and the solo rope climb (G110; CT's two-person rope stays, G180); stance and gear icons on the HUD (G107).
- Brace and the dedicated dual takedown (G180).
- Decided out on 2026-10-18 (code goes when its job runs): the thrown EMP gadget (G152), player-chosen loadouts
  (G153), heavies and dogs in campaign missions (G155), the exploring camera's automatic swing (G159),
  marked-spot-only boosts (G151), remote hacking tools (G142), failing a mission on an alarm count (G125), a partner
  marker or live partner position (G135).
- Decided out on 2026-10-25 (code goes when its job runs): every map: the briefing map, the field-menu map of known
  intel, the minimap, the compass and the objective blip, in every mode (G336, G339).
- The four non-CT ideas from the movement run (the last-known-position marker, the remote digital layer, the
  under-3-second retry target, the after-action route map; G11, G180) and the movement run's 62-item review list (G39).

**Parked** (code kept behind `?legacy=1`; no new work):

- Hunter: the one non-CT mode; it comes back later (G7).
- The old Mission mode.
- Credits, XP-gated unlocks, shop, suit upgrades, HQ, challenges, weapon mastery; camos, outfits, appearance editing.
- The drone operator guard archetype (not placed in maps).
- The Fallow bunker (map `bunker`, `docs/archive/training/`), the old co-op tutorial; Marlow Yard replaced it (G184, G292).
- Parked maps (Embassy, Mansion, Port, Refinery, Dust Depot). The Warehouse stays selectable as the old Sector Ops map
  (G298).

**Paused:** Kestrel (branch `feature/kestrel`; G53). Campaign Mission 1 is Tallow Wharf, not Kestrel (G340).

**Never:**

- Reference-game names (G6, G114), story, characters, logos, UI art or art assets (G5).
- External art files, except CC0 textures (5.16); the operators pipeline's sources are decided on `feature/operators`
  (G75): a CC0 base human body, built into each operator offline by in-repo Blender scripts and bundled. Audio may use
  CC0 recordings for any sound (S7). CMU motion-capture takes for the mocap set are allowed (converted clips bundled,
  raw files not committed, credited in `docs/art-credits.md`; G264, G268, G276).
- Random patrols that defeat planning; in the campaign and Sector Ops, forced timers in stealth sections and countdowns
  that close a route (soft windows only, G334; Marlow Yard's timed drills are allowed, G342); world waypoints and maps
  (G336); kill cams; monetisation.
- Voiced story lines now: they are a later idea (G82). Voice chat is not out of scope: it comes after the prototype
  (G156, 5.2 S10).

---

## 7. Level design

`docs/level-design.md` is the level design standard. It applies to every map, with `docs/templates/map-spec.md` (the map
spec template) and the standard's phases and gates.

- **Campaign maps recreate the CT co-op levels** (G3): their design, flow and moves, with original sites and story. The
  research job writes what each level teaches and how the pair moves through it.
- **Campaign maps** are co-op only (G253): every section forces a co-op traversal move with no solo bypass (G292). A
  linear spine joins the sections, with loops inside them (G284). Mission 1 and the first prototypes are on
  Tallow Wharf, a new small campaign map (G293, G340).
- **Marlow Yard** (map `ctcourse`, Course mode) is the 2-player co-op training course, replacing Fallow (G184, G292):
  heavily guided and very linear, one route, with split paths and multiple objectives only in its later sections, as
  teaching (G292). It keeps its guidance marks and an always-on objective list; no explainer pads (G277, G292). Timed
  drills that force the players into situations are allowed, as training (G342). The
  final pass rebuilt it freely around co-op scenarios, one co-op run 15-20 min (G272): a believable, luxurious training
  facility, dressed straight after each greybox (G278), with the Marlow Yard audit's shortlist (ceilings, lamp
  fittings, airlocks, dressing, walls to ceilings, paint, lifts, fiction; G225). Lit by default: the players cut the
  light, with mixed zones where they play better; a view-only instructor gallery; normal, armed guards (G279, G298),
  one of whom can be interrogated (G206). A checkpoint restart is a full reset (guards, bodies, cameras, doors); the S3
  hallway camera is bulletproof (G312).
- **Sector Ops' Saltmarsh Park** (5.8): five sections S1-S5, signed off 2026-10-25 (G328).
- **The Fallow bunker** is parked behind `?legacy=1` (Section 6). Its anti-stuck resets (G80) and training D41's linear
  rules (G117) bind only the bunker.
- **Validator and gates:** every map gets a connectivity-graph JSON and passes the Node level validator before
  greybox, with scaled room sizes from one metrics JSON, 2+ independent routes per section and measured targets (G284,
  G285). At greybox exit: a measured validator pass (G289), each space's light measured against its real-world band
  (L17, G329), and bot route-runs over every declared route against live guards, then a 10-minute walk card for
  Michael (G330). Before greybox or art on a map, or a big look change, Michael approves a one-page to-scale plan with
  one click (G288).
- **Guards:** as many as realistically possible, limited by the guard-cap perf floor and passable routes (G289); static
  lookouts on some high routes and paired patrols (G335). Lit choke points may be hardened with a route around (G333).
- **Order:** the live order is `docs/ROADMAP.md` "Now" (Section 10).
- **Level standard changes:** the 12 changes the research proposes (design-kit-digest appendix) go to Michael item
  by item before the first real mission map (G157).
- **One folder per map** under one maps folder; Kestrel and the bunker move there after the merge (G55).
- **Engine facts.** The standard's Section 12 lists the engine facts maps are designed against (5.3 metrics, S5 silent
  speeds, the co-op ledge band). A job that changes one must update `docs/level-design.md` and list, in its report, every
  decision in every map document that relied on the old fact. Room sizes are re-measured after the camera part of the
  prototype (G54).

Each map's required deliverables (the map spec, light, sound, checkpoint, co-op, medkit and civilian plans) are listed
in `docs/level-design.md` section 13, its owner. The light plan carries each space's real-world band (L17).

---

## 8. Platform and performance

- **Desktop only** (G12): the installable PWA in a desktop browser, pad first, then keyboard and mouse. Button prompts
  swap at once when a pad connects or disconnects. Automatic tests run as a desktop (G13). A phone can launch it for
  testing only (G182): minimum settings, the UI scaled to fit, a Bluetooth pad; no touch controls, checks or tests, except
  the anim tuner, the one touch exception (G220).
  The phone minimum keeps baked lamp light and one cheap character shadow, caps the frame rate for heat and fills any
  aspect with no letterbox (G215); the menu hero renders at High (G216); phones cap at 75% resolution, no WebGPU yet
  (G218). Menus and HUD fit an iPad (safe-area insets, version label on screen, the Windows GPU banner only on Windows)
  (G311).
- **Performance:** the budgets in `docs/systems/performance.md`, set to the target laptop's numbers (G14). A guard out
  of view animates at a lower rate, but one whose shadow falls in view counts as seen (G327).
- **Gameplay reads only** collision, occupancy, anchors, the light bake and the noise model. It never reads graphics
  presets, LOD or the governor.
- **Offline:** the game installs and loads offline; the campaign needs a two-player co-op session, online,
  split-screen or over LAN (G133); Sector Ops can be played solo (G308).
- **Release intent:** a personal project. No store builds and no paid infrastructure unless it is cheap. The originality
  rules hold anyway.
- **Accessibility defaults:** subtitles always on (they are the story); operator goggle colours distinguishable for
  common colour blindness; rumble toggle; hold or toggle for every hold action except aim, always LT held (G214).

---

## 9. How we build

The process lives in `CLAUDE.md` ("Sessions": the orchestrator, machines, jobs, test tiers, branches; commands; definition
of done) and `docs/systems/session-method.md` (the job lead's loop); the process audit (2026-10-19,
`docs/process-audit/`) set them. In short:

- **Authority order:** Section 0 (G86).
- **Branches:** master is the only base. One branch per job from master, one PR each (G83); green PRs ride automatic
  rolling trains to master, no wait for Michael (G286, G318); master always holds every finished update, and the
  orchestrator asks Michael when unsure. Previews beside the live game: `/preview/` (master, through `dev`) and `/ct/`
  (through `ct-movement`) (`docs/systems/deploy.md`; replaces G85).
- **Prototype, then orchestrator:** every multi-step job builds a quick prototype for feel or look first, then runs the
  orchestrator method (G87). Refining is allowed, at most 3 unwalked features per area, a walk card per release, and a
  one-click sign-off before greybox, map art or a big look change (G288). An idle lead starts the next roadmap feature
  in its area (G283). Test jobs: visual-gate and coop-real (G287, assumed, undoable).
- **Decisions:** the orchestrator folds Michael's ROADMAP "Decided" entries into `docs/DECISIONS.md` daily with the next
  free G numbers, and into this bible, rewritten in place (G86, G89, G337).
- **Jobs:** `docs/ROADMAP.md` (owned by the orchestrator) lists what runs now and what waits on Michael (G90 in its
  current form); each job keeps BRIEF, PLAN and STATE in `docs/<job>/`.
- **Models and pace:** Opus plans, briefs, checks and writes tricky engine / AI / animation code; Sonnet builds from
  strict briefs; Haiku does chores (G302, replaces G88 and G158); full burn until Michael says to slow down (G304,
  G324) with lean messaging and batch checkers (G305); two checkers on AI and `src/net`, cloud builders, plans 2-3
  slices ahead, high effort for leads (G319). Overnight rule loosenings are applied as assumed, logged and undoable
  (G301).
- **Pipeline:** the laptop queue, fixed swap prompts, automatic suite selection and fully automatic rolling trains; no
  e2e on the desktop except the overflow lane (G318, G321, G322); release-speed (G317); the watchdog adds
  `train-ready` once CI, checker and affected e2e are green (G325).
- **Trains:** a failing member is dropped and the train rebuilds, auto-train ticks every minute, and train N+1 may build
  on train N (G286).
- **Versions:** notes say Unreleased until the merge; every merge to master gets the next `4.MINOR.PATCH`, a job or
  feature a minor step, a fix or docs-only merge a patch, set by the orchestrator (G183, G93). The consolidation merge
  is 4.0.0 (G84).
- **Tests:** test tiers by kind of change (CLAUDE.md "Sessions"); the full e2e run is the training level and its systems,
  with parked, audio and GPU suites in their own runs (`docs/systems/testing-tools.md`). `TESTING.md` holds one desktop
  checklist and a release checklist (G92).
- **Token hygiene:** read `CLAUDE.md`, the job's plan and only the files it lists; use grep and line ranges; never re-read
  this bible in full in a session.

---

## 10. Roadmap

The live job list, ranked, with owners and gates, is `docs/ROADMAP.md` "Now" on origin/feature/menu (G90;
`docs/progress.md` is its history). This section only says where the game stands.

1. **Done:** the CT co-op research (2026-10-18, digests in `docs/ct-research/`, G124-G160); the core-feel job, closed
   when Michael took over movement tuning (G227, replaces G150); Wren in for both players (G123).
2. **The goal** (CLAUDE.md "Current goal"): Marlow Yard fully playable by two players end to end, with all co-op moves
   and light parity; refining allowed, paced by the walk cap (G288).
3. **In parallel:** Sector Ops' Saltmarsh Park S1-S5 greybox (signed off, G328) with light-realism (G329); the mission
   framework, then the four prototypes: Three Grey Coats and Two-Key Ledger on Tallow Wharf (Mission 1, G340), Split
   Shift and Code Relay on the campus (G291, G293); guard AI (G299, G335); guard models (G310, G321); the animation
   passes; the test jobs (G287) and route-runs (G330).
4. **Later**, each its own job: menus, the music revision and the art guide (G113); missing sounds (G66); voice chat
   (G156); Kestrel's future (paused, G53); the rest of the campaign missions; more co-op player characters after all
   levels (G310).

---

## 11. Open decisions

From `docs/DECISIONS.md` "Deferred", with where each is decided.

**After the CT co-op research** (done 2026-10-18, G124-G160; friendly fire G141 and heavies G155 are settled; the
research findings for Michael to confirm are settled by G180):
- CT's full gadget and attachment set, including the ring airfoil and the knife's role (G76; held jammer G152, no
  remote hacking G142).
- Every remaining "research" item in this bible (Section 4, 5.9 C12-C18, awareness arcs).
- Whether the soft team-mate outline stays under G135 (5.9 C10).
- The 12 proposed level standard changes, item by item before the first real mission map (G157).
- Kestrel's future (G53).

**Tuned as Michael plays:**
- Every movement, camera and timing number (G10); Michael tunes movement himself (G227).
- Room, corridor and crawl sizes (G54; the scaled room table, G285).
- Missing sounds (G66).

**The menu job** (G113): how the lobby picks the course, what mission cards show, prompt font, title screen text, a
Feedback item on the main menu, the three menu-plan calls (key mapping, cinematic shots, removals), and the briefing
screen with no map (G336; owner assigned at the next plan).

**The music job:** music direction (Michael's pick "Dark orchestral" is not firm), music on briefing, results and pause,
confirming the long menu theme and the Calm / Cautious alternatives.

**The operators branch** (G75): the operator file size limit, its technical assumptions, re-checking Wren's kit on the
real CT poses.

**Kestrel, if it returns** (paused, G53; Mission 1 is Tallow Wharf, G340): the editor, mission and level technical
items, and its own open items (`docs/kestrel/progress.md`).

**Parked with Fallow** (Section 6): the bunker rebuild items (G79): drills on CT moves, the bunker's exceptions, small
design calls and technical assumptions.

**The missions:** site and company names; the open story items in `docs/story.md`.

**Still unanswered** (asked again later):
- The guard cap per mode: measured by the guard-cap job (G187, G274, G289; 5.7).
- Head look-at order, muzzle rule near a team-mate, body cooling in thermal, the electro device list.
- Which gun comes out first; how guns are carried when put away; what Wren's kit shows (the magazine look); what Wren's
  hip pod holds now the drone is removed.
- Course callsigns (own operator or fixed Wren / Moth); the bunker's solo test switch (training D21 stands meanwhile).
- Whether the LKP becomes per player in co-op (5.9 C5).
- A relay (TURN) server for co-op, after real sessions with friends (5.9 C19).
- The names and number of CT's fixed difficulty levels (G106); the code keeps its four presets until the prototype.

---

## Appendix B - Job report template

```markdown
## <job> - step X report
- Done: <one line per item>
- Files changed: <paths>
- Decisions: <ambiguity -> choice -> why>
- Tests: <exact commands -> result, counts>
- Measurements: <perf numbers vs before>
- Open issues: <what is not done or uncertain>
- Next: <the next step, or "job complete - STOP">
```

(Appendix A, the old phase spec template, is history: jobs are set up by `docs/systems/session-method.md`.)

## Appendix C - Checker checklist

1. Does the diff do what the job's step says, and nothing it does not?
2. Is it Chaos Theory (G1)? Does it add anything CT does not have?
3. Does anything make light less truthful, readable or controllable (P1)? Does gameplay read any graphics state?
4. Does it extend a removed or parked system (Section 6)?
5. Does it work for both co-op players, host and client (5.9 C11)? On pad and on keyboard and mouse?
6. Is pure logic separated and unit-tested? Are there e2e checks for player-facing behaviour?
7. Are there allocations in hot paths? Are the performance budgets measured?
8. Do animations meet 5.12.2: instant control but a continuous body, no pops, no slides, no clipping, human timing?
9. Is a save change versioned and migrated? Is a wire change versioned?
10. Are any reference-game names introduced (G6)?
11. Are docs and `docs/DECISIONS.md` updated?
