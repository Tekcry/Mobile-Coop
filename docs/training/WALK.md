# Fallow walk 2 (after T5g)

Since walk 1 all nine bays and eight airlocks were rebuilt to BAYS v2 under the course rules R1-R8 (your walk-1
notes): one linear line per bay, every element unavoidable, both players do every element, splits only where a bay
lists one, compact rooms, the objective list always on screen, automatic airlock pads, a glass / steel / LED look.

Still missing (not bugs): LEDs are unlit until T6 (one work lamp per bay, so use the URLs below); guards, drill ticks
and devices (cameras, beams, keypads, turnstiles) are stubs until T7a / T7b. Drills do not tick yet, so an airlock
cycles even with objectives open. This walk is about shape, routes and moves.

## Start (Michael's PC)
```
cd C:\NightShift\Mobile-Coop
git fetch origin
git checkout feature/training-bunker
git pull
npm ci
npm run dev
```
`npm run dev` prints the address (normally `http://localhost:5173/`).

- Two players, two tabs (pad first, then keyboard and mouse): open
  `http://localhost:5173/?net=local&autostart=bunker&mode=course&fullbright=1&gfx=min` in one tab, wait 2 seconds, then
  open the same URL in a second tab. The first tab hosts, the second joins, both start in B1.
- Alone: `http://localhost:5173/?autostart=bunker&mode=course&course=solo&fullbright=1&gfx=min` (dev only: one player
  can cycle airlocks and work both halves of a pair gate).
- Keep `gfx=min`: higher presets show a black 3D view on this PC (a known issue, fixed later).
- F3 opens the debug overlay. Its "Teleport" button lists the Fallow points (below, per bay). Airlocks: A1-A8.

## What to check per bay (about 5 minutes each)
Every bay: you cannot get past an element without doing it; both players do every element; the objective list is on
screen and names what to do; the airlock opens by both standing on the pad (no button; "Waiting for partner" with one);
rooms feel compact, not hallways; glass partitions and screens, LED strips (unlit), dark concrete above.

| Bay | Teleports | Look for |
| --- | --- | --- |
| B1 Muster | B1, B1-KR, B1-BR, B1-GR, B1-DS | Five rooms in a chain, one door each: lobby, kit room, briefing room, gear run (20 m, marks 1-6), dark store, A1. No split. Glass locker fronts and briefing-room glass |
| B2 The Lanes | B2, B2-2B, B2-G1, B2-pit, B2-G2, B2-2C, B2-2C-E, B2-deck, B2-2D, B2-2F | Seven stations in one line, each element wall to wall: caged ladder to G1, pipe, G2 hang-drop, trench, downpipe / ledge / portal, deck drop, window wall. No boost past G1 or the portal. Falls land on a catcher with a ladder back. Glass window onto each next station |
| B3 The Intake | B3, B3-RC, B3-G2, B3-G3, B3-G4, B3-NT1, B3-G5, B3-NR, B3-ML, B3-RF, B3-CR, B3-ZD, B3-NT2, B3-WP, B3-floor, B3-pit, B3-PP | One climb, every landing one way on: slot, wall jumps, bar, rope sideways onto ML, window kick into CR, zipline, fan guard, ducts, A3. Glass screens on every landing edge. Return gates are locked doors until T7a |
| B4 The Cistern | B4, B4-W1, B4-C2, B4-VG, B4-C3, B4-OP | C1, W1 (boost), C2, W2 (human ladder) and sluice, C3, OP, A4. One split: one holds the sluice. No way from W1 onto VG. Phase 5 bay behind glass |
| B5 Standby Plant | B5, B5-floor, B5-GEN, B5-CG, B5-trench, B5-SR, B5-FB, A5 | EL leads only down its stair; two routes through the hall rejoin at A5. One split: breaker (SR) and crosser. A5 opens only with MB pulled |
| B6 Mock Site | B6, B6-AH, B6-PLAT, B6-RE, B6-CO, B6-L, B6-LK, B6-OF, B6-CR, B6-MT, B6-SV | Shared start: reception, AH ladder, duct, vent drop, records, corridor. Then one split: operator (lockers, office, control room) and runner (L-leg, mantrap); rejoin in the server room. Corridors 2.0 wide? |
| S6 / A6 | S6, A6 | Stair down from the server room (top door bolted from B6), A6 with its medkit |
| B7 The House | B7, B7-house, B7-office, B7-roof, B7-annex, B7-bench | One guarded cavern; floor, bench, roofs and house routes rejoin at the store door (A7), the only exit. No split. House glass inside, cavern dark |
| B8 The Range | B8, B8-RT, B8-CW, B8-far | Firing line, lanes, shoot-house, far end, A8. One split: overwatch (tower, catwalk, caged stair) and floor. Glass firing-line screen, glazed tower, catwalk balustrade |
| B9 The Plot | B9, B9-floor, B9-B1, B9-B2, B9-bridge, B9-lobby, L9 | Well, balconies, key cabins, case cabin, lobby, lift. One split: the two keys; rejoin in the lobby. Lift is the end (no airlock) |

## Look at (flagged for you)
- Boost reach: can a co-op boost skip the wall jumps at B3 WJ1 (B3-G2) and WJ2 (B3-G3), or the human ladder at B4 W2
  (B4-C2)? Only the drill tick blocks it there today. Keep the tick, or allow boosts only at marked spots?
- B8 catwalk stair (B8-CW, B8-far): the caged stair now runs at x 50..58 and closes the dark walk at x 50; the dark walk
  rejoins the lanes before x 50. Does that read?
- B8 firing slot (B8): can you vault through the 0.6 m slot in the glass screen on a diagonal?
- B3 ML (B3-ML): the waiting spot overlaps the open hatch until T7a; a waiting player can drop into RF. Annoying?
- Partners blocking each other: walking into a standing partner stops you short; off-centre you slide round. Right?
- B5 (B5-SR, B5-CG): is the 13 m dash from the switch room to the gallery ladder fair for the breaker?
- B5 EL (B5): its south edge is a 2.4 screen, not a low balustrade. B3 NT2 (B3-NT2): the fan guard is climbed from
  x 9.5..12. B7 / B8: the vaultable catwalk rail and the downpipe route onto the parapet - acceptable?

## Notes
Write to `docs/training/WALK-NOTES.md`: add a `## Walk 2` section at the end, then one line per note: bay, where (a
teleport point or x, z), what, and what you want. Example:

    - B3 G5: the rope point is hard to find; no prompt until I face the beam

Then commit and push:
```
git add docs/training/WALK-NOTES.md
git commit -m "walk 2 notes"
git push
```

## Resume
In a Claude Code session on the PC (folder `C:\NightShift\Mobile-Coop`), send:

    Training run: RESUME. Follow docs/training/BRIEF.md.

The run applies your walk 2 notes (a fix step, only if there are notes), then TM (merge locomotion 09-20), T6 light,
T7a course data, T7b guards, then walk 3.
