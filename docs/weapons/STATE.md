# Weapons job - state (resume point)

- Done: pipeline, rifle mesh + runtime wiring (commit "weapons: rifle"), the forearm fix in the poser.
- In progress: pistol and knife meshes (subagent); grip morph targets on Wren's game files (gripR trigger hand, gripL
  support hand) and their runtime blend; the CT aiming stance (Michael's reference shots: tight over-the-shoulder aim,
  rifle shouldered with a cheek weld, elbows in, support hand forward on the launcher; pistol two-handed, arms out).
- Open e2e items: e2e-weapons-carry support hand 5.1 cm from the rifle's support point (needs the stance pass);
  e2e-desktop:1, e2e-mouse (timeout under load), e2e-kestrel to rerun alone.
- Next: wire the grip morphs, hand alignment, stance, independent check, full e2e, PR.
