# AF4a - checker (fresh Opus, read-only review of c0fab095)

## Verdict: PASS

No required fixes.

## Review
- Files: src/player/characterRig.ts (GLIDE_HIP block + const), src/player/playerController.ts (KNEEL_STILL area, kneel line),
  tests/crouchStrafe.test.ts (new), report, changelog fragment. All inside the slice's list.
- Standing / OFF unchanged: `ck` = 0 when not crouched gives share 1, max 0.09, rate cap Infinity, which is the old
  `approachTo(..., GLIDE_HIP.tau)` exactly (characterRig.ts:2458-2464). Not aiming, `kneelStill(false)` = KNEEL_STILL
  (playerController.ts:40-42, 665). mocapStrafe / mocapPlayer / rig green.
- Hot path: scalars only, no closures or temp vectors; no Math.hypot.
- Numbers are backed by tests: crouchStrafe.test.ts asserts steady p2p <= 4 cm, beyond pace <= 2 cm, grip <= 1.0 (rifle) /
  1.02 (pistol), knee-out <= CRAB.kneeBow, stop-go / flip p2p (8.5 / 8 cm), no kneel on a flip, aimed stop still kneels 4/4.
- Known miss, pistol steady grip 1.01 vs 1.0 cm/frame: confirmed unchanged from before (before/numbers.md:77-78,
  1.01 at 0.7 m/s). Not worse, not broken; it is the pistol hold (WREN_PISTOL_READY), AF4b's file. Polish, not blocking.

## Polish list
- AF4b: pistol steady grip 1.01 -> <= 1.0 cm/frame (the pistol hold); the test's PISTOL_GRIP_STEADY 1.02
  (tests/crouchStrafe.test.ts:32) should go back to 1.0 once AF4b lands.
- AF4b: residual 4.6-4.9 cm hip swing on stop-go / flips (keyed crouch pelvis sway played sideways, animGraph crouchSet).
- AF4b: stop-go knee-out 10.0 / 10.3 cm during kneel transitions (ungated).
- Little headroom on e2e-anim crouched aimed strafe knee-out (2.9 vs 3.0 cm gate); any lower glide share fails it.
- Michael's walk: the aimed crouched kneel now comes 0.3 s later after a stop (0.35 s vs 0.05 s) - feel check.

## Tests (checker, one file at a time)
crouchStrafe 9/9, keyedCrouch 8/8, mocapCrouch 6/6, rig 21/21, mocapPlayer 10/10 (1 skipped). `npx tsc --noEmit -p .`
clean. e2e-anim not rerun (implementer's desktop lane-2 pass, report).
