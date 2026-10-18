# Stealth and co-op design literature (background research)

Purpose: published design knowledge to support a design bible for a new original third-person 2-player co-op stealth game. All text paraphrased. Tags: [VERIFIED - 2+ sources], [SINGLE SOURCE], [UNCERTAIN]. Numbered refs [S#] map to the Sources section.

Status: COMPLETE (2026-10-17).

---

## 1. Detection fairness and readable stealth

### 1.1 Mark of the Ninja (Klei, 2012) - "five rules" (Nels Anderson)
Source: Game Developer article by Mathew Kumar (Dec 2012) summarising Anderson's rules [S1]; Game Developer interview by Leigh Alexander (Aug 2012) [S2]; PC Gamer summary [S3, page text not retrievable, search snippet only].
- **Transparent stealth state.** Hidden vs visible is binary and shown on the player character itself (no ambiguous meter); guard sightlines and the reach of sounds are drawn on screen. Goal: the player can predict the outcome of an action before committing. Single deliberate exception: a glimpse at the edge of a guard's vision starts a cautious search, not a full alarm. [VERIFIED - 2+ sources: S1, S2, S3-snippet]
- **Transparent AI.** Guards have three readable awareness states, each with visible cues; when a guard changes behaviour, the cause (noise, sighting) is visible to the player, so planning rests on understanding rather than guessing. [SINGLE SOURCE: S1; corroborated in summary form by S3 snippet]
- **Noise as visible circles.** Every sound the player makes is shown as an expanding ring; any guard inside it hears, anyone outside does not. [VERIFIED - 2+ sources: S1, S2, gamingnexus interview S4]
- **Narrow gulf of execution.** Players should not fight controls to carry out a plan. Klei dropped a resource meter on time-stopping aim because it pushed players away from options. [SINGLE SOURCE: S1]
- **Cheap failure.** Checkpoint between every meaningful encounter; keep reloads fast. Long replays punish the patience stealth requires and push players to repeat one safe, dull tactic. [SINGLE SOURCE: S1]
- **Mentally mappable spaces.** Encounter spaces sized so the player can hold them in their head (in 2D roughly one screen plus margins); big open levels made players feel lost. [SINGLE SOURCE: S1]
- **Learn by risk, not trial-and-error.** Clear systems let players plan proactively sooner instead of discovering rules by dying. [SINGLE SOURCE: S2]
- Design takeaway for a 3D co-op game: make each player's exposure state and each sound's reach legible to BOTH players; one-encounter checkpoints.

### 1.2 Thief: The Dark Project (Looking Glass, 1998)
Source: Tom Leonard, "Postmortem: Thief: The Dark Project", Game Developer, July 1999 [S5]; Leonard's separate article "Building an AI Sensory System" (Gamasutra feature 131297, 2003) referenced by several secondary sources [S6, S7] - the original page could not be retrieved.
- **Graduated awareness.** AI has several alertness levels between "oblivious" and "omniscient", so players can read and exploit partial suspicion. [VERIFIED - 2+ sources: S5, S7]
- **AI does not cheat.** Guards decide only from what they actually perceive; they rarely have hidden knowledge of the player. [VERIFIED - 2+ sources: S5, S7]
- **Sound is the main feedback channel.** Guard barks/speech tell the player where the guard is and what state it is in; player noise alerts guards and can be used as a distraction. [VERIFIED - 2+ sources: S5, S7]
- **Guards alert each other by sound** (combat noise, cries for help), so takedowns must be quiet; guards react to evidence (bodies, blood, opened doors). [VERIFIED - 2+ sources: S5, S7]
- **Room database** used for sound propagation, script triggers and AI optimisation - sound travels through connected rooms, not straight through walls. [SINGLE SOURCE: S5]
- **Difficulty by objectives and placement, not geometry.** Higher difficulty adds objectives, changes object/guard density, and lowers tolerance for killing. [SINGLE SOURCE: S5]
- **Cut what does not support stealth.** Missions that did not support stealth were reworked or cut; non-humanoid enemies with less expressive barks were less liked. [SINGLE SOURCE: S5]

### 1.3 Splinter Cell: Blacklist (Ubisoft Toronto, 2013) - AI perception
Source: Martin Walsh, "Modeling AI Perception and Awareness in Splinter Cell: Blacklist", GDC 2014 [S8] (abstract only; talk video members-only).
- Players now expect more than a single sight cone and hearing radius: AI should perceive realistically and also understand social, environmental and situational context. [SINGLE SOURCE: S8]
- Realism must be balanced with clear, consistent feedback about how perception works and what state each AI is in. [SINGLE SOURCE: S8]

### 1.4 Ubisoft sensory systems (Assassin's Creed, Thief 2014)
Source: Eric Martel, "Can You See Me Now? Building Robust AI Sensory Systems", GDC 2017 AI Summit [S9] (abstract).
- False positives and missed detections both break immersion and gameplay; the sensory system should be robust and designer-configurable, with vision as the main sense and audio secondary. [SINGLE SOURCE: S9]

## 2. Guard AI: perception, believability, communication

### 2.1 F.E.A.R. (Monolith, 2005) - Jeff Orkin, "Three States and a Plan", GDC 2006 [S10 paper PDF; S11 GDC Vault listing]
- Squad behaviours (get to cover, advance under suppression, orderly advance, search in covering pairs) are run by a coordinator that regroups AI by proximity; individual AI need not know about each other. [VERIFIED - 2+ sources: S10, S11]
- **Coordination is worthless if the player cannot perceive it.** AI speaking to each other cues the player that coordination is intentional. [SINGLE SOURCE: S10 primary]
- **Barks can stand in for systems.** A lone survivor calling for reinforcements makes players read the next enemies as reinforcements even though no reinforcement logic exists. [SINGLE SOURCE: S10 primary]
- **Prefer dialogue between two AI over solo announcements** (one asks for status, the other answers; during a search one asks if the other sees anything). [SINGLE SOURCE: S10 primary]
- **Use dialogue to explain inaction** (an AI that cannot reposition says it has nowhere to go) so it does not look dumb. [SINGLE SOURCE: S10 primary]
- Search behaviour splits a squad into mutually covering pairs - a direct template for paired guard searches. [SINGLE SOURCE: S10]

### 2.2 Halo 2 (Bungie, 2004) - Damian Isla, "Handling Complexity in the Halo 2 AI", GDC 2005 proceeding on Gamasutra/Game Developer [S12]
- Decisions run through a prioritised behaviour tree; event "stimulus" behaviours are inserted for 1-2 seconds so higher priorities still decide first. [SINGLE SOURCE: S12]
- **AI acts on believed state, filtered through perception**, so its beliefs can diverge from reality - which is what lets the player trick or surprise it (core requirement for stealth). [SINGLE SOURCE: S12; consistent with Thief's "no cheating" principle in S5]
- Designers place "firing positions" and "orders" that switch on triggers (casualties, player sighted) - designer-authored space for AI. [SINGLE SOURCE: S12]
- Earlier Bungie talk, Butcher and Griesemer, "The Illusion of Intelligence", GDC 2002 (Halo 1): slides list goals of individual, knowledge-based AI and discarding randomness as a design crutch. [SINGLE SOURCE: S13 slides copy; talk existence confirmed by Griesemer interview S14 -> existence VERIFIED]

### 2.3 Left 4 Dead (Valve, 2008) - Michael Booth, "The AI Systems of Left 4 Dead", AIIDE 2009 slides (Valve) [S15 primary PDF]; Shacknews report of Booth's GDC 2009 talk [S16]
- **Static, memorised encounters kill co-op.** Players memorise fixed enemy/loot placement, settle on one optimal strategy, expect partners to know it, and play degenerates into a race. Even several alternative scripted triggers fail because players learn them all. [SINGLE SOURCE: S15 primary. Booth's 2011 retrospective S17 separately says the team needed certain tempos to recur regularly - supports the pacing goal, not the memorisation point]
- **"Structured unpredictability"** via nav mesh, "flow distance" (travel distance from start to exit), potential visibility and an "active area set" around the players. [SINGLE SOURCE: S15]
- **Adaptive dramatic pacing.** Track each player's "intensity" (raised by damage, incapacitation, nearby kills; decays over time but not while engaged). Cycle Build Up -> Sustain Peak (3-5 s) -> Peak Fade (wait for natural break) -> Relax (30-45 s or until the team has moved far enough), then rebuild. Boss encounters are exempt. [SINGLE SOURCE: S15 primary]
- **The team is the unit of design** ("the whole survivor team as the player"); special enemies exist to break up habits and split the group (Smoker added because disciplined teams removed their own tension). Character vocalisation between survivors builds teamwork. Grey-box first: if the untextured layout is fun, the core is sound. [SINGLE SOURCE: S16]
- Stealth-game adaptation: a "director" can modulate patrol density/alert pressure per pair of players; but stealth needs predictability inside an encounter, so randomise between runs (placements, routes), not within a moment the player is reading. [Design inference, not a sourced claim]

### 2.4 Payday 2 (Overkill, 2013) - stealth replayability
Source: Jason Mojica (level designer, Murky Station heist), article on 80.lv, 2018 [S18]; Wikipedia summary of stealth rules [S19].
- **Randomise only what changes play** (container/vault configurations, key placement), not cosmetic variety. [SINGLE SOURCE: S18]
- **Scouting start:** spawn players on an elevated vantage point overlooking the site so they can observe and mark guards before committing. [SINGLE SOURCE: S18]
- **Patrol design:** more, smaller patrol loops; cap guard clustering (about four) to avoid chain-reaction detection. [SINGLE SOURCE: S18]
- **"Onion" layout:** concentric rings, each sub-objective closer to the core goal. [SINGLE SOURCE: S18]
- Multiple routes (under trains, through vents) so players can choose slow/safe vs fast/risky. Static cameras with few valid positions were replaced with drones. [SINGLE SOURCE: S18]
- **Stealth fail conditions:** cameras, guard sightings, a limited number of pager answers after silent kills (each killed guard's pager must be answered; cap of four), and civilians who flee to call police. Meeting these keeps the alarm off and earns a bonus. [VERIFIED - 2+ sources: S19, Game Informer strategy piece with director David Goldfarb S20 for civilian handling]
- Pagers are widely read by players as a deliberate anti-"kill everyone" rule rather than realism. [UNCERTAIN - player forum opinion only]

### 2.5 Invisible, Inc. (Klei, 2015)
Source: James Lantz, "Designing Procedural Stealth for Invisible Inc.", GDC 2015 [S21, abstract only]; Wikipedia [S22]; reviews [S23].
- **Escalating alarm clock** instead of instant failure: a global alarm level rises after each turn in most locations, adding security forces and threats - converts detection pressure into a timer that pushes players onward. [SINGLE SOURCE: S22; a fan write-up describes levels 0-6 each adding a threat - UNCERTAIN detail]
- Downed agents can be revived or dragged to the exit by a teammate; procedural layouts per run; hacking layer (Incognita) disables cameras/alarms using collected power. [SINGLE SOURCE: S22]
- No save-anywhere; tension from committing under rising pressure. [UNCERTAIN - review snippet S23 only, page not retrievable]

## 3. Co-op design

### 3.1 Portal 2 co-op (Valve, 2011)
Source: Game Developer interview with writer Erik Wolpaw by Chris Remo, Sept 2010 [S24]; secondary coverage via search [S25 PopMatters, S26 GameSpot hands-on - snippets only].
- **The co-op test:** a co-op puzzle that one person can solve alone does not count as co-op. [SINGLE SOURCE: S24]
- **Spatial communication is the hard problem.** Playtests showed partners wasting minutes explaining where "here" is; Valve added temporary world-markers (pings/glyphs) for non-verbal pointing, timers for synchronised actions and shared gestures. [VERIFIED - 2+ sources: S24 for problem and glyphs; S25/S26 snippets for countdown timers - timers detail UNCERTAIN]
- Co-op mode grew from observing players improvise two-person play on the first game. [UNCERTAIN - search snippet only]

### 3.2 Hazelight (A Way Out 2018, It Takes Two 2021, Split Fiction 2025) - Josef Fares
Sources: GamingBolt interview Dec 2017 [S27]; The Ringer, Apr 2021 [S28]; GamesBeat, Feb 2025 [S29].
- **Designed for two from day one,** never a single-player game with co-op bolted on; no solo mode. [VERIFIED - 2+ sources: S27, S28]
- **Distinct characters with distinct options** - personalities shape what each player can do; NPCs react differently per character; choices change how a scenario is solved, not the plot. [SINGLE SOURCE: S27]
- **Mechanics that "communicate"** with each other so both feel they are collaborating; constant voice communication is expected and required. [VERIFIED - 2+ sources: S28, S29]
- **Interdependence with a personal game.** Fares wants each player to still feel they are playing "your own game a bit", avoiding total dependence on the partner. [SINGLE SOURCE: S29]
- **Split screen is a design tool,** not a compromise: each player can see the other's view, which supports communication; in A Way Out one player keeps control while the other is in a cutscene. [VERIFIED - 2+ sources: S27, S28]
- **Co-op pacing is harder to control** because triggers cannot assume where the other player is. [SINGLE SOURCE: S28]
- **Variety and polish:** many short-lived mechanics tied to story beats, each polished or cut. [VERIFIED - 2+ sources: S28, S29]

### 3.3 Academic: asymmetry and interdependence
Source: Harris and Hancock, "To Asymmetry and Beyond!", CHI 2019 [S30]; Harris PhD thesis, Univ. of Waterloo [S31].
- Asymmetric roles (different abilities/interfaces) improved perceived connectedness, engagement and immersion vs symmetric play in their studies. [SINGLE SOURCE: S30]
- Designer levers: timing of cooperative actions (synchronous vs asynchronous) and direction of dependence (one-way vs mutual); thesis adds necessity and leadership/primacy as dimensions of asymmetric co-op. [VERIFIED - 2+ sources: S30, S31 (same author group - treat as one research line)]

### 3.4 Splinter Cell co-op (Conviction 2010, Blacklist 2013)
Sources: Wikipedia Conviction [S32]; Co-Optimus co-op review and previews [S33 - 403 to direct fetch, used via search snippets]; Stevivor interview with Ubisoft Toronto's Kristjan Zadziuk [S34]; Destructoid preview with co-op lead designer Richard Carrillo [S35]; PlayStation Blog / Softpedia on Blacklist playstyles [S36].
- Conviction co-op is a separate two-agent prologue (Archer and Kestrel), playable split-screen, system link or online; Deniable Ops adds Hunter, Infiltration (kill without being seen), Last Stand and Face-Off modes on the co-op maps. Stealth built around "Mark and Execute" (tag targets, then instant multi-takedown) and "Last Known Position" (enemies converge on a silhouette where they last saw you, letting the player flank). [VERIFIED - 2+ sources: S32, S33]
- Co-op extensions: either partner can execute targets the other marked; two-man room breaches; a downed player can be revived, and an enemy can grab one player as hostage until the partner frees them. [SINGLE SOURCE: S33 snippets - UNCERTAIN on detail]
- Blacklist ties co-op into the main hub (players pick solo/co-op/versus from the same plane hub) with narrative ties across every mode. [VERIFIED - 2+ sources: S34 snippet, S35]
- Blacklist has a separate set of co-op-only maps (reportedly 14 co-op vs 13 solo). [SINGLE SOURCE: S34 snippet; page 403]
- Co-op side missions are flavoured by the NPC who gives them; one contact's missions demand pure ghosting and restart on detection, others push toward lethal/assault play. Co-op lead stressed that daylight co-op maps were built to be fully ghostable. [SINGLE SOURCE: S35]
- Blacklist rewards three playstyles per mission - Ghost (unseen, non-lethal), Panther (unseen, lethal), Assault (open combat) - and maps are built to support all three. [VERIFIED - 2+ sources: S36, plus search corroboration from GamingTrend S37]

### 3.5 Ghost Recon Wildlands (Ubisoft Paris, 2017) - Sync Shot
Source: Co-Optimus review [S38 snippet], Twinfinite [S39 snippet], Empire review [S40 snippet].
- Players mark up to several targets (via drone, binoculars or scope) and fire together for a simultaneous takedown. Sources disagree on whether human co-op partners use the same UI or just coordinate by voice. [UNCERTAIN - conflicting secondary sources]

### 3.6 Hitman 2 Sniper Assassin (IO Interactive, 2018)
Source: Co-Optimus listing / Twinfinite impressions [S41 snippets].
- Two-player online mode: two snipers with different special ammo (one concussive, one wall-piercing) must eliminate targets and bodyguards within a time limit - complementary tools at a distance rather than shared space. [UNCERTAIN - secondary snippets only]

### 3.7 Left 4 Dead - co-op lessons (see 2.3)
- Team as unit of design; enemies that isolate a player force partners to rescue; vocal callouts build teamwork. [SINGLE SOURCE: S16]

### 3.8 Other co-op references
- **Sniper Elite 4 (Rebellion, 2017):** whole campaign playable by two; partners pick separate vantage points so one draws enemy attention away from the other; spaces built around climbable perches, enterable buildings, vegetation cover and long sightlines. [SINGLE SOURCE: Tech-Gaming Q&A / TheSixthAxis interview via search snippets S69 - UNCERTAIN detail]. A dedicated sniper+spotter co-op mode ("Overwatch", Sniper Elite V2 era) is recalled but not verified. [UNCERTAIN - Gap]
- **Splinter Cell: Chaos Theory (2005):** co-op missions built by Ubisoft Montreal; Ubisoft Annecy built the competitive Spies vs Mercs mode (begun in Pandora Tomorrow). Five co-op missions (tutorial plus four) on Xbox/PC. [SINGLE SOURCE: Nintendo World Report press release S70 via snippet - other agents in this project cover Chaos Theory co-op in depth]
- **Castle Crashers (2008) - network co-op hygiene:** save often, allow drop-in/rejoin mid-session, do not end the game when one player drops. (Contrast: A Way Out ends the session for both if one quits - S27.) [SINGLE SOURCE: Manveer Heir, Game Developer 2008, S71]

## 4. Stealth level design

### 4.1 Randy Smith, "Level Building for Stealth Gameplay", GDC 2006 (Thief series designer) [S42 GDC Vault listing; S43 original slide deck, downloaded from roningamedeveloper.com and read in full; S44 Tremblay et al. paper re-testing one of its examples]
This is the single most useful primary source found. Paraphrased key ideas:
- **Core stealth aesthetic:** create the illusion of a securely guarded area that the player can still slip through by using their abilities to find and exploit security flaws. It fails in two ways: stealth is unnecessary (area poorly guarded, or a loud solution is easier/more fun), or stealth does not work (player gets caught too often). [VERIFIED - 2+ sources: S42 abstract, S43 slides]
- **Low threshold for failure.** Combat lets you take hits without failing; stealth fails as soon as a guard sees you. So a stealth level cannot assume players will fail - every encounter must offer a **"zero failure" path**, that path must be communicated, but not so obviously that the player no longer feels stealthy. Too little help: player feels incapable; too much: player does not feel stealthy. [SINGLE SOURCE: S43 primary]
- **Level features are design tools on a balance scale.** Challenges: guards, loud flooring, dead ends, light, blind corners, tight passages. Advantages: scouting locations, connectivity, shadows, soft cover (darkness, bushes), hard cover (L-shaped rooms, trees). Many items are both depending on context (patrol paths, hard cover). [SINGLE SOURCE: S43]
- **Environment is "sneaky":** doors, staircases, furniture and tile floors affect stealth even when not intended. Acknowledge every gameplay-relevant surface. [SINGLE SOURCE: S43]
- **Stealth-friendly vs stealth-unfriendly mapping.** Mark zones that attract players (dark alcoves) vs repel them. **Players move island to island between stealth-friendly spots** - use this to predict paths, then overlay guard data. [SINGLE SOURCE: S43; S44 notes Smith's "stealth friendly" definition: tools that reduce detection outweigh environmental challenges]
- **Scouting locations:** safe spots with good sightlines over upcoming challenges (dark crossroads, balconies, rafters, hills). Uses: learn the challenge, form a plan, relax, reset. A brightly lit balcony or dark tile floor sends the wrong signal - perceived affordance must match the real stealth value. Blind corners can be converted into scouting spots. [SINGLE SOURCE: S43; consistent with Payday 2 elevated start S18]
- **Enemy placement as territory.** Static guards hold a fixed territory; patrols cover more ground but not all the time; long, branching or scripted patrols make it unclear what is controlled when. A guard's strength depends on the environment (one guard in an unfriendly area may be too much). Patrols create windows of opportunity for crossing open ground; a static guard over the same crossing does not. [SINGLE SOURCE: S43]
- **Tuning recipe:** (1) find the player paths, (2) compare them to enemy placement, (3) confirm at least one zero-failure path, (4) balance paths for risk vs reward. For open-ended levels, lay down many challenges and advantages ("make a playground, don't author an experience") but still understand and balance the paths. [SINGLE SOURCE: S43]
- **Rhythm:** alternate friendly and unfriendly spaces to create the tension-relaxation cycle that defines stealth pacing. [SINGLE SOURCE: S43; aligns with L4D build/relax cycle S15]
- **Phases of stealth play** each need level support: no enemies present (does the player know? use scouting cues), undetected, being searched for (needs connected stealth-friendly islands, obstructions, circular routes - "ring around the rosy"), caught/fleeing (needs routes enemies cannot follow, e.g. balconies, and reset areas such as scouting spots). Beware "out of the frying pan into the fire" when escape routes lead into more guards. [SINGLE SOURCE: S43]
- **Content must match systems and target feel.** Example: staggered alcoves plus a timed patrol produce slow, thoughtful pacing; level builders must know which systems exist (e.g. can lights be extinguished?) before building. [SINGLE SOURCE: S43]
- **Designer predictions can be wrong:** Tremblay et al. simulated Smith's alcove-corridor example and found players need not use every alcove (once the guard passes, there is no reason to hide) - argues for automated path analysis or heavy playtesting. [SINGLE SOURCE: S44]

### 4.2 Payday 2 "onion" layout and scouting start - see 2.4 [S18]

### 4.3 Hitman (IO Interactive, 2016-2021) - sandbox guidance and social spaces
Sources: GDC Europe 2016 "Level Design in HITMAN: Guiding Players in a Non-Linear Sandbox" (Jacob Mikkelsen, Mette Podenphant Andersen) [S45]; GDC 2019 "'Hitman' Levels as Social Spaces" (Andersen) [S46]; Game Developer session announcement [S47].
- Late user research found the first sandbox (Paris) overwhelming: fun, but the learning curve too steep. The team added guidance while keeping the sandbox intact - essentially a linear guidance layer ("opportunities"/mission stories) laid over an open level. [VERIFIED - 2+ sources: S45, S47]
- Treating levels as social spaces (who is allowed where, social roles) shaped Hitman 2 pre-production and coined new internal vocabulary. [SINGLE SOURCE: S46 abstract]
- Graduated reactions instead of binary ones (Hitman: Absolution era): a police officer who discovers you tries to arrest you before shooting, giving leeway to back off, hide or disarm; disguises have their own attributes and context matters (a police disguise is a liability among people who dislike police, while being undisguised there is tolerated but suspicious). [SINGLE SOURCE: PlayStation Blog interview with Tore Blystad and Christian Elverdam, 2011, S48]
- Same-role NPCs see through a disguise most easily; disguise strength varies by outfit; prolonged exposure blows a disguise. [UNCERTAIN - search snippets from Giant Bomb/PCInvasion/Shacknews S49, not read directly]
- Players complained that same-role detection from across a room felt unfair; IO said it was tuning it. [UNCERTAIN - forum post via search snippet]

### 4.4 Assassin's Creed (Ubisoft Montreal, 2007) - social stealth
Sources: Time Extension "making of" with Simon Tremblay, Mathieu Mazerolle [S50]; Game Developer post-GDC 2006 report of Desilets' talk [S51]; PC Gamer interview with Desilets [S52 snippet].
- The crowd simulation came first; level designers then needed tools to make it gameplay (blending with monks, hiding in hay). [SINGLE SOURCE: S50]
- **High/low profile:** walking normally keeps the crowd and guards calm; running, jumping or climbing raises your profile; the crowd acts as a barometer, and past a threshold it calls guards. Blending spots let players lie low until heat dies down, explicitly to avoid trial-and-error. [SINGLE SOURCE: S50]
- Design pillar: mirror real-world rules ("organic design") to aid immersion and accessibility; NPCs as physical obstacles, not only combatants. [SINGLE SOURCE: S51]
- Desilets later said big studios dropped social stealth largely due to the cost of many believable NPCs. [SINGLE SOURCE: S52 snippet - UNCERTAIN wording]

### 4.5 Metal Gear (Konami, 1987-1998) - alert phases
Sources: Wikipedia Metal Gear Solid [S53]; Wikipedia Metal Gear 2: Solid Snake [S54]; Gamepressure history of stealth [S55 snippet].
- **Phase model:** infiltration (normal) -> alert (seen; enemies converge) -> evasion (player has hidden; a countdown runs) -> back to infiltration. Radar is disabled during alert/evasion. [VERIFIED - 2+ sources: S53, S54]
- MG2 (1990) introduced patrolling (not static) guards with a 45-degree view cone and head turns, guards investigating noises (including footsteps on certain surfaces), crawling/hiding in ducts and under desks, and distraction items. [SINGLE SOURCE: S54]
- MGS radar shows guard vision cones and hideable cover; vision is shown on the radar, not the main view. [SINGLE SOURCE: S53]
- The original Metal Gear used a two-level alert: a single "!" could be escaped by breaking line of sight; "!!" meant a full alarm. [SINGLE SOURCE: S55 snippet - UNCERTAIN]
- Kojima's stated intent: the world must feel real to the player or the game is pointless. [SINGLE SOURCE: S53]

### 4.6 Other reference games
- **Gunpoint (Tom Francis, 2013):** being seen by an armed guard is near-instant death, so stealth is about avoiding sight entirely; the "Crosslink" tool lets players rewire lights, switches, cameras and doors (e.g. a camera opens a door instead of raising an alarm) - security devices as a puzzle network. [VERIFIED - 2+ sources: Wikipedia S56, pentadact.com S57 snippet]. Francis cut remote activation of devices because it trivialised solutions, and designed levels so players can out-think them. [SINGLE SOURCE: S56]
- **Monaco (Pocketwatch, 2013; Monaco 2, 2025):** designer found co-op far more fun than solo within weeks of testing; original design doc proposed rescuing captured teammates; Monaco 2 heists designed around combining distinct character abilities in co-op while remaining playable solo. [VERIFIED - 2+ sources for co-op-first design: Co-Optimus S58 snippet, Microsoft Indie Selects interview with Andy Schatz May 2025 S59]
- **Styx (Cyanide, 2014/2017):** strong verticality; lead level designer wanted "hard but not unjust"; vigilant guards change patrols, stop idling and guard entrances after detecting something; alarm bells can be sabotaged; sequel moved from binary to graded light. [SINGLE SOURCE for each: TheSixthAxis interview with Julien Desourteaux S60; Unreal Engine interview S61 via snippet]
- **Sly Cooper (Sucker Punch, 2002+):** a planning tool (the "Binoc-u-com" heist briefing) gave direction without heavy-handed tutorials. [UNCERTAIN - single search snippet]
- **Dishonored 2 (Arkane, 2016) Clockwork Mansion:** keeping players oriented is a primary challenge; rooms with recognisable real-world functions let players build a mental map without markers; avoid long, narrow, winding passages; keep hidden "backstage" routes visually connected to main rooms. [SINGLE SOURCE: Christophe Carrier deep dive S62]
- **Holistic level design (Steve Lee, Arkane, GDC 2017):** design gameplay, presentation and story together; key concepts are affordances, intentionality, world building, interactive storytelling. [SINGLE SOURCE: S63 abstract]
- **Splinter Cell Blacklist / Conviction:** Last Known Position silhouette shows where enemies believe you are, turning detection into a flanking opportunity. [VERIFIED - 2+ sources: S32, S33]
- **Intravenous (Mike Tang, 2021):** no primary design source found. [Gap]

## 5. Navigation, signposting and pacing

### 5.1 "Weenies" and light leading - Scott Rogers, "Everything I Learned About Level Design I Learned from Disneyland", GDC 2009 [S64 live notes by Cory Doctorow; S65 Boing Boing summary/slides]
- **Weenies:** visible landmarks that pull people toward a location; Disneyland reveals new weenies as you progress (castle first, then land entrances, then rides peeking over the horizon), prompting choice. Enhance by changing altitude and by switchbacks that re-reveal the goal. [VERIFIED - 2+ sources: S64 notes; S65 Boing Boing summary seen as search snippet (page 403)]
- **Light leads:** light draws people to goals; Disney dims everything but the exit after fireworks. "Squint test" - squint at the screen and the main path should be the brightest thing. [Light-leading VERIFIED - 2+ sources: S64, S65 snippet, and GMTK navigation video transcript snippet S67; squint test SINGLE SOURCE S64]
- **Presented path vs exploration:** main arteries plus small side paths that make players feel clever; "fingers of distraction" make a world feel bigger; regular rest spots/checkpoints and re-orientation points. [SINGLE SOURCE: S64]
- **Foreshadowing:** show dangers and rewards before the player reaches them to build anticipation. [SINGLE SOURCE: S64]
- **Stealth tension:** for a stealth game, light-leading conflicts with darkness-as-safety; Smith's slides warn that a brightly lit scouting spot reads as unsafe [S43]. Implication: lead with lit landmarks seen *from* dark routes, not by lighting the route itself. [Design inference]

### 5.2 Academic test of UI-free guidance
- Mark Tempini, "Guiding with a Soft Touch", Press Start 2019: light, colour and architecture guided players through a large non-linear level as intended without UI; play style affected routes. [SINGLE SOURCE: S66 abstract]

### 5.3 Pacing
- L4D build-up / peak / relax cycle with relax periods of 30-45 s [S15]; Smith's friendly/unfriendly rhythm [S43]; Hazelight's frequent mechanic changes [S28, S29]. [Each SINGLE SOURCE as noted; the tension-release principle itself VERIFIED across S15 and S43]

## 6. Failure states vs recoverable stealth

- **Instant fail breeds trial-and-error.** "Defensive" stealth with no options means getting caught usually means failing, producing repetitive retry loops; the fix is giving players escape and combat options. [SINGLE SOURCE: Josh Bycer, Game Developer 2017, S68] Supported by Smith's "low threshold for failure" [S43] and Mark of the Ninja's cheap-failure rule [S1]. -> principle VERIFIED - 2+ sources.
- **Graduated escalation keeps the game going after a mistake:** Thief's multiple alert states [S5]; MGS alert -> evasion -> infiltration countdown [S53, S54]; Hitman arrest-before-shoot [S48]; Invisible Inc rising alarm clock [S22]; Last Known Position letting players flank after detection [S32]; Assassin's Creed blending spots to lose heat [S50]. [VERIFIED - many sources]
- **Glimpse = investigate, not alarm.** Mark of the Ninja's edge-of-vision rule [S1]; Thief graduated awareness [S5]. [VERIFIED - 2+ sources]
- **Checkpoint per encounter, fast reload** [S1].
- **Design escape support into the level:** routes enemies cannot follow, loops ("ring around the rosy"), reset spots [S43].
- **Deliberate hard-fail modes exist** as optional challenge layers: Blacklist co-op missions from one contact restart on detection [S35]; Conviction's Infiltration mode fails on being seen [S32]; Payday 2 stealth fails into a loud heist rather than a game-over [S19] (a "fail forward" model - the mission continues in a harder mode). [VERIFIED - 2+ sources for the existence of such modes]
- **Co-op specific:** downed partners revived or dragged out (Invisible Inc [S22]; Conviction [S33 snippet]); Monaco design doc proposed rescuing captured teammates [S58]. A partner's failure should create a rescue task for the other, not a reload for both. [Design inference from these]

## 7. Known anti-patterns (with source support)

| Anti-pattern | Why it hurts | Sources | Tag |
|---|---|---|---|
| Trial-and-error / instant fail | Players learn rules by dying; repetitive retries; discourages experimentation | S68, S43, S1, S2, S50 | VERIFIED |
| Unreadable detection | Players cannot predict outcomes, so failure feels unfair | S1, S8, S9, S10, S5 | VERIFIED |
| AI that cheats (knows where you are without perceiving) | Breaks the player's model and the ability to trick AI | S5, S12 | VERIFIED |
| Static, memorised encounters in co-op | One optimal strategy, players race, cooperation collapses | S15 | SINGLE SOURCE |
| Long replays after failure | Punishes patience; pushes repetitive "safe" play | S1 | SINGLE SOURCE |
| Oversized, unmappable spaces | Players get lost; cannot plan | S1, S62, S45 (Paris too overwhelming) | VERIFIED |
| Long, narrow winding passages / disorientation | Lost bearings | S62 | SINGLE SOURCE |
| Unintended stealth properties (noisy tiles, doors, stairs) | Changes difficulty without the designer noticing | S43 | SINGLE SOURCE |
| Perceived affordance mismatch (lit "safe" spot, dark noisy floor) | Players avoid useful spots or get caught unfairly | S43 | SINGLE SOURCE |
| Area not actually well guarded / loud play easier | Stealth becomes pointless | S43, S68 (apex-predator stealth degrades into repetition) | VERIFIED |
| Air-vent overuse / impossible vents | Vents conveniently link every point of interest; real HVAC ducts are mostly too small, run vertically then branch, have fans and grilles, and exterior vents sit high | Kotaku with architect Chance Heath S72; PC Gamer S73 snippet | VERIFIED - 2+ sources |
| Co-op bolted onto single-player | One player watches the other; co-op must be designed from the start | S27, S28, Co-Optimus review of Troll and I S74 snippet | VERIFIED |
| One player idle while the other acts | Watching a partner for long stretches is boring | S74 snippet, Co-Optimus pass-and-play editorial S75 snippet; Fares "you can't progress without them" but each should feel their own game S29 | VERIFIED (2+ secondary) |
| Co-op puzzle solvable by one player | Not real co-op | S24 | SINGLE SOURCE |
| Spatial communication without tools | Minutes lost explaining "here" | S24 | SINGLE SOURCE |
| Session ends when one player drops | Lost progress, waiting in lobbies | S71 | SINGLE SOURCE |
| Over-powerful remote tools | Trivialise solutions | S56 (Gunpoint cut remote activation), S1 (no resource meter but still bounded) | SINGLE SOURCE |
| Pager-style "gamey" limit rules | Feel arbitrary but prevent kill-everyone play | S19 + player forum | UNCERTAIN |
| Real-world realism vs fun | Real-world logic aids readability (S62, S51) but some designers argue unreal spaces can be more fun | Game Designer Notes (Patreon) S76 snippet | UNCERTAIN |

## 8. Gaps
- Could not read full talks behind GDC Vault membership: Walsh (Blacklist AI), Lantz (Invisible Inc), Wagner (Shadow Tactics), Andersen/Mikkelsen (Hitman), Martel (Ubisoft sensory). Only abstracts used.
- Tom Leonard's "Building an AI Sensory System" (Thief) original page not retrieved; web.archive.org blocked.
- No primary design source found for Intravenous, Sly Cooper, Shadow Tactics vision-cone rationale, Sniper Elite co-op modes, Ghost Recon co-op Sync Shot, Hitman Sniper Assassin.
- No designer-authored (non-review) source specifically on "one player idles" in co-op; covered only by reviews/editorials plus Fares interviews.
- Game Maker's Toolkit "School of Stealth" transcripts were 403.

## Sources (file 1)
S1 https://gamedeveloper.com/design/-i-mark-of-the-ninja-i-s-five-stealth-design-rules - Kumar, Mark of the Ninja five rules (read)
S2 https://www.gamedeveloper.com/design/reinventing-stealth-in-2d-with-i-mark-of-the-ninja-i- - Alexander interview with Nels Anderson 2012 (read)
S3 https://pcgamer.com/stealth-game-design-mark-of-the-ninja - PC Gamer five rules (FAILED: page truncated; search snippet only)
S4 https://www.gamingnexus.com/Article/3565/Mark-of-the-Ninja-Interview - noise circles, silhouettes (search snippet only)
S5 https://www.gamedeveloper.com/design/postmortem-i-thief-the-dark-project-i- - Tom Leonard Thief postmortem 1999 (read)
S6 gamasutra.com/view/feature/131297 - Leonard "Building an AI Sensory System" (NOT retrieved; gamedeveloper.com equivalents returned listing pages)
S7 https://modl.ai/?p=1997 - blog on Thief sensory systems (FAILED: fetched homepage; search snippet only)
S8 https://gdcvault.com/play/1020195/Modeling-AI-Perception-and-Awareness - Walsh GDC 2014 abstract (read)
S9 https://gdcvault.com/play/1026497/Can-You-See-Me-Now - Martel GDC 2017 abstract (read)
S10 https://pages.cs.wisc.edu/~dyer/cs540/handouts/gdc2006_orkin_jeff_fear.pdf - Orkin F.E.A.R. paper (read)
S11 https://gdcvault.com/play/1013282/Three-States-and-a-Plan - GDC listing (search)
S12 https://www.gamedeveloper.com/programming/gdc-2005-proceeding-handling-complexity-in-the-i-halo-2-i-ai - Isla Halo 2 AI (read)
S13 https://www.jmeiners.com/shamans/papers/ai/the_illusion_of_intelligence.pdf - Butcher/Griesemer slides copy (search snippet)
S14 https://www.engadget.com/2011-07-14-half-minute-halo-an-interview-with-jaime-griesemer.html - Griesemer interview (search snippet)
S15 https://steamcdn-a.akamaihd.net/apps/valve/2009/ai_systems_of_l4d_mike_booth.pdf - Booth, AI Systems of L4D slides (read in full)
S16 https://www.shacknews.com/article/57892/left-4-dead-at-gdc - Booth GDC 2009 report (read)
S17 https://www.shacknews.com/article/69960/devs-discuss-left-4-dead-in-retrospect - 2011 retrospective (read)
S18 https://80.lv/articles/designing-highly-replayable-stealth-levels-for-payday-2/ - Jason Mojica, Murky Station (read)
S19 https://en.wikipedia.org/wiki/Payday_2 - stealth rules (search snippet)
S20 https://gameinformer.com/b/features/archive/2013/08/13/payday-2-strategy-guide.aspx - Goldfarb on civilians (search snippet)
S21 https://gdcvault.com/play/1021919/Designing-Procedural-Stealth-for-Invisible - Lantz GDC 2015 abstract (read)
S22 https://en.wikipedia.org/wiki/Invisible,_Inc. - gameplay (read)
S23 https://www.pcgamer.com/uk/invisible-inc-review/ - review (FAILED: truncated)
S24 https://gamedeveloper.com/design/synthesizing-i-portal-2-i- - Wolpaw interview 2010 (read)
S25 https://popmatters.com/141127-portal-2-cooperative-testing-initiative-2496030449.html - (search snippet)
S26 https://www.gamespot.com/articles/portal-2-co-op-hands-on/1100-6286739/ - (search snippet)
S27 https://gamingbolt.com/an-interview-with-josef-fares-the-creator-of-a-way-out-i-always-knew-we-had-something-special - (read)
S28 https://www.theringer.com/2021/04/22/video-games/josef-fares-it-takes-two-interview-co-op-gaming - (read)
S29 https://gamesbeat.com/how-josef-fares-stayed-focused-on-the-co-op-action-adventure-with-split-fiction-interview/ - (read)
S30 https://uwaterloo.ca/touchlab/references/asymmetry-and-beyond-improving-social-connectedness - Harris & Hancock CHI 2019 (read)
S31 https://uwspace.uwaterloo.ca/items/3aa63daa-5ba1-4ed7-ba64-813857472cbb - Harris thesis (search snippet)
S32 https://en.wikipedia.org/wiki/Tom_Clancy%27s_Splinter_Cell:_Conviction - (read)
S33 https://co-optimus.com/review/454/page/3/splinter-cell-conviction-co-op-review.html and co-optimus.com/article/3516/... - (FAILED: 403 / Cloudflare; search snippets only)
S34 https://stevivor.com/features/interviews/ubisoft-torontos-kristkjan-zadziuk-on-splinter-cell-blacklist - (FAILED: 403; snippet)
S35 https://www.destructoid.com/splinter-cell-blacklist-is-full-of-multiplayer-goodness/ - Carrillo preview (read)
S36 https://blog.playstation.com/?p=111014 and https://games.softpedia.com/blog/Splinter-Cell-Blacklist-Gameplay-Video-Shows-Different-Playstyles-339571.shtml - Ghost/Panther/Assault (search snippets)
S37 https://gamingtrend.com/news/splinter-cell-blacklist-walkthru-of-abandoned-mill-level - (search snippet)
S38-S40 https://co-optimus.com/review/1992/page/2/tom-clancy-s-ghost-recon-wildlands-co-op-review.html ; https://twinfinite.net/?p=265009 ; https://www.empireonline.com/gaming/reviews/ghost-recon-wildlands-review - Sync Shot (search snippets)
S41 https://twinfinite.net/features/hitman-sniper-assassin-mode-impressions/ ; https://www.co-optimus.com/game/5150/pc/hitman-2.html - (search snippets)
S42 https://gdcvault.com/play/1013211/Level-Building-for-Stealth - Randy Smith GDC 2006 abstract (read)
S43 http://www.roningamedeveloper.com/Materials/RandySmith_GDC_2006.ppt - full slide deck (downloaded, converted, read in full)
S44 https://www.sable.mcgill.ca/~clump/papers/tremblay-13-exploration.pdf - Tremblay et al., exploration tool for stealth (read)
S45 https://gdcvault.com/play/1023849/Level-Design-in-HITMAN-Guiding - GDC Europe 2016 (search snippet + abstract)
S46 https://gdcvault.com/play/1025879/Level-Design-Workshop-Hitman-Levels - GDC 2019 abstract (read)
S47 https://gamedeveloper.com/business/gdc-europe-2016-debuts-i-hitman-i-daglow-as-first-sessions - (search snippet)
S48 https://blog.playstation.com/2011/06/21/hitman-absolution-developer-interview/ - (read)
S49 https://www.shacknews.com/article/72044/hitman-absolution-focusing-on-smarter-ai ; giantbomb ; pcinvasion - (search snippets)
S50 https://www.timeextension.com/features/the-making-of-assassins-creed-ubisofts-original-open-world-epic - (read)
S51 https://www.gamedeveloper.com/design/post-gdc-defining-the-assassin - (read)
S52 https://www.pcgamer.com/au/assassins-creeds-creator-explains-why-big-budget-studios-have-turned-their-back-on-social-stealth-its-money-man - (search snippet)
S53 https://en.wikipedia.org/wiki/Metal_Gear_Solid_(video_game) - (read, first 100k chars)
S54 https://en.wikipedia.org/wiki/Metal_Gear_2:_Solid_Snake - (read)
S55 https://www.gamepressure.com/editorials/the-history-of-stealth-genre-and-the-thieves-assassins-and-agents/metal-gear-and-metal-gear-2-solid-snake/z420b - (search snippet)
S56 https://en.wikipedia.org/wiki/Gunpoint_(video_game) - (read)
S57 https://www.pentadact.com/?p=3526 - Tom Francis blog (search snippet)
S58 https://co-optimus.com/article/5394/monaco-s-original-design-document-unveiled.html ; https://co-optimus.com/article/4573/video-interview-with-monaco-creator-andy-schatz.html - (search snippets; co-optimus 403)
S59 https://developer.microsoft.com/en-us/games/articles/2025/05/inside-indie-selects-monaco-2/ - (read)
S60 https://www.thesixthaxis.com/2016/03/08/interview-julien-desourteaux-on-styx-variety-difficult-stealth/ - (read)
S61 https://www.unrealengine.com/en-US/developer-interviews/the-bright-ideas-behind-styx-shards-of-darkness - (FAILED 403; snippet)
S62 https://gamedeveloper.com/design/level-design-deep-dive-i-dishonored-2-s-i-clockwork-mansion - Carrier (read)
S63 https://gdcvault.com/play/1024301/Level-Design-Workshop-An-Approach - Steve Lee GDC 2017 (read)
S64 https://craphound.com/disneylandleveldesign.txt - Doctorow notes of Scott Rogers GDC 2009 (read)
S65 https://boingboing.net/2009/03/27/gamedesign-lessons-f.html - (FAILED 403; snippet)
S66 https://press-start.gla.ac.uk/press-start/article/view/129 - Tempini 2019 (read abstract)
S67 https://amara.org/subtitles/xwcncEJkgSYU/... GMTK "Why Nathan Drake Doesn't Need a Compass" transcript (FAILED 403; snippet)
S68 https://www.gamedeveloper.com/design/the-2-philosophies-of-stealth-gameplay - Bycer 2017 (read)
S69 https://tech-gaming.com/qa-sniper-elite-4s-rebellion-developments ; https://www.thesixthaxis.com/?p=281680 - (search snippets)
S70 https://nintendoworldreport.com/pr/10419/splinter-cell-chaos-theory-ships - (search snippet)
S71 https://www.gamedeveloper.com/design/design-lesson-101---i-castle-crashers-i- - Heir 2008 (read)
S72 https://kotaku.com/deus-ex-gets-air-vents-all-wrong-according-to-an-archi-1785966240 - (read)
S73 https://pcgamer.com/the-best-vents-in-pc-gaming - (search snippet)
S74 https://co-optimus.com/review/2039/page/1/troll-and-i-review.html - (search snippet)
S75 https://www.co-optimus.com/editorial/322/Co-Op_Couples__Pass_and_Play.html - (search snippet)
S76 https://www.patreon.com/GameDesignerNotes/posts/elden-ring-when-139451018 - (search snippet)
Other failed: https://www.rollingstone.com/culture/culture-news/why-making-dishonored-2-was-so-hard-121280/ (307 to paywall); https://gamedev.net/tutorials/industry/interviews/igf-2010-pocketwatch-games-r2736 (403); https://community.coredecay.com/d/20-dev-blog-3-real-world-spaces (no content); https://gambit.mit.edu/updates/2011/06/looking_glass_studios_intervie_3.php (audio only; comments used for nothing).
