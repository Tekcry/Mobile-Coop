# Design kit digest - the research's co-op design kit against Night Shift's docs

> Research record (2026-10-18). Where it disagrees with docs/DECISIONS.md or docs/VISION.md, those win. Superseded
> points: 1.8 rule 5 "hard fail only for the mission's one declared rule" (G290: up to 2 strict rules, breaking one
> restarts the section, the mission continues); 1.11 rule 8 "every lit area on the critical path can be darkened" and
> 3.7's "two ways to darken" row (2026-10-25: real-world light bands per space type, and hardened lit choke points are
> allowed everywhere as long as a route around stays); any timer rule (2026-10-25: soft windows only, no countdown that
> closes a route); any map, marker or minimap (2026-10-25: no maps, minimap, compass or blip in any mode).

Date: 2026-10-18. Branch `feature/ct-research`. Scrubbed (G6, G114): no reference-game character, gear or organisation
names; "Chaos Theory" / "CT" name the reference. Generic verb names are the kit's own.

Sources read (all in `docs/ct-research/source/raw/`): `DESIGN_BIBLE.md` (all sections), `MISSION_TEMPLATE.md`,
`LEVEL_DESIGN_PROCESS.md`, `LEVEL_REVIEW_CHECKLIST.md`, `PROMPT_LIBRARY.md`, `README.md`, `OPEN_QUESTIONS.md` (D-01 to
D-25), `13_principles.md`, `14_translation_guide.md`, `07_objectives_taxonomy.md`, `10_ai_detection_and_alarms.md`,
`03_coop_overview.md` (sections 1-7), `15_music_and_atmosphere.md` (sections 1.2, 2.6, 5, 7), and skims of
`05_coop_moves_catalogue.md`, `06_gadgets_and_tools.md` and `example_mission_outline.md`. `research_notes/` holds 21
topic files; the kit cites none of them by name (its "real-world notes" pointer is
`research_notes/real_world_security_and_architecture.md`, whose headings were checked: layered security, access control,
two-person rule, sensors, CCTV, egress, scale, alarm verification, guard tours, building services, 12 facility types).

Compared against: `docs/DECISIONS.md` (G1-G122), `docs/design-bible.md` 2.0, `docs/level-design.md`,
`docs/templates/map-spec.md`, `docs/story.md` 2.1 (main points), `docs/systems/session-method.md`.

**Precedence used here.** Michael's D answers (D-01 to D-25, `OPEN_QUESTIONS.md`) win over the kit where they differ, and
win over G1 ("pure CT") per Michael. Where a kit rule (not a D answer) conflicts with a G decision, Michael decides.
`docs/level-design.md` and `docs/templates/map-spec.md` change only with Michael's approval: every row that touches them
is marked **[STD]** or **[TPL]**.

---

## 1. The kit's rules in brief

### 1.1 Philosophy

"Two people slipping through a place built to stop one." The fantasy is a partnership that can do what one intruder
cannot: climb where one cannot reach, watch while the other works, open what needs two hands at once, pull each other out
of trouble. Three convictions:

1. **Interdependence, not co-presence.** The best moments are those where each player's success depends on the other.
2. **Readable danger, recoverable mistakes.** Two imperfect players make more mistakes than one; detection is readable
   before commitment and mistakes escalate rather than end the mission.
3. **Believable places.** Real facilities with a reason for every room, door and camera give a mental map and make
   every weakness feel discovered, not placed.

### 1.2 Pillars

| # | Pillar | Means | Never |
|---|---|---|---|
| P1 | Two bodies, one plan | Moves, gates and objectives need both; players plan together | A one-player puzzle presented as co-op |
| P2 | Fair shadows | Exposure and noise predictable; guards act only on what they perceive; alerts escalate in readable steps | A hidden rule, hidden timer or unexplained alert |
| P3 | Real places, real security | A real facility type on a real day; layered, justified security | A room without purpose, a device without reason, a vent maze |
| P4 | Moments worth retelling | Planned two-person spectacles, a synchronised climax, an in-world reveal | A mission whose best moment is a cutscene |
| P5 | Sound is space | Light and sound are terrain to read and reshape; music reports danger honestly | Music that leaves players unsure whether they were seen |

### 1.3 Co-op verb set (generic names)

**Free two-person moves** (usable almost anywhere with room):
- **Leg-Up** - one braces and lifts the partner to a ledge, window or wall top, or vaults them over a barrier.
- **Ledge Relay** - the lifted player hangs and lets the partner climb past, so both arrive.
- **Partner Launch** - one braces low and propels the partner over a low barrier or short gap; anyone at the landing is
  knocked down (allowed: D-07 heightened).

**Authored two-person moves** (at placed anchors):
- **Belay Line** - one anchors a line while the other descends or climbs; the anchor can swing them sideways.
- **Drop Line** - the anchor lowers the partner head-down through an opening to reach, operate, grab or take down; the
  hanging player can pull up to hide.
- **Stack** - one stands on the other's shoulders to reach a high device.

**Team interactions:** **Hand-Off** (pass an item), **Feed Share** (watch the partner's deployed camera feed),
**Pick-Up** (revive a downed partner in a window), **Context Callouts and pings** (automatic ready / done / down / up /
down / left / right / stop lines, and world pings).

**Synchronised and asymmetric actions:** **Two-Key Action** (two devices within a tolerance window), **Living Key** (an
authorised person escorted to a biometric gate), **Double Drop** (two linked guards neutralised at once),
**Spotter-Operator** (one runs a machine blind, the other sees and guides).

**Shared tools** (modern-day forms, D-01): **Hold-Down Device** (suppresses one camera, beam or light only while held
still and aimed, on a draining charge), **Throw-Cam**, **Stun Round** and **Blunt Round**, **Flash / Screen / Sleep
charges**, **Sensor Modes** (low-light, heat, emitter), **Under-Door Scope**, **Pick and Force**. No remote hacking tool
(D-19).

**Rules every move obeys:**
- **Handshake.** One player initiates (a pose and a callout), the partner sees and hears "ready" and completes; both steps
  are confirmed by sound and UI; an invalid attempt fails gracefully (refusal animation, feedback, no penalty). Teach it
  first.
- **Two tiers.** A mission offers free moves for improvisation and authored moves for set pieces; every authored spot has
  an alternative or a fiction reason why only that move works.
- **Multi-use.** Every move used in a mission serves at least two purposes somewhere in it (traverse, attack, scout,
  rescue, escape).

### 1.4 Principles (36, condensed)

**A. Partnership**
1. Design every zone for two from the first sketch; removing a player makes it impossible or clearly worse.
2. One handshake for every two-person action.
3. Free moves (improvisation) plus authored moves (set pieces).
4. Every move has more than one use.
5. When one acts, the other has a real job; no idle stretch over about 60 s.
6. Split often, but every split ends at a named merge point or a sync, with a way to know where the partner is.
7. Every two-person requirement has a real-world reason (dual control, two-person integrity, paired devices, one dose).
8. Difference through position, information and kit, not only class locks.
9. Syncs are forgiving, give per-input feedback, fail non-lethally and work on every input device.

**B. Fair stealth**
10. Every encounter has a verified zero-failure path for two bodies (including both crossing the same space).
11. Exposure and noise are readable before commitment, the partner's too.
12. Graduated alertness; alerts escalate rather than end the mission; hard fails rare, shown up front, justified.
13. Guards act only on what they perceive; seeing one intruder does not reveal the other.
14. Guards talk so players can read their state; music never buries them.
15. Players reshape light and noise; guards notice the change, so it works as a lure.
16. Players can always communicate: pings and callouts always available; in-simulation voice optional, visible, tunable.

**C. Space**
17. Every room has a purpose, users and a schedule; puzzles express that purpose.
18. Security is layered to the facility's real risk; every exotic device and weak side is explained in the fiction.
19. Building codes are allies: exits open from inside, alarms release locks, two stair cores, short dead ends, real sizes.
20. Hidden routes run through real building services and are reached by co-op moves; no person-sized ducts everywhere.
21. The solution is visible from the problem.
22. Machines show their state in sight and sound.
23. Overlooks before major encounters fit and serve two players.
24. Show the climax space or a landmark early; pay it off later.

**D. Objectives and pacing**
25. Objectives chain through the fiction; each moves the pair into new space.
26. One twist per mission, around the middle, delivered in-world to both players.
27. Small co-op beat every 2-4 min, major set piece every 6-10 min, rest after each, no repeated signature set piece.
28. Optional intel rewards curiosity but never secretly guards a hard fail.
29. A down becomes a rescue before a reload; encounter-level checkpoints.
30. Extraction is designed, not a backtrack.

**E. Moments and atmosphere**
31. Three planned wow moments per mission: body, sync, story.
32. Music reports state, arrives late, leaves promptly.
33. Ambient sound is level design: loud zones are sneak windows, quiet zones are danger; say when loud threat is not
    aimed at the players.
34. Partners are identifiable in the dark and at distance.

**F. Kit and guidance**
35. The kit states the rules: a special mission rule is obvious from the loadout (remove what it forbids, give more of
    what it rewards).
36. Guidance has a voice: the handler channel is atmosphere; text-only guidance is a degraded fallback.

### 1.5 Detection fairness rules

1. **Exposure equals what the eye sees;** any discrepancy is a bug.
2. **Noise shown against the ambient floor;** masking sources visible or audible.
3. **Partner awareness:** each player can tell from their own screen whether the partner is exposed or loud.
4. **Alert states (minimum):** Routine, Curious (short look), Investigating (moves to the source with a light, calls a
   colleague), Searching (team searches the last known area), Engaged, Cooling down (back to routine, more wary). Each
   has a distinct bark, animation and music layer.
5. **Escalation tiers,** each announced in-world (radio, PA, lights) and reversible only by time or a specific player
   action, never silently. Example: investigating, heightened (more patrols, protective gear), lockdown (shutters,
   response team). D-02: escalating tiers, no abort.
6. **Realistic alarm chain:** one sensor trip is ambiguous and checked as a possible fault; a second adjacent trip or
   video confirmation raises a confirmed intrusion; panic or duress devices skip verification.
7. **Bodies and absences:** bodies are found only by perception (a guard or an active camera); a guard who misses a tour
   checkpoint triggers a supervisor check after a defined window.
8. **Two intruders:** perception and alert data per intruder; a search targets the last known position of the player
   perceived (D-16: guards know only what they saw; the shared tier rises, but nobody knows a second intruder exists
   until one is seen or evidence suggests it).
9. **No hidden timers.**
10. **Hard-fail budget:** at most one per mission, stated in the briefing, reinforced in-world, shown on the HUD.
11. **Glimpse grace:** detection builds up readably, scaled by distance and light, so the partner can react.
12. **Sync tolerance:** Two-Key Actions accept inputs within a window, wider with no voice channel; failure escalates,
    never instant death.

### 1.6 Architecture and security realism

**Facility logic**
- Pick a real facility type; describe its operation on the mission day and time (shifts, deliveries, cleaning,
  maintenance, events) and what is unusual today.
- Every room has a function, users and a schedule, or it is cut.
- Circulation: two separated stair cores per floor; dead ends about 5 m before an alternative; travel to an exit fits the
  building type (about 18-45 m in offices); lifts in cores with risers beside them.
- Service spaces are the hidden network (ceiling voids, raised floors, risers, plant floors, roofs, catwalks, docks,
  service corridors); only large trunk ducts near plant rooms are crawlable.
- Scale sheet: door clear width about 0.8-0.9 m (service doors wider); headroom 2.0 m or more; stair rise 150-180 mm,
  going 250-300 mm; escape routes 0.75-1.05 m+ by occupancy; accessible corridors 0.9 m or more with passing places.
- Signage is realistic: public spaces signed, critical rooms in secure facilities not.

**Security logic**
- Tier the facility by criticality, symbolism, population, size and threat.
- Layer outside-in: beyond the perimeter, perimeter, site, building, asset; each layer deters, detects, delays and
  supports response.
- Balanced delay: no absurd weak side; every exploited weakness has an in-fiction cause (renovation, budget cut,
  contractor shortcut, staff habit), and the cause is a story beat.
- Devices behave like real ones: door contacts on doors; motion and dual-technology sensors in corners about 2.3 m up,
  armed when the space is empty; glass-break near glazing; vibration on cases and safes; infrared beams mostly outdoors;
  cameras with detect / recognise / identify ranges, blinded by glare, back-light and deep shadow; supervised wiring (a
  cut raises a fault, not silence).
- Access control graded: keys or cards, then two factors, then mantraps or dual control at the asset.
- Two-person gates use real two-person rules.
- Exits open from inside without a key; fire alarms release electric locks (tools with consequences).
- Guards run tours with checkpoints and windows; a control room watches cameras and directs responders; staff challenge
  strangers.
- Response takes time (operator, guard or keyholder check, outside response); each delay is a gameplay window.
- Lethal automated defences only at military or private compounds (D-05); elsewhere shutters, fogging, response teams,
  dogs.

### 1.7 Pacing targets (numbers)

| Measure | Target |
|---|---|
| Mission length (average pair) | 30-60 min (CT's own co-op missions were reviewed at about 60-90 min each) |
| Primary objectives | 3-6 |
| Optional objectives | 1-3, discoverable in play |
| Small co-op beat | every 2-4 min |
| Major co-op set piece | every 6-10 min |
| Signature set pieces | 1-2 per mission, never repeated within it |
| Objective twist | one, at 40-60% |
| Rest beat | after each major set piece: 30-90 s of low threat, room to regroup and talk |
| Encounter checkpoint | at least before every major set piece; never lose more than about 10 min |
| Extraction | under 2 min, or a different route for at least half its length |
| Partner separation | ends at a named merge point; never more than about 3 min without a merge or a sync |

Mission shape: soft co-op opening (re-teach a verb safely), escalating density, first big sync, twist, rest, build,
signature climax, designed exit.

### 1.8 Objective rules

1. Tiers: primary (required), secondary (optional, scored), opportunity (optional, found in play).
2. Chaining: each completion reveals the next destination or need through in-world intel (documents, conversations,
   devices, people). Chain types: recipe, investigation, event-gated, mid-mission extension.
3. Dependency: every mission has at least one **two-body** objective (Two-Key, Living Key, Spotter-Operator), one
   **protect-while-act** objective and one **reach** objective (needs a two-person move).
4. Scarcity items (one dose, one badge, one suit) may assign roles; the other role then gets parallel work.
5. Failure: hard fail only for the mission's one declared rule or the loss of a clearly marked protected person (D-22);
   optional failures cost score only; anything preventing an unwinnable state has two or more cues or is recoverable (a
   chase, not a fail).
6. Scripted violence: with the scored stance (D-04) no objective forces a kill; if one does, it is exempt from scoring
   and says so.
7. Every opportunity objective has an in-world source on the critical path or one step off it.

Related D answers: D-15 both players must reach the exit; D-20 some solutions (codes, items, rooms) are randomised per
run and read in-world; D-23 a perfect rating is no kills + no alarms + all primaries, optionals are bonus, every mission
testably 100%-able; D-25 two-person questioning is non-violent (one distracts or bluffs, the other reads a device or a
reaction).

### 1.9 Co-op beat density and variety (numbers)

Per mission, at least:

| Beat type | Minimum |
|---|---|
| Hold-and-pass gate (device suppression or cover relay) | 3 |
| Free-move traversal (Leg-Up and Ledge Relay, or Partner Launch) | 3 |
| Authored-move set piece (Belay Line, Drop Line or Stack) | 1 |
| Split-and-sync ending in a Two-Key Action | 1 |
| Protect-while-act | 1 |
| Information asymmetry (spotter, feed share, overlook planning) | 1 |
| Double Drop opportunity | 1 |
| Parallel-route section with a defined merge | 1 |

Variety: across the campaign, no two missions share a signature set-piece type. Roles alternate so neither player is
always the platform.

### 1.10 Wow-moment requirements

At least three per mission: **Body** (a spectacular two-person move or dramatic entry / exit that solves a real problem),
**Sync** (a countdown, near-miss or simultaneous act where each protects or completes the other), **Story** (an in-world
reveal, twist or landmark payoff). Each passes five tests: **spectator** (a watcher understands it), **agency** (players
trigger it and it can fail), **mutual need** (both have a job), **readability** (danger readable before commitment),
**retell** (one sentence afterwards). Use at least one amplifier: a move that doubles as an attack; information only one
player can see; an altitude change with a view; a real device used for its real purpose in an unexpected way.

### 1.11 Audio and atmosphere rules

1. Silence is the default; music arrives on placed triggers or rising danger.
2. State-driven layered score mapped to alert states and tiers; each layer stands alone; short, defined decay; never
   implies a detection that did not happen.
3. Music and effects duck under guard barks within earshot.
4. The ambient floor is terrain (machines, water, weather, crowds, traffic raise it; switched-off plant, empty tiled halls
   and night offices are danger); a soundscape map per mission.
5. Coupled weather: one event, several readable effects (rain moves patrols under cover, wets floors into reflective
   exposing surfaces, raises ambient noise; thunder covers, lightning exposes).
6. Benign threat is signposted in-world when the soundscape is loud with threat not aimed at the players.
7. Barks are UI: every state change is voiced, guards talk in pairs and comment on evidence (a dead light, an open door,
   a missing colleague).
8. Light is staged like a theatre (clear pools, clear dark); every lit area on the critical path can be darkened, and
   every darkening draws a reaction.
9. Partner beacons: a distinct colour or shape per player, readable in darkness and in vision modes, invisible to enemies
   in the fiction. D-12: distinct light colour per player plus world pings; no partner marker; no live partner position on
   any map.
10. Low-spec rule: if a platform cannot render readable lighting, change the lighting design rather than lose
    readability.
11. Voiced guidance for every mission, add-on missions included.

Communication D answers: D-06 proximity voice (players' real voices heard by guards) is an opt-in modifier, off by
default, visible and tunable; D-17 partner voice is always clear (earpiece model, no distance fade).

### 1.12 Glossary terms worth adopting

| Term | Meaning | Our nearest term today |
|---|---|---|
| Ambient floor | Local background noise; player noise above it is heard | "ambient level" / masking (bible S2-S4) |
| Alert state vs alert tier | One guard's awareness vs the facility-wide escalation step | guard states vs "mission alarm level 0-3" (5.7) |
| Free move / authored move | Two-person move usable almost anywhere vs only at placed anchors | none (G81 makes boosts marked-spot only) |
| Handshake | The initiate / complete contract shared by every two-person move | none |
| Merge point | A named place where a split pair is guaranteed to reunite | "rejoin at a pinch point" (level-design 3.3) |
| Two-Key Action | Both players act within a tolerance window | "Sync" (bible 4, research) |
| Double Drop | Two linked guards neutralised at once | "dual takedown" (G52) |
| Hold-and-pass | One suppresses a device while the other crosses, then swap | none |
| Zero-failure path | A route through an encounter with no detection | "ghost run" (level-design 15, P3) |
| Objective twist | The one mid-mission rewrite of the goal | clashes with "teach, test, twist" (level-design 6.1): propose "objective twist" for the kit's sense |
| Partner beacon | Per-player light signature | goggle light colours (story: Wren green, Moth amber) |
| Rest beat, signature set piece, encounter checkpoint, clean rating, context callouts | As in 1.7-1.11 | "release" (6.2), "set piece" (6.1), "checkpoint" (5.8), stealth rating (5.8) |

---

## 2. Mission template, level design process and review checklist

### 2.1 MISSION_TEMPLATE.md (one filled document per mission)

Every field filled or "N/A + reason"; each section names the role and process step that owns it.

| § | Section | Asks for |
|---|---|---|
| 0 | Header | title, version, owners, campaign position, target time (30-60 min), D answers relied on, gate status |
| 1 | Premise | one-sentence pitch; story context; the in-fiction reason it needs two operatives; stakes; tone |
| 2.1 | Real-world facility | facility type; 5-10 real day-to-day operations; who works there by shift; day-in-the-life on the mission day (shifts, deliveries, cleaning, events, what is unusual and why) |
| 2.2 | Security profile | tier and why; primary assets; five-layer deter / detect / delay / response table; access control; two-person rules with real justification; known weaknesses with fiction causes; alarm chain with minutes; control room |
| 3 | Objective chain | table: tier, objective, in-world source, where, co-op dependency type, fail state; chain type; the twist (40-60%); hard-fail rule (max one) and how shown; protected persons; unwinnable-state cues; scoring notes |
| 4 | Zone list | per zone: rooms with purpose and users, occupancy tonight, devices with reasons, gameplay role (encounter / rest / overlook / set piece / hub); stair cores, dead ends, service network, scale confirmation |
| 5 | Guard roster | per guard: role, zones, tour checkpoints and windows, routines, pairing, reaction to evidence; non-guard occupants; missed-checkpoint consequence; two-intruder handling; alert states and tiers |
| 6 | Security systems | per device: type, location and height, coverage (camera detect / recognise / identify), blind spots and real cause, when armed, what a trip does, player counters; Two-Key devices with windows; machines with state |
| 7 | Co-op beats | per beat: zone, type, who does what, real justification, alternative, failure outcome, minute; density check against the minimums; multi-use list; idle check (< 60 s) |
| 8 | Ideal stealth route | step table of both players' positions, active threats and why undetected; alternative routes (loud / fast, slow / safe, vertical); named merge points; checkpoints |
| 9 | Pacing curve | minute-by-minute beats with intensity 1-5 and type; rests; signature set pieces; extraction |
| 10 | Wow moments | body / sync / story with the five tests ticked and the amplifier |
| 11 | Soundscape and lighting | ambient floor per zone and purpose; benign-threat signposting; music state table (layers, attack, decay); music triggers; bark plan and ducking; lighting plan (pools, changeable lights, reactions, landmarks); weather; beacon check in the darkest zone |
| 12 | Communication aids | ping and callout coverage per move; partner-awareness UI (D-12); voice-in-simulation rules (D-06); guidance channel |
| 13 | Failure and loadout | revive window and count (D-03); checkpoints and max replay loss; escalation consequences per tier; loadout per player and how it signals a special rule |
| 14 | Play time | expert ghost pair / average pair / first-time casual pair |
| 15 | Risks and open questions | |
| 16 | Review record | the checklist results table |

### 2.2 LEVEL_DESIGN_PROCESS.md (steps 0-13, one role per step, each with a pass / fail gate)

Roles: Security Consultant, Architect, Game Designer, Level Designer, Co-op Designer, Audio and Atmosphere Designer,
Playtester / Critic. Each step is one focused session (one prompt) saved as a numbered file in `missions/<slug>/`; a
failed gate repeats the step.

| Step | Owner | Output | Gate in brief |
|---|---|---|---|
| 0 | Game Designer | brief | every relevant D answered or assumed; set pieces already used in the campaign listed |
| 1 | Game Designer | premise | two-person reason is in the fiction; real facility, not a reskin; the unusual circumstance gives an opportunity and a complication |
| 2 | Security Consultant | security profile | every device class has a reason; alarm chain has delays; every two-person gate cites real dual control; weak sides explained |
| 3 | Architect | building programme + ASCII block plans | every room has a purpose; 2+ separated stair cores; short dead ends; exits open from inside; real service sizes; scale sheet |
| 4 | Game Designer | objectives | each objective names its discovery; one two-body, one protect-while-act, one reach; one twist; max one hard fail; 2+ cues per unwinnable risk |
| 5 | Level Designer | macro flow (ASCII zone graph) | every objective by 2+ routes or one justified; climax seen earlier; designed extraction; no corridors to nowhere; originality prompt run |
| 6 | Level Designer + Security | zones, guards, devices | every post or tour has a purpose; camera ranges real; blind spots have causes; machine states visible and audible; two-intruder perception specified |
| 7 | Co-op Designer | co-op beats and comms | all density minimums; every move 2+ uses; every split has a merge; idle < 60 s; nothing solvable alone; every Two-Key has a window and non-lethal failure |
| 8 | Level Designer | zero-failure route | verified for both bodies at once; an alternative per encounter; no hidden rule; checkpoints cap loss at about 10 min |
| 9 | Game Designer + Level Designer | pacing | beat intervals met; rest after each set piece; no repeated signature; length on target; separation under about 3 min |
| 10 | Co-op Designer | wow moments | all three families; all five tests; one amplifier; no copy of a famous set piece |
| 11 | Audio and Atmosphere | soundscape and lighting | ambient class and purpose per zone; music table covers every state with decay; every critical-path lit area changeable with a reaction; benign threat signposted; beacons read in the darkest zone |
| 12 | Playtester / Critic | review | careful pair and careless pair simulated; every checklist item with evidence; all MUSTs pass, SHOULD misses accepted with reasons; originality passes |
| 13 | Game Designer | assembled MISSION.md | every field filled or N/A; no contradictions between sections |

### 2.3 LEVEL_REVIEW_CHECKLIST.md (MUST blocks sign-off; SHOULD needs a fix or a written reason)

| Section | MUST items (in brief) | SHOULD items (in brief) |
|---|---|---|
| A Architecture | A1 real facility and its day described; A2 two separated stair cores, lifts in cores; A3 no dead end over about 5 m without reason; A4 exits open from inside, fire alarm releases locks; A5 hidden routes use real services of real size | A6 circulation reads as real; A7 secure facilities do not signpost critical rooms |
| B Room purpose | B1 every room labelled function / users / hours; B2 no gameplay-only room, puzzles through function | B3 contents match function; B4 one room shows "life" that tells players something |
| C Scale | C1 dimensions within the scale sheet; C2 movement metrics consistent, geometry built to them | C3 exterior scale consistent |
| D Readability | D1 every objective's in-world source exists; D2 solution visible from the problem, found within 2 min; D3 machine state in sight and sound, control visibly linked | D4 climax seen early; D5 overlook for two before each major encounter; D6 designed extraction |
| E Co-op beats | E1 density minimums; E2 beat intervals on the critical path; E3 removing a player makes each zone impossible or worse; E4 no idle over 60 s; E5 named merges, separation under 3 min, partner location always knowable; E6 Two-Key: window, per-player ready state, non-lethal fail, works with pings only; E7 written real-world reason for every two-person requirement | E8 multi-use moves; E9 authored spots have alternatives; E10 roles alternate; E11 one information-asymmetry beat solvable only by talk or pings |
| F Stealth viability | F1 zero-failure path for two through every encounter; F2 alternative per encounter; F3 every critical-path lit area has a changeable light that draws a usable reaction | F4 patrol windows, no static permanent block; F5 support for scouting, search and escape (safe spots, ring routes); F6 escapes do not lead into more guards |
| G Detection fairness | G1 exposure matches rendering; G2 every alert traces to a perception event, two-intruder perception specified; G3 states and tiers with distinct bark, animation, music; G4 max one hard fail, shown; G5 no hidden timers; G6 2+ cues or recoverable for unwinnable states; G7 real camera ranges and blind-spot causes | G8 partner exposure and noise readable; G9 paired barks, music ducks; G10 single sensor trip treated as ambiguous |
| H Security logic | H1 tier justified; H2 five layers described; H3 every device has a reason, valuable rooms protected; H4 every exploited weak side has a cause | H5 tours with checkpoints and a consequence; H6 alarm delays used as windows; H7 lethal defences only where D-05 allows |
| I Pacing and failure | I1 length 30-60 min or a documented exception; I2 exactly one twist at 40-60%, in-world to both; I3 rest after each set piece; I4 rescue window, checkpoints cap loss at about 10 min | I5 each objective moves into new space; I6 3-6 primaries, 1-3 optionals with sources; I7 scripted violence consistent with D-04; I8 loadout signals special rules |
| J Wow moments | J1 body, sync and story planned; J2 each passes all five tests | J3 one amplifier; J4 no repeated signature in the mission or campaign |
| K Audio | K1 soundscape map; K2 music table covers every state with attack and decay, never implies false detection; K3 beacons readable at about 20 m in the darkest zone and tell the players apart | K4 benign threat signposted; K5 staged lighting, landmarks lit and seen from dark routes; K6 weather coupled; K7 voiced guidance |
| L Originality | L1 no reference names; L2 premise not a reskin (facility + chain + set pieces); L3 layout not recognisable; L4 set pieces transformed, one line each | L5 originality prompt run |
| M Integrity | M1 every field filled; M2 no contradictions between sections | M3 D answers listed |

The worked example (`example_mission_outline.md`, "Load Test": a colocation data centre during a generator load test,
45 min) fills every section and passes every gate. Note: our Mission 1 (Dead Line, story.md 6.1) is also a colocation
data centre; the example is a usable reference shape for it, not a source of content.

---

## 3. Fit with the game's docs

Legend: **Have** = already in our docs (section cited). **New** = compatible, proposed addition. **Conflict** = cite
both; Michael decides unless a D answer settles it (then "D wins"). **[STD]** touches `docs/level-design.md`; **[TPL]**
touches `docs/templates/map-spec.md`; both need Michael's approval.

### 3.1 Philosophy, pillars and the co-op verb set

| Kit rule | Fit | Our docs / proposal |
|---|---|---|
| Two-player partnership, built for two | Have | G2, G3, bible P6, C1, C4; story 6 "rules for mission writing" |
| Pillar "Fair shadows" | Have | bible P1, P5; level-design 8, 9 |
| Pillar "Real places, real security" | Have (places) / New (security) | level-design 2, 16 cover places; security layering is new (3.4 below) |
| Pillar "Moments worth retelling" | New | story 6 has a "co-op highlight" per mission; no wow-moment rule yet |
| Pillar "Sound is space" | Have | bible P2, S1-S8 |
| Free moves usable almost anywhere (Leg-Up, Ledge Relay, Partner Launch) | **Conflict** | G81 and bible C3 / level-design 12.2: "two-player boosts work only at marked spots, as CT's co-op spots do". The research says CT's free moves worked almost anywhere there was room and only the rope, hang and shoulder moves were placed (`05` §1, VERIFIED), so G81's stated premise differs from the research. Michael decides. **[STD]** 11.5, 12.2 |
| Partner Launch (knocks down anyone at the landing) | New (D-07 allows) | not in G52's four moves; add in the co-op job (G52: "the other four wait for the co-op phase") |
| Ledge Relay | Have | "human ladder" (G52, G57: 4.3-4.5 m band) |
| Belay Line, Drop Line, Stack (authored) | New | bible 4 / C3 list "split-jump boost, back-to-back climb, pull-up, rappel anchor". The research finds back-to-back climbing was never a shipped CT move (`05` §7) and that CT's three placed moves are the dual rope, the head-down hang and the shoulder stand. Proposal: replace the bible C3 list with Belay Line, Drop Line, Stack (G1 drops back-to-back). Belay "climbs" the line: check against G110 "no rope climb" (Michael decides if climbing up a belayed line is allowed) |
| Double Drop | Have | "dual takedown" (G52); research: CT had no dedicated move, players timed two ordinary takedowns |
| Hand-Off, Feed Share, Pick-Up | New / Have | Pick-Up = revive (C6); Hand-Off and Feed Share are CT team interactions, added in the co-op job |
| Context callouts and pings | New (D-12 settles) | bible C12-C18 "research"; D-12 adopts world pings. Callouts are text until voice (G82) |
| Two-Key, Living Key, Spotter-Operator | New | bible 4 lists "Use a held guard on a scanner" (research) = Living Key; "Sync" (research) = Two-Key |
| Hold-Down Device (held, aimed, draining; hold-and-pass gates) | **Conflict** | bible 4 / G76: "Pistol with disruptor: temporarily kills lights and electronics it hits" (fire-and-forget, CT solo behaviour). CT co-op turned the same pistol tool into a hold-to-suppress jammer used in every mission (`06` §1, §3.1). G3 (recreate the co-op) and the kit's 3-per-mission hold-and-pass minimum both point to hold-to-suppress in the campaign. Michael decides |
| No remote hacking tool | Have (D-19) | G76 has none. Story 4: Tally "works the networks remotely" - keep as narrative only (no remote door or camera control for the players) |
| Handshake rule (initiate, ready cue, complete, graceful refusal) | New | bible C11 covers host approval and shared start time; add the handshake as the player-facing contract for every team move |
| Two-tier rule (free + authored, alternatives for authored spots) | **Conflict** via G81 | as the free-moves row |
| Multi-use rule (every move 2+ purposes) | New | add to the co-op plan per space (bible 7) |
| Identical characters, complementary per-mission kits (D-11) | Have (bodies) / **D wins** (kits) | G109 operators move the same: matches. G105 player-chosen Stealth / Assault / Recommended loadouts (directive-derived, G1) give way to per-mission complementary kits (D-11; CT co-op had fixed per-mission kits per agent, `06` §1). Bible 3 step 1 and 5.6 loadout text change |

### 3.2 Principles

| Kit rule | Fit | Our docs / proposal |
|---|---|---|
| #1 design every zone for two; removing a player makes it impossible or worse | **Conflict** (already open) | level-design 11.1 "Solo first", 11.2 "solo invariance", 11.4 "anyone can leave alone", 15 solo ghost run; already listed as open item 1 in level-design ("rules that conflict with DECISIONS"). G2 / G111 and the kit agree. Proposal: rewrite section 11 as "Built for two" **[STD]** |
| #5 idle under 60 s | New | add to the co-op plan and the beat chart **[STD]** 13 |
| #6 split ends at a named merge or a sync; separation under 3 min | New / partial | level-design 3.3 "rejoin at a pinch point" covers route rejoin, not partner splits **[STD]** |
| #7 real-world reason for every two-person requirement | Have (partial) | level-design 11.2 "a real reason solo cannot use them"; 16.0 reason test. Extend to two-person gates (dual control etc.) **[STD]** |
| #8 asymmetry by position, information, kit | New | D-11 kits; information-asymmetry beat minimum |
| #9 forgiving syncs, per-input feedback, non-lethal fail, every input device | New | bible C11 (host-approved shared start) is the technical base; D-08: sync windows do not scale with difficulty |
| #10 zero-failure path for two | Have (solo form) | P3 test, level-design 15 "ghost run succeeds"; extend to "for two bodies, including both crossing the same space" **[STD]** 15 |
| #11 readable before commitment | Have | L6 meter, S4 sound meter, level-design 8 |
| #12 graduated alertness, escalate not end | Have | bible 3 "Failure and recovery", 5.7 alarm level 0-3, level-design 9; D-02 matches |
| #13 guards act only on perception; one intruder seen does not reveal the other | Have / **D-16 settles open item** | bible C5 "guards see each player separately"; bible 11 open item "whether the LKP becomes per player" is settled by D-16: per-player knowledge, shared tier |
| #14 guards talk; music never buries them | Have (text) / Conflict (voice) | bible 5.7 "barks (shown as text)"; kit wants voiced barks (CT guards were voiced). G82 covers story lines only. Michael decides whether barks are voiced and when |
| #15 players reshape light and noise; guards notice | Have | L8, L9, S2 switchable masking, level-design 4.6 lures, 5.2 |
| #16 always communicate; pings and callouts | New (D-12, D-06, D-17) | see 3.6 |
| #17-#20 real rooms, layered security, codes as allies, service-space routes | Have / New | see 3.4 |
| #21 solution visible from the problem (within 2 min) | New | level-design 6.4 guides the way on; add the 2-minute test for gated obstacles **[STD]** |
| #22 machines show state | New | level-design S2 ties ambient zones to switches; add "state visible and audible, control visibly linked" **[STD]** 5 |
| #23 overlooks fit two | Have (solo form) | level-design 3.1 entry vantage; extend "fits both players, both see every guard" **[STD]** |
| #24 landmark seen early, paid off later | Have | level-design 6.4 landmarks visible from afar; add "the climax space is seen before it is reached" **[STD]** |
| #25 objectives chain through intel and move the pair | Have (partial) | bible 5.8 opportunity objectives from intel, interrogation, radio; story 6 "each mission ends on a reveal" |
| #26 one objective twist at 40-60% | New | story 6 has end-of-mission reveals; Mission 7's early start is a mid-mission twist. Add to the mission framework |
| #27 beat rhythm | New (numbers) | level-design 6.2 tension and release, 13 beat chart (per space, no minutes) **[STD]** |
| #28 optional intel never guards a hard fail | New | add to mission rules (bible 5.8) |
| #29 rescue then reload; encounter checkpoints | Have / **D-03 conflict** | bible 5.8 "checkpoint before each space", no quicksave: matches. D-03: 30 s revive window, 2 revives per mission, both down = reload. Bible C6 and 5.13 "No bleed-out", level-design 11.4 "there is no bleed-out": **D wins**; bible and **[STD]** 11.4 / 12.1 revive fact change. CT had manual saves only (G1) - D-03 wins |
| #30 designed extraction | New | **[STD]** add; D-15 both players must reach the exit |
| #31 three wow moments | New | **[STD]** 13 deliverable or the map spec **[TPL]** |
| #32-#34 music, ambient, partner identity | Have / New | see 3.7 |
| #35 the kit states the rules | New (via D-11) | per-mission kits signal a special rule (no kills, no alarms) |
| #36 voiced guidance | **Conflict** (timing) | G82 "text now, voice later". Compatible as a later target; Michael confirms the kit's "voiced for every mission" is the later goal |

### 3.3 Detection fairness

| Kit rule | Fit | Our docs / proposal |
|---|---|---|
| 5.1 exposure equals visuals | Have (stronger) | bible P1, L1-L5 numeric parity test; level-design 5.4 |
| 5.2 noise vs ambient floor | Have | S2-S4, G61 |
| 5.3 partner awareness: see whether the partner is exposed or loud | **Conflict** (G1) | CT showed partner health, not partner exposure (`10` §7). A partner exposure / noise indicator is not CT. D-12 (beacon + pings) does not cover it. Michael decides |
| 5.4 six alert states, each with bark, animation, music layer | Have (mostly) | bible 3: suspicious, investigating, alert, search; G63 / G67 music steps; "cooling down" = CT's return to duty after an alarm. Add an explicit cool-down state if missing |
| 5.5 escalation tiers announced in-world, reversible only by time or action | Have (tiers) / New (announcement) | bible 5.7 alarm level 0-3 (torches, armour and helmets, reinforcements); CT had four steps (a written-off first alarm, armour, helmets, permanent high alert). Announcement in-world (radio, PA, lights) is new |
| 5.6 realistic alarm chain (single trip ambiguous, confirmation escalates) | New / partial | CT's first alarm was written off as false; our level 1 is not. Michael decides whether the first trip is a freebie / ambiguous check |
| 5.7 bodies found only by perception | Have | bible 5.7 bodies, cameras raise alarms; CT matched |
| 5.7 missed tour checkpoint triggers a supervisor check | **Conflict** (G1 / G11) | not CT; bible 5.7 has the CT form "a missing patrol partner (radio check)". Michael decides |
| 5.8 per-intruder perception, search the perceived player's LKP | **D-16 settles** | bible C5 per-player spotting; bible 11 open LKP question closed by D-16 |
| 5.9 no hidden timers | Have | bible 5.8 "no timers in stealth sections", bible 6 never forced timers in stealth sections, level-design 6.3. Kit allows shown timers at climaxes (CT used them); story Mission 7's real-time blackout must be shown in-world |
| 5.10 max one hard fail per mission, briefed, in-world, HUD | Have (partial) / **Conflict** | bible 5.7 "a mission rule can fail the mission at a set level", 5.8 rules bonus or fail, level-design 9.3: compatible if each mission declares at most one. Conflict: bible 5.7 "Killing a civilian fails the mission" is a standing hard fail in every mission, on top of D-22 protected characters. Michael decides whether civilian deaths fail (bible) or cost rating (CT co-op) |
| 5.11 glimpse grace | Have | perception build-up (`AlertMachine`, bible 5.7); level-design 8.1 |
| 5.12 sync tolerance wider without voice; failure escalates | New | D-17 makes partner voice always available; keep the wider window for players who do not talk |
| D-21 lit windows expose both ways | Have (partial) | L15 glass rule; add "a lit window exposes anyone in it, both ways; dark rooms hide" **[STD]** 5 |

### 3.4 Architecture and security realism

| Kit rule | Fit | Our docs / proposal |
|---|---|---|
| Real facility type, operation on the day, what is unusual | Have | level-design 2.1, 16.1.1 ("why it is quiet tonight"); add "what is unusual tonight gives one opportunity and one complication" **[STD]** **[TPL]** building brief |
| Every room has function, users, schedule | Have | level-design 2.2, 16.0, 16.6.2, 16.9 element register |
| Two separated stair cores per multi-storey floor | New | level-design 16.2 rules what joins floors, not how many cores **[STD]** 16.2 |
| Dead ends about 5 m | Have (stronger) | level-design 3.4 "a dead end on a stealth route is a design fault", 16.6.3 |
| Exits open from inside; fire alarm releases electric locks | New | level-design 16.3.5 covers locks with owners; add egress and fire-release as rule and tool **[STD]** 16.3 |
| Service spaces are the hidden network; only large trunk ducts near plant crawlable | Have | level-design 16.3.4, 16.7, G56 |
| At least one vertical route per mission needs a two-person move | New | **[STD]** section 11 rewrite |
| Scale sheet (door, headroom, stairs, corridors) | Have | level-design 16.1.2 and `docs/design/scale-sheet.md`; all sizes re-measured after the prototype camera (G54). Check the kit's numbers against the sheet then |
| Realistic signage | New | **[STD]** 16 (small) |
| Security tier from criticality, symbolism, population, size, threat | New | **[STD]** 13 deliverable "security profile"; **[TPL]** |
| Five layers with deter / detect / delay / response | New | as above |
| Every exploited weak side has an in-fiction cause that is a story beat | Have (partial) | level-design 16.0 reason test; extend to security weaknesses **[STD]** |
| Device placement realism (sensor heights, beams mostly outdoors, camera ranges, supervised wiring) | New | bible 5.7 sensors = cameras and laser beams, "the research confirms the set". Add placement rules to 16.8 **[STD]** |
| Graded access control; two-person gates use real two-person rules | New | **[STD]** 16.8 / section 11 |
| Guard tours with checkpoints; control room; staff challenge strangers | Partial / Conflict | level-design 4.1 jobs, 16.8.2 guard reasons; tour checkpoint mechanics are not CT (see 3.3). A control room as fiction and as a place is compatible |
| Response delays as gameplay windows | New | needs an alarm-chain system; Michael decides scope (CT used wall alarm panels guards run to, `10` §3) |
| Lethal automated defences only at military / private compounds (D-05) | **D answer** | story 6: the vault company (Mission 5) is the only private compound candidate; elsewhere shutters, response teams, dogs |

### 3.5 Pacing, objectives, beats and wow moments

| Kit rule | Fit | Our docs / proposal |
|---|---|---|
| Mission 30-60 min | New (number) | bible 5.8: "the research decides their number, length and flow"; G118 defers Kestrel's Mission 1 size. Note CT co-op missions ran about 60-90 min in reviews |
| 3-6 primaries, 1-3 optionals | Have (tiers) / New (counts) | bible 5.8 primary, secondary, opportunity |
| Small beat every 2-4 min, set piece every 6-10 min, rest 30-90 s after each | New | **[STD]** 6 and 13 beat chart (add a minutes column) |
| Signature set pieces 1-2, never repeated; no two missions share one | New | story 6 "co-op highlight" column already varies per mission (two manifests at once, sync takedowns, split floors, vault and alarm at once, pings only, holding a dark map) |
| Encounter checkpoint, max 10 min loss | Have | bible 5.8 one checkpoint before each space; level-design 3.9 |
| Extraction under 2 min or a different route | New | **[STD]**; D-15 both must extract |
| Separation under 3 min | New | **[STD]** |
| Two-body, protect-while-act and reach objective each mission | New | bible 5.8 objective types lack the dependency tag; add it to the mission data and the map spec **[TPL]** |
| Scarcity items assign roles | New | compatible with D-11 kits |
| Scored violence, no forced kills, exemption stated | Have | bible P3, G23 (D-04 matches) |
| Perfect rating = no kills + no alarms + all primaries; testably 100% | Have | bible P3 test, 5.8 results, level-design 15 "a ghost run succeeds with every bonus" (D-23 matches) |
| Some solutions randomised per run, read in-world (D-20) | New, compatible | bible 5.7 "no randomness that defeats planning; patrol cycles fixed" stays (codes and items vary, patrols do not). The checkpoint save must keep the run's seed (bible 5.8 checkpoint state) |
| Two-person questioning, non-violent (D-25) | New, compatible | G23 grab-interrogate stays; add the two-person form to bible 5.4 |
| Protected characters fail the mission with clear warning (D-22) | New | bible 5.8 rules; counts outside the one-hard-rule budget per the kit |
| Beat density minimums (1.9) | New | **[STD]** section 11 "Built for two"; **[TPL]** "Co-op routes" becomes "Co-op beats" with the density table |
| Wow moments: body, sync, story, five tests, amplifier | New | **[STD]** 13 deliverable; **[TPL]** |

### 3.6 Communication, camera and connectivity (D answers)

| Kit rule / D answer | Fit | Our docs / proposal |
|---|---|---|
| D-06 proximity voice, opt-in modifier | **Conflict** | bible 6 "Never: Voice chat". D answer; Michael confirms the bible line goes |
| D-17 partner voice always clear (earpiece) | **Conflict** | same bible line; implies a voice channel between partners (WebRTC audio in `src/net`) |
| D-12 beacon (distinct light colour) + world pings, no partner marker, no live partner position on any map | Have (beacon) / **D wins** (marker) | story 4 goggle lights (Wren green, Moth amber), bible 8 colour-blind goggle colours = the beacon. Bible 5.10 HUD "team-mate markers" and C10 "team-mates see each other with a soft outline" give way. Field-menu map: static plan only |
| D-14 over-the-shoulder, strict corner peek | **D wins** | bible 5.3: "Corner peeking with the camera is allowed, as in CT. Guards detect the body, never the camera." changes to the strict form (the camera sees little the character cannot) |
| D-10 online, split-screen and LAN | **Conflict** (scope) | bible C19 direct connections only; G12 desktop PWA. LAN is a WebRTC case of online; split-screen (two pads, one screen, two cameras) is new render and perf work against `docs/systems/performance.md`. CT's PC version had no split-screen (`03` §1). D wins over G1; Michael confirms the scope and when |
| D-18 friendly fire host option, on by default | **D settles G49** | bible C8 "follow what CT co-op does" becomes D-18 |
| D-24 any partner can join a saved mission; progress belongs to the host | Have | bible C2 host resumes from their checkpoint and re-invites; clients keep no mission save |
| D-09 strictly two humans | Have | G2, G48, G50, G111 |
| D-13 standalone co-op story | Have | story 2.1 |
| D-01 modern day | Have | story 3 "Hollowmere, the present day" |
| D-08 difficulty scales perception, alert tolerance, resources; not sync windows | Partial | G106 fixed CT levels, no sliders, no alarm-tolerance setting: compatible if the fixed levels carry these values. Bible 5.13 scales damage taken (CT did); D-08 does not list damage. Michael decides whether damage still scales |
| D-03 30 s revive, 2 per mission | **D wins** | see #29; also level-design 11.4 constant |

### 3.7 Audio and atmosphere

| Kit rule | Fit | Our docs / proposal |
|---|---|---|
| Silence default; music arrives | Have | audio AS4 (Calm is silence until the music job) |
| State-driven layered score, short defined decay, never implies false detection | Have | bible S8, G63 (chase only after seen), G67 steps (Cautious after 0.6 s, Alert at once, Alert holds 10 s) |
| Duck under barks | New (once barks are voiced) | bible 5.7 barks are text today |
| Ambient floor as terrain; soundscape map per mission | Have | bible S2-S4, bible 7 "sound plan per space", level-design 5.3 |
| Coupled weather | New | **[STD]** 5 (weather appears only in the map-spec theme line today) |
| Benign threat signposting | New | **[STD]** 5 |
| Barks are UI: voiced per state, paired talk, evidence comments | Have (text) / Conflict (voice) | see #14 |
| Every critical-path lit area darkenable and draws a reaction | Have (stronger) | L8 two ways, level-design 5.2 (two ways to darken plus one to avoid) |
| Partner beacon readable at about 20 m in the darkest zone | Have (beacon) / New (test) | add the 20 m test to level-design 15 **[STD]** |
| Low-spec rule | Have | L2, level-design 5.4 (readable at Low) |
| Voiced guidance every mission | Conflict (timing) | G82 text now, voice later |

### 3.8 The map spec template (`docs/templates/map-spec.md`) against the kit

| Template part | Issue | Proposal **[TPL]** |
|---|---|---|
| Context | "Silent But Deadly" and the old branch flow | Night Shift; one branch per job from main (G83) |
| Scope | "No new ... objective types, net messages" | keep for map jobs; co-op moves and the Hold-Down behaviour come from the co-op job first |
| Building brief | no security fields | add facility tier, five layers, access control, two-person rules with reasons, weak sides with causes, the unusual circumstance tonight |
| Co-op routes | "Existing verbs only (brace and boost, human ladder, dual takedown) ... the solo route to the same surface" | rename "Co-op beats": the density table (1.9), each beat's real-world reason, alternative, failure outcome and minute; merge points; idle check; no solo route (G2) |
| Mission and modes | objectives without dependency tags; no twist, hard-fail or extraction fields | add the objective chain table (tier, source, dependency), the twist, the one hard rule, protected persons, the extraction, D-15 |
| (missing) | no pacing, wow or comms fields | add minute beat chart, three wow moments with the five tests, pings and callouts coverage |
| Phases / report | "Michael's phone notes", "manual phone checks" | desktop (G12) |

---

## 4. The co-op prototype's test level: what it must honour now, what can wait

The prototype (`docs/progress.md` job 2) is small: one test space, two players, the CT verbs. These kit rules matter at
that size because they decide whether the co-op feel can be judged at all:

**Must honour**
1. **The handshake** on every team move it has: initiate with a pose and a callout (text), a "ready" cue on the
   partner's screen, completion, graceful refusal with no penalty.
2. **Both tiers present:** at least one free-move use (Leg-Up / Ledge Relay at the 4.3-4.5 m band, G57) and, if any
   authored move is built, one authored anchor with an alternative beside it. If G81 (marked spots only) stands, the test
   level shows it; if Michael adopts the kit's free tier, the test level must have unmarked lips at the band to prove it.
3. **One hold-and-pass gate** (one player suppresses a camera or lamp while the other crosses, then swap), once Michael
   decides the disruptor's co-op behaviour.
4. **One Two-Key Action** with a tolerance window, a per-player ready state, a non-lethal failure (escalation) and
   success with callouts only (no voice).
5. **One Double Drop** on a pair of guards who watch each other.
6. **Fair shadows for two:** the L5 parity test passes in the space; each player's own meters are honest; the partner
   beacons (two colours) tell the players apart at about 20 m in its darkest spot.
7. **Per-intruder perception (D-16):** a guard who sees one player searches that player's last known position and does
   not know where the other is; the shared alarm level still rises.
8. **Escalation, not abort (D-02):** an alarm raises the level; nothing in the test space fails on detection.
9. **Rescue before reload (D-03):** a downed player has a 30 s window, 2 revives, both down reloads the checkpoint.
10. **A zero-failure path for two,** written step by step with both bodies, including one moment where both must cross
    the same lit or watched space.
11. **One split with a named merge point** and no idle stretch over about 60 s for either player inside the test.
12. **Architecture minimum:** every element in the test space has a one-line real reason (level-design 16.0, 16.9) and
    real sizes (scale sheet), so the prototype does not teach habits the maps must unlearn.
13. **Both must extract (D-15)** if the test has an exit.

**Can wait (mission scale or later jobs)**
- Pacing minutes, mission length, beat intervals, rest beats, signature set-piece variety.
- Objective chains, the objective twist, opportunity objectives, protected characters, randomised solutions (D-20).
- The three wow moments and their tests.
- Facility security profile (tier, five layers, alarm chain delays, control room, tour checkpoints).
- Music state table, ducking, voiced barks and voiced guidance, coupled weather, benign-threat signposting.
- Proximity voice (D-06), partner voice (D-17), split-screen and LAN (D-10).
- Per-mission complementary kits and "the kit states the rules" (D-11, #35); Feed Share, Hand-Off.
- Partner Launch, Belay Line, Drop Line, Stack unless the prototype builds them.
- Two stair cores, egress and signage rules (whole-building rules; a test space has no storeys to check).

---

## 5. The prompt library and our job method

The kit's prompt library is one self-contained prompt per process step (P0 brief, P1 premise, P2 security profile, P3
building programme, P4 objectives, P5 macro flow, P6 zones / guards / devices, P7 co-op beats, P8 stealth route, P9
pacing, P10 wow moments, P11 soundscape and lighting, P12 adversarial review, P13 assembly) plus five utilities (U1
mission concepts, U2 one set piece, U3 one wow moment, U4 audit an existing level, U5 originality check); each names a
role, the files to read, the task, one output file and a closing self-check against named checklist IDs. That shape
maps directly onto the orchestrator method in `docs/systems/session-method.md`: each P step becomes one implementer
subagent task (role and step from the prompt, our shared preamble with the branch guard and budget in front of it), its
self-check becomes the checker's input, P12's "careful pair / careless pair" review is the fresh checker (fix rounds go
back to the owning step, up to 3, then OPEN), and P13's assembly is the orchestrator's finish. P0-P3 fit level-design
section 14 phases 0-1 (setup, architecture), P4-P11 fit phase 2 (gameplay design, docs only), and the build phases have
no kit prompt, so they keep our own steps. To reuse the prompts: point their paths at our docs (`docs/design-bible.md`,
`docs/level-design.md`, this digest, the map folder per G55 instead of `missions/<slug>/`), update P0 from D-01..D-14 to
D-01..D-25 plus the G entries, make U5's term list our G6 banned-name scan, and keep the job docs (BRIEF, PLAN, STATE,
LOG, DECISIONS) in git as the method requires. U4 is ready-made for auditing Kestrel and the Fallow bunker when their
futures are decided (G53, G79), and U1 can test the story.md campaign table against the beat-variety rule.

---

## Appendix: proposed changes to the level standard and the map template (Michael's approval needed)

**`docs/level-design.md`**
1. Section 11: replace "Solo first" / "solo invariance" / "anyone can leave alone" with "Built for two": every zone
   designed for the pair; removing a player makes it impossible or clearly worse; two-person requirements have a written
   real-world reason; at least one vertical route per mission needs a team move (closes its open item 1).
2. Section 11 / 12.2: free moves usable wherever the geometry allows vs boosts at marked spots only (G81) - decide;
   then fix 11.5 (open item 3).
3. 11.4 and 12.1: revive becomes a 30 s window, 2 per mission, both down reloads (D-03); drop "there is no bleed-out".
4. New co-op beat minimums (1.9), idle under 60 s, split ends at a named merge, separation under about 3 min, roles
   alternate, multi-use moves, handshake and sync rules (tolerance window, ready state, non-lethal fail, pings only).
5. Section 6 / 13: beat chart gains minutes (small beat 2-4 min, set piece 6-10 min, rest 30-90 s, signature 1-2 not
   repeated); "objective twist" at 40-60% named so it does not clash with "teach, test, twist".
6. Section 3.1: the entry vantage fits both players; the climax space is seen before it is reached.
7. Section 5: machines show state in sight and sound with a visibly linked control; lit windows expose both ways
   (D-21); coupled weather; benign-threat signposting.
8. Section 6.4 / 8: the 2-minute "solution visible from the problem" test for gated obstacles.
9. Extraction: designed (under 2 min or a different route for half its length); both players must reach it (D-15).
10. Section 16: two separated stair cores per multi-storey building; exits open from inside and fire alarms release
    electric locks; realistic signage; device placement realism (sensor heights, beams mostly outdoors, camera
    detect / recognise / identify ranges and blind-spot causes, supervised wiring); every exploited security weakness has
    an in-fiction cause.
11. Section 13 deliverables: a security profile (tier, five layers, access control, two-person rules, weak sides, alarm
    chain), an objective chain table with dependency tags, three wow moments with the five tests, a communication plan
    (pings and callouts per team move).
12. Section 15 acceptance tests: zero-failure path for two bodies (replacing the solo ghost run); partner beacons tell
    the players apart at about 20 m in the darkest zone; a downed player is revived within the window on each co-op
    surface.

**`docs/templates/map-spec.md`**
1. Context: Night Shift; main as the only base (G83).
2. Building brief: security fields and "what is unusual tonight" (one opportunity, one complication).
3. "Co-op routes" becomes "Co-op beats" with the density table, merge points, idle check; no solo route (G2).
4. Mission: objective chain with dependency tags, the objective twist, at most one hard rule, protected persons,
   extraction for both players.
5. New fill sections: minute beat chart, three wow moments, communication plan.
6. Phases and report: desktop checks, not phone (G12).
