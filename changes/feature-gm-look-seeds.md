# Distinct guard looks
kind: patch
- No two guards in a section share a look seed (up to 128): Marlow Yard squad sets, Infiltration rooms, Sector Ops
  slots, response teams and reinforcements (several lone reinforcements at one entry point no longer all look alike).
- An authored guard keeps his look after a section restart and on every load, whatever the spawn order; runtime spawns
  move on to the next free seed. Host-side only: no wire change.
