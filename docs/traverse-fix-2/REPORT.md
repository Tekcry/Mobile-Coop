# traverse-fix-2 - climb-up hands (report)

Job: finish traverse-fix item 2 ("climb-up hands let go early") after the first finisher was lost at an account swap
(2026-10-23 ~10:45). Branch feature/traverse-fix-2 (base 3950f3f8), head 3702de34.

## Goals
| Goal | Result |
| --- | --- |
| 1 CLIMB_UP palms on the lip <= 1.5 cm until the right foot is on top | Done: 0.0 cm off, 1.1 cm drift; foot on at k 0.474, palms leave 0.500 |
| 1 CLIMB_UP_TEAM | Not done: the team climb-ups have no lip grips (open item) |
| 2 No hand jump > 3 cm at release (CLIMB_UP) | Done: worst wrist velocity change 2.8 cm / frame at 60 Hz (master 23.5, ebcafadc 13.7, lost WIP 5.4) |
| 3 climbHands asserts | Done; each fails when its goal breaks (mutation-checked). No e2e suite has climb-hand numbers |
| 4 CLIMB_UP_HANDS | Kept { k0: 0.475, span: 0.168 } |

## Changes
1. `src/anim/clips/traverse.ts` CLIMB_UP: the lost agent's WIP kept (trunk near flat over the lip, right foot on top by
   k 0.474), re-keyed from k 0.48 so the trunk rises over the whole release (spPitch 1.16 -> 0.013, pelPitch 0.93 -> 0.3
   over 0.48 - 0.654) instead of late and steep (the arms swung round the shoulders' rate limit). The crouch at 0.654 keeps
   the crouched stance's pose (pelY -0.42).
2. `src/player/characterRig.ts` `solveWorldGrip`, lip ("hook") grips: the hand pivots over the edge continuously (least
   angle in reach, bisected between the 15-degree steps; none in reach: the angle nearest the shoulder; `hookAt` helper,
   no allocation). Was: first 15-degree step in reach, else 90 degrees, a 0 -> 90 flip in one frame at the release
   (8.6 cm with the final keys). A normal hang is unchanged.
3. `src/player/moveState.ts` CLIMB_UP_HANDS { 0.475, 0.168 }: the longest release that ends before the crouch
   (0.643 < 0.654); 0.165 gives 3.1 cm, 0.12 gives 10.0 cm.
4. Tests: `tests/climbHands.test.ts` (palms <= 1.5 cm and no slide > 1.5 cm until the foot is on; foot on before k0;
   shoulders in reach while held; wrist velocity change <= 3 cm over the release; release ends before the crouch; no
   joint group worse than before), `tests/moveState.test.ts` (grip weight 1 through 0.474). `docs/systems/movement.md`.

Decision: CLIMB_UP_HANDS { k0: 0.475, span: 0.168 }. Undo: { k0: 0.38, span: 0.12 } with origin/master's CLIMB_UP keys.
The interim 0.52 / 0.12 (ebcafadc) slid the palms 4.7 cm a frame and released with a 13.7 cm velocity change.

## Numbers (headless, Wren's rig, 60 Hz, stick held; master / ebcafadc / WIP / final)
| Metric | master | ebcafadc | WIP | final |
| --- | --- | --- | --- | --- |
| Right foot on top (k) | 0.526 | 0.513 | 0.474 | 0.474 |
| Palms leave the lip (k) | 0.321 | 0.513 | 0.500 | 0.500 |
| Worst palm miss while held | 6.4 cm | 5.6 cm | 0.0 | 0.0 |
| Palm drift / slide (cm) | 8.2 / 4.8 | 7.8 / 4.7 | 1.1 / 1.1 | 1.1 / 1.1 |
| Wrist velocity change at release (cm / frame) | 23.5 | 13.7 | 5.4 | 2.8 |
| Elbows, release to k 0.75 (cm / frame) | 4.8 | - | 13.2 | 6.2 |

Whole exit (step / velocity change, cm a frame): master trunk 9.6 / 3.1, arms 16.2 / 23.5, legs 17.4 / 24.2, toes
20.9 / 39.9; final trunk 8.6 / 2.7, arms 12.2 / 6.2, legs 17.0 / 20.9, toes 19.6 / 24.6. Clearances (knee / knee over
top / head / neck / chest): master 2.4 / 10.9 / 18.6 / 12.9 / 8.9 cm, final 2.6 / 14.5 / 31.0 / 29.5 / 19.6 cm.
144 Hz: wrist release 1.5 cm. 30 Hz pops, as on master.

## Tests
- Vitest, single files, all pass: climbHands, moveState, animN4bTraverse, rig, teamMoves, teamPose, attachGripsG4,
  gripStepper, attach, animStudio2, animStudioPairsView, tunerLayout, animN4bFixParity, animBakeAll, animMoveRows,
  tuneBakedReset, anim, mocapSwitch, mocapFix2, footPlanner, animSkeletonIdentity, animSkeletonGuardIdentity,
  visionIsolation.
- Mutations: k0 0.44 fails foot / palm; 0.475 / 0.12 fails release (10.0 cm); 0.52 / 0.12 fails release (13.5 cm); the
  old 15-degree pivot fails release (8.6 cm).
- tsc and eslint clean on the changed files.
- e2e, E2E_GPU=1, desktop heavy2 lane: e2e-move PASS 17 s, e2e-traverse PASS 16 s (ladder grips 0.0 cm, drainpipe
  2.3 cm, shimmy drift 0.00).

## Open items
- CLIMB_UP_TEAM palms: boost and relay end hanging; the rope top has no grips (nearest palm 43 cm at k 0.35). Needs a
  game-side grip (teamController `ropeTop` setting `reachL` / `reachR` hook targets with `ledgeClimb` false, and the same
  in `remoteAvatar`): a separate co-op job.
- CLIMB_UP_TEAM 5.7 cm whole-body pop at the rope top (frame 31 of 54): teamController.ts ~347 `Math.min(1, e*1.7)`
  stops the rise dead at e 0.588 and `across` starts with a jump at e 0.4; easing both fixes it (co-op path, needs the
  laptop coop / netmove suites).
- `tests/traverseFix.test.ts` item 2 `it.todo`: replaced by a pointer to climbHands at the batch merge.
- Elbows 6.2 cm velocity change at the swing into the crouch (master 4.8 there); wrists under 3 cm.
- Not judged by eye on the GPU: the trunk low over the lip and the hand pivot over the edge.

Changelog line: Ledge climb-up: the palms stay on the lip until the right foot is on the top and let go without a jump;
a lip grip's hand pivots over the edge smoothly.
