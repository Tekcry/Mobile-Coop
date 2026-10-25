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

## Plan (M14, Michael, 2026-10-16)
N8 keep holstered; standing holstered = arms relaxed at the sides with swing (step 21). N4 CT back-to-wall polished, no snap cover. N1-N3, N5 in new step 21w (stop at edges, crouch on any wall, ~0.9 m/s shuffle, no pops / camera jerks / misfires). N6 moderate: speeds -15-20%, ~0.3 s ramp up, ~0.25 s stop, slight turn inertia, in step 22. N7 grain on thermal, electro and night vision in step 21v. Pauses after 21w + 21v and after 22.

## Play test 2 (2026-10-17, laptop, playtest/combined = step 22 + audio; Michael's checklist answers, verbatim notes)
Good: bob ("camera works well"), music ("works well"). Skipped: medkit, loadout, difficulty, weapon sounds, co-op.

| # | Check | Michael's note |
| --- | --- | --- |
| P1 | Start / stop | "the mid animation system has been removed, the player should stop mid animation when walking/crouching, just not when sprinting. Cant really tell that there's a lean. Arms are awkward standing still as the character is leant over, he should be standing up straight and arms should move naturally as you walk/crouching/sprint." |
| P2 | Speeds | "Speeds are good, the moves don't feel weighted/realistic enough" |
| P3 | Turns | "All turning movements snap and are unrealistic, you can spin in circles and the legs go all bendy and confused. Reverse at run works." |
| P4 | Arms | "Arms work but the overall characters bent over pose is unrealistic. He needs to stand up straight." |
| P5 | Draw / strike | "works, elbow strike is too slow, and shouldn't work unless in range with an enemy." |
| P6 | Wall enter | "Cover works, not good crouching on low surfaces as head sticks over and its an unrealistic stance, needs to be more of a sideways crouch with back/shoulder on the wall. It's not believable. I think the whole animation should actually look like that instead of literally back to wall, no one would move that way." |
| P7 | Wall edge | "Wall strafe works well, has an awkward lean to it when moving. Looking around the corner doesn't work, head bends the wrong way depending on where you look and twists unrealistically, the camera also doesn't slide out properly and is not helpful at all, can't see around the corner." |
| P8 | Wall crouch | "Functionally works, but is very awkward and doesn't lean out enough on ends. Aiming over cover is also a full stand which is too much, he should only just lean over the cover and still look like he's crouching." |
| P9 | Wall lean | "Character is clipping inside the wall, doesn't lean out enough. Same animation issue as above, its just not believable" |
| P10 | Door peek | "Doesn't work well, it should also [let] the character push the door open slowly to see inside, and walk backwards to slowly close the door as well. Needs refinement." |
| P11 | Vision | "Night vision is good, thermal should be much more blurry, it should be difficult to see very far ahead as its a full thermal view. Research FLIR thermal cameras and their result on a high resolution version camera." |
| P12 | Controls | "Works, but it should prevent you from remapping onto a shared button. It should ask you to remap the original button as well which automatically pops up." |
| P13 | Footsteps | "Works but the steps are just too loud in game. Worked in time with feet." (audio branch, not this run) |
| P14 | Overall | "Movement doesn't feel exactly like chaos theory. Needs comprehensive research into the chaos theory movement system, a comparison between that and our current system, and what needs to change to match it. Taking into consideration I think the wall/crouch cover system should be updated to be more realistic." |
| P15 | Aim camera | "Any camera view when aiming weapons should be from shoulder, much closer than the current camera, similar to CT" |
| P16 | Shoulder swap | "Swapping shoulder should also change the weapon to the next shoulder, but it should be a realistic change, right now it just changes shoulder but the weapon is still in one hand" |
