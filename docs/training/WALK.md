# Fallow walk (D27) - after Block B

The geometry of all nine bays and eight airlocks is built (greybox). There are no guards, no light plan (one work lamp
per bay, so most of it is dark: use night vision or the debug overlay), no art, and the drills are stubs. This walk is
about shape, size, routes and moves: does each bay read and play as BAYS.md describes?

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
  `http://localhost:5173/?net=local&autostart=bunker&mode=course&fullbright=1&gfx=min` in one tab, wait 2 seconds, then open the same URL in
  a second tab. The first tab hosts, the second joins, both start in B1.
- Alone: `http://localhost:5173/?autostart=bunker&mode=course&course=solo&fullbright=1&gfx=min` (dev only: one player can cycle airlocks and
  work both halves of a pair gate; drills still need their real moves).
- F3 opens the debug overlay. Its "Teleport" button lists the Fallow points: B1-B9, A1-A8, L9, S6 and B3-G3, B3-RC,
  B3-rope, B3-floor, B5-SR, B5-CG, B5-GEN, B6-AH, B6-RE, B6-CO, B6-CR, B6-MT, B6-SV, B7-house, B7-office, B7-roof, B7-annex, B7-bench,
  B8-RT, B8-CW, B8-far, B9-floor, B9-B1, B9-B2, B9-bridge, B9-lobby.

## What to check per bay (about 5 minutes each)
| Bay | Look at |
| --- | --- |
| B1 Muster (y 16, v2) | Five small rooms in a chain: lift lobby -> kit room -> briefing room (glass south wall onto the run) -> gear run (20 m, east to west, marks 1-6, stop line, turn mark) -> dark store -> A1 pad; no way to skip a room |
| A1, B2 The Lanes (v2) | A1 pad (north door in, east door out). One lane, both players: plinth, rail, block wall; caged ladder up G1 (screened, no boost); pipe over the pit (fall: pit ladder back to G1); hang and hang-drop off G2's open 1.5 m; trench jump and roll; downpipe, beam ledge round the column, gap jump to the portal sill, climb onto the deck; three drops (pads soft / roll, pit heavy); window wall (one open, two glazed); stop and turn marks; A2. RL2's turnstile is a locked door until T7a; panes do not re-glaze yet; A2 opens onto an interim passage to the old B3 until T5e |
| B3 Intake shaft (v2) | From A2 onto G1: split in the riser slot (B3-RC) and up onto the casing; wall jump G2 -> G3, corner kick to G4; damper bar to G5 (fall: NT1, ladder to G4); hoist rope, sideways and unhook on ML (B3-ML); davit rope, kick through CR's window; isolator; zipline to WP; fan guard; twin ducts; PP; A3. W5 / ML return gates locked and grilles plain until T7a |
| B4 Cistern (v2) | Straight off A3 (v2 offset, T5f). C1: boost onto W1, drop, draw the bolt; C2: human ladder up W2 at x 1..4, sluice held from VG; VG ladder into C3; boost onto OP, lower its ladder; A4. Phase 5 bay behind glass |
| B5 Standby plant (v2) | EL at 4.4 screened but for its stair (no drop off it), gensets (wall-jump roofs), trench and its two end panels, cable gallery and the hang-drop at x 2, glazed switch room (MB) with its door onto the aisle, fuel bay, desk; A5 opens only with MB pulled. A4 has a wall medkit |
| B6 Mock site (v2) | Reception (inner door locked) -> AH ladder -> duct -> vent drop onto the records desk -> exit button -> corridor; lockers, CR stair and mezzanine behind glass; L-leg beams, mantrap, server room, keypad by the exit door. Corridors feel 2.0 wide? |
| S6 / A6 (v2) | The stair down south from the server room (top door bolted from B6), A6 with its medkit, then B7 |
| B7 The House (v2) | 30 x 30 cavern; house: lobby stair, office behind glass, roof hatch, parapet 0.9; annex roof wall jump; water main 4.9 over the annex edge; bench and its ladder; sandbags; the store door (A7) is the only exit |
| B8 The Range (v2) | Lockers, firing-line glass screen with its slot and door, lanes (far stands 50 m, lanes 4-5 at 45 m), shoot-house, RT by ladder, catwalk to x 50, caged stair down to its bolted foot door, scaffold, A8 the only exit |
| B9 The Plot (v2) | Well: dark ring, map table, towers to B-1 (4.5) and B-2 (9.0), key cabins, case cabin, bridge rope, zipline to the lobby, tube duct, NW co-op lip, staff tunnel door (east), lobby keys 5 m apart, lift L9 |

Questions worth an answer: Is any space too big, too small or too samey? Is a move hard to find or to do? Can you get
somewhere you should not (round a gate, over a wall, onto a roof)? Does a bay feel like the place BAYS describes?
The run's own list of risks is in docs/training/BLOCK-B-REVIEW.md (top 5 at the end) and docs/training/REVIEW-NOTES.md and the assumptions in docs/training/DECISIONS.md
(A1-A43).

## Notes
Either use the review page https://claude.ai/artifact/JMcAnistZtmPb6g3eyLMBs (a verdict and notes per bay, saved for the run: T5b reads its `feedback` collection with ArtifactData), or write to `docs/training/WALK-NOTES.md`, one line per note: bay, where (a debug point or x, z), what, and what you want.
Example:

    B2 | Lane N trench (x 29) | trench too narrow to turn in | widen to 1.5
    B5 | B5-SR | breaker escape run feels too long | move the gallery ladder closer

Then commit and push:
```
git add docs/training/WALK-NOTES.md
git commit -m "training: walk notes"
git push origin feature/training-bunker
```

## Resume
In a Claude Code session on the PC (folder `C:\NightShift\Mobile-Coop`), send:

    Training run: RESUME. Follow docs/training/BRIEF.md.

The run starts Block C with T5b (your walk notes), then TM (merge locomotion 09-20, which waits for locomotion step 20 on
origin/feature/ct-locomotion), T6 light, T7a course data, T7b guards.
