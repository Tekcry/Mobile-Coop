# Guards against up to 4 intruders (coop4 AI)
kind: minor
- Guard AI coop4 AI1: intruder slots are reused. A player who leaves keeps his slot for his rejoin (same slot, last
  known position kept); with 3+ players a new player takes a gone player's slot when none is free (its search plan,
  caller and hunters are released). New host hook `intruderLeft(id)` and per-player ghost read `ghostOf(id, out)`.
  1-2 players unchanged.
- Guards watching 3-4 players cast at most 9 sight rays a think (A181): the one they perceive and the one they hunt
  first, the rest nearest first in rotation, so nobody is left unseen for long; 1-2 players unchanged.
- The section radio's receiver queue holds 128 (4 simultaneous contacts x 32 guards), so no receiver is dropped in a
  4-player fight; hearing locates each of up to 4 intruders by its own noise.
- With 3-4 players the alarm's reinforcements split over the known intruders: the alarm raiser's intruder first, then
  each other by freshest sighting, round robin; 1-2 players unchanged.
- With 3-4 players a stage's response grows by one guard per player past 2 (two teams from 4 guards, a shield lead
  each, never past the live cap); each team hunts and sweeps round its own intruder's last known position and keeps off
  the points another team holds; fights take cover in turn, and the flank trigger and `spotted` follow each player's
  own fight; 1-2 players unchanged.
