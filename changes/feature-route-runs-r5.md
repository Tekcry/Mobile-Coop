# Route-run link steps (ladders, drops, windows, ducts, rappels)
kind: patch
- Route-runs (J13 R5, test tooling only): the robot now takes the solo off-nav links with the pad instead of stubbing
  them: ladders (up from the foot, down from the top), drops (walked off the edge, or a hang and let go where the edge
  stops the walk), windows (the vault; a glazed one shatters), hatches, ducts (the grate unscrewed quietly, crawled
  through) and rappels. Each has its time limit (a link whose move never shows is a step-timeout dead stop). Code-route
  climbs are matched to the ladder, window, duct or rappel near them, else read as a drop when they go down. Ledges,
  pipes, wall jumps and split jumps stay stubs, listed in the report, as do the co-op moves. New selftest fixture
  `tests/fixtures/route-run/selftest-steps.graph.json`.
