# anim-skeleton P0 - prototype report (2026-10-21)

Blender 5.2.2, `-b` only, on a copy of the anim-rig build (`build/anim-skeleton/wren-lods.blend`, gitignored). Run:
`node scripts/anim-skeleton/proto.mjs proto_rig` (takes heavy.lock; about 11 s, about 37 s with a cold Eevee cache).
Inspector: `node scripts/anim-skeleton/proto.mjs inspect`. Numbers: `build/anim-skeleton/proto-report.json`.

## Built
- `wren-rig-game` (shared by LOD0-2): 23 -> 55 bones.
  - `clavL` / `clavR`: parent chest, head at the SC joint (x +-0.03, y -0.04 forward, z 1.390 = neck base - 3.5 cm),
    tail at the shoulder head (+-0.176, 0.01, 1.348). shL / shR reparented under them. Existing rest matrices
    unchanged (7.7e-7).
  - 30 hero finger bones `fingerS_K_J` (K1 = thumb, 2-5 = index to little), `_1` under `wrS`; rest vs hero 1.1e-6.
- LOD0 weights (21 813 verts).
  - Fingers: each `wrS` vertex (919 L / 912 R) takes the finger share of its 4 nearest hero hand vertices (inverse
    distance); 625 / 627 weighted, none farther than 2 cm.
  - Clavicles: chest weight x smoothstep(0.035, 0.13, |x|) x smoothstep(1.22, 1.35, z) x 0.95 moves to clavS (side =
    sign of x); 1510 / 1425 vertices.
  - Max 4 influences (784 pruned), renormalised.
- Rest check: 1.19e-7 m (limit 1e-5).
- Clip `skeleton_test` (48 frames, 24 fps, 36 bones, 212 keys): shrug 20 deg (f0-10); right shoulder forward 25 deg
  (f10-19); fingers curl one by one, MCP / PIP / DIP 70 / 85 / 55, thumb 25 / 40 / 35 plus opposition (f12-27);
  fingers open and spread (f27-36); left-leg FK kick, chamber at f31 (hip 60, knee 70, ankle 20, toe 20), extension at
  f36 (hip 70, knee 15), back to rest by f48. Right leg untouched.

## Renders
Eevee, clay material, stamped labels: `skeleton-test-sequence.webp` (front and 3/4 at f0, 5, 13, 22, 31, 35) and
`skeleton-test-closeups.webp` (right-hand fist palm and back, curling, spread; shrug front and back; shoulder push and
rest from above; original LOD0 next to the new LOD0 at rest).

## Seen
- No tearing at the knuckles, shoulders, hip or knee. The fist and the spread read clearly. The shrug lifts the
  trapezius line and the whole arm; the push shows clearly from above.
- The glove is low-poly, so curled fingers look faceted.
- The vest straps stretch over the clavicle blend. Accepted for now (orchestrator, 2026-10-21).
- Michael approved the prototype (via the orchestrator): "Go, smooth fingers too": S1 adds knuckle loops to the LOD0 /
  LOD1 glove fingers within the LOD triangle budgets.
- An armpit flap is in the original mesh too.
- Linear blend skinning will likely thin the groin crease at 60-70 deg hip flex (not visible in these views).

## For the full build
- The clavicle node sits at the SC point with identity rotation; shL / shR get the offset (shoulder head - SC point)
  (refines BRIEF A2: the pivot is the SC joint, not the shoulder head).
- `hand{S}` is a 4 cm stub past the knuckles and `wr{S}` is the hand bone; `grip_morphs.py`'s "along" axis is reversed.
  Use `wr{S}`.
- Check the clavicle falloff against the vest straps on LOD1 and LOD2.
- LOD1 gets fingers by the same transfer; LOD2 keeps the wrist.
