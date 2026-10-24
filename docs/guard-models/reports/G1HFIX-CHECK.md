# G1h fix round: check (fresh Opus checker)

Branch `feature/gm-g1hfix`, reviewed head 6067ade5 (off 4c9cc590). Diff `4c9cc590..6067ade5`: build_head.py, guardBakePlan.mjs,
guardHeadCheck.mjs, SPEC.md, tests/guardBakePlan.test.ts, tests/guardHeadCheck.test.ts.

## Verdict: PASS

No blocking items. The seam lock holds exactly (numbers below), heads sit on G1's body frame on both the current
guard_body.py and G1-fix's (4507101e), and the plan declares the deps and outputs.

## Seam lock: numbers
The Blender smoke did not run: heavy.lock was held for all 20 tries (laptop-queue, then merge-train). GuardFit, `Frame`,
`setup()` and `shaped()` are numpy only, so I ran them with Blender 5.2's bundled Python (`-B`, `bpy` stubbed) on the real
guards.json. Prep was run (node, 5 s) into `C:/NightShift/scratch/guard-bake-g1hcheck`; its joints are byte-equal to the
G1 bake's.

| base | head | seam gap to G1 body V (mm) | seam perimeter (m) | rings 0-2 shift (mm) | ring 3 / 4 shift (mm) | face max (mm) | seam shift WITHOUT seam lock (mm) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| average | average-1 | 2.2e-13 | 0.3977795 | 0.0 | 1.6 / 4.1 | 6.4 | 0.0 (rings 0-2: 2.4) |
| average | average-2 | 2.2e-13 | 0.3977795 | 0.0 | 1.5 / 3.1 | 4.6 | 3.2 |
| average | average-3 | 2.2e-13 | 0.3977795 | 0.0 | 4.2 / 8.4 | 8.4 | **10.1** (rings 0-2: 11.4) |
| average | average-4 | 2.2e-13 | 0.3977795 | 0.0 | 2.0 / 4.3 | 6.6 | 2.0 |
| broad | broad-1 | 2.2e-13 | 0.4609122 | 0.0 | 0 / 0 | 8.5 | 0.0 |

- G1's baked bodies (`scratch/guard-bake-g1/bodies/*.json`, same guard_body.py as 4c9cc590): `neckSeam.perimeter` average
  0.39777948482262415, broad 0.46091218067713435; `meanY` 1.54834464 / 1.59613348. The head seam's perimeter and mean z match these to
  float precision (the old broad -13 % perimeter and ~25 mm offset are gone).
- The base head part (no recipe) equals G1's `V[hv]` to 2e-13 mm. The ring check against `neck_seam()['rings']` (SystemExit on
  mismatch) passed for both bases.
- The lock is needed and works: average-3 (chin-height-incr) would move the seam 10.1 mm without it, and the lock leaves it at 0.0.
- Analytically exact: `skin()` is per-vertex LBS, recipe offsets are 0 on rings 0-2, so `body_game(d)[seam] == V[seam]`.

## G1 fix branch (feature/gm-g1fix 4507101e) compatibility
- API: build_head.py uses `GuardFit(mpfb, op, macro)`, `solve()`, `result` keys (`V`, `co`, `M`, `tgt`, `lift`), `skin`,
  `to_game`, `torso_w`, `scale`, `K`, `floor_y`, `mh_stature`, `topo`, `neck_seam(at)`, `SEAM_BLEND`, `FIXED_TARGETS`,
  `SOLVED_TARGETS`. G1-fix changes none of these. It renames the fingers and adds `seam_transforms`, and heads use neither.
- Rerun with G1-fix's guard_body.py loaded: every head is still at its seam (gap 2.2e-13 mm, rings 0-2 shift 0). Average's
  seam moves with G1-fix's neck-scale change (perimeter 0.3977795 -> 0.3975706). Heads must be baked from a tree with both
  fixes merged. `guard_body.py` is in `LIBS.heads`, so a merge rebakes them on its own.
- `git merge-tree` 6067ade5 x 4507101e: 2 textual conflicts, both easy unions. In SPEC.md section 7, keep both bullet sets: G1-fix's
  "Frame" / crown bullets agree with Fix A. In tests/guardBakePlan.test.ts 'needs' test, keep the heads `needs === 'prep'` line
  and G1-fix's shield `['bodies-broad']` lines. guardBakePlan.mjs merges clean.
- G4: G1-fix's report says "weld by `_mh`, no transform" for Fix A heads. `seamTransforms` is for old MakeHuman-frame heads only.
  G4 must not apply it to these heads.

## Plan (guardBakePlan.mjs)
- heads `deps: ['prep']`; every heads / haircaps job `needs: ['prep']`. `LIBS.heads` adds guard_body.py (guard_skin.py
  already there). The kit slice carries the base entry, and a caps job also carries the base's heads, so a recipe change rebakes its
  head and its base's caps (tested).
- Outputs: the plan's heads-stage outputs equal `guardHeadCheck.headJobOutputs` for all 11 jobs (face PNGs, cap PNGs, envelope +
  eye block on `haircaps-<b>` / `heads-broad-1`; no `bald` outputs).
- gear `deps: ['bodies','heads']`. The 10 `headEnvelope` gear jobs need their base's envelope job (`haircaps-average`,
  `haircaps-lean`, `heads-broad-1`).
- Smoke hook `GUARD_HEAD_ALSO_CAPS` removed.

## Other checks
- Wren: no Wren file touched (guard-only scripts, plan, SPEC, tests).
- `.pyc`: none added by this branch. `scripts/operators/py/__pycache__/common.cpython-313.pyc` has been tracked since 06dd31a0 / b0de7773 (older
  work) and is unchanged here.
- Tests: `npx vitest run tests/guardHeadCheck.test.ts tests/guardBakePlan.test.ts`: 2 files, 53 passed.
  `npx tsc --noEmit -p .`: clean. `npx eslint` on both test files: clean. The new tests are real: the hash-change sets on the real kit,
  envelope needs per base, and seam / perimeter / height / head-joint failure cases in `checkBaseSeam`.

## Polish (non-blocking)
1. The fix round has no report section. G1h-REPORT.md is unchanged and has no smoke numbers. The full heads bake should record
   `seam.bodyGapMaxMm`, `seamLock.shiftMaxMm` and `faceIslandAlbedoMeanLinear`. Run `guardHeadCheck.mjs --out <bake>` with the
   bodies present, so `checkBaseSeam` compares against `neckSeam`.
2. The Blender path of the fix (run_head report fields, `face_island_albedo`, the Blender-metre envelope offset) has not run yet.
   The first laptop heads bake is its smoke.
3. `checkCapsReport` does not check the caps report's `seam.bodyGapMaxMm`.
4. `Frame.body_game` skips G1's `apply_field` for recipe deltas. The torso field reaches the head part (max torso_w 0.094), so a
   ring 3+ face offset can differ from G1's own skin by up to ~9 % of the field's deviation. This is sub-mm and the seam is unaffected.
5. A heads job hashes the whole base entry, so a base field that heads do not read (e.g. mounts) also rebakes the heads.
   G1-fix trims prep's slice the same way.
6. `unionPushMaxMm` in the caps report is still a uniform `100 * k` conversion and ignores the head bone's x 0.912 scale.
   It is report-only.
7. Balaclava (`membrane`) and glasses (`face`) fit the head too, but do not need the head jobs. Revisit when G3 refits on real heads.
