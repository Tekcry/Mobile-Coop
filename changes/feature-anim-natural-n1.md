# Wren's feet in turns (anim-natural N1)
kind: minor
- Wren's feet in turns: a turn step lifts the planted foot before the legs wind up (the body's yaw rate and the
  foot's twist decide it), the planted foot pivots on the ball with the heel coming up first, and no foot sticks to the
  floor and snaps round late. Jog and run turns first, then walk turns, turns on the spot, starts, stops, strafes and
  crouch turns. A foot left behind in a fast turn now lifts early instead of launching at 6 m/s (rule A2). Guards share
  the turn rules. New Stepping sliders for the rule, identity by default, and they bake.
- Tests: e2e-anim's foot locking, crab slide and turn block read the contact point (heel / ball while down); the turn
  block asserts plant time <= 0.25 s and the first swing frames <= 5 m/s; e2e-move's stop check reads the contact
  point (2 cm bar kept).
