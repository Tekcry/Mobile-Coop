# Coop offer under load
kind: patch
- Tests: e2e-coop's client takedown holds under load. The host keeps the picked guard pinned (calm, still, the client
  unspotted) on every frame until the takedown starts, and the client starts it in the frame its offer comes up
  within 6 s of its own match clock (was 40 polls 150 ms apart in real time, which a loaded page spent in a fraction
  of that game time). The assert is unchanged.
