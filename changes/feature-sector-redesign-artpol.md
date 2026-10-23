# Campus art polish batch 3
kind: patch
- Campus dressing: a raised piece with no wall behind it counts as a floor prop below 1.9 m (only higher pieces take
  the ceiling rules); long route, patrol and laser legs that cross a section with both ends outside it are kept; the
  skin-reach check skips a camera ray only where the skin meets its own piece (2 cm) and a laser only in the piece's
  height band, measuring listed overhang parts (the S4 basket hanger rods) by their real geometry.
- Campus art: a failed art build disposes everything it made; the detail pass leaves art boxes bare (drawn and baked).
- Campus load: the dressing runs about twice as fast (cold) and 60% faster (warm) in node, with identical output.
