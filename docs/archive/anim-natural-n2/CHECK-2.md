# anim-natural N2 - step 2 check (fresh checker, 0004b057)

2026-10-22 ~14:25, written by the job lead from the checker's hand-back. Verdict: FAIL (one blocker). Scratch harness
C:/NightShift/scratch/n2-check2/check.test.ts (reproduces the last desktop e2e-anim crab rows, /c/NightShift/an4-e2e.log:
layer off, walk track 3.5-5.7 cm and knee-out 2.4 cm in both).

## Findings
1. BLOCKER - the gated anti-crab asserts (CRAB_GATES on every gait; drawn and crouched sub-states also check track and
   knee-out, src/anim/audit/limits.ts ~220-299) turn red. Layer off -> on (track max cm, limit 7.0 standing / 8.0
   crouched; knee-out cm, limit 3.0): walk 1.4 5.7 -> 7.8, 2.4 -> 3.2; walk 2.1 6.2 -> 8.4, 2.5 -> 3.4; jog 5.8 -> 7.5,
   2.3 -> 3.1; crouch 2.15 7.2 -> 9.3, 2.5 -> 3.5; crouch run 7.3 -> 9.8, 2.5 -> 3.7; sneak 1.1 knee-out 2.2 -> 3.1;
   low ready walk 5.7 -> 7.8, 2.4 -> 3.3. Causes: track = the added hip yaw rotates the pelvis-frame measuring line
   (walk 7.3 with sway off; in the facing frame through the hip midpoint walk 5.2, jog 4.3, crouch 5.9: pass). Knee-out
   = the sway pushes the stance hip outside the stance foot (3.0-3.1 cm at walk even in the facing frame). In the facing
   frame, sway x0.7 (walk lateral 3.6 cm) keeps knee-out <= 2.9 everywhere. Done looks like: A11 (the gated crab track
   and knee-out read in the facing frame, a frame fix as METRICS.md uses for turns, coordinated with N1) + walk / jog /
   crouch sway ~0.7x; the e2e body motion block and PLAN lateral targets re-banded; every gated crab row passes headless.
2. Should-fix - run head yaw 0 -> 20.2 deg p2p (headFollow 0.35 on the A1 pop): run headFollow 0 until A1 lands, run
   head yaw < 6 deg.
3. Should-fix - anim-audit sway margin: walk gear 3 (2.1 m/s) 4.9 cm vs WALK_SWAY_WREN 5.0; finding 1's cut fixes it
   (gear 3 <= 4.5 cm).

## Passed
REPORT-2 numbers reproduce exactly; counter-rotation phase correct (left heel strike: left hip 1.2 cm forward, right
shoulder 2.6 cm forward, right wrist 24.6 cm forward); the pelvis sits over the stance foot (-1.46 / +1.49 cm single
support); planted slide 0 everywhere; knee separation passes; guards untouched (gate Wren only, wrenReady via tuneRows,
playerFigure.ts:82); remote parity identical frame by frame (max diff 0) on walk, jog, crouch walk, aim fwd, low ready;
no allocation, no Math.hypot; continuity on / off within 0.17 cm except aim 2.89 -> 2.56; phase lock holds. e2e body
motion block maths = unit harness; game speeds (src/config/movement.ts) measured: sneak 0.85, aim fwd 1.4 (pelvis 4.0),
aim side 0.7 (corr -0.99). 13 test files, 145 passed. tsc, eslint clean.

## Polish list
Head follow lags the chest in turns (a head should lead a turn); the aim nod (1.2 deg p2p head pitch while aiming: aim /
aimCrouchMove headNod 0 or fade by aimW); pace scaling within a row (0.75 m/s creep gets 7.5 deg pelvis, 4.1 cm sway);
e2e band edges (sneak head yaw 2.17 vs floor 2, run lateral 2.2 vs 2-3); bodyMotionStep's constant cos / sin could be
cached; studio in place shows no layer (step 5); the anim-audit --compare re-baseline on the PC.
