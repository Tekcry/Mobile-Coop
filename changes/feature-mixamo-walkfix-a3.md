# Mixamo walk-test fix A3: aiming sway, rifle height, head in the reticle
From Michael's walk test (2026-11-03), on the Mixamo bodies (Test Chamber), measured in aimed-view shots first:
- Turning while aimed the gun swung up to 20 deg off the reticle: the Mixamo spine bent only to the aim's pitch. It now
  twists to the aim's yaw too, as the old figure's did (a quick flick still trails like the old figure: the gun's mass).
- Strafing aimed, the clips leaned the upper body so the head sat on the reticle. Aimed, the upper body (spine, neck,
  head, arms) now holds its set's aimed idle in the body's space (rifle / pistol, standing to crouched), the legs keep
  the gait, and the spine leans so the head keeps its aimed spot across the ground (walking aimed, its sideways sway went
  from 88 to 10 px); its height still rides the gait.
- The aimed rifle sat about 100 px under the reticle: aimed, the gun now goes where the old figure aimed it (sight level
  with the eye, along the aim) and the Mixamo arms reach for it (two-bone reach, `src/characters/reach.ts`; the left
  hand keeps its place on the gun). Only while the gun is in the right hand (a shoulder swap keeps the clip's arms).
- Provisional: `YAW_MAX`, `UPPER` in `src/characters/mixamoBody.ts`. Guards use the same body code.
- Checks: `tests/mixamoReach.test.ts`; `scripts/e2e-mixamo.mjs` (aimed, the rifle is up at the eye; strafing aimed, the
  head stays clear of the reticle and still).
