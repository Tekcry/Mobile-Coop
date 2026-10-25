# anim-natural N2 - A1 run key fix (feature/anim-n2-runkey)

2026-10-22 ~14:25, job lead. Michael (via the orchestrator): "Only fix it if it will result in a more believable,
realistic, less rigid run". Verdict: KEEP (merged into N2).

## Change
`scripts/anim-keys/keys/run.json` (4 values, nothing else of his tune): key 0 pelvis yaw 25.5 -> 10, chest -26 ->
-10.5; key 2 (phase 3/48) pelvis 0.5 -> 7, chest 7.5 -> -7 (key 0 alone left a 14.4 deg per clip frame chest flick
between keys 1 and 2; his own tuner log tried key 2 chest -7 / pelvis 7.5, export 2026-10-22 log entries 186, 278).
Rebaked with Blender -b: `node --import ./scripts/operators/ts-resolve.mjs scripts/anim-keys/build.mjs run`.

## Before / after (tests/runKeyContinuity.test.ts, headless 60 Hz; RUNKEY_PRINT=1 prints it)
| Measure | Before | After |
| --- | --- | --- |
| Clip pelvis / shoulder p2p (deg) | 51.0 / 52.0 | 20.0 / 21.0 |
| Clip max yaw step per clip frame (deg) | 20.8 / 23.5 | 3.1 / 3.5 |
| 4 m/s max step per 60 Hz frame, pelvis / shoulders | 7.6 / 8.6 | 2.6 / 3.0 |
| 4 m/s wrist peak (m/s), fwd range (cm) | 14.8, 67 | 11.8, 52.9 |
| 5 m/s wrist peak (m/s) | 16.5 | 13.6 |
| 4 m/s knee separation (x hips), track (cm), knee bow (cm), elbow wing (cm) | 1.96, 15.2, 8.5, 9.9 | 1.27, 11.8, 6.9, 9.9 |
The wrist stays above 11 m/s: Michael's retimed arm keys (extreme to crossing in 3/48 cycle); N2's wrist cap (A8).
GPU sheets (desktop, E2E_GPU=1, 12 phases): `sheets/run-{front,side}-{before,after}.png`; at this sampling the stills
look alike: the snap was between frames, so the numbers carry the verdict.

## Open
- `tests/keyedWalk.test.ts` "jog and run keys": run elbow flex min 54.8 deg vs the limit 55 (master measured 61.6; the
  trunk yaw change moves the arm points' frame). Not loosened: N2 step 3 (arms) to bring it back over 55.
- e2e-anim RUN_TUNE (scripts/e2e-anim.mjs ~451-463) can tighten after a desktop e2e-anim run: proposals kneeSep max
  2.15 -> 1.4, trackHalf 0.16 -> 0.13, kneeBow 0.09 -> 0.08 (re-check against #110's merged values).
- Skeleton identity fixture re-captured (keyed:run and the scenes using the run; guard fixture unchanged).
