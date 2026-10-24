# Guard AI polish batch
kind: minor
- Guard AI polish: a guard picks cover by the walk, not the straight line (A167). Up to 3 candidates are tried; a
  cover a mate holds is skipped and one behind a long detour (over 1.5 x the straight line + 3 m) is passed over, so
  he no longer walks the long way round to cover he cannot fight from, or freezes on a mate's cover. A failed open-wait
  pick retries every 3 s.
- Guard AI polish: a device responder who hears a noise goes back to searching the device room after the look,
  instead of standing still.
- Guard AI polish: a circuit cut twice inside 60 s, or one whose reset walk never finished (the walker knocked out, the
  alarm, the 30 s give-up), is found and relit again after 20 s instead of staying dark for good (A168).
- Guard AI polish: a guard in cover with the player out of sight judges his cover against where he last knew the
  player was, not the player's real position, so he no longer pops up into an upright strafe and re-picks cover.
- Guard AI polish (co-op): a guard with no intruder of his own heads for what he himself sensed, not for the partner
  nobody told him about (A165). A guard hunting one player who sees the other calls him in once, so that fight gets a
  reporter (A166).
- Guard AI polish: the search plan hands out new points on each rebuild and never re-looks the last known position
  as its second point; heard spots no longer skip a search point; search points snap to the right floor; a clamped
  plan point is not counted as searched.
- Guard AI polish: one-mover rule counts only a trip to the role's own cover (fixes a squad e2e flake); a fighter who
  hears the other player keeps hearing his own target; two intruder groups are never sent to the same free cover; a
  blinded calm guard no longer turns to or reports noises.
- Guard AI polish: overwatch suppress rechecks its line each episode and counts crates as blocking, so no rounds go
  into a wall or a crate; a stale advance after an open-wait pick no longer churns cover / chase.
- Guard AI polish (co-op): first shots at a newly picked target use a fresh aim settle; a dog in a fight follows a
  partner he can smell.
- Guard AI polish: a calm guard with two players in view keeps looking at the one he picked until the other is seen
  clearly better (25%, A169), instead of switching every think.
- Guard AI polish: a still-locked door forced open opens its doorway on the guards' nav grid at once, not one update
  late.
- Guard AI polish: an alerted reinforcement with no valid intruder binds on the next call or sighting, not to an alarm
  slot with no position (A182).
- Guard AI polish (code health): fewer allocations and cheaper checks in `pickCover`, `consoleStep`, `boardStep` and
  the per-step manager loops; new tests for the locked-door open, the calm target hold and the sight-ray miss.
