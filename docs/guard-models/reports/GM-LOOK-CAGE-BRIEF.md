# gm-look: dark blotches after the fit - slice brief
Owner: Player Build. Status: current.

Builder: Opus (bake / engine code). Branch feature/gm-look, worktree C:/NightShift/Mobile-Coop-gm-look. Start only when
the orchestrator lifts the desktop CPU hold. Not for Michael.

## The defect
The gm-look rebake (bake/guard-models 4071580d) shows dark rectangles at the chest / thigh pocket spots, a dark dashed
line down the shirt front and dark bands at the lean upper arms on every outfit (crop
C:/NightShift/scratch/ctcore/gm-look/after-outfits.png).

## Cause (measured 2026-10-25 18:40, not yet proven by a bake)
- The fit (`push_clear` + `lift_over`, scripts/operators/py/bake_guard.py ~:975-1000) moves garment LOD vertices
  outward before the texture bake (~:1055). LOD0 pushes from the bake logs: shirt 18.2 / 10.8 / 7.3 mm, boots
  16.5-18.4 mm, gloves 5.7-15.4 mm, work_trousers 12.4 mm; lifts add more.
- The bake's selected-to-active ray starts `CAGE[lod]` outside the target and reaches `cage * 3`
  (`Baker.bake` ~:651; LOD0 3 mm / 9 mm, `CAGE` :60). Where the LOD sits more than ~6 mm outside its hero, the ray
  never reaches the hero: a miss stays the cleared colour (dark), or it lands on the back of a pocket patch / placket.

## The fix (pick A; B only if A cannot be done cleanly)
A. Bake on the pre-fit surface. Snapshot each garment LOD's world coordinates before its fit (one array per
   `garment_lod[(part, lod)]`), and in the bake loop set a garment record's mesh back to the snapshot for its passes
   (normal, AO, albedo, rm), then restore the fitted coordinates. UVs do not change, so the textures fit the fitted
   mesh. Record the snapshot on the record (e.g. `r['prefit']`), never a global keyed by name.
B. Keep the fitted mesh and widen the ray per record: `max_ray_distance = cage + fit_max + 0.003` where `fit_max` is
   the record's largest displacement (push and lift) in metres; cage stays `CAGE[lod]`.

## Checks
- `python -m py_compile scripts/operators/py/bake_guard.py`; no other file changes except this brief's STATE line.
- Rebake (3 bases + shield) only through the hidden scheduled task pattern (`gm-look-bake.vbs` -> `gm-look-bake.sh`,
  BelowNormal, heavy.lock taken and released by the script), then check + sheet as before.
- Re-measure with the cloth test (`tests/guardAssets.test.ts` LOOK_LIMITS must still pass: skin 16 / 3 / 2, crossings
  600 / 300 / 210), crops with crop.py on the same rects beside the before / after crops. The blotches must be gone at
  the pocket spots, the shirt front and the lean upper arms.
- Commit and push each sub-step path-limited. Then a fresh Opus checker on the head.
