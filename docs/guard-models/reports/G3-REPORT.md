# G3 report: gear kit (rigid)

Branch `feature/gm-g3` (off feature/gm-gb 5da3600c). Kit truth: the P1 fix round's `guards.json` (feature/guard-models
7488d74d), used only as an uncommitted fixture under `scratch/g3/`.

## What
- `scripts/operators/py/build_gear.py`: the gear stage's entry script (GB job contract: `--stage gear --job <id>
  [--base <b>] --piece <p> --kit --out`), writes `gear/guard-<b>-<p>.{blend,json}` and, for the shield (one job, no
  base), `gear/guard-shield_riot.{blend,json}`. One mesh object per piece on the rigid-kit path (`rigid_skin.py`):
  per-vertex `_rigid` part id (`1000 + pieceIndex * 20 + part`, unique across a base's pieces for G4's join), one weight
  vector per part on declared bones, `_TINT` (slot index, SPEC 8), `_PIECE` (kit index), `edge`, a `pattern` UV (box
  projection in metres), procedural materials from `materials.py` (tinted parts on the fabric neutral 0.4). The job
  fails when the piece is over its LOD0 budget, uses an undeclared bone, or its skin check spreads.
- `scripts/operators/py/gear/`: pure numpy geometry, no bpy (runs in Blender and in plain Python).
  - `fit.py`: per-base fit targets (FIT, generated from `proportions(build, refHeight)` + `operatorJoints`; a G1 body
    report's `bindJoints` wins when it sits in the same out dir), the head profile and SPEC 7 head envelope (+15 mm),
    torso sections from the rig girths.
  - `mesh.py`: `Piece` and closed-solid primitives (slab, shell, dome, sheet, tube, box, lathe).
  - `headwear.py` (cap, cap_officer, beanie, balaclava, headset, boonie, glasses_clear, glasses_dark), `helmet.py`
    (helmet_std with the A6 drop box anchor, helmet_heavy with a raised visor), `torso.py` (vest_soft, plate_heavy),
    `shield.py` (shield_riot, grip-frame anchors), `kit.py` (radio, pouch_belt, holster_thigh, flashlight_mount).
  - `pieces.py`: builder table, `base_pieces` / `gear_jobs` (the job set; mirrors guardBakePlan.mjs after P1) and a dry
    run: `<blender python> scripts/operators/py/gear/pieces.py <guards.json> [--all] [base ...]`.
- `scripts/operators/guardBakePlan.mjs`: gear default script `build_gear.py` (same line as P1's) and the gear LIBS list
  (the gear/*.py modules, so a builder change rebakes the gear).
- `tests/guardGearFit.test.ts` (new), `tests/guardBakePlan.test.ts` (script name).
- The WIP had committed copies of `guards.json` / `SPEC.md` under `scratch/g3/`: removed from git (kept locally).

## Job set (P1 kit): 25 jobs, all built and under budget (dry run, every job)
| Base | Pieces (LOD0 tris / cap) |
| --- | --- |
| average (12) | cap 488/600, cap_officer 540/600, beanie 448/500, headset 304/400, glasses_clear 236/300, glasses_dark 196/300, helmet_std 856/1200, vest_soft 1256/1800, radio 180/300, pouch_belt 332/400, holster_thigh 264/350, flashlight_mount 120/250 |
| lean (8) | cap 488, beanie 448, boonie 522/600, glasses_dark 196, helmet_std 856, vest_soft 1256, pouch_belt 332, holster_thigh 264 |
| broad (4) | balaclava 532/600, helmet_heavy 936/1200, plate_heavy 1768/2600, pouch_belt 332 |
| shield_riot (1) | 344/800 (own GLB, built in the broad base's bind pose, `elL` 0.5 / `wrL` 0.5) |
Every piece is below its cap, so SPEC 5's shown / buffer totals (computed from the caps) are upper bounds; the real
gear share is lower. Outfits are not gear (G2). `helmet_heavy` is baked on broad only and is a normal piece: strict A5
(drawn only with the helmet bit) is G6 / G5's mask, nothing in the mesh depends on it. Enforcer shows `plate_heavy`
(broad has no `vest_soft` job). droneOp's `headwear2` cap is the same `cap` job on average.

## Desktop smoke (one job, heavy lock taken on try 1, released)
`node scripts/operators/guard-bake.mjs --stage gear --only gear-average-helmet_std --par 1 --kit scratch/g3/guards.json --out C:/NightShift/scratch/guard-bake-g3`
- Exit 0, driver wall 62 s (Blender 5.2.2 process 61 s, of which the script 30.5 s; the rest is startup and save).
- 856 tris (budget 1200), 438 verts, bones `head` only (declared `head`), skin spread 0.0, in the job set.
- Parts: shell 672 tris, rails 132, chin strap 52. Materials: shell (tint), polymer (tint), webbing.
- Bounds (game frame): x +-0.1265, y 1.528..1.805, z -0.132..0.139. Target: crown 1.77 (head joint 1.6547 + 0.1153);
  top = crown + 15 mm envelope + 6 mm pad + 10 mm shell + 4 mm crown = 1.805 as built. Lowest point 1.528 is the chin
  strap under the chin (head joint - 0.127).
- A6 drop box (`anchors.drop`): w 0.253, h 0.202, d 0.2605 m, centre +0.045 m above the head joint; today's placeholder
  (`HELMET_FIT` x head) is 0.201 x 0.190 x 0.239.
- Fit source: rig targets (no G1 body in the out dir yet).

## Decisions I assumed
- Fit before G1 / G1h: the rig's proportions and bind joints per base (FIT, drift-tested against the TS) and a generic
  male head profile scaled to the rig head; arm and thigh directions are MakeHuman A-pose directions measured from
  Wren's bind. When G1's body report (`bindJoints`) is in the out dir it replaces the joints. G1h's real envelope is not
  read yet (no envelope output in the job contract): refit then (open item).
- The shield has no base arg in its job; it is built on `broad` (the enforcer's base).
- One opaque material (A3): `glasses_clear` is frames only (no lens surface); the dark glasses and visors are lens
  materials that G4 bakes into the atlas.
- Materials per piece are Cycles procedurals for G4's bake; the atlas, decimation and LOD1 / LOD2 are G4's.
- Kit-job mismatch: a (base, piece) outside the job set still builds (old driver lists every pair) but the report says
  `inJobSet: false`.
- IP: plain shapes only, no text, badges, insignia or brand shapes on any piece.

## Tests
- `npx vitest run tests/guardGearFit.test.ts tests/guardBakePlan.test.ts`: 2 files, 32 passed, 2 skipped (the two
  guards.json checks skip on this branch, which has no kit file). With the fixture copied in temporarily: guardGearFit
  7 / 7 passed.
- `npx tsc --noEmit -p .`: clean. `npx eslint tests/guardGearFit.test.ts`: clean (`.py` / `.mjs` outside the lint set).
- Python dry run of all 25 jobs: 0 over, 0 failed.

## Open items
- Full gear stage (25 jobs) is a laptop alone request (lead books it).
- Refit headwear and helmets on G1h's exported head envelope, and torso pieces on G1's body, once those bakes exist
  (rebake is automatic only for the joints via `bindJoints`; the envelope needs a reader once G1h names its output).
- G4: join each base's gear into the body mesh, atlas, LODs; `_rigid` ids are unique per base for that.
- G5 / G6: `HelmetDrops` can size the drop mesh from `anchors.drop`; the shield's `anchors.grip` gives its hold frame.
- Merge: `guardBakePlan.mjs` here changes only the gear LIBS line and the script default (identical to P1's line).
