# 10 - AI, detection and alarms (with two players)

How *Chaos Theory* models visibility and noise, how guards escalate, what alarms do in co-op on each platform, how bodies, cameras and guard communication work, and how the design keeps stealth fair and readable with two intruders. The last section draws on the wider stealth-design literature.

**Sources:** Prima Official eGuide (PRIMA, solo basics chapter and co-op chapter), Xbox manual (XBM), PS2 manual (PS2M), Fandom wiki (FW/RUW), Wikipedia (WP), Elder-Geek 2009 co-op review (EG), GamesFirst preview (GF), Steam threads, plus `research_notes/systems_rules.md` and `research_notes/stealth_coop_design_literature.md`.

**Tags:** [VERIFIED - 2+ sources], [SINGLE SOURCE], [UNCERTAIN].

---

## 1. Visibility (light)

- **Stealth meter.** Each agent's HUD shows a stealth (light) meter. At the far left the agent is effectively invisible. The more light on the agent, the further away guards can see him, and in a brightly lit space any guard with clear line of sight notices at once. [VERIFIED - PRIMA, XBM, PS2M]
- **The meter overrides appearance.** The meter, not how dark the scene looks, decides visibility. [SINGLE SOURCE - PRIMA] This is a known readability gap: what players see and what the system computes can disagree.
- **Lights are mutable.** Almost every artificial light can be shot out, switched off or temporarily disabled with the jammer (OCP).
  - Disabling a light alerts nearby guards (they notice the change).
  - The trade usually favours the player.
  - [VERIFIED - PRIMA, FW, WP]
- **Weather.** Lightning briefly changes light levels, which creates momentary windows. This is documented for solo missions. [SINGLE SOURCE - PRIMA]
- **Cameras.** Ordinary cameras can be beaten by darkness alone, and the jammer can hold them off. [Darkness SINGLE SOURCE - IGNW; jammer VERIFIED]
- **In co-op**, each agent has his own meter, and the second agent is a second body to hide. Missions repeatedly use **light as a shared resource**: one agent kills a light so the other can move, or holds a light off with the jammer (PS2/GC Seoul). [VERIFIED - PRIMA]

## 2. Noise (sound)

- **Noise meter.** Each agent's noise meter compares his own noise with a marker for the **ambient** noise of the area. Noise above the marker can be heard by nearby guards. [VERIFIED - PRIMA, XBM, PS2M, FW]
- **What changes noise:**
  - Moving slowly or crouched is quieter.
  - Floor material matters: grass and carpet are quiet, while metal and wood are loud.
  - Per the guide, walking with a weapon drawn is silent in normal conditions.
  - Grabs and interrogations make no game noise.
  - Using the OCP is silent, but some devices crackle when disabled, which can itself lure guards.
  - [SINGLE SOURCE - PRIMA for details; noise-vs-ambient VERIFIED]
- **How guards use noise.** Guards walk to the source of a sound to investigate. In a firefight they aim at the last spot where the player's noise rose above the ambient level. [SINGLE SOURCE - PRIMA]
- **Ambient sources are level-design tools:**
  - Generators, storms, machinery and the war ambience in Seoul raise the ambient marker and give players windows to move.
  - When generators are off, it gets quiet and dangerous.
  - [SINGLE SOURCE - PRIMA for solo examples; see 15_music_and_atmosphere.md]
- **Distractions.** In solo play, distractions include whistling, throwing objects and the sticky camera's clicker. In co-op the whistle button becomes the co-op action button, so the pair lures guards with:
  - the sticky camera noise;
  - shooting out lights;
  - noisy device failures;
  - on Xbox Live, **their own voices**: the headset microphone is heard by guards within a configurable radius (default about 2 m in game). [VERIFIED - XBM, PRIMA, GF]
- **Design note.** Voice detection is the most daring co-op detection rule. Real conversation between players becomes a stealth risk and a tool. It also enforces a whisper culture that adds tension. It can be switched off in options. [VERIFIED]

## 3. Guard behaviour and awareness

- **Graduated awareness.** Guards have a normal routine, a suspicious/searching state and an alert/combat state. A guard who sees a body, notices a shot-out light, or thinks he saw or heard something enters an alert state on his own, but **only rings an alarm once he is certain**. [SINGLE SOURCE - PRIMA wording; graduated alertness VERIFIED - PRIMA, FW, WP]
- **Investigation behaviour:**
  - Searching guards move slowly and carefully.
  - They use flashlights and flares, sometimes throwing them into dark areas.
  - They notice open doors, cut fabric and missing colleagues.
  - In combat they take cover, lean and shoot around corners, and use squad tactics.
  - Frightened guards fire wildly into shadows.
  - [VERIFIED - FW, WP]
- **Bodies.**
  - Bodies trigger an alarm only if a patrolling guard or an active camera actually sees them. Earlier games in the series used an automatic sweep. [VERIFIED - FW, WP]
  - A guard who finds a corpse goes to high alert immediately.
  - A guard who finds a knocked-out colleague kicks and revives him. That moment is itself an opening to take the reviver.
  - [SINGLE SOURCE - PRIMA]
- **Fixed alarm boxes.** Guards raise alarms by running to wall-mounted alarm panels.
  - A guard who flees instead of fighting is probably heading for one.
  - Shooting the guard who spotted you before he reaches a panel prevents the alarm.
  - [VERIFIED - PRIMA solo chapter (several mission sections) + FW Alarm]
- **Other alarm triggers:**
  - being seen on a camera;
  - failing or aborting a hack late;
  - presenting the wrong face to a retinal scanner;
  - lasers and motion detectors.
  - [VERIFIED - PRIMA, FW, XBM]
- **Two intruders.** No source describes whether the AI treats the two agents as one threat or two, or how it shares information about them. [GAP - OPEN_QUESTIONS R-06] One reviewer reports guards tripping over each other and alerting others while the agents were hidden. This is a glitch that made detection feel unearned. [SINGLE SOURCE - EG]

## 4. Alarms and escalation by platform

### 4.1 Xbox / PC (solo and co-op share the escalation)

The four-stage escalation [VERIFIED - PRIMA (solo), FW Alarm page, FW co-op mission notes, WP]:

| Alarm | Consequence |
|---|---|
| 1st | A freebie: guards respond, then write it off as a false alarm |
| 2nd | Guards put on body armour, roughly halving chest damage |
| 3rd | Guards add helmets, so headshots need a face hit |
| 4th | Every guard is permanently on high alert; co-op mission notes describe enemies fortifying positions, and the FW says guards set up furniture as cover |

- **An alarm is a temporary state.** Guards abandon routines, draw weapons and search for a while, then return to duty. [SINGLE SOURCE - PRIMA]
- **No mission abort from alarm count.** Unlike earlier entries in the series, alarms in this game never abort a mission on their own. [VERIFIED - PRIMA, FW]
  - In solo, objectives can be cancelled at maximum alarm. [VERIFIED - FW + user tip]
  - The co-op objective review shows only Completed or Failed, so how co-op handles this is unclear. [UNCERTAIN]
- **Alarms cost score.** [VERIFIED - XBM, PS2M, PRIMA]
- **Mission-specific hard rules override the escalation.** In UN Headquarters, a general alarm aborts the mission and lethal force on UN staff and civilians is forbidden. A Russian wiki note adds failure on being seen at lit windows or tripping the metal detector. [Abort and no-lethal VERIFIED - FW briefing + Ubisoft PR via WorthPlaying/VideoGamer; extras SINGLE SOURCE - RUW]
- **Seoul.** The co-op Seoul mission has an alarm system even though the solo Seoul mission does not. A briefing note warns that the surrounding gunfire is not necessarily aimed at the players (war ambience). [SINGLE SOURCE - FW]

### 4.2 PS2 / GameCube
- Each sub-level **fails on the third alarm**. [SINGLE SOURCE - FW, stated on about 14 sub-level pages]
- Secondary objectives such as "finish without a single alarm" reward clean play. [VERIFIED - FW, PRIMA]
- Bite-sized sub-levels plus a strict alarm cap make this build behave like the series' older "three strikes" model. [Analysis]

### 4.3 N-Gage / DS (separate game)
- Lambert warns after alarms one and two and aborts on the third. [VERIFIED - FW + GamesRadar review]
- Alarm level drops after checkpoints. No armour escalation. [SINGLE SOURCE - FW]

## 5. Failure, injury and alarms in co-op

| Rule | Detail | Confidence |
|---|---|---|
| Downed agent | An agent at zero health is unconscious, not dead. The partner has about 30 seconds to revive him; otherwise the mission fails. Revive is usable twice per game. | [VERIFIED - XBM, PS2M, PRIMA] |
| Protected NPCs | Missions fail if certain characters die: the vice president in Panama; the chemist in Seoul, who must be taken alive (the mission also fails if he escapes by boat). | [VERIFIED for the chemist - FW, PRIMA; VP SINGLE SOURCE - RUW] |
| Tripwire laser | Touching the laser strung between paired bombs in Train Station detonates them. | [SINGLE SOURCE - PRIMA] |
| Contamination | Entering the contaminated washroom in Train Station without the antidote kills the agent. | [SINGLE SOURCE - RUW] |
| Timers | A HUD timer appears when triggered. Examples: the UN bomb countdown; the 4-minute Gardens sub-level on PS2/GC. | [VERIFIED - XBM, PS2M; specifics SINGLE SOURCE] |
| Checkpoints | No automatic checkpoints on any platform. Xbox and PC pause menus have Quick Save, Save and Load; saving waits for the partner; a save reloads only with the same teammate. The PC reviewer's complaint is about the lack of automatic checkpoints. PS2/GC saves only at the end of each sub-level. | [VERIFIED - Xbox build + PC 1.05 menu text + speedrun rules; PS2/GC VERIFIED; R-07 closed] |

## 6. Scoring

- **Each agent gets his own success score**, compiled from team statistics. [VERIFIED - PRIMA, RUW]
- **A perfect score requires:**
  - no kills or injuries (knockouts are free);
  - never being recognised as an intruder (mere suspicion is fine);
  - no bodies found;
  - no alarms;
  - all objectives completed.
  - [VERIFIED - PRIMA, XBM, PS2M]
- **Civilian casualties** cost heavily (an automatic 0% in solo). [VERIFIED for solo - PRIMA, FW]
- **PS2/GC** adds a Hall of Fame and a "Stealth Award" per sub-level. [SINGLE SOURCE - PS2M]
- **Design value.** Scoring rewards non-lethal ghosting without making it mandatory, and the distinction between suspicion and being recognised gives players a margin for error.

## 7. Why stealth stays readable with two players (what the original did)

1. **Each player has a personal meter pair** (light plus noise) and sees the partner's health on Xbox. Each player always knows his own exposure. [VERIFIED]
2. **Escalation is gradual and does not end the mission** on Xbox/PC. Two players will make mistakes, and the game absorbs them with armour stages rather than a reload. [VERIFIED]
3. **Guards must perceive evidence** (no automatic body sweeps), so a pair can hide bodies and plan. [VERIFIED]
4. **Two-person security devices** (paired scanners, jammer-held cameras) are fixed in place and visible. The threat is known before it is engaged. [VERIFIED]
5. **Automatic voice lines** announce moves and downed partners, so detection-critical coordination does not depend on voice chat. [VERIFIED]
6. **Where it fell short:**
   - visibility that disagrees with what the scene shows (meter overrides appearance);
   - glitchy guard collisions causing unearned alerts;
   - no reported way to see what the partner's meter reads;
   - punishing restarts when one player fails.
   - [SINGLE SOURCE each - PRIMA, EG; partner meter is a gap]

## 8. Lessons from the wider stealth literature (for fairness with two players)

From `research_notes/stealth_coop_design_literature.md`; paraphrased principles with their origin.

| Principle | Origin | Two-player implication |
|---|---|---|
| Exposure and noise reach should be legible before the player commits | Mark of the Ninja's design rules; Thief | Both players should be able to read *each other's* exposure, not only their own |
| A glimpse should start a search, not an alarm; give graduated states | Mark of the Ninja; Thief; Metal Gear's alert-evasion-infiltration cycle | A partner's slip should give the other player time to act (cover, distract, rescue) |
| AI must decide only from what it perceives | Thief; Halo 2 | Two intruders are perceived separately; a guard who saw player A should not know where player B is |
| Guards talking to each other makes coordination legible | F.E.A.R. | Paired guard searches with call-and-response barks tell the pair what the AI believes |
| Give every encounter at least one zero-failure path, communicated but not obvious | Randy Smith, GDC 2006 | Verify a zero-failure path *for two bodies*, including the moment both must cross |
| Levels need scouting spots, connected safe "islands" and escape loops | Randy Smith | Scouting spots big enough for two; loops that let pairs split and regroup during a search |
| Cheap failure (encounter-level checkpoints, fast reload) | Mark of the Ninja | A partner's failure should become a rescue task for the other player before it becomes a reload for both |
| Instant-fail stealth breeds trial-and-error; offer graduated or fail-forward models | Bycer 2017; Payday 2; Invisible Inc. | Prefer escalation (armour, lockdowns, pressure) over abort, except in explicit hard-mode missions |

## 9. Gaps

- **R-06:** how the AI handles two intruders (shared alerts, separate searches).
- **R-07:** closed by the gap pass (see the Checkpoints row).
- Whether difficulty changes guard perception (Steam posters disagree).
- Whether a friendly-fire option exists (implied by an IGN tip and a wiki bug note).
- Whether both agents must reach extraction.

## Gap-closing notes

- **Voice feeds the sound meter.** Players recall that microphone speech registered on the in-game sound meter, so guards could hear it and be lured by deliberate noise. [VERIFIED - several Reddit threads] Xbox options include voice detection and its sensitivity. [SINGLE SOURCE - menu text]
- **The hard fails are confirmed from the level scripts:**
  - UN HQ: killing anyone, or a general alarm, aborts the mission. [VERIFIED - game text + designer comments]
  - Panama: killing the vice president fails the mission instantly. [VERIFIED]
- **Train Station's informant must not die early.** Killing him before the locker stage fails the mission. [SINGLE SOURCE - designer comments]
