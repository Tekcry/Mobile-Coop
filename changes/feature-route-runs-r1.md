# Route-runs: route planner
kind: patch
- Route-runs (J13 R1): a route planner for the robot test runs. From a map's connectivity graph and its points table it
  picks the fewest runs that walk every declared approach (shadow, high, loud) of every guarded space, plus the one
  start-to-exfil run on Marlow Yard and the late sections that keep a side route. Tooling and tests only.
