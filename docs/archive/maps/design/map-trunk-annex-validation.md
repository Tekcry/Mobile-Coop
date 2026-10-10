# Trunk Annex - validation against the stealth level rules

Generated from `map-trunk-annex.json` by `map-trunk-annex-render.mjs` (the checklist table is computed, the walk-throughs below are written by hand from the same tables). Open fails after the last design pass: none

**How the numbers were checked.** A 0.5 m nav grid is built from the JSON (agent radius 0.32 m, the code values in `scale-sheet.md`) at two grid offsets (0 and 0.25 m) so alignment luck is excluded. Reachability, door passes, guard legs and every player route are tested on it. Line of sight is a 3D ray test (walls with their heights, blocks, slabs, double-height hall walls, see-through rails and mesh). Guard sight uses the engine's focus cone (55 degrees, 25 m) and peripheral cone (100 degrees half-angle, 12 m); a target in shadow is treated as seen only inside 8 m (assumption; the engine makes shadow "much slower", not blind). Lamp pools are radius-only with line of sight (the true light formula is in `lampMath.ts` and is tuned in build step 2).

## Checklist

| # | Rule | Result | Evidence from the design |
| --- | --- | --- | --- |
| 1 | Each guard visible from a dark vantage | PASS | G1: V1 (10.3 m from the path, 113 deg off facing); G2: V2 (8.8 m from the path, 75 deg off facing); G3: V2 (8.8 m from the path, 165 deg off facing); G4: V2 (10.3 m from the path, 151 deg off facing), V4 (8.1 m from the path, 31 deg off facing); G5: V4 (11.0 m from the path, 65 deg off facing); G6: V3 (24.3 m from the path, 142 deg off facing) |
| 2 | Spawn view teaches; no guard sees a spawn | PASS | S1: shadow, sees G1/G6 + pool, seen by nobody in 0-90 s, 1.5 m to nearest spawn; S2: shadow, sees G1/G6 + pool, seen by nobody in 0-90 s, 1.5 m to nearest spawn; S3: shadow, sees G1/G6 + pool, seen by nobody in 0-90 s, 1.5 m to nearest spawn; S4: shadow, sees G1 + pool, seen by nobody in 0-90 s, 1.6 m to nearest spawn |
| 3 | Every lit pool has a visible source | PASS | 17 lamps, each one a fitting at its listed height and radius (lamp table); no light in the plan without a lamp row. Sign decals: CORE and LINE RECORDS are non-lighting emissives (tuned in build step 2 to stay under LIGHT.shadow 0.28 at O1 and O2). |
| 4 | Loops 25 - 45 s | PASS | G1 40.0 s, G2 40.0 s, G3 40.0 s, G4 40.0 s, G5 40.0 s, G6 40.0 s |
| 5 | Deterministic | PASS | Every waypoint, dwell, facing and phase is a literal in the guard sheets; no random field. G3 trails G2 by 2.5 s (phase 10.5 vs 8). |
| 6 | Two tells per guard, at least 2 s before a hide-spot view | PASS | G1: 2 (boots on gravel / torch beam sweeps the wall 3 s before he turns at the door); G2: 2 (radio crackle and two voices in the break room / door slap of the double door DD); G3: 2 (radio crackle in the break room / DD slap); G4: 2 (keys on his belt / CL1 lamp flickers on the window glass 3 s before he stands); G5: 2 (heavy tread and armour clink through the mesh / his shadow swings across the K1 pool on the apron 2 s before he arrives); G6: 2 (the scope glints in the sodium light 2 s before each turn / boot scrape on the roof gravel 3 s before each turn). Tells are audio and light and start from 2 to 6 s ahead (see sheets). |
| 7 | A safe window of 3 s or more per hop | PASS | Per 40 s master-clock cycle (every loop is 40 s, so one cycle is one loop): K1: 1 window(s) >= 3 s, longest 18.0 s, worst wait 24.8 s; K2: 1 window(s) >= 3 s, longest 22.7 s, worst wait 20.2 s; K3: 1 window(s) >= 3 s, longest 17.9 s, worst wait 24.9 s; K4: 1 window(s) >= 3 s, longest 19.8 s, worst wait 23.0 s; K5: 2 window(s) >= 4 s, longest 9.4 s, worst wait 23.1 s; K9: 1 window(s) >= 5 s, longest 12.4 s, worst wait 32.4 s; K6: 1 window(s) >= 3 s, longest 9.5 s, worst wait 33.3 s; K7: 1 window(s) >= 3 s, longest 23.0 s, worst wait 19.8 s; K8: 1 window(s) >= 3 s, longest 35.5 s, worst wait 7.3 s |
| 7b | Van exit: worst wait at most one 40 s loop with the yard lights on; lights off widens the window or adds a second | PASS | K6 (yard crossing to GD and Gv, the last hop of EX-1) lit: 1 window per 40 s cycle: 35.0-4.5 (9.5 s); worst wait 33.3 s (limit 40 s). C1 off or Y3 shot (sniper out of view): window 18.6 s, worst wait 24.1 s. Before this pass: one 7.0 s window per 120 s, worst wait 115.8 s. |
| 8 | One crossing timing puzzle | PASS | K6 (yard east crossing): G1 and G6 are both on the 40 s master clock (G6 phase 12 s against G1 phase 0). The crossing is open only when G1 is on his return leg or at the door AND the sniper is on his roof-north facing: 1 usable window per cycle, 35.0-4.5 (9.5 s). Lit, that is 9.5 s of 40; with C1 off the sniper drops out and it is 18.6 s. |
| 9 | One stationary watcher, narrow view, dark flank | PASS | G6 never moves (waypoints share (11.5, -6.5)); three facings of 55 deg focus (lane 12 s, yard 10 s, roof north 16.5 s, plus 0.5 s per turn = 40 s); blind strip within 5 m of the south wall (sniper 0.5 m behind a 1.0 m parapet at 8.2 m eye height: parapet clears from 5 m out); dark flank = the facade foot at GD (10.5, -7) and the roof behind AH4 (8..12, 8..11) |
| 10 | Pauses of 3 s or more at visible spots | PASS | G1 max dwell 4.8 s at checks the gate chain; G2 max dwell 6.0 s at break room, kettle, backs to the hall; G3 max dwell 6.0 s at break room; G4 max dwell 3.2 s at desk, watches the hall through the window; G5 max dwell 4.0 s at console check, back to the aisle mouth; G6 max dwell 16.5 s at roof deck north |
| 11 | 4 or more switchable lamps; a route needs one dark; reactions listed (11, 14) | PASS | 17 lamps, 6 circuits with a switch and a listed guard reaction with a duration; 17 shootable. The yard exit hop K6 is still easier after one dark: lit it has 1 window of 9.5 s per 40 s (worst wait 33.3 s); with C1 off or Y3 shot the sniper drops out and the window is 18.6 s (worst wait 24.1 s). Lights-out reactions are in the circuit table. |
| 12 | Dark cell within 6 m of every waypoint | PASS | All 21 waypoints have a 1.5 x 1.5 m dark walkable block within 6 m (nearest: G1.0 at (-6.25, -9.75) 1.8 m; G1.1 at (5.75, -9.25) 0.8 m; G2.0 at (-4.75, 4.75) 0.4 m; G2.1 at (-7.25, 4.75) 2.6 m; G2.2 at (-4.75, 4.75) 0.4 m; G2.3 at (-4.75, -2.75) 0.4 m, ...) |
| 13 | Objectives in shadow; approach crosses light | PASS | O1: dark, nearest lamp TL1 at 7.2 m (radius 5); O2: dark, nearest lamp K2 at 6.4 m (radius 3.5). Routes crossing pools: O1-A Y1+GI1+GI2+HS1+TL1; O1-B Y1+GA1+TL1; O1-C Y1+GI1+GI2; O2-A TL1+HS1+HS2+HN1+K2+K1; O2-B GI1+GI2+Y1+Y2+Y3+K1; O2-C TL1+GA1; O2-D GI1+K1 |
| 14 | Lights off has a cost | PASS | Each circuit row lists a guard, an action and 8 to 15 s of search (circuit table). |
| 15 | Cover every 8 m, no straight over 12 m | PASS | Longest distance to a hide spot along any route: 7.5 m; longest straight segment: 9.0 m. Per route: O1-A 6.0 m, O1-B 6.2 m, O1-C 3.9 m, O2-A 7.5 m, O2-B 4.3 m, O2-C 6.2 m, O2-D 3.2 m |
| 16 | Niches 1.2 x 1.0 x 1.2 | PASS | 25 hide spots, smallest 1.5 x 1.0 m, lowest 1.4 m (hide table) |
| 17 | Body spots off patrol loops, at least one per guard | PASS | G1: hY3 3.0 m from the loop; G2: hB1 6.8 m from the loop; G3: hB1 6.8 m from the loop; G4: hU3 3.9 m from the loop; G5: hCa1 3.1 m from the loop; G6: hR1 22.3 m from the loop. No body spot rect overlaps a loop leg (hide spots are off the patrol lines). |
| 18 | 8 doors on the main route at most, 12 in total, 5 m between doors | PASS | 12 doors (8 single, 3 double, 1 gate); most doors on any route: 3; shortest gap between two doors on a route: 19.2 m. |
| 19 | Every door justified | PASS | Each door has a purpose in the door table and a row in the asset audit. |
| 20 | Three routes per objective, bypass at each choke | PASS | O1: A, B, C; O2: A, B, C (plus D variant). Largest share of one route overlapped by another: 24 % (limit 30 %). Bypasses: PD by RL; WO1/hall by R1; CH by GCd, T2 and ES; K6 by the south wall hides. |
| 21 | Three discoveries (Michael, decision 2): two true time-savers at least 15 s faster than the best-case main run; the third is the safe slow route | PASS | X1 Riser run: best 40.2 s against 55.7 s (faster by 15.5 s), worst case 164.7 s against 206.6 s (faster by 41.9 s); X2 Cable run (riser and trench): best 37.1 s against 55.7 s (faster by 18.6 s), worst case 116.3 s against 206.6 s (faster by 90.3 s); X3 Roof and exhaust run: best 78.8 s against 55.7 s (slower by 23.1 s), worst case 178.8 s against 206.6 s (faster by 27.8 s). Best case = zero waits at the fast pace; worst case = the quiet pace plus every worst-case wait. Full table in the route section of the map document. The old rule text asked for 30 s on each of three; this decision replaces it for this map. |
| 22 | Easy first 90 s; hide spot within 10 m of every alarm trigger | PASS | No guard sees any spawn in 0-90 s. Alarm panels: AP1 2.0 m to a hide, AP2 1.5 m to a hide, AP3 0.5 m to a hide |
| 23 | Co-op helps, never gates | PASS | 7 co-op rows, each with a solo alternative (co-op table); no action needs two players at once; widest choke 2.0 m (doors DD, DG, CH) or two paths (WO1 3.0 m, yard) |
| 24 | Landmarks and 0.5 m tolerance | PASS | Each main space has a landmark in the space table; the objectives have lit signs; no hold needs precision: holds are 3 and 4 s with a 1.0 m radius. |
| 25 | Guard why-here and pair gaps | PASS | Each sheet has a why-here sentence. Pair gap: K2 windows: 4.2-26.8 (22.7 s) (both G2 and G3 in the break room behind a closed double door). |
| 26 | Two exits that change with play | PASS | E1 (van, Gv) and E2 (arrival gate Gp). AP3 sends reinforcements to Gv (closes E1); AP1 and AP2 send them through ND to the north (the yard stays open); C1 off removes the yard light and makes G1 search for 12 s; a found body at the yard makes G1 run to AP3. |
| - | Scale sheet sizes | PASS | Corridors >= 3.0 m (3.0 m smallest); doors 1.2 / 2.0 / 3.0; 22 of 22 door passes (Gp, Gv and the stair mouth SO face the lane or a void and are excluded) pass on the grid at offsets 0 and 0.25; no door within 1.5 m of a corner and 3.0 m centre spacing on every wall (door spacing table); no doors facing. |

## Spawn evidence

| Spawn | x | z | Nearest spawn m | First move | In shadow | Sees |
| --- | --- | --- | --- | --- | --- | --- |
| S1 | -17.5 | -12.5 | 1.5 | Climb the exterior ladder RL to the roof | yes | G1 G6 + a lit pool |
| S2 | -16 | -12.5 | 1.5 | Out through the gap to the personnel door PD | yes | G1 G6 + a lit pool |
| S3 | -14.5 | -12.5 | 1.5 | Along the south wall east behind the van (yard run) | yes | G1 G6 + a lit pool |
| S4 | -16.5 | -11 | 1.6 | Wait at the pocket mouth and watch the sentry | yes | G1 + a lit pool |

## Paper walk-through 1: first-time solo (about 9 to 11 minutes)

1. **Spawn pocket (0:00).** S4 or S2: the player sees G1 stop at the personnel door for 4.5 s and walk east, with the Y1 pool on the wall. Decision: wait or move. Learns: G1's line is east-west and he turns his back for about 14 s.
2. **Observe.** A first-time player watches two loops (80 s) from V1 and the roof cover. Decision: PD or the roof. Learns: the sniper's three facings (12, 10 and 16.5 s) and the 40 s clock.
3. **Goods-in (about 1:30 to 2:30).** PD opens at a K1 window (one 18.0 s window per 40 s). Inside the player has hG1, hG3 and the riser corner hG2 as places to stand. Decision: wide opening to the hall, or look at the dark corner (riser). Learns: the ladder. *Choice present: yes (three).*
4. **Hall (about 3:00).** From V2 the pair: lit strip, pair gap of 22 s at K2 (both in the break room for the middle of it). Decision: cross K2, or go back for the riser or the roof. Learns: the officer on the gallery above.
5. **Stair and O1 (about 4:30).** Stair top, Test room with a lit bench, cabinet in the dark. Decision: hug the wall or shoot TL1 / flip SW6. Hold 3 s. Learns: the card number.
6. **O2 (about 7:00).** Down the stair or over the roof. Observes the heavy across the mesh from V4. Decision: bold aisle, east aisle by the exhaust shaft, or generator and GCd. Hold 4 s.
7. **Exit (about 9:00 to 10:30).** Yard under the sentry and sniper. With C1 on the hop has one 9.5 s window every 40 s (worst wait 33.3 s), so the player either waits for it, kills C1 at SW1 (inside PD), shoots Y3, or walks back to Gp (E2).

**Stretches flagged and what was done.**

- *Doors only?* The longest door run on any route is PD then GD then GCd (route O2-B). Each is at least 5 m from the next, and between them there is a real decision (yard hop, generator crossing). No stretch is only door opening.
- *Nowhere to hide?* The worst distance to cover along any route is below 8 m (rule 15). The first draft had 8.3 m near the wide opening; hide hG3 was added.
- *No real choice?* The first draft had only two O1 routes with the riser one trivially faster. The riser is now a *discovery* (rule 21) and costs a ladder, so the hall stays worth knowing (it leads to O2).
- *Long wait?* K6 lit worst wait was 116 s (one 7 s window per 120 s). Michael's decision 3 fixed it by retiming the sniper onto the 40 s master clock (facings 12, 10 and 16.5 s, phase 12 s): one 9.5 s window every 40 s lit (worst wait 33.3 s), 18.6 s with C1 off (worst wait 24.1 s). E2 is always open.

## Paper walk-through 2: experienced solo (2 to 3 minutes)

1. Spawn S2, straight to PD on the K1 window (opens 6.5 s into the clock). 2. Jog the Goods-in south wall to the riser R1 (noise 3.4 m inside); climb (3.3 s). 3. O1 cabinet 3 s hold (only the officer's door check, 3.5 s per 40 s, exposes the lit bench). O1 is reached 13.3 s after the spawn against 28.8 s by the stair. 4. Back down R1 to grille T1 (1.7 m): noise radius 4 m on entry; crawl 37 m (13.1 s at crouch gear 6, or 20.3 s silent). 5. Out at T2 on a K4 window (19.8 s of 40), along the dark east aisle, hold 4 s at O2 on a K5 window. The whole run to O2 is 37.1 s against 55.7 s for the main run. 6. Decide the exit on what happened: E1 via GCd and GD (19 s) if C1 was switched off at SW1 on the way, or E2 back through the hall.
Decisions per beat: when to enter PD; whether to use a light (SW1 for the yard run); when to leave the aisle; which exit.

## Paper walk-through 3: four players

- P1 (O1): PD window, R1, cabinet. P2: RL, roof, hR4, GL or the east roof to ES (K7 has a 23 s window every 40 s). P3: PD, riser, T1, trench 13.1 to 20.3 s, wait at T2. P4: south wall, hY3, hY4, GD, generator room, SW4 or SW5 as the light switch.
- Decisions: who switches which circuit; who holds the east aisle; who pulls O2 once O1 is done. Nobody is forced to act at the same time as another player, and every co-op row has a solo version (see the co-op table).
- Flag: four players use RL, PD, the south wall and T1 in the first 40 s. Each has its own space (ladder, door, wall, grille), so there is no queue at one door. At PD two players pass 2 s apart; PD is 1.2 m and G1 turns his back for 14 s, so two fit one K1 window.

## Remaining risks (not fully proven on paper)

- Discovery times (Michael's decision 2) are measured on the whole run spawn to O1 to O2, because no O2 leg can beat the 27 s main leg by 15 s (the straight line is 33 m). X2 contains the riser: the trench alone beats the main O2 leg by 3.1 s, the rest of its 18.6 s comes from the riser. The faster paces (jog 2.8 m/s inside the Goods-in, crouch gear 6 in the trench) are the stated cost in noise; their radii (about 3.4 m and 2 m, muffled to 0.45) come from `docs/systems/movement.md` and `ai.md` and are not run in a test.
- Rule 21 in `stealth-level-rules.md` still reads "three discoveries, 30 s or more each"; this map follows Michael's newer decision (two at 15 s, one safe and slow). The rules file is unchanged.
- Lamp radius values are design values; build step 2 must confirm the objective cells stay below 0.28 on the real light field.
- The 8 m shadow sight limit is an assumption. If real shadow detection reaches farther, the spawn pocket and the lights-out K6 windows need a recheck.
- The 1.0 m gallery rail is see-through on the plan; if the build makes it solid, vantage V2 loses G4 (the other vantages are unaffected).
- G6 is now on the 40 s master clock like every guard, so every window repeats every 40 s (the old 120 s cycle is gone). The sniper's three facings are waypoint turns in the same place; if the archetype cannot turn on a schedule, use `grunt` with a zero-length loop (the sheets are the same).
