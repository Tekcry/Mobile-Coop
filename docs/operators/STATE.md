# Operators run - state (resume point)

**Now:** step 05 (Wren: base layer and trousers), Opus 5.5, High. Steps 1-4 and 03b are done (LOG.md).
**Run style:** unattended chained steps (DECISIONS D15); each step starts the next (RULES.md "Chaining").
**After 05:** step 06 (gloves and boots).

**Key facts for the next step**
- Pipeline: `npm run operators:build [-- wren] [--render]`, then `npm run operators:check` (must pass; README in
  `scripts/operators/`); outputs in `build/operators/<id>/` (git-ignored).
- Garments: the flat pattern is the cloth's rest shape through Dynamic Mesh (A1); each garment has a `SIM` table and
  kit ids (`KIT`, per-detail `kit`); girths are measured on the 3 mm collision layer (A3).
- Bodies are bound in A-pose on the game skeleton (D13); waist 0.93 of SPEC A4 (D13); the strong goggle glow stays (D13).
- Lab and sheets (step 04): `npm run operators:export`, `npm run operators`, `E2E_GPU=1 E2E_PORT=4191 npm run operators:sheet -- wren`; sheets in `docs/operators/mockups/wren/`. Add each new garment to `GARMENTS` in `scripts/operators/export-gltf.mjs`.
- Test renders: `docs/operators/mockups/tests/`.

**Open questions for Michael:** none.
