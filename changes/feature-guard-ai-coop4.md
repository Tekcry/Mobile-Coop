# Guards against up to 4 intruders (coop4 AI)
kind: minor
- Guard AI coop4 AI1: intruder slots are reused. A player who leaves keeps his slot for his rejoin (same slot, last
  known position kept); with 3+ players a new player takes a gone player's slot when none is free (its search plan,
  caller and hunters are released). New host hook `intruderLeft(id)` and per-player ghost read `ghostOf(id, out)`.
  1-2 players unchanged.
