# Michael's play-check notes (2026-10-16, laptop walkthrough)

Recorded verbatim in meaning, not yet planned. Michael: "just make note of these for now and we will plan when its best to fix them." Nothing here is acted on until he decides; then each becomes a Block D step change or a new step and is logged in DECISIONS.md as his.

Build played: the branch up to the Block C end (9b1712e), before step 21.

| # | Note | Touches | Conflicts with |
| --- | --- | --- | --- |
| N1 | Back to wall is glitchy. | Step 11-12b wall; step 27 (A47 wall pose polish) | - |
| N2 | Looking around corners on walls (peek / lean-out) is glitchy. | Steps 12, 12b; step 27 (D9 grips, PC-PASS 40 / 42 weapon jump) | - |
| N3 | Can't crouch against a wall. | Step 11 wall stance (crouched wall exists on low walls; standing wall + crouch input) | - |
| N4 | Expected at least some form of cover system. | Block A step 05 removed snap cover; back-to-wall replaced it (bible 5.3, A1) | Brief Block A ("snap cover ... removed"), bible 5.3 |
| N5 | Back to wall moves too quick along the wall. | WALL slide speed / gear cap (wallController, WALL.maxGear) | - |
| N6 | Movement still too arcadey and fast; no sense of weight. | Gear speeds (src/config/movement.ts GEARS), steps 21-22 (D5.1 speed-scaled gait, D5.2 lean, D5.3 settle), 24 camera | D5 "control stays instant" (bible 5.12.1) |
| N7 | Thermal is too clear when cycling; should be grainier. | Step 14 thermal post branch (render only) | - |
| N8 | Standing without a weapon is awkward; return to always having a weapon out, in a very tactical stance / low ready. | Step 09 holstered-by-default, A42 ready hands; step 21 (ready hands), 25 (weapon batch) | Brief Block C "holstered unless aiming, no hip fire" (bible 5.4 / 5.6), step 10 elbow strike (fire while holstered) |

Notes for planning:
- N8 overlaps step 21, which was running when the notes came in (it tunes the holstered ready hands). If N8 is adopted, that part of step 21 is superseded; the D2 no-bob work in step 21 stands either way.
- N4 and N8 reverse earlier decisions (the brief and the bible), so they need Michael's explicit call and a DECISIONS entry before any step changes.
- N1-N3 and N5 cluster in the back-to-wall system: a dedicated wall step before or inside step 27 may fit better than spreading them.
