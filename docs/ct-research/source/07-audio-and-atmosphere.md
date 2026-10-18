# 07 - Audio and atmosphere

Everything the research found about the music, sound and visual atmosphere of *Splinter Cell: Chaos Theory* (CT, 2005), with the co-op mode first and whole-game facts after. Every section is split into **CO-OP SPECIFIC** and **WHOLE GAME** parts, clearly labelled.

**Platform key.**
- **Version 1 = Xbox / PC:** Training, Panama, Seoul, Chemical Bunker, Train Station, plus the two free downloads Nuclear Plant and UN Headquarters (Xbox Live download; PC patch 1.05).
- **Version 2 = PS2 / GameCube:** Team Training plus four story missions split into sub-levels. No PS2/GC game data was available, so the game-file findings below are Xbox/PC only.
- **Handheld = N-Gage / DS:** a separate Gameloft five-part co-op campaign (Rooftops, Breakdown, Corruption, Prison Rescue, Escape).

**Confidence marks** follow 00-index.md: [CONFIRMED - several sources: ...], [ONE SOURCE: ...], [INFERRED / UNCERTAIN: ...], [UNKNOWN - see 06-open-questions.md, R-..], [ANALYSIS].

**Main source files.** `15_music_and_atmosphere.md` (the corrected topic file), `research_notes/music_and_atmosphere.md` (the full first-pass note with an appendix of working notes), `research_notes/gap_closing_gamefiles.md` (R-21, R-22, credits, DLC text), `research_notes/gap_closing_community.md` (voice, community memory), plus every other file in /home/user/docs that mentions the topic (listed at the end).

**New primary material behind this topic.**
- The game's Limited Edition bonus-disc videos (archive.org item `q-1-t-00_202406`, https://archive.org/details/q-1-t-00_202406), downloaded and machine-transcribed locally (faster-whisper, base.en). They include Ubisoft's own "Development Diaries" (one on SOUND with sound designer Fabien Noel; one on AI; one on animation; one on level design with Clint Hocking) and a 21-minute franchise documentary. ASR garbles proper names; the wording below is a paraphrase of the transcripts. [ONE SOURCE: bonus disc]
- The Xbox manual's co-op "Communication System" page (scan `raw/ia/xbm/hi-27.png`, manual p.26) and the Prima guide's co-op communication section. Together they settle how voice chat interacts with guards.
- Composer interviews: 2005 (GameSpot Q&A, via search snippet only; PC Gamer making-of) and 2025 (Restart.run).
- The game's own map settings files (`.ini`, section [MUSICFILES]) and level packages from preserved builds on archive.org: PC105 (installed PC copy at patch 1.05), XB477 (Xbox build 477, dated 21-22 Feb 2005) and XBDLC (the Xbox Live download packages).

---

## 1. Co-op music per map (CO-OP SPECIFIC)

### 1.1 Music sets loaded from each co-op map's settings file (Xbox/PC)

**Source.** The music-file list in each co-op map's `.ini` file, section [MUSICFILES]. It is identical in the Xbox build 477 (XB477) and the PC 1.05 install (PC105). The two download maps were read from the Xbox Live packages (XBDLC) and PC105. [CONFIRMED - several sources: XB477, PC105, XBDLC ini files]

| Co-op map (internal map file) | Music sets loaded | Which solo mission the extra set belongs to |
|---|---|---|
| Training (`00_Training_COOP`) | `Mus_Common` + `SCX_Mus_00Training` | the solo training bank |
| Panama (`01_Panama`) | `Mus_Common` + `Mus_02CargoShip` | solo Cargo Ship |
| Seoul (`02_seoulthree` / `02_Seoulthree`) | `Mus_Common` only | none |
| Chemical Bunker (`03_ChemBunker`) | `Mus_Common` + `Mus_07Battery` | solo Battery |
| Train Station (`04_GCS`, GCS = Grand Central Station) | `Mus_Common` + `Mus_04Penthouse` | solo Penthouse |
| Nuclear Plant (`05_NuclearPlant`, download) | `Mus_Common` + `Mus_05Displace` | solo Displace |
| UN HQ (`07_UNhq`, download) | `Mus_Common` + `Mus_11KokuboSosho` | solo Kokubo Sosho |

[CONFIRMED - several sources: XB477 + PC105 for the five base maps; XBDLC + PC105 for the two downloads]

- **The pattern.** Each co-op map loads the shared common set ("Common") plus, on six of seven maps, one solo mission's stem set. Seoul runs on the common set alone. [CONFIRMED - several sources: map settings files]
- **Album tracks that match these solo sets** (track-to-level links come from the album titles and fan rips, see 2.4) [INFERRED / UNCERTAIN: links from titles, not heard]:
  - Panama uses the Cargo Ship set: the album track for Cargo Ship is "El Cargo".
  - Chemical Bunker uses the Battery set: "Theme From Battery".
  - Train Station uses the Penthouse set: Penthouse uses the "Ruthless" intro and part of "Ruthless (Reprise)" as calm/progress ambience [ONE SOURCE: FAN].
  - Nuclear Plant uses the Displace set: "Displaced".
  - UN HQ uses the Kokubo Sosho set: "Kokubo Sosho Stealth" and "Kokubo Sosho Battle (adapted from Cougar Merkin)".
  - Training uses the solo Training set (a "Training Soundtrack" fan upload exists: https://www.youtube.com/watch?v=inb4WU0JKEM, not listened to).
- **Mission-file notes in the topic files.** The Train Station breakdown and the Chemical Bunker breakdown each note the added solo set (Penthouse; Battery); the Seoul breakdown notes that Seoul uses only the common set. [CONFIRMED - several sources: map settings, restated in 04_mission_breakdowns/train_station.md, chemical_bunker.md, seoul.md]
- **Internal numbering, for reference.** The PC co-op map files that can be launched from a batch file are `00_Training_COOP`, `01_Panama`, `02_seoulthree`, `03_ChemBunker`, `04_GCS`, `05_NuclearPlant`, `07_UNhq`; slot 06 is missing. The poster adds that maps launched this way behave like test builds (lots of ammo, **no dialogue**). [ONE SOURCE: Steam discussion 133262738417485094] Nuclear Plant is map 05 / mission 55 / map identity 201; UN HQ is map 07 / identity 202; base co-op maps are 00-04, identities 100-105. [ONE SOURCE: PC105/XBDLC]

### 1.2 Generic theme names triggered by the co-op scripts (Xbox/PC)
- The co-op level scripts trigger generic themes named **`Mus_Gen_Shetland1-3`** and **`Mus_Gen_SpyRoom_1-3`**. These are internal names, probably held inside `Mus_Common`. [ONE SOURCE: XB477/XBDLC `.lin` level packages]
- Name match, for the record: the Fandom PC-rip list names Jesper Kyd cues "Spy Room", "Defusal", "Spy Theme", "Common" and "Spy Room (extended)". Whether `Mus_Gen_SpyRoom` is the same piece as Kyd's "Spy Room" cue is not established. [INFERRED / UNCERTAIN: name match only] "Shetland" is the name of a solo-campaign character (mercs praise their boss Shetland in overheard chatter, GameGrin diaries).

### 1.3 Music states in the engine (Xbox/PC)
- The music system has the states **idle, exploration, stress A, stress B, fight, death, failure, success**. [ONE SOURCE: XB477/XBDLC level scripts]
- This confirms the adaptive, tension-driven layering described for the whole score (section 2.2) for co-op too. [CONFIRMED - several sources: level scripts + the adaptive-score sources in 2.2]
- How these eight states map onto the "four layers" of each piece (2.2) is not documented. [UNKNOWN - see 06-open-questions.md]

### 1.4 No dedicated co-op score
- The PC credits video names only one composer: "music composed by Amon Tobin"; "cinematics scored by Jesper Kyd". There is no separate co-op composer. [ONE SOURCE: PC105 `Data/Videos/Credits.bik`, frames read at roughly 9-20 s and 36-45 s]
- So co-op reuses solo stem sets plus the common set; there is no dedicated co-op score. [CONFIRMED - several sources: map settings files + credits video, "VERIFIED for reuse" in gap_closing_gamefiles.md]
- **Superseded claims (kept as notes).**
  - The first-pass music note said "Which composer the co-op mode used: NOT ESTABLISHED. No source maps any cue to the co-op menus or the seven co-op missions", and that all level-named cue sets are single-player levels. Its "reasonable but unproven hypothesis" was that co-op maps reuse single-player stem sets and/or "Common". Corrected by the game-file pass (R-21): the hypothesis is now confirmed from the map settings files.
  - The same note asked whether Kyd wrote any co-op music. The game files show only Tobin-era banks named for solo levels plus the common set; Kyd's possible share of `Mus_Common` is not known. [INFERRED / UNCERTAIN]
  - 15_music_and_atmosphere.md §1.3 first listed co-op music as a GAP ("no source maps a cue to the co-op menu or missions"); §7 of the same file then closed it for missions.

### 1.5 Co-op menu music
- Which music plays in the co-op menus is **not identified**. [UNKNOWN - see 06-open-questions.md, R-21 (closed for missions, open for menus)]
- Leads not listened to (YouTube watch pages were blocked; titles came from oEmbed): a fan "coop gameplay music video" (https://www.youtube.com/watch?v=-8Oio-dEv8M) and a "Multiplayer menu" upload (https://www.youtube.com/watch?v=PrKI5lpffwo). Kyd's "Spy Room" (https://www.youtube.com/watch?v=jp6EFfv7eWM), "Spy Theme" (https://www.youtube.com/watch?v=dZJVpwrJ1vY) and "Common Soundtrack - Amon Tobin, Jesper Kyd" (https://www.youtube.com/watch?v=vL-p3wBW_t4) uploads also exist. [ONE SOURCE: YouTube titles]
- Whole game: one Steam user says he opens the game just for the menu music. [ONE SOURCE: Steam reviews corpus]

### 1.6 Co-op music on PS2/GameCube and N-Gage/DS
- PS2/GC: no PS2/GC data was available to the game-file pass (the PS2 USA image returned "item not available"; the PS2 redump collection holds only CHD files; no GameCube image was found), so which music sets the PS2/GC co-op sub-levels load is unknown. [UNKNOWN - see 06-open-questions.md, R-05 / R-21]
- N-Gage/DS: no music facts were found. The N-Gage co-op beta press footage has no sound; its first frame shows Lambert's team intro (https://www.youtube.com/watch?v=oozYweL4ASM). [ONE SOURCE: YouTube]

### 1.7 Credits relevant to co-op audio
- **Co-op lead sound designer: Alexandre Carlotti.** [ONE SOURCE: PC105 credits video, section "Single Player & Coop Mode Development Team (Montreal)"]
  - Superseded/earlier state: the first-pass note had this only from a MobyGames search summary (site 403): Xbox Lead Sound Designer Fabien Noel; a separate "Coop Lead Sound Designer", Alexandre Carlotti; Windows Lead Sound Designer Isabelle Ballet and Sound Studio Director Jeremi Valiquette; PS2 Sound Designer Brian Youds and an Amaury La Burthe sound collaboration; an IMDb snippet naming Keith Arem as sound recordist/voice director. All of those except Carlotti remain [INFERRED / UNCERTAIN: search summary only]. The credits video closed R-12 for the co-op roles: "Co-op audio credits: closed. The co-op team had its own lead sound designer; music is credited to the main composer only" (15 §6).
  - Fabien Noel as CT sound designer is confirmed on camera in the Ubisoft sound dev diary, and Fandom names him SC1's lead audio designer. [CONFIRMED - several sources: bonus-disc diary + Fandom cut-content page] A YouTube upload of the sound diary describes him as "lead sound designer" (https://www.youtube.com/watch?v=g0Jl6uVAcGE, 4:24). [ONE SOURCE: YouTube description]
- Overall credits (same video): producer Mathieu Ferland; creative director Clint Hocking; music composed by Amon Tobin; cinematics scored by Jesper Kyd. Versus was a separate team (Ubisoft Annecy). [ONE SOURCE: PC105 credits video]
- Note: `Credits.int` in both XB477 and PC105 is an unused, half-empty template, not the real credits. [ONE SOURCE: XB477/PC105]
- [ANALYSIS] A dedicated co-op lead sound designer means co-op audio was its own work package, which fits the bespoke co-op ambiences (3.2).

### 1.8 Reading of the co-op music findings [ANALYSIS]
- Reusing solo stem sets kept co-op on-brand at low cost.
- One map (Seoul) running only the common set shows that mood can be carried by ambience (here a war soundscape) and the adaptive system alone.

---

## 2. The score in general (WHOLE GAME)

### 2.1 Composers and roles
- **Amon Tobin wrote the in-game (gameplay) score.** [CONFIRMED - several sources: Wikipedia CT + Amon Tobin articles, Fandom, Ubisoft press release 31 Aug 2004, PC Gamer, Restart.run] The PS2 manual credits line reads "Soundtrack composed by Amon Tobin". [ONE SOURCE: PS2M]
  - Ubisoft Montreal contracted him in **January 2004**. [CONFIRMED - several sources: Wikipedia "Amon Tobin", Fandom]
  - Ubisoft had already cut an internal gameplay video to his music before hiring him. [CONFIRMED - several sources: PC Gamer making-of; Giant Bomb snippet]
  - Ninja Tune's press text says Ubisoft had also auditioned film composers, **Lalo Schifrin** among them, before picking Tobin. [ONE SOURCE: Ninja Tune release page]
  - Ubisoft press release, 31 Aug 2004 (via Game Developer / Games Press): Tobin announced as composer; Ubisoft EMEA marketing director Florence Alibert said graphics, sound and gameplay were designed to complement each other, with "dynamic music and sounds"; Tobin said Ubisoft wanted music fully intertwined with the game and the team "labored meticulously over every aspect of the sound design", with no concessions; a companion CD of extended/remastered themes and a 5.1 collector edition were planned for spring 2005; Tobin was then living in Montreal. [ONE SOURCE: PR]
- **Jesper Kyd scored the cinematics (cutscenes).** [CONFIRMED - several sources: Wikipedia CT (citing GameZone + SoundtrackNet interviews), Pocket-lint review, SquareEnixMusic review, Fandom] Wikipedia's Kyd article gives the 2005 CT credit "with Amon Tobin". Pocket-lint calls Kyd a "Bafta-award winner". SquareEnixMusic says Tobin's score complements Kyd's cinematics.
- **Kyd and multiplayer.** Fandom says Kyd also did the "multiplayer" music. [ONE SOURCE: FAN] Its PC-rip list names Kyd cues "Spy Room", "Defusal", "Spy Theme", "Common" and "Spy Room (extended)". The spy titles suggest Versus (Spies vs Mercs) menus or modes. [INFERRED / UNCERTAIN: inference from titles] A fan YouTube upload labels "Defusal" as Bathhouse (single-player) music. [INFERRED / UNCERTAIN]
- **Licensed and diegetic music.** Rock songs on in-game radios are by the band **Kesshin** ("One More Regret", "Resonance"). [ONE SOURCE: FAN] A VGOST fan wiki lists **Boccherini's "Minuet"** as used in the game; the level is unknown. [ONE SOURCE: VGOST fandom] Some Tobin tracks were reportedly used on the TV show Top Gear (a Steam user calls some music "stock" heard on Top Gear). [INFERRED / UNCERTAIN: Steam 16687618]
- GameSpot's review snippet says the music is percussive and recalls the Mission: Impossible score. [INFERRED / UNCERTAIN: snippet only, page not fetched]

### 2.2 The adaptive (interactive) score system
- **Stacked intensity layers.** Each piece was written as stacked layers ("levels") of intensity that the engine adds or removes as the situation changes. [CONFIRMED - several sources: Wikipedia citing Remix magazine (Ken Micallef, "Under a Microscope", 1 Apr 2005), CDM, Tiny Mix Tapes, Kotaku, Restart.run, PC Gamer]
  - Wikipedia "Amon Tobin": each track split into four similar parts by intensity so developers could pick by player action.
  - CDM (Peter Kirn, 27 Jul 2005): four intensity levels per song as stacked parts; Tobin calls the four tiers "levels"; the engine adds and subtracts layers as stress/action rises. CDM explains the layers like multitrack stems (bass, drums, pad, lead) that are muted and unmuted. [ONE SOURCE: CDM, as to that analogy]
  - Tiny Mix Tapes: pieces organised internally into four stress levels, picked apart for the game then reassembled for the album; compares the score to Herrmann/Hitchcock.
  - Kotaku "Morning Music" (2020): a track per level, four layers each, so Ubisoft could shift the feel dynamically; "El Cargo" and "Displaced" are favourites.
  - Fandom: the album "is not a soundtrack"; in game each track is split into components layered by player actions, so album versions are heard only as fragments.
- **How many layers: conflict.** Four is given by Wikipedia/Remix, CDM, TMT and Kotaku. Three is given by the SquareEnixMusic review of the 5.1 DVD (George), which names them **calm exploration, approaching danger (tension), enemies alarmed (action)**. A web-search snippet (vgmonline / thumbsticks / gamesfirst, unverified wording) also gives three levels. Best reading: "four layers per piece, mapped to roughly three gameplay states". [INFERRED / UNCERTAIN until a primary source settles it] The engine's own state list (1.3: idle, exploration, stress A/B, fight, death, failure, success) is the primary evidence now available; it has more states than either count. [ANALYSIS]
- **What drives the changes (triggers).**
  - Being spotted or setting off an alarm raises the intensity **immediately**. [CONFIRMED - several sources: CDM; TechEnclave review (the music speeds up when enemies are alerted and settles when the alarm dies down)]
  - A fan review says a chase at alarm stage 3 makes the music escalate sharply. [ONE SOURCE: search snippet]
  - **Placed triggers.** Exploration music is started by placed "sound actors" in the map. In Ubisoft's sound diary, Fabien Noel shows there is **no music on entering the Bank** until an actor starts the "exploration music". [ONE SOURCE: bonus-disc dev diary 2 (U2_t04)]
  - Fan rips label the pieces per level and per state, for example Bank, Penthouse and Displace "full themes". [ONE SOURCE: YouTube titles via oEmbed, not listened to]
- **Attack and decay.**
  - Attack: immediate on being spotted or an alarm (above).
  - Decay: calm returns as the alarm dies down [TechEnclave]; one reviewer says the music grows with the action and fades out when stealth is needed [ONE SOURCE: Hofstra Chronicle].
  - A player reports combat music lingering **about a minute** after a quick takedown. [ONE SOURCE: Steam review 18481578]
  - Exact transition and decay times are not documented. [UNKNOWN - see 06-open-questions.md]
- **How the states sound.**
  - Quiet exploration: brooding ambient suspense; conflict: high-intensity percussion and strings. [ONE SOURCE: Restart.run]
  - Stealth themes: a bassy twang and spectral radio-like chatter; getting caught: disruptive snares and drum rolls. [ONE SOURCE: PC Gamer]
  - Music grows with the action and fades out when stealth is needed. [ONE SOURCE: Hofstra Chronicle]
  - Steam players: animations and music shift together as you creep up for a grab (Steam 7429908); a "perfect mix of background noise and high-tension BGM" when cover is blown and alarms go (12881970); the music is low-key and dynamic, changing with gameplay (16492969, 200 helpful). [ONE SOURCE each: Steam]
- **Tobin's design aim.** Every individual layer had to be as musically compelling as the full mix. [ONE SOURCE: Tobin in PC Gamer] Adaptive intensity "had not been technically achievable to that degree before" and forced Ubisoft tech innovation. [ONE SOURCE: PC Gamer] The music should complement play, not steer emotions; he himself often switches game music off for immersion. [ONE SOURCE: Restart.run] Tobin: not the first adaptive music, but the most intricate implementation to date. [ONE SOURCE: Restart.run]
- **Silence is the default.**
  - A preview says quiet is more common than music, with echoing voices and footsteps, and that unlike MGS the game does not snap to a fast "chase" track when you are seen; the music follows tension. [ONE SOURCE: GamesFirst preview, Chris Martin, 8 Feb 2005]
  - The sound diary shows music deliberately held back on entry into an interior. [ONE SOURCE: dev diary 2]
- **Producer's "loop of emotion".** Mathieu Ferland describes the game's rhythm as tension builds, a possible burst of action, relief, repeat; sound and music sustain it. [ONE SOURCE: PC Gamer]
- **Implementation.** The engine streams sound together with textures and meshes. [ONE SOURCE: Computer Graphics World, Mar 2005] The game ran on a modified Unreal Engine 2.5. [CONFIRMED - several sources: Fandom; dev diary 3 mentions exporting to the Unreal editor]
- **Known side effects (player complaints).** [ONE SOURCE each]
  - Combat music lingers about a minute after a quick takedown (Steam 18481578).
  - Dramatic cues leave players unsure whether they were actually detected (Steam 24304134).
  - Alert music came in so loud that a writer could not hear the guards' conversation he was trying to overhear (GameGrin diary part 9, 26 Aug 2017).
  - Constant "is someone there?" barks plus pursuit music on Penthouse feel nagging (Steam 78166029).
  - Restated as anti-pattern A17 "Music ambiguity" in 12_anti_patterns.md: combat music outlives the fight, leaves players unsure whether they were seen, and drowns barks; the fix proposed there is music that follows real AI state with short tails, ducking under barks. [ANALYSIS]

### 2.3 How Tobin made it
- **Influences.**
  - Vintage film scores, especially **Lalo Schifrin**, combined with the drum'n'bass he played in clubs. [CONFIRMED - several sources: PC Gamer 2025 quote, RA review (Schifrin as frenetic jazz; Brazil; "play with bass full")]
  - He wrote it "as if it was a score for a **Dario Argento** movie". [CONFIRMED - several sources: Ninja Tune press text, GameSpot Q&A via search snippet]
  - Moods and instrumentation modelled on the Italian prog band **Goblin** (Argento's composers). [ONE SOURCE: The Stranger, Dave Segal, 24 Feb 2005]
  - **Bernard Herrmann, John Barry** and a '70s-horror sound. [ONE SOURCE: GameSpot Q&A, 26 Jan 2005, via search snippet; page Cloudflare-blocked; it was a phone interview in a Montreal taxicab; Shacknews gives the pointer and date]
  - Ninja Tune: an "occasionally slightly camp homage" to great soundtrack composers; aimed for a unifying atmosphere with recurring, evolving themes. [ONE SOURCE: Ninja Tune]
- **Source material.** This score is where Tobin moved from sampling vinyl to recording his own material: acoustic instruments were played, then electronically warped. [CONFIRMED - several sources: Wikipedia CT, Ninja Tune, Restart.run, RA] Ninja Tune called it an electronic record made almost entirely from acoustic instruments. Wikipedia: more original/field samples than his earlier albums. The Stranger: session players' parts (Mellotron, flute, Hammond, strings, percussion) run through electronics; nearly a dozen elements per track. SquareEnixMusic: live session musicians sampled (mellotron, flutes, mostly acoustic).
- **Credited players** [CONFIRMED - several sources as credits: Discogs, Wikipedia, The Stranger, Restart.run]: written/produced/arranged + electronics Amon Tobin; bass Nacho Mendez; flute Eiji Miyake (Discogs spells "Myake"); Mellotron Umberto Modugno; Hammond Massimo Modugno; guitar Fabio Lenzi; piano Dominico Lenzi; drums Fausto (Discogs "Faustio") Bava and Giuseppe Guerra; percussion Juan Luis Verdi; strings "The Canhoto Philharmonic Orchestra" conducted by Alfonso 'El Jeffe Fragante' Testi; backing vocals Kawaguchiko National Junior Choir; "Spiritual Advisor & Tambourine" Salvatore Pennacchio; mastered by Eddy Schreyer.
  - Caution: some credits and Tobin's liner-note blurb (a comic story of tracking Mendez down in Mexico and reuniting the feuding Modugno brothers) read as tongue-in-cheek. No source says they are fictional, but whether a literal live band was recorded is [INFERRED / UNCERTAIN].
- **Process facts from Tobin (2025).** About nine months, full time, seven days a week. He was wary of game work (seen as selling out; he disliked grandiose imitation-Hollywood game scores). Ubisoft told him to make it sound how he wanted and pitched a new technology that made written music adapt to gameplay. His condition was that Ubisoft took no notes, though they were free not to use the music; he says no conflict arose. He was given after-hours access to Ubisoft Montreal's foley room, experimented there and returned to record for his 2007 album *Foley Room*. He saw synthesized physics-based sound in the audio team's tech (a dragged box whose sound adapted to its movement). [ONE SOURCE: Restart.run, Paul Weedon, 28 Mar 2025] The Stranger: Ubisoft let Tobin treat it as a film score. GamesFirst: Tobin made a stereo and a 5.1 mix.
- **The album came after the game cues.** The album versions were arranged after the in-game material was composed. [CONFIRMED - several sources: CDM 2005, Tiny Mix Tapes, Discogs CD note "From the in game music to ... Chaos Theory, courtesy of Ubisoft"] Wikipedia: in-game music is layered from sequences, so in-game cues differ from album versions. The CD insert includes track creation notes and BPMs. [ONE SOURCE: Discogs]
- **Music finished before map integration.** In Ubisoft's sound diary, Noel received Tobin's last piece, the cargo-ship music, on the day of filming: "music is done"; what remained was integration in maps and voice recording. [ONE SOURCE: dev diary 2]

### 2.4 Track list and track-to-level links
**Album** (Ninja Tune ZEN CD100, released **25 Jan 2005**, two months before the game; 10 tracks on CD and 2xLP) [CONFIRMED - several sources: Discogs, Fandom, Wikipedia, Ninja Tune]:

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

- "Cougar Merkin" is a Tobin B-side. [CONFIRMED - several sources: Fandom, Discogs title, SquareEnixMusic] SquareEnixMusic notes Asian elements in "The Clean Up".
- **Likely level links** (from titles and fan rips) [INFERRED / UNCERTAIN unless noted]: Lighthouse - "The Lighthouse"; Battery - "Theme From Battery"; Kokubo Sosho - the two "Kokubo Sosho" tracks; Cargo Ship - "El Cargo"; Displace - "Displaced"; Hokkaido - "Hokkaido". Penthouse uses the "Ruthless" intro and part of its reprise as calm/progress ambience. [ONE SOURCE: FAN]
- **In-game music not on the album.** Fandom's "PC full rip" has **12 per-level stem sets**: Training, Lighthouse, Cargo Ship, Bank, Penthouse, Displace, Hokkaido, Battery, Bathhouse, Kokubo Sosho, "Common", Credits. **None is named for a co-op mission.** [ONE SOURCE: Fandom rip list] Sputnikmusic commenters note the Bank music is missing from the album. [CONFIRMED - several sources: Fandom + Sputnik comment, for "Bank not on album"] A bootleg with extended in-game themes and Kyd cutscene music circulated in mid-2005. [ONE SOURCE: FAN]
- **Kyd cues (from the rip):** Spy Room, Defusal, Spy Theme, Common, Spy Room (extended). [ONE SOURCE: FAN]
- **Fan rips (YouTube, not watched; titles via oEmbed):** full-theme rips by Alex37 (Bank, Displace, Penthouse, Battery, Lighthouse); "Training Soundtrack" (inb4WU0JKEM); Hokkaido all themes (tf6Is6pj1zk); "Battery 14 min complete version game rip" (lsxhy_9iijg); PC full rip 2:36:42 (sGQ_DITqH8A); "Korean Radio Quotes" (hWc8_DmVHkA); "In-Game Media Sound Compilation" (J_8IfpHoW8M). [ONE SOURCE: YouTube titles]

### 2.5 Releases (soundtrack, 5.1, remix album)
- **5.1 DVD (ZEN DVA100):** a full remix "taken from the original multi track masters", mixed (5.1 and stereo) by Amon Tobin and **Bobby Owsinski** [Discogs credits]. Wikipedia's "Bobby Azinsky" (an SSL room in LA, citing Pixelsurgeon 2005) appears to be a misspelling of the same engineer. [INFERRED / UNCERTAIN on identity, high likelihood] It is a hybrid DVD-Audio (hi-res 5.1) plus Dolby Digital 5.1 and 2.0 downmix disc (11 tracks), with bonus track "Stolen" (Middle Eastern percussion and vocals, per SquareEnixMusic), a Hexstatic video for "El Cargo" and a game trailer. [CONFIRMED - several sources: Discogs, Fandom, SquareEnixMusic] The August 2004 press release had already promised a stereo CD and a 5.1 limited edition. [CONFIRMED - several sources: press release, GamesFirst]
- **Bonus disc sampler.** The game's Limited/Collector's bonus disc had a soundtrack sampler page (The Lighthouse, Theme From Battery, El Cargo). [ONE SOURCE: frame from bonus-disc video R5_t09] The PS2 pre-order bonus DVD upload has creator chapters including "soundtrack sampler" at 54:29 (https://www.youtube.com/watch?v=d2vBjrRKs3g, 1:34:00). [ONE SOURCE: YouTube description]
- **Chaos Theory Remixed (The Soundtrack to Splinter Cell 3D)**, Ninja Tune ZEN171 / ZENDNL171 (download/WAV), released **21 Feb 2011**, 12 tracks. [CONFIRMED - several sources: Discogs, Fandom, Wikipedia "Amon Tobin"]
  - New tracks: "Breaking Protocol" and Tobin's "Splinter Cell Conviction Theme Menu" (Tobin later contributed a menu theme to Conviction, 2010).
  - Remixes: The Qemists (El Cargo, Displaced), Daedelus (Kokubo Sosho Stealth and Battle), King Cannibal (The Lighthouse, Theme From Battery), Lorn (The Clean Up, Hokkaido), Kid Koala (Ruthless), Eskmo (Ruthless Reprise).
  - LP sleeve art/3D FX by Openmind from existing Splinter Cell elements, inner sleeve meant for 3D glasses; linked to the 3DS port *Splinter Cell 3D*.

### 2.6 Criticism and reception of the score (whole game; more in section 5)
- Overwhelmingly positive. See section 5 for critic quotes, Steam counts and awards. Criticisms are the four player complaints in 2.2 (lingering, ambiguity, masking barks, nagging). Sputnikmusic users were split: some call it tedious out of context. Kotaku (2020): the tracks sound almost too busy, which produces the right tension.

---

## 3. Sound design

### 3A. CO-OP SPECIFIC

#### 3A.1 Bespoke co-op ambiences per map (Xbox/PC)
- **Co-op ambiences are bespoke** [CONFIRMED - several sources: map `.ini` files, XB477 + PC105 + XBDLC]:
  - `Amb_C01_*` Panama;
  - `Amb_C02_*` Seoul docks;
  - `Amb_C03_*` Chemical Bunker;
  - `Amb_C04_*` Train Station.
- **The two download maps** (Nuclear Plant, UN HQ) borrow Chemical Bunker, Battery and Kokubo/Penthouse-type ambience sets from other maps and add a co-op sound bank of their own, **`SCX_DL_COOP`** (the "DLC co-op sound bank"). [CONFIRMED - several sources: XBDLC + PC105 ini files]
- Training: no co-op ambience bank is named in the findings; Training's lighting and noise are "not documented". [UNKNOWN - see 06-open-questions.md]

#### 3A.2 Noise meter vs ambient marker in the co-op HUD (all console/PC versions)
- The co-op HUD has the same noise meter as solo, described as showing the spy's own noise and how noisy the environment around him is. [CONFIRMED - several sources: XBM p.23, PS2M] Each agent has his own light and noise meter pair (and on Xbox the partner's health). [CONFIRMED - several sources: XBM + PS2M]
- Xbox co-op HUD list: life bar, light meter, noise meter, interaction system, selected item, communication box, objective icon, ammo, teammate status (partner's health), Co-op Action key icon, alarm indicator, chat box. [ONE SOURCE: XBM p.23] PS2 co-op HUD list: life bar, light meter, noise meter, interaction system, selected item, communication box, objective bar, objective icon, ammo, Co-op action icon, timer, alarm indicator (no teammate-health item and no chat box listed). [ONE SOURCE: PS2M] (See 05-hud-and-camera.md.)
- A Neoseeker thread ("Train station - We're stuck") shows players confused by HUD symbols above the light meter (likely the alarm counter). [ONE SOURCE: Neoseeker search snippet]

#### 3A.3 Voice chat and the real microphone feeding guard hearing (Xbox Live, PC online)
- **Guards hear real voices.** Online co-op with an Xbox Communicator (or a PC headset) feeds your real voice into the game world; nearby guards can hear you if you speak too loudly; speaking too loudly reveals your position. [CONFIRMED - several sources: XBM p.26, PRIMA co-op chapter, GamesFirst preview, GameSpot Panama co-op hands-on snippet (1100-6119226), TeamXbox review]
- **Voice as a lure.** You can also talk loudly on purpose to attract or distract guards. [CONFIRMED - several sources: XBM, PRIMA, TX] TeamXbox: guards react to voice volume, which can be used to lure them. [ONE SOURCE: TX]
- **The microphone fed the in-game sound meter.** Two Reddit commenters remember that microphone speech registered on the in-game sound meter, so guards could hear you talking at full volume, and that you could deliberately make noise into the mic to attract or distract guards. [CONFIRMED - several sources: Reddit r/patientgamers mngqa0 (2 commenters), plus r/gaming vpwdry and r/Splintercell 1e9pwjx] This is the most-praised systemic detail in community memory. [CONFIRMED - several sources: Reddit threads]
- **Settings and sensitivity.**
  - The feature can be switched off in the Options under Xbox Live / the online options. [CONFIRMED - several sources: XBM + PRIMA]
  - Voice detection sensitivity sets the radius in which a normal voice is detected. **The default value is 50, which equals about 2 m in-game for a normal speaking voice.** [CONFIRMED - several sources: XBM + PRIMA]
  - Xbox options menu (game text): voice masking, voice through speakers, voice detection, and voice detection sensitivity (how much guards hear you). [ONE SOURCE: XB477 `PreGameMenus.int`] Other Xbox options from the manual: voice through TV speakers, voice masking, Quick Match restricted to headset users. [CONFIRMED - several sources: XBM pp.22, 26; PRIMA; GF]
  - Xbox match-creation options include "voice-only" (next to mode, difficulty, language, friends-only and friendly fire). [ONE SOURCE: XB477 `PreGameMenus.int` [OPTIONSTITLE]] The PC co-op menu (`PreGame_PC.int`, section CoopCommon) also lists voice-only (with name, mode, mission, difficulty, skills, language). [ONE SOURCE: PC105]
  - PC manual: the sensitivity setting does **not** change partner voice volume. [ONE SOURCE: PCDVD manual]
- **No whistle in co-op.** The whistle button is repurposed as the Co-op Action button, so agents cannot whistle and the headset voice is the only vocal lure. [CONFIRMED - several sources: PRIMA "agents can't whistle", XBM controller diagram, FW controls page, Steam user] Co-op Action input: Xbox Black button (replaces whistle), PS2 L2 (replaces whistle), GameCube Z + D-pad Left (Z is a modifier; the same combo whistles in solo). [CONFIRMED - several sources: XBM/PS2M/FW for Xbox and PS2; GC ONE SOURCE: FW]
  - Superseded/conflicting note: the GamesFirst preview says whistling into the headset replaces the whistle button and can attract a guard without a button press. [ONE SOURCE: GF] The first-pass note flagged this as uncertain because the retail PS2 manual shows "Whistle/Co-op action"; the corrected reading is that the button does co-op actions in co-op, and a whistle into the mic would work only as voice detection. [INFERRED / UNCERTAIN]
- **Ambient cover for voices.** To talk near guards, find louder ambient sound to cover your voice. [ONE SOURCE: GamesFirst] [ANALYSIS] This ties the voice feature to the noise meter's ambient marker.
- **Always-on.** Prima describes the headset as constant contact with your partner. [ONE SOURCE: PRIMA]
- **Positional voice.** 03_coop_overview.md lists voice chat as "positional, and audible to guards". [CONFIRMED - several sources: XBM, PRIMA, preview, TX, Steam] Whether partner-to-partner chat itself fades with in-game distance is **not documented**: the sources only describe proximity toward the AI. [UNKNOWN - see 06-open-questions.md, R-22]
  - Gap-closing result: no option or string about partner-to-partner distance attenuation exists in the Xbox menus; the PC manual says the sensitivity setting does not change partner voice volume; community threads only ever describe guard hearing. R-22 stays open. [ONE SOURCE each: XB477 PreGameMenus.int; PCDVD manual; Reddit]
  - The derived design docs record a working decision D-17 "Partner voice: always clear (earpiece model)", with guard hearing separate (D-06 "Proximity voice: opt-in modifier, off by default, visible and tunable"). These are the new game's choices, not CT facts. [ANALYSIS]
- **Text chat.** The Xbox co-op HUD also has a text chat box. [ONE SOURCE: XBM] PC text chat uses a "Say" key. [ONE SOURCE: FW] How "Say" works in practice on PC was not found. [UNKNOWN - see 06-open-questions.md]
- **Platforms.**
  - Xbox: Xbox Live and System Link with the Xbox Communicator. Critics' preferred way to play is Live/System Link with headsets. [ONE SOURCE: TX]
  - PC: online/LAN co-op existed (ubi.com/GameSpy servers, since shut down). Today players use LAN over virtual-LAN tools (Radmin, ZeroTier, Hamachi, Evolve). On today's PC the in-game voice option is **greyed out**, so players use Discord. [CONFIRMED - several sources: Reddit vpwdry; Steam reviews ("no in-game voice without a headset on Steam; Discord recommended")]
  - PS2: the USB headset is documented for chat and lobby generally ("to spy on enemies via gadgets" in Versus). PS2 co-op itself is described as offline split-screen. [CONFIRMED - several sources for split-screen: GamesFirst, Co-optimus snippet, PRIMA; headset text ONE SOURCE: PS2M]
  - GameCube: no online play. [CONFIRMED - several sources: GameRevolution GC]
  - So voice detection by guards applies to Xbox and PC online co-op only. [INFERRED / UNCERTAIN for PS2: whether any online co-op voice existed on PS2 is a gap; the manual's USB headset text is generic]
- **Reception of the feature.** Turning voice into a stealth mechanic was the most-praised co-op systems idea after the moves themselves; players had to decide when it was safe to speak (a "whisper culture"). [CONFIRMED - several sources: reception.md, TX, Steam x4, GameSpot hands-on snippet] Players and critics name "guards hearing your real voice; whispering; luring by talking" and "talking into the mic to lure a guard" among the co-op's wow moments. [CONFIRMED - several sources: TeamXbox; GameSpot hands-on; Steam (x4); Reddit (several threads)] Late 2004 to early 2005 previews already promised proximity voice that guards can hear. [CONFIRMED - several sources: GamesFirst; GameSpot first look] CheatCC's review says headset comms add realism. [ONE SOURCE: search snippet]

#### 3A.4 Automatic voice lines and the no-headset fallback (Xbox/PC; manuals)
- **"Alternative Voice Communication"** switches on automatically for an agent without a headset; it only works in specific situations. [CONFIRMED - several sources: XBM p.26 + PRIMA] The game plays canned lines automatically:
  - when an agent initiates a co-op move or interaction (a recorded message tells the partner he is waiting);
  - when the move completes (a second message);
  - when an agent's health empties (a "teammate needs help" call). [ONE SOURCE: PRIMA]
- **Directional calls on rope moves.** During Dual Rappel and Hang Over (Hangover), clicking and pushing / holding the left stick in a direction sends a directional voice message; releasing sends "stop". The rappeller sends "Left" / "Right" / "Stop"; the suspended Hangover agent sends "Up" / "Down" / "Stop". [CONFIRMED - several sources: XBM + PRIMA]
- **Crane communication (Chemical Bunker, Xbox/PC).** One agent operates a crane while the other gives directions through a "Crane Communication" interaction: stick directions send "Back / Forward / Left / Right / Lower / Raise / Stop" voice messages. Used in the Blue Room to set a missile on a holder, followed by a simultaneous wire cut. [ONE SOURCE: XBM p.27 for the interaction; use CONFIRMED - several sources: XBM + PRIMA] The PC manual also describes partner voice commands for the crane. [ONE SOURCE: PCDVD manual + e-mail]
- **Synchronized puzzles relaxed without voice.** Online without headsets, the first player selects the action and presses A, the second does the same, and the game syncs them automatically (dual retinal scanner explicitly covered); Prima adds that this makes synchronized puzzles easier (no exact simultaneity) online without a headset. [CONFIRMED - several sources: XBM p.27 "Puzzle Action" + PRIMA]
  - Counterpoint: a jeuxvideo.com player said synchronising is not really possible without a microphone. [ONE SOURCE: JV]
- **HUD counterpart.** When the partner is ready for a co-op move or interaction, a Co-op Action key icon appears. The automatic voice line is the audio counterpart. [CONFIRMED - several sources: XBM p.23 + PS2M; manual + PRIMA]
- **Invalid move feedback.** If there is no room for a free move, the agent shakes his head and the controller vibrates (no penalty). [ONE SOURCE: XBM p.23]
- **Revive.** A downed partner gives about 30 seconds to be revived, and each agent carries one adrenaline syringe, so a team can revive twice per mission (Xbox/PC). [CONFIRMED - several sources: XB477 + PC105 training text; XBM p.25; PCDVD manual p.13] The automatic "needs help" line is the audio cue. [ONE SOURCE: PRIMA]
- **Controller vibration as an information channel (PS2/GC and Prima route).** Thermal vision **or controller vibration** tells which bomb wire is active (Train Station; PRIMA notes vibration as well as thermal); a PS2 uploader says the bomb is hard without vibration, which also cues the live wire. [CONFIRMED - several sources: PRIMA + YouTube comments ge7dEnjp6MU]
- **Wordless coordination.** Players finished the hardest difficulty with a stranger without mics by miming, used jumps and visual cues with Korean players, and called coordinating with a stranger who spoke another language both infuriating and the most satisfying thing they did online. [CONFIRMED - several sources: 3 independent YouTube comments]

#### 3A.5 The agents' own voice lines ("Damn, we're good")
- The two agents are blank slates with cocky lines, for example **"Damn, we're good"** and the "we're the first" exchange about other Splinter Cells. Players nicknamed them "Bob and Steve" after G4 X-Play's machinima ("Co-op Theater"). Some wish they had more story and dialogue; the campaign "felt more like mission packs". [CONFIRMED - several sources: Reddit 1g21m8q, 1rz5d99, ijtifz, 1fiyo7i]
- **When "Damn we're good" plays (as remembered).** A repeated failure story: a partner misjudges a zip-line, drops in front of a guard, the other clears the room and revives him, then the agents' "Damn we're good" line plays. [CONFIRMED - several sources: Reddit 1megyet and others] What exactly triggers the line (objective completion, move completion, room clear) is not documented. [UNKNOWN - see 06-open-questions.md]
- **"We're the first."** Fandom's Agent One/Two pages say the agents assumed "Fisher" was a call sign because they believed they were the first Splinter Cells. [ONE SOURCE: FAN]
- Players nicknamed the agents "Spy Blue and Spy Red" after their lamp colours (4A.2). [ONE SOURCE: Steam 21672477]
- Who voices the two agents was not found. [UNKNOWN - see 06-open-questions.md]

#### 3A.6 Lambert (the controller) voice, briefings and radio in co-op
- **Lambert is voiced by Don Jordan in CT.** [CONFIRMED - several sources: Slashdot, Steam review 55110708] (TechEnclave misnames the actor as Dennis Haysbert, a reliability caveat for that review.)
- **Briefings.** Co-op missions open with Lambert addressing both trainees. Panama: he welcomes them to "the big leagues"; they are not finished training, but no other assets are free. [CONFIRMED - several sources: FAN + PRIMA] In-mission comms appear in a "communication box" at the top of the screen. [CONFIRMED - several sources: XBM p.23, PS2M]
- **Briefing tone per mission (Xbox/PC unless noted)** [sources as given]:
  - Training: as trainees the two must learn to rely on each other; nothing stands between them and failure except their wits and their partner; the course teaches tasks a lone agent could not achieve. [ONE SOURCE: FAN, EN and RU texts match] PS2 Team Training: no briefing text recorded. [UNKNOWN - see 06-open-questions.md, R-05]
  - Panama: the "big leagues" welcome; the VP's bribery to let ships skip Canal Zone inspections. [CONFIRMED - several sources: FAN + PRIMA; PC105/XB477] PS2/GC Prima briefing instead frames the VP as head of immigration offices taking bribes to let illegal immigrants cross the border. [ONE SOURCE: PRIMA; R-14, PS2/GC in-game text unchecked]
  - Seoul: Lambert opens by calling the job easy before the twist (the target is a double). [CONFIRMED - several sources: FAN en/ru + RYB]
  - Chemical Bunker: Lambert in the Laboratories: do not kill the technicians. [CONFIRMED - several sources: PRIMA + FAN]
  - Train Station: Colonel Kim has seized Grand Central; no demands; stop the bio-weapon release. [CONFIRMED - several sources: FAN + hexen2k7 description]
  - Nuclear Plant (download): opens with the Grand Central aftermath. [CONFIRMED - several sources: XBDLC + PC105 text]
  - UN HQ (download): international territory; no lethal force; Lambert aborts the moment he hears a general alarm. The briefing screen also carries a disclaimer that the United Nations has not approved or endorsed the use of its name or logos. [abort rule CONFIRMED - several sources: XBDLC + PC105 + FAN + hexen2k7 + PR; disclaimer ONE SOURCE: hexen2k7 transcription]
  - 09_pacing_and_flow.md: the briefing sets tone and stakes; one briefing even calls the job easy before a twist. [CONFIRMED]
- **Cross-campaign radio (Seoul, Xbox/PC).** In Fisher's single-player Seoul mission, Lambert tells Sam that "Splinter Cells in training" lost their target to NK Special Forces. Sam interrogates one of two NK soldiers near a truck; over a radio patch a trainee asks where Jong was taken, Sam jokingly threatens the soldier, who says Jong was moved to a cyber-cafe off the fish market by the river; the trainee thanks him. Co-op players hear this exchange over the radio; they do not see Fisher. [CONFIRMED - several sources: Fandom "Seoul/Transcript" + Fandom "Seoul" trivia + GameGrin "Chaos Theory Diaries Part Seven" (5 Aug 2017) + EG + RYB] Rybka places the Fisher radio exchange after the second AA vehicle and reads it as comic relief. [ONE SOURCE: RYB, for timing] Whether co-op players can trigger it earlier or later, or whether it replaces the agents' own optional officer interrogation, is unconfirmed. [INFERRED / UNCERTAIN] Players list "hearing the solo hero's campaign from the co-op side" among wow moments. [CONFIRMED - several sources: Elder-Geek; Steam (x9)]
- **Seoul timer warnings.** A 5-minute timer starts when the plane is shot down, with Lambert warnings at each minute. [CONFIRMED - several sources: XB477 + PC105 text; RYB]
- **Unlockable advice (Nuclear Plant).** Gathering the Yongbyon blueprints lets Lambert give advice about the complex. [CONFIRMED - several sources: FAN + XBDLC/PC105 objective text] Lambert's guidance lines in order (game text): no blueprints at start - get inside and find the main control room; once blueprints are taken, go on to the turbine zone; the security doors are blocked and a nearby computer controls them; the turbine is overhead - reach the stairs on the far side, then cross the turbine room toward the control room; the elevator cannot be called from where you are - find another way to the upper floor; he **scolds players who linger with radioactive material** instead of going upstairs; the Lab's server can be reached from a ceiling trap-door; after learning the helper is Jin Soo (a CGIB officer), leave the Lab by the side door. Lambert's reaction to the intel e-mails: Kim still has one bomb and will attack again; proceed to the Lab. Designer triggers fire messages near the security doors, on the stairs to the turbine room, on the footbridge outside the Lab and on accessing the archives. [ONE SOURCE: XBDLC `05_NuclearPlant.lin` for triggers; lines CONFIRMED - several sources: XBDLC + PC105]
- **UN HQ guidance and timer lines.** Lambert's opening line says to rappel down to the window-washing platform and get into the building. Finding blood tells Lambert that Kim got there first, and he orders the agents to stop him whatever it takes. In the ventilation room: that's half the job, now reach the other side of the room - the passage is back downstairs. `DefeatKim`: Kim is no longer a threat. `InterogateKim` has an empty/null speech line. **Timer lines at 20 minutes, 10 minutes, 5 minutes and 60 seconds left**; the countdown is announced by voice-text even though no number is shown. [CONFIRMED - several sources: XBDLC + PC105 text + FAN RU]
- **The controller is silent in both download missions.** His briefing and in-mission lines appear only as on-screen text with no voice. Commenters explain it as the late download not getting new recordings; a Reddit commenter says the same of UN HQ ("you can read his text on screen"); a Steam reply says the missions never shipped with spoken Lambert lines. [CONFIRMED - several sources: YouTube comments on hexen2k7 Nuclear Plant 1/3 (jry663Tx5bg) and PleasePlayMore #17 (phfqPfdFZdQ) + Reddit v5jncz + Steam threads 828925849173270181 and 45350245387206844]
  - Game-file detail: both download briefings point to the **Panama briefing voice cue `Play_BRF_51_000_01Lam`**, which looks like a placeholder. [ONE SOURCE: XBDLC/PC105]
  - Players noticed and missed the voice. [CONFIRMED - several sources: Steam threads + video comments]
- **Native-sounds PC bug (downloads).** On PC, the two download maps do not support the "Use native languages" sound option (patch 1.05 readme). A Steam user found that enabling "Use native sounds" on these two maps made the info screen vanish and **killed ambient and enemy voices**, matching the readme warning. [CONFIRMED - several sources: PC 1.05 patch readme (PCDVD embedded readme; LoneBullet/gamepressure copies) + Steam threads 828925849173270181, 45350245387206844 + YouTube comments] The PC readme lists the two levels as UN Headquarters then Nuclear Plant, selectable only in Mission mode from the Create Game screen, not in Story mode. [ONE SOURCE: patch readme]
- **Handheld (N-Gage/DS) radio.** Lambert's radio lines and briefings exist as game text strings (keys like `COOP_01.COM_000_10`); Lambert introduces the team (Assault = combat; Hacker = hacking and stealth) and says the mission only works if both cooperate; generic co-op alarm lines (first alarm: two more and the mission is over; second: one more and Lambert calls it off; third: mission aborted; a separate line says the alarm level was lowered); in Prison Rescue he greets them in Spanish; a second radio line repeats that both Breakdown switches must be pressed together (apparently a hint after a failed attempt). [CONFIRMED - several sources: NG-TXT + FW] Whether these lines are voiced is not documented. [UNKNOWN - see 06-open-questions.md, R-23]
- **Note on story delivery.** Story in co-op is carried by briefings, radio, mission notes, in-game e-mails and overheard conversations. Critics considered the co-op story secondary; players remember the "parallel story" fondly (nine Steam reviews mention it). [ONE SOURCE: Penny Arcade; Steam count ONE SOURCE]

#### 3A.7 Guard dialogue, eavesdropping and barks in the co-op missions
- **Eavesdropping as story delivery** [ONE SOURCE: PRIMA co-op walkthroughs unless noted]:
  - Chemical Bunker (Xbox/PC): from the end of a crawlspace the pair overhear two technicians in the lower Blue Room (ru Fandom also notes the talk can be overheard). [CONFIRMED - several sources: PRIMA + FAN RU] A scientist's line about looking after the monkeys is quoted with affection by players. [ONE SOURCE: Reddit]
  - Train Station (Xbox/PC): the pair bug the main-hall payphone (via a Hangover from the top of the phone booth) and listen to the villain's call; the call reveals the contaminated soldier. [CONFIRMED - several sources: PRIMA + game text]
  - Panama (Xbox/PC): two server-room guards chat, with 3 random dialogue variants. [ONE SOURCE: FAN RU]
- **Guards react to sound in co-op routes.** Guards investigate shot-out lights and noises (Train Station). [ONE SOURCE: PRIMA] The reception-hall pair (Panama) and two cafe guards (PS2/GC Seoul) are lured by sticky-camera noise and gassed. [ONE SOURCE: PRIMA]
- **Glitch.** Elder-Geek reports guards tripping over each other and alerting others while the agents were hidden, which made detection feel unearned. [ONE SOURCE: EG]
- **Chemical Bunker laser warning sound (Xbox/PC).** In the Storage Room hall a cycling floor laser grid is crossed by running while it is off; **a sound warns it is coming back**, and both do a split jump (wall split) to stay above it. [ONE SOURCE: PRIMA]
- **Failure sound and spectacle.** Players remember failing the Chemical Bunker missile disarm causes a large explosion with ragdolls everywhere. [ONE SOURCE: Reddit 1ouonhz]

#### 3A.8 War ambience as a stealth space (co-op Seoul, Xbox/PC)
- The co-op Seoul mission notes tell players that gunfire may not be aimed at them, because a war is on. [CONFIRMED - several sources: game text XB477 + PC105; Fandom EN + RU (one source); RYB] This is an explicit "ambient threat is not real threat" signpost.
- Ambient war noise masks the players' own noise. [CONFIRMED as present; masking effect INFERRED / UNCERTAIN] Seoul's ambience bank is `Amb_C02_*` ("Seoul docks"). [CONFIRMED]
- The co-op Seoul mission has an alarm system even though the solo Seoul mission does not. [ONE SOURCE: FW]
- Steam forum users name Seoul as a favourite for its war-zone atmosphere; it may refer to single-player Seoul. [ONE SOURCE: Steam, ambiguous, https://steamcommunity.com/app/13570/discussions/0/616199347862335006/]
- Single-player Seoul (whole game, for comparison): background automatic-weapon and anti-aircraft fire [ONE SOURCE: Globe and Mail]; a propaganda loudspeaker you can shut off via a circuit bypass, a building on fire with explosions, and an unexploded fizzing bomb [ONE SOURCE: GameGrin part 7].
- A Seoul newspaper reviewer said the invasion level would make Korean players cringe and doubted a Korean release as-is. [ONE SOURCE: Korea JoongAng Daily, 25 Aug 2005]

#### 3A.9 Machinery noise in the downloads (Nuclear Plant)
- Ubisoft PR stresses "loud machines" in Nuclear Plant's turbine halls, so the machinery should mask noise, but no source documents a noise-masking mechanic there. [INFERRED / UNCERTAIN] Guard counts, lighting and noise masking for Nuclear Plant remain open. [UNKNOWN - see 06-open-questions.md, R-19]

#### 3A.10 Weather and sound in co-op
- Co-op weather is not documented for any co-op map: no source describes rain, time of day or palette for a co-op map. [UNKNOWN - see 06-open-questions.md]

### 3B. WHOLE GAME

#### 3B.1 Player noise vs ambient noise (the noise meter)
- **New HUD meter.** CT adds a noise meter under the light (stealth) meter. Bars show the player's noise and a marker (Prima: a transparent slider) shows the ambient level; bars past the slider brighten when the player is audible. Noise above the ambient marker can be heard by guards. [CONFIRMED - several sources: Wikipedia, PS2M, PRIMA, NWR, Empire, TechEnclave, PC Games] Maxim (via Wikipedia) framed stealth around the enemy picking up "your audio signature". PC Games: the noise bar limit shifts with background noise.
- **Ubisoft's name: "sound masking system".** The bonus-disc documentary: "we added an entire ... sound masking system"; when the environment is loud, sounds you make are not heard ("noisy down here makes it easy to sneak up on people"). [ONE SOURCE: bonus-disc documentary Q1_t00; consistent with all of the above]
- **Masking sources placed on purpose.**
  - Machines, generators, radios and TVs create windows where you can move quickly; reviewers mention sprinting on hard floors near a radio, TV or hammering machine. [CONFIRMED - several sources: PC Games DE, Substack review, Prima Lighthouse notes on stormy weather and generators]
  - When generators are switched off, the area turns dangerously quiet. [ONE SOURCE: PRIMA]
  - A passing truck or rolling thunder can mask you. [ONE SOURCE: NWR]
  - In the sound diary, Noel places a fountain sound in the Bank garden specifically so that staying near it masks your footsteps. [ONE SOURCE: dev diary 2]
  - Guard radio chatter in the distance masks a kill on the cargo ship. [ONE SOURCE: TechCentral.ie]
  - TechEnclave: environmental audio (rain splatter, generator hum, radio messages) is both atmosphere and gameplay via the sound meter. Substack: the sound meter removes guesswork and ambient radio lets you move faster.
- **Rules of thumb (Prima guide "Sound & Silence")** [ONE SOURCE unless noted]:
  - Guards walk straight to a noise source; in a firefight they aim where your noise last exceeded ambient.
  - Analogue speed sets noise; crouching is quieter. Walking with a gun drawn is silent under normal conditions, so use it where ambient is zero.
  - Grass and carpet are quiet; wood and metal are loud. [CONFIRMED - several sources: Prima, PC Games, Giant Bomb/Fandom stealth snippet]
  - Grab/interrogation and OPSAT talk are silent to the AI. OCP use is silent, but the disabled device may crackle, which works as a lure.
  - Hitting a person is quieter than shooting a bulb; a missed shot into a wall is the loudest thing you can do.
  - Changing rifle attachments sounds noisy but is not "heard".
  - Lures: whistle, thrown objects, the sticky-cam clicker. (Substack says guards now fire toward a whistle rather than walk to it, which conflicts with Prima's tip; context dependent.)
  - The stealth meter governs light, not what the screen looks like (see 4B.2).

#### 3B.2 Footsteps and surfaces
- Surface type changes footstep loudness: soft surfaces quieter than wood and metal. [CONFIRMED - several sources: PRIMA, PC Games DE, Giant Bomb snippet] PC Games: crouch on carpets when it is quiet.
- Hokkaido uses squeaking "nightingale" floors. [CONFIRMED - several sources: Dev Game Club ep 475 notes + GameRevolution's "squeaking, ninja-proof floors"]
- Sam freezes in place when you stop; purely cosmetic. [ONE SOURCE: Substack]
- GamesFirst: quiet is common, with echoing voices and footsteps. [ONE SOURCE]

#### 3B.3 Guard barks and chatter: information and humour
- **Barks became a system.** Ubisoft moved from a handful of canned barks to guards that comment on what they notice, talk to each other ("did you hear that?" - a buddy joins), form impromptu teams and call for cover fire. Guards pass through stress stages, from puzzled to rattled ("that's strange ... who's playing with me?" attitude shift after unseen noise or broken lights), shown in both dialogue and animation. [CONFIRMED - several sources: bonus-disc documentary + dev diary 1 (AI, U1_t03; lead AI programmer Frederic ..., given as Frederic Blais in a YouTube description) + Wikipedia AI paragraph citing a Ubisoft AI featurette]
- **Barks as signposting.** Audio tells you about guard behaviour before you enter a room (Steam 107702538); hearing enemies talk to themselves builds tension (Steam 16370622). [CONFIRMED - several sources: Steam reviews; GameGrin diaries] Dev Game Club takeaway: "communicating enemy AI state clearly without UI". [ONE SOURCE: DGC show notes]
- **Humour.**
  - Guards' broken-English small talk is funny; knife-point interrogations "could be sold as a radio play". [ONE SOURCE: PC Games DE]
  - Dialogue is well written and funny. [CONFIRMED - several sources: GameRevolution ("superb voice acting"), Slashdot, TechEnclave]
  - Sam and Grimsdottir trade age jokes. [ONE SOURCE: Globe and Mail]
  - GameGrin diaries cite guards bragging about motion-sensor lights on a driveway and mercs praising their boss (Shetland).
- **Versus (not co-op):** binoculars and spy bullets let you intercept enemy headset talk; the alarm snare emits fake spy noises. [CONFIRMED - several sources: PS2M, PRIMA Versus chapter]

#### 3B.4 Weather and sound coupling
- **Simulated weather tied to sound.** A real-time weather system (rain, fog, snow, lightning, wind) is linked to the sound system so that weather noise covers movement. [CONFIRMED - several sources: Computer Graphics World + bonus-disc documentary]
- **What a storm changes:** rain grows heavier; surfaces turn more reflective; **guards dislike rain and re-route patrols to dry places** (CGW: idle NPCs seek shelter); **lightning may reveal you while thunder covers your noise**; "all these dynamic systems acting together". [CONFIRMED - several sources: documentary + CGW] Wind scales; Sam gets wet and dries over time. [ONE SOURCE: documentary]
- Stormy weather masks noise on the Lighthouse level. [CONFIRMED - several sources: PRIMA + NWR thunder]
- Lightning briefly changes light levels, creating momentary windows; documented for solo missions. [ONE SOURCE: PRIMA]
- Courtyard sprinklers can be turned on to distract guards. [CONFIRMED - several sources: CGW + GameGrin part 5]

#### 3B.5 Alarms (sound and consequence) (see 03-mechanics.md)
- Alarms no longer end the mission on Xbox/PC; each escalates: body armour, then helmets, then fortified positions (four stages). [CONFIRMED - several sources: Hocking in PC Gamer ("no game over"), Fandom co-op mission pages, JoongAng Daily, XBM/PS2M alarm indicator]
- Exceptions: UN HQ co-op aborts on a general alarm [CONFIRMED - several sources: game text + FAN]; PS2/GC co-op sub-levels fail on the third alarm [ONE SOURCE: FW, about 14 sub-level pages] (the first-pass music note had this only as "reportedly ... from shared brief", now upgraded); failing or timing out of a hack sounds an alarm [ONE SOURCE: PS2M].
- Versus: cameras show green when idle and red when the alarm is active, and emit sound. [CONFIRMED - several sources: PS2M + PRIMA Versus]

#### 3B.6 Gadget sounds
- The sticky camera has a clicker/whistle lure plus gas; the OCP crackle doubles as a distraction. [CONFIRMED - several sources: Wikipedia + PRIMA] In the level-design diary, testers fire sticky cams onto a roof and whistle through the cam to lure guards. [ONE SOURCE: dev diary 4]
- The night-vision "whine" is remembered by players as iconic. [ONE SOURCE: Steam 227082455]
- The co-op-only Jammer (the pistol's OCP in co-op) shows a red light that turns green on a jammable target: a visual cue, not an audio one. [ONE SOURCE: XBM p.25]

#### 3B.7 Positional audio, 5.1 and platform differences
- **Xbox:** reviewers praise 5.1; enemies can be heard approaching from all sides, and the creaking cargo-ship background adds a lot. [ONE SOURCE: VideoGamer] The Xbox Marketplace (backward-compatibility) listing shows Dolby Digital. [ONE SOURCE]
- **PC:** EAX room acoustics make sounds hollow through closed doors and echo in halls; firefights hit hard in 5.1. [ONE SOURCE: PC Games DE] A Steam user notes the PC menu has EAX and Dolby options. [ONE SOURCE] Another says PC effects do not fade or echo the way they do on Xbox. [ONE SOURCE: Steam 7812974]
- **GameCube:** Dolby Pro Logic II (not Dolby Digital). [ONE SOURCE: NWR]
- **PS2:** reworked sound effects; the two readouts (player noise and ambient) plus surround make gameplay "much more sound-oriented than ever before" and reward surround setups. [ONE SOURCE: WorthPlaying, 17 Apr 2005] PS2 options have separate music and effects volume and headset settings. [ONE SOURCE: PS2M]

#### 3B.8 Developer sound-diary and documentary findings (bonus disc)
- **Diary 2 - SOUND (U2_t04, 4:18), sound designer Fabien Noel, on the Bank map** [ONE SOURCE: bonus-disc diary 2, ASR paraphrase]:
  - Placing sound is hard because level artists and designers change the geometry daily.
  - He plugs in ambiences per environment and builds outside-to-inside transitions using placed "sound actors" (green actors) along the player's likely path.
  - A garden ambience with a fountain whose sound will mask your footsteps if you stay near it.
  - Entering the bank there is still **no music** until an actor triggers the "exploration music".
  - Separate bathroom and vent ambiences.
  - That day he received Tobin's last piece (the cargo-ship music): "music is done"; remaining work was integration in maps and voice recording.
- **Diary 1 - intro and AI (U1_t03, 3:33):** producer Mathieu Ferland introduces a team of 120+ and diaries on AI, sound, animation and co-op; the lead AI programmer says NPCs have distinct stress stages expressed through what they say (barks) and animation. [ONE SOURCE]
- **Diary 3 - animation (U3_t05, 4:57):** lead animator Jacques Dussault, about 10 animators, all keyframed in Character Studio / 3ds Max, no mocap, exported to the Unreal editor; "gym" test maps; the animation art director used video reference for realistic NPC behaviour. [ONE SOURCE]
- **Diary 4 - level design (U4_t06, 4:26), Clint Hocking:** see 4B.3. [ONE SOURCE]
- **Documentary "history of Tom Clancy's Splinter Cell" (Q1_t00, 21:37):** the graphics engine was rebuilt in about eight months; the sound masking system; dynamic weather; AI stress; barks expanded; co-op is a "field side story" of two rookie agents; the hardest part was two characters synchronising specific actions; "you got to trust a partner"; SC1 segment: the goggles' three-dot silhouette chosen to make Sam recognisable; the whole world casts shadows. [ONE SOURCE]
- Other bonus-disc clips: S2_t01 comedic co-op promo ("new employee at Third Echelon ... cool moves ... upcoming cooperative missions"); V3/V4 story trailers; R5_t09 (5:08) and Q4_t39 (3:00) produced no speech in ASR (music/gameplay only; R5_t09 identified from a frame as the soundtrack sampler page, Q4_t39 as spy training pages); S3_t02 (3:47) produced no speech and was not identified. [ONE SOURCE]
- **Superseded note.** dev_and_design_intent.md said the contents of the Collector's Edition development diaries and the G4 "Making Of" were unknown (YouTube transcripts blocked). The later music pass transcribed the bonus-disc diaries from archive.org; the G4 "Making Of" content remains unknown. The Ubisoft "Behind the Scenes: Sound Design" in-game featurette (YouTube punciITHal8) and "Developer Diaries - Sound" (g0Jl6uVAcGE, 4:24) could not be opened; bonus-disc diary 2 is their likely twin. Other uploads: PS2-disc Sound Design diary https://www.youtube.com/watch?v=vp3tET9xVKk; E3 2004 compilation with AI and Sound dev diaries https://www.youtube.com/watch?v=nN1YVwO-3hQ (1:32:23). [ONE SOURCE: YouTube metadata]

---

## 4. Visual atmosphere

### 4A. CO-OP SPECIFIC

#### 4A.1 Killing light is the core co-op verb (per mission and platform)
- Every co-op route in the Prima guide uses light switches, shot bulbs, jammed lights (OCP), neon signs or a lit billboard. [ONE SOURCE: PRIMA co-op routes, all missions; "VERIFIED as pervasive" in 08_level_design_patterns.md P13 and 09_pacing_and_flow.md] Almost every artificial light can be shot out, switched off or temporarily disabled with the jammer; disabling a light alerts nearby guards, but the trade usually favours the player. [CONFIRMED - several sources: PRIMA, FW, WP] Guards come to fix lights, and this is used as a lure. [ONE SOURCE: PRIMA]
- **Light as a shared resource.** One agent kills or jams a light so the other can move, or holds a light off with the jammer. [CONFIRMED - several sources: PRIMA, XBM] The jammer (the pistol's OCP in co-op) must be held, drains and recharges, and moving cancels it; its light is red and turns green on a jammable target (lights, cameras, laser emitters, turrets, mobile sensors). [CONFIRMED - several sources: XBM pp.25-26, PS2M, PRIMA] The pistol shoots out lights and is usable while hanging in Hangover, on Dual Rappel or on a partner's shoulders. [CONFIRMED - several sources: XBM, PS2M, PRIMA]
- **Per mission (route details, all [ONE SOURCE: PRIMA] unless noted):**
  - **Panama, Xbox/PC:** exterior courtyard lampposts shot out with pistols, then move through the shadows to an open 2nd-floor window; Hallway A lights killed with the wall switch; "Broken Elevator" corridor: one agent OCPs the overhead light while the other slips past the camera, then they swap; lights off in the next rooms, and one agent shoots out the elevator car's light while riding; 3rd-floor hall: lights off with the switch, a guard leaves the security office to turn them back on and is grabbed; Archive Room: lights killed with the switch, one agent searches while the other knocks out the guard who comes to fix the lights; upper hallways: shoot lights; hallway to the server: shoot the overhead lights and knock out the two guards who investigate; server room: shoot the light near the computer so the camera cannot see you; exit: stay in the shadows to the trucks. Lighting in the level: switches usable as lures (hall, archive), lampposts, chandeliers, lights inside the elevator car. Opening: an outdoor stealth approach in the dark. 09_pacing: "a dark courtyard and boost into a window".
  - **Panama, PS2/GC:** A1 waits in the shadows at the truck; drop into a shadowy part of a room; in the archive both take shadows either side of the doorway and A1 uses EMF plus the OCP to kill the north-wall camera.
  - **Seoul, Xbox/PC:** shoot out the neon signs on surrounding buildings before climbing into the hotel; kill the room light; stairwell: one shoots the light near the stairs while the other ledge-grabs the guard from the railing; one hacks the back-door keypad while the other shoots the hallway ceiling light; Rybka's variant has one agent waiting on the zip line until a top-right light is shot out; Fish Market Store: turn off its lights (switch to the right of the door, medkit, save). Both guides rely on shooting out lights (neon at insertion, room lights, stair light, hallway ceiling light, cafe ceiling light). [CONFIRMED - several sources: PRIMA + RYB for the overall reliance]
  - **Seoul, PS2/GC:** Agent 2 holds his OCP on a ceiling light so Agent 1 can drop through a floor hole into the darkened ground floor past a turret, before the OCP charge runs out (a soft timer); back-to-wall shuffles to avoid light; patrols taken together from shadow; at the cafe Agent 1 hits a light switch to pull the patrolling guard's attention while Agent 2 grabs Jong (decoy and grab).
  - **Chemical Bunker, Xbox/PC:** shoot hallway lights; from a crawlspace overlooking the Blue Room, shoot out all its lights early (you return there later: foreshadow and return); shoot a hallway light and the light above a guard to lure a second guard from beyond the laser beams; Operation Room: one agent shoots the x-ray light board to black out the room while the other drops; Storage Room: shoot out the far-wall light; Cryogenic Chamber: shoot the corner light so the guard across the room cannot see; shoot the hall light when the doors open, re-enter the Blue Room which should still be dark; Missile Boat Room: shoot its lights. The route depends on shooting lights throughout.
  - **Chemical Bunker, PS2/GC:** shoot the elevator's ceiling light; creep along the shadowed side of the ship.
  - **Train Station, Xbox/PC:** sewer: knock out the first guard when he walks into shadow; repair yard: shoot out or throw objects at all lights, then take the guards in the dark; Hydro Tunnel: one agent shoots a light on the far wall to pull a guard over so the partner can be thrown over the bomb laser onto him; small room: OCP on the light while the other opens the door into the Machine Room and immediately shoots its overhead light, darkening half the room; guards go to look at the broken light while the pair hug the wall; Metro Station: creep through shadows and through the dark train car; escalators: shoot the overhead light and a **lit billboard** to darken the top; finale: shoot the remaining lights.
  - **Train Station, PS2/GC:** Agent 2 fires a sticky camera at a dark wall; a light switch blacks out the train tunnel.
  - **Nuclear Plant and UN HQ (downloads):** lighting is not documented. [UNKNOWN - see 06-open-questions.md, R-19, R-20]
  - **UN HQ rule:** being detected in windows where the light is on fails the mission. [ONE SOURCE: FAN RU] No game-text string mentions windows or lights in UN HQ; one fuzzy Reddit memory of shimmying down a building past a guard who investigates a light going out cannot be assigned to UN HQ. [INFERRED / UNCERTAIN: Reddit 1m8z5gm; R-20 open]
  - **Training:** lighting not documented. [UNKNOWN - see 06-open-questions.md]
- **Cameras.** Ordinary (non-thermal) cameras can be beaten by darkness alone; the jammer can hold them off. [ONE SOURCE: IGNW for darkness; jammer CONFIRMED]
- **Pacing role of darkness.** Lit spaces read as danger, dark ones as safe; neon and billboards act as landmarks; dark service spaces serve as breathing spaces after peaks (Seoul: sewers and the dark fish-shop interior with a medkit after the vehicle demolitions; Chemical Bunker: elevators and crate halls after the cryo mix). [ONE SOURCE: PRIMA; "VERIFIED as pervasive" for the light pattern in 09_pacing_and_flow.md]

#### 4A.2 Blue and red goggle lamps (partner identification)
- The two co-op agents are told apart by goggle-lamp colour: **Agent One blue, Agent Two red**. [CONFIRMED - several sources for the two colours: Fandom Agent One/Agent Two pages + xisto forum snippet (split screen vertical, one red light one blue) + Steam review "Spy Blue and Spy Red" (21672477) + WP; the One = blue / Two = red mapping is ONE SOURCE: FAN]
- **Early screenshots had both agents blue**, before red and blue were split. [ONE SOURCE: FAN]
- In fiction, enemies cannot see the goggle glow. [ONE SOURCE: Fandom goggles page trivia]
- The PC Shader Model 3.0 HDR path adds bloom on the goggle glow ("headset" glow) and a bigger glow around the character. [ONE SOURCE: bit-tech]
- N-Gage/DS: the Shadownet Hacker wears blue goggles. [ONE SOURCE: FW mission pages]
- [ANALYSIS] Colour-coded light points let partners recognise each other in darkness and on split-screen, where silhouettes are lost.

#### 4A.3 Co-op maps brighter (and smaller) than solo; reduced graphics
- Players criticise **too-small maps and areas lit too brightly compared with solo levels** (a "low-budget" feel). [ONE SOURCE: Reddit 1g21m8q, 2 commenters] README summary: "Players called the co-op maps smaller and brighter than the solo levels."
- Co-op and Versus did not get the single-player graphics upgrade. [ONE SOURCE: GameRevolution (Xbox A-, GC B; 5 Apr 2005)]
- A player says Versus has "no ambience" compared with single-player. [ONE SOURCE: Steam 23239859] (Versus, not co-op.)
- The original Xbox title update shipped with the Steel Squat download (July 2005) fixed light replication between host and clients and other Versus bugs. [CONFIRMED - several sources: WorthPlaying + VideoGamer] (Versus.)
- One veteran says the first few co-op levels are among the best co-op ever, but the later levels feel rushed. [ONE SOURCE: Reddit 1utzrr6]

#### 4A.4 Palettes, weather, time of day and moods per co-op map
- **Not documented by any critic or developer source found.** Palette or mood claims would be invention. [UNKNOWN - see 06-open-questions.md] Known setting facts only [FAN + PRIMA]:
  - Training: Third Echelon facility, Fort Meade.
  - Panama: PCA (Panama Canal Administration) building, Panama City; office interiors; light switches; dark exterior courtyard with lampposts.
  - Seoul: war-torn streets, hotel, temple, fish market, cyber-cafe, neon.
  - Chemical Bunker: Nampo silo, labs, "Blue Room", cryogenic chamber.
  - Train Station: Grand Central, repair area, subway, lit billboards.
  - Nuclear Plant: Yongbyon (power plant, turbine hall, radiochemistry laboratory, outdoor footbridge); in-game date sometime 18-31 October 2007. [date ONE SOURCE: FAN]
  - UN HQ: New York (Turtle Bay), 31 October 2007, night. [date ONE SOURCE: FAN]
- Whole game: players remark on a surprising amount of colour in CT compared with modern games [ONE SOURCE: Steam 16492969]; one negative reviewer felt it lacks SC1's visual style [ONE SOURCE: Steam 145383153].

#### 4A.5 Goggles as co-op information and atmosphere
- Thermal is used in co-op to find live bomb wires (Train Station) and active wires (Chemical Bunker missile warhead), and partners must talk to cut them together; on PS2 a player says turn thermal on to see which wire glows, turn it off, then cut that wire (X button on PS2). [CONFIRMED - several sources: PRIMA + YouTube comments on 8FiRUvq86sg (PC), LY9-0Dk-YHk (GameCube), ge7dEnjp6MU (PS2)] Thermal also shows the blood-serum sequence. [ONE SOURCE: RUW] The bomb is the single most-asked "how do we do this" moment in comments. [CONFIRMED - several sources: 6+ comments]
- EMF (electromagnetic) vision is used constantly on the PS2/GC routes to spot cameras, turrets and wall mines. [ONE SOURCE: PRIMA]
- EEV: co-op agents cannot use EEV remote hacking (Prima); the PC controls bind key 4 to EEV mode and the Xbox layout labels a button "camera / EEV", so EEV usability in co-op is still open. [INFERRED / UNCERTAIN: R-02]
- Players share goggle information by voice ("left wire is hot"). [ANALYSIS, from 06_gadgets_and_tools.md]
- N-Gage/DS: the Assault carries night and thermal vision (thermal shows lasers); the Hacker has no night vision, so an Assault-only panel that turns the lights off for 15 seconds gives the Hacker a short dark window. [ONE SOURCE: FW; role rule CONFIRMED - several sources: NG-TXT + FW]

#### 4A.6 Split-screen and platform visuals in co-op
- Split-screen is available on all consoles. VideoGamer found it tiresome because the game is about seeing around corners and the partner's screen gives information away; NWR found it worked better than expected on GameCube. [ONE SOURCE each]
- WorthPlaying notes the PS2 co-op maps are shrunk (it would trade lighting for geometry). [CONFIRMED - several sources: WorthPlaying + NWR on condensed GC levels] GC co-op is split into sub-sections with loads ("long, frequent loads"). [ONE SOURCE: NWR] A Reddit user calls GameCube co-op levels "extremely chopped up" and "half the experience" of Xbox. [ONE SOURCE: Reddit kw1j41]
- Split-screen OPSAT layout file `opsat_split.mgb` exists on Xbox. [ONE SOURCE: XB477]
- Modern PC co-op is locked at about 30-35 fps for sync; a widescreen fix breaks co-op. [CONFIRMED - several sources: Steam reviews, Reddit 1m3rm7z, 1htj7ha]

### 4B. WHOLE GAME

#### 4B.1 Lighting model and rendering tech
- **New lighting model** merging the light and material systems: lightmaps and vertex lighting are used only for low-level and distant light; most lights are per-pixel omni and spot lights. Examples: candlelight through paper doors, lighthouse beams/floodlights, fire, lightning, flares on wet and dry surfaces. Artists spent **three weeks** tuning attenuation and materials to remove a plastic look. [ONE SOURCE: CGW, Martin McEachern, Vol.28 Iss.3, Mar 2005]
- **Normal mapping, HDR, parallax** [CONFIRMED - several sources: Wikipedia, PC Gamer, CGW, bit-tech, TechEnclave]:
  - All objects are normal-mapped (Jeff Giles, assistant technical director); normal-mapped particles. [CGW]
  - The PC SM3.0 path adds HDR with a 16-bit floating-point buffer (search snippet: four-channel 16-bit floating point), tone mapping, high-quality soft shadows, hardware shadow mapping and parallax mapping; the SM3.0 path shows a wider dynamic range, a bigger glow around Sam and more bloom on the goggle glow; HDR gives no anti-aliasing. [bit-tech (Tim Smalley, 5 Aug 2005) + TechEnclave]
  - TechEnclave: candles flicker.
- **Engine work.** Ex-Nvidia programmer Dany (PC Gamer: "Danny") Lepage unlocked the Xbox shaders and normal maps. [CONFIRMED - several sources: PC Gamer (Hocking) + CGW (Lepage as lead programmer)] Graphics rebuilt over about eight months. [ONE SOURCE: documentary] Lead artist Pascal Beaulieu; co-op animation (three connected characters) was the hardest per lead animator Jacques Dussault. [ONE SOURCE: CGW]
- **Water as visual identity.** Reflections were chosen as the game's signature, the way shadow casting had been SC1's. Wet suits glisten, puddles shimmer, and wet surfaces use a second procedural normal map (material normal map plus a procedural water/raindrop normal map). Wet suit sheen in rain is not a visibility factor. [CONFIRMED - several sources: PC Gamer (Ferland) + CGW + Pocket-lint] Pocket-lint: lights bob in the wind, moonlight shimmers in puddles, rain is impressive. GamesFirst: wet stone reflections; Sam's shadow stretches on walls. Globe and Mail: obscured glass refraction.
- **Level-design diary:** maps already have normal and specular maps, reflective surfaces and "shadow lights" by beta. [ONE SOURCE: dev diary 4]

#### 4B.2 Darkness and readability
- **Near-dark levels.** Most levels are near-dark; this builds atmosphere but strains the eyes (Pocket-lint: on a CRT). Reviewers advise raising brightness (VideoGamer: Sam spends more time than ever in total darkness). [CONFIRMED - several sources: Pocket-lint, VideoGamer, PC Games user comment] A PC Games user comment: SC was always darker than realistic.
- Slashdot (Zonk, 18 Apr 2005): lighting gorgeous, but a pitch-black guarded bank feels contrived. [ONE SOURCE: Slashdot]
- GameRevolution: the lighting is the most sophisticated they had seen; GC lighting is less sophisticated than PC/Xbox. [ONE SOURCE: GameRevolution]
- **The meter overrides the image.** The stealth meter, not how dark the scene looks, decides visibility. This is a known readability gap: what players see and what the system computes can disagree. [ONE SOURCE: PRIMA] At the far left of the stealth meter the agent is effectively invisible; the more light, the further guards can see; in a brightly lit space any guard with line of sight notices at once. [CONFIRMED - several sources: PRIMA, XBM, PS2M]
- The PS2 options include "shadow calibration" (brightness calibration). [ONE SOURCE: PS2M]
- **Guards and light.** Searching guards use flashlights and flares, sometimes throwing them into dark areas; frightened guards fire wildly into shadows; guards notice shot lights. [CONFIRMED - several sources: FW, WP]
- **Night-vision tuning.** Special shaders brighten dark areas so that night vision is useful. [ONE SOURCE: CGW, Lepage]

#### 4B.3 Creative director comments on lighting and staging
- **Hocking's later view (FRVR, c.2025, podcast interview reported by Lewis White):** old-style baked lighting was clean and readable for stealth (safe versus dangerous); modern diffuse lighting and ambient occlusion make it hard to read what is safe; the light gauge is a backup; stealth lighting should be "directed" like theatre or stage lighting rather than realistic. [ONE SOURCE: FRVR]
- **Hocking's level-design diary (U4_t06, 4:26):** beta to master is tuning. Example: a guard whose slow patrol makes the player step into the doorway just as he rounds the corner is "a really bad setup"; the player must know in advance the guard is there; the fix is to flip which end of the spline patrol he starts on. Testers fire sticky cams onto a roof and whistle through the cam to lure guards, but the ceiling is too high for the gas range, so the team adjusts the geometry or the global gas range ("make the expected outcome happen"). [ONE SOURCE: dev diary 4]
- Hocking (Nintendo Power #190, Apr 2005, cited by Substack): "chaos theory" = small consequential actions (breaking a lock is fast but loud). [ONE SOURCE: Substack]
- CT's general goals (Hocking/Lepage, Globe and Mail): remove trial-and-error and "Game Over" gating, make low-level choices meaningful, add the sound/masking meter, rewrite the AI with navigation meshes. [ONE SOURCE: Globe and Mail]

#### 4B.4 GameCube and PS2 lighting changes
- **GameCube** [ONE SOURCE: NWR, Daniel Bloodworth, 27 Apr 2005]:
  - adds more artificial lights where the Xbox relies on moonlight;
  - recolours a grey staircase **bright yellow**;
  - reduces the EMF view to white boxes, against the Xbox bluish field with pulsating white electrical objects;
  - is missing bats;
  - i.e. readability lighting added on weaker hardware: readability was preserved by changing the level, not the meter.
- **PS2:** maps shrunk; WorthPlaying would trade lighting for geometry. [CONFIRMED - several sources: WorthPlaying + NWR]

#### 4B.5 Vision goggles as atmosphere
- Night, thermal and the new electromagnetic (EMF) mode (electronics shown white on a bluish field). CT also adds EEV, which co-op agents cannot use. [CONFIRMED - several sources: Fandom goggles page, NWR (EMF look), PRIMA co-op exceptions]
- Thermal and night-vision overlays slide over the HUD/view like a lens, as if through Fisher's eyes. [ONE SOURCE: GamesFirst]
- The three-dot (three-lens) goggle silhouette was designed to make the hero recognisable (SC1 segment of the documentary). [ONE SOURCE: documentary]
- The night-vision whine is remembered as iconic. [ONE SOURCE: Steam 227082455]

#### 4B.6 Set dressing and scene design
- The most memorable visual for the Globe and Mail's reviewer (29 Mar 2005) was a child's night-light carousel throwing animal shapes in a bombed apartment (single-player Seoul). [CONFIRMED - several sources: Globe and Mail + GameGrin (the surreal surviving night-light in a wall-less building)]
- Contextual scenes were collected as stick-figure "situation" ideas from the whole team, then built into levels. [ONE SOURCE: PC Gamer, Ferland]
- Java the chimp behind a window (co-op Chemical Bunker) is a remembered visual and character beat ("monkey behind a window", Steam 2019; video titles "Not the Monkey Window", "Monkey Lab!", "Monkey Island"). [CONFIRMED - several sources: Steam + multiple YouTube titles + PRIMA]

---

## 5. Reception of the audio and atmosphere

### 5A. CO-OP SPECIFIC
- **Voice as a weapon and a liability** is the most-praised co-op systems idea after the moves: guards hear headset chatter, so you whisper or deliberately lure. [CONFIRMED - several sources: TeamXbox (Rob Semsey, 9.8: Live/System Link with headset is best), Steam x4, GameSpot hands-on snippet] Reception counts: "proximity voice / guards hear you" praised by 3 critics (TeamXbox, GameSpot hands-on, GamesFirst preview); "voice heard by guards" mentioned in 4 Steam reviews. [ONE SOURCE: reception tallies]
- Community memory: the microphone feeding the guards' sound meter is "the most-loved systemic detail". [CONFIRMED - several sources: Reddit]
- Communication-heavy play praised: Pocket-lint says co-op feels like a real team effort; Steam reviewers say co-op "requires communication"; NWR: unscripted coordination teaches communication. [ONE SOURCE each]
- **Community favourite audio-adjacent memories:** "yelling at each other when someone got spotted"; shouting the Tomoe Nage's name; the cocky "Damn we're good" after a rescue; split-screen sleepovers with original Xbox wired mics, "some of the best laughs" of their lives. [CONFIRMED - several sources: Reddit 1g21m8q, ijtifz, 1megyet, 1df5iet, 18zgpgu, 1lw7uy0; ParagonMitchell and DeepVelocityOps comments]
- **Criticisms:** the silent controller in the downloads (missed voice) [CONFIRMED]; co-op maps brighter and smaller than solo [ONE SOURCE]; co-op/Versus graphics not upgraded [ONE SOURCE: GameRevolution]; split-screen leaks information [ONE SOURCE: VideoGamer]; no in-game voice on today's PC [CONFIRMED]; the live-wire bomb confusing without prompts [CONFIRMED].

### 5B. WHOLE GAME
**Awards** (verified via Wikipedia raw pages and award sites):
- **AIAS 9th Interactive Achievement Awards (Feb 2006):** CT was a finalist for *Outstanding Achievement in Sound Design*; God of War won. CT was also a finalist for Action/Adventure Game and Character Performance - Male. It was **not** a finalist for Original Musical Composition (nominees: God of War, Gun, Jade Empire, Kameo, Rise of the Kasai). [CONFIRMED - several sources: Wikipedia 9th IAA page + Wikipedia D.I.C.E. audio design page; CT article]
- **Not nominated:**
  - G.A.N.G. Awards 2006 (4th awards, for 2005 games): the winners page shows no CT. [ONE SOURCE: audiogang.org]
  - Spike VGA 2005 Best Original Score: nominees We Love Katamari (winner), Call of Duty 2, God of War, Indigo Prophecy, Perfect Dark Zero; CT appears only in Best Military Game and the fan vote. [ONE SOURCE: videogamecanon.com list]
  - BAFTA 2005 and 2006 (2nd and 3rd) games awards, audio and music categories. [CONFIRMED - several sources: Wikipedia 2nd and 3rd BAFTA pages, absent]
- No evidence found of an IGN or GameSpot "best sound/music of 2005" win; the IGN Xbox 2005 awards went largely to Jade Empire. [INFERRED / UNCERTAIN: search only]
- G-Phoria 2005: CT listed as a "multiple nominee", categories unknown. [ONE SOURCE: Game Developer news]

**Critics** (one short quote max per source):
- GameRevolution: clear, varied ambient effects; superb voice acting; a Tobin score "hip and catchy but also understated and mysterious"; lighting the most sophisticated seen.
- TeamXbox (via Wikipedia): the audio-visual presentation has "a major impact on how you play".
- Slashdot (Zonk): the score has "a modern vibe" and does not sound machine-made. (Slashdot's body did NOT mention voice/guards; an earlier search summary claiming it did was wrong.)
- VideoGamer: hard to see how the visuals and sound could fit the game better; sound "brilliant", best in 5.1.
- PC Games (DE): sound and music "perfekt"; Tobin's simple melodies over intricate rhythms are near-hypnotic; the atmosphere covers small design gaps. A PC Games user comment complains the PC co-op implementation is poor.
- WorthPlaying (PS2): gameplay "much more sound-oriented than ever before".
- Globe and Mail: the ambient effects (gunfire, AA fire, a golf commentator on a radio) are spot on.
- Tiny Mix Tapes: the album marks "an entirely new era of media" (also cited by Wikipedia).
- SquareEnixMusic: one of the most context-effective game soundtracks.
- Kotaku (2020): the tracks sound almost too busy, which produces the right tension.
- Sputnikmusic users: split; some call it tedious out of context.
- Maxim (via Wikipedia): stealth framed around the enemy picking up "your audio signature".
- Empire (David McComb): praises the light meter, sound indicator and ambient cover.
- Christian Answers (2006) review is listed among sources (no audio point recorded).
[ONE SOURCE each, see research note §4]

**Players (Steam).** Of 3,998 English Steam reviews (app 13570, scanned via the appreviews API on 17 Oct 2026; "Very Positive" 3,700 / 297), **270 mention music, soundtrack, atmosphere or ambience**. [ONE SOURCE: Steam corpus scan]
- Overwhelmingly positive about the Tobin score; some name it the best ("greatest") game soundtrack ever; one user opens the game just for the menu music.
- Repeated praise for the light-plus-sound stealth system and for ambient sound giving tactical information.
- Criticisms: the four in 2.2 (lingering ~1 minute, ambiguous cues, music masking barks, nagging barks plus pursuit music on Penthouse), plus PC effects not fading/echoing like Xbox (7812974) and some music being "stock" heard on Top Gear (16687618, uncertain).

---

## 6. Design lessons [ANALYSIS]

These are the researchers' transferable readings, not facts about the game. Evidence in brackets.

| # | Lesson | Evidence |
|---|---|---|
| 1 | **Music reports state, but every layer stands alone.** Stack intensity layers and let detection or alarms add them. Tie downward transitions to the real AI state with a short, defined tail, and never leave players guessing whether they were seen | Tobin's rule (PC Gamer); reviews describe the music rising on alert and falling back (TechEnclave, Hofstra); complaints about lingering and ambiguous cues (Steam) |
| 2 | **Silence is the default; music arrives.** Hold music until a placed trigger or a state change, and keep guards audible | Sound diary (music held back in the Bank); GamesFirst preview (quiet is the norm) |
| 3 | **The ambient noise floor is level design.** Show player noise against ambient noise, and author masking sources (fountains, machines, weather) where you want sneak windows; author quiet zones as danger | Noise meter; fountain placement; generators and radios (PC Games, TechCentral); storms and thunder (documentary, CGW, NWR) |
| 4 | **Couple systems.** One weather event should have several readable effects: patrol changes, reflectivity, noise cover, lightning exposure | Documentary; CGW |
| 5 | **Barks are UI.** Guards voice what they noticed, escalate audibly through stress stages and call to each other. Duck music under important dialogue | AI diary; documentary; Dev Game Club takeaway; GameGrin complaint about alert music masking a conversation |
| 6 | **Put the players' voices in the simulation, with a fallback.** Voice audible to the AI over a short, tunable radius (about 2 m default), switchable; whispering becomes a skill and shouting a lure. Automatic context lines and directional calls for players without voice. Relaxed sync timing when voice is absent | XBM; PRIMA; reception; community memory |
| 7 | **Tell players when ambient danger is not aimed at them** so a war soundscape can run at full intensity without false alarms | Seoul note |
| 8 | **Give each partner a distinct light signature** that reads in darkness, in vision modes, on split-screen and at a distance, and is not visible to enemies in the fiction | Red and blue lamps; "Spy Blue / Spy Red" |
| 9 | **Light must be readable and changeable.** Clean, directed lighting with the meter as backup; every space offers ways to make darkness; make what players see match the meter; on low-spec builds change the level's lighting rather than lose readability | Co-op routes (PRIMA); GameCube port (NWR); Hocking (FRVR); the meter-overrides-image gap (PRIMA) |
| 10 | **Telegraph threats before commitment** with audio (footsteps, barks) and staging | Hocking's level-design diary (re-staged patrol) |
| 11 | **Reuse can carry mood.** Solo stem sets on a shared common set kept co-op on-brand at low cost; one map ran on the common set plus ambience alone | Map settings files (R-21) |
| 12 | **Guidance has a voice, and losing it is felt.** Budget voiced guidance for every mission; text-only guidance is a degraded fallback, not an equal | Silent controller in both downloads (Steam threads, video comments) |
| 13 | **Shared-device sound and prompts.** The live-wire bomb was both the tensest and the most confusing beat; it needs explicit input prompts and a visible (and audible, as with the PS2 vibration cue) indication of which wire is live and how much time is left | Bomb help requests (6+ comments); AnandTech 2008 thread |
| 14 | **A cross-campaign radio beat is cheap and memorable.** One line of dialogue makes two campaigns feel like one world | Seoul radio crossover (FAN, EG, GameGrin, RYB) |
| 15 | **Audio as a channel for hidden state.** A warning sound before a cycling laser returns, a crackle from a disabled device, a voice line when a partner waits: sound tells the pair about state they cannot see | Chemical Bunker laser warning (PRIMA); OCP crackle (PRIMA); automatic lines (XBM) |

The derived Night Shift research docs turn these into rules: DESIGN_BIBLE pillar P5 "Sound is space" (music reports danger without lying); principles 13 #14 (barks report AI state; music never drowns them), #15 (players can change the light and the noise), #16 (real voices and a callout fallback), #32 (music reports state and arrives late), #33 (ambient sound is level design), #34 (partners identifiable in the dark and at a distance; test: tell the two characters apart at 20 m in the darkest area), #36 (guidance has a voice); DESIGN_BIBLE section 11 audio and atmosphere rules (silence default; state-driven score with short defined decay; duck under barks; ambient floor as terrain with a soundscape map; coupled weather); LEVEL_REVIEW_CHECKLIST K1-K6 and G3/G9; 14_translation_guide.md maps "Noise meter vs ambient marker" to "Noise vs Ambient", "Adaptive layered score" to "State-Driven Score", "Blue/red goggle lamps" to "Partner Beacon", "Voice audible to guards" to "Proximity Voice" (D-06) and the text-only controller to "Voiced Guidance Channel". Pattern P15 "Noise-mask zones" (08_level_design_patterns.md): areas where ambient noise (machines, fountains, rain, war, radios) lets players move faster or talk; quiet zones (generators off, tile floors) punish haste. [ANALYSIS - derived docs]

---

## 7. Gaps

| Ref | Gap | State |
|---|---|---|
| R-21 | Which music plays in the co-op menus | Open for menus; closed for missions (map settings files). Fan uploads -8Oio-dEv8M and PrKI5lpffwo not listened to |
| R-21 (PS2/GC) | Which music sets the PS2/GC co-op sub-levels load | No PS2/GC data available |
| R-22 | Whether partner-to-partner voice chat attenuates with in-game distance | Open. Only AI hearing is documented; no Xbox menu string; PC manual: sensitivity does not change partner volume |
| - | Exact layer count (3 vs 4), how the eight engine music states map to layers, and transition / decay timing | Open. Remix magazine "Under a Microscope" (Apr 2005), the Pixelsurgeon 2005 interview and the GameSpot Q&A are blocked or dead |
| - | Weather, time of day and palette for every co-op map | Open; no source |
| - | Lighting, noise and guard detail for Training, Nuclear Plant and UN HQ | Open (R-19, R-20) |
| - | Whether Nuclear Plant's turbine machinery masks noise | Open; PR claim only |
| - | Whether `Mus_Gen_SpyRoom` is Kyd's "Spy Room" cue; Kyd's share of `Mus_Common` | Open |
| - | What triggers the agents' "Damn we're good" line; who voices Agent One and Agent Two | Open |
| R-23 | Whether N-Gage/DS co-op radio lines are voiced; any handheld music facts | Open |
| - | PS2 co-op voice: whether any online co-op voice existed on PS2 | Open |
| - | How the PC "Say" text chat works in practice | Open |
| - | Co-op audio credits | Closed: co-op lead sound designer Alexandre Carlotti; music by Amon Tobin only (credits video). Other MobyGames audio names remain unverified |
| - | Whether the album's live band and orchestra credits are literal or partly a joke | Open |
| - | IGN/GameSpot 2005 year-end audio awards | Not verified either way |
| - | Ubisoft "Behind the Scenes: Sound Design" featurette (punciITHal8) and "Developer Diaries - Sound" (g0Jl6uVAcGE); bonus-disc clip S3_t02 | Not opened (YouTube blocked) / no speech, not identified |
| R-20 | UN HQ lit-window failure rule (lit windows) | Open; not in the game text |

---

## Sources used for this file

**Files in /home/user/docs**
- /home/user/docs/15_music_and_atmosphere.md
- /home/user/docs/research_notes/music_and_atmosphere.md
- /home/user/docs/research_notes/gap_closing_gamefiles.md (R-12, R-19, R-20, R-01, R-03, R-08, R-21, R-22, Seoul)
- /home/user/docs/research_notes/gap_closing_community.md (R-19, R-20, R-22, community memories, Steam native-sounds threads)
- /home/user/docs/03_coop_overview.md
- /home/user/docs/05_coop_moves_catalogue.md
- /home/user/docs/06_gadgets_and_tools.md
- /home/user/docs/08_level_design_patterns.md
- /home/user/docs/09_pacing_and_flow.md
- /home/user/docs/10_ai_detection_and_alarms.md
- /home/user/docs/11_wow_moments.md
- /home/user/docs/12_anti_patterns.md
- /home/user/docs/13_principles.md
- /home/user/docs/14_translation_guide.md
- /home/user/docs/README.md
- /home/user/docs/OPEN_QUESTIONS.md
- /home/user/docs/DESIGN_BIBLE.md
- /home/user/docs/LEVEL_REVIEW_CHECKLIST.md
- /home/user/docs/01_sources.md
- /home/user/docs/04_mission_breakdowns/seoul.md, train_station.md, chemical_bunker.md, un_headquarters.md, nuclear_plant.md, training.md, panama.md
- /home/user/docs/research_notes/mission_panama.md, mission_seoul.md, mission_chemical_bunker.md, mission_train_station.md, mission_nuclear_plant.md, mission_un_hq.md, mission_training.md, mission_ngage_ds.md
- /home/user/docs/research_notes/coop_gadgets_controls_comms.md, coop_moves.md, systems_rules.md, reception.md, dev_and_design_intent.md, platforms_versions.md, videos.md

**Primary game files and documents (archive.org)**
- https://archive.org/details/q-1-t-00_202406 (Limited Edition bonus-disc videos: U1_t03, U2_t04 sound diary, U3_t05, U4_t06, Q1_t00 documentary, S2_t01, V3/V4, R5_t09, Q4_t39, S3_t02)
- https://archive.org/details/tom-clancys-splinter-cell-chaos-theory_202601 (PC105: map `.ini` [MUSICFILES], localisation, `Data/Videos/Credits.bik`)
- https://archive.org/details/sc-3-xb-build-477-retail (XB477: `dynamicxbox.umd`, `LMaps/*.lin`, `PreGameMenus.int`)
- https://archive.org/details/og-xbox-dlcupdates (XBDLC; also https://archive.org/details/Original-Xbox-Live-Updates-and-DLC and https://archive.org/details/XbDLC2)
- https://archive.org/details/scct_20250728 (PCDVD: PC manual, readme 1.02, patch 1.05 readme)
- https://archive.org/details/xboxmanual_Splinter_Cell_3_Chaos_Theory (XBM pp.22-27)
- https://archive.org/details/ps2_Tom_Clancys_Splinter_Cell-_Chaos_Theory_USA (PS2M)
- https://archive.org/details/Tom_Clancys_Splinter_Cell_Chaos_Theory_Prima_Official_eGuide (PRIMA)
- https://archive.org/download/Nokia_N-Gage_Tom_Clancys_Splinter_Cell_Chaos_Theory_v1.0.240/ (NG-TXT)

**Web (music, sound, atmosphere)**
- https://en.wikipedia.org/w/index.php?title=Amon_Tobin&action=raw
- https://en.wikipedia.org/w/index.php?title=Jesper_Kyd&action=raw
- https://en.wikipedia.org/w/index.php?title=9th_Annual_Interactive_Achievement_Awards&action=raw (and the D.I.C.E. Award for Outstanding Achievement in Audio Design, 2nd and 3rd British Academy Games Awards pages)
- https://www.pcgamer.com/the-making-of-splinter-cell-chaos-theory/
- https://www.restart.run/articles/splinter-cell-chaos-theory-soundtrack-composer-interview
- https://cdm.link/music-that-changes-splinter-cell-permutative-music-and-games/
- https://tinymixtapes.com/music-review/amon-tobin-splinter-cell-chaos-theory
- https://squareenixmusic.com/reviews/george/splintercellsurround.shtml
- https://downloads.ninjatune.net/release/amon-tobin/chaos-theory
- https://ra.co/reviews/2668
- https://kotaku.com/splinter-cell-chaos-theory-s-soundtrack-was-perfectly-1845811151
- https://www.thestranger.com/?p=31025
- https://www.shacknews.com/article/35412/chaos-theory-music-interview
- https://www.gamedeveloper.com/press-release/acclaimed-ninja-tune-recording-artist-amon-tobin-composing-original-music-for-next-title-in-the-legendary-tom-clancy-s-splinter-cell-franchise
- https://gamesfirst.com/articles/2005/ubisoft-focus-tom-clancys-splinter-cell-chaos-theory/
- https://www.cgw.com/Publications/CGW/2005/Volume-28-Issue-3-March-2005-/Thriving-on-Chaos.aspx
- https://bit-tech.net/reviews/gaming/pc/scct_sm20_sm30/2/
- https://frvr.com/blog/news/splinter-cell-designer-says-one-of-the-difficulties-with-modern-stealth-games-is-realistic-lighting/
- https://api.discogs.com/releases/1618601 ; https://api.discogs.com/releases/555204 ; https://api.discogs.com/releases/3469512
- https://www.gamerevolution.com/?p=36141 ; https://www.gamerevolution.com/review/32392-splinter-cell058-chaos-theory-review-2
- https://www.videogamer.com/?p=167250
- https://worthplaying.com/article/2005/4/17/reviews/23920-ps2-review-splinter-cell-chaos-theory/
- https://www.theglobeandmail.com/technology/splinter-cell-chaos-theory/article1115954
- https://techenclave.com/threads/splinter-cell-chaos-theory-pc-review.4838/
- https://www.techcentral.ie/tom-clancys-splinter-cell-chaos-theory/
- https://efithorsjetsampatch.substack.com/p/tom-clancys-splinter-cell-chaos-theory
- https://thehofstrachronicle.com/?p=5856
- http://www.nintendoworldreport.com/review/4357/tom-clancys-splinter-cell-chaos-theory-gamecube
- https://www.empireonline.com/gaming/reviews/tom-clancy-splinter-cell-chaos-theory-review
- https://www.pocket-lint.com/review/68164-splinter-cell-chaos-theory-xbox
- https://www.pcgames.de/Tom-Clancys-Splinter-Cell-Chaos-Theory-Spiel-56218/Tests/Splinter-Cell-3-Chaos-Theory-362060/4/
- https://christiananswers.net/spotlight/games/2006/splinter_cell-chaos_theory.html
- https://games.slashdot.org/story/05/04/18/1439233/review-splinter-cell---chaos-theory
- https://www.koreajoongangdaily.com/lifestyle/game-mastertom-clancys-splinter-cell-chaos-theory/11127044
- https://sputnikmusic.com/album/21099/Amon-Tobin-Chaos-Theory---Splinter-Cell-3-Soundtrack/
- https://www.gamegrin.com/articles/splinter-cell-chaos-theory-diaries-part-two/ (to part-nine); https://www.gamegrin.com/articles/splinter-cell-chaos-theory-diaries-part-seven/
- https://www.devgameclub.com/blog/2026/6/17/dgc-ep-475-splinter-cell-chaos-theory-part-four
- https://www.audiogang.org/awards/2006-awards/
- https://videogamecanon.com/adventurelog/2005-spike-video-game-awards
- https://www.gamedeveloper.com/pc/g-phoria-2005-award-nominees-announced
- https://store.steampowered.com/appreviews/13570?json=1&filter=recent&language=english (Steam review IDs cited inline)
- https://archive.org/advancedsearch.php and https://archive.org/metadata/q-1-t-00_202406

**Search-snippet only (page blocked)**
- https://www.gamespot.com/articles/qanda-chaos-theory-composer-amon-tobin/1100-6117182/
- https://www.gamespot.com/articles/tom-clancys-splinter-cell-chaos-theory-co-op-hands-on-panama/1100-6119226/
- https://www.mobygames.com/game/20691/tom-clancys-splinter-cell-chaos-theory/credits/xbox/
- https://xisto.com/discuss/topic/9603-... (red/blue lights)
- https://www.gamespot.com/reviews/tom-clancys-splinter-cell-chaos-theory-review/1900-6121743/

**Community (voice, downloads, sentiment)**
- Steam discussions: https://steamcommunity.com/app/13570/discussions/0/133262738417485094/ ; https://steamcommunity.com/app/13570/discussions/0/828925849173270181/ ; https://steamcommunity.com/app/13570/discussions/0/45350245387206844/ ; https://steamcommunity.com/app/13570/discussions/0/616199347862335006/
- Reddit (via https://arctic-shift.photon-reddit.com/api/posts/search): https://www.reddit.com/r/patientgamers/comments/mngqa0/ ; https://www.reddit.com/r/gaming/comments/vpwdry/ ; https://www.reddit.com/r/Splintercell/comments/1e9pwjx/ ; https://www.reddit.com/r/Splintercell/comments/1g21m8q/ ; https://www.reddit.com/r/Splintercell/comments/1rz5d99/ ; https://www.reddit.com/r/Splintercell/comments/ijtifz/ ; https://www.reddit.com/r/Splintercell/comments/1fiyo7i/ ; https://www.reddit.com/r/Splintercell/comments/1megyet/ ; https://www.reddit.com/r/Splintercell/comments/1ouonhz/ ; https://www.reddit.com/r/Splintercell/comments/v5jncz/ ; https://www.reddit.com/r/Splintercell/comments/1m8z5gm/ ; https://www.reddit.com/r/Splintercell/comments/1df5iet/ ; https://www.reddit.com/r/Splintercell/comments/18zgpgu/ ; https://www.reddit.com/r/Splintercell/comments/1lw7uy0/ ; https://www.reddit.com/r/Splintercell/comments/1utzrr6/ ; https://www.reddit.com/r/Splintercell/comments/kw1j41/ ; https://www.reddit.com/r/Splintercell/comments/1m3rm7z/ ; https://www.reddit.com/r/Splintercell/comments/1htj7ha/
- AnandTech 2008: https://forums.anandtech.com/threads/chaos-theory-co-op-mp-question-regarding-2-person-activated-objects.142480/
- jeuxvideo.com (search summaries): https://www.jeuxvideo.com/forums/1-9456-991848-1-0-1-0-0.htm

**YouTube (titles, descriptions, comments; not watched)**
- https://www.youtube.com/watch?v=-8Oio-dEv8M ; https://www.youtube.com/watch?v=PrKI5lpffwo ; https://www.youtube.com/watch?v=jp6EFfv7eWM ; https://www.youtube.com/watch?v=dZJVpwrJ1vY ; https://www.youtube.com/watch?v=vL-p3wBW_t4 ; https://www.youtube.com/watch?v=hWc8_DmVHkA ; https://www.youtube.com/watch?v=J_8IfpHoW8M ; https://www.youtube.com/watch?v=inb4WU0JKEM ; https://www.youtube.com/watch?v=tf6Is6pj1zk ; https://www.youtube.com/watch?v=lsxhy_9iijg ; https://www.youtube.com/watch?v=sGQ_DITqH8A
- Diaries and featurettes: https://www.youtube.com/watch?v=punciITHal8 ; https://www.youtube.com/watch?v=g0Jl6uVAcGE ; https://www.youtube.com/watch?v=vp3tET9xVKk ; https://www.youtube.com/watch?v=i8Yf_REi0ko ; https://www.youtube.com/watch?v=yxzr8K95RQ0 ; https://www.youtube.com/watch?v=d2vBjrRKs3g ; https://www.youtube.com/watch?v=nN1YVwO-3hQ
- Comments cited: https://www.youtube.com/watch?v=jry663Tx5bg ; https://www.youtube.com/watch?v=phfqPfdFZdQ ; https://www.youtube.com/watch?v=8FiRUvq86sg ; https://www.youtube.com/watch?v=LY9-0Dk-YHk ; https://www.youtube.com/watch?v=ge7dEnjp6MU ; https://www.youtube.com/watch?v=NrooRPC9cog ; https://www.youtube.com/watch?v=xjynpfObTLs ; https://www.youtube.com/watch?v=SwxTLoWn5e4 ; https://www.youtube.com/watch?v=4GtVpbf1xAw ; https://www.youtube.com/watch?v=oozYweL4ASM ; https://www.youtube.com/watch?v=gOn-T6LlNHk (co-op speedrun with game audio replaced by music)
