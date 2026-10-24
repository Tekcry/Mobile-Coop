# Optic cable: the partner's view, hatches and grilles (engine)
kind: minor
- (ct-toolkit 3.2, optic-coop) Co-op: a partner now sees the optic cable. While one player feeds it under a door their
  copy on the other screen kneels in front of the leaf with the right hand at the door's foot and a thin cable running
  out under the door, growing over the 1.2 s feed and shrinking over the 0.6 s pull out; the view stays local. The
  player's own body shows the same hand and cable. Wire: MoveState mode `optic` (`sub` the kind: door, hatch, panel,
  grille; `a` the door or gap; `ph` the cable fed out); an unknown kind or a door or gap the level lacks is dropped.
  A ping from the view already casts from the tip and reaches the team; no ping input is bound yet.
- (optic-coop) Engine side of the optic cable's other gaps (map field `optic`): floor hatches, ceiling panels (fed
  standing), vent grilles and shaft tops (`LevelBuilder.opticGap`, `OpticSystem.pickPoint`): the kneel spot, the tip
  0.3 m into the space (or the map's own tip point), the look 50 deg down or up through a floor or ceiling gap, and the
  refusals "Too far" and "No gap". No map places one yet.
- (optic-coop M1) At a hatch, ceiling panel, grille or shaft top the optic cable starts from the action menu, the same
  as doors: hold A (E) for OPEN TRAP (only where a panel covers the gap; it opens quietly) and OPTIC CABLE; "Too far"
  and "No gap" show as at a door. In co-op OPEN TRAP goes through the host like a door, so the panel opens for both
  players (and for a partner who joins or rejoins later); wire: client -> host `panel`, the snapshot's `trp`.
- (optic-coop M2) Ping is bound: middle mouse on keyboard and mouse, R3 on the pad, and it works from the optic view
  (the ping comes from the tip, from the view's first moment). R3 is also Zoom: the controls screen shows that conflict.
- (optic-coop) A level holds at most 256 optic gaps (the network's bound); more are refused with a warning.
