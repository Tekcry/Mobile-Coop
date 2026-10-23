# Climb-up hands (traverse-fix-2)
kind: minor
- Ledge climb-up: the palms stay on the lip (0.0 cm off, 1.1 cm drift) until the right foot is on the top (k 0.474, was
  0.52), then let go over `CLIMB_UP_HANDS` 0.475 - 0.643 while the trunk rises into the crouch; the wrists' worst
  velocity change at the release is 2.8 cm a frame (was 23.5 cm).
- Lip grips: the hand pivots over the edge continuously as the shoulder leaves its reach (was 15-degree steps with a
  0 -> 90 degree flip in one frame).
- Ladder top-out (the climb-up from a ladder): the right foot sets down under its hip as it steps onto the top (CLIMB_UP
  `fRX` -0.08 at 0.49, was 0.022 -> 0), so its knee no longer folds in onto the left: the knees stay 14.4 cm apart (were
  8.9 cm, e2e-clip asks > 9).
