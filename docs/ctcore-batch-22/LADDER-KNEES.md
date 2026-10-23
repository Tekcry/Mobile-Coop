# Ladder climb-up knees (batch-22, PR #207, merge train 24)

## What
Train 24 failed e2e-clip "ladder climb: the knees never knock through each other": min knee distance 8.9 cm, assert
> 9.0 cm (`scripts/e2e-clip.mjs` ~line 251). origin/master passes. Fixed in the game (the CLIMB_UP clip), assert unchanged.

## Why batch-22 differs from master
The only anim / player change on the ladder top-out is traverse-fix-2's new CLIMB_UP keys (`src/anim/clips/traverse.ts`):
the pitched trunk, the low pelvis and the right foot's new lateral swing `fRX` (out to 0.163 over 0.34 - 0.42, back to
0.022 by 0.46 and 0 by 0.52). The characterRig / moveState changes in the batch touch the hands only (lip-grip pivot,
`CLIMB_UP_HANDS`, strike body, hand swap).

A ladder's top-out plays CLIMB_UP at `traverseT = k * CLIMB_UP_CROUCH_K` on its own root path (attachController
`ladderTop`), so the ledge harness (tests/climbHands.test.ts) never sees this frame. Measured on the GPU e2e with a
per-frame log: the knock is one frame, T 0.474, where the left knee is on the top and the right foot has just
stepped onto it in front. Both knees are at the same forward point and height (x 26.20 / 26.22, y 4.00 / 4.03), 8 cm
apart sideways only.

Cause: both legs are folded there (each ankle nearly under its hip). The two-bone solve puts the knee along the level
knee pole less its share along the hip-ankle line, so a foot set wide tips that line outward and pushes the knee
inward. The right ankle was 12 cm out from the hip line (fRX easing 0.022 -> 0), which put the right knee next to the
left.

## Fix
CLIMB_UP `fRX`: `0.46, 0.022, 0.52, 0` -> `0.46, -0.02, 0.49, -0.08, 0.56, 0`. The right foot sets down under its hip as
it steps onto the top (ankle z 10.95 vs hips 11.00 at T 0.474; was 10.88), then eases back to 0 by 0.56. The rest of
the climb is unchanged: the out-swing past the arm (0.34 - 0.42), the left foot's swing wide and through (fLX), all
other keys and timings.

The previous agent's WIP (fLX held at -0.12 over 0.36 - 0.5) was dropped. It widened the left foot, which pushes the
left knee inward the same way, and it failed tests/climbHands.test.ts on the ledge (knee 0.87 cm into the block vs
>= 2.4 cm, legs velocity change 26.7 vs <= 24.2 cm). Tried and rejected: a wider right foot (fRX 0.12 at 0.46, 0.06 at
0.5) measured 4.8 cm; a narrower left foot (fLX -0.02 at 0.47) failed 4 climbHands checks (the knee floor lifted the
pelvis).

## Numbers (GPU e2e, desktop lane 2)
| | min knee distance, ladder climb | at |
| --- | --- | --- |
| before (99c37251) | 8.9 cm | T 0.474 |
| after | 14.4 cm | not at T 0.474 any more (20.0 cm there) |

Feet min 13.6 cm both runs; body into the world 0 frames both runs.

## Files
- `src/anim/clips/traverse.ts` (CLIMB_UP `fRX` and its comment)
- `changes/feature-traverse-fix-2.md` (one line)

## Tests
SUITES_PLACEHOLDER

## Open items
- tests/climbHands.test.ts drives the ledge climb-up only. A headless ladder top-out harness would have caught this
  before the train (polish list, not done here).

## Changelog
- Ladder top-out (the climb-up from a ladder): the right foot sets down under its hip as it steps onto the top, so its
  knee no longer folds in onto the left: the knees stay 14.4 cm apart (were 8.9 cm, e2e-clip asks > 9).
