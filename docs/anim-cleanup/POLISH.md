# Animation clean-up - polish list (after Michael's playtest)

- (check s1) A grenade or an aim release mid-reload seats the magazine in one frame (no blend).
- (check s1) `beginTravel` does not clear a wall glide still running on the node (a re-aim within 0.1 s of a wall
  holster): call `rig.glideWeapon(node, sameWorld)` after re-parenting.
- (check s1) During travel the gun is not under the aim pocket, so the rig's gun-out-of-body push is off; only the path
  keeps it clear.
- (check s1) The rifle draw turns from muzzle-up to the pocket quickly (CT's 0.4 s draw); continuous but fast.
- (check s1) Travel steps at the 60 Hz sim rate (steps relative to the torso at high frame rates).
- (check s1) The sling hand-off keeps SWAP_TAKE 0.58 while the clip's grip is 1 at 0.5 (sling bodies only).
- (check s1) The rifle chest-pouch hand target reads a little forward of the plate.
- (check s1) The partner sees no reload, magazine or travel (the wire carries only the draw phase).
- Left-handed hold: the trigger hand uses the support grip shape (one morph per hand).
- (audit tool) traverse-shots.mjs: the window vault and duct set-ups do not start the move (kind 'none') and the wall
  ones do not enter the wall; use anim-sheet's wall scenarios and fix the set-ups when those moves are audited.
- Rappel, fence and split-jump contacts not yet audited on Wren (no set-up on Proving in the shot script).
- (P1c handover from CT Core) Crouched and holstered, the free arms hang straight from the shoulders, so the hands sit
  ahead of the knees, fingers to the ground. Believable fix: rest the hands on the thighs above the knees (the crouch
  ready-hand position: animGraph xCrouch / zCrouch / flexCrouch, coordinate with CT Core) and turn the wrists palm-in
  (this job: the relaxed-hand wrist, CharacterRig.solveArm's free-hand branch).
