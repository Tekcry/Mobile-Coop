# AF4b - checker (fresh Opus, read-only review of 4fe5b3ab)

## Verdict: PASS

No blocking findings. Base origin/feature/anim-fix-pass e1cafbe1.

## Review
- Files (`git diff origin/feature/anim-fix-pass...HEAD`): src/anim/animGraph.ts, tests/crouchStrafe.test.ts,
  docs/archive/anim-fix-pass/AF4b-REPORT.md, docs/archive/anim-fix-pass/after-af4b/ (numbers.md + 4 sheets), changes/feature-afp-af4b.md.
  All inside the PLAN row. No characterRig.ts change. Untracked zz* repro files not committed.
- Cause 1 (kneel side) landed: animGraph.ts:1171, off the wall and armed the knee is the gun hand's (`i.hand`), not the
  planner lead; wall rule unchanged; holstered keeps the lead rule (free movement squats instead). `i.hand` / `i.armed`
  are on the remote copy too, so this is also steadier owner vs remote than the lead was.
- Cause 2 (forward pelvis sway on a sideways step) not landed, reported honestly (REPORT "Cause 2 ... Reverted"). Acceptable:
  no PLAN acceptance bar measures the sway; the attempt broke the e2e-anim knee-out gate (3.3 vs 3.0); hip swing stays
  within AF4a's stop-go / flip bars (8.5 / 8 cm). Carried as an open item.
- Cause 3 (wall) landed: animGraph.ts:1501-1503 drops the WALL_READY tuck by the crouch (`gs`), so the reversal's
  `awayYaw` flip (1504) no longer swings the gun crouched; `bendK` now applies there (nw = 1 - cw); CROUCH_GUN.wall lift
  (1592-1599); armed side-on drops WALL_SIDE_POSE.spine's extra lean (1223). Standing at a wall the tuck is unchanged (gs 0).
- Pistol "between the knees": CROUCH_GUN.pistol (638, 1591-1599), PISTOL_REACH_CROUCH (1524). Bars in the report met.
- Low-ready crouch -> stand fix (5): `pck = pistolW * max(crouchK, smoothstep(kneelW)) * ready * cl` (1591). `kneelW` only
  rises while `wantKneel` (needs `i.kneel` and crouchK > 0.05, 1159) and otherwise falls every frame over
  max(standTime, kneelTime) (1170-1172); the update runs every frame with no early return between 1172 and 1591. So a
  cancelled kneel or standing up takes the lift back to the crouch share (0 standing) within ~kneelTime; it cannot stick.
  `ready` (raise) and `cl` (carryLow) also gate it, so it never acts on a raised gun.
- Hot path: scalars only; `CG` is a reference to a module const; no allocation, no Math.hypot in src. Strict TS kept
  (`!` on channel reads as the surrounding code).
- Asserts: none loosened. PISTOL_GRIP_STEADY tightened 1.02 -> 1.0 (crouchStrafe.test.ts:33, AF4a polish item closed).
- New pop test (crouchStrafe.test.ts:243-306) guards the fix through `pushMax <= 0.01` (305), reading the rig's real
  `gunPush` (characterRig.ts:956, set from clearBody at 2888). Report: 4.2 cm with the crouch-only line, 0 now. Not
  re-proven here (no src edits allowed); the mechanism is consistent with the line change.

## Tests (checker, desktop, one file at a time; mocap* with --maxWorkers=2)
crouchStrafe 16/16, keyedCrouch 8/8, mocapCrouch 7/7, mocapStrafe 12/12. tsc / eslint not rerun (CPU cap; report: clean).
e2e-anim / e2e-clip not run here (laptop, same commit).

## Open items (not blocking)
- PLAN acceptance names "wall* tests"; the report lists none run. wallStance / wallKeyed / wallController do not pose an
  armed crouched wall or read weapon channels (grep), so risk is low, but they should be run once (laptop or lead).
- e2e-anim (low ready crouch -> stand 5.5 in the zz repro only; knee-out 2.8 vs 3.0) and e2e-clip on 4fe5b3ab: laptop.

## Polish list
- Cause 2: crouched hip swing 6-8 cm p2p on stop-go / flips and knee-out 10 cm during kneel transitions (kneel pose job).
- `gs` (1501) is by the crouch alone, so a crouched flat-back wall stance (wallTurn < 0.35) also drops the tuck for the
  open carry + CROUCH_GUN.wall; comment says "side-on". Fine visually per the sheets; worth a look in the walk.
- Wall reversal: pistol wrist 13 cm a frame in the root frame through the 180 deg turn (pre-existing, report).
- Pistol low-ready crouched stop-go clears the legs by 0.6 cm only.
- Test uses Math.hypot and per-frame `map` / `slice` (crouchStrafe.test.ts:283-295): test-only, matches other tests.
- Feel check for Michael: armed kneel always on the right knee; crouched pistol low ready sits higher.
