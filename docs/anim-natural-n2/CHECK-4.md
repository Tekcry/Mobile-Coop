# anim-natural N2 - step 3 (arms) check (fresh checker, 4e974ea1)

2026-10-22 ~20:30, written by the job lead from the checker's hand-back. Verdict: PASS (no blocker). Scratch in
C:/NightShift/scratch/n2-check3/. Single files only (bodyMotion 12 + 1 skipped, crabFacing 3, keyedWalk 10,
runKeyContinuity 2, animAudit 27, animSkeletonIdentity, animSkeletonGuardIdentity, keyedDrawn 4, readyHands 2; tsc clean).

## Reproduced (headless 60 Hz): every REPORT-3 number exactly
Walk wrist range 25.0 -> 31.1 cm (arms only 29.1), peak 0.94 -> 1.17 m/s; jog 36.8 both, peak 7.21 -> 6.80 (chest 6.89
-> 6.02); run 75.6 / 17.57 untouched; sprint 20.2 -> 18.92; crouch / sneak identical; turn 180 jog 14.24 -> 6.90 (chest
14.76 -> 7.28), strafe start 9.79 -> 6.81, curve jog 7.23 -> 6.81, turn 90 walk 1.80 -> 2.26, run turns unchanged; low
ready rows equal field for field; AUDIT 35 low ready run pelvis 25.8 p2p, max 3.1 deg / frame; 120 / 240 Hz turn and
strafe chest peaks 6.2-7.25, walk 31.1 at every rate.

## Checks
1. Identity: own hash harness (every joint world matrix, every frame) on a git archive of 4028d386 vs 4e974ea1 with
   KEY_MOTION at identity: bit-identical on 20 scenarios. Change on: walk, jog, sprint, turns, strafe, ramp move; run,
   crouch, low ready, idle stay. The Wren fixture cannot see the change (its rigs never set stride 'facing', so keyedOk is
   false); pinned by bodyMotion.test's measured-arms test and the motion-off fixture.
2. Deviations justified: jog armGain 1.6 measures 53.3 cm (target ~35), 1.0 gives 36.8; run cap 6 drags the run peak
   17.6 -> 7.6 m/s (overrides Michael's keys), 18 leaves the 4 m/s run identical.
3. Hot path: `scaleKeyedArms` allocates nothing (0.38 B, as the empty control); the rig cap allocates (should-fix 1).
4. Remote parity: the cap reads graph-internal inputs only (gate, pace shares, crouch); per-rig history rate-independent;
   the far-rig LOD skip keeps it continuous.
5. Hitch / pause / teleport: dt 1.5 s or 0.25 s does not engage the cap (one natural catch-up step); dt 0 turns the cap
   off (paused pose = keys); a 50 m teleport with a 180 deg flip gives no chest-frame wrist step.
6. Clash map: the keyedArm call site (characterRig.ts:2535-2536, N3's range) untouched; rig hunks :2286-2288, :2650-2718,
   :2731-2754; no new conflicts with N1's merge branch.
7. e2e-anim expected green (no wrist asserts; elbow wing via crabFacing 7.37 / 7.32 vs 8.3 / 8.0; low ready bit-identical;
   RUN_TUNE unaffected; e2e-studio arm asserts are paused or joint offsets).

## Should-fix (do before the PR, with the run arm pop fix)
1. The cap allocates 208 B per frame per rig (CLAUDE.md hot paths): `armCap()` takes 6 computed doubles as arguments
   (call characterRig.ts:2742, signature :2669), too large to inline, so they box. Per-frame new_space minimum with
   walk / jog cross-fades: 3284.16 B on 4028d386, 3492.16 B on 4e974ea1 (two runs each). Done looks like: write the six
   values into `armCapO` in keyedArm and call `armCap(si, cont)`; per-frame new_space equal to 4028d386 (the scratch
   copy reads 3284.16).
2. In the studio the cap filters Michael's keyed loops while they play: the studio Wren is the player rig standing with
   stride 'facing', gate open, the cap reads the walk's 6 m/s (the drive bypasses the pace bands). Playing loops, cap on
   vs off: keyed:run up to 7.7 cm off its keys on 24 / 240 frames, hold_knife 27.5 cm on 11 frames, hold_choke 2.0 cm
   (paused views exact). Done looks like: no cap while `graph.drive !== null` (`o.motion.armSpeed = Infinity` in
   `AnimGraph.bodyMotion`, or through the drive); studio keyed loops then match the cap-off rig at 0.0 cm.

## Polish
- Turn / strafe peaks 6.8-7.3 m/s (PLAN < 6): `keyedShFore`'s shoulder / forearm turn (characterRig.ts:2763, :2966) is
  applied after the cap.
- When the cap engages, `armCapP` stores the straight-line elbow blend (slightly inside the upper-arm sphere): negligible.
- At 120 / 240 Hz the run's own keys read 18.6-19.0 m/s, so the 18 cap touches the run slightly there (60 Hz untouched).
- 120 Hz strafe root-frame wrist 19.4 m/s with and without the cap: a pre-existing root-frame artifact (chest 6.2).
- bodyMotion.test checks only the walk range at 120 / 240 Hz; a turn180Jog peak there would pin rate independence.
- animGraph.ts:55: N2's import line is next to N3's area (trivial adjacent-line conflict possible; merged clean at 4.56.0).
- CHECK-3 should-fix 1 (the flaky allocation harness) still open.
