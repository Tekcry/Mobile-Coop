# Animation fix pass AF4a: crouched strafe hips steady, no kneel on a flip
kind: minor
- Crouched aimed strafe (Michael P4 "moves around constantly"): the glide's hips go 0.85 of the way to the feet's centre
  and that shift changes at most 3 cm/s when crouched (`GLIDE_HIP_CROUCH`), so stop-go and L <-> R flips swing the hips
  6-7 cm instead of 8-13 cm; standing is unchanged. Crouched and aiming, the kneel waits 0.35 s still
  (`KNEEL_STILL_AIM`), so a stick flip through the dead zone no longer drops into a kneel and back.
