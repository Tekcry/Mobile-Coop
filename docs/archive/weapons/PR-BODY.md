## Weapons: the CT kit as realistic meshes, held and carried believably

Michael's overnight brief (docs/weapons/BRIEF.md), widened during the run: "Holding weapons and holstering should at
least look believable but only prototype quick run".

### What's in
- **Offline pipeline** (`npm run weapons:build`, scripts/weapons/):
  - runs headless in the pinned Blender 5.2.2: geometry in the weapon frame, procedural PBR baked on the GPU, GLB in the
    game reader's layout, KTX2 through the operators' repack;
  - writes review renders (`docs/weapons/renders/`);
  - `npm run weapons:shots` takes the in-game screenshots.
- **Rifle (Heron Carbine):** an original suppressed carbine with the co-op launcher always fitted (G76, research 1.3).
  0.93 m, 11.7 k tris, 2K textures.
- **Pistol (Hush 9 SD):** suppressed 9 mm, 0.32 m, 9.7 k tris. The jammer emitter and its red / green aim light sit in
  the frame's nose (G152).
- **Knife:** 190 mm, matches the handle on Wren's sheath, 1.8 k tris. Shown in the right fist when drawn (no knife verb
  yet, A5).
- **Holding:**
  - Wren's fingers close round the grips: morph targets from her hero hand rig, blended by the rig's `handGrip` (A8).
  - The palm sits on the grip with the knuckles round it: trigger, launcher-tube and pistol-cup holds solved from her
    own hand frame (A9).
  - The support shoulder comes forward so the elbow bends (A10).
  - The pistol is aimed out with both hands (A11).
  - Fixed on the way: her wrists sat 16 cm off every grip. Her bind elbow is bent about 35°, and the poser and the Lab
    retarget straightened only the upper arm.
- **Carry:**
  - The pistol sits in her built holster frame. The generic slot cut it 20 mm into the shell (A12).
  - The rifle hangs flat from her back plate's receiver bar by a keyhole stud, muzzle up, grip to her right hand. It
    used to stand off her back on its optic (A13).
- Guards keep their guns (A6). Gameplay unchanged: muzzle, hand points and carry extents still come from weapons.json.
- The weapon GLBs get their own service-worker cache, so they cannot evict Wren's LODs.

Assumed decisions A1-A14 with how to undo each: docs/weapons/DECISIONS.md.

### Checks
- `npm run check`: green (lint 0 errors, all unit tests, build).
- Full software-GL e2e (`E2E_PORT=4191 E2E_JOBS=2`) on the final build:
  - Every required suite passes, alone where the parallel run failed: e2e-stealth, e2e-mouse, e2e-coop, e2e-pad,
    e2e-bunker.
  - Known flaky: e2e-foley ("a sprint plants faster than a walk", its known walk-plants threshold).
  - Pre-existing, failing on master 9295c65 too (logged in docs/backlog.md): e2e-kestrel (camera rays along the tour) and
    e2e-camera-bounds (level U).
  - Fixed by this branch on the way: e2e-netmove (the partner's raised pistol) and e2e-weapons-carry (holds).
- Independent check (fresh agent): PASS on scale, realism, holds and carry. It found one blocker, the grip morph managers
  leaking on figure dispose; fixed in fix round 1.
- In-game GPU screenshots were taken on this laptop's RTX 4090 (Michael: "You are on the laptop also, so you can run the
  screenshots as needed"): docs/weapons/renders/game/.

### Pending PC checks
- Performance budgets (`perf.mjs`, `E2E_GPU=1`) with the weapon meshes and the morph targets on Michael's PC.
- A visual pass of the in-game views on the PC's display (`npm run weapons:shots`).

### Polish list (after the playtest)
docs/weapons/POLISH.md. Main items:
- Wren's holster shell needs a rebuild round the real pistol (her carry-fit job).
- The draw and holster reach should aim at the new mounts.
- One grip shape per hand.
- No visible sling.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
