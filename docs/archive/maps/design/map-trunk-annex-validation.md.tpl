# Trunk Annex - validation against the stealth level rules

Generated from `map-trunk-annex.json` by `map-trunk-annex-render.mjs` (the checklist table is computed, the walk-throughs below are written by hand from the same tables). Open fails after the last design pass: {{fail}}

**How the numbers were checked.** A 0.5 m nav grid is built from the JSON (agent radius 0.32 m, the code values in `scale-sheet.md`) at two grid offsets (0 and 0.25 m) so alignment luck is excluded. Reachability, door passes, guard legs and every player route are tested on it. Line of sight is a 3D ray test (walls with their heights, blocks, slabs, double-height hall walls, see-through rails and mesh). Guard sight uses the engine's focus cone (55 degrees, 25 m) and peripheral cone (100 degrees half-angle, 12 m); a target in shadow is treated as seen only inside 8 m (assumption; the engine makes shadow "much slower", not blind). Lamp pools are radius-only with line of sight (the true light formula is in `lampMath.ts` and is tuned in build step 2).

## Checklist

{{checklist}}

## Spawn evidence

{{spawnTable}}

## Paper walk-through 1: first-time solo (about 9 to 11 minutes)

1. **Spawn pocket (0:00).** S4 or S2: the player sees G1 stop at the personnel door for 4.5 s and walk east, with the Y1 pool on the wall. Decision: wait or move. Learns: G1's line is east-west and he turns his back for about 14 s.
2. **Observe.** A first-time player watches two loops (80 s) from V1 and the roof cover. Decision: PD or the roof. Learns: the sniper's three facings (12, 10 and 16.5 s) and the 40 s clock.
3. **Goods-in (about 1:30 to 2:30).** PD opens at a K1 window (one {{k1win}} s window per 40 s). Inside the player has hG1, hG3 and the riser corner hG2 as places to stand. Decision: wide opening to the hall, or look at the dark corner (riser). Learns: the ladder. *Choice present: yes (three).*
4. **Hall (about 3:00).** From V2 the pair: lit strip, pair gap of 22 s at K2 (both in the break room for the middle of it). Decision: cross K2, or go back for the riser or the roof. Learns: the officer on the gallery above.
5. **Stair and O1 (about 4:30).** Stair top, Test room with a lit bench, cabinet in the dark. Decision: hug the wall or shoot TL1 / flip SW6. Hold 3 s. Learns: the card number.
6. **O2 (about 7:00).** Down the stair or over the roof. Observes the heavy across the mesh from V4. Decision: bold aisle, east aisle by the exhaust shaft, or generator and GCd. Hold 4 s.
7. **Exit (about 9:00 to 10:30).** Yard under the sentry and sniper. With C1 on the hop has one {{k6lit}} s window every 40 s (worst wait {{k6wait}} s), so the player either waits for it, kills C1 at SW1 (inside PD), shoots Y3, or walks back to Gp (E2).

**Stretches flagged and what was done.**

- *Doors only?* The longest door run on any route is PD then GD then GCd (route O2-B). Each is at least 5 m from the next, and between them there is a real decision (yard hop, generator crossing). No stretch is only door opening.
- *Nowhere to hide?* The worst distance to cover along any route is below 8 m (rule 15). The first draft had 8.3 m near the wide opening; hide hG3 was added.
- *No real choice?* The first draft had only two O1 routes with the riser one trivially faster. The riser is now a *discovery* (rule 21) and costs a ladder, so the hall stays worth knowing (it leads to O2).
- *Long wait?* K6 lit worst wait was 116 s (one 7 s window per 120 s). Michael's decision 3 fixed it by retiming the sniper onto the 40 s master clock (facings 12, 10 and 16.5 s, phase 12 s): one {{k6lit}} s window every 40 s lit (worst wait {{k6wait}} s), {{k6dark}} s with C1 off (worst wait {{k6dwait}} s). E2 is always open.

## Paper walk-through 2: experienced solo (2 to 3 minutes)

1. Spawn S2, straight to PD on the K1 window (opens 6.5 s into the clock). 2. Jog the Goods-in south wall to the riser R1 (noise 3.4 m inside); climb (3.3 s). 3. O1 cabinet 3 s hold (only the officer's door check, 3.5 s per 40 s, exposes the lit bench). O1 is reached {{o1c}} s after the spawn against {{o1a}} s by the stair. 4. Back down R1 to grille T1 (1.7 m): noise radius 4 m on entry; crawl 37 m ({{crawlfast}} s at crouch gear 6, or {{crawlslow}} s silent). 5. Out at T2 on a K4 window (19.8 s of 40), along the dark east aisle, hold 4 s at O2 on a K5 window. The whole run to O2 is {{x2best}} s against {{mbest}} s for the main run. 6. Decide the exit on what happened: E1 via GCd and GD (19 s) if C1 was switched off at SW1 on the way, or E2 back through the hall.
Decisions per beat: when to enter PD; whether to use a light (SW1 for the yard run); when to leave the aisle; which exit.

## Paper walk-through 3: four players

- P1 (O1): PD window, R1, cabinet. P2: RL, roof, hR4, GL or the east roof to ES (K7 has a 23 s window every 40 s). P3: PD, riser, T1, trench {{crawlfast}} to {{crawlslow}} s, wait at T2. P4: south wall, hY3, hY4, GD, generator room, SW4 or SW5 as the light switch.
- Decisions: who switches which circuit; who holds the east aisle; who pulls O2 once O1 is done. Nobody is forced to act at the same time as another player, and every co-op row has a solo version (see the co-op table).
- Flag: four players use RL, PD, the south wall and T1 in the first 40 s. Each has its own space (ladder, door, wall, grille), so there is no queue at one door. At PD two players pass 2 s apart; PD is 1.2 m and G1 turns his back for 14 s, so two fit one K1 window.

## Remaining risks (not fully proven on paper)

- Discovery times (Michael's decision 2) are measured on the whole run spawn to O1 to O2, because no O2 leg can beat the 27 s main leg by 15 s (the straight line is 33 m). X2 contains the riser: the trench alone beats the main O2 leg by {{o2save}} s, the rest of its {{x2save}} s comes from the riser. The faster paces (jog 2.8 m/s inside the Goods-in, crouch gear 6 in the trench) are the stated cost in noise; their radii (about 3.4 m and 2 m, muffled to 0.45) come from `docs/systems/movement.md` and `ai.md` and are not run in a test.
- Rule 21 in `stealth-level-rules.md` still reads "three discoveries, 30 s or more each"; this map follows Michael's newer decision (two at 15 s, one safe and slow). The rules file is unchanged.
- Lamp radius values are design values; build step 2 must confirm the objective cells stay below 0.28 on the real light field.
- The 8 m shadow sight limit is an assumption. If real shadow detection reaches farther, the spawn pocket and the lights-out K6 windows need a recheck.
- The 1.0 m gallery rail is see-through on the plan; if the build makes it solid, vantage V2 loses G4 (the other vantages are unaffected).
- G6 is now on the 40 s master clock like every guard, so every window repeats every 40 s (the old 120 s cycle is gone). The sniper's three facings are waypoint turns in the same place; if the archetype cannot turn on a schedule, use `grunt` with a zero-length loop (the sheets are the same).
