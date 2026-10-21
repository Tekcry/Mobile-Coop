# anim-skeleton S1 - asset report (2026-10-21)

## Built
- `node scripts/anim-skeleton/skin.mjs` (Node, deterministic; constants in `scripts/anim-skeleton/skeleton.json`)
  patches the shipped `src/operators/assets/wren/wren-{hero,lod0,lod1,lod2}.glb` in place; a re-run is a no-op (detects
  `clavL`). New joints are appended to the skin, so existing `JOINTS_0` indices stay valid. It refuses to write if the
  rest check fails or anything protected changes (image bytes, materials, textures, samplers, scenes, anchors, other
  node TRS). Originals backed up in `build/anim-skeleton/orig/` (gitignored).
- Clavicles (every LOD): `clavL` / `clavR` under chest at the P0 sternoclavicular point with the chest's rotation;
  `shL` / `shR` become their children (local translation only; world rest unchanged). Weights: the P0 falloff split
  from the chest.
- Fingers (LOD0, LOD1): the hero's 30 finger joints under the wrists, rests and inverse binds copied from the hero;
  weights by the P0 rule (4 nearest hero hand vertices, none farther than 2 cm). LOD2 has none (distant).
- Knuckle loops (Michael: "smooth fingers too"): LOD0 two loops flanking each finger joint (+-0.25 of the segment),
  LOD1 one loop at each joint; new vertices on the old edges, seam copies cut identically. A third loop per joint on
  LOD0 would reach 45 860 triangles, over the budget.
- Goggle joints (orchestrator request): `goggleStow` / `goggleUse` under the head with the head's rotation, pivot at
  the lens centre (0, 1.57385, 0.15372). No shipped file has a `_GOGGLE` vertex class, so the in-use goggle is the lens
  primitive plus the connected rigid head-kit pieces inside a box in front of the eyes (all were 100 % head); the band,
  brow mount, battery pod and screws stay on the head. `_GOGGLE` is used instead when a file has it. No stowed geometry
  exists (roadmap: the stowed-on-brow export is in the cleanup job), so `goggleStow` has 0 vertices and the in-use
  pivot. On LOD1 / LOD2 the housing is fused into the head shell: only the lens rides `goggleUse` there.
- Max 4 influences, renormalised; rigid parts keep their weights except the goggle parts.
- Bake path: `scripts/anim-skeleton/py/skeleton.py` holds the same rules; `scripts/operators/py/bake_lods.py` calls it
  (LOD0 / LOD1 keep fingers; LOD2 has its own rig without fingers and its own anchors; every LOD gets the clavicle and
  goggle split; knuckle loops right after decimation). Not run end to end (no garment blends here); its functions pass
  a smoke test on the copied blend (rests 1.9e-9, rest error 1.2e-7 m).
- Runtime: no change needed. The poser maps each new joint to its nearest mapped ancestor (clavicle -> chest, fingers
  -> wrist, goggle -> head); the finger hang correction applies once. The game looks as before until S2 drives them.

## Numbers
| File | Triangles before -> after (budget max) | Skin joints | Bytes before -> after |
| --- | --- | --- | --- |
| hero | 229 391 -> 229 391 | 63 -> 67 | 57 320 384 -> 57 320 696 |
| lod0 | 39 809 -> 43 431 (45 000) | 23 -> 57 | 18 354 460 -> 18 568 372 |
| lod1 | 13 578 -> 14 242 (15 000) | 23 -> 57 | 5 070 872 -> 5 121 004 |
| lod2 | 5 964 -> 5 964 | 23 -> 27 | 2 487 312 -> 2 487 944 |

- Bundle +264 KB. Rest error: existing vertices <= 4.0e-7 m; new knuckle vertices <= 3.4e-7 m (2 533 on LOD0, 505 on
  LOD1).
- Clavicle-weighted vertices L / R: hero 7 361 / 7 096, LOD0 1 629 / 1 571, LOD1 559 / 553, LOD2 217 / 224.
- `goggleUse` vertices: hero 2 514, LOD0 1 671, LOD1 683, LOD2 644; `goggleStow` 0.
- Poser solve: LOD0 2.1 -> 4.0 us (57 joints), LOD2 2.3 us, against 75 us of animation budget per character. GPU cost
  of the extra bones: pending a PC perf run.
- Hand sheet `hand-knuckle-loops.webp`: the loops remove the palm-crease spikes and round the knuckles; the low-sided
  glove still shows facets along each finger.

## Checks
- `npm run check`: pass (lint 0 errors, 218 test files / 2 375 tests, build OK).
- e2e smoke, e2e-anim, e2e-studio: sent to the laptop test runner (the desktop lock was held by T2's full e2e).
- GPU look (LOD0 walk, `build/anim-skeleton/gpushot.mjs`, untested): pending the desktop lock.

## Files
New: `scripts/anim-skeleton/{skin.mjs, skeleton.json}`, `scripts/anim-skeleton/py/{skeleton.py, smoke_skeleton.py,
hand_sheet.py}`, `tests/animSkeletonAsset.test.ts`, `docs/anim-skeleton/s1/hand-knuckle-loops.webp`. Changed: the four
Wren GLBs, `scripts/operators/py/bake_lods.py`, `scripts/anim-skeleton/proto.mjs` (a generic runner),
`src/operators/lodChecks.ts` (bones budget hero 67 / LOD0-1 57 / LOD2 27; fingers allowed on LOD0 / LOD1; per-toe
bones hero only; `FINGER_LODS`), `tests/operatorLods.test.ts`.

## Open
- Stowed goggle geometry does not exist; LOD1 / LOD2 goggle offsets move the lens only.
- Vest straps stretch over the clavicle blend (accepted in P0).
- `bake_lods.py` not run end to end.
