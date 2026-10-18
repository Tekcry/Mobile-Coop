# LEVEL REVIEW CHECKLIST

Concrete pass/fail checks for any mission built with MISSION_TEMPLATE.md and LEVEL_DESIGN_PROCESS.md.

**How to use**
- Mark every item **PASS**, **FAIL** or **N/A**, with one line of evidence (a template section, beat ID, zone ID or minute mark).
- **MUST** items block sign-off. **SHOULD** items need either a fix or a written reason for accepting the miss.
- Record the results in MISSION_TEMPLATE §16 using the table format at the end of this file.
- References in brackets point to DESIGN_BIBLE.md (DB) sections and principles (#).

---

## A. Architectural logic [DB §6.1, #17, #19, #20]

| ID | Level | Check |
|---|---|---|
| A1 | MUST | The facility type is real, and its day-to-day operation on the mission day is described (shifts, deliveries, cleaning, maintenance, the unusual circumstance). |
| A2 | MUST | Every multi-storey building has at least two separated stair cores. Lifts sit in cores with risers beside them. |
| A3 | MUST | No dead-end corridor longer than about 5 m without a reason (store room, plant room) or an alternative route. |
| A4 | MUST | Every exit door opens from the inside without a key. Electric locks release on fire alarm. Any deviation is explained in the fiction (for example a detention area). |
| A5 | MUST | Hidden and crawl routes use real building services of plausible size: ceiling voids, raised floors, risers, plant floors, roofs, catwalks, loading docks, large trunk ducts near plant only. There are no person-sized ducts linking every room. |
| A6 | SHOULD | Circulation reads like a real building: lobbies near entrances, service corridors behind public spaces, plant grouped. |
| A7 | SHOULD | Secure facilities do not signpost critical rooms. Public signage appears only in public areas. |

## B. Every room has a real purpose [DB #17]

| ID | Level | Check |
|---|---|---|
| B1 | MUST | Every room on the plan is labelled with its function, its users and its hours. |
| B2 | MUST | No room exists only for gameplay. Each puzzle is expressed through the room's real function (for example a records room, cold store, server hall, workshop or control room). |
| B3 | SHOULD | Room contents match the function: furniture, equipment and signs of use. |
| B4 | SHOULD | At least one room shows "life" (a half-finished task, a shift log, a radio), and it tells players something useful. |

## C. Scale consistency [DB §6.1 rule 5]

| ID | Level | Check |
|---|---|---|
| C1 | MUST | Door, stair, corridor and headroom dimensions fall within the scale sheet: door ~0.8-0.9 m clear (service doors wider), headroom ≥2.0 m, stair rise 150-180 mm and going 250-300 mm, corridors ≥0.9 m. |
| C2 | MUST | Character movement metrics (crouch height, ledge-grab height, leg-up height, launch distance) are consistent across the mission. Geometry is built to them, never stretched. |
| C3 | SHOULD | Exterior scale (storey heights, window spacing, vehicle sizes) is consistent with the interior. |

## D. Route readability [DB #21-#24; §5]

| ID | Level | Check |
|---|---|---|
| D1 | MUST | For each objective, the template states how players learn where to go, and that source exists in the world. |
| D2 | MUST | At every gated obstacle, the solution is visible from the problem (sightline, cable run, lit control, state sound). A first-time playtester locates it within 2 minutes without hints. |
| D3 | MUST | Every state-changing machine shows its state in sight and sound, and its control is visibly linked to it. |
| D4 | SHOULD | The climax space or a major landmark is seen before it is reached. |
| D5 | SHOULD | At least one overlook before each major encounter fits both players and shows the key elements. |
| D6 | SHOULD | Extraction is designed: a different route for at least half its length, or under 2 minutes long. |

## E. Co-op beats: number, spacing and quality [DB §3, §9; #1-#9]

| ID | Level | Check |
|---|---|---|
| E1 | MUST | Every DB §9 minimum is met (hold-and-pass ≥3, free-move traversals ≥3, authored set piece ≥1, split-and-sync with Two-Key Action ≥1, protect-while-act ≥1, information asymmetry ≥1, Double Drop ≥1, parallel routes with merge ≥1). |
| E2 | MUST | Small co-op beats occur every 2-4 minutes and major set pieces every 6-10 minutes on the critical path (beat chart evidence). |
| E3 | MUST | Removing the second player makes each zone impossible or clearly worse. No "co-op" puzzle can be solved by one player. |
| E4 | MUST | No stretch longer than about 60 s where one player only waits (idle check evidence). |
| E5 | MUST | Every split has a named merge point. Separation never exceeds about 3 minutes without a merge or a sync. Each player can always tell where the partner is. |
| E6 | MUST | Every Two-Key Action has a tolerance window, a visible "ready" state per player, a non-lethal failure, and works with pings and callouts only (no voice). |
| E7 | MUST | Every two-person requirement has a written real-world justification (dual control, paired devices, a single dose, etc.). |
| E8 | SHOULD | Every co-op move used in the mission serves two or more purposes somewhere in it. |
| E9 | SHOULD | Every authored move spot has an alternative, or a fiction-backed reason why only that move works. |
| E10 | SHOULD | Roles alternate: neither player is always the "platform" or always the "actor". |
| E11 | SHOULD | The mission includes at least one information-asymmetry beat where only talk or pings can solve it. |

## F. Stealth viability [DB #10, #15; §8]

| ID | Level | Check |
|---|---|---|
| F1 | MUST | A zero-failure path for two exists through every encounter. It is written step by step with both players' positions, including moments when both cross the same space. |
| F2 | MUST | Every encounter offers at least one alternative route or approach (loud/fast, slow/safe or vertical). |
| F3 | MUST | Every lit area on the critical path has at least one player-changeable light, and changing it draws a usable guard reaction. |
| F4 | SHOULD | Patrols create windows of opportunity. No static guard permanently blocks the only crossing. |
| F5 | SHOULD | Scouting, search and escape phases all have level support: safe spots, loops ("ring" routes), and routes guards cannot easily follow. |
| F6 | SHOULD | Escape routes do not lead straight into more guards. |

## G. Detection fairness [DB §5; #11-#14]

| ID | Level | Check |
|---|---|---|
| G1 | MUST | Exposure values match the rendered lighting everywhere on the critical path. No "looks dark but is lit" spots. |
| G2 | MUST | Every alert can be traced to a specific perception event. Guards never act on information they did not perceive. Two-intruder perception is specified. |
| G3 | MUST | Alert states and tiers are defined, and each has a distinct bark, animation and music layer. |
| G4 | MUST | The mission has at most one hard-fail rule. It is stated in the briefing, reinforced in-world and shown on the HUD when relevant. |
| G5 | MUST | No hidden timers. |
| G6 | MUST | Anything that prevents an unwinnable state has two or more cues, or the resulting state is recoverable. |
| G7 | MUST | Cameras respect realistic detect, recognise and identify ranges, and their blind spots have real causes (glare, back-light, shadow, angle). |
| G8 | SHOULD | Each player can read the partner's exposure and noise from their own screen. |
| G9 | SHOULD | Guards in pairs exchange lines. Music ducks under barks within earshot. |
| G10 | SHOULD | A single sensor trip is treated as ambiguous (checked), with escalation on confirmation, consistent with the facility's alarm chain. |

## H. Security logic [DB §6.2; #18]

| ID | Level | Check |
|---|---|---|
| H1 | MUST | The facility security tier is justified by criticality, symbolism, population, size and threat. |
| H2 | MUST | The five layers (beyond perimeter, perimeter, site, building, asset) are each described with deter, detect, delay and response. |
| H3 | MUST | Every device has a real reason to be where it is. No valuable room lacks appropriate security. |
| H4 | MUST | Every weak side players exploit has an in-fiction cause. |
| H5 | SHOULD | Guard tours have checkpoints and time windows, and a missed checkpoint has a consequence. |
| H6 | SHOULD | The alarm chain has explicit delays, and those delays are used as gameplay windows. |
| H7 | SHOULD | Exotic or lethal automated defences appear only where decision D-05 allows. |

## I. Pacing, failure and loadout [DB §7; #25-#30, #35]

| ID | Level | Check |
|---|---|---|
| I1 | MUST | The mission length estimate for an average pair is within 30-60 minutes (or a documented exception). |
| I2 | MUST | There is exactly one objective twist, at 40-60% of the mission, delivered in-world to both players. |
| I3 | MUST | There is a rest beat after each major set piece. |
| I4 | MUST | A downed player gets a rescue window. Checkpoints cap replay loss at about 10 minutes. |
| I5 | SHOULD | The objective chain moves the pair into new space with each objective. |
| I6 | SHOULD | The number of primary objectives is 3-6, and of optional objectives 1-3, each with an in-world source. |
| I7 | SHOULD | Scripted violence is consistent with the violence stance (D-04). Any exemption is stated. |
| I8 | SHOULD | The loadout signals every special mission rule: a reviewer shown only the loadout screen can guess it. |

## J. Wow moments [DB §10; #31]

| ID | Level | Check |
|---|---|---|
| J1 | MUST | At least one Body, one Sync and one Story moment are planned. |
| J2 | MUST | Each planned moment passes all five tests: spectator, agency, mutual need, readability, retell. |
| J3 | SHOULD | At least one amplifier is used: a move that doubles as an attack; hidden information only one player sees; an altitude change with a view; or a real device used for its real purpose in an unexpected way. |
| J4 | SHOULD | No signature set-piece type repeats within the mission or duplicates another mission's signature in the campaign. |

## K. Audio and atmosphere [DB §11; #32-#34, #36]

| ID | Level | Check |
|---|---|---|
| K1 | MUST | A soundscape map gives every zone an ambient-floor class and a gameplay purpose. |
| K2 | MUST | The music state table covers every alert state, with defined attack and decay. Music never implies detection that did not happen. |
| K3 | MUST | Partner beacons are readable in the darkest zone at about 20 m and distinguish the two players. |
| K4 | SHOULD | Loud, non-hostile threat sounds are signposted in-world. |
| K5 | SHOULD | Lighting is staged (clear pools and clear dark). Landmarks are lit and seen from dark routes. |
| K6 | SHOULD | Any weather is coupled to several readable gameplay effects. |
| K7 | SHOULD | The guidance channel is voiced for the whole mission (text only as a fallback). |

## L. Originality check (must pass before sign-off)

| ID | Level | Check |
|---|---|---|
| L1 | MUST | No character, organisation, place, gadget, mission or dialogue name from any existing game appears in the mission. Use the term list kept by the team (for this project, the research files 01-15 name the source game's terms to avoid). |
| L2 | MUST | The premise is not a reskin of an existing mission. Compare facility type + objective chain + set pieces. If two or more match a known mission's combination, redesign. |
| L3 | MUST | The layout cannot be recognised as a specific existing map. Compare the zone graph, the sequence of spaces and the signature rooms. If a reviewer familiar with the reference game can name the map, redesign. |
| L4 | MUST | Signature set pieces are re-expressed in a new form (different space, device, purpose and staging), not traced. Write one line per set piece explaining what was transformed. |
| L5 | SHOULD | Run the PROMPT_LIBRARY "Originality check" prompt and attach its result. |

## M. Document integrity

| ID | Level | Check |
|---|---|---|
| M1 | MUST | Every MISSION_TEMPLATE field is filled or marked N/A with a reason. |
| M2 | MUST | No contradictions between sections. Objectives match zones, guards match the stealth route, beats match the pacing chart, devices match the security profile. |
| M3 | SHOULD | The design decisions (D-xx) the mission relies on are listed, with their current answers or assumptions. |

---

## Results table format (paste into MISSION_TEMPLATE §16)

| Section | MUST pass / total | SHOULD pass / total | Failures and fixes |
|---|---|---|---|
| A Architecture | | | |
| B Room purpose | | | |
| C Scale | | | |
| D Readability | | | |
| E Co-op beats | | | |
| F Stealth viability | | | |
| G Detection fairness | | | |
| H Security logic | | | |
| I Pacing and failure | | | |
| J Wow moments | | | |
| K Audio and atmosphere | | | |
| L Originality | | | |
| M Integrity | | | |

**Sign-off rule:** all MUST items pass, and each SHOULD failure has a written acceptance reason.
