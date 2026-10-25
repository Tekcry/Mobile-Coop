# Step 11 fix round 1 (back-to-wall pose quality; game code)

From the wall audit rows (local 60 / 120 Hz, remote 60 Hz) and the raw dump:
1. Entry: the capsule glides 0.85 -> 0.32 m in ~0.17 s at 5.2 m/s, overshoots the 0.35 m standoff, then pops back to 0.353 m; hips drop 19 cm in one frame when `on` switches (frame 11); the right ankle passes 26 cm behind the wall face mid-glide. The step file asks for a 0.2 s settle with no glide: ease the capsule onto the standoff with no overshoot, blend the pelvis (no >5.3 cm per frame jump at 60 Hz), feet never behind the face.
2. Back flat on the wall: hips 0.158 m from the face but torso 0.23-0.28 m and shoulders 0.36-0.50 m (upper body pitched forward). Target wallGap <= 3 cm (WALL_GAP in src/anim/audit/limits.ts).
3. Left arm: the wall-hand IK drives the left upper arm / forearm ~14 cm into the torso (selfUpperArmL 13.5, selfForearmL 14.8 cm; limit 2 cm). Place the wall-hand target so the arm stays clear (A6 offWall).
4. Feet slide during wall slides (footSlide 4.5 / 15 cm local; limit 1 cm): the feet must step with the slide (side-step gait or planner steps), not skate.
5. Joint rate 47.7 / 53.9 deg per frame local, 73 remote (limit 25 / 12.5): smooth the entry / exit / crouch transitions on the wall.
6. selfThighs 11.9 / 8.4 cm, selfShanks 3.7 / 8.4 cm: the crouched wall stance crosses the legs; widen it.
7. e2e-clip "ladder climb: no part of the body goes into the world (1 frame, 4.7 cm)" fails every time since step 11: find whether this step caused it (git stash is not allowed; read the diff for anything touching ladder / attach / rig paths, e.g. the wall foot pins or the kneel gate) and fix it.
Then re-cut docs/locomotion/audit/anim-baseline.json (two full runs, --band) and report the wall rows before / after. The full dedicated back-to-wall clip set (D9 / D10 sides) stays in step 27; this round makes the core pose clean.
