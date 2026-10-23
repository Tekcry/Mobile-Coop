# Strike and hand-swap pops (spare job #5)
kind: patch
- (strike-pops, n4c polish 9) The elbow strike's trunk turns at its own pace (`STRIKE_BODY_RATE` 6.25 / s,
  `strikeBodyPhase`): no load-to-drive reversal at speed (shoulders 12.6 then -12.1 deg a frame -> 9.2, -0.4, -13.3),
  the drive over 2 frames (18.9 -> 13.3 deg max), the right wrist's largest frame 31.4 -> 27.0 cm, the pelvis'
  2.9 -> 2.0 cm. The hit still resolves at 83 ms, the hand across at 100 ms.
- (strike-pops, n4c polish 1) A hand swap reversed mid-swap no longer flips the gun's dip direction in one frame: the
  dip and the tuck read the swap's progress from the hand blend (`handSwapPh`); plain swaps unchanged.
- (strike-pops, n4d polish 1) A bay or section restart ends a strike or a kill's follow-through on the respawned player
  (the respawn's `StrikeController.reset` ends the takedown tail; the co-op client's `revive` resets the strike too).
