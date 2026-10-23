# crouch-pops - report

Branch `feature/crouch-pops` (stacks on PR #221, `feature/mocap-strafe` 191c3565). Brief: `BRIEF.md` (CP-A1..A4).

## Cause
`selectBodyGroup` switches the rig's Body row at crouch 0.5 (`crouched = p.crouch > 0.5`). With Michael's tune the
standing rows (idle, walk, jog, run) carry trackMul 0.05 and the crouched rows 1, so mid-crouch the Body base target
jumped from 0.05 to 1 and `bodyRigBegin`'s first-order ease (BODY_TAU 0.1 s) started at full rate: a step in the stance
half-width's velocity in the middle of the controller's 0.22 s crouch blend (the feet target, then the knees and the
hands on the knees). Not the graph blend, the foot planner or the rig.

## Fix (CP-A2)
- `src/anim/tune.ts` `bodyRigBegin(st, gi, p, rig, dt, gi2 = -1, w = 0)`: with 0 < w < 1 the target is row `gi`
  blended toward row `gi2` by `w`. No allocation; without the new arguments as before.
- `src/anim/tuneJointsRig.ts` `tuneRigBegin`: mid-crouch (0 < crouch < 1, no studio pin) it picks the standing row
  (`selectBodyGroup` at crouch 0) and the crouched row (at crouch 1) and passes the crouch amount. The ease's input is
  then continuous, so its output velocity is too. At crouch 0 or 1 nothing changes (bit-identical); every Body field
  gets the same rule. Mocap ON and OFF take the same path. Michael's tune unchanged (idle trackMul 0.05).
- `scripts/e2e-anim.mjs`: the two raised limits (9.6 / 8.3 cm) removed; both transitions keep `L.CROUCH_POP` (7.5).

## Numbers
The pop (CP-A1): the stance width's velocity change per 60 Hz frame over the transition (headless CT-driven rig,
`tests/crouchPops.test.ts`), deterministic:

| Transition | mocap | before | after | untuned width |
| --- | --- | --- | --- | --- |
| holstered still: stand -> crouch -> stand | OFF | 2.33 cm | 0.26 cm | 0.15 cm |
| holstered still: stand -> crouch -> stand | ON | 2.33 cm | 0.26 cm | 0.15 cm |
| holstered running: crouch -> stand | OFF | 1.57 cm | 0.12 cm | 0.23 cm |
| holstered running: crouch -> stand | ON | 1.93 cm | 0.24 cm | 0.16 cm |

In game (desktop GPU, e2e-anim's metric: worst velocity change of the hips, wrists, head, knees over planted feet; probe
`zzcrouch`, baked vs no Body base; the still case varies about +-0.4 cm run to run):

| Transition | mocap | before baked / untuned | after baked / untuned |
| --- | --- | --- | --- |
| still s-c-s | ON | 6.96 / 6.35 (+0.61) | 6.39-6.90 / 6.43-6.76 (-0.04..+0.14) |
| still s-c-s | OFF | 7.14 / 6.33 (+0.81) | 6.25-6.63 / 6.55-6.76 (<= 0) |
| running c-s | ON | 5.81 / 5.71 (+0.10) | 5.76 / 5.71 (+0.05) |
| running c-s | OFF | 9.43 / 8.46 | 9.47 / 8.46 (see open items) |

e2e-anim (mocap ON) after: still 6.9 cm (hips), walking 6.0, running 5.2 (wristL), all <= 7.5. The 9.6 / 8.3 cm the
anim-bake-targets STATE named were the raised limits (measured then 8.7 kneeL / 7.5 wristL, before #221).

## Tests
- `tests/crouchPops.test.ts` (new, 5): fails before the fix (width 1.57-2.33 cm), passes after.
- `tests/animSkeletonIdentity.test.ts` 1 pass 1 skip; `tests/footPlanner.test.ts` 12; `tests/mocapSwitch.test.ts` 13;
  `tests/animBodyBase.test.ts` 6; `tests/crouchEntryRig.test.ts` 1; `tests/animBakeAll.test.ts` 10;
  `tests/animMoveRows.test.ts` 18: all pass. `tsc --noEmit` clean; eslint clean on the touched files.
- e2e (desktop lane 2, port 4192, `E2E_GPU=1`, `E2E_JOBS=1`): e2e-anim ok 34 s (317 asserts); e2e-clip ok 13 s.

## Open items
- Mocap OFF, holstered running: the crouch-down (not the stand-up) reads 9.47 cm wristR, over 7.5 before and after
  this fix and with trackMul at 1 too (9.43): the run row's armSwingMul 1.6 (8.29 cm without it; 8.46 untuned). The
  swing's own size, not the stance width. e2e-anim runs with the switch ON (5.2 cm) so it does not gate it.
- The mid-crouch blend also eases elbowOutAdd / armSwingMul / kneeLiftMul across the crouch (one rule, CP-A2).
