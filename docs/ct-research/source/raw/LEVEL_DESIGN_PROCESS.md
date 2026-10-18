# LEVEL DESIGN PROCESS

This document takes a mission from a blank page to a finished, reviewable layout. It is split into short sessions, each owned by one named role. Every step has inputs, outputs and a pass/fail gate. If a gate fails, the step is repeated before moving on.

The steps are designed so that each can be run as one focused session (for example, one AI prompt from PROMPT_LIBRARY.md) and saved as a file.

## Roles

| Role | Responsibility |
|---|---|
| **Security Consultant** | Real-world facility security: risk tier, layers, devices, staff, response. Thinks like the facility's security manager |
| **Architect** | Real building programme, circulation, services, code compliance and scale |
| **Game Designer** | Premise, objectives, rules, failure model, pacing, scoring |
| **Level Designer** | Zones, routes, guard placement, encounters, the ideal stealth route |
| **Co-op Designer** | Two-person beats, communication aids, idle checks, wow moments |
| **Audio and Atmosphere Designer** | Soundscape, music states, barks, lighting plan |
| **Playtester/Critic** | Adversarial review against LEVEL_REVIEW_CHECKLIST.md; simulates two players |

## File naming

All outputs for mission `<slug>` go in `missions/<slug>/`. The numbered prefix matches the step. Example: `missions/<slug>/02_security_profile.md`.

## Step summary

| Step | Owner | Output | Gate |
|---|---|---|---|
| 0 | Game Designer | 00_brief.md | Decisions known |
| 1 | Game Designer | 01_premise.md | Premise test |
| 2 | Security Consultant | 02_security_profile.md | Security logic test |
| 3 | Architect | 03_building_programme.md | Architecture test |
| 4 | Game Designer | 04_objectives.md | Objective chain test |
| 5 | Level Designer | 05_macro_flow.md | Flow test |
| 6 | Level Designer + Security Consultant | 06_zones_guards_devices.md | Encounter test |
| 7 | Co-op Designer | 07_coop_beats.md | Co-op density and idle test |
| 8 | Level Designer | 08_stealth_route.md | Zero-failure test |
| 9 | Game Designer + Level Designer | 09_pacing.md | Pacing test |
| 10 | Co-op Designer | 10_wow_moments.md | Five-test gate |
| 11 | Audio and Atmosphere Designer | 11_soundscape_lighting.md | Readability test |
| 12 | Playtester/Critic | 12_review.md | Full checklist |
| 13 | Game Designer | MISSION.md (assembled template) | Sign-off |

---

## Step 0 - Brief and decisions (Game Designer)
- **Inputs:** DESIGN_BIBLE.md §12 decisions as currently answered; campaign context; target length.
- **Task:** List which D-xx decisions are answered and which are assumed for this mission. State the mission's position in the campaign and any constraints (facility type wanted, set pieces already used elsewhere).
- **Output:** `00_brief.md`.
- **Gate (pass if all are true):**
  - Every D-xx relevant to the mission has an answer or an explicit assumption.
  - Set-piece types already used in the campaign are listed.

## Step 1 - Premise (Game Designer)
- **Inputs:** `00_brief.md`; DESIGN_BIBLE.md §1-2.
- **Task:**
  - Write the one-sentence pitch, the story context and the stakes.
  - Give the in-fiction reason why this is a two-person job.
  - Choose a real-world facility type and a specific day and time with an unusual circumstance.
- **Output:** `01_premise.md` (template §1 and the first lines of §2.1).
- **Gate:**
  - The two-person reason is in the fiction, not just "the game is co-op".
  - The facility type is real and not a reskin of any existing game's mission.
  - The unusual circumstance creates at least one opportunity and one complication.

## Step 2 - Security profile (Security Consultant)
- **Inputs:** `01_premise.md`; DESIGN_BIBLE.md §6.2; research notes on real-world security if available.
- **Task:**
  - Describe how the facility really operates on that day.
  - Set its security tier.
  - Fill the five-layer table.
  - Define access control, two-person rules, the alarm chain with times, and the control room.
  - List known weaknesses, each with a fiction cause.
- **Output:** `02_security_profile.md` (template §2).
- **Gate:**
  - Every device class has a real reason.
  - The alarm chain has explicit delays.
  - Every two-person gate cites a real-world dual-control practice.
  - Weak sides are explained.
  - No device is exotic without justification.

## Step 3 - Building programme (Architect)
- **Inputs:** `01_premise.md`; `02_security_profile.md`; DESIGN_BIBLE.md §6.1.
- **Task:** Produce the building programme:
  - floors and zones;
  - every room with its function, users and hours;
  - circulation (stair cores, lifts, corridors, exits);
  - service spaces (risers, ceiling voids, plant, roof, docks);
  - a scale sheet.
- **Output:** `03_building_programme.md` (template §4 without gameplay roles), plus an ASCII block plan per floor.
- **Gate:**
  - Every room has a purpose.
  - There are 2+ separated stair cores per multi-storey building.
  - Dead ends are short.
  - Exits open from inside.
  - The hidden network uses real services with plausible sizes.
  - Dimensions follow the scale sheet.

## Step 4 - Objective chain (Game Designer)
- **Inputs:** steps 1-3; DESIGN_BIBLE.md §8.
- **Task:**
  - Write 3-6 primaries and 1-3 optionals, each with its in-world source and location.
  - Set the chain type and the twist at 40-60%.
  - State the hard-fail rule (at most one), protected persons, unwinnable-state prevention and scoring notes.
- **Output:** `04_objectives.md` (template §3).
- **Gate:**
  - Each objective names how it is discovered.
  - At least one two-body, one protect-while-act and one reach objective exist.
  - There is one twist.
  - There is at most one hard-fail rule.
  - Every unwinnable risk has 2+ cues or a recovery path.

## Step 5 - Macro flow (Level Designer)
- **Inputs:** steps 1-4.
- **Task:** Lay out the zone graph:
  - entry, objectives, overlooks, hub, merge points and exit;
  - loops and branches;
  - vertical layers;
  - landmark sightlines (the climax space seen early).
  - Draw an ASCII flow diagram.
- **Output:** `05_macro_flow.md`.
- **Gate:**
  - Every objective is reachable by 2+ routes, or by one justified route.
  - The climax space is visible earlier.
  - Extraction is designed (different route, or under 2 minutes).
  - There are no corridors to nowhere.
  - The layout is not recognisably similar to any existing game's map. Run the PROMPT_LIBRARY originality prompt.

## Step 6 - Zones, guards, devices (Level Designer + Security Consultant)
- **Inputs:** steps 2-5.
- **Task:**
  - Assign gameplay roles to zones.
  - Place every guard with a tour, checkpoints and routines.
  - Place non-guard occupants.
  - Place every device with height, coverage and blind spots.
  - Define alert states and tiers, and machine states.
- **Output:** `06_zones_guards_devices.md` (template §4-6 completed).
- **Gate:**
  - Each guard's post or tour has a real purpose.
  - Camera coverage respects detect / recognise / identify ranges.
  - Every device's blind spot has a real cause.
  - Every machine state is visible and audible.
  - Two-intruder perception is specified.

## Step 7 - Co-op beats and communication (Co-op Designer)
- **Inputs:** steps 4-6; DESIGN_BIBLE.md §3, §9.
- **Task:**
  - Place every co-op beat with timing, roles, justification, an alternative and the failure outcome.
  - Fill the density table and the multi-use list.
  - Define pings and callouts and partner-awareness use.
  - Run the idle check.
- **Output:** `07_coop_beats.md` (template §7 and §12).
- **Gate:**
  - Every DB §9 minimum is met.
  - Every move has 2+ uses.
  - Every split has a named merge point.
  - The longest idle stretch is under 60 s.
  - No "co-op" puzzle is solvable by one player.
  - Every two-key action has a tolerance window and a non-lethal failure.

## Step 8 - Ideal stealth route (Level Designer)
- **Inputs:** steps 5-7.
- **Task:**
  - Write the zero-failure path for two, step by step, with both players' positions and the reason each is undetected.
  - List alternative routes per encounter and the checkpoints.
- **Output:** `08_stealth_route.md` (template §8).
- **Gate:**
  - The route exists for every encounter and is verified for both bodies simultaneously.
  - Every encounter has an alternative.
  - No step relies on a hidden rule.
  - Checkpoints cap replay loss at about 10 minutes.

## Step 9 - Pacing (Game Designer + Level Designer)
- **Inputs:** steps 4-8; DESIGN_BIBLE.md §7.
- **Task:**
  - Produce the minute-by-minute beat chart with intensity.
  - Mark rests, signature set pieces, the twist and the exit.
  - Set the revive, checkpoint and escalation consequences.
- **Output:** `09_pacing.md` (template §9 and §13).
- **Gate:**
  - Small beats come every 2-4 minutes and major set pieces every 6-10 minutes.
  - Each set piece is followed by a rest.
  - No signature set piece repeats.
  - Total length is on target.
  - Separation never exceeds about 3 minutes without a merge or a sync.

## Step 10 - Wow moments (Co-op Designer)
- **Inputs:** steps 7-9; DESIGN_BIBLE.md §10.
- **Task:**
  - Specify at least one body, one sync and one story moment.
  - Score each on the five tests and name the amplifiers used.
- **Output:** `10_wow_moments.md` (template §10).
- **Gate:**
  - All three families are present.
  - All five tests pass for each moment.
  - At least one amplifier is used.
  - No moment duplicates an existing game's famous set piece.

## Step 11 - Soundscape and lighting (Audio and Atmosphere Designer)
- **Inputs:** steps 3, 6, 8, 9; DESIGN_BIBLE.md §11.
- **Task:** Produce:
  - the soundscape map;
  - the music state table and trigger points;
  - the bark plan and ducking rules;
  - the lighting plan;
  - weather and time with coupled effects;
  - a partner-beacon readability check.
- **Output:** `11_soundscape_lighting.md` (template §11).
- **Gate:**
  - Every zone has an ambient-floor class and a purpose.
  - The music state table covers all alert states with defined decay.
  - Every critical-path lit area is changeable and draws a reaction.
  - Loud non-hostile threat is signposted.
  - Beacons read in the darkest zone.

## Step 12 - Review (Playtester/Critic)
- **Inputs:** all step files; LEVEL_REVIEW_CHECKLIST.md.
- **Task:**
  - Simulate two players (a careful pair and a careless pair) through the mission.
  - Run every checklist item and record pass or fail with evidence.
  - List fixes, ranked.
- **Output:** `12_review.md`.
- **Gate:**
  - All "must" items pass.
  - Any "should" failure has an accepted reason.
  - The originality check passes.
  - If any must-item fails, return to the owning step.

## Step 13 - Assemble and sign off (Game Designer)
- **Inputs:** all step files.
- **Task:** Assemble the full MISSION_TEMPLATE.md instance and paste the review record into §16.
- **Output:** `MISSION.md`.
- **Gate:**
  - Every template field is filled or marked N/A with a reason.
  - No contradiction between sections (cross-check objectives against zones, guards against the route, and beats against pacing).
