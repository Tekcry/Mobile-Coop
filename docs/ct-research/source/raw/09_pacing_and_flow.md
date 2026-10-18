# 09 - Pacing and flow

This file covers:
- how the *Chaos Theory* co-op missions open, escalate, breathe and climax;
- how mission length relates to objective density;
- how players are kept oriented without UI clutter.

It draws on `04_mission_breakdowns/`, `15_music_and_atmosphere.md`, and `research_notes/stealth_coop_design_literature.md` (the general principles).

**Tags:** [VERIFIED - 2+ sources], [SINGLE SOURCE], [UNCERTAIN]. Pacing labels such as "peak" or "rest" are our analysis of documented beat orders.

---

## 1. Length and density

| Mission (Xbox/PC) | Primaries (+ optional) | Expert ghost run | Typical stealth run | Casual run | Main co-op set pieces |
|---|---|---|---|---|---|
| Training | 8 lesson objectives | 3-4 min | - | 9-16 min | One per objective |
| Panama | 3 (+0) | ~8 min (speedrun) | 16-35 min | 41-52 min | Captive scan; Hangover; laser relay ×2 |
| Seoul | 5 (+2) | ~13-20 min | 20-35 min | 34-60 min | Turret flank; shoulder demolition ×2; escort |
| Chemical Bunker | 6 (+1) | ~10-27 min | 25-45 min | 45-80 min | Rappel; cryo mix; captive scan; Hangover; throw; crane; wire cut |
| Train Station | 6 (+2-3) | 11:41 | 13-35 min | 30-70 min | Wire cut ×3; payphone Hangover; single-entrant room; train exit |
| Nuclear Plant | 2 (+1 secondary +1 opportunity) | 22:44 | ~30 min | 48-108 min | Turbine throw/rope (others undocumented) |
| UN HQ | 5 (+0) | 21:32 | ~34 min | 43-86 min | Undocumented |

Lengths are [VERIFIED - multiple video lengths, see the 04 files]. Objective counts are [VERIFIED - FAN].

**Observations (analysis):**
- **Primary rate.** Missions run about one primary objective per 5-10 minutes of careful play.
- **Set-piece rate.** Co-op set pieces come every 5-8 minutes. Small hold-and-pass beats fill the gaps every 2-3 minutes.
- **Length range.** A mission is 30-60 minutes for an average pair. Critics found the *campaign* short (4-6 hours), not the missions. [VERIFIED]
- **Longest mission.** The downloadable Nuclear Plant has the fewest primaries and is the longest. A low objective density and long traversal is a likely factor in its stuck-point complaints. [UNCERTAIN]

---

## 2. Mission shape (open → escalate → breathe → climax)

### 2.1 Openings
- **Quiet exterior or service entry with a soft first co-op move.** This re-teaches the core verb without danger:
  - Panama: a dark courtyard and boost into a window;
  - Seoul: an alley and boost into a hotel hole;
  - Chemical Bunker: a surface pad and rappel down a silo;
  - Train Station: a sewer pipe traverse.
  - [SINGLE SOURCE - PRIMA routes]
- **Briefing tone.** The briefing sets tone and stakes; one briefing even calls the job easy before a twist. [VERIFIED]

### 2.2 Escalation
- **Growing devices.** Security devices get denser and more complex. Panama goes from keypads, to a camera corridor, to a two-scanner door, to a laser grid.
- **Twists that re-scope objectives** at roughly the 1/3 to 2/3 mark:
  - Panama: the archive is wiped;
  - Seoul: the target is a double;
  - Train Station: the phone call reveals a contaminated soldier;
  - UN HQ: the colonel already holds the security room.
  - [VERIFIED for existence of the twists]
- **Bigger, more open spaces later.** Chemical Bunker moves to the crane bay, Train Station to the great hall, Seoul to the temple arenas.

### 2.3 Breathing spaces
- **Dark service spaces after peaks:**
  - Seoul: sewers and a dark fish-shop interior with a medkit after the vehicle demolitions;
  - Chemical Bunker: elevators and crate halls after the cryo mix.
  - [SINGLE SOURCE - PRIMA]
- **Forced waits that double as story:**
  - Train Station: listening to the call;
  - Chemical Bunker: overhearing the technicians.
  - [VERIFIED wait; content SINGLE SOURCE]
- **Load screens** between PS2/GC sub-levels act as rests. One reviewer found them too long. [SINGLE SOURCE - NWR]
- **Comic relief:** the radio crossover in Seoul. [SINGLE SOURCE - RYB]

### 2.4 Climaxes
- **Synchronized or high-stakes act near the end:**
  - Chemical Bunker: crane, then wire cut;
  - Train Station: final platform and a leap onto the escaping train;
  - Seoul: cafe breach and carry-out;
  - UN HQ: hidden-timer bomb;
  - PS2/GC Panama: three co-op moves chained, then a captive scan to end the campaign.
- **Extraction** is usually short, but sometimes a full reverse traversal (Panama's long exit; Seoul's carry).

### 2.5 Generic curve (from the four retail missions)
```
tension
  ^             peak 1 (first big sync)        peak 2 (climax set piece)
  |               /\                              /\
  |    entry     /  \   twist   rest   build     /  \  exit
  |  __/\_______/    \__/\_____/\_____/\________/    \__
  +--------------------------------------------------------> time
     soft co-op   hold-and-pass beats every 2-3 min
```

---

## 3. Signposting without UI clutter

The original has a sparse HUD: meters, partner health, an action icon, an alarm counter and a text box. **No waypoints or partner markers are documented** (R-11). Navigation therefore relies on the following.

| Signpost | How it works | Evidence |
|---|---|---|
| **Objective text that names places** | Objectives and in-game mission notes describe the route ("archives in the main control room near the turbine area"; "security room on the 22nd floor"; "hall in the second building"; "reach the cafe by the fish market") | [VERIFIED - FAN mission notes; Nuclear Plant and UN HQ notes read like a route script] |
| **Intel as signposts** | Emails and interrogations give door codes and locations ("the target was moved to the cafe"; "the antidote is in a locker") | [VERIFIED] |
| **Architecture with obvious function** | Real room types (archive, server room, lab, crane bay, ticket hall, washroom) tell players what is where | [Analysis; supported by Dishonored-2 orientation principle in literature notes] |
| **Landmarks and overlooks** | Seeing a future room early (the missile storage overlook) and grand public spaces (the station hall, the temple) orient players | [SINGLE SOURCE - PRIMA] |
| **Guard chatter and barks** | Overheard talk reveals guard positions and intent, and sometimes objectives (technicians; the phone call) | [VERIFIED - 15 §2.2] |
| **Light** | The route often lies through areas players darken themselves. Lit spaces read as danger, dark ones as safe. Neon and billboards act as landmarks | [VERIFIED as pervasive] |
| **Sound** | Machinery hum (noise-masking zones), war ambience, a fountain near a path | [VERIFIED system] |
| **Placed move affordances** | Contextual moves appear in the interaction menu only at valid spots; training used striped floor squares | [VERIFIED; squares SINGLE SOURCE] |
| **Loading-screen hints** | Hints shown at load | [SINGLE SOURCE - XBM] |
| **Partner voice / automatic callouts** | Partners tell each other where they are; canned lines cover players without voice | [VERIFIED] |

**Where signposting failed** (from the stuck-point evidence in the 04 files):
- **Solution above the problem.** Players stared at a grille rather than the vent above it (Panama Xbox).
- **Hidden state of a machine** (Nuclear Plant fans).
- **A vent closed by a remote computer** that players didn't know about (PS2/GC Panama East Wing).
- **A route through a washroom ceiling** (Train Station lower platform).
- **Losing each other with no map** (Eurogamer review).

**Lesson.** Vertical, remote or state-based solutions need a stronger tell than horizontal ones.

---

## 4. How players always know where to go next (and when they don't)

1. **An objective names a destination type**; real-world architecture tells players where that type of room lives.
2. **Intel adds the precise key**: a code, a floor or a person.
3. **The level funnels through two-person gates.** Each gate is a forced regroup, so the pair cannot drift far apart for long.
4. **One-way drops** stop backtracking after key beats.
5. **Failure mode: losing the partner.** No partner marker exists, and split-screen leaks information. Online players without voice depend on canned callouts. [VERIFIED - Eurogamer + reviewers]

---

## 5. Lessons from the literature applied to co-op pacing

From `research_notes/stealth_coop_design_literature.md`:

| Principle | Source | Co-op application |
|---|---|---|
| Alternate stealth-friendly and unfriendly spaces to create tension and relief | Randy Smith GDC 2006 | Put the rest beats after each sync set piece, as the original did |
| Build-up → peak (short) → fade → relax (30-45 s) | Left 4 Dead AI director slides | A paired set piece should be followed by a short low-threat stretch for regrouping and talk |
| Scouting spots let players plan | Smith; Payday 2 | Overlooks big enough for two, with sightlines for both |
| Mentally mappable encounter spaces | Mark of the Ninja | Encounter spaces sized so both players can describe them to each other |
| Co-op pacing is harder because triggers can't assume where the partner is | Hazelight interviews | Use regroup gates and "both present" triggers before scripted events |
| Light leads; landmarks ("weenies") pull | Scott Rogers GDC 2009 | Show lit landmarks *from* dark routes rather than lighting the route |

---

## 6. Pacing targets suggested by the evidence (analysis; carried into the design bible)

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
