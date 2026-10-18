# Animation clean-up - state (resume point)

- Slice 1 (weapon handling) done: draw / holster travel to the real mounts, reloads with a real magazine and the
  charging handle / slide, the shoulder swap, aiming across stances; independent check + fix round 1.
- Known failures inherited from the ct-prototype merge (fail on 507e671 too): e2e-move gear 1 speed, e2e-combat LB
  swap, e2e-weapons-carry crouch-walk back gun angle. Reported to CT Core; the carry one is looked at in slice 3.
- Next: slice 2 (Wren audit tooling for every state), then slice 3 (traversal and wall contacts vs CT footage).
