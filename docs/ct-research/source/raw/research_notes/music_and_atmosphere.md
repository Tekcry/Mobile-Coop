# Splinter Cell: Chaos Theory - music, sound design and atmosphere (co-op focus)

Status: COMPLETE (first full pass, 17 Oct 2026). Tags: [VERIFIED - 2+ sources], [SINGLE SOURCE], [UNCERTAIN].
Counting rule: the Fandom wiki (EN + RU) counts as one source; pages of the same site count as one source; the Prima guide, the Xbox manual and the PS2 manual are separate Ubisoft/Prima documents and count separately.
All text is paraphrased. Direct quotes are under 15 words, max one per source.

New primary material found in this pass (not used by other notes yet):
- The Limited Edition bonus disc videos on archive.org (item `q-1-t-00_202406`). I machine-transcribed them locally (faster-whisper, base.en). They include Ubisoft's own "Development Diaries", one of them on SOUND with sound designer Fabien Noel, plus a 21-minute franchise documentary. ASR garbles proper names. The wording below is my paraphrase of the transcripts.
- The Xbox manual's co-op "Communication System" page (scan at `raw/ia/xbm/hi-27.png`, manual p.26) and the Prima guide's co-op communication section. Together they settle how voice chat interacts with guards.
- A 2025 Amon Tobin interview (Restart.run) and the PC Gamer making-of (Hocking, Ferland and Tobin quotes).

---

## 1. Music

### 1.1 Composers and roles
- **Amon Tobin wrote the in-game (gameplay) score** [VERIFIED - Wikipedia CT + Amon Tobin articles, Fandom, Ubisoft press release 31 Aug 2004, PC Gamer, Restart.run]. Ubisoft Montreal contracted him in January 2004 [VERIFIED - Wikipedia "Amon Tobin", Fandom]. Ubisoft had already used his music in an internal gameplay video before hiring him [VERIFIED - PC Gamer making-of; Giant Bomb snippet]. Ninja Tune's press text says Ubisoft had also auditioned film composers, Lalo Schifrin among them [SINGLE SOURCE - Ninja Tune release page].
- **Jesper Kyd scored the cinematics (cutscenes)** [VERIFIED - Wikipedia CT (citing GameZone + SoundtrackNet interviews), Pocket-lint review, SquareEnixMusic review, Fandom].
- **Kyd and multiplayer:** Fandom says Kyd also did the "multiplayer" music [SINGLE SOURCE]. Its PC-rip list names Kyd cues "Spy Room", "Defusal", "Spy Theme" and "Common". The spy titles suggest Versus (Spies vs Mercs) menus or modes [UNCERTAIN - inference from titles]. A fan YouTube upload labels "Defusal" as Bathhouse (single-player) music [UNCERTAIN].
- **Which composer the co-op mode used: NOT ESTABLISHED.** No source maps any cue to the co-op menus or the seven co-op missions. See Gaps.
- **Licensed and diegetic music:** rock songs on in-game radios are by the band Kesshin ("One More Regret", "Resonance") [SINGLE SOURCE - Fandom]. A VGOST fan wiki lists Boccherini's "Minuet" as used in the game; the level is unknown [SINGLE SOURCE].
- **Audio staff (credits, unverified):** search snippets of MobyGames list Xbox Lead Sound Designer Fabien Noel and a separate "Coop Lead Sound Designer", Alexandre Carlotti. PC credits list Isabelle Ballet (lead sound designer) and Jeremi Valiquette (sound studio director). PS2 credits list Brian Youds [UNCERTAIN - MobyGames 403, seen only via search summary]. Fabien Noel as CT sound designer is confirmed on camera in the Ubisoft sound dev diary, and Fandom names him SC1's lead audio designer [VERIFIED - bonus-disc diary + Fandom cut-content page]. If confirmed, a dedicated co-op lead sound designer would mean co-op audio was its own work package.

### 1.2 How Tobin built the score
- **Influences:** vintage film scores, especially Lalo Schifrin, combined with the drum'n'bass he played in clubs [VERIFIED - PC Gamer 2025 quote, RA review]. He said he wrote it like a score for a Dario Argento film [VERIFIED - Ninja Tune press text, GameSpot Q&A via search snippet]. Its moods and instrumentation were modelled on the Italian prog band Goblin [SINGLE SOURCE - The Stranger, 24 Feb 2005]. He also cited Herrmann, John Barry and a '70s-horror sound [SINGLE SOURCE - GameSpot Q&A, 26 Jan 2005, via search snippet; page Cloudflare-blocked].
- **Source material:** this score is where Tobin moved from sampling vinyl to recording his own material. Acoustic instruments were played, then electronically warped [VERIFIED - Wikipedia CT, Ninja Tune, Restart.run, RA]. Ninja Tune called it an electronic record made almost entirely from acoustic instruments.
- **Credited players:** Nacho Mendez (bass), Eiji Miyake (flute), Umberto and Massimo Modugno (Mellotron, Hammond), Fabio and Dominico Lenzi (guitar, piano), drummers Fausto Bava and Giuseppe Guerra, percussionist Juan Luis Verdi, "The Canhoto Philharmonic Orchestra" (strings), a junior choir, and a credited "spiritual advisor and tambourine" [VERIFIED as credits - Discogs, Wikipedia, The Stranger, Restart.run]. Caution: some credits and the liner-note story (tracking Mendez down in Mexico, reconciling feuding brothers) read as tongue-in-cheek. No source says they are fictional, but whether a literal live band was recorded is [UNCERTAIN].
- **Process facts from Tobin (2025):** about nine months, full time, seven days a week. His condition was that Ubisoft took no notes, though they were free not to use the music, and he says no conflict arose. Ubisoft pitched him a new technology that made written music adapt to gameplay. He was given after-hours access to Ubisoft Montreal's foley room, which led directly to his 2007 album *Foley Room* [SINGLE SOURCE - Restart.run, 28 Mar 2025].
- **The album came after the game cues.** The album versions were arranged after the in-game material was composed [VERIFIED - CDM 2005, Tiny Mix Tapes, Discogs CD note "from the in game music"].

### 1.3 The adaptive (interactive) music system
- **Intensity tiers:** each piece was written as stacked layers ("levels") of intensity that the engine adds or removes as the situation changes [VERIFIED - Wikipedia citing Remix magazine Apr 2005, CDM, Tiny Mix Tapes, Kotaku, Restart.run, PC Gamer].
  - The *number* of tiers conflicts. Four is given by Wikipedia/Remix, CDM, TMT and Kotaku. Three is given by the SquareEnixMusic review, which names them calm exploration, approaching danger and enemies alarmed. Treat "four layers per piece, mapped to roughly three gameplay states" as [UNCERTAIN] until a primary source settles it.
  - CDM explains the layers like multitrack stems (bass, drums, pad, lead) that are muted and unmuted [SINGLE SOURCE as to that analogy].
- **What drives the changes:**
  - Being spotted or setting off an alarm raises the intensity immediately [VERIFIED - CDM; TechEnclave review: the music speeds up when enemies are alerted and settles when the alarm dies down].
  - Exploration music is triggered by placed "sound actors" in the map. In Ubisoft's sound diary, Fabien Noel shows that there is no music on entering the Bank until an actor starts the "exploration music" [SINGLE SOURCE - bonus-disc dev diary 2].
  - Fan rips label the pieces per level and per state, for example Bank, Penthouse and Displace "full themes" [SINGLE SOURCE - YouTube titles via oEmbed, not listened to].
- **How the states sound:** quiet exploration gets brooding ambient suspense; conflict brings high-intensity percussion and strings [SINGLE SOURCE - Restart.run]. Stealth themes have bassy twang and spectral radio chatter, and getting caught brings disruptive snares and drum rolls [SINGLE SOURCE - PC Gamer]. One reviewer says the music grows with the action and fades out when stealth is needed [SINGLE SOURCE - Hofstra Chronicle].
- **Tobin's design aim:** every individual layer had to be as musically compelling as the full mix [SINGLE SOURCE - Tobin in PC Gamer]. The music should complement play, not steer emotions. He himself often switches game music off for immersion [SINGLE SOURCE - Restart.run].
- **Silence is the default.** A preview says quiet is more common than music, with echoing voices and footsteps, and that unlike MGS the game does not snap to a fast track when you are seen [SINGLE SOURCE - GamesFirst preview, Feb 2005]. The sound diary shows music deliberately held back on entry into an interior [SINGLE SOURCE - dev diary].
- **Known side effects (player reports):**
  - Combat music can linger about a minute after a quick takedown [SINGLE SOURCE - Steam review 18481578].
  - Dramatic cues can leave players unsure whether they were actually detected [SINGLE SOURCE - Steam 24304134].
  - Alert music once drowned out a guard conversation the player was trying to overhear [SINGLE SOURCE - GameGrin diary pt 9].
  - Another player complained of constant "is someone there?" barks plus pursuit music on Penthouse [SINGLE SOURCE - Steam 78166029].
- **Implementation detail:** the engine streams sound together with textures and meshes [SINGLE SOURCE - Computer Graphics World, Mar 2005]. The game ran on modified Unreal Engine 2.5 [VERIFIED - Fandom, dev diary 3 mentions exporting to the Unreal editor].

### 1.4 Track list and track-to-level links
- **Album (Ninja Tune ZEN CD100, released 25 Jan 2005, two months before the game) [VERIFIED - Discogs, Fandom, Wikipedia, Ninja Tune]:**

  | # | Track | Length |
  |---|---|---|
  | 1 | The Lighthouse | 5:05 |
  | 2 | Ruthless | 5:15 |
  | 3 | Theme From Battery | 4:26 |
  | 4 | Kokubo Sosho Stealth | 3:25 |
  | 5 | El Cargo | 4:23 |
  | 6 | Displaced | 6:58 |
  | 7 | Ruthless (Reprise) | 4:26 |
  | 8 | Kokubo Sosho Battle (adapted from Cougar Merkin) | 4:16 |
  | 9 | Hokkaido | 3:00 |
  | 10 | The Clean Up | 7:00 |

  - "Cougar Merkin" is a Tobin B-side [VERIFIED - Fandom, Discogs title, SquareEnixMusic].
- **Likely level links (from track titles and fan rips) [UNCERTAIN unless noted]:**
  - Lighthouse to "The Lighthouse"; Battery to "Theme From Battery"; Kokubo Sosho to the two "Kokubo Sosho" tracks; Cargo Ship to "El Cargo"; Displace to "Displaced"; Hokkaido to "Hokkaido".
  - Penthouse uses the "Ruthless" intro and part of its reprise as calm/progress ambience [SINGLE SOURCE - Fandom].
- **In-game music not on the album:** Fandom's "PC full rip" has 12 per-level stem sets: Training, Lighthouse, Cargo Ship, Bank, Penthouse, Displace, Hokkaido, Battery, Bathhouse, Kokubo Sosho, "Common", Credits. Sputnikmusic commenters note the Bank music is missing from the album. A bootleg with extended in-game themes and Kyd cutscene music circulated in mid-2005 [VERIFIED for "Bank not on album" - Fandom + Sputnik comment; rest SINGLE SOURCE].
- **Kyd cues (from the rip):** Spy Room, Defusal, Spy Theme, Common, Spy Room (extended) [SINGLE SOURCE - Fandom].
- **Co-op:** none of the co-op missions (Training, Panama, Seoul, Chemical Bunker, Train Station, Nuclear Plant, UN HQ) has documented music. All the level-named cue sets are single-player levels. A reasonable but **unproven** hypothesis: co-op maps reuse single-player stem sets and/or "Common" [UNCERTAIN - no evidence either way].
- Ubisoft's sound diary: on the day of filming, Noel received Tobin's last piece, the cargo-ship music, so the music was complete before final map integration and voice recording [SINGLE SOURCE - dev diary 2].

### 1.5 Releases and the remix album
- **5.1 DVD (ZEN DVA100):**
  - It is a full remix from the original multitracks, mixed by Tobin and **Bobby Owsinski** [Discogs credits]. Wikipedia's "Bobby Azinsky" appears to be a misspelling of the same engineer, as both describe the 5.1 mix in LA [UNCERTAIN on identity, high likelihood].
  - It is a hybrid DVD-Audio (hi-res 5.1) plus Dolby Digital 5.1/2.0 disc, with bonus track "Stolen", a Hexstatic video for "El Cargo" and a game trailer [VERIFIED - Discogs, Fandom, SquareEnixMusic].
  - The 2004 press release had already promised a stereo CD and a 5.1 limited edition [VERIFIED - press release, GamesFirst].
  - The game's Limited/Collector's bonus disc also had a soundtrack sampler page (The Lighthouse, Theme From Battery, El Cargo) [SINGLE SOURCE - frame from bonus-disc video R5_t09].
- **Chaos Theory Remixed (The Soundtrack to Splinter Cell 3D)**, Ninja Tune ZEN171/ZENDNL171, released 21 Feb 2011, 12 tracks [VERIFIED - Discogs, Fandom, Wikipedia "Amon Tobin"]:
  - New tracks: "Breaking Protocol" and Tobin's "Splinter Cell Conviction Theme Menu".
  - Remixes: The Qemists (El Cargo, Displaced), Daedelus (Kokubo Sosho Stealth and Battle), King Cannibal (The Lighthouse, Theme From Battery), Lorn (The Clean Up, Hokkaido), Kid Koala (Ruthless) and Eskmo (Ruthless Reprise).
  - The LP sleeve art is by Openmind, made from existing Splinter Cell elements, in 3D for use with glasses.
  - It is linked to the 3DS port *Splinter Cell 3D*.

---

## 2. Sound design

### 2.1 Player noise vs ambient noise (the sound meter)
- **New HUD meter:** CT adds a noise meter under the light (stealth) meter. Bars show Sam's noise and a marker shows the ambient level. Noise above the ambient marker is audible to guards [VERIFIED - Wikipedia, PS2 manual, Prima guide, NWR, Empire, TechEnclave, PC Games].
  - The co-op HUD has the same meter, described as showing the spy's noise and how noisy the environment is [VERIFIED - Xbox manual p.23, PS2 manual].
- **Ubisoft calls it a "sound masking system".** Loud environments hide your sounds, so noisy areas make sneaking up easier [SINGLE SOURCE - bonus-disc documentary; consistent with all of the above].
- **How it shapes level audio design:**
  - Machines, generators, radios and TVs create windows where you can move quickly. Reviewers mention sprinting on hard floors near a radio, TV or hammering machine [VERIFIED - PC Games DE, Substack review, Prima Lighthouse notes on stormy weather and generators].
  - A passing truck or rolling thunder can also mask you [SINGLE SOURCE - NWR].
  - In the sound diary, Noel places a fountain sound in the Bank garden specifically so that staying near it masks your footsteps [SINGLE SOURCE - dev diary 2].
  - Guard radio chatter in the distance masks a kill on the cargo ship [SINGLE SOURCE - TechCentral.ie].
- **Rules of thumb (Prima guide) [SINGLE SOURCE unless noted]:**
  - Guards walk straight to a noise source and in a firefight aim where your noise last exceeded ambient.
  - Analogue speed sets noise; crouching is quieter. Walking with a gun drawn is silent under normal conditions, so use it where ambient is zero.
  - Grass and carpet are quiet; wood and metal are loud [VERIFIED - Prima, PC Games, Giant Bomb/Fandom stealth snippet].
  - Grab/interrogation and OPSAT talk are silent to the AI. OCP use is silent but the disabled device may crackle, which works as a lure.
  - Hitting a person is quieter than shooting a bulb; a miss into a wall is loudest.
  - Changing rifle attachments sounds noisy but is not "heard".

### 2.2 Guard barks and chatter: information and humour
- **Barks expanded:** Ubisoft moved from a handful of canned barks to guards that comment on what they notice, talk to each other ("did you hear that?"), form impromptu teams and call for cover fire. Guards pass through stress stages, from puzzled to rattled, shown in both dialogue and animation [VERIFIED - bonus-disc documentary + dev diary 1 (AI); Wikipedia AI paragraph citing a Ubisoft AI featurette].
- **Barks as signposting:** players say audio tells you about guard behaviour before you enter a room, and that hearing enemies talk to themselves builds tension [VERIFIED - Steam reviews 107702538, 16370622; GameGrin diaries].
- **Humour:**
  - Guards' broken-English small talk is funny, and knife-point interrogations play like a radio drama [SINGLE SOURCE - PC Games DE].
  - Dialogue is well written and funny [VERIFIED - GameRevolution, Slashdot, TechEnclave].
  - Sam and Grimsdottir trade age jokes [SINGLE SOURCE - Globe and Mail].
  - The GameGrin diaries cite guards bragging about motion-sensor lights and mercs praising their boss.
- **Eavesdropping as story delivery, including co-op:**
  - Co-op walkthroughs have agents overhearing a technicians' conversation (Chemical Bunker) and listening in after bugging a phone (Train Station) [SINGLE SOURCE - Prima co-op walkthrough].
  - In Versus, binoculars and spy bullets let you intercept enemy headset talk [VERIFIED - PS2 manual, Prima Versus chapter].

### 2.3 Radio / Lambert briefings in co-op
- Co-op missions open with Lambert addressing both trainees (e.g. Panama: he welcomes them to "the big leagues" despite their training status) [SINGLE SOURCE - Fandom mission pages, which reproduce briefing text]. Lambert is voiced by Don Jordan in CT [VERIFIED - Slashdot, Steam review 55110708].
- In-mission comms appear in a "communication box" at the top of the screen [VERIFIED - Xbox manual p.23, PS2 manual].
- In Nuclear Plant, gathering blueprints lets Lambert give advice [SINGLE SOURCE - Fandom].
- **SP/co-op crossover:** in single-player Seoul, Lambert says the trainees lost their target, linking the two campaigns by radio [SINGLE SOURCE - GameGrin diary pt 7].

### 2.4 Footsteps and surfaces
- Surface type changes footstep loudness, with soft surfaces quieter than wood and metal [VERIFIED - Prima, PC Games DE, Giant Bomb snippet].
- Hokkaido uses squeaking "nightingale" floors [VERIFIED - Dev Game Club ep 475 notes + GameRevolution's "squeaking, ninja-proof floors"].
- Sam freezes in place when you stop; this is purely cosmetic [SINGLE SOURCE - Substack].

### 2.5 Weather (rain, storms)
- **Weather is simulated and tied to sound.** There is a real-time weather system (rain, fog, snow, lightning, wind) linked to the sound system so that weather noise covers movement [VERIFIED - Computer Graphics World + bonus-disc documentary].
- In a storm the rain gets heavier and surfaces more reflective. Guards dislike rain and re-route to dry spots. Lightning can expose you while thunder covers your noise [VERIFIED - documentary + CGW (NPCs seek shelter)].
- Stormy weather masks noise on the Lighthouse level [VERIFIED - Prima + NWR thunder].
- **Co-op weather: not documented** - see Gaps.

### 2.6 War ambience in Seoul (co-op and single-player)
- The co-op Seoul mission notes tell players that gunfire may not be aimed at them because a war is going on [SINGLE SOURCE - Fandom EN + RU, which is one source]. This is an explicit "ambient threat is not real threat" signpost.
- Single-player Seoul's ambience includes background automatic-weapon and anti-aircraft fire [SINGLE SOURCE - Globe and Mail]. It also has a propaganda loudspeaker you can disable, fires and explosions in the building, and an unexploded fizzing bomb [SINGLE SOURCE - GameGrin pt 7].
- In co-op Seoul the agents shoot out neon signs on surrounding buildings before climbing into the hotel. The war setting comes with artificial light sources to manage [SINGLE SOURCE - Prima co-op].
- Cultural reception: a Seoul newspaper reviewer said the invasion level would make Korean players cringe [SINGLE SOURCE - Korea JoongAng Daily, 25 Aug 2005].

### 2.7 Alarms
- Alarms no longer end the mission. Each one escalates: body armour, then helmets, then fortified positions [VERIFIED - Hocking in PC Gamer ("no game over"), Fandom co-op mission pages, JoongAng Daily, Xbox/PS2 manual alarm indicator].
- Exceptions:
  - UN HQ co-op aborts on a general alarm [SINGLE SOURCE - Fandom].
  - The PS2/GC co-op sub-levels reportedly fail on three alarms [UNCERTAIN - from shared brief].
  - Failing or timing out of a hack sounds an alarm [SINGLE SOURCE - PS2 manual].
- Versus: cameras show green when idle and red when the alarm is active, and emit sound [VERIFIED - PS2 manual + Prima Versus].

### 2.8 Gadget sounds
- The sticky camera has a clicker/whistle lure plus gas; the OCP crackle doubles as a distraction [VERIFIED - Wikipedia + Prima].
- Courtyard sprinklers can be turned on to distract guards [VERIFIED - CGW + GameGrin pt 5].
- The night-vision "whine" is remembered by players as iconic [SINGLE SOURCE - Steam 227082455].
- The co-op-only Jammer shows a red light that turns green on a jammable target. This is a visual cue, not an audio one [SINGLE SOURCE - Xbox manual p.25].

### 2.9 Positional audio, 5.1 and platform differences
- **Xbox:** reviewers praise 5.1 - enemies can be heard approaching from all sides, and the creaking ship background adds a lot [SINGLE SOURCE - VideoGamer]. The Xbox Marketplace listing shows Dolby Digital [SINGLE SOURCE].
- **PC:** EAX room acoustics make sounds hollow through closed doors and echo in halls; firefights hit hard in 5.1 [SINGLE SOURCE - PC Games DE]. A Steam user notes the PC menu has EAX and Dolby options [SINGLE SOURCE]. Another user says PC effects do not fade or echo the way they do on Xbox [SINGLE SOURCE - Steam 7812974].
- **GameCube:** Dolby Pro Logic II [SINGLE SOURCE - NWR].
- **PS2:** a reviewer says the two meters plus surround make the game more sound-oriented than ever [SINGLE SOURCE - WorthPlaying].

### 2.10 Voice chat in co-op: proximity, always-on, and the guards
- **Guards can hear real voices [VERIFIED - Xbox manual p.26, Prima co-op chapter, GamesFirst preview, GameSpot hands-on snippet]:**
  - Online co-op with an Xbox Communicator (or a PC headset) feeds your real voice into the game world. Nearby guards can hear you if you speak too loudly.
  - You can also talk loudly on purpose to attract or distract guards.
- **Settings:** the feature can be switched off in the online options, and its sensitivity sets the detection radius. The default value of 50 equals about 2 m in-game for a normal speaking voice [VERIFIED - Xbox manual + Prima].
- **No whistle in co-op:** the whistle button is repurposed for co-op moves, so your headset voice is the only "whistle" [VERIFIED - Prima "agents can't whistle"; GamesFirst says whistling into the headset replaces the button].
- **Ambient cover for voices:** to talk near guards, find louder ambient sound to cover your voice [SINGLE SOURCE - GamesFirst].
- **Always-on:** the headset is described as constant contact with your partner [SINGLE SOURCE - Prima].
- **Is partner chat itself proximity-attenuated? NOT DOCUMENTED.** The sources only describe proximity toward the AI. See Gaps.
- **No headset ("alternative voice communication") [VERIFIED - Xbox manual p.26 + Prima]:** the game plays canned lines automatically when:
  - a partner is in position for a co-op move,
  - the move completes,
  - an agent's health empties (a "teammate needs help" call; Prima only).
  - During Dual Rappel and Hangover you can send directional calls (left/right/up/down/stop) by clicking and pushing the left stick; releasing sends "stop".
  - Prima adds that synchronized-action puzzles are relaxed (no exact simultaneity) online without a headset [SINGLE SOURCE].
- **Text chat:** the Xbox co-op HUD also has a text chat box [SINGLE SOURCE - Xbox manual].
- **PS2/GC:**
  - The PS2 USB headset is documented for chat and lobby generally. PS2 co-op itself is described as offline split-screen [VERIFIED for split-screen - GamesFirst, Co-optimus snippet].
  - GC has no online play [VERIFIED - GameRevolution GC].
  - So voice detection by guards applies to Xbox and PC online co-op only [UNCERTAIN inference for PS2].
- **Modern PC play:** co-op runs over LAN/VPN since the servers closed, with a ~30-35 fps lock for sync [VERIFIED - several Steam reviews].

### 2.11 Audio and visual cues for partner moves
- When your partner is ready for a co-op move or interaction, a Co-op Action key icon appears [VERIFIED - Xbox manual p.23 + PS2 manual]. The automatic voice line above is the audio counterpart [VERIFIED - manual + Prima].
- If there is no room for a move, the agent shakes his head and the controller vibrates [SINGLE SOURCE - Xbox manual].
- Teammate health status is on the HUD. A downed partner gives about 30 seconds to be revived, twice per game [SINGLE SOURCE - Xbox manual p.25].

---

## 3. Visual atmosphere

### 3.1 Lighting model and tech
- **New lighting model** merging the light and material systems [SINGLE SOURCE - CGW Mar 2005]:
  - Lightmaps and vertex lighting are used only for low-level and distant light; most lights are per-pixel omni and spot lights.
  - Examples include candlelight through paper doors, lighthouse beams, fire, lightning, and flares on wet surfaces.
  - Artists spent three weeks tuning attenuation and materials to remove a plastic look.
- **Normal mapping, HDR, parallax** [VERIFIED - Wikipedia, PC Gamer, CGW, bit-tech, TechEnclave]:
  - Everything is normal-mapped [CGW, Jeff Giles].
  - The PC SM3.0 path adds HDR with a 16-bit floating-point buffer, tone mapping, soft shadows, hardware shadow mapping and parallax mapping. With HDR you get bloom on the goggle glow but no anti-aliasing [bit-tech + TechEnclave].
- **Engine work:** ex-Nvidia programmer Dany Lepage unlocked Xbox shaders and normal maps [VERIFIED - PC Gamer (Hocking) + CGW (Lepage as lead programmer)]. Graphics were rebuilt over about eight months [SINGLE SOURCE - documentary].
- **Water as visual identity:** reflections were chosen as the game's signature, the way shadow casting had been SC1's. Wet suits glisten, puddles shimmer, and wet surfaces use a second procedural normal map [VERIFIED - PC Gamer (Ferland) + CGW + Pocket-lint].
- **The stealth meter, not the image, decides visibility** [SINGLE SOURCE - Prima]. The PS2 options include "shadow calibration" [SINGLE SOURCE - PS2 manual].

### 3.2 Darkness, light sources and readability
- Most levels are near-dark, which builds atmosphere but strains the eyes. Reviewers advise raising brightness [VERIFIED - Pocket-lint, VideoGamer, PC Games user comment].
- Slashdot found a pitch-black guarded bank contrived [SINGLE SOURCE].
- **Making darkness is the core co-op verb.** Prima's co-op walkthroughs constantly use light switches, shot bulbs, OCP and a shot-out lit billboard (Panama halls, Seoul neon, Chemical Bunker halls and the Blue Room, Train Station repair area and escalators) [SINGLE SOURCE - Prima co-op walkthroughs].
- **Readability on weaker hardware:** the GC version adds artificial lights where Xbox relies on moonlight and recolours a grey staircase bright yellow. Its EMF view is reduced to white boxes, against the Xbox bluish field with glowing electrics [SINGLE SOURCE - NWR]. WorthPlaying notes the PS2 co-op maps are shrunk [VERIFIED - WorthPlaying + NWR on condensed GC levels].
- **Hocking's later view:** old-style baked lighting was clean and readable for stealth. Modern diffuse lighting and AO make it hard to read what is safe, so stealth lighting should be directed like stage lighting [SINGLE SOURCE - FRVR interview].
- **Hocking's dev-diary principle:** players must know a guard is there before they step into his path. A bad patrol timing is fixed by flipping where the patrol starts [SINGLE SOURCE - dev diary 4].

### 3.3 Goggles as an atmosphere device
- **Vision modes:** night, thermal and the new EMF (electronics shown white on a bluish field). CT also adds EEV, which co-op agents cannot use [VERIFIED - Fandom goggles page, NWR (EMF look), Prima co-op exceptions].
- **Night-vision tuning:** special shaders brighten dark areas so that night vision is useful [SINGLE SOURCE - CGW, Lepage].
- **Overlay framing:** thermal and night-vision overlays slide over the HUD as if through Fisher's eyes [SINGLE SOURCE - GamesFirst].
- **Thermal as a co-op puzzle tool:** live wires on bombs (Train Station) and active wires (Chemical Bunker) are found with thermal, and partners must talk to cut them [SINGLE SOURCE - Prima co-op].
- **The three-dot goggle silhouette** was designed to make the character recognisable [SINGLE SOURCE - documentary, SC1 segment].

### 3.4 Goggle lights as partner identification
- The two co-op agents are told apart by goggle-light colour, one blue and one red [VERIFIED - Fandom Agent One/Agent Two pages + xisto forum snippet + Steam review "Spy Blue and Spy Red"].
- Mapping: Agent One is blue and Agent Two is red. Early dev screenshots had both blue [SINGLE SOURCE - Fandom].
- In fiction, enemies cannot see the glow [SINGLE SOURCE - Fandom trivia].
- The SM3.0 HDR path adds bloom to the goggle glow [SINGLE SOURCE - bit-tech].
- Design reading (my inference, not sourced): colour-coded light points let partners recognise each other in darkness and on split-screen, where silhouettes are lost.

### 3.5 Colour palettes and mood per co-op mission
- **Not documented by any critic or developer source found.** Known setting facts only:
  - Training: Third Echelon facility, Fort Meade.
  - Panama: PCA building, Panama City, office interiors, light switches.
  - Seoul: war-torn streets, hotel, fish market, cyber-cafe, neon.
  - Chemical Bunker: Nampo silo, labs, "Blue Room", cryogenic chamber.
  - Train Station: Grand Central, repair area, subway, lit billboards.
  - Nuclear Plant: Yongbyon.
  - UN HQ: New York.
  - [Fandom + Prima.] Palette or mood claims would be invention - see Gaps.
- Players remark on a surprising amount of colour in CT compared with modern games [SINGLE SOURCE - Steam 16492969]. One negative reviewer felt it lacks SC1's visual style [SINGLE SOURCE - Steam 145383153].
- Co-op and Versus did not get the single-player graphics upgrade [SINGLE SOURCE - GameRevolution]. A player says Versus has "no ambience" compared with single-player [SINGLE SOURCE - Steam 23239859].

### 3.6 Set dressing
- The most memorable visual for the Globe's reviewer was a child's night-light carousel throwing animal shapes in a bombed apartment (single-player Seoul) [SINGLE SOURCE - Globe and Mail]. GameGrin also noted the surreal surviving night-light [same scene].
- Contextual scenes were collected as stick-figure "situation" ideas from the whole team and then built into levels [SINGLE SOURCE - PC Gamer, Ferland].

---

## 4. Reception of music, sound and atmosphere

**Awards (verified via Wikipedia raw pages and award sites):**
- **AIAS 9th Interactive Achievement Awards (Feb 2006):** CT was a finalist for *Outstanding Achievement in Sound Design* (won by God of War). It was also a finalist for Action/Adventure Game and Character Performance - Male. It was NOT a finalist for Original Musical Composition [VERIFIED - Wikipedia 9th IAA page + Wikipedia D.I.C.E. audio design page; CT article].
- **Not nominated:**
  - G.A.N.G. Awards 2006 (for 2005 games): the winners page shows no CT [SINGLE SOURCE - audiogang.org].
  - Spike VGA 2005 Best Original Score: nominees were We Love Katamari (winner), CoD2, God of War, Indigo Prophecy and Perfect Dark Zero. CT appears only in Best Military Game and the fan vote [SINGLE SOURCE - videogamecanon.com list].
  - BAFTA 2005 and 2006 games awards, audio and music categories [VERIFIED absent - Wikipedia 2nd and 3rd BAFTA pages].
- **No evidence found** of an IGN or GameSpot "best sound/music of 2005" win. The IGN Xbox 2005 awards went largely to Jade Empire [UNCERTAIN - search only].
- G-Phoria 2005: CT listed as a "multiple nominee", categories unknown [SINGLE SOURCE - Game Developer news].

**Critics (one short quote max per source):**
- GameRevolution praised clear, varied ambience and a Tobin score that is "understated and mysterious".
- TeamXbox (via Wikipedia): the audio-visual presentation has "a major impact on how you play".
- Slashdot (Zonk): the score has "a modern vibe" and doesn't sound machine-made.
- VideoGamer: hard to see how the visuals and sound could fit the game better; best in 5.1.
- PC Games (DE): sound and music "perfekt"; the atmosphere covers design gaps.
- WorthPlaying (PS2): gameplay "much more sound-oriented than ever before".
- Globe and Mail: the ambient effects (gunfire, AA fire, radio golf commentary) are spot on.
- Tiny Mix Tapes: the album marks "an entirely new era of media" (also cited by Wikipedia).
- SquareEnixMusic: one of the most context-effective game soundtracks.
- Kotaku (2020): the tracks sound almost too busy, which produces the right tension.
- Sputnikmusic users were split: some call it tedious out of context.
- Maxim (via Wikipedia) framed stealth around the enemy picking up "your audio signature".
- Co-op reviewers praised the communication-heavy play: Pocket-lint says it feels like a real team effort, and Steam reviewers say co-op "requires communication".

**Players (Steam, 3,998 English reviews scanned 17 Oct 2026; 270 mention music, soundtrack or atmosphere):**
- Overwhelmingly positive about the Tobin score; some name it the best game soundtrack ever.
- Repeated praise for the light-plus-sound stealth system and for ambient sound giving tactical information.
- Criticisms are listed in section 1.3. They concern music lingering, ambiguous cues and music masking barks.

---

## 5. Design lessons (transferable principles, with evidence)

1. **Make the music a state report, but write every layer to stand alone.** Stack intensity layers and let detection or alarms add them. Tobin's rule was that each layer must be compelling on its own (PC Gamer). Evidence it works: reviews describe the music as a cue that rises on alert and falls back (TechEnclave, Hofstra). Caveat: decay timing matters. Players complain when combat music outlives a fight or blurs whether they were seen (Steam). Tie the downward transitions to real AI state and give them a short, defined tail.
2. **Default to silence and ambience; let music arrive.** Ubisoft held music back until a placed trigger started "exploration music" inside the Bank (dev diary 2). Previews noted that quiet was the norm (GamesFirst). Silence makes the music's entry meaningful and keeps the guards audible.
3. **Expose the ambient noise floor as a resource ("sneak windows").** Show both player noise and ambient level (the meter). Then author noise sources on purpose: fountains near paths (dev diary 2), generators and radios (PC Games, TechCentral), storms and thunder (documentary, CGW, NWR). This turns sound design into level design.
4. **Couple systems so emergent weather changes stealth.** Rain changes patrols, reflectivity and noise cover; lightning reveals while thunder hides (documentary, CGW). One event, several readable consequences.
5. **Barks are UI.** Guards voicing what they noticed, escalating through stress stages and calling to each other (documentary, dev diary 1) tells the player the AI state without a HUD. That was a Dev Game Club takeaway, "communicating enemy AI state clearly without UI". Mix music under barks; one player missed a conversation under loud alert music (GameGrin).
6. **Put the players' real voices into the simulation (co-op).** Headset speech audible to guards inside about 2 m, user-tunable and switchable, with no whistle button (Xbox manual, Prima). This makes whispering a real co-op skill and voice a tool, since you can shout to lure. Provide a fallback: automatic context lines and directional calls for players without mics (manual, Prima). Relax sync timing when players cannot talk (Prima).
7. **Signpost ambient danger that is not aimed at the player.** Seoul's note that gunfire may not be directed at you (Fandom) lets a war soundscape run at full intensity without false alarms.
8. **Give partners a distinct light signature.** Blue versus red goggle lights identify each agent in the dark and on split-screen (Fandom, players' "Spy Blue / Spy Red").
9. **Make light readable and give the player the means to make darkness.** Clean lighting plus a meter as backup (Hocking, FRVR). Every co-op room offers a switch, a bulb or a sign to kill (Prima). On weaker hardware, add or brighten lights and simplify vision modes rather than lose readability (NWR on GC).
10. **Telegraph threats before the player commits.** Hocking re-staged a patrol so players always learn of the guard before stepping in (dev diary 4). Audio barks and footsteps serve the same goal.

---

## 6. Gaps (not found - do not fill in)

- **Co-op music:** which cues play on the co-op menus and in each co-op mission (Xbox/PC seven missions; PS2/GC sub-levels); whether co-op reuses single-player stem sets or "Common"; whether Kyd wrote any co-op music. Nothing found. Fan uploads exist but were not listened to: "-8Oio-dEv8M" co-op music video, "PrKI5lpffwo" multiplayer menu.
- **Number of intensity layers** (3 vs 4) and the exact trigger table (suspicion vs search vs combat vs alarm; transition and decay times). No primary technical source. Remix magazine "Under a Microscope" (Apr 2005), the Pixelsurgeon 2005 interview and the GameSpot Q&A are all blocked or dead.
- **Partner voice attenuation:** whether partner-to-partner chat fades with in-game distance. Only AI hearing is documented.
- **Co-op weather and colour palette/mood per co-op mission:** no source describes rain, time of day or palette for any co-op map.
- **Co-op lead sound designer** (Alexandre Carlotti) and other audio credits: only via a search summary of MobyGames (403).
- **Whether the album's live band and orchestra credits are literal or partly a joke.**
- **IGN/GameSpot 2005 year-end audio awards:** not verified either way.
- **Ubisoft "Behind the Scenes: Sound Design" in-game featurette** (YouTube punciITHal8) and "Developer Diaries - Sound" (g0Jl6uVAcGE): YouTube is blocked here. Its likely twin, bonus-disc diary 2, was transcribed. One bonus-disc clip (S3_t02, 3:47) produced no speech and was not identified.
- **PS2 co-op voice:** whether any online co-op voice existed on PS2 (the manual's USB headset text is generic).

---

## 7. Sources

**Local / primary documents**
- `/home/user/raw/wp_ct.txt` - Wikipedia CT article (raw): composers, sound meter, AI, graphics, soundtrack section, AIAS nominations, critic quotes.
- `/home/user/raw/ia/prima_eguide.txt` - Prima Official Game Guide (Steve Stratton co-op/versus): Sound & Silence chapter, light chapter, co-op training and Communication System, co-op walkthroughs, credits.
- `/home/user/raw/ia/ps2_manual.txt` - PS2 manual: HUD noise meter, co-op HUD, USB headset, audio options, shadow calibration, versus gadgets.
- `/home/user/raw/ia/xbm/hi-24.png`, `hi-26.png`, `hi-27.png` - Xbox manual pp.23-26 (scans): co-op game screen, co-op moves, Communication System (voice detection, default radius), alternative voice comms, jammer.
- `/home/user/raw/wiki/*.txt` (Fandom via API): Tom_Clancys_Splinter_Cell__Chaos_Theory_(OST), ..._Remixed_(OST), Amon_Tobin, Jesper_Kyd, Tom_Clancys_Splinter_Cell__Chaos_Theory, Agent_One, Agent_Two, Multi-Vision_Goggles, Seoul_3, ru_Сеул_3, Panama, Chemical_Bunker, Train_Station, Nuclear_Plant, United_Nations_Headquarters, Splinter_Cell_Cut_Content.
- archive.org item `q-1-t-00_202406` "Splinter Cell Chaos Theory Bonus Disc Videos" (https://archive.org/details/q-1-t-00_202406). Downloaded and transcribed locally (faster-whisper base.en) U1_t03, U2_t04 (sound diary), U3_t05, U4_t06, Q1_t00 (documentary), S2_t01, V3/V4 (trailers); R5_t09 (soundtrack sampler page, identified from a frame), Q4_t39 (spy training pages). Transcripts are in the scratchpad (not in the repo).

**Web (fetched)**
- https://en.wikipedia.org/w/index.php?title=Amon_Tobin&action=raw - contract date, four intensity parts (cites Remix), 5.1 mix, field recordings.
- https://en.wikipedia.org/w/index.php?title=Jesper_Kyd&action=raw - CT credit.
- https://en.wikipedia.org/w/index.php?title=9th_Annual_Interactive_Achievement_Awards&action=raw ; ...D.I.C.E._Award_for_Outstanding_Achievement_in_Audio_Design ; ...2nd_British_Academy_Games_Awards ; ...3rd_British_Academy_Games_Awards - award checks.
- https://www.pcgamer.com/the-making-of-splinter-cell-chaos-theory/ (Robert Zak) - Tobin, Hocking and Ferland quotes; water identity; loop of emotion.
- https://www.restart.run/articles/splinter-cell-chaos-theory-soundtrack-composer-interview (Paul Weedon, 28 Mar 2025) - Tobin interview.
- https://cdm.link/music-that-changes-splinter-cell-permutative-music-and-games/ (Peter Kirn, 27 Jul 2005) - layer system.
- https://tinymixtapes.com/music-review/amon-tobin-splinter-cell-chaos-theory - four levels of stress.
- https://squareenixmusic.com/reviews/george/splintercellsurround.shtml - 5.1 DVD review; three intensity levels.
- https://downloads.ninjatune.net/release/amon-tobin/chaos-theory - press text (Argento, Schifrin audition, acoustic instruments).
- https://ra.co/reviews/2668 - RA album review.
- https://kotaku.com/splinter-cell-chaos-theory-s-soundtrack-was-perfectly-1845811151 - track per level, four layers.
- https://www.thestranger.com/?p=31025 (Dave Segal, 24 Feb 2005, via WebFetch) - Goblin influence, session players.
- https://www.shacknews.com/article/35412/chaos-theory-music-interview - pointer and date for the GameSpot Q&A (26 Jan 2005).
- https://www.gamedeveloper.com/press-release/acclaimed-ninja-tune-recording-artist-amon-tobin-composing-original-music-for-next-title-in-the-legendary-tom-clancy-s-splinter-cell-franchise - Ubisoft press release, 31 Aug 2004.
- https://gamesfirst.com/articles/2005/ubisoft-focus-tom-clancys-splinter-cell-chaos-theory/ (Chris Martin, 8 Feb 2005, WebFetch) - proximity voice vs AI, music approach.
- https://www.cgw.com/Publications/CGW/2005/Volume-28-Issue-3-March-2005-/Thriving-on-Chaos.aspx (Martin McEachern, WebFetch) - lighting, weather, sound tie-in, staff.
- https://bit-tech.net/reviews/gaming/pc/scct_sm20_sm30/2/ (Tim Smalley, 5 Aug 2005, WebFetch) - HDR and goggle bloom.
- https://frvr.com/blog/news/splinter-cell-designer-says-one-of-the-difficulties-with-modern-stealth-games-is-realistic-lighting/ - Hocking on readable lighting.
- Discogs API: https://api.discogs.com/releases/1618601 , /releases/555204 , /releases/3469512 , database search - credits, catalog numbers, 5.1 mixer, Remixed tracklist.
- Reviews: https://www.gamerevolution.com/?p=36141 (Xbox) ; https://www.gamerevolution.com/review/32392-splinter-cell058-chaos-theory-review-2 (GC) ; https://www.videogamer.com/?p=167250 ; https://worthplaying.com/article/2005/4/17/reviews/23920-ps2-review-splinter-cell-chaos-theory/ ; https://www.theglobeandmail.com/technology/splinter-cell-chaos-theory/article1115954 ; https://techenclave.com/threads/splinter-cell-chaos-theory-pc-review.4838/ ; https://www.techcentral.ie/tom-clancys-splinter-cell-chaos-theory/ ; https://efithorsjetsampatch.substack.com/p/tom-clancys-splinter-cell-chaos-theory ; https://thehofstrachronicle.com/?p=5856 ; http://www.nintendoworldreport.com/review/4357/tom-clancys-splinter-cell-chaos-theory-gamecube ; https://www.empireonline.com/gaming/reviews/tom-clancy-splinter-cell-chaos-theory-review ; https://www.pocket-lint.com/review/68164-splinter-cell-chaos-theory-xbox ; https://www.pcgames.de/Tom-Clancys-Splinter-Cell-Chaos-Theory-Spiel-56218/Tests/Splinter-Cell-3-Chaos-Theory-362060/4/ ; https://christiananswers.net/spotlight/games/2006/splinter_cell-chaos_theory.html ; https://games.slashdot.org/story/05/04/18/1439233/review-splinter-cell---chaos-theory (WebFetch) ; https://www.koreajoongangdaily.com/lifestyle/game-mastertom-clancys-splinter-cell-chaos-theory/11127044 (25 Aug 2005) ; https://sputnikmusic.com/album/21099/Amon-Tobin-Chaos-Theory---Splinter-Cell-3-Soundtrack/ (user comments).
- https://www.gamegrin.com/articles/splinter-cell-chaos-theory-diaries-part-two/ ... part-nine (2017 play diaries).
- https://www.devgameclub.com/blog/2026/6/17/dgc-ep-475-splinter-cell-chaos-theory-part-four - show notes.
- https://www.audiogang.org/awards/2006-awards/ - GANG 2006 winners.
- https://videogamecanon.com/adventurelog/2005-spike-video-game-awards - Spike 2005 nominees.
- https://www.gamedeveloper.com/pc/g-phoria-2005-award-nominees-announced - G-Phoria 2005.
- Steam reviews API: https://store.steampowered.com/appreviews/13570?json=1&filter=recent&language=english (3,998 reviews scanned; IDs cited inline).
- https://www.youtube.com/oembed?url=... - titles and channels for YouTube leads listed in Gaps (not watched).
- https://archive.org/advancedsearch.php and https://archive.org/metadata/q-1-t-00_202406 - item discovery.

**Search-snippet only (page blocked; claims tagged accordingly)**
- https://www.gamespot.com/articles/qanda-chaos-theory-composer-amon-tobin/1100-6117182/ - 403/Cloudflare (Tobin Q&A, Jan 2005).
- https://www.gamespot.com/articles/tom-clancys-splinter-cell-chaos-theory-co-op-hands-on-panama/1100-6119226/ - 403 (guards hear loud headset talk).
- https://www.mobygames.com/game/20691/tom-clancys-splinter-cell-chaos-theory/credits/xbox/ - 403 (audio credits).
- https://xisto.com/discuss/topic/9603-... - bot wall (red/blue lights).
- https://www.gamespot.com/reviews/tom-clancys-splinter-cell-chaos-theory-review/1900-6121743/ - not fetched; snippet says the music is percussive and recalls the Mission: Impossible score [UNCERTAIN].

**Failed / blocked (for future agents)**
- vgmonline.net (403), vgmdb.net (403 and connection reset), giantbomb.com (403), co-optimus.com (403), cheatcc.com (403), pcgamingwiki.com (403 via both curl and WebFetch), tweaktown (403), neowin (403), chaostheory.miraheze.org (bot check; its archive.org dump is the same tiny file as raw/ia/ctwiki.xml.gz), old.reddit.com (WebFetch refused), reddit JSON search (empty or blocked), redlib mirror (502), arquivo.pt Pixelsurgeon and Remix archive (403), remixmag.com (404), archive.ph (429), last.fm wiki (JS error), YouTube watch pages (Google "sorry" redirect; only oEmbed works), thumbsticks.com article (404), imdb full credits (202 empty).

---

## Appendix: raw working notes (kept for traceability)

- Wikipedia (CT article, cached raw/wp_ct.txt): composers listed as Amon Tobin and Jesper Kyd; Kyd hired to score cinematics. In-game music layered from sequences, so in-game cues differ from album versions. Album released 25 Jan 2005 by Ninja Tune, before the game. Live players incl. Nacho Mendez and flautist Eiji Miyake. Sound meter compares Sam's noise to ambient noise; graphics added normal mapping, HDR, parallax mapping. AIAS (9th Interactive Achievement Awards) nominated CT for Outstanding Achievement in Sound Design.
- Prima official guide (raw/ia/prima_eguide.txt) "Sound & Silence": noise meter under stealth meter; transparent slider = ambient level; bars past slider brighten when Sam is audible; enemies fire at last spot where noise exceeded ambient; whistle/throw objects/sticky-cam clicker as lures; surfaces (grass/carpet quiet, wood/metal loud); gun-drawn walking silent; grab/interrogation and OPSAT talk count as silent; OCP use silent but disabled devices may crackle; Stealth meter governs light, not what the screen looks like.
- PS2 manual (raw/ia/ps2_manual.txt): co-op HUD has its own noise meter ("how noisy the environment around the spy is"), a communication box for incoming comms; USB headset for teammate chat and to "spy on enemies" via gadgets; options have separate music/effects volume and headset settings.
- Wikipedia "Amon Tobin" (raw): Ubisoft Montreal contracted Tobin Jan 2004; each track split into four similar parts by intensity so developers could pick by player action (cites Remix magazine, Ken Micallef, 1 Apr 2005 "Under a Microscope"); more original/field samples than earlier albums; later Dolby Digital 5.1 mix with engineer Bobby Azinsky in an SSL room in LA (cites Pixelsurgeon 2005); Tobin later contributed menu theme etc. to Conviction (2010) and remix album announced 2011.
- Wikipedia "Jesper Kyd": 2005 CT credit "with Amon Tobin". Fandom CT page: Tobin mostly in-game, Kyd cinematics AND multiplayer; in-game radio rock by band Kesshin ("One More Regret", "Resonance").
- Fandom OST page: 10 tracks CD/2xLP, 11 on DVD (5.1 + bonus "Stolen" + Hexstatic "El Cargo" video), release 25 Jan 2005 (Ninja Tune). Album is "not a soundtrack" - in game each track split into components layered by player actions, so album versions only heard as fragments; example given: Penthouse uses "Ruthless" intro + reprise segment as calm ambience. PC rip lists per-level stems collections: Training, Lighthouse, Cargo Ship, Bank, Penthouse, Displace, Hokkaido, Battery, Bathhouse, Kokubo Sosho, Common, Credits. Kyd tracks in rip: Spy Room, Defusal, Spy Theme, Common, Spy Room (extended) - names point to versus (Spies vs Mercs) menus/modes. "Kokubo Sosho Battle" adapted from Tobin B-side "Cougar Merkin". Mid-2005 bootleg circulated with extended in-game themes + Kyd cutscene music.
- Fandom Remixed page: "Chaos Theory Remixed (The Soundtrack to Splinter Cell 3D)", released 21 Feb 2011, 12 tracks (remixers: The Qemists, Daedelus, King Cannibal, Lorn, Kid Koala, Eskmo; plus "Breaking Protocol" and Conviction menu theme).
- PC Gamer "The making of Splinter Cell: Chaos Theory" (Robert Zak; Hocking, Ferland, Tobin interviewed): Tobin hired after Ubisoft cut an internal gameplay video to his music; Tobin's aim - vintage film scores (Lalo Schifrin) + club d'n'b; adaptive intensity had not been technically achievable to that degree before, forced Ubisoft tech innovation; challenge: each layer must be musically compelling alone. Writer: snares/drum rolls when caught; bassy twang + spectral radio chatter in stealth themes. Ferland's "loop of emotion" (tension builds, possible burst of action, relief, repeat) - sound and music sustain it. Hocking: no game over on alarms; game adapts. Visual: ex-Nvidia programmer Danny Lepage unlocked Xbox shaders/normal maps; water/reflections chosen as identity like shadow casting was for SC1; wet suit sheen in rain not a visibility factor.
- CDM "Music that Changes" (Peter Kirn, 27 Jul 2005): four intensity levels per song as stacked parts (like bass/drum/pad/lead); engine adds/removes layers; alarm or being spotted immediately raises intensity. Links GameSpot Q&A (26 Jan 2005, news_6117182) - GameSpot now Cloudflare-blocked.
- Web search summary snippets (vgmonline/thumbsticks/gamesfirst, unverified wording): one source says three intensity levels (calm exploration / tension when danger approaches / action when alarmed) - conflicts with "four". Fan review: chase at alarm stage 3 makes music escalate sharply.
- Ubisoft press release 31 Aug 2004 (via Game Developer/Games Press): Tobin announced as composer; Ubisoft EMEA marketing director Florence Alibert: graphics, sound and gameplay designed to complement each other, "dynamic music and sounds"; Tobin: Ubisoft wanted music fully intertwined with the game, team "labored meticulously over every aspect of the sound design", no concessions; companion CD of extended/remastered themes + 5.1 collector edition planned spring 2005; Tobin then living in Montreal.
- GamesFirst! "Ubisoft Focus" preview (Chris Martin, 8 Feb 2005): Tobin made a stereo and a 5.1 mix; music follows tension rather than snapping to a fast track when spotted (contrasted with MGS); quiet is common, with echoing voices/footsteps; co-op: proximity voice over Xbox Live/PC also audible to AI guards - mask speech with louder ambient sound; whistling into the headset replaces whistle button (UNCERTAIN - single preview, retail has whistle button per PS2 manual "Whistle/Co-op action"); thermal/night vision overlays; wet stone reflections; Sam's shadow stretches on walls.
- Search-snippet sources on voice/guards (pages 403): GameSpot co-op hands-on Panama (1100-6119226) - talking too loudly via Xbox Live headset lets nearby enemies hear you and investigate; CheatCC review - headset comms add realism; Slashdot (Zonk, 18 Apr 2005) fetched: praises Tobin score ("modern vibe"), lighting gorgeous but darkness in a guarded bank feels contrived; co-op 4 levels, wanted more - did NOT mention voice/guards in body (search summary claim was wrong).
- SquareEnixMusic review of 5.1 DVD (George): live session musicians sampled (mellotron, flutes, mostly acoustic); describes THREE intensity levels (calm exploration / approaching danger / alarmed action); "The Clean Up" Asian elements; bonus track "Stolen" Middle Eastern percussion + vocals; Tobin's score complements Kyd's cinematics.
- Awards: AIAS 9th Interactive Achievement Awards (Feb 2006) - CT finalist for Outstanding Achievement in Sound Design (winner God of War); NOT a finalist for Original Musical Composition (GoW, Gun, Jade Empire, Kameo, Rise of the Kasai). GANG 2006 (4th awards, for 2005 games) winners list contains no CT. Spike VGA 2005 Best Original Score nominees (We Love Katamari won; CoD2, GoW, Indigo Prophecy, PDZ) - no CT; CT only in Best Military Game + fan-voted list. BAFTA 2nd (2005) and 3rd (2006) audio/music categories - no CT. G-Phoria 2005: CT a "multiple nominee", categories not given in source.
- Reviews fetched (curl): GameRevolution Xbox (gamerevolution.com/?p=36141): ambient effects varied and clear, superb voice acting, Tobin score "hip and catchy but also understated and mysterious"; co-op/versus not graphically upgraded like SP; lighting most sophisticated seen. GameRevolution GC review: same sound paragraph; GC lighting less sophisticated than PC/Xbox.
- VideoGamer (videogamer.com/?p=167250): advises raising brightness - Sam spends more time than ever in total darkness; sound "brilliant" esp. 5.1 - enemies audible from all directions; creaking cargo ship background noise; co-op best over Live/system link, split-screen tiresome since SC is about seeing round corners.
- WorthPlaying PS2 (17 Apr 2005): reworked sound effects; gameplay "much more sound-oriented"; two readouts (Sam's noise + ambient) useful and reward surround setups; PS2 maps shrunk, would trade lighting for geometry.
- Globe and Mail (29 Mar 2005): ambient effects - background automatic weapons and anti-aircraft fire (Seoul), golf commentator on a radio; Sam/Grimsdottir banter about age; most forceful visual = child's night-light carousel throwing animal shapes in a bombed apartment (Seoul SP); obscured glass refraction.
- TechEnclave PC review: environmental audio (rain splatter, generator hum, radio messages) both atmosphere and gameplay via sound meter; Tobin score acts as a cue - speeds up when enemies alerted, returns to normal when alarm dies down; HDR via Shader Model 3 on PC, no AA with HDR; candles flicker. (Misnames Lambert's actor as Dennis Haysbert - reliability caveat.)
- TechCentral.ie PC: guard radio chatter in distance masks a kill on the ship.
- Substack retrospective (efithorsjetsampatch): sound meter removes guesswork; ambient radio lets you move faster; guards now fire toward whistle rather than walk to it (conflicts with Prima tip that whistling lures guards - context dependent); cites Nintendo Power #190 (Apr 2005) Hocking interview: "chaos theory" = small consequential actions (break lock = fast but loud).
- Hofstra Chronicle: music intensifies with action and dims when stealth needed.
- Nintendo World Report GC review: noise meter mark = ambient; passing truck or rolling thunder masks moves; GC version uses Dolby Pro Logic II (not Digital); GC EMF vision reduced to white boxes vs Xbox bluish field with pulsating white electrical objects; GC has more artificial lights where Xbox is moonlit, a grey staircase turned bright yellow, missing bats - i.e. readability lighting added on weaker hardware; GC co-op split into sub-sections with loads.
- Empire (David McComb): light meter + sound indicator + ambient cover.
- Xbox manual (scanned, raw/ia/xbm/hi-24..27.png, pp.23-26): CO-OP AUDIO RULES. Co-op HUD: noise meter shows spy noise AND environment noise; communication box at top of screen; teammate status; Co-op Action key icon when partner ready; alarm indicator ("each alarm... global repercussions"); text chat box. Communication System: Xbox Communicator recommended; headset can attract/distract guards; speaking too loudly reveals position - guards can hear; feature can be switched off in Options under Xbox Live; voice detection sensitivity adjustable = radius in which a normal voice is detected; default 50 = about 2 m in-game for normal speaking voice. "Alternative Voice Communication": players without headset get an automatic communication system in specific situations. Co-op Action: initiating a co-op move/interaction auto-sends a voice message telling partner you're waiting; another sent when move completes; Hang Over/Dual Rappel: holding left stick in a direction sends a directional voice message, releasing sends "stop". If not enough room for a move, agent shakes head + controller vibrates. Share View (camera feeds; not in split-screen). Heal Teammate: twice per game, ~30 s to reach downed partner. Jammer (co-op-only gadget): red light, turns green on a jammable target.
- PS2 manual: options include "shadow calibration" (brightness calibration); versus: surveillance cameras emit sound and light (green idle, red alarm); binoculars/spy bullets let you hear enemy communications; alarm snare emits fake spy noises; credits line "Soundtrack composed by Amon Tobin".
- MobyGames credits (via search snippet; site 403): Xbox - Lead Sound Designer Fabien Noel; "Coop Lead Sound Designer" Alexandre Carlotti; Windows - Lead Sound Designer Isabelle Ballet, Sound Studio Director Jeremi Valiquette; PS2 - Sound Designer Brian Youds, Amaury La Burthe sound collaboration; IMDb snippet: Keith Arem sound recordist/voice director (UNCERTAIN - all unverified, search-summary only).
- VGOST fandom: game includes Boccherini "Minuet" (licensed classical) - level unknown.
- YouTube (unwatched; watch pages blocked by Google "sorry"; titles via oEmbed): "Splinter Cell: Chaos Theory Behind The Scenes: Sound Design" (punciITHal8, in-game extras featurette), "Developer Diaries - Sound" (g0Jl6uVAcGE), "Multiplayer menu" (PrKI5lpffwo), "coop gameplay music video" (-8Oio-dEv8M, fan), Jesper Kyd "Spy Room" (jp6EFfv7eWM), "Spy Theme" (dZJVpwrJ1vY), "Common Soundtrack - Amon Tobin, Jesper Kyd" (vL-p3wBW_t4), "Korean Radio Quotes" (hWc8_DmVHkA), "In-Game Media Sound Compilation" (J_8IfpHoW8M), full-theme rips by Alex37 (Bank, Displace, Penthouse, Battery, Lighthouse), "Training Soundtrack" (inb4WU0JKEM), Hokkaido all themes (tf6Is6pj1zk), "Battery 14 min complete version game rip" (lsxhy_9iijg), PC full rip 2:36:42 (sGQ_DITqH8A).
- PC Games (pcgames.de, German test, p.4): noise bar limit shifts with background noise - radio, TV or hammering machine lets you sprint on hard floors; quiet = crouch on carpets; mouse wheel speed; EAX room acoustics - effects sound hollow through closed doors, echo in halls; strong 5.1 punch in firefights; guards' broken-English conversations funny; knife interrogations "could be sold as a radio play"; Tobin's music: simple melodies over intricate rhythms, near-hypnotic; atmosphere covers small design gaps. User comment: SC always darker than realistic; PC co-op implementation poor (complaint).
- Pocket-lint Xbox (19 May 2005): Kyd (called "Bafta-award winner") does cutscene music; levels almost dark - great atmosphere but eye strain on a CRT; lights bob in wind, moonlight shimmers in puddles, rain impressive.
- CDM full text confirms: album arranged AFTER in-game composition; Tobin calls the four tiers "levels"; engine adds/subtracts layers as stress/action rises; alarm or being spotted raises intensity immediately.
- Tiny Mix Tapes review: pieces organised internally into four stress levels, picked apart for game then reassembled for album; compares to Herrmann/Hitchcock.
- Sputnikmusic user comment: lots of in-game music not on album, notably "Bank".
- Restart.run (Paul Weedon, 28 Mar 2025, NEW Tobin interview for CT's 20th): Tobin was wary of game work (seen as selling out; disliked grandiose imitation-Hollywood game scores); Ubisoft told him to make it sound how he wanted and pitched a new tech that made written music adaptive to gameplay; Tobin: not the first adaptive music, but the most intricate implementation to date; vinyl samples dropped for electronically modified acoustic instruments; live band incl. Nacho Mendez, flautist Eiji Miyake, strings credited to "Canhoto Philharmonic Orchestra"; Tobin's terms: no notes, Ubisoft free not to use it - no conflicts arose; audio team layered compositions by intensity: quiet exploration = brooding ambient suspense; conflict = high-intensity percussion + strings; Tobin sees music as complement, not emotional signpost - he often switches off game music for immersion; ~9 months full-time, 7 days/week; Ubisoft Montreal foley room - after-hours access, he experimented there and returned to record for Foley Room (2007); saw synthesized physics-based sound (a dragged box whose sound adapted to movement) in the audio team's tech.
- Ninja Tune release page (press text): Ubisoft auditioned composers incl. Lalo Schifrin before picking Tobin; Tobin: wrote it "as if it was a score for a Dario Argento movie"; record "made almost entirely from acoustic instruments", warped; aimed for unifying atmosphere/recurring evolving themes; "occasionally slightly camp homage" to great soundtrack composers.
- GameSpot Q&A (26 Jan 2005; page Cloudflare-blocked; via search snippets + Shacknews pointer dated 26 Jan 2005): phone interview in a Montreal taxicab; '70s horror sound; Bernard Herrmann, John Barry, Lalo Schifrin; Argento comparison.
- RA (Resident Advisor) album review: Schifrin influence (frenetic jazz), Brazil; play with bass full.
- Kotaku "Morning Music" (2020): a track per level, four layers each, so Ubisoft could shift feel dynamically; "El Cargo", "Displaced" favourites.
- Prima official guide co-op chapter (Steve Stratton; raw/ia/prima_eguide.txt ~l.2842-3400): in co-op agents CANNOT whistle - whistle button repurposed for co-op moves (so the headset voice is the only "whistle"); OCP must be held and drains. Communication System: headset = constant contact; voice detection lets nearby guards hear you; talk loudly to distract guards deliberately; can be turned off / sensitivity adjusted in online options; default 50 = ~2 m detection radius at normal speech. Alternative voice comms (no headset): auto voice line when a partner is in position for a co-op move, when move completes, and when an agent's health empties ("needs help"); Dual Rappel / Hangover directional calls LEFT/RIGHT/UP/DOWN/STOP via clicked left stick. Tip: synchronized-action puzzles are relaxed (no exact simultaneity required) when playing online without headset. Perfect score: no kills/injuries, never identified, no alarms, all objectives. Credits list Lead Co-Op Tester Alexandre Martel etc.
- Prima co-op walkthroughs: darkness is created constantly (light switches, shooting bulbs, OCP) - Panama halls, Seoul: shoot out neon lights on surrounding buildings before climbing into the hotel; Fish Market store lights switched off; Chemical Bunker: shoot lights in halls, "Blue Room", cryogenic chamber; Train Station: shoot lights + lit billboard at escalators, plunge Train Repair area into darkness; thermal vision used to find live wires on bombs (Train Station) and active wires (Chem Bunker); agents listen to technician conversation (Chem Bunker) and bugged-phone conversation (Train Station) - eavesdropping as story delivery.
- Korea JoongAng Daily (25 Aug 2005) review: Seoul invasion level "likely to induce cringes" in Korea; story grafted onto real geopolitics; doubted Korean release as-is; praises escalation system (each alarm adds armor/enemies).
- Dev Game Club podcast (Eps 472-475, May-Jun 2026) show notes: topics include nightingale floors in Hokkaido, "communicating enemy AI state clearly without UI", whistle, Seoul vs Battery contrast - audio not explicitly covered in notes (episodes not listened to).
- Computer Graphics World "Thriving on Chaos" (Martin McEachern, Vol.28 Iss.3, Mar 2005; via WebFetch): new lighting model merging light + material systems; lightmaps/vertex lighting only for low-level and distant; most lighting per-pixel omni + spot lights; candlelight through paper doors, lighthouse floodlights, fire, lightning, flares on wet/dry surfaces; artists spent 3 weeks tuning attenuation/materials to kill plastic look; all objects normal-mapped (Jeff Giles, asst technical director); normal-mapped particles; wet shader = material normal map + procedural water/raindrop normal map; real-time weather (rain, fog, snow, lightning, wind); storms thicken rain/wind, idle NPCs seek shelter from rain; special shaders brighten dark areas so night vision is useful (Dany Lepage, lead programmer); sprinklers distract guards; weather tied to sound system - weather noise covers Fisher's movement; engine streams sound with textures/meshes; co-op animation (three connected characters) hardest per lead animator Jacques Dussault; lead artist Pascal Beaulieu.
- bit-tech SM2.0 vs SM3.0 (Tim Smalley, 5 Aug 2005): PC options include HDR rendering, tone mapping, high-quality soft shadows, hardware shadow mapping, parallax mapping; SM3.0 path shows wider dynamic range, bigger glow around Sam and more bloom on the goggle ("headset") glow. Search snippet: HDR used four-channel 16-bit floating point buffer.
- FRVR (Lewis White, c.2025, Hocking podcast interview): modern diffuse/AO lighting harder to read than old baked lighting - old clean lighting readable (safe vs dangerous); light gauge as backup; stealth lighting should be "directed" like theatre lighting rather than realistic.
- Blue/red goggle lights: Fandom Agent One/Two (Agent One blue, Agent Two red; early dev screenshots both blue); xisto forum snippet (via search) - split screen vertical, one red light one blue. => VERIFIED (2 sources) that the two agents are distinguished by red vs blue lights; mapping blue=One/red=Two single source.
- Fandom goggles page: EMF vision introduced in CT (electronics shown white); in fiction enemies can't see the goggle glow (trivia, single source).
- Steam user reviews (app 13570, 3,998 English reviews scanned via appreviews API on 17 Oct 2026; 270 mention music/soundtrack/atmosphere/ambience; "Very Positive" 3,700/297): dominant praise for Tobin score ("greatest video game soundtrack" type comments; one user opens the game just for menu music). Specific observations: music low-key and dynamic, changing with gameplay (rid 16492969, 200 helpful); animations and music shift together as you creep up for a grab (7429908); "perfect mix of background noise and high-tension BGM" when cover blown and alarms go (12881970); hearing enemies talk to themselves + soundtrack (16370622); sound keys you in on guard behaviour before entering a room (107702538); "iconic night vision whine" (227082455). Criticisms: action music lingers ~a minute after a quick takedown (18481578); dramatic music cues make it hard to tell if you were actually detected (24304134); constant "is someone there?" barks + pursuit music on Penthouse (78166029); some music "stock" heard on Top Gear (16687618 - i.e. Tobin tracks used by the TV show; UNCERTAIN); PC sound effects don't fade/echo like Xbox version (7812974). Co-op specific: co-op framerate locked ~30/35 fps for sync; servers (GameSpy/ubi.com) shut - LAN/VPN only; widescreen fix breaks co-op; players nickname agents "Spy Blue and Spy Red" (21672477); Versus "no ambience" compared with SP (23239859).
- Discogs API (releases 1618601 CD ZEN CD100, 25 Jan 2005; 555204 DVD ZEN DVA100; 3469512 Remixed LP ZEN171, 21 Feb 2011): CD notes "From the in game music to ... Chaos Theory, courtesy of Ubisoft"; insert includes track creation notes + BPMs. Credits: Written/produced/arranged + electronics Amon Tobin; bass Nacho Mendez; flute Eiji Myake; mellotron Umberto Modugno; Hammond Massimo Modugno; guitar Fabio Lenzi; piano Dominico Lenzi; drums Faustio Bava, Giuseppe Guerra; percussion Juan Luis Verdi; strings "The Canhoto Philharmonic Orchestra" conducted by Alfonso 'El Jeffe Fragante' Testi; backing vocals Kawaguchiko National Junior Choir; "Spiritual Advisor & Tambourine" Salvatore Pennacchio; mastered Eddy Schreyer. DVD: 5.1 + stereo mixes by Amon Tobin and Bobby OWSINSKI (Wikipedia's "Bobby Azinsky" appears to be a misspelling); 5.1 is "a full remix taken from the original multi track masters"; hybrid DVD-Audio (hi-res 5.1) + Dolby Digital 5.1 + 2.0 downmix; extras: "Stolen", Hexstatic "El Cargo" video, game trailer. Liner-note blurb by Tobin tells a comic story of tracking Mendez down in Mexico and reuniting the feuding Modugno brothers. NOTE: several credits read whimsically (conductor nickname, "spiritual advisor"); no source found saying they are fictional, but Tobin's working method (manipulated samples) + Ninja Tune's "made almost entirely from acoustic instruments" leave it open whether the "live band" was literal - treat band membership as [UNCERTAIN] beyond "credited".
- Remixed LP: design/3D FX by Openmind from existing Splinter Cell elements, inner sleeve meant for 3D glasses (ties to 3DS port); download/WAV ZENDNL171.
- The Stranger (Dave Segal, 24 Feb 2005): Ubisoft let Tobin treat it as a film score; session players' parts (Mellotron, flute, Hammond, strings, percussion) run through electronics; drummers Bava and Guerra; moods/instrumentation modelled on Italian prog band Goblin (Argento's composers); nearly a dozen elements per track. [Goblin link fits Argento quote in Ninja Tune press.]
- Xbox Marketplace (backward-compat listing) lists Dolby Digital; PC menu offers EAX (Steam user discussion; PC Games review describes EAX room acoustics); GC = Dolby Pro Logic II (NWR).
- PRIMARY: Ubisoft "Development Diaries" on the Limited Edition bonus disc (archive.org item q-1-t-00_202406, uploaded 2024; I machine-transcribed the audio with faster-whisper base.en - names garbled by ASR, wording paraphrased). Diary 1 (U1_t03, 3:33): producer Mathieu Ferland introduces team of 120+; diaries on AI, sound, animation, co-op; lead AI programmer (Frederic ...) - NPCs have distinct stress stages expressed through what they say (barks) and animation. Diary 2 (U2_t04, 4:18) SOUND, sound designer Fabien Noel: placing sound in the Bank map is hard because level artists/designers change geometry daily; he plugs ambiences per environment and builds outside->inside transitions using placed "sound actors" (green actors) along the player's likely path; garden ambience with a fountain whose sound will mask footsteps if you stay near it; entering the bank there is still no music until an actor triggers "exploration music"; separate bathroom and vent ambiences; that day he received Tobin's last piece (cargo ship music) - "music is done", remaining: integrate in maps + voice recording. Diary 3 (U3_t05, 4:57) animation: lead animator Jacques Dussault, ~10 animators, all keyframed in Character Studio/3ds Max, no mocap, exported to Unreal editor; "gym" test maps; animation art director used video reference for realistic NPC behaviour.
- GameGrin "Splinter Cell: Chaos Theory Diaries" (PC play-diary series, Jun-Aug 2017, parts 2-9): guards' overheard chats used as humour (motion-detector lights on driveway; mercs praising Shetland); SP Seoul (part 7, 5 Aug 2017): propaganda loudspeaker you can shut off via circuit bypass, fizzing unexploded bomb, building on fire with explosions, a night-light surviving in a wall-less building, Lambert says the "splinter cells in training" lost the target (SP/co-op crossover); part 9 (26 Aug 2017): "alert" music came in so loud the writer couldn't hear the guards' conversation - a readability conflict between music and barks.
- Diary 4 (U4_t06, 4:26) level design, Clint Hocking (creative director, scriptwriter, lead LD): beta-to-master = tuning; maps already have normal + specular maps, reflective surfaces, "shadow lights"; example: a guard whose slow patrol makes the player step into the doorway as he rounds the corner is "a really bad setup" - player must know in advance the guard is there, fix by flipping which end of the spline patrol he starts on; testers fire sticky cams onto a roof, whistle through the cam to lure guards, but ceiling too high for gas range -> adjust geometry or global gas range (make the expected outcome happen). Other bonus-disc clips: S2_t01 comedic co-op promo ("new employee at Third Echelon... cool moves... upcoming cooperative missions"); V3/V4 = story trailers; R5_t09 (5:08) and Q4_t39 (3:00) produced no speech in ASR (music/gameplay only - contents unverified).
- Bonus-disc documentary "history of Tom Clancy's Splinter Cell" (Q1_t00, 21:37; ASR transcript; speakers mostly unnamed): CT rebuilt graphics engine ~8 months; "we added an entire... sound masking system" - when environment noise is loud, sounds you make aren't heard ("noisy down here makes it easy to sneak up on people"); dynamic weather (wind scales, rain; Sam gets wet and dries over time); storm front: rain heavier, surfaces more reflective, enemies dislike rain and re-route patrols to dry places, lightning flash may reveal you but thunder covers your noise - "all these dynamic systems acting together"; AI given stress: noise/broken lights unseen -> "that's strange... who's playing with me?" attitude shift; barks expanded from a handful of canned lines to talking about what they notice ("did you hear that?" -> buddy joins, impromptu team, call for cover fire); co-op = "field side story" of two rookie agents; hardest part = two characters synchronising specific actions; "you got to trust a partner". SC1 segment: goggles' three-dot silhouette chosen to make Sam recognisable; whole world casts shadows.
