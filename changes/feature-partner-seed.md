# Partner rig first seen walking
kind: patch
- Co-op: a partner first seen already walking slowly (under about 0.3 m/s at 60 Hz, 1.2 m/s at 240 Hz) no longer plays
  a start one-shot with the mocap switch on. `RemoteAvatar` seeds its eased speed and stride heading from the first
  received state, and again after a teleport (bay start, checkpoint reset, respawn), instead of easing up from 0.
