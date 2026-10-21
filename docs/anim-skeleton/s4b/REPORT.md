# anim-skeleton S4b - exact preview (marlow-bays BRIEF item 30(e), 2026-10-22)

Status: the evaluator is done; the spread change itself is routed to track A (`tuneKeys.ts` build, not ours).

- Where the preview spreads a key edit: `tuneKeys.ts` `build()` / `buildSkeleton()` (track A): per-key degree deltas,
  linear between keys, converted per frame (`eul`). `keyed.ts` only samples the tables and needs no change.
- The bake (Blender 5.2.2 factory defaults): BEZIER, AUTO_CLAMPED, **CONT_ACCEL smoothing** (a global C2 handle solve
  between locked extremes, with clamping, not plain auto-clamped), a Cycles modifier, the first key repeated at 48. The
  pose bones' quaternion and location channels are interpolated per component in each bone's rest frame. head, sh,
  fore, clav, fing, legd and w are lerped (`lerp_key`): already exact.
- `src/anim/keyCurve.ts` (`newKeyCurve`, `keyCurveSet`, `keyCurveAt`, `keyCurveSpread`; pure, no allocation): extremes
  locked flat; free runs solved for C2 (`bezier_eq_continuous`) with clamp, lock and unlock
  (`tridiagonal_solve_with_limits`); handles at 1/3. Against Blender: 124 curves (19 synthetic, 105 real bone curves)
  within 2e-6.
- Measured, one key edited (pel +3 cm, chest pitch +10, armR flex +20, head pitch +8), errors vs the rebake:

| clip | today | curve, key-file base | + trunk re-keyed / arms as FK |
| --- | --- | --- | --- |
| jog | pel 0.37 cm, chest 0.95 deg, arm 2.8 cm | pel 0.0005 cm, chest 0.15 deg | trunk 0.000 deg, arm 0.52 cm |
| walk | 0.31 cm, 0.96 deg, 3.1 cm | 0.0005 cm, 0.21 deg | 0.000 deg, 0.07 cm |
| hold_fwd | 0.37 cm, 0.94 deg, 4.2 cm | 0.0005 cm, 0.001 deg | 0.000 deg, 0.57 cm |

  The head is exact today (the bake lerps it the same way). With no edit, the shipped clips equal their rebake to 1e-5.
- Track A change needed in `tuneKeys.ts`: (1) load the key file's values on a clip's first edit (`needFile(ci)` from
  `syncClip`), not only on delete; (2) in `build()` spread the Blender-curve fields with `keyCurveSpread`, the key
  file's values as the base: trunk yaw / pitch / roll, pelvis dx / dy / dz, arm flex / abd / elbow / inward /
  twistUpper, wrist, and the FK leg fields on `legs` clips; keep the lerped fields linear (head, sh, fore twist, clav,
  fingers, legd, w); (3) for exact: trunk offsets from locals re-keyed in Blender's channel frames (an exported
  rest-quaternion table), arm offsets composed as FK.
- Open: arms between keys up to 0.57 cm (0.70 cm on the jog keys rebaked in 4.46.0, 2.2x better than the linear spread there; fixtures regenerated after that merge) (closing it needs the shoulder / elbow channels re-keyed incl. location and a TS
  port of key_clip.py `fk`); retimed keys (#87: the baked clip is warped linearly) and the base for added keys (#91).
- Files: `src/anim/keyCurve.ts`, `tests/keyCurve.test.ts`, `tests/keyedExactPreview.test.ts`,
  `tests/fixtures/key-curve-blender.json` (118 KB), `tests/fixtures/keyed-s4b-rebake.json` (59 KB),
  `scripts/anim-skeleton/s4b-fixtures.mjs` (heavy lock, about 1 min), `scripts/anim-skeleton/py/key_curve_fixture.py`.
- Checks: `npm run check` pass (2 553 tests); e2e-studio and e2e-anim pass (E2E_JOBS=1, 4191).
