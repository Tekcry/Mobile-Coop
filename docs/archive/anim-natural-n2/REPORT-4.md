# anim-natural N2 #138 - fix round 4 report (GPU fails on 362359a4)

2026-10-22 ~23:10, implementer (Opus) report, saved by the job lead (CT Core Build).

## The fails (desktop GPU, 362359a4, /c/NightShift/n138-e2e.log)
- e2e-anim: "walk: knees over the toes (outside by 3.5 cm)".
- e2e-clip: "crouched holstered: the arms and hands never go through the thighs or the trunk (min -3.0 cm)".
netmove, coop, studio, move passed.

## Cause
Neither fix round 1, fix round 2 (KEY_PEL_RATE) nor the master merges caused them: N1's planner (in at 9e2a5c2c)
lands both on ~0.1 cm margins. In-game history (walk knee-out, limit 3.5 / crouched holstered, limit -3): master alone
(mt-e2e, GPU) 3.2 / -2.7; N1 alone (ctb6-clip-n1, ctb8) clip -3.2 / -2.9; N2 alone (c3a10b41) 3.4 / -2.7; train 8 clip
-3.2 (walk never read: run 90 threw first); 362359a4 GPU 3.5+ / -3.0.

Headless (a driven Wren rig through both e2e scenarios as the scripts do), each recent change off in turn:

| Variant | walk knee-out (cm) | crouched holstered from 90 / 180 deg (cm) |
| --- | --- | --- |
| current | 3.44 | -2.43 / -2.54 |
| KEY_PEL_RATE off | 3.44 | -2.43 / -2.54 |
| body-frame uncross off | 3.44 | -2.43 / -2.54 |
| crouch-entry right-foot rule off | 3.44 | -2.52 / -2.65 |
| turnRule 0 | 3.41 | -2.43 / -2.43 |
| body motion amounts 0 | 3.15 | -2.42 / -2.54 |

- Walk: N2's sway adds ~0.3 cm of knee-out, N1 ~0.04; together they cross 3.5 in game.
- Clip: the worst point is always the squat's right wrist on the right thigh, where KNEE_REST puts the hand. Fix round
  1's right-foot rule helps; fix round 2 changes nothing here (watch item clear).
- The game reads ~0.5 cm deeper than the headless rig; seed, arrival facing and the stop's rest point did not explain it.
- The 4.59.0 merge resolution (characterRig ~2272 / ~2370) matches master's order: N4c's strike shift after N2's sway,
  strikeTrunk after motionTrunk.

## Fix
1. A14 walk sway timing (`src/anim/bodyMotion.ts`): BODY_MOTION.walk sway 0.6 at 0.75 -> 1.2 at 0.98: the same lateral
   weight shift, peaking a fifth of a cycle later, off the knee's widest bow (swept sway 0.4-1.2 x time 0.0-0.98).
2. Squat palm on the kneecap (`src/player/characterRig.ts`): KNEE_REST.fwd 0.01 -> 0.03 (the wall knee hand's value).

Headless before -> after:

| Row (limit) | knee-out (cm) | lateral (cm) |
| --- | --- | --- |
| walk 1.45 (3.5) | 3.44 -> 3.22 | 2.88 -> 2.93 |
| body-motion walk 1.40 (band 2.5-3.5) | 3.44 -> 3.21 | 2.85 -> 2.91 |
| straight speed 1 (3.7) | 3.35 -> 3.16 | |
| straight speed 3 (3.7) | 3.51 -> 3.23 | |
| low ready walk (3.5) | 3.37 -> 3.10 | |

Jog, low ready jog, pelvis / shoulder yaw unchanged. Crouched holstered (full e2e sequence, four arrival facings):
-2.42..-2.54 -> -1.87..-1.92 cm (squat -2.43 -> -1.87, sneak -2.21 -> -1.73, stop -1.79 -> -1.50, stand up -1.73 ->
-1.44). crouchEntryRig -2.42..-2.56 -> -1.87..-1.93. Fix round 2's run 180 gain kept (turnCrossRig green); fix round 1
unchanged.

## Files
- `src/anim/bodyMotion.ts`, `src/player/characterRig.ts`: the two changes, with notes.
- `tests/fixtures/anim-skeleton-identity.json`: re-captured; only partner:moves changed (1 of 40); motion-off and guard
  fixtures unchanged. `tests/animSkeletonIdentity.test.ts`: header note.
- `tests/crouchEntryRig.test.ts`: bound tightened 2.6 -> 2.1 cm (worst now 1.93).
- `scripts/e2e-clip.mjs`: report only; the limb line names the part and segment with the least clearance. No limit
  changed.
- `docs/anim-natural-n2/BRIEF.md`: A14. `changes/feature-anim-natural-n2.md`: two entries.

## Tests
Single files, all pass: bodyMotion 13, crabFacing 3, crouchEntryRig 1, keyedCrouch 8, animSkeletonIdentity 1,
animSkeletonGuardIdentity 1, turnCrossRig 1, keyedWalk 10, wallStance 5, animTuneBake 29. tsc clean; eslint clean on
the changed files.

## e2e
Not run by the agent (both desktop locks held). Expected in game: walk knee-out ~3.3, crouched holstered ~-2.5 (if the
0.5 cm gap holds). Also watch the crab rows that never ran on the GPU (walk threw first); c3a10b41 numbers: jog 3.3
(3.4), straight speed 2-3 3.5 (3.7), rifle / pistol low ready walk 3.4 (3.5) / jog 3.3 (3.4).

## Open
- The ~0.5 cm game vs headless gap in crouched holstered is unexplained.
- Crouch 90's first swing (10.73 m/s headless) is still open from REPORT-3.
