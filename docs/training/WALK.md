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
  B3-rope, B3-floor, B5-SR, B6-CR, B7-roof, B8-RT, B9-B2.

## What to check per bay (about 5 minutes each)
| Bay | Look at |
| --- | --- |
| B1 Lift and kit store (y 16) | Room sizes; corridor and store; spawns; the briefing glass |
| B2 Assault lanes | Both lanes in order (step, vault, mantle, ladder, gallery, pipe, lever door at x 24, trench, beam hang, gap jump L1 -> L2, drop pads, windows); glass walls not climbable (they show only a frame: no glass mesh yet) |
| B3 Intake shaft | Split jump in the casing slot (B3-RC) and up onto the casing; wall jump to G3; rope down past the control-room window and kick through; zipline from G3 (B3-G3); fan-pit fence; one-way duct |
| B4 Cistern | Cells C1-C3, walls W1 / W2 (W2 lowered to 4.25 for the human ladder, A35), valve gallery, sluice, overflow channel, outlet platform |
| B5 Standby plant | Entry landing at 4.4 and its stair (A32 / A36), gensets, trench and panels, cable gallery (shortened, A36), switch room and its two doors, fuel bay |
| B6 Mock site | Reception, corridor (L leg dead-ends, A36), open office, control-room mezzanine, records and the vent drop onto the desk, mantrap, server room, keypad nook |
| S6 / A6 | The stair down; the airlock |
| B7 The House | Cavern, two storeys, roof and parapet (0.9), annex roof wall jump, water main at 4.9 (drop takedown), windows, store door |
| B8 The Range | Firing line, lanes (lanes 5 and 6 far stands at 45 m), shoot house, catwalk and tower cabin, catwalk stair and its door, sniper scaffold (z 18..22) |
| B9 The Plot | Plot floor, map table, balconies B-1 (4.5) and B-2 (9.0), both stair towers, the bridge, rope from the bridge rail, zipline to the lift lobby, message-tube duct, north-west co-op lip, staff tunnel door (now on the east wall), lift L9 |

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
