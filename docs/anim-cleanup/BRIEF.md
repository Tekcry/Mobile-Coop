# Animation clean-up - brief (feature/anim-cleanup)

Michael (chat, 2026-10-19), in his words:
- "Are you able to review all current animations and pass over to clean up any discrepancies? ... I would like cleaner,
  more realistic animations across the board. Posture is scheduled to be fixed in another session though."
- "Proceed with your recommendations. You can request ct core session let you know when posture is fixed and you can
  proceed. I would allow any fixed so long as they are kept to prototype only but at least accurate and believable with
  no clipping"
- "I also want you to audit handling weapons (aiming, reloading, equipping and holstering). Must put away the current
  weapons before grabbing the next one. Must realistically handle magazines and weapon when reloading, with hands in
  correct places. Must holster without clipping. I want it to look realistic but only give it a prototype pass.
  Believable is a good outcome."
- "Also shoulder swap should change weapon between arms/shoulders. Same rule applies as other animations"
- "Where are wall hug animations reviewed? Can we also sync with ct animations here for those, and climbing pipes
  vertically and horizontally / ladders / zip lines etc"
- "Also review ct research documentation, you mentioned lean out with gun which isn't part of the current game."

Scope, in order (slices):
1. Weapon handling on Wren: aim (stances, moving), reload with a real magazine (out of the well, a fresh one from the
   chest pouch, seated), equip / holster in sequence to the real mounts (back plate stud, thigh holster), shoulder swap
   (the weapon changes hands and shoulders; CT G17: only while aiming).
2. A Wren-specific animation audit across every state (the old audit measures the rig, not her body).
3. Traversal and wall contacts against CT footage: back-to-wall (no aim on the wall, no lean-out: loco M20 Q1), pipes
   vertical / horizontal / inverted, ladders, ziplines, ledges and shimmy, vault and mantle, rappel, split jump.
4. Hand shapes beyond the weapon grips (relaxed, flat palm on a wall, rung grip, fist).
5. Transitions (pops, glides).

Every slice: prototype level, accurate, believable, no clipping. Pure CT: the move list comes from docs/ct-research and
docs/DECISIONS.md, not from what the code still contains (things the code has and CT does not go to Michael as a list).
Boundary: CT Core (G150) owns feel (timing, speeds, camera, back-to-wall feel); this job owns pose accuracy, contacts,
hands and clipping, and asks CT Core before changing timing numbers.
