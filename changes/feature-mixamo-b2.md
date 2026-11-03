# Mixamo walk-test fix B2: draw / holster, wall turn, zipline, rappel, guard grab
From Michael's walk test (2026-11-03), on the Mixamo bodies (Test Chamber), the moves packed in B1 now play:
- Drawing and holstering (and swapping guns) play Mixamo's draw and put-away on the upper body only, so the legs keep
  walking; timed to the game's own swap. The pistol draw from the lower back plays though the holster stays on the
  thigh (Michael).
- Back to a wall, changing slide direction plays the cover turn once (standing or crouched).
- A zipline plays its own hang (hands on the cable); the rappel plays "Climbing Down Wall" (it was the rope haul), only
  while moving (not yet tried on a real rope in the chamber).
- The guard grab plays on both bodies, upper body only (Michael: the guard "walks normally when grabbed"): the pull-in,
  the hold (looping), and the let-go on a knockout. A takedown from behind also shows the guard's seized reaction.
- Not yet: the knocked-out / killed guard still swaps to the old figure (next step); a co-op partner's zipline and grab
  show the plain hang and walk on the other screen.
- Checks: `tests/mixamoActions.test.ts`; `scripts/e2e-mixamo.mjs`, `scripts/e2e-mixamo-actions.mjs`.
