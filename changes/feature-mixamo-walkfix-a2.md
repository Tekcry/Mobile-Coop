# Mixamo walk-test fix A2: wall slides, crouched wall, climbs, wall kick, stopping
From Michael's walk test (2026-11-03), on the Mixamo bodies (Test Chamber):
- Back to the wall, the slides played backwards both ways: the pack's "left cover sneak" steps to the character's right
  (named from the viewer's side; measured in the game), so the two are swapped.
- Crouched on the wall the body no longer turns side-on (the old figure's CT turn): the Mixamo crouched cover pose
  already sits back to the wall. Crouched and moving, the locomotion's crouched sidestep plays (the cover sneaks stand).
- The ladder and the vertical pipe climb play only while moving; stopped, the clip runs on to its next grip (hands and
  feet on, measured per clip: rope climb 0.05 / 0.47 / 0.78 of its cycle, ladder 0 / 0.15; provisional) and holds.
- The wall kick's own spin is taken out (the clip turns about 140 deg as it jumps off; the game's facing now stands).
- Stopping freezes the stride where it is for about 3 s, then settles into the idle over 0.5 s (players only; moving
  off again lets go at once). Provisional numbers: `HOLD_STOP`, `HOLD_SETTLE` in `src/characters/mixamoBody.ts`.
- Checks: `tests/mixamoActions.test.ts` (slide sides, crouched slide, grip flags); `scripts/e2e-mixamo-actions.mjs` (the
  pipe holds on a grip, the wall kick keeps its facing, a stop holds then settles).
