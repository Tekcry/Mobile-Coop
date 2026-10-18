# DESIGN BIBLE - Two-Player Co-op Stealth

The master reference for every design decision on an original third-person co-op stealth game.

**Status:** v1.0, derived from the research in files 01-15. Nothing in this document names or reproduces any existing game's characters, places, missions, gadgets or layouts. Evidence pointers such as "(R: 13 #6)" refer to the numbered principle or section in the research files. They are there for traceability only, and you do not need to read them to use the bible.

**How to use this bible**
- **Read** sections 1-4 before designing anything.
- **Apply** sections 5-11 as rules while designing a mission.
- **Answer** section 12 (the open decisions) with the game director before mission production begins.
- **Templates and process:** use MISSION_TEMPLATE.md, LEVEL_DESIGN_PROCESS.md, LEVEL_REVIEW_CHECKLIST.md and PROMPT_LIBRARY.md.

---

## 1. Co-op stealth philosophy

**Two people slipping through a place built to stop one.**

The fantasy is not "two stealth characters in the same level". It is a partnership that can do what a lone intruder cannot:
- climb where one cannot reach;
- watch while the other works;
- open what needs two hands at once;
- pull each other out of trouble.

Every space, device and objective is designed around that partnership.

Three convictions follow:
1. **Interdependence, not just co-presence.** The best moments are those where each player's success literally depends on the other: holding the line, covering the doorway, counting down together. (R: 13 #1, #5, #6)
2. **Readable danger, recoverable mistakes.** Two imperfect players will make more mistakes than one. Detection must be readable before commitment, and mistakes should escalate the situation rather than end it. (R: 13 #10-#12, #29)
3. **Believable places.** Real facilities, with real reasons for every room, door and camera, give players a mental map. They make every security weakness feel discovered rather than placed. (R: 13 #17-#20)

---

## 2. Pillars

| # | Pillar | Means | Never |
|---|---|---|---|
| P1 | **Two bodies, one plan** | Moves, gates and objectives that need both players; players plan together before acting | A puzzle one player can solve alone, presented as co-op |
| P2 | **Fair shadows** | Every exposure and noise is predictable; guards act only on what they perceive; alerts escalate in readable steps | A hidden rule, a hidden timer, or an alert nobody can explain |
| P3 | **Real places, real security** | Each mission is a real facility type operating on a real day; security is layered and justified | A room without purpose; a device without reason; a vent maze |
| P4 | **Moments worth retelling** | Each mission has planned spectacular two-person moments, a synchronised climax and an in-world reveal | A mission whose best moment is a cutscene |
| P5 | **Sound is space** | Light and sound are terrain players read and reshape; music reports danger without lying | Music that leaves players unsure whether they were seen |

---

## 3. The co-op verb set (generic names used across all documents)

These are placeholders until the game's own naming is set.

### 3.1 Free two-person moves (usable almost anywhere with room)
- **Leg-Up.** One player braces and lifts the partner to a ledge, window or wall top, or vaults them over a barrier.
- **Ledge Relay.** The lifted player hangs and lets the partner climb past, so both arrive together.
- **Partner Launch** (only if the athletic tone allows, see D-07). One player braces low and propels the partner over a low barrier or short gap. Anyone at the landing point is knocked down.

### 3.2 Authored two-person moves (at placed anchors)
- **Belay Line.** One player anchors a line while the other descends or climbs it. The anchor can swing them sideways.
- **Drop Line.** The anchor lowers the partner head-down through an opening to reach, operate, grab or take down. The suspended player can pull up to hide.
- **Stack.** One player stands on the other's shoulders to reach a high device.

### 3.3 Team interactions
- **Hand-Off.** Pass an item to the partner.
- **Feed Share.** Watch the partner's deployed camera feed.
- **Pick-Up.** Revive a downed partner within a time window.
- **Context Callouts and pings.** Automatic "ready / done / down / up / down / left / right / stop" calls, and world pings.

### 3.4 Synchronised and asymmetric actions
- **Two-Key Action.** Two devices actuated within a tolerance window.
- **Living Key.** An authorised person escorted to a biometric gate.
- **Double Drop.** Two linked guards neutralised at once.
- **Spotter-Operator.** One player controls a machine without line of sight; the other sees the target and guides.

### 3.5 Shared tools (setting-dependent forms; see D-01)
- **Hold-Down Device.** Suppresses one electronic or optical device only while held still and aimed, on a draining charge.
- **Throw-Cam.**
- **Stun Round and Blunt Round.**
- **Flash, Screen and Sleep charges.**
- **Sensor Modes:** low-light, heat, emitter.
- **Under-Door Scope.**
- **Pick and Force.**

### 3.6 The handshake rule (applies to every move)
1. One player **initiates**. They take a pose, and a callout plays.
2. The partner sees and hears a "ready" cue and **completes** the move.
3. Both steps are confirmed by sound and UI.
4. Invalid attempts fail gracefully, with a refusal animation and feedback, and no penalty.

Teach the handshake first, explicitly. (R: 13 #2)

### 3.7 The two-tier rule
- **Free moves:** a mission must offer free moves as improvisation tools.
- **Authored moves:** the mission uses authored moves for set pieces.
- **Alternatives:** every authored spot needs either an alternative or a fiction-backed reason why only that move works. (R: 13 #3)

### 3.8 The multi-use rule
Every move used in a mission serves at least two purposes somewhere in it: traverse, attack, scout, rescue or escape. (R: 13 #4)

---

## 4. Principles (restated)

These condense the 36 research principles. Each line is a rule.

### A. Partnership
1. Design every zone for two from the first sketch. Removing a player must make it impossible or clearly worse.
2. Use one consistent handshake for every two-person action.
3. Offer both free moves (improvisation) and authored moves (set pieces).
4. Give every move more than one use.
5. When one player acts, the other has a real job. There is no idle stretch over about 60 seconds.
6. Split often, but every split ends at a named merge point or a synchronised action, and comes with a way to know where the partner is.
7. Every two-person requirement has a real-world reason: dual control, two-person integrity, paired devices, a single safe dose.
8. Create difference through position, information and kit, not only through class locks.
9. Synchronised actions are forgiving, give feedback for each input, fail non-lethally and work on every input device.

### B. Fair stealth
10. Every encounter has a verified zero-failure path *for two bodies*.
11. Exposure and noise are readable before commitment, including the partner's.
12. Alertness is graduated, and alerts escalate rather than end the mission. Hard-fail rules are rare, shown up front and justified.
13. Guards act only on what they perceive. Seeing one intruder does not reveal the other.
14. Guards talk, so players can read their state. Music never buries their lines.
15. Players can reshape light and noise, and guards notice the change, which makes it usable as a lure.
16. Players can always communicate. Pings and callouts are always available. If voice is part of the simulation, it is optional, visible and tunable.

### C. Space
17. Every room has a real purpose, users and a schedule. Puzzles express that purpose.
18. Security is layered and follows the facility's real risk. Every exotic device and every weak side is explained in the fiction.
19. Building codes are allies: exits open from inside, alarms release locks, two stair cores, short dead ends, real dimensions.
20. Hidden routes run through real building services and are reached by co-op moves. Person-sized ducts everywhere are not allowed.
21. The solution is visible from the problem.
22. Machines show their state in sight and sound.
23. Overlooks before major encounters must fit and serve two players.
24. Show the climax space or a major landmark early, and pay it off later.

### D. Objectives and pacing
25. Objectives chain through the fiction, and each one moves the pair into new space.
26. One twist per mission, around the middle, delivered in-world to both players.
27. Rhythm: a small co-op beat every 2-4 minutes, a major set piece every 6-10 minutes, rest after each set piece, and no repeated signature set piece.
28. Optional intel rewards curiosity, but never secretly guards a hard fail.
29. A down becomes a rescue before it becomes a reload. Use encounter-level checkpoints.
30. Extraction is designed, not a backtrack.

### E. Moments and atmosphere
31. Three planned wow moments per mission: body, sync and story.
32. Music reports state, arrives late and leaves promptly.
33. Ambient sound is level design: loud zones are sneak windows, quiet zones are danger. Tell players when loud threat is not aimed at them.
34. Partners are identifiable in the dark and at distance.

### F. Kit and guidance
35. The kit states the rules. When a mission has a special rule (no harm, no alarms, no weapons), the loadout makes it obvious before the first step: remove what the rule forbids and give more of what it rewards.
36. Guidance has a voice. The handler or radio channel is part of the mission's atmosphere. Budget voiced guidance for every mission; text-only guidance is a degraded fallback.

---

## 5. Detection fairness rules

1. **Exposure equals what the eye sees.** The exposure value and the rendered lighting must agree. Any discrepancy is a bug.
2. **Noise is shown against the ambient floor.** Players see their own noise compared with the local ambient level. Masking sources are visible or audible in the world.
3. **Partner awareness.** Each player can tell, from their own screen, whether the partner is exposed or loud. Use a subtle indicator on the partner beacon or the HUD.
4. **Alert states (minimum set).** Each state has a distinct bark, animation and music layer.

| State | Meaning |
|---|---|
| Routine | Normal duties |
| Curious | A glimpse or noise: a short look toward it |
| Investigating | Moves to the source with a light, and calls a colleague |
| Searching | A team searches the last known area |
| Engaged | Combat or pursuit |
| Cooling down | Returns to routine, more wary |

5. **Escalation steps (alert tiers).** Each tier is announced in-world (radio chatter, PA, lights) and is reversible only by time or a specific player action, never silently.
   - Example: Tier 1 investigating → Tier 2 heightened (more patrols, protective gear) → Tier 3 lockdown (shutters, response team).
   - The final rule is set by D-02.
6. **Realistic alarm chain.** A single sensor trip is ambiguous: guards treat it as a possible fault and check it. A second, adjacent trip, or video confirmation, raises a confirmed intrusion. Panic or duress devices skip verification.
7. **Bodies and absences.** Bodies are found only by perception (a guard or an active camera). A guard who misses a tour checkpoint triggers a supervisor check after a defined window.
8. **Two intruders.** Perception and alert data are tracked per intruder. A guard's search targets the last known position of the player they perceived.
9. **No hidden timers.** Every timer is shown in-world or on the HUD.
10. **Hard-fail rule budget.** At most one per mission. It is stated in the briefing, reinforced in-world (signage, dialogue) and shown on the HUD when it applies.
11. **Glimpse grace.** Detection takes a readable build-up time, scaled by distance and light, so a partner can react (cover, distract, pull away).
12. **Sync tolerance.** Two-Key Actions accept inputs within a defined window. The window is wider when players have no voice channel. Failure triggers an escalation, never instant death.

---

## 6. Realism rules for architecture and security

### 6.1 Facility logic
1. **Pick a real facility type** and describe how it operates on the mission's day and time: shifts, deliveries, cleaning, maintenance, events.
2. **Every room has a function, users and a schedule.** If a room exists only for gameplay, give it a function or cut it.
3. **Circulation is real.** Every floor has at least two separated stair cores. Dead ends stay short (about 5 m before an alternative). Travel to an exit fits the building type (about 18-45 m in offices). Lifts sit in cores with risers beside them.
4. **Service spaces are the hidden network.** Use ceiling voids, raised floors, risers, plant floors, roofs, catwalks, loading docks and service corridors. Real air ducts are mostly too small for a person; only large trunk ducts near plant rooms may be crawlable.
5. **Scale sheet.** All geometry follows it.

| Element | Typical value |
|---|---|
| Door clear width | ~0.8-0.9 m (wider for service doors) |
| Headroom | ≥ 2.0 m |
| Stair rise | 150-180 mm |
| Stair going | 250-300 mm |
| Escape routes | 0.75-1.05 m+ by occupancy |
| Accessible corridors | ≥ 0.9 m, with passing places |

6. **Signage is realistic.** Public buildings sign public spaces. Secure facilities do not signpost critical rooms. Navigation comes from building logic, intel and landmarks.

### 6.2 Security logic
1. **Tier the facility** by criticality, symbolism, population, size and threat. Choose a matching baseline of measures.
2. **Layer outside-in:** beyond the perimeter, the perimeter, the site, the building, the asset. Each layer deters, detects, delays and supports response.
3. **Balanced delay.** No absurd weak side. Every weakness players exploit has an in-fiction cause (renovation, budget cut, contractor shortcut, staff habit), and that cause is a story beat.
4. **Devices behave like real ones:**
   - door contacts on doors;
   - motion and dual-technology sensors in corners about 2.3 m up, armed when the space is empty;
   - glass-break sensors near glazing;
   - vibration sensors on cases and safes;
   - infrared beams mostly outdoors;
   - cameras with real detect / recognise / identify ranges, blinded by glare, back-lighting and deep shadow;
   - supervised wiring, so a cut raises a fault, not silence.
5. **Access control is graded:** keys or cards for general areas, two factors for sensitive rooms, mantraps or dual control for the asset.
6. **Two-person gates are justified.** Use real two-person rules: dual control, paired credentials, two-key operation.
7. **Exits open from inside without a key. Fire alarms release electric locks.** These are realistic, and also intentional tools with consequences.
8. **Guards run tours** with checkpoints and time windows. A control room watches cameras and directs responders. Staff challenge strangers.
9. **Response takes time:** operator call, then guard or keyholder check, then outside response. Each delay is a gameplay window.
10. **Exotic or lethal automated defences** appear only where the fiction supports them (see D-05).

---

## 7. Pacing targets

| Measure | Target |
|---|---|
| Mission length (average pair) | 30-60 minutes |
| Primary objectives | 3-6 |
| Optional objectives | 1-3, discoverable in play |
| Small co-op beat (hold-and-pass, leg-up, double drop) | Every 2-4 minutes |
| Major co-op set piece | Every 6-10 minutes |
| Signature set pieces | 1-2 per mission, never repeated within a mission |
| Objective twist | One, at 40-60% |
| Rest beat | After each major set piece (30-90 s of low threat, room to regroup and talk) |
| Encounter checkpoint | At least before every major set piece; never lose more than ~10 minutes |
| Extraction | Under 2 minutes, or a deliberately different route for at least half its length |
| Partner separation | Always ends at a named merge point; never more than ~3 minutes without a merge or a sync |

**Mission shape:**
1. Soft co-op opening (re-teach a verb safely).
2. Escalating density.
3. First big sync.
4. Twist.
5. Rest.
6. Build.
7. Signature climax.
8. Designed exit.

---

## 8. Objective rules

1. **Tiers.** Primary (required), secondary (optional, scored), opportunity (optional, discovered in play).
2. **Chaining.** Each completion reveals the next destination or need through in-world intel: documents, conversations, devices, people. Use recipe chains, investigations, event-gated chains or a mid-mission extension.
3. **Dependency.** Every mission includes at least one of each:
   - a *two-body* objective (Two-Key Action, Living Key, Spotter-Operator);
   - a *protect-while-act* objective;
   - a *reach* objective (needs a two-person move).
4. **Role assignment through the fiction.** Scarcity items (one dose, one badge, one suit) can assign roles. When they do, the other role gets parallel work.
5. **Failure.**
   - Hard fail only for the mission's single declared rule, or for the loss of a protected person who is clearly marked.
   - Optional failures cost score only.
   - Anything that prevents an unwinnable state has two or more cues, or the resulting state is recoverable (for example, a chase rather than a fail).
6. **Scripted violence.** If the violence stance (D-04) rewards non-lethal play, no objective forces a kill. If one does, it is exempt from scoring and the exemption is stated.
7. **Discoverability.** Every opportunity objective has an in-world source the players can find on the critical path or one step off it.

---

## 9. Co-op beat density and variety

**Per mission, include at least:**

| Beat type | Minimum count |
|---|---|
| Hold-and-pass gates (device suppression or cover relay) | 3 |
| Free-move traversals (leg-up and ledge relay, or partner launch) | 3 |
| Authored-move set pieces (belay, drop line or stack) | 1 |
| Split-and-sync sequence ending in a Two-Key Action | 1 |
| Protect-while-act beat | 1 |
| Information-asymmetry beat (spotter / feed share / overlook planning) | 1 |
| Double Drop opportunity | 1 |
| Parallel-route section with a defined merge | 1 |

**Variety rule.** Across a campaign, no two missions share the same signature set piece type.

---

## 10. Wow-moment requirements

**Every mission plans at least three:**

| Family | Kind |
|---|---|
| Body | A spectacular two-person move or dramatic entry or exit that solves a real problem |
| Sync | A countdown, near-miss or simultaneous act where each protects or completes the other |
| Story | An in-world reveal, twist or landmark payoff |

**Each must pass five tests:**
1. **Spectator.** Someone watching understands it.
2. **Agency.** The players trigger it and it can fail; it is not a cutscene.
3. **Mutual need.** Both players have a job.
4. **Readability.** The danger is readable before commitment.
5. **Retell.** It can be described in one sentence afterwards.

**Amplifiers.** These give extra value; use at least one per mission:
- a move that doubles as an attack;
- hidden information that only one player can see;
- a change of altitude with a view;
- a real-world device used for its real purpose in an unexpected way.

---

## 11. Audio and atmosphere rules

1. **Silence is the default.** Ambience and guard voices carry exploration. Music arrives on placed triggers or on rising danger.
2. **State-driven score.** Music is layered and maps to the alert states and tiers. Each layer stands alone musically. Decay after danger ends is short and defined, and the music never implies detection that did not happen.
3. **Duck under barks.** Within earshot of guard dialogue, music and effects duck so the dialogue stays readable.
4. **Ambient floor as terrain.** Machines, water, weather, crowds and traffic raise the ambient floor and create sneak windows. Quiet zones such as switched-off machinery, empty tiled halls or night-time offices create danger. Mark these on a soundscape map for every mission.
5. **Coupled weather.** If weather exists, one event should have several readable effects. Examples: rain moves patrols to cover, wets surfaces into reflective (exposing) floors, and raises ambient noise; thunder covers noise while lightning briefly exposes.
6. **Benign threat signposting.** When the soundscape is loud with threat not aimed at the players (an event, a crowd, a distant conflict), say so in-world.
7. **Barks are UI.** Guards voice every state change, talk in pairs and comment on evidence (a dead light, an open door, a missing colleague).
8. **Light is readable and changeable.** Lighting is staged like a theatre, with clear pools and clear dark. Every lit area on the critical path offers a way to darken it, and every darkening draws a reaction.
9. **Partner beacons.** Each player has a distinct colour or shape signature readable in darkness, in vision modes and on split-screen. It does not betray them to enemies in the fiction.
10. **Low-spec rule.** If a platform cannot render readable lighting, change the lighting design (add or remove lights) rather than lose readability.
11. **Voiced guidance.** Handler and radio lines are recorded for every mission, including add-on missions. Players notice and miss a silent guidance channel even when the text is identical.

---

## 12. Decisions the game must make

Each decision lists its options and trade-offs. **The chosen option for every decision is recorded in OPEN_QUESTIONS.md (decided 2026-10-18)** and summarised here:

- **D-01:** modern day.
- **D-02:** escalating tiers.
- **D-03:** 30 s revive, two per mission, with encounter checkpoints.
- **D-04:** scored.
- **D-05:** lethal defences only at military or private compounds.
- **D-06:** proximity voice as an opt-in modifier.
- **D-07:** heightened athletics.
- **D-08:** perception, alert tolerance and resources scale.
- **D-09:** strictly two humans.
- **D-10:** online, split-screen and LAN.
- **D-11:** identical characters with complementary kits.
- **D-12:** beacon and world pings, with no partner marker.
- **D-13:** standalone co-op story.
- **D-14:** shoulder camera with strict peek.

Further decisions:
- **D-15:** both players must extract.
- **D-16:** guards know only what they saw.
- **D-17:** partner voice is always clear.
- **D-18:** friendly fire is a host option, on by default.
- **D-19:** no remote hacking; all hacking is hands-on.
- **D-20:** some solutions are randomised per run.
- **D-21:** lit windows are systemic.
- **D-22:** key characters are protected until their role is done.
- **D-23:** a perfect rating needs a clean run plus all primary objectives.
- **D-24:** any partner can join a saved mission.
- **D-25:** two-person questioning is non-violent.

### D-01 Setting and era
| Option | Upside | Downside |
|---|---|---|
| Modern day | Real facilities and security are easy to research; gadgets are plausible | Crowded genre; real-world sensitivities |
| Near future | Freedom for tools such as a Hold-Down Device | Realism anchor weakens |
| Historical | Fresh; sound and light play shine | Few electronic devices, so the Hold-Down Device and Sensor Modes need reinvention |
| Stylised / fantasy | Total freedom; the co-op athletics fit | Loses the "real places" pillar unless it is grounded deliberately |

### D-02 Alarm rule
| Option | Trade-off |
|---|---|
| Escalating tiers with no abort | Forgiving for two imperfect players; tension can sag if the escalation is weak |
| Strict N-alarm fail | Tense; frustrating with weaker partners; best as an optional mode |
| Per-mission hard rule | Variety; must be signposted (budget of one) |

### D-03 Failure and revive model
| Variable | Trade-off |
|---|---|
| Revive window length and count | Generous keeps flow; strict keeps stakes |
| Both-down outcome | Fail to checkpoint vs a short "last chance" |
| Checkpoint density | Frequent is fair; sparse is tense |
| Drop-in / rejoin support | Online robustness vs complexity |

### D-04 Violence stance
| Option | Trade-off |
|---|---|
| Lethal allowed | Freedom; risks undermining stealth |
| Non-lethal only | Coherent tone and wider audience; fewer options |
| Scored (both allowed, non-lethal rewarded) | Player choice; needs consistent scoring and no forced kills |

This also covers how questioning or coercion and incapacitants are depicted.

### D-05 Lethal automated defences
| Option | Trade-off |
|---|---|
| Allowed only in military or private compounds | Grounded; reduces device variety |
| Replaced everywhere by realistic responses (shutters, fogging, response teams, dogs) | Grounded and novel; harder to design as a puzzle |

### D-06 Proximity voice
| Option | Trade-off |
|---|---|
| Players' real voices audible to guards | Unique tension and memorable moments; privacy and platform concerns; must be optional, visible and tunable |
| Off | Simpler; lose a signature feature |
| Opt-in challenge modifier | Middle ground |

### D-07 Athletic tone
| Option | Trade-off |
|---|---|
| Grounded (Leg-Up, Ledge Relay, Belay, Stack) | Credible |
| Heightened (Partner Launch, Drop Line) | Spectacular and memorable; less realistic |

Mixing the two needs a consistent rule, for example "trained operators, plausible but showy".

### D-08 Difficulty scaling
| What scales | Trade-off |
|---|---|
| Perception | Changes the core skill |
| Damage | Matters less in stealth |
| Timing windows | Affects sync |
| Resources | Changes planning |
| Alert tolerance | Changes forgiveness |

Decide what each difficulty step changes, and keep detection readable at every level.

### D-09 Player count and solo support
| Option | Trade-off |
|---|---|
| Strictly two humans | Purest design; smaller audience; partner-availability problem |
| AI partner | Accessible; Two-Key Actions need AI support; risk of a "babysitting" feel |
| Solo-adapted variants | Double the content cost |
| 2-4 players | Wider appeal; dilutes two-body design |

### D-10 Connectivity
| Option | Trade-off |
|---|---|
| Split-screen | Social; leaks information |
| Online | Reach; needs robust rejoin and preservation (peer-to-peer / LAN fallback) |
| Cross-play | Population vs input parity for sync actions |

### D-11 Character model
| Option | Trade-off |
|---|---|
| Identical characters with complementary loadouts | Flexible; asymmetry must come from the level |
| Fixed classes with exclusive permissions | Readable lock-and-key; risk of one role idling |
| Player-built loadouts | Expression; harder to guarantee co-op beats |

### D-12 Partner awareness UI
| Option | Trade-off |
|---|---|
| Diegetic beacon only | Immersive; players get lost |
| Partner marker | Clear |
| Shared map | Planning |
| World pings | Precise communication |

Most combinations work. Choose the minimum that prevents "where are you?".

### D-13 Story framing
| Option | Trade-off |
|---|---|
| Parallel to a solo campaign | Rich crossover moments |
| Standalone co-op story | Focus |
| Mission set without a campaign | Replayable; weaker motivation |

### D-14 Camera
- **Third-person** is assumed.
- **Shoulder vs free orbit.** Affects corner-peeking fairness and split-screen readability.
- **Corner-peek rules.** Decide how much a camera may see that the character cannot.

---

## 13. Glossary

| Term | Definition |
|---|---|
| Ambient floor | The local background noise level; player noise above it can be heard |
| Alert tier | Facility-wide escalation step |
| Alert state | One guard's awareness state |
| Free move / authored move | Two-person moves usable almost anywhere vs only at placed anchors |
| Handshake | The initiate / complete contract shared by all two-person moves |
| Merge point | A named place where a split pair is guaranteed to reunite |
| Two-Key Action | An action requiring both players within a tolerance window |
| Zero-failure path | A route through an encounter on which no detection occurs |
