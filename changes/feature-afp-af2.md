# Animation fix pass AF2: run carriage and steady hands
kind: minor
- Mocap run / sprint carriage (Michael P1 "weird pose when running", "hands randomly moving around when running"): the
  capture's pelvis rides about its own mean and is lifted (run knees no longer sit bent), its constant pelvis roll / yaw
  is taken out, the chest pitch follows the CT run carriage, the turn bank leans the body into fast turns again, and the
  arms go through a light follower with keepElbowOut's swivel eased (`MOCAP_LAYERS` pelHeight / trunkMean / bankWipe /
  armSmooth, `MOCAP_RUN_POSE`).
