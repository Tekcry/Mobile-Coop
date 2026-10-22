# anim-natural N4b (track A: co-op holders, traversal, holds)
kind: minor

- Co-op team moves: the partner who helps is no longer a statue. Leg-up: cupped hands take her foot, he dips, then drives
  up with legs and arms while she pushes off his hands. Throw: he loads and throws with his whole body. Hang-down: his
  hands hold her ankles, leaning back or bending over the edge with the depth. Rope: both hands on the rope, leaning
  back against her weight. Animation only (no timing, position or protocol change).
- Mantle: both hands plant on the top edge and she presses over them. Drops: a step off with the arms up for balance, the
  legs ahead in the air, and a landing that bends more for a longer drop. Roll: a grounded shoulder roll instead of an
  airborne somersault (slower hands, the slung rifle swings far less). Split brace: hands braced on the walls instead of
  arms straight out.
- Holding a guard still: she braces, breathes and shifts her weight against him (the trunk no longer stays at 0 deg).
  Animation tuner (Holds and carries): brace, brace roll and breath sliders; they bake. Anim Studio: the hold walks
  travel with planted feet instead of sliding on the spot.
- (PR fix) Letting go of a ladder, a drainpipe or a hang, the legs stay under her in the fall (the legs-ahead air pose is
  for walking off a ledge or a jump; off a ladder it went into the wall). The split brace's breath runs from the moment
  she braces, so the partner's copy breathes in step with her.
- (PR fix 2) Stepping onto a ladder from its top no longer sinks her legs 30 cm through the rim (the mantle's hand plant
  is off for that backward climb-on). A landing or forward roll needs 0.9 m clear past its end (was 0.4): the shoulder
  roll's dive put her head 30 cm into the wall after the vent drop; with less room she lands without the roll.
