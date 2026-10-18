# 12 - Anti-patterns

This file has three parts:
- **Part A:** what the *Chaos Theory* co-op did badly.
- **Part B:** general stealth and co-op level failures from the design literature.
- **Part C:** unrealistic or illogical architecture and security, and how to prevent it.

**Sources:**
- 03, 04, 10 and 15 in this folder;
- `research_notes/reception.md`;
- `research_notes/stealth_coop_design_literature.md` (S-numbers refer to its sources);
- `research_notes/real_world_security_and_architecture.md` (R-numbers refer to its sources).

**Tags:** [VERIFIED - 2+ sources], [SINGLE SOURCE], [UNCERTAIN].

---

## Part A - What the original did badly

| # | Anti-pattern | Evidence | Tag | Prevention |
|---|---|---|---|---|
| A1 | **Full-mission restarts** in long missions, punishing with a weaker partner | EG review; GameCube has no mid-mission save; Steam "only as good as the weakest link" | [VERIFIED] | Encounter-level checkpoints. A downed partner becomes a rescue task before it becomes a reload |
| A2 | **Losing each other.** No map, no partner marker; partners wander hunting for each other | Eurogamer PC review; no marker documented anywhere | [VERIFIED for complaint; absence SINGLE SOURCE] | Partner indicator (diegetic if possible), world pings, a shared map, and regroup gates |
| A3 | **Solutions placed above the problem without a tell** (grille opened from a vent above; vent controlled by a distant computer; lower platform via a washroom ceiling) | JV forum (many posters), Neoseeker and Supercheats excerpts | [VERIFIED] | Visible cause and effect (cable runs, a lit panel, a sound when state changes); line of sight from the problem to the solution |
| A4 | **Unreadable machine state** (fans: what are they for?) | Neoseeker titles and excerpts | [SINGLE SOURCE] | Every machine shows its state in sight and sound, and its control is near or visibly linked |
| A5 | **Lethal precision sync puzzle** with trial-and-error deaths (cryo mixing) | Neoseeker, JV, Steam | [VERIFIED] | Forgiving timing, clear feedback per input, non-lethal failure (alarm or reset) |
| A6 | **Sync inputs failing on one platform** (PC two-person objects did not register) | 2 Steam threads + AnandTech | [VERIFIED] | Test every two-person interaction on every input method; always have a fallback |
| A7 | **Optional intel silently guards a hard fail** (skip the email, the target escapes by boat, mission over) | RYB + FAN RU | [VERIFIED] | Hard-fail prevention needs two or more cues; better, make the chase recoverable |
| A8 | **Rating cap bug** (Seoul cannot exceed 90%) | Steam + 5 videos | [VERIFIED] | Automated objective-completion tests; a score audit per mission |
| A9 | **Moves bound to fixed spots feel scripted** ("elaborate keys"; "press button, watch animation") | GameSpot snippet; Steam; Retro Spectives podcast | [VERIFIED] | Mix free moves with authored spots; give each move more than one use (traverse, attack, scout) |
| A10 | **Empty levels** (one dissent) | Eurogamer | [SINGLE SOURCE] | Density targets for encounters and set pieces per minute (see 09) |
| A11 | **Too few missions / too short** | ~12 critics | [VERIFIED] | Scope a campaign in line with expectations; plan post-launch content early |
| A12 | **Guards trip over each other and alert others** while players hide | EG | [SINGLE SOURCE] | AI collision and perception QA; never raise alerts from AI-to-AI accidents |
| A13 | **Scripted lethal objective in a no-kill-rewarding game** (contaminated soldier) | PRIMA + FAN RU | [VERIFIED] | Offer non-lethal alternatives, or explicitly exempt the beat and tell players |
| A14 | **Hidden countdown** (UN bomb timer not shown) | FAN RU | [SINGLE SOURCE] | Show timers. Hidden timers feel unfair |
| A15 | **Stacked instant-fail rules** (general alarm, metal detector, lit windows) | FAN RU + LP title | [SINGLE SOURCE] | One clearly communicated hard rule per mission at most; others escalate |
| A16 | **Ungrabbable named villain** breaks the established "grab the target" grammar | FAN | [SINGLE SOURCE] | Keep verb consistency, or signal the exception |
| A17 | **Music ambiguity.** Combat music outlives the fight, leaves players unsure whether they were seen, and drowns barks | Steam; GameGrin | [SINGLE SOURCE each] | Music follows real AI state with short tails; duck music under barks |
| A18 | **Split-screen leaks information** and undermines "seeing around corners" | VideoGamer | [SINGLE SOURCE] | Design for it: accept shared info, or use per-player fog |
| A19 | **Downloaded content not appearing / gated behind Elite completion** | Xbox site edit; GameSpot | [VERIFIED] | Deliver new missions to everyone, ungated |
| A20 | **Tutorial assumes solo knowledge**; input ambiguity (crouch = boost, stand = throw) | Steam; JV | [VERIFIED] | Teach the handshake and context rules explicitly; a co-op tutorial must stand alone |
| A21 | **Online-only features with no preservation** (servers shut; PC needs VPN workarounds; config mismatches desync) | Steam corpus | [VERIFIED] | LAN/direct-connect and peer-to-peer fallback; config parity checks at join |

---

## Part B - General stealth and co-op failures (from the literature)

| # | Anti-pattern | Why it hurts | Source (literature notes) | Tag |
|---|---|---|---|---|
| B1 | Trial-and-error / instant fail | Players learn rules by dying and stop experimenting | Bycer S68; Smith S43; Mark of the Ninja S1 | [VERIFIED] |
| B2 | Unreadable detection | Failure feels unfair; no planning possible | S1, S5, S8, S9, S10 | [VERIFIED] |
| B3 | AI that cheats (knows where you are without perceiving you) | Breaks the player's model | Thief S5; Halo 2 S12 | [VERIFIED] |
| B4 | No zero-failure path in an encounter | Stealth "doesn't work" | Smith S43 | [SINGLE SOURCE] |
| B5 | Area not actually well guarded, or loud play is easier | Stealth becomes pointless | Smith S43; Bycer S68 | [VERIFIED] |
| B6 | Perceived-affordance mismatch (a lit "safe" balcony; a dark but noisy floor) | Players avoid good spots or get caught unfairly | Smith S43 | [SINGLE SOURCE] |
| B7 | Unintended stealth properties (noisy tiles, doors and stairs nobody tuned) | Difficulty drifts | Smith S43 | [SINGLE SOURCE] |
| B8 | Oversized, unmappable spaces | Players get lost and cannot plan | S1; Hitman Paris S45; Dishonored S62 | [VERIFIED] |
| B9 | Long, narrow, winding passages | Disorientation | Dishonored S62 | [SINGLE SOURCE] |
| B10 | Static, memorised encounters in co-op | One optimal plan; the pair races; cooperation collapses | Left 4 Dead S15 | [SINGLE SOURCE] |
| B11 | Co-op bolted onto a single-player design | One player watches the other | Hazelight S27/S28; reviews S74 | [VERIFIED] |
| B12 | One player idle while the other acts | Boredom | S74, S75; Fares S29 | [VERIFIED] |
| B13 | A "co-op" puzzle one player can solve alone | Not real co-op | Portal 2 S24 | [SINGLE SOURCE] |
| B14 | Spatial communication without tools | Minutes lost explaining "here" | Portal 2 S24 | [SINGLE SOURCE] |
| B15 | The session ends when one player drops | Lost progress | Castle Crashers S71 | [SINGLE SOURCE] |
| B16 | Overpowered remote tools | Trivialise solutions | Gunpoint S56 | [SINGLE SOURCE] |
| B17 | Escape routes that lead into more guards ("frying pan into fire") | Unfair chases | Smith S43 | [SINGLE SOURCE] |
| B18 | Gamey limit rules with no fiction | Feel arbitrary | Payday pagers S19 + forum | [UNCERTAIN] |
| B19 | Coordination the player cannot perceive | AI looks dumb or omniscient | F.E.A.R. S10 | [SINGLE SOURCE] |
| B20 | Randomness inside a moment the player is reading | Unfair; plans break | Inference from S15 + S43 | [Design inference] |

---

## Part C - Unrealistic or illogical architecture and security

The original's strength was rooms with obvious functions. The architecture and security failures below are common in stealth games generally. Each prevention rule is grounded in real-world practice from `research_notes/real_world_security_and_architecture.md`.

### C1. Rooms with no purpose
- **Symptom.** Empty "connector" rooms, or rooms whose only reason to exist is a puzzle.
- **Prevention:**
  - Every room gets a real function, an occupant schedule (who uses it, when) and a reason for its contents.
  - Facility types have known room programmes (office tower, data centre, lab, hospital, port, hotel and so on). [R41-R64]
  - Puzzles must be expressed through the room's function: a lab fridge, a crane bay, a server room.

### C2. Corridors to nowhere and illogical circulation
- **Symptom.** Dead-end corridors, missing stairs, one-way buildings.
- **Prevention:**
  - Real buildings limit dead ends: about 4.5-6 m before an alternative or protection is needed. [VERIFIED - ADB R27, OSHA R28]
  - Real buildings provide two or more separated exit routes and protected stair cores.
  - Travel distance to an escape route is typically 18-45 m in offices. [R27]
  - Use these as layout constraints. They also create believable alternative routes.

### C3. Security a real facility would never use (or would never omit)
- **Symptoms:**
  - Lasers in an office corridor with no explanation.
  - Cameras covering nothing important.
  - A vault behind a single keypad.
  - A server room with no access control.
- **Prevention:**
  - Assign a security tier from mission criticality, symbolism, population, size and threat. [ISC R8]
  - Layer security from deter → detect → delay → respond across zones: beyond the perimeter, the perimeter, the site, the building, the asset. [NPSA R1-R6]
  - High-value spaces use two-factor access, mantraps or dual control. [R11-R16]
  - Exotic devices need a written justification in the fiction (the original justified its laser grid with an email about the breaker's placement).

### C4. Doors that defy fire code
- **Symptoms:**
  - Exit doors locked from inside.
  - A maglocked door that stays locked during a fire alarm.
  - A revolving door with no side door.
- **Prevention** (these are realistic and also design gifts):
  - Escape doors open from inside without a key. [VERIFIED - R27, R28]
  - Electric locks release on fire alarm or power loss. [R27]
  - Turnstiles and revolving doors have adjacent swing doors. [R27]
  - Exits are "easy out, hard in", which makes them one-way shortcuts.
  - Pulling a fire alarm unlocks maglocks, with consequences (an evacuation, a response).

### C5. Impossible vents
- **Symptom.** Person-sized ducts linking every room.
- **Real-world facts:**
  - Real ducts are mostly too small.
  - They run as vertical shafts branching into small horizontal ducts, with fans and grilles.
  - [VERIFIED - Kotaku architect S72 + PC Gamer S73]
- **Prevention:**
  - Use real crawlable spaces: ceiling voids and plenums, raised floors, service risers, cable trays, mechanical floors, loading docks, maintenance catwalks. [R41-R44]
  - Limit ducts to large air-handling trunks near plant rooms.

### C6. Inconsistent scale
- **Symptom.** Doors two metres wide in an office; stairs with giant steps; corridors that change width for no reason.
- **Prevention.** Use a dimension sheet:

  | Element | Typical figure | Source |
  |---|---|---|
  | Door clear width | about 0.8-0.9 m | ADA R29 |
  | Headroom | 2.0 m minimum | ADA, ADB K R29/R30 |
  | Stair rise | about 150-180 mm | R29, R30 |
  | Stair tread | 250-300 mm | R29, R30 |
  | Escape route width | 0.75-1.05 m+ by occupancy | ADB R27 |
  | Accessible route | 0.915 m, with passing places | ADA R29 |

  Scale player movement to these, not the reverse.

### C7. Illogical guard behaviour and staffing
- **Symptoms:**
  - Guards patrolling empty corridors forever.
  - No control room.
  - Every guard instantly knows everything.
- **Prevention:**
  - Real guards run tours with checkpoints and time windows. A missed checkpoint raises a supervisor alert, which gives a realistic "absence" detection mechanic. [R34]
  - A control room tracks intruders on CCTV and directs responders. [R4, R5]
  - Staff challenge strangers. [R2]
  - Alarm response is a *chain*:
    - a single sensor trip is ambiguous;
    - cross-zone confirmation or video verification follows;
    - then an operator call, then a keyholder or guard check, then police.
    - Response delays are real. [R31-R33]

### C8. Cameras placed by decoration
- **Symptom.** Cameras that watch walls, or cameras that identify faces from 50 m.
- **Prevention:**
  - Real CCTV has *detect / observe / recognise / identify* ranges. [VERIFIED - R23, R25]
  - Identification needs close, narrow coverage (entrances, tills).
  - Cameras go blind with glare, back-lighting, deep shadow and rapid light change. [R23]
  - Use these as readable rules for camera cones.

### C9. Sensors with no logic
- **Symptom.** Motion sensors in occupied daytime lobbies; laser beams indoors at random heights.
- **Prevention.** Use real sensor types with known mounting and weaknesses [VERIFIED - R14, R21, R22]:
  - door contacts;
  - PIR or dual-tech sensors at about 2.3 m in corners;
  - glass-break sensors;
  - vibration sensors on cases and walls;
  - IR beams mostly outdoors at 0.6-1.8 m.

  Systems are **armed when spaces are empty** and **supervised**: cutting a wire raises a fault, not silence. [R14, R31]

### C10. Facility that never "lives"
- **Symptom.** No sense of daily operation: no deliveries, shifts, cleaners or maintenance.
- **Prevention.** The mission template (Phase 4) requires a day-in-the-life:
  - opening and closing routine (the last person out sets the alarm [R32]);
  - deliveries via the loading dock;
  - maintenance;
  - night staff.

  Shift patterns are not well sourced (a gap), so treat them as design assumptions and state them.

### C11. Weak-side syndrome
- **Symptom.** A hardened front door, but an open skylight the size of a truck.
- **Prevention:**
  - Real guidance asks for *balanced delay* on all sides of an asset. [R6]
  - Any weak side the players exploit (a vent, a roof hatch, a maintenance window) should be explained as a known flaw: an ongoing renovation, an under-funded upgrade, a lazy contractor. That explanation is then a story beat.

### C12. Signage that tells the intruder everything
- **Symptom.** A "SERVER ROOM →" sign in a secure facility.
- **Real-world fact.** Real secure sites avoid signposting critical rooms. [R4, R5]
- **Prevention.** Navigation must come from building logic, intel and landmarks, not convenient signs. Public buildings may still have public signage.

---

## Part D - Quick red-flag list (used by LEVEL_REVIEW_CHECKLIST)

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
