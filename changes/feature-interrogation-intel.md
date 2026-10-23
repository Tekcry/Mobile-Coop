# Interrogation intel
kind: minor
- (interrogation-intel) Interrogating a guard with information now also gives intel as feed lines for every player: door
  codes authored on the guard (`GuardIntel.codes`, flag to `GameMode.onIntelCode`), the cameras near him (count, sweep
  time) and the patrols near him (count, loop time, read through the Guard AI `Enemy.patrolRoute` getter). A co-op client's
  interrogation is seen on the host from its MoveState; no wire change. A co-op client now also lists the host's relayed
  `feed` lines in its HUD feed (they were only a radio subtitle, so the partner never saw the intel there).
