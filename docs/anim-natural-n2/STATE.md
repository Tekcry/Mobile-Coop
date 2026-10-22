# anim-natural N2 - state

## Now (2026-10-22 ~14:30 save point)
Step 2 built (0004b057, REPORT-2.md); a fresh checker is reviewing it (its verdict comes back as text: write it to
CHECK-2.md). A1 done and KEPT on its own branch `feature/anim-n2-runkey` (038e2519, docs/anim-natural-n2/A1-RUNKEY.md
there: run snap 21 -> 3 deg per frame, wrist 14.8 -> 11.8 m/s; one open test, the keyedWalk run elbow flex 54.8 < 55).

## Next
1. CHECK-2.md; one fix round if needed (blockers only while the current goal holds).
2. Merge `feature/anim-n2-runkey` into this branch (then re-capture the Wren identity fixture; the guard one must not
   move); master 4.54.0 merge.
3. Step 3 (arms): KEY_MOTION.armGain, the wrist speed cap (A8), plus PASS2 (Menu Notes N0 pass 2,
   docs/anim-natural/PASS2.md on feature/anim-natural) item 7 (low-ready gaits: arms and head locked to the gun) and item
   9 (crouch run uses the jog's arm swing); bring the run elbow flex back over 55 (keyedWalk). Step 4 (drawn stills) +
   PASS2 item 1 (hit flinch invisible: rig.hit 0.9 deg shoulders, animGraph.hitReact; N2 took it, 14:30). Step 5 (tuner
   section + bake). Each: implementer + fresh checker.
4. Under the lock: npm run check, e2e-anim (the new body motion block: first desktop run, bands may need review;
   RUN_TUNE tightening from A1-RUNKEY.md), e2e-studio, e2e-netmove; anim-audit `--compare` re-baseline (walk lateral
   1.7 -> 4.4 cm is intended, Michael's ~5 cm); GPU sheets before / after (E2E_GPU=1).
5. PR (minor) after N1's PR; the A1 before / after sheets in the PR body for Michael.

## Done
- 2026-10-22 ~14:05: branch from master 4.53.0 (5220f79c); research, BRIEF / PLAN / STATE.

## Resume prompt
```
anim-natural N2: RESUME. Night Shift | CT Core Build, Opus, effort high. Folder C:/NightShift/Mobile-Coop-anim-natural-n2,
branch feature/anim-natural-n2. Read CLAUDE.md, docs/ROADMAP.md, then docs/anim-natural-n2/BRIEF.md, PLAN.md, this
STATE. Carry on from "Next": implementer + checker per step, heavy runs under C:/NightShift/heavy.lock, message
"Night Shift | Orchestrator" at each step and the PR.
```
