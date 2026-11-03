# Mixamo walk-test fix B1: low ready, the Action Forge crouch walk, the B moves packed
From Michael's walk test (2026-11-03), on the Mixamo bodies (Test Chamber):
- Drawn and not aimed, the rifle and the pistol are held at low ready (Mixamo "Rifle Idle", lowered; "Pistol Idle",
  ready alert); the aimed idles are unchanged.
- The unarmed crouch walk (it held the hands up as if carrying a gun) is now ActionForge's crouch walk, all four ways
  (Michael's pick to try, 2026-11-03: Mixamo's four-way crouch walk is a creature sneak with clawed hands up). CC0.
  The pistol's crouched walk keeps the old Mixamo one. The old clips stay packed.
- Packed but not wired yet (next): rifle / pistol draw and holster (the thigh holster stays, Michael), the wall turns,
  the zipline hang, the rappel, the guard grab set (both bodies). 78 moves per model now.
- Credits: `docs/art-credits.md`. Checks: `tests/mixamoLocomotion.test.ts`; `scripts/e2e-mixamo.mjs`.