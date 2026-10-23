# Co-op partner moves like its owner
kind: minor
- The co-op partner's walk, run, stops and crouches now play in step with what its owner sees (Michael, walk 4.72
  P5: "animations are bad, doesnt match existing animations, seem more jumpy"): the owner's stride clock, motion state
  (start / stop / turn / pivot), acceleration and Chaos Theory stop travel with each player state, the host times the
  joiner's states by the joiner's own clock instead of their arrival, the partner renders a little further behind
  (0.13 s on the host, 0.16 s on the joiner) so a late packet no longer makes it guess ahead and snap back, and its
  pace, velocity and turn rate blend smoothly between states. Off a wall it turns back at the owner's rate, and it
  crouches and stands on the owner's stance curve. A wire change (the train build sets PROTOCOL_VERSION): both players need this build.
