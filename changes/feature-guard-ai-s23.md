# Guard AI: every player is seen
kind: minor
- Co-op: a guard now looks at both players, not just the nearer one. Hiding behind a wall close to a guard no longer
  makes your partner invisible while he stands in the guard's light in front of him: the guard notices whichever of you
  he sees best (one meter, filled at that player's rate; two in view do not add up) and goes after him. In a firefight
  he keeps shooting at the player he is fighting while he still sees him; a nearer hidden player no longer blinds him.
  Out of sight of him, he turns on the nearest player he does see.
- Co-op: the host's awareness arcs show only guards that see the host's own player (or stand close by), not guards
  filling up on the partner. The flanker is picked by each guard's distance to his own target, not to the host.
- A calm guard casts no sight ray for a player he cannot see at all (behind him beyond arm's reach, or past his view
  range). Solo play is otherwise unchanged. Host only: no protocol or save change.
