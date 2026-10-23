# Partner pose parity: aim side, takedown blow, baked sections
kind: minor
- (pose-parity) Co-op: your partner's weapon hand now follows their shoulder swap in every mode (holding a hostage, on
  a rope, a split, an inverted pipe, atop the human ladder), not only on the ground; a partner choking a guard or
  stepping in for a lethal takedown no longer holds the elbow strike's wind-up (they pose no arc, as on their own
  screen); and once tuner values are baked into the code, the partner's rig plays the baked co-op / traversal move
  sections and Body root offsets (body forward / up, the hold's guard gap and side, the wall gap) as their own page
  does (never your live tuner values). Protocol 36 (32-35 are taken by open branches): the player flag `aimLeft` (64)
  and the takedown blow bit (MoveState `sub` 1); the ground `sub` bit 128 is dropped.
