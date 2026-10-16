# Operators run - state (resume point)

**Now:** step 07 (Wren: hood, optic, mount and comms head kit), Opus 5.5, High. Step 06 passed the independent check
after 3 fix rounds (LOG.md "Step 06": OPEN follow-ups, including the knuckle pad crumple and a check gap for inverted
inner-shell vertices).
**Run style:** unattended (D15), one orchestrator session like the locomotion run (D18): implementer, independent Opus
checker, up to 3 fix rounds, the orchestrator commits. Rules: RULES.md "Step loop", steps/AGENT-PREAMBLE.md. Start
and resume prompts: OWNER-NOTES.md ("Operators run: RESUME (local)").

**Key facts for the next step**
- Pipeline: `npm run operators:build [-- wren] [--render]`, then `npm run operators:check` (must pass; README in
  `scripts/operators/`); outputs in `build/operators/<id>/` (git-ignored).
- Layers (A11): garments build in `GARMENTS` order (`export-gltf.mjs`; Wren: base_layer, gloves, boots, combat_shirt,
  trousers). Gloves and boots are fitted, not sewn (A18): `py/build_fitted.py` (`FITTED`), geometry in `py/fitted.py`. Each
  opens the previous garment's blend (`--under`), is drafted with `UNDER_LAYERS` girth allowances, arranged clear of
  the skin and the layers, sewn, then pushed clear of the layers (`layer_push`). Blender cloth-on-cloth collision is
  off (`SIM.layer_collision`): it tore the seams. Waistbands are pinned (`SIM.pin`), the leg block's rise is solved
  from the measured crotch path (`crotch_ease`), the base layer clings (`SIM.cling`), the trousers are faired (A15); the shirt hem is tucked (`SIM.tuck`), layer pushes are spread bumps, knee stretch panels are `inserts` (A16); the trousers' seat is bridged (`SIM.bridge`) and their stitches cast no render shadow (A17). A new garment goes into `GARMENTS` in layer order.
- Legwear: `garments/legwear.py` is the leg block (rise, gusset, darts, gathered band); legwear simulates at gravity
  0.3 (A13). Gloves and boots sit under the shirt cuffs and trouser hems; the hem is drafted from the boot top girth
  plus one layer (26.5 cm) and laps the boot collar (A22). Fitted panels are cut by `fitted.level_slice` and stepped
  by `fitted.split_step` (A19, A20); gloves use `untangle()` (A21). A glove or boot change means rebuilding the shirt
  and trousers; a full rebuild takes about 50 min, `operators:check` with 5 items over 25 min (run in background).
- Garments: the flat pattern is the cloth's rest shape through Dynamic Mesh (A1); each garment has a `SIM` table and
  kit ids (`KIT`, per-detail `kit`); girths are measured on the body plus 3 mm, plus 4.1 mm per layer under it.
- Bodies are bound in A-pose on the game skeleton (D13); waist 0.93 of SPEC A4 (D13); the strong goggle glow stays (D13).
- Lab and sheets: `npm run operators:export`, `npm run operators`, `E2E_GPU=1 E2E_PORT=4191 npm run operators:sheet -- wren`;
  sheets in `docs/operators/mockups/wren/`. Test renders: `docs/operators/mockups/tests/`.

**Open questions for Michael:** none.
