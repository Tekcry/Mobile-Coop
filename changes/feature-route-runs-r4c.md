# Route-run course mode: drill gates and restarts
kind: patch
- Route-runs (J13 R4c, test tooling only): on Marlow Yard the robots now get through a locked course door the way the
  course expects. At a door held by open drills they wait at the door for the drill hold, then the harness completes
  each open drill for either player through the course's own hooks and lists it as a drill stub (never as walked); at a
  holding room's far door both robots stand on the pad and the airlock cycles. A door still locked after that is a
  `locked` stop as before. The robots also notice when the course sends them back (a set restart or a retry), name why
  (seen by a guard or a camera, a timer that ran out, or neither) and log it: a seen restart is a detection, the second
  from the same place turns that set's spotted rule off and pushes the pair past, the second timer restart on one step
  completes its drills as stubs, and only a second unexplained restart from one place is a `restart-loop` stop. The
  course selftest fixture covers sets A1 and A2. Wiring into the driver follows in the lead's seam slice.
