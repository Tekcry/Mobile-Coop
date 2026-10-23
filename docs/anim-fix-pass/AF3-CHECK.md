# AF3 checker - P2 crouch lean and crouch walk

Fresh checker (Opus), 2026-10-23. Reviewed `git diff 44ed5389...ef4e8a8c` on feature/afp-af3 against PLAN.md "AF3" and
AF3-REPORT.md. Read-only review: no code edited.

## Verdict: PASS

Every AF3 acceptance bar is met and asserted in the new mocapCrouch block "(afp AF3) the balanced crouch"; numbers
reproduced here match the report exactly. No required fixes.

| bar | measured (this check) |
| --- | --- |
| crouch idle unchanged | trunk 28.4 deg, hips 50.6 cm (same as AF0 before) |
| trunk 30-38 deg, gears 1-3 | 32.2 / 31.7 / 31.5 |
| <= 6 deg over the gear 1 -> 3 ramp | -0.8 deg |
| hips change <= 5 cm, gears 1-3 | 63.9 / 62.7 / 61.7 (2.2 cm); ramp -2.2 cm |
| CoM fore-aft within 5 cm, double support | 2.8 / 2.9 / 2.8 cm |
| pelvis sway <= 5 cm p2p | 4.2 / 3.1 / 3.3 (ramp 4.2) |
| step 0.40-0.50 m at 1.3-1.7 m/s | 44.9 / 49.6 cm (gear 1: 39.8) |
| foot slide <= 1 cm | 0.00-0.01 cm |

## Checked
- Files: animGraph.ts (crouch tables, crouchSet, `cBackK` field + easing at :1899), motion.ts (CROUCH_STEP, stepLength),
  mocapCrouch.test.ts are inside AF3's row; keyedCrouch.test.ts in the row is untouched and passes. Outside the row:
  changelog fragment, docs, and the two identity fixtures (justified, below).
- Identity fixtures, structurally diffed (JSON, base vs head): anim-skeleton-identity.json changes only
  `state:crouchWalk` and `partner:moves`; -motion-off.json changes only `state:crouchWalk` and `partner:moves`
  (rig + poser entries). Matches the report.
- Crouch idle: the lean / drop / back are applied only in the `idleShare < 1` branch and the idle is mixed in after, so a
  full idle (idleShare 1) is the untouched KEYED_CROUCH_IDLE; harness confirms 28.4 deg.
- OFF path: AF5 made mocap the only player path (src/core/app.ts:136, `applyMocapSwitch(..., true)`; only `?mocap=0` or
  the tuner box roll back), so mocap-off changes are dev-only. Mocap-on drawn crouch (`kCrD`) keeps its old lean and no
  hips-back via `leanD` / `dw`, so the player's drawn crouch is not made worse (e2e-anim low-ready elbows 5.9 cm, bar 6).
- CROUCH_BACK_TURN: `cBackK = approach(cBackK, clamp(1 - |yawRate| / 0.5, 0, 1), 0.1, dt)`; scales only the `back`
  term (`pel[2] -= back * cBackK`), zeroed for `kCrD`. Reads correctly; straight-line CoM bar unaffected.
- `leanD` read: `dw ? p0.leanD + (p1.leanD - p0.leanD) * t : p0.lean + ...`; KEYED_CROUCH_POSE leanD keeps the old leans
  (0.08 / 0.12 / 0.2). Correct.
- Hot path: scalars only (no closures, no temp vectors, no Math.hypot) in crouchSet, the update line and stepLength;
  mocapCrouch's per-frame allocation test passes.

## Polish (not blocking)
1. src/anim/animGraph.ts:2891 MOCAP_CROUCH_POSE.leanD (-0.19) is dead: `kCrD` is always called with `mc` null
   (:1904), so p0 is never MOCAP_CROUCH_POSE when `dw`. Drop it or note "unused, type shape only" (AF4b owns the file).
2. src/anim/animGraph.ts:2382 with mocap off (`?mocap=0`, dev rollback only) the drawn crouch uses `kCr`, so it takes the
   new walk lean 0.18 and the hips-back, unlike the mocap-on drawn crouch (`kCrD`, leanD). Dev-only; AF4b may want the
   same `leanD` rule there for parity.
3. Gear 3 step 49.6 cm against a 50 cm ceiling and low-ready elbows 5.9 cm against 6.0: both at the edge; any later
   CROUCH_STEP or drawn-carriage tweak should re-read them.
4. `cBackK` eases only while the keyed block runs; on re-entering the crouch it starts from its last value (tau 0.1 s,
   harmless).
5. after-af3/numbers.md title still reads "before numbers" (AF0 test header).
6. Report's open item stands: mocap-off crouched turning slides up to 5 cm (dev path only; rig fix for AF4a's file).

## Tests (this check, single files, one at a time)
mocapCrouch 7/7, keyedCrouch 8/8, mocapPlayer 10 (+1 skipped), mocapSwitch 13/13, mocapRunFeet 6 (+1 skipped),
footPlanner 12/12, mocapCrouchShift 2/2, crouchEntryRig 1/1, posture 9/9, bodyMotion 13 (+1 skipped),
animSkeletonIdentity 1 (+1 skipped). `npx tsc --noEmit -p .` clean. e2e-anim passed at ef4e8a8c (E2E_GPU=1, per the
lead); e2e-clip left to the lead.
