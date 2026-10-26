# Route-run link steps (ladders, drops, windows, ducts, rappels)
kind: patch
- Route-runs (J13 R5, test tooling only): the robots now take the solo off-nav links with the pad instead of stubbing
  them: ladders (up from the foot, down from the top), drops (walked off the edge, or a hang and let go where the edge
  stops the walk), windows (the vault; a glazed one shatters), hatches, ducts (the grate unscrewed quietly, crawled
  through) and rappels. With two robots the leader takes each link first, then the follower on its own page, both pages
  stepped together on the host's clock; inside a split each robot takes its own leg's links. Each has its time limit (a
  link whose move never shows is a step-timeout dead stop, logged for the robot that failed with the step's time and
  limit, then that robot is placed past the link). Code-route climbs are matched to the ladder, window, duct or rappel
  near them, else read as a drop when they go down. Ledges, pipes, wall jumps and split jumps stay stubs, listed in the
  report, as do the co-op moves. `--dry-run --selftest <fixture>` prints the selftest's runs with each link's limit. New
  selftest fixture `tests/fixtures/route-run/selftest-steps.graph.json`.
- (F29) A link step's dead stop names the step's phase (before the move, mounting, climbing, at the edge, through and
  so on), so a stall says where it stopped.
