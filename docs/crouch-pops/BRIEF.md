# crouch-pops - brief

Job lead: Night Shift | Player Build (spare job 7). Branch `feature/crouch-pops` in `C:/NightShift/Mobile-Coop-crouch-pops`,
cut from `feature/mocap-strafe` 191c3565 (stacks on PR #221).

## Goal
Remove the two crouch pops Michael's baked Body tune left (`docs/anim-bake-targets/STATE.md`, Open):
- holstered still: stand -> crouch -> stand, e2e-anim limit raised to 9.6 cm (measured 8.7 cm kneeL; the shared
  `CROUCH_POP` is 7.5 cm);
- holstered running: crouch -> stand, limit raised to 8.3 cm (measured 7.5 cm wristL).
Both come from the idle / walk / jog / run rows' trackMul 0.05 (the crouched rows keep 1): the Body group switches at
crouch 0.5 and the stance width then eases over BODY_TAU (0.1 s), a step in its velocity in the middle of the
controller's 0.22 s crouch blend. Target: the pop <= 0.5 cm per 60 Hz frame. Michael's tune stays (idle trackMul 0.05).

## How it is measured
e2e-anim's "stand <-> crouch on the rig" block (`scripts/e2e-anim.mjs`): the body-frame position of the hips, wrists,
head and the knees over planted feet; the worst change of their per-frame velocity over the transition.

## Assumed decisions (Michael asleep; undo by telling the lead)
- CP-A1: That metric includes the crouch's own motion (smooth transitions read 4.5-6.6 cm, `limits.ts` CROUCH_POP), so
  "the pop" is what the Body tune adds: the same transition, same metric, minus the run with the Body rows' trackMul at
  1 (the untuned width). Target: that excess <= 0.5 cm per frame for both transitions, mocap ON and OFF.
- CP-A2: The fix blends the Body base across the crouch by the crouch amount (the standing row and the crouched row
  weighted by `crouch`), instead of switching rows at 0.5. Every Body field gets the blend (one rule), not only trackMul.
- CP-A3: The two raised e2e-anim limits go back to `L.CROUCH_POP` once the fix reaches them.
- CP-A4: Nothing outside a crouch transition changes: at crouch 0 or 1 the rows are as today (bit-identical); the
  mocap-OFF path keeps every other behaviour.

## Limits
COMMON-27 and CLAUDE.md hard rules (no hot-path allocation, hyp2 / hyp3, strict TS, never loosen an assert). Tests: single
Vitest files, tsc, eslint on touched files; e2e-anim then e2e-clip on a desktop lane with `E2E_GPU=1`.
