# 13 - Design principles

This file distils the research into 36 numbered principles for co-op stealth level design. Each principle has three parts:
- **Principle**: the rule.
- **Evidence**: the findings it rests on, with file references. Original-game evidence carries the confidence tags used in those files. Literature references point to `research_notes/stealth_coop_design_literature.md`.
- **Test**: how to check whether a new level follows it. Tests are written so a reviewer can answer pass or fail.

This is a research-phase file, so it names the original game. The design bible (Phase 4) restates these principles in original language.

---

## A. Co-op structure

### 1. Design for two from the first sketch
- **Principle.** Every space is designed around what two bodies can do that one cannot. Co-op is not a second player added to a solo level.
- **Evidence.**
  - The original's co-op missions were built separately from solo, on dedicated maps. [VERIFIED - Ubisoft PR, 03 §3]
  - Players credit this ("levels built specifically for co-op"; "three games in one"). [VERIFIED - reception]
  - Hazelight's founders insist on the same rule. [VERIFIED - literature]
  - Co-op bolted onto solo is a recognised anti-pattern. [12 B11]
- **Test.** For each zone, the designer can name at least one action or route available only to a pair. Removing the second player must make the zone impossible or clearly worse.

### 2. One handshake for every two-person action
- **Principle.** All co-op moves share one interaction contract. One player initiates and the other completes, each step is confirmed by an audio cue and a UI cue, and an invalid attempt fails gracefully.
- **Evidence.** The original used a single initiate/complete flow for every move, with automatic voice lines, an action icon, and a head-shake plus vibration on invalid use. [VERIFIED - 05 §1] Players who misunderstood the input (crouch versus stand) got stuck at the very first wall. [SINGLE SOURCE - JV]
- **Test.** A new player can perform any co-op move after learning one. Every move gives audible and visible confirmation at both steps. No move can be started in a state where it will silently fail.

### 3. Two tiers of co-op actions: free and authored
- **Principle.** Give players a small set of *free* two-person moves usable almost anywhere (boost, ladder, throw), plus *authored* moves at placed spots (rope, hang, shoulder-stand). Free moves create improvisation. Authored moves create set pieces.
- **Evidence.** This two-tier split is the original's core structure. [VERIFIED - 05 §1] Critics who disliked the mode said the moves felt like fixed "elaborate keys". [VERIFIED - 12 A9]
- **Test.** At least one free move has two or more valid uses in every zone. Every authored spot also has a non-authored alternative, or a clear reason why only the authored move works.

### 4. Every co-op move has more than one use
- **Principle.** A move that only opens a path becomes a key. A move that also attacks, scouts, saves or escapes becomes a tool.
- **Evidence.**
  - The throw also knocks out a guard at the landing spot, and guides built tactics around this.
  - The hanging agent can hack, shoot, hide and neck-snap.
  - [VERIFIED - 05 §2.2, §3.2]
  - These multi-use moves are exactly what players remember. [VERIFIED - 11 §1]
- **Test.** For each co-op move used in the level, list at least two distinct purposes it serves somewhere in the mission.

### 5. Every role split gives both players a real job
- **Principle.** Whenever one player acts (hacks, searches, interrogates, carries), the other has a meaningful parallel task. Neither player should be idle for more than about 60 seconds.
- **Evidence.**
  - The original scripts a predictable interrupter during slow actions: the light-fixer during the archive search, escorts during an interrogation, a bodyguard at the locker. [SINGLE SOURCE - PRIMA routes; pattern 08 P11]
  - Idle-partner play is a recognised anti-pattern. [VERIFIED - 12 B12]
- **Test.** Walk the critical path second by second for each player. Flag any stretch of 60 seconds or more where one player only waits.

### 6. Split, then sync: separation needs a rendezvous
- **Principle.** Split the pair often, so each has a personal challenge. Every split must end at a defined merge point or a synchronised action, and must offer a communication aid.
- **Evidence.**
  - Splits that end in syncs are the mode's signature: two scanners with two captives, laser-linked bombs, a train splitting the platform. [VERIFIED - 08 P1, P10]
  - Players who lost each other in open spaces complained. [VERIFIED - 12 A2]
- **Test.** Every point where players can separate by more than one room has (a) a named merge point and (b) a way for each player to know where the other is.

### 7. Two-body requirements must be grounded in the world
- **Principle.** When the level demands two people at once, the reason should exist in the fiction and in real security practice: dual control, two-person integrity, paired devices, a single safe dose.
- **Evidence.**
  - The original's paired scanners, paired bomb wires, the cryo email ("two people are required") and the single antidote dose make the requirement feel authored by the world. [VERIFIED - 04 files]
  - Real facilities use two-person rules and dual control. [VERIFIED - real-world notes §2.3]
- **Test.** For each two-person gate, write one sentence explaining why the real facility built it that way. If you cannot, redesign it.

### 8. Asymmetry by position, information and kit, not only by class
- **Principle.** Make the two players different through where they stand, what they can see and what they carry, rather than through hard class locks alone.
- **Evidence.**
  - Console co-op used identical agents with complementary kits: precision shooter versus grenadier.
  - It also used asymmetric information: the crane operator cannot see and the spotter cannot drive.
  - [VERIFIED - 06; 08 P8]
  - The handheld version used hard class permissions instead (computers versus panels). [VERIFIED - 04 ngage]
  - Research shows asymmetric roles raise connectedness. [SINGLE SOURCE - CHI 2019]
- **Test.** The mission contains at least one information-asymmetry beat (one sees, one acts) and at least one kit-complement beat. Any hard class lock is paired with simultaneous work for the other role.

### 9. Sync tolerance and fallback
- **Principle.** Synchronised actions must be forgiving and give clear per-input feedback. When players cannot talk, the timing window relaxes, and failure escalates rather than kills.
- **Evidence.**
  - The original relaxed sync timing for players without headsets. [VERIFIED - 05 §5]
  - The lethal, precise cryo mixing and the PC input failures were the biggest frustrations. [VERIFIED - 12 A5, A6]
- **Test.** Every sync action has a defined tolerance window, a visible "ready" state for each player, a non-lethal failure, and works on every input device.

---

## B. Stealth fairness and detection

### 10. Every encounter has a zero-failure path for two
- **Principle.** Each encounter offers at least one route where neither player is ever detected. It must be verified *for two bodies*, including moments when both must cross the same space.
- **Evidence.**
  - Randy Smith's core rule. [SINGLE SOURCE - literature]
  - Every original mission has documented 100%, no-kill, no-alarm runs. [VERIFIED - videos]
- **Test.** The designer can draw the zero-failure path for both players through every encounter, with timings. A playtest pair finds it without being told.

### 11. Detection is readable before commitment
- **Principle.** Each player can predict, before acting, whether an action will expose them, and can read the partner's exposure too.
- **Evidence.**
  - The original gave each player light and noise meters, and partner health on Xbox. [VERIFIED - 10 §1-2]
  - Weak spots: the meter overrides the visuals, and no partner-exposure indicator exists. [SINGLE SOURCE - PRIMA; gap]
  - The literature agrees: Mark of the Ninja, Thief. [VERIFIED]
- **Test.** For every light and noise source, the visual and audio presentation matches the system value. Each player can tell from their own screen whether the partner is currently visible or loud.

### 12. Graduated alertness, not instant failure
- **Principle.** A glimpse starts a search. An alarm escalates the situation (armour, lockdowns, more patrols) rather than ending the mission. Hard-fail rules are rare, explicit and justified by the fiction.
- **Evidence.**
  - The original's escalation model lets two imperfect players continue. [VERIFIED - 10 §4]
  - Stacked instant-fail rules and hidden timers were criticised. [12 A14-A15]
  - The literature agrees. [VERIFIED - 12 B1]
- **Test.** The level documents its alert states and each escalation step. At most one hard-fail rule per mission, shown in the briefing and on screen.

### 13. Guards perceive evidence; they never cheat
- **Principle.** Guards act only on what they perceive: bodies, open doors, dead lights, a missing colleague, noise. A guard who saw player A does not automatically know where player B is.
- **Evidence.**
  - The original requires bodies to be actually seen, and guards notice doors, lights and missing colleagues. [VERIFIED - 10 §3]
  - The literature: Thief, Halo 2. [VERIFIED]
  - How the original handled two intruders is undocumented (R-06).
- **Test.** Every alert in a playtest can be traced to a specific perception event. Two-intruder scenarios are tested explicitly.

### 14. Guards talk so players can read them
- **Principle.** Guard barks and paired chatter report AI state ("did you hear that?") and team behaviour. Music never drowns them out.
- **Evidence.**
  - The original expanded barks into stress stages and impromptu search teams. [VERIFIED - 15 §2.2]
  - Players read rooms by listening. [VERIFIED]
  - Alert music masking a conversation was criticised. [SINGLE SOURCE]
  - F.E.A.R.'s paired dialogue makes coordination legible. [SINGLE SOURCE]
- **Test.** Each AI state change has a voiced line. Paired guards exchange lines. The audio mix ducks music under barks within earshot.

### 15. Players can change the light and the noise
- **Principle.** Light and noise are terrain the players can reshape: switches, shootable bulbs, jammable lamps, machines that hum or fall silent. Changing them has a visible consequence, because guards notice.
- **Evidence.**
  - Killing light is the core co-op verb on every route. [VERIFIED - 15 §3.2]
  - Guards come to fix lights, and this was used as a lure. [SINGLE SOURCE - PRIMA]
- **Test.** Every lit area on the critical path has at least one player-changeable light. Every change produces a guard reaction that is itself usable.

### 16. Real voices and a callout fallback
- **Principle.** If players can talk, consider putting their voices into the simulation: a small, tunable, switchable radius audible to guards. Always provide automatic callouts and pings for players who can't or won't talk.
- **Evidence.**
  - The original's voice-detection feature was praised. [VERIFIED - 03 §6]
  - Its automatic voice lines kept co-op playable without headsets. [VERIFIED]
  - Portal 2 found that pointing out "here" is the hard communication problem. [SINGLE SOURCE]
- **Test.** A pair with no voice chat can complete the mission using pings and callouts only. Voice-in-simulation, if used, has a visible radius indicator and can be turned off.

---

## C. Space and architecture

### 17. Every room has a real purpose and a daily life
- **Principle.** Each room has a real-world function, users and a schedule. Puzzles are expressed through that function.
- **Evidence.**
  - The original's strongest spaces are functional: archive, server room, lab fridge, crane bay, ticket hall, washroom. [VERIFIED - 04 files]
  - Real facilities have known room programmes. [VERIFIED - real-world notes §11]
  - "Rooms with no purpose" is a common failure. [12 C1]
- **Test.** Every room on the plan is labelled with its function, who uses it and when. No room exists only for gameplay.

### 18. Security follows real logic and is layered
- **Principle.** Security tier and devices come from the facility's real risk profile. They are layered from perimeter to asset (deter, detect, delay, respond), and every exotic device or weak side is justified in the fiction.
- **Evidence.**
  - Real guidance: NPSA zones, ISC risk factors, balanced delay. [VERIFIED/SINGLE SOURCE - real-world notes §1]
  - The original justified a laser grid with an email about its breaker. [SINGLE SOURCE - FAN data]
  - The anti-patterns list illogical security. [12 C3, C11]
- **Test.** A security consultant can explain every device and every gap. Any weak side used by the players has an in-fiction cause.

### 19. Building codes are allies
- **Principle.** Use real egress and dimension rules as design constraints:
  - exits open from inside (easy out, hard in);
  - fire alarms release electric locks;
  - two separated stair cores;
  - limited dead ends;
  - real door, stair and corridor sizes.
- **Evidence.** UK Approved Documents B/K, OSHA, ADA. [VERIFIED - real-world notes §5-6] The UN mission's exit doors "open only from inside" became an objective. [VERIFIED]
- **Test.** The layout passes a basic egress check: exits, stairs, dead ends and travel distances. All dimensions sit within the scale sheet. Fire doors are one-way shortcuts.

### 20. Vertical routes are earned and believable
- **Principle.** The pair's private network runs through real service spaces: ceiling voids, risers, plant floors, roofs, catwalks, loading docks. Reaching them takes a co-op move. Person-sized ducts everywhere are banned.
- **Evidence.**
  - Ceiling routes and reach-from-above are among the mode's best beats. [VERIFIED - 08 P4-P5]
  - The vent myth is a known anti-pattern. [VERIFIED - 12 C5]
- **Test.** Every crawlable or hidden route corresponds to a real building service of plausible size. At least one vertical route per mission needs a two-person move.

### 21. The solution is visible from the problem
- **Principle.** When a solution sits above, below or far from its problem, the problem space shows a tell: a cable run, a lit control box, a sound when the state changes, or a sightline to the vent.
- **Evidence.** Most documented stuck points were solutions out of sight of their problem: Panama's grille, the PS2 vent, the washroom ceiling, the fans. [VERIFIED - 12 A3-A4]
- **Test.** For each gated obstacle, a playtester standing at the obstacle can identify, without hints, where the solution lies within 2 minutes.

### 22. Machines show their state
- **Principle.** Any machine whose state changes routes must show that state in sight and sound, and its control must be visibly linked to it.
- **Evidence.** The Nuclear Plant fan confusion, while the "stop fans" terminal existed. [SINGLE SOURCE - forum + FAN data]
- **Test.** Each state-changing device has distinct on and off visuals and audio. A player can name the current state from a distance.

### 23. Scouting spots are built for two
- **Principle.** Before major encounters, provide safe overlooks with sightlines for both players at once, so they can plan together.
- **Evidence.**
  - The missile-storage overlook and the PS2 lab walkway. [08 P16]
  - Smith's scouting principle; Payday 2's vantage start. [SINGLE SOURCE each]
- **Test.** Each major encounter has an overlook where both players can see the key elements at the same time without exposure.

### 24. Landmarks are seen early and entered later
- **Principle.** Show the climax space or a major landmark early, ideally from a vantage point, and pay it off later.
- **Evidence.**
  - Foreshadow-and-return in Chemical Bunker [SINGLE SOURCE].
  - The rail terminal's great hall reached by ascent [SINGLE SOURCE].
  - The "weenies" principle. [VERIFIED - literature]
- **Test.** The mission's climax space is visible at least once before players reach it.

---

## D. Objectives and pacing

### 25. Objectives chain through the fiction and move the pair through the building
- **Principle.** Each objective's completion reveals the next objective's location or need: a recipe, an investigation, a twist. Objectives send players into new zones.
- **Evidence.**
  - Recipe chains (Chemical Bunker), twist chains (Seoul), event chains (Train Station), extensions (Panama). [VERIFIED - 07 §3]
- **Test.** For each objective, the designer can state how players learn where to go next, and that source exists in the world.

### 26. One twist per mission, around the middle
- **Principle.** Rewrite the goal once, around 40-60% of the way through, using in-world intel. Both players should learn it together.
- **Evidence.** Twists at roughly 1/3 to 2/3 in Panama, Seoul, Train Station and UN HQ. [VERIFIED - 09 §2.2]
- **Test.** The mission has exactly one major objective rewrite. It is delivered diegetically, and both players are present for it.

### 27. Rhythm of small beats, set pieces and rests
- **Principle.**
  - A small co-op beat every 2-4 minutes.
  - A major co-op set piece every 6-10 minutes.
  - A rest after each set piece.
  - Signature set pieces are never repeated within a mission.
- **Evidence.**
  - The original's routes. [SINGLE SOURCE - PRIMA, 09 §1]
  - The Left 4 Dead build/peak/relax cycle and Smith's tension/relief rhythm. [SINGLE SOURCE each]
- **Test.** A beat chart of the critical path meets these intervals. No signature set piece type appears twice.

### 28. Optional intel rewards curiosity but never secretly guards a hard fail
- **Principle.** Optional objectives and intel enrich the mission. Anything that prevents an unwinnable state must be signalled by at least two cues, or the resulting state must be recoverable.
- **Evidence.** The Seoul boat trap. [VERIFIED - 12 A7]
- **Test.** List every hard-fail condition and every cue that warns of it. Each needs two or more cues, or a recovery path.

### 29. Failure becomes a rescue, then a reload
- **Principle.** A downed partner creates a time-limited rescue task for the other player. Reloads come from encounter-level checkpoints, not mission starts.
- **Evidence.**
  - The original's 30-second revive was praised.
  - Full-mission restarts were the top structural complaint. [VERIFIED - 12 A1]
  - Mark of the Ninja's cheap-failure rule. [SINGLE SOURCE]
  - Players' favourite failure stories are rescues: one agent drops in front of a guard, the other clears the room and revives him. [VERIFIED - gap pass, Reddit]
  - The original had only manual saves that waited for the partner, with no automatic checkpoints. [VERIFIED - game files]
- **Test.** Every death or down has a rescue window. Checkpoints exist at least every major encounter. A full restart never costs more than about 10 minutes of play.

### 30. Extraction is designed, not backtracked
- **Principle.** The exit either reuses the entry by a new route, or is a short spectacle exit. It is never a dull reverse walk.
- **Evidence.**
  - Panama's loop to the same window by a different staircase [SINGLE SOURCE].
  - The train-roof finale [SINGLE SOURCE].
  - Seoul's carry-out escort. [VERIFIED]
  - Every original mission named a concrete extraction place or ended on its climax (a truck, a boat at a dock, a jump onto a moving train, a lab side door, the defusal). [VERIFIED - game files]
- **Test.** The extraction route differs from the infiltration route for at least half its length, or is under 2 minutes long.

---

## E. Wow moments, atmosphere and audio (expanded at the user's request)

### 31. Every mission has three planned wow moments: body, sync and story
- **Principle.** Plan at least one spectacular two-body move, one synchronised or near-miss moment, and one in-world reveal or landmark per mission. Each must pass the spectator, agency, mutual-need, readability and retell tests.
- **Evidence.** These three families cover every moment players and critics named. [VERIFIED - 11 §1-3]
- **Test.** The mission plan names its three moments and records a pass for each of the five tests.

### 32. Music reports state and arrives late
- **Principle.** Silence and ambience are the default. Layered music enters on placed triggers and rises with AI state. It falls back promptly when the threat ends, and it never leaves players unsure whether they were seen.
- **Evidence.**
  - The adaptive layered score was praised. [VERIFIED - 15 §1.2]
  - Music held back until triggered. [SINGLE SOURCE - sound diary]
  - Lingering or ambiguous cues were criticised. [SINGLE SOURCE]
  - Co-op reused solo stem sets on a shared common set with states from idle to fight, and one map ran on the common set alone. [VERIFIED - game files, 15 §7]
- **Test.** The music state table maps every AI state to a layer set, with defined attack and decay times. Playtesters can tell from music alone whether they are hunted.

### 33. Ambient sound is level design
- **Principle.** Author noise sources (machines, water, weather, crowds, conflict) as deliberate sneak windows. Author quiet zones as deliberate danger. Tell players when loud ambient threat is not aimed at them.
- **Evidence.**
  - The sound-masking system and the fountain placed to mask footsteps. [VERIFIED / SINGLE SOURCE - 15 §2.1]
  - Generators and storms. [VERIFIED]
  - Seoul's "gunfire not aimed at you" note. [SINGLE SOURCE]
- **Test.** The soundscape map marks loud and quiet zones and their gameplay purpose. Each loud zone supports at least one faster or louder route.

### 34. Partners are identifiable in the dark and at a distance
- **Principle.** Each player has a distinct light, colour or silhouette signature that reads in darkness, in vision modes and on split-screen. It should not reveal them to enemies in the fiction.
- **Evidence.** Blue versus red goggle lamps. [VERIFIED - 15 §3.4]
- **Test.** In the darkest area of the level, each player can identify the partner and tell the two characters apart at 20 m.

---

## F. Added after the gap-closing pass

### 35. The kit states the rules
- **Principle.** When a mission has a special rule (no killing, no alarms, no weapons), the loadout makes that rule obvious before the first step. Take away what the rule forbids, and give more of what it rewards.
- **Evidence.**
  - The no-kill finale gave both agents an identical kit: the largest non-lethal stock in the campaign (three of each tool) and no spare magazines. [VERIFIED - game files + wiki, 06 §2]
  - Across the campaign, ammunition tracked tone: light kits on stealth-restricted missions, heavy kits on combat-heavy ones. [VERIFIED - 06 §2]
- **Test.** For each special rule, someone looking only at the loadout screen can guess the rule.

### 36. Guidance has a voice, and losing it is felt
- **Principle.** The guidance channel (handler, radio, partner callouts) is part of the mission's atmosphere, not just information. Budget voiced guidance for every mission. Text-only guidance is a degraded fallback, not an equal.
- **Evidence.**
  - Both downloadable missions shipped with the controller's lines as text only. Players noticed and missed his voice. [VERIFIED - Steam threads + video comments]
  - Voiced briefings and banter are praised elsewhere. [VERIFIED - 15 §2]
- **Test.** Every mission's guidance script is voiced. A playtester asked to describe the mission's mood mentions the guidance voice or radio.
