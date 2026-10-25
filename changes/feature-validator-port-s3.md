# Level validator: measured checks
kind: patch
- Level validator (tooling, no game change): the validator now checks a map's greybox measurements against the scale
  sheet. A measured view of an encounter space that is too small, or a broken line of sight that lasts too long, is an
  error; a measured shadow share outside 40-60% is only information, since the real-world light band is the target.
  Split paths are checked for leg time, for both legs taking about the same time, and for how quickly one partner can
  reach the other; on campaign maps, each co-op move's way back for the partner is checked against the revive reach.
- With `--require-measured` (the greybox exit gate) every encounter space, every split and every campaign co-op way
  back must have measured values. A move the nav grid cannot time is a warning to justify in the design doc, and its
  hand-written time is still checked. Maps without measurements yet print "pending V6" notes and pass as before.
