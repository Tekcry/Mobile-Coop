# Level validator: measure core
kind: patch
- Level validator (tooling, no game change): the measuring module from the V6 work joins master. It times every walk
  between spaces on the real nav grid, finds the point on each shared wall where a link sits, measures each campaign
  co-op link's way back for the partner, and gives the robot route-runs one shared table of space and link positions.
  A link whose shared wall has two or more gaps gets no guessed time; the validator reports it instead.
