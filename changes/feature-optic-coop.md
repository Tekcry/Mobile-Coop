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
  refusals "Too far" and "No gap". No input reaches them yet (F is the co-op action) and no map places one.
