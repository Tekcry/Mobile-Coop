# Optic cable
kind: minor
- (ct-toolkit 3.2, G97) Optic cable at doors, prototype: the door menu's OPTIC CABLE at a closed door kneels the
  operator in front of the leaf and, after a 1.2 s feed, puts the view under the door on the far side at floor height
  (the feed overlay, 100 deg field of view). The look turns the tip within +-75 deg yaw and -10..+60 deg pitch, night
  vision toggles as usual, a ping goes out from the view, crouch (B / C) or the stick pulled back leaves (0.6 s pull
  out). The tip is never perceived; the kneeling body is perceived as any crouched, still body. A door tagged `seal`
  refuses ("Sealed"), as does a blocked far side ("No gap"). The view is local (nothing on the wire). New
  `player/opticCable.ts` (pure), `game/opticSystem.ts`, `config/tools.ts`; the door anchor gets `seal`.
