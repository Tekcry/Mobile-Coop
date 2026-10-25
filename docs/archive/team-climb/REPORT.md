# team-climb - report (Player Build spare job, 2026-10-23)

## What
CLIMB_UP_TEAM, the two-person rope's top-out (teamController state `ropeTop`):
- The climber's hands grip the lip at the top, on the climber's page and on the partner's view of them.
- The root path over the lip no longer pops.
- tests/teamClimb.test.ts asserts the grips and the no-pop numbers.

## Why
The old path (rise `min(1, 1.7 e)`, move in `(e - 0.4) / 0.6`, e = smoothstep(k), over 0.9 s) stopped the 1.5 m rise
dead at k 0.56 (a 5.68 cm pop) and started the move in with a jump (3.52 cm). The hands stayed on the climb clip.

## How
- `ropeTopPath`: two quintic curves, still at both ends. The rise runs over k 0..0.68 and carries the climb's speed in;
  the move in starts at k 0.325.
- The pull in to 0.22 m off the face happens on the rope's last 0.6 m, by height (`ropeClimbPull`); the slide undoes it.
- `TEAM.ropeTop` 0.9 -> 1.1 s (A1).
- Hands (kept from the WIP): `findRopeLip`, `ropeLipHands` lip grips, `ropeClimbGripW` / `ropeTopGripW`, and the rig's
  `liftOffTarget` with the arm rate limit x2 while lifting off.
- Partner: `remoteAvatar.ropeFrame` + `ropeSeenStep`, no wire change. The lip-search flag now resets per climb.
- Studio: `studioPairs` uses the same path.

## Numbers (60 Hz, Wren, 4 m wall, 1.5 m rise, holder 0.8 m aside)
| | before (master) | after |
| --- | --- | --- |
| Root pop | 5.68 / 3.52 cm | 0.44 cm (full stick), 0.47 cm (half stick) |
| Palms on the lip | never | k 0.152-0.288, miss 0.02 cm |
| Grip weight at the top-out's start | - | 0.41 |
| Partner's grip weight vs the owner's | - | 0.000 apart, top-out seen 1 frame in |
| Top-out time | 0.9 s | 1.1 s |

"Before" pops come from the old formula on the same geometry in a scratch script; "after" from the test.

## Tests
- teamClimb 6/6, teamMoves 24/24, teamPose 16/16, animStudio2 20/20, animStudioPairsView 5/5.
- tsc and eslint clean.
- e2e-traverse passed (GPU, port 4191, 27 s).
- e2e-coop / e2e-netmove: pending, laptop batch.

## Assumed decisions
- A1: `TEAM.ropeTop` 1.1 s (nothing under 0.5 cm at 0.9 s: the 1.5 m rise alone needs ~0.75 s). Undo: 0.9 (pop ~0.6 cm).
- A2: the pull in moved onto the rope's last 0.6 m. Undo: make `pullIn` small.

## Open items (polish list)
- The clip switch into CLIMB_UP_TEAM jumps the body (toes 14.1 cm, legs 11.8, trunk 7.7) while the root is still.
  Needs a pose blend in the rig / anim graph.
- The arms jump 5.3 cm on the last frame, same cause.
- The studio pair does not carry the climb speed in.
- Only the test geometry is measured.

## Changelog line
- (team-climb) The rope top-out no longer pops (root 5.7 -> 0.44 cm per frame, 1.1 s) and the climber's hands grip the
  lip, on both pages, no wire change.
