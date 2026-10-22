# Traversal fixes (spare job 8)
kind: minor
- Ledge shimmy: a hand never re-grips on or through the other hand at a lip's end (12 cm minimum gap, `LEDGE_HAND_GAP`);
  it stays put when the leading hand is clamped at the end.
- Rifle draw from the diagonal sling: the grip waypoint passes further out from the hip (`TRAVEL_VIA.sling`
  [0.4, -0.22, 0.04]), so the gun clears the trunk (e2e-clip "sling draw + glide" trunk -1.5 -> +0.9 cm, legs 2.8 cm).
