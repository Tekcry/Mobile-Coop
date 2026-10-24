# Co-op Course mode: client lamp shots (walk bug S2)
kind: patch
- Marlow Yard co-op: the client's round through a lamp now shoots it out on the host with the same checks as Sector
  Ops (draw, weapon, rate, origin, the lamp first on the ray, a clear line), and both pages see it dark (the client
  from the host's next `course` message, with the host's sparks cue, not on a join or rejoin); a course restart brings
  it back. No wire change.
- Co-op lamp shots (Sector Ops and Course mode): a client's repeat round at a lamp the host already has out is
  dropped quietly instead of counting as a violation.
