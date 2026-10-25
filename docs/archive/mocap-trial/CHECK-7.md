# mocap-trial-2 - check 7 (fresh checker, Opus, on feature/mocap-on 1673e924)

2026-10-23. Narrow re-check after CHECK-6 (FIX, Required 1: guards ran the mocap set). Verdict: **PASS** (no required
items). The guard gate holds: guards with the switch on are bit-identical to OFF, 64 / 64 guard identity hashes match,
and Wren's carrier ON pose is unchanged across both the gate and the master 4.68.0 merge. Switch OFF is byte-identical to
origin/master 3950f3f8. The e2e-anim conversion touches shape / style rows only. The suspicious jog numbers (corr +0.99,
head pitch 4.82 deg) are the capture played as is, not a broken retarget.

## Required
None.

## Notes (not blocking)
- Jog / run / sprint trunk in phase (corr +0.99 / +0.89 / +0.91 in the clips). This is a capture feature, not a retarget
  fault, for four reasons:
  - **The runtime adds nothing.** The rendered ON values equal the raw clip to 0.01 deg. `clips/mocap/jog.ts` (CMU 16_36)
    pelvis yaw is 14.53 deg p2p and chest yaw 25.62 deg p2p. e2e ON measured 14.52 / 25.61.
  - **The same pipeline and performer give a textbook walk.** The walk clip has corr -0.92. At left strike it has the
    left hip forward (+3.8 deg) and the right shoulder forward (-1.2 deg). A pelvis or axis bug in the retarget would
    show in the walk too.
  - **The jog thorax phase is right.** At left strike (left foot +0.09, right foot -0.40) the chest is at -12.4 deg:
    right shoulder forward, against the forward leg. Only the pelvis has reversed: it puts the trailing hip forward
    (-6.8 deg). That is the walk-to-run reversal of pelvic rotation reported in running biomechanics, and it puts the
    pelvis in phase with the thorax.
  - **The magnitudes and the loop are normal.** Jog pelvis 14.5 and thorax 25.6 deg p2p are in the normal running range.
    The loop seam is continuous (frame 46 to 0: -6.8 to -6.8 pelvis, -12.4 to -12.4 chest). The largest pelvis step is
    2.4 deg per 60 Hz frame.
- Jog head pitch: the clip's own head pitch is 9.6 deg p2p, and the rig renders 4.82. A few degrees of nod per stride is
  normal for a jogger, so this is not broken. Head yaw ON 18.7 deg p2p (jog) and 11.4 (run) is on the large side for a
  runner: the head follows a 25 deg thorax swing. It is a style matter for Michael's eye, not a defect.
- `shapeTrack` keeps the crossing fail exactly as OFF had it. The fail is `min < -half`, and OFF's abs test failed the
  same samples. A foot crossed by less than `trackHalf` was never caught by the gait crab rows, ON or OFF. Only the
  wall / crouched rows have a "never cross" assert (`> -0.005`). This is not new and not caused by the change; MT2-E2EANIM
  reports ON sneak track min +1 cm. If a never-cross row is wanted on the holstered gaits ON, it would be a one-line add.
- The identity fixture's Wren / partner rows no longer reach the mocap set with the switch on (0 / 40 differ; CHECK-6 had
  3 / 40). The fixture rigs are not `carrier`, so they stay on the hand-keyed set. The live player and remote partner
  set `carrier = true` (player.ts:195, remoteAvatar.ts:157), and the ON dump below covers the carrier pose. Wren ON
  therefore has no identity-fixture coverage, only the dump and the mocap* tests.
- Non-carrier rigs keep the hand-keyed set with the switch on: the menu preview, the Anim Studio stage, the VIP, the
  dummy and the lab (MT2-GUARDS "Not done"). This is consistent with M4 as worded ("Wren walks"); flag it to Michael
  only if the menu or Studio Wren should show mocap.

## Checks
1. **Guard gate - PASS.**
   - mocapGuards 3 / 3, animSkeletonGuardIdentity 1 + 1 skipped, animSkeletonIdentity 1 + 1 skipped.
   - mocapSwitch 13 / 13, mocapDefault 3 / 3, mocapPlayer 10 + 1 skipped (A8).
   - zzguard (CHECK-6 probe; grunt / heavy / officer x patrol walk, walk-stop, walk turning 2 rad/s, jog-stop, aim walk):
     ON - OFF 0.00 cm on all 15, keyMocap 0.00, clip feet 0 frames. CHECK-6 had 21.9-76 cm.
   - zzidon: guards ON 0 / 64 differ from the OFF fixture (CHECK-6: 17 / 64).
   - Grep: no `LOCO.` read in animGraph.ts outside `mOn` / `mS` / `mSl` (:997-999); the rest are comments.
   - characterRig.ts sets `mOn = LOCO.mocap && this.carrier` (:1746). Its one other read, `LOCO.set.crouchWalk` (:2686),
     sits behind `this.mOn &&`.
   - Outside those two files, LOCO is written only by mocap.ts and read by main.ts's debug hook.
   - Wren carrier ON is unchanged. The dump driver with `setMocapLocomotion(true)` (c7out/zzdumpon.test.ts) was run at
     1673e924 and at d60f374f (pre-gate, pre-merge). Carrier rows: 0 / 154,560 values differ on all 7 plans.
   - Non-carrier rows ON at 1673e924 equal OFF exactly: 0 differ on all 7. At d60f374f they moved: up to 104,839 values,
     max 1.33.
2. **Switch OFF byte-identical to master - PASS.**
   - The repro dump (`mt-check/repro/dump.test.ts` as tests/zzdump.test.ts) gives 31,065,812 B, md5
     9ce3f3d1c70c299dca072d3a4f15f9ea in both copies (branch 1673e924 and origin/master 3950f3f8). `cmp` finds them
     identical.
   - The merge d8830ba2 changed nothing under src/anim or src/player against its branch parent.
   - The md5 equals CHECK-6's, so master 4.68.0 did not move the rig either.
3. **e2e-anim notes conversion - PASS.**
   - Converted rows:
     - crab gait rows: knee separation, track width, knee-out, elbows in;
     - holstered sub-state rows: the same four;
     - body mechanics: pelvis / shoulder p2p, lateral sway, head yaw, counter-rotation corr, head pitch on the
       non-aim rows.
   - All are shape / style limits: M1 notes.
   - Still assert ON: planted feet locked (gait :698, sub-states :780), the crossed side of the track (`shapeTrack`),
     aim glide pelvis / corr / head yaw, aim-row head pitch, and everything below the body block (transitions, flinch,
     timings, turn feet, crouch pops, walls).
   - OFF: `shape` returns `assert(cond, msg)`, and `shapeTrack` with `!MOCAP` is `assert(tr.pass)`. The messages are the
     same text, so OFF asserts exactly as before.
   - A missing `__mocapOn` hook falls back to OFF (strict).
   - Values past the old bars (MT2-E2EANIM table) are believable capture values. Examples: walk sway 4.2 cm, knee-out
     3.8-4.6 cm on the stops, sneak track 9.1 cm with min +1 cm. Jog: see Notes.
   - None hides a pop, slide, crossing, clipping or timing defect.
4. **Merge sanity - PASS.**
   - `npx tsc --noEmit -p .`: one error, in the checker's own copy tests/zzdump.test.ts(13,12) (TS6133, unused `t`, in
     the repro script). None in the repo.
   - `npx eslint src/anim src/player/characterRig.ts src/core/settings.ts src/main.ts`: exit 0, no output.

## Ran (scratch/mt2/check7 = git archive 1673e924; check7-master = 3950f3f8; check7-pre = d60f374f; node_modules
junctioned to Mobile-Coop-mocap-trial-2; outputs scratch/mt2/c7out; scripts c7out/run.sh, runm.sh, js/)
- Vitest one file at a time:
  - repo tests: mocapGuards, animSkeletonGuardIdentity, animSkeletonIdentity, mocapSwitch, mocapDefault, mocapPlayer;
  - probes copied from check6/tests: zzguard, zzidon (OUT=);
  - zzdump (DUMP_OUT=) in check7 and check7-master;
  - zzdumpon (dump with the switch on) in check7 and check7-pre.
- Then tsc and eslint.
- Node scripts:
  - js/clipyaw.mjs, js/phase.mjs: pelvis / chest / head yaw and pitch from the clip arrays, phase against the clip feet;
  - js/cmp.mjs: per-row dump compare.
- No e2e, no GPU, no full vitest.
