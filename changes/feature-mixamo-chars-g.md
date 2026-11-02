# Mixamo characters, slice g: aim pitch on the Mixamo spine
- With a gun raised, the Mixamo body's spine bends to the aim pitch (split over Spine, Spine1, Spine2, about the body's
  right axis, eased over 0.08 s, at most 1.1 rad: provisional), so the gun in its hand points with the view up and
  down; the hold and the chest follow run after the bend. No bend while an action plays.
- `scripts/e2e-mixamo.mjs` checks it: camera pitch +0.6 / -0.6 rad turns the barrel to a rise of +0.53 / -0.53.
