# G2 check: uniform garments

Checker: fresh Opus, did not build G2. Branch `feature/gm-g2` head d51b5f14 against base feature/guard-models 92292b90.
Read: agent-preamble, gm-common.md, gm-blender.md, PLAN "### G2" and "### G4", SPEC 3, 4, 6, 8, 11, G2-REPORT, the full
code diff, and origin/feature/gm-g4 (WIP, for naming only).

## Verdict: PASS

No blockers.

## Findings
1. **GB contract.** `jobsFor('garments', guards.json)` gives 16 jobs: average 5, lean 7, broad 4. Each job's script
   (`garments/combat_shirt.py`, `trousers.py`, `boots.py`, `gloves.py`, `field_jacket.py`) has a `__main__` entry that
   hands off to `guard_garment.main()`. Its argparse takes everything the driver passes (`--seed`,
   `--stage --job --base --garment [--variant] --kit --out`), and each variant in the plan matches
   `guard_garments.json`. Outputs are `garments/guard-<b>-<part>.{blend,json}`, as the plan declares. G4's WIP
   (`bake_guard.py` ~546-561) appends that file and keeps the objects named `guard-<b>-<part>[-...]`. It drops the shell
   `guard-<b>-<part>` and hidden objects. G2 ships exactly that: the shell is hidden, the hero and details are shown, and
   no body or rig is included. G4's `UNTINTED_PARTS` (boots, gloves, work_gloves) matches G2's `tint: none` parts.
2. **Wren's path is unchanged.** Wren's stages load the modules with `__import__` (`build_garment.py:43`,
   `build_fitted.py:46`, `garment_details.py:906`), so neither `__main__` block runs. `configure()` is called only by
   `guard_garment.load_part`, and only on a fresh module copy registered under the part id, never on the real module.
   - combat_shirt: `draft` goes to `guard_draft` only when `GUARD` is set and no `ease` is passed. `base_layer`, `suit`
     and `field_jacket` pass `ease` or use the unconfigured module.
   - trousers: `cut` / `draft` are swapped only inside `configure()`.
   - boots: `Z_TOP` defaults to 0.155, so the shaft height is unchanged. `_guard_surface_points`, the `hull_perim`
     fallback and `shaftTopRingsZ` sit behind `if GUARD`, and `GUARD` defaults to False.
   - gloves: the defaults `NAME='gloves'`, `KNUCKLE=True` and `LEATHER=None` give Wren's names, knuckle panel, flex
     channels and leather. `guard_ctx` runs only when `GUARD` is set.
3. **Bones.** `gloves.guard_ctx` reads `finger<S>_<i>_1` first and the older `finger<S>_<i>` as a fallback. It skips a
   finger that already has `_3` (a hero rig). This matches SPEC 6 on feature/guard-models and G1's
   `build_guard_body.py` (`fingerL_<f>_1`). The bones come from the rig (`build_fitted.py:44`), so heads and tails are
   both present.
4. **Layer chains.** `guard_garments.json` `outfits` matches `OUTFIT_GARMENTS`. The chains are:
   - average: trousers over shirt and boots; jacket over shirt, boots and trousers.
   - lean: trousers over shirt_rolled and boots; work_trousers over boots; work_jacket over boots and work_trousers.
   - broad: trousers over shirt and boots.

   The test rebuilds these chains from the kit's kinds and outfits and checks the prefix rule, so each sewn copy is built
   over its own job's chain. The runner passes the same `shirt_hem_z` / `boot_top_z` to a trousers copy as the trousers
   job does. Coverage is sensible: job count and split, scripts and entries, outfits against the plan's tags, chains,
   tint slots, and the report check (5 + 5 tests).
5. **Merge.** I built a temp worktree on origin/feature/guard-models (f73fa2cd, already past 92292b90) and ran
   `git merge --no-commit d51b5f14`. It merged automatically with no conflicts.
   - `tests/guardGarments.test.ts`: 5/5 pass.
   - `tests/guardGarmentCheck.test.ts`: 5/5 pass.
   - `tests/guardBakePlan.test.ts`: 38/38 pass (38 on the newer base; the report counted 33 on its base).
   - `npx tsc --noEmit -p .`: exit 0.

   The worktree was removed afterwards (junction unlinked first; the gm-g2 node_modules is intact).
6. **Smoke numbers match the check thresholds.**
   - Seam gaps of 20.1 mm (trousers) and 21.4 mm (shirt copy) are over the 10 mm warn line and under the 30 mm fail
     line, so the check gives 2 warnings and `ok`. That matches the report.
   - The drafted `boot_top_girth` of 0.318 m is over the floor of 0.2 x s = 0.211 m (average, s = 1.054).
   - The boots run before the fix had a top girth of 0.115-0.126 m, under 0.211 m, so its FAIL is consistent.
   - 18 objects, all prefixed, pass the foreign-name rule.

## Polish list (not blocking)
1. Job hashes do not cover the runner (lead's call; guardBakePlan.mjs:48, not G2's file). `LIBS.garments` lacks
   `guard_garment.py`, `guard_garments.json`, `build_fitted.py`, `garments/legwear.py` and the chain part scripts.
   After a change to any of these, a cached garments job would not rebake. Add them before the second bake (G4's WIP
   also edits this file; do it at G4's merge).
2. The sleeve cuffs are not sewn over the glove cuffs. Gloves are in no chain (guard_garments.json:12-13 `under: []`),
   so the shirt and jacket sleeve ends and the glove cuffs (5.5-7.5 cm up the forearm) are each fitted to the skin only.
   They may clip at the wrist. Watch on G4's sheet. A fix is to put gloves in the shirt / jacket chains, or to push the
   glove cuff clear of the sleeve copy.
3. First run on the laptop: none of these has run in Blender yet: the rolled cut (guard_garment.py:187; on the cut
   sleeves, `garment_details` stitch rows depend on lookups returning None), the work variants, the lean and broad
   bases, and the jacket and boots after the boots fix. Read `guardGarmentCheck.mjs` over every report after the
   laptop stage.
4. `LIMITS.hemOverBootMin` (guardGarmentCheck.mjs:15) is declared but never used. Use it or drop it.
5. G2-REPORT.md:112 says "the check's floor is 0.211 m x s". The floor is 0.2 m x s, which is 0.211 m on average.
6. Seam gaps at the last settle frame are 20-21 mm at the gussets (underarm and crotch). The weld closes them. Watch
   for puckering on G4's sheet (G10).
7. The garments row in GB-REPORT's job contract could list `[--variant rolled|work]` (carried over from the P1
   re-check).
8. The stale pre-fix outputs in `C:/NightShift/scratch/guard-bake-g2` (boots, jacket, and the jacket's kept work
   folder) must not feed G4.
