# Stronger level textures
- The surface textures the game draws in code show at full strength (they were mixed in at half), so walls, floors and
  metal read as concrete, plaster, brick and steel instead of flat colour.
- Concrete walls have formwork panels with seams and tie holes, run-off streaks and stains; concrete floors have sawn
  slab joints, worn patches and oil spots; plaster has patchy repairs; metal sheet has seams and smudges.
- A thin green panel (a gate, a door, a sign) is painted metal, not grass (Marlow Yard's yard gate wore the grass
  texture); a big dark wall is dark concrete, not plain rubber (the Test Chamber's walls).
- The automated run (`npm run auto-run`) now checks that the level wears its textures.
