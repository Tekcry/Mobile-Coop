# crouch-pops - check

Checker (fresh Opus, read-only role). Reviewed `feature/crouch-pops` 0824e9c6 vs base 191c3565, BRIEF.md, REPORT.md.

## Verdict: PASS

No blockers.

## Findings
- `src/anim/tune.ts:743-753` `bodyRigBegin`: `blend` is false for w <= 0, w >= 1 or gi2 === gi, so `t = t0` and the
  per-field loop is the old one (bit-identical at crouch 0 / 1 and for every caller without the new arguments). The
  blend is one multiply-add per field, no allocation, no hypot. Linear blending is fine for both the multiplicative and
  the additive fields (all values finite, the composition with TUNE_CUR is unchanged).
- `src/anim/tuneJointsRig.ts:89-99` `tuneRigBegin`: the blend path only runs for 0 < crouch < 1 with no studio pin
  (the pin keeps its own row, as before). `selectBodyGroup` reads crouch only through `crouch > 0.5`, so at the ends the
  standing / crouched rows equal the old `gi` (continuous at w -> 0 and w -> 1), and for every non-crouch-dependent
  state (air, traverse, bend / carry) gs === gc, so no blend and the old row. `pose.crouch` is mutated and restored
  synchronously around two pure calls: safe. No allocation (string returns, a Record lookup). No steady fractional
  crouch found in src (grep), so the blend is transitional only.
- CP-A1 is a fair reading: the e2e metric includes the crouch's own motion (4.5-6.6 cm on smooth transitions), so a
  0.5 cm absolute limit on it is impossible; measuring the stance width's velocity step plus the tune's excess over the
  untuned run isolates what the tune added. The goal's 9.6 / 8.3 cm figures were the raised limits, not measurements.
- `scripts/e2e-anim.mjs:1256`: removing `BODY_POP` puts both transitions back on `L.CROUCH_POP` (7.5 cm), a tightening;
  the low ready 11.5 cm entry is pre-existing and untouched.
- elbowOutAdd / armSwingMul / kneeLiftMul blending across the crouch: harmless - before, they switched target at 0.5 and
  eased over BODY_TAU; now their target follows the crouch curve. Same endpoints, smoother path.
- `tests/crouchPops.test.ts` fails without the fix: reverted `src/anim/tuneJointsRig.ts` to 191c3565 (tune.ts default
  args keep it compiling), ran the file: 4 of 5 fail on the stance width (2.33 / 1.57 / 2.33 / 1.93 cm per frame vs
  0.5); restored with `git checkout HEAD --`, tree clean. With the fix: 5 / 5 pass.
- `npx tsc --noEmit -p .` clean; `tests/animBodyBase.test.ts` 6 pass. e2e-anim not re-run here (maker reports ok on
  lane 2, 317 asserts).

## Polish
1. `tests/crouchPops.test.ts:99`: the "pop over the untuned width" assertion does not discriminate headless - before
   the fix baked and untuned read the same (3.53 vs 3.53, 9.85 vs 9.86, 3.41 vs 3.41 cm). Only the width assertion
   catches the regression; the e2e (in game) is where the excess differs. Say so in the test comment or drop it.
2. `src/anim/tuneJointsRig.ts:89-99`: only the Body base blends; `st.body`, the Joints and Hands rows still switch at
   crouch 0.5 (`gi`). Fine for this goal; worth a line in the comment so a later reader does not assume all rows blend.
3. REPORT open item stands: mocap OFF holstered running crouch-down 9.47 cm (armSwingMul 1.6), over 7.5 before and
   after, not gated because e2e-anim runs mocap ON.
