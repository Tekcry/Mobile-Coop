# Weapons job - morning report (2026-10-19)

## Done
- All three kit items are in the game as baked, realistic meshes built by the offline Blender pipeline
  (`npm run weapons:build`):
  - the rifle with its launcher and suppressor, 0.93 m;
  - the pistol with the jammer emitter, 0.32 m;
  - the knife, 190 mm, matching her sheathed one.
- Holding (your mid-run ask):
  - Wren's fingers wrap the grips: morph targets from her hero hand rig.
  - Her palms sit on the grips: holds solved from her own hand.
  - The support shoulder comes forward so the elbow bends.
  - The pistol is aimed out with both hands, as in your reference shots.
  - Underlying bug fixed: her wrists were 16 cm off every grip since Wren went in. Her bind elbow is bent and the poser
    only straightened the upper arm.
- Carry: the pistol sits in her built holster (it used to cut 20 mm into it). The rifle hangs flat from her back plate's
  receiver bar by a stud (it used to float off her back on its optic).
- Independent check: PASS on scale, realism, holds and carry. One leak found and fixed (fix round 1).
- Screenshots for your review (laptop GPU, training map): `docs/weapons/renders/game/*.webp`. Offline renders:
  `docs/weapons/renders/*.webp`.

## Checks
- `npm run check` green.
- Full software-GL e2e on the final build: every required suite passes (alone where the parallel run timed out); e2e-foley known flaky.
- Two suites fail on master too (logged in docs/backlog.md): e2e-kestrel and e2e-camera-bounds (camera vs level checks).

## Pending PC checks
- Performance budgets with the weapon meshes and the grip morph targets (`perf.mjs`, `E2E_GPU=1`).
- A look at `npm run weapons:shots` on your PC's display.

## Left (polish list, after your playtest)
docs/weapons/POLISH.md. Main items:
- Wren's holster shell rebuilt round the real pistol (her carry-fit job).
- The draw and holster reach aimed at the new mounts.
- One grip shape per hand.
- A sling.
- Guards' own guns.

## Questions
- None blocking. The animation clean-up job you approved starts from this branch plus CT Core's posture fix (59a6846)
  and merges after both.
