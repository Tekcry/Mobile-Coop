# Animation fix pass AF4b: crouched strafe and wall slide, gun clear, pistol on one knee
kind: minor
- Crouched and armed, the kneel goes down on the gun hand's knee every time (Michael P4 "pistol shifts between knees": it
  followed whichever foot the planner had ahead, so it changed between stops).
- The crouched pistol low ready is held higher and ahead, clear of the knees (`CROUCH_GUN.pistol`: it hung between them
  and the body clearance pushed it from one side to the other), and rises a little while kneeling down or standing up; the
  raised pistol crouched is held 5 cm further out (`PISTOL_REACH_CROUCH`; grip jitter 1.01 -> 0.67 cm a frame).
- Drawn and crouched at a wall (Michael P4 "with rifle clips"): the gun keeps the crouch carry raised over the knees
  (`CROUCH_GUN.wall`) through the slide and the reversal instead of the muzzle-down wall tuck, and the side-on body keeps
  the free crouch's lean with a weapon out; gun vs legs went from -10.5 cm to +2.2 cm or more.
