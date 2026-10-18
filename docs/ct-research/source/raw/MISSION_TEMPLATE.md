# MISSION TEMPLATE

This is a fill-in-the-blanks template for one mission of an original two-player co-op stealth game.

- **How to fill it in.** Fill every field. Where a field does not apply, write "N/A" and a one-line reason. Field references in brackets point to DESIGN_BIBLE.md (DB) sections and principles (#).
- **Originality rule.** No names, places, layouts or set pieces from existing games. The review checklist runs an originality check (LEVEL_REVIEW_CHECKLIST.md §J).
- **Where it fits.** The template is filled step by step through LEVEL_DESIGN_PROCESS.md. Each section names the step and role that owns it.

---

## 0. Header
| Field | Value |
|---|---|
| Mission working title | |
| Version / date | |
| Owner(s) | |
| Campaign position (mission N of M) | |
| Target play time (average pair) | ___ min (DB §7: 30-60) |
| Design decisions this mission depends on (D-xx) | |
| Status of each review gate (§16) | |

---

## 1. Premise (owner: Game Designer, step 1)
- **One-sentence pitch** (who, where, why, what makes it a two-person job):
- **Story context.** What happened before, and what this mission changes:
- **Why two operatives, not one?** (the in-fiction reason):
- **Stakes.** What happens if the pair fails:
- **Tone notes:**

## 2. Real-world facility (owner: Security Consultant + Architect, steps 2-3)

### 2.1 Facility type and real-world reference
- **Facility type** (e.g. data centre, hospital wing, port terminal, broadcast centre, museum store, research lab):
- **What it really does, day to day** (5-10 bullets):
- **Who works there.** Roles, headcount by shift:
- **Day-in-the-life on the mission day and time.**
  - Shifts and handovers.
  - Deliveries.
  - Cleaning and maintenance.
  - Scheduled events (a test, an audit, a VIP visit, a holiday skeleton crew).
  - What is unusual today, and why.

### 2.2 Facility security profile [DB §6.2]
- **Security tier and why.** Criticality / symbolism / population / size / threat:
- **Primary asset(s)** and where they live:
- **Layers.** Fill one row per layer.

| Layer | Deter | Detect | Delay | Response |
|---|---|---|---|---|
| Beyond perimeter | | | | |
| Perimeter | | | | |
| Site | | | | |
| Building | | | | |
| Asset | | | | |

- **Access-control scheme.** General areas / sensitive rooms / asset:
- **Two-person rules in force** (real-world justification for each Two-Key Action):
- **Known weaknesses and their in-fiction causes** (renovation, budget, contractor, habit) [DB §6.2 rule 3]:
- **Alarm chain.** Sensor trip → verification → operator → guard check → outside response. Include times in minutes:
- **Control room.** Location, staffing, what it can do (lock doors, pan cameras, call response):

## 3. Objective chain (owner: Game Designer, step 4) [DB §8]

| # | Tier (P/S/O) | Objective | How players learn of it (in-world source) | Where it is | Co-op dependency type | Fail state (if any) |
|---|---|---|---|---|---|---|
| 1 | P | | | | | |
| 2 | | | | | | |

- **Chain type.** Recipe / investigation / event-gated / extension:
- **Mid-mission twist** (one, at 40-60%). What changes, and how both players learn it together:
- **Hard-fail rule.** At most one. State it, and say how it is shown in the briefing, in-world and on the HUD:
- **Protected persons** (clearly marked):
- **Unwinnable-state prevention.** Each risk with its 2+ cues, or its recovery path:
- **Scoring notes** (clean rating rules; scripted-kill exemptions per D-04):

## 4. Zone list (owner: Architect + Level Designer, steps 3 and 6)

One row per zone, with every room listed with a real purpose.

| Zone ID | Zone name | Floor/level | Rooms (each with real purpose and users) | Opening hours / occupancy on mission night | Security devices (type, placement, real reason) | Gameplay role (encounter / rest / overlook / set piece / hub) |
|---|---|---|---|---|---|---|
| Z1 | | | | | | |

**Checks:**
- Every room has a function.
- There are at least two separated stair cores per multi-storey building.
- Dead ends stay short.
- The hidden network uses real service spaces [DB §6.1].

**Scale sheet confirmation.** Door, stair and corridor dimensions used:

## 5. Guard roster and patrol logic (owner: Level Designer + Security Consultant, step 6)

| Guard ID | Role (static post / tour / control room / response / staff) | Zone(s) | Tour checkpoints and time windows | Routine behaviours (smoke break, radio check, fixes lights) | Paired with | Reaction to evidence | Notes |
|---|---|---|---|---|---|---|---|
| G1 | | | | | | | |

- **Non-guard occupants** (staff, cleaners, contractors, visitors), with their routines:
- **What happens when a guard misses a checkpoint:**
- **Two-intruder handling.** Per-intruder perception, and how search targets the last known position:
- **Alert states and tiers used in this mission** [DB §5.4-5.5]:

## 6. Security systems (owner: Security Consultant, step 2; placed in step 6)

| Device ID | Type (contact / PIR / dual-tech / beam / camera / reader / mantrap / lock) | Location and height | What it covers (detect / recognise / identify range for cameras) | Blind spots and real cause (glare, back-light, shadow, angle) | Armed when? | What a trip does (alarm-chain step) | Player counter(s) |
|---|---|---|---|---|---|---|---|
| D1 | | | | | | | |

- **Two-Key devices** (paired readers, dual-control panels): list each with its tolerance window:
- **Machines with state** (fans, lifts, shutters, cranes, pumps), with on/off visuals and sounds and where the control sits [DB #22]:

## 7. Co-op beats (owner: Co-op Designer, step 7) [DB §3, §9]

| Beat ID | Zone | Type (hold-and-pass / leg-up / ledge relay / launch / belay / drop line / stack / two-key / living key / double drop / spotter-operator / feed share / parallel routes / protect-while-act / escort) | Who does what (Player 1 / Player 2) | Real-world justification | Alternative route or solution | Failure outcome | Minutes from start |
|---|---|---|---|---|---|---|---|
| B1 | | | | | | | |

**Density check against DB §9 minimums:**

| Requirement | Planned |
|---|---|
| Hold-and-pass ≥ 3 | |
| Free-move traversals ≥ 3 | |
| Authored set piece ≥ 1 | |
| Split-and-sync ending in a Two-Key Action ≥ 1 | |
| Protect-while-act ≥ 1 | |
| Information asymmetry ≥ 1 | |
| Double Drop ≥ 1 | |
| Parallel routes with a merge ≥ 1 | |

**Multi-use moves.** For each move used, list 2+ purposes:

**Idle check.** The longest stretch where one player waits (target < 60 s):

## 8. Ideal stealth route (owner: Level Designer, step 8)
- **Zero-failure path for two**, step by step, with both players' positions and timings:

| Step | Player 1 | Player 2 | Threats active | Why undetected |
|---|---|---|---|---|
| 1 | | | | |

- **Alternative routes** (at least one per major encounter): loud/fast, slow/safe, vertical:
- **Merge points** (named):
- **Checkpoint placement:**

## 9. Pacing curve (owner: Game Designer + Level Designer, step 9) [DB §7]

| Minute | Beat | Intensity (1-5) | Type (opening / build / set piece / twist / rest / climax / exit) |
|---|---|---|---|
| 0 | | | |

- **Rest beats** after each set piece:
- **Signature set pieces** (1-2, not repeated):
- **Extraction design:**

## 10. Planned wow moments (owner: Co-op Designer, step 10) [DB §10]

| Family | Moment (one sentence) | Spectator | Agency | Mutual need | Readability | Retell | Amplifier used |
|---|---|---|---|---|---|---|---|
| Body | | ☐ | ☐ | ☐ | ☐ | ☐ | |
| Sync | | ☐ | ☐ | ☐ | ☐ | ☐ | |
| Story | | ☐ | ☐ | ☐ | ☐ | ☐ | |

## 11. Soundscape and lighting plan (owner: Audio and Atmosphere Designer, step 11) [DB §11]
- **Soundscape map.** Each zone's ambient floor (quiet / medium / loud), its sources, and its gameplay purpose:

| Zone | Ambient floor | Sources | Purpose (sneak window / danger / masking voices) |
|---|---|---|---|

- **Benign-threat signposting** (if loud threat is not aimed at the players):
- **Music state table:**

| Alert state / tier | Layers | Attack | Decay |
|---|---|---|---|

- **Trigger points** where music first enters:
- **Bark plan.** State-change lines, paired-guard exchanges, evidence comments; where music ducks:
- **Lighting plan.** Pools and dark per zone, changeable lights on the critical path, guard reaction to each change, landmark lighting seen from dark routes:
- **Weather and time** (if any), with the coupled effects:
- **Partner beacon readability check** in the darkest zone:

## 12. Player communication aids (owner: Co-op Designer, step 7)
- **Ping and callout coverage** for every two-person move and two-key action:
- **Partner awareness UI** used (per D-12):
- **Voice-in-simulation rules** (per D-06):
- **Guidance channel** (who guides the pair, voiced or not, and what they cover) [DB #36]:

## 13. Failure, revive, checkpoints and loadout (owner: Game Designer, step 9) [DB #29, #35]
- **Revive window and count** (per D-03):
- **Checkpoints** (list), with the maximum replay loss:
- **Escalation consequences** per alert tier:
- **Loadout per player**, and how it signals any special mission rule [DB #35]:

## 14. Estimated play time
| Profile | Estimate | Basis |
|---|---|---|
| Expert ghost pair | | |
| Average pair | | |
| First-time casual pair | | |

## 15. Risks and open questions
-

## 16. Review record (filled by Playtester/Critic, step 12)
Paste the LEVEL_REVIEW_CHECKLIST.md results here, with the pass/fail of each section and the fixes made.
