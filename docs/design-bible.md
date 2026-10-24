# Night Shift - Design Bible

Version 2.0 - 2026-10-18. Rewritten to Michael's current decisions (docs/DECISIONS.md G1-G118, "Rewrite it now", G10).
G124-G160 (the CT co-op research, 2026-10-18) are written into the sections they belong to. The 1.13 text, with the
removed systems and the old process, is in `docs/archive/design-bible-history.md`. Owner: Michael. Location in the repo:
`docs/design-bible.md`.

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
value, tuned after Michael plays the CT prototype (G4, G10). Section 11 lists what is still open and where it is decided.

**Chaos Theory is the authority (G1).** Where this bible and Chaos Theory (CT) behaviour differ, CT behaviour, measured
from Michael's footage and the CT research, wins. Several systems below are marked "research": the CT co-op research job
(G3, G95) keeps those CT has and removes the rest (G1, G11).
Where a 2026-10-18 decision departs from CT on purpose (revive and encounter checkpoints, world pings, both players
extract, the perfect rating, any partner rejoins: G126, G135, G138, G146, G147), that decision wins.

**History.** Older docs, prompts and code describe earlier directions: a Blacklist-style game (snap cover, Mark & Execute,
sonar, the Ghost / Panther / Assault economy), phones and touch, Wave and PvP, a traitor finale, a solo campaign and a
bot partner. That is history. Do not extend it. Section 6 lists what was removed and what is parked.

**What to read.** Sections 0-3, 6 and 9 every job; other sections when the job touches them.

**Reference game.** Splinter Cell: Chaos Theory (2005) is the reference for mechanics and look (G5): its mechanics,
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
game that recreates Splinter Cell: Chaos Theory's co-op campaign: its mechanics and its look, with original assets,
names and story.

- **A 2-player co-op campaign only.** Michael: "2 player coop campaign only, unable to be completed solo." Exactly two
  players; no solo route, no bot partner, no 3-4 player play (G2, G48, G50, G111, G132).
- **The CT co-op levels are recreated.** Their design, flow and moves are researched, and that experience is rebuilt
  with original maps and story (G3). The research is the first job (G95).
- **Prototype first.** Michael: "We must get a working prototype working, only the basics required to make it work and
  functional to test features and gameplay. ... Refinement can come later." (G4) The core feel comes first: CT movement,
  camera, back-to-wall, doors, palm strike and goggles are rebuilt and fine-tuned on Wren until Michael signs off, then
  the co-op slices follow (G149, G150).
- **Story** (`docs/story.md`): a present-day (G124), standalone co-op story (G136); a grounded techno-thriller with dry
  humour. Two operators, Wren and Moth, of the deniable unit NIGHT SHIFT, with the handler LANTERN and the radio crew
  Tally and Sexton (G112), have nine nights to stop SUNDOWN, a staged blackout of the port city of Hollowmere. The team
  that lives in shadow has to keep the city's lights on. Story is text radio and subtitles now, written so it can be
  voiced later (G82).
- Darkness, silence, acrobatic movement (heightened: showpiece two-player moves beside grounded ones, G130), teamwork
  and patience are the tools. Combat is possible, but it is a sign that something went wrong.
- **Desktop only** (G12): an installable PWA in the browser, pad first, then keyboard and mouse.
- **Realistic** characters and a realistic look everywhere (G68).

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
- **Test:** stand anywhere in any map at any graphics preset. The rendered brightness of the player, the meter and the
  guards' detection rate agree.

### P2 - Sound matters

- Every movement makes noise relative to the environment. Loud places (machinery, rain) let you move faster; quiet places
  punish haste.
- **Test:** the sound meter shows your noise against the local ambient level, and guards hear exactly when the meter
  says they can (G61).

### P3 - The players author the approach

- Every space offers more than one route (high / traversal, low / shadow, loud) and lethal and non-lethal options.
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

- Two players, one mission. The levels are built for the pair: team moves and coordination are part of the route, as in
  CT's co-op campaign (G2, G3).
- Every feature works in co-op (5.9 C11, 5.17 D8).

### P7 - Desktop, pad first

- Desktop only (G12). The pad is the primary design target, then keyboard and mouse (5.17 D1). The pad layout copies
  CT's default layout button for button (G96).
- Gameplay never depends on graphics settings (Section 8).

---

## 3. The player experience

### Mission flow

1. **Briefing:** text, an annotated top-down map and the pair's complementary kits, fixed per mission (G134, G153).
2. **Insertion:** where the mission offers more than one.
3. **Space by space**, following the level design spine: scout from the entry vantage, plan, execute together, reach
   the next checkpoint.
4. **Radio:** the handler and crew talk through text radio. Radio never blocks input.
5. **Objectives** live in the menu, as in CT (G108). Primary objectives complete the mission; secondary and opportunity
   objectives raise the rating.
6. **Extraction:** both players must reach the exit (G138).
7. **Results:** the stealth rating and its breakdown (Section 5.8).

### Failure and recovery

- **Detection** escalates: suspicious, then investigating, then alert, then search.
- **Breaking line of sight** works. Guards search the last known position, not the real one. Guards know only what
  they saw: no one knows a second intruder exists until one is seen or evidence suggests it (G139).
- **Alarms** raise a shared alert tier that escalates the response; no mission fails on an alarm count. A mission has
  at most one hard rule, and it is signposted (G125). Note 2026-10-24: up to 2 strict rules per mission, and breaking
  one restarts the section, not the mission (G290).
- **Downed:** the partner can revive within 30 seconds, at most twice per mission; both players down reloads the last
  checkpoint. Encounter checkpoints cap replay loss at about 10 minutes (G126).

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
| Palm strike | One-hit knockout from any side on every human guard; co-op missions have no heavies or dogs. | loco M20 Q4, G42, G155 |
| Knife | Close lethal takedown; its full role follows the research. | G76 |
| Dual takedown (co-op) | | G52 |
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
| Brace, boost, human ladder | Free wherever the space allows, with a prompt naming the move. One ledge band of 4.3-4.5 m serves boost and human ladder. | G52, G57, G151 |
| Dual takedown | | G52 |
| CT's other team moves | Split-jump boost, back-to-back climb, pull-up, rappel anchor and any others CT has: added in the co-op job. Showpiece moves (partner launch, drop line) sit beside grounded ones. | G3, G52, G130 |
| Revive, carry a downed partner | Revive within 30 s, at most twice per mission; carrying: research | G126, Research |
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
- **L8 - Controllable light.** Every lit space offers at least two ways to change the light (switch, breakable lamp,
  the pistol and its held jammer (G152), and whatever else the research keeps).
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
- Note 2026-10-23: one lighting system on every map: realistic inverse-square falloff (G314) with no Classic path or
  falloff setting, soft light edges against walls and floors, hard only where an occluder cuts the ray, guard torches
  stopped by walls and shut doors with soft beam edges, a CT-grade showcase audited in LR16 (G316); the 2-4 lamps
  nearest the players cast real-time character shadows at High+ (G315); fires flicker and one failing tube stutters per
  main map, swinging pendants on Marlow Yard only (G323).

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

CT movement was first measured from Michael's footage (loco M19, M20, M23, M25; research in `docs/locomotion/`); G210 drops
that reference. Implementation: `docs/systems/movement.md`. All numbers are starting values (Section 0). All
movement and its animations follow a real-world trained-operator standard (G210, docs/anim-rework/BRIEF.md). Michael
fine-tunes movement himself as needed; movement slices and research are off (G227, replaces G150's tune-until-sign-off).

**Stances:** standing and crouched only. No prone, no rope climb (G110). Sneaking slowly near an enemy, the crouch
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

- **The palm strike** (loco M20 Q4, G42): a one-hit knockout from any side on every human guard. Co-op missions have
  no heavies or dogs (G155). Recovery about 1.4 s (loco M25 (5)). A small noise
  event. Host-approved in co-op.
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
- **Dual takedown (co-op):** both players act on a host-approved shared start (5.9 C11).

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
  docs/anim-natural/n3/DRAW-TIMES.md):** draw to low ready 0.75 s (pistol) and 1.1 s (rifle, off the back); holster
  0.9 s (pistol) and 1.0 s (rifle). The tuner's Draw multipliers and the per-clip speed slider fine-tune them.
- Releasing aim never cancels a reload (loco M4, A43).

**Gunplay:**

- Aiming is the only way to shoot. Normal aiming has no zoom. The sniper scope has hold breath, as in CT (G104).
- No aim assist on any input (G16).
- Crouched and still is steadiest; speed and motion widen spread.
- Every shot is a noise event; suppressed shots are quiet, not silent; impacts are heard nearby.
- Every shot can kill a lamp (P1). The gun is also a light tool.
- One headshot downs an unarmoured guard. Helmets and armour appear with alarm levels (5.7). Co-op missions have no
  heavies (G155). Note 2026-10-23: later sections reward stealth over shooting: a helmet takes the first headshot,
  body armour makes torso shots stagger, limited suppressor ammo, no ammo inside a section and one weapons-crate
  refill per player between sections (G307).
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
  officer; the heavy and dog archetypes are not placed in co-op missions, G155), barks (shown as text), difficulty.
- **Mission alarm level 0-3.** Each raised alarm adds one level. Level 1: guards draw torches in the dark. Level 2: more
  guards wear helmets and armour, patrols tighten. Level 3: reinforcements. No mission fails on an alarm count; a
  mission has at most one hard rule, signposted (G125). The alert tier is shared, but guards know only what they saw:
  no one knows a second intruder exists until one is seen or evidence suggests it (G139).
- **Environmental change** alerts guards: lights changed in view, a missing patrol partner (radio check), bodies, broken
  glass heard, and doors (G41): guards close doors behind them on a calm patrol and notice any door open that should be
  shut. One 15% threshold covers light, sound and sight through a door.
- **Guards see poorly above them (G44):** a player well above a guard is hard to spot, as in CT.
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
- **Awake limit:** at most 12 guards awake at once, reviewed against desktop performance (G46). How it is set (FU-11) is
  open.
- **Difficulty (G106):** CT's fixed difficulty levels, one per session, chosen by the host. No sliders and no
  alarm-tolerance setting. Difficulty scales guard perception, alert tolerance and resources; sync timing windows
  never scale (G131).
- **Awareness arcs:** shown today; research (G1).
- Note 2026-10-23: every guard is armed on every map and cameras keep IR (G298). Guards hear only within range,
  wake knocked-out guards, report bodies and stay cautious, investigate a broken light in ones or twos then return,
  pass alerts by voice and radio without alerting everyone at once, hold high-security posts, and fight smart and
  tactical; reinforcements are aggressive (G299). KO caution is timed; reinforcements come only after a raised alarm;
  radio spreads through the own section, staggered; cameras see and report bodies (G300). Later sections: bulletproof
  and thermal cameras, riot shields in response teams, alarms that escalate gear, response teams that stay and search,
  missed check-ins raise alert (G307). Lasers draw a search of the laser spot, not the player; longer body
  investigations; no walking through each other or doors; holstered in calm areas (G312).

### 5.8 Missions and campaign

Implementation: `docs/systems/modes-and-progression.md`.

**A mission is data:** map, spaces (the spine from `docs/level-design.md`), insertions, objectives, rules, triggers,
radio script, checkpoints, kits (G153) and co-op moments. It is validated by a schema with a unit test (`validateMissions`).

**Objectives:** primary (required), secondary (optional, rated), opportunity (revealed mid-mission by intel,
interrogation or radio; optional, rated). Types: terminal / download, plant, intel, rescue / escort, sabotage, extract,
interrogate a named target. They are read in the menu (G108).

**Rules:** `noAlarms`, `noKills`, `noBodiesFound`, `maxAlarmLevel`. Each rule is either bonus or fail; a mission has at
most one fail rule, and it is signposted (G125). Story-critical characters are protected until their role is done:
killing one earlier fails the mission, with a clear warning first (G145). Both players must reach the exit to finish
(G138). Note 2026-10-24: up to 2 strict rules per mission, signposted in the briefing and the objective list, "ghost"
counting as one; breaking one restarts the section from its checkpoint and the mission continues (G290).

**Triggers and actions.** Triggers: enter area, objective state, alert level, alarm level, interrogation, item taken,
light group state. Actions: radio line, add / complete / fail objective, enable / disable a squad, lock / unlock door, set
light group, spawn reinforcements, checkpoint, end mission. No timers in stealth sections.

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

**Missions** recreate the CT co-op levels (G3); the research decides their number, length and flow. The bible does not
take Kestrel's Mission 1 size until Kestrel is decided after the research (G53, G118). Story, sites and names:
`docs/story.md` (site and company names are decided with the missions).

**Mission 8** has no traitor and no player-versus-player finale (G9; Section 5.15).

**Sector Ops** (G184-G190) is the prototype's second mode beside the campaign: the Warehouse in sections joined by
connectors, rising difficulty with cameras and lasers, objective then exit, ghosting always possible, no lives (revive
syringes in co-op, checkpoint restarts), difficulty stars per op, and several routes with room to isolate guards. Michael's
playground for movement and gunplay; prototype effort, below the co-op training course in priority (G191).
- The fun-flow overhaul (several stealth routes per section, logical guard routes, realistic buildings, dogs with no
  flashlight; its spec may loosen `docs/level-design.md`, each change logged) is decided (G201) but parked: the current
  warehouse stays (G224).
- Warehouse lamps snap to ceilings; the open sections get translucent corrugated roof sheets that let light in but
  cannot be passed through (G221).
- Note 2026-10-23: team doors are true two-player pathways that cannot be used solo, without breaking solo play (G280).
- Note 2026-10-23: the redesign is a new, larger map, a corporate research campus of up to 5 sections, one co-op run
  30-45 min, up to 24 guards, security that makes sense and gets harder (cameras, lasers, alarm panels, keypads, then
  dogs and armed response), shorter camera range, co-op pathways that solo play can still pass, lit like a real site
  (G295-G297); some sections have an unavoidable guard (G303); the warehouse stays selectable (G298); the campus gets
  the full detail-art lift (G309); up to 4 players after the redesign, Marlow Yard stays at 2 (G308).
- Note 2026-10-24: campaign missions are 2-player co-op with strict rules; Sector Ops is 4-player co-op with parallel
  objectives for two teams (or one player doing them all). First prototypes: Three Grey Coats and Two-Key Ledger
  (campaign), Split Shift and Code Relay (Sector Ops), on a mission framework (G291).

### 5.9 Co-op (P6)

Implementation: `docs/systems/coop.md`.

- **C1 - Two players, exactly.** The campaign needs two players and cannot be completed solo (G2, G50). No bot partner
  (G48). Strictly two humans: no AI partner, no solo variants (G132).
- **C2 - Host authority.** The host is authoritative. There is no host migration: if the host leaves, the session ends;
  the host can resume from their checkpoint and re-invite. Clients keep no mission save. Any partner can join a saved
  mission; its progress belongs to the host (G147).
- **C3 - Team moves.** The four that exist: brace, boost, human ladder, dual takedown. CT's other team moves (split-jump
  boost, back-to-back climb, pull-up, rappel anchor and any others the research finds) come in the co-op job (G52).
  Team moves are free wherever the space allows, with a prompt naming the move (G151); showpiece moves sit beside
  grounded ones (G130); one ledge band of 4.3-4.5 m serves the boost and the human ladder (G57).
- **C4 - Levels need the pair.** Spaces are built around team moves and coordination, as in CT's co-op levels (G3).
  Note 2026-10-24: every campaign section forces a co-op traversal move with no solo bypass (G292); the kit: boost up
  a wall, throw over a gap, human ladder / pull-up, hold a shutter or door, rope brace / descent, vent unlock for the
  partner, and more (G293).
- **C5 - Detection.** Guards see each player separately (`PlayerRef.spotted` per player). Radio calls and alarms affect
  both. Guards know only what they saw: the shared alert tier rises, but no guard knows a second intruder exists until
  one is seen or evidence suggests it (G139). Whether the LKP becomes per player is open (Section 11).
- **C6 - Downed.** The partner can revive a downed player within 30 seconds, at most twice per mission; both down
  reloads the last checkpoint (G126).
- **C7 - Difficulty.** One per session, chosen by the host (5.7). Sync timing windows never scale (G131).
- **C8 - Friendly fire** is a host option, on by default (G141). Co-op missions have no heavies or dogs (G155).
- **C9 - Tests.** Two browser tabs, the automatic two-player tests (`?net=local`) and the bunker's solo test switch; no
  bot (G48). The co-op suites are made reliable, then required like every other suite (G51).
- **C10 - Operators:** each player is a different operator, Wren or Moth (5.14). Partners find each other by the partner
  beacon (each goggle light a distinct colour) and world pings; there is no partner marker and no live partner position
  on any map (G135). Whether the soft team-mate outline stays is checked against G135 when the co-op slices are built;
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
- **C21 - Network version.** Every wire change bumps `PROTOCOL_VERSION`. The SWAT-turn and lean-out network fields go
  when the CT prototype is built (G52).
- **C22 - Voice.** Partner voice is always clear (G140); proximity voice is an opt-in modifier (G129); both come after
  the prototype (G156, 5.2 S10).

### 5.10 HUD and UI

Implementation: `docs/systems/ui.md`; the menu plan: `docs/menu-ui/SPEC.md`.

- **The in-game HUD follows CT's layout (G77):** light meter, sound meter, health bar, ammo, selected gadget, contextual
  prompts (a team move names itself, G151), radio subtitles. No partner marker (G135). No stance or gear icons: the
  operator's body shows the stance (G107). No medkit count (G98). Objectives live in the menu (G108); the Fallow course
  keeps its always-on list.
- **Menus follow the Arkham Knight style plan** (feature/menu-ui-spec, G77). The menu job comes after the prototype
  (G113); its open calls are in Section 11.
- **No minimap and no world waypoints in the campaign.** No live partner position on any map (G135). Note 2026-10-24:
  no markers in campaign missions and Sector Ops, an optional hint layer (off by default), in-world guidance only;
  Marlow Yard keeps its guidance marks (G290, G292).
- **Field menu** (pause): objectives, radio log, map with known intel, interrogation notes.
- **Dev menus (note 2026-10-23):** Anim Studio only from the main menu; the animation tuner stays in the in-game menu
  (G313).
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
  matching, no captured data, no root motion driving control. Note 2026-10-23: CMU mocap locomotion behind a toggle
  (G264), kept as captured over the limits and feel notes below (G271), more clips without sheets (G273), on by
  default once checked, the hand-keyed set behind the switch (G298). Every animation gets fixed, the normal ones too
  (G312).
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
in `docs/locomotion/`.

### 5.13 Health and damage

CT model: a health bar, no regeneration, wall medkit stations only (G20, G98).

| Item | Value (starting values) |
| --- | --- |
| Health | 100 |
| Medkit station | Fixed in the map, hold to use, heals 40, single use. Stations are placed in every map. No carried medkits. |
| Checkpoint | Saves current health. Reloading after death or failure restores at least 50%. |
| Revive | Within 30 s of going down, at most twice per mission (G126). Restores 35%. |
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
- **Guards (note 2026-10-23):** realistic, all male, a larger build than Wren, clear variety by archetype (armour,
  helmets) (G310); mid-detail faces on most kinds, balaclavas on heavy / armoured, the same look after a section
  restart (G320). Extra co-op player characters come after all levels are done (G310).
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

From the locomotion run (loco D1-D8, 2026-10-13; `docs/locomotion/DECISIONS.md`, history). D3, D4, D5, D6 are history;
what survives of D5 is G30 (5.3).

#### D1 Controls

- The pad is the primary design target, then keyboard and mouse. Every verb is designed and tuned on the pad first and
  covered in `e2e-pad` and `e2e-mouse`. The layout is CT's default, button for button (G96). Touch is gone (G12).

#### D2 No bobble

Starting limits, frozen in config with unit tests (`src/anim/audit/limits.ts`):

- Pelvis vertical travel, peak to peak per stride: crouched speeds 2.5 cm or less, walk 4 cm, run 6 cm. Exactly one low
  and one high point per step; no double bounce. (The old sprint value is void: there is no sprint.) Note 2026-10-23:
  mocap clips behind the G264 toggle keep their captured bob (walk 5.5-6.6 cm); checkers note it, not fail (G271).
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

Every feature works smoothly in 2-player co-op, to 5.9 C11:

- Every new or changed movement state, verb and clip has a networked `MoveState` mode; committed moves are host-approved;
  health, the drawn / holstered state and the weapon in hand are host-authoritative; local-only items stay local (C11).
- The body layer runs on remotes from `MoveState` plus velocity, computed locally, with no extra bandwidth.
- Partners never interpenetrate; shoulders turn to pass in tight spaces; head look-at includes the partner; two players
  can stack on one wall; every team move gets contact IK with no clipping between the two bodies.
- Tests: every new state adds an `e2e-netmove` case; the anim-audit harness also runs on remote poses; rubber-banding or
  pose error above the `e2e-netmove` limits fails.

---

## 6. Out of scope

**Removed** (code deleted; logs in `docs/consolidation/deleted-*.md`; history in the git log and `docs/archive/`):

- Blacklist systems: snap cover, cover glide, cover-to-cover, blind fire over cover; Mark & Execute; sonar; the Ghost /
  Panther / Assault tracker and cash; the regenerating shield.
- Phones and touch: touch controls, the layout editor, the phone look, phone budgets (G12, G13). The Kestrel editor keeps
  its phone launcher as a dev tool, with no new work (G15).
- Wave Survival, Team Deathmatch, Free-for-all and all player-versus-player code; the old Mission mode does not return as
  team-versus-team (G8, G12).
- The traitor finale and any player-versus-player finale (G9).
- The retired maps: the 1934 Kestrel Exchange, the Trunk Annex, Dead Line v1 and v2 (G12; designs in
  `docs/archive/maps/`, G91).
- Emotes and the old solo Training mode (G24, G116). The Fallow course is the only training (G111).
- The tri-rotor drone, custom difficulty sliders and the alarm-tolerance setting (G7, G106, G115).
- Carried medkits and the medkit count (G98).
- Every gun outside the CT kit (G76, G115).
- The solo campaign, the bot partner, 3-4 player play and the four-operator plan (G2, G48, G50, G71, G111).
- Sprint and the sprint-only moves (fast ladder climb, fast rappel descent, small gap hops, sprint door bash), the quick
  180, the planted pivot, the braking stop (loco M20 Q8, G25, G26, G31, G33).
- Lean-out aiming and the SWAT turn (loco M20 Q1); Kestrel's own wall hug (G37); wall entry by pushing into a wall (G34).
- The elbow strike (replaced by the palm strike, loco M20 Q4); the stealth / kill selector (G23).
- Aim assist (G16); the exploring-camera shoulder swap and camera zoom on aim (G17, G29); the goggle flip (G100).
- Prone and rope climbing (G110); stance and gear icons on the HUD (G107).
- Decided out on 2026-10-18 (code goes when its job runs): the thrown EMP gadget (G152), player-chosen loadouts
  (G153), heavies and dogs in co-op missions (G155), the exploring camera's automatic swing (G159), marked-spot-only
  boosts (G151), remote hacking tools (G142), failing a mission on an alarm count (G125), a partner marker or live
  partner position (G135).
- The non-CT ideas from the movement run (guards relighting lamps, paired searches and the rest, unless CT has them; G11)
  and the movement run's 62-item review list (G39).

**Parked** (code kept behind `?legacy=1`; no new work):

- Hunter: the one non-CT mode; it comes back later (G7).
- The old Mission mode.
- Credits, XP-gated unlocks, shop, suit upgrades, HQ, challenges, weapon mastery; camos, outfits, appearance editing.
- The drone operator guard archetype (not placed in maps); the minimap.
- Parked maps (Embassy, Mansion, Port, Refinery, Dust Depot). The Warehouse remains a test map.

**Paused:** Kestrel (Mission 1, branch `feature/kestrel`); its future is decided after the CT co-op research (G53).

**Never:**

- Reference-game names (G6, G114), story, characters, logos, UI art or art assets (G5).
- External art files, except CC0 textures (5.16); the operators pipeline's sources are decided on `feature/operators`
  (G75): a CC0 base human body, built into each operator offline by in-repo Blender scripts and bundled. Audio may use CC0 recordings for any sound (S7).
  Note 2026-10-23: CMU motion-capture takes for the mocap set are allowed (converted clips bundled, raw files not
  committed, credited in `docs/art-credits.md`; G264, G268, G276).
- Random patrols that defeat planning; forced timers in stealth sections; world waypoints; kill cams; monetisation.
- Voiced story lines now: they are a later idea (G82). Voice chat is not out of scope: it comes after the prototype
  (G156, 5.2 S10).

---

## 7. Level design

`docs/level-design.md` is the level design standard. It applies to every map, with `docs/templates/map-spec.md` (the map
spec template) and the standard's phases and gates.

- **Campaign maps recreate the CT co-op levels** (G3): their design, flow and moves, with original sites and story. The
  research job writes what each level teaches and how the pair moves through it.
- **The Fallow bunker** is the co-op tutorial (G78), rebuilt on the CT moves after the prototype with every jump and reach
  re-checked (G79). Its anti-stuck resets stay (G80). Training D41's linear, unavoidable map rules bind only the bunker
  (G117).
- **Marlow Yard** (the co-op training bunker): ready for a two-player walkthrough, with a light pass wherever spaces
  need light (G200).
- Marlow Yard has one guard who can be interrogated (G206).
- Note 2026-10-23: the final Marlow Yard pass rebuilds freely around co-op scenarios, one co-op run 15-20 min (G272).
- Note 2026-10-23 (marlow-final): no explainer pads, the objective list guides both players (G277); a believable,
  luxurious training facility, dressed straight after each greybox (G278); lit by default, the players cut the light,
  mixed zones where they play better, a view-only instructor gallery, normal guards (G279). A checkpoint restart is a
  full reset (guards, bodies, cameras, doors); the S3 hallway camera is bulletproof (G312).
- Note 2026-10-24: Marlow Yard is a heavily guided, linear training course with one route; split paths and multiple
  objectives only in its later sections, as teaching (G292).
- Note 2026-10-24: every map gets a connectivity-graph JSON and passes the Node level validator before greybox, with
  scaled room sizes from one metrics JSON, 2+ independent routes per section and measured targets (G284, G285); a
  measured validator pass is part of the greybox exit; guards as many as realistically possible, limited by the
  guard-cap perf floor and passable routes (G289). The campaign prototypes get a new small campaign map (G293).
- The Marlow Yard bunker pass takes the full shortlist of the Marlow Yard audit (ceilings, lamp fittings, airlocks,
  dressing, walls to ceilings, paint, lifts, fiction) and keeps the open floor's light level at 0.30, just over the 0.28 shadow line (G225).
- **Order (G224):** the co-op training bunker, then the first campaign level.
- **Level standard changes:** the 12 changes the research proposes (design-kit-digest appendix) go to Michael item
  by item before the first real mission map (G157).
- **One folder per map** under one maps folder; Kestrel and the bunker move there after the merge (G55).
- **Engine facts.** The standard's Section 12 lists the engine facts maps are designed against (5.3 metrics, S5 silent
  speeds, the co-op ledge band). A job that changes one must update `docs/level-design.md` and list, in its report, every
  decision in every map document that relied on the old fact. Room sizes are re-measured after the camera part of the
  prototype (G54).

Each map's documents also include:

- **Light plan per space:** every lamp, its switch or group, the dark pockets, and which route each light change opens.
- **Sound plan per space:** ambient zones and loud / quiet floors.
- **Checkpoint plan:** one encounter checkpoint before each space; replay loss about 10 minutes at most (G126).
- **Co-op plan per space:** the team-move routes and the other moments that need the pair.
- **Medkit and civilian plan:** wall medkit stations in every map (G98); where civilians work and why they are there at
  night.
- **A map spec** written before blockout from `docs/templates/map-spec.md`.

---

## 8. Platform and performance

- **Desktop only** (G12): the installable PWA in a desktop browser, pad first, then keyboard and mouse. Button prompts
  swap at once when a pad connects or disconnects. Automatic tests run as a desktop (G13). A phone can launch it for
  testing only (G182): minimum settings, the UI scaled to fit, a Bluetooth pad; no touch controls, checks or tests, except
  the anim tuner, the one touch exception (G220).
  The phone minimum keeps baked lamp light and one cheap character shadow, caps the frame rate for heat and fills any
  aspect with no letterbox (G215); the menu hero renders at High (G216); phones cap at 75% resolution, no WebGPU yet
  (G218). Note 2026-10-23: menus and HUD fit an iPad (safe-area insets, version label on screen, the Windows GPU banner
  only on Windows) (G311).
- **Performance:** the budgets in `docs/systems/performance.md`, set to the target laptop's numbers (G14). Note
  2026-10-24 (assumed, undoable): the guard off-screen animation tier stays at 4 until a guard whose shadow falls in
  view counts as seen (G294).
- **Gameplay reads only** collision, occupancy, anchors, the light bake and the noise model. It never reads graphics
  presets, LOD or the governor.
- **Offline:** the game installs and loads offline; the campaign needs a two-player co-op session, online,
  split-screen or over LAN (G133).
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
- **Branches:** master is the only base. One branch per job from master, one merge request each (G83); the orchestrator
  merges green ones without asking (Michael, 2026-10-19), Michael when auto mode blocks it; master always holds every
  finished update, and the orchestrator asks Michael when unsure. Previews beside the live game: `/preview/`
  (master) and `/ct/` (the active prototype), G85 in its current form (`docs/systems/deploy.md`).
- **Prototype, then orchestrator:** every multi-step job builds a quick prototype for feel or look first, then runs the
  orchestrator method (G87). Opus builds and checks; a lighter model only for mechanical chores (G88).
  Menu and gameplay prototype slices are built with Sonnet at medium effort; Opus does the fine tuning (G158, G150).
- **Decisions:** Michael's decisions go into `docs/DECISIONS.md` with the next free G number when a job merges, and into
  this bible (G86, G89).
- **Jobs:** `docs/ROADMAP.md` (owned by the orchestrator) lists what runs now, next and what waits on Michael (G90 in
  its current form); each job keeps BRIEF, PLAN and STATE in `docs/<job>/`. Note 2026-10-24: an idle lead starts the
  next roadmap feature in its area (G283); refining is allowed, at most 3 unwalked features per area, a walk card per
  release, and a one-click sign-off before greybox, map art or a big look change (G288); test jobs visual-gate and
  coop-real (G287, assumed, undoable).
- **Models and pace (note 2026-10-23):** Opus plans, briefs, checks and writes tricky engine / AI / animation code;
  Sonnet builds from strict briefs; Haiku does chores (G302); full burn to the cap (G304) with lean messaging and batch
  checkers (G305); two checkers on AI and `src/net`, cloud builders, plans 2-3 slices ahead, high effort for leads
  (G319). Overnight rule loosenings are applied as assumed, logged and undoable (G301).
- **Pipeline (note 2026-10-23):** the laptop queue, fixed swap prompts, automatic suite selection and fully automatic
  rolling trains; no e2e on the desktop except the overflow lane (G318, G321, G322); release-speed (G317).
- **Trains:** note 2026-10-24: a failing member is dropped and the train rebuilds, auto-train ticks every minute, and
  train N+1 may build on train N (G286).
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

The live job list, with branches and status, is `docs/ROADMAP.md` (G90; `docs/progress.md` is its history). The order (G95):

1. **CT co-op research:** every CT co-op level (design, flow, moves), CT's gadget and attachment set, friendly fire and
   heavies, and which of this bible's "research" items CT has. Done 2026-10-18: digests in `docs/ct-research/`,
   decisions G124-G160.
2. **Core feel first (G149, G150):** one job rebuilds and fine-tunes CT movement, camera, back-to-wall, doors, palm
   strike and goggles on Wren (Opus for the tuning) until Michael signs off.
3. **CT prototype slices:** the menu and co-op gameplay slices C1-C7 (`docs/ct-prototype/PLAN.md`), only the basics to
   make each feature work and test it (G4), built with Sonnet at medium effort (G158), with the remaining basics (grab
   menu, CT pad layout, HUD layout) where the plan places them; the SWAT-turn and lean-out network fields removed.
   Michael plays them; their numbers are tuned after.
4. **Then the rest**, each its own job: room sizes re-measured (G54); Wren integration, then the weapon step (G70); the
   goggle swap (G69; parked, G195); the co-op suites made reliable (G51); missing sounds (G66); the bunker rebuild
   (G79); menus, the music revision and the art guide (G113); Kestrel decided after the research (G53); voice chat (G156); the missions.

---

## 11. Open decisions

From `docs/DECISIONS.md` "Deferred", with where each is decided.

**After the CT co-op research** (done 2026-10-18, G124-G160; friendly fire G141 and heavies G155 are settled):
- The research findings Michael has not yet confirmed (`docs/DECISIONS.md`, "Research findings for Michael to
  confirm"): the co-op tutorial wording (G78), the two-person rope (G110), alert tolerance per level (G106, G131),
  medkit heal and reuse (G119), brace and dual takedown (G52), the G11 keep list.
- CT's full gadget and attachment set, including the ring airfoil and the knife's role (G76; held jammer G152, no
  remote hacking G142).
- Every remaining "research" item in this bible (Section 4, 5.9 C12-C18, awareness arcs).
- Whether the soft team-mate outline stays under G135 (5.9 C10).
- The 12 proposed level standard changes, item by item before the first real mission map (G157).
- Kestrel's future (G53).

**The prototype** (decided or tuned after Michael plays it):
- Every movement, camera and timing number (G10); the core-feel systems are tuned in the core-feel job (G150).
- Room, corridor and crawl sizes (G54).
- Missing sounds (G66); Wren integration, then the weapon step (G70).

**The menu job** (after the prototype, G113): where players find Fallow, how the lobby picks the course, what mission
cards show, prompt font, title screen text, a Feedback item on the main menu, and the three menu-plan calls (key mapping,
cinematic shots, removals).

**The music job:** music direction (Michael's pick "Dark orchestral" is not firm), music on briefing, results and pause,
confirming the long menu theme and the Calm / Cautious alternatives.

**The operators branch** (G75): the operator file size limit, its technical assumptions, re-checking Wren's kit on the
real CT poses.

**Kestrel, after the research:** Mission 1 size (G118), the editor, mission and level technical items, and its own open
items (`docs/kestrel/progress.md`).

**The bunker rebuild** (G79): drills rebuilt on CT moves (drills for removed moves cannot stay), the bunker's
exceptions, small design calls and technical assumptions.

**The missions:** site and company names; the open story items in `docs/story.md`.

**Still unanswered** (asked again later):
- How to set the awake limit (G46 stands meanwhile).
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
