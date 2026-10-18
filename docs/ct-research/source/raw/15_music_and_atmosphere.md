# 15 - Music, sound and atmosphere (deep dive)

Added at the user's request: a deep dive into the music and atmosphere of *Chaos Theory*, focused on the co-op mode where sources allow.

**Basis.** This file synthesises `research_notes/music_and_atmosphere.md`, which holds full sources, URLs and an appendix of working notes.

**New primary material:**
- **Bonus-disc videos.** The game's Limited Edition bonus-disc videos (archive.org item `q-1-t-00_202406`), machine-transcribed. These are developer diaries on sound, AI and level design, plus a franchise documentary.
- **Manual pages.** The Xbox manual's co-op communication page.
- **Composer interviews.** Interviews with the composer from 2005 and 2025.

**Tags:** [VERIFIED - 2+ sources], [SINGLE SOURCE], [UNCERTAIN].

**Co-op music, now answered from the game files (see §7).**
- Each co-op map loads the shared common music set plus, on most maps, one solo mission's stem set. There is no dedicated co-op score.
- Co-op ambiences are bespoke.
- Most of what follows describes the score as a whole; §7 maps it to the co-op missions.

---

## 1. Music

### 1.1 Who and what
- **Gameplay score.** The in-game score was written by electronic musician Amon Tobin. [VERIFIED - Wikipedia, Fandom, Ubisoft PR Aug 2004, PC Gamer, Restart.run]
  - He was hired in January 2004 after Ubisoft had already used his records in an internal gameplay video. [VERIFIED]
  - He worked on it for about nine months. He set one condition, that the studio give no creative notes, though it was free not to use the music. [SINGLE SOURCE - Restart.run 2025]
- **Cutscenes.** Jesper Kyd scored the cinematics. [VERIFIED]
- **Multiplayer.** Kyd's multiplayer cues ("Spy Room", "Spy Theme") are attributed only by the wiki, and the titles point to the versus mode. [SINGLE SOURCE; link to versus is inference]
- **Influences:**
  - vintage film scores, especially Lalo Schifrin, mixed with club drum-and-bass;
  - Italian horror scoring (Argento, Goblin);
  - Herrmann and John Barry.
  - [VERIFIED for Schifrin and the horror aim; others SINGLE SOURCE]
- **Method:**
  - Tobin moved from sampling records to recording acoustic instruments, then electronically warping them. Ninja Tune called the result an electronic record built almost entirely from acoustic sources. [VERIFIED]
  - The album credits list named session players and a small orchestra. Some liner-note stories read as tongue-in-cheek. [Credits VERIFIED; literalness UNCERTAIN]
- **Album.**
  - The album (10 tracks, January 2005) was arranged *after* the in-game cues and released two months before the game. [VERIFIED]
  - A 5.1 DVD-Audio edition followed. [VERIFIED]
  - A 2011 remix album accompanied the 3DS remake. [VERIFIED]
- **Track-to-level links.** Track titles map to solo levels (lighthouse, cargo ship, battery, Kokubo Sosho, Displace, Hokkaido). A full rip of the game files lists 12 per-level stem sets plus a shared "Common" set. **None is named for a co-op mission.** [SINGLE SOURCE - Fandom rip list]
- **Diegetic music.** Two songs by a rock band play on in-game radios. [SINGLE SOURCE]

### 1.2 The adaptive score system
- **Stacked layers.** Each piece is written as stacked intensity layers that the engine adds or removes as play changes. [VERIFIED - Remix magazine via Wikipedia, CDM, Tiny Mix Tapes, Kotaku, PC Gamer, Restart.run]
  - Most sources say four layers. One review names three states: calm exploration, approaching danger, alarm. [UNCERTAIN - "four layers mapped to about three states" is the best reading]
  - The layers work like multitrack stems (bass, drums, pad, lead) that are muted and unmuted. [SINGLE SOURCE - CDM analogy]
- **Triggers.**
  - Being spotted or raising an alarm raises intensity at once.
  - Calm returns as the alarm decays.
  - [VERIFIED - CDM, TechEnclave review]
- **Placed triggers, and silence by default.**
  - In the sound developer diary, the sound designer shows that entering a level interior plays *no music* until a placed trigger starts the exploration layer. [SINGLE SOURCE - bonus-disc sound diary]
  - A preview noted that quiet, with echoing voices and footsteps, is the norm, and that the game does not snap to a chase track when spotted. [SINGLE SOURCE - GamesFirst]
- **The composer's rule.** Every layer had to be compelling *on its own*, not only in the full mix. The music should support play rather than steer emotion. [SINGLE SOURCE - PC Gamer; Restart.run]
- **Sound of the states:**
  - Stealth: brooding suspense with a bassy twang and spectral radio-like textures.
  - Detection: snares and drum rolls burst in.
  - [SINGLE SOURCE each]
- **Player complaints** [SINGLE SOURCE each - Steam reviews, GameGrin]:
  - Combat music can linger about a minute after a quick takedown.
  - Dramatic cues leave players unsure whether they were actually seen.
  - Loud alert music drowned out a guard conversation the player needed to hear.
  - Constant "is someone there?" barks layered with pursuit music feel nagging.
- **Implementation.** The engine streams sound together with textures and meshes. It is a modified Unreal Engine 2.5. [SINGLE SOURCE - Computer Graphics World; engine VERIFIED]

### 1.3 Music and co-op specifically [GAP]
- No source maps a cue to the co-op menu or missions.
- Some uploads of "co-op music" and the "multiplayer menu" exist but were not listened to.
- A credits listing seen only in a search excerpt names a dedicated "co-op lead sound designer". If true, co-op audio was its own work package. [UNCERTAIN]

---

## 2. Sound design

### 2.1 Ambient noise as a stealth resource
- **The noise meter.** The game added a noise meter under the light meter. It shows the player's noise against a marker for the area's ambient noise, and anything above the marker can be heard. The co-op HUD has the same meter. [VERIFIED - many sources incl. both manuals]
- **"Sound masking system."** The developers call it this: loud places hide the player's noise. [SINGLE SOURCE - bonus-disc documentary]
- **Masking sources are placed deliberately:**
  - The sound designer places a fountain near a garden path *so that* standing near it masks footsteps. [SINGLE SOURCE - sound diary]
  - Generators, radios, televisions, hammering machines, passing trucks and thunder open sprint windows. [VERIFIED - several reviews and the guide]
  - When generators are switched off, the area turns dangerously quiet. [SINGLE SOURCE - Prima]
- **Movement and action noise** [VERIFIED for surfaces; details SINGLE SOURCE - Prima]:
  - Surfaces matter: grass and carpet are quiet, wood and metal are loud.
  - Slower and crouched movement is quieter.
  - Grabs, interrogations and comms are silent to the AI.
  - A disabled device may crackle, which can work as a lure.
  - A missed shot into a wall is the loudest thing you can do.

### 2.2 Guard barks as information and humour
- **Barks became a system.** Instead of a few canned barks, guards comment on what they notice and talk to each other ("did you hear that?"). They form impromptu search teams and call for cover. They also move through stress stages from puzzled to rattled, shown in both voice and animation. [VERIFIED - bonus-disc documentary + AI diary + Wikipedia]
- **Barks as signposting.** Players say audio tells them what guards are doing before they enter a room, and that overheard chatter builds tension. [VERIFIED - Steam reviews, play diaries]
- **Humour.** Broken-English small talk and knife-point interrogations "like a radio drama" are praised. [VERIFIED as "funny dialogue" - GameRevolution, Slashdot, TechEnclave]
- **Eavesdropping as story delivery in co-op:**
  - In Chemical Bunker the pair overhear technicians.
  - In Train Station they bug a payphone and listen to the villain's call.
  - [SINGLE SOURCE - Prima co-op walkthroughs; see 04]

### 2.3 Radio and briefings in co-op
- **Briefings.** The controller briefs both trainees, for example welcoming them to "the big leagues". In-mission comms appear in a communication box. [SINGLE SOURCE - Fandom; manual]
- **Cross-campaign radio.** The solo hero's interrogation is relayed to the trainees in Seoul. [VERIFIED - see 04_mission_breakdowns/seoul.md]
- **Unlockable advice.** In Nuclear Plant, collecting blueprints unlocks advice from the controller. [SINGLE SOURCE]

### 2.4 Weather and coupled systems
- **Simulated weather.** Rain, fog, snow, lightning and wind are simulated and tied to the sound system. [VERIFIED - Computer Graphics World + bonus-disc documentary]
- **What a storm changes:**
  - Rain grows heavier and surfaces turn wet and reflective.
  - **Guards dislike rain and re-route to dry places.**
  - **Lightning can reveal you while thunder covers your noise.**
  - [VERIFIED - documentary + CGW]
- **Co-op weather** is undocumented. [GAP]

### 2.5 War ambience as a stealth space (co-op Seoul)
- The co-op Seoul mission notes tell players that gunfire is not necessarily aimed at them because a war is on. [SINGLE SOURCE - Fandom]
- This lets a battlefield soundscape run at full volume without players reading it as detection. It is an explicit "ambient threat is not real threat" signpost.

### 2.6 Voice chat inside the simulation (co-op)
- **Guards hear players.** Online with a headset, players' real voices enter the game world, and guards nearby can hear them. [VERIFIED - Xbox manual p.26, Prima, GamesFirst, GameSpot hands-on excerpt]
  - Default sensitivity covers about 2 m of in-game distance for normal speech.
  - It is adjustable and can be switched off.
  - Players can deliberately talk loudly to lure guards.
  - There is **no whistle** in co-op, so the voice is the only vocal lure.
- **Fallback without a headset.** The game plays canned lines automatically:
  - when a partner is in position;
  - when a move completes;
  - when an agent goes down.
  - During rope moves, stick clicks send "left/right/up/down/stop". [VERIFIED - Xbox manual + Prima]
  - Synchronized puzzles are relaxed when there is no voice. [SINGLE SOURCE - Prima]
- **Partner-to-partner attenuation.** Whether partner chat fades with in-game distance is undocumented; only AI hearing is described. [GAP]

### 2.7 Positional audio
- Xbox 5.1 lets players hear enemies approach from all sides. [SINGLE SOURCE - VideoGamer]
- PC room acoustics (EAX) make sound hollow through doors and echo in halls. [SINGLE SOURCE - PC Games DE]
- GameCube uses Dolby Pro Logic II. [SINGLE SOURCE]
- A PS2 reviewer called the game "more sound-oriented than ever". [SINGLE SOURCE]

---

## 3. Visual atmosphere

### 3.1 Lighting
- **Per-pixel lighting.** A new lighting model uses mostly per-pixel lights rather than baked lightmaps. Examples include candlelight through paper doors, lighthouse beams, fire, lightning and flares on wet surfaces. Artists spent weeks removing a "plastic" look. [SINGLE SOURCE - Computer Graphics World]
- **Rendering tech.** Normal mapping is everywhere, and on PC there is HDR, soft shadows and parallax mapping. The graphics engine was rebuilt in about eight months. [VERIFIED - several sources; rebuild time SINGLE SOURCE]
- **Water as visual identity.** Reflections were chosen as the game's signature, the way shadow casting was the first game's. Wet suits glisten and puddles shimmer. [VERIFIED - PC Gamer + CGW + Pocket-lint]
- **The meter overrides the image.** A known readability gap. [SINGLE SOURCE - Prima]

### 3.2 Darkness, readability and "making the dark"
- **Near-dark levels.** Most levels are near-dark. This builds mood but strains eyes, and reviewers advise raising brightness. [VERIFIED]
- **Killing light is the core co-op verb.** Every co-op route in the guide uses light switches, shot bulbs, jammed lights, neon signs or a lit billboard. [SINGLE SOURCE - Prima co-op routes, all missions]
- **Readability on weaker hardware.** The GameCube build *adds* artificial lights where the Xbox relies on moonlight, recolours a grey staircase yellow, and simplifies a vision mode. Readability was preserved by changing the level, not the meter. [SINGLE SOURCE - NWR]
- **The creative director's later view** [SINGLE SOURCE each - FRVR interview; dev diary]:
  - Old baked lighting was clean and readable for stealth. Modern soft lighting makes "is this safe?" hard to read, so stealth lighting should be directed like stage lighting.
  - In a level-design diary he says players must know a guard is there *before* stepping into his path. A badly timed patrol is fixed by changing where it starts.

### 3.3 Vision goggles as atmosphere and information
- **Vision modes.** Night, thermal and electromagnetic modes. [VERIFIED]
  - Electromagnetic vision shows electronics glowing on a blue field.
  - Thermal is used in co-op to find live bomb wires.
  - The goggle overlay slides over the view like a lens.
  - [SINGLE SOURCE for presentation details]
- **The goggle silhouette.** The three-lens goggle silhouette was designed as the hero's recognisable signature. [SINGLE SOURCE - documentary]

### 3.4 Partner identification
- **Lamp colours.** The two co-op agents are told apart by goggle-lamp colour: blue and red. Early screenshots had both blue. [VERIFIED for colours - Fandom + forum + Steam "Spy Blue / Spy Red"; assignment SINGLE SOURCE]
- **Enemies can't see it.** In-fiction, enemies cannot see the glow. [SINGLE SOURCE]
- **Why it matters (analysis).** Colour-coded light points identify the partner in darkness and on split-screen, where silhouettes vanish.

### 3.5 Co-op palettes and moods [GAP]
- **No mood documentation.** No source describes palette, weather or time of day for any co-op map. Only the settings are known (training ground, office building, war-zone streets with neon, bunker labs, rail terminal, nuclear plant, UN tower).
- **Reduced graphics in co-op.** One reviewer notes the co-op and versus modes did not get the full solo graphics upgrade. [SINGLE SOURCE - GameRevolution]

### 3.6 Set dressing
- **A memorable detail.** One reviewer's most memorable image was a child's night-light carousel still turning in a bombed apartment (solo Seoul). [VERIFIED - Globe and Mail + GameGrin]
- **Scene ideas from the whole team.** Scenes were collected from the whole team as stick-figure "situation" sketches and then built into levels. [SINGLE SOURCE - PC Gamer, producer]

---

## 4. Reception

**Awards:**
- **AIAS.** The game was a finalist for *Outstanding Achievement in Sound Design* at the February 2006 Interactive Achievement Awards; God of War won. [VERIFIED]
- **Not nominated** for music at that event, or in the audio categories of the 2006 G.A.N.G. awards, Spike 2005 Best Original Score, or BAFTA 2005/2006. [VERIFIED absent for AIAS music and BAFTA; others SINGLE SOURCE]

**Critics** praised:
- an understated, mysterious score;
- clear, varied ambience;
- surround sound that changes how you play;
- ambient effects (gunfire, AA fire, radio commentary) that were "spot on".

[One source each; see research note §4]

**Players.** Of 3,998 English Steam reviews, 270 mention music, soundtrack or atmosphere. Praise for the score dominates, and some call it the best game soundtrack ever. The complaints are those in §1.2. [SINGLE SOURCE - Steam corpus scan]

---

## 5. Design lessons (transferable, setting-neutral)

| # | Lesson | Evidence |
|---|---|---|
| 1 | **Music reports state, but every layer stands alone.** Add layers on detection and alarm. Tie downward transitions to the real AI state with a short, defined tail, and never leave players guessing whether they were seen | Adaptive layers praised; lingering and ambiguous cues criticised |
| 2 | **Silence is the default; music arrives.** Hold music until a placed trigger or a state change, and keep guards audible | Sound diary; preview |
| 3 | **The ambient noise floor is level design.** Show player noise against ambient noise, and author masking sources (fountains, machines, weather) where you want sneak windows | Noise meter; fountain placement; generators |
| 4 | **Couple systems.** One weather event should have several readable effects: patrol changes, reflectivity, noise cover, lightning exposure | Documentary; CGW |
| 5 | **Barks are UI.** Guards voice what they noticed, escalate audibly and call to each other. Duck music under important dialogue | AI diary; player complaint about alert music masking a conversation |
| 6 | **Put the players' voices in the simulation, with a fallback.** Voice audible to the AI over a short, tunable radius, and switchable. Automatic callouts and pings for players without voice. Relaxed sync timing when voice is absent | Manual; guide; reception |
| 7 | **Tell players when ambient danger is not aimed at them** | Seoul note |
| 8 | **Give each partner a distinct light signature** that reads in darkness and at a distance | Red and blue lamps |
| 9 | **Light must be readable and changeable.** Every space should offer ways to make darkness. On low-spec builds, change the level's lighting rather than lose readability | Co-op routes; GameCube port; creative director's lighting comments |
| 10 | **Telegraph threats before commitment** with audio (footsteps, barks) and staging | Level-design diary |

---

## 6. Gaps

| Ref | Gap |
|---|---|
| R-21 | Which music plays in the co-op menu (mission banks closed, see §7) |
| R-22 | Whether partner voice chat attenuates with in-game distance |
| - | Exact layer count (3 vs 4) and transition timing |
| - | Weather, time of day and palette for co-op maps |
| - | Co-op audio credits: closed. The co-op team had its own lead sound designer; music is credited to the main composer only |

## 7. Gap-closing update - co-op music and ambience from the game files

**Source.** The music-file list in each co-op map's settings file. It is identical across the Xbox build and the PC 1.05 install; the download maps were also checked against the Xbox Live packages. [VERIFIED]

| Co-op map | Music sets loaded |
|---|---|
| Training | Common + the solo training set |
| Panama | Common + the solo Cargo Ship set |
| Seoul | Common only |
| Chemical Bunker | Common + the solo Battery set |
| Train Station | Common + the solo Penthouse set |
| Nuclear Plant | Common + the solo Displace set |
| UN HQ | Common + the solo Kokubo Sosho set |

- **No dedicated co-op score.**
  - The credits name only the main composer.
  - The co-op scripts trigger generic themes held in the common set. [VERIFIED for reuse; theme names SINGLE SOURCE]
- **Music states in the engine:** idle, exploration, stress A and B, fight, death, failure, success. [SINGLE SOURCE - level scripts] This confirms the adaptive, tension-driven layering described in §1 for co-op too.
- **Ambiences are bespoke per co-op map** (Panama, Seoul docks, Chemical Bunker, Train Station). The two download maps borrow ambience sets from solo maps and add a co-op sound bank of their own. [VERIFIED - settings files]
- **Download maps.**
  - The controller has no voice in either download mission; his lines are text only. [VERIFIED - Steam + video comments]
  - On PC, enabling the "native sounds" option on these maps removes ambient and enemy voices, as the patch readme warned. [VERIFIED]
- **Voice as sound.** The microphone fed the in-game sound meter (see 10). [VERIFIED]
- **Design reading.**
  - Reusing solo stem sets kept co-op on-brand at low cost; one map running only the common set shows that mood can be carried by ambience and the adaptive system alone.
  - A silent controller on the downloads was noticed and missed. Losing voiced guidance flattens a mission's feel even when the text is identical.
