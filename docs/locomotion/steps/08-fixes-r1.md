# Step 08 fix round 1 (harness code only)

1. Local: call scene.activeCamera.getViewMatrix(true) before each frameUpdate in the local hook (anim-audit.mjs ~156); stopping the render loop froze camera.globalPosition, so anim LOD (characterRig.ts ~829-837, 22 m) halved the rig rate far from spawn (local fails 690 -> 554 with the refresh).
2. Remote LOD: refresh camera view matrices every frame on both pages; place A's player within LOD distance of B every scenario (e.g. 3-4 m behind B's start); record each frame's LOD skip and fail any row that has one.
3. poseError split: (a) gating part = root, head, wrists, plus ankles on settled frames (e2e-netmove's rule); (b) gait phase offset metric, reported (A38); (c) phase-aligned, root-relative lower-body error.
4. pops: count rubber-banding only: root / capsule discontinuity of the copy, and joint steps over the limit that B's own track does not have at t - lag.
5. stopidle: 1.5 s idle tail; breath measured after the settle.
6. --compare: reset gait phase and idle timers on B's rig and on the copy at each scenario start; gate remote poseError (gating part), pops and pairAlign against a noise band from two baseline runs (not informational).
7. Baseline: regenerate after 1-6, update AUDIT.md numbers; two full runs with no local flips; --compare against the committed file prints no regression.
8. run-e2e SCRIPT regex: exclude -lib helpers (e2e-lib, e2e-net-lib) from suites; map scripts/e2e-net-lib.mjs changes to e2e-netmove and anim-audit in the quick map.

Carried to step 20 (bot partner) / 30 (co-op batch): remote stance and weapon settle compared against B's own crouchBlend at t - lag (D8 finding: the remote eases a binary crouch flag at 10/s instead of following the owner's curve); paired-move alignment with palm contact vs ball-of-foot, reported on the owner's page too; remote runtime 72 s (target 60: shorten the 800 ms place wait and 1.5 s jitter probe); 120 Hz pump jitter marginal (probe longer or re-probe once).
