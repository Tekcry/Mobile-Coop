# Route-runs R9: real co-op moves
kind: patch
- Route-runs (J13 R9): the robot pair now does the real leg-up at a co-op boost (the follower crouches and offers, the
  leader takes it, hangs on the lip and pulls up; the follower is then placed beside it) and the leg-up plus the ledge
  relay at a human ladder (both robots climb), pressed on both pads (`scripts/route-run/coop.mjs`). The report counts
  them as walked links; a leg-up with no lip in reach is a `step-timeout` stop naming its phase; a course restart during
  the move is handed to the course hook. Every other co-op kind stays a stub, as at one robot, inside a split leg, or
  with `expect.coop: "stub"` (the pair selftest keeps its stubs). New selftest `selftest-coop.graph.json` (one boost on
  Saltmarsh Park S1).
