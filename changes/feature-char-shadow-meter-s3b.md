# Character shadows as a faint guard cue (part 3, groundwork, dark)
kind: patch
- Light: the shadow-cue maths guards will use to notice a character's cast shadow (Michael's "A faint cue") is in, with
  light calls that take the point through a shared slot so a full 4-player update allocates almost nothing. Not wired
  into the game yet; nothing changes in play.
- Tests: the cue footprints, and the new light calls match the old ones exactly on 500 random points.
