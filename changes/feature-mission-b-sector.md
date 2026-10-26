# Missions: Sector Ops missions and the co-op kit
kind: minor
- Sector Ops can run a mission on top of a map's sections: a briefing, steps (copy intel, hack, get out), a rule such
  as "no kills" (breaking it restarts the section) and the objective line and Field Terminal list that follow it. The
  Saltmarsh Park test mission runs this way in /preview/ (`?autostart=campusOps&mode=sector&mission=campusMissionTest`).
- New co-op moves for later maps: the pull-up (one player crouches at a ledge, the other jumps and is hauled up) and the
  roller shutter (one player holds it open while the other crawls under). Guards notice an open shutter. They need the
  co-op part and the Tallow Wharf map, which come in the next missions updates.
- All of this is behind the `missions` and `coopKit` flags: off in the live game, on in /preview/. Nothing changes in
  the live game.
