# AF4a - crouched strafe: hips steady, no kneel on a flip (Michael P4: "with rifle clips and moves around constantly, pistol shifts between knees")

Branch `feature/afp-af4a`. Opus implementer, 2026-10-23 (resumed after the 100% swap from d1ed4edd). AF4a covers the
hips' wander and the kneel on a stick flip; the rifle clip and the pistol between the knees are AF4b (animGraph.ts).

## What changed and why
- `src/player/characterRig.ts`: new `GLIDE_HIP_CROUCH = { share: 0.85, max: 0.09, rate: 0.03 }`, blended in by the
  crouch. Crouched, the aimed glide moves the hips 0.85 of the way to the feet's centre (was 1) and the shift changes at
  most 3 cm/s (was eased at tau 0.08 with no limit), so a short shuffle, a stop or a reversal no longer throws the hips
  across. Crouch 0 is the old code exactly (share 1, no cap).
  Why not lower: the sweep below shows a share under 0.85 bows the steady strafe's knee past 3 cm (e2e-anim's crouched
  aimed strafe knee-out gate, CRAB.kneeBow), and with the glide fully off the flips still swing 4.6-4.9 cm (the keyed
  crouch pelvis sway and the kneel pose: AF4b's animGraph.ts).
- `src/player/playerController.ts`: `KNEEL_STILL_AIM` 0.35 s and `kneelStill(aiming)`: crouched and aiming, the kneel
  waits 0.35 s still (was `KNEEL_STILL` 0.05 s); a thumb crossing the dead zone (~0.1-0.3 s) no longer kneels. A real
  stop still kneels, 0.3 s later.
- `tests/crouchStrafe.test.ts` (new): the AF0 crouched aimed runs (rifle weight 1, pistol 0.7) with the controller's
  kneel rule applied to the pose (aimRun hard-codes KNEEL_STILL), bars below.

## Numbers (AF0 harness, tests/crouchStrafe.test.ts; before = docs/archive/anim-fix-pass/before/numbers.md)
| run | pel lat p2p cm before -> after | beyond pace cm/frame | grip step cm/frame | knee-out cm | kneels on flip |
| --- | --- | --- | --- | --- | --- |
| rifle steady 0.4 / 0.7 | 2.2 -> 1.7 / 2.2 | 0.55-0.85 -> 0.3-0.6 | 0.37 / 0.55 | 2.5 -> 2.5-2.8 | - |
| pistol steady 0.4 / 0.7 | 2.2 -> 1.7 / 2.2 | 0.55-0.85 -> 0.3-0.6 | 0.68 / 1.01 (before 1.01) | 2.5-2.8 | - |
| stop-go L / R (10 cycles) | 8.1 / 10.9 -> 6.2 / 7.1 | 1.10 -> 0.9 | rifle 0.60, pistol 1.02 | 8.4 / 12.8 -> 10.0 / 10.3 | - |
| flip gap 0.15 s | 12.7 -> 6.5 | 1.11 -> 0.7 | rifle 0.61, pistol 1.04 | 7.8 -> 6.5 | 0 (old rule 0) |
| flip gap 0.3 s | 12.0 -> 7.2 | 1.11 -> 0.5 | rifle 0.60, pistol 0.99 | 7.8 -> 6.3 | 0 (old rule 2) |
| aimed crouched stop-go x4 | - | - | - | - | still kneels 4 of 4 |

Sweep (rifle, glide share : rate, AF0 harness without the kneel hook): 1 : none 2.2 / 8.1 / 10.9 / 12.7 (steady / sgL /
sgR / flip p2p, steady knee-out 2.5); 0.85 : 0.06 1.8 / 6.1 / 9.3 / 8.5 (2.6); 0.85 : 0.03 2.2 / 6.3 / 8.2 / 7.0 (2.8);
0.7 : 0.03 1.9 / 5.8 / 7.8 / 6.9 (3.2, over the gate); 0.5 : 0.15 1.7 / 4.6 / 7.7 / 7.2 (3.7); 0 2.2 / 4.9 / 4.9 / 4.6 (5.4).
Gating the glide off in the kneel made stop-go worse (9.9 vs 9.3); not kept.

## Acceptance (PLAN AF4a)
- Pelvis lateral <= 4 cm p2p steady: met (1.7-2.2). Beyond pace <= 2 cm a frame: met everywhere (<= 0.9).
- No kneel during an L <-> R flip: met (0 at gaps 0.15 / 0.3 s; the old 0.05 s rule kneels 2 at 0.3 s).
- Grip jitter <= 1.0 cm a frame steady: rifle met (0.55); pistol 1.01 at 0.7 m/s, unchanged from before (the pistol hold,
  AF4b's WREN_PISTOL_READY): asserted no worse (<= 1.02), not met. <= 2 cm on flips and stops: met (<= 1.04).
- Stop-go / flip bars in the test (the plan's acceptance names only "steady"): STOPGO_P2P 8.5 cm, FLIP_P2P 8 cm.

## Tests
One file at a time: crouchStrafe 9/9, keyedCrouch 8/8, mocapCrouch 6/6, rig 21/21, mocapPlayer 10/10 (1 skipped),
animFixPass 1/1, crouchEntryRig 1/1, mocapStrafe 12/12 (OFF / standing unchanged). `npx tsc --noEmit -p .` clean; eslint
clean on the three files.
e2e-anim (`E2E_GPU=1`, desktop lane 2, port 4192, heavy2.lock 16:15-16:18): all passed, 37 s. Crouched aimed strafe
knee-out 2.7 cm (speed 1) / 2.9 cm (speed 2) against the 3.0 cm gate.

## Open items
- Pistol steady grip step 1.01 cm a frame (bar 1.0): the pistol hold, AF4b.
- Stop-go / flips keep ~4.6-4.9 cm of hip swing with the glide off: the keyed crouch pelvis sway played sideways and the
  kneel's pose (AF4b cause 2, animGraph.ts crouchSet re-centring).
- Stop-go knee-out (during the kneel transitions) 10.0 / 10.3 cm vs 8.4 / 12.8 before: not gated anywhere; the kneel side
  is AF4b's.
- e2e-anim crouched aimed strafe speed 2 knee-out 2.9 cm (gate 3.0): little headroom; a lower glide share would fail it.
- The kneel after an aimed crouched stop now comes 0.3 s later (0.35 s vs 0.05 s): a feel item for Michael's walk.
