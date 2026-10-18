# 08 - Reception and design findings

This file holds the Chaos Theory (CT) co-op research findings that are not about the levels, moves, rules, kit, HUD or audio themselves (01-07). It covers:

1. Reception by critics (every review read, scores, Metacritic numbers and blurb counts).
2. Reception by players (Steam corpus counts and themes, Reddit and YouTube community memories, what made it special, criticisms, later lists and retrospectives).
3. Development and design intent (studios, co-op team credits, interviews, creative director and lead programmer statements, bonus-disc developer diaries, E3 2004, what changed before release, DLC authorship).
4. Wow moments (named moments, the W1-W11 taxonomy, the recipe, misfires, per-mission candidates).
5. Anti-patterns and frustrations (A1-A21 with their CT evidence, B1-B20, C1-C12, the red-flag list, per-mission frustrations).
6. Level-design patterns (P1-P25 with CT instances and frequency).
7. Objective types (taxonomy with CT examples, chaining, dependency, failure).
8. Pacing and flow (length and density tables, beat and set-piece spacing, mission shapes, signposting, per-mission pacing curves, speedrun times).
9. The video catalogue (every catalogued video, by mission and type, with the top-10 viewing order).

**Platform key** (used throughout):
- **Version 1 = Xbox/PC.** Training, Panama, Seoul ("Seoul 3"), Chemical Bunker, Train Station, plus the two free downloads Nuclear Plant and UN Headquarters.
- **Version 2 = PS2/GameCube (PS2/GC).** Team Training plus the four story missions split into sub-levels (order Seoul, Chemical Bunker, Train Station, Panama).
- **N-Gage/DS.** A separate five-part Gameloft co-op campaign (Rooftops, Breakdown, Corruption, Prison Rescue, Escape).

**Confidence marks** (see 00-index.md for the source-code legend): [CONFIRMED - several sources: ...], [ONE SOURCE: ...], [INFERRED / UNCERTAIN: ...], [UNKNOWN - see 06-open-questions.md, R-xx], [ANALYSIS] (the researchers' interpretation, not a fact about the game). Where a later gap-closing pass (primary game files GF/PC105/XB477/XBDLC/PCDVD, or the community pass RD/YT/STM) corrected an earlier claim, the corrected value is given as the fact and the superseded claim is kept as a note.

**Source shorthand used in this file** (in addition to the 00-index.md codes): EG = Elder-Geek 2009 co-op review (PC/Steam); EUR = Eurogamer PC review; TX = TeamXbox review; NWR = Nintendo World Report; GF = GamesFirst preview (Feb 2005) where it appears in older notes, or the primary game files in the gap pass (the context says which); G&M = Globe and Mail; CCO = Classic Co-op; RYB = Jason Rybka About.com Seoul walkthrough; JV = jeuxvideo.com forum; NEO = Neoseeker excerpts; AT = AnandTech forum 2008; RD = Reddit via the Arctic Shift archive API; YT = YouTube descriptions, chapters and comments via the youtubei endpoint; STM = Steam discussions; FAN / FW = Fandom wiki (EN); FAN RU / RUW = Russian Fandom wiki; PRIMA = Prima Official eGuide; XBM = Xbox manual; PS2M = PS2 manual; MN = Major Nelson (official Xbox site).

**Method note.** No video was watched. About 235 videos were catalogued from titles, descriptions, chapters and comments; transcripts were blocked. Source text was paraphrased; quotes are under 15 words, at most one per source. [CONFIRMED - several sources: reception.md, videos.md, gap_closing_community.md method notes]

---

## 1. Reception: critics

### 1.1 Headline findings

- Critics in 2005 overwhelmingly praised the co-op as new, distinctive, and one of the main reasons the Xbox/PC versions scored in the 90s. [CONFIRMED - several sources: reception.md critic table]
- The near-universal criticism was length: four launch missions plus a training mission, finishable in an evening or two (estimates of 4-6 hours). [CONFIRMED - several sources: about 12 outlets]
- The main dissent came from Eurogamer (PC), which found the co-op levels empty, hard to coordinate in, and "tacked on". GameSpot reportedly found the authored two-player moves forced. [ONE SOURCE: each - EUR; GameSpot search snippet]
- Among players today, the co-op is remembered as among the best stealth co-op ever made, often ranked above Conviction and Blacklist co-op. The dominant modern complaint is that official online is dead, so PC players must use VPN/virtual-LAN workarounds, which come with a 30-35 fps network cap and desync. [CONFIRMED - several sources: Steam corpus, Steam threads, Reddit, lists]
- Per mission, reviewers put each Xbox/PC mission at roughly 60-90 minutes. [ONE SOURCE: TX] The whole campaign is about 4-6 hours. [CONFIRMED - several sources: G&M review, Penny Arcade, others] A complete co-op campaign upload runs over 7 hours (DeepVelocityOps, 7:22:04). Shortness was the most common criticism: about 12 of roughly 27 professional pieces with co-op text mention it. [CONFIRMED - several sources: reception.md count]

### 1.2 Aggregate scores, awards and records (whole game, for context)

- **Metacritic (whole game):** Xbox 94, PC 92, PS2 87, GameCube 81 (Wikipedia; Metacritic). [CONFIRMED - several sources: Wikipedia, Metacritic]
- **Metacritic Xbox critic list** (backend API, 70 reviews): 19 of 70 blurbs reference co-op or multiplayer, and 11 name co-op explicitly. [ONE SOURCE: Metacritic backend API]
- **Steam app 13570:** 5,866 reviews (all languages), 93% positive, "Very Positive" (17 Oct 2026). [ONE SOURCE: Steam API]
- **Headline numbers as summarised in 03 §9:** Metacritic Xbox 94; 19 of 70 Xbox critic blurbs mention co-op or multiplayer; of 236 English Steam reviews mentioning co-op, about 93% are positive; later lists rank it the best stealth co-op in the series. [CONFIRMED - several sources: reception.md]
- **Official Xbox Magazine (US)** named it its Xbox Game of the Year. [ONE SOURCE: Wikipedia]
- **PC Gamer US:** finalist for PC Gamer's Best Multiplayer 2005 (lost to Battlefield 2). [ONE SOURCE: Wikipedia]
- **AIAS (whole game, audio):** finalist for Outstanding Achievement in Sound Design at the February 2006 Interactive Achievement Awards; God of War won. Not nominated for music at that event, or in the audio categories of the 2006 G.A.N.G. awards, Spike 2005 Best Original Score, or BAFTA 2005/2006. [CONFIRMED - several sources: for the AIAS finalist and the AIAS-music/BAFTA absence; others ONE SOURCE] (Audio reception in full: see 07-audio-and-atmosphere.md.)
- **Guinness World Records:** lists CT as the first video game with a fully stealth-based co-op mode (record 549102). [ONE SOURCE: guinnessworldrecords.com]
- **Handheld scores (N-Gage/DS, Gameloft):** GameSpot N-Gage 8.6, DS 5.6; GameSpy N-Gage 4.5/5, DS 2.5/5. [ONE SOURCE: Wikipedia CT article, cached]

### 1.3 Professional reviews 2005: co-op comments (Xbox/PC/PS2/GC)

Every review whose co-op text was reached, with platform and score. "Snippet" means only a search-engine summary or a Metacritic blurb was seen.

| Outlet (platform, score) | Co-op praise | Co-op criticism | Confidence |
|---|---|---|---|
| IGN (Xbox 9.6; PC 96 MC; GC 85 MC) | GC blurb: GC still worth it despite no Versus. Full co-op text not retrieved. | - | [INFERRED / UNCERTAIN: review body not reached] |
| GameSpot (Xbox 8.6, Greg Kasavin, 28 Mar 2005; PS2 7.1; GC 6.7) | Via search summaries only: two spies doing what one can't is "endearing"; Seoul is the best co-op mission. | Only 4 missions + training; special moves tied to fixed spots feel forced; otherwise plays like the campaign with two people; GC co-op split-screen only. | [INFERRED / UNCERTAIN: snippets only, page 403] |
| GameSpy (Xbox 5/5, Will Tuttle, 24 Mar 2005) | Co-op is the single biggest improvement. Quote: "the most satisfying experience I've ever had on Live". | - | [ONE SOURCE: Metacritic blurb] |
| 1UP (Xbox A / 100, Shawn Elliott; PC 100; GC 85) | PC: the relaxed pace of co-op suits a gamepad better than keyboard and mouse. | - | [ONE SOURCE: Metacritic blurbs] |
| Official Xbox Magazine (US 9.9 / MC 99) | Praised the seamless integration of co-op over Live. Named its Xbox GOTY. | - | [ONE SOURCE: MC blurb; GOTY via Wikipedia] |
| GamePro (Xbox 4.5/5) | Said the new co-op "revolutionizes the multiplayer mode"; two spies literally have to work together. | - | [ONE SOURCE: MC blurb] |
| G4 / X-Play (100) | Co-op makes the game close to an essential buy. | - | [ONE SOURCE: MC blurb] |
| Game Informer (9.75; PS2 9.25) | Search summary says co-op "finds a new dynamic". PS2: play on Xbox if you can. | - | [INFERRED / UNCERTAIN: snippet] |
| PSM (PS2, 95) | Nothing else like the co-op; challenging, gratifying, revolutionary. | - | [ONE SOURCE: MC blurb] |
| Edge (8/10), games(TM) (8/10) | games(TM): the series is wearing thin but multiplayer keeps improving. A Retro Gamer recap says games(TM) liked the co-op level layouts. | - | [INFERRED / UNCERTAIN: blurb/snippet] |
| XBM (UK, 9/10) | Called co-op teamwork at its best while seeing single-player as a small step. | - | [ONE SOURCE: Retro Gamer reprint, search snippet] |
| PC Gamer US (91%) | Finalist for PC Gamer's Best Multiplayer 2005 (lost to Battlefield 2). | - | [ONE SOURCE: Wikipedia]; co-op text not found |
| GameTrailers (9.5) | - | - | Review text not found |
| TeamXbox (Xbox, Rob Semsey, 9.8; mirrored on GameSpy PlanetRainbowSix) | Called co-op "just delicious" and arguably the best part of the game. Live/System Link with headset is best. Guards react to voice volume, which can be used to lure them. Moves are one-button. Coordinated multi-kills hook you. | Short: missions 60-90 min, done in a night. Elite mode is just a non-lethal replay. | [ONE SOURCE: TX] |
| Eurogamer (PC 8/10, Kristan Reed, 8 Apr 2005) | Liked Boost, Human Ladder, "Long Jump" (throwing a partner into an NPC), and above all the Hangover rope-dangle neck-break. | Quality depends on your partner. Much time spent wandering and hunting for each other with no map. Feels tacked on. Only one of four levels worthwhile. Levels feel empty, so you drift back to Versus. | [ONE SOURCE: EUR] |
| GameRevolution (Xbox A-, GC B; 5 Apr 2005) | Expected a "nifty little co-op feature" and got hooked on co-op ambushes. Offline multiplayer filled a gap in the series. Listed moves plus the adrenaline heal. | Only 4 levels. Co-op/Versus didn't get the single-player graphics upgrade. | [ONE SOURCE: GameRevolution] |
| Globe and Mail (29 Mar 2005) | Smart collaborative actions; brilliant mode. | Short, only four levels, 5-6 hours. Easier than single-player because two spies can attack guard pairs at once. | [ONE SOURCE: G&M] |
| VideoGamer (Keza MacDonald) | Essentially a whole other game. Nothing like it on Live yet. | Split-screen is tiresome because the game is about seeing around corners. | [ONE SOURCE: VideoGamer] |
| WorthPlaying Xbox/PC (Thomas Wilde, 28 Mar 2005) | Great fun online and offline. | Four stages isn't enough. AI omniscience about gunfire affects co-op too. | [ONE SOURCE: WorthPlaying] |
| WorthPlaying PS2 (8.4, 17 Apr 2005) | Calls the co-op fantastic and a separate experience. | PS2 co-op stages cut down from the already-shrunken PS2 maps. | [ONE SOURCE: WorthPlaying] |
| Nintendo World Report GC (Daniel Bloodworth, 27 Apr 2005) | Split-screen works better than expected. Unscripted coordination (one distracts, one flanks) teaches communication. General co-op praise focuses on acrobatic moves "like Chinese acrobats", throwing your partner, and the camera-jam run. | Long, frequent loads (through the menus and between sections). Only 4 missions. Less exciting for series masters. | [ONE SOURCE: NWR] |
| Pocket-lint (Xbox, 19 May 2005) | Moves make it a real team event rather than two solo players sharing a screen. | - | [ONE SOURCE: Pocket-lint] |
| TechCentral.ie (90%), Daily Cardinal (student paper, Apr 2005) | Parallel missions with two-specialist obstacles; online co-op is "another cake entirely". Daily Cardinal: general teamwork only. | Shorter than single-player. | [ONE SOURCE: each] |
| Metacritic minor outlets (AceGamez 100, XGP 100, Xbox Solution 98, Game Over Online 92, Inside Gamer 90) | One-of-a-kind; three games in one; well-designed online co-op; could make it a GOTY contender. | Pelit 91: needs more missions. GamerFeed 90: docked partly for too few co-op maps. | [ONE SOURCE: each] |
| Penny Arcade (Tycho news post, 27 Jul 2005) | Co-op challenges are about communication rather than reflexes. Could carry its own game. | Story ends abruptly. 4 missions, about 4 hours. Few players had tried it. Two maps would arrive within weeks. | [ONE SOURCE: Penny Arcade] |

Other 2005 pieces read in full (co-op content minor or audio-focused): PC Games (DE), Slashdot, TechEnclave, GameGrin play diaries (2017), Computer Graphics World (Mar 2005), bit-tech, Kotaku, CDM, Tiny Mix Tapes, SquareEnixMusic (soundtrack review). Their audio and visual remarks are in 07-audio-and-atmosphere.md. Two items from them touch co-op: GameRevolution notes co-op and Versus did not get the full solo graphics upgrade [ONE SOURCE: GameRevolution]; GameGrin diary part 7 records Lambert telling the solo hero that the "splinter cells in training" lost their target, the SP/co-op crossover [ONE SOURCE: GameGrin diary pt 7].

**Not reached:** full IGN, GameSpot, GameSpy, 1UP, OXM, PC Gamer, GamePro, Game Informer, X-Play and GameTrailers review bodies (403, unknown URLs, or reader blocked). Their co-op comments here are Metacritic blurbs or search snippets only. Edge's co-op comments were not found. [UNKNOWN - see 06-open-questions.md]

**Previews (pre-release, Xbox/PC):**
- GamesFirst (Feb 2005): four co-op levels promised, about 10 new co-op-specific moves (human ladder, hand boost, tandem rappel, Tomoe Nage throw), proximity voice that guards can hear; whistling into the headset can attract a guard without a button press; PS2 would lose online but keep split-screen co-op; GameCube would ship without Versus; quiet with echoing voices and footsteps is the norm and the game does not snap to a chase track when spotted. [ONE SOURCE: GamesFirst preview, for each detail]
- GameSpot "First Look": five missions including a tutorial; more than 100 people in Montreal plus about 50 in Annecy. [ONE SOURCE: search summary only, page 403]
- GameSpot E3 2004 impressions and a GameSpot co-op hands-on of Panama (search excerpts only; the hands-on mentions guards hearing headset speech). [INFERRED / UNCERTAIN: snippets only]

### 1.4 Critic themes, counted across the ~27 professional pieces with co-op text

| Theme | Count (approx.) | Examples |
|---|---|---|
| Co-op praised overall or called a highlight | ~24 | GameSpy, OXM, GamePro, TeamXbox, PSM, G4, AceGamez... |
| Too short / too few missions | ~12 | GameRevolution x2, Globe, WorthPlaying, NWR, TeamXbox, Eurogamer, Pelit, GamerFeed, Penny Arcade, GameSpot*, VideoGamer (notes only four) |
| Co-op is the biggest new value ("three games in one") | ~8 | GameSpy, AceGamez, XGP, G4, GamePro, OXM, Game Over Online, Penny Arcade |
| Proximity voice / guards hear you praised | 3 | TeamXbox, GameSpot hands-on*, GamesFirst (preview) |
| Split-screen weaker than Live/link | 2 | VideoGamer, TeamXbox |
| Moves feel authored, scripted or forced | 2-3 | GameSpot*, Eurogamer (partially) |
| Coordination / navigation friction | 2 | Eurogamer (no map), NWR (conflicting plans get you shot) |
| Easier than single-player | 1 | Globe and Mail |
| PS2/GC co-op downgraded (cut levels, loads, no online) | 4 | WorthPlaying PS2, NWR, GameSpot GC*, GameRevolution GC |

(* = search-snippet only.) [ONE SOURCE: reception.md count; counts approximate]

### 1.5 Platform-specific critic views

- **Xbox:** critics' preferred way to play is Xbox Live or System Link with headsets. [ONE SOURCE: TX] OXM praised the seamless Live integration; GameSpy called it the most satisfying Live experience. [ONE SOURCE: each, MC blurbs]
- **PC:** 1UP said the relaxed pace suits a gamepad better than keyboard and mouse [ONE SOURCE: MC blurb]; Eurogamer PC was the main dissent [ONE SOURCE: EUR]; Elder-Geek 2009 (Steam re-release) called it an expansion-sized co-op that plays like an expansion of the main game, but with no checkpoints and minor glitches (guards tripping over each other) [ONE SOURCE: EG].
  - Correction (R-07 closed): the game files show the Xbox and PC pause menus have Quick Save, Save and Load in co-op; saving waits for the partner; a save reloads only with the same teammate. So EG's "no checkpoints" means no automatic checkpoints, not no saving. [CONFIRMED - several sources: Xbox build + PC 1.05 menu text + speedrun.com rules allowing quick save/load] Earlier note: systems_rules.md had flagged EG's claim as partly conflicting with the Xbox manual's session quick save [INFERRED / UNCERTAIN at the time].
- **PS2:** WorthPlaying PS2 says the co-op stages are cut down from the already-shrunken PS2 maps; Game Informer PS2 says play on Xbox if you can; PSM (95) calls it revolutionary. [ONE SOURCE: each]
- **GameCube:** NWR found split-screen better than expected but loads long and frequent; GameRevolution GC (B) and GameSpot GC (6.7, co-op split-screen only); IGN GC blurb says still worth it despite no Versus; Classic Co-op notes GC co-op is shorter missions on two discs with no mid-mission save. [ONE SOURCE: each] A Reddit user calls GameCube co-op levels "extremely chopped up" and "half the experience" of Xbox. [ONE SOURCE: RD kw1j41]
- **Readability on GameCube:** the GC build adds artificial lights where the Xbox relies on moonlight, recolours a grey staircase yellow and simplifies a vision mode, so readability was kept by changing the level, not the meter. [ONE SOURCE: NWR]

### 1.6 Handheld co-op reception (N-Gage/DS only)

- GamesRadar (DS): counts the five original co-op missions plus Spies vs Mercs as a highlight worth trying; criticises the return to checkpoints and the three-strike alarm rule across the game. [ONE SOURCE: GamesRadar for the praise; the checkpoint/three-alarm criticism CONFIRMED - several sources: GamesRadar + FW, for the game generally]
- IGN (DS, Craig Harris, 28 Jun 2005): co-op is "fine" because both players share the same third-person control scheme; Versus is close to broken (mercs in first person with stylus aiming). IGN also says the DS design is based on Gameloft's N-Gage version from a few months earlier. [ONE SOURCE: IGN DS]
- Pocket Gamer (DS, Jon Jordan, 1 Jul 2005): the multiplayer is well designed; co-op is one unarmed Hacker guarded by the other player; overall the game is called a near-disaster for control/tech reasons. [ONE SOURCE: Pocket Gamer] (This clashes with FW, which gives the Hacker an unlimited sticky shocker; reconciled as "Hacker has no lethal weapon" [INFERRED / UNCERTAIN: exact wording].)
- NWR (DS, Daniel Bloodworth, 29 Jun 2005): could not test co-op (only one copy); doubts players will find a partner who owns the game. [ONE SOURCE: NWR DS]
- Gameswelt (DS): calls the co-op "bonus missions" and notes everyone needs their own cartridge. [ONE SOURCE: Gameswelt]
- Empire (DS): calls the multiplayer modes disappointing, without detail. [ONE SOURCE: Empire]
- Gaming Target (N-Gage, Matt Swider, 4 Aug 2005): describes the co-op roles; regrets that co-op works only over local Bluetooth, not N-Gage Arena, so finding a partner is the problem. [ONE SOURCE: Gaming Target]
- multiplayer.it (N-Gage): calls the two Bluetooth modes bold and interesting. [ONE SOURCE: multiplayer.it]
- Recurring frustration across both handhelds: finding a second player with the same game and hardware nearby. [CONFIRMED - several sources: NWR + Gaming Target + Gameswelt]
- No review describes a specific co-op mission moment. [UNKNOWN - see 06-open-questions.md, R-23]
- 3DS remake (Splinter Cell 3D, 2011, based on the PS2/GC build): no multiplayer modes; a reviewer (GamingXP) called missing multiplayer its biggest drawback. [ONE SOURCE: FW citing GamingXP]

---

## 2. Reception: players and community

### 2.1 Steam review corpus (PC, app 13570)

- Full English review corpus pulled 17 Oct 2026: **3,996 reviews**. (The music pass scanned the same corpus as 3,998 English reviews; the two scans were taken at slightly different times.) [ONE SOURCE: Steam API]
- **236 English reviews mention co-op.** About 93% of those are thumbs-up (219).
- Keyword-coded counts below are approximate (regex plus a manual read of all 236 snippets). Categories overlap. Treat them as indicative, not exact ("glitch" may not refer to co-op).

| Theme | Approx. reviews |
|---|---|
| Praise for the co-op (great/best/amazing/blast, etc.) | 84 |
| Online dead / needs VPN or LAN workaround | 74 |
| Set-up described as a pain/hassle/tweaking | 27 |
| Named workaround tools (Radmin, Hamachi, ZeroTier, Tunngle, Evolve) | 16 |
| Negative reviews citing co-op (mostly "bought it for co-op, couldn't play online") | 17 |
| Specific co-op moves named | 22 |
| Mentions Conviction / Blacklist / Double Agent (mostly series-wide comparisons) | 28 |
| Separate/parallel co-op story noted | 9 |
| Nostalgia with brother/dad/wife/cousin/best friend | 9 |
| FPS cap / desync complaints | 7 |
| Too short / want more co-op missions | 5 |
| Voice heard by guards mentioned | 4 |

- **Representative positions (paraphrased):** "best co-op game ever / best stealth co-op" one-liners (dozens). Co-op said to be even better than the campaign but short. Played as a kid with a father or brother. The co-op is worth the purchase alone. Ubisoft is blamed for dropping online support. One Steam quote kept: "everytime i try to play co-op i need to temporarily become a systems network engineer". [ONE SOURCE: Steam corpus]
- **Music and atmosphere in the same corpus:** of 3,998 English Steam reviews, 270 mention music, soundtrack or atmosphere; praise for the score dominates (see 07-audio-and-atmosphere.md). [ONE SOURCE: Steam corpus scan]
- Steam store "Single-player" feature tag only; the store says multiplayer and co-op are no longer functional, but LAN co-op still works via VPN. [CONFIRMED - several sources: Steam store + several Steam threads]

### 2.2 Steam discussions (PC)

- The co-op search shows mostly LFG posts ("anyone wanna play co-op") and LAN/Tunngle/Radmin set-up threads. [ONE SOURCE: Steam discussion search]
- "Splinter Cell games, ranked": CT is the pinnacle, with about eight big purpose-built co-op levels; Double Agent's (Xbox) co-op felt tacked on. [ONE SOURCE: Steam thread]
- "SC:CT coop" (2022): co-op OCP behaves differently from Sam's; the red agent has a more lethal loadout than the blue host; some moves exist only in co-op. [ONE SOURCE: Steam thread] (Loadout asymmetry CONFIRMED - several sources: PRIMA + Steam; see 04-kit.md.)
- Blacklist forum threads: CT has "one of the best Coop Modes"; CT, Conviction and Blacklist co-op all complement their single-player stories; Conviction co-op is nice but partners are hard to find. [ONE SOURCE: Steam Blacklist forum, app 235600]
- Difficulty: Steam posters disagree on whether difficulty changes perception (one says it only scales damage; another says some noises ignored on Normal are heard on Expert). [INFERRED / UNCERTAIN: R-10] [UNKNOWN - see 06-open-questions.md, R-10]
- Two later gap-pass threads: Lambert has no voice in either download mission on PC (missions never shipped with spoken Lambert lines); enabling "Use native sounds" made the info screen vanish and killed ambient and enemy voice on these two maps (matching the patch readme warning). [CONFIRMED - several sources: Steam threads 828925849173270181 + 45350245387206844 + YouTube comments]
- A 2017 Steam thread lists the PC co-op map files launchable from a batch file (`00_Training_COOP`, `01_Panama`, `02_seoulthree`, `03_ChemBunker`, `04_GCS`, `05_NuclearPlant`, `07_UNhq`); launched this way they behave like test builds (lots of ammo, no dialogue) and cannot be completed solo without cheats. [ONE SOURCE: Steam discussion 133262738417485094] (See 3.4 below for the missing slot 06.)

### 2.3 Reddit and YouTube comments: what the community says made it special

Read through the Arctic Shift archive API (r/Splintercell, r/patientgamers, r/gaming) and YouTube comments. Paraphrased; counts are rough. Thread pages: https://www.reddit.com/r/<sub>/comments/<id>/.

1. **The co-op needed both players.** The most repeated praise: you physically need each other to climb into vents, kill lights and cameras, or open doors in sync, so pairs stay close and improvise. Several contrast this with Conviction/Blacklist co-op, which they call single-player mechanics with a second player. [CONFIRMED - several sources: RD 1g21m8q (several commenters), 99qjfn, 1rz5d99, 1m8z5gm]
2. **Moves as physical comedy and bonding.** The Tomoe Nage throw is the signature memory ("dispatch an idiot by throwing your idiot"; shouting its name); boosts, back-climbs and inverted rappel are remembered fondly; one judo player says the throw and the climb-over-partner move are realistic. [CONFIRMED - several sources: RD 1g21m8q, ijtifz, 1djaago, 1s6ylts]
3. **Voice chat inside the stealth simulation.** Two Reddit commenters remember that the microphone voice registered on the in-game sound meter, so guards could hear you talking at full volume, and that you could deliberately make noise into the mic to attract or distract guards. This is the most-praised systemic detail in community memory. [CONFIRMED - several sources: RD mngqa0 (2 commenters), vpwdry, 1e9pwjx] Players repeat that guards can hear you through voice chat if you talk too loudly; on today's PC the in-game voice option is greyed out, so players use Discord. [CONFIRMED - several sources: RD vpwdry, 1e9pwjx] Partner-to-partner distance falloff is never mentioned. [UNKNOWN - see 06-open-questions.md, R-22]
4. **Failure is funny.** Repeated stories: a partner misjudges a zip-line, drops in front of a guard, the other clears the room and revives him, then the agents' "Damn we're good" line plays; doors slammed in a partner's face; ragdolls; failing the missile disarm and everyone flying; deliberately goofing with guards. Players say most of the fun is messing up and improvising. [CONFIRMED - several sources: RD 1megyet, 1ouonhz, PS2/ParagonMitchell comments, 6lzq8e]
5. **Shared-screen and family memories.** Large numbers of comments about playing with a brother, sister, dad or best friend, split-screen at sleepovers, original Xbox with wired mics; some say it is the source of "some of the best laughs" of their life. [CONFIRMED - several sources: dozens of comments across ParagonMitchell, DeepVelocityOps, RD 1df5iet, 18zgpgu, 1lw7uy0]
6. **Communication without words.** One player finished the hardest difficulty with a stranger without mics, by miming; another played with Korean players and used jumps and visual cues; another says coordinating moves with a stranger who spoke another language was both infuriating and the most satisfying thing he did online. [CONFIRMED - several sources: 3 independent YouTube comments]
7. **Agent One and Two as blank slates with cocky lines** ("Damn, we're good"; the "we're the first" exchange about other Splinter Cells), nicknamed "Bob and Steve" after G4 X-Play's machinima. Some wish they had more story and dialogue; the campaign "felt more like mission packs". [CONFIRMED - several sources: RD 1g21m8q, 1rz5d99, ijtifz, 1fiyo7i]
8. **Simultaneous takedowns.** Players love dropping on or shooting two guards at the exact same moment; it is hard because if one fires early the other guard reacts. [ONE SOURCE: RD 1df5iet]

**Favourite missions and moments named:**
- Panama named a favourite by one player; Seoul 3 by another; Chemical Bunker's three "mini-games" (chemical mixing, crane with a spotter giving directions, missile disarm) and its scientist line about looking after the monkeys are quoted with affection; the Train Station bomb as the tensest moment. [ONE SOURCE: each - RD ijtifz, 1ouonhz, 1isi4hk, 1m8z5gm]
- Players remember failing the Chemical Bunker missile disarm causes a large explosion with ragdolls everywhere. [ONE SOURCE: RD 1ouonhz]
- One veteran says the first few levels are among the best co-op ever, but the later levels feel rushed. [ONE SOURCE: RD 1utzrr6]
- The Train Station bomb is the single most-asked "how do we do this" moment in YouTube comments: English, Spanish and Portuguese players ask which key cuts the wire, or report that both clicked the first wire together and it exploded (likely the wrong wire or a pulse change). [CONFIRMED - several sources: 6+ comments across NrooRPC9cog, xjynpfObTLs, LY9-0Dk-YHk, ge7dEnjp6MU] Players explaining it agree: both agents must have the bomb selected; each switches to thermal vision to find the hot wire; both cut at the same moment; then repeat for a second wire before a timer runs out. A Brazilian PS2 player adds: turn thermal on to see which wire glows, turn it off, then cut that wire; another says the cut is the X button on PS2. A PS2 uploader says it is hard without controller vibration, which also cues the live wire. [CONFIRMED - several sources: comments on 8FiRUvq86sg (PC), LY9-0Dk-YHk (GameCube, 2 commenters), ge7dEnjp6MU (PS2) and its description] Design note from the researchers: the defusal is remembered as both tense and confusing; it needs explicit input prompts and a visible indication of which wire is live and how much time is left. [ANALYSIS]
- UN HQ: a Czech viewer's "those little wires" complaint on the final part of a UN HQ let's play suggests the same wire mechanic is reused for the last bomb. [INFERRED / UNCERTAIN: single comment, GhostLetsPlays part 4] UN HQ sentiment: Pretend3r (PC, 2005-06) played it before Xbox owners had it, on Normal at 640x480 because of lag, knocking out more guards "since the missions are pretty long"; DoubleTroubeify subtitled their episode "Suicide Central"; an iTrJGQAZg-o commenter: "my brothers and I went through hell". [ONE SOURCE: each; sentiment = hard]
- Nuclear Plant: Russian PC let's-players dat_carlin (part 6) judged it the hardest mission (confusing layout with many sub-objectives; they could not finish it stealthily); a Czech LP (GhostLetsPlays) calls it probably one of the longest co-op missions. [ONE SOURCE: each]
- PS2 Team Training: viewers on the WalkthroughCinema PS2 training video: one laughs that a partner threw him at the enemy (a throw used as an attack); another explains the human-ladder step (the boosted agent must press the co-op button again after landing so the partner can climb him). GameCube players explaining the first training wall: stand with your back to the wall and press the co-op input (Z + D-pad left on GC); the partner faces you, crouches and presses the same; a first-time player says they were stuck at "the very first bit". [ONE SOURCE: each for the PS2 comments on gy1Vt3pxX8U; CONFIRMED - several sources: 2 commenters on gm9uYnMw9KA for the GC wall]
- Solo with two controllers? A PS2 thread: possible in theory but very frustrating; players stress that OCP jamming in co-op is not fire-and-forget (one player keeps aiming and holding the trigger while the other moves) and that in dual rappel one player controls sideways movement and the other controls height. [ONE SOURCE: RD 1qfdvur]

### 2.4 What made it special (critics and players together)

Specific moves and moments players and critics cite [CONFIRMED - several sources: many]:
- **Tomoe Nage / "Long Jump":** throwing your partner across a gap, over a laser grid, or straight into a guard to knock him out. Players love it as a joke too (Steam: "throw your buddy at guards"; "tomoe nage the entire co-op campaign").
- **Boost / Short Scale + Human Ladder:** chained to reach windows and holes (Prima walkthrough; Eurogamer; Pocket-lint).
- **Hangover:** dangling a partner on a rope to hack a computer or neck-break a guard (Eurogamer's favourite; Prima).
- **Dual Rappelling, shoulder-stand, back-to-back climbing:** Pocket-lint, Eurogamer, Steam. (Note: back-to-back climbing is not found as a co-op move in either manual or in Prima; its only mention is the FW Agent Two lore paragraph. Likely lore or marketing wording, or a cut/preview-only move. [INFERRED / UNCERTAIN: coop_moves.md] See 02-coop-moves.md.)
- **Synchronized actions:** cutting bomb wires at the same time, or one jamming a camera while the other runs (NWR, Elder-Geek, GameSpot first look*). Coordinated simultaneous takedowns (TeamXbox, Globe, Steam).
- **Voice as a weapon/liability:** guards hear headset chatter, so you whisper or deliberately lure (TeamXbox, Steam x4, GameSpot hands-on*).
- **Separate parallel story** with trainees Agent One/Two ("Steve and Bob" in fan slang; the red vs blue agent). Sam appears in parallel missions (Elder-Geek, Steam x9, Game Rant, Classic Co-op).
- **Emergent comedy:** slamming doors on your partner, physics mishaps, yelling at your friend for tripping alarms (Steam). A fan-made co-op machinima series, "Splinter Cell Co-Op Theater (Bob and Steve)", is on YouTube. One Steam user credits X-Play with a machinima [ONE SOURCE / INFERRED / UNCERTAIN at the time]; the video pass later confirmed it is a 2005 X-Play machinima of 11 episodes (see 9.7).
- **Single missions singled out:** Seoul as the best (GameSpot*); end of mission 4 frustrating (Retro Spectives podcast); the Chemical Bunker missile-hatch glitch (Steam).
- **Why it matters (from 03 §9):** a full, separate co-op campaign built for two, rather than the solo game with a second body ("three games in one"); critics repeatedly called it revolutionary or the highlight on Xbox Live. Turning voice into a stealth mechanic was the most-praised co-op systems idea after the moves themselves; it made talking part of the stealth, since players must decide when it is safe to speak. [CONFIRMED - several sources: reception.md]
- **Did the story land?** Critics considered it secondary. One noted it ends abruptly without the downloads. Players remember the "parallel story" fondly; nine Steam reviews mention it. [ONE SOURCE: Penny Arcade; Steam count ONE SOURCE]

(* = search-snippet only.)

### 2.5 Recurring criticisms (critics, Steam, Reddit, YouTube)

1. **Length:** 4 launch missions (plus training) and later 2 free DLC maps (Nuclear Plant, UN HQ). Critics and some players wanted more. [CONFIRMED - several sources: about 12 outlets]
2. **Online shutdown / PC set-up pain:** official PC online is gone. The Steam store page says multiplayer and co-op no longer work. Players use Radmin VPN, Hamachi, ZeroTier, Tunngle or Evolve to fake a LAN. Shutdown is often dated to 2016 by users [INFERRED / UNCERTAIN: sources disagree on month, April 2016 (PCGamingWiki + Steam guide, snippets) vs 7 Oct 2016 (MobyGames, snippet)]; GameSpy-backed services died in 2014 (GameSpy shutdown May 2014); CT (PC) is on Ubisoft's April 2022 decommission list [CONFIRMED - several sources: VGC + Shacknews]. Many blame GameSpy, while one says it shared Uplay servers [INFERRED / UNCERTAIN: which backend]. Original Xbox Live shut down 15 April 2010 [CONFIRMED - several sources: xbox-scene + Wikipedia BC list citing the Marc Whitten letter]. (Earlier notes in reception.md and dev_and_design_intent.md said "commonly April 2010, not verified"; platforms_versions.md verified 15 April 2010.)
3. **Netcode/performance:** PC co-op frame rate capped at about 30-35 fps "for synchronization". Desync can ruin hour-long missions. Alt-tab kicks. Widescreen fixes break co-op (the ThirteenAG widescreen fix/forced FOV installed on only one PC causes desyncs; both must run identical configs or remove it). Frequent desync/disconnects, for example during the training hacking minigame, about 1 min into Panama. [CONFIRMED - several sources: multiple Steam reviews and threads; RD 1m3rm7z, 1htj7ha, 1ouonhz; many YouTube comments]
4. **Bugs and glitches:** guards alerting each other oddly (Elder-Geek). Clipping deaths and broken triggers on some levels (Steam). Long loads on GC (NWR). A PC crash two or three rooms after the Chemical Bunker laser hallway [ONE SOURCE: RD 1ouonhz]; YouTube commenters ask for a fix for Panama and Nuclear Plant disconnecting immediately on PC [ONE SOURCE]. 100% blocked by bugs on two maps (Seoul 90%, Chemical Bunker 97%). [CONFIRMED - several sources: for "some glitches" and the caps; details ONE SOURCE]
5. **Difficulty and structure:** no automatic checkpoints in Xbox/PC co-op missions, so failing means a restart unless you saved manually (Elder-Geek; corrected per R-07, see 1.5). GC has no mid-mission save and needs both discs (Classic Co-op); PS2 co-op has no in-mission saving either, which is why missions are cut into small sub-levels (Jake "Ziggity" Steven) [CONFIRMED - several sources: R-07 PS2/GC "no mid-mission save"]. The team is only as good as its weakest link (Steam). Differing play styles clash (Elder-Geek, NWR). Hard for newcomers: several pairs never got past the first or second level; Chemical Bunker on PS2 "took months". [CONFIRMED - several sources: multiple comments]
6. **Partner sync and navigation:** losing each other, no map (Eurogamer). Communication essential. No in-game voice without a headset on Steam; Discord recommended (Steam). [CONFIRMED - several sources] Correction: the game files show every co-op map has a map page in the mission device, and reading a computer updates both agents' devices; the map legend has no teammate entry. So the "no map" claim is at least partly wrong; whether the partner is marked is still unknown. [CONFIRMED - several sources: game files for the map page] [UNKNOWN - see 06-open-questions.md, R-11]
7. **Scripted moves:** some found the co-op moves are just "press button, watch animation" (Steam), or wondered whether they were only "elaborate keys" (Retro Spectives). GameSpot* found the location-bound moves forced. Co-op moves clunky and awkward to execute at times. [CONFIRMED - several sources: 3 sources + RD 1g21m8q]
8. **Unclear shared-device inputs:** inputs for shared devices unclear (bomb, laser grid, door code). A 2008 AnandTech thread: two brothers on PC reached the Train Station bomb ("defuse" opens a device screen) and a two-player laser grid and could not work out the inputs; nobody answered. Design lesson: the shared device screen needed on-screen input prompts. [CONFIRMED - several sources: RD 1g21m8q + many YouTube help requests + AT 2008]
9. **PC controls and tutorial:** the co-op tutorial teaches only co-op moves and assumes single-player knowledge. Keyboard/mouse is obtuse (Steam). [ONE SOURCE: Steam]
10. **Maps and lighting:** too-small maps and areas lit too brightly compared with solo levels ("low-budget" feel). [ONE SOURCE: RD 1g21m8q, 2 commenters]
11. **Cut-down PS2/GC co-op** with long loads. [CONFIRMED - several sources]
12. **Split-screen undermines stealth information.** [ONE SOURCE: VideoGamer]
13. **Empty levels** (one dissenting reviewer). [ONE SOURCE: EUR]
14. **Easier than single-player** because two spies can attack guard pairs at once. [ONE SOURCE: G&M]
15. **AI omniscience about gunfire** affects co-op too. [ONE SOURCE: WorthPlaying Xbox/PC]

### 2.6 Lists and retrospectives citing the co-op

- Game Rant "Best Tom Clancy Co-Op Games, Ranked": CT ranked top; later SC co-op never matched it. [ONE SOURCE]
- TheGamer "Best Co-op Stealth Games": CT #8; Conviction may have refined co-op, but CT's first attempt is still amazing. [ONE SOURCE]
- ScreenRant "Splinter Cell's Co-Op Campaigns Are Still Undefeated": CT/DA/Conviction co-op among the best co-op modes; Blacklist's Sam+Briggs co-op is less unique; rereleases forgot co-op. [ONE SOURCE]
- GameSpot "Best Splinter Cell Games, Ranked": CT #1, citing its separate co-op campaign. [INFERRED / UNCERTAIN: search snippet only]
- Green Man Gaming ranking: CT #1; also argues Conviction's co-op beat its own single-player. [ONE SOURCE]
- Classic Co-op "Co-op Spotlight #1" (21 Jun 2017): one of the best co-op modes ever made; it gives you two real agents and a separate campaign instead of a story-irrelevant "husk" P2; GC is shorter missions on two discs with no save inside its bite-sized missions. [ONE SOURCE: CCO]
- Elder-Geek co-op review (Sep 2009, Steam re-release): an expansion-sized co-op that plays like an expansion of the main game; seven missions; teamwork required; no checkpoints and minor glitches (guard-trip glitch). [ONE SOURCE: EG]
- Retro Spectives Podcast, Bonus 1 (rspodcast.net): critical look at whether tandem moves change strategy, or are just "elaborate keys"; how the levels accommodate a second player; the griefing potential; end of mission 4 frustrating. [ONE SOURCE]
- Guinness World Records: first fully stealth-based co-op mode. [ONE SOURCE]
- Penny Arcade (Tycho, 27 Jul 2005): communication challenges; few players had tried it. [ONE SOURCE]
- Substack retrospective (efithorsjetsampatch): sound meter removes guesswork; ambient radio lets you move faster; guards now fire toward a whistle rather than walk to it (conflicts with a Prima tip that whistling lures guards; context dependent); cites Nintendo Power #190 (Apr 2005) Hocking interview (see 3.7). [ONE SOURCE] (General, not co-op specific.)
- Dev Game Club takeaway: "communicating enemy AI state clearly without UI" (general, see 07-audio-and-atmosphere.md). [ONE SOURCE]
- Retro Gamer "news from April 2005" (pressreader) was fetched but its text was empty. [UNKNOWN - see 06-open-questions.md]

### 2.7 YouTube retrospectives and video essays (titles and descriptions only; not watched)

- "Splinter Cell Chaos Theory: The Co-Op Experience" - Lawerenceofalevi, 32:42 - https://www.youtube.com/watch?v=KCOcnYpCD0s - Xbox (two Xbox Ones on system link); every mission done "to perfection" on Expert. Creator chapters: The Good 0:00, The Bad 10:04, The Ugly 28:56, The Results 30:15. The most design-relevant critique found.
- "The most cursed co-op game" - ParagonMitchell, 21:54 - https://www.youtube.com/watch?v=SwxTLoWn5e4 - 55k views, Feb 2026, PC; about 90 comments read. Argues the co-op is weaker than remembered, at least on PC. Creator chapters: Panama 5:56, Seoul 8:57, Chemical Bunker 12:47, Train Station 16:53, "An Unfortunate End" 20:30, which suggests they did not finish the late missions [INFERRED / UNCERTAIN]. ParagonMitchell mentions Bob and Steve while introducing CT co-op.
- "The best multiplayer game you've never played" - ParagonMitchell, 11:25 - https://www.youtube.com/watch?v=LqZ664Y7pwI (Versus context, not co-op).
- "I Played Splinter Cell: Chaos Theory's Co-op Mode With My Girlfriend and It Was Chaotic" - The Rat Shepherd, 17:02 - https://www.youtube.com/watch?v=edi3vnpq2yw
- "Splinter Cell: Chaos Theory Review - How True Stealth and Co-op Work" - itz_Saide, 49:54 - https://www.youtube.com/watch?v=t3btK_uM6KY - 2026; filmed with a co-op partner.
- "Splinter Cell Chaos Theory Co-op Review | Retro Spectives Podcast #Bonus 1" - 49:48 - https://www.youtube.com/watch?v=3G7D5CjM6RU - the description says they discuss whether partner moves changed their strategy or were just "elaborate keys", how the levels accommodate a second player, and the griefing potential.
- "Is Chaos Theory As Good As I Remember?" - Chris Davis, 42:40 - https://www.youtube.com/watch?v=q0gHxY-DFD8 - 248k views; chapter "Multiplayer and Co-Op Modes" at 39:15.
- "Splinter Cell Chaos Theory Review Retrospective - Closer than ever" - KIRK COLLECTS, 1:17:56 - https://www.youtube.com/watch?v=IuwfdmAicjc - 234k views; creator chapter "Splinter Cell Co-op" at 1:01:35.
- "Splinter Cell Chaos Theory Retrospective" - Acerthorn, 1:57:39 - https://www.youtube.com/watch?v=hs3sfnhWRSc - chapters are SP missions only.
- "Splinter Cell: Chaos Theory | The Peak Of Stealth" - Boulder Punch, 30:58 - https://www.youtube.com/watch?v=cfR80DTXYjU - 111k views; creator chapter "Co-op & Spies Vs. Mercs" at 25:09.
- "Is Splinter Cell: Chaos Theory Worth Playing 20 Years Later?" - thesummerofmark, 30:10 - https://www.youtube.com/watch?v=4JRAPQg6UYw (mostly single-player).
- "Play The Games They Took From You" - TheButterAnvil, 15:47 - https://www.youtube.com/watch?v=Q_Kka4VhWG0 (Versus context).
- "Splinter Cell Co-Op Theater (1/6) Bob and Steve" - alfaita (machinima) - https://www.youtube.com/watch?v=wp9O6FvyD0U
- "Splinter Cell Chaos Theory - Retro 2005 PC vs OG Xbox" - Digital Foundry, 38:55 - https://www.youtube.com/watch?v=YnlvSci_PCE (tech; co-op content unknown).
- "СТЕЛС КООП ШЕДЕВР" - Tekkie, 12:03 - https://www.youtube.com/watch?v=SjycM4h_5r0 - Russian video essay; creator chapters include a mini-guide to the mechanics (5:30) and teamwork (6:40).
- Set-up guides: "How to Play Chaos Theory Coop on PC | ZeroTeir Method" (Nenz, 31k views) https://www.youtube.com/watch?v=LY69X7EgsmM ; "How to Play ... Multiplayer in 2025" (Gubbsplinta) https://www.youtube.com/watch?v=OiW-Tx3l_HY
- Full list of review, retrospective and essay videos: section 9.5.

### 2.8 Comparison with later Splinter Cell co-op

- **Consensus:** CT's co-op is widely treated as the series' best or purest stealth co-op (Game Rant, Classic Co-op, Steam users). Conviction and Blacklist are credited with more content, modes and polish (TheGamer, GMG, Blacklist's IGN review). [CONFIRMED - several sources]
- **Conviction (2010):** praised for its prologue story with Archer/Kestrel and its player-vs-player twist ending, and as more compelling than its own single-player (GMG). Fans say it lacks CT's sneakiness. Steam: "Why they did not expand on this further in Conviction" (one user). [CONFIRMED - several sources: 2+]
- **Blacklist (2013):** 14 Sam+Briggs missions. IGN said there was enough content for a separate game, and GameTrailers praised the co-op design (via Wikipedia). Some find it less unique than CT/Conviction (ScreenRant). Some Steam users rank it close to CT. [CONFIRMED - several sources]
- **Double Agent old-gen (2006):** continued Agent One/Two. Some fans found it tacked on (Steam). [ONE SOURCE: for the opinion]
- **The distinctive things CT had:** authored two-person traversal moves (throws, ladders, rope moves), voice audible to guards, and a separate trainee story. Later games shifted to Mark & Execute-based co-op (Conviction) and mission hubs (Blacklist). [CONFIRMED - several sources: Wikipedia Conviction/Blacklist + Fandom + ScreenRant]
- Reddit commenters likewise contrast CT (you physically need each other) with Conviction/Blacklist (single-player mechanics with a second player). [CONFIRMED - several sources: see 2.3 item 1]

### 2.9 Reception gaps

- **Reddit** could not be read directly in the first pass (www/old.reddit 403, WebFetch refused, PullPush 429, a Redlib mirror failed TLS, site: searches returned no Reddit hits). A Reddit claim about Eurogamer's Xbox review (Kristan Reed calling CT dumbed-down) was seen only in a search summary [INFERRED / UNCERTAIN]. The gap pass later read about 35 Reddit threads through the Arctic Shift API (section 2.3). Arctic Shift comment full-text search (`body=`) timed out every time; title search worked when spaced out.
- **ResetEra / NeoGAF** threads (LTTP CT and Blacklist; "I just beat CT") returned 403. Not read.
- **Co-optimus** pages returned 403. Only snippet facts (PC LAN; servers shut) are available. No Co-optimus review was found.
- **Full review bodies** for IGN, GameSpot, GameSpy, 1UP, OXM, PC Gamer, GamePro, GI, X-Play and GameTrailers were not reached. Edge's co-op comments were not found.
- **Ubisoft forums:** not checked.
- **Exact date** of PC online shutdown not verified (April 2016 vs 7 Oct 2016).
- **Web search budget** was exhausted before Reddit alternatives, the GameSpot hands-on full text and more "best co-op" lists could be pursued. YouTube essays were not watched; transcripts were blocked.
- **Steam counts** are keyword-based approximations.
- [UNKNOWN - see 06-open-questions.md] for all of the above.

---

## 3. Development and design intent

### 3.1 Who built the co-op

| Claim | Confidence | Basis |
|---|---|---|
| Ubisoft Montreal built the single-player campaign and the co-op mode (all Xbox/PC co-op maps). Ubisoft Annecy built Versus (Spies vs Mercs). | [CONFIRMED - several sources: Ubisoft PR, G&M interview, Xbox Addict snippet, Wikipedia, PC credits video] | Ubisoft ship press release, 28-29 Mar 2005 (via Nintendo World Report), credits "Montreal (single-player and co-op) and Annecy (Versus)". Hocking's 2005 interview (Globe and Mail) says the core team started on single-player + co-op and asked the Pandora Tomorrow adversarial team to supply Versus. A Sept 2004 Ubisoft multiplayer announcement (Xbox Addict, search snippet only, because the page is now a farewell splash) says the Montreal team developed co-op and its co-op-specific maps. Wikipedia's infobox footnote says Annecy did "the multiplayer part". The PC 1.05 credits video has a section "Single Player & Coop Mode Development Team (Montreal)"; Versus was a separate team (Ubisoft Annecy). |
| Staffing: more than 100 people in Montreal plus about 50 in Annecy. | [ONE SOURCE: GameSpot "First Look" search summary] [INFERRED / UNCERTAIN: the figures may count different things] | GameSpot returns 403. Wikipedia gives about 300 people at peak (North Bay Nugget, 2006). Bonus-disc developer diary 1: producer Mathieu Ferland introduces a team of 120+. |
| Ubisoft Milan was a co-developer or support studio. | [CONFIRMED - several sources: that Milan was involved] [INFERRED / UNCERTAIN: what it did] | Wikipedia infobox (co-developed by Montreal and Milan). Wikipedia "List of Ubisoft subsidiaries" lists Milan only as a support studio for CT. No source says Milan worked on co-op or on the PS2/GC builds. Later game-file evidence suggests an Italian team built at least the Nuclear Plant download (see 3.8). |
| Ubisoft Shanghai did not develop CT. Shanghai made Pandora Tomorrow in about one year, in parallel with CT. | [CONFIRMED - several sources: G&M interview (Apr 2005) + G&M review (Mar 2005)] | Hocking in the Globe and Mail; the review says CT began production around the same time as PT. No source credits Shanghai with any CT version. |
| The PS2/GameCube co-op is a separate build, with shorter, split-up maps and saves per area. It was tested in Montreal. | [CONFIRMED - several sources: that it is a different build] [INFERRED / UNCERTAIN: which studio made the PS2/GC co-op maps] | Prima eGuide (PS2/GC missions split into 4-5 areas, progress saved per area; acknowledgements name "Co-Op PS2 Testers" in the Ubisoft Montreal team). NWR GC review (levels condensed, loads between sections). WorthPlaying PS2 review (stages cut down). Classic Co-op (GC = shorter missions on two discs). |
| N-Gage and DS (and mobile) versions, including their own co-op campaign, were made by Gameloft; the DS game is a port of the N-Gage game. | [CONFIRMED - several sources: Wikipedia + IGN DS + FW] | See 01d-levels-overview-handheld.md. |
| Guinness World Records lists CT as the first game with a fully stealth-based co-op mode. | [ONE SOURCE: guinnessworldrecords.com record 549102] | - |

### 3.2 Key people

| Person | Role on CT | Confidence | Co-op specific? |
|---|---|---|---|
| Clint Hocking | Creative Director, Lead Level Designer, scriptwriter. Became CD around Alpha, under a Ubisoft mandate. Credited as creative director in the PC credits video. | [CONFIRMED - several sources: G&M 2005; his blog "Ten years down" 2015; Wikipedia; PC105 credits video] | Spoke about co-op intent (see 3.5). Not credited as the co-op lead. |
| Mathieu Ferland | Producer (credits video). Introduces the bonus-disc developer diaries. | [CONFIRMED - several sources: Hocking blog; Wikipedia; Shacknews links to IGN, TotalVideoGames and Canoe/WHAM Q&As; credits video; bonus-disc diary 1] | His IGN Q&A covered co-op, but its text was not retrieved. |
| Dany (Danny) Lepage | Lead Programmer; ex-Nvidia programmer who unlocked Xbox shaders and normal maps. | [ONE SOURCE: G&M for "lead programmer"; CONFIRMED - several sources: PC Gamer (Hocking) + CGW (Lepage as lead programmer) for the engine work] | Said co-op was originally the main mode (see 3.3). |
| The Chinh Ngo | Art Director | [ONE SOURCE: Hocking blog] | - |
| Patrick Fortier | Listed as a director | [ONE SOURCE: Wikipedia infobox] | Unknown |
| Mathieu Berube | Level designer. Replayed the Bank level with Hocking in 2016. | [ONE SOURCE: Rock Paper Shotgun, 10 May 2016] | Unknown |
| Frederic (Frédéric) Blais | Lead AI programmer; presents the AI developer diary (NPCs have distinct stress stages expressed through barks and animation). | [ONE SOURCE: YouTube description of i8Yf_REi0ko; bonus-disc diary 1 transcript names "Frederic ..." (ASR garbled)] | No |
| Fabien Noel | Sound designer (Xbox lead sound designer per a MobyGames snippet); presents the sound developer diary. | [CONFIRMED - several sources: bonus-disc diary on camera + Fandom (SC1 lead audio designer)] | No |
| Jacques Dussault | Lead animator (about 10 animators, all keyframed in Character Studio/3ds Max, no mocap, exported to the Unreal editor; "gym" test maps; the animation art director used video reference for realistic NPC behaviour). | [ONE SOURCE: bonus-disc diary 3 transcript] | Unknown whether the paired co-op animations are shown |
| Amon Tobin | Music composer (credits video names him as the only composer; no separate co-op composer). | [CONFIRMED - several sources: credits video + album credits] | Co-op reuses solo stem sets (see 07-audio-and-atmosphere.md) |
| Jesper Kyd | Cinematics score (credits video). | [ONE SOURCE: PC105 credits video] | - |
| Alexandre Martel (Lead Co-Op Tester); Henri Durocher, Bernard Fluet (Co-Op Xbox Testers); Christine Olsen, Philippe Brault (Co-Op PS2 Testers) | QA at Ubisoft Montreal | [ONE SOURCE: Prima eGuide acknowledgements] | Yes (QA only) |
| Tony Kee | Ubisoft VP Marketing. Gave the launch PR quote. | [ONE SOURCE: Ubisoft PR] | Marketing |
| Patrick Redding | Co-op game director on Splinter Cell: Conviction (2010). No source ties him to CT's co-op. | [ONE SOURCE: Wikipedia Conviction page] | Later game only |

**Co-op team credits (R-12, CLOSED).** Source: the PC 1.05 install's credits video `Data/Videos/Credits.bik`, read from extracted frames at roughly 9-20 s and 36-45 s. Section title on screen: "Single Player & Coop Mode Development Team (Montreal)". Spelling as on screen; names marked (?) were partly blurred. [ONE SOURCE: PC105 credits video (primary)]

| Co-op role (as credited) | Name(s) |
|---|---|
| Co-op mode and PC version associate producer | Stephane Roy |
| Co-op mode lead game designer | Daniel "Berlu" Berube |
| Co-op mode lead level designer | Sebastien Galarneau, with the collaboration of Jonathan Dumont |
| Co-op mode level designers | Ariel Gauthier, Damien Galipot, Carl Lavoie, David Deschenes, Jonathan Dumont; with the collaboration of Martin Dufour |
| Co-op mode lead artist | Patrick Daigle (collaboration David Massicotte) |
| Co-op mode art director | Jean-Francois Mignault (collaboration Patrick Daigle) |
| Co-op mode modelers | Alexis Grzyb (?), Eric Fredette, Jesse Houston (?), Mathieu Fecteau, Nicolas Longchamps, Patrick Dubuc, Sandy de Montigny, plus at least one more name (collaboration Ian St-Louis) |
| Co-op mode texture artists | Claude Gosselin, Marc Tetreault, Steve Fraser (collaboration Marc Salha) |
| Co-op mode animators | Chi Chun Ng, Joseph Nasrallah |
| Co-op lead sound designer | Alexandre Carlotti |
| QA | Co-op mode lead tester Alexandre Martel; co-op assistant lead tester Anthony Menard-Moquin; co-op lead tester PC version Alexandre Martel; separate co-op tester lists |
| Overall | Producer Mathieu Ferland; creative director Clint Hocking; music composed by Amon Tobin; cinematics scored by Jesper Kyd. Versus was a separate team (Ubisoft Annecy) |

- In short: the co-op team at Ubisoft Montreal had its own associate producer and its own lead game designer, a lead level designer with five level designers, a lead artist, an art director, a lead sound designer and a lead tester. [ONE SOURCE: credits video; summarised in 03 §12]
- Note: `Credits.int` in both XB477 and PC105 is an unused, half-empty template (not the real credits). Ignore it.
- The Xbox manual scan (49 pages; last scanned page is manual p.48, Versus passive defences) has no credits pages; the PS2 manual has no staff credits. [ONE SOURCE: each]
- Superseded claims: dev_and_design_intent.md listed "Co-op lead designer / co-op level designers / co-op producer: Not found" (MobyGames credits were blocked by Cloudflare 403/CAPTCHA; the Prima guide names only co-op testers). Corrected by the credits video above. Separately, music_and_atmosphere.md had seen, only in MobyGames search snippets, Xbox Lead Sound Designer Fabien Noel and a separate "Coop Lead Sound Designer" Alexandre Carlotti; PC credits listing Isabelle Ballet (lead sound designer) and Jeremi Valiquette (sound studio director); PS2 credits listing Brian Youds (sound designer) and Amaury La Burthe (sound collaboration); and an IMDb snippet naming Keith Arem as sound recordist/voice director [INFERRED / UNCERTAIN: search-summary only]. The credits video now confirms Carlotti as co-op lead sound designer; the others remain unverified.
- Pack-writer observation (not in the sources): the cut Share Equipment training e-mail in the Training map is from "Dan" to "Seb" (see 3.4); these first names match the credited co-op lead game designer (Daniel Berube) and lead level designer (Sebastien Galarneau). [INFERRED / UNCERTAIN: name match only, not stated by any source]

### 3.3 Timeline

- **Late 2002 to early 2003:** CT work starts at Montreal after Splinter Cell 1 (Nov 2002). Stated dev length varies: "two and a half years" (Hocking, 2005), "the last two years" (Lepage, 2005), 24 months (Hocking blog, 2015). [CONFIRMED - several sources: roughly 2 to 2.5 years] Working title "Splinter Cell 3" [CONFIRMED - several sources: Fandom + Wikipedia refs]. The game ran on a modified Unreal Engine 2.5 [CONFIRMED - several sources: Fandom, dev diary 3 mentions exporting to the Unreal editor]; the graphics engine was rebuilt in about eight months [ONE SOURCE: bonus-disc documentary].
- **Early concept:** the project started as single-player + co-op only. Lepage says co-op was at first the main mode of CT, then single-player was prioritised "in terms of market penetration". [ONE SOURCE: G&M launch interview, 15 Apr 2005]
- **Versus added:** Montreal realised it could not ship without adversarial play and asked the PT multiplayer team (Annecy) to build it. [ONE SOURCE: same interview; consistent with the Ubisoft PR studio split]
- **E3 2004 (May):** co-op was shown (see 3.4). [CONFIRMED - several sources]
- **28 Sep 2004:** Ubisoft announced multiplayer details. Co-op would be built by the Montreal team on dedicated maps, with online, system link and split-screen, plus the Versus modes (story, disk hunt, deathmatch). [ONE SOURCE: Xbox Addict headline + search snippet; GameSpot "multiplayer update" and Neowin ("Splinter Cell: Multi Theory", 2004) also covered it but were blocked]
- **Oct 2004:** PlayZone 10/2004 (German magazine) video coverage exists: https://www.youtube.com/watch?v=CF51EMy6SDY (7:21). [ONE SOURCE: YouTube listing]
- **Dec 2004:** Gameloft's N-Gage version first covered (gry-online N-Gage demo news; demo over Bluetooth). [ONE SOURCE: gry-online]
- **Late 2004 to early 2005 previews:** four co-op levels promised, with about 10 new co-op-specific moves (human ladder, hand boost, tandem rappel, Tomoe Nage throw) and proximity voice that guards can hear (GamesFirst, Feb 2005). A GameSpot "First Look" said five missions including a tutorial. GameSpot did a co-op hands-on of Panama. [CONFIRMED - several sources: for the move set and voice feature]
- **16 Feb 2005:** PC manual dated 16/02/05 (PCDVD). **21-22 Feb 2005:** Xbox build 477 asset dump (dev-kit), about a month before release, pre-DLC; its co-op text is word-for-word identical to the shipped PC 1.05 text for Panama, Seoul and Chemical Bunker, with only small wording fixes in Train Station and Training (button names removed for PC, three null objective strings filled in), so XB477 is near-final and PC and Xbox share one script. [CONFIRMED - several sources: XB477 vs PC105 diff]
- **Mar 2005:** Hocking gave a GDC 2005 talk on the game's narrative structure, not co-op. [ONE SOURCE: Hocking blog] The game shipped in North America 28 Mar 2005 (Xbox/PC/PS2) and 31 Mar (GC) [Fandom infobox; Ubisoft PR dated 28-29 Mar]. N-Gage: Nokia release 31 Mar 2005 (shipping now; Bluetooth co-op and head-to-head; Arena for clips and rankings) [ONE SOURCE: Nokia release via GamesIndustry.biz].
- **Launch:** a developer told the Globe and Mail that up to four more co-op levels were being designed for Xbox Live. [ONE SOURCE: G&M review, 29 Mar 2005] Only two shipped.
- **11 May 2005:** Ubisoft DS feature release ("Cooperative mode for two players with five levels to explore", Assault or Hacker, Versus 2-4 players on seven maps); **3 Jun 2005** DS gone gold (same feature list). [ONE SOURCE: Ubisoft PR on NWR] DS reviews late Jun to Jul 2005.
- **12 May 2005:** Ubisoft announced free maps for PC and Xbox Live: the Versus map "Squat"/"Steel Squat" (end of May), then co-op maps "Nuclear Plant" and "UN HQ" "shortly thereafter". [CONFIRMED - several sources: Shacknews 12 May 2005 + Gaming Nexus 12 May 2005 (press release)]
- **13-14 Jul 2005:** Steel Squat released; co-op maps "in the coming weeks"; Ubisoft blurb: Nuclear Plant = claustrophobic passages + open spaces, loud machinery, puzzles that need cooperation; UN HQ = "no room for kills or alarms". Polar Base Versus map promised for end of summer. [CONFIRMED - several sources: WorthPlaying 13 Jul 2005 + VideoGamer 14 Jul 2005; the PR is one origin reprinted by three outlets]
- **27 Jul 2005:** Penny Arcade says the co-op story ends abruptly and two maps would arrive within weeks. [ONE SOURCE: consistent]
- **24-25 Aug 2005 (Xbox Live):** Major Nelson post: two free downloads continuing and ending the co-op story; playable in split-screen, System Link and Xbox Live; only in Mission and Elite mode; you must play through Coop Story on Elite to see the maps first, after which they are selectable in Coop Mission mode. The post was edited to say there may be content issues. GameSpot's follow-up ("New content available for Chaos Theory") reported the Xbox downloads as unusable at first (maps not shown on level select) and Ubisoft investigating. [ONE SOURCE: MN (official); GameSpot via search snippet only] Whether and how it was fixed: [UNKNOWN - see 06-open-questions.md]. (Superseded: dev_and_design_intent.md said "the brief places release around Aug 2005; exact date not independently confirmed".)
- **19 Oct 2005 (PC):** US patch 1.00 to 1.05 (77.2 MB) adds the two co-op levels UN Headquarters and Nuclear Plant, selectable in the "Create Game" screen in "Mission" mode, not accessible in Story mode, and without the "Use native languages" sound option on these maps. EU had a 1.04 to 1.05 patch "adds two new co-op missions". [CONFIRMED - several sources: gamepressure patch page + ModDB snippet + PC 1.05 readme embedded in the PCDVD patch exe; EU patch ONE SOURCE: snippet] The PC 1.05 readme lists UN Headquarters then Nuclear Plant. [ONE SOURCE: patch readme] (R-01 CLOSED: on PC both are Mission-mode maps, so players choose the order; the briefing and objective text on PC is byte-for-byte the same as on Xbox, so the PC briefing was not rewritten for the swapped order [CONFIRMED - several sources: XBDLC vs PC105 diff]. Superseded: dev_and_design_intent.md said "the PC/Xbox order swap was not confirmed"; one German uploader (RednBlue2k9) had claimed the PC briefing was rewritten, contradicted by dat_carlin and by the file diff.)
- **2005:** the Limited Collector's Edition bonus disc included development team video diaries and an exclusive G4 "Making of" (Wikipedia + Fandom). Their content was later transcribed from the archive.org bonus-disc item (see 3.6). (Superseded: dev_and_design_intent.md said "their content was not retrieved".)
- **February 2006:** AIAS Sound Design finalist (God of War won). [CONFIRMED - several sources]
- **15 April 2010:** original Xbox Live shut down, so the DLC can no longer be bought; preservation installers exist for modded Xbox (Nuclear Plant 2090 blocks, UN HQ 1990 blocks; includes title update). [CONFIRMED - several sources: for the date, xbox-scene + Wikipedia BC list]
- **2011:** the PS3 Classic Trilogy HD dropped co-op and Versus. [CONFIRMED - several sources: Fandom "Cooperative" + ScreenRant (rereleases forgot co-op)] Splinter Cell 3D (3DS, 2011) has no multiplayer.
- **2014:** GameSpy shutdown (May 2014, general fact; Steam users cite "2014") hit PC online services. [INFERRED / UNCERTAIN]
- **2016:** PC online shut down per Steam users; month uncertain (April 2016 vs 7 Oct 2016). [INFERRED / UNCERTAIN]
- **10 June 2019:** Xbox One/Series backward compatibility released both co-op mission packs (described by Microsoft as "split-screen co-op missions") plus the Polar Base and Steel Squat map packs free, delivered automatically. [CONFIRMED - several sources: Xbox Wire 10 Jun 2019 + GamesHedge + Wikipedia BC list "Includes all DLC"] One commenter says UN HQ disappeared from their Xbox 360 backward-compat install while Nuclear Plant stayed [INFERRED / UNCERTAIN: comments only]; Xbox One presence is stated by 2 commenters + 1 Reddit user [CONFIRMED - several sources].
- **April 2022:** CT (PC) appears in Ubisoft's decommission list. [CONFIRMED - several sources: VGC + Shacknews]

### 3.4 E3 2004 showing and what changed before release

**E3 2004 (May 2004):**
- GameSpot's E3 impressions describe two spies entering a building, one kneeling to boost the other over a wall, with more emphasis on teamwork than PT. [ONE SOURCE: GameSpot snippet for the demo details] [CONFIRMED - several sources: that co-op was shown at E3 2004]
- Fandom wiki dev trivia records the E3 2004 demo. [ONE SOURCE: Fandom]
- Videos: SickadtSteve "E3 2004 CO-OP Mode Showcase (High Quality)", 4:25, original E3 footage showing off the co-op mode: https://www.youtube.com/watch?v=IIfns1gvSRY ; SickadtSteve "E3 2004 Single Player Showcase", 22:18: https://www.youtube.com/watch?v=J9pl7tlJjh4 ; Alex37 "E3 Gameplay [Rare Footage]", 7:57, creator timestamps single-player 0:00, co-op 2:14, early Bathhouse 5:12: https://www.youtube.com/watch?v=11-wUk-tLaY ; Alex37 "E3 2004 Videos Compilation", 1:32:23, co-op at 0:31 (Hokkaido and co-op gameplay), 2:53 (co-op footage), 11:05 (co-op clips), 57:00 ("Co-op Showcase"), plus a Clint Hocking single-player showcase (34:52), AI and Sound dev diaries and European magazine E3 coverage; the uploader warns the timestamps may be off: https://www.youtube.com/watch?v=nN1YVwO-3hQ
- The Alex37 uploader notes the E3 build's HUD, animations, weapon models and map layouts differ from release. Useful for early co-op layouts. [ONE SOURCE: uploader description]

**What changed between announcement and release (all platforms):**
- **Goggle lamp colours.** Early CT screenshots had both agents with blue goggle lights before red/blue were split. [ONE SOURCE: Fandom] (Final: blue and red. CONFIRMED - several sources: Fandom + forum + Steam "Spy Blue / Spy Red"; see 05-hud-and-camera.md.)
- **Number of co-op levels.** Pre-release (Feb 2005) material spoke of only 4 co-op levels [ONE SOURCE: GamesFirst preview]; GameSpot's First Look said five missions including a tutorial [ONE SOURCE: snippet]. The retail disc had 5 (Training + 4), and the DLC added 2. [CONFIRMED - several sources: FW + IGN wiki ("five co-op missions, two more as free DLC")]
- **Number of moves.** A 2005 preview mentioned "about 10" co-op moves [ONE SOURCE: GamesFirst]; the shipped manuals document six named moves (three free, three contextual), plus Share View, Heal, Share Equipment, the synchronized actions and the crane. [CONFIRMED - several sources: XBM, PS2M, PRIMA for the 6] (See 02-coop-moves.md.)
- **Back-to-back climbing.** Mentioned in fan/marketing lore (FW Agent Two paragraph) and in a reception list, but not found as a move in either manual or Prima. Likely lore or marketing wording, or a cut/preview-only move. [INFERRED / UNCERTAIN]
- **Share Equipment training note.** Fandom lists a "deleted" data item: an e-mail dated 06/23/07 from "Dan" to "Seb" describing Share Equipment. The XB477 Training level package has that e-mail with a designer comment in French saying the note is not used for now and exists only so it gets translated. So the tutorial note was cut, the feature was not; the manuals (Xbox and PS2) and Prima document Share Equipment as a live feature. [ONE SOURCE: XB477 training `.lin` + `00_Training_COOP.int`] (R-04 CLOSED. Superseded: mission_training.md and coop_moves.md had left "cut content" as uncertain.)
- **Extra Xbox Live co-op levels.** At launch a developer said up to four more co-op levels were being designed for Xbox Live [ONE SOURCE: G&M]; only two shipped (Nuclear Plant, UN HQ).
- **Missing internal map slot 06.** The PC co-op map files are numbered 00, 01, 02, 03, 04, 05, 07 (`00_Training_COOP`, `01_Panama`, `02_seoulthree`, `03_ChemBunker`, `04_GCS`, `05_NuclearPlant`, `07_UNhq`); slot 06 is missing, which hints at a cut or renumbered mission. [Numbering ONE SOURCE: Steam discussion 133262738417485094; "cut mission" INFERRED / UNCERTAIN] Internal numbering from the game files: Nuclear Plant is map 05 / mission 55 / map identity 201; UN HQ is map 07 / identity 202; base co-op maps are 00-04, identities 100-105. [ONE SOURCE: game files]
- **Platform scope changes.** A Feb 2005 preview already said PS2 would lose online play but keep split-screen co-op, and GameCube would ship without Versus. [ONE SOURCE: GamesFirst; CONFIRMED - several sources: PRIMA + GamesFirst for "PS2 co-op had no online"] Prima's table lists PC as "Split-screen, LAN, Online" and says split-screen is supported by all platforms, but the PC menu is LAN / Online / Settings only, so there is no native PC split-screen. [CONFIRMED - several sources: R-13 closed via game files; superseded: PRIMA's PC split-screen claim]
- **N-Gage Arena.** The N-Gage pre-release fact sheet promised "global multiplayer over N-Gage Arena", which the final game did not deliver for co-op (co-op is local Bluetooth only; Arena only for top-10 scores and downloadable replays). [ONE SOURCE: N-Gage media kit factsheet; contradiction noted, CONFIRMED - several sources: for the final behaviour]
- **E3 build differences.** HUD, animations, weapon models and map layouts in the E3 build differ from release. [ONE SOURCE: Alex37]
- **Unexplained "Bank" naming.** The GameCube uploader ysuck63 names the Panama co-op level "Panama Bank", and CouchiesTV's full-run chapters put a "BANK" segment after Panama. What "bank" refers to is [INFERRED / UNCERTAIN].

### 3.5 Stated design intent and principles (developer or official statements only)

1. **"Three games in one."** Hocking said the team set out to make three games in one box: single-player at the core, plus co-op and Versus. [ONE SOURCE: G&M interview; reviewers and Ubisoft PR repeat the framing]
2. **Sam stays the centre, so co-op uses other agents.** Hocking said Sam is the franchise and single-player is the core. Co-op was added so friends could share the fiction, world and gameplay "intimately". [ONE SOURCE: G&M] No developer statement was found on why the co-op stars two unnamed trainees (Agent One/Two) rather than Sam. The in-fiction reason (Shadownet sends under-trained agents during a crisis) comes from the game and Wikipedia. [UNKNOWN - see 06-open-questions.md] The bonus-disc documentary calls co-op a "field side story" of two rookie agents. [ONE SOURCE: documentary transcript]
3. **Physical co-operation as the fantasy.** Hocking's example: reaching out and pulling a friend in another city up a ledge. He closed by saying you can play with friends who aren't present and believe they're real. [ONE SOURCE: G&M]
4. **Objectives impossible alone.** The Sept 2004 announcement and the Polish distributor PR (Cenega) pitch co-op as letting two NSA agents achieve goals a single spy couldn't. The Prima guide's intro (Ubisoft-approved) uses the same framing. [CONFIRMED - several sources: all marketing or official]
5. **Two kinds of co-op moves.** Generic moves (Boost/Short Scale, Human Ladder, Tomoe Nage) work anywhere. Contextual or "static" moves (Dual Rappelling, Hangover, shoulder-stand) only work at authored spots. One player signals and the other completes the move. [CONFIRMED - several sources: Prima eGuide + PS2 manual + TeamXbox review]
6. **Voice as a gameplay system.** Headset speech travels positionally, and AI guards can hear it. Players can whisper, mask speech with ambient noise, or deliberately lure guards. Sensitivity is adjustable (default 50, about 2 m in game; can be disabled; options include voice through TV speakers and voice masking). [CONFIRMED - several sources: GamesFirst preview, GameSpot Panama hands-on snippet, TeamXbox review, XBM, PRIMA, Steam users]
7. **Accessibility for players without a headset.** Moving into position sends an automatic voice cue to the partner, and synchronized actions are simplified online without a headset. [ONE SOURCE: Prima eGuide]
8. **Soft failure for partners.** A downed agent can be revived within about 30 seconds with an adrenaline shot. Agents can share gadgets and sticky-cam views. [CONFIRMED - several sources: Prima eGuide + GameRevolution (adrenaline heal)] Correction (R-03 CLOSED for Xbox/PC): one syringe per agent, two revives per team (in-game training text); the earlier note read "two each". The PS2/GC count and the both-down rule remain open. [CONFIRMED - several sources: game files] [UNKNOWN - see 06-open-questions.md, R-03] (See 03-mechanics.md.)
9. **Co-op tech carried into Versus.** In Versus, spies also got co-op moves and could heal and share gear. [CONFIRMED - several sources: Ubisoft PR, GamesFirst, GameRevolution, TeamXbox]
10. **Platform scope.** Xbox: split-screen, system link, Live. PC: LAN + online, no split-screen. PS2/GC: offline split-screen only. GC had no Versus. [CONFIRMED - several sources: Ubisoft PR + Prima + GamesFirst + game files]
11. **General CT goals that frame the co-op** (from Hocking/Lepage, not co-op specific): remove trial-and-error and "Game Over" gating, make low-level choices meaningful (the origin of the name "Chaos Theory"), add the sound/masking meter, and rewrite the AI with navigation meshes. [ONE SOURCE: G&M] Contrast: a reviewer notes co-op missions have no (automatic) checkpoints (Elder-Geek 2009), and the GC co-op has no mid-mission save (Classic Co-op). Hocking in PC Gamer: alarms give no game over; the game adapts. [ONE SOURCE: PC Gamer making-of] Nintendo Power #190 (Apr 2005) Hocking interview: "chaos theory" = small consequential actions (breaking a lock is fast but loud). [ONE SOURCE: via Substack retrospective]
12. **Hardest part of co-op (developer view).** The bonus-disc documentary says the hardest part of co-op was two characters synchronising specific actions, and that "you got to trust a partner". [ONE SOURCE: documentary transcript, ASR, speakers mostly unnamed]
13. **Loop of emotion.** Ferland's "loop of emotion": tension builds, possible burst of action, relief, repeat; sound and music sustain it. [ONE SOURCE: PC Gamer making-of] (Game-wide.)
14. **Scene ideas from the whole team.** Scenes were collected from the whole team as stick-figure "situation" sketches and then built into levels. [ONE SOURCE: PC Gamer, producer] (Game-wide.)

**Not found (no developer statement located):** why missions were built around two-player moves rather than just two players in SP maps; why objectives are split or simultaneous; how AI was tuned for two players (for example awareness scaling, difficulty). Reviews describe the results, but intent is undocumented in what could be reached. [UNKNOWN - see 06-open-questions.md, R-06, R-10]

### 3.6 Bonus-disc developer diaries, documentary and making-of videos

Source: archive.org item `q-1-t-00_202406` "Splinter Cell Chaos Theory Bonus Disc Videos" (https://archive.org/details/q-1-t-00_202406), downloaded and machine-transcribed locally (faster-whisper base.en). ASR garbles proper names; wording is paraphrased. Transcripts were kept in the research scratchpad, not in the repo. [ONE SOURCE: per diary]

- **Diary 1 (U1_t03, 3:33), introduction and AI:** producer Mathieu Ferland introduces a team of 120+; diaries on AI, sound, animation, co-op; the lead AI programmer (Frederic ...) explains that NPCs have distinct stress stages expressed through what they say (barks) and animation.
- **Diary 2 (U2_t04, 4:18), SOUND, sound designer Fabien Noel:** placing sound in the Bank map is hard because level artists and designers change geometry daily; he plugs ambiences per environment and builds outside-to-inside transitions using placed "sound actors" (green actors) along the player's likely path; a garden ambience with a fountain whose sound masks footsteps if you stay near it; entering the Bank there is still no music until an actor triggers "exploration music"; separate bathroom and vent ambiences; that day he received Tobin's last piece (cargo ship music), "music is done", leaving only map integration and voice recording.
- **Diary 3 (U3_t05, 4:57), animation:** lead animator Jacques Dussault, about 10 animators, all keyframed in Character Studio/3ds Max, no mocap, exported to the Unreal editor; "gym" test maps; the animation art director used video reference for realistic NPC behaviour.
- **Diary 4 (U4_t06, 4:26), LEVEL DESIGN, Clint Hocking (creative director, scriptwriter, lead level designer):**
  - Beta to master is tuning.
  - Maps already have normal and specular maps, reflective surfaces and "shadow lights".
  - Example of a bad setup: a guard whose slow patrol makes the player step into the doorway just as he rounds the corner is "a really bad setup". The player must know in advance that the guard is there. The fix is to flip which end of the spline patrol he starts on.
  - Testers fire sticky cams onto a roof and whistle through the cam to lure guards, but the ceiling is too high for the gas range, so the team either adjusts the geometry or the global gas range ("make the expected outcome happen").
  - Design reading carried into 07/15: telegraph threats before the player commits; a badly timed patrol is fixed by changing where it starts. [ANALYSIS]
- **Documentary (Q1_t00, 21:37), "history of Tom Clancy's Splinter Cell" (speakers mostly unnamed):**
  - CT rebuilt the graphics engine in about 8 months.
  - "We added an entire... sound masking system": when environment noise is loud, sounds you make aren't heard ("noisy down here makes it easy to sneak up on people").
  - Dynamic weather (wind scales, rain; Sam gets wet and dries over time); a storm front makes rain heavier and surfaces more reflective; enemies dislike rain and re-route patrols to dry places; a lightning flash may reveal you but thunder covers your noise: "all these dynamic systems acting together".
  - AI given stress: noise or broken lights unseen produce a "that's strange... who's playing with me?" attitude shift.
  - Barks expanded from a handful of canned lines to talking about what they notice ("did you hear that?"), a buddy joins, an impromptu team forms, guards call for cover fire.
  - **Co-op = a "field side story" of two rookie agents; the hardest part was two characters synchronising specific actions; "you got to trust a partner".**
  - SC1 segment: the goggles' three-dot silhouette was chosen to make Sam recognisable; the whole world casts shadows.
- **S2_t01:** a comedic co-op promo ("new employee at Third Echelon... cool moves... upcoming cooperative missions").
- **V3/V4:** story trailers. **R5_t09 (5:08):** soundtrack sampler page (The Lighthouse, Theme From Battery, El Cargo), identified from a frame; no speech. **Q4_t39 (3:00):** spy training pages; no speech in ASR. **S3_t02 (3:47):** no speech; not identified.

**YouTube rips of the same material (not watched; titles via search/oEmbed):**
- PS2 pre-order bonus DVD content, Lucian The World Gamer, 1:34:00: https://www.youtube.com/watch?v=d2vBjrRKs3g - creator chapters: Developers' Diaries 0:38, NSA Training Program 20:30, Trailers 28:08, Mega64 videos 44:41, soundtrack sampler 54:29, archive trailers 1:13:20.
- Developer diaries ripped from the PS2 limited-edition disc: Level Design https://www.youtube.com/watch?v=yxzr8K95RQ0 (4:27; the most relevant diary for level design; the bonus-disc transcript above shows its content, but whether it covers co-op maps is unknown); Animation https://www.youtube.com/watch?v=xocq_CIzuag (4:57; co-op moves needed paired animations, so this may show them [INFERRED / UNCERTAIN]); Sound Design https://www.youtube.com/watch?v=vp3tET9xVKk ; AI, presented by lead AI programmer Frédéric Blais per the description, https://www.youtube.com/watch?v=i8Yf_REi0ko (3:36); Sound, presented by lead sound designer Fabien Noel, https://www.youtube.com/watch?v=g0Jl6uVAcGE (4:24); Developer Diary Part 1 of 4 https://www.youtube.com/watch?v=f9-VSg95FKQ ; PS2 disc dev diary https://www.youtube.com/watch?v=RrVVsUqSVqc .
- Further titles listed in dev_and_design_intent.md: Developer Diary part 2/4 https://www.youtube.com/watch?v=lvbsHIEIcXs ; Behind the Scenes Level Design https://www.youtube.com/watch?v=pbanZLYyP-M ; AI https://www.youtube.com/watch?v=0aONHNALjUI ; Animation https://www.youtube.com/watch?v=KcfYZvzO_1I ; "The making of" https://www.youtube.com/watch?v=Vm0mAE8SFWo ; Co-op trailer https://www.youtube.com/watch?v=vzzG_KNahQ8 .
- "Splinter Cell: Chaos Theory Behind The Scenes: Sound Design" in-game extras featurette: https://www.youtube.com/watch?v=punciITHal8 (blocked here; its likely twin, bonus-disc diary 2, was transcribed).
- The G4 "Making Of" on the Collector's Edition: content not identified. [UNKNOWN - see 06-open-questions.md]

### 3.7 Creative director and lead programmer statements (interviews)

- **Globe and Mail interview** (Jason MacIsaac with Hocking and Lepage, 15 Apr 2005; the key design-intent source): three games in one; Sam stays central; co-op so friends can share the fiction "intimately"; pulling a friend in another city up a ledge; friends who aren't present feel real; co-op was originally the main mode, then SP was prioritised "in terms of market penetration" (Lepage); Versus delegated to the PT adversarial team (Annecy); Shanghai made PT in about one year in parallel; general goals (no trial-and-error/"Game Over" gating, meaningful low-level choices, sound/masking meter, navigation-mesh AI); dev length "two and a half years" (Hocking) and "the last two years" (Lepage). [ONE SOURCE: G&M]
- **Globe and Mail review** (29 Mar 2005): production timing (began around the same time as PT); up to four more co-op levels planned for Xbox Live. [ONE SOURCE]
- **Hocking blog "Ten years down"** (clicknothing.com, 22 Mar 2015): roles (CD around Alpha, under a Ubisoft mandate), Ferland as producer, The Chinh Ngo as art director, 24 months, GDC 2005 narrative talk. [ONE SOURCE]
- **PC Gamer "The making of Splinter Cell: Chaos Theory"** (Robert Zak; Hocking, Ferland and Tobin interviewed): Tobin hired after Ubisoft cut an internal gameplay video to his music; adaptive intensity forced tech innovation; each layer must be musically compelling alone; Ferland's "loop of emotion"; Hocking: no game over on alarms, the game adapts; ex-Nvidia programmer Danny Lepage unlocked Xbox shaders and normal maps; water and reflections chosen as the game's identity like shadow casting was for SC1; wet-suit sheen in rain is not a visibility factor; scenes collected as stick-figure "situation" sketches from the whole team. [ONE SOURCE: PC Gamer] (Audio parts: see 07-audio-and-atmosphere.md.)
- **Nintendo Power #190 (Apr 2005) Hocking interview** (cited by a Substack retrospective): "chaos theory" means small consequential actions (break a lock = fast but loud). [ONE SOURCE]
- **FRVR (Lewis White, c.2025, Hocking podcast interview):** modern diffuse/AO lighting is harder to read than old baked lighting; old clean lighting was readable (safe vs dangerous); the light gauge is a backup; stealth lighting should be "directed" like theatre lighting rather than realistic. [ONE SOURCE: FRVR]
- **Rock Paper Shotgun** (10 May 2016): Hocking and level designer Mathieu Berube replay the Bank level. [ONE SOURCE] (Co-op content not noted.)
- **Designer Notes podcast** (Hocking, episodes 43-44) and the **Tone Control** interview: not transcribed; may contain co-op remarks. Episode 44 description read only. [UNKNOWN - see 06-open-questions.md]
- **Ferland Q&As** (IGN, TotalVideoGames, Canoe/WHAM; pointers via Shacknews articles 34011, 33566, 33053): bodies not available; the IGN one covered co-op. [UNKNOWN - see 06-open-questions.md]
- **Later series directors:** Conviction co-op game director Patrick Redding said Conviction's stealth was built around Mark & Execute and Last Known Position; Conviction creative director Maxime Beland called CT "very hardcore". [ONE SOURCE: each, Wikipedia Conviction]

### 3.8 DLC authorship and production (Nuclear Plant and UN Headquarters, Xbox/PC only)

- **Authorship (inference only).** The Nuclear Plant script pattern names are Italian words (`Magazzino`, `PompaShow`, `bimbo`, `ciccio`, `nondirmelo`), suggesting an Italian (likely Ubisoft Milan) team made at least that download. The PC credits video does not list the DLC team. [INFERRED / UNCERTAIN: inference from identifiers] (OPEN_QUESTIONS R-12 notes: Nuclear Plant may be by another, Italian, studio.)
- **Placeholder voice cue.** Both DLC briefings point to the Panama briefing voice cue `Play_BRF_51_000_01Lam`, which looks like a placeholder. [ONE SOURCE: game files]
- **Text-only handler.** Lambert is silent in both downloadable missions: his briefing and in-mission lines appear only as on-screen text with no voice, explained by commenters as the late DLC not getting new recordings. [CONFIRMED - several sources: YouTube comments on hexen2k7 1/3 and PleasePlayMore #17 + Reddit v5jncz + Steam threads 828925849173270181 and 45350245387206844] Design note: the two finale missions run on text-only handler comms. [ANALYSIS]
- **Native sounds option.** On PC 1.05 the DLC maps lack the "Use native languages" sound option; enabling "Use native sounds" made the info screen vanish and killed ambient and enemy voice on these two maps. [CONFIRMED - several sources: patch notes + Steam thread]
- **Designer triggers (Nuclear Plant).** In the XBDLC level package (`.../LMaps/05_NuclearPlant/05_NuclearPlant.lin`), messages fire when players approach the security doors before opening them, when they are on the stairs to the turbine room, when they are on the footbridge outside the Lab, and when they access the archives (completes objective OBJ_55_P_20; co-op mission number 55). [ONE SOURCE: level package]
- **Designer comments (UN HQ).** Lethal force on UN guards and civilians not allowed; mission aborted if a general alarm is called; emergency doors open only from the inside. Killing a guard or civilian triggers an immediate abort (five separate kill-check patterns); a general alarm gives "mission over". Designer comments: game over when players kill guards or civilians, and game over when one of the alarms is activated. [CONFIRMED - several sources: XBDLC + PC105 text and comments]
- **Other designer comments (base maps, XB477):** Seoul: dropping Jong near the truck = mission success; Chemical Bunker: a message fires at the Zodiac if objectives are incomplete; Train Station: Chu must not be killed early (mission fails), and after the locker stage a script allows killing or knocking him out (no text shows him dying after interrogation). [ONE SOURCE: XB477 designer comments] (See the 01 level files.)
- **Publisher pitch (July 2005).** Nuclear Plant: claustrophobic passages alternating with massive open spaces, loud machinery, puzzles that need cooperation. UN HQ: "no room for kills or alarms". [Ubisoft PR - one origin, reprinted by three outlets]
- **Release and order:** see 3.3 (Xbox 24-25 Aug 2005, Mission and Elite only; PC 19 Oct 2005, patch 1.05, Mission mode only; Xbox order Nuclear Plant 6th then UN HQ 7th; PC lists UN HQ first). Whether the PC requires an Elite unlock for the DLC is not stated in the PC patch notes. [UNKNOWN - see 06-open-questions.md] Whether the Steam/Ubisoft Connect build ships pre-patched to 1.05: not confirmed. [UNKNOWN - see 06-open-questions.md]

### 3.9 Relation to other Splinter Cell co-op and to Annecy's later work

- **Pandora Tomorrow (2004, Shanghai; Versus by Annecy):** no co-op campaign, only Spies vs Mercs. CT's co-op was new to the series. [CONFIRMED - several sources: Fandom "Cooperative" + Green Man Gaming + Guinness]
- **Double Agent (2006):** two different games. The old-gen version (Xbox/PS2/GC/Wii, Ubisoft Montreal) has co-op missions tied to the story, again with Agent One and Agent Two (second assignment in 2008, supporting Sam undercover in the JBA). The 360/PS3/PC version (Shanghai, with Milan per Wikipedia) has no story co-op, only co-op challenges. [CONFIRMED - several sources: Wikipedia DA page + Fandom + ScreenRant + Green Man Gaming] Agent One/Two continuity: [CONFIRMED - several sources: Fandom + ScreenRant]
- **Conviction (2010, Montreal):** a separate co-op prologue with Archer (Third Echelon) and Kestrel (Voron), 10 days before the campaign, ending with the two players fighting each other, plus Deniable Ops modes. [CONFIRMED - several sources: Wikipedia Conviction; Fandom; ScreenRant for structure] Redding and Beland quotes: see 3.7. [ONE SOURCE]
- **Blacklist (2013, Toronto lead):** Sam and Briggs co-op missions given by Paladin crew members (14 total, split-screen). Wikipedia says Ubisoft Shanghai developed the co-op mode [ONE SOURCE]. Spies vs Mercs returned. A search snippet claims Annecy built Blacklist's multiplayer [INFERRED / UNCERTAIN].
- **Ubisoft Annecy afterwards:** known for the multiplayer of several Splinter Cell games; later led Steep (2016) and Riders Republic (2021) and supported The Division 2. [ONE SOURCE: Wikipedia list of Ubisoft subsidiaries] No source links Annecy to CT's co-op (as opposed to Versus).
- **Fandom wiki:** says co-op appears in CT, DA (v2), Conviction and Blacklist, but not DA v1. [ONE SOURCE]
- **Rereleases:** PS3 Classic Trilogy HD (2011) dropped co-op and Versus; 3DS Splinter Cell 3D (2011) has no multiplayer; Xbox One/Series BC (2019) includes all DLC; Steam/Ubisoft Connect store text says MP/co-op no longer functional. [CONFIRMED - several sources]

### 3.10 Development gaps

- No GDC talk, Gamasutra/Game Developer postmortem, or "oral history" about CT co-op or Annecy's Versus was found. The search budget ran out before GDC Vault could be searched directly.
- The IGN, TotalVideoGames and Canoe/WHAM Ferland Q&As could not be read.
- Designer Notes (eps. 43-44) and Tone Control not transcribed.
- Why the co-op uses a separate story with trainees, why objectives are split, and how AI handles two players: no developer statements found. [UNKNOWN - see 06-open-questions.md, R-06]
- The G4 "Making Of" content is unknown; YouTube transcripts were blocked (Google "sorry" rate-limit page).
- Whether and how the Xbox DLC "maps missing from level select" launch issue was fixed. [UNKNOWN - see 06-open-questions.md]
- Further searches (GameSpot co-op hands-on full text, TeamXbox co-op overview, OXM/Edge print) need a follow-up.

---

## 4. Wow moments: what players remember, the taxonomy and the recipe

What made players and critics react with "that was so cool" in the CT co-op (all platforms unless noted; most evidence is Xbox/PC), and the ingredients behind each type so they can be built on purpose. Evidence: reception (section 1-2), the mission breakdowns (the beats themselves), music and atmosphere. Where a moment is named by players or critics, it is tagged by that evidence. Where the researchers only infer that a documented beat is a "wow", it is marked [INFERRED / UNCERTAIN: inferred].

### 4.1 What players and critics actually named

| Moment type | Named by | Confidence |
|---|---|---|
| Throwing your partner (over lasers, across gaps, *into guards*) | Steam ("throw your buddy at guards", "tomoe nage the entire co-op campaign"); Eurogamer ("Long Jump"); GameRevolution; fan videos ("Operation Throw Torgos"); Reddit (signature memory; shouting its name); PS2 commenter thrown at the enemy | [CONFIRMED - several sources] |
| Upside-down rope dangle and neck-break (Hangover) | Eurogamer's favourite; Steam | [CONFIRMED - several sources] |
| Boost and human ladder | Eurogamer; Pocket-lint; NWR ("like Chinese acrobats") | [CONFIRMED - several sources] |
| Simultaneous wire cuts / bomb defusal | NWR; Elder-Geek; reception summaries | [CONFIRMED - several sources] |
| Coordinated double takedowns ("co-op ambushes") | TeamXbox; Globe and Mail; GameRevolution; Steam; Reddit 1df5iet | [CONFIRMED - several sources] |
| Guards hearing your real voice; whispering; luring by talking | TeamXbox; GameSpot hands-on; Steam (x4); Reddit mngqa0, vpwdry, 1e9pwjx | [CONFIRMED - several sources] |
| Jam a camera while your partner runs | NWR; GameSpot first look | [CONFIRMED - several sources] |
| Parallel story: hearing the solo hero's campaign from the co-op side | Elder-Geek; Steam (x9) | [CONFIRMED - several sources] |
| The chimp in the bunker lab (Java; "monkey behind a window"; the scientist's line about looking after the monkeys) | Steam; several video titles (MintyJonesGaming "Not the Monkey Window"); Reddit 1ouonhz | [CONFIRMED - several sources] |
| Emergent comedy: door slams on your partner, physics mishaps, yelling about alarms | Steam | [ONE SOURCE: Steam] |
| Seoul as the best mission | GameSpot (snippet) | [ONE SOURCE: GameSpot snippet] |
| Failing, then rescuing: one agent drops in front of a guard, the other clears the room and revives him, then the pair's cocky line ("Damn we're good") plays | Reddit (several threads: 1megyet, 1ouonhz, 6lzq8e) | [CONFIRMED - several sources] |
| Chemical mixing, the crane with a spotter, and the missile disarm in the bunker (the three "mini-games"); failing the disarm causes a huge explosion with ragdolls everywhere | Reddit 1ouonhz | [ONE SOURCE: Reddit] |
| The Train Station bomb as the tensest beat (and the most-asked "how?") | Reddit 1m8z5gm; 6+ video comments | [CONFIRMED - several sources] |
| Coordinating wordlessly with a stranger, by miming and jumps | 3 YouTube comments | [CONFIRMED - several sources] |
| Talking into the mic to lure a guard | Reddit (several threads) | [CONFIRMED - several sources] |

### 4.2 Taxonomy of wow types and their ingredients (W1-W11) [ANALYSIS, with CT evidence as tagged]

**W1. Choreographed two-body move**
- Examples (CT): partner throw over a laser; boost plus human ladder into a window; upside-down hack through a ceiling; shoulder-stand demolition.
- Ingredients:
  1. A *physical* animation that needs both bodies and reads at a glance, so even a spectator understands it.
  2. A clear handshake: one initiates, the other completes, with an audio cue.
  3. A payoff the pair could not have reached alone: height, gap or reach.
  4. Optional danger, such as a guard below or a laser beneath.
- Amplifiers: the move doubles as an attack (the throw knocks out a guard at the landing spot, and the hanging agent neck-snaps a guard below); the move puts one player's life in the other's hands (the rope holder).
- Evidence: [CONFIRMED - several sources: section 4.1]

**W2. Synchronised moment ("3... 2... 1... now")**
- Examples (CT): simultaneous wire cut on laser-linked bombs; paired retinal scanners; double takedowns; two-station mixing.
- Ingredients:
  1. The players are separated by space or a barrier, so neither sees the other's device.
  2. A visible stake: a bomb, a lethal gas, or an alarm if it fails.
  3. A shared countdown spoken by the players themselves.
  4. Instant, legible success feedback.
- Amplifiers: hidden information that only one player can see (thermal vision reveals the live wire, so each tells the other what to cut); a live wire that changes over time [ONE SOURCE: FAN notebook text].
- Evidence: [CONFIRMED - several sources]

**W3. Voice as a game object**
- Examples (CT): whispering past a guard; deliberately shouting to lure one.
- Ingredients:
  1. Real microphone input heard by the AI within a small, consistent radius (CT default about 2 m, adjustable).
  2. Ambient noise that can cover voice.
  3. A tool use: the voice works as a lure.
- Why it wows: it breaks the fourth wall. The players' social behaviour becomes stealth behaviour.
- Evidence: [CONFIRMED - several sources]

**W4. Near-miss and ghost pass**
- Examples (CT): a guard walking directly beneath a hanging agent; passing a turret while the partner's jammer charge drains; waiting motionless on a walkway while the target and his bodyguard stop right beside you (PS2/GC Train Station, The Station sub-level). [Beats ONE SOURCE: PRIMA; "wow" INFERRED / UNCERTAIN: inferred]
- Ingredients:
  1. The threat comes very close but cannot see you, and you *know* it cannot.
  2. A visible timer or resource running down, such as jammer charge.
  3. The partner is the one keeping you safe.
- Why it wows: shared relief and a story to retell. Readable detection is essential; otherwise near-misses feel like luck.

**W5. Dramatic entrance or exit**
- Examples (CT): zip line into a temple courtyard in a war zone (Seoul, Xbox/PC); descending a missile silo by rope (Chemical Bunker); entering a tower from the roof at night (UN HQ); smashing through a glass dome onto an escaping train (the original Train Station finale, Xbox/PC); flagpole slide (PS2/GC Panama). [Beats CONFIRMED / ONE SOURCE per the 01 level files; "wow" INFERRED / UNCERTAIN: inferred]
- Ingredients:
  1. A change of altitude.
  2. A view or reveal of a large space.
  3. Momentum: a slide, a fall, a leap.
  4. A clear "chapter" boundary.

**W6. Verticality and the "ceiling route"**
- Examples (CT): entering a guarded room from above; using roof hatches, ducts and floor holes as the pair's private network.
- Ingredients:
  1. Guards who watch doors and floors, not ceilings.
  2. A visible opening that rewards looking up.
  3. A co-op move needed to use it.
- Caution: the same pattern caused the most stuck points when the tell was weak (see section 5, A3).

**W7. Twist and reveal**
- Examples (CT): the target is a body double (Seoul); the archive was wiped (Panama); a bugged phone call reveals a contaminated soldier (Train Station); the villain already holds the security room (UN HQ); the detonator count reveals one bomb left (Nuclear Plant: four detonators were delivered). [Twists CONFIRMED - several sources; "wow" INFERRED / UNCERTAIN: inferred]
- Ingredients:
  1. Information delivered in-world: an interrogation, an overheard call, an email.
  2. An objective rewrite that sends the pair somewhere new.
  3. A moment of shared surprise. Both players learn it together.

**W8. Environmental reveal and landmark**
- Examples (CT): looking down into the missile storage hall long before entering it (Chemical Bunker); the great concourse of a rail terminal after an underground ascent (Train Station); two buildings linked by a footbridge (Nuclear Plant).
- Ingredients:
  1. A long sightline from a safe spot.
  2. A large, recognisable real-world space.
  3. A promise ("you will go there") that is later kept.

**W9. Character and absurdity**
- Examples (CT): Java the chimp and her emails (the counting-chimp email adds dark humour); guard small talk (broken-English small talk, knife-point interrogations "like a radio drama"); "throw your buddy at a guard" as slapstick.
- Ingredients:
  1. A small, surprising, humane detail in a grim place.
  2. Systemic slapstick, where physics and co-op moves combine unexpectedly.
- Evidence: [CONFIRMED - several sources: for the chimp and humour]

**W10. Emergent co-op comedy and drama**
- Examples (CT): door-slamming your partner; blaming each other for alarms; a botched sync that leads to a scramble. [ONE SOURCE: Steam] (Reddit adds the zip-line drop, revive and "Damn we're good" story: CONFIRMED - several sources.)
- Ingredients:
  1. Systems with physical consequences.
  2. Recoverable failure: escalation, not instant game over.
  3. Players who can talk.

**W11. Crossover with the wider world**
- Example (CT): hearing the solo protagonist working in parallel over the radio (Seoul: Sam interrogates a soldier and the trainees assume his name is a call-sign). [CONFIRMED - several sources]
- Ingredients:
  1. Two storylines in one world, with timed cameo dialogue.
  2. A small but meaningful dependency: he gives the intel you need.

### 4.3 How to manufacture wow moments deliberately (the recipe) [ANALYSIS]

For each mission, plan **at least one** moment from each of three families:

| Family | Types | Requirement |
|---|---|---|
| **Body** | W1, W5, W6 | A two-body move or entrance that is spectacular *and* solves a real problem |
| **Sync** | W2, W4 | A countdown or near-miss where each player protects or completes the other |
| **Story** | W7, W8, W9, W11 | A reveal or landmark delivered in-world |

Quality checks for each planned moment:
1. **Spectator test.** Would someone watching over a shoulder understand what happened?
2. **Agency test.** Is it triggered by player action (not a cutscene)? Can it fail?
3. **Mutual-need test.** Does each player have a real job in it?
4. **Readability test.** Can both players read the danger before committing?
5. **Retell test.** Can a player describe it in one sentence afterwards ("I threw him over the laser onto the guard")?
6. **Repetition test.** It must not be a repeat of an identical beat in the same mission. Signature set pieces appear once; verbs can repeat.

### 4.4 Moments that misfired (wow turned into frustration)

| Moment | Why it misfired | Evidence |
|---|---|---|
| Cryo mixing (Chemical Bunker) | Lethal gas, a precise sequence, and input failures on PC | [CONFIRMED - several sources: NEO, JV, Steam, AT] |
| Upside-down hack | Lost its magic when players couldn't find *where* to start it (Panama Xbox/PC grille, PS2/GC East Wing vent) | [CONFIRMED - several sources: JV, NEO, Supercheats excerpts] |
| Machine-state puzzle (Nuclear Plant fans) | Confused players who couldn't read the machine's state | [ONE SOURCE: forum titles and excerpts] |
| Scripted takedown moves | Felt like "press button, watch animation" to some players | [CONFIRMED - several sources: Steam, podcast, GameSpot snippet] |
| Train Station bomb defusal (PC) | The shared device screen inputs were unclear; players clicked the wrong wire together | [CONFIRMED - several sources: AT 2008 + 6+ YouTube comments] |

**Lesson.** Moves need room for player expression: choosing *where* and *when* to use them, not only *that* they are used. [ANALYSIS]

### 4.5 Wow moments per mission (from the mission breakdowns)

- **Training (Xbox/PC):** no training-specific player commentary was found. The moves introduced here are the ones reviewers later celebrate: the partner throw, the upside-down hack and the jam-and-run [ONE SOURCE: NWR and general reviews]. The first throw over a laser is the mode's signature moment, and here it is the third thing players do. [ANALYSIS]
- **Panama (Xbox/PC)** [INFERRED / UNCERTAIN: no Panama-specific player quotes found; inferred from mechanics reviewers praise]: using the corrupt official himself as a living key in a two-man forced retinal scan; hacking upside down inside a duct to open gates for the rest of the level; the balcony shimmy hand-over-hand along a ledge above a double-height hall; ghost runs ("100% Elite No KO/Kill") show the level can be cleared with zero knockouts, which demonstrates route depth [ONE SOURCE: video title]. Panama is named a favourite by one Reddit player [ONE SOURCE: RD ijtifz].
- **Panama (PS2/GC)** [INFERRED / UNCERTAIN: inferred]: zip line from the fire escape; trapdoor charge blown from a partner's shoulders; beam crossing above a laser floor watched by a drone; flagpole slide; upside-down fuse retrieval.
- **Seoul (Xbox/PC, "Seoul 3"):** parallel-campaign crossover, a reviewer singled out hearing the solo hero during the co-op mission [ONE SOURCE: EG]; war-zone atmosphere cited as a favourite, though this may refer to the solo mission [ONE SOURCE: Steam; ambiguous]; showpiece beats [present CONFIRMED; "wow" reaction not sourced]: the zip line into the temple courtyard, demolishing a missile vehicle from a partner's shoulders, stunning the target through a window from outside, the door-bash and smoke breach; one reviewer reportedly named Seoul the best co-op mission [ONE SOURCE: GameSpot snippet]; Seoul 3 named a favourite by a Reddit player [ONE SOURCE].
- **Chemical Bunker (Xbox/PC):** Java the chimp (players remember the "monkey behind a window", video episodes are named after her; the counting-chimp email adds dark humour) [CONFIRMED - several sources: Steam + several videos]; cryo mixing, the most-discussed co-op puzzle of the mission, with lockstep teamwork and lethal stakes, splitting opinion between wow and frustration [CONFIRMED - several sources: as most-discussed]; crane and wire cut, where communication itself is the mechanic [feature ONE SOURCE; reaction not found; Reddit names the crane-with-spotter as a favourite mini-game]; physical showpieces: the silo descent and the throw over the cryotank [CONFIRMED - several sources: as present].
- **Train Station (Xbox/PC):** throwing a partner over a bomb's laser onto a guard [ONE SOURCE]; the two-person defusal with a laser tripwire and a live wire that moves, reviewers highlight synchronized wire cutting [CONFIRMED - several sources: EG, reception.md]; bugging the payphone, hanging upside down from the roof of the central booth in a vast hall, then eavesdropping on the villain [ONE SOURCE]; trapdoor drop onto a guard [ONE SOURCE]; one-man entry into a contaminated room [CONFIRMED - several sources]; exit by smashing through a glass dome onto an escaping train [ONE SOURCE]. The bomb is the tensest moment in community memory (4.1).
- **Nuclear Plant (Xbox/PC download), candidates** [INFERRED / UNCERTAIN: all three; no player quotes beyond frustration found]: moving through a giant turbine hall and climbing out through a fan inlet once the fans are stopped; crossing the outdoor footbridge between the two buildings; the reveal that one bomb remains.
- **UN Headquarters (Xbox/PC download), candidates** [premise CONFIRMED; reactions not sourced]: night roof entry into one of the world's most guarded buildings under a strict ghost rule; the twist of finding the villain already in the security room; the race to a bomb hidden above a live assembly.
- **N-Gage/DS campaign (design reading only):** Breakdown, a mid-mission plot twist (the lift dies) that turns a transit section into a co-op puzzle; Corruption, forced entry through vents, the twist where they are detected and must escape through the ceiling, and the late rule change (doors unlocked, new extraction); Escape, the carry-out finale and turret-lined courtyard. [ANALYSIS] No review describes a specific handheld co-op moment. [UNKNOWN - see 06-open-questions.md, R-23]

---

## 5. Anti-patterns and frustrations

Three parts: Part A, what the CT co-op did badly (with its CT evidence); Part B, general stealth and co-op level failures from the design literature (S-numbers refer to sources in `research_notes/stealth_coop_design_literature.md`); Part C, unrealistic or illogical architecture and security and how to prevent it (R-numbers refer to sources in `research_notes/real_world_security_and_architecture.md`, not to the OPEN_QUESTIONS R-numbers). Part D is the quick red-flag list. The "Prevention" column is the researchers' design advice [ANALYSIS].

### 5.1 Part A - What the original did badly

| # | Anti-pattern | CT evidence | Confidence | Prevention [ANALYSIS] |
|---|---|---|---|---|
| A1 | **Full-mission restarts** in long missions, punishing with a weaker partner | EG review (no checkpoints; dying or botching an objective means a full restart); GameCube has no mid-mission save; Steam "only as good as the weakest link". Correction (R-07): Xbox/PC have manual Quick Save/Save/Load from the pause menu (waits for the partner; reloads only with the same teammate), so the complaint is about **automatic** checkpoints; PS2/GC save only between sub-levels | [CONFIRMED - several sources] | Encounter-level checkpoints. A downed partner becomes a rescue task before it becomes a reload |
| A2 | **Losing each other.** No partner marker; partners wander hunting for each other | Eurogamer PC review ("no map"); no partner marker documented anywhere. Correction (R-11 upgraded): every co-op map has a mission-device map page and intel updates both devices, so "no map" is at least partly wrong; the map legend has no teammate entry; whether the partner is shown is unknown | [CONFIRMED - several sources: for the complaint; absence of a marker ONE SOURCE] [UNKNOWN - see 06-open-questions.md, R-11] | Partner indicator (diegetic if possible), world pings, a shared map, and regroup gates |
| A3 | **Solutions placed above the problem without a tell** (Panama Xbox/PC ground-floor grille whose keypad is reached by hanging from the vent above; PS2/GC East Wing vent controlled by a distant computer and the cameras; Train Station lower platform via a washroom ceiling vent) | JV forum (many posters), Neoseeker and Supercheats excerpts | [CONFIRMED - several sources] | Visible cause and effect (cable runs, a lit panel, a sound when state changes); line of sight from the problem to the solution |
| A4 | **Unreadable machine state** (Nuclear Plant fans: what are they for? forum titles amount to "what is the fan for?" and an exasperated "AGH") | Neoseeker titles and excerpts | [ONE SOURCE: NEO] | Every machine shows its state in sight and sound, and its control is near or visibly linked |
| A5 | **Lethal precision sync puzzle** with trial-and-error deaths (Chemical Bunker cryo mixing) | Neoseeker, JV, Steam | [CONFIRMED - several sources] | Forgiving timing, clear feedback per input, non-lethal failure (alarm or reset) |
| A6 | **Sync inputs failing on one platform** (PC two-person objects did not register: mixing and wire-cut confirmations failed on PC while the same steps worked on Xbox) | 2 Steam threads + AnandTech 2008 | [CONFIRMED - several sources] | Test every two-person interaction on every input method; always have a fallback |
| A7 | **Optional intel silently guards a hard fail** (Seoul Xbox/PC: skip the optional email/computer, the boat stays unsabotaged, the target escapes by boat, mission over) | RYB + FAN RU | [CONFIRMED - several sources] | Hard-fail prevention needs two or more cues; better, make the chase recoverable |
| A8 | **Rating cap bug** (Seoul cannot exceed 90%; Chemical Bunker possibly 97%) | Steam + 5 videos; Reddit v5jncz (two players knocked out only the two required targets, fake and real Jong Pom-chu, no detection, still 90%; replies: objective knockouts don't count, known unfixed bug); PleasePlayMore description (some missions cannot reach 100% even when every condition is met) | [CONFIRMED - several sources: for Seoul; Chemical Bunker 97% INFERRED / UNCERTAIN] [UNKNOWN - see 06-open-questions.md, R-15 for the cause] | Automated objective-completion tests; a score audit per mission |
| A9 | **Moves bound to fixed spots feel scripted** ("elaborate keys"; "press button, watch animation") | GameSpot snippet; Steam; Retro Spectives podcast | [CONFIRMED - several sources] | Mix free moves with authored spots; give each move more than one use (traverse, attack, scout) |
| A10 | **Empty levels** (one dissent) | Eurogamer | [ONE SOURCE: EUR] | Density targets for encounters and set pieces per minute (see section 8) |
| A11 | **Too few missions / too short** | ~12 critics | [CONFIRMED - several sources] | Scope a campaign in line with expectations; plan post-launch content early |
| A12 | **Guards trip over each other and alert others** while players hide | EG | [ONE SOURCE: EG] | AI collision and perception QA; never raise alerts from AI-to-AI accidents |
| A13 | **Scripted lethal objective in a no-kill-rewarding game** (Train Station contaminated soldier) | PRIMA + FAN RU | [CONFIRMED - several sources] | Offer non-lethal alternatives, or explicitly exempt the beat and tell players |
| A14 | **Hidden countdown** (UN HQ bomb timer not shown; the controller warns at 20, 10 and 5 minutes and at 60 seconds) | FAN RU + game text | [ONE SOURCE: FAN RU for "not shown"; warnings CONFIRMED - several sources] | Show timers. Hidden timers feel unfair |
| A15 | **Stacked instant-fail rules** (UN HQ: general alarm, metal detector, lit windows, plus any kill) | FAN RU + LP title ("Suicide Central") | [ONE SOURCE: FAN RU] | One clearly communicated hard rule per mission at most; others escalate |
| A16 | **Ungrabbable named villain** (UN HQ colonel) breaks the established "grab the target" grammar | FAN | [ONE SOURCE: FAN] | Keep verb consistency, or signal the exception |
| A17 | **Music ambiguity.** Combat music outlives the fight, leaves players unsure whether they were seen, and drowns barks (alert music once drowned out a guard conversation the player was trying to overhear) | Steam; GameGrin diary pt 9 | [ONE SOURCE: each] | Music follows real AI state with short tails; duck music under barks |
| A18 | **Split-screen leaks information** and undermines "seeing around corners" | VideoGamer | [ONE SOURCE: VideoGamer] | Design for it: accept shared info, or use per-player fog |
| A19 | **Downloaded content not appearing / gated behind Elite completion** (Xbox: maps missing from level select at launch; Story must first be finished on Elite) | Xbox site edit (MN); GameSpot | [CONFIRMED - several sources] | Deliver new missions to everyone, ungated |
| A20 | **Tutorial assumes solo knowledge**; input ambiguity (crouch = boost, stand = throw; players stuck at the very first wall) | Steam; JV | [CONFIRMED - several sources] | Teach the handshake and context rules explicitly; a co-op tutorial must stand alone |
| A21 | **Online-only features with no preservation** (servers shut; PC needs VPN workarounds; config mismatches desync) | Steam corpus | [CONFIRMED - several sources] | LAN/direct-connect and peer-to-peer fallback; config parity checks at join |

### 5.2 Frustrations, exploits and flaws per mission (CT evidence)

- **Training (Xbox/PC):** stuck at the first wall, unsure whether to crouch or stand; the two-tier input (crouch = boost, stand = throw) was not obvious [ONE SOURCE: JV, several posts]; confusion over retinal-scanner hacking [ONE SOURCE: JV]; getting 100% requires a pointless panel re-read [CONFIRMED - several sources: V339 + FAN]; the tutorial teaches only co-op moves and assumes solo knowledge of the basics [ONE SOURCE: Steam]; possible progression bug, after a later mission the game reportedly reloaded Training instead of continuing [ONE SOURCE: JV; INFERRED / UNCERTAIN]. A PS2/GC first-time player was stuck at "the very first bit" (the first wall) [ONE SOURCE: YouTube comment].
- **Panama (Xbox/PC):** stuck points [ONE SOURCE: JV, many posters]: the ground-floor grille (players didn't realise its keypad is reached by hanging from the vent above), the balcony after the Hangover (players missed the ledge and jumped to their deaths), finding the server after the archive; shock bug, being shocked while hacking leaves an agent invisible but unable to open doors [ONE SOURCE: FAN]; no automatic checkpoints, only manual saves, which wait for the partner [CONFIRMED - several sources: EG + game files]; guards sometimes trip over each other and raise unearned alerts [ONE SOURCE: EG]; online no longer works (Ubisoft servers closed), PC players use LAN/VPN tools [ONE SOURCE: Steam discussions, search snippets].
- **Panama (PS2/GC)** [CONFIRMED - several sources: for the vent (JV + Neoseeker + Supercheats snippets); others ONE SOURCE]: East Wing vent, not obvious it is controlled by a computer and by the cameras; drone room, players couldn't reach the scanners without waking the drone; archive keypad, the keypad and its code are bugged; GameCube controls, some co-op inputs are hard to find. Jake "Ziggity" Steven calls the PS2 Panama ending anticlimactic because it was the first mission on Xbox/PC [ONE SOURCE].
- **Seoul (Xbox/PC):** rating cap, cannot be scored above 90% [CONFIRMED - several sources: a Steam thread and five independent video titles/descriptions], cause unknown [UNKNOWN - see 06-open-questions.md, R-15]; hidden failure trap, skipping an optional computer can leave the boat unsabotaged and the chemist then escapes for an instant fail [CONFIRMED - several sources]; medkit save bug, saving with a medkit cabinet open destroys the kit [ONE SOURCE: RYB]; a crash at the loading screen on PC [ONE SOURCE: Steam]. Possible mechanism for the cap (solo Seoul, by analogy only): solo players report 96% on solo Seoul with clean stats and blame soldiers already in combat mode spotting the player without a visible alarm, and grenades thrown into IFV hatches being counted as player-caused injuries; not tested for co-op Seoul 3 [INFERRED / UNCERTAIN: analogy; RD dgzg9g, 11u5vk4]. The "follow Chu to the locker" note in videos.md belongs to Train Station (below).
- **Chemical Bunker (Xbox/PC):** PC two-person input failures, unable to confirm mixing or wire-cut inputs while the same steps worked on Xbox [CONFIRMED - several sources: 2 Steam threads + AT]; microphone dependence, one player said syncing is not really possible without a mic, and the game relaxes sync timing online without headsets [ONE SOURCE: each]; trial-and-error deaths at the cryotank, softened by revive [ONE SOURCE: NEO]; possible rating cap, two independent "100%" runs are titled 97% [INFERRED / UNCERTAIN] (R3xXcoN got 97% without being detected; PleasePlayMore "Expert 97% (Glitch?)"; TrayZorXx67 "100%-(97%)"); exploits, one agent can run between both cryo stations alone, and a player can drop down a shaft onto the partner and be revived, skipping a lift [ONE SOURCE: FAN RU]; serum vial count differs between sources [UNKNOWN - see 06-open-questions.md, R-16]; the missile-hatch glitch (Steam) [ONE SOURCE]; a PC crash two or three rooms after the laser hallway [ONE SOURCE: RD 1ouonhz]; Chemical Bunker on PS2 "took months" for some pairs [ONE SOURCE].
- **Train Station (Xbox/PC):** PC defusal controls, players unsure how to operate the dual-defuse interface on PC [ONE SOURCE: AT]; the way to the lower platform is through a washroom ceiling vent and players got stuck finding it [ONE SOURCE: Neoseeker snippet]; confusion over HUD symbols, probably the alarm counter [ONE SOURCE]; scripted lethal beats (the soldier, and possibly the agent Chu) clash with no-kill play [CONFIRMED - several sources: for the soldier]; speedrunners skip most of the phone call [ONE SOURCE]; some missions may have glitches that block 100% [ONE SOURCE: PleasePlayMore]. The "follow Chu to the locker" opportunity looked impossible: letting him open the locker ended the mission, and stopping him earlier did not count [ONE SOURCE: BK201Tach]. A split-screen bloopers video describes a control quirk around Chu: a non-lethal button press sometimes became a lethal kill, which failed the mission [ONE SOURCE: BK201Tach BdwhJtGy7a8]. A commenter got stuck "after killing the infected guy" (the infected soldier) [ONE SOURCE]. R-17 note: Suru's two players show 0 kills (one 0 KOs, the other 2 KOs) and 100% while their timestamp list labels the 10:56 beat "Killing Chu", so whatever happens to Chu is not counted as a player kill; with Fandom RU ("always dies") this suggests a scripted death after the interrogation [INFERRED / UNCERTAIN: leaning "Chu dies, scripted"]; the game files show Chu must not be killed early (mission fails) and after the locker stage a script allows killing or knocking him out, with no text showing him dying [ONE SOURCE: XB477 designer comments].
- **Train Station (PS2/GC):** Jake "Ziggity" Steven judges Hydro Tunnel (sub-level 2) hardest on PS2, because a camera guards the laptop for the opportunity objective and the last room has two patrolling guards around the final bomb; he rates Seoul and Panama easiest [ONE SOURCE].
- **Nuclear Plant (Xbox/PC):** the fan puzzle stumped players [ONE SOURCE: forum titles and excerpts]; maps missing from the Xbox level select at launch [CONFIRMED - several sources]; one PC language version reportedly breaks door unlocking [ONE SOURCE: PCGamingWiki snippet]; players call it the hardest and longest co-op mission, with a confusing layout and many sub-objectives [ONE SOURCE: each]; speedruns use an invisibility glitch, so they are not evidence of the intended route (one player fakes lock-picking a door while the partner tasers him, which leaves the model stuck and the player practically invisible, "becoming a ghost") [CONFIRMED - several sources: YouTube comments on B8z_7lUW6XI, yEjHJb-SpjQ, gOn-T6LlNHk]; PC disconnecting immediately (Panama and Nuclear Plant) [ONE SOURCE].
- **UN Headquarters (Xbox/PC):** stacked instant-fail rules (one Let's Play episode is subtitled "Suicide Central") [weak signal]; hidden countdown [ONE SOURCE]; ungrabbable villain [ONE SOURCE]; maps missing from the Xbox level select at launch [CONFIRMED - several sources]; "those little wires" at the final bomb [ONE SOURCE].
- **N-Gage/DS:** finding a nearby partner with the same game and hardware [CONFIRMED - several sources]; Escape's room and courtyard ambushes are hard to avoid [ONE SOURCE: FW]; other per-part frustrations not found [UNKNOWN - see 06-open-questions.md, R-23].

### 5.3 Part B - General stealth and co-op failures (from the literature) [background, not CT facts]

| # | Anti-pattern | Why it hurts | Source (literature notes) | Confidence |
|---|---|---|---|---|
| B1 | Trial-and-error / instant fail | Players learn rules by dying and stop experimenting | Bycer S68; Smith S43; Mark of the Ninja S1 | [CONFIRMED - several sources] |
| B2 | Unreadable detection | Failure feels unfair; no planning possible | S1, S5, S8, S9, S10 | [CONFIRMED - several sources] |
| B3 | AI that cheats (knows where you are without perceiving you) | Breaks the player's model | Thief S5; Halo 2 S12 | [CONFIRMED - several sources] |
| B4 | No zero-failure path in an encounter | Stealth "doesn't work" | Smith S43 | [ONE SOURCE: S43] |
| B5 | Area not actually well guarded, or loud play is easier | Stealth becomes pointless | Smith S43; Bycer S68 | [CONFIRMED - several sources] |
| B6 | Perceived-affordance mismatch (a lit "safe" balcony; a dark but noisy floor) | Players avoid good spots or get caught unfairly | Smith S43 | [ONE SOURCE: S43] |
| B7 | Unintended stealth properties (noisy tiles, doors and stairs nobody tuned) | Difficulty drifts | Smith S43 | [ONE SOURCE: S43] |
| B8 | Oversized, unmappable spaces | Players get lost and cannot plan | S1; Hitman Paris S45; Dishonored S62 | [CONFIRMED - several sources] |
| B9 | Long, narrow, winding passages | Disorientation | Dishonored S62 | [ONE SOURCE: S62] |
| B10 | Static, memorised encounters in co-op | One optimal plan; the pair races; cooperation collapses | Left 4 Dead S15 | [ONE SOURCE: S15] |
| B11 | Co-op bolted onto a single-player design | One player watches the other | Hazelight S27/S28; reviews S74 | [CONFIRMED - several sources] |
| B12 | One player idle while the other acts | Boredom | S74, S75; Fares S29 | [CONFIRMED - several sources] |
| B13 | A "co-op" puzzle one player can solve alone | Not real co-op | Portal 2 S24 | [ONE SOURCE: S24] |
| B14 | Spatial communication without tools | Minutes lost explaining "here" | Portal 2 S24 | [ONE SOURCE: S24] |
| B15 | The session ends when one player drops | Lost progress | Castle Crashers S71 | [ONE SOURCE: S71] |
| B16 | Overpowered remote tools | Trivialise solutions | Gunpoint S56 | [ONE SOURCE: S56] |
| B17 | Escape routes that lead into more guards ("frying pan into fire") | Unfair chases | Smith S43 | [ONE SOURCE: S43] |
| B18 | Gamey limit rules with no fiction | Feel arbitrary | Payday pagers S19 + forum | [INFERRED / UNCERTAIN] |
| B19 | Coordination the player cannot perceive | AI looks dumb or omniscient | F.E.A.R. S10 | [ONE SOURCE: S10] |
| B20 | Randomness inside a moment the player is reading | Unfair; plans break | Inference from S15 + S43 | [ANALYSIS: design inference] |

CT cross-references [ANALYSIS]: B13 matches the CT exploit where one agent can run between both cryo stations alone (Chemical Bunker); B14 matches A2 (losing each other); B15 matches the N-Gage/DS rule that a dropped player cancels the session for lack of players; B10 is the risk the PS2/GC "co-op as gating" repetition runs.

### 5.4 Part C - Unrealistic or illogical architecture and security [background design rules; CT examples where given]

CT's strength was rooms with obvious functions. The failures below are common in stealth games generally. Each prevention rule is grounded in real-world practice from `research_notes/real_world_security_and_architecture.md` (R-numbers here are that file's sources).

**C1. Rooms with no purpose.**
- Symptom: empty "connector" rooms, or rooms whose only reason to exist is a puzzle.
- Prevention: every room gets a real function, an occupant schedule (who uses it, when) and a reason for its contents; facility types have known room programmes (office tower, data centre, lab, hospital, port, hotel and so on) [R41-R64]; puzzles must be expressed through the room's function: a lab fridge, a crane bay, a server room (all CT examples).

**C2. Corridors to nowhere and illogical circulation.**
- Symptom: dead-end corridors, missing stairs, one-way buildings.
- Prevention: real buildings limit dead ends to about 4.5-6 m before an alternative or protection is needed [CONFIRMED - several sources: ADB R27, OSHA R28]; real buildings provide two or more separated exit routes and protected stair cores; travel distance to an escape route is typically 18-45 m in offices [R27]; use these as layout constraints, which also create believable alternative routes.

**C3. Security a real facility would never use (or would never omit).**
- Symptoms: lasers in an office corridor with no explanation; cameras covering nothing important; a vault behind a single keypad; a server room with no access control.
- Prevention: assign a security tier from mission criticality, symbolism, population, size and threat [ISC R8]; layer security from deter, detect, delay to respond across zones (beyond the perimeter, the perimeter, the site, the building, the asset) [NPSA R1-R6]; high-value spaces use two-factor access, mantraps or dual control [R11-R16]; exotic devices need a written justification in the fiction. CT example: the original justified its Panama laser grid with an in-level email complaining about the grid breaker's placement.

**C4. Doors that defy fire code.**
- Symptoms: exit doors locked from inside; a maglocked door that stays locked during a fire alarm; a revolving door with no side door.
- Prevention (realistic and also design gifts): escape doors open from inside without a key [CONFIRMED - several sources: R27, R28]; electric locks release on fire alarm or power loss [R27]; turnstiles and revolving doors have adjacent swing doors [R27]; exits are "easy out, hard in", which makes them one-way shortcuts; pulling a fire alarm unlocks maglocks, with consequences (an evacuation, a response). CT example: UN HQ emergency doors open only from the inside (true of real fire exits). [CONFIRMED - several sources: game text]

**C5. Impossible vents.**
- Symptom: person-sized ducts linking every room.
- Real-world facts: real ducts are mostly too small; they run as vertical shafts branching into small horizontal ducts, with fans and grilles [CONFIRMED - several sources: Kotaku architect S72 + PC Gamer S73].
- Prevention: use real crawlable spaces (ceiling voids and plenums, raised floors, service risers, cable trays, mechanical floors, loading docks, maintenance catwalks) [R41-R44]; limit ducts to large air-handling trunks near plant rooms.

**C6. Inconsistent scale.**
- Symptom: doors two metres wide in an office; stairs with giant steps; corridors that change width for no reason.
- Prevention: use a dimension sheet, and scale player movement to these, not the reverse.

| Element | Typical figure | Source |
|---|---|---|
| Door clear width | about 0.8-0.9 m | ADA R29 |
| Headroom | 2.0 m minimum | ADA, ADB K R29/R30 |
| Stair rise | about 150-180 mm | R29, R30 |
| Stair tread | 250-300 mm | R29, R30 |
| Escape route width | 0.75-1.05 m+ by occupancy | ADB R27 |
| Accessible route | 0.915 m, with passing places | ADA R29 |

**C7. Illogical guard behaviour and staffing.**
- Symptoms: guards patrolling empty corridors forever; no control room; every guard instantly knows everything.
- Prevention: real guards run tours with checkpoints and time windows, and a missed checkpoint raises a supervisor alert, which gives a realistic "absence" detection mechanic [R34]; a control room tracks intruders on CCTV and directs responders [R4, R5] (CT example: the UN HQ security control room as the hub); staff challenge strangers [R2]; alarm response is a *chain*: a single sensor trip is ambiguous; cross-zone confirmation or video verification follows; then an operator call, then a keyholder or guard check, then police; response delays are real [R31-R33].

**C8. Cameras placed by decoration.**
- Symptom: cameras that watch walls, or cameras that identify faces from 50 m.
- Prevention: real CCTV has *detect / observe / recognise / identify* ranges [CONFIRMED - several sources: R23, R25]; identification needs close, narrow coverage (entrances, tills); cameras go blind with glare, back-lighting, deep shadow and rapid light change [R23]; use these as readable rules for camera cones.

**C9. Sensors with no logic.**
- Symptom: motion sensors in occupied daytime lobbies; laser beams indoors at random heights.
- Prevention: use real sensor types with known mounting and weaknesses [CONFIRMED - several sources: R14, R21, R22]: door contacts; PIR or dual-tech sensors at about 2.3 m in corners; glass-break sensors; vibration sensors on cases and walls; IR beams mostly outdoors at 0.6-1.8 m. Systems are **armed when spaces are empty** and **supervised**: cutting a wire raises a fault, not silence [R14, R31].

**C10. Facility that never "lives".**
- Symptom: no sense of daily operation (no deliveries, shifts, cleaners or maintenance).
- Prevention: the mission template (Phase 4 of the research pack) requires a day-in-the-life: opening and closing routine (the last person out sets the alarm [R32]); deliveries via the loading dock; maintenance; night staff. Shift patterns are not well sourced (a gap), so treat them as design assumptions and state them.

**C11. Weak-side syndrome.**
- Symptom: a hardened front door, but an open skylight the size of a truck.
- Prevention: real guidance asks for *balanced delay* on all sides of an asset [R6]; any weak side the players exploit (a vent, a roof hatch, a maintenance window) should be explained as a known flaw (an ongoing renovation, an under-funded upgrade, a lazy contractor). That explanation is then a story beat.

**C12. Signage that tells the intruder everything.**
- Symptom: a "SERVER ROOM" arrow sign in a secure facility.
- Real-world fact: real secure sites avoid signposting critical rooms [R4, R5].
- Prevention: navigation must come from building logic, intel and landmarks, not convenient signs. Public buildings may still have public signage.

### 5.5 Part D - Quick red-flag list (used by the research pack's level review checklist)

- A room you cannot name the purpose of.
- A route that exists only because the designer needed it.
- A security device with no reason to be there, or a valuable room with no security.
- A locked exit door on the inside.
- A crawlable duct smaller than a person, or used everywhere.
- Inconsistent door, stair or corridor sizes.
- A solution placed out of sight of its problem with no tell.
- A puzzle one player can solve alone (when it's meant to be co-op).
- A stretch where one player has nothing to do for more than about 60 seconds.
- A hidden timer.
- Instant fail with no warning.
- A move used only once, in only one way.

---

## 6. Level-design patterns (P1-P25) with CT instances

Reusable patterns identified in the CT co-op missions. The pattern names, descriptions, "why it works" and diagrams are the researchers' reading [ANALYSIS]; the "where it appears" instances carry their evidence tags. Any route step that rests on a single guide is [ONE SOURCE: PRIMA]. Source: 08_level_design_patterns.md, built from the mission breakdowns, the bonus-disc level-design diary and the design literature.

**Diagram legend**

| Symbol | Meaning |
|---|---|
| `A` / `B` | The two players |
| `G` | Guard |
| `C` | Camera |
| `L` | Laser / tripwire |
| `D` | Door |
| `S` | Switch / scanner / device |
| `X` | Objective |
| `#` | Wall |
| `~` | Gap or hazard |
| `^` / `v` | Up / down |
| `=` | Route |
| `..` | Darkness |

### 6.A Two-player structure patterns

**P1. Split-path-and-sync (rendezvous lock)**
- Description: two devices that must be worked at the same moment, placed so that each player must reach one by a different path or from a different side. The pair splits and then meets in time at the devices, even if not in space.
- Why it works: splitting creates independence and tension. The sync creates a shared climax, and it is impossible to solve alone. It also has real-world logic: dual control and the two-person rule.
- Where it appears (CT): paired retinal scanners in Training, Panama and Chemical Bunker [CONFIRMED - several sources]; laser-linked twin bombs in Train Station [CONFIRMED - several sources]; the warhead wire cut (Xbox/PC) and PS2/GC paired code locks / simultaneous two-terminal warhead hack in Chemical Bunker [CONFIRMED / ONE SOURCE]; PS2/GC paired switches (Seoul Cyber-Cafe, Chemical Bunker Silo and Storage Room, Train Station The Station) [ONE SOURCE: PRIMA].
```
   A ==== path 1 ====> [S1]
                         |  "3..2..1.." (both act together)
   B ==== path 2 ====> [S2]
                ~~~~ L ~~~~   (laser/barrier keeps them apart)
```

**P2. Hold-and-pass gate (cover relay)**
- Description: a device such as a camera, laser or turret can be held off only while one player stands still holding it. The other player passes, then holds it from the far side so the first can follow.
- Why it works: it is cheap to build and forces turn-taking. Each player is both protector and protected. It also creates small, frequent co-op beats between big set pieces.
- Where it appears (CT): every mission. Examples: Training's camera, Panama's laser grid (twice; one agent aims the pistol OCP at the glowing red grid breaker box to suppress the grid while the other crosses, then they swap), and turret flanks in Seoul and Train Station. On PS2/GC it is everywhere. [CONFIRMED - several sources: XBM, PS2M, PRIMA, FAN] OCP jamming in co-op is not fire-and-forget: one player keeps aiming and holding the trigger while the other moves [ONE SOURCE: RD 1qfdvur].
```
   A(holds)--->[C]      B ===> past C ===> (B holds) ---> A passes
     stands still, charge draining      swap roles
```

**P3. Throw-across with far-side release**
- Description: one player is launched over a barrier the pair cannot cross on foot. The launched player then opens the way for the partner: a switch, a door, a laser panel, a rope.
- Why it works: it is a spectacular move that leaves the thrower stranded and *dependent*. The release device is a reunion guarantee.
- Where it appears (CT): Training, laser and switch; barbed wire and rope [CONFIRMED / ONE SOURCE]; Chemical Bunker (Xbox/PC), lasers and computer; cryotank and one-way door [ONE SOURCE / CONFIRMED]; PS2/GC Panama Server Room, lasers and scanner [CONFIRMED - several sources]; PS2/GC Train Station Hydro Tunnel, throw across then the thrown agent sets a rope for the partner, twice [ONE SOURCE: PRIMA].
```
   A,B  |  L L L  |          A throws B over
   A    |  L L L  |  B --> [S]  B kills lasers
   A ===|=========|==> B        regroup
```

**P4. Boost-then-ladder vertical entry**
- Description: a height only two bodies can reach. One player boosts the other, who then hangs and lets the first climb him. The pair arrives together at a window, hole or ledge.
- Why it works: it is a two-step handshake where both players act twice and no one is stranded. It also turns an ordinary façade into an entrance a lone guard would never watch.
- Where it appears (CT): the most common move in the mode. Examples: the Panama window and ceiling, Seoul's hotel holes and cafe window, and Train Station's tunnel ledge, phone booth and washroom ceiling; PS2/GC Seoul Streets (tall crates), Chemical Bunker The Docks (high ledge), Train Station Hydro Tunnel and Subway (ticket booth). [ONE SOURCE: PRIMA for counts; move CONFIRMED - several sources] The boosted agent must press the co-op button again after landing so the partner can climb him [ONE SOURCE: PS2 YouTube comment].
```
         [window]   <- B hangs, A climbs B
   #######|######
   #      ^ B       (B boosted by A)
   #  A crouches
```

**P5. Reach-in from above (hang down)**
- Description: the objective sits in a room whose floor is guarded, lasered or locked. The pair comes in over the ceiling, and one lowers the other head-first to act: hack, grab or take down a guard.
- Why it works: it flips the room's defence (the door and floor are watched, the ceiling is not). It also gives the most cinematic co-op image, and life literally depends on the partner.
- Where it appears (CT): Training's computer; the Panama duct keypad; the Chemical Bunker anti-virus (Xbox/PC and PS2/GC Cryogenic Chamber); the Train Station payphone bug (Xbox/PC); PS2/GC Panama fuse. [CONFIRMED - several sources: for the move; placements ONE SOURCE]
```
   ===== duct/roof ===== A (holds rope)
                 |
                 B (upside down)
   [ room: G   G  .. X ]   floor route: D (locked/watched)
```

**P6. Single-entrant room (asymmetric access)**
- Description: the fiction allows only one player into a space: one antidote dose, one disguise, one key card. The other covers, waits or does a parallel task.
- Why it works: roles are assigned by the story, not by an arbitrary rule. It is a brief solo moment with the partner as safety net.
- Where it appears (CT): Train Station (Xbox/PC), the contaminated washroom. [CONFIRMED - several sources]
```
   A (has dose) ===> [ hazard room: X ]
   B ----- waits / guards corridor ---- (enters only after X done)
```

**P7. Captive as key**
- Description: a biometric lock is opened by forcing a captured person to it. With two scanners, each player must capture one person, usually in different places.
- Why it works: infiltration, capture, escort and sync collapse into one beat. Non-lethal play becomes useful, because a dead person cannot open the door. It is grounded in real biometrics.
- Where it appears (CT): Panama (Xbox/PC: a guard and the official, the 3F double capture); Chemical Bunker (two guards; PS2/GC Cryogenic Chamber: flash grenade as the elevator doors open, both grab stunned guards for the twin scanners); PS2/GC Panama finale. [ONE SOURCE: PRIMA per instance; pattern CONFIRMED - several sources: across missions]
```
   A --> grabs G1 (security office) --\
                                       >==> [S1][S2] both scan together
   B --> grabs VIP (office, far end) --/
```

**P8. Operator and spotter (asymmetric information)**
- Description: one player controls a machine but cannot see the target. The other sees the target but cannot control the machine. Voice (or pings) is the only link.
- Why it works: communication itself becomes the mechanic. Neither can succeed alone and both are busy.
- Where it appears (CT): Chemical Bunker crane (Xbox/PC; on PS2/GC the crane is replaced by a control panel). [ONE SOURCE: PRIMA; crane CONFIRMED - several sources: XBM] Reddit remembers it as "working a crane while one player gives directions" [ONE SOURCE: RD 1ouonhz].
```
   [control room] A at lever  ---- "left... lower... stop" ---- B at target
        (no view)                                              (no control)
```

**P9. Leapfrog relay**
- Description: a chain of obstacles where each player opens the next stage for the other in turn: duct gates, throw-and-rope, turret leapfrog.
- Why it works: it gives rhythm and equal agency, and the turns alternate who leads.
- Where it appears (CT): PS2/GC East Wing duct gates; PS2/GC Hydro Tunnel throw and rope; turret leapfrogs in PS2/GC Seoul (Gardens: each agent jams for the other across two turret-covered crossings; the turrets cannot be shut off, only suppressed; Cyber-Cafe) and Train Station (Subway: turret on the stair landing, alternating jam, "cover me", up the stairs); PS2/GC Chemical Bunker Laboratories jam-leapfrog past ceiling sensors and cameras. [ONE SOURCE: PRIMA]
```
   A opens G1 -> B passes, opens G2 -> A passes, opens G3 -> ...
```

**P10. Parallel routes that re-merge**
- Description: the pair is separated by geometry (a train, an elevator stopping on two floors, a high route vs a street route). Each crosses a different mini-challenge, and they meet at a defined merge point.
- Why it works: each player gets a personal mission ("your own game") without losing the partnership. The merge point is a natural checkpoint.
- Where it appears (CT): Train Station platform (Xbox/PC; either side of a train, regroup through the car) [ONE SOURCE]; PS2/GC Train Repair Station (the elevator splits the pair: one gets off on an upper floor, the other rides to the bottom, into two parallel tunnels; regroup via a ladder) [ONE SOURCE]; PS2/GC Seoul Streets (high/low: one goes high along crates and ledges and zip-lines into a derelict building, the other interrogates a patrol at street level); PS2/GC Fish Market (beam over the water vs upper walkway past two patrols); PS2/GC The Station (ceiling pipe vs door into the locker room). [ONE SOURCE: PRIMA]
```
         /== route A (dark side, guards) ==\
   start <                                  > merge (car / ladder)
         \== route B (narrow gap, mines) ==/
```

**P11. Protect-while-act**
- Description: one player performs a slow interaction (search, hack, interrogate). A predictable interrupter is scripted to arrive, and the other player handles him.
- Why it works: it gives the non-acting player a real job, which avoids "watch your partner hack".
- Where it appears (CT): Panama archive (Xbox/PC; the guard comes to fix the lights); Seoul officer (escorts); Train Station locker room (bodyguard); PS2/GC Archives (the guard enters as the hack runs); PS2/GC Hydro Tunnel (one jams the camera, tapping to save charge, while the other hacks the laptop). [ONE SOURCE: PRIMA]
```
   A: [X] searching....   B: ..hidden by door.. G enters -> KO
```

**P12. Escort extraction**
- Description: a captured, unconscious target must be carried out. The carrier is slow and cannot fight; the partner opens doors and clears the route.
- Why it works: a clear role split under pressure, and a high-stakes finale that reverses the infiltration route.
- Where it appears (CT): Seoul (Xbox/PC), carrying the target to the truck outside the cyber cafe (designer comment: dropping Jong near the truck = mission success). [CONFIRMED - several sources] (N-Gage/DS Escape also has a carry-out finale of the colonel; who carries is not stated. [INFERRED / UNCERTAIN])

### 6.B Space and route patterns

**P13. Light/shadow lanes (make your own dark)**
- Description: rooms are lit by lights that can be shot, switched or jammed. Players create shadow lanes; guards notice and come to investigate.
- Why it works: players shape the space themselves. It also creates lures, because a guard who goes to fix a light can be ambushed.
- Where it appears (CT): every co-op route (every co-op route in the guide uses light switches, shot bulbs, jammed lights, neon signs or a lit billboard); Panama light switches as guard lures. [CONFIRMED - several sources: as pervasive]
```
   [lit]  [lit]  [lit]      ->  [..]  [..]  [lit]   lane A/B moves in ..
     G walks to dead light <- ambush point
```

**P14. Lure and ambush**
- Description: one player creates a stimulus (noise, a dead light, a sticky-camera click) that draws a guard to where the other waits. This includes the throw that lands a partner on the lured guard.
- Where it appears (CT): Train Station bomb pair 1 (Xbox/PC; light lure plus a partner thrown onto the guard); Seoul (light and ledge-pull); PS2/GC Cyber-Cafe (light switch decoy and grab; both fire sticky cameras at a wall to lure and gas two guards); PS2/GC Subway (sticky-cam lure and gas two patrols). [ONE SOURCE: PRIMA] Voice as a lure (Xbox/PC online): talking into the mic to draw a guard [CONFIRMED - several sources].
```
   A shoots light (far) --> G walks --> under B's ledge / B's landing --> KO
```

**P15. Noise-mask zones**
- Description: areas where ambient noise (machines, fountains, rain, war, radios) lets players move faster or talk. Quiet zones (generators off, tile floors) punish haste.
- Why it works: sound becomes terrain, and players read the soundscape as a map.
- Where it appears (CT): a game-wide system [CONFIRMED - several sources] (the developers call it a "sound masking system"; the sound designer placed a fountain near a garden path so standing near it masks footsteps); the war ambience in co-op Seoul [ONE SOURCE]; the loud turbine halls of Nuclear Plant (pitched in PR, mechanic undocumented) [INFERRED / UNCERTAIN].
```
   [quiet: tile, no hum]  slow!   |   [generator room: fast OK]  |  [rain yard: talk OK]
```

**P16. Earned vantage point (overlook)**
- Description: a safe, dark spot with a sightline over a future challenge: a balcony, catwalk, crawlspace window or temple balcony. Players plan from it.
- Why it works: scouting enables planning, and planning is the core of co-op stealth.
- Where it appears (CT): Chemical Bunker crawlspace over the missile storage room (Xbox/PC) [ONE SOURCE]; PS2/GC Laboratories steel walkway above the lab (also an eavesdrop: crouch and listen to two technician conversations, each completes an opportunity) [CONFIRMED - several sources: PRIMA + FAN]; Seoul temple, where the balcony watcher is a *hostile* overlook [CONFIRMED - several sources].
```
   [crawlspace ..] ---> window ---> [ big room: G G X C ]   (plan, then enter later)
```

**P17. Foreshadow and return**
- Description: players see (and can even prepare, for example by killing lights in) a space early, then enter it at the climax.
- Why it works: it is a landmark and a promise, and preparation pays off.
- Where it appears (CT): Chemical Bunker missile storage room (Xbox/PC; the pair looks down into the final room in the first ten minutes, can kill its lights, and only enters it in the finale). [ONE SOURCE: PRIMA]

**P18. Hub room**
- Description: a central room revisited between wings. It anchors orientation.
- Where it appears (CT): Chemical Bunker operating theatre (Xbox/PC; between the lab wing and cryo). [ONE SOURCE]

**P19. One-way drop / commitment door**
- Description: a drop through a floor hole, a trapdoor or a one-way door that prevents backtracking after a key beat.
- Why it works: it keeps the pair moving forward and simplifies navigation. It also signals "the next act starts".
- Where it appears (CT): the Chemical Bunker one-way door after the throw over the cryotank [CONFIRMED - several sources]; floor holes in the Seoul hotel [CONFIRMED - several sources]; the Train Station ticket-booth trapdoor and washroom duct drop [ONE SOURCE]; PS2/GC Cyber-Cafe drop through the floor [ONE SOURCE: PRIMA].
```
   A,B --throw--> B opens [one-way D] --> A joins --> (no return)
```

**P20. Entry-equals-exit loop**
- Description: the infiltration point is also the extraction point, but the return path differs.
- Why it works: players know where to go at the end. The second traversal is fresh, and the mission feels round.
- Where it appears (CT): Panama (Xbox/PC; window, interior loop, same window by another staircase; extraction at the truck in the courtyard). [ONE SOURCE: PRIMA]
```
   [truck]--window--> 2F -> 3F -> roof/duct -> balcony -> GF -> server
     ^                                                         |
     +------- window <- 2F <- reception stairs <---------------+
```

**P21. Top-down infiltration**
- Description: enter from the roof or the top of a shaft and work downward. The ground floor (the most guarded) comes last or not at all.
- Where it appears (CT): UN HQ (roof, top floor, down; roof-door start now CONFIRMED - several sources: FAN + speedrunner reply) [ONE SOURCE: for the descent]; Chemical Bunker silos [CONFIRMED - several sources].

**P22. Two buildings and a bridge**
- Description: the objective is split across two structures joined by an exposed crossing.
- Why it works: a clear midpoint, an outdoor exposure beat, and a change of architecture and mood.
- Where it appears (CT): Nuclear Plant (plant, laser corridor, footbridge, lab; a designer trigger fires on the footbridge outside the Lab). [ONE SOURCE: FAN notes; trigger ONE SOURCE: level package] UN HQ also has a transfer to a second building [ONE SOURCE: FAN; route open, R-20].

**P23. Machine-state route**
- Description: machinery has states (fans on or off, a platform up or down, a crane position, an elevator). Changing state opens or closes routes.
- Where it appears (CT): Nuclear Plant fans [CONFIRMED - several sources]; Chemical Bunker silo platform [CONFIRMED - several sources] (PS2/GC: a panel raises the other silo's platform) and crane [ONE SOURCE]; PS2/GC missile lowered by a panel [ONE SOURCE].
- Lesson: the state must be readable (fans visibly or audibly running), or players stall (Nuclear Plant forum threads). [ANALYSIS]

**P24. Moving-target tail**
- Description: follow a moving NPC through populated space to discover a destination, without being seen.
- Where it appears (CT): Train Station (Xbox/PC), following the agent to the locker. [CONFIRMED - several sources: objective]

**P25. Event wait (eavesdrop beat)**
- Description: players must hold position while a conversation or call plays out. Story is delivered in-world, and it doubles as a rest beat.
- Where it appears (CT): Train Station call (Xbox/PC) [ONE SOURCE: content; wait CONFIRMED - several sources]; Chemical Bunker technicians [CONFIRMED - several sources: for PS2/GC]; PS2/GC The Station (the agent and his bodyguard stop beside the boosted agent and talk; he must not move). [ONE SOURCE: PRIMA]

### 6.C Pattern frequency (analysis of the guide routes) [ANALYSIS]

- **P2 hold-and-pass:** all missions. **P4 boost-ladder:** all but Chemical Bunker (Xbox/PC). **P13 light lanes:** all.
- **P1 sync:** in every story mission on Xbox/PC except Seoul, and in every PS2/GC mission (on PS2/GC Chemical Bunker every sub-level ends on a "both press now" beat).
- **P5 reach-in:** about one per mission.
- **P3 throw-release:** 0-2 per mission.
- The **set-piece patterns** (P7 captive key, P8 operator-spotter, P6 single entrant, P12 escort) appear once each, in different missions. They are what makes each mission memorable.
- The PS2/GC version shows co-op as gating: each throw is answered by a rope, each elevator by paired switches, each turret by a leapfrog. It is more repetitive but very clear about interdependence. [ANALYSIS]
- N-Gage/DS replaces physical moves with role permissions (computers = Hacker only, electric panels = Assault only), a lock-and-key system where the level designer puts a lock on the path and picks which class holds the key. [ANALYSIS; role rule CONFIRMED - several sources] (See 01d-levels-overview-handheld.md.)

---

## 7. Objective types: taxonomy with CT examples

Every type of objective used in the CT co-op missions, how objectives chain, how they create dependency between the two players, and how failure and optional objectives work. A row's tag is that of the mission evidence cited (see the 01 level files). Platform is Xbox/PC unless marked.

### 7.1 Objective tiers and status rules

| Tier | Meaning | CT examples | Confidence |
|---|---|---|---|
| **Primary** | Required to complete the mission | Access the archives (Panama); defuse the bombs (Train Station) | [CONFIRMED - several sources: FAN, PRIMA] |
| **Secondary** | Optional, but counts toward a perfect score | "Discover if the colonel can attack again" (Nuclear Plant); PS2/GC "finish without an alarm" | [CONFIRMED - several sources] |
| **Opportunity** | Optional, often hidden until discovered in play; counts toward a perfect score | Autopsy videotape (Chemical Bunker); interrogate the officer and sabotage the boat (Seoul); follow the agent to the locker (Train Station); complex blueprints (Nuclear Plant) | [CONFIRMED - several sources] |
| **Status in co-op** | Only *Completed* or *Failed* (solo also has *Cancelled*) | - | [CONFIRMED - several sources: XBM, PS2M] |
| **Perfect score** | All primary + secondary + opportunity objectives, plus no kills/injuries, no alarms, never recognised | - | [CONFIRMED - several sources: PRIMA, XBM, PS2M] |

**How objectives are added mid-mission** [CONFIRMED - several sources: FAN mission pages + PRIMA]:
- **A twist** reveals the goal was wrong: the target was a double (Seoul); the archive was wiped (Panama); the colonel already holds the security room (UN HQ).
- **Intel** found in emails, overheard conversations or interrogations opens an opportunity, for example an email revealing an escape boat (Seoul).
- **An event** fires, for example a phone call that reveals an infected soldier and an antidote locker (Train Station).

### 7.2 Objective types

**Information objectives**

| Type | How it works | CT missions | Co-op dependency |
|---|---|---|---|
| **Retrieve data (computer)** | Use a terminal in a protected room | Panama (server), Chemical Bunker (protocol), Nuclear Plant (two terminals), UN HQ (encrypted data sent by Jin Soo) | Often behind a two-person gate (paired scanners, jammer-held camera) |
| **Search physical files** | Search a cabinet or desk | Panama archive | One agent searches while the other guards against the light-fixer |
| **Interrogate** | Grab a person and question him for intel or codes | Panama (official, codes), Seoul (officer, double, target), Train Station (agent: locker code), PS2/GC Panama (Medeiros) and Seoul | One agent grabs while the other neutralises escorts or watches the door |
| **Eavesdrop / overhear** | Stay hidden within earshot of a conversation | Chemical Bunker (technicians; PS2/GC opportunities), Train Station (bugged call) | Usually one listens while the other guards; in Train Station both wait |
| **Plant a bug** | Place a device on a phone | Train Station payphone | Needs Boost + Ladder + Hangover, so both agents |
| **Discover a fact** | "Find out who helped him"; "find out the real agenda" | Nuclear Plant; Train Station (learn Colonel Kim's real aim) | Spread across several data points in different buildings |
| **Photograph/record** | Collect a recording (videotape, video file) | Chemical Bunker (both builds) | Optional side trip; one agent fetches from an awkward spot (trapdoor) |

**Physical retrieval objectives**

| Type | How it works | CT missions | Co-op dependency |
|---|---|---|---|
| **Steal a sample/item** | Take serum, anti-virus, viral sample, toxin vial, fuse | Chemical Bunker; Train Station; PS2/GC Panama (fuse) | Often reached by Hangover (one agent lowers, the other grabs) |
| **Manufacture an item** | Mix an anti-virus at two stations to a recipe | Chemical Bunker (Xbox/PC and PS2/GC Cryogenic Chamber, fixed published sequence) | **Hard two-station sync** |
| **Extract from a warhead** | Open a casing, then defeat a safety | Chemical Bunker | Crane (operator + spotter), then sync wire cut (Xbox/PC) / sync hack (PS2/GC) |

**People objectives**

| Type | How it works | CT missions | Co-op dependency |
|---|---|---|---|
| **Capture alive / abduct** | Subdue a target without killing him; protect him | Seoul (Jong Pom-chu) | One stuns, the other covers; the target must survive (hard fail) |
| **Escort / carry out** | Carry an unconscious person to extraction | Seoul | Carrier + door-opener/guard role split |
| **Use a person as a key** | Force a captive to a biometric scanner | Panama (two captives), Chemical Bunker (two captives), PS2/GC Panama finale | **Two captives at two scanners = forced split, then sync** |
| **Eliminate** | Required kill of a specific threat | Train Station (contaminated soldier in a bathroom) | Only the antidote holder may enter, so a forced asymmetric split |
| **Stop a villain** | Neutralise the antagonist in a held room | UN HQ (Colonel Kim) | Undocumented [UNKNOWN - see 06-open-questions.md, R-20] |
| **Protect / do not kill** | A named person or class must survive | Panama (official), Seoul (target), UN HQ (staff, civilians), PS2/GC technicians (Chemical Bunker) | Constrains takedown choices for both players |

**Sabotage objectives**

| Type | How it works | CT missions | Co-op dependency |
|---|---|---|---|
| **Destroy a vehicle/system** | Place charges on two mobile anti-aircraft vehicles (Chun-ma) | Seoul (Xbox/PC two; PS2/GC one) | Shoulder-stand to reach the charge point |
| **Disable an escape route** | Sabotage a boat engine | Seoul (opportunity) | Turret on the boat: jam + flank |
| **Defuse bombs** | Laser-linked twin bombs; live wire found via thermal | Train Station (3 pairs Xbox/PC, 4 pairs PS2/GC despite the "three bombs" briefing); UN HQ (one bomb, hidden timer) | **Sync wire cut**; the laser splits the pair |
| **Switch off machinery** | Stop fans so a duct becomes a route | Nuclear Plant | Throw + rope |

**Movement objectives**

| Type | How it works | CT missions | Co-op dependency |
|---|---|---|---|
| **Infiltrate by a specified route** | "Enter down one of the silos"; "find another way in" | Chemical Bunker; UN HQ | Rappel / platform two-step |
| **Reach a location** | "Get to the cyber cafe"; "reach the security control room" | Seoul; UN HQ; PS2/GC sub-levels | Usually gated by co-op moves |
| **Follow / tail** | Shadow a moving target unseen | Train Station (agent to the locker) | Two bodies to keep hidden on the move |
| **Exfiltrate** | Reach the truck, boat, side door or train | Most missions (Panama: the truck in the courtyard; Seoul: the truck outside the cyber cafe; Chemical Bunker: the Zodiac/boat at the end of the dock; Train Station: a jump onto the roof of the passing subway car; Nuclear Plant: the lab's side door; UN HQ: ends on the defusal) | Whether both must arrive is undocumented [UNKNOWN - see 06-open-questions.md, R-09]; a PS2 training hint says only one player needs to reach the Team Training exit |

**Constraint objectives (PS2/GC sub-levels and secondary objectives):** "Finish without an alarm"; "finish without killing anyone"; "gain entry without one alarm". [CONFIRMED - several sources: FAN + PRIMA] These turn the stealth standard into explicit, optional goals.

**Timed objectives:**
- Seoul (Xbox/PC): a five-minute window to destroy the second vehicle after the first. [ONE SOURCE: RYB]
- PS2/GC Gardens: a 4-minute timer. [ONE SOURCE: FAN]
- UN HQ: a 20-minute bomb timer with no on-screen count; the controller warns at 20, 10 and 5 minutes and at 60 seconds. [CONFIRMED - several sources: FAN RU + game text] When the timer starts is unknown [UNKNOWN - see 06-open-questions.md, R-20].
- Train Station: the bomb wire must be cut a second time "before a timer runs out" per player descriptions; no on-screen timer documented [INFERRED / UNCERTAIN].
- Timers are rare and concentrated in climactic beats. [ANALYSIS]

### 7.3 How objectives chain

| Chain pattern | Description | CT example |
|---|---|---|
| **Linear reveal** | A twist rewrites the goal and moves the pair to a new area | Seoul: capture, double, find him, (detour: vehicles), cafe, carry out |
| **Recipe chain** | Each item is an ingredient for the next | Chemical Bunker: protocol, serum, mix, anti-virus; then warhead, sample |
| **Event-gated chain** | A wait or event (a call) generates the next objectives | Train Station: bug phone, listen, locker, antidote, washroom |
| **Two-site investigation** | The answer is split across buildings | Nuclear Plant: control-room archives + lab server room |
| **Escalating finale** | A bomb or timer at the end | Train Station (escaping train), UN HQ (bomb above the assembly) |
| **Extension** | The first target proves incomplete, so a second target is added deeper in | Panama: archive wiped, server on the ground floor |

**Rule of thumb from the original.** Every mission has 3-6 primaries and 0-3 optionals. On Xbox/PC, Panama has 3 primaries, Seoul 5, Chemical Bunker 6, Train Station 6, Nuclear Plant 2 (plus 1 secondary and 1 opportunity), and UN HQ 5. [CONFIRMED - several sources: FAN] Training has 8 lesson objectives. Most optionals are found by exploring, not listed up front.

### 7.4 How objectives create dependency between players [ANALYSIS, with CT examples]

1. **Two-body requirements.** Two scanners, two wires, two switches, two stations. These are the strongest dependency, because the objective is *impossible* alone (except where exploits exist, such as one agent running between both cryo stations).
2. **Item scarcity.** One antidote dose means one entrant. The objective assigns roles.
3. **Reach requirements.** A charge point, a bug site or a sample above or below the reachable floor means a boost, shoulder-stand or Hangover.
4. **Protect-while-act.** One agent does the objective (search, interrogate, hack) while the other guards against the predictable interrupter (the light-fixer, an escort, a patrol).
5. **Information asymmetry.** The crane operator cannot see the target; the spotter cannot drive. Only talk solves it.
6. **Distributed intel.** Codes and clues are found in different places, so the pair is encouraged to split and report back. This is soft dependency. Reading a computer updates both agents' mission devices. [CONFIRMED - several sources: training text]

### 7.5 Failure and optional objectives

**Hard fail on a primary breach** [CONFIRMED - several sources: for the listed cases]:
- a protected person dies;
- a target escapes (Seoul boat);
- a bomb's tripwire laser is touched;
- a general alarm in UN HQ (and any kill of a guard or civilian there);
- the revive window expires.

**Soft failure** [CONFIRMED - several sources]:
- An optional objective missed or failed only lowers the score.
- Alarms escalate rather than fail on Xbox/PC (except UN HQ).
- On PS2/GC, three alarms fail a sub-level.

**Trap case.** In Seoul, skipping an optional email removes the reminder to sabotage the boat, and the target can then escape for an instant fail. Optional intel silently guards a hard fail (anti-pattern A7).

**Scripted lethal objectives** (the contaminated soldier) coexist with a scoring system that rewards zero kills. A perfect run still exists, so the scripted kill is evidently exempt. [INFERRED / UNCERTAIN: inference]

**Rating caps.** In Seoul (90%) and possibly Chemical Bunker (97%), an objective or stat cannot register, so a "perfect" run tops out below 100%. [CONFIRMED - several sources: for Seoul] [UNKNOWN - see 06-open-questions.md, R-15]

### 7.6 Takeaways [ANALYSIS]

- **Objective verbs are varied but few** (about 20). Variety comes from *combining* a verb with a co-op dependency type, for example interrogate plus escort, or retrieve plus Hangover.
- **Every main mission has at least one "two bodies, one moment" objective.** It is the signature of the mode.
- **Mid-mission twists that rewrite the objective** happen in Panama, Seoul and UN HQ (and Train Station's call). They are the mode's main narrative device.
- **Optional objectives reward curiosity** (emails, overheard talk). However, optional intel should never be the only safeguard against a hard fail.

---

## 8. Pacing and flow

How the CT co-op missions open, escalate, breathe and climax; how mission length relates to objective density; how players are kept oriented without UI clutter. Pacing labels such as "peak" or "rest" are the researchers' analysis of documented beat orders [ANALYSIS]. Lengths come from video durations (no video was watched).

### 8.1 Length and density table (Xbox/PC)

| Mission (Xbox/PC) | Primaries (+ optional) | Expert ghost run | Typical stealth run | Casual run | Main co-op set pieces |
|---|---|---|---|---|---|
| Training | 8 lesson objectives | 3-4 min | - | 9-16 min | One per objective |
| Panama | 3 (+0) | ~8 min (speedrun) | 16-35 min | 41-52 min | Captive scan; Hangover; laser relay x2 |
| Seoul | 5 (+2) | ~13-20 min | 20-35 min | 34-60 min | Turret flank; shoulder demolition x2; escort |
| Chemical Bunker | 6 (+1) | ~10-27 min | 25-45 min | 45-80 min | Rappel; cryo mix; captive scan; Hangover; throw; crane; wire cut |
| Train Station | 6 (+2-3) | 11:41 | 13-35 min | 30-70 min | Wire cut x3; payphone Hangover; single-entrant room; train exit |
| Nuclear Plant | 2 (+1 secondary +1 opportunity) | 22:44 | ~30 min | 48-108 min | Turbine throw/rope (others undocumented) |
| UN HQ | 5 (+0) | 21:32 | ~34 min | 43-86 min | Undocumented |

Lengths [CONFIRMED - several sources: multiple video lengths, see the 01 level files]. Objective counts [CONFIRMED - several sources: FAN].

**In-game times of the hexen2k7 100% Elite No KO/Kill runs (PC likely, zero detections unless noted):** Panama 10:58; Seoul 3 10:46 (one knockout and two civilian knockouts, all marked as objectives); Chemical Bunker 19:39; Train Station 11:41; Nuclear Plant 22:44; UN HQ 21:32 (one knockout, an objective). [ONE SOURCE: hexen2k7 descriptions]

**Per-mission length notes from the mission breakdowns:**
- Training: 3-4 minutes for expert runs, 9-16 minutes casually. [CONFIRMED - several sources: video lengths]
- Panama (Xbox/PC): 100% stealth runs 16-35 min; casual runs 41-52 min; speedruns about 8 min (R3xXcoN speedrun 8:04; ImbaSneakingTeam "100% Expert/Elite - 8:05"). Panama co-op record about 3:50 per a speedrun.com search snippet. [CONFIRMED - several sources: many video lengths; record ONE SOURCE: snippet]
- Panama (PS2/GC): full mission about 30 min. [CONFIRMED - several sources: two video lengths]
- Seoul (Xbox/PC): 20-35 minutes for stealth runs, up to an hour for casual commentary runs. [CONFIRMED - several sources: video lengths]
- Chemical Bunker (Xbox/PC): stealth runs 25-45 minutes; casual runs up to 80 minutes; speedrun about 15 minutes (R3xXcoN 100% SpeedRun 14:54). No timers documented. [CONFIRMED - several sources: video lengths]
- Train Station (Xbox/PC): about 12-14 min for expert ghost runs, 30-70 min casually, under 5 min for a world-record run (KuroKishi_duLac Any% No QS/QL 4:52; Buttercak3 IL 6:48). No on-screen timer documented [INFERRED / UNCERTAIN]. [CONFIRMED - several sources: video lengths]
- Nuclear Plant: the longest mission in the set. Ghost Elite runs take about 23 minutes (Train Station about 12). Casual runs take 30 minutes to almost 2 hours (Spyker2041 blind first play 1:18:45). No timer documented. [CONFIRMED - several sources: many uploads]
- UN HQ: runs take 21 minutes (ghost) to 86 minutes (casual). [CONFIRMED - several sources: uploads]
- N-Gage/DS (one DS playthrough with chapter markers, arronmunroe, two players, not a stealth run): Rooftops about 3.5 min, Breakdown about 4 min, Corruption about 10 min, Prison Rescue about 9 min, Escape about 10.5 min, so the whole campaign takes about 37 minutes. A 100%-stealth DS run (SHOCK-25) took about 13.5 / 14 / 26.5 min for the first three parts. [ONE SOURCE: each, video chapter/description timestamps]
- Reviewers put each mission at roughly 60-90 minutes [ONE SOURCE: TX]; the campaign at 4-6 hours [CONFIRMED - several sources]; Penny Arcade "about 4 hours"; G&M "5-6 hours".

**Speedrun records (show routes and skips, not intended flow; the shortcuts use glitches, see 5.2 Nuclear Plant):**

| Run | Time | Runner / source |
|---|---|---|
| Training IL (WR) | 1:28 (video 1:50); speedrun.com lists "Team Training (Co-op)" WR about 1:27, so this may be the PS2 level | Playbottl |
| Panama co-op record | about 3:50 | speedrun.com search snippet |
| Train Station Any% No QS/QL (WR) | 4:52 | KuroKishi_duLac |
| Train Station IL (WR) | 6:48 | Buttercak3 |
| UN Headquarters Any% No QS/QL (WR) | 6:05 | KuroKishi_duLac / Diligence |
| UN Headquarters IL (WR) | 8:04 | Buttercak3 |
| UN Headquarters "UnRun" | 11:55 video, two synced perspectives | LazyEye4 |
| UN HQ 100% SpeedRun | 17:04 video | R3xXcoN GAMING |
| Nuclear Plant Any% No QS/QL (WR) | 7:41 | KuroKishi_duLac / Diligence |
| Nuclear Plant IL (WR) | 8:18 | Buttercak3 |
| Nuclear Plant speedrun | 8:31 (video 9:33), easiest settings with glitches | TimmyAkmed |
| Full co-op campaign | 38m44s (world record per uploader; timing ends on the final frame of Nuclear Plant) | Distro with Heinki |
| Full co-op campaign | 56:47 with commentary (2016) | Oldschooldummy |

speedrun.com Any% Co-op rules allow quicksaving and quickloading; IL runs are filed under an "Any% No QS/QL" category. [CONFIRMED - several sources: speedrun.com API rules + video titles]

**Observations** [ANALYSIS]:
- **Primary rate.** Missions run about one primary objective per 5-10 minutes of careful play.
- **Set-piece rate.** Co-op set pieces come every 5-8 minutes. Small hold-and-pass beats fill the gaps every 2-3 minutes.
- **Length range.** A mission is 30-60 minutes for an average pair. Critics found the *campaign* short (4-6 hours), not the missions. [CONFIRMED - several sources: for the campaign length]
- **Longest mission.** The downloadable Nuclear Plant has the fewest primaries and is the longest. A low objective density and long traversal is a likely factor in its stuck-point complaints. [INFERRED / UNCERTAIN]

### 8.2 Mission shape (open, escalate, breathe, climax)

**Openings.** Quiet exterior or service entry with a soft first co-op move that re-teaches the core verb without danger [ONE SOURCE: PRIMA routes]:
- Panama: a dark courtyard and boost into a window;
- Seoul: an alley and boost into a hotel hole;
- Chemical Bunker: a surface pad and rappel down a silo;
- Train Station: a sewer pipe traverse.
- Briefing tone: the briefing sets tone and stakes; one briefing even calls the job easy before a twist. [CONFIRMED - several sources]

**Escalation.**
- Growing devices: security devices get denser and more complex. Panama goes from keypads, to a camera corridor, to a two-scanner door, to a laser grid.
- Twists that re-scope objectives at roughly the 1/3 to 2/3 mark: Panama, the archive is wiped; Seoul, the target is a double; Train Station, the phone call reveals a contaminated soldier; UN HQ, the colonel already holds the security room (at the two-thirds mark). [CONFIRMED - several sources: for the existence of the twists]
- Bigger, more open spaces later: Chemical Bunker moves to the crane bay, Train Station to the great hall, Seoul to the temple arenas.

**Breathing spaces.**
- Dark service spaces after peaks: Seoul, sewers and a dark fish-shop interior with a medkit after the vehicle demolitions; Chemical Bunker, elevators and crate halls after the cryo mix. [ONE SOURCE: PRIMA]
- Forced waits that double as story: Train Station, listening to the call; Chemical Bunker, overhearing the technicians. [CONFIRMED - several sources: for the wait; content ONE SOURCE]
- Load screens between PS2/GC sub-levels act as rests. One reviewer found them too long. [ONE SOURCE: NWR]
- Comic relief: the radio crossover in Seoul. [ONE SOURCE: RYB]

**Climaxes.**
- Synchronized or high-stakes act near the end: Chemical Bunker, crane then wire cut; Train Station, final platform and a leap onto the escaping train; Seoul, cafe breach and carry-out; UN HQ, hidden-timer bomb; PS2/GC Panama, three co-op moves chained, then a captive scan to end the campaign.
- Extraction is usually short, but sometimes a full reverse traversal (Panama's long exit; Seoul's carry).

**Generic curve (from the four retail missions)** [ANALYSIS]:
```
tension
  ^             peak 1 (first big sync)        peak 2 (climax set piece)
  |               /\                              /\
  |    entry     /  \   twist   rest   build     /  \  exit
  |  __/\_______/    \__/\_____/\_____/\________/    \__
  +--------------------------------------------------------> time
     soft co-op   hold-and-pass beats every 2-3 min
```

### 8.3 Per-mission pacing curves (from the mission breakdowns) [order as tagged; labels ANALYSIS]

**Training (Xbox/PC).** A flat tutorial cadence: read, perform, move on. Danger appears only through the health cost of a failed scanner hack. [ONE SOURCE: FAN]

**Panama (Xbox/PC).**
1. Quiet open: dark courtyard and a first boost (an echo of training).
2. Low tension: keypads and switches on 2F.
3. First peak: the 3F double capture (two agents, two captives, one synchronized door).
4. Reveal: the archive is wiped, so the goal moves to the ground floor.
5. Traversal set piece: ceiling, duct Hangover, then the balcony shimmy over a double-height hall.
6. Second peak: the laser-grid relay and the server-room camera.
7. Long exfil: reverse the grid and climb the guarded stairs.
- Tension never resets, because there are no automatic checkpoints (manual pause-menu saves exist on Xbox/PC). [CONFIRMED - several sources: EG + game files]

**Panama (PS2/GC, four sub-levels).** Alley: a calm open with traversal flourishes. East Wing: the escalation and peak (demolition, lure-and-gas, the vent puzzle, the beam crossing under a drone, the sync hack). Archives: a story beat, exterior acrobatics, then a methodical room puzzle. Server Room: the finale, which chains three co-op moves and a synchronized takedown.

**Seoul (Xbox/PC)** [order CONFIRMED - several sources; labels ANALYSIS].
1. Opening tension: turret, patrols, lights.
2. A methodical vertical hotel crawl.
3. Reveal: the double.
4. The officer interrogation.
5. Release: wall, alley, zip line into the temple.
6. Peak 1: vehicle 1 under the balcony watcher.
7. A timer (one source: five minutes to destroy the second vehicle).
8. Peak 2: vehicle 2.
9. Comic radio relief.
10. Rest: sewers, the dark fish store, a medkit.
11. Walkways and the boat.
12. Peak 3: the cafe, with a possible chase.
13. The carry out.

**Chemical Bunker (Xbox/PC)** [analysis of the guide order].
1. Opening set piece: the silo descent.
2. Quiet eavesdrop over the storage room, a story reveal.
3. Character beat: Java.
4. Traversal puzzle: the laser corridor.
5. Dark reveal: the autopsy tape.
6. Objective payoffs: protocol, then serum.
7. Peak 1: cryo mixing under lethal gas.
8. Captive scan.
9. Hangover retrieval.
10. Throw and commitment door.
11. Storage room clearance (pre-darkened).
12. Peak 2: crane guidance, then the simultaneous cut.
13. Sewer escape and boat.

**Train Station (Xbox/PC).**
1. Act 1, underground (about 45% of a fast run): sewer stealth, a light-killing arena, then three defusals in quick succession. Each wire cut is a tension spike.
2. Act 2, public space: escalator climb, booth ambush, the payphone set piece. The forced wait during the call is the main rest beat and the story reveal.
3. Act 3, tail and contamination: moving-target stealth, interrogation, a lone agent in the lethal washroom.
4. Finale: duct, last guards, through the glass dome onto the train.
- Suru's creator chapters (Elite, 0 kills, 0 alarms, 13:38 video) give the Xbox/PC beat timing: schematics 1:36, bombs 3:06 / 4:43 / 5:28, phone bug 7:24, Chu 10:56, extraction 13:30. [ONE SOURCE: Suru -JnlamHBZrc]

**Nuclear Plant (Xbox/PC)** [implied shape INFERRED / UNCERTAIN]: 1. Infiltration. 2. Turbine-hall traversal peak under machinery. 3. Scanner-locked control room (first piece of intel). 4. Laser corridor and outdoor bridge transition. 5. Lab server room (reveal: one bomb left). 6. Exit. Route sequence from the controller's guidance lines [CONFIRMED - several sources: identical Xbox and PC game text]: start with no blueprints, get inside and find the main control room; with the blueprints taken, head to the turbine zone; the security doors are blocked and a nearby computer controls them; the turbine is overhead, reach the stairs on the far side of the room, then cross the turbine room toward the control room; the lift cannot be called from there, so find another way up; the controller scolds players who linger near radioactive material; the lab server is reached through a ceiling trap-door; after learning who helped the colonel, leave by the lab's side door.

**UN HQ (Xbox/PC)** [INFERRED / UNCERTAIN]: 1. A long, zero-tolerance descent (no kills, no alarms). 2. Twist at the 22nd floor: the enemy already holds the security room (cameras found switched off, blood on the floor). 3. A hidden-timer race to a bomb above a live assembly. Objective order in the file: infiltrate, reach the security control room, stop the colonel, recover the data, defuse the bomb. [CONFIRMED - several sources: game text]

**PS2/GC Train Station.** Hydro Tunnel is judged hardest (camera guarding the opportunity laptop; two patrolling guards around the final bomb). [ONE SOURCE: Jake "Ziggity" Steven]

**PS2/GC creator chapter timings (sub-level boundaries; useful as beat spacing):**
- Seoul (Jake Ziggity, 18:50): Streets 0:00, Rooftops 2:52, Gardens 5:25, Fish Market 9:00, Cyber-Cafe 13:55.
- Chemical Bunker (Jake Ziggity, 32:29): Silo 0:00, Laboratories 6:04, Cryogenic Chamber 15:56, Storage Room 21:25, The Docks 27:42.
- Train Station (Jake Ziggity, 30:34): Train Repair Station 0:00, Hydro Tunnel 5:37, Subway 16:42, The Station 23:00.
- Panama (Jake Ziggity, 31:01): The Alley 0:00, East Wing 5:05, Archives 13:03, Server Room 22:57.
- Panama (SHOCK-25, 29:38): Alley 00:00, East Wing 05:22, Archives 12:18, Server Room 18:33.
- GameCube Seoul sub-missions are very short; all fit in one 6:09 video, the first done in under a minute. [ONE SOURCE: NickyTheGamer]

**Full-campaign creator chapters (Xbox/PC; useful as relative mission lengths):**
- DeepVelocityOps (7:22:04, PC Steam link): Training 0:00, Panama 14:06, Seoul 3 1:05:34, Chemical Bunker 1:42:26, Train Station 2:58:19, UN HQ 4:07:54, Nuclear Plant 5:33:56.
- 3dCossack (4:17:33, Hard, all side objectives): Training 0:00, Panama 11:06, Seoul 3 1:07:37, Chemical Bunker 1:38:32, Train Station 2:14:32, Nuclear Plant 2:53:44, UN HQ 3:38:17.
- Tiflorg (5:16:03, PC, FR stream): Training 3:08, Panama 29:03, Seoul 1:54:34, Chemical Bunker 2:59:32.

### 8.4 Signposting without UI clutter

The original has a sparse HUD: meters, partner health, an action icon, an alarm counter and a text box. **No waypoints or partner markers are documented** [UNKNOWN - see 06-open-questions.md, R-11]. Navigation therefore relies on:

| Signpost | How it works | Evidence |
|---|---|---|
| **Objective text that names places** | Objectives and in-game mission notes describe the route ("archives in the main control room near the turbine area"; "security room on the 22nd floor"; "hall in the second building"; "reach the cafe by the fish market") | [CONFIRMED - several sources: FAN mission notes; Nuclear Plant and UN HQ notes read like a route script] |
| **Intel as signposts** | Emails and interrogations give door codes and locations ("the target was moved to the cafe"; "the antidote is in a locker") | [CONFIRMED - several sources] |
| **Architecture with obvious function** | Real room types (archive, server room, lab, crane bay, ticket hall, washroom) tell players what is where | [ANALYSIS; supported by the Dishonored 2 orientation principle in the literature notes] |
| **Landmarks and overlooks** | Seeing a future room early (the missile storage overlook) and grand public spaces (the station hall, the temple) orient players | [ONE SOURCE: PRIMA] |
| **Guard chatter and barks** | Overheard talk reveals guard positions and intent, and sometimes objectives (technicians; the phone call) | [CONFIRMED - several sources: see 07-audio-and-atmosphere.md] |
| **Light** | The route often lies through areas players darken themselves. Lit spaces read as danger, dark ones as safe. Neon and billboards act as landmarks | [CONFIRMED - several sources: as pervasive] |
| **Sound** | Machinery hum (noise-masking zones), war ambience, a fountain near a path | [CONFIRMED - several sources: system] |
| **Placed move affordances** | Contextual moves appear in the interaction menu only at valid spots; training used striped floor squares | [CONFIRMED - several sources; squares ONE SOURCE] |
| **Loading-screen hints** | Hints shown at load | [ONE SOURCE: XBM] |
| **Partner voice / automatic callouts** | Partners tell each other where they are; canned lines cover players without voice | [CONFIRMED - several sources] |
| **Mission-device map page** | Every co-op map has a map page in the mission device; reading a computer updates both agents' devices | [CONFIRMED - several sources: game files; partner marker unknown, R-11] |
| **Designer triggers** | Messages fire at key spots (Nuclear Plant: security doors, turbine-room stairs, footbridge, archives) | [ONE SOURCE: level package] |

**Where signposting failed** (from the stuck-point evidence):
- Solution above the problem: players stared at a grille rather than the vent above it (Panama Xbox/PC).
- Hidden state of a machine (Nuclear Plant fans).
- A vent closed by a remote computer that players didn't know about (PS2/GC Panama East Wing).
- A route through a washroom ceiling (Train Station lower platform).
- Losing each other with no map (Eurogamer review; partly corrected, see A2).
- Lesson: vertical, remote or state-based solutions need a stronger tell than horizontal ones. [ANALYSIS]

### 8.5 How players always know where to go next (and when they don't) [ANALYSIS]

1. An objective names a destination type; real-world architecture tells players where that type of room lives.
2. Intel adds the precise key: a code, a floor or a person.
3. The level funnels through two-person gates. Each gate is a forced regroup, so the pair cannot drift far apart for long.
4. One-way drops stop backtracking after key beats.
5. Failure mode: losing the partner. No partner marker is documented, and split-screen leaks information. Online players without voice depend on canned callouts. [CONFIRMED - several sources: Eurogamer + reviewers]

### 8.6 Lessons from the literature applied to co-op pacing [background]

| Principle | Source | Co-op application |
|---|---|---|
| Alternate stealth-friendly and unfriendly spaces to create tension and relief | Randy Smith GDC 2006 | Put the rest beats after each sync set piece, as the original did |
| Build-up, peak (short), fade, relax (30-45 s) | Left 4 Dead AI director slides | A paired set piece should be followed by a short low-threat stretch for regrouping and talk |
| Scouting spots let players plan | Smith; Payday 2 | Overlooks big enough for two, with sightlines for both |
| Mentally mappable encounter spaces | Mark of the Ninja | Encounter spaces sized so both players can describe them to each other |
| Co-op pacing is harder because triggers can't assume where the partner is | Hazelight interviews | Use regroup gates and "both present" triggers before scripted events |
| Light leads; landmarks ("weenies") pull | Scott Rogers GDC 2009 | Show lit landmarks *from* dark routes rather than lighting the route |
| Telegraph threats before commitment | CT bonus-disc level-design diary (Hocking) | A guard must be known before the player steps into his path; fix a bad patrol by changing where it starts |

### 8.7 Pacing targets suggested by the evidence [ANALYSIS; carried into the research pack's design bible]

| Target | Value |
|---|---|
| Mission length (average pair) | 30-60 minutes |
| Primary objectives per mission | 3-6, plus 1-3 discoverable optionals |
| Small co-op beat (hold-and-pass, boost) | Every 2-4 minutes |
| Major co-op set piece | Every 6-10 minutes |
| Signature, never-repeated set piece | 1-2 per mission |
| Objective twist | One, around the 40-60% mark |
| Rest beat | After each major set piece |
| Extraction | Short, or a deliberately designed reverse route; never a dull backtrack |
| Partner separation | No separation without a defined merge point and a communication aid |
| Idle limit (red flag) | No stretch where one player has nothing to do for more than about 60 seconds |

---

## 9. Video catalogue

**Status.** First full pass complete 2026-10-17, extended in the gap pass. **Nothing was watched.** All notes come from video titles, channel names, durations, playlist listings and the text on each watch page (description, creator chapter lists, upload date, view count, comments), read through YouTube's search page, playlist pages and the public `youtubei/v1/next` endpoint. About 235 videos were catalogued; the gap pass read descriptions, chapters and comments for 84 more pages.

**How to read the entries:**
- Format: URL | title (shortened) | channel | length | platform | notes.
- [CONFIRMED - several sources] = stated by 2+ independent uploaders/sources. [ONE SOURCE] = one uploader's description or title. [INFERRED / UNCERTAIN] = inference from a title, or a YouTube auto-generated chapter list.
- "Creator chapters" = timestamps the uploader typed into the description. "Auto chapters" = chapter titles YouTube shows that do NOT appear in the description; they look machine-generated and are sometimes wrong (one Seoul video's auto chapters name the target "John Hu" instead of Jong Pom-chu). Treat auto chapters as [INFERRED / UNCERTAIN].
- Platform comes from the uploader's own wording where possible. "PC (likely)" means it was inferred, for example from Bandicam/Steam mentions or the Seoul 90% bug that one uploader calls PC-only.
- Lengths are the YouTube durations shown in search results.

### 9.0 Facts the video pages establish

**Mission order and naming:**
- PS2 co-op order is Team Training, Seoul, Chemical Bunker, Train Station, Panama. Jake "Ziggity" Steven numbers his PS2 US videos 01-05 this way, and SHOCK-25's PS2 (PCSX2) co-op videos are numbered Mission 0-4 in the same order. [CONFIRMED - several sources]
- PS2 sub-level names, from Jake Ziggity's creator chapters plus SHOCK-25's Russian chapter names, which match one-to-one [CONFIRMED - several sources]: Seoul: Streets, Rooftops, Gardens, Fish Market, Cyber-Cafe. Chemical Bunker: Silo, Laboratories, Cryogenic Chamber, Storage Room, The Docks. Train Station: Train Repair Station, Hydro Tunnel, Subway, The Station. Panama: The Alley, East Wing, Archives, Server Room.
- Jake Ziggity says PS2 co-op cannot save mid-mission, which is why it is split into small levels (he used emulator save states to record), and that Panama is last on PS2 but first on Xbox/PC. [ONE SOURCE; PS2/GC "no mid-mission save" later CONFIRMED - several sources: with the GameCube reviewer]
- Xbox/PC order as uploaders number it: Training, Panama, Seoul 3, Chemical Bunker, Train Station, then the two later missions. [CONFIRMED - several sources: hexen2k7, R3xXcoN GAMING, Urban Reflex, Agt_ Pendergast, DeepVelocityOps]
- The order of the two late missions differs between uploaders: Nuclear Plant before UN HQ (hexen2k7, Urban Reflex, Agt_ Pendergast, 3dCossack, BoSstonPL "Mission 5" = Nuclear Plant); UN HQ before Nuclear Plant (R3xXcoN GAMING Mission 5 = UN HQ, 6 = Nuclear Plant; DeepVelocityOps and CouchiesTV chapters). A Russian PC duo (dat_carlin, part 6) say they realised the game had the two missions swapped: Nuclear Plant should come fifth, because they were sent after a bomb they had already dealt with in the previous episode. [CONFIRMED - several sources: that orderings differ; ONE SOURCE: the "swapped in the menu" explanation] The Nuclear Plant briefing (in hexen2k7's description) follows straight on from Grand Central; the UN HQ briefing turns on a Jin Soo transmission; this supports story order Train Station, Nuclear Plant, UN HQ. [ONE SOURCE: hexen2k7 description; consistent with dat_carlin] Resolution (R-01 CLOSED): on PC both downloads are Mission-mode maps, the PC readme lists UN HQ then Nuclear Plant, and the briefing text is byte-identical to Xbox, so players choose the order and the PC briefing was not rewritten. [CONFIRMED - several sources: game files]
- **Seoul 3 co-op cannot score above 90% on PC** because of a bug: V339 says even a cheat-assisted perfect ghost with the boat sabotage gave 90%; hexen2k7 calls it a PC-version bug that Ubisoft confirmed; soluceinfo (FR) and Lulz Productions (vjiFZuwld-U) also report 90%. [CONFIRMED - several sources: that it caps at 90%; ONE SOURCE: "Ubisoft confirmed" and "PC only"] Cause [UNKNOWN - see 06-open-questions.md, R-15].
- Other reported score oddities: R3xXcoN got 97% on Chemical Bunker without being detected [ONE SOURCE]; PleasePlayMore says several co-op missions have glitches that block 100% [ONE SOURCE]; BK201Tach says the "follow Chu to the locker" opportunity objective looked impossible (letting him open the locker ended the mission, and stopping him earlier did not count) [ONE SOURCE].

**Xbox/PC objective lists (paraphrased from hexen2k7's descriptions; corroboration noted)** (full objective detail: see the 01 level files):
- Training: a series of move drills: read the info panels; boost a partner over a wall (Short Scale); beat a camera with the jammer; perform the Tomoe Nage throw; hack a computer while hanging (Hangover) to kill a laser; hack a dual retinal scanner; do a dual rappel. [ONE SOURCE: for the full list; the move names are CONFIRMED - several sources: as named co-op moves] V339 adds that 100% needs at least one info panel re-read. [ONE SOURCE]
- Panama: reach the archives, reach the main server, exfiltrate. The briefing frames it as a hunt for the Panamanian Vice President's bribery records. ("Access the Archives" also appears as R3xXcoN's mission label.) [CONFIRMED - several sources] (R-14 CLOSED for Xbox/PC: canal-inspection bribery, with a bonus objective about other uninspected ships.)
- Seoul 3: primary, capture Jong Pom-chu, learn where he is, destroy two Chun-ma anti-air vehicles, reach the cyber cafe guarding him, take him to extraction; opportunity, interrogate a North Korean officer for his location, sabotage his escape boat. "Capture Jong Pom-chu" is also R3xXcoN's label. Splinter (PC Expert video) calls interrogating "the General" a bonus objective; SHOCK-25's PS2 Rooftops chapter also interrogates a general. [CONFIRMED - several sources: for the capture goal and that a general/officer interrogation exists; rest ONE SOURCE]
- Chemical Bunker: primary, enter down a missile silo; get the viral protocol from the main lab; get a chimpanzee blood serum for the antidote; take an anti-virus sample from the cryogenic chamber; take a viral sample from a missile; exfiltrate. Opportunity: a monkey-autopsy videotape. R3xXcoN's labels "Get some samples" and "Get Anti Virus Samples" agree. [CONFIRMED - several sources: for samples; rest ONE SOURCE]
- Train Station: primary, learn Colonel Kim's real aim; defuse bombs under the station; bug a hall telephone before Chu reaches it; get an antidote from a locker; eliminate a contaminated soldier in a bathroom; stop Kim's men leaving with the toxin. Opportunity: bomb schematics; follow Chu to the locker; secure the toxin from the infected soldier. Suru's creator chapters (bomb schematics, three bombs, phone bug, Chu, extraction) and R3xXcoN's label "Bug the Phone Call" corroborate the bombs, schematics and phone bug. [CONFIRMED - several sources: for those; rest ONE SOURCE]
- Nuclear Plant (Yongbyon): primary, find out who helped Kim; exfiltrate. Secondary: whether Kim can strike again. Opportunity: complex blueprints. The briefing ties the plant to double-laser detonators found in the station bombs. R3xXcoN's label "Find out who helped Kim" agrees. [CONFIRMED - several sources: for the main goal]
- UN Headquarters: primary, infiltrate; recover encrypted data sent by Jin Soo; reach the security control room; stop Colonel Kim; defuse a bomb. The briefing forbids lethal force and says a general alarm aborts the mission. R3xXcoN's label "Stop Colonel Kim" agrees. hexen2k7's 100% run records one knockout, marked as an objective. [CONFIRMED - several sources: for "stop Kim"; the no-lethal/alarm-abort rule is now CONFIRMED - several sources: game text and designer comments]

**PS2 beat lists (paraphrased from SHOCK-25's creator chapters, a 100%/no-alarm PS2 run; all [ONE SOURCE] unless noted):**
- Team Training: one computer, two retinal scanners hacked, a data read. Jake Ziggity adds two points: the level uses a North Korean soldier as the dummy enemy, and only one player needs to reach the final exit. [ONE SOURCE: each]
- Seoul: Streets, interrogate a soldier, pick up a wall mine on an upper floor, use a computer. Rooftops, interrogate a general. Gardens, place an explosive charge to destroy the air-defence unit. Fish Market, wall mine by the stairs on the pilings; 4-stage door lock. Cyber-Cafe, interrogate Jong Pom-chu.
- Chemical Bunker: Silo, 3-stage lock; a computer that changes the objective. Laboratories, keypad door, three hacked computers, two scientists interrogated. Cryogenic Chamber, two computers. Storage Room, two computers. Docks, wall mines near the boat. Jake Ziggity flags motion sensors on the way down the silo. [ONE SOURCE]
- Train Station: Repair Station, pick up wall mines; use an explosive to open a door; disarm a laser mine. Hydro Tunnel, computer, wall mine, two laser mines. Subway, computer, laser mine, 6-stage lock on the final door. The Station, an interrogation (target named "Kim Chu" in Russian). Jake Ziggity says Hydro Tunnel is hardest (camera guarding the laptop for the opportunity objective; two patrolling guards around the final bomb). [ONE SOURCE]
- Panama: The Alley, two computers. East Wing, an EMP charge to open an elevator, a hacked computer, two retinal scanners on the last door. Archives, interrogate Medeiros; a keypad door with a 4-digit code; three computers. Server Room, a retinal scanner beside a laser grid.

### 9.1 Training (Xbox/PC "Training Facility") and Team Training (PS2/GC)

1. https://www.youtube.com/watch?v=2VRGQUT2JvQ | Coop: Training (100% / Expert / Elite / Ghost) | V339 | 4:03 | PC (likely) | Uploaded 2015-05-25; no commentary; partner planned a full ghost; elite mode means no starting ammo; panel re-read needed for 100%; the description links to Normal, Expert and Elite playlists.
2. https://www.youtube.com/watch?v=WQ__XNyWP0M | COOP Training 100% Elite No KO/Kill | hexen2k7 | 3:14 | PC (likely) | 2008; the description lists every training objective (the move drills). Best short "all moves" reference.
3. https://www.youtube.com/watch?v=0hK1AeB07wk | CO-OP Walkthrough, 100% Stealth, Part 1 "Training" | Centerstrain01 | 15:56 | not stated (likely PC) | 57k views; auto chapters include "Inverted Descent" and "Double Hacking" [INFERRED / UNCERTAIN].
4. https://www.youtube.com/watch?v=1_spcLojzxo | Coop [1: Training] | Agt_ Pendergast | 15:32 | not stated | Uploaded 2023-11-17; part of a complete 7-mission playlist; English auto-captions exist but could not be fetched.
5. https://www.youtube.com/watch?v=obcKEeRniRw | (Co-Op PS2 US Version) 01 - Team Training | Jake "Ziggity" Steven | 7:16 | PS2 (emulated) | North Korean soldier as the target; last area needs only one player at the exit.
6. https://www.youtube.com/watch?v=MmH3o7WF4wg | Coop [PS2-PCSX2-HD] Mission 0: Training | SHOCK-25 | 5:36 | PS2 (emulated) | Russian; 100%, no alarms; timestamped computer and retinal scans.
7. https://www.youtube.com/watch?v=gy1Vt3pxX8U | (PS2) Coop Campaign: Training Walkthrough | WalkthroughCinema | 4:20 | PS2 | 147k views, the most-viewed PS2 co-op clip found; comments: thrown at the enemy; human-ladder re-press.
8. https://www.youtube.com/watch?v=gm9uYnMw9KA | Chaos Theory Co-op Training | ysuck63 | 3:10 | GameCube (videos.md; the mission note says platform unknown) | 2008; start of a GC co-op playlist; comments explain the first wall boost input (Z + D-pad left on GC).
9. https://www.youtube.com/watch?v=jpNE979X_6M | Co-Op Part 1: Super Secret Agent Training | pwnagemcgee | 8:34 | not stated | Commentary; auto chapters cover rope moves and security [INFERRED / UNCERTAIN].
10. https://www.youtube.com/watch?v=PP_1bFZ7sU4 | (Coop) Training IL 1:28 (WR) | Playbottl | 1:50 | not stated | Speedrun; shows the minimum route (speedrun.com lists "Team Training (Co-op)" with a WR of about 1:27, so this may be the PS2 level).
- Also: https://www.youtube.com/watch?v=d4BM_kYG0Zw (soluceinfo, FR, 4:00); https://www.youtube.com/watch?v=OXPj2u6IL0Y (Melisca 24, Xbox, commentary, 13:50); https://www.youtube.com/watch?v=RXNrz5N-qZE (PS2 split-screen, Củ Cà Rốt Co-op Team, 10:00); https://www.youtube.com/watch?v=m5lUF8rdW4Q (PS2 "Coop Trening", xxxPS2xxx, 4:21).
- From the mission notes: https://www.youtube.com/watch?v=IJgx6wDn7b4 (Let's Play ... Co-op Campaign - Part 1 - Training, bngbox, 13:52); https://www.youtube.com/watch?v=VC5OdmsjlFM (Co-Op- Training, WeAreDeathBringers, 9:02); https://www.youtube.com/watch?v=s-taHB0lRnI (Coop w/ Konoa episode 1. Training, trexzilla65, 9:04); https://www.youtube.com/watch?v=pahK7Ege1c0 (Coop. Attempt - training, Expert (RU title), SHOCK-25, 6:21, PC per RU Fandom's gallery title); https://www.youtube.com/watch?v=MCU6nG2MuA8 (Co-op Lv.1 Training 100% Expert, blueshoezproductions, 5:20); https://www.youtube.com/watch?v=KbmMgWNGsAA (Mision Entrenamiento (Coop), Building Experiences, 5:21, Spanish); https://www.youtube.com/watch?v=_NbBIy8ZCMQ (SHOCK-25 PS2 full walkthrough of all co-op missions, 2:01:17); full campaigns DeepVelocityOps and 3dCossack (9.8).
- Probably not this mission: https://www.youtube.com/watch?v=KITpNqMXnZY (Training Videos (PS2, Xbox, PS3 & PC), TheApacheKing, 1:04:26; likely the single-player training videos) [INFERRED / UNCERTAIN]; Isolated Oaf "All Training Videos" https://www.youtube.com/watch?v=6Uy0tnDb5Ec (PS2) and https://www.youtube.com/watch?v=1-Tyzb41how (PC), in-game tutorial videos, whether they include co-op move videos is [INFERRED / UNCERTAIN]. Uploads titled "Co-Op Training Mission" by FlounderCorps were also noted in the source register (no URL recorded).
- Failed-tutorial and training-fail clips: see 9.12.

### 9.2 Panama (Xbox/PC first mission; PS2/GC last)

1. https://www.youtube.com/watch?v=KlU0002suD4 | Coop: Panama (100% / Expert / Elite / Ghost) | V339 | 22:46 | PC (likely) | No commentary; uploader says the only traces left were a few alerted guards and two hacked eye scanners.
2. https://www.youtube.com/watch?v=TvecAMtS_vk + https://www.youtube.com/watch?v=a7m1K7VaJOI | COOP Panama 100% Elite No KO/Kill 1/2, 2/2 | hexen2k7 | 6:15 + 6:15 | PC (likely) | In-game time 10:58, zero detections; briefing and objectives in description.
3. https://www.youtube.com/watch?v=jgsTLGSXyMc | CO-OP Walkthrough, 100% Stealth, Part 2 "Panama" | Centerstrain01 | 22:23 | not stated | 80k views; auto chapters: Archives, Extraction [INFERRED / UNCERTAIN].
4. https://www.youtube.com/watch?v=1risWusbZWc | Coop Mission 1 - Panama 100% Expert | R3xXcoN GAMING | 16:38 | PC (Bandicam) | Single file; part of a 32-video co-op playlist; speedrun version https://www.youtube.com/watch?v=6aVpuTjhde0 (8:04).
5. https://www.youtube.com/watch?v=631YgJdDgyg | CO-OP Full Stealth Walkthrough (Mission 1: Panama) | Defy248 | 35:34 | not stated | Expert, Elite, 0 KOs; slower, more deliberate.
6. https://www.youtube.com/watch?v=_YLK0cjSekE | Co Op Mission 1 Panama 100% With No Alarms | Because I Can | 23:29 | Xbox | 2025; one save used; first part has no audio.
7. https://www.youtube.com/watch?v=D1zUg9YGRj0 | XLink Kai Co-op - Mission 1 Panama | Xbox Kai Fam Live | 52:18 | original Xbox, online | Failed attempts cut out; normal (non-ghost) play.
8. https://www.youtube.com/watch?v=2FmkMk4rHQw | (Co-Op PS2 US Version) 05 - Panama | Jake "Ziggity" Steven | 31:01 | PS2 | Creator chapters: The Alley 0:00, East Wing 5:05, Archives 13:03, Server Room 22:57.
9. https://www.youtube.com/watch?v=ksP5rk2eJKQ | Coop [PS2-PCSX2-HD] Mission 4: Panama | SHOCK-25 | 29:38 | PS2 | Uploaded 2017-06-30; part timestamps Alley 00:00, East Wing 05:22, Archives 12:18, Server Room 18:33, with per-part stats.
10. https://www.youtube.com/watch?v=CtGfBsU1DwI (+ parts 2-4 in the ysuck63 GC playlist) | Co-op Panama Bank Part 1 | ysuck63 | 4:32 | GameCube | The uploader names the level "Panama Bank"; what "bank" refers to is [INFERRED / UNCERTAIN].
- Also: https://www.youtube.com/watch?v=wU3hCoPYtT4 + https://www.youtube.com/watch?v=UvTRAKxshoU (TimbuckRules, Expert CO-OP Panama 1/2, 2/2 100%, 12:11 + 8:22, 2009); https://www.youtube.com/watch?v=qDooMV-HnYM (ImbaSneakingTeam, SCCT COOP Panama 100% Expert/Elite - 8:05 [REUPLOAD], video 9:03); https://www.youtube.com/watch?v=Rl592Km8OZw (Urban Reflex, Co-Op Part 1: Panama, PC Steam per description, commentary, 43:14, uploaded 2013-06-02); https://www.youtube.com/watch?v=XS6GZuy4iBg + https://www.youtube.com/watch?v=Z6ZsFw6Jg1g (NickyTheGamer, coop Walkthrough - Panama part 1/2, 8:02 + 9:28; GC per videos.md, platform unknown per the mission note [INFERRED / UNCERTAIN]); https://www.youtube.com/watch?v=lFHlkLTsKQI (Củ Cà Rốt Co-op Team, PS2 Coop Splitscreen Panama, 2:07:14); https://www.youtube.com/watch?v=0QznY6rsC3U (hexen2k7 "Action in Panama", 9:31, apparently a stylised edit; content unknown).
- From the mission notes: https://www.youtube.com/watch?v=T0MMaVD_eaM (Coop [2: Panama], Agt_ Pendergast, 49:34); https://www.youtube.com/watch?v=Z4ok0KiZVuo (Coop w/Flash - Mission 1 - Panama (PC Lan), MSochist, 41:01, PC LAN); https://www.youtube.com/watch?v=hShwINqT0HI (Panama - COOP, Spyker2041, 45:21); https://www.youtube.com/watch?v=NQMoQIPgGZ4 (Chaos Theory Coop: Panama, CptLeader, 22:33); https://www.youtube.com/watch?v=IMqljhkvS8E ((COOP) - Mission 2 - Panama - SoluceInfo [HD], soluceinfo, 16:50, French, Expert 100% per the search snippet; also on Dailymotion https://www.dailymotion.com/video/xlxq4t); https://www.youtube.com/watch?v=R03ZkOotVPE + https://www.youtube.com/watch?v=NKGL6wacpYs (CO-OP Panama Expert 100% (HD, RUS) Part 1/2, Eptable, 10:22 + 7:43); https://www.youtube.com/watch?v=XexhiIPClAk ([КООП] Прохождение ... #2. Панама, Russian commentary, ПЕРЕВОДКИ, 1:34:16); https://www.youtube.com/watch?v=mGrN70e_l4Q (Co-op Panama w/ Overloaded50cal "Screw Stealth" Part-1, CrypticNmad, 14:08, loud/assault play); https://www.youtube.com/watch?v=-R4jUzkk7oI (PS2 Classics - Splinter Cell Chaos Theory COOP, DantasLevi, 2:13:25, PS2 Classics = PS3/PS4 re-release of the PS2 build; which missions are covered is unknown); French Dailymotion upload "Splinter Cell Chaos Theory - Coop. Panama" https://www.dailymotion.com/video/xmaxsg (platform unknown).

### 9.3 Seoul ("Seoul 3" on Xbox/PC; "Seoul" on PS2/GC)

1. https://www.youtube.com/watch?v=A9qRzUt9RtE | Coop: Seoul 3 (100%* / Expert / Elite / Ghost) | V339 | 19:47 | PC (likely) | No commentary; explains the 90% cap; many forced engagements avoided with careful smoke grenades.
2. https://www.youtube.com/watch?v=1-KpQGqaYd8 + https://www.youtube.com/watch?v=M3kPwc52rmI | COOP Seoul3 100% Elite No KO/Kill 1/2, 2/2 | hexen2k7 | 6:18 + 6:34 | PC | In-game time 10:46; one knockout and two civilian knockouts, all marked as objectives.
3. https://www.youtube.com/watch?v=_1ijhaN0cmw | CO-OP Walkthrough, 100% Stealth, Part 3 "Seoul 3" | Centerstrain01 | 20:14 | not stated | Auto chapters mention a tank sabotage and an interrogation [INFERRED / UNCERTAIN].
4. https://www.youtube.com/watch?v=S1KySIBDvKQ | Co-op: Seoul PC (Expert) HD | Splinter | 31:45 | PC | Both screens shown; no-KO "tactical espionage" style; general interrogation noted as a bonus objective.
5. https://www.youtube.com/watch?v=yQPMp8u8Cqc + https://www.youtube.com/watch?v=zs2CPw52P-E | Coop Mission 2 - Seoul 3 1/2, 2/2 100% Expert | R3xXcoN GAMING | 10:35 + 7:06 | PC | One KO. An Elite/Expert version is also in the same playlist.
6. https://www.youtube.com/watch?v=EasI1Hs9TWM | XLink Kai Co-op - Mission 2 Seoul | Xbox Kai Fam Live | 31:21 | original Xbox (online via XLink Kai) | Fails cut out.
7. https://www.youtube.com/watch?v=__LRg8KrYQ8 | (Co-Op PS2 US) 02 - Seoul | Jake "Ziggity" Steven | 18:50 | PS2 | Creator chapters: Streets 0:00, Rooftops 2:52, Gardens 5:25, Fish Market 9:00, Cyber-Cafe 13:55.
8. https://www.youtube.com/watch?v=KWwInB9WjNY | Coop [PS2-PCSX2-HD] Mission 1: Seoul | SHOCK-25 | 15:06 | PS2 | Beat timestamps (see 9.0); the video Fandom embeds.
9. https://www.youtube.com/watch?v=cwBOPjYbi5k | co-op walkthrough SEOUL | NickyTheGamer | 6:09 | GameCube (platform unclear per the mission note) | Uploader says the GC Seoul sub-missions are very short; all fit in one video, the first done in under a minute.
10. https://www.youtube.com/watch?v=65Ls9P9GwKE + https://www.youtube.com/watch?v=cLMkZMd3nwE | Co op Campaign - Seoul 1/2, 2/2 - Split Screen | BK201Tach | 15:36 + 12:51 | not stated (split-screen) | Commentary-free family playthrough.
- Also: https://www.youtube.com/watch?v=-mf3o-FxGAQ (Defy248, CO-OP Full Stealth Walkthrough (Mission 2: Seoul 3), Expert Elite, 28:36); https://www.youtube.com/watch?v=puvCXAdiRxk (soluceinfo FR, Expert, 90%); https://www.youtube.com/watch?v=PRhaF2S6EJw / https://www.youtube.com/watch?v=AyneyhuZOak / https://www.youtube.com/watch?v=pRO9IkxdtV8 (ysuck63 GC, Co-op: Seoul Part 1/2/3, 5:28 / 3:12 / 2:34; first two sub-missions at 100%); https://www.youtube.com/watch?v=Kkqs_P6Q7r8 (GC on Dolphin 2/3); https://www.youtube.com/watch?v=vP51V2QUMS0 (fisher5390, 2007, "stealth 100%", 5:54, platform unknown); https://www.youtube.com/watch?v=axYqdY1AJ9E (Spyker2041 first-time run; its auto chapters misname Jong, showing auto chapters are unreliable).
- From the mission notes: https://www.youtube.com/watch?v=rDGnqa71XCg (Coop [3: Seoul], Agt_ Pendergast, 34:21); https://www.youtube.com/watch?v=6q3P3ZQFfOk ([1920x1080 PC] ... Expert 90% (Glitch?) #14 Coop Seoul 3, PleasePlayMore, 26:18, PC); https://www.youtube.com/watch?v=uyf_-BboQSY (Co-Op Part 2: Seoul, Urban Reflex, 40:02, likely commentary); https://www.youtube.com/watch?v=isOwNhn7umM (Chaos Theory Co-op w/ Revocane - 03 (Seoul), LethalFeline, 59:06, commentary let's play); https://www.youtube.com/watch?v=vwhx-Izgj9g (PS2 (Aether SX2) Co-op Seoul, Hunter Seeker, 19:27, PS2 emulated); https://www.youtube.com/watch?v=YPxKsdRLmgQ (SC: Chaos Theory - Co-Op - Streets, TheTurok, 2:15, PS2/GC Streets sub-level); https://www.youtube.com/watch?v=kVCaUgzYtQk (PS2 Classics - COOP, DantasLevi, 1:33:50, PS2 Classics on PS3/PS4, multiple missions); also listed for Seoul: DeepVelocityOps (Seoul 3 chapter 1:05:34), Distro speedrun, Lawerenceofalevi, ParagonMitchell, SHOCK-25 PS2 full.

### 9.4 Chemical Bunker

1. https://www.youtube.com/watch?v=chb66dBOt74 + https://www.youtube.com/watch?v=ILxhYQ1BHc0 | COOP Chemical Bunker 100% Elite No KO/Kill 1/2, 2/2 | hexen2k7 | 10:10 + 10:10 | PC | In-game time 19:39, zero detections; full objective list in description.
2. https://www.youtube.com/watch?v=FmSiWt_hVG4 + https://www.youtube.com/watch?v=mqyj-66XLMo | Coop Mission 3 - Chemical Bunker 1/2, 2/2 100% Elite/Expert | R3xXcoN GAMING | 15:17 + 14:05 | PC | A 4-part Expert version is also in the playlist (got 97%): https://www.youtube.com/watch?v=akWLnghZb8c (part 1/4, 7:32), https://www.youtube.com/watch?v=cn6EbsrR-b8 (3/4, 7:49), https://www.youtube.com/watch?v=BROMKfkVpYs (4/4, 8:35).
3. https://www.youtube.com/watch?v=pMqEoJ1m8Oc | Coop [4: Chemical Bunker] | Agt_ Pendergast | 46:53 | not stated | Single file, full mission.
4. https://www.youtube.com/watch?v=hHg-nYqfLzA | PC - Co op Chemical Bunker [4K:60FPS] | ShepherdMods | 42:33 | PC | High-resolution capture, useful for reading geometry.
5. https://www.youtube.com/watch?v=nCJ8xbWt-nM | co-op 100% Chemical bunker | Zolt Assassin | 44:14 | not stated | Page not read; the 100% claim comes from the title only.
6. https://www.youtube.com/watch?v=qLQEHSaRECM | (Co-Op PS2 US) 03 - Chemical Bunker | Jake "Ziggity" Steven | 32:29 | PS2 | Creator chapters: Silo 0:00, Laboratories 6:04, Cryogenic Chamber 15:56, Storage Room 21:25, The Docks 27:42.
7. https://www.youtube.com/watch?v=NTaZh6gW8R0 | Coop [PS2-PCSX2-HD] Mission 2 ("Chemical warehouse") | SHOCK-25 | 37:54 | PS2 | Beat timestamps (see 9.0); the video Fandom embeds.
8. https://www.youtube.com/watch?v=xVf5HzPBx9Q + https://www.youtube.com/watch?v=T2XssBZ_jgI | co-op walkthrough Chemical Bunker Part 1, 2 | NickyTheGamer | 8:20 + 7:38 | GameCube (per uploader's Seoul description) | Uploader mentions a big shortcut in the first level.
9. https://www.youtube.com/watch?v=8Ldd9814MoE (+ parts 2-5 in playlist) | SC: CT Co-op Chemical Bunker 1-5 | ysuck63 | 4:51 etc. | GameCube | Five parts, likely one per sub-level [INFERRED / UNCERTAIN].
10. https://www.youtube.com/watch?v=49TgQ2npG1Y | Coop - Chemical Bunker | Spyker2041 | 44:07 | not stated | First-time run. Auto chapters mention an elevator puzzle, laser grid, cryo access, retinal scanner and a "warhead room and crane puzzle" [INFERRED / UNCERTAIN]; worth checking on screen.
- Also: https://www.youtube.com/watch?v=8OvS5zQkS6w (Urban Reflex, Co-Op Part 3: Chemical Bunker, PC, commentary, 51:17); https://www.youtube.com/watch?v=Cgp8_wNtyQk (Củ Cà Rốt Co-op Team, PS2 split-screen, 55:15); https://www.youtube.com/watch?v=dWuinQ0k8pg (R3xXcoN 100% speedrun, 14:54).
- From the mission notes: https://www.youtube.com/watch?v=VgD93an8rR4 ([1920x1080 PC] ... Expert 97% (Glitch?) #15 Coop Chemical Bunker, PleasePlayMore, 44:49, PC, chaptered menu per description); https://www.youtube.com/watch?v=0u1jDBvgUt8 (CHEMICAL BUNKER - CO-OP - 3#Gameplay (No Commentary), No Commentary Games, 58:24); https://www.youtube.com/watch?v=Z_mYQGQKh6s (COOP 100%-(97%) - Chemical Bunker #3 - ELITE - EXPERT - GHOST, TrayZorXx67, 26:49); https://www.youtube.com/watch?v=Ld6H1XUU_rQ / https://www.youtube.com/watch?v=DXgR6ze6fDg (COOP Chemical bunker No KO/KILL 100% HARD part 1/3, 3/3, BoSstonPL, 17:03, 10:12); https://www.youtube.com/watch?v=EspA0lPkbBg (Coop - Bunker de Biochimie - PC 100% Stealth, Xx_Jordan_38_xX, 24:34, PC, French); https://www.youtube.com/watch?v=VTja3c9-cHU ([Splinter Cell Chaos Theory] Bunker Co-Op, Magic Man, 47:13, commentary); https://www.youtube.com/watch?v=TtVTD0rFPQ4 (Chaos Theory Co-op w/ Revocane - 04 (Chemical Bunker), LethalFeline, 1:18:49, commentary); https://www.youtube.com/watch?v=xuzDeqcEMpk / https://www.youtube.com/watch?v=SW2RQrlizM8 ("Not the Monkey Window" E13 / "Don't Dis the Protocol" E14, MintyJonesGaming, 18:40 / 21:15, commentary episodes on the lab and protocol); https://www.youtube.com/watch?v=H146Z-CDbbY (split co-op Chemical Bunker); also DeepVelocityOps (Chemical Bunker chapter from 1:42:26), Distro speedrun, SHOCK-25 PS2 full, DantasLevi PS2 Classics.

### 9.5 Train Station (Xbox/PC "Grand Central"; PS2/GC four sub-levels)

1. https://www.youtube.com/watch?v=2X5MvQPOQ14 + https://www.youtube.com/watch?v=yDq17RUC8fs | COOP Train Station 100% Elite No KO/Kill 1/2, 2/2 | hexen2k7 | 6:36 + 6:44 | PC | In-game time 11:41; full objective list and stats in description.
2. https://www.youtube.com/watch?v=-JnlamHBZrc | Co-op Mission 5 - Train Station 100% HD | Suru | 13:38 | not stated | Elite, 0 kills, 0 alarms. Creator chapters: schematics 1:36, bombs 3:06 / 4:43 / 5:28, phone bug 7:24, Chu 10:56 ("Killing Chu"), extraction 13:30. Best single-file beat map. Stat blocks: one player 0 KOs, the other 2 KOs, 100%.
3. https://www.youtube.com/watch?v=SXHCqjqi_Tc + https://www.youtube.com/watch?v=kRDWrH-zamE | Coop Mission 4 - Train Station 1/2, 2/2 100% Elite/Expert | R3xXcoN GAMING | 9:45 + 15:22 | PC | A 3-part Expert version is also in the playlist: https://www.youtube.com/watch?v=H6g5WoCDuPc (part 1/3, 5:57, PC Bandicam), https://www.youtube.com/watch?v=Dei0Pv9K-yQ (part 3/3, 8:23).
4. https://www.youtube.com/watch?v=xjynpfObTLs | Co-op: Train Station 1/2 PC (Expert) HD | Splinter | 40:38 | PC | 100% Expert, no KOs, very slow and cautious; part 2/2 https://www.youtube.com/watch?v=ALT_boVDdPc (21:28).
5. https://www.youtube.com/watch?v=B0INvKmshWg | Coop [5: Train Station] | Agt_ Pendergast | 32:04 | not stated | Single file.
6. https://www.youtube.com/watch?v=_UclJhv8ZUs | COOP 100% Train Station, Elite / Expert / Ghost (#4) | TrayZorXx67 | 19:17 | not stated | 2025, FR; partner's perspective is in a separate upload.
7. https://www.youtube.com/watch?v=ge7dEnjp6MU | (Co-Op PS2 US) 04 - Train Station | Jake "Ziggity" Steven | 30:34 | PS2 US (emulated) | Creator chapters: Train Repair Station 0:00, Hydro Tunnel 5:37, Subway 16:42, The Station 23:00; comments explain the bomb (thermal, X button, vibration).
8. https://www.youtube.com/watch?v=gxnoQJNrPV8 | Coop [PS2-PCSX2-HD] Mission 3 (Железнодорожный вокзал) | SHOCK-25 | 33:06 | PS2 | Beat timestamps and stats (see 9.0).
9. https://www.youtube.com/watch?v=NrooRPC9cog | co-op walkthrough Train Station part 1 | NickyTheGamer | 8:56 | PS2/GC build (GameCube likely) | 53k views; part 2 https://www.youtube.com/watch?v=1Gt2zOJKb2U (6:26).
10. https://www.youtube.com/watch?v=5t6c1xj2IqI | COOP Train Station\Dworzec Kolejowy No KO/KILL 100% HARD part 1\2 | BoSstonPL | 16:38 | not stated | Polish.
- Also: https://www.youtube.com/watch?v=B5mtzFTTI3s (Urban Reflex, Co-Op Part 4: Train Station, PC/Steam, commentary, 35:03); https://www.youtube.com/watch?v=LY9-0Dk-YHk (ysuck63, Co-op Train Station Part 1, 4:32, GameCube per description; comments explain the bomb); https://www.youtube.com/watch?v=1FYUWwle97Q (Củ Cà Rốt Co-op Team, PS2 split-screen, 1:46:05); https://www.youtube.com/watch?v=PsHnw-tdpzQ (R3xXcoN 100% speedrun, 14:04).
- From the mission notes: https://www.youtube.com/watch?v=Iduxc5xLfnM ([1920x1080 PC] ... Expert 100% #16 Coop Train Station, PleasePlayMore, 32:09, PC Windows 10); https://www.youtube.com/watch?v=8FiRUvq86sg (COOP - Trainstation 1/2, Pretend3r, 5:59; comments explain the bomb); https://www.youtube.com/watch?v=ZZS39MjyiS4 (Co-op Train Station (stealthy), dinomarino1, 18:47); https://www.youtube.com/watch?v=jUwiHOGcBO4 ([Splinter Cell Chaos Theory] Train Station Co-Op, Magic Man, 1:00:48); https://www.youtube.com/watch?v=EOaLTYHNGD0 (Co Op Mission Train Station, Kreepa, 2:13:04); https://www.youtube.com/watch?v=hQliVhgIWSg (Co-Op TRAIN STATION WR (4:52) Any% No QS/QL, KuroKishi_duLac, about 5 min, PC, speedrun.com); https://www.youtube.com/watch?v=X6Qzto6XEdk (SC:CT Co-op IL - Train Station [6:48] (WR), Buttercak3, about 7 min, PC, speedrun.com); https://www.youtube.com/watch?v=ukQmQgNAKMM (Valrix Plays ... Train Station Part 1 (Co-Op Gameplay), Vexxed, 10:01); https://www.youtube.com/watch?v=3iYIZ523cNc (co-op train repair station, Akos, 4:22, PS2/GC build sub-level); https://www.youtube.com/watch?v=akFHEo91RA0 (bomb disarm guessing); DeepVelocityOps (Train Station chapter 2:58:19).

### 9.6 Nuclear Plant (Xbox/PC download only)

1. https://www.youtube.com/watch?v=OBU3MtaoKb4 + https://www.youtube.com/watch?v=rVg3fr3OrPA + https://www.youtube.com/watch?v=jry663Tx5bg | COOP Nuclear Plant 100% Elite No KO/Kill 1/3-3/3 | hexen2k7 | 8:02 + 8:03 + 8:07 | PC (2009, not stated) | In-game time 22:44; zero detections; briefing, objectives and stats in the description; comments note Lambert is silent; a commenter says Elite guards investigate at the slightest noise and fire at once.
2. https://www.youtube.com/watch?v=phfqPfdFZdQ | [1920x1080 PC] Expert 100% #17 Coop Nuclear Plant | PleasePlayMore | 30:57 | PC (Windows 10) | No commentary, single file; the uploader counts it as the fifth co-op mission; description says some missions cannot reach 100% because of glitches; comments say Xbox One has the maps.
3. https://www.youtube.com/watch?v=tg8sn2ZC2CY / https://www.youtube.com/watch?v=mODHEazeQr8 / https://www.youtube.com/watch?v=YpVZb_5lGq8 | Coop Mission 6 - Nuclear Plant 1/3-3/3 100% Expert | R3xXcoN GAMING | 8:37 + 6:51 + 10:09 | PC (Bandicam) | Elite/Expert versions also exist: https://www.youtube.com/watch?v=kM-HTagymSM (part 1/3, 7:05, PC, 2018), https://www.youtube.com/watch?v=OWqEWyFiN34 , https://www.youtube.com/watch?v=ioOcGz6P_PQ ; comments: enemies spot you much more easily on Expert.
4. https://www.youtube.com/watch?v=wIRXoX8nd0I | Coop [6: Nuclear Plant] | Agt_ Pendergast | 48:23 | not stated | Single file.
5. https://www.youtube.com/watch?v=8Ww7rE4UOm8 | Co-Op Part 5: Nuclear Plant | Urban Reflex | 52:39 | PC/Steam | Commentary.
6. https://www.youtube.com/watch?v=BXhyhwzT67c | COOP Nuclear Plant No KO/KILL 100% HARD 1/3 | BoSstonPL | 15:39 | not stated | Polish; counted as Mission 5; further parts https://www.youtube.com/watch?v=B6tnTABDOtc , https://www.youtube.com/watch?v=qbLoTbAPNi4 .
7. https://www.youtube.com/watch?v=-TWOS7Mb1OA (+ https://www.youtube.com/watch?v=8L90xIjo9uk , https://www.youtube.com/watch?v=wdxUBFyBMlA) | COOP - Nuclear Plant 1/3-3/3 | Pretend3r | 6:43 + 5:59 + 7:29 | not stated | Part of a complete playlist; fast run; 3/3 shows "a major shortcut".
8. https://www.youtube.com/watch?v=H-AXCQQ8sCs | Co-op part 6: Nuclear Plant (RU) | dat_carlin | 54:28 | PC (likely) | Notes on the mission-order swap (see 9.0); judged it the hardest mission.
9. https://www.youtube.com/watch?v=BTZC73LY1Lw (parts 1-4) | COOP "Атомная станция" (RU) | PAYKOOBRAZNIY | 37:38 each approx. | PC | Russian commentary; partner's view of TheEasyNICK's run; further parts https://www.youtube.com/watch?v=_Dh7tza0XJk , https://www.youtube.com/watch?v=uJX02s3DmfM , https://www.youtube.com/watch?v=7npoMU0SrdU .
10. https://www.youtube.com/watch?v=H1dZFtX0jxY | Speedrun Co-op "Nuclear Plant" 8:31 | TimmyAkmed | 9:33 | not stated | Easiest settings with glitches; shows skips, not intended flow.
- From the mission notes: https://www.youtube.com/watch?v=xFO_ntoDVBY (Coop - Power Plant (Blind) - 04/06/12, Spyker2041, 1:18:45, first-time play; auto chapters machine-generated); https://www.youtube.com/watch?v=ocRhdbfZ798 (FazePlays COOP - Nuclear Plant, 6:10); https://www.youtube.com/watch?v=qcI5CBbQ2vE (Co-Op NUCLEAR PLANT WR (7:41) Any% No QS/QL, KuroKishi_duLac, about 8 min, PC, speedrun.com); https://www.youtube.com/watch?v=DaxcKvwW7LI (SC:CT Co-op IL - Nuclear Plant [8:18] (WR), Buttercak3, about 8 min, PC, speedrun.com); https://www.youtube.com/watch?v=Ti5rTnmVL3E (Let's Play ... Coop-Mode Atomkraftwerk Part 1/15, RednBlue2k9, 5:54, PC patch 1.05, German; parts 2-15 on the same channel, for example 15/15 https://www.youtube.com/watch?v=N3QdeyXEufQ); https://www.youtube.com/watch?v=3janOG4RYT4 ("Атомная станция" 1/4, TheEasyNICK, 37:26, PC, Russian; 4/4 https://www.youtube.com/watch?v=iOqpdDhbkGE , 38:36; other parts https://www.youtube.com/watch?v=-4Kq2wMmWwU , https://www.youtube.com/watch?v=ezBiZ-_5E2Y); https://www.youtube.com/watch?v=zNATeaH07Cs (CO OP | Power Plant, Metal Lenny, 0:59, short clip); https://www.youtube.com/watch?v=Bf7afScPj-c (GhostLetsPlays, Czech; "probably one of the longest co-op missions"); further uploads scanned in the gap pass: https://www.youtube.com/watch?v=c7slNfcHmig , https://www.youtube.com/watch?v=1Od5OMtil9w , https://www.youtube.com/watch?v=KQoTIplV_QA , https://www.youtube.com/watch?v=U3wdapNPbaY (also MrBonJonson, CrypticNmad, FazePlays, TrayZorXx67 uploads); DeepVelocityOps (Nuclear Plant chapter 5:33:56, played last); Distro speedrun (ends at Nuclear Plant, PC order).
- No uploader-written chapters exist on any of about 30 Nuclear Plant uploads scanned (hexen2k7, PleasePlayMore, R3xXcoN, BoSstonPL, Pretend3r, TheEasyNICK, PAYKOOBRAZNIY, dat_carlin, MrBonJonson, GhostLetsPlays, CrypticNmad, FazePlays, TrayZorXx67, Agt_ Pendergast, Spyker2041, Urban Reflex, speedrun ILs); the only chapter list (Spyker2041) is machine-generated. [negative result] No PS2/GameCube video exists because the mission does not exist on those platforms. No original-Xbox-labelled Nuclear Plant upload was found (CR4ZY BALLISTICS' Xbox recording is UN HQ only).

### 9.7 UN Headquarters (Xbox/PC download only)

1. https://www.youtube.com/watch?v=5RBmv-nRtTs + https://www.youtube.com/watch?v=Vmob0mzcINg + https://www.youtube.com/watch?v=-mU9NO8dxVw | COOP UN Headquarters 100% Elite No KO/Kill 1/3-3/3 | hexen2k7 | 7:43 + 7:43 + 8:05 | PC (2009, not stated) | In-game time 21:32; one knockout (objective); briefing explains the non-lethal rule; objectives and stats in the description.
2. https://www.youtube.com/watch?v=3CH1BrvzlPA | [1920x1080 PC] Expert 100% #18 Coop UN Headquarters | PleasePlayMore | 34:17 | PC (Windows 10) | No commentary, single file.
3. https://www.youtube.com/watch?v=v4gb6uKa5SQ + https://www.youtube.com/watch?v=uHMLby5KwZI | Coop Mission 5 - UN HQ 1/2, 2/2 100% Elite/Expert | R3xXcoN GAMING | 14:59 + 13:54 | PC | 3-part Expert version also exists: https://www.youtube.com/watch?v=Ya-6NCCKmTg (1/3, 8:36, PC Bandicam), https://www.youtube.com/watch?v=0iWVH-KZ6_8 (2/3, 8:16), https://www.youtube.com/watch?v=DbJGFSi1FKo (3/3, 9:55).
4. https://www.youtube.com/watch?v=yQH90XJtxTY + https://www.youtube.com/watch?v=2X_1z7gNOyw | Co-op UN HQ part 1, 2 | CR4ZY BALLISTICS | 21:15 + 9:13 | original Xbox (HD PVR2 capture) | Uploader calls it a longplay. The only confirmed original-Xbox capture of this mission found.
5. https://www.youtube.com/watch?v=TvaVH-CWZRM | Coop [7: UN Headquarters] | Agt_ Pendergast | 43:50 | not stated | Single file.
6. https://www.youtube.com/watch?v=748PAmV4MUc | Co-Op Part 6: UN Headquarters | Urban Reflex | 45:56 | PC/Steam | Commentary; uploader calls it the finale.
7. https://www.youtube.com/watch?v=vHbEPapMngk | UN HEADQUARTERS - CO-OP - 5# Gameplay (No Commentary) | No Commentary Games | 43:27 | not stated |
8. https://www.youtube.com/watch?v=iTrJGQAZg-o | Coop Mission 5 UN HQ 100% SpeedRun | R3xXcoN GAMING | 17:04 | PC | Fast but still 100%; a commenter: "my brothers and I went through hell".
9. https://www.youtube.com/watch?v=PoXfW1ZVeBI | COOP Миссия "ШТАБ-КВАРТИРА ООН" 1/2 (RU) | TheEasyNICK | 25:48 | PC (likely) | Russian commentary; 2/2 https://www.youtube.com/watch?v=KiuKSDDxsUo (28:46).
10. https://www.youtube.com/watch?v=QUCFE8TJccA | Czech coop LP - UN Headquarters part 1 | GhostLetsPlays | 22:19 | not stated | Czech commentary; part 4 https://www.youtube.com/watch?v=iYKmSOodngw (16:23), the part that ends the mission, where a viewer says the little wires made him tear his hair out.
- From the mission notes: https://www.youtube.com/watch?v=cdCN8UQOvn8 (COOP - UN Headquarters 1/2, Pretend3r, 8:24; 2/2 https://www.youtube.com/watch?v=75QYl5F9nKM , 9:01; PC 2005-06, Normal at 640x480 because of lag); https://www.youtube.com/watch?v=MS-4g3ZHyXk (UnRun - A Splinter Cell Cooperative Speed Run of The United Nations Mission, LazyEye4, 11:55, PC Fraps, two synced perspectives); https://www.youtube.com/watch?v=iD_AeCbzvJI (Co-Op UN HEADQUARTERS WR (6:05) Any% No QS/QL, KuroKishi_duLac, about 6 min, PC, speedrun.com); https://www.youtube.com/watch?v=B8z_7lUW6XI (SC:CT Co-op IL - UN Headquarters [8:04] (WR), Buttercak3, about 8 min, PC; the runner's reply confirms the roof-door start and explains the taser invisibility glitch); https://www.youtube.com/watch?v=C05yF9EI8Uo (COOP UN Headquarters\Kwatera Glowna ONZ No KO/KILL 100% HARD part 2\2, BoSstonPL, 13:34); https://www.youtube.com/watch?v=ZjLMtG7irg8 (COOP, UN Action (Part1), martinschlauch, 7:34; part 2 https://www.youtube.com/watch?v=er8ZbvFLmMA , 8:22); https://www.youtube.com/watch?v=ULiNF7HcIV4 (Let's Co-Op ... W/AxmanAMV Episode 27: UN Headquarters, DoubleTroubeify, 19:33; subtitled "Suicide Central"); https://www.youtube.com/watch?v=WZi5Jum_mmo (FazePlays COOP - UN Headquarters, 7:13); https://www.youtube.com/watch?v=ZLs3zuAooBs (coop Штаб квартира ООН, Def Valerius, 41:56); DeepVelocityOps (UN chapter 4:07:54, played before Nuclear Plant).
- Possibly relevant: https://www.youtube.com/watch?v=g1WZNszNcfE (TimmyAkmed speedrun "New York" 6:46). Which NYC mission it covers (Train Station or UN HQ) is [INFERRED / UNCERTAIN].
- No uploader-written chapters or route notes on about 25 UN HQ uploads (hexen2k7, CR4ZY BALLISTICS, PleasePlayMore, R3xXcoN, Pretend3r, BoSstonPL, TheEasyNICK, DoubleTroubeify, GhostLetsPlays, martinschlauch, Def Valerius, FazePlays, speedrun ILs). [negative result]

### 9.8 Full co-op campaign videos and playlists

Single-file complete runs:
- https://www.youtube.com/watch?v=4GtVpbf1xAw | Co-op Exclusive Campaign, Complete Walkthrough | DeepVelocityOps | 7:22:04 | PC (Steam link) | 30k views, 2024. Creator chapters: Training 0:00, Panama 14:06, Seoul 3 1:05:34, Chemical Bunker 1:42:26, Train Station 2:58:19, UN HQ 4:07:54, Nuclear Plant 5:33:56. Normal pacing shows where real players stall.
- https://www.youtube.com/watch?v=LLww3vy8_1Y | coop - Hard, All Side Objectives - No Commentary | 3dCossack (- Multiplayer and Coop games) | 4:17:33 | not stated | Creator chapters: Training 0:00, Panama 11:06, Seoul 3 1:07:37, Chemical Bunker 1:38:32, Train Station 2:14:32, Nuclear Plant 2:53:44, UN HQ 3:38:17.
- https://www.youtube.com/watch?v=AYR7YqF5aMI | We Have Splinter Cells At Home | CouchiesTV | 2:02:52 | not stated | Comedy edit with creator chapters for every mission (including a "Bank" segment after Panama).
- https://www.youtube.com/watch?v=BTeinCL-KFk | Unredacting the Chaos Theory files | ParagonMitchell | 4:29:26 | PC (likely) | Long cut; auto chapters cover training, archives, a VP confrontation, a North Korean sector, a subway bunker and a final lab [INFERRED / UNCERTAIN].
- https://www.youtube.com/watch?v=nNiX9-Mwk20 | part 1 - Split screen Co-op - 1080p60 - No commentary | No commentary dog | 1:35:15 | Xbox 360 backward compatibility (uploader) | 42k views. Calls it split-screen on Xbox hardware. [ONE SOURCE]
- https://www.youtube.com/watch?v=0JWME32knV0 | PC COOP #1 (FR stream) | Tiflorg | 5:16:03 | PC | Creator chapters: Training 3:08, Panama 29:03, Seoul 1:54:34, Chemical Bunker 2:59:32.
- https://www.youtube.com/watch?v=kVCaUgzYtQk | PS2 Classics - COOP (stream) | DantasLevi | 1:33:50 | PS2 (PS2 Classics) |
- https://www.youtube.com/watch?v=_NbBIy8ZCMQ | Coop [PS2-PCSX2-HD] Full walkthrough - All co-op missions, Full Extended (RU title) | SHOCK-25 | 2:01:17 | PS2 (emulated) | Whole PS2 campaign.
- https://www.youtube.com/watch?v=X8QWLd8Z18A + https://www.youtube.com/watch?v=XtLqqPY6kPU | Let's Play Coop (Part One, Two) | Croakitoad | 2:51:40 + 2:54:04 | PC (likely) | Uploader says all six story levels, including the two late Xbox/PC releases.
- https://www.youtube.com/watch?v=W7BvAS6uY2I | Coop Campaign (PT-BR) | JVCOMANDO | 2:24:33 |
- https://www.youtube.com/watch?v=7KTmpnSJCyA | longplay (coop) stream | Multi Topic Talk | 3:33:56 |

Playlists:
- https://www.youtube.com/playlist?list=PL8CD4BB2EF76017B9 | hexen2k7 | 15 videos, all 7 missions, 100% Elite, Hard, no kills/alarms/bodies, no KO. Best clean reference set.
- https://www.youtube.com/playlist?list=PL9kYDIS3DwQiZYkt4hYaAOmqWvOCWC1pf | R3xXcoN GAMING "Classic SCCT Coop 100% Expert" | 32 videos: Expert, Elite/Expert and 100% speedrun versions of the six post-training missions. (Further R3xXcoN page read: https://www.youtube.com/watch?v=i1Ctp-CKpUk .)
- https://www.youtube.com/playlist?list=PLgyR0yzZK_7f-4rjO4iJke08CTCPtgLV8 | Agt_ Pendergast | 7 videos, one per mission, 15-50 min each.
- https://www.youtube.com/playlist?list=PLlSX5tH1nyFhjC01UAVXBo7kYJytZdOJu | Urban Reflex | 6 videos (Panama to UN HQ), PC, commentary.
- https://www.youtube.com/playlist?list=PL5D9DAA99163BEC2A | Pretend3r "COOP [complete]" | 12 videos.
- https://www.youtube.com/playlist?list=PL26727E6F5CCD6690 | ysuck63 "Co-op (GC)" | 16 videos, GameCube, 2008-09. The most complete GC co-op set found.
- https://www.youtube.com/playlist?list=PLAMlJxzkqk8hbfSlOVvdnHjS4hpezJdCQ | SHOCK-25 PS2 (single player + co-op) | items 11-15 are the full PS2 co-op campaign, 100% / no alarms, with timestamped beats.
- Jake "Ziggity" Steven PS2 US co-op 01-05 (US, 2023-24): obcKEeRniRw, __LRg8KrYQ8, qLQEHSaRECM, ge7dEnjp6MU, 2FmkMk4rHQw (no playlist found; search by title).
- https://www.youtube.com/playlist?list=PLspeOI0YmcdN9YHJYZWXxLagyzkU5liyD | GaLm "Casual Agents" | 15 episodes, commentary; episode 1 has 89k views.
- https://www.youtube.com/playlist?list=PL3FLe35dimGTQfLLgtdxrdNACeDc0fMO0 | YMS Streams "Plazethrough" | 8 parts, roughly 45-90 min each, commentary.
- https://www.youtube.com/playlist?list=PLDABDF07C09F86F5A | DoubleTroubeify with AxmanAMV | 40 episodes, commentary. Episode titles hint at beats ("Crane Life", "Defusing the Situation", "Elevator") [INFERRED / UNCERTAIN].
- Russian: https://www.youtube.com/playlist?list=PLQ6L-Ee5ECFXpnBVTm-V6SmQOBkvMjd9A (Berofu, PC, 9 parts); https://www.youtube.com/playlist?list=PL99EF637EDF39FE74 (RedWolfikPlay, 10 parts; episode names include Archive, Main Server, Chemical Bunker).
- Others found: Laugh A Lot Gamers (PLh5Z7c39-mylFZcxZgKjzG9UB0CHEgWRW); zalphaJigsaw (PLE784716A0DF28FD8); MrNinjafreak (PLqL25VC2zZMlnsOcNSDbv3K4TcmPRKXls); CrypticNmad (PLK5MCq2OWk1I-tn8a1IYTpZvnXexeQgW5); MEATfast "Stealth Stories" (PLAF995568E5699969); MotoVio (PL994E346F984E9A58); ManiaChris DE (PL6D9E923921B88F8A); GeorgianGamers (PL643587121476769E). (Playlist URLs: https://www.youtube.com/playlist?list=<id>.)
- Per-mission PS2 split-screen set (2026, low views): Củ Cà Rốt Co-op Team: Training RXNrz5N-qZE, Panama lFHlkLTsKQI, Chemical Bunker Cgp8_wNtyQk, Train Station 1FYUWwle97Q.

### 9.9 Speedruns (show routes and skips, not intended flow)

- https://www.youtube.com/watch?v=yEjHJb-SpjQ | Co-Op in 38m44s (world record per uploader, "new skips") | Distro (with Heinki) | 41:49 | Timing ends on the final frame of Nuclear Plant, which implies their run order ends with Nuclear Plant [INFERRED / UNCERTAIN]; comments on co-op fun.
- https://www.youtube.com/watch?v=gOn-T6LlNHk | co op Speedrun in 56:47 with commentary | Oldschooldummy | 57:12 | 2016; game audio replaced by music; uploader points to silly glitches that recur in later missions.
- https://www.youtube.com/watch?v=1ODKgDBEao4 and https://www.youtube.com/watch?v=ALN3KBYqyAw | Heinki co-op speedrun learning streams.
- GameCube 2-player IL speedruns by synzh (for example https://www.youtube.com/watch?v=0n_jqp8QH3U Level 1, https://www.youtube.com/watch?v=oIGRXjMCh2s Level 10, plus Levels 2, 3, 4, 11). The level numbering (at least 11) suggests GC sub-levels are counted individually [INFERRED / UNCERTAIN].
- PC IL world records (speedrun.com): Train Station hQliVhgIWSg (4:52) and X6Qzto6XEdk (6:48); Nuclear Plant qcI5CBbQ2vE (7:41) and DaxcKvwW7LI (8:18); UN HQ iD_AeCbzvJI (6:05) and B8z_7lUW6XI (8:04); LazyEye4 UnRun MS-4g3ZHyXk; Training PP_1bFZ7sU4 (1:28); further speedrun pages read in the gap pass: https://www.youtube.com/watch?v=79Q6LqfXck0 , https://www.youtube.com/watch?v=Q33b5tX5vPQ , https://www.youtube.com/watch?v=chkCInZRTIc .
- R3xXcoN 100% speedruns: Panama 6aVpuTjhde0 (8:04), Chemical Bunker dWuinQ0k8pg (14:54), Train Station PsHnw-tdpzQ (14:04), UN HQ iTrJGQAZg-o (17:04). TimmyAkmed Nuclear Plant H1dZFtX0jxY (9:33) and "New York" g1WZNszNcfE (6:46).
- Speedrun shortcuts use a glitch: one player fakes lock-picking a door while the partner tasers him, which leaves the model stuck and the player practically invisible ("becoming a ghost"). So speedrun videos are poor evidence for the intended route. [CONFIRMED - several sources: comments on B8z_7lUW6XI, yEjHJb-SpjQ, gOn-T6LlNHk]

### 9.10 Co-op moves showcases

No dedicated "all co-op moves" compilation was found under any of the query wordings tried. The best substitutes:
- Training-level runs (9.1), above all hexen2k7 (description lists each move drill) and V339 (clean ghost). [CONFIRMED - several sources: that Training is the move tutorial]
- https://www.youtube.com/watch?v=IIfns1gvSRY | E3 2004 CO-OP Mode Showcase (High Quality) | SickadtSteve | 4:25 | original E3 footage of co-op.
- https://www.youtube.com/watch?v=hFAPasSujbE (geimeris661, 3:55), https://www.youtube.com/watch?v=vzzG_KNahQ8 (gamethingsnet, 5:05), https://www.youtube.com/watch?v=rlUtBArK8Q4 (TimeLifeHD, 5:05) | official-looking co-op trailers. Content not described on the pages.
- https://www.youtube.com/watch?v=SjycM4h_5r0 | "СТЕЛС КООП ШЕДЕВР" | Tekkie | 12:03 | Russian video essay; creator chapters include a mini-guide to the mechanics (5:30) and teamwork (6:40).
- https://www.youtube.com/watch?v=t3btK_uM6KY | Review - How True Stealth and Co-op Work | itz_Saide | 49:54 | 2026; filmed with a co-op partner.
- https://www.youtube.com/watch?v=SYU5Ve4qKik | Charc0al and Rokazulu's co-op clips from 2008 | 2:02 | short community clips.
- https://www.youtube.com/watch?v=LXMhZHUOpEk | "Operation Throw Torgos" | redrumy3 | 0:32 | title suggests a partner-throw gag (Tomoe Nage fun) [INFERRED / UNCERTAIN].
- https://www.youtube.com/watch?v=6Uy0tnDb5Ec (PS2) and https://www.youtube.com/watch?v=1-Tyzb41how (PC) | All Training Videos | Isolated Oaf | in-game tutorial videos; whether they include co-op move videos is [INFERRED / UNCERTAIN].
- https://www.youtube.com/watch?v=-8Oio-dEv8M | "coop gameplay music video" (fan). [ONE SOURCE: oEmbed title]

### 9.11 Reviews, retrospectives and video essays that cover co-op

- https://www.youtube.com/watch?v=KCOcnYpCD0s | The Co-Op Experience | Lawerenceofalevi | 32:42 | Xbox (two Xbox Ones on system link); every mission done "to perfection" on Expert. Creator chapters: The Good 0:00, The Bad 10:04, The Ugly 28:56, The Results 30:15. The most design-relevant critique found.
- https://www.youtube.com/watch?v=SwxTLoWn5e4 | The most cursed co-op game | ParagonMitchell | 21:54 | 55k views, Feb 2026, PC. Argues the co-op is weaker than remembered, at least on PC. Creator chapters: Panama 5:56, Seoul 8:57, Chemical Bunker 12:47, Train Station 16:53, "An Unfortunate End" 20:30 (suggests they did not finish the late missions [INFERRED / UNCERTAIN]). About 90 comments, many family/split-screen memories.
- https://www.youtube.com/watch?v=3G7D5CjM6RU | Co-op Review (Retro Spectives Podcast Bonus 1) | 49:48 | Whether partner moves changed strategy or were just "elaborate keys" ("glorified door keys"), how the levels accommodate a second player, the griefing potential.
- https://www.youtube.com/watch?v=IuwfdmAicjc | Review Retrospective - Closer than ever | KIRK COLLECTS | 1:17:56 | 234k views; creator chapter "Splinter Cell Co-op" at 1:01:35.
- https://www.youtube.com/watch?v=q0gHxY-DFD8 | Is Chaos Theory As Good As I Remember? | Chris Davis | 42:40 | 248k views; chapter "Multiplayer and Co-Op Modes" at 39:15.
- https://www.youtube.com/watch?v=cfR80DTXYjU | The Peak Of Stealth | Boulder Punch | 30:58 | 111k views; creator chapter "Co-op & Spies Vs. Mercs" at 25:09.
- https://www.youtube.com/watch?v=1eetPo7gdQw | Xbox Review | IGN | 7:08 | 2005-era review re-uploaded in 2011; chapter "Co-Op Missions" at 3:55, which appears to be auto-generated [INFERRED / UNCERTAIN].
- https://www.youtube.com/watch?v=NeXMx_orkIg | PC and Xbox GameSpot Review (Greg Kasavin, re-upload) | 4:52 | contemporary review; co-op coverage not described.
- https://www.youtube.com/watch?v=nOZ7tuHzFlE | Splinter Cell on GameCube was...special | Hyper Tension Films | 1:05:35 | CT GC section 31:07-49:50; compares the GC port to PC/Xbox; whether it covers co-op is unknown.
- https://www.youtube.com/watch?v=w2jTmXleZHU | PS2 Vs GC comparison | Rozmon | 9:21 | uploader calls it mostly a test.
- https://www.youtube.com/watch?v=edi3vnpq2yw | Co-op Mode With My Girlfriend and It Was Chaotic | The Rat Shepherd | 17:02 |
- https://www.youtube.com/watch?v=YnlvSci_PCE | Retro 2005 PC vs OG Xbox | Digital Foundry | 38:55 | tech; co-op content unknown.
- https://www.youtube.com/watch?v=At3X6nNWLP0 | sentiment essay scanned in the gap pass (comments).
- Mostly single-player (co-op only touched, if at all): Acerthorn (https://www.youtube.com/watch?v=hs3sfnhWRSc , chapters are SP missions only), thesummerofmark (https://www.youtube.com/watch?v=4JRAPQg6UYw), Mister No Life (https://www.youtube.com/watch?v=Uhp1SCRIdmo), KingSigy (https://www.youtube.com/watch?v=6UGAwYEPG6M), CarmelOP (https://www.youtube.com/watch?v=Ydbu8_O3FQQ), David Strong (https://www.youtube.com/watch?v=g8M8Dly5zts).
- Versus-mode context (not co-op): Super Bunnyhop Spies vs. Mercs retro review (https://www.youtube.com/watch?v=YQ753pwa0B8 , 193k views); ParagonMitchell "The best multiplayer game you've never played" (https://www.youtube.com/watch?v=LqZ664Y7pwI); Godmode_CT (https://www.youtube.com/watch?v=LXaP0EIYaXo); TheButterAnvil (https://www.youtube.com/watch?v=Q_Kka4VhWG0); Joshhhuaaa-VS Versus setup (https://www.youtube.com/watch?v=FE5F6EUQC-0).

### 9.12 Developer, E3 and making-of footage

- https://www.youtube.com/watch?v=IIfns1gvSRY | E3 2004 CO-OP Mode Showcase | SickadtSteve | 4:25 | original E3 co-op footage.
- https://www.youtube.com/watch?v=11-wUk-tLaY | E3 Gameplay [Rare Footage] | Alex37 | 7:57 | creator timestamps: single-player 0:00, co-op 2:14, early Bathhouse 5:12; the build's HUD, animations, weapon models and map layouts differ from release.
- https://www.youtube.com/watch?v=nN1YVwO-3hQ | E3 2004 Videos Compilation | Alex37 | 1:32:23 | co-op at 0:31 (Hokkaido and co-op gameplay), 2:53 (co-op footage), 11:05 (co-op clips), 57:00 ("Co-op Showcase"); also a Clint Hocking single-player showcase (34:52), AI and Sound dev diaries, European magazine E3 coverage; timestamps may be off.
- https://www.youtube.com/watch?v=J9pl7tlJjh4 | E3 2004 Single Player Showcase | SickadtSteve | 22:18 | context.
- https://www.youtube.com/watch?v=d2vBjrRKs3g | Pre-Order Bonus DVD Content | Lucian The World Gamer | 1:34:00 | PS2 pre-order DVD; creator chapters: Developers' Diaries 0:38, NSA Training Program 20:30, Trailers 28:08, Mega64 videos 44:41, soundtrack sampler 54:29, archive trailers 1:13:20.
- Developer diaries (ripped from the PS2 limited-edition disc): Level Design https://www.youtube.com/watch?v=yxzr8K95RQ0 (4:27); Animation https://www.youtube.com/watch?v=xocq_CIzuag (4:57); Sound Design https://www.youtube.com/watch?v=vp3tET9xVKk ; AI (Frédéric Blais) https://www.youtube.com/watch?v=i8Yf_REi0ko (3:36); Sound (Fabien Noel) https://www.youtube.com/watch?v=g0Jl6uVAcGE (4:24); Developer Diary Part 1 of 4 https://www.youtube.com/watch?v=f9-VSg95FKQ ; PS2 disc dev diary https://www.youtube.com/watch?v=RrVVsUqSVqc ; Developer Diary part 2/4 https://www.youtube.com/watch?v=lvbsHIEIcXs ; Behind the Scenes Level Design https://www.youtube.com/watch?v=pbanZLYyP-M ; AI https://www.youtube.com/watch?v=0aONHNALjUI ; Animation https://www.youtube.com/watch?v=KcfYZvzO_1I ; "The making of" https://www.youtube.com/watch?v=Vm0mAE8SFWo ; Behind The Scenes: Sound Design featurette https://www.youtube.com/watch?v=punciITHal8 . (Content of the bonus-disc versions: section 3.6.)
- https://www.youtube.com/watch?v=CF51EMy6SDY | PlayZone 10/2004 (German magazine) | 7:21 |
- Official-era trailers: https://www.youtube.com/watch?v=-1yetVmKfHo (IGN Xbox trailer, 1:33); https://www.youtube.com/watch?v=Siv5InnoJUE (IGN GameCube, 1:08); co-op trailers in 9.10.
- Not Chaos Theory, despite matching searches: IGN "Splinter Cell Co-Op Story, Part 1" (https://www.youtube.com/watch?v=edd-oZsTwng) is Conviction (2010).
- Audio-related YouTube titles (multiplayer menu, Kyd tracks, rips): see 07-audio-and-atmosphere.md.

### 9.13 Comedic and community videos

**G4 X-Play "Splinter Cell Co-Op Theater" (Bob and Steve):**
- A 2005 machinima by X-Play, 11 episodes in total. [CONFIRMED - several sources: Gaytheist description says 2005 X-Play and 11 episodes; Unimportant Entertainment's title says 11 episodes; an episode titled "11" exists] That it is built on CT co-op footage is only implied: ParagonMitchell mentions Bob and Steve while introducing CT co-op. [ONE SOURCE / INFERRED / UNCERTAIN] Players nickname Agent One and Two "Bob and Steve" after it (Reddit 1fiyo7i). Cached Fandom text has no Co-Op Theater mentions; air dates and the link to CT were not cross-checked off YouTube (search budget). [UNKNOWN - see 06-open-questions.md]
- https://www.youtube.com/watch?v=Et72vAIhyO8 | Bob and Steve Splinter Cell Coop Theater | G4 Archive | 43:11 | 2026 premiere; probably the fullest version.
- https://www.youtube.com/watch?v=5W-LCbdH7pE | Co-Op Theater HD | Gaytheist | 26:43 | all 11 episodes, AI-upscaled from 240p sources (uploader's own caveat).
- https://www.youtube.com/watch?v=9pyg4G7dBVk | Co-Op Theater (Bob & Steve 11 Episodes) | Unimportant Entertainment | 39:09 |
- Single episodes: alfaita 1/6-4/6 (2007; 545k, 398k, 336k, 133k views): https://www.youtube.com/watch?v=wp9O6FvyD0U , https://www.youtube.com/watch?v=4pGGPd3CgOU , https://www.youtube.com/watch?v=nNVVTFs8f8E , https://www.youtube.com/watch?v=yRG2lfbIOks ; creator006 5/6, 6/6: https://www.youtube.com/watch?v=MgdPaPdOM7c , https://www.youtube.com/watch?v=P8qDz2-SQns ; alex141516, episode 11 (Bob and Steve argue over who gets the "good missions"): https://www.youtube.com/watch?v=0AjQNb6-ti0 ; ACBlackJ0ck, X-Play "Co-Op Theater V" (description: Bob and Steve on a mission to save New York): https://www.youtube.com/watch?v=mUT6_oFpmV0

**Other comedy and community:**
- https://www.youtube.com/watch?v=BdwhJtGy7a8 | Co op Campaign Bloopers - Split Screen | BK201Tach | 8:11 | the description explains a control quirk around Chu: a non-lethal button press sometimes became a lethal kill, which failed the mission. [ONE SOURCE]
- https://www.youtube.com/watch?v=5wGuwswy7gg | Funny Co-op Moments | AHUK! | 3:50
- https://www.youtube.com/watch?v=m0o5Evv169k | How to Properly Play Chaos Theory Co-op | SteveFinnigan | 9:19 | parody.
- https://www.youtube.com/watch?v=-YgPhqHubuE (The Donkeypits, tutorial fails, 5:38); https://www.youtube.com/watch?v=2BN_mGBhHiE (LocalHostGamers, failed tutorial, 2:55); https://www.youtube.com/watch?v=OP626wI8zqQ (Shepy, FR, training + fails); https://www.youtube.com/watch?v=PiI66IzHF0Y (BryanGaming, FR).
- https://www.youtube.com/watch?v=CUIoqZqR1AA | Home Made Co-Op Trailer | Mutchado | 3:33 | 2008 fan trailer.
- https://www.youtube.com/watch?v=OhWvIzuo7KM | PC Co-op Gameplay [HD] | XxShephardxX | 7:39 | 143k views; two players learning co-op.
- https://www.youtube.com/watch?v=N7PCIXt4UKs (Philly Cinema); https://www.youtube.com/watch?v=edi3vnpq2yw (Rat Shepherd); CouchiesTV, GaLm and DoubleTroubeify playlists (9.8).

**Setup and how-to videos (for anyone reproducing captures):**
- https://www.youtube.com/watch?v=LY69X7EgsmM (Nenz, ZeroTier on PC, 31k views)
- https://www.youtube.com/watch?v=3nLKhKGucII (Birden, Nucleus Co-op split-screen on PC)
- https://www.youtube.com/watch?v=r9E-6ymEygU (EgOless, Radmin VPN)
- https://www.youtube.com/watch?v=OiW-Tx3l_HY (Gubbsplinta)
- https://www.youtube.com/watch?v=FE5F6EUQC-0 (Joshhhuaaa-VS Versus setup)

### 9.14 N-Gage/DS handheld co-op videos

- https://www.youtube.com/watch?v=jnQ74p1Klf8 | Tom Clancy's Splinter Cell: Chaos Theory Nintendo DS 2 player Co-op and Versus | arronmunroe | 1:05:48 | DS | chapters: Rooftops 0:19, Breakdown 3:46, Corruption 7:49, Prison Rescue 17:48, Escape 26:55, then versus maps Offices, Garage, Museum, Mansion, Warehouse, Laboratory.
- https://www.youtube.com/watch?v=-Y6zjZ7oVNM | Splinter Cell 3: Chaos Theory Coop [DS-MelonDS] Missions 1-2-3 - Rooftops. Breakdown. Corruption | SHOCK-25 | 57:01 | DS (two MelonDS instances over emulated Wi-Fi), 5 May 2022 | 100% stealth, starts about 2:35; description lists per-part timestamps, panel/computer counts and KO counts.
- https://www.youtube.com/watch?v=oozYweL4ASM | N Gage SplinterCell Chaos Theory preliminary multiplayer | Andrew A | 4:46 | N-Gage | press footage of the co-op beta from an archive.org dump, no sound; its first frame shows Lambert's team intro.
- Other handheld videos found (not used for co-op facts): ngage.arhn.eu N-Gage longplay 8:53:15 https://www.youtube.com/watch?v=60_igXGTMw0 (description = official N-Gage blurb: co-op for two over Bluetooth, versus up to 4); DarkInput N-Gage full walkthrough https://www.youtube.com/watch?v=pcTmAqXuFbE and DS full walkthrough https://www.youtube.com/watch?v=G3QsJrkpMGw (single-player; the 2026 description claims DS levels are smaller and more linear than N-Gage's, solo only); Lvaneede N-Gage gameplay https://www.youtube.com/watch?v=rNpTE0xvf1A ; N Gaming AYT 2 EKA2L1 https://www.youtube.com/watch?v=YWF-zEiZTaM

### 9.15 Recommended viewing order (top 10 for a level designer)

1. **hexen2k7 Training, 100% Elite** (https://www.youtube.com/watch?v=WQ__XNyWP0M, 3:14). Shortest clean pass through every co-op move drill; the description lists each drill.
2. **V339 Panama, 100% / Expert / Elite / Ghost** (https://www.youtube.com/watch?v=KlU0002suD4, 22:46). A planned two-player ghost route; shows how the first real map is meant to be read when nobody is spotted.
3. **Suru Train Station 100%** (https://www.youtube.com/watch?v=-JnlamHBZrc, 13:38). Creator-timestamped objective beats (schematics, three bombs, phone bug, Chu, extraction). The best single-file beat map.
4. **Jake Ziggity PS2 Seoul** (https://www.youtube.com/watch?v=__LRg8KrYQ8, 18:50) then **PS2 Chemical Bunker** (https://www.youtube.com/watch?v=qLQEHSaRECM). Shows how the PS2 build splits missions into small sub-levels, with chapter markers at each boundary. Pair it with the Xbox/PC version of the same mission.
5. **hexen2k7 Chemical Bunker 1/2 + 2/2** (https://www.youtube.com/watch?v=chb66dBOt74 , https://www.youtube.com/watch?v=ILxhYQ1BHc0). The longest Xbox/PC mission in a no-detection run (as the video note puts it; among the base-game missions; the downloadable Nuclear Plant and UN HQ ghost runs are longer, 22:44 and 21:32); the objective list maps to rooms (silo, lab, cryo, missile).
6. **DeepVelocityOps complete co-op campaign** (https://www.youtube.com/watch?v=4GtVpbf1xAw, 7:22:04). One file with chapter jumps to every mission. Normal pacing shows where real players stall. Use as a jump-in reference.
7. **Lawerenceofalevi "The Co-Op Experience"** (https://www.youtube.com/watch?v=KCOcnYpCD0s, 32:42). Expert Xbox players' critique in Good/Bad/Ugly chapters; direct design feedback.
8. **SickadtSteve E3 2004 co-op showcase** (https://www.youtube.com/watch?v=IIfns1gvSRY) plus **Alex37 E3 gameplay** from 2:14 (https://www.youtube.com/watch?v=11-wUk-tLaY). How Ubisoft pitched co-op, and early layouts that differ from release.
9. **PS2 bonus-DVD Level Design developer diary** (https://www.youtube.com/watch?v=yxzr8K95RQ0, 4:27; full DVD at https://www.youtube.com/watch?v=d2vBjrRKs3g). First-party design intent (co-op coverage unknown; the bonus-disc transcript shows Hocking on patrol telegraphing and gas-range tuning, section 3.6).
10. **ParagonMitchell "The most cursed co-op game"** (https://www.youtube.com/watch?v=SwxTLoWn5e4, 21:54) and/or the **Retro Spectives co-op podcast** (https://www.youtube.com/watch?v=3G7D5CjM6RU). Modern critiques; the podcast explicitly asks whether partner moves were real tactics or just glorified door keys.
- Next, for the two late missions: hexen2k7 Nuclear Plant (OBU3MtaoKb4 and parts) and UN HQ (5RBmv-nRtTs and parts), or PleasePlayMore's single-file 1080p versions (phfqPfdFZdQ, 3CH1BrvzlPA). Original Xbox UN HQ: CR4ZY BALLISTICS (yQH90XJtxTY).
- For GameCube: the ysuck63 GC playlist.
- For the handheld campaign: arronmunroe DS (jnQ74p1Klf8).
- Best picks per mission (source register 2f): Training hexen2k7 / V339 / Centerstrain01; Team Training Ziggity / WalkthroughCinema; Panama V339 / Centerstrain01 / Xbox Kai Fam / PS2 Ziggity; Seoul V339 / Defy248 / PS2 Ziggity; Chemical Bunker hexen2k7 / Agt_ Pendergast / PS2 Ziggity; Train Station Suru / hexen2k7 / PS2 Ziggity; Nuclear Plant hexen2k7 / PleasePlayMore / Spyker2041 blind; UN HQ hexen2k7 / CR4ZY BALLISTICS / PleasePlayMore; N-Gage/DS arronmunroe / SHOCK-25; full campaign DeepVelocityOps / SHOCK-25 PS2 full; critique/dev Lawerenceofalevi / E3 2004 showcase / Retro Spectives.

### 9.16 Transcript test, method and gaps

**Transcript test (all failed):**
- `https://www.youtube.com/api/timedtext?v=SwxTLoWn5e4&lang=en&kind=asr` returned HTTP 200 with an empty body.
- The innertube `get_transcript` endpoint returned 400 FAILED_PRECONDITION.
- The innertube `player` endpoint returned LOGIN_REQUIRED for the WEB client and no caption tracks for the ANDROID, IOS and embedded clients.
- Third-party transcript sites: youtubetotranscript.com 403 via both curl and WebFetch; downsub.com 403; kome.ai 429; youtube-transcript.io 308 redirect, not followed.
- Result: no transcript or commentary notes could be extracted, and nothing in the catalogue is based on spoken commentary. (The `next` endpoint did report English auto-captions exist for several videos, for example SwxTLoWn5e4, hs3sfnhWRSc, cfR80DTXYjU, but they could not be downloaded.)

**Method:**
- YouTube search via a local `yt.sh` script, about 55 queries. Wordings covered: per mission (training, panama expert, seoul, chemical bunker, train station, nuclear plant, UN headquarters, yongbyon), per platform (PS2, gamecube, xbox, split screen, xlink kai), full campaign / longplay / speedrun / no alarm, moves / hangover move, review / retrospective / developer diary / E3 2004 / Spies vs Mercs documentary / trailer / IGN / GameSpot / X-Play Bob and Steve / Co-Op Theater, and languages RU (кооператив прохождение, ядерная станция, штаб ООН), FR, DE (koop deutsch), ES (cooperativo). The exact query "splinter cell chaos theory coop" returned NOPARSE once and worked on retry.
- YouTube playlist-filtered search for 6 queries, plus playlist page reads for the 12 playlists listed in 9.8.
- Watch-page metadata (description, date, views, chapters) for about 235 videos via `https://www.youtube.com/youtubei/v1/next` (WEB client). Direct watch-page HTML scraping worked at first, then began redirecting to google.com/sorry (rate limit, HTTP 302), probably because several agents were querying YouTube at once. WebFetch on https://www.youtube.com/watch?v=0hK1AeB07wk returned only navigation and footer.
- Gap pass: comments read via `POST https://www.youtube.com/youtubei/v1/next` (comment continuation tokens work) for 84 videos; about 40 Nuclear Plant / UN HQ / co-op videos scanned for route text.
- Key pages whose descriptions supplied facts: hexen2k7 WQ__XNyWP0M, TvecAMtS_vk, 1-KpQGqaYd8, chb66dBOt74, 2X5MvQPOQ14, OBU3MtaoKb4, 5RBmv-nRtTs; V339 2VRGQUT2JvQ, KlU0002suD4, A9qRzUt9RtE; Jake Ziggity obcKEeRniRw, __LRg8KrYQ8, qLQEHSaRECM, ge7dEnjp6MU, 2FmkMk4rHQw; SHOCK-25 MmH3o7WF4wg, KWwInB9WjNY, NTaZh6gW8R0, gxnoQJNrPV8, ksP5rk2eJKQ; R3xXcoN GAMING 1risWusbZWc, yQPMp8u8Cqc, akWLnghZb8c, H6g5WoCDuPc, Ya-6NCCKmTg, tg8sn2ZC2CY, i1Ctp-CKpUk, FmSiWt_hVG4, SXHCqjqi_Tc, v4gb6uKa5SQ, kM-HTagymSM; others Suru -JnlamHBZrc; Splinter S1KySIBDvKQ; BK201Tach BdwhJtGy7a8; dat_carlin H-AXCQQ8sCs; PleasePlayMore phfqPfdFZdQ, 3CH1BrvzlPA; NickyTheGamer cwBOPjYbi5k, T2XssBZ_jgI; ysuck63 gm9uYnMw9KA, PRhaF2S6EJw, CtGfBsU1DwI; Alex37 11-wUk-tLaY, nN1YVwO-3hQ; Lucian d2vBjrRKs3g; Gaytheist 5W-LCbdH7pE; DeepVelocityOps 4GtVpbf1xAw; 3dCossack LLww3vy8_1Y; CouchiesTV AYR7YqF5aMI; Lawerenceofalevi KCOcnYpCD0s; ParagonMitchell SwxTLoWn5e4; Retro Spectives 3G7D5CjM6RU; soluceinfo puvCXAdiRxk; Lulz vjiFZuwld-U; CR4ZY BALLISTICS yQH90XJtxTY, 2X_1z7gNOyw; Xbox Kai Fam D1zUg9YGRj0, EasI1Hs9TWM.

**Gaps:**
- No dedicated "all co-op moves" showcase video exists among the results; move coverage relies on Training runs and E3 footage.
- No commentary or transcript content could be read, so route and strategy notes from commentary are missing.
- Original-Xbox captures are thin: Xbox Kai Fam (Panama, Seoul), CR4ZY BALLISTICS (UN HQ), Lawerenceofalevi (all, via Xbox One BC), Because I Can (Panama), Melisca 24 (Training), No commentary dog (360 BC). No original-Xbox Nuclear Plant capture was confirmed.
- GameCube coverage is mostly 2008-era low-resolution uploads (ysuck63, NickyTheGamer, synzh). No GC Nuclear Plant or UN HQ was found, consistent with those missions being Xbox/PC only.
- The GameCube "Panama Bank" naming and CouchiesTV's "BANK" chapter are unexplained.
- Many Xbox/PC uploads don't state their platform; "likely" calls are inferences.
- Several promising pages were not read: Zolt Assassin's Chemical Bunker 100% (nCJ8xbWt-nM), the Pretend3r and Urban Reflex parts without descriptions, and the DoubleTroubeify episode descriptions.
- WebSearch hit the shared session budget, so the X-Play Co-Op Theater background was not cross-checked off YouTube.
- [UNKNOWN - see 06-open-questions.md] for all of the above; route gaps R-19 (Nuclear Plant), R-20 (UN HQ), R-05 (PS2/GC Team Training), R-23 (N-Gage/DS) still need a human to watch the listed videos.

---

## 10. Not included in this file: design kit and background literature

The research pack also holds a new-game design kit and background reading. They are not part of this CT findings file; they are in raw/ with these filenames:
- Design kit: `13_principles.md`, `14_translation_guide.md`, `DESIGN_BIBLE.md`, `MISSION_TEMPLATE.md`, `LEVEL_DESIGN_PROCESS.md`, `LEVEL_REVIEW_CHECKLIST.md`, `PROMPT_LIBRARY.md`, `example_mission_outline.md`.
- Background literature and real-world notes: `research_notes/stealth_coop_design_literature.md` (stealth and co-op design literature; the S-numbers in sections 5.3 and 8.6), `research_notes/real_world_security_and_architecture.md` (real-world security and architecture; the R-numbers in section 5.4).


## Sources used for this file

**Files in /home/user/docs drawn from** (read in full unless noted):
- /home/user/docs/research_notes/reception.md
- /home/user/docs/research_notes/dev_and_design_intent.md
- /home/user/docs/research_notes/videos.md
- /home/user/docs/11_wow_moments.md
- /home/user/docs/12_anti_patterns.md
- /home/user/docs/08_level_design_patterns.md
- /home/user/docs/07_objectives_taxonomy.md
- /home/user/docs/09_pacing_and_flow.md
- /home/user/docs/research_notes/gap_closing_community.md (in full; community, R-sections and source lists)
- /home/user/docs/research_notes/gap_closing_gamefiles.md (R-12 credits section, primary-source list, R-01, R-04 and designer-comment lines, source URLs)
- /home/user/docs/03_coop_overview.md (sections 2, 9-12 and keyword lines)
- /home/user/docs/15_music_and_atmosphere.md (sections 3.2, 3.6, 4 and keyword lines)
- /home/user/docs/research_notes/music_and_atmosphere.md (bonus-disc diary, documentary, PC Gamer, FRVR, credits lines)
- /home/user/docs/research_notes/platforms_versions.md (DLC, shutdown, pre-release and source lines)
- /home/user/docs/research_notes/mission_ngage_ds.md (reception section, videos, review sources)
- /home/user/docs/research_notes/systems_rules.md, coop_moves.md, coop_gadgets_controls_comms.md, mission_training.md, mission_panama.md (keyword lines)
- /home/user/docs/research_notes/mission_training.md, mission_panama.md, mission_seoul.md, mission_chemical_bunker.md, mission_train_station.md, mission_nuclear_plant.md, mission_un_hq.md (section 11 video lists)
- /home/user/docs/04_mission_breakdowns/training.md, panama.md, seoul.md, chemical_bunker.md, train_station.md, nuclear_plant.md, un_headquarters.md, ngage_ds_campaign.md (pacing, wow, frustration, key-video, release and gap-closing sections)
- /home/user/docs/01_sources.md (sections 2c-2h; Appendix A video lines)
- /home/user/docs/02_coverage_matrix.md, /home/user/docs/README.md, /home/user/docs/00_PROGRESS.md, /home/user/docs/OPEN_QUESTIONS.md (keyword lines; R-number status)
- /home/user/docs/10_ai_detection_and_alarms.md (keyword lines)
- Not drawn from (listed in section 10 only): the design kit and the two background notes.

**Local caches named by the sources (not opened for this file):** /home/user/raw/wp_ct.txt (Wikipedia CT), /home/user/raw/wiki/ (Fandom), /home/user/raw/ia/prima_eguide.txt, /home/user/raw/ia/ps2_manual.txt, /home/user/raw/ia/xbox_manual.pdf, /home/user/raw/yt.sh.

**External URLs cited in this file** (YouTube video pages, then all other URLs):

- http://elder-geek.com/2009/09/splinter-cell-chaos-theory-co-op-review/
- http://www.nintendoworldreport.com/review/4357/tom-clancys-splinter-cell-chaos-theory-gamecube
- https://archive.org/details/Tom_Clancys_Splinter_Cell_Chaos_Theory_Prima_Official_eGuide
- https://archive.org/details/og-xbox-dlcupdates
- https://archive.org/details/q-1-t-00_202406
- https://archive.org/details/sc-3-xb-build-477-retail
- https://archive.org/details/scct_20250728
- https://archive.org/details/tom-clancys-splinter-cell-chaos-theory_202601
- https://archive.org/download/Nokia_N-Gage_Tom_Clancys_Splinter_Cell_Chaos_Theory_Media_Preview_Kit/Nokia_N-Gage_Tom_Clancys_Splinter_Cell_Chaos_Theory_Media_Preview_Kit_Image.iso/
- https://arctic-shift.photon-reddit.com/api/posts/search
- https://clicknothing.com/2015/03/22/ten-years-down/
- https://en.wikipedia.org/wiki/Tom_Clancy%27s_Splinter_Cell:_Blacklist
- https://en.wikipedia.org/wiki/Tom_Clancy%27s_Splinter_Cell:_Conviction
- https://en.wikipedia.org/wiki/Tom_Clancy%27s_Splinter_Cell:_Double_Agent
- https://en.wikipedia.org/wiki/Ubisoft_Annecy
- https://en.wikipedia.org/wiki/Ubisoft_Milan
- https://forums.anandtech.com/threads/chaos-theory-co-op-mp-question-regarding-2-person-activated-objects.142480/
- https://frvr.com/blog/news/splinter-cell-designer-says-one-of-the-difficulties-with-modern-stealth-games-is-realistic-lighting/
- https://gamerant.com/best-tom-clancy-co-op-games/
- https://gamesfirst.com/articles/2005/ubisoft-focus-tom-clancys-splinter-cell-chaos-theory/
- https://gamespy-archives.quaddicted.com/sites/www.planetrainbowsix.com/features/articles/7-13-05b.html
- https://gamingnexus.com/FullNews/More-Chaos-on-the-way/Item410.aspx
- https://gamingpastime.com/splinter-cell-chaos-theory-pc-review/
- https://multiplayer.it/recensioni/splinter-cell-chaos-theory.html
- https://news.xbox.com/en-us/2005/08/25/splinter-cell-content/
- https://news.xbox.com/en-us/2019/06/10/e3-2019-whats-next-xbox-backward-compatibility/
- https://nintendoworldreport.com/news/10528
- https://nintendoworldreport.com/news/10601
- https://nintendoworldreport.com/pr/10419/splinter-cell-chaos-theory-ships
- https://nintendoworldreport.com/review/4376/tom-clancys-splinter-cell-chaos-theory-ds-nintendo-ds
- https://screenrant.com/splinter-cell-coop-campaigns-conviction-sam-fisher-remake/
- https://shacknews.com/article/34011/splinter-cell-chaos-theory-qa
- https://steamcommunity.com/app/13570/discussions/0/1326718197214822685/
- https://steamcommunity.com/app/13570/discussions/0/133261907137105760/
- https://steamcommunity.com/app/13570/discussions/0/133262738417485094/
- https://steamcommunity.com/app/13570/discussions/0/1651043958651257044/
- https://steamcommunity.com/app/13570/discussions/0/3078747189787867364/
- https://steamcommunity.com/app/13570/discussions/0/3110268136059532240/
- https://steamcommunity.com/app/13570/discussions/0/3110268136061964112/
- https://steamcommunity.com/app/13570/discussions/0/3191368894187027140/
- https://steamcommunity.com/app/13570/discussions/0/45350245387206844/
- https://steamcommunity.com/app/13570/discussions/0/483366528901839569/
- https://steamcommunity.com/app/13570/discussions/0/540734423617155525/
- https://steamcommunity.com/app/13570/discussions/0/540734423695895475/
- https://steamcommunity.com/app/13570/discussions/0/617321352205280978/
- https://steamcommunity.com/app/13570/discussions/0/828925849173270181/
- https://steamcommunity.com/app/13570/discussions/search/?q=co-op
- https://steamcommunity.com/app/235600/discussions/0/405693392921585598/
- https://steamcommunity.com/app/235600/discussions/0/483367798513074205/
- https://store.steampowered.com/app/13570/
- https://store.steampowered.com/appreviews/13570
- https://worthplaying.com/article/2005/3/28/reviews/23463-xboxpc-review-splinter-cell-chaos-theory/
- https://worthplaying.com/article/2005/4/17/reviews/23920-ps2-review-splinter-cell-chaos-theory/
- https://worthplaying.com/article/2005/7/13/news/25830-splinter-cell-chaos-theory-xboxpc-steel-squat-map-available-now/
- https://www.classicco-op.com/coop-spotlight/2017/6/21/co-op-spotlight-splinter-cell-chaos-theory
- https://www.co-optimus.com/game/1001/xbox/splinter-cell-chaos-theory.html
- https://www.dailycardinal.com/article/2005/04/splinter-sequel-rife-with-chaos
- https://www.dailymotion.com/video/xlxq4t
- https://www.dailymotion.com/video/xmaxsg
- https://www.designer-notes.com/designer-notes-44-clint-hocking-part-2/
- https://www.empireonline.com/gaming/reviews/tom-clancy-splinter-cell-chaos-theory-2-review
- https://www.eurogamer.net/articles/r_splintercell3_pc
- https://www.gamegrin.com/articles/splinter-cell-chaos-theory-diaries-part-seven/
- https://www.gamepressure.com/download.asp?ID=9626
- https://www.gamerevolution.com/?p=32392
- https://www.gamerevolution.com/review/32392-splinter-cell058-chaos-theory-review-2
- https://www.gamerevolution.com/review/36141-splinter-cell-chaos-theory-review
- https://www.gameshedge.com/backwards-compatibility-concluded-xbox-one/
- https://www.gamesindustry.biz/tom-clancyrsquos-splinter-cell-chaos-theory-tm-for-the-n-gage-platform-shipping-now
- https://www.gamespot.com/articles/new-content-available-for-chaos-theory/1100-6131850/
- https://www.gamespot.com/articles/tom-clancys-splinter-cell-chaos-theory-first-look/1100-6116458/
- https://www.gamespot.com/reviews/tom-clancys-splinter-cell-chaos-theory-review/1900-6121161/
- https://www.gamesradar.com/splinter-cell-chaos-theory-2/
- https://www.gameswelt.de/tom-clancys-splinter-cell-chaos-theory/test/tom-clancys-splinter-cell-chaos-theory-ds-606
- https://www.gamingtarget.com/article.php?artid=4509
- https://www.greenmangaming.com/blog/the-best-tom-clancys-splinter-cell-games-ranked/
- https://www.gry-online.pl/newsroom/tom-clancys-splinter-cell-chaos-theory-informacje-o-trybie-multiplayer/z14b74
- https://www.gry-online.pl/newsroom/zagrajcie-na-n-gage-w-demo-tom-clancys-splinter-cell-chaos-theory/z649d5
- https://www.guinnessworldrecords.com/world-records/549102-first-video-game-to-feature-a-fully-stealth-based-co-op-mode
- https://www.ign.com/articles/2005/03/24/splinter-cell-chaos-theory
- https://www.metacritic.com/game/tom-clancys-splinter-cell-chaos-theory/critic-reviews/?platform=xbox
- https://www.pcgamer.com/the-making-of-splinter-cell-chaos-theory/
- https://www.penny-arcade.com/comic/2005/07/27
- https://www.pocket-lint.com/review/68164-splinter-cell-chaos-theory-xbox
- https://www.pocketgamer.com/tom-clancys-splinter-cell-chaos-theory/review/
- https://www.pressreader.com/uk/retro-gamer/20220120/284743454920408
- https://www.reddit.com/r/Splintercell/comments/11u5vk4/
- https://www.reddit.com/r/Splintercell/comments/15s93fb/
- https://www.reddit.com/r/Splintercell/comments/18zgpgu/
- https://www.reddit.com/r/Splintercell/comments/1df5iet/
- https://www.reddit.com/r/Splintercell/comments/1djaago/
- https://www.reddit.com/r/Splintercell/comments/1e9pwjx/
- https://www.reddit.com/r/Splintercell/comments/1ecekbl/
- https://www.reddit.com/r/Splintercell/comments/1fiyo7i/
- https://www.reddit.com/r/Splintercell/comments/1g21m8q/
- https://www.reddit.com/r/Splintercell/comments/1htj7ha/
- https://www.reddit.com/r/Splintercell/comments/1isi4hk/
- https://www.reddit.com/r/Splintercell/comments/1ive4t5/
- https://www.reddit.com/r/Splintercell/comments/1k1o3v9/
- https://www.reddit.com/r/Splintercell/comments/1lw7uy0/
- https://www.reddit.com/r/Splintercell/comments/1m3rm7z/
- https://www.reddit.com/r/Splintercell/comments/1m8z5gm/
- https://www.reddit.com/r/Splintercell/comments/1megyet/
- https://www.reddit.com/r/Splintercell/comments/1ouonhz/
- https://www.reddit.com/r/Splintercell/comments/1q28oog/
- https://www.reddit.com/r/Splintercell/comments/1q5uvqx/
- https://www.reddit.com/r/Splintercell/comments/1qfdvur/
- https://www.reddit.com/r/Splintercell/comments/1rz5d99/
- https://www.reddit.com/r/Splintercell/comments/1s6ylts/
- https://www.reddit.com/r/Splintercell/comments/1utzrr6/
- https://www.reddit.com/r/Splintercell/comments/99qjfn/
- https://www.reddit.com/r/Splintercell/comments/dgzg9g/
- https://www.reddit.com/r/Splintercell/comments/ijtifz/
- https://www.reddit.com/r/Splintercell/comments/kw1j41/
- https://www.reddit.com/r/Splintercell/comments/v5jncz/
- https://www.reddit.com/r/gaming/comments/d3xxja/
- https://www.reddit.com/r/gaming/comments/vpwdry/
- https://www.reddit.com/r/patientgamers/comments/4mfcaa/
- https://www.reddit.com/r/patientgamers/comments/6lzq8e/
- https://www.reddit.com/r/patientgamers/comments/8vk0aw/
- https://www.reddit.com/r/patientgamers/comments/mngqa0/
- https://www.rockpapershotgun.com/2016/05/10/splinter-cell-chaos-theory-lets-play-clint-hocking/
- https://www.rspodcast.net/episodes/bonus-1-chaos-theory-co-op
- https://www.shacknews.com/article/130019/ubisoft-shuts-down-online-service-on-over-90-games-dating-back-to-ps2
- https://www.shacknews.com/article/37010/new-splinter-cell-chaos-theory
- https://www.speedrun.com/api/v1/games/j1n44e6p/categories
- https://www.speedrun.com/api/v1/games/j1n44e6p/levels
- https://www.speedrun.com/api/v1/runs?category=zd3xm8dn
- https://www.techcentral.ie/tom-clancys-splinter-cell-chaos-theory/
- https://www.thegamer.com/best-coop-stealth-games/
- https://www.theglobeandmail.com/technology/splinter-cell-chaos-theory/article1115954/
- https://www.theglobeandmail.com/technology/splinter-cell-chaos-theory/article1117156/
- https://www.videogamer.com/?p=167250
- https://www.videogamer.com/news/new-map-sneaks-up-on-chaos-theory/
- https://www.videogameschronicle.com/news/ubisoft-has-officially-shut-down-online-services-for-over-90-games/
- https://www.xbox-scene.info/files/file/187-splinter-cell-chaos-theory/

- https://shacknews.com/article/33566/ (Ferland Q&A pointer; full path truncated in the source note)
- https://www.shacknews.com/article/33053/ (Ferland Q&A pointer; full path truncated in the source note)
- https://www.pocketgamer.com/x-men-legends-splinter-cell/x-men-and-splinter-cell-infiltrate-the-n-gage/ (N-Gage launch news)

YouTube:
- https://www.youtube.com/api/timedtext?v=SwxTLoWn5e4&lang=en&kind=asr
- https://www.youtube.com/playlist?list=PL26727E6F5CCD6690
- https://www.youtube.com/playlist?list=PL3FLe35dimGTQfLLgtdxrdNACeDc0fMO0
- https://www.youtube.com/playlist?list=PL5D9DAA99163BEC2A
- https://www.youtube.com/playlist?list=PL8CD4BB2EF76017B9
- https://www.youtube.com/playlist?list=PL99EF637EDF39FE74
- https://www.youtube.com/playlist?list=PL9kYDIS3DwQiZYkt4hYaAOmqWvOCWC1pf
- https://www.youtube.com/playlist?list=PLAMlJxzkqk8hbfSlOVvdnHjS4hpezJdCQ
- https://www.youtube.com/playlist?list=PLDABDF07C09F86F5A
- https://www.youtube.com/playlist?list=PLQ6L-Ee5ECFXpnBVTm-V6SmQOBkvMjd9A
- https://www.youtube.com/playlist?list=PLgyR0yzZK_7f-4rjO4iJke08CTCPtgLV8
- https://www.youtube.com/playlist?list=PLlSX5tH1nyFhjC01UAVXBo7kYJytZdOJu
- https://www.youtube.com/playlist?list=PLspeOI0YmcdN9YHJYZWXxLagyzkU5liyD
- https://www.youtube.com/watch?v=-1yetVmKfHo
- https://www.youtube.com/watch?v=-4Kq2wMmWwU
- https://www.youtube.com/watch?v=-8Oio-dEv8M
- https://www.youtube.com/watch?v=-JnlamHBZrc
- https://www.youtube.com/watch?v=-R4jUzkk7oI
- https://www.youtube.com/watch?v=-TWOS7Mb1OA
- https://www.youtube.com/watch?v=-Y6zjZ7oVNM
- https://www.youtube.com/watch?v=-YgPhqHubuE
- https://www.youtube.com/watch?v=-mU9NO8dxVw
- https://www.youtube.com/watch?v=-mf3o-FxGAQ
- https://www.youtube.com/watch?v=0AjQNb6-ti0
- https://www.youtube.com/watch?v=0JWME32knV0
- https://www.youtube.com/watch?v=0QznY6rsC3U
- https://www.youtube.com/watch?v=0aONHNALjUI
- https://www.youtube.com/watch?v=0hK1AeB07wk
- https://www.youtube.com/watch?v=0iWVH-KZ6_8
- https://www.youtube.com/watch?v=0n_jqp8QH3U
- https://www.youtube.com/watch?v=0u1jDBvgUt8
- https://www.youtube.com/watch?v=1-KpQGqaYd8
- https://www.youtube.com/watch?v=1-Tyzb41how
- https://www.youtube.com/watch?v=11-wUk-tLaY
- https://www.youtube.com/watch?v=1FYUWwle97Q
- https://www.youtube.com/watch?v=1Gt2zOJKb2U
- https://www.youtube.com/watch?v=1ODKgDBEao4
- https://www.youtube.com/watch?v=1Od5OMtil9w
- https://www.youtube.com/watch?v=1_spcLojzxo
- https://www.youtube.com/watch?v=1eetPo7gdQw
- https://www.youtube.com/watch?v=1risWusbZWc
- https://www.youtube.com/watch?v=2BN_mGBhHiE
- https://www.youtube.com/watch?v=2FmkMk4rHQw
- https://www.youtube.com/watch?v=2VRGQUT2JvQ
- https://www.youtube.com/watch?v=2X5MvQPOQ14
- https://www.youtube.com/watch?v=2X_1z7gNOyw
- https://www.youtube.com/watch?v=3CH1BrvzlPA
- https://www.youtube.com/watch?v=3G7D5CjM6RU
- https://www.youtube.com/watch?v=3iYIZ523cNc
- https://www.youtube.com/watch?v=3janOG4RYT4
- https://www.youtube.com/watch?v=3nLKhKGucII
- https://www.youtube.com/watch?v=49TgQ2npG1Y
- https://www.youtube.com/watch?v=4GtVpbf1xAw
- https://www.youtube.com/watch?v=4JRAPQg6UYw
- https://www.youtube.com/watch?v=4pGGPd3CgOU
- https://www.youtube.com/watch?v=5RBmv-nRtTs
- https://www.youtube.com/watch?v=5W-LCbdH7pE
- https://www.youtube.com/watch?v=5t6c1xj2IqI
- https://www.youtube.com/watch?v=5wGuwswy7gg
- https://www.youtube.com/watch?v=60_igXGTMw0
- https://www.youtube.com/watch?v=631YgJdDgyg
- https://www.youtube.com/watch?v=65Ls9P9GwKE
- https://www.youtube.com/watch?v=6UGAwYEPG6M
- https://www.youtube.com/watch?v=6Uy0tnDb5Ec
- https://www.youtube.com/watch?v=6aVpuTjhde0
- https://www.youtube.com/watch?v=6q3P3ZQFfOk
- https://www.youtube.com/watch?v=748PAmV4MUc
- https://www.youtube.com/watch?v=75QYl5F9nKM
- https://www.youtube.com/watch?v=79Q6LqfXck0
- https://www.youtube.com/watch?v=7KTmpnSJCyA
- https://www.youtube.com/watch?v=7npoMU0SrdU
- https://www.youtube.com/watch?v=8FiRUvq86sg
- https://www.youtube.com/watch?v=8L90xIjo9uk
- https://www.youtube.com/watch?v=8Ldd9814MoE
- https://www.youtube.com/watch?v=8OvS5zQkS6w
- https://www.youtube.com/watch?v=8Ww7rE4UOm8
- https://www.youtube.com/watch?v=9pyg4G7dBVk
- https://www.youtube.com/watch?v=A9qRzUt9RtE
- https://www.youtube.com/watch?v=ALN3KBYqyAw
- https://www.youtube.com/watch?v=ALT_boVDdPc
- https://www.youtube.com/watch?v=AYR7YqF5aMI
- https://www.youtube.com/watch?v=At3X6nNWLP0
- https://www.youtube.com/watch?v=AyneyhuZOak
- https://www.youtube.com/watch?v=B0INvKmshWg
- https://www.youtube.com/watch?v=B5mtzFTTI3s
- https://www.youtube.com/watch?v=B6tnTABDOtc
- https://www.youtube.com/watch?v=B8z_7lUW6XI
- https://www.youtube.com/watch?v=BROMKfkVpYs
- https://www.youtube.com/watch?v=BTZC73LY1Lw
- https://www.youtube.com/watch?v=BTeinCL-KFk
- https://www.youtube.com/watch?v=BXhyhwzT67c
- https://www.youtube.com/watch?v=BdwhJtGy7a8
- https://www.youtube.com/watch?v=Bf7afScPj-c
- https://www.youtube.com/watch?v=C05yF9EI8Uo
- https://www.youtube.com/watch?v=CF51EMy6SDY
- https://www.youtube.com/watch?v=CUIoqZqR1AA
- https://www.youtube.com/watch?v=Cgp8_wNtyQk
- https://www.youtube.com/watch?v=CtGfBsU1DwI
- https://www.youtube.com/watch?v=D1zUg9YGRj0
- https://www.youtube.com/watch?v=DXgR6ze6fDg
- https://www.youtube.com/watch?v=DaxcKvwW7LI
- https://www.youtube.com/watch?v=DbJGFSi1FKo
- https://www.youtube.com/watch?v=Dei0Pv9K-yQ
- https://www.youtube.com/watch?v=EOaLTYHNGD0
- https://www.youtube.com/watch?v=EasI1Hs9TWM
- https://www.youtube.com/watch?v=EspA0lPkbBg
- https://www.youtube.com/watch?v=Et72vAIhyO8
- https://www.youtube.com/watch?v=FE5F6EUQC-0
- https://www.youtube.com/watch?v=FmSiWt_hVG4
- https://www.youtube.com/watch?v=G3QsJrkpMGw
- https://www.youtube.com/watch?v=H-AXCQQ8sCs
- https://www.youtube.com/watch?v=H146Z-CDbbY
- https://www.youtube.com/watch?v=H1dZFtX0jxY
- https://www.youtube.com/watch?v=H6g5WoCDuPc
- https://www.youtube.com/watch?v=IIfns1gvSRY
- https://www.youtube.com/watch?v=IJgx6wDn7b4
- https://www.youtube.com/watch?v=ILxhYQ1BHc0
- https://www.youtube.com/watch?v=IMqljhkvS8E
- https://www.youtube.com/watch?v=Iduxc5xLfnM
- https://www.youtube.com/watch?v=IuwfdmAicjc
- https://www.youtube.com/watch?v=J9pl7tlJjh4
- https://www.youtube.com/watch?v=KCOcnYpCD0s
- https://www.youtube.com/watch?v=KITpNqMXnZY
- https://www.youtube.com/watch?v=KQoTIplV_QA
- https://www.youtube.com/watch?v=KWwInB9WjNY
- https://www.youtube.com/watch?v=KbmMgWNGsAA
- https://www.youtube.com/watch?v=KcfYZvzO_1I
- https://www.youtube.com/watch?v=KiuKSDDxsUo
- https://www.youtube.com/watch?v=Kkqs_P6Q7r8
- https://www.youtube.com/watch?v=KlU0002suD4
- https://www.youtube.com/watch?v=LLww3vy8_1Y
- https://www.youtube.com/watch?v=LXMhZHUOpEk
- https://www.youtube.com/watch?v=LXaP0EIYaXo
- https://www.youtube.com/watch?v=LY69X7EgsmM
- https://www.youtube.com/watch?v=LY9-0Dk-YHk
- https://www.youtube.com/watch?v=Ld6H1XUU_rQ
- https://www.youtube.com/watch?v=LqZ664Y7pwI
- https://www.youtube.com/watch?v=M3kPwc52rmI
- https://www.youtube.com/watch?v=MCU6nG2MuA8
- https://www.youtube.com/watch?v=MS-4g3ZHyXk
- https://www.youtube.com/watch?v=MgdPaPdOM7c
- https://www.youtube.com/watch?v=MmH3o7WF4wg
- https://www.youtube.com/watch?v=N3QdeyXEufQ
- https://www.youtube.com/watch?v=N7PCIXt4UKs
- https://www.youtube.com/watch?v=NKGL6wacpYs
- https://www.youtube.com/watch?v=NQMoQIPgGZ4
- https://www.youtube.com/watch?v=NTaZh6gW8R0
- https://www.youtube.com/watch?v=NeXMx_orkIg
- https://www.youtube.com/watch?v=NrooRPC9cog
- https://www.youtube.com/watch?v=OBU3MtaoKb4
- https://www.youtube.com/watch?v=OP626wI8zqQ
- https://www.youtube.com/watch?v=OWqEWyFiN34
- https://www.youtube.com/watch?v=OXPj2u6IL0Y
- https://www.youtube.com/watch?v=OhWvIzuo7KM
- https://www.youtube.com/watch?v=OiW-Tx3l_HY
- https://www.youtube.com/watch?v=P8qDz2-SQns
- https://www.youtube.com/watch?v=PP_1bFZ7sU4
- https://www.youtube.com/watch?v=PRhaF2S6EJw
- https://www.youtube.com/watch?v=PiI66IzHF0Y
- https://www.youtube.com/watch?v=PoXfW1ZVeBI
- https://www.youtube.com/watch?v=PsHnw-tdpzQ
- https://www.youtube.com/watch?v=Q33b5tX5vPQ
- https://www.youtube.com/watch?v=QUCFE8TJccA
- https://www.youtube.com/watch?v=Q_Kka4VhWG0
- https://www.youtube.com/watch?v=R03ZkOotVPE
- https://www.youtube.com/watch?v=RXNrz5N-qZE
- https://www.youtube.com/watch?v=Rl592Km8OZw
- https://www.youtube.com/watch?v=RrVVsUqSVqc
- https://www.youtube.com/watch?v=S1KySIBDvKQ
- https://www.youtube.com/watch?v=SW2RQrlizM8
- https://www.youtube.com/watch?v=SXHCqjqi_Tc
- https://www.youtube.com/watch?v=SYU5Ve4qKik
- https://www.youtube.com/watch?v=Siv5InnoJUE
- https://www.youtube.com/watch?v=SjycM4h_5r0
- https://www.youtube.com/watch?v=SwxTLoWn5e4
- https://www.youtube.com/watch?v=T0MMaVD_eaM
- https://www.youtube.com/watch?v=T2XssBZ_jgI
- https://www.youtube.com/watch?v=Ti5rTnmVL3E
- https://www.youtube.com/watch?v=TtVTD0rFPQ4
- https://www.youtube.com/watch?v=TvaVH-CWZRM
- https://www.youtube.com/watch?v=TvecAMtS_vk
- https://www.youtube.com/watch?v=U3wdapNPbaY
- https://www.youtube.com/watch?v=ULiNF7HcIV4
- https://www.youtube.com/watch?v=Uhp1SCRIdmo
- https://www.youtube.com/watch?v=UvTRAKxshoU
- https://www.youtube.com/watch?v=VC5OdmsjlFM
- https://www.youtube.com/watch?v=VTja3c9-cHU
- https://www.youtube.com/watch?v=VgD93an8rR4
- https://www.youtube.com/watch?v=Vm0mAE8SFWo
- https://www.youtube.com/watch?v=Vmob0mzcINg
- https://www.youtube.com/watch?v=W7BvAS6uY2I
- https://www.youtube.com/watch?v=WQ__XNyWP0M
- https://www.youtube.com/watch?v=WZi5Jum_mmo
- https://www.youtube.com/watch?v=X6Qzto6XEdk
- https://www.youtube.com/watch?v=X8QWLd8Z18A
- https://www.youtube.com/watch?v=XS6GZuy4iBg
- https://www.youtube.com/watch?v=XexhiIPClAk
- https://www.youtube.com/watch?v=XtLqqPY6kPU
- https://www.youtube.com/watch?v=YPxKsdRLmgQ
- https://www.youtube.com/watch?v=YQ753pwa0B8
- https://www.youtube.com/watch?v=YWF-zEiZTaM
- https://www.youtube.com/watch?v=Ya-6NCCKmTg
- https://www.youtube.com/watch?v=Ydbu8_O3FQQ
- https://www.youtube.com/watch?v=YnlvSci_PCE
- https://www.youtube.com/watch?v=YpVZb_5lGq8
- https://www.youtube.com/watch?v=Z4ok0KiZVuo
- https://www.youtube.com/watch?v=Z6ZsFw6Jg1g
- https://www.youtube.com/watch?v=ZLs3zuAooBs
- https://www.youtube.com/watch?v=ZZS39MjyiS4
- https://www.youtube.com/watch?v=Z_mYQGQKh6s
- https://www.youtube.com/watch?v=ZjLMtG7irg8
- https://www.youtube.com/watch?v=_1ijhaN0cmw
- https://www.youtube.com/watch?v=_Dh7tza0XJk
- https://www.youtube.com/watch?v=_NbBIy8ZCMQ
- https://www.youtube.com/watch?v=_UclJhv8ZUs
- https://www.youtube.com/watch?v=_YLK0cjSekE
- https://www.youtube.com/watch?v=__LRg8KrYQ8
- https://www.youtube.com/watch?v=a7m1K7VaJOI
- https://www.youtube.com/watch?v=akFHEo91RA0
- https://www.youtube.com/watch?v=akWLnghZb8c
- https://www.youtube.com/watch?v=axYqdY1AJ9E
- https://www.youtube.com/watch?v=c7slNfcHmig
- https://www.youtube.com/watch?v=cLMkZMd3nwE
- https://www.youtube.com/watch?v=cdCN8UQOvn8
- https://www.youtube.com/watch?v=cfR80DTXYjU
- https://www.youtube.com/watch?v=chb66dBOt74
- https://www.youtube.com/watch?v=chkCInZRTIc
- https://www.youtube.com/watch?v=cn6EbsrR-b8
- https://www.youtube.com/watch?v=cwBOPjYbi5k
- https://www.youtube.com/watch?v=d2vBjrRKs3g
- https://www.youtube.com/watch?v=d4BM_kYG0Zw
- https://www.youtube.com/watch?v=dWuinQ0k8pg
- https://www.youtube.com/watch?v=edd-oZsTwng
- https://www.youtube.com/watch?v=edi3vnpq2yw
- https://www.youtube.com/watch?v=er8ZbvFLmMA
- https://www.youtube.com/watch?v=ezBiZ-_5E2Y
- https://www.youtube.com/watch?v=f9-VSg95FKQ
- https://www.youtube.com/watch?v=g0Jl6uVAcGE
- https://www.youtube.com/watch?v=g1WZNszNcfE
- https://www.youtube.com/watch?v=g8M8Dly5zts
- https://www.youtube.com/watch?v=gOn-T6LlNHk
- https://www.youtube.com/watch?v=ge7dEnjp6MU
- https://www.youtube.com/watch?v=gm9uYnMw9KA
- https://www.youtube.com/watch?v=gxnoQJNrPV8
- https://www.youtube.com/watch?v=gy1Vt3pxX8U
- https://www.youtube.com/watch?v=hFAPasSujbE
- https://www.youtube.com/watch?v=hHg-nYqfLzA
- https://www.youtube.com/watch?v=hQliVhgIWSg
- https://www.youtube.com/watch?v=hShwINqT0HI
- https://www.youtube.com/watch?v=hs3sfnhWRSc
- https://www.youtube.com/watch?v=i1Ctp-CKpUk
- https://www.youtube.com/watch?v=i8Yf_REi0ko
- https://www.youtube.com/watch?v=iD_AeCbzvJI
- https://www.youtube.com/watch?v=iOqpdDhbkGE
- https://www.youtube.com/watch?v=iTrJGQAZg-o
- https://www.youtube.com/watch?v=iYKmSOodngw
- https://www.youtube.com/watch?v=ioOcGz6P_PQ
- https://www.youtube.com/watch?v=isOwNhn7umM
- https://www.youtube.com/watch?v=jUwiHOGcBO4
- https://www.youtube.com/watch?v=jgsTLGSXyMc
- https://www.youtube.com/watch?v=jnQ74p1Klf8
- https://www.youtube.com/watch?v=jpNE979X_6M
- https://www.youtube.com/watch?v=jry663Tx5bg
- https://www.youtube.com/watch?v=kM-HTagymSM
- https://www.youtube.com/watch?v=kRDWrH-zamE
- https://www.youtube.com/watch?v=kVCaUgzYtQk
- https://www.youtube.com/watch?v=ksP5rk2eJKQ
- https://www.youtube.com/watch?v=lFHlkLTsKQI
- https://www.youtube.com/watch?v=lvbsHIEIcXs
- https://www.youtube.com/watch?v=m0o5Evv169k
- https://www.youtube.com/watch?v=m5lUF8rdW4Q
- https://www.youtube.com/watch?v=mGrN70e_l4Q
- https://www.youtube.com/watch?v=mODHEazeQr8
- https://www.youtube.com/watch?v=mUT6_oFpmV0
- https://www.youtube.com/watch?v=mqyj-66XLMo
- https://www.youtube.com/watch?v=nCJ8xbWt-nM
- https://www.youtube.com/watch?v=nN1YVwO-3hQ
- https://www.youtube.com/watch?v=nNVVTFs8f8E
- https://www.youtube.com/watch?v=nNiX9-Mwk20
- https://www.youtube.com/watch?v=nOZ7tuHzFlE
- https://www.youtube.com/watch?v=oIGRXjMCh2s
- https://www.youtube.com/watch?v=obcKEeRniRw
- https://www.youtube.com/watch?v=ocRhdbfZ798
- https://www.youtube.com/watch?v=oozYweL4ASM
- https://www.youtube.com/watch?v=pMqEoJ1m8Oc
- https://www.youtube.com/watch?v=pRO9IkxdtV8
- https://www.youtube.com/watch?v=pahK7Ege1c0
- https://www.youtube.com/watch?v=pbanZLYyP-M
- https://www.youtube.com/watch?v=pcTmAqXuFbE
- https://www.youtube.com/watch?v=phfqPfdFZdQ
- https://www.youtube.com/watch?v=punciITHal8
- https://www.youtube.com/watch?v=puvCXAdiRxk
- https://www.youtube.com/watch?v=q0gHxY-DFD8
- https://www.youtube.com/watch?v=qDooMV-HnYM
- https://www.youtube.com/watch?v=qLQEHSaRECM
- https://www.youtube.com/watch?v=qbLoTbAPNi4
- https://www.youtube.com/watch?v=qcI5CBbQ2vE
- https://www.youtube.com/watch?v=r9E-6ymEygU
- https://www.youtube.com/watch?v=rDGnqa71XCg
- https://www.youtube.com/watch?v=rNpTE0xvf1A
- https://www.youtube.com/watch?v=rVg3fr3OrPA
- https://www.youtube.com/watch?v=rlUtBArK8Q4
- https://www.youtube.com/watch?v=s-taHB0lRnI
- https://www.youtube.com/watch?v=t3btK_uM6KY
- https://www.youtube.com/watch?v=tg8sn2ZC2CY
- https://www.youtube.com/watch?v=uHMLby5KwZI
- https://www.youtube.com/watch?v=uJX02s3DmfM
- https://www.youtube.com/watch?v=ukQmQgNAKMM
- https://www.youtube.com/watch?v=uyf_-BboQSY
- https://www.youtube.com/watch?v=v4gb6uKa5SQ
- https://www.youtube.com/watch?v=vHbEPapMngk
- https://www.youtube.com/watch?v=vP51V2QUMS0
- https://www.youtube.com/watch?v=vp3tET9xVKk
- https://www.youtube.com/watch?v=vwhx-Izgj9g
- https://www.youtube.com/watch?v=vzzG_KNahQ8
- https://www.youtube.com/watch?v=w2jTmXleZHU
- https://www.youtube.com/watch?v=wIRXoX8nd0I
- https://www.youtube.com/watch?v=wU3hCoPYtT4
- https://www.youtube.com/watch?v=wdxUBFyBMlA
- https://www.youtube.com/watch?v=wp9O6FvyD0U
- https://www.youtube.com/watch?v=xFO_ntoDVBY
- https://www.youtube.com/watch?v=xVf5HzPBx9Q
- https://www.youtube.com/watch?v=xjynpfObTLs
- https://www.youtube.com/watch?v=xocq_CIzuag
- https://www.youtube.com/watch?v=xuzDeqcEMpk
- https://www.youtube.com/watch?v=yDq17RUC8fs
- https://www.youtube.com/watch?v=yEjHJb-SpjQ
- https://www.youtube.com/watch?v=yQH90XJtxTY
- https://www.youtube.com/watch?v=yQPMp8u8Cqc
- https://www.youtube.com/watch?v=yRG2lfbIOks
- https://www.youtube.com/watch?v=yxzr8K95RQ0
- https://www.youtube.com/watch?v=zNATeaH07Cs
- https://www.youtube.com/watch?v=zs2CPw52P-E
- https://www.youtube.com/youtubei/v1/next
