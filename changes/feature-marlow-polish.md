# Marlow and Sector Ops small fixes
kind: patch
- Sector Ops: a late joiner or reloaded rejoiner now lists every rated section in its results, not only the last. The
  `sector` message carries an optional `rh` (every section's marks and synced takedowns, as the course message's) inside
  protocol 42; the client rebuilds the results lines from it (no card, no top-up, no grant).
- Co-op client: your own round off a bulletproof camera (Sector Ops, Marlow Yard) now shows the ricochet sparks and
  plays the impact sound on your screen, as it does on the host's (local only). `nearestHousing` is the shared pick.
- Docs: the revive reach in the Marlow Yard spec (`docs/marlow-final/SPEC.md`, CONSTRAINTS, ENGINE-ANSWERS) now reads
  1.6 m, the revive item's own reach in code (1.8 m is only the interactables default).
