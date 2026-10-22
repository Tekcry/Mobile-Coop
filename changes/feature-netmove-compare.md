# e2e-netmove pose compares hold under load
kind: patch
- Tests (netmove-compare): e2e-netmove's pose compares hold the client's rig and the host's copy of it at the same idle
  phase (the drawn ready stance, the keyed idle and the breath run on each rig's own random clock, not on the wire) and
  re-step both foot planners at the tight 2 cm rest tolerance while comparing. The "drawn" ankle read 7.8 cm alone and
  10.7 cm under load; it now reads 0.3-3.6 cm, under the same 10 cm limit. Every compare logs its worst joint, and the
  suite prints the maximum.
