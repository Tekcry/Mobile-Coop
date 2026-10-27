# Marlow Yard re-plan graph: route-run gate points
kind: patch
- The re-planned Marlow Yard graph (`docs/marlow-replan/graph.json`) now names the re-plan map (`ctcourseReplan`), so the
  route-run gate measures and boots the re-planned yard, not the built one; every link the gate walks has a point the
  robots can stand on (station marks where a station has one), and the data hall's cage is an objective (the synced hack).
