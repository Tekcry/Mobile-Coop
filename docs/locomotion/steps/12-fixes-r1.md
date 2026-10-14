# Step 12 fix round 1
1. Unit tests in tests/wallController.test.ts: short-face edge choice (both ends within 0.35 m: stick +t -> edge 1, -t -> edge -1, idle -> nearer end); a gap under 0.8 m gets no SWAT target.
2. Remote yaw snap (src/net/remoteAvatar.ts ~203): when the lean bit drops the copy's yaw jumps to wp.yaw in one frame; ease toward wp.yaw at the owner's turn rate (12 rad/s, wallOverride) or hold s.yaw until within ~0.05 rad. Re-check walledge remote pops.
3. e2e-netmove "swat mid-move" case (D8: every new state has a netmove case). If joints <= 10 cm cannot be met mid-move now, assert what holds (mode swat on the host, root within 10 cm) and record the joint gap in docs/locomotion/REVIEW-NOTES.md as a D8 deviation carried to step 27.
4. e2e-takedown: corner takedown from the wall.
5. wallPeekOffset gives remotes the full 0.25 m during the local 0.2 s peek blend: carry the eased amount on the remote (derive from time-in-peek on the receive side, no extra bandwidth) or document it as deliberately conservative in movement.md.
