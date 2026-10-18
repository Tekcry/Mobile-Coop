# Weapons job - rules

- Branch `feature/weapons`, folder `C:/NightShift/Mobile-Coop-weapons` (G94). Branch guard before every write.
- Pipeline: `scripts/weapons/` (Blender 5.2.2 only, refused otherwise: `scripts/operators/blender.mjs`). Output in
  `build/weapons/` (not committed); the game files are copied to `src/weapons/assets/<id>.glb` (bundled, same origin).
- The weapon frame is the game's (x right, y up, z along the bore, metres) and the hand points (`grip`, `foregrip`),
  muzzle and magazine point in `src/config/weapons.json` stay the authority: each mesh is built around them, and the
  primitive `model` parts stay as the coarse proxy (extents for the carry slots, the fallback while the mesh loads).
- Check (independent, fresh context): blocks only on broken, wrong scale or unrealistic at a glance. Cosmetic notes go
  on `POLISH.md`. At most one fix round.
- Laptop: `npm run check`, software-GL e2e on port 4191 (`E2E_JOBS=2`). No GPU e2e; GPU screenshots "pending PC run".
- Hot paths allocate nothing; Babylon only through `src/core/babylon.ts`; no runtime network.
