# anim-natural N2 - step 2 report (body layer core)

2026-10-22 ~14:35, written by the job lead from the implementer's hand-back. Single test files only; no e2e or GPU run.

## Built
- `src/anim/bodyMotion.ts` (new, pure, no allocation): `BODY_MOTION` (13 rows, one literal per field: hipTurn, hipTime,
  chestTurn, chestTime, sway, swayTime, headFollow, headNod), `bodyMotionWeights`, `bodyMotionBands`,
  `bodyMotionStep`. Rows blend as phasors (amplitude x cos / sin of the timing): no phase wrap, no pop. Inputs come
  from the graph only (moveW, crouch, o.keyDrawn, raiseS, the KEYED_GAITS / KEYED_CROUCH smoothstep shares); the band
  constants are passed in (no import cycle).
- `animGraph.ts`: `RigTargets.motion`; `this.bodyMotion(i, o, dt)` after studioDriveTargets. Gate: wrenReady, (keyedOk
  or keyedDrawn), grounded, no traverse / slide / wall / melee, x (1-wallW)(1-dashS)(1-tenseW)(1-kneel), eased over
  KEYED_WALK_BAND.tau.
- `characterRig.ts`: `pex += pelX*kk` before the reach solve; `motionTrunk` (pelvis pre-multiplied by Ry(hip), the
  spine takes back hip - chest; the keyedTrunk quaternion pattern); head: headFollow x wrapped(chest world yaw - yaw) x
  (1 - aimW) plus the nod in pitch. Every addition runs only when non-zero (guards bit-identical).
- Timings (cycles): walk hip 0.01 / chest 0.51 / sway 0.75; jog 0.96 / 0.45 / 0.74; run 0.91 / 0.38 / 0.69; crouch
  rows 0.05 / 0.52-0.53 / 0.74-0.75; aim hip 0.95; aimCrouchMove 0.9. NOD_TIME 0.05, nod 0.6 on every moving row (aim
  included). Deviation: sneak headFollow 0.4 (0.35 gave 1.9 deg, under the 2-6 target). Stills 0.
- `src/anim/audit/limits.ts`: `WALK_SWAY_WREN = 0.05` (marked Michael approved ~5 cm); `WALK_SWAY` 0.03 stays for
  guards; anim-audit's lateralSway calls use the Wren limit (it records the player and its remote, both Wren).
- e2e-anim "body motion" block (after the anti-crab section): the unit harness's maths (hip / shoulder joint line yaw
  in the root frame, Pearson corr, hips lateral on the root x, head yaw / pitch from the world matrix, p2p over 3 s
  after 1.5 s). Asserts: walk 7-9 / 7-9 deg, lateral 4-5 cm; jog 11-13 / 14.5-17; sneak 4.5-5.5 / 4.5-6; crouch walk
  7-9 / 7-9.5; run lateral 2-3 cm (run yaw report only); corr < -0.9 and head yaw 2-6 (walk, jog, sneak, crouch walk);
  aim fwd pelvis 3-4.5; aim fwd / side corr < -0.8, head yaw < 0.05; head pitch <= 2 every row. Not run yet (game
  speeds may differ from the harness: sneak 0.85 in game vs 1.0 headless).

## Before / after (60 Hz; pelvis / shoulders deg p2p, corr, lateral cm, head yaw / pitch deg)
| Row | Before | After |
| --- | --- | --- |
| walk | 3.1/3.1, -1, 1.7, 0/0 | 8.1/8.1, -1, 4.4, 2.83/1.2 |
| jog | 5/7, -1, 1.6 | 11.8/15.6, -1, 3.0, 5.48/1.2 |
| run (A1 pop) | 51/51.9, -0.97, 1.2 | 56/57.8, -0.97, 2.2, 20.2/1.2 |
| sneak | 2/2.4, -0.99, 1.8 | 5/5.4, -0.99, 3.3, 2.17/1.2 |
| crouch walk | 4/4.8, 2.2 | 8/8.8, -0.99, 3.7, 3.16/1.2 |
| crouch run | 5/5.9, 1.4 | 10/11.9, -0.98, 2.9, 4.49/1.2 |
| low ready walk | 3.1/2.7, 1.7 | 8.1/6.7, -1, 4.4, 2.83/1.2 |
| aim fwd | 1/4, -0.86 | 3.8/4, -0.99, head yaw 0, pitch 1.19 |
| aim side | 0.6/4.2, -0.47, 4.1 | 3.2/4.2, -0.99, head yaw 0 |
| aim back | 0.9/3.9, -0.85 | 3.8/3.9, -0.99 |
| crouch aim moving | 1.1/3.8, -0.5 | 2.8/3.8, -1.0 |
| idle, aimStill | unchanged | unchanged |

## Identity
- Amounts 0: all 39 entries match the old fixture bit for bit (old hashes kept in
  `tests/fixtures/anim-skeleton-identity-motion-off.json`, asserted in `tests/bodyMotion.test.ts`).
- Re-capture moved only `partner:moves` (+ `keyed:skeleton_test`, new to the capture). `state:*` set no stride (gate
  closed); in-place studio entries have moveW 0.
- Guard fixture unchanged.

## Tests
`tests/bodyMotion.test.ts` (10: literal format, weight sums and continuity across band edges, phase lock 60 / 120 / 240
Hz, closed gate exact zeros, heap growth < 2 MB over 200k steps, amounts-0 identity, before / after pins, rig ranges at
120 / 240 Hz within 0.3) + 49 files importing animGraph / characterRig / keyed / operatorRig + tunerLayout, animAudit,
both identity tests: 548 passed, 0 failed. tsc and eslint clean.

## Open
1. The run is worse until A1: headFollow 0.35 on the keyed 51 deg pop gives 20 deg p2p head yaw. If A1 is reverted,
   `BODY_MOTION.run.headFollow` -> 0.
2. Studio in place shows no layer (moveW 0); root-motion loops do. Step 5 may feed the drive's pace.
3. No pace scaling inside a row (a slow creep gets the full swing; moving rows fade by moveW).
4. Desktop: e2e-anim anti-crab rows measure in the pelvis frame (may shift ~2.5 deg); the anim-audit `--compare`
   baseline (docs/locomotion/audit/anim-baseline.json) will flag walk lateral 1.7 -> 4.4 cm (needs a re-baseline on the
   PC); e2e-netmove untested (graph-internal inputs only).
5. The nod is on while aiming (0.6 deg, ~1 mm at the cheek): aim headNod 0 if the weld should be still.
