# Route-run robot pair
kind: patch
- Route-runs (J13 R4b, test tooling only): `scripts/route-run.mjs` now walks every map with two robots by default
  (`--players 2`): the leader on the host page and the follower on the client page over `?net=local`, both stepped on the
  host's game clock. The follower trails the leader about 2 m behind, crouched, opens doors on its way and has its own
  dead-stop watch; at a split the two walk both legs at once and wait for each other at the rejoin; at a co-op link both
  stand at it for its time and are then placed past it. Detections and dead stops name which robot. Sector Ops hack
  objectives (S2) are now held for their full time instead of tapped. `--players 1` keeps the one-robot run.
