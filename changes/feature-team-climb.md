# Team climb: the rope top-out
- (team-climb) The two-person rope's top-out (CLIMB_UP_TEAM) no longer pops: the climber is pulled in to the face on
  the rope's last 0.6 m, then rises and moves over the lip on eased (quintic) paths that carry the climb's speed in
  (`teamMoves.ropeTopPath`; `TEAM.ropeTop` 0.9 -> 1.1 s). Root per-frame velocity change 5.7 cm -> 0.44 cm.
- (team-climb) The climber's hands grip the lip at the top (lip "hook" grips, lifting off as the arms run out), on
  the owner's page and on the partner's view of them (`ropeSeenStep`, no wire change). The Anim Studio's rope pair
  plays the same path.
